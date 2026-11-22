let mockUuidCounter = 0;

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `test-uuid-${++mockUuidCounter}`),
}));

jest.mock('./storage', () => {
  const mem = new Map<string, string>();
  return {
    zustandStorage: {
      getItem: (name: string) => mem.get(name) ?? null,
      setItem: (name: string, value: string) => mem.set(name, value),
      removeItem: (name: string) => mem.delete(name),
    },
  };
});

jest.mock('expo-haptics', () => ({}));
jest.mock('expo-file-system', () => ({ File: jest.fn(), Paths: { cache: '' } }));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-document-picker', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../utils/notifications', () => ({
  ensureNotificationPermission: jest.fn(async () => true),
  scheduleHydrationReminder: jest.fn(),
  registerForPushNotificationsAsync: jest.fn(),
}));

import { migratePersistedState, useAppStore } from './index';
import { sanitizeImportedData } from '../screens/SettingsScreen';
import { buildLockScreenTimerPayload } from '../utils/lockScreenTimer';

describe('Quick Start store actions & backup sanitization', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
    useAppStore.setState({
      sessions: [],
      activeSessionId: null,
      consumptions: [],
      isQuickEntryVisible: false,
      quickEntryMode: 'default',
      quickEntryTargetSessionId: null,
      isStartSessionVisible: false,
    });
  });

  it('auto-creates a Quick Start session when addConsumption is called while idle', () => {
    const itemTs = Date.now();
    useAppStore.getState().addConsumption({
      type: 'thc',
      name: 'Gummy',
      method: 'edible',
      mg: 10,
      durationMins: 0,
      timestamp: itemTs,
    });

    const state = useAppStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.activeSessionId).toBe(state.sessions[0].id);
    expect(state.sessions[0].hasSubjectiveCheckIn).toBe(false);
    expect(state.sessions[0].mood).toBe(3);
    expect(state.sessions[0].hunger).toBe(3);
    expect(state.sessions[0].anxiety).toBe(3);
    expect(state.consumptions).toHaveLength(1);
    expect(state.consumptions[0].sessionId).toBe(state.activeSessionId);
  });

  it('uses backdated consumption timestamp as session startTime when earlier than now', () => {
    const backdatedTs = Date.now() - 30 * 60 * 1000;
    useAppStore.getState().addConsumption({
      type: 'thc',
      name: 'Gummy',
      method: 'edible',
      mg: 5,
      durationMins: 0,
      timestamp: backdatedTs,
    });

    const state = useAppStore.getState();
    expect(state.sessions[0].startTime).toBe(backdatedTs);
  });

  it('appends to the active session without creating a duplicate session and expands startTime if backdated', () => {
    const now = Date.now();
    useAppStore.getState().addConsumption({
      type: 'thc',
      name: 'Gummy',
      method: 'edible',
      mg: 5,
      timestamp: now - 60000,
    });
    const firstSessionId = useAppStore.getState().activeSessionId;

    const backdatedDrinkTs = now - 45 * 60 * 1000;
    useAppStore.getState().addConsumption({
      type: 'alcohol',
      name: 'Beer',
      volumeOz: 12,
      abvPercent: 5,
      timestamp: backdatedDrinkTs,
    });

    const state = useAppStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.activeSessionId).toBe(firstSessionId);
    expect(state.sessions[0].startTime).toBe(backdatedDrinkTs);
    expect(state.consumptions).toHaveLength(2);
    expect(state.consumptions[1].sessionId).toBe(firstSessionId);
  });

  it('supports adding directly to a closed session, reopening sessions, and merging sessions', () => {
    const t0 = 1795000000000;
    useAppStore.setState({
      sessions: [
        {
          id: 's-closed-1',
          startTime: t0,
          endTime: t0 + 10000,
          mood: 4,
          hunger: 3,
          anxiety: 2,
          hasSubjectiveCheckIn: true,
        },
        {
          id: 's-closed-2',
          startTime: t0 + 15000,
          endTime: t0 + 30000,
          mood: 3,
          hunger: 3,
          anxiety: 3,
          hasSubjectiveCheckIn: false,
        },
      ],
      consumptions: [
        {
          id: 'c1',
          sessionId: 's-closed-1',
          type: 'alcohol',
          name: 'Wine',
          volumeOz: 5,
          abvPercent: 12,
          timestamp: t0,
        },
        {
          id: 'c2',
          sessionId: 's-closed-2',
          type: 'thc',
          name: 'Gummy',
          method: 'edible',
          mg: 5,
          timestamp: t0 + 15000,
        },
      ],
      activeSessionId: null,
    });

    // Add item directly to s-closed-1 without changing activeSessionId
    useAppStore.getState().addConsumption(
      {
        type: 'thc',
        name: 'Puff',
        method: 'inhaled',
        mg: 2,
        timestamp: t0 + 5000,
      },
      { targetSessionId: 's-closed-1' }
    );
    expect(useAppStore.getState().activeSessionId).toBeNull();
    expect(useAppStore.getState().consumptions).toHaveLength(3);

    // Reopen s-closed-1
    useAppStore.getState().reopenSession('s-closed-1');
    expect(useAppStore.getState().activeSessionId).toBe('s-closed-1');
    expect(
      useAppStore.getState().sessions.find((s) => s.id === 's-closed-1')?.endTime
    ).toBeNull();

    // Merge both sessions
    const mergedId = useAppStore.getState().mergeSessions(['s-closed-1', 's-closed-2']);
    expect(mergedId).toBe('s-closed-1');
    expect(useAppStore.getState().sessions).toHaveLength(1);
    expect(useAppStore.getState().consumptions).toHaveLength(3);
    expect(useAppStore.getState().activeSessionId).toBe('s-closed-1');
  });

  it('marks hasSubjectiveCheckIn as true when updateSessionState is called', () => {
    useAppStore.getState().addConsumption({
      type: 'thc',
      name: 'Puff',
      method: 'inhaled',
      mg: 2,
      timestamp: Date.now(),
    });
    expect(useAppStore.getState().sessions[0].hasSubjectiveCheckIn).toBe(false);

    useAppStore.getState().updateSessionState(4, 2, 1);

    const updated = useAppStore.getState().sessions[0];
    expect(updated.hasSubjectiveCheckIn).toBe(true);
    expect(updated.mood).toBe(4);
    expect(updated.hunger).toBe(2);
    expect(updated.anxiety).toBe(1);
  });

  it('defaults startSession hasSubjectiveCheckIn to true', () => {
    useAppStore.getState().startSession(4, 3, 2);
    const session = useAppStore.getState().sessions[0];
    expect(session.hasSubjectiveCheckIn).toBe(true);
  });

  it('manages quickEntryMode and targetSessionId when opening and closing QuickEntry', () => {
    useAppStore.getState().setQuickEntryVisible(true, 'custom', 's-123');
    expect(useAppStore.getState().isQuickEntryVisible).toBe(true);
    expect(useAppStore.getState().quickEntryMode).toBe('custom');
    expect(useAppStore.getState().quickEntryTargetSessionId).toBe('s-123');

    useAppStore.getState().setQuickEntryVisible(false);
    expect(useAppStore.getState().isQuickEntryVisible).toBe(false);
    expect(useAppStore.getState().quickEntryMode).toBe('default');
    expect(useAppStore.getState().quickEntryTargetSessionId).toBeNull();
  });

  it('migrates v1 persisted favorites and logs cleanly without overwriting custom brand names', () => {
    const migrated = migratePersistedState(
      {
        profile: { weight: 185, gender: 'male', units: 'imperial', maxBAC: 0.08, maxTHC: 10 },
        favorites: [
          { id: 'fav5', type: 'thc', name: 'Gummy (10mg)', method: 'edible', mg: 5 },
          { id: 'fav-custom', type: 'thc', name: 'Wana Sativa Gummy', method: 'edible', mg: 10 },
        ],
        consumptions: [
          { id: 'c1', sessionId: 's1', type: 'alcohol', name: 'Wine (5oz, 12%)', timestamp: 1000 },
          { id: 'c2', sessionId: 's1', type: 'thc', name: 'Wana (10mg)', timestamp: 2000 },
        ],
      },
      1
    );

    expect(migrated.favorites![0].name).toBe('Gummy');
    expect(migrated.favorites![1].name).toBe('Wana Sativa Gummy');
    expect(migrated.consumptions![0].name).toBe('Wine');
    expect(migrated.consumptions![1].name).toBe('Wana (10mg)');
    expect(migrated.profile!.lockScreenTimerEnabled).toBe(true);
  });

  it('preserves hasSubjectiveCheckIn, color, lockScreenTimerEnabled, and normalizes v1 names in sanitizeImportedData', () => {
    const now = Date.now();
    const sanitized = sanitizeImportedData({
      version: 1,
      profile: {
        weight: 170,
        height: 70,
        gender: 'male',
        units: 'imperial',
        maxBAC: 0.08,
        maxTHC: 10,
        lockScreenTimerEnabled: false,
      },
      sessions: [
        { id: 's-quick', startTime: now - 3000, endTime: null, mood: 3, hunger: 3, anxiety: 3, hasSubjectiveCheckIn: false },
        { id: 's-mindful', startTime: now - 2000, endTime: null, mood: 4, hunger: 3, anxiety: 2, hasSubjectiveCheckIn: true },
        { id: 's-legacy', startTime: now - 1000, endTime: null, mood: 3, hunger: 3, anxiety: 3 },
      ],
      consumptions: [
        {
          id: 'c1',
          sessionId: 's-quick',
          type: 'thc',
          name: 'Gummy (10mg)',
          color: '#66BB6A',
          method: 'edible',
          mg: 5,
          timestamp: now - 2500,
        },
        {
          id: 'c2',
          sessionId: 's-mindful',
          type: 'thc',
          name: 'Wana Sativa Gummy',
          color: 'not-a-color',
          method: 'edible',
          mg: 10,
          timestamp: now - 1500,
        },
      ],
      favorites: [
        {
          id: 'f1',
          type: 'alcohol',
          name: 'Wine (5oz, 12%)',
          color: '#EF5350',
          volumeOz: 5,
          abvPercent: 12,
        },
      ],
    });

    expect(sanitized).not.toBeNull();
    expect(sanitized!.sessions).toHaveLength(3);
    expect(sanitized!.sessions[0].hasSubjectiveCheckIn).toBe(false);
    expect(sanitized!.sessions[1].hasSubjectiveCheckIn).toBe(true);
    expect(sanitized!.sessions[2].hasSubjectiveCheckIn).toBeUndefined();
    expect('hasSubjectiveCheckIn' in sanitized!.sessions[2]).toBe(false);
    expect(sanitized!.profile.lockScreenTimerEnabled).toBe(false);
    expect(sanitized!.consumptions[0].name).toBe('Gummy');
    expect(sanitized!.consumptions[0].color).toBe('#66BB6A');
    expect(sanitized!.consumptions[1].name).toBe('Wana Sativa Gummy');
    expect(sanitized!.consumptions[1].color).toBeUndefined();
    expect(sanitized!.favorites[0].name).toBe('Wine');
    expect(sanitized!.favorites[0].color).toBe('#EF5350');
  });

  it('builds discreet lock screen timer payloads across session states', () => {
    expect(buildLockScreenTimerPayload(null, [])).toBeNull();

    const session = {
      id: 's1',
      startTime: 1000,
      endTime: null,
      mood: 3,
      hunger: 3,
      anxiety: 3,
    };

    expect(buildLockScreenTimerPayload(session, [])).toEqual({
      mode: 'session',
      primaryEpochMs: 1000,
    });

    const alcOnly = buildLockScreenTimerPayload(session, [
      {
        id: 'a1',
        sessionId: 's1',
        type: 'alcohol',
        name: 'Beer',
        volumeOz: 12,
        abvPercent: 5,
        timestamp: 2000,
      },
    ]);
    expect(alcOnly).toEqual({ mode: 'alcohol', primaryEpochMs: 2000 });

    const thcOnly = buildLockScreenTimerPayload(session, [
      {
        id: 't1',
        sessionId: 's1',
        type: 'thc',
        name: 'Gummy',
        method: 'edible',
        mg: 5,
        timestamp: 3000,
      },
    ]);
    expect(thcOnly).toEqual({ mode: 'thc', primaryEpochMs: 3000 });

    const both = buildLockScreenTimerPayload(session, [
      {
        id: 'a1',
        sessionId: 's1',
        type: 'alcohol',
        name: 'Beer',
        volumeOz: 12,
        abvPercent: 5,
        timestamp: 2000,
      },
      {
        id: 't1',
        sessionId: 's1',
        type: 'thc',
        name: 'Gummy',
        method: 'edible',
        mg: 5,
        timestamp: 3500,
      },
    ]);
    expect(both).toEqual({
      mode: 'both',
      primaryEpochMs: 2000,
      secondaryEpochMs: 3500,
    });
  });
});
