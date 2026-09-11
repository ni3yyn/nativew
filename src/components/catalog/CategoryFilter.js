// src/components/catalog/CategoryFilter.js

import React, { useRef, useEffect, useMemo } from 'react';
import { ScrollView, Pressable, Animated, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { PRODUCT_TYPES } from '../../constants/productData';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

const CategoryChip = React.memo(({ cat, isActive, onPress, C, language }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.94, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }).start();
  };

  const isAll = cat.id === 'all';
  const label = isAll 
    ? (t('catalog_cat_all', language) || (language === 'ar' ? 'الكل' : 'All'))
    : (t(cat.labelKey, language) || cat.label || cat.id);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
    >
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: isActive ? C.accentGreen : C.card,
            borderColor: isActive ? C.accentGreen : C.border,
            transform: [{ scale: scaleAnim }],
          },
          isActive && [styles.chipActive, { shadowColor: C.accentGreen }],
        ]}
      >
        <Text
          style={[
            styles.chipText,
            {
              color: isActive ? C.textOnAccent : C.textSecondary,
              fontFamily: isActive ? 'Tajawal-ExtraBold' : 'Tajawal-Bold',
            }
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

export default function CategoryFilter({ activeCategory, onSelect }) {
  const { colors: C } = useTheme();
  const language = useCurrentLanguage();
  const rtl = useRTL();

  const scrollViewRef = useRef(null);
  const initialScrolled = useRef(false);

  const categories = useMemo(() => [
    { id: 'all', labelKey: 'catalog_cat_all' },
    ...PRODUCT_TYPES
  ], []);

  // Reset scroll lock when language changes
  useEffect(() => {
    initialScrolled.current = false;
  }, [language]);

  // 🌟 NATIVELY ANCHOR TO RIGHT IN ARABIC ON MOUNT (Zero Flash / Starts at 'الكل')
  const handleContentSizeChange = () => {
    if (rtl.isRTL && !initialScrolled.current && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: false });
      initialScrolled.current = true;
    }
  };

  const handleSelectCategory = (id) => {
    Haptics.selectionAsync().catch(() => {});
    onSelect(id);
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      // 🌟 Ensures initial frame renders clamped to the right in Arabic
      contentOffset={{ x: rtl.isRTL ? 99999 : 0, y: 0 }}
      onContentSizeChange={handleContentSizeChange}
      contentContainerStyle={[
        styles.container,
        { flexDirection: rtl.flexDirection }
      ]}
    >
      {categories.map((cat) => (
        <CategoryChip
          key={cat.id}
          cat={cat}
          isActive={activeCategory === cat.id}
          onPress={() => handleSelectCategory(cat.id)}
          C={C}
          language={language}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
    gap: 7,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13, // 🌟 Symmetrical horizontal balance
    height: 31,            // 🌟 Ultra-sleek, compact height
    borderRadius: 12,
    borderWidth: 0.5,
  },
  chipActive: {
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
  },
  chipText: {
    fontSize: 12,
    
    marginTop: 0.5,
  },
});