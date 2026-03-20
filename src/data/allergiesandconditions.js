export const commonAllergies = [
    {
        id: 'nuts',
        name: { ar: 'حساسية المكسرات', en: 'Nut allergy' },
        description: { ar: 'حساسية تجاه المكسرات بأنواعها.', en: 'Allergy to different kinds of nuts.' }
    },
    {
        id: 'soy',
        name: { ar: 'حساسية الصويا', en: 'Soy allergy' },
        description: { ar: 'حساسية تجاه منتجات الصويا.', en: 'Allergy to soy-based products.' }
    },
    {
        id: 'fragrance',
        name: { ar: 'حساسية العطور', en: 'Fragrance allergy' },
        description: { ar: 'تهيج من العطور الصناعية.', en: 'Irritation from synthetic fragrances.' }
    },
    {
        id: 'salicylates',
        name: { ar: 'حساسية الساليسيلات', en: 'Salicylates allergy' },
        description: { ar: 'حساسية تجاه مشتقات الأسبرين.', en: 'Allergy to aspirin derivatives.' }
    },
    {
        id: 'gluten',
        name: { ar: 'حساسية الغلوتين', en: 'Gluten allergy' },
        description: { ar: 'حساسية القمح والشعير.', en: 'Sensitivity to wheat and barley.' }
    },
    {
        id: 'bees',
        name: { ar: 'حساسية منتجات النحل', en: 'Bee product allergy' },
        description: { ar: 'العسل، العكبر، وشمع النحل.', en: 'Honey, propolis, and beeswax.' }
    }
];

export const basicSkinTypes = [
    { id: 'oily', label: { ar: 'دهنية', en: 'Oily' } },
    { id: 'dry', label: { ar: 'جافة', en: 'Dry' } },
    { id: 'combo', label: { ar: 'مختلطة', en: 'Combination' } },
    { id: 'normal', label: { ar: 'عادية', en: 'Normal' } }
];

export const basicScalpTypes = [
    { id: 'oily', label: { ar: 'دهنية', en: 'Oily' } },
    { id: 'dry', label: { ar: 'جافة', en: 'Dry' } },
    { id: 'normal', label: { ar: 'عادية', en: 'Normal' } }
];

export const commonConditions = [
    // Skin Concerns
    {
        id: 'acne_prone',
        category: 'skin_concern',
        name: { ar: 'حب الشباب', en: 'Acne prone' },
        description: { ar: 'معرضة للحبوب.', en: 'Prone to breakouts.' }
    },
    {
        id: 'sensitive_skin',
        category: 'skin_concern',
        name: { ar: 'بشرة حساسة', en: 'Sensitive skin' },
        description: { ar: 'سريعة التهيج.', en: 'Easily irritated.' }
    },
    {
        id: 'rosacea_prone',
        category: 'skin_concern',
        name: { ar: 'الوردية', en: 'Rosacea' },
        description: { ar: 'احمرار دائم.', en: 'Persistent redness.' }
    },

    // Scalp Concerns
    {
        id: 'sensitive_scalp',
        category: 'scalp_concern',
        name: { ar: 'فروة رأس حساسة', en: 'Sensitive scalp' },
        description: { ar: 'حكة وتهيج.', en: 'Itching and irritation.' }
    },
    {
        id: 'dandruff',
        category: 'scalp_concern',
        name: { ar: 'قشرة الرأس', en: 'Dandruff' },
        description: { ar: 'قشور مرئية.', en: 'Visible flakes.' }
    },

    // General Health
    {
        id: 'pregnancy_nursing',
        category: 'health',
        name: { ar: 'الحمل والرضاعة', en: 'Pregnancy & nursing' },
        description: { ar: 'أمان الحمل.', en: 'Pregnancy safety.' }
    },
    {
        id: 'high_blood_pressure',
        category: 'health',
        name: { ar: 'ضغط دم مرتفع', en: 'High blood pressure' },
        description: { ar: 'تجنب المحفزات.', en: 'Avoid triggers.' }
    }
];
