import type { Coordinate } from '@/types/geo';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Converts degrees to radians.
 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculates great-circle distance between two GPS coordinates in meters using Haversine formula.
 */
export function computeHaversineDistanceMeters(coord1: Coordinate, coord2: Coordinate): number {
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates perpendicular distance in meters from point P to line segment AB.
 */
export function distanceToSegmentMeters(
  point: Coordinate,
  segA: Coordinate,
  segB: Coordinate,
): number {
  const dX = segB.longitude - segA.longitude;
  const dY = segB.latitude - segA.latitude;

  if (dX === 0 && dY === 0) {
    return computeHaversineDistanceMeters(point, segA);
  }

  // Equirectangular projection factor for longitude at this latitude
  const latFactor = Math.cos(toRad((segA.latitude + segB.latitude) / 2));
  const px = (point.longitude - segA.longitude) * latFactor;
  const py = point.latitude - segA.latitude;
  const sx = dX * latFactor;
  const sy = dY;

  // Project point onto segment: t in [0, 1]
  const segmentLengthSq = sx * sx + sy * sy;
  let t = (px * sx + py * sy) / segmentLengthSq;
  t = Math.max(0, Math.min(1, t));

  // Closest point on segment
  const closestCoord: Coordinate = {
    latitude: segA.latitude + t * dY,
    longitude: segA.longitude + t * dX,
  };

  return computeHaversineDistanceMeters(point, closestCoord);
}

/**
 * Calculates minimum distance in meters from a user's coordinate to a polyline path.
 */
export function minDistanceToPolylineMeters(
  point: Coordinate,
  polyline: Coordinate[],
): number {
  if (!polyline || polyline.length === 0) return 0;
  if (polyline.length === 1) return computeHaversineDistanceMeters(point, polyline[0]);

  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = distanceToSegmentMeters(point, polyline[i], polyline[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

/**
 * Checks whether user has veered off the planned route corridor beyond the threshold (default 200m).
 */
export function isUserOffRoute(
  point: Coordinate,
  polyline: Coordinate[],
  thresholdMeters: number = 200,
): { isOff: boolean; distanceMeters: number } {
  const dist = minDistanceToPolylineMeters(point, polyline);
  return {
    isOff: dist > thresholdMeters,
    distanceMeters: Math.round(dist),
  };
}

/**
 * Checks whether the user has reached within arrival proximity (default 50m) of destination.
 */
export function isUserAtDestination(
  point: Coordinate,
  destination: Coordinate,
  thresholdMeters: number = 50,
): boolean {
  const dist = computeHaversineDistanceMeters(point, destination);
  return dist <= thresholdMeters;
}
