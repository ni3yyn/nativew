// src/components/oilguard/VerifiedDetailModal.js
import React, { useState, useRef, useEffect } from 'react';
import { 
    View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, 
    Dimensions, Linking, Animated, Easing, Pressable, Image 
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from './oilguard.styles';

const { height, width } = Dimensions.get('window');

// ==========================================
// SUB-COMPONENT: Marketing Claim Row (Accordion)
// ==========================================
const ClaimRow = ({ result, index, isLast }) => {
    const [expanded, setExpanded] = useState(false);
    const animController = useRef(new Animated.Value(0)).current;
    const [contentHeight, setContentHeight] = useState(0);

    const cleanStatusText = (text) => {
        if (!text) return '';
        return text.replace(/[✅🌿⚖️❌🚫⚠️]/g, '').trim();
    };

    const getStatusConfig = (statusRaw) => {
        const s = statusRaw ? statusRaw.toString() : '';
        if (s.includes('❌') || s.includes('تسويقي') || s.includes('🚫')) {
            return { color: '#FF6B6B', icon: 'times-circle', bg: 'rgba(255, 107, 107, 0.1)' };
        }
        if (s.includes('🌿') || s.includes('✅')) {
            return { color: COLORS.accentGreen, icon: 'check-circle', bg: 'rgba(90, 156, 132, 0.1)' };
        }
        return { color: '#FFB84C', icon: 'exclamation-circle', bg: 'rgba(255, 184, 76, 0.1)' };
    };

    const config = getStatusConfig(result.status);
    const cleanStatus = cleanStatusText(result.status);

    const toggle = () => {
        const targetValue = expanded ? 0 : 1;
        setExpanded(!expanded);
        Animated.timing(animController, { 
            toValue: targetValue, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: false 
        }).start();
    };

    const rotateArrow = animController.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
    const heightInterpolate = animController.interpolate({ 
        inputRange: [0, 1], 
        outputRange: [0, contentHeight || 120], 
        extrapolate: 'clamp' 
    });

    return (
        <View style={[s.claimRowWrapper, !isLast && s.claimRowBorder]}>
            <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={s.claimRowMain}>
                <View style={s.claimIconCol}>
                    <FontAwesome5 name={config.icon} size={16} color={config.color} />
                </View>
                <View style={s.claimTextCol}>
                    <Text style={[s.claimTextTitle, { color: COLORS.textPrimary }]}>{result.claim}</Text>
                    <Text style={[s.claimTextStatus, { color: config.color }]}>{cleanStatus}</Text>
                </View>
                <Animated.View style={{ transform: [{ rotate: rotateArrow }] }}>
                    <FontAwesome5 name="chevron-down" size={12} color={COLORS.textDim} />
                </Animated.View>
            </TouchableOpacity>

            <Animated.View style={{ height: heightInterpolate, overflow: 'hidden' }}>
                <View 
                    style={s.claimDetails}
                    onLayout={(e) => { if (e.nativeEvent.layout.height > 0) setContentHeight(e.nativeEvent.layout.height); }}
                >
                    <Text style={s.claimExplanation}>{result.explanation}</Text>
                    {result.proven?.length > 0 && (
                        <View style={s.chipContainer}>
                            {result.proven.map((ing, i) => (
                                <View key={i} style={s.chip}><Text style={s.chipText}>{typeof ing === 'object' ? ing.name : ing}</Text></View>
                            ))}
                        </View>
                    )}
                </View>
            </Animated.View>
        </View>
    );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export const VerifiedDetailModal = ({ visible, onClose, item }) => {
    if (!item) return null;

    const getScoreColor = (score) => {
        if (score >= 85) return COLORS.success;
        if (score >= 70) return COLORS.info;
        return COLORS.warning;
    };

    // Calculate Marketing Score from results
    const mResults = item.marketing_results || [];
    const validClaims = mResults.filter(r => r.status.includes('✅') || r.status.includes('🌿')).length;
    const marketingScore = mResults.length > 0  ? Math.round((validClaims / mResults.length) * 100) : 100; 
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={s.modalOverlay}>
                <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
                
                <View style={s.sheet}>
                    <View style={s.dragHandle} />

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
                        
                        {/* 1. PRODUCT HEADER */}
                        <View style={s.headerCard}>
                            <View style={s.imageContainer}>
                                {item.image ? (
                                    <Image source={{ uri: item.image }} style={s.productImg} resizeMode="contain" />
                                ) : (
                                    <FontAwesome5 name="box" size={40} color={COLORS.textDim} />
                                )}
                            </View>
                            <View style={s.headerInfo}>
                                <Text style={s.brandText}>{item.brand}</Text>
                                <Text style={s.nameText}>{item.name}</Text>
                                <View style={s.badgeRow}>
                                    <View style={[s.scoreBadge, { backgroundColor: getScoreColor(item.real_score) }]}>
                                        <Text style={s.scoreBadgeText}>{item.real_score}% موثق</Text>
                                    </View>
                                    <View style={s.dbBadge}>
                                        <MaterialIcons name="verified" size={14} color={COLORS.success} />
                                        <Text style={s.dbBadgeText}>Database Match</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* 2. LAB STATS GRID */}
                        <View style={s.statsGrid}>
                            <View style={s.statBox}>
                                <Text style={s.statLabel}>درجة الأمان</Text>
                                <Text style={[s.statVal, { color: COLORS.success }]}>{item.safety}%</Text>
                                <View style={s.miniProgress}><View style={[s.miniFill, { width: `${item.safety}%`, backgroundColor: COLORS.success }]} /></View>
                            </View>
                            <View style={s.statBox}>
                                <Text style={s.statLabel}>فعالية التركيبة</Text>
                                <Text style={[s.statVal, { color: COLORS.info }]}>{item.efficacy}%</Text>
                                <View style={s.miniProgress}><View style={[s.miniFill, { width: `${item.efficacy}%`, backgroundColor: COLORS.info }]} /></View>
                            </View>
                        </View>

                        {/* 3. PERSONAL COMPATIBILITY */}
                        {item.reasons?.length > 0 && (
    <View style={s.sectionCard}>
        <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>ملاحظات شخصية</Text>
            <FontAwesome5 name="user-check" size={14} color={COLORS.accentGreen} />
        </View>
        {item.reasons.map((reason, i) => {
            // 🔥 ADD THIS LINE: extract text if it's an object {type, text}
            const displayReason = typeof reason === 'object' ? reason.text : reason;
            
            return (
                <View key={i} style={s.reasonRow}>
                    <View style={s.dot} />
                    <Text style={s.reasonText}>{displayReason}</Text>
                </View>
            );
        })}
    </View>
)}

                        {/* 4. MARKETING HONESTY */}
                        {mResults.length > 0 && (
        <View style={s.sectionCard}>
            <View style={s.sectionHeader}>
                <View style={s.honestyBadge}>
                    <Text style={[s.honestyScore, { color: getScoreColor(marketingScore) }]}>
                        {marketingScore}%
                    </Text>
                    <Text style={s.honestyLabel}>مصداقية</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.sectionTitle}>تحليل الادعاءات</Text>
                    <Text style={s.sectionSub}>هل وعود الشركة حقيقية؟</Text>
                </View>
            </View>
            {mResults.map((res, i) => (
                <ClaimRow key={i} result={res} index={i} isLast={i === mResults.length - 1} />
            ))}
        </View>
    )}

                        {/* 5. INGREDIENTS LIST */}
                        <View style={s.sectionCard}>
                            <View style={s.sectionHeader}>
                                <Text style={s.sectionTitle}>المكونات الأساسية</Text>
                                <FontAwesome5 name="flask" size={14} color={COLORS.accentGreen} />
                            </View>
                            <View style={s.ingGrid}>
    {item.ingredients?.map((ing, i) => {
        // Safe extraction of the ingredient name
        const ingName = typeof ing === 'object' ? (ing.name || ing.id) : ing;
        return (
            <View key={i} style={s.ingTag}>
                <Text style={s.ingTagText}>{ingName}</Text>
            </View>
        );
    })}
</View>
                        </View>

                        <View style={{ height: 120 }} />
                    </ScrollView>

                    {/* CTA FOOTER */}
                    <View style={s.footer}>
                        <TouchableOpacity style={s.buyBtn} onPress={() => Linking.openURL(item.link)}>
                            <Text style={s.buyBtnText}>البحث عن السعر في الجزائر</Text>
                            <FontAwesome5 name="external-link-alt" size={14} color={COLORS.background} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const s = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    sheet: { 
        backgroundColor: '#111D1A', 
        height: height * 0.85, 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.05)' 
    },
    dragHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center', borderRadius: 2, marginVertical: 15 },
    scrollContent: { paddingHorizontal: 20 },
    
    // Header
    headerCard: { flexDirection: 'row-reverse', gap: 15, marginBottom: 25, alignItems: 'center' },
    imageContainer: { width: 90, height: 90, backgroundColor: '#fff', borderRadius: 20, padding: 10, justifyContent: 'center', alignItems: 'center' },
    productImg: { width: '100%', height: '100%' },
    headerInfo: { flex: 1, alignItems: 'flex-end' },
    brandText: { fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen, fontSize: 13 },
    nameText: { fontFamily: 'Tajawal-ExtraBold', color: '#fff', fontSize: 20, textAlign: 'right' },
    badgeRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 8, alignItems: 'center' },
    scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    scoreBadgeText: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: '#fff' },
    dbBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dbBadgeText: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.textDim },

    // Stats
    statsGrid: { flexDirection: 'row-reverse', gap: 12, marginBottom: 20 },
    statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statLabel: { fontFamily: 'Tajawal-Bold', color: COLORS.textDim, fontSize: 10, marginBottom: 5 },
    statVal: { fontFamily: 'Tajawal-ExtraBold', fontSize: 22, marginBottom: 8 },
    miniProgress: { height: 4, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2 },
    miniFill: { height: '100%', borderRadius: 2 },

    // Sections
    sectionCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', color: '#fff', fontSize: 16 },
    sectionSub: { fontFamily: 'Tajawal-Regular', color: COLORS.textDim, fontSize: 11 },
    
    // Match Reasons
    reasonRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 8 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accentGreen },
    reasonText: { fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 14, textAlign: 'right', flex: 1 },

    // Honesty
    honestyBadge: { alignItems: 'center', padding: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minWidth: 60 },
    honestyScore: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16 },
    honestyLabel: { fontFamily: 'Tajawal-Bold', fontSize: 8, color: COLORS.textDim },

    // Claim Row
    claimRowWrapper: { width: '100%' },
    claimRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    claimRowMain: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 12 },
    claimIconCol: { width: 30, alignItems: 'center' },
    claimTextCol: { flex: 1, paddingHorizontal: 10 },
    claimTextTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, textAlign: 'right' },
    claimTextStatus: { fontFamily: 'Tajawal-Bold', fontSize: 11, textAlign: 'right' },
    claimDetails: { paddingBottom: 15, paddingTop: 5, paddingHorizontal: 10 },
    claimExplanation: { fontFamily: 'Tajawal-Regular', color: COLORS.textDim, fontSize: 13, textAlign: 'right', lineHeight: 20, marginBottom: 10 },
    chipContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
    chip: { backgroundColor: 'rgba(90, 156, 132, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    chipText: { fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen, fontSize: 10 },

    // Ingredients
    ingGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    ingTag: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    ingTagText: { fontFamily: 'Tajawal-Regular', color: COLORS.textDim, fontSize: 11 },

    // Footer
    footer: { position: 'absolute', bottom: 0, width: '100%', padding: 25, backgroundColor: '#111D1A', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    buyBtn: { backgroundColor: COLORS.accentGreen, height: 55, borderRadius: 16, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 12 },
    buyBtnText: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.background, fontSize: 15 }
});