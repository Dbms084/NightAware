import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteOption, Coordinate } from '@/types/geo';
import { useGuardianContacts } from '@/features/guardian/hooks/useGuardianContacts';
import {
  createJourneyShareMessage,
  formatTimeAmPm,
  shareViaSms,
  shareViaSystem,
  shareViaWhatsApp,
} from '@/features/guardian/services/journey-share-service';
import type { WatchOverMeJourneyDetails } from '@/features/guardian/types';
import { ManageContactsModal } from './ManageContactsModal';

interface WatchOverMeModalProps {
  visible: boolean;
  onClose: () => void;
  route: RouteOption;
  destinationName: string;
  originName: string;
  originCoord: Coordinate;
  destinationCoord: Coordinate;
  openPlacesCount: number;
  onActivateGuardian: () => void;
}

export function WatchOverMeModal({
  visible,
  onClose,
  route,
  destinationName,
  originName,
  originCoord,
  destinationCoord,
  openPlacesCount,
  onActivateGuardian,
}: WatchOverMeModalProps) {
  const insets = useSafeAreaInsets();
  const { contacts, primaryContact, refreshContacts } = useGuardianContacts();
  const [isManageContactsOpen, setIsManageContactsOpen] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Auto-refresh contacts when modal opens
  React.useEffect(() => {
    if (visible) {
      void refreshContacts();
    }
  }, [visible, refreshContacts]);

  // Auto-select contacts who have notifyOnStart set, or primary
  React.useEffect(() => {
    if (contacts.length > 0) {
      const defaultIds = contacts.filter((c) => c.notifyOnStart).map((c) => c.id);
      setSelectedContactIds(defaultIds.length > 0 ? defaultIds : [contacts[0].id]);
    } else {
      setSelectedContactIds([]);
    }
  }, [contacts]);

  // Compute estimated arrival
  const departureDate = new Date();
  const arrivalDate = new Date(departureDate.getTime() + route.durationMinutes * 60 * 1000);
  const formattedArrival = formatTimeAmPm(arrivalDate);

  const journeyDetails: WatchOverMeJourneyDetails = {
    routeId: route.id,
    routeLabel: route.label,
    profileType: route.profileType,
    durationMinutes: route.durationMinutes,
    distanceMeters: route.distanceMeters,
    nightActivityScore: route.nightActivityScore,
    openPlacesCount,
    originName,
    destinationName,
    originCoord,
    destinationCoord,
    departureTime: departureDate,
    estimatedArrivalTime: arrivalDate,
    longestQuietStretchMeters: route.longestQuietStretchMeters,
  };

  const shareMessage = createJourneyShareMessage(journeyDetails);

  const toggleSelectContact = (id: string) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter((item) => item !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  const handleShareWhatsApp = async () => {
    const targetContacts = contacts.filter((c) => selectedContactIds.includes(c.id));
    const target = targetContacts[0] || primaryContact;

    if (!target) {
      setIsManageContactsOpen(true);
      return;
    }

    const success = await shareViaWhatsApp(target.phone, shareMessage);
    if (success) {
      setShareFeedback(`Shared trip with ${target.name} via WhatsApp!`);
      setTimeout(() => setShareFeedback(null), 4000);
    } else {
      Alert.alert('Share', 'Could not open WhatsApp. Opening standard share sheet instead.', [
        { text: 'OK', onPress: () => void shareViaSystem(shareMessage) },
      ]);
    }
  };

  const handleShareSms = async () => {
    const targetContacts = contacts.filter((c) => selectedContactIds.includes(c.id));
    const target = targetContacts[0] || primaryContact;

    if (!target) {
      setIsManageContactsOpen(true);
      return;
    }

    const success = await shareViaSms(target.phone, shareMessage);
    if (success) {
      setShareFeedback(`Prepared SMS for ${target.name}!`);
      setTimeout(() => setShareFeedback(null), 4000);
    }
  };

  const handleShareSystem = async () => {
    await shareViaSystem(shareMessage);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.shieldBadge}>
                  <Text style={styles.shieldIcon}>🛡️</Text>
                </View>
                <View>
                  <Text style={styles.headerTitle}>Watch Over Me</Text>
                  <Text style={styles.headerSubtitle}>
                    Active Night Companion & Contact Alerting
                  </Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {/* Trip Snapshot Card */}
              <View style={styles.tripCard}>
                <View style={styles.tripCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.destinationLabel}>DESTINATION</Text>
                    <Text style={styles.destinationName} numberOfLines={1}>
                      {destinationName}
                    </Text>
                  </View>
                  <View style={styles.scorePill}>
                    <Text style={styles.scorePillNum}>{route.nightActivityScore}</Text>
                    <Text style={styles.scorePillDenom}>/100</Text>
                  </View>
                </View>

                <View style={styles.tripStatsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Expected Arrival</Text>
                    <Text style={styles.statValue}>~{formattedArrival}</Text>
                    <Text style={styles.statSub}>in {route.durationMinutes} min</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Route Profile</Text>
                    <Text style={styles.statValue}>{route.label}</Text>
                    <Text style={styles.statSub}>{(route.distanceMeters / 1000).toFixed(1)} km</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Open Safe POIs</Text>
                    <Text style={[styles.statValue, { color: '#4ade80' }]}>
                      {openPlacesCount} places
                    </Text>
                    <Text style={styles.statSub}>along corridor</Text>
                  </View>
                </View>
              </View>

              {/* Feedback Alert Pill */}
              {shareFeedback && (
                <View style={styles.feedbackBanner}>
                  <Text style={styles.feedbackText}>✓ {shareFeedback}</Text>
                </View>
              )}

              {/* Trusted Contacts Section */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>TRUSTED CONTACTS TO ALERT</Text>
                <Pressable
                  onPress={() => setIsManageContactsOpen(true)}
                  style={styles.manageBtn}
                  hitSlop={8}
                >
                  <Text style={styles.manageBtnText}>
                    {contacts.length > 0 ? 'Edit Contacts ⚙️' : '＋ Add Contacts'}
                  </Text>
                </Pressable>
              </View>

              {contacts.length === 0 ? (
                <Pressable
                  style={styles.noContactsCard}
                  onPress={() => setIsManageContactsOpen(true)}
                >
                  <Text style={styles.noContactsIcon}>👥</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noContactsTitle}>No Trusted Contacts Added</Text>
                    <Text style={styles.noContactsSub}>
                      Tap here to add Mom, partner, or friend to receive your trip ETA and arrival confirmation.
                    </Text>
                  </View>
                  <Text style={styles.noContactsAction}>＋ Add</Text>
                </Pressable>
              ) : (
                <View style={styles.contactsList}>
                  {contacts.map((contact) => {
                    const isSelected = selectedContactIds.includes(contact.id);
                    return (
                      <Pressable
                        key={contact.id}
                        style={[styles.contactRow, isSelected && styles.contactRowSelected]}
                        onPress={() => toggleSelectContact(contact.id)}
                      >
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
                        </View>
                        <View style={styles.contactInfo}>
                          <View style={styles.contactNameRow}>
                            <Text style={styles.contactName}>{contact.name}</Text>
                            <Text style={styles.relTag}>{contact.relationship}</Text>
                            {contact.isPrimarySos && (
                              <Text style={styles.primaryTag}>⭐ Primary</Text>
                            )}
                          </View>
                          <Text style={styles.contactPhone}>{contact.phone}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Quick 1-Tap Share Buttons */}
              <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
                1-TAP LIVE TRIP SHARING
              </Text>
              <View style={styles.shareRow}>
                <Pressable style={styles.whatsappBtn} onPress={handleShareWhatsApp}>
                  <Text style={styles.shareBtnIcon}>💬</Text>
                  <Text style={styles.whatsappBtnText}>WhatsApp</Text>
                </Pressable>

                <Pressable style={styles.smsBtn} onPress={handleShareSms}>
                  <Text style={styles.shareBtnIcon}>✉️</Text>
                  <Text style={styles.smsBtnText}>SMS Alert</Text>
                </Pressable>

                <Pressable style={styles.systemShareBtn} onPress={handleShareSystem}>
                  <Text style={styles.shareBtnIcon}>📤</Text>
                  <Text style={styles.systemShareBtnText}>Other Apps</Text>
                </Pressable>
              </View>

              {/* Autonomous Features Info */}
              <View style={styles.featuresCard}>
                <Text style={styles.featuresHeading}>🛡️ Autonomous Watchdogs during trip:</Text>
                <View style={styles.featureItem}>
                  <Text style={styles.featureBullet}>•</Text>
                  <Text style={styles.featureText}>
                    <Text style={{ fontWeight: '700', color: '#f8fafc' }}>Corridor Deviation Alert:</Text> Alerts you if you move over 200m off the selected safe corridor.
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureBullet}>•</Text>
                  <Text style={styles.featureText}>
                    <Text style={{ fontWeight: '700', color: '#f8fafc' }}>Quiet Zone Stoppage:</Text> Prompts a safety check-in if stationary in an isolated segment.
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.featureBullet}>•</Text>
                  <Text style={styles.featureText}>
                    <Text style={{ fontWeight: '700', color: '#f8fafc' }}>Safe Arrival Ping:</Text> Auto-triggers arrival confirmation when within 50m of home.
                  </Text>
                </View>
              </View>

              {/* Activate Button */}
              <Pressable
                style={styles.activateGuardianBtn}
                onPress={() => {
                  onClose();
                  onActivateGuardian();
                }}
              >
                <Text style={styles.activateGuardianIcon}>🛡️</Text>
                <Text style={styles.activateGuardianText}>
                  Activate Watch Over Me & Start Journey
                </Text>
                <Text style={styles.activateChevron}>➔</Text>
              </Pressable>

              <Text style={styles.disclaimerText}>
                Privacy-first: All watchdog evaluations run on your phone. No coordinates are shared without your tap.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sub-modal to manage contacts */}
      <ManageContactsModal
        visible={isManageContactsOpen}
        onClose={() => {
          setIsManageContactsOpen(false);
          void refreshContacts();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 12, 0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0c1017',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#202936',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2330',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  shieldBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 138, 0, 0.15)',
    borderWidth: 1.5,
    borderColor: '#ff8a00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a2330',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tripCard: {
    backgroundColor: '#131923',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222d3d',
    marginBottom: 16,
  },
  tripCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1d2634',
    paddingBottom: 12,
    marginBottom: 12,
  },
  destinationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ff8a00',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255, 138, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff8a00',
  },
  scorePillNum: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ff8a00',
  },
  scorePillDenom: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  tripStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#f8fafc',
  },
  statSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  feedbackBanner: {
    backgroundColor: 'rgba(74, 222, 128, 0.14)',
    borderWidth: 1,
    borderColor: '#4ade80',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  feedbackText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  manageBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  manageBtnText: {
    fontSize: 11.5,
    color: '#ff8a00',
    fontWeight: '700',
  },
  noContactsCard: {
    backgroundColor: '#141a24',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#283344',
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  noContactsIcon: {
    fontSize: 24,
  },
  noContactsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 2,
  },
  noContactsSub: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 15,
  },
  noContactsAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ff8a00',
  },
  contactsList: {
    gap: 8,
    marginBottom: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121822',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#202a38',
    gap: 12,
  },
  contactRowSelected: {
    borderColor: '#ff8a00',
    backgroundColor: 'rgba(255, 138, 0, 0.06)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#ff8a00',
    borderColor: '#ff8a00',
  },
  checkboxCheck: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#f8fafc',
  },
  relTag: {
    fontSize: 10,
    color: '#94a3b8',
    backgroundColor: '#1a2330',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  primaryTag: {
    fontSize: 9.5,
    color: '#f59e0b',
    fontWeight: '700',
  },
  contactPhone: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  whatsappBtn: {
    flex: 1,
    backgroundColor: '#128c7e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  whatsappBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12.5,
  },
  smsBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  smsBtnText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 12.5,
  },
  systemShareBtn: {
    flex: 1,
    backgroundColor: '#18202d',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#263346',
  },
  systemShareBtnText: {
    color: '#cbd5e1',
    fontWeight: '700',
    fontSize: 12.5,
  },
  shareBtnIcon: {
    fontSize: 14,
  },
  featuresCard: {
    backgroundColor: '#10151f',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1d2634',
  },
  featuresHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ff8a00',
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 5,
  },
  featureBullet: {
    color: '#ff8a00',
    fontSize: 13,
  },
  featureText: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
    lineHeight: 16,
  },
  activateGuardianBtn: {
    backgroundColor: '#ff8a00',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    shadowColor: '#ff8a00',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  activateGuardianIcon: {
    fontSize: 18,
  },
  activateGuardianText: {
    color: '#080c12',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  activateChevron: {
    color: '#080c12',
    fontWeight: '900',
    fontSize: 15,
  },
  disclaimerText: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 20,
  },
});
