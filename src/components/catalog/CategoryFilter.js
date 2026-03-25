import React from 'react';
import { TouchableOpacity, Text, StyleSheet, FlatList } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { PRODUCT_TYPES } from '../../constants/productData';

export default function CategoryFilter({ activeCategory, onSelect }) {
    const language = useCurrentLanguage();
    const { colors: C } = useTheme();
    const categories = [{ id: 'all', label: t('catalog_category_all', language), icon: 'layer-group' }, ...PRODUCT_TYPES.map(pt => ({ ...pt, label: t(pt.labelKey, language) }))];

    return (
        <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.categoryScroll}
            inverted={true}
            renderItem={({ item }) => (
                <TouchableOpacity
                    onPress={() => onSelect(item.id)}
                    style={[styles.categoryChip, { backgroundColor: activeCategory === item.id ? C.accentGreen : C.card, borderColor: activeCategory === item.id ? C.accentGreen : C.border }]}
                >
                    <Text style={[styles.categoryText, { color: activeCategory === item.id ? C.textOnAccent : C.textSecondary }]}>{item.label}</Text>
                    <FontAwesome5 name={item.icon} size={12} color={activeCategory === item.id ? C.textOnAccent : C.textSecondary} />
                </TouchableOpacity>
            )}
        />
    );
}

const styles = StyleSheet.create({
    categoryScroll: { gap: 8, paddingHorizontal: 5, paddingVertical: 10 },
    categoryChip: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, gap: 8 },
    categoryText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
});