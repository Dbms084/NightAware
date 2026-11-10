import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import type { TrustedContact } from '@/features/guardian/types';
import {
  callContact,
  createEmergencyAlertMessage,
  shareViaSms,
  shareViaWhatsApp,
} from '@/features/guardian/services/journey-share-service';
import {
  startAlarmSound,
  stopAlarmSound,
} from '@/features/guardian/services/alarm-sound-service';
import type { Coordinate } from '@/types/geo';

export type AlertType = 'deviation' | 'stoppage' | 'battery';

interface SafetyCheckInModalProps {
  visible: boolean;
  alertType: AlertType | null;
  deviationMeters?: number;
  stoppedDurationMinutes?: number;
  currentCoord?: Coordinate | null;
  destinationName: string;
  primaryContact?: TrustedContact;
  onConfirmSafe: () => void;
  onSosTriggered: () => void;
}

const COUNTDOWN_SECONDS = 90;

export function SafetyCheckInModal({
  visible,
  alertType,
  deviationMeters = 0,
  stoppedDurationMinutes = 4,
  currentCoord,
  destinationName,
  primaryContact,
  onConfirmSafe,
  onSosTriggered,
}: SafetyCheckInModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(COUNTDOWN_SECONDS);
  const isEscalatingRef = useRef(false);

  // Trigger alarm sound and vibration pattern when alert opens
  useEffect(() => {
    if (visible && alertType) {
      setSecondsRemaining(COUNTDOWN_SECONDS);
      isEscalatingRef.current = false;
      void startAlarmSound();
    } else {
      void stopAlarmSound();
      isEscalatingRef.current = false;
    }
    return () => {
      void stopAlarmSound();
    };
  }, [visible, alertType]);

  // Countdown timer (Pure state updates only - no side-effects in setState callback)
  useEffect(() => {
    if (!visible || !alertType) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, alertType]);

  // Auto-escalation side-effect when countdown reaches 0
  useEffect(() => {
    if (visible && alertType && secondsRemaining === 0 && !isEscalatingRef.current) {
      isEscalatingRef.current = true;
      void handleExecuteSos();
    }
  }, [secondsRemaining, visible, alertType]);

  const handleExecuteSos = async () => {
    void stopAlarmSound();
    onSosTriggered();
    const phone = primaryContact?.phone || '112';
    const message = createEmergencyAlertMessage(
      destinationName,
      currentCoord || undefined,
    );

    // Attempt WhatsApp or SMS alert
    if (primaryContact?.phone) {
      await shareViaSms(primaryContact.phone, message);
    }
    // Direct phone call
    void callContact(phone);
  };

  const handleConfirmSafe = () => {
    void stopAlarmSound();
    onConfirmSafe();
  };

  if (!visible || !alertType) return null;

  const isDeviation = alertType === 'deviation';
  const isStoppage = alertType === 'stoppage';
  const isBattery = alertType === 'battery';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleConfirmSafe}>
      <View style={styles.backdrop}>
        <View style={styles.alertCard}>
          {/* Pulsing Alert Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.alertIcon}>
              {isDeviation ? '⚠️' : isStoppage ? '⏱️' : '🔋'}
            </Text>
          </View>

          {/* Alert Title */}
          <Text style={styles.alertTitle}>
            {isDeviation
              ? 'ROUTE DEVIATION DETECTED'
              : isStoppage
              ? 'UNEXPECTED STOPPAGE DETECTED'
              : 'CRITICAL LOW BATTERY'}
          </Text>

          {/* Description */}
          <Text style={styles.alertDescription}>
            {isDeviation
              ? `You have moved ~${deviationMeters}m off your chosen safe corridor. Please verify your surroundings.`
              : isStoppage
              ? `You have remained motionless for ~${stoppedDurationMinutes} minutes in a designated quiet stretch.`
              : `Your battery is critically low. Notify your trusted contacts before your device powers off.`}
          </Text>

          {/* Countdown timer */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>AUTOMATIC SOS ESCALATION IN</Text>
            <Text style={styles.countdownValue}>{secondsRemaining}s</Text>
          </View>

          {/* Contact hint */}
          {primaryContact && (
            <Text style={styles.contactEscalationHint}>
              Escalation contact: <Text style={{ color: '#f8fafc', fontWeight: '700' }}>{primaryContact.name} ({primaryContact.phone})</Text>
            </Text>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsColumn}>
            {/* Safe Confirm Button */}
            <Pressable style={styles.safeBtn} onPress={handleConfirmSafe}>
              <Text style={styles.safeBtnIcon}>✅</Text>
              <Text style={styles.safeBtnText}>I AM SAFE (DISMISS)</Text>
            </Pressable>

            {/* Emergency SOS Button */}
            <Pressable style={styles.sosBtn} onPress={handleExecuteSos}>
              <Text style={styles.sosBtnIcon}>🚨</Text>
              <Text style={styles.sosBtnText}>SEND SOS & CALL CONTACT</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertCard: {
    backgroundColor: '#121720',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  alertIcon: {
    fontSize: 32,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#f87171',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  alertDescription: {
    fontSize: 13,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  countdownContainer: {
    backgroundColor: '#1a222f',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#293547',
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
  },
  countdownValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#f59e0b',
    marginTop: 2,
  },
  contactEscalationHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 16,
    textAlign: 'center',
  },
  actionsColumn: {
    width: '100%',
    gap: 10,
  },
  safeBtn: {
    backgroundColor: '#15803d',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  safeBtnIcon: {
    fontSize: 18,
  },
  safeBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13.5,
    letterSpacing: 0.3,
  },
  sosBtn: {
    backgroundColor: '#991b1b',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  sosBtnIcon: {
    fontSize: 18,
  },
  sosBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13.5,
    letterSpacing: 0.3,
  },
});
