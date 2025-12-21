import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, Dimensions, 
  ScrollView, Animated, ImageBackground, Platform, ActivityIndicator, 
  Alert, UIManager, LayoutAnimation, StatusBar, TextInput, Modal, Pressable, I18nManager,
  RefreshControl, Easing, SafeAreaView, FlatList, Slider, PanResponder, Vibration
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Image as RNImage, } from 'react-native';
import Svg, { Circle, Path, Defs, ClipPath, Rect, Mask } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../src/config/firebase';
import { useAppContext } from '../../src/context/AppContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as NavigationBar from 'expo-navigation-bar';
import Fuse from 'fuse.js';

// --- DATA IMPORTS ---
import { combinedOilsDB } from '../../src/data/alloilsdb';
import { marketingClaimsDB } from '../../src/data/marketingclaimsdb';
import { 
  commonAllergies, 
  commonConditions,
  basicSkinTypes,
  basicScalpTypes
} from '../../src/data/allergiesandconditions';

// --- STYLE & CONSTANT IMPORTS ---
import { 
  styles, COLORS, width, height, 
  ITEM_WIDTH, SEPARATOR_WIDTH, CARD_WIDTH,
  DOT_SIZE, PAGINATION_DOTS, DOT_SPACING 
} from './oilguard.styles';

// --- SYSTEM CONFIG ---
I18nManager.allowRTL(false);

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

// --- LOGIC FUNCTIONS ---
const normalizeForMatching = (name) => {
  if (!name) return '';
  return name.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
    .replace(/[.,،؛:()|[\]/%!@#$^&*_+={}<>?~`"'\\]/g, ' ') 
    .replace(/[^a-zA-Z0-9\u0600-\u06FF\s-]/g, ' ') 
    .replace(/\s+/g, ' ') 
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
          delay: 400,
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); 
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
      const animation = Animated.loop(
          Animated.sequence([
              Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
              Animated.timing(translateX, {
                  toValue: -35,
                  duration: 1000,
                  delay: 100,
                  easing: Easing.inOut(Easing.ease),
                  useNativeDriver: true,
              }),
              Animated.timing(opacity, { toValue: 0, duration: 400, delay: 200, useNativeDriver: true }),
              Animated.timing(translateX, { toValue: 0, duration: 0, useNativeDriver: true }), 
              Animated.delay(1000), 
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

  const indicatorTranslateX = scrollX.interpolate({
      inputRange: [0, (data.length - 1) * ITEM_WIDTH],
      outputRange: [0, (data.length - 1) * (DOT_SIZE + DOT_SPACING)],
      extrapolate: 'clamp',
  });

  const containerWidth = PAGINATION_DOTS * DOT_SIZE + (PAGINATION_DOTS - 1) * DOT_SPACING;
  const centerPoint = (containerWidth / 2) - (DOT_SIZE / 2); 

  const containerTranslateX = scrollX.interpolate({
      inputRange: [
          0,
          (data.length - 1) * ITEM_WIDTH 
      ],
      outputRange: [
          0,
          -((data.length - 1) * (DOT_SIZE + DOT_SPACING) - centerPoint) + centerPoint 
      ],
      extrapolate: 'clamp'
  });

  return (
      <View style={styles.paginationContainer}>
          <Animated.View style={[ { transform: [{ translateX: containerTranslateX }] }]}>
              <View style={styles.paginationTrack}>
                  {data.map((_, idx) => (
                      <View key={`track-dot-${idx}`} style={styles.paginationDot} />
                  ))}
              </View>

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
  const getWarningStyle = (level) => {
    switch (level) {
      case 'risk':
        return { color: COLORS.danger, icon: 'exclamation-circle' };
      case 'caution':
        return { color: COLORS.warning, icon: 'exclamation-triangle' };
      default: 
        return { color: COLORS.info, icon: 'info-circle' };
    }
  };

  const benefits = ingredient.benefits ? Object.keys(ingredient.benefits) : [];

  const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];
  const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
  });
  const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: 'clamp',
  });
  return (
    <StaggeredItem index={index}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
            <View  intensity={30} tint="extraLight" style={styles.ingCardBase} renderToHardwareTextureAndroid>
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

        {benefits.length > 0 && (
          <View style={styles.ingBenefitsContainer}>
            {benefits.map(benefit => (
              <View key={benefit} style={styles.ingBenefitChip}>
                <Text style={styles.ingBenefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        )}

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
  const cameraViewRef = useRef(null);
  
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const VIEWPORT_WIDTH = SCREEN_WIDTH * 0.85;
  const VIEWPORT_HEIGHT = SCREEN_HEIGHT * 0.50; 
  const VIEWPORT_X = (SCREEN_WIDTH - VIEWPORT_WIDTH) / 2;
  const VIEWPORT_Y = (SCREEN_HEIGHT - VIEWPORT_HEIGHT) / 2 - 50; 
  
  const SLIDER_WIDTH = SCREEN_WIDTH * 0.8; 
  const SLIDER_START_X = (SCREEN_WIDTH - SLIDER_WIDTH) / 2;
  const MAX_ZOOM_FACTOR = 0.15; 

  const [isCapturing, setIsCapturing] = useState(false);
  const [isCameraReady, setCameraReady] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const [zoomLevel, setZoomLevel] = useState(0); 
  const [displayZoom, setDisplayZoom] = useState(1.0); 

  const uiAnim = useRef(new Animated.Value(0)).current; 
  const scanAnim = useRef(new Animated.Value(0)).current; 
  const shutterFlashAnim = useRef(new Animated.Value(0)).current; 
  const knobScale = useRef(new Animated.Value(1)).current; 
  const tooltipOpacity = useRef(new Animated.Value(0)).current; 

  const updateZoom = (gestureX) => {
    let relativeX = gestureX - SLIDER_START_X;
    if (relativeX < 0) relativeX = 0;
    if (relativeX > SLIDER_WIDTH) relativeX = SLIDER_WIDTH;

    const percentage = relativeX / SLIDER_WIDTH;
    
    setZoomLevel(percentage * MAX_ZOOM_FACTOR);
    setDisplayZoom(1 + (percentage * 3)); 
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.parallel([
            Animated.spring(knobScale, { toValue: 1.3, useNativeDriver: true }),
            Animated.timing(tooltipOpacity, { toValue: 1, duration: 150, useNativeDriver: true })
        ]).start();
        updateZoom(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt, gestureState) => {
        updateZoom(gestureState.moveX);
      },
      onPanResponderRelease: () => {
        Animated.parallel([
            Animated.spring(knobScale, { toValue: 1, useNativeDriver: true }),
            Animated.timing(tooltipOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
        ]).start();
      }
    })
  ).current;

  useEffect(() => {
    if (Platform.OS === 'android' && isVisible) NavigationBar.setBackgroundColorAsync('#00000000');
  }, [isVisible]);

  useEffect(() => {
    let scanLoop;
    if (isVisible) {
      if (!permission?.granted) requestPermission();
      
      Animated.spring(uiAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true, delay: 100 }).start();

      scanLoop = Animated.loop(
        Animated.sequence([
            Animated.timing(scanAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(scanAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      );
      scanLoop.start();
    } else {
      uiAnim.setValue(0);
    }
    return () => scanLoop?.stop();
  }, [isVisible, permission]);

  const handleCapture = async () => {
    if (!cameraViewRef.current || isCapturing || !isCameraReady) return;
    setIsCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.sequence([
        Animated.timing(shutterFlashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(shutterFlashAnim, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start();

    try {
      const photo = await cameraViewRef.current.takePictureAsync({ quality: 0.8, base64: true });
      const manipulated = await ImageManipulator.manipulateAsync(photo.uri, [{ resize: { width: 1080 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
      onPictureTaken(manipulated);
    } catch (e) {
      setIsCapturing(false);
    }
  };

  const toggleFlash = () => {
      Haptics.selectionAsync();
      setFlashMode(prev => prev === 'off' ? 'on' : 'off');
  };

  if (!permission || !permission.granted) return null;

  const laserY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [VIEWPORT_Y, VIEWPORT_Y + VIEWPORT_HEIGHT] });
  const controlsY = uiAnim.interpolate({ inputRange: [0, 1], outputRange: [150, 0] });
  
  const knobPosition = (zoomLevel / MAX_ZOOM_FACTOR) * SLIDER_WIDTH;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={StyleSheet.absoluteFill}
          ref={cameraViewRef}
          facing="back"
          flash={flashMode}
          zoom={zoomLevel}
          onCameraReady={() => setCameraReady(true)}
          mode="picture"
        >
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <Mask id="mask" x="0" y="0" height="100%" width="100%">
                <Rect height="100%" width="100%" fill="#fff" />
                <Rect x={VIEWPORT_X} y={VIEWPORT_Y} width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT} rx="30" fill="#000" />
              </Mask>
            </Defs>
            <Rect height="100%" width="100%" fill="rgba(0,0,0,0.8)" mask="url(#mask)" />
            <Rect x={VIEWPORT_X} y={VIEWPORT_Y} width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT} rx="30" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="transparent"/>
            
            <Path d={`M${VIEWPORT_X} ${VIEWPORT_Y + 30} V${VIEWPORT_Y} H${VIEWPORT_X + 30}`} stroke={COLORS.accentGreen} strokeWidth={4} fill="none"/>
            <Path d={`M${VIEWPORT_X + VIEWPORT_WIDTH} ${VIEWPORT_Y + 30} V${VIEWPORT_Y} H${VIEWPORT_X + VIEWPORT_WIDTH - 30}`} stroke={COLORS.accentGreen} strokeWidth={4} fill="none"/>
            <Path d={`M${VIEWPORT_X} ${VIEWPORT_Y + VIEWPORT_HEIGHT - 30} V${VIEWPORT_Y + VIEWPORT_HEIGHT} H${VIEWPORT_X + 30}`} stroke={COLORS.accentGreen} strokeWidth={4} fill="none"/>
            <Path d={`M${VIEWPORT_X + VIEWPORT_WIDTH} ${VIEWPORT_Y + VIEWPORT_HEIGHT - 30} V${VIEWPORT_Y + VIEWPORT_HEIGHT} H${VIEWPORT_X + VIEWPORT_WIDTH - 30}`} stroke={COLORS.accentGreen} strokeWidth={4} fill="none"/>
          </Svg>

          <Animated.View style={[styles.laserLine, { width: VIEWPORT_WIDTH, left: VIEWPORT_X, transform: [{ translateY: laserY }] }]}>
            <LinearGradient colors={['transparent', COLORS.accentGreen, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, opacity: 0.8 }} />
          </Animated.View>

          <SafeAreaView style={styles.topStatusContainer}>
             <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>الذكاء الاصطناعي نشط</Text>
             </View>
             <Text style={styles.hintText}>التقط صورة واضحة للمكونات</Text>
          </SafeAreaView>

          <Animated.View style={[styles.bottomControlDeck, { transform: [{translateY: controlsY}], opacity: uiAnim }]}>
            
            <View style={{ width: SLIDER_WIDTH, marginBottom: 25 }}>
                
                <Animated.View style={[
                    styles.zoomTooltip, 
                    { 
                        opacity: tooltipOpacity,
                        left: knobPosition - 20, 
                    }
                ]}>
                    <Text style={styles.zoomTooltipText}>{displayZoom.toFixed(1)}x</Text>
                    <View style={styles.zoomTooltipArrow} />
                </Animated.View>

                <View 
                    style={styles.sliderContainer}
                    {...panResponder.panHandlers}
                >
                    <View style={styles.sliderTrackBg} />
                    <View style={[styles.sliderTrackFill, { width: knobPosition }]} />
                    <Animated.View style={[styles.sliderKnob, { left: knobPosition, transform: [{ scale: knobScale }, { translateX: -14 }] }]}>
                         <View style={styles.sliderKnobDot} />
                    </Animated.View>
                </View>

                <View style={styles.sliderLabels}>
                    <Text style={styles.sliderLabelText}>1x</Text>
                    <Text style={styles.sliderLabelText}>4x</Text>
                </View>
            </View>

            <View style={styles.mainControlsRow}>
                
                <PressableScale onPress={toggleFlash} style={[styles.sideControlBtn, flashMode === 'on' && styles.sideControlBtnActive]}>
                    <Ionicons name={flashMode === 'on' ? "flash" : "flash-off"} size={24} color={flashMode === 'on' ? "#000" : "#FFF"} />
                </PressableScale>

                <Pressable onPress={handleCapture} disabled={isCapturing}>
                    <View style={styles.shutterOuter}>
                        {isCapturing ? <ActivityIndicator size="large" color={COLORS.accentGreen} /> : <View style={styles.shutterInner} />}
                    </View>
                </Pressable>

                <PressableScale onPress={onClose} style={[styles.sideControlBtn, { backgroundColor: 'rgba(255, 50, 50, 0.2)', borderColor: 'rgba(255, 50, 50, 0.4)' }]}>
                    <Ionicons name="close" size={28} color="#FFF" />
                </PressableScale>

            </View>

          </Animated.View>

          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF', opacity: shutterFlashAnim, pointerEvents: 'none' }]} />
        </CameraView>
      </View>
    </Modal>
  );
};

const AnimatedCheckbox = ({ isSelected }) => {
  const scale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const checkScale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
      Animated.spring(scale, {
          toValue: isSelected ? 1 : 0,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
      }).start();
      Animated.timing(checkScale, {
          toValue: isSelected ? 1 : 0,
          duration: 200,
          delay: isSelected ? 100 : 0, 
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
      outputRange: [0, -width * 0.8], 
  });

  return (
      <Animated.View style={{ width: '200%', height: 40, transform: [{ translateX }] }}>
          <Svg height="40" width={width * 1.6} style={{ width: '100%' }}>
              <Circle cx="50%" cy="50%" r="50%" fill={COLORS.primaryGlow} />
          </Svg>
      </Animated.View>
  );
};

const Bubble = ({ size, x, duration, delay }) => {
  const animY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
        return () => animation.stop();
    }, delay);
    return () => clearTimeout(timer);
  }, []);


  const animatedCy = animY.interpolate({ 
    inputRange: [0, 1], 
    outputRange: [90, 15] 
});

return <AnimatedCircle
cx={x}
cy={animatedCy} 
r={size}
fill={COLORS.primaryGlow}
opacity={0.7}
/>;
};

const Typewriter = ({ texts, typingSpeed = 80, deletingSpeed = 40, pauseDuration = 1500, style }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
      const cursorInterval = setInterval(() => {
          setShowCursor(prev => !prev);
      }, 500);

      const handleTyping = () => {
          const currentText = texts[textIndex];
          
          if (isDeleting) {
              if (displayedText.length > 0) {
                  const timeout = setTimeout(() => {
                      setDisplayedText(currentText.substring(0, displayedText.length - 1));
                  }, deletingSpeed);
                  return () => clearTimeout(timeout);
              } else {
                  setIsDeleting(false);
                  setTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
              }
          } 
          else {
              if (displayedText.length < currentText.length) {
                  const timeout = setTimeout(() => {
                      setDisplayedText(currentText.substring(0, displayedText.length + 1));
                  }, typingSpeed);
                  return () => clearTimeout(timeout);
              } else {
                  const timeout = setTimeout(() => {
                      setIsDeleting(true);
                  }, pauseDuration);
                  return () => clearTimeout(timeout);
              }
          }
      };

      const typingTimeout = handleTyping();

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

const AnimatedTypeChip = ({ type, isSelected, onPress, index }) => {
  const anim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isSelected ? 1 : 0,
      friction: 7,
      tension: 50,
      useNativeDriver: false, 
    }).start();
  }, [isSelected]);

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.card, COLORS.accentGreen], 
  });

  const textColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.textSecondary, COLORS.textOnAccent], 
  });

  const iconColor = isSelected ? COLORS.textOnAccent : COLORS.textSecondary;

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

const ImageCropperModal = ({ isVisible, imageUri, onClose, onCropComplete }) => {
  const SCREEN_WIDTH = width;
  const SCREEN_HEIGHT = height;
  const MASK_WIDTH = width * 0.85; 
  const MASK_HEIGHT = height * 0.5; 
  const MASK_X = (SCREEN_WIDTH - MASK_WIDTH) / 2;
  const MASK_Y = (SCREEN_HEIGHT - MASK_HEIGHT) / 2 - 40;

  const [imageLayout, setImageLayout] = useState(null); 
  const [viewSize, setViewSize] = useState(null); 
  
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0); 
  const [isProcessing, setIsProcessing] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const panAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (imageUri) {
      RNImage.getSize(imageUri, (w, h) => {
        setImageLayout({ width: w, height: h });
        const ratio = Math.min(SCREEN_WIDTH / w, SCREEN_HEIGHT / h);
        setViewSize({ width: w * ratio, height: h * ratio, ratio });
      });
      setScale(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      scaleAnim.setValue(1);
      panAnim.setValue({ x: 0, y: 0 });
      rotateAnim.setValue(0);
    }
  }, [imageUri]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panAnim.setOffset({ x: pan.x, y: pan.y });
        panAnim.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: panAnim.x, dy: panAnim.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        panAnim.flattenOffset();
        setPan({ x: pan.x + gestureState.dx, y: pan.y + gestureState.dy });
      },
    })
  ).current;

  const handleZoom = (val) => {
    const newScale = 1 + val * 2; 
    setScale(newScale);
    scaleAnim.setValue(newScale);
  };

  const rotate90 = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    Animated.spring(rotateAnim, { toValue: nextRot, useNativeDriver: true }).start();
  };

  const performCrop = async () => {
    if (!imageLayout || !viewSize) return;
    setIsProcessing(true);

    try {
        let processingUri = imageUri;
        if (rotation !== 0) {
            const rotResult = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ rotate: rotation }],
                { format: ImageManipulator.SaveFormat.JPEG }
            );
            processingUri = rotResult.uri;
            if (rotation % 180 !== 0) {
                 setImageLayout({ width: imageLayout.height, height: imageLayout.width });
            }
        }

        const centerX = SCREEN_WIDTH / 2;
        const centerY = SCREEN_HEIGHT / 2;
        
        const imgCenterX = centerX + pan.x;
        const imgCenterY = centerY + pan.y;

        const currentWidth = viewSize.width * scale;
        const currentHeight = viewSize.height * scale;
        
        const imgTopLeftX = imgCenterX - (currentWidth / 2);
        const imgTopLeftY = imgCenterY - (currentHeight / 2);

        const maskTopLeftX = MASK_X;
        const maskTopLeftY = MASK_Y;

        const cropStartScreenX = maskTopLeftX - imgTopLeftX;
        const cropStartScreenY = maskTopLeftY - imgTopLeftY;

        const resolutionRatio = imageLayout.width / currentWidth; 

        let cropX = cropStartScreenX * resolutionRatio;
        let cropY = cropStartScreenY * resolutionRatio;
        let cropW = MASK_WIDTH * resolutionRatio;
        let cropH = MASK_HEIGHT * resolutionRatio;

        cropX = Math.max(0, cropX);
        cropY = Math.max(0, cropY);
        if (cropX + cropW > imageLayout.width) cropW = imageLayout.width - cropX;
        if (cropY + cropH > imageLayout.height) cropH = imageLayout.height - cropY;

        const cropResult = await ImageManipulator.manipulateAsync(
            processingUri,
            [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }],
            { format: ImageManipulator.SaveFormat.JPEG, compress: 0.8 }
        );

        onCropComplete(cropResult);

    } catch (error) {
        Alert.alert("Error", "Could not crop image.");
        console.error(error);
        setIsProcessing(false);
    }
  };

  if (!isVisible || !imageUri) return null;

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.cropperContainer}>
        
        <View style={styles.cropperHeader}>
            <PressableScale onPress={onClose} style={styles.iconButtonBlur}>
                <Ionicons name="close" size={24} color="#FFF" />
            </PressableScale>
            <Text style={styles.cropperTitle}>تحديد المكونات</Text>
            <PressableScale onPress={rotate90} style={styles.iconButtonBlur}>
                <MaterialIcons name="rotate-right" size={24} color="#FFF" />
            </PressableScale>
        </View>

        <View style={styles.cropperWorkspace} {...panResponder.panHandlers}>
            {viewSize && (
                <Animated.Image
                    source={{ uri: imageUri }}
                    style={{
                        width: viewSize.width,
                        height: viewSize.height,
                        transform: [
                            { translateX: panAnim.x },
                            { translateY: panAnim.y },
                            { scale: scaleAnim },
                            { rotate: rotateAnim.interpolate({inputRange: [0, 360], outputRange: ['0deg', '360deg']}) }
                        ]
                    }}
                    resizeMode="contain"
                />
            )}

            <View style={styles.cropperOverlay} pointerEvents="none">
                <View style={{ width: '100%', height: MASK_Y, backgroundColor: 'rgba(0,0,0,0.8)' }} />
                <View style={{ flexDirection: 'row', height: MASK_HEIGHT }}>
                    <View style={{ width: MASK_X, backgroundColor: 'rgba(0,0,0,0.8)' }} />
                    <View style={styles.cropperWindow}>
                         <View style={[styles.cornerBracket, styles.topLeft]} />
                         <View style={[styles.cornerBracket, styles.topRight]} />
                         <View style={[styles.cornerBracket, styles.bottomLeft]} />
                         <View style={[styles.cornerBracket, styles.bottomRight]} />
                    </View>
                    <View style={{ width: MASK_X, backgroundColor: 'rgba(0,0,0,0.8)' }} />
                </View>
                <View style={{ width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)' }} />
            </View>
        </View>

        <View style={styles.cropperFooter}>
            <View style={styles.cropperHint}>
                <Ionicons name="scan-outline" size={16} color={COLORS.accentGreen} />
                <Text style={styles.cropperHintText}>حرك الصورة لتكون المكونات داخل الإطار</Text>
            </View>

            <View style={{ width: '80%', height: 40, justifyContent: 'center', marginVertical: 20 }}>
                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }} />
                <View style={{ 
                    position: 'absolute', height: 4, backgroundColor: COLORS.accentGreen, borderRadius: 2,
                    width: `${((scale-1)/2)*100}%` 
                }} />
                <Slider
                    style={{ width: '100%', height: 40, position: 'absolute' }}
                    minimumValue={0}
                    maximumValue={1}
                    minimumTrackTintColor="transparent"
                    maximumTrackTintColor="transparent"
                    thumbTintColor="#FFF"
                    onValueChange={handleZoom}
                />
            </View>

            <PressableScale onPress={performCrop} style={styles.mainBtn} disabled={isProcessing}>
                {isProcessing ? (
                    <ActivityIndicator color={COLORS.background} />
                ) : (
                    <>
                    <Text style={styles.mainBtnText}>تأكيد القص</Text>
                    <Ionicons name="checkmark" size={20} color={COLORS.background} />
                    </>
                )}
            </PressableScale>
        </View>

      </View>
    </Modal>
  );
};

// ============================================================================
//                        MAIN SCREEN COMPONENT
// ============================================================================
export default function OilGuardEngine() {
  const router = useRouter();
  const { user, userProfile } = useAppContext();
  const insets = useSafeAreaInsets();

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
  const [cropperVisible, setCropperVisible] = useState(false);
  const [tempImageUri, setTempImageUri] = useState(null);

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const introIconScale = useRef(new Animated.Value(1)).current;
  const introShineAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const fabPulseAnim = useRef(new Animated.Value(1)).current;
  const heroTransitionAnim = useRef(new Animated.Value(0)).current; 
  const fabIconRef = useRef(null);
  const fabRef = useRef(null);
  const revealAnim = useRef(new Animated.Value(0)).current;
  const loadingFillAnim = useRef(new Animated.Value(0)).current;
  const loadingDropAnim = useRef(new Animated.Value(0)).current;
  const loadingTextOpacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
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

  useEffect(() => {
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

    if (step === 0) {
      breathAnimation.start();
      shineAnimation.start();
    } else if (step === 3) {
      if (isGeminiLoading) {
        loadingTextOpacityAnim.setValue(0.6); 
        textPulse.start();
      } else {
        loadingDropAnim.setValue(0);
        loadingFillAnim.setValue(0);
        loadingTextOpacityAnim.setValue(0);
        drop.start();
        fill.start();
        textPulse.start();
      }
    }

    return () => {
        breathAnimation.stop();
        shineAnimation.stop();
        drop.stop();
        fill.stop();
        textPulse.stop();
    };
  }, [step, isGeminiLoading]);

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

        if (mode === 'camera') {
            setCameraViewVisible(true);
            return; 
        }

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
            processImageWithGemini(result.assets[0].uri);
        }
    } catch (error) {
        console.error("Image selection error:", error);
        Alert.alert("Error", "Could not select an image. Please try again.");
    }
};

const handlePictureTaken = (photo) => {
  setCameraViewVisible(false);
  if (photo && photo.uri) {
      processImageWithGemini(photo.uri);
  }
};

const VERCEL_BACKEND_URL = "https://oilguard-backend.vercel.app/api/analyze.js";

const processImageWithGemini = async (uri) => {
  setLoading(true);
  setIsGeminiLoading(true);
  changeStep(3);

  try {
    const base64Data = await uriToBase64(uri);

    const response = await fetch(VERCEL_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Data: base64Data }),
    });

    const responseData = await response.json();
    
    // LOG ADDED HERE
    console.log("Backend Response Data:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      throw new Error(responseData.error || "An error occurred in the backend.");
    }

    let text = responseData.result.replace(/```json|```/g, '').trim();

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
    console.error("Vercel Backend Error:", error);
    Alert.alert("Analysis Failed", `Could not process image: ${error.message}`);
    setIsGeminiLoading(false);
    setLoading(false);
    changeStep(0);
  }
};
  
// --- UPDATED EXTRACTION FUNCTION ---
const extractIngredientsFromAIText = async (text) => {
  const foundIngredients = new Map();
  if (!text) return { ingredients: [] };

  // SAFETY CHECK: Ensure text is a string
  let textToProcess = text;
  if (Array.isArray(text)) {
      textToProcess = text.join('\n');
  } else if (typeof text === 'object') {
      textToProcess = JSON.stringify(text);
  } else {
      textToProcess = String(text);
  }

  const lines = textToProcess.split('\n').filter(line => line.trim() !== '');

  lines.forEach(line => {
      // Regex updated to be more forgiving if numbers are missing
      const match = line.match(/^\s*(?:\d+[\.\-\)\s]*)?([^|]+)/);
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

    fabRef.current.measure((fx, fy, width, height, px, py) => {
      setFabMetrics({ x: px, y: py, width, height });
      
      const destX = (Dimensions.get('window').width / 2) - (width / 2);
      const destY = (Dimensions.get('window').height / 2) - (height / 2);

      setIsAnimatingTransition(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Animated.timing(heroTransitionAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: true,
      }).start(() => {
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
        
        setIsAnimatingTransition(false);
        heroTransitionAnim.setValue(0);
        changeStep(4);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      });

      setTimeout(() => {
        changeStep(3);
      }, 200);
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
    const textOpacity = loadingTextOpacityAnim;

    return (
        <View style={styles.contentContainer}>
            <StaggeredItem index={0}>
                <View style={styles.flaskAnimationContainer}>
                    <Svg width={180} height={180} viewBox="0 0 100 100">
                        {loadingBubbles.map(bubble => <Bubble key={bubble.id} {...bubble} />)}
                        
                        <Path
                            d="M 50 95 L 40 95 A 10 10 0 0 1 30 85 L 30 60 A 20 20 0 0 1 50 40 A 20 20 0 0 1 70 60 L 70 85 A 10 10 0 0 1 60 95 L 50 95 M 50 40 L 50 5"
                            stroke={COLORS.primary}
                            strokeWidth="3"
                            fill="rgba(178, 216, 180, 0.05)" 
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

  const InputStepView = ({ onImageSelect }) => {
    const scanBarAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(scanBarAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: Platform.OS !== 'web'
                }),
                Animated.timing(scanBarAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: Platform.OS !== 'web'
                })
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const scanTranslateY = scanBarAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 140]
    });

    return (
        <View style={styles.inputStepContainer}>
            <View style={styles.heroVisualContainer}>
                <View style={styles.scanFrame}>
                    <FontAwesome5 name="wine-bottle" size={80} color={COLORS.textSecondary} style={{ opacity: 0.5 }} />
                    <Animated.View style={[
                        styles.scanLaser,
                        { transform: [{ translateY: scanTranslateY }] }
                    ]}>
                        <LinearGradient
                            colors={['transparent', COLORS.accentGreen, 'transparent']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={{ flex: 1 }}
                        />
                    </Animated.View>
                    <View style={[styles.scanCorner, styles.scanCornerTL]} />
                    <View style={[styles.scanCorner, styles.scanCornerTR]} />
                    <View style={[styles.scanCorner, styles.scanCornerBL]} />
                    <View style={[styles.scanCorner, styles.scanCornerBR]} />
                </View>
            </View>

            <StaggeredItem index={0} style={styles.bottomDeck}>
                <LinearGradient
                    colors={[COLORS.card, '#152520']}
                    style={styles.bottomDeckGradient}
                >
                    <View style={styles.deckHeader}>
                        <Text style={styles.deckTitle}>فحص المكونات</Text>
                        <Typewriter
                            texts={[
                                "كشف الخبايا الكيميائية...",
                                "تحليل مدى الأمان...",
                                "هل يناسب بشرتك؟",
                            ]}
                            typingSpeed={60}
                            style={{
                                container: { height: 24, justifyContent: 'center' },
                                text: { fontFamily: 'Tajawal-Regular', color: COLORS.accentGreen, fontSize: 14 }
                            }}
                        />
                    </View>

                    <PressableScale onPress={() => onImageSelect('camera')} style={styles.primaryActionBtn}>
                        <LinearGradient
                            colors={[COLORS.accentGreen, '#4a8570']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.primaryActionGradient}
                        >
                            <View style={styles.iconCircle}>
                                <Ionicons name="camera" size={28} color={COLORS.background} />
                            </View>
                            <View>
                                <Text style={styles.primaryActionTitle}>تصوير المنتج</Text>
                                <Text style={styles.primaryActionSub}>التقط صورة واضحة للمكونات الخلفية</Text>
                            </View>
                            <Ionicons name="chevron-back" size={24} color={COLORS.background} style={{ opacity: 0.6, marginRight: 'auto' }} />
                        </LinearGradient>
                    </PressableScale>

                    <View style={styles.secondaryActionsRow}>
                        <PressableScale onPress={() => onImageSelect('gallery')} style={styles.secondaryBtn}>
                            <Ionicons name="images" size={22} color={COLORS.textSecondary} />
                            <Text style={styles.secondaryBtnText}>المعرض</Text>
                        </PressableScale>
                        <View style={styles.verticalDivider} />
                        <PressableScale onPress={() => {  }} style={styles.secondaryBtn}>
                            <Ionicons name="search" size={22} color={COLORS.textSecondary} />
                            <Text style={styles.secondaryBtnText}>بحث يدوي</Text>
                        </PressableScale>
                    </View>
                </LinearGradient>
            </StaggeredItem>
        </View>
    );
};

  const renderReviewStep = () => (
    <ContentCard>
      <View style={styles.contentContainer}>
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
            {!showManualTypeGrid && (
              <PressableScale 
                onPress={() => {
                  setShowManualTypeGrid(true);
                }} 
                style={styles.changeTypeButton}
              >
                <Text style={styles.changeTypeText}>تغيير النوع يدوياً <FontAwesome5 name="edit" /></Text>
              </PressableScale>
            )}
        </StaggeredItem>

        {showManualTypeGrid && (
            <View style={{width: '100%'}}>
              <StaggeredItem index={1}>
                 <Text style={[styles.sectionTitle, {marginTop: 25, marginBottom: 20}]}>اختر النوع الصحيح:</Text>
              </StaggeredItem>
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
    const displayedClaims = searchQuery ? fuse.search(searchQuery).map(result => result.item) : claimsForType;
    
    const EXPANDED_HEADER_HEIGHT = 160;
    const COLLAPSED_HEADER_HEIGHT = Platform.OS === 'android' ? 60 : 90;
    const SEARCH_BAR_HEIGHT = 70;
    const HEADER_ANIMATION_DISTANCE = EXPANDED_HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT;

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
        
        <Animated.View style={[styles.fixedHeaderBlock, { 
            height: EXPANDED_HEADER_HEIGHT + SEARCH_BAR_HEIGHT,
            transform: [{ translateY: headerTranslateY }],
        }]}>
            <View style={styles.headerBackdrop} />

            <Animated.View style={[styles.expandedHeader, { opacity: expandedHeaderOpacity }]}>
                <Text style={styles.heroTitle}>ما هي وعود المنتج؟</Text>
                <Text style={styles.heroSub}>حدد الادعاءات المكتوبة على العبوة.</Text>
            </Animated.View>

            <Animated.View style={[styles.collapsedHeader, { opacity: collapsedHeaderOpacity }]}>
                <SafeAreaView>
                  <View style={styles.headerContent}>
                    <PressableScale onPress={() => changeStep(step - 1)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                    </PressableScale>
                    <Text style={styles.collapsedHeaderText}>ما هي وعود المنتج؟</Text>
                    <View style={{width: 40}} />
                  </View>
                </SafeAreaView>
            </Animated.View>

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

        <View 
            style={styles.fabContainer}
        >
            <Animated.View
                ref={fabRef} 
                style={{
                    transform: [{ translateY: fabTranslateY }],
                    opacity: isAnimatingTransition ? 0 : 1 
                }}
            >
                <Animated.View style={{ transform: [{ scale: fabScale }] }}>
                    <PressableScale
                        onPress={executeAnalysis} 
                        style={styles.fab}
                    >
                        <FontAwesome5 name="flask" color={COLORS.darkGreen} size={22} />
                    </PressableScale>
                </Animated.View>
            </Animated.View>
        </View>
      </View>
    );
  };
  
  const renderLoading = () => {
    return ( 
      <View style={styles.loadingContainer}>
          <Animated.Text style={[styles.loadingText, { 
              opacity: heroTransitionAnim.interpolate({
                inputRange: [0.5, 1], 
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
                
                {step > 0 && <View style={{width: 40}}/>}
              </View>
            )}

            {step === 2 ? (
                <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
                    {renderClaimsStep()}
                </Animated.View>
            ) : step === 0 ? (
                <View style={{ flex: 1 }}>
                     <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
                        <InputStepView onImageSelect={handleImageSelection} />
                     </Animated.View>
                </View>
            ) : (
                <ScrollView 
                    ref={scrollRef} 
                    contentContainerStyle={[
                      styles.scrollContent, 
                      { paddingBottom: 100 + insets.bottom }
                    ]} 
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={{ opacity: contentOpacity, width: '100%'}}>
                        {step === 1 && renderReviewStep()}
                        {step === 3 && (isGeminiLoading ? renderGeminiLoading() : renderLoading())}
                        {step === 4 && renderResultStep()}
                    </Animated.View>
                </ScrollView>
            )}
        </View>

        <Modal transparent visible={isSaveModalVisible} animationType="fade" onRequestClose={() => setSaveModalVisible(false)}>
            <View style={styles.modalOverlay}>
               <Pressable style={StyleSheet.absoluteFill} blurRadius={step === 0 ? 10 : 0}  onPress={() => setSaveModalVisible(false)} />
                  <Animated.View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>حفظ المنتج</Text>
                      <TextInput 
                          style={styles.modalInput} 
                          placeholder="مثال: سيروم فيتامين سي XYZ" 
                          placeholderTextColor={COLORS.textSecondary} 
                          value={productName} 
                          onChangeText={setProductName} 
                      />
                      <PressableScale onPress={handleSaveProduct} style={styles.modalSaveButton} disabled={isSaving}>
                          {isSaving ? (
                              <ActivityIndicator color={COLORS.background} />
                          ) : (
                              <Text style={styles.modalSaveButtonText}>حفظ في رفّي</Text>
                          )}
                      </PressableScale>
                  </Animated.View>
            </View>
        </Modal>
        
        <CustomCameraModal
          isVisible={isCameraViewVisible}
          onClose={() => setCameraViewVisible(false)}
          onPictureTaken={handlePictureTaken}
        />

        <ImageCropperModal
            isVisible={cropperVisible}
            imageUri={tempImageUri}
            onClose={() => setCropperVisible(false)}
            onCropComplete={(cropped) => {
                setCropperVisible(false);
                processImageWithGemini(cropped.uri);
            }}
        />

        {isAnimatingTransition && (
          <Animated.View
            style={[
              styles.heroFab,
              {
                top: fabMetrics.y,
                left: fabMetrics.x,
                width: fabMetrics.width,
                height: fabMetrics.height,
                transform: [
                   { translateX: heroTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, (width / 2) - fabMetrics.x - (fabMetrics.width / 2)] }) },
                   { translateY: heroTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, (height / 2) - fabMetrics.y - (fabMetrics.height / 2)] }) },
                   { scale: heroTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) },
                ],
              },
            ]}
          >
            <FontAwesome5 name="flask" color={COLORS.background} size={22} />
          </Animated.View>
        )}
    </View>
  );
}