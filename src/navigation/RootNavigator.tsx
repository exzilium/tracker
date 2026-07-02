import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store';
import OnboardingScreen from '../screens/OnboardingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SessionsListScreen from '../screens/SessionsListScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';
import ManageFavoritesScreen from '../screens/ManageFavoritesScreen';
import DonationScreen from '../screens/DonationScreen';
import SettingsScreen from '../screens/SettingsScreen';
import QuickEntry from '../components/QuickEntry';
import StartSessionModal from '../components/StartSessionModal';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Temporary Empty Component for the (+) Tab
const DummyComponent = () => null;

function MainTabNavigator() {
  const { setQuickEntryVisible, setStartSessionVisible, activeSessionId } = useAppStore();
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
          paddingBottom: insets.bottom ? insets.bottom : 12,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          marginTop: 4,
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
          tabBarIcon: ({ color }) => <Feather name="plus-circle" size={32} color={color} />
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            if (activeSessionId) {
              setQuickEntryVisible(true);
            } else {
              setStartSessionVisible(true);
            }
          },
        }}
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
    <>
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
      </NavigationContainer>
      {isOnboarded && (
        <>
          <QuickEntry />
          <StartSessionModal />
        </>
      )}
    </>
  );
}
