/**
 * React hook for accessing device location with permission management.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Coordinate } from '@/types/geo';
import type { LocationPermissionStatus } from '@/features/location/types';
import {
  getCurrentPosition,
  getLastKnownPosition,
  getPermissionStatus,
  requestLocationPermission,
  reverseGeocode,
} from '@/features/location/services/location-service';

type UseLocationReturn = {
  /** Current device coordinate, or null if unavailable. */
  coordinate: Coordinate | null;
  /** Human-readable address for the current coordinate. */
  address: string | null;
  /** Current permission state. */
  permissionStatus: LocationPermissionStatus;
  /** Whether the hook is actively fetching location. */
  isLoading: boolean;
  /** Human-readable error message, or null. */
  error: string | null;
  /** Prompt the user for location permission. */
  requestPermission: () => Promise<void>;
  /** Re-fetch current position. */
  refresh: () => Promise<void>;
};

export function useLocation(): UseLocationReturn {
  const [coordinate, setCoordinate] = useState<Coordinate | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('undetermined');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Fetch position and reverse-geocode it.
  const fetchLocation = useCallback(async () => {
    if (!isMounted.current) return;
    setIsLoading(true);
    setError(null);

    try {
      const status = await getPermissionStatus();
      if (!isMounted.current) return;
      setPermissionStatus(status);

      if (status !== 'granted') {
        setCoordinate(null);
        setAddress(null);
        setIsLoading(false);
        return;
      }

      // Try current position first, fall back to last-known.
      let pos = await getCurrentPosition();
      if (!pos) pos = await getLastKnownPosition();

      if (!isMounted.current) return;

      if (pos) {
        setCoordinate(pos);
        const addr = await reverseGeocode(pos);
        if (isMounted.current) setAddress(addr);
      } else {
        setError('Could not determine your location. Please check GPS settings.');
      }
    } catch {
      if (isMounted.current) {
        setError('Location unavailable. Please try again.');
      }
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  // Request permission then fetch.
  const requestPermission = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const status = await requestLocationPermission();
      if (!isMounted.current) return;
      setPermissionStatus(status);

      if (status === 'granted') {
        await fetchLocation();
      } else {
        setIsLoading(false);
        setError('Location permission was denied. You can enable it in device settings.');
      }
    } catch {
      if (isMounted.current) {
        setError('Failed to request location permission.');
        setIsLoading(false);
      }
    }
  }, [fetchLocation]);

  // Check permission + fetch on mount.
  useEffect(() => {
    isMounted.current = true;
    void fetchLocation();
    return () => {
      isMounted.current = false;
    };
  }, [fetchLocation]);

  return {
    coordinate,
    address,
    permissionStatus,
    isLoading,
    error,
    requestPermission,
    refresh: fetchLocation,
  };
}

