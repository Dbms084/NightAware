/**
 * Mock route options between Indiranagar Metro (Exit A) and 12th Main Road.
 * Formatted with full Night Activity Score indicators and heatmap segments.
 */

import type { RouteOption, RouteHeatmapSegment } from '@/types/geo';
import { MOCK_PLACES } from './mock-places';

// ---------------------------------------------------------------------------
// Route A — "Safer profile" (via 100 Feet Road & BDA Complex)
// ---------------------------------------------------------------------------

const coordsA = [
  { latitude: 12.9779, longitude: 77.6408 },
  { latitude: 12.9770, longitude: 77.6407 },
  { latitude: 12.9758, longitude: 77.6405 },
  { latitude: 12.9750, longitude: 77.6408 },
  { latitude: 12.9742, longitude: 77.6412 },
  { latitude: 12.9730, longitude: 77.6415 },
  { latitude: 12.9720, longitude: 77.6418 },
  { latitude: 12.9716, longitude: 77.6420 },
  { latitude: 12.9710, longitude: 77.6422 },
  { latitude: 12.9705, longitude: 77.6425 },
  { latitude: 12.9698, longitude: 77.6430 },
  { latitude: 12.9690, longitude: 77.6435 },
  { latitude: 12.9682, longitude: 77.6440 },
  { latitude: 12.9675, longitude: 77.6443 },
  { latitude: 12.9668, longitude: 77.6446 },
  { latitude: 12.9660, longitude: 77.6448 },
  { latitude: 12.9655, longitude: 77.6449 },
  { latitude: 12.9650, longitude: 77.6450 },
];

const heatmapsA: RouteHeatmapSegment[] = [
  { startIndex: 0, endIndex: 4, coordinates: coordsA.slice(0, 5), activityScore: 88, color: '#4ADE80', nearbyOpenCount: 4, isIsolated: false },
  { startIndex: 4, endIndex: 8, coordinates: coordsA.slice(4, 9), activityScore: 84, color: '#4ADE80', nearbyOpenCount: 5, isIsolated: false },
  { startIndex: 8, endIndex: 12, coordinates: coordsA.slice(8, 13), activityScore: 78, color: '#4ADE80', nearbyOpenCount: 3, isIsolated: false },
  { startIndex: 12, endIndex: 17, coordinates: coordsA.slice(12, 18), activityScore: 72, color: '#FACC15', nearbyOpenCount: 2, isIsolated: false },
];

const routeA: RouteOption = {
  id: 'route-a',
  label: 'Safer profile',
  profileType: 'safest',
  distanceMeters: 1800,
  durationMinutes: 24,
  extraMinutes: 6,
  nightActivityScore: 82,
  scoreBreakdown: {
    openShopsScore: 17,
    openingHoursScore: 13,
    essentialServicesScore: 9,
    activityContinuityScore: 14,
    mainRoadScore: 9,
    helpPointsScore: 8,
    streetLightingScore: 8,
    cctvScore: 4,
    publicTransportScore: 5,
    total: 82,
  },
  routeEvidence: '12 open places · longest quiet stretch 90 m',
  longestQuietStretchMeters: 90,
  mainRoadPercentage: 88,
  lightingCoveragePercentage: 85,
  establishments: MOCK_PLACES.slice(0, 14),
  placesOpenNearRoute: 12,
  closedPlacesCount: 2,
  twentyFourSevenCount: 4,
  pharmaciesCount: 3,
  petrolPumpsCount: 1,
  policeCount: 1,
  hospitalsCount: 2,
  publicTransportCount: 2,
  cctvCount: 3,
  heatmapSegments: heatmapsA,
  coordinates: coordsA,
  isMock: true,
};

// ---------------------------------------------------------------------------
// Route C — "Balanced" (100 Feet Road → 12th Main)
// ---------------------------------------------------------------------------

const coordsC = [
  { latitude: 12.9779, longitude: 77.6408 },
  { latitude: 12.9770, longitude: 77.6407 },
  { latitude: 12.9758, longitude: 77.6405 },
  { latitude: 12.9748, longitude: 77.6403 },
  { latitude: 12.9738, longitude: 77.6400 },
  { latitude: 12.9728, longitude: 77.6398 },
  { latitude: 12.9720, longitude: 77.6400 },
  { latitude: 12.9712, longitude: 77.6405 },
  { latitude: 12.9700, longitude: 77.6412 },
  { latitude: 12.9692, longitude: 77.6420 },
  { latitude: 12.9685, longitude: 77.6428 },
  { latitude: 12.9675, longitude: 77.6435 },
  { latitude: 12.9668, longitude: 77.6440 },
  { latitude: 12.9660, longitude: 77.6445 },
  { latitude: 12.9650, longitude: 77.6450 },
];

const heatmapsC: RouteHeatmapSegment[] = [
  { startIndex: 0, endIndex: 4, coordinates: coordsC.slice(0, 5), activityScore: 82, color: '#4ADE80', nearbyOpenCount: 3, isIsolated: false },
  { startIndex: 4, endIndex: 8, coordinates: coordsC.slice(4, 9), activityScore: 68, color: '#FACC15', nearbyOpenCount: 2, isIsolated: false },
  { startIndex: 8, endIndex: 11, coordinates: coordsC.slice(8, 12), activityScore: 62, color: '#FACC15', nearbyOpenCount: 2, isIsolated: false },
  { startIndex: 11, endIndex: 14, coordinates: coordsC.slice(11, 15), activityScore: 55, color: '#FF9400', nearbyOpenCount: 1, isIsolated: false },
];

const routeC: RouteOption = {
  id: 'route-c',
  label: 'Balanced',
  profileType: 'balanced',
  distanceMeters: 1600,
  durationMinutes: 21,
  extraMinutes: 3,
  nightActivityScore: 70,
  scoreBreakdown: {
    openShopsScore: 14,
    openingHoursScore: 11,
    essentialServicesScore: 7,
    activityContinuityScore: 11,
    mainRoadScore: 7,
    helpPointsScore: 6,
    streetLightingScore: 6,
    cctvScore: 3,
    publicTransportScore: 4,
    total: 70,
  },
  routeEvidence: '8 open places · longest quiet stretch 210 m',
  longestQuietStretchMeters: 210,
  mainRoadPercentage: 72,
  lightingCoveragePercentage: 70,
  establishments: MOCK_PLACES.slice(0, 10),
  placesOpenNearRoute: 8,
  closedPlacesCount: 2,
  twentyFourSevenCount: 2,
  pharmaciesCount: 2,
  petrolPumpsCount: 1,
  policeCount: 1,
  hospitalsCount: 1,
  publicTransportCount: 1,
  cctvCount: 2,
  heatmapSegments: heatmapsC,
  coordinates: coordsC,
  isMock: true,
};

// ---------------------------------------------------------------------------
// Route B — "Fastest" (Direct cut through quiet residential lanes)
// ---------------------------------------------------------------------------

const coordsB = [
  { latitude: 12.9779, longitude: 77.6408 },
  { latitude: 12.9770, longitude: 77.6407 },
  { latitude: 12.9765, longitude: 77.6415 },
  { latitude: 12.9758, longitude: 77.6422 },
  { latitude: 12.9748, longitude: 77.6428 },
  { latitude: 12.9738, longitude: 77.6432 },
  { latitude: 12.9725, longitude: 77.6436 },
  { latitude: 12.9712, longitude: 77.6440 },
  { latitude: 12.9700, longitude: 77.6443 },
  { latitude: 12.9688, longitude: 77.6446 },
  { latitude: 12.9675, longitude: 77.6448 },
  { latitude: 12.9662, longitude: 77.6449 },
  { latitude: 12.9650, longitude: 77.6450 },
];

const heatmapsB: RouteHeatmapSegment[] = [
  { startIndex: 0, endIndex: 3, coordinates: coordsB.slice(0, 4), activityScore: 75, color: '#4ADE80', nearbyOpenCount: 2, isIsolated: false },
  { startIndex: 3, endIndex: 6, coordinates: coordsB.slice(3, 7), activityScore: 42, color: '#FF9400', nearbyOpenCount: 1, isIsolated: false },
  { startIndex: 6, endIndex: 10, coordinates: coordsB.slice(6, 11), activityScore: 22, color: '#F87171', nearbyOpenCount: 0, isIsolated: true },
  { startIndex: 10, endIndex: 12, coordinates: coordsB.slice(10, 13), activityScore: 50, color: '#FACC15', nearbyOpenCount: 1, isIsolated: false },
];

const routeB: RouteOption = {
  id: 'route-b',
  label: 'Fastest',
  profileType: 'fastest',
  distanceMeters: 1400,
  durationMinutes: 18,
  extraMinutes: 0,
  nightActivityScore: 54,
  scoreBreakdown: {
    openShopsScore: 9,
    openingHoursScore: 8,
    essentialServicesScore: 5,
    activityContinuityScore: 6,
    mainRoadScore: 5,
    helpPointsScore: 4,
    streetLightingScore: 5,
    cctvScore: 2,
    publicTransportScore: 3,
    total: 54,
  },
  routeEvidence: '5 open places · 420 m isolated stretch',
  longestQuietStretchMeters: 420,
  mainRoadPercentage: 42,
  lightingCoveragePercentage: 45,
  establishments: MOCK_PLACES.slice(0, 6),
  placesOpenNearRoute: 5,
  closedPlacesCount: 1,
  twentyFourSevenCount: 1,
  pharmaciesCount: 1,
  petrolPumpsCount: 0,
  policeCount: 0,
  hospitalsCount: 1,
  publicTransportCount: 1,
  cctvCount: 1,
  heatmapSegments: heatmapsB,
  coordinates: coordsB,
  isMock: true,
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** All demo route options, ordered: Safest, Balanced, Fastest */
export const MOCK_ROUTES: RouteOption[] = [routeA, routeC, routeB];

/** Route colours matching Figma specs */
export const ROUTE_COLORS: Record<string, string> = {
  'route-a': '#ff8a00', // orange — safest
  'route-c': '#38bdf8', // cyan — balanced
  'route-b': '#f87171', // coral-red — fastest
};

export function getRouteColor(routeId: string): string {
  return ROUTE_COLORS[routeId] ?? '#ff8a00';
}
