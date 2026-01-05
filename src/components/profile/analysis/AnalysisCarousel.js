// src/components/profile/analysis/AnalysisCarousel.js
import React from 'react';
import { View, Text, ScrollView, StyleSheet, I18nManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { COLORS } from '../../../constants/theme';
import { PressableScale, StaggeredItem } from '../../common/AnimatedComponents';
import { WeatherMiniCard } from '../WeatherComponents';

const StandardInsightCard = ({ insight, onPress, index }) => {
    const getTheme = () => {
        switch (insight.severity) {
            case 'critical': return { border: COLORS.danger, icon: 'shield-alt', bg: ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)'] };
            case 'warning': return { border: COLORS.warning, icon: 'exclamation-triangle', bg: ['rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.05)'] };
            default: return { border: COLORS.accentGreen, icon: 'lightbulb', bg: ['rgba(90, 156, 132, 0.15)', 'rgba(90, 156, 132, 0.05)'] };
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
                    <View style={{flex: 1, justifyContent: 'center'}}>
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

export const AnalysisCarousel = ({ insights, onSelect }) => (
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

const styles = StyleSheet.create({
    // Copy carouselTitle, modernCardContainer etc styles here
});