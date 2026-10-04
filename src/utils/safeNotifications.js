/**
 * safeNotifications.js
 *
 * Safe shim for expo-notifications.
 * Since SDK 53, expo-notifications throws on load inside Expo Go.
 * We check Constants.appOwnership BEFORE calling require() so the
 * module is never loaded in Expo Go — no throw, no Metro error log.
 *
 * In a real dev build or production APK, the full native module is used.
 */
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

const stub = {
  setNotificationHandler: () => {},
  scheduleNotificationAsync: async () => null,
  cancelScheduledNotificationAsync: async () => {},
  cancelAllScheduledNotificationsAsync: async () => {},
  getScheduledNotificationsAsync: async () => [],
  getAllScheduledNotificationsAsync: async () => [],
  setNotificationChannelAsync: async () => {},
  getPermissionsAsync: async () => ({ status: 'denied' }),
  requestPermissionsAsync: async () => ({ status: 'denied' }),
  getExpoPushTokenAsync: async () => ({ data: null }),
  getDevicePushTokenAsync: async () => ({ data: null }),
  getLastNotificationResponseAsync: async () => null,
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  AndroidImportance: { LOW: 2, DEFAULT: 3, HIGH: 4, MAX: 5 },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    CALENDAR: 'calendar',
  },
};

if (isExpoGo) {
  console.log('[safeNotifications] Expo Go detected — push notifications stubbed out.');
}

// eslint-disable-next-line import/no-mutable-exports
const Notifications = isExpoGo ? stub : require('expo-notifications');

export default Notifications;
