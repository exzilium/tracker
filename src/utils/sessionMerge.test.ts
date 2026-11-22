import type { Consumption, Session, UserProfile } from '../store';
import {
  computeMergedSession,
  findOverlapClusters,
  findOverlappingClosedSessions,
} from './sessionMerge';

const TEST_PROFILE: UserProfile = {
  height: 67,
  weight: 185,
  gender: 'male',
  units: 'imperial',
  isOnboarded: true,
  maxBAC: 0.08,
  maxTHC: 10,
};

// Reproduces the 3 overlapping test sessions from the user's real exported JSON
const REAL_SESSIONS: Session[] = [
  {
    id: 'e9e0c8ac-26d9-4b05-a283-592668354f80',
    startTime: 1795382459265,
    endTime: 1795382763070,
    mood: 3,
    hunger: 3,
    anxiety: 3,
    hasSubjectiveCheckIn: true,
  },
  {
    id: '6e06e017-9085-45ec-aae8-b8d90e7bc65d',
    startTime: 1795381011115,
    endTime: 1795382873233,
    mood: 4,
    hunger: 4,
    anxiety: 5,
    hasSubjectiveCheckIn: true,
  },
  {
    id: '3dda4d2a-c654-47ad-b2bb-dfb7539ad4ea',
    startTime: 1795382895350,
    endTime: 1795382929231,
    mood: 4,
    hunger: 2,
    anxiety: 2,
    hasSubjectiveCheckIn: true,
  },
];

const REAL_CONSUMPTIONS: Consumption[] = [
  {
    type: 'thc',
    name: 'Gummy',
    emoji: 'FontAwesome5:cookie-bite',
    method: 'edible',
    mg: 5,
    durationMins: 0,
    timestamp: 1795382459265,
    id: '3d4828e9-8ad0-499f-ae94-5d59231c66ff',
    sessionId: 'e9e0c8ac-26d9-4b05-a283-592668354f80',
  },
  {
    type: 'alcohol',
    name: 'Wine',
    emoji: 'Ionicons:wine',
    volumeOz: 5,
    abvPercent: 12,
    durationMins: 45,
    timestamp: 1795382708949,
    id: '4d693cb1-2997-4cc5-910a-466cd86432ab',
    sessionId: 'e9e0c8ac-26d9-4b05-a283-592668354f80',
  },
  {
    type: 'thc',
    name: 'Gummy',
    emoji: 'FontAwesome5:cookie-bite',
    method: 'edible',
    mg: 5,
    durationMins: 0,
    timestamp: 1795382735820,
    id: '3ea8f992-8ebb-4251-83cb-4da7aca1b675',
    sessionId: 'e9e0c8ac-26d9-4b05-a283-592668354f80',
  },
  {
    type: 'alcohol',
    name: 'Beer',
    emoji: 'Ionicons:beer-outline',
    durationMins: 45,
    volumeOz: 12,
    abvPercent: 5,
    timestamp: 1795381011115,
    id: '61b16163-877f-4c19-98bc-529352fda94f',
    sessionId: '6e06e017-9085-45ec-aae8-b8d90e7bc65d',
  },
  {
    type: 'alcohol',
    name: 'Wine',
    emoji: 'Ionicons:wine',
    timestamp: 1795382895339,
    durationMins: 45,
    volumeOz: 5,
    abvPercent: 12,
    id: '091a4c70-4603-41ba-ac87-52989c0a4c54',
    sessionId: '3dda4d2a-c654-47ad-b2bb-dfb7539ad4ea',
  },
  {
    type: 'thc',
    name: 'Puff',
    emoji: 'FontAwesome5:wind',
    timestamp: 1795382895339,
    durationMins: 0,
    method: 'inhaled',
    mg: 2,
    id: 'b4f86046-2f9d-45d1-8ab8-a7555c66f517',
    sessionId: '3dda4d2a-c654-47ad-b2bb-dfb7539ad4ea',
  },
];

describe('sessionMerge', () => {
  it('groups the 3 overlapping test sessions into a single cluster', () => {
    const clusters = findOverlapClusters(
      REAL_SESSIONS,
      REAL_CONSUMPTIONS,
      TEST_PROFILE,
      1795383000000
    );

    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(3);
    expect(clusters[0][0].startTime).toBe(1795381011115);
  });

  it('does not cluster sessions separated by >8 hours with sober levels', () => {
    const day1Start = 1795000000000;
    const day2Start = day1Start + 12 * 60 * 60 * 1000;
    const separateSessions: Session[] = [
      {
        id: 'day1',
        startTime: day1Start,
        endTime: day1Start + 60 * 60 * 1000,
        mood: 3,
        hunger: 3,
        anxiety: 3,
        hasSubjectiveCheckIn: true,
      },
      {
        id: 'day2',
        startTime: day2Start,
        endTime: day2Start + 60 * 60 * 1000,
        mood: 4,
        hunger: 3,
        anxiety: 2,
        hasSubjectiveCheckIn: true,
      },
    ];
    const separateConsumptions: Consumption[] = [
      {
        id: 'c1',
        sessionId: 'day1',
        type: 'alcohol',
        name: 'Beer',
        volumeOz: 12,
        abvPercent: 5,
        durationMins: 30,
        timestamp: day1Start,
      },
      {
        id: 'c2',
        sessionId: 'day2',
        type: 'alcohol',
        name: 'Beer',
        volumeOz: 12,
        abvPercent: 5,
        durationMins: 30,
        timestamp: day2Start,
      },
    ];

    const clusters = findOverlapClusters(
      separateSessions,
      separateConsumptions,
      TEST_PROFILE,
      day2Start + 2 * 60 * 60 * 1000
    );
    expect(clusters).toHaveLength(0);
  });

  it('detects overlapping closed sessions by metabolic activity, interval, and 60m grace window', () => {
    const baseStart = 1795000000000;
    const edibleSession: Session = {
      id: 'edible-s',
      startTime: baseStart,
      endTime: baseStart + 15 * 60 * 1000,
      mood: 3,
      hunger: 3,
      anxiety: 3,
    };
    const edibleLog: Consumption = {
      id: 'ed-1',
      sessionId: 'edible-s',
      type: 'thc',
      name: 'Gummy',
      method: 'edible',
      mg: 10,
      timestamp: baseStart,
    };

    // 2 hours later: outside 60m grace window, but edible THC is right at its peak
    const twoHoursLater = findOverlappingClosedSessions(
      [edibleSession],
      [edibleLog],
      TEST_PROFILE,
      baseStart + 2 * 60 * 60 * 1000
    );
    expect(twoHoursLater).toHaveLength(1);
    expect(twoHoursLater[0].reason).toBe('metabolic');

    // Inside session interval
    const insideInterval = findOverlappingClosedSessions(
      [edibleSession],
      [edibleLog],
      TEST_PROFILE,
      baseStart + 5 * 60 * 1000
    );
    expect(insideInterval).toHaveLength(1);
    expect(insideInterval[0].reason).toBe('interval');

    // 10 hours later: completely metabolized
    const tenHoursLater = findOverlappingClosedSessions(
      [edibleSession],
      [edibleLog],
      TEST_PROFILE,
      baseStart + 10 * 60 * 60 * 1000
    );
    expect(tenHoursLater).toHaveLength(0);
  });

  it('merges overlapping sessions losslessly while spanning earliest-to-latest bounds', () => {
    const result = computeMergedSession(
      REAL_SESSIONS,
      REAL_CONSUMPTIONS,
      REAL_SESSIONS.map((s) => s.id),
      null
    );

    expect(result.mergedSessionId).toBe('6e06e017-9085-45ec-aae8-b8d90e7bc65d');
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].startTime).toBe(1795381011115);
    expect(result.sessions[0].endTime).toBe(1795382929231);
    // Latest explicit check-in comes from Session 3 (3dda4d2a)
    expect(result.sessions[0].mood).toBe(4);
    expect(result.sessions[0].hunger).toBe(2);
    expect(result.sessions[0].anxiety).toBe(2);
    expect(result.sessions[0].hasSubjectiveCheckIn).toBe(true);
    expect(result.consumptions).toHaveLength(6);
    expect(
      result.consumptions.every((c) => c.sessionId === result.mergedSessionId)
    ).toBe(true);
  });

  it('preserves activeSessionId when merging a closed session into an active session', () => {
    const sessionsWithActive: Session[] = [
      {
        id: 'closed-1',
        startTime: 1000,
        endTime: 2000,
        mood: 4,
        hunger: 3,
        anxiety: 2,
        hasSubjectiveCheckIn: true,
      },
      {
        id: 'active-1',
        startTime: 2500,
        endTime: null,
        mood: 3,
        hunger: 3,
        anxiety: 3,
        hasSubjectiveCheckIn: false,
      },
    ];
    const logs: Consumption[] = [
      {
        id: 'l1',
        sessionId: 'closed-1',
        type: 'alcohol',
        name: 'Wine',
        volumeOz: 5,
        abvPercent: 12,
        timestamp: 1000,
      },
      {
        id: 'l2',
        sessionId: 'active-1',
        type: 'thc',
        name: 'Gummy',
        method: 'edible',
        mg: 5,
        timestamp: 2500,
      },
    ];

    const result = computeMergedSession(
      sessionsWithActive,
      logs,
      ['closed-1', 'active-1'],
      'active-1'
    );

    expect(result.mergedSessionId).toBe('active-1');
    expect(result.activeSessionId).toBe('active-1');
    expect(result.sessions[0].endTime).toBeNull();
    expect(result.sessions[0].startTime).toBe(1000);
    // Keeps explicit check-in from closed-1 because active-1 had hasSubjectiveCheckIn: false
    expect(result.sessions[0].hasSubjectiveCheckIn).toBe(true);
    expect(result.sessions[0].mood).toBe(4);
  });
});
