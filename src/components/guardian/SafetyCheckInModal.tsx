import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
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
  subscribeAlarmStatus,
} from '@/features/guardian/services/alarm-sound-service';
import type { Coordinate } from '@/types/geo';

export type AlertType = 'deviation' | 'stoppage' | 'battery' | 'arrival';

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

interface AlertMeta {
  icon: string;
  title: string;
  description: string;
  reason: string;
}

function getAlertMeta(
  alertType: AlertType,
  destinationName: string,
  deviationMeters: number,
  stoppedDurationMinutes: number,
): AlertMeta {
  const table: Record<AlertType, AlertMeta> = {
    deviation: {
      icon: '⚠️',
      title: 'ROUTE DEVIATION DETECTED',
      description: `You have moved ~${deviationMeters}m off your chosen safe corridor. Please verify your surroundings.`,
      reason: `Route deviation (+${deviationMeters}m off corridor)`,
    },
    stoppage: {
      icon: '⏱️',
      title: 'UNEXPECTED STOPPAGE DETECTED',
      description: `You have remained motionless for ~${stoppedDurationMinutes} minutes in a designated quiet stretch.`,
      reason: `Unexpected stoppage (${stoppedDurationMinutes} min motionless)`,
    },
    battery: {
      icon: '🔋',
      title: 'CRITICAL LOW BATTERY',
      description:
        'Your battery is critically low. Confirm you are safe or notify your trusted contact before your phone powers off.',
      reason: 'Critical low battery (<15%)',
    },
    arrival: {
      icon: '🏡',
      title: 'ARRIVED — CONFIRM YOU ARE SAFE',
      description: `You are within 50m of ${destinationName}. Confirm you are safe inside. Unanswered alerts escalate SOS to your primary contact.`,
      reason: 'Unconfirmed arrival at destination',
    },
  };
  return table[alertType];
}

async function resolveEmergencyCoord(
  currentCoord?: Coordinate | null,
): Promise<Coordinate | undefined> {
  if (currentCoord) return currentCoord;
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return undefined;
    const last = await Location.getLastKnownPositionAsync();
    if (last?.coords) {
      return { latitude: last.coords.latitude, longitude: last.coords.longitude };
    }
  } catch {
    // Location fallback is best-effort only
  }
  return undefined;
}

interface SafetyCheckInContentProps {
  alertType: AlertType;
  deviationMeters: number;
  stoppedDurationMinutes: number;
  currentCoord?: Coordinate | null;
  destinationName: string;
  primaryContact?: TrustedContact;
  onConfirmSafe: () => void;
  onSosTriggered: () => void;
}

function SafetyCheckInContent({
  alertType,
  deviationMeters,
  stoppedDurationMinutes,
  currentCoord,
  destinationName,
  primaryContact,
  onConfirmSafe,
  onSosTriggered,
}: SafetyCheckInContentProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(COUNTDOWN_SECONDS);
  const [isEscalated, setIsEscalated] = useState(false);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [alarmStatus, setAlarmStatus] = useState<string>('');
  const [lastSosMessage, setLastSosMessage] = useState<string>('');

  const isEscalatingRef = useRef(false);
  const appStateSubRef = useRef<{ remove: () => void } | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingCallTriggers = useCallback(() => {
    if (appStateSubRef.current) {
      appStateSubRef.current.remove();
      appStateSubRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  // Start alarm & vibration on mount; always clean up on unmount
  useEffect(() => {
    const unsub = subscribeAlarmStatus(setAlarmStatus);
    void startAlarmSound();
    return () => {
      unsub();
      void stopAlarmSound();
      clearPendingCallTriggers();
    };
  }, [clearPendingCallTriggers]);

  const launchCallWithStatus = useCallback(
    async (targetPhone: string, label: string) => {
      clearPendingCallTriggers();
      const callOpened = await callContact(targetPhone);
      setCallStatus(
        callOpened
          ? `Opened phone dialer for ${label}`
          : `Could not open dialer for ${label} on this device`,
      );
    },
    [clearPendingCallTriggers],
  );

  const handleExecuteSos = useCallback(async () => {
    if (isEscalatingRef.current) return;
    isEscalatingRef.current = true;

    void stopAlarmSound();
    setIsEscalated(true);

    const meta = getAlertMeta(
      alertType,
      destinationName,
      deviationMeters,
      stoppedDurationMinutes,
    );
    const resolvedCoord = await resolveEmergencyCoord(currentCoord);
    const message = createEmergencyAlertMessage(
      destinationName,
      resolvedCoord,
      meta.reason,
    );
    setLastSosMessage(message);

    const targetPhone = primaryContact?.phone || '112';
    const targetLabel = primaryContact
      ? `${primaryContact.name} (${primaryContact.phone})`
      : 'Emergency Helpline (112)';

    // 1. Open pre-filled SOS SMS to primary contact first (if configured)
    let smsOpened = false;
    if (primaryContact?.phone) {
      smsOpened = await shareViaSms(primaryContact.phone, message);
      setSmsStatus(
        smsOpened
          ? `Opened SOS SMS composer for ${targetLabel}`
          : `Could not open SMS composer for ${targetLabel}`,
      );
    } else {
      setSmsStatus('No primary trusted contact set — skipping SMS and dialing 112');
    }

    // 2. Schedule SOS call without clobbering the SMS composer:
    //    If SMS backgrounded the app, dial as soon as the app returns to foreground;
    //    otherwise launch dialer after a short delay (or immediately if SMS didn't open).
    if (!smsOpened) {
      await launchCallWithStatus(targetPhone, targetLabel);
      return;
    }

    setCallStatus(`Waiting to open dialer for ${targetLabel} after SMS step...`);

    const triggerDial = () => {
      void launchCallWithStatus(targetPhone, targetLabel);
    };

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        triggerDial();
      }
    });
    appStateSubRef.current = subscription;

    // Fallback: if the OS/browser kept the app active when launching sms:, dial after 1.5s
    fallbackTimerRef.current = setTimeout(() => {
      if (AppState.currentState === 'active') {
        triggerDial();
      }
    }, 1500);
  }, [
    alertType,
    currentCoord,
    destinationName,
    deviationMeters,
    launchCallWithStatus,
    primaryContact,
    stoppedDurationMinutes,
  ]);

  const executeSosRef = useRef(handleExecuteSos);
  useEffect(() => {
    executeSosRef.current = handleExecuteSos;
  }, [handleExecuteSos]);

  // Countdown timer; auto-escalates when countdown reaches 0 without "I AM SAFE"
  useEffect(() => {
    if (isEscalated) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          void executeSosRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isEscalated]);

  const handleConfirmSafe = () => {
    clearPendingCallTriggers();
    void stopAlarmSound();
    onConfirmSafe();
  };

  const handleCloseEscalated = () => {
    clearPendingCallTriggers();
    void stopAlarmSound();
    onSosTriggered();
  };

  const meta = getAlertMeta(
    alertType,
    destinationName,
    deviationMeters,
    stoppedDurationMinutes,
  );
  const targetPhone = primaryContact?.phone || '112';
  const targetLabel = primaryContact
    ? `${primaryContact.name} (${primaryContact.phone})`
    : 'Emergency Helpline (112)';

  return (
    <View style={styles.backdrop}>
      <View style={styles.alertCard}>
        {/* Alert Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.alertIcon}>{isEscalated ? '🚨' : meta.icon}</Text>
        </View>

        {/* Alert Title */}
        <Text style={styles.alertTitle}>
          {isEscalated ? 'SOS ESCALATED TO PRIMARY CONTACT' : meta.title}
        </Text>

        {/* Description */}
        <Text style={styles.alertDescription}>
          {isEscalated
            ? `No "I AM SAFE" response was received in time (${meta.reason}). NightAware triggered SOS SMS and call handoffs to ${targetLabel}.`
            : meta.description}
        </Text>

        {!isEscalated ? (
          <>
            {/* Countdown timer */}
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>AUTOMATIC SOS ESCALATION IN</Text>
              <Text style={styles.countdownValue}>{secondsRemaining}s</Text>
            </View>

            {/* Contact hint */}
            <Text style={styles.contactEscalationHint}>
              Escalation contact:{' '}
              <Text style={{ color: '#f8fafc', fontWeight: '700' }}>{targetLabel}</Text>
            </Text>
            {Boolean(alarmStatus) && (
              <Text style={styles.alarmStatusHint}>{alarmStatus}</Text>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsColumn}>
              <Pressable style={styles.safeBtn} onPress={handleConfirmSafe}>
                <Text style={styles.safeBtnIcon}>✅</Text>
                <Text style={styles.safeBtnText}>I AM SAFE (DISMISS)</Text>
              </Pressable>

              <Pressable style={styles.sosBtn} onPress={() => void handleExecuteSos()}>
                <Text style={styles.sosBtnIcon}>🚨</Text>
                <Text style={styles.sosBtnText}>SEND SOS & CALL CONTACT</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* Honest Escalation Status */}
            <View style={styles.statusBox}>
              {smsStatus && <Text style={styles.statusLine}>💬 {smsStatus}</Text>}
              {callStatus && <Text style={styles.statusLine}>📞 {callStatus}</Text>}
              <Text style={styles.statusNote}>
                Note: Mobile OS security requires tapping Send / Call in your Messages and Phone apps.
              </Text>
            </View>

            {/* Quick Retry / Close Actions */}
            <View style={styles.actionsColumn}>
              <Pressable
                style={styles.sosBtn}
                onPress={() => void launchCallWithStatus(targetPhone, targetLabel)}
              >
                <Text style={styles.sosBtnIcon}>📞</Text>
                <Text style={styles.sosBtnText}>
                  CALL {primaryContact ? primaryContact.name.toUpperCase() : '112'} NOW
                </Text>
              </Pressable>

              {primaryContact?.phone && (
                <View style={styles.secondaryRow}>
                  <Pressable
                    style={styles.secondaryActionBtn}
                    onPress={() => void shareViaSms(primaryContact.phone, lastSosMessage)}
                  >
                    <Text style={styles.secondaryActionText}>💬 Open SOS SMS</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryActionBtn}
                    onPress={() => void shareViaWhatsApp(primaryContact.phone, lastSosMessage)}
                  >
                    <Text style={styles.secondaryActionText}>📱 WhatsApp SOS</Text>
                  </Pressable>
                </View>
              )}

              <Pressable style={styles.safeBtn} onPress={handleCloseEscalated}>
                <Text style={styles.safeBtnIcon}>✅</Text>
                <Text style={styles.safeBtnText}>I AM SAFE / CLOSE</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

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
  if (!visible || !alertType) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onConfirmSafe}>
      <SafetyCheckInContent
        key={alertType}
        alertType={alertType}
        deviationMeters={deviationMeters}
        stoppedDurationMinutes={stoppedDurationMinutes}
        currentCoord={currentCoord}
        destinationName={destinationName}
        primaryContact={primaryContact}
        onConfirmSafe={onConfirmSafe}
        onSosTriggered={onSosTriggered}
      />
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
    marginBottom: 8,
    textAlign: 'center',
  },
  alarmStatusHint: {
    fontSize: 11,
    color: '#fbbf24',
    marginBottom: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  statusBox: {
    backgroundColor: '#1a222f',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  statusLine: {
    fontSize: 12,
    color: '#f8fafc',
    fontWeight: '600',
  },
  statusNote: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
    lineHeight: 15,
  },
  actionsColumn: {
    width: '100%',
    gap: 10,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryActionText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 12,
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
