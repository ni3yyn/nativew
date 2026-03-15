import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  Pressable, ScrollView, Dimensions 
} from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const { height } = Dimensions.get('window');

export default function FilterModal({ visible, onClose, onApply, currentFilters, availableBrands }) {
    const { colors: C } = useTheme();
    const [localFilters, setLocalFilters] = useState(currentFilters);

    // Sync local state when modal opens
    useEffect(() => {
        if (visible) {
            setLocalFilters(currentFilters);
        }
    }, [visible, currentFilters]);

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleReset = () => {
        const defaultFilters = { bountiesOnly: false, brand: 'all', sort: 'default' };
        setLocalFilters(defaultFilters);
        onApply(defaultFilters);
        onClose();
    };

    const toggleSort = (sortType) => {
        setLocalFilters(prev => ({ ...prev, sort: sortType }));
    };

    const toggleBrand = (brand) => {
        setLocalFilters(prev => ({ ...prev, brand: brand }));
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={[styles.sheet, { backgroundColor: C.background, borderColor: C.border }]}>
                    <View style={[styles.handle, { backgroundColor: C.textDim + '30' }]} />
                    
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: C.textPrimary }]}>تصفية متقدمة</Text>
                        <TouchableOpacity onPress={handleReset}>
                            <Text style={[styles.resetText, { color: C.danger }]}>إعادة ضبط</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                        
                        {/* 1. Gamification Filter (Bounties Only) */}
                        <TouchableOpacity 
                            activeOpacity={0.8}
                            onPress={() => setLocalFilters(prev => ({ ...prev, bountiesOnly: !prev.bountiesOnly }))}
                            style={[
                                styles.bountyToggle, 
                                { 
                                    backgroundColor: localFilters.bountiesOnly ? C.gold + '20' : C.card, 
                                    borderColor: localFilters.bountiesOnly ? C.gold : C.border 
                                }
                            ]}
                        >
                            <View style={styles.bountyTextRow}>
                                <FontAwesome5 name="medal" size={16} color={C.gold} />
                                <Text style={[styles.sectionTitle, { color: localFilters.bountiesOnly ? C.gold : C.textPrimary, marginBottom: 0 }]}>
                                    عرض مهام تجميع النقاط فقط
                                </Text>
                            </View>
                            <View style={[styles.checkbox, { borderColor: localFilters.bountiesOnly ? C.gold : C.textDim }]}>
                                {localFilters.bountiesOnly && <FontAwesome5 name="check" size={10} color={C.gold} />}
                            </View>
                        </TouchableOpacity>
                        <Text style={[styles.hintText, { color: C.textDim }]}>يعرض فقط المنتجات التي تنقصها معلومات كالسعر والمكونات.</Text>

                        {/* 2. Sorting */}
                        <Text style={[styles.sectionTitle, { color: C.textPrimary, marginTop: 25 }]}>ترتيب حسب</Text>
                        <View style={styles.chipsRow}>
                            {[
                                { id: 'default', label: 'الافتراضي', icon: 'list' },
                                { id: 'price_asc', label: 'السعر: الأقل أولاً', icon: 'sort-numeric-up' },
                                { id: 'price_desc', label: 'السعر: الأعلى أولاً', icon: 'sort-numeric-down-alt' },
                            ].map(sortOption => {
                                const isActive = localFilters.sort === sortOption.id;
                                return (
                                    <TouchableOpacity 
                                        key={sortOption.id} 
                                        onPress={() => toggleSort(sortOption.id)}
                                        style={[styles.chip, { backgroundColor: isActive ? C.accentGreen : C.card, borderColor: isActive ? C.accentGreen : C.border }]}
                                    >
                                        <Text style={[styles.chipText, { color: isActive ? C.textOnAccent : C.textSecondary }]}>{sortOption.label}</Text>
                                        <FontAwesome5 name={sortOption.icon} size={12} color={isActive ? C.textOnAccent : C.textSecondary} />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* 3. Brands */}
                        {availableBrands.length > 1 && (
                            <>
                                <Text style={[styles.sectionTitle, { color: C.textPrimary, marginTop: 25 }]}>الماركة (Brand)</Text>
                                <View style={styles.chipsRow}>
                                    {availableBrands.map(brand => {
                                        const isActive = localFilters.brand === brand;
                                        return (
                                            <TouchableOpacity 
                                                key={brand} 
                                                onPress={() => toggleBrand(brand)}
                                                style={[styles.chip, { backgroundColor: isActive ? C.primary : C.card, borderColor: isActive ? C.primary : C.border }]}
                                            >
                                                <Text style={[styles.chipText, { color: isActive ? C.textOnAccent : C.textSecondary }]}>
                                                    {brand === 'all' ? 'الكل' : brand}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                        
                        <View style={{ height: 40 }} />
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: C.border, backgroundColor: C.background }]}>
                        <TouchableOpacity style={[styles.applyBtn, { backgroundColor: C.accentGreen }]} onPress={handleApply}>
                            <Text style={[styles.applyBtnText, { color: C.textOnAccent }]}>تطبيق التصفية</Text>
                            <Feather name="filter" size={18} color={C.textOnAccent} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    sheet: { height: height * 0.85, borderTopLeftRadius: 35, borderTopRightRadius: 35, borderWidth: 1, borderBottomWidth: 0, overflow: 'hidden' },
    handle: { width: 40, height: 5, borderRadius: 10, alignSelf: 'center', marginTop: 15 },
    header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, marginTop: 15, marginBottom: 10 },
    title: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20 },
    resetText: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    scroll: { padding: 25 },
    
    bountyToggle: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 18, borderWidth: 1 },
    bountyTextRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    hintText: { fontFamily: 'Tajawal-Regular', fontSize: 11, textAlign: 'right', marginTop: 8, marginRight: 5 },

    sectionTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, marginBottom: 15, textAlign: 'right' },
    chipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
    chip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
    chipText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },

    footer: { padding: 20, borderTopWidth: 1, paddingBottom: 30 },
    applyBtn: { height: 55, borderRadius: 18, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10 },
    applyBtnText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16 }
});