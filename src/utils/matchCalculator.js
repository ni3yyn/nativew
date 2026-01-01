import { COLORS } from '../constants/theme';

export const calculateBioMatch = (currentUserSettings, authorSettings) => {
    // 1. Safety Check
    if (!currentUserSettings || !authorSettings) {
        return { score: 0, label: 'غير معروف', color: COLORS.textSecondary, matches: [] };
    }

    let score = 0;
    let matches = [];

    // --- A. EXACT MATCHES (50% Total) ---
    
    // 1. Skin Type (25%)
    if (currentUserSettings.skinType && authorSettings.skinType && 
        currentUserSettings.skinType === authorSettings.skinType) {
        score += 25;
        matches.push('بشرة');
    }

    // 2. Scalp Type (25%)
    if (currentUserSettings.scalpType && authorSettings.scalpType && 
        currentUserSettings.scalpType === authorSettings.scalpType) {
        score += 25;
        matches.push('شعر');
    }

    // --- B. OVERLAP MATCHES (50% Total) ---

    // 3. Conditions (25%)
    const userConds = currentUserSettings.conditions || [];
    const authorConds = authorSettings.conditions || [];
    
    if (userConds.length === 0 && authorConds.length === 0) {
        // Both have healthy skin -> Match
        score += 25;
    } else if (userConds.length > 0 && authorConds.length > 0) {
        // Calculate intersection
        const shared = userConds.filter(c => authorConds.includes(c));
        const overlap = shared.length / Math.max(userConds.length, 1);
        if (overlap > 0) {
            score += Math.round(overlap * 25);
            matches.push('حالات');
        }
    }

    // 4. Goals (25%)
    const userGoals = currentUserSettings.goals || [];
    const authorGoals = authorSettings.goals || [];

    if (userGoals.length === 0 && authorGoals.length === 0) {
        score += 25;
    } else if (userGoals.length > 0 && authorGoals.length > 0) {
        const shared = userGoals.filter(g => authorGoals.includes(g));
        const overlap = shared.length / Math.max(userGoals.length, 1);
        if (overlap > 0) {
            score += Math.round(overlap * 25);
            matches.push('أهداف');
        }
    }

    // --- C. RESULT FORMATTING ---
    let label = '';
    let color = COLORS.textSecondary;

    if (score >= 80) {
        label = 'تطابق عالي';
        color = COLORS.accentGreen;
    } else if (score >= 50) {
        label = 'تطابق جيد';
        color = COLORS.gold;
    } else if (score > 20) {
        label = 'تطابق محدود';
        color = COLORS.blue;
    } else {
        label = 'لا يوجد تطابق';
        color = COLORS.textDim;
    }

    return { score, label, color, matches };
};