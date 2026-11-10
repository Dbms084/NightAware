/**
 * Place provider — abstracts POI data access across Supabase, Google Places API,
 * and verified local mock data.
 */

import type { Coordinate, MapRegion, Place, PlaceCategory } from '@/types/geo';
import { DEFAULT_MAP_REGION } from '@/types/geo';
import { MOCK_PLACES } from '@/data/mock-places';
import {
  fetchNearbyPlacesMulti,
  searchNearbyNightPois,
  ALL_NIGHT_TYPES,
  isApiKeyConfigured,
} from '@/lib/google-maps-api';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine distance in metres between two coordinates. */
function distanceMeters(a: Coordinate, b: Coordinate): number {
  const R = 6_371_000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Check if a coordinate is inside a map region. */
function isInRegion(coord: Coordinate, region: MapRegion): boolean {
  const latMin = region.latitude - region.latitudeDelta / 2;
  const latMax = region.latitude + region.latitudeDelta / 2;
  const lonMin = region.longitude - region.longitudeDelta / 2;
  const lonMax = region.longitude + region.longitudeDelta / 2;
  return (
    coord.latitude >= latMin &&
    coord.latitude <= latMax &&
    coord.longitude >= lonMin &&
    coord.longitude <= lonMax
  );
}

/** Deduplicate places by ID and spatial proximity (< 35m with similar name) */
export function deduplicatePlaces(places: Place[]): Place[] {
  const result: Place[] = [];

  for (const p of places) {
    const isDupe = result.some((existing) => {
      if (existing.id === p.id) return true;
      const d = distanceMeters(existing.coordinate, p.coordinate);
      if (d < 35) {
        const normA = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normB = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normA.includes(normB) || normB.includes(normA)) return true;
      }
      return false;
    });

    if (!isDupe) {
      result.push(p);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Supabase Data Access & Persistent Auto-Cache
// ---------------------------------------------------------------------------

async function fetchPlacesFromSupabase(corridorCoords?: Coordinate[], bufferMeters = 350.0): Promise<Place[]> {
  if (!isSupabaseConfigured) return [];

  try {
    if (corridorCoords && corridorCoords.length >= 2) {
      // Use PostGIS spatial function
      const { data, error } = await supabase.rpc('get_pois_in_corridor', {
        route_coords: corridorCoords,
        buffer_meters: bufferMeters,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          name: row.name,
          category: (row.category as PlaceCategory) || 'shop_food',
          address: row.address || undefined,
          phone: row.phone || undefined,
          is24_7: Boolean(row.is_24_7),
          openTime: row.open_time || undefined,
          closeTime: row.close_time || undefined,
          coordinate: {
            latitude: row.latitude,
            longitude: row.longitude,
          },
          openAtJourneyTime: row.is_24_7 ? true : null,
          dataSource: 'supabase' as const,
        }));
      }
    }

    // Fallback select
    const { data, error } = await supabase.from('pois').select('*').limit(60);
    if (!error && Array.isArray(data)) {
      return data.map((row: any) => ({
        id: row.id,
        name: row.name,
        category: (row.category as PlaceCategory) || 'shop_food',
        address: row.address || undefined,
        phone: row.phone || undefined,
        is24_7: Boolean(row.is_24_7),
        openTime: row.open_time || undefined,
        closeTime: row.close_time || undefined,
        coordinate: {
          latitude: row.latitude,
          longitude: row.longitude,
        },
        openAtJourneyTime: row.is_24_7 ? true : null,
        dataSource: 'supabase' as const,
      }));
    }
  } catch {
    // Non-blocking fallback
  }

  return [];
}

/**
 * Auto-Save / Write-Through Cache:
 * Persists real fetched places directly into Supabase PostGIS `pois` table.
 * Idempotent with spatial deduplication (within 35m).
 */
export async function savePlacesToSupabase(places: Place[]): Promise<number> {
  if (!isSupabaseConfigured || !places || places.length === 0) return 0;

  // Filter out local mock data to keep database clean
  const realPlaces = places.filter((p) => p.dataSource === 'provider');
  if (realPlaces.length === 0) return 0;

  try {
    const payload = realPlaces.map((p) => ({
      name: p.name,
      category: p.category,
      address: p.address || null,
      phone: p.phone || null,
      is_24_7: Boolean(p.is24_7),
      open_time: p.openTime || null,
      close_time: p.closeTime || null,
      latitude: p.coordinate.latitude,
      longitude: p.coordinate.longitude,
      verified: true,
    }));

    const { data, error } = await supabase.rpc('upsert_pois', {
      pois_data: payload,
    });

    if (!error && typeof data === 'number') {
      return data;
    }
  } catch {
    // Silent background execution
  }
  return 0;
}

/**
 * Dense sampling: samples waypoints every ~320m along route polyline (max 8 points)
 * to avoid blind spots for pharmacies, hospitals, police and open stores.
 */
function sampleWaypointsAlongRoute(
  coords: Coordinate[],
  targetSpacingMeters = 320,
  maxPoints = 8,
): Coordinate[] {
  if (coords.length <= 2) return coords;

  const samples: Coordinate[] = [coords[0]];
  let accumulatedDist = 0;

  for (let i = 1; i < coords.length; i++) {
    const d = distanceMeters(coords[i - 1], coords[i]);
    accumulatedDist += d;
    if (accumulatedDist >= targetSpacingMeters) {
      samples.push(coords[i]);
      accumulatedDist = 0;
      if (samples.length >= maxPoints - 1) break;
    }
  }

  const last = coords[coords.length - 1];
  if (distanceMeters(samples[samples.length - 1], last) > 80) {
    samples.push(last);
  }

  return samples;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch places in a map region.
 */
export async function getPlacesInRegion(region: MapRegion): Promise<Place[]> {
  const combined: Place[] = [];

  // 1. Supabase (Pre-cached)
  const supaPlaces = await fetchPlacesFromSupabase();
  combined.push(...supaPlaces);

  // 2. Google Places API
  if (isApiKeyConfigured()) {
    try {
      const radiusMeters = Math.min(
        1500,
        Math.round(region.latitudeDelta * 111_000 * 0.6),
      );
      const googlePlaces = await searchNearbyNightPois(
        { latitude: region.latitude, longitude: region.longitude },
        radiusMeters,
      );
      combined.push(...googlePlaces);

      // Real-time store to Supabase in background
      if (googlePlaces.length > 0) {
        void savePlacesToSupabase(googlePlaces);
      }
    } catch {}
  }

  // 3. Fallback mock places if no real places in region
  if (combined.length === 0) {
    combined.push(...MOCK_PLACES);
  }

  return deduplicatePlaces(combined.filter((p) => isInRegion(p.coordinate, region)));
}

/**
 * Fetch places along a route corridor.
 * Queries Supabase PostGIS corridor, runs dense sampling along polyline,
 * and auto-saves discovered places to Supabase in real-time.
 */
export async function getPlacesNearRoute(
  routeCoordinates: Coordinate[],
  bufferMeters: number = 320,
): Promise<Place[]> {
  const combined: Place[] = [];
  const newlyDiscovered: Place[] = [];

  // 1. Supabase PostGIS corridor query (Instant pre-cached data)
  const supaPlaces = await fetchPlacesFromSupabase(routeCoordinates, bufferMeters);
  combined.push(...supaPlaces);

  // 2. Dense sampling along route polyline (every ~320m)
  if (isApiKeyConfigured() && routeCoordinates.length > 0) {
    try {
      const samplePoints = sampleWaypointsAlongRoute(routeCoordinates, 320, 7);

      const fetchPromises = samplePoints.map((coord) =>
        searchNearbyNightPois(coord, bufferMeters + 150).catch(() => []),
      );

      const results = await Promise.all(fetchPromises);
      for (const res of results) {
        for (const p of res) {
          combined.push(p);
          newlyDiscovered.push(p);
        }
      }
    } catch {}
  }

  // 3. Real-time Auto-Save to Supabase:
  // Write newly discovered places to database so future searches find them instantly
  if (newlyDiscovered.length > 0) {
    void savePlacesToSupabase(newlyDiscovered);
  }

  // 4. Filter places to within buffer distance of the polyline
  const corridorPlaces = combined.filter((place) =>
    routeCoordinates.some(
      (coord) => distanceMeters(place.coordinate, coord) <= bufferMeters + 50,
    ),
  );

  // If still empty (e.g. offline/no key), include mock places
  if (corridorPlaces.length === 0) {
    const mockNearby = MOCK_PLACES.filter((place) =>
      routeCoordinates.some(
        (coord) => distanceMeters(place.coordinate, coord) <= bufferMeters + 150,
      ),
    );
    corridorPlaces.push(...mockNearby);
  }

  return deduplicatePlaces(corridorPlaces);
}

/**
 * Fetch all available places in the default map area or around a coordinate.
 */
export async function getAllPlaces(
  center?: Coordinate,
  radiusMeters = 1500,
): Promise<Place[]> {
  if (center) {
    const delta = (radiusMeters / 111320) * 2;
    return getPlacesInRegion({
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: Math.max(delta, 0.02),
      longitudeDelta: Math.max(delta, 0.02),
    });
  }
  return getPlacesInRegion(DEFAULT_MAP_REGION);
}
