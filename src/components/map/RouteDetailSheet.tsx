/**
 * RouteDetailSheet — shows a detailed breakdown of a route's
 * nearby facilities, activity score, and coverage gaps.
 *
 * Renders as an overlay panel at the bottom of the screen.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Place, PlaceCategory, RouteOption } from '@/types/geo';
import { PLACE_CATEGORY_ICONS, PLACE_CATEGORY_LABELS } from '@/types/geo';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type RouteDetailSheetProps = {
  route: RouteOption;
  places: Place[];
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Categories to display (ordered)
// ---------------------------------------------------------------------------

const DISPLAY_CATEGORIES: PlaceCategory[] = [
  'hospital',
  'pharmacy',
  'petrol_station',
  'shop_food',
  'transport',
  'help_point',
  'police',
  'cctv',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RouteDetailSheet({ route, places, onClose }: RouteDetailSheetProps) {
  const score = route.nightActivityScore;

  // Group places by category
  const grouped = new Map<PlaceCategory, Place[]>();
  for (const place of places) {
    const list = grouped.get(place.category) ?? [];
    list.push(place);
    grouped.set(place.category, list);
  }

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close details" />
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handleBar} />

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{route.label}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {/* Summary row */}
          <View style={styles.summaryRow}>
            <SummaryItem label="Duration" value={`${route.durationMinutes} min`} />
            <SummaryItem label="Distance" value={`${(route.distanceMeters / 1000).toFixed(1)} km`} />
            <SummaryItem
              label="Night Activity"
              value={score != null ? `${score}/100` : '—'}
              caption="Sample score"
            />
          </View>

          {/* Category breakdowns */}
          <Text style={styles.sectionTitle}>Nearby facilities</Text>
          {DISPLAY_CATEGORIES.map((category) => {
            const items = grouped.get(category) ?? [];
            const openCount = items.filter((p) => p.openAtJourneyTime === true).length;
            const unknownCount = items.filter((p) => p.openAtJourneyTime === null).length;

            return (
              <View key={category} style={styles.categoryRow}>
                <Text style={styles.categoryIcon}>
                  {PLACE_CATEGORY_ICONS[category]}
                </Text>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>
                    {PLACE_CATEGORY_LABELS[category]}
                  </Text>
                  <Text style={styles.categoryDetail}>
                    {items.length === 0
                      ? 'Unknown'
                      : `${items.length} nearby · ${openCount} open${unknownCount > 0 ? ` · ${unknownCount} hours unknown` : ''}`}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Coverage gaps */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Coverage gaps</Text>

          <View style={styles.gapRow}>
            <Text style={styles.gapLabel}>Longest stretch without open help point</Text>
            <Text style={styles.gapValue}>
              {route.longestStretchWithoutOpenHelpMeters != null
                ? `${route.longestStretchWithoutOpenHelpMeters}m`
                : 'Unknown'}
            </Text>
          </View>

          <View style={styles.gapRow}>
            <Text style={styles.gapLabel}>Longest low-activity stretch</Text>
            <Text style={styles.gapValue}>
              {route.longestLowActivityStretchMeters != null
                ? `${route.longestLowActivityStretchMeters}m`
                : 'Unknown'}
            </Text>
          </View>

          {/* Extra time */}
          {route.extraMinutes > 0 && (
            <View style={styles.gapRow}>
              <Text style={styles.gapLabel}>Extra time vs fastest</Text>
              <Text style={styles.gapValue}>+{route.extraMinutes} min</Text>
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerTitle}>ⓘ Data source</Text>
            <Text style={styles.disclaimerText}>
              Sample data · Not live. Activity indicators are not a safety
              guarantee. Opening hours may not reflect current conditions.
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Summary Item
// ---------------------------------------------------------------------------

function SummaryItem({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      {caption && <Text style={styles.summaryCaption}>{caption}</Text>}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#111519',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderColor: '#30363e',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#30363e',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  title: { color: '#f1f2f1', fontSize: 20, fontWeight: '700' },
  closeText: { color: '#aab2bb', fontSize: 22, padding: 4 },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1f24',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  summaryItem: { alignItems: 'center' },
  summaryValue: { color: '#f1f2f1', fontSize: 20, fontWeight: '700' },
  summaryLabel: { color: '#85909b', fontSize: 12, marginTop: 4 },
  summaryCaption: { color: '#6b7280', fontSize: 10, marginTop: 2 },

  // Section
  sectionTitle: {
    color: '#aab2bb',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Category rows
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222830',
  },
  categoryIcon: { fontSize: 20, width: 32 },
  categoryInfo: { flex: 1, marginLeft: 8 },
  categoryName: { color: '#f1f2f1', fontSize: 15, fontWeight: '500' },
  categoryDetail: { color: '#85909b', fontSize: 13, marginTop: 2 },

  // Gap rows
  gapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222830',
  },
  gapLabel: { color: '#aab2bb', fontSize: 14, flex: 1 },
  gapValue: { color: '#f1f2f1', fontSize: 15, fontWeight: '600' },

  // Disclaimer
  disclaimerBox: {
    marginTop: 20,
    backgroundColor: '#1a1f24',
    borderRadius: 12,
    padding: 14,
  },
  disclaimerTitle: { color: '#85909b', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  disclaimerText: { color: '#6b7280', fontSize: 12, lineHeight: 18 },
});

