import { GoogleGenerativeAI } from '@google/generative-ai';
import { combinedOilsDB } from '../../src/data/alloilsdb';
import { marketingClaimsDB } from '../../src/data/marketingclaimsdb';
import { 
  commonAllergies, 
  commonConditions,
  basicSkinTypes,
  basicScalpTypes
} from '../../src/data/allergiesandconditions';

// =============================================================================
// 1. SHARED CONSTANTS & DATA INITIALIZATION (Platform Agnostic)
// =============================================================================

// Flatten the DB for easy access
const allIngredients = combinedOilsDB.ingredients.map(ing => {
    let mainCategory = 'chemical'; 
    const chemType = ing.chemicalType ? ing.chemicalType.toLowerCase() : '';
    const funcCategory = ing.functionalCategory ? ing.functionalCategory.toLowerCase() : '';

    if (chemType.includes('زيت')) mainCategory = 'oil';
    else if (chemType.includes('سيروم') || ing.id.includes('serum')) mainCategory = 'serum';
    else if (chemType.includes('حمض') || funcCategory.includes('مقشر')) mainCategory = 'acid';
    
    return { ...ing, mainCategory };
});

// Hyper-Normalize: Cleans text for 100% matching accuracy
const hyperNormalize = (text) => {
    if (!text) return '';
    return text.toString().toLowerCase()
        .replace(/[\d.,؛()\[\]{}-]/g, ' ') // Remove numbers/symbols
        .replace(/\s+/g, ' ').trim();     // Collapse spaces
};

// Pre-compute searchable terms (Sorted longest to shortest)
const allSearchableTerms = (() => {
    const allTerms = new Map();
    allIngredients.forEach(ing => {
        const allNames = [ing.name, ing.id, ing.scientific_name, ...(ing.searchKeywords || [])]
            .filter(Boolean)
            .map(name => hyperNormalize(String(name)));
        
        allNames.forEach(normalized => {
            if (normalized.length > 2 && !allTerms.has(normalized)) {
                allTerms.set(normalized, ing);
            }
        });
    });
    return Array.from(allTerms.entries())
        .map(([term, ingredient]) => ({ term, ingredient }))
        .sort((a, b) => b.term.length - a.term.length);
})();

// Helper to get benefits keys
export const getIngredientBenefits = (ingredient) => {
    if (!ingredient || !ingredient.benefits) return [];
    return Object.keys(ingredient.benefits);
};

// =============================================================================
// 2. CORE IMAGE & AI PROCESSING (React Native Compatible)
// =============================================================================

/**
 * [NATIVE REPLACEMENT for createGenerativePartFromFile]
 * This function takes a local file URI (from Expo Image Picker) and converts it
 * into a Base64 string suitable for the Gemini API. It uses React Native's
 * implementation of fetch and FileReader.
 * @param {string} uri - The local URI of the image file.
 * @returns {Promise<object>} A promise that resolves to the Gemini part object.
 */
export const createGenerativePartFromUri = async (uri) => {
    try {
        // Fetch the image data from the local URI
        const response = await fetch(uri);
        // Convert the response into a binary "blob"
        const blob = await response.blob();

        // Use FileReader (available in React Native's JS runtime) to read the blob
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // The result is a data URL, we need to extract the Base64 part
                const base64Data = reader.result.split(',')[1];
                resolve({
                    inlineData: {
                        data: base64Data,
                        mimeType: blob.type || 'image/jpeg'
                    }
                });
            };
            reader.onerror = (error) => {
                reject(new Error("Failed to read image blob: " + error.message));
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error in createGenerativePartFromUri:", error);
        throw new Error("Could not process the image file for analysis.");
    }
};


export const processWithGemini = async (imagePart) => {
    // This API key should ideally be stored in a secure environment configuration.
    const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" }); // Using 1.5-flash as a robust alternative.

    const prompt = `
        Analyze the cosmetic product image.
        Return a single, minified JSON object with two keys:
        1. "productType": Classify into ONE of: [shampoo, hair_mask, serum, oil_blend, lotion_cream, sunscreen, cleanser, toner, mask, other].
        2. "ingredients": A single string of all extracted ingredients in English (and Arabic if present), separated by commas. Translate French ingredients to English.
        Example: {"productType":"shampoo","ingredients":"Aqua, Sodium Laureth Sulfate, Glycerin"}
    `;

    try {
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        let text = response.text();

        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let responseObject;
        try {
            responseObject = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse Gemini JSON response:", text);
            // Fallback: Return the raw text if parsing fails, so it can be debugged.
            return { productType: 'other', ingredientsText: text };
        }

        return {
            productType: responseObject.productType || 'other',
            ingredientsText: responseObject.ingredients || ''
        };

    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error(`فشل تحليل الصورة: ${error.message || "حدث خطأ غير متوقع"}`);
    }
};


// =============================================================================
// 3. INGREDIENT MATCHING & ANALYSIS (Platform Agnostic)
// =============================================================================

export const extractIngredientsFromText = async (text) => {
    return new Promise(resolve => {
        if (!text) return resolve({ ingredients: [] });

        const foundIngredients = new Map();
        // Split by comma, period, semicolon, or newline for robustness
        const tokens = text.split(/\s*,\s*|\s*\.\s*|\s*;\s*|\n/)
            .map(token => hyperNormalize(token))
            .filter(token => token.length > 2);

        for (const token of tokens) {
            let remainingToken = token;
            let safetyBreak = 30; // Prevents infinite loops on complex tokens
            
            while (remainingToken.length > 2 && safetyBreak > 0) {
                let matchFound = false;

                for (const dbTerm of allSearchableTerms) {
                    if (remainingToken.includes(dbTerm.term)) {
                        const ingredient = dbTerm.ingredient;
                        if (!foundIngredients.has(ingredient.id)) {
                            foundIngredients.set(ingredient.id, ingredient);
                        }
                        // Remove the found term and continue searching the remainder of the token
                        remainingToken = remainingToken.replace(dbTerm.term, '');
                        matchFound = true;
                        break; 
                    }
                }
                if (!matchFound) break; // No more matches in this token
                safetyBreak--;
            }
        }

        resolve({ ingredients: Array.from(foundIngredients.values()) });
    });
};

export const getClaimsByProductType = (productType) => {
    const claimsByProduct = {
        shampoo: [ "تنقية فروة الرأس", "مضاد للقشرة", "مخصص للشعر الدهني", "مخصص للشعر الجاف", "مضاد لتساقط الشعر", "تعزيز النمو", "تكثيف الشعر", "مرطب للشعر", "تغذية الشعر", "إصلاح التلف", "تلميع ولمعان", "مكافحة التجعد", "حماية اللون", "حماية من الحرارة", "مهدئ", "مضاد للالتهابات" ],
        hair_mask: [ "تغذية الشعر", "إصلاح التلف", "مرطب للشعر", "مكافحة التجعد", "حماية اللون", "تلميع ولمعان" ],
        serum: [ "مكافحة التجاعيد", "شد البشرة", "تحفيز الكولاجين", "إصلاح التلف", "مضاد للأكسدة", "تفتيح البشرة", "توحيد لون البشرة", "تفتيح البقع الداكنة", "تفتيح تحت العين", "مرطب للبشرة", "مهدئ", "مضاد للالتهابات", "للبشرة الجافة", "للبشرة الحساسة", "للبشرة الدهنية", "تنقية المسام", "توازن الزيوت", "مضاد لحب الشباب" ],
        oil_blend: [ "تعزيز النمو", "تغذية الشعر", "تلميع ولمعان", "إصلاح التلف", "مكافحة التجعد", "مخصص للشعر الدهني", "مخصص للشعر الجاف", "مرطب للشعر", "مرطب للبشرة", "مكافحة التجاعيد", "شد البشرة", "مضاد للأكسدة", "مهدئ", "مضاد للالتهابات", "تفتيح البقع الداكنة" ],
        lotion_cream: [ "مرطب للبشرة", "للبشرة الجافة", "للبشرة الحساسة", "للبشرة الدهنية", "مهدئ", "مضاد للأكسدة", "مكافحة التجاعيد", "شد البشرة", "تحفيز الكولاجين", "تفتيح البشرة", "توحيد لون البشرة", "تفتيح البقع الداكنة", "تفتيح تحت العين", "تنقية المسام", "إزالة السيلوليت", "شد الجسم" ],
        sunscreen: [ "حماية من الشمس", "حماية واسعة الطيف", "مقاوم للماء", "مرطب للبشرة", "مهدئ", "مضاد للأكسدة", "توحيد لون البشرة", "للبشرة الحساسة", "للبشرة الدهنية", "للبشرة الجافة" ],
        cleanser: [ "تنظيف عميق", "تنظيف لطيف", "إزالة المكياج", "للبشرة الدهنية", "للبشرة الجافة", "للبشرة الحساسة", "تنقية المسام", "مضاد لحب الشباب", "مرطب للبشرة" ],
        toner: [ "مرطب للبشرة", "تهدئة البشرة", "توازن الحموضة", "تقشير لطيف", "تنقية المسام", "قابض للمسام" ],
        mask: [ "تنقية عميقة", "ترطيب مكثف", "تفتيح البشرة", "شد البشرة", "تهدئة البشرة", "تقشير" ],
        other: [ "مرطب للشعر", "مرطب للبشرة", "مهدئ", "مضاد للأكسدة", "مضاد للالتهابات", "تفتيح البشرة", "توحيد لون البشرة", "مكافحة التجاعيد", "تنقية المسام", "مضاد لحب الشباب" ]
    };
    return claimsByProduct[productType] || claimsByProduct.other;
};

export const evaluateMarketingClaims = (detectedIngredients, selectedClaims = [], productType) => {
    const results = [];
    const ingredientNames = detectedIngredients.map(ing => hyperNormalize(ing.name));
    
    const isWashOff = ['cleanser', 'shampoo', 'mask', 'scrub'].includes(productType);
    const claimsToAnalyze = selectedClaims.length > 0 ? selectedClaims : getClaimsByProductType(productType);
    
    claimsToAnalyze.forEach(claim => {
        const categories = marketingClaimsDB[claim];
        if (!categories) return;
        
        const findMatchesWithIndex = (targets) => {
            const matches = [];
            if (!targets) return matches;
            targets.forEach(target => {
                const normalizedTarget = hyperNormalize(target);
                const index = ingredientNames.findIndex(name => name.includes(normalizedTarget));
                if (index !== -1) matches.push({ name: target, index });
            });
            return matches.sort((a, b) => a.index - b.index); 
        };

        const provenMatches = findMatchesWithIndex(categories.proven);
        const tradMatches = findMatchesWithIndex(categories.traditionally_proven);
        const doubtMatches = findMatchesWithIndex(categories.doubtful);
        const ineffMatches = findMatchesWithIndex(categories.ineffective);
        
        let status = '', explanation = '', confidence = '';

        if (provenMatches.length > 0) {
            const topMatch = provenMatches[0];
            const count = provenMatches.length;
            const namesList = provenMatches.map(m => m.name).join('، ');

            if (topMatch.index > 20) {
                status = '⚖️ تركيز منخفض (Angel Dusting)';
                confidence = 'ضعيفة';
                explanation = `وجدنا ${namesList}، لكن المكون الرئيسي (${topMatch.name}) يأتي في آخر القائمة، مما يضعف الفعالية.`;
            } else if (isWashOff && !['Salicylic', 'Benzoyl', 'Clay', 'Charcoal', 'Sulfur', 'Zinc'].some(i => topMatch.name.includes(i))) {
                status = '⚖️ فعالية محدودة (غسول)';
                confidence = 'متوسطة';
                explanation = `يحتوي على ${namesList}، ولكن في الغسول لا تبقى هذه المكونات لفترة كافية.`;
            } else {
                status = '✅ مثبت علمياً';
                confidence = 'عالية';
                explanation = count > 1 
                    ? `ادعاء قوي يدعمه ${count} مكونات فعالة: ${namesList}.` 
                    : `يعتمد بشكل أساسي على "${topMatch.name}" بتركيز فعال.`;
            }
        } else if (tradMatches.length > 0) {
            const namesList = tradMatches.map(m => m.name).join('، ');
            status = '🌿 دعم طبيعي';
            confidence = 'متوسطة';
            explanation = `يعتمد على مكونات طبيعية (${namesList}). قد تكون النتائج أبطأ ولكنها فعالة.`;
        } else if (claim.includes('مهدئ') || claim.includes('حساسة')) {
            const hasIrritants = ingredientNames.slice(0, 7).some(n => n.includes('alcohol') || n.includes('fragrance') || n.includes('parfum'));
            if (hasIrritants) {
                status = '❌ تعارض في التركيبة';
                confidence = 'معدومة';
                explanation = `يدعي أنه مهدئ، لكنه يحتوي على مهيجات قوية (كحول/عطور) في بداية القائمة.`;
            } else {
                status = '🚫 لا توجد مكونات واضحة';
                confidence = 'معدومة';
                explanation = 'لم نجد مكونات مهدئة معروفة، لكن التركيبة قد تكون محايدة.';
            }
        } else if (ineffMatches.length > 0) {
            status = '❌ ادعاء تسويقي بحت';
            confidence = 'معدومة';
            explanation = `يعتمد على "${ineffMatches[0].name}"، والدراسات تشير أنه غير فعال لهذا الغرض موضعياً.`;
        } else {
            status = '🚫 غير مدعوم';
            confidence = 'معدومة';
            explanation = `لم نتمكن من تحديد المكون المسؤول عن هذا الادعاء في التركيبة.`;
        }
        
        results.push({ 
            claim, status, confidence, explanation, 
            proven: provenMatches.map(m => m.name), 
            traditionallyProven: tradMatches.map(m => m.name), 
            doubtful: doubtMatches.map(m => m.name), 
            ineffective: ineffMatches.map(m => m.name) 
        });
    });
  
    return results;
};

export const analyzeIngredientInteractions = (ingredients, userSettings = {}) => {
    const { allergies = [], conditions = [], skinType = '', scalpType = '' } = userSettings;
    const conflicts = [];
    const foundConflicts = new Set();
    const detectedIngredientIds = new Set(ingredients.map(ing => ing.id));
    const userAlerts = [];

    // 1. Synergy Conflicts
    ingredients.forEach(ingredientInProduct => {
        const dbEntry = allIngredients.find(db_ing => db_ing.id === ingredientInProduct.id);
        if (dbEntry && dbEntry.negativeSynergy) {
            for (const conflictingId in dbEntry.negativeSynergy) {
                if (detectedIngredientIds.has(conflictingId)) {
                    const conflictPairKey = [ingredientInProduct.id, conflictingId].sort().join('+');
                    if (!foundConflicts.has(conflictPairKey)) {
                        const conflictingIngredient = ingredients.find(ing => ing.id === conflictingId);
                        if (conflictingIngredient) {
                            conflicts.push({
                                pair: [ingredientInProduct.name, conflictingIngredient.name],
                                reason: dbEntry.negativeSynergy[conflictingId].reason
                            });
                            foundConflicts.add(conflictPairKey);
                        }
                    }
                }
            }
        }
    });

    // 2. Personal Alerts Logic
    const userAllergenIngredients = new Set(
        allergies.flatMap(id => commonAllergies.find(a => a.id === id)?.ingredients || []).map(hyperNormalize)
    );

    const userConditionAvoidMap = new Map();
    const userBeneficialMap = new Map();

    const addToMap = (list, reason, isAvoid) => {
        if (!list) return;
        list.forEach(ing => {
            const norm = hyperNormalize(ing);
            if (isAvoid) userConditionAvoidMap.set(norm, reason);
            else userBeneficialMap.set(norm, reason);
        });
    };

    conditions.forEach(id => {
        const c = commonConditions.find(x => x.id === id);
        if (c) {
            addToMap(c.avoidIngredients, c.name, true);
            addToMap(c.beneficialIngredients, c.name, false);
        }
    });

    if (skinType) {
        const skinData = basicSkinTypes.find(t => t.id === skinType);
        if (skinData) {
            addToMap(skinData.avoidIngredients, `بشرة ${skinData.label}`, true);
            addToMap(skinData.beneficialIngredients, `بشرة ${skinData.label}`, false);
        }
    }

    if (scalpType) {
        const scalpData = basicScalpTypes.find(t => t.id === scalpType);
        if (scalpData) {
            addToMap(scalpData.avoidIngredients, `فروة رأس ${scalpData.label}`, true);
            addToMap(scalpData.beneficialIngredients, `فروة رأس ${scalpData.label}`, false);
        }
    }

    ingredients.forEach(ing => {
        const normName = hyperNormalize(ing.name);
        if (userAllergenIngredients.has(normName)) {
             userAlerts.push({ type: 'danger', text: `🚨 خطر حساسية: ${ing.name}` });
        }
        else if (userConditionAvoidMap.has(normName)) {
             userAlerts.push({ type: 'warning', text: `⚠️ تنبيه (${userConditionAvoidMap.get(normName)}): ${ing.name}` });
        }
        else if (userBeneficialMap.has(normName)) {
             userAlerts.push({ type: 'good', text: `✅ مفيد (${userBeneficialMap.get(normName)}): ${ing.name}` });
        }
    });

    const uniqueAlerts = Array.from(new Map(userAlerts.map(item => [item.text, item])).values());
    return { conflicts, userAlerts: uniqueAlerts };
};


// =============================================================================
// 4. V13 RELIABILITY SCORE ENGINE (Platform Agnostic)
// =============================================================================

export const calculateReliabilityScore_V13 = (ingredients, conflicts, userAlerts, marketingResults, productType) => {
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
        const dbEntry = combinedOilsDB.ingredients.find(db => db.id === ing.id);
        if (hydrators.has(ing.id) || dbEntry?.functionalCategory?.includes('مرطب')) {
            bufferCount++;
        }
    });
    
    const bufferThreshold = isTreatment ? 3 : 2;
    const isBuffered = bufferCount >= bufferThreshold;

    if (isBuffered) {
        scoreBreakdown.push({ type: 'info', text: '🛡️ نظام حماية: تركيبة مدعمة بمرطبات قوية', value: 'ميزة' });
    }

    let currentSafety = 100;
    let safetyDeductions = 0;

    ingredients.forEach((ing, index) => {
        const dbEntry = combinedOilsDB.ingredients.find(db => db.id === ing.id);
        let weight = index < 3 ? 2.0 : (index < 10 ? 1.0 : 0.5);
        
        if (['alcohol-denat', 'ethanol', 'isopropyl-alcohol'].includes(ing.id)) {
            if (!(isSunCare && isBuffered)) {
                if (isTreatment && isLeaveOn) {
                    const penalty = isBuffered ? 5 : 25;
                    const weightedPenalty = penalty * weight;
                    safetyDeductions += weightedPenalty;
                    if (weightedPenalty > 2) {
                        scoreBreakdown.push({ 
                            type: isBuffered ? 'warning' : 'deduction', 
                            text: isBuffered ? `كحول (مخفف التأثير): ${ing.name}` : `كحول مسبب للجفاف: ${ing.name}`, 
                            value: `-${Math.round(weightedPenalty)} (أمان)` 
                        });
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

        if (['fragrance', 'parfum', 'limonene', 'linalool', 'citronellol', 'geraniol'].includes(ing.id)) {
            if (isLeaveOn && index < 10) {
                const p = index < 7 ? 15 : 5; 
                safetyDeductions += p;
                scoreBreakdown.push({ type: 'deduction', text: `عطر بتركيز عالي: ${ing.name}`, value: `-${p} (أمان)` });
            }
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

        if (['dimethicone', 'cyclopentasiloxane', 'amodimethicone'].includes(ing.id) || dbEntry?.chemicalType?.includes('سيليكون')) {
            if (productType === 'shampoo' || (isWashOff && !isHairCare)) {
                safetyDeductions += 2;
                if (productType === 'shampoo') {
                    scoreBreakdown.push({ type: 'deduction', text: `سيليكون (احتمال تراكم): ${ing.name}`, value: '-2 (أمان)' });
                }
            }
        }
    });

    const activeUserAlerts = (userAlerts || []).filter(alert => {
        if (isBuffered) {
            const text = alert?.text?.toLowerCase() || "";
            const isAlcoholWarning = text.includes('كحول') || text.includes('alcohol') || text.includes('ethanol');
            if (isAlcoholWarning) return false;
        }
        return true;
    });
    
    if (isBuffered && userAlerts && activeUserAlerts.length < userAlerts.length) {
         scoreBreakdown.push({ type: 'info', text: '✨ تم تجاهل تحذير الجفاف لأن التركيبة محمية', value: 'استثناء' });
    }

    const hasAllergyDanger = activeUserAlerts.some(a => a.type === 'danger');
    const hasMismatch = activeUserAlerts.some(a => a.type === 'warning');

    if (hasAllergyDanger) {
        safetyDeductions += 100; 
        scoreBreakdown.push({ type: 'override', text: '⛔ خطر: تعارض مع حساسيتك', value: '-100 (أمان)' });
    } else if (hasMismatch) {
        safetyDeductions += 30;
        scoreBreakdown.push({ type: 'deduction', text: '⚠️ لا يناسب نوع بشرتك/شعرك', value: '-30 (أمان)' });
    }

    if (conflicts.length > 0) {
        const conflictPoints = conflicts.length * 10;
        safetyDeductions += conflictPoints;
        scoreBreakdown.push({ type: 'deduction', text: `تعارض كيميائي (${conflicts.length})`, value: `-${conflictPoints} (أمان)` });
    }

    currentSafety = Math.max(0, 100 - safetyDeductions);

    let currentEfficacy = 50; 
    let efficacyBonus = 0;

    ingredients.forEach((ing, index) => {
        const dbEntry = combinedOilsDB.ingredients.find(db => db.id === ing.id);
        let weight = index < 3 ? 2.0 : (index < 10 ? 1.5 : 0.8);
        
        const heroIngredients = ['niacinamide', 'vitamin-c', 'ascorbic-acid', 'retinol', 'retinal', 'tretinoin', 'adapalene', 'ceramide', 'peptide', 'copper-peptide', 'hyaluronic-acid', 'sodium-hyaluronate', 'azelaic-acid', 'salicylic-acid', 'glycolic-acid', 'lactic-acid', 'centella-asiatica', 'panthenol', 'glycerin', 'zinc-pca', 'snail-mucin', 'allantoin'];
        
        if (heroIngredients.includes(ing.id) || dbEntry?.functionalCategory?.includes('مكون فعال')) {
            let power = (isWashOff && !['salicylic-acid', 'benzoyl-peroxide', 'glycolic-acid', 'lactic-acid'].includes(ing.id)) ? 1 : 5;
            if (['glycerin', 'water', 'aqua'].includes(ing.id)) power = 2;

            let points = power * weight;
            efficacyBonus += points;
            
            if (points >= 3 && index < 15) {
                 const contextMsg = isWashOff && power === 1 ? '(تأثير محدود في الغسول)' : '';
                 scoreBreakdown.push({ type: 'info', text: `🚀 مكون فعال: ${ing.name} ${contextMsg}`, value: `+${Math.round(points)} (فعالية)` });
            }
        }
    });

    let integrityScore = 0;
    if (marketingResults && marketingResults.length > 0) {
        marketingResults.forEach(res => {
            if (res.status.includes('✅')) {
                const idx = ingredients.findIndex(i => res.proven.includes(i.name));
                if (idx !== -1 && idx < 10) {
                    integrityScore += 15; 
                    scoreBreakdown.push({ type: 'info', text: `مصداقية (علمي): ${res.claim}`, value: '+15 (فعالية)' });
                }
            } 
            else if (res.status.includes('🌿')) {
                integrityScore += 8; 
                scoreBreakdown.push({ type: 'info', text: `مصداقية (طبيعي): ${res.claim}`, value: '+8 (فعالية)' });
            }
            else if (res.status.includes('تركيز منخفض') || res.status.includes('Angel Dusting') || res.status.includes('❌')) {
                integrityScore -= 20; 
                scoreBreakdown.push({ type: 'warning', text: `غش تسويقي: ${res.claim}`, value: '-20 (فعالية)' });
            }
        });
    }
    efficacyBonus += integrityScore;

    currentEfficacy = Math.min(100, Math.max(0, currentEfficacy + efficacyBonus));

    let weightedScore = (currentSafety * 0.6) + (currentEfficacy * 0.4);
    
    scoreBreakdown.push({ 
        type: 'calculation', 
        text: `الحساب النهائي: (أمان ${Math.round(currentSafety)} × 0.6) + (فعالية ${Math.round(currentEfficacy)} × 0.4)`, 
        value: `${Math.round(weightedScore)}` 
    });

    let finalVerdict = '';
    
    if (hasAllergyDanger) {
        weightedScore = Math.min(weightedScore, 20); 
        finalVerdict = "⛔ خطير: يسبب لك الحساسية";
        scoreBreakdown.push({ type: 'override', text: 'تم إغلاق النتيجة لوجود خطر صحي', value: 'سقف 20%' });
    } else if (currentSafety < 40) {
        weightedScore = Math.min(weightedScore, 45);
        finalVerdict = "⚠️ غير آمن: يحتوي على مكونات قاسية/ضارة";
        scoreBreakdown.push({ type: 'override', text: 'تم تخفيض النتيجة لضعف الأمان', value: 'سقف 45%' });
    } else if (currentSafety > 80 && currentEfficacy < 55) {
        weightedScore = Math.min(weightedScore, 65);
        finalVerdict = "💧 آمن لكن غير فعال (Basic)";
        scoreBreakdown.push({ type: 'override', text: 'تم تخفيض النتيجة لعدم وجود فعالية حقيقية', value: 'سقف 65%' });
    } else if (weightedScore >= 90) {
        finalVerdict = "💎 تركيبة مثالية (Elite)";
    } else if (weightedScore >= 80) {
        finalVerdict = "🌟 اختيار ممتاز";
    } else if (weightedScore >= 65) {
        finalVerdict = "✅ جيد ومتوازن";
    } else {
        finalVerdict = "⚖️ متوسط (يمكن إيجاد أفضل)";
    }

    return { 
        oilGuardScore: Math.round(weightedScore), 
        finalVerdict, 
        efficacy: { score: Math.round(currentEfficacy) }, 
        safety: { score: Math.round(currentSafety) }, 
        scoreBreakdown,
        personalMatch: { 
            status: hasAllergyDanger ? 'danger' : (hasMismatch ? 'warning' : 'good'), 
            reasons: activeUserAlerts.map(a => a.text) 
        }
    };
};

export const getScoreColor = (score) => {
  if (score >= 80) return '#10b981'; // success
  if (score >= 65) return '#f59e0b'; // warning
  return '#ef4444'; // danger (combined f43f5e and dc2626 into one)
};