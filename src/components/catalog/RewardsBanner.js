import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { getUserLevelData } from '../../utils/gamificationEngine';

export default function RewardsBanner({ currentPoints }) {
    const { colors: C } = useTheme();
    
    // Automatically calculate current tier, next tier, and progress
    const levelData = getUserLevelData(currentPoints || 0);
    const { currentLevel, progressPercent, pointsToNextLevel, nextLevel } = levelData;

    return (
        <View style={[styles.rewardBanner, { borderColor: currentLevel.color + '40' }]}>
            <LinearGradient 
                colors={[currentLevel.color + '1A', C.card]} 
                style={styles.rewardGradient} 
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
                <View style={styles.rewardHeader}>
                    <View style={[styles.levelBadge, { backgroundColor: currentLevel.color + '20' }]}>
                        <FontAwesome5 name={currentLevel.icon} size={12} color={currentLevel.color} />
                        <Text style={[styles.levelText, { color: currentLevel.color }]}>{currentLevel.name}</Text>
                    </View>
                    <Text style={[styles.pointsText, { color: C.textPrimary }]}>{currentPoints || 0} نقطة ✨</Text>
                </View>
                
                <View style={[styles.progressBarBg, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: currentLevel.color }]} />
                </View>

                {currentLevel.id !== nextLevel.id && (
                    <Text style={[styles.nextLevelHint, { color: C.textDim }]}>
                        باقي {pointsToNextLevel} نقطة لتصبحي "{nextLevel.name}"
                    </Text>
                )}
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
    progressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
    progressBarFill: { height: '100%', borderRadius: 3 },
    nextLevelHint: { fontFamily: 'Tajawal-Regular', fontSize: 10, textAlign: 'left', marginTop: 4 }
});