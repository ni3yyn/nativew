export const PRODUCT_TYPES = [
    { id: 'cleanser', labelKey: 'product_type_cleanser', icon: 'soap' },
    { id: 'skin_serum', labelKey: 'product_type_skin_serum', icon: 'flask' },
    { id: 'lotion_cream', labelKey: 'product_type_lotion_cream', icon: 'hand-holding-water' },
    { id: 'sunscreen', labelKey: 'product_type_sunscreen', icon: 'sun' },
    { id: 'toner', labelKey: 'product_type_toner', icon: 'tint' },
    { id: 'eye_cream', labelKey: 'product_type_eye_cream', icon: 'eye' }, // New
    { id: 'mask', labelKey: 'product_type_mask', icon: 'mask' },
    { id: 'scrub', labelKey: 'product_type_scrub', icon: 'cookie' }, // New
    
    // Hair Categories
    { id: 'shampoo', labelKey: 'product_type_shampoo', icon: 'spa' },
    { id: 'conditioner', labelKey: 'product_type_conditioner', icon: 'pump-soap' }, // New
    { id: 'hair_mask', labelKey: 'product_type_hair_mask', icon: 'hand-sparkles' },
    { id: 'hair_serum', labelKey: 'product_type_hair_serum', icon: 'spray-can' }, // New (Split)
    { id: 'oil_blend', labelKey: 'product_type_oil_blend', icon: 'leaf' },
    { id: 'oil_replacement', labelKey: 'product_type_oil_replacement', icon: 'water' },

    
    // Body Categories
    { id: 'body_wash', labelKey: 'product_type_body_wash', icon: 'bath' }, // New
    
    { id: 'other', labelKey: 'product_type_other', icon: 'shopping-bag' },
];

export const getClaimsByProductType = (productType) => {
    const claimsByProduct = {
        shampoo: [ "تنظيف لطيف", "تنظيف عميق", "تنقية فروة الرأس", "مضاد للقشرة", "مخصص للشعر الدهني", "مخصص للشعر الجاف", "مضاد لتساقط الشعر", "تعزيز النمو", "تكثيف الشعر", "مرطب للشعر", "تغذية الشعر", "إصلاح الشعر المتضرر", "تلميع ولمعان", "تنعيم الشعر", "مكافحة التجعد", "حماية اللون", "حماية من الحرارة", "مهدئ", "مضاد للالتهابات" ],
        
        conditioner: [ "تنعيم الشعر", "فك التشابك", "ترطيب مكثف", "إصلاح الشعر المتضرر", "حماية اللون", "تلميع ولمعان", "مكافحة التجعد", "تغذية الشعر", "مرطب للشعر" ], // New
        
        hair_mask: [ "ترطيب مكثف", "تغذية الشعر", "إصلاح الشعر المتضرر", "تقوية الشعر", "تنعيم الشعر", "مكافحة التجعد", "حماية اللون", "تلميع ولمعان", "مرطب للشعر" ],

        oil_replacement: [ "تنعيم الشعر", "مرطب للشعر", "ترطيب مكثف", "إصلاح الشعر المتضرر", "حماية اللون", "تلميع ولمعان", "مكافحة التجعد", "تغذية الشعر", "فك التشابك" ], // New
        
        hair_serum: [ "تلميع ولمعان", "مكافحة التجعد", "حماية من الحرارة", "إصلاح الشعر المتضرر", "تنعيم الشعر", "ترطيب للشعر", "تغذية الشعر", "حماية اللون", "تعزيز النمو", "مضاد لتساقط الشعر" ], // New (Split from generic serum)
        
        skin_serum: [ "مرطب للبشرة", "مكافحة التجاعيد", "شد البشرة", "تحفيز الكولاجين", "مضاد للأكسدة", "تفتيح البشرة", "توحيد لون البشرة", "تفتيح البقع الداكنة", "تفتيح تحت العين", "مهدئ", "مضاد للالتهابات", "للبشرة الجافة", "للبشرة الحساسة", "للبشرة الدهنية", "تنقية المسام", "توازن الزيوت", "مضاد لحب الشباب", "مضاد للرؤوس السوداء", "تقشير لطيف" ], // Renamed from 'serum'
        
        oil_blend: [ "مرطب للبشرة", "مرطب للشعر", "تغذية الشعر", "تعزيز النمو", "مكافحة التجاعيد", "شد البشرة", "تفتيح البقع الداكنة", "إصلاح الشعر المتضرر", "تلميع ولمعان", "مكافحة التجعد", "مخصص للشعر الدهني", "مخصص للشعر الجاف", "مضاد للأكسدة", "مهدئ", "مضاد للالتهابات", "إزالة المكياج" ],
        
        lotion_cream: [ "مرطب للبشرة", "ترطيب مكثف", "للبشرة الجافة", "للبشرة الحساسة", "للبشرة الدهنية", "مهدئ", "مضاد للأكسدة", "مكافحة التجاعيد", "شد البشرة", "تحفيز الكولاجين", "تفتيح البشرة", "توحيد لون البشرة", "تفتيح البقع الداكنة", "تنقية المسام", "شد الجسم" ],
        
        eye_cream: [ "تفتيح تحت العين", "مكافحة التجاعيد", "شد البشرة", "ترطيب مكثف", "مهدئ", "مضاد للأكسدة", "تحفيز الكولاجين" ], // New
        
        sunscreen: [ "حماية من الشمس", "حماية واسعة الطيف", "مقاوم للماء", "مرطب للبشرة", "توحيد لون البشرة", "للبشرة الحساسة", "للبشرة الدهنية", "للبشرة الجافة", "مهدئ", "مضاد للأكسدة" ],
        
        cleanser: [ "تنظيف عميق", "تنظيف لطيف", "إزالة المكياج", "للبشرة الدهنية", "للبشرة الجافة", "للبشرة الحساسة", "تنقية المسام", "مضاد لحب الشباب", "تقشير لطيف", "مرطب للبشرة", "مهدئ", "توازن الحموضة", "تفتيح البشرة" ],
        
        body_wash: [ "تنظيف لطيف", "تنظيف عميق", "ترطيب مكثف", "للبشرة الحساسة", "إزالة السيلوليت", "شد الجسم", "تقشير لطيف", "مهدئ" ], // New
        
        scrub: [ "تقشير", "تقشير لطيف", "تنقية المسام", "تنظيف عميق", "تفتيح البشرة", "تنعيم الشعر", "إزالة السيلوليت" ], // New
        
        toner: [ "مرطب للبشرة", "تهدئة البشرة", "توازن الحموضة", "تقشير لطيف", "تنقية المسام", "قابض للمسام", "مضاد للأكسدة", "للبشرة الحساسة", "تفتيح البشرة" ],
        
        mask: [ "تنقية عميقة", "ترطيب مكثف", "تفتيح البشرة", "توحيد لون البشرة", "شد البشرة", "تهدئة البشرة", "تقشير", "تنقية المسام", "مضاد لحب الشباب", "للبشرة الدهنية" ],
        
        other: [ "مرطب للشعر", "مرطب للبشرة", "مهدئ", "مضاد للأكسدة", "مضاد للالتهابات", "تفتيح البشرة", "توحيد لون البشرة", "مكافحة التجاعيد", "تنقية المسام", "مضاد لحب الشباب" ]
    };
    
    // Handle legacy 'serum' ID if present in old data by defaulting to skin_serum
    if (productType === 'serum') return claimsByProduct.skin_serum;

    return claimsByProduct[productType] || claimsByProduct.other;
};

export const COUNTRIES = [
    { id: 'Algeria', label: 'Algeria' },
    { id: 'Australia', label: 'Australia' },
    { id: 'Bahrain', label: 'Bahrain' },
    { id: 'Belgium', label: 'Belgium' },
    { id: 'Brazil', label: 'Brazil' },
    { id: 'Canada', label: 'Canada' },
    { id: 'China', label: 'China' },
    { id: 'Egypt', label: 'Egypt' },
    { id: 'France', label: 'France' },
    { id: 'Germany', label: 'Germany' },
    { id: 'Greece', label: 'Greece' },
    { id: 'India', label: 'India' },
    { id: 'Iraq', label: 'Iraq' },
    { id: 'Italy', label: 'Italy' },
    { id: 'Japan', label: 'Japan' },
    { id: 'Jordan', label: 'Jordan' },
    { id: 'Korea', label: 'Korea' },
    { id: 'Kuwait', label: 'Kuwait' },
    { id: 'Lebanon', label: 'Lebanon' },
    { id: 'Libya', label: 'Libya' },
    { id: 'Morocco', label: 'Morocco' },
    { id: 'Netherlands', label: 'Netherlands' },
    { id: 'Oman', label: 'Oman' },
    { id: 'Palestine', label: 'Palestine' },
    { id: 'Poland', label: 'Poland' },
    { id: 'Qatar', label: 'Qatar' },
    { id: 'Saudi Arabia', label: 'Saudi Arabia' },
    { id: 'Spain', label: 'Spain' },
    { id: 'Sweden', label: 'Sweden' },
    { id: 'Switzerland', label: 'Switzerland' },
    { id: 'Syria', label: 'Syria' },
    { id: 'Tunisia', label: 'Tunisia' },
    { id: 'Turkey', label: 'Turkey' },
    { id: 'UAE', label: 'UAE' },
    { id: 'UK', label: 'UK' },
    { id: 'USA', label: 'USA' },
    { id: 'Other', label: 'Other' }
];