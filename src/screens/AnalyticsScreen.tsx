import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line as SvgLine, Rect, Text as SvgText } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../store';
import { colors, typography } from '../theme';
import EntryIcon from '../components/EntryIcon';
import BurndownChart from '../components/BurndownChart';
import {
  AnalyticsBucket,
  AnalyticsTimeSlice,
  computePeriodAnalytics,
  getCombinedSpanForConsumptions,
} from '../utils/analyticsEngine';
import { getConsumableColor, withAlpha } from '../utils/consumableMeta';

type ChartMetricMode = 'intake' | 'peaks' | 'calories';

const SLICE_OPTIONS: Array<{ key: AnalyticsTimeSlice; label: string }> = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: 'All' },
];

const SVG_HEIGHT = 150;
const SVG_PLOT_TOP = 16;
const SVG_PLOT_BOTTOM = 124;
const PLOT_SPAN = SVG_PLOT_BOTTOM - SVG_PLOT_TOP;

export default function AnalyticsScreen({ navigation }: { navigation: { navigate: (screen: string, params?: any) => void } }) {
  const { width: windowWidth } = useWindowDimensions();
  const sessions = useAppStore((state) => state.sessions);
  const consumptions = useAppStore((state) => state.consumptions);
  const profile = useAppStore((state) => state.profile);

  const [slice, setSlice] = useState<AnalyticsTimeSlice>('30d');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [metricMode, setMetricMode] = useState<ChartMetricMode>('intake');
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | null>(null);

  const analytics = useMemo(
    () => computePeriodAnalytics(sessions, consumptions, profile, slice, periodOffset),
    [sessions, consumptions, profile, slice, periodOffset]
  );

  const selectedBucket: AnalyticsBucket | null = useMemo(
    () => analytics.buckets.find((b) => b.key === selectedBucketKey) ?? null,
    [analytics.buckets, selectedBucketKey]
  );

  const projectionSpan = useMemo(() => {
    const targetLogs =
      selectedBucket && selectedBucket.consumptions.length > 0
        ? selectedBucket.consumptions
        : analytics.consumptions;
    return getCombinedSpanForConsumptions(targetLogs);
  }, [selectedBucket, analytics.consumptions]);

  const handleSelectSlice = (nextSlice: AnalyticsTimeSlice) => {
    setSlice(nextSlice);
    setPeriodOffset(0);
    setSelectedBucketKey(null);
  };

  const handleStepPeriod = (delta: number) => {
    setPeriodOffset((prev) => Math.min(0, prev + delta));
    setSelectedBucketKey(null);
  };

  const chartWidth = Math.max(260, windowWidth - 80);
  const bucketCount = Math.max(1, analytics.buckets.length);
  const colWidth = chartWidth / bucketCount;

  const maxDrinks = Math.max(1, ...analytics.buckets.map((b) => b.drinks));
  const maxTHC = Math.max(1, ...analytics.buckets.map((b) => b.thcMg));
  const maxCalories = Math.max(50, ...analytics.buckets.map((b) => b.calories));
  const limitBAC = profile.maxBAC || 0.08;
  const limitTHC = profile.maxTHC || 10;
  const maxPeakBAC = Math.max(limitBAC * 1.1, ...analytics.buckets.map((b) => b.peakBAC));
  const maxPeakTHC = Math.max(limitTHC * 1.1, ...analytics.buckets.map((b) => b.peakTHC));

  const formatSessionTime = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Data</Text>
          <View style={styles.sliceGroup}>
            {SLICE_OPTIONS.map((opt) => {
              const active = slice === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.sliceBtn, active && styles.sliceBtnActive]}
                  onPress={() => handleSelectSlice(opt.key)}
                >
                  <Text style={[styles.sliceText, active && styles.sliceTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {slice !== 'all' ? (
          <View style={styles.periodStepper}>
            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => handleStepPeriod(-1)}
            >
              <Feather name="chevron-left" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.periodLabel}>{analytics.window.label}</Text>
            <TouchableOpacity
              style={[styles.stepBtn, !analytics.window.canGoNext && { opacity: 0.3 }]}
              disabled={!analytics.window.canGoNext}
              onPress={() => handleStepPeriod(1)}
            >
              <Feather name="chevron-right" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.periodStepper}>
            <Text style={styles.periodLabel}>All Recorded History</Text>
          </View>
        )}

        {/* Summary KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Sessions</Text>
            <Text style={styles.kpiValue}>{analytics.sessionCount}</Text>
            <Text style={styles.kpiSub}>{analytics.totalItems} items logged</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Calories</Text>
            <Text style={styles.kpiValue}>{analytics.totalCalories}</Text>
            <Text style={styles.kpiSub}>estimated kcal</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: colors.primary }]}>Alcohol</Text>
            <Text style={styles.kpiValue}>{analytics.totalStandardDrinks}</Text>
            <Text style={styles.kpiSub}>
              std drinks · max {analytics.maxPeakBAC.toFixed(3)} BAC
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: colors.secondary }]}>THC</Text>
            <Text style={styles.kpiValue}>{analytics.totalTHCMg}mg</Text>
            <Text style={styles.kpiSub}>
              {analytics.edibleTHCMg}ed / {analytics.inhaledTHCMg}inh · max {analytics.maxPeakTHC}mg
            </Text>
          </View>
        </View>

        {/* Vibe & Limit Crossing Strip */}
        <View style={styles.vibeStrip}>
          <View style={styles.vibeCol}>
            <Text style={styles.vibeLabel}>Vibe Averages</Text>
            <Text style={styles.vibeValue}>
              {analytics.checkInCount > 0
                ? `Mood ${analytics.avgMood} · Hunger ${analytics.avgHunger} · Anxiety ${analytics.avgAnxiety}`
                : '— (no check-ins)'}
            </Text>
          </View>
          <View style={styles.vibeDivider} />
          <View style={styles.vibeColSmall}>
            <Text style={styles.vibeLabel}>Over Limit</Text>
            <Text
              style={[
                styles.vibeValue,
                analytics.bacLimitCrossings + analytics.thcLimitCrossings > 0 && {
                  color: colors.warning,
                },
              ]}
            >
              {analytics.bacLimitCrossings} BAC · {analytics.thcLimitCrossings} THC
            </Text>
          </View>
        </View>

        {/* Interactive Trend Chart */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTopRow}>
            <Text style={styles.sectionTitle}>Trends</Text>
            <View style={styles.metricTabs}>
              {(
                [
                  { key: 'intake', label: 'Intake' },
                  { key: 'peaks', label: 'Peaks' },
                  { key: 'calories', label: 'Cals' },
                ] as Array<{ key: ChartMetricMode; label: string }>
              ).map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.metricBtn, metricMode === m.key && styles.metricBtnActive]}
                  onPress={() => setMetricMode(m.key)}
                >
                  <Text
                    style={[
                      styles.metricText,
                      metricMode === m.key && styles.metricTextActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Svg width={chartWidth} height={SVG_HEIGHT}>
            <SvgLine
              x1={0}
              y1={SVG_PLOT_BOTTOM}
              x2={chartWidth}
              y2={SVG_PLOT_BOTTOM}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
            />

            {metricMode === 'peaks' && (
              <>
                <SvgLine
                  x1={0}
                  y1={SVG_PLOT_BOTTOM - (limitBAC / maxPeakBAC) * PLOT_SPAN}
                  x2={chartWidth}
                  y2={SVG_PLOT_BOTTOM - (limitBAC / maxPeakBAC) * PLOT_SPAN}
                  stroke="#F59E0B"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                  opacity={0.45}
                />
                <SvgLine
                  x1={0}
                  y1={SVG_PLOT_BOTTOM - (limitTHC / maxPeakTHC) * PLOT_SPAN}
                  x2={chartWidth}
                  y2={SVG_PLOT_BOTTOM - (limitTHC / maxPeakTHC) * PLOT_SPAN}
                  stroke={colors.success}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                  opacity={0.45}
                />
              </>
            )}

            {analytics.buckets.map((bucket, idx) => {
              const cx = idx * colWidth + colWidth / 2;
              const isSelected = selectedBucketKey === bucket.key;
              const barGap = 2;
              const singleBarW = Math.min(18, Math.max(6, colWidth * 0.48));
              const dualBarW = Math.min(11, Math.max(4, colWidth * 0.28));

              const showLabel =
                bucketCount <= 7 || idx % Math.ceil(bucketCount / 6) === 0 || idx === bucketCount - 1;

              return (
                <React.Fragment key={bucket.key}>
                  {isSelected && (
                    <Rect
                      x={idx * colWidth + 2}
                      y={4}
                      width={Math.max(4, colWidth - 4)}
                      height={SVG_PLOT_BOTTOM - 2}
                      rx={6}
                      fill="rgba(255,255,255,0.06)"
                    />
                  )}

                  {metricMode === 'intake' && (
                    <>
                      {bucket.drinks > 0 && (
                        <Rect
                          x={cx - dualBarW - barGap / 2}
                          y={SVG_PLOT_BOTTOM - (bucket.drinks / maxDrinks) * PLOT_SPAN}
                          width={dualBarW}
                          height={Math.max(3, (bucket.drinks / maxDrinks) * PLOT_SPAN)}
                          rx={3}
                          fill={colors.primary}
                        />
                      )}
                      {bucket.thcMg > 0 && (
                        <Rect
                          x={cx + barGap / 2}
                          y={SVG_PLOT_BOTTOM - (bucket.thcMg / maxTHC) * PLOT_SPAN}
                          width={dualBarW}
                          height={Math.max(3, (bucket.thcMg / maxTHC) * PLOT_SPAN)}
                          rx={3}
                          fill={colors.secondary}
                        />
                      )}
                    </>
                  )}

                  {metricMode === 'peaks' && (
                    <>
                      {bucket.peakBAC > 0 && (
                        <Rect
                          x={cx - dualBarW - barGap / 2}
                          y={SVG_PLOT_BOTTOM - (bucket.peakBAC / maxPeakBAC) * PLOT_SPAN}
                          width={dualBarW}
                          height={Math.max(3, (bucket.peakBAC / maxPeakBAC) * PLOT_SPAN)}
                          rx={3}
                          fill="#F59E0B"
                        />
                      )}
                      {bucket.peakTHC > 0 && (
                        <Rect
                          x={cx + barGap / 2}
                          y={SVG_PLOT_BOTTOM - (bucket.peakTHC / maxPeakTHC) * PLOT_SPAN}
                          width={dualBarW}
                          height={Math.max(3, (bucket.peakTHC / maxPeakTHC) * PLOT_SPAN)}
                          rx={3}
                          fill={colors.success}
                        />
                      )}
                    </>
                  )}

                  {metricMode === 'calories' && bucket.calories > 0 && (
                    <Rect
                      x={cx - singleBarW / 2}
                      y={SVG_PLOT_BOTTOM - (bucket.calories / maxCalories) * PLOT_SPAN}
                      width={singleBarW}
                      height={Math.max(3, (bucket.calories / maxCalories) * PLOT_SPAN)}
                      rx={3}
                      fill={colors.warning}
                    />
                  )}

                  {showLabel && (
                    <SvgText
                      x={cx}
                      y={SVG_HEIGHT - 6}
                      fill={isSelected ? colors.text : colors.textSecondary}
                      fontSize="10"
                      fontFamily="System"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      textAnchor="middle"
                    >
                      {bucket.label}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Interactive Tap Overlay for Buckets */}
          <View style={styles.bucketTapRow}>
            {analytics.buckets.map((bucket) => (
              <TouchableOpacity
                key={`tap-${bucket.key}`}
                style={styles.bucketTapCell}
                onPress={() =>
                  setSelectedBucketKey((prev) =>
                    prev === bucket.key ? null : bucket.key
                  )
                }
              />
            ))}
          </View>

          {selectedBucket ? (
            <View style={styles.bucketReadout}>
              <Text style={styles.bucketReadoutTitle}>{selectedBucket.label}</Text>
              <Text style={styles.bucketReadoutMeta}>
                {selectedBucket.drinks} drinks · {selectedBucket.thcMg}mg THC · {selectedBucket.calories} kcal · Peak {selectedBucket.peakBAC.toFixed(3)} / {selectedBucket.peakTHC}mg
              </Text>
            </View>
          ) : (
            <Text style={styles.chartHint}>Tap any bar group to inspect &amp; project that span</Text>
          )}
        </View>

        {/* Combined Projection Curve */}
        {projectionSpan && (
          <View style={styles.projectionSection}>
            <View style={styles.projectionHeader}>
              <Text style={styles.sectionTitle}>Combined Projection</Text>
              <Text style={styles.projectionSub}>{projectionSpan.label}</Text>
            </View>
            <BurndownChart
              consumptionsOverride={projectionSpan.consumptions}
              startTimeOverride={projectionSpan.startTime}
              fixedTimeWindowHours={projectionSpan.fixedTimeWindowHours}
              hideTimeToggles={true}
              chartWidthOverride={Math.max(280, windowWidth - 40)}
            />
          </View>
        )}

        {/* Top Consumables */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Top Consumables</Text>
          {analytics.topConsumables.length === 0 ? (
            <Text style={styles.emptyText}>No items logged in this period.</Text>
          ) : (
            analytics.topConsumables.slice(0, 6).map((item) => {
              const itemColor = getConsumableColor(item);
              const detailText =
                item.type === 'alcohol'
                  ? `${item.totalDrinks} std drinks`
                  : `${item.totalTHCMg}mg THC`;
              return (
                <View key={item.key} style={styles.topRow}>
                  <View
                    style={[
                      styles.topIconCircle,
                      { backgroundColor: withAlpha(itemColor, 0.12) },
                    ]}
                  >
                    <EntryIcon
                      iconString={
                        item.emoji ||
                        (item.type === 'alcohol' ? 'Ionicons:beer-outline' : 'Ionicons:leaf-outline')
                      }
                      size={18}
                      color={itemColor}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topName}>{item.name}</Text>
                    <Text style={styles.topMeta}>
                      {detailText}
                      {item.totalCalories > 0 ? ` · ${item.totalCalories} kcal` : ''}
                    </Text>
                  </View>
                  <Text style={styles.topCount}>×{item.count}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Sessions in Period */}
        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Sessions in Period</Text>
          {analytics.sessions.length === 0 ? (
            <Text style={styles.emptyText}>No sessions recorded in this period.</Text>
          ) : (
            analytics.sessions.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.sessionLinkRow}
                onPress={() => navigation.navigate('SessionDetail', { session: s })}
              >
                <View>
                  <Text style={styles.sessionLinkDate}>{formatSessionTime(s.startTime)}</Text>
                  <Text style={styles.sessionLinkMeta}>
                    {s.endTime === null ? 'Active Session' : 'Tap to inspect curve & logs'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))
          )}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  header: {
    ...typography.h1,
    fontSize: 28,
    color: colors.text,
  },
  sliceGroup: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
  },
  sliceBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sliceBtnActive: {
    backgroundColor: colors.primary,
  },
  sliceText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  sliceTextActive: {
    color: colors.background,
  },
  periodStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 16,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodLabel: {
    ...typography.body,
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  kpiCard: {
    width: '48.2%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
  },
  kpiLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  kpiValue: {
    ...typography.h2,
    fontSize: 24,
    color: colors.text,
  },
  kpiSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  vibeStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  vibeCol: {
    flex: 1.4,
  },
  vibeColSmall: {
    flex: 0.9,
    alignItems: 'flex-end',
  },
  vibeDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 12,
  },
  vibeLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  vibeValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
  },
  sectionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.h2,
    fontSize: 18,
    color: colors.text,
  },
  metricTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 2,
  },
  metricBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  metricBtnActive: {
    backgroundColor: 'rgba(187, 134, 252, 0.22)',
  },
  metricText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  metricTextActive: {
    color: colors.primary,
  },
  bucketTapRow: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    height: SVG_HEIGHT,
    flexDirection: 'row',
  },
  bucketTapCell: {
    flex: 1,
    height: '100%',
  },
  bucketReadout: {
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
  },
  bucketReadoutTitle: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  bucketReadoutMeta: {
    ...typography.caption,
    color: colors.text,
  },
  chartHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  projectionSection: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingTop: 16,
    paddingBottom: 6,
    marginBottom: 16,
    overflow: 'hidden',
  },
  projectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  projectionSub: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  topIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  topName: {
    ...typography.body,
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  topMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  topCount: {
    ...typography.body,
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  sessionLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sessionLinkDate: {
    ...typography.body,
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  sessionLinkMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
