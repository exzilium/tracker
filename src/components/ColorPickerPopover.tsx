import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ConsumableType } from '../store';
import { CONSUMABLE_COLORS, colors, typography } from '../theme';
import { getConsumableColor, isValidHexColor } from '../utils/consumableMeta';

interface ColorPickerPopoverProps {
  selectedColor?: string;
  type: ConsumableType;
  onSelectColor: (hex: string | undefined) => void;
}

/**
 * Compact inline color trigger that opens a centered 4x2 pop-out swatch picker
 * matching Space Tether's dark aesthetic.
 */
export default function ColorPickerPopover({
  selectedColor,
  type,
  onSelectColor,
}: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const effectiveColor = getConsumableColor({ type, color: selectedColor });
  const activeOption = CONSUMABLE_COLORS.find((c) => c.hex === effectiveColor);
  const isDefault = !isValidHexColor(selectedColor);

  const handleChoose = (hex: string) => {
    onSelectColor(hex);
    setOpen(false);
  };

  const handleReset = () => {
    onSelectColor(undefined);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.triggerBtn}
        activeOpacity={0.75}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.triggerLabel}>Color</Text>
        <View style={[styles.triggerDot, { backgroundColor: effectiveColor }]} />
        <Feather name="chevron-down" size={14} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View
            style={styles.popoverCard}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.title}>Icon Color</Text>
            <Text style={styles.subtitle}>
              {activeOption ? activeOption.name : 'Custom'}
              {isDefault ? ' (Default)' : ''}
            </Text>

            <View style={styles.swatchGrid}>
              {CONSUMABLE_COLORS.map((option) => {
                const isSelected = effectiveColor === option.hex;
                return (
                  <View key={option.id} style={styles.swatchCell}>
                    <TouchableOpacity
                      accessibilityLabel={`Select ${option.name} color`}
                      activeOpacity={0.8}
                      style={[
                        styles.swatchCircle,
                        { backgroundColor: option.hex },
                        isSelected && styles.swatchCircleSelected,
                      ]}
                      onPress={() => handleChoose(option.hex)}
                    >
                      {isSelected && (
                        <Feather name="check" size={18} color={colors.background} />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <View style={styles.footerRow}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                <Text style={styles.resetBtnText}>Use Type Default</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneBtn} onPress={() => setOpen(false)}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  triggerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  triggerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popoverCard: {
    width: '100%',
    maxWidth: 310,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  title: {
    ...typography.h2,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  swatchCell: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  swatchCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCircleSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  resetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  resetBtnText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  doneBtnText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: 'bold',
  },
});
