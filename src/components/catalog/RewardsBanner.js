import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function RewardsBanner({ currentPoints, nextLevelPoints, levelName }) {
    const { colors: C } = useTheme();
    const progress = Math.min((currentPoints / nextLevelPoints) * 100, 100);

    return (
        <View style={[styles.rewardBanner, { borderColor: C.gold + '40' }]}>
            <LinearGradient colors={[C.gold + '1A', C.card]} style={styles.rewardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.rewardHeader}>
                    <View style={[styles.levelBadge, { backgroundColor: C.gold + '20' }]}>
                        <FontAwesome5 name="crown" size={12} color={C.gold} />
                        <Text style={[styles.levelText, { color: C.gold }]}>{levelName}</Text>
                    </View>
                    <Text style={[styles.pointsText, { color: C.textPrimary }]}>{currentPoints} نقطة ✨</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: C.gold }]} />
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    rewardBanner: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 15 },
    rewardGradient: { padding: 15 },
    rewardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    levelBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    levelText: { fontFamily: 'Tajawal-Bold', fontSize: 11 },
    pointsText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16 },
    progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3 },
});