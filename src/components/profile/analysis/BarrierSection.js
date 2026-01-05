// src/components/profile/analysis/BarrierSection.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, Animated, Dimensions, Easing } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, ContentCard, PressableScale } from './AnalysisShared';

const { height } = Dimensions.get('window');

const LiquidProgressBar = ({ score, max = 10, color }) => {
    const widthAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(widthAnim, {
            toValue: Math.min((score / max) * 100, 100),
            duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false 
        }).start();
    }, [score]);

    return (
        <View style={styles.barrierTrack}>
            <Animated.View style={[styles.barrierFill, { 
                width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }), 
                backgroundColor: color, shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 3
            }]} />
        </View>
    );
};

export const BarrierDetailsModal = ({ visible, onClose, data }) => {
    const animController = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) Animated.spring(animController, { toValue: 1, damping: 15, stiffness: 100, useNativeDriver: true }).start();
    }, [visible]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, useNativeDriver: true }).start(({ finished }) => { if (finished) onClose(); });
    };

    if (!visible || !data) return null;

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    const irritation = data.totalIrritation || 0;
    const soothing = data.totalSoothing || 0;
    const totalVolume = (irritation + soothing) || 1;
    const irritationPct = (irritation / totalVolume) * 100;
    const soothingPct = (soothing / totalVolume) * 100;

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle}/></View>

                    <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                        <View style={{ alignItems: 'center', marginBottom: 25 }}>
                            <View style={[styles.barrierScoreBadge, { backgroundColor: (data.color || COLORS.success) + '20', borderColor: data.color || COLORS.success }]}>
                                <FontAwesome5 name="shield-alt" size={24} color={data.color || COLORS.success} />
                            </View>
                            <Text style={[styles.modalTitle, { marginTop: 15 }]}>تقرير الحاجز الجلدي</Text>
                            <Text style={[styles.modalDescription, { textAlign: 'center', color: data.color, fontFamily: 'Tajawal-Bold' }]}>{data.status} ({data.score}%)</Text>
                        </View>

                        <View style={styles.educationBox}>
                            <View style={{flexDirection: 'row-reverse', gap: 10, marginBottom: 8}}>
                                <FontAwesome5 name="book-open" size={14} color={COLORS.textPrimary} />
                                <Text style={styles.educationTitle}>كيف يعمل الحاجز؟</Text>
                            </View>
                            <Text style={styles.educationText}>
                                تخيلي بشرتك كجدار من الطوب (الخلايا) والإسمنت (الدهون). 
                                {"\n"}• <Text style={{color: COLORS.danger, fontFamily: 'Tajawal-Bold'}}>المواد الفعالة</Text> تزيل طبقة من الجدار.
                                {"\n"}• <Text style={{color: COLORS.success, fontFamily: 'Tajawal-Bold'}}>المرممات</Text> تعيد بناء الإسمنت.
                            </Text>
                        </View>

                        <View style={styles.ingSection}>
                            <Text style={styles.ingSectionTitle}>ميزان الروتين اليومي</Text>
                            <View style={styles.balanceBarTrack}>
                                <View style={[styles.balanceBarSegment, { width: `${soothingPct}%`, backgroundColor: COLORS.success, borderTopRightRadius: 10, borderBottomRightRadius: 10 }]} />
                                <View style={[styles.balanceBarSegment, { width: `${irritationPct}%`, backgroundColor: COLORS.danger, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }]} />
                            </View>
                            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8 }}>
                                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.success }}>{soothing.toFixed(1)} نقاط بناء 🛡️</Text>
                                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.danger }}>{irritation.toFixed(1)} نقاط إجهاد ⚡</Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row-reverse', gap: 15 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.colHeader, { color: COLORS.danger }]}>المجهدات</Text>
                                {(data.offenders || []).length > 0 ? (
                                    data.offenders.map((p, i) => (
                                        <View key={i} style={styles.miniProductRow}>
                                            <View style={{flex: 1}}>
                                                <Text style={styles.miniProductText} numberOfLines={1}>{p.name}</Text>
                                                <Text style={styles.miniProductIngs}>{p.ingredients.join(' + ')}</Text>
                                            </View>
                                            <Text style={[styles.miniProductScore, { color: COLORS.danger }]}>-{p.score.toFixed(1)}</Text>
                                        </View>
                                    ))
                                ) : <Text style={styles.noDataText}>لا يوجد</Text>}
                            </View>
                            <View style={{ width: 1, backgroundColor: COLORS.border }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.colHeader, { color: COLORS.success }]}>البناة</Text>
                                {(data.defenders || []).length > 0 ? (
                                    data.defenders.map((p, i) => (
                                        <View key={i} style={styles.miniProductRow}>
                                            <View style={{flex: 1}}>
                                                <Text style={styles.miniProductText} numberOfLines={1}>{p.name}</Text>
                                                <Text style={styles.miniProductIngs}>{p.ingredients.join(' + ')}</Text>
                                            </View>
                                            <Text style={[styles.miniProductScore, { color: COLORS.success }]}>+{p.score.toFixed(1)}</Text>
                                        </View>
                                    ))
                                ) : <Text style={styles.noDataText}>لا يوجد</Text>}
                            </View>
                        </View>

                        <Pressable onPress={handleClose} style={[styles.closeButton, { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginTop: 30 }]}>
                            <Text style={[styles.closeButtonText, { color: COLORS.textPrimary }]}>فهمت</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

export const BarrierCard = ({ barrier, onPress }) => (
    <PressableScale onPress={onPress}>
        <ContentCard style={{ marginBottom: 15, padding: 0, overflow: 'hidden' }} animated={false}>
            <View style={{ padding: 20, paddingBottom: 10 }}>
                <View style={styles.analysisCardHeader}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                        <FontAwesome5 name="shield-alt" size={16} color={barrier.color} />
                        <Text style={[styles.analysisCardTitle, { color: barrier.color }]}>صحة الحاجز (Barrier Integrity)</Text>
                    </View>
                    <View style={{ backgroundColor: barrier.color + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 10, color: barrier.color }}>اضغط للتفاصيل</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
                    <Text style={[styles.statValue, {color: barrier.color, fontSize: 36}]}>{barrier.score}%</Text>
                    <View style={{ flex: 1, paddingBottom: 6 }}>
                        <Text style={{ fontFamily: 'Tajawal-Bold', color: barrier.color, textAlign: 'left', fontSize: 16 }}>{barrier.status}</Text>
                    </View>
                </View>
                <LiquidProgressBar score={barrier.score} max={100} color={barrier.color} />
                <Text style={styles.barrierDesc} numberOfLines={2}>{barrier.desc}</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textSecondary }}>
                        {(barrier.totalIrritation || 0) > 0 ? `حمل كيميائي: ${(barrier.totalIrritation || 0).toFixed(1)}` : 'لا يوجد إجهاد كيميائي'}
                    </Text>
                    <FontAwesome5 name="chevron-left" size={12} color={COLORS.textDim} />
            </View>
        </ContentCard>
    </PressableScale>
);

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 99 },
    sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.85, zIndex: 100, justifyContent: 'flex-end' },
    sheetContent: { flex: 1, backgroundColor: COLORS.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 25 },
    sheetHandleBar: { alignItems: 'center', paddingVertical: 15, width: '100%', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
    sheetHandle: { width: 48, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
    barrierScoreBadge: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    modalTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 15 },
    modalDescription: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 24, marginBottom: 20 },
    educationBox: { backgroundColor: COLORS.background, padding: 15, borderRadius: 16, marginBottom: 25, borderWidth: 1, borderColor: COLORS.border },
    educationTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textPrimary },
    educationText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary, lineHeight: 22, textAlign: 'right' },
    ingSection: { marginBottom: 30 },
    ingSectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 15, borderRightWidth: 3, borderRightColor: COLORS.accentGreen, paddingRight: 10 },
    balanceBarTrack: { height: 12, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, width: '100%', marginBottom: 5 },
    balanceBarSegment: { height: '100%' },
    colHeader: { fontFamily: 'Tajawal-Bold', fontSize: 13, textAlign: 'right', marginBottom: 10 },
    miniProductRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    miniProductText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, flex: 1, textAlign: 'right', marginLeft: 10 },
    miniProductScore: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    miniProductIngs: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.textDim, textAlign: 'right', marginTop: 2, marginLeft: 10 },
    noDataText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textDim, fontStyle: 'italic', textAlign: 'right', opacity: 0.7 },
    closeButton: { backgroundColor: COLORS.card, paddingVertical: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 20 },
    closeButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary },
    analysisCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 15, opacity: 0.8 },
    analysisCardTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary },
    statValue: { fontFamily: 'Tajawal-Bold', fontSize: 22, color: COLORS.accentGreen },
    barrierTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, width: '100%', marginBottom: 10, overflow: 'hidden' },
    barrierFill: { height: '100%', borderRadius: 4 },
    barrierDesc: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 18 },
});