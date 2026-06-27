import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';
import { useAppStore, Consumption, ConsumableType } from '../store';
import { colors, typography } from '../theme';

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

  useEffect(() => {
    if (consumption) {
      setEditName(consumption.name);
      setEditEmoji(consumption.emoji || (consumption.type === 'alcohol' ? '🍺' : '🍃'));
      setEditDuration((consumption.durationMins || 0).toString());
      setEditCalories(consumption.calories ? consumption.calories.toString() : '');
      
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
            <View style={{flex: 1, marginRight: 8}}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor={colors.textSecondary}
                value={editName}
                onChangeText={setEditName}
              />
            </View>
            <View style={{width: 60}}>
              <Text style={styles.inputLabel}>Emoji</Text>
              <TextInput
                style={[styles.input, { textAlign: 'center' }]}
                placeholder="Emoji"
                placeholderTextColor={colors.textSecondary}
                value={editEmoji}
                onChangeText={setEditEmoji}
                maxLength={2}
              />
            </View>
          </View>

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
  }
});
