// FilterModal.js

import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Pressable, ScrollView, Dimensions, Animated, Easing, Platform, TextInput
} from 'react-native';
import { FontAwesome5, Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- MICRO-COMPONENT: THEME-AWARE FILTER CHIP ---
const FilterChip = memo(({ isActive, label, icon, onPress, C, badgeCount }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={[
        styles.chip,
        {
          backgroundColor: isActive ? C.accentGreen : C.card,
          borderColor: isActive ? C.accentGreen : C.border,
        }
      ]}
    >
      <Text style={[styles.chipText, { color: isActive ? C.textOnAccent : C.textSecondary }]}>
        {label}
      </Text>
      {icon && <FontAwesome5 name={icon} size={11} color={isActive ? C.textOnAccent : C.textSecondary} />}
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={[styles.chipBadge, { backgroundColor: isActive ? C.textOnAccent : C.accentGreen }]}>
          <Text style={[styles.chipBadgeText, { color: isActive ? C.accentGreen : C.textOnAccent }]}>
            {badgeCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// --- MAIN COMPONENT ---
export default function FilterModal({ visible, onClose, onApply, currentFilters, availableBrands = [] }) {
  const language = useCurrentLanguage();
  const isEn = language === 'en';
  const { colors: C } = useTheme();
  const rtl = useRTL();

  // Expandable Brand Accordion state
  const [isBrandExpanded, setIsBrandExpanded] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  // Default Filter Schema
  const normalizedFilters = useMemo(() => ({
    sort: currentFilters?.sort || 'default',
    brand: currentFilters?.brand || 'all',
    missingFields: currentFilters?.missingFields || (currentFilters?.bountiesOnly ? ['price', 'ingredients'] : []),
    skinTypes: currentFilters?.skinTypes || [],
    localOnly: currentFilters?.localOnly || false,
  }), [currentFilters]);

  const [localFilters, setLocalFilters] = useState(normalizedFilters);
  const animState = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setLocalFilters(normalizedFilters);
  }, [normalizedFilters]);

  useEffect(() => {
    if (visible) {
      setBrandSearch('');
      setIsBrandExpanded(false);
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
      duration: 250,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      if (typeof onClose === 'function') {
        onClose();
      }
    });
  }, [animState, onClose]);

  const handleApply = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const appliedFilters = {
      ...localFilters,
      bountiesOnly: localFilters.missingFields.length > 0,
    };

    onApply(appliedFilters);
    handleClose();
  }, [localFilters, onApply, handleClose]);

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const resetState = {
      sort: 'default',
      brand: 'all',
      missingFields: [],
      skinTypes: [],
      localOnly: false,
      bountiesOnly: false,
    };
    setLocalFilters(resetState);
    onApply(resetState);
    handleClose();
  }, [onApply, handleClose]);

  const toggleSort = useCallback((sortType) => setLocalFilters(prev => ({ ...prev, sort: sortType })), []);
  const toggleBrand = useCallback((brand) => setLocalFilters(prev => ({ ...prev, brand })), []);

  const toggleMissingField = useCallback((fieldKey) => {
    setLocalFilters(prev => {
      const exists = prev.missingFields.includes(fieldKey);
      const updated = exists
        ? prev.missingFields.filter(f => f !== fieldKey)
        : [...prev.missingFields, fieldKey];
      return { ...prev, missingFields: updated };
    });
  }, []);

  const toggleSkinType = useCallback((typeKey) => {
    setLocalFilters(prev => {
      const exists = prev.skinTypes.includes(typeKey);
      const updated = exists ? prev.skinTypes.filter(s => s !== typeKey) : [...prev.skinTypes, typeKey];
      return { ...prev, skinTypes: updated };
    });
  }, []);

  const toggleLocalOnly = useCallback(() => {
    Haptics.selectionAsync();
    setLocalFilters(prev => ({ ...prev, localOnly: !prev.localOnly }));
  }, []);

  const filteredBrandsList = useMemo(() => {
    if (!brandSearch.trim()) return availableBrands;
    return availableBrands.filter(b =>
      b.toLowerCase().includes(brandSearch.toLowerCase())
    );
  }, [availableBrands, brandSearch]);

  const overlayOpacity = animState.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const modalTranslateY = animState.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] });

  // Definitions for parameters with English & Arabic localization
  const MISSING_OPTIONS = useMemo(() => [
    { id: 'price', label: t('filter_missing_price', language) || (isEn ? 'Missing Price' : 'السعر مفقود'), icon: 'tag' },
    { id: 'ingredients', label: t('filter_missing_ingredients', language) || (isEn ? 'Missing Ingredients' : 'المكونات مفقودة'), icon: 'flask' },
    { id: 'brand', label: t('filter_missing_brand', language) || (isEn ? 'Missing Brand' : 'الماركة مفقودة'), icon: 'copyright' },
    { id: 'skinTypes', label: t('filter_missing_skin_types', language) || (isEn ? 'Missing Skin Type' : 'نوع البشرة المستهدف مفقود'), icon: 'bullseye' },
  ], [language, isEn]);

  // 🌟 TARGET SKIN TYPES (Localized Labels, Arabic IDs preserved for DB) 🌟
  const SKIN_TYPES = useMemo(() => [
    { id: 'بشرة دهنية', label: isEn ? 'Oily Skin' : 'بشرة دهنية', icon: 'tint' },
    { id: 'بشرة مختلطة', label: isEn ? 'Combination Skin' : 'بشرة مختلطة', icon: 'adjust' },
    { id: 'بشرة عادية', label: isEn ? 'Normal Skin' : 'بشرة عادية', icon: 'smile' },
    { id: 'بشرة حساسة', label: isEn ? 'Sensitive Skin' : 'بشرة حساسة', icon: 'heart' },
    { id: 'بشرة معرضة للحبوب', label: isEn ? 'Acne-Prone Skin' : 'بشرة معرضة للحبوب', icon: 'shield-alt' },
  ], [isEn]);

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
          {/* Top Notch */}
          <View style={styles.topNotchContainer}>
            <View style={[styles.liquidNotch, { backgroundColor: C.textSecondary + '40' }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { flexDirection: rtl.flexDirection }]}>
            <Text style={[styles.title, { color: C.textPrimary }]}>
              {t('catalog_filter_title', language) || (isEn ? 'Filter Products' : 'تصفية المنتجات')}
            </Text>
            <TouchableOpacity onPress={handleReset} style={[styles.resetBtn, { flexDirection: rtl.flexDirection }]}>
              <Feather name="refresh-ccw" size={12} color={C.danger} />
              <Text style={[styles.resetText, { color: C.danger }]}>
                {t('catalog_filter_reset', language) || (isEn ? 'Reset' : 'إعادة ضبط')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

            {/* 1. LOCAL ALGERIAN PRODUCTS TOGGLE */}
            <TouchableOpacity activeOpacity={0.85} onPress={toggleLocalOnly}>
              <View style={[styles.localCard, { backgroundColor: C.card, borderColor: localFilters.localOnly ? C.accentGreen : C.border }]}>
                <View style={[styles.cardHeaderRow, { flexDirection: rtl.flexDirection }]}>
                  <View style={[styles.cardTextGroup, { alignItems: rtl.isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.cardTitle, { color: C.textPrimary }]}>
                      🇩🇿 {t('filter_local_products_only', language) || (isEn ? 'Algerian Local Products' : 'المنتجات الجزائرية المحلية')}
                    </Text>
                    <Text style={[styles.cardSubText, { color: C.textSecondary }]}>
                      {t('filter_local_products_hint', language) || (isEn ? 'Show locally manufactured products only' : 'عرض المنتجات المصنعة محلياً فقط')}
                    </Text>
                  </View>
                  <View style={[
                    styles.customToggle,
                    { backgroundColor: localFilters.localOnly ? C.accentGreen : C.background, borderColor: localFilters.localOnly ? C.accentGreen : C.border },
                    rtl.isRTL ? { marginLeft: 12 } : { marginRight: 12 }
                  ]}>
                    {localFilters.localOnly && <FontAwesome5 name="check" size={10} color={C.textOnAccent} />}
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* 2. GRANULAR MISSING INFORMATION (EXPANDED BOUNTIES) */}
            <View style={[styles.bentoSection, { backgroundColor: C.card, borderColor: localFilters.missingFields.length > 0 ? C.gold : C.border }]}>
              <View style={[styles.sectionTitleRow, { flexDirection: rtl.flexDirection }]}>
                <View style={[styles.iconBadge, { backgroundColor: C.gold + '20' }]}>
                  <FontAwesome5 name="medal" size={12} color={C.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: C.gold, textAlign: rtl.textAlign }]}>
                    {t('filter_bounties_section_title', language) || (isEn ? 'Contribute & Earn Points' : 'مطلوب المساهمة بها (النقاط)')}
                  </Text>
                  <Text style={[styles.sectionSubTitle, { color: C.textSecondary, textAlign: rtl.textAlign }]}>
                    {t('filter_bounties_section_hint', language) || (isEn ? 'Filter products missing details to earn points' : 'حدد منتجات ينقصها إدخالات معينة لإضافة بياناتها وكسب نقاط')}
                  </Text>
                </View>
              </View>

              <View style={[styles.chipsRow, { flexDirection: rtl.flexDirection }]}>
                {MISSING_OPTIONS.map(opt => {
                  const isSelected = localFilters.missingFields.includes(opt.id);
                  return (
                    <FilterChip
                      key={opt.id}
                      isActive={isSelected}
                      label={opt.label}
                      icon={opt.icon}
                      onPress={() => toggleMissingField(opt.id)}
                      C={C}
                    />
                  );
                })}
              </View>
            </View>

            {/* 3. SEARCHABLE BRAND PICKER (EXPANDABLE DROPDOWN) */}
            {availableBrands.length > 1 && (
              <View style={[styles.bentoSection, { backgroundColor: C.card, borderColor: C.border }]}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsBrandExpanded(!isBrandExpanded);
                  }}
                  style={[styles.accordionHeader, { flexDirection: rtl.flexDirection }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, { color: C.textPrimary, marginBottom: 2, textAlign: rtl.textAlign }]}>
                      {t('catalog_filter_brand_title', language) || (isEn ? 'Brand / Manufacturer' : 'الماركة / العلامة التجارية')}
                    </Text>
                    <Text style={[styles.sectionSubTitle, { color: C.accentGreen, textAlign: rtl.textAlign }]}>
                      {localFilters.brand === 'all'
                        ? (t('catalog_filter_brand_all', language) || (isEn ? 'All Brands' : 'جميع الماركات'))
                        : localFilters.brand}
                    </Text>
                  </View>
                  <View style={[styles.expandIconBox, { backgroundColor: C.background, borderColor: C.border }, rtl.isRTL ? { marginLeft: 10 } : { marginRight: 10 }]}>
                    <FontAwesome5
                      name={isBrandExpanded ? "chevron-up" : "chevron-down"}
                      size={12}
                      color={C.textSecondary}
                    />
                  </View>
                </TouchableOpacity>

                {isBrandExpanded && (
                  <View style={styles.brandDropdownBody}>
                    <View style={[styles.brandSearchInputWrap, { backgroundColor: C.background, borderColor: C.border, flexDirection: rtl.flexDirection }]}>
                      <FontAwesome5 name="search" size={12} color={C.textSecondary} />
                      <TextInput
                        style={[styles.brandSearchInput, { color: C.textPrimary, textAlign: rtl.textAlign }]}
                        placeholder={t('filter_search_brand_placeholder', language) || (isEn ? 'Search brand...' : 'ابحث عن ماركة...')}
                        placeholderTextColor={C.textSecondary + '80'}
                        value={brandSearch}
                        onChangeText={setBrandSearch}
                      />
                      {brandSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setBrandSearch('')}>
                          <Ionicons name="close-circle" size={16} color={C.textSecondary} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}>
                      <View style={[styles.chipsRow, { flexDirection: rtl.flexDirection }]}>
                        <FilterChip
                          isActive={localFilters.brand === 'all'}
                          label={t('catalog_filter_brand_all', language) || (isEn ? 'All Brands' : 'جميع الماركات')}
                          onPress={() => toggleBrand('all')}
                          C={C}
                        />
                        {filteredBrandsList.filter(b => b !== 'all').map(brand => (
                          <FilterChip
                            key={brand}
                            isActive={localFilters.brand === brand}
                            label={brand}
                            onPress={() => toggleBrand(brand)}
                            C={C}
                          />
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* 4. TARGET SKIN TYPES */}
            <View style={[styles.bentoSection, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.sectionTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                {t('filter_skin_type_title', language) || (isEn ? 'Target Skin Type' : 'نوع البشرة المستهدف')}
              </Text>
              <View style={[styles.chipsRow, { flexDirection: rtl.flexDirection }]}>
                {SKIN_TYPES.map(st => (
                  <FilterChip
                    key={st.id}
                    isActive={localFilters.skinTypes.includes(st.id)}
                    label={st.label}
                    icon={st.icon}
                    onPress={() => toggleSkinType(st.id)}
                    C={C}
                  />
                ))}
              </View>
            </View>

            {/* 5. SORTING */}
            <View style={[styles.bentoSection, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.sectionTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                {t('catalog_filter_sort_title', language) || (isEn ? 'Sort By' : 'ترتيب حسب')}
              </Text>
              <View style={[styles.chipsRow, { flexDirection: rtl.flexDirection }]}>
                {[
                  { id: 'default', label: t('catalog_filter_sort_default', language) || (isEn ? 'Default' : 'الافتراضي'), icon: 'list' },
                  { id: 'price_asc', label: t('catalog_filter_sort_price_asc', language) || (isEn ? 'Price: Low to High' : 'السعر: الأقل إلى الأعلى'), icon: 'sort-numeric-up' },
                  { id: 'price_desc', label: t('catalog_filter_sort_price_desc', language) || (isEn ? 'Price: High to Low' : 'السعر: الأعلى إلى الأقل'), icon: 'sort-numeric-down-alt' },
                ].map(sortOption => (
                  <FilterChip
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

            <View style={{ height: 110 }} />
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: C.background, borderTopColor: C.border, flexDirection: rtl.flexDirection }]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={{ color: C.textSecondary, fontFamily: 'Tajawal-Bold', fontSize: 15 }}>
                {t('cancel', language) || (isEn ? 'Cancel' : 'إلغاء')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtnWrapper, rtl.isRTL && { marginLeft: 0, marginRight: 16 }]}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[C.accentGreen, '#2E8062']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                <View style={[styles.submitInnerRow, { flexDirection: rtl.flexDirection }]}>
                  <Text style={[styles.submitText, { color: C.textOnAccent }]}>
                    {t('catalog_filter_apply', language) || (isEn ? 'Apply Filter' : 'تطبيق الفلتر')}
                  </Text>
                  <Feather name="filter" size={18} color={C.textOnAccent} />
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
  appCanvasOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 15, 0.75)',
    justifyContent: 'flex-end'
  },
  liquidSheet: {
    height: SCREEN_HEIGHT * 0.88,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden'
  },
  topNotchContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    top: 12,
    zIndex: 10
  },
  liquidNotch: {
    width: 50,
    height: 5,
    borderRadius: 10
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 32,
    marginBottom: 12
  },
  title: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 22
  },
  resetBtn: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)'
  },
  resetText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  localCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  cardHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextGroup: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 15,
    marginBottom: 2,
  },
  cardSubText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 11,
  },
  customToggle: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoSection: {
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16
  },
  sectionTitleRow: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 15,
  },
  sectionSubTitle: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 11,
  },
  accordionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  brandDropdownBody: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  brandSearchInputWrap: {
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  brandSearchInput: {
    flex: 1,
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    paddingVertical: 0,
  },
  chipsRow: {
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1
  },
  chipText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12
  },
  chipBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  chipBadgeText: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 9,
  },
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  submitBtnWrapper: {
    flex: 1,
    height: 48,
    borderRadius: 24,
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
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 15,
  },
});