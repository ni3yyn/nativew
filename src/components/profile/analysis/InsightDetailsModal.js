import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, Animated, Dimensions, Easing, PanResponder, TouchableOpacity } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, ChartRing } from './AnalysisShared';
import { WeatherDetailedSheet } from '../../profile/WeatherComponents';
import * as Haptics from 'expo-haptics';

const { height } = Dimensions.get('window');

// --- Helper: Severity Styling ---
const getSeverityTheme = (severity) => {
    switch (severity) {
        case 'critical': 
            return { color: COLORS.danger, bg: 'rgba(239, 68, 68, 0.1)', icon: 'shield-alert-outline', label: 'تنبيه عالي الخطورة' };
        case 'warning': 
            return { color: COLORS.warning, bg: 'rgba(245, 158, 11, 0.1)', icon: 'alert-circle-outline', label: 'تحذير متوسط' };
        case 'good': 
            return { color: COLORS.success, bg: 'rgba(34, 197, 94, 0.1)', icon: 'check-circle-outline', label: 'مؤشر إيجابي' };
        default: 
            return { color: COLORS.blue, bg: 'rgba(59, 130, 246, 0.1)', icon: 'information-outline', label: 'معلومة' };
    }
};

export const InsightDetailsModal = ({ visible, onClose, insight }) => {
    const animController = useRef(new Animated.Value(0)).current;

    // --- Gesture Handler (Swipe Down to Close) ---
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) animController.setValue(1 - (gestureState.dy / height));
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > height * 0.2 || gestureState.vy > 0.8) {
                    handleClose();
                } else {
                    Animated.spring(animController, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(animController, { toValue: 1, damping: 15, stiffness: 100, useNativeDriver: true }).start();
            Haptics.selectionAsync();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true })
            .start(({ finished }) => { if (finished) onClose(); });
    };

    if (!insight) return null;

    const theme = getSeverityTheme(insight.severity);
    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    // ========================================================================
    // --- COMPONENT: ACTION PLAN (THE HERO) ---
    // ========================================================================
    const ActionPlanCard = ({ text }) => {
        if (!text) return null;
        return (
            <View style={[styles.actionCard, { borderColor: theme.color }]}>
                <View style={[styles.actionIconBadge, { backgroundColor: theme.color }]}>
                    <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#FFF" />
                </View>
                <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, { color: theme.color }]}>الخطوة المقترحة</Text>
                    <Text style={styles.actionText}>{text}</Text>
                </View>
            </View>
        );
    };

    // ========================================================================
    // --- COMPONENT: INGREDIENT CHIPS ---
    // ========================================================================
    const IngredientChips = ({ ingredients, title, type = 'bad' }) => {
        if (!ingredients || ingredients.length === 0) return null;
        const color = type === 'good' ? COLORS.success : COLORS.danger;
        const bg = type === 'good' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)';

        return (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <View style={styles.chipContainer}>
                    {ingredients.map((ing, i) => (
                        <View key={i} style={[styles.chip, { backgroundColor: bg, borderColor: color }]}>
                            <MaterialCommunityIcons name={type === 'good' ? "flask-outline" : "alert-octagon-outline"} size={14} color={color} />
                            <Text style={[styles.chipText, { color: color }]}>{ing}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    // ========================================================================
    // --- RENDERER: STANDARD INSIGHT ---
    // ========================================================================
    const renderStandardContent = () => {
        const culprits = insight.customData?.culpritIngredients || [];
        
        return (
            <View>
                {/* 1. HEADER */}
                <View style={styles.headerCentered}>
                    <View style={[styles.iconLargeCircle, { backgroundColor: theme.bg }]}>
                        <MaterialCommunityIcons name={theme.icon} size={36} color={theme.color} />
                    </View>
                    <Text style={styles.headerTitle}>{insight.title}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: theme.bg }]}>
                        <Text style={[styles.severityText, { color: theme.color }]}>{theme.label}</Text>
                    </View>
                </View>

                {/* 2. DESCRIPTION */}
                <Text style={styles.bodyText}>{insight.details}</Text>

                {/* 3. ACTION PLAN (Highlight) */}
                <ActionPlanCard text={insight.customData?.recommendation} />

                {/* 4. THE SCIENCE (Culprits) */}
                <IngredientChips ingredients={culprits} title="المكونات المسببة" type="bad" />

                {/* 5. AFFECTED PRODUCTS */}
                {insight.related_products?.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>المنتجات المعنية</Text>
                        {insight.related_products.map((p, i) => (
                            <View key={i} style={styles.productRow}>
                                <View style={styles.productIcon}>
                                    <FontAwesome5 name="wine-bottle" size={12} color={COLORS.textSecondary} />
                                </View>
                                <Text style={styles.productText}>{p}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    // ========================================================================
    // --- RENDERER: GOAL DASHBOARD ---
    // ========================================================================
    const renderGoalContent = (data) => {
        const score = data.score || 0;
        const ringColor = score >= 80 ? COLORS.success : score >= 60 ? COLORS.gold : COLORS.danger;

        return (
            <View>
                 {/* 1. SCORE HEADER */}
                <View style={styles.goalHeader}>
                    <ChartRing percentage={score} color={ringColor} radius={55} strokeWidth={8} />
                    <View style={styles.goalHeaderText}>
                        <Text style={styles.goalTitle}>{insight.title}</Text>
                        <Text style={styles.goalSubtitle}>{score >= 80 ? 'روتينك ممتاز!' : score >= 50 ? 'أنت في الطريق الصحيح' : 'يحتاج لتحسين'}</Text>
                    </View>
                </View>

                {/* 2. WARNINGS */}
                {data.sunscreenPenalty && (
                    <View style={styles.sunscreenAlert}>
                        <MaterialCommunityIcons name="weather-sunny-alert" size={24} color={COLORS.danger} />
                        <View style={{flex: 1}}>
                            <Text style={styles.alertTitle}>تنبيه الحماية</Text>
                            <Text style={styles.alertBody}>تم خصم نقاط لأن هذا الهدف يتطلب واقي شمس غير موجود.</Text>
                        </View>
                    </View>
                )}

                {/* 3. INGREDIENTS BREAKDOWN */}
                <View style={styles.divider} />
                
                <IngredientChips 
                    ingredients={data.missingHeroes} 
                    title="🔍 مكونات ينصح بإضافتها" 
                    type="bad" // Yellow/Red styling
                />
                
                <View style={{height: 10}} />

                <IngredientChips 
                    ingredients={data.foundHeroes} 
                    title="✅ مكونات متوفرة لديكِ" 
                    type="good" 
                />

                {/* 4. PRODUCTS */}
                {insight.related_products?.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>المنتجات المساهمة في هذا الهدف</Text>
                        <View style={styles.productsWrap}>
                            {insight.related_products.map((p, i) => (
                                <View key={i} style={styles.miniProductPill}>
                                    <Text style={styles.miniProductText}>{p}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    // ========================================================================
    // --- MAIN RENDER ---
    // ========================================================================
    const isGoal = insight.type === 'goal_analysis';
    const isWeather = insight.customData?.type?.includes('weather');

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <View style={{flex: 1}} pointerEvents="box-none">
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                    <View style={styles.sheetContent}>
                        {/* Drag Handle */}
                        <View style={styles.sheetHandleBar} {...panResponder.panHandlers}>
                            <View style={styles.sheetHandle} />
                        </View>

                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            
                            {isWeather ? (
                                <WeatherDetailedSheet insight={insight} />
                            ) : (
                                <View style={styles.mainPadding}>
                                    {isGoal ? renderGoalContent(insight.customData) : renderStandardContent()}
                                </View>
                            )}

                            {/* Close Button */}
                            <TouchableOpacity 
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleClose(); }} 
                                style={styles.closeButton}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.closeButtonText}>حسناً، فهمت</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    // --- Layout ---
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1 },
    sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '85%', zIndex: 2 },
    sheetContent: { flex: 1, backgroundColor: COLORS.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    sheetHandleBar: { alignItems: 'center', paddingVertical: 15, width: '100%', zIndex: 10, backgroundColor: COLORS.card },
    sheetHandle: { width: 48, height: 5, backgroundColor: COLORS.border, borderRadius: 10 },
    scrollContent: { paddingBottom: 50 },
    mainPadding: { paddingHorizontal: 25, paddingBottom: 20 },

    // --- Standard Header ---
    headerCentered: { alignItems: 'center', marginBottom: 20 },
    iconLargeCircle: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    headerTitle: { fontFamily: 'Tajawal-Bold', fontSize: 20, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 },
    severityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    severityText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },

    // --- Goal Header ---
    goalHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 25, justifyContent: 'space-between' },
    goalHeaderText: { flex: 1, marginRight: 20, alignItems: 'flex-end' },
    goalTitle: { fontFamily: 'Tajawal-Bold', fontSize: 20, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 4 },
    goalSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 15, color: COLORS.textSecondary },

    // --- Body Text ---
    bodyText: { fontFamily: 'Tajawal-Regular', fontSize: 16, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 26, marginBottom: 25 },

    // --- Action Card (Hero) ---
    actionCard: { flexDirection: 'row-reverse', backgroundColor: COLORS.cardSurface, borderRadius: 18, padding: 16, marginBottom: 25, borderWidth: 1, borderRightWidth: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    actionIconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    actionContent: { flex: 1 },
    actionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, marginBottom: 4, textAlign: 'right' },
    actionText: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textPrimary, textAlign: 'right', lineHeight: 22 },

    // --- Chips ---
    sectionContainer: { marginBottom: 20 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary, textAlign: 'right', marginBottom: 12 },
    chipContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, gap: 6 },
    chipText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },

    // --- Products ---
    productRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.background, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
    productIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    productText: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
    
    // --- Goal Mini Pills ---
    productsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    miniProductPill: { backgroundColor: COLORS.background, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
    miniProductText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary },

    // --- Alerts ---
    sunscreenAlert: { flexDirection: 'row-reverse', backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: 16, borderRadius: 16, gap: 12, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
    alertTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.danger, textAlign: 'right' },
    alertBody: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.danger, textAlign: 'right', marginTop: 2 },

    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },

    // --- Footer Button ---
    closeButton: { backgroundColor: COLORS.textPrimary, paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 10, marginHorizontal: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    closeButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.card },
});