import React from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';

type UserAccountModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function UserAccountModal({ visible, onClose }: UserAccountModalProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of NightAware?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            onClose();
            await signOut();
            router.replace('/(auth)/sign-in');
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : '👤'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'NightAware Traveler'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'Offline Session'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {/* Status Badge */}
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLabel}>Session active · Local storage mode</Text>
          </View>

          {/* Info Card */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Privacy & Offline Security</Text>
            <Text style={styles.infoDescription}>
              Your account details and session are stored directly on this device. No personal
              locations or search queries are sent to external servers.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.signOutBtn,
                pressed && styles.signOutBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Text style={styles.signOutBtnText}>Log Out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#171A22',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262d36',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#222630',
    borderWidth: 1.5,
    borderColor: '#ff9400',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    color: '#ff9400',
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F7F7F5',
  },
  userEmail: {
    fontSize: 12,
    color: '#A7ADBB',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: '#A7ADBB',
    fontSize: 16,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 16,
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  statusLabel: {
    fontSize: 11,
    color: '#4ade80',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#0F121C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262d36',
    padding: 12,
    marginTop: 14,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D7B66A',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 11,
    color: '#85909b',
    lineHeight: 16,
  },
  actionsRow: {
    marginTop: 18,
  },
  signOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  signOutBtnPressed: {
    opacity: 0.8,
  },
  signOutBtnText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '700',
  },
});
