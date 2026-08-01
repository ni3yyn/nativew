import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { getUserLevelData } from '../../utils/gamificationEngine';
import { useRTL } from '../../hooks/useRTL';
import { t, interpolate } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useAppContext } from '../../context/AppContext';
import UserProfileModal from '../community/UserProfileModal';

export default function RewardsBanner({ currentPoints, onPress, scrollY, collapsed }) {
    const { colors: C } = useTheme();
    const rtl = useRTL();
    const lang = useCurrentLanguage();
    const { user, userProfile } = useAppContext();

    const [profileModalVisible, setProfileModalVisible] = useState(false);
    
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
    }, [progressPercent]);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%']
    });

    // Collapse animations based on scrollY prop
    const bannerHeight = scrollY ? scrollY.interpolate({
        inputRange: [0, 50, 100],
        outputRange: [56, 40, 0],
        extrapolate: 'clamp'
    }) : new Animated.Value(56);

    const bannerOpacity = scrollY ? scrollY.interpolate({
        inputRange: [0, 50, 100],
        outputRange: [1, 0.8, 0],
        extrapolate: 'clamp'
    }) : new Animated.Value(1);

    const bannerMargin = scrollY ? scrollY.interpolate({
        inputRange: [0, 50, 100],
        outputRange: [6, 3, 0],
        extrapolate: 'clamp'
    }) : new Animated.Value(6);

    const scale = scrollY ? scrollY.interpolate({
        inputRange: [0, 50, 100],
        outputRange: [1, 0.95, 0.6],
        extrapolate: 'clamp'
    }) : new Animated.Value(1);

    // Tactile button feel
    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
    };
    
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setProfileModalVisible(true);
        if (onPress) onPress();
    };

    const currentUserObj = userProfile ? { ...userProfile, uid: user?.uid } : { uid: user?.uid };

    return (
        <>
            <Animated.View 
                style={[
                    styles.container, 
                    { 
                        height: bannerHeight,
                        opacity: bannerOpacity,
                        marginBottom: bannerMargin,
                        transform: [{ scale: scale }]
                    }
                ]}
            >
                <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
                    <Pressable 
                        onPressIn={handlePressIn} 
                        onPressOut={handlePressOut} 
                        onPress={handlePress}
                        style={styles.rewardBanner}
                    >
                        <LinearGradient 
                            colors={[C.card + '00', currentLevel.color + '00']} 
                            style={styles.rewardGradient} 
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.contentZIndex}>
                                <View style={[styles.row, { flexDirection: rtl.flexDirection }]}>
                                    {/* Level Indicator - Compact */}
                                    <View style={styles.levelIndicator}>
                                        <View style={[styles.levelDot, { backgroundColor: currentLevel.color }]} />
                                        <Text style={[styles.levelName, { color: C.textPrimary }]}>
                                            {currentLevel.name}
                                        </Text>
                                    </View>

                                    {/* Progress Bar - Compact */}
                                    <View style={styles.progressWrap}>
                                        <View style={[styles.progressBarBg, { backgroundColor: C.textDim + '20' }]}>
                                            <Animated.View
                                                style={[
                                                    styles.progressBarFill,
                                                    { width: progressWidth, backgroundColor: currentLevel.color }
                                                ]}
                                            />
                                        </View>
                                    </View>

                                    {/* Points - Compact */}
                                    <View style={[styles.pointsPill, { backgroundColor: 'transparent'}]}>
                                        <Text style={[styles.pointsValue, { color: C.textPrimary }]}>
                                            {currentPoints || 0}
                                        </Text>
                                        <FontAwesome5 name="star" size={9} color={C.gold} solid />
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </Pressable>
                </Animated.View>
            </Animated.View>

            <UserProfileModal
                visible={profileModalVisible}
                onClose={() => setProfileModalVisible(false)}
                targetUserId={user?.uid}
                initialData={userProfile}
                currentUser={currentUserObj}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    rewardBanner: {
        borderRadius: 0,
        overflow: 'hidden',
        height: '100%',
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
        backgroundColor: 'transparent',
    },
    rewardGradient: {
        paddingHorizontal: 4, // CHANGED: was 12, now reduced to 4
        paddingVertical: 2,   // CHANGED: was 6, now reduced to 2
        height: '100%',
        justifyContent: 'center'
    },
    contentZIndex: {
        zIndex: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6, // CHANGED: was 8, slightly reduced
    },
    levelIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4, // CHANGED: was 5, slightly reduced
        minWidth: 50,
    },
    levelDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    levelName: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15,
        letterSpacing: 0.3,
    },
    progressWrap: {
        flex: 1,
        marginHorizontal: 2, // CHANGED: was 4, reduced
    },
    progressBarBg: {
        height: 4,
        borderRadius: 999,
        overflow: 'hidden',
        width: '100%',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 999,
    },
    pointsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2, // CHANGED: was 3, slightly reduced
        paddingHorizontal: 4, // CHANGED: was 6, reduced
        paddingVertical: 1, // CHANGED: was 2, reduced
        borderRadius: 999,
        minWidth: 35, // CHANGED: was 40, reduced
        justifyContent: 'center',
    },
    pointsValue: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15,
        letterSpacing: -0.2,
    },
});