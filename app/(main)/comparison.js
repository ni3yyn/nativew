//comparison.js

import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
    StyleSheet, View, Text,
    ScrollView, Animated, Platform, Alert,
    I18nManager, Image, StatusBar,
    Easing, TouchableOpacity, Dimensions, TextInput
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Fuse from 'fuse.js';

import { useAppContext } from '../../src/context/AppContext';
import { t } from '../../src/i18n';
import { useCurrentLanguage } from '../../src/hooks/useCurrentLanguage';

// --- SHARED RESOURCES ---
import {
    createStyles,
    COLORS as DEFAULT_COLORS,
    width,
    height,
    CARD_WIDTH
} from '../../src/components/oilguard/oilguard.styles';
import { useTheme } from '../../src/context/ThemeContext';
import LoadingScreen from '../../src/components/oilguard/LoadingScreen';
import { PRODUCT_TYPES, getClaimsByProductType } from '../../src/constants/productData';
import { uriToBase64 } from '../../src/utils/formatters';
import { ReviewStep } from '../../src/components/oilguard/ReviewStep';
import { AlertService } from '../../src/services/alertService';

// ============================================================================
//                       SYSTEM CONFIGURATION
// ============================================================================

const VERCEL_BACKEND_URL = "https://oilguard-backend.vercel.app/api/analyze.js";
const VERCEL_EVALUATE_URL = "https://oilguard-backend.vercel.app/api/evaluate.js";

// Side-Specific Colors for Comparison
const PROD_COLORS = {
    A: '#10b981', // Emerald Green (Product A)
    B: '#3b82f6'  // Royal Blue   (Product B)
};

// ============================================================================
//                       ANIMATED UI COMPONENTS
// ============================================================================

const Spore = ({ size, duration, delay }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const animY = useRef(new Animated.Value(0)).current;
    const animX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const floatLoop = Animated.loop(Animated.timing(animY, { toValue: 1, duration, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }));
        const driftLoop = Animated.loop(Animated.sequence([Animated.timing(animX, { toValue: 1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin }), Animated.timing(animX, { toValue: -1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin })]));
        const opacityPulse = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: 0.6, duration: duration * 0.2, useNativeDriver: true }), Animated.delay(duration * 0.6), Animated.timing(opacity, { toValue: 0.2, duration: duration * 0.2, useNativeDriver: true })]));
        const timeout = setTimeout(() => { floatLoop.start(); driftLoop.start(); opacityPulse.start(); }, delay);
        return () => { clearTimeout(timeout); };
    }, []);

    return (<Animated.View style={{ position: 'absolute', zIndex: -1, width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.primaryGlow, transform: [{ translateY: animY.interpolate({ inputRange: [0, 1], outputRange: [height, -100] }) }, { translateX: animX.interpolate({ inputRange: [-1, 1], outputRange: [-35, 35] }) }], opacity }} />);
};

const StaggeredItem = ({ index, children, style }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(anim, { toValue: 1, friction: 8, tension: 40, delay: index * 80, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={[{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }, style]}>
            {children}
        </Animated.View>
    );
};

const MetricDuelRow = ({ label, icon, scoreA, scoreB }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createComparisonStyles(COLORS), [COLORS]);
    const animA = useRef(new Animated.Value(0)).current;
    const animB = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(animA, { toValue: scoreA || 0, duration: 1500, delay: 200, easing: Easing.out(Easing.exp), useNativeDriver: false }),
            Animated.timing(animB, { toValue: scoreB || 0, duration: 1500, delay: 200, easing: Easing.out(Easing.exp), useNativeDriver: false })
        ]).start();
    }, [scoreA, scoreB]);

    return (
        <View style={styles.duelContainer}>
            <View style={[styles.duelHeader, { flexDirection: 'row-reverse' }]}>
                <Text style={[styles.duelScore, { color: PROD_COLORS.A, textAlign: 'right' }]}>{Math.round(scoreA || 0)}%</Text>
                <View style={[styles.duelLabelBox, { flexDirection: 'row-reverse' }]}>
                    <Text style={styles.duelLabel}>{label}</Text>
                    <FontAwesome5 name={icon} size={12} color={COLORS.textDim} style={{ marginLeft: 8 }} />
                </View>
                <Text style={[styles.duelScore, { color: PROD_COLORS.B, textAlign: 'left' }]}>{Math.round(scoreB || 0)}%</Text>
            </View>

            <View style={[styles.duelTrackContainer, { flexDirection: 'row-reverse' }]}>
                
                {/* Product A (Right physically) */}
                <View style={{ flex: 1, flexDirection: 'row-reverse', justifyContent: 'flex-end' }}>
                    <Animated.View 
                        style={[
                            styles.duelBar, 
                            { 
                                width: animA.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                                backgroundColor: PROD_COLORS.A, 
                                borderTopRightRadius: 6, 
                                borderBottomRightRadius: 6 
                            }
                        ]} 
                    />
                </View>

                <View style={styles.duelDivider} />

                {/* Product B (Left physically) */}
                <View style={{ flex: 1, flexDirection: 'row-reverse', justifyContent: 'flex-start' }}>
                    <Animated.View 
                        style={[
                            styles.duelBar, 
                            { 
                                width: animB.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                                backgroundColor: PROD_COLORS.B, 
                                borderTopLeftRadius: 6, 
                                borderBottomLeftRadius: 6 
                            }
                        ]} 
                    />
                </View>
            </View>
        </View>
    );
};

// ============================================================================
// EXACT CLAIM ROW FROM OILGUARD (Adapted only for pure UI usage)
// ============================================================================
const ClaimRow = ({ result, index, isLast, language }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const globalStyles = useMemo(() => createStyles(COLORS), [COLORS]);
    const isRTL = I18nManager.isRTL || language === 'ar';

    const [expanded, setExpanded] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const animController = useRef(new Animated.Value(0)).current;

    const cleanStatusText = (text) => (text ? text.toString().replace(/[✅🌿⚖️❌🚫⚠️]/g, '').trim() : '');

    const getStatusConfig = (statusRaw, confidence) => {
        const s = statusRaw ? statusRaw.toString() : '';
        
        if (s.includes('مبالغة') || s.includes('تناقض') || s.includes('لا توجد') || s.includes('فارغ') || s.includes('وهمي')) {
            return { color: COLORS.danger, icon: 'times-circle' };
        }
        if (s.includes('محقق')) {
            return { color: COLORS.success, icon: 'check-circle' };
        }
        if (s.includes('جزئي') || s.includes('Angel') || s.includes('تركيز') || s.includes('منخفض') || s.includes('دون الفعال')) {
            return { color: COLORS.warning, icon: 'exclamation-circle' };
        }
        if (confidence === 'منخفضة' || confidence === 'معدومة') {
            return { color: COLORS.danger, icon: 'times-circle' };
        }
        if (confidence === 'متوسطة') {
            return { color: COLORS.warning, icon: 'exclamation-circle' };
        }
        return { color: COLORS.success, icon: 'check-circle' };
    };

    const config = getStatusConfig(result?.status, result?.confidence);
    const cleanStatus = cleanStatusText(result?.status);

    const isLowConcentrationClaim = cleanStatus.includes('Angel') || 
                                    cleanStatus.includes('دون الفعال') || 
                                    (cleanStatus.includes('تركيز') && cleanStatus.includes('منخفض'));

    const rawEvidence = [...(result?.proven || []), ...(result?.traditionallyProven || [])];
    const strongEvidence = [];
    const weakEvidence = [];

    const seenIds = new Set();
    rawEvidence.forEach(item => {
        const isObj = typeof item === 'object' && item !== null;
        const id = isObj ? item.id : item;
        
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const name = isObj ? (item.name || 'مكون غير معروف') : String(item || '');
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
            toValue: targetValue,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false
        }).start();
    };

    const rotateArrow = animController.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
    const heightInterpolate = animController.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight], extrapolate: 'clamp' });
    const hasDetailedReasons = Array.isArray(result?.reasons) && result.reasons.length > 0;

    return (
        <View style={[globalStyles.claimRowWrapper, !isLast ? globalStyles.claimRowBorder : null]}>
            <TouchableOpacity onPress={toggle} activeOpacity={0.7}>
                <View style={[globalStyles.claimRowMain, { backgroundColor: 'transparent' }]}>
                    <View style={globalStyles.claimIconCol}>
                        <FontAwesome5 name={config.icon} size={18} color={config.color} />
                    </View>
                    <View style={globalStyles.claimTextCol}>
                        <Text style={[globalStyles.claimTextTitle, { color: COLORS.textPrimary, fontSize: 15 }]}>
                            {String(result?.claim || '')}
                        </Text>
                        <Text style={[globalStyles.claimTextStatus, { color: config.color, fontSize: 13 }]}>
                            {String(cleanStatus)}
                        </Text>
                    </View>
                    <View style={globalStyles.claimArrowCol}>
                        <Animated.View style={{ transform: [{ rotate: rotateArrow }] }}>
                            <FontAwesome5 name="chevron-down" size={14} color={COLORS.textDim} />
                        </Animated.View>
                    </View>
                </View>
            </TouchableOpacity>

            <Animated.View style={{ height: heightInterpolate, overflow: 'hidden' }}>
                <View
                    style={[globalStyles.claimDetails, { position: 'absolute', width: '100%', paddingBottom: 16 }]}
                    onLayout={(e) => {
                        const h = e.nativeEvent.layout.height;
                        if (h > 0 && h !== contentHeight) setContentHeight(h);
                    }}
                >
                    {(!hasDetailedReasons && Boolean(result?.explanation)) ? (
                        <Text style={{ fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 14, lineHeight: 24, textAlign: isRTL ? 'right' : 'left' }}>
                            {String(result.explanation)}
                        </Text>
                    ) : null}

                    {hasDetailedReasons ? (
                        <View style={{ marginTop: 8, gap: 8 }}>
                            {result.reasons.map((r, i) => {
                                let rConfig = { color: COLORS.success, icon: 'check-circle' };
                                if (r?.type === 'risk' || r?.type === 'negative') rConfig = { color: COLORS.danger, icon: 'times-circle' };
                                if (r?.type === 'caveat') rConfig = { color: COLORS.warning, icon: 'exclamation-triangle' };

                                return (
                                    <View key={`reason-${i}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8 }}>
                                        <FontAwesome5 name={rConfig.icon} size={13} color={rConfig.color} style={{ marginTop: 5 }} />
                                        <Text style={{ fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 14, lineHeight: 22, textAlign: isRTL ? 'right' : 'left', flex: 1 }}>
                                            {String(r?.text || '')}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : null}

                    {(Array.isArray(result?.userAdvice) && result.userAdvice.length > 0) ? (
                        <View style={{ marginTop: 12 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                                <FontAwesome5 name="lightbulb" size={14} color={COLORS.info} />
                                <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.info, fontSize: 14 }}>
                                    {isRTL ? 'ماذا أفعل؟ (نصيحة الاستخدام)' : 'What to do?'}
                                </Text>
                            </View>
                            {result.userAdvice.map((advice, i) => (
                                <Text key={`advice-${i}`} style={{ fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 14, lineHeight: 22, textAlign: isRTL ? 'right' : 'left' }}>
                                    • {String(advice || '')}
                                </Text>
                            ))}
                        </View>
                    ) : null}

                    {(strongEvidence.length > 0) ? (
                        <View style={{ marginTop: 16 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <FontAwesome5 name="check-double" size={14} color={COLORS.success} />
                                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.success }}>
                                    {t('comp_essential_actives', language) || 'مكونات فعالة أساسية:'}
                                </Text>
                            </View>
                            <View style={{ gap: 8 }}>
                                {strongEvidence.map((ing, i) => (
                                    <Text key={`strong-${i}`} style={{ fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: isRTL ? 'right' : 'left', lineHeight: 24 }}>
                                        <Text style={{ color: COLORS.success }}>• </Text>
                                        <Text style={{ color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold' }}>{String(ing.name || '')}</Text>
                                        {ing.display ? <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen }}> ({String(ing.display)})</Text> : null}
                                        {ing.benefit ? <Text style={{ color: COLORS.textDim }}> — {String(ing.benefit)}</Text> : null}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    ) : null}

                    {(weakEvidence.length > 0) ? (
                        <View style={{ marginTop: 16 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <FontAwesome5 name="exclamation-triangle" size={14} color={COLORS.warning} />
                                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.warning }}>
                                    {t('comp_secondary_traces', language) || 'تراكيز ثانوية / منخفضة:'}
                                </Text>
                            </View>
                            <View style={{ gap: 8 }}>
                                {weakEvidence.map((ing, i) => (
                                    <Text key={`weak-${i}`} style={{ fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: isRTL ? 'right' : 'left', lineHeight: 24 }}>
                                        <Text style={{ color: COLORS.warning }}>• </Text>
                                        <Text style={{ color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold' }}>{String(ing.name || '')}</Text>
                                        {ing.display ? <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.warning }}> ({String(ing.display)})</Text> : null}
                                        {ing.benefit ? <Text style={{ color: COLORS.textDim }}> — {String(ing.benefit)}</Text> : null}
                                    </Text>
                                ))}
                            </View>
                        </View>
                    ) : null}
                </View>
            </Animated.View>
        </View>
    );
};

// ============================================================================
// MarketingClaimsSection — clean sliding-pill switch (A/B), matches the
// duel colour language used elsewhere while feeling calmer and more precise.
// ============================================================================
const MarketingClaimsSection = ({ leftClaims, rightClaims, leftProduct, rightProduct, language }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const globalStyles = useMemo(() => createStyles(COLORS), [COLORS]);
    const styles = useMemo(() => createComparisonStyles(COLORS), [COLORS]);

    const [activeSide, setActiveSide] = useState('A');
    const rawData = activeSide === 'A' ? leftClaims : rightClaims;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const sortedData = useMemo(() => {
        if (!Array.isArray(rawData)) return [];
        return [...rawData].sort((a, b) => {
            const getScore = (item) => {
                const s = item?.status ? item.status.toString() : '';
                if (s.includes('محقق بنسبة معتبرة')) return 5;
                if (s.includes('محقق بنسبة متوسطة')) return 4;
                if (s.includes('جزئي') || s.includes('Angel') || s.includes('تركيز')) return 3;
                if (s.includes('مبالغة') || s.includes('تناقض') || s.includes('لا توجد') || s.includes('فارغ')) return 1;
                return 2;
            };
            return getScore(b) - getScore(a);
        });
    }, [rawData]);

    const switchSide = (side) => {
        if (side === activeSide) return;
        Haptics.selectionAsync();

        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            setActiveSide(side);
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        });
    };

    const getActiveColor = (side) => side === 'A' ? PROD_COLORS.A : PROD_COLORS.B;

    return (
        <View style={[globalStyles.claimsContainer, { marginTop: 0 }]}>
            <View style={globalStyles.claimsHeader}>
                <View>
                    <Text style={globalStyles.claimsTitle}>{t('comp_claims_title', language)}</Text>
                    <Text style={globalStyles.claimsSubtitle}>{t('comp_claims_sub', language)}</Text>
                </View>
            </View>

            {/* Clean Full-Width Subtab Switch */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => switchSide('A')}
                    style={[styles.tabBtn, activeSide === 'A' ? { borderBottomColor: getActiveColor('A') } : null]}
                >
                    <Text 
                        style={[styles.tabText, activeSide === 'A' ? styles.tabTextActive : null]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {String(
                            leftProduct?.catalogProduct?.name || 
                            leftProduct?.catalogProduct?.productName || 
                            leftProduct?.productName || 
                            leftProduct?.name || 
                            leftProduct?.catalogProduct?.brand || 
                            leftProduct?.brand || 
                            t('comp_slot_a', language)
                        )}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => switchSide('B')}
                    style={[styles.tabBtn, activeSide === 'B' ? { borderBottomColor: getActiveColor('B') } : null]}
                >
                    <Text 
                        style={[styles.tabText, activeSide === 'B' ? styles.tabTextActive : null]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {String(
                            rightProduct?.catalogProduct?.name || 
                            rightProduct?.catalogProduct?.productName || 
                            rightProduct?.productName || 
                            rightProduct?.name || 
                            rightProduct?.catalogProduct?.brand || 
                            rightProduct?.brand || 
                            t('comp_slot_b', language)
                        )}
                    </Text>
                </TouchableOpacity>
            </View>

            <Animated.View style={[globalStyles.claimsBody, { opacity: fadeAnim }]}>
                {(!sortedData || sortedData.length === 0) ? (
                    <Text style={{ textAlign: 'center', color: COLORS.textSecondary, margin: 20, fontFamily: 'Tajawal-Regular', fontSize: 15 }}>
                        {t('comp_claims_no_data', language)}
                    </Text>
                ) : (
                    sortedData.map((res, i) => (
                        <ClaimRow 
                            key={res?.claim || `claim-${i}`} 
                            result={res} 
                            index={i} 
                            isLast={i === sortedData.length - 1} 
                            language={language}
                        />
                    ))
                )}
            </Animated.View>
        </View>
    );
};

// ============================================================================
// Comparison Match Breakdown (Identical UI structure to OilGuard's MatchBreakdown)
// ============================================================================
const ComparisonMatchBreakdown = ({ leftProd, rightProd, leftLabel, rightLabel, language }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const globalStyles = useMemo(() => createStyles(COLORS), [COLORS]);
    const isRTL = I18nManager.isRTL || language === 'ar';

    const getConfig = (type) => {
        switch (type) {
            case 'danger': return { color: COLORS.danger };
            case 'warning': return { color: COLORS.warning };
            case 'good': return { color: COLORS.success };
            default: return { color: COLORS.info };
        }
    };

    const getIcon = (text, type) => {
        const lowerText = text ? text.toLowerCase() : '';
        if (lowerText.includes('مسام') || lowerText.includes('بثور')) return 'dot-circle';
        if (lowerText.includes('فطريات') || lowerText.includes('قشرة')) return 'spider';
        if (lowerText.includes('حساسية')) return 'hand-paper';
        if (lowerText.includes('تعارض')) return 'flask';
        return type === 'good' ? 'check' : (type === 'danger' ? 'times' : 'exclamation-triangle');
    };

    const renderReasonsList = (prod, color, label) => {
        const reasons = Array.isArray(prod?.analysisData?.personalMatch?.reasons) ? prod.analysisData.personalMatch.reasons : [];
        
        return (
            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontFamily: 'Tajawal-Bold', color: color, fontSize: 13, marginBottom: 8, textAlign: isRTL ? 'right' : 'left', paddingHorizontal: 4 }}>
                    {label}
                </Text>
                {reasons.length > 0 ? (
                    reasons.map((item, i) => {
                        const type = typeof item === 'object' ? item.type : 'info';
                        const text = typeof item === 'object' ? item.text : item;
                        const customIcon = typeof item === 'object' ? item.icon : null;
                        const config = getConfig(type);
                        const iconName = customIcon || getIcon(text, type);

                        return (
                            <View key={`match-${i}`} style={[globalStyles.matchRow, { alignItems: 'flex-start' }]}>
                                <View style={[globalStyles.matchIconBox, { marginTop: 2 }]}>
                                    <FontAwesome5 name={iconName} size={12} color={config.color} />
                                </View>
                                <Text style={[globalStyles.matchText, { lineHeight: 22 }]}>
                                    {text}
                                </Text>
                            </View>
                        );
                    })
                ) : (
                    <View style={[globalStyles.matchRow, { alignItems: 'flex-start' }]}>
                        <View style={[globalStyles.matchIconBox, { marginTop: 2 }]}>
                            <FontAwesome5 name="check" size={12} color={COLORS.success} />
                        </View>
                        <Text style={[globalStyles.matchText, { lineHeight: 22 }]}>
                            {t('comp_no_conflicts', language) || 'No known conflicts for your profile.'}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[globalStyles.matchContainer, { marginHorizontal: 10, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0)' }]}>
            <View style={globalStyles.matchHeader}>
                <View style={globalStyles.matchHeaderIcon}>
                    <FontAwesome5 name="user-cog" size={12} color={COLORS.textPrimary} />
                </View>
                <Text style={globalStyles.matchHeaderTitle}>{t('comp_personal_report_title', language)}</Text>
            </View>
            <View style={globalStyles.matchBody}>
                {renderReasonsList(leftProd, PROD_COLORS.A, leftLabel)}
                <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 12, marginTop: -4 }} />
                {renderReasonsList(rightProd, PROD_COLORS.B, rightLabel)}
            </View>
        </View>
    );
};


const AnimatedCheckbox = ({ isSelected }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const globalStyles = useMemo(() => createStyles(COLORS), [COLORS]);
    const scale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
    const checkScale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: isSelected ? 1 : 0,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
        }).start();
        Animated.timing(checkScale, {
            toValue: isSelected ? 1 : 0,
            duration: 200,
            delay: isSelected ? 100 : 0,
            useNativeDriver: true,
        }).start();
    }, [isSelected]);

    return (
        <View style={globalStyles.checkboxBase}>
            <Animated.View style={[globalStyles.checkboxFill, { transform: [{ scale }] }]} />
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                <FontAwesome5 name="check" size={14} color={COLORS.textOnAccent} />
            </Animated.View>
        </View>
    );
};

const MemoizedClaimItem = React.memo(({ item, isSelected, onToggle }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const globalStyles = useMemo(() => createStyles(COLORS), [COLORS]);
    return (
        <TouchableOpacity onPress={() => onToggle(item)} activeOpacity={0.7}>
            <View style={[globalStyles.claimItem, isSelected && globalStyles.claimItemActive]}>
                <AnimatedCheckbox isSelected={isSelected} />
                <Text style={globalStyles.claimItemText}>{item}</Text>
            </View>
        </TouchableOpacity>
    );
}, (prevProps, nextProps) => {
    return prevProps.isSelected === nextProps.isSelected;
});

// ============================================================================
//                       MAIN SCREEN
// ============================================================================

export default function ComparisonPage() {
    const language = useCurrentLanguage();
    const { userProfile } = useAppContext();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const globalStyles = useMemo(() => createStyles(COLORS), [COLORS]);
    const styles = useMemo(() => createComparisonStyles(COLORS), [COLORS]);

    // Core State
    const [step, setStep] = useState(0);
    const [scanMode, setScanMode] = useState('fast');
    const [loadingText, setLoadingText] = useState('');
    const [particles] = useState([...Array(12)].map((_, i) => ({ id: i, size: Math.random() * 5 + 3, startX: Math.random() * width, duration: 8000 + Math.random() * 7000, delay: Math.random() * 5000 })));
    const [searchQuery, setSearchQuery] = useState('');

    const params = useLocalSearchParams();
    const router = useRouter();

    // Product Data
    const [left, setLeft] = useState({ sourceData: null, ingredientsList: [], analysisData: null, catalogProduct: null });
    const [right, setRight] = useState({ sourceData: null, ingredientsList: [], analysisData: null, catalogProduct: null });
    const [productType, setProductType] = useState('other');
    const [claims, setClaims] = useState([]);

    useEffect(() => {
        if (!params.leftProduct && !params.rightProduct) return;

        const getInciList = (p) => {
            if (!p || !p.ingredients) return [];
            if (Array.isArray(p.ingredients)) return p.ingredients;
            return String(p.ingredients).split(',').map(item => item.trim()).filter(item => item.length > 0);
        };

        let parsedLeft = null;
        let parsedRight = null;

        if (params.leftProduct) {
            try {
                parsedLeft = typeof params.leftProduct === 'string' ? JSON.parse(params.leftProduct) : params.leftProduct;
                if (parsedLeft && (parsedLeft.image || parsedLeft.id || parsedLeft.ingredients)) {
                    setLeft({
                        sourceData: parsedLeft.image || null,
                        ingredientsList: getInciList(parsedLeft),
                        analysisData: null,
                        catalogProduct: parsedLeft.id ? parsedLeft : null
                    });
                }
            } catch (e) {
                console.error("Failed to parse leftProduct param:", e);
            }
        }

        if (params.rightProduct) {
            try {
                parsedRight = typeof params.rightProduct === 'string' ? JSON.parse(params.rightProduct) : params.rightProduct;
                if (parsedRight && (parsedRight.image || parsedRight.id || parsedRight.ingredients)) {
                    setRight({
                        sourceData: parsedRight.image || null,
                        ingredientsList: getInciList(parsedRight),
                        analysisData: null,
                        catalogProduct: parsedRight.id ? parsedRight : null
                    });
                }
            } catch (e) {
                console.error("Failed to parse rightProduct param:", e);
            }
        }

        // If BOTH products were passed together (e.g. from catalog multi-select compare mode)
        if (parsedLeft && parsedRight && parsedLeft.id && parsedRight.id) {
            setProductType(parsedLeft.category?.id || parsedRight.category?.id || 'other');
            setStep(2);
        }
    }, [params.leftProduct, params.rightProduct]);

    // Animations & Refs
    const contentOpacity = useRef(new Animated.Value(1)).current;
    const contentTranslateX = useRef(new Animated.Value(0)).current;
    const fabAnim = useRef(new Animated.Value(0)).current;
    const fabPulseAnim = useRef(new Animated.Value(1)).current;
    const scrollY = useRef(new Animated.Value(0)).current; // For header animation

    // Memoized Data for Fuse.js
    const claimsForType = useMemo(() => getClaimsByProductType(productType), [productType]);

    // Fuse.js Instance
    const fuse = useMemo(() => new Fuse(claimsForType, {
        includeScore: false,
        threshold: 0.4,
    }), [claimsForType]);

    useEffect(() => {
        Animated.spring(fabAnim, {
            toValue: claims.length > 0 ? 1 : 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true
        }).start();

        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(fabPulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(fabPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        );

        if (claims.length > 0) {
            pulseLoop.start();
        } else {
            pulseLoop.stop();
            fabPulseAnim.setValue(1);
        }

        return () => pulseLoop.stop();
    }, [claims.length]);

    const changeStep = (next) => {
        const isForward = next > step;
        const slideDist = 20;

        Animated.parallel([
            Animated.timing(contentOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
                easing: Easing.out(Easing.quad)
            }),
            Animated.timing(contentTranslateX, {
                toValue: isForward ? -slideDist : slideDist,
                duration: 150,
                useNativeDriver: true
            })
        ]).start(() => {
            setStep(next);
            scrollY.setValue(0);
            contentTranslateX.setValue(isForward ? slideDist : -slideDist);
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(contentOpacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.cubic)
                    }),
                    Animated.spring(contentTranslateX, {
                        toValue: 0,
                        friction: 9,
                        tension: 50,
                        useNativeDriver: true
                    })
                ]).start();
            }, 50);
        });
    };

    const handleOCR = async () => {
        const hasCatalogOnlySelection = Boolean(left.catalogProduct && right.catalogProduct);

        if (hasCatalogOnlySelection) {
            setProductType(left.catalogProduct?.category?.id || right.catalogProduct?.category?.id || 'other');
            setLeft(p => ({ ...p, ingredientsList: p.ingredientsList || [] }));
            setRight(p => ({ ...p, ingredientsList: p.ingredientsList || [] }));
            changeStep(2);
            return;
        }

        setLoadingText(scanMode === 'accurate' ? t('comp_loading_accurate', language) : t('comp_loading_fast', language));
        changeStep(1);

        setTimeout(async () => {
            const processImage = async (uri) => {
                if (!uri) return { list: [], type: 'other' };
                const manipResult = await ImageManipulator.manipulateAsync(
                    uri,
                    [{ resize: { width: 1024 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                const base64 = await uriToBase64(manipResult.uri);

                const res = await fetch(VERCEL_BACKEND_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        base64Data: base64,
                        scanMode: scanMode
                    })
                });

                if (!res.ok) throw new Error("Backend Error");
                const json = await res.json();

                let data;
                if (typeof json.result === 'object') {
                    data = json.result;
                } else {
                    const text = json.result.replace(/```json|```/g, '').trim();
                    data = JSON.parse(text);
                }

                return { list: data.ingredients_list, type: data.detected_type };
            };

            const resolveProduct = async (productState) => {
                if (productState.catalogProduct) {
                    return {
                        list: productState.ingredientsList || [],
                        type: productState.catalogProduct.category?.id || 'other'
                    };
                }
                return await processImage(productState.sourceData);
            };

            try {
                const [r1, r2] = await Promise.all([
                    resolveProduct(left),
                    resolveProduct(right)
                ]);

                setLeft(p => ({ ...p, ingredientsList: r1.list }));
                setRight(p => ({ ...p, ingredientsList: r2.list }));
                setProductType(r1.type !== 'other' ? r1.type : (r2.type !== 'other' ? r2.type : 'other'));
                changeStep(2);
            } catch (e) {
                console.error("Comparison Analysis Error:", e);
                AlertService.error(t('status_error', language), t('comp_error_analysis', language));
                changeStep(0);
            }
        }, 300);
    };

    const handleEval = async () => {
        setLoadingText(t('comp_evaluating', language));
        changeStep(4);

        setTimeout(async () => {
            const evaluate = async (list) => {
                const res = await fetch(VERCEL_EVALUATE_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ingredients_list: list,
                        product_type: productType,
                        selected_claims: claims,
                        user_profile: {
                            allergies: userProfile?.settings?.allergies || [],
                            conditions: userProfile?.settings?.conditions || [],
                            skinType: userProfile?.settings?.skinType,
                            scalpType: userProfile?.settings?.scalpType
                        }
                    })
                });
                return await res.json();
            };

            try {
                const [e1, e2] = await Promise.all([evaluate(left.ingredientsList), evaluate(right.ingredientsList)]);
                setLeft(p => ({ ...p, analysisData: e1 }));
                setRight(p => ({ ...p, analysisData: e2 }));
                changeStep(5);
            } catch (e) {
                AlertService.error(t('status_error', language), t('comp_error_eval', language));
                changeStep(3);
            }
        }, 300);
    };

    const resetAll = () => {
        setLeft({ sourceData: null, ingredientsList: [], analysisData: null, catalogProduct: null });
        setRight({ sourceData: null, ingredientsList: [], analysisData: null, catalogProduct: null });
        setProductType('other');
        setClaims([]);
        setSearchQuery('');
        changeStep(0);
    };

    const handleSlotPress = async (slotKey, slotSetter, slotData) => {
        if (slotData?.sourceData || slotData?.catalogProduct) return;

        AlertService.show({
            title: t('comp_slot_action_title', language),
            message: t('comp_slot_action_message', language),
            type: 'info',
            buttons: [
                {
                    text: t('comp_slot_option_catalog', language),
                    style: 'primary',
                    onPress: () => router.push({
                        pathname: '/CatalogScreen',
                        params: {
                            compareSlot: slotKey === 0 ? 'left' : 'right',
                            leftProduct: left.catalogProduct ? JSON.stringify(left.catalogProduct) : (left.sourceData ? JSON.stringify({ image: left.sourceData }) : ''),
                            rightProduct: right.catalogProduct ? JSON.stringify(right.catalogProduct) : (right.sourceData ? JSON.stringify({ image: right.sourceData }) : '')
                        }
                    })
                },
                {
                    text: t('comp_slot_option_scan', language),
                    style: 'secondary',
                    onPress: async () => {
                        const r = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.8
                        });

                        if (!r.canceled && r.assets && r.assets.length > 0) {
                            slotSetter(prev => ({ ...prev, sourceData: r.assets[0].uri }));
                        }
                    }
                },
                {
                    text: t('common_cancel', language) || 'إلغاء',
                    style: 'secondary'
                }
            ]
        });
    };

    const handleClaimToggle = useCallback((item) => {
        Haptics.selectionAsync();
        setClaims(prev => {
            const isSelected = prev.includes(item);
            if (isSelected) {
                return prev.filter(c => c !== item);
            } else {
                return [...prev, item];
            }
        });
    }, []);

    const renderClaimItem = useCallback(({ item }) => {
        return (
            <MemoizedClaimItem
                item={item}
                isSelected={claims.includes(item)}
                onToggle={handleClaimToggle}
            />
        );
    }, [claims, handleClaimToggle]);

    const getItemLayout = useCallback((data, index) => (
        { length: 65, offset: 65 * index, index }
    ), []);

    // --- RENDER CONTENT ---
    const renderArena = () => (
        <View style={globalStyles.inputStepContainer}>
            <View style={globalStyles.heroVisualContainer}>
                <View style={styles.arenaSlotsRow}>
                    {[{ d: left, s: setLeft, c: PROD_COLORS.A, l: t('comp_slot_a_label', language) }, { d: right, s: setRight, c: PROD_COLORS.B, l: t('comp_slot_b_label', language) }].map((slot, i) => {
                        const hasSelection = Boolean(slot.d.catalogProduct || slot.d.sourceData);
                        const displayImage = slot.d.catalogProduct?.image || slot.d.sourceData;

                        return (
                            <TouchableOpacity activeOpacity={0.7} key={i} style={[styles.slotCard, hasSelection && { borderColor: slot.c, borderWidth: 2 }]}
                                onPress={() => handleSlotPress(i, slot.s, slot.d)}>

                                {hasSelection ? (
                                    <>
                                        <Image source={{ uri: displayImage }} style={styles.slotImage} resizeMode="cover" />
                                        <View style={[styles.slotBadge, { backgroundColor: slot.c }]}>
                                            <Text style={styles.slotBadgeText}>{slot.l}</Text>
                                        </View>
                                        <TouchableOpacity style={styles.removeBtn} onPress={() => slot.s(p => ({ ...p, sourceData: null, catalogProduct: null, ingredientsList: [], analysisData: null }))}>
                                            <FontAwesome5 name="times" color="#FFF" size={10} />
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={styles.slotPlaceholder}>
                                    <View style={styles.dashedIconCircle}>
                                        <FontAwesome5 name="plus" size={20} color={COLORS.textSecondary} />
                                    </View>
                                        <Text style={styles.slotLabel}>{t('comp_slot_label', language)} {slot.l}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                    <View style={styles.vsBadge}>
                        <Text style={styles.vsText}>{t('comp_vs', language)}</Text>
                    </View>
                </View>
            </View>

            <StaggeredItem index={0} style={[globalStyles.bottomDeck, styles.pinnedBottomDock]}>
                <LinearGradient
                    colors={[COLORS.card, COLORS.background]}
                    style={[
                        globalStyles.bottomDeckGradient,
                        {
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0,
                            paddingBottom: insets.bottom > 0 ? insets.bottom + 15 : 30
                        }
                    ]}
                >
                    <View style={globalStyles.deckHeader}>
                        <Text style={globalStyles.deckTitle}>{t('comp_which_better', language)}</Text>

                        <View style={{
                            flexDirection: 'row',
                            backgroundColor: COLORS.textPrimary + '0D',
                            borderRadius: 12,
                            padding: 4,
                            marginTop: 10,
                            marginBottom: 5,
                            borderWidth: 1,
                            borderColor: COLORS.textPrimary + '1A'
                        }}>
                            <TouchableOpacity
                                onPress={() => setScanMode('fast')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    backgroundColor: scanMode === 'fast' ? COLORS.primary : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 6
                                }}
                            >
                                <FontAwesome5 name="bolt" size={14} color={scanMode === 'fast' ? COLORS.textOnAccent : COLORS.textDim} />
                                <Text style={{
                                    fontFamily: 'Tajawal-Bold',
                                    fontSize: 13,
                                    color: scanMode === 'fast' ? COLORS.textOnAccent : COLORS.textDim
                                }}>{t('comp_scan_mode_fast', language)}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setScanMode('accurate')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    backgroundColor: scanMode === 'accurate' ? COLORS.primary : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 6
                                }}
                            >
                                <FontAwesome5 name="search-plus" size={14} color={scanMode === 'accurate' ? COLORS.textOnAccent : COLORS.textDim} />
                                <Text style={{
                                    fontFamily: 'Tajawal-Bold',
                                    fontSize: 13,
                                    color: scanMode === 'accurate' ? COLORS.textOnAccent : COLORS.textDim
                                }}>{t('comp_scan_mode_accurate', language)}</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={{
                            fontFamily: 'Tajawal-Regular',
                            color: scanMode === 'accurate' ? COLORS.warning : COLORS.accentGreen,
                            fontSize: 13,
                            textAlign: 'center',
                            marginBottom: 0,
                            alignSelf: 'center'
                        }}>
                            {scanMode === 'accurate'
                                ? t('oilguard_mode_accurate_note', language)
                                : t('oilguard_mode_fast_note', language)}
                        </Text>
                    </View>

                    <TouchableOpacity activeOpacity={0.7}
                        onPress={handleOCR}
                        disabled={(!left.sourceData && !left.catalogProduct) || (!right.sourceData && !right.catalogProduct)}
                        style={[
                            globalStyles.primaryActionBtn, 
                            ((!left.sourceData && !left.catalogProduct) || (!right.sourceData && !right.catalogProduct)) && { opacity: 0.5 }
                        ]}
                    >
                        <LinearGradient
                            colors={[String(COLORS.accentGreen), String(COLORS.accentGreen) + 'BF']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={globalStyles.primaryActionGradient}
                        >
                            <View style={globalStyles.iconCircle}>
                                <Ionicons name="flask" size={28} color={COLORS.textOnAccent} />
                            </View>
                            <View>
                                <Text style={[globalStyles.primaryActionTitle, { color: COLORS.textOnAccent }]}>{t('comp_start_btn_title', language)}</Text>
                                <Text style={[globalStyles.primaryActionSub, { color: COLORS.textOnAccent + 'CC' }]}>{t('comp_start_btn_sub', language)}</Text>
                            </View>
                            <Ionicons name="chevron-back" size={24} color={COLORS.textOnAccent} style={{ opacity: 0.6, marginRight: 'auto' }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </LinearGradient>
            </StaggeredItem>
        </View>
    );

    const renderClaimsStep = () => {
        const displayedClaims = searchQuery
            ? fuse.search(searchQuery).map(result => result.item)
            : claimsForType;

        const EXPANDED_HEADER_HEIGHT = 160;
        const COLLAPSED_HEADER_HEIGHT = Platform.OS === 'android' ? 60 : 90;
        const SEARCH_BAR_HEIGHT = 70;
        const HEADER_ANIMATION_DISTANCE = EXPANDED_HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT;

        const headerTranslateY = scrollY.interpolate({
            inputRange: [0, HEADER_ANIMATION_DISTANCE],
            outputRange: [0, -HEADER_ANIMATION_DISTANCE],
            extrapolate: 'clamp',
        });

        const expandedHeaderOpacity = scrollY.interpolate({
            inputRange: [0, HEADER_ANIMATION_DISTANCE / 2],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        const collapsedHeaderOpacity = scrollY.interpolate({
            inputRange: [HEADER_ANIMATION_DISTANCE / 2, HEADER_ANIMATION_DISTANCE],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        });

        const fabTranslateY = fabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [150, 0],
        });
        const fabScale = fabPulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.1]
        });

        return (
            <View style={{ flex: 1, width: '100%' }}>
                <Animated.FlatList
                    data={displayedClaims}
                    renderItem={renderClaimItem}
                    keyExtractor={(item) => item}
                    extraData={claims} 

                    initialNumToRender={12}     
                    maxToRenderPerBatch={10}    
                    windowSize={5}              
                    removeClippedSubviews={true} 
                    getItemLayout={getItemLayout} 
                    updateCellsBatchingPeriod={50} 

                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingTop: EXPANDED_HEADER_HEIGHT + SEARCH_BAR_HEIGHT,
                        paddingBottom: 120,
                        paddingHorizontal: 12,
                        gap: 12 
                    }}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                />

                <Animated.View style={[styles.fixedHeaderBlock, {
                    height: EXPANDED_HEADER_HEIGHT + SEARCH_BAR_HEIGHT,
                    transform: [{ translateY: headerTranslateY }],
                }]}>
                    <View style={styles.headerBackdrop} />

                    <Animated.View style={[styles.expandedHeader, { opacity: expandedHeaderOpacity }]}>
                        <Text style={globalStyles.heroTitle}>{t('comp_claims_header', language)}</Text>
                        <Text style={globalStyles.heroSub}>{t('comp_claims_subtitle', language)}</Text>
                    </Animated.View>

                    <Animated.View style={[styles.collapsedHeader, { opacity: collapsedHeaderOpacity }]}>
                        <SafeAreaView>
                            <View style={globalStyles.headerContent}>
                                <TouchableOpacity onPress={() => changeStep(step - 1)} style={globalStyles.backBtn}>
                                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                                <Text style={styles.collapsedHeaderText}>{t('comp_claims_header', language)}</Text>
                                <View style={{ width: 40 }} />
                            </View>
                        </SafeAreaView>
                    </Animated.View>

                    <View style={styles.claimsSearchContainer}>
                        <View style={styles.searchInputWrapper}>
                            <FontAwesome5 name="search" size={18} color={COLORS.textDim} style={styles.searchIcon} />
                            <TextInput
                                style={styles.claimsSearchInput}
                                placeholder={t('oilguard_claims_search_placeholder', language)}
                                placeholderTextColor={COLORS.textDim}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                    </View>
                </Animated.View>

                <View style={styles.fabContainer}>
                    <Animated.View
                        style={{
                            transform: [{ translateY: fabTranslateY }],
                        }}
                    >
                        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
                            <TouchableOpacity
                                onPress={handleEval}
                                style={globalStyles.fab}
                                activeOpacity={0.7}
                            >
                                <FontAwesome5 name="balance-scale" color={COLORS.darkGreen} size={32} />
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
                </View>
            </View>
        );
    };

    // ============================================================================
    // renderResults — cleaner, more spacious hero: fewer competing borders,
    // clearer rhythm between the verdict, the profile duel, the metrics and the
    // personal match, so the comparison reads calmly top to bottom.
    // ============================================================================
    const renderResults = () => {
        if (!left.analysisData || !right.analysisData) return null;

        const sA = left.analysisData?.oilGuardScore || 0;
        const sB = right.analysisData?.oilGuardScore || 0;
        const winner = Math.abs(sA - sB) < 5 ? 'tie' : (sA > sB ? 'left' : 'right');
        const winnerColor = winner === 'left' ? PROD_COLORS.A : (winner === 'right' ? PROD_COLORS.B : COLORS.gold);

        const labelA = left.catalogProduct?.name || left.catalogProduct?.productName || left.productName || left.catalogProduct?.brand || left.brand || t('comp_slot_a', language);
        const labelB = right.catalogProduct?.name || right.catalogProduct?.productName || right.productName || right.catalogProduct?.brand || right.brand || t('comp_slot_b', language);

        return (
            <ScrollView contentContainerStyle={[globalStyles.scrollContent, { paddingTop: 14, paddingHorizontal: 10, paddingBottom: 110, gap: 12 }]} showsVerticalScrollIndicator={false}>

                {/* 1. HERO VERDICT, INTEGRATED METRICS & PERSONAL MATCH */}
                <StaggeredItem index={0}>
                    <View style={[styles.heroWinnerCard, { borderColor: winnerColor + '55' }]}>

                        {/* Winner Banner */}
                        <View style={[styles.winnerBanner, { backgroundColor: winnerColor + '1F' }]}>
                            <View style={[styles.winnerIconCircle, { backgroundColor: winnerColor + '26' }]}>
                                <FontAwesome5 name="trophy" color={winnerColor} size={16} />
                            </View>
                            <Text style={[styles.winnerText, { color: winnerColor }]}>
                                {winner === 'tie' ? t('comp_tie', language) : t(winner === 'left' ? 'comp_winner_a' : 'comp_winner_b', language)}
                            </Text>
                        </View>

                        <Text style={styles.heroCategoryText}>
                            {(() => {
                                const matchedType = PRODUCT_TYPES.find(pt => pt.id === productType);
                                return matchedType?.labelKey 
                                    ? t(matchedType.labelKey, language) 
                                    : (matchedType?.label || t(`product_type_${productType}`, language) || productType);
                            })()}
                        </Text>

                        {/* Side by Side Profiles */}
                        <View style={styles.heroProfilesRow}>

                            {/* Product A (Right physically) */}
                            <View style={styles.heroProfileCol}>
                                <View style={[styles.heroProfileImgWrap, winner === 'left' && { borderColor: PROD_COLORS.A }]}>
                                    <Image source={{ uri: left.sourceData }} style={styles.heroProfileImg} />
                                </View>
                                <Text style={[styles.heroProfileScore, { color: PROD_COLORS.A }]}>{Math.round(sA)}%</Text>
                                <Text style={styles.heroProfileVerdict} numberOfLines={2}>
                                    {left.analysisData.finalVerdict || t('comp_verdict_good', language)}
                                </Text>
                            </View>

                            {/* Divider Line / VS */}
                            <View style={styles.heroVsDivider}>
                                <View style={styles.heroVsCircle}>
                                    <Text style={styles.heroVsText}>VS</Text>
                                </View>
                            </View>

                            {/* Product B (Left physically) */}
                            <View style={styles.heroProfileCol}>
                                <View style={[styles.heroProfileImgWrap, winner === 'right' && { borderColor: PROD_COLORS.B }]}>
                                    <Image source={{ uri: right.sourceData }} style={styles.heroProfileImg} />
                                </View>
                                <Text style={[styles.heroProfileScore, { color: PROD_COLORS.B }]}>{Math.round(sB)}%</Text>
                                <Text style={styles.heroProfileVerdict} numberOfLines={2}>
                                    {right.analysisData.finalVerdict || t('comp_verdict_good', language)}
                                </Text>
                            </View>

                        </View>

                                                {/* Section Divider */}
                        <View style={styles.heroSectionDivider} />

                        {/* Integrated Metrics */}
                        <View style={styles.heroMetricsSection}>
                            <View style={styles.heroMetricsList}>
                                <MetricDuelRow
                                    label={t('oilguard_stat_safety', language)} icon="shield-alt"
                                    scoreA={left.analysisData.safety?.score || 0}
                                    scoreB={right.analysisData.safety?.score || 0}
                                />
                                <MetricDuelRow
                                    label={t('oilguard_stat_efficacy', language)} icon="flask"
                                    scoreA={left.analysisData.efficacy?.score || 0}
                                    scoreB={right.analysisData.efficacy?.score || 0}
                                />
                            </View>
                        </View>

                        {/* Section Divider */}
                        <View style={styles.heroSectionDivider} />

                        {/* INTEGRATED Personal Match Breakdown */}
                        <ComparisonMatchBreakdown 
                            leftProd={left} 
                            rightProd={right} 
                            leftLabel={labelA}
                            rightLabel={labelB}
                            language={language} 
                        />
                    </View>
                </StaggeredItem>

                {/* 2. MARKETING CLAIMS */}
                <StaggeredItem index={1}>
                    <MarketingClaimsSection
                        leftClaims={left.analysisData.marketing_results}
                        rightClaims={right.analysisData.marketing_results}
                        leftProduct={left}
                        rightProduct={right}
                        language={language}
                    />
                </StaggeredItem>

                {/* 3. RESET */}
                <StaggeredItem index={2}>
                    <TouchableOpacity activeOpacity={0.7} onPress={resetAll} style={styles.resetBtn}>
                        <Text style={styles.resetText}>{t('comp_reset_btn', language)}</Text>
                        <FontAwesome5 name="redo" color={COLORS.textSecondary} size={14} />
                    </TouchableOpacity>
                </StaggeredItem>

            </ScrollView>
        );
    };

    return (
        <View style={globalStyles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <View style={styles.darkOverlay} />
            {particles.map((p) => <Spore key={p.id} {...p} />)}

            {step > 0 && step !== 1 && step !== 3 && step !== 4 && (
                <View style={[globalStyles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => changeStep(step - 1)} style={globalStyles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ width: 40 }} />
                </View>
            )}

            <View style={{ flex: 1, width: '100%', alignItems: 'center' }}>

                <Animated.View style={{
                    flex: 1,
                    width: '100%',
                    alignItems: 'center',
                    opacity: contentOpacity,
                    transform: [{ translateX: contentTranslateX }]
                }}>

                    {step === 0 && renderArena()}

                    {(step === 1 || step === 4) && (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                            <LoadingScreen />
                            <Text style={styles.loadingLabel}>{loadingText}</Text>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={{
                            flex: 1,
                            width: '100%',
                            paddingHorizontal: 20,
                            paddingTop: Platform.OS === 'android' ? 90 : 100
                        }}>
                            <ReviewStep
                                productType={productType}
                                setProductType={setProductType}
                                onConfirm={() => changeStep(3)}
                            />
                        </View>
                    )}

                    {step === 3 && renderClaimsStep()}

                    {step === 5 && renderResults()}

                </Animated.View>
            </View>
        </View>
    );
}

const createComparisonStyles = (COLORS) => StyleSheet.create({
    darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.0)' },

    arenaSlotsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: CARD_WIDTH,
        height: 250,
        marginTop: 20
    },
    slotCard: {
        width: '46%',
        height: '100%',
        backgroundColor: COLORS.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    slotImage: { width: '100%', height: '100%', borderRadius: 24, position: 'absolute' },
    slotPlaceholder: { alignItems: 'center', gap: 12 },
    dashedIconCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.textSecondary, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
    slotLabel: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, fontSize: 14 },
    vsBadge: { position: 'absolute', left: '50%', marginLeft: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.gold, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
    vsText: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.gold },
    slotBadge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 2 },
    slotBadgeText: { fontFamily: 'Tajawal-Bold', color: '#FFF', fontSize: 11 },
    removeBtn: { position: 'absolute', top: 10, left: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    pinnedBottomDock: {
        width: '100%',
        marginTop: 'auto',
    },

    // --- EXACT CLAIMS STYLES FROM OILGUARD.JS ---
    fixedHeaderBlock: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 51,
        justifyContent: 'flex-end',
        paddingBottom: 15,
    },
    headerBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.background + 'F2',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
    },
    expandedHeader: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 50 : 60,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    collapsedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    collapsedHeaderText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 20,
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'center',
    },
    claimsSearchContainer: {
        paddingHorizontal: 16,
        width: '100%',
        zIndex: 51,
    },
    searchInputWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        paddingHorizontal: 15,
        height: 55,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    claimsSearchInput: {
        flex: 1,
        fontFamily: 'Tajawal-Regular',
        fontSize: 15,
        color: COLORS.textPrimary,
        height: '100%',
        marginRight: 10,
        textAlign: 'right'
    },
    fabContainer: {
        position: 'absolute',
        bottom: 60,
        alignSelf: 'center',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // --- NEW HERO RESULTS DESIGN (cleaner, more spacious, calmer) ---
    heroWinnerCard: {
        backgroundColor: COLORS.card,
        borderRadius: 28,
        borderWidth: 1, // Increased border width for big sections
        width: '100%',
        paddingVertical: 16,
        marginTop: 8,
        marginBottom: 0, // Remove bottom margin to close the gap
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 4
    },
    winnerBanner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10
    },
    winnerIconCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    winnerText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 19,
        letterSpacing: 0.2,
    },
    heroCategoryText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.textDim,
        textAlign: 'center',
        marginTop: 18,
        marginBottom: 26,
        letterSpacing: 0.8,
        textTransform: 'uppercase'
    },
    heroProfilesRow: {
        flexDirection: 'row-reverse', // Ensures A is Right, B is Left naturally
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 12
    },
    heroProfileCol: {
        alignItems: 'center',
        flex: 1,
        gap: 8
    },
    heroProfileImgWrap: {
        width: 104,
        height: 104,
        borderRadius: 30,
        padding: 3,
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: 'rgba(255,255,255,0.04)'
    },
    heroProfileImg: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    heroProfileScore: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 34,
        marginTop: 10
    },
    heroProfileVerdict: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12.5,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: 4
    },
    heroVsDivider: {
        width: 1,
        height: 116,
        backgroundColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 30,
        marginTop: 6
    },
    heroVsCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.background,
        borderWidth: 1.5,
        borderColor: COLORS.gold,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroVsText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 11,
        color: COLORS.gold,
        letterSpacing: 0.5
    },
    heroSectionDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        opacity: 0.6,
        marginHorizontal: 30,
        marginVertical: 12, // Reduced vertical margin to close gaps
    },
    heroMetricsSection: {
        paddingHorizontal: 12,
        paddingVertical: 8, // Reduced padding to save space
    },
    heroSectionLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.textDim,
        letterSpacing: 0.4
    },
    heroMetricsList: {
        gap: 26,
        marginTop: 18
    },

    // --- GENERIC STYLES ---
    // Sliding pill switch (A/B). segmentIndicator is one continuous colored
    // pill that glides between the two halves — replaces the old two-tone
    // "both buttons filled" look with a single clear focal point.
    segmentTrack: {
        flexDirection: 'row-reverse',
        backgroundColor: 'rgba(0,0,0,0.22)',
        borderRadius: 14,
        padding: 6,
        width: '100%',
        position: 'relative',
        overflow: 'hidden'
    },
    segmentIndicator: {
        position: 'absolute',
        top: 6,
        bottom: 6,
        right: 6,
        borderRadius: 10,
        zIndex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3
    },
    segmentBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    segmentText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary },
    segmentTextActive: { color: '#FFF' },

    duelContainer: { marginBottom: 0 },
    duelHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    duelScore: { fontFamily: 'Tajawal-ExtraBold', fontSize: 17, width: 48 },
    duelLabelBox: { alignItems: 'center' },
    duelLabel: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textSecondary },
    duelTrackContainer: { height: 16, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, overflow: 'hidden', width: '100%' },
    duelDivider: { width: 0 },
    duelBar: { height: '100%' },

    loadingLabel: { position: 'absolute', bottom: 100, width: '100%', textAlign: 'center', fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen, fontSize: 16 },
    resetBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, gap: 10, marginTop: 25, width: '100%' },
    resetText: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, fontSize: 15 },

    // Evidence & Chip Styles
    evidenceGroup: {
        marginTop: 10,
        gap: 8
    },
    evidenceLabelContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6
    },
    evidenceLabelText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11
    },
    chipContainer: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 6
    },

    chipPrimary: {
        backgroundColor: COLORS.success + '1A',
        borderColor: COLORS.success + '4D',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4
    },
    chipTextPrimary: {
        color: COLORS.success,
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        textAlign: 'right'
    },
    chipBenefit: {
        color: COLORS.success + 'B3',
        fontSize: 10
    },

    chipTrace: {
        backgroundColor: COLORS.warning + '1A',
        borderColor: COLORS.warning + '4D',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4
    },
    chipTextTrace: {
        color: COLORS.warning,
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        textAlign: 'right'
    },
    chipBenefitTrace: {
        color: COLORS.warning + 'B3',
        fontSize: 10
    },
    searchIcon: {
        marginLeft: 10
    },
    tabContainer: {
        flexDirection: 'row-reverse',
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        marginBottom: 16
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent'
    },
    tabText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textSecondary
    },
    tabTextActive: {
        color: COLORS.textPrimary
    },
});