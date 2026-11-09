import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { searchLocations } from './mapbox-service';
import type { Coordinate, PlaceSelection } from './types';

type Props = {
  label: string;
  placeholder: string;
  selected: PlaceSelection | null;
  proximity?: Coordinate;
  onSelect: (place: PlaceSelection) => void;
  onClear: () => void;
};

export function LocationSearchField({ label, placeholder, selected, proximity, onSelect, onClear }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSelection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (query.trim().length < 3) {
      setError('Enter at least three characters to search.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const places = await searchLocations(query, proximity);
      setResults(places);
      if (places.length === 0) setError('No matching places found. Try a nearby landmark or full address.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Location search failed. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View className="mb-5">
      <Text className="text-sm font-semibold uppercase tracking-widest text-[#a7adbb]">{label}</Text>
      <View className="mt-2 flex-row gap-2">
        <TextInput
          accessibilityLabel={label}
          value={selected?.label ?? query}
          onChangeText={(value) => { setQuery(value); setResults([]); setError(null); onClear(); }}
          placeholder={placeholder}
          placeholderTextColor="#7f8795"
          returnKeyType="search"
          onSubmitEditing={() => void search()}
          className="min-h-14 flex-1 rounded-xl border border-[#343945] bg-[#090d17] px-4 py-3 text-base text-[#f7f7f5]"
        />
        <Pressable accessibilityRole="button" accessibilityLabel={`Search ${label.toLowerCase()}`} disabled={isLoading} onPress={() => void search()} className="min-h-14 min-w-16 items-center justify-center rounded-xl bg-[#252a34] px-3 active:opacity-80">
          {isLoading ? <ActivityIndicator color="#d7b66a" /> : <Text className="text-sm font-semibold text-[#d7b66a]">Search</Text>}
        </Pressable>
      </View>
      {selected ? <Text className="mt-2 text-xs text-[#5cc5d9]">Location selected</Text> : null}
      {results.map((place) => (
        <Pressable key={place.id} accessibilityRole="button" onPress={() => { onSelect(place); setQuery(place.label); setResults([]); setError(null); }} className="mt-2 min-h-12 justify-center rounded-xl border border-[#343945] bg-[#222630] px-3 py-2">
          <Text className="text-sm leading-5 text-[#f7f7f5]">{place.label}</Text>
        </Pressable>
      ))}
      {error ? <Text accessibilityRole="alert" className="mt-2 text-sm leading-5 text-[#f17c72]">{error}</Text> : null}
    </View>
  );
}
