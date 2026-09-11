import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

export default function ShelfSegmentedControl({ activeView, onViewChange }) {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL, flexDirection } = useRTL();
    const styles = useMemo(() => createStyles(C), [C]);
    
    const isProducts = activeView === 'products';
    const [containerWidth, setContainerWidth] = useState(0);
    
    const tabWidth = containerWidth > 0 ? containerWidth / 2 : 0;

    const animValue = useRef(new Animated.Value(isProducts ? 0 : 1)).current;

    useEffect(() => {
        Animated.spring(animValue, {
            toValue: isProducts ? 0 : 1,
            friction: 9,
            tension: 65,
            useNativeDriver: true, 
        }).start();
    }, [isProducts]);

    const handlePress = (view) => {
        if (activeView !== view) {
            Haptics.selectionAsync();
            onViewChange(view);
        }
    };

    const translateX = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, isRTL ? -tabWidth : tabWidth] 
    });

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

            <Pressable style={styles.tab} onPress={() => handlePress('products')}>
                <View style={[styles.tabContent, { flexDirection }]}>
                    <FontAwesome5 name="wine-bottle" size={13} color={isProducts ? C.textOnAccent : C.textSecondary} />
                    <Text style={[styles.tabText, isProducts && styles.tabTextActive]}>
                        {t('profile_tab_shelf', language) || 'رفي'}
                    </Text>
                </View>
            </Pressable>

            <Pressable style={styles.tab} onPress={() => handlePress('routine')}>
                <View style={[styles.tabContent, { flexDirection }]}>
                    <FontAwesome5 name="calendar-check" size={13} color={!isProducts ? C.textOnAccent : C.textSecondary} />
                    <Text style={[styles.tabText, !isProducts && styles.tabTextActive]}>
                        {t('profile_tab_routine', language) || 'روتيني'}
                    </Text>
                </View>
            </Pressable>
        </View>
    );
}

const createStyles = (C) => StyleSheet.create({
    container: {
        backgroundColor: C.card,
        height: 42,
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
        gap: 6,
        paddingHorizontal: 8,
    },
    tabText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: C.textSecondary,
        marginTop: 1, 
    },
    tabTextActive: {
        color: C.textOnAccent,
    }
});