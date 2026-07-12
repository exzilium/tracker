import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../theme';

interface Props {
  tensionPercent: number;
}

const AstronautGraphic = React.memo(({ tensionPercent }: Props) => {
  let color = colors.textSecondary; // Slack (Gray)
  let size = 64;

  if (tensionPercent < 20) {
    color = colors.textSecondary;
  } else if (tensionPercent < 85) {
    color = colors.success; // Taut (Green)
  } else if (tensionPercent < 100) {
    color = colors.warning; // High Tension (Orange)
  } else {
    color = colors.error; // Critical (Red)
  }

  return (
    <View style={styles.container}>
      <FontAwesome5 name="user-astronaut" size={size} color={color} />
    </View>
  );
});

export default AstronautGraphic;

const styles = StyleSheet.create({
  container: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  }
});
