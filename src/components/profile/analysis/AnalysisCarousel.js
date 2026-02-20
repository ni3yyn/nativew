// src/components/profile/analysis/AnalysisCarousel.js
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, I18nManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { PressableScale, StaggeredItem } from '../../common/AnimatedComponents';
import { WeatherMiniCard } from '../WeatherComponents';

const StandardInsightCard = ({ insight, onPress, index }) => {
    const { colors: COLORS } = useTheme();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
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
                    <LinearGradient
                        colors={theme.bg}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <View style={styles.modernCardHeader}>
                        <View style={[styles.modernIconBox, { backgroundColor: theme.border }]}>
                            <FontAwesome5 name={theme.icon} size={12} color={COLORS.textOnAccent} />
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: theme.border }]} />
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <Text style={styles.modernCardTitle} numberOfLines={3}>
                            {insight.title}
                        </Text>
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

export const AnalysisCarousel = ({ insights, onSelect }) => {
    const { colors: COLORS } = useTheme();
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    return (
        <View style={{ marginBottom: 25 }}>
            <View style={styles.header}>
                <Text style={styles.carouselTitle}>أبرز الملاحظات</Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselContentContainer}
                style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }}
            >
                {insights.map((insight, index) => {
                    const isWeather = insight.customData?.type === 'weather_advice' ||
                        insight.customData?.type === 'weather_dashboard';

                    if (isWeather) {
                        return <WeatherMiniCard key={insight.id} insight={insight} onPress={onSelect} />;
                    }

                    return <StandardInsightCard key={insight.id} insight={insight} onPress={onSelect} index={index} />;
                })}
            </ScrollView>
        </View>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 4 },
    carouselTitle: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, textAlign: 'right' },
    carouselContentContainer: { paddingHorizontal: 4, flexDirection: 'row-reverse', gap: 10, paddingBottom: 5 },
    modernCardContainer: {
        width: 140, height: 160, borderRadius: 20, overflow: 'hidden',
        borderWidth: 1.5, padding: 14, justifyContent: 'space-between',
        backgroundColor: COLORS.card,
    },
    modernCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modernIconBox: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    statusDot: { width: 7, height: 7, borderRadius: 3.5 },
    modernCardTitle: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textPrimary, textAlign: 'right', lineHeight: 19 },
    modernCardFooter: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    readMoreText: { fontFamily: 'Tajawal-Bold', fontSize: 11 },
});
