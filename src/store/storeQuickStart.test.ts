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

import { useAppStore } from './index';
import { sanitizeImportedData } from '../screens/SettingsScreen';

describe('Quick Start store actions & backup sanitization', () => {
  beforeEach(() => {
    mockUuidCounter = 0;
    useAppStore.setState({
      sessions: [],
      activeSessionId: null,
      consumptions: [],
      isQuickEntryVisible: false,
      quickEntryMode: 'default',
      isStartSessionVisible: false,
    });
  });

  it('auto-creates a Quick Start session when addConsumption is called while idle', () => {
    const itemTs = Date.now();
    useAppStore.getState().addConsumption({
      type: 'thc',
      name: 'Gummy (10mg)',
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
      name: 'Gummy (5mg)',
      method: 'edible',
      mg: 5,
      durationMins: 0,
      timestamp: backdatedTs,
    });

    const state = useAppStore.getState();
    expect(state.sessions[0].startTime).toBe(backdatedTs);
  });

  it('appends to the active session without creating a duplicate session', () => {
    useAppStore.getState().addConsumption({
      type: 'thc',
      name: 'Gummy (5mg)',
      method: 'edible',
      mg: 5,
      timestamp: Date.now() - 60000,
    });
    const firstSessionId = useAppStore.getState().activeSessionId;

    useAppStore.getState().addConsumption({
      type: 'alcohol',
      name: 'Beer',
      volumeOz: 12,
      abvPercent: 5,
      timestamp: Date.now(),
    });

    const state = useAppStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.activeSessionId).toBe(firstSessionId);
    expect(state.consumptions).toHaveLength(2);
    expect(state.consumptions[1].sessionId).toBe(firstSessionId);
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

  it('manages quickEntryMode when opening and closing QuickEntry', () => {
    useAppStore.getState().setQuickEntryVisible(true, 'custom');
    expect(useAppStore.getState().isQuickEntryVisible).toBe(true);
    expect(useAppStore.getState().quickEntryMode).toBe('custom');

    useAppStore.getState().setQuickEntryVisible(false);
    expect(useAppStore.getState().isQuickEntryVisible).toBe(false);
    expect(useAppStore.getState().quickEntryMode).toBe('default');
  });

  it('preserves hasSubjectiveCheckIn true, false, and undefined in sanitizeImportedData', () => {
    const now = Date.now();
    const sanitized = sanitizeImportedData({
      profile: {
        weight: 170,
        height: 70,
        gender: 'male',
        units: 'imperial',
        maxBAC: 0.08,
        maxTHC: 10,
      },
      sessions: [
        { id: 's-quick', startTime: now - 3000, endTime: null, mood: 3, hunger: 3, anxiety: 3, hasSubjectiveCheckIn: false },
        { id: 's-mindful', startTime: now - 2000, endTime: null, mood: 4, hunger: 3, anxiety: 2, hasSubjectiveCheckIn: true },
        { id: 's-legacy', startTime: now - 1000, endTime: null, mood: 3, hunger: 3, anxiety: 3 },
      ],
      consumptions: [],
      favorites: [],
    });

    expect(sanitized).not.toBeNull();
    expect(sanitized!.sessions).toHaveLength(3);
    expect(sanitized!.sessions[0].hasSubjectiveCheckIn).toBe(false);
    expect(sanitized!.sessions[1].hasSubjectiveCheckIn).toBe(true);
    expect(sanitized!.sessions[2].hasSubjectiveCheckIn).toBeUndefined();
    expect('hasSubjectiveCheckIn' in sanitized!.sessions[2]).toBe(false);
  });
});
