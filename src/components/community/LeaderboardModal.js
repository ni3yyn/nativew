// src/components/community/LeaderboardModal.js

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View, Text, Modal, StyleSheet, FlatList, ScrollView, Platform,
    TouchableOpacity, ActivityIndicator, Animated, Dimensions, Easing, Pressable, Image, PanResponder
} from 'react-native';
import { FontAwesome5, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where, getCountFromServer } from 'firebase/firestore';

import { db } from '../../config/firebase';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { getUserLevelData, USER_LEVELS, BOUNTY_REWARDS } from '../../utils/gamificationEngine';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';
import { AVATARS } from '../../constants/avatars';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- METALLIC PODIUM ACCENTS ---
const getMedalColors = (isDark, COLORS) => ({
    1: {
        bg: '#F59E0B',
        border: '#FDE047',
        text: '#000000',
        icon: 'crown',
        pillBg: isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.12)',
        pillText: isDark ? '#FDE047' : '#B45309',
        podiumBg: isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.08)',
        iconColor: isDark ? '#FDE047' : '#D97706',
    },
    2: {
        bg: '#94A3B8',
        border: '#E2E8F0',
        text: '#000000',
        icon: 'medal',
        pillBg: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(100, 116, 139, 0.12)',
        pillText: isDark ? '#E2E8F0' : '#334155',
        podiumBg: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.08)',
        iconColor: isDark ? '#CBD5E1' : '#64748B',
    },
    3: {
        bg: '#D97706',
        border: '#F59E0B',
        text: '#FFFFFF',
        icon: 'award',
        pillBg: isDark ? 'rgba(217, 119, 6, 0.18)' : 'rgba(194, 65, 12, 0.12)',
        pillText: isDark ? '#FBBF24' : '#9A3412',
        podiumBg: isDark ? 'rgba(217, 119, 6, 0.12)' : 'rgba(194, 65, 12, 0.08)',
        iconColor: isDark ? '#FBBF24' : '#C2410C',
    },
});

// --- AVATAR WITH 1ج PIN ---
const UserAvatar = ({ avatarId, name, isFirstGen = false, size = 44, COLORS, isHighlighted = false }) => {
    const avatarSource = AVATARS[avatarId];
    return (
        <View style={{ position: 'relative' }}>
            <View style={{
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: COLORS.card,
                borderWidth: isHighlighted ? 2.5 : 1.5,
                borderColor: isHighlighted ? (COLORS.gold || '#F59E0B') : COLORS.border,
                alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
            }}>
                {avatarSource ? (
                    <Image source={avatarSource} style={{ width: size, height: size, borderRadius: size / 2 }} />
                ) : (
                    <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: size * 0.4, color: isHighlighted ? COLORS.gold : COLORS.accentGreen }}>
                        {(name || '?').charAt(0).toUpperCase()}
                    </Text>
                )}
            </View>

            {/* 🌟 1ج PIN 🌟 */}
            {isFirstGen && (
                <View style={[styles.firstGenAvatarPin, { borderColor: COLORS.background }]}>
                    <LinearGradient
                        colors={['#FDE047', '#F59E0B', '#B45309']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.firstGenPinGradient}
                    >
                        <Text style={styles.firstGenPinText}>1ج</Text>
                    </LinearGradient>
                </View>
            )}
        </View>
    );
};

// --- PODIUM CARD (#1, #2, #3) ---
const PodiumCard = ({ entry, rank, COLORS, isDark, onPress, language }) => {
    const medalColors = useMemo(() => getMedalColors(isDark, COLORS), [isDark, COLORS]);
    const medal = medalColors[rank];
    const scaleAnim = useRef(new Animated.Value(0.7)).current;
    
    // Localized Level
    const levelData = getUserLevelData(entry.points || 0, language);

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            tension: 40,
            delay: rank * 80,
            useNativeDriver: true,
        }).start();
    }, [rank]);

    const podiumHeight = rank === 1 ? 120 : rank === 2 ? 95 : 75;

    return (
        <Animated.View style={{ alignItems: 'center', flex: 1, transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ alignItems: 'center', width: '100%' }}>
                {/* Rank Badge */}
                <View style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: medal.bg,
                    alignItems: 'center', justifyContent: 'center',
                    marginBottom: 6,
                    borderWidth: 1.5, borderColor: medal.border,
                }}>
                    <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 13, color: medal.text }}>
                        {rank}
                    </Text>
                </View>

                {/* Avatar with 1ج */}
                <View style={{
                    borderWidth: 2.5, borderColor: medal.border,
                    borderRadius: 36, marginBottom: 6,
                }}>
                    <UserAvatar
                        avatarId={entry.settings?.avatarId}
                        name={entry.settings?.name || entry.name}
                        isFirstGen={entry.isFirstGen}
                        size={rank === 1 ? 60 : 48}
                        COLORS={COLORS}
                    />
                </View>

                {/* Name */}
                <Text
                    numberOfLines={1}
                    style={{
                        fontFamily: 'Tajawal-Bold', fontSize: 13,
                        color: COLORS.textPrimary, textAlign: 'center',
                        maxWidth: 95, marginBottom: 2
                    }}
                >
                    {entry.settings?.name || entry.name || t('leaderboard_anonymous', language)}
                </Text>

                {/* Level Title (Clean & Themed) */}
                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.accentGreen, marginBottom: 4 }}>
                    {levelData.currentLevel.name}
                </Text>

                {/* Points Pill */}
                <View style={{
                    backgroundColor: medal.pillBg,
                    borderWidth: 0.8, borderColor: medal.border + '60',
                    paddingHorizontal: 9, paddingVertical: 2.5, borderRadius: 10,
                    marginBottom: 4,
                }}>
                    <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 12, color: medal.pillText }}>
                        {(entry.points || 0).toLocaleString()} ✦
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Podium Base Block */}
            <View style={{
                width: '85%', height: podiumHeight,
                backgroundColor: medal.podiumBg,
                borderTopLeftRadius: 16, borderTopRightRadius: 16,
                borderWidth: 1, borderBottomWidth: 0, borderColor: medal.border + '40',
                alignItems: 'center', justifyContent: 'center',
                marginTop: 2,
            }}>
                <FontAwesome5 name={medal.icon} size={rank === 1 ? 26 : 18} color={medal.iconColor} />
            </View>
        </Animated.View>
    );
};

// --- RANKED ROW (Rank 4+) ---
const RankedRow = ({ entry, rank, COLORS, isDark, onPress, isCurrentUser, language, rtl }) => {
    const levelData = getUserLevelData(entry.points || 0, language);
    const pointsTextColor = isDark ? (COLORS.gold || '#F59E0B') : '#B45309';

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[
                styles.rankedRowContainer,
                {
                    flexDirection: rtl.flexDirection,
                    borderBottomColor: COLORS.border + '40',
                    backgroundColor: isCurrentUser ? COLORS.accentGreen + (isDark ? '18' : '10') : 'transparent',
                    borderRightWidth: isCurrentUser && rtl.isRTL ? 4 : 0,
                    borderLeftWidth: isCurrentUser && !rtl.isRTL ? 4 : 0,
                    borderColor: COLORS.accentGreen,
                }
            ]}
        >
            {/* Rank number */}
            <View style={{ width: 44, alignItems: 'center', marginHorizontal: 4 }}>
                <Text style={{
                    fontFamily: 'Tajawal-ExtraBold',
                    fontSize: rank > 9999 ? 12 : rank > 999 ? 13.5 : 15.5,
                    color: isCurrentUser ? COLORS.accentGreen : COLORS.textDim
                }}>
                    #{rank}
                </Text>
            </View>

            {/* Avatar with 1ج */}
            <UserAvatar
                avatarId={entry.settings?.avatarId}
                name={entry.settings?.name || entry.name}
                isFirstGen={entry.isFirstGen}
                size={42}
                COLORS={COLORS}
                isHighlighted={isCurrentUser}
            />

            {/* Name & Level */}
            <View style={[styles.rankedRowMeta, { alignItems: rtl.isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text numberOfLines={1} style={{ fontFamily: 'Tajawal-Bold', fontSize: 14.5, color: isCurrentUser ? COLORS.accentGreen : COLORS.textPrimary }}>
                    {entry.settings?.name || entry.name || t('leaderboard_anonymous', language)}
                    {isCurrentUser ? ` (${t('leaderboard_you', language)})` : ''}
                </Text>
                <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.accentGreen, marginTop: 1 }}>
                    {levelData.currentLevel.name}
                </Text>
            </View>

            {/* Points */}
            <View style={{
                backgroundColor: (COLORS.gold || '#F59E0B') + (isDark ? '16' : '10'),
                borderWidth: 0.8, borderColor: (COLORS.gold || '#F59E0B') + '40',
                paddingHorizontal: 11, paddingVertical: 4.5, borderRadius: 10,
            }}>
                <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 12.5, color: pointsTextColor }}>
                    {(entry.points || 0).toLocaleString()} ✦
                </Text>
            </View>
        </TouchableOpacity>
    );
};

// --- GAMIFICATION FAQ MODAL ---
const GamificationFaqModal = ({ visible, onClose, COLORS, language, rtl }) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }).start();
        } else {
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true }).start();
        }
    }, [visible]);

    const pointsRules = [
        { icon: 'edit-3', color: COLORS.accentGreen, pts: 30, text: t('gamification_act_post', language) || 'نشر تجربة أو استفسار' },
        { icon: 'message-circle', color: COLORS.accentGreen, pts: 10, text: t('gamification_act_comment', language) || 'التعليق والرد في المجتمع' },
        { icon: 'heart', color: COLORS.accentGreen, pts: 2, text: t('gamification_act_like', language) || 'الإعجاب بالمنشورات المفيدة' },
        { icon: 'plus-circle', color: COLORS.gold || '#F59E0B', pts: BOUNTY_REWARDS.newProduct, text: t('gamification_act_new_product', language) || 'إضافة منتج غير مدرج' },
        { icon: 'flask', color: COLORS.gold || '#F59E0B', pts: BOUNTY_REWARDS.ingredients, isFa5: true, text: t('gamification_act_ingredients', language) || 'إكمال قائمة المكونات (INCI)' },
        { icon: 'dollar-sign', color: COLORS.accentGreen, pts: BOUNTY_REWARDS.price, text: t('gamification_act_price', language) || 'تحديث سعر المنتج في السوق' },
        { icon: 'check-double', color: COLORS.accentGreen, pts: BOUNTY_REWARDS.marketingClaims, isFa5: true, text: t('bounty_title_claims', language) || 'إضافة مميزات المنتج' },
        { icon: 'user-tag', color: COLORS.accentGreen, pts: BOUNTY_REWARDS.targetTypes, isFa5: true, text: t('bounty_title_targets', language) || 'تحديد نوع البشرة المستهدفة' },
        { icon: 'box', color: COLORS.accentGreen, pts: BOUNTY_REWARDS.quantity, text: t('gamification_act_quantity', language) || 'تحديد حجم / وزن العبوة' },
        { icon: 'tag', color: COLORS.accentGreen, pts: BOUNTY_REWARDS.category, text: t('gamification_act_category', language) || 'تحديد تصنيف المنتج' },
        { icon: 'globe', color: COLORS.accentGreen, pts: BOUNTY_REWARDS.country, text: t('gamification_act_country', language) || 'تحديد بلد المنشأ والتصنيع' },
    ];

    const faqs = [
        { q: t('gamification_faq_q1', language), a: t('gamification_faq_a1', language) },
        { q: t('gamification_faq_q2', language), a: t('gamification_faq_a2', language) },
        { q: t('gamification_faq_q3', language), a: t('gamification_faq_a3', language) },
    ];

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                <Animated.View style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: SCREEN_HEIGHT * 0.88,
                    backgroundColor: COLORS.background,
                    borderTopLeftRadius: 28, borderTopRightRadius: 28,
                    transform: [{ translateY: slideAnim }],
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <View style={[styles.faqHeader, { borderBottomColor: COLORS.border, flexDirection: rtl.flexDirection }]}>
                        <View style={[{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 10 }]}>
                            <View style={[styles.faqIconBox, { backgroundColor: (COLORS.gold || '#F59E0B') + '1A', borderColor: (COLORS.gold || '#F59E0B') + '40' }]}>
                                <Feather name="help-circle" size={18} color={COLORS.gold || '#F59E0B'} />
                            </View>
                            <View>
                                <Text style={[styles.faqTitle, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]}>
                                    {t('gamification_faq_title', language)}
                                </Text>
                                <Text style={[styles.faqSubtitle, { color: COLORS.textSecondary, textAlign: rtl.textAlign }]}>
                                    {t('gamification_faq_subtitle', language)}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
                            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                        {/* 1. Points Breakdown */}
                        <View style={[{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 8, marginBottom: 12 }]}>
                            <Feather name="star" size={16} color={COLORS.gold || '#F59E0B'} />
                            <Text style={[styles.faqSectionTitle, { color: COLORS.gold || '#F59E0B' }]}>
                                {t('gamification_points_breakdown', language)}
                            </Text>
                        </View>
                        <View style={[styles.rulesCard, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                            {pointsRules.map((rule, idx) => (
                                <View 
                                    key={idx} 
                                    style={[
                                        styles.ruleRow, 
                                        { 
                                            flexDirection: rtl.flexDirection, 
                                            borderBottomColor: COLORS.border + '35',
                                            borderBottomWidth: idx === pointsRules.length - 1 ? 0 : 1 
                                        }
                                    ]}
                                >
                                    <View style={[{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 10, flex: 1 }]}>
                                        <View style={[styles.ruleIconBox, { backgroundColor: rule.color + '1A' }]}>
                                            {rule.isFa5 ? (
                                                <FontAwesome5 name={rule.icon} size={12} color={rule.color} />
                                            ) : (
                                                <Feather name={rule.icon} size={13} color={rule.color} />
                                            )}
                                        </View>
                                        <Text style={[styles.ruleText, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]}>
                                            {rule.text}
                                        </Text>
                                    </View>
                                    <View style={[styles.rulePointsBadge, { backgroundColor: rule.color + '18' }]}>
                                        <Text style={[styles.rulePointsText, { color: rule.color }]}>
                                            +{rule.pts} ✦
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* 2. 10-Tier RPG Levels */}
                        <View style={[{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 8, marginBottom: 12 }]}>
                            <FontAwesome5 name="award" size={16} color={COLORS.gold || '#F59E0B'} />
                            <Text style={[styles.faqSectionTitle, { color: COLORS.gold || '#F59E0B' }]}>
                                {t('gamification_levels_title', language)}
                            </Text>
                        </View>
                        <View style={{ gap: 8, marginBottom: 24 }}>
                            {USER_LEVELS.map((lvl) => {
                                const localizedName = lvl.nameKey ? (t(lvl.nameKey, language) || lvl.name) : lvl.name;
                                const isFinal = lvl.id === 10;
                                return (
                                    <View 
                                        key={lvl.id} 
                                        style={[
                                            styles.levelRow, 
                                            { 
                                                flexDirection: rtl.flexDirection, 
                                                backgroundColor: isFinal ? (COLORS.gold || '#F59E0B') + '12' : COLORS.card, 
                                                borderColor: isFinal ? (COLORS.gold || '#F59E0B') + '50' : COLORS.border,
                                                borderWidth: isFinal ? 1.2 : 0.8,
                                            }
                                        ]}
                                    >
                                        <View style={[{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 10 }]}>
                                            <View style={[styles.levelIconBox, { backgroundColor: (isFinal ? COLORS.gold : COLORS.accentGreen) + '1A' }]}>
                                                <FontAwesome5 name={lvl.icon} size={13} color={isFinal ? (COLORS.gold || '#F59E0B') : COLORS.accentGreen} />
                                            </View>
                                            <Text style={[styles.levelNameText, { color: isFinal ? (COLORS.gold || '#F59E0B') : COLORS.textPrimary, fontFamily: isFinal ? 'Tajawal-ExtraBold' : 'Tajawal-Bold' }]}>
                                                {localizedName}
                                            </Text>
                                        </View>
                                        <Text style={[styles.levelPointsText, { color: isFinal ? (COLORS.gold || '#F59E0B') : COLORS.textSecondary }]}>
                                            {lvl.minPoints.toLocaleString()} ✦
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* 3. FAQ */}
                        <View style={[{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 8, marginBottom: 12 }]}>
                            <Feather name="help-circle" size={16} color={COLORS.gold || '#F59E0B'} />
                            <Text style={[styles.faqSectionTitle, { color: COLORS.gold || '#F59E0B' }]}>
                                {t('gamification_how_it_works', language)}
                            </Text>
                        </View>
                        <View style={{ gap: 10 }}>
                            {faqs.map((faq, idx) => (
                                <View key={idx} style={[styles.faqCard, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                                    <Text style={[styles.faqQuestion, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]}>
                                        {faq.q}
                                    </Text>
                                    <Text style={[styles.faqAnswer, { color: COLORS.textSecondary, textAlign: rtl.textAlign }]}>
                                        {faq.a}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

// ============================================================================
//                       MAIN LEADERBOARD COMPONENT
// ============================================================================

const LeaderboardModal = ({ visible, onClose, currentUser, onUserPress, adminUid = null }) => {
    const { theme, colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const isDark = theme?.isDark ?? true;
    const language = useCurrentLanguage();
    const rtl = useRTL();

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const bubblePulseAnim = useRef(new Animated.Value(0)).current;

    const [leaders, setLeaders] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const [myEntry, setMyEntry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showFaqModal, setShowFaqModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (visible) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(bubblePulseAnim, { toValue: -4, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(bubblePulseAnim, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                ])
            ).start();
        }
    }, [visible, bubblePulseAnim]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onClose());
    };

    // 🌟 ZERO DELAY: PanResponder only activates on downward movement (never blocks taps)
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false, // 👈 Ensures taps fire instantly
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 12, // 👈 Only handles drag gesture
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 120 || gestureState.vy > 0.8) {
                    handleClose();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        friction: 9,
                        tension: 50,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            setLoading(true);
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
            fetchLeaderboard();
        }
    }, [visible]);

    const EXCLUDED_UID = adminUid;
    const LEADERBOARD_CACHE_TTL = 3 * 60 * 1000;

    const leaderboardCache = useRef({
        top10: null,
        myEntryMap: {},
        lastFetchedAt: 0,
    }).current;

    const fetchLeaderboard = useCallback(async (forceRefresh = false) => {
        const now = Date.now();
        const isCacheValid = !forceRefresh && leaderboardCache.top10 && (now - leaderboardCache.lastFetchedAt < LEADERBOARD_CACHE_TTL);

        if (isCacheValid) {
            setLeaders(leaderboardCache.top10);
            if (currentUser?.uid && currentUser.uid !== EXCLUDED_UID) {
                const userInTop = leaderboardCache.top10.find(u => u.uid === currentUser.uid);
                if (userInTop) {
                    setMyRank(userInTop.rank);
                    setMyEntry(userInTop);
                } else if (leaderboardCache.myEntryMap[currentUser.uid]) {
                    const cached = leaderboardCache.myEntryMap[currentUser.uid];
                    setMyRank(cached.rank);
                    setMyEntry(cached.myEntry);
                }
            } else {
                setMyRank(null);
                setMyEntry(null);
            }
            setLoading(false);
            return;
        }

        try {
            const q = query(
                collection(db, 'profiles'),
                orderBy('points', 'desc'),
                limit(20)
            );
            const snap = await getDocs(q);
            const validDocs = snap.docs.filter(d => d.id !== EXCLUDED_UID);

            const top10 = validDocs.slice(0, 10).map((d, i) => ({
                uid: d.id,
                rank: i + 1,
                points: d.data().points || 0,
                settings: d.data().settings || {},
                name: d.data().name || d.data().settings?.name || null,
                isFirstGen: d.data().isFirstGen === true,
            }));
            setLeaders(top10);

            let computedRank = null;
            let computedEntry = null;

            if (currentUser?.uid && currentUser.uid !== EXCLUDED_UID) {
                const userInTop = top10.find(u => u.uid === currentUser.uid);
                if (userInTop) {
                    computedRank = userInTop.rank;
                    computedEntry = userInTop;
                    setMyRank(computedRank);
                    setMyEntry(computedEntry);
                } else {
                    const userRef = doc(db, 'profiles', currentUser.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        const myPoints = userData.points || 0;

                        const rankCountQuery = query(
                            collection(db, 'profiles'),
                            where('points', '>', myPoints)
                        );
                        const countSnap = await getCountFromServer(rankCountQuery);
                        let higherCount = countSnap.data().count || 0;

                        if (EXCLUDED_UID) {
                            const adminDoc = snap.docs.find(d => d.id === EXCLUDED_UID);
                            if (adminDoc && (adminDoc.data().points || 0) > myPoints) {
                                higherCount = Math.max(0, higherCount - 1);
                            }
                        }

                        computedRank = higherCount + 1;
                        computedEntry = {
                            uid: currentUser.uid,
                            rank: computedRank,
                            points: myPoints,
                            settings: userData.settings || {},
                            name: userData.name || userData.settings?.name || null,
                            isFirstGen: userData.isFirstGen === true || currentUser?.isFirstGen === true,
                        };
                        setMyRank(computedRank);
                        setMyEntry(computedEntry);
                    }
                }
            } else {
                setMyRank(null);
                setMyEntry(null);
            }

            leaderboardCache.top10 = top10;
            leaderboardCache.lastFetchedAt = now;
            if (currentUser?.uid && computedEntry) {
                leaderboardCache.myEntryMap[currentUser.uid] = { rank: computedRank, myEntry: computedEntry };
            }
        } catch (e) {
            console.error('[Leaderboard] Fetch error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [currentUser?.uid, EXCLUDED_UID, leaderboardCache]);

    const podium = useMemo(() => {
        if (leaders.length < 3) return leaders;
        return [leaders[1], leaders[0], leaders[2]];
    }, [leaders]);

    const podiumRankOrder = [2, 1, 3];
    const restList = leaders.slice(3);

    const isCurrentUser = (uid) => uid === currentUser?.uid;

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
            <View style={styles.modalRoot}>
                {/* Backdrop Fade */}
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.75)', opacity: backdropAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                {/* Main Sheet */}
                <Animated.View style={[styles.modalSheet, { backgroundColor: COLORS.background, transform: [{ translateY: slideAnim }] }]}>
                    
                    {/* Top Drag Handle */}
                    <View {...panResponder.panHandlers} style={styles.dragHandleBar}>
                        <View style={[styles.dragHandle, { backgroundColor: COLORS.border }]} />
                    </View>

                    {/* Header */}
                    <View style={[styles.headerContainer, { borderBottomColor: COLORS.border, flexDirection: rtl.flexDirection }]}>
                        <View style={[{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 10 }]}>
                            <View style={[styles.trophyIconBox, { backgroundColor: (COLORS.gold || '#F59E0B') + '1A', borderColor: (COLORS.gold || '#F59E0B') + '40' }]}>
                                <FontAwesome5 name="trophy" size={18} color={COLORS.gold || '#F59E0B'} />
                            </View>
                            <View>
                                <Text style={[styles.headerTitleText, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]}>
                                    {t('leaderboard_title', language)}
                                </Text>
                                <Text style={[styles.headerSubText, { color: COLORS.textSecondary, textAlign: rtl.textAlign }]}>
                                    {t('leaderboard_subtitle', language)}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={{ padding: 6 }}>
                            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.gold || '#F59E0B'} />
                            <Text style={[styles.loadingText, { color: COLORS.textSecondary }]}>
                                {t('leaderboard_loading', language)}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={restList}
                            keyExtractor={(item) => item.uid}
                            refreshing={refreshing}
                            onRefresh={() => {
                                setRefreshing(true);
                                fetchLeaderboard(true);
                            }}
                            contentContainerStyle={{ paddingBottom: myEntry ? 120 : 40 }}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={
                                <View>
                                    {/* 🌟 INSTANT RESPONSE FAQ BUTTON 🌟 */}
                                    <View style={{ alignItems: 'center', marginTop: 14, marginBottom: 8 }}>
                                        <Animated.View style={{ transform: [{ translateY: bubblePulseAnim }] }}>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    Haptics.selectionAsync().catch(() => {});
                                                    setShowFaqModal(true);
                                                }}
                                                activeOpacity={0.7}
                                                style={[
                                                    styles.faqBubbleBtn, 
                                                    { 
                                                        flexDirection: rtl.flexDirection, 
                                                        backgroundColor: COLORS.card, 
                                                        borderColor: (COLORS.gold || '#F59E0B') + '50' 
                                                    }
                                                ]}
                                            >
                                                <Feather name="help-circle" size={16} color={COLORS.gold || '#F59E0B'} />
                                                <Text style={[styles.faqBubbleText, { color: COLORS.gold || '#F59E0B' }]}>
                                                    {t('gamification_hint_bubble', language)}
                                                </Text>
                                            </TouchableOpacity>
                                        </Animated.View>
                                    </View>

                                    {/* Podium (Top 3) */}
                                    {leaders.length >= 3 ? (
                                        <View style={[styles.podiumContainer, { flexDirection: 'row' }]}>
                                            {podium.map((entry, i) => (
                                                <PodiumCard
                                                    key={entry.uid}
                                                    entry={entry}
                                                    rank={podiumRankOrder[i]}
                                                    COLORS={COLORS}
                                                    isDark={isDark}
                                                    language={language}
                                                    onPress={() => onUserPress(entry.uid, entry)}
                                                />
                                            ))}
                                        </View>
                                    ) : null}
                                </View>
                            }
                            renderItem={({ item }) => (
                                <RankedRow
                                    entry={item}
                                    rank={item.rank}
                                    COLORS={COLORS}
                                    isDark={isDark}
                                    language={language}
                                    rtl={rtl}
                                    isCurrentUser={isCurrentUser(item.uid)}
                                    onPress={() => onUserPress(item.uid, item)}
                                />
                            )}
                            ListEmptyComponent={restList.length === 0 && !loading ? (
                                <View style={{ alignItems: 'center', marginTop: 30 }}>
                                    <Text style={{ fontFamily: 'Tajawal-Regular', color: COLORS.textDim }}>
                                        {t('leaderboard_empty', language)}
                                    </Text>
                                </View>
                            ) : null}
                        />
                    )}

                    {/* Sticky Bottom Rank Bar for Signed-In User */}
                    {!loading && myEntry && (
                        <View style={[styles.myRankBar, { backgroundColor: COLORS.card, borderTopColor: COLORS.accentGreen }]}>
                            <View style={[styles.myRankPillHeader, { backgroundColor: COLORS.accentGreen + '18' }]}>
                                <Text style={[styles.myRankHeaderText, { color: COLORS.accentGreen }]}>
                                    {t('leaderboard_your_rank', language)}
                                </Text>
                            </View>
                            <RankedRow
                                entry={myEntry}
                                rank={myEntry.rank}
                                COLORS={COLORS}
                                isDark={isDark}
                                language={language}
                                rtl={rtl}
                                isCurrentUser={true}
                                onPress={() => onUserPress(myEntry.uid, myEntry)}
                            />
                        </View>
                    )}

                    <GamificationFaqModal
                        visible={showFaqModal}
                        onClose={() => setShowFaqModal(false)}
                        COLORS={COLORS}
                        language={language}
                        rtl={rtl}
                    />
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalSheet: {
        height: SCREEN_HEIGHT * 0.90,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    dragHandleBar: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
        width: '100%',
    },
    dragHandle: {
        width: 44,
        height: 4.5,
        borderRadius: 10,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 14,
        paddingTop: 4,
        borderBottomWidth: 0.8,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    trophyIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.8,
    },
    headerTitleText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 20, // Increased font size
    },
    headerSubText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12.5,
        marginTop: 1,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
    },
    faqBubbleBtn: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 0.8,
        gap: 8,
    },
    faqBubbleText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12.5,
    },
    podiumContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingTop: 10,
        paddingHorizontal: 12,
        paddingBottom: 8,
        gap: 4,
    },
    rankedRowContainer: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.8,
    },
    rankedRowMeta: {
        flex: 1,
        marginHorizontal: 12,
    },
    myRankBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 2,
        paddingBottom: Platform.OS === 'ios' ? 26 : 8,
        elevation: 8,
    },
    myRankPillHeader: {
        paddingVertical: 3.5,
        alignItems: 'center',
    },
    myRankHeaderText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 11,
    },

    // 🌟 1ج PIN STYLES
    firstGenAvatarPin: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.2,
        overflow: 'hidden',
    },
    firstGenPinGradient: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    firstGenPinText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 7.5,
        color: '#FFF',
    },

    // FAQ Sheet Styles
    faqHeader: {
        paddingTop: 18,
        paddingBottom: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 0.8,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.8,
    },
    faqTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
    },
    faqSubtitle: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
    },
    faqSectionTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
    },
    rulesCard: {
        borderRadius: 18,
        padding: 12,
        borderWidth: 0.8,
        marginBottom: 20,
    },
    ruleRow: {
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 9,
    },
    ruleIconBox: {
        width: 28,
        height: 28,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ruleText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13.5,
    },
    rulePointsBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 8,
    },
    rulePointsText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 12,
    },
    levelRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
    },
    levelIconBox: {
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    levelNameText: {
        fontSize: 14,
    },
    levelPointsText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 12.5,
    },
    faqCard: {
        padding: 14,
        borderRadius: 16,
        borderWidth: 0.8,
    },
    faqQuestion: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        marginBottom: 4,
    },
    faqAnswer: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12.5,
        lineHeight: 19,
    },
});

export default LeaderboardModal;