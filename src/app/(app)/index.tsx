import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { LocationSearchField } from '@/features/journey/LocationSearchField';
import { useJourney } from '@/features/journey/JourneyProvider';
import type { PlaceSelection } from '@/features/journey/types';

type TravelMode = 'walking' | 'driving';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const { setJourney } = useJourney();
  const [origin, setOrigin] = useState<PlaceSelection | null>(null);
  const [destination, setDestination] = useState<PlaceSelection | null>(null);
  const [mode, setMode] = useState<TravelMode>('walking');
  const [isLocating, setIsLocating] = useState(false);

  async function loadCurrentLocation() {
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location permission needed', 'Allow foreground location access to use your current position as the start point. You can also search for a start location.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setOrigin({
        id: 'current-location',
        label: 'Current location',
        coordinate: [position.coords.longitude, position.coords.latitude],
      });
    } catch {
      Alert.alert('Location unavailable', 'We could not get a location fix. Search for a start point instead.');
    } finally {
      setIsLocating(false);
    }
  }

  function compareRoutes() {
    if (!origin || !destination) {
      Alert.alert('Choose both locations', 'Search for and select a start and destination.');
      return;
    }
    setJourney(origin, destination, mode);
    router.push('/(app)/compare');
  }

  return (
    <SafeAreaView className="flex-1 bg-[#090d17]" edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-5" keyboardShouldPersistTaps="handled">
        <View className="mb-8 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-3xl font-semibold text-[#f7f7f5]">Compare night routes</Text>
            <Text className="mt-2 text-base leading-6 text-[#a7adbb]">Compare road travel time with how shops are distributed along each route.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Sign out" className="min-h-12 justify-center px-2" onPress={() => void signOut()}>
            <Text className="text-sm font-semibold text-[#d7b66a]">Sign out</Text>
          </Pressable>
        </View>

        <View className="mb-6 rounded-2xl border border-[#343945] bg-[#171a22] p-4">
          <Text className="mb-5 text-sm font-semibold uppercase tracking-widest text-[#a7adbb]">Journey</Text>
          <LocationSearchField label="Start location" placeholder="Search an address or place" selected={origin} onSelect={setOrigin} onClear={() => setOrigin(null)} />
          <Pressable accessibilityRole="button" disabled={isLocating} onPress={() => void loadCurrentLocation()} className="mb-5 min-h-12 flex-row items-center justify-center gap-2 rounded-xl border border-[#343945] bg-[#222630]">
            {isLocating ? <ActivityIndicator color="#5cc5d9" /> : <Text className="text-sm font-semibold text-[#5cc5d9]">Use current location</Text>}
          </Pressable>
          <LocationSearchField label="Destination" placeholder="Search an address or place" selected={destination} proximity={origin?.coordinate} onSelect={setDestination} onClear={() => setDestination(null)} />

          <Text className="mb-3 mt-2 text-sm font-semibold uppercase tracking-widest text-[#a7adbb]">Travel mode</Text>
          <View className="flex-row gap-3">
            {(['walking', 'driving'] as TravelMode[]).map((item) => {
              const active = mode === item;
              return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setMode(item)} className={`min-h-12 flex-1 items-center justify-center rounded-xl border ${active ? 'border-[#d7b66a] bg-[#252117]' : 'border-[#343945] bg-[#090d17]'}`}>
                <Text className={`text-base font-semibold capitalize ${active ? 'text-[#d7b66a]' : 'text-[#a7adbb]'}`}>{item}</Text>
              </Pressable>;
            })}
          </View>
        </View>

        <Pressable accessibilityRole="button" className="min-h-14 items-center justify-center rounded-xl bg-[#d7b66a] active:opacity-80" onPress={compareRoutes}>
          <Text className="text-base font-bold text-[#090d17]">Find live routes</Text>
        </Pressable>

        <View className="mt-7 rounded-2xl border border-[#343945] bg-[#171a22] p-4">
          <Text className="text-base font-semibold text-[#f7f7f5]">Account</Text>
          <Text className="mt-2 text-sm text-[#a7adbb]">{user?.email ?? 'Signed in'}</Text>
        </View>
        <Text className="mt-5 text-sm leading-6 text-[#a7adbb]">Addresses and route coordinates are sent to Mapbox to find places and calculate routes. Location is only requested when you tap “Use current location.” Shop listing coverage varies; activity indicators, not a safety guarantee.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
