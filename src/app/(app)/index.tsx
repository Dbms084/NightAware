import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useLocation } from '@/features/location/hooks/useLocation';
import { NightAwareMap, OriginMarker, DestinationMarker, RoutePolyline } from '@/components/map';
import { DEMO_ORIGIN, DEMO_DESTINATION } from '@/data/mock-places';
import { MOCK_ROUTES, getRouteColor } from '@/data/mock-routes';
import { LocationSearchModal, type SearchField } from '@/components/ui/LocationSearchModal';
import { getRouteOptions, clearRouteCache } from '@/features/routes/services/route-provider';
import type { Coordinate, RouteOption } from '@/types/geo';

type TravelMode = 'Walking' | 'Cycling' | 'Driving';

const ORANGE = '#ff9400';
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAP_COLLAPSED_HEIGHT = 210;
const ANIMATION_DURATION = 350;
const EASING = Easing.bezier(0.2, 0.9, 0.3, 1);

type IconName = 'home' | 'account' | 'start' | 'walk' | 'bike' | 'car' | 'clock' | 'chevron' | 'moon' | 'routes' | 'info' | 'close' | 'search';

function Icon({ name, color = ORANGE, size = 24 }: { name: IconName; color?: string; size?: number }) {
  const u = size / 24;
  const line = (width: number, height: number, left: number, top: number, rotate = 0) => (
    <View style={{ position: 'absolute', width: width * u, height: height * u, left: left * u, top: top * u, borderRadius: 3 * u, backgroundColor: color, transform: [{ rotate: `${rotate}deg` }] }} />
  );
  const circle = (diameter: number, left: number, top: number, filled = false) => (
    <View style={{ position: 'absolute', width: diameter * u, height: diameter * u, left: left * u, top: top * u, borderRadius: diameter * u, borderWidth: filled ? 0 : 1.8 * u, borderColor: color, backgroundColor: filled ? color : 'transparent' }} />
  );

  let drawing;
  switch (name) {
    case 'home':
      drawing = <>{line(12, 2, 6, 4, 45)}{line(12, 2, 6, 4, -45)}<View style={{ position: 'absolute', left: 5 * u, top: 9 * u, width: 14 * u, height: 12 * u, borderColor: color, borderWidth: 1.8 * u, borderTopWidth: 0, borderBottomLeftRadius: 2 * u, borderBottomRightRadius: 2 * u }} />{line(2, 6, 11, 15)}</>;
      break;
    case 'account':
      drawing = <>{circle(22, 1, 1)}{circle(6, 9, 5)}<View style={{ position: 'absolute', left: 5 * u, top: 13 * u, width: 14 * u, height: 7 * u, borderColor: color, borderWidth: 1.6 * u, borderBottomWidth: 0, borderTopLeftRadius: 9 * u, borderTopRightRadius: 9 * u }} /></>;
      break;
    case 'start':
      drawing = <>{circle(20, 2, 2)}{circle(5, 9.5, 9.5, true)}</>;
      break;
    case 'walk':
      drawing = <>{circle(4, 10, 1, true)}{line(2, 8, 11, 6, 8)}{line(8, 1.7, 7, 9, -28)}{line(8, 1.7, 11, 9, 28)}{line(8, 1.7, 7, 14, 43)}{line(8, 1.7, 11, 14, -43)}</>;
      break;
    case 'bike':
      drawing = <>{circle(8, 1, 13)}{circle(8, 15, 13)}{line(8, 1.6, 6, 13, -55)}{line(8, 1.6, 9, 10, 45)}{line(8, 1.6, 10, 13, -55)}{line(5, 1.6, 13, 10, 0)}{line(4, 1.5, 5, 9, -20)}</>;
      break;
    case 'car':
      drawing = <>{line(15, 7, 4.5, 8, 0)}<View style={{ position: 'absolute', left: 6 * u, top: 4 * u, width: 12 * u, height: 7 * u, borderWidth: 1.6 * u, borderColor: color, borderTopLeftRadius: 5 * u, borderTopRightRadius: 5 * u }} />{line(18, 1.8, 3, 12)}{circle(4, 5, 16, true)}{circle(4, 15, 16, true)}</>;
      break;
    case 'clock':
      drawing = <>{circle(21, 1.5, 1.5)}{line(2, 7, 11, 5)}{line(2, 6, 11, 10)}</>;
      break;
    case 'chevron':
      drawing = <>{line(9, 1.8, 5, 10, 45)}{line(9, 1.8, 11, 10, -45)}</>;
      break;
    case 'moon':
      drawing = <Text style={{ color, fontSize: size * 0.9, lineHeight: size, includeFontPadding: false }}>☾</Text>;
      break;
    case 'routes':
      drawing = <>{circle(6, 1, 2)}{circle(6, 17, 2)}{circle(6, 9, 16)}{line(10, 1.8, 6, 4, 0)}{line(10, 1.8, 9, 14, -45)}{line(10, 1.8, 9, 8, 45)}</>;
      break;
    case 'info':
      drawing = <>{circle(22, 1, 1)}<Text style={{ position: 'absolute', left: 9 * u, top: 1 * u, color, fontSize: size * 0.75, fontWeight: '600', lineHeight: size, includeFontPadding: false }}>i</Text></>;
      break;
    case 'close':
      drawing = <>{line(18, 2, 3, 11, 45)}{line(18, 2, 3, 11, -45)}</>;
      break;
    case 'search':
      drawing = <>{circle(14, 1, 1)}{line(8, 2.2, 13, 14, 45)}</>;
      break;
  }

  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{drawing}</View>;
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const location = useLocation();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<TravelMode>('Walking');
  const [timeIndex, setTimeIndex] = useState(0);
  const times = ['Tonight, 22:10', 'Tonight, 22:30', 'Tomorrow, 06:30'];

  // Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchField, setSearchField] = useState<SearchField>('destination');
  const [customStartCoord, setCustomStartCoord] = useState<Coordinate | null>(null);
  const [customStartName, setCustomStartName] = useState<string | null>(null);
  const [customStartAddress, setCustomStartAddress] = useState<string | null>(null);
  const [destCoord, setDestCoord] = useState<Coordinate | null>(null);
  const [destName, setDestName] = useState('Home · 12th Main Road');
  const [destAddress, setDestAddress] = useState('');

  // Map expansion animation
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const expandProgress = useSharedValue(0);

  // Routes state
  const [routes, setRoutes] = useState<RouteOption[]>(MOCK_ROUTES);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  const hasGpsLocation = location.permissionStatus === 'granted' && location.coordinate != null;
  const isUsingCustomStart = customStartCoord != null;

  const originLabel = isUsingCustomStart
    ? (customStartName ?? 'Custom start')
    : hasGpsLocation
      ? (location.address ?? 'Current location')
      : 'Indiranagar Metro · Exit A';

  const originSubtext = isUsingCustomStart
    ? (customStartAddress ?? 'Custom starting point')
    : hasGpsLocation
      ? 'GPS · High accuracy'
      : location.error
        ? 'Location unavailable · tap to retry'
        : location.permissionStatus === 'denied'
          ? 'Location denied · tap to enable'
          : 'Tap to choose start location';

  const originCoord = isUsingCustomStart
    ? customStartCoord
    : hasGpsLocation
      ? location.coordinate!
      : DEMO_ORIGIN;

  const hasLocation = hasGpsLocation || isUsingCustomStart;
  const hasDestination = destCoord != null;
  // If user has location (GPS/custom start) and no destination chosen yet, don't fallback to Bangalore demo destination
  const destCoordFinal = destCoord ?? (hasLocation ? null : DEMO_DESTINATION);
  const isUsingRealData = hasLocation && hasDestination;
  const primaryRoute = routes.length > 0 ? routes[0] : null;

  // Dynamic map region: centers on current focus area or fits route
  const mapRegion = useMemo(() => {
    if (destCoordFinal) {
      const latDelta = Math.max(0.012, Math.abs(originCoord.latitude - destCoordFinal.latitude) * 1.6);
      const lngDelta = Math.max(0.012, Math.abs(originCoord.longitude - destCoordFinal.longitude) * 1.6);
      return {
        latitude: (originCoord.latitude + destCoordFinal.latitude) / 2,
        longitude: (originCoord.longitude + destCoordFinal.longitude) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
    }
    // No destination yet: focus directly on origin (user GPS or custom start)
    return {
      latitude: originCoord.latitude,
      longitude: originCoord.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
  }, [originCoord, destCoordFinal]);

  // Coordinates for NightAwareMap to automatically fit and center camera
  const coordinatesToFit = useMemo(() => {
    if (!destCoordFinal) return undefined;
    if (primaryRoute && primaryRoute.coordinates.length > 1) {
      return [originCoord, destCoordFinal, ...primaryRoute.coordinates];
    }
    return [originCoord, destCoordFinal];
  }, [originCoord, destCoordFinal, primaryRoute]);

  // Smooth full-screen map expansion animation
  const expandMap = useCallback(() => {
    setIsMapExpanded(true);
    expandProgress.value = withTiming(1, {
      duration: ANIMATION_DURATION,
      easing: EASING,
    });
  }, [expandProgress]);

  const collapseMap = useCallback(() => {
    expandProgress.value = withTiming(0, {
      duration: ANIMATION_DURATION - 50,
      easing: EASING,
    });
    setTimeout(() => {
      setIsMapExpanded(false);
    }, ANIMATION_DURATION - 40);
  }, [expandProgress]);

  // Handle Android back button when map is expanded
  useEffect(() => {
    if (!isMapExpanded) return;
    const backAction = () => {
      collapseMap();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isMapExpanded, collapseMap]);

  const animatedExpandedStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    transform: [
      {
        translateY: interpolate(
          expandProgress.value,
          [0, 1],
          [SCREEN_HEIGHT * 0.4, 0],
        ),
      },
      {
        scale: interpolate(
          expandProgress.value,
          [0, 1],
          [0.94, 1],
        ),
      },
    ],
  }));

  // Handle start selection from Uber-style modal
  const handleSelectStart = useCallback(
    (coord: Coordinate | null, name: string, fullAddress: string) => {
      setCustomStartCoord(coord);
      setCustomStartName(coord ? name : null);
      setCustomStartAddress(coord ? fullAddress : null);
      clearRouteCache();
    },
    [],
  );

  // Handle destination selection from Uber-style modal
  const handleSelectDestination = useCallback(
    (coord: Coordinate, name: string, fullAddress: string) => {
      setDestCoord(coord);
      setDestName(name);
      setDestAddress(fullAddress);
      clearRouteCache();
    },
    [],
  );

  // Fetch real routes whenever origin, destination, or mode changes
  useEffect(() => {
    if (!hasLocation || !destCoord) {
      if (hasLocation && !destCoord) {
        setRoutes([]);
      } else {
        setRoutes(MOCK_ROUTES);
      }
      setIsLoadingRoutes(false);
      return;
    }

    let cancelled = false;
    setIsLoadingRoutes(true);

    const modeMap: Record<TravelMode, 'walking' | 'cycling' | 'driving'> = {
      Walking: 'walking',
      Cycling: 'cycling',
      Driving: 'driving',
    };

    void getRouteOptions({
      origin: originCoord,
      destination: destCoord,
      departureTime: new Date(),
      travelMode: modeMap[mode],
    })
      .then((fetched) => {
        if (!cancelled) {
          setRoutes(fetched.length > 0 ? fetched : MOCK_ROUTES);
          setIsLoadingRoutes(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoutes(MOCK_ROUTES);
          setIsLoadingRoutes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasLocation, destCoord, mode, originCoord]);

  // Navigate to compare screen with real coordinates
  const handleCompare = useCallback(() => {
    if (hasLocation && destCoord) {
      router.push(
        `/compare?olat=${originCoord.latitude}&olng=${originCoord.longitude}&dlat=${destCoord.latitude}&dlng=${destCoord.longitude}&mode=${mode}` as never,
      );
    } else {
      router.push('/compare' as never);
    }
  }, [hasLocation, destCoord, originCoord, mode, router]);

  return (
    <SafeAreaView className="flex-1 bg-[#090b0d]" style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Main planner content */}
      <ScrollView
        className="flex-1"
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="bg-[#111519] px-5 pb-4 pt-5">
          <View className="mb-9 flex-row items-center justify-between">
            <View>
              <Text className="text-[32px] leading-[40px] text-[#f5f5f3]">Where to tonight?</Text>
              <Text className="mt-1 text-[18px] text-[#aab2bb]">
                {hasLocation ? (location.address?.split(',').slice(-3, -1).join(',').trim() ?? 'Your area') : 'Bengaluru · Indiranagar'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Account ${user?.email ?? ''}; sign out`}
              className="min-h-12 min-w-12 items-center justify-center"
              onPress={() =>
                Alert.alert('Account', user?.email ?? 'Signed in', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
                ])
              }
            >
              <Icon name="account" color="#aab2bb" size={32} />
            </Pressable>
          </View>

          {isUsingRealData ? (
            <View className="flex-row items-center gap-3">
              <View className="h-2.5 w-2.5 rounded-full bg-[#4ADE80]" />
              <Text className="text-base tracking-wide text-[#b0b7c0]">LIVE · High precision GPS + live routes</Text>
            </View>
          ) : (
            <View className="flex-row items-center gap-3">
              <View className="h-2.5 w-2.5 rounded-full bg-[#ff9400]" />
              <Text className="text-base tracking-wide text-[#b0b7c0]">DEMO JOURNEY · Tap destination to search</Text>
            </View>
          )}
        </View>

        <View className="px-5 pt-5">
          {/* START Point Card (Tap opens Uber/Google Maps style search) */}
          <Pressable
            className="mb-4 min-h-[118px] flex-row items-center rounded-2xl border border-[#30363e] bg-[#111519] px-5 py-4 active:border-[#4ADE80]"
            onPress={() => {
              setSearchField('start');
              setIsSearchOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Start point: ${originLabel}`}
          >
            <View className="mr-4 w-9 items-center"><Icon name="start" size={28} /></View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="mb-1 text-base text-[#85909b]">START</Text>
                <Text className="text-xs font-semibold text-[#4ADE80]">CHANGE</Text>
              </View>
              <Text className="text-[20px] text-[#f1f2f1]" numberOfLines={2}>{originLabel}</Text>
              <Text className="mt-1 text-base text-[#aab2bb]">{originSubtext}</Text>
            </View>
            <View className="ml-2 items-center gap-2">
              <Icon name="search" color="#4ADE80" size={20} />
              {hasGpsLocation && !isUsingCustomStart && (
                <View className="h-2.5 w-2.5 rounded-full bg-[#4ADE80]" />
              )}
            </View>
          </Pressable>

          {/* DESTINATION Card (Tap opens Uber/Google Maps style search) */}
          <Pressable
            className="mb-5 min-h-[104px] flex-row items-center rounded-2xl border border-[#30363e] bg-[#111519] px-5 py-4 active:border-[#ff9400]"
            onPress={() => {
              setSearchField('destination');
              setIsSearchOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Tap to search destination"
          >
            <View className="mr-4 w-9 items-center"><Icon name="home" size={27} /></View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="mb-1 text-base text-[#85909b]">DESTINATION</Text>
                <Text className="text-xs font-semibold text-[#ff9400]">CHANGE</Text>
              </View>
              <Text className="text-[20px] text-[#f1f2f1]" numberOfLines={1}>{destName}</Text>
              {destAddress ? (
                <Text className="mt-1 text-xs text-[#85909b]" numberOfLines={1}>{destAddress}</Text>
              ) : (
                <Text className="mt-1 text-xs text-[#4ADE80]">Tap to search like Google Maps</Text>
              )}
            </View>
            <View className="ml-2">
              <Icon name="search" color="#ff9400" size={20} />
            </View>
          </Pressable>

          {/* Travel mode selector */}
          <View className="mb-5 flex-row gap-3">
            {(['Walking', 'Cycling', 'Driving'] as TravelMode[]).map((item) => {
              const selected = mode === item;
              const icon: IconName = item === 'Walking' ? 'walk' : item === 'Cycling' ? 'bike' : 'car';
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => { setMode(item); clearRouteCache(); }}
                  className={`min-h-[54px] flex-1 flex-row items-center justify-center gap-2 rounded-full border px-3 ${
                    selected ? 'border-[#ff9400] bg-[#241a10]' : 'border-[#30363e] bg-[#1a1f24]'
                  }`}
                >
                  <Icon name={icon} size={20} color={selected ? ORANGE : '#aab2bb'} />
                  <Text className={`text-base font-semibold ${selected ? 'text-[#ff9400]' : 'text-[#b0b7c0]'}`}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Departure time picker */}
          <Pressable
            accessibilityRole="button"
            onPress={() => setTimeIndex((timeIndex + 1) % times.length)}
            className="mb-8 rounded-[28px] border border-[#30363e] bg-[#111519] px-5 py-5"
          >
            <View className="flex-row items-center">
              <Icon name="clock" size={26} />
              <Text className="ml-4 flex-1 text-[21px] text-[#f1f2f1]">Leave now</Text>
              <Text className="text-[20px] text-[#f1f2f1]">{times[timeIndex]}</Text>
              <View className="ml-3"><Icon name="chevron" color="#aab2bb" size={17} /></View>
            </View>
            <Text className="mt-4 text-[18px] leading-7 text-[#aab2bb]">
              We estimate what will still be open when you pass, not just what's open now.
            </Text>
          </Pressable>

          {/* Evening route header + View Map Button */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-[24px] text-[#f1f2f1]">Your evening route</Text>
            <Pressable
              accessibilityRole="button"
              onPress={expandMap}
              style={styles.viewMapButton}
            >
              <Text style={styles.viewMapText}>View map ↗</Text>
            </Pressable>
          </View>

          {/* Collapsed inline map card */}
          <View className="mb-8 overflow-hidden rounded-[28px] border border-[#30363e] bg-[#111519]">
            <View style={{ height: MAP_COLLAPSED_HEIGHT, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', backgroundColor: '#0b1014' }}>
              <NightAwareMap
                showUserLocation={hasGpsLocation}
                region={mapRegion}
                coordinatesToFit={coordinatesToFit}
                fitPadding={{ top: 25, right: 25, bottom: 25, left: 25 }}
                style={{ flex: 1 }}
                accessibilityLabel="Route preview map"
              >
                {primaryRoute && (
                  <RoutePolyline
                    coordinates={primaryRoute.coordinates}
                    color={primaryRoute.isMock ? getRouteColor(primaryRoute.id) : '#ff9400'}
                    selected
                  />
                )}
                <OriginMarker coordinate={originCoord} title={originLabel} />
                {destCoordFinal && <DestinationMarker coordinate={destCoordFinal} title={destName} />}
              </NightAwareMap>
            </View>
            <Pressable onPress={expandMap} className="flex-row items-center px-5 py-4">
              <Icon name="moon" size={23} />
              <Text className="ml-4 flex-1 text-[18px] text-[#b0b7c0]">
                {isLoadingRoutes
                  ? 'Computing best routes...'
                  : destCoordFinal
                    ? `After-dark ${mode.toLowerCase()} · ${routes.length} route${routes.length !== 1 ? 's' : ''} available`
                    : 'Choose destination to view night routes'}
              </Text>
              <Text style={{ color: '#ff9400', fontSize: 14, fontWeight: '600' }}>Expand</Text>
            </Pressable>
          </View>

          {/* Compare routes action button */}
          <Pressable
            accessibilityRole="button"
            className="min-h-[80px] flex-row items-center justify-center gap-3 rounded-2xl bg-[#ff9400] active:opacity-80"
            onPress={handleCompare}
          >
            <Text className="text-[22px] font-medium text-[#101214]">Compare routes</Text>
            <Icon name="routes" color="#101214" size={25} />
          </Pressable>

          <View className="mt-7 flex-row items-center px-1">
            <Icon name="info" color="#84909c" size={22} />
            <Text className="ml-3 flex-1 text-base leading-6 text-[#84909c]">
              Activity indicators, not a safety guarantee.{' '}
              {isUsingRealData ? 'Live Google Maps Routes & Places data.' : 'Demo data may be incomplete.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* FULL-SCREEN EXPANDED MAP OVERLAY */}
      {isMapExpanded && (
        <Animated.View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, styles.expandedContainer, animatedExpandedStyle]}
        >
          {/* Full Screen Map */}
          <NightAwareMap
            showUserLocation={hasGpsLocation}
            region={mapRegion}
            coordinatesToFit={coordinatesToFit}
            fitPadding={{ top: 90, right: 35, bottom: 210, left: 35 }}
            style={styles.fullScreenMap}
            accessibilityLabel="Full-screen expanded evening route map"
          >
            {routes.map((route, i) => (
              <RoutePolyline
                key={route.id}
                coordinates={route.coordinates}
                color={route.isMock ? getRouteColor(route.id) : ['#ff9400', '#38BDF8', '#F87171', '#A78BFA', '#34D399'][i % 5]}
                selected={i === 0}
                zIndex={routes.length - i}
              />
            ))}
            <OriginMarker coordinate={originCoord} title={originLabel} />
            {destCoordFinal && <DestinationMarker coordinate={destCoordFinal} title={destName} />}
          </NightAwareMap>

          {/* Floating Top Controls */}
          <View pointerEvents="box-none" style={[styles.topControls, { top: insets.top + 12 }]}>
            <View style={styles.topPill}>
              <View style={styles.liveDot} />
              <Text style={styles.topPillText} numberOfLines={1}>
                {destName}
              </Text>
            </View>

            <Pressable
              onPress={collapseMap}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={styles.closeMapButton}
              accessibilityRole="button"
              accessibilityLabel="Close expanded map"
            >
              <Text style={styles.closeMapText}>✕ Close</Text>
            </Pressable>
          </View>

          {/* Floating Bottom Card on Expanded Map */}
          <View pointerEvents="auto" style={[styles.bottomControls, { bottom: insets.bottom + 16 }]}>
            <View style={styles.expandedStatsRow}>
              <View>
                <Text style={styles.expandedLabel}>PRIMARY ROUTE</Text>
                <Text style={styles.expandedTitle}>{primaryRoute?.label || (destCoordFinal ? 'Recommended' : 'Your area')}</Text>
                <Text style={styles.expandedSub}>
                  {primaryRoute
                    ? `${primaryRoute.durationMinutes} min · ${(primaryRoute.distanceMeters / 1000).toFixed(1)} km`
                    : 'Choose destination to compare'}
                </Text>
              </View>
              {primaryRoute?.nightActivityScore != null && (
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreValue}>{primaryRoute.nightActivityScore}</Text>
                  <Text style={styles.scoreSub}>SCORE</Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => {
                collapseMap();
                handleCompare();
              }}
              style={styles.expandedCompareBtn}
              accessibilityRole="button"
            >
              <Text style={styles.expandedCompareText}>Compare all {routes.length} routes →</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Uber / Google Maps style Location Search Modal (handles both Start & Destination) */}
      <LocationSearchModal
        visible={isSearchOpen}
        initialField={searchField}
        startLabel={originLabel}
        startCoordinate={originCoord}
        destinationLabel={destName}
        destinationCoordinate={destCoord}
        userGpsCoordinate={location.coordinate}
        userGpsAddress={location.address}
        onClose={() => setIsSearchOpen(false)}
        onSelectStart={handleSelectStart}
        onSelectDestination={handleSelectDestination}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090b0d' },
  scrollContent: { paddingBottom: 32 },

  viewMapButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#241a10',
    borderWidth: 1,
    borderColor: '#ff9400',
  },
  viewMapText: {
    color: '#ff9400',
    fontSize: 15,
    fontWeight: '600',
  },

  // Expanded Map
  expandedContainer: {
    zIndex: 999,
    backgroundColor: '#090b0d',
  },
  fullScreenMap: {
    ...StyleSheet.absoluteFill,
  },
  topControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 21, 25, 0.92)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#30363e',
    maxWidth: '65%',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginRight: 8,
  },
  topPillText: {
    color: '#f1f2f1',
    fontSize: 14,
    fontWeight: '600',
  },
  closeMapButton: {
    backgroundColor: 'rgba(17, 21, 25, 0.95)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ff9400',
    elevation: 6,
  },
  closeMapText: {
    color: '#ff9400',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(17, 21, 25, 0.96)',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363e',
    elevation: 8,
    zIndex: 10,
  },
  expandedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  expandedLabel: {
    color: '#85909b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  expandedTitle: {
    color: '#f1f2f1',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 2,
  },
  expandedSub: {
    color: '#aab2bb',
    fontSize: 14,
    marginTop: 2,
  },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#ff9400',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    color: '#ff9400',
    fontSize: 18,
    fontWeight: '800',
  },
  scoreSub: {
    color: '#aab2bb',
    fontSize: 8,
    fontWeight: '700',
  },
  expandedCompareBtn: {
    backgroundColor: '#ff9400',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedCompareText: {
    color: '#101214',
    fontSize: 16,
    fontWeight: '700',
  },
});
