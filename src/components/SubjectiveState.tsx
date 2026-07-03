import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '../theme';

const MOOD_LABELS = ['Horrible', 'Bad', 'Normal', 'Good', "I'm Rollin'"];
const HUNGER_LABELS = ['No mas!', 'Full', 'Not hungry', 'Hungry', 'Starving!'];
const ANXIETY_LABELS = ['Zen', 'Calm', 'Normal', 'High', 'Very High'];

interface Props {
  mood: number;
  hunger: number;
  anxiety: number;
  onMoodChange: (val: number) => void;
  onHungerChange: (val: number) => void;
  onAnxietyChange: (val: number) => void;
}

const SegmentedControlRow = ({ 
  label, 
  value, 
  onChange, 
  activeColor, 
  labels 
}: { 
  label: string, 
  value: number, 
  onChange: (v: number) => void, 
  activeColor: string,
  labels: string[]
}) => {
  
  const handlePress = (val: number) => {
    if (val !== value) {
      Haptics.selectionAsync();
      onChange(val);
    }
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={styles.segmentedContainer}>
        {[1, 2, 3, 4, 5].map((val) => {
          const isActive = value === val;
          return (
            <TouchableOpacity
              key={val}
              activeOpacity={0.7}
              style={[
                styles.segmentBtn,
                isActive && { backgroundColor: activeColor, borderColor: activeColor }
              ]}
              onPress={() => handlePress(val)}
            >
              <Text style={[styles.segmentBtnText, isActive && styles.segmentBtnTextActive]}>
                {val}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <View style={styles.tickLabels}>
        {labels.map((lbl, idx) => (
          <Text key={idx} style={[styles.tickText, value === idx + 1 && styles.tickTextActive]}>
            {lbl}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default function SubjectiveState({
  mood,
  hunger,
  anxiety,
  onMoodChange,
  onHungerChange,
  onAnxietyChange,
}: Props) {
  return (
    <View style={styles.container}>
      <SegmentedControlRow
        label="Mood"
        value={mood}
        onChange={onMoodChange}
        activeColor={colors.primary}
        labels={MOOD_LABELS}
      />
      
      <SegmentedControlRow
        label="Hunger"
        value={hunger}
        onChange={onHungerChange}
        activeColor={colors.warning}
        labels={HUNGER_LABELS}
      />
      
      <SegmentedControlRow
        label="Anxiety"
        value={anxiety}
        onChange={onAnxietyChange}
        activeColor={colors.error}
        labels={ANXIETY_LABELS}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginVertical: 16,
  },
  row: {
    marginBottom: 28,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  segmentedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  segmentBtn: {
    width: 48,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  segmentBtnText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: colors.background,
    fontWeight: 'bold',
  },
  tickLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  tickText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    width: 52,
    textAlign: 'center',
  },
  tickTextActive: {
    color: colors.text,
    fontWeight: 'bold',
  }
});
