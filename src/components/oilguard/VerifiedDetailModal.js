// src/components/oilguard/VerifiedDetailModal.js
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet,
    Dimensions, Linking, Animated, Easing, Pressable, Image, Platform, I18nManager
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons, MaterialCommunityIcons as CommunityIcons } from '@expo/vector-icons';
import { COLORS as DEFAULT_COLORS } from './oilguard.styles';
import { useTheme } from '../../context/ThemeContext';
import FullImageViewer from '../common/FullImageViewer';
import { t, interpolate } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

const { height, width } = Dimensions.get('window');

// Dictionary to match product ingredients to claims if pre-parsed evidence is missing
const CLAIM_INGREDIENT_KEYWORDS = {
    'ترطيب': ['glycerin', 'hyaluronic', 'panthenol', 'aloe', 'squalane', 'ceramide', 'sodium hyaluronate', 'butylene glycol', 'propylene glycol', 'urea', 'جليسرين', 'بانثينول', 'صبار', 'سيراميد'],
    'مرطب': ['glycerin', 'hyaluronic', 'panthenol', 'aloe', 'squalane', 'ceramide', 'sodium hyaluronate', 'butylene glycol', 'propylene glycol', 'urea', 'جليسرين', 'بانثينول', 'صبار', 'سيراميد'],
    'تفتيح': ['niacinamide', 'vitamin c', 'ascorbic', 'arbutin', 'kojic', 'tranexamic', 'azelaic', 'licorice', 'glabridin', 'نياسيناميد', 'فيتامين سي', 'أربوتين'],
    'حب الشباب': ['salicylic', 'benzoyl', 'zinc', 'tea tree', 'azelaic', 'sulfur', 'حمض الساليسليك', 'زنك', 'شجرة الشاي'],
    'تنظيف': ['coco-glucoside', 'decyl glucoside', 'cocamidopropyl', 'lauroyl', 'sulfate', 'كوكو غلوكوزيد'],
    'تهدئة': ['centella', 'cica', 'allantoin', 'bisabolol', 'aloe', 'madecassoside', 'panthenol', 'سنتيلا', 'ألانتوين', 'بيسابولول', 'بانثينول'],
    'مهدئ': ['centella', 'cica', 'allantoin', 'bisabolol', 'aloe', 'madecassoside', 'panthenol', 'سنتيلا', 'ألانتوين', 'بيسابولول', 'بانثينول'],
    'تقشير': ['salicylic', 'glycolic', 'lactic', 'mandelic', 'aha', 'bha', 'pha', 'حمض الجليكوليك', 'حمض اللاكتيك'],
    'تساقط': ['caffeine', 'rosemary', 'biotin', 'minoxidil', 'rosemary oil', 'كافيين', 'إكليل الجبل', 'بيوتين'],
    'النمو': ['caffeine', 'rosemary', 'biotin', 'minoxidil', 'كافيين', 'إكليل الجبل', 'بيوتين'],
    'مضاد للأكسدة': ['tocopherol', 'vitamin e', 'ascorbic', 'ferulic', 'resveratrol', 'green tea', 'فيتامين هـ', 'شاي أخضر'],
    'قشرة': ['pyrithione', 'piroctone', 'climbazole', 'ketoconazole', 'tea tree', 'بيريثيون الزنك', 'بيروكتون أولامين'],
    'تغذية': ['oil', 'butter', 'keratin', 'protein', 'argan', 'jojoba', 'shea', 'زيت', 'زبدة', 'أرجان', 'جوجوبا'],
};

// ==========================================
// SUB-COMPONENT: Marketing Claim Row (Accordion)
// ==========================================
const ClaimRow = ({ result, index, isLast, productIngredients = [] }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const s = useMemo(() => createStyles(COLORS), [COLORS]);
    const language = useCurrentLanguage();
    const isRTL = I18nManager.isRTL || language === 'ar';

    const [expanded, setExpanded] = useState(false);
    const animController = useRef(new Animated.Value(0)).current;
    const [contentHeight, setContentHeight] = useState(0);

    const cleanStatusText = (text) => {
        if (!text) return '';
        return text.toString().replace(/[✅🌿⚖️❌🚫⚠️]/g, '').trim();
    };

    const getStatusConfig = (statusRaw) => {
        const str = statusRaw ? statusRaw.toString() : '';

        // BLUE: Significant (بنسبة معتبرة / محقق)
        if (str.includes('معتبرة') || str.includes('محقق بنسبة معتبرة')) {
            return { color: '#4D96FF', icon: 'check-double', bg: 'rgba(77, 150, 255, 0.1)', label: t('oilguard_status_strong', language) || 'محقق بنسبة معتبرة', bars: 3 };
        }
        // GREEN: Moderate (بنسبة متوسطة / محقق)
        if (str.includes('متوسطة') || str.includes('✅') || str.includes('🌿') || str.includes('محقق')) {
            return { color: COLORS.accentGreen, icon: 'check', bg: COLORS.accentGreen + '1A', label: t('oilguard_status_good', language) || 'محقق بنسبة متوسطة', bars: 2 };
        }
        // YELLOW: Low / Partial (جزئي / تركيز منخفض / Angel)
        if (str.includes('جزئي') || str.includes('Angel') || str.includes('تركيز') || str.includes('منخفض') || str.includes('دون الفعال') || str.includes('⚠️')) {
            return { color: '#FFB84C', icon: 'exclamation-circle', bg: 'rgba(255, 184, 76, 0.1)', label: t('oilguard_status_marginal', language) || 'إدعاء جزئي / تركيز منخفض', bars: 1 };
        }
        // RED: False / Exaggeration (مبالغة / تناقض / لا توجد / فارغ)
        if (str.includes('❌') || str.includes('كذب') || str.includes('🚫') || str.includes('مبالغة') || str.includes('تناقض') || str.includes('لا توجد')) {
            return { color: '#FF6B6B', icon: 'times-circle', bg: 'rgba(255, 107, 107, 0.1)', label: t('oilguard_status_not_found', language) || 'مبالغة / غير محقق', bars: 0 };
        }
        return { color: COLORS.textDim, icon: 'info-circle', bg: 'rgba(255, 255, 255, 0.05)', label: t('oilguard_status_analyzing', language) || 'قيد التحليل', bars: 0 };
    };

    const config = getStatusConfig(result?.status);
    const cleanStatus = cleanStatusText(result?.status);

    const isLowConcentrationClaim = cleanStatus.includes('Angel') || 
                                    cleanStatus.includes('دون الفعال') || 
                                    (cleanStatus.includes('تركيز') && cleanStatus.includes('منخفض'));

    // 1. Gather evidence from all potential properties
    const rawEvidence = [
        ...(Array.isArray(result?.proven) ? result.proven : []),
        ...(Array.isArray(result?.traditionallyProven) ? result.traditionallyProven : []),
        ...(Array.isArray(result?.ingredients) ? result.ingredients : []),
        ...(Array.isArray(result?.actives) ? result.actives : []),
        ...(Array.isArray(result?.evidence) ? result.evidence : []),
        ...(Array.isArray(result?.primaryMatches) ? result.primaryMatches : []),
        ...(Array.isArray(result?.traceMatches) ? result.traceMatches : []),
    ];

    // 2. Fallback Matcher: If rawEvidence is empty, dynamically match product's ingredients
    if (rawEvidence.length === 0 && Array.isArray(productIngredients) && productIngredients.length > 0) {
        const claimText = (result?.claim || '').toLowerCase();
        
        const matchedKeywords = [];
        Object.keys(CLAIM_INGREDIENT_KEYWORDS).forEach(kw => {
            if (claimText.includes(kw)) {
                matchedKeywords.push(...CLAIM_INGREDIENT_KEYWORDS[kw]);
            }
        });

        productIngredients.forEach(ing => {
            const ingName = typeof ing === 'object' ? (ing.name || ing.id || '') : String(ing || '');
            const lowerName = ingName.toLowerCase();

            if (lowerName.includes('water') || lowerName.includes('aqua') || lowerName === 'ماء') return;

            if (matchedKeywords.length > 0) {
                const isMatch = matchedKeywords.some(k => lowerName.includes(k));
                if (isMatch) rawEvidence.push(ing);
            }
        });

        // If still empty but status is achieved, pull top non-water ingredients
        if (rawEvidence.length === 0 && (cleanStatus.includes('محقق') || cleanStatus.includes('متوسطة') || cleanStatus.includes('معتبرة'))) {
            productIngredients.slice(0, 5).forEach(ing => {
                const ingName = typeof ing === 'object' ? (ing.name || ing.id || '') : String(ing || '');
                const lowerName = ingName.toLowerCase();
                if (!lowerName.includes('water') && !lowerName.includes('aqua') && lowerName !== 'ماء') {
                    if (rawEvidence.length < 3) rawEvidence.push(ing);
                }
            });
        }
    }

    // 3. Categorize into Strong vs Weak Evidence
    const strongEvidence = [];
    const weakEvidence = [];
    const seenIds = new Set();

    rawEvidence.forEach(item => {
        const isObj = typeof item === 'object' && item !== null;
        const name = isObj ? (item.name || item.id || 'مكون غير معروف') : String(item || '');
        const id = isObj ? (item.id || name) : name;

        if (!id || seenIds.has(id.toLowerCase())) return;
        seenIds.add(id.toLowerCase());

        const display = isObj ? (item.concentrationDisplay || (item.estimatedPct ? `~${item.estimatedPct}%` : null)) : null;
        const benefit = isObj ? item.benefit : null;
        const isTrace = isObj ? (item.isTrace ?? false) : false;

        const isPotentActive = isObj && (
            item.isPotentMicro || 
            (display && (display.includes('فعال') || display.includes('كافٍ'))) ||
            item.dosageBadge === 'potent'
        );

        const data = { name, display, benefit, isTrace, isPotentActive };

        if (isPotentActive || (!isTrace && !isLowConcentrationClaim)) {
            strongEvidence.push(data);
        } else {
            weakEvidence.push(data);
        }
    });

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
        outputRange: [0, contentHeight || 220],
        extrapolate: 'clamp'
    });

    const hasDetailedReasons = Array.isArray(result?.reasons) && result.reasons.length > 0;
    const rawExplanation = result?.explanation || result?.description || result?.text || result?.reason || '';
    const fallbackExplanation = rawExplanation || (
        cleanStatus 
            ? `تم تقييم ادعاء "${result?.claim || ''}" كـ "${cleanStatus}" بناءً على المكونات الفعالة المكتشفة.`
            : `هذا الادعاء مدعوم بتركيبة المنتج.`
    );

    return (
        <View style={[s.claimRowWrapper, !isLast ? s.claimRowBorder : null]}>
            <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={s.claimRowMain}>
                <View style={s.claimStatusIndicator}>
                    <View style={s.barContainer}>
                        {[1, 2, 3].map(b => (
                            <View key={b} style={[s.statusBar, { backgroundColor: b <= config.bars ? config.color : 'rgba(255,255,255,0.05)' }]} />
                        ))}
                    </View>
                </View>
                <View style={s.claimTextCol}>
                    <Text style={[s.claimTextTitle, { color: COLORS.textPrimary }]}>{String(result?.claim || '')}</Text>
                    <View style={s.statusBadgeRow}>
                        <Text style={[s.claimTextStatus, { color: config.color }]}>{String(cleanStatus)}</Text>
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
                    
                    {/* Explanation Box */}
                    {!hasDetailedReasons ? (
                        <View style={[s.explanationBox, { borderRightColor: config.color }]}>
                            <Text style={s.claimExplanation}>{String(fallbackExplanation)}</Text>
                        </View>
                    ) : null}

                    {/* Detailed Reasons List */}
                    {hasDetailedReasons ? (
                        <View style={{ marginBottom: 12, gap: 8 }}>
                            {result.reasons.map((r, i) => {
                                let rConfig = { color: COLORS.success, icon: 'check-circle' };
                                if (r?.type === 'risk' || r?.type === 'negative') rConfig = { color: COLORS.danger || '#FF6B6B', icon: 'times-circle' };
                                if (r?.type === 'caveat') rConfig = { color: COLORS.warning || '#FFB84C', icon: 'exclamation-triangle' };

                                return (
                                    <View key={`reason-${i}`} style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8 }}>
                                        <FontAwesome5 name={rConfig.icon} size={13} color={rConfig.color} style={{ marginTop: 4 }} />
                                        <Text style={{ fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'right', flex: 1 }}>
                                            {String(r?.text || '')}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : null}

                    {/* Actionable User Advice */}
                    {(Array.isArray(result?.userAdvice) && result.userAdvice.length > 0) ? (
                        <View style={{ marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 12 }}>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                                <FontAwesome5 name="lightbulb" size={12} color={COLORS.info || '#4D96FF'} />
                                <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.info || '#4D96FF', fontSize: 12 }}>
                                    نصيحة الاستخدام:
                                </Text>
                            </View>
                            {result.userAdvice.map((advice, i) => (
                                <Text key={`advice-${i}`} style={{ fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'right' }}>
                                    • {String(advice || '')}
                                </Text>
                            ))}
                        </View>
                    ) : null}

                    {/* SECTION 1: Essential / Effective Actives */}
                    {(strongEvidence.length > 0) ? (
                        <View style={s.ingSection}>
                            <Text style={s.ingSectionTitle}>{t('comp_essential_actives', language) || 'مكونات فعالة أساسية:'}</Text>
                            <View style={s.chipContainer}>
                                {strongEvidence.map((ing, i) => (
                                    <View key={`strong-${i}`} style={[s.chip, { backgroundColor: config.bg, borderColor: `${config.color}40`, borderWidth: 1 }]}>
                                        <Text style={[s.chipText, { color: config.color }]}>
                                            {ing.name}{ing.display ? ` (${ing.display})` : ''}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : null}

                    {/* SECTION 2: Secondary / Trace Actives */}
                    {(weakEvidence.length > 0) ? (
                        <View style={[s.ingSection, { marginTop: 10 }]}>
                            <Text style={[s.ingSectionTitle, { color: COLORS.warning || '#FFB84C' }]}>{t('comp_secondary_traces', language) || 'تراكيز ثانوية / منخفضة:'}</Text>
                            <View style={s.chipContainer}>
                                {weakEvidence.map((ing, i) => (
                                    <View key={`weak-${i}`} style={[s.chip, { backgroundColor: 'rgba(255, 184, 76, 0.1)', borderColor: 'rgba(255, 184, 76, 0.3)', borderStyle: 'dashed', borderWidth: 1 }]}>
                                        <Text style={[s.chipText, { color: '#FFB84C' }]}>
                                            {ing.name}{ing.display ? ` (${ing.display})` : ''}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : null}

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

    const language = useCurrentLanguage();

    // Animations - matching CatalogDetailModal pattern
    const animState = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(animState, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(animState, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

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
    const validClaims = mResults.filter(r => 
        r?.status?.includes('✅') || r?.status?.includes('🌿') || r?.status?.includes('معتبرة') || r?.status?.includes('محقق')
    ).length;
    const marketingScore = mResults.length > 0 ? Math.round((validClaims / mResults.length) * 100) : 100;

    const overlayOpacity = animState.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const modalTranslateY = animState.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

    return (
        <Modal 
            visible={visible} 
            transparent 
            animationType="none" 
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <Animated.View style={[s.modalOverlay, { opacity: overlayOpacity }]}>
                <Pressable onPress={handleClose} style={StyleSheet.absoluteFill} />
                <Animated.View 
                    style={[
                        s.sheet, 
                        { 
                            transform: [{ translateY: modalTranslateY }] 
                        }
                    ]}
                >
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
                                        <Text style={s.verifiedIndicatorText}>{t('oilguard_brand_score', language)}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* 1b. CONFIDENCE BANNER (low-confidence only) */}
                        {item.confidence === 'low' && (
                            <View style={s.confidenceBanner}>
                                <Ionicons name="warning-outline" size={14} color="#FFB84C" />
                                <Text style={s.confidenceBannerText}>
                                    {t('oilguard_partial_match_note', language)
                                        || 'Partial match — fewer key ingredients align with your profile. Review details before purchasing.'}
                                </Text>
                            </View>
                        )}

                        {/* 2. SCIENTIFIC STATS GRID */}
                        <View style={s.statsGrid}>
                            <View style={s.statGlassCard}>
                                <View style={s.statIconCircle}><FontAwesome5 name="shield-alt" size={14} color={COLORS.success} /></View>
                                <Text style={s.statLabel}>{t('oilguard_safety_score', language)}</Text>
                                <Text style={[s.statValue, { color: COLORS.success }]}>{item.safety}%</Text>
                                <View style={s.progressBar}><View style={[s.progressFill, { width: `${item.safety}%`, backgroundColor: COLORS.success }]} /></View>
                            </View>
                            <View style={s.statGlassCard}>
                                <View style={s.statIconCircle}><FontAwesome5 name="flask" size={14} color={COLORS.info} /></View>
                                <Text style={s.statLabel}>{t('oilguard_efficacy_score', language)}</Text>
                                <Text style={[s.statValue, { color: COLORS.info }]}>{item.efficacy}%</Text>
                                <View style={s.progressBar}><View style={[s.progressFill, { width: `${item.efficacy}%`, backgroundColor: COLORS.info }]} /></View>
                            </View>
                        </View>

                        {/* 3. PERSONAL COMPATIBILITY */}
                        {item.reasons?.length > 0 && (
                            <View style={s.sectionCard}>
                                <View style={s.sectionHeader}>
                                    <Text style={s.sectionTitle}>{t('oilguard_personal_compatibility', language)}</Text>
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
                                        <Text style={s.honestySub}>{t('oilguard_honesty', language)}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={s.sectionTitle}>{t('oilguard_marketing_analysis', language)}</Text>
                                        <Text style={s.sectionSubtitle}>{t('oilguard_marketing_comparison', language)}</Text>
                                    </View>
                                </View>
                                <View style={s.claimsList}>
                                    {mResults.map((res, i) => (
                                        <ClaimRow 
                                            key={i} 
                                            result={res} 
                                            index={i} 
                                            isLast={i === mResults.length - 1} 
                                            productIngredients={item.ingredients}
                                        />
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
                                    <Text style={s.sectionTitle}>{t('oilguard_ingredients_list', language)}</Text>
                                    <Text style={s.ingCountLabel}>
                                        {interpolate(t('oilguard_analyzed_count', language), { count: item.ingredients?.length || 0 })}
                                    </Text>
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
                                        <Text style={s.ingSourceText}>{t('oilguard_source_note', language)}</Text>
                                    </View>
                                </View>
                            </Animated.View>
                            {!ingExpanded && (
                                <TouchableOpacity onPress={toggleIngredients} style={s.expandHint}>
                                    <Text style={s.expandHintText}>{t('oilguard_show_full_list_hint', language)}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={{ height: 140 }} />
                    </ScrollView>

                    {/* CTA FOOTER */}
                    <View style={s.stickyFooter}>
                        <TouchableOpacity style={s.primaryBtn} onPress={() => Linking.openURL(item.link)}>
                            <Text style={s.primaryBtnText}>{t('oilguard_view_price_dz', language)}</Text>
                            <FontAwesome5 name="shopping-bag" size={16} color={COLORS.background} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Animated.View>

            <FullImageViewer visible={isViewerVisible} imageUrl={item.image} onClose={() => setIsViewerVisible(false)} />
        </Modal>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(5, 10, 15, 0.85)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: COLORS.background, height: height * 0.94, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    dragHandle: { width: 55, height: 6, backgroundColor: COLORS.textDim + '40', alignSelf: 'center', borderRadius: 10, marginVertical: 14 },
    scrollContent: { paddingHorizontal: 12 },

    // Confidence Banner
    confidenceBanner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFB84C1A',
        borderWidth: 1,
        borderColor: '#FFB84C55',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
    },
    confidenceBannerText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: '#FFB84C',
        flex: 1,
        textAlign: 'right',
        lineHeight: 19,
    },

    // Header UI
    heroCard: { flexDirection: 'row-reverse', alignItems: 'center', gap: 16, marginBottom: 20 },
    imageBox: { width: 105, height: 105, backgroundColor: '#fff', borderRadius: 22, padding: 10, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8 },
    productImg: { width: '100%', height: '100%' },
    zoomIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 5, padding: 3 },
    heroTextContainer: { flex: 1, alignItems: 'flex-end' },
    brandTag: { fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen, fontSize: 14, marginBottom: 2 },
    productNameLarge: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.textPrimary, fontSize: 21, textAlign: 'right', marginBottom: 8, lineHeight: 28 },
    mainBadgeRow: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center' },
    premiumScoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    premiumScoreText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 13, color: '#fff' },
    verifiedIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    verifiedIndicatorText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textSecondary },

    // Stats Grid
    statsGrid: { flexDirection: 'row-reverse', gap: 10, marginBottom: 16 },
    statGlassCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
    statIconCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    statLabel: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
    statValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24, marginBottom: 8 },
    progressBar: { height: 5, width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10 },
    progressFill: { height: '100%', borderRadius: 10 },

    // Compatibility
    compatibilityList: { gap: 8, marginTop: 10 },
    reasonRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: COLORS.accentGreen + '14', padding: 12, borderRadius: 14 },
    reasonIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.accentGreen + '26', justifyContent: 'center', alignItems: 'center' },
    reasonText: { fontFamily: 'Tajawal-Regular', color: COLORS.textPrimary, fontSize: 14, textAlign: 'right', flex: 1, lineHeight: 21 },

    // Sections General
    sectionCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
    sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.textPrimary, fontSize: 17 },
    sectionSubtitle: { fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 12 },

    // Marketing UI
    marketingHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    honestyCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    honestyValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 17 },
    honestySub: { fontFamily: 'Tajawal-Bold', fontSize: 9, color: COLORS.textSecondary, marginTop: -2 },

    // Claim Row UX
    claimRowWrapper: { width: '100%' },
    claimRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
    claimRowMain: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 14 },
    claimStatusIndicator: { width: 36, alignItems: 'center' },
    barContainer: { gap: 3 },
    statusBar: { width: 12, height: 4, borderRadius: 2 },
    claimTextCol: { flex: 1, paddingHorizontal: 12 },
    claimTextTitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, textAlign: 'right', marginBottom: 3 },
    statusBadgeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    claimTextStatus: { fontFamily: 'Tajawal-ExtraBold', fontSize: 12 },
    dotSeparator: { width: 3, height: 3, borderRadius: 1.5 },
    claimMicroLabel: { fontFamily: 'Tajawal-Bold', fontSize: 11, textTransform: 'uppercase' },
    claimDetails: { paddingBottom: 16, paddingHorizontal: 6 },
    explanationBox: { borderRightWidth: 3, paddingRight: 12, marginBottom: 12 },
    claimExplanation: { fontFamily: 'Tajawal-Regular', color: COLORS.textPrimary, fontSize: 14, textAlign: 'right', lineHeight: 22 },
    ingSectionTitle: { fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, fontSize: 13, textAlign: 'right', marginBottom: 8 },
    chipContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    chipText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },

    // Collapsible Ingredients UI
    collapsibleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ingHeaderInfo: { flex: 1, alignItems: 'flex-end', paddingHorizontal: 12 },
    ingCountLabel: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary },
    ingExpandedContent: { paddingTop: 16 },
    expandHint: { marginTop: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 10 },
    expandHintText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.accentGreen },
    ingSourceNote: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 16, opacity: 0.7 },
    ingSourceText: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textSecondary },

    // Ingredients Grid
    ingGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    ingTag: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
    ingTagText: { fontFamily: 'Tajawal-Regular', color: COLORS.textPrimary, fontSize: 13 },

    // Footer
    stickyFooter: { position: 'absolute', bottom: 0, width: '100%', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
    primaryBtn: { backgroundColor: COLORS.accentGreen, height: 56, borderRadius: 18, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 5 },
    primaryBtnText: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.textOnAccent, fontSize: 16 }
});