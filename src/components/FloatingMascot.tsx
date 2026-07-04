import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions, Platform, Text } from 'react-native';
import { colors } from '../theme';

const { width } = Dimensions.get('window');
const STAR_COUNT = 12; // less frequent

export default function FloatingMascot() {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const starAnims = useRef([...Array(STAR_COUNT)].map(() => new Animated.Value(0))).current;
  
  // Pre-calculate random positions and sizes for stars so they don't jump on re-renders
  const starConfigs = useRef([...Array(STAR_COUNT)].map(() => ({
    size: 6 + Math.random() * 12, // smaller and more variable size (6 to 18px)
    leftOffset: (Math.random() * width) - (width / 2), // Spread evenly across full screen width
    opacityPeak: Math.random() * 0.5 + 0.5, // higher opacity to stand out
    shape: Math.random() > 0.5 ? '✦' : '✧', // 4-pointed sparkle stars
  }))).current;

  useEffect(() => {
    // Astronaut gentle float up and down
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 2500,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: Platform.OS !== 'web',
        })
      ])
    ).start();

    // Stars flowing down to simulate flying up
    starAnims.forEach((anim) => {
      const duration = 3000 + Math.random() * 3000; // slower fall
      const delay = Math.random() * 4000; // longer spawn delay
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1, 
            duration,
            useNativeDriver: Platform.OS !== 'web',
          })
        ])
      ).start();
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Render Stars */}
      {starAnims.map((anim, i) => {
        const config = starConfigs[i];
        
        return (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                left: '50%',
                marginLeft: config.leftOffset,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 200] // flow downwards
                    })
                  }
                ],
                opacity: anim.interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: [0, config.opacityPeak, config.opacityPeak, 0]
                })
              }
            ]}
          >
            <Text style={{ color: colors.primary, fontSize: config.size, fontWeight: 'bold', textAlign: 'center' }}>
              {config.shape}
            </Text>
          </Animated.View>
        );
      })}
      
      <Animated.Image 
        source={require('../../assets/icon-transparent.png')} 
        style={[
          styles.mascot,
          { transform: [{ translateY: floatAnim }] }
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  mascot: {
    width: 240,
    height: 240,
    opacity: 1,
    zIndex: 10,
  },
  star: {
    position: 'absolute',
    top: -20,
    zIndex: 1,
  }
});
