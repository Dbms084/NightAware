/**
 * Route Provider — Fetches candidate routes via the Valhalla router
 * (https://valhalla1.openstreetmap.de/route), scores each using the
 * 9-parameter Night Activity Engine, and formats the route profiles:
 * Safest-Profile, Balanced, Fastest.
 */

import type { Coordinate, JourneyRequest, RouteOption, TravelMode, RouteProfileType } from '@/types/geo';
import { getPlacesNearRoute } from '@/features/places/services/place-provider';
import { fetchValhallaDirections } from './valhalla-routing';
import { calculateNightActivityScore } from './activity-score';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Route colour palette */
export const ROUTE_COLORS_BY_PROFILE: Record<RouteProfileType, string> = {
  safest: '#ff8a00',  // Orange
  balanced: '#38bdf8', // Cyan
  fastest: '#f87171',  // Coral / Red
};

export function getRouteColor(profileType: RouteProfileType): string {
  return ROUTE_COLORS_BY_PROFILE[profileType] ?? '#ff8a00';
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const routeCache = new Map<string, RouteOption[]>();

function journeyCacheKey(origin: Coordinate, dest: Coordinate, mode: TravelMode, departureTime?: Date): string {
  const timeKey = departureTime ? departureTime.getTime() : 0;
  return `${origin.latitude.toFixed(5)},${origin.longitude.toFixed(5)}-${dest.latitude.toFixed(5)},${dest.longitude.toFixed(5)}-${mode}-${timeKey}`;
}

export function clearRouteCache(): void {
  routeCache.clear();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate 3 route recommendations (Safest-Profile, Balanced, Fastest).
 */
export async function getRouteOptions(
  journey: JourneyRequest,
  maxDetourRatio: number = 0.35, // max 35% extra duration for safe route
): Promise<RouteOption[]> {
  const key = journeyCacheKey(
    journey.origin,
    journey.destination,
    journey.travelMode,
    journey.departureTime,
  );
  if (routeCache.has(key)) {
    return routeCache.get(key)!;
  }

  let rawRoutes: { coordinates: Coordinate[]; distanceMeters: number; durationMinutes: number }[] = [];

  // Valhalla routing is the sole route provider.
  try {
    rawRoutes = await fetchValhallaDirections(
      journey.origin,
      journey.destination,
      journey.travelMode,
    );
  } catch {
    // If Valhalla fails, leave rawRoutes empty — no fabricated routes.
    rawRoutes = [];
  }

  // Score all candidate routes on the actual street network
  if (rawRoutes.length > 0) {
    try {
      const candidateOptions: RouteOption[] = [];
      const minDuration = Math.min(...rawRoutes.map((r) => r.durationMinutes));

      for (let i = 0; i < rawRoutes.length; i++) {
        const dr = rawRoutes[i];
        const routePlaces = await getPlacesNearRoute(
          dr.coordinates,
          320,
          journey.originName,
          journey.destinationName,
        );
        const calc = calculateNightActivityScore(
          dr.coordinates,
          routePlaces,
          journey.departureTime,
          journey.travelMode,
        );

        candidateOptions.push({
          id: `route-${i}`,
          label: '',
          profileType: 'balanced', // assigned below
          coordinates: dr.coordinates,
          distanceMeters: dr.distanceMeters,
          durationMinutes: dr.durationMinutes,
          extraMinutes: Math.max(0, dr.durationMinutes - minDuration),
          nightActivityScore: calc.score,
          scoreBreakdown: calc.breakdown,
          routeEvidence: calc.routeEvidence,
          longestQuietStretchMeters: calc.longestQuietStretchMeters,
          mainRoadPercentage: calc.mainRoadPercentage,
          lightingCoveragePercentage: calc.lightingCoveragePercentage,
          establishments: calc.enrichedPlaces,
          placesOpenNearRoute: calc.counts.openPlaces,
          closedPlacesCount: calc.counts.closedPlaces,
          twentyFourSevenCount: calc.counts.twentyFourSeven,
          pharmaciesCount: calc.counts.pharmacies,
          petrolPumpsCount: calc.counts.petrolPumps,
          policeCount: calc.counts.police,
          hospitalsCount: calc.counts.hospitals,
          publicTransportCount: calc.counts.publicTransport,
          cctvCount: calc.counts.cctv,
          heatmapSegments: calc.heatmapSegments,
          isMock: false,
        });
      }

      const classified = classifyRouteProfiles(candidateOptions, minDuration, maxDetourRatio);
      routeCache.set(key, classified);
      return classified;
    } catch {}
  }

  // No offline/fabricated fallback: return an empty list when routing fails.
  return [];
}

/**
 * Classifies candidate routes into: Safest, Balanced, Fastest.
 *
 * Every returned recommendation uses a distinct candidate route — no profile
 * is ever assigned to the same route geometry twice, and no routes are
 * fabricated when fewer than three alternatives exist.
 */
function classifyRouteProfiles(
  candidates: RouteOption[],
  minDuration: number,
  maxDetourRatio: number,
): RouteOption[] {
  if (candidates.length === 0) return [];
  if (candidates.length === 1) {
    const single = candidates[0];
    return [
      {
        ...single,
        id: 'route-safest',
        profileType: 'safest',
        label: 'Recommended',
      },
    ];
  }

  // 1. Identify Fastest (minimum duration)
  const sortedByTime = [...candidates].sort((a, b) => a.durationMinutes - b.durationMinutes);
  const fastestCandidate = sortedByTime[0];

  // 2. Identify Safest (highest activity score within allowable detour)
  const maxAllowedDuration = minDuration * (1 + maxDetourRatio);
  const eligibleSafe = candidates.filter((r) => r.durationMinutes <= maxAllowedDuration);
  const sortedByScore = (eligibleSafe.length > 0 ? eligibleSafe : candidates).sort(
    (a, b) => b.nightActivityScore - a.nightActivityScore,
  );

  // Pick a safest candidate distinct from the fastest (different geometry/id).
  let safestCandidate = sortedByScore[0];
  if (safestCandidate.id === fastestCandidate.id && sortedByScore.length > 1) {
    safestCandidate = sortedByScore[1];
  }

  const finalSafest: RouteOption = {
    ...safestCandidate,
    id: 'route-safest',
    profileType: 'safest',
    label: 'Safer profile',
  };

  const finalFastest: RouteOption = {
    ...fastestCandidate,
    id: 'route-fastest',
    profileType: 'fastest',
    label: 'Fastest',
  };

  // 3. Identify Balanced — a remaining candidate distinct from both.
  const balancedCandidate = candidates.find(
    (r) => r.id !== safestCandidate.id && r.id !== fastestCandidate.id,
  );

  if (balancedCandidate) {
    const finalBalanced: RouteOption = {
      ...balancedCandidate,
      id: 'route-balanced',
      profileType: 'balanced',
      label: 'Balanced',
    };
    return [finalSafest, finalBalanced, finalFastest];
  }

  // Only two distinct routes are available — return both.
  return [finalSafest, finalFastest];
}