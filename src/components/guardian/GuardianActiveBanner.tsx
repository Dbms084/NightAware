import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TrustedContact } from '@/features/guardian/types';
import {
  callContact,
  createSafeArrivalMessage,
  shareViaWhatsApp,
} from '@/features/guardian/services/journey-share-service';

interface GuardianActiveBannerProps {
  destinationName: string;
  primaryContact?: TrustedContact;
  onEndJourney: () => void;
  deviationMeters?: number;
  isOffCorridor?: boolean;
  isArrived?: boolean;
}

export function GuardianActiveBanner({
  destinationName,
  primaryContact,
  onEndJourney,
  deviationMeters = 0,
  isOffCorridor = false,
  isArrived = false,
}: GuardianActiveBannerProps) {
  const handleSendArrival = async () => {
    const arrivalMsg = createSafeArrivalMessage(destinationName);
    if (primaryContact) {
      await shareViaWhatsApp(primaryContact.phone, arrivalMsg);
      Alert.alert('Arrived Safely 🎉', `Notified ${primaryContact.name} of your safe arrival!`, [
        { text: 'Complete Journey', onPress: onEndJourney },
      ]);
    } else {
      Alert.alert('Arrived Safely 🎉', 'Glad you made it safely!', [
        { text: 'Complete Journey', onPress: onEndJourney },
      ]);
    }
  };

  const handleSosCall = () => {
    const targetPhone = primaryContact?.phone || '112';
    const targetName = primaryContact ? `${primaryContact.name} (${primaryContact.phone})` : 'Police (112)';

    Alert.alert(
      'Emergency SOS Call',
      `Directly call emergency contact: ${targetName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          style: 'destructive',
          onPress: () => void callContact(targetPhone),
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.container,
        isArrived && styles.containerArrived,
        isOffCorridor && !isArrived && styles.containerDeviated,
      ]}
    >
      <View style={styles.leftCol}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.pulseDot,
              isArrived && { backgroundColor: '#4ade80' },
              isOffCorridor && !isArrived && { backgroundColor: '#f87171' },
            ]}
          />
          <Text
            style={[
              styles.title,
              isArrived && { color: '#4ade80' },
              isOffCorridor && !isArrived && { color: '#f87171' },
            ]}
          >
            {isArrived
              ? 'DESTINATION REACHED'
              : isOffCorridor
              ? `DEVIATION DETECTED (+${deviationMeters}m)`
              : 'WATCH OVER ME ACTIVE'}
          </Text>
        </View>
        <Text style={styles.subtext}>
          {isArrived
            ? 'Within 50m of destination. Tap Arrived to alert contacts.'
            : isOffCorridor
            ? 'You have veered >200m from the planned safe corridor.'
            : primaryContact
            ? `Guardian linked with ${primaryContact.name} · Corridor monitored`
            : 'On-device corridor deviation & arrival watchdog active'}
        </Text>
      </View>

      <View style={styles.actionCol}>
        <Pressable
          style={[styles.arrivedBtn, isArrived && styles.arrivedBtnHighlight]}
          onPress={handleSendArrival}
        >
          <Text style={[styles.arrivedBtnText, isArrived && styles.arrivedBtnTextHighlight]}>
            🏡 Arrived
          </Text>
        </Pressable>

        <Pressable style={styles.sosCallBtn} onPress={handleSosCall}>
          <Text style={styles.sosCallBtnText}>🚨 SOS</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0c1118',
    borderBottomWidth: 1,
    borderBottomColor: '#1c2432',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  containerDeviated: {
    backgroundColor: '#1a1012',
    borderBottomColor: '#7f1d1d',
  },
  containerArrived: {
    backgroundColor: '#0c1a14',
    borderBottomColor: '#166534',
  },
  leftCol: {
    flex: 1,
    marginRight: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  title: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#4ade80',
    letterSpacing: 0.6,
  },
  subtext: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrivedBtn: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1,
    borderColor: '#4ade80',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  arrivedBtnHighlight: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  arrivedBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4ade80',
  },
  arrivedBtnTextHighlight: {
    color: '#052e16',
    fontWeight: '900',
  },
  sosCallBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sosCallBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ef4444',
  },
});
