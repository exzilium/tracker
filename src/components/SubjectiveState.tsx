import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useAppStore } from '../store';
import { colors, typography } from '../theme';

const MOOD_LABELS = ['Horrible', 'Bad', 'Normal', 'Good', "I'm Rollin'"];
const HUNGER_LABELS = ['No mas!', 'Full', 'Not hungry', 'Hungry', 'Starving!'];

export default function SubjectiveState() {
  const { currentMood, currentHunger, setCurrentState } = useAppStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How are you feeling?</Text>
      
      <View style={styles.row}>
        <Text style={styles.label}>Mood</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={currentMood}
          onValueChange={(val) => setCurrentState(val, currentHunger)}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.primary}
        />
        <View style={styles.tickLabels}>
          {MOOD_LABELS.map((label, idx) => (
            <Text key={idx} style={[styles.tickText, currentMood === idx + 1 && styles.tickTextActive]}>
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
          value={currentHunger}
          onValueChange={(val) => setCurrentState(currentMood, val)}
          minimumTrackTintColor={colors.warning}
          maximumTrackTintColor={colors.surface}
          thumbTintColor={colors.warning}
        />
        <View style={styles.tickLabels}>
          {HUNGER_LABELS.map((label, idx) => (
            <Text key={idx} style={[styles.tickText, currentHunger === idx + 1 && styles.tickTextActive]}>
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
    paddingHorizontal: 32, // Increased padding to prevent edge swiping
    marginVertical: 16,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 16,
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
