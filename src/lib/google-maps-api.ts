/**
 * Google Maps API client — central HTTP client for Places (New), Routes (New), and Geocoding.
 *
 * Uses the Places API (New) and Routes API v2 endpoints supported by modern Google Cloud keys.
 * All functions include graceful error handling and fallbacks.
 */

import type { Coordinate, PlaceCategory, Place } from '@/types/geo';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_KEY = (
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  ''
).trim();

const ENDPOINTS = {
  geocoding: 'https://maps.googleapis.com/maps/api/geocode/json',
  placesAutocomplete: 'https://places.googleapis.com/v1/places:autocomplete',
  placesNearby: 'https://places.googleapis.com/v1/places:searchNearby',
  placeDetails: 'https://places.googleapis.com/v1/places',
  computeRoutes: 'https://routes.googleapis.com/directions/v2:computeRoutes',
} as const;

// ---------------------------------------------------------------------------
// Google type → our PlaceCategory mapping
// ---------------------------------------------------------------------------

const GOOGLE_TYPE_TO_CATEGORY: Record<string, PlaceCategory> = {
  hospital: 'hospital',
  doctor: 'hospital',
  health: 'hospital',
  pharmacy: 'pharmacy',
  drugstore: 'pharmacy',
  gas_station: 'petrol_station',
  restaurant: 'shop_food',
  cafe: 'shop_food',
  convenience_store: 'shop_food',
  supermarket: 'shop_food',
  grocery_or_supermarket: 'shop_food',
  food: 'shop_food',
  meal_delivery: 'shop_food',
  meal_takeaway: 'shop_food',
  bakery: 'shop_food',
  bus_station: 'transport',
  transit_station: 'transport',
  train_station: 'transport',
  subway_station: 'transport',
  taxi_stand: 'transport',
  police: 'police',
  fire_station: 'help_point',
  local_government_office: 'help_point',
};

/** Our category → Google place types for nearby search */
export const CATEGORY_TO_GOOGLE_TYPES: Record<PlaceCategory, string[]> = {
  hospital: ['hospital'],
  pharmacy: ['pharmacy'],
  petrol_station: ['gas_station'],
  shop_food: ['restaurant', 'cafe', 'convenience_store'],
  transport: ['bus_station', 'transit_station', 'subway_station'],
  help_point: ['fire_station', 'local_government_office'],
  police: ['police'],
  cctv: [],
  streetlight: [],
};

// ---------------------------------------------------------------------------
// Geocoding
// ---------------------------------------------------------------------------

export type GeocodingResult = {
  address: string;
  coordinate: Coordinate;
  placeId: string;
};

/** Forward geocode: address → coordinate */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!API_KEY) return null;
  try {
    const url = `${ENDPOINTS.geocoding}?address=${encodeURIComponent(address)}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;

    const result = data.results[0];
    return {
      address: result.formatted_address,
      coordinate: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      },
      placeId: result.place_id,
    };
  } catch {
    return null;
  }
}

/** Reverse geocode: coordinate → address string */
export async function reverseGeocodeCoord(
  coordinate: Coordinate,
): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const url = `${ENDPOINTS.geocoding}?latlng=${coordinate.latitude},${coordinate.longitude}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;
    return data.results[0].formatted_address ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Places Autocomplete (Places API New)
// ---------------------------------------------------------------------------

export type AutocompleteResult = {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
};

/**
 * Search places by text query (autocomplete) using Google Places API (New).
 * Fast and lightweight: only returns suggestions without blocking for coordinates.
 */
export async function autocompleteSearch(
  query: string,
  near?: Coordinate,
): Promise<AutocompleteResult[]> {
  if (!query.trim() || !API_KEY) return [];

  try {
    const body: Record<string, unknown> = {
      input: query,
    };

    if (near) {
      body.locationBias = {
        circle: {
          center: { latitude: near.latitude, longitude: near.longitude },
          radius: 25000.0, // 25 km radius bias
        },
      };
    }

    const res = await fetch(ENDPOINTS.placesAutocomplete, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!data.suggestions || !Array.isArray(data.suggestions)) return [];

    return data.suggestions
      .filter((s: any) => s.placePrediction)
      .slice(0, 6)
      .map((s: any) => {
        const pred = s.placePrediction;
        const main = pred.structuredFormat?.mainText?.text ?? pred.text?.text ?? '';
        const secondary = pred.structuredFormat?.secondaryText?.text ?? '';
        const full = pred.text?.text ?? `${main}, ${secondary}`;
        return {
          placeId: pred.placeId,
          mainText: main,
          secondaryText: secondary,
          description: full,
        };
      });
  } catch {
    return [];
  }
}

/** Get coordinate and formatted address for a place ID using Places API (New) */
export async function getPlaceCoordinate(placeId: string): Promise<{ coordinate: Coordinate; address: string } | null> {
  if (!API_KEY || !placeId) return null;

  try {
    const url = `${ENDPOINTS.placeDetails}/${placeId}`;
    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'id,location,formattedAddress,displayName',
      },
    });

    const data = await res.json();
    if (!data.location) return null;

    return {
      coordinate: {
        latitude: data.location.latitude,
        longitude: data.location.longitude,
      },
      address: data.formattedAddress ?? data.displayName?.text ?? '',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Nearby Places (Places API New)
// ---------------------------------------------------------------------------

/** Comprehensive nighttime open/activity place types for a single multi-type query */
export const ALL_NIGHT_TYPES: string[] = [
  'hospital',
  'pharmacy',
  'gas_station',
  'restaurant',
  'cafe',
  'convenience_store',
  'supermarket',
  'transit_station',
  'subway_station',
  'bus_station',
  'police',
];

/**
 * Search essential night establishments around a coordinate using Places API (New) TextSearch.
 * Highly reliable across all global cities for finding 24/7 pharmacies, hospitals, police,
 * petrol pumps, and open convenience stores.
 */
export async function searchNearbyNightPois(
  coordinate: Coordinate,
  radiusMeters: number = 750,
): Promise<Place[]> {
  if (!API_KEY) return [];

  try {
    const url = 'https://places.googleapis.com/v1/places:searchText';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.primaryType,places.types,places.formattedAddress,places.location,places.regularOpeningHours,places.nationalPhoneNumber',
      },
      body: JSON.stringify({
        textQuery: 'pharmacy hospital police station petrol pump supermarket convenience store',
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: { latitude: coordinate.latitude, longitude: coordinate.longitude },
            radius: radiusMeters,
          },
        },
      }),
    });

    const data = await res.json();
    if (!data.places || !Array.isArray(data.places)) return [];

    return data.places.map((p: any) => {
      const allTypes = (p.types || []).concat(p.primaryType || '');
      const category = mapGoogleTypeToCategory(allTypes);
      const isOpen = p.regularOpeningHours?.openNow ?? null;

      return {
        id: p.id ?? `place-${Math.random().toString(36).slice(2, 8)}`,
        name: p.displayName?.text ?? 'Open Establishment',
        coordinate: {
          latitude: p.location?.latitude ?? coordinate.latitude,
          longitude: p.location?.longitude ?? coordinate.longitude,
        },
        category,
        address: p.formattedAddress || undefined,
        phone: p.nationalPhoneNumber || undefined,
        is24_7: Boolean(p.regularOpeningHours?.openNow),
        openAtJourneyTime: isOpen,
        dataSource: 'provider' as const,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Fetch nearby places across multiple types in a SINGLE Places API (New) request.
 * Drastically cuts network round-trips from dozens to just 1 request per waypoint.
 */
export async function fetchNearbyPlacesMulti(
  coordinate: Coordinate,
  radiusMeters: number,
  googleTypes: string[] = ALL_NIGHT_TYPES,
): Promise<Place[]> {
  if (!API_KEY) return [];

  try {
    const res = await fetch(ENDPOINTS.placesNearby, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types,places.regularOpeningHours',
      },
      body: JSON.stringify({
        includedTypes: googleTypes,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: coordinate.latitude, longitude: coordinate.longitude },
            radius: radiusMeters,
          },
        },
      }),
    });

    const data = await res.json();
    if (!data.places || !Array.isArray(data.places)) return [];

    return data.places.map((p: any) => {
      const category = mapGoogleTypeToCategory(p.types ?? []);
      const isOpen = p.regularOpeningHours?.openNow ?? null;

      return {
        id: p.id ?? `place-${Math.random().toString(36).slice(2, 8)}`,
        name: p.displayName?.text ?? 'Unknown',
        coordinate: {
          latitude: p.location?.latitude ?? coordinate.latitude,
          longitude: p.location?.longitude ?? coordinate.longitude,
        },
        category,
        openAtJourneyTime: isOpen,
        dataSource: 'provider' as const,
      };
    });
  } catch {
    return [];
  }
}

/** Fetch nearby places of a given Google type using Places API (New) */
export async function fetchNearbyPlaces(
  coordinate: Coordinate,
  radiusMeters: number,
  googleType: string,
): Promise<Place[]> {
  if (!API_KEY) return [];

  try {
    const res = await fetch(ENDPOINTS.placesNearby, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types,places.regularOpeningHours',
      },
      body: JSON.stringify({
        includedTypes: [googleType],
        maxResultCount: 8,
        locationRestriction: {
          circle: {
            center: { latitude: coordinate.latitude, longitude: coordinate.longitude },
            radius: radiusMeters,
          },
        },
      }),
    });

    const data = await res.json();
    if (!data.places || !Array.isArray(data.places)) return [];

    return data.places.map((p: any) => {
      const category = mapGoogleTypeToCategory(p.types ?? []);
      const isOpen = p.regularOpeningHours?.openNow ?? null;

      return {
        id: p.id ?? `place-${Math.random().toString(36).slice(2, 8)}`,
        name: p.displayName?.text ?? 'Unknown',
        coordinate: {
          latitude: p.location?.latitude ?? coordinate.latitude,
          longitude: p.location?.longitude ?? coordinate.longitude,
        },
        category,
        openAtJourneyTime: isOpen,
        dataSource: 'provider' as const,
      };
    });
  } catch {
    return [];
  }
}

/** Map Google place types array to our PlaceCategory */
function mapGoogleTypeToCategory(types: string[]): PlaceCategory {
  for (const t of types) {
    if (GOOGLE_TYPE_TO_CATEGORY[t]) return GOOGLE_TYPE_TO_CATEGORY[t];
  }
  return 'shop_food';
}

// ---------------------------------------------------------------------------
// Routes API (Routes API v2)
// ---------------------------------------------------------------------------

export type DirectionsRoute = {
  /** Decoded polyline coordinates */
  coordinates: Coordinate[];
  /** Total distance in metres */
  distanceMeters: number;
  /** Total duration in minutes */
  durationMinutes: number;
  /** Route summary label from Google */
  summary: string;
};

/** Fetch route alternatives between origin and destination using Routes API (New) */
export async function fetchDirections(
  origin: Coordinate,
  destination: Coordinate,
  mode: 'driving' | 'walking' | 'bicycling' = 'walking',
  alternatives: boolean = true,
): Promise<DirectionsRoute[]> {
  if (!API_KEY) return [];

  const travelMode =
    mode === 'walking' ? 'WALK' : mode === 'bicycling' ? 'BICYCLE' : 'DRIVE';

  try {
    const res = await fetch(ENDPOINTS.computeRoutes, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
        destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
        travelMode,
        computeAlternativeRoutes: alternatives,
      }),
    });

    const data = await res.json();
    if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) return [];

    return data.routes.map((route: any) => {
      const encoded = route.polyline?.encodedPolyline ?? '';
      const coordinates = decodePolyline(encoded);
      const rawSecs = parseInt((route.duration ?? '0s').replace('s', ''), 10) || 0;
      const durationMinutes = Math.max(1, Math.ceil(rawSecs / 60));

      return {
        coordinates,
        distanceMeters: route.distanceMeters ?? 0,
        durationMinutes,
        summary: route.description ?? '',
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Polyline decoder (Google's encoded polyline format)
// ---------------------------------------------------------------------------

/** Decode a Google encoded polyline string into Coordinate[] */
export function decodePolyline(encoded: string): Coordinate[] {
  const coords: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    // Decode latitude
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    // Decode longitude
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return coords;
}

/** Check if API key is configured */
export function isApiKeyConfigured(): boolean {
  return Boolean(
    API_KEY &&
      API_KEY.length > 0 &&
      API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
      API_KEY !== 'your-google-maps-api-key-here',
  );
}
