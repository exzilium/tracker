import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, Platform, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, Gender, Units, Session, Consumption, FavoriteItem } from '../store';
import { colors, typography } from '../theme';
import { AppAlert } from '../utils/AppAlert';
import { KG_TO_LBS } from '../utils/currentLevels';

const MAX_BACKUP_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function sanitizeImportedData(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object') return null;
  const raw = parsed as Record<string, unknown>;

  if (!raw.profile || typeof raw.profile !== 'object') return null;
  const rawProfile = raw.profile as Record<string, unknown>;

  const weight = Number(rawProfile.weight);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 1500) return null;

  const height = Number(rawProfile.height);
  const safeHeight = Number.isFinite(height) && height >= 0 && height <= 300 ? height : 0;

  const gender: Gender =
    rawProfile.gender === 'male' || rawProfile.gender === 'female' || rawProfile.gender === 'other'
      ? rawProfile.gender
      : 'other';

  const units: Units =
    rawProfile.units === 'metric' || rawProfile.units === 'imperial'
      ? rawProfile.units
      : 'imperial';

  const maxBACNum = Number(rawProfile.maxBAC);
  const maxBAC = Number.isFinite(maxBACNum) && maxBACNum > 0 && maxBACNum <= 0.5 ? maxBACNum : 0.08;

  const maxTHCNum = Number(rawProfile.maxTHC);
  const maxTHC = Number.isFinite(maxTHCNum) && maxTHCNum > 0 && maxTHCNum <= 1000 ? maxTHCNum : 10;

  if (!Array.isArray(raw.consumptions)) return null;

  const rawSessions = Array.isArray(raw.sessions) ? raw.sessions : [];
  const sessions: Session[] = [];
  const validSessionIds = new Set<string>();

  for (const s of rawSessions) {
    if (!s || typeof s !== 'object') continue;
    const item = s as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id) continue;
    const startTime = Number(item.startTime);
    if (!Number.isFinite(startTime) || startTime <= 0) continue;
    const endTime = item.endTime === null || item.endTime === undefined ? null : Number(item.endTime);
    if (endTime !== null && (!Number.isFinite(endTime) || endTime < startTime)) continue;

    const clampScale = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : 3;
    };

    sessions.push({
      id: item.id,
      startTime,
      endTime,
      mood: clampScale(item.mood),
      hunger: clampScale(item.hunger),
      anxiety: clampScale(item.anxiety),
    });
    validSessionIds.add(item.id);
  }

  const consumptions: Consumption[] = [];
  for (const c of raw.consumptions) {
    if (!c || typeof c !== 'object') continue;
    const item = c as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id) continue;
    if (typeof item.sessionId !== 'string' || !item.sessionId) continue;
    if (item.type !== 'alcohol' && item.type !== 'thc') continue;
    if (typeof item.name !== 'string' || !item.name.trim()) continue;
    const timestamp = Number(item.timestamp);
    if (!Number.isFinite(timestamp) || timestamp <= 0) continue;

    const volumeOz = item.volumeOz !== undefined ? Number(item.volumeOz) : undefined;
    const abvPercent = item.abvPercent !== undefined ? Number(item.abvPercent) : undefined;
    const mg = item.mg !== undefined ? Number(item.mg) : undefined;
    const durationMins = item.durationMins !== undefined ? Number(item.durationMins) : undefined;
    const calories = item.calories !== undefined ? Number(item.calories) : undefined;

    consumptions.push({
      id: item.id,
      sessionId: item.sessionId,
      type: item.type,
      name: item.name.slice(0, 120),
      emoji: typeof item.emoji === 'string' ? item.emoji : undefined,
      timestamp,
      calories: calories !== undefined && Number.isFinite(calories) && calories >= 0 ? calories : undefined,
      durationMins: durationMins !== undefined && Number.isFinite(durationMins) && durationMins >= 0 ? durationMins : 0,
      volumeOz: volumeOz !== undefined && Number.isFinite(volumeOz) && volumeOz >= 0 ? volumeOz : undefined,
      abvPercent:
        abvPercent !== undefined && Number.isFinite(abvPercent) && abvPercent >= 0 && abvPercent <= 100
          ? abvPercent
          : undefined,
      method: item.method === 'inhaled' || item.method === 'edible' ? item.method : undefined,
      mg: mg !== undefined && Number.isFinite(mg) && mg >= 0 ? mg : undefined,
    });
  }

  const favorites: FavoriteItem[] = [];
  if (Array.isArray(raw.favorites)) {
    for (const f of raw.favorites) {
      if (!f || typeof f !== 'object') continue;
      const item = f as Record<string, unknown>;
      if (typeof item.id !== 'string' || !item.id) continue;
      if (item.type !== 'alcohol' && item.type !== 'thc') continue;
      if (typeof item.name !== 'string' || !item.name.trim()) continue;

      const volumeOz = item.volumeOz !== undefined ? Number(item.volumeOz) : undefined;
      const abvPercent = item.abvPercent !== undefined ? Number(item.abvPercent) : undefined;
      const mg = item.mg !== undefined ? Number(item.mg) : undefined;
      const durationMins = item.durationMins !== undefined ? Number(item.durationMins) : undefined;
      const calories = item.calories !== undefined ? Number(item.calories) : undefined;

      favorites.push({
        id: item.id,
        type: item.type,
        name: item.name.slice(0, 120),
        emoji: typeof item.emoji === 'string' ? item.emoji : undefined,
        calories: calories !== undefined && Number.isFinite(calories) && calories >= 0 ? calories : undefined,
        durationMins: durationMins !== undefined && Number.isFinite(durationMins) && durationMins >= 0 ? durationMins : 0,
        volumeOz: volumeOz !== undefined && Number.isFinite(volumeOz) && volumeOz >= 0 ? volumeOz : undefined,
        abvPercent:
          abvPercent !== undefined && Number.isFinite(abvPercent) && abvPercent >= 0 && abvPercent <= 100
            ? abvPercent
            : undefined,
        method: item.method === 'inhaled' || item.method === 'edible' ? item.method : undefined,
        mg: mg !== undefined && Number.isFinite(mg) && mg >= 0 ? mg : undefined,
      });
    }
  }

  const safeActiveSessionId =
    typeof raw.activeSessionId === 'string' && validSessionIds.has(raw.activeSessionId)
      ? raw.activeSessionId
      : null;

  return {
    profile: {
      height: safeHeight,
      weight,
      gender,
      units,
      isOnboarded: Boolean(rawProfile.isOnboarded ?? true),
      maxBAC,
      maxTHC,
    },
    sessions,
    consumptions,
    favorites,
    activeSessionId: safeActiveSessionId,
  };
}

export default function SettingsScreen({ navigation }: { navigation: { goBack: () => void; navigate: (screen: string) => void } }) {
  const insets = useSafeAreaInsets();
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);

  const [units, setUnits] = useState<Units>(profile.units);
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [weightStr, setWeightStr] = useState(profile.weight ? profile.weight.toString() : '');

  const initHeight = profile.height || 0;
  const [heightCmStr, setHeightCmStr] = useState(profile.units === 'metric' && initHeight ? initHeight.toString() : '');
  const [heightFtStr, setHeightFtStr] = useState(profile.units === 'imperial' && initHeight ? Math.floor(initHeight / 12).toString() : '');
  const [heightInStr, setHeightInStr] = useState(profile.units === 'imperial' && initHeight ? (initHeight % 12).toString() : '');

  const [bacLimitStr, setBacLimitStr] = useState(profile.maxBAC ? profile.maxBAC.toString() : '0.08');
  const [thcLimitStr, setThcLimitStr] = useState(profile.maxTHC ? profile.maxTHC.toString() : '10');

  const isMetric = units === 'metric';

  const handleToggleUnits = (nextIsMetric: boolean) => {
    const nextUnits: Units = nextIsMetric ? 'metric' : 'imperial';
    if (nextUnits === units) return;

    const currentWeight = parseFloat(weightStr);
    if (Number.isFinite(currentWeight) && currentWeight > 0) {
      const convertedWeight = nextIsMetric
        ? currentWeight / KG_TO_LBS
        : currentWeight * KG_TO_LBS;
      setWeightStr(Number(convertedWeight.toFixed(1)).toString());
    }

    if (nextIsMetric) {
      const ft = parseFloat(heightFtStr) || 0;
      const inc = parseFloat(heightInStr) || 0;
      const totalInches = ft * 12 + inc;
      if (totalInches > 0) {
        setHeightCmStr(Math.round(totalInches * 2.54).toString());
      }
    } else {
      const cm = parseFloat(heightCmStr) || 0;
      if (cm > 0) {
        const totalInches = Math.round(cm / 2.54);
        setHeightFtStr(Math.floor(totalInches / 12).toString());
        setHeightInStr((totalInches % 12).toString());
      }
    }

    setUnits(nextUnits);
  };

  // Easter Egg Logic
  const [tapCount, setTapCount] = useState(0);
  const flyAnim = useRef(new Animated.Value(0)).current;
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleLogoTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    
    if (newCount >= 5) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.timing(flyAnim, {
        toValue: -800,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        resetTimerRef.current = setTimeout(() => {
          flyAnim.setValue(0);
          setTapCount(0);
        }, 1000);
      });
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSave = () => {
    let finalHeight = 0;
    if (isMetric) {
      finalHeight = Math.max(0, parseFloat(heightCmStr) || 0);
    } else {
      const ft = Math.max(0, parseFloat(heightFtStr) || 0);
      const inc = Math.max(0, parseFloat(heightInStr) || 0);
      finalHeight = (ft * 12) + inc;
    }

    const weight = parseFloat(weightStr) || 0;
    if (!Number.isFinite(weight) || weight <= 0) {
      AppAlert('Invalid Weight', 'Please enter a valid weight. This is required for BAC calculations.');
      return;
    }

    const parsedBac = parseFloat(bacLimitStr);
    const parsedThc = parseFloat(thcLimitStr);

    setProfile({
      units,
      gender,
      weight,
      height: finalHeight,
      maxBAC: Number.isFinite(parsedBac) && parsedBac > 0 ? parsedBac : 0.08,
      maxTHC: Number.isFinite(parsedThc) && parsedThc > 0 ? parsedThc : 10,
    });

    navigation.goBack();
  };

  const exportData = async () => {
    try {
      const { profile: currentProfile, sessions, activeSessionId, consumptions, favorites } = useAppStore.getState();
      const exportPayload = {
        version: 1,
        profile: currentProfile,
        sessions,
        activeSessionId,
        consumptions,
        favorites,
      };
      const exportJson = JSON.stringify(exportPayload, null, 2);
      const filename = `space_tether_backup_${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([exportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const exportFile = new File(Paths.document, filename);
        exportFile.write(exportJson);
        
        const isSharable = await Sharing.isAvailableAsync();
        if (isSharable) {
          await Sharing.shareAsync(exportFile.uri);
        } else {
          AppAlert('Error', 'File sharing is not available on this device');
        }
      }
    } catch (e) {
      console.error(e);
      AppAlert('Error', 'Failed to export data');
    }
  };

  const importData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (asset.size && asset.size > MAX_BACKUP_SIZE_BYTES) {
        AppAlert('File Too Large', 'The selected backup file exceeds the 5MB safety limit.');
        return;
      }

      let jsonStr = '';

      if (Platform.OS === 'web') {
        if (asset.file) {
          if (asset.file.size > MAX_BACKUP_SIZE_BYTES) {
            AppAlert('File Too Large', 'The selected backup file exceeds the 5MB safety limit.');
            return;
          }
          jsonStr = await asset.file.text();
        } else {
          throw new Error('Could not read web file');
        }
      } else {
        const importedFile = new File(asset.uri);
        if (importedFile.size > MAX_BACKUP_SIZE_BYTES) {
          AppAlert('File Too Large', 'The selected backup file exceeds the 5MB safety limit.');
          return;
        }
        jsonStr = await importedFile.text();
      }

      const parsed = JSON.parse(jsonStr);
      const sanitized = sanitizeImportedData(parsed);

      if (!sanitized) {
        AppAlert('Invalid Backup', 'The selected file does not appear to be a valid Space Tether backup.');
        return;
      }

      AppAlert(
        'Confirm Import',
        'This will completely overwrite your current data with the backup. This cannot be undone. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Import', 
            style: 'destructive',
            onPress: () => {
              useAppStore.setState((current) => ({
                ...current,
                profile: sanitized.profile,
                sessions: sanitized.sessions,
                consumptions: sanitized.consumptions,
                favorites: sanitized.favorites.length > 0 ? sanitized.favorites : current.favorites,
                activeSessionId: sanitized.activeSessionId,
              }));
              setUnits(sanitized.profile.units);
              setGender(sanitized.profile.gender);
              setWeightStr(sanitized.profile.weight.toString());
              setBacLimitStr(sanitized.profile.maxBAC.toString());
              setThcLimitStr(sanitized.profile.maxTHC.toString());
              AppAlert('Success', 'Data imported successfully.');
            }
          }
        ]
      );
    } catch (e) {
      console.error(e);
      AppAlert('Error', 'Failed to read or parse the backup file.');
    }
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
                onValueChange={handleToggleUnits}
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
                  style={[styles.btnGender, gender === g && styles.btnGenderActive]}
                  onPress={() => setGender(g)}
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

        <Text style={styles.sectionTitle}>Data Management</Text>
        <View style={styles.card}>
          <Text style={styles.caption}>Space Tether stores your data completely offline. Export your data to back it up.</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1, marginTop: 0 }]} onPress={exportData}>
              <Text style={styles.btnSecondaryText}>EXPORT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSecondary, { flex: 1, marginTop: 0, borderColor: colors.warning }]} onPress={importData}>
              <Text style={[styles.btnSecondaryText, { color: colors.warning }]}>IMPORT</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
          <Text style={styles.btnPrimaryText}>SAVE SETTINGS</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={handleLogoTap} style={{ alignItems: 'center', marginTop: 40, marginBottom: 40 }}>
          <Animated.Image 
            source={require('../../assets/icon.png')}
            style={{ width: 80, height: 80, opacity: 0.3, transform: [{ translateY: flyAnim }] }}
            resizeMode="contain"
          />
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
