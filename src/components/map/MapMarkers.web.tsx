import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Linking } from 'react-native';

import { useMapWeb } from './map-context.web';
import type { Coordinate, PlaceCategory, Place, ArrivalStatus } from '@/types/geo';
import { PLACE_CATEGORY_ICONS, PLACE_CATEGORY_LABELS, PLACE_MARKER_COLORS } from '@/types/geo';

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

export function OriginMarker({
  coordinate,
  title = 'Start',
  onPress,
}: {
  coordinate: Coordinate;
  title?: string;
  onPress?: () => void;
}) {
  const mapWeb = useMapWeb();
  const [showTooltip, setShowTooltip] = useState(false);
  if (!mapWeb) return null;

  const { x, y } = mapWeb.project(coordinate);

  return (
    <View
      style={[
        styles.markerContainer,
        { left: `${x}%`, top: `${y}%`, marginLeft: -14, marginTop: -14, zIndex: 20 },
      ]}
    >
      <Pressable
        onPress={onPress}
        onHoverIn={() => setShowTooltip(true)}
        onHoverOut={() => setShowTooltip(false)}
        style={styles.touchTarget}
      >
        <View style={styles.originOuter}>
          <View style={styles.originInner} />
        </View>
      </Pressable>

      {showTooltip && (
        <View style={styles.webTooltip}>
          <Text style={styles.tooltipTitle}>{title}</Text>
          <Text style={styles.tooltipSub}>Starting point</Text>
        </View>
      )}
    </View>
  );
}

export function DestinationMarker({
  coordinate,
  title = 'Destination',
  onPress,
}: {
  coordinate: Coordinate;
  title?: string;
  onPress?: () => void;
}) {
  const mapWeb = useMapWeb();
  const [showTooltip, setShowTooltip] = useState(false);
  if (!mapWeb) return null;

  const { x, y } = mapWeb.project(coordinate);

  return (
    <View
      style={[
        styles.markerContainer,
        { left: `${x}%`, top: `${y}%`, marginLeft: -14, marginTop: -14, zIndex: 20 },
      ]}
    >
      <Pressable
        onPress={onPress}
        onHoverIn={() => setShowTooltip(true)}
        onHoverOut={() => setShowTooltip(false)}
        style={styles.touchTarget}
      >
        <View style={styles.destinationPin}>
          <Text style={styles.pinIcon}>🏠</Text>
        </View>
      </Pressable>

      {showTooltip && (
        <View style={styles.webTooltip}>
          <Text style={styles.tooltipTitle}>{title}</Text>
          <Text style={styles.tooltipSub}>Destination</Text>
        </View>
      )}
    </View>
  );
}

export type PlaceMarkerProps = {
  place?: Place;
  coordinate?: Coordinate;
  category?: PlaceCategory;
  name?: string;
  isOpen?: boolean | null;
  onPress?: () => void;
};

export function PlaceMarker(props: PlaceMarkerProps) {
  const mapWeb = useMapWeb();
  const [showTooltip, setShowTooltip] = useState(false);
  if (!mapWeb) return null;

  const coord = props.place?.coordinate ?? props.coordinate ?? { latitude: 0, longitude: 0 };
  const name = props.place?.name ?? props.name ?? 'Place';
  const category = props.place?.category ?? props.category ?? 'shop_food';
  const isOpen = props.place?.openAtJourneyTime ?? props.isOpen;
  const place = props.place;

  let icon = PLACE_CATEGORY_ICONS[category] || '📍';
  let label = PLACE_CATEGORY_LABELS[category] || 'Place';
  if (category === 'transport') {
    if (/metro|subway|mrt/i.test(name)) {
      icon = '🚇';
      label = 'Metro Station';
    } else if (/terminus|terminal|depot|isbt/i.test(name)) {
      icon = '🏢';
      label = 'Bus Terminus / Stand';
    } else {
      icon = '🚏';
      label = 'Bus Stop / Stand';
    }
  }

  let badgeColor = PLACE_MARKER_COLORS[category] || '#64748b';
  let statusText = 'Hours unknown';

  if (place?.is24_7) {
    statusText = 'Open 24/7';
    if (category === 'shop_food') badgeColor = '#22c55e';
  } else if (place?.arrivalStatus === 'closing_soon') {
    statusText = 'Closing soon';
    badgeColor = '#f59e0b';
  } else if (place?.arrivalStatus === 'closed_at_arrival' || isOpen === false) {
    statusText = 'Closed at arrival';
    badgeColor = '#64748b';
  } else if (place?.arrivalStatus === 'open_at_arrival' || isOpen === true) {
    statusText = 'Open at arrival';
    if (category === 'shop_food') badgeColor = '#22c55e';
  }

  const { x, y } = mapWeb.project(coord);

  const handleClick = () => {
    props.onPress?.();
    if (place?.id && mapWeb.onMarkerPress) {
      mapWeb.onMarkerPress(place.id);
    }
  };

  return (
    <View
      style={[
        styles.markerContainer,
        { left: `${x}%`, top: `${y}%`, marginLeft: -14, marginTop: -14, zIndex: 10 },
      ]}
    >
      <Pressable
        onPress={handleClick}
        onHoverIn={() => setShowTooltip(true)}
        onHoverOut={() => setShowTooltip(false)}
        style={styles.touchTarget}
      >
        <View style={[styles.placeBadge, { borderColor: badgeColor }]}>
          <Text style={styles.placeEmoji}>{icon}</Text>
          {(place?.is24_7 || isOpen === true || place?.arrivalStatus === 'open_at_arrival') && (
            <View style={styles.openIndicatorDot} />
          )}
        </View>
      </Pressable>

      {showTooltip && (
        <View style={styles.webTooltip}>
          <Text style={styles.tooltipTitle}>{name}</Text>
          <Text style={styles.tooltipSub}>{label}</Text>
          <Text style={[styles.tooltipStatus, { color: badgeColor }]}>● {statusText}</Text>
          {place?.openTime && place?.closeTime && (
            <Text style={styles.tooltipHours}>🕒 {place.openTime} – {place.closeTime}</Text>
          )}
          {place?.phone && (
            <Text
              style={styles.tooltipPhone}
              onPress={() => void Linking.openURL(`tel:${place.phone}`)}
            >
              📞 {place.phone}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export function SafetyMarker({
  coordinate,
  reason = 'Safety point',
  onPress,
}: {
  coordinate: Coordinate;
  riskLevel?: string;
  reason?: string;
  onPress?: () => void;
}) {
  const mapWeb = useMapWeb();
  if (!mapWeb) return null;
  const { x, y } = mapWeb.project(coordinate);

  return (
    <View
      style={[
        styles.markerContainer,
        { left: `${x}%`, top: `${y}%`, marginLeft: -14, marginTop: -14 },
      ]}
    >
      <Pressable onPress={onPress} style={styles.touchTarget}>
        <View style={[styles.placeBadge, { borderColor: '#eab308' }]}>
          <Text style={styles.placeEmoji}>⚠️</Text>
        </View>
      </Pressable>
    </View>
  );
}

export function CCTVMarker({
  coordinate,
  name = 'CCTV Camera',
  onPress,
}: {
  coordinate: Coordinate;
  name?: string;
  onPress?: () => void;
}) {
  const mapWeb = useMapWeb();
  if (!mapWeb) return null;
  const { x, y } = mapWeb.project(coordinate);

  return (
    <View
      style={[
        styles.markerContainer,
        { left: `${x}%`, top: `${y}%`, marginLeft: -14, marginTop: -14 },
      ]}
    >
      <Pressable onPress={onPress} style={styles.touchTarget}>
        <View style={[styles.placeBadge, { borderColor: '#64748b' }]}>
          <Text style={styles.placeEmoji}>📷</Text>
        </View>
      </Pressable>
    </View>
  );
}

export function IncidentMarker({
  coordinate,
  title = 'Safety incident',
  onPress,
}: {
  coordinate: Coordinate;
  title?: string;
  description?: string;
  onPress?: () => void;
}) {
  const mapWeb = useMapWeb();
  if (!mapWeb) return null;
  const { x, y } = mapWeb.project(coordinate);

  return (
    <View
      style={[
        styles.markerContainer,
        { left: `${x}%`, top: `${y}%`, marginLeft: -14, marginTop: -14 },
      ]}
    >
      <Pressable onPress={onPress} style={styles.touchTarget}>
        <View style={[styles.placeBadge, { borderColor: '#f87171' }]}>
          <Text style={styles.placeEmoji}>🚨</Text>
        </View>
      </Pressable>
    </View>
  );
}

export function ClusterMarker({
  coordinate,
  count,
  onPress,
}: {
  coordinate: Coordinate;
  count: number;
  onPress?: () => void;
}) {
  const mapWeb = useMapWeb();
  if (!mapWeb) return null;
  const { x, y } = mapWeb.project(coordinate);

  return (
    <View
      style={[
        styles.markerContainer,
        { left: `${x}%`, top: `${y}%`, marginLeft: -16, marginTop: -16 },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={[styles.placeBadge, { borderColor: '#ff8a00', width: 32, height: 32, borderRadius: 16 }]}
      >
        <Text style={{ color: '#ff8a00', fontSize: 12, fontWeight: '700' }}>{count}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchTarget: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  originOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  originInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38bdf8',
  },
  destinationPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ff8a00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  pinIcon: {
    fontSize: 13,
  },
  placeBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#11151a',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeEmoji: {
    fontSize: 12,
  },
  webTooltip: {
    position: 'absolute',
    bottom: 32,
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 120,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    pointerEvents: 'none',
  },
  tooltipTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  tooltipSub: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 1,
  },
  tooltipStatus: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  tooltipPhone: {
    color: '#38bdf8',
    fontSize: 9,
    marginTop: 3,
  },
  tooltipHours: {
    color: '#a7f3d0',
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  openIndicatorDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
});
