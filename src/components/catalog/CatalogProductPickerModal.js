// src/components/catalog/CatalogProductPickerModal.js

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, Modal, StyleSheet, FlatList,
    Image, ActivityIndicator, Animated, Easing, Pressable, Platform,
    Dimensions, PanResponder,
} from 'react-native';
import { Feather, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppTextInput from '../common/AppTextInput';
import WathiqScoreBadge from '../common/WathiqScoreBadge';
import { CatalogService } from '../../services/catalogService';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';
import { t } from '../../i18n';
import MiniSearch from 'minisearch';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Smart normalizer for Arabic and Latin text matching
const normalizeSearch = (str) => {
    if (!str) return '';
    let s = String(str).toLowerCase();
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/ک/g, 'ك');
    s = s.replace(/[\u064B-\u065F\u0670]/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
};

const CatalogProductPickerModal = ({ visible, onClose, onSelectProduct }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const language = useCurrentLanguage();
    const rtl = useRTL();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(COLORS, rtl, insets), [COLORS, rtl, insets]);

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const dragY = useRef(new Animated.Value(0)).current;

    // ── Pull-down-to-close gesture (top region only) ──────────────────────
    const panResponder = useMemo(
        () =>
            PanResponder.create({
                // Don't steal taps from buttons/text inputs
                onStartShouldSetPanResponder: () => false,
                // Only activate on a clear downward drag
                onMoveShouldSetPanResponder: (_, g) =>
                    g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
                onPanResponderGrant: () => {
                    // Cancel any in-flight open animation so drag feels instant
                    slideAnim.stopAnimation();
                    backdropAnim.stopAnimation();
                },
                onPanResponderMove: (_, g) => {
                    if (g.dy > 0) dragY.setValue(g.dy);
                },
                onPanResponderRelease: (_, g) => {
                    const shouldClose = g.dy > 110 || g.vy > 0.9;
                    if (shouldClose) {
                        Animated.timing(dragY, {
                            toValue: SCREEN_HEIGHT,
                            duration: 220,
                            easing: Easing.out(Easing.ease),
                            useNativeDriver: true,
                        }).start(() => {
                            dragY.setValue(0);
                            slideAnim.setValue(SCREEN_HEIGHT);
                            if (onClose) onClose();
                        });
                    } else {
                        Animated.spring(dragY, {
                            toValue: 0,
                            friction: 8,
                            tension: 70,
                            useNativeDriver: true,
                        }).start();
                    }
                },
                onPanResponderTerminate: () => {
                    Animated.spring(dragY, {
                        toValue: 0,
                        friction: 8,
                        tension: 70,
                        useNativeDriver: true,
                    }).start();
                },
            }),
        [onClose, slideAnim, backdropAnim, dragY]
    );

    // Backdrop fades out while dragging down
    const dragBackdropOpacity = dragY.interpolate({
        inputRange: [0, SCREEN_HEIGHT * 0.4],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    useEffect(() => {
        if (visible) {
            setSearchQuery('');
            dragY.setValue(0);
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();

            loadCatalog();
        }
    }, [visible]);

    const loadCatalog = async () => {
        setLoading(true);
        try {
            const data = await CatalogService.fetchCatalog();
            if (Array.isArray(data)) {
                setProducts(data);
            }
        } catch (error) {
            console.warn("Failed to load catalog products:", error);
            const cached = await CatalogService.readLocalCache();
            if (Array.isArray(cached)) {
                setProducts(cached);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished && onClose) onClose();
        });
    };

    const handleSelect = (item) => {
        Haptics.selectionAsync().catch(() => {});
        onSelectProduct(item);
        handleClose();
    };

    // Initialize MiniSearch for the Modal
    const miniSearch = useMemo(() => {
        const searcher = new MiniSearch({
            fields: ['name', 'brand', 'categoryLabel', 'marketingClaims', 'targetTypes', 'country'],
            idField: 'id',
            processTerm: (term) => normalizeSearch(term),
            searchOptions: {
                prefix: true,
                fuzzy: term => term.length > 3 ? 0.2 : null,
                combineWith: 'AND',
                // 🌟 RELEVANCE BOOSTING
                boost: { name: 5, brand: 4, categoryLabel: 2, marketingClaims: 1, targetTypes: 1, country: 1 }
            },
            extractField: (document, fieldName) => {
                if (fieldName === 'categoryLabel') return document.category?.label || '';
                if (fieldName === 'marketingClaims') return document.marketingClaims?.join(' ') || '';
                if (fieldName === 'targetTypes') return document.targetTypes?.join(' ') || '';
                return document[fieldName];
            }
        });

        if (Array.isArray(products) && products.length > 0) {
            const docs = products.map((p, i) => ({ ...p, id: p.id || `temp-${i}` }));
            searcher.addAll(docs);
        }
        return searcher;
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products.slice(0, 50);
        
        const searchResults = miniSearch.search(searchQuery.trim());
        const productMap = new Map(products.map((p, i) => [p.id || `temp-${i}`, p]));
        
        return searchResults
            .map(res => productMap.get(res.id))
            .filter(Boolean)
            .slice(0, 50); // Keep it fast by only returning top 50 ranked results
    }, [products, searchQuery, miniSearch]);

    const renderProductItem = useCallback(({ item }) => {
        const score = item.real_score || item.score || item.analysisData?.oilGuardScore || 0;
        const brand = item.brand || '';
        const name = item.name || item.productName || '';
        const image = item.image || item.productImage || item.imageUrl || null;
        const categoryLabel = typeof item.category === 'object' ? item.category?.label : item.category || '';

        return (
            <TouchableOpacity
                style={styles.productRow}
                onPress={() => handleSelect(item)}
                activeOpacity={0.6}
            >
                <View style={styles.productThumbWrap}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.productThumb} resizeMode="contain" />
                    ) : (
                        <FontAwesome5 name="pump-soap" size={20} color={COLORS.textDim} />
                    )}
                </View>

                <View style={styles.productMeta}>
                    {brand ? (
                        <Text style={styles.brandText} numberOfLines={1}>{brand}</Text>
                    ) : null}
                    <Text style={styles.nameText} numberOfLines={2}>{name}</Text>
                    {categoryLabel ? (
                        <Text style={styles.categoryText}>{categoryLabel}</Text>
                    ) : null}
                </View>

                {score > 0 ? (
                    <WathiqScoreBadge score={score} size={38} />
                ) : (
                    <Feather name="plus" size={18} color={COLORS.textDim} />
                )}
            </TouchableOpacity>
        );
    }, [COLORS, styles]);

    const renderSeparator = useCallback(
        () => <View style={styles.separator} />,
        [styles]
    );

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
            <View style={styles.modalRoot}>
                {/* Backdrop */}
                <Animated.View
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            backgroundColor: 'rgba(0,0,0,0.55)',
                            opacity: Animated.multiply(backdropAnim, dragBackdropOpacity),
                        },
                    ]}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                {/* Bottom Sheet */}
                <Animated.View
                    style={[
                        styles.sheetContainer,
                        { transform: [{ translateY: Animated.add(slideAnim, dragY) }] },
                    ]}
                >
                    {/* Drag handle area — pulls down to close */}
                    <View style={styles.dragRegion} {...panResponder.panHandlers}>
                        <View style={styles.grabberHitArea}>
                            <View style={styles.grabber} />
                        </View>

                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>
                                {language === 'ar' ? 'اختر منتجاً من الدليل' : 'Select Catalog Product'}
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                {loading
                                    ? (language === 'ar' ? 'جاري التحميل…' : 'Loading…')
                                    : (language === 'ar'
                                        ? `${filteredProducts.length} منتج`
                                        : `${filteredProducts.length} products`)}
                            </Text>
                        </View>
                    </View>

                    {/* Search */}
                    <View style={styles.searchBar}>
                        <Feather name="search" size={17} color={COLORS.textDim} />
                        <AppTextInput
                            style={styles.searchInput}
                            placeholder={language === 'ar' ? 'ابحث باسم المنتج أو الماركة...' : 'Search product or brand...'}
                            placeholderTextColor={COLORS.textDim}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            textAlign={rtl.textAlign}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSearchQuery('')}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <Ionicons name="close-circle" size={17} color={COLORS.textDim} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* List */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.accentGreen} />
                            <Text style={styles.loadingText}>
                                {language === 'ar' ? 'جاري تحميل الدليل...' : 'Loading catalog...'}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredProducts}
                            keyExtractor={(item, index) => `${item.id || item.name}_${index}`}
                            renderItem={renderProductItem}
                            ItemSeparatorComponent={renderSeparator}
                            contentContainerStyle={styles.listContent}
                            keyboardShouldPersistTaps="handled"
                            initialNumToRender={10}
                            maxToRenderPerBatch={10}
                            windowSize={5}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <FontAwesome5 name="search" size={26} color={COLORS.textDim} style={{ opacity: 0.5 }} />
                                    <Text style={styles.emptyTitle}>
                                        {language === 'ar' ? 'لا توجد نتائج' : 'No results'}
                                    </Text>
                                    <Text style={styles.emptyText}>
                                        {language === 'ar' ? 'لم يتم العثور على منتج مطابق' : 'No matching products found'}
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (COLORS, rtl, insets) => StyleSheet.create({
    modalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        height: '85%',
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        paddingBottom: Math.max(insets.bottom, 12),
    },

    // ── Drag region ────────────────────────────────────────────────
    dragRegion: {
        paddingTop: 8,
    },
    grabberHitArea: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    grabber: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.textDim,
        opacity: 0.35,
    },

    // ── Header ─────────────────────────────────────────────────────
    header: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 16,
        gap: 3,
    },
    headerTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 17,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: COLORS.textDim,
    },

    // ── Search ─────────────────────────────────────────────────────
    searchBar: {
        flexDirection: rtl.flexDirection,
        alignItems: 'center',
        backgroundColor: COLORS.card,
        marginHorizontal: 20,
        marginBottom: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        height: 44,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textPrimary,
        height: '100%',
    },

    // ── List ───────────────────────────────────────────────────────
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 24,
        flexGrow: 1,
    },
    productRow: {
        flexDirection: rtl.flexDirection,
        alignItems: 'center',
        paddingVertical: 14,
        gap: 14,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: COLORS.border,
        opacity: 0.6,
    },
    productThumbWrap: {
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    productThumb: {
        width: '100%',
        height: '100%',
    },
    productMeta: {
        flex: 1,
        gap: 2,
    },
    brandText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: COLORS.textDim,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    nameText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textPrimary,
        lineHeight: 20,
    },
    categoryText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: COLORS.textDim,
        marginTop: 1,
    },

    // ── States ─────────────────────────────────────────────────────
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textDim,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 8,
    },
    emptyTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: COLORS.textPrimary,
        marginTop: 4,
    },
    emptyText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textDim,
        textAlign: 'center',
    },
});

export default CatalogProductPickerModal;