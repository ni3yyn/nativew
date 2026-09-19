import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View, Text, Modal, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, Animated, Dimensions, Easing, Pressable, Image,
    PanResponder, Keyboard
} from 'react-native';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { doc, getDoc, collection, query, limit, getDocs, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import WathiqScoreBadge from '../common/WathiqScoreBadge';
import { calculateBioMatch } from '../../utils/matchCalculator';
import { getCachedUserProfile, cacheUserProfile } from '../../services/cachingService';
import { getUserLevelData } from '../../utils/gamificationEngine'; 
import AppTextInput from '../common/AppTextInput';

// 🌟 IMPORT EXISTING AVATAR SELECTION MODAL
import AvatarSelectionModal from '../profile/AvatarSelectionModal';

import { calculateUserBadges } from '../../services/badgesService'; 
import WathiqBadge from './WathiqBadge'; 

import { t, getLocalizedValue, interpolate } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';
import { AVATARS } from '../../constants/avatars';
import { commonAllergies, commonConditions, basicSkinTypes, basicScalpTypes } from '../../data/allergiesandconditions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BADGE_CARD_WIDTH = 142;
const BADGE_GAP = 12;
const BADGE_SNAP = BADGE_CARD_WIDTH + BADGE_GAP; // 154

const ShimmerBlock = ({ width, height, borderRadius, style, colors }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.loop(Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })).start(); }, []);
    const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH] });
    return (
        <View style={[{ width, height, borderRadius, backgroundColor: colors.card, overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border }, style]}>
            <Animated.View style={{ ...StyleSheet.absoluteFillObject, transform: [{ translateX }] }}>
                <LinearGradient colors={['transparent', colors.textDim + '20', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
            </Animated.View>
        </View>
    );
};

const UserProfileModal = ({ visible, onClose, targetUserId, initialData, currentUser, onProductSelect }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const language = useCurrentLanguage();
    const rtl = useRTL();
    const styles = useMemo(() => createStyles(COLORS, rtl), [COLORS, rtl]);
    
    const [profile, setProfile] = useState({ 
        settings: initialData?.settings || initialData || {}, 
        points: initialData?.points || 0,
        pointsHistory: initialData?.pointsHistory || {}
    });
    const [publicShelf, setPublicShelf] = useState([]);
    const [loading, setLoading] = useState(true); 
    const [matchInfo, setMatchInfo] = useState({ score: 0, label: '', color: COLORS.textSecondary });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const badgesScrollRef = useRef(null);
const [activeBadgeIndex, setActiveBadgeIndex] = useState(0);

    // 🌟 EDITING STATES
    const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);

    const animState = useRef(new Animated.Value(0)).current;
    const heroAnim = useRef(new Animated.Value(0)).current;
    const vitalAnim = useRef(new Animated.Value(0)).current;
    const badgesAnim = useRef(new Animated.Value(0)).current;
    const shelfAnim = useRef(new Animated.Value(0)).current;

    const isMe = currentUser?.uid === targetUserId?.id || currentUser?.uid === targetUserId;
    const hasAvatar = Boolean(profile?.settings?.avatarId || profile?.avatarId);


    useEffect(() => {
        if (visible) Animated.spring(animState, { toValue: 1, friction: 9, tension: 50, useNativeDriver: true }).start();
    }, [visible]);

    const handleClose = () => {
        Keyboard.dismiss();
        setIsEditingName(false);
        Animated.timing(animState, { toValue: 0, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true })
            .start(() => onClose());
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) animState.setValue(Math.max(0, 1 - (gestureState.dy / (SCREEN_HEIGHT * 0.5))));
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 110 || gestureState.vy > 0.8) handleClose();
                else Animated.spring(animState, { toValue: 1, friction: 9, tension: 50, useNativeDriver: true }).start();
            },
        })
    ).current;

    useEffect(() => {
        if (!visible || !targetUserId) return;
        const userIdString = typeof targetUserId === 'object' ? targetUserId.id : targetUserId;
        const initialProfileData = initialData || (typeof targetUserId === 'object' ? targetUserId.data : null) || (currentUser?.uid === userIdString ? currentUser : null);

        if (initialProfileData) {
            setProfile({
                settings: initialProfileData.settings || initialProfileData,
                points: initialProfileData.points || 0,
                pointsHistory: initialProfileData.pointsHistory || {},
                isFirstGen: initialProfileData.isFirstGen === true,
                routines: initialProfileData.routines || { am: [], pm: [] }
            });
        }
        setPublicShelf([]);
        [heroAnim, vitalAnim, badgesAnim, shelfAnim].forEach(anim => anim.setValue(0));

        const fetchFreshData = async () => {
            setLoading(true);
            try {
                let freshProfile = profile;
                const profileSnap = await getDoc(doc(db, 'profiles', userIdString));
                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    const freshSettings = data.settings || data;
                    if (data.name && !freshSettings.name) freshSettings.name = data.name;
                    freshProfile = { 
                        settings: freshSettings, 
                        points: data.points || 0, 
                        pointsHistory: data.pointsHistory || {},
                        isFirstGen: data.isFirstGen === true,
                        routines: data.routines || { am: [], pm: [] }
                    };
                }

                const shelfSnap = await getDocs(query(collection(db, 'profiles', userIdString, 'savedProducts'), orderBy('createdAt', 'desc'), limit(15)));
                const freshShelf = shelfSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                await cacheUserProfile(userIdString, freshProfile, freshShelf);
                setProfile(freshProfile);
                setPublicShelf(freshShelf);
                if (currentUser?.settings && freshProfile.settings) {
                    setMatchInfo(calculateBioMatch(currentUser.settings, freshProfile.settings, language));
                }
            } catch (e) { console.error("Profile Fetch Error", e); } 
            finally {
                setLoading(false);
                Animated.stagger(120, [
                    Animated.spring(heroAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
                    Animated.spring(vitalAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
                    Animated.spring(badgesAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
                    Animated.spring(shelfAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true })
                ]).start();
            }
        };
        fetchFreshData(); 
    }, [visible, targetUserId]);

    const handleManualRefresh = async () => {
        const uid = typeof targetUserId === 'object' ? targetUserId.id : targetUserId;
        if (!uid) return;
        setIsRefreshing(true);
        try {
            const profileSnap = await getDoc(doc(db, 'profiles', uid));
            if (profileSnap.exists()) {
                const data = profileSnap.data();
                const freshSettings = data.settings || data;
                if (data.name && !freshSettings.name) freshSettings.name = data.name;
                const freshProfileObj = { 
                    settings: freshSettings, 
                    points: data.points || 0, 
                    pointsHistory: data.pointsHistory || {},
                    isFirstGen: data.isFirstGen === true, 
                    routines: data.routines || { am: [], pm: [] }
                };
                setProfile(freshProfileObj);

                if (currentUser?.settings) setMatchInfo(calculateBioMatch(currentUser.settings, freshSettings, language));

                const shelfSnap = await getDocs(query(collection(db, 'profiles', uid, 'savedProducts'), orderBy('createdAt', 'desc'), limit(15)));
                const freshShelf = shelfSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setPublicShelf(freshShelf);
                cacheUserProfile(uid, freshProfileObj, freshShelf);
            }
        } catch (error) { console.error(error); } finally { setIsRefreshing(false); }
    };

    // 🌟 AVATAR SELECTION VIA PROPRIETARY MODAL
    const handleSelectAvatar = async (avatarItem) => {
        const avatarKey = typeof avatarItem === 'object' && avatarItem !== null 
            ? (avatarItem.id || avatarItem.key || avatarItem.avatarId || avatarItem) 
            : avatarItem;

        if (!avatarKey) return;
        const uid = typeof targetUserId === 'object' ? targetUserId.id : targetUserId;
        if (!uid) return;

        Haptics?.selectionAsync?.().catch(() => {});

        setProfile(prev => ({
            ...prev,
            settings: {
                ...(prev.settings || {}),
                avatarId: avatarKey
            }
        }));
        setAvatarPickerVisible(false);

        try {
            const userRef = doc(db, 'profiles', uid);
            await setDoc(userRef, {
                avatarId: avatarKey,
                settings: {
                    ...(profile.settings || {}),
                    avatarId: avatarKey
                }
            }, { merge: true });
            Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } catch (e) {
            console.error("Error updating avatar:", e);
        }
    };

    // 🌟 NAME EDITING HANDLERS
    const handleStartEditName = () => {
        setTempName(profile?.settings?.name || '');
        setIsEditingName(true);
        Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const handleSaveName = async () => {
        const trimmed = tempName.trim();
        if (!trimmed) return;
        setIsSavingName(true);
        Keyboard.dismiss();
        const uid = typeof targetUserId === 'object' ? targetUserId.id : targetUserId;
        try {
            const userRef = doc(db, 'profiles', uid);
            await setDoc(userRef, {
                name: trimmed,
                settings: {
                    ...(profile.settings || {}),
                    name: trimmed
                }
            }, { merge: true });

            setProfile(prev => ({
                ...prev,
                settings: {
                    ...(prev.settings || {}),
                    name: trimmed
                }
            }));
            setIsEditingName(false);
            Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } catch (e) {
            console.error("Error updating name:", e);
        } finally {
            setIsSavingName(false);
        }
    };

    const getLabel = (id, list) => { 
        const item = list.find(i => i.id === id); 
        return item ? (getLocalizedValue(item.label || item.name, language) || id) : id; 
    };

    const getGoalLabel = (id) => {
        const map = { brightening: 'goal_brightening', acne: 'goal_acne', anti_aging: 'goal_anti_aging', hydration: 'goal_hydration', texture_pores: 'goal_texture' };
        return map[id] ? t(map[id], language) : id;
    };
    
    const handleProductPress = (item) => { 
        if (onProductSelect) { 
            Animated.timing(animState, { toValue: 0, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true })
                .start(() => { onClose(); onProductSelect({ ...item, imageUrl: item.productImage }); });
        } 
    };

    const badgeList = useMemo(() => calculateUserBadges(profile, publicShelf), [profile, publicShelf]);

    const levelData = getUserLevelData 
        ? getUserLevelData(profile.points || 0, language) 
        : { currentLevel: { name: 'Level', color: COLORS.accentGreen, icon: 'star' }, nextLevel: null, progressPercent: 100, pointsToNextLevel: 0 };
    const currentLevel = { ...levelData.currentLevel, color: COLORS.accentGreen };

    const getSlideStyle = (anim) => ({ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] });

    const renderTraitCategory = (data, list, icon, color, title, isGoal = false) => {
        if (!data || data.length === 0) return null;
        return (
            <View style={styles.traitGroup}>
                <View style={[styles.traitGroupHeader, { flexDirection: rtl.flexDirection }]}>
                    <FontAwesome5 name={icon} size={11} color={color} />
                    <Text style={[styles.traitGroupTitle, { color: COLORS.textSecondary }]}>{title}</Text>
                </View>
                <View style={[styles.chipsWrap, { flexDirection: rtl.flexDirection }]}>
                    {data.map(item => (
                        <View key={item} style={[styles.modernChip]}>
                            <Text style={[styles.modernChipText, { color }]}>{isGoal ? getGoalLabel(item) : getLabel(item, list)}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const hasSecondaryTraits = Boolean(profile?.settings?.goals?.length > 0 || profile?.settings?.conditions?.length > 0 || profile?.settings?.allergies?.length > 0);
    const overlayOpacity = animState.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const modalTranslateY = animState.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT + 150, 0] });

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
            <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                <Animated.View style={[styles.container, { transform: [{ translateY: modalTranslateY }] }]}>
                    
                    <View {...panResponder.panHandlers} style={styles.dragHandleBar}>
                        <View style={[styles.dragHandle, { backgroundColor: COLORS.border }]} />
                    </View>

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
                        </View>
                    ) : (
                        <ScrollView 
                            contentContainerStyle={styles.scrollContent} 
                            showsVerticalScrollIndicator={false} 
                            bounces={true}
                            keyboardShouldPersistTaps="handled"
                        >
                            
                            {/* HERO SECTION */}
                            <Animated.View style={getSlideStyle(heroAnim)}>
                                <LinearGradient colors={[currentLevel.color + '15', COLORS.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroBento, { borderColor: currentLevel.color + '30' }]}>
                                    <View style={styles.heroRow}>
                                        <View style={styles.heroInfo}>
                                            
                                            {/* 🌟 EDITABLE NAME 🌟 */}
                                            {isEditingName ? (
                                                <View style={[styles.nameEditRow, { flexDirection: rtl.flexDirection }]}>
                                                    <AppTextInput
                                                        value={tempName}
                                                        onChangeText={setTempName}
                                                        style={[styles.nameInput, { color: COLORS.textPrimary, borderColor: COLORS.accentGreen }]}
                                                        autoFocus
                                                        maxLength={25}
                                                        placeholder={t('enter_name', language) || (language === 'ar' ? 'اسمكِ الكريم' : 'Your Name')}
                                                        placeholderTextColor={COLORS.textDim}
                                                        returnKeyType="done"
                                                        onSubmitEditing={handleSaveName}
                                                    />
                                                    <TouchableOpacity onPress={handleSaveName} disabled={isSavingName} style={styles.nameActionBtn}>
                                                        {isSavingName ? (
                                                            <ActivityIndicator size="small" color={COLORS.accentGreen} />
                                                        ) : (
                                                            <Feather name="check" size={16} color={COLORS.accentGreen} />
                                                        )}
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => { Keyboard.dismiss(); setIsEditingName(false); }} style={styles.nameActionBtn}>
                                                        <Feather name="x" size={16} color={COLORS.textDim} />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    disabled={!isMe}
                                                    onPress={handleStartEditName}
                                                    activeOpacity={0.7}
                                                    style={[styles.nameDisplayRow, { flexDirection: rtl.flexDirection }]}
                                                >
                                                    <Text style={styles.userName} numberOfLines={1}>
                                                        {profile?.settings?.name || t('community_default_user', language)}
                                                    </Text>
                                                    {isMe && (
                                                        <View style={styles.namePenIconBox}>
                                                            <Feather name="edit-2" size={12} color={COLORS.accentGreen} />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            )}

                                            <View style={[styles.rankPill, { backgroundColor: currentLevel.color + '20', borderColor: currentLevel.color + '40' }]}>
                                                <FontAwesome5 name={currentLevel.icon} size={10} color={currentLevel.color} />
                                                <Text style={[styles.rankText, { color: currentLevel.color }]}>{currentLevel.name}</Text>
                                                <Text style={[styles.pointsText, { color: COLORS.textSecondary }]}>• {profile.points || 0} {t('catalog_points', language)}</Text>
                                            </View>
                                        </View>
                                        
                                        {/* 🌟 EDITABLE AVATAR WITH CLEAR PEN BADGE 🌟 */}
                                        <TouchableOpacity
                                            disabled={!isMe}
                                            onPress={() => setAvatarPickerVisible(true)}
                                            activeOpacity={0.8}
                                            style={styles.avatarWrapper}
                                        >
                                            <View style={[styles.avatarGlow, { borderColor: !hasAvatar ? COLORS.accentGreen : currentLevel.color }]} />
                                            <View style={[styles.avatar, { backgroundColor: COLORS.background, overflow: 'hidden' }]}>
                                                {hasAvatar ? (
                                                    <Image 
                                                        source={AVATARS[profile?.settings?.avatarId || profile?.avatarId]} 
                                                        style={{ width: '100%', height: '100%', borderRadius: 35 }} 
                                                    />
                                                ) : (
                                                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                                        <FontAwesome5 name="user-plus" size={22} color={COLORS.accentGreen} />
                                                    </View>
                                                )}
                                            </View>
                                            
                                            {/* 1ج Badge (Bottom-Right) */}
                                            {profile.isFirstGen && (
                                                <View style={[styles.firstGenAvatarPinContainer, { borderColor: COLORS.background }]}>
                                                    <LinearGradient colors={['#FDE047', '#F59E0B', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.firstGenAvatarPin}>
                                                        <Text style={styles.firstGenAvatarText}>1ج</Text>
                                                    </LinearGradient>
                                                </View>
                                            )}

                                            {/* Editable Badge / Choose Prompt */}
                                            {isMe && (
                                                !hasAvatar ? (
                                                    <View style={[styles.avatarPromptTag, { backgroundColor: COLORS.accentGreen }]}>
                                                        <Text style={styles.avatarPromptTagText}>
                                                            {language === 'ar' ? 'اختاري صورتكِ' : 'Choose'}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <View style={[styles.avatarEditPenBadge, { backgroundColor: COLORS.accentGreen, borderColor: COLORS.background }]}>
                                                        <Feather name="edit-2" size={11} color="#FFF" />
                                                    </View>
                                                )
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    {levelData.nextLevel && levelData.currentLevel?.id !== levelData.nextLevel?.id ? (
                                        <View style={styles.levelProgressContainer}>
                                            <View style={[styles.levelProgressHeader, { flexDirection: rtl.flexDirection }]}>
                                                <Text style={[styles.pointsLeftText, { color: COLORS.textSecondary }]}>{interpolate(t('catalog_points_left', language), { points: levelData.pointsToNextLevel })} ({levelData.nextLevel.name})</Text>
                                                <Text style={[styles.levelProgressPercentText, { color: currentLevel.color }]}>{Math.round(levelData.progressPercent)}%</Text>
                                            </View>
                                            <View style={[styles.levelProgressBarTrack, { backgroundColor: COLORS.border }]}>
                                                <View style={[styles.levelProgressBarFill, { width: `${Math.round(levelData.progressPercent)}%`, backgroundColor: currentLevel.color }]} />
                                            </View>
                                        </View>
                                    ) : null}

                                    {!isMe && matchInfo.score > 0 && (
                                        <View style={[styles.matchBanner, { backgroundColor: matchInfo.color + '10', borderColor: matchInfo.color + '30' }]}>
                                            <MaterialCommunityIcons name="heart-pulse" size={16} color={matchInfo.color} />
                                            <Text style={[styles.matchText, { color: matchInfo.color }]}>{getLocalizedValue(matchInfo.label, language)} • {matchInfo.score}%</Text>
                                        </View>
                                    )}
                                </LinearGradient>
                            </Animated.View>

                            {/* CORE TRAITS */}
                            <Animated.View style={[styles.bentoSection, getSlideStyle(vitalAnim)]}>
                                <Text style={styles.sectionTitle}>{t('community_profile_traits', language)}</Text>
                                
                                <View style={[styles.traitsMainCard, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                                    <View style={[styles.vitalTilesRow, { flexDirection: rtl.flexDirection }]}>
                                        <View style={[styles.vitalTile, { backgroundColor: COLORS.background, borderColor: COLORS.border }]}>
                                            <View style={[styles.vitalTileHeader, { flexDirection: rtl.flexDirection }]}>
                                                <View style={[styles.vitalMiniIcon, { backgroundColor: COLORS.accentGreen + '15' }]}><FontAwesome5 name="tint" size={11} color={COLORS.accentGreen} /></View>
                                                <Text style={[styles.vitalTileLabel, { color: COLORS.textSecondary }]}>{t('community_profile_skin', language)}</Text>
                                            </View>
                                            <Text style={[styles.vitalTileValue, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]} numberOfLines={1}>{getLabel(profile?.settings?.skinType, basicSkinTypes) || t('community_unspecified', language)}</Text>
                                        </View>
                                        
                                        <View style={[styles.vitalTile, { backgroundColor: COLORS.background, borderColor: COLORS.border }]}>
                                            <View style={[styles.vitalTileHeader, { flexDirection: rtl.flexDirection }]}>
                                                <View style={[styles.vitalMiniIcon, { backgroundColor: (COLORS.blue || '#3F7FB8') + '15' }]}><FontAwesome5 name="cut" size={11} color={COLORS.blue || '#3F7FB8'} /></View>
                                                <Text style={[styles.vitalTileLabel, { color: COLORS.textSecondary }]}>{t('community_profile_hair', language)}</Text>
                                            </View>
                                            <Text style={[styles.vitalTileValue, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]} numberOfLines={1}>{getLabel(profile?.settings?.scalpType, basicScalpTypes) || t('community_unspecified', language)}</Text>
                                        </View>
                                    </View>

                                    {hasSecondaryTraits && (
                                        <View style={styles.secondaryTraitsContainer}>
                                            {renderTraitCategory(profile.settings.goals, null, 'crosshairs', COLORS.accentGreen, t('settings_goals_title', language), true)}
                                            {renderTraitCategory(profile.settings.conditions, commonConditions, 'notes-medical', COLORS.gold || '#BF8F20', t('settings_conditions_title', language))}
                                            {renderTraitCategory(profile.settings.allergies, commonAllergies, 'exclamation-circle', COLORS.danger, t('settings_allergies_title', language))}
                                        </View>
                                    )}
                                </View>
                            </Animated.View>

                            {/* BADGES SECTION */}
                            {/* BADGES SECTION */}
<Animated.View style={[styles.bentoSection, getSlideStyle(badgesAnim)]}>
    <View style={styles.sectionHeaderRow}>
        <View style={{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 8 }}>
            <Text style={styles.sectionTitle}>{t('community_profile_badges', language)}</Text>
            {badgeList.filter(b => b.progressPercent > 0).length > 0 && (
                <Text style={[styles.countBadge, { color: COLORS.accentGreen, backgroundColor: COLORS.accentGreen + '15', borderColor: COLORS.accentGreen + '40' }]}>
                    {badgeList.filter(b => b.progressPercent > 0).length}
                </Text>
            )}
        </View>
        
        <View style={[styles.swipeHintBadge, { flexDirection: rtl.flexDirection }]}>
            <Text style={[styles.swipeHintText, { color: COLORS.textDim }]}>
                {language === 'ar' ? 'اسحبي للمزيد' : 'Swipe for more'}
            </Text>
            <Feather name={rtl.isRTL ? 'chevron-left' : 'chevron-right'} size={12} color={COLORS.textDim} />
        </View>
    </View>

   <ScrollView
    ref={badgesScrollRef}
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.badgesHScroll}
    snapToInterval={BADGE_SNAP}
    decelerationRate="fast"
    // 👇 force LTR internal layout
    style={{ direction: 'ltr' }}
    onScroll={(e) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const visualIndex = Math.round(offsetX / BADGE_SNAP);
        // map visual → logical index for RTL
        const logicalIndex = rtl.isRTL
            ? badgeList.length - 1 - visualIndex
            : visualIndex;
        const clamped = Math.max(0, Math.min(logicalIndex, badgeList.length - 1));
        if (clamped !== activeBadgeIndex) setActiveBadgeIndex(clamped);
    }}
    scrollEventThrottle={16}
>
    {(rtl.isRTL ? [...badgeList].reverse() : badgeList).map((badge) => (
        <WathiqBadge key={badge.id} badge={badge} COLORS={COLORS} language={language} />
    ))}
</ScrollView>

    {/* 🌟 CAROUSEL DOTS */}
    {badgeList.length > 1 && (
        <View style={[styles.dotsRow, { flexDirection: rtl.flexDirection }]}>
            {badgeList.map((badge, idx) => {
                const isActive = idx === activeBadgeIndex;
                return (
                    <TouchableOpacity
                        key={badge.id}
                        activeOpacity={0.7}
                        onPress={() => {
                            badgesScrollRef.current?.scrollTo({
                                x: idx * BADGE_SNAP,
                                animated: true,
                            });
                            setActiveBadgeIndex(idx);
                            Haptics?.selectionAsync?.().catch(() => {});
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                        <View
                            style={[
                                styles.dot,
                                {
                                    backgroundColor: isActive ? COLORS.accentGreen : COLORS.border,
                                    width: isActive ? 20 : 6,
                                    opacity: isActive ? 1 : 0.6,
                                },
                            ]}
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    )}
</Animated.View>

                            {/* SHELF SECTION */}
                            <Animated.View style={[styles.bentoSection, { marginBottom: 10 }, getSlideStyle(shelfAnim)]}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>{t('profile_header_shelf', language)}</Text>
                                    <Text style={[styles.countBadge, { color: COLORS.textSecondary, backgroundColor: COLORS.card, borderColor: COLORS.border }]}>{publicShelf.length}</Text>
                                </View>

                                {publicShelf.length > 0 ? (
                                    <View style={[styles.shelfContainer, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                                        {publicShelf.slice(0, 5).map((item, index) => (
                                            <TouchableOpacity key={item.id} style={[styles.shelfItemCompact, { borderBottomColor: index === Math.min(publicShelf.length, 5) - 1 ? 'transparent' : COLORS.background }]} onPress={() => handleProductPress(item)} activeOpacity={0.7}>
                                                <WathiqScoreBadge score={item.analysisData?.oilGuardScore || 0} size={42} />
                                                <View style={styles.shelfItemInfo}>
                                                    <Text style={[styles.prodName, { color: COLORS.textPrimary }]} numberOfLines={1}>{item.productName}</Text>
                                                    <Text style={[styles.prodVerdict, { color: COLORS.textSecondary }]} numberOfLines={1}>{getLocalizedValue(item.analysisData?.finalVerdict, language) || t('common_product', language)}</Text>
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

            {/* 🌟 EXISTING AVATAR SELECTION MODAL 🌟 */}
            <AvatarSelectionModal
                visible={avatarPickerVisible}
                onClose={() => setAvatarPickerVisible(false)}
                onSelect={handleSelectAvatar}
                onSelectAvatar={handleSelectAvatar}
                currentAvatar={profile?.settings?.avatarId || profile?.avatarId}
                currentAvatarId={profile?.settings?.avatarId || profile?.avatarId}
            />
        </Modal>
    );
};

const createStyles = (COLORS, rtl) => StyleSheet.create({
    // 🌟 TOP-PINNED OVERLAY: Completely prevents upward shift when keyboard appears
    overlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0, 0, 0, 0.85)', 
        justifyContent: 'flex-start' 
    },
    // 🌟 TOP-PINNED CONTAINER: Fixed top offset ensures header & hero input stay fully visible
    container: { 
        marginTop: SCREEN_HEIGHT * 0.07,
        height: SCREEN_HEIGHT * 0.93 + 150, 
        marginBottom: -150, 
        paddingBottom: 150, 
        borderTopLeftRadius: 28, 
        borderTopRightRadius: 28, 
        overflow: 'hidden', 
        backgroundColor: COLORS.background 
    },
    dragHandleBar: { alignItems: 'center', paddingTop: 12, paddingBottom: 4, width: '100%' },
    dragHandle: { width: 44, height: 4.5, borderRadius: 10 },
    header: { flexDirection: rtl.flexDirection, justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18, color: COLORS.textPrimary },
    iconBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.border },
    scrollContent: { padding: 16, paddingBottom: 50 },

    heroBento: { padding: 20, borderRadius: 24, borderWidth: 0.5, marginBottom: 24 },
    heroRow: { flexDirection: rtl.flexDirection, alignItems: 'center', justifyContent: 'space-between' },
    heroInfo: { flex: 1, marginStart: 15 },
    userName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24, textAlign: rtl.textAlign, color: COLORS.textPrimary },
    
    nameDisplayRow: {
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    namePenIconBox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.accentGreen + '1A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameEditRow: {
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    nameInput: {
        flex: 1,
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderBottomWidth: 1.5,
        textAlign: rtl.textAlign,
    },
    nameActionBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.border + '50',
    },

    rankPill: { flexDirection: rtl.flexDirection, alignItems: 'center', gap: 6, alignSelf: rtl.alignSelf, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 0.5 },
    rankText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    pointsText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },

    levelProgressContainer: { marginTop: 14, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: COLORS.border, gap: 6 },
    levelProgressHeader: { justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    pointsLeftText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    levelProgressPercentText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 12 },
    levelProgressBarTrack: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden' },
    levelProgressBarFill: { height: '100%', borderRadius: 3 },
    
    avatarWrapper: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
    avatarGlow: { position: 'absolute', width: 78, height: 78, borderRadius: 39, borderWidth: 2, opacity: 0.45 },
    avatar: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    avatarText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 30 },
    
    firstGenAvatarPinContainer: { position: 'absolute', bottom: -2, right: -4, width: 26, height: 26, borderRadius: 13, borderWidth: 2, overflow: 'hidden' },
    firstGenAvatarPin: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    firstGenAvatarText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 11, color: '#FFF' },

    avatarEditPenBadge: {
        position: 'absolute',
        bottom: -2,
        left: -4,
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },

    matchBanner: { flexDirection: rtl.flexDirection, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 14, borderWidth: 0.5, marginTop: 15 },
    matchText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },

    bentoSection: { marginBottom: 20 },
    sectionHeaderRow: { flexDirection: rtl.flexDirection, alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 17, textAlign: rtl.textAlign, color: COLORS.textPrimary },
    countBadge: { fontFamily: 'Tajawal-Bold', fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 0.5 },

    swipeHintBadge: {
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.04)',
    },
    swipeHintText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
    },

    traitsMainCard: { borderRadius: 24, padding: 14, borderWidth: 0.5, gap: 12 },
    vitalTilesRow: { gap: 10, width: '100%' },
    vitalTile: { flex: 1, borderRadius: 18, padding: 12, borderWidth: 0.5, justifyContent: 'space-between', minHeight: 74 },
    vitalTileHeader: { alignItems: 'center', gap: 7, marginBottom: 6 },
    vitalMiniIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    vitalTileLabel: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    vitalTileValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 15.5, lineHeight: 20 },

    secondaryTraitsContainer: { gap: 12, paddingTop: 4 },
    traitGroup: { gap: 7, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: COLORS.border },
    traitGroupHeader: { alignItems: 'center', gap: 6 },
    traitGroupTitle: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    chipsWrap: { flexWrap: 'wrap', gap: 0 },
    modernChip: { paddingHorizontal: 5, paddingVertical: 4.5, borderRadius: 9,},
    modernChipText: { fontFamily: 'Tajawal-Bold', fontSize: 12.5 },

    badgesHScroll: { gap: 12, paddingVertical: 5 },
    
    shelfContainer: { borderRadius: 24, padding: 10, borderWidth: 0.5 },
    shelfItemCompact: { flexDirection: rtl.flexDirection, alignItems: 'center', padding: 10, borderBottomWidth: 1 },
    shelfItemInfo: { flex: 1, marginEnd: 12, marginStart: 12 },
    prodName: { fontFamily: 'Tajawal-Bold', fontSize: 13, textAlign: rtl.textAlign, marginBottom: 2 },
    prodVerdict: { fontFamily: 'Tajawal-Regular', fontSize: 11, textAlign: rtl.textAlign },

    emptyShelfBox: { alignItems: 'center', padding: 25, borderRadius: 24, borderWidth: 0.5, borderStyle: 'dashed' },
    emptyText: { fontFamily: 'Tajawal-Regular', textAlign: 'center', marginTop: 10, fontSize: 13 },
    badgesHScroll: { gap: 12, paddingVertical: 5 },

// 🌟 CAROUSEL DOTS
dotsRow: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
},
dot: {
    height: 6,
    borderRadius: 3,
},
avatarPromptTag: {
        position: 'absolute',
        bottom: -10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    avatarPromptTagText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 9.5,
        color: '#FFF',
        includeFontPadding: false,
    },
});

export default UserProfileModal;
