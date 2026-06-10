import { COLORS } from '../constants/theme';
import { t } from '../i18n';
import { commonConditions } from '../data/allergiesandconditions';

export const calculateBioMatch = (currentUserSettings, authorSettings, language = 'ar') => {
    // 1. Safety Check
    if (!currentUserSettings || !authorSettings) {
        return { score: 0, label: t('match_unknown', language), color: COLORS.textSecondary, matches: [] };
    }

    let matches = [];
    let skinScore = 0;
    let hairScore = 0;

    const hasSkinMatch = currentUserSettings.skinType && authorSettings.skinType;
    const hasHairMatch = currentUserSettings.scalpType && authorSettings.scalpType;

    // --- A. SKINCARE EQUATION (50% Skin Type, 25% Conditions, 25% Goals) ---
    if (hasSkinMatch) {
        // 1. Skin Type (50%)
        if (currentUserSettings.skinType === authorSettings.skinType) {
            skinScore += 50;
            matches.push(t('match_skin', language));
        }

        // 2. Skincare Conditions (25%)
        const userSkinConds = (currentUserSettings.conditions || []).filter(c => {
            const cond = commonConditions.find(x => x.id === c);
            return !cond || cond.category === 'skin_concern' || cond.category === 'health';
        });
        const authorSkinConds = (authorSettings.conditions || []).filter(c => {
            const cond = commonConditions.find(x => x.id === c);
            return !cond || cond.category === 'skin_concern' || cond.category === 'health';
        });

        if (userSkinConds.length === 0 && authorSkinConds.length === 0) {
            skinScore += 25;
        } else if (userSkinConds.length > 0 && authorSkinConds.length > 0) {
            const shared = userSkinConds.filter(c => authorSkinConds.includes(c));
            const overlap = shared.length / Math.max(userSkinConds.length, 1);
            if (overlap > 0) {
                skinScore += Math.round(overlap * 25);
                if (!matches.includes(t('match_conditions', language))) {
                    matches.push(t('match_conditions', language));
                }
            }
        }

        // 3. Skincare Goals (25%)
        const skinGoalsList = ['acne', 'anti_aging', 'brightening', 'hydration', 'texture_pores'];
        const userSkinGoals = (currentUserSettings.goals || []).filter(g => skinGoalsList.includes(g));
        const authorSkinGoals = (authorSettings.goals || []).filter(g => skinGoalsList.includes(g));

        if (userSkinGoals.length === 0 && authorSkinGoals.length === 0) {
            skinScore += 25;
        } else if (userSkinGoals.length > 0 && authorSkinGoals.length > 0) {
            const shared = userSkinGoals.filter(g => authorSkinGoals.includes(g));
            const overlap = shared.length / Math.max(userSkinGoals.length, 1);
            if (overlap > 0) {
                skinScore += Math.round(overlap * 25);
                if (!matches.includes(t('match_goals', language))) {
                    matches.push(t('match_goals', language));
                }
            }
        }
    }

    // --- B. HAIRCARE EQUATION (50% Scalp Type, 25% Conditions, 25% Goals) ---
    if (hasHairMatch) {
        // 1. Scalp Type (50%)
        if (currentUserSettings.scalpType === authorSettings.scalpType) {
            hairScore += 50;
            matches.push(t('match_hair', language));
        }

        // 2. Haircare Conditions (25%)
        const userHairConds = (currentUserSettings.conditions || []).filter(c => {
            const cond = commonConditions.find(x => x.id === c);
            return !cond || cond.category === 'scalp_concern' || cond.category === 'health';
        });
        const authorHairConds = (authorSettings.conditions || []).filter(c => {
            const cond = commonConditions.find(x => x.id === c);
            return !cond || cond.category === 'scalp_concern' || cond.category === 'health';
        });

        if (userHairConds.length === 0 && authorHairConds.length === 0) {
            hairScore += 25;
        } else if (userHairConds.length > 0 && authorHairConds.length > 0) {
            const shared = userHairConds.filter(c => authorHairConds.includes(c));
            const overlap = shared.length / Math.max(userHairConds.length, 1);
            if (overlap > 0) {
                hairScore += Math.round(overlap * 25);
                if (!matches.includes(t('match_conditions', language))) {
                    matches.push(t('match_conditions', language));
                }
            }
        }

        // 3. Haircare Goals (25%)
        const hairGoalsList = ['hair_growth', 'hydration'];
        const userHairGoals = (currentUserSettings.goals || []).filter(g => hairGoalsList.includes(g));
        const authorHairGoals = (authorSettings.goals || []).filter(g => hairGoalsList.includes(g));

        if (userHairGoals.length === 0 && authorHairGoals.length === 0) {
            hairScore += 25;
        } else if (userHairGoals.length > 0 && authorHairGoals.length > 0) {
            const shared = userHairGoals.filter(g => authorHairGoals.includes(g));
            const overlap = shared.length / Math.max(userHairGoals.length, 1);
            if (overlap > 0) {
                hairScore += Math.round(overlap * 25);
                if (!matches.includes(t('match_goals', language))) {
                    matches.push(t('match_goals', language));
                }
            }
        }
    }

    // --- C. COMBINE SCORES ---
    let score = 0;
    if (hasSkinMatch && hasHairMatch) {
        score = Math.round((skinScore + hairScore) / 2);
    } else if (hasSkinMatch) {
        score = skinScore;
    } else if (hasHairMatch) {
        score = hairScore;
    } else {
        score = 0;
    }

    // --- D. RESULT FORMATTING ---
    let label = '';
    let color = COLORS.textSecondary;

    if (score >= 80) {
        label = t('match_high', language);
        color = COLORS.accentGreen;
    } else if (score >= 50) {
        label = t('match_good', language);
        color = COLORS.gold;
    } else if (score > 20) {
        label = t('match_limited', language);
        color = COLORS.blue;
    } else {
        label = t('match_none', language);
        color = COLORS.textDim;
    }

    return { score, label, color, matches };
};