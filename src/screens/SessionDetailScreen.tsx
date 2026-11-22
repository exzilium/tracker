import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Consumption } from '../store';
import { colors, typography } from '../theme';
import EntryIcon from '../components/EntryIcon';
import BurndownChart from '../components/BurndownChart';
import EditConsumptionModal from '../components/EditConsumptionModal';
import { calculateStandardDrinks } from '../utils/mathEngine';
import { getCurrentLevels } from '../utils/currentLevels';
import {
  formatConsumableSubtitle,
  getConsumableColor,
  withAlpha,
} from '../utils/consumableMeta';
import { findOverlapClusters } from '../utils/sessionMerge';
import { AppAlert } from '../utils/AppAlert';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type SessionDetailProps = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>;

export default function SessionDetailScreen({ route, navigation }: SessionDetailProps) {
  const sessions = useAppStore((state) => state.sessions);
  const consumptions = useAppStore((state) => state.consumptions);
  const profile = useAppStore((state) => state.profile);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const removeConsumption = useAppStore((state) => state.removeConsumption);
  const reopenSession = useAppStore((state) => state.reopenSession);
  const mergeSessions = useAppStore((state) => state.mergeSessions);
  const setQuickEntryVisible = useAppStore((state) => state.setQuickEntryVisible);

  const [currentSessionId, setCurrentSessionId] = useState(route.params.session.id);

  useEffect(() => {
    setCurrentSessionId(route.params.session.id);
  }, [route.params.session.id]);

  const liveSession = useMemo(
    () => sessions.find((s) => s.id === currentSessionId) ?? route.params.session,
    [sessions, currentSessionId, route.params.session]
  );

  const [editingLog, setEditingLog] = useState<Consumption | null>(null);

  // Dynamically recompute session data so edits, additions, or merges take effect immediately
  const sessionConsumptions = useMemo(() => {
    return consumptions
      .filter((c) => c.sessionId === liveSession.id)
      .sort((a, b) => b.timestamp - a.timestamp); // newest first for the log list
  }, [consumptions, liveSession.id]);

  const overlapCluster = useMemo(() => {
    const clusters = findOverlapClusters(sessions, consumptions, profile);
    return clusters.find((cluster) => cluster.some((s) => s.id === liveSession.id)) ?? null;
  }, [sessions, consumptions, profile, liveSession.id]);

  // Wrap heavy O(N*M) calculation in useMemo to prevent running on every render
  const { totalDrinks, totalTHC, totalCalories, peakBAC, peakTHC, chartStartTime, fixedTimeWindowHours } = useMemo(() => {
    let tDrinks = 0;
    let tTHC = 0;
    let tCals = 0;
    let mBAC = 0;
    let mTHC = 0;

    let cStartTime = liveSession.startTime;
    let latestLogTime = liveSession.startTime;
    if (sessionConsumptions.length > 0) {
      cStartTime = sessionConsumptions[sessionConsumptions.length - 1].timestamp - (30 * 60 * 1000);
      latestLogTime = sessionConsumptions[0].timestamp;
    }

    let lastActiveTime = cStartTime;

    const rawEnd = (liveSession.endTime || Date.now()) + (8 * 60 * 60 * 1000);
    const checkEnd = Math.min(rawEnd, latestLogTime + 16 * 60 * 60 * 1000);
    for (let t = cStartTime; t <= checkEnd; t += 5 * 60 * 1000) {
      const { currentBAC, currentTHC } = getCurrentLevels(sessionConsumptions, profile, t);
      if (currentBAC > mBAC) mBAC = currentBAC;
      if (currentTHC > mTHC) mTHC = currentTHC;
      if (currentBAC > 0 || currentTHC > 0) {
        lastActiveTime = t;
      }
    }

    const chartEndTime = lastActiveTime + (30 * 60 * 1000);
    let durationHours = Math.ceil((chartEndTime - cStartTime) / (60 * 60 * 1000));
    if (durationHours < 2) durationHours = 2; // minimum 2h window
    if (durationHours > 24) durationHours = 24;

    sessionConsumptions.forEach(c => {
      if (c.type === 'alcohol' && c.volumeOz && c.abvPercent) {
        tDrinks += calculateStandardDrinks(c.volumeOz, c.abvPercent);
      }
      if (c.type === 'thc' && c.mg) tTHC += c.mg;
      if (c.calories) tCals += c.calories;
    });

    return {
      totalDrinks: Number(tDrinks.toFixed(1)),
      totalTHC: Number(tTHC.toFixed(1)),
      totalCalories: tCals,
      peakBAC: Number(mBAC.toFixed(3)),
      peakTHC: Number(mTHC.toFixed(1)),
      chartStartTime: cStartTime,
      fixedTimeWindowHours: durationHours
    };
  }, [sessionConsumptions, profile, liveSession.startTime, liveSession.endTime]);

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

  const handleReopenSession = () => {
    if (!activeSessionId || activeSessionId === liveSession.id) {
      reopenSession(liveSession.id);
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
      return;
    }

    AppAlert(
      'Active Session in Progress',
      'You already have an active session on Home. Combine this session into your active session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Merge & Open',
          onPress: () => {
            const mergedId = mergeSessions([activeSessionId, liveSession.id]);
            if (mergedId) {
              setCurrentSessionId(mergedId);
            }
            navigation.navigate('MainTabs', { screen: 'Dashboard' });
          },
        },
      ]
    );
  };

  const handleMergeCluster = () => {
    if (!overlapCluster || overlapCluster.length < 2) return;
    AppAlert(
      'Combine Overlapping Sessions',
      `Merge ${overlapCluster.length} overlapping sessions into one unified session and projection graph?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Combine',
          onPress: () => {
            const mergedId = mergeSessions(overlapCluster.map((s) => s.id));
            if (mergedId) {
              setCurrentSessionId(mergedId);
            }
          },
        },
      ]
    );
  };

  const isClosed = liveSession.endTime !== null;

  const renderHeader = () => (
    <>
      <Text style={styles.dateTitle}>{formatDate(liveSession.startTime)}</Text>

      {isClosed && (
        <View style={styles.actionBarRow}>
          <TouchableOpacity style={styles.reopenBtn} onPress={handleReopenSession}>
            <Text style={styles.reopenBtnText}>Reopen Session</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => setQuickEntryVisible(true, 'default', liveSession.id)}
          >
            <Text style={styles.addItemBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>
      )}

      {overlapCluster && (
        <View style={styles.overlapBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overlapTitle}>
              Overlaps with {overlapCluster.length - 1} other{' '}
              {overlapCluster.length - 1 === 1 ? 'session' : 'sessions'}
            </Text>
            <Text style={styles.overlapSubtitle}>
              Merge to view the combined projection curve in one session.
            </Text>
          </View>
          <TouchableOpacity style={styles.overlapMergeBtn} onPress={handleMergeCluster}>
            <Text style={styles.overlapMergeBtnText}>Merge</Text>
          </TouchableOpacity>
        </View>
      )}
      
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
          <Text style={styles.cardLabel}>Peak THC</Text>
          <Text style={styles.cardValue}>{peakTHC}mg</Text>
        </View>

        <View style={[styles.card, { width: '100%' }]}>
          <Text style={styles.cardLabel}>Calories</Text>
          <Text style={styles.cardValue}>{totalCalories}</Text>
        </View>
      </View>

      {/* Historical Burndown Chart */}
      <BurndownChart 
        consumptionsOverride={sessionConsumptions} 
        startTimeOverride={chartStartTime} 
        fixedTimeWindowHours={fixedTimeWindowHours}
        hideTimeToggles={true}
      />

      <Text style={styles.logHeader}>Consumption Log</Text>
    </>
  );

  const renderItem = ({ item: c }: { item: Consumption }) => {
    const itemColor = getConsumableColor(c);
    const subtitle =
      formatConsumableSubtitle(c) ||
      (c.type === 'alcohol' ? `${c.volumeOz}oz • ${c.abvPercent}%` : `${c.mg}mg`);

    return (
      <View style={styles.logItem}>
        <View
          style={[
            styles.logIconCircle,
            { backgroundColor: withAlpha(itemColor, 0.12) },
          ]}
        >
          <EntryIcon iconString={c.emoji || 'Ionicons:beer-outline'} size={20} color={itemColor} />
        </View>
        <View style={styles.logDetails}>
          <Text style={styles.logName}>{c.name}</Text>
          <Text style={styles.logTime}>
            {new Date(c.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
        <View style={styles.logAmount}>
          <Text style={styles.logVal}>{subtitle}</Text>
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Session Details</Text>
        <View style={{ width: 60 }} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    marginBottom: 12,
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
    paddingBottom: 40,
  },
  dateTitle: {
    ...typography.h2,
    color: colors.textSecondary,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  actionBarRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 10,
  },
  reopenBtn: {
    flex: 1,
    backgroundColor: 'rgba(187, 134, 252, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.35)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reopenBtnText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.primary,
    fontWeight: 'bold',
  },
  addItemBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addItemBtnText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.text,
    fontWeight: 'bold',
  },
  overlapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(3, 218, 198, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(3, 218, 198, 0.3)',
    gap: 12,
  },
  overlapTitle: {
    ...typography.caption,
    fontSize: 13,
    color: colors.secondary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  overlapSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  overlapMergeBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  overlapMergeBtnText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
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
  logIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    marginRight: 12,
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
