// src/components/catalog/CategoryFilter.js

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { PRODUCT_TYPES } from '../../constants/productData';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

export default function CategoryFilter({ activeCategory, onSelect }) {
  const { colors: C } = useTheme();
  const language = useCurrentLanguage();
  const rtl = useRTL();

  const categories = [
    { id: 'all', labelKey: 'catalog_cat_all', icon: 'th-large' },
    ...PRODUCT_TYPES
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.container,
        { flexDirection: rtl.flexDirection }
      ]}
    >
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            activeOpacity={0.75}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? C.accentGreen : C.card,
                borderColor: isActive ? C.accentGreen : C.border,
              }
            ]}
          >
            <FontAwesome5
              name={cat.icon || 'box'}
              size={11}
              color={isActive ? C.textOnAccent : C.textSecondary}
            />
            <Text
              style={[
                styles.chipText,
                { color: isActive ? C.textOnAccent : C.textSecondary }
              ]}
            >
              {cat.labelKey === 'catalog_cat_all' 
                ? (t('catalog_cat_all', language) || 'الكل') 
                : t(cat.labelKey, language)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 0, // 🌟 Tight vertical padding
    gap: 6,             // 🌟 Tight 6px gap between category chips
  },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12, // 🌟 Compact horizontal padding
    paddingVertical: 6,    // 🌟 Compact vertical padding
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12,
  },
});