import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NavigationSidebarProps {
  visible: boolean;
  onClose: () => void;
  isNavigating: boolean;
  isGuardianActive: boolean;
  contactsCount: number;
  onOpenContacts: () => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onSimulateDeviation?: (meters?: number) => void;
  onSimulateStoppage?: (mins?: number) => void;
  onSimulateBatteryLow?: () => void;
  onSimulateArrival?: () => void;
  onResetSimulation?: () => void;
}

export function NavigationSidebar({
  visible,
  onClose,
  isNavigating,
  isGuardianActive,
  contactsCount,
  onOpenContacts,
  showHeatmap,
  onToggleHeatmap,
  onSimulateDeviation,
  onSimulateStoppage,
  onSimulateBatteryLow,
  onSimulateArrival,
  onResetSimulation,
}: NavigationSidebarProps) {
  const insets = useSafeAreaInsets();
  const [isDemoModeEnabled, setIsDemoModeEnabled] = useState(false);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Backdrop press to close */}
        <Pressable style={styles.dismissArea} onPress={onClose} />

        {/* Sidebar Panel sliding from right */}
        <View style={[styles.panel, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandIcon}>🛡️</Text>
              </View>
              <View>
                <Text style={styles.brandTitle}>NightAware</Text>
                <Text style={styles.brandSubtitle}>Night Route Companion</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusDotRow}>
                <View style={[styles.statusDot, { backgroundColor: isNavigating ? '#4ade80' : '#ff8a00' }]} />
                <Text style={styles.statusTitle}>
                  {isNavigating
                    ? isGuardianActive
                      ? 'GUARDIAN NAVIGATION ACTIVE'
                      : 'LIVE NAVIGATION RUNNING'
                    : 'ROUTE PLANNER ACTIVE'}
                </Text>
              </View>
              <Text style={styles.statusSubtitle}>
                {isNavigating
                  ? 'Foreground GPS tracking & real-time corridor awareness'
                  : 'Comparing nighttime route options'}
              </Text>
            </View>

            {/* SECTION 1: SAFETY GUARDIAN */}
            <Text style={styles.sectionHeader}>SAFETY & GUARDIAN</Text>
            <Pressable
              style={styles.menuItemBtn}
              onPress={() => {
                onClose();
                onOpenContacts();
              }}
            >
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuIcon}>👥</Text>
                <View>
                  <Text style={styles.menuItemTitle}>Trusted Safety Contacts</Text>
                  <Text style={styles.menuItemSubtitle}>
                    {contactsCount > 0
                      ? `${contactsCount} contact${contactsCount > 1 ? 's' : ''} configured for alerts`
                      : 'Add loved ones for trip & arrival alerts'}
                  </Text>
                </View>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </Pressable>

            {/* SECTION 2: MAP PREFERENCES */}
            <Text style={[styles.sectionHeader, { marginTop: 20 }]}>MAP DISPLAY</Text>
            <View style={styles.toggleRow}>
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuIcon}>🗺️</Text>
                <View>
                  <Text style={styles.menuItemTitle}>Road Activity Heatmap</Text>
                  <Text style={styles.menuItemSubtitle}>
                    Color-coded road safety overlay (Green/Yellow/Red)
                  </Text>
                </View>
              </View>
              <Switch
                value={showHeatmap}
                onValueChange={onToggleHeatmap}
                trackColor={{ false: '#1e2634', true: '#ff8a00' }}
                thumbColor={showHeatmap ? '#ffffff' : '#94a3b8'}
              />
            </View>

            {/* SECTION 3: PRESENTATION & DEMO SIMULATOR */}
            <Text style={[styles.sectionHeader, { marginTop: 20 }]}>
              PRESENTATION & TEAM DEMO
            </Text>
            <View style={styles.demoCard}>
              <View style={styles.toggleRowNoPad}>
                <View style={styles.menuItemLeft}>
                  <Text style={styles.menuIcon}>🧪</Text>
                  <View>
                    <Text style={styles.menuItemTitle}>Demo Simulator Mode</Text>
                    <Text style={styles.menuItemSubtitle}>
                      Showcase alarms & countdowns without walking outside
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isDemoModeEnabled}
                  onValueChange={setIsDemoModeEnabled}
                  trackColor={{ false: '#1e2634', true: '#f59e0b' }}
                  thumbColor={isDemoModeEnabled ? '#ffffff' : '#94a3b8'}
                />
              </View>

              {/* SIMULATION TEST BUTTONS (Visible when toggle is ON) */}
              {isDemoModeEnabled && (
                <View style={styles.simButtonsContainer}>
                  <Text style={styles.simInstructions}>
                    Tap any button below to trigger the alarm and display the 90-second safety check-in prompt:
                  </Text>

                  <Pressable
                    style={styles.simActionBtn}
                    onPress={() => {
                      onClose();
                      onSimulateDeviation?.(240);
                    }}
                  >
                    <Text style={styles.simActionIcon}>⚠️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.simActionTitle}>Test 200m Deviation Alarm</Text>
                      <Text style={styles.simActionSub}>Simulates moving +240m off-corridor</Text>
                    </View>
                    <Text style={styles.simActionChevron}>➔</Text>
                  </Pressable>

                  <Pressable
                    style={styles.simActionBtn}
                    onPress={() => {
                      onClose();
                      onSimulateStoppage?.(5);
                    }}
                  >
                    <Text style={styles.simActionIcon}>⏱️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.simActionTitle}>Test Quiet Stoppage Alarm</Text>
                      <Text style={styles.simActionSub}>Simulates 5m motionless in quiet zone</Text>
                    </View>
                    <Text style={styles.simActionChevron}>➔</Text>
                  </Pressable>

                  <Pressable
                    style={styles.simActionBtn}
                    onPress={() => {
                      onClose();
                      onSimulateBatteryLow?.();
                    }}
                  >
                    <Text style={styles.simActionIcon}>🔋</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.simActionTitle}>Test Low Battery Alert</Text>
                      <Text style={styles.simActionSub}>Simulates battery dropping below 15%</Text>
                    </View>
                    <Text style={styles.simActionChevron}>➔</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.simActionBtn, styles.simActionBtnGreen]}
                    onPress={() => {
                      onClose();
                      onSimulateArrival?.();
                    }}
                  >
                    <Text style={styles.simActionIcon}>🏡</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.simActionTitle, { color: '#4ade80' }]}>
                        Test Safe Arrival Geofence
                      </Text>
                      <Text style={styles.simActionSub}>Simulates arriving within 50m of home</Text>
                    </View>
                    <Text style={styles.simActionChevron}>➔</Text>
                  </Pressable>

                  {onResetSimulation && (
                    <Pressable
                      style={styles.resetBtn}
                      onPress={() => {
                        onClose();
                        onResetSimulation();
                      }}
                    >
                      <Text style={styles.resetBtnText}>🔄 Reset All to Real Live GPS</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            {/* SECTION 4: PRIVACY ARCHITECTURE */}
            <View style={styles.privacyBox}>
              <Text style={styles.privacyHeading}>🔒 Zero Tracking Servers</Text>
              <Text style={styles.privacyText}>
                NightAware does not store or upload personal coordinates, travel histories, or contacts to Supabase or any remote surveillance database. All watchdog decisions run on-device.
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>NightAware v1.2 · Women's Night Route Companion</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 7, 12, 0.75)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  panel: {
    width: '84%',
    maxWidth: 360,
    backgroundColor: '#0c1118',
    height: '100%',
    borderLeftWidth: 1,
    borderLeftColor: '#1e2634',
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2330',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 138, 0, 0.15)',
    borderWidth: 1.5,
    borderColor: '#ff8a00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIcon: {
    fontSize: 18,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.2,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#18202c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
    marginTop: 14,
  },
  statusCard: {
    backgroundColor: '#121822',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e2838',
    marginBottom: 16,
  },
  statusDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  statusSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  menuItemBtn: {
    backgroundColor: '#121822',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1c2534',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  menuItemSubtitle: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 1,
  },
  menuChevron: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '700',
  },
  toggleRow: {
    backgroundColor: '#121822',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#1c2534',
  },
  demoCard: {
    backgroundColor: '#121822',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#263346',
  },
  toggleRowNoPad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simButtonsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e2838',
    gap: 8,
  },
  simInstructions: {
    fontSize: 10.5,
    color: '#f59e0b',
    lineHeight: 15,
    marginBottom: 4,
  },
  simActionBtn: {
    backgroundColor: '#18202d',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#263346',
  },
  simActionBtnGreen: {
    borderColor: '#166534',
    backgroundColor: 'rgba(74, 222, 128, 0.08)',
  },
  simActionIcon: {
    fontSize: 15,
  },
  simActionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#f8fafc',
  },
  simActionSub: {
    fontSize: 9.5,
    color: '#94a3b8',
    marginTop: 1,
  },
  simActionChevron: {
    fontSize: 13,
    color: '#94a3b8',
  },
  resetBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1a222f',
    marginTop: 4,
  },
  resetBtnText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  privacyBox: {
    backgroundColor: '#0f141d',
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#1c2432',
  },
  privacyHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5e1',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9.5,
    color: '#475569',
  },
});
