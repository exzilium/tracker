import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AstronautGraphic from './AstronautGraphic';
import { useAppStore } from '../store';
import { colors } from '../theme';

// Mock the store to return different avatars
jest.mock('../store', () => ({
  useAppStore: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  FontAwesome5: 'FontAwesome5',
}));

describe('AstronautGraphic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  it('renders Slack state (gray) when tension is low', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({});

    let component: any;
    act(() => {
      component = renderer.create(<AstronautGraphic tensionPercent={15} />);
    });
    const root = component.root;
    const icon = root.findByType('FontAwesome5' as any);
    expect(icon.props.name).toBe('user-astronaut');
    expect(icon.props.color).toBe(colors.textSecondary); // Gray
  });

  it('renders Taut state (green) when tension is medium', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({});

    let component: any;
    act(() => {
      component = renderer.create(<AstronautGraphic tensionPercent={50} />);
    });
    const root = component.root;
    const icon = root.findByType('FontAwesome5' as any);
    expect(icon.props.color).toBe(colors.success); // Green
  });

  it('renders High Tension state (orange) when tension is high', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({});

    let component: any;
    act(() => {
      component = renderer.create(<AstronautGraphic tensionPercent={90} />);
    });
    const root = component.root;
    const icon = root.findByType('FontAwesome5' as any);
    expect(icon.props.color).toBe(colors.warning); // Orange
  });

  it('renders Critical state (red) when tension is >= 100', () => {
    (useAppStore as unknown as jest.Mock).mockReturnValue({});

    let component: any;
    act(() => {
      component = renderer.create(<AstronautGraphic tensionPercent={120} />);
    });
    const root = component.root;
    const icon = root.findByType('FontAwesome5' as any);
    expect(icon.props.color).toBe(colors.error); // Red
  });
});
