// --- START OF FILE RoutineSegmentedControl.js ---

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../context/ThemeContext';
import { t } from '../../../i18n';
import { useCurrentLanguage } from '../../../hooks/useCurrentLanguage';
import { useRTL } from '../../../hooks/useRTL';

export default function RoutineSegmentedControl({ activePeriod, onPeriodChange }) {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL, flexDirection } = useRTL();
    const styles = useMemo(() => createStyles(C), [C]);

    const [containerWidth, setContainerWidth] = useState(0);
    
    // Now dividing by 5 to support AM, PM, Weekly, Hair, Body
    const tabWidth = containerWidth > 0 ? containerWidth / 5 : 0; 

    const getIndex = (period) => {
        if (period === 'am') return 0;
        if (period === 'pm') return 1;
        if (period === 'weekly') return 2;
        if (period === 'hair') return 3;
        if (period === 'body') return 4;
        return 0;
    };

    const activeIndex = getIndex(activePeriod);
    const animValue = useRef(new Animated.Value(activeIndex)).current;

    useEffect(() => {
        Animated.spring(animValue, {
            toValue: activeIndex,
            friction: 9, 
            tension: 65,
            useNativeDriver: true, 
        }).start();
    }, [activeIndex]);

    const handlePress = (period) => {
        if (activePeriod !== period) {
            Haptics.selectionAsync();
            onPeriodChange(period);
        }
    };

    const translateX = animValue.interpolate({
        inputRange: [0, 1, 2, 3, 4],
        outputRange: [
            0, 
            isRTL ? -tabWidth : tabWidth, 
            isRTL ? -tabWidth * 2 : tabWidth * 2,
            isRTL ? -tabWidth * 3 : tabWidth * 3,
            isRTL ? -tabWidth * 4 : tabWidth * 4
        ]
    });

    const isAm = activePeriod === 'am';
    const isPm = activePeriod === 'pm';
    const isWeekly = activePeriod === 'weekly';
    const isHair = activePeriod === 'hair';
    const isBody = activePeriod === 'body';

    return (
        <View 
            style={[styles.container, { flexDirection }]} 
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
            {containerWidth > 0 && (
                <Animated.View 
                    style={[
                        styles.activeBackground, 
                        isRTL ? { right: 0 } : { left: 0 }, 
                        { width: tabWidth, transform: [{ translateX }] }
                    ]} 
                />
            )}

            {/* Morning (AM) */}
            <Pressable style={styles.tab} onPress={() => handlePress('am')}>
                <View style={styles.tabContent}>
                    <Feather name="sun" size={14} color={isAm ? C.textOnAccent : C.textSecondary} />
                    <Text style={[styles.tabText, isAm && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                        {t('routine_period_morning', language)}
                    </Text>
                </View>
            </Pressable>

            {/* Evening (PM) */}
            <Pressable style={styles.tab} onPress={() => handlePress('pm')}>
                <View style={styles.tabContent}>
                    <Feather name="moon" size={14} color={isPm ? C.textOnAccent : C.textSecondary} />
                    <Text style={[styles.tabText, isPm && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                        {t('routine_period_evening', language)}
                    </Text>
                </View>
            </Pressable>

            {/* Weekly */}
            <Pressable style={styles.tab} onPress={() => handlePress('weekly')}>
                <View style={styles.tabContent}>
                    <Feather name="calendar" size={14} color={isWeekly ? C.textOnAccent : C.textSecondary} />
                    <Text style={[styles.tabText, isWeekly && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                        {t('routine_period_weekly', language)}
                    </Text>
                </View>
            </Pressable>

            {/* Hair */}
            <Pressable style={styles.tab} onPress={() => handlePress('hair')}>
                <View style={styles.tabContent}>
                    <MaterialCommunityIcons name="hair-dryer-outline" size={15} color={isHair ? C.textOnAccent : C.textSecondary} />
                    <Text style={[styles.tabText, isHair && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                        {t('routine_period_hair', language) || (language === 'ar' ? 'الشعر' : 'Hair')}
                    </Text>
                </View>
            </Pressable>

            {/* Body */}
            <Pressable style={styles.tab} onPress={() => handlePress('body')}>
                <View style={styles.tabContent}>
                    <Feather name="droplet" size={14} color={isBody ? C.textOnAccent : C.textSecondary} />
                    <Text style={[styles.tabText, isBody && styles.tabTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                        {t('routine_period_body', language) || (language === 'ar' ? 'الجسم' : 'Body')}
                    </Text>
                </View>
            </Pressable>
        </View>
    );
}

const createStyles = (C) => StyleSheet.create({
    container: {
        backgroundColor: C.card,
        height: 52, // Slightly taller to stack icon & text comfortably
        borderRadius: 14, 
        padding: 0, 
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.border,
        position: 'relative',
        overflow: 'hidden',
    },
    activeBackground: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        backgroundColor: C.accentGreen,
        borderRadius: 14, 
        shadowColor: C.accentGreen,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    tab: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1, 
    },
    tabContent: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column', // explicitly stacked to fit 5 items
    },
    tabText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10, // Adjusted for 5-tabs layout
        color: C.textSecondary,
        marginTop: 4, 
    },
    tabTextActive: {
        color: C.textOnAccent || C.background,
    }
});