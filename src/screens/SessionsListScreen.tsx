import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Consumption } from '../store';
import { colors, typography } from '../theme';
import { calculateStandardDrinks } from '../utils/mathEngine';
import { getCurrentLevels } from '../utils/currentLevels';
import EntryIcon from '../components/EntryIcon';

export interface SessionData {
  id: string;
  startTime: number;
  endTime: number;
  consumptions: Consumption[];
  totalDrinks: number;
  totalTHC: number;
  totalCalories: number;
  peakBAC: number;
  peakTHC: number;
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
      let maxTHC = 0;

      // Calculate peak BAC and peak THC by checking levels between startTime and endTime (or +8h if active)
      const checkEnd = s.endTime ? s.endTime : Date.now() + (8 * 60 * 60 * 1000);
      for (let t = s.startTime; t <= checkEnd; t += 5 * 60 * 1000) {
        const { currentBAC, currentTHC } = getCurrentLevels(sessionConsumptions, profile, t);
        if (currentBAC > maxBAC) maxBAC = currentBAC;
        if (currentTHC > maxTHC) maxTHC = currentTHC;
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
        peakTHC: Number(maxTHC.toFixed(1)),
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Sessions</Text>
        <View style={{ width: 60 }} />
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
              <View style={{ gap: 8 }}>
                <View style={styles.statsRow}>
                  <View style={[styles.statItem, { flex: 1 }]}>
                    <EntryIcon iconString="Ionicons:beer-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.stat}> {session.totalDrinks} Drinks</Text>
                  </View>
                  <View style={[styles.statItem, { flex: 1 }]}>
                    <EntryIcon iconString="MaterialCommunityIcons:percent" size={14} color={colors.textSecondary} />
                    <Text style={styles.stat}> {session.peakBAC} Peak BAC</Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={[styles.statItem, { flex: 1 }]}>
                    <EntryIcon iconString="Ionicons:leaf-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.stat}> {session.totalTHC}mg THC</Text>
                  </View>
                  <View style={[styles.statItem, { flex: 1 }]}>
                    <EntryIcon iconString="Ionicons:balloon-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.stat}> {session.peakTHC}mg Peak THC</Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <View style={[styles.statItem, { flex: 1 }]}>
                    <EntryIcon iconString="Ionicons:scale-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.stat}> {session.totalCalories} cals</Text>
                  </View>
                </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    marginBottom: 24,
  },
  backBtn: {
    width: 60,
  },
  backBtnText: {
    color: colors.primary,
    ...typography.body,
    fontWeight: 'bold',
  },
  title: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text,
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
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  }
});
