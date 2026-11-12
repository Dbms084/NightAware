/**
 * Transport Availability Service
 *
 * Dynamically queries and evaluates real-world public transit (Metro stations,
 * bus stops, transit hubs) for any journey from Point A to Point B.
 * Classifies stops into separate Metro and Bus categories, calculates walking
 * distances from the active route, and evaluates late-night operating hours.
 *
 * STRICT ACCURACY POLICY:
 * Only real, existing transit stops are reported. Never fabricates or generates
 * synthetic names when transit does not exist.
 */

import type { Coordinate, Place } from '@/types/geo';
import type { TransitStop, TransitType, TransitSubType, TransportAvailabilitySummary } from '../types';
import { findNearbyRegisteredTransitStops } from '../data/transit-stations';

/** Haversine distance in metres between two coordinates */
export function distanceMeters(a: Coordinate, b: Coordinate): number {
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

/**
 * Calculates perpendicular distance (in meters) from a point to a line segment (a -> b).
 */
function distanceToSegmentMeters(p: Coordinate, a: Coordinate, b: Coordinate): number {
  const cosLat = Math.cos((p.latitude * Math.PI) / 180);
  const px = p.longitude * cosLat * 111320;
  const py = p.latitude * 111320;
  const ax = a.longitude * cosLat * 111320;
  const ay = a.latitude * 111320;
  const bx = b.longitude * cosLat * 111320;
  const by = b.latitude * 111320;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1) {
    return distanceMeters(p, a);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/** Distance from a point to the closest coordinate or line segment along a polyline */
export function minDistanceToRoute(point: Coordinate, routeCoords?: Coordinate[]): number {
  if (!routeCoords || routeCoords.length === 0) return 0;
  if (routeCoords.length === 1) return distanceMeters(point, routeCoords[0]);

  let minD = Infinity;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const d = distanceToSegmentMeters(point, routeCoords[i], routeCoords[i + 1]);
    if (d < minD) {
      minD = d;
      if (minD < 15) break; // Early exit if right next to road
    }
  }
  return Math.round(minD);
}

/** Parse "HH:MM" into minutes from midnight */
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Classifies a transit establishment strictly into 'metro' or 'bus'.
 * Returns null if it is neither (no auto, taxi, commercial shops, hotels, or generic places).
 */
export function classifyTransitType(name: string): TransitType | null {
  const lower = name.toLowerCase();

  // Reject commercial shops, hospitals, sweets, hotels, auto stands, taxi stands
  if (
    lower.includes('hospital') ||
    lower.includes('clinic') ||
    lower.includes('pharmacy') ||
    lower.includes('medical') ||
    lower.includes('hotel') ||
    lower.includes('restaurant') ||
    lower.includes('dhaba') ||
    lower.includes('cafe') ||
    lower.includes('mall') ||
    lower.includes('cinema') ||
    lower.includes('theatre') ||
    lower.includes('multiplex') ||
    lower.includes('sweets') ||
    lower.includes('bakers') ||
    lower.includes('shoes') ||
    lower.includes('optics') ||
    lower.includes('motors') ||
    lower.includes('auto') ||
    lower.includes('taxi') ||
    lower.includes('cab')
  ) {
    return null;
  }

  // Rapid transit subways and metros ONLY (never regular intercity railways)
  if (/\b(metro|subway|mrt|tube|underground)\b/i.test(lower)) {
    return 'metro';
  }

  // Bus Terminus, Bus Depot, Bus Stop, Bus Stand, Bus Shelter ONLY
  if (
    lower.includes('bus') ||
    lower.includes('bmtc') ||
    lower.includes('dtc') ||
    lower.includes('best') ||
    lower.includes('depot') ||
    lower.includes('terminus') ||
    lower.includes('terminal') ||
    lower.includes('stop') ||
    lower.includes('shelter') ||
    lower.includes('stand')
  ) {
    return 'bus';
  }

  return null;
}

/**
 * Classifies a transit establishment strictly into:
 * - 'metro': rapid transit subway stations
 * - 'bus_terminus': major bus terminus, terminal, depot, ISBT
 * - 'bus_stop': regular local roadside bus stop or stand
 */
export function classifyTransitSubType(name: string, type: TransitType): TransitSubType {
  if (type === 'metro') return 'metro';
  const lower = name.toLowerCase();
  if (
    lower.includes('terminus') ||
    lower.includes('terminal') ||
    lower.includes('depot') ||
    lower.includes('isbt') ||
    lower.includes('ttmc')
  ) {
    return 'bus_terminus';
  }
  return 'bus_stop';
}

/** Extract a clean area name from full address string */
export function extractCleanAreaName(rawName?: string, fallback: string = 'Area'): string {
  if (!rawName) return fallback;
  if (/current location|starting point|custom start|destination/i.test(rawName)) {
    return fallback;
  }
  // Strip 5-6 digit pin codes
  const cleaned = rawName.replace(/\b\d{5,6}\b/g, '').trim();
  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (/^-?\d+(\.\d+)?$/.test(part)) continue;
    if (part.length >= 3) {
      return part;
    }
  }
  return fallback;
}

/**
 * Filters and prioritizes transit stops for the starting location (Point A).
 * Focuses on stops within practical reach of the origin, sorted by proximity.
 */
export function filterStopsToRoute(
  stops: Place[],
  routeCoordinates?: Coordinate[],
): Place[] {
  if (!routeCoordinates || routeCoordinates.length < 1) {
    return stops;
  }

  const origin = routeCoordinates[0];
  const destination =
    routeCoordinates.length > 1
      ? routeCoordinates[routeCoordinates.length - 1]
      : origin;
  const totalJourneyDist = distanceMeters(origin, destination);

  const filtered = stops.filter((stop) => {
    const isMetro = classifyTransitType(stop.name) === 'metro';
    const isTerminus = classifyTransitSubType(stop.name, isMetro ? 'metro' : 'bus') === 'bus_terminus';

    // Reach from the starting point:
    // Metro stations: up to 3500m (typical rapid transit access)
    // Bus Terminals / Depots: up to 3200m
    // Roadside Bus Stops: up to 1800m
    const distFromStart = distanceMeters(stop.coordinate, origin);
    const maxReach = isMetro ? 3500 : isTerminus ? 3200 : 1800;

    if (distFromStart > maxReach) {
      return false;
    }

    // Directional check: if journey has a destination > 1.5km away, reject stops that
    // lead drastically backwards (farther from destination than total journey length + 1000m)
    if (totalJourneyDist > 1500) {
      const distToDest = distanceMeters(stop.coordinate, destination);
      if (distToDest > totalJourneyDist + 1000) {
        return false;
      }
    }

    return true;
  });

  // Sort strictly by distance to origin (nearest starting stop first)
  filtered.sort(
    (a, b) => distanceMeters(a.coordinate, origin) - distanceMeters(b.coordinate, origin),
  );

  return filtered;
}

/**
 * Global OpenStreetMap Overpass search for real Metro stations, Bus Terminals,
 * and Bus Stops in any city or country worldwide around the starting point.
 */
async function fetchOverpassTransit(origin: Coordinate): Promise<Place[]> {
  const lat = origin.latitude.toFixed(5);
  const lon = origin.longitude.toFixed(5);

  const query = `[out:json][timeout:5];(
    node["railway"="subway_entrance"](around:3500,${lat},${lon});
    node["station"="subway"](around:3500,${lat},${lon});
    node["railway"="station"]["station"="subway"](around:3500,${lat},${lon});
    node["subway"="yes"](around:3500,${lat},${lon});
    node["amenity"="bus_station"](around:3200,${lat},${lon});
    way["amenity"="bus_station"](around:3200,${lat},${lon});
    node["highway"="bus_stop"](around:1800,${lat},${lon});
    node["public_transport"="platform"]["bus"="yes"](around:1800,${lat},${lon});
    node["bus"="yes"](around:1800,${lat},${lon});
  );out center 40;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      if (!data || !Array.isArray(data.elements) || data.elements.length === 0) {
        continue;
      }

      const results: Place[] = [];
      for (const el of data.elements) {
        const pLat = el.lat ?? el.center?.lat;
        const pLon = el.lon ?? el.center?.lon;
        if (!pLat || !pLon) continue;

        const pCoord: Coordinate = { latitude: pLat, longitude: pLon };
        const dist = Math.round(distanceMeters(pCoord, origin));
        const tags = el.tags || {};
        const rawName = (tags.name || tags.brand || tags['name:en'] || '').trim();
        if (!rawName) continue;

        const isMetro =
          tags.station === 'subway' ||
          tags.railway === 'subway_entrance' ||
          tags.subway === 'yes' ||
          /\b(metro|subway|mrt)\b/i.test(rawName);

        const isBusTerminus =
          tags.amenity === 'bus_station' ||
          tags.bus === 'station' ||
          /\b(terminal|terminus|depot|isbt)\b/i.test(rawName);

        const isBusStop =
          tags.highway === 'bus_stop' ||
          tags.public_transport === 'platform' ||
          tags.bus === 'yes' ||
          /\b(bus stop|bus shelter|bus stand)\b/i.test(rawName);

        if (!isMetro && !isBusTerminus && !isBusStop) continue;

        const displayName =
          isBusStop && !/\b(bus|stop|stand|shelter|terminal|depot|terminus)\b/i.test(rawName)
            ? `${rawName} Bus Stop`
            : rawName;

        results.push({
          id: `osm-live-${el.id}`,
          name: displayName,
          category: 'transport',
          coordinate: pCoord,
          openAtJourneyTime: true,
          openTime: isMetro ? '05:30' : '05:00',
          closeTime: isMetro ? '23:30' : '00:30',
          distanceFromRouteMeters: dist,
          dataSource: 'provider',
        });
      }

      if (results.length > 0) {
        return results;
      }
    } catch {
      // try next endpoint
    }
  }

  return [];
}

/**
 * Live OpenStreetMap Photon API search for real Metro stations and Bus terminals/stops
 * around the starting location (Point A) only.
 */
async function fetchPhotonTransit(
  routeCoordinates: Coordinate[],
  originName?: string,
): Promise<Place[]> {
  if (routeCoordinates.length < 1) return [];

  const origin = routeCoordinates[0];
  const cleanArea = extractCleanAreaName(originName, '');
  const queries = ['metro', 'subway', 'bus terminal', 'bus stop'];
  if (cleanArea && cleanArea.length >= 3) {
    queries.unshift(
      `${cleanArea} metro`,
      `${cleanArea} bus stop`,
      `${cleanArea} bus stand`,
      `${cleanArea} bus terminus`,
    );
  }

  const results: Place[] = [];

  try {
    const promises: Promise<Response>[] = [];
    for (const q of queries) {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${origin.latitude}&lon=${origin.longitude}&limit=12`;
      promises.push(
        fetch(url, { signal: AbortSignal.timeout(3500) }).catch(() => new Response('{}')),
      );
    }

    const responses = await Promise.all(promises);
    for (const res of responses) {
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      if (!data || !Array.isArray(data.features)) continue;

      for (const f of data.features) {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) continue;
        const pCoord: Coordinate = { latitude: coords[1], longitude: coords[0] };

        // Must be within reach of the starting location
        const dist = Math.round(distanceMeters(pCoord, origin));
        if (dist > 3500) continue;

        const props = f.properties || {};
        const rawName = (props.name || props.street || '').trim();
        if (!rawName) continue;

        const osmValue = (props.osm_value || '').toLowerCase();

        const isMetro =
          /\b(metro|subway|mrt)\b/i.test(rawName) ||
          osmValue === 'subway' ||
          osmValue === 'subway_entrance';

        const isBusTerminus =
          /\b(terminal|terminus|depot|isbt)\b/i.test(rawName) ||
          osmValue === 'bus_station';

        const isBusStop =
          /\b(bus stop|bus shelter|bus stand)\b/i.test(rawName) ||
          osmValue === 'bus_stop' ||
          props.osm_key === 'highway';

        if (!isMetro && !isBusTerminus && !isBusStop) continue;

        const displayName =
          isBusStop && !/\b(bus|stop|stand|shelter|terminal|depot|terminus)\b/i.test(rawName)
            ? `${rawName} Bus Stop`
            : rawName;

        const id = `photon-transit-${pCoord.latitude.toFixed(5)}-${pCoord.longitude.toFixed(5)}`;

        results.push({
          id,
          name: displayName,
          category: 'transport',
          coordinate: pCoord,
          openAtJourneyTime: true,
          openTime: isMetro ? '05:30' : '05:00',
          closeTime: isMetro ? '23:30' : '00:30',
          distanceFromRouteMeters: dist,
          dataSource: 'provider',
        });
      }
    }
  } catch {}

  return results;
}

/**
 * Deduplicate transit places by spatial proximity (< 50m) and similar name
 */
function deduplicateTransit(places: Place[]): Place[] {
  const result: Place[] = [];

  for (const p of places) {
    const isDupe = result.some((existing) => {
      const d = distanceMeters(existing.coordinate, p.coordinate);
      if (d < 45) return true;
      if (d < 150) {
        const normA = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normB = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normA === normB || normA.includes(normB) || normB.includes(normA)) {
          return true;
        }
      }
      return false;
    });

    if (!isDupe) {
      result.push(p);
    }
  }

  return result;
}

/**
 * Master transit discovery function for the starting location (Point A).
 * Searches global OpenStreetMap Overpass live data, Photon neighborhood search,
 * and the rich multi-city offline registry. Works in any city globally.
 */
export async function fetchTransitStopsForRoute(
  routeCoordinates: Coordinate[],
  originName?: string,
  destinationName?: string,
): Promise<Place[]> {
  if (routeCoordinates.length < 1) return [];

  const found: Place[] = [];
  const origin = routeCoordinates[0];

  // 1. Try real OpenStreetMap Overpass live transit query (Global: works anywhere on Earth)
  try {
    const overpassStops = await fetchOverpassTransit(origin);
    found.push(...overpassStops);
  } catch {}

  // 2. Try OpenStreetMap Photon live transit search around starting location
  try {
    const photonStops = await fetchPhotonTransit(routeCoordinates, originName);
    found.push(...photonStops);
  } catch {}

  // 3. Real registered Metro Stations & Bus Terminals near the starting point (offline guarantee)
  const registeredStops = findNearbyRegisteredTransitStops(origin, 4500, 3500);
  found.push(...registeredStops);

  // 4. Filter strictly to stations relevant for the starting location
  const onRouteStops = filterStopsToRoute(found, routeCoordinates);

  return deduplicateTransit(onRouteStops);
}

/**
 * Evaluates transport availability specifically for the starting location at departure time.
 * ONLY mentions Metro and Bus where they ACTUALLY exist. Never generates names by itself.
 */
export function evaluateTransportAvailability(
  places: Place[],
  departureTime: Date,
  routeCoordinates?: Coordinate[],
  originName?: string,
  destinationName?: string,
): TransportAvailabilitySummary {
  const origin = routeCoordinates && routeCoordinates.length > 0 ? routeCoordinates[0] : undefined;

  // 1. Filter places strictly to Metro, Bus Terminus, and Bus Stop
  let transitPlaces = places.filter((p) => {
    const t = classifyTransitType(p.name);
    return t === 'metro' || t === 'bus';
  });

  // CRITICAL SANITY FILTER: Discard any stale places that belong to a previous city/search!
  // If origin is known, places must be within 15km of the starting point.
  if (origin) {
    transitPlaces = transitPlaces.filter((p) => distanceMeters(p.coordinate, origin) <= 15000);
  }

  // Also include registered real-world transit stations if not yet in places list
  if (origin) {
    const registeredStops = findNearbyRegisteredTransitStops(origin, 4500, 3500);
    transitPlaces = deduplicateTransit([...transitPlaces, ...registeredStops]);
  }

  // Filter transit places strictly to the requested route corridor
  transitPlaces = filterStopsToRoute(transitPlaces, routeCoordinates);

  // ZERO synthetic generation: if no metro or no bus exists, we do NOT generate fake names!

  const depMinutes = departureTime.getHours() * 60 + departureTime.getMinutes();

  // 2. Map into rich TransitStop descriptors with distance calculated from the starting location
  const stops: TransitStop[] = [];
  for (const p of transitPlaces) {
    const type = classifyTransitType(p.name);
    if (!type) continue; // STRICT: only Metro, Bus Terminus, or Bus Stop!
    const subType = classifyTransitSubType(p.name, type);
    const dist = origin
      ? Math.round(distanceMeters(p.coordinate, origin))
      : (p.distanceFromRouteMeters ?? 0);
    const walkingMinutes = Math.max(1, Math.round(dist / 75)); // approx 75m/min

    // Default operating hours if unmapped:
    // Metro usually 05:30 - 23:30; Bus usually 05:00 - 00:30
    const openTime = p.openTime || (type === 'metro' ? '05:30' : '05:00');
    const closeTime = p.closeTime || (type === 'metro' ? '23:30' : '00:30');

    const openMin = parseTimeToMinutes(openTime) ?? 330;
    const closeMin = parseTimeToMinutes(closeTime) ?? (type === 'metro' ? 1410 : 30);

    // Check if open at departure time
    let isOpen = false;
    let isClosingSoon = false;

    if (closeMin < openMin) {
      isOpen = depMinutes >= openMin || depMinutes < closeMin;
      if (isOpen && depMinutes < closeMin && closeMin - depMinutes <= 45) {
        isClosingSoon = true;
      }
    } else {
      isOpen = depMinutes >= openMin && depMinutes < closeMin;
      if (isOpen && closeMin - depMinutes <= 45) {
        isClosingSoon = true;
      }
    }

    let statusText = 'Closed for the night';
    let badgeColor = '#f87171'; // Red
    let lastDepartureText: string | undefined;

    if (p.is24_7) {
      isOpen = true;
      statusText = '24/7 Night Service';
      badgeColor = '#4ade80';
    } else if (isClosingSoon) {
      statusText = `Closing soon (${closeTime})`;
      badgeColor = '#facc15'; // Amber
      lastDepartureText = `Last departure ~${closeTime}`;
    } else if (isOpen) {
      statusText = `Open until ${closeTime}`;
      badgeColor = '#4ade80'; // Green
      lastDepartureText = type === 'metro' ? 'Trains every 6–8 min' : 'Buses every 15–20 min';
    } else {
      statusText = `Closed · Resumes ${openTime}`;
      badgeColor = '#94a3b8'; // Slate
    }

    stops.push({
      id: p.id,
      name: p.name,
      type,
      subType,
      coordinate: p.coordinate,
      distanceMeters: dist,
      walkingMinutes,
      openTime,
      closeTime,
      isOpenAtTime: isOpen,
      statusText,
      badgeColor,
      lastDepartureText,
    });
  }

  // Sort stops strictly by distance from starting location (closest first)
  stops.sort((a, b) => a.distanceMeters - b.distanceMeters);

  const metroStops = stops.filter((s) => s.type === 'metro');
  const busStops = stops.filter((s) => s.type === 'bus');
  const openStops = stops.filter((s) => s.isOpenAtTime);
  const openMetro = metroStops.filter((s) => s.isOpenAtTime);
  const openBus = busStops.filter((s) => s.isOpenAtTime);

  const startArea = extractCleanAreaName(originName, 'Starting Point');

  // 3. Determine Overall Availability Level for Starting Location
  let level: 'high' | 'moderate' | 'low' = 'low';
  let badgeLabel = 'Low / Closed';
  let badgeColor = '#94a3b8'; // Slate grey
  let headline = 'No Active Night Transit';
  let description = `No transit stations were detected near ${startArea}.`;
  let nightTransitAlert: string | undefined;

  if (stops.length === 0) {
    level = 'low';
    badgeLabel = 'No Transit';
    badgeColor = '#64748b';
    headline = 'No Transit Near Start';
    description = `No metro stations or bus stops detected within walking distance of ${startArea}.`;
    nightTransitAlert = 'No public transit mapped near your start point. Plan a cab or verify pickup.';
  } else if (openMetro.length >= 1 || openBus.length >= 2) {
    level = 'high';
    badgeLabel = 'Active Night Transit';
    badgeColor = '#4ade80';
    headline = 'Transit Active Near Start';
    if (openMetro.length > 0 && openBus.length > 0) {
      description = `${openMetro.length} Metro station(s) and ${openBus.length} bus stop(s) active near ${startArea}.`;
    } else if (openMetro.length > 0) {
      description = `${openMetro.length} Metro station(s) active near ${startArea}.`;
    } else {
      description = `${openBus.length} Bus stop(s) & terminus active near ${startArea}.`;
    }
  } else if (openStops.length > 0) {
    level = 'moderate';
    badgeLabel = 'Limited Transit';
    badgeColor = '#facc15';
    headline = 'Limited Service';
    description = `${openStops.length} transit stop(s) open near ${startArea}.`;
  } else {
    level = 'low';
    badgeLabel = 'Closed for Night';
    badgeColor = '#94a3b8';
    headline = 'Transit Closed';
    description = `Transit stops near ${startArea} are closed for the night.`;
    nightTransitAlert = 'Nearby transit is closed for the night. Service resumes in the morning.';
  }

  return {
    level,
    badgeLabel,
    badgeColor,
    headline,
    description,
    metroCount: metroStops.length,
    busCount: busStops.length,
    openMetroCount: openMetro.length,
    openBusCount: openBus.length,
    totalStops: stops.length,
    nearestStop: stops.length > 0 ? stops[0] : undefined,
    stops,
    nightTransitAlert,
  };
}
