import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, typography } from '../theme';
import { OverlappingSessionMatch } from '../utils/sessionMerge';

interface ContinueSessionModalProps {
  visible: boolean;
  match: OverlappingSessionMatch | null;
  itemName?: string;
  onContinue: () => void;
  onStartNew: () => void;
  onCancel: () => void;
}

const formatSessionStart = (ts: number) =>
  new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const buildReasonMessage = (match: OverlappingSessionMatch): string => {
  const when = formatSessionStart(match.session.startTime);
  const countLabel = `${match.itemCount} ${match.itemCount === 1 ? 'item' : 'items'}`;

  if (match.reason === 'metabolic') {
    return `Your session from ${when} (${countLabel}) still has active BAC/THC levels overlapping this time.`;
  }
  if (match.reason === 'interval') {
    return `This time overlaps directly with your session from ${when} (${countLabel}).`;
  }
  return `You recently closed a session from ${when} (${countLabel}) within the last hour.`;
};

/**
 * Prompts the user to continue an overlapping or recently closed session
 * rather than splitting a continuous evening across fragmented projection charts.
 */
export default function ContinueSessionModal({
  visible,
  match,
  itemName,
  onContinue,
  onStartNew,
  onCancel,
}: ContinueSessionModalProps) {
  if (!match) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Continue Session?</Text>
          <Text style={styles.message}>{buildReasonMessage(match)}</Text>
          {!!itemName && (
            <Text style={styles.subHint}>
              Adding <Text style={styles.itemHighlight}>{itemName}</Text> to it keeps one continuous projection graph.
            </Text>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={onContinue}>
            <Text style={styles.primaryBtnText}>Continue Session</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onStartNew}>
            <Text style={styles.secondaryBtnText}>Start New Session</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 8,
  },
  subHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  itemHighlight: {
    color: colors.text,
    fontWeight: 'bold',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    ...typography.body,
    color: colors.background,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryBtnText: {
    ...typography.body,
    fontSize: 15,
    color: colors.text,
    fontWeight: 'bold',
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
});
