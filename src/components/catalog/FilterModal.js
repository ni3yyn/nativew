import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  Pressable, ScrollView, Dimensions, Animated, Easing, Platform 
} from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- MICRO-COMPONENT: LIGHTWEIGHT CHIP (Zero JS-animation overhead) ---
const AnimatedChip = memo(({ isActive, label, icon, onPress, C }) => {
    return (
        <TouchableOpacity 
            activeOpacity={0.7} 
            onPress={() => { Haptics.selectionAsync(); onPress(); }}
            style={[
                styles.chip, 
                { 
                    backgroundColor: isActive ? C.accentGreen : C.card, 
                    borderColor: isActive ? C.accentGreen : C.border,
                }
            ]}
        >
            <Text style={[styles.chipText, { color: isActive ? C.textOnAccent : C.textSecondary }]}>{label}</Text>
            {icon && <FontAwesome5 name={icon} size={12} color={isActive ? C.textOnAccent : C.textSecondary} />}
        </TouchableOpacity>
    );
});

// --- MAIN COMPONENT ---
export default function FilterModal({ visible, onClose, onApply, currentFilters, availableBrands }) {
    const language = useCurrentLanguage();
    const { colors: C } = useTheme();
    const rtl = useRTL();
    
    const [localFilters, setLocalFilters] = useState(currentFilters);
    const animState = useRef(new Animated.Value(0)).current;

    // Background sync: updates local state silently when parent changes
    useEffect(() => {
        setLocalFilters(currentFilters);
    }, [currentFilters]);

    // Triggers instantly. requestAnimationFrame guarantees the DOM is drawn before animating, killing lag.
    useEffect(() => {
        if (visible) {
            requestAnimationFrame(() => {
                Animated.spring(animState, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }).start();
            });
        }
    }, [visible, animState]);

    const handleClose = useCallback(() => {
        Animated.timing(animState, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    }, [animState, onClose]);

    const handleApply = useCallback(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onApply(localFilters);
        handleClose();
    }, [localFilters, onApply, handleClose]);

    const handleReset = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const defaultFilters = { bountiesOnly: false, brand: 'all', sort: 'default' };
        setLocalFilters(defaultFilters);
        onApply(defaultFilters);
        handleClose();
    }, [onApply, handleClose]);

    // useCallback prevents breaking the AnimatedChip memoization
    const toggleSort = useCallback((sortType) => setLocalFilters(prev => ({ ...prev, sort: sortType })), []);
    const toggleBrand = useCallback((brand) => setLocalFilters(prev => ({ ...prev, brand: brand })), []);
    const toggleBounty = useCallback(() => {
        Haptics.selectionAsync();
        setLocalFilters(prev => ({ ...prev, bountiesOnly: !prev.bountiesOnly }));
    }, []);

    const overlayOpacity = animState.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const modalTranslateY = animState.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] });

    return (
        <Modal 
            visible={visible} 
            transparent 
            animationType="none" 
            onRequestClose={handleClose}
            statusBarTranslucent
            hardwareAccelerated={true}
        >
            <Animated.View style={[styles.appCanvasOverlay, { opacity: overlayOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                
                <Animated.View 
                    style={[
                        styles.liquidSheet, 
                        { 
                            backgroundColor: C.background, 
                            borderColor: C.border,
                            transform: [{ translateY: modalTranslateY }]
                        }
                    ]}
                >
                    
                    <View style={styles.topNotchContainer}>
                        <View style={[styles.liquidNotch, { backgroundColor: C.textDim + '30' }]} />
                    </View>
                    
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: C.textPrimary }]}>{t('catalog_filter_title', language)}</Text>
                        <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
                            <Feather name="refresh-ccw" size={12} color={C.danger} />
                            <Text style={[styles.resetText, { color: C.danger }]}>{t('catalog_filter_reset', language)}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                        
                        {/* 1. Gamification Filter */}
                        <TouchableOpacity activeOpacity={0.9} onPress={toggleBounty}>
                            <LinearGradient 
                                colors={localFilters.bountiesOnly ? [C.gold + '2A', C.card] :[C.card, C.card]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={[styles.bountyQuestCard, { borderColor: localFilters.bountiesOnly ? C.gold : C.border }]}
                            >
                                <View style={styles.bountyTextRow}>
                                    <View style={[styles.iconBlurCircle, { backgroundColor: localFilters.bountiesOnly ? C.gold : C.border + '50' }]}>
                                        <FontAwesome5 name="medal" size={14} color={localFilters.bountiesOnly ? '#000' : C.textDim} />
                                    </View>
                                    <View>
                                        <Text style={[styles.bountyTitle, { color: localFilters.bountiesOnly ? C.gold : C.textPrimary }]}>
                                            {t('catalog_filter_bounties_only', language)}
                                        </Text>
                                        <Text style={[styles.hintText, { color: C.textDim }]}>
                                            {t('catalog_filter_bounties_hint', language)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.customCheckbox, { borderColor: localFilters.bountiesOnly ? C.gold : C.textDim }]}>
                                    {localFilters.bountiesOnly && <FontAwesome5 name="check" size={10} color={C.gold} />}
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* 2. Sorting */}
                        <View style={[styles.bentoSection, { backgroundColor: C.card, borderColor: C.border }]}>
                            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{t('catalog_filter_sort_title', language)}</Text>
                            <View style={styles.chipsRow}>
                                {[
                                    { id: 'default', label: t('catalog_filter_sort_default', language), icon: 'list' },
                                    { id: 'price_asc', label: t('catalog_filter_sort_price_asc', language), icon: 'sort-numeric-up' },
                                    { id: 'price_desc', label: t('catalog_filter_sort_price_desc', language), icon: 'sort-numeric-down-alt' },
                                ].map(sortOption => (
                                    <AnimatedChip 
                                        key={sortOption.id} 
                                        isActive={localFilters.sort === sortOption.id} 
                                        label={sortOption.label} 
                                        icon={sortOption.icon} 
                                        onPress={() => toggleSort(sortOption.id)} 
                                        C={C} 
                                    />
                                ))}
                            </View>
                        </View>

                        {/* 3. Brands */}
                        {availableBrands.length > 1 && (
                            <View style={[styles.bentoSection, { backgroundColor: C.card, borderColor: C.border }]}>
                                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>{t('catalog_filter_brand_title', language)}</Text>
                                <View style={styles.chipsRow}>
                                    {availableBrands.map(brand => (
                                        <AnimatedChip 
                                            key={brand} 
                                            isActive={localFilters.brand === brand} 
                                            label={brand === 'all' ? t('catalog_filter_brand_all', language) : brand} 
                                            onPress={() => toggleBrand(brand)} 
                                            C={C} 
                                        />
                                    ))}
                                </View>
                            </View>
                        )}
                        
                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Footer (Exactly identical to AddProductModal.js) */}
                    <View style={[styles.footer, { backgroundColor: C.background, borderTopColor: C.border, flexDirection: rtl.flexDirection }]}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                            <Text style={{ color: C.textDim, fontFamily: 'Tajawal-Bold', fontSize: 15 }}>
                                {t('cancel', language)}
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.submitBtnWrapper, rtl.isRTL && { marginLeft: 0, marginRight: 16 }]}
                            onPress={handleApply}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[C.accentGreen, '#2E8062']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.submitGradient}
                            >
                                <View style={[styles.submitInnerRow, { flexDirection: rtl.flexDirection }]}>
                                    <Text style={styles.submitText}>{t('catalog_filter_apply', language)}</Text>
                                    <Feather name="filter" size={18} color="#FFF" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    appCanvasOverlay: { flex: 1, backgroundColor: 'rgba(5, 10, 15, 0.75)', justifyContent: 'flex-end' },
    liquidSheet: { height: SCREEN_HEIGHT * 0.88, borderTopLeftRadius: 42, borderTopRightRadius: 42, borderWidth: 1, borderBottomWidth: 0, overflow: 'hidden' },
    topNotchContainer: { width: '100%', alignItems: 'center', position: 'absolute', top: 12, zIndex: 10 },
    liquidNotch: { width: 55, height: 6, borderRadius: 10 },
    
    header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginTop: 35, marginBottom: 15 },
    title: { fontFamily: 'Tajawal-ExtraBold', fontSize: 22 },
    resetBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255, 59, 48, 0.1)' },
    resetText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    
    scroll: { padding: 22 },
    
    // Gamification Quest Card
    bountyQuestCard: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderRadius: 24, borderWidth: 1.5, marginBottom: 20 },
    bountyTextRow: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
    iconBlurCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    bountyTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, textAlign: 'right', marginBottom: 2 },
    hintText: { fontFamily: 'Tajawal-Regular', fontSize: 11, textAlign: 'right', maxWidth: '90%' },
    customCheckbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },

    // Bento Sections
    bentoSection: { padding: 20, borderRadius: 28, borderWidth: 1, marginBottom: 20 },
    sectionTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, marginBottom: 15, textAlign: 'right' },
    
    // Chips
    chipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
    chip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
    chipText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },

    // Footer styles (Identical to AddProductModal.js)
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 85,
        alignItems: 'center',
        paddingHorizontal: 20,
        borderTopWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    },
    cancelBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    submitBtnWrapper: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        marginLeft: 16,
    },
    submitGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitInnerRow: {
        alignItems: 'center',
        gap: 8,
    },
    submitText: {
        color: '#FFF',
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15,
    },
});