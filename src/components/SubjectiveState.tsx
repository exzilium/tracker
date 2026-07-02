import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
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
      <View style={styles.row}>
        <Text style={styles.label}>Mood</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={mood}
          onValueChange={onMoodChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
        <View style={styles.tickLabels}>
          {MOOD_LABELS.map((label, idx) => (
            <Text key={idx} style={[styles.tickText, mood === idx + 1 && styles.tickTextActive]}>
              {label}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Hunger</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={hunger}
          onValueChange={onHungerChange}
          minimumTrackTintColor={colors.warning}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.warning}
        />
        <View style={styles.tickLabels}>
          {HUNGER_LABELS.map((label, idx) => (
            <Text key={idx} style={[styles.tickText, hunger === idx + 1 && styles.tickTextActive]}>
              {label}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Anxiety</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={anxiety}
          onValueChange={onAnxietyChange}
          minimumTrackTintColor={colors.error}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.error}
        />
        <View style={styles.tickLabels}>
          {ANXIETY_LABELS.map((label, idx) => (
            <Text key={idx} style={[styles.tickText, anxiety === idx + 1 && styles.tickTextActive]}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 32,
    marginVertical: 16,
  },
  row: {
    marginBottom: 24,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  tickLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  tickText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    width: 60,
    textAlign: 'center',
  },
  tickTextActive: {
    color: colors.text,
    fontWeight: 'bold',
  }
});
