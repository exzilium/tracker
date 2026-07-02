import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Kept for potential migrations
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';

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

export interface Session {
  id: string;
  startTime: number;
  endTime: number | null;
  mood: number;
  hunger: number;
  anxiety: number;
}

export interface Consumption {
  id: string;
  sessionId: string;
  type: ConsumableType;
  name: string;
  emoji?: string;
  timestamp: number;
  calories?: number;
  durationMins?: number;
  // Alcohol
  volumeOz?: number;
  abvPercent?: number;
  // THC
  method?: IngestionMethod;
  mg?: number;
}

export interface FavoriteItem extends Omit<Consumption, 'id' | 'sessionId' | 'timestamp'> {
  id: string;
}

interface AppState {
  profile: UserProfile;
  sessions: Session[];
  activeSessionId: string | null;
  isQuickEntryVisible: boolean;
  isStartSessionVisible: boolean;
  consumptions: Consumption[];
  favorites: FavoriteItem[];
  
  setQuickEntryVisible: (visible: boolean) => void;
  setStartSessionVisible: (visible: boolean) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  
  startSession: (mood: number, hunger: number, anxiety: number, initialConsumptions?: Omit<Consumption, 'id' | 'sessionId'>[]) => void;
  endSession: () => void;
  updateSessionState: (mood: number, hunger: number, anxiety: number) => void;
  
  addConsumption: (item: Omit<Consumption, 'id' | 'sessionId'> & { id?: string }) => void;
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
      sessions: [],
      activeSessionId: null,
      isQuickEntryVisible: false,
      isStartSessionVisible: false,
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
        
      setStartSessionVisible: (visible) =>
        set({ isStartSessionVisible: visible }),
        
      completeOnboarding: () =>
        set((state) => ({ profile: { ...state.profile, isOnboarded: true } })),
        
      startSession: (mood, hunger, anxiety, initialConsumptions) => 
        set((state) => {
          const sessionId = Math.random().toString(36).substr(2, 9);
          const newSession: Session = {
            id: sessionId,
            startTime: Date.now(),
            endTime: null,
            mood,
            hunger,
            anxiety
          };
          
          let newConsumptions = [...state.consumptions];
          if (initialConsumptions && initialConsumptions.length > 0) {
            const mappedConsumptions = initialConsumptions.map(c => ({
              ...c,
              id: Math.random().toString(36).substr(2, 9),
              sessionId,
              timestamp: c.timestamp ?? Date.now()
            }));
            newConsumptions = [...newConsumptions, ...mappedConsumptions];
          }
          
          return {
            sessions: [...state.sessions, newSession],
            activeSessionId: sessionId,
            consumptions: newConsumptions
          };
        }),
        
      endSession: () => 
        set((state) => {
          if (!state.activeSessionId) return state;
          return {
            sessions: state.sessions.map(s => 
              s.id === state.activeSessionId ? { ...s, endTime: Date.now() } : s
            ),
            activeSessionId: null
          };
        }),
        
      updateSessionState: (mood, hunger, anxiety) =>
        set((state) => {
          if (!state.activeSessionId) return state;
          return {
            sessions: state.sessions.map(s =>
              s.id === state.activeSessionId ? { ...s, mood, hunger, anxiety } : s
            )
          };
        }),
        
      addConsumption: (item) =>
        set((state) => {
          if (!state.activeSessionId) return state; // Must have an active session!
          return {
            consumptions: [
              ...state.consumptions,
              { 
                ...item, 
                id: item.id || Math.random().toString(36).substr(2, 9), 
                sessionId: state.activeSessionId,
                timestamp: item.timestamp ?? Date.now()
              },
            ],
          };
        }),

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
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
