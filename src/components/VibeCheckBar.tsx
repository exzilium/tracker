import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '../theme';
import SubjectiveState from './SubjectiveState';

interface Props {
  mood: number;
  hunger: number;
  anxiety: number;
  hasCheckedIn: boolean;
  onMoodChange: (val: number) => void;
  onHungerChange: (val: number) => void;
  onAnxietyChange: (val: number) => void;
  onLogAllNormal: () => void;
}

/**
 * Compact 1-row Vibe Check bar collapsed by default so social quick-start sessions
 * keep the PacingBar and BurndownChart above the fold while still preserving one-tap
 * access to Mood, Hunger, and Anxiety check-ins.
 */
export default function VibeCheckBar({
  mood,
  hunger,
  anxiety,
  hasCheckedIn,
  onMoodChange,
  onHungerChange,
  onAnxietyChange,
  onLogAllNormal,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasElevatedModifier =
    hasCheckedIn && (mood <= 2 || mood === 5 || hunger >= 4 || anxiety >= 4);

  const toggleExpanded = () => {
    Promise.resolve(Haptics.selectionAsync()).catch(() => {});
    setExpanded((prev) => !prev);
  };

  const handleLogAllNormal = () => {
    Promise.resolve(Haptics.selectionAsync()).catch(() => {});
    onLogAllNormal();
    setExpanded(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.headerRow}
        onPress={toggleExpanded}
      >
        <View style={styles.leftGroup}>
          <Feather name="sliders" size={16} color={hasCheckedIn ? colors.primary : colors.textSecondary} style={{ marginRight: 8 }} />
          <Text style={styles.title}>Vibe Check</Text>
        </View>

        <View style={styles.rightGroup}>
          {!hasCheckedIn ? (
            <Text style={styles.unloggedText}>Not logged · Tap to check in</Text>
          ) : (
            <Text
              style={[
                styles.summaryText,
                hasElevatedModifier && { color: colors.warning },
              ]}
              numberOfLines={1}
            >
              Mood {mood} · Hunger {hunger} · Anxiety {anxiety}
            </Text>
          )}
          <Feather
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
            style={{ marginLeft: 8 }}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          <SubjectiveState
            mood={mood}
            hunger={hunger}
            anxiety={anxiety}
            isUnset={!hasCheckedIn}
            onMoodChange={onMoodChange}
            onHungerChange={onHungerChange}
            onAnxietyChange={onAnxietyChange}
          />
          {!hasCheckedIn && (
            <TouchableOpacity style={styles.normalBtn} onPress={handleLogAllNormal}>
              <Text style={styles.normalBtnText}>Log All Normal (3 / 3 / 3)</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.body,
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginLeft: 12,
  },
  unloggedText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  summaryText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 8,
    paddingBottom: 12,
  },
  normalBtn: {
    marginHorizontal: 24,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(187, 134, 252, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.25)',
    alignItems: 'center',
  },
  normalBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
