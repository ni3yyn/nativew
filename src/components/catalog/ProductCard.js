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
import { useTheme } from '../../context/ThemeContext';
import { getOptimizedImage } from '../../utils/imageOptimizerr';
import { t } from '../../i18n';
import { getPointsForField } from '../../utils/gamificationEngine';
import { usePendingContributions } from '../../hooks/usePendingContributions';

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

export default function ProductCard({ item, index, onPress, onPressBounty }) {
    const { colors: C } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

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
                    borderColor: C.border,
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
                    <Image
                        source={{ uri: getOptimizedImage(item.image, 250) }}
                        style={styles.cardImage}
                        resizeMode="contain"
                    />
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
                        <Text style={[styles.brandText, { color: C.accentGreen }]}>
                            {item.brand}
                        </Text>
                        {item.quantity ? (
                            <Text style={[styles.qtyText, { color: C.textDim }]}>
                                {item.quantity}
                            </Text>
                        ) : null}
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
                                <PendingBadge field="price" C={C} />
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
                                        {t('catalog_add_price')}
                                    </Text>
                                    <View style={[styles.pointsPill, { backgroundColor: C.gold }]}>
                                        <Text style={styles.pointsPillText}>+{pricePoints}</Text>
                                    </View>
                                </TouchableOpacity>
                            )
                        ) : (
                            <View style={styles.priceAndBountyRow}>
                                <Text style={[styles.priceText, { color: C.primary }]}>
                                    {displayPrice} {t('catalog_currency')}
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
                                    <PendingBadge field="ingredients" C={C} small />
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
const PendingBadge = ({ field, C, small }) => (
    <View
        style={[
            styles.pendingBadge,
            { backgroundColor: C.gold + '20', borderColor: C.gold },
            small && { paddingHorizontal: 6, paddingVertical: 3, gap: 4 },
        ]}
    >
        <Feather name="clock" size={small ? 8 : 10} color={C.gold} />
        <Text style={[styles.pendingText, { color: C.gold, fontSize: small ? 9 : 10 }]}>
            قيد المراجعة
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
    },
    cardImage: { width: '85%', height: '85%' },
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
    brandText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 12 },
    qtyText: { fontFamily: 'Tajawal-Regular', fontSize: 11 },
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
});