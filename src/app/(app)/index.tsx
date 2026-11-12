import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  Modal,
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
} from 'react-native-reanimated';

import { useLocation } from '@/features/location/hooks/useLocation';
import { NightAwareMap, OriginMarker, DestinationMarker, PlaceMarker, RoutePolyline } from '@/components/map';
import { LocationSearchModal, type SearchField } from '@/components/ui/LocationSearchModal';
import { getRouteOptions, clearRouteCache, ROUTE_COLORS_BY_PROFILE } from '@/features/routes/services/route-provider';
import { getPlacesNearRoute } from '@/features/places/services/place-provider';
import { RouteCardSkeleton } from '@/components/ui/Skeleton';
import { formatDuration } from '@/utils/format-time';
import type { Coordinate, Place, RouteOption } from '@/types/geo';

type TravelMode = 'Walking' | 'Cycling' | 'Driving';

const ORANGE = '#ff9400';
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAP_COLLAPSED_HEIGHT = 210;
const ANIMATION_DURATION = 350;
const EASING = Easing.bezier(0.2, 0.9, 0.3, 1);

type IconName = 'home' | 'account' | 'start' | 'walk' | 'bike' | 'car' | 'clock' | 'chevron' | 'moon' | 'routes' | 'info' | 'close' | 'search';

function formatDateLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  const datePart = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  if (diffDays === 0) return `Today, ${datePart}`;
  if (diffDays === 1) return `Tomorrow, ${datePart}`;
  return datePart;
}

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
  const router = useRouter();
  const location = useLocation();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<TravelMode>('Walking');
  const [isCustomTimeSet, setIsCustomTimeSet] = useState(false);
  const [departureTime, setDepartureTime] = useState<Date>(() => new Date());

  // Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchField, setSearchField] = useState<SearchField>('destination');
  const [customStartCoord, setCustomStartCoord] = useState<Coordinate | null>(null);
  const [customStartName, setCustomStartName] = useState<string | null>(null);
  const [customStartAddress, setCustomStartAddress] = useState<string | null>(null);
  const [destCoord, setDestCoord] = useState<Coordinate | null>(null);
  const [destName, setDestName] = useState<string | null>(null);
  const [destAddress, setDestAddress] = useState<string | null>(null);

  // Map expansion animation
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const expandProgress = useSharedValue(0);

  // Routes state — start empty with no defaults
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routePlaces, setRoutePlaces] = useState<Place[]>([]);

  // ---------------------------------------------------------------------------
  // Custom departure date & time picker
  // ---------------------------------------------------------------------------
  // The modal holds its own working copy of the selected date, hour and minute.
  // It is only committed to the authoritative `departureTime` state on Confirm,
  // so Cancel (or tapping outside) never mutates the journey. The working copy
  // is seeded from the currently-selected departure so the modal reflects the
  // current choice when it reopens.
  const [isCustomTimeOpen, setIsCustomTimeOpen] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [customHour, setCustomHour] = useState<number>(0);
  const [customMinute, setCustomMinute] = useState<number>(0);
  const [customTimeError, setCustomTimeError] = useState<string | null>(null);
  // FlatList refs keep the scroll position stable when the modal reopens and
  // avoid recreating the underlying view list on every keystroke/render.
  const hourListRef = useRef<FlatList<number>>(null);
  const minuteListRef = useRef<FlatList<number>>(null);
  const dateListRef = useRef<FlatList<Date>>(null);

  const HOUR_ITEMS = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const MINUTE_ITEMS = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  // Generate a 7-day date range (today + 6 days ahead) so users can pick any
  // upcoming departure date, not just the three hardcoded presets.
  const DATE_ITEMS = useMemo(() => {
    const today = new Date();
    const items: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      items.push(d);
    }
    return items;
  }, []);

  const openCustomTimeModal = useCallback(() => {
    // Seed the modal with the currently-selected departure time (or current time if leaving now)
    const now = new Date();
    const seed = isCustomTimeSet && departureTime.getTime() > now.getTime() ? departureTime : now;
    setCustomDate(new Date(seed));
    setCustomHour(seed.getHours());
    setCustomMinute(seed.getMinutes());
    setCustomTimeError(null);
    setIsCustomTimeOpen(true);
  }, [isCustomTimeSet, departureTime]);

  const shiftCustomDate = useCallback(
    (deltaDays: number) => {
      setCustomDate((prev) => {
        const base = prev ?? departureTime;
        const next = new Date(base);
        next.setDate(next.getDate() + deltaDays);
        return next;
      });
    },
    [departureTime],
  );

  const confirmCustomTime = useCallback(() => {
    if (!customDate) return;
    // Reject any departure in the past (or within the current minute), so the
    // journey engine never scores a trip that has already departed.
    const now = new Date();
    const minAllowed = new Date(now.getTime() + 60 * 1000);
    const candidate = new Date(
      customDate.getFullYear(),
      customDate.getMonth(),
      customDate.getDate(),
      customHour,
      customMinute,
      0,
      0,
    );
    if (candidate.getTime() < minAllowed.getTime()) {
      setCustomTimeError('Please choose a departure at least 1 minute from now.');
      return;
    }
    setCustomTimeError(null);
    setCustomDate(candidate);
    setIsCustomTimeSet(true);
    setDepartureTime(candidate);
    setIsCustomTimeOpen(false);
  }, [customDate, customHour, customMinute]);

  const cancelCustomTime = useCallback(() => {
    setCustomTimeError(null);
    setIsCustomTimeOpen(false);
  }, []);

  // When the custom-time modal opens, scroll both FlatLists so the currently
  // selected hour and minute are immediately visible instead of sitting at the
  // top of the list. The refs are only available after the FlatLists have
  // mounted, so this runs after the modal's views are committed.
  useEffect(() => {
    if (!isCustomTimeOpen) return;
    const hourRef = hourListRef.current;
    const minuteRef = minuteListRef.current;
    const dateRef = dateListRef.current;
    // FlatList ref methods may be null on first paint; retry once on mount.
    const timer = setInterval(() => {
      let progressed = false;
      if (dateRef && customDate) {
        const dateIdx = DATE_ITEMS.findIndex(
          (d) =>
            d.getFullYear() === customDate.getFullYear() &&
            d.getMonth() === customDate.getMonth() &&
            d.getDate() === customDate.getDate(),
        );
        if (dateIdx >= 0) {
          dateRef.scrollToIndex({ index: dateIdx, animated: false });
          progressed = true;
        }
      }
      if (hourRef && customHour >= 0 && customHour < HOUR_ITEMS.length) {
        hourRef.scrollToIndex({ index: customHour, animated: false });
        progressed = true;
      }
      if (minuteRef && customMinute >= 0 && customMinute < MINUTE_ITEMS.length) {
        minuteRef.scrollToIndex({ index: customMinute, animated: false });
        progressed = true;
      }
      if (progressed) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [isCustomTimeOpen, customDate, customHour, customMinute, DATE_ITEMS]);

  const selectedDepartureLabel = useMemo(() => {
    if (isCustomTimeSet) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const departureDay = new Date(departureTime);
      departureDay.setHours(0, 0, 0, 0);
      const diffDays = Math.round((departureDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      const timeStr = departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (diffDays === 0) {
        return `Today, ${timeStr}`;
      }
      if (diffDays === 1) {
        return `Tomorrow, ${timeStr}`;
      }
      const datePart = departureTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${datePart}, ${timeStr}`;
    }
    return 'Now';
  }, [isCustomTimeSet, departureTime]);

  const hasGpsLocation = location.permissionStatus === 'granted' && location.coordinate != null;
  const isUsingCustomStart = customStartCoord != null;

  const originLabel = isUsingCustomStart
    ? (customStartName ?? 'Custom start')
    : hasGpsLocation
      ? (location.address ?? 'Current location')
      : 'Set starting point';

  const originSubtext = isUsingCustomStart
    ? (customStartAddress ?? 'Custom starting point')
    : hasGpsLocation
      ? 'GPS · High accuracy'
      : location.error
        ? 'Location unavailable · tap to set'
        : location.permissionStatus === 'denied'
          ? 'Location denied · tap to set'
          : 'Tap to choose starting point';

  const originCoord = isUsingCustomStart
    ? customStartCoord
    : hasGpsLocation
      ? location.coordinate!
      : null;

  const hasLocation = hasGpsLocation || isUsingCustomStart;
  const hasDestination = destCoord != null;
  const destCoordFinal = destCoord;
  const isUsingRealData = hasLocation && hasDestination;
  const primaryRoute = routes.length > 0 ? routes[0] : null;

  // Active establishments along primary route or starting point:
  // Prefer dynamically fetched places, but immediately fall back to primaryRoute.establishments
  // so the map never flashes blank while computing.
  const displayedPlaces = useMemo(() => {
    if (routePlaces && routePlaces.length > 0) return routePlaces;
    if (primaryRoute?.establishments && primaryRoute.establishments.length > 0) {
      return primaryRoute.establishments;
    }
    return [];
  }, [routePlaces, primaryRoute]);

  // Fetch POIs along route or around starting location
  useEffect(() => {
    if (!originCoord) return;
    // Pre-seed immediately with the route's already-calculated establishments
    if (primaryRoute?.establishments && primaryRoute.establishments.length > 0) {
      setRoutePlaces(primaryRoute.establishments);
    }
    let isMounted = true;
    const coords = primaryRoute ? primaryRoute.coordinates : [originCoord, originCoord];
    void getPlacesNearRoute(coords, 280, originLabel, destName ?? undefined).then((places) => {
      if (isMounted && places && places.length > 0) {
        setRoutePlaces(places);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [originCoord, primaryRoute?.id, originLabel, destName]);

  // Dynamic map region: centers on current focus area or fits route
  const mapRegion = useMemo(() => {
    if (originCoord && destCoordFinal) {
      const latDelta = Math.max(0.012, Math.abs(originCoord.latitude - destCoordFinal.latitude) * 1.6);
      const lngDelta = Math.max(0.012, Math.abs(originCoord.longitude - destCoordFinal.longitude) * 1.6);
      return {
        latitude: (originCoord.latitude + destCoordFinal.latitude) / 2,
        longitude: (originCoord.longitude + destCoordFinal.longitude) / 2,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      };
    }
    if (originCoord) {
      return {
        latitude: originCoord.latitude,
        longitude: originCoord.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };
    }
    return {
      latitude: 22.5726,
      longitude: 88.3639,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }, [originCoord, destCoordFinal]);

  // Coordinates for NightAwareMap to automatically fit and center camera
  const coordinatesToFit = useMemo(() => {
    if (!originCoord || !destCoordFinal) return undefined;
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
      setRoutePlaces([]);
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
      setRoutePlaces([]);
      clearRouteCache();
    },
    [],
  );

  // Fetch real routes whenever origin, destination, mode, or departure time
  // changes. The selected departure time is forwarded so the scoring engine
  // can evaluate opening hours at the time the user actually travels.
  useEffect(() => {
    if (!originCoord || !destCoord) {
      setRoutes([]);
      setIsLoadingRoutes(false);
      setRouteError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingRoutes(true);
    setRouteError(null);

    const modeMap: Record<TravelMode, 'walking' | 'cycling' | 'driving'> = {
      Walking: 'walking',
      Cycling: 'cycling',
      Driving: 'driving',
    };

    void getRouteOptions({
      origin: originCoord,
      destination: destCoord,
      departureTime,
      travelMode: modeMap[mode],
      originName: originLabel,
      destinationName: destName ?? undefined,
    })
      .then((fetched) => {
        if (!cancelled) {
          setRoutes(fetched);
          setIsLoadingRoutes(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoutes([]);
          setRouteError('Routing unavailable. Please try again.');
          setIsLoadingRoutes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [originCoord, destCoord, mode, departureTime]);

  // Navigate to compare screen with the actual selected coordinates.
  // The selected departure time is forwarded so the comparison screen can
  // compute arrival times consistent with the scoring engine.
  const handleCompare = useCallback(() => {
    if (!originCoord || !destCoord) {
      Alert.alert(
        'Missing location',
        'Please select a starting point and a destination before comparing routes.',
      );
      return;
    }

    const onameParam = encodeURIComponent(originLabel || 'Starting Point');
    const dnameParam = encodeURIComponent(destName || 'Selected Destination');

    router.push(
      `/compare?olat=${originCoord.latitude}&olng=${originCoord.longitude}&dlat=${destCoord.latitude}&dlng=${destCoord.longitude}&mode=${mode}&departure=${departureTime.toISOString()}&oname=${onameParam}&dname=${dnameParam}` as never,
    );
  }, [originCoord, destCoord, originLabel, destName, mode, departureTime, router]);

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
                {hasLocation ? (location.address?.split(',').slice(-3, -1).join(',').trim() ?? 'Your area') : 'Set start & destination'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="NightAware Account"
              className="min-h-12 min-w-12 items-center justify-center"
              onPress={() =>
                Alert.alert('NightAware', 'Women\'s Night Route Companion')
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
                <Text className="text-xs font-semibold text-[#ff9400]">{destName ? 'CHANGE' : 'SEARCH'}</Text>
              </View>
              <Text className="text-[20px] text-[#f1f2f1]" numberOfLines={1}>
                {destName || 'Where to tonight?'}
              </Text>
              {destAddress ? (
                <Text className="mt-1 text-xs text-[#85909b]" numberOfLines={1}>{destAddress}</Text>
              ) : (
                <Text className="mt-1 text-xs text-[#4ADE80]">Tap to search destination anywhere</Text>
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
          <View className="mb-8 rounded-[28px] border border-[#30363e] bg-[#111519] px-5 py-5">
            <View className="flex-row items-center">
              <Icon name="clock" size={26} />
              <Text className="ml-4 flex-1 text-[21px] text-[#f1f2f1]">Leave now</Text>
              <Text className="text-[20px] text-[#f1f2f1]">{selectedDepartureLabel}</Text>
              <View className="ml-3"><Icon name="chevron" color="#aab2bb" size={17} /></View>
            </View>
            <Text className="mt-4 text-[18px] leading-7 text-[#aab2bb]">
              We estimate what will still be open when you pass, not just what's open now.
            </Text>

            {/* Custom date & time — opens a modal with calendar + scrollable time. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose a custom departure date and time"
              onPress={openCustomTimeModal}
              className="mt-4 min-h-[48px] flex-row items-center justify-center gap-2 rounded-full border border-dashed border-[#ff9400]/60 bg-[#241a10]/60 py-2"
            >
              <Icon name="clock" color="#ff9400" size={18} />
              <Text className="text-base font-semibold text-[#ff9400]">Custom Date &amp; Time</Text>
            </Pressable>
          </View>

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
                    color={ROUTE_COLORS_BY_PROFILE[primaryRoute.profileType] || '#ff8a00'}
                    selected
                  />
                )}
                {displayedPlaces.map((place) => (
                  <PlaceMarker key={place.id} place={place} />
                ))}
                {originCoord && <OriginMarker coordinate={originCoord} title={originLabel} />}
                {destCoord && <DestinationMarker coordinate={destCoord} title={destName ?? 'Destination'} />}
              </NightAwareMap>
            </View>
            <Pressable onPress={expandMap} className="flex-row items-center px-5 py-4">
              <Icon name="moon" size={23} />
              <Text className="ml-4 flex-1 text-[18px] text-[#b0b7c0]">
                {isLoadingRoutes
                  ? 'Computing best routes...'
                  : destCoord
                    ? `After-dark ${mode.toLowerCase()} · ${routes.length} route${routes.length !== 1 ? 's' : ''} available`
                    : 'Choose destination to view night routes'}
              </Text>
              <Text style={{ color: '#ff9400', fontSize: 14, fontWeight: '600' }}>Expand</Text>
            </Pressable>
          </View>

          {/* SKELETON LOADING STATE WHEN CALCULATING ROUTES */}
          {isLoadingRoutes && (
            <View className="mb-6">
              <RouteCardSkeleton />
            </View>
          )}

          {/* ROUTE ERROR STATE — shown when Valhalla fails or returns no routes.
              No fabricated or mock recommendations are ever displayed. */}
          {routeError && !isLoadingRoutes && (
            <View className="mb-6 flex-row items-center rounded-2xl border border-[#f87171]/40 bg-[#2a1414] px-5 py-4">
              <Icon name="info" color="#f87171" size={22} />
              <Text className="ml-3 flex-1 text-base text-[#f1f2f1]">{routeError}</Text>
            </View>
          )}

          {/* EMPTY ROUTE STATE — routing succeeded but produced no alternatives. */}
          {!isLoadingRoutes && !routeError && routes.length === 0 && hasLocation && hasDestination && (
            <View className="mb-6 flex-row items-center rounded-2xl border border-[#30363e] bg-[#111519] px-5 py-4">
              <Icon name="moon" color="#aab2bb" size={22} />
              <Text className="ml-3 flex-1 text-base text-[#b0b7c0]">
                No night routes available for this journey right now.
              </Text>
            </View>
          )}

          {/* Compare routes action button */}
          <Pressable
            accessibilityRole="button"
            className="min-h-[80px] flex-row items-center justify-center gap-3 rounded-2xl bg-[#ff9400] active:opacity-80"
            onPress={handleCompare}
          >
            <Text className="text-[22px] font-bold text-[#101214]">
              Compare routes
            </Text>
            <Icon name="routes" color="#101214" size={25} />
          </Pressable>

          {/* <View className="mt-7 flex-row items-center px-1">
            <Icon name="info" color="#84909c" size={22} />
            <Text className="ml-3 flex-1 text-base leading-6 text-[#84909c]">
              Activity indicators, not a safety guarantee.{' '}
              {isUsingRealData ? 'Valhalla routing + OpenStreetMap POIs.' : 'Demo data may be incomplete.'}
            </Text>
          </View> */}
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
                color={ROUTE_COLORS_BY_PROFILE[route.profileType] || '#ff8a00'}
                selected={i === 0}
                zIndex={routes.length - i}
              />
            ))}
            {displayedPlaces.map((place) => (
              <PlaceMarker key={place.id} place={place} />
            ))}
            {originCoord && <OriginMarker coordinate={originCoord} title={originLabel} />}
            {destCoord && <DestinationMarker coordinate={destCoord} title={destName ?? 'Destination'} />}
          </NightAwareMap>

          {/* Floating Top Controls */}
          <View pointerEvents="box-none" style={[styles.topControls, { top: insets.top + 12 }]}>
            <View style={styles.topPill}>
              <View style={styles.liveDot} />
              <Text style={styles.topPillText} numberOfLines={1}>
                {destName || 'Evening Route Preview'}
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
                    ? `${formatDuration(primaryRoute.durationMinutes)} · ${(primaryRoute.distanceMeters / 1000).toFixed(1)} km`
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
        destinationLabel={destName ?? ''}
        destinationCoordinate={destCoord}
        userGpsCoordinate={location.coordinate}
        userGpsAddress={location.address}
        onClose={() => setIsSearchOpen(false)}
        onSelectStart={handleSelectStart}
        onSelectDestination={handleSelectDestination}
      />

      {/* Custom departure date & time picker modal */}
      <Modal
        visible={isCustomTimeOpen}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        onRequestClose={cancelCustomTime}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose departure time</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close departure picker"
                onPress={cancelCustomTime}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>Select a date, hour and minute for your journey.</Text>

            {customTimeError ? (
              <View style={styles.customTimeError}>
                <Text style={styles.customTimeErrorText}>{customTimeError}</Text>
              </View>
            ) : null}

            {/* DATE column */}
            <Text style={styles.pickerColumnLabel}>DATE</Text>
            <FlatList
              ref={dateListRef}
              data={DATE_ITEMS}
              keyExtractor={(d) => d.toDateString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={DATE_ITEMS.findIndex(
                (d) =>
                  customDate &&
                  d.getFullYear() === customDate.getFullYear() &&
                  d.getMonth() === customDate.getMonth() &&
                  d.getDate() === customDate.getDate(),
              )}
              getItemLayout={(_, index) => ({
                length: 78,
                offset: 78 * index,
                index,
              })}
              renderItem={({ item }) => {
                const selected =
                  !!customDate &&
                  item.getFullYear() === customDate.getFullYear() &&
                  item.getMonth() === customDate.getMonth() &&
                  item.getDate() === customDate.getDate();
                return (
                  <Pressable
                    onPress={() => {
                      setCustomDate((prev) => {
                        const base = prev ?? new Date();
                        const next = new Date(item);
                        next.setHours(base.getHours(), base.getMinutes(), 0, 0);
                        return next;
                      });
                    }}
                    style={[
                      styles.pickerChip,
                      selected && styles.pickerChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        selected && styles.pickerChipTextSelected,
                      ]}
                    >
                      {formatDateLabel(item)}
                    </Text>
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.pickerListContent}
            />

            {/* HOUR column */}
            <Text style={[styles.pickerColumnLabel, styles.pickerColumnLabelSpaced]}>HOUR</Text>
            <FlatList
              ref={hourListRef}
              data={HOUR_ITEMS}
              keyExtractor={(h) => String(h)}
              horizontal
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={Math.min(Math.max(customHour, 0), HOUR_ITEMS.length - 1)}
              getItemLayout={(_, index) => ({
                length: 56,
                offset: 56 * index,
                index,
              })}
              renderItem={({ item }) => {
                const selected = customHour === item;
                return (
                  <Pressable
                    onPress={() => setCustomHour(item)}
                    style={[
                      styles.pickerChip,
                      selected && styles.pickerChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        selected && styles.pickerChipTextSelected,
                      ]}
                    >
                      {String(item).padStart(2, '0')}
                    </Text>
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.pickerListContent}
            />

            {/* MINUTE column */}
            <Text style={[styles.pickerColumnLabel, styles.pickerColumnLabelSpaced]}>MINUTE</Text>
            <FlatList
              ref={minuteListRef}
              data={MINUTE_ITEMS}
              keyExtractor={(m) => String(m)}
              horizontal
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={Math.min(Math.max(customMinute, 0), MINUTE_ITEMS.length - 1)}
              getItemLayout={(_, index) => ({
                length: 56,
                offset: 56 * index,
                index,
              })}
              renderItem={({ item }) => {
                const selected = customMinute === item;
                return (
                  <Pressable
                    onPress={() => setCustomMinute(item)}
                    style={[
                      styles.pickerChip,
                      selected && styles.pickerChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pickerChipText,
                        selected && styles.pickerChipTextSelected,
                      ]}
                    >
                      {String(item).padStart(2, '0')}
                    </Text>
                  </Pressable>
                );
              }}
              contentContainerStyle={styles.pickerListContent}
            />

            {/* Preview */}
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Departing</Text>
              <Text style={styles.previewValue}>
                {customDate
                  ? new Date(
                      customDate.getFullYear(),
                      customDate.getMonth(),
                      customDate.getDate(),
                      customHour,
                      customMinute,
                    ).toLocaleString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel departure selection"
                onPress={cancelCustomTime}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm departure time"
                onPress={confirmCustomTime}
                style={styles.modalConfirmBtn}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#090b0d' },
  scrollContent: { paddingBottom: 32 },

  // Custom departure date & time picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 11, 13, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: '#111519',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#30363e',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    color: '#f1f2f1',
    fontSize: 22,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1f24',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#30363e',
  },
  modalCloseText: {
    color: '#aab2bb',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#85909b',
    fontSize: 14,
    marginBottom: 14,
  },
  customTimeError: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  customTimeErrorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '600',
  },
  pickerColumnLabel: {
    color: '#85909b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  pickerColumnLabelSpaced: {
    marginTop: 14,
  },
  pickerListContent: {
    paddingHorizontal: 8,
    gap: 6,
  },
  pickerChip: {
    minWidth: 74,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#1a1f24',
    borderWidth: 1,
    borderColor: '#30363e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerChipSelected: {
    backgroundColor: '#241a10',
    borderColor: '#ff9400',
  },
  pickerChipText: {
    color: '#b0b7c0',
    fontSize: 15,
    fontWeight: '600',
  },
  pickerChipTextSelected: {
    color: '#ff9400',
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    backgroundColor: '#1a1f24',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#30363e',
  },
  previewLabel: {
    color: '#85909b',
    fontSize: 13,
    fontWeight: '600',
  },
  previewValue: {
    color: '#f1f2f1',
    fontSize: 16,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#1a1f24',
    borderWidth: 1,
    borderColor: '#30363e',
  },
  modalCancelText: {
    color: '#b0b7c0',
    fontSize: 15,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#ff9400',
  },
  modalConfirmText: {
    color: '#101214',
    fontSize: 15,
    fontWeight: '800',
  },

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
