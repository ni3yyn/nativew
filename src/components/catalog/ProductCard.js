import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { getOptimizedImage } from '../../utils/imageOptimizerr';

// Helper to safely format price objects
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

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, friction: 8, tension: 40, delay: index * 50, useNativeDriver: true })
        ]).start();
    },[]);

    const displayPrice = formatPrice(item.price);
    const isMissingPrice = displayPrice === null || displayPrice === undefined;

    return (
        <Animated.View style={[styles.cardContainer, { backgroundColor: C.card, borderColor: C.border, opacity: fadeAnim, transform: [{ translateY }] }]}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(item)} style={styles.touchableArea}>
                <View style={styles.cardImageContainer}>
                    <Image 
                        source={{ uri: getOptimizedImage(item.image, 250) }} 
                        style={styles.cardImage} 
                        resizeMode="contain" 
                    />
                    <View style={[styles.categoryBadge, { backgroundColor: C.background }]}>
                        <FontAwesome5 name={item.category?.icon || 'box'} size={10} color={C.textDim} />
                    </View>
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.brandRow}>
                        <Text style={[styles.brandText, { color: C.accentGreen }]}>{item.brand}</Text>
                        {item.quantity ? <Text style={[styles.qtyText, { color: C.textDim }]}>{item.quantity}</Text> : null}
                    </View>
                    <Text style={[styles.productName, { color: C.textPrimary }]} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.cardFooter}>
                        {isMissingPrice ? (
                            <TouchableOpacity onPress={() => onPressBounty(item, 'price')} style={[styles.bountyButton, { borderColor: C.gold }]}>
                                <Text style={[styles.bountyText, { color: C.gold }]}>أضيفي السعر</Text>
                            </TouchableOpacity>
                        ) : (
                            <Text style={[styles.priceText, { color: C.primary }]}>{displayPrice} د.ج</Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    cardContainer: { borderRadius: 20, borderWidth: 1, marginBottom: 15, height: 130, overflow: 'hidden' },
    touchableArea: { flexDirection: 'row-reverse', width: '100%', height: '100%', padding: 12, gap: 15 },
    cardImageContainer: { width: 100, height: '100%', backgroundColor: '#FFF', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    cardImage: { width: '85%', height: '85%' },
    categoryBadge: { position: 'absolute', bottom: 5, right: 5, padding: 6, borderRadius: 10 },
    cardContent: { flex: 1, justifyContent: 'space-between' },
    brandRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    brandText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 12 },
    qtyText: { fontFamily: 'Tajawal-Regular', fontSize: 11 },
    productName: { fontFamily: 'Tajawal-Bold', fontSize: 14, textAlign: 'right' },
    cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 10 },
    priceText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 14 },
    bountyButton: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed' },
    bountyText: { fontFamily: 'Tajawal-Bold', fontSize: 11 },
});