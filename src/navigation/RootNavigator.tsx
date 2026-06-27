import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store';
import OnboardingScreen from '../screens/OnboardingScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SessionsListScreen from '../screens/SessionsListScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';
import ManageFavoritesScreen from '../screens/ManageFavoritesScreen';
import DonationScreen from '../screens/DonationScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const isOnboarded = useAppStore((state) => state.profile.isOnboarded);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isOnboarded ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="SessionsList" component={SessionsListScreen} />
            <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
            <Stack.Screen name="Donation" component={DonationScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="ManageFavorites" component={ManageFavoritesScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
