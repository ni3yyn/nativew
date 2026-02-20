// src/components/oilguard/VerifiedDetailModal.js
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet,
    Dimensions, Linking, Animated, Easing, Pressable, Image
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons, MaterialCommunityIcons as CommunityIcons } from '@expo/vector-icons';
import { COLORS as DEFAULT_COLORS } from './oilguard.styles';
import { useTheme } from '../../context/ThemeContext';
import FullImageViewer from '../common/FullImageViewer';

const { height, width } = Dimensions.get('window');

// ==========================================
// SUB-COMPONENT: Marketing Claim Row (Accordion)
// ==========================================
const ClaimRow = ({ result, index, isLast }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const s = useMemo(() => createStyles(COLORS), [COLORS]);

    const [expanded, setExpanded] = useState(false);
    const animController = useRef(new Animated.Value(0)).current;
    const [contentHeight, setContentHeight] = useState(0);

    const cleanStatusText = (text) => {
        if (!text) return '';
        return text.replace(/[✅🌿⚖️❌🚫⚠️]/g, '').trim();
    };

    const getStatusConfig = (statusRaw) => {
        const str = statusRaw ? statusRaw.toString() : '';

        // BLUE: Significant (بنسبة معتبرة)
        if (str.includes('معتبرة')) {
            return { color: '#4D96FF', icon: 'check-double', bg: 'rgba(77, 150, 255, 0.1)', label: 'قوي وفعال', bars: 3 };
        }
        // GREEN: Moderate (بنسبة متوسطة)
        if (str.includes('متوسطة') || str.includes('✅') || str.includes('🌿')) {
            return { color: COLORS.accentGreen, icon: 'check', bg: COLORS.accentGreen + '1A', label: 'فعالية جيدة', bars: 2 };
        }
        // YELLOW: Low (منخفض)
        if (str.includes('منخفض') || str.includes('⚠️')) {
            return { color: '#FFB84C', icon: 'exclamation-circle', bg: 'rgba(255, 184, 76, 0.1)', label: 'تأثير هامشي', bars: 1 };
        }
        // RED: Deception
        if (str.includes('❌') || str.includes('كذب') || str.includes('🚫')) {
            return { color: '#FF6B6B', icon: 'times-circle', bg: 'rgba(255, 107, 107, 0.1)', label: 'غير موجود', bars: 0 };
        }
        return { color: COLORS.textDim, icon: 'info-circle', bg: 'rgba(255, 255, 255, 0.05)', label: 'تحليل جاري', bars: 0 };
    };

    const config = getStatusConfig(result.status);
    const cleanStatus = cleanStatusText(result.status);

    const allIngredients = [...(result.proven || []), ...(result.traditionallyProven || [])];

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
        outputRange: [0, contentHeight || 180],
        extrapolate: 'clamp'
    });

    return (
        <View style={[s.claimRowWrapper, !isLast && s.claimRowBorder]}>
            <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={s.claimRowMain}>
                <View style={s.claimStatusIndicator}>
                    <View style={s.barContainer}>
                        {[1, 2, 3].map(b => (
                            <View key={b} style={[s.statusBar, { backgroundColor: b <= config.bars ? config.color : 'rgba(255,255,255,0.05)' }]} />
                        ))}
                    </View>
                </View>
                <View style={s.claimTextCol}>
                    <Text style={[s.claimTextTitle, { color: COLORS.textPrimary }]}>{result.claim}</Text>
                    <View style={s.statusBadgeRow}>
                        <Text style={[s.claimTextStatus, { color: config.color }]}>{cleanStatus}</Text>
                        <View style={[s.dotSeparator, { backgroundColor: config.color }]} />
                        <Text style={[s.claimMicroLabel, { color: config.color }]}>{config.label}</Text>
                    </View>
                </View>
                <Animated.View style={{ transform: [{ rotate: rotateArrow }] }}>
                    <FontAwesome5 name="chevron-down" size={12} color={COLORS.textDim} />
                </Animated.View>
            </TouchableOpacity>

            <Animated.View style={{ height: heightInterpolate, overflow: 'hidden' }}>
                <View style={s.claimDetails} onLayout={(e) => { if (e.nativeEvent.layout.height > 0) setContentHeight(e.nativeEvent.layout.height); }}>
                    <View style={[s.explanationBox, { borderRightColor: config.color }]}>
                        <Text style={s.claimExplanation}>{result.explanation}</Text>
                    </View>
                    {allIngredients.length > 0 && (
                        <View style={s.ingSection}>
                            <Text style={s.ingSectionTitle}>المكونات المسؤولة:</Text>
                            <View style={s.chipContainer}>
                                {allIngredients.map((ing, i) => {
                                    const isTrace = result.traditionallyProven?.includes(ing);
                                    return (
                                        <View key={i} style={[s.chip, { backgroundColor: config.bg, borderColor: `${config.color}${isTrace ? '20' : '40'}`, borderStyle: isTrace ? 'dashed' : 'solid', borderWidth: 1 }]}>
                                            <Text style={[s.chipText, { color: config.color, opacity: isTrace ? 0.7 : 1 }]}>
                                                {typeof ing === 'object' ? ing.name : ing}{isTrace && ' (أثر)'}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
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
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const s = useMemo(() => createStyles(COLORS), [COLORS]);

    const [isViewerVisible, setIsViewerVisible] = useState(false);

    // Ingredients Collapse Logic
    const [ingExpanded, setIngExpanded] = useState(false);
    const ingAnim = useRef(new Animated.Value(0)).current;
    const [ingContentHeight, setIngContentHeight] = useState(0);

    if (!item) return null;

    const toggleIngredients = () => {
        const target = ingExpanded ? 0 : 1;
        setIngExpanded(!ingExpanded);
        Animated.timing(ingAnim, {
            toValue: target,
            duration: 350,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false
        }).start();
    };

    const rotateIngArrow = ingAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
    const ingHeight = ingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, ingContentHeight || 300],
        extrapolate: 'clamp'
    });

    const getScoreColor = (score) => {
        if (score >= 85) return COLORS.success;
        if (score >= 70) return COLORS.info;
        if (score >= 50) return COLORS.warning;
        return COLORS.danger;
    };

    const mResults = item.marketing_results || [];
    const validClaims = mResults.filter(r => r.status.includes('✅') || r.status.includes('🌿') || r.status.includes('معتبرة')).length;
    const marketingScore = mResults.length > 0 ? Math.round((validClaims / mResults.length) * 100) : 100;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={s.modalOverlay}>
                <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
                <View style={s.sheet}>
                    <View style={s.dragHandle} />

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

                        {/* 1. HERO HEADER */}
                        <View style={s.heroCard}>
                            <TouchableOpacity style={s.imageBox} onPress={() => item.image && setIsViewerVisible(true)} activeOpacity={0.9}>
                                {item.image ? <Image source={{ uri: item.image }} style={s.productImg} resizeMode="contain" />
                                    : <View style={s.placeholderImg}><FontAwesome5 name="box" size={30} color={COLORS.textDim} /></View>}
                                <View style={s.zoomIcon}><Ionicons name="expand" size={14} color="#000" /></View>
                            </TouchableOpacity>
                            <View style={s.heroTextContainer}>
                                <Text style={s.brandTag}>{item.brand}</Text>
                                <Text style={s.productNameLarge}>{item.name}</Text>
                                <View style={s.mainBadgeRow}>
                                    <View style={[s.premiumScoreBadge, { backgroundColor: getScoreColor(item.real_score) }]}>
                                        <Text style={s.premiumScoreText}>{item.real_score}%</Text>
                                    </View>
                                    <View style={s.verifiedIndicator}>
                                        <MaterialIcons name="verified-user" size={14} color={COLORS.success} />
                                        <Text style={s.verifiedIndicatorText}>درجة وثيق</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* 2. SCIENTIFIC STATS GRID */}
                        <View style={s.statsGrid}>
                            <View style={s.statGlassCard}>
                                <View style={s.statIconCircle}><FontAwesome5 name="shield-alt" size={14} color={COLORS.success} /></View>
                                <Text style={s.statLabel}>درجة الأمان</Text>
                                <Text style={[s.statValue, { color: COLORS.success }]}>{item.safety}%</Text>
                                <View style={s.progressBar}><View style={[s.progressFill, { width: `${item.safety}%`, backgroundColor: COLORS.success }]} /></View>
                            </View>
                            <View style={s.statGlassCard}>
                                <View style={s.statIconCircle}><FontAwesome5 name="flask" size={14} color={COLORS.info} /></View>
                                <Text style={s.statLabel}>فعالية التركيبة</Text>
                                <Text style={[s.statValue, { color: COLORS.info }]}>{item.efficacy}%</Text>
                                <View style={s.progressBar}><View style={[s.progressFill, { width: `${item.efficacy}%`, backgroundColor: COLORS.info }]} /></View>
                            </View>
                        </View>

                        {/* 3. PERSONAL COMPATIBILITY (RESTORED & IMPROVED) */}
                        {item.reasons?.length > 0 && (
                            <View style={s.sectionCard}>
                                <View style={s.sectionHeader}>
                                    <Text style={s.sectionTitle}>التوافق الشخصي</Text>
                                    <FontAwesome5 name="user-check" size={14} color={COLORS.accentGreen} />
                                </View>
                                <View style={s.compatibilityList}>
                                    {item.reasons.map((reason, i) => {
                                        const displayReason = typeof reason === 'object' ? reason.text : reason;
                                        return (
                                            <View key={i} style={s.reasonRow}>
                                                <View style={s.reasonIcon}>
                                                    <Ionicons name="checkmark-done" size={16} color={COLORS.accentGreen} />
                                                </View>
                                                <Text style={s.reasonText}>{displayReason}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* 4. MARKETING ANALYSIS */}
                        {mResults.length > 0 && (
                            <View style={s.sectionCard}>
                                <View style={s.marketingHeader}>
                                    <View style={s.honestyCircle}>
                                        <Text style={[s.honestyValue, { color: getScoreColor(marketingScore) }]}>{marketingScore}%</Text>
                                        <Text style={s.honestySub}>صدق</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={s.sectionTitle}>تحليل الادعاءات</Text>
                                        <Text style={s.sectionSubtitle}>مقارنة الوعود بالتركيبة الكيميائية</Text>
                                    </View>
                                </View>
                                <View style={s.claimsList}>
                                    {mResults.map((res, i) => (
                                        <ClaimRow key={i} result={res} index={i} isLast={i === mResults.length - 1} />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* 5. COLLAPSIBLE INGREDIENTS */}
                        <View style={s.sectionCard}>
                            <TouchableOpacity style={s.collapsibleHeader} onPress={toggleIngredients} activeOpacity={0.7}>
                                <Animated.View style={{ transform: [{ rotate: rotateIngArrow }] }}>
                                    <Ionicons name="chevron-down" size={20} color={COLORS.accentGreen} />
                                </Animated.View>
                                <View style={s.ingHeaderInfo}>
                                    <Text style={s.sectionTitle}>قائمة المكونات</Text>
                                    <Text style={s.ingCountLabel}>{item.ingredients?.length || 0} مكون تم تحليله</Text>
                                </View>
                                <View style={[s.statIconCircle, { marginBottom: 0, backgroundColor: COLORS.accentGreen + '1A' }]}>
                                    <FontAwesome5 name="dna" size={14} color={COLORS.accentGreen} />
                                </View>
                            </TouchableOpacity>

                            <Animated.View style={{ height: ingHeight, overflow: 'hidden' }}>
                                <View style={s.ingExpandedContent} onLayout={(e) => { if (e.nativeEvent.layout.height > 0) setIngContentHeight(e.nativeEvent.layout.height); }}>
                                    <View style={s.ingGrid}>
                                        {item.ingredients?.map((ing, i) => {
                                            const ingName = typeof ing === 'object' ? (ing.name || ing.id) : ing;
                                            return (
                                                <View key={i} style={s.ingTag}>
                                                    <Text style={s.ingTagText}>{ingName}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                    <View style={s.ingSourceNote}>
                                        <Ionicons name="information-circle-outline" size={12} color={COLORS.textDim} />
                                        <Text style={s.ingSourceText}>تم استخراج هذه القائمة برمجياً من عبوة المنتج.</Text>
                                    </View>
                                </View>
                            </Animated.View>
                            {!ingExpanded && (
                                <TouchableOpacity onPress={toggleIngredients} style={s.expandHint}>
                                    <Text style={s.expandHintText}>اضغط لعرض القائمة الكاملة</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={{ height: 140 }} />
                    </ScrollView>

                    {/* CTA FOOTER */}
                    <View style={s.stickyFooter}>
                        <TouchableOpacity style={s.primaryBtn} onPress={() => Linking.openURL(item.link)}>
                            <Text style={s.primaryBtnText}>عرض السعر في الجزائر</Text>
                            <FontAwesome5 name="shopping-bag" size={16} color={COLORS.background} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <FullImageViewer visible={isViewerVisible} imageUrl={item.image} onClose={() => setIsViewerVisible(false)} />
        </Modal>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: COLORS.background, height: height * 0.9, borderTopLeftRadius: 35, borderTopRightRadius: 35, borderWidth: 1, borderColor: COLORS.border },
    dragHandle: { width: 45, height: 5, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', borderRadius: 10, marginVertical: 18 },
    scrollContent: { paddingHorizontal: 22 },

    // Header UI
    heroCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 20, marginBottom: 30 },
    imageBox: { width: 110, height: 110, backgroundColor: '#fff', borderRadius: 25, padding: 12, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
    productImg: { width: '100%', height: '100%' },
    zoomIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 5, padding: 2 },
    heroTextContainer: { flex: 1, alignItems: 'flex-end' },
    brandTag: { fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen, fontSize: 14 },
    productNameLarge: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.textPrimary, fontSize: 22, textAlign: 'right', marginBottom: 10 },
    mainBadgeRow: { flexDirection: 'row-reverse', gap: 12, alignItems: 'center' },
    premiumScoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    premiumScoreText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: '#fff' },
    verifiedIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    verifiedIndicatorText: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textDim },

    // Stats Grid
    statsGrid: { flexDirection: 'row-reverse', gap: 15, marginBottom: 25 },
    statGlassCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border },
    statIconCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    statLabel: { fontFamily: 'Tajawal-Bold', color: COLORS.textDim, fontSize: 11, marginBottom: 4 },
    statValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24, marginBottom: 10 },
    progressBar: { height: 4, width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
    progressFill: { height: '100%', borderRadius: 10 },

    // Compatibility (Restored Style)
    compatibilityList: { gap: 10, marginTop: 10 },
    reasonRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: COLORS.accentGreen + '0D', padding: 14, borderRadius: 16 },
    reasonIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.accentGreen + '1A', justifyContent: 'center', alignItems: 'center' },
    reasonText: { fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 14, textAlign: 'right', flex: 1, lineHeight: 20 },

    // Sections General
    sectionCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
    sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    sectionTitle: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.textPrimary, fontSize: 17 },
    sectionSubtitle: { fontFamily: 'Tajawal-Regular', color: COLORS.textDim, fontSize: 12 },

    // Marketing UI
    marketingHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    honestyCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    honestyValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16 },
    honestySub: { fontFamily: 'Tajawal-Bold', fontSize: 8, color: COLORS.textDim, marginTop: -2 },

    // Claim Row UX
    claimRowWrapper: { width: '100%' },
    claimRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    claimRowMain: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 16 },
    claimStatusIndicator: { width: 40, alignItems: 'center' },
    barContainer: { gap: 3 },
    statusBar: { width: 12, height: 4, borderRadius: 2 },
    claimTextCol: { flex: 1, paddingHorizontal: 15 },
    claimTextTitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, textAlign: 'right', marginBottom: 2 },
    statusBadgeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    claimTextStatus: { fontFamily: 'Tajawal-ExtraBold', fontSize: 11 },
    dotSeparator: { width: 3, height: 3, borderRadius: 1.5 },
    claimMicroLabel: { fontFamily: 'Tajawal-Bold', fontSize: 10, textTransform: 'uppercase' },
    claimDetails: { paddingBottom: 20, paddingHorizontal: 10 },
    explanationBox: { borderRightWidth: 3, paddingRight: 15, marginBottom: 15 },
    claimExplanation: { fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 14, textAlign: 'right', lineHeight: 22 },
    ingSectionTitle: { fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, fontSize: 12, textAlign: 'right', marginBottom: 10 },
    chipContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    chipText: { fontFamily: 'Tajawal-Bold', fontSize: 11 },

    // Collapsible Ingredients UI
    collapsibleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ingHeaderInfo: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 15 },
    ingCountLabel: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textDim },
    ingExpandedContent: { paddingTop: 20 },
    expandHint: { marginTop: 15, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    expandHintText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.accentGreen },
    ingSourceNote: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 20, opacity: 0.5 },
    ingSourceText: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.textDim },

    // Ingredients Grid
    ingGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
    ingTag: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 14 },
    ingTagText: { fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 12 },

    // Footer
    stickyFooter: { position: 'absolute', bottom: 0, width: '100%', padding: 25, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    primaryBtn: { backgroundColor: COLORS.accentGreen, height: 60, borderRadius: 20, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 15, elevation: 5 },
    primaryBtnText: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.textOnAccent, fontSize: 16 }
});