// src/components/profile/analysis/BarrierSection.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, Animated, Dimensions, Easing } from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { COLORS, ContentCard, PressableScale } from './AnalysisShared';

const { height } = Dimensions.get('window');

// --- 1. LIQUID PROGRESS BAR ---
const ClinicalProgressBar = ({ score, color }) => {
    const widthAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(widthAnim, {
            toValue: score,
            duration: 1500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: false
        }).start();
    }, [score]);

    return (
        <View style={styles.barContainer}>
            <View style={styles.track} />
            <Animated.View style={[styles.fill, { 
                width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), 
                backgroundColor: color,
                shadowColor: color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4
            }]}>
                <View style={styles.glare} />
            </Animated.View>
        </View>
    );
};

// --- 2. TUG OF WAR (Builders Left, Stressors Right) ---
const TugOfWarBar = ({ stress, repair }) => {
    const stressFlex = Math.max(stress, 0.5); 
    const repairFlex = Math.max(repair, 0.5);

    return (
        <View style={styles.tugContainer}>
            {/* Labels Row */}
            <View style={styles.tugLabels}>
                {/* Left: Builders */}
                <View style={styles.tugLabelItem}>
                    <Text style={[styles.tugValue, { color: COLORS.success }]}>{repair.toFixed(1)}</Text>
                    <Text style={styles.tugTitle}>ترميم (بناء)</Text>
                </View>

                {/* VS */}
                <View style={styles.vsBadge}>
                    <Text style={styles.vsText}>VS</Text>
                </View>

                {/* Right: Stressors */}
                <View style={styles.tugLabelItem}>
                    <Text style={[styles.tugValue, { color: COLORS.danger }]}>{stress.toFixed(1)}</Text>
                    <Text style={styles.tugTitle}>إجهاد (هدم)</Text>
                </View>
            </View>

            {/* The Bar Track */}
            {/* LTR Layout enforced to guarantee Left=Green, Right=Red */}
            <View style={[styles.tugTrack, { flexDirection: 'row' }]}>
                
                {/* Left: Green Bar */}
                <View style={[styles.tugSegment, { flex: repairFlex, backgroundColor: COLORS.success, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }]}>
                     <View style={[styles.slashPattern, { opacity: 0.1 }]} />
                </View>

                {/* Splitter */}
                <View style={styles.tugSplitter} />

                {/* Right: Red Bar */}
                <View style={[styles.tugSegment, { flex: stressFlex, backgroundColor: COLORS.danger, borderTopRightRadius: 8, borderBottomRightRadius: 8 }]}>
                    <View style={styles.slashPattern} />
                </View>
            </View>
        </View>
    );
};

// --- 3. PRODUCT ROW ---
const ClinicalProductRow = ({ name, ingredients, type }) => {
    const isOffender = type === 'offender';
    const indicatorColor = isOffender ? COLORS.danger : COLORS.success;
    return (
        <View style={styles.rowContainer}>
            <View style={[styles.indicatorLine, { backgroundColor: indicatorColor }]} />
            <View style={{ flex: 1, paddingVertical: 8 }}>
                <Text style={styles.productName} numberOfLines={1}>{name}</Text>
                {ingredients && ingredients.length > 0 ? (
                    <Text style={styles.rationaleText}>
                        <Text style={{fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary}}>السبب: </Text>
                        {ingredients.join(' ، ')}
                    </Text>
                ) : (
                    <Text style={styles.rationaleText}>تركيبة عامة</Text>
                )}
            </View>
        </View>
    );
};

// --- 4. MAIN MODAL ---
export const BarrierDetailsModal = ({ visible, onClose, data }) => {
    const slideAnim = useRef(new Animated.Value(height)).current;

    useEffect(() => {
        if (visible) Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
    }, [visible]);

    const handleClose = () => {
        Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }).start(() => onClose());
    };

    if (!visible || !data) return null;

    const offenders = data.clinicalReport?.offenders || [];
    const defenders = data.clinicalReport?.defenders || [];
    const contraindications = data.contraindications || [];

    const load = data.stats?.load || 0;
    const repair = data.stats?.repair || 0;

    return (
        <Modal transparent visible={visible} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <View style={styles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.dragHandle} />
                        <View style={{alignItems: 'center'}}>
                            <View style={[styles.iconBadge, { backgroundColor: data.color + '20' }]}>
                                <FontAwesome5 name="shield-alt" size={24} color={data.color} />
                            </View>
                            <Text style={styles.headerTitle}>تقرير الحاجز الطبي</Text>
                            <Text style={[styles.headerSubtitle, { color: data.color }]}>{data.status} ({data.score}%)</Text>
                        </View>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        
                        {/* 1. Friendly Explanation (New) */}
                        <View style={styles.friendlyBox}>
                            <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 5}}>
                                <FontAwesome5 name="lightbulb" size={14} color={COLORS.accentGreen} />
                                <Text style={styles.friendlyTitle}>كيف يعمل الميزان؟</Text>
                            </View>
                            <Text style={styles.friendlyText}>
                                نقوم بحساب توازن روتينك بين <Text style={{color: COLORS.danger, fontFamily: 'Tajawal-Bold'}}>الإجهاد</Text> (المقشرات والمواد القوية) وبين <Text style={{color: COLORS.success, fontFamily: 'Tajawal-Bold'}}>الترميم</Text> (المرطبات والزيوت).
                                {"\n"}الهدف هو أن تتفوق كفة الترميم دائما للحفاظ على نضارة البشرة.
                            </Text>
                        </View>

                        {/* 2. Tug of War */}
                        <View style={styles.chartSection}>
                            <TugOfWarBar stress={load} repair={repair} />
                        </View>

                        {/* 3. Contraindications */}
                        {contraindications.length > 0 && (
                            <View style={styles.alertBox}>
                                <View style={styles.alertHeader}>
                                    <MaterialIcons name="not-interested" size={18} color={COLORS.danger} />
                                    <Text style={styles.alertTitle}>موانع استخدام طبية</Text>
                                </View>
                                {contraindications.map((c, i) => (
                                    <Text key={i} style={styles.alertText}>• {c.name}: {c.contraindication}</Text>
                                ))}
                            </View>
                        )}

                        {/* 4. Product Lists */}
                        <View style={styles.columnsContainer}>
                            {/* Stressors */}
                            <View style={styles.column}>
                                <View style={styles.colHeader}>
                                    <Text style={[styles.colTitle, { color: COLORS.danger }]}>المجهدات</Text>
                                    <View style={[styles.countBadge, {backgroundColor: COLORS.danger+'20'}]}><Text style={{color: COLORS.danger, fontSize: 10, fontFamily:'Tajawal-Bold'}}>{offenders.length}</Text></View>
                                </View>
                                <View style={[styles.divider, { backgroundColor: COLORS.danger }]} />
                                
                                {offenders.length > 0 ? offenders.map((p, i) => (
                                    <ClinicalProductRow key={i} name={p.name} ingredients={p.actives} type="offender" />
                                )) : <Text style={styles.emptyText}>--</Text>}
                            </View>

                            <View style={{width: 15, borderRightWidth: 1, borderColor: COLORS.border, opacity: 0.3}} />

                            {/* Builders */}
                            <View style={styles.column}>
                                <View style={styles.colHeader}>
                                    <Text style={[styles.colTitle, { color: COLORS.success }]}>المرممات</Text>
                                    <View style={[styles.countBadge, {backgroundColor: COLORS.success+'20'}]}><Text style={{color: COLORS.success, fontSize: 10, fontFamily:'Tajawal-Bold'}}>{defenders.length}</Text></View>
                                </View>
                                <View style={[styles.divider, { backgroundColor: COLORS.success }]} />

                                {defenders.length > 0 ? defenders.map((p, i) => (
                                    <ClinicalProductRow key={i} name={p.name} ingredients={p.builders} type="defender" />
                                )) : <Text style={styles.emptyText}>--</Text>}
                            </View>
                        </View>

                        <Pressable onPress={handleClose} style={styles.dismissBtn}>
                            <Text style={styles.dismissText}>إغلاق التقرير</Text>
                        </Pressable>

                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

// --- 5. MAIN CARD (Unchanged) ---
export const BarrierCard = ({ barrier, onPress }) => (
    <PressableScale onPress={onPress}>
        <ContentCard style={styles.card} animated={false}>
            <View style={styles.cardPadding}>
                <View style={styles.cardHeader}>
                    <View style={styles.titleRow}>
                        <FontAwesome5 name="shield-alt" size={16} color={barrier.color} />
                        <Text style={[styles.cardTitle, { color: barrier.color }]}>صحة الحاجز الجلدي</Text>
                    </View>
                    <View style={{backgroundColor: barrier.color + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6}}>
                         <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 10, color: barrier.color }}>تحليل طبي</Text>
                    </View>
                </View>

                <View style={styles.metricContainer}>
                    <Text style={[styles.metricScore, { color: barrier.color }]}>{barrier.score}%</Text>
                    <View style={styles.metricTextContainer}>
                        <Text style={[styles.metricStatus, { color: barrier.color }]}>{barrier.status}</Text>
                        <Text style={styles.metricDesc} numberOfLines={1}>{barrier.desc}</Text>
                    </View>
                </View>

                <ClinicalProgressBar score={barrier.score} color={barrier.color} />

                <View style={styles.footer}>
                    <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textSecondary }}>
                        {(barrier.stats?.load || 0) > 0 
                            ? `حمل كيميائي: ${(barrier.stats?.load || 0).toFixed(1)} / ترميم: ${(barrier.stats?.repair || 0).toFixed(1)}` 
                            : 'لا يوجد إجهاد كيميائي'}
                    </Text>
                    {barrier.contraindications && barrier.contraindications.length > 0 && (
                        <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 5}}>
                            <MaterialIcons name="error" size={14} color={COLORS.danger} />
                            <Text style={{fontFamily: 'Tajawal-Bold', fontSize: 10, color: COLORS.danger}}>تنبيه هام</Text>
                        </View>
                    )}
                </View>
            </View>
        </ContentCard>
    </PressableScale>
);

const styles = StyleSheet.create({
    // GENERAL
    card: { marginBottom: 15, padding: 0, overflow: 'hidden' },
    cardPadding: { padding: 20 },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    titleRow: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center' },
    cardTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    metricContainer: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 12, marginBottom: 12 },
    metricScore: { fontFamily: 'Tajawal-ExtraBold', fontSize: 40, lineHeight: 45 },
    metricTextContainer: { flex: 1, paddingBottom: 4 },
    metricStatus: { fontFamily: 'Tajawal-Bold', fontSize: 16, marginBottom: 2, textAlign: 'right' },
    metricDesc: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right' },
    footer: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },

    // PROGRESS BAR
    barContainer: { height: 8, width: '100%', backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden' },
    track: { flex: 1 },
    fill: { height: '100%', borderRadius: 4, overflow: 'hidden' },
    glare: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.3)' },

    // MODAL
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: COLORS.card, height: height * 0.85, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
    dragHandle: { width: 50, height: 5, backgroundColor: COLORS.border, borderRadius: 10, marginBottom: 15 },
    iconBadge: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    headerTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: COLORS.textPrimary, marginBottom: 5 },
    headerSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14 },
    content: { padding: 25, paddingBottom: 50 },
    
    // EXPLANATION BOX
    friendlyBox: { backgroundColor: COLORS.background, padding: 15, borderRadius: 16, marginBottom: 25 },
    friendlyTitle: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textPrimary },
    friendlyText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, lineHeight: 20, textAlign: 'right', marginTop: 5 },

    // TUG OF WAR
    chartSection: { marginBottom: 30 },
    tugContainer: { width: '100%' },
    tugLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }, // Row for LTR (Repair Left, Stress Right)
    tugLabelItem: { alignItems: 'center' },
    tugValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18, marginBottom: 2 },
    tugTitle: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.textSecondary },
    vsBadge: { backgroundColor: COLORS.background, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 5 },
    vsText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 9, color: COLORS.textDim },
    
    tugTrack: { height: 16, width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.background },
    tugSegment: { height: '100%', position: 'relative', overflow: 'hidden' },
    tugSplitter: { width: 4, backgroundColor: COLORS.card, transform: [{ skewX: '-20deg' }], zIndex: 2, marginHorizontal: -2 },
    slashPattern: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)', transform: [{ skewX: '-20deg' }] },

    // LISTS
    alertBox: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', padding: 15, borderRadius: 12, marginBottom: 25 },
    alertHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },
    alertTitle: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.danger },
    alertText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right' },

    columnsContainer: { flexDirection: 'row-reverse', flex: 1 },
    column: { flex: 1 },
    colHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    colTitle: { fontFamily: 'Tajawal-Bold', fontSize: 13, textAlign: 'right' },
    countBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    divider: { height: 3, width: '100%', marginBottom: 15, borderRadius: 2, opacity: 0.3 },
    
    rowContainer: { flexDirection: 'row-reverse', marginBottom: 12, paddingRight: 8 },
    indicatorLine: { width: 3, borderRadius: 1.5, marginLeft: 10, height: '80%', alignSelf: 'center' },
    productName: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textPrimary, marginBottom: 3, textAlign: 'right' },
    rationaleText: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.textDim, textAlign: 'right', lineHeight: 14 },
    emptyText: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textDim, textAlign: 'center', fontStyle: 'italic', marginTop: 10 },

    dismissBtn: { marginTop: 30, backgroundColor: COLORS.card, padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    dismissText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textPrimary }
});