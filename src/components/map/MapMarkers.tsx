/**
 * Custom map markers for NightAware.
 * Color-coded according to the Section 5 specification:
 * - Green: Open establishments
 * - Amber: Closing soon
 * - Grey: Closed
 * - Purple: Pharmacies
 * - Orange: Petrol pumps
 * - Blue: Police stations
 * - Red: Hospitals
 * - Cyan: Public transport
 * - Distinct badges for CCTV and Streetlights
 */

import { Linking, StyleSheet, Text, View, Pressable } from 'react-native';
import { Callout, Marker } from 'react-native-maps';

import type { Coordinate, PlaceCategory, Place, ArrivalStatus } from '@/types/geo';
import { PLACE_CATEGORY_ICONS, PLACE_CATEGORY_LABELS, PLACE_MARKER_COLORS } from '@/types/geo';

// ---------------------------------------------------------------------------
// Marker Data
// ---------------------------------------------------------------------------

export type MarkerData = {
  id: string;
  coordinate: Coordinate;
  type: 'origin' | 'destination' | 'place' | 'cctv' | 'streetlight';
  title?: string;
  subtitle?: string;
  category?: PlaceCategory;
  isOpen?: boolean | null;
  phone?: string;
  arrivalStatus?: ArrivalStatus;
  place?: Place;
};

// ---------------------------------------------------------------------------
// Origin Marker — Cyan circle with start dot
// ---------------------------------------------------------------------------

export function OriginMarker({
  coordinate,
  title = 'Start',
  onPress,
}: {
  coordinate: Coordinate;
  title?: string;
  onPress?: () => void;
}) {
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      onPress={onPress}
      zIndex={10}
    >
      <View style={styles.touchTarget} accessibilityLabel={`Start point: ${title}`}>
        <View style={styles.originOuter}>
          <View style={styles.originInner} />
        </View>
      </View>
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{title}</Text>
          <Text style={styles.calloutSubtitle}>Starting point</Text>
        </View>
      </Callout>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// Destination Marker — Orange pin with home/flag icon
// ---------------------------------------------------------------------------

export function DestinationMarker({
  coordinate,
  title = 'Destination',
  onPress,
}: {
  coordinate: Coordinate;
  title?: string;
  onPress?: () => void;
}) {
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      onPress={onPress}
      zIndex={10}
    >
      <View style={styles.touchTarget} accessibilityLabel={`Destination: ${title}`}>
        <View style={styles.destinationPin}>
          <Text style={styles.pinIcon}>🏠</Text>
        </View>
      </View>
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{title}</Text>
          <Text style={styles.calloutSubtitle}>Destination</Text>
        </View>
      </Callout>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// Place Marker — Color-coded according to category & opening state
// ---------------------------------------------------------------------------

export type PlaceMarkerProps = {
  place?: Place;
  coordinate?: Coordinate;
  category?: PlaceCategory;
  name?: string;
  isOpen?: boolean | null;
  onPress?: () => void;
};

export function PlaceMarker(props: PlaceMarkerProps) {
  const coord = props.place?.coordinate ?? props.coordinate ?? { latitude: 0, longitude: 0 };
  const name = props.place?.name ?? props.name ?? 'Place';
  const category = props.place?.category ?? props.category ?? 'shop_food';
  const isOpen = props.place?.openAtJourneyTime ?? props.isOpen;
  const place = props.place;

  let icon = PLACE_CATEGORY_ICONS[category] || '📍';
  if (category === 'transport') {
    if (/metro|subway|mrt/i.test(name)) {
      icon = '🚇';
    } else if (/bus/i.test(name)) {
      icon = '🚏';
    }
  }
  const label = PLACE_CATEGORY_LABELS[category] || 'Place';

  // Determine badge background color based on category & status
  let badgeColor = PLACE_MARKER_COLORS[category] || '#64748b';
  let statusText = 'Hours unknown';

  if (place?.is24_7) {
    statusText = 'Open 24/7';
    if (category === 'shop_food') badgeColor = '#22c55e'; // Green
  } else if (place?.arrivalStatus === 'closing_soon') {
    statusText = 'Closing soon';
    badgeColor = '#f59e0b'; // Amber
  } else if (place?.arrivalStatus === 'closed_at_arrival' || isOpen === false) {
    statusText = 'Closed at arrival';
    badgeColor = '#64748b'; // Grey
  } else if (place?.arrivalStatus === 'open_at_arrival' || isOpen === true) {
    statusText = 'Open at arrival';
    if (category === 'shop_food') badgeColor = '#22c55e'; // Green
  }

  const handleCall = () => {
    if (place?.phone) {
      void Linking.openURL(`tel:${place.phone.replace(/[^0-9+]/g, '')}`);
    }
  };

  return (
    <Marker
      coordinate={coord}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      onPress={props.onPress}
      zIndex={5}
    >
      <View style={styles.touchTarget} accessibilityLabel={`${name}, ${label}, ${statusText}`}>
        <View style={[styles.placeBadge, { borderColor: badgeColor }]}>
          <Text style={styles.placeEmoji}>{icon}</Text>
        </View>
      </View>
      <Callout tooltip={false} onPress={handleCall}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{name}</Text>
          <Text style={styles.calloutCategory}>{label}</Text>
          <Text style={[styles.calloutStatus, { color: badgeColor }]}>● {statusText}</Text>
          {place?.estimatedArrivalTime ? (
            <Text style={styles.calloutTime}>Est. Arrival: {place.estimatedArrivalTime}</Text>
          ) : null}
          {place?.phone ? (
            <Text style={styles.calloutPhone}>📞 {place.phone} (Tap to Call)</Text>
          ) : null}
        </View>
      </Callout>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// Safety, CCTV, Incident & Cluster Marker compatibility exports
// ---------------------------------------------------------------------------

export function SafetyMarker({
  coordinate,
  reason = 'Safety point',
}: {
  coordinate: Coordinate;
  riskLevel?: string;
  reason?: string;
  onPress?: () => void;
}) {
  return (
    <Marker coordinate={coordinate} tracksViewChanges={false}>
      <View style={styles.touchTarget}>
        <View style={[styles.placeBadge, { borderColor: '#eab308' }]}>
          <Text style={styles.placeEmoji}>⚠️</Text>
        </View>
      </View>
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{reason}</Text>
        </View>
      </Callout>
    </Marker>
  );
}

export function CCTVMarker({
  coordinate,
  name = 'CCTV Camera',
}: {
  coordinate: Coordinate;
  name?: string;
  onPress?: () => void;
}) {
  return (
    <Marker coordinate={coordinate} tracksViewChanges={false}>
      <View style={styles.touchTarget}>
        <View style={[styles.placeBadge, { borderColor: '#64748b' }]}>
          <Text style={styles.placeEmoji}>📷</Text>
        </View>
      </View>
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{name}</Text>
          <Text style={styles.calloutCategory}>Public CCTV Infrastructure</Text>
        </View>
      </Callout>
    </Marker>
  );
}

export function IncidentMarker({
  coordinate,
  title = 'Safety incident',
}: {
  coordinate: Coordinate;
  title?: string;
  description?: string;
  onPress?: () => void;
}) {
  return (
    <Marker coordinate={coordinate} tracksViewChanges={false}>
      <View style={styles.touchTarget}>
        <View style={[styles.placeBadge, { borderColor: '#f87171' }]}>
          <Text style={styles.placeEmoji}>🚨</Text>
        </View>
      </View>
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{title}</Text>
        </View>
      </Callout>
    </Marker>
  );
}

export function ClusterMarker({
  coordinate,
  count,
}: {
  coordinate: Coordinate;
  count: number;
  onPress?: () => void;
}) {
  return (
    <Marker coordinate={coordinate} tracksViewChanges={false}>
      <View style={[styles.placeBadge, { borderColor: '#ff8a00', width: 32, height: 32, borderRadius: 16 }]}>
        <Text style={[styles.calloutTitle, { color: '#ff8a00', fontSize: 12, marginBottom: 0 }]}>
          {count}
        </Text>
      </View>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  touchTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  originOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  originInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#38bdf8',
  },
  destinationPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff8a00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  pinIcon: {
    fontSize: 14,
  },
  placeBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#11151a',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 3,
  },
  placeEmoji: {
    fontSize: 13,
  },
  callout: {
    padding: 8,
    maxWidth: 220,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  calloutSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  calloutCategory: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 2,
  },
  calloutStatus: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  calloutTime: {
    fontSize: 9,
    color: '#475569',
  },
  calloutPhone: {
    fontSize: 10,
    color: '#0284c7',
    fontWeight: '600',
    marginTop: 4,
  },
});
