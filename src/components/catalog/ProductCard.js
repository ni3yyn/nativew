// src/components/catalog/ProductCard.js
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Image,
} from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useAppContext } from '../../context/AppContext';
import { getOptimizedImage } from '../../utils/imageOptimizerr';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { getPointsForField } from '../../utils/gamificationEngine';
import { usePendingContributions } from '../../hooks/usePendingContributions';
import { saveProductToShelf, removeProductFromShelf } from '../../services/communityService';
import { AlertService } from '../../services/alertService';

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
    const { user, savedProducts } = useAppContext();
    const lang = useCurrentLanguage();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    const [imageUri, setImageUri] = React.useState(() => getOptimizedImage(item?.image, 250));
    const [hasImageError, setHasImageError] = React.useState(false);

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

    const savedItem = (savedProducts || []).find(
        p => p.productId === item?.id || p.id === item?.id || 
        (p.productName && item?.name && p.productName.toLowerCase() === item.name.toLowerCase())
    );
    const isSaved = !!savedItem;

    const handleQuickSave = async (e) => {
        e?.stopPropagation?.();
        if (!user) {
            AlertService.show({
                title: t('login_required', lang) || 'تسجيل الدخول مطلوب',
                message: t('login_to_save_shelf', lang) || 'يرجى تسجيل الدخول لحفظ المنتجات في رفّك',
                type: 'warning',
                buttons: [{ text: t('announcement_ok', lang) || 'حسنا', style: 'primary' }]
            });
            return;
        }

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (isSaved && savedItem?.id) {
                await removeProductFromShelf(user.uid, savedItem.id);
                AlertService.success(
                    t('community_deleted_title', lang) || 'تم الحذف',
                    t('product_removed_from_shelf', lang) || 'تم إزالة المنتج من رفّك'
                );
            } else {
                await saveProductToShelf(user.uid, item);
                AlertService.success(
                    t('community_saved_title', lang) || 'تم الحفظ',
                    t('community_saved_message', lang) || 'تمت إضافة المنتج إلى رفّك بنجاح'
                );
            }
        } catch (err) {
            console.error("Quick save error:", err);
        }
    };

    // Check if any pending contribution exists for this product
    const { hasPending, loading } = usePendingContributions(item.id);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay: index * 50,
                useNativeDriver: true,
            }),
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                tension: 40,
                delay: index * 50,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const displayPrice = formatPrice(item.price);
    const isMissingPrice = !displayPrice;
    const isMissingIngredients = !item.ingredients || item.ingredients.trim() === '';
    const pricePoints = getPointsForField('price');
    const ingredientsPoints = getPointsForField('ingredients');

    const hasPendingPrice = hasPending('price');
    const hasPendingIngredients = hasPending('ingredients');

    return (
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
                                backgroundColor: isSelected ? C.accentGreen : 'transparent'
                            }
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
                            <Text style={[styles.brandText, { color: C.accentGreen }]}>
                                {item.brand}
                            </Text>
                            {item.quantity ? (
                                <Text style={[styles.qtyText, { color: C.textDim }]}>
                                    • {item.quantity}
                                </Text>
                            ) : null}
                        </View>

                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={handleQuickSave}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.cleanBookmarkBtn}
                        >
                            <FontAwesome5 
                                name="bookmark" 
                                size={17} 
                                color={isSaved ? C.accentGreen : C.textDim} 
                                solid={isSaved} 
                            />
                        </TouchableOpacity>
                    </View>

                    <Text
                        style={[styles.productName, { color: C.textPrimary }]}
                        numberOfLines={2}
                    >
                        {item.name}
                    </Text>

                    <View style={styles.cardFooter}>
                        {isMissingPrice ? (
                            hasPendingPrice ? (
                                <PendingBadge field="price" C={C} lang={lang} />
                            ) : (
                                <TouchableOpacity
                                    onPress={() => onPressBounty(item, 'price')}
                                    style={[
                                        styles.bountyButton,
                                        { borderColor: C.gold, backgroundColor: C.gold + '15' },
                                    ]}
                                >
                                    <FontAwesome5 name="medal" size={10} color={C.gold} />
                                    <Text style={[styles.bountyText, { color: C.gold }]}>
                                        {t('catalog_add_price', lang)}
                                    </Text>
                                    <View style={[styles.pointsPill, { backgroundColor: C.gold }]}>
                                        <Text style={styles.pointsPillText}>+{pricePoints}</Text>
                                    </View>
                                </TouchableOpacity>
                            )
                        ) : (
                            <View style={styles.priceAndBountyRow}>
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
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// Helper component for pending badge
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
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 15,
        height: 130,
        overflow: 'hidden',
    },
    touchableArea: {
        flexDirection: 'row-reverse',
        width: '100%',
        height: '100%',
        padding: 12,
        gap: 15,
    },
    cardImageContainer: {
        width: 100,
        height: '100%',
        backgroundColor: '#FFF',
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
        overflow: 'hidden',
    },
    cardImage: { width: '100%', height: '100%' },
    categoryBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        padding: 6,
        borderRadius: 10,
    },
    cardContent: { flex: 1, justifyContent: 'space-between' },
    brandRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    brandWithQty: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    brandText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 12 },
    qtyText: { fontFamily: 'Tajawal-Regular', fontSize: 11 },
    cleanBookmarkBtn: {
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    productName: { fontFamily: 'Tajawal-Bold', fontSize: 14, textAlign: 'right' },
    cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    priceText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 15 },
    bountyButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    bountyText: { fontFamily: 'Tajawal-Bold', fontSize: 11 },
    pointsPill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
    pointsPillText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 9, color: '#000' },
    priceAndBountyRow: { flex: 1, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    microBounty: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    microBountyText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 10 },
    pendingBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    pendingText: { fontFamily: 'Tajawal-Bold', fontSize: 10 },
    compareCheckbox: {
        position: 'absolute',
        top: 5,
        left: 5,
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});