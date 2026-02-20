// src/components/oilguard/ReviewStep.js

import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Import shared styles and data
import { createStyles, COLORS as DEFAULT_COLORS } from './oilguard.styles'; // Adjust path to where your styles file is
import { PRODUCT_TYPES } from '../../constants/productData'; // Adjust path to constants
import { useTheme } from '../../context/ThemeContext';

export const ReviewStep = ({ productType, setProductType, onConfirm }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    const [showGrid, setShowGrid] = useState(false);
    const [listContentHeight, setListContentHeight] = useState(350);
    const gridHeight = useRef(new Animated.Value(0)).current;

    const toggleGrid = () => {
        const target = showGrid ? 0 : 1;
        setShowGrid(!showGrid);

        Animated.spring(gridHeight, {
            toValue: target,
            useNativeDriver: false,
            friction: 9,
            tension: 50
        }).start();
    };

    const handleSelect = (id) => {
        setProductType(id);
        Haptics.selectionAsync();
        toggleGrid();
    };

    const currentLabel = PRODUCT_TYPES.find(t => t.id === productType)?.label || 'غير محدد';
    const currentIcon = PRODUCT_TYPES.find(t => t.id === productType)?.icon || 'box-open';

    // Limit max height to 350 or content size
    const dropdownHeight = listContentHeight > 350 ? 350 : listContentHeight;

    return (
        <View style={styles.rs_Container}>
            <View style={styles.rs_CenterContent}>
                <Text style={styles.rs_Title}>التحقق من المنتج</Text>
                <Text style={styles.rs_Subtitle}>هل هذا التصنيف صحيح؟</Text>
            </View>

            <View style={styles.rs_HeroWrapper}>
                <View style={styles.rs_VisualCircleContainer}>
                    <View style={styles.rs_GlowRing} />
                    <View style={styles.rs_GlassCircle}>
                        <FontAwesome5 name={currentIcon} size={42} color={COLORS.accentGreen} />
                    </View>
                </View>

                <View style={styles.rs_LabelContainer}>
                    <Text style={styles.rs_LabelText}>{currentLabel}</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={toggleGrid} style={styles.rs_EditBtn}>
                        <Text style={styles.rs_EditBtnText}>تغيير التصنيف</Text>
                        <FontAwesome5 name={showGrid ? "chevron-up" : "chevron-down"} size={12} color={COLORS.accentGreen} />
                    </TouchableOpacity>
                </View>
            </View>

            <Animated.View style={[
                styles.rs_GridWrapper,
                {
                    height: gridHeight.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, dropdownHeight],
                        extrapolate: 'clamp'
                    }),
                    marginTop: gridHeight.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 20],
                        extrapolate: 'clamp'
                    }),
                    opacity: gridHeight,
                    overflow: 'hidden' // Important!
                }
            ]}>
                <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={styles.rs_ChipGrid}
                    onContentSizeChange={(_, h) => setListContentHeight(h)}
                >
                    {PRODUCT_TYPES.map(t => (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            key={t.id}
                            onPress={() => handleSelect(t.id)}
                            style={[styles.rs_TypeChip, productType === t.id && styles.rs_TypeChipActive]}
                        >
                            <FontAwesome5 name={t.icon} size={14} color={productType === t.id ? COLORS.textOnAccent : COLORS.textSecondary} />
                            <Text style={[styles.rs_TypeChipText, productType === t.id && styles.rs_TypeChipTextActive]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Animated.View>

            <View style={styles.rs_Footer}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                        Haptics.selectionAsync();
                        onConfirm();
                    }}
                    style={styles.rs_ConfirmBtn}
                >
                    <LinearGradient
                        colors={[COLORS.accentGreen, COLORS.accentGreen + 'BF']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.rs_ConfirmGradient}
                    >
                        <Text style={styles.rs_ConfirmText}>نعم، تابع للتحليل</Text>
                        <FontAwesome5 name="arrow-left" color={COLORS.textOnAccent} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};