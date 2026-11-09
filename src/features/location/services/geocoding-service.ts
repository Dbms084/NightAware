/**
 * Geocoding & Places Search service.
 *
 * Uses Google Places (New) Autocomplete and Details API.
 * Provides instant typing suggestions (like Uber / Google Maps) and coordinate resolution on selection.
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

/** Fast typing suggestion (returned immediately without waiting for coordinate lookup) */
export type PlaceSuggestion = {
  id: string;
  name: string;
  secondaryText: string;
  fullAddress: string;
};

/** Full search result with resolved coordinate */
export type SearchResult = {
  id: string;
  name: string;
  address: string;
  coordinate: Coordinate;
};

// ---------------------------------------------------------------------------
// Popular / Demo Destinations (with exact coordinates)
// ---------------------------------------------------------------------------

export type QuickDestination = PlaceSuggestion & { coordinate: Coordinate };

export const POPULAR_DESTINATIONS: QuickDestination[] = [
  {
    id: 'demo-12th-main',
    name: 'Home · 12th Main Road',
    secondaryText: 'HAL 2nd Stage, Indiranagar, Bengaluru',
    fullAddress: '12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
    coordinate: { latitude: 12.9650, longitude: 77.6450 },
  },
  {
    id: 'demo-indiranagar-metro',
    name: 'Indiranagar Metro Station',
    secondaryText: 'CMH Road, Binnamangala, Indiranagar, Bengaluru',
    fullAddress: 'Indiranagar Metro Station, CMH Road, Bengaluru, Karnataka 560038',
    coordinate: { latitude: 12.9779, longitude: 77.6408 },
  },
  {
    id: 'demo-bda-complex',
    name: 'Indiranagar BDA Complex',
    secondaryText: '100 Feet Road, HAL 2nd Stage, Bengaluru',
    fullAddress: 'BDA Complex, 100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038',
    coordinate: { latitude: 12.9710, longitude: 77.6422 },
  },
  {
    id: 'demo-koramangala-5th',
    name: 'Koramangala 5th Block',
    secondaryText: 'Near Sony World Junction, Bengaluru',
    fullAddress: 'Koramangala 5th Block, Bengaluru, Karnataka 560095',
    coordinate: { latitude: 12.9352, longitude: 77.6245 },
  },
  {
    id: 'demo-mg-road',
    name: 'MG Road Metro Station',
    secondaryText: 'Mahatma Gandhi Road, Bengaluru',
    fullAddress: 'MG Road Metro Station, Shivaji Nagar, Bengaluru, Karnataka 560001',
    coordinate: { latitude: 12.9756, longitude: 77.6066 },
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get instant autocomplete suggestions as user types (Uber / Google Maps style).
 * Fast, lightweight: doesn't block on fetching coordinates.
 */
export async function searchPlaceSuggestions(
  query: string,
  near?: Coordinate,
): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // Try Google Places (New) Autocomplete
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
    } catch {
      // Fall through to local suggestions
    }
  }

  // Filter local popular places as fallback
  const q = trimmed.toLowerCase();
  return POPULAR_DESTINATIONS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.secondaryText.toLowerCase().includes(q) ||
      p.fullAddress.toLowerCase().includes(q),
  );
}

/**
 * Resolve a selected place suggestion to its exact GPS coordinate and full address.
 * Called when the user taps a suggestion from the list.
 */
export async function resolvePlace(
  placeId: string,
): Promise<{ coordinate: Coordinate; address: string } | null> {
  if (!placeId) return null;

  // Check local quick destinations first
  const localMatch = POPULAR_DESTINATIONS.find((p) => p.id === placeId);
  if (localMatch) {
    return {
      coordinate: localMatch.coordinate,
      address: localMatch.fullAddress,
    };
  }

  // Fetch from Google Places API (New)
  if (isApiKeyConfigured()) {
    try {
      const result = await getPlaceCoordinate(placeId);
      if (result) return result;
    } catch {
      // Fall through
    }
  }

  return null;
}

/**
 * Convert an address string to a coordinate.
 * Uses Google Geocoding API.
 */
export async function geocode(address: string): Promise<Coordinate | null> {
  if (isApiKeyConfigured()) {
    try {
      const result = await geocodeAddress(address);
      if (result) return result.coordinate;
    } catch {
      // Fall through
    }
  }
  return null;
}

/**
 * Convert a coordinate to a human-readable address.
 * Uses Google Reverse Geocoding API.
 */
export async function reverseGeocode(
  coordinate: Coordinate,
): Promise<string | null> {
  if (isApiKeyConfigured()) {
    try {
      const address = await reverseGeocodeCoord(coordinate);
      if (address) return address;
    } catch {
      // Fall through
    }
  }
  return null;
}

/** Backwards-compatible searchPlaces */
export async function searchPlaces(
  query: string,
  near?: Coordinate,
): Promise<SearchResult[]> {
  const suggestions = await searchPlaceSuggestions(query, near);
  const results: SearchResult[] = [];
  for (const s of suggestions.slice(0, 5)) {
    const resolved = await resolvePlace(s.id);
    if (resolved) {
      results.push({
        id: s.id,
        name: s.name,
        address: resolved.address,
        coordinate: resolved.coordinate,
      });
    }
  }
  return results;
}
