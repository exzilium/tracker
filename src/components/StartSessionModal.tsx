import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppStore, Consumption, FavoriteItem } from '../store';
import { colors, typography } from '../theme';
import SubjectiveState from './SubjectiveState';
import EntryIcon from './EntryIcon';

export default function StartSessionModal() {
  const { startSession, favorites, isStartSessionVisible, setStartSessionVisible } = useAppStore();
  
  const [mood, setMood] = useState(3);
  const [hunger, setHunger] = useState(3);
  const [anxiety, setAnxiety] = useState(3);
  const [selectedFavorites, setSelectedFavorites] = useState<FavoriteItem[]>([]);

  const toggleFavorite = (fav: FavoriteItem) => {
    if (selectedFavorites.find(f => f.id === fav.id)) {
      setSelectedFavorites(selectedFavorites.filter(f => f.id !== fav.id));
    } else {
      setSelectedFavorites([...selectedFavorites, fav]);
    }
  };

  const handleStart = () => {
    const initialConsumptions: Omit<Consumption, 'id' | 'sessionId'>[] = selectedFavorites.map(f => ({
      type: f.type,
      name: f.name,
      emoji: f.emoji,
      timestamp: Date.now(),
      calories: f.calories,
      durationMins: f.durationMins,
      volumeOz: f.volumeOz,
      abvPercent: f.abvPercent,
      method: f.method,
      mg: f.mg,
    }));
    
    startSession(mood, hunger, anxiety, initialConsumptions);
    setStartSessionVisible(false);
  };

  const handleCustomStart = () => {
    handleStart(); // start session with any selected favorites
    useAppStore.getState().setQuickEntryVisible(true); // then pop open the global custom item creator
  };

  return (
    <Modal visible={isStartSessionVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setStartSessionVisible(false)}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStartSessionVisible(false)} style={styles.iconButton}>
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Start Session</Text>
          <View style={styles.iconButton} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Set Your Baseline</Text>
          <Text style={styles.subtitle}>How are you feeling right now?</Text>
          
          <View style={styles.slidersContainer}>
            <SubjectiveState 
              mood={mood} onMoodChange={setMood}
              hunger={hunger} onHungerChange={setHunger}
              anxiety={anxiety} onAnxietyChange={setAnxiety}
            />
          </View>

          <Text style={styles.sectionTitle}>Initial Intake</Text>
          <Text style={styles.subtitle}>Already started? Log your first items instantly.</Text>
          
          <View style={styles.favoritesGrid}>
            {favorites.map((fav) => {
              const isSelected = !!selectedFavorites.find(f => f.id === fav.id);
              return (
                <TouchableOpacity 
                  key={fav.id} 
                  style={[styles.favItem, isSelected && styles.favItemActive]}
                  onPress={() => toggleFavorite(fav)}
                >
                  <View style={styles.favEmojiContainer}>
                    <EntryIcon iconString={fav.emoji || (fav.type === 'alcohol' ? '🍺' : '💨')} size={32} color={isSelected ? colors.primary : colors.text} />
                  </View>
                  <Text style={[styles.favName, isSelected && styles.favNameActive]} numberOfLines={2}>
                    {fav.name}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Feather name="check" size={12} color="#000" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          
          <TouchableOpacity style={styles.customBtn} onPress={handleCustomStart}>
            <Text style={styles.customBtnText}>+ Add Custom Entry</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.submitButton} onPress={handleStart}>
            <Text style={styles.submitButtonText}>Begin Session</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  iconButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    ...typography.h2,
    fontSize: 22,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  slidersContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 32,
  },
  favoritesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  favItem: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  favItemActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
  },
  favEmojiContainer: {
    marginBottom: 8,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favName: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  favNameActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    ...typography.body,
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 16,
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  customBtnText: {
    color: colors.primary,
    ...typography.body,
    fontWeight: 'bold',
  }
});
