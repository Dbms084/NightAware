/**
 * SafetyReportModal — Allows users to report unlit stretches, harassment,
 * or safety hazards directly to Supabase PostGIS backend.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Coordinate } from '@/types/geo';
import { submitSafetyReport } from '@/features/reports/services/report-service';

export type SafetyReportModalProps = {
  visible: boolean;
  coordinate: Coordinate;
  onClose: () => void;
};

const REPORT_TYPES = [
  { id: 'poor_lighting', label: 'Dark stretch / Poor lighting', icon: '💡' },
  { id: 'isolated_stretch', label: 'Isolated alley / Shortcut', icon: '⚠️' },
  { id: 'harassment', label: 'Harassment / Suspicious presence', icon: '🚨' },
  { id: 'closed_early', label: 'Assistance point closed early', icon: '🔒' },
  { id: 'other', label: 'Other concern', icon: '📝' },
] as const;

export function SafetyReportModal({
  visible,
  coordinate,
  onClose,
}: SafetyReportModalProps) {
  const [selectedType, setSelectedType] = useState<string>('poor_lighting');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const res = await submitSafetyReport({
      reportType: selectedType as any,
      description: description.trim() || 'Reported from current journey',
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      severity,
    });
    setIsSubmitting(false);

    if (res.success) {
      Alert.alert(
        'Report Submitted',
        'Thank you for contributing to safer routes for everyone in the community.',
        [{ text: 'OK', onPress: onClose }],
      );
      setDescription('');
    } else {
      Alert.alert('Error', res.error || 'Failed to submit report. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Report a Safety Concern</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            Your report updates real-time Night Activity Scores and warns other travelers.
          </Text>

          <Text style={styles.label}>Concern Type</Text>
          <View style={styles.typesList}>
            {REPORT_TYPES.map((t) => (
              <Pressable
                key={t.id}
                style={[
                  styles.typeItem,
                  selectedType === t.id && styles.typeItemActive,
                ]}
                onPress={() => setSelectedType(t.id)}
              >
                <Text style={styles.typeIcon}>{t.icon}</Text>
                <Text
                  style={[
                    styles.typeText,
                    selectedType === t.id && styles.typeTextActive,
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Severity Level</Text>
          <View style={styles.severityRow}>
            {(['low', 'medium', 'high'] as const).map((lvl) => (
              <Pressable
                key={lvl}
                style={[
                  styles.severityBtn,
                  severity === lvl && styles.severityBtnActive,
                ]}
                onPress={() => setSeverity(lvl)}
              >
                <Text
                  style={[
                    styles.severityText,
                    severity === lvl && styles.severityTextActive,
                  ]}
                >
                  {lvl.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Add details, e.g. broken streetlight near corner..."
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#080a0c" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Safety Report</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#0c1014',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2b3139',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f5f6f7',
  },
  closeBtn: {
    fontSize: 18,
    color: '#8b949e',
    padding: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#8b949e',
    marginTop: 4,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b0b7c0',
    marginBottom: 8,
  },
  typesList: {
    gap: 6,
    marginBottom: 14,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#11151a',
    borderWidth: 1,
    borderColor: '#1e242d',
  },
  typeItemActive: {
    borderColor: '#ff8a00',
    backgroundColor: '#1f1912',
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  typeText: {
    fontSize: 12,
    color: '#b0b7c0',
  },
  typeTextActive: {
    color: '#ff8a00',
    fontWeight: '700',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  severityBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#11151a',
    borderWidth: 1,
    borderColor: '#1e242d',
  },
  severityBtnActive: {
    borderColor: '#f87171',
    backgroundColor: '#261414',
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8b949e',
  },
  severityTextActive: {
    color: '#f87171',
  },
  input: {
    backgroundColor: '#11151a',
    borderRadius: 8,
    padding: 10,
    color: '#f5f6f7',
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#1e242d',
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#ff8a00',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#080a0c',
  },
});

