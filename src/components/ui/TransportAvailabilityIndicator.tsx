import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { TransportAvailabilitySummary, TransitStop, TransitType } from '@/features/transit/types';

interface TransportAvailabilityIndicatorProps {
  summary: TransportAvailabilitySummary;
  onSelectStop?: (stop: TransitStop) => void;
  initiallyExpanded?: boolean;
}

type TabType = 'metro' | 'bus' | 'all';

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${meters}m`;
}

export function TransportAvailabilityIndicator({
  summary,
  onSelectStop,
  initiallyExpanded = true,
}: TransportAvailabilityIndicatorProps) {
  // Default to metro if metro stops exist, otherwise bus or all
  const [activeTab, setActiveTab] = useState<TabType>(
    summary.metroCount > 0 ? 'metro' : summary.busCount > 0 ? 'bus' : 'all',
  );
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  // Auto-switch tab if current tab has zero items after route change
  React.useEffect(() => {
    if (activeTab === 'metro' && summary.metroCount === 0 && summary.busCount > 0) {
      setActiveTab('bus');
    } else if (activeTab === 'bus' && summary.busCount === 0 && summary.metroCount > 0) {
      setActiveTab('metro');
    }
  }, [activeTab, summary.metroCount, summary.busCount]);

  // Filter stops according to the active tab
  const displayedStops =
    activeTab === 'metro'
      ? summary.stops.filter((s) => s.type === 'metro')
      : activeTab === 'bus'
      ? summary.stops.filter((s) => s.type === 'bus')
      : summary.stops;

  return (
    <View style={styles.cardContainer}>
      {/* Header with Title and Overall Status Badge */}
      <Pressable
        style={styles.headerPressable}
        onPress={() => setIsExpanded(!isExpanded)}
        accessibilityRole="button"
        accessibilityLabel={`Transport Availability: ${summary.badgeLabel}. Tap to toggle list.`}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerEmoji}>🚇</Text>
            <View style={styles.headerTitleTextCol}>
              <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
                Nearest Transit (Start)
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {summary.metroCount} Metro · {summary.busCount} Bus Stops &amp; Terminus
              </Text>
            </View>
          </View>

          {/* Availability Status Badge */}
          <View style={[styles.statusBadge, { borderColor: summary.badgeColor }]}>
            <View style={[styles.statusDot, { backgroundColor: summary.badgeColor }]} />
            <Text style={[styles.statusBadgeText, { color: summary.badgeColor }]}>
              {summary.badgeLabel}
            </Text>
          </View>
        </View>

        {/* Quick Nearest Stop Highlight */}
        {summary.nearestStop && (
          <View style={styles.nearestStopRow}>
            <View style={styles.nearestStopMain}>
              <Text style={styles.nearestIcon}>
                {summary.nearestStop.type === 'metro' ? '🚇' : '🚏'}
              </Text>
              <Text style={styles.nearestText} numberOfLines={1} ellipsizeMode="tail">
                Nearest: <Text style={styles.nearestBold}>{summary.nearestStop.name}</Text>
              </Text>
            </View>
            <View style={styles.nearestStopMeta}>
              <Text style={styles.nearestDistance}>
                {formatDistance(summary.nearestStop.distanceMeters)} · ~{summary.nearestStop.walkingMinutes}m
              </Text>
              <Text style={[styles.chevron, { color: isExpanded ? '#ff9400' : '#85909b' }]}>
                {isExpanded ? '▲' : '▼'}
              </Text>
            </View>
          </View>
        )}
      </Pressable>

      {/* Expandable Tabbed Content */}
      {isExpanded && (
        <View style={styles.bodyContent}>
          {summary.nightTransitAlert && (
            <View style={styles.alertBox}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <Text style={styles.alertText}>{summary.nightTransitAlert}</Text>
            </View>
          )}

          {/* SEPARATE TABS: Metro Stations vs Bus Stops vs All */}
          <View style={styles.tabBar}>
            <Pressable
              style={[
                styles.tabButton,
                activeTab === 'metro' && styles.tabButtonActiveMetro,
              ]}
              onPress={() => setActiveTab('metro')}
              accessibilityRole="button"
              accessibilityLabel={`Metro stations tab, ${summary.metroCount} available`}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'metro' && styles.tabButtonTextActiveMetro,
                ]}
                numberOfLines={1}
              >
                🚇 Metro ({summary.metroCount})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabButton,
                activeTab === 'bus' && styles.tabButtonActiveBus,
              ]}
              onPress={() => setActiveTab('bus')}
              accessibilityRole="button"
              accessibilityLabel={`Bus stops and terminus tab, ${summary.busCount} available`}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'bus' && styles.tabButtonTextActiveBus,
                ]}
                numberOfLines={1}
              >
                🚏 Bus ({summary.busCount})
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.tabButton,
                activeTab === 'all' && styles.tabButtonActiveAll,
              ]}
              onPress={() => setActiveTab('all')}
              accessibilityRole="button"
              accessibilityLabel={`All transit stops tab, ${summary.totalStops} available`}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === 'all' && styles.tabButtonTextActiveAll,
                ]}
                numberOfLines={1}
              >
                All ({summary.totalStops})
              </Text>
            </Pressable>
          </View>

          {/* LIST OF STOPS UNDER ACTIVE TAB */}
          <View style={styles.stopsList}>
            {displayedStops.length === 0 ? (
              <View style={styles.emptyTabState}>
                <Text style={styles.emptyTabEmoji}>
                  {activeTab === 'metro' ? '🚇' : activeTab === 'bus' ? '🚏' : '🗺️'}
                </Text>
                <Text style={styles.emptyTabTitle}>
                  {activeTab === 'metro'
                    ? 'No Metro Stations Near Start'
                    : activeTab === 'bus'
                    ? 'No Bus Stops / Terminus Near Start'
                    : 'No Transit Stations Near Start'}
                </Text>
                <Text style={styles.emptyTabSubtext}>
                  {activeTab === 'metro'
                    ? 'No metro stations detected within walking distance of your starting point.'
                    : 'No bus stops or bus terminus detected within walking distance of your starting point.'}
                </Text>
              </View>
            ) : (
              displayedStops.map((stop) => {
                const isMetro = stop.subType === 'metro' || stop.type === 'metro';
                const isTerminus = stop.subType === 'bus_terminus';
                const typeLabel = isMetro ? 'METRO' : isTerminus ? 'TERMINUS' : 'BUS STOP';
                const typeColor = isMetro ? '#38bdf8' : isTerminus ? '#fbbf24' : '#34d399';

                return (
                  <Pressable
                    key={stop.id}
                    style={styles.stopCard}
                    onPress={() => onSelectStop?.(stop)}
                  >
                    <View style={styles.stopIconCol}>
                      <Text style={styles.stopEmoji}>
                        {isMetro ? '🚇' : isTerminus ? '🏢' : '🚏'}
                      </Text>
                      <Text style={[styles.stopTypePill, { color: typeColor }]}>
                        {typeLabel}
                      </Text>
                    </View>

                    <View style={styles.stopInfoCol}>
                      <Text style={styles.stopName} numberOfLines={1} ellipsizeMode="tail">
                        {stop.name}
                      </Text>

                      <View style={styles.stopMetaRow}>
                        <Text
                          style={[styles.stopStatusBadge, { color: stop.badgeColor }]}
                          numberOfLines={1}
                        >
                          ● {stop.statusText}
                        </Text>
                        <Text style={styles.stopDistMeta} numberOfLines={1}>
                          · {formatDistance(stop.distanceMeters)} (~{stop.walkingMinutes}m walk)
                        </Text>
                      </View>

                      {stop.lastDepartureText && (
                        <Text
                          style={styles.stopFrequencyText}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          ⏱️ {stop.lastDepartureText}
                        </Text>
                      )}
                    </View>

                    {onSelectStop && (
                      <Text style={styles.stopArrow}>›</Text>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Safety benefit note */}
          <View style={styles.safetyBenefitBox}>
            <Text style={styles.safetyBenefitIcon}>💡</Text>
            <Text style={styles.safetyBenefitText}>
              Transit stations provide verified lighting, CCTV, and staff presence if you need a safe waiting point or exit.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#11151a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#242a32',
    marginVertical: 10,
    overflow: 'hidden',
    width: '100%',
  },
  headerPressable: {
    padding: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerEmoji: {
    fontSize: 24,
  },
  headerTitleTextCol: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    color: '#f5f6f7',
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#8b96a5',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#181f28',
    flexShrink: 0,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  nearestStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1d232c',
    gap: 8,
  },
  nearestStopMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  nearestIcon: {
    fontSize: 13,
  },
  nearestText: {
    color: '#a0aab8',
    fontSize: 12,
    flex: 1,
    minWidth: 0,
  },
  nearestBold: {
    color: '#f5f6f7',
    fontWeight: '600',
  },
  nearestStopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  nearestDistance: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 11,
  },
  bodyContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#1d232c',
    backgroundColor: '#0c0f13',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    borderRadius: 10,
    padding: 9,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  alertIcon: {
    fontSize: 14,
  },
  alertText: {
    color: '#fde047',
    fontSize: 11,
    flex: 1,
    minWidth: 0,
    lineHeight: 15,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#151b22',
    borderWidth: 1,
    borderColor: '#262f3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActiveMetro: {
    backgroundColor: '#0d2238',
    borderColor: '#38bdf8',
  },
  tabButtonActiveBus: {
    backgroundColor: '#0d2a22',
    borderColor: '#34d399',
  },
  tabButtonActiveAll: {
    backgroundColor: '#261b0c',
    borderColor: '#ff9400',
  },
  tabButtonText: {
    color: '#8b96a5',
    fontSize: 11,
    fontWeight: '600',
  },
  tabButtonTextActiveMetro: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  tabButtonTextActiveBus: {
    color: '#34d399',
    fontWeight: '700',
  },
  tabButtonTextActiveAll: {
    color: '#ff9400',
    fontWeight: '700',
  },
  stopsList: {
    marginTop: 2,
  },
  emptyTabState: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  emptyTabEmoji: {
    fontSize: 26,
    marginBottom: 4,
  },
  emptyTabTitle: {
    color: '#f5f6f7',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyTabSubtext: {
    color: '#7b8796',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 15,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13181f',
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#222933',
    gap: 10,
    overflow: 'hidden',
  },
  stopIconCol: {
    alignItems: 'center',
    width: 48,
    flexShrink: 0,
  },
  stopEmoji: {
    fontSize: 20,
  },
  stopTypePill: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  stopInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  stopName: {
    color: '#f5f6f7',
    fontSize: 14,
    fontWeight: '600',
  },
  stopMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 3,
    gap: 4,
  },
  stopStatusBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  stopDistMeta: {
    color: '#7b8796',
    fontSize: 11,
  },
  stopFrequencyText: {
    color: '#a0aab8',
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  stopArrow: {
    color: '#7b8796',
    fontSize: 18,
    fontWeight: '300',
    flexShrink: 0,
    paddingLeft: 2,
  },
  safetyBenefitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#141a22',
    padding: 9,
    borderRadius: 10,
    marginTop: 10,
  },
  safetyBenefitIcon: {
    fontSize: 13,
  },
  safetyBenefitText: {
    color: '#85909b',
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
    minWidth: 0,
  },
});
