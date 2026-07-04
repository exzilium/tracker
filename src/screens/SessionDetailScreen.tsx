import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Consumption } from '../store';
import { colors, typography } from '../theme';
import EntryIcon from '../components/EntryIcon';
import BurndownChart from '../components/BurndownChart';
import EditConsumptionModal from '../components/EditConsumptionModal';
import { calculateStandardDrinks } from '../utils/mathEngine';
import { getCurrentLevels } from '../utils/currentLevels';
import { AppAlert } from '../utils/AppAlert';

export default function SessionDetailScreen({ route, navigation }: any) {
  const { consumptions, profile, removeConsumption } = useAppStore();
  const rawSession = route.params.session;
  
  const [editingLog, setEditingLog] = useState<Consumption | null>(null);

  // Dynamically recompute session data so edits take effect immediately
  const sessionConsumptions = useMemo(() => {
    return consumptions
      .filter(c => c.timestamp >= rawSession.startTime && c.timestamp <= (rawSession.endTime || Date.now()))
      .sort((a, b) => b.timestamp - a.timestamp); // newest first for the log list
  }, [consumptions, rawSession.startTime, rawSession.endTime]);

  // Wrap heavy O(N*M) calculation in useMemo to prevent running on every render
  const { totalDrinks, totalTHC, totalCalories, peakBAC } = useMemo(() => {
    let tDrinks = 0;
    let tTHC = 0;
    let tCals = 0;
    let mBAC = 0;

    const checkEnd = (rawSession.endTime || Date.now()) + (8 * 60 * 60 * 1000);
    for (let t = rawSession.startTime; t <= checkEnd; t += 5 * 60 * 1000) {
      const { currentBAC } = getCurrentLevels(sessionConsumptions, profile, t);
      if (currentBAC > mBAC) mBAC = currentBAC;
    }

    sessionConsumptions.forEach(c => {
      if (c.type === 'alcohol' && c.volumeOz && c.abvPercent) {
        tDrinks += calculateStandardDrinks(c.volumeOz, c.abvPercent);
      }
      if (c.type === 'thc' && c.mg) tTHC += c.mg;
      if (c.calories) tCals += c.calories;
    });

    return {
      totalDrinks: Number(tDrinks.toFixed(1)),
      totalTHC: tTHC,
      totalCalories: tCals,
      peakBAC: Number(mBAC.toFixed(3))
    };
  }, [sessionConsumptions, profile, rawSession.startTime, rawSession.endTime]);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const handleDelete = (id: string, name: string) => {
    AppAlert(
      "Remove Log",
      `Are you sure you want to delete ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => removeConsumption(id) }
      ]
    );
  };

  const renderHeader = () => (
    <>
      <Text style={styles.dateTitle}>{formatDate(rawSession.startTime)}</Text>
      
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Drinks</Text>
          <Text style={styles.cardValue}>{totalDrinks}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Peak BAC</Text>
          <Text style={styles.cardValue}>{peakBAC}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>THC</Text>
          <Text style={styles.cardValue}>{totalTHC}mg</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Calories</Text>
          <Text style={styles.cardValue}>{totalCalories}</Text>
        </View>
      </View>

      {/* Historical Burndown Chart */}
      <BurndownChart 
        consumptionsOverride={sessionConsumptions} 
        startTimeOverride={rawSession.startTime} 
      />

      <Text style={styles.logHeader}>Consumption Log</Text>
    </>
  );

  const renderItem = ({ item: c }: { item: Consumption }) => (
    <View style={styles.logItem}>
      <View style={{ marginRight: 12 }}>
        <EntryIcon iconString={c.emoji || 'Ionicons:beer-outline'} size={24} color={colors.textSecondary} />
      </View>
      <View style={styles.logDetails}>
        <Text style={styles.logName}>{c.name}</Text>
        <Text style={styles.logTime}>
          {new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </Text>
      </View>
      <View style={styles.logAmount}>
        {c.type === 'alcohol' ? (
          <Text style={styles.logVal}>{c.volumeOz}oz • {c.abvPercent}%</Text>
        ) : (
          <Text style={styles.logVal}>{c.mg}mg</Text>
        )}
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setEditingLog(c)}>
          <Text style={styles.actionBtnText}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(c.id, c.name)}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Session Details</Text>
      </View>

      <FlatList
        data={sessionConsumptions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.content}
        initialNumToRender={10}
      />

      <EditConsumptionModal 
        visible={!!editingLog} 
        consumption={editingLog} 
        onClose={() => setEditingLog(null)} 
      />
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
    marginBottom: 12,
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
    color: colors.text,
  },
  content: {
    paddingBottom: 40,
  },
  dateTitle: {
    ...typography.h2,
    color: colors.textSecondary,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
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
    ...typography.h2,
    color: colors.text,
  },
  logHeader: {
    ...typography.h2,
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 24,
  },
  logIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  logDetails: {
    flex: 1,
  },
  logName: {
    ...typography.body,
    color: colors.text,
    fontWeight: 'bold',
  },
  logTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  logAmount: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  logVal: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: colors.text,
    fontSize: 14,
  },
  deleteBtn: {
    backgroundColor: 'rgba(207, 102, 121, 0.2)',
  },
  deleteBtnText: {
    color: colors.error,
    fontWeight: 'bold',
    fontSize: 14,
  }
});
