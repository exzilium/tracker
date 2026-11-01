import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: typeof import('expo-notifications') | null = null;

if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('Failed to set notification handler', e);
  }
}

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web' || isExpoGo || !Notifications) {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#BB86FC',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return null;
      }
      try {
        token = (await Notifications.getExpoPushTokenAsync()).data;
      } catch (e) {
        console.warn('Failed to get Expo push token', e);
      }
    }
  } catch (e) {
    console.warn('Failed to register for notifications', e);
  }

  return token ?? null;
}

export async function scheduleHydrationReminder() {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // Cancel any existing hydration reminders so we don't spam them
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Schedule a new reminder for 1 hour from now
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "💧 Time to hydrate!",
        body: "Make sure you have a glass of water. Pacing yourself is key!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60 * 60, // 1 hour
      },
    });
  } catch (e) {
    console.warn('Failed to schedule hydration reminder', e);
  }
}
