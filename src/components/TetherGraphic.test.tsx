import React from 'react';
import renderer, { act } from 'react-test-renderer';
import TetherGraphic from './TetherGraphic';
import { colors } from '../theme';

// Mock react-native-svg components so they don't break Jest
jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) => <>{children}</>,
    Path: 'Path',
    Line: 'Line',
    Circle: 'Circle',
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = () => ({ start: jest.fn() });
  RN.Animated.loop = () => ({ start: jest.fn(), stop: jest.fn() });
  RN.Animated.sequence = () => ({ start: jest.fn() });
  return RN;
});

describe('TetherGraphic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('renders slack state (gray sine wave)', () => {
    let component: any;
    act(() => {
      component = renderer.create(<TetherGraphic tensionPercent={10} />);
    });
    const root = component.root;
    const path = root.findByType('Path' as any);
    
    expect(path.props.stroke).toBe(colors.textSecondary);
    expect(path.props.strokeDasharray).toBeUndefined();
  });

  it('renders Taut straight line when tension is 20-84', () => {
    let component: any;
    act(() => {
      component = renderer.create(<TetherGraphic tensionPercent={50} />);
    });
    const root = component.root;
    const line = root.findByType('Line' as any);
    expect(line).toBeTruthy();
    expect(line.props.stroke).toBe(colors.success);
  });

  it('renders High Tension knot when tension is 85-99', () => {
    let component: any;
    act(() => {
      component = renderer.create(<TetherGraphic tensionPercent={90} />);
    });
    const root = component.root;
    const path = root.findByType('Path' as any); // The zigzag
    expect(path).toBeTruthy();
    expect(path.props.stroke).toBe(colors.warning);
  });

  it('renders Critical snapped lines when tension >= 100', () => {
    let component: any;
    act(() => {
      component = renderer.create(<TetherGraphic tensionPercent={110} />);
    });
    const root = component.root;
    const lines = root.findAllByType('Line' as any);
    const paths = root.findAllByType('Path' as any);
    
    // Should have 2 lines for the broken tether and 2 paths for the sparks
    expect(lines.length).toBe(2);
    expect(paths.length).toBe(2);
    expect(lines[0].props.stroke).toBe(colors.error);
  });
});
