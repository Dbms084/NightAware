import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TrustedContact } from '@/features/guardian/types';
import { useGuardianContacts } from '@/features/guardian/hooks/useGuardianContacts';

interface ManageContactsModalProps {
  visible: boolean;
  onClose: () => void;
}

const RELATIONSHIP_OPTIONS = ['Mom', 'Dad', 'Partner', 'Sister', 'Brother', 'Friend', 'Colleague', 'Other'];

export function ManageContactsModal({ visible, onClose }: ManageContactsModalProps) {
  const insets = useSafeAreaInsets();
  const { contacts, isLoading, addContact, removeContact, makePrimary } = useGuardianContacts();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [isPrimarySos, setIsPrimarySos] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleResetForm = () => {
    setName('');
    setPhone('');
    setRelationship('Parent');
    setIsPrimarySos(false);
    setErrorMessage('');
    setIsAdding(false);
  };

  const handleSaveContact = async () => {
    if (!name.trim()) {
      setErrorMessage('Please enter the contact name.');
      return;
    }
    const cleanDigits = phone.replace(/[^\d]/g, '');
    if (cleanDigits.length < 8) {
      setErrorMessage('Please enter a valid phone number (at least 8-10 digits).');
      return;
    }

    try {
      await addContact({
        name: name.trim(),
        phone: phone.trim(),
        relationship,
        notifyOnStart: true,
        notifyOnArrival: true,
        isPrimarySos: contacts.length === 0 ? true : isPrimarySos,
      });
      handleResetForm();
    } catch {
      setErrorMessage('Failed to save contact. Please try again.');
    }
  };

  const handleDeletePrompt = (contact: TrustedContact) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contact.name} from your trusted safety contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void removeContact(contact.id),
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerIcon}>🛡️</Text>
              <View>
                <Text style={styles.headerTitle}>Trusted Safety Contacts</Text>
                <Text style={styles.headerSubtitle}>
                  Loved ones alerted when you start or arrive home at night
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Contacts List */}
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#ff8a00" />
                <Text style={styles.loadingText}>Loading contacts...</Text>
              </View>
            ) : contacts.length === 0 && !isAdding ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyTitle}>No Trusted Contacts Yet</Text>
                <Text style={styles.emptyDescription}>
                  Add up to 3 trusted people (family, partner, roommate) who will receive your night journey updates, route score, and safe arrival ping.
                </Text>
                <Pressable style={styles.addFirstBtn} onPress={() => setIsAdding(true)}>
                  <Text style={styles.addFirstBtnText}>＋ Add First Contact</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.contactsContainer}>
                {contacts.map((contact) => (
                  <View key={contact.id} style={styles.contactCard}>
                    <View style={styles.contactAvatar}>
                      <Text style={styles.avatarLetter}>
                        {contact.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <View style={styles.contactNameRow}>
                        <Text style={styles.contactName}>{contact.name}</Text>
                        <Text style={styles.contactRelPill}>{contact.relationship}</Text>
                        {contact.isPrimarySos && (
                          <View style={styles.primaryPill}>
                            <Text style={styles.primaryPillText}>⭐ Primary SOS</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.contactPhone}>{contact.phone}</Text>
                      <View style={styles.badgesRow}>
                        <Text style={styles.featureBadge}>✓ Trip alerts</Text>
                        <Text style={styles.featureBadge}>✓ Arrival ping</Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.contactActions}>
                      {!contact.isPrimarySos && (
                        <Pressable
                          style={styles.makePrimaryBtn}
                          onPress={() => void makePrimary(contact.id)}
                        >
                          <Text style={styles.makePrimaryText}>Make SOS</Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={styles.deleteBtn}
                        onPress={() => handleDeletePrompt(contact)}
                        hitSlop={8}
                      >
                        <Text style={styles.deleteBtnText}>🗑️</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}

                {contacts.length < 5 && !isAdding && (
                  <Pressable style={styles.addAnotherBtn} onPress={() => setIsAdding(true)}>
                    <Text style={styles.addAnotherBtnText}>＋ Add Another Contact ({contacts.length}/5)</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Add Contact Form */}
            {isAdding && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Add Trusted Contact</Text>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mom, Maya Sharma"
                  placeholderTextColor="#64748b"
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setErrorMessage('');
                  }}
                  autoFocus
                />

                <Text style={styles.inputLabel}>PHONE NUMBER (WITH COUNTRY CODE)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +91 98765 43210"
                  placeholderTextColor="#64748b"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    setErrorMessage('');
                  }}
                />

                <Text style={styles.inputLabel}>RELATIONSHIP</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relScroll}>
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt}
                      style={[styles.relChip, relationship === opt && styles.relChipActive]}
                      onPress={() => setRelationship(opt)}
                    >
                      <Text
                        style={[
                          styles.relChipText,
                          relationship === opt && styles.relChipTextActive,
                        ]}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => setIsPrimarySos(!isPrimarySos)}
                >
                  <View style={[styles.checkbox, isPrimarySos && styles.checkboxActive]}>
                    {isPrimarySos && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Designate as Primary SOS Helpline Contact
                  </Text>
                </Pressable>

                <View style={styles.formButtonRow}>
                  <Pressable style={styles.cancelBtn} onPress={handleResetForm}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.saveBtn} onPress={handleSaveContact}>
                    <Text style={styles.saveBtnText}>Save Contact</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Privacy Guarantee Note */}
            <View style={styles.privacyNoteBox}>
              <Text style={styles.privacyNoteText}>
                🔒 <Text style={{ fontWeight: '700', color: '#e2e8f0' }}>Privacy Guarantee:</Text> Contacts are stored strictly on your local device. NightAware does not share or upload your contacts or coordinates to any external server.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 14, 0.82)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0f141c',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#222934',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2430',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1c2430',
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
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#161c26',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#232b38',
    marginVertical: 10,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 12.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  addFirstBtn: {
    backgroundColor: '#ff8a00',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFirstBtnText: {
    color: '#0a0d12',
    fontWeight: '800',
    fontSize: 13.5,
  },
  contactsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: '#151b24',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242d3a',
    gap: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 138, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#ff8a00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ff8a00',
  },
  contactInfo: {
    flex: 1,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  contactName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#f8fafc',
  },
  contactRelPill: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94a3b8',
    backgroundColor: '#1e2634',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#f59e0b',
  },
  contactPhone: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  featureBadge: {
    fontSize: 10,
    color: '#4ade80',
    fontWeight: '600',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  makePrimaryBtn: {
    backgroundColor: '#202836',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333f52',
  },
  makePrimaryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  deleteBtn: {
    padding: 6,
  },
  deleteBtnText: {
    fontSize: 16,
  },
  addAnotherBtn: {
    borderWidth: 1,
    borderColor: '#ff8a00',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 138, 0, 0.04)',
  },
  addAnotherBtnText: {
    color: '#ff8a00',
    fontWeight: '700',
    fontSize: 13,
  },
  formCard: {
    backgroundColor: '#151b24',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ff8a00',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0c1016',
    borderWidth: 1,
    borderColor: '#263040',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13.5,
  },
  relScroll: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  relChip: {
    backgroundColor: '#1a222e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#293444',
  },
  relChipActive: {
    backgroundColor: '#ff8a00',
    borderColor: '#ff8a00',
  },
  relChipText: {
    color: '#94a3b8',
    fontSize: 11.5,
    fontWeight: '600',
  },
  relChipTextActive: {
    color: '#080a0c',
    fontWeight: '800',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
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
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  checkmark: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#cbd5e1',
    flex: 1,
  },
  formButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#202836',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#ff8a00',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#090d14',
    fontWeight: '800',
    fontSize: 13,
  },
  privacyNoteBox: {
    backgroundColor: '#10151f',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1d2532',
  },
  privacyNoteText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
});
