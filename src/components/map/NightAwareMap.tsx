/**
 * NightAwareMap — styled dark-themed wrapper around react-native-maps MapView.
 *
 * Provides a single component that handles:
 * - Dark map styling (Google Maps custom JSON style)
 * - User location dot (when permission granted)
 * - Loading state
 * - Responsive sizing
 * - Accessibility description
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import RNMapView, {
  Marker,
  type MapPressEvent,
  type Region,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

import type { Coordinate, MapRegion, SafetyZone } from '@/types/geo';
import { DEFAULT_MAP_REGION } from '@/types/geo';
import { darkMapStyle } from '@/components/map/map-styles';
import type { MarkerData } from '@/components/map/MapMarkers';
import type { PolylineData } from '@/components/map/RoutePolyline';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type NightAwareMapProps = {
  /** Map region to display. */
  region?: MapRegion;
  /** List of coordinates to smoothly frame the camera around (e.g. route polyline, start & destination) */
  coordinatesToFit?: Coordinate[];
  /** Padding around the fitted coordinates in pixels */
  fitPadding?: { top: number; right: number; bottom: number; left: number };
  /** Whether to show the user's location dot. Default: false. */
  showUserLocation?: boolean;
  /** Use dark map styling. Default: true. */
  darkMode?: boolean;
  /** Fixed height style, or flex to fill parent. */
  style?: ViewStyle;
  /** Called when the user moves the map. */
  onRegionChange?: (region: MapRegion) => void;
  /** Called when a marker is tapped. */
  onMarkerPress?: (markerId: string) => void;
  /** Called when the user taps the map (not a marker). */
  onMapPress?: (coordinate: Coordinate) => void;
  /** Child components (Markers, Polylines, Circles rendered inside the map). */
  children?: React.ReactNode;
  /** Accessibility description for the map region. */
  accessibilityLabel?: string;
};

// ---------------------------------------------------------------------------
// Helpers for stable camera keys
// ---------------------------------------------------------------------------

function getFitKey(coords: Coordinate[]): string {
  if (!coords || coords.length === 0) return '';
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${coords.length}_${first.latitude.toFixed(4)},${first.longitude.toFixed(4)}_${last.latitude.toFixed(4)},${last.longitude.toFixed(4)}`;
}

function getRegionKey(r: MapRegion): string {
  if (!r) return '';
  return `${r.latitude.toFixed(4)},${r.longitude.toFixed(4)},${r.latitudeDelta.toFixed(4)}`;
}

const DEFAULT_FIT_PADDING = { top: 40, right: 40, bottom: 40, left: 40 };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const NightAwareMap = forwardRef<RNMapView, NightAwareMapProps>(function NightAwareMap(
  {
    region,
    coordinatesToFit,
    fitPadding,
    showUserLocation = false,
    darkMode = true,
    style,
    onRegionChange,
    onMarkerPress: _onMarkerPress,
    onMapPress,
    children,
    accessibilityLabel = 'Interactive map showing your area',
  },
  forwardedRef,
) {
  const mapRef = useRef<RNMapView>(null);
  useImperativeHandle(forwardedRef, () => mapRef.current!);

  const regionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMapReadyRef = useRef(false);
  const lastFitKeyRef = useRef<string>('');
  const lastRegionKeyRef = useRef<string>('');

  const [isReady, setIsReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const initialRegion = region ?? DEFAULT_MAP_REGION;
  const padding = fitPadding ?? DEFAULT_FIT_PADDING;

  const fitCamera = useCallback((coords: Coordinate[], pad: typeof DEFAULT_FIT_PADDING, animated = true) => {
    if (!mapRef.current || coords.length < 2) return;
    try {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: pad,
        animated,
      });
    } catch {
      // Ignore if native map ref is unmounting
    }
  }, []);

  const animateCameraToRegion = useCallback((targetRegion: MapRegion, animated = true) => {
    if (!mapRef.current) return;
    try {
      mapRef.current.animateToRegion(targetRegion, animated ? 500 : 0);
    } catch {
      // Ignore if native map ref is unmounting
    }
  }, []);

  const handleRegionChangeComplete = useCallback(
    (newRegion: Region) => {
      // Debounce: clear any pending callback and schedule a new one (300ms)
      if (regionTimerRef.current) clearTimeout(regionTimerRef.current);
      regionTimerRef.current = setTimeout(() => {
        onRegionChange?.({
          latitude: newRegion.latitude,
          longitude: newRegion.longitude,
          latitudeDelta: newRegion.latitudeDelta,
          longitudeDelta: newRegion.longitudeDelta,
        });
      }, 300);
    },
    [onRegionChange],
  );

  const handleMapPress = useCallback(
    (event: MapPressEvent) => {
      onMapPress?.({
        latitude: event.nativeEvent.coordinate.latitude,
        longitude: event.nativeEvent.coordinate.longitude,
      });
    },
    [onMapPress],
  );

  const handleMapReady = useCallback(() => {
    isMapReadyRef.current = true;
    setIsReady(true);
    setMapError(null);

    // Initial camera positioning once native view is ready
    if (coordinatesToFit && coordinatesToFit.length >= 2) {
      setTimeout(() => {
        fitCamera(coordinatesToFit, padding, false);
        lastFitKeyRef.current = getFitKey(coordinatesToFit);
      }, 80);
    } else if (region) {
      setTimeout(() => {
        animateCameraToRegion(region, false);
        lastRegionKeyRef.current = getRegionKey(region);
      }, 80);
    }
  }, [coordinatesToFit, padding, region, fitCamera, animateCameraToRegion]);

  // React smoothly to route / coordinate updates
  useEffect(() => {
    if (!isMapReadyRef.current || !coordinatesToFit || coordinatesToFit.length < 2) return;
    const key = getFitKey(coordinatesToFit);
    if (key !== lastFitKeyRef.current) {
      lastFitKeyRef.current = key;
      fitCamera(coordinatesToFit, padding, true);
    }
  }, [coordinatesToFit, padding, fitCamera]);

  // React smoothly to region updates when explicit coordinatesToFit is not provided (e.g. user GPS location update)
  useEffect(() => {
    if (!isMapReadyRef.current || !region) return;
    if (coordinatesToFit && coordinatesToFit.length >= 2) return;
    const key = getRegionKey(region);
    if (key !== lastRegionKeyRef.current) {
      lastRegionKeyRef.current = key;
      animateCameraToRegion(region, true);
    }
  }, [region, coordinatesToFit, animateCameraToRegion]);

  // If the native map fails to render, show a graceful fallback.
  if (mapError) {
    return (
      <View
        style={[styles.container, style]}
        accessibilityLabel="Map unavailable"
      >
        <View style={styles.errorOverlay}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorTitle}>Map unavailable</Text>
          <Text style={styles.errorBody}>
            {mapError}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="none"
    >
      <RNMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        customMapStyle={darkMode ? darkMapStyle : undefined}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsIndoors={false}
        showsTraffic={false}
        showsBuildings={false}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        onMapReady={handleMapReady}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={handleMapPress}
      >
        {children}
      </RNMapView>

      {/* Loading overlay */}
      {!isReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ff9400" />
        </View>
      )}
    </View>
  );
});

/**
 * Animate the map camera to a specific coordinate.
 * Use via ref: mapRef.current?.animateToRegion(...)
 */
export function createMapRegion(
  coordinate: Coordinate,
  zoomLevel: 'city' | 'neighborhood' | 'street' = 'neighborhood',
): MapRegion {
  const deltas: Record<string, number> = {
    city: 0.05,
    neighborhood: 0.015,
    street: 0.005,
  };
  const delta = deltas[zoomLevel];
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

// Re-export the underlying MapView ref type for advanced usage.
export { RNMapView };

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#0b1014',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0b1014',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Error fallback styles
  errorOverlay: {
    flex: 1,
    backgroundColor: '#0b1014',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  errorTitle: {
    color: '#f1f2f1',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  errorBody: {
    color: '#85909b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
