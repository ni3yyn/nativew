import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, Modal, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, Animated, Dimensions, Easing, Pressable
} from 'react-native';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, collection, query, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import WathiqScoreBadge from '../common/WathiqScoreBadge';
import { calculateBioMatch } from '../../utils/matchCalculator';
import { getCachedUserProfile, cacheUserProfile } from '../../services/cachingService';
import { getUserLevelData } from '../../utils/gamificationEngine'; 

// --- i18n TRANSLATIONS & RTL ---
import { t, getLocalizedValue } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- DATA IMPORTS ---
import {
    commonAllergies,
    commonConditions,
    basicSkinTypes,
    basicScalpTypes
} from '../../data/allergiesandconditions';

// 🟢 PLACEHOLDER DUOLINGO BADGES 
const PLACEHOLDER_BADGES =[
    { id: 'inci_hunter', name: { ar: 'صائد المكونات', en: 'INCI Hunter' }, icon: 'flask', color: '#9C27B0', currentLevel: 3, currentScore: 45, nextTarget: 50, progressPercent: 90, isMaxed: false },
    { id: 'community_star', name: { ar: 'نجم المجتمع', en: 'Community Star' }, icon: 'users', color: '#03A9F4', currentLevel: 1, currentScore: 2, nextTarget: 5, progressPercent: 40, isMaxed: false },
    { id: 'shelf_founder', name: { ar: 'مؤسس الرف', en: 'Shelf Founder' }, icon: 'box-open', color: '#FF9800', currentLevel: 5, currentScore: 20, nextTarget: null, progressPercent: 100, isMaxed: true },
    { id: 'first_blood', name: { ar: 'الخطوة الأولى', en: 'First Blood' }, icon: 'shoe-prints', color: '#8BC34A', currentLevel: 1, currentScore: 1, nextTarget: null, progressPercent: 100, isMaxed: true }
];

const SHELF_CACHE_DURATION = 24 * 60 * 60 * 1000;

// --- MICRO-COMPONENTS FOR ANIMATIONS ---
const ShimmerBlock = ({ width, height, borderRadius, style, colors }) => {
    const anim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        Animated.loop(
            Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
        ).start();
    },[]);
    
    const translateX = anim.interpolate({ inputRange:[0, 1], outputRange:[-SCREEN_WIDTH, SCREEN_WIDTH] });
    
    return (
        <View style={[{ width, height, borderRadius, backgroundColor: colors.card, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }, style]}>
            <Animated.View style={{ ...StyleSheet.absoluteFillObject, transform: [{ translateX }] }}>
                <LinearGradient colors={['transparent', colors.textDim + '20', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
            </Animated.View>
        </View>
    );
};

const AnimatedBadgeCard = ({ badge, COLORS, styles, language }) => {
    const progressAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(progressAnim, { toValue: badge.progressPercent, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false, delay: 400 }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true, delay: 200 })
        ]).start();
    },[]);

    const widthInterpolation = progressAnim.interpolate({ inputRange:[0, 100], outputRange:['0%', '100%'] });
    const badgeName = getLocalizedValue(badge.name, language);

    return (
        <Animated.View style={[styles.compactDuolingoCard, { backgroundColor: COLORS.card, borderColor: COLORS.border, transform:[{ scale: scaleAnim }] }]}>
            <View style={styles.badgeHeader}>
                <View style={[styles.badgeIconBg, { backgroundColor: badge.color + '15', borderColor: badge.color + '40' }]}>
                    <FontAwesome5 name={badge.icon} size={18} color={badge.color} />
                    <View style={[styles.levelIndicator, { backgroundColor: badge.color, borderColor: COLORS.card }]}>
                        <Text style={styles.levelText}>Lvl {badge.currentLevel}</Text>
                    </View>
                </View>
                <Text style={[styles.badgeName, { color: COLORS.textPrimary }]} numberOfLines={1}>{badgeName}</Text>
            </View>
            <View style={styles.compactProgress}>
                <View style={[styles.progressBarTrack, { backgroundColor: COLORS.border }]}>
                    <Animated.View style={[styles.progressBarFill, { width: widthInterpolation, backgroundColor: badge.color }]} />
                </View>
                <Text style={[styles.progressText, { color: COLORS.textDim }]}>
                    {badge.isMaxed ? t('action_finish', language) : `${badge.currentScore}/${badge.nextTarget}`}
                </Text>
            </View>
        </Animated.View>
    );
};

// --- MAIN COMPONENT ---
const UserProfileModal = ({ visible, onClose, targetUserId, initialData, currentUser, onProductSelect }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    
    const language = useCurrentLanguage();
    const rtl = useRTL();
    const styles = useMemo(() => createStyles(COLORS, rtl), [COLORS, rtl]);
    
    const[profile, setProfile] = useState({ settings: initialData?.settings || initialData || {}, points: initialData?.points || 0 });
    const [publicShelf, setPublicShelf] = useState([]);
    const[loading, setLoading] = useState(true); 
    const [matchInfo, setMatchInfo] = useState({ score: 0, label: '', color: COLORS.textSecondary });
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Animations
    const animState = useRef(new Animated.Value(0)).current;
    const heroAnim = useRef(new Animated.Value(0)).current;
    const vitalAnim = useRef(new Animated.Value(0)).current;
    const badgesAnim = useRef(new Animated.Value(0)).current;
    const shelfAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const isMe = currentUser?.uid === targetUserId?.id || currentUser?.uid === targetUserId;

    // Entrance Physics for the Modal
    useEffect(() => {
        if (visible) {
            Animated.spring(animState, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(animState, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    // Data loading & inner staggered animations
    useEffect(() => {
        if (!visible || !targetUserId) return;

        const userIdString = typeof targetUserId === 'object' ? targetUserId.id : targetUserId;

        setPublicShelf([]);
        [heroAnim, vitalAnim, badgesAnim, shelfAnim].forEach(anim => anim.setValue(0));
        
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
            ])
        ).start();

        const loadData = async () => {
            setLoading(true);
            try {
                const cachedData = await getCachedUserProfile(userIdString);
                const now = Date.now();

                let finalProfile = profile;
                let finalShelf =[];

                if (cachedData && (now - (cachedData.timestamp || 0) < SHELF_CACHE_DURATION)) {
                    finalProfile = { settings: cachedData.profile?.settings || {}, points: cachedData.profile?.points || 0 };
                    finalShelf = cachedData.shelf ||[];
                } else {
                    const profileRef = doc(db, 'profiles', userIdString);
                    const profileSnap = await getDoc(profileRef);
                    if (profileSnap.exists()) {
                        const data = profileSnap.data();
                        const freshSettings = data.settings || data;
                        if (data.name && !freshSettings.name) freshSettings.name = data.name;
                        finalProfile = { settings: freshSettings, points: data.points || 0 };
                    }
                    const q = query(collection(db, 'profiles', userIdString, 'savedProducts'), orderBy('createdAt', 'desc'), limit(5));
                    const snapshot = await getDocs(q);
                    finalShelf = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    await cacheUserProfile(userIdString, finalProfile, finalShelf);
                }

                setProfile(finalProfile);
                setPublicShelf(finalShelf);
                if (currentUser?.settings && finalProfile.settings) {
                    setMatchInfo(calculateBioMatch(currentUser.settings, finalProfile.settings));
                }
            } catch (e) { 
                console.error("Profile Fetch Error", e); 
            } finally {
                setLoading(false);
                Animated.stagger(120,[
                    Animated.spring(heroAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
                    Animated.spring(vitalAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
                    Animated.spring(badgesAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
                    Animated.spring(shelfAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true })
                ]).start();
            }
        };

        setTimeout(loadData, 300); 
    },[visible, targetUserId]);

    const handleManualRefresh = async () => {
        const uid = typeof targetUserId === 'object' ? targetUserId.id : targetUserId;
        if (!uid) return;
        setIsRefreshing(true);
        try {
            const profileRef = doc(db, 'profiles', uid);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                const data = profileSnap.data();
                const freshSettings = data.settings || data;
                if (data.name && !freshSettings.name) freshSettings.name = data.name;
                
                const freshProfileObj = { settings: freshSettings, points: data.points || 0 };
                setProfile(freshProfileObj);

                if (currentUser?.settings) {
                    setMatchInfo(calculateBioMatch(currentUser.settings, freshSettings));
                }

                const q = query(collection(db, 'profiles', uid, 'savedProducts'), orderBy('createdAt', 'desc'), limit(5));
                const shelfSnap = await getDocs(q);
                const freshShelf = shelfSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                setPublicShelf(freshShelf);
                cacheUserProfile(uid, freshProfileObj, freshShelf);
            }
        } catch (error) { console.error(error); } finally { setIsRefreshing(false); }
    };

    const getLabel = (id, list) => { 
        const item = list.find(i => i.id === id); 
        if (!item) return id;
        return getLocalizedValue(item.label || item.name, language) || id; 
    };

    const getGoalLabel = (id) => {
        const map = {
            brightening: 'goal_brightening',
            acne: 'goal_acne',
            anti_aging: 'goal_anti_aging',
            hydration: 'goal_hydration',
            texture_pores: 'goal_texture'
        };
        return map[id] ? t(map[id], language) : id;
    };
    
    const handleProductPress = (item) => { 
        if (onProductSelect) { 
            Animated.timing(animState, {
                toValue: 0,
                duration: 300,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            }).start(() => {
                onClose(); 
                onProductSelect({ ...item, imageUrl: item.productImage }); 
            });
        } 
    };

    const levelData = getUserLevelData ? getUserLevelData(profile.points || 0) : { currentLevel: { name: 'Level', color: COLORS.accentGreen, icon: 'star' } };
    const currentLevel = levelData.currentLevel;

    const getSlideStyle = (anim) => ({
        opacity: anim,
        transform:[{ translateY: anim.interpolate({ inputRange:[0, 1], outputRange:[40, 0] }) }]
    });

    const renderCompactTagRow = (data, list, icon, color, title, isGoal = false) => {
        if (!data || data.length === 0) return null;
        return (
            <View style={styles.compactTagRow}>
                <View style={styles.compactTagHeader}>
                    <FontAwesome5 name={icon} size={12} color={color} />
                    <Text style={[styles.compactTagLabel, { color: COLORS.textSecondary }]}>{title}</Text>
                </View>
                <View style={styles.compactChipContainer}>
                    {data.map(item => (
                        <View key={item} style={[styles.microChip, { borderColor: color + '40', backgroundColor: color + '10' }]}>
                            <Text style={[styles.microChipText, { color }]}>
                                {isGoal ? getGoalLabel(item) : getLabel(item, list)}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const overlayOpacity = animState.interpolate({ inputRange:[0, 1], outputRange: [0, 1] });
    const modalTranslateY = animState.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] });

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
            <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                <Animated.View style={[styles.container, { transform: [{ translateY: modalTranslateY }] }]}>
                    
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
                            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{t('community_profile_title', language)}</Text>
                        <TouchableOpacity onPress={handleManualRefresh} disabled={loading || isRefreshing} style={styles.iconBtn}>
                            {isRefreshing ? <ActivityIndicator size="small" color={COLORS.accentGreen} /> : <Ionicons name="refresh" size={20} color={COLORS.textPrimary} />}
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.scrollContent}>
                            <ShimmerBlock width="100%" height={120} borderRadius={24} style={{ marginBottom: 20 }} colors={COLORS} />
                            <ShimmerBlock width="30%" height={20} borderRadius={10} style={{ alignSelf: rtl.alignSelf, marginBottom: 15 }} colors={COLORS} />
                            <ShimmerBlock width="100%" height={140} borderRadius={24} style={{ marginBottom: 20 }} colors={COLORS} />
                            <ShimmerBlock width="40%" height={20} borderRadius={10} style={{ alignSelf: rtl.alignSelf, marginBottom: 15 }} colors={COLORS} />
                            <View style={{ flexDirection: rtl.flexDirection, gap: 12 }}>
                                <ShimmerBlock width={150} height={80} borderRadius={20} colors={COLORS} />
                                <ShimmerBlock width={150} height={80} borderRadius={20} colors={COLORS} />
                            </View>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={true}>
                            
                            <Animated.View style={getSlideStyle(heroAnim)}>
                                <LinearGradient
                                    colors={[currentLevel.color + '15', COLORS.card]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={[styles.heroBento, { borderColor: currentLevel.color + '30' }]}
                                >
                                    <View style={styles.heroRow}>
                                        <View style={styles.heroInfo}>
                                            <Text style={styles.userName} numberOfLines={1}>{profile?.settings?.name || t('community_default_user', language)}</Text>
                                            <View style={[styles.rankPill, { backgroundColor: currentLevel.color + '20', borderColor: currentLevel.color + '40' }]}>
                                                <FontAwesome5 name={currentLevel.icon} size={10} color={currentLevel.color} />
                                                <Text style={[styles.rankText, { color: currentLevel.color }]}>{currentLevel.name}</Text>
                                                <Text style={[styles.pointsText, { color: COLORS.textSecondary }]}>• {profile.points || 0} {t('catalog_points', language)}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.avatarWrapper}>
                                            <Animated.View style={[styles.avatarGlow, { borderColor: currentLevel.color, transform: [{ scale: pulseAnim }] }]} />
                                            <View style={[styles.avatar, { backgroundColor: COLORS.background }]}>
                                                <Text style={[styles.avatarText, { color: currentLevel.color }]}>
                                                    {profile?.settings?.name ? profile.settings.name.charAt(0).toUpperCase() : 'U'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                    {!isMe && matchInfo.score > 0 && (
                                        <View style={[styles.matchBanner, { backgroundColor: matchInfo.color + '10', borderColor: matchInfo.color + '30' }]}>
                                            <MaterialCommunityIcons name="heart-pulse" size={16} color={matchInfo.color} />
                                            <Text style={[styles.matchText, { color: matchInfo.color }]}>
                                                {getLocalizedValue(matchInfo.label, language)} • {matchInfo.score}%
                                            </Text>
                                        </View>
                                    )}
                                </LinearGradient>
                            </Animated.View>

                            <Animated.View style={[styles.bentoSection, getSlideStyle(vitalAnim)]}>
                                <Text style={styles.sectionTitle}>{t('community_profile_traits', language)}</Text>
                                <View style={[styles.unifiedBox, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                                    
                                    <View style={styles.vitalRow}>
                                        <View style={styles.vitalItem}>
                                            <View style={[styles.vitalIcon, { backgroundColor: COLORS.gold + '15' }]}><FontAwesome5 name="user-alt" size={14} color={COLORS.gold} /></View>
                                            <View>
                                                <Text style={[styles.vitalSub, { color: COLORS.textSecondary }]}>{t('community_profile_skin', language)}</Text>
                                                <Text style={[styles.vitalMain, { color: COLORS.textPrimary }]}>{getLabel(profile?.settings?.skinType, basicSkinTypes) || t('community_unspecified', language)}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.vitalDivider, { backgroundColor: COLORS.border }]} />
                                        <View style={styles.vitalItem}>
                                            <View style={[styles.vitalIcon, { backgroundColor: COLORS.blue + '15' }]}><FontAwesome5 name="cut" size={14} color={COLORS.blue} /></View>
                                            <View>
                                                <Text style={[styles.vitalSub, { color: COLORS.textSecondary }]}>{t('community_profile_hair', language)}</Text>
                                                <Text style={[styles.vitalMain, { color: COLORS.textPrimary }]}>{getLabel(profile?.settings?.scalpType, basicScalpTypes) || t('community_unspecified', language)}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    {(profile?.settings?.goals?.length > 0 || profile?.settings?.conditions?.length > 0 || profile?.settings?.allergies?.length > 0) && (
                                        <View style={[styles.tagsArea, { borderTopColor: COLORS.border }]}>
                                            {renderCompactTagRow(profile.settings.goals, null, 'crosshairs', COLORS.accentGreen, t('settings_goals_title', language), true)}
                                            {renderCompactTagRow(profile.settings.conditions, commonConditions, 'notes-medical', COLORS.gold, t('settings_conditions_title', language))}
                                            {renderCompactTagRow(profile.settings.allergies, commonAllergies, 'exclamation-circle', COLORS.danger, t('settings_allergies_title', language))}
                                        </View>
                                    )}

                                </View>
                            </Animated.View>

                            <Animated.View style={[styles.bentoSection, getSlideStyle(badgesAnim)]}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>الأوسمة (قريبا جدا) </Text>
                                    <Text style={[styles.countBadge, { color: COLORS.textSecondary, backgroundColor: COLORS.card, borderColor: COLORS.border }]}>{PLACEHOLDER_BADGES.length}</Text>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesHScroll} snapToInterval={162} decelerationRate="fast">
                                    {PLACEHOLDER_BADGES.map((badge) => (
                                        <AnimatedBadgeCard key={badge.id} badge={badge} COLORS={COLORS} styles={styles} language={language} />
                                    ))}
                                </ScrollView>
                            </Animated.View>

                            <Animated.View style={[styles.bentoSection, { marginBottom: 10 }, getSlideStyle(shelfAnim)]}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>{t('profile_header_shelf', language)}</Text>
                                    <Text style={[styles.countBadge, { color: COLORS.textSecondary, backgroundColor: COLORS.card, borderColor: COLORS.border }]}>{publicShelf.length}</Text>
                                </View>

                                {publicShelf.length > 0 ? (
                                    <View style={[styles.shelfContainer, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                                        {publicShelf.map((item, index) => (
                                            <TouchableOpacity key={item.id} style={[styles.shelfItemCompact, { borderBottomColor: index === publicShelf.length - 1 ? 'transparent' : COLORS.background }]} onPress={() => handleProductPress(item)} activeOpacity={0.7}>
                                                
                                                <WathiqScoreBadge score={item.analysisData?.oilGuardScore || 0} size={42} />
                                                
                                                <View style={styles.shelfItemInfo}>
                                                    <Text style={[styles.prodName, { color: COLORS.textPrimary }]} numberOfLines={1}>{item.productName}</Text>
                                                    <Text style={[styles.prodVerdict, { color: COLORS.textSecondary }]} numberOfLines={1}>
                                                        {getLocalizedValue(item.analysisData?.finalVerdict, language) || t('common_product', language)}
                                                    </Text>
                                                </View>
                                                <Feather name={rtl.isRTL ? "chevron-left" : "chevron-right"} size={18} color={COLORS.textDim} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={[styles.emptyShelfBox, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                                        <Feather name="layers" size={28} color={COLORS.textDim} style={{ opacity: 0.5 }} />
                                        <Text style={[styles.emptyText, { color: COLORS.textDim }]}>{t('community_profile_empty_shelf', language)}</Text>
                                    </View>
                                )}
                            </Animated.View>

                        </ScrollView>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const createStyles = (COLORS, rtl) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    container: { 
        height: SCREEN_HEIGHT * 0.93,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        backgroundColor: COLORS.background 
    },
    header: { flexDirection: rtl.flexDirection, justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18, color: COLORS.textPrimary },
    iconBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    scrollContent: { padding: 16, paddingBottom: 50 },

    heroBento: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 24 },
    heroRow: { flexDirection: rtl.flexDirection, alignItems: 'center', justifyContent: 'space-between' },
    heroInfo: { flex: 1, marginStart: 15 },
    userName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24, textAlign: rtl.textAlign, marginBottom: 6, color: COLORS.textPrimary },
    rankPill: { flexDirection: rtl.flexDirection, alignItems: 'center', gap: 6, alignSelf: rtl.alignSelf, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
    rankText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    pointsText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    
    avatarWrapper: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
    avatarGlow: { position: 'absolute', width: 78, height: 78, borderRadius: 39, borderWidth: 2, opacity: 0.4 },
    avatar: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    avatarText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 30 },
    
    matchBanner: { flexDirection: rtl.flexDirection, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 14, borderWidth: 1, marginTop: 15 },
    matchText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },

    bentoSection: { marginBottom: 20 },
    sectionHeaderRow: { flexDirection: rtl.flexDirection, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, textAlign: rtl.textAlign, color: COLORS.textPrimary },
    countBadge: { fontFamily: 'Tajawal-Bold', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },

    unifiedBox: { borderRadius: 24, padding: 16, borderWidth: 1 },
    vitalRow: { flexDirection: rtl.flexDirection, alignItems: 'center', justifyContent: 'space-between' },
    vitalItem: { flex: 1, flexDirection: rtl.flexDirection, alignItems: 'center', gap: 12 },
    vitalIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    vitalSub: { fontFamily: 'Tajawal-Regular', fontSize: 11, textAlign: rtl.textAlign },
    vitalMain: { fontFamily: 'Tajawal-Bold', fontSize: 14, textAlign: rtl.textAlign },
    vitalDivider: { width: 1, height: 40, marginHorizontal: 15 },
    
    tagsArea: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, gap: 10 },
    compactTagRow: { flexDirection: rtl.flexDirection, alignItems: 'flex-start' },
    compactTagHeader: { width: 70, flexDirection: rtl.flexDirection, alignItems: 'center', gap: 6, marginTop: 4 },
    compactTagLabel: { fontFamily: 'Tajawal-Regular', fontSize: 11 },
    compactChipContainer: { flex: 1, flexDirection: rtl.flexDirection, flexWrap: 'wrap', gap: 6 },
    microChip: { left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    microChipText: { fontFamily: 'Tajawal-Bold', fontSize: 10 },

    badgesHScroll: { gap: 12, paddingVertical: 5 },
    compactDuolingoCard: { width: 150, borderRadius: 20, padding: 14, borderWidth: 1, marginEnd: 12 },
    badgeHeader: { flexDirection: rtl.flexDirection, alignItems: 'center', gap: 10, marginBottom: 12 },
    badgeIconBg: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    levelIndicator: { position: 'absolute', bottom: -6, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6, borderWidth: 1 },
    levelText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 8, color: '#FFF' },
    badgeName: { flex: 1, fontFamily: 'Tajawal-Bold', fontSize: 12, textAlign: rtl.textAlign },
    
    compactProgress: { flexDirection: rtl.flexDirection, alignItems: 'center', gap: 8 },
    progressBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3 },
    progressText: { fontFamily: 'Tajawal-Bold', fontSize: 10 },

    shelfContainer: { borderRadius: 24, padding: 10, borderWidth: 1 },
    shelfItemCompact: { flexDirection: rtl.flexDirection, alignItems: 'center', padding: 10, borderBottomWidth: 1 },
    shelfItemInfo: { flex: 1, marginEnd: 12, marginStart: 12 },
    prodName: { fontFamily: 'Tajawal-Bold', fontSize: 13, textAlign: rtl.textAlign, marginBottom: 2 },
    prodVerdict: { fontFamily: 'Tajawal-Regular', fontSize: 11, textAlign: rtl.textAlign },

    emptyShelfBox: { alignItems: 'center', padding: 25, borderRadius: 24, borderWidth: 1, borderStyle: 'dashed' },
    emptyText: { fontFamily: 'Tajawal-Regular', textAlign: 'center', marginTop: 10, fontSize: 13 }
});

export default UserProfileModal;