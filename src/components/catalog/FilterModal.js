import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  Pressable, ScrollView, Dimensions, Animated 
} from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

const { height } = Dimensions.get('window');

// --- MICRO-COMPONENT: ANIMATED CHIP ---
const AnimatedChip = ({ isActive, label, icon, onPress, C }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();

    return (
        <TouchableOpacity 
            activeOpacity={0.9} 
            onPressIn={handlePressIn} 
            onPressOut={handlePressOut} 
            onPress={() => { Haptics.selectionAsync(); onPress(); }}
        >
            <Animated.View style={[
                styles.chip, 
                { 
                    backgroundColor: isActive ? C.accentGreen : C.card, 
                    borderColor: isActive ? C.accentGreen : C.border,
                    transform: [{ scale: scaleAnim }]
                }
            ]}>
                <Text style={[styles.chipText, { color: isActive ? C.textOnAccent : C.textSecondary }]}>{label}</Text>
                {icon && <FontAwesome5 name={icon} size={12} color={isActive ? C.textOnAccent : C.textSecondary} />}
            </Animated.View>
        </TouchableOpacity>
    );
};

// --- MAIN COMPONENT ---
export default function FilterModal({ visible, onClose, onApply, currentFilters, availableBrands }) {
    const language = useCurrentLanguage();
    const { colors: C } = useTheme();
    const [localFilters, setLocalFilters] = useState(currentFilters);

    // Sync local state when modal opens
    useEffect(() => {
        if (visible) {
            setLocalFilters(currentFilters);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [visible, currentFilters]);

    const handleApply = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onApply(localFilters);
        onClose();
    };

    const handleReset = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const defaultFilters = { bountiesOnly: false, brand: 'all', sort: 'default' };
        setLocalFilters(defaultFilters);
        onApply(defaultFilters);
        onClose();
    };

    const toggleSort = (sortType) => setLocalFilters(prev => ({ ...prev, sort: sortType }));
    const toggleBrand = (brand) => setLocalFilters(prev => ({ ...prev, brand: brand }));
    
    const toggleBounty = () => {
        Haptics.selectionAsync();
        setLocalFilters(prev => ({ ...prev, bountiesOnly: !prev.bountiesOnly }));
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.appCanvasOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                
                <View style={[styles.liquidSheet, { backgroundColor: C.background, borderColor: C.border }]}>
                    
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
                        
                        {/* 1. Gamification Filter (Bounty Quest Style) */}
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

                        {/* 2. Sorting (Bento Box) */}
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

                        {/* 3. Brands (Bento Box) */}
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

                    {/* Floating Action Footer */}
                    <View style={styles.gradientFadeArea} pointerEvents="box-none">
                        <LinearGradient colors={['transparent', C.background, C.background]} style={StyleSheet.absoluteFill} locations={[0, 0.4, 1]} pointerEvents="none" />
                        <TouchableOpacity 
                            activeOpacity={0.8}
                            style={[styles.primaryArchitectBtn, { elevation: 8, shadowColor: C.accentGreen }]}
                            onPress={handleApply}
                        >
                            <LinearGradient colors={[C.accentGreen, '#2E8062']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.architectGradients}>
                                <Text style={[styles.btnArchitectText, { color: C.textOnAccent }]}>{t('catalog_filter_apply', language)}</Text>
                                <Feather name="filter" size={18} color={C.textOnAccent} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    appCanvasOverlay: { flex: 1, backgroundColor: 'rgba(5, 10, 15, 0.75)', justifyContent: 'flex-end' },
    liquidSheet: { height: height * 0.88, borderTopLeftRadius: 42, borderTopRightRadius: 42, borderWidth: 1, borderBottomWidth: 0, overflow: 'hidden' },
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

    // Floating Footer
    gradientFadeArea: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140, justifyContent: 'flex-end', padding: 22, paddingBottom: 35 },
    primaryArchitectBtn: { height: 60, borderRadius: 20, width: '100%', overflow: 'hidden' },
    architectGradients: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 12 },
    btnArchitectText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18 }
});