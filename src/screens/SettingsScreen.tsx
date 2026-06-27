import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, Gender } from '../store';
import { colors, typography } from '../theme';

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { profile, setProfile } = useAppStore();

  const [weightStr, setWeightStr] = useState(profile.weight ? profile.weight.toString() : '');

  const initHeight = profile.height || 0;
  const [heightCmStr, setHeightCmStr] = useState(profile.units === 'metric' && initHeight ? initHeight.toString() : '');
  const [heightFtStr, setHeightFtStr] = useState(profile.units === 'imperial' && initHeight ? Math.floor(initHeight / 12).toString() : '');
  const [heightInStr, setHeightInStr] = useState(profile.units === 'imperial' && initHeight ? (initHeight % 12).toString() : '');

  const [bacLimitStr, setBacLimitStr] = useState(profile.maxBAC ? profile.maxBAC.toString() : '0.08');
  const [thcLimitStr, setThcLimitStr] = useState(profile.maxTHC ? profile.maxTHC.toString() : '10');

  const isMetric = profile.units === 'metric';

  const handleSave = () => {
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
      maxBAC: parseFloat(bacLimitStr) || 0.08,
      maxTHC: parseFloat(thcLimitStr) || 10,
    });

    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        <Text style={styles.sectionTitle}>Danger Limits</Text>
        <View style={styles.card}>
          <View style={styles.section}>
            <Text style={styles.label}>Custom BAC Limit</Text>
            <Text style={styles.caption}>Legal driving limit is usually 0.08</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={bacLimitStr}
              onChangeText={setBacLimitStr}
              placeholder="0.08"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Custom THC Limit (mg)</Text>
            <Text style={styles.caption}>Amount you can handle in one session</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={thcLimitStr}
              onChangeText={setThcLimitStr}
              placeholder="10"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Physical Profile</Text>
        <View style={styles.card}>
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
                placeholder="cm"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  keyboardType="numeric"
                  value={heightFtStr}
                  onChangeText={setHeightFtStr}
                  placeholder="Feet"
                  placeholderTextColor={colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  keyboardType="numeric"
                  value={heightInStr}
                  onChangeText={setHeightInStr}
                  placeholder="Inches"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Sex (For BAC Math)</Text>
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
        </View>

        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('ManageFavorites')}>
          <Text style={styles.btnSecondaryText}>MANAGE FAVORITES</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Donation')}>
          <Text style={styles.btnSecondaryText}>🍻 BUY ME A BEER</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
          <Text style={styles.btnPrimaryText}>SAVE SETTINGS</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backBtn: {
    width: 60,
  },
  backBtnText: {
    color: colors.primary,
    ...typography.body,
    fontWeight: 'bold',
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    marginTop: 8,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  section: {
    marginBottom: 20,
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
    marginBottom: 8,
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
    marginTop: 8,
    marginBottom: 40,
  },
  btnPrimaryText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  btnSecondaryText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
