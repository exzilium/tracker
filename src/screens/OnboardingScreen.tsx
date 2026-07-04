import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Animated, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, Units, Gender } from '../store';
import { colors, typography } from '../theme';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { profile, setProfile, completeOnboarding } = useAppStore();
  
  const initHeight = profile.height || 0;
  const [weightStr, setWeightStr] = useState(profile.weight ? profile.weight.toString() : '');
  const [heightCmStr, setHeightCmStr] = useState(profile.units === 'metric' && initHeight ? initHeight.toString() : '');
  const [heightFtStr, setHeightFtStr] = useState(profile.units === 'imperial' && initHeight ? Math.floor(initHeight / 12).toString() : '');
  const [heightInStr, setHeightInStr] = useState(profile.units === 'imperial' && initHeight ? (initHeight % 12).toString() : '');
  
  const isMetric = profile.units === 'metric';

  // Animation for the logo
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  // Generate static background stars
  const stars = useMemo(() => {
    const { width, height } = Dimensions.get('window');
    const starCount = 30;
    const generated = [];
    for (let i = 0; i < starCount; i++) {
      generated.push({
        id: i,
        char: Math.random() > 0.5 ? '+' : 'x',
        top: Math.random() * (height * 1.5),
        left: Math.random() * width,
        opacity: Math.random() * 0.4 + 0.1,
        size: Math.random() * 6 + 8,
      });
    }
    return generated;
  }, []);

  const handleComplete = () => {
    let finalHeight = 0;
    if (isMetric) {
      finalHeight = parseFloat(heightCmStr) || 0;
    } else {
      const ft = parseFloat(heightFtStr) || 0;
      const inc = parseFloat(heightInStr) || 0;
      finalHeight = (ft * 12) + inc;
    }

    setProfile({
      weight: parseFloat(weightStr) || 0,
      height: finalHeight,
    });
    completeOnboarding();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Background Stars */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        {stars.map((s) => (
          <Text key={s.id} style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            color: colors.textSecondary,
            opacity: s.opacity,
            fontSize: s.size,
          }}>
            {s.char}
          </Text>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.headerContainer}>
          <Animated.Image 
            source={require('../../assets/icon.png')}
            style={[styles.logo, { transform: [{ translateY: floatAnim }] }]}
            resizeMode="contain"
          />
          <Text style={styles.mainTitle}>SPACE TETHER</Text>
          <Text style={styles.subtitle}>Establish your baseline. We'll keep you tethered.</Text>
        </View>
        
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            ⚠️ IMPORTANT: This app is for entertainment purposes only and makes no medical claims. You must be 21 or older to use this application. Please drink responsibly and never drink and drive.
          </Text>
        </View>

      <View style={styles.section}>
        <Text style={styles.label}>Units</Text>
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleText, !isMetric && styles.toggleActive]}>Imperial (lbs/in)</Text>
          <Switch
            value={isMetric}
            onValueChange={(val) => setProfile({ units: val ? 'metric' : 'imperial' })}
            trackColor={{ false: colors.surface, true: colors.primary }}
            thumbColor={colors.text}
          />
          <Text style={[styles.toggleText, isMetric && styles.toggleActive]}>Metric (kg/cm)</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Weight ({isMetric ? 'kg' : 'lbs'})</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={weightStr}
          onChangeText={setWeightStr}
          placeholder="e.g. 150"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Height</Text>
        {isMetric ? (
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={heightCmStr}
            onChangeText={setHeightCmStr}
            placeholder="e.g. 175 (cm)"
            placeholderTextColor={colors.textSecondary}
          />
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextInput
              style={[styles.input, { width: '48%' }]}
              keyboardType="numeric"
              value={heightFtStr}
              onChangeText={setHeightFtStr}
              placeholder="Feet (e.g. 5)"
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              style={[styles.input, { width: '48%' }]}
              keyboardType="numeric"
              value={heightInStr}
              onChangeText={setHeightInStr}
              placeholder="Inches (e.g. 10)"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Sex (For BAC Math)</Text>
        <Text style={styles.caption}>(Used for standard Widmark BAC calculations)</Text>
        <View style={styles.row}>
          {(['male', 'female', 'other'] as Gender[]).map((g) => (
            <TouchableOpacity 
              key={g} 
              style={[styles.btnGender, profile.gender === g && styles.btnGenderActive]}
              onPress={() => setProfile({ gender: g })}
            >
              <Text style={styles.btnGenderText}>{g.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.btnPrimary} onPress={handleComplete}>
        <Text style={styles.btnPrimaryText}>I AM 21+ & AGREE</Text>
      </TouchableOpacity>
    </ScrollView>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  mainTitle: {
    ...typography.h1,
    fontSize: 32,
    color: colors.primary,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 16,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(207, 102, 121, 0.1)',
    borderWidth: 1,
    borderColor: colors.error,
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
  },
  disclaimerText: {
    color: colors.error,
    ...typography.caption,
    lineHeight: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    ...typography.body,
    color: colors.text,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
  },
  toggleText: {
    color: colors.textSecondary,
    ...typography.caption,
  },
  toggleActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  btnGender: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: colors.surface,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnGenderActive: {
    backgroundColor: colors.primary,
  },
  btnGenderText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 12,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
  },
  btnPrimaryText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
