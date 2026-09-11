// src/components/oilguard/ReviewStep.js

import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Easing, useWindowDimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { createStyles, COLORS as DEFAULT_COLORS } from './oilguard.styles';
import { PRODUCT_TYPES } from '../../constants/productData';
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

const SKIN_IDS = ['cleanser', 'skin_serum', 'lotion_cream', 'sunscreen', 'toner', 'eye_cream', 'mask', 'scrub'];
const HAIR_IDS = ['shampoo', 'conditioner', 'hair_mask', 'hair_serum', 'oil_blend', 'oil_replacement'];
const BODY_IDS = ['body_wash', 'other'];

const CATEGORY_SECTIONS = [
    { key: 'skin', labelKey: 'category_skin_care', defaultLabel: 'العناية بالبشرة', ids: SKIN_IDS, icon: 'magic' },
    { key: 'hair', labelKey: 'category_hair_care', defaultLabel: 'العناية بالشعر', ids: HAIR_IDS, icon: 'spa' },
    { key: 'body', labelKey: 'category_body_other', defaultLabel: 'العناية بالجسم وأخرى', ids: BODY_IDS, icon: 'bath' },
];

export const ReviewStep = ({ productType, setProductType, onConfirm }) => {
    const { colors } = useTheme();
    const language = useCurrentLanguage();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    const { height: screenHeight } = useWindowDimensions();
    const isRTL = language === 'ar' || (typeof language === 'string' && language.startsWith('ar'));

    const [isOpen, setIsOpen] = useState(false);
    const [contentHeight, setContentHeight] = useState(320);

    // Smooth single animation controller
    const anim = useRef(new Animated.Value(0)).current;

    const toggleGrid = () => {
        const toValue = isOpen ? 0 : 1;
        setIsOpen(!isOpen);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

        // Premium cubic-bezier smooth sliding curve
        Animated.timing(anim, {
            toValue,
            duration: 320,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: false,
        }).start();
    };

    const handleSelect = (id) => {
        setProductType(id);
        Haptics.selectionAsync().catch(() => {});
        toggleGrid();
    };

    const currentItem = PRODUCT_TYPES.find(p => p.id === productType);
    const currentLabel = currentItem
        ? t(currentItem.labelKey, language)
        : t('oilguard_unspecified', language);
    const currentIcon = currentItem?.icon || 'box-open';

    const maxGridHeight = Math.min(screenHeight * 0.48, contentHeight || 320);

    // Smooth height expansion (drives confirm button down/up gracefully without snapping)
    const gridHeight = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, maxGridHeight],
        extrapolate: 'clamp',
    });

    // Subtle fade in/out
    const gridOpacity = anim.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0, 0.5, 1],
        extrapolate: 'clamp',
    });

    // Smooth chevron rotation
    const chevronRotation = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    const rowDir = isRTL ? 'row-reverse' : 'row';

    return (
        <View style={styles.rs_Container}>

            {/* ── Hero Section (Clean Icon + Label + Category Toggle) ── */}
            <View style={styles.rs_HeroBlock}>
                <FontAwesome5 name={currentIcon} size={48} color={COLORS.accentGreen} />
                <Text style={styles.rs_LabelText} accessibilityLiveRegion="polite">
                    {currentLabel}
                </Text>
                <TouchableOpacity
                    onPress={toggleGrid}
                    activeOpacity={0.75}
                    style={[styles.rs_ToggleBtn, { flexDirection: rowDir }]}
                    accessible
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    accessibilityLabel={t('oilguard_change_category', language)}
                >
                    <Text style={styles.rs_ToggleBtnText}>
                        {t('oilguard_change_category', language)}
                    </Text>
                    <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                        <FontAwesome5
                            name="chevron-down"
                            size={11}
                            color={COLORS.accentGreen}
                        />
                    </Animated.View>
                </TouchableOpacity>
            </View>

            {/* ── Organized Sectioned Category Grid ── */}
            <Animated.View 
                style={[
                    styles.rs_GridWrapper, 
                    { 
                        height: gridHeight,
                        opacity: gridOpacity,
                        overflow: 'hidden',
                        marginBottom: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 12],
                            extrapolate: 'clamp',
                        }),
                    }
                ]}
            >
                <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.rs_ChipGrid}
                    onContentSizeChange={(_, h) => {
                        if (h > 0 && Math.abs(h - contentHeight) > 10) {
                            setContentHeight(h);
                        }
                    }}
                >
                    {CATEGORY_SECTIONS.map(section => {
                        const sectionItems = PRODUCT_TYPES.filter(item => section.ids.includes(item.id));
                        if (sectionItems.length === 0) return null;
                        const translated = t(section.labelKey, language);
                        const sectionTitle = translated !== section.labelKey ? translated : section.defaultLabel;

                        return (
                            <View key={section.key} style={styles.rs_SectionWrapper}>
                                <View style={[styles.rs_SectionHeader, { flexDirection: rowDir }]}>
                                    <FontAwesome5 name={section.icon} size={11} color={COLORS.accentGreen} />
                                    <Text style={styles.rs_SectionTitle}>{sectionTitle}</Text>
                                </View>

                                <View style={[styles.rs_SectionGrid, { flexDirection: rowDir }]}>
                                    {sectionItems.map(item => {
                                        const isActive = item.id === productType;
                                        const label = t(item.labelKey, language);
                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                activeOpacity={0.75}
                                                onPress={() => handleSelect(item.id)}
                                                style={[
                                                    styles.rs_CategoryCard,
                                                    { flexDirection: rowDir },
                                                    isActive && styles.rs_CategoryCardActive,
                                                ]}
                                                accessible
                                                accessibilityRole="button"
                                                accessibilityState={{ selected: isActive }}
                                                accessibilityLabel={label}
                                            >
                                                <View style={[styles.rs_CategoryCardContent, { flexDirection: rowDir }]}>
                                                    <FontAwesome5
                                                        name={item.icon}
                                                        size={13}
                                                        color={isActive ? COLORS.accentGreen : COLORS.textSecondary}
                                                    />
                                                    <Text 
                                                        style={[
                                                            styles.rs_CategoryCardText, 
                                                            isActive && styles.rs_CategoryCardTextActive
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {label}
                                                    </Text>
                                                </View>
                                                {isActive && (
                                                    <FontAwesome5 name="check-circle" size={12} color={COLORS.accentGreen} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
                {isOpen && (
                    <View style={styles.rs_ScrollHintContainer}>
                        <FontAwesome5 name="chevron-down" size={11} color={COLORS.accentGreen} />
                    </View>
                )}
            </Animated.View>

            {/* ── Confirmation Button ── */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    onConfirm();
                }}
                style={styles.rs_ConfirmBtn}
                accessible
                accessibilityRole="button"
                accessibilityLabel={t('oilguard_confirm_analysis', language)}
            >
                <LinearGradient
                    colors={[COLORS.accentGreen, COLORS.accentGreen + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.rs_ConfirmGradient, { flexDirection: rowDir }]}
                >
                    <Text style={styles.rs_ConfirmText}>
                        {t('oilguard_confirm_analysis', language)}
                    </Text>
                    <FontAwesome5
                        name={isRTL ? 'arrow-left' : 'arrow-right'}
                        size={13}
                        color={COLORS.textOnAccent}
                    />
                </LinearGradient>
            </TouchableOpacity>

        </View>
    );
};
