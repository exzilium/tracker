import { create } from 'zustand';
import * as Crypto from 'expo-crypto';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandStorage } from './storage';
import { normalizeLegacyConsumableName } from '../utils/consumableMeta';
import { computeMergedSession } from '../utils/sessionMerge';

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
  lockScreenTimerEnabled?: boolean;
}

export interface Session {
  id: string;
  startTime: number;
  endTime: number | null;
  mood: number;
  hunger: number;
  anxiety: number;
  hasSubjectiveCheckIn?: boolean;
}

export interface Consumption {
  id: string;
  sessionId: string;
  type: ConsumableType;
  name: string;
  emoji?: string;
  color?: string;
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

export interface AddConsumptionOptions {
  targetSessionId?: string;
  reopenTarget?: boolean;
}

export interface AppState {
  profile: UserProfile;
  sessions: Session[];
  activeSessionId: string | null;
  isQuickEntryVisible: boolean;
  quickEntryMode: 'default' | 'custom';
  quickEntryTargetSessionId: string | null;
  isStartSessionVisible: boolean;
  consumptions: Consumption[];
  favorites: FavoriteItem[];
  
  setQuickEntryVisible: (
    visible: boolean,
    mode?: 'default' | 'custom',
    targetSessionId?: string | null
  ) => void;
  setStartSessionVisible: (visible: boolean) => void;
  setProfile: (profile: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  
  startSession: (mood: number, hunger: number, anxiety: number, initialConsumptions?: Omit<Consumption, 'id' | 'sessionId'>[], hasSubjectiveCheckIn?: boolean) => void;
  endSession: () => void;
  reopenSession: (sessionId: string) => void;
  mergeSessions: (sessionIds: string[]) => string | null;
  updateSessionState: (mood: number, hunger: number, anxiety: number) => void;
  
  addConsumption: (
    item: Omit<Consumption, 'id' | 'sessionId'> & { id?: string },
    options?: AddConsumptionOptions
  ) => void;
  updateConsumption: (id: string, updates: Partial<Consumption>) => void;
  removeConsumption: (id: string) => void;
  
  addFavorite: (item: Omit<FavoriteItem, 'id'>) => void;
  updateFavorite: (id: string, updates: Partial<FavoriteItem>) => void;
  removeFavorite: (id: string) => void;
  moveFavorite: (fromIndex: number, toIndex: number) => void;
  moveToTopFavorite: (index: number) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  height: 0,
  weight: 0,
  gender: 'other',
  units: 'imperial',
  isOnboarded: false,
  maxBAC: 0.08,
  maxTHC: 10,
  lockScreenTimerEnabled: true,
};

/**
 * Migrates persisted Zustand snapshots across store schema versions.
 * In v2, normalizes exact legacy stock consumable names (in both favorites
 * and historical logs) while preserving any user-customized brand names.
 */
export function migratePersistedState(
  persistedState: unknown,
  version: number
): Partial<AppState> {
  if (!persistedState || typeof persistedState !== 'object') {
    return {};
  }

  const raw = { ...(persistedState as Record<string, unknown>) };

  if (version < 2) {
    if (Array.isArray(raw.favorites)) {
      raw.favorites = raw.favorites.map((fav) => {
        if (!fav || typeof fav !== 'object') return fav;
        const item = fav as Record<string, unknown>;
        return typeof item.name === 'string'
          ? { ...item, name: normalizeLegacyConsumableName(item.name) }
          : item;
      });
    }

    if (Array.isArray(raw.consumptions)) {
      raw.consumptions = raw.consumptions.map((c) => {
        if (!c || typeof c !== 'object') return c;
        const item = c as Record<string, unknown>;
        return typeof item.name === 'string'
          ? { ...item, name: normalizeLegacyConsumableName(item.name) }
          : item;
      });
    }

    if (raw.profile && typeof raw.profile === 'object') {
      const prof = raw.profile as Record<string, unknown>;
      raw.profile = {
        ...prof,
        lockScreenTimerEnabled:
          typeof prof.lockScreenTimerEnabled === 'boolean'
            ? prof.lockScreenTimerEnabled
            : true,
      };
    }
  }

  return raw as Partial<AppState>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      sessions: [],
      activeSessionId: null,
      isQuickEntryVisible: false,
      quickEntryMode: 'default',
      quickEntryTargetSessionId: null,
      isStartSessionVisible: false,
      consumptions: [],
      favorites: [
        { id: 'fav1', type: 'alcohol', name: 'Wine', emoji: 'Ionicons:wine', volumeOz: 5, abvPercent: 12, durationMins: 45 },
        { id: 'fav2', type: 'alcohol', name: 'Beer', emoji: 'Ionicons:beer-outline', volumeOz: 12, abvPercent: 5, durationMins: 45 },
        { id: 'fav3', type: 'thc', name: 'Joint', emoji: 'FontAwesome5:wind', method: 'inhaled', mg: 10, durationMins: 0 },
        { id: 'fav4', type: 'thc', name: 'Puff', emoji: 'FontAwesome5:wind', method: 'inhaled', mg: 2, durationMins: 0 },
        { id: 'fav5', type: 'thc', name: 'Gummy', emoji: 'FontAwesome5:cookie-bite', method: 'edible', mg: 10, durationMins: 0 },
      ],

      setProfile: (newProfile) =>
        set((state) => ({ profile: { ...state.profile, ...newProfile } })),
        
      setQuickEntryVisible: (visible, mode, targetSessionId) =>
        set({
          isQuickEntryVisible: visible,
          quickEntryMode: visible ? (mode ?? 'default') : 'default',
          quickEntryTargetSessionId: visible ? (targetSessionId ?? null) : null,
        }),
        
      setStartSessionVisible: (visible) =>
        set({ isStartSessionVisible: visible }),
        
      completeOnboarding: () =>
        set((state) => ({ profile: { ...state.profile, isOnboarded: true } })),
        
      startSession: (mood, hunger, anxiety, initialConsumptions, hasSubjectiveCheckIn = true) => 
        set((state) => {
          const sessionId = Crypto.randomUUID();
          const now = Date.now();
          const newSession: Session = {
            id: sessionId,
            startTime: now,
            endTime: null,
            mood,
            hunger,
            anxiety,
            hasSubjectiveCheckIn,
          };
          
          let newConsumptions = [...state.consumptions];
          if (initialConsumptions && initialConsumptions.length > 0) {
            const mappedConsumptions = initialConsumptions.map(c => ({
              ...c,
              id: Crypto.randomUUID(),
              sessionId,
              timestamp: c.timestamp ?? now
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

      reopenSession: (sessionId) =>
        set((state) => {
          const target = state.sessions.find((s) => s.id === sessionId);
          if (!target) return state;
          const now = Date.now();
          return {
            sessions: state.sessions.map((s) => {
              if (s.id === sessionId) {
                return { ...s, endTime: null };
              }
              if (s.endTime === null) {
                return { ...s, endTime: now };
              }
              return s;
            }),
            activeSessionId: sessionId,
          };
        }),

      mergeSessions: (sessionIds) => {
        let mergedId: string | null = null;
        set((state) => {
          const result = computeMergedSession(
            state.sessions,
            state.consumptions,
            sessionIds,
            state.activeSessionId
          );
          mergedId = result.mergedSessionId;
          if (!result.mergedSessionId) return state;
          return {
            sessions: result.sessions,
            consumptions: result.consumptions,
            activeSessionId: result.activeSessionId,
          };
        });
        return mergedId;
      },
        
      updateSessionState: (mood, hunger, anxiety) =>
        set((state) => {
          if (!state.activeSessionId) return state;
          return {
            sessions: state.sessions.map(s =>
              s.id === state.activeSessionId
                ? { ...s, mood, hunger, anxiety, hasSubjectiveCheckIn: true }
                : s
            )
          };
        }),
        
      addConsumption: (item, options) =>
        set((state) => {
          const now = Date.now();
          const itemTimestamp = item.timestamp ?? now;
          const targetSession = options?.targetSessionId
            ? state.sessions.find((s) => s.id === options.targetSessionId)
            : undefined;

          if (targetSession) {
            const shouldReopen = Boolean(options?.reopenTarget);
            const newConsumption: Consumption = {
              ...item,
              id: item.id || Crypto.randomUUID(),
              sessionId: targetSession.id,
              timestamp: itemTimestamp,
            };

            const updatedSessions = state.sessions.map((s) => {
              if (s.id === targetSession.id) {
                const nextStart = Math.min(s.startTime, itemTimestamp);
                const nextEnd = shouldReopen
                  ? null
                  : s.endTime !== null
                    ? Math.max(s.endTime, itemTimestamp)
                    : null;
                return { ...s, startTime: nextStart, endTime: nextEnd };
              }
              if (shouldReopen && s.endTime === null) {
                return { ...s, endTime: now };
              }
              return s;
            });

            return {
              sessions: updatedSessions,
              activeSessionId: shouldReopen ? targetSession.id : state.activeSessionId,
              consumptions: [...state.consumptions, newConsumption],
            };
          }

          if (!state.activeSessionId) {
            const sessionId = Crypto.randomUUID();
            const newSession: Session = {
              id: sessionId,
              startTime: Math.min(now, itemTimestamp),
              endTime: null,
              mood: 3,
              hunger: 3,
              anxiety: 3,
              hasSubjectiveCheckIn: false,
            };
            const newConsumption: Consumption = {
              ...item,
              id: item.id || Crypto.randomUUID(),
              sessionId,
              timestamp: itemTimestamp,
            };
            return {
              sessions: [...state.sessions, newSession],
              activeSessionId: sessionId,
              consumptions: [...state.consumptions, newConsumption],
            };
          }

          const newConsumption: Consumption = {
            ...item,
            id: item.id || Crypto.randomUUID(),
            sessionId: state.activeSessionId,
            timestamp: itemTimestamp,
          };
          const activeSession = state.sessions.find((s) => s.id === state.activeSessionId);
          const needsStartExpansion = activeSession && itemTimestamp < activeSession.startTime;

          return {
            sessions: needsStartExpansion
              ? state.sessions.map((s) =>
                  s.id === state.activeSessionId
                    ? { ...s, startTime: Math.min(s.startTime, itemTimestamp) }
                    : s
                )
              : state.sessions,
            consumptions: [...state.consumptions, newConsumption],
          };
        }),

      updateConsumption: (id, updates) =>
        set((state) => {
          const existing = state.consumptions.find((c) => c.id === id);
          const nextTimestamp = updates.timestamp;
          const updatedConsumptions = state.consumptions.map(c => 
            c.id === id ? { ...c, ...updates } : c
          );

          if (
            existing &&
            typeof nextTimestamp === 'number' &&
            Number.isFinite(nextTimestamp)
          ) {
            const owningSession = state.sessions.find((s) => s.id === existing.sessionId);
            if (owningSession && nextTimestamp < owningSession.startTime) {
              return {
                consumptions: updatedConsumptions,
                sessions: state.sessions.map((s) =>
                  s.id === existing.sessionId
                    ? { ...s, startTime: Math.min(s.startTime, nextTimestamp) }
                    : s
                ),
              };
            }
          }

          return {
            consumptions: updatedConsumptions,
          };
        }),

      removeConsumption: (id) =>
        set((state) => ({
          consumptions: state.consumptions.filter(c => c.id !== id)
        })),
        
      addFavorite: (item) =>
        set((state) => {
          const newFav: FavoriteItem = {
            ...item,
            id: Crypto.randomUUID(),
          };
          return {
            favorites: [...state.favorites, newFav],
          };
        }),

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
          if (
            fromIndex < 0 ||
            fromIndex >= state.favorites.length ||
            toIndex < 0 ||
            toIndex >= state.favorites.length
          ) {
            return state;
          }
          const newFavs = [...state.favorites];
          const [movedItem] = newFavs.splice(fromIndex, 1);
          newFavs.splice(toIndex, 0, movedItem);
          return { favorites: newFavs };
        }),

      moveToTopFavorite: (index) =>
        set((state) => {
          if (index <= 0 || index >= state.favorites.length) return state;
          const newFavs = [...state.favorites];
          const [movedItem] = newFavs.splice(index, 1);
          newFavs.unshift(movedItem);
          return { favorites: newFavs };
        }),
    }),
    {
      name: 'tracker-storage',
      version: 2,
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        profile: state.profile,
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        consumptions: state.consumptions,
        favorites: state.favorites,
      }),
      migrate: migratePersistedState,
      merge: (persistedState, currentState) => {
        const typedPersisted = (persistedState as Partial<AppState>) || {};
        const sessions = Array.isArray(typedPersisted.sessions)
          ? typedPersisted.sessions
          : currentState.sessions;
        const activeSessionId =
          typeof typedPersisted.activeSessionId === 'string' &&
          sessions.some((s) => s && s.id === typedPersisted.activeSessionId)
            ? typedPersisted.activeSessionId
            : null;
        return {
          ...currentState,
          ...typedPersisted,
          activeSessionId,
          isQuickEntryVisible: false,
          quickEntryMode: 'default',
          quickEntryTargetSessionId: null,
          isStartSessionVisible: false,
          profile: {
            ...currentState.profile,
            ...(typedPersisted.profile || {}),
          },
          sessions,
          consumptions: Array.isArray(typedPersisted.consumptions) ? typedPersisted.consumptions : currentState.consumptions,
          favorites: Array.isArray(typedPersisted.favorites) ? typedPersisted.favorites : currentState.favorites,
        };
      },
    }
  )
);
