/**
 * Geocoding & Places Search service.
 *
 * Provides live, global search powered by OpenStreetMap Photon & Nominatim
 * with Google Places API fallback.
 * Allows searching any city, street, or landmark globally with zero hardcoded defaults.
 */

import type { Coordinate } from '@/types/geo';
import {
  autocompleteSearch,
  geocodeAddress,
  reverseGeocodeCoord,
  getPlaceCoordinate,
  isApiKeyConfigured,
  type AutocompleteResult,
} from '@/lib/google-maps-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlaceSuggestion = {
  id: string;
  name: string;
  secondaryText: string;
  fullAddress: string;
  coordinate?: Coordinate;
};

export type SearchResult = {
  id: string;
  name: string;
  address: string;
  coordinate: Coordinate;
};

export type QuickSuggestion = {
  id: string;
  name: string;
  secondaryText: string;
  icon: string;
};

export type QuickDestination = PlaceSuggestion & { coordinate?: Coordinate };

/** Neutral suggestion type for search */
export const QUICK_SUGGESTIONS: QuickSuggestion[] = [];

// Backwards compatibility export
export const POPULAR_DESTINATIONS: PlaceSuggestion[] = [];

// ---------------------------------------------------------------------------
// Live OpenStreetMap Search (Photon & Nominatim)
// ---------------------------------------------------------------------------

async function searchOsmPhoton(query: string, near?: Coordinate): Promise<PlaceSuggestion[]> {
  try {
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8`;
    if (near) {
      url += `&lat=${near.latitude}&lon=${near.longitude}`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.features || !Array.isArray(data.features)) return [];

    return data.features.map((f: any, idx: number) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates;
      const name = p.name || p.street || p.city || 'Location';
      const parts = [p.street, p.district, p.city, p.state, p.country].filter(Boolean);
      const secondaryText = parts.slice(0, 3).join(', ');
      const fullAddress = parts.join(', ') || name;

      const coordinate =
        coords && coords.length >= 2
          ? { latitude: coords[1], longitude: coords[0] }
          : undefined;

      return {
        id: coordinate ? `photon-${coordinate.latitude},${coordinate.longitude}` : `photon-idx-${idx}`,
        name,
        secondaryText,
        fullAddress,
        coordinate,
      };
    });
  } catch {
    return [];
  }
}

async function searchOsmNominatim(query: string): Promise<PlaceSuggestion[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NightAware-App/1.0' },
    });
    clearTimeout(timer);

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      const name = item.name || item.display_name.split(',')[0];
      const secondaryText = item.display_name.split(',').slice(1, 4).join(',').trim();

      return {
        id: `nom-${lat},${lon}`,
        name,
        secondaryText,
        fullAddress: item.display_name,
        coordinate: { latitude: lat, longitude: lon },
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Live search suggestions as user types anywhere in the world.
 */
export async function searchPlaceSuggestions(
  query: string,
  near?: Coordinate,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // 1. Live OpenStreetMap Photon search (instant, global, handles typos)
  const photonResults = await searchOsmPhoton(trimmed, near);
  if (photonResults.length > 0) return photonResults;

  // 2. Live OSM Nominatim search
  const nominatimResults = await searchOsmNominatim(trimmed);
  if (nominatimResults.length > 0) return nominatimResults;

  // 3. Google Places API if configured
  if (isApiKeyConfigured()) {
    try {
      const predictions = await autocompleteSearch(trimmed, near);
      if (predictions.length > 0) {
        return predictions.map((p: AutocompleteResult) => ({
          id: p.placeId,
          name: p.mainText,
          secondaryText: p.secondaryText,
          fullAddress: p.description,
        }));
      }
    } catch {}
  }

  return [];
}

/**
 * Resolve a selected place suggestion to its GPS coordinate and address.
 */
export async function resolvePlace(
  placeId: string,
): Promise<{ coordinate: Coordinate; address: string } | null> {
  if (!placeId) return null;

  // Embedded coordinate in photon or nominatim id
  if (placeId.startsWith('photon-') || placeId.startsWith('nom-')) {
    const raw = placeId.replace(/^(photon-|nom-)/, '');
    const [latStr, lonStr] = raw.split(',');
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!isNaN(lat) && !isNaN(lon)) {
      return {
        coordinate: { latitude: lat, longitude: lon },
        address: '',
      };
    }
  }

  // Google Places API lookup
  if (isApiKeyConfigured()) {
    try {
      const result = await getPlaceCoordinate(placeId);
      if (result) return result;
    } catch {}
  }

  return null;
}

/**
 * Geocode address string to coordinate.
 */
export async function geocode(address: string): Promise<Coordinate | null> {
  const osmResults = await searchOsmNominatim(address);
  if (osmResults.length > 0 && osmResults[0].coordinate) {
    return osmResults[0].coordinate;
  }

  if (isApiKeyConfigured()) {
    try {
      const result = await geocodeAddress(address);
      if (result) return result.coordinate;
    } catch {}
  }
  return null;
}

/**
 * Reverse geocode coordinate to address.
 */
export async function reverseGeocode(coordinate: Coordinate): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinate.latitude}&lon=${coordinate.longitude}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'NightAware-App/1.0' } });
    if (res.ok) {
      const data = await res.json();
      if (data.display_name) return data.display_name;
    }
  } catch {}

  if (isApiKeyConfigured()) {
    try {
      const address = await reverseGeocodeCoord(coordinate);
      if (address) return address;
    } catch {}
  }
  return null;
}

/** Backwards compatible searchPlaces */
export async function searchPlaces(
  query: string,
  near?: Coordinate,
): Promise<SearchResult[]> {
  const suggestions = await searchPlaceSuggestions(query, near);
  const results: SearchResult[] = [];
  for (const s of suggestions.slice(0, 5)) {
    if (s.coordinate) {
      results.push({
        id: s.id,
        name: s.name,
        address: s.fullAddress,
        coordinate: s.coordinate,
      });
    } else {
      const resolved = await resolvePlace(s.id);
      if (resolved) {
        results.push({
          id: s.id,
          name: s.name,
          address: resolved.address || s.fullAddress,
          coordinate: resolved.coordinate,
        });
      }
    }
  }
  return results;
}
