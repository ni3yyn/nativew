import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, Animated, Dimensions, Easing, PanResponder, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, ChartRing } from './AnalysisShared';
import { WeatherDetailedSheet } from '../../profile/WeatherComponents';

const { height } = Dimensions.get('window');

// --- Reusable Compact Header ---
const InsightHeaderCompact = ({ insight }) => {
    const getTheme = () => {
        switch (insight.severity) {
            case 'critical': return { icon: 'shield-alt', color: COLORS.danger };
            case 'warning': return { icon: 'exclamation-triangle', color: COLORS.warning };
            default: return { icon: 'info-circle', color: COLORS.blue };
        }
    };
    const theme = getTheme();

    return (
        <View style={styles.compactHeaderContainer}>
            <View style={[styles.compactIconCircle, { backgroundColor: theme.color + '20' }]}>
                <FontAwesome5 name={theme.icon} size={24} color={theme.color} />
            </View>
            <View style={styles.compactTextContainer}>
                <Text style={styles.compactTitle}>{insight.title}</Text>
                <Text style={styles.compactSubtitle}>{insight.short_summary}</Text>
            </View>
        </View>
    );
};

export const InsightDetailsModal = ({ visible, onClose, insight }) => {
    const animController = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) animController.setValue(1 - (gestureState.dy / height));
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > height * 0.2 || gestureState.vy > 0.8) handleClose();
                else Animated.spring(animController, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(animController, { toValue: 1, damping: 15, stiffness: 100, useNativeDriver: true }).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true })
            .start(({ finished }) => { if (finished) onClose(); });
    };

    if (!insight) return null;

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    // --- RENDERER 1: GOAL ANALYSIS DASHBOARD ---
    const renderGoalDashboard = (data) => {
        const score = data.score || 0;
        const missingHeroes = data?.missingHeroes || [];
        const foundHeroes = data?.foundHeroes || [];
        const relatedProducts = insight.related_products || [];
        const ringColor = score >= 80 ? COLORS.success : score >= 60 ? COLORS.gold : score >= 40 ? COLORS.warning : COLORS.danger;

        return (
            <View style={{ alignItems: 'center' }}>
                <ChartRing percentage={score} color={ringColor} radius={60} strokeWidth={10} />
                <Text style={styles.chartLabel}>مؤشر تطابق الهدف</Text>

                <View style={styles.goalDetailsCard}>
                    {data.sunscreenPenalty && (
                        <View style={[styles.alertBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: COLORS.danger }]}>
                            <FontAwesome5 name="sun" size={16} color={COLORS.danger} />
                            <Text style={[styles.alertBoxText, { color: COLORS.danger }]}>تنبيه: الهدف متوقف عند 35% لعدم وجود واقي شمس.</Text>
                        </View>
                    )}
                    {score < 100 && missingHeroes.length > 0 && (
                        <View style={styles.goalSection}>
                            <Text style={styles.goalSectionTitle}>🧪 لرفع النتيجة</Text>
                            <View style={styles.suggestionGrid}>
                                {missingHeroes.map((hero, i) => (
                                    <TouchableOpacity key={i} style={styles.suggestionChip} activeOpacity={0.7}>
                                        <Text style={styles.suggestionChipText}>{hero.replace(/-/g, ' ')}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                    {foundHeroes.length > 0 && (
                        <View style={styles.goalSection}>
                            <Text style={styles.goalSectionTitle}>✅ مكونات فعالة لديكِ</Text>
                            <View style={styles.suggestionGrid}>
                                {foundHeroes.map((h, i) => (
                                    <View key={i} style={[styles.suggestionChip, styles.ownedChip]}>
                                        <Text style={[styles.suggestionChipText, styles.ownedChipText]}>{h}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                    {relatedProducts.length > 0 && (
                        <View style={styles.goalSection}>
                            <Text style={styles.goalSectionTitle}>المنتجات المساهمة</Text>
                            <View style={styles.suggestionGrid}>
                                {relatedProducts.map((p, i) => (
                                    <View key={i} style={styles.productPill}><Text style={styles.productPillText}>{p}</Text></View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    // --- RENDERER 2: STANDARD INSIGHT VIEW ---
    const renderStandardInsight = (insightData) => (
        <>
            <InsightHeaderCompact insight={insightData} />
            <Text style={styles.modalDescription}>{insightData.details}</Text>
            {insightData.related_products?.length > 0 && (
                <View style={styles.ingSection}>
                    <Text style={styles.ingSectionTitle}>المنتجات المعنية:</Text>
                    {insightData.related_products.map((p, i) => (
                        <View key={i} style={styles.relatedProductCard}>
                            <View style={styles.relatedProductIcon}><FontAwesome5 name="wine-bottle" size={12} color={COLORS.accentGreen} /></View>
                            <Text style={styles.relatedProductText}>{p}</Text>
                        </View>
                    ))}
                </View>
            )}
        </>
    );

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <View style={{flex: 1}} pointerEvents="box-none">
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                    <View style={styles.sheetContent}>
                        <View style={styles.sheetHandleBar} {...panResponder.panHandlers}>
                            <View style={styles.sheetHandle} />
                        </View>

                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            {(insight.customData?.type === 'weather_dashboard' || insight.customData?.type === 'weather_advice') ? (
                                <WeatherDetailedSheet insight={insight} />
                            ) : (
                                <View style={styles.mainContent}>
                                    {(insight.type === 'goal_analysis' && insight.customData) ? 
                                        renderGoalDashboard(insight.customData) :
                                        renderStandardInsight(insight)
                                    }
                                </View>
                            )}
                            <Pressable 
                                onPress={handleClose} 
                                style={styles.closeButton}
                                delayPressIn={0}
                            >
                                <Text style={styles.closeButtonText}>إغلاق</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1 },
    sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '90%', zIndex: 2 },
    sheetContent: { flex: 1, backgroundColor: COLORS.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    sheetHandleBar: { alignItems: 'center', paddingVertical: 15, width: '100%' },
    sheetHandle: { width: 48, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
    scrollContent: { paddingBottom: 50 },
    mainContent: { padding: 25, paddingTop: 10 },

    // --- Compact Header ---
    compactHeaderContainer: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 25, gap: 15 },
    compactIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    compactTextContainer: { flex: 1 },
    compactTitle: { fontFamily: 'Tajawal-Bold', fontSize: 20, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 4 },
    compactSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 15, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 22 },

    // --- Generic Body & Sections ---
    modalDescription: { fontFamily: 'Tajawal-Regular', fontSize: 16, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 26, marginBottom: 20 },
    ingSection: { width: '100%', marginBottom: 25, },
    ingSectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 15, borderRightWidth: 3, borderRightColor: COLORS.accentGreen, paddingRight: 10 },
    relatedProductCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.background, padding: 12, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
    relatedProductIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(90, 156, 132, 0.1)', alignItems: 'center', justifyContent: 'center' },
    relatedProductText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary, flex: 1, textAlign: 'right' },
    
    // --- Goal Dashboard ---
    chartContainer: { alignItems: 'center', marginBottom: 20 },
    chartLabel: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, marginTop: -5, fontSize: 13 },
    goalDetailsCard: { width: '100%', backgroundColor: COLORS.cardSurface, borderRadius: 24, padding: 20, marginTop: 20, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
    goalSection: { width: '100%', alignItems: 'center', marginBottom: 25, },
    goalSectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textSecondary, marginBottom: 15 },
    suggestionGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
    suggestionChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.4)' },
    suggestionChipText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.gold },
    ownedChip: { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)'},
    ownedChipText: { color: COLORS.success },
    productPill: { backgroundColor: COLORS.background, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
    productPillText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary },

    // --- Alert Box (For Sunscreen Penalty) ---
    alertBox: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 10, marginBottom: 20 },
    alertBoxText: { flex: 1, fontFamily: 'Tajawal-Bold', fontSize: 13, textAlign: 'right', lineHeight: 18 },
    
    // --- Close Button ---
    closeButton: { backgroundColor: COLORS.cardSurface, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginHorizontal: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginTop: 20 },
    closeButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary },
});