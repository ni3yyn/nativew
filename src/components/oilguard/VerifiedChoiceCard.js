// src/components/oilguard/VerifiedChoiceCard.js
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Pressable,
    StyleSheet,
    Image,
    Animated,
    I18nManager
} from 'react-native';
import { FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS as DEFAULT_COLORS } from './oilguard.styles';
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

const AUTO_SWIPE_MS = 5000;
const AUTO_PAUSE_MS = 10000;

export const VerifiedChoiceCard = ({
    item,
    currentScore,
    rankIndex = 0,
    totalCount = 1,
    onPress,
    onSuggestAnother,
    onSuggestPrev,
    onRankSelect,
    loading,
}) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const s = useMemo(() => createStyles(COLORS), [COLORS]);
    const language = useCurrentLanguage();
    const isRTL = I18nManager.isRTL || language === 'ar';

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const pausedUntilRef = useRef(0);
    const rankKeyRef = useRef('');
    const onSuggestAnotherRef = useRef(onSuggestAnother);

    useEffect(() => { onSuggestAnotherRef.current = onSuggestAnother; }, [onSuggestAnother]);

    const hasMore = totalCount > 1;

    const pauseAutoSwipe = useCallback(() => {
        pausedUntilRef.current = Date.now() + AUTO_PAUSE_MS;
    }, []);

    useEffect(() => {
        const key = `${rankIndex}-${item?.name || ''}`;
        if (key !== rankKeyRef.current) {
            rankKeyRef.current = key;
            fadeAnim.setValue(0.3);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [rankIndex, item?.name, fadeAnim]);

    useEffect(() => {
        if (!hasMore || loading) return undefined;
        const timer = setInterval(() => {
            if (Date.now() < pausedUntilRef.current) return;
            onSuggestAnotherRef.current?.();
        }, AUTO_SWIPE_MS);
        return () => clearInterval(timer);
    }, [hasMore, loading, totalCount]);

    const goNext = useCallback(() => {
        pauseAutoSwipe();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSuggestAnother?.();
    }, [onSuggestAnother, pauseAutoSwipe]);

    const goPrev = useCallback(() => {
        pauseAutoSwipe();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSuggestPrev?.();
    }, [onSuggestPrev, pauseAutoSwipe]);

    const jumpTo = useCallback((index) => {
        pauseAutoSwipe();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onRankSelect?.(index);
    }, [onRankSelect, pauseAutoSwipe]);

    const handleOpenDetails = useCallback(() => {
        pauseAutoSwipe();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(item);
    }, [item, onPress, pauseAutoSwipe]);

    if (!item) return null;

    const improvement = Math.max(item.real_score - currentScore, 5);
    const isLowConfidence = item.confidence === 'low';
    const isTopPick = rankIndex === 0 && !isLowConfidence;

    const badgeText = isLowConfidence
        ? (t('oilguard_partial_match', language) || 'Partial Match')
        : isTopPick
            ? (t('oilguard_best_match', language) || 'Best Match')
            : `#${rankIndex + 1} ${t('oilguard_of', language) || 'of'} ${totalCount}`;

    const themeAccentColor = isLowConfidence ? COLORS.warning : COLORS.accentGreen;
    const wrapperBorderColor = COLORS.textPrimary + '1F';

    return (
        <View style={s.container}>
            <View style={[s.card, { borderColor: wrapperBorderColor }, isLowConfidence && s.cardLow]}>

                {/* Header Row */}
                <View style={[s.header, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[s.badge, { borderColor: themeAccentColor + '4D', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[s.pulseDot, { backgroundColor: themeAccentColor }]} />
                        <Text style={[s.badgeText, { color: themeAccentColor }]}>
                            {badgeText}
                        </Text>
                    </View>
                    {hasMore && (
                        <Text style={s.altCount}>
                            {totalCount} {t('oilguard_alternatives_short', language)}
                        </Text>
                    )}
                </View>

                {/* Tappable Product Row */}
                <Pressable
                    onPress={handleOpenDetails}
                    style={({ pressed }) => [s.body, pressed && s.bodyPressed]}
                    android_ripple={{ color: COLORS.accentGreen + '1A' }}
                >
                    <Animated.View style={[s.bodyInner, { opacity: fadeAnim, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        {/* Elegant Product Image Display Stage */}
                        <View style={[s.imageWrap, { borderColor: COLORS.textPrimary + '0D' }]}>
                            {item.image ? (
                                <Image source={{ uri: item.image }} style={s.image} resizeMode="contain" />
                            ) : (
                                <FontAwesome5 name="box" size={18} color={COLORS.textDim} />
                            )}
                        </View>

                        {/* Product Meta Info */}
                        <View style={[s.info, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                            <Text numberOfLines={1} style={[s.brand, { color: themeAccentColor }]}>
                                {item.brand}
                            </Text>
                            <Text numberOfLines={2} style={[s.name, { textAlign: isRTL ? 'right' : 'left' }]}>
                                {item.name}
                            </Text>

                            <View style={[s.scoreRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                <Text style={s.score}>{item.real_score}%</Text>
                                
                                <View style={[s.deltaPill, { backgroundColor: isLowConfidence ? `${COLORS.warning}1A` : `${COLORS.success}1A` }]}>
                                    <Feather 
                                        name="trending-up" 
                                        size={11} 
                                        color={isLowConfidence ? COLORS.warning : COLORS.success} 
                                        style={{ marginRight: 2 }}
                                    />
                                    <Text style={[s.deltaText, { color: isLowConfidence ? COLORS.warning : COLORS.success }]}>
                                        +{improvement}%
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <Feather
                            name={isRTL ? "chevron-left" : "chevron-right"}
                            size={18}
                            color={COLORS.textDim}
                            style={s.chevron}
                        />
                    </Animated.View>
                </Pressable>

                {/* Navigation Pager */}
                {hasMore && (
                    <View style={[s.pager, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <TouchableOpacity onPress={isRTL ? goPrev : goNext} style={s.pagerBtn} disabled={loading}>
                            <Feather name={isRTL ? "chevron-right" : "chevron-left"} size={16} color={COLORS.textDim} />
                        </TouchableOpacity>

                        <View style={[s.dots, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            {Array.from({ length: totalCount }).map((_, i) => (
                                <TouchableOpacity key={i} onPress={() => jumpTo(i)} hitSlop={6}>
                                    <View style={[s.dot, i === rankIndex && [s.dotOn, { backgroundColor: themeAccentColor }]]} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity onPress={isRTL ? goNext : goPrev} style={s.pagerBtn} disabled={loading}>
                            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={COLORS.textDim} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    container: {
        width: '100%',
        paddingHorizontal: 0,
    },
    card: {
        backgroundColor: COLORS.textPrimary + '05',
        borderRadius: 24,
        padding: 18,
        gap: 16,
        borderWidth: 1,
        position: 'relative',
    },
    cardLow: {
        backgroundColor: COLORS.warning + '03',
    },
    header: {
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    badge: {
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 30,
        backgroundColor: COLORS.textPrimary + '08',
        borderWidth: 1,
    },
    pulseDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    badgeText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        letterSpacing: 0.2,
    },
    altCount: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        color: COLORS.textDim + 'BF',
    },
    body: {
        borderRadius: 16,
    },
    bodyPressed: {
        opacity: 0.85,
    },
    bodyInner: {
        alignItems: 'center',
        gap: 16,
    },
    imageWrap: {
        width: 72,
        height: 72,
        borderRadius: 18,
        backgroundColor: '#FCFDFF',
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    info: {
        flex: 1,
        gap: 1,
    },
    brand: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    name: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: COLORS.textPrimary,
        lineHeight: 20,
    },
    scoreRow: {
        alignItems: 'center',
        gap: 10,
        marginTop: 6,
    },
    score: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 22,
        color: COLORS.textPrimary,
        lineHeight: 24,
    },
    deltaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    deltaText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
    },
    chevron: {
        opacity: 0.4,
        marginHorizontal: 2,
    },
    pager: {
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.textPrimary + '0A',
    },
    pagerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.textPrimary + '05',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dots: {
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: COLORS.textPrimary + '1C',
    },
    dotOn: {
        width: 14,
        borderRadius: 3,
    },
});