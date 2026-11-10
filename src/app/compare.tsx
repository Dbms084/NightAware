/**
 * CompareScreen — NightAware Route Recommendation & Comparison Engine.
 *
 * Implements Figma Frame 2:8317 ("Compare night routes") and
 * Frame 2:8497 ("Active night navigation").
 *
 * Features:
 * - Three distinct route recommendations: Safest-Profile, Balanced, Fastest
 * - 9-parameter Night Activity Score out of 100
 * - Road-segment activity heatmap toggle (Green, Yellow, Orange, Red)
 * - Color-coded POI markers matching specification with category filter pills
 * - Interactive Route Analysis panel with complete establishment list & direct Call button
 * - Active Turn-by-Turn Navigation mode with assistance ahead and quiet stretch warnings
 * - Community safety report integration into Supabase PostGIS
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { RouteDetailSheet } from '@/components/map/RouteDetailSheet';
import { SafetyReportModal } from '@/components/ui/SafetyReportModal';
import { RouteComparisonSkeletonGroup } from '@/components/ui/Skeleton';
import { LocationSearchModal, type SearchField } from '@/components/ui/LocationSearchModal';
import { NavigationSidebar } from '@/components/ui/NavigationSidebar';
import {
  WatchOverMeModal,
  ManageContactsModal,
  GuardianActiveBanner,
  SafetyCheckInModal,
} from '@/components/guardian';
import { useGuardianContacts } from '@/features/guardian/hooks/useGuardianContacts';
import { useGuardianTracker } from '@/features/guardian/hooks/useGuardianTracker';
import { DEMO_ORIGIN, DEMO_DESTINATION } from '@/data/mock-places';
import { MOCK_ROUTES } from '@/data/mock-routes';
import { getPlacesNearRoute } from '@/features/places/services/place-provider';
import { getRouteOptions, ROUTE_COLORS_BY_PROFILE } from '@/features/routes/services/route-provider';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All POIs' },
  { id: 'open_only', label: '🟢 Open Only' },
  { id: 'pharmacy', label: '💊 Pharmacies' },
  { id: 'hospital', label: '🏥 Hospitals' },
  { id: 'police', label: '👮 Police' },
  { id: 'shop_food', label: '🏪 Open Shops' },
  { id: 'petrol_station', label: '⛽ Petrol' },
  { id: 'transport', label: '🚇 Transit' },
];

export default function CompareScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    olat?: string;
    olng?: string;
    dlat?: string;
    dlng?: string;
    mode?: string;
    oname?: string;
    dname?: string;
  }>();

  // Parse initial coordinates
  const initialOrigin: Coordinate = useMemo(() => {
    if (params.olat != null && params.olng != null) {
      const lat = parseFloat(params.olat);
      const lng = parseFloat(params.olng);
      if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
    }
    return DEMO_ORIGIN;
  }, [params.olat, params.olng]);

  const initialDest: Coordinate = useMemo(() => {
    if (params.dlat != null && params.dlng != null) {
      const lat = parseFloat(params.dlat);
      const lng = parseFloat(params.dlng);
      if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
    }
    return DEMO_DESTINATION;
  }, [params.dlat, params.dlng]);

  // Dynamic origin & destination state (can be changed on compare screen)
  const [origin, setOrigin] = useState<Coordinate>(initialOrigin);
  const [destination, setDestination] = useState<Coordinate>(initialDest);
  const [originName, setOriginName] = useState<string>(
    params.oname ? decodeURIComponent(params.oname) : 'Starting Point',
  );
  const [destinationName, setDestinationName] = useState<string>(
    params.dname ? decodeURIComponent(params.dname) : 'Destination',
  );

  const travelMode: TravelMode = (
    params.mode === 'Cycling' ? 'cycling' : params.mode === 'Driving' ? 'driving' : 'walking'
  ) as TravelMode;

  // Search Modal state for compare screen
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchField, setSearchField] = useState<SearchField>('destination');

  // State
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');
  const [routePlaces, setRoutePlaces] = useState<Place[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDetail, setShowDetail] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Guardian & Watch Over Me state
  const { contacts, primaryContact } = useGuardianContacts();
  const [isWatchOverMeOpen, setIsWatchOverMeOpen] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isGuardianActive, setIsGuardianActive] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch routes whenever origin, destination or mode changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    void getRouteOptions({
      origin,
      destination,
      departureTime: new Date(),
      travelMode,
    })
      .then((fetched) => {
        if (!isMounted) return;
        const finalRoutes = fetched && fetched.length > 0 ? fetched : MOCK_ROUTES;
        setRoutes(finalRoutes);
        if (finalRoutes.length > 0) {
          setSelectedId(finalRoutes[0].id);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setRoutes(MOCK_ROUTES);
        setSelectedId(MOCK_ROUTES[0].id);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [origin, destination, travelMode]);

  const selectedRoute = routes.find((r) => r.id === selectedId) ?? routes[0] ?? null;

  // Autonomous Guardian Watchdogs: Corridor Deviation, Stoppage & Battery
  const {
    currentCoord: guardianCurrentCoord,
    deviationMeters,
    isOffCorridor,
    isArrived,
    activeAlert,
    stoppedDurationMinutes,
    acknowledgeAlert,
    simulateDeviation,
    simulateStoppage,
    simulateArrival,
    simulateBatteryLow,
  } = useGuardianTracker({
    isGuardianActive: isNavigating && isGuardianActive,
    route: selectedRoute,
    destinationCoord: destination,
    destinationName,
    primaryContact,
  });

  // Load places near the selected route
  useEffect(() => {
    if (!selectedRoute) {
      setRoutePlaces([]);
      return;
    }
    let isMounted = true;
    void getPlacesNearRoute(selectedRoute.coordinates, 320).then((places) => {
      if (isMounted) {
        setRoutePlaces(places);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedRoute]);

  const handleSelectRoute = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleShareJourney = useCallback(() => {
    setIsWatchOverMeOpen(true);
  }, []);

  // Map framing region: centers around mid-point of journey
  const mapRegion = useMemo(() => {
    return {
      latitude: (origin.latitude + destination.latitude) / 2,
      longitude: (origin.longitude + destination.longitude) / 2,
      latitudeDelta: Math.max(0.016, Math.abs(origin.latitude - destination.latitude) * 1.6),
      longitudeDelta: Math.max(0.016, Math.abs(origin.longitude - destination.longitude) * 1.6),
    };
  }, [origin, destination]);

  // Framed coordinates including all 3 candidate routes, origin and destination
  const allCoordinatesToFit = useMemo(() => {
    const coords: Coordinate[] = [origin, destination];
    routes.forEach((r) => {
      if (r.coordinates && r.coordinates.length > 0) {
        coords.push(...r.coordinates);
      }
    });
    return coords.length >= 2 ? coords : undefined;
  }, [origin, destination, routes]);

  // Filtered establishments on map by active category filter
  const filteredPlaces = useMemo(() => {
    if (selectedCategory === 'all') return routePlaces;
    if (selectedCategory === 'open_only') {
      return routePlaces.filter(
        (p) =>
          p.is24_7 ||
          p.arrivalStatus === 'open_at_arrival' ||
          p.arrivalStatus === 'closing_soon' ||
          p.openAtJourneyTime === true,
      );
    }
    return routePlaces.filter((p) => p.category === selectedCategory);
  }, [routePlaces, selectedCategory]);

  const isUsingRealData = routes.length > 0 && !routes[0].isMock;

  // Nearest help place ahead (for active navigation banner)
  const assistanceAhead = useMemo(() => {
    return routePlaces.find(
      (p) =>
        ['pharmacy', 'hospital', 'police', 'petrol_station'].includes(p.category) &&
        (p.openAtJourneyTime === true || p.is24_7 === true),
    );
  }, [routePlaces]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* TOP BAR / NAVIGATION HEADER */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => (isNavigating ? setIsNavigating(false) : router.back())}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>

        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isNavigating ? 'On your way home' : 'Compare Night Routes'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {isNavigating
              ? `Following ${selectedRoute?.label || 'Route'} · Active Guidance`
              : `${travelMode.toUpperCase()} · 3 Alternatives Evaluated`}
          </Text>
        </View>

        {/* Top Right Controls: End/Heatmap + ☰ Sidebar Menu Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isNavigating ? (
            <Pressable
              style={styles.endNavButton}
              onPress={() => {
                setIsNavigating(false);
                setIsGuardianActive(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="End journey navigation"
            >
              <Text style={styles.endNavText}>End</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.heatmapToggle, showHeatmap && styles.heatmapToggleActive]}
              onPress={() => setShowHeatmap(!showHeatmap)}
              accessibilityRole="button"
              accessibilityLabel="Toggle road activity heatmap"
            >
              <Text style={[styles.heatmapToggleText, showHeatmap && styles.heatmapToggleTextActive]}>
                {showHeatmap ? 'Heatmap ON' : 'Heatmap'}
              </Text>
            </Pressable>
          )}

          {/* ☰ Sidebar Drawer Menu Button */}
          <Pressable
            style={styles.menuIconBtn}
            onPress={() => setIsSidebarOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open side settings menu"
          >
            <Text style={styles.menuIconBtnText}>☰</Text>
          </Pressable>
        </View>
      </View>

      {/* SUB-HEADER: DATA STATUS */}
      <View style={styles.dataStatusBar}>
        <View style={[styles.dataDot, { backgroundColor: isUsingRealData ? '#4ADE80' : '#ff8a00' }]} />
        <Text style={styles.dataStatusText}>
          {isNavigating
            ? 'LIVE NAVIGATION · GPS tracking · Real-time corridor awareness'
            : isUsingRealData
            ? 'LIVE DATA · Real Google Routes & Places indicators'
            : 'DEMO JOURNEY · Mapped nighttime activity indicators'}
        </Text>
      </View>

      {/* ACTIVE GUARDIAN BANNER */}
      {isNavigating && isGuardianActive && (
        <GuardianActiveBanner
          destinationName={destinationName}
          primaryContact={primaryContact}
          deviationMeters={deviationMeters}
          isOffCorridor={isOffCorridor}
          isArrived={isArrived}
          onEndJourney={() => {
            setIsNavigating(false);
            setIsGuardianActive(false);
          }}
        />
      )}

      {/* CORRIDOR BAR: START -> DESTINATION with EDIT BUTTON */}
      {!isNavigating && (
        <View style={styles.corridorBar}>
          <View style={styles.corridorEndpoints}>
            <Pressable
              style={styles.corridorEndpoint}
              onPress={() => {
                setSearchField('start');
                setIsSearchOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Start: ${originName}`}
            >
              <View style={[styles.endpointDot, { backgroundColor: '#4ADE80' }]} />
              <Text style={styles.endpointText} numberOfLines={1}>
                {originName}
              </Text>
            </Pressable>

            <Text style={styles.corridorArrow}>→</Text>

            <Pressable
              style={styles.corridorEndpoint}
              onPress={() => {
                setSearchField('destination');
                setIsSearchOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Destination: ${destinationName}`}
            >
              <View style={[styles.endpointDot, { backgroundColor: '#FF8A00' }]} />
              <Text style={styles.endpointText} numberOfLines={1}>
                {destinationName}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={styles.changeLocBtn}
            onPress={() => {
              setSearchField('destination');
              setIsSearchOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Change locations"
          >
            <Text style={styles.changeLocBtnText}>Change</Text>
          </Pressable>
        </View>
      )}

      {/* MAP VIEW */}
      <View style={[styles.mapContainer, isNavigating && styles.mapContainerNav]}>
        <NightAwareMap
          region={mapRegion}
          coordinatesToFit={allCoordinatesToFit}
          fitPadding={
            isNavigating
              ? { top: 90, right: 30, bottom: 220, left: 30 }
              : { top: 35, right: 35, bottom: 45, left: 35 }
          }
          style={styles.map}
          accessibilityLabel="Map showing three route comparisons and nearby open establishments"
        >
          {/* Polylines for all 3 routes simultaneously */}
          {routes.map((route) => {
            const isSelected = route.id === selectedId;
            const profileColor = ROUTE_COLORS_BY_PROFILE[route.profileType] || '#ff8a00';

            return (
              <RoutePolyline
                key={route.id}
                coordinates={route.coordinates}
                color={profileColor}
                selected={isSelected}
                heatmapSegments={route.heatmapSegments}
                showHeatmap={showHeatmap}
                onPress={() => handleSelectRoute(route.id)}
                zIndex={isSelected ? 10 : 2}
              />
            );
          })}

          {/* Source and Destination Markers */}
          <OriginMarker coordinate={origin} title="Start Point" />
          <DestinationMarker coordinate={destination} title="Destination" />

          {/* Filtered POIs along active corridor */}
          {filteredPlaces.map((place) => (
            <PlaceMarker key={place.id} place={place} />
          ))}
        </NightAwareMap>

        {/* Heatmap Legend (when heatmap mode is active) */}
        {showHeatmap && !isNavigating && (
          <View style={styles.heatmapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4ADE80' }]} />
              <Text style={styles.legendText}>High Activity</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FACC15' }]} />
              <Text style={styles.legendText}>Moderate</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9400' }]} />
              <Text style={styles.legendText}>Low</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F87171' }]} />
              <Text style={styles.legendText}>Isolated</Text>
            </View>
          </View>
        )}

        {/* Floating Quick Flag for Fastest Route isolated stretch */}
        {!isNavigating && selectedRoute && selectedRoute.profileType === 'fastest' && (
          <View style={styles.isolatedWarningPill}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.isolatedWarningText}>
              Fastest: {selectedRoute.longestQuietStretchMeters}m quiet stretch
            </Text>
          </View>
        )}

        {/* Floating Maneuver Banner in Active Navigation Mode */}
        {isNavigating && (
          <View style={styles.navManeuverBanner}>
            <Text style={styles.maneuverIcon}>↱</Text>
            <View style={styles.maneuverInfo}>
              <Text style={styles.maneuverDist}>120 m</Text>
              <Text style={styles.maneuverInstruction}>
                Turn right onto 100 Feet Road
              </Text>
            </View>
          </View>
        )}

        {/* Floating Assistance Ahead Banner in Navigation Mode */}
        {isNavigating && assistanceAhead && (
          <View style={styles.navAssistanceAheadPill}>
            <Text style={styles.assistanceAheadIcon}>🏥</Text>
            <Text style={styles.assistanceAheadText}>
              {assistanceAhead.name} · Open at arrival
            </Text>
          </View>
        )}
      </View>

      {/* POI CATEGORY FILTER PILLS (When not navigating) */}
      {!isNavigating && (
        <View style={styles.filterBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBarContent}
          >
            {CATEGORY_FILTERS.map((f) => {
              const isActive = selectedCategory === f.id;
              const count =
                f.id === 'all'
                  ? routePlaces.length
                  : f.id === 'open_only'
                  ? routePlaces.filter(
                      (p) =>
                        p.is24_7 ||
                        p.arrivalStatus === 'open_at_arrival' ||
                        p.arrivalStatus === 'closing_soon' ||
                        p.openAtJourneyTime === true,
                    ).length
                  : routePlaces.filter((p) => p.category === f.id).length;

              return (
                <Pressable
                  key={f.id}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(f.id)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {f.label} {count > 0 ? `(${count})` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* BOTTOM SECTION: ROUTE COMPARISON CARDS OR NAVIGATION BAR */}
      {!isNavigating ? (
        <ScrollView
          style={styles.bottomSection}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bottomScrollContent}
        >
          {/* Departure & Arrival Context */}
          <View style={styles.arrivalContextRow}>
            <Text style={styles.contextLeave}>Leave now</Text>
            <Text style={styles.contextArrive}>
              {selectedRoute ? `Arrive in ~${selectedRoute.durationMinutes} min` : 'Evaluating routes...'}
            </Text>
          </View>

          {/* 3 Route Cards (Figma Frame 2:8317) */}
          <View style={styles.routesCardsContainer}>
            {isLoading ? (
              <RouteComparisonSkeletonGroup />
            ) : routes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🗺️</Text>
                <Text style={styles.emptyTitle}>No routes available</Text>
                <Text style={styles.emptySubtitle}>
                  Please choose a start location and destination on the Home screen to compare nighttime safe routes.
                </Text>
                <Pressable
                  style={styles.backHomeBtn}
                  onPress={() => router.back()}
                >
                  <Text style={styles.backHomeBtnText}>← Choose Locations</Text>
                </Pressable>
              </View>
            ) : (
              routes.map((route) => {
                const isSelected = route.id === selectedId;
                const profileColor = ROUTE_COLORS_BY_PROFILE[route.profileType] || '#ff8a00';

                return (
                  <Pressable
                    key={route.id}
                    style={[
                      styles.routeCard,
                      isSelected && {
                        borderColor: profileColor,
                        backgroundColor:
                          route.profileType === 'safest'
                            ? '#1f1a12'
                            : route.profileType === 'balanced'
                            ? '#111a24'
                            : '#1f1313',
                      },
                    ]}
                    onPress={() => handleSelectRoute(route.id)}
                  >
                    <View style={styles.routeCardHeader}>
                      <View style={styles.routeDetailsCol}>
                        <View style={styles.routeLabelRow}>
                          <View
                            style={[
                              styles.radioIndicator,
                              isSelected && { backgroundColor: profileColor },
                            ]}
                          />
                          <Text
                            style={[
                              styles.routeProfileTitle,
                              isSelected && { color: profileColor },
                            ]}
                          >
                            {route.label}
                          </Text>
                          {route.extraMinutes > 0 && (
                            <Text style={styles.routeTradeoff}>+{route.extraMinutes} min</Text>
                          )}
                        </View>
                        <Text style={styles.routeDurationText}>
                          {route.durationMinutes} min{' '}
                          <Text style={styles.routeDistanceText}>
                            · {(route.distanceMeters / 1000).toFixed(1)} km
                          </Text>
                        </Text>
                      </View>

                      {/* Score Badge */}
                      <View style={styles.routeScoreBadge}>
                        <Text
                          style={[
                            styles.scoreBigNumber,
                            isSelected && { color: profileColor },
                          ]}
                        >
                          {route.nightActivityScore}
                          <Text style={styles.scoreDenominator}>/100</Text>
                        </Text>
                        <Text style={styles.scoreSubLabel}>Night activity</Text>
                      </View>
                    </View>

                    {/* Specific profile badges */}
                    <View style={styles.badgePillRow}>
                      {route.profileType === 'safest' && (
                        <>
                          <View style={styles.featurePill}>
                            <Text style={styles.featurePillText}>🏪 {route.placesOpenNearRoute} open POIs</Text>
                          </View>
                          <View style={styles.featurePill}>
                            <Text style={styles.featurePillText}>🛡️ {route.longestQuietStretchMeters}m max gap</Text>
                          </View>
                        </>
                      )}
                      {route.profileType === 'balanced' && (
                        <>
                          <View style={styles.featurePill}>
                            <Text style={styles.featurePillText}>🛣️ {route.mainRoadPercentage}% main road</Text>
                          </View>
                          <View style={styles.featurePill}>
                            <Text style={styles.featurePillText}>⏱️ Balanced detour</Text>
                          </View>
                        </>
                      )}
                      {route.profileType === 'fastest' && (
                        <>
                          <View style={[styles.featurePill, styles.featurePillWarning]}>
                            <Text style={[styles.featurePillText, { color: '#f87171' }]}>
                              ⚠️ {route.longestQuietStretchMeters}m quiet stretch
                            </Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Evidence summary */}
                    <Text
                      style={[
                        styles.routeEvidenceText,
                        route.profileType === 'fastest' && styles.fastestEvidenceText,
                      ]}
                    >
                      {route.routeEvidence}
                    </Text>

                    {/* Describe Route & Watch Over Me Buttons on Selected Profile Card */}
                    {isSelected && (
                      <>
                        <Pressable
                          style={[
                            styles.describeRouteButton,
                            {
                              borderColor: profileColor,
                              backgroundColor:
                                route.profileType === 'safest'
                                  ? 'rgba(255, 138, 0, 0.12)'
                                  : route.profileType === 'balanced'
                                  ? 'rgba(56, 189, 248, 0.12)'
                                  : 'rgba(248, 113, 113, 0.12)',
                            },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            setShowDetail(true);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Describe route and factors for ${route.label}`}
                        >
                          <View style={styles.describeRouteLeft}>
                            <Text style={styles.describeRouteIcon}>📋</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.describeRouteTitle, { color: profileColor }]}>
                                Describe {route.label} Route
                              </Text>
                              <Text style={styles.describeRouteSubtitle}>
                                View all {routePlaces.length} POIs & safety factors taken into account
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.describeRouteChevron, { color: profileColor }]}>›</Text>
                        </Pressable>

                        {/* Watch Over Me Action on Selected Card */}
                        <Pressable
                          style={styles.watchOverMeCardBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            setIsWatchOverMeOpen(true);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Watch Over Me Live Trip Sharing & Guardian"
                        >
                          <View style={styles.describeRouteLeft}>
                            <Text style={styles.describeRouteIcon}>🛡️</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.watchOverMeTitle}>
                                Watch Over Me · Live Companion
                              </Text>
                              <Text style={styles.describeRouteSubtitle}>
                                Share live ETA on WhatsApp/SMS & alert contacts ({contacts.length} saved)
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.watchOverMeChevron}>›</Text>
                        </Pressable>
                      </>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>

          {/* "Describe Route & Breakdown" Bar */}
          {selectedRoute && (
            <Pressable
              style={styles.scoreExplanationBar}
              onPress={() => setShowDetail(true)}
            >
              <Text style={styles.chartIcon}>📊</Text>
              <View style={styles.explanationTextCol}>
                <View style={styles.explanationHeadingRow}>
                  <Text style={styles.explanationTitle}>
                    Why Score {selectedRoute.nightActivityScore}? Full Analysis & Places
                  </Text>
                  <Text style={styles.chevronIcon}>›</Text>
                </View>
                <Text style={styles.explanationBody}>
                  Tap to view lighting %, quiet gaps, and all categorized POIs along this path.
                </Text>
              </View>
            </Pressable>
          )}

          {/* Primary Action Button (Figma Frame 2:8317) */}
          {selectedRoute && (
            <Pressable
              style={[
                styles.startActionButton,
                {
                  backgroundColor:
                    ROUTE_COLORS_BY_PROFILE[selectedRoute.profileType] || '#ff8a00',
                },
              ]}
              onPress={() => setIsNavigating(true)}
            >
              <Text style={styles.startActionText}>
                Start {selectedRoute.label.toLowerCase()} journey
              </Text>
              <Text style={styles.startActionIcon}>➤</Text>
            </Pressable>
          )}

          {/* Safety Disclaimer */}
          <Text style={styles.disclaimerFooter}>
            Safer profile ≠ guaranteed safety. Scores indicate mapped nighttime activity indicators.
          </Text>
        </ScrollView>
      ) : (
        /* ACTIVE NAVIGATION MODE (Figma Frame 2:8497) */
        <View style={styles.navBottomCard}>
          <View style={styles.navProgressHeader}>
            <View>
              <Text style={styles.navTimeRemaining}>
                {selectedRoute.durationMinutes} <Text style={styles.navMinLabel}>min</Text>
              </Text>
              <Text style={styles.navDistRemaining}>
                {(selectedRoute.distanceMeters / 1000).toFixed(1)} km remaining
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.navArriveTime}>
                Arrive ~{formatArrival(selectedRoute.durationMinutes)}
              </Text>
              <Text style={styles.navScoreTag}>
                {selectedRoute.label} · {selectedRoute.nightActivityScore}/100
              </Text>
            </View>
          </View>

          {/* Quiet Stretch Banner */}
          {selectedRoute.longestQuietStretchMeters > 300 && (
            <View style={styles.navQuietNotice}>
              <Text style={styles.navNoticeIcon}>⚠️</Text>
              <Text style={styles.navNoticeText}>
                Upcoming {selectedRoute.longestQuietStretchMeters}m quiet stretch · Stay on main corridor
              </Text>
            </View>
          )}

          {/* Quick Actions (Share Journey, Report, SOS) */}
          <View style={styles.navActionsRow}>
            <Pressable
              style={styles.navActionBtn}
              onPress={handleShareJourney}
            >
              <Text style={styles.navActionIcon}>📤</Text>
              <Text style={styles.navActionLabel}>Share</Text>
            </Pressable>

            <Pressable
              style={styles.navActionBtn}
              onPress={() => setIsReportOpen(true)}
            >
              <Text style={styles.navActionIcon}>⚠️</Text>
              <Text style={styles.navActionLabel}>Report</Text>
            </Pressable>

            <Pressable
              style={[styles.navActionBtn, styles.navActionBtnEmergency]}
              onPress={() => {
                Alert.alert(
                  'Emergency Assistance',
                  'Call police emergency helpline (112)?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Call 112',
                      style: 'destructive',
                      onPress: () => void Linking.openURL('tel:112'),
                    },
                  ],
                );
              }}
            >
              <Text style={[styles.navActionIcon, { color: '#ef4444' }]}>🚨</Text>
              <Text style={[styles.navActionLabel, { color: '#ef4444', fontWeight: '800' }]}>
                SOS
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* DETAILED ROUTE ANALYSIS SHEET (Figma Section 6) */}
      {showDetail && selectedRoute && (
        <RouteDetailSheet
          route={selectedRoute}
          places={routePlaces}
          onClose={() => setShowDetail(false)}
          onStartNavigation={() => {
            setShowDetail(false);
            setIsNavigating(true);
          }}
        />
      )}

      {/* COMMUNITY SAFETY REPORT MODAL */}
      <SafetyReportModal
        visible={isReportOpen}
        coordinate={origin}
        onClose={() => setIsReportOpen(false)}
      />

      {/* LOCATION SEARCH MODAL (Re-search start or destination directly on compare page) */}
      <LocationSearchModal
        visible={isSearchOpen}
        initialField={searchField}
        startLabel={originName}
        startCoordinate={origin}
        destinationLabel={destinationName}
        destinationCoordinate={destination}
        onClose={() => setIsSearchOpen(false)}
        onSelectStart={(coord, name, fullAddress) => {
          if (coord) {
            setOrigin(coord);
            setOriginName(name || fullAddress);
          }
        }}
        onSelectDestination={(coord, name, fullAddress) => {
          setDestination(coord);
          setDestinationName(name || fullAddress);
        }}
      />

      {/* WATCH OVER ME MODAL */}
      {selectedRoute && (
        <WatchOverMeModal
          visible={isWatchOverMeOpen}
          onClose={() => setIsWatchOverMeOpen(false)}
          route={selectedRoute}
          destinationName={destinationName}
          originName={originName}
          originCoord={origin}
          destinationCoord={destination}
          openPlacesCount={
            routePlaces.filter(
              (p) =>
                p.is24_7 ||
                p.arrivalStatus === 'open_at_arrival' ||
                p.arrivalStatus === 'closing_soon' ||
                p.openAtJourneyTime === true,
            ).length
          }
          onActivateGuardian={() => {
            setIsGuardianActive(true);
            setIsNavigating(true);
          }}
        />
      )}

      {/* MANAGE CONTACTS MODAL */}
      <ManageContactsModal
        visible={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
      />

      {/* AUTONOMOUS SAFETY CHECK-IN / DEVIATION / STOPPAGE ALERT MODAL */}
      <SafetyCheckInModal
        visible={Boolean(activeAlert)}
        alertType={activeAlert}
        deviationMeters={deviationMeters}
        stoppedDurationMinutes={stoppedDurationMinutes}
        currentCoord={guardianCurrentCoord}
        destinationName={destinationName}
        primaryContact={primaryContact}
        onConfirmSafe={acknowledgeAlert}
        onSosTriggered={acknowledgeAlert}
      />

      {/* NAVIGATION SIDEBAR DRAWER (Slide-out menu with demo mode toggle) */}
      <NavigationSidebar
        visible={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isNavigating={isNavigating}
        isGuardianActive={isGuardianActive}
        contactsCount={contacts.length}
        onOpenContacts={() => setIsContactsModalOpen(true)}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
        onSimulateDeviation={simulateDeviation}
        onSimulateStoppage={simulateStoppage}
        onSimulateBatteryLow={simulateBatteryLow}
        onSimulateArrival={simulateArrival}
        onResetSimulation={acknowledgeAlert}
      />
    </SafeAreaView>
  );
}

function formatArrival(mins: number): string {
  const d = new Date(Date.now() + mins * 60 * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Styles (Figma tokens)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080a0c',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#11151a',
    borderBottomWidth: 1,
    borderBottomColor: '#2b3139',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e242c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: {
    color: '#f5f6f7',
    fontSize: 20,
    fontWeight: '700',
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f5f6f7',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#b0b7c0',
    marginTop: 2,
  },
  heatmapToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1e242c',
    borderWidth: 1,
    borderColor: '#30363e',
  },
  heatmapToggleActive: {
    backgroundColor: '#ff9400',
    borderColor: '#ff9400',
  },
  heatmapToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b0b7c0',
  },
  heatmapToggleTextActive: {
    color: '#080a0c',
    fontWeight: '700',
  },
  endNavButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#3b1c1c',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  endNavText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  dataStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#0c1014',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2228',
  },
  corridorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#11151a',
    borderBottomWidth: 1,
    borderBottomColor: '#20262e',
  },
  corridorEndpoints: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 10,
  },
  corridorEndpoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#181e26',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2b333e',
  },
  endpointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  endpointText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e5e7eb',
    flex: 1,
  },
  corridorArrow: {
    fontSize: 14,
    color: '#9ca3af',
  },
  changeLocBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#222933',
    borderWidth: 1,
    borderColor: '#ff8a00',
  },
  changeLocBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ff8a00',
  },
  dataDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dataStatusText: {
    fontSize: 9.5,
    color: '#b0b7c0',
    letterSpacing: 0.3,
  },
  mapContainer: {
    height: SCREEN_HEIGHT * 0.35,
    backgroundColor: '#0c1014',
    position: 'relative',
  },
  mapContainerNav: {
    height: SCREEN_HEIGHT * 0.52,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  heatmapLegend: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    backgroundColor: 'rgba(11, 15, 20, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#2b3139',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 8.5,
    color: '#b0b7c0',
    fontWeight: '600',
  },
  isolatedWarningPill: {
    position: 'absolute',
    right: 12,
    top: 12,
    backgroundColor: '#1f1313',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#f87171',
  },
  warningIcon: {
    fontSize: 11,
  },
  isolatedWarningText: {
    fontSize: 10,
    color: '#f87171',
    fontWeight: '600',
  },
  navManeuverBanner: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: '#11151a',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2b3139',
  },
  maneuverIcon: {
    fontSize: 28,
    color: '#ff8a00',
    marginRight: 14,
  },
  maneuverInfo: {
    flex: 1,
  },
  maneuverDist: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f5f6f7',
  },
  maneuverInstruction: {
    fontSize: 13,
    color: '#b0b7c0',
    marginTop: 2,
  },
  navAssistanceAheadPill: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    backgroundColor: '#11151a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#2b3139',
  },
  assistanceAheadIcon: {
    fontSize: 12,
  },
  assistanceAheadText: {
    fontSize: 10,
    color: '#f5f6f7',
    fontWeight: '600',
  },
  filterBarContainer: {
    backgroundColor: '#0e1217',
    borderBottomWidth: 1,
    borderBottomColor: '#232932',
    paddingVertical: 6,
  },
  filterBarContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#161b22',
    borderWidth: 1,
    borderColor: '#2d333b',
  },
  filterChipActive: {
    backgroundColor: '#262016',
    borderColor: '#ff9400',
  },
  filterChipText: {
    fontSize: 11,
    color: '#8b949e',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#ff9400',
    fontWeight: '700',
  },
  bottomSection: {
    flex: 1,
    backgroundColor: '#080a0c',
  },
  bottomScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  arrivalContextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  contextLeave: {
    fontSize: 11,
    color: '#b0b7c0',
  },
  contextArrive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f5f6f7',
  },
  routesCardsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#8b949e',
  },
  routeCard: {
    backgroundColor: '#11151a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2b3139',
    padding: 12,
  },
  routeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  routeDetailsCol: {
    flex: 1,
  },
  routeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  radioIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b434d',
  },
  routeProfileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f5f6f7',
  },
  routeTradeoff: {
    fontSize: 10,
    color: '#b0b7c0',
    backgroundColor: '#1e242c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  routeDurationText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f5f6f7',
  },
  routeDistanceText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#b0b7c0',
  },
  routeScoreBadge: {
    alignItems: 'flex-end',
  },
  scoreBigNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ff8a00',
  },
  scoreDenominator: {
    fontSize: 12,
    color: '#7e8996',
    fontWeight: '500',
  },
  scoreSubLabel: {
    fontSize: 9,
    color: '#7e8996',
    marginTop: -1,
  },
  badgePillRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  featurePill: {
    backgroundColor: '#181e25',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a323c',
  },
  featurePillWarning: {
    backgroundColor: '#261414',
    borderColor: '#542020',
  },
  featurePillText: {
    fontSize: 10,
    color: '#b0b7c0',
    fontWeight: '600',
  },
  routeEvidenceText: {
    fontSize: 11,
    color: '#b0b7c0',
    lineHeight: 15,
  },
  fastestEvidenceText: {
    color: '#fca5a5',
  },
  describeRouteButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  describeRouteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  describeRouteIcon: {
    fontSize: 18,
  },
  describeRouteTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  describeRouteSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  describeRouteChevron: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 6,
  },
  contactsTopBtn: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#161d26',
    borderWidth: 1,
    borderColor: '#293544',
  },
  contactsTopBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  watchOverMeCardBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ff8a00',
    backgroundColor: 'rgba(255, 138, 0, 0.12)',
  },
  watchOverMeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ff8a00',
  },
  watchOverMeChevron: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ff8a00',
    marginLeft: 6,
  },
  menuIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#1b222c',
    borderWidth: 1,
    borderColor: '#2b3644',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconBtnText: {
    fontSize: 16,
    color: '#e2e8f0',
    fontWeight: '700',
  },
  scoreExplanationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11151a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b3139',
    padding: 12,
    marginBottom: 14,
    gap: 12,
  },
  chartIcon: {
    fontSize: 20,
  },
  explanationTextCol: {
    flex: 1,
  },
  explanationHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ff8a00',
  },
  chevronIcon: {
    fontSize: 16,
    color: '#ff8a00',
    fontWeight: '700',
  },
  explanationBody: {
    fontSize: 10,
    color: '#7e8996',
    lineHeight: 14,
  },
  startActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  startActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#080a0c',
    textTransform: 'capitalize',
  },
  startActionIcon: {
    fontSize: 14,
    color: '#080a0c',
    fontWeight: '800',
  },
  disclaimerFooter: {
    fontSize: 9.5,
    color: '#55606d',
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 8,
  },
  navBottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#11151a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#2b3139',
    padding: 18,
    paddingBottom: 28,
  },
  navProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navTimeRemaining: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f5f6f7',
  },
  navMinLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b0b7c0',
  },
  navDistRemaining: {
    fontSize: 12,
    color: '#b0b7c0',
    marginTop: -2,
  },
  navArriveTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f5f6f7',
  },
  navScoreTag: {
    fontSize: 11,
    color: '#ff8a00',
    fontWeight: '600',
    marginTop: 2,
  },
  navQuietNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a10',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ff8a00',
  },
  navNoticeIcon: {
    fontSize: 11,
  },
  navNoticeText: {
    fontSize: 10,
    color: '#ffb347',
    fontWeight: '600',
    flex: 1,
  },
  navActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e242c',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2b3139',
  },
  navActionBtnEmergency: {
    backgroundColor: '#261313',
    borderColor: '#ef4444',
  },
  navActionIcon: {
    fontSize: 14,
  },
  navActionLabel: {
    fontSize: 12,
    color: '#f5f6f7',
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#11151a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2b3139',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f5f6f7',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#8b949e',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
  },
  backHomeBtn: {
    backgroundColor: '#ff9400',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backHomeBtnText: {
    color: '#080a0c',
    fontSize: 13,
    fontWeight: '800',
  },
});
