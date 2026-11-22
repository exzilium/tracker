import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore, Consumption, FavoriteItem } from '../store';
import { colors, typography } from '../theme';
import DangerMeter from '../components/DangerMeter';
import PacingBar from '../components/PacingBar';
import VibeCheckBar from '../components/VibeCheckBar';
import EntryIcon from '../components/EntryIcon';
import BurndownChart from '../components/BurndownChart';
import AdBanner from '../components/BannerAd';
import EditConsumptionModal from '../components/EditConsumptionModal';
import EndSessionConfirmModal from '../components/EndSessionConfirmModal';
import ContinueSessionModal from '../components/ContinueSessionModal';
import { registerForPushNotificationsAsync, scheduleHydrationReminder } from '../utils/notifications';
import { getCurrentLevels, getPeaks } from '../utils/currentLevels';
import {
  formatConsumableSubtitle,
  getConsumableColor,
  withAlpha,
} from '../utils/consumableMeta';
import {
  findOverlappingClosedSessions,
  OverlappingSessionMatch,
} from '../utils/sessionMerge';
import { AppAlert } from '../utils/AppAlert';
import FloatingMascot from '../components/FloatingMascot';

const timeAgo = (ts: number) => {
  const diffMs = Date.now() - ts;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  const remainder = diffMins % 60;
  return remainder > 0 ? `${diffHours}h ${remainder}m ago` : `${diffHours}h ago`;
};

export default function DashboardScreen({ navigation }: { navigation: { navigate: (screen: string, params?: any) => void } }) {
  const consumptions = useAppStore((state) => state.consumptions);
  const sessions = useAppStore((state) => state.sessions);
  const favorites = useAppStore((state) => state.favorites);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const profile = useAppStore((state) => state.profile);
  const addConsumption = useAppStore((state) => state.addConsumption);
  const removeConsumption = useAppStore((state) => state.removeConsumption);
  const updateSessionState = useAppStore((state) => state.updateSessionState);
  const endSession = useAppStore((state) => state.endSession);
  const setStartSessionVisible = useAppStore((state) => state.setStartSessionVisible);
  const setQuickEntryVisible = useAppStore((state) => state.setQuickEntryVisible);

  const [editingLog, setEditingLog] = useState<Consumption | null>(null);
  const [endSessionConfirmVisible, setEndSessionConfirmVisible] = useState(false);
  const [pendingQuickLaunch, setPendingQuickLaunch] = useState<{
    fav: FavoriteItem;
    match: OverlappingSessionMatch;
  } | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());
  const [autoClosePrompted, setAutoClosePrompted] = useState<string | null>(null);

  useEffect(() => {
    setLastRefreshed(Date.now());
  }, [consumptions]);

  useEffect(() => {
    registerForPushNotificationsAsync();
    
    // Heartbeat to update relative times every 60s
    const timer = setInterval(() => setLastRefreshed(Date.now()), 60000);
    
    // AppState listener for when returning from background/locked state
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setLastRefreshed(Date.now());
      }
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const currentSessionLogs = useMemo(() => {
    if (!activeSessionId) return [];
    
    return consumptions
      .filter((c) => c.sessionId === activeSessionId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [consumptions, activeSessionId]);

  // Physiological levels must account for any recent intake within the 24h metabolic window,
  // even if the user ended a prior session before reaching 0.000 BAC / 0.0mg THC.
  const metabolicWindowLogs = useMemo(() => {
    if (!activeSessionId) return [];
    const cutoff = lastRefreshed - 24 * 60 * 60 * 1000;
    return consumptions.filter(
      (c) => c.sessionId === activeSessionId || c.timestamp >= cutoff
    );
  }, [consumptions, activeSessionId, lastRefreshed]);

  const levels = useMemo(
    () => getCurrentLevels(metabolicWindowLogs, profile, lastRefreshed),
    [metabolicWindowLogs, profile, lastRefreshed]
  );

  const peaks = useMemo(
    () => getPeaks(metabolicWindowLogs, profile, lastRefreshed),
    [metabolicWindowLogs, profile, lastRefreshed]
  );

  // Biological Reset logic for active session
  useEffect(() => {
    if (activeSessionId && activeSession && currentSessionLogs.length > 0) {
      const isCompletelySober = levels.currentBAC <= 0 && levels.currentTHC <= 0;
      const isInactiveFor4Hours = Date.now() - currentSessionLogs[0].timestamp > 4 * 60 * 60 * 1000;
      const isOver24Hours = Date.now() - activeSession.startTime > 24 * 60 * 60 * 1000;
      
      // Auto prompt to end session if completely sober and inactive for 4 hours, or if session is over 24 hours
      if ((isCompletelySober && isInactiveFor4Hours) || isOver24Hours) {
        if (autoClosePrompted !== activeSessionId) {
          setEndSessionConfirmVisible(true);
          setAutoClosePrompted(activeSessionId);
        }
      }
    }
  }, [currentSessionLogs, levels.currentBAC, levels.currentTHC, activeSession, activeSessionId, autoClosePrompted]);

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

  const handleMarkFinishedConfirm = (item: Consumption) => {
    const elapsedMins = Math.max(0, Math.floor((Date.now() - item.timestamp) / 60000));
    const oldDuration = item.durationMins || 0;
    
    if (elapsedMins === oldDuration) return;

    const actionText = elapsedMins > oldDuration ? "Extend duration" : "Finish early";

    AppAlert(
      "Update Duration",
      `${actionText} for ${item.name}? It will change from ${oldDuration}m to ${elapsedMins}m.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Update", onPress: () => {
           const { updateConsumption } = useAppStore.getState();
           updateConsumption(item.id, { durationMins: elapsedMins });
        }}
      ]
    );
  };

  const commitFavoriteConsumption = (
    fav: FavoriteItem,
    targetSessionId?: string
  ) => {
    addConsumption(
      {
        type: fav.type,
        name: fav.name,
        emoji: fav.emoji,
        color: fav.color,
        volumeOz: fav.volumeOz,
        abvPercent: fav.abvPercent,
        method: fav.method,
        mg: fav.mg,
        durationMins: fav.durationMins,
        calories: fav.calories,
        timestamp: Date.now(),
      },
      targetSessionId ? { targetSessionId, reopenTarget: true } : undefined
    );
    scheduleHydrationReminder();
  };

  const handleQuickLaunchFavorite = (fav: FavoriteItem) => {
    Promise.resolve(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)).catch(() => {});
    const now = Date.now();
    const matches = findOverlappingClosedSessions(
      sessions,
      consumptions,
      profile,
      now,
      fav
    );

    if (matches.length > 0) {
      setPendingQuickLaunch({ fav, match: matches[0] });
      return;
    }

    commitFavoriteConsumption(fav);
  };

  const confirmEndSession = () => {
    setEndSessionConfirmVisible(false);
    if (activeSession) {
      const completedSession = { ...activeSession, endTime: Date.now() };
      endSession();
      navigation.navigate('SessionDetail', { session: completedSession });
    } else {
      endSession();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.headerRow}>
          <Text style={[styles.header, { letterSpacing: 1, fontSize: 42 }]}>Space Tether</Text>
        </View>

        {!activeSessionId || !activeSession ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateContent}>
              <FloatingMascot compact />
              <Text style={styles.emptyTitle}>Quick Launch</Text>
              <Text style={styles.emptySubtitle}>Tap a favorite to start tracking instantly.</Text>

              {favorites.length > 0 && (
                <>
                  <View style={styles.favoritesGrid}>
                    {favorites.map((fav) => {
                      const subtitle = formatConsumableSubtitle(fav);
                      const itemColor = getConsumableColor(fav);
                      return (
                        <TouchableOpacity
                          key={fav.id}
                          activeOpacity={0.75}
                          style={styles.favCard}
                          onPress={() => handleQuickLaunchFavorite(fav)}
                          onLongPress={() => navigation.navigate('ManageFavorites')}
                        >
                          <View style={styles.favIconContainer}>
                            <EntryIcon
                              iconString={fav.emoji || (fav.type === 'alcohol' ? '🍺' : '🍃')}
                              size={28}
                              color={itemColor}
                            />
                          </View>
                          <Text style={styles.favName} numberOfLines={2}>
                            {fav.name}
                          </Text>
                          {!!subtitle && (
                            <Text style={styles.favSubtitle} numberOfLines={1}>
                              {subtitle}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.manageHint}>Long press any favorite to manage</Text>
                </>
              )}

              <TouchableOpacity
                style={styles.customLaunchBtn}
                onPress={() => setQuickEntryVisible(true, 'custom')}
              >
                <Text style={styles.customLaunchBtnText}>+ Custom Entry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mindfulBtn}
                onPress={() => setStartSessionVisible(true)}
              >
                <Text style={styles.mindfulBtnText}>Mindful Check-In &amp; Start</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 24, alignItems: 'center' }}>
               <AdBanner />
            </View>
          </View>
        ) : (
          <>
            <DangerMeter 
              currentBAC={levels.currentBAC} 
              peakBAC={peaks.peakBAC}
              peakBACTime={peaks.peakBACTime}
              currentTHC={levels.currentTHC}
              peakTHC={peaks.peakTHC} 
              peakTHCTime={peaks.peakTHCTime}
            />

            <PacingBar
              consumptions={currentSessionLogs}
              sessionStartTime={activeSession.startTime}
            />

            <VibeCheckBar
              mood={activeSession.mood}
              hunger={activeSession.hunger}
              anxiety={activeSession.anxiety}
              hasCheckedIn={activeSession.hasSubjectiveCheckIn !== false}
              onMoodChange={(v) => updateSessionState(v, activeSession.hunger, activeSession.anxiety)}
              onHungerChange={(v) => updateSessionState(activeSession.mood, v, activeSession.anxiety)}
              onAnxietyChange={(v) => updateSessionState(activeSession.mood, activeSession.hunger, v)}
              onLogAllNormal={() => updateSessionState(3, 3, 3)}
            />

            <BurndownChart consumptionsOverride={metabolicWindowLogs} lastRefreshed={lastRefreshed} />
            
            <AdBanner />

            <View style={styles.logSection}>
              <Text style={styles.sectionTitle}>Recent Logs</Text>
              {currentSessionLogs.length === 0 ? (
                <Text style={styles.emptyText}>Nothing logged yet today.</Text>
              ) : (
                <View>
                  {currentSessionLogs.map(item => {
                    const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    const isFinished = Date.now() >= item.timestamp + ((item.durationMins || 0) * 60000);
                    const itemColor = getConsumableColor(item);
                    const doseSubtitle = formatConsumableSubtitle(item);

                    return (
                      <View key={item.id} style={styles.logRow}>
                        <View
                          style={[
                            styles.logIconCircle,
                            { backgroundColor: withAlpha(itemColor, 0.12) },
                          ]}
                        >
                          <EntryIcon
                            iconString={item.emoji || (item.type === 'alcohol' ? '🍺' : '🍃')}
                            size={20}
                            color={itemColor}
                          />
                        </View>
                        <View style={styles.logInfo}>
                          <Text style={styles.logName}>{item.name}</Text>
                          <Text style={styles.logTime}>
                            {doseSubtitle ? `${doseSubtitle} · ` : ''}{timeStr} ({timeAgo(item.timestamp)})
                          </Text>
                          {!isFinished && (
                            <View style={styles.inProgressBadge}>
                              <Text style={styles.inProgressText}>● In Progress</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.actionsRow}>
                          {(item.durationMins || 0) > 0 && (
                            <TouchableOpacity 
                              style={[
                                styles.finishBtn, 
                                isFinished ? { backgroundColor: 'rgba(255,255,255,0.1)', width: 32 } : {}
                              ]} 
                              onPress={() => handleMarkFinishedConfirm(item)}
                            >
                              {isFinished ? (
                                <MaterialCommunityIcons name="timer-sync-outline" size={16} color={colors.textSecondary} />
                              ) : (
                                <Text style={styles.finishBtnText}>✓</Text>
                              )}
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={styles.actionBtn} onPress={() => setEditingLog(item)}>
                            <Text style={styles.actionBtnText}>✎</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id, item.name)}>
                            <Text style={styles.deleteBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
            
            <View style={styles.endSessionWrapper}>
               <TouchableOpacity style={styles.endSessionBtn} onPress={() => setEndSessionConfirmVisible(true)}>
                 <Text style={styles.endSessionText}>End Session</Text>
               </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <EditConsumptionModal 
        visible={!!editingLog} 
        consumption={editingLog} 
        onClose={() => setEditingLog(null)} 
      />
      
      <EndSessionConfirmModal 
        visible={endSessionConfirmVisible}
        onCancel={() => setEndSessionConfirmVisible(false)}
        onConfirm={confirmEndSession}
      />

      <ContinueSessionModal
        visible={!!pendingQuickLaunch}
        match={pendingQuickLaunch?.match ?? null}
        itemName={pendingQuickLaunch?.fav.name}
        onContinue={() => {
          if (!pendingQuickLaunch) return;
          commitFavoriteConsumption(
            pendingQuickLaunch.fav,
            pendingQuickLaunch.match.session.id
          );
          setPendingQuickLaunch(null);
        }}
        onStartNew={() => {
          if (!pendingQuickLaunch) return;
          commitFavoriteConsumption(pendingQuickLaunch.fav);
          setPendingQuickLaunch(null);
        }}
        onCancel={() => setPendingQuickLaunch(null)}
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    ...typography.h1,
    color: colors.text,
  },
  logSection: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 16,
  },
  emptyText: {
    color: colors.textSecondary,
    ...typography.body,
    fontStyle: 'italic',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logName: {
    color: colors.text,
    ...typography.body,
    fontWeight: 'bold',
  },
  logTime: {
    color: colors.textSecondary,
    ...typography.caption,
    marginTop: 4,
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
  },
  emptyState: {
    marginTop: 12,
  },
  emptyStateContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.h1,
    fontSize: 26,
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  favoritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  favCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  favIconContainer: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  favName: {
    ...typography.caption,
    color: colors.text,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  favSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  manageHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  customLaunchBtn: {
    backgroundColor: 'rgba(187, 134, 252, 0.14)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.35)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  customLaunchBtnText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: 'bold',
  },
  mindfulBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  mindfulBtnText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  endSessionWrapper: {
    padding: 24,
    marginTop: 24,
    marginBottom: 40,
    alignItems: 'center',
  },
  endSessionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  endSessionText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  inProgressBadge: {
    marginTop: 4,
  },
  inProgressText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  finishBtn: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: 'rgba(3, 218, 198, 0.2)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtnText: {
    color: colors.success,
    fontWeight: 'bold',
  }
});
