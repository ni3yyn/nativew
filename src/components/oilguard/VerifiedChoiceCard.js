// src/components/oilguard/VerifiedChoiceCard.js
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { COLORS as DEFAULT_COLORS } from './oilguard.styles';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export const VerifiedChoiceCard = ({ item, currentScore, onPress, onSuggestAnother, loading }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const s = useMemo(() => createStyles(COLORS), [COLORS]);

    if (!item) return null;

    // Calculate the jump in quality
    const scoreDiff = item.real_score - currentScore;
    const improvement = scoreDiff > 0 ? scoreDiff : 5; // Fallback if data is similar

    return (
        <View style={s.container}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onPress(item)}
                style={s.cardFrame}
            >
                {/* 1. TOP HUD BAR */}
                <View style={s.topBar}>
                    <View style={s.matchBadge}>
                        <Ionicons name="sparkles" size={12} color={COLORS.background} />
                        <Text style={s.matchBadgeText}>بديل مقترح</Text>
                    </View>
                    <Text style={s.brandLabel}>{item.brand}</Text>
                </View>

                {/* 2. MAIN CONTENT AREA */}
                <View style={s.mainContent}>

                    {/* Image Section */}
                    <View style={s.imageContainer}>
                        {item.image ? (
                            <Image source={{ uri: item.image }} style={s.productImg} resizeMode="contain" />
                        ) : (
                            <FontAwesome5 name="box" size={20} color={COLORS.accentGreen} />
                        )}
                    </View>

                    {/* Info Section */}
                    <View style={s.infoColumn}>
                        <Text numberOfLines={1} style={s.productName}>{item.name}</Text>

                        <View style={s.dataRow}>
                            <View style={s.scoreBox}>
                                <Text style={s.scoreText}>{item.real_score}%</Text>
                                <Text style={s.scoreLabel}>درجة وثيق</Text>
                            </View>

                            <View style={s.divider} />

                            <View style={s.improvementBadge}>
                                <FontAwesome5 name="arrow-up" size={10} color={COLORS.success} />
                                <Text style={s.improvementText}>زيادة +{improvement}%</Text>
                            </View>
                        </View>
                    </View>

                    {/* Action Pillar */}
                    <TouchableOpacity
                        style={s.shuffleAction}
                        onPress={onSuggestAnother}
                        disabled={loading}
                    >
                        <View style={s.shuffleCircle}>
                            <MaterialCommunityIcons
                                name={loading ? "loading" : "shuffle-variant"}
                                size={22}
                                color={COLORS.accentGreen}
                                style={loading ? s.rotating : null}
                            />
                        </View>
                        <Text style={s.shuffleText}>بديل آخر</Text>
                    </TouchableOpacity>
                </View>

                {/* 3. BOTTOM HUD ELEMENT (Micro Progress) */}
                <View style={s.microProgressContainer}>
                    <View style={[s.microProgressFill, { width: `${item.real_score}%` }]} />
                    <View style={s.microProgressGlow} />
                </View>

                {/* Aesthetic Corners */}
                <View style={[s.hudCorner, s.tl]} />
                <View style={[s.hudCorner, s.br]} />
            </TouchableOpacity>
        </View>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 10,
        // No horizontal padding here so it stretches to match Dashboard/Claims
    },
    cardFrame: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 28, // Matches sectionCard in modal
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        overflow: 'hidden',
    },
    topBar: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    brandLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.accentGreen,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    matchBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: COLORS.accentGreen,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 5,
    },
    matchBadgeText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 10,
        color: COLORS.background,
    },
    mainContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 15,
    },
    imageContainer: {
        width: 70,
        height: 70,
        backgroundColor: '#FFF',
        borderRadius: 18,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    productImg: {
        width: '100%',
        height: '100%',
    },
    infoColumn: {
        flex: 1,
        alignItems: 'flex-end',
    },
    productName: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 17,
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    dataRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    scoreBox: {
        alignItems: 'center',
    },
    scoreText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 20,
        color: '#FFF',
        lineHeight: 22,
    },
    scoreLabel: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 9,
        color: COLORS.textDim,
    },
    divider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    improvementBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.success + '1A',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    improvementText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        color: COLORS.success,
    },
    shuffleAction: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 5,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.05)',
        paddingLeft: 12,
    },
    shuffleCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.accentGreen + '1A',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
        borderWidth: 1,
        borderColor: COLORS.accentGreen + '33',
    },
    shuffleText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 9,
        color: COLORS.textDim,
    },
    microProgressContainer: {
        height: 3,
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginTop: 20,
        borderRadius: 2,
        position: 'relative',
    },
    microProgressFill: {
        height: '100%',
        backgroundColor: COLORS.accentGreen,
        borderRadius: 2,
    },
    microProgressGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        shadowColor: COLORS.accentGreen,
        shadowOpacity: 0.5,
        shadowRadius: 5,
    },
    // Technical Accents
    hudCorner: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderColor: COLORS.border,
        opacity: 0.5,
    },
    tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 28 },
    br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 28 },
});