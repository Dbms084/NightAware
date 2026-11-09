/**
 * Location service — wraps expo-location for foreground position + permissions.
 *
 * Rules (from AGENTS.md):
 * - Request foreground-only permission with a plain-language reason.
 * - Never request background location.
 * - Never persist, upload, log, or share precise location automatically.
 * - If permission denied or unavailable, return null gracefully.
 */

import * as ExpoLocation from 'expo-location';

import type { Coordinate } from '@/types/geo';
import type { LocationPermissionStatus, LocationServiceConfig } from '@/features/location/types';

const DEFAULT_CONFIG: Required<LocationServiceConfig> = {
  enableHighAccuracy: true,
  timeoutMs: 15_000,
  maximumAgeMs: 30_000,
};

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

/** Map expo-location status to our simplified status. */
function mapStatus(status: ExpoLocation.PermissionStatus): LocationPermissionStatus {
  switch (status) {
    case ExpoLocation.PermissionStatus.GRANTED:
      return 'granted';
    case ExpoLocation.PermissionStatus.DENIED:
      return 'denied';
    default:
      return 'undetermined';
  }
}

/** Check current foreground location permission without prompting. */
export async function getPermissionStatus(): Promise<LocationPermissionStatus> {
  const { status } = await ExpoLocation.getForegroundPermissionsAsync();
  return mapStatus(status);
}

/**
 * Request foreground location permission.
 * Shows the system dialog with a plain-language reason on first call.
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  return mapStatus(status);
}

// ---------------------------------------------------------------------------
// Position
// ---------------------------------------------------------------------------

/**
 * Get the device's current position.
 * Returns `null` if permission is denied or GPS is unavailable.
 */
export async function getCurrentPosition(
  config: LocationServiceConfig = {},
): Promise<Coordinate | null> {
  const merged = { ...DEFAULT_CONFIG, ...config };

  const permission = await getPermissionStatus();
  if (permission !== 'granted') return null;

  try {
    const location = await Promise.race([
      ExpoLocation.getCurrentPositionAsync({
        accuracy: merged.enableHighAccuracy
          ? ExpoLocation.Accuracy.Highest
          : ExpoLocation.Accuracy.High,
      }),
      // Timeout fallback
      new Promise<null>((resolve) => setTimeout(() => resolve(null), merged.timeoutMs)),
    ]);

    if (!location) return null;

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}

/**
 * Get the last known position (faster, may be stale).
 * Returns `null` if unavailable.
 */
export async function getLastKnownPosition(): Promise<Coordinate | null> {
  const permission = await getPermissionStatus();
  if (permission !== 'granted') return null;

  try {
    const location = await ExpoLocation.getLastKnownPositionAsync();
    if (!location) return null;

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Watch position
// ---------------------------------------------------------------------------

/** Subscription handle returned by watchPosition. */
export type LocationWatcher = {
  /** Stop watching position updates. */
  remove: () => void;
};

/**
 * Subscribe to continuous foreground position updates.
 * Returns a handle with a `remove()` method to stop watching.
 * Returns `null` if permission is not granted.
 *
 * Uses balanced accuracy and ~1 second intervals — suitable for
 * showing the user's dot on a map without excessive battery drain.
 */
export async function watchPosition(
  callback: (coordinate: Coordinate) => void,
): Promise<LocationWatcher | null> {
  const permission = await getPermissionStatus();
  if (permission !== 'granted') return null;

  try {
    const subscription = await ExpoLocation.watchPositionAsync(
      {
        accuracy: ExpoLocation.Accuracy.High,
        timeInterval: 1_000,    // ms between updates
        distanceInterval: 2,    // metres — fire if moved ≥ 2m (precision matters)
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      },
    );

    return {
      remove: () => subscription.remove(),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Reverse geocoding
// ---------------------------------------------------------------------------

/**
 * Convert a coordinate to a human-readable address string.
 * Returns a short address or `null` if geocoding fails.
 */
export async function reverseGeocode(coordinate: Coordinate): Promise<string | null> {
  try {
    const results = await ExpoLocation.reverseGeocodeAsync(coordinate);
    if (!results.length) return null;

    const addr = results[0];
    const parts = [addr.name, addr.street, addr.district, addr.city].filter(Boolean);
    return parts.join(', ') || null;
  } catch {
    return null;
  }
}

