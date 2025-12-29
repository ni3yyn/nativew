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
      `صباح الخير يا ${name} ☀️.. الرف فارغ! لنبدأ بإضافة أول منتج؟`,
      `يا ${name}، بشرتك تستحق العناية.. امسحي الكود وأضيفي منتجاتك الآن.`,
      `بداية جديدة.. اضغطي هنا لإضافة غسولك الصباحي إلى الرف 🧴`,
    ],
    // ❄️ Winter Mornings (Cold, Dry, Wind)
    winter: (name) => [
      `صباح الخير يا ${name} ❄️.. الجو بارد وينشف البشرة، رطبي بعمق!`,
      `يا ${name}، برد الصباح عدو الحاجز الجلدي.. لا تخرجي بدون ترطيب وحماية.`,
      `صباح النور.. التدفئة في الدار تنشف الوجه، عادليها بمرطب قوي.`,
      `طبقات الترطيب هي سر النضارة الشتوية ☃️`,
      `يا ${name}، لا تغسلي وجهك بماء ساخن.. الفاتر هو الأفضل في البرد!`,
    ],
    // ☀️ Summer Mornings (Heat, Sun, Sweat)
    summer: (name) => [
      `صباح النور يا ${name} ☀️.. شمس دزاير لا ترحم، زيدي كمية الواقي!`,
      `يا ${name}، الحرارة تفتح المسام.. غسول بارد وواقي شمس هم الحل.`,
      `صباحو! تذكري: الواقي يوضع قبل الخروج بـ 20 دقيقة، وليس عند الباب 😉`,
      `الجو حار والرطوبة عالية.. خففي الطبقات وركزي على الحماية 🛡️`,
      `يا ${name}، النظارة الشمسية تحمي عينيك، والواقي يحمي شبابك.`,
    ],
    // 🎯 Goal: Acne (Hib Chabab)
    acne: (name) => [
      `صباح التحدي يا ${name} 💪.. لا تلمسي الحبوب مهما كان الإغراء!`,
      `البكتيريا لا تحب النظافة.. روتينك الصباحي هو خط الدفاع الأول.`,
      `يا ${name} نظفي وجهك وانطلقي ✨`,
      `صباحو.. تذكري أن الصبر هو نصف العلاج مع حب الشباب.`,
    ],
    // 🎯 Goal: Brightening/Pigmentation (Taftih/Tassaboghat)
    brightening: (name) => [
      `يا ${name}، التفتيح يبدأ من الحماية.. الشمس هي عدوة البقع الأولى.`,
      `صباح الإشراق ✨.. فيتامين C اليوم هو أفضل صديق لبشرتك.`,
      `النضارة تريد الاستمرارية.. روتينك الصباحي يصنع الفرق.`,
    ],
    // 🎯 Goal: Anti-Aging (Tajaeed)
    anti_aging: (name) => [
      `صباح الشباب يا ${name} ✨.. 90% من التجاعيد سببها الشمس، احمي نفسك!`,
      `الترطيب هو سر الشباب الدائم.. شحال من كاس ما شربتي؟ 💧`,
      `يا ${name}، لا تنسي الرقبة واليدين عند وضع واقي الشمس.`,
    ],
    // 🕌 Friday Special (Jumu'ah)
    friday: (name) => [
      `يا ${name} 🕌.. اجعلي نور الوجه من نور الإيمان .`,
      `صباح الأنوار.. لا تنسي سورة الكهف.`,
      `يومك مبروك.. اغتسلي وتطيبي، ولا تنسي ترطيب وجهك الجميل ✨`,
      `يا ${name}، في يوم الجمعة.. الجمال جمال الروح، والعناية تزيدك تألقاً.`,
    ],
    // ☕ Weekend Vibes (Fri/Sat - Lazy Morning)
    weekend: (name) => [
      `صباح الدلع والعطلة ☕.. خذي وقتك في الروتين، لا عجلة اليوم.`,
      ` ${name}، صباح الراحة.. ماسك صباحي مع الفطور؟ علاش لالا! 🥒`,
      `نوضي براحتك.. البشرة المرتاحة هي بشرة نضرة.`,
    ],
    // 🧴 Product Injection
    product: (name, pName) => [
      `يا ${name}، ${pName} يناديكِ من الرف.. لا تتجاهليه 😉`,
      `صباحو! لا تنسي وضع ${pName}`,
      `تذكير سريع: ${pName} جاهز لمهمة الصباح.`,
      `بشرتك تسأل عن ${pName}.. هل وضعتيه؟`,
    ]
  },

  // 🌙 EVENING BANK
  evening: {
    empty: (name) => [
      `مساء الخير يا ${name} 🌙.. لا تتركي رفّك فارغاً، ابدئي الآن!`,
      `قبل النوم.. ما رأيك بمسح منتجاتك لترتيب روتينك؟ 📸`,
      `خطوة صغيرة للبدء.. اضغطي هنا لإضافة منتجاتك.`,
    ],
    // ❄️ Winter Nights
    winter: (name) => [
      `ليلة باردة يا ${name} 🥶.. بشرتك تحتاج طبقة ترطيب إضافية؟`,
      `التدفئة تجفف البشرة ليلاً.. عوضي ذلك بسيروم مرطب قبل النوم.`,
      `يا ${name}، الشفاه تجف بسرعة في الشتاء.. رطبيها الآن.`,
      `الليل طويل والجو بارد.. فرصة مثالية لماسك مغذي 🍯`,
    ],
    // ☀️ Summer Nights
    summer: (name) => [
      `يوم طويل وحار.. بشرتك تحتاج تتنفس، التنظيف المزدوج ضروري 🌙`,
      `تخلصي من طبقات الواقي والتعرق.. نامي بوجه خفيف ونظيف.`,
      `حرارة اليوم كانت قاسية.. بردي بشرتك بغسول لطيف.`,
    ],
    // 🎯 Goal: Acne
    acne: (name) => [
      `يا ${name}، غلاف الوسادة نظيف = وجه نظيف.. غيرتيه مؤخراً؟`,
      `عالجي الحبوب الآن لتختفي غداً.. التزامك يصنع الفرق.`,
      `لا تعبثي بالحبوب أمام المرآة! 🚫.. ضعي العلاج ونامي.`,
      `غسولك المسائي هو أهم خطوة لقتل البكتيريا اليوم.`,
    ],
    // 🎯 Goal: Anti-Aging
    anti_aging: (name) => [
      `تصبحي على خير.. الليل هو وقت الريتينول والترميم 🌙`,
      `يا ${name}، نامي على ظهرك لتجنب خطوط النوم.. نصيحة خبيرة 😉`,
      `السيروم الليلي يعمل وأنتِ نائمة.. لا تحرمي بشرتك منه.`,
    ],
    // 🛁 Thursday Night (Pre-Weekend/Hammam vibes)
    thursdayNight: (name) => [
      `ليلة الجمعة.. وقت الدلع، التقشير، والماسك يا ${name} ✨`,
      `حضري بشرتك للويكند.. روتين عميق وتصبحين على خير 🌙`,
      `الخميس الونيس.. كمليه بروتين يخلي وجهك يضوي.`,
      `يا ${name}، هل قمتِ بالتقشير الأسبوعي؟ الليلة وقت مناسب.`,
    ],
    // 🧴 Product Injection
    product: (name, pName) => [
      `قبل النوم.. ${pName} هو المكافأة التي تستحقينها ✨`,
      `وينك يا ${name}؟ ${pName} جاهز لمهمة الليل.`,
      `لا تنسي ${pName}.. بشرتك ستشكرك في الصباح.`,
      `خطوة صغيرة بـ ${pName}، ونتيجة كبيرة غداً.`,
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

  const targetScreen = isEmptyShelf ? 'oilguard' : 'routine';

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
            title: isWeekend ? "صباح العطلة والدلع ☕" : "صباح النشاط ☀️",
            body: msg,
            data: { screen: 'routine', period: 'am' }, // Deep Link Data
            sound: true,
          },
          trigger: morningTrigger,
        });
    }

    // --- B. EVENING TRIGGER (Always 9:30 PM) ---
    const eveningTrigger = new Date(targetDate);
    eveningTrigger.setHours(21, 30, 0, 0);

    if (eveningTrigger > new Date()) {
        const msg = generateSmartMessage('evening', targetDate, firstName, savedProducts, settings);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "روتينك المسائي 🌙",
            body: msg,
            data: { screen: 'routine', period: 'pm' }, // Deep Link Data
            sound: true,
          },
          trigger: eveningTrigger,
        });
    }
  }

  console.log(`📅 Smart Schedule Updated: ${firstName}, ${getSeason(today)}, ${savedProducts?.length} Products`);
}