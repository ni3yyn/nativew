// src/components/catalog/ProductCard.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, Animated,
    TouchableOpacity, Image, Pressable,
} from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';
import { getOptimizedImage } from '../../utils/imageOptimizerr';
import { t, interpolate } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';
import { getPointsForField } from '../../utils/gamificationEngine';
import { usePendingContributions } from '../../hooks/usePendingContributions';
import {
    saveProductToShelf,
    removeProductFromShelf,
    analyzeAndEnrichShelfProduct,
    markShelfProductNeedsClaims,
} from '../../services/communityService';
import { AlertService } from '../../services/alertService';
import ClaimsPickerModal from './ClaimsPickerModal';

const formatPrice = (price) => {
    if (!price) return null;
    if (typeof price === 'object') {
        if (price.min && price.max && price.min !== price.max) {
            return `${price.min} - ${price.max}`;
        }
        return price.min || price.max || null;
    }
    return price;
};

// 🌟 CACHED STYLESHEET: Shared across all card instances to prevent garbage collection thrashing
let cachedStyles = null;
let cachedStyleKey = null;

const getCardStyles = (C, rtl, isLight) => {
    const key = `${C.card}_${C.border}_${rtl.isRTL}_${isLight}`;
    if (cachedStyleKey === key && cachedStyles) return cachedStyles;
    cachedStyleKey = key;
    cachedStyles = createStyles(C, rtl, isLight);
    return cachedStyles;
};

function ProductCard({ 
    item, 
    index, 
    onPress, 
    onPressBounty, 
    onSelectBrand, 
    isCompareMode = false, 
    isSelected = false 
}) {
    const { colors: C, activeThemeId } = useTheme();
    const { user, userProfile, savedProducts } = useAppContext();
    const router = useRouter();
    const lang = useCurrentLanguage();
    const rtl = useRTL();
    const styles = getCardStyles(C, rtl, activeThemeId === 'light');

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(14)).current;
    const cardScale = useRef(new Animated.Value(1)).current;

    // ── Smart save state ──────────────────────────────────────────────────────
    const [showClaimsPicker, setShowClaimsPicker] = useState(false);
    const pendingDocIdRef = useRef(null);

    // ── Image state ───────────────────────────────────────────────────────────
    const [imageUri, setImageUri] = useState(() => getOptimizedImage(item?.image, 250));
    const [hasImageError, setHasImageError] = useState(false);

    useEffect(() => {
        setImageUri(getOptimizedImage(item?.image, 250));
        setHasImageError(false);
    }, [item?.image]);

    const handleImageError = () => {
        const rawImage = item?.image ? String(item.image).trim() : '';
        if (imageUri !== rawImage && rawImage) {
            setImageUri(rawImage);
        } else {
            setHasImageError(true);
        }
    };

    // ── Saved state ───────────────────────────────────────────────────────────
    const savedItem = (savedProducts || []).find(
        p => p.productId === item?.id || p.id === item?.id ||
        (p.productName && item?.name && p.productName.toLowerCase() === item.name.toLowerCase())
    );
    const [optimisticSaved, setOptimisticSaved] = useState(null);
    const isSaved = optimisticSaved !== null ? optimisticSaved : !!savedItem;

    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    useEffect(() => {
        setOptimisticSaved(null);
    }, [savedProducts]);

    // ── Pending contributions ─────────────────────────────────────────────────
    const { hasPending } = usePendingContributions(item.id);

    // ── Entry animation ───────────────────────────────────────────────────────
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1, duration: 300, delay: index * 35, useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0, friction: 8, tension: 45, delay: index * 35, useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // ── Tactile Press Feedback ────────────────────────────────────────────────
    const handlePressIn = () => {
        Animated.spring(cardScale, { toValue: 0.98, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
        Animated.spring(cardScale, { toValue: 1, friction: 5, tension: 45, useNativeDriver: true }).start();
    };

    // ── Smart Save / Remove ───────────────────────────────────────────────────
    const handleSmartSave = (e) => {
        e?.stopPropagation?.();

        if (!user) {
            AlertService.show({
                title: t('login_required', lang),
                message: t('login_to_save_shelf', lang),
                type: 'warning',
                buttons: [{ text: t('announcement_ok', lang), style: 'primary' }],
            });
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

        if (isSaved && savedItem?.id) {
            setOptimisticSaved(false);

            removeProductFromShelf(user.uid, savedItem.id).catch(err => {
                console.error('[ProductCard] Remove error:', err);
                if (isMountedRef.current) setOptimisticSaved(true);
            });
            return;
        }

        setOptimisticSaved(true);

        const hasIngredients = Array.isArray(item.ingredients) 
            ? item.ingredients.length > 0 
            : !!(item.ingredients && String(item.ingredients).trim());
        const hasClaims = Array.isArray(item.marketingClaims) && item.marketingClaims.length > 0;

        saveProductToShelf(user.uid, item).then(shelfDocId => {
            if (!shelfDocId) return;
            pendingDocIdRef.current = shelfDocId;

            if (!hasIngredients) {
                AlertService.toast(interpolate(t('toast_added_to_shelf', lang), { name: item.name }));
                return;
            }

            if (hasClaims) {
                AlertService.toast(interpolate(t('toast_saved_analyzing', lang), { name: item.name }));
                analyzeAndEnrichShelfProduct(
                    user.uid, shelfDocId, item, userProfile, item.marketingClaims
                ).catch(err => console.warn('[BackgroundAnalysis] Error:', err));
            } else {
                if (isMountedRef.current) setShowClaimsPicker(true);
            }
        }).catch(err => {
            console.error('[ProductCard] Save error:', err);
            if (isMountedRef.current) setOptimisticSaved(false);
        });
    };

    const handleClaimsConfirmed = useCallback((selectedClaims) => {
        setShowClaimsPicker(false);
        const docId = pendingDocIdRef.current;
        if (!docId || !user) return;

        AlertService.toast(interpolate(t('toast_saved_analyzing', lang), { name: item.name }));
        analyzeAndEnrichShelfProduct(
            user.uid, docId, item, userProfile, selectedClaims
        ).catch(err => console.warn('[BackgroundAnalysis] Error:', err));
    }, [user, userProfile, item, lang]);

    const handlePickerDismiss = useCallback(() => {
        setShowClaimsPicker(false);
        const docId = pendingDocIdRef.current;
        if (docId && user) {
            markShelfProductNeedsClaims(user.uid, docId).catch(err => console.warn('[NeedsClaims] Error:', err));
        }
    }, [user]);

    const displayPrice = formatPrice(item.price);
    const isMissingPrice = !displayPrice;
    const isMissingIngredients = !item.ingredients || item.ingredients.trim() === '';
    const pricePoints = getPointsForField('price');
    const ingredientsPoints = getPointsForField('ingredients');
    const hasPendingPrice = hasPending('price');
    const hasPendingIngredients = hasPending('ingredients');

    return (
        <>
            <Animated.View
                style={[
                    styles.cardContainer,
                    {
                        backgroundColor: C.card,
                        borderColor: isSelected ? C.accentGreen : C.border,
                        borderWidth: isSelected ? 0.5 : 0.5,
                        opacity: fadeAnim,
                        transform: [{ translateY }, { scale: cardScale }],
                    },
                ]}
            >
                <Pressable
                    onPress={() => onPress(item)}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    style={[styles.touchableArea, { flexDirection: rtl.flexDirection }]}
                >
                    {/* 🌟 1. PRODUCT IMAGE CONTAINER (FIXED RATIO) */}
                    <View style={styles.imageStageWrapper}>
                        <View style={[styles.cardImageContainer, { backgroundColor: activeThemeId === 'light' ? '#FFF' : (C.background || '#14231E') }]}>
                            {(!imageUri || hasImageError) ? (
                                <FontAwesome5 name={item.category?.icon || 'box'} size={24} color={C.textDim} />
                            ) : (
                                <Image
                                    source={{ uri: imageUri }}
                                    style={styles.cardImage}
                                    resizeMode="contain"
                                    onError={handleImageError}
                                />
                            )}
                        </View>

                        {isCompareMode && (
                            <View style={[
                                styles.compareCheckbox,
                                {
                                    borderColor: isSelected ? C.accentGreen : C.textDim,
                                    backgroundColor: isSelected ? C.accentGreen : 'rgba(0,0,0,0.4)',
                                },
                            ]}>
                                {isSelected && <Feather name="check" size={10} color="#FFF" />}
                            </View>
                        )}

                        <View style={[styles.categoryBadge, { backgroundColor: C.card, borderColor: C.border }]}>
                            <FontAwesome5
                                name={item.category?.icon || 'box'}
                                size={9}
                                color={C.accentGreen}
                            />
                        </View>
                    </View>

                    {/* 🌟 2. PRODUCT DETAILS (LOCKED COMPACT HEIGHT) */}
                    <View style={styles.cardContent}>
                        {/* Brand Row (Quantity / Size removed) */}
                        <View style={[styles.brandRow, { flexDirection: rtl.flexDirection }]}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={(e) => {
                                    e?.stopPropagation?.();
                                    if (!item.brand) return;
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                    if (onSelectBrand) {
                                        onSelectBrand(item.brand);
                                    } else {
                                        router.push({
                                            pathname: '/CatalogScreen',
                                            params: { search: item.brand }
                                        });
                                    }
                                }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={[styles.brandBtn, { flexDirection: rtl.flexDirection }]}
                            >
                                <Text style={[styles.brandText, { color: C.accentGreen }]}>
                                    {item.brand}
                                </Text>
                                <Feather name="search" size={9} color={C.accentGreen} style={{ opacity: 0.8 }} />
                            </TouchableOpacity>
                        </View>

                        {/* Title (Clean 2-line cap) */}
                        <Text
                            style={[styles.productName, { color: C.textPrimary, textAlign: rtl.textAlign }]}
                            numberOfLines={2}
                        >
                            {item.name}
                        </Text>

                        {/* Footer: Price & Save Action */}
                        <View style={[styles.cardFooter, { flexDirection: rtl.flexDirection }]}>
                            <View style={[styles.priceAndBountyRow, { flexDirection: rtl.flexDirection }]}>
                                {isMissingPrice ? (
                                    hasPendingPrice ? (
                                        <PendingBadge C={C} lang={lang} rtl={rtl} />
                                    ) : (
                                        <TouchableOpacity
                                            onPress={(e) => {
                                                e?.stopPropagation?.();
                                                onPressBounty(item, 'price');
                                            }}
                                            style={[
                                                styles.microBountyPill,
                                                {
                                                    borderColor: (C.gold || '#F59E0B') + '40',
                                                    backgroundColor: (C.gold || '#F59E0B') + '14',
                                                    flexDirection: rtl.flexDirection,
                                                },
                                            ]}
                                            activeOpacity={0.75}
                                        >
                                            <FontAwesome5 name="coins" size={8.5} color={C.gold || '#F59E0B'} />
                                            <Text style={[styles.microBountyText, { color: C.gold || '#F59E0B' }]}>
                                                {t('catalog_add_price', lang)} (+{pricePoints})
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                ) : (
                                    <View style={[styles.priceInlineRow, { flexDirection: rtl.flexDirection }]}>
                                        <Text style={[styles.priceText, { color: C.textPrimary }]}>
                                            {displayPrice}
                                            <Text style={[styles.currencyText, { color: C.accentGreen }]}> {t('catalog_currency', lang)}</Text>
                                        </Text>

                                        {isMissingIngredients && !hasPendingIngredients && !hasPendingPrice && (
                                            <TouchableOpacity
                                                onPress={(e) => {
                                                    e?.stopPropagation?.();
                                                    onPressBounty(item, 'ingredients');
                                                }}
                                                style={[
                                                    styles.microBountyPill,
                                                    {
                                                        borderColor: C.accentGreen + '40',
                                                        backgroundColor: C.accentGreen + '14',
                                                        flexDirection: rtl.flexDirection,
                                                    },
                                                ]}
                                                activeOpacity={0.75}
                                            >
                                                <FontAwesome5 name="flask" size={8.5} color={C.accentGreen} />
                                                <Text style={[styles.microBountyText, { color: C.accentGreen }]}>
                                                    +{ingredientsPoints}
                                                </Text>
                                            </TouchableOpacity>
                                        )}

                                        {isMissingIngredients && hasPendingIngredients && (
                                            <PendingBadge C={C} small lang={lang} rtl={rtl} />
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Tactile Save Pill */}
                            <TouchableOpacity
                                activeOpacity={0.75}
                                onPress={handleSmartSave}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={[
                                    styles.saveCapsule,
                                    {
                                        backgroundColor: isSaved ? (C.accentGreen + '18') : (C.background || 'rgba(0,0,0,0.06)'),
                                        borderColor: isSaved ? (C.accentGreen + '50') : C.border,
                                        flexDirection: rtl.flexDirection,
                                    }
                                ]}
                            >
                                <Feather 
                                    name={isSaved ? "check" : "bookmark"} 
                                    size={11} 
                                    color={isSaved ? C.accentGreen : C.textSecondary} 
                                />
                                <Text style={[
                                    styles.saveCapsuleText, 
                                    { color: isSaved ? C.accentGreen : C.textSecondary }
                                ]}>
                                    {isSaved ? t('catalog_saved_badge', lang) : t('catalog_save_action', lang)}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Animated.View>

            {/* 🌟 LAZY MOUNT CLAIMS PICKER: Instantiated only when opened */}
            {showClaimsPicker && (
                <ClaimsPickerModal
                    visible={showClaimsPicker}
                    product={item}
                    onConfirm={handleClaimsConfirmed}
                    onDismiss={handlePickerDismiss}
                />
            )}
        </>
    );
}

const PendingBadge = ({ C, small, lang, rtl }) => (
    <View
        style={[
            styles.pendingBadge,
            { 
                backgroundColor: (C.gold || '#F59E0B') + '15', 
                borderColor: (C.gold || '#F59E0B') + '40',
                flexDirection: rtl.flexDirection,
            },
            small && { paddingHorizontal: 5, paddingVertical: 2, gap: 3 },
        ]}
    >
        <Feather name="clock" size={small ? 8 : 9.5} color={C.gold || '#F59E0B'} />
        <Text style={[styles.pendingText, { color: C.gold || '#F59E0B', fontSize: small ? 8.5 : 10 }]}>
            {t('catalog_pending_review', lang)}
        </Text>
    </View>
);

const createStyles = (C, rtl, isLight) => StyleSheet.create({
    // 🌟 RIGID, COMPACT CONTAINER HEIGHT (PREVENTS VERTICAL EXPLOSION)
    cardContainer: {
        borderRadius: 20,
        marginBottom: 11,
        height: 126, // 👈 Locked compact height
        overflow: 'hidden',
    },
    touchableArea: {
        width: '100%',
        height: '100%',
        padding: 10,
        gap: 12,
        alignItems: 'center',
    },
    imageStageWrapper: {
        position: 'relative',
        width: 92,
        height: '100%',
    },
    cardImageContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.06)',
    },
    cardImage: { 
        width: '100%', 
        height: '100%' 
    },
    compareCheckbox: {
        position: 'absolute', 
        top: 4, 
        left: 4, 
        width: 18, 
        height: 18, 
        borderRadius: 9,
        borderWidth: 1.5, 
        justifyContent: 'center', 
        alignItems: 'center', 
        zIndex: 10,
    },
    categoryBadge: { 
        position: 'absolute', 
        bottom: 3, 
        right: 3, 
        width: 20, 
        height: 20, 
        borderRadius: 10, 
        alignItems: 'center', 
        justifyContent: 'center',
        borderWidth: 0.8,
    },
    cardContent: { 
        flex: 1, 
        height: '100%',
        justifyContent: 'space-between',
        paddingVertical: 1,
    },
    brandRow: { 
        justifyContent: 'flex-start', 
        alignItems: 'center',
    },
    brandBtn: {
        alignItems: 'center',
        gap: 4,
    },
    brandText: { 
        fontFamily: 'Tajawal-ExtraBold', 
        fontSize: 11.5,
    },
    productName: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 13.5, 
        lineHeight: 18,
    },
    cardFooter: { 
        justifyContent: 'space-between', 
        alignItems: 'center',
    },
    priceAndBountyRow: { 
        flexShrink: 1, 
        alignItems: 'center', 
        gap: 5,
    },
    priceInlineRow: {
        alignItems: 'center',
        gap: 5,
    },
    priceText: { 
        fontFamily: 'Tajawal-ExtraBold', 
        fontSize: 14.5,
    },
    currencyText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10.5,
    },
    microBountyPill: {
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 7,
        borderWidth: 0.8,
    },
    microBountyText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 10,
    },
    pendingBadge: {
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 7,
        borderWidth: 0.8,
    },
    pendingText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 9.5,
    },
    saveCapsule: {
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 9,
        borderWidth: 0.8,
    },
    saveCapsuleText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10.5,
    },
});

export default React.memo(ProductCard);