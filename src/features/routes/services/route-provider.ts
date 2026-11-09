/**
 * Route provider — fetches real routes via Google Directions API,
 * computes Night Activity Scores, and labels alternatives.
 *
 * Falls back to mock data when the API key is missing or the request fails.
 */

import type { Coordinate, JourneyRequest, Place, RouteOption, TravelMode } from '@/types/geo';
import { MOCK_ROUTES } from '@/data/mock-routes';
import { getPlacesNearRoute } from '@/features/places/services/place-provider';
import { fetchDirections, isApiKeyConfigured } from '@/lib/google-maps-api';
import { computeActivityScore } from './activity-score';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map our TravelMode to Google Directions API mode strings */
function toGoogleMode(mode: TravelMode): 'driving' | 'walking' | 'bicycling' {
  switch (mode) {
    case 'walking':
      return 'walking';
    case 'cycling':
      return 'bicycling';
    case 'driving':
    default:
      return 'driving';
  }
}

/** Route colour palette — matches mock-routes colours for consistency */
const ROUTE_COLORS_BY_INDEX: string[] = [
  '#ff9400', // orange  — best activity
  '#38BDF8', // cyan    — balanced
  '#F87171', // coral   — fastest
  '#A78BFA', // purple  — extra alternatives
  '#34D399', // green
];

/** Get a colour for a route by its index */
export function getRouteColorByIndex(index: number): string {
  return ROUTE_COLORS_BY_INDEX[index % ROUTE_COLORS_BY_INDEX.length];
}

// ---------------------------------------------------------------------------
// In-memory cache for routes (key = origin-dest-mode)
// ---------------------------------------------------------------------------

const routeCache = new Map<string, RouteOption[]>();

function journeyCacheKey(origin: Coordinate, dest: Coordinate, mode: TravelMode): string {
  return `${origin.latitude.toFixed(5)},${origin.longitude.toFixed(5)}-${dest.latitude.toFixed(5)},${dest.longitude.toFixed(5)}-${mode}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate route options for a journey.
 * Returns 2–3 alternatives ranked by nightActivityScore descending.
 */
export async function getRouteOptions(
  journey: JourneyRequest,
): Promise<RouteOption[]> {
  // Use cache if available
  const key = journeyCacheKey(journey.origin, journey.destination, journey.travelMode);
  if (routeCache.has(key)) {
    return routeCache.get(key)!;
  }

  // Try real Google Directions API
  if (isApiKeyConfigured()) {
    try {
      const directionsRoutes = await fetchDirections(
        journey.origin,
        journey.destination,
        toGoogleMode(journey.travelMode),
        true, // request alternatives
      );

      if (directionsRoutes.length > 0) {
        // Fast parallel fetch: gather nearby places along the primary route corridor
        // with a 1.2s safety timeout so the route displays without lag
        let corridorPlaces: Place[] = [];
        try {
          const timeoutPromise = new Promise<Place[]>((resolve) =>
            setTimeout(() => resolve([]), 1200),
          );
          corridorPlaces = await Promise.race([
            getPlacesNearRoute(directionsRoutes[0].coordinates, 400),
            timeoutPromise,
          ]);
        } catch {
          corridorPlaces = [];
        }

        // Build route options with activity scores
        const options: RouteOption[] = [];
        const minDuration = Math.min(...directionsRoutes.map((r) => r.durationMinutes));

        for (let i = 0; i < directionsRoutes.length; i++) {
          const dr = directionsRoutes[i];

          // Compute activity score using available corridor places
          const scoreResult = computeActivityScore(dr.coordinates, corridorPlaces);

          options.push({
            id: `route-${i}`,
            label: '', // will be assigned below
            coordinates: dr.coordinates,
            distanceMeters: dr.distanceMeters,
            durationMinutes: dr.durationMinutes,
            extraMinutes: dr.durationMinutes - minDuration,
            nightActivityScore: scoreResult.score,
            placesOpenNearRoute: scoreResult.openPlacesCount,
            longestStretchWithoutOpenHelpMeters: scoreResult.longestStretchWithoutHelpMeters,
            longestLowActivityStretchMeters: null, // future: per-segment analysis
            isMock: false,
          });
        }

        // Label routes based on characteristics
        labelRoutes(options);

        // Sort by activity score descending
        options.sort((a, b) => (b.nightActivityScore ?? 0) - (a.nightActivityScore ?? 0));

        // Reassign IDs after sort for colour consistency
        options.forEach((opt, i) => {
          opt.id = `route-${i}`;
        });

        routeCache.set(key, options);
        return options;
      }
    } catch {
      // Fall through to mock data
    }
  }

  // Fallback: return mock routes
  return MOCK_ROUTES;
}

/**
 * Assign meaningful labels to route options based on their stats.
 */
function labelRoutes(routes: RouteOption[]): void {
  if (routes.length === 0) return;

  // Find which route has highest score and which is fastest
  let highestScoreIdx = 0;
  let fastestIdx = 0;

  for (let i = 1; i < routes.length; i++) {
    if ((routes[i].nightActivityScore ?? 0) > (routes[highestScoreIdx].nightActivityScore ?? 0)) {
      highestScoreIdx = i;
    }
    if (routes[i].durationMinutes < routes[fastestIdx].durationMinutes) {
      fastestIdx = i;
    }
  }

  for (let i = 0; i < routes.length; i++) {
    if (i === highestScoreIdx && i === fastestIdx) {
      routes[i].label = 'Best route';
    } else if (i === highestScoreIdx) {
      routes[i].label = 'More nearby activity';
    } else if (i === fastestIdx) {
      routes[i].label = 'Fastest route';
    } else {
      routes[i].label = 'Balanced';
    }
  }
}

/**
 * Get a single route by its ID from the last-fetched results.
 */
export async function getRouteById(id: string): Promise<RouteOption | null> {
  // Check cache
  for (const routes of routeCache.values()) {
    const found = routes.find((r) => r.id === id);
    if (found) return found;
  }
  // Fallback to mock
  return MOCK_ROUTES.find((route) => route.id === id) ?? null;
}

/**
 * Get places near a specific route (within 300m of any waypoint).
 */
export async function getRoutePlaces(routeId: string): Promise<Place[]> {
  const route = await getRouteById(routeId);
  if (!route) return [];
  return getPlacesNearRoute(route.coordinates, 300);
}

/**
 * Clear the route cache (useful when origin/destination changes).
 */
export function clearRouteCache(): void {
  routeCache.clear();
}
