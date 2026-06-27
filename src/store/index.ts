import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Units = 'imperial' | 'metric';
export type Gender = 'male' | 'female' | 'other';
export type ConsumableType = 'alcohol' | 'thc';
export type IngestionMethod = 'inhaled' | 'edible';

export interface UserProfile {
  height: number;
  weight: number;
  gender: Gender;
  units: Units;
  isOnboarded: boolean;
  maxBAC: number;
  maxTHC: number;
}

export interface Consumption {
  id: string;
  type: ConsumableType;
  name: string;
  emoji?: string;
  timestamp: number;
  mood?: number;
  hunger?: number;
  calories?: number;
  durationMins?: number;
  // Alcohol
  volumeOz?: number;
  abvPercent?: number;
  // THC
  method?: IngestionMethod;
  mg?: number;
}

export interface FavoriteItem extends Omit<Consumption, 'id' | 'timestamp' | 'mood' | 'hunger'> {
  id: string;
}

interface AppState {
  profile: UserProfile;
  consumptions: Consumption[];
  favorites: FavoriteItem[];
  currentMood: number;
  currentHunger: number;
  lastCheckInTime: number;
  isQuickEntryVisible: boolean;
  
  setQuickEntryVisible: (visible: boolean) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  setCurrentState: (mood: number, hunger: number, updateCheckInTime?: boolean) => void;
  completeOnboarding: () => void;
  addConsumption: (item: Omit<Consumption, 'id'> & { id?: string }) => void;
  updateConsumption: (id: string, updates: Partial<Consumption>) => void;
  removeConsumption: (id: string) => void;
  addFavorite: (item: Omit<FavoriteItem, 'id'>) => void;
  updateFavorite: (id: string, updates: Partial<FavoriteItem>) => void;
  removeFavorite: (id: string) => void;
  moveFavorite: (fromIndex: number, toIndex: number) => void;
  moveToTopFavorite: (index: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profile: {
        height: 0,
        weight: 0,
        gender: 'other',
        units: 'imperial',
        isOnboarded: false,
        maxBAC: 0.08,
        maxTHC: 10,
      },
      currentMood: 3,
      currentHunger: 3,
      lastCheckInTime: 0,
      isQuickEntryVisible: false,
      consumptions: [],
      favorites: [
        { id: 'fav1', type: 'alcohol', name: 'Wine (5oz, 12%)', emoji: 'Ionicons:wine', volumeOz: 5, abvPercent: 12, durationMins: 45 },
        { id: 'fav2', type: 'alcohol', name: 'Standard Drink (12oz, 5%)', emoji: 'Ionicons:beer-outline', volumeOz: 12, abvPercent: 5, durationMins: 45 },
        { id: 'fav3', type: 'thc', name: 'Standard Joint (10mg)', emoji: 'FontAwesome5:wind', method: 'inhaled', mg: 10, durationMins: 0 },
        { id: 'fav4', type: 'thc', name: '1 Puff (2mg)', emoji: 'FontAwesome5:wind', method: 'inhaled', mg: 2, durationMins: 0 },
        { id: 'fav5', type: 'thc', name: 'Gummy (10mg)', emoji: 'FontAwesome5:cookie-bite', method: 'edible', mg: 10, durationMins: 0 },
      ],

      setProfile: (newProfile) =>
        set((state) => ({ profile: { ...state.profile, ...newProfile } })),
        
      setQuickEntryVisible: (visible) =>
        set({ isQuickEntryVisible: visible }),
      
      setCurrentState: (mood, hunger, updateCheckInTime = true) => 
        set((state) => ({ 
          currentMood: mood, 
          currentHunger: hunger,
          lastCheckInTime: updateCheckInTime ? Date.now() : state.lastCheckInTime
        })),
        
      completeOnboarding: () =>
        set((state) => ({ profile: { ...state.profile, isOnboarded: true } })),
        
      addConsumption: (item) =>
        set((state) => ({
          consumptions: [
            ...state.consumptions,
            { 
              ...item, 
              id: item.id || Math.random().toString(36).substr(2, 9), 
              timestamp: item.timestamp ?? Date.now(),
              mood: item.mood ?? state.currentMood,
              hunger: item.hunger ?? state.currentHunger
            },
          ],
        })),

      updateConsumption: (id, updates) =>
        set((state) => ({
          consumptions: state.consumptions.map(c => 
            c.id === id ? { ...c, ...updates } : c
          )
        })),

      removeConsumption: (id) =>
        set((state) => ({
          consumptions: state.consumptions.filter(c => c.id !== id)
        })),
        
      addFavorite: (item) =>
        set((state) => ({
          favorites: [
            ...state.favorites,
            { ...item, id: Math.random().toString(36).substr(2, 9) },
          ],
        })),

      updateFavorite: (id, updates) =>
        set((state) => ({
          favorites: state.favorites.map(f => 
            f.id === id ? { ...f, ...updates } : f
          )
        })),
          
      removeFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== id),
        })),
          
      moveFavorite: (fromIndex, toIndex) =>
        set((state) => {
          const newFavs = [...state.favorites];
          const [movedItem] = newFavs.splice(fromIndex, 1);
          newFavs.splice(toIndex, 0, movedItem);
          return { favorites: newFavs };
        }),

      moveToTopFavorite: (index) =>
        set((state) => {
          if (index === 0) return state;
          const newFavs = [...state.favorites];
          const [movedItem] = newFavs.splice(index, 1);
          newFavs.unshift(movedItem);
          return { favorites: newFavs };
        }),
    }),
    {
      name: 'tracker-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
