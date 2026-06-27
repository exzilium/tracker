import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import { colors, typography } from '../theme';

export default function AnalyticsScreen({ navigation }: any) {
  const { consumptions } = useAppStore();

  const snapshot = useMemo(() => {
    // Filter consumptions to just the last 24 hours for the "Morning After" view
    const now = Date.now();
    const last24h = consumptions.filter(c => (now - c.timestamp) < 24 * 60 * 60 * 1000);

    let totalDrinks = 0;
    let totalTHC = 0;
    let sumMood = 0;
    let sumHunger = 0;
    let moodCount = 0;
    let hungerCount = 0;
    
    last24h.forEach(c => {
      if (c.type === 'alcohol') totalDrinks += 1;
      if (c.type === 'thc' && c.mg) totalTHC += c.mg;
      if (c.mood !== undefined) { sumMood += c.mood; moodCount++; }
      if (c.hunger !== undefined) { sumHunger += c.hunger; hungerCount++; }
    });

    const roughPeakBAC = (totalDrinks * 0.02).toFixed(3); 
    const avgMood = moodCount > 0 ? (sumMood / moodCount).toFixed(1) : 'N/A';
    const avgHunger = hungerCount > 0 ? (sumHunger / hungerCount).toFixed(1) : 'N/A';

    return { totalDrinks, totalTHC, roughPeakBAC, avgMood, avgHunger, logCount: last24h.length };
  }, [consumptions]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Morning After</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>
            Here is a snapshot of your consumption over the last 24 hours. Use this data to reflect and make adjustments for your next session!
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Drinks Logged</Text>
            <Text style={styles.cardValue}>{snapshot.totalDrinks}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>THC Logged</Text>
            <Text style={styles.cardValue}>{snapshot.totalTHC}mg</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Avg Mood (0-10)</Text>
            <Text style={styles.cardValue}>{snapshot.avgMood}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Avg Hunger (0-10)</Text>
            <Text style={styles.cardValue}>{snapshot.avgHunger}</Text>
          </View>
        </View>

        <View style={styles.fullCard}>
          <Text style={styles.cardLabel}>Estimated Peak BAC</Text>
          <Text style={[styles.cardValue, { color: Number(snapshot.roughPeakBAC) > 0.08 ? colors.error : colors.success }]}>
            {snapshot.roughPeakBAC}
          </Text>
          <Text style={styles.caption}>
            {Number(snapshot.roughPeakBAC) > 0.08 
              ? "You likely crossed the legal driving limit during this session."
              : "You stayed under the typical legal limit."}
          </Text>
        </View>
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
  summaryBox: {
    backgroundColor: 'rgba(3, 218, 198, 0.1)',
    borderColor: colors.secondary,
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  summaryText: {
    color: colors.secondary,
    ...typography.body,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  fullCard: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  cardLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  cardValue: {
    ...typography.h1,
    color: colors.text,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
});
