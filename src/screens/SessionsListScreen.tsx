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
  const { consumptions, profile } = useAppStore();

  const sessions = useMemo(() => {
    if (consumptions.length === 0) return [];

    // Sort by oldest first for grouping
    const sorted = [...consumptions].sort((a, b) => a.timestamp - b.timestamp);
    const result: SessionData[] = [];
    
    let currentSession: Consumption[] = [sorted[0]];
    const GAP_MS = 8 * 60 * 60 * 1000; // 8 hours

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];

      if (curr.timestamp - prev.timestamp > GAP_MS) {
        // Gap detected, close current session and start new
        result.push({
          id: currentSession[0].id,
          startTime: currentSession[0].timestamp,
          endTime: currentSession[currentSession.length - 1].timestamp,
          consumptions: currentSession,
          totalDrinks: 0,
          totalTHC: 0,
          totalCalories: 0,
          peakBAC: 0,
        });
        currentSession = [curr];
      } else {
        currentSession.push(curr);
      }
    }
    
    // push last session
    if (currentSession.length > 0) {
      result.push({
        id: currentSession[0].id,
        startTime: currentSession[0].timestamp,
        endTime: currentSession[currentSession.length - 1].timestamp,
        consumptions: currentSession,
        totalDrinks: 0,
        totalTHC: 0,
        totalCalories: 0,
        peakBAC: 0,
      });
    }

    // Process stats for each session
    result.forEach(session => {
      let maxBAC = 0;
      
      // We calculate peak BAC by checking levels between startTime and endTime + 8 hours
      const checkEnd = session.endTime + (8 * 60 * 60 * 1000); // peak can happen after last drink
      for (let t = session.startTime; t <= checkEnd; t += 5 * 60 * 1000) {
        const { currentBAC } = getCurrentLevels(session.consumptions, profile, t);
        if (currentBAC > maxBAC) maxBAC = currentBAC;
      }
      
      session.peakBAC = Number(maxBAC.toFixed(3));

      session.consumptions.forEach(c => {
        if (c.type === 'alcohol' && c.volumeOz && c.abvPercent) {
          session.totalDrinks += calculateStandardDrinks(c.volumeOz, c.abvPercent);
        }
        if (c.type === 'thc' && c.mg) session.totalTHC += c.mg;
        if (c.calories) session.totalCalories += c.calories;
      });
      
      // Fix precision issues
      session.totalDrinks = Number(session.totalDrinks.toFixed(1));
    });

    // Return newest sessions first
    return result.reverse();
  }, [consumptions]);

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
        {sessions.length === 0 ? (
          <Text style={styles.emptyText}>No sessions recorded yet.</Text>
        ) : (
          sessions.map(session => (
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
