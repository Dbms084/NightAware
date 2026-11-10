/**
 * Uber / Google Maps style Location Search Modal.
 *
 * Supports searching both START location and DESTINATION location.
 * Always features "Your current location (GPS)" as the top suggestion for start point.
 * Powered by Google Places API (New) for instant typing suggestions.
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
  QUICK_SUGGESTIONS,
  type PlaceSuggestion,
  type QuickSuggestion,
  type QuickDestination,
} from '@/features/location/services/geocoding-service';
import { PoiRowSkeleton } from '@/components/ui/Skeleton';

export type SearchField = 'start' | 'destination';

type LocationSearchModalProps = {
  visible: boolean;
  initialField?: SearchField;
  startLabel: string;
  startCoordinate?: Coordinate | null;
  destinationLabel: string;
  destinationCoordinate?: Coordinate | null;
  userGpsCoordinate?: Coordinate | null;
  userGpsAddress?: string | null;
  onClose: () => void;
  onSelectStart: (coord: Coordinate | null, name: string, fullAddress: string) => void;
  onSelectDestination: (coord: Coordinate, name: string, fullAddress: string) => void;
};

export function LocationSearchModal({
  visible,
  initialField = 'destination',
  startLabel,
  startCoordinate,
  destinationLabel,
  destinationCoordinate,
  userGpsCoordinate,
  userGpsAddress,
  onClose,
  onSelectStart,
  onSelectDestination,
}: LocationSearchModalProps) {
  const [activeField, setActiveField] = useState<SearchField>(initialField);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const startInputRef = useRef<any>(null);
  const destInputRef = useRef<any>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync activeField and auto focus when modal opens
  useEffect(() => {
    if (visible) {
      setActiveField(initialField);
      setQuery('');
      setSuggestions([]);
      setResolvingId(null);
      setTimeout(() => {
        if (initialField === 'start') {
          startInputRef.current?.focus();
        } else {
          destInputRef.current?.focus();
        }
      }, 150);
    }
  }, [visible, initialField]);

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
          const biasCoord =
            activeField === 'start'
              ? userGpsCoordinate ?? startCoordinate ?? undefined
              : startCoordinate ?? userGpsCoordinate ?? undefined;

          const results = await searchPlaceSuggestions(text, biasCoord);
          setSuggestions(results);
        } catch {
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, 250);
    },
    [activeField, userGpsCoordinate, startCoordinate],
  );

  // Select "Current Location" for start point
  const handleSelectCurrentLocation = useCallback(() => {
    Keyboard.dismiss();
    onSelectStart(
      null, // null indicates live GPS
      userGpsAddress ?? 'Current location',
      userGpsAddress ?? 'GPS · High accuracy',
    );
    // If destination is already set, close modal and show route; otherwise switch to destination
    if (activeField === 'start') {
      if (destinationCoordinate != null) {
        onClose();
      } else {
        setActiveField('destination');
        setQuery('');
        setSuggestions([]);
        setTimeout(() => destInputRef.current?.focus(), 100);
      }
    } else {
      onClose();
    }
  }, [userGpsAddress, activeField, onSelectStart, onClose, destinationCoordinate]);

  // Handle selecting a place suggestion
  const handleSelectPlace = useCallback(
    async (item: PlaceSuggestion | QuickDestination) => {
      Keyboard.dismiss();
      setResolvingId(item.id);

      // Fast path if coordinate is already attached (popular destinations)
      if ('coordinate' in item && item.coordinate) {
        if (activeField === 'start') {
          onSelectStart(item.coordinate, item.name, item.fullAddress);
          setResolvingId(null);
          if (destinationCoordinate != null) {
            onClose();
            return;
          }
          setActiveField('destination');
          setQuery('');
          setSuggestions([]);
          setTimeout(() => destInputRef.current?.focus(), 100);
          return;
        } else {
          onSelectDestination(item.coordinate, item.name, item.fullAddress);
          setResolvingId(null);
          onClose();
          return;
        }
      }

      try {
        const resolved = await resolvePlace(item.id);
        if (resolved) {
          if (activeField === 'start') {
            onSelectStart(resolved.coordinate, item.name, resolved.address);
            if (destinationCoordinate != null) {
              onClose();
              return;
            }
            setActiveField('destination');
            setQuery('');
            setSuggestions([]);
            setTimeout(() => destInputRef.current?.focus(), 100);
          } else {
            onSelectDestination(resolved.coordinate, item.name, resolved.address);
            onClose();
          }
          return;
        }
      } catch {
        // Fall through
      } finally {
        setResolvingId(null);
      }
    },
    [activeField, onSelectStart, onSelectDestination, onClose, destinationCoordinate],
  );

  const clearQuery = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    if (activeField === 'start') {
      startInputRef.current?.focus();
    } else {
      destInputRef.current?.focus();
    }
  }, [activeField]);

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
          <Text style={styles.headerTitle}>
            {activeField === 'start' ? 'Choose starting point' : 'Choose destination'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Uber-style Start & Destination Input Box */}
        <View style={styles.inputCard}>
          {/* Start Point Input Row */}
          <Pressable
            onPress={() => {
              if (activeField !== 'start') {
                setActiveField('start');
                setQuery('');
                setSuggestions([]);
                setTimeout(() => startInputRef.current?.focus(), 50);
              }
            }}
            style={[styles.row, activeField === 'start' && styles.rowActive]}
          >
            <View style={styles.pickupDot} />
            <View style={styles.rowContent}>
              <Text style={styles.inputLabel}>START POINT</Text>
              {activeField === 'start' ? (
                <TextInput
                  ref={startInputRef}
                  value={query}
                  onChangeText={handleChangeText}
                  placeholder={startLabel || 'Search start location...'}
                  placeholderTextColor="#6b7280"
                  style={styles.textInput}
                  autoCorrect={false}
                  returnKeyType="search"
                />
              ) : (
                <Text style={styles.inactiveValueText} numberOfLines={1}>
                  {startLabel || 'Current location'}
                </Text>
              )}
            </View>
            {activeField === 'start' && query.length > 0 && (
              <Pressable onPress={clearQuery} style={styles.clearBtn} accessibilityRole="button">
                <Text style={styles.clearText}>✕</Text>
              </Pressable>
            )}
          </Pressable>

          {/* Dotted connector line */}
          <View style={styles.connector} />

          {/* Destination Input Row */}
          <Pressable
            onPress={() => {
              if (activeField !== 'destination') {
                setActiveField('destination');
                setQuery('');
                setSuggestions([]);
                setTimeout(() => destInputRef.current?.focus(), 50);
              }
            }}
            style={[styles.row, activeField === 'destination' && styles.rowActive]}
          >
            <View style={styles.destSquare} />
            <View style={styles.rowContent}>
              <Text style={styles.inputLabel}>DESTINATION</Text>
              {activeField === 'destination' ? (
                <TextInput
                  ref={destInputRef}
                  value={query}
                  onChangeText={handleChangeText}
                  placeholder={destinationLabel || 'Where to? Search destination...'}
                  placeholderTextColor="#6b7280"
                  style={styles.textInput}
                  autoCorrect={false}
                  returnKeyType="search"
                />
              ) : (
                <Text style={styles.inactiveValueText} numberOfLines={1}>
                  {destinationLabel || 'Search destination'}
                </Text>
              )}
            </View>
            {activeField === 'destination' && query.length > 0 && (
              <Pressable onPress={clearQuery} style={styles.clearBtn} accessibilityRole="button">
                <Text style={styles.clearText}>✕</Text>
              </Pressable>
            )}
            {isSearching && (
              <ActivityIndicator size="small" color="#ff9400" style={{ marginLeft: 8 }} />
            )}
          </Pressable>
        </View>

        {/* Suggestions List */}
        <View style={styles.listContainer}>
          {isSearching ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <PoiRowSkeleton />
              <PoiRowSkeleton />
              <PoiRowSkeleton />
            </View>
          ) : showPopular ? (
            <FlatList
              data={QUICK_SUGGESTIONS}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View>
                  {/* FIRST SUGGESTION: Your Current Location (GPS) */}
                  <Pressable
                    onPress={handleSelectCurrentLocation}
                    style={({ pressed }) => [
                      styles.gpsItem,
                      pressed && styles.suggestionItemPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Use current location"
                  >
                    <View style={styles.gpsIconCircle}>
                      <Text style={styles.gpsIconText}>🎯</Text>
                    </View>
                    <View style={styles.suggestionTextWrap}>
                      <View style={styles.gpsHeaderRow}>
                        <Text style={styles.gpsTitle}>Your current location</Text>
                        <View style={styles.gpsBadge}>
                          <Text style={styles.gpsBadgeText}>GPS</Text>
                        </View>
                      </View>
                      <Text style={styles.gpsSubtitle} numberOfLines={1}>
                        {userGpsAddress || 'High precision GPS location'}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>→</Text>
                  </Pressable>

                  {/* Section divider */}
                  <View style={styles.listHeader}>
                    <Text style={styles.listHeaderTitle}>
                      {activeField === 'start' ? 'SEARCH START LOCATION' : 'SEARCH DESTINATION'}
                    </Text>
                    <Text style={styles.listHeaderSubtitle}>Search any city, neighborhood, street, or landmark</Text>
                  </View>
                </View>
              }
              ListEmptyComponent={
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
                  <Text style={{ fontSize: 32, marginBottom: 12 }}>🔍</Text>
                  <Text style={{ color: '#f5f6f7', fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                    {activeField === 'start' ? 'Where are you starting from?' : 'Where do you want to go tonight?'}
                  </Text>
                  <Text style={{ color: '#85909b', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                    Type at least 2 characters above to search any street, landmark, metro station, or venue.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setQuery(item.name);
                    handleChangeText(item.name);
                  }}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    pressed && styles.suggestionItemPressed,
                  ]}
                  accessibilityRole="button"
                >
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconText}>{item.icon}</Text>
                  </View>
                  <View style={styles.suggestionTextWrap}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.suggestionSecondary} numberOfLines={1}>
                      {item.secondaryText}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>🔍</Text>
                </Pressable>
              )}
            />
          ) : (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                /* When searching start, always keep GPS as quick top item */
                activeField === 'start' ? (
                  <Pressable
                    onPress={handleSelectCurrentLocation}
                    style={({ pressed }) => [
                      styles.gpsItem,
                      pressed && styles.suggestionItemPressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <View style={styles.gpsIconCircle}>
                      <Text style={styles.gpsIconText}>🎯</Text>
                    </View>
                    <View style={styles.suggestionTextWrap}>
                      <View style={styles.gpsHeaderRow}>
                        <Text style={styles.gpsTitle}>Your current location</Text>
                        <View style={styles.gpsBadge}><Text style={styles.gpsBadgeText}>GPS</Text></View>
                      </View>
                      <Text style={styles.gpsSubtitle} numberOfLines={1}>
                        {userGpsAddress || 'High precision GPS location'}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>→</Text>
                  </Pressable>
                ) : undefined
              }
              ListEmptyComponent={
                !isSearching && query.trim().length >= 2 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text style={styles.emptyTitle}>No places found</Text>
                    <Text style={styles.emptySubtitle}>
                      Try typing a nearby street, area, or landmark.
                    </Text>
                  </View>
                ) : undefined
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleSelectPlace(item)}
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
    borderRadius: 12,
    paddingVertical: 4,
  },
  rowActive: {
    backgroundColor: '#171A22',
    paddingHorizontal: 8,
    marginHorizontal: -8,
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
    height: 20,
    backgroundColor: '#30363e',
    marginLeft: 5,
    marginVertical: 2,
  },
  rowContent: {
    flex: 1,
  },
  inputLabel: {
    color: '#85909b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  inactiveValueText: {
    color: '#f1f2f1',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  textInput: {
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

  // GPS Item (Top suggestion)
  gpsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
    marginBottom: 14,
  },
  gpsIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(74, 222, 128, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  gpsIconText: {
    fontSize: 20,
  },
  gpsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsTitle: {
    color: '#4ADE80',
    fontSize: 16,
    fontWeight: '700',
  },
  gpsBadge: {
    backgroundColor: '#4ADE80',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  gpsBadgeText: {
    color: '#090b0d',
    fontSize: 10,
    fontWeight: '800',
  },
  gpsSubtitle: {
    color: '#aab2bb',
    fontSize: 13,
    marginTop: 3,
  },

  listHeader: {
    paddingVertical: 10,
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

