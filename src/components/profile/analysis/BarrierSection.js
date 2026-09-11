// src/components/profile/analysis/BarrierSection.js
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, Animated, Dimensions, Easing } from 'react-native';
import { FontAwesome5, MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../../context/ThemeContext';
import { t, interpolate } from '../../../i18n';
import { useCurrentLanguage } from '../../../hooks/useCurrentLanguage';
import { useRTL } from '../../../hooks/useRTL';
import { LockedComponentOverlay } from './AnalysisShared';

const { height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- 1. CIRCULAR BARRIER SCORE GAUGE ---
const BarrierScoreRing = ({ score, color, size = 74, strokeWidth = 6.5 }) => {
    const { colors: COLORS } = useTheme();
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const animatedVal = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedVal, {
            toValue: score,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false
        }).start();
    }, [score]);

    const strokeDashoffset = animatedVal.interpolate({
        inputRange: [0, 100],
        outputRange: [circumference, 0]
    });

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg 
                width={size} 
                height={size} 
                viewBox={`0 0 ${size} ${size}`}
                style={{ transform: [{ rotate: '-90deg' }] }}
            >
                {/* Background Track */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color + '22'}
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {/* Animated Progress Stroke */}
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </Svg>

            {/* Centered Number Overlay */}
            <View 
                pointerEvents="none" 
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
                    <Text 
                        style={{ 
                            fontFamily: 'Tajawal-ExtraBold', 
                            fontSize: 18, 
                            color: COLORS.textPrimary,
                            includeFontPadding: false,
                            textAlign: 'center',
                        }}
                    >
                        {Math.round(score)}
                    </Text>
                    <Text 
                        style={{ 
                            fontFamily: 'Tajawal-Bold', 
                            fontSize: 10, 
                            color: color, 
                            marginLeft: 1,
                            includeFontPadding: false,
                        }}
                    >
                        %
                    </Text>
                </View>
            </View>
        </View>
    );
};

// --- 2. TUG OF WAR (Builders Left, Stressors Right) ---
const TugOfWarBar = ({ stress, repair }) => {
    const { colors: COLORS } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const stressFlex = Math.max(stress, 0.5);
    const repairFlex = Math.max(repair, 0.5);

    return (
        <View style={styles.tugContainer}>
            <View style={styles.tugLabels}>
                <View style={styles.tugLabelItem}>
                    <Text style={[styles.tugValue, { color: COLORS.success }]}>{repair.toFixed(1)}</Text>
                    <Text style={styles.tugTitle}>{t('barrier_building', language)}</Text>
                </View>

                <View style={styles.vsBadge}>
                    <Text style={styles.vsText}>VS</Text>
                </View>

                <View style={styles.tugLabelItem}>
                    <Text style={[styles.tugValue, { color: COLORS.danger }]}>{stress.toFixed(1)}</Text>
                    <Text style={styles.tugTitle}>{t('barrier_stress', language)}</Text>
                </View>
            </View>

            <View style={[styles.tugTrack, { flexDirection: 'row' }]}>
                <View style={[styles.tugSegment, { flex: repairFlex, backgroundColor: COLORS.success, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }]}>
                    <View style={[styles.slashPattern, { opacity: 0.1 }]} />
                </View>

                <View style={styles.tugSplitter} />

                <View style={[styles.tugSegment, { flex: stressFlex, backgroundColor: COLORS.danger, borderTopRightRadius: 8, borderBottomRightRadius: 8 }]}>
                    <View style={styles.slashPattern} />
                </View>
            </View>
        </View>
    );
};

// --- 3. PRODUCT ROW ---
const ClinicalProductRow = ({ name, ingredients, type }) => {
    const { colors: COLORS } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const isOffender = type === 'offender';
    const indicatorColor = isOffender ? COLORS.danger : COLORS.success;
    return (
        <View style={styles.rowContainer}>
            <View style={[styles.indicatorLine, { backgroundColor: indicatorColor }]} />
            <View style={{ flex: 1, paddingVertical: 8 }}>
                <Text style={styles.productName} numberOfLines={1}>{name}</Text>
                {ingredients && ingredients.length > 0 ? (
                    <Text style={styles.rationaleText}>
                        <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary }}>{t('barrier_reason', language)}: </Text>
                        {ingredients.join(isRTL ? ' ، ' : ', ')}
                    </Text>
                ) : (
                    <Text style={styles.rationaleText}>{t('barrier_generic_formula', language)}</Text>
                )}
            </View>
        </View>
    );
};

// --- 4. MAIN MODAL ---
export const BarrierDetailsModal = ({ visible, onClose, data }) => {
    const { colors: COLORS } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const slideAnim = useRef(new Animated.Value(height)).current;

    useEffect(() => {
        if (visible) Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }).start();
    }, [visible]);

    const handleClose = () => {
        Animated.timing(slideAnim, { toValue: height, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(() => onClose());
    };

    if (!visible || !data) return null;

    const load = data.stressScore !== undefined ? data.stressScore : (data.stats?.load || 0);
    const repair = data.repairScore !== undefined ? data.repairScore : (data.stats?.repair || 0);

    let offenders = [];
    let defenders = [];

    if (data.stressors) {
        const groupByProduct = (items) => {
            const map = {};
            items.forEach(item => {
                if (!map[item.product]) map[item.product] = [];
                map[item.product].push(item.name);
            });
            return Object.entries(map).map(([name, ingredients]) => ({ name, actives: ingredients, builders: ingredients }));
        };
        offenders = groupByProduct(data.stressors);
        defenders = groupByProduct(data.repairers);
    } else {
        offenders = data.clinicalReport?.offenders || [];
        defenders = data.clinicalReport?.defenders || [];
    }

    const contraindications = data.contraindications || [];

    return (
        <Modal transparent visible={visible} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <View style={styles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.header}>
                        <View style={styles.dragHandle} />
                        <View style={{ alignItems: 'center' }}>
                            <View style={[styles.iconBadge, { backgroundColor: data.color + '20' }]}>
                                <FontAwesome5 name="shield-alt" size={24} color={data.color} />
                            </View>
                            <Text style={styles.headerTitle}>{isRTL ? 'حالة حاجز البشرة' : 'Barrier Health'}</Text>
                            <Text style={[styles.headerSubtitle, { color: data.color, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }]}>
                                {data.statusLabel || data.desc || data.status}
                            </Text>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        {/* 1. Friendly Explanation */}
                        <View style={styles.friendlyBox}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <FontAwesome5 name="info-circle" size={16} color={COLORS.accentGreen} />
                                <Text style={styles.friendlyTitle}>{isRTL ? 'ماذا يعني هذا؟' : 'What does this mean?'}</Text>
                            </View>
                            <Text style={styles.friendlyText}>
                                {isRTL 
                                    ? 'نحن نقوم بحساب توازن روتينك بين الإجهاد (المقشرات والمنظفات) وبين الترميم (المرطبات والزيوت). إذا كان الإجهاد عالياً، ستفقد بشرتك الماء وتصاب بالجفاف.' 
                                    : 'We calculate the balance between stress (exfoliants) and repair (moisturizers). If stress is too high, your skin will lose water and dry out.'}
                            </Text>
                        </View>

                        {/* 2. Clinical Metrics */}
                        {data.predictedTEWL !== undefined && (
                            <View style={styles.clinicalMetricsRow}>
                                <View style={styles.metricBox}>
                                    <Text style={styles.metricBoxTitle}>
                                        {isRTL ? 'معدل جفاف البشرة' : 'Moisture Loss'}
                                    </Text>
                                    <Text style={styles.metricBoxSub}>
                                        {isRTL ? '(سرعة تبخر الماء)' : '(Evaporation speed)'}
                                    </Text>
                                    <Text style={styles.metricBoxValue}>
                                        {data.predictedTEWL} <Text style={styles.metricBoxUnit}>{data.unit}</Text>
                                    </Text>
                                </View>
                                <View style={styles.metricBox}>
                                    <Text style={styles.metricBoxTitle}>
                                        {isRTL ? 'وقت التعافي' : 'Recovery Time'}
                                    </Text>
                                    <Text style={styles.metricBoxSub}>
                                        {isRTL ? '(لإعادة بناء الحاجز)' : '(To rebuild barrier)'}
                                    </Text>
                                    <Text style={styles.metricBoxValue}>
                                        ~{data.recoveryTimeHours} <Text style={styles.metricBoxUnit}>{isRTL ? 'ساعة' : 'hrs'}</Text>
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* 3. Tug of War */}
                        <View style={styles.chartSection}>
                            <TugOfWarBar stress={load} repair={repair} />
                        </View>

                        {/* 4. Contraindications */}
                        {contraindications.length > 0 && (
                            <View style={styles.alertBox}>
                                <View style={styles.alertHeader}>
                                    <MaterialIcons name="not-interested" size={20} color={COLORS.danger} />
                                    <Text style={styles.alertTitle}>{t('barrier_medical_contraindications', language)}</Text>
                                </View>
                                {contraindications.map((c, i) => (
                                    <Text key={i} style={styles.alertText}>• {c.name}: {c.contraindication}</Text>
                                ))}
                            </View>
                        )}

                        {/* 5. Product Lists */}
                        <View style={styles.columnsContainer}>
                            <View style={styles.column}>
                                <View style={styles.colHeader}>
                                    <Text style={[styles.colTitle, { color: COLORS.danger }]}>{t('barrier_stressors', language)}</Text>
                                    <View style={[styles.countBadge, { backgroundColor: COLORS.danger + '20' }]}><Text style={{ color: COLORS.danger, fontSize: 12, fontFamily: 'Tajawal-Bold' }}>{offenders.length}</Text></View>
                                </View>
                                <View style={[styles.divider, { backgroundColor: COLORS.danger }]} />
                                {offenders.length > 0 ? offenders.map((p, i) => (
                                    <ClinicalProductRow key={i} name={p.name} ingredients={p.actives} type="offender" />
                                )) : <Text style={styles.emptyText}>--</Text>}
                            </View>

                            <View style={{ width: 15, ...(isRTL ? { borderRightWidth: 1 } : { borderLeftWidth: 1 }), borderColor: COLORS.border, opacity: 0.3 }} />

                            <View style={styles.column}>
                                <View style={styles.colHeader}>
                                    <Text style={[styles.colTitle, { color: COLORS.success }]}>{t('barrier_builders', language)}</Text>
                                    <View style={[styles.countBadge, { backgroundColor: COLORS.success + '20' }]}><Text style={{ color: COLORS.success, fontSize: 12, fontFamily: 'Tajawal-Bold' }}>{defenders.length}</Text></View>
                                </View>
                                <View style={[styles.divider, { backgroundColor: COLORS.success }]} />
                                {defenders.length > 0 ? defenders.map((p, i) => (
                                    <ClinicalProductRow key={i} name={p.name} ingredients={p.builders} type="defender" />
                                )) : <Text style={styles.emptyText}>--</Text>}
                            </View>
                        </View>

                        <Pressable onPress={handleClose} style={styles.dismissBtn}>
                            <Text style={styles.dismissText}>{t('barrier_close_report', language)}</Text>
                        </Pressable>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

// --- 5. LOCK OVERLAY ---
const LockedBarrierOverlay = ({ router }) => {
    const { isRTL } = useRTL();
    return (
        <LockedComponentOverlay
            title={isRTL ? 'أضيفي منتجاتك' : 'Add Your Products'}
            subtitle={isRTL ? 'لفتح تحليل الحاجز الجلدي' : 'to unlock Barrier Health Analysis'}
            onPress={() => router?.push('/CatalogScreen')}
            borderRadius={24}
        />
    );
};

// --- 6. MAIN CARD ---
export const BarrierCard = ({ barrier, onPress, isLocked = false, router }) => {
    const { colors: COLORS } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);

    const displayBarrier = isLocked
        ? {
            score: 72,
            status: isRTL ? 'تحت الضغط' : 'Under Stress',
            desc: isRTL ? 'الحاجز تحت ضغط – ارفعي الترطيب والإصلاح' : 'Barrier under pressure – boost repair',
            color: COLORS.warning,
            stressScore: 17.8,
            repairScore: 18.8,
            contraindications: [],
        }
        : (barrier || {
            score: 0, status: '...', color: COLORS.textSecondary, desc: '',
            totalIrritation: 0, totalSoothing: 0, offenders: [], defenders: []
          });

    const chemicalLoadText = (displayBarrier.stressScore ?? displayBarrier.stats?.load ?? 0) > 0
        ? interpolate(t('barrier_chemical_load', language), {
            load: (displayBarrier.stressScore ?? displayBarrier.stats?.load ?? 0).toFixed(1),
            repair: (displayBarrier.repairScore ?? displayBarrier.stats?.repair ?? 0).toFixed(1)
          })
        : t('barrier_no_chemical_stress', language);

    return (
        <View style={{ position: 'relative' }}>
            <View style={isLocked ? { opacity: 0.35 } : undefined}>
                <Pressable onPress={isLocked ? undefined : onPress} disabled={isLocked}>
                    <View style={styles.barrierCard}>
                        
                        {/* 1. Header Row */}
                        <View style={styles.cardHeader}>
                            <View style={styles.titleRow}>
                                <View style={styles.headerIconBox}>
                                    <FontAwesome5 name="shield-alt" size={13} color={COLORS.accentGreen} />
                                </View>
                                <Text style={styles.cardTitle}>{t('barrier_skin_health', language)}</Text>
                            </View>

                            <View style={styles.medicalBadge}>
                                <MaterialCommunityIcons name="clipboard-pulse-outline" size={14} color={COLORS.textSecondary} />
                                <Text style={styles.medicalBadgeText}>{t('barrier_medical_analysis', language)}</Text>
                            </View>
                        </View>

                        {/* 2. Main Dual-Column Content Row */}
                        <View style={styles.heroRow}>
                            <View style={styles.heroTextContainer}>
                                <View style={styles.statusPillRow}>
                                    <View style={[styles.statusDot, { backgroundColor: displayBarrier.color }]} />
                                    <Text style={[styles.metricStatus, { color: displayBarrier.color }]}>
                                        {displayBarrier.status}
                                    </Text>
                                </View>
                                <Text style={styles.metricDesc} numberOfLines={2}>
                                    {displayBarrier.desc}
                                </Text>

                                <View style={styles.loadChip}>
                                    <Feather name="activity" size={12} color={COLORS.textDim} />
                                    <Text style={styles.loadChipText}>{chemicalLoadText}</Text>
                                </View>
                            </View>

                            <View style={styles.gaugeContainer}>
                                <BarrierScoreRing score={displayBarrier.score} color={displayBarrier.color} />
                            </View>
                        </View>

                        {/* 3. Footer Action Hint */}
                        <View style={styles.footerRow}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
                                <Text style={styles.viewDetailsText}>{isRTL ? 'عرض التقرير الكامل' : 'View Full Report'}</Text>
                                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={14} color={COLORS.accentGreen} />
                            </View>

                            {displayBarrier.contraindications && displayBarrier.contraindications.length > 0 && (
                                <View style={styles.alertBadge}>
                                    <MaterialIcons name="warning" size={13} color={COLORS.danger} />
                                    <Text style={styles.alertBadgeText}>{t('barrier_important_alert', language)}</Text>
                                </View>
                            )}
                        </View>

                    </View>
                </Pressable>
            </View>

            {isLocked && <LockedBarrierOverlay router={router} />}
        </View>
    );
};

// --- STYLES ---
const createStyles = (COLORS, isRTL) => StyleSheet.create({
    barrierCard: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        marginBottom: 16,
        padding: 18,
    },
    cardHeader: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    titleRow: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        gap: 8,
        alignItems: 'center',
    },
    headerIconBox: {
        width: 28,
        height: 28,
        borderRadius: 9,
        backgroundColor: COLORS.accentGreen + '1A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15,
        color: COLORS.textPrimary,
    },
    medicalBadge: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.surfaceSoft || (COLORS.accentGreen + '12'),
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    medicalBadgeText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    heroRow: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
        gap: 12,
    },
    heroTextContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: isRTL ? 'flex-end' : 'flex-start',
    },
    statusPillRow: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    metricStatus: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        textAlign: isRTL ? 'right' : 'left',
    },
    metricDesc: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: isRTL ? 'right' : 'left',
        lineHeight: 18,
        marginBottom: 10,
    },
    loadChip: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: COLORS.surfaceSoft || (COLORS.accentGreen + '12'),
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    loadChipText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        color: COLORS.textDim,
    },
    gaugeContainer: {
        width: 78,
        height: 78,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerRow: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider || COLORS.border,
    },
    viewDetailsText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.accentGreen,
    },
    alertBadge: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.danger + '14',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    alertBadgeText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
        color: COLORS.danger,
    },

    // OVERLAY
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
        zIndex: 10,
        backgroundColor: COLORS.background + 'D9',
    },
    glass: {
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingVertical: 18,
        gap: 6,
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: COLORS.accentGreen + '44',
        backgroundColor: COLORS.accentGreen + '20',
        marginBottom: 6,
    },
    lockTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15,
        textAlign: 'center',
        color: COLORS.textPrimary,
    },
    lockSubtitle: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        color: COLORS.textSecondary,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 6,
        backgroundColor: COLORS.accentGreen,
    },
    ctaText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.textOnAccent,
    },

    // MODAL
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: COLORS.card, height: height * 0.85, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
    dragHandle: { width: 50, height: 5, backgroundColor: COLORS.border, borderRadius: 10, marginBottom: 15 },
    iconBadge: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    headerTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: COLORS.textPrimary, marginBottom: 5 },
    headerSubtitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textPrimary },
    content: { padding: 20, paddingBottom: 50 },

    friendlyBox: { backgroundColor: COLORS.background, padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 0.5, borderColor: COLORS.border },
    friendlyTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 15, color: COLORS.textPrimary },
    friendlyText: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, textAlign: isRTL ? 'right' : 'left', marginTop: 4 },

    chartSection: { marginBottom: 25 },
    tugContainer: { width: '100%' },
    tugLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 },
    tugLabelItem: { alignItems: 'center' },
    tugValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, marginBottom: 2, color: COLORS.textPrimary },
    tugTitle: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textSecondary },
    vsBadge: { backgroundColor: COLORS.background, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.border, marginBottom: 5 },
    vsText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 11, color: COLORS.textDim },

    tugTrack: { height: 18, width: '100%', borderRadius: 9, overflow: 'hidden', backgroundColor: COLORS.background },
    tugSegment: { height: '100%', position: 'relative', overflow: 'hidden' },
    tugSplitter: { width: 4, backgroundColor: COLORS.card, transform: [{ skewX: '-20deg' }], zIndex: 2, marginHorizontal: -2 },
    slashPattern: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)', transform: [{ skewX: '-20deg' }] },

    alertBox: { backgroundColor: COLORS.danger + '14', borderWidth: 0.5, borderColor: COLORS.danger + '33', padding: 16, borderRadius: 14, marginBottom: 20 },
    alertHeader: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    alertTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 15, color: COLORS.danger },
    alertText: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: isRTL ? 'right' : 'left', lineHeight: 20 },

    columnsContainer: { flexDirection: isRTL ? 'row-reverse' : 'row', flex: 1, marginBottom: 10 },
    column: { flex: 1 },
    colHeader: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    colTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 15, textAlign: isRTL ? 'right' : 'left', color: COLORS.textPrimary },
    countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    divider: { height: 3, width: '100%', marginBottom: 12, borderRadius: 2, opacity: 0.4 },

    rowContainer: { flexDirection: isRTL ? 'row-reverse' : 'row', marginBottom: 12, ...(isRTL ? { paddingRight: 8 } : { paddingLeft: 8 }) },
    indicatorLine: { width: 3.5, borderRadius: 2, ...(isRTL ? { marginLeft: 10 } : { marginRight: 10 }), height: '80%', alignSelf: 'center' },
    productName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 14, color: COLORS.textPrimary, marginBottom: 4, textAlign: isRTL ? 'right' : 'left' },
    rationaleText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: isRTL ? 'right' : 'left', lineHeight: 18 },
    emptyText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textDim, textAlign: 'center', fontStyle: 'italic', marginTop: 10 },

    dismissBtn: { marginTop: 20, backgroundColor: COLORS.background, padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 0.5, borderColor: COLORS.border },
    dismissText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary },

    clinicalMetricsRow: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
    metricBox: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, borderColor: COLORS.border, borderWidth: 0.5 },
    metricBoxTitle: { fontFamily: 'Tajawal-Bold', fontSize: 13, marginBottom: 2, color: COLORS.textSecondary },
    metricBoxSub: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textDim, marginBottom: 8 },
    metricBoxValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: COLORS.textPrimary },
    metricBoxUnit: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textDim }
});