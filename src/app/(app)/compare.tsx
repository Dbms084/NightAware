import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import Mapbox from '@rnmapbox/maps';
import { getRouteOptions } from '@/features/journey/mapbox-service';
import { useJourney } from '@/features/journey/JourneyProvider';
import { RouteMap } from '@/features/journey/RouteMap';

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours > 0 ? `${hours} hr ${remaining} min` : `${minutes} min`;
}

function formatShopSegments(segments: number[] | null) {
  if (!segments) return 'Unavailable';
  return segments.map((count, index) => `${index + 1}: ${count}`).join('   ');
}

export default function CompareScreen() {
  const {
    origin, destination, mode, routes, poiError, attribution, selectedRouteId,
    setRoutes, setSelectedRouteId, clearRoutes,
  } = useJourney();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const missingJourney = !origin || !destination;

  useEffect(() => {
    if (!origin || !destination) return;
    const controller = new AbortController();
    let isActive = true;
    clearRoutes();
    void getRouteOptions(origin, destination, mode, controller.signal)
      .then((result) => {
        if (isActive) setRoutes(result.routes, result.poiError, result.attribution);
        else result.routes.forEach((route) => route.route.release());
      })
      .catch((cause: unknown) => {
        if (isActive) setError(cause instanceof Error ? cause.message : 'Could not find routes. Check your connection and try again.');
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [clearRoutes, destination, mode, origin, setRoutes]);

  const selected = routes.find((route) => route.id === selectedRouteId) ?? null;
  const shortestTime = routes.length ? Math.min(...routes.map((route) => route.route.expectedTravelTime)) : 0;

  async function startNavigation() {
    if (!selected) return;
    setIsStarting(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location permission needed', 'Foreground location lets navigation follow your position while the app is open. You can change this in device settings.');
        return;
      }
      if (Platform.OS === 'android') {
        const mapboxPermission = await Mapbox.requestAndroidLocationPermissions();
        if (!mapboxPermission) {
          Alert.alert('Location permission needed', 'Allow location access to start turn-by-turn navigation.');
          return;
        }
      }
      router.push({ pathname: '/(app)/navigation', params: { routeId: selected.id } });
    } catch {
      Alert.alert('Navigation unavailable', 'We could not start location-based navigation. Try again or allow location access in settings.');
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#090d17]" edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-9 pt-4">
        <Pressable accessibilityRole="button" onPress={() => router.back()} className="min-h-12 justify-center self-start"><Text className="text-base font-semibold text-[#d7b66a]">‹  Edit journey</Text></Pressable>
        <Text className="mt-3 text-3xl font-semibold text-[#f7f7f5]">Choose a route</Text>
        <Text className="mt-2 text-base text-[#a7adbb]">{origin?.label ?? 'Start'}  →  {destination?.label ?? 'Destination'} · {mode}</Text>

        {missingJourney ? <View className="mt-7 rounded-2xl border border-[#7d4944] bg-[#271a1a] p-4"><Text className="text-base font-semibold text-[#f17c72]">Choose both locations</Text><Text className="mt-2 text-sm leading-6 text-[#ecd0cd]">Return to the planner and select a start and destination.</Text></View> : null}
        {isLoading && !missingJourney ? <View className="mt-8 min-h-32 items-center justify-center rounded-2xl border border-[#343945] bg-[#171a22]"><ActivityIndicator color="#d7b66a" /><Text className="mt-3 text-sm text-[#a7adbb]">Finding routes and nearby shops…</Text></View> : null}
        {error ? <View className="mt-7 rounded-2xl border border-[#7d4944] bg-[#271a1a] p-4"><Text className="text-base font-semibold text-[#f17c72]">Route search failed</Text><Text className="mt-2 text-sm leading-6 text-[#ecd0cd]">{error}</Text></View> : null}

        {routes.length > 0 && origin && destination ? <>
          <View className="mt-5"><RouteMap routes={routes} selectedRouteId={selectedRouteId} origin={origin.coordinate} destination={destination.coordinate} attribution={attribution} /></View>
          <Text className="mb-3 mt-7 text-lg font-semibold text-[#f7f7f5]">Live route options</Text>
          {routes.map((option) => {
            const isSelected = option.id === selectedRouteId;
            const duration = option.route.expectedTravelTime;
            const extraMinutes = Math.max(0, Math.round((duration - shortestTime) / 60));
            return <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={() => setSelectedRouteId(option.id)} className={`mb-4 rounded-2xl border p-4 ${isSelected ? 'border-[#d7b66a] bg-[#201d16]' : 'border-[#343945] bg-[#171a22]'}`}>
              <View className="flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-lg font-semibold text-[#f7f7f5]">{option.label}</Text>
                <Text className="text-sm font-semibold text-[#d7b66a]">{isSelected ? 'Selected' : 'Select route'}</Text>
              </View>
              <View className="mt-3 flex-row flex-wrap gap-x-5 gap-y-2">
                <Text className="text-base text-[#f7f7f5]">{formatDuration(duration)}</Text>
                <Text className="text-base text-[#a7adbb]">{(option.route.distance / 1000).toFixed(1)} km</Text>
                <Text className="text-base text-[#a7adbb]">{extraMinutes === 0 ? 'Fastest' : `+${extraMinutes} min`}</Text>
              </View>
              <Text className="mt-4 text-sm font-semibold text-[#d7b66a]">Night Activity Score · {option.nightActivityScore === null ? 'Not available' : `${option.nightActivityScore}/100`}</Text>
              <Text className="mt-1 text-sm text-[#a7adbb]">{option.shopCount === null ? 'Shop count unavailable' : option.shopDataCapped ? `At least ${option.shopCount} provider-listed shops matched; result limit reached` : `${option.shopCount} provider-listed shops matched near the route`}</Text>
              <Text className="mt-2 text-xs leading-5 text-[#8992a0]">Shops by 20% of route length: {formatShopSegments(option.shopsBySegment)}</Text>
            </Pressable>;
          })}
          {poiError ? <View className="mb-5 rounded-xl border border-[#343945] bg-[#171a22] p-4"><Text className="text-sm leading-6 text-[#a7adbb]">{poiError}</Text></View> : null}
          <Text className="mb-5 text-sm leading-6 text-[#a7adbb]">The score combines five-section coverage (70%) with shop count relative to these route options (30%). If provider results are capped or missing, the score is unavailable. Mapbox POI listings do not verify opening hours or people present. Activity indicators, not a safety guarantee.</Text>
          <Text className="mb-4 text-sm leading-6 text-[#a7adbb]">Navigation follows your location while the app is open. Map tiles, route lines, and listed shops are supplied by Mapbox.</Text>
          <Pressable accessibilityRole="button" disabled={!selected || isStarting} onPress={() => void startNavigation()} className="min-h-14 flex-row items-center justify-center rounded-xl bg-[#d7b66a] active:opacity-80">
            {isStarting ? <ActivityIndicator color="#090d17" /> : <Text className="text-base font-bold text-[#090d17]">Start navigation</Text>}
          </Pressable>
        </> : null}
        <Text className="mt-5 text-xs leading-5 text-[#7f8795]">Routes and search results are provided by Mapbox. Data coverage and travel-time accuracy vary by location.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
