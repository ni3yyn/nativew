import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from './analysis/AnalysisShared';

// Sub-Component Imports
import { AnalysisHero, AnalysisCarousel } from './analysis/InsightCards';
import { BarrierCard, BarrierDetailsModal } from './analysis/BarrierSection';
import { OverviewDashboard } from './analysis/OverviewDashboard';
import { InsightDetailsModal } from './analysis/InsightDetailsModal';
import { AnalysisEmptyState } from '../../components/profile/EmptyStates'; 
import { NightPrepCard } from '../../components/profile/WeatherComponents'; 

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
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [showBarrierDetails, setShowBarrierDetails] = useState(false);

    const handleSelectInsight = useCallback((insight) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedInsight(insight);
    }, []);
  
    // ========================================================================
    // --- INSIGHTS ENGINE ---
    // ========================================================================
    const { heroInsight, carouselInsights, nightPrepInsight, barrierData } = useMemo(() => {
        // 1. Safety Check
        if (!analysisData) return { 
            heroInsight: null, carouselInsights: [], nightPrepInsight: null, barrierData: null 
        };

        // 2. Base Profile Insights (Filter dismissed)
        const rawInsights = analysisData.aiCoachInsights?.filter(insight => !dismissedInsightIds.includes(insight.id)) || [];
        let allInsights = [...rawInsights];

        // 3. Inject Weather Insight (From API)
        let weatherInsight = null;
        if (loadingWeather) {
            weatherInsight = { id: 'weather-loading-placeholder', isPlaceholder: true, severity: 'critical' };
        } 
        else if (weatherErrorType === 'permission') {
            weatherInsight = {
                id: 'weather-permission-denied',
                title: 'الموقع غير مفعل',
                short_summary: 'يرجى تفعيل الموقع لبيانات الطقس.',
                severity: 'warning',
                customData: { type: 'weather_advice', isPermissionError: true }
            };
        }
        else if (weatherErrorType === 'service') {
            weatherInsight = {
                id: 'weather-unavailable',
                title: 'الطقس غير متاح',
                short_summary: 'تعذر الاتصال بخدمة الطقس.',
                severity: 'warning',
                customData: { type: 'weather_advice', isServiceError: true }
            };
        }
        else if (weatherResults && weatherResults.length > 0) {
            // The first result is the main weather card
            weatherInsight = weatherResults[0]; 
        }

        // Add Weather to top of list
        if (weatherInsight) {
            allInsights = [weatherInsight, ...allInsights];
        }

        // 4. Extract Night Prep (Separate Card)
        const foundNightPrep = allInsights.find(i => i.id === 'night-prep-forecast');
        if (foundNightPrep) {
            allInsights = allInsights.filter(i => i.id !== 'night-prep-forecast');
        }

        // 5. Determine Hero Card
        // Priority: Loading -> Weather (if critical/warning) -> Critical Product Alert -> Standard Weather
        let focus = allInsights.find(i => 
            i.isPlaceholder ||
            i.severity === 'critical' || // Prioritize Critical alerts (e.g. High UV or Product Clash)
            (i.customData?.type === 'weather_advice' || i.customData?.type === 'weather_dashboard')
        );
        
        // Fallback if no weather/critical issues found
        if (!focus) focus = allInsights.find(i => i.severity === 'warning');

        // 6. Carousel & Barrier
        const carousel = allInsights.filter(i => i.id !== focus?.id);
        const barrier = analysisData.barrierHealth || { 
            score: 0, status: '...', color: COLORS.textSecondary, desc: '', 
            totalIrritation: 0, totalSoothing: 0, offenders: [], defenders: []
        };

        return { 
            heroInsight: focus, 
            carouselInsights: carousel, 
            nightPrepInsight: foundNightPrep, 
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
                
                {/* 1. HERO SECTION (Weather / Major Alert) */}
                <AnalysisHero 
                    focusInsight={heroInsight} 
                    onSelect={handleSelectInsight} 
                    onRetryWeather={onRetryWeather}
                    onShowPermissionAlert={onShowPermissionAlert}
                />

                {/* 2. NIGHT PREP CARD (Dynamic: Only shows if interesting) */}
                {nightPrepInsight && (
                    <NightPrepCard 
                        data={nightPrepInsight.customData} 
                        onPress={() => handleSelectInsight(nightPrepInsight)}
                    />
                )}
  
                {/* 3. INSIGHT CAROUSEL (Secondary tips) */}
                {carouselInsights.length > 0 && (
                    <AnalysisCarousel 
                        insights={carouselInsights} 
                        onSelect={handleSelectInsight} 
                    />
                )}
  
                {/* 4. BARRIER & DASHBOARD */}
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