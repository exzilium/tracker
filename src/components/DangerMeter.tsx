import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store';
import { colors, typography } from '../theme';
import { calculateDangerLevel } from '../utils/dangerLevel';
import { generateInsight } from '../utils/insightEngine';

import AstronautGraphic from './AstronautGraphic';
import TetherGraphic from './TetherGraphic';

const LiveClock = ({ statusColor }: { statusColor: string }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const msUntilNextMinute = (60 - new Date().getSeconds()) * 1000;
    const timeoutId = setTimeout(() => {
      setCurrentTime(new Date());
      intervalId = setInterval(() => setCurrentTime(new Date()), 60_000);
    }, msUntilNextMinute);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <View style={styles.liveTimeBox}>
      <Text style={[styles.liveTimeText, { color: statusColor }]}>
        Live: {currentTime.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
      </Text>
    </View>
  );
};

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
  const profile = useAppStore(state => state.profile);
  const activeSessionId = useAppStore(state => state.activeSessionId);
  const sessions = useAppStore(state => state.sessions);
  
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const currentMood = activeSession?.mood || 3;
  const currentHunger = activeSession?.hunger || 3;
  const currentAnxiety = activeSession?.anxiety || 3;

  const maxBAC = profile.maxBAC || 0.08;
  const maxTHC = profile.maxTHC || 10;

  const now = Date.now();
  const isPastBACPeak = peakBAC > 0 && peakBACTime <= now;
  const isPastTHCPeak = peakTHC > 0 && peakTHCTime <= now;
  const isBACRising = peakBAC > currentBAC + 0.005 && peakBACTime > now;
  const isProjectedToSpike =
    (peakBAC >= maxBAC && currentBAC < maxBAC && peakBACTime > now) ||
    (peakTHC >= maxTHC && currentTHC < maxTHC && peakTHCTime > now);

  const { tensionPercent } = useMemo(() => calculateDangerLevel(
    currentBAC,
    maxBAC,
    peakBAC,
    currentTHC,
    maxTHC,
    peakTHC,
    currentMood,
    currentHunger,
    currentAnxiety,
    isPastBACPeak,
    isPastTHCPeak
  ), [currentBAC, maxBAC, peakBAC, currentTHC, maxTHC, peakTHC, currentMood, currentHunger, currentAnxiety, isPastBACPeak, isPastTHCPeak]);

  const prevTensionRef = useRef(tensionPercent);
  const didTensionDrop = tensionPercent < prevTensionRef.current;
  useEffect(() => {
    prevTensionRef.current = tensionPercent;
  }, [tensionPercent]);

  const warningMsg = useMemo(() => generateInsight({
    tensionPercent,
    currentBAC,
    maxBAC,
    peakBAC,
    currentTHC,
    maxTHC,
    peakTHC,
    isPastBACPeak,
    isPastTHCPeak,
    isProjectedToSpike,
    isBACRising,
    didTensionDrop,
    mood: currentMood,
    hunger: currentHunger,
    anxiety: currentAnxiety,
  }), [
    tensionPercent,
    currentBAC,
    maxBAC,
    peakBAC,
    currentTHC,
    maxTHC,
    peakTHC,
    isPastBACPeak,
    isPastTHCPeak,
    isProjectedToSpike,
    isBACRising,
    didTensionDrop,
    currentMood,
    currentHunger,
    currentAnxiety,
  ]);

  let statusColor = colors.success;
  if (tensionPercent >= 100) {
    statusColor = colors.error;
  } else if (tensionPercent >= 85) {
    statusColor = colors.warning;
  } else if (tensionPercent < 20) {
    statusColor = colors.textSecondary;
  }

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
      <View style={styles.statusBox}>
        <LiveClock statusColor={statusColor} />

        {/* Dashboard Visuals */}
        <AstronautGraphic tensionPercent={tensionPercent} />
        <TetherGraphic tensionPercent={tensionPercent} />

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
