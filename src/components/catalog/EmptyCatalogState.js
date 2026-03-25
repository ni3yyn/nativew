import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

const EmptyCatalogState = () => {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();

    return (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBox, { backgroundColor: C.card, borderColor: C.border }]}>
                <FontAwesome5 name="box-open" size={40} color={C.textDim} />
            </View>
            <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>{t('catalog_empty_title', language)}</Text>
            <Text style={[styles.emptySub, { color: C.textDim }]}>
                {t('catalog_empty_subtitle', language)}
            </Text>
            <TouchableOpacity style={[styles.addMissingBtn, { backgroundColor: C.accentGreen }]}>
                <FontAwesome5 name="camera" size={14} color={C.textOnAccent} />
                <Text style={[styles.addMissingText, { color: C.textOnAccent }]}>{t('catalog_add_new_product', language)}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 30 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, marginBottom: 8 },
    emptySub: { fontFamily: 'Tajawal-Regular', fontSize: 14, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    addMissingBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 15, elevation: 5 },
    addMissingText: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
});

export default EmptyCatalogState;