// src/components/profile/ProductDetailsSheet.js

import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity, Pressable, Image,
    Dimensions, ScrollView, Animated, Modal, ActivityIndicator, Keyboard, Easing,
    PanResponder, I18nManager
} from 'react-native';
import { FontAwesome5, Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';

import { db } from '../../config/firebase';
import { useAppContext } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { PRODUCT_TYPES } from '../../constants/productData';
import { AlertService } from '../../services/alertService';
import WathiqScoreBadge from '../common/WathiqScoreBadge';
import PremiumShareButton from '../oilguard/ShareComponent';

const { height } = Dimensions.get('window');
const PROFILE_API_URL = "https://oilguard-backend.vercel.app/api";

// 🌟 HELPER: PARSE CLAIM EVALUATION STATE (FALLBACK FOR OLD SAVED PRODUCTS) 🌟
// 🌟 100% SYNCHRONIZED WITH OILGUARD BACKEND (logic.js) 🌟
const getClaimEvaluation = (claimItem, analysisData) => {
    let claimText = '';
    let rawStatus = '';
    let explanation = '';

    if (typeof claimItem === 'object' && claimItem !== null) {
        claimText = claimItem.claim || claimItem.label || claimItem.name || claimItem.title || '';
        rawStatus = String(claimItem.status || claimItem.level || claimItem.verdict || claimItem.result || claimItem.state || '');
        explanation = claimItem.explanation || claimItem.details || claimItem.reason || '';
    } else {
        claimText = String(claimItem);
        
        const evaluatedList = analysisData?.marketing_results ||
            analysisData?.evaluated_claims ||
            analysisData?.claims_evaluated ||
            analysisData?.claims_verification || [];

        if (Array.isArray(evaluatedList)) {
            const match = evaluatedList.find(e => {
                const name = typeof e === 'object' ? (e.claim || e.label || e.name || e.title) : e;
                return name && String(name).trim().toLowerCase() === claimText.trim().toLowerCase();
            });

            if (match && typeof match === 'object') {
                rawStatus = String(match.status || match.level || match.verdict || match.result || match.state || '');
                explanation = match.explanation || match.details || match.reason || '';
            }
        }
    }

    let state = '';

    // 🔴 1. RED CLAIMS (Rejections / Contradictions / Illusory / Marketing Overreach)
    if (
        rawStatus.includes('تأثير وهمي') ||
        rawStatus.includes('ترطيب وهمي') ||
        rawStatus.includes('مبالغة تسويقية') ||
        rawStatus.includes('تناقض') ||
        rawStatus.includes('ادعاء مضلل') ||
        rawStatus.includes('ادعاء غير مدعوم') ||
        rawStatus.includes('ادعاء فارغ') ||
        rawStatus.includes('لا توجد مكونات مرتبطة') ||
        rawStatus.includes('❌') ||
        rawStatus.includes('🚫') ||
        rawStatus.toLowerCase().includes('rejected') ||
        rawStatus.toLowerCase().includes('false')
    ) {
        state = 'red';
    }

    // 🟡 2. YELLOW CLAIMS (Caution / Angel Dusting / Underdosed / Mixed)
    if (!state && (
        rawStatus.includes('ادعاء مختلط') ||
        rawStatus.includes('تركيز دون الفعال') ||
        rawStatus.includes('تركيز منخفض') ||
        rawStatus.includes('Angel Dusting') ||
        rawStatus.includes('حماية غير مستقرة') ||
        rawStatus.includes('جزئي') ||
        rawStatus.includes('⚠️') ||
        rawStatus.includes('⚖️') ||
        rawStatus.includes('🌿') ||
        rawStatus.toLowerCase().includes('caution') ||
        rawStatus.toLowerCase().includes('warning')
    )) {
        state = 'yellow';
    }

    // 🟢 3. GREEN CLAIMS (Supported / Verified)
    if (!state && (
        rawStatus.includes('محقق بنسبة معتبرة') ||
        rawStatus.includes('محقق بنسبة متوسطة') ||
        rawStatus.includes('✅') ||
        rawStatus.toLowerCase().includes('verified') ||
        rawStatus.toLowerCase().includes('approved') ||
        rawStatus.toLowerCase().includes('proven')
    )) {
        state = 'green';
    }

    // 🔍 4. EXPLANATION FALLBACK ANALYSIS
    if (!state && explanation) {
        const exp = explanation.toLowerCase();
        if (exp.includes('لا توجد') || exp.includes('مبالغة') || exp.includes('وهمي') || exp.includes('تناقض') || exp.includes('لا يحتوي')) {
            state = 'red';
        } else if (exp.includes('تركيز منخفض') || exp.includes('دون الفعال') || exp.includes('جزئي') || exp.includes('حذر')) {
            state = 'yellow';
        }
    }

    if (!state) state = 'green';

    return { text: claimText, state, explanation, rawStatus };
};

// ============================================================================
// FULL CLAIM ROW (MATCHES OILGUARD.JS IDENTICALLY)
// ============================================================================
const ClaimRow = ({ result, isLast }) => {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    const isRTL = I18nManager.isRTL || language === 'ar';

    const [expanded, setExpanded] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    const animController = useRef(new Animated.Value(0)).current;

    const cleanStatusText = (text) => (text ? text.toString().replace(/[✅🌿⚖️❌🚫⚠️]/g, '').trim() : '');

    const getStatusConfig = (statusRaw, confidence) => {
        const s = statusRaw ? statusRaw.toString() : '';
        
        if (s.includes('مبالغة') || s.includes('تناقض') || s.includes('لا توجد') || s.includes('فارغ') || s.includes('وهمي')) {
            return { color: C.danger, icon: 'times-circle' };
        }
        if (s.includes('محقق')) {
            return { color: C.success, icon: 'check-circle' };
        }
        if (s.includes('جزئي') || s.includes('Angel') || s.includes('تركيز') || s.includes('منخفض') || s.includes('دون الفعال')) {
            return { color: C.warning, icon: 'exclamation-circle' };
        }
        if (confidence === 'منخفضة' || confidence === 'معدومة') {
            return { color: C.danger, icon: 'times-circle' };
        }
        if (confidence === 'متوسطة') {
            return { color: C.warning, icon: 'exclamation-circle' };
        }
        return { color: C.success, icon: 'check-circle' };
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

        const name = isObj ? (item.name || 'مكون غير معروف') : item;
        const display = isObj ? (item.concentrationDisplay || (item.estimatedPct ? `~${item.estimatedPct}%` : null)) : null;
        const benefit = isObj ? item.benefit : null;
        const isTrace = isObj ? (item.isTrace ?? false) : false;
        const estimatedPct = isObj ? (item.estimatedPct || (parseFloat(display?.replace(/[^0-9.]/g, '')) || 0)) : 0;

        const isPotentActive = isObj && (
            item.isPotentMicro || 
            (display && (display.includes('فعال') || display.includes('كافٍ'))) ||
            item.dosageBadge === 'potent' ||
            item.dosageBadge === 'optimal' ||
            item.dosageBadge === 'effective'
        );

        const data = { name, display, benefit, isTrace, isPotentActive };
        const isClinicallyEffective = estimatedPct >= 1.0 || isPotentActive || (!isTrace && !isLowConcentrationClaim);

        if (isClinicallyEffective) {
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
    const hasContent = hasDetailedReasons || result?.explanation || strongEvidence.length > 0 || weakEvidence.length > 0;

    return (
        <View style={[styles.claimRowWrapper, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
            <TouchableOpacity onPress={toggle} activeOpacity={0.7} disabled={!hasContent}>
                <View style={styles.claimRowMain}>
                    <View style={styles.claimIconCol}>
                        <FontAwesome5 name={config.icon} size={18} color={config.color} />
                    </View>
                    <View style={styles.claimTextCol}>
                        <Text style={[styles.claimTextTitle, { color: C.textPrimary }]}>
                            {result?.claim || ''}
                        </Text>
                        {!!cleanStatus && (
                            <Text style={[styles.claimTextStatus, { color: config.color }]}>
                                {cleanStatus}
                            </Text>
                        )}
                    </View>
                    <View style={styles.claimArrowCol}>
                        {hasContent && (
                            <Animated.View style={{ transform: [{ rotate: rotateArrow }] }}>
                                <FontAwesome5 name="chevron-down" size={14} color={C.textDim} />
                            </Animated.View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>

            {hasContent && (
                <Animated.View style={{ height: heightInterpolate, overflow: 'hidden' }}>
                    <View
                        style={[styles.claimDetails, { position: 'absolute', width: '100%', paddingBottom: 16 }]}
                        onLayout={(e) => {
                            const h = e.nativeEvent.layout.height;
                            if (h > 0 && h !== contentHeight) setContentHeight(h);
                        }}
                    >
                        {!hasDetailedReasons && result?.explanation && (
                            <Text style={{ fontFamily: 'Tajawal-Regular', color: C.textSecondary, fontSize: 14, lineHeight: 24, textAlign: isRTL ? 'right' : 'left' }}>
                                {result.explanation}
                            </Text>
                        )}

                        {hasDetailedReasons && (
                            <View style={{ marginTop: 8, gap: 8 }}>
                                {result.reasons.map((r, i) => {
                                    let rConfig = { color: C.success, icon: 'check-circle' };
                                    if (r?.type === 'risk' || r?.type === 'negative') rConfig = { color: C.danger, icon: 'times-circle' };
                                    if (r?.type === 'caveat') rConfig = { color: C.warning, icon: 'exclamation-triangle' };

                                    return (
                                        <View key={`reason-${i}`} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8 }}>
                                            <FontAwesome5 name={rConfig.icon} size={13} color={rConfig.color} style={{ marginTop: 5 }} />
                                            <Text style={{ fontFamily: 'Tajawal-Regular', color: C.textSecondary, fontSize: 14, lineHeight: 22, textAlign: isRTL ? 'right' : 'left', flex: 1 }}>
                                                {r?.text || ''}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {Array.isArray(result?.userAdvice) && result.userAdvice.length > 0 && (
                            <View style={{ marginTop: 12 }}>
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                                    <FontAwesome5 name="lightbulb" size={14} color={C.info} />
                                    <Text style={{ fontFamily: 'Tajawal-Bold', color: C.info, fontSize: 14 }}>
                                        {isRTL ? 'ماذا أفعل؟ (نصيحة الاستخدام)' : 'What to do?'}
                                    </Text>
                                </View>
                                {result.userAdvice.map((advice, i) => (
                                    <Text key={`advice-${i}`} style={{ fontFamily: 'Tajawal-Regular', color: C.textSecondary, fontSize: 14, lineHeight: 22, textAlign: isRTL ? 'right' : 'left' }}>
                                        • {advice}
                                    </Text>
                                ))}
                            </View>
                        )}

                        {strongEvidence.length > 0 && (
                            <View style={{ marginTop: 16 }}>
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <FontAwesome5 name="check-double" size={14} color={C.success} />
                                    <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.success }}>
                                        {t('comp_essential_actives', language) || 'مكونات فعالة أساسية:'}
                                    </Text>
                                </View>
                                <View style={{ gap: 8 }}>
                                    {strongEvidence.map((ing, i) => (
                                        <Text key={`strong-${i}`} style={{ fontFamily: 'Tajawal-Regular', fontSize: 14, color: C.textSecondary, textAlign: isRTL ? 'right' : 'left', lineHeight: 24 }}>
                                            <Text style={{ color: C.success }}>• </Text>
                                            <Text style={{ color: C.textPrimary, fontFamily: 'Tajawal-Bold' }}>{ing.name}</Text>
                                            {ing.display && <Text style={{ fontFamily: 'Tajawal-Bold', color: C.accentGreen }}> ({ing.display})</Text>}
                                            {ing.benefit && <Text style={{ color: C.textDim }}> — {ing.benefit}</Text>}
                                        </Text>
                                    ))}
                                </View>
                            </View>
                        )}

                        {weakEvidence.length > 0 && (
                            <View style={{ marginTop: 16 }}>
                                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <FontAwesome5 name="exclamation-triangle" size={14} color={C.warning} />
                                    <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.warning }}>
                                        {t('comp_secondary_traces', language) || 'تراكيز ثانوية / منخفضة:'}
                                    </Text>
                                </View>
                                <View style={{ gap: 8 }}>
                                    {weakEvidence.map((ing, i) => (
                                        <Text key={`weak-${i}`} style={{ fontFamily: 'Tajawal-Regular', fontSize: 14, color: C.textSecondary, textAlign: isRTL ? 'right' : 'left', lineHeight: 24 }}>
                                            <Text style={{ color: C.warning }}>• </Text>
                                            <Text style={{ color: C.textPrimary, fontFamily: 'Tajawal-Bold' }}>{ing.name}</Text>
                                            {ing.display && <Text style={{ fontFamily: 'Tajawal-Bold', color: C.warning }}> ({ing.display})</Text>}
                                            {ing.benefit && <Text style={{ color: C.textDim }}> — {ing.benefit}</Text>}
                                        </Text>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                </Animated.View>
            )}
        </View>
    );
};

// ============================================================================
// MAIN COMPONENT 
// ============================================================================
const ProductDetailsSheet = ({ product, isVisible, onClose, onDelete }) => {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    
    // Animation & Gesture Controllers
    const animController = useRef(new Animated.Value(0)).current;
    const panY = useRef(new Animated.Value(0)).current;
    const scrollOffset = useRef(0);

    // State
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isRescanning, setIsRescanning] = useState(false);
    const [showAllIngredients, setShowAllIngredients] = useState(false);

    const { user, userProfile, savedProducts, setSavedProducts } = useAppContext();

    // PanResponder for drag-to-close on handle or top scroll offset
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 8 && scrollOffset.current <= 0;
            },
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                return gestureState.dy > 8 && scrollOffset.current <= 0;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    panY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 110 || gestureState.vy > 0.5) {
                    handleClose();
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 4,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(panY, {
                    toValue: 0,
                    useNativeDriver: true,
                    bounciness: 4,
                }).start();
            },
        })
    ).current;

    useEffect(() => {
        if (isVisible && product) {
            setEditedName(product.productName || '');
            setIsEditing(false);
            setShowAllIngredients(false);
            scrollOffset.current = 0;
            panY.setValue(0);

            Animated.spring(animController, {
                toValue: 1,
                damping: 18,
                stiffness: 120,
                useNativeDriver: true,
            }).start();
        } else if (!isVisible) {
            Animated.timing(animController, {
                toValue: 0,
                duration: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        }
    }, [isVisible, product, animController]);

    const handleClose = () => {
        Keyboard.dismiss();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.parallel([
            Animated.timing(animController, {
                toValue: 0,
                duration: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(panY, {
                toValue: height,
                duration: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            })
        ]).start(({ finished }) => {
            if (finished) {
                panY.setValue(0);
                scrollOffset.current = 0;
                if (typeof onClose === 'function') {
                    onClose();
                }
            }
        });
    };

    const handleSaveName = async () => {
        if (!editedName.trim()) return;
        if (editedName.trim() === product?.productName) { setIsEditing(false); return; }

        setIsSaving(true);
        try {
            const productRef = doc(db, 'profiles', user.uid, 'savedProducts', product.id);
            await updateDoc(productRef, { productName: editedName.trim() });

            const updatedList = savedProducts.map(p =>
                p.id === product.id ? { ...p, productName: editedName.trim() } : p
            );
            setSavedProducts(updatedList);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsEditing(false);
        } catch (error) {
            AlertService.error(t('status_error', language), t('error_update_name', language));
        } finally {
            setIsSaving(false);
        }
    };

    const handleRescanProduct = async () => {
        setIsRescanning(true);
        try {
            const rawIngredients = product?.analysisData?.raw_ingredients_list ||
                [...(product?.analysisData?.detected_ingredients || []).map(ing => typeof ing === 'object' && ing !== null ? ing.name : ing), ...(product?.analysisData?.unknown_ingredients || [])];

            const response = await fetch(`${PROFILE_API_URL}/evaluate.js`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ingredients_list: rawIngredients,
                    product_type: product?.productType || product?.analysisData?.product_type || 'other',
                    selected_claims: product?.marketingClaims || [],
                    user_profile: userProfile?.settings || {}
                })
            });

            if (response.ok) {
                const newAnalysisData = await response.json();
                const productRef = doc(db, 'profiles', user.uid, 'savedProducts', product.id);
                await updateDoc(productRef, { analysisData: newAnalysisData });

                const updatedList = savedProducts.map(p =>
                    p.id === product.id ? { ...p, analysisData: newAnalysisData } : p
                );
                setSavedProducts(updatedList);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                AlertService.success(t('rescan_success_title', language) || "Success", t('rescan_success_msg', language) || `Product successfully rescanned`);
                onClose();
            } else {
                throw new Error("Failed to evaluate");
            }
        } catch (err) {
            console.error("Rescan Error:", err);
            AlertService.error(t('rescan_failed_title', language) || "Error", t('rescan_failed_msg', language) || "Failed to rescan product.");
        } finally {
            setIsRescanning(false);
        }
    };

    const handleDeletePress = () => {
        AlertService.confirm(
            t('delete_product_title', language),
            t('delete_product_confirm', language),
            async () => {
                Animated.timing(animController, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => {
                    if (typeof onClose === 'function') onClose();
                    setTimeout(() => {
                        if (typeof onDelete === 'function') onDelete(product.id);
                    }, 250);
                });
            }
        );
    };

    const getAlertStyle = (type) => {
        const safeType = type ? type.toLowerCase() : 'info';
        switch (safeType) {
            case 'risk': case 'danger': case 'critical':
                return { bg: C.danger + '20', border: C.danger, text: C.danger, icon: 'exclamation-circle' };
            case 'caution': case 'warning':
                return { bg: C.warning + '20', border: C.warning, text: C.warning, icon: 'exclamation-triangle' };
            case 'good': case 'success':
                return { bg: C.success + '20', border: C.success, text: C.success, icon: 'check-circle' };
            default:
                return { bg: C.info + '20', border: C.info, text: C.info, icon: 'info-circle' };
        }
    };

    const entryTranslateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const combinedTranslateY = Animated.add(entryTranslateY, panY);
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.75] });

    if (!product || !isVisible) return null;

    const productImage = product?.productImage;
    const {
        oilGuardScore = 0,
        finalVerdict = t('status_unknown', language),
        product_type = 'other',
        detected_ingredients = [],
        unknown_ingredients = [],
        user_specific_alerts = [],
        safety = { score: 0 },
        efficacy = { score: 0 },
        marketing_results
    } = product?.analysisData || {};

    const scoreColor = oilGuardScore >= 80 ? C.success : oilGuardScore >= 65 ? C.warning : C.danger;
    const typeObj = PRODUCT_TYPES.find(tObj => tObj.id === product_type);
    const typeLabel = typeObj ? t(typeObj.labelKey, language) : t('product_fallback_label', language);

    // 🌟 MARKETING CLAIMS 🌟
    // Support new detailed object array vs old fallback strings
    const hasRichClaims = Array.isArray(marketing_results) && marketing_results.length > 0;
    const fallbackClaimsList = (() => {
        const rawClaims = product?.marketingClaims ||
            product?.analysisData?.marketingClaims ||
            product?.analysisData?.evaluated_claims ||
            product?.analysisData?.claims_evaluated ||
            product?.analysisData?.selected_claims || [];
        return Array.isArray(rawClaims) ? rawClaims.filter(Boolean) : [];
    })();

    const efficacyVal = typeof efficacy === 'object' ? efficacy.score : efficacy;
    const safetyVal = typeof safety === 'object' ? safety.score : safety;

    const allIngs = [...detected_ingredients, ...unknown_ingredients.map(u => ({ name: u, isUnknown: true }))];
    const visibleIngs = showAllIngredients ? allIngs : allIngs.slice(0, 12);

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            {/* BACKDROP */}
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            {/* SHEET CONTAINER */}
            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: combinedTranslateY }] }]}>
                <View 
                    style={[styles.sheetContent, { backgroundColor: C.card, borderColor: C.border }]}
                    {...panResponder.panHandlers}
                >
                    
                    {/* HANDLE BAR */}
                    <TouchableOpacity
                        style={[styles.sheetHandleBar, { backgroundColor: 'transparent' }]}
                        onPress={handleClose}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.sheetHandle, { backgroundColor: C.textSecondary }]} />
                        <Text style={[styles.pullDownHintText, { color: C.textSecondary }]}>
                            {t('pull_to_close', language) || "انقر هنا أو اسحب لأسفل للإغلاق"}
                        </Text>
                    </TouchableOpacity>

                    {/* SCROLLABLE CONTENT */}
                    <ScrollView 
                        contentContainerStyle={styles.scrollPadding} 
                        showsVerticalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onScroll={(e) => {
                            scrollOffset.current = Math.max(0, e.nativeEvent.contentOffset.y);
                        }}
                    >
                        
                        {/* 1. FRAMELESS HEADER ROW */}
                        <View style={styles.framelessHeaderRow}>
                            <View style={styles.leftScoreWrap}>
                                <WathiqScoreBadge score={oilGuardScore} size={58} />
                            </View>

                            <View style={styles.centerTitleWrap}>
                                {isEditing ? (
                                    <View style={styles.editRow}>
                                        <TextInput
                                            value={editedName}
                                            onChangeText={setEditedName}
                                            style={[styles.editInputBigger, { color: C.textPrimary, backgroundColor: C.inputBg, borderColor: C.accentGreen }]}
                                            autoFocus
                                        />
                                        <TouchableOpacity onPress={handleSaveName} disabled={isSaving} style={[styles.saveBtn, { backgroundColor: C.accentGreen }]}>
                                            {isSaving ? <ActivityIndicator size="small" color={C.textOnAccent} /> : <FontAwesome5 name="check" size={13} color={C.textOnAccent} />}
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => setIsEditing(false)} style={[styles.cancelBtn, { backgroundColor: C.inputBg }]}>
                                            <FontAwesome5 name="times" size={13} color={C.textPrimary} />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.titleRow}>
                                        <Text style={[styles.productTitleBigger, { color: C.textPrimary }]} numberOfLines={2}>{product.productName}</Text>
                                        <TouchableOpacity onPress={() => setIsEditing(true)} style={[styles.inlineEditBtn, { backgroundColor: C.accentGreen + '20' }]}>
                                            <Feather name="edit-2" size={15} color={C.accentGreen} />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View style={styles.typeTagInline}>
                                    <FontAwesome5 name={typeObj?.icon || 'tag'} size={11} color={C.accentGreen} />
                                    <Text style={[styles.typeTextBigger, { color: C.accentGreen }]}>{typeLabel}</Text>
                                </View>
                            </View>

                            <View style={styles.rightThumbnailWrap}>
                                {productImage ? (
                                    <Image source={{ uri: productImage }} style={[styles.productThumbnailBigger, { borderColor: C.border }]} resizeMode="cover" />
                                ) : (
                                    <View style={[styles.productIconFallbackBigger, { borderColor: scoreColor, backgroundColor: C.inputBg }]}>
                                        <FontAwesome5 name={typeObj?.icon || 'tint'} size={24} color={scoreColor} />
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* 2. VERDICT & PILLARS STRIP */}
                        <View style={[styles.framelessVerdictBar, { borderBottomColor: C.border, borderTopColor: C.border }]}>
                            <View style={styles.verdictLeftBox}>
                                <Text style={[styles.verdictTextBigger, { color: scoreColor }]}>{finalVerdict}</Text>
                            </View>
                            
                            <View style={styles.pillarsRightBox}>
                                <View style={styles.pillarItem}>
                                    <FontAwesome5 name="magic" size={13} color={C.accentGreen} />
                                    <Text style={[styles.pillarLabelBigger, { color: C.textSecondary }]}>{t('oilguard_stat_efficacy', language)}</Text>
                                    <Text style={[styles.pillarValueBigger, { color: C.textPrimary }]}>{efficacyVal}%</Text>
                                </View>
                                <View style={[styles.pillarDivider, { backgroundColor: C.border }]} />
                                <View style={styles.pillarItem}>
                                    <FontAwesome5 name="shield-alt" size={13} color={C.gold} />
                                    <Text style={[styles.pillarLabelBigger, { color: C.textSecondary }]}>{t('oilguard_stat_safety', language)}</Text>
                                    <Text style={[styles.pillarValueBigger, { color: C.textPrimary }]}>{safetyVal}%</Text>
                                </View>
                            </View>
                        </View>

                        {/* 3. ACTION BAR */}
                        <View style={styles.actionsInlineRow}>
                            <TouchableOpacity onPress={handleDeletePress} style={[styles.inlineDeleteBtn, { backgroundColor: C.danger + '18', borderColor: C.danger + '40' }]}>
                                <FontAwesome5 name="trash-alt" size={13} color={C.danger} />
                                <Text style={[styles.inlineDeleteText, { color: C.danger }]}>{t('action_delete', language) || "حذف"}</Text>
                            </TouchableOpacity>

                            <View style={{ flex: 1 }}>
                                <PremiumShareButton
                                    analysis={product.analysisData}
                                    product={product}
                                    typeLabel={typeLabel}
                                    customStyle={[styles.inlineShareBtn, { backgroundColor: C.accentGreen + '18', borderColor: C.accentGreen + '40' }]}
                                    iconSize={13}
                                    textColor={C.accentGreen}
                                />
                            </View>
                        </View>

                        {/* 4. USER SPECIFIC ALERTS */}
                        {user_specific_alerts.length > 0 && (
                            <View style={styles.sectionBlock}>
                                <Text style={[styles.sectionTitleBigger, { color: C.textPrimary }]}>{t('profile_analysis_user_notes', language)}</Text>
                                {user_specific_alerts.map((alert, i) => {
                                    const isObj = typeof alert === 'object' && alert !== null;
                                    const alertText = isObj ? alert.text : alert;
                                    const alertType = isObj ? alert.type : 'info';
                                    const style = getAlertStyle(alertType);
                                    return (
                                        <View key={i} style={[styles.alertRowBanner, {  borderRightColor: style.border }]}>
                                            <FontAwesome5 name={style.icon} size={15} color={style.text} />
                                            <Text style={[styles.alertRowText, { color: style.text }]}>{alertText}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* 🌟 5. EVALUATED CLAIMS & FEATURES (FULL DETAILED ROW VIEW) 🌟 */}
                        {(hasRichClaims || fallbackClaimsList.length > 0) && (
                            <View style={styles.sectionBlock}>
                                <View style={styles.sectionTitleRow}>
                                    <MaterialCommunityIcons name="check-decagram" size={18} color={C.accentGreen} />
                                    <Text style={[styles.sectionTitleBigger, { color: C.textPrimary }]}>
                                        {t('product_claims_title', language) || "الادعاءات والخصائص والفوائد"}
                                    </Text>
                                </View>

                                <View style={[styles.claimsContainer, { backgroundColor: C.card, borderColor: C.border }]}>
                                    {hasRichClaims ? (
                                        [...marketing_results].sort((a, b) => {
                                            const getScore = (item) => {
                                                const s = item?.status ? item.status.toString() : '';
                                                if (s.includes('محقق بنسبة معتبرة')) return 5;
                                                if (s.includes('محقق بنسبة متوسطة')) return 4;
                                                if (s.includes('جزئي') || s.includes('Angel') || s.includes('تركيز')) return 3;
                                                if (s.includes('مبالغة') || s.includes('تناقض') || s.includes('لا توجد') || s.includes('فارغ')) return 1;
                                                return 2;
                                            };
                                            return getScore(b) - getScore(a);
                                        }).map((res, idx, arr) => (
                                            <ClaimRow
                                                key={`claim-${idx}`}
                                                result={res}
                                                isLast={idx === arr.length - 1}
                                            />
                                        ))
                                    ) : (
                                        fallbackClaimsList.map((claim, idx, arr) => {
                                            const { text, state } = getClaimEvaluation(claim, product?.analysisData);
                                            // Provide dummy object matching modern format
                                            const mockResult = {
                                                claim: text,
                                                status: state === 'green' ? 'محقق بنسبة معتبرة' : state === 'yellow' ? 'محقق بنسبة متوسطة' : 'مبالغة تسويقية',
                                                confidence: '',
                                            };
                                            return (
                                                <ClaimRow
                                                    key={`claim-fallback-${idx}`}
                                                    result={mockResult}
                                                    isLast={idx === arr.length - 1}
                                                />
                                            );
                                        })
                                    )}
                                </View>
                            </View>
                        )}

                        {/* 6. DETECTED INGREDIENTS */}
                        <View style={styles.sectionBlock}>
                            <View style={styles.sectionTitleRow}>
                                <FontAwesome5 name="flask" size={15} color={C.accentGreen} />
                                <Text style={[styles.sectionTitleBigger, { color: C.textPrimary }]}>
                                    {t('sheet_detected_ingredients', language)} ({allIngs.length})
                                </Text>
                            </View>

                            <View style={styles.ingredientsGrid}>
                                {visibleIngs.map((ing, i) => {
                                    const isUnk = typeof ing === 'object' && ing.isUnknown;
                                    const ingName = (typeof ing === 'object' && ing !== null) ? ing.name : ing;
                                    return (
                                        <View
                                            key={`ing-${i}`}
                                            style={[
                                                styles.ingTagBigger,
                                                { backgroundColor: 'transparent', borderColor: 'transparent' },
                                                isUnk && { backgroundColor: C.warning + '18', borderColor: C.warning + '50', borderStyle: 'dashed' }
                                            ]}
                                        >
                                            <Text style={[styles.ingTextBigger, { color: isUnk ? C.warning : C.textPrimary }]}>
                                                {ingName}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>

                            {allIngs.length > 12 && (
                                <TouchableOpacity onPress={() => setShowAllIngredients(!showAllIngredients)} style={styles.toggleBtn}>
                                    <Text style={[styles.toggleBtnText, { color: C.accentGreen }]}>
                                        {showAllIngredients ? (t('show_less', language) || "عرض أقل") : `+${allIngs.length - 12} ${t('show_more', language) || "عرض كل المكونات"}`}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* 7. RESCAN BUTTON IF UNKNOWN INGREDIENTS EXIST */}
                        {unknown_ingredients.length > 0 && (
                            <TouchableOpacity
                                style={[styles.rescanBtnBigger, { backgroundColor: C.accentGreen }]}
                                onPress={handleRescanProduct}
                                disabled={isRescanning}
                                activeOpacity={0.8}
                            >
                                {isRescanning ? (
                                    <ActivityIndicator color={C.textOnAccent} size="small" />
                                ) : (
                                    <>
                                        <FontAwesome5 name="sync" size={15} color={C.textOnAccent} />
                                        <Text style={[styles.rescanBtnTextBigger, { color: C.textOnAccent }]}>
                                            {t('rescan_all', language) || "إعادة تحليل المكونات غير المعروفة"}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        {/* CLOSE BOTTOM ACTION */}
                        <TouchableOpacity onPress={handleClose} style={[styles.closeBottomBtn, { backgroundColor: C.inputBg, borderColor: C.border }]} activeOpacity={0.85}>
                            <Text style={[styles.closeBottomText, { color: C.textPrimary }]}>{t('sheet_close', language) || "إغلاق الشاشة"}</Text>
                        </TouchableOpacity>

                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
        zIndex: 99,
    },
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.86,
        zIndex: 100,
        justifyContent: 'flex-end',
    },
    sheetContent: {
        flex: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        borderWidth: 1,
        borderBottomWidth: 0,
        overflow: 'hidden',
        elevation: 25,
    },
    
    /* HANDLE BAR */
    sheetHandleBar: {
        paddingTop: 12,
        paddingBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    sheetHandle: {
        width: 50,
        height: 5,
        borderRadius: 10,
        marginBottom: 4,
        opacity: 0.6,
    },
    pullDownHintText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        opacity: 0.8,
    },
    scrollPadding: {
        paddingHorizontal: 12,
        paddingBottom: 40,
        paddingTop: 6,
    },

    /* FRAMELESS HEADER ROW */
    framelessHeaderRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        gap: 10,
    },
    leftScoreWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerTitleWrap: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    productTitleBigger: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 21,
        textAlign: 'right',
        flex: 1,
        lineHeight: 26,
    },
    inlineEditBtn: {
        padding: 5,
        borderRadius: 8,
    },
    editRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        width: '100%',
    },
    editInputBigger: {
        flex: 1,
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        textAlign: 'right',
    },
    saveBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeTagInline: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    typeTextBigger: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
    },
    rightThumbnailWrap: {
        width: 62,
        height: 62,
        borderRadius: 16,
        overflow: 'hidden',
    },
    productThumbnailBigger: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
        borderWidth: 1,
    },
    productIconFallbackBigger: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },

    /* FRAMELESS VERDICT & PILLARS */
    framelessVerdictBar: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        marginVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        gap: 12,
    },
    verdictLeftBox: {
        flex: 1,
    },
    verdictTextBigger: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 17,
        textAlign: 'right',
    },
    pillarsRightBox: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    pillarItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 5,
    },
    pillarLabelBigger: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
    },
    pillarValueBigger: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 16,
    },
    pillarDivider: {
        width: 1,
        height: 16,
    },

    /* ACTION BAR */
    actionsInlineRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    inlineDeleteBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    inlineDeleteText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
    },
    inlineShareBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
    },

    /* SECTION BLOCK */
    sectionBlock: {
        marginBottom: 18,
    },
    sectionTitleRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    sectionTitleBigger: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 17,
        textAlign: 'right',
    },

    /* ALERTS */
    alertRowBanner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 12,
        borderRadius: 10,
        borderRightWidth: 4,
        gap: 10,
        marginBottom: 8,
    },
    alertRowText: {
        flex: 1,
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        textAlign: 'right',
        lineHeight: 20,
    },

    /* CLAIMS ROW (NEW) */
    claimsContainer: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    claimRowWrapper: {
        backgroundColor: 'transparent',
    },
    claimRowMain: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 10,
        gap: 10,
    },
    claimIconCol: {
        width: 24,
        alignItems: 'center',
    },
    claimTextCol: {
        flex: 1,
        alignItems: 'flex-end',
    },
    claimTextTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        textAlign: 'right',
    },
    claimTextStatus: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        textAlign: 'right',
        marginTop: 2,
    },
    claimArrowCol: {
        width: 24,
        alignItems: 'center',
    },
    claimDetails: {
        paddingHorizontal: 12,
        paddingBottom: 16,
    },

    /* INGREDIENTS */
    ingredientsGrid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 8,
    },
    ingTagBigger: {
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderRadius: 10,
        borderWidth: 1,
    },
    ingTextBigger: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
    },
    toggleBtn: {
        marginTop: 8,
        alignSelf: 'flex-end',
        paddingVertical: 4,
    },
    toggleBtnText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 13,
    },

    /* BOTTOM BUTTONS */
    rescanBtnBigger: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 6,
        marginBottom: 10,
    },
    rescanBtnTextBigger: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 14,
    },
    closeBottomBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        marginTop: 4,
    },
    closeBottomText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
    },
});

export default ProductDetailsSheet;