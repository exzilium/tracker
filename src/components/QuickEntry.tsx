import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { useAppStore, FavoriteItem, ConsumableType } from '../store';
import { colors, typography } from '../theme';
import { scheduleHydrationReminder } from '../utils/notifications';

const CHECK_IN_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours

const MOOD_LABELS = ['1 - Horrible', '2 - Bad', '3 - Normal', '4 - Good', "5 - I'm Rollin'"];
const HUNGER_LABELS = ['1 - No mas!', '2 - Not hungry at all', '3 - Snacky', '4 - Hungry', '5 - Starving!'];

export default function QuickEntry() {
  const { favorites, addConsumption, addFavorite, lastCheckInTime, currentMood, currentHunger, setCurrentState } = useAppStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [customType, setCustomType] = useState<ConsumableType>('alcohol');
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('🍺');
  const [customAmount, setCustomAmount] = useState('');
  const [customAbv, setCustomAbv] = useState('');
  const [customDuration, setCustomDuration] = useState('45');
  const [customCalories, setCustomCalories] = useState('');
  const [customMinutesAgo, setCustomMinutesAgo] = useState('0');
  const [saveFav, setSaveFav] = useState(false);

  // Check-In Modal State
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [tempMood, setTempMood] = useState(currentMood);
  const [tempHunger, setTempHunger] = useState(currentHunger);

  const triggerCheckInIfNeeded = () => {
    const now = Date.now();
    if (now - lastCheckInTime > CHECK_IN_COOLDOWN_MS) {
      setTempMood(currentMood);
      setTempHunger(currentHunger);
      setCheckInVisible(true);
    }
  };

  const handleQuickTap = (fav: FavoriteItem) => {
    addConsumption({
      type: fav.type,
      name: fav.name,
      emoji: fav.emoji,
      volumeOz: fav.volumeOz,
      abvPercent: fav.abvPercent,
      method: fav.method,
      mg: fav.mg,
      durationMins: fav.durationMins,
      calories: fav.calories,
    });
    scheduleHydrationReminder();
    triggerCheckInIfNeeded();
  };

  const switchType = (type: ConsumableType) => {
    setCustomType(type);
    setCustomName('');
    setCustomEmoji(type === 'alcohol' ? '🍺' : '🍃');
    setCustomAmount('');
    setCustomAbv('');
    setCustomDuration(type === 'alcohol' ? '45' : '0');
    setCustomCalories('');
    setCustomMinutesAgo('0');
  };

  const applyPreset = (type: ConsumableType, name: string, emoji: string, amount: string, abvOrCals: string, duration: string) => {
    setCustomType(type);
    setCustomName(name);
    setCustomEmoji(emoji);
    setCustomDuration(duration);
    setCustomAmount(amount);
    
    if (type === 'alcohol') {
      setCustomAbv(abvOrCals);
      setCustomCalories(''); // user can estimate
    } else {
      setCustomCalories(abvOrCals);
    }
  };

  const handleCustomSave = () => {
    const isAlcohol = customType === 'alcohol';
    const amount = parseFloat(customAmount);
    const abv = parseFloat(customAbv);
    const duration = parseFloat(customDuration);
    const cals = parseFloat(customCalories);
    const minsAgo = parseFloat(customMinutesAgo) || 0;

    if (!customName || !customEmoji) {
      Alert.alert('Missing Fields', 'Please provide a name and emoji.');
      return;
    }

    if (isAlcohol) {
      if (isNaN(amount) || isNaN(abv) || isNaN(duration)) {
        Alert.alert('Missing Fields', 'Please provide volume, ABV, and duration.');
        return;
      }
    } else {
      if (isNaN(amount)) {
        Alert.alert('Missing Fields', 'Please provide THC amount in mg.');
        return;
      }
    }

    const entry = {
      type: customType,
      name: customName,
      emoji: customEmoji,
      durationMins: isAlcohol ? duration : (isNaN(duration) ? 0 : duration),
      calories: isNaN(cals) ? undefined : cals,
      ...(isAlcohol ? { volumeOz: amount, abvPercent: abv } : { method: 'edible' as const, mg: amount }),
    };

    const timestamp = Date.now() - (minsAgo * 60000);

    addConsumption({ ...entry, timestamp });

    if (saveFav) {
      addFavorite(entry);
    }

    setModalVisible(false);
    switchType('alcohol'); // reset
    setSaveFav(false);

    scheduleHydrationReminder();
    triggerCheckInIfNeeded();
  };

  const saveCheckIn = () => {
    setCurrentState(tempMood, tempHunger, true);
    setCheckInVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Entry</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {favorites.map((fav) => (
          <TouchableOpacity
            key={fav.id}
            style={styles.card}
            onPress={() => handleQuickTap(fav)}
          >
            <Text style={styles.cardIcon}>{fav.emoji || (fav.type === 'alcohol' ? '🍺' : '🍃')}</Text>
            <Text style={styles.cardTitle}>{fav.name}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[styles.card, styles.addCard]} onPress={() => setModalVisible(true)}>
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.cardTitle}>Custom</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Check-In Modal */}
      <Modal visible={checkInVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Log Added!</Text>
            <Text style={styles.modalSubtitle}>It's been a while. Anything change about your mood or hunger?</Text>
            
            <View style={styles.checkInRow}>
              <Text style={styles.checkInLabel}>Mood (1-5)</Text>
              <View style={styles.pillGroup}>
                {[1,2,3,4,5].map(val => (
                  <View key={`mood-${val}`} style={{alignItems: 'center'}}>
                    <TouchableOpacity 
                      style={[styles.pill, tempMood === val && styles.pillActive]}
                      onPress={() => setTempMood(val)}
                    >
                      <Text style={[styles.pillText, tempMood === val && styles.pillTextActive]}>{val}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <Text style={styles.pillDescText}>{MOOD_LABELS[tempMood - 1]}</Text>
            </View>

            <View style={styles.checkInRow}>
              <Text style={styles.checkInLabel}>Hunger (1-5)</Text>
              <View style={styles.pillGroup}>
                {[1,2,3,4,5].map(val => (
                  <View key={`hunger-${val}`} style={{alignItems: 'center'}}>
                    <TouchableOpacity 
                      style={[styles.pill, tempHunger === val && styles.pillActive]}
                      onPress={() => setTempHunger(val)}
                    >
                      <Text style={[styles.pillText, tempHunger === val && styles.pillTextActive]}>{val}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <Text style={styles.pillDescText}>{HUNGER_LABELS[tempHunger - 1]}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCheckInVisible(false)}>
                <Text style={styles.cancelBtnText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveCheckIn}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Entry Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Custom Entry</Text>

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

              {customType === 'alcohol' ? (
                <View style={styles.presetsRow}>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('alcohol', 'Beer', '🍺', '12', '5', '45')}>
                    <Text style={styles.presetEmoji}>🍺</Text>
                    <Text style={styles.presetText}>Beer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('alcohol', 'Wine', '🍷', '5', '12', '45')}>
                    <Text style={styles.presetEmoji}>🍷</Text>
                    <Text style={styles.presetText}>Wine</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('alcohol', 'Mixed Drink', '🍹', '8', '10', '45')}>
                    <Text style={styles.presetEmoji}>🍹</Text>
                    <Text style={styles.presetText}>Mixed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('alcohol', 'Shot', '🥃', '1.5', '40', '0')}>
                    <Text style={styles.presetEmoji}>🥃</Text>
                    <Text style={styles.presetText}>Shot</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('thc', 'Gummy (10mg)', '🍬', '10', '20', '0')}>
                    <Text style={styles.presetEmoji}>🍬</Text>
                    <Text style={styles.presetText}>10mg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('thc', 'Gummy (5mg)', '🍬', '5', '10', '0')}>
                    <Text style={styles.presetEmoji}>🍬</Text>
                    <Text style={styles.presetText}>5mg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('thc', 'Gummy (2.5mg)', '🍬', '2.5', '5', '0')}>
                    <Text style={styles.presetEmoji}>🍬</Text>
                    <Text style={styles.presetText}>2.5mg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset('thc', 'Puff (2mg)', '🌿', '2', '0', '0')}>
                    <Text style={styles.presetEmoji}>🌿</Text>
                    <Text style={styles.presetText}>Puff</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}

              <View style={styles.inputRow}>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. IPA"
                    placeholderTextColor={colors.textSecondary}
                    value={customName}
                    onChangeText={setCustomName}
                  />
                </View>
                <View style={{width: 60}}>
                  <Text style={styles.inputLabel}>Emoji</Text>
                  <TextInput
                    style={[styles.input, { textAlign: 'center' }]}
                    placeholder="Emoji"
                    placeholderTextColor={colors.textSecondary}
                    value={customEmoji}
                    onChangeText={setCustomEmoji}
                    maxLength={2}
                  />
                </View>
              </View>

              {customType === 'alcohol' ? (
                <>
                  <View style={styles.inputRow}>
                    <View style={{flex: 1, marginRight: 8}}>
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
                    <View style={{flex: 1}}>
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
                    <View style={{flex: 1, marginRight: 8}}>
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
                    <View style={{flex: 1}}>
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
                <View style={styles.inputRow}>
                  <View style={{flex: 1, marginRight: 8}}>
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
                  <View style={{flex: 1}}>
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
                <View style={{flex: 1}}>
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
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  scroll: {
    paddingLeft: 24,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  addCard: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.surface,
    borderStyle: 'dashed',
    marginRight: 48,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  addIcon: {
    fontSize: 32,
    color: colors.textSecondary,
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
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  presetBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
    minWidth: 64,
  },
  presetEmoji: {
    fontSize: 24,
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
  checkInRow: {
    marginBottom: 24,
  },
  checkInLabel: {
    ...typography.caption,
    color: colors.text,
    marginBottom: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pillGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillText: {
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  pillTextActive: {
    color: colors.background,
  },
  pillDescText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: 'bold',
  }
});
