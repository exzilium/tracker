import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppStore, Consumption } from '../store';
import { colors, typography } from '../theme';
import { calculateStandardDrinks } from '../utils/mathEngine';
import { getPeaks } from '../utils/currentLevels';
import { findOverlapClusters } from '../utils/sessionMerge';
import { AppAlert } from '../utils/AppAlert';
import EntryIcon from '../components/EntryIcon';

export interface SessionData {
  id: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  consumptions: Consumption[];
  totalDrinks: number;
  totalTHC: number;
  totalCalories: number;
  peakBAC: number;
  peakTHC: number;
}

const formatDate = (ts: number) => {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatTimeRange = (start: number, end: number, isActive: boolean) => {
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  const sStr = new Date(start).toLocaleTimeString([], opts);
  const eStr = isActive ? 'Active' : new Date(end).toLocaleTimeString([], opts);
  return `${sStr} – ${eStr}`;
};

export default function SessionsListScreen({ navigation }: { navigation: { goBack: () => void; navigate: (screen: string, params?: any) => void } }) {
  const sessions = useAppStore((state) => state.sessions);
  const consumptions = useAppStore((state) => state.consumptions);
  const profile = useAppStore((state) => state.profile);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const mergeSessions = useAppStore((state) => state.mergeSessions);

  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const formattedSessions = useMemo(() => {
    if (sessions.length === 0) return [];

    // O(C) single-pass index of consumptions by sessionId
    const bySession = new Map<string, Consumption[]>();
    for (const c of consumptions) {
      const existing = bySession.get(c.sessionId);
      if (existing) {
        existing.push(c);
      } else {
        bySession.set(c.sessionId, [c]);
      }
    }

    const result: SessionData[] = sessions.map((s) => {
      const sessionConsumptions = bySession.get(s.id) || [];
      
      let totalDrinks = 0;
      let totalTHC = 0;
      let totalCalories = 0;
      let maxBAC = 0;
      let maxTHC = 0;

      if (sessionConsumptions.length > 0) {
        const peaks = getPeaks(sessionConsumptions, profile, s.endTime ?? Date.now());
        maxBAC = peaks.peakBAC;
        maxTHC = peaks.peakTHC;
      }

      sessionConsumptions.forEach((c) => {
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
        isActive: s.id === activeSessionId || s.endTime === null,
        consumptions: sessionConsumptions,
        totalDrinks: Number(totalDrinks.toFixed(1)),
        totalTHC: Number(totalTHC.toFixed(1)),
        totalCalories,
        peakBAC: Number(maxBAC.toFixed(3)),
        peakTHC: Number(maxTHC.toFixed(1)),
      };
    });

    // Sort newest sessions first by startTime (supports backdated sessions)
    return result.sort((a, b) => b.startTime - a.startTime);
  }, [sessions, consumptions, profile, activeSessionId]);

  const overlapClusters = useMemo(
    () => findOverlapClusters(sessions, consumptions, profile),
    [sessions, consumptions, profile]
  );

  const overlappingSessionCount = useMemo(
    () => overlapClusters.reduce((sum, c) => sum + c.length, 0),
    [overlapClusters]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleCombineOverlapping = () => {
    if (overlapClusters.length === 0) return;
    const message =
      overlapClusters.length === 1
        ? `Combine ${overlapClusters[0].length} overlapping sessions into one unified session and projection graph?`
        : `Combine ${overlapClusters.length} overlapping session groups (${overlappingSessionCount} sessions total) into unified sessions?`;

    AppAlert('Combine Overlapping Sessions', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Combine',
        onPress: () => {
          for (const cluster of overlapClusters) {
            mergeSessions(cluster.map((s) => s.id));
          }
        },
      },
    ]);
  };

  const handleCombineSelected = () => {
    if (selectedIds.length < 2) return;
    AppAlert(
      'Combine Selected Sessions',
      `Merge ${selectedIds.length} selected sessions into a single unified session and projection graph?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Combine',
          onPress: () => {
            mergeSessions(selectedIds);
            setSelectedIds([]);
            setMergeMode(false);
          },
        },
      ]
    );
  };

  const renderHeaderBanner = () => {
    if (mergeMode) {
      return (
        <View style={styles.mergeHintBanner}>
          <Text style={styles.mergeHintText}>
            Tap 2 or more sessions below to combine them into a single continuous graph.
          </Text>
        </View>
      );
    }

    if (overlapClusters.length === 0) return null;

    return (
      <View style={styles.overlapBanner}>
        <View style={styles.overlapBannerTextWrap}>
          <Text style={styles.overlapTitle}>Overlapping Sessions Detected</Text>
          <Text style={styles.overlapSubtitle}>
            {overlapClusters.length === 1
              ? `${overlapClusters[0].length} sessions overlap in time or active metabolism.`
              : `${overlapClusters.length} groups (${overlappingSessionCount} sessions) overlap.`}
          </Text>
        </View>
        <TouchableOpacity style={styles.overlapBtn} onPress={handleCombineOverlapping}>
          <Text style={styles.overlapBtnText}>Combine</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderItem = useCallback(
    ({ item: session }: { item: SessionData }) => {
      const isSelected = selectedIds.includes(session.id);

      return (
        <TouchableOpacity
          style={[styles.card, isSelected && styles.cardSelected]}
          onPress={() => {
            if (mergeMode) {
              toggleSelect(session.id);
            } else {
              navigation.navigate('SessionDetail', { session });
            }
          }}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleGroup}>
              {mergeMode && (
                <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
                  {isSelected && <Feather name="check" size={12} color={colors.background} />}
                </View>
              )}
              <View>
                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>{formatDate(session.startTime)}</Text>
                  {session.isActive && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.timeRangeText}>
                  {formatTimeRange(session.startTime, session.endTime, session.isActive)}
                </Text>
              </View>
            </View>
            <Text style={styles.countText}>{session.consumptions.length} items</Text>
          </View>
          <View style={{ gap: 8 }}>
            <View style={styles.statsRow}>
              <View style={[styles.statItem, { flex: 1 }]}>
                <EntryIcon iconString="Ionicons:beer-outline" size={14} color={colors.primary} />
                <Text style={styles.stat}> {session.totalDrinks} Drinks</Text>
              </View>
              <View style={[styles.statItem, { flex: 1 }]}>
                <EntryIcon iconString="MaterialCommunityIcons:percent" size={14} color={colors.primary} />
                <Text style={styles.stat}> {session.peakBAC} Peak BAC</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={[styles.statItem, { flex: 1 }]}>
                <EntryIcon iconString="Ionicons:leaf-outline" size={14} color={colors.secondary} />
                <Text style={styles.stat}> {session.totalTHC}mg THC</Text>
              </View>
              <View style={[styles.statItem, { flex: 1 }]}>
                <EntryIcon iconString="Ionicons:balloon-outline" size={14} color={colors.secondary} />
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
      );
    },
    [navigation, mergeMode, selectedIds, toggleSelect]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Sessions</Text>
        {formattedSessions.length >= 2 ? (
          <TouchableOpacity
            style={styles.headerRightBtn}
            onPress={() => {
              setMergeMode((prev) => !prev);
              setSelectedIds([]);
            }}
          >
            <Text style={styles.headerRightText}>{mergeMode ? 'Done' : 'Merge'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <FlatList
        data={formattedSessions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeaderBanner}
        contentContainerStyle={[styles.content, mergeMode && { paddingBottom: 100 }]}
        initialNumToRender={10}
        windowSize={5}
        ListEmptyComponent={<Text style={styles.emptyText}>No sessions recorded yet.</Text>}
      />

      {mergeMode && (
        <View style={styles.mergeFooter}>
          <TouchableOpacity
            style={[
              styles.mergeConfirmBtn,
              selectedIds.length < 2 && styles.mergeConfirmBtnDisabled,
            ]}
            disabled={selectedIds.length < 2}
            onPress={handleCombineSelected}
          >
            <Text style={styles.mergeConfirmText}>
              {selectedIds.length < 2
                ? 'Select 2+ Sessions'
                : `Combine ${selectedIds.length} Sessions`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 16,
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
  headerRightBtn: {
    width: 60,
    alignItems: 'flex-end',
  },
  headerRightText: {
    color: colors.primary,
    ...typography.body,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  overlapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(187, 134, 252, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.35)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  overlapBannerTextWrap: {
    flex: 1,
  },
  overlapTitle: {
    ...typography.body,
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  overlapSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  overlapBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  overlapBtnText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: 'bold',
  },
  mergeHintBanner: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  mergeHintText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(187, 134, 252, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    ...typography.h2,
    fontSize: 19,
    color: colors.text,
  },
  timeRangeText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: 'rgba(3, 218, 198, 0.16)',
    borderColor: colors.secondary,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: 'bold',
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
  },
  mergeFooter: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 20,
  },
  mergeConfirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  mergeConfirmBtnDisabled: {
    opacity: 0.45,
  },
  mergeConfirmText: {
    ...typography.body,
    color: colors.background,
    fontWeight: 'bold',
  },
});
