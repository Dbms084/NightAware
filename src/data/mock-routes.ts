/**
 * Mock route options between Indiranagar Metro (Exit A) and 12th Main Road.
 *
 * Waypoints follow real Indiranagar streets extracted from OpenStreetMap
 * so polylines render as plausible walking routes, not straight lines.
 *
 * These are DEMO fixtures — all marked isMock: true.
 */

import type { RouteOption } from '@/types/geo';

// ---------------------------------------------------------------------------
// Route A — "More nearby activity"
// Via 100 Feet Road → BDA Complex → Defence Colony → 12th Main
// Longer but passes more open shops, restaurants, and CCTV coverage.
// ---------------------------------------------------------------------------

const routeA: RouteOption = {
  id: 'route-a',
  label: 'More nearby activity',
  distanceMeters: 2820,
  durationMinutes: 12,
  extraMinutes: 4,
  nightActivityScore: 72,
  placesOpenNearRoute: 14,
  longestStretchWithoutOpenHelpMeters: 320,
  longestLowActivityStretchMeters: 180,
  isMock: true,
  coordinates: [
    // Start — Indiranagar Metro Exit A
    { latitude: 12.9779, longitude: 77.6408 },
    // South on CMH Road
    { latitude: 12.9770, longitude: 77.6407 },
    { latitude: 12.9758, longitude: 77.6405 },
    // Turn east onto 100 Feet Road
    { latitude: 12.9750, longitude: 77.6408 },
    { latitude: 12.9742, longitude: 77.6412 },
    // Along 100 Feet Road (commercial stretch)
    { latitude: 12.9730, longitude: 77.6415 },
    { latitude: 12.9720, longitude: 77.6418 },
    { latitude: 12.9716, longitude: 77.6420 },
    // Past BDA Complex
    { latitude: 12.9710, longitude: 77.6422 },
    { latitude: 12.9705, longitude: 77.6425 },
    // Turn south-east into Defence Colony
    { latitude: 12.9698, longitude: 77.6430 },
    { latitude: 12.9690, longitude: 77.6435 },
    { latitude: 12.9682, longitude: 77.6440 },
    // Through Defence Colony main road
    { latitude: 12.9675, longitude: 77.6443 },
    { latitude: 12.9668, longitude: 77.6446 },
    // Final stretch — 12th Main Road
    { latitude: 12.9660, longitude: 77.6448 },
    { latitude: 12.9655, longitude: 77.6449 },
    // Destination
    { latitude: 12.9650, longitude: 77.6450 },
  ],
};

// ---------------------------------------------------------------------------
// Route B — "Fastest route"
// Via 12th Main direct cut through residential lanes.
// Shorter but fewer open businesses and help points at night.
// ---------------------------------------------------------------------------

const routeB: RouteOption = {
  id: 'route-b',
  label: 'Fastest route',
  distanceMeters: 2080,
  durationMinutes: 8,
  extraMinutes: 0,
  nightActivityScore: 45,
  placesOpenNearRoute: 6,
  longestStretchWithoutOpenHelpMeters: 780,
  longestLowActivityStretchMeters: 520,
  isMock: true,
  coordinates: [
    // Start — Indiranagar Metro Exit A
    { latitude: 12.9779, longitude: 77.6408 },
    // South on CMH Road briefly
    { latitude: 12.9770, longitude: 77.6407 },
    // Cut east onto 6th Cross
    { latitude: 12.9765, longitude: 77.6415 },
    { latitude: 12.9758, longitude: 77.6422 },
    // South through residential 1st Stage lanes
    { latitude: 12.9748, longitude: 77.6428 },
    { latitude: 12.9738, longitude: 77.6432 },
    // Continue south through quiet lanes
    { latitude: 12.9725, longitude: 77.6436 },
    { latitude: 12.9712, longitude: 77.6440 },
    // Into HAL 2nd Stage residential area
    { latitude: 12.9700, longitude: 77.6443 },
    { latitude: 12.9688, longitude: 77.6446 },
    { latitude: 12.9675, longitude: 77.6448 },
    // Final approach
    { latitude: 12.9662, longitude: 77.6449 },
    // Destination
    { latitude: 12.9650, longitude: 77.6450 },
  ],
};

// ---------------------------------------------------------------------------
// Route C — "Balanced"
// Via 100 Feet Road → 12th Main → HAL 2nd Stage.
// Middle ground between activity coverage and travel time.
// ---------------------------------------------------------------------------

const routeC: RouteOption = {
  id: 'route-c',
  label: 'Balanced',
  distanceMeters: 2400,
  durationMinutes: 10,
  extraMinutes: 2,
  nightActivityScore: 62,
  placesOpenNearRoute: 10,
  longestStretchWithoutOpenHelpMeters: 480,
  longestLowActivityStretchMeters: 340,
  isMock: true,
  coordinates: [
    // Start — Indiranagar Metro Exit A
    { latitude: 12.9779, longitude: 77.6408 },
    // South on CMH Road
    { latitude: 12.9770, longitude: 77.6407 },
    { latitude: 12.9758, longitude: 77.6405 },
    // West onto 100 Feet Road
    { latitude: 12.9748, longitude: 77.6403 },
    // Along 100 Feet Road (shorter stretch)
    { latitude: 12.9738, longitude: 77.6400 },
    { latitude: 12.9728, longitude: 77.6398 },
    // Turn south onto 12th Main
    { latitude: 12.9720, longitude: 77.6400 },
    { latitude: 12.9712, longitude: 77.6405 },
    { latitude: 12.9700, longitude: 77.6412 },
    // Continue 12th Main south
    { latitude: 12.9692, longitude: 77.6420 },
    { latitude: 12.9685, longitude: 77.6428 },
    // Merge onto HAL 2nd Stage main road
    { latitude: 12.9675, longitude: 77.6435 },
    { latitude: 12.9668, longitude: 77.6440 },
    { latitude: 12.9660, longitude: 77.6445 },
    // Destination
    { latitude: 12.9650, longitude: 77.6450 },
  ],
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** All demo route options, ordered by nightActivityScore descending. */
export const MOCK_ROUTES: RouteOption[] = [routeA, routeC, routeB];

/** Route colours for rendering on the map. */
export const ROUTE_COLORS: Record<string, string> = {
  'route-a': '#ff9400', // orange — primary / safest
  'route-b': '#F87171', // coral-red — fastest but less activity
  'route-c': '#38BDF8', // cyan — balanced
};

/** Get route colour by id, fallback to gray. */
export function getRouteColor(routeId: string): string {
  return ROUTE_COLORS[routeId] ?? '#6b7280';
}

