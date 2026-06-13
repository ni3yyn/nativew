// src/components/profile/analysis/CircadianAndSynergy.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, Animated, Dimensions, Easing, PanResponder, TouchableOpacity } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { ContentCard, PressableScale, StaggeredItem } from './AnalysisShared';
import { useTheme } from '../../../context/ThemeContext';
import { t } from '../../../i18n';
import { useCurrentLanguage } from '../../../hooks/useCurrentLanguage';
import { useRTL } from '../../../hooks/useRTL';
import * as Haptics from 'expo-haptics';

const { height, width } = Dimensions.get('window');

// --- 1. MINI PROGRESS/GAUGE RING ---
const MiniScoreRing = ({ score, color, label }) => {
    const { colors: C } = useTheme();
    const { isRTL } = useRTL();
    return (
        <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderColor: color + '33', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <View style={[StyleSheet.absoluteFill, { borderRadius: 25, borderWidth: 3, borderColor: color, borderBottomColor: 'transparent', borderLeftColor: 'transparent', transform: [{ rotate: '45deg' }] }]} />
                <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 13, color: color }}>{score}%</Text>
            </View>
            <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 11, color: C.textSecondary }}>{label}</Text>
        </View>
    );
};

// --- 2. MAIN CARD ---
export const CircadianAndSynergyCard = ({ circadian, synergy, onPress }) => {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(C, isRTL), [C, isRTL]);

    if (!circadian && (!synergy || (synergy.positive?.length === 0 && synergy.negative?.length === 0))) {
        return null; // Don't render if no circadian routine set and no synergies detected
    }

    const circadianScore = circadian?.overallScore ?? 100;
    const netSynergy = synergy?.netScore ?? 0;
    const synergyColor = netSynergy >= 10 ? C.success : (netSynergy >= 0 ? C.accentGreen : C.warning);

    return (
        <PressableScale onPress={onPress}>
            <ContentCard style={styles.card} animated={false}>
                <View style={styles.cardPadding}>
                    {/* Header */}
                    <View style={styles.cardHeader}>
                        <View style={styles.titleRow}>
                            <FontAwesome5 name="magic" size={15} color={C.accentGreen} />
                            <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
                                {isRTL ? 'تفاعلات الروتين' : 'Biochemistry & Alignment'}
                            </Text>
                        </View>
                        <View style={{ backgroundColor: C.accentGreen + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                            <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 10, color: C.accentGreen }}>
                                {isRTL ? 'التوقيت' : 'Timing & Synergy'}
                            </Text>
                        </View>
                    </View>

                    {/* Stats Rows */}
                    <View style={styles.gridContainer}>
                        {/* Left Column: Circadian Biology */}
                        {circadian && (
                            <View style={styles.gridCol}>
                                <View style={styles.metricHeader}>
                                    <FontAwesome5 name="history" size={14} color="#818cf8" style={{ marginLeft: 6 }} />
                                    <Text style={[styles.metricTitle, { color: C.textPrimary }]}>
                                        {isRTL ? 'الساعة البيولوجية' : 'Circadian Clock'}
                                    </Text>
                                </View>
                                <View style={styles.metricRow}>
                                    <MiniScoreRing score={circadianScore} color="#818cf8" label={isRTL ? 'التوافق' : 'Alignment'} />
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={[styles.metricStatus, { color: '#818cf8' }]}>
                                            {circadianScore >= 90 ? (isRTL ? 'مثالي' : 'Perfect') : (circadianScore >= 70 ? (isRTL ? 'جيد' : 'Good') : (isRTL ? 'يحتاج تعديل' : 'Alert'))}
                                        </Text>
                                        <Text style={styles.metricDesc} numberOfLines={2}>
                                            {circadian.misplacements?.length > 0
                                                ? (isRTL ? `وجدنا ${circadian.misplacements.length} مكونات في غير وقتها` : `${circadian.misplacements.length} items mismatched`)
                                                : (isRTL ? 'كل المكونات في وقتها المثالي!' : 'Timing is fully optimized')}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Divider */}
                        {circadian && synergy && <View style={[styles.verticalDivider, { backgroundColor: C.border }]} />}

                        {/* Right Column: Synergy Graph */}
                        {synergy && (
                            <View style={styles.gridCol}>
                                <View style={styles.metricHeader}>
                                    <FontAwesome5 name="atom" size={14} color={synergyColor} style={{ marginLeft: 6 }} />
                                    <Text style={[styles.metricTitle, { color: C.textPrimary }]}>
                                        {isRTL ? 'التفاعل الكيميائي' : 'Chemical Synergy'}
                                    </Text>
                                </View>
                                <View style={styles.metricRow}>
                                    <View style={{ alignItems: 'center', gap: 6 }}>
                                        <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: synergyColor + '15', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: synergyColor }}>
                                            <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 13, color: synergyColor }}>
                                                {netSynergy >= 0 ? `+${netSynergy}` : netSynergy}
                                            </Text>
                                        </View>
                                        <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 11, color: C.textSecondary }}>
                                            {isRTL ? 'مؤشر التفاعل' : 'Synergy Index'}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={[styles.metricStatus, { color: synergyColor }]}>
                                            {netSynergy >= 15 ? (isRTL ? 'انسجام ممتاز' : 'Elite Synergy') : (netSynergy >= 0 ? (isRTL ? 'متناسق' : 'Synergized') : (isRTL ? 'تعارض كيميائي' : 'Conflict'))}
                                        </Text>
                                        <Text style={styles.metricDesc} numberOfLines={2}>
                                            {isRTL
                                                ? `تفاعلات: +${synergy.positive?.length || 0} إيجابي ، -${synergy.negative?.length || 0} سلبي`
                                                : `Interactions: +${synergy.positive?.length || 0} pos, -${synergy.negative?.length || 0} neg`}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Footer call to action */}
                    <View style={styles.footer}>
                        <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 11, color: C.textSecondary }}>
                            {isRTL ? 'اضغط لعرض تفاصيل تعارض المكونات وأفضل أوقات الاستخدام' : 'Press to view chemical synergies & timing logs'}
                        </Text>
                        <FontAwesome5 name="chevron-left" size={9} color={C.textDim} />
                    </View>
                </View>
            </ContentCard>
        </PressableScale>
    );
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

// --- 3. DETAILS MODAL ---
export const CircadianAndSynergyDetailsModal = ({ visible, onClose, circadian, synergy }) => {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(C, isRTL), [C, isRTL]);
    const slideAnim = useRef(new Animated.Value(height)).current;
    const [activeTab, setActiveTab] = useState('circadian'); // 'circadian' | 'synergy'

    const netSynergy = synergy?.netScore ?? 0;
    const synergyColor = netSynergy >= 10 ? C.success : (netSynergy >= 0 ? C.accentGreen : C.warning);

    useEffect(() => {

        if (visible) {
            Animated.spring(slideAnim, { toValue: 0, damping: 18, stiffness: 120, useNativeDriver: true }).start();
            Haptics.selectionAsync();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(slideAnim, { toValue: height, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => onClose());
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <View style={styles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

                    {/* Sheet Handle */}
                    <View style={styles.dragHandleContainer}>
                        <View style={styles.dragHandle} />
                    </View>

                    <View style={styles.tabsRow}>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'circadian' && styles.tabActiveButton]}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('circadian'); }}
                            activeOpacity={0.7}
                        >
                            <FontAwesome5 name="history" size={13} color={activeTab === 'circadian' ? '#818cf8' : C.textSecondary} style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
                            <Text style={[styles.tabText, activeTab === 'circadian' ? { color: '#818cf8', fontFamily: 'Tajawal-Bold' } : { color: C.textSecondary }]}>
                                {isRTL ? 'الساعة البيولوجية' : 'Circadian Biology'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'synergy' && styles.tabActiveButton]}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('synergy'); }}
                            activeOpacity={0.7}
                        >
                            <FontAwesome5 name="atom" size={13} color={activeTab === 'synergy' ? C.accentGreen : C.textSecondary} style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }} />
                            <Text style={[styles.tabText, activeTab === 'synergy' ? { color: C.accentGreen, fontFamily: 'Tajawal-Bold' } : { color: C.textSecondary }]}>
                                {isRTL ? 'التفاعل الكيميائي' : 'Synergy Graph'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        {/* ==================== TAB 1: CIRCADIAN BIOLOGY ==================== */}
                        {activeTab === 'circadian' && (
                            <View style={{ gap: 20 }}>
                                {/* Circadian Card Hero */}
                                <View style={styles.detailsHeroCard}>
                                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 15 }}>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.heroTitle}>{isRTL ? 'تحليل أوقات المكونات' : 'Timing Optimization'}</Text>
                                            <Text style={styles.heroSubtitle}>{isRTL ? 'كيف يتوافق روتينك مع بشرتك؟' : 'Align with biological rhythm'}</Text>
                                        </View>
                                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#818cf81a', alignItems: 'center', justifyContent: 'center', borderLineWidth: 2, borderColor: '#818cf8' }}>
                                            <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 18, color: '#818cf8' }}>
                                                {circadian?.overallScore ?? 100}%
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row-reverse', gap: 15, width: '100%', borderTopWidth: 1, borderTopColor: C.border + '33', paddingTop: 12 }}>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 11, color: C.textSecondary }}>{isRTL ? 'الروتين الصباحي' : 'Morning'}</Text>
                                            <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 16, color: C.textPrimary }}>{circadian?.amScore ?? 100}%</Text>
                                        </View>
                                        <View style={{ width: 1, backgroundColor: C.border + '33' }} />
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 11, color: C.textSecondary }}>{isRTL ? 'الروتين المسائي' : 'Evening'}</Text>
                                            <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 16, color: C.textPrimary }}>{circadian?.pmScore ?? 100}%</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Explanations Section */}
                                {circadian?.whyExplanations && circadian.whyExplanations.length > 0 && (
                                    <View style={styles.section}>
                                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <MaterialCommunityIcons name="clock-outline" size={16} color={C.textPrimary} />
                                            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
                                                {isRTL ? 'توجيهات الساعة البيولوجية' : 'Timing Insights'}
                                            </Text>
                                        </View>
                                        <View style={styles.explanationsContainer}>
                                            {circadian.whyExplanations.map((exp, idx) => {
                                                const type = getExplanationType(exp);
                                                const iconName = type === 'success' ? 'check-circle' : (type === 'warning' ? 'alert-circle' : 'information');
                                                const iconColor = type === 'success' ? C.success : (type === 'warning' ? C.warning : C.accentGreen);
                                                return (
                                                    <View key={idx} style={styles.explanationBulletRow}>
                                                        <MaterialCommunityIcons
                                                            name={iconName}
                                                            size={16}
                                                            color={iconColor}
                                                            style={isRTL ? { marginLeft: 8, marginTop: 2 } : { marginRight: 8, marginTop: 2 }}
                                                        />
                                                        <Text style={[styles.explanationText, { color: C.textPrimary }]}>{exp}</Text>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {/* Misplacement warnings */}
                                {circadian?.misplacements && circadian.misplacements.length > 0 && (
                                    <View style={styles.section}>
                                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={C.danger} />
                                            <Text style={[styles.sectionTitle, { color: C.danger, marginBottom: 0 }]}>
                                                {isRTL ? 'تحذيرات تعارض التوقيت' : 'Time Conflicts'}
                                            </Text>
                                        </View>
                                        {circadian.misplacements.map((item, idx) => {
                                            const isCritical = item.severity === 'critical';
                                            const itemColor = isCritical ? C.danger : C.warning;
                                            return (
                                                <View key={idx} style={[styles.alertDetailBox, { borderColor: itemColor + '33', backgroundColor: itemColor + '0d' }]}>
                                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: itemColor + '1a', alignItems: 'center', justifyContent: 'center' }}>
                                                            <FontAwesome5 name={isCritical ? 'exclamation-circle' : 'exclamation-triangle'} size={12} color={itemColor} />
                                                        </View>
                                                        <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 14, color: itemColor, textTransform: 'capitalize' }}>
                                                            {item.ingredientId.replace(/-/g, ' ')}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.alertDetailText}>
                                                        {isRTL
                                                            ? `موجود في الروتين [${item.currentTime === 'AM' ? 'الصباحي' : 'المسائي'}] ، بينما وقته المثالي هو [${item.optimalTime === 'AM' ? 'الصباحي' : 'المسائي'}].`
                                                            : `Placed in [${item.currentTime}], optimal timing is [${item.optimalTime}].`}
                                                    </Text>
                                                    {item.whyAr && (
                                                        <Text style={[styles.alertDetailText, { fontFamily: 'Tajawal-Bold', marginTop: 4, color: C.textSecondary }]}>
                                                            {item.whyAr}
                                                        </Text>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                {/* Rationale Info Box */}
                                <View style={styles.infoBox}>
                                    <Text style={styles.infoTitle}>{isRTL ? 'لماذا نهتم بالوقت؟' : 'Why timing matters?'}</Text>
                                    <Text style={styles.infoText}>
                                        {isRTL
                                            ? 'تختلف وظائف بشرتك بين النهار والليل؛ ففي النهار تركز البشرة على الحماية والدفاع ضد الأشعة والملوثات (لذا نستخدم مضادات الأكسدة مثل فيتامين سي). أما في الليل، فتنشط عمليات الإصلاح الخلوي والتجديد (لذا يفضل استخدام المقشرات والريتينول في الليل لتجنب حساسية الشمس ومزامنة عملية الإصلاح).'
                                            : 'Your skin functions shift between day and night. Morning is for defense against UV and pollution (ideal for Vitamin C/antioxidants). Evening is for cellular repair and renewal (ideal for exfoliants and retinol to prevent sun damage and synchronize with growth hormones).'}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* ==================== TAB 2: CHEMICAL SYNERGY ==================== */}
                        {activeTab === 'synergy' && (
                            <View style={{ gap: 20 }}>
                                {/* Synergy Card Hero */}
                                <View style={[styles.detailsHeroCard, { borderColor: synergyColor + '33' }]}>
                                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.heroTitle}>{isRTL ? 'مؤشر التفاعل الكيميائي' : 'Synergy Graph Index'}</Text>
                                            <Text style={styles.heroSubtitle}>{isRTL ? 'التفاعل التراكمي بين كل المنتجات' : 'Cumulative routine pharmacodynamics'}</Text>
                                        </View>
                                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: synergyColor + '1a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: synergyColor }}>
                                            <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 18, color: synergyColor }}>
                                                {netSynergy >= 0 ? `+${netSynergy}` : netSynergy}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Negative Conflicts */}
                                <View style={styles.section}>
                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <MaterialCommunityIcons name="close-circle-outline" size={16} color={C.danger} />
                                        <Text style={[styles.sectionTitle, { color: C.danger, marginBottom: 0 }]}>
                                            {isRTL ? 'تعارضات وتقاطعات غير منصوح بها' : 'Negative Interferences'}
                                        </Text>
                                    </View>
                                    {synergy?.negative && synergy.negative.length > 0 ? (
                                        synergy.negative.map((edge, idx) => (
                                            <View key={idx} style={[styles.synergyEdgeCard, { borderColor: C.danger + '33', backgroundColor: C.danger + '0d' }]}>
                                                <View style={styles.synergyEdgeHeader}>
                                                    <View style={styles.synergyPairContainer}>
                                                        <Text style={[styles.synergyPairName, { color: C.textPrimary, textAlign: isRTL ? 'right' : 'left', flex: 1 }]}>
                                                            {edge.pair.map(ing => translateIngredient(ing, language)).join(' + ')}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.ciBadge, { backgroundColor: C.danger + '20' }]}>
                                                        <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 10, color: C.danger }}>{edge.displayCI}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.synergyDesc}>{edge.whyAr}</Text>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.emptyText}>{isRTL ? 'لا توجد تعارضات كيميائية في روتينك الحالي!' : 'No chemical conflicts detected!'}</Text>
                                    )}
                                </View>

                                {/* Positive Synergies */}
                                <View style={styles.section}>
                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <MaterialCommunityIcons name="check-decagram-outline" size={16} color={C.success} />
                                        <Text style={[styles.sectionTitle, { color: C.success, marginBottom: 0 }]}>
                                            {isRTL ? 'تفاعلات داعمة ومضاعفة للفعالية' : 'Synergistic Boosters'}
                                        </Text>
                                    </View>
                                    {synergy?.positive && synergy.positive.length > 0 ? (
                                        synergy.positive.map((edge, idx) => (
                                            <View key={idx} style={[styles.synergyEdgeCard, { borderColor: C.success + '33', backgroundColor: C.success + '0d' }]}>
                                                <View style={styles.synergyEdgeHeader}>
                                                    <View style={styles.synergyPairContainer}>
                                                        <Text style={[styles.synergyPairName, { color: C.textPrimary, textAlign: isRTL ? 'right' : 'left', flex: 1 }]}>
                                                            {edge.pair.map(ing => translateIngredient(ing, language)).join(' + ')}
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.ciBadge, { backgroundColor: C.success + '20' }]}>
                                                        <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 10, color: C.success }}>{edge.displayCI}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.synergyDesc}>{edge.whyAr}</Text>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={styles.emptyText}>{isRTL ? 'لم نكتشف أي ثنائيات انسجام كيميائي إيجابي.' : 'No active chemical synergy pairs detected.'}</Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Close Button */}
                        <TouchableOpacity
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleClose(); }}
                            style={styles.closeButton}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.closeButtonText}>{isRTL ? 'إغلاق التقرير' : 'Close Details'}</Text>
                        </TouchableOpacity>

                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (C, isRTL) => StyleSheet.create({
    // Main Card Styles
    card: { marginBottom: 15, padding: 0, overflow: 'hidden' },
    cardPadding: { padding: 20 },
    cardHeader: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    titleRow: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, alignItems: 'center' },
    cardTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    gridContainer: { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 15, width: '100%', marginBottom: 12 },
    gridCol: { flex: 1, gap: 10 },
    verticalDivider: { width: 1, height: '100%', opacity: 0.15 },
    metricHeader: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', opacity: 0.8 },
    metricTitle: { fontFamily: 'Tajawal-Bold', fontSize: 11 },
    metricRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', flex: 1 },
    metricStatus: { fontFamily: 'Tajawal-Bold', fontSize: 12, marginBottom: 2, textAlign: isRTL ? 'right' : 'left' },
    metricDesc: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: C.textSecondary, textAlign: isRTL ? 'right' : 'left', lineHeight: 14 },
    footer: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, opacity: 0.8 },

    // Modal Sheet Styles
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: C.card, height: height * 0.82, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
    dragHandleContainer: { alignItems: 'center', paddingVertical: 12, width: '100%' },
    dragHandle: { width: 45, height: 4, backgroundColor: C.border, borderRadius: 10 },
    tabsRow: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        backgroundColor: C.inputBg || 'rgba(0,0,0,0.2)',
        marginHorizontal: 20,
        marginVertical: 15,
        borderRadius: 16,
        padding: 5,
        borderWidth: 1,
        borderColor: C.border + '20'
    },
    tabButton: {
        flex: 1,
        flexDirection: isRTL ? 'row-reverse' : 'row',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        gap: 8
    },
    tabActiveButton: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 3
    },
    tabText: { fontFamily: 'Tajawal-Bold', fontSize: 13.5 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

    // Details Hero Card
    detailsHeroCard: { backgroundColor: C.background, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border + '33', alignItems: 'center' },
    heroTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: C.textPrimary, marginBottom: 2, textAlign: 'right' },
    heroSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: C.textSecondary, textAlign: 'right' },

    // Sections
    section: { gap: 12 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.textPrimary, textAlign: isRTL ? 'right' : 'left' },
    explanationsContainer: { backgroundColor: C.background, padding: 16, borderRadius: 18, gap: 10 },
    explanationBulletRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8 },
    explanationText: { fontFamily: 'Tajawal-Regular', fontSize: 15, lineHeight: 24, textAlign: 'right', flex: 1 },

    // Alert details
    alertDetailBox: { borderWidth: 1, padding: 14, borderRadius: 16, gap: 4 },
    alertDetailText: { fontFamily: 'Tajawal-Regular', fontSize: 14, textAlign: isRTL ? 'right' : 'left', lineHeight: 22 },

    // Synergy Graph specific
    synergyEdgeCard: { borderLeftWidth: 3, borderWidth: 1, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: 'transparent', padding: 14, borderRadius: 16, gap: 6 },
    synergyEdgeHeader: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
    synergyPairContainer: { flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap' },
    synergyPairName: { fontFamily: 'Tajawal-Bold', fontSize: 13 },
    ciBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    synergyDesc: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: C.textSecondary, textAlign: isRTL ? 'right' : 'left', lineHeight: 20 },
    emptyText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: C.textDim, textAlign: 'center', marginVertical: 15 },

    // Info Boxes
    infoBox: { backgroundColor: C.background, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: C.border + '20', gap: 6 },
    infoTitle: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: C.textPrimary, textAlign: isRTL ? 'right' : 'left' },
    infoText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: C.textSecondary, lineHeight: 20, textAlign: isRTL ? 'right' : 'left' },

    // Action button
    closeButton: { backgroundColor: C.textPrimary, paddingVertical: 16, borderRadius: 18, alignItems: 'center', marginTop: 25 },
    closeButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.card }
});
