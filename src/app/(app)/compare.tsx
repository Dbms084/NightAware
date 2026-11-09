/**
 * Route comparison screen — fetches real route alternatives
 * and shows them on the map with selectable route cards.
 *
 * Accepts optional route params: olat, olng, dlat, dlng, mode.
 * Falls back to demo data if params are missing.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';

import type { Coordinate, Place, RouteOption, TravelMode } from '@/types/geo';
import {
  NightAwareMap,
  OriginMarker,
  DestinationMarker,
  PlaceMarker,
  RoutePolyline,
} from '@/components/map';
import { DEMO_ORIGIN, DEMO_DESTINATION } from '@/data/mock-places';
import { MOCK_ROUTES, getRouteColor } from '@/data/mock-routes';
import { getPlacesNearRoute } from '@/features/places/services/place-provider';
import { getRouteOptions } from '@/features/routes/services/route-provider';

/** Route colour palette for real routes */
const REAL_ROUTE_COLORS = ['#ff9400', '#38BDF8', '#F87171', '#A78BFA', '#34D399'];

export default function CompareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    olat?: string;
    olng?: string;
    dlat?: string;
    dlng?: string;
    mode?: string;
  }>();

  // Parse real coordinates from params
  const hasRealParams =
    params.olat != null && params.olng != null &&
    params.dlat != null && params.dlng != null;

  const origin: Coordinate = hasRealParams
    ? { latitude: parseFloat(params.olat!), longitude: parseFloat(params.olng!) }
    : DEMO_ORIGIN;

  const destination: Coordinate = hasRealParams
    ? { latitude: parseFloat(params.dlat!), longitude: parseFloat(params.dlng!) }
    : DEMO_DESTINATION;

  const travelMode: TravelMode = (params.mode === 'Cycling' ? 'cycling' : params.mode === 'Driving' ? 'driving' : 'walking') as TravelMode;

  // State
  const [routes, setRoutes] = useState<RouteOption[]>(hasRealParams ? [] : MOCK_ROUTES);
  const [isLoading, setIsLoading] = useState(hasRealParams);
  const [selectedId, setSelectedId] = useState<string>(MOCK_ROUTES[0].id);
  const [routePlaces, setRoutePlaces] = useState<Place[]>([]);
  const [showDetail, setShowDetail] = useState(false);

  // Fetch routes
  useEffect(() => {
    if (!hasRealParams) {
      setRoutes(MOCK_ROUTES);
      setSelectedId(MOCK_ROUTES[0].id);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void getRouteOptions({
      origin,
      destination,
      departureTime: new Date(),
      travelMode,
    }).then((fetched) => {
      if (cancelled) return;
      const finalRoutes = fetched.length > 0 ? fetched : MOCK_ROUTES;
      setRoutes(finalRoutes);
      setSelectedId(finalRoutes[0].id);
      setIsLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setRoutes(MOCK_ROUTES);
      setSelectedId(MOCK_ROUTES[0].id);
      setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [hasRealParams]);

  const selectedRoute = routes.find((r) => r.id === selectedId) ?? routes[0];

  // Route polyline data
  const routePolylines = useMemo(
    () =>
      routes.map((route, i) => ({
        id: route.id,
        coordinates: route.coordinates,
        color: route.isMock ? getRouteColor(route.id) : REAL_ROUTE_COLORS[i % REAL_ROUTE_COLORS.length],
      })),
    [routes],
  );

  // Visible places near selected route
  const visiblePlaces = useMemo(
    () => routePlaces.filter((p) => p.category !== 'cctv'),
    [routePlaces],
  );

  // Load places near the selected route
  useEffect(() => {
    if (!selectedRoute) return;
    void getPlacesNearRoute(selectedRoute.coordinates, 300).then(setRoutePlaces);
  }, [selectedRoute]);

  const handleSelectRoute = useCallback((id: string) => {
    setSelectedId(id);
    setShowDetail(false);
  }, []);

  // Map region to fit origin + destination
  const mapRegion = {
    latitude: (origin.latitude + destination.latitude) / 2,
    longitude: (origin.longitude + destination.longitude) / 2,
    latitudeDelta: Math.max(
      0.02,
      Math.abs(origin.latitude - destination.latitude) * 1.6,
    ),
    longitudeDelta: Math.max(
      0.02,
      Math.abs(origin.longitude - destination.longitude) * 1.6,
    ),
  };

  const isUsingRealData = routes.length > 0 && !routes[0].isMock;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Map — upper portion */}
      <View style={styles.mapContainer}>
        <NightAwareMap
          region={mapRegion}
          coordinatesToFit={
            selectedRoute?.coordinates && selectedRoute.coordinates.length > 1
              ? [origin, destination, ...selectedRoute.coordinates]
              : [origin, destination]
          }
          fitPadding={{ top: 35, right: 35, bottom: 35, left: 35 }}
          style={styles.map}
          accessibilityLabel="Map showing route comparison between origin and destination"
        >
          {/* All route polylines */}
          {routePolylines.map((rp) => (
            <RoutePolyline
              key={rp.id}
              coordinates={rp.coordinates}
              color={rp.color}
              selected={rp.id === selectedId}
              onPress={() => handleSelectRoute(rp.id)}
              zIndex={rp.id === selectedId ? 10 : 1}
            />
          ))}

          {/* Markers */}
          <OriginMarker coordinate={origin} title="Start" />
          <DestinationMarker coordinate={destination} title="Destination" />

          {/* Places near selected route */}
          {visiblePlaces.map((place) => (
            <PlaceMarker
              key={place.id}
              coordinate={place.coordinate}
              category={place.category}
              name={place.name}
              isOpen={place.openAtJourneyTime}
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

        {/* Data source badge */}
        <View style={styles.dataBadge}>
          <View style={[styles.dataDot, { backgroundColor: isUsingRealData ? '#4ADE80' : '#ff9400' }]} />
          <Text style={styles.dataText}>
            {isUsingRealData ? 'Live routes' : 'Demo data'}
          </Text>
        </View>
      </View>

      {/* Route comparison cards */}
      <View style={styles.cardsContainer}>
        <Text style={styles.sectionTitle}>Compare night routes</Text>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#ff9400" />
            <Text style={styles.loadingText}>Finding the best routes...</Text>
          </View>
        ) : routes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗺</Text>
            <Text style={styles.emptyTitle}>No routes found</Text>
            <Text style={styles.emptyBody}>
              Could not find routes between these points. Try a different destination.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardScroll}
          >
            {routes.map((route, i) => (
              <RouteCard
                key={route.id}
                route={route}
                color={route.isMock ? getRouteColor(route.id) : REAL_ROUTE_COLORS[i % REAL_ROUTE_COLORS.length]}
                selected={route.id === selectedId}
                onSelect={() => handleSelectRoute(route.id)}
                onViewDetails={() => {
                  setSelectedId(route.id);
                  setShowDetail(true);
                }}
              />
            ))}
          </ScrollView>
        )}

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          {isUsingRealData
            ? 'Activity indicators, not a safety guarantee. Data from Google Maps.'
            : 'Sample data · Activity indicators, not a safety guarantee.'}
        </Text>
      </View>

      {/* Detail bottom sheet */}
      {showDetail && selectedRoute && (
        <RouteDetailSheet
          route={selectedRoute}
          places={routePlaces}
          onClose={() => setShowDetail(false)}
        />
      )}
    </SafeAreaView>
  );
}

// Lazy import to avoid circular dependency issues
import { RouteDetailSheet } from '@/components/map/RouteDetailSheet';

// ---------------------------------------------------------------------------
// Route Card
// ---------------------------------------------------------------------------

function RouteCard({
  route,
  color,
  selected,
  onSelect,
  onViewDetails,
}: {
  route: RouteOption;
  color: string;
  selected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
}) {
  const score = route.nightActivityScore;

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.card,
        selected && { borderColor: color },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {/* Colour bar */}
      <View style={[styles.colorBar, { backgroundColor: color }]} />

      {/* Label */}
      <Text style={styles.cardLabel}>{route.label}</Text>

      {/* Score ring */}
      <View style={styles.scoreRow}>
        <View style={[styles.scoreRing, { borderColor: color }]}>
          <Text style={[styles.scoreText, { color }]}>
            {score != null ? score : '—'}
          </Text>
        </View>
        <View style={styles.scoreInfo}>
          <Text style={styles.scoreLabel}>Night Activity</Text>
          <Text style={styles.scoreCaption}>
            {route.isMock
              ? 'Sample score'
              : score != null
                ? 'Live score'
                : 'Not available'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{route.durationMinutes} min</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {(route.distanceMeters / 1000).toFixed(1)} km
          </Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {route.placesOpenNearRoute ?? '—'}
          </Text>
          <Text style={styles.statLabel}>Open places</Text>
        </View>
      </View>

      {/* Extra time badge */}
      {route.extraMinutes > 0 && (
        <Text style={styles.extraTime}>
          +{route.extraMinutes} min vs fastest
        </Text>
      )}

      {/* Longest gap info */}
      {route.longestStretchWithoutOpenHelpMeters != null &&
        route.longestStretchWithoutOpenHelpMeters > 0 && (
        <Text style={styles.gapInfo}>
          {(route.longestStretchWithoutOpenHelpMeters / 1000).toFixed(1)} km longest gap without help
        </Text>
      )}

      {/* View details */}
      <Pressable
        onPress={onViewDetails}
        style={styles.detailButton}
        accessibilityRole="button"
      >
        <Text style={[styles.detailButtonText, { color }]}>View activity details</Text>
      </Pressable>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090b0d' },
  mapContainer: { flex: 1, minHeight: 280 },
  map: { flex: 1 },
  backButton: {
    position: 'absolute',
    top: 12,
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
  dataBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17,21,25,0.9)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#30363e',
  },
  dataDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dataText: {
    color: '#aab2bb',
    fontSize: 12,
    fontWeight: '600',
  },

  // Loading state
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    color: '#aab2bb',
    fontSize: 15,
  },

  // Cards section
  cardsContainer: {
    backgroundColor: '#090b0d',
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: '#f1f2f1',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  cardScroll: { paddingHorizontal: 16, gap: 12 },
  disclaimer: {
    color: '#85909b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
  },

  // Card
  card: {
    width: 240,
    backgroundColor: '#111519',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#30363e',
    padding: 16,
    overflow: 'hidden',
  },
  colorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  cardLabel: {
    color: '#f1f2f1',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 4,
  },

  // Score
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  scoreRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: { fontSize: 18, fontWeight: '700' },
  scoreInfo: { marginLeft: 12 },
  scoreLabel: { color: '#aab2bb', fontSize: 12, fontWeight: '600' },
  scoreCaption: { color: '#6b7280', fontSize: 11, marginTop: 2 },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stat: { alignItems: 'center' },
  statValue: { color: '#f1f2f1', fontSize: 15, fontWeight: '600' },
  statLabel: { color: '#6b7280', fontSize: 11, marginTop: 2 },

  extraTime: {
    color: '#aab2bb',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  gapInfo: {
    color: '#F87171',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
  },

  detailButton: {
    marginTop: 4,
    paddingVertical: 8,
    alignItems: 'center',
  },
  detailButtonText: { fontSize: 14, fontWeight: '600' },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: {
    color: '#f1f2f1',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyBody: {
    color: '#85909b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
