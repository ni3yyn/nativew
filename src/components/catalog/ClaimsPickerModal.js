// src/components/catalog/ClaimsPickerModal.js

import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import {
    View, Text, StyleSheet, Modal, FlatList,
    TextInput, TouchableOpacity, Animated,
    Easing, Dimensions, Pressable, Platform,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import Fuse from 'fuse.js';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { getClaimsByProductType } from '../../constants/productData';
import { getClaimData } from '../../utils/claimMapper';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';
import AppTextInput from '../common/AppTextInput';

const { height } = Dimensions.get('window');

// --- SAFE ICON RESOLVER (Prevents FontAwesome5 crashes) ---
const getSafeIcon = (rawIcon) => {
    if (!rawIcon) return 'check-circle';
    const map = {
        sparkles: 'magic',
        sparkle: 'magic',
        mirror: 'magic',
        shield: 'shield-alt',
        water: 'tint',
        droplet: 'tint',
        sun: 'sun',
        moon: 'moon',
    };
    return map[rawIcon] || rawIcon;
};

// ─────────────────────────────────────────────────────────────
// ClaimCard — Unified, Clean, Flat Brand Item
// ─────────────────────────────────────────────────────────────
const ClaimCard = memo(({ claim, selected, onToggle, C, isRTL }) => {
    const claimInfo = useMemo(() => getClaimData(claim), [claim]);
    const iconName = useMemo(() => getSafeIcon(claimInfo?.icon), [claimInfo]);

    return (
        <TouchableOpacity
            onPress={onToggle}
            activeOpacity={0.75}
            style={[
                styles.claimCard,
                {
                    backgroundColor: selected ? C.accentGreen + '14' : C.card,
                    borderColor: selected ? C.accentGreen : C.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                },
            ]}
        >
            {/* Unified Icon Badge */}
            <View
                style={[
                    styles.claimIconCircle,
                    {
                        backgroundColor: selected
                            ? C.accentGreen + '22'
                            : (C.surfaceSoft || (C.accentGreen + '0D')),
                    },
                ]}
            >
                <FontAwesome5
                    name={iconName}
                    size={13}
                    color={selected ? C.accentGreen : (C.textDim || C.textSecondary)}
                />
            </View>

            {/* Big Bold Label */}
            <Text
                style={[
                    styles.claimCardText,
                    {
                        color: selected ? C.textPrimary : C.textSecondary,
                        fontFamily: selected ? 'Tajawal-ExtraBold' : 'Tajawal-Bold',
                        textAlign: isRTL ? 'right' : 'left',
                    },
                ]}
                numberOfLines={1}
            >
                {claimInfo?.label || claim}
            </Text>

            {/* Unified Selection Checkbox */}
            <View
                style={[
                    styles.checkCircle,
                    {
                        borderColor: selected ? C.accentGreen : C.border,
                        backgroundColor: selected ? C.accentGreen : 'transparent',
                    },
                ]}
            >
                {selected && <FontAwesome5 name="check" size={10} color={C.textOnAccent || '#FFF'} />}
            </View>
        </TouchableOpacity>
    );
});

// ─────────────────────────────────────────────────────────────
// ClaimsPickerModal
// ─────────────────────────────────────────────────────────────
export default function ClaimsPickerModal({ visible, product, onConfirm, onDismiss }) {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL } = useRTL();
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState('');
    const slideAnim = useRef(new Animated.Value(height)).current;

    // Determine claims list from product type
    const productType = product?.category?.id || product?.productType || 'other';
    const claimsList = useMemo(() => getClaimsByProductType(productType), [productType]);
    const fuse = useMemo(() => new Fuse(claimsList, { threshold: 0.4 }), [claimsList]);

    const displayed = useMemo(() => {
        if (!search.trim()) return claimsList;
        return fuse.search(search).map(r => r.item);
    }, [search, claimsList, fuse]);

    // Pre-fill with existing claims on open & animate entrance
    useEffect(() => {
        if (visible) {
            setSelected(product?.marketingClaims?.length > 0 ? [...product.marketingClaims] : []);
            setSearch('');
            Animated.spring(slideAnim, {
                toValue: 0, friction: 9, tension: 50, useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: height, duration: 220,
                easing: Easing.in(Easing.ease), useNativeDriver: true,
            }).start();
        }
    }, [visible, product, slideAnim]);

    const toggle = useCallback((claim) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelected(prev =>
            prev.includes(claim) ? prev.filter(c => c !== claim) : [...prev, claim]
        );
    }, []);

    const handleConfirm = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (typeof onConfirm === 'function') {
            onConfirm(selected);
        }
    };

    const handleDismissSafe = () => {
        if (typeof onDismiss === 'function') {
            onDismiss();
        }
    };

    const renderItem = useCallback(({ item }) => (
        <ClaimCard
            claim={item}
            selected={selected.includes(item)}
            onToggle={() => toggle(item)}
            C={C}
            isRTL={isRTL}
        />
    ), [selected, toggle, C, isRTL]);

    if (!visible && !product) return null;

    const productName = product?.name || product?.productName || t('community_product', language) || 'هذا المنتج';

    return (
        <Modal
            transparent
            visible={!!visible}
            onRequestClose={handleDismissSafe}
            animationType="none"
            statusBarTranslucent
        >
            <View style={styles.root}>
                {/* Backdrop */}
                <Pressable
                    style={styles.backdrop}
                    onPress={handleDismissSafe}
                />

                {/* Bottom Sheet */}
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: C.card,
                            borderColor: C.border,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Handle Bar */}
                    <TouchableOpacity style={styles.handleWrap} onPress={handleDismissSafe} activeOpacity={0.7}>
                        <View style={[styles.handle, { backgroundColor: C.border }]} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: C.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                            {t('product_claims_title', language) || "ادّعاءات المنتج"}
                        </Text>
                        <Text style={[styles.headerSub, { color: C.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                            {isRTL ? `حددي ادعاءات ${productName} للتحقق منها كيميائياً` : `Select claims for ${productName} to evaluate them`}
                        </Text>
                    </View>

                    {/* 🌟 SEARCH BAR (Redesigned to match ShelfSearchBar) 🌟 */}
                    <View
                        style={[
                            styles.searchContainer,
                            {
                                backgroundColor: C.card,
                                borderColor: C.accentGreen + '40',
                                flexDirection: isRTL ? 'row-reverse' : 'row',
                            },
                        ]}
                    >
                        {/* Search Input Side */}
                        <View style={[styles.searchSide, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <FontAwesome5 name="search" size={15} color={C.textSecondary} />
                            <AppTextInput
                                style={[
                                    styles.searchInput,
                                    {
                                        color: C.textPrimary,
                                        textAlign: isRTL ? 'right' : 'left',
                                    },
                                ]}
                                placeholder={isRTL ? "ابحثي عن ادّعاء معين..." : "Search claims..."}
                                placeholderTextColor={C.textDim}
                                value={search}
                                onChangeText={setSearch}
                                selectionColor={C.accentGreen}
                            />
                        </View>

                        {/* Divider */}
                        <View style={[styles.searchDivider, { backgroundColor: C.border }]} />

                        {/* Action Side Button (Clear or Active Search Icon) */}
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setSearch('')}
                            disabled={search.length === 0}
                            style={[
                                styles.searchActionButton,
                                {
                                    backgroundColor: search.length > 0 ? C.accentGreen + '1A' : C.surfaceSoft || (C.accentGreen + '0D'),
                                },
                            ]}
                        >
                            <FontAwesome5
                                name={search.length > 0 ? "times" : "sliders-h"}
                                size={14}
                                color={search.length > 0 ? C.accentGreen : C.textDim}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Selection Counter & Clear All */}
                    {selected.length > 0 && (
                        <View style={[styles.counterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <View style={[styles.counterBadge, { backgroundColor: C.accentGreen + '1A', borderColor: C.accentGreen + '33', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <FontAwesome5 name="check-circle" size={12} color={C.accentGreen} />
                                <Text style={[styles.counterText, { color: C.accentGreen }]}>
                                    {selected.length} {isRTL ? 'ادّعاء مختار' : 'selected'}
                                </Text>
                            </View>

                            <TouchableOpacity onPress={() => setSelected([])}>
                                <Text style={[styles.clearText, { color: C.danger }]}>
                                    {isRTL ? 'مسح الكل' : 'Clear All'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Claims list */}
                    <FlatList
                        data={displayed}
                        keyExtractor={item => item}
                        renderItem={renderItem}
                        extraData={selected}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        initialNumToRender={14}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        ListEmptyComponent={
                            <View style={styles.emptyWrap}>
                                <FontAwesome5 name="search-minus" size={26} color={C.textSecondary} style={{ opacity: 0.5, marginBottom: 8 }} />
                                <Text style={[styles.emptyText, { color: C.textSecondary }]}>
                                    {isRTL ? 'لا توجد نتائج تطابق بحثك' : 'No matching claims'}
                                </Text>
                            </View>
                        }
                    />

                    {/* Sticky Footer CTA */}
                    <View style={[styles.ctaWrap, { backgroundColor: C.card, borderTopColor: C.border }]}>
                        <TouchableOpacity
                            onPress={handleConfirm}
                            activeOpacity={0.85}
                            style={[styles.ctaBtn, { backgroundColor: C.accentGreen, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        >
                            <FontAwesome5 name="flask" size={15} color={C.textOnAccent || '#FFF'} />
                            <Text style={[styles.ctaBtnText, { color: C.textOnAccent || '#FFF' }]}>
                                {selected.length > 0
                                    ? (isRTL ? `تحليل مع ${selected.length} ادّعاء` : `Analyze with ${selected.length} claims`)
                                    : (isRTL ? 'تحليل بدون ادّعاءات' : 'Analyze without claims')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleDismissSafe} style={styles.skipBtn}>
                            <Text style={[styles.skipText, { color: C.textSecondary }]}>
                                {isRTL ? 'تخطّي — حفظ فقط بدون تحليل' : 'Skip — Save without analysis'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    sheet: {
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0,
        height: '84%',
        borderTopLeftRadius: 28, 
        borderTopRightRadius: 28,
        borderWidth: 0.5,
        borderBottomWidth: 0,
        overflow: 'hidden',
    },
    handleWrap: { 
        alignItems: 'center', 
        paddingTop: 12, 
        paddingBottom: 6,
        width: '100%',
    },
    handle: { 
        width: 42, 
        height: 4, 
        borderRadius: 2,
    },
    header: {
        paddingHorizontal: 20, 
        paddingTop: 8,
        paddingBottom: 4,
    },
    headerTitle: {
        fontFamily: 'Tajawal-ExtraBold', 
        fontSize: 22, 
        marginBottom: 4,
    },
    headerSub: {
        fontFamily: 'Tajawal-Regular', 
        fontSize: 13, 
        lineHeight: 20,
    },

    /* 🌟 SHELF SEARCH BAR CLONE (Flat, 0.5 border) 🌟 */
    searchContainer: {
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 8,
        height: 54,
        marginHorizontal: 18,
        marginTop: 8,
        marginBottom: 12,
        borderWidth: 0.5,
    },
    searchSide: {
        flex: 1,
        alignItems: 'center',
        paddingRight: 10,
        paddingLeft: 4,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        paddingVertical: 0,
        margin: 0,
        includeFontPadding: false,
    },
    searchDivider: {
        width: 1,
        height: 26,
        marginHorizontal: 6,
        opacity: 0.5,
    },
    searchActionButton: {
        width: 38,
        height: 38,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },

    counterRow: {
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingHorizontal: 20, 
        marginBottom: 8,
    },
    counterBadge: {
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 0.5,
    },
    counterText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 12 
    },
    clearText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 12 
    },
    listContent: { 
        paddingHorizontal: 18, 
        paddingBottom: 130, 
        paddingTop: 4 
    },
    
    /* SPACIOUS FLAT CLAIM CARD */
    claimCard: {
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 8,
        gap: 12,
        borderWidth: 0.5,
    },
    claimIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    claimCardText: {
        flex: 1,
        fontSize: 15,
        lineHeight: 22,
        includeFontPadding: false,
    },
    checkCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 0.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 45,
    },
    emptyText: {
        fontFamily: 'Tajawal-Regular', 
        fontSize: 14,
    },

    /* CTA FOOTER */
    ctaWrap: {
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0,
        padding: 18, 
        paddingBottom: Platform.OS === 'ios' ? 30 : 18,
        borderTopWidth: 0.5,
    },
    ctaBtn: {
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 8, 
        paddingVertical: 15, 
        borderRadius: 16,
    },
    ctaBtnText: { 
        fontFamily: 'Tajawal-ExtraBold', 
        fontSize: 16 
    },
    skipBtn: { 
        alignItems: 'center', 
        paddingTop: 12, 
        paddingBottom: 4 
    },
    skipText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 13 
    },
});