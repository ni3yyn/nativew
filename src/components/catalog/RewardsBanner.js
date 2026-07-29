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

export default function RewardsBanner({ currentPoints, onPress }) {
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
        setProfileModalVisible(true);
        if (onPress) onPress();
    };

    const currentUserObj = userProfile ? { ...userProfile, uid: user?.uid } : { uid: user?.uid };

    return (
        <>
            <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
                <Pressable 
                    onPressIn={handlePressIn} 
                    onPressOut={handlePressOut} 
                    onPress={handlePress}
                    style={[styles.rewardBanner, { borderColor: currentLevel.color + '35' }]}
                >
                    <LinearGradient 
                        colors={[C.card, currentLevel.color + '08']} 
                        style={styles.rewardGradient} 
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.contentZIndex}>
                            <View style={[styles.topRow, { flexDirection: rtl.flexDirection }]}>
                                <View style={styles.levelSection}>
                                    <View style={styles.levelTextBlock}>
                                        <Text style={[styles.labelText, { color: C.textDim, textAlign: rtl.textAlign }]}>{t('catalog_level', lang)}</Text>
                                        <Text style={[styles.levelName, { color: C.textPrimary, textAlign: rtl.textAlign }]}>{currentLevel.name}</Text>
                                    </View>
                                </View>

                                <View style={[styles.pointsPill, { backgroundColor: currentLevel.color + '12' }]}> 
                                    <Text style={[styles.pointsValue, { color: C.textPrimary }]}>{currentPoints || 0}</Text>
                                    <FontAwesome5 name="star" size={11} color={C.gold} solid />
                                </View>
                            </View>

                            <View style={styles.progressWrap}>
                                <View style={styles.progressMeta}>
                                    {currentLevel.id !== nextLevel.id ? (
                                        <Text style={[styles.progressLabel, { color: C.textSecondary, textAlign: rtl.textAlign }]}>
                                            {interpolate(t('catalog_points_left', lang), { points: pointsToNextLevel })}
                                        </Text>
                                    ) : (
                                        <Text style={[styles.progressLabel, { color: C.textSecondary, textAlign: rtl.textAlign }]}>{t('catalog_max_level', lang)}</Text>
                                    )}
                                    <Text style={[styles.progressPercent, { color: currentLevel.color }]}>{Math.round(progressPercent)}%</Text>
                                </View>

                                <View style={[styles.progressBarBg, { backgroundColor: C.textDim + '20' }]}> 
                                    <Animated.View
                                        style={[
                                            styles.progressBarFill,
                                            { width: progressWidth, backgroundColor: currentLevel.color }
                                        ]}
                                    />
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </Pressable>
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
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    rewardBanner: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    rewardGradient: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 90,
        justifyContent: 'center'
    },
    contentZIndex: {
        zIndex: 2,
    },
    topRow: {
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    levelSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    levelTextBlock: {
        flex: 1,
    },
    labelText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 9,
        marginBottom: 1,
    },
    levelName: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 12,
    },
    pointsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 999,
    },
    pointsValue: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 14,
        letterSpacing: -0.3,
    },
    progressWrap: {
        gap: 5,
    },
    progressMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    progressLabel: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        flex: 1,
    },
    progressPercent: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 12,
        marginStart: 6,
    },
    progressBarBg: {
        height: 6,
        borderRadius: 999,
        overflow: 'hidden',
        width: '100%'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 999,
    }
});