import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert, Animated, Pressable } from 'react-native';
import { FontAwesome5, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { File, Directory, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import WathiqScoreBadge from '../common/WathiqScoreBadge';
import { formatRelativeTime } from '../../utils/formatters';
import { calculateBioMatch } from '../../utils/matchCalculator';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../config/supabase';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';
import { AVATARS } from '../../constants/avatars';

// --- GLOBAL AUDIO TRACKING ---
let globalSound = null;
let globalResetState = null;

const stopGlobalAudio = async () => {
    if (globalSound) {
        try {
            await globalSound.pauseAsync();
            await globalSound.unloadAsync();
            globalSound = null;
        } catch (e) {}
    }
    if (globalResetState) {
        globalResetState();
        globalResetState = null;
    }
};

// ============================================================================
// 🌟 HOISTED SUB-COMPONENTS
// ============================================================================

const JourneyProductsList = React.memo(({ products, onViewProduct, language, COLORS, rtl, styles }) => {
    if (!products || products.length === 0) return null;
    return (
        <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>{t('community_post_used_products', language)} ✨</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: rtl.flexDirection }}>
                {products.map((p, index) => (
                    <TouchableOpacity
                        key={p.id || index}
                        style={[styles.journeyProductCard, { flexDirection: rtl.flexDirection }]}
                        onPress={() => onViewProduct(p)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.scoreDot, { backgroundColor: (p.score || 0) >= 80 ? COLORS.accentGreen : COLORS.gold }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.jpName} numberOfLines={1}>{p.name}</Text>
                            <Text style={styles.jpPrice}>
                                {p.price ? `${p.price} ${t('community_currency_dzd', language)}` : t('community_price_unspecified', language)}
                            </Text>
                        </View>
                        <Feather name={rtl.isRTL ? "chevron-left" : "chevron-right"} size={14} color={COLORS.textDim} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
});

const JourneyTimeline = React.memo(({ milestones, onImagePress, rtl, styles }) => {
    if (!milestones || milestones.length === 0) return null;
    return (
        <View style={styles.timelineContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, flexDirection: rtl.flexDirection }}>
                {milestones.map((step, index) => (
                    <View key={step.id || index} style={styles.timelineStep}>
                        <TouchableOpacity style={styles.stepCard} onPress={() => onImagePress(step.image)} activeOpacity={0.85}>
                            <Image source={{ uri: step.image }} style={styles.stepImage} />
                            <View style={styles.stepLabelBox}>
                                <Text style={styles.stepLabel} numberOfLines={1}>{step.label}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
});

const RoutineProductPill = React.memo(({ product, onPress, COLORS, rtl, styles, language }) => {
    const imageUri = product.productImage || product.image || product.imageUrl;
    const name = product.productName || product.name || product.details || t('community_product', language);
    const score = product.oilGuardScore || product.score || product.analysisData?.oilGuardScore || 0;
    const type = product.productType || product.type || product.analysisData?.product_type || 'other';

    return (
        <TouchableOpacity style={[styles.rpCard, { flexDirection: rtl.flexDirection }]} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.rpImageContainer}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.rpImage} />
                ) : (
                    <FontAwesome5 name={type === 'sunscreen' ? 'sun' : 'wine-bottle'} size={14} color={COLORS.textDim} />
                )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rpName} numberOfLines={1}>{name}</Text>
                {score > 0 ? (
                    <View style={[styles.rpScoreRow, { flexDirection: rtl.flexDirection }]}>
                        <View style={[styles.rpScoreDot, { backgroundColor: score >= 80 ? COLORS.accentGreen : COLORS.gold }]} />
                        <Text style={styles.rpScoreText}>{score}%</Text>
                    </View>
                ) : null}
            </View>
        </TouchableOpacity>
    );
});

const RoutineRateContent = React.memo(({ post, onViewProduct, COLORS, rtl, styles, language }) => {
    const snapshot = useMemo(() => {
        if (!post.routineSnapshot) return {};
        if (typeof post.routineSnapshot === 'string') {
            try { return JSON.parse(post.routineSnapshot); } catch { return {}; }
        }
        return post.routineSnapshot;
    }, [post.routineSnapshot]);

    const rawAm = snapshot?.am || [];
    const rawPm = snapshot?.pm || [];

    const handleProductPress = useCallback((prod) => {
        if (!onViewProduct) return;
        const resolvedType = prod.productType || prod.type || prod.product_type || prod.category?.id || prod.analysisData?.product_type || 'other';
        onViewProduct({
            ...prod,
            id: prod.id || 'unknown',
            name: prod.productName || prod.name || t('community_product', language),
            productName: prod.productName || prod.name || t('community_product', language),
            image: prod.productImage || prod.image || prod.imageUrl || null,
            imageUrl: prod.productImage || prod.image || prod.imageUrl || null,
            productImage: prod.productImage || prod.image || prod.imageUrl || null,
            productType: resolvedType,
            type: resolvedType,
            marketingClaims: prod.marketingClaims || prod.claims || [],
            ingredients: prod.ingredients || prod.analysisData?.detected_ingredients || [],
            analysisData: prod.analysisData || null
        });
    }, [onViewProduct, language]);

    const renderPeriod = (title, icon, color, stepsInput, emoji) => {
        const steps = Array.isArray(stepsInput) ? stepsInput : [];
        if (steps.length === 0) return null;

        const allProducts = [];
        steps.forEach(step => {
            if (step.products && Array.isArray(step.products)) {
                allProducts.push(...step.products);
            } else if (step.ingredients || step.marketingClaims || step.productName || step.name) {
                allProducts.push(step);
            } else if (step.productIds && step.details) {
                allProducts.push({
                    id: step.productIds[0] || 'unknown',
                    productName: step.details,
                    productType: 'other',
                    oilGuardScore: 0
                });
            }
        });

        return (
            <View style={[styles.routinePeriodContainer, { borderColor: color + '22', backgroundColor: color + '08' }]}>
                <View style={[styles.routinePeriodHeader, { flexDirection: rtl.flexDirection }]}>
                    <View style={[{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 6 }]}>
                        <Feather name={icon} size={13} color={color} />
                        <Text style={[styles.routinePeriodTitle, { color }]}>{title} {emoji}</Text>
                    </View>
                    <Text style={styles.routineStepCount}>{allProducts.length} {t('community_products', language)}</Text>
                </View>
                {allProducts.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: rtl.flexDirection }}>
                        {allProducts.map((prod, i) => (
                            <RoutineProductPill key={`${title}-${i}`} product={prod} onPress={() => handleProductPress(prod)} COLORS={COLORS} rtl={rtl} styles={styles} language={language} />
                        ))}
                    </ScrollView>
                ) : (
                    <Text style={styles.routineEmptyText}>{t('community_no_products_registered', language)}</Text>
                )}
            </View>
        );
    };

    return (
        <View>
            <Text style={styles.postContent}>{post.content}</Text>
            <View style={{ gap: 8, marginTop: 4 }}>
                {renderPeriod(t('community_morning', language), 'sun', COLORS.gold, rawAm, '☀️')}
                {renderPeriod(t('community_evening', language), 'moon', COLORS.purple || '#A855F7', rawPm, '🌙')}
            </View>
        </View>
    );
});

const TipsContent = React.memo(({ post, onImagePress, COLORS, rtl, styles, language }) => {
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sound, setSound] = useState(null);
    const isMounted = useRef(true);
    const soundRef = useRef(null);

    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);
    const [cloudAudioUrl, setCloudAudioUrl] = useState(post.audio_url || null);

    const ELEVENLABS_API_KEY = "sk_0725f26efa493f9a6306ef9819586eb4f41458dc6d804589";
    const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
    const validTitle = post.title && post.title !== 'null' && post.title.trim() !== '' ? post.title : null;

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (soundRef.current) {
                soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            if (globalSound === soundRef.current) globalSound = null;
        };
    }, []);

    useEffect(() => {
        if (sound) {
            const subscription = sound.setOnPlaybackStatusUpdate((status) => {
                if (!isMounted.current) return;
                if (status.isLoaded) {
                    if (!isSeeking) setPosition(status.positionMillis);
                    setDuration(status.durationMillis || 0);
                    if (status.didJustFinish) {
                        setIsPlaying(false);
                        setPosition(0);
                    }
                }
            });
            return () => { if (sound) sound.setOnPlaybackStatusUpdate(null); };
        }
    }, [sound, isSeeking]);

    const onSlidingStart = () => setIsSeeking(true);
    const onSlidingComplete = async (value) => {
        if (sound) {
            await sound.setPositionAsync(value);
            if (isPlaying) await sound.playAsync();
        }
        if (isMounted.current) {
            setPosition(value);
            setIsSeeking(false);
        }
    };

    const loadAndPlay = async (uri) => {
        try {
            await stopGlobalAudio();
            globalResetState = () => {
                if (isMounted.current) {
                    setIsPlaying(false);
                    setPosition(0);
                }
            };

            if (soundRef.current) await soundRef.current.unloadAsync();

            const { sound: newSound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true }, null);
            soundRef.current = newSound;
            setSound(newSound);
            globalSound = newSound;

            if (isMounted.current) {
                setIsPlaying(true);
                setIsLoading(false);
            }
        } catch (err) {
            if (isMounted.current) {
                setIsLoading(false);
                setIsPlaying(false);
                Alert.alert(t('community_error_title', language), t('community_audio_play_failed', language));
            }
        }
    };

    const handleSpeech = async () => {
        if (sound) {
            if (isPlaying) {
                await sound.pauseAsync();
                if (isMounted.current) setIsPlaying(false);
            } else {
                if (globalSound && globalSound !== sound) {
                    await stopGlobalAudio();
                    globalSound = sound;
                    globalResetState = () => isMounted.current && setIsPlaying(false);
                }
                const status = await sound.getStatusAsync();
                if (status.isLoaded && status.positionMillis >= status.durationMillis) {
                    await sound.setPositionAsync(0);
                }
                await sound.playAsync();
                if (isMounted.current) setIsPlaying(true);
            }
            return;
        }

        if (isMounted.current) setIsLoading(true);

        try {
            const audioDir = new Directory(Paths.cache, 'audio_tips');
            if (!audioDir.exists) audioDir.create();
            
            const filename = `tip_${post.id}.mp3`;
            const cachedFile = new File(audioDir, filename);

            if (cachedFile.exists) {
                await loadAndPlay(cachedFile.uri);
                return;
            }

            if (cloudAudioUrl) {
                await loadAndPlay(cloudAudioUrl);
                return;
            }

            const fullText = `${validTitle ? validTitle + '. ' : ''}${post.content}`;
            const safeText = fullText.substring(0, 2500);

            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'xi-api-key': ELEVENLABS_API_KEY },
                body: JSON.stringify({
                    text: safeText,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                }),
            });

            if (!response.ok) throw new Error(`API_ERROR: ${response.status}`);

            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const base64data = reader.result.split(',')[1];
                    const binaryData = new Uint8Array(decode(base64data));
                    cachedFile.write(binaryData);
                    await loadAndPlay(cachedFile.uri);
                } catch {
                    if (isMounted.current) setIsLoading(false);
                }
            };
            reader.readAsDataURL(blob);

        } catch {
            if (isMounted.current) {
                setIsLoading(false);
                setIsPlaying(false);
                Alert.alert(t('community_error_title', language), t('community_audio_check_internet', language));
            }
        }
    };

    const formatTime = (millis) => {
        if (!millis || millis < 0) return "0:00";
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <View style={{ marginBottom: 4 }}>
            <View style={[{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 6, marginBottom: 8 }]}>
                <FontAwesome5 name="check-circle" solid size={11} color={COLORS.info} />
                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.info }}>{t('community_verified_admin_tip', language)}</Text>
            </View>

            {validTitle && <Text style={styles.tipsExternalTitle}>{validTitle}</Text>}

            <View style={styles.pillContainer}>
                <View style={[styles.pillMain, { flexDirection: rtl.flexDirection }]}>
                    <TouchableOpacity onPress={handleSpeech} disabled={isLoading} style={styles.playBtn} activeOpacity={0.8}>
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Ionicons name={isPlaying ? "pause" : "play"} size={18} color="#FFF" style={{ marginLeft: 2 }} />
                        )}
                    </TouchableOpacity>

                    <View style={styles.pillInfo}>
                        <View style={[{ flexDirection: rtl.flexDirection, justifyContent: 'space-between' }]}>
                            <Text style={styles.timerText}>{formatTime(position)} / {formatTime(duration)}</Text>
                        </View>
                        <Slider
                            style={{ width: '100%', height: 26 }}
                            minimumValue={0}
                            maximumValue={duration > 0 ? duration : 1}
                            value={position}
                            onSlidingStart={onSlidingStart}
                            onSlidingComplete={onSlidingComplete}
                            minimumTrackTintColor={COLORS.info}
                            maximumTrackTintColor={COLORS.border}
                            thumbTintColor={COLORS.info}
                            inverted={rtl.isRTL}
                            disabled={!sound || isLoading}
                        />
                    </View>

                    <TouchableOpacity 
                        onPress={() => setIsExpanded(!isExpanded)}
                        style={[styles.readToggle, isExpanded && { backgroundColor: COLORS.info + '15' }, { flexDirection: rtl.flexDirection }]}
                        activeOpacity={0.7}
                    >
                        <Feather name={isExpanded ? "chevron-up" : "book-open"} size={14} color={COLORS.info} />
                        <Text style={styles.readToggleText}>{isExpanded ? t('community_close', language) : t('community_read', language)}</Text>
                    </TouchableOpacity>
                </View>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.pillImage} resizeMode="cover" />}
                        <Text style={styles.pillDescription}>{post.content}</Text>
                        <TouchableOpacity style={[styles.pillCta, { flexDirection: rtl.flexDirection }]} onPress={() => router.push('/oilguard')} activeOpacity={0.8}>
                            <FontAwesome5 name="search" size={13} color="#FFF" />
                            <Text style={styles.pillCtaText}>{t('community_scan_product_now', language)}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
});

// ============================================================================
// 🌟 MAIN CARD COMPONENT
// ============================================================================

const PostCard = ({ post, currentUser, onInteract, onDelete, onViewProduct, onOpenComments, onImagePress, onProfilePress }) => {
    const language = useCurrentLanguage();
    const rtl = useRTL();
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS, rtl), [COLORS, rtl]);

    const likeScale = useRef(new Animated.Value(1)).current;

    const isLiked = post.likes && post.likes.includes(currentUser?.uid);
    const matchData = useMemo(() => {
    // Don't show BioMatch with yourself
    if (isMe) return null;

    const mySettings = currentUser?.settings || currentUser;
    const authorSettings = post.authorSettings;

    if (mySettings && authorSettings) {
        return calculateBioMatch(mySettings, authorSettings, language);
    }
    return null;
}, [isMe, currentUser, post.authorSettings, language]);

    const config = useMemo(() => {
        switch (post.type) {
            case 'review': return { icon: 'star', color: COLORS.accentGreen, label: t('community_type_review', language) };
            case 'journey': return { icon: 'hourglass-half', color: COLORS.gold, label: t('community_type_journey', language) };
            case 'qa': return { icon: 'question-circle', color: '#38BDF8', label: t('community_type_question', language) };
            case 'routine_rate': return { icon: 'clipboard-list', color: '#A855F7', label: t('community_type_routine_rate', language) };
            case 'tips': return { icon: 'lightbulb', color: '#FB7185', label: t('community_type_tip', language) };
            default: return { icon: 'pen', color: COLORS.textSecondary, label: t('community_type_general', language) };
        }
    }, [post.type, COLORS, language]);

    const handleLikePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        
        Animated.sequence([
            Animated.timing(likeScale, { toValue: 1.35, duration: 110, useNativeDriver: true }),
            Animated.spring(likeScale, { toValue: 1, friction: 4, tension: 45, useNativeDriver: true })
        ]).start();

        onInteract(post.id, 'like');
    }, [post.id, onInteract, likeScale]);

    const isMe = post.userId === currentUser?.uid;
const liveAvatarId = currentUser?.settings?.avatarId || currentUser?.avatarId;
const resolvedAvatarId = isMe 
    ? (liveAvatarId || post.authorSettings?.avatarId || post.avatarId)
    : (post.authorSettings?.avatarId || post.avatarId);
    const avatarSource = AVATARS[resolvedAvatarId];

    return (
        <View style={[styles.cardBase, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
            {/* CARD HEADER */}
            <View style={[styles.cardHeader, { flexDirection: rtl.flexDirection }]}>
                <TouchableOpacity
                    style={[styles.userInfo, { flexDirection: rtl.flexDirection }]}
                    onPress={() => onProfilePress && onProfilePress(post.userId, {
                        ...(post.authorSettings || {}),
                        name: post.userName || t('community_default_user', language)
                    })}
                    activeOpacity={0.7}
                >
                    <View style={{ position: 'relative' }}>
    <View style={[styles.avatarPlaceholder, { backgroundColor: COLORS.background, borderColor: COLORS.border }]}>
        {avatarSource ? (
            <Image source={avatarSource} style={styles.avatarImage} />
        ) : (
            <Text style={[styles.avatarInitial, { color: COLORS.accentGreen }]}>
                {(post.userName || t('community_default_user', language)).charAt(0).toUpperCase()}
            </Text>
        )}
    </View>
    {(post.authorSettings?.isFirstGen || post.isFirstGen || (post.userId === currentUser?.uid && currentUser?.isFirstGen)) && (
        <View style={[styles.firstGenPin, { borderColor: COLORS.card }]}>
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

                    <View style={styles.userMetaCol}>
                        <View style={[styles.userNameRow, { flexDirection: rtl.flexDirection }]}>
                            <Text style={[styles.userName, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]}>{post.userName}</Text>
                        </View>
                        
                        <View style={[styles.timeCategoryRow, { flexDirection: rtl.flexDirection }]}>
                            <View style={[styles.typePill, { backgroundColor: config.color + '15', borderColor: config.color + '35', flexDirection: rtl.flexDirection }]}>
                                <FontAwesome5 name={config.icon} size={9} color={config.color} />
                                <Text style={[styles.typePillText, { color: config.color }]}>{config.label}</Text>
                            </View>
                            <Text style={[styles.timestamp, { color: COLORS.textDim, textAlign: rtl.textAlign }]}>
                                • {formatRelativeTime(post.createdAt)}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {post.userId === currentUser?.uid && (
                    <TouchableOpacity onPress={() => onDelete(post.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.deleteBtn}>
                        <Feather name="trash-2" size={15} color={COLORS.textDim} />
                    </TouchableOpacity>
                )}
            </View>

            {/* THEME-BASED DYNAMIC BIOMATCH CAPSULE */}
            {matchData && matchData.score > 20 && (
                <View style={[
                    styles.matchIndicator, 
                    { 
                        backgroundColor: COLORS.accentGreen + '12', 
                        borderColor: COLORS.accentGreen + '30',
                        alignSelf: rtl.alignSelf,
                        flexDirection: rtl.flexDirection 
                    }
                ]}>
                    <MaterialCommunityIcons name="heart-pulse" size={13} color={COLORS.accentGreen} />
                    <Text style={[styles.matchText, { flexDirection: rtl.flexDirection }]}>
                        <Text style={{ fontFamily: 'Tajawal-ExtraBold', color: COLORS.accentGreen }}>{matchData.score}%</Text>
                        <Text style={{ color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold' }}>{' • '}{matchData.label}</Text>
                        {matchData.matches && matchData.matches.length > 0 ? (
                            <Text style={{ color: COLORS.textDim, fontFamily: 'Tajawal-Regular' }}>{` (${matchData.matches.join(' + ')})`}</Text>
                        ) : null}
                    </Text>
                </View>
            )}

            {/* 🌟 INTERACTIVE CONTENT AREA (Tapping opens comments) */}
            <Pressable
                onPress={() => onOpenComments && onOpenComments(post)}
                style={({ pressed }) => [
                    styles.contentInteractiveArea,
                    pressed && { opacity: 0.94 }
                ]}
            >
                {/* 🌟 REVIEW POST: Content + Product Bento + Uploaded Photo */}
                {post.type === 'review' && (
                    <View>
                        <Text style={styles.postContent}>{post.content}</Text>
                        
                        {post.taggedProduct ? (
                            <TouchableOpacity
                                onPress={() => onViewProduct({
                                    ...post.taggedProduct,
                                    imageUrl: post.taggedProduct.imageUrl || post.taggedProduct.productImage || post.imageUrl
                                })}
                                activeOpacity={0.85}
                                style={[styles.reviewCard, { flexDirection: rtl.flexDirection }]}
                            >
                                <WathiqScoreBadge score={post.taggedProduct.score} size={42} />
                                <View style={styles.reviewCardInfo}>
                                    <Text style={styles.taggedProductName} numberOfLines={1}>{post.taggedProduct.name}</Text>
                                    <View style={[styles.tapToViewRow, { flexDirection: rtl.flexDirection }]}>
                                        <Text style={styles.tapToViewText}>{t('community_post_tap_to_analyze', language)}</Text>
                                        <Feather name={rtl.isRTL ? "chevron-left" : "chevron-right"} size={12} color={COLORS.accentGreen} />
                                    </View>
                                </View>
                                {post.taggedProduct.imageUrl || post.taggedProduct.productImage ? (
                                    <Image source={{ uri: post.taggedProduct.imageUrl || post.taggedProduct.productImage }} style={styles.productThumbSmall} />
                                ) : (
                                    <View style={styles.productIconBox}>
                                        <FontAwesome5 name="wine-bottle" size={14} color={COLORS.textDim} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ) : null}

                        {/* 🌟 USER UPLOADED PHOTO (Rendered without blocking) */}
                        {post.imageUrl ? (
                            <TouchableOpacity onPress={() => onImagePress(post.imageUrl)} activeOpacity={0.9} style={styles.postImageWrapper}>
                                <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                )}

                {/* JOURNEY POST */}
                {post.type === 'journey' && (
                    <View>
                        <Text style={styles.postContent}>{post.content}</Text>
                        {post.duration && (
                            <View style={[styles.journeyMetaRow, { flexDirection: rtl.flexDirection }]}>
                                <View style={[styles.journeyBadge, { flexDirection: rtl.flexDirection }]}>
                                    <Feather name="clock" size={12} color={COLORS.gold} />
                                    <Text style={styles.journeyBadgeText}>{t('community_duration', language)}: {post.duration}</Text>
                                </View>
                            </View>
                        )}
                        {post.milestones && post.milestones.length > 0 ? (
                            <JourneyTimeline milestones={post.milestones} onImagePress={onImagePress} rtl={rtl} styles={styles} />
                        ) : (
                            <View style={styles.beforeAfterContainer}>
                                <TouchableOpacity style={styles.baImageWrapper} onPress={() => post.beforeImage && onImagePress(post.beforeImage)}>
                                    <Text style={styles.baLabel}>{t('community_before', language)} 🌱</Text>
                                    <Image source={{ uri: post.beforeImage }} style={styles.baImage} />
                                </TouchableOpacity>
                                <View style={styles.baDivider}><FontAwesome5 name={rtl.isRTL ? "arrow-left" : "arrow-right"} size={12} color={COLORS.textSecondary} /></View>
                                <TouchableOpacity style={styles.baImageWrapper} onPress={() => post.afterImage && onImagePress(post.afterImage)}>
                                    <Text style={styles.baLabel}>{t('community_after', language)} ✨</Text>
                                    <Image source={{ uri: post.afterImage }} style={styles.baImage} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <JourneyProductsList products={post.journeyProducts || []} onViewProduct={onViewProduct} language={language} COLORS={COLORS} rtl={rtl} styles={styles} />
                    </View>
                )}

                {/* QA POST */}
                {post.type === 'qa' && (
                    <View>
                        {post.title ? <Text style={styles.qaTitle}>{post.title}</Text> : null}
                        <Text style={styles.postContent}>{post.content}</Text>
                        {post.imageUrl && (
                            <TouchableOpacity onPress={() => onImagePress(post.imageUrl)} activeOpacity={0.9} style={styles.postImageWrapper}>
                                <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ROUTINE RATE POST */}
                {post.type === 'routine_rate' && (
                    <RoutineRateContent post={post} onViewProduct={onViewProduct} COLORS={COLORS} rtl={rtl} styles={styles} language={language} />
                )}

                {/* TIPS POST */}
                {post.type === 'tips' && (
                    <TipsContent post={post} onImagePress={onImagePress} COLORS={COLORS} rtl={rtl} styles={styles} language={language} />
                )}
            </Pressable>

            {/* CARD FOOTER */}
            <View style={[styles.cardFooter, { borderTopColor: COLORS.border + '50', flexDirection: rtl.flexDirection }]}>
                <TouchableOpacity 
                    style={[styles.actionButton, isLiked && { backgroundColor: COLORS.danger + '14', borderColor: COLORS.danger + '35' }, { flexDirection: rtl.flexDirection }]} 
                    onPress={handleLikePress}
                    activeOpacity={0.7}
                >
                    <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={17} color={isLiked ? COLORS.danger : COLORS.textSecondary} />
                    </Animated.View>
                    <Text style={[styles.statText, { color: isLiked ? COLORS.danger : COLORS.textSecondary }]}>
                        {post.likesCount || 0}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.actionButton, { flexDirection: rtl.flexDirection }]} 
                    onPress={() => onOpenComments(post)}
                    activeOpacity={0.7}
                >
                    <Feather name="message-circle" size={16} color={COLORS.textSecondary} />
                    <Text style={[styles.statText, { color: COLORS.textSecondary }]}>
                        {post.commentsCount || 0}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const createStyles = (COLORS, rtl) => StyleSheet.create({
    cardBase: { 
        marginHorizontal: 15, 
        marginBottom: 14, 
        borderRadius: 24, 
        padding: 16, 
        borderWidth: 0.8, 
    },
    cardHeader: { 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 12 
    },
    userInfo: { 
        gap: 10, 
        alignItems: 'center',
        flex: 1,
    },
    avatarPlaceholder: { 
        width: 42, 
        height: 42, 
        borderRadius: 21, 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderWidth: 1.5, 
        overflow: 'hidden'
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 21,
    },
    avatarInitial: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 16,
    },
    userMetaCol: {
        gap: 3,
    },
    userNameRow: {
        alignItems: 'center',
        gap: 6,
    },
    userName: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 14.5, 
    },
    timeCategoryRow: {
        alignItems: 'center',
        gap: 6,
    },
    typePill: {
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 0.5,
    },
    typePillText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10.5,
    },
    timestamp: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 11, 
    },
    deleteBtn: {
        padding: 6,
    },
    matchIndicator: { 
        gap: 6, 
        alignItems: 'center',
        paddingHorizontal: 11, 
        paddingVertical: 4.5, 
        marginBottom: 10, 
        borderRadius: 14, 
        borderWidth: 0.8, 
    },
    matchText: { 
        fontSize: 11.5, 
    },
    contentInteractiveArea: {
        marginBottom: 12,
    },
    postContent: { 
        fontFamily: 'Tajawal-Regular', 
        color: COLORS.textPrimary, 
        fontSize: 15, 
        textAlign: rtl.textAlign, 
        lineHeight: 24, 
        marginBottom: 8 
    },
    postImageWrapper: {
        borderRadius: 18,
        overflow: 'hidden',
        marginTop: 8,
    },
    postImage: { 
        width: '100%', 
        height: 210, 
        borderRadius: 18, 
    },
    qaTitle: { 
        fontFamily: 'Tajawal-ExtraBold', 
        fontSize: 16.5, 
        color: COLORS.textPrimary, 
        textAlign: rtl.textAlign, 
        marginBottom: 4 
    },
    reviewCard: { 
        backgroundColor: COLORS.background, 
        borderRadius: 18, 
        padding: 11, 
        borderWidth: 0.8, 
        borderColor: COLORS.border, 
        alignItems: 'center',
        marginTop: 6,
    },
    reviewCardInfo: {
        flex: 1,
        marginHorizontal: 10,
        justifyContent: 'center',
    },
    taggedProductName: { 
        fontFamily: 'Tajawal-Bold', 
        color: COLORS.textPrimary, 
        fontSize: 13.5, 
        textAlign: rtl.textAlign, 
        marginBottom: 2 
    },
    tapToViewRow: {
        alignItems: 'center',
        gap: 3,
    },
    tapToViewText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 11, 
        color: COLORS.accentGreen 
    },
    productThumbSmall: {
        width: 42,
        height: 42,
        borderRadius: 12,
    },
    productIconBox: { 
        width: 42, 
        height: 42, 
        borderRadius: 12, 
        backgroundColor: COLORS.card, 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderWidth: 0.8, 
        borderColor: COLORS.border 
    },
    journeyMetaRow: { marginBottom: 8 },
    journeyBadge: { alignItems: 'center', gap: 6, backgroundColor: COLORS.gold + '16', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    journeyBadgeText: { color: COLORS.gold, fontSize: 11.5, fontFamily: 'Tajawal-Bold' },
    timelineContainer: { marginTop: 8 },
    timelineStep: { width: 105 },
    stepCard: { width: 105, height: 135, backgroundColor: COLORS.background, borderRadius: 16, borderWidth: 0.8, borderColor: COLORS.border, overflow: 'hidden' },
    stepImage: { width: '100%', height: 98 },
    stepLabelBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    stepLabel: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.textPrimary },
    sectionBlock: { marginTop: 12 },
    sectionLabel: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, textAlign: rtl.textAlign },
    journeyProductCard: { alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 14, padding: 9, width: 155, borderWidth: 0.8, borderColor: COLORS.border, gap: 8 },
    jpName: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.textPrimary, textAlign: rtl.textAlign },
    jpPrice: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.gold, textAlign: rtl.textAlign },
    scoreDot: { width: 6, height: 6, borderRadius: 3 },
    beforeAfterContainer: { flexDirection: 'row', height: 115, borderRadius: 16, overflow: 'hidden', borderWidth: 0.8, borderColor: COLORS.border },
    baImageWrapper: { flex: 1, position: 'relative' },
    baImage: { width: '100%', height: '100%' },
    baLabel: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.65)', color: '#FFF', fontSize: 10, paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 6, fontFamily: 'Tajawal-Bold' },
    baDivider: { width: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
    routinePeriodContainer: { borderRadius: 16, borderWidth: 0.8, padding: 11 },
    routinePeriodHeader: { justifyContent: 'space-between', marginBottom: 7 },
    routinePeriodTitle: { fontFamily: 'Tajawal-Bold', fontSize: 12.5 },
    routineStepCount: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textDim },
    rpCard: { alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, padding: 7, width: 155, borderWidth: 0.8, borderColor: COLORS.border },
    rpImageContainer: { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, overflow: 'hidden' },
    rpImage: { width: '100%', height: '100%' },
    rpName: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.textPrimary, textAlign: rtl.textAlign },
    rpScoreRow: { alignItems: 'center', gap: 4 },
    rpScoreDot: { width: 5, height: 5, borderRadius: 2.5 },
    rpScoreText: { fontSize: 9, color: COLORS.textSecondary, fontFamily: 'Tajawal-Bold' },
    routineEmptyText: { textAlign: 'center', color: COLORS.textDim, fontSize: 11.5, fontStyle: 'italic', padding: 6 },
    tipsExternalTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16.5, color: COLORS.textPrimary, textAlign: rtl.textAlign, marginBottom: 8 },
    pillContainer: { backgroundColor: COLORS.background, borderRadius: 18, borderWidth: 0.8, borderColor: COLORS.border, overflow: 'hidden' },
    pillMain: { alignItems: 'center', padding: 8, height: 56 },
    playBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.info, justifyContent: 'center', alignItems: 'center', marginHorizontal: 6 },
    pillInfo: { flex: 1, justifyContent: 'center' },
    timerText: { fontFamily: 'Tajawal-Regular', fontSize: 9, color: COLORS.textDim, textAlign: rtl.textAlign },
    readToggle: { alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    readToggleText: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.info },
    expandedContent: { padding: 12, borderTopWidth: 0.5, borderTopColor: COLORS.border, backgroundColor: COLORS.card },
    pillImage: { width: '100%', height: 165, borderRadius: 14, marginBottom: 10 },
    pillDescription: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textPrimary, textAlign: rtl.textAlign, lineHeight: 22, marginBottom: 12 },
    pillCta: { backgroundColor: COLORS.info, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 12, gap: 6 },
    pillCtaText: { fontFamily: 'Tajawal-Bold', color: '#FFF', fontSize: 13 },
    cardFooter: { 
        borderTopWidth: 0.5, 
        paddingTop: 10, 
        gap: 8,
    },
    actionButton: { 
        alignItems: 'center', 
        gap: 6, 
        paddingVertical: 6, 
        paddingHorizontal: 14, 
        borderRadius: 18,
        backgroundColor: COLORS.background,
        borderWidth: 0.8, 
        borderColor: COLORS.border,
    },
    statText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 12, 
    },
    firstGenPin: {
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
});

export default React.memo(PostCard);
