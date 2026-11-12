/**
 * Uber / Google Maps style Destination Search Modal.
 *
 * Provides instant suggestions while typing with Google Places (New) Autocomplete,
 * quick popular destinations, and clean selection transition.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import type { Coordinate } from '@/types/geo';
import {
  searchPlaceSuggestions,
  resolvePlace,
  POPULAR_DESTINATIONS,
  type PlaceSuggestion,
  type QuickDestination,
} from '@/features/location/services/geocoding-service';

type DestinationSearchModalProps = {
  visible: boolean;
  originLabel: string;
  originCoordinate?: Coordinate | null;
  onClose: () => void;
  onSelectDestination: (
    coordinate: Coordinate,
    name: string,
    fullAddress: string,
  ) => void;
};

export function DestinationSearchModal({
  visible,
  originLabel,
  originCoordinate,
  onClose,
  onSelectDestination,
}: DestinationSearchModalProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const inputRef = useRef<any>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto focus input when modal opens
  useEffect(() => {
    if (visible) {
      setQuery('');
      setSuggestions([]);
      setResolvingId(null);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [visible]);

  // Handle typing with 250ms debounce
  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      if (!text.trim() || text.trim().length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      debounceTimer.current = setTimeout(async () => {
        try {
          const results = await searchPlaceSuggestions(
            text,
            originCoordinate ?? undefined,
          );
          setSuggestions(results);
        } catch {
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, 250);
    },
    [originCoordinate],
  );

  // Handle selecting a destination
  const handleSelect = useCallback(
    async (item: PlaceSuggestion | QuickDestination) => {
      Keyboard.dismiss();
      setResolvingId(item.id);

      // Fast-path for popular destinations
      if ('coordinate' in item && item.coordinate) {
        onSelectDestination(item.coordinate, item.name, item.fullAddress);
        onClose();
        setResolvingId(null);
        return;
      }

      try {
        const resolved = await resolvePlace(item.id);
        if (resolved) {
          onSelectDestination(resolved.coordinate, item.name, resolved.address);
          onClose();
          return;
        }
      } catch {
        // Fall through
      } finally {
        setResolvingId(null);
      }
    },
    [onSelectDestination, onClose],
  );

  const clearQuery = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  }, []);

  const showPopular = query.trim().length < 2;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />

        {/* Top Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Close search"
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Where to tonight?</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Uber-style Input Card */}
        <View style={styles.inputCard}>
          {/* Pickup row */}
          <View style={styles.row}>
            <View style={styles.pickupDot} />
            <View style={styles.rowContent}>
              <Text style={styles.inputLabel}>START POINT</Text>
              <Text style={styles.originText} numberOfLines={1}>
                {originLabel || 'Current location'}
              </Text>
            </View>
          </View>

          {/* Dotted connector */}
          <View style={styles.connector} />

          {/* Destination row */}
          <View style={styles.row}>
            <View style={styles.destSquare} />
            <View style={styles.destInputWrap}>
              <Text style={styles.inputLabel}>DESTINATION</Text>
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={handleChangeText}
                placeholder="Search place, street, metro, area..."
                placeholderTextColor="#6b7280"
                style={styles.destInput}
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>
            {query.length > 0 && (
              <Pressable onPress={clearQuery} style={styles.clearBtn} accessibilityRole="button">
                <Text style={styles.clearText}>✕</Text>
              </Pressable>
            )}
            {isSearching && (
              <ActivityIndicator size="small" color="#ff9400" style={{ marginLeft: 8 }} />
            )}
          </View>
        </View>

        {/* Suggestions / Quick Destinations list */}
        <View style={styles.listContainer}>
          {showPopular ? (
            <FlatList
              data={POPULAR_DESTINATIONS}
              keyExtractor={(item, index) => (item.id ? `${item.id}-${index}` : String(index))}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderTitle}>SUGGESTED DESTINATIONS</Text>
                  <Text style={styles.listHeaderSubtitle}>Popular night routes in Bengaluru</Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && styles.suggestionItemPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconText}>📍</Text>
                  </View>
                  <View style={styles.suggestionTextWrap}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.suggestionSecondary} numberOfLines={1}>
                      {item.secondaryText}
                    </Text>
                  </View>
                  {resolvingId === item.id ? (
                    <ActivityIndicator size="small" color="#ff9400" />
                  ) : (
                    <Text style={styles.chevron}>→</Text>
                  )}
                </Pressable>
              )}
            />
          ) : (
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => (item.id ? `${item.id}-${index}` : String(index))}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                !isSearching && query.trim().length >= 2 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text style={styles.emptyTitle}>No places found</Text>
                    <Text style={styles.emptySubtitle}>
                      Try typing a nearby area, street, or landmark.
                    </Text>
                  </View>
                ) : undefined
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && styles.suggestionItemPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconText}>📍</Text>
                  </View>
                  <View style={styles.suggestionTextWrap}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.suggestionSecondary} numberOfLines={1}>
                      {item.secondaryText || item.fullAddress}
                    </Text>
                  </View>
                  {resolvingId === item.id ? (
                    <ActivityIndicator size="small" color="#ff9400" />
                  ) : (
                    <Text style={styles.chevron}>→</Text>
                  )}
                </Pressable>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090b0d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#171A22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#f1f2f1',
    fontSize: 22,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#f1f2f1',
    fontSize: 19,
    fontWeight: '700',
  },

  // Input Card
  inputCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#111519',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#30363e',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    marginRight: 14,
  },
  destSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#ff9400',
    marginRight: 14,
  },
  connector: {
    width: 2,
    height: 22,
    backgroundColor: '#30363e',
    marginLeft: 5,
    marginVertical: 4,
  },
  rowContent: {
    flex: 1,
  },
  destInputWrap: {
    flex: 1,
  },
  inputLabel: {
    color: '#85909b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  originText: {
    color: '#aab2bb',
    fontSize: 16,
    marginTop: 2,
  },
  destInput: {
    color: '#f1f2f1',
    fontSize: 17,
    fontWeight: '500',
    paddingVertical: 4,
    marginTop: 2,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#222630',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  clearText: {
    color: '#aab2bb',
    fontSize: 13,
    fontWeight: '700',
  },

  // List
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listHeader: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222630',
    marginBottom: 8,
  },
  listHeaderTitle: {
    color: '#ff9400',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  listHeaderSubtitle: {
    color: '#85909b',
    fontSize: 13,
    marginTop: 2,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222630',
  },
  suggestionItemPressed: {
    backgroundColor: '#171A22',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1f24',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 18,
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionName: {
    color: '#f1f2f1',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionSecondary: {
    color: '#85909b',
    fontSize: 13,
    marginTop: 3,
  },
  chevron: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    color: '#f1f2f1',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#85909b',
    fontSize: 13,
    textAlign: 'center',
  },
});
