import type { Coordinate, TravelMode } from '@/types/geo';

const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';

export type ValhallaRoute = {
  coordinates: Coordinate[];
  distanceMeters: number;
  durationMinutes: number;
};

type ValhallaTrip = {
  summary?: {
    length?: number;
    time?: number;
  };
  legs?: {
    shape?: string;
  }[];
};

type ValhallaResponse = {
  trip?: ValhallaTrip;
  alternates?: {
    trip?: ValhallaTrip;
  }[];
};

function getCosting(mode: TravelMode): string {
  switch (mode) {
    case 'walking':
      return 'pedestrian';
    case 'cycling':
      return 'bicycle';
    case 'driving':
      return 'auto';
  }
}

function decodePolyline6(encoded: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      if (index >= encoded.length) {
        throw new Error('Invalid Valhalla polyline: incomplete latitude.');
      }
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) {
        throw new Error('Invalid Valhalla polyline character.');
      }
      result |= (byte & 0x1f) << shift;
      shift += 5;
      if (shift > 30) throw new Error('Invalid latitude encoding.');
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;

    do {
      if (index >= encoded.length) {
        throw new Error('Invalid Valhalla polyline: incomplete longitude.');
      }
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) {
        throw new Error('Invalid Valhalla polyline character.');
      }
      result |= (byte & 0x1f) << shift;
      shift += 5;
      if (shift > 30) throw new Error('Invalid longitude encoding.');
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    const lat = latitude / 1e6;
    const lng = longitude / 1e6;

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 || lat > 90 ||
      lng < -180 || lng > 180
    ) {
      throw new Error('Valhalla returned invalid coordinates.');
    }

    coordinates.push({ latitude: lat, longitude: lng });
  }

  return coordinates;
}

function convertTrip(trip: ValhallaTrip): ValhallaRoute | null {
  const coordinates: Coordinate[] = [];

  for (const leg of trip.legs ?? []) {
    if (!leg.shape) continue;

    const decoded = decodePolyline6(leg.shape);

    if (coordinates.length > 0 && decoded.length > 0) {
      const first = decoded[0];
      const last = coordinates[coordinates.length - 1];

      if (
        first.latitude === last.latitude &&
        first.longitude === last.longitude
      ) {
        coordinates.push(...decoded.slice(1));
      } else {
        coordinates.push(...decoded);
      }
    } else {
      coordinates.push(...decoded);
    }
  }

  const lengthKm = trip.summary?.length;
  const durationSeconds = trip.summary?.time;

  if (
    coordinates.length < 2 ||
    typeof lengthKm !== 'number' ||
    !Number.isFinite(lengthKm) ||
    lengthKm <= 0 ||
    typeof durationSeconds !== 'number' ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return null;
  }

  return {
    coordinates,
    distanceMeters: Math.round(lengthKm * 1000),
    durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
  };
}

export async function fetchValhallaDirections(
  origin: Coordinate,
  destination: Coordinate,
  mode: TravelMode,
): Promise<ValhallaRoute[]> {
  const validCoordinate = (point: Coordinate) =>
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180;

  if (!validCoordinate(origin) || !validCoordinate(destination)) {
    throw new Error('Invalid origin or destination coordinates.');
  }

  const requestBody = {
    locations: [
      { lat: origin.latitude, lon: origin.longitude },
      { lat: destination.latitude, lon: destination.longitude },
    ],
    costing: getCosting(mode),
    units: 'kilometers',
    shape_format: 'polyline6',
    directions_type: 'none',
    alternates: 2,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(VALHALLA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': 'NightAware-Student-Project',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Valhalla request failed (${response.status}): ${errorText.slice(0, 300)}`
      );
    }

    const data = (await response.json()) as ValhallaResponse;
    const trips: ValhallaTrip[] = [];

    if (data.trip) trips.push(data.trip);

    for (const alternate of data.alternates ?? []) {
      if (alternate.trip) trips.push(alternate.trip);
    }

    const routes = trips
      .map(convertTrip)
      .filter((route): route is ValhallaRoute => route !== null);

    if (routes.length === 0) {
      throw new Error('Valhalla returned no valid route geometry.');
    }

    return routes;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Valhalla routing request timed out after 15 seconds.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
