import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ==============================================================================
// 1. CONFIGURATION & HANDLERS
// ==============================================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // FIXED: No more deprecated warnings
    shouldShowList: true,   // FIXED: iOS 14+ requirement
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ==============================================================================
// 2. INTELLIGENCE HELPERS
// ==============================================================================

const getSeason = (date) => {
  const month = date.getMonth(); 
  if (month >= 4 && month <= 9) return 'summer'; 
  return 'winter';
};

const getPrimaryGoal = (settings) => {
  if (!settings?.goals || settings.goals.length === 0) return 'general';
  return settings.goals[Math.floor(Math.random() * settings.goals.length)]; 
};

import { t } from '../i18n';

const MESSAGES = {
  morning: {
    empty: (name, lang) => [
      t('msg_morning_empty', { name, lng: lang }),
    ],
    winter: (name, lang) => [
      t('msg_morning_winter', { name, lng: lang }),
    ],
    summer: (name, lang) => [
      t('msg_morning_summer', { name, lng: lang }),
    ],
    acne: (name, lang) => [t('msg_morning_acne', { name, lng: lang })],
    brightening: (name, lang) => [t('msg_morning_brightening', { name, lng: lang })],
    anti_aging: (name, lang) => [t('msg_morning_anti_aging', { name, lng: lang })],
    friday: (name, lang) => [t('msg_morning_friday', { name, lng: lang })],
    weekend: (name, lang) => [t('msg_morning_weekend', { name, lng: lang })],
    product: (name, pName, lang) => [t('msg_morning_product', { name, pName, lng: lang })]
  },
  evening: {
    empty: (name, lang) => [
      t('msg_evening_empty', { name, lng: lang }),
    ],
    winter: (name, lang) => [t('msg_evening_winter', { name, lng: lang })],
    summer: (name, lang) => [t('msg_evening_summer', { name, lng: lang })],
    acne: (name, lang) => [t('msg_evening_acne', { name, lng: lang })],
    anti_aging: (name, lang) => [t('msg_evening_anti_aging', { name, lng: lang })],
    thursdayNight: (name, lang) => [t('msg_evening_thursday', { name, lng: lang })],
    product: (name, pName, lang) => [t('msg_evening_product', { name, pName, lng: lang })]
  }
};

const generateSmartMessage = (type, date, name, savedProducts, settings, lang) => {
  const season = getSeason(date);
  const goal = getPrimaryGoal(settings);
  const day = date.getDay(); 
  const isFriday = day === 5;
  const isThursday = day === 4;
  const isWeekend = day === 5 || day === 6; 
  const roll = Math.random(); 

  if (!savedProducts || savedProducts.length === 0) {
    const msgList = MESSAGES[type].empty(name, lang);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }

  if (savedProducts && savedProducts.length > 0 && roll < 0.35) {
    const p = savedProducts[Math.floor(Math.random() * savedProducts.length)];
    const pName = p.productName ? p.productName.split(' ').slice(0, 2).join(' ') : t('notif_product_fallback', { lng: lang });
    const msgList = MESSAGES[type].product(name, pName, lang);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }

  if (type === 'morning' && isFriday) return MESSAGES.morning.friday(name, lang)[0];
  if (type === 'morning' && isWeekend && roll > 0.7) return MESSAGES.morning.weekend(name, lang)[0];
  if (type === 'evening' && isThursday) return MESSAGES.evening.thursdayNight(name, lang)[0];

  if (goal !== 'general' && roll < 0.65) {
    let goalKey = null;
    if (goal.includes('acne')) goalKey = 'acne';
    else if (goal.includes('aging') || goal.includes('wrinkles')) goalKey = 'anti_aging';
    else if (goal.includes('bright') || goal.includes('pigment')) goalKey = 'brightening';

    if (goalKey && MESSAGES[type][goalKey]) {
        const msgList = MESSAGES[type][goalKey](name, lang);
        return msgList[Math.floor(Math.random() * msgList.length)];
    }
  }

  const seasonBank = MESSAGES[type][season](name, lang);
  return seasonBank[Math.floor(Math.random() * seasonBank.length)];
};

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('oilguard-smart', {
      name: 'Smart Skincare Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5A9C84',
    });
    await Notifications.setNotificationChannelAsync('wathiq-custom', {
        name: 'My Custom Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500],
        lightColor: '#FFD700',
    });
  }
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
  }
}

// ==============================================================================
// 6. THE 7-DAY SMART SCHEDULER
// ==============================================================================

let lastSmartScheduleRun = 0;
let lastSmartScheduleHash = '';

export async function scheduleAuthenticNotifications(userName, savedProducts, settings) {
  const currentHash = `${userName}-${savedProducts?.length || 0}-${settings?.goals?.join(',') || ''}`;
  const now = Date.now();
  
  if (now - lastSmartScheduleRun < 60000 && lastSmartScheduleHash === currentHash) {
    return; 
  }
  
  lastSmartScheduleRun = now;
  lastSmartScheduleHash = currentHash;

  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduledNotifications) {
    if (notif.content.data?.type === 'smart') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  const lang = settings?.language || 'ar';
  const firstName = userName?.split(' ')[0] || t('brand_wathiq_user', { lng: lang });
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const dayOfWeek = targetDate.getDay();

    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const morningHour = isWeekend ? 10 : 9;
    const morningMinute = isWeekend ? 30 : 0;

    const morningTrigger = new Date(targetDate);
    morningTrigger.setHours(morningHour, morningMinute, 0, 0);

    if (morningTrigger > new Date()) {
        const msg = generateSmartMessage('morning', targetDate, firstName, savedProducts, settings, lang);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: isWeekend ? t('notif_morning_title_weekend', { lng: lang }) : t('notif_morning_title_standard', { lng: lang }),
            body: msg,
            data: { screen: 'routine', period: 'am', type: 'smart' },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: morningTrigger.getTime(),
            channelId: 'oilguard-smart',
          },
        });
    }

    const eveningTrigger = new Date(targetDate);
    eveningTrigger.setHours(21, 30, 0, 0);

    if (eveningTrigger > new Date()) {
        const msg = generateSmartMessage('evening', targetDate, firstName, savedProducts, settings, lang);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: t('notif_evening_title', { lng: lang }),
            body: msg,
            data: { screen: 'routine', period: 'pm', type: 'smart' },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: eveningTrigger.getTime(),
            channelId: 'oilguard-smart',
          },
        });
    }
  }
}

/// ==============================================================================
// 7. CUSTOM USER REMINDERS SCHEDULER
// ==============================================================================

export async function scheduleCustomReminder(reminder) {
  if (!reminder.isActive) return null;

  try {
      const h = parseInt(reminder.hour, 10);
      const m = parseInt(reminder.minute, 10);

      let trigger;

      if (reminder.type === 'weekly') {
          trigger = {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY, // EXPLICITLY SET
              weekday: parseInt(reminder.weekday, 10),
              hour: h,
              minute: m,
              channelId: 'wathiq-custom',
          };
      } else {
          // Default to Daily
          trigger = {
              type: Notifications.SchedulableTriggerInputTypes.DAILY, // EXPLICITLY SET
              hour: h,
              minute: m,
              channelId: 'wathiq-custom',
          };
      }

      const id = await Notifications.scheduleNotificationAsync({
          content: {
              title: reminder.title || t('notif_custom_title'),
              body: reminder.body || t('notif_custom_body'),
              data: { screen: 'routine', type: 'custom', reminderId: reminder.id },
              sound: true,
          },
          trigger: trigger
      });
      
      return id;
  } catch (error) {
      console.error("Failed to schedule custom reminder:", error);
      return null;
  }
}

export async function cancelCustomReminder(notificationId) {
  if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}

// ==============================================================================
// 8. TEST FUNCTION (10 SECONDS DELAY)
// ==============================================================================

export async function testInstantNotification() {
  try {
      await Notifications.scheduleNotificationAsync({
          content: {
              title: t('notif_test_title'),
              body: t('notif_test_body'),
              sound: true,
          },
          trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, // EXPLICITLY SET
              seconds: 10,
              channelId: 'wathiq-custom',
          }
      });
      console.log("Test scheduled! Go to home screen and wait 10 seconds...");
  } catch (error) {
      console.error("Test failed:", error);
  }
}

