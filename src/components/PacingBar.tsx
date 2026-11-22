import React, { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Consumption } from '../store';
import { colors, typography } from '../theme';
import { formatStopwatch, getSessionPacingStats } from '../utils/pacingStats';

interface Props {
  consumptions: Consumption[];
  sessionStartTime: number;
}

const formatClockTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * Isolated 1-second pacing stopwatch and cumulative dose counter.
 * Keeps its own timer and AppState sync so DashboardScreen and BurndownChart
 * do not re-render every second.
 */
export default function PacingBar({ consumptions, sessionStartTime }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        setNow(Date.now());
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  const stats = useMemo(() => getSessionPacingStats(consumptions), [consumptions]);
  const hasAlcohol = stats.alcoholCount > 0 && stats.lastAlcohol !== null;
  const hasTHC = stats.thcCount > 0 && stats.lastTHC !== null;

  if (!hasAlcohol && !hasTHC) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCard}>
          <View style={styles.emptyLeft}>
            <Feather name="clock" size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <View>
              <Text style={styles.label}>Session Elapsed</Text>
              <Text style={styles.emptyHint}>Tap + to log your first item</Text>
            </View>
          </View>
          <Text style={styles.timerCompact}>{formatStopwatch(sessionStartTime, now)}</Text>
        </View>
      </View>
    );
  }

  if (hasAlcohol && hasTHC && stats.lastAlcohol && stats.lastTHC) {
    return (
      <View style={styles.container}>
        <View style={styles.splitRow}>
          <View style={[styles.halfCard, { borderColor: 'rgba(187, 134, 252, 0.25)' }]}>
            <Text style={styles.label}>Since Last Drink</Text>
            <Text style={[styles.timerSplit, { color: colors.primary }]}>
              {formatStopwatch(stats.lastAlcohol.timestamp, now)}
            </Text>
            <Text style={styles.metaText} numberOfLines={1}>
              Total: {stats.totalStandardDrinks} {stats.totalStandardDrinks === 1 ? 'drink' : 'drinks'}
            </Text>
            <Text style={styles.subMetaText} numberOfLines={1}>
              {stats.lastAlcohol.name}
            </Text>
          </View>

          <View style={[styles.halfCard, { borderColor: 'rgba(3, 218, 198, 0.25)' }]}>
            <Text style={styles.label}>Since Last THC</Text>
            <Text style={[styles.timerSplit, { color: colors.secondary }]}>
              {formatStopwatch(stats.lastTHC.timestamp, now)}
            </Text>
            <Text style={styles.metaText} numberOfLines={1}>
              Total: {stats.totalTHCMg}mg
            </Text>
            <Text style={styles.subMetaText} numberOfLines={1}>
              {stats.lastTHC.name}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const isTHC = hasTHC && stats.lastTHC !== null;
  const lastItem = isTHC ? stats.lastTHC! : stats.lastAlcohol!;
  const accentColor = isTHC ? colors.secondary : colors.primary;
  const timerTitle = isTHC ? 'Since Last THC' : 'Since Last Drink';
  const totalValue = isTHC
    ? `${stats.totalTHCMg}mg`
    : `${stats.totalStandardDrinks} ${stats.totalStandardDrinks === 1 ? 'drink' : 'drinks'}`;
  const totalSub = isTHC
    ? `${stats.thcCount} ${stats.thcCount === 1 ? 'dose' : 'doses'}`
    : `${stats.alcoholCount} logged`;

  return (
    <View style={styles.container}>
      <View style={styles.fullCard}>
        <View style={styles.fullLeft}>
          <Text style={styles.label}>{timerTitle}</Text>
          <Text style={[styles.timerLarge, { color: accentColor }]}>
            {formatStopwatch(lastItem.timestamp, now)}
          </Text>
          <Text style={styles.subMetaText} numberOfLines={1}>
            {lastItem.name} · {formatClockTime(lastItem.timestamp)}
          </Text>
        </View>

        <View style={styles.fullDivider} />

        <View style={styles.fullRight}>
          <Text style={styles.label}>Session Total</Text>
          <Text style={styles.totalValue}>{totalValue}</Text>
          <Text style={styles.subMetaText}>{totalSub}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginVertical: 8,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timerCompact: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  fullCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  fullLeft: {
    flex: 1.35,
    paddingRight: 12,
  },
  fullDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 12,
  },
  fullRight: {
    flex: 0.9,
    alignItems: 'flex-end',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: 'bold',
  },
  timerLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  timerSplit: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 2,
    fontVariant: ['tabular-nums'],
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
    marginBottom: 2,
  },
  metaText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: 'bold',
  },
  subMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
