import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

// Sub-Component Imports
import { AnalysisHero, AnalysisCarousel } from './analysis/InsightCards';
import { BarrierCard, BarrierDetailsModal } from './analysis/BarrierSection';
import { InsightDetailsModal } from './analysis/InsightDetailsModal';
import { CircadianAndSynergyCard, CircadianAndSynergyDetailsModal } from './analysis/CircadianAndSynergy';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

// ============================================================================
// --- GOAL INSIGHT ENGINE (Client-Side, No API Needed) ---
// Generates carousel cards from userProfile.settings.goals when shelf is empty.
// ============================================================================
const GOAL_DEFINITIONS = {
    brightening: {
        title: 'مسار: تفتيح وتوحيد اللون',
        short_summary: 'أضفي منتجاتكِ لنحلل مدى توافقها مع هدفكِ في التفتيح',
        severity: 'info',
        icon: 'star',
        heroIngredients: ['niacinamide', 'vitamin-c', 'alpha-arbutin', 'kojic-acid', 'tranexamic-acid'],
        routineTips: [
            'نياسيناميد — السيروم أو التونر صباحاً ومساءً',
            'فيتامين C — صباحاً قبل واقي الشمس',
            'واقي شمس SPF 50 — ضروري يومياً',
        ],
        ctaHint: 'ابحثي عن سيروم يحتوي على نياسيناميد أو فيتامين C لبدء مساركِ',
    },
    acne: {
        title: 'مسار: مكافحة حب الشباب',
        short_summary: 'أضفي روتينكِ لنكتشف نقاط القوة والفجوات في مكافحة البكتيريا',
        severity: 'info',
        icon: 'shield-alt',
        heroIngredients: ['salicylic-acid', 'benzoyl-peroxide', 'niacinamide', 'tea-tree-oil', 'zinc'],
        routineTips: [
            'حمض الساليسيليك — تونر أو غسول مساءً',
            'نياسيناميد — يقلل الاحمرار صباحاً ومساءً',
            'مرطب خفيف غير دهني — لا تتخطاي الترطيب',
        ],
        ctaHint: 'ابدأي بتنظيف حامض خفيف مع سيروم نياسيناميد',
    },
    hydration: {
        title: 'مسار: الترطيب وترميم الحاجز',
        short_summary: 'حللي منتجاتكِ لمعرفة مدى دعمها لحاجز بشرتكِ',
        severity: 'info',
        icon: 'tint',
        heroIngredients: ['hyaluronic-acid', 'ceramides', 'glycerin', 'panthenol', 'squalane'],
        routineTips: [
            'حمض الهيالورونيك — سيروم على بشرة رطبة صباحاً ومساءً',
            'سيراميد — يرمم الحاجز مساءً',
            'غليسيرين — موجود في معظم المرطبات الجيدة',
        ],
        ctaHint: 'أضيفي سيروم حمض هيالورونيك + مرطب يحتوي سيراميد',
    },
    anti_aging: {
        title: 'مسار: مكافحة الشيخوخة',
        short_summary: 'أضفي كريمات وسيرومات العناية لتقييم مساركِ العلاجي',
        severity: 'info',
        icon: 'clock',
        heroIngredients: ['retinol', 'peptides', 'vitamin-c', 'niacinamide', 'coenzyme-q10'],
        routineTips: [
            'ريتينول — فقط مساءً مرة أو ثلاث بالأسبوع للمبتدئات',
            'بيبتيد — صباحاً تحت واقي الشمس',
            'فيتامين C — حماية مع تفتيح صباحي',
        ],
        ctaHint: 'ابدئي بسيروم بيبتيد صباحاً وريتينول خفيف مساءً',
    },
    texture_pores: {
        title: 'مسار: تحسين المسام والملمس',
        short_summary: 'أضفي منتجات التقشير والتنظيم لتحليل فعاليتها',
        severity: 'info',
        icon: 'adjust',
        heroIngredients: ['aha-bha', 'salicylic-acid', 'niacinamide', 'retinol', 'clay'],
        routineTips: [
            'حمض AHA/BHA — تقشير كيميائي مرتين بالأسبوع',
            'نياسيناميد — يضيق المسام يومياً',
            'طين بنتونيت / كاولين — ماسك أسبوعياً',
        ],
        ctaHint: 'ابدئي بتونر AHA/BHA وسيروم نياسيناميد',
    },
};

const buildGoalInsights = (goals = []) => {
    return goals
        .filter(g => GOAL_DEFINITIONS[g])
        .map((goalId) => ({
            id: `goal-insight-${goalId}`,
            title: GOAL_DEFINITIONS[goalId].title,
            short_summary: GOAL_DEFINITIONS[goalId].short_summary,
            severity: 'info',
            type: 'goal_analysis',
            customData: {
                type: 'goal_analysis',
                goalId,
                goalLabel: GOAL_DEFINITIONS[goalId].title,
                isEmptyState: true,              // signals the modal to show roadmap, NOT product dashboard
                heroIngredients: GOAL_DEFINITIONS[goalId].heroIngredients,
                routineTips: GOAL_DEFINITIONS[goalId].routineTips,
                ctaHint: GOAL_DEFINITIONS[goalId].ctaHint,
            },
        }));
};

export const AnalysisSection = ({
    loadingProfile,
    loadingWeather,
    savedProducts = [],
    analysisData,
    weatherResults,
    weatherErrorType,
    dismissedInsightIds,
    onRetryWeather,
    onShowPermissionAlert,
    userProfile,
    router
}) => {
    const { colors: COLORS } = useTheme();
    const language = useCurrentLanguage();
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [showBarrierDetails, setShowBarrierDetails] = useState(false);
    const [showCircadianDetails, setShowCircadianDetails] = useState(false);

    // isEmpty drives the partial-lock UX
    const isEmpty = !savedProducts || savedProducts.length === 0;

    const handleSelectInsight = useCallback((insight) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedInsight(insight);
    }, []);

    // ========================================================================
    // --- INSIGHTS ENGINE ---
    // ========================================================================
    const { heroInsight, carouselInsights, barrierData } = useMemo(() => {

        // ── EMPTY SHELF PATH ────────────────────────────────────────────────
        // Build weather hero + goal insight carousel.
        // Always guarantees cards: user goal cards first, then universal teasers
        // so the carousel is NEVER empty for cold-start users.
        if (isEmpty) {
            // Build weather hero
            let weatherDashboard = null;
            if (loadingWeather) {
                weatherDashboard = { id: 'weather-loading-placeholder', isPlaceholder: true, severity: 'critical' };
            } else if (weatherErrorType === 'permission') {
                weatherDashboard = {
                    id: 'weather-permission-denied',
                    title: t('profile_weather_location_disabled', language),
                    short_summary: t('profile_weather_enable_location', language),
                    severity: 'warning',
                    customData: { type: 'weather_advice', isPermissionError: true }
                };
            } else if (weatherErrorType === 'service') {
                weatherDashboard = {
                    id: 'weather-unavailable',
                    title: t('profile_weather_unavailable', language),
                    short_summary: t('profile_weather_service_error', language),
                    severity: 'warning',
                    customData: { type: 'weather_advice', isServiceError: true }
                };
            } else if (weatherResults && weatherResults.length > 0) {
                weatherDashboard = weatherResults[0];
            }

            // 1. Goal insight cards from user's saved goals (if any)
            const goals = userProfile?.settings?.goals || [];
            const goalInsights = buildGoalInsights(goals);

            // 2. Universal teaser cards — always shown to fill the carousel.
            //    Shows what the user will UNLOCK once they add products.
            //    Excluded if already covered by a goal card.
            const coveredGoalIds = new Set(goals);
            const TEASERS = [
                {
                    id: 'teaser-barrier',
                    title: 'صحة حاجزك الجلدي',
                    short_summary: 'أضف منتجاتك لتعرف حال حاجزك — وأين تقع الثغرات',
                    severity: 'info',
                    type: 'goal_analysis',
                    customData: {
                        type: 'goal_analysis',
                        goalLabel: 'تحليل صحة الحاجز الجلدي',
                        isEmptyState: true,
                        heroIngredients: ['ceramides', 'niacinamide', 'hyaluronic-acid', 'panthenol', 'fatty-acids'],
                        routineTips: [
                            'سيراميد — يرمم الحاجز ويوقف فقدان الماء',
                            'نياسيناميد — يعزز إنتاج الدهون الطبيعية',
                            'تجنبي المقشرات القوية يومياً — تُضعف الحاجز',
                        ],
                        ctaHint: 'ابدئي بمرطب يحتوي سيراميد + نياسيناميد لتقوية الحاجز',
                    },
                },
                !coveredGoalIds.has('hydration') && {
                    id: 'teaser-hydration',
                    title: 'مسار الترطيب',
                    short_summary: 'هل منتجاتك تُرطب بشرتك فعلاً؟ أضفها لنكتشف',
                    severity: 'info',
                    type: 'goal_analysis',
                    customData: {
                        type: 'goal_analysis',
                        goalLabel: 'مسار: الترطيب وترميم الحاجز',
                        isEmptyState: true,
                        heroIngredients: ['hyaluronic-acid', 'ceramides', 'glycerin', 'panthenol', 'squalane'],
                        routineTips: [
                            'حمض الهيالورونيك — سيروم على بشرة رطبة صباحاً ومساءً',
                            'سيراميد — يرمم الحاجز مساءً',
                            'غليسيرين — موجود في معظم المرطبات الجيدة',
                        ],
                        ctaHint: 'أضيفي سيروم حمض هيالورونيك + مرطب يحتوي سيراميد',
                    },
                },
                !coveredGoalIds.has('brightening') && {
                    id: 'teaser-brightening',
                    title: 'مسار التفتيح',
                    short_summary: 'كم يدعم روتينك هدف التفتيح؟ أضف منتجاتك',
                    severity: 'info',
                    type: 'goal_analysis',
                    customData: {
                        type: 'goal_analysis',
                        goalLabel: 'مسار: تفتيح وتوحيد اللون',
                        isEmptyState: true,
                        heroIngredients: ['niacinamide', 'vitamin-c', 'alpha-arbutin', 'kojic-acid', 'tranexamic-acid'],
                        routineTips: [
                            'نياسيناميد — السيروم أو التونر صباحاً ومساءً',
                            'فيتامين C — صباحاً قبل واقي الشمس',
                            'واقي شمس SPF 50 — ضروري يومياً',
                        ],
                        ctaHint: 'ابحثي عن سيروم يحتوي على نياسيناميد أو فيتامين C لبدء مساركِ',
                    },
                },
            ].filter(Boolean); // removes `false` entries from !coveredGoalIds checks

            // Merge: user goals first, then teasers for gaps (cap at 5 total)
            const extraWeatherAlerts = (weatherResults && weatherResults.length > 1)
                ? weatherResults.slice(1)
                : [];

            const allCards = [...extraWeatherAlerts, ...goalInsights, ...TEASERS];
            // Deduplicate: keep first occurrence of each id
            const seenIds = new Set();
            const carousel = allCards.filter(c => {
                if (seenIds.has(c.id)) return false;
                seenIds.add(c.id);
                return true;
            }).slice(0, 5);

            return {
                heroInsight: weatherDashboard,
                carouselInsights: carousel,
                barrierData: null,
            };
        }

        // ── NORMAL PATH (products exist) ────────────────────────────────────
        if (!analysisData) return {
            heroInsight: null, carouselInsights: [], barrierData: null
        };

        // 2. Base Profile Insights (Filter dismissed)
        const rawInsights = analysisData.aiCoachInsights?.filter(insight => !dismissedInsightIds.includes(insight.id)) || [];

        // 3. Prepare Insights Pool
        let otherInsights = [...rawInsights];

        // 4. Handle Weather Dashboard (Strictly Hero)
        let weatherDashboard = null;

        if (loadingWeather) {
            weatherDashboard = { id: 'weather-loading-placeholder', isPlaceholder: true, severity: 'critical' };
        }
        else if (weatherErrorType === 'permission') {
            weatherDashboard = {
                id: 'weather-permission-denied',
                title: t('profile_weather_location_disabled', language),
                short_summary: t('profile_weather_enable_location', language),
                severity: 'warning',
                customData: { type: 'weather_advice', isPermissionError: true }
            };
        }
        else if (weatherErrorType === 'service') {
            weatherDashboard = {
                id: 'weather-unavailable',
                title: t('profile_weather_unavailable', language),
                short_summary: t('profile_weather_service_error', language),
                severity: 'warning',
                customData: { type: 'weather_advice', isServiceError: true }
            };
        }
        else if (weatherResults && weatherResults.length > 0) {
            weatherDashboard = weatherResults[0];
            if (weatherResults.length > 1) {
                const specificWeatherAlerts = weatherResults.slice(1);
                otherInsights = [...specificWeatherAlerts, ...otherInsights];
            }
        }

        // 5. Handle Night Prep
        const nightPrepInsight = otherInsights.find(i => i.id === 'night-prep-forecast');
        otherInsights = otherInsights.filter(i => i.id !== 'night-prep-forecast');

        // 6. Determine Final Hero
        let hero = weatherDashboard;
        if (!hero) {
            hero = otherInsights.find(i => i.severity === 'critical') || otherInsights[0];
            if (hero) {
                otherInsights = otherInsights.filter(i => i.id !== hero.id);
            }
        }

        // 7. Construct Carousel
        const sortedRemaining = otherInsights.sort((a, b) => {
            const severityScore = { critical: 3, warning: 2, info: 1, good: 0 };
            return (severityScore[b.severity] || 0) - (severityScore[a.severity] || 0);
        });

        let finalCarousel = [...sortedRemaining];
        if (nightPrepInsight) {
            finalCarousel = [nightPrepInsight, ...finalCarousel];
        }

        // 8. Barrier Data
        const barrier = analysisData.barrierHealth || {
            score: 0, status: '...', color: COLORS.textSecondary, desc: '',
            totalIrritation: 0, totalSoothing: 0, offenders: [], defenders: []
        };

        return {
            heroInsight: hero,
            carouselInsights: finalCarousel,
            barrierData: barrier
        };

    }, [analysisData, loadingWeather, weatherResults, weatherErrorType, dismissedInsightIds, language, isEmpty, userProfile]);

    // ========================================================================
    // --- RENDERING ---
    // ========================================================================

    // Only show the full-screen spinner when products exist and we are loading
    if (!isEmpty && loadingProfile && !analysisData) {
        return <ActivityIndicator size="large" color={COLORS.accentGreen} style={styles.loadingIndicator} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.scrollContent}>

                {/* 1. HERO SECTION — Always rendered (weather is independent of products) */}
                <AnalysisHero
                    focusInsight={heroInsight}
                    onSelect={handleSelectInsight}
                    onRetryWeather={onRetryWeather}
                    onShowPermissionAlert={onShowPermissionAlert}
                />

                {/* 2. INSIGHT CAROUSEL — Weather alerts + Goal Insights when empty */}
                {carouselInsights.length > 0 && (
                    <AnalysisCarousel
                        insights={carouselInsights}
                        onSelect={handleSelectInsight}
                    />
                )}

                {/* 3. BARRIER — Rendered always; locked when isEmpty */}
                <BarrierCard
                    barrier={barrierData}
                    onPress={() => !isEmpty && setShowBarrierDetails(true)}
                    isLocked={isEmpty}
                    router={router}
                />

                {/* 4. CIRCADIAN & SYNERGY — Rendered always; locked when isEmpty */}
                <CircadianAndSynergyCard
                    circadian={isEmpty ? null : analysisData?.circadianAlignment}
                    synergy={isEmpty ? null : analysisData?.crossProductSynergy}
                    onPress={() => !isEmpty && setShowCircadianDetails(true)}
                    isLocked={isEmpty}
                    router={router}
                />

            </View>

            {/* --- MODALS — Only open when unlocked --- */}
            {selectedInsight && (
                <InsightDetailsModal
                    visible={!!selectedInsight}
                    insight={selectedInsight}
                    onClose={() => setSelectedInsight(null)}
                />
            )}

            {!isEmpty && (
                <>
                    <BarrierDetailsModal
                        visible={showBarrierDetails}
                        onClose={() => setShowBarrierDetails(false)}
                        data={barrierData}
                    />

                    <CircadianAndSynergyDetailsModal
                        visible={showCircadianDetails}
                        onClose={() => setShowCircadianDetails(false)}
                        circadian={analysisData?.circadianAlignment}
                        synergy={analysisData?.crossProductSynergy}
                    />
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 150,
    },
    loadingIndicator: {
        marginTop: 50,
    }
});
