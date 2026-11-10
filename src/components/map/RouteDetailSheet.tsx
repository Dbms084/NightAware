/**
 * RouteDetailSheet — Detailed Route Analysis Panel & Complete Establishment List.
 *
 * Implements Section 6 & 7 of the specification:
 * - 9-parameter score breakdown
 * - Key indicators (open, 24/7, pharmacies, police, hospitals, transit, lighting %, quiet gap)
 * - Complete scrollable list of every establishment with arrival times & direct Call button.
 */

import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { Place, PlaceCategory, RouteOption } from '@/types/geo';
import { PLACE_CATEGORY_ICONS, PLACE_CATEGORY_LABELS, PLACE_MARKER_COLORS } from '@/types/geo';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type RouteDetailSheetProps = {
  route: RouteOption;
  places: Place[];
  onClose: () => void;
  onFocusPlace?: (place: Place) => void;
  onStartNavigation?: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RouteDetailSheet({
  route,
  places,
  onClose,
  onFocusPlace,
  onStartNavigation,
}: RouteDetailSheetProps) {
  const [activeTab, setActiveTab] = useState<'analysis' | 'places'>('analysis');
  const score = route.nightActivityScore;
  const breakdown = route.scoreBreakdown;

  // Establishments sorted by distance from start
  const establishments = (route.establishments && route.establishments.length > 0
    ? route.establishments
    : places
  ).sort((a, b) => (a.distanceFromStartMeters ?? 0) - (b.distanceFromStartMeters ?? 0));

  const handleCall = (phone?: string) => {
    if (!phone) return;
    void Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`);
  };

  return (
    <View style={styles.overlay}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close route details"
      />
      <View style={styles.sheet}>
        {/* Grab handle */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.profileBadgeRow}>
              <View
                style={[
                  styles.profileDot,
                  {
                    backgroundColor:
                      route.profileType === 'safest'
                        ? '#ff8a00'
                        : route.profileType === 'balanced'
                        ? '#38bdf8'
                        : '#f87171',
                  },
                ]}
              />
              <Text style={styles.profileBadge}>{route.label}</Text>
              {route.extraMinutes > 0 && (
                <Text style={styles.extraTimeText}>+{route.extraMinutes} min</Text>
              )}
            </View>
            <Text style={styles.metricsSummary}>
              {route.durationMinutes} min · {(route.distanceMeters / 1000).toFixed(1)} km
            </Text>
          </View>

          <View style={styles.headerScoreBlock}>
            <Text style={styles.headerScoreNumber}>{score}</Text>
            <Text style={styles.headerScoreLabel}>/100 Night Activity</Text>
          </View>
        </View>

        {/* Tab switch: Analysis vs All Establishments */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabButton, activeTab === 'analysis' && styles.tabButtonActive]}
            onPress={() => setActiveTab('analysis')}
          >
            <Text style={[styles.tabText, activeTab === 'analysis' && styles.tabTextActive]}>
              Score Breakdown & Factors
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'places' && styles.tabButtonActive]}
            onPress={() => setActiveTab('places')}
          >
            <Text style={[styles.tabText, activeTab === 'places' && styles.tabTextActive]}>
              All Places ({establishments.length})
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === 'analysis' ? (
            <>
              {/* Evidence banner */}
              <View style={styles.evidenceCard}>
                <Text style={styles.evidenceTitle}>Route Safety Indicators</Text>
                <Text style={styles.evidenceBody}>{route.routeEvidence}</Text>
              </View>

              {/* Grid of Key Indicators */}
              <View style={styles.indicatorsGrid}>
                <IndicatorCell
                  label="Open Places"
                  value={route.placesOpenNearRoute.toString()}
                  subtext="accessible now"
                />
                <IndicatorCell
                  label="Longest Quiet Gap"
                  value={`${route.longestQuietStretchMeters} m`}
                  subtext="between open shops"
                />
                <IndicatorCell
                  label="Main Roads"
                  value={`${route.mainRoadPercentage}%`}
                  subtext="primary corridors"
                />
                <IndicatorCell
                  label="Lighting Coverage"
                  value={`${route.lightingCoveragePercentage}%`}
                  subtext="illuminated zone"
                />
                <IndicatorCell
                  label="24/7 Services"
                  value={route.twentyFourSevenCount.toString()}
                  subtext="round-the-clock"
                />
                <IndicatorCell
                  label="Help Points"
                  value={(route.policeCount + route.hospitalsCount).toString()}
                  subtext="police + hospitals"
                />
              </View>

              {/* Detailed 9-Parameter Score Breakdown */}
              <Text style={styles.sectionHeader}>Category-wise Score Breakdown</Text>
              <View style={styles.scoreBreakdownContainer}>
                <ScoreBar
                  title="Open shops & commercial"
                  score={breakdown.openShopsScore}
                  max={20}
                  icon="🛍️"
                />
                <ScoreBar
                  title="Opening hours at arrival"
                  score={breakdown.openingHoursScore}
                  max={15}
                  icon="⏰"
                />
                <ScoreBar
                  title="Pharmacy & 24/7 essentials"
                  score={breakdown.essentialServicesScore}
                  max={10}
                  icon="💊"
                />
                <ScoreBar
                  title="Activity continuity (low gaps)"
                  score={breakdown.activityContinuityScore}
                  max={15}
                  icon="🚶"
                />
                <ScoreBar
                  title="Main-road accessibility"
                  score={breakdown.mainRoadScore}
                  max={10}
                  icon="🛣️"
                />
                <ScoreBar
                  title="Police & hospitals"
                  score={breakdown.helpPointsScore}
                  max={10}
                  icon="🚨"
                />
                <ScoreBar
                  title="Street lighting coverage"
                  score={breakdown.streetLightingScore}
                  max={10}
                  icon="💡"
                />
                <ScoreBar
                  title="Public CCTV infrastructure"
                  score={breakdown.cctvScore}
                  max={5}
                  icon="📷"
                />
                <ScoreBar
                  title="Public transport access"
                  score={breakdown.publicTransportScore}
                  max={5}
                  icon="🚇"
                />
              </View>

              {/* Disclaimer */}
              <Text style={styles.disclaimerText}>
                The Night Activity Score represents mapped safety-supporting indicators
                and open establishments. It does not guarantee personal safety.
              </Text>
            </>
          ) : (
            <>
              {/* List of establishments along route */}
              <Text style={styles.sectionHeader}>
                Establishments along route ({establishments.length})
              </Text>

              {establishments.map((place) => {
                const icon = PLACE_CATEGORY_ICONS[place.category] || '📍';
                const label = PLACE_CATEGORY_LABELS[place.category] || 'Place';
                const color = PLACE_MARKER_COLORS[place.category] || '#64748b';

                let statusBadge = 'Unknown';
                let statusBadgeBg = '#334155';

                if (place.is24_7) {
                  statusBadge = '24/7 Open';
                  statusBadgeBg = '#15803d';
                } else if (place.arrivalStatus === 'closing_soon') {
                  statusBadge = 'Closing Soon';
                  statusBadgeBg = '#b45309';
                } else if (
                  place.arrivalStatus === 'closed_at_arrival' ||
                  place.openAtJourneyTime === false
                ) {
                  statusBadge = 'Closed at Arrival';
                  statusBadgeBg = '#475569';
                } else if (
                  place.arrivalStatus === 'open_at_arrival' ||
                  place.openAtJourneyTime === true
                ) {
                  statusBadge = 'Open at Arrival';
                  statusBadgeBg = '#166534';
                }

                return (
                  <View key={place.id} style={styles.placeCard}>
                    <View style={styles.placeHeaderRow}>
                      <View style={[styles.placeIconBox, { borderColor: color }]}>
                        <Text style={styles.placeIconText}>{icon}</Text>
                      </View>
                      <View style={styles.placeInfo}>
                        <Text style={styles.placeName}>{place.name}</Text>
                        <Text style={styles.placeAddress}>
                          {place.address || label}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusBadgeBg }]}>
                        <Text style={styles.statusBadgeText}>{statusBadge}</Text>
                      </View>
                    </View>

                    <View style={styles.placeMetaRow}>
                      <Text style={styles.placeMetaText}>
                        📍 {place.distanceFromStartMeters ?? 0}m along route
                      </Text>
                      {place.estimatedArrivalTime ? (
                        <Text style={styles.placeMetaText}>
                          ⏰ Arrive ~{place.estimatedArrivalTime}
                        </Text>
                      ) : null}
                    </View>

                    {/* Actions: Call button & Focus on Map */}
                    <View style={styles.placeActionsRow}>
                      {place.phone ? (
                        <Pressable
                          style={styles.callButton}
                          onPress={() => handleCall(place.phone)}
                        >
                          <Text style={styles.callButtonText}>📞 Call {place.phone}</Text>
                        </Pressable>
                      ) : null}

                      {onFocusPlace ? (
                        <Pressable
                          style={styles.focusButton}
                          onPress={() => onFocusPlace(place)}
                        >
                          <Text style={styles.focusButtonText}>Show on Map</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Start navigation button */}
          {onStartNavigation && (
            <Pressable style={styles.startNavButton} onPress={onStartNavigation}>
              <Text style={styles.startNavButtonText}>Start Navigation on this Route</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IndicatorCell({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <View style={styles.indicatorCell}>
      <Text style={styles.indicatorValue}>{value}</Text>
      <Text style={styles.indicatorLabel}>{label}</Text>
      <Text style={styles.indicatorSubtext}>{subtext}</Text>
    </View>
  );
}

function ScoreBar({
  title,
  score,
  max,
  icon,
}: {
  title: string;
  score: number;
  max: number;
  icon: string;
}) {
  const percentage = Math.min(100, Math.round((score / max) * 100));
  return (
    <View style={styles.scoreBarRow}>
      <View style={styles.scoreBarLabelRow}>
        <Text style={styles.scoreBarTitle}>
          {icon} {title}
        </Text>
        <Text style={styles.scoreBarNumbers}>
          {score} / {max}
        </Text>
      </View>
      <View style={styles.scoreBarTrack}>
        <View style={[styles.scoreBarFill, { width: `${percentage}%` }]} />
      </View>
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
    zIndex: 90,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheet: {
    backgroundColor: '#0c1014',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#2b3139',
    maxHeight: '82%',
    paddingBottom: 24,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3b434d',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2229',
  },
  profileBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  profileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  profileBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f5f6f7',
  },
  extraTimeText: {
    fontSize: 12,
    color: '#aab2bb',
  },
  metricsSummary: {
    fontSize: 13,
    color: '#8b949e',
  },
  headerScoreBlock: {
    alignItems: 'flex-end',
  },
  headerScoreNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ff8a00',
  },
  headerScoreLabel: {
    fontSize: 10,
    color: '#8b949e',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1c2229',
    backgroundColor: '#11151a',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#ff8a00',
  },
  tabText: {
    fontSize: 12,
    color: '#8b949e',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#ff8a00',
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 36,
  },
  evidenceCard: {
    backgroundColor: '#1a1f26',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2b3139',
  },
  evidenceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f5f6f7',
    marginBottom: 4,
  },
  evidenceBody: {
    fontSize: 12,
    color: '#b0b7c0',
    lineHeight: 18,
  },
  indicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  indicatorCell: {
    width: '31%',
    backgroundColor: '#11151a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1e242d',
  },
  indicatorValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f5f6f7',
  },
  indicatorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#b0b7c0',
    marginTop: 2,
  },
  indicatorSubtext: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 1,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f5f6f7',
    marginBottom: 10,
    marginTop: 8,
  },
  scoreBreakdownContainer: {
    backgroundColor: '#11151a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e242d',
    marginBottom: 16,
  },
  scoreBarRow: {
    marginBottom: 10,
  },
  scoreBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreBarTitle: {
    fontSize: 11,
    color: '#b0b7c0',
  },
  scoreBarNumbers: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f5f6f7',
  },
  scoreBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1e252e',
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#ff8a00',
    borderRadius: 3,
  },
  disclaimerText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 8,
    lineHeight: 15,
  },
  placeCard: {
    backgroundColor: '#11151a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e242d',
  },
  placeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#192027',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  placeIconText: {
    fontSize: 14,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f5f6f7',
  },
  placeAddress: {
    fontSize: 11,
    color: '#8b949e',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#f5f6f7',
  },
  placeMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a2028',
  },
  placeMetaText: {
    fontSize: 11,
    color: '#b0b7c0',
  },
  placeActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  callButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  callButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38bdf8',
  },
  focusButton: {
    backgroundColor: '#1c222b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#374151',
  },
  focusButtonText: {
    fontSize: 11,
    color: '#b0b7c0',
  },
  startNavButton: {
    backgroundColor: '#ff8a00',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  startNavButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080a0c',
  },
});
