import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, PanResponder } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { useAppStore } from '../store';
import { getCurrentLevels } from '../utils/currentLevels';
import { colors, typography } from '../theme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width;
const CHART_HEIGHT = 220;

const formatTime = (ts: number, showMins = false) => {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  
  if (!showMins && m === 0) return `${h} ${ampm}`;
  const mStr = m < 10 ? `0${m}` : m;
  return `${h}:${mStr} ${ampm}`;
};

interface BurndownChartProps {
  consumptionsOverride?: any[];
  startTimeOverride?: number;
  lastRefreshed?: number;
  fixedTimeWindowHours?: number;
  hideTimeToggles?: boolean;
}

export default function BurndownChart({ consumptionsOverride, startTimeOverride, lastRefreshed, fixedTimeWindowHours, hideTimeToggles }: BurndownChartProps) {
  const storeConsumptions = useAppStore(state => state.consumptions);
  const profile = useAppStore(state => state.profile);
  
  const consumptions = consumptionsOverride || storeConsumptions;
  const [timeWindowHours, setTimeWindowHours] = useState(8);
  const activeTimeWindowHours = fixedTimeWindowHours || timeWindowHours;

  const chartStartTime = useMemo(() => {
    if (startTimeOverride) return startTimeOverride;
    
    const targetConsumptions = consumptionsOverride || storeConsumptions;
    // Find the oldest active log to use as session start
    const activeLogs = targetConsumptions.filter(c => Date.now() - c.timestamp < 12 * 60 * 60 * 1000);
    if (activeLogs.length > 0) {
      const oldest = Math.min(...activeLogs.map(c => c.timestamp));
      const paddingMins = activeTimeWindowHours <= 2 ? 15 : 30;
      return oldest - (paddingMins * 60 * 1000);
    }
    
    // No active session, default to 1 hour ago
    return Date.now() - (60 * 60 * 1000);
  }, [startTimeOverride, storeConsumptions, consumptionsOverride, activeTimeWindowHours]);

  const [scrubIdx, setScrubIdx] = useState<number | null>(null);

  useEffect(() => {
    setScrubIdx(null);
  }, [activeTimeWindowHours]);

  const maxBAC = profile.maxBAC || 0.08;
  const maxTHC = profile.maxTHC || 10;

  // Generate data points for the selected time window (in 5 minute increments)
  const chartData = useMemo(() => {
    const bacPoints = [];
    const thcPoints = [];
    const now = chartStartTime;
    
    const totalMinutes = activeTimeWindowHours * 60;
    const numPoints = totalMinutes / 5;

    for (let i = 0; i <= numPoints; i++) {
      const targetTime = chartStartTime + (i * 5 * 60 * 1000);
      const levels = getCurrentLevels(consumptions, profile, targetTime);
      bacPoints.push(levels.currentBAC);
      thcPoints.push(levels.currentTHC);
    }
    return { bacPoints, thcPoints, numPoints, now };
  }, [consumptions, profile, activeTimeWindowHours, chartStartTime]);

  const { bacPoints, thcPoints, numPoints, now } = chartData;
  
  const highestBAC = Math.max(...bacPoints, maxBAC);
  const highestTHC = Math.max(...thcPoints, maxTHC);

  const stepX = CHART_WIDTH / numPoints;
  
  const { bacPathD, thcPathD, limitBacY, limitThcY, midBacY, midThcY } = useMemo(() => {
    const getBacY = (val: number) => Math.max(0, CHART_HEIGHT - (val / highestBAC) * CHART_HEIGHT);
    const getThcY = (val: number) => Math.max(0, CHART_HEIGHT - (val / highestTHC) * CHART_HEIGHT);

    const bPath = `M0,${getBacY(bacPoints[0])} ` + bacPoints.map((val, i) => `L${i * stepX},${getBacY(val)}`).join(' ');
    const tPath = `M0,${getThcY(thcPoints[0])} ` + thcPoints.map((val, i) => `L${i * stepX},${getThcY(val)}`).join(' ');

    return {
      bacPathD: bPath,
      thcPathD: tPath,
      limitBacY: Math.max(0, CHART_HEIGHT - (maxBAC / highestBAC) * CHART_HEIGHT),
      limitThcY: Math.max(0, CHART_HEIGHT - (maxTHC / highestTHC) * CHART_HEIGHT),
      midBacY: getBacY(highestBAC / 2),
      midThcY: getThcY(highestTHC / 2)
    };
  }, [bacPoints, thcPoints, highestBAC, highestTHC, maxBAC, maxTHC, stepX]);

  const realNow = lastRefreshed || Date.now();
  const currentDiffMins = (realNow - now) / 60000;
  const nowX = (currentDiffMins / 5) * stepX;

  // Generate Grid Lines
  const { gridLines, labels } = useMemo(() => {
    const grids = [];
    const lbls = [];
    let minorTickInterval = 60; // mins
    if (activeTimeWindowHours <= 1) minorTickInterval = 15;
    else if (activeTimeWindowHours <= 4) minorTickInterval = 30;
    else if (activeTimeWindowHours <= 8) minorTickInterval = 60;
    else if (activeTimeWindowHours <= 12) minorTickInterval = 120; // 2 hours
    else minorTickInterval = 240; // 4 hours

    const currentMinutes = new Date(now).getMinutes();
    const minutesToFirstTick = (minorTickInterval - (currentMinutes % minorTickInterval)) % minorTickInterval;
    const totalMinutes = activeTimeWindowHours * 60;

    for (let m = minutesToFirstTick; m <= totalMinutes; m += minorTickInterval) {
      const tickTime = now + (m * 60000);
      const d = new Date(tickTime);
      const isHour = d.getMinutes() === 0;
      
      const x = (m / 5) * stepX;

      grids.push(
        <SvgLine 
          key={`grid-${m}`}
          x1={x} y1={0} x2={x} y2={CHART_HEIGHT}
          stroke={isHour ? colors.textSecondary : colors.surface}
          strokeWidth={isHour ? 1 : 0.5}
          strokeOpacity={isHour ? 0.5 : 0.3}
          strokeDasharray={!isHour ? "2,2" : undefined}
        />
      );

      const shouldShowLabel = 
        (activeTimeWindowHours <= 4 && (m % 60 === 0)) ||
        (activeTimeWindowHours > 4 && activeTimeWindowHours <= 12 && (m % 120 === 0)) ||
        (activeTimeWindowHours > 12 && (m % 240 === 0));

      if (shouldShowLabel && x > 35 && x < CHART_WIDTH - 35) {
        lbls.push(
          <SvgText
            key={`label-${m}`}
            x={x}
            y={CHART_HEIGHT + 15}
            fill={colors.textSecondary}
            fontSize="10"
            fontFamily="System"
            textAnchor="middle"
          >
            {formatTime(tickTime, false)}
          </SvgText>
        );
      }
    }
    return { gridLines: grids, labels: lbls };
  }, [now, activeTimeWindowHours, stepX]);

  const handleScrub = (x: number) => {
    let idx = Math.round(x / stepX);
    if (idx < 0) idx = 0;
    if (idx > numPoints) idx = numPoints;
    setScrubIdx(idx);
  };

  const handleScrubRef = useRef(handleScrub);
  const setScrubIdxRef = useRef(setScrubIdx);

  useEffect(() => {
    handleScrubRef.current = handleScrub;
    setScrubIdxRef.current = setScrubIdx;
  });

  // PanResponder for Scrubbing
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        handleScrubRef.current(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        handleScrubRef.current(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        setScrubIdxRef.current(null);
      },
      onPanResponderTerminate: () => {
        setScrubIdxRef.current(null);
      }
    })
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Projection</Text>
        {!hideTimeToggles && (
          <View style={styles.toggleGroup}>
            {[2, 4, 8, 12, 16].map(hrs => (
              <TouchableOpacity 
                key={hrs}
                style={[styles.toggleBtn, timeWindowHours === hrs && styles.toggleBtnActive]}
                onPress={() => setTimeWindowHours(hrs)}
              >
                <Text style={[styles.toggleText, timeWindowHours === hrs && styles.toggleTextActive]}>
                  {hrs}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 24}>
          <Defs>
            <LinearGradient id="gradBac" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#F59E0B" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="gradThc" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.success} stopOpacity="0.5" />
              <Stop offset="1" stopColor={colors.success} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          
          {gridLines}

          {/* BAC Curve */}
          <Path d={`${bacPathD} L${CHART_WIDTH},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`} fill="url(#gradBac)" />
          <Path d={bacPathD} fill="none" stroke="#F59E0B" strokeWidth={3} />
          <Path d={`M0,${limitBacY} L${CHART_WIDTH},${limitBacY}`} fill="none" stroke="#F59E0B" strokeWidth={1} strokeDasharray="5,5" opacity={0.5} />
          
          <SvgText x={10} y={Math.max(10, limitBacY - 5)} fill="#F59E0B" fontSize="10" fontFamily="System" opacity={0.8} fontWeight="bold">
            LIMIT {maxBAC.toFixed(2)}
          </SvgText>
          <SvgText x={10} y={midBacY} fill="#F59E0B" fontSize="10" fontFamily="System" opacity={0.5}>
            {(highestBAC / 2).toFixed(2)}
          </SvgText>
          <SvgText x={10} y={CHART_HEIGHT - 15} fill="#F59E0B" fontSize="10" fontFamily="System" opacity={0.5}>0</SvgText>
          
          {/* THC Curve */}
          <Path d={`${thcPathD} L${CHART_WIDTH},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`} fill="url(#gradThc)" />
          <Path d={thcPathD} fill="none" stroke={colors.success} strokeWidth={3} />
          <Path d={`M0,${limitThcY} L${CHART_WIDTH},${limitThcY}`} fill="none" stroke={colors.success} strokeWidth={1} strokeDasharray="5,5" opacity={0.5} />
          
          <SvgText x={CHART_WIDTH - 10} y={Math.max(10, limitThcY - 5)} fill={colors.success} fontSize="10" fontFamily="System" textAnchor="end" opacity={0.8} fontWeight="bold">
            LIMIT {maxTHC.toFixed(1)}mg
          </SvgText>
          <SvgText x={CHART_WIDTH - 10} y={midThcY} fill={colors.success} fontSize="10" fontFamily="System" textAnchor="end" opacity={0.5}>
            {(highestTHC / 2).toFixed(1)}mg
          </SvgText>
          <SvgText x={CHART_WIDTH - 10} y={CHART_HEIGHT - 15} fill={colors.success} fontSize="10" fontFamily="System" textAnchor="end" opacity={0.5}>0</SvgText>
          
          {labels}

          {/* Start and End labels */}
          <SvgText
            x={5}
            y={CHART_HEIGHT + 15}
            fill={colors.textSecondary}
            fontSize="10"
            fontFamily="System"
            textAnchor="start"
            fontWeight="bold"
          >
            {formatTime(now, false)}
          </SvgText>
          <SvgText
            x={CHART_WIDTH - 5}
            y={CHART_HEIGHT + 15}
            fill={colors.textSecondary}
            fontSize="10"
            fontFamily="System"
            textAnchor="end"
            fontWeight="bold"
          >
            {formatTime(now + (activeTimeWindowHours * 60 * 60 * 1000), false)}
          </SvgText>

          {/* NOW Line */}
          {nowX >= 0 && nowX <= CHART_WIDTH && (
            <SvgLine 
              x1={nowX} y1={0} x2={nowX} y2={CHART_HEIGHT}
              stroke={colors.textSecondary}
              strokeWidth={1.5}
              strokeDasharray="4,4"
            />
          )}

          {/* Scrubber Line */}
          {scrubIdx !== null && (
            <SvgLine 
              x1={scrubIdx * stepX} y1={0} x2={scrubIdx * stepX} y2={CHART_HEIGHT}
              stroke={colors.text}
              strokeWidth={1}
            />
          )}
        </Svg>
        
        {/* Invisible Overlay for Gestures */}
        <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
        
        {/* Tooltip Overlay */}
        {scrubIdx !== null && bacPoints[scrubIdx] !== undefined && thcPoints[scrubIdx] !== undefined && (
          <View pointerEvents="none" style={[
            styles.tooltip, 
            { left: Math.min((scrubIdx * stepX) - 40, CHART_WIDTH - 80) }
          ]}>
            <Text style={styles.tooltipTime}>
              {formatTime(now + (scrubIdx * 5 * 60000), true)}
            </Text>
            <Text style={[styles.tooltipVal, { color: '#F59E0B' }]}>
              BAC: {bacPoints[scrubIdx].toFixed(3)}
            </Text>
            <Text style={[styles.tooltipVal, { color: colors.success }]}>
              THC: {thcPoints[scrubIdx].toFixed(1)}mg
            </Text>
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendText}>BAC (Alcohol)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Active THC</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    marginVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: colors.background,
  },
  chartContainer: {
    height: CHART_HEIGHT + 24,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  tooltip: {
    position: 'absolute',
    top: 8,
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 8,
    borderRadius: 8,
    width: 90,
  },
  tooltipTime: {
    color: colors.text,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  tooltipVal: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  }
});
