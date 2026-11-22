import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore, FavoriteItem, Consumption, ConsumableType, IngestionMethod } from '../store';
import { colors, typography } from '../theme';
import { scheduleHydrationReminder } from '../utils/notifications';
import { AppAlert } from '../utils/AppAlert';
import { useNavigation } from '@react-navigation/native';
import EntryIcon from './EntryIcon';
import ColorPickerPopover from './ColorPickerPopover';
import ContinueSessionModal from './ContinueSessionModal';
import {
  formatConsumableSubtitle,
  getConsumableColor,
  withAlpha,
} from '../utils/consumableMeta';
import {
  findOverlappingClosedSessions,
  OverlappingSessionMatch,
} from '../utils/sessionMerge';

const ALCOHOL_ICONS = [
  'Ionicons:beer-outline',
  'Ionicons:wine',
  'FontAwesome5:cocktail',
  'FontAwesome5:glass-whiskey',
  'MaterialCommunityIcons:bottle-wine',
  'MaterialCommunityIcons:glass-tulip',
  'FontAwesome5:glass-martini',
  'Ionicons:cafe-outline'
];

const THC_ICONS = [
  'FontAwesome5:cookie-bite',
  'MaterialCommunityIcons:pine-tree-variant-outline',
  'FontAwesome5:wind',
  'MaterialCommunityIcons:candycane',
  'MaterialCommunityIcons:cupcake',
  'Ionicons:leaf-outline',
  'FontAwesome5:pills',
  'MaterialCommunityIcons:smoking'
];

interface PendingLogState {
  entry: Omit<Consumption, 'id' | 'sessionId'>;
  saveFavorite?: Omit<FavoriteItem, 'id'>;
  match: OverlappingSessionMatch;
}

export default function QuickEntry() {
  const favorites = useAppStore((state) => state.favorites);
  const sessions = useAppStore((state) => state.sessions);
  const profile = useAppStore((state) => state.profile);
  const addConsumption = useAppStore((state) => state.addConsumption);
  const addFavorite = useAppStore((state) => state.addFavorite);
  const consumptions = useAppStore((state) => state.consumptions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const isQuickEntryVisible = useAppStore((state) => state.isQuickEntryVisible);
  const quickEntryMode = useAppStore((state) => state.quickEntryMode);
  const quickEntryTargetSessionId = useAppStore((state) => state.quickEntryTargetSessionId);
  const setQuickEntryVisible = useAppStore((state) => state.setQuickEntryVisible);
  const setStartSessionVisible = useAppStore((state) => state.setStartSessionVisible);

  const targetSession = useMemo(
    () =>
      quickEntryTargetSessionId
        ? sessions.find((s) => s.id === quickEntryTargetSessionId) ?? null
        : null,
    [quickEntryTargetSessionId, sessions]
  );

  const recentSessionLogs = useMemo(() => {
    const scopeSessionId = quickEntryTargetSessionId || activeSessionId;
    if (!isQuickEntryVisible || !scopeSessionId) return [];
    const activeLogs = consumptions.filter((c) => c.sessionId === scopeSessionId);
    const uniqueLogs: Consumption[] = [];
    const seen = new Set<string>();
    const sorted = [...activeLogs].sort((a, b) => b.timestamp - a.timestamp);
    for (const log of sorted) {
      const key = `${log.type}-${log.name}-${log.volumeOz || log.mg}-${log.method || ''}-${log.color || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLogs.push(log);
      }
    }
    return uniqueLogs;
  }, [consumptions, isQuickEntryVisible, activeSessionId, quickEntryTargetSessionId]);

  const navigation = useNavigation<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingContinue, setPendingContinue] = useState<PendingLogState | null>(null);

  useEffect(() => {
    if (isQuickEntryVisible && quickEntryMode === 'custom') {
      setModalVisible(true);
    } else if (!isQuickEntryVisible) {
      setModalVisible(false);
    }
  }, [isQuickEntryVisible, quickEntryMode]);

  const [customType, setCustomType] = useState<ConsumableType>('alcohol');
  const [customMethod, setCustomMethod] = useState<IngestionMethod>('edible');
  const [isMixedMode, setIsMixedMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState(ALCOHOL_ICONS[0]);
  const [customColor, setCustomColor] = useState<string | undefined>(undefined);
  const [customAmount, setCustomAmount] = useState('');
  const [customAbv, setCustomAbv] = useState('');
  const [customDuration, setCustomDuration] = useState('45');
  const [customCalories, setCustomCalories] = useState('');
  const [customMinutesAgo, setCustomMinutesAgo] = useState('0');
  const [saveFav, setSaveFav] = useState(false);

  const closeCustomModal = () => {
    setModalVisible(false);
    if (quickEntryMode === 'custom') {
      setQuickEntryVisible(false);
    }
  };

  const commitOrPromptEntry = (
    entry: Omit<Consumption, 'id' | 'sessionId'>,
    saveFavorite?: Omit<FavoriteItem, 'id'>
  ) => {
    if (targetSession) {
      addConsumption(entry, { targetSessionId: targetSession.id });
      if (saveFavorite) addFavorite(saveFavorite);
      setModalVisible(false);
      setQuickEntryVisible(false);
      scheduleHydrationReminder();
      return;
    }

    if (!activeSessionId) {
      const matches = findOverlappingClosedSessions(
        sessions,
        consumptions,
        profile,
        entry.timestamp,
        entry
      );
      if (matches.length > 0) {
        setModalVisible(false);
        setQuickEntryVisible(false);
        setPendingContinue({
          entry,
          saveFavorite,
          match: matches[0],
        });
        return;
      }
    }

    addConsumption(entry);
    if (saveFavorite) addFavorite(saveFavorite);
    setModalVisible(false);
    setQuickEntryVisible(false);
    scheduleHydrationReminder();
  };

  const handleQuickTap = (fav: Omit<FavoriteItem, 'id'> & { id?: string }) => {
    Promise.resolve(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)).catch(() => {});
    const defaultTimestamp =
      targetSession && targetSession.endTime !== null
        ? targetSession.endTime
        : Date.now();
    commitOrPromptEntry({
      type: fav.type,
      name: fav.name,
      emoji: fav.emoji,
      color: fav.color,
      volumeOz: fav.volumeOz,
      abvPercent: fav.abvPercent,
      method: fav.method,
      mg: fav.mg,
      durationMins: fav.durationMins,
      calories: fav.calories,
      timestamp: defaultTimestamp,
    });
  };

  const handleLongPress = () => {
    setQuickEntryVisible(false);
    navigation.navigate('ManageFavorites', { returnToQuickEntry: true });
  };

  const switchType = (type: ConsumableType) => {
    setCustomType(type);
    setCustomMethod('edible');
    setIsMixedMode(false);
    setCustomName('');
    setCustomEmoji(type === 'thc' ? THC_ICONS[0] : ALCOHOL_ICONS[0]);
    setCustomColor(undefined);
    setCustomAmount('');
    setCustomAbv('');
    setCustomDuration(type === 'thc' ? '0' : '45');
    setCustomCalories('');
    setCustomMinutesAgo('0');
  };

  const applyPreset = (
    type: ConsumableType,
    name: string,
    emoji: string,
    amount: string,
    abvOrCals: string,
    duration: string,
    mixedMode = false,
    method: IngestionMethod = 'edible'
  ) => {
    setCustomType(type);
    setCustomMethod(method);
    setIsMixedMode(mixedMode);
    setCustomName(name);
    setCustomEmoji(emoji);
    setCustomColor(undefined);
    setCustomDuration(duration);
    setCustomAmount(amount);

    if (type === 'alcohol') {
      setCustomAbv(abvOrCals);
      setCustomCalories('');
    } else {
      setCustomCalories(abvOrCals);
    }
  };

  const handleCustomSave = () => {
    const isAlcohol = customType === 'alcohol';
    const isMixed = isAlcohol && isMixedMode;
    let amount = parseFloat(customAmount);
    let abv = parseFloat(customAbv);
    const duration = parseFloat(customDuration);
    const cals = parseFloat(customCalories);
    const minsAgo = Math.max(0, parseFloat(customMinutesAgo) || 0);

    if (!customName.trim() || !customEmoji) {
      AppAlert('Missing Fields', 'Please provide a name and icon.');
      return;
    }

    if (isAlcohol && !isMixed) {
      if (isNaN(amount) || amount <= 0 || isNaN(abv) || abv <= 0 || abv > 100 || isNaN(duration) || duration < 0) {
        AppAlert('Invalid Fields', 'Please provide positive volume, valid ABV (1-100%), and non-negative duration.');
        return;
      }
    } else if (isMixed) {
      if (isNaN(amount) || amount <= 0 || isNaN(duration) || duration < 0) {
        AppAlert('Invalid Fields', 'Please provide positive number of shots and non-negative duration.');
        return;
      }
      abv = isNaN(abv) || abv <= 0 ? 40 : Math.min(100, abv);
      amount = amount * 1.5; // convert shots to volume
    } else {
      if (isNaN(amount) || amount <= 0) {
        AppAlert('Invalid Fields', 'Please provide a positive THC amount in mg.');
        return;
      }
    }

    const baseEntry: Omit<FavoriteItem, 'id'> = {
      type: customType,
      name: customName.trim(),
      emoji: customEmoji,
      color: customColor,
      durationMins: isAlcohol ? Math.max(0, duration) : (isNaN(duration) || duration < 0 ? 0 : duration),
      calories: isNaN(cals) || cals < 0 ? undefined : cals,
      ...(isAlcohol ? { volumeOz: amount, abvPercent: abv } : { method: customMethod, mg: amount }),
    };

    const referenceNow =
      targetSession && targetSession.endTime !== null && minsAgo === 0
        ? targetSession.endTime
        : Date.now();
    const timestamp = referenceNow - (minsAgo * 60000);
    const favoriteToSave = saveFav ? baseEntry : undefined;

    switchType('alcohol');
    setSaveFav(false);
    commitOrPromptEntry({ ...baseEntry, timestamp }, favoriteToSave);
  };

  const activePreviewColor = getConsumableColor({ type: customType, color: customColor });
  const targetSessionLabel = targetSession
    ? new Date(targetSession.startTime).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <>
      {/* Main Quick Entry Modal */}
      <Modal
        visible={isQuickEntryVisible && !modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickEntryVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.title}>Quick Entry</Text>
              <TouchableOpacity onPress={() => setQuickEntryVisible(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {targetSessionLabel && (
              <View style={styles.targetBanner}>
                <Text style={styles.targetBannerText}>
                  Adding to session · {targetSessionLabel}
                </Text>
              </View>
            )}

            {recentSessionLogs.length > 0 && (
              <>
                <Text style={[styles.sectionHeader, { marginTop: 4 }]}>Recent in this Session</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
                  {recentSessionLogs.map((log) => {
                    const itemColor = getConsumableColor(log);
                    const subtitle = formatConsumableSubtitle(log);
                    return (
                      <TouchableOpacity
                        key={`recent-${log.id}`}
                        style={[
                          styles.card,
                          styles.recentCard,
                          { borderColor: withAlpha(itemColor, 0.45) },
                        ]}
                        onPress={() => handleQuickTap(log)}
                      >
                        <View style={{ marginBottom: 6 }}>
                          <EntryIcon iconString={log.emoji} size={30} color={itemColor} />
                        </View>
                        <Text style={styles.recentCardTitle} numberOfLines={2} adjustsFontSizeToFit>
                          {log.name}
                        </Text>
                        {!!subtitle && (
                          <Text style={styles.cardSubtitle} numberOfLines={1}>
                            {subtitle}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Favorites</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
              {favorites.map((fav) => {
                const itemColor = getConsumableColor(fav);
                const subtitle = formatConsumableSubtitle(fav);
                return (
                  <TouchableOpacity
                    key={fav.id}
                    style={styles.card}
                    onPress={() => handleQuickTap(fav)}
                    onLongPress={handleLongPress}
                  >
                    <View style={{ marginBottom: 6 }}>
                      <EntryIcon iconString={fav.emoji} size={30} color={itemColor} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {fav.name}
                    </Text>
                    {!!subtitle && (
                      <Text style={styles.cardSubtitle} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 12, marginTop: 8, marginBottom: 20 }}>
              Long press any favorite to manage
            </Text>

            <TouchableOpacity style={styles.addCustomBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.addCustomBtnText}>+ Add Custom Entry</Text>
            </TouchableOpacity>

            {!activeSessionId && !targetSession && (
              <TouchableOpacity
                style={styles.mindfulLinkBtn}
                onPress={() => {
                  setQuickEntryVisible(false);
                  setStartSessionVisible(true);
                }}
              >
                <Text style={styles.mindfulLinkText}>Want to check in on Mood &amp; Intent first?</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Entry Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCustomModal}
      >
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Custom Entry</Text>

              {targetSessionLabel && (
                <View style={styles.targetBanner}>
                  <Text style={styles.targetBannerText}>
                    Adding to session · {targetSessionLabel}
                  </Text>
                </View>
              )}

              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[styles.typeBtn, customType === 'alcohol' && styles.typeBtnActive]}
                  onPress={() => switchType('alcohol')}
                >
                  <Text style={styles.typeText}>Alcohol</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, customType === 'thc' && styles.typeBtnActive]}
                  onPress={() => switchType('thc')}
                >
                  <Text style={styles.typeText}>THC</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Presets</Text>

              {customType === 'alcohol' ? (
                <View style={styles.presetsRow}>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('alcohol', 'Beer', 'Ionicons:beer-outline', '12', '5', '45', false)}>
                    <View style={styles.presetEmoji}><EntryIcon iconString="Ionicons:beer-outline" size={24} color={colors.primary} /></View>
                    <Text style={styles.presetText}>Beer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('alcohol', 'Wine', 'Ionicons:wine', '5', '12', '45', false)}>
                    <View style={styles.presetEmoji}><EntryIcon iconString="Ionicons:wine" size={24} color={colors.primary} /></View>
                    <Text style={styles.presetText}>Wine</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('alcohol', 'Mixed', 'FontAwesome5:cocktail', '1', '40', '45', true)}>
                    <View style={styles.presetEmoji}><EntryIcon iconString="FontAwesome5:cocktail" size={24} color={colors.primary} /></View>
                    <Text style={styles.presetText}>Mixed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('alcohol', 'Shot', 'FontAwesome5:glass-whiskey', '1.5', '40', '0', false)}>
                    <View style={styles.presetEmoji}><EntryIcon iconString="FontAwesome5:glass-whiskey" size={24} color={colors.primary} /></View>
                    <Text style={styles.presetText}>Shot</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.presetsRow}>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('thc', 'Gummy', 'FontAwesome5:cookie-bite', '10', '20', '0', false, 'edible')}>
                    <View style={styles.presetEmoji}><EntryIcon iconString="FontAwesome5:cookie-bite" size={24} color={colors.secondary} /></View>
                    <Text style={styles.presetText}>10mg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('thc', 'Gummy', 'FontAwesome5:cookie-bite', '5', '10', '0', false, 'edible')}>
                    <View style={styles.presetEmoji}><EntryIcon iconString="FontAwesome5:cookie-bite" size={24} color={colors.secondary} /></View>
                    <Text style={styles.presetText}>5mg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('thc', 'Gummy', 'FontAwesome5:cookie-bite', '2.5', '5', '0', false, 'edible')}>
                    <View style={styles.presetEmoji}><EntryIcon iconString="FontAwesome5:cookie-bite" size={24} color={colors.secondary} /></View>
                    <Text style={styles.presetText}>2.5mg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('thc', 'Puff', 'FontAwesome5:wind', '2', '0', '0', false, 'inhaled')}>
                    <View style={styles.presetEmoji}><EntryIcon iconString="FontAwesome5:wind" size={24} color={colors.secondary} /></View>
                    <Text style={styles.presetText}>Puff</Text>
                  </TouchableOpacity>
                </View>
              )}

              {customType === 'thc' && (
                <>
                  <Text style={styles.inputLabel}>Ingestion Method</Text>
                  <View style={styles.typeRow}>
                    <TouchableOpacity
                      style={[styles.typeBtn, customMethod === 'edible' && styles.typeBtnActive]}
                      onPress={() => setCustomMethod('edible')}
                    >
                      <Text style={styles.typeText}>Edible</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeBtn, customMethod === 'inhaled' && styles.typeBtnActive]}
                      onPress={() => setCustomMethod('inhaled')}
                    >
                      <Text style={styles.typeText}>Inhaled</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Gummy, Wine, or Wana Sativa"
                    placeholderTextColor={colors.textSecondary}
                    value={customName}
                    onChangeText={setCustomName}
                  />
                  <Text style={styles.helperText}>
                    Product type or brand — dose is shown automatically
                  </Text>
                </View>
              </View>

              <View style={styles.iconHeaderRow}>
                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Select Icon</Text>
                <ColorPickerPopover
                  selectedColor={customColor}
                  type={customType}
                  onSelectColor={setCustomColor}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {(customType === 'thc' ? THC_ICONS : ALCOHOL_ICONS).map(icon => {
                  const isSelected = customEmoji === icon;
                  return (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconPickerBtn,
                        isSelected && { backgroundColor: activePreviewColor },
                      ]}
                      onPress={() => setCustomEmoji(icon)}
                    >
                      <EntryIcon
                        iconString={icon}
                        size={24}
                        color={isSelected ? colors.background : activePreviewColor}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {customType === 'alcohol' ? (
                isMixedMode ? (
                  <>
                    <View style={styles.inputRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel}>Number of Shots</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. 1"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={customAmount}
                          onChangeText={setCustomAmount}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Liquor ABV %</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="40"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={customAbv}
                          onChangeText={setCustomAbv}
                        />
                      </View>
                    </View>
                    <View style={styles.inputRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel}>Duration (mins)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="mins"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={customDuration}
                          onChangeText={setCustomDuration}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Calories (est)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="kcal"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={customCalories}
                          onChangeText={setCustomCalories}
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.inputRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel}>Volume (oz)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="oz"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={customAmount}
                          onChangeText={setCustomAmount}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>ABV %</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="%"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={customAbv}
                          onChangeText={setCustomAbv}
                        />
                      </View>
                    </View>
                    <View style={styles.inputRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.inputLabel}>Duration (mins)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="mins"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={customDuration}
                          onChangeText={setCustomDuration}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Calories (est)</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="kcal"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="numeric"
                          value={customCalories}
                          onChangeText={setCustomCalories}
                        />
                      </View>
                    </View>
                  </>
                )
              ) : (
                <View style={styles.inputRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.inputLabel}>Amount (mg)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="mg"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={customAmount}
                      onChangeText={setCustomAmount}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Calories (est)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="kcal"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="numeric"
                      value={customCalories}
                      onChangeText={setCustomCalories}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Consumed How Long Ago? (mins)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0 for Now"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={customMinutesAgo}
                    onChangeText={setCustomMinutesAgo}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.checkRow} onPress={() => setSaveFav(!saveFav)}>
                <View style={[styles.checkbox, saveFav && styles.checkboxActive]} />
                <Text style={styles.checkText}>Save to Favorites</Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={closeCustomModal}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleCustomSave}>
                  <Text style={styles.saveBtnText}>Log Entry</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <ContinueSessionModal
        visible={!!pendingContinue}
        match={pendingContinue?.match ?? null}
        itemName={pendingContinue?.entry.name}
        onContinue={() => {
          if (!pendingContinue) return;
          addConsumption(pendingContinue.entry, {
            targetSessionId: pendingContinue.match.session.id,
            reopenTarget: true,
          });
          if (pendingContinue.saveFavorite) {
            addFavorite(pendingContinue.saveFavorite);
          }
          scheduleHydrationReminder();
          setPendingContinue(null);
        }}
        onStartNew={() => {
          if (!pendingContinue) return;
          addConsumption(pendingContinue.entry);
          if (pendingContinue.saveFavorite) {
            addFavorite(pendingContinue.saveFavorite);
          }
          scheduleHydrationReminder();
          setPendingContinue(null);
        }}
        onCancel={() => setPendingContinue(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  scroll: {
  },
  targetBanner: {
    backgroundColor: 'rgba(187, 134, 252, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  targetBannerText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  recentCard: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  recentCardTitle: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  cardSubtitle: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 3,
  },
  addCustomBtn: {
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  addCustomBtnText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: 'bold',
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  // Modal Styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 4,
  },
  typeBtn: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
  },
  typeText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  presetBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 64,
  },
  presetEmoji: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  presetText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  helperText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  iconHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeader: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: 'bold',
  },
  iconPickerBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  iconPickerBtnActive: {
    backgroundColor: colors.primary,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
  },
  checkText: {
    color: colors.textSecondary,
    ...typography.body,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  cancelBtn: {
    padding: 16,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
  },
  saveBtnText: {
    color: colors.background,
    fontWeight: 'bold',
  },
  mindfulLinkBtn: {
    marginTop: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  mindfulLinkText: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
