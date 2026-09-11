/**
 * Wathiq Gamification & Badges Service
 * Mature, activity-driven badge registry with botanical & mineral palette.
 */

export const parseUserPointsHistory = (historyMap = {}) => {
    const entries = Object.values(historyMap || {});
    let newProducts = 0;
    let ingredients = 0;
    let prices = 0;
    let specs = 0;
    let catalogPoints = 0;

    entries.forEach(item => {
        if (!item) return;
        const field = String(item.field || '').trim();
        const pts = Number(item.points) || 0;
        catalogPoints += pts;

        if (field === 'new_product') {
            newProducts += 1;
        } else if (field === 'ingredients') {
            ingredients += 1;
        } else if (field === 'price') {
            prices += 1;
        } else if (['marketingClaims', 'targetTypes', 'quantity', 'category', 'country'].includes(field)) {
            specs += 1;
        }
    });

    return {
        newProducts,
        ingredients,
        prices,
        specs,
        catalogPoints,
        totalBounties: entries.length,
    };
};

const BADGE_REGISTRY = [
    // 1. FIRST GEN (Prestige Gold)
    {
        id: 'first_gen',
        name: { ar: 'الجيل الأول', en: 'First Gen' },
        description: { 
            ar: 'مُنحت لأول 1000 مستخدم ساهموا في بناء وتأسيس مجتمع واثق منذ الانطلاقة الأولى.', 
            en: 'Awarded to the first 1,000 foundational users who helped establish the Wathiq community.' 
        },
        getColor: () => '#F59E0B',
        evaluate: (profile, parsedHistory, communityPoints) => {
            if (!profile?.isFirstGen) return null; 
            return { currentLevel: 1, currentScore: 1, nextTarget: 1, progressPercent: 100, isMaxed: true };
        }
    },

    // 2. ROUTINE EXPERT (Active when user has registered routine steps)
    {
        id: 'routine_expert',
        name: { ar: 'خبير الروتين', en: 'Routine Master' },
        description: { 
            ar: 'تُمنح لبناء وتوثيق خطوات روتين العناية الصباحي والمسائي الخاص بكِ ومتابعته بانتظام.', 
            en: 'Awarded for building and organizing your AM and PM skincare routines with consistency.' 
        },
        getColor: () => '#D97706', // Warm Amber
        evaluate: (profile, parsedHistory, communityPoints) => {
            const count = (profile?.routines?.am?.length || 0) + (profile?.routines?.pm?.length || 0);
            if (count === 0 && !profile?.isFirstGen) return null;

            let level = 1, target = 3, prev = 0;
            if (count >= 10) { level = 4; target = 10; prev = 10; }
            else if (count >= 6) { level = 3; target = 10; prev = 6; }
            else if (count >= 3) { level = 2; target = 6; prev = 3; }

            const isMaxed = count >= 10;
            const progress = isMaxed ? 100 : Math.max(0, ((count - prev) / (target - prev)) * 100);
            return { currentLevel: level, currentScore: count, nextTarget: isMaxed ? null : target, progressPercent: progress, isMaxed };
        }
    },

    // 3. PRODUCT HUNTER (Adding new products to database)
    {
        id: 'product_hunter',
        name: { ar: 'مكتشف المنتجات', en: 'Product Hunter' },
        description: { 
            ar: 'تُمنح لإضافة منتجات جديدة كلياً وغير مدرجة لمساعدة أعضاء مجتمع واثق في فحصها.', 
            en: 'Awarded for adding unlisted products to the catalog for community review and analysis.' 
        },
        getColor: () => '#4B779A', // Slate Blue
        evaluate: (profile, parsedHistory, communityPoints) => {
            const count = parsedHistory.newProducts;
            if (count === 0 && !profile?.isFirstGen) return null;

            let level = 1, target = 3, prev = 0;
            if (count >= 30) { level = 4; target = 30; prev = 30; }
            else if (count >= 10) { level = 3; target = 30; prev = 10; }
            else if (count >= 3) { level = 2; target = 10; prev = 3; }

            const isMaxed = count >= 30;
            const progress = isMaxed ? 100 : Math.max(0, ((count - prev) / (target - prev)) * 100);
            return { currentLevel: level, currentScore: count, nextTarget: isMaxed ? null : target, progressPercent: progress, isMaxed };
        }
    },

    // 4. FORMULA DECODER (Adding missing INCI lists)
    {
        id: 'ingredient_decoder',
        name: { ar: 'خبير التركيبات', en: 'Formula Decoder' },
        description: { 
            ar: 'تُمنح لإكمال وتصوير قوائم المكونات الكاملة (INCI) للمنتجات الناقصة بدقة عالية.', 
            en: 'Awarded for uploading and completing missing cosmetic ingredient lists (INCI).' 
        },
        getColor: () => '#3D9275', // Wathiq Brand Green
        evaluate: (profile, parsedHistory, communityPoints) => {
            const count = parsedHistory.ingredients;
            if (count === 0 && !profile?.isFirstGen) return null;

            let level = 1, target = 5, prev = 0;
            if (count >= 50) { level = 4; target = 50; prev = 50; }
            else if (count >= 20) { level = 3; target = 50; prev = 20; }
            else if (count >= 5) { level = 2; target = 20; prev = 5; }

            const isMaxed = count >= 50;
            const progress = isMaxed ? 100 : Math.max(0, ((count - prev) / (target - prev)) * 100);
            return { currentLevel: level, currentScore: count, nextTarget: isMaxed ? null : target, progressPercent: progress, isMaxed };
        }
    },

    // 5. PRICE TRACKER (Correcting Market Prices)
    {
        id: 'price_tracker',
        name: { ar: 'مراقب السوق', en: 'Market Watcher' },
        description: { 
            ar: 'تُمنح لتحديث وتصحيح أسعار المنتجات في الصيدليات والمتاجر المحلية.', 
            en: 'Awarded for updating realistic local prices across pharmacies and stores.' 
        },
        getColor: () => '#0D9488', // Mineral Teal
        evaluate: (profile, parsedHistory, communityPoints) => {
            const count = parsedHistory.prices;
            if (count === 0 && !profile?.isFirstGen) return null;

            let level = 1, target = 5, prev = 0;
            if (count >= 60) { level = 4; target = 60; prev = 60; }
            else if (count >= 25) { level = 3; target = 60; prev = 25; }
            else if (count >= 5) { level = 2; target = 25; prev = 5; }

            const isMaxed = count >= 60;
            const progress = isMaxed ? 100 : Math.max(0, ((count - prev) / (target - prev)) * 100);
            return { currentLevel: level, currentScore: count, nextTarget: isMaxed ? null : target, progressPercent: progress, isMaxed };
        }
    },

    // 6. SPECS ANALYST (Claims, Targets, Volumes)
    {
        id: 'specs_analyst',
        name: { ar: 'محلل الخصائص', en: 'Specs Analyst' },
        description: { 
            ar: 'تُمنح لإكمال مواصفات المنتجات: المميزات المدعومة، نوع البشرة، والحجم الدقيق.', 
            en: 'Awarded for completing verified product specs: benefits, target skin types, and size.' 
        },
        getColor: () => '#2E7D63', // Deep Emerald
        evaluate: (profile, parsedHistory, communityPoints) => {
            const count = parsedHistory.specs;
            if (count === 0 && !profile?.isFirstGen) return null;

            let level = 1, target = 10, prev = 0;
            if (count >= 100) { level = 4; target = 100; prev = 100; }
            else if (count >= 40) { level = 3; target = 100; prev = 40; }
            else if (count >= 10) { level = 2; target = 40; prev = 10; }

            const isMaxed = count >= 100;
            const progress = isMaxed ? 100 : Math.max(0, ((count - prev) / (target - prev)) * 100);
            return { currentLevel: level, currentScore: count, nextTarget: isMaxed ? null : target, progressPercent: progress, isMaxed };
        }
    },

    // 7. COMMUNITY VOICE (Strict community interaction)
    {
        id: 'community_voice',
        name: { ar: 'صوت المجتمع', en: 'Community Voice' },
        description: { 
            ar: 'تُمنح للنقاط المكتسبة حصرياً من التفاعل في المجتمع (المنشورات، الردود، والإعجابات).', 
            en: 'Awarded strictly for points earned from active community participation and posts.' 
        },
        getColor: () => '#438E74', // Sage Green
        evaluate: (profile, parsedHistory, communityPoints) => {
            if (communityPoints === 0 && !profile?.isFirstGen) return null;

            let level = 1, target = 60, prev = 0;
            if (communityPoints >= 1500) { level = 4; target = 1500; prev = 1500; }
            else if (communityPoints >= 500) { level = 3; target = 1500; prev = 500; }
            else if (communityPoints >= 60) { level = 2; target = 500; prev = 60; }

            const isMaxed = communityPoints >= 1500;
            const progress = isMaxed ? 100 : Math.max(0, ((communityPoints - prev) / (target - prev)) * 100);
            return { currentLevel: level, currentScore: communityPoints, nextTarget: isMaxed ? null : target, progressPercent: progress, isMaxed };
        }
    }
];

export const calculateUserBadges = (profile, publicShelf) => {
    const parsedHistory = parseUserPointsHistory(profile?.pointsHistory);
    const totalPoints = Number(profile?.points) || 0;
    const communityPoints = Math.max(0, totalPoints - parsedHistory.catalogPoints);

    const calculatedBadges = [];

    BADGE_REGISTRY.forEach(badgeRule => {
        const evaluation = badgeRule.evaluate(profile, parsedHistory, communityPoints);

        if (evaluation) {
            calculatedBadges.push({
                id: badgeRule.id,
                name: badgeRule.name,
                description: badgeRule.description, 
                color: badgeRule.getColor(),
                currentLevel: evaluation.currentLevel,
                currentScore: evaluation.currentScore,
                nextTarget: evaluation.nextTarget,
                progressPercent: evaluation.progressPercent,
                isMaxed: evaluation.isMaxed,
            });
        }
    });

    return calculatedBadges.sort((a, b) => {
        if (a.isMaxed && !b.isMaxed) return -1;
        if (!a.isMaxed && b.isMaxed) return 1;
        return b.progressPercent - a.progressPercent;
    });
};