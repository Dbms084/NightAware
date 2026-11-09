import Mapbox from '@rnmapbox/maps';
import Navigation from '@rnmapbox/navigation';
import type { Route, RouteRequestOptions } from '@rnmapbox/navigation';

import type { Coordinate, PlaceSelection, RouteOption } from './types';

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
const SEARCH_BASE = 'https://api.mapbox.com/search/searchbox/v1';

type JsonRecord = Record<string, unknown>;
type SearchFeature = { geometry?: JsonRecord; properties?: JsonRecord };

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null ? value as JsonRecord : null;
}

function getCoordinates(value: unknown): Coordinate | null {
  if (!Array.isArray(value) || value.length < 2 || typeof value[0] !== 'number' || typeof value[1] !== 'number') return null;
  return [value[0], value[1]];
}

function requireToken() {
  if (!TOKEN) throw new Error('Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env file to use live search and routes.');
  return TOKEN;
}

export async function configureMapbox() {
  const token = requireToken();
  await Mapbox.setAccessToken(token);
  Navigation.setAccessToken(token);
}

async function requestJson(url: string, signal?: AbortSignal): Promise<JsonRecord> {
  const response = await fetch(url, { signal });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message = asRecord(body)?.message;
    throw new Error(typeof message === 'string' ? message : `Mapbox request failed (${response.status}).`);
  }
  const result = asRecord(body);
  if (!result) throw new Error('Mapbox returned an invalid response.');
  return result;
}

export async function searchLocations(query: string, proximity?: Coordinate, signal?: AbortSignal): Promise<PlaceSelection[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const token = requireToken();
  const url = new URL(`${SEARCH_BASE}/forward`);
  url.searchParams.set('q', trimmed.slice(0, 256));
  url.searchParams.set('limit', '5');
  url.searchParams.set('language', 'en');
  url.searchParams.set('types', 'poi,address,street,place');
  url.searchParams.set('access_token', token);
  if (proximity) url.searchParams.set('proximity', `${proximity[0]},${proximity[1]}`);
  const body = await requestJson(url.toString(), signal);
  const features = Array.isArray(body.features) ? body.features as SearchFeature[] : [];

  return features.flatMap((feature, index) => {
    const properties = asRecord(feature.properties);
    const geometry = asRecord(feature.geometry);
    const coordinate = getCoordinates(geometry?.coordinates);
    if (!coordinate) return [];
    const name = typeof properties?.name === 'string' ? properties.name : 'Unnamed result';
    const address = typeof properties?.full_address === 'string' ? properties.full_address : '';
    const id = typeof properties?.mapbox_id === 'string' ? properties.mapbox_id : `${name}-${index}`;
    return [{ id, label: address && address !== name ? `${name}, ${address}` : name, coordinate }];
  });
}

function distanceMeters(a: Coordinate, b: Coordinate) {
  const radians = Math.PI / 180;
  const lat1 = a[1] * radians;
  const lat2 = b[1] * radians;
  const dLat = (b[1] - a[1]) * radians;
  const dLon = (b[0] - a[0]) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function projectOnSegment(point: Coordinate, start: Coordinate, end: Coordinate) {
  const meanLat = ((start[1] + end[1] + point[1]) / 3) * Math.PI / 180;
  const xScale = 111_320 * Math.cos(meanLat);
  const yScale = 110_540;
  const px = (point[0] - start[0]) * xScale;
  const py = (point[1] - start[1]) * yScale;
  const dx = (end[0] - start[0]) * xScale;
  const dy = (end[1] - start[1]) * yScale;
  const squared = dx * dx + dy * dy;
  const fraction = squared === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / squared));
  return { fraction, distance: Math.hypot(px - fraction * dx, py - fraction * dy) };
}

function segmentIndex(route: Route, point: Coordinate): number | null {
  const coordinates = route.geometry.coordinates;
  if (coordinates.length < 2) return null;
  const segmentLengths = coordinates.slice(1).map((coordinate, index) => distanceMeters(coordinates[index], coordinate));
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);
  if (totalLength === 0) return null;
  let cumulative = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  let closestProgress = 0;
  segmentLengths.forEach((length, index) => {
    const projected = projectOnSegment(point, coordinates[index], coordinates[index + 1]);
    if (projected.distance < closestDistance) {
      closestDistance = projected.distance;
      closestProgress = (cumulative + projected.fraction * length) / totalLength;
    }
    cumulative += length;
  });
  if (closestDistance > 150) return null;
  return Math.min(4, Math.floor(closestProgress * 5));
}

function encodePolyline(coordinates: Coordinate[]) {
  let previousLatitude = 0;
  let previousLongitude = 0;
  let encoded = '';
  const encodeValue = (value: number) => {
    let current = value < 0 ? ~(value << 1) : value << 1;
    while (current >= 0x20) {
      encoded += String.fromCharCode((0x20 | (current & 0x1f)) + 63);
      current >>= 5;
    }
    encoded += String.fromCharCode(current + 63);
  };
  coordinates.forEach(([longitude, latitude]) => {
    const roundedLatitude = Math.round(latitude * 1e5);
    const roundedLongitude = Math.round(longitude * 1e5);
    encodeValue(roundedLatitude - previousLatitude);
    encodeValue(roundedLongitude - previousLongitude);
    previousLatitude = roundedLatitude;
    previousLongitude = roundedLongitude;
  });
  return encoded;
}

async function searchRouteShops(route: Route, signal?: AbortSignal): Promise<{ places: Coordinate[]; attribution: string; resultLimitReached: boolean }> {
  const url = new URL(`${SEARCH_BASE}/category/shopping`);
  url.searchParams.set('access_token', requireToken());
  url.searchParams.set('limit', '25');
  url.searchParams.set('language', 'en');
  url.searchParams.set('route', encodePolyline(route.geometry.coordinates));
  url.searchParams.set('route_geometry', 'polyline');
  url.searchParams.set('sar_type', 'isochrone');
  url.searchParams.set('time_deviation', '5');
  const body = await requestJson(url.toString(), signal);
  const features = Array.isArray(body.features) ? body.features as SearchFeature[] : [];
  const places = features.flatMap((feature) => {
    const geometry = asRecord(feature.geometry);
    const coordinate = getCoordinates(geometry?.coordinates);
    return coordinate ? [coordinate] : [];
  });
  return {
    places,
    attribution: typeof body.attribution === 'string' ? body.attribution : '© Mapbox and its suppliers',
    resultLimitReached: features.length === 25,
  };
}

function calculateScore(segmentCounts: number[], maxCount: number, hasAnyShops: boolean) {
  if (!hasAnyShops || maxCount === 0) return null;
  const coveredSegments = segmentCounts.filter((count) => count > 0).length;
  const coverageComponent = coveredSegments / 5;
  const countComponent = Math.min(1, segmentCounts.reduce((sum, count) => sum + count, 0) / maxCount);
  return Math.round((coverageComponent * 0.7 + countComponent * 0.3) * 100);
}

export type RouteSearchResult = { routes: RouteOption[]; poiError: string | null; attribution: string };

export async function getRouteOptions(
  origin: PlaceSelection,
  destination: PlaceSelection,
  mode: 'driving' | 'walking',
  signal?: AbortSignal,
): Promise<RouteSearchResult> {
  await configureMapbox();
  const options: RouteRequestOptions = {
    waypoints: [origin.coordinate, destination.coordinate],
    profile: mode === 'walking' ? 'walking' : 'driving-traffic',
    alternatives: true,
    units: 'metric',
    language: 'en',
  };
  const response = await Navigation.requestRoutes(options);
  const nativeRoutes = [response.main, ...response.alternatives];
  try {
    const shopResults = await Promise.allSettled(nativeRoutes.map((route) => searchRouteShops(route, signal)));
    const allAvailable = shopResults.every((result) => result.status === 'fulfilled');
    const resultLimitReached = shopResults.some((result) => result.status === 'fulfilled' && result.value.resultLimitReached);
    const counts = shopResults.map((result, routeIndex) => {
      const segments = [0, 0, 0, 0, 0];
      if (result.status === 'fulfilled') {
        result.value.places.forEach((place) => {
          const index = segmentIndex(nativeRoutes[routeIndex], place);
          if (index !== null) segments[index] += 1;
        });
      }
      return segments;
    });
    const anyShops = counts.some((segments) => segments.some((count) => count > 0));
    const maxCount = Math.max(0, ...counts.map((segments) => segments.reduce((sum, count) => sum + count, 0)));
    const minDuration = Math.min(...nativeRoutes.map((route) => route.expectedTravelTime));
    const scoresAvailable = allAvailable && !resultLimitReached && anyShops;
    const maxScore = scoresAvailable ? Math.max(...counts.map((segments) => calculateScore(segments, maxCount, anyShops) ?? 0)) : null;
    const routes = nativeRoutes.map((route, index): RouteOption => {
      const shopCount = allAvailable ? counts[index].reduce((sum, count) => sum + count, 0) : null;
      const score = scoresAvailable ? calculateScore(counts[index], maxCount, anyShops) : null;
      const isFastest = route.expectedTravelTime === minDuration;
      const hasMoreNearbyActivity = score !== null && score === maxScore;
      const label = isFastest && hasMoreNearbyActivity
        ? 'Fastest · More nearby activity'
        : isFastest
          ? 'Fastest'
          : hasMoreNearbyActivity
            ? 'More nearby activity'
            : 'Alternate';
      return {
        id: `route-${index}`,
        label,
        route,
        shopCount,
        shopsBySegment: allAvailable ? counts[index] : null,
        nightActivityScore: score,
        shopDataCapped: resultLimitReached,
      };
    });
    const poiError = !allAvailable
      ? 'Shop data could not be loaded for every route. Route times are available, but scores are unavailable.'
      : resultLimitReached
        ? 'Mapbox returned its maximum of 25 shop results for at least one route. Counts may be incomplete, so scores are unavailable.'
        : anyShops
          ? null
          : 'No shop data was returned near these routes, so the activity score is unavailable.';
    const attribution = shopResults.find((result) => result.status === 'fulfilled');
    return { routes, poiError, attribution: attribution?.status === 'fulfilled' ? attribution.value.attribution : '© Mapbox and its suppliers' };
  } catch (error) {
    nativeRoutes.forEach((route) => route.release());
    throw error;
  }
}
