// --- components/allergiesAndConditions.js ---

export const commonAllergies = [
    {
        id: 'nuts',
        name: 'حساسية المكسرات',
        description: 'حساسية تجاه المكسرات بأنواعها.',
        ingredients: [
            'زيت اللوز الحلو', 'Prunus Amygdalus Dulcis Oil', 'زيت الجوز', 'Juglans Regia Seed Oil', 'زيت البندق', 'Corylus Avellana Seed Oil', 'زيت المكاديميا', 'Macadamia Ternifolia Seed Oil', 'زيت الفستق', 'Pistacia Vera Seed Oil', 'زيت الكاجو', 'Anacardium Occidentale Seed Oil', 'زيت البقان', 'Carya Ovata Seed Oil', 'زيت الصنوبر', 'Pinus Sibirica Seed Oil', 'زيت اللوز المر', 'Prunus Amygdalus Amara (Bitter Almond) Oil', 'زيت الجوز الهندي', 'Semecarpus Anacardium Seed Oil', 'زيت الفول السوداني', 'Arachis Hypogaea (Peanut) Oil', 'زيت البندق الهندي', 'Semecarpus Anacardium Seed Oil', 'زيت عين الجمل', 'Juglans Regia (Walnut) Seed Oil', 'زيت الصنوبر الحلبي', 'Pinus Pinea Seed Oil', 'زيت الكستناء', 'Castanea Sativa Seed Oil', 'زيت الجوز البرازيلي', 'Bertholletia Excelsa Seed Oil', 'زبدة الشيا', 'Butyrospermum Parkii Butter', 'زيت الأرغان', 'Argania Spinosa Kernel Oil'
        ]
    },
    {
        id: 'soy',
        name: 'حساسية الصويا',
        description: 'حساسية تجاه منتجات الصويا.',
        ingredients: [
            'زيت الصويا', 'Glycine Soja Oil', 'بروتين الصويا', 'Hydrolyzed Soy Protein', 'ليسيثين', 'Lecithin', 'Soy Amino Acids', 'Glycine Soja (Soybean) Seed Extract', 'Glycine Soja (Soybean) Protein', 'Hydrolyzed Soybean Extract', 'Hydrolyzed Soybean Protein', 'Soy Isoflavones', 'Soybean Oil', 'Soybean Sterols', 'Soybean Unsaponifiables', 'Hydrolyzed Soy Flour', 'Hydrolyzed Soybean Flour', 'Glycine Soja (Soybean) Oil', 'Glycine Soja (Soybean) Seed Oil'
        ]
    },
    {
        id: 'fragrance',
        name: 'حساسية العطور',
        description: 'تهيج من العطور الصناعية أو بعض الزيوت العطرية.',
        ingredients: [
            'عطر', 'Fragrance', 'Parfum', 'Essential Oil Blend', 'Limonene', 'Linalool', 'Geraniol', 'Citronellol', 'Eugenol', 'Citral', 'Benzyl Benzoate', 'Benzyl Salicylate', 'Cinnamal', 'Cinnamyl Alcohol', 'Hexyl Cinnamal', 'Hydroxycitronellal', 'Isoeugenol', 'Amyl Cinnamal', 'Benzyl Alcohol', 'Benzyl Cinnamate', 'Farnesol', 'Amylcinnamyl Alcohol', 'Anise Alcohol', 'Coumarin', 'Evernia Prunastri (Oakmoss) Extract', 'Evernia Furfuracea (Treemoss) Extract', 'Alpha-Isomethyl Ionone', 'Alpha Hexylcinnamaldehyde', 'Hydroxyisohexyl 3-Cyclohexene Carboxaldehyde', 'Citral', 'Citronellol', 'Limonene', 'Linalool', 'Eugenol', 'Geraniol', 'Benzyl Salicylate'
        ]
    },
    {
        id: 'salicylates',
        name: 'حساسية الساليسيلات (الأسبرين)',
        description: 'حساسية تجاه مشتقات حمض الساليسيليك.',
        ingredients: [
            'حمض الساليسيليك', 'Salicylic Acid', 'مستخلص لحاء الصفصاف', 'Willow Bark Extract', 'Salix Alba (Willow) Bark Extract', 'Salix Nigra (Willow) Bark Extract', 'بيتين ساليسيلات', 'Betaine Salicylate', 'بنزيل ساليسيلات', 'Benzyl Salicylate', 'زيت وينترجرين', 'Gaultheria Procumbens (Wintergreen) Leaf Oil'
        ]
    },
    {
        id: 'gluten',
        name: 'حساسية الغلوتين',
        description: 'حساسية تجاه الغلوتين من مصادر مثل القمح والشعير.',
        ingredients: [
            'بروتين القمح', 'Hydrolyzed Wheat Protein', 'Wheat Amino Acids', 'زيت جنين القمح', 'Triticum Vulgare Germ Oil', 'مستخلص الشعير', 'Hordeum Vulgare Extract', 'بروتين الشوفان المتحلل', 'Hydrolyzed Oat Protein'
        ]
    },
    {
        id: 'bees',
        name: 'حساسية منتجات النحل',
        description: 'حساسية تجاه منتجات النحل مثل العسل أو العكبر.',
        ingredients: [
            'عسل', 'Honey', 'Mel', 'شمع العسل', 'Beeswax', 'Cera Alba', 'Cera Flava', 'العكبر', 'Propolis Extract', 'Propolis Cera', 'غذاء ملكات النحل', 'Royal Jelly Extract', 'حبوب لقاح النحل', 'Bee Pollen Extract'
        ]
    }
  ];
  
  // --- 1. BASIC TYPES (For Single Select Bio) ---
  // These are removed from commonConditions to avoid repetition in UI,
  // but exported so we can use their data logic.
  
  export const basicSkinTypes = [
      {
          id: 'oily', label: 'دهنية', // Changed ID to English for robust logic
          avoidIngredients: ['زيت جوز الهند', 'Cocos Nucifera Oil', 'زبدة الكاكاو', 'Theobroma Cacao Seed Butter', 'زيوت معدنية', 'Mineral Oil', 'Paraffinum Liquidum', 'Petrolatum', 'Isopropyl Myristate'],
          beneficialIngredients: ['حمض الساليسيليك', 'Salicylic Acid', 'نياسيناميد', 'Niacinamide', 'طين الكاولين', 'Kaolin', 'الزنك', 'Zinc PCA']
      },
      {
          id: 'dry', label: 'جافة',
          avoidIngredients: ['كحول مشوه', 'Alcohol Denat.', 'SD Alcohol', 'Sodium Lauryl Sulfate'],
          beneficialIngredients: ['حمض الهيالورونيك', 'Hyaluronic Acid', 'جليسرين', 'Glycerin', 'السيراميدات', 'Ceramide NP', 'زبدة الشيا', 'Butyrospermum Parkii Butter', 'السكوالان', 'Squalane', 'اليوريا', 'Urea']
      },
      {
          id: 'combo', label: 'مختلطة',
          avoidIngredients: ['Alcohol Denat'],
          beneficialIngredients: ['حمض الهيالورونيك', 'Hyaluronic Acid', 'نياسيناميد', 'Niacinamide', 'مستخلص الشاي الأخضر', 'Camellia Sinensis Leaf Extract']
      },
      {
          id: 'normal', label: 'عادية',
          avoidIngredients: [],
          beneficialIngredients: ['فيتامين C', 'Ascorbic Acid', 'حمض الهيالورونيك', 'Hyaluronic Acid', 'مضادات الأكسدة', 'Antioxidants']
      }
  ];
  
  export const basicScalpTypes = [
      {
          id: 'oily', label: 'دهنية',
          avoidIngredients: [ 'Dimethicone', 'Amodimethicone'],
          beneficialIngredients: ['زيت شجرة الشاي العطري', 'Melaleuca Alternifolia Leaf Oil', 'حمض الساليسيليك', 'Salicylic Acid', 'خل التفاح', 'Apple Cider Vinegar']
      },
      {
          id: 'dry', label: 'جافة',
          avoidIngredients: ['Sodium Lauryl Sulfate', 'SLS', 'كحول مشوه', 'Alcohol Denat.'],
          beneficialIngredients: ['عصير الألوفيرا', 'Aloe Barbadensis Leaf Juice', 'زيت الجوجوبا', 'Simmondsia Chinensis Seed Oil', 'حمض الهيالورونيك', 'Hyaluronic Acid']
      },
      {
          id: 'normal', label: 'عادية',
          avoidIngredients: [], beneficialIngredients: []
      }
  ];
  
  
  // --- 2. CONDITIONS (For Multi Select) ---
  // Specific concerns + "Sensitive" options as requested.
  
  export const commonConditions = [
    // Skin Concerns
    {
        id: 'acne_prone', category: 'skin_concern', name: 'حب الشباب', description: 'معرضة لظهور البثور والرؤوس السوداء.',
        avoidIngredients: ['زيت جوز الهند', 'Cocos Nucifera Oil', 'زبدة الكاكاو', 'Theobroma Cacao Seed Butter', 'Isopropyl Myristate', 'Isopropyl Palmitate', 'Laureth-4', 'Ethylhexyl Palmitate'],
        beneficialIngredients: ['حمض الساليسيليك', 'Salicylic Acid', 'بنزويل بيروكسيد', 'Benzoyl Peroxide', 'نياسيناميد', 'Niacinamide', 'حمض الأزيليك', 'Azelaic Acid', 'الريتينويدات', 'Retinoids']
    },
    {
        id: 'sensitive_skin', category: 'skin_concern', name: 'بشرة حساسة', description: 'بشرة سريعة التهيج والاحمرار.',
        avoidIngredients: ['عطر', 'Fragrance', 'Parfum', 'كحول مشوه', 'Alcohol Denat.', 'زيوت عطرية قوية', 'Limonene', 'Linalool', 'Sodium Lauryl Sulfate', 'Methylisothiazolinone'],
        beneficialIngredients: ['عصير الألوفيرا', 'Aloe Barbadensis Leaf Juice', 'مستخلص السنتيلا اسياتيكا', 'Centella Asiatica Extract', 'Madecassoside', 'البانثينول', 'Panthenol', 'بيسابولول', 'Bisabolol']
    },
    {
        id: 'rosacea_prone', category: 'skin_concern', name: 'الوردية', description: 'معرضة للاحمرار المستمر والشعيرات الدموية.',
        avoidIngredients: ['عطر', 'Fragrance', 'Parfum', 'كحول مشوه', 'Alcohol Denat.', 'منثول', 'Menthol', 'زيت النعناع', 'Peppermint Oil', 'بندق الساحرة', 'Witch Hazel', 'حمض الجليكوليك', 'Glycolic Acid'],
        beneficialIngredients: ['حمض الأزيليك', 'Azelaic Acid', 'نياسيناميد', 'Niacinamide', 'مستخلص عرق السوس', 'Glycyrrhiza Glabra Root Extract', 'مستخلص السنتيلا اسياتيكا', 'Centella Asiatica Extract']
    },
    
    // Scalp Concerns
    {
        id: 'sensitive_scalp', category: 'scalp_concern', name: 'فروة رأس حساسة', description: 'سريعة التهيج والحكة.',
        avoidIngredients: ['Sodium Lauryl Sulfate', 'SLS', 'عطر', 'Fragrance', 'Parfum', 'زيوت عطرية قوية', 'Strong Essential Oils'],
        beneficialIngredients: ['عصير الألوفيرا', 'Aloe Barbadensis Leaf Juice', 'كاموميل', 'Chamomilla Recutita Flower Extract', 'مستخلص الشوفان', 'Avena Sativa Kernel Extract']
    },
    {
        id: 'dandruff', category: 'scalp_concern', name: 'قشرة الرأس', description: 'وجود قشور بيضاء وحكة.',
        avoidIngredients: [],
        beneficialIngredients: ['بيريثيون الزنك', 'Zinc Pyrithione', 'كيتوكونازول', 'Ketoconazole', 'زيت شجرة الشاي', 'Tea Tree Oil', 'حمض الساليسيليك', 'Salicylic Acid']
    },
  
    // General Health
    {
        id: 'pregnancy_nursing', category: 'health', name: 'الحمل والرضاعة', description: 'مكونات ينصح بتجنبها أثناء الحمل.',
        avoidIngredients: [
            'Retinol', 'Retinal', 'Retinaldehyde', 'Tretinoin', 'Adapalene', 'Tazarotene', 'Retinyl Palmitate', 
            'حمض الساليسيليك (بتركيزات عالية)', 'Salicylic Acid',
            'هيدروكينون', 'Hydroquinone',
            'زيت إكليل الجبل العطري', 'Rosmarinus Officinalis Leaf Oil'
        ],
        beneficialIngredients: ['حمض الهيالورونيك', 'Hyaluronic Acid', 'فيتامين C', 'Ascorbic Acid', 'حمض الأزيليك', 'Azelaic Acid']
    },
    {
        id: 'high_blood_pressure', category: 'health', name: 'ضغط دم مرتفع', description: 'تجنب زيوت عطرية محفزة.',
        avoidIngredients: ['زيت إكليل الجبل العطري', 'Rosmarinus Officinalis Leaf Oil', 'زيت المريمية العطري', 'Salvia Sclarea Oil'],
        beneficialIngredients: []
    }
  ];