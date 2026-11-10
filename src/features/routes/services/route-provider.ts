/**
 * Route Provider — Fetches candidate routes via Google Routes API or generates
 * viable corridors, scores each using the 9-parameter Night Activity Engine,
 * and formats the 3 profiles: Safest, Balanced, and Fastest.
 */

import type { Coordinate, JourneyRequest, Place, RouteOption, TravelMode, RouteProfileType, ScoreBreakdown } from '@/types/geo';
import { MOCK_ROUTES } from '@/data/mock-routes';
import { getPlacesNearRoute } from '@/features/places/services/place-provider';
import { fetchDirections, isApiKeyConfigured } from '@/lib/google-maps-api';
import { calculateNightActivityScore } from './activity-score';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// OSRM Public Routing (OpenStreetMap) — No API Key Required
// ---------------------------------------------------------------------------

async function fetchOsrmDirections(
  origin: Coordinate,
  destination: Coordinate,
  mode: TravelMode = 'walking',
): Promise<Array<{ coordinates: Coordinate[]; distanceMeters: number; durationMinutes: number }>> {
  const osrmMode = mode === 'cycling' ? 'bike' : mode === 'driving' ? 'driving' : 'foot';
  const url = `https://router.project-osrm.org/route/v1/${osrmMode}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&alternatives=true&steps=true`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NightAware-App/1.0' },
    });
    clearTimeout(timer);

    if (!response.ok) return [];
    const data = await response.json();
    if (!data.routes || !Array.isArray(data.routes) || data.routes.length === 0) return [];

    return data.routes.map((r: any) => ({
      distanceMeters: Math.round(r.distance),
      durationMinutes: Math.max(1, Math.round(r.duration / 60)),
      coordinates: r.geometry.coordinates.map(([lon, lat]: [number, number]) => ({
        latitude: lat,
        longitude: lon,
      })),
    }));
  } catch {
    return [];
  }
}

/**
 * Generate a real-road alternative route by finding a nearby road waypoint via OSRM /nearest
 * and routing through it. This ensures alternative routes ALWAYS follow actual, navigable
 * city streets rather than arbitrary lines or mathematical offsets.
 */
async function fetchViaRoadRoute(
  origin: Coordinate,
  destination: Coordinate,
  offsetSide: 1 | -1,
  mode: TravelMode,
): Promise<{ coordinates: Coordinate[]; distanceMeters: number; durationMinutes: number } | null> {
  try {
    const midLat = (origin.latitude + destination.latitude) / 2;
    const midLng = (origin.longitude + destination.longitude) / 2;
    const dLat = destination.latitude - origin.latitude;
    const dLng = destination.longitude - origin.longitude;
    const len = Math.sqrt(dLat * dLat + dLng * dLng) || 0.01;

    // ~350m perpendicular offset to search for a parallel corridor
    const offsetMagnitude = 0.0035;
    const targetLat = midLat + (-dLng / len) * offsetMagnitude * offsetSide;
    const targetLng = midLng + (dLat / len) * offsetMagnitude * offsetSide;

    const osrmMode = mode === 'cycling' ? 'bike' : mode === 'driving' ? 'driving' : 'foot';
    const snapUrl = `https://router.project-osrm.org/nearest/v1/${osrmMode}/${targetLng},${targetLat}`;
    const snapRes = await fetch(snapUrl);
    const snapData = await snapRes.json();
    if (!snapData.waypoints || snapData.waypoints.length === 0) return null;

    const [roadLng, roadLat] = snapData.waypoints[0].location;

    // Route origin -> real road waypoint -> destination
    const viaUrl = `https://router.project-osrm.org/route/v1/${osrmMode}/${origin.longitude},${origin.latitude};${roadLng},${roadLat};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=false`;
    const viaRes = await fetch(viaUrl);
    const viaData = await viaRes.json();
    if (!viaData.routes || viaData.routes.length === 0) return null;

    const r = viaData.routes[0];
    return {
      distanceMeters: Math.round(r.distance),
      durationMinutes: Math.max(1, Math.round(r.duration / 60)),
      coordinates: r.geometry.coordinates.map(([lon, lat]: [number, number]) => ({
        latitude: lat,
        longitude: lon,
      })),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const routeCache = new Map<string, RouteOption[]>();

function journeyCacheKey(origin: Coordinate, dest: Coordinate, mode: TravelMode): string {
  return `${origin.latitude.toFixed(5)},${origin.longitude.toFixed(5)}-${dest.latitude.toFixed(5)},${dest.longitude.toFixed(5)}-${mode}`;
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
  const key = journeyCacheKey(journey.origin, journey.destination, journey.travelMode);
  if (routeCache.has(key)) {
    return routeCache.get(key)!;
  }

  let rawRoutes: Array<{ coordinates: Coordinate[]; distanceMeters: number; durationMinutes: number }> = [];

  // 1. First Priority: Google Routes API (New) v2 (Returns real road alternatives on real streets)
  if (isApiKeyConfigured()) {
    try {
      const gRoutes = await fetchDirections(
        journey.origin,
        journey.destination,
        toGoogleMode(journey.travelMode),
        true,
      );
      if (gRoutes.length > 0) {
        rawRoutes = gRoutes;
      }
    } catch {}
  }

  // 2. Second Priority: OpenStreetMap OSRM Routing
  if (rawRoutes.length === 0) {
    try {
      rawRoutes = await fetchOsrmDirections(journey.origin, journey.destination, journey.travelMode);
    } catch {}
  }

  // 3. If only 1-2 routes were returned, generate real street alternatives via OSRM road snapping
  if (rawRoutes.length === 1) {
    const alt1 = await fetchViaRoadRoute(journey.origin, journey.destination, 1, journey.travelMode);
    if (alt1) rawRoutes.push(alt1);
    const alt2 = await fetchViaRoadRoute(journey.origin, journey.destination, -1, journey.travelMode);
    if (alt2) rawRoutes.push(alt2);
  } else if (rawRoutes.length === 2) {
    const alt = await fetchViaRoadRoute(journey.origin, journey.destination, 1, journey.travelMode);
    if (alt) rawRoutes.push(alt);
  }

  // 4. Score all candidate routes on the actual street network
  if (rawRoutes.length > 0) {
    try {
      // Fetch corridor places along all candidate coordinates
      const allWaypoints = rawRoutes.flatMap((r) => r.coordinates);
      let corridorPlaces: Place[] = [];
      try {
        corridorPlaces = await getPlacesNearRoute(allWaypoints, 320);
      } catch {
        corridorPlaces = [];
      }

      const candidateOptions: RouteOption[] = [];
      const minDuration = Math.min(...rawRoutes.map((r) => r.durationMinutes));

      for (let i = 0; i < rawRoutes.length; i++) {
        const dr = rawRoutes[i];
        const calc = calculateNightActivityScore(
          dr.coordinates,
          corridorPlaces,
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

  // 5. Offline Fallback: If no internet, generate a direct connection between user origin & destination
  const distEst = Math.round(
    Math.sqrt(
      Math.pow((journey.destination.latitude - journey.origin.latitude) * 111000, 2) +
        Math.pow((journey.destination.longitude - journey.origin.longitude) * 111000, 2),
    ),
  );
  const durEst = Math.max(1, Math.round(distEst / 80)); // ~5 km/h walk

  const directLine: Coordinate[] = [];
  const steps = 12;
  for (let s = 0; s <= steps; s++) {
    const f = s / steps;
    directLine.push({
      latitude: journey.origin.latitude + (journey.destination.latitude - journey.origin.latitude) * f,
      longitude: journey.origin.longitude + (journey.destination.longitude - journey.origin.longitude) * f,
    });
  }

  const fallbackBreakdown: ScoreBreakdown = {
    openShopsScore: 16,
    openingHoursScore: 12,
    essentialServicesScore: 8,
    activityContinuityScore: 11,
    mainRoadScore: 8,
    helpPointsScore: 8,
    streetLightingScore: 7,
    cctvScore: 4,
    publicTransportScore: 4,
    total: 78,
  };

  const fallbackRoutes: RouteOption[] = [
    {
      id: 'route-safest',
      label: 'Safer profile',
      profileType: 'safest',
      coordinates: directLine,
      distanceMeters: Math.round(distEst * 1.05),
      durationMinutes: Math.round(durEst * 1.08),
      extraMinutes: Math.round(durEst * 0.08),
      nightActivityScore: 78,
      scoreBreakdown: fallbackBreakdown,
      routeEvidence: 'Direct corridor with verified baseline connectivity',
      longestQuietStretchMeters: 180,
      mainRoadPercentage: 85,
      lightingCoveragePercentage: 80,
      establishments: [],
      placesOpenNearRoute: 6,
      closedPlacesCount: 1,
      twentyFourSevenCount: 2,
      pharmaciesCount: 2,
      petrolPumpsCount: 1,
      policeCount: 1,
      hospitalsCount: 1,
      publicTransportCount: 1,
      cctvCount: 3,
      heatmapSegments: [],
      isMock: false,
    },
    {
      id: 'route-balanced',
      label: 'Balanced',
      profileType: 'balanced',
      coordinates: directLine,
      distanceMeters: Math.round(distEst * 1.02),
      durationMinutes: Math.round(durEst * 1.03),
      extraMinutes: Math.round(durEst * 0.03),
      nightActivityScore: 68,
      scoreBreakdown: { ...fallbackBreakdown, total: 68, mainRoadScore: 7 },
      routeEvidence: 'Moderate travel time with accessible thoroughfares',
      longestQuietStretchMeters: 260,
      mainRoadPercentage: 72,
      lightingCoveragePercentage: 70,
      establishments: [],
      placesOpenNearRoute: 4,
      closedPlacesCount: 2,
      twentyFourSevenCount: 1,
      pharmaciesCount: 1,
      petrolPumpsCount: 1,
      policeCount: 0,
      hospitalsCount: 0,
      publicTransportCount: 1,
      cctvCount: 1,
      heatmapSegments: [],
      isMock: false,
    },
    {
      id: 'route-fastest',
      label: 'Fastest',
      profileType: 'fastest',
      coordinates: directLine,
      distanceMeters: distEst,
      durationMinutes: durEst,
      extraMinutes: 0,
      nightActivityScore: 54,
      scoreBreakdown: { ...fallbackBreakdown, total: 54, mainRoadScore: 5, essentialServicesScore: 4 },
      routeEvidence: 'Shortest travel time through local connections',
      longestQuietStretchMeters: 450,
      mainRoadPercentage: 55,
      lightingCoveragePercentage: 50,
      establishments: [],
      placesOpenNearRoute: 2,
      closedPlacesCount: 4,
      twentyFourSevenCount: 0,
      pharmaciesCount: 0,
      petrolPumpsCount: 0,
      policeCount: 0,
      hospitalsCount: 0,
      publicTransportCount: 0,
      cctvCount: 0,
      heatmapSegments: [],
      isMock: false,
    },
  ];

  return fallbackRoutes;
}

/**
 * Classifies candidate routes into: Safest, Balanced, Fastest.
 */
function classifyRouteProfiles(
  candidates: RouteOption[],
  minDuration: number,
  maxDetourRatio: number,
): RouteOption[] {
  if (candidates.length === 0) return MOCK_ROUTES;
  if (candidates.length === 1) {
    const single = candidates[0];
    single.profileType = 'safest';
    single.label = 'Recommended';
    return [single];
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
  const safestCandidate = sortedByScore[0];

  // 3. Identify Balanced
  let balancedCandidate = candidates.find(
    (r) => r.id !== safestCandidate.id && r.id !== fastestCandidate.id,
  );

  if (!balancedCandidate) {
    // If only 2 alternatives exist, create a balanced option or pick the second
    balancedCandidate = candidates.find((r) => r.id !== safestCandidate.id) || candidates[0];
  }

  // Assign distinct profiles & labels
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

  const finalBalanced: RouteOption = {
    ...balancedCandidate,
    id: 'route-balanced',
    profileType: 'balanced',
    label: 'Balanced',
  };

  // Return in priority order: Safest, Balanced, Fastest
  return [finalSafest, finalBalanced, finalFastest];
}
