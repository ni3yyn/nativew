import { COLORS } from '../constants/theme';
import { t } from '../i18n';
import { commonConditions } from '../data/allergiesandconditions';

export const calculateBioMatch = (currentUserSettings, authorSettings, language = 'ar') => {
    // 1. Safety Check
    if (!currentUserSettings || !authorSettings) {
        return { score: 0, label: t('match_unknown', language), color: COLORS.textSecondary, matches: [] };
    }

    let matches = [];
    let score = 0;

    // 1. Type Match (50%)
    let typeScore = 0;
    let typeCount = 0;

    if (currentUserSettings.skinType && authorSettings.skinType) {
        typeCount++;
        if (currentUserSettings.skinType === authorSettings.skinType) {
            typeScore += 50;
            matches.push(t('match_skin', language));
        }
    }
    
    if (currentUserSettings.scalpType && authorSettings.scalpType) {
        typeCount++;
        if (currentUserSettings.scalpType === authorSettings.scalpType) {
            typeScore += 50;
            matches.push(t('match_hair', language));
        }
    }
    
    if (typeCount > 0) {
        score += typeScore / typeCount;
    }

    // 2. Conditions Match (25%)
    const userConds = currentUserSettings.conditions || [];
    const authorConds = authorSettings.conditions || [];

    if (userConds.length === 0 && authorConds.length === 0) {
        score += 25;
    } else if (userConds.length > 0 && authorConds.length > 0) {
        const sharedConds = userConds.filter(c => authorConds.includes(c));
        const overlapConds = sharedConds.length / Math.max(userConds.length, 1);
        if (overlapConds > 0) {
            score += Math.round(overlapConds * 25);
            matches.push(t('match_conditions', language));
        }
    }

    // 3. Goals Match (25%)
    const userGoals = currentUserSettings.goals || [];
    const authorGoals = authorSettings.goals || [];

    if (userGoals.length === 0 && authorGoals.length === 0) {
        score += 25;
    } else if (userGoals.length > 0 && authorGoals.length > 0) {
        const sharedGoals = userGoals.filter(g => authorGoals.includes(g));
        const overlapGoals = sharedGoals.length / Math.max(userGoals.length, 1);
        if (overlapGoals > 0) {
            score += Math.round(overlapGoals * 25);
            matches.push(t('match_goals', language));
        }
    }

    // Ensure score is within 0-100
    score = Math.min(Math.round(score), 100);

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