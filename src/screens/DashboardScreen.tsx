import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, Consumption } from '../store';
import { colors, typography } from '../theme';
import DangerMeter from '../components/DangerMeter';
import EntryIcon from '../components/EntryIcon';
import BurndownChart from '../components/BurndownChart';
import AdBanner from '../components/BannerAd';
import SubjectiveState from '../components/SubjectiveState';
import EditConsumptionModal from '../components/EditConsumptionModal';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { getCurrentLevels, getPeaks } from '../utils/currentLevels';

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
  const { consumptions, profile, removeConsumption } = useAppStore();
  const [levels, setLevels] = useState({ currentBAC: 0, currentTHC: 0, peakTHC: 0 });
  const [peaks, setPeaks] = useState({ peakBAC: 0, peakBACTime: 0, peakTHC: 0, peakTHCTime: 0 });
  const [editingLog, setEditingLog] = useState<Consumption | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  const currentSessionLogs = useMemo(() => {
    const sorted = [...consumptions].sort((a, b) => b.timestamp - a.timestamp);
    if (sorted.length === 0) return [];

    // Failsafe: if the most recent log is older than 24 hours, the session is over regardless
    if (Date.now() - sorted[0].timestamp > 24 * 60 * 60 * 1000) {
      return [];
    }

    const session = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        const diff = sorted[i - 1].timestamp - sorted[i].timestamp;
        if (diff > 8 * 60 * 60 * 1000) break;
      }
      session.push(sorted[i]);
    }

    // Biological Reset: Session is over when active compounds both reach 0
    const { currentBAC, currentTHC } = getCurrentLevels(session, profile);
    if (currentBAC <= 0 && currentTHC <= 0) {
      return [];
    }

    return session;
  }, [consumptions, profile]);

  // Recalculate levels whenever current session logs change
  useEffect(() => {
    setLevels(getCurrentLevels(currentSessionLogs, profile));
    setPeaks(getPeaks(currentSessionLogs, profile));
  }, [currentSessionLogs, profile]);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Remove Log",
      `Are you sure you want to delete ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => removeConsumption(id) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Dashboard</Text>
        </View>

        <DangerMeter 
          currentBAC={levels.currentBAC} 
          peakBAC={peaks.peakBAC}
          peakBACTime={peaks.peakBACTime}
          currentTHC={levels.currentTHC}
          peakTHC={peaks.peakTHC} 
          peakTHCTime={peaks.peakTHCTime}
        />

        <SubjectiveState />

        <BurndownChart consumptionsOverride={currentSessionLogs} />
        
        <AdBanner />

        <View style={styles.logSection}>
          <Text style={styles.sectionTitle}>Recent Logs</Text>
          {currentSessionLogs.length === 0 ? (
            <Text style={styles.emptyText}>Nothing logged yet today.</Text>
          ) : (
            <View>
              {currentSessionLogs.map(item => (
                <View key={item.id} style={styles.logRow}>
                  <View style={{ marginRight: 12 }}>
                    <EntryIcon iconString={item.emoji || (item.type === 'alcohol' ? '🍺' : '🍃')} size={24} color={colors.textSecondary} />
                  </View>
                  <View style={styles.logInfo}>
                    <Text style={styles.logName}>{item.name}</Text>
                    <Text style={styles.logTime}>{timeAgo(item.timestamp)}</Text>
                  </View>
                  <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => setEditingLog(item)}>
                      <Text style={styles.actionBtnText}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item.id, item.name)}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  header: {
    ...typography.h1,
    color: colors.primary,
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
  }
});
