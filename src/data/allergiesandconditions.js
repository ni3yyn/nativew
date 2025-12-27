// --- START OF FILE src/data/allergiesandconditions.js ---
// UI-ONLY DEFINITIONS (No Logic/Ingredients here)

export const commonAllergies = [
    { id: 'nuts', name: 'حساسية المكسرات', description: 'حساسية تجاه المكسرات بأنواعها.' },
    { id: 'soy', name: 'حساسية الصويا', description: 'حساسية تجاه منتجات الصويا.' },
    { id: 'fragrance', name: 'حساسية العطور', description: 'تهيج من العطور الصناعية.' },
    { id: 'salicylates', name: 'حساسية الساليسيلات', description: 'حساسية تجاه مشتقات الأسبرين.' },
    { id: 'gluten', name: 'حساسية الغلوتين', description: 'حساسية القمح والشعير.' },
    { id: 'bees', name: 'حساسية منتجات النحل', description: 'العسل، العكبر، وشمع النحل.' }
];

export const basicSkinTypes = [
    { id: 'oily', label: 'دهنية' },
    { id: 'dry', label: 'جافة' },
    { id: 'combo', label: 'مختلطة' },
    { id: 'normal', label: 'عادية' }
];

export const basicScalpTypes = [
    { id: 'oily', label: 'دهنية' },
    { id: 'dry', label: 'جافة' },
    { id: 'normal', label: 'عادية' }
];

export const commonConditions = [
    // Skin Concerns
    { id: 'acne_prone', category: 'skin_concern', name: 'حب الشباب', description: 'معرضة للحبوب.' },
    { id: 'sensitive_skin', category: 'skin_concern', name: 'بشرة حساسة', description: 'سريعة التهيج.' },
    { id: 'rosacea_prone', category: 'skin_concern', name: 'الوردية', description: 'احمرار دائم.' },
    
    // Scalp Concerns
    { id: 'sensitive_scalp', category: 'scalp_concern', name: 'فروة رأس حساسة', description: 'حكة وتهيج.' },
    { id: 'dandruff', category: 'scalp_concern', name: 'قشرة الرأس', description: 'قشور مرئية.' },

    // General Health
    { id: 'pregnancy_nursing', category: 'health', name: 'الحمل والرضاعة', description: 'أمان الحمل.' },
    { id: 'high_blood_pressure', category: 'health', name: 'ضغط دم مرتفع', description: 'تجنب المحفزات.' }
];