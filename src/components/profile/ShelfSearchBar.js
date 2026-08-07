// src/components/profile/ShelfSearchBar.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

export default function ShelfSearchBar({ onSearchPress, onScanPress }) {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onSearchPress}
            style={[
                styles.container, 
                { 
                    backgroundColor: C.card, 
                    borderColor: C.accentGreen + '40',
                    shadowColor: C.accentGreen
                }
            ]}
        >
            {/* SEARCH SIDE (Primary Action) */}
            <View style={styles.searchSide}>
                <FontAwesome5 name="search" size={16} color={C.textSecondary} />
                <Text style={[styles.placeholder, { color: C.textDim }]} numberOfLines={1}>
                    {t('catalog_search_placeholder', language) || "ابحث في الكتالوج لإضافة منتج..."}
                </Text>
            </View>

            {/* SEPARATOR */}
            <View style={[styles.divider, { backgroundColor: C.border }]} />

            {/* SCANNER SIDE (Secondary Action) */}
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onScanPress}
                style={[styles.scanButton, { backgroundColor: C.accentGreen + '1A' }]}
            >
                <FontAwesome5 name="camera" size={15} color={C.accentGreen} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// src/components/profile/ShelfSearchBar.js

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 8,
        height: 56,
        marginBottom: 15,
        marginTop: 5,
        borderWidth: 1,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    searchSide: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingRight: 12, // 🌟 Fixes right edge text clipping
        paddingLeft: 4,
        gap: 10,           // 🌟 Clean gap between icon and text
    },
    placeholder: {
        flex: 1,
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        textAlign: 'right',
        paddingHorizontal: 0,
        includeFontPadding: false,
    },
    divider: {
        width: 1,
        height: 28,
        marginHorizontal: 8,
        opacity: 0.5,
    },
    scanButton: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    }
});