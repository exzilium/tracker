import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';
import { useAppStore, Consumption, ConsumableType } from '../store';
import { colors, typography } from '../theme';
import EntryIcon from './EntryIcon';
import { ScrollView } from 'react-native';

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

interface EditConsumptionModalProps {
  visible: boolean;
  consumption: Consumption | null;
  onClose: () => void;
}

export default function EditConsumptionModal({ visible, consumption, onClose }: EditConsumptionModalProps) {
  const { updateConsumption } = useAppStore();

  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editAbv, setEditAbv] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editTimestamp, setEditTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    if (consumption) {
      setEditName(consumption.name);
      setEditEmoji(consumption.emoji || (consumption.type === 'alcohol' ? '🍺' : '🍃'));
      setEditDuration((consumption.durationMins || 0).toString());
      setEditCalories(consumption.calories ? consumption.calories.toString() : '');
      setEditTimestamp(consumption.timestamp);
      
      if (consumption.type === 'alcohol') {
        setEditAmount(consumption.volumeOz ? consumption.volumeOz.toString() : '');
        setEditAbv(consumption.abvPercent ? consumption.abvPercent.toString() : '');
      } else {
        setEditAmount(consumption.mg ? consumption.mg.toString() : '');
      }
    }
  }, [consumption]);

  const handleSave = () => {
    if (!consumption) return;

    const amount = parseFloat(editAmount) || 0;
    const updates: Partial<Consumption> = {
      name: editName,
      emoji: editEmoji,
      durationMins: consumption.type === 'alcohol' ? (parseFloat(editDuration) || 0) : 0,
      calories: parseFloat(editCalories) || undefined,
      timestamp: editTimestamp,
    };

    if (consumption.type === 'alcohol') {
      updates.volumeOz = amount;
      updates.abvPercent = parseFloat(editAbv) || 0;
    } else {
      updates.mg = amount;
    }

    updateConsumption(consumption.id, updates);
    onClose();
  };

  if (!consumption) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Edit Log</Text>

          <View style={styles.inputRow}>
            <View style={{flex: 1}}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={colors.textSecondary}
                value={editName}
                onChangeText={setEditName}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Time Logged</Text>
          <View style={styles.timeShiftRow}>
            <TouchableOpacity style={styles.shiftBtn} onPress={() => setEditTimestamp(editTimestamp - (15 * 60000))}>
              <Text style={styles.shiftBtnText}>-15m</Text>
            </TouchableOpacity>
            <Text style={styles.timeText}>
              {new Date(editTimestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </Text>
            <TouchableOpacity style={styles.shiftBtn} onPress={() => setEditTimestamp(editTimestamp + (15 * 60000))}>
              <Text style={styles.shiftBtnText}>+15m</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Select Icon</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
            {(consumption.type === 'alcohol' ? ALCOHOL_ICONS : THC_ICONS).map(icon => (
              <TouchableOpacity
                key={icon}
                style={[styles.iconPickerBtn, editEmoji === icon && styles.iconPickerBtnActive]}
                onPress={() => setEditEmoji(icon)}
              >
                <EntryIcon iconString={icon} size={24} color={editEmoji === icon ? colors.background : colors.text} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {consumption.type === 'alcohol' ? (
            <>
              <View style={styles.inputRow}>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.inputLabel}>Volume (oz)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editAmount}
                    onChangeText={setEditAmount}
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.inputLabel}>ABV %</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editAbv}
                    onChangeText={setEditAbv}
                  />
                </View>
              </View>
              <View style={styles.inputRow}>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.inputLabel}>Duration (mins)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editDuration}
                    onChangeText={setEditDuration}
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.inputLabel}>Calories (est)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editCalories}
                    onChangeText={setEditCalories}
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
                  keyboardType="numeric"
                  value={editAmount}
                  onChangeText={setEditAmount}
                />
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.inputLabel}>Calories (est)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editCalories}
                  onChangeText={setEditCalories}
                />
              </View>
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 24,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
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
  timeShiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 24,
  },
  shiftBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  shiftBtnText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  timeText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  }
});
