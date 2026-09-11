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
// --- GOAL INSIGHT ENGINE (Client-Side, Localized) ---
// Generates carousel cards from userProfile.settings.goals when shelf is empty.
// ============================================================================
const getGoalDefinitions = (language) => ({
    brightening: {
        title: t('goal_brightening_track_title', language),
        short_summary: t('goal_brightening_track_summary', language),
        severity: 'info',
        icon: 'star',
        heroIngredients: ['niacinamide', 'vitamin-c', 'alpha-arbutin', 'kojic-acid', 'tranexamic-acid'],
        routineTips: [
            t('goal_brightening_tip_1', language),
            t('goal_brightening_tip_2', language),
            t('goal_brightening_tip_3', language),
        ],
        ctaHint: t('goal_brightening_cta', language),
    },
    acne: {
        title: t('goal_acne_track_title', language),
        short_summary: t('goal_acne_track_summary', language),
        severity: 'info',
        icon: 'shield-alt',
        heroIngredients: ['salicylic-acid', 'benzoyl-peroxide', 'niacinamide', 'tea-tree-oil', 'zinc'],
        routineTips: [
            t('goal_acne_tip_1', language),
            t('goal_acne_tip_2', language),
            t('goal_acne_tip_3', language),
        ],
        ctaHint: t('goal_acne_cta', language),
    },
    hydration: {
        title: t('goal_hydration_track_title', language),
        short_summary: t('goal_hydration_track_summary', language),
        severity: 'info',
        icon: 'tint',
        heroIngredients: ['hyaluronic-acid', 'ceramides', 'glycerin', 'panthenol', 'squalane'],
        routineTips: [
            t('goal_hydration_tip_1', language),
            t('goal_hydration_tip_2', language),
            t('goal_hydration_tip_3', language),
        ],
        ctaHint: t('goal_hydration_cta', language),
    },
    anti_aging: {
        title: t('goal_anti_aging_track_title', language),
        short_summary: t('goal_anti_aging_track_summary', language),
        severity: 'info',
        icon: 'clock',
        heroIngredients: ['retinol', 'peptides', 'vitamin-c', 'niacinamide', 'coenzyme-q10'],
        routineTips: [
            t('goal_anti_aging_tip_1', language),
            t('goal_anti_aging_tip_2', language),
            t('goal_anti_aging_tip_3', language),
        ],
        ctaHint: t('goal_anti_aging_cta', language),
    },
    texture_pores: {
        title: t('goal_texture_pores_track_title', language),
        short_summary: t('goal_texture_pores_track_summary', language),
        severity: 'info',
        icon: 'adjust',
        heroIngredients: ['aha-bha', 'salicylic-acid', 'niacinamide', 'retinol', 'clay'],
        routineTips: [
            t('goal_texture_pores_tip_1', language),
            t('goal_texture_pores_tip_2', language),
            t('goal_texture_pores_tip_3', language),
        ],
        ctaHint: t('goal_texture_pores_cta', language),
    },
});

const buildGoalInsights = (goals = [], language) => {
    const goalDefs = getGoalDefinitions(language);
    return goals
        .filter(g => goalDefs[g])
        .map((goalId) => ({
            id: `goal-insight-${goalId}`,
            title: goalDefs[goalId].title,
            short_summary: goalDefs[goalId].short_summary,
            severity: 'info',
            type: 'goal_analysis',
            customData: {
                type: 'goal_analysis',
                goalId,
                goalLabel: goalDefs[goalId].title,
                isEmptyState: true,              // signals the modal to show roadmap, NOT product dashboard
                heroIngredients: goalDefs[goalId].heroIngredients,
                routineTips: goalDefs[goalId].routineTips,
                ctaHint: goalDefs[goalId].ctaHint,
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
            const goalInsights = buildGoalInsights(goals, language);

            // 2. Universal teaser cards — always shown to fill the carousel.
            //    Shows what the user will UNLOCK once they add products.
            //    Excluded if already covered by a goal card.
            const coveredGoalIds = new Set(goals);
            const TEASERS = [
                {
                    id: 'teaser-barrier',
                    title: t('teaser_barrier_title', language),
                    short_summary: t('teaser_barrier_summary', language),
                    severity: 'info',
                    type: 'goal_analysis',
                    customData: {
                        type: 'goal_analysis',
                        goalLabel: t('teaser_barrier_label', language),
                        isEmptyState: true,
                        heroIngredients: ['ceramides', 'niacinamide', 'hyaluronic-acid', 'panthenol', 'fatty-acids'],
                        routineTips: [
                            t('teaser_barrier_tip_1', language),
                            t('teaser_barrier_tip_2', language),
                            t('teaser_barrier_tip_3', language),
                        ],
                        ctaHint: t('teaser_barrier_cta', language),
                    },
                },
                !coveredGoalIds.has('hydration') && {
                    id: 'teaser-hydration',
                    title: t('teaser_hydration_title', language),
                    short_summary: t('teaser_hydration_summary', language),
                    severity: 'info',
                    type: 'goal_analysis',
                    customData: {
                        type: 'goal_analysis',
                        goalLabel: t('goal_hydration_track_title', language),
                        isEmptyState: true,
                        heroIngredients: ['hyaluronic-acid', 'ceramides', 'glycerin', 'panthenol', 'squalane'],
                        routineTips: [
                            t('goal_hydration_tip_1', language),
                            t('goal_hydration_tip_2', language),
                            t('goal_hydration_tip_3', language),
                        ],
                        ctaHint: t('goal_hydration_cta', language),
                    },
                },
                !coveredGoalIds.has('brightening') && {
                    id: 'teaser-brightening',
                    title: t('teaser_brightening_title', language),
                    short_summary: t('teaser_brightening_summary', language),
                    severity: 'info',
                    type: 'goal_analysis',
                    customData: {
                        type: 'goal_analysis',
                        goalLabel: t('goal_brightening_track_title', language),
                        isEmptyState: true,
                        heroIngredients: ['niacinamide', 'vitamin-c', 'alpha-arbutin', 'kojic-acid', 'tranexamic-acid'],
                        routineTips: [
                            t('goal_brightening_tip_1', language),
                            t('goal_brightening_tip_2', language),
                            t('goal_brightening_tip_3', language),
                        ],
                        ctaHint: t('goal_brightening_cta', language),
                    },
                },
            ].filter(Boolean);

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