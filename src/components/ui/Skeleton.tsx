/**
 * Skeleton — Animated pulse loading placeholder components.
 *
 * Implements smooth loading state skeletons for:
 * - Route comparison cards
 * - Establishment lists
 * - Quick metrics
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Base Skeleton Box
// ---------------------------------------------------------------------------

export type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.65, {
        duration: 900,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeletonBox,
        {
          width: width as any,
          height: height as any,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Route Card Skeleton (Matches Figma 2:8317 Card Shape)
// ---------------------------------------------------------------------------

export function RouteCardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeftCol}>
          <View style={styles.cardTitleRow}>
            <Skeleton width={10} height={10} borderRadius={5} />
            <Skeleton width={110} height={14} borderRadius={4} />
            <Skeleton width={50} height={14} borderRadius={4} />
          </View>
          <View style={{ marginTop: 6 }}>
            <Skeleton width={140} height={20} borderRadius={6} />
          </View>
        </View>
        <View style={styles.cardRightCol}>
          <Skeleton width={52} height={26} borderRadius={6} />
          <View style={{ marginTop: 4 }}>
            <Skeleton width={64} height={10} borderRadius={3} />
          </View>
        </View>
      </View>

      <View style={styles.cardPillsRow}>
        <Skeleton width={88} height={18} borderRadius={6} />
        <Skeleton width={105} height={18} borderRadius={6} />
      </View>

      <View style={{ marginTop: 8 }}>
        <Skeleton width="92%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Route Comparison Loading Group (3 Route Cards)
// ---------------------------------------------------------------------------

export function RouteComparisonSkeletonGroup() {
  return (
    <View style={styles.groupContainer}>
      <RouteCardSkeleton />
      <RouteCardSkeleton />
      <RouteCardSkeleton />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Establishment / POI Row Skeleton
// ---------------------------------------------------------------------------

export function PoiRowSkeleton() {
  return (
    <View style={styles.poiRow}>
      <Skeleton width={36} height={36} borderRadius={10} />
      <View style={styles.poiRowContent}>
        <Skeleton width="65%" height={14} borderRadius={4} />
        <View style={{ marginTop: 6, flexDirection: 'row', gap: 6 }}>
          <Skeleton width={80} height={11} borderRadius={3} />
          <Skeleton width={60} height={11} borderRadius={3} />
        </View>
      </View>
      <Skeleton width={50} height={28} borderRadius={8} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  skeletonBox: {
    backgroundColor: '#262f3a',
  },
  cardSkeleton: {
    backgroundColor: '#11151a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#232932',
    padding: 14,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeftCol: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardRightCol: {
    alignItems: 'flex-end',
  },
  cardPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  groupContainer: {
    gap: 8,
  },
  poiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2027',
    gap: 12,
  },
  poiRowContent: {
    flex: 1,
  },
});

