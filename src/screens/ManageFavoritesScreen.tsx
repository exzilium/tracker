import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, FavoriteItem, ConsumableType } from '../store';
import { colors, typography } from '../theme';
import EntryIcon from '../components/EntryIcon';
import { AppAlert } from '../utils/AppAlert';

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

export default function ManageFavoritesScreen({ navigation, route }: any) {
  const { favorites, removeFavorite, moveFavorite, moveToTopFavorite, updateFavorite, setQuickEntryVisible } = useAppStore();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingFav, setEditingFav] = useState<FavoriteItem | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editAbv, setEditAbv] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editCalories, setEditCalories] = useState('');

  const handleRemove = (id: string, name: string) => {
    AppAlert(
      "Remove Favorite",
      `Are you sure you want to delete ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => removeFavorite(id) }
      ]
    );
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) moveFavorite(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index < favorites.length - 1) moveFavorite(index, index + 1);
  };
  
  const handleMoveToTop = (index: number) => {
    moveToTopFavorite(index);
  };

  const openEditModal = (fav: FavoriteItem) => {
    setEditingFav(fav);
    setEditName(fav.name);
    setEditEmoji(fav.emoji || (fav.type === 'alcohol' ? '🍺' : '🍃'));
    setEditDuration((fav.durationMins || 0).toString());
    setEditCalories(fav.calories ? fav.calories.toString() : '');
    
    if (fav.type === 'alcohol') {
      setEditAmount(fav.volumeOz ? fav.volumeOz.toString() : '');
      setEditAbv(fav.abvPercent ? fav.abvPercent.toString() : '');
    } else {
      setEditAmount(fav.mg ? fav.mg.toString() : '');
    }
    
    setEditModalVisible(true);
  };

  const saveEdit = () => {
    if (!editingFav) return;
    
    const amount = parseFloat(editAmount) || 0;
    const updates: Partial<FavoriteItem> = {
      name: editName,
      emoji: editEmoji,
      durationMins: editingFav.type === 'alcohol' ? (parseFloat(editDuration) || 0) : 0,
      calories: parseFloat(editCalories) || undefined,
    };
    
    if (editingFav.type === 'alcohol') {
      updates.volumeOz = amount;
      updates.abvPercent = parseFloat(editAbv) || 0;
    } else {
      updates.mg = amount;
    }
    
    updateFavorite(editingFav.id, updates);
    setEditModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          navigation.goBack();
          if (route.params?.returnToQuickEntry) {
            setQuickEntryVisible(true);
          }
        }} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manage Favorites</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Reorder or delete your custom Quick Entry options.</Text>
        
        {favorites.length === 0 ? (
          <Text style={styles.emptyText}>You have no favorites saved.</Text>
        ) : (
          favorites.map((fav, index) => (
            <View key={fav.id} style={styles.favItem}>
              <View style={styles.favDetailsRow}>
                <Text style={styles.favNumber}>{index + 1}.</Text>
                
                <View style={styles.favIconWrapper}>
                  <EntryIcon iconString={fav.emoji} size={32} color={colors.text} />
                </View>
                
                <View style={styles.favDetails}>
                  <Text style={styles.favName}>{fav.name}</Text>
                  {fav.type === 'alcohol' ? (
                    <Text style={styles.favDesc}>{fav.volumeOz}oz • {fav.abvPercent}% ABV</Text>
                  ) : (
                    <Text style={styles.favDesc}>{fav.mg}mg THC</Text>
                  )}
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={[styles.iconBtn, index === 0 && styles.iconBtnDisabled]} 
                  onPress={() => handleMoveToTop(index)}
                  disabled={index === 0}
                >
                  <Text style={styles.iconBtnText}>⇈</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.iconBtn, index === 0 && styles.iconBtnDisabled]} 
                  onPress={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  <Text style={styles.iconBtnText}>↑</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.iconBtn, index === favorites.length - 1 && styles.iconBtnDisabled]} 
                  onPress={() => handleMoveDown(index)}
                  disabled={index === favorites.length - 1}
                >
                  <Text style={styles.iconBtnText}>↓</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.iconBtn} 
                  onPress={() => openEditModal(fav)}
                >
                  <Text style={styles.iconBtnText}>✎</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.iconBtn, styles.deleteBtn]} 
                  onPress={() => handleRemove(fav.id, fav.name)}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit Favorite Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Edit Favorite</Text>

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

              <Text style={styles.inputLabel}>Select Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 16}}>
                {(editingFav?.type === 'alcohol' ? ALCOHOL_ICONS : THC_ICONS).map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.iconPickerBtn, editEmoji === icon && styles.iconPickerBtnActive]}
                    onPress={() => setEditEmoji(icon)}
                  >
                    <EntryIcon iconString={icon} size={24} color={editEmoji === icon ? colors.background : colors.text} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {editingFav?.type === 'alcohol' ? (
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
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={saveEdit}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
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
    marginBottom: 16,
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  favItem: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  favDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  favIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  favDetails: {
    flex: 1,
  },
  favName: {
    ...typography.body,
    color: colors.text,
    fontWeight: 'bold',
  },
  favDesc: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.3,
  },
  iconBtnText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteBtn: {
    backgroundColor: 'rgba(207, 102, 121, 0.2)',
  },
  deleteBtnText: {
    color: colors.error,
    fontWeight: 'bold',
    fontSize: 16,
  },
  favNumber: {
    ...typography.body,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginRight: 12,
  },
  favIconWrapper: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
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
