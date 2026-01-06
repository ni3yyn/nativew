import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, Animated, Dimensions, Easing, PanResponder, TouchableOpacity } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS, ChartRing } from './AnalysisShared';
import { WeatherDetailedSheet } from '../../profile/WeatherComponents';
import * as Haptics from 'expo-haptics';

const { height } = Dimensions.get('window');

// ========================================================================
// --- CONFIG: MECHANISM VISUALIZATION ---
// ========================================================================
const MECHANISM_CONFIG = {
    'exfoliation_bha': { label: 'تنظيف المسام', icon: 'bullseye-arrow', desc: 'تفكيك الدهون داخل المسام' },
    'anti_bacterial': { label: 'مكافحة البكتيريا', icon: 'bacteria-outline', desc: 'القضاء على مسببات الحبوب' },
    'sebum_control': { label: 'تنظيم الدهون', icon: 'water-off', desc: 'تقليل اللمعان والزيوت' },
    'cell_turnover': { label: 'تجديد الخلايا', icon: 'refresh-circle', desc: 'تسريع ظهور بشرة جديدة' },
    'collagen_stimulation': { label: 'تحفيز الكولاجين', icon: 'wall', desc: 'شد البشرة ومحاربة الخطوط' },
    'tyrosinase_inhibitor': { label: 'تفتيح التصبغات', icon: 'brightness-6', desc: 'إيقاف إنتاج الميلانين' },
    'exfoliation_aha': { label: 'تقشير سطحي', icon: 'layers-off', desc: 'إزالة الجلد الميت والباهت' },
    'barrier_repair': { label: 'ترميم الحاجز', icon: 'shield-check', desc: 'تقوية دفاعات البشرة' },
    'antioxidant': { label: 'مضاد أكسدة', icon: 'shield-sun', desc: 'الحماية من التلوث والشمس' },
    'humectant': { label: 'ترطيب عميق', icon: 'water', desc: 'سحب الرطوبة للجلد' },
    'general': { label: 'تأثير داعم', icon: 'star-four-points-outline', desc: 'تحسين صحة البشرة العامة' }
};

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

    // --- Gesture Handler ---
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
    // --- COMPONENT: ACTION PLAN CARD ---
    // ========================================================================
    const ActionPlanCard = ({ text }) => {
        if (!text) return null;
        return (
            <View style={[styles.actionCard, { borderColor: theme.color + '40', backgroundColor: theme.bg }]}>
                <View style={styles.actionHeaderRow}>
                    <Text style={[styles.actionTitle, { color: theme.color }]}>الخطوة المقترحة</Text>
                    <MaterialCommunityIcons name="lightbulb-on" size={18} color={theme.color} />
                </View>
                <Text style={styles.actionText}>{text}</Text>
            </View>
        );
    };

    // ========================================================================
    // --- COMPONENT: GOAL BREAKDOWN (DNA VIEW) ---
    // ========================================================================
    const GoalBreakdown = ({ foundHeroes = [], missingHeroes = [] }) => {
        // This relies on the 'mechanisms' logic. Since we pass hero names, 
        // we'll render the ingredients nicely. 
        // Ideally, pass `mechanisms` array from backend. For now, let's visualize the heroes.
        
        return (
            <View style={styles.dnaContainer}>
                <Text style={styles.sectionTitle}>تحليل المكونات الفعالة</Text>
                
                {/* Found Ingredients */}
                {foundHeroes.map((hero, index) => (
                    <View key={`found-${index}`} style={styles.dnaRow}>
                        <View style={[styles.dnaIconBox, { backgroundColor: COLORS.success + '20' }]}>
                            <MaterialCommunityIcons name="check" size={16} color={COLORS.success} />
                        </View>
                        <View style={styles.dnaTextBox}>
                            <Text style={styles.dnaTitle}>{hero}</Text>
                            <Text style={styles.dnaDesc}>موجود في روتينك ✅</Text>
                        </View>
                    </View>
                ))}

                {/* Missing Ingredients */}
                {missingHeroes.map((hero, index) => (
                    <View key={`missing-${index}`} style={[styles.dnaRow, { opacity: 0.8 }]}>
                        <View style={[styles.dnaIconBox, { backgroundColor: COLORS.border }]}>
                            <MaterialCommunityIcons name="flask-empty-outline" size={16} color={COLORS.textSecondary} />
                        </View>
                        <View style={styles.dnaTextBox}>
                            <Text style={[styles.dnaTitle, { color: COLORS.textSecondary }]}>{hero}</Text>
                            <Text style={styles.dnaDesc}>ينصح بإضافته 💡</Text>
                        </View>
                    </View>
                ))}
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
                {/* 1. Header */}
                <View style={styles.headerCentered}>
                    <View style={[styles.iconLargeCircle, { backgroundColor: theme.bg }]}>
                        <MaterialCommunityIcons name={theme.icon} size={40} color={theme.color} />
                    </View>
                    <Text style={styles.headerTitle}>{insight.title}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: theme.bg, borderColor: theme.color }]}>
                        <Text style={[styles.severityText, { color: theme.color }]}>{theme.label}</Text>
                    </View>
                </View>

                {/* 2. Description */}
                <Text style={styles.bodyText}>{insight.details}</Text>

                {/* 3. Action Plan */}
                <ActionPlanCard text={insight.customData?.recommendation} />

                <View style={styles.divider} />

                {/* 4. The Science (Culprits) */}
                {culprits.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>المكونات المسببة</Text>
                        <View style={styles.chipContainer}>
                            {culprits.map((ing, i) => (
                                <View key={i} style={[styles.chip, { backgroundColor: COLORS.cardSurface, borderColor: theme.color }]}>
                                    <MaterialCommunityIcons name="alert-octagon" size={14} color={theme.color} />
                                    <Text style={[styles.chipText, { color: COLORS.textPrimary }]}>{ing}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* 5. Affected Products */}
                {insight.related_products?.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>المنتجات المعنية</Text>
                        {insight.related_products.map((p, i) => (
                            <View key={i} style={styles.productRow}>
                                <View style={styles.productIcon}>
                                    <FontAwesome5 name="wine-bottle" size={14} color={COLORS.textSecondary} />
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
        
        // Extract mechanism keys from data if available, or infer (Simplified for this snippet)
        const foundHeroes = data.foundHeroes || [];
        const missingHeroes = data.missingHeroes || [];

        return (
            <View>
                 {/* 1. Score Header */}
                <View style={styles.goalHeader}>
                    <ChartRing percentage={score} color={ringColor} radius={60} strokeWidth={10} bgStrokeColor={COLORS.border} />
                    <View style={styles.goalHeaderText}>
                        <Text style={styles.goalTitle}>{insight.title}</Text>
                        <Text style={[styles.goalScoreText, { color: ringColor }]}>{score}% متطابق</Text>
                        <Text style={styles.goalSubtitle}>{score >= 80 ? 'روتين مثالي لهذا الهدف!' : score >= 50 ? 'تحتاجين بعض الإضافات' : 'يحتاج لتغييرات جذرية'}</Text>
                    </View>
                </View>

                {/* 2. Sunscreen Alert */}
                {data.sunscreenPenalty && (
                    <View style={styles.sunscreenAlert}>
                        <View style={styles.sunscreenIconBox}>
                            <MaterialCommunityIcons name="weather-sunny-alert" size={22} color={COLORS.danger} />
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={styles.alertTitle}>تنبيه الحماية</Text>
                            <Text style={styles.alertBody}>تم خصم نقاط كبيرة لعدم وجود واقي شمس. هذا الهدف مستحيل التحقق بدونه.</Text>
                        </View>
                    </View>
                )}

                {/* 3. Goal DNA Breakdown (New) */}
                <GoalBreakdown foundHeroes={foundHeroes} missingHeroes={missingHeroes} />

                {/* 4. Products Contributing */}
                {insight.related_products?.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.divider} />
                        <Text style={styles.sectionTitle}>منتجات تخدم هذا الهدف</Text>
                        <View style={styles.productsWrap}>
                            {insight.related_products.map((p, i) => (
                                <View key={i} style={styles.miniProductPill}>
                                    <FontAwesome5 name="check" size={10} color={COLORS.success} style={{marginLeft: 6}} />
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
                                activeOpacity={0.9}
                            >
                                <Text style={styles.closeButtonText}>إغلاق</Text>
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
    sheetHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 10 },
    scrollContent: { paddingBottom: 50 },
    mainPadding: { paddingHorizontal: 24, paddingBottom: 20 },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 24, opacity: 0.5 },

    // --- Standard Header ---
    headerCentered: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
    iconLargeCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    headerTitle: { fontFamily: 'Tajawal-Bold', fontSize: 22, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 10 },
    severityBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    severityText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },

    // --- Goal Header ---
    goalHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 30, justifyContent: 'space-between', marginTop: 10 },
    goalHeaderText: { flex: 1, marginRight: 24, alignItems: 'flex-end' },
    goalTitle: { fontFamily: 'Tajawal-Bold', fontSize: 22, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 4 },
    goalScoreText: { fontFamily: 'Tajawal-Bold', fontSize: 18, marginBottom: 4 },
    goalSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'right' },

    // --- Body Text ---
    bodyText: { fontFamily: 'Tajawal-Regular', fontSize: 16, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 26, marginBottom: 24 },

    // --- Action Card (Hero) ---
    actionCard: { padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
    actionHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    actionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    actionText: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textPrimary, textAlign: 'right', lineHeight: 24 },

    // --- Goal DNA Breakdown ---
    dnaContainer: { backgroundColor: COLORS.background, padding: 16, borderRadius: 16, marginBottom: 20 },
    dnaRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 16 },
    dnaIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    dnaTextBox: { flex: 1 },
    dnaTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textPrimary, textAlign: 'right' },
    dnaDesc: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', marginTop: 2 },

    // --- Chips ---
    sectionContainer: { marginBottom: 10 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 12 },
    chipContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 6 },
    chipText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },

    // --- Products ---
    productRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.background, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
    productIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginLeft: 12, borderWidth: 1, borderColor: COLORS.border },
    productText: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
    
    // --- Goal Mini Pills ---
    productsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    miniProductPill: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.background, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
    miniProductText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary },

    // --- Alerts ---
    sunscreenAlert: { flexDirection: 'row-reverse', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: 16, borderRadius: 16, gap: 12, alignItems: 'flex-start', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.15)' },
    sunscreenIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' },
    alertTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.danger, textAlign: 'right', marginBottom: 4 },
    alertBody: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.danger, textAlign: 'right', lineHeight: 20 },

    // --- Footer Button ---
    closeButton: { backgroundColor: COLORS.textPrimary, paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    closeButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.card },
});