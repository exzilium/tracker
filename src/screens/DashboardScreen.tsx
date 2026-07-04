import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, AppState, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Consumption } from '../store';
import { colors, typography } from '../theme';
import DangerMeter from '../components/DangerMeter';
import EntryIcon from '../components/EntryIcon';
import BurndownChart from '../components/BurndownChart';
import AdBanner from '../components/BannerAd';
import SubjectiveState from '../components/SubjectiveState';
import EditConsumptionModal from '../components/EditConsumptionModal';
import EndSessionConfirmModal from '../components/EndSessionConfirmModal';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { getCurrentLevels, getPeaks } from '../utils/currentLevels';
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

export default function DashboardScreen({ navigation }: any) {
  const { 
    consumptions, 
    sessions, 
    activeSessionId, 
    profile, 
    removeConsumption,
    updateSessionState,
    endSession,
    setStartSessionVisible
  } = useAppStore();

  const [levels, setLevels] = useState({ currentBAC: 0, currentTHC: 0, peakTHC: 0 });
  const [peaks, setPeaks] = useState({ peakBAC: 0, peakBACTime: 0, peakTHC: 0, peakTHCTime: 0 });
  const [editingLog, setEditingLog] = useState<Consumption | null>(null);
  const [endSessionConfirmVisible, setEndSessionConfirmVisible] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  useEffect(() => {
    registerForPushNotificationsAsync();
    
    // Heartbeat to update relative times every 60s
    const timer = setInterval(() => setLastRefreshed(Date.now()), 60000);
    
    // AppState listener for when returning from background/locked state
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        setLastRefreshed(Date.now());
      }
    });

    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const currentSessionLogs = useMemo(() => {
    if (!activeSessionId) return [];
    
    return consumptions
      .filter(c => c.sessionId === activeSessionId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [consumptions, activeSessionId]);

  // Biological Reset logic for active session
  useEffect(() => {
    if (activeSessionId && activeSession && currentSessionLogs.length > 0) {
      const { currentBAC, currentTHC } = getCurrentLevels(currentSessionLogs, profile);
      
      // Auto end session if completely sober and the last log is > 1 hour old (prevents instant close on tiny doses)
      if (currentBAC <= 0 && currentTHC <= 0) {
        if (Date.now() - currentSessionLogs[0].timestamp > 60 * 60 * 1000) {
           endSession();
        }
      }
      
      // Failsafe: if the session started over 24 hours ago, force end
      if (Date.now() - activeSession.startTime > 24 * 60 * 60 * 1000) {
        endSession();
      }
    }
  }, [currentSessionLogs, profile, activeSession, activeSessionId, endSession]);

  // Recalculate levels whenever current session logs change or time passes
  useEffect(() => {
    setLevels(getCurrentLevels(currentSessionLogs, profile));
    setPeaks(getPeaks(currentSessionLogs, profile));
  }, [currentSessionLogs, profile, lastRefreshed]);

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

  const handleMarkFinished = (item: Consumption) => {
    const elapsedMins = (Date.now() - item.timestamp) / 60000;
    const { updateConsumption } = useAppStore.getState();
    updateConsumption(item.id, { durationMins: Math.max(0, Math.floor(elapsedMins)) });
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

        {!activeSessionId ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateContent}>
              <FloatingMascot />
              <Text style={styles.emptyTitle}>Awaiting Launch...</Text>
              <Text style={styles.emptySubtitle}>Log your mood and intent before you start consuming.</Text>
              <TouchableOpacity style={styles.startBtn} onPress={() => setStartSessionVisible(true)}>
                <Text style={styles.startBtnText}>Start New Session</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 40, alignItems: 'center' }}>
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

            <SubjectiveState 
              mood={activeSession!.mood}
              hunger={activeSession!.hunger}
              anxiety={activeSession!.anxiety}
              onMoodChange={(v) => updateSessionState(v, activeSession!.hunger, activeSession!.anxiety)}
              onHungerChange={(v) => updateSessionState(activeSession!.mood, v, activeSession!.anxiety)}
              onAnxietyChange={(v) => updateSessionState(activeSession!.mood, activeSession!.hunger, v)}
            />

            <BurndownChart consumptionsOverride={currentSessionLogs} lastRefreshed={lastRefreshed} />
            
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

                    return (
                      <View key={item.id} style={styles.logRow}>
                        <View style={{ marginRight: 12 }}>
                          <EntryIcon iconString={item.emoji || (item.type === 'alcohol' ? '🍺' : '🍃')} size={24} color={colors.textSecondary} />
                        </View>
                        <View style={styles.logInfo}>
                          <Text style={styles.logName}>{item.name}</Text>
                          <Text style={styles.logTime}>{timeStr} ({timeAgo(item.timestamp)})</Text>
                          {!isFinished && (
                            <View style={styles.inProgressBadge}>
                              <Text style={styles.inProgressText}>● In Progress</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.actionsRow}>
                          {!isFinished && (
                            <TouchableOpacity style={styles.finishBtn} onPress={() => handleMarkFinished(item)}>
                              <Text style={styles.finishBtnText}>✓</Text>
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
  logIcon: {
    fontSize: 24,
    marginRight: 16,
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
    marginTop: 64,
  },
  emptyStateContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.h1,
    fontSize: 28,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  startBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  startBtnText: {
    ...typography.body,
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
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
