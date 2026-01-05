// src/components/profile/analysis/AnalysisHero.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { COLORS } from '../../../constants/theme';
import { PressableScale, ContentCard, StaggeredItem } from '../../common/AnimatedComponents';
import { WeatherLoadingCard, WeatherCompactWidget } from '../WeatherComponents';

// --- Sub-Component: Focus Insight ---
const FocusInsight = ({ insight, onSelect }) => {
    const severityStyles = {
        critical: { icon: 'shield-alt', colors: ['#581c1c', '#3f2129'] },
        warning: { icon: 'exclamation-triangle', colors: ['#5a3a1a', '#422c1b'] },
    };
    const style = severityStyles[insight.severity] || severityStyles.warning;
  
    return (
        <StaggeredItem index={0} animated={false}>
            <PressableScale onPress={() => onSelect(insight)}>
                <LinearGradient colors={style.colors} style={styles.focusInsightCard}>
                    <View style={styles.focusInsightHeader}>
                        <FontAwesome5 name={style.icon} size={20} color={COLORS[insight.severity]} />
                        <Text style={styles.focusInsightTitle}>{insight.title}</Text>
                    </View>
                    <Text style={styles.focusInsightSummary}>{insight.short_summary}</Text>
                    <View style={styles.focusInsightAction}>
                        <Text style={styles.focusInsightActionText}>عرض التفاصيل والتوصية</Text>
                        <Feather name="chevron-left" size={16} color={COLORS.accentGreen} />
                    </View>
                </LinearGradient>
            </PressableScale>
        </StaggeredItem>
    );
};

// --- Sub-Component: All Clear ---
const AllClearState = () => (
    <StaggeredItem index={0} animated={false}>
        <ContentCard style={styles.allClearContainer} animated={false}>
            <View style={styles.allClearIconWrapper}>
                 <FontAwesome5 name="leaf" size={28} color={COLORS.success} />
            </View>
            <Text style={styles.allClearTitle}>روتينك يبدو رائعاً!</Text>
            <Text style={styles.allClearSummary}>لم نعثر على أي مشاكل حرجة أو تعارضات. استمري في العناية ببشرتك.</Text>
        </ContentCard>
    </StaggeredItem>
);

// --- Main Export ---
export const AnalysisHero = ({ 
    focusInsight, 
    onSelect, 
    onRetryWeather, 
    onShowPermissionAlert 
}) => {
    if (!focusInsight) {
        return <AllClearState />;
    }

    if (focusInsight.isPlaceholder) {
        return <WeatherLoadingCard />;
    }

    const isWeather = focusInsight.customData?.type === 'weather_advice' || 
                      focusInsight.customData?.type === 'weather_dashboard';

    if (isWeather) {
        return (
            <WeatherCompactWidget 
                insight={focusInsight} 
                onPress={onSelect} 
                onRetry={onRetryWeather} 
                onPermissionBlocked={onShowPermissionAlert} 
            />
        );
    }

    return <FocusInsight insight={focusInsight} onSelect={onSelect} />;
};

const styles = StyleSheet.create({
   // Copy focusInsightCard, allClearContainer etc styles here
});