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

// ==============================================================================
// 3. THE HYPER-RICH MESSAGE BANK
// ==============================================================================

const MESSAGES = {
  morning: {
    empty: (name) => [
      `صباح الخير يا ${name} ☀️.. لنبدأ بإضافة أول منتج؟`,
      `يا ${name}، بشرتك تستحق العناية.. وأضيفي منتجاتك الآن.`,
      `بداية جديدة..مرحبا بك يا ${name} 🧴`,
    ],
    winter: (name) => [
      `صباح الخير يا ${name} ❄️.. الجو بارد وينشف البشرة، رطبي بعمق!`,
      `يا ${name}، برد الصباح عدو الحاجز الجلدي.. لا تخرجي بدون ترطيب وحماية.`,
    ],
    summer: (name) => [
      `صباح النور يا ${name} ☀️!`,
      `يا ${name}، الحرارة تفتح المسام.. غسول بارد وواقي شمس هم الحل.`,
    ],
    acne: (name) => [`صباح التحدي يا ${name} 💪.. لا تلمسي الحبوب مهما كان الإغراء!`],
    brightening: (name) => [`يا ${name}، التفتيح يبدأ من الحماية.. الشمس هي عدوة البقع الأولى.`],
    anti_aging: (name) => [`صباح الشباب يا ${name} ✨.. 90% من التجاعيد سببها الشمس، احمي نفسك!`],
    friday: (name) => [`يا ${name} 🕌.. اجعلي نور الوجه من نور الإيمان .`],
    weekend: (name) => [`صباح الدلع والعطلة ☕.. خذي وقتك في الروتين، لا عجلة اليوم.`],
    product: (name, pName) => [`يا ${name}، ${pName} يناديكِ من الرف.. لا تتجاهليه 😉`]
  },
  evening: {
    empty: (name) => [
      `مساء الخير يا ${name} 🌙.. لا تتركي رفّك فارغاً، ابدئي الآن!`,
    ],
    winter: (name) => [`ليلة باردة يا ${name} 🥶.. بشرتك تحتاج طبقة ترطيب إضافية؟`],
    summer: (name) => [`يوم طويل وحار.. بشرتك تحتاج تتنفس، التنظيف المزدوج ضروري 🌙`],
    acne: (name) => [`عالجي الحبوب الآن لتختفي غداً.. التزامك يصنع الفرق.`],
    anti_aging: (name) => [`تصبحي على خير.. الليل هو وقت الريتينول والترميم 🌙`],
    thursdayNight: (name) => [`ليلة الجمعة.. وقت الدلع، التقشير، والماسك يا ${name} ✨`],
    product: (name, pName) => [`قبل النوم.. ${pName} هو المكافأة التي تستحقينها ✨`]
  }
};

const generateSmartMessage = (type, date, name, savedProducts, settings) => {
  const season = getSeason(date);
  const goal = getPrimaryGoal(settings);
  const day = date.getDay(); 
  const isFriday = day === 5;
  const isThursday = day === 4;
  const isWeekend = day === 5 || day === 6; 
  const roll = Math.random(); 

  if (!savedProducts || savedProducts.length === 0) {
    const msgList = MESSAGES[type].empty(name);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }

  if (savedProducts && savedProducts.length > 0 && roll < 0.35) {
    const p = savedProducts[Math.floor(Math.random() * savedProducts.length)];
    const pName = p.productName ? p.productName.split(' ').slice(0, 2).join(' ') : 'منتجك';
    const msgList = MESSAGES[type].product(name, pName);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }

  if (type === 'morning' && isFriday) return MESSAGES.morning.friday(name)[0];
  if (type === 'morning' && isWeekend && roll > 0.7) return MESSAGES.morning.weekend(name)[0];
  if (type === 'evening' && isThursday) return MESSAGES.evening.thursdayNight(name)[0];

  if (goal !== 'general' && roll < 0.65) {
    let goalKey = null;
    if (goal.includes('acne')) goalKey = 'acne';
    else if (goal.includes('aging') || goal.includes('wrinkles')) goalKey = 'anti_aging';
    else if (goal.includes('bright') || goal.includes('pigment')) goalKey = 'brightening';

    if (goalKey && MESSAGES[type][goalKey]) {
        const msgList = MESSAGES[type][goalKey](name);
        return msgList[Math.floor(Math.random() * msgList.length)];
    }
  }

  const seasonBank = MESSAGES[type][season](name);
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

  const firstName = userName?.split(' ')[0] || 'غالية';
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
        const msg = generateSmartMessage('morning', targetDate, firstName, savedProducts, settings);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: isWeekend ? "صباح العطلة والدلع ☕" : "صباح السرور ☀️",
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
        const msg = generateSmartMessage('evening', targetDate, firstName, savedProducts, settings);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "راهو الليل 🌙",
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
              title: reminder.title || 'تنبيه العناية ⏰',
              body: reminder.body || 'حان وقت روتينك المخصص!',
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
              title: "تنبيه تجريبي 🚀",
              body: "نظام التنبيهات يعمل! ظهرت بعد 10 ثوانٍ بالظبط.",
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

