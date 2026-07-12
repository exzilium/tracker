import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { colors } from '../theme';

interface Props {
  tensionPercent: number;
}

const TetherGraphic = React.memo(({ tensionPercent }: Props) => {
  const width = Dimensions.get('window').width - 48; // Padding 24 on each side
  const height = 40;
  const centerY = height / 2;

  let graphic;

  if (tensionPercent < 20) {
    // Low Tension: Slack waveform (Blue)
    const qWidth = width / 4;
    graphic = (
      <Path
        d={`M0,${centerY} Q${qWidth / 2},${centerY - 10} ${qWidth},${centerY} T${qWidth * 2},${centerY} T${qWidth * 3},${centerY} T${width},${centerY}`}
        stroke={colors.textSecondary}
        strokeWidth="2"
        fill="none"
      />
    );
  } else if (tensionPercent < 85) {
    // Medium Tension: Straight taut line (Green)
    graphic = (
      <Line
        x1="0"
        y1={centerY}
        x2={width}
        y2={centerY}
        stroke={colors.success} // Green
        strokeWidth="3"
      />
    );
  } else if (tensionPercent < 100) {
    // High Tension: Straight with stress knot (Orange)
    const midX = width / 2;
    graphic = (
        <Path
          d={`M0,${centerY} L${midX - 15},${centerY} L${midX - 5},${centerY - 10} L${midX + 5},${centerY + 10} L${midX + 15},${centerY} L${width},${centerY}`}
          stroke={colors.warning} // Orange
          strokeWidth="4"
          fill="none"
          strokeLinejoin="round"
        />
    );
  } else {
    // Critical Tension: Broken snapped line (Red)
    const midX = width / 2;
    const gap = 20;
    graphic = (
      <>
        <Line x1="0" y1={centerY} x2={midX - gap} y2={centerY} stroke={colors.error} strokeWidth="5" />
        <Line x1={midX + gap} y1={centerY} x2={width} y2={centerY} stroke={colors.error} strokeWidth="5" />
        
        {/* Jagged sparks at the break */}
        <Path d={`M${midX - gap},${centerY} L${midX - gap + 5},${centerY - 8} L${midX - gap + 8},${centerY + 5}`} stroke={colors.error} strokeWidth="2" fill="none" />
        <Path d={`M${midX + gap},${centerY} L${midX + gap - 5},${centerY + 8} L${midX + gap - 8},${centerY - 5}`} stroke={colors.error} strokeWidth="2" fill="none" />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {graphic}
      </Svg>
    </View>
  );
});

export default TetherGraphic;

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  }
});
