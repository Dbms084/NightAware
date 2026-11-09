/**
 * Full-screen interactive map with layer toggles.
 *
 * Shows: origin/destination markers, route polylines, places by category,
 * CCTV markers, and safety zone overlays — each toggleable.
 *
 * Uses real user location and Google Places data when available.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';

import type { Coordinate, MapRegion, Place, RouteOption, SafetyZone } from '@/types/geo';
import {
  NightAwareMap,
  OriginMarker,
  DestinationMarker,
  PlaceMarker,
  CCTVMarker,
  RoutePolyline,
  SafetyOverlay,
} from '@/components/map';
import { DEMO_ORIGIN, DEMO_DESTINATION } from '@/data/mock-places';
import { MOCK_ROUTES, getRouteColor } from '@/data/mock-routes';
import { getAllPlaces } from '@/features/places/services/place-provider';
import { getAllSafetyZones, getAllCCTVLocations } from '@/features/routes/services/safety-data';
import { useLocation } from '@/features/location/hooks/useLocation';

// Layer toggle button labels
const LAYERS = [
  { key: 'routes', label: 'Routes' },
  { key: 'places', label: 'Places' },
  { key: 'cctv', label: 'CCTV' },
  { key: 'safety', label: 'Safety' },
] as const;

type LayerKey = (typeof LAYERS)[number]['key'];

export default function MapScreen() {
  const router = useRouter();
  const { coordinate, permissionStatus } = useLocation();

  const [places, setPlaces] = useState<Place[]>([]);
  const [cctvLocations, setCctvLocations] = useState<Place[]>([]);
  const [safetyZones, setSafetyZones] = useState<SafetyZone[]>([]);
  const [visibleRegion, setVisibleRegion] = useState<MapRegion | null>(null);
  const [activeLayers, setActiveLayers] = useState<Set<LayerKey>>(
    new Set(['routes']),
  );

  const originCoord = coordinate ?? DEMO_ORIGIN;

  // Load data on mount — pass user's coordinate for real API results
  useEffect(() => {
    void getAllPlaces(coordinate ?? undefined, 1500).then(setPlaces);
    void getAllCCTVLocations().then(setCctvLocations);
    void getAllSafetyZones().then(setSafetyZones);
  }, [coordinate]);

  const toggleLayer = useCallback((key: LayerKey) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const showRoutes = activeLayers.has('routes');
  const showPlaces = activeLayers.has('places');
  const showCCTV = activeLayers.has('cctv');
  const showSafety = activeLayers.has('safety');

  // Memoize route polyline data
  const routePolylines = useMemo(
    () =>
      MOCK_ROUTES.map((route, i) => ({
        id: route.id,
        coordinates: route.coordinates,
        color: getRouteColor(route.id),
        selected: i === 0,
        zIndex: MOCK_ROUTES.length - i,
      })),
    [],
  );

  // Helper: check if a coordinate is inside the visible region (with margin)
  const isInVisibleRegion = useCallback(
    (lat: number, lng: number): boolean => {
      if (!visibleRegion) return true; // show all if region unknown
      const latMargin = visibleRegion.latitudeDelta * 0.15;
      const lngMargin = visibleRegion.longitudeDelta * 0.15;
      return (
        lat >= visibleRegion.latitude - visibleRegion.latitudeDelta / 2 - latMargin &&
        lat <= visibleRegion.latitude + visibleRegion.latitudeDelta / 2 + latMargin &&
        lng >= visibleRegion.longitude - visibleRegion.longitudeDelta / 2 - lngMargin &&
        lng <= visibleRegion.longitude + visibleRegion.longitudeDelta / 2 + lngMargin
      );
    },
    [visibleRegion],
  );

  // Lazy-load: only show markers in the visible region
  const visiblePlaces = useMemo(
    () =>
      places
        .filter((p) => p.category !== 'cctv')
        .filter((p) => isInVisibleRegion(p.coordinate.latitude, p.coordinate.longitude)),
    [places, isInVisibleRegion],
  );

  const visibleCCTV = useMemo(
    () =>
      cctvLocations.filter((c) =>
        isInVisibleRegion(c.coordinate.latitude, c.coordinate.longitude),
      ),
    [cctvLocations, isInVisibleRegion],
  );

  const handleRegionChange = useCallback((region: MapRegion) => {
    setVisibleRegion(region);
  }, []);

  const isUsingRealLocation = permissionStatus === 'granted' && coordinate != null;
  const hasRealPlaces = places.some((p) => p.dataSource === 'provider');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Map */}
      <NightAwareMap
        showUserLocation={isUsingRealLocation}
        region={{
          latitude: originCoord.latitude,
          longitude: originCoord.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
        onRegionChange={handleRegionChange}
        style={styles.map}
        accessibilityLabel="Full-screen interactive map with layer toggles"
      >
        {/* Safety zones (render first so they're behind markers) */}
        {showSafety && <SafetyOverlay zones={safetyZones} />}

        {/* Route polylines (memoized) */}
        {showRoutes &&
          routePolylines.map((rp) => (
            <RoutePolyline
              key={rp.id}
              coordinates={rp.coordinates}
              color={rp.color}
              selected={rp.selected}
              zIndex={rp.zIndex}
            />
          ))}

        {/* Origin marker */}
        <OriginMarker coordinate={originCoord} title={isUsingRealLocation ? 'Your location' : 'Indiranagar Metro · Exit A'} />

        {/* Place markers (lazy-loaded by visible region) */}
        {showPlaces &&
          visiblePlaces.map((place) => (
            <PlaceMarker
              key={place.id}
              coordinate={place.coordinate}
              category={place.category}
              name={place.name}
              isOpen={place.openAtJourneyTime}
            />
          ))}

        {/* CCTV markers (lazy-loaded by visible region) */}
        {showCCTV &&
          visibleCCTV.map((cam) => (
            <CCTVMarker
              key={cam.id}
              coordinate={cam.coordinate}
              name={cam.name}
            />
          ))}
      </NightAwareMap>

      {/* Back button */}
      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      {/* Layer toggles */}
      <View style={styles.layerBar}>
        {LAYERS.map(({ key, label }) => {
          const active = activeLayers.has(key);
          return (
            <Pressable
              key={key}
              onPress={() => toggleLayer(key)}
              style={[styles.layerButton, active && styles.layerButtonActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.layerText, active && styles.layerTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Data source indicator */}
      <View style={styles.disclaimer}>
        <View style={[styles.dataDot, { backgroundColor: hasRealPlaces ? '#4ADE80' : '#ff9400' }]} />
        <Text style={styles.disclaimerText}>
          {hasRealPlaces ? 'Live places data' : 'Demo data · Not live'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090b0d' },
  map: { flex: 1 },
  backButton: {
    position: 'absolute',
    top: 56,
    left: 16,
    backgroundColor: '#111519',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#30363e',
    elevation: 4,
  },
  backText: { color: '#f1f2f1', fontSize: 15, fontWeight: '600' },
  layerBar: {
    position: 'absolute',
    top: 56,
    right: 16,
    flexDirection: 'column',
    gap: 8,
    elevation: 4,
  },
  layerButton: {
    backgroundColor: '#111519',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#30363e',
    minWidth: 72,
    alignItems: 'center',
  },
  layerButtonActive: {
    backgroundColor: '#241a10',
    borderColor: '#ff9400',
  },
  layerText: { color: '#aab2bb', fontSize: 13, fontWeight: '600' },
  layerTextActive: { color: '#ff9400' },
  disclaimer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17,21,25,0.85)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dataDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  disclaimerText: { color: '#85909b', fontSize: 12 },
});
