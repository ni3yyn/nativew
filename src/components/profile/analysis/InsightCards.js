import React from 'react';
import { View, Text, StyleSheet, ScrollView, I18nManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { PressableScale, StaggeredItem, ContentCard } from './AnalysisShared';
import { WeatherMiniCard, WeatherCompactWidget, WeatherLoadingCard } from '../../profile/WeatherComponents';

// --- Focus Insight (Hero) ---
const FocusInsight = ({ insight, onSelect }) => {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
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

// --- All Clear ---
const AllClearState = () => {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
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

// --- NEW: Night Prep Mini Card (Carousel Item) ---
const NightPrepMiniCard = ({ insight, onPress, index }) => {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
    const data = insight.customData || {};

    return (
        <StaggeredItem index={index} style={{ width: 'auto', paddingLeft: 12 }} animated={false}>
            <PressableScale onPress={() => onPress(insight)}>
                <View style={[styles.modernCardContainer, { borderColor: '#4338ca' }]}>
                    <LinearGradient
                        colors={['#1e1b4b', '#312e81']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />

                    {/* Header */}
                    <View style={styles.modernCardHeader}>
                        <View style={[styles.modernIconBox, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                            <FontAwesome5 name="moon" size={12} color="#c7d2fe" />
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: '#818cf8' }]} />
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1, justifyContent: 'center', gap: 2 }}>
                        <Text style={[styles.modernCardTitle, { color: '#e0e7ff', marginTop: 4 }]} numberOfLines={1}>
                            خطة الليلة
                        </Text>
                        <Text style={styles.nightMiniText} numberOfLines={2}>
                            {data.action || 'جهزي بشرتك للغد'}
                        </Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.modernCardFooter}>
                        <Text style={[styles.readMoreText, { color: '#a5b4fc' }]}>إضافة</Text>
                        <Feather name="plus-circle" size={12} color="#a5b4fc" />
                    </View>
                </View>
            </PressableScale>
        </StaggeredItem>
    );
};

// --- Standard Small Card ---
const StandardInsightCard = ({ insight, onPress, index }) => {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
    const getTheme = () => {
        switch (insight.severity) {
            case 'critical': return { border: COLORS.danger, icon: 'shield-alt', bg: [COLORS.danger + '26', COLORS.danger + '0D'] };
            case 'warning': return { border: COLORS.warning, icon: 'exclamation-triangle', bg: [COLORS.warning + '26', COLORS.warning + '0D'] };
            default: return { border: COLORS.accentGreen, icon: 'lightbulb', bg: [COLORS.accentGreen + '26', COLORS.accentGreen + '0D'] };
        }
    };
    const theme = getTheme();

    return (
        <StaggeredItem index={index} style={{ width: 'auto', paddingLeft: 12 }} animated={false}>
            <PressableScale onPress={() => onPress(insight)}>
                <View style={[styles.modernCardContainer, { borderColor: theme.border }]}>
                    <LinearGradient colors={theme.bg} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                    <View style={styles.modernCardHeader}>
                        <View style={[styles.modernIconBox, { backgroundColor: theme.border }]}>
                            <FontAwesome5 name={theme.icon} size={12} color={COLORS.textOnAccent} />
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: theme.border }]} />
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={styles.modernCardTitle} numberOfLines={3}>{insight.title}</Text>
                    </View>
                    <View style={styles.modernCardFooter}>
                        <Text style={[styles.readMoreText, { color: theme.border }]}>المزيد</Text>
                        <Feather name="chevron-left" size={12} color={theme.border} />
                    </View>
                </View>
            </PressableScale>
        </StaggeredItem>
    );
};

// --- Exports ---
export const AnalysisHero = ({ focusInsight, onSelect, onRetryWeather, onShowPermissionAlert }) => {
    if (!focusInsight) return <AllClearState />;
    if (focusInsight.isPlaceholder) return <WeatherLoadingCard />;

    // Check if it's the main weather dashboard
    const isWeather = focusInsight.customData?.type === 'weather_advice' || focusInsight.customData?.type === 'weather_dashboard';
    if (isWeather) return <WeatherCompactWidget insight={focusInsight} onPress={onSelect} onRetry={onRetryWeather} onPermissionBlocked={onShowPermissionAlert} />;

    // Otherwise standard focus card (e.g. Critical Product Alert if no weather)
    return <FocusInsight insight={focusInsight} onSelect={onSelect} />;
};

export const AnalysisCarousel = ({ insights, onSelect }) => {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
    return (
        <View style={{ marginBottom: 25 }}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5, marginBottom: 15 }}>
                <Text style={styles.carouselTitle}>أبرز الملاحظات</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 5, paddingBottom: 25 }} style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}>
                {insights.map((insight, index) => {
                    // Check for Weather Alerts (secondary weather cards)
                    const isWeather = insight.customData?.type === 'weather_advice' || insight.customData?.type === 'weather_dashboard';
                    if (isWeather) return <WeatherMiniCard key={insight.id} insight={insight} onPress={onSelect} />;

                    // Check for Night Prep
                    if (insight.id === 'night-prep-forecast') {
                        return <NightPrepMiniCard key={insight.id} insight={insight} onPress={onSelect} index={index} />;
                    }

                    // Default Standard Card
                    return <StandardInsightCard key={insight.id} insight={insight} onPress={onSelect} index={index} />;
                })}
            </ScrollView>
        </View>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    focusInsightCard: { borderRadius: 24, padding: 25, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    focusInsightHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    focusInsightTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18, color: COLORS.textPrimary },
    focusInsightSummary: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'right', marginTop: 12, lineHeight: 22 },
    focusInsightAction: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start', marginTop: 20 },
    focusInsightActionText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.accentGreen },
    allClearContainer: { alignItems: 'center', padding: 30, marginBottom: 25 },
    allClearIconWrapper: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.success + '1A', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: COLORS.success + '33' },
    allClearTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: COLORS.textPrimary },
    allClearSummary: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 5, lineHeight: 20 },
    carouselTitle: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 15, paddingHorizontal: 5 },

    // Modern Mini Cards
    modernCardContainer: { width: 150, height: 160, borderRadius: 22, padding: 14, justifyContent: 'space-between', borderWidth: 1, backgroundColor: COLORS.card, overflow: 'hidden' },
    modernCardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    modernIconBox: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    statusDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
    modernCardTitle: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textPrimary, textAlign: 'right', lineHeight: 18, marginTop: 8, marginBottom: 4 },
    modernCardFooter: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, opacity: 0.8 },
    readMoreText: { fontFamily: 'Tajawal-Bold', fontSize: 10 },
    nightMiniText: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: '#c7d2fe', textAlign: 'right', lineHeight: 16 }
});