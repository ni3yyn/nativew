import { t } from '../i18n';

// 🌟 BOUNTY REWARDS (Aligned with Catalog & Community Actions)
export const BOUNTY_REWARDS = {
    newProduct: 200,       // Adding entirely new unlisted product
    ingredients: 100,      // Adding missing INCI ingredients list
    price: 50,             // Updating market price
    marketingClaims: 40,   // Adding product claims
    targetTypes: 40,       // Adding target skin/hair types
    category: 25,          // Setting category
    quantity: 30,          // Setting size/volume
    country: 10,           // Setting country of origin
    default: 10            
};

// 🌟 10-TIER PROGRESSION SYSTEM (Serious, Prestigious, Ending with 'أسطورة واثق')
export const USER_LEVELS = [
    { id: 1, nameKey: 'gamification_level_1', name: 'مبتدئة', minPoints: 0, icon: 'seedling' },
    { id: 2, nameKey: 'gamification_level_2', name: 'مستكشفة', minPoints: 150, icon: 'compass' },
    { id: 3, nameKey: 'gamification_level_3', name: 'متابعة نشطة', minPoints: 400, icon: 'user-check' },
    { id: 4, nameKey: 'gamification_level_4', name: 'باحثة', minPoints: 800, icon: 'search' },
    { id: 5, nameKey: 'gamification_level_5', name: 'محللة', minPoints: 1500, icon: 'flask' },
    { id: 6, nameKey: 'gamification_level_6', name: 'أخصائية', minPoints: 2500, icon: 'microscope' },
    { id: 7, nameKey: 'gamification_level_7', name: 'خبيرة', minPoints: 4000, icon: 'certificate' },
    { id: 8, nameKey: 'gamification_level_8', name: 'مستشارة', minPoints: 6500, icon: 'award' },
    { id: 9, nameKey: 'gamification_level_9', name: 'رائدة وثيق', minPoints: 10000, icon: 'gem' },
    { id: 10, nameKey: 'gamification_level_10', name: 'أسطورة وثيق', minPoints: 15000, icon: 'crown' },
];

export const getLocalizedLevelName = (level, language) => {
    if (!level) return '';
    if (level.nameKey) {
        const translated = t(level.nameKey, language);
        if (translated && translated !== level.nameKey) return translated;
    }
    return level.name || '';
};

export const getUserLevelData = (currentPoints = 0, language) => {
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

    const localizeLevel = (level) => {
        if (!level) return level;
        return {
            ...level,
            name: getLocalizedLevelName(level, language)
        };
    };

    return {
        currentLevel: localizeLevel(currentLevel),
        nextLevel: localizeLevel(nextLevel),
        progressPercent,
        pointsToNextLevel: Math.max(0, nextLevel.minPoints - currentPoints)
    };
};

export const getPointsForField = (field) => {
    return BOUNTY_REWARDS[field] || BOUNTY_REWARDS.default;
};
