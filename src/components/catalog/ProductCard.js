// src/components/catalog/ProductCard.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, Animated,
    TouchableOpacity, Image,
} from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';
import { getOptimizedImage } from '../../utils/imageOptimizerr';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
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

export default function ProductCard({ item, index, onPress, onPressBounty, isCompareMode = false, isSelected = false }) {
    const { colors: C } = useTheme();
    const { user, userProfile, savedProducts } = useAppContext();
    const router = useRouter();
    const lang = useCurrentLanguage();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    // ── Smart save state ──────────────────────────────────────────────────────
    const [showClaimsPicker, setShowClaimsPicker] = useState(false);
    // docId of the freshly saved shelf entry (needed for later update)
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
    // Optimistic override for instant 0ms UI toggle
    const [optimisticSaved, setOptimisticSaved] = useState(null);
    const isSaved = optimisticSaved !== null ? optimisticSaved : !!savedItem;

    // Component mounted ref for crash prevention on unmount
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Reset optimistic override when Firestore syncs
    useEffect(() => {
        setOptimisticSaved(null);
    }, [savedProducts]);

    // ── Pending contributions ─────────────────────────────────────────────────
    const { hasPending, loading } = usePendingContributions(item.id);

    // ── Entry animation ───────────────────────────────────────────────────────
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1, duration: 400, delay: index * 50, useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0, friction: 8, tension: 40, delay: index * 50, useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // ── Smart Save / Remove (Instant UI + Background Processing) ──────────────
    const handleSmartSave = (e) => {
        e?.stopPropagation?.();

        if (!user) {
            AlertService.show({
                title: t('login_required', lang) || 'تسجيل الدخول مطلوب',
                message: t('login_to_save_shelf', lang) || 'يرجى تسجيل الدخول لحفظ المنتجات في رفّك',
                type: 'warning',
                buttons: [{ text: t('announcement_ok', lang) || 'حسنا', style: 'primary' }],
            });
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // ── REMOVE (Instant UI + Silent Background Delete) ───────────────────
        if (isSaved && savedItem?.id) {
            setOptimisticSaved(false); // Instant text toggle to "+ حفظ"

            removeProductFromShelf(user.uid, savedItem.id).catch(err => {
                console.error('[ProductCard] Remove error:', err);
                if (isMountedRef.current) setOptimisticSaved(true); // Revert on failure
            });
            return;
        }

        // ── SAVE (Instant UI + Background Save & Analysis) ────────────────────
        setOptimisticSaved(true); // Instant text toggle to "محفوظ ✓"

        const hasIngredients = Array.isArray(item.ingredients) 
            ? item.ingredients.length > 0 
            : !!(item.ingredients && String(item.ingredients).trim());
        const hasClaims = Array.isArray(item.marketingClaims) && item.marketingClaims.length > 0;

        saveProductToShelf(user.uid, item).then(shelfDocId => {
            if (!shelfDocId) return;
            pendingDocIdRef.current = shelfDocId;

            if (!hasIngredients) {
                AlertService.toast(`تمت إضافة ${item.name} إلى رفّك ✓`);
                return;
            }

            if (hasClaims) {
                AlertService.toast(`تم حفظ ${item.name}، وجاري التحليل 🧪`);
                analyzeAndEnrichShelfProduct(
                    user.uid, shelfDocId, item, userProfile, item.marketingClaims
                ).catch(err => console.warn('[BackgroundAnalysis] Error:', err));
            } else {
                if (isMountedRef.current) setShowClaimsPicker(true);
            }
        }).catch(err => {
            console.error('[ProductCard] Save error:', err);
            if (isMountedRef.current) setOptimisticSaved(false); // Revert on failure
        });
    };

    // Called when user confirms claims in the picker
    const handleClaimsConfirmed = useCallback((selectedClaims) => {
        setShowClaimsPicker(false);
        const docId = pendingDocIdRef.current;
        if (!docId || !user) return;

        AlertService.toast(`تم حفظ ${item.name}، وجاري التحليل 🧪`);
        analyzeAndEnrichShelfProduct(
            user.uid, docId, item, userProfile, selectedClaims
        ).catch(err => console.warn('[BackgroundAnalysis] Error:', err));
    }, [user, userProfile, item]);

    // Called when user dismisses the picker without confirming
    const handlePickerDismiss = useCallback(() => {
        setShowClaimsPicker(false);
        const docId = pendingDocIdRef.current;
        if (docId && user) {
            markShelfProductNeedsClaims(user.uid, docId).catch(err => console.warn('[NeedsClaims] Error:', err));
        }
    }, [user]);

    // ── Render ────────────────────────────────────────────────────────────────
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
                        borderWidth: isSelected ? 2 : 1,
                        opacity: fadeAnim,
                        transform: [{ translateY }],
                    },
                ]}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => onPress(item)}
                    style={styles.touchableArea}
                >
                    <View style={styles.cardImageContainer}>
                        {(!imageUri || hasImageError) ? (
                            <FontAwesome5 name={item.category?.icon || 'box'} size={28} color={C.textDim} />
                        ) : (
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.cardImage}
                                resizeMode="contain"
                                onError={handleImageError}
                            />
                        )}
                        {isCompareMode && (
                            <View style={[
                                styles.compareCheckbox,
                                {
                                    borderColor: isSelected ? C.accentGreen : C.textDim,
                                    backgroundColor: isSelected ? C.accentGreen : 'transparent',
                                },
                            ]}>
                                {isSelected && <Feather name="check" size={10} color="#FFF" />}
                            </View>
                        )}
                        <View style={[styles.categoryBadge, { backgroundColor: C.background }]}>
                            <FontAwesome5
                                name={item.category?.icon || 'box'}
                                size={10}
                                color={C.textDim}
                            />
                        </View>
                    </View>

                    <View style={styles.cardContent}>
                        <View style={styles.brandRow}>
                            <View style={styles.brandWithQty}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={(e) => {
                                        e?.stopPropagation?.();
                                        if (!item.brand) return;
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        router.push({
                                            pathname: '/CatalogScreen',
                                            params: { search: item.brand }
                                        });
                                    }}
                                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                    style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}
                                >
                                    <Text style={[styles.brandText, { color: C.accentGreen }]}>
                                        {item.brand}
                                    </Text>
                                    <FontAwesome5 name="search" size={9} color={C.accentGreen} style={{ opacity: 0.7 }} />
                                </TouchableOpacity>
                                {item.quantity ? (
                                    <Text style={[styles.qtyText, { color: C.textDim }]}>
                                        • {item.quantity}
                                    </Text>
                                ) : null}
                            </View>
                        </View>

                        <Text
                            style={[styles.productName, { color: C.textPrimary }]}
                            numberOfLines={2}
                        >
                            {item.name}
                        </Text>

                        <View style={styles.cardFooter}>
                            <View style={styles.priceAndBountyRow}>
                                {isMissingPrice ? (
                                    hasPendingPrice ? (
                                        <PendingBadge field="price" C={C} lang={lang} />
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => onPressBounty(item, 'price')}
                                            style={[
                                                styles.microBounty,
                                                {
                                                    borderColor: C.gold + '50',
                                                    backgroundColor: C.gold + '15',
                                                },
                                            ]}
                                        >
                                            <FontAwesome5 name="coins" size={9} color={C.gold} />
                                            <Text style={[styles.microBountyText, { color: C.gold }]}>
                                                {t('catalog_add_price', lang)} (+{pricePoints})
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                ) : (
                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                                        <Text style={[styles.priceText, { color: C.primary }]}>
                                            {displayPrice} {t('catalog_currency', lang)}
                                        </Text>
                                        {isMissingIngredients &&
                                            !hasPendingIngredients &&
                                            !hasPendingPrice && (
                                                <TouchableOpacity
                                                    onPress={() => onPressBounty(item, 'ingredients')}
                                                    style={[
                                                        styles.microBounty,
                                                        {
                                                            borderColor: C.accentGreen + '40',
                                                            backgroundColor: C.accentGreen + '15',
                                                        },
                                                    ]}
                                                >
                                                    <FontAwesome5 name="flask" size={10} color={C.accentGreen} />
                                                    <Text
                                                        style={[
                                                            styles.microBountyText,
                                                            { color: C.accentGreen },
                                                        ]}
                                                    >
                                                        +{ingredientsPoints}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        {isMissingIngredients && hasPendingIngredients && (
                                            <PendingBadge field="ingredients" C={C} small lang={lang} />
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* High-visibility clean text save button in bottom left */}
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={handleSmartSave}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={{ paddingVertical: 2, paddingHorizontal: 4 }}
                            >
                                <Text style={{
                                    fontFamily: 'Tajawal-ExtraBold',
                                    fontSize: 14,
                                    color: isSaved ? C.accentGreen : C.textPrimary,
                                }}>
                                    {isSaved ? 'محفوظ ✓' : '+ حفظ'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>

            {/* Claims picker — mounts per card only when needed */}
            <ClaimsPickerModal
                visible={showClaimsPicker}
                product={item}
                onConfirm={handleClaimsConfirmed}
                onDismiss={handlePickerDismiss}
            />
        </>
    );
}

// ─────────────────────────────────────────────────────────────
// Helper component for pending badge
// ─────────────────────────────────────────────────────────────
const PendingBadge = ({ field, C, small, lang }) => (
    <View
        style={[
            styles.pendingBadge,
            { backgroundColor: C.gold + '20', borderColor: C.gold },
            small && { paddingHorizontal: 6, paddingVertical: 3, gap: 4 },
        ]}
    >
        <Feather name="clock" size={small ? 8 : 10} color={C.gold} />
        <Text style={[styles.pendingText, { color: C.gold, fontSize: small ? 9 : 10 }]}>
            {t('catalog_pending_review', lang)}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 20, borderWidth: 1, marginBottom: 15, height: 130, overflow: 'hidden',
    },
    touchableArea: {
        flexDirection: 'row-reverse', width: '100%', height: '100%', padding: 12, gap: 15,
    },
    cardImageContainer: {
        width: 100, height: '100%', backgroundColor: '#FFF',
        borderRadius: 14, justifyContent: 'center', alignItems: 'center', padding: 4, overflow: 'hidden',
    },
    cardImage: { width: '100%', height: '100%' },
    categoryBadge: { position: 'absolute', bottom: 5, right: 5, padding: 6, borderRadius: 10 },
    cardContent: { flex: 1, justifyContent: 'space-between' },
    brandRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    brandWithQty: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    brandText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 12 },
    qtyText: { fontFamily: 'Tajawal-Regular', fontSize: 11 },
    cleanBookmarkBtn: { padding: 4, justifyContent: 'center', alignItems: 'center' },
    productName: { fontFamily: 'Tajawal-Bold', fontSize: 14, textAlign: 'right' },
    cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    priceText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 15 },
    bountyButton: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
    },
    bountyText: { fontFamily: 'Tajawal-Bold', fontSize: 11 },
    pointsPill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
    pointsPillText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 9, color: '#000' },
    priceAndBountyRow: { flexShrink: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    microBounty: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
    },
    microBountyText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 10 },
    pendingBadge: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
    },
    pendingText: { fontFamily: 'Tajawal-Bold', fontSize: 10 },
    compareCheckbox: {
        position: 'absolute', top: 5, left: 5, width: 20, height: 20, borderRadius: 10,
        borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', zIndex: 10,
    },
});