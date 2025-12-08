import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, Dimensions, 
  ScrollView, Animated, ImageBackground, Platform, ActivityIndicator, 
  Alert, UIManager, LayoutAnimation, StatusBar, TextInput, Modal, Pressable, I18nManager,
  RefreshControl, Easing, SafeAreaView, FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Path, Defs, ClipPath, Rect } from 'react-native-svg';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useRouter } from 'expo-router';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../src/config/firebase';
import { useAppContext } from '../../src/context/AppContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Fuse from 'fuse.js';
// --- DATA IMPORTS from Web Version ---
import { combinedOilsDB } from '../../src/data/alloilsdb';
import { marketingClaimsDB } from '../../src/data/marketingclaimsdb';
import { 
  commonAllergies, 
  commonConditions,
  basicSkinTypes,
  basicScalpTypes
} from '../../src/data/allergiesandconditions';

// --- SYSTEM CONFIG ---
I18nManager.allowRTL(false);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

// --- CONFIG & THEME ---
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const BG_IMAGE = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1527&auto=format&fit=crop";

const CARD_WIDTH = width * 0.85;
const SEPARATOR_WIDTH = 15;
const ITEM_WIDTH = CARD_WIDTH + SEPARATOR_WIDTH;
const DOT_SIZE = 8;
const PAGINATION_DOTS = 4; // How many static dots to show
const DOT_SPACING = 8; 

const COLORS = {
  // --- Deep Green Thematic Base ---
  background: '#1A2D27', // A rich, very dark forest green. This is the foundation of the theme.
  card: '#253D34',      // A slightly lighter shade of the forest green for cards, creating a subtle, layered effect.
  border: 'rgba(90, 156, 132, 0.25)', // A border derived from the accent color, tying the theme together.

  // --- Elegant Emerald Accent ---
  accentGreen: '#5A9C84', // The primary accent: a confident, muted emerald/seafoam green. It's visible and elegant, but not neon.
  accentGlow: 'rgba(90, 156, 132, 0.4)', // A soft glow for the emerald accent.
  
  // --- High-Contrast Text Colors ---
  textPrimary: '#F1F3F2',   // A soft, very light gray (near-white) for excellent readability on the dark green background.
  textSecondary: '#A3B1AC', // A muted, light green-gray for subtitles and secondary information.
  textOnAccent: '#1A2D27',  // The deep background color used for text on accent buttons, ensuring perfect contrast and cohesion.
  
  // --- System & Feedback Colors (Standard) ---
  danger: '#ef4444', 
  warning: '#f59e0b', 
  info: '#3b82f6', 
  success: '#22c55e',
  gold: '#fbbf24'
};

const PRODUCT_TYPES = [
    { id: 'shampoo', label: 'شامبو / بلسم', icon: 'spa' },
    { id: 'hair_mask', label: 'قناع شعر', icon: 'hand-sparkles' },
    { id: 'serum', label: 'سيروم', icon: 'flask' },
    { id: 'oil_blend', label: 'زيت', icon: 'leaf' },
    { id: 'lotion_cream', label: 'مرطب', icon: 'hand-holding-water' },
    { id: 'sunscreen', label: 'واقي شمس', icon: 'sun' },
    { id: 'cleanser', label: 'غسول', icon: 'soap' },
    { id: 'mask', label: 'قناع وجه', icon: 'mask' },
    { id: 'toner', label: 'تونر', icon: 'tint' },
    { id: 'other', label: 'آخر', icon: 'shopping-bag' },
];

// --- ▼▼▼ START OF PORTED LOGIC ▼▼▼ ---

// --- UTILITY & ANALYSIS FUNCTIONS (Directly Ported from Web) ---
const normalizeForMatching = (name) => {
  if (!name) return '';
  return name.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Handle accents
    .replace(/[.,،؛()/]/g, ' ') // Replace separators with spaces
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // Remove invalid symbols
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();
};
const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const uriToBase64 = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => { const rawBase64 = reader.result.split(',')[1]; resolve(rawBase64); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) { throw new Error("Failed to process image file."); }
};

const findIngredientMatches = (detectedIngredientNames, targetIngredients) => {
  if (!detectedIngredientNames?.length || !targetIngredients?.length) return [];
  const combinedDetectedText = `,${detectedIngredientNames.map(normalizeForMatching).join(',')},`;
  const matches = [];
  const sortedTargets = [...targetIngredients].sort((a, b) => b.length - a.length);
  let processedText = combinedDetectedText;

  sortedTargets.forEach(targetIngredient => {
    const normalizedTarget = normalizeForMatching(targetIngredient);
    if (!normalizedTarget) return;
    const regex = new RegExp(`,${escapeRegExp(normalizedTarget)},`, 'g');
    if (regex.test(processedText)) {
      matches.push(targetIngredient);
      processedText = processedText.replace(regex, ',');
    }
  });
  return [...new Set(matches)];
};

const getClaimsByProductType = (productType) => {
    const claimsByProduct = {
        shampoo: [ "تنقية فروة الرأس", "مضاد للقشرة", "مخصص للشعر الدهني", "مخصص للشعر الجاف", "مضاد لتساقط الشعر", "تعزيز النمو", "تكثيف الشعر", "مرطب للشعر", "تغذية الشعر", "إصلاح التلف", "تلميع ولمعان", "مكافحة التجعد", "حماية اللون", "حماية من الحرارة", "مهدئ", "مضاد للالتهابات" ],
        hair_mask: [ "تغذية عميقة", "إصلاح التلف", "ترطيب مكثف", "تنعيم الشعر", "مكافحة التجعد", "تقوية الشعر", "حماية اللون", "إضافة لمعان" ],
        serum: [ "مكافحة التجاعيد", "شد البشرة", "تحفيز الكولاجين", "إصلاح التلف", "مضاد للأكسدة", "تفتيح البشرة", "توحيد لون البشرة", "تفتيح البقع الداكنة", "تفتيح تحت العين", "مرطب للبشرة", "مهدئ", "مضاد للالتهابات", "للبشرة الجافة", "للبشرة الحساسة", "للبشرة الدهنية", "تنقية المسام", "توازن الزيوت", "مضاد لحب الشباب", "مضاد للرؤوس السوداء", "تقشير لطيف" ],
        oil_blend: [ "تعزيز النمو", "تغذية الشعر", "تلميع ولمعان", "إصلاح التلف", "مكافحة التجعد", "مخصص للشعر الدهني", "مخصص للشعر الجاف", "مرطب للشعر", "مرطب للبشرة", "مكافحة التجاعيد", "شد البشرة", "مضاد للأكسدة", "مهدئ", "مضاد للالتهابات", "تفتيح البقع الداكنة" ],
        lotion_cream: [ "مرطب للبشرة", "للبشرة الجافة", "للبشرة الحساسة", "للبشرة الدهنية", "مهدئ", "مضاد للأكسدة", "مكافحة التجاعيد", "شد البشرة", "تحفيز الكولاجين", "تفتيح البشرة", "توحيد لون البشرة", "تفتيح البقع الداكنة", "تفتيح تحت العين", "تنقية المسام", "إزالة السيلوليت", "شد الجسم" ],
        sunscreen: [ "حماية من الشمس", "حماية واسعة الطيف", "مقاوم للماء", "مرطب للبشرة", "مهدئ", "مضاد للأكسدة", "توحيد لون البشرة", "للبشرة الحساسة", "للبشرة الدهنية", "للبشرة الجافة" ],
        cleanser: [ "تنظيف عميق", "تنظيف لطيف", "إزالة المكياج", "للبشرة الدهنية", "للبشرة الجافة", "للبشرة الحساسة", "تنقية المسام", "مضاد لحب الشباب", "مرطب للشعر" ],
        toner: [ "مرطب للبشرة", "تهدئة البشرة", "توازن الحموضة", "تقشير لطيف", "تنقية المسام", "قابض للمسام" ],
        mask: [ "تنقية عميقة", "ترطيب مكثف", "تفتيح البشرة", "شد البشرة", "تهدئة البشرة", "تقشير" ],
        other: [ "مرطب للشعر", "مرطب للبشرة", "مهدئ", "مضاد للأكسدة", "مضاد للالتهابات", "تفتيح البشرة", "توحيد لون البشرة", "مكافحة التجاعيد", "تنقية المسام", "مضاد لحب الشباب" ]
    };
    return claimsByProduct[productType] || claimsByProduct.other;
};

const evaluateMarketingClaims = (detectedIngredients, selectedClaims = [], productType) => {
  const results = [];
  const ingredientNames = detectedIngredients.filter(ing => ing && ing.name).map(ing => ing.name);
  const claimsToAnalyze = selectedClaims.length > 0 ? selectedClaims : getClaimsByProductType(productType);
  
  claimsToAnalyze.forEach(claim => {
    const categories = marketingClaimsDB[claim];
    if (!categories) return;
    
    const foundProven = findIngredientMatches(ingredientNames, categories.proven || []);
    const foundTraditionallyProven = findIngredientMatches(ingredientNames, categories.traditionally_proven || []);
    const foundDoubtful = findIngredientMatches(ingredientNames, categories.doubtful || []);
    const foundIneffective = findIngredientMatches(ingredientNames, categories.ineffective || []);
    
    let status = '', explanation = '', confidence = '';
    
    if (foundProven.length > 0) { status = '✅ مثبت علميا'; confidence = 'عالية'; explanation = `يحتوي المنتج على ${foundProven.join('، ')} المعروفين علميا بدعم ${claim}.`; } 
    else if (foundTraditionallyProven.length > 0) { status = '🌿 مثبت تقليديا'; confidence = 'متوسطة'; explanation = `يحتوي على ${foundTraditionallyProven.join('، ')} المستخدم تقليديا لـ ${claim}، لكن الأدلة العلمية محدودة.`; } 
    else if (foundDoubtful.length > 0 && foundIneffective.length === 0) { status = '⚖️ جزئيا صادق'; confidence = 'منخفضة'; explanation = `يحتوي على ${foundDoubtful.join('، ')}، وهناك بعض الأدلة على فاعليته في ${claim} لكنها غير كافية.`; } 
    else if (foundDoubtful.length > 0 && foundIneffective.length > 0) { status = '⚖️ جزئيا صادق'; confidence = 'منخفضة جدا'; explanation = `يحتوي على ${foundDoubtful.join('، ')} (مشكوك في فاعليته) و${foundIneffective.join('، ')} (غير فعال)، الأدلة غير كافية.`; } 
    else if (foundIneffective.length > 0) { status = '❌ إدعاء تسويقي بحت'; confidence = 'معدومة'; explanation = `يحتوي على ${foundIneffective.join('، ')} والذي لا يوجد دليل علمي على فاعليته في ${claim}.`; } 
    else { status = '🚫 لا توجد مكونات مرتبطة'; confidence = 'معدومة'; explanation = `لا توجد في تركيبة المنتج أي مكونات معروفة علميا أو تقليديا بدعم ${claim}.`; }
    
    results.push({ claim, status, confidence, explanation, proven: foundProven, traditionallyProven: foundTraditionallyProven, doubtful: foundDoubtful, ineffective: foundIneffective });
  });
  return results;
};

const analyzeIngredientInteractions = (ingredients, allIngredients, selectedAllergies = [], selectedConditions = [], userSkinType, userScalpType) => {
  const conflicts = [], user_specific_alerts = [], foundConflicts = new Set();
  const detectedIngredientIds = new Set(ingredients.map(ing => ing.id));

  ingredients.forEach(ingredientInProduct => {
      const dbEntry = allIngredients.find(db_ing => db_ing.id === ingredientInProduct.id);
      if (dbEntry && dbEntry.negativeSynergy) {
          for (const conflictingId in dbEntry.negativeSynergy) {
              if (detectedIngredientIds.has(conflictingId)) {
                  const conflictPairKey = [ingredientInProduct.id, conflictingId].sort().join('+');
                  if (!foundConflicts.has(conflictPairKey)) {
                      const conflictingIngredient = ingredients.find(ing => ing.id === conflictingId);
                      if (conflictingIngredient) {
                          conflicts.push({ pair: [ingredientInProduct.name, conflictingIngredient.name], reason: dbEntry.negativeSynergy[conflictingId].reason });
                          foundConflicts.add(conflictPairKey);
                      }
                  }
              }
          }
      }
  });
  
  const userAllergenIngredients = new Set(selectedAllergies.flatMap(id => commonAllergies.find(a => a.id === id)?.ingredients || []).map(normalizeForMatching));
  const userConditionAvoidMap = new Map(), userBeneficialMap = new Map();
  const addToMap = (list, reason, isAvoid) => {
      if (!list) return;
      list.forEach(ing => {
          const norm = normalizeForMatching(ing);
          if (isAvoid) userConditionAvoidMap.set(norm, reason);
          else userBeneficialMap.set(norm, reason);
      });
  };

  selectedConditions.forEach(id => { const c = commonConditions.find(x => x.id === id); if(c) { addToMap(c.avoidIngredients, c.name, true); addToMap(c.beneficialIngredients, c.name, false); } });
  if (userSkinType) { const skinData = basicSkinTypes.find(t => t.id === userSkinType); if(skinData) { addToMap(skinData.avoidIngredients, `بشرة ${skinData.label}`, true); addToMap(skinData.beneficialIngredients, `بشرة ${skinData.label}`, false); } }
  if (userScalpType) { const scalpData = basicScalpTypes.find(t => t.id === userScalpType); if(scalpData) { addToMap(scalpData.avoidIngredients, `فروة رأس ${scalpData.label}`, true); addToMap(scalpData.beneficialIngredients, `فروة رأس ${scalpData.label}`, false); } }
  
  ingredients.forEach(ingredientInProduct => {
      const allNames = [ ingredientInProduct.name, ingredientInProduct.scientific_name, ...(ingredientInProduct.searchKeywords || []) ].filter(Boolean).map(normalizeForMatching);
      for (const name of allNames) {
          if (userAllergenIngredients.has(name)) {
              const allergy = commonAllergies.find(a => selectedAllergies.includes(a.id) && a.ingredients.map(normalizeForMatching).includes(name));
              user_specific_alerts.push({ type: 'danger', text: `🚨 خطر الحساسية: يحتوي على ${ingredientInProduct.name}، المرتبط بـ "${allergy?.name || 'حساسية محددة'}" لديك.` }); break; 
          }
          if (userConditionAvoidMap.has(name)) {
              const reason = userConditionAvoidMap.get(name);
              user_specific_alerts.push({ type: 'warning', text: `⚠️ تنبيه لـ (${reason}): ينصح بتجنب ${ingredientInProduct.name}.` }); break;
          }
          if (userBeneficialMap.has(name)) {
              const reason = userBeneficialMap.get(name);
              user_specific_alerts.push({ type: 'good', text: `✅ مفيد لـ (${reason}): يحتوي على ${ingredientInProduct.name}.` }); break;
          }
      }
  });
  
  const uniqueAlerts = Array.from(new Map(user_specific_alerts.map(item => [item.text, item])).values());
  return { conflicts, user_specific_alerts: uniqueAlerts };
};

const analyzeSunscreen = (ingredients) => {
    const uva_strong = ['zinc-oxide', 'tinosorb-s', 'tinosorb-m', 'mexoryl-sx', 'mexoryl-xl', 'uvinul-a-plus', 'mexoryl-400'];
    const uva_moderate = ['avobenzone'];
    const uvb_strong = ['zinc-oxide', 'titanium-dioxide', 'tinosorb-s', 'tinosorb-m', 'mexoryl-xl', 'uvinul-t-150'];
    const uvb_moderate = ['octocrylene', 'octinoxate', 'octisalate', 'homosalate'];
    const stabilizers = ['octocrylene', 'tinosorb-s', 'tinosorb-m', 'mexoryl-xl'];
    const controversial = ['oxybenzone', 'octinoxate'];
    const antioxidants = ['tocopherol', 'ferulic-acid', 'resveratrol-serum', 'vitamin-c'];
    let found_uva_strong = [], found_uva_moderate = [], found_uvb_strong = [], found_uvb_moderate = [], found_stabilizers = [], found_controversial = [], found_boosters = [], issues = [];
    ingredients.forEach(ing => {
      if (uva_strong.includes(ing.id)) found_uva_strong.push(ing.name);
      if (uva_moderate.includes(ing.id)) found_uva_moderate.push(ing.name);
      if (uvb_strong.includes(ing.id)) found_uvb_strong.push(ing.name);
      if (uvb_moderate.includes(ing.id)) found_uvb_moderate.push(ing.name);
      if (stabilizers.includes(ing.id)) found_stabilizers.push(ing.name);
      if (controversial.includes(ing.id)) found_controversial.push(ing.name);
      if (antioxidants.includes(ing.id)) found_boosters.push(ing.name);
      if (ing.id === 'zinc-oxide' || ing.id === 'titanium-dioxide') issues.push('قد يترك أثرا أبيض على البشرة (white cast).');
      if (['avobenzone', 'oxybenzone', 'octocrylene'].includes(ing.id)) issues.push('يحتوي على فلاتر كيميائية قد تسبب حساسية أو تهيج للعينين.');
    });
    if (found_controversial.length > 0) issues.push(`يحتوي على فلاتر (${found_controversial.join(', ')}) قد تكون ضارة بالشعاب المرجانية.`);
    let efficacyScore = 0;
    const hasUVA = found_uva_strong.length > 0 || found_uva_moderate.length > 0;
    const hasUVB = found_uvb_strong.length > 0 || found_uvb_moderate.length > 0;
    if (hasUVA && hasUVB) {
      efficacyScore += 50 + (found_uva_strong.length * 20) + (found_uva_moderate.length * 10) + (found_uvb_strong.length * 10);
      if (found_uva_strong.length + found_uvb_strong.length > 2) efficacyScore += 10;
      if (found_uva_moderate.includes('أفوبينزون') && found_stabilizers.length === 0) { efficacyScore -= 40; issues.push("فلتر الأفوبينزون غير مستقر وقد يفقد فعاليته بسرعة تحت الشمس لعدم وجود مثبتات."); }
    }
    efficacyScore = Math.max(0, Math.min(100, Math.round(efficacyScore)));
    let protectionLevel = efficacyScore >= 90 ? 'حماية فائقة' : efficacyScore >= 70 ? 'حماية جيدة' : efficacyScore >= 50 ? 'حماية أساسية' : 'حماية غير كافية';
    return { efficacyScore, protectionLevel, issues: [...new Set(issues)], boosters: found_boosters.length > 0 ? [`معزز بمضادات أكسدة مثل: ${[...new Set(found_boosters)].join('، ')}.`] : [] };
};

const calculateReliabilityScore_V13 = (ingredients, allIngredients, conflicts, userAlerts, marketingResults, productType) => {
    const scoreBreakdown = [
        { type: 'calculation', text: 'الرصيد الافتتاحي للسلامة', value: '100' },
        { type: 'calculation', text: 'الرصيد الافتتاحي للفعالية', value: '50' }
    ];
    
    if (!ingredients || ingredients.length === 0) {
        return { oilGuardScore: 0, finalVerdict: 'غير قابل للتحليل', scoreBreakdown: [] };
    }

    const isWashOff = ['cleanser', 'shampoo', 'mask', 'scrub'].includes(productType);
    const isLeaveOn = !isWashOff; 
    const isHairCare = ['shampoo', 'hair_mask', 'conditioner', 'oil_blend'].includes(productType);
    const isSunCare = ['sunscreen'].includes(productType);
    const isTreatment = ['serum', 'treatment', 'toner'].includes(productType);

    const topIngredients = ingredients.slice(0, 7);
    const hydrators = new Set(['glycerin', 'aqua', 'water', 'panthenol', 'betaine', 'allantoin', 'butylene-glycol', 'dipropylene-glycol', 'sodium-hyaluronate', 'ceramide', 'aloe-barbadensis', 'squalane', 'shea-butter', 'caprylic-capric-triglyceride', 'dimethicone', 'urea', 'bisabolol']);
    let bufferCount = 0;
    topIngredients.forEach(ing => {
        const dbEntry = allIngredients.find(db => db.id === ing.id);
        if (hydrators.has(ing.id) || dbEntry?.functionalCategory?.includes('مرطب')) {
            bufferCount++;
        }
    });
    const isBuffered = bufferCount >= (isTreatment ? 3 : 2);
    if (isBuffered) {
        scoreBreakdown.push({ type: 'info', text: '🛡️ نظام حماية: تركيبة مدعمة بمرطبات قوية', value: 'ميزة' });
    }

    let currentSafety = 100;
    let safetyDeductions = 0;

    ingredients.forEach((ing, index) => {
        const dbEntry = allIngredients.find(db => db.id === ing.id);
        let weight = index < 3 ? 2.0 : (index < 10 ? 1.0 : 0.5);
        
        if (['alcohol-denat', 'ethanol', 'isopropyl-alcohol'].includes(ing.id)) {
            if (!isSunCare || !isBuffered) {
                if (isTreatment && isLeaveOn) {
                    const penalty = isBuffered ? 5 : 25; 
                    const weightedPenalty = penalty * weight;
                    safetyDeductions += weightedPenalty;
                    if(weightedPenalty > 2) {
                        scoreBreakdown.push({ type: isBuffered ? 'warning' : 'deduction', text: isBuffered ? `كحول (مخفف التأثير): ${ing.name}` : `كحول مسبب للجفاف: ${ing.name}`, value: `-${Math.round(weightedPenalty)} (أمان)` });
                    }
                } else if (isLeaveOn) {
                     const p = 15 * weight;
                     safetyDeductions += p;
                     scoreBreakdown.push({ type: 'deduction', text: `كحول مجفف في مرطب: ${ing.name}`, value: `-${Math.round(p)} (أمان)` });
                }
            }
        }
        if (['sodium-lauryl-sulfate', 'ammonium-lauryl-sulfate', 'sls', 'als'].includes(ing.id)) {
            const p = (isLeaveOn ? 40 : 10) * weight;
            safetyDeductions += p;
            scoreBreakdown.push({ type: 'deduction', text: isLeaveOn ? `⛔ سلفات في منتج لا يغسل!: ${ing.name}` : `سلفات قوية: ${ing.name}`, value: `-${Math.round(p)} (أمان)` });
        }
        if (['fragrance', 'parfum', 'limonene', 'linalool', 'citronellol', 'geraniol'].includes(ing.id) && isLeaveOn && index < 10) {
            const p = index < 7 ? 15 : 5; 
            safetyDeductions += p;
            scoreBreakdown.push({ type: 'deduction', text: `عطر بتركيز عالي: ${ing.name}`, value: `-${p} (أمان)` });
        }
        const universalRisks = {
            'formaldehyde': { id: ['dmdm-hydantoin', 'imidazolidinyl-urea', 'diazolidinyl-urea'], p: 40, msg: 'مطلق للفورمالديهايد' },
            'parabens': { id: ['propylparaben', 'butylparaben', 'isobutylparaben'], p: 20, msg: 'بارابين (جدلي)' },
            'bad-preservatives': { id: ['methylisothiazolinone', 'methylchloroisothiazolinone'], p: 25, msg: 'مادة حافظة مهيجة جداً' }
        };
        for(const key in universalRisks) {
            if(universalRisks[key].id.includes(ing.id)) {
                safetyDeductions += universalRisks[key].p;
                scoreBreakdown.push({ type: 'deduction', text: `${universalRisks[key].msg}: ${ing.name}`, value: `-${universalRisks[key].p} (أمان)` });
            }
        }
        if ((['dimethicone', 'cyclopentasiloxane', 'amodimethicone'].includes(ing.id) || dbEntry?.chemicalType?.includes('سيليكون')) && (productType === 'shampoo' || (isWashOff && !isHairCare))) {
            safetyDeductions += 2;
            if (productType === 'shampoo') scoreBreakdown.push({ type: 'deduction', text: `سيليكون (احتمال تراكم): ${ing.name}`, value: '-2 (أمان)' });
        }
    });

    const activeUserAlerts = userAlerts.filter(alert => !(isBuffered && (alert.text.includes('كحول') || alert.text.includes('alcohol'))));
    if (isBuffered && activeUserAlerts.length < userAlerts.length) {
         scoreBreakdown.push({ type: 'info', text: '✨ تم تجاهل تحذير الجفاف لأن التركيبة محمية', value: 'استثناء' });
    }

    const hasAllergyDanger = activeUserAlerts.some(a => a.type === 'danger');
    const hasMismatch = activeUserAlerts.some(a => a.type === 'warning');
    if (hasAllergyDanger) { safetyDeductions += 100; scoreBreakdown.push({ type: 'override', text: '⛔ خطر: تعارض مع حساسيتك', value: '-100 (أمان)' }); } 
    else if (hasMismatch) { safetyDeductions += 30; scoreBreakdown.push({ type: 'deduction', text: '⚠️ لا يناسب نوع بشرتك/شعرك', value: '-30 (أمان)' }); }
    if (conflicts.length > 0) { const p = conflicts.length * 10; safetyDeductions += p; scoreBreakdown.push({ type: 'deduction', text: `تعارض كيميائي (${conflicts.length})`, value: `-${p} (أمان)` }); }
    currentSafety = Math.max(0, 100 - safetyDeductions);

    let currentEfficacy = 50; 
    let efficacyBonus = 0;
    ingredients.forEach((ing, index) => {
        const dbEntry = allIngredients.find(db => db.id === ing.id);
        let weight = index < 3 ? 2.0 : (index < 10 ? 1.5 : 0.8);
        const heroIngredients = ['niacinamide', 'vitamin-c', 'ascorbic-acid', 'retinol', 'retinal', 'tretinoin', 'adapalene', 'ceramide', 'peptide', 'copper-peptide', 'hyaluronic-acid', 'sodium-hyaluronate', 'azelaic-acid', 'salicylic-acid', 'glycolic-acid', 'lactic-acid', 'centella-asiatica', 'panthenol', 'glycerin', 'zinc-pca', 'snail-mucin', 'allantoin'];
        if (heroIngredients.includes(ing.id) || dbEntry?.functionalCategory?.includes('مكون فعال')) {
            let power = (isWashOff && !['salicylic-acid', 'benzoyl-peroxide', 'glycolic-acid', 'lactic-acid'].includes(ing.id)) ? 1 : (['glycerin', 'water', 'aqua'].includes(ing.id) ? 2 : 5);
            let points = power * weight;
            efficacyBonus += points;
            if (points >= 3 && index < 15) {
                 const contextMsg = isWashOff && power === 1 ? '(تأثير محدود في الغسول)' : '';
                 scoreBreakdown.push({ type: 'info', text: `🚀 مكون فعال: ${ing.name} ${contextMsg}`, value: `+${Math.round(points)} (فعالية)` });
            }
        }
    });

    let integrityScore = 0;
    if (marketingResults?.length > 0) {
        marketingResults.forEach(res => {
            if (res.status.includes('✅') && ingredients.findIndex(i => res.proven.includes(i.name)) < 10) { integrityScore += 15; scoreBreakdown.push({ type: 'info', text: `مصداقية (علمي): ${res.claim}`, value: '+15 (فعالية)' }); } 
            else if (res.status.includes('🌿')) { integrityScore += 15; scoreBreakdown.push({ type: 'info', text: `مصداقية (طبيعي): ${res.claim}`, value: '+15 (فعالية)' }); } 
            else if (res.status.includes('تركيز منخفض') || res.status.includes('Angel Dusting') || res.status.includes('❌')) { integrityScore -= 20; scoreBreakdown.push({ type: 'warning', text: `غش تسويقي: ${res.claim}`, value: '-20 (فعالية)' }); }
        });
    }
    efficacyBonus += integrityScore;
    currentEfficacy = Math.min(100, Math.max(0, 50 + efficacyBonus));

    let weightedScore = (currentSafety * 0.6) + (currentEfficacy * 0.4);
    scoreBreakdown.push({ type: 'calculation', text: `الحساب النهائي: (أمان ${Math.round(currentSafety)} × 0.6) + (فعالية ${Math.round(currentEfficacy)} × 0.4)`, value: `${Math.round(weightedScore)}` });

    let finalVerdict = '';
    if (hasAllergyDanger) { weightedScore = Math.min(weightedScore, 20); finalVerdict = "⛔ خطير: يسبب لك الحساسية"; scoreBreakdown.push({ type: 'override', text: 'تم إغلاق النتيجة لوجود خطر صحي', value: 'سقف 20%' }); } 
    else if (currentSafety < 40) { weightedScore = Math.min(weightedScore, 45); finalVerdict = "⚠️ غير آمن: يحتوي على مكونات قاسية/ضارة"; scoreBreakdown.push({ type: 'override', text: 'تم تخفيض النتيجة لضعف الأمان', value: 'سقف 45%' }); } 
    else if (currentSafety > 80 && currentEfficacy < 55) { weightedScore = Math.min(weightedScore, 65); finalVerdict = "💧 آمن لكن غير فعال (Basic)"; scoreBreakdown.push({ type: 'override', text: 'تم تخفيض النتيجة لعدم وجود فعالية حقيقية', value: 'سقف 65%' }); } 
    else if (weightedScore >= 90) finalVerdict = "تركيبة مثالية (Elite)"; 
    else if (weightedScore >= 80) finalVerdict = "اختيار ممتاز"; 
    else if (weightedScore >= 65) finalVerdict = "جيد ومتوازن"; 
    else finalVerdict = "متوسط (يمكن إيجاد أفضل)";

    return { oilGuardScore: Math.round(weightedScore), finalVerdict, efficacy: { score: Math.round(currentEfficacy) }, safety: { score: Math.round(currentSafety) }, scoreBreakdown, personalMatch: { status: hasAllergyDanger ? 'danger' : (hasMismatch ? 'warning' : 'good'), reasons: activeUserAlerts.map(a => a.text) } };
};

// --- ▲▲▲ END OF PORTED LOGIC ▲▲▲ ---


// ============================================================================
//                       ANIMATION & UI COMPONENTS
// ============================================================================
const Spore = ({ size, startX, duration, delay }) => {
  const animY = useRef(new Animated.Value(0)).current; 
  const animX = useRef(new Animated.Value(0)).current; 
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(Animated.timing(animY, { toValue: 1, duration, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }));
    const driftLoop = Animated.loop(Animated.sequence([ Animated.timing(animX, { toValue: 1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin }), Animated.timing(animX, { toValue: -1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin }), Animated.timing(animX, { toValue: 0, duration: duration * 0.3, useNativeDriver: true, easing: Easing.sin }), ]));
    const opacityPulse = Animated.loop(Animated.sequence([ Animated.timing(opacity, { toValue: 0.6, duration: duration * 0.2, useNativeDriver: true }), Animated.delay(duration * 0.6), Animated.timing(opacity, { toValue: 0.2, duration: duration * 0.2, useNativeDriver: true }), ]));
    const scaleIn = Animated.spring(scale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true, delay });
    const timeout = setTimeout(() => { scaleIn.start(); floatLoop.start(); driftLoop.start(); opacityPulse.start(); }, delay);
    return () => { clearTimeout(timeout); floatLoop.stop(); driftLoop.stop(); opacityPulse.stop(); };
  }, []);

  const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [height + 100, -100] });
  const translateX = animX.interpolate({ inputRange: [-1, 1], outputRange: [-35, 35] });

  return ( <Animated.View style={{ position: 'absolute', zIndex: -1, width: size, height: size, borderRadius: size/2, backgroundColor: COLORS.primaryGlow, transform: [{ translateY }, { translateX }, { scale }], opacity }} /> );
};

const PressableScale = ({ onPress, children, style, disabled }) => {
    const scale = useRef(new Animated.Value(1)).current; 
    const pressIn = () => !disabled && Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
    const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
    return (
        <Pressable onPress={() => { if(onPress && !disabled) { Haptics.selectionAsync(); onPress(); } }} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled} style={style}>
            <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
        </Pressable>
    );
};

const ContentCard = ({ children, style, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start(); }, []);
  // No more BlurView, just an Animated.View with the new card style
  return (
    <Animated.View style={[styles.cardBase, { opacity }, style]}>
      {children}
    </Animated.View>
  );
};

const StaggeredItem = ({ index, children, style }) => {
    const anim = useRef(new Animated.Value(0)).current;
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
    useEffect(() => { Animated.spring(anim, { toValue: 1, friction: 7, tension: 40, delay: index * 60, useNativeDriver: true }).start(); }, []);
    return ( <Animated.View style={[{ opacity: anim, transform: [{ translateY }] }, style]}>{children}</Animated.View> );
};

const ScoreRing = ({ score = 0, size = 160 }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const r = (size / 2) - 10;
    const circ = 2 * Math.PI * r;
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        const listener = animatedValue.addListener(({ value }) => setDisplayScore(Math.round(value)));
        Animated.timing(animatedValue, { toValue: score, duration: 1500, easing: Easing.out(Easing.exp), useNativeDriver: false }).start();
        return () => animatedValue.removeListener(listener);
    }, [score]);

    const strokeDashoffset = circ - ((displayScore / 100) * circ);
    const ringColor = score >= 80 ? COLORS.success : score >= 65 ? COLORS.warning : COLORS.danger;

    return (
        <View style={{width: size, height: size, alignItems:'center', justifyContent:'center'}}>
            <Svg width={size} height={size} style={{transform:[{rotate:'-90deg'}]}}>
                <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="14" fill="none"/>
                <Circle cx={size/2} cy={size/2} r={r} stroke={ringColor} strokeWidth="14" fill="none" strokeDasharray={circ} strokeDashoffset={strokeDashoffset} strokeLinecap="round"/>
            </Svg>
            <View style={{position:'absolute', alignItems:'center'}}>
                <Text style={{fontFamily:'Tajawal-ExtraBold', fontSize: size * 0.25, color: ringColor}}>{displayScore}%</Text>
            </View>
        </View>
    );
};

// --- Add this new component for the confidence meter ---

const ConfidenceRing = ({ confidence }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  const confidenceMap = {
      'عالية': { value: 100, color: COLORS.success },
      'متوسطة': { value: 65, color: COLORS.gold },
      'منخفضة': { value: 35, color: COLORS.warning },
      'منخفضة جدا': { value: 15, color: COLORS.warning },
      'معدومة': { value: 0, color: COLORS.danger },
  };

  const { value, color } = confidenceMap[confidence] || { value: 0, color: COLORS.danger };
  const size = 32;
  const strokeWidth = 3;
  const r = (size / 2) - strokeWidth;
  const circ = 2 * Math.PI * r;
  
  useEffect(() => {
      Animated.timing(animatedValue, {
          toValue: value,
          duration: 800,
          delay: 400, // Stagger animation slightly
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
      }).start();
  }, [confidence]);

  const strokeDashoffset = animatedValue.interpolate({
      inputRange: [0, 100],
      outputRange: [circ, 0],
  });

  return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} fill="none" />
              <Animated.View style={StyleSheet.absoluteFill}>
                  <Svg width={size} height={size}>
                      <AnimatedCircle
                          cx={size/2}
                          cy={size/2}
                          r={r}
                          stroke={color}
                          strokeWidth={strokeWidth}
                          fill="none"
                          strokeDasharray={circ}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                      />
                  </Svg>
              </Animated.View>
          </Svg>
      </View>
  );
};
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ClaimsGroupedView = ({ results }) => {
  const groupedResults = useMemo(() => {
      return results.reduce((acc, result) => {
          if (result.status.includes('✅') || result.status.includes('🌿')) {
              acc.proven.push(result);
          } else if (result.status.includes('⚖️')) {
              acc.doubtful.push(result);
          } else {
              acc.false.push(result);
          }
          return acc;
      }, { proven: [], doubtful: [], false: [] });
  }, [results]);

  const ClaimGroup = ({ title, icon, color, claims }) => {
      if (claims.length === 0) return null;
      return (
          <View style={{ marginBottom: 15 }}>
              <View style={styles.groupHeader}>
                  <FontAwesome5 name={icon} size={16} color={color} />
                  <Text style={[styles.groupTitle, { color }]}>{title}</Text>
              </View>
              {claims.map((claim, i) => (
                  <EnhancedTruthCard key={claim.claim} result={claim} index={i} />
              ))}
          </View>
      );
  };

  return (
      <View>
          <ClaimGroup title="ادعاءات مثبتة" icon="check-circle" color={COLORS.success} claims={groupedResults.proven} />
          <ClaimGroup title="ادعاءات مشكوك فيها" icon="exclamation-triangle" color={COLORS.warning} claims={groupedResults.doubtful} />
          <ClaimGroup title="ادعاءات تسويقية بحتة" icon="times-circle" color={COLORS.danger} claims={groupedResults.false} />
      </View>
  );
};

const EnhancedTruthCard = ({ result, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  const toggle = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); // Use spring animation
      setIsOpen(!isOpen);
      Animated.timing(rotation, {
          toValue: isOpen ? 0 : 1,
          duration: 300,
          useNativeDriver: true,
      }).start();
  };

  const rotateChevron = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
  });

  const allEvidence = [...result.proven, ...result.traditionallyProven, ...result.doubtful, ...result.ineffective];

  return (
      <StaggeredItem index={index}>
          <View style={styles.truthCard}>
              <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={styles.truthTrigger}>
                  <ConfidenceRing confidence={result.confidence} />
                  <View style={styles.truthTitleContainer}>
                      <Text style={styles.truthTitle}>{result.claim}</Text>
                      <Text style={styles.truthStatus}>{result.status}</Text>
                  </View>
                  <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
                      <FontAwesome5 name={"chevron-down"} size={14} color={COLORS.textDim} />
                  </Animated.View>
              </TouchableOpacity>

              {isOpen && (
                  <View style={styles.truthDetails}>
                      <Text style={styles.truthExplanation}>{result.explanation}</Text>
                      {allEvidence.length > 0 && (
                          <View style={styles.evidenceContainer}>
                              <Text style={styles.evidenceTitle}>الأدلة:</Text>
                              <View style={styles.evidencePillsContainer}>
                                  {result.proven.map(ing => <View key={ing} style={[styles.evidencePill, styles.pillProven]}><Text style={styles.evidencePillText}>{ing}</Text></View>)}
                                  {result.traditionallyProven.map(ing => <View key={ing} style={[styles.evidencePill, styles.pillTraditional]}><Text style={styles.evidencePillText}>{ing}</Text></View>)}
                                  {result.doubtful.map(ing => <View key={ing} style={[styles.evidencePill, styles.pillDoubtful]}><Text style={styles.evidencePillText}>{ing}</Text></View>)}
                                  {result.ineffective.map(ing => <View key={ing} style={[styles.evidencePill, styles.pillIneffective]}><Text style={styles.evidencePillText}>{ing}</Text></View>)}
                              </View>
                          </View>
                      )}
                  </View>
              )}
          </View>
      </StaggeredItem>
  );
};

const SwipeHint = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
      // This creates a looping animation: fade in -> swipe left -> fade out -> reset
      const animation = Animated.loop(
          Animated.sequence([
              Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
              Animated.timing(translateX, {
                  toValue: -35, // Moves 35 pixels to the left
                  duration: 1000,
                  delay: 100,
                  easing: Easing.inOut(Easing.ease),
                  useNativeDriver: true,
              }),
              Animated.timing(opacity, { toValue: 0, duration: 400, delay: 200, useNativeDriver: true }),
              Animated.timing(translateX, { toValue: 0, duration: 0, useNativeDriver: true }), // Reset position instantly
              Animated.delay(1000), // Wait 1 second before looping
          ])
      );
      animation.start();
      return () => animation.stop();
  }, []);

  return (
      <Animated.View style={[styles.swipeHintContainer, { opacity, transform: [{ translateX }] }]}>
          <MaterialCommunityIcons name="gesture-swipe-horizontal" size={65} color={COLORS.primary} />
      </Animated.View>
  );
};

const Pagination = ({ data, scrollX }) => {
  // If there are 4 or fewer items, we don't need the complex scrolling.
  // We just show a simple, static dot for each item.
  if (data.length <= PAGINATION_DOTS) {
      return (
          <View style={styles.paginationSimpleContainer}>
              {data.map((_, idx) => {
                  const inputRange = [(idx - 1) * ITEM_WIDTH, idx * ITEM_WIDTH, (idx + 1) * ITEM_WIDTH];
                  const scale = scrollX.interpolate({
                      inputRange,
                      outputRange: [1, 1.5, 1],
                      extrapolate: 'clamp',
                  });
                  const opacity = scrollX.interpolate({
                      inputRange,
                      outputRange: [0.5, 1, 0.5],
                      extrapolate: 'clamp',
                  });
                  return (
                      <Animated.View
                          key={`simple-dot-${idx}`}
                          style={[styles.paginationDot, { transform: [{ scale }], opacity, backgroundColor: COLORS.primary }]}
                      />
                  );
              })}
          </View>
      );
  }

  // --- This is the advanced logic for more than 4 items ---

  // 1. Animate the INDICATOR dot's position across the FULL track width
  const indicatorTranslateX = scrollX.interpolate({
      inputRange: [0, (data.length - 1) * ITEM_WIDTH],
      outputRange: [0, (data.length - 1) * (DOT_SIZE + DOT_SPACING)],
      extrapolate: 'clamp',
  });

  // 2. Animate the CONTAINER's position to keep the indicator centered
  const containerWidth = PAGINATION_DOTS * DOT_SIZE + (PAGINATION_DOTS - 1) * DOT_SPACING;
  const centerPoint = (containerWidth / 2) - (DOT_SIZE / 2); // Center of the visible container

  const containerTranslateX = scrollX.interpolate({
      inputRange: [
          0,
          (data.length - 1) * ITEM_WIDTH // Full scroll range
      ],
      outputRange: [
          0,
          -((data.length - 1) * (DOT_SIZE + DOT_SPACING) - centerPoint) + centerPoint // Full dot track range
      ],
      extrapolate: 'clamp'
  });

  return (
      // This is the "mask" that shows only 4 dots' worth of width
      <View style={styles.paginationContainer}>
          {/* This is the movable group that contains ALL dots and slides inside the mask */}
          <Animated.View style={[ { transform: [{ translateX: containerTranslateX }] }]}>
              {/* The background track of ALL dim dots */}
              <View style={styles.paginationTrack}>
                  {data.map((_, idx) => (
                      <View key={`track-dot-${idx}`} style={styles.paginationDot} />
                  ))}
              </View>

              {/* The single, bright indicator dot that slides on top */}
              <Animated.View
                  style={[
                      styles.paginationIndicator,
                      { transform: [{ translateX: indicatorTranslateX }] }
                  ]}
              />
          </Animated.View>
      </View>
  );
};

const IngredientDetailCard = ({ ingredient, index, scrollX }) => {
  // Helper to map warning levels to colors and icons
  const getWarningStyle = (level) => {
    switch (level) {
      case 'risk':
        return { color: COLORS.danger, icon: 'exclamation-circle' };
      case 'caution':
        return { color: COLORS.warning, icon: 'exclamation-triangle' };
      default: // 'info'
        return { color: COLORS.info, icon: 'info-circle' };
    }
  };

  const benefits = ingredient.benefits ? Object.keys(ingredient.benefits) : [];

  const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];
  const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9], // Inactive cards are smaller
      extrapolate: 'clamp',
  });
  const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6], // Inactive cards are faded
      extrapolate: 'clamp',
  });
  return (
    <StaggeredItem index={index}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
            <View  intensity={30} tint="extraLight" style={styles.ingCardBase} renderToHardwareTextureAndroid>
        {/* Header */}
        <View style={styles.ingHeader}>
          <Text style={styles.ingName}>{ingredient.name}</Text>
          <View style={styles.ingTagsContainer}>
            {ingredient.functionalCategory && (
              <View style={[styles.ingTag, styles.ingFuncTag]}>
                <Text style={styles.ingTagText}>{ingredient.functionalCategory}</Text>
              </View>
            )}
            {ingredient.chemicalType && (
              <View style={[styles.ingTag, styles.ingChemTag]}>
                <Text style={styles.ingTagText}>{ingredient.chemicalType}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Benefits */}
        {benefits.length > 0 && (
          <View style={styles.ingBenefitsContainer}>
            {benefits.map(benefit => (
              <View key={benefit} style={styles.ingBenefitChip}>
                <Text style={styles.ingBenefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Warnings */}
        {ingredient.warnings && ingredient.warnings.length > 0 && (
          <>
            <View style={styles.ingDivider} />
            {ingredient.warnings.map((warning, idx) => {
              const style = getWarningStyle(warning.level);
              return (
                <View key={idx} style={[styles.ingWarningBox, { backgroundColor: `${style.color}20` }]}>
                  <FontAwesome5 name={style.icon} size={16} color={style.color} style={styles.ingWarningIcon} />
                  <Text style={styles.ingWarningText}>{warning.text}</Text>
                </View>
              );
            })}
          </>
        )}
      </View>
      </Animated.View>
    </StaggeredItem>
  );
};

const CustomCameraModal = ({ isVisible, onClose, onPictureTaken }) => {
  const [permission, requestPermission] = useCameraPermissions();
  // Renamed ref to clarify it controls the entire CameraView (including video stream)
  const cameraViewRef = useRef(null); 
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setCameraReady] = useState(false);

  // Animation values
  const scanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let scanLoop, pulseLoop;

    if (isVisible) {
      if (!permission?.granted) {
          requestPermission();
      }
      
      Animated.spring(modalAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();

      scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay(500),
        ])
      );

      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      );

      scanLoop.start();
      pulseLoop.start();
      
    } else {
      Animated.timing(modalAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      scanAnim.setValue(0);
      pulseAnim.setValue(1);
    }

    return () => {
      // Ensure loops are stopped when component is not visible
      scanLoop?.stop();
      pulseLoop?.stop();
    }
  }, [isVisible, permission]);

  const handleCapture = async () => {
      // Use the renamed ref
      if (!cameraViewRef.current || isCapturing || !isCameraReady) return;
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
          const photo = await cameraViewRef.current.takePictureAsync({
              quality: 1, // Maximum quality for best OCR results
          });
          onPictureTaken(photo);
      } catch (error) {
          console.error("Failed to take picture:", error);
          Alert.alert("Capture Failed", "Could not take a picture. Please try again.");
      } finally {
          setIsCapturing(false);
      }
  };
  
  const modalTranslateY = modalAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [height, 0],
  });

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Modal visible={isVisible} transparent animationType="fade">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>We need your permission to show the camera</Text>
          <PressableScale onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </PressableScale>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, transform: [{ translateY: modalTranslateY }] }}>
        <CameraView
            style={StyleSheet.absoluteFill}
            ref={cameraViewRef} // Use the renamed ref here
            facing="back"
            onCameraReady={() => setCameraReady(true)}
            // These props leverage the video stream for the best still-image capture
            autoFocus="on" // Use continuous auto-focus from the live video feed
            mode="picture" // Prioritize settings for high-resolution still captures
            flash="off"
        >
          <View style={styles.cameraOverlay}>
          <View style={styles.cameraHeader}>
      <Text style={styles.cameraTitle}>فحص المكونات</Text>
      <PressableScale onPress={onClose} style={styles.cameraCloseButton}>
        <Ionicons name="close" size={24} color={'#FFFFFF'} />
      </PressableScale>
    </View>

            <View style={styles.cameraScannerContainer}>
              <Text style={styles.cameraGuideText}>ضع قائمة المكونات داخل الإطار</Text>
              <Animated.View style={[styles.cornerBracket, styles.topLeft, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.cornerBracket, styles.topRight, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.cornerBracket, styles.bottomLeft, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.cornerBracket, styles.bottomRight, { opacity: pulseAnim }]} />
              <Animated.View style={{ 
                  width: '100%', 
                  height: 3, 
                  transform: [{ 
                      translateY: scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-height * 0.25, height * 0.25] }) 
                  }] 
              }}>
                <LinearGradient
                  colors={['transparent', COLORS.primaryGlow, 'transparent']}
                  start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </View>

            <View style={styles.cameraFooter}>
             <Animated.View style={[styles.shutterPulseRing, { transform: [{ scale: pulseAnim }] }]} />
                <View style={styles.shutterButtonOuter}>
                    <PressableScale onPress={handleCapture} disabled={isCapturing || !isCameraReady} style={styles.shutterButtonInner}>
                        {isCapturing || !isCameraReady ? <ActivityIndicator color={COLORS.darkGreen} /> : null}
                    </PressableScale>
                </View>
                </View>
          </View>
        </CameraView>
      </Animated.View>
    </Modal>
  );
};

const AnimatedCheckbox = ({ isSelected }) => {
  const scale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const checkScale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
      // Spring animation for the background fill
      Animated.spring(scale, {
          toValue: isSelected ? 1 : 0,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
      }).start();
      // Timing animation for the checkmark icon
      Animated.timing(checkScale, {
          toValue: isSelected ? 1 : 0,
          duration: 200,
          delay: isSelected ? 100 : 0, // Delay checkmark appearance on select
          useNativeDriver: true,
      }).start();
  }, [isSelected]);

  return (
      <View style={styles.checkboxBase}>
          <Animated.View style={[styles.checkboxFill, { transform: [{ scale }] }]} />
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <FontAwesome5 name="check" size={14} color={COLORS.darkGreen} />
          </Animated.View>
      </View>
  );
};

const Wave = ({ isFilling }) => {
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
      const animation = Animated.loop(
          Animated.timing(waveAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
              easing: Easing.linear
          })
      );
      if (isFilling) {
          animation.start();
      }
      return () => animation.stop();
  }, [isFilling]);

  const translateX = waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -width * 0.8], // Moves one full wave width
  });

  return (
      <Animated.View style={{ width: '200%', height: 40, transform: [{ translateX }] }}>
          <Svg height="40" width={width * 1.6} style={{ width: '100%' }}>
              <Circle cx="50%" cy="50%" r="50%" fill={COLORS.primaryGlow} />
          </Svg>
      </Animated.View>
  );
};

// --- ▼▼▼ ADD THIS NEW BUBBLE COMPONENT ▼▼▼ ---
const Bubble = ({ size, x, duration, delay }) => {
  const animY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Use a delay before starting the loop to stagger the bubbles
    const timer = setTimeout(() => {
        const animation = Animated.loop(
            Animated.timing(animY, {
                toValue: 1,
                duration,
                useNativeDriver: true,
                easing: Easing.linear,
            })
        );
        animation.start();
        // Cleanup function for the animation itself
        return () => animation.stop();
    }, delay);

    // Cleanup for the timeout in case the component unmounts before the delay finishes
    return () => clearTimeout(timer);
  }, []);

  const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [0, -75] });

  return <AnimatedCircle
      cx={x}
      cy={90} // Start at the bottom of the flask's bulb
      r={size}
      fill={COLORS.primaryGlow}
      opacity={0.7}
      transform={[{ translateY }]}
  />;
};

const Typewriter = ({ texts, typingSpeed = 80, deletingSpeed = 40, pauseDuration = 1500, style }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  // Effect for the main typing/deleting logic
  useEffect(() => {
      // Blinking cursor interval
      const cursorInterval = setInterval(() => {
          setShowCursor(prev => !prev);
      }, 500);

      const handleTyping = () => {
          const currentText = texts[textIndex];
          
          // --- DELETING PHASE ---
          if (isDeleting) {
              if (displayedText.length > 0) {
                  // If text remains, schedule the next deletion
                  const timeout = setTimeout(() => {
                      setDisplayedText(currentText.substring(0, displayedText.length - 1));
                  }, deletingSpeed);
                  return () => clearTimeout(timeout);
              } else {
                  // If deletion is complete, move to the next text and switch to typing phase
                  setIsDeleting(false);
                  setTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
              }
          } 
          // --- TYPING PHASE ---
          else {
              if (displayedText.length < currentText.length) {
                  // If not finished typing, schedule the next character
                  const timeout = setTimeout(() => {
                      setDisplayedText(currentText.substring(0, displayedText.length + 1));
                  }, typingSpeed);
                  return () => clearTimeout(timeout);
              } else {
                  // If typing is complete, pause and then start deleting
                  const timeout = setTimeout(() => {
                      setIsDeleting(true);
                  }, pauseDuration);
                  return () => clearTimeout(timeout);
              }
          }
      };

      const typingTimeout = handleTyping();

      // Cleanup function for all timeouts and intervals
      return () => {
          if(typingTimeout) typingTimeout();
          clearInterval(cursorInterval);
      };

  }, [displayedText, isDeleting, textIndex, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return (
      <View style={style.container}>
          <Text style={style.text}>
              {displayedText}
              {showCursor && <Text style={{ color: COLORS.primary }}>▋</Text>}
          </Text>
      </View>
  );
};

const FloatingButton = ({ icon, label, color, glowColor, onPress, index }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
      const float = Animated.loop(Animated.sequence([
          Animated.timing(floatAnim, { toValue: 1, duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(floatAnim, { toValue: 0, duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]));

      const glow = Animated.loop(Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ]));
      
      // Stagger the start of the animations based on the index
      const timeout = setTimeout(() => {
          float.start();
          glow.start();
      }, index * 300);

      return () => {
          clearTimeout(timeout);
          float.stop();
          glow.stop();
      }
  }, []);

  const pressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 20 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  
  const translateY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] });

  return (
      <Pressable onPress={() => { if(onPress) { Haptics.selectionAsync(); onPress(); } }} onPressIn={pressIn} onPressOut={pressOut}>
          <Animated.View style={{ alignItems: 'center', transform: [{ translateY }, { scale }] }}>
              <Animated.View style={[styles.glowEffect, { backgroundColor: glowColor, transform: [{ scale: glowScale }], opacity: glowOpacity }]} />
              <View style={styles.floatingBtnCore}>
                  <FontAwesome5 name={icon} size={28} color={color} />
              </View>
              <Text style={styles.floatingBtnLabel}>{label}</Text>
          </Animated.View>
      </Pressable>
  );
};

const AnimatedTypeChip = ({ type, isSelected, onPress, index }) => {
  const anim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isSelected ? 1 : 0,
      friction: 7,
      tension: 50,
      useNativeDriver: false, // Required for color animations
    }).start();
  }, [isSelected]);

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [String(COLORS.cardBg), String(COLORS.primary)], // Explicitly cast to string
  });

  const textColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [String(COLORS.textDim), String(COLORS.darkGreen)], // Explicitly cast to string
  });

  const iconColor = isSelected ? COLORS.darkGreen : COLORS.textDim;

  return (
    <StaggeredItem index={index}>
      <PressableScale onPress={onPress}>
        <Animated.View style={[styles.typeChip, { backgroundColor }]}>
          <FontAwesome5 name={type.icon} color={iconColor} size={14} />
          <Animated.Text style={[styles.typeText, { color: textColor }]}>
            {type.label}
          </Animated.Text>
        </Animated.View>
      </PressableScale>
    </StaggeredItem>
  );
};

// ============================================================================
//                        MAIN SCREEN COMPONENT
// ============================================================================
export default function OilGuardEngine() {
  const router = useRouter();
  const { user, userProfile } = useAppContext();
  const insets = useSafeAreaInsets();

  // --- STATE MANAGEMENT ---
  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [manualIngredients, setManualIngredients] = useState('');
  const [preProcessedIngredients, setPreProcessedIngredients] = useState([]);
  const [productType, setProductType] = useState('other');
  const [selectedClaims, setSelectedClaims] = useState([]);
  const [finalAnalysis, setFinalAnalysis] = useState(null);
  const [showManualTypeGrid, setShowManualTypeGrid] = useState(false);
  const [isSaveModalVisible, setSaveModalVisible] = useState(false);
  const [productName, setProductName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCameraViewVisible, setCameraViewVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState('claims');
  const [isAnimatingTransition, setIsAnimatingTransition] = useState(false);
  const [fabMetrics, setFabMetrics] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // --- ANIMATION REFS ---
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  // Step 0 (Intro)
  const introIconScale = useRef(new Animated.Value(1)).current;
  const introShineAnim = useRef(new Animated.Value(0)).current;
  // Step 2 (Claims)
  const fabAnim = useRef(new Animated.Value(0)).current;
  const fabPulseAnim = useRef(new Animated.Value(1)).current;
  const heroTransitionAnim = useRef(new Animated.Value(0)).current; 
  const fabIconRef = useRef(null);
  const fabRef = useRef(null);
  const revealAnim = useRef(new Animated.Value(0)).current;
  // Step 3 (Loading)
  const loadingFillAnim = useRef(new Animated.Value(0)).current;
  const loadingDropAnim = useRef(new Animated.Value(0)).current;
  const loadingTextOpacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  // --- MEMOIZED DATA ---
  const particles = useMemo(() => [...Array(15)].map((_, i) => ({ id: i, size: Math.random()*5+3, startX: Math.random()*width, duration: 8000+Math.random()*7000, delay: Math.random()*5000 })), []);
  const allIngredients = useMemo(() => combinedOilsDB.ingredients, []);
  const allSearchableTerms = useMemo(() => {
    const terms = new Map();
    allIngredients.forEach(ing => {
      [ing.id, ing.name, ing.scientific_name, ...(ing.searchKeywords || [])]
      .filter(Boolean).map(name => normalizeForMatching(String(name)))
      .forEach(normalized => { if (normalized.length > 2 && !terms.has(normalized)) terms.set(normalized, ing); });
    });
    return Array.from(terms.entries()).map(([term, ingredient]) => ({ term, ingredient })).sort((a, b) => b.term.length - a.term.length);
  }, [allIngredients]);
  const claimsForType = useMemo(() => getClaimsByProductType(productType), [productType]);
  const fuse = useMemo(() => new Fuse(claimsForType, {
      includeScore: false,
      threshold: 0.4,
  }), [claimsForType]);
  const loadingBubbles = useMemo(() => [...Array(15)].map((_, i) => ({
      id: i,
      size: Math.random() * 15 + 5,
      x: `${Math.random() * 80 + 10}%`,
      duration: Math.random() * 3000 + 2000,
      delay: Math.random() * 2000,
  })), []);

  // --- ANIMATION CONTROLLERS ---

  // Central Controller for Step-Based Animations
  useEffect(() => {
    // 1. Define all step-specific animations
    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(introIconScale, { toValue: 1.05, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(introIconScale, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
      ])
    );
    const shineAnimation = Animated.loop(
        Animated.timing(introShineAnim, {
            toValue: 1,
            duration: 3500,
            useNativeDriver: true,
            easing: Easing.linear,
            delay: 500,
        })
    );
    const drop = Animated.sequence([
        Animated.delay(400),
        Animated.timing(loadingDropAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.bounce })
    ]);
    const fill = Animated.sequence([
        Animated.delay(800),
        Animated.timing(loadingFillAnim, { toValue: 1, duration: 2500, useNativeDriver: false, easing: Easing.inOut(Easing.ease) })
    ]);
    const textPulse = Animated.loop(Animated.sequence([
        Animated.timing(loadingTextOpacityAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(loadingTextOpacityAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true })
    ]));

    // 2. Conditionally start animations based on the current step
    if (step === 0) {
      breathAnimation.start();
      shineAnimation.start();
    } else if (step === 3) {
      if (isGeminiLoading) {
        // Start animations for the NEW Gemini loading screen
        loadingTextOpacityAnim.setValue(0.6); // Start text visible
        textPulse.start();
      } else {
        // Start animations for the FINAL analysis loading screen (original logic)
        loadingDropAnim.setValue(0);
        loadingFillAnim.setValue(0);
        loadingTextOpacityAnim.setValue(0);
        drop.start();
        fill.start();
        textPulse.start();
      }
    }

    // 3. The cleanup function stops everything when dependencies change
    return () => {
        breathAnimation.stop();
        shineAnimation.stop();
        drop.stop();
        fill.stop();
        textPulse.stop();
    };
  }, [step, isGeminiLoading]);

  // Separate Controller for FAB Animation (based on different dependency)
  useEffect(() => {
    const pulseAnimation = Animated.loop(
        Animated.sequence([
            Animated.timing(fabPulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            Animated.timing(fabPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
        ])
    );

    if (selectedClaims.length > 0) {
      Animated.spring(fabAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();
      pulseAnimation.start();
    } else {
      Animated.timing(fabAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }

    return () => pulseAnimation.stop();
  }, [selectedClaims.length]);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );

    if (isAnimatingTransition) {
      pulseAnimation.start();
    }

    return () => {
      pulseAnimation.stop();
      pulseAnim.setValue(0);
    };
  }, [isAnimatingTransition]);

  // --- CORE FUNCTIONS ---
  const changeStep = (next) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      Animated.timing(contentOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const handleImageSelection = async (mode) => {
    try {
        Haptics.selectionAsync();

        // --- NEW CAMERA LOGIC ---
        // If the user selects 'camera', we just open our custom modal view and stop.
        if (mode === 'camera') {
            setCameraViewVisible(true);
            return; // Exit the function here.
        }

        // --- EXISTING GALLERY LOGIC (Unchanged) ---
        // If the mode is not 'camera', we proceed with the image picker for the gallery.
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('Permission needed', 'Media library access is required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets[0].uri) {
            // Process the image selected from the gallery
            processImageWithGemini(result.assets[0].uri);
        }
    } catch (error) {
        console.error("Image selection error:", error);
        Alert.alert("Error", "Could not select an image. Please try again.");
    }
};

const handlePictureTaken = (photo) => {
  // First, close the camera modal
  setCameraViewVisible(false);

  // Now, we have the photo object which contains the URI.
  // We can send this URI to the same processing function that the gallery uses.
  if (photo && photo.uri) {
      processImageWithGemini(photo.uri);
  }
};

  const processImageWithGemini = async (uri) => {
    setLoading(true);
    setIsGeminiLoading(true);
    changeStep(3);

    try {
        const base64Data = await uriToBase64(uri);
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const validTypes = "shampoo, hair_mask, serum, lotion_cream, cleanser, toner, mask, sunscreen, oil_blend, other";
        const prompt = `
            You are an expert cosmetic chemist AI. Analyze the provided image.
            
            Task 1: Identify the Product Type.
            Based on the packaging, texture, or text, classify the product into EXACTLY one of these categories: [${validTypes}].
            If you cannot determine it, use "other".

            Task 2: Your primary task is to act as a specialized ingredient extractor. You MUST analyze the provided image and perform the following steps : 1-Locate the Ingredient List: Focus ONLY on the text within the section explicitly labeled 'Ingredients', 'INCI', 'المكونات', or a similar title. 2-Ignore Everything Else: You MUST completely ignore and NOT include in your output: brand names, marketing claims (e.g., 'anti-wrinkle', 'hydrating'), logos, barcodes, usage instructions, warnings, or any text outside the official ingredient list. 3-Extract and Translate: REALISTICALLY! i dont want cutt-off ingredients names. For every single ingredient you identify, you MUST provide its standard English name AND its accurate Arabic translation and alternative names found in other products for the same ingredient. 4-Strict Formatting: Present the entire output as a multi-lines, numbered list. Each line MUST follow this exact format, including all spaces: [Number]- [English Name] || [Arabic Name] ,Example 1: 1- Aqua / ماء , Example 2: 2- Niacinamide / نياسيناميد , Example 3: 3- Simmondsia Chinensis Seed Oil / زيت بذور الجوجوبا . Language Policy: The output MUST be in English and Arabic ONLY. French and all other languages are STRICTLY FORBIDDEN. If an ingredient name is complex, provide the best possible translation for both required languages. Do not add any extra notes or explanations. REWRITE FRENCH INGREDIENTS IN ENGLISH".
            
            OUTPUT FORMAT:
            Return a RAW JSON object (no markdown formatting, no backticks).
            {
                "detected_type": "string (one of the valid categories)",
                "ingredients_text": "string (the full list as a numbered string with line breaks)"
            }
        `;

        const result = await model.generateContent([prompt, { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }]);
        const response = await result.response;
        let text = response.text().replace(/```json|```/g, '').trim();

        const jsonResponse = JSON.parse(text);
        const { ingredients } = await extractIngredientsFromAIText(jsonResponse.ingredients_text);

        if (ingredients.length === 0) throw new Error("No known ingredients were recognized.");

        setOcrText(jsonResponse.ingredients_text); 
        setPreProcessedIngredients(ingredients); 
        setProductType(jsonResponse.detected_type || 'other');
        
        setIsGeminiLoading(false);
        setLoading(false);
        changeStep(1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (error) {
        console.error("Gemini Error:", error);
        Alert.alert("Analysis Failed", `Could not process image: ${error.message}`);
        setIsGeminiLoading(false);
        setLoading(false);
        changeStep(0);
    }
  };
  
  const extractIngredientsFromAIText = async (text) => {
      const foundIngredients = new Map();
      if (!text) return { ingredients: [] };
      const lines = text.split('\n').filter(line => line.trim() !== '');

      lines.forEach(line => {
          const match = line.match(/^\s*\d+\s*-\s*([^|]+)/);
          if (!match || !match[1]) return;
          const detectedName = match[1].trim();
          const normalizedDetectedName = normalizeForMatching(detectedName);

          for (const { term, ingredient } of allSearchableTerms) {
              const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
              if (regex.test(normalizedDetectedName)) {
                  if (!foundIngredients.has(ingredient.id)) foundIngredients.set(ingredient.id, ingredient);
                  return; 
              }
          }
      });
      return { ingredients: Array.from(foundIngredients.values()) };
  };

  

  const executeAnalysis = () => {
    if (!fabRef.current) return;

    // 1. Measure the starting position of the FAB
    fabRef.current.measure((fx, fy, width, height, px, py) => {
      setFabMetrics({ x: px, y: py, width, height });
      
      const destX = (Dimensions.get('window').width / 2) - (width / 2);
      const destY = (Dimensions.get('window').height / 2) - (height / 2);

      // 2. Start the transition
      setIsAnimatingTransition(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 3. Animate the hero FAB from the FAB's position to the center of the screen
      Animated.timing(heroTransitionAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: true,
      }).start(() => {
        // 5. When the animation finishes, start the analysis
        const detectedIngredients = preProcessedIngredients || [];
        const marketingResults = evaluateMarketingClaims(detectedIngredients, selectedClaims, productType);
        
        const { conflicts, user_specific_alerts } = analyzeIngredientInteractions(
            detectedIngredients, allIngredients,
            userProfile?.settings?.allergies || [], userProfile?.settings?.conditions || [], 
            userProfile?.settings?.skinType, userProfile?.settings?.scalpType
        );
        
        const resultData = calculateReliabilityScore_V13(
            detectedIngredients, allIngredients, conflicts, 
            user_specific_alerts, marketingResults, productType
        );

        const fullAnalysisData = {
          ...resultData,
          detected_ingredients: detectedIngredients,
          conflicts,
          marketing_results: marketingResults,
          product_type: productType,
          user_specific_alerts,
          sunscreen_analysis: productType === 'sunscreen' ? analyzeSunscreen(detectedIngredients) : null
        };

        setFinalAnalysis(fullAnalysisData);
        
        // Hide the hero element, reset animations, and transition to the final page
        setIsAnimatingTransition(false);
        heroTransitionAnim.setValue(0);
        changeStep(4);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      });

      // 4. In the middle of the hero animation, switch the background to the loading step
      setTimeout(() => {
        changeStep(3);
      }, 200);
    });
  };

  const runBackendAnalysis = async () => {
    // This timeout gives the user a moment to see the loading animation
    // before the (potentially instant) analysis completes.
    await new Promise(resolve => setTimeout(resolve, 500));

    // Perform all the data analysis
    const detectedIngredients = preProcessedIngredients || [];
    const marketingResults = evaluateMarketingClaims(detectedIngredients, selectedClaims, productType);
    const { conflicts, user_specific_alerts } = analyzeIngredientInteractions(
        detectedIngredients, allIngredients,
        userProfile?.settings?.allergies || [], userProfile?.settings?.conditions || [],
        userProfile?.settings?.skinType, userProfile?.settings?.scalpType
    );
    const resultData = calculateReliabilityScore_V13(
        detectedIngredients, allIngredients, conflicts,
        user_specific_alerts, marketingResults, productType
    );
    const fullAnalysisData = {
      ...resultData,
      detected_ingredients: detectedIngredients,
      conflicts,
      marketing_results: marketingResults,
      product_type: productType,
      user_specific_alerts,
      sunscreen_analysis: productType === 'sunscreen' ? analyzeSunscreen(detectedIngredients) : null
    };

    // Set the final state so the result page can render
    setFinalAnalysis(fullAnalysisData);

    // Trigger the final reveal animation
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 500, // Speed of the reveal
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // Once the reveal is complete, finalize the state
      setStep(4);
      setIsAnimatingTransition(false);
      heroTransitionAnim.setValue(0);
      pulseAnim.setValue(0);
      revealAnim.setValue(0);
    });
  };
  
  const handleSaveProduct = async () => {
    if (!productName.trim() || !user || !finalAnalysis) { Alert.alert("Error", "Please enter a product name."); return; }
    setIsSaving(true);
    try {
        await addDoc(collection(db, 'profiles', user.uid, 'savedProducts'), {
            userId: user.uid,
            productName: productName.trim(),
            analysisData: finalAnalysis, 
            createdAt: Timestamp.now()
        });
        Alert.alert("Saved", "Product has been added to your shelf!");
        setIsSaving(false);
        setSaveModalVisible(false);
        router.replace('/(main)/profile');
    } catch (error) {
        Alert.alert("Save Failed", "Could not save product. Please try again.");
        setIsSaving(false);
    }
  };

  const resetFlow = () => {
    setIsGeminiLoading(false);
    setStep(0); setFinalAnalysis(null); setOcrText(''); 
      setPreProcessedIngredients([]); setSelectedClaims([]);
      setShowSwipeHint(true);
      setSearchQuery('');
      setProductName(''); setShowManualTypeGrid(false); setManualIngredients('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderGeminiLoading = () => {
    // Reuse the pulsing text opacity animation from the parent component
    const textOpacity = loadingTextOpacityAnim;

    return (
        <View style={styles.contentContainer}>
            <StaggeredItem index={0}>
                <View style={styles.flaskAnimationContainer}>
                    <Svg width={180} height={180} viewBox="0 0 100 100">
                        {/* Bubbles are rendered first to appear behind the flask outline */}
                        {loadingBubbles.map(bubble => <Bubble key={bubble.id} {...bubble} />)}
                        
                        {/* Flask Outline SVG Path */}
                        <Path
                            d="M 50 95 L 40 95 A 10 10 0 0 1 30 85 L 30 60 A 20 20 0 0 1 50 40 A 20 20 0 0 1 70 60 L 70 85 A 10 10 0 0 1 60 95 L 50 95 M 50 40 L 50 5"
                            stroke={COLORS.primary}
                            strokeWidth="3"
                            fill="rgba(178, 216, 180, 0.05)" // A very faint, glowing fill
                            strokeLinecap="round"
                        />
                    </Svg>
                </View>
                <Animated.Text style={[styles.loadingText, { opacity: textOpacity, marginTop: 20 }]}>
                    جاري تحليل الصورة بالذكاء الاصطناعي...
                </Animated.Text>
                <Text style={[styles.heroSub, { marginTop: 8 }]}>
                    قد تستغرق هذه العملية بضع لحظات
                </Text>
            </StaggeredItem>
        </View>
    );
  };

  // --- RENDER FUNCTIONS ---
  const renderInputStep = () => {
    return (
        <View style={styles.contentContainer}>
            <StaggeredItem index={0} style={styles.heroSection}>
                <Animated.View style={{ transform: [{ scale: introIconScale }] }}>
                    <View style={styles.heroIcon}>
                        <FontAwesome5 name="search" size={40} color={COLORS.primary} />
                    </View>
                </Animated.View>
            </StaggeredItem>

            <StaggeredItem index={1}>
                <Text style={styles.heroTitle}>حلل مكونات منتجك الآن</Text>
            </StaggeredItem>

            {/* --- MODIFIED TYPEWRITER USAGE --- */}
            <Typewriter
                texts={[
                    "هل هذا المنتج آمن وفعال حقاً؟",
                    "دع وثيق يرشدك.",
                    "تحليل كيميائي بلمسة واحدة.",
                    "اكتشف أسرار منتجات العناية الخاصة بك.",
                    "مدعوم بالذكاء الاصطناعي لفهم أعمق.",
                  
                ]}
                typingSpeed={80}
                deletingSpeed={40}
                pauseDuration={2000} // Increased pause time
                style={{
                    container: styles.heroSubContainer, // Pass a container style
                    text: styles.heroSub, // Pass the text style
                }}
            />

            {/* --- Floating Buttons (No changes here) --- */}
            <View style={styles.floatingBtnContainer}>
                <FloatingButton
                    index={0}
                    icon="camera"
                    label="كاميرا"
                    color={COLORS.primary}
                    glowColor={COLORS.primaryGlow}
                    onPress={() => handleImageSelection('camera')}
                />
                <FloatingButton
                    index={1}
                    icon="images"
                    label="معرض الصور"
                    color={COLORS.info}
                    glowColor={`${COLORS.info}90`}
                    onPress={() => handleImageSelection('gallery')}
                />
            </View>
            
            <StaggeredItem index={4} style={{ marginTop: 30 }}>
                 <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backLinkText}>العودة للرئيسية</Text>
                 </TouchableOpacity>
            </StaggeredItem>
        </View>
    );
  };

  const renderReviewStep = () => (
    <ContentCard>
      <View style={styles.contentContainer}>
        {/* Section 1: AI Prediction with enhanced styling */}
        <StaggeredItem index={0}>
            <Text style={styles.sectionTitle}><FontAwesome5 name="robot" /> ما الذي يعتقده الذكاء الاصطناعي؟</Text>
            <View style={styles.aiPredictionCard}>
                <View style={styles.aiPredictionIconContainer}>
                    <FontAwesome5 name={PRODUCT_TYPES.find(t => t.id === productType)?.icon || 'shopping-bag'} size={30} color={COLORS.primary} />
                </View>
                <View>
                    <Text style={styles.aiPredictionLabel}>نوع المنتج المكتشف:</Text>
                    <Text style={styles.aiPredictionValue}>{PRODUCT_TYPES.find(t => t.id === productType)?.label || 'غير معروف'}</Text>
                </View>
            </View>
            {/* This button triggers the animation and then disappears */}
            {!showManualTypeGrid && (
              <PressableScale 
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                  setShowManualTypeGrid(true);
                }} 
                style={styles.changeTypeButton}
              >
                <Text style={styles.changeTypeText}>تغيير النوع يدوياً <FontAwesome5 name="edit" /></Text>
              </PressableScale>
            )}
        </StaggeredItem>

        {/* Section 2: Manual Type Selection - Animates into view */}
        {showManualTypeGrid && (
            <View style={{width: '100%'}}>
              <Text style={[styles.sectionTitle, {marginTop: 25, marginBottom: 20}]}>اختر النوع الصحيح:</Text>
              <View style={styles.typeGrid}>
                  {PRODUCT_TYPES.map((t, index) => ( 
                      <AnimatedTypeChip
                          key={t.id}
                          type={t}
                          isSelected={productType === t.id}
                          onPress={() => setProductType(t.id)}
                          index={index}
                      />
                  ))}
              </View>
            </View>
        )}
        
        {/* Section 3: Confirmation Button */}
        <StaggeredItem index={showManualTypeGrid ? 2 : 1} style={{width: '100%', marginTop: 30}}>
            <PressableScale onPress={() => changeStep(2)} style={styles.mainBtn}>
                <Text style={styles.mainBtnText}>تأكيد والمتابعة للادعاءات</Text>
                <FontAwesome5 name="arrow-right" color={COLORS.darkGreen} size={18} />
            </PressableScale>
        </StaggeredItem>
      </View>
      </ContentCard>
  );
  
  const renderClaimsStep = () => {
    // --- Fuzzy Search Logic (no changes here) ---
    const displayedClaims = searchQuery ? fuse.search(searchQuery).map(result => result.item) : claimsForType;
    
    // --- ANIMATION & LAYOUT CONSTANTS ---
    const EXPANDED_HEADER_HEIGHT = 160;
    const COLLAPSED_HEADER_HEIGHT = Platform.OS === 'android' ? 60 : 90;
    const SEARCH_BAR_HEIGHT = 70;
    const HEADER_ANIMATION_DISTANCE = EXPANDED_HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT;

    // --- ANIMATION INTERPOLATIONS ---
    const headerTranslateY = scrollY.interpolate({
      inputRange: [0, HEADER_ANIMATION_DISTANCE],
      outputRange: [0, -HEADER_ANIMATION_DISTANCE],
      extrapolate: 'clamp',
    });

    const expandedHeaderOpacity = scrollY.interpolate({
      inputRange: [0, HEADER_ANIMATION_DISTANCE / 2],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    const collapsedHeaderOpacity = scrollY.interpolate({
      inputRange: [HEADER_ANIMATION_DISTANCE / 2, HEADER_ANIMATION_DISTANCE],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    const fabTranslateY = fabAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [150, 0],
    });
    const fabScale = fabPulseAnim.interpolate({
      inputRange: [0,1],
      outputRange: [1, 1.1]
    });

    // --- RENDER HELPER ---
    const renderClaimItem = ({ item, index }) => {
      const isSelected = selectedClaims.includes(item);
      return (
        <StaggeredItem index={index}>
          <PressableScale onPress={() => {
            Haptics.selectionAsync();
            setSelectedClaims(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]);
          }}>
            <View style={[styles.claimItem, isSelected && styles.claimItemActive]}>
              <AnimatedCheckbox isSelected={isSelected} />
              <Text style={styles.claimItemText}>{item}</Text>
            </View>
          </PressableScale>
        </StaggeredItem>
      );
    };

    return (
      <View style={{ flex: 1, width: '100%' }}>
        {/* The list is the base layer and scrolls underneath the fixed header */}
        <Animated.FlatList
          data={displayedClaims}
          renderItem={renderClaimItem}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: EXPANDED_HEADER_HEIGHT + SEARCH_BAR_HEIGHT,
            paddingBottom: 120, paddingHorizontal: 10, gap: 12
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
        
        {/* --- MAIN FIXED HEADER BLOCK (Sits on top of the list) --- */}
        <Animated.View style={[styles.fixedHeaderBlock, { 
            height: EXPANDED_HEADER_HEIGHT + SEARCH_BAR_HEIGHT,
            transform: [{ translateY: headerTranslateY }],
        }]}>
            {/* The Unified Background: Hides the list scrolling behind it */}
            <View style={styles.headerBackdrop} />

            {/* Large Header Content (Fades out) */}
            <Animated.View style={[styles.expandedHeader, { opacity: expandedHeaderOpacity }]}>
                <Text style={styles.heroTitle}>ما هي وعود المنتج؟</Text>
                <Text style={styles.heroSub}>حدد الادعاءات المكتوبة على العبوة.</Text>
            </Animated.View>

            {/* Collapsed Header Bar (Fades in) */}
            <Animated.View style={[styles.collapsedHeader, { opacity: collapsedHeaderOpacity }]}>
                <SafeAreaView>
                  <View style={styles.headerContent}>
                    <PressableScale onPress={() => changeStep(step - 1)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.text} />
                    </PressableScale>
                    <Text style={styles.collapsedHeaderText}>ما هي وعود المنتج؟</Text>
                    <View style={{width: 40}} />
                  </View>
                </SafeAreaView>
            </Animated.View>

            {/* Search Bar (Sits statically at the bottom of the header block) */}
            <View style={styles.claimsSearchContainer}>
                <View style={styles.searchInputWrapper}>
                    <FontAwesome5 name="search" size={16} color={COLORS.textDim} style={styles.searchIcon} />
                    <TextInput
                        style={styles.claimsSearchInput}
                        placeholder="ابحث عن إدعاء..."
                        placeholderTextColor={COLORS.textDim}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>
        </Animated.View>

        {/* --- Animated Small, Round FAB --- */}
        <View 
            style={styles.fabContainer}
        >
            {/* ▼▼▼ THE FIX IS HERE ▼▼▼ */}
            <Animated.View
                ref={fabRef} // <-- MODIFICATION: ref is now on the measurable Animated.View
                style={{
                    transform: [{ translateY: fabTranslateY }],
                    opacity: isAnimatingTransition ? 0 : 1 // <-- MODIFICATION: Opacity is also here now
                }}
            >
                <Animated.View style={{ transform: [{ scale: fabScale }] }}>
                    <PressableScale
                        // <-- MODIFICATION: ref and opacity are removed from here
                        onPress={executeAnalysis} 
                        style={styles.fab}
                    >
                        <FontAwesome5 name="flask" color={COLORS.darkGreen} size={22} />
                    </PressableScale>
                </Animated.View>
            </Animated.View>
            {/* ▲▲▲ END OF FIX ▲▲▲ */}
        </View>
      </View>
    );
  };
  
  // --- ▼▼▼ FULLY REVISED renderLoading FUNCTION ▼▼▼ ---
  const renderLoading = () => {
    return ( 
      <View style={styles.loadingContainer}>
          <Animated.Text style={[styles.loadingText, { 
              opacity: heroTransitionAnim.interpolate({
                inputRange: [0.5, 1], // Fade in text during the second half of the transition
                outputRange: [0, 1],
                extrapolate: 'clamp',
              })
          }]}>
              جاري تحليل التركيبة...
          </Animated.Text>
      </View>
    );
  };


  const renderResultStep = () => {
      if(!finalAnalysis) return null;
      return (
          <View style={{width: '100%', gap: 15}}>
              {finalAnalysis.personalMatch.reasons.length > 0 && <StaggeredItem index={0}>
                  <ContentCard style={[styles.personalMatchCard, styles[`personalMatch_${finalAnalysis.personalMatch.status}`]]}>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}><FontAwesome5 name={finalAnalysis.personalMatch.status === 'danger' ? 'times-circle' : finalAnalysis.personalMatch.status === 'warning' ? 'exclamation-triangle' : 'check-circle'} size={24} color={'#FFF'}/><Text style={styles.personalMatchTitle}>{finalAnalysis.personalMatch.status === 'danger' ? 'غير موصى به لك' : finalAnalysis.personalMatch.status === 'warning' ? 'استخدمه بحذر' : 'مطابقة ممتازة لملفك'}</Text></View>
                      {finalAnalysis.personalMatch.reasons.map((reason, i) => <Text key={i} style={styles.personalMatchReason}>{reason}</Text>)}
                  </ContentCard>
              </StaggeredItem>}
              <StaggeredItem index={1}><ContentCard style={styles.vScoreCard}><Text style={styles.verdictText}>{finalAnalysis.finalVerdict}</Text><ScoreRing score={finalAnalysis.oilGuardScore} /><View style={styles.pillarsRow}><View style={styles.pillar}><Text style={styles.pillarTitle}><FontAwesome5 name="flask" /> الفعالية</Text><Text style={[styles.pillarScore, {color: COLORS.info}]}>{finalAnalysis.efficacy.score}%</Text></View><View style={styles.pillar}><Text style={styles.pillarTitle}><FontAwesome5 name="shield-alt" /> السلامة</Text><Text style={[styles.pillarScore, {color: COLORS.primary}]}>{finalAnalysis.safety.score}%</Text></View></View></ContentCard></StaggeredItem>
              <View style={styles.actionRow}><StaggeredItem index={2} style={{flex: 1}}><PressableScale onPress={resetFlow} style={styles.secBtn}><Text style={styles.secBtnText}>فحص جديد</Text></PressableScale></StaggeredItem><StaggeredItem index={3} style={{flex: 1}}><PressableScale onPress={() => setSaveModalVisible(true)} style={styles.priBtn}><Text style={styles.priBtnText}>حفظ للرف</Text></PressableScale></StaggeredItem></View>
              {finalAnalysis.marketing_results.length > 0 && (
    <StaggeredItem index={4}>
        <Text style={styles.resultsSectionTitle}>🔬 كشف حقائق الادعاءات</Text>
        <ClaimsGroupedView results={finalAnalysis.marketing_results} />
    </StaggeredItem>
)}
              {finalAnalysis.detected_ingredients.length > 0 && (
    <StaggeredItem index={5}>
        <Text style={styles.resultsSectionTitle}>
            {`🌿 المكونات المكتشفة (${finalAnalysis.detected_ingredients.length})`}
        </Text>
        
        {/* 1. MOVE Pagination component HERE, above the carousel */}
        <Pagination data={finalAnalysis.detected_ingredients} scrollX={scrollX} />

        <View style={{ marginHorizontal: -20 }}>
            <Animated.FlatList
                data={finalAnalysis.detected_ingredients}
                renderItem={({ item, index }) => (
                    <IngredientDetailCard ingredient={item} index={index} scrollX={scrollX} />
                )}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={ITEM_WIDTH}
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: (width - CARD_WIDTH) / 2 }}
                ItemSeparatorComponent={() => <View style={{ width: SEPARATOR_WIDTH }} />}
                onScrollBeginDrag={() => setShowSwipeHint(false)}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            />
            {showSwipeHint && finalAnalysis.detected_ingredients.length > 1 && <SwipeHint />}
        </View>

    </StaggeredItem>
)}
          </View>
      );
  };
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={styles.container}>
            <View style={styles.darkOverlay} />
            {particles.map((p) => <Spore key={p.id} {...p} />)}

            {step !== 2 && !isAnimatingTransition && (
              <View style={[styles.header, { marginTop: insets.top }]}>
                {step === 0 && <View style={styles.headerBlur} />}
                
                {step > 0 && (
                  <PressableScale onPress={() => changeStep(step - 1)} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                  </PressableScale>
                )}
                <Text style={styles.headerTitle}>محرك V13</Text>
                {step > 0 ? <View style={{width: 40}}/> : <View/>}
              </View>
            )}

            {step === 2 ? (
                <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
                    {renderClaimsStep()}
                </Animated.View>
            ) : (
              <ScrollView 
                ref={scrollRef} 
                contentContainerStyle={[
                  styles.scrollContent, 
                  // Extra padding at bottom for nav bar
                  { paddingBottom: 100 + insets.bottom }
                ]} 
                keyboardShouldPersistTaps="handled"
              >
                  <Animated.View style={{ opacity: contentOpacity, width: '100%'}}>
                      {step === 0 && renderInputStep()}
                      {step === 1 && renderReviewStep()}
                      {step === 3 && (isGeminiLoading ? renderGeminiLoading() : renderLoading())}
                      {step === 4 && renderResultStep()}
                  </Animated.View>
              </ScrollView>
            )}
        </View>

        {/* Modals and Overlays */}
        <Modal transparent visible={isSaveModalVisible} animationType="fade" onRequestClose={() => setSaveModalVisible(false)}>
            {/* ... keep modal content ... */}
            <View style={styles.modalOverlay}>
               <Pressable style={StyleSheet.absoluteFill} blurRadius={step === 0 ? 10 : 0}  onPress={() => setSaveModalVisible(false)} />
                  <Animated.View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>حفظ المنتج</Text>
                      {/* ... inputs ... */}
                      <TextInput style={styles.modalInput} placeholder="مثال: سيروم فيتامين سي XYZ" placeholderTextColor={COLORS.textSecondary} value={productName} onChangeText={setProductName} />
                      <PressableScale onPress={handleSaveProduct} style={styles.modalSaveButton} disabled={isSaving}>
                          {isSaving ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.modalSaveButtonText}>حفظ في رفّي</Text>}
                      </PressableScale>
                  </Animated.View>
            </View>
        </Modal>
        
        <CustomCameraModal
          isVisible={isCameraViewVisible}
          onClose={() => setCameraViewVisible(false)}
          onPictureTaken={handlePictureTaken}
        />

        {isAnimatingTransition && (
          <Animated.View
            style={[
              styles.heroFab,
              {
                // ... animation styles ...
                top: fabMetrics.y,
                left: fabMetrics.x,
                width: fabMetrics.width,
                height: fabMetrics.height,
                transform: [
                   // ... transforms ...
                   { translateX: heroTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, (width / 2) - fabMetrics.x - (fabMetrics.width / 2)] }) },
                   { translateY: heroTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, (height / 2) - fabMetrics.y - (fabMetrics.height / 2)] }) },
                   { scale: heroTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) },
                ],
              },
            ]}
          >
             {/* ... pulsing rings ... */}
            <FontAwesome5 name="flask" color={COLORS.background} size={22} />
          </Animated.View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  // --- Core Layout & Background ---
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background, 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerTitle: { 
    fontFamily: 'Tajawal-ExtraBold', 
    fontSize: 22, 
    color: COLORS.textPrimary 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  scrollContent: { 
    flexGrow: 1, 
    paddingHorizontal: 20, 
    paddingBottom: 40,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight : 40) + 70,
    justifyContent: 'center'
  },
  contentContainer: { 
    width: '100%', 
    alignItems: 'center', 
    paddingVertical: 20 
  },
  cardBase: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
  },

  // --- Step 0: Input Step ---
  heroSection: { 
    alignItems: 'center', 
    marginBottom: 30, 
    paddingHorizontal: 20 
  },
  heroIcon: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: COLORS.card, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroTitle: { 
    fontFamily: 'Tajawal-ExtraBold', 
    fontSize: 28, 
    color: COLORS.textPrimary, 
    textAlign: 'center', 
    marginBottom: 8 
  },
  heroSubContainer: {
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 10,
  },
  heroSub: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 15, 
    color: COLORS.textSecondary, 
    textAlign: 'center', 
    lineHeight: 22,
    minHeight: 22,
  },
  floatingBtnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    width: '100%',
    marginTop: 60,
    marginBottom: 20,
  },
  glowEffect: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
  },
  floatingBtnCore: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
  },
  floatingBtnLabel: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 16,
      color: COLORS.textPrimary,
      marginTop: 15,
  },
  backLinkText: { 
    color: COLORS.textSecondary, 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 14 
  },

  // --- Step 1: Review Step ---
  sectionTitle: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 18, 
    color: COLORS.textPrimary, 
    textAlign: 'right', 
    marginBottom: 15,
    width: '100%',
    paddingHorizontal: 10,
  },
  aiPredictionCard: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    gap: 20,
    backgroundColor: COLORS.card, 
    padding: 20,
    borderRadius: 18,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiPredictionIconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(96, 165, 140, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  aiPredictionLabel: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 12, 
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  aiPredictionValue: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 16, 
    color: COLORS.accentGreen,
    textAlign: 'right',
  },
  changeTypeButton: { 
    marginTop: 15, 
    alignSelf: 'center', 
    padding: 10,
  },
  changeTypeText: { 
    color: COLORS.accentGreen, 
    fontSize: 14,
    fontFamily: 'Tajawal-Bold',
  },
  typeGrid: { 
    flexDirection: 'row-reverse', 
    flexWrap: 'wrap', 
    gap: 12, 
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  typeChip: { 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderRadius: 25, 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    gap: 10,
    backgroundColor: COLORS.card,
  },
  typeText: { 
    fontSize: 13, 
    fontFamily: 'Tajawal-Bold' 
  },

  // --- Step 2: Claims Step ---
  fixedHeaderBlock: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
  },
  expandedHeader: {
      height: 160,
      alignItems: 'center',
      justifyContent: 'center',
  },
  collapsedHeader: {
      position: 'absolute',
      top: 40,
      left: 0,
      right: 0,
      height: Platform.OS === 'android' ? 20 : 90,
      justifyContent: 'flex-end',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  collapsedHeaderText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 18,
      color: COLORS.textPrimary,
  },
  claimsSearchContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 70,
      paddingHorizontal: 15,
      justifyContent: 'center',
  },
  searchInputWrapper: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 15,
  },
  searchIcon: {
      marginLeft: 10,
  },
  claimsSearchInput: {
      flex: 1,
      height: 50,
      color: COLORS.textPrimary,
      fontFamily: 'Tajawal-Regular',
      fontSize: 15,
      textAlign: 'right',
  },
  claimItem: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
      gap: 15,
  },
  claimItemActive: {
      borderColor: COLORS.accentGreen,
      backgroundColor: 'rgba(96, 165, 140, 0.1)',
  },
  claimItemText: {
      fontFamily: 'Tajawal-Bold', 
      fontSize: 16, 
      color: COLORS.textPrimary,
      flex: 1,
      textAlign: 'right',
  },
  checkboxBase: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: COLORS.accentGreen,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(13, 27, 30, 0.5)',
  },
  checkboxFill: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: COLORS.accentGreen,
      borderRadius: 14,
  },
  fabContainer: {
      position: 'absolute',
      bottom: Platform.OS === 'android' ? 70 : 90,
      alignSelf: 'center',
      zIndex: 20,
  },
  fab: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: COLORS.accentGreen,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: COLORS.accentGlow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
  },
  heroFab: {
    position: 'absolute',
    zIndex: 1000,
    backgroundColor: COLORS.accentGreen,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 32,
    borderWidth: 3,
  },

  // --- Step 3: Loading ---
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  flaskAnimationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  loadingText: {
    color: COLORS.textPrimary,
    fontFamily: 'Tajawal-Bold',
    fontSize: 20,
    textAlign: 'center',
  },

  // --- Step 4: Results ---
  resultsSectionTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  personalMatchCard: { 
    padding: 15, 
    borderWidth: 1,
    borderRadius: 20,
    backgroundColor: COLORS.card,
  },
  personalMatch_good: { borderColor: COLORS.success },
  personalMatch_warning: { borderColor: COLORS.warning },
  personalMatch_danger: { borderColor: COLORS.danger },
  personalMatchTitle: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 16, 
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  personalMatchReason: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 13, 
    color: COLORS.textSecondary, 
    marginTop: 8,
    textAlign: 'right',
  },
  vScoreCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  verdictText: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 22, 
    color: COLORS.textPrimary, 
    textAlign: 'center', 
    marginBottom: 10 
  },
  pillarsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    width: '100%', 
    marginTop: 15, 
    paddingTop: 15, 
    borderTopWidth: 1, 
    borderTopColor: COLORS.border, 
  },
  pillar: { 
    alignItems: 'center', 
    gap: 5 
  },
  pillarTitle: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 14, 
    color: COLORS.textSecondary, 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 5,
  },
  pillarScore: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 20 
  },
  groupHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  groupTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 16,
  },
  truthCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  truthTrigger: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 15,
    gap: 15,
  },
  truthTitleContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  truthTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 15,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  truthStatus: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  truthDetails: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 10,
  },
  truthExplanation: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    textAlign: 'right',
    marginBottom: 15,
  },
  evidenceContainer: {},
  evidenceTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 10,
  },
  evidencePillsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  evidencePill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  evidencePillText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  pillProven: { backgroundColor: `${COLORS.success}40` },
  pillTraditional: { backgroundColor: `${COLORS.gold}40` },
  pillDoubtful: { backgroundColor: `${COLORS.warning}40` },
  pillIneffective: { backgroundColor: `${COLORS.danger}40` },
  ingCardBase: {
    width: width * 0.85,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 15,
  },
  ingHeader: { alignItems: 'flex-end' },
  ingName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 22, color: COLORS.textPrimary, textAlign: 'right' },
  ingTagsContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  ingTag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  ingFuncTag: { backgroundColor: 'rgba(96, 165, 140, 0.2)' },
  ingChemTag: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  ingTagText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textPrimary },
  ingBenefitsContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 15 },
  ingBenefitChip: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  ingBenefitText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary },
  ingDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
  ingWarningBox: { borderRadius: 12, padding: 12, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  ingWarningIcon: { marginTop: 2 },
  ingWarningText: { flex: 1, fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textPrimary, lineHeight: 20, textAlign: 'right' },

  // --- Shared Components ---
  mainBtn: { flexDirection: 'row-reverse', backgroundColor: COLORS.accentGreen, borderRadius: 50, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%' },
  mainBtnText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.background },
  actionRow: { flexDirection: 'row', gap: 15, marginTop: 20, width: '100%' },
  secBtn: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.textSecondary, borderRadius: 15 },
  secBtnText: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold', fontSize: 15 },
  priBtn: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentGreen, borderRadius: 15 },
  priBtnText: { color: COLORS.background, fontFamily: 'Tajawal-Bold', fontSize: 15 },

  // --- Save Modal ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalTitle: { fontFamily: 'Tajawal-Bold', fontSize: 20, color: COLORS.textPrimary, marginBottom: 10 },
  modalSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
  modalInput: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 15,
    color: COLORS.textPrimary,
    fontFamily: 'Tajawal-Regular',
    textAlign: 'right',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  modalSaveButton: { width: '100%', padding: 15, backgroundColor: COLORS.accentGreen, borderRadius: 12, alignItems: 'center' },
  modalSaveButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.background },
  
  // --- Pagination & Swipe Hint ---
  swipeHintContainer: { position: 'absolute', right: '40%', top: '45%', transform: [{ translateY: -30 }], zIndex: 10, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  paginationSimpleContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  paginationContainer: { height: DOT_SIZE, width: PAGINATION_DOTS * DOT_SIZE + (PAGINATION_DOTS - 1) * DOT_SPACING, justifyContent: 'center', alignSelf: 'center', marginBottom: 20, overflow: 'hidden' },
  paginationTrack: { flexDirection: 'row', alignItems: 'center' },
  paginationDot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: 'rgba(255, 255, 255, 0.25)', marginRight: DOT_SPACING },
  paginationIndicator: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: COLORS.accentGreen, position: 'absolute', left: 0 },
  
  // --- Camera Modal ---
  permissionContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', gap: 20 },
  permissionText: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: COLORS.textPrimary, textAlign: 'center', paddingHorizontal: 30 },
  permissionButton: { backgroundColor: COLORS.accentGreen, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15 },
  permissionButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.background },
  cameraOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between' },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 55,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cameraTitle: { fontFamily: 'Tajawal-Bold', fontSize: 20, color: COLORS.textPrimary },
  cameraCloseButton: { padding: 5 },
  cameraScannerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: '5%' },
  cameraGuideText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, overflow: 'hidden', position: 'absolute', top: '20%' },
  cornerBracket: { position: 'absolute', width: 40, height: 40, borderColor: COLORS.accentGreen, borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  cameraFooter: {
    paddingTop: 30,
    paddingBottom: Platform.OS === 'android' ? 30 : 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  shutterPulseRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: COLORS.accentGlow },
  shutterButtonOuter: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  shutterButtonInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: COLORS.accentGreen, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.background },
});