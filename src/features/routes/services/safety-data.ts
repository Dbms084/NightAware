/**
 * Safety data service — abstracts safety zone and CCTV data access.
 *
 * Currently backed by mock data. Member 4 (AI Safety Prediction) will
 * implement real ML-based scoring behind this same interface.
 */

import type { Coordinate, MapRegion, Place } from '@/types/geo';
import type { SafetyZone } from '@/types/geo';
import { MOCK_SAFETY_ZONES } from '@/data/mock-safety-zones';
import { MOCK_PLACES } from '@/data/mock-places';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get safety zones visible in a map region.
 */
export async function getSafetyZones(region: MapRegion): Promise<SafetyZone[]> {
  return MOCK_SAFETY_ZONES.filter((zone) =>
    isInRegion(zone.coordinate, region),
  );
}

/**
 * Get all safety zones (unfiltered).
 */
export async function getAllSafetyZones(): Promise<SafetyZone[]> {
  return MOCK_SAFETY_ZONES;
}

/**
 * Get CCTV camera locations visible in a map region.
 */
export async function getCCTVLocations(region: MapRegion): Promise<Place[]> {
  return MOCK_PLACES.filter(
    (place) =>
      place.category === 'cctv' && isInRegion(place.coordinate, region),
  );
}

/**
 * Get all CCTV locations (unfiltered).
 */
export async function getAllCCTVLocations(): Promise<Place[]> {
  return MOCK_PLACES.filter((place) => place.category === 'cctv');
}

/**
 * Estimate area activity score around a coordinate.
 *
 * Mock implementation: finds overlapping safety zones and averages
 * their risk levels as a 0–100 score.
 * Real implementation (Member 4) will use ML predictions.
 */
export async function getAreaActivityScore(
  coordinate: Coordinate,
  radiusMeters: number = 300,
): Promise<number | null> {
  const riskScores: Record<string, number> = {
    low: 80,    // high activity
    medium: 50,
    high: 20,   // low activity
  };

  const overlapping = MOCK_SAFETY_ZONES.filter(
    (zone) => distanceMeters(coordinate, zone.coordinate) <= radiusMeters + zone.radiusMeters,
  );

  if (overlapping.length === 0) return null;

  const total = overlapping.reduce(
    (sum, zone) => sum + riskScores[zone.riskLevel],
    0,
  );
  return Math.round(total / overlapping.length);
}

