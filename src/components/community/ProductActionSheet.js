// ProductActionSheet.js

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, Modal, StyleSheet, Image,
    ActivityIndicator, ScrollView, LayoutAnimation, Animated, Easing,
    Dimensions, Pressable
} from 'react-native';
import { FontAwesome5, Feather, Ionicons } from '@expo/vector-icons';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';
import { reevaluateProductForUser } from '../../services/communityService';
import { getClaimsByProductType } from '../../constants/productData';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { AlertService } from '../../services/alertService';

// Full Screen Image Viewer
import FullImageViewer from '../common/FullImageViewer';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Scroll indicator
 */
const ScrollHint = ({ visible, color, containerStyle }) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
            Animated.loop(
                Animated.sequence([
                    Animated.timing(translateY, { toValue: -5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(translateY, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            ).start();
        } else {
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View
            style={[containerStyle, { opacity, transform: [{ translateY }] }]}
            pointerEvents="none"
        >
            <Feather name="chevron-down" size={24} color={color} />
        </Animated.View>
    );
};

// --- Staggered Animation Component ---
const StaggeredView = ({ children, index }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: 1,
            friction: 7,
            tension: 50,
            delay: 100 + index * 50,
            useNativeDriver: true,
        }).start();
    }, [index]);

    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
    return (
        <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
            {children}
        </Animated.View>
    );
};

const ProductActionSheet = ({ product, visible, onClose, onSave }) => {
    const language = useCurrentLanguage();
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const { userProfile } = useAppContext();

    const [personalScore, setPersonalScore] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSavingToShelf, setIsSavingToShelf] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [isDataMissing, setIsDataMissing] = useState(false);

    const [isEditingClaims, setIsEditingClaims] = useState(false);
    const [currentClaims, setCurrentClaims] = useState([]);

    const [showScrollHint, setShowScrollHint] = useState(true);
    const [isViewerVisible, setIsViewerVisible] = useState(false);

    const animState = useRef(new Animated.Value(0)).current;

    // Product Type Resolution
    const resolvedProductType = useMemo(() => {
        if (!product) return 'other';
        return product.productType || 
               product.type || 
               product.category?.id || 
               product.category || 
               product.analysisData?.product_type || 
               'other';
    }, [product]);

    useEffect(() => {
        if (visible && product) {
            setPersonalScore(null);
            setActiveTab('personal');
            setIsEditingClaims(false);
            setShowScrollHint(true);
            setIsSavingToShelf(false);
            setIsViewerVisible(false);

            Animated.spring(animState, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();

            const initialClaims = product.marketingClaims || product.claims || [];
            setCurrentClaims(initialClaims);

            const ingredients = product.analysisData?.detected_ingredients || product.ingredients || [];

            if (!ingredients || ingredients.length === 0) {
                setIsDataMissing(true);
            } else {
                setIsDataMissing(false);
                if (userProfile?.settings) {
                    calculatePersonalScore(initialClaims);
                }
            }
        }
    }, [visible, product, userProfile]);

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

    const handleSaveClick = async () => {
        if (isSavingToShelf) return;
        setIsSavingToShelf(true);

        try {
            let finalAnalysis = personalScore;

            if (!finalAnalysis && !isDataMissing) {
                const ingredientsRaw = product.analysisData?.detected_ingredients || product.ingredients || [];
                const tempProduct = {
                    ...product,
                    productType: resolvedProductType,
                    marketingClaims: currentClaims,
                    analysisData: {
                        ...(product.analysisData || {}),
                        detected_ingredients: ingredientsRaw,
                        product_type: resolvedProductType
                    }
                };

                if (userProfile) {
                    finalAnalysis = await reevaluateProductForUser(tempProduct, userProfile);
                }
            }

            const baseData = finalAnalysis || displayData;

            const ingredientsRaw = product.analysisData?.detected_ingredients || 
                                   product.ingredients || 
                                   (Array.isArray(product.analysisData?.raw_ingredients_list) ? product.analysisData.raw_ingredients_list : []);

            const unknownIngs = product.analysisData?.unknown_ingredients || [];

            const completeAnalysisData = {
                ...product.analysisData,
                ...baseData,
                oilGuardScore: baseData.oilGuardScore || product.score || product.analysisData?.oilGuardScore || 0,
                finalVerdict: baseData.finalVerdict || baseData.verdict || product.analysisData?.finalVerdict || (language === 'ar' ? 'تم التقييم بنجاح' : 'Evaluated'),
                efficacy: baseData.efficacy || product.analysisData?.efficacy || { score: baseData.oilGuardScore || 0 },
                safety: baseData.safety || product.analysisData?.safety || { score: baseData.oilGuardScore || 0 },
                product_type: resolvedProductType,
                detected_ingredients: ingredientsRaw,
                raw_ingredients_list: ingredientsRaw,
                unknown_ingredients: unknownIngs,
                user_specific_alerts: baseData.user_specific_alerts || baseData.personalMatch?.reasons || product.analysisData?.user_specific_alerts || [],
                marketingClaims: currentClaims,
                marketing_results: baseData.marketing_results || product.analysisData?.marketing_results || [],
                evaluated_claims: baseData.marketing_results || baseData.evaluated_claims || product.analysisData?.evaluated_claims || currentClaims
            };

            const savedPayload = {
                ...product,
                productName: displayName,
                name: displayName,
                productType: resolvedProductType,
                type: resolvedProductType,
                productImage: displayImage,
                imageUrl: displayImage,
                marketingClaims: currentClaims,
                claims: currentClaims,
                analysisData: completeAnalysisData
            };

            Animated.timing(animState, {
                toValue: 0,
                duration: 250,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            }).start(async () => {
                if (onSave) {
                    await onSave(savedPayload);
                }
            });

        } catch (error) {
            console.error("Save to shelf error:", error);
            AlertService.error(
                t('status_error', language),
                t('error_save_product', language) || "Failed to save product to shelf"
            );
        } finally {
            setIsSavingToShelf(false);
        }
    };

    const calculatePersonalScore = async (claimsToUse) => {
        setIsCalculating(true);
        try {
            const ingredientsRaw = product.analysisData?.detected_ingredients || product.ingredients || [];
            const tempProduct = {
                ...product,
                productType: resolvedProductType,
                marketingClaims: claimsToUse,
                analysisData: {
                    ...(product.analysisData || {}),
                    detected_ingredients: ingredientsRaw,
                    product_type: resolvedProductType
                }
            };

            const newAnalysis = await reevaluateProductForUser(tempProduct, userProfile);

            if (newAnalysis) {
                setPersonalScore(newAnalysis);
                setActiveTab('personal');
            }
        } catch (e) {
            console.error("Re-evaluation API Error:", e);
        } finally {
            setIsCalculating(false);
        }
    };

    const toggleClaim = (claim) => {
        const newClaims = currentClaims.includes(claim)
            ? currentClaims.filter(c => c !== claim)
            : [...currentClaims, claim];
        setCurrentClaims(newClaims);
    };

    const applyNewClaims = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsEditingClaims(false);
        calculatePersonalScore(currentClaims);
    };

    const handleScroll = (event) => {
        if (showScrollHint && event.nativeEvent.contentOffset.y > 10) {
            setShowScrollHint(false);
        }
    };

    if (!product || !visible) return null;

    const displayName = product.name || product.productName || t('community_product', language);
    const displayImage = product.image || product.imageUrl || product.productImage;
    const possibleClaims = getClaimsByProductType(resolvedProductType);

    const originalAnalysis = product.analysisData || {
        oilGuardScore: product.score || 0,
        personalMatch: { status: 'neutral', reasons: [] },
        marketing_results: [],
    };

    const displayData = (activeTab === 'personal' && personalScore) ? personalScore : originalAnalysis;

    const score = displayData.oilGuardScore || 0;
    const matchStatus = (activeTab === 'personal' && personalScore) ? displayData.personalMatch?.status : 'neutral';

    // 🌟 SERVER GENERAL VERDICT DISPLAY 🌟
    const serverVerdict = displayData.finalVerdict || displayData.verdict || displayData.statusLabel;

    let verdictColor = COLORS.accentGreen;
    let verdictIcon = "check-circle";

    const isDanger = matchStatus === 'danger' || (serverVerdict && (serverVerdict.includes('خطر') || serverVerdict.includes('غير مناسب') || serverVerdict.includes('غير آمن')));
    const isWarning = matchStatus === 'warning' || (serverVerdict && (serverVerdict.includes('تنبيه') || serverVerdict.includes('حذر') || serverVerdict.includes('مبالغة') || serverVerdict.includes('مختلط')));

    if (isDanger) {
        verdictColor = COLORS.danger;
        verdictIcon = "times-circle";
    } else if (isWarning || score < 60) {
        verdictColor = COLORS.gold;
        verdictIcon = "exclamation-triangle";
    }

    const verdictText = serverVerdict || (score >= 80 ? (language === 'ar' ? 'ممتاز وآمن' : 'Excellent & Safe') : (language === 'ar' ? 'جيد ومتوازن' : 'Good & Balanced'));

    const overlayOpacity = animState.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const modalTranslateY = animState.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] });

    const renderAlerts = () => {
        const rawAlerts = displayData.personalMatch?.reasons || displayData.user_specific_alerts || [];
        if (isDataMissing) return (<View style={[styles.alertBox, { borderColor: COLORS.border, borderStyle: 'dashed' }]}><FontAwesome5 name="ban" size={14} color={COLORS.textDim} style={{ marginTop: 3 }} /><Text style={[styles.alertText, { color: COLORS.textDim }]}>{t('community_sheet_missing_ingredients', language)}</Text></View>);
        if (rawAlerts.length === 0) return (<View style={[styles.alertBox, { borderColor: COLORS.accentGreen }]}><Text style={[styles.alertText, { color: COLORS.accentGreen }]}>{t('community_sheet_no_conflicts', language)}</Text></View>);

        return rawAlerts.map((alert, index) => {
            const text = typeof alert === 'string' ? alert : alert.text, type = typeof alert === 'object' ? alert.type : 'info';
            let color = COLORS.textSecondary, icon = 'info-circle', bg = COLORS.background;
            if (type === 'risk' || type === 'danger') { color = COLORS.danger; icon = 'exclamation-circle'; bg = 'rgba(239, 68, 68, 0.1)'; }
            else if (type === 'good') { color = COLORS.accentGreen; icon = 'check'; bg = 'rgba(16, 185, 129, 0.1)'; }
            else if (type === 'caution' || type === 'warning') { color = COLORS.gold; icon = 'exclamation-triangle'; bg = 'rgba(245, 158, 11, 0.1)'; }
            return (<View key={index} style={[styles.alertBox, { backgroundColor: bg, borderColor: color }]}><FontAwesome5 name={icon} size={14} color={color} style={{ marginTop: 3 }} /><Text style={[styles.alertText, { color }]}>{text}</Text></View>);
        });
    };

    // 🌟 SERVER CLAIMS VERDICTS & STATUS RENDERER 🌟
    const renderMarketingClaims = () => {
        const claimsData = displayData.marketing_results || displayData.evaluated_claims || displayData.claims_evaluated || [];
        const claimsToRender = claimsData.length > 0 ? claimsData : currentClaims;

        if (!claimsToRender || claimsToRender.length === 0) {
            const message = activeTab === 'personal'
                ? t('community_sheet_no_claims_personal', language)
                : t('community_sheet_no_claims_original', language);
            return (
                <View style={[styles.alertBox, { borderColor: COLORS.border, borderStyle: 'dashed' }]}>
                    <Text style={[styles.alertText, { color: COLORS.textDim }]}>{message}</Text>
                </View>
            );
        }

        return claimsToRender.map((result, index) => {
            const claimName = typeof result === 'object' ? (result.claim || result.label || result.name || result.title) : String(result);
            const serverStatus = typeof result === 'object' ? (result.status || result.verdict || result.level || '') : '';
            const explanation = typeof result === 'object' ? (result.explanation || result.details || result.reason || '') : '';

            // Dynamic color & icon classification directly from server status text
            const statusLower = serverStatus.toLowerCase();
            let color = COLORS.textSecondary;
            let icon = 'question-circle';

            if (statusLower.includes('محقق') || statusLower.includes('✅') || statusLower.includes('verified') || statusLower.includes('approved') || statusLower.includes('ممتاز')) {
                color = COLORS.accentGreen;
                icon = 'check-circle';
            } else if (statusLower.includes('مختلط') || statusLower.includes('دون الفعال') || statusLower.includes('منخفض') || statusLower.includes('جزئي') || statusLower.includes('حذر') || statusLower.includes('⚠️') || statusLower.includes('⚖️') || statusLower.includes('🌿')) {
                color = COLORS.gold;
                icon = 'exclamation-triangle';
            } else if (statusLower.includes('وهمي') || statusLower.includes('مبالغة') || statusLower.includes('تناقض') || statusLower.includes('مضلل') || statusLower.includes('فارغ') || statusLower.includes('لا توجد') || statusLower.includes('❌') || statusLower.includes('🚫')) {
                color = COLORS.danger;
                icon = 'times-circle';
            }

            return (
                <View
                    key={index}
                    style={[
                        styles.claimResultBox,
                        {
                            borderColor: color + '40',
                            backgroundColor: color + '12',
                        }
                    ]}
                >
                    <View style={styles.claimHeader}>
                        <FontAwesome5 name={icon} size={15} color={color} />
                        <Text style={[styles.claimTitle, { color: COLORS.textPrimary }]}>{claimName}</Text>
                    </View>

                    {/* Server Verdict rendered DIRECTLY */}
                    {!!serverStatus && (
                        <Text style={[styles.claimStatus, { color }]}>
                            {serverStatus}
                        </Text>
                    )}

                    {/* Server Explanation rendered DIRECTLY */}
                    {!!explanation && (
                        <Text style={[styles.claimExplanation, { color: COLORS.textSecondary }]}>
                            {explanation}
                        </Text>
                    )}
                </View>
            );
        });
    };

    return (
        <>
            <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
                <Animated.View style={[styles.sheetBackdrop, { opacity: overlayOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                    <Animated.View style={[styles.sheetContainer, isEditingClaims && { maxHeight: '90%' }, { transform: [{ translateY: modalTranslateY }] }]}>
                        <View style={styles.sheetHandle} />
                        
                        {/* CLICKABLE PRODUCT IMAGE */}
                        {displayImage && !isEditingClaims && (
                            <StaggeredView index={0}>
                                <TouchableOpacity 
                                    activeOpacity={0.9} 
                                    onPress={() => setIsViewerVisible(true)}
                                    style={styles.imageHeader}
                                >
                                    <Image source={{ uri: displayImage }} style={styles.sheetMainImage} resizeMode="cover" />
                                    <View style={styles.expandImageHint}>
                                        <Ionicons name="scan" size={16} color="#FFF" />
                                    </View>
                                    {personalScore && activeTab === 'original' && (
                                        <View style={styles.comparisonBadge}>
                                            <Text style={styles.compText}>
                                                {personalScore.oilGuardScore > (originalAnalysis.oilGuardScore || 0) ? t('community_sheet_comparison_better', language) : personalScore.oilGuardScore < (originalAnalysis.oilGuardScore || 0) ? t('community_sheet_comparison_worse', language) : t('community_sheet_comparison_same', language)}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </StaggeredView>
                        )}
                        
                        <View style={styles.content}>
                            <StaggeredView index={1}>
                                <View style={styles.tabContainer}>
                                    <TouchableOpacity style={[styles.tab, activeTab === 'original' && styles.activeTab]} onPress={() => setActiveTab('original')}><Text style={[styles.tabText, activeTab === 'original' && { color: COLORS.textPrimary }]}>{t('community_sheet_original_tab', language)}</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.tab, activeTab === 'personal' && styles.activeTab, isDataMissing && { opacity: 0.5 }]} onPress={() => !isDataMissing && setActiveTab('personal')} disabled={isDataMissing}>{isCalculating && activeTab === 'personal' ? <ActivityIndicator size="small" color={COLORS.accentGreen} /> : <Text style={[styles.tabText, activeTab === 'personal' && { color: COLORS.accentGreen }]}>{isDataMissing ? t('community_sheet_personal_unavailable', language) : t('community_sheet_personal_tab', language)}</Text>}</TouchableOpacity>
                                </View>
                                <TouchableOpacity style={styles.editClaimsBtn} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsEditingClaims(!isEditingClaims); }}><Text style={styles.editClaimsText}>{isEditingClaims ? t('community_sheet_close_edit', language) : t('community_sheet_edit_product_data', language)}</Text><Feather name={isEditingClaims ? "chevron-up" : "sliders"} size={14} color={COLORS.textSecondary} /></TouchableOpacity>
                            </StaggeredView>

                            {isEditingClaims ? (
                                <StaggeredView index={2}>
                                    <View style={styles.claimsEditor}><Text style={styles.claimsHint}>{t('community_sheet_claims_hint', language)}</Text><ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled><View style={styles.chipsContainer}>{possibleClaims.map((claim, i) => (<TouchableOpacity key={i} style={[styles.claimChip, currentClaims.includes(claim) && { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen }]} onPress={() => toggleClaim(claim)}><Text style={[styles.claimText, currentClaims.includes(claim) && { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold' }]}>{claim}</Text></TouchableOpacity>))}</View></ScrollView><TouchableOpacity style={[styles.applyBtn, isDataMissing && { backgroundColor: COLORS.border }]} onPress={!isDataMissing ? applyNewClaims : null} disabled={isDataMissing}><Text style={styles.applyBtnText}>{isDataMissing ? t('community_sheet_no_ingredients_for_analysis', language) : t('community_sheet_recalculate', language)}</Text></TouchableOpacity></View>
                                </StaggeredView>
                            ) : (
                                <View style={styles.scrollContainer}>
                                    <ScrollView showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16}>
                                        {(activeTab === 'personal' && isCalculating) ? (
                                            <ActivityIndicator size="large" color={COLORS.accentGreen} style={{ marginVertical: 40 }} />
                                        ) : (
                                            <>
                                                <StaggeredView index={2}>
                                                    <View style={styles.sheetHeader}><View style={[styles.sheetIconBox, { backgroundColor: verdictColor + '20' }]}><FontAwesome5 name={verdictIcon} size={24} color={verdictColor} /></View><View style={{ flex: 1, marginRight: 15 }}><Text style={styles.sheetTitle} numberOfLines={2}>{displayName}</Text><Text style={[styles.sheetVerdict, { color: verdictColor }]}>{verdictText}</Text></View><View style={[styles.bigScoreCircle, { borderColor: verdictColor }]}><Text style={[styles.bigScoreText, { color: verdictColor }]}>{score}</Text></View></View>
                                                </StaggeredView>

                                                {activeTab === 'personal' && (
                                                    <StaggeredView index={3}>
                                                        <View style={styles.alertsContainer}>
                                                            <Text style={styles.sectionHeader}>{t('community_sheet_personal_details', language)}</Text>
                                                            {renderAlerts()}
                                                        </View>
                                                    </StaggeredView>
                                                )}

                                                <StaggeredView index={activeTab === 'personal' ? 4 : 3}>
                                                    <View style={styles.claimsAnalysisContainer}>
                                                        <Text style={styles.sectionHeader}>{t('community_sheet_claims_credibility', language)}</Text>
                                                        {renderMarketingClaims()}
                                                    </View>
                                                </StaggeredView>
                                            </>
                                        )}
                                    </ScrollView>
                                    <ScrollHint visible={showScrollHint && !isCalculating && !!personalScore && activeTab === 'personal'} color={COLORS.textPrimary} containerStyle={styles.scrollHintContainer} />
                                </View>
                            )}
                            
                            <StaggeredView index={5}>
                                <View style={styles.sheetActions}>
                                    <TouchableOpacity style={styles.sheetBtnSecondary} onPress={handleClose}>
                                        <Text style={styles.sheetBtnTextSec}>{t('community_close', language)}</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={[styles.sheetBtnPrimary, { backgroundColor: verdictColor }]} 
                                        onPress={handleSaveClick}
                                        disabled={isSavingToShelf}
                                        activeOpacity={0.8}
                                    >
                                        {isSavingToShelf ? (
                                            <ActivityIndicator color={COLORS.textOnAccent} size="small" />
                                        ) : (
                                            <>
                                                <Text style={styles.sheetBtnTextPrim}>{t('community_sheet_save_to_shelf', language)}</Text>
                                                <FontAwesome5 name="bookmark" size={14} color={COLORS.textOnAccent} style={{ marginLeft: 8 }} />
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </StaggeredView>
                        </View>
                    </Animated.View>
                </Animated.View>
            </Modal>

            {/* FULL IMAGE VIEWER MODAL */}
            <FullImageViewer
                visible={isViewerVisible}
                imageUrl={displayImage}
                onClose={() => setIsViewerVisible(false)}
            />
        </>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    sheetContainer: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: '90%' },
    sheetHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 15, marginBottom: 10 },
    imageHeader: { width: '100%', height: 160, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', marginTop: -29, marginBottom: 0, position: 'relative' },
    sheetMainImage: { width: '100%', height: '100%' },
    expandImageHint: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 6,
        borderRadius: 12,
        zIndex: 5,
    },
    comparisonBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    compText: { color: '#FFF', fontFamily: 'Tajawal-Bold', fontSize: 11 },
    content: { padding: 25, paddingTop: 15 },
    tabContainer: { flexDirection: 'row-reverse', backgroundColor: COLORS.background, borderRadius: 12, padding: 4, marginBottom: 15 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
    activeTab: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
    tabText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textSecondary },
    sheetHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20 },
    sheetIconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 15 },
    sheetTitle: { color: COLORS.textPrimary, fontFamily: 'Tajawal-ExtraBold', fontSize: 18, textAlign: 'right' },
    sheetVerdict: { fontFamily: 'Tajawal-Bold', fontSize: 13, textAlign: 'right', marginTop: 4 },
    bigScoreCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    bigScoreText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16 },
    alertsContainer: { marginBottom: 20 },
    sectionHeader: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, fontSize: 12, textAlign: 'right', marginBottom: 10 },
    alertBox: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    alertText: { flex: 1, fontFamily: 'Tajawal-Regular', fontSize: 13, textAlign: 'right', lineHeight: 20 },
    claimsAnalysisContainer: { marginBottom: 20, marginTop: 10 },
    claimResultBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
    claimHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 6 },
    claimTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
    claimStatus: { fontFamily: 'Tajawal-Bold', fontSize: 12, textAlign: 'right', marginBottom: 4 },
    claimExplanation: { fontFamily: 'Tajawal-Regular', fontSize: 12, textAlign: 'right', lineHeight: 18 },
    editClaimsBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 15 },
    editClaimsText: { color: COLORS.textSecondary, fontFamily: 'Tajawal-Regular', fontSize: 12 },
    claimsEditor: { backgroundColor: COLORS.background, padding: 15, borderRadius: 12, marginBottom: 20 },
    claimsHint: { color: COLORS.textDim, fontSize: 12, fontFamily: 'Tajawal-Regular', marginBottom: 10, textAlign: 'right' },
    chipsContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    claimChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
    claimText: { color: COLORS.textSecondary, fontSize: 12, fontFamily: 'Tajawal-Regular' },
    applyBtn: { backgroundColor: COLORS.accentGreen, padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 15 },
    applyBtnText: { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold', fontSize: 14 },
    sheetActions: { flexDirection: 'row', gap: 15, marginTop: 10 },
    sheetBtnPrimary: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    sheetBtnSecondary: { flex: 0.5, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    sheetBtnTextPrim: { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold' },
    sheetBtnTextSec: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold' },
    scrollContainer: {
        maxHeight: 250,
        position: 'relative',
    },
    scrollHintContainer: {
        position: 'absolute',
        bottom: 15,
        alignSelf: 'center',
        backgroundColor: COLORS.card + 'CC',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    }
});

export default ProductActionSheet;