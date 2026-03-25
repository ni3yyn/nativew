// src/utils/gamificationEngine.js

export const BOUNTY_REWARDS = {
    ingredients: 100,      // الأصعب والأكثر قيمة
    newProduct: 150,       // إضافة منتج غير موجود
    marketingClaims: 30,   // المميزات
    targetTypes: 30,       // الفئة المستهدفة
    price: 15,             // السعر
    quantity: 10,          // الحجم
    country: 10,           // المنشأ
    default: 10            // الافتراضي
};

export const USER_LEVELS =[
    { id: 1, name: 'عضوة مبتدئة', minPoints: 0, icon: 'seedling', color: '#8BC34A' },
    { id: 2, name: 'مستكشفة الجمال', minPoints: 150, icon: 'search', color: '#03A9F4' },
    { id: 3, name: 'باحثة نشطة', minPoints: 500, icon: 'flask', color: '#9C27B0' },
    { id: 4, name: 'محللة محترفة', minPoints: 2000, icon: 'microscope', color: '#FF9800' },
    { id: 5, name: 'خبيرة وثيق', minPoints: 4500, icon: 'medal', color: '#FFC107' },
    { id: 6, name: 'أسطورة الكتالوج', minPoints: 10000, icon: 'crown', color: '#FFD700' },
];

export const getUserLevelData = (currentPoints) => {
    let currentLevel = USER_LEVELS[0];
    let nextLevel = USER_LEVELS[1];

    for (let i = 0; i < USER_LEVELS.length; i++) {
        if (currentPoints >= USER_LEVELS[i].minPoints) {
            currentLevel = USER_LEVELS[i];
            nextLevel = USER_LEVELS[i + 1] || USER_LEVELS[i]; 
        } else {
            break;
        }
    }

    const pointsNeeded = nextLevel.minPoints - currentLevel.minPoints;
    const pointsEarnedInLevel = currentPoints - currentLevel.minPoints;
    
    let progressPercent = 100;
    if (currentLevel.id !== nextLevel.id) {
        progressPercent = Math.min((pointsEarnedInLevel / pointsNeeded) * 100, 100);
    }

    return {
        currentLevel,
        nextLevel,
        progressPercent,
        pointsToNextLevel: nextLevel.minPoints - currentPoints
    };
};

export const getPointsForField = (field) => {
    return BOUNTY_REWARDS[field] || BOUNTY_REWARDS.default;
};