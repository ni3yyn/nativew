import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { File, Directory, Paths } from 'expo-file-system';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import WathiqScoreBadge from '../common/WathiqScoreBadge';
import { formatRelativeTime } from '../../utils/formatters';
import { calculateBioMatch } from '../../utils/matchCalculator';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../config/supabase';

// --- GLOBAL AUDIO TRACKING (Prevents overlapping audio in FlatList) ---
let globalSound = null;
let globalResetState = null;

const stopGlobalAudio = async () => {
    if (globalSound) {
        try {
            await globalSound.pauseAsync();
            await globalSound.unloadAsync();
            globalSound = null;
        } catch (e) {
            // Ignore errors on unload
        }
    }
    if (globalResetState) {
        globalResetState();
        globalResetState = null;
    }
};

// --- MAIN CARD ---
const PostCard = React.memo(({ post, currentUser, onInteract, onDelete, onViewProduct, onOpenComments, onImagePress, onProfilePress }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS),[COLORS]);

    // --- SUB-COMPONENTS ---

    const JourneyProductsList = ({ products }) => {
        if (!products || products.length === 0) return null;
        return (
            <View style={{ marginTop: 15 }}>
                <Text style={styles.sectionLabel}>المنتجات المستخدمة:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 5 }}>
                    {products.map((p, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.journeyProductCard}
                            onPress={() => onViewProduct(p)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.scoreDot, { backgroundColor: (p.score || 0) >= 80 ? COLORS.accentGreen : COLORS.gold }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.jpName} numberOfLines={2}>{p.name}</Text>
                                <Text style={styles.jpPrice}>
                                    {p.price ? `${p.price} دج` : 'السعر غير محدد'}
                                </Text>
                            </View>
                            <FontAwesome5 name="plus-circle" size={16} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const JourneyTimeline = ({ milestones }) => {
        if (!milestones || milestones.length === 0) return null;
        return (
            <View style={styles.timelineContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineScroll}>
                    {milestones.map((step, index) => (
                        <View key={index} style={styles.timelineStep}>
                            <View style={styles.timelineIndicator}>
                                {index < milestones.length - 1 && <View style={styles.connectingLine} />}
                                <View style={styles.dot} />
                            </View>
                            <TouchableOpacity style={styles.stepCard} onPress={() => onImagePress(step.image)}>
                                <Image source={{ uri: step.image }} style={styles.stepImage} />
                                <View style={styles.stepLabelBox}><Text style={styles.stepLabel} numberOfLines={1}>{step.label}</Text></View>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    };

    const ReviewContent = ({ post: p }) => (
        <View>
            <Text style={styles.postContent}>{p.content}</Text>
            {p.taggedProduct ? (
                <TouchableOpacity
                    onPress={() => onViewProduct({
                        ...p.taggedProduct,
                        imageUrl: p.taggedProduct.imageUrl || p.imageUrl
                    })}
                    activeOpacity={0.9}
                    style={styles.reviewCard}
                >
                    <WathiqScoreBadge score={p.taggedProduct.score} />
                    <View style={{ flex: 1, marginRight: 15, justifyContent: 'center' }}>
                        <Text style={styles.taggedProductName}>{p.taggedProduct.name}</Text>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', marginTop: 4 }}>
                            <Text style={styles.tapToView}>اضغط للتحليل والحفظ</Text>
                            <FontAwesome5 name="chevron-left" size={10} color={COLORS.accentGreen} style={{ marginRight: 4 }} />
                        </View>
                    </View>
                    <View style={styles.productIconPlaceholder}>
                        <FontAwesome5 name="wine-bottle" size={20} color={COLORS.textSecondary} />
                    </View>
                </TouchableOpacity>
            ) : null}
            {p.imageUrl ? (
                <TouchableOpacity onPress={() => onImagePress(p.imageUrl)}>
                    <Image source={{ uri: p.imageUrl }} style={styles.postImage} />
                </TouchableOpacity>
            ) : null}
        </View>
    );

    const JourneyContent = ({ post: p }) => (
        <View>
            <Text style={styles.postContent}>{p.content}</Text>
            {p.duration ? (
                <View style={styles.journeyMetaRow}>
                    <View style={styles.journeyBadge}>
                        <FontAwesome5 name="clock" size={12} color={COLORS.gold} />
                        <Text style={styles.journeyBadgeText}>المدة: {p.duration}</Text>
                    </View>
                </View>
            ) : null}
            {p.milestones && p.milestones.length > 0 ? (
                <JourneyTimeline milestones={p.milestones} />
            ) : (
                <View style={styles.beforeAfterContainer}>
                    <TouchableOpacity style={styles.baImageWrapper} onPress={() => p.beforeImage && onImagePress(p.beforeImage)}>
                        <Text style={styles.baLabel}>قبل</Text>
                        <Image source={{ uri: p.beforeImage }} style={styles.baImage} />
                    </TouchableOpacity>
                    <View style={styles.baDivider}><FontAwesome5 name="arrow-left" size={14} color={COLORS.textSecondary} /></View>
                    <TouchableOpacity style={styles.baImageWrapper} onPress={() => p.afterImage && onImagePress(p.afterImage)}>
                        <Text style={styles.baLabel}>بعد</Text>
                        <Image source={{ uri: p.afterImage }} style={styles.baImage} />
                    </TouchableOpacity>
                </View>
            )}
            <JourneyProductsList products={p.journeyProducts ||[]} />
        </View>
    );

    const QAContent = ({ post: p }) => (
        <View>
            <Text style={styles.qaTitle}>{p.title}</Text>
            <Text style={styles.postContent}>{p.content}</Text>
            {p.imageUrl ? (
                <TouchableOpacity onPress={() => onImagePress(p.imageUrl)} style={{ marginTop: 10 }}>
                    <Image source={{ uri: p.imageUrl }} style={styles.postImage} />
                </TouchableOpacity>
            ) : null}
        </View>
    );

    const RoutineProductPill = ({ product, onPress: onPillPress }) => {
        const imageUri = product.productImage || product.image || product.imageUrl;
        const name = product.productName || product.name || product.details || 'منتج';
        const score = product.oilGuardScore || product.score || product.analysisData?.oilGuardScore || 0;
        const type = product.productType || product.type || product.analysisData?.product_type || 'other';

        return (
            <TouchableOpacity style={styles.rpCard} onPress={onPillPress} activeOpacity={0.7}>
                <View style={styles.rpImageContainer}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.rpImage} />
                    ) : (
                        <FontAwesome5 name={type === 'sunscreen' ? 'sun' : 'wine-bottle'} size={16} color={COLORS.textDim} />
                    )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rpName} numberOfLines={1}>{name}</Text>
                    {score > 0 ? (
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                            <View style={[styles.rpScoreDot, { backgroundColor: score >= 80 ? COLORS.accentGreen : COLORS.gold }]} />
                            <Text style={styles.rpScoreText}>{score}%</Text>
                        </View>
                    ) : null}
                </View>
            </TouchableOpacity>
        );
    };

    const RoutineRateContent = ({ post: p }) => {
        let snapshot = p.routineSnapshot;
        if (typeof snapshot === 'string') {
            try { snapshot = JSON.parse(snapshot); } catch (e) { snapshot = {}; }
        }

        const rawAm = snapshot?.am || [];
        const rawPm = snapshot?.pm ||[];
        
        const handleProductPress = (prod) => {
            if (!onViewProduct) return;
            onViewProduct({
                ...prod,
                id: prod.id || 'unknown',
                productName: prod.productName || prod.name || 'منتج',
                productImage: prod.productImage || prod.image || null,
                marketingClaims: prod.marketingClaims ||[],
                analysisData: prod.analysisData || {
                    oilGuardScore: prod.oilGuardScore || prod.score || 0,
                    product_type: prod.productType || prod.type || 'other',
                    detected_ingredients: prod.detected_ingredients || prod.ingredients || [],
                    user_specific_alerts:[]
                }
            });
        };
        
        const renderPeriod = (title, icon, color, stepsInput) => {
            const steps = Array.isArray(stepsInput) ? stepsInput :[];
            if (steps.length === 0) return null;
            
            const allProducts =[];
            
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
                <View style={[styles.routinePeriodContainer, { borderColor: color + '30', backgroundColor: color + '05' }]}>
                    <View style={styles.routinePeriodHeader}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                            <Feather name={icon} size={14} color={color} />
                            <Text style={[styles.routinePeriodTitle, { color: color }]}>{title}</Text>
                        </View>
                        <Text style={styles.routineStepCount}>{allProducts.length} منتجات</Text>
                    </View>
                    {allProducts.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 10, gap: 8 }}>
                            {allProducts.map((prod, i) => (
                                <View key={`${title}-${i}`} style={{ alignItems: 'center', flexDirection: 'row-reverse' }}>
                                    <RoutineProductPill product={prod} onPress={() => handleProductPress(prod)} />
                                </View>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={styles.routineEmptyText}>لا توجد منتجات مسجلة</Text>
                    )}
                </View>
            );
        };

        return (
            <View>
                <Text style={styles.postContent}>{p.content}</Text>
                <View style={{ gap: 10, marginTop: 5 }}>
                    {renderPeriod('الصباح', 'sun', COLORS.gold, rawAm)}
                    {renderPeriod('المساء', 'moon', COLORS.purple, rawPm)}
                </View>
            </View>
        );
    };

    // --- TIPS CONTENT: EXPO 54 READY (Next API & AV) ---
    const TipsContent = ({ post: p }) => {
        const router = useRouter();
        const[isExpanded, setIsExpanded] = useState(false);
        const [isPlaying, setIsPlaying] = useState(false);
        const[isLoading, setIsLoading] = useState(false);
        const [sound, setSound] = useState(null);
        
        const isMounted = useRef(true);
        const soundRef = useRef(null);

        const [position, setPosition] = useState(0);
        const [duration, setDuration] = useState(0);
        const [isSeeking, setIsSeeking] = useState(false);
        const[cloudAudioUrl, setCloudAudioUrl] = useState(p.audio_url || null);

        const ELEVENLABS_API_KEY = "sk_0725f26efa493f9a6306ef9819586eb4f41458dc6d804589";
        const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
        const validTitle = p.title && p.title !== 'null' && p.title.trim() !== '' ? p.title : null;

        useEffect(() => {
            const configureAudio = async () => {
                try {
                    await Audio.setAudioModeAsync({
                        allowsRecordingIOS: false,
                        staysActiveInBackground: false,
                        playsInSilentModeIOS: true,
                        shouldDuckAndroid: true,
                        playThroughEarpieceAndroid: false,
                        interruptionModeIOS: 1, 
                        interruptionModeAndroid: 1, 
                    });
                } catch (error) {
                    console.log('Error configuring audio:', error);
                }
            };
            configureAudio();
        },[]);

        useEffect(() => {
            isMounted.current = true;
            return () => {
                isMounted.current = false;
                if (soundRef.current) {
                    soundRef.current.unloadAsync();
                    soundRef.current = null;
                }
                if (globalSound === soundRef.current) {
                    globalSound = null;
                }
            };
        },[]);

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

                if (soundRef.current) {
                    await soundRef.current.unloadAsync();
                }

                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: true },
                    null
                );
                
                soundRef.current = newSound;
                setSound(newSound);
                globalSound = newSound;

                if (isMounted.current) {
                    setIsPlaying(true);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("🔴 Error in loadAndPlay:", err);
                if (isMounted.current) {
                    setIsLoading(false);
                    setIsPlaying(false);
                    Alert.alert("خطأ", "تعذر تشغيل الملف الصوتي.");
                }
            }
        };

        const uploadToSupabaseAndSave = async (base64Data, postId) => {
            try {
                const fileName = `tip_${postId}.mp3`;
                const { error: uploadError } = await supabase.storage
                    .from('audio-tips')
                    .upload(fileName, decode(base64Data), {
                        contentType: 'audio/mpeg',
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('audio-tips')
                    .getPublicUrl(fileName);

                const publicUrl = publicUrlData.publicUrl;

                const { error: dbError } = await supabase
                    .from('posts')
                    .update({ audio_url: publicUrl })
                    .eq('id', postId);

                if (dbError) throw dbError;
                if (isMounted.current) setCloudAudioUrl(publicUrl);

            } catch (err) {
                console.error("⚠️ Background Upload Failed:", err.message);
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
                // 1. Prepare Next API Directory & File
                const audioDir = new Directory(Paths.cache, 'audio_tips');
                if (!audioDir.exists) {
                    audioDir.create();
                }
                
                const filename = `tip_${p.id}.mp3`;
                const cachedFile = new File(audioDir, filename);

                // 2. Check local Next API Cache
                if (cachedFile.exists) {
                    console.log("📱 Playing from Local File Cache");
                    await loadAndPlay(cachedFile.uri);
                    return;
                }

                // 3. Play from Cloud if available
                if (cloudAudioUrl) {
                    console.log("☁️ Playing from Supabase URL");
                    await loadAndPlay(cloudAudioUrl);
                    return;
                }

                // 4. Fallback: Generate from ElevenLabs
                console.log("💰 Generating via ElevenLabs...");
                const fullText = `${validTitle ? validTitle + '. ' : ''}${p.content}`;
                const safeText = fullText.substring(0, 2500);

                const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'xi-api-key': ELEVENLABS_API_KEY 
                    },
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
                        
                        // 5. Save locally using Next API (Typed Array required)
                        const binaryData = new Uint8Array(decode(base64data));
                        cachedFile.write(binaryData);
                        
                        await loadAndPlay(cachedFile.uri);

                        // Upload to Supabase in background
                        uploadToSupabaseAndSave(base64data, p.id);
                        
                    } catch (e) {
                        console.error("Write/Play Error:", e);
                        if (isMounted.current) setIsLoading(false);
                    }
                };
                
                reader.onerror = (error) => {
                    console.error("FileReader error:", error);
                    if (isMounted.current) setIsLoading(false);
                };
                
                reader.readAsDataURL(blob);

            } catch (e) {
                console.error("🔴 Speech Handler Error:", e);
                if (isMounted.current) {
                    setIsLoading(false);
                    setIsPlaying(false);
                    Alert.alert("خطأ", "تعذر تشغيل الصوت، يرجى التحقق من الانترنت.");
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
            <View style={{ marginBottom: 5 }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <FontAwesome5 name="check-circle" solid size={12} color={COLORS.info} />
                    <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.info }}>نصيحة موثقة من الإدارة</Text>
                </View>

                {validTitle && (
                    <Text style={styles.tipsExternalTitle}>{validTitle}</Text>
                )}

                <View style={styles.pillContainer}>
                    <View style={styles.pillMain}>
                        <TouchableOpacity 
                            onPress={handleSpeech} 
                            disabled={isLoading} 
                            style={styles.playBtn}
                            activeOpacity={0.7}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Ionicons 
                                    name={isPlaying ? "pause" : "play"} 
                                    size={22} 
                                    color="#FFF" 
                                    style={{ marginLeft: 2 }} 
                                />
                            )}
                        </TouchableOpacity>

                        <View style={styles.pillInfo}>
                            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 2 }}>
                                <Text style={styles.pillSubtitle}></Text>
                                <Text style={styles.timerText}>{formatTime(position)} / {formatTime(duration)}</Text>
                            </View>
                            
                            <Slider
                                style={{ width: '100%', height: 30 }}
                                minimumValue={0}
                                maximumValue={duration > 0 ? duration : 1}
                                value={position}
                                onSlidingStart={onSlidingStart}
                                onSlidingComplete={onSlidingComplete}
                                minimumTrackTintColor={COLORS.info}
                                maximumTrackTintColor={COLORS.border}
                                thumbTintColor={COLORS.info}
                                inverted={true}
                                disabled={!sound || isLoading}
                            />
                        </View>

                        <TouchableOpacity 
                            onPress={() => setIsExpanded(!isExpanded)}
                            style={[styles.readToggle, isExpanded && { backgroundColor: COLORS.info + '15' }]}
                            activeOpacity={0.7}
                        >
                            <Feather name={isExpanded ? "chevron-up" : "book-open"} size={18} color={COLORS.info} />
                            <Text style={styles.readToggleText}>{isExpanded ? "إغلاق" : "قراءة"}</Text>
                        </TouchableOpacity>
                    </View>

                    {isExpanded && (
                        <View style={styles.expandedContent}>
                            {p.imageUrl && (
                                <Image 
                                    source={{ uri: p.imageUrl }} 
                                    style={styles.pillImage}
                                    resizeMode="cover"
                                />
                            )}
                            <Text style={styles.pillDescription}>{p.content}</Text>
                            <TouchableOpacity 
                                style={styles.pillCta} 
                                onPress={() => router.push('/oilguard')}
                                activeOpacity={0.8}
                            >
                                <FontAwesome5 name="search" size={14} color="#FFF" />
                                <Text style={styles.pillCtaText}>إفحصي منتجك الآن</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    // --- MAIN RENDER LOGIC ---
    const isLiked = post.likes && post.likes.includes(currentUser?.uid);
    const matchData = useMemo(() => {
        if (currentUser?.settings && post.authorSettings) {
            return calculateBioMatch(currentUser.settings, post.authorSettings);
        }
        return null;
    }, [currentUser?.settings, post.authorSettings]);

    const getTypeConfig = () => {
        switch (post.type) {
            case 'review': return { icon: 'star', color: COLORS.accentGreen, label: 'تجربة' };
            case 'journey': return { icon: 'hourglass-half', color: COLORS.gold, label: 'رحلة' };
            case 'qa': return { icon: 'question-circle', color: COLORS.blue, label: 'سؤال' };
            case 'routine_rate': return { icon: 'clipboard-list', color: COLORS.purple, label: 'تقييم' };
            case 'tips': return { icon: 'lightbulb', color: COLORS.info, label: 'معلومة' };
            default: return { icon: 'pen', color: COLORS.textSecondary, label: 'عام' };
        }
    };
    const config = getTypeConfig();

    return (
        <View style={styles.cardBase}>
            <View style={styles.cardHeader}>
                <TouchableOpacity
                    style={styles.userInfo}
                    onPress={() => onProfilePress && onProfilePress(post.userId, {
                        ...(post.authorSettings || {}),
                        name: post.userName || 'مستخدم وثيق'
                    })}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarInitial}>{post.userName?.charAt(0) || 'U'}</Text>
                    </View>
                    <View>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.userName}>{post.userName}</Text>
                            {post.authorSettings?.skinType && (
                                <View style={styles.bioBadge}>
                                    <Text style={styles.bioBadgeText}>{post.authorSettings.skinType}</Text>
                                </View>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.timestamp, { color: config.color, fontFamily: 'Tajawal-Bold' }]}>{config.label}</Text>
                            <Text style={styles.timestamp}>
                                • {formatRelativeTime(post.createdAt)}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                {post.userId === currentUser?.uid && (
                    <TouchableOpacity onPress={() => onDelete(post.id)}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                )}
            </View>

            {matchData && matchData.score > 20 ? (
                <View style={[styles.matchIndicator, { backgroundColor: matchData.color + '15', borderColor: matchData.color + '30' }]}>
                    <FontAwesome5 name="check-double" size={10} color={matchData.color} />
                    <Text style={[styles.matchText, { color: matchData.color }]}>
                        {matchData.score}% • {matchData.label}
                        {matchData.matches && matchData.matches.length > 0 ? ` (${matchData.matches.join(' + ')})` : ''}
                    </Text>
                </View>
            ) : null}

            <View style={{ marginBottom: 10 }}>
                {post.type === 'review' && <ReviewContent post={post} />}
                {post.type === 'journey' && <JourneyContent post={post} />}
                {post.type === 'qa' && <QAContent post={post} />}
                {post.type === 'routine_rate' && <RoutineRateContent post={post} />}
                {post.type === 'tips' && <TipsContent post={post} />}
            </View>

            <View style={styles.cardFooter}>
                <TouchableOpacity 
                    style={[styles.actionButton, isLiked && { backgroundColor: COLORS.accentGreen + '15', borderColor: COLORS.accentGreen + '30' }]} 
                    onPress={() => onInteract(post.id, 'like')}
                >
                    <FontAwesome5 name={isLiked ? "heart" : "heart"} solid={isLiked} size={16} color={isLiked ? COLORS.danger : COLORS.textSecondary} />
                    <Text style={[styles.statText, isLiked && { color: COLORS.danger }]}>{post.likesCount || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => onOpenComments(post)}>
                    <FontAwesome5 name="comment-alt" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.actionText}>الردود</Text>
                    <Text style={styles.statText}>{post.commentsCount || 0}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const createStyles = (COLORS) => StyleSheet.create({
    cardBase: { 
        backgroundColor: COLORS.card, 
        marginHorizontal: 15, 
        marginBottom: 15, 
        borderRadius: 20, 
        padding: 15, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.2, 
        shadowRadius: 8, 
        elevation: 3 
    },
    cardHeader: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 12 
    },
    userInfo: { 
        flexDirection: 'row-reverse', 
        gap: 10, 
        alignItems: 'center' 
    },
    avatarPlaceholder: { 
        width: 36, 
        height: 36, 
        borderRadius: 18, 
        backgroundColor: COLORS.background, 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderWidth: 1, 
        borderColor: COLORS.border 
    },
    avatarInitial: { 
        fontFamily: 'Tajawal-Bold', 
        color: COLORS.accentGreen 
    },
    userName: { 
        fontFamily: 'Tajawal-Bold', 
        color: COLORS.textPrimary, 
        fontSize: 14, 
        textAlign: 'right' 
    },
    timestamp: { 
        fontFamily: 'Tajawal-Regular', 
        color: COLORS.textSecondary, 
        fontSize: 11, 
        textAlign: 'right' 
    },
    postContent: { 
        fontFamily: 'Tajawal-Regular', 
        color: COLORS.textPrimary, 
        fontSize: 14, 
        textAlign: 'right', 
        lineHeight: 22, 
        marginBottom: 10 
    },
    cardFooter: { 
        flexDirection: 'row-reverse', 
        borderTopWidth: 1, 
        borderTopColor: COLORS.border, 
        paddingTop: 10, 
        gap: 10 
    },
    actionButton: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 6, 
        paddingVertical: 6, 
        paddingHorizontal: 12, 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: 'transparent' 
    },
    actionText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 12, 
        color: COLORS.textSecondary 
    },
    statText: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 10, 
        color: COLORS.textDim 
    },
    reviewCard: { 
        flexDirection: 'row-reverse', 
        backgroundColor: COLORS.background, 
        borderRadius: 16, 
        padding: 12, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        marginBottom: 10, 
        alignItems: 'center' 
    },
    productIconPlaceholder: { 
        width: 40, 
        height: 40, 
        borderRadius: 12, 
        backgroundColor: COLORS.card, 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderWidth: 1, 
        borderColor: COLORS.border 
    },
    taggedProductName: { 
        fontFamily: 'Tajawal-Bold', 
        color: COLORS.textPrimary, 
        fontSize: 14, 
        textAlign: 'right', 
        marginBottom: 2 
    },
    tapToView: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 11, 
        color: COLORS.accentGreen 
    },
    bioBadge: { 
        backgroundColor: COLORS.background, 
        paddingHorizontal: 6, 
        paddingVertical: 2, 
        borderRadius: 4, 
        borderWidth: 1, 
        borderColor: COLORS.border 
    },
    bioBadgeText: { 
        color: COLORS.textSecondary, 
        fontSize: 10, 
        fontFamily: 'Tajawal-Regular' 
    },
    matchIndicator: { 
        flexDirection: 'row-reverse', 
        gap: 6, 
        backgroundColor: COLORS.accentGreen + '15', 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        marginHorizontal: 0, 
        marginTop: -5, 
        marginBottom: 10, 
        alignSelf: 'flex-end', 
        borderRadius: 6, 
        borderWidth: 1, 
        borderColor: COLORS.accentGreen + '30' 
    },
    matchText: { 
        color: COLORS.accentGreen, 
        fontSize: 10, 
        fontFamily: 'Tajawal-Bold' 
    },
    qaTitle: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 16, 
        color: COLORS.textPrimary, 
        textAlign: 'right', 
        marginBottom: 6 
    },
    journeyMetaRow: { 
        flexDirection: 'row-reverse', 
        marginBottom: 10 
    },
    journeyBadge: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 6, 
        backgroundColor: COLORS.gold + '1A', 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 8 
    },
    journeyBadgeText: { 
        color: COLORS.gold, 
        fontSize: 12, 
        fontFamily: 'Tajawal-Bold' 
    },
    timelineContainer: { 
        marginTop: 10, 
        height: 180 
    },
    timelineScroll: { 
        flexDirection: 'row-reverse', 
        paddingHorizontal: 5, 
        alignItems: 'center' 
    },
    timelineStep: { 
        alignItems: 'center', 
        marginHorizontal: 5, 
        width: 110 
    },
    timelineIndicator: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        width: '100%', 
        height: 20, 
        justifyContent: 'center', 
        marginBottom: 5, 
        position: 'relative' 
    },
    dot: { 
        width: 10, 
        height: 10, 
        borderRadius: 5, 
        backgroundColor: COLORS.gold, 
        zIndex: 2 
    },
    connectingLine: { 
        position: 'absolute', 
        right: '50%', 
        width: 120, 
        height: 2, 
        backgroundColor: COLORS.gold + '4D', 
        zIndex: 1 
    },
    stepCard: { 
        width: 110, 
        height: 140, 
        backgroundColor: COLORS.card, 
        borderRadius: 16, 
        padding: 4, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        overflow: 'hidden' 
    },
    stepImage: { 
        width: '100%', 
        height: 100, 
        borderRadius: 12, 
        backgroundColor: COLORS.background 
    },
    stepLabelBox: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    stepLabel: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 11, 
        color: COLORS.textPrimary 
    },
    sectionLabel: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 12, 
        color: COLORS.textSecondary, 
        marginBottom: 8, 
        textAlign: 'right' 
    },
    journeyProductCard: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        backgroundColor: COLORS.background, 
        borderRadius: 12, 
        padding: 10, 
        marginRight: 10, 
        width: 160, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        gap: 10 
    },
    jpName: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 11, 
        color: COLORS.textPrimary, 
        textAlign: 'right' 
    },
    jpPrice: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 10, 
        color: COLORS.gold, 
        textAlign: 'right' 
    },
    scoreDot: { 
        width: 8, 
        height: 8, 
        borderRadius: 4 
    },
    beforeAfterContainer: { 
        flexDirection: 'row', 
        height: 120, 
        marginBottom: 10, 
        borderRadius: 12, 
        overflow: 'hidden' 
    },
    baImageWrapper: { 
        flex: 1, 
        position: 'relative', 
        backgroundColor: COLORS.card 
    },
    baImage: { 
        width: '100%', 
        height: '100%' 
    },
    baPlaceholder: { 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    baLabel: { 
        position: 'absolute', 
        bottom: 5, 
        right: 5, 
        backgroundColor: 'rgba(0,0,0,0.6)', 
        color: '#fff', 
        fontSize: 10, 
        padding: 4, 
        borderRadius: 4, 
        overflow: 'hidden', 
        fontFamily: 'Tajawal-Bold', 
        zIndex: 1 
    },
    baDivider: { 
        width: 20, 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: COLORS.card 
    },
    postImage: { 
        width: '100%', 
        height: 200, 
        borderRadius: 12, 
        marginTop: 10 
    },
    routinePeriodContainer: { 
        borderRadius: 12, 
        borderWidth: 1, 
        padding: 10, 
        marginBottom: 4 
    },
    routinePeriodHeader: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        marginBottom: 8, 
        paddingHorizontal: 4 
    },
    routinePeriodTitle: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 12 
    },
    routineStepCount: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 10, 
        color: COLORS.textDim 
    },
    rpCard: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        backgroundColor: COLORS.card, 
        borderRadius: 10, 
        padding: 6, 
        paddingRight: 8, 
        width: 160, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        marginBottom: 0, 
        marginLeft: 8 
    },
    rpImageContainer: { 
        width: 32, 
        height: 32, 
        borderRadius: 8, 
        backgroundColor: COLORS.background, 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginLeft: 8, 
        overflow: 'hidden' 
    },
    rpImage: { 
        width: '100%', 
        height: '100%' 
    },
    rpName: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 11, 
        color: COLORS.textPrimary, 
        textAlign: 'right' 
    },
    rpScoreDot: { 
        width: 6, 
        height: 6, 
        borderRadius: 3 
    },
    rpScoreText: { 
        fontSize: 9, 
        color: COLORS.textSecondary, 
        fontFamily: 'Tajawal-Regular' 
    },
    routineEmptyText: { 
        textAlign: 'center', 
        color: COLORS.textDim, 
        fontSize: 11, 
        fontStyle: 'italic', 
        padding: 10 
    },
    pillContainer: { 
        backgroundColor: COLORS.card, 
        borderRadius: 24, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        overflow: 'hidden', 
        marginTop: 5 
    },
    pillMain: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        padding: 8, 
        height: 64 
    },
    playBtn: { 
        width: 46, 
        height: 46, 
        borderRadius: 23, 
        backgroundColor: COLORS.info, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginLeft: 12 
    },
    pillInfo: { 
        flex: 1, 
        justifyContent: 'center', 
        paddingRight: 8 
    },
    pillSubtitle: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 10, 
        color: COLORS.textSecondary, 
        textAlign: 'right', 
        marginBottom: -2 
    },
    timerText: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 9, 
        color: COLORS.textDim 
    },
    readToggle: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 6, 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        borderRadius: 16 
    },
    readToggleText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 12, 
        color: COLORS.info 
    },
    tipsExternalTitle: { 
        fontFamily: 'Tajawal-ExtraBold', 
        fontSize: 18, 
        color: COLORS.textPrimary, 
        textAlign: 'right', 
        lineHeight: 26, 
        marginBottom: 12, 
        paddingHorizontal: 4 
    },
    expandedContent: { 
        padding: 15, 
        borderTopWidth: 1, 
        borderTopColor: COLORS.border, 
        backgroundColor: COLORS.background 
    },
    pillImage: { 
        width: '100%', 
        height: 180, 
        borderRadius: 12, 
        marginBottom: 12 
    },
    pillDescription: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 14, 
        color: COLORS.textPrimary, 
        textAlign: 'right', 
        lineHeight: 22, 
        marginBottom: 15 
    },
    pillCta: { 
        backgroundColor: COLORS.info, 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingVertical: 10, 
        borderRadius: 12, 
        gap: 8 
    },
    pillCtaText: { 
        fontFamily: 'Tajawal-Bold', 
        color: '#FFF', 
        fontSize: 14 
    },
});

export default React.memo(PostCard);