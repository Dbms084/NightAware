import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { NavigationView, type RouteProgressEvent } from '@rnmapbox/navigation';
import { useJourney } from '@/features/journey/JourneyProvider';

export default function NavigationScreen() {
  const { routeId } = useLocalSearchParams<{ routeId?: string }>();
  const { routes, clearRoutes } = useJourney();
  const routeOption = routes.find((route) => route.id === routeId) ?? null;
  const [progress, setProgress] = useState<RouteProgressEvent | null>(null);
  const [navigationFailed, setNavigationFailed] = useState(false);

  function finishNavigation() {
    clearRoutes();
    router.replace('/(app)');
  }

  function showNavigationError(error: { code: string; message: string }) {
    setNavigationFailed(true);
    Alert.alert('Navigation could not start', error.message || error.code);
  }

  if (!routeOption) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#090d17] px-6" edges={['top', 'bottom']}>
        <Text className="text-xl font-semibold text-[#f7f7f5]">Route no longer available</Text>
        <Text className="mt-3 text-center text-base leading-6 text-[#a7adbb]">Return to the planner and calculate the route again.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/(app)')} className="mt-6 min-h-12 justify-center rounded-xl bg-[#d7b66a] px-6"><Text className="font-bold text-[#090d17]">Back to planner</Text></Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#090d17]" edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />
      <View className="flex-1">
        {!navigationFailed ? <NavigationView
          route={routeOption.route}
          style={{ flex: 1 }}
          onRouteProgress={setProgress}
          onCancel={finishNavigation}
          onError={showNavigationError}
        /> : <View className="flex-1 items-center justify-center px-6"><Text className="text-center text-base text-[#a7adbb]">Location-based navigation could not start.</Text></View>}
        {progress ? <View className="absolute left-4 right-4 top-3 rounded-2xl border border-[#343945] bg-[#090d17]/95 p-4">
          <Text className="text-base font-semibold text-[#f7f7f5]">{progress.maneuverInstruction || 'Continue on route'}</Text>
          <Text className="mt-1 text-sm text-[#a7adbb]">{Math.max(0, Math.round(progress.stepDistanceRemaining))} m to next instruction · {Math.ceil(progress.durationRemaining / 60)} min remaining</Text>
        </View> : null}
        {navigationFailed ? <Pressable accessibilityRole="button" onPress={finishNavigation} className="absolute bottom-5 left-5 right-5 min-h-14 items-center justify-center rounded-xl bg-[#d7b66a]"><Text className="font-bold text-[#090d17]">Back to planner</Text></Pressable> : null}
      </View>
    </SafeAreaView>
  );
}
