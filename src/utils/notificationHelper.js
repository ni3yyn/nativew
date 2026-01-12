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

const getSeason = (date) => {
  const month = date.getMonth(); // 0 = Jan, 11 = Dec
  if (month >= 4 && month <= 9) return 'summer'; 
  return 'winter';
};

const getPrimaryGoal = (settings) => {
  if (!settings?.goals || settings.goals.length === 0) return 'general';
  return settings.goals[Math.floor(Math.random() * settings.goals.length)]; 
};

// ==============================================================================
// 3. PRODUCT TYPE MESSAGE BANK (NEW)
// ==============================================================================

const PRODUCT_SPECIFIC_MESSAGES = {
  // --- 🧴 SKINCARE ---
  cleanser: {
    morning: (name, pName) => [
      `صباح الانتعاش يا ${name} 💦.. ابدئي يومك بـ ${pName} لنظافة مثالية.`,
      `يا ${name}، ${pName} يستناك باش تنحي زيوت النوم وتنعشي وجهك.`,
      `الخطوة الأولى لنهار ناجح؟ غسل الوجه بـ ${pName} ✨`
    ],
    evening: (name, pName) => [
      `يا ${name}، ${pName} هو الحل لنحّي غبار وتعب النهار.`,
      `النظافة المزدوجة تبدأ من هنا.. لا ترقدي قبل استعمال ${pName}.`,
      `بشرتك محتاجة تتنفس.. ${pName} جاهز للمهمة 🫧`
    ]
  },
  sunscreen: {
    morning: (name, pName) => [
      `الشمس ما ترحمش يا ${name} ☀️.. ما تخرجيش بلا ${pName}!`,
      `يا ${name}، واقي الشمس ${pName} هو أهم خطوة للحفاظ على شبابك.`,
      `قبل المايكب والخروج.. تأكدي أنك وضعتي ${pName} 😉`
    ],
    evening: (name, pName) => [
      // Fallback if sunscreen is picked at night (rare logic catch)
      `يا ${name}، جهزي ${pName} لغدوة الصباح.. الحماية تبدأ بالتخطيط!`,
      `تذكرة مسائية: لا تنسي ${pName} غداً صباحاً ☀️`
    ]
  },
  serum: {
    morning: (name, pName) => [
      `فيتامينات الصباح! 🍊.. ${pName} يعطيك النضارة اللي تحتاجيها.`,
      `يا ${name}، ${pName} تحت الواقي الشمسي يعطي مفعول سحري.`,
    ],
    evening: (name, pName) => [
      `وقت العلاج الليلي 🌙.. ${pName} يخدم وأنتِ راقدة.`,
      `يا ${name}، ${pName} هو الغذاء اللي تحتاجه بشرتك باش تتجدد في الليل.`,
    ]
  },
  lotion_cream: {
    morning: (name, pName) => [
      `الترطيب هو سر اللمعة ✨.. لا تنسي ${pName}.`,
      `يا ${name}، احمي حاجز بشرتك اليوم بـ ${pName}.`,
    ],
    evening: (name, pName) => [
      `تصبحي على خير وترطيب 💧.. ${pName} يحمي وجهك من جفاف الليل.`,
      `يا ${name}، كملي روتينك بـ ${pName} لنعومة الصباح.`,
    ]
  },
  toner: {
    morning: (name, pName) => [
      `انتعاش فوري! رشة من ${pName} تعدل المزاج والبشرة.`,
    ],
    evening: (name, pName) => [
      `تأكدي من نظافة المسام وتوازن البشرة بـ ${pName} 🌿`,
    ]
  },
  
  // --- 💇‍♀️ HAIR CARE ---
  shampoo: {
    morning: (name, pName) => [
      `يوم غسل الشعر؟ 🚿 ${pName} راهو يستنا.`,
      `يا ${name}، الانتعاش يبدأ بشعر نظيف مع ${pName}.`,
    ],
    evening: (name, pName) => [
      `اذا كان الدوش الليلة.. ${pName} هو رفيقك.`,
    ]
  },
  hair_mask: {
    morning: (name, pName) => [
      `ويكند؟ وقت الدلع لشعرك بـ ${pName} 🥑`,
      `يا ${name}، شعرك يطلب التغذية.. لا تبخلي عليه بـ ${pName}.`,
    ],
    evening: (name, pName) => [
      `ليلة العناية بالشعر ✨.. طبقي ${pName} واسترخي.`,
      `يا ${name}، شعرك محتاج ترميم.. ${pName} هو الحل الليلة.`,
    ]
  },
  oil_blend: {
    morning: (name, pName) => [
      `لمسة لمعان لشعرك قبل الخروج بـ ${pName} ✨`,
    ],
    evening: (name, pName) => [
      `حمام زيت؟ ${pName} يعالج شعرك بعمق الليلة.`,
      `دلكي فروة رأسك بـ ${pName} لتنشيط الدورة الدموية قبل النوم.`,
    ]
  },

  // --- 🧴 GENERIC FALLBACK ---
  other: {
    morning: (name, pName) => [
      `صباح الخير يا ${name}.. لا تنسي استخدام ${pName} اليوم!`,
      `منتجك ${pName} يناديكِ من الرف 😉`,
    ],
    evening: (name, pName) => [
      `يا ${name}، ${pName} جاهز ضمن روتينك المسائي.`,
      `لا تهملي ${pName} قبل النوم للحصول على أفضل النتائج.`,
    ]
  }
};

// ==============================================================================
// 4. THE GENERAL MESSAGE BANK (CONTEXT ONLY)
// ==============================================================================

const MESSAGES = {
  // 🌅 MORNING BANK (General Vibes)
  morning: {
    empty: (name) => [
      `صباح الخير يا ${name} ☀️.. لنبدأ بإضافة أول منتج؟`,
      `يا ${name}، بشرتك تستحق العناية.. وأضيفي منتجاتك الآن.`,
      `بداية جديدة..مرحبا بك يا ${name} 🧴`,
    ],
    winter: (name) => [
      `صباح الخير يا ${name} ❄️.. الجو بارد، رطبي بعمق!`,
      `يا ${name}، برد الصباح عدو البشرة.. لا تخرجي بدون حماية.`,
      `صباح النور.. التدفئة تنشف الوجه، عادليها بمرطب قوي.`,
    ],
    summer: (name) => [
      `صباح النور يا ${name} ☀️!`,
      `يا ${name}، الحرارة تفتح المسام.. غسول بارد وواقي شمس هم الحل.`,
      `صباحو! تذكري: الواقي يوضع قبل الخروج بـ 20 دقيقة.`,
    ],
    acne: (name) => [
      `صباح التحدي يا ${name} 💪.. روتينك الصباحي هو خط الدفاع الأول.`,
      `يا ${name} نظفي وجهك وانطلقي ✨`,
    ],
    brightening: (name) => [
      `يا ${name}، التفتيح يبدأ من الحماية.. الشمس هي عدوة البقع الأولى.`,
      `صباح الإشراق ✨.. فيتامين C اليوم هو أفضل صديق لبشرتك.`,
    ],
    anti_aging: (name) => [
      `صباح الشباب يا ${name} ✨.. احمي نفسك من الشمس!`,
      `الترطيب هو سر الشباب الدائم.. شحال من كاس ما شربتي؟ 💧`,
    ],
    friday: (name) => [
      `يا ${name} 🕌.. جمعة مباركة، لا تنسي سورة الكهف وترطيب وجهك الجميل.`,
      `يومك مبروك.. اغتسلي وتطيبي، وزيدي النور نورين بالعناية ✨`,
    ],
    weekend: (name) => [
      `صباح الدلع والعطلة ☕.. خذي وقتك في الروتين.`,
      ` ${name}، صباح الراحة.. ماسك صباحي مع الفطور؟`,
    ]
  },

  // 🌙 EVENING BANK (General Vibes)
  evening: {
    empty: (name) => [
      `مساء الخير يا ${name} 🌙.. لا تتركي رفّك فارغاً.`,
      `قبل النوم.. ما رأيك بمسح منتجاتك لترتيب روتينك؟ 📸`,
    ],
    winter: (name) => [
      `ليلة باردة يا ${name} 🥶.. بشرتك تحتاج طبقة ترطيب إضافية؟`,
      `الليل طويل والجو بارد.. فرصة مثالية لماسك مغذي 🍯`,
    ],
    summer: (name) => [
      `يوم طويل وحار.. بشرتك تحتاج تتنفس، التنظيف المزدوج ضروري 🌙`,
      `تخلصي من طبقات الواقي والتعرق.. نامي بوجه خفيف ونظيف.`,
    ],
    acne: (name) => [
      `يا ${name}، غلاف الوسادة نظيف = وجه نظيف.. غيرتيه مؤخراً؟`,
      `عالجي الحبوب الآن لتختفي غداً.. التزامك يصنع الفرق.`,
    ],
    anti_aging: (name) => [
      `تصبحي على خير.. الليل هو وقت الريتينول والترميم 🌙`,
      `السيروم الليلي يعمل وأنتِ نائمة.. لا تحرمي بشرتك منه.`,
    ],
    thursdayNight: (name) => [
      `ليلة الجمعة.. وقت الدلع، التقشير، والماسك يا ${name} ✨`,
      `حضري بشرتك للويكند.. روتين عميق وتصبحين على خير 🌙`,
    ]
  }
};

// ==============================================================================
// 5. THE BRAIN: MESSAGE GENERATOR
// ==============================================================================

const generateSmartMessage = (type, date, name, savedProducts, settings) => {
  const season = getSeason(date);
  const goal = getPrimaryGoal(settings);
  const day = date.getDay(); // 0 = Sunday, 5 = Friday
  const isFriday = day === 5;
  const isThursday = day === 4;
  const isWeekend = day === 5 || day === 6; 
  
  // Decide "Strategy" (Probability Engine)
  const roll = Math.random(); 

  // 🚨 CRITICAL CHECK: EMPTY SHELF
  if (!savedProducts || savedProducts.length === 0) {
    const msgList = MESSAGES[type].empty(name);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }

  // --- STRATEGY 1: PRODUCT INJECTION (40% Chance) ---
  // UPDATED LOGIC: Context Aware based on Product Type
  if (savedProducts && savedProducts.length > 0 && roll < 0.40) {
    // 1. Pick a random product
    const p = savedProducts[Math.floor(Math.random() * savedProducts.length)];
    const pName = p.productName ? p.productName.split(' ').slice(0, 2).join(' ') : 'منتجك';
    const pType = p.productType || 'other'; // Default to 'other' if undefined

    // 2. Special Case: Don't suggest Sunscreen at night
    if (type === 'evening' && pType === 'sunscreen') {
       // Either pick generic evening message or force a 'cleanser' generic message
       const msgList = PRODUCT_SPECIFIC_MESSAGES.sunscreen.evening(name, pName);
       return msgList[Math.floor(Math.random() * msgList.length)];
    }

    // 3. Get specific messages for this type & time
    const typeMessages = PRODUCT_SPECIFIC_MESSAGES[pType] || PRODUCT_SPECIFIC_MESSAGES.other;
    const timeMessages = typeMessages[type] || PRODUCT_SPECIFIC_MESSAGES.other[type];
    
    // 4. Return random specific message
    return timeMessages[Math.floor(Math.random() * timeMessages.length)];
  }

  // --- STRATEGY 2: SPECIAL DAYS ---
  if (type === 'morning' && isFriday) {
    const msgList = MESSAGES.morning.friday(name);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }
  if (type === 'morning' && isWeekend && roll > 0.7) { 
    const msgList = MESSAGES.morning.weekend(name);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }
  if (type === 'evening' && isThursday) {
    const msgList = MESSAGES.evening.thursdayNight(name);
    return msgList[Math.floor(Math.random() * msgList.length)];
  }

  // --- STRATEGY 3: GOAL ORIENTED (30% Chance) ---
  if (goal !== 'general' && roll < 0.70) {
    let goalKey = null;
    if (goal.includes('acne')) goalKey = 'acne';
    else if (goal.includes('aging') || goal.includes('wrinkles')) goalKey = 'anti_aging';
    else if (goal.includes('bright') || goal.includes('pigment')) goalKey = 'brightening';

    if (goalKey && MESSAGES[type][goalKey]) {
        const msgList = MESSAGES[type][goalKey](name);
        return msgList[Math.floor(Math.random() * msgList.length)];
    }
  }

  // --- STRATEGY 4: SEASONAL FALLBACK ---
  const seasonBank = MESSAGES[type][season](name);
  return seasonBank[Math.floor(Math.random() * seasonBank.length)];
};


// ==============================================================================
// 6. PERMISSIONS & REGISTRATION (UNCHANGED)
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
        return;
    }
  }
}

// ==============================================================================
// 7. SCHEDULER
// ==============================================================================

export async function scheduleAuthenticNotifications(userName, savedProducts, settings) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const firstName = userName?.split(' ')[0] || 'غالية';
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const dayOfWeek = targetDate.getDay(); 

    // Weekend Logic (Fri/Sat in Algeria)
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const morningHour = isWeekend ? 10 : 9;
    const morningMinute = isWeekend ? 30 : 0;

    // A. MORNING
    const morningTrigger = new Date(targetDate);
    morningTrigger.setHours(morningHour, morningMinute, 0, 0);

    if (morningTrigger > new Date()) {
        const msg = generateSmartMessage('morning', targetDate, firstName, savedProducts, settings);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: isWeekend ? "صباح العطلة والدلع ☕" : "صباح السرور ☀️",
            body: msg,
            data: { screen: 'routine', period: 'am' },
            sound: true,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morningTrigger.getTime() },
        });
    }

    // B. EVENING
    const eveningTrigger = new Date(targetDate);
    eveningTrigger.setHours(21, 30, 0, 0);

    if (eveningTrigger > new Date()) {
        const msg = generateSmartMessage('evening', targetDate, firstName, savedProducts, settings);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "راهو الليل 🌙",
            body: msg,
            data: { screen: 'routine', period: 'pm' },
            sound: true,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: eveningTrigger.getTime() },
        });
    }
  }
}