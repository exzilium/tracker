import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store';
import { colors, typography } from '../theme';
import { calculateDangerLevel } from '../utils/dangerLevel';

interface Props {
  currentBAC: number;
  peakBAC: number;
  peakBACTime: number;
  currentTHC: number;
  peakTHC: number;
  peakTHCTime: number;
}

export default function DangerMeter({
  currentBAC,
  peakBAC,
  peakBACTime,
  currentTHC,
  peakTHC,
  peakTHCTime,
}: Props) {
  const { profile, currentMood, currentHunger } = useAppStore();

  const maxBAC = profile.maxBAC || 0.08;
  const maxTHC = profile.maxTHC || 10;

  const { dangerPercent, warningMsg } = calculateDangerLevel(
    currentBAC, maxBAC, peakTHC, maxTHC, currentMood, currentHunger
  );

  let statusColor = colors.success;
  if (dangerPercent >= 100) {
    statusColor = colors.error;
  } else if (dangerPercent >= 75) {
    statusColor = colors.warning;
  }

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
  };

  const formatRelativeTime = (ts: number) => {
    const diffMinsTotal = Math.round((ts - Date.now()) / 60000);
    const absMins = Math.abs(diffMinsTotal);
    
    let timeStr = '';
    if (absMins < 60) {
      timeStr = `${absMins} min`;
    } else {
      const hrs = Math.floor(absMins / 60);
      const mins = absMins % 60;
      timeStr = `${hrs}h${mins > 0 ? ` ${mins}m` : ''}`;
    }

    if (diffMinsTotal === 0) return 'now';
    if (diffMinsTotal > 0) return `in ${timeStr}`;
    return `${timeStr} ago`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Danger Level</Text>

      <View style={styles.statusBox}>
        <View style={styles.liveTimeBox}>
          <Text style={[styles.liveTimeText, { color: statusColor }]}>
            Live: {currentTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Current BAC</Text>
            <Text style={[styles.statValue, { color: statusColor }]}>{currentBAC.toFixed(3)}</Text>
            {peakBAC > 0.001 && (
              <Text style={styles.statTimeText}>Peak {peakBAC.toFixed(3)} at {formatTime(peakBACTime)}{'\n'}({formatRelativeTime(peakBACTime)})</Text>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: statusColor }]} />

          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Current THC</Text>
            <Text style={[styles.statValue, { color: statusColor }]}>{currentTHC.toFixed(1)}<Text style={styles.unitText}>mg</Text></Text>
            {peakTHC > 0.01 && (
              <Text style={styles.statTimeText}>Peak {peakTHC.toFixed(1)}mg at {formatTime(peakTHCTime)}{'\n'}({formatRelativeTime(peakTHCTime)})</Text>
            )}
          </View>
        </View>

        {warningMsg && (
          <View style={styles.messageRow}>
            <Text style={[styles.warningText, { color: statusColor }]}>{warningMsg}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginVertical: 16,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 12,
  },
  statusBox: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  liveTimeBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  liveTimeText: {
    ...typography.caption,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: '80%',
    opacity: 0.3,
    marginHorizontal: 16,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginBottom: 4,
  },
  unitText: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  statTimeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  messageRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  warningText: {
    ...typography.body,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
