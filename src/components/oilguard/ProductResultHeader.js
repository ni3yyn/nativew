import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useRTL } from '../../hooks/useRTL';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

export default function ProductResultHeader({ productName, imageUri, categoryLabel }) {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    const rtl = useRTL();

    if (!productName && !imageUri) return null;

    return (
        <View style={[styles.headerWrapper, { borderBottomColor: C.textPrimary + '10' }]}>
            <View style={[styles.container, { flexDirection: rtl.flexDirection }]}>
                
                {/* Image Section with Subtle Aura */}
                <View style={styles.imageStage}>
                    <LinearGradient
                        colors={[C.accentGreen + '30', 'transparent']}
                        style={styles.imageAura}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                    />
                    <View style={[styles.imageWrapper, { backgroundColor: C.card, borderColor: C.border + '50' }]}>
                        {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
                        ) : (
                            <Feather name="box" size={24} color={C.textDim} />
                        )}
                    </View>
                </View>

                {/* Typography Section */}
                <View style={[styles.textContainer, { alignItems: rtl.isRTL ? 'flex-end' : 'flex-start' }]}>
                    {categoryLabel && (
                        <View style={[styles.categoryBadge, { backgroundColor: C.accentGreen + '15' }]}>
                            <FontAwesome5 name="check-circle" size={10} color={C.accentGreen} solid />
                            <Text style={[styles.categoryText, { color: C.accentGreen }]}>
                                {categoryLabel}
                            </Text>
                        </View>
                    )}
                    <Text 
                        style={[styles.nameText, { color: C.textPrimary, textAlign: rtl.textAlign }]} 
                        numberOfLines={2}
                    >
                        {productName || t('oilguard_match_unknown', language)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerWrapper: {
        width: '100%',
        paddingBottom: 16,
        marginBottom: 16,
        borderBottomWidth: 1, // Creates a clean separation from the gauge below
    },
    container: {
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 4,
    },
    imageStage: {
        width: 64,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    imageAura: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        top: -4,
    },
    imageWrapper: {
        width: 64,
        height: 64,
        borderRadius: 20, // Modern squircle look
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        zIndex: 2,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        gap: 6,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        letterSpacing: 0.5,
    },
    nameText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 16,
        lineHeight: 24,
    }
});