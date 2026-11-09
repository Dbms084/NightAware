/**
 * Place provider — abstracts POI data access.
 *
 * Uses Google Places Nearby Search API when available.
 * Falls back to mock data if API is unavailable.
 */

import type { Coordinate, MapRegion, Place, PlaceCategory } from '@/types/geo';
import { MOCK_PLACES } from '@/data/mock-places';
import {
  fetchNearbyPlaces,
  fetchNearbyPlacesMulti,
  ALL_NIGHT_TYPES,
  CATEGORY_TO_GOOGLE_TYPES,
  isApiKeyConfigured,
} from '@/lib/google-maps-api';

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

/** Deduplicate places by ID */
function deduplicatePlaces(places: Place[]): Place[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

/**
 * Sample points along a route for API queries.
 * Returns evenly-spaced waypoints (max `count` points).
 */
function sampleRoutePoints(route: Coordinate[], count: number = 5): Coordinate[] {
  if (route.length <= count) return route;
  const step = Math.floor(route.length / count);
  const points: Coordinate[] = [];
  for (let i = 0; i < route.length; i += step) {
    points.push(route[i]);
    if (points.length >= count) break;
  }
  return points;
}

// Cache to avoid duplicate API calls in the same session
const placesCache = new Map<string, Place[]>();

function cacheKey(lat: number, lng: number, type: string): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)},${type}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get all places within `radiusMeters` of any point along a route.
 * Fast & parallelized: samples up to 3 strategic points along the route corridor
 * and queries multi-type Places API (New) concurrently.
 */
export async function getPlacesNearRoute(
  route: Coordinate[],
  radiusMeters: number = 350,
): Promise<Place[]> {
  if (route.length === 0) return [];

  if (!isApiKeyConfigured()) {
    // Fallback to mock data
    return MOCK_PLACES.filter((place) => {
      for (const wp of route) {
        if (distanceMeters(place.coordinate, wp) <= radiusMeters) return true;
      }
      return false;
    });
  }

  // Sample at most 3 points along the route (e.g., ~20%, ~50%, ~80%)
  const samplePoints = sampleRoutePoints(route, 3);
  const uncachedPoints: Coordinate[] = [];
  const cachedPlaces: Place[] = [];

  for (const point of samplePoints) {
    const key = `${point.latitude.toFixed(3)},${point.longitude.toFixed(3)}`;
    if (placesCache.has(key)) {
      cachedPlaces.push(...placesCache.get(key)!);
    } else {
      uncachedPoints.push(point);
    }
  }

  if (uncachedPoints.length === 0) {
    return deduplicatePlaces(cachedPlaces);
  }

  // Fetch all uncached points IN PARALLEL
  try {
    const fetchPromises = uncachedPoints.map(async (point) => {
      const places = await fetchNearbyPlacesMulti(point, radiusMeters, ALL_NIGHT_TYPES);
      const key = `${point.latitude.toFixed(3)},${point.longitude.toFixed(3)}`;
      placesCache.set(key, places);
      return places;
    });

    const newResults = await Promise.all(fetchPromises);
    const combined = [...cachedPlaces, ...newResults.flat()];
    return deduplicatePlaces(combined);
  } catch {
    return deduplicatePlaces(cachedPlaces);
  }
}

/**
 * Get places of a specific category visible in a map region.
 */
export async function getPlacesByCategory(
  region: MapRegion,
  category: PlaceCategory,
): Promise<Place[]> {
  if (!isApiKeyConfigured()) {
    return MOCK_PLACES.filter(
      (place) => place.category === category && isInRegion(place.coordinate, region),
    );
  }

  const center: Coordinate = {
    latitude: region.latitude,
    longitude: region.longitude,
  };
  // Approximate radius from region deltas
  const radiusMeters = Math.min(
    distanceMeters(center, {
      latitude: region.latitude + region.latitudeDelta / 2,
      longitude: region.longitude,
    }),
    5000, // cap at 5km
  );

  const googleTypes = CATEGORY_TO_GOOGLE_TYPES[category];
  const allPlaces: Place[] = [];

  for (const gType of googleTypes) {
    const places = await fetchNearbyPlaces(center, radiusMeters, gType);
    allPlaces.push(...places);
  }

  return deduplicatePlaces(allPlaces);
}

/**
 * Get a single place by its ID.
 */
export async function getPlaceById(id: string): Promise<Place | null> {
  // Check cache first
  for (const places of placesCache.values()) {
    const found = places.find((p) => p.id === id);
    if (found) return found;
  }
  // Fallback to mock
  return MOCK_PLACES.find((place) => place.id === id) ?? null;
}

/**
 * Filter places to those expected to be open at a given time.
 */
export function getOpenPlacesAtTime(places: Place[], _time: Date): Place[] {
  return places.filter((place) => place.openAtJourneyTime === true);
}

/**
 * Get all places near a coordinate. Uses Google API or mock fallback.
 */
export async function getAllPlaces(
  near?: Coordinate,
  radiusMeters: number = 1000,
): Promise<Place[]> {
  if (!isApiKeyConfigured() || !near) {
    return MOCK_PLACES;
  }

  const categories: PlaceCategory[] = [
    'hospital', 'pharmacy', 'petrol_station', 'shop_food', 'transport', 'police',
  ];

  const allPlaces: Place[] = [];

  for (const category of categories) {
    const googleTypes = CATEGORY_TO_GOOGLE_TYPES[category];
    for (const gType of googleTypes.slice(0, 1)) { // limit to 1 type per category
      const key = cacheKey(near.latitude, near.longitude, gType);
      if (placesCache.has(key)) {
        allPlaces.push(...placesCache.get(key)!);
        continue;
      }
      const places = await fetchNearbyPlaces(near, radiusMeters, gType);
      placesCache.set(key, places);
      allPlaces.push(...places);
    }
  }

  return deduplicatePlaces(allPlaces.length > 0 ? allPlaces : MOCK_PLACES);
}
