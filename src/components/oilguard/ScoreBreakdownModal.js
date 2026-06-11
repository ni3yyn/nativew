import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, Animated, Dimensions, Easing, PanResponder, TouchableOpacity } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { COLORS as DEFAULT_COLORS } from './oilguard.styles';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

const { height } = Dimensions.get('window');

// --- HELPER: ITEM STYLING ---
const getItemStyle = (type, COLORS) => {
    switch (type) {
        case 'deduction':
            return { color: COLORS.danger, bg: COLORS.danger + '1A', icon: 'minus-circle-outline' };
        case 'warning':
            return { color: COLORS.warning, bg: COLORS.warning + '1A', icon: 'alert-outline' };
        case 'info':
        case 'bonus':
            return { color: COLORS.success, bg: COLORS.success + '1A', icon: 'plus-circle-outline' };
        case 'override':
            return { color: COLORS.danger, bg: COLORS.danger + '26', icon: 'shield-alert-outline', border: true };
        case 'calculation':
            return { color: COLORS.textSecondary, bg: COLORS.textSecondary + '1A', icon: 'calculator' };
        default:
            return { color: COLORS.info, bg: COLORS.info + '1A', icon: 'information-outline' };
    }
};

const getExplanationType = (text) => {
    if (!text) return 'info';
    if (
        text.includes('يجب نقله') ||
        text.includes('يعمل ضد') ||
        text.includes('ثغرة') ||
        text.includes('لا يوجد') ||
        text.includes('تركيزه منخفض') ||
        text.includes('تعديلات بسيطة') ||
        text.includes('بدون واقي') ||
        text.includes('يفقد') ||
        text.includes('تفكك') ||
        text.includes('مكشوفة') ||
        text.includes('يفتقد لآلية')
    ) {
        return 'warning';
    }
    if (
        text.includes('متوافق') ||
        text.includes('تغطية كاملة') ||
        text.includes('دمج ممتاز') ||
        text.includes('بتركيز فعال') ||
        text.includes('مثبت بشكل جيد') ||
        text.includes('ثابتة ضوئياً')
    ) {
        return 'success';
    }
    return 'info';
};

const translateIngredient = (id, language) => {
    if (language !== 'ar') {
        return id.replace(/-/g, ' ');
    }
    const dictionary = {
        'retinol': 'الريتينول',
        'glycolic-acid': 'حمض الجليكوليك',
        'salicylic-acid': 'حمض الساليسيليك (BHA)',
        'niacinamide': 'النياسيناميد',
        'ascorbic-acid': 'فيتامين سي',
        'l-ascorbic-acid': 'فيتامين سي النقي',
        'vitamin-c': 'فيتامين سي',
        'vitamin-e': 'فيتامين إي',
        'tocopherol': 'فيتامين إي (Tocopherol)',
        'ferulic-acid': 'حمض الفيروليك',
        'benzoyl-peroxide': 'بنزويل بيروكسيد',
        'copper-peptide': 'ببتيدات النحاس',
        'hyaluronic-acid': 'حمض الهيالورونيك',
        'ceramides': 'السيراميدات',
        'zinc-oxide': 'أكسيد الزنك',
        'titanium-dioxide': 'ثاني أكسيد التيتانيوم',
        'panthenol': 'البانثينول',
        'squalane': 'السكوالان',
        'centella-asiatica': 'السنتيلا (Centella)',
        'azelaic-acid': 'حمض الأزيليك',
        'allantoin': 'الألانتوين',
        'glycerin': 'الجلسرين',
        'bakuchiol': 'الباكوتشيول',
        'tretinoin': 'التريتينوين',
        'adapalene': 'الأدابالين',
        'retinal': 'الريتينال',
        'cholesterol': 'الكوليسترول',
        'fatty-acids': 'الأحماض الدهنية',
        'argan': 'زيت الأرجان',
        'tea-tree-essential': 'زيت شجرة الشاي الأساسي',
        'jojoba': 'زيت الجوجوبا',
        'rosemary-essential': 'زيت إكليل الجبل الأساسي',
        'lavender-essential': 'زيت اللافندر الأساسي',
        'frankincense-essential': 'زيت اللبان الأساسي',
        'castor': 'زيت الخروع'
    };
    return dictionary[id.toLowerCase()] || id.replace(/-/g, ' ');
};

const ScoreBreakdownModal = ({ visible, onClose, data, analysis }) => {
    const language = useCurrentLanguage();
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const animController = useRef(new Animated.Value(0)).current;

    // --- Gesture Handler (Same Physics as InsightDetails) ---
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

    if (!data) return null;

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    return (
        <Modal transparent visible={visible} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <View style={{ flex: 1 }} pointerEvents="box-none">

                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                {/* Bottom Sheet */}
                <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                    <View style={styles.sheetContent}>

                        {/* Drag Handle */}
                        <View style={styles.sheetHandleBar} {...panResponder.panHandlers}>
                            <View style={styles.sheetHandle} />
                        </View>

                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                            {/* Header */}
                            <View style={styles.headerRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.title}>{t('breakdown_title', language)}</Text>
                                    <Text style={styles.subtitle}>{t('breakdown_subtitle', language)}</Text>
                                </View>
                                <View style={styles.iconCircle}>
                                    <MaterialCommunityIcons name="chart-box-outline" size={24} color={COLORS.textPrimary} />
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Breakdown Items */}
                            {data.map((item, index) => {
                                // Filter out calculation steps if needed, or keep for transparency
                                if (item.type === 'calculation' && !item.text.includes(t('breakdown_final_score', language))) return null;

                                const style = getItemStyle(item.type, COLORS);

                                return (
                                    <View key={index} style={[
                                        styles.itemRow,
                                        style.border && { borderColor: style.color, borderWidth: 1, backgroundColor: 'transparent' }
                                    ]}>

                                        {/* Value (Left) */}
                                        <View style={styles.valueCol}>
                                            <Text style={[styles.itemValue, { color: style.color }]}>{item.value}</Text>
                                        </View>

                                        {/* Text (Middle) */}
                                        <View style={styles.textCol}>
                                            <Text style={styles.itemText}>{item.text}</Text>
                                        </View>

                                        {/* Icon (Right) */}
                                        <View style={[styles.iconBox, { backgroundColor: style.bg }]}>
                                            <MaterialCommunityIcons name={style.icon} size={18} color={style.color} />
                                        </View>

                                    </View>
                                );
                            })}

                            {/* Sunscreen Physics Section */}
                            {analysis?.broad_spectrum && (
                                <View style={{ marginTop: 20 }}>
                                    <View style={styles.sectionHeaderRow}>
                                        <FontAwesome5 name="sun" size={15} color={COLORS.warning} style={{ marginLeft: 8 }} />
                                        <Text style={styles.sectionTitle}>
                                            {language === 'ar' ? 'التحليل الفيزيائي والطيفي للوقاية' : 'Spectral Sunscreen Physics'}
                                        </Text>
                                    </View>
                                    <View style={[styles.detailBox, { borderColor: COLORS.warning + '33' }]}>
                                        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <Text style={[styles.detailHeading, { color: COLORS.warning }]}>
                                                {language === 'ar' ? 'مؤشر تغطية الطيف (Broad Spectrum Score)' : 'Broad Spectrum Score'}
                                            </Text>
                                            <Text style={[styles.scoreValue, { color: COLORS.warning }]}>
                                                {analysis.broad_spectrum.score}/100
                                            </Text>
                                        </View>
                                        
                                        {analysis.broad_spectrum.criticalWavelength && (
                                            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                <Text style={styles.detailText}>
                                                    {language === 'ar' ? 'الطول الموجي الحرج (Critical Wavelength):' : 'Critical Wavelength:'}
                                                </Text>
                                                <View style={{ backgroundColor: COLORS.success + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                                    <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.success }}>
                                                        {analysis.broad_spectrum.criticalWavelength} nm {analysis.broad_spectrum.isTrueBroadSpectrum ? '✓' : ''}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Region scores */}
                                        {analysis.broad_spectrum.regionScores && (
                                            <View style={{ gap: 6, marginVertical: 10 }}>
                                                {Object.entries(analysis.broad_spectrum.regionScores).map(([region, score]) => (
                                                    <View key={region} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text style={[styles.detailSubtext, { width: 50, textAlign: 'right' }]}>{region}:</Text>
                                                        <View style={{ flex: 1, height: 6, backgroundColor: COLORS.background, borderRadius: 3, marginHorizontal: 10, overflow: 'hidden' }}>
                                                            <View style={{ width: `${score}%`, height: '100%', backgroundColor: COLORS.info }} />
                                                        </View>
                                                        <Text style={[styles.detailSubtext, { width: 35, textAlign: 'left' }]}>{score}%</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {analysis.broad_spectrum.stabilityNote && (
                                            <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
                                                <MaterialCommunityIcons name="lightbulb-on" size={16} color={COLORS.warning} style={{ marginTop: 2 }} />
                                                <Text style={[styles.detailText, { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, flex: 1 }]}>
                                                    {analysis.broad_spectrum.stabilityNote}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Gaps */}
                                        {analysis.broad_spectrum.spectralGaps && analysis.broad_spectrum.spectralGaps.length > 0 && (
                                            <View style={{ marginTop: 12 }}>
                                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                                    <MaterialCommunityIcons name="alert-circle" size={16} color={COLORS.danger} />
                                                    <Text style={[styles.detailHeading, { color: COLORS.danger, fontSize: 12 }]}>
                                                        {language === 'ar' ? 'الفجوات الطيفية المكتشفة:' : 'Spectral Gaps Detected:'}
                                                    </Text>
                                                </View>
                                                {analysis.broad_spectrum.spectralGaps.map((gap, i) => (
                                                    <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginRight: 22, marginBottom: 2 }}>
                                                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textDim }} />
                                                        <Text style={[styles.detailSubtext, { color: COLORS.textSecondary, marginBottom: 0 }]}>{gap}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {/* Explanations */}
                                        {analysis.broad_spectrum.whyExplanations && analysis.broad_spectrum.whyExplanations.length > 0 && (
                                            <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border + '20', paddingTop: 10, marginTop: 12, gap: 6 }}>
                                                {analysis.broad_spectrum.whyExplanations.map((exp, i) => {
                                                    const type = getExplanationType(exp);
                                                    const iconName = type === 'success' ? 'check-circle' : (type === 'warning' ? 'alert-circle' : 'information');
                                                    const iconColor = type === 'success' ? COLORS.success : (type === 'warning' ? COLORS.warning : COLORS.info || COLORS.accentGreen);
                                                                                    return (
                                                        <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 6 }}>
                                                            <MaterialCommunityIcons name={iconName} size={14} color={iconColor} style={{ marginTop: 2 }} />
                                                            <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 15, color: COLORS.textPrimary, lineHeight: 24, marginBottom: 0, flex: 1, textAlign: 'right' }}>{exp}</Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Synergy Graph Section */}
                            {analysis?.synergy_analysis && (analysis.synergy_analysis.positive?.length > 0 || analysis.synergy_analysis.negative?.length > 0) && (
                                <View style={{ marginTop: 20 }}>
                                    <View style={styles.sectionHeaderRow}>
                                        <FontAwesome5 name="atom" size={15} color={COLORS.accentGreen} style={{ marginLeft: 8 }} />
                                        <Text style={styles.sectionTitle}>
                                            {language === 'ar' ? 'التناغم والتفاعلات الكيميائية للمكونات' : 'Pharmacodynamic Synergy & Clashes'}
                                        </Text>
                                    </View>
                                    <View style={styles.synergyList}>
                                        {/* Negative clashes */}
                                        {analysis.synergy_analysis.negative?.map((edge, i) => (
                                            <View key={`neg-${i}`} style={[styles.synergyCard, { borderColor: COLORS.danger + '33', backgroundColor: COLORS.danger + '0d' }]}>
                                                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.synergyName, { color: COLORS.textPrimary, textAlign: language === 'ar' ? 'right' : 'left' }]}>
                                                            {edge.pair.map(ing => translateIngredient(ing, language)).join(' + ')}
                                                        </Text>
                                                    </View>
                                                    <View style={{ backgroundColor: COLORS.danger + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                        <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 9, color: COLORS.danger }}>CI = {edge.CI}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.synergyExplanation}>{edge.whyAr}</Text>
                                            </View>
                                        ))}

                                        {/* Positive synergies */}
                                        {analysis.synergy_analysis.positive?.map((edge, i) => (
                                            <View key={`pos-${i}`} style={[styles.synergyCard, { borderColor: COLORS.success + '33', backgroundColor: COLORS.success + '0d' }]}>
                                                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.synergyName, { color: COLORS.textPrimary, textAlign: language === 'ar' ? 'right' : 'left' }]}>
                                                            {edge.pair.map(ing => translateIngredient(ing, language)).join(' + ')}
                                                        </Text>
                                                    </View>
                                                    <View style={{ backgroundColor: COLORS.success + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                                        <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 9, color: COLORS.success }}>CI = {edge.CI}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.synergyExplanation}>{edge.whyAr}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            <View style={styles.divider} />

                            {/* Footer Disclaimer */}
                            <View style={styles.footerNote}>
                                <MaterialCommunityIcons name="robot-outline" size={16} color={COLORS.textSecondary} />
                                <Text style={styles.footerText}>
                                    {t('breakdown_disclaimer', language)}
                                </Text>
                            </View>

                            {/* Close Button */}
                            <TouchableOpacity
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleClose(); }}
                                style={styles.closeButton}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.closeButtonText}>{t('action_close', language)}</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    // --- Layout ---
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1 },
    sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '82%', zIndex: 2 },
    sheetContent: { flex: 1, backgroundColor: COLORS.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    sheetHandleBar: { alignItems: 'center', paddingVertical: 15, width: '100%', zIndex: 10, backgroundColor: COLORS.card },
    sheetHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 10 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 50 },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20, opacity: 0.5 },

    // --- Header ---
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    title: { fontFamily: 'Tajawal-Bold', fontSize: 20, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 4 },
    subtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'right' },

    // --- Rows ---
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },

    // Icon (Right side in RTL)
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },

    // Text (Middle)
    textCol: { flex: 1 },
    itemText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textPrimary, textAlign: 'right', lineHeight: 20 },

    // Value (Left side in RTL)
    valueCol: { minWidth: 50, alignItems: 'flex-start', paddingRight: 8, borderRightWidth: 1, borderRightColor: COLORS.border + '40' },
    itemValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 14 },

    // --- Footer ---
    footerNote: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', marginVertical: 10, gap: 8, paddingHorizontal: 10 },
    footerText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18, flex: 1 },

    // --- Close Button ---
    closeButton: { backgroundColor: COLORS.textPrimary, paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    closeButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.card },

    // --- Detailed analysis cards ---
    sectionHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 20, marginBottom: 10 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textPrimary },
    detailBox: { borderLeftWidth: 3, padding: 14, borderRadius: 16, borderStyle: 'solid', borderWidth: 1, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: 'transparent', backgroundColor: 'rgba(255, 255, 255, 0.03)' },
    detailHeading: { fontFamily: 'Tajawal-Bold', fontSize: 13 },
    scoreValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 15 },
    detailText: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textPrimary, textAlign: 'right', lineHeight: 20 },
    detailSubtext: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textDim, textAlign: 'right', lineHeight: 18 },

    synergyList: { gap: 10 },
    synergyCard: { borderLeftWidth: 3, borderWidth: 1, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: 'transparent', padding: 12, borderRadius: 16, marginTop: 5 },
    synergyName: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    synergyExplanation: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 18 },
});

export default ScoreBreakdownModal;