import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer, NavigatorScreenParams } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, Session } from '../store';
import OnboardingScreen from '../screens/OnboardingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SessionsListScreen from '../screens/SessionsListScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ManageFavoritesScreen from '../screens/ManageFavoritesScreen';
import DonationScreen from '../screens/DonationScreen';
import SettingsScreen from '../screens/SettingsScreen';
import QuickEntry from '../components/QuickEntry';
import StartSessionModal from '../components/StartSessionModal';
import LockScreenTimerSync from '../components/LockScreenTimerSync';
import { colors } from '../theme';

export type MainTabParamList = {
  Dashboard: undefined;
  SessionsList: undefined;
  Add: undefined;
  Analytics: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  SessionDetail: { session: Pick<Session, 'id' | 'startTime' | 'endTime'> };
  Donation: undefined;
  ManageFavorites: { returnToQuickEntry?: boolean } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder Component for the centered (+) Quick Entry action tab
const DummyComponent = () => null;

function MainTabNavigator() {
  const setQuickEntryVisible = useAppStore((state) => state.setQuickEntryVisible);
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          elevation: 0,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom ? insets.bottom : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          marginTop: 2,
          fontSize: 11,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} /> }}
      />
      <Tab.Screen 
        name="SessionsList" 
        component={SessionsListScreen} 
        options={{ tabBarLabel: 'Sessions', tabBarIcon: ({ color, size }) => <Feather name="activity" size={size} color={color} /> }}
      />
      <Tab.Screen 
        name="Add" 
        component={DummyComponent} 
        options={{
          tabBarShowLabel: false,
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: 'Add entry',
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarIconStyle: {
            width: 46,
            height: 46,
            alignItems: 'center',
            justifyContent: 'center',
          },
          tabBarIcon: () => (
            <View style={styles.addTabPill}>
              <Feather name="plus" size={26} color={colors.background} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            setQuickEntryVisible(true, 'default');
          },
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ tabBarLabel: 'Data', tabBarIcon: ({ color, size }) => <Feather name="bar-chart-2" size={size} color={color} /> }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ tabBarLabel: 'Settings', tabBarIcon: ({ color, size }) => <Feather name="settings" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const isOnboarded = useAppStore((state) => state.profile.isOnboarded);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isOnboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
            <Stack.Screen name="Donation" component={DonationScreen} />
            <Stack.Screen name="ManageFavorites" component={ManageFavoritesScreen} />
          </>
        )}
      </Stack.Navigator>
      {isOnboarded && (
        <>
          <QuickEntry />
          <StartSessionModal />
          <LockScreenTimerSync />
        </>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  addTabPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
});
