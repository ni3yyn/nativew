import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, Animated, Dimensions, Easing, PanResponder, TouchableOpacity } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { ChartRing } from './AnalysisShared';
import { WeatherDetailedSheet } from '../../profile/WeatherComponents';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../../src/context/ThemeContext';
import { t, interpolate } from '../../../../src/i18n';
import { useCurrentLanguage } from '../../../../src/hooks/useCurrentLanguage';

const { height } = Dimensions.get('window');

// ========================================================================
// --- CONFIG: MECHANISM VISUALIZATION ---
// ========================================================================
const MECHANISM_CONFIG = {
    'exfoliation_bha': { label: 'Pore cleansing', icon: 'bullseye-arrow', desc: 'Breaks down pore oil' },
    'anti_bacterial': { label: 'Anti-bacterial', icon: 'bacteria-outline', desc: 'Targets breakout-causing bacteria' },
    'sebum_control': { label: 'Sebum control', icon: 'water-off', desc: 'Reduces oil and shine' },
    'cell_turnover': { label: 'Cell turnover', icon: 'refresh-circle', desc: 'Speeds up skin renewal' },
    'collagen_stimulation': { label: 'Collagen boost', icon: 'wall', desc: 'Supports firmness and lines' },
    'tyrosinase_inhibitor': { label: 'Pigmentation brightening', icon: 'brightness-6', desc: 'Helps reduce melanin production' },
    'exfoliation_aha': { label: 'Surface exfoliation', icon: 'layers-off', desc: 'Removes dull dead skin' },
    'barrier_repair': { label: 'Barrier repair', icon: 'shield-check', desc: 'Strengthens skin defenses' },
    'antioxidant': { label: 'Antioxidant', icon: 'shield-sun', desc: 'Helps protect from pollution/sun' },
    'humectant': { label: 'Deep hydration', icon: 'water', desc: 'Draws moisture into skin' },
    'general': { label: 'Supportive effect', icon: 'star-four-points-outline', desc: 'Improves overall skin health' }
};

export const InsightDetailsModal = ({ visible, onClose, insight }) => {
    const { colors } = useTheme(); // Get colors from theme
    const language = useCurrentLanguage();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const animController = useRef(new Animated.Value(0)).current;

    // --- Helper: Severity Styling (now uses colors from theme) ---
    const getSeverityTheme = (severity) => {
        switch (severity) {
            case 'critical':
                return { color: colors.danger, bg: colors.danger + '1A', icon: 'shield-alert-outline', label: t('insight_severity_critical', language) };
            case 'warning':
                return { color: colors.warning, bg: colors.warning + '1A', icon: 'alert-circle-outline', label: t('insight_severity_warning', language) };
            case 'good':
                return { color: colors.success, bg: colors.success + '1A', icon: 'check-circle-outline', label: t('insight_severity_good', language) };
            default:
                return { color: colors.info || colors.accentGreen, bg: (colors.info || colors.accentGreen) + '1A', icon: 'information-outline', label: t('insight_severity_info', language) };
        }
    };

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
                    <Text style={[styles.actionTitle, { color: theme.color }]}>{t('insight_action_step', language)}</Text>
                    <MaterialCommunityIcons name="lightbulb-on" size={18} color={theme.color} />
                </View>
                <Text style={[styles.actionText, { color: colors.textPrimary }]}>{text}</Text>
            </View>
        );
    };

    // ========================================================================
    // --- COMPONENT: GOAL BREAKDOWN (DNA VIEW) ---
    // ========================================================================
    const GoalBreakdown = ({ foundHeroes = [], missingHeroes = [] }) => {
        return (
            <View style={[styles.dnaContainer, { backgroundColor: colors.background }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('insight_active_ingredients', language)}</Text>

                {/* Found Ingredients */}
                {foundHeroes.map((hero, index) => (
                    <View key={`found-${index}`} style={styles.dnaRow}>
                        <View style={[styles.dnaIconBox, { backgroundColor: colors.success + '20' }]}>
                            <MaterialCommunityIcons name="check" size={16} color={colors.success} />
                        </View>
                        <View style={styles.dnaTextBox}>
                            <Text style={[styles.dnaTitle, { color: colors.textPrimary }]}>{hero}</Text>
                            <Text style={[styles.dnaDesc, { color: colors.textSecondary }]}>{t('insight_exists_in_routine', language)}</Text>
                        </View>
                    </View>
                ))}

                {/* Missing Ingredients */}
                {missingHeroes.map((hero, index) => (
                    <View key={`missing-${index}`} style={[styles.dnaRow, { opacity: 0.8 }]}>
                        <View style={[styles.dnaIconBox, { backgroundColor: colors.border }]}>
                            <MaterialCommunityIcons name="flask-empty-outline" size={16} color={colors.textSecondary} />
                        </View>
                        <View style={styles.dnaTextBox}>
                            <Text style={[styles.dnaTitle, { color: colors.textSecondary }]}>{hero}</Text>
                            <Text style={[styles.dnaDesc, { color: colors.textSecondary }]}>{t('insight_recommended_add', language)}</Text>
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
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{insight.title}</Text>
                    <View style={[styles.severityBadge, { backgroundColor: theme.bg, borderColor: theme.color }]}>
                        <Text style={[styles.severityText, { color: theme.color }]}>{theme.label}</Text>
                    </View>
                </View>

                {/* 2. Description */}
                <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{insight.details}</Text>

                {/* 3. Action Plan */}
                <ActionPlanCard text={insight.customData?.recommendation} />

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* 4. The Science (Culprits) */}
                {culprits.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('insight_culprit_ingredients', language)}</Text>
                        <View style={styles.chipContainer}>
                            {culprits.map((ing, i) => (
                                <View key={i} style={[styles.chip, { backgroundColor: colors.background, borderColor: theme.color }]}>
                                    <MaterialCommunityIcons name="alert-octagon" size={14} color={theme.color} />
                                    <Text style={[styles.chipText, { color: colors.textPrimary }]}>{ing}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* 5. Affected Products */}
                {insight.related_products?.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('insight_related_products', language)}</Text>
                        {insight.related_products.map((p, i) => (
                            <View key={i} style={[styles.productRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                <View style={[styles.productIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <FontAwesome5 name="wine-bottle" size={14} color={colors.textSecondary} />
                                </View>
                                <Text style={[styles.productText, { color: colors.textPrimary }]}>{p}</Text>
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
        const ringColor = score >= 80 ? colors.success : score >= 60 ? colors.gold : colors.danger;

        // Extract mechanism keys from data if available, or infer (Simplified for this snippet)
        const foundHeroes = data.foundHeroes || [];
        const missingHeroes = data.missingHeroes || [];

        return (
            <View>
                {/* 1. Score Header */}
                <View style={styles.goalHeader}>
                    <ChartRing percentage={score} color={ringColor} radius={60} strokeWidth={10} />
                    <View style={styles.goalHeaderText}>
                        <Text style={[styles.goalTitle, { color: colors.textPrimary }]}>{insight.title}</Text>
                        <Text style={[styles.goalScoreText, { color: ringColor }]}>{interpolate(t('insight_goal_match', language), { score })}</Text>
                        <Text style={[styles.goalSubtitle, { color: colors.textSecondary }]}>{score >= 80 ? t('insight_goal_perfect', language) : score >= 50 ? t('insight_goal_some_additions', language) : t('insight_goal_major_changes', language)}</Text>
                    </View>
                </View>

                {/* 2. Sunscreen Alert */}
                {data.sunscreenPenalty && (
                    <View style={[styles.sunscreenAlert, { borderColor: 'rgba(239, 68, 68, 0.15)' }]}>
                        <View style={[styles.sunscreenIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <MaterialCommunityIcons name="weather-sunny-alert" size={22} color={colors.danger} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.alertTitle, { color: colors.danger }]}>{t('insight_protection_alert', language)}</Text>
                            <Text style={[styles.alertBody, { color: colors.danger }]}>{t('insight_protection_alert_body', language)}</Text>
                        </View>
                    </View>
                )}

                {/* 3. Goal DNA Breakdown (New) */}
                <GoalBreakdown foundHeroes={foundHeroes} missingHeroes={missingHeroes} />

                {/* 4. Products Contributing */}
                {insight.related_products?.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t('insight_products_supporting_goal', language)}</Text>
                        <View style={styles.productsWrap}>
                            {insight.related_products.map((p, i) => (
                                <View key={i} style={[styles.miniProductPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <FontAwesome5 name="check" size={10} color={colors.success} style={{ marginLeft: 6 }} />
                                    <Text style={[styles.miniProductText, { color: colors.textSecondary }]}>{p}</Text>
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
            <View style={{ flex: 1 }} pointerEvents="box-none">
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                    <View style={[styles.sheetContent, { backgroundColor: colors.card }]}>
                        {/* Drag Handle */}
                        <View style={[styles.sheetHandleBar, { backgroundColor: colors.card }]} {...panResponder.panHandlers}>
                            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
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
                                style={[styles.closeButton, { backgroundColor: colors.textPrimary }]}
                                activeOpacity={0.9}
                            >
                                <Text style={[styles.closeButtonText, { color: colors.card }]}>{t('insight_close', language)}</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (colors) => StyleSheet.create({
    // --- Layout ---
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1 },
    sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '85%', zIndex: 2 },
    sheetContent: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    sheetHandleBar: { alignItems: 'center', paddingVertical: 15, width: '100%', zIndex: 10 },
    sheetHandle: { width: 40, height: 4, borderRadius: 10 },
    scrollContent: { paddingBottom: 50 },
    mainPadding: { paddingHorizontal: 24, paddingBottom: 20 },
    divider: { height: 1, marginVertical: 24, opacity: 0.5 },

    // --- Standard Header ---
    headerCentered: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
    iconLargeCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    headerTitle: { fontFamily: 'Tajawal-Bold', fontSize: 22, textAlign: 'center', marginBottom: 10 },
    severityBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    severityText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },

    // --- Goal Header ---
    goalHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 30, justifyContent: 'space-between', marginTop: 10 },
    goalHeaderText: { flex: 1, marginRight: 24, alignItems: 'flex-end' },
    goalTitle: { fontFamily: 'Tajawal-Bold', fontSize: 22, textAlign: 'right', marginBottom: 4 },
    goalScoreText: { fontFamily: 'Tajawal-Bold', fontSize: 18, marginBottom: 4 },
    goalSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14, textAlign: 'right' },

    // --- Body Text ---
    bodyText: { fontFamily: 'Tajawal-Regular', fontSize: 16, textAlign: 'right', lineHeight: 26, marginBottom: 24 },

    // --- Action Card (Hero) ---
    actionCard: { padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
    actionHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    actionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    actionText: { fontFamily: 'Tajawal-Bold', fontSize: 15, textAlign: 'right', lineHeight: 24 },

    // --- Goal DNA Breakdown ---
    dnaContainer: { padding: 16, borderRadius: 16, marginBottom: 20 },
    dnaRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 16 },
    dnaIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    dnaTextBox: { flex: 1 },
    dnaTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, textAlign: 'right' },
    dnaDesc: { fontFamily: 'Tajawal-Regular', fontSize: 12, textAlign: 'right', marginTop: 2 },

    // --- Chips ---
    sectionContainer: { marginBottom: 10 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, textAlign: 'right', marginBottom: 12 },
    chipContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 6 },
    chipText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },

    // --- Products ---
    productRow: { flexDirection: 'row-reverse', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
    productIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 12, borderWidth: 1 },
    productText: { fontFamily: 'Tajawal-Regular', fontSize: 14, flex: 1, textAlign: 'right' },

    // --- Goal Mini Pills ---
    productsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    miniProductPill: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
    miniProductText: { fontFamily: 'Tajawal-Regular', fontSize: 13 },

    // --- Alerts ---
    sunscreenAlert: {
        flexDirection: 'row-reverse',
        backgroundColor: (colors.danger || '#ef4444') + '0D',
        padding: 16, borderRadius: 16, gap: 12, alignItems: 'flex-start', marginBottom: 24,
        borderWidth: 1, borderColor: (colors.danger || '#ef4444') + '26'
    },
    sunscreenIconBox: {
        width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
        backgroundColor: (colors.danger || '#ef4444') + '1A'
    },
    alertTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, textAlign: 'right', marginBottom: 4 },
    alertBody: { fontFamily: 'Tajawal-Regular', fontSize: 13, textAlign: 'right', lineHeight: 20 },

    // --- Footer Button ---
    closeButton: { paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    closeButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16 },
});
