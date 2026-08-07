// src/components/catalog/ClaimsPickerModal.js
// Bottom-sheet modal: user picks marketing claims for a catalog product
// before (or after) it gets analyzed and added to their shelf.
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, Modal, FlatList,
    TextInput, TouchableOpacity, Animated,
    Easing, Dimensions, Pressable,
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Fuse from 'fuse.js';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { getClaimsByProductType } from '../../constants/productData';

const { height } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// ClaimRow — single selectable row
// ─────────────────────────────────────────────────────────────
const ClaimRow = React.memo(({ label, selected, onToggle, colors }) => {
    return (
        <TouchableOpacity
            onPress={onToggle}
            activeOpacity={0.7}
            style={[
                styles.claimRow,
                {
                    borderBottomColor: colors.border + '55',
                    backgroundColor: selected ? colors.accentGreen + '12' : 'transparent',
                },
            ]}
        >
            {/* Checkbox */}
            <View style={[
                styles.checkbox,
                {
                    borderColor: selected ? colors.accentGreen : colors.border,
                    backgroundColor: selected ? colors.accentGreen : 'transparent',
                },
            ]}>
                {selected && (
                    <MaterialCommunityIcons name="check" size={12} color="#fff" />
                )}
            </View>

            <Text style={[
                styles.claimLabel,
                { color: selected ? colors.accentGreen : colors.textPrimary },
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
});

// ─────────────────────────────────────────────────────────────
// ClaimsPickerModal
// Props:
//   visible     — boolean
//   product     — catalog product object { name, category, marketingClaims }
//   onConfirm   — (selectedClaims: string[]) => void  — user confirmed
//   onDismiss   — () => void  — backdrop tap or "skip" button
// ─────────────────────────────────────────────────────────────
export default function ClaimsPickerModal({ visible, product, onConfirm, onDismiss }) {
    const { colors: C } = useTheme();
    const [selected, setSelected] = useState([]);
    const [search, setSearch] = useState('');
    const slideAnim = useRef(new Animated.Value(height)).current;

    // Determine claims list from product type
    const productType = product?.category?.id || product?.productType || 'other';
    const claimsList = useMemo(() => getClaimsByProductType(productType), [productType]);
    const fuse = useMemo(() => new Fuse(claimsList, { threshold: 0.4 }), [claimsList]);
    const displayed = useMemo(
        () => (search.trim() ? fuse.search(search).map(r => r.item) : claimsList),
        [search, claimsList, fuse]
    );

    // Pre-fill with existing claims on open
    useEffect(() => {
        if (visible) {
            setSelected(product?.marketingClaims?.length > 0 ? [...product.marketingClaims] : []);
            setSearch('');
            Animated.spring(slideAnim, {
                toValue: 0, damping: 20, stiffness: 140, useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: height, duration: 250,
                easing: Easing.out(Easing.cubic), useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const toggle = useCallback((claim) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelected(prev =>
            prev.includes(claim) ? prev.filter(c => c !== claim) : [...prev, claim]
        );
    }, []);

    const handleConfirm = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onConfirm(selected);
    };

    const renderItem = useCallback(({ item }) => (
        <ClaimRow
            label={item}
            selected={selected.includes(item)}
            onToggle={() => toggle(item)}
            colors={C}
        />
    ), [selected, toggle, C]);

    if (!visible && !product) return null;

    return (
        <Modal
            transparent
            visible={!!visible}
            onRequestClose={onDismiss}
            animationType="none"
            statusBarTranslucent
        >
            <View style={styles.root}>
                {/* Dimmed backdrop */}
                <Pressable
                    style={styles.backdrop}
                    onPress={onDismiss}
                />

                {/* Bottom Sheet */}
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: C.card,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Drag handle */}
                    <View style={styles.handleWrap}>
                        <View style={[styles.handle, { backgroundColor: C.border }]} />
                    </View>

                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: C.border }]}>
                        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>
                            ادّعاءات المنتج
                        </Text>
                        <Text style={[styles.headerSub, { color: C.textSecondary }]}>
                            اختاري ما يدّعيه{' '}
                            <Text style={{ color: C.accentGreen, fontFamily: 'Tajawal-Bold' }}>
                                {product?.name || product?.productName || 'هذا المنتج'}
                            </Text>
                            {' '}لنتحقق من صحة هذه الادعاءات
                        </Text>
                    </View>

                    {/* Search bar */}
                    <View style={[styles.searchWrap, { backgroundColor: C.background, borderColor: C.border }]}>
                        <FontAwesome5 name="search" size={13} color={C.textDim} />
                        <TextInput
                            style={[styles.searchInput, { color: C.textPrimary }]}
                            placeholder="ابحثي عن ادّعاء..."
                            placeholderTextColor={C.textDim}
                            value={search}
                            onChangeText={setSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <MaterialCommunityIcons name="close-circle" size={16} color={C.textDim} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Selection counter */}
                    {selected.length > 0 && (
                        <View style={[styles.counterRow, { borderBottomColor: C.border }]}>
                            <Text style={[styles.counterText, { color: C.accentGreen }]}>
                                {selected.length} ادّعاء مختار
                            </Text>
                            <TouchableOpacity onPress={() => setSelected([])}>
                                <Text style={[styles.clearText, { color: C.textSecondary }]}>مسح الكل</Text>
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
                            <Text style={[styles.emptyText, { color: C.textDim }]}>لا توجد نتائج</Text>
                        }
                    />

                    {/* Sticky CTA */}
                    <View style={[styles.ctaWrap, { backgroundColor: C.card, borderTopColor: C.border }]}>
                        <TouchableOpacity
                            onPress={handleConfirm}
                            activeOpacity={0.85}
                            style={[styles.ctaBtn, { backgroundColor: C.accentGreen }]}
                        >
                            <FontAwesome5 name="flask" size={15} color="#fff" />
                            <Text style={styles.ctaBtnText}>
                                {selected.length > 0
                                    ? `تحليل مع ${selected.length} ادّعاء`
                                    : 'تحليل بدون ادّعاءات'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onDismiss} style={styles.skipBtn}>
                            <Text style={[styles.skipText, { color: C.textSecondary }]}>
                                تخطّي — حفظ فقط بدون تحليل
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
        backgroundColor: 'rgba(0,0,0,0.52)',
    },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '82%',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    handleWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
    handle: { width: 36, height: 4, borderRadius: 2 },
    header: {
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontFamily: 'Tajawal-Bold', fontSize: 18, textAlign: 'right', marginBottom: 4,
    },
    headerSub: {
        fontFamily: 'Tajawal-Regular', fontSize: 13, textAlign: 'right', lineHeight: 20,
    },
    searchWrap: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
        marginHorizontal: 14, marginVertical: 12,
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 14, borderWidth: 1,
    },
    searchInput: {
        flex: 1, fontFamily: 'Tajawal-Regular', fontSize: 14, textAlign: 'right',
    },
    counterRow: {
        flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1,
    },
    counterText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },
    clearText: { fontFamily: 'Tajawal-Regular', fontSize: 12 },
    listContent: { paddingBottom: 120 },
    emptyText: {
        fontFamily: 'Tajawal-Regular', fontSize: 14, textAlign: 'center', marginTop: 40,
    },
    // Claim row
    claimRow: {
        flexDirection: 'row-reverse', alignItems: 'center',
        paddingVertical: 13, paddingHorizontal: 16,
        borderBottomWidth: 1, gap: 14,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 6, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    claimLabel: { flex: 1, fontFamily: 'Tajawal-Regular', fontSize: 15, textAlign: 'right' },
    // CTA
    ctaWrap: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 18, borderTopWidth: 1,
    },
    ctaBtn: {
        flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
        gap: 10, paddingVertical: 16, borderRadius: 18,
    },
    ctaBtnText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: '#fff' },
    skipBtn: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
    skipText: { fontFamily: 'Tajawal-Regular', fontSize: 13 },
});
