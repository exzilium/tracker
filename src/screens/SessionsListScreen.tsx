import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Consumption } from '../store';
import { colors, typography } from '../theme';
import { calculateStandardDrinks } from '../utils/mathEngine';
import { getCurrentLevels } from '../utils/currentLevels';

export interface SessionData {
  id: string;
  startTime: number;
  endTime: number;
  consumptions: Consumption[];
  totalDrinks: number;
  totalTHC: number;
  totalCalories: number;
  peakBAC: number;
}

export default function SessionsListScreen({ navigation }: any) {
  const { sessions, consumptions, profile } = useAppStore();

  const formattedSessions = useMemo(() => {
    if (sessions.length === 0) return [];

    const result: SessionData[] = sessions.map(s => {
      const sessionConsumptions = consumptions.filter(c => c.sessionId === s.id);
      
      let totalDrinks = 0;
      let totalTHC = 0;
      let totalCalories = 0;
      let maxBAC = 0;

      // Calculate peak BAC by checking levels between startTime and endTime (or +8h if active)
      const checkEnd = s.endTime ? s.endTime : Date.now() + (8 * 60 * 60 * 1000);
      for (let t = s.startTime; t <= checkEnd; t += 5 * 60 * 1000) {
        const { currentBAC } = getCurrentLevels(sessionConsumptions, profile, t);
        if (currentBAC > maxBAC) maxBAC = currentBAC;
      }

      sessionConsumptions.forEach(c => {
        if (c.type === 'alcohol' && c.volumeOz && c.abvPercent) {
          totalDrinks += calculateStandardDrinks(c.volumeOz, c.abvPercent);
        }
        if (c.type === 'thc' && c.mg) totalTHC += c.mg;
        if (c.calories) totalCalories += c.calories;
      });

      return {
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime || Date.now(),
        consumptions: sessionConsumptions,
        totalDrinks: Number(totalDrinks.toFixed(1)),
        totalTHC,
        totalCalories,
        peakBAC: Number(maxBAC.toFixed(3)),
      };
    });

    // Return newest sessions first
    return result.reverse();
  }, [sessions, consumptions, profile]);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Your Sessions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {formattedSessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions recorded yet.</Text>
        ) : (
          formattedSessions.map(session => (
            <TouchableOpacity 
              key={session.id} 
              style={styles.card}
              onPress={() => navigation.navigate('SessionDetail', { session })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.dateText}>{formatDate(session.startTime)}</Text>
                <Text style={styles.countText}>{session.consumptions.length} items</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.stat}>🍺 {session.totalDrinks} Drinks</Text>
                {session.peakBAC > 0 && <Text style={styles.stat}>📈 {session.peakBAC} Peak BAC</Text>}
                {session.totalTHC > 0 && <Text style={styles.stat}>🍃 {session.totalTHC}mg THC</Text>}
                {session.totalCalories > 0 && <Text style={styles.stat}>🔥 {session.totalCalories} cals</Text>}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 24,
  },
  backBtn: {
    marginRight: 16,
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  backBtnText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  header: {
    ...typography.h1,
    color: colors.primary,
  },
  content: {
    paddingHorizontal: 24,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateText: {
    ...typography.h2,
    color: colors.text,
  },
  countText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    ...typography.body,
    color: colors.textSecondary,
  }
});
