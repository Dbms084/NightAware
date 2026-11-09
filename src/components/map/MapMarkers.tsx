/**
 * Custom map markers for NightAware.
 *
 * Each marker type renders a styled custom view inside a react-native-maps
 * Marker with a Callout tooltip. Minimum touch target: 44dp.
 */

import { StyleSheet, Text, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps';

import type { Coordinate, PlaceCategory, RiskLevel } from '@/types/geo';
import { PLACE_CATEGORY_ICONS, PLACE_CATEGORY_LABELS, RISK_LEVEL_COLORS } from '@/types/geo';

// ---------------------------------------------------------------------------
// Shared data type for passing markers to the map
// ---------------------------------------------------------------------------

export type MarkerData = {
  id: string;
  coordinate: Coordinate;
  type: 'origin' | 'destination' | 'place' | 'safety' | 'cctv' | 'incident';
  title?: string;
  subtitle?: string;
  category?: PlaceCategory;
  riskLevel?: RiskLevel;
  /** Whether the place is open at the journey time. */
  isOpen?: boolean | null;
};

// ---------------------------------------------------------------------------
// Origin Marker — cyan circle with inner dot
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
    >
      <View style={styles.touchTarget} accessibilityLabel={`Start point: ${title}`}>
        <View style={styles.originOuter}>
          <View style={styles.originInner} />
        </View>
      </View>
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{title}</Text>
          <Text style={styles.calloutSubtitle}>Start point</Text>
        </View>
      </Callout>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// Destination Marker — orange circle with home icon
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
    >
      <View style={styles.touchTarget} accessibilityLabel={`Destination: ${title}`}>
        <View style={styles.destinationCircle}>
          <Text style={styles.destinationIcon}>🏠</Text>
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
// Place Marker — emoji icon by category
// ---------------------------------------------------------------------------

export function PlaceMarker({
  coordinate,
  category,
  name,
  isOpen,
  onPress,
}: {
  coordinate: Coordinate;
  category: PlaceCategory;
  name: string;
  isOpen?: boolean | null;
  onPress?: () => void;
}) {
  const icon = PLACE_CATEGORY_ICONS[category];
  const label = PLACE_CATEGORY_LABELS[category];
  const openLabel =
    isOpen === true ? 'Open' : isOpen === false ? 'Closed' : 'Hours unknown';
  const borderColor =
    isOpen === true ? '#4ADE80' : isOpen === false ? '#F87171' : '#6b7280';

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      onPress={onPress}
    >
      <View style={styles.touchTarget} accessibilityLabel={`${name}, ${label}, ${openLabel}`}>
        <View style={[styles.placeMarker, { borderColor }]}>
          <Text style={styles.placeIcon}>{icon}</Text>
        </View>
      </View>
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{name}</Text>
          <Text style={styles.calloutSubtitle}>
            {label} · {openLabel}
          </Text>
        </View>
      </Callout>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// Safety Marker — color-coded risk level dot
// ---------------------------------------------------------------------------

export function SafetyMarker({
  coordinate,
  riskLevel,
  reason,
  onPress,
}: {
  coordinate: Coordinate;
  riskLevel: RiskLevel;
  reason: string;
  onPress?: () => void;
}) {
  const color = RISK_LEVEL_COLORS[riskLevel];
  const levelLabel = riskLevel === 'low' ? 'Low risk' : riskLevel === 'medium' ? 'Moderate risk' : 'Higher risk';

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      onPress={onPress}
    >
      <View style={styles.touchTarget} accessibilityLabel={`${levelLabel}: ${reason}`}>
        <View style={[styles.safetyDot, { backgroundColor: color }]} />
      </View>
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{levelLabel}</Text>
          <Text style={styles.calloutSubtitle}>{reason}</Text>
        </View>
      </Callout>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// CCTV Marker — camera icon
// ---------------------------------------------------------------------------

export function CCTVMarker({
  coordinate,
  name,
  onPress,
}: {
  coordinate: Coordinate;
  name?: string;
  onPress?: () => void;
}) {
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      onPress={onPress}
    >
      <View style={styles.touchTarget} accessibilityLabel={`CCTV camera${name ? `: ${name}` : ''}`}>
        <View style={styles.cctvMarker}>
          <Text style={styles.cctvIcon}>📷</Text>
        </View>
      </View>
      {name && (
        <Callout tooltip={false}>
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>{name}</Text>
            <Text style={styles.calloutSubtitle}>CCTV Camera</Text>
          </View>
        </Callout>
      )}
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// Incident Marker — for Member 3's incident reports
// ---------------------------------------------------------------------------

export function IncidentMarker({
  coordinate,
  title,
  description,
  onPress,
}: {
  coordinate: Coordinate;
  title: string;
  description?: string;
  onPress?: () => void;
}) {
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      onPress={onPress}
    >
      <View style={styles.touchTarget} accessibilityLabel={`Reported incident: ${title}`}>
        <View style={styles.incidentMarker}>
          <Text style={styles.incidentIcon}>⚠️</Text>
        </View>
      </View>
      <Callout tooltip={false}>
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>{title}</Text>
          {description ? (
            <Text style={styles.calloutSubtitle}>{description}</Text>
          ) : null}
        </View>
      </Callout>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// Cluster Marker — number badge for overlapping markers (stretch goal)
// ---------------------------------------------------------------------------

export function ClusterMarker({
  coordinate,
  count,
  onPress,
}: {
  coordinate: Coordinate;
  count: number;
  onPress?: () => void;
}) {
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      onPress={onPress}
    >
      <View style={styles.touchTarget} accessibilityLabel={`${count} markers in this area`}>
        <View style={styles.clusterCircle}>
          <Text style={styles.clusterText}>{count > 99 ? '99+' : count}</Text>
        </View>
      </View>
    </Marker>
  );
}

// ---------------------------------------------------------------------------
// Styles — consistent with NightAware dark theme
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Ensures 48dp minimum touch target around all markers
  touchTarget: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Origin — cyan ring with inner dot
  originOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#38BDF8',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  originInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38BDF8',
  },

  // Destination — orange circle with home icon
  destinationCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff9400',
    alignItems: 'center',
    justifyContent: 'center',
    // subtle shadow
    elevation: 4,
    shadowColor: '#ff9400',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  destinationIcon: {
    fontSize: 18,
  },

  // Place markers — small circle with emoji
  placeMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111519',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  placeIcon: {
    fontSize: 14,
  },

  // Safety dot
  safetyDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 2,
  },

  // CCTV
  cctvMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1a1f24',
    borderWidth: 1.5,
    borderColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cctvIcon: {
    fontSize: 14,
  },

  // Incident — warning triangle
  incidentMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7F1D1D',
    borderWidth: 2,
    borderColor: '#F87171',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  incidentIcon: {
    fontSize: 16,
  },

  // Cluster
  clusterCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff9400',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  clusterText: {
    color: '#101214',
    fontSize: 13,
    fontWeight: '700',
  },

  // Callout tooltip (shared)
  callout: {
    minWidth: 120,
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
});

