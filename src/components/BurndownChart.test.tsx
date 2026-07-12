import React from 'react';
import renderer, { act } from 'react-test-renderer';
import BurndownChart from './BurndownChart';

// Mock dependencies
jest.mock('../store', () => ({
  useAppStore: (selector: any) => {
    const state = {
      profile: {
        maxBAC: 0.08,
        maxTHC: 10,
      },
      sessions: [{ id: 'test-session', mood: 3, hunger: 3, anxiety: 3 }],
      activeSessionId: 'test-session',
      consumptions: [],
    };
    return selector ? selector(state) : state;
  }
}));

jest.mock('../utils/currentLevels', () => ({
  getCurrentLevels: jest.fn().mockReturnValue({ currentBAC: 0.04, currentTHC: 5 })
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) => <>{children}</>,
    Path: 'Path',
    Defs: 'Defs',
    LinearGradient: 'LinearGradient',
    Stop: 'Stop',
    Line: 'Line',
    Text: 'Text',
  };
});

describe('BurndownChart', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('renders without crashing and displays the BAC/THC curves', () => {
    let component: any;
    act(() => {
      component = renderer.create(<BurndownChart activeTimeWindowHours={4} hideTimeToggles={true} />);
    });
    const root = component.root;
    
    // Just verify the Paths render (which includes BAC, THC curves)
    const paths = root.findAllByType('Path' as any);
    expect(paths.length).toBeGreaterThan(0);
  });
});
