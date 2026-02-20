// src/components/profile/analysis/AnalysisHero.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { PressableScale, ContentCard, StaggeredItem } from '../../common/AnimatedComponents';
import { WeatherLoadingCard, WeatherCompactWidget } from '../WeatherComponents';

// --- Sub-Component: Focus Insight ---
const FocusInsight = ({ insight, onSelect }) => {
    const { colors: COLORS } = useTheme();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
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
                        <FontAwesome5 name={style.icon} size={20} color={COLORS[insight.severity] || COLORS.warning} />
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
const AllClearState = () => {
    const { colors: COLORS } = useTheme();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    return (
        <StaggeredItem index={0} animated={false}>
            <ContentCard style={styles.allClearContainer} animated={false}>
                <View style={styles.allClearIconWrapper}>
                    <FontAwesome5 name="leaf" size={28} color={COLORS.success} />
                </View>
                <Text style={styles.allClearTitle}>روتينك يبدو رائعا!</Text>
                <Text style={styles.allClearSummary}>لم نعثر على أي مشاكل حرجة أو تعارضات. استمري في العناية ببشرتك.</Text>
            </ContentCard>
        </StaggeredItem>
    );
};

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

const createStyles = (COLORS) => StyleSheet.create({
    focusInsightCard: {
        padding: 20,
        borderRadius: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border || 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    focusInsightHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    focusInsightTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        color: '#fff',
        flex: 1,
        textAlign: 'right',
    },
    focusInsightSummary: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 22,
        textAlign: 'right',
        marginBottom: 16,
    },
    focusInsightAction: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 6,
    },
    focusInsightActionText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.accentGreen,
    },
    allClearContainer: {
        alignItems: 'center',
        padding: 30,
        marginBottom: 20,
    },
    allClearIconWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.success + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    allClearTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    allClearSummary: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    }
});