import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';

import type { Coordinate, MapRegion } from '@/types/geo';
import { DEFAULT_MAP_REGION } from '@/types/geo';
import { MapWebContext } from './map-context.web';

export type NightAwareMapProps = {
  region?: MapRegion;
  coordinatesToFit?: Coordinate[];
  fitPadding?: { top: number; right: number; bottom: number; left: number };
  showUserLocation?: boolean;
  darkMode?: boolean;
  style?: ViewStyle;
  onRegionChange?: (region: MapRegion) => void;
  onMarkerPress?: (markerId: string) => void;
  onMapPress?: (coordinate: Coordinate) => void;
  children?: React.ReactNode;
  accessibilityLabel?: string;
};

export const NightAwareMap = forwardRef<any, NightAwareMapProps>(function NightAwareMap(
  {
    region,
    coordinatesToFit,
    darkMode = true,
    style,
    onMarkerPress,
    onMapPress,
    children,
    accessibilityLabel = 'Interactive map showing your area',
  },
  forwardedRef,
) {
  const [dimensions, setDimensions] = useState({ width: 400, height: 260 });
  const [currentRegion, setCurrentRegion] = useState<MapRegion>(region ?? DEFAULT_MAP_REGION);

  useImperativeHandle(forwardedRef, () => ({
    fitToCoordinates: (_coords: Coordinate[]) => {
      // Handled reactively via coordinatesToFit
    },
    animateToRegion: (newRegion: MapRegion) => {
      setCurrentRegion(newRegion);
    },
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setDimensions({ width, height });
    }
  };

  // Calculate bounding box
  const bounds = useMemo(() => {
    if (coordinatesToFit && coordinatesToFit.length >= 2) {
      let minLat = 90;
      let maxLat = -90;
      let minLng = 180;
      let maxLng = -180;

      for (const c of coordinatesToFit) {
        if (c.latitude < minLat) minLat = c.latitude;
        if (c.latitude > maxLat) maxLat = c.latitude;
        if (c.longitude < minLng) minLng = c.longitude;
        if (c.longitude > maxLng) maxLng = c.longitude;
      }

      // 18% padding
      const latPad = Math.max((maxLat - minLat) * 0.18, 0.005);
      const lngPad = Math.max((maxLng - minLng) * 0.18, 0.005);

      return {
        minLat: minLat - latPad,
        maxLat: maxLat + latPad,
        minLng: minLng - lngPad,
        maxLng: maxLng + lngPad,
      };
    }

    const r = region ?? currentRegion ?? DEFAULT_MAP_REGION;
    const latHalf = r.latitudeDelta / 2;
    const lngHalf = r.longitudeDelta / 2;
    return {
      minLat: r.latitude - latHalf,
      maxLat: r.latitude + latHalf,
      minLng: r.longitude - lngHalf,
      maxLng: r.longitude + lngHalf,
    };
  }, [coordinatesToFit, region, currentRegion]);

  const project = useMemo(() => {
    const latSpan = bounds.maxLat - bounds.minLat || 0.01;
    const lngSpan = bounds.maxLng - bounds.minLng || 0.01;

    return (coord: Coordinate) => {
      const rawX = ((coord.longitude - bounds.minLng) / lngSpan) * 100;
      // Invert Y so higher latitude is at top
      const rawY = (1 - (coord.latitude - bounds.minLat) / latSpan) * 100;
      return {
        x: Math.min(Math.max(rawX, 3), 97),
        y: Math.min(Math.max(rawY, 3), 97),
      };
    };
  }, [bounds]);

  const contextValue = useMemo(
    () => ({
      project,
      width: dimensions.width,
      height: dimensions.height,
      onMarkerPress,
    }),
    [project, dimensions.width, dimensions.height, onMarkerPress],
  );

  return (
    <View
      style={[styles.container, style]}
      onLayout={handleLayout}
      accessibilityLabel={accessibilityLabel}
    >
      {/* Dark Vector Grid Map Background */}
      <View style={styles.gridOverlay}>
        <View style={styles.gridLineH1} />
        <View style={styles.gridLineH2} />
        <View style={styles.gridLineH3} />
        <View style={styles.gridLineV1} />
        <View style={styles.gridLineV2} />
        <View style={styles.gridLineV3} />
        <View style={styles.radarCircle} />
      </View>

      {/* Mode Badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeDot}>●</Text>
        <Text style={styles.badgeText}>MAP PREVIEW</Text>
      </View>

      {/* Interactive Map Web Context Provider */}
      <MapWebContext.Provider value={contextValue}>
        <View style={StyleSheet.absoluteFill}>{children}</View>
      </MapWebContext.Provider>
    </View>
  );
});

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

export const RNMapView = View;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#090d14',
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#090d14',
  },
  gridLineH1: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  gridLineH2: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  gridLineH3: {
    position: 'absolute',
    top: '75%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  gridLineV1: {
    position: 'absolute',
    left: '25%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  gridLineV2: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  gridLineV3: {
    position: 'absolute',
    left: '75%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  radarCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 180,
    height: 180,
    marginLeft: -90,
    marginTop: -90,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255, 148, 0, 0.08)',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 99,
  },
  badgeDot: {
    color: '#10b981',
    fontSize: 10,
  },
  badgeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
