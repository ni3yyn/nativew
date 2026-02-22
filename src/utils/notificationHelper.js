import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// ==============================================================================
// 1. CONFIGURATION & HANDLERS
// ==============================================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ==============================================================================
// 2. INTELLIGENCE HELPERS
// ==============================================================================

// A. Get Season based on Month (Algeria Context)
// Summer is long and hot (May -> Oct), Winter is cold/dry (Nov -> Apr)
const getSeason = (date) => {
  const month = date.getMonth(); // 0 = Jan, 11 = Dec
  if (month >= 4 && month <= 9) return 'summer'; 
  return 'winter';
};

// B. Extract Primary Goal
// Returns a random goal from the user's settings to vary the advice
const getPrimaryGoal = (settings) => {
  if (!settings?.goals || settings.goals.length === 0) return 'general';
  return settings.goals[Math.floor(Math.random() * settings.goals.length)]; 
};

// ==============================================================================
// 3. THE HYPER-RICH MESSAGE BANK (ALGERIAN AUTHENTIC)
// ==============================================================================

const MESSAGES = {
  // 🌅 MORNING BANK
  morning: {
    empty: (name) => [
      `${name} ✨ الرف تاعك فارغ، واش رايك نعمروه بمنتجاتك اليوم؟`,
      `بشرتك تستاهل العناية.. أضيفي أول منتج لروتينك وخلينا نبداو 🧴`,
      `صباح الخير! خطوة صغيرة اليوم تصنع فرق كبير غدوة.. أضيفي منتجاتك الآن.`,
    ],
    // ❄️ Winter Mornings (Cold, Dry, Wind)
    winter: (name) => [
      `البرد قاسح ❄️ ما تنسايش ترطبي وجهك مليح اليوم.`,
      `صباح السرور! التدفئة تنشف البشرة، ديري مرطب يحمي وجهك طول النهار 💧`,
      `السر فالشتا هو الترطيب المزدوج.. تهلاي في بشرتك اليوم ☃️`,
      `صباح النور.. الما الفاتر أحسن من السخون باش تحافظي على زيوت وجهك الطبيعية.`,
    ],
    // ☀️ Summer Mornings (Heat, Sun, Sweat)
    summer: (name) => [
      `صباح النور ☀️ السخانة بدات، واقي الشمس تاعك هو أهم حاجة قبل ما تخرجي!`,
      `نهار سخون يستاهل غسول منعش وحماية قوية.. ما تنسايش تجددي الواقي 😎`,
      `رطوبة وسخانة؟ خففي طبقات الروتين وركزي على الحماية والترطيب الخفيف 💧`,
    ],
    // 🎯 Goal: Acne (Hib Chabab)
    acne: (name) => [
      `صباح الزين ✨ حبة اليوم تروح غدوة، المهم ما تمسيهاش والتزمي بروتينك.`,
      `الاستمرارية هي سر تصفية الوجه.. غسلي وجهك مليح وابداي نهارك 💪`,
      `صباح الخير.. تفكري بلي علاج الحبوب يحتاج صبر، ونتي راكي في الطريق الصحيح.`,
    ],
    // 🎯 Goal: Brightening/Pigmentation (Taftih/Les Taches)
    brightening: (name) => [
      `صباح النضارة 🌟 الفيتامين C وواقي الشمس هوما السر باش تضوي اليوم.`,
      `التصبغات يحبو الشمس.. احمي وجهك مليح باش تحافظي على نتيجة روتينك.`,
      `تفتيح البشرة يبدا من الحماية الصباحية.. يومك مشرق ✨`,
    ],
    // 🎯 Goal: Anti-Aging (Tajaeed)
    anti_aging: (name) => [
      `صباح الشباب ✨ ترطيب اليوم هو استثمار في كولاجين غدوة. ما تنسايش روتينك!`,
      `الشمس هي العدو الأول للتجاعيد.. واقي الشمس تاعك يستنى فيك 🛡️`,
      `الترطيب الداخلي والخارجي هو السر.. شربتي كاس ما على الفراغ؟ 💧`,
    ],
    // 🕌 Friday Special (Jumu'ah)
    friday: (name) => [
      `يومك مبروك ${name} ✨`,
      `صباح الفل.. نهار الجمعة فرصة باش تتهلاي في روحك وتريحي بشرتك.`,
      `يومك مبروك.. دوش خفيف، روتين منعش، وبداية يوم نقية 🌿`,
    ],
    // ☕ Weekend Vibes (Fri/Sat - Lazy Morning)
    weekend: (name) => [
      `صباح الراحة والويكاند ☕ ادي وقتك فالرقاد.`,
      `${name}.. واش رايك في ماسك خفيف مع قهوة الصباح؟ 💆‍♀️`,
      `بشرتك حتى هي تفرح بالويكاند.. روتين هادي و نهارك مبروك ✨`,
    ],
    // 🧴 Product Injection
    product: (name, pName) => [
      `الـ ${pName} يستنى فيك باش يبدا خدمتو.. ما تنسايهش في روتين الصباح 🧴`,
      `بشرتك محتاجة شوية حب، و ${pName} هو الحل اليوم ✨`,
      `صباح الخير! ديري ${pName} وانطلقي لنهارك بكامل الثقة.`,
    ]
  },

  // 🌙 EVENING BANK
  evening: {
    empty: (name) => [
      `مساء الخير 🌙 باش توجدي روتين الليل، لازمنا منتجات.. أضيفيها درك في التطبيق.`,
      `الليل هو وقت تجديد البشرة.. خلينا نرتبو رف منتجاتك مع بعض 📸`,
    ],
    // ❄️ Winter Nights
    winter: (name) => [
      `البرد برا والتدفئة لداخل.. وجهك محتاج ترطيب عميق قبل ما ترقدي 🥶🌙`,
      `تصبحي على خير.. ديري طبقة مليحة من المرطب باش تنوضي الصباح وجهك منور ✨`,
      `ما تنسايش ترطبي شفايفك ويديك، الشتا تنشفهم بالخف 💧`,
    ],
    // ☀️ Summer Nights
    summer: (name) => [
      `نهار طويل وعرق وسخانة.. التنظيف المزدوج (Double Cleansing) ضروري الليلة 🌙`,
      `بشرتك لازم تتنفس بعد نهار سخون.. غسلي وجهك مليح وتصبحي على خير 💧`,
      `نظفي مساماتك من واقي الشمس تاع اليوم باش تتفاداي الحبوب غدوة ✨`,
    ],
    // 🎯 Goal: Acne
    acne: (name) => [
      `الليل هو أحسن وقت لعلاج الحبوب.. ديري الدواء تاعك وخليه يخدم ونتي راقدة 🌙`,
      `ما تعصريش الحبات! 🚫 ديري العلاج الموضعي ورقدي متهنية.`,
      `غلاف المخايد النظيف والغسول المليح = وجه صافي. تصبحي على خير ✨`,
    ],
    // 🎯 Goal: Anti-Aging
    anti_aging: (name) => [
      `وقت الريتينول وتجديد الخلايا 🌙 روتين الليل هو السلاح السري تاعك.`,
      `تصبحي على خير ${name}.. السيروم الليلي راهو يستنى يخدم خدمتو.`,
      `ترميم البشرة يصرا ونتي راقدة.. عاونيها بروتين خفيف ومغذي ✨`,
    ],
    // 🛁 Thursday Night (Pre-Weekend/Hammam vibes)
    thursdayNight: (name) => [
      `ليلة الخميس.. وقت التقشير والماسك والدلع 🧖‍♀️ وجدي وجهك للويكاند!`,
      `كملي سمانتك بروتين عميق يخلي وجهك يضوي غدوة ✨`,
      `تعب السمانة كامل يروح بروتين هادي ليلة الخميس.. تهلاي في روحك 🌙`,
    ],
    // 🧴 Product Injection
    product: (name, pName) => [
      `قبل ما ترقدي، ما تنسايش خطوة الـ ${pName}.. بشرتك رح تشكرك غدوة 🌙`,
      `الـ ${pName} هو اللمسة الأخيرة لنهار اليوم.. تصبحي على خير ✨`,
      `روتين الليل ما يكملش بلا ${pName}.. وقت العناية!`,
    ]
  }
};

// ==============================================================================
// 4. THE BRAIN: MESSAGE GENERATOR
// ==============================================================================

const generateSmartMessage = (type, date, name, savedProducts, settings) => {
  const season = getSeason(date);
  const goal = getPrimaryGoal(settings);
  const day = date.getDay(); // 0 = Sunday, 5 = Friday
  const isFriday = day === 5;
  const isThursday = day === 4;
  const isWeekend = day === 5 || day === 6; // Friday & Saturday in Algeria
  
  // Decide "Strategy" (Probability Engine)
  const roll = Math.random(); // 0.0 to 1.0

  // 🚨 CRITICAL CHECK: IF SHELF IS EMPTY, FORCE EMPTY MESSAGE
  if (!savedProducts || savedProducts.length === 0) {
    const msgList = MESSAGES[type].empty(name);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }

  // --- STRATEGY 1: PRODUCT INJECTION (35% Chance) ---
  // Only if user has products saved
  if (savedProducts && savedProducts.length > 0 && roll < 0.35) {
    const p = savedProducts[Math.floor(Math.random() * savedProducts.length)];
    // Clean product name (first 2 words usually enough)
    const pName = p.productName ? p.productName.split(' ').slice(0, 2).join(' ') : 'منتجك';
    const msgList = MESSAGES[type].product(name, pName);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }

  // --- STRATEGY 2: SPECIAL DAYS (Friday/Thursday Night/Weekend) ---
  if (type === 'morning' && isFriday) {
    const msgList = MESSAGES.morning.friday(name);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }
  if (type === 'morning' && isWeekend && roll > 0.7) { // Sometimes trigger weekend specific vibe
    const msgList = MESSAGES.morning.weekend(name);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }
  if (type === 'evening' && isThursday) {
    const msgList = MESSAGES.evening.thursdayNight(name);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }

  // --- STRATEGY 3: GOAL ORIENTED (30% Chance) ---
  if (goal !== 'general' && roll < 0.65) {
    // Check if we have messages for this specific goal
    let goalKey = null;
    if (goal.includes('acne')) goalKey = 'acne';
    else if (goal.includes('aging') || goal.includes('wrinkles')) goalKey = 'anti_aging';
    else if (goal.includes('bright') || goal.includes('pigment')) goalKey = 'brightening';

    // If valid goal key exists in the current type (morning/evening) bank
    if (goalKey && MESSAGES[type][goalKey]) {
        const msgList = MESSAGES[type][goalKey](name);
        return msgList[Math.floor(Math.random() * msgList.length)];
    }
  }

  // --- STRATEGY 4: SEASONAL FALLBACK (Default) ---
  // If nothing else picked, give seasonal advice
  const seasonBank = MESSAGES[type][season](name);
  return seasonBank[Math.floor(Math.random() * seasonBank.length)];
};


// ==============================================================================
// 5. PERMISSIONS & REGISTRATION
// ==============================================================================

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('oilguard-smart', {
      name: 'Smart Skincare Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5A9C84',
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
        console.log('Failed to get push token for push notification!');
        return;
    }
  }
}

// ==============================================================================
// 6. THE 7-DAY SMART SCHEDULER
// ==============================================================================

export async function scheduleAuthenticNotifications(userName, savedProducts, settings) {
  // 1. Wipe clean to avoid duplicates/stale messages
  await Notifications.cancelAllScheduledNotificationsAsync();

  // 2. Prepare Data
  const firstName = userName?.split(' ')[0] || 'غالية';
  const today = new Date();
  const isEmptyShelf = !savedProducts || savedProducts.length === 0;

  // 3. Loop: Schedule next 7 days individually
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const dayOfWeek = targetDate.getDay(); // 0-6

    // --- ALGERIAN WEEKEND LOGIC (Fri/Sat) ---
    // On weekends, people sleep late. Schedule morning alert for 10:30 AM
    // On weekdays, schedule for 9:00 AM
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const morningHour = isWeekend ? 10 : 9;
    const morningMinute = isWeekend ? 30 : 0;

    // --- A. MORNING TRIGGER ---
    const morningTrigger = new Date(targetDate);
    morningTrigger.setHours(morningHour, morningMinute, 0, 0);

    // Only schedule if time is in the future
    if (morningTrigger > new Date()) {
        const msg = generateSmartMessage('morning', targetDate, firstName, savedProducts, settings);
        
        await Notifications.scheduleNotificationAsync({
          content: {
            // Vary the title on weekends too
            title: isWeekend ? "صباح العطلة والدلع ☕" : "صباح السرور ☀️",
            body: msg,
            data: { screen: 'routine', period: 'am' }, // Deep Link Data
            sound: true,
          },
          // FIX: Explicitly define the type and use timestamp to prevent object serialization errors
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: morningTrigger.getTime()
          },
        });
    }

    // --- B. EVENING TRIGGER (Always 9:30 PM) ---
    const eveningTrigger = new Date(targetDate);
    eveningTrigger.setHours(21, 30, 0, 0);

    if (eveningTrigger > new Date()) {
        const msg = generateSmartMessage('evening', targetDate, firstName, savedProducts, settings);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "الوقت 🌙",
            body: msg,
            data: { screen: 'routine', period: 'pm' }, // Deep Link Data
            sound: true,
          },
          // FIX: Explicitly define the type and use timestamp to prevent object serialization errors
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: eveningTrigger.getTime()
          },
        });
    }
  }

  console.log(`📅 Smart Schedule Updated: ${firstName}, ${getSeason(today)}, ${savedProducts?.length} Products`);
}