/**
 * Location-related types for the location feature module.
 */

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

export type LocationState = {
  coordinate: import('@/types/geo').Coordinate | null;
  address: string | null;
  permissionStatus: LocationPermissionStatus;
  isLoading: boolean;
  error: string | null;
};

export type LocationServiceConfig = {
  /** Use high-accuracy GPS (slower, more battery). Default: false. */
  enableHighAccuracy?: boolean;
  /** Maximum wait time in ms before falling back. Default: 10000. */
  timeoutMs?: number;
  /** Accept cached position up to this age in ms. Default: 60000. */
  maximumAgeMs?: number;
};

