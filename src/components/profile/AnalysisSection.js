import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

// Sub-Component Imports
import { AnalysisHero, AnalysisCarousel } from './analysis/InsightCards';
import { BarrierCard, BarrierDetailsModal } from './analysis/BarrierSection';
import { OverviewDashboard } from './analysis/OverviewDashboard';
import { InsightDetailsModal } from './analysis/InsightDetailsModal';
import { AnalysisEmptyState } from '../../components/profile/EmptyStates';

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
    router
}) => {
    const { colors: COLORS } = useTheme();
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [showBarrierDetails, setShowBarrierDetails] = useState(false);

    const handleSelectInsight = useCallback((insight) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedInsight(insight);
    }, []);

    // ========================================================================
    // --- INSIGHTS ENGINE ---
    // ========================================================================
    const { heroInsight, carouselInsights, barrierData } = useMemo(() => {
        // 1. Safety Check
        if (!analysisData) return {
            heroInsight: null, carouselInsights: [], barrierData: null
        };

        // 2. Base Profile Insights (Filter dismissed)
        const rawInsights = analysisData.aiCoachInsights?.filter(insight => !dismissedInsightIds.includes(insight.id)) || [];

        // 3. Prepare Insights Pool
        // Start with raw insights
        let otherInsights = [...rawInsights];

        // 4. Handle Weather Dashboard (Strictly Hero)
        let weatherDashboard = null;

        if (loadingWeather) {
            weatherDashboard = { id: 'weather-loading-placeholder', isPlaceholder: true, severity: 'critical' };
        }
        else if (weatherErrorType === 'permission') {
            weatherDashboard = {
                id: 'weather-permission-denied',
                title: 'الموقع غير مفعل',
                short_summary: 'يرجى تفعيل الموقع لبيانات الطقس.',
                severity: 'warning',
                customData: { type: 'weather_advice', isPermissionError: true }
            };
        }
        else if (weatherErrorType === 'service') {
            weatherDashboard = {
                id: 'weather-unavailable',
                title: 'الطقس غير متاح',
                short_summary: 'تعذر الاتصال بخدمة الطقس.',
                severity: 'warning',
                customData: { type: 'weather_advice', isServiceError: true }
            };
        }
        else if (weatherResults && weatherResults.length > 0) {
            // FORCE: The first result is ALWAYS the main dashboard
            weatherDashboard = weatherResults[0];

            // Any additional weather alerts (indices 1+) go to the carousel pool
            if (weatherResults.length > 1) {
                const specificWeatherAlerts = weatherResults.slice(1);
                otherInsights = [...specificWeatherAlerts, ...otherInsights];
            }
        }

        // 5. Handle Night Prep Specifically
        // Find it in the pool and remove it so we can position it manually
        const nightPrepInsight = otherInsights.find(i => i.id === 'night-prep-forecast');
        otherInsights = otherInsights.filter(i => i.id !== 'night-prep-forecast');

        // 6. Determine Final Hero
        // Priority: Weather Dashboard is KING.
        let hero = weatherDashboard;

        // Fallback: If weather is completely broken/missing, grab the most critical alert
        if (!hero) {
            hero = otherInsights.find(i => i.severity === 'critical') || otherInsights[0];
            // Remove chosen hero from pool
            if (hero) {
                otherInsights = otherInsights.filter(i => i.id !== hero.id);
            }
        }

        // 7. Construct Carousel
        // Priority 1: Night Prep
        // Priority 2: Remaining insights sorted by severity
        const sortedRemaining = otherInsights.sort((a, b) => {
            const severityScore = { critical: 3, warning: 2, info: 1, good: 0 };
            return (severityScore[b.severity] || 0) - (severityScore[a.severity] || 0);
        });

        let finalCarousel = [...sortedRemaining];

        // Inject Night Prep at the START of the carousel
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

    }, [analysisData, loadingWeather, weatherResults, weatherErrorType, dismissedInsightIds]);

    // ========================================================================
    // --- RENDERING ---
    // ========================================================================

    if (!savedProducts || savedProducts.length === 0) {
        return <AnalysisEmptyState onPress={() => router.push('/oilguard')} />;
    }

    if (loadingProfile || !analysisData) {
        return <ActivityIndicator size="large" color={COLORS.accentGreen} style={styles.loadingIndicator} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.scrollContent}>

                {/* 1. HERO SECTION (Always Weather Dashboard unless error) */}
                <AnalysisHero
                    focusInsight={heroInsight}
                    onSelect={handleSelectInsight}
                    onRetryWeather={onRetryWeather}
                    onShowPermissionAlert={onShowPermissionAlert}
                />

                {/* 2. INSIGHT CAROUSEL (Starts with Night Prep if available) */}
                {carouselInsights.length > 0 && (
                    <AnalysisCarousel
                        insights={carouselInsights}
                        onSelect={handleSelectInsight}
                    />
                )}

                {/* 3. BARRIER & DASHBOARD */}
                <BarrierCard
                    barrier={barrierData}
                    onPress={() => setShowBarrierDetails(true)}
                />

                <OverviewDashboard analysisData={analysisData} />

            </View>

            {/* --- MODALS --- */}
            {selectedInsight && (
                <InsightDetailsModal
                    visible={!!selectedInsight}
                    insight={selectedInsight}
                    onClose={() => setSelectedInsight(null)}
                />
            )}

            <BarrierDetailsModal
                visible={showBarrierDetails}
                onClose={() => setShowBarrierDetails(false)}
                data={barrierData}
            />
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