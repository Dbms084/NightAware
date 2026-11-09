/**
 * Night Activity Score calculator.
 *
 * Computes a 0–100 score based on real nearby place data.
 * This is an ACTIVITY proxy, NOT a safety guarantee.
 *
 * Factors:
 * - Density of places near the route
 * - Count of places likely open at journey time
 * - Presence of help points (hospitals, police, help_point)
 * - Longest stretch without an open help point
 */

import type { Coordinate, Place, PlaceCategory } from '@/types/geo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const HELP_CATEGORIES: PlaceCategory[] = ['hospital', 'police', 'help_point', 'pharmacy'];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type ActivityScoreResult = {
  /** 0–100 score. Higher = more nearby activity. */
  score: number;
  /** Number of places open near route */
  openPlacesCount: number;
  /** Total places near route */
  totalPlacesCount: number;
  /** Longest gap (metres) between open help points along the route */
  longestStretchWithoutHelpMeters: number;
  /** Whether this is computed from real data */
  isReal: boolean;
};

/**
 * Compute Night Activity Score from nearby places.
 */
export function computeActivityScore(
  routeCoordinates: Coordinate[],
  nearbyPlaces: Place[],
): ActivityScoreResult {
  const totalPlaces = nearbyPlaces.length;
  const openPlaces = nearbyPlaces.filter((p) => p.openAtJourneyTime === true);
  const openHelpPlaces = openPlaces.filter((p) =>
    HELP_CATEGORIES.includes(p.category),
  );

  // Factor 1: Place density (0–35 points)
  // 20+ places = full score, fewer = proportional
  const densityScore = Math.min(35, (totalPlaces / 20) * 35);

  // Factor 2: Open places ratio (0–30 points)
  const openRatio = totalPlaces > 0 ? openPlaces.length / totalPlaces : 0;
  const openScore = openRatio * 30;

  // Factor 3: Help point coverage (0–20 points)
  const helpScore = Math.min(20, openHelpPlaces.length * 5);

  // Factor 4: Route coverage — longest stretch without help (0–15 points)
  const longestGap = computeLongestGapWithoutHelp(
    routeCoordinates,
    openHelpPlaces,
  );
  // 0m gap = 15 points, 2000m+ gap = 0 points
  const gapScore = Math.max(0, 15 - (longestGap / 2000) * 15);

  const score = Math.round(
    Math.min(100, densityScore + openScore + helpScore + gapScore),
  );

  const isReal = nearbyPlaces.some((p) => p.dataSource === 'provider');

  return {
    score,
    openPlacesCount: openPlaces.length,
    totalPlacesCount: totalPlaces,
    longestStretchWithoutHelpMeters: Math.round(longestGap),
    isReal,
  };
}

/**
 * Compute the longest stretch (in metres) along a route without
 * any open help point within 300m.
 */
function computeLongestGapWithoutHelp(
  route: Coordinate[],
  openHelpPlaces: Place[],
): number {
  if (route.length < 2) return 0;
  if (openHelpPlaces.length === 0) {
    // Total route length
    let total = 0;
    for (let i = 1; i < route.length; i++) {
      total += distanceMeters(route[i - 1], route[i]);
    }
    return total;
  }

  let longestGap = 0;
  let currentGap = 0;

  for (let i = 0; i < route.length; i++) {
    const nearHelp = openHelpPlaces.some(
      (p) => distanceMeters(route[i], p.coordinate) <= 300,
    );

    if (nearHelp) {
      longestGap = Math.max(longestGap, currentGap);
      currentGap = 0;
    } else if (i > 0) {
      currentGap += distanceMeters(route[i - 1], route[i]);
    }
  }

  return Math.max(longestGap, currentGap);
}

