import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, width } from './oilguard.styles';

export const VerifiedChoiceCard = ({ item, currentScore, onPress, onSuggestAnother, loading }) => {
    if (!item) return null;

    const scoreDiff = item.real_score - currentScore;

    return (
        <View style={s.outerWrapper}>
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => onPress(item)}  
                style={s.glassCard}
            >
                {/* 1. Brand/Type Header */}
                <View style={s.topRow}>
                    <View style={s.badgeMatch}>
                        <FontAwesome5 name="magic" size={8} color={COLORS.background} />
                        <Text style={s.badgeText}>مطابقة أفضل</Text>
                    </View>
                    <Text style={s.brandName}>{item.brand}</Text>
                </View>

                {/* 2. Main Content Body */}
                <View style={s.mainBody}>
                    <View style={s.imageFrame}>
                        {item.image ? (
                            <Image source={{ uri: item.image }} style={s.img} resizeMode="contain" />
                        ) : (
                            <FontAwesome5 name="box" size={18} color={COLORS.accentGreen} />
                        )}
                    </View>

                    <View style={s.infoSide}>
                        <Text numberOfLines={1} style={s.prodName}>{item.name}</Text>
                        <View style={s.scoreRow}>
                            <Text style={s.scoreVal}>{item.real_score}%</Text>
                            <View style={s.improvementTag}>
                                <FontAwesome5 name="arrow-up" size={8} color={COLORS.success} />
                                <Text style={s.improvementText}>+{scoreDiff > 0 ? scoreDiff : 5}</Text>
                            </View>
                        </View>
                    </View>

                    {/* 3. Action Pillar */}
                    <View style={s.actionPillar}>
                        <TouchableOpacity 
                            style={s.shuffleBtn} 
                            onPress={onSuggestAnother}
                            disabled={loading}
                        >
                            <MaterialCommunityIcons 
                                name={loading ? "loading" : "shuffle-variant"} 
                                size={20} 
                                color={COLORS.textDim} 
                            />
                        </TouchableOpacity>
                        <Text style={s.shuffleLabel}>بديل آخر</Text>
                    </View>
                </View>

                {/* Subtle Progress Bar Background */}
                <View style={s.microProgressContainer}>
                    <View style={[s.microProgressFill, { width: `${item.real_score}%` }]} />
                </View>
            </TouchableOpacity>
        </View>
    );
};

const s = StyleSheet.create({
    outerWrapper: {
        paddingHorizontal: 20,
        marginVertical: 15,
        width: '100%',
    },
    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(90, 156, 132, 0.3)',
        padding: 12,
        overflow: 'hidden',
    },
    topRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    brandName: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        color: COLORS.accentGreen,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    badgeMatch: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: COLORS.accentGreen,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
    },
    badgeText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 9,
        color: COLORS.background,
    },
    mainBody: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    imageFrame: {
        width: 55,
        height: 55,
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    img: { width: '100%', height: '100%' },
    infoSide: {
        flex: 1,
        alignItems: 'flex-end',
    },
    prodName: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    scoreRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    scoreVal: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        color: '#FFF',
    },
    improvementTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    improvementText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
        color: COLORS.success,
    },
    actionPillar: {
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.05)',
        paddingRight: 12,
        gap: 4,
    },
    shuffleBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shuffleLabel: {
        fontFamily: 'Tajawal-Medium',
        fontSize: 8,
        color: COLORS.textDim,
    },
    microProgressContainer: {
        height: 2,
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginTop: 12,
        borderRadius: 1,
    },
    microProgressFill: {
        height: '100%',
        backgroundColor: COLORS.accentGreen,
        borderRadius: 1,
        opacity: 0.5,
    }
});