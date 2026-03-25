import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { getUserLevelData } from '../../utils/gamificationEngine';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

export default function RewardsBanner({ currentPoints, onPress }) {
    const { colors: C } = useTheme();
    const rtl = useRTL();
    const language = useCurrentLanguage();
    
    // Automatically calculate current tier, next tier, and progress
    const levelData = getUserLevelData(currentPoints || 0);
    const { currentLevel, progressPercent, pointsToNextLevel, nextLevel } = levelData;

    // --- Animations ---
    const progressAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Reset and animate the progress bar filling up
        progressAnim.setValue(0);
        Animated.timing(progressAnim, {
            toValue: progressPercent,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false, // width animation requires false
        }).start();
    },[progressPercent]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%']
    });

    // Tactile button feel
    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
    };
    
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onPress) onPress();
    };

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
            <Pressable 
                onPressIn={handlePressIn} 
                onPressOut={handlePressOut} 
                onPress={handlePress}
                style={[styles.rewardBanner, { borderColor: currentLevel.color + '40' }]}
            >
                <LinearGradient 
                    colors={[C.card, currentLevel.color + '15']} 
                    style={styles.rewardGradient} 
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                    {/* Background Watermark (Creates the Premium VIP Card look) */}
                    <FontAwesome5 
                        name={currentLevel.icon} 
                        size={120} 
                        color={currentLevel.color} 
                        style={[styles.watermark, rtl.isRTL ? { left: -20 } : { right: -20 }]} 
                    />

                    <View style={styles.contentZIndex}>
                        {/* Top Row: Level & Points */}
                        <View style={[styles.rewardHeader, { flexDirection: rtl.flexDirection }]}>
                            {/* Level Badge */}
                            <View style={[styles.levelBadge, { backgroundColor: currentLevel.color + '20', borderWidth: 1, borderColor: currentLevel.color + '40', flexDirection: rtl.flexDirection }]}>
                                <FontAwesome5 name={currentLevel.icon} size={14} color={currentLevel.color} />
                                <Text style={[styles.levelText, { color: currentLevel.color }]}>{currentLevel.name}</Text>
                            </View>
                            
                            {/* Points Display */}
                            <View style={{ alignItems: rtl.isRTL ? 'flex-end' : 'flex-start' }}>
                                <Text style={[styles.pointsLabel, { color: C.textDim, textAlign: rtl.textAlign }]}>
                                    الرصيد الحالي
                                </Text>
                                <View style={{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 6 }}>
                                    <Text style={[styles.pointsText, { color: C.textPrimary }]}>
                                        {currentPoints || 0}
                                    </Text>
                                    <FontAwesome5 name="star" size={16} color={C.gold} solid />
                                </View>
                            </View>
                        </View>
                        
                        {/* Middle: Progress Bar */}
                        <View style={styles.progressSection}>
                            <View style={[styles.progressBarBg, { backgroundColor: C.textDim + '20' }]}>
                                <Animated.View 
                                    style={[
                                        styles.progressBarFill, 
                                        { 
                                            width: progressWidth, 
                                            backgroundColor: currentLevel.color 
                                        }
                                    ]} 
                                />
                            </View>
                        </View>

                        {/* Bottom: Goal / Next Level */}
                        <View style={[styles.footerRow, { flexDirection: rtl.flexDirection }]}>
                            {currentLevel.id !== nextLevel.id ? (
                                <>
                                    <Feather name="target" size={12} color={C.textDim} />
                                    <Text style={[styles.nextLevelHint, { color: C.textDim, textAlign: rtl.textAlign }]}>
                                        باقي <Text style={{ fontFamily: 'Tajawal-ExtraBold', color: C.textPrimary }}>{pointsToNextLevel}</Text> نقطة للترقية إلى "{nextLevel.name}"
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <FontAwesome5 name="crown" size={12} color={C.gold} />
                                    <Text style={[styles.nextLevelHint, { color: C.gold, textAlign: rtl.textAlign }]}>
                                        لقد وصلت إلى أعلى مستوى! أنت أسطورة.
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    rewardBanner: { 
        borderRadius: 24, 
        borderWidth: 1, 
        overflow: 'hidden', 
    },
    rewardGradient: { 
        padding: 20,
        minHeight: 140,
        justifyContent: 'space-between'
    },
    watermark: {
        position: 'absolute',
        top: -10,
        opacity: 0.05,
        transform: [{ rotate: '-15deg' }],
        zIndex: 0,
    },
    contentZIndex: {
        zIndex: 2,
    },
    rewardHeader: { 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: 18 
    },
    levelBadge: { 
        alignItems: 'center', 
        gap: 6, 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 14 
    },
    levelText: { 
        fontFamily: 'Tajawal-ExtraBold', 
        fontSize: 12 
    },
    pointsLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        marginBottom: -2,
    },
    pointsText: { 
        fontFamily: 'Tajawal-ExtraBold', 
        fontSize: 28,
        letterSpacing: -0.5,
    },
    progressSection: {
        marginBottom: 12,
    },
    progressBarBg: { 
        height: 8, 
        borderRadius: 4, 
        overflow: 'hidden', 
        width: '100%' 
    },
    progressBarFill: { 
        height: '100%', 
        borderRadius: 4,
    },
    footerRow: {
        alignItems: 'center',
        gap: 6,
    },
    nextLevelHint: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 11,
        opacity: 0.9,
    }
});