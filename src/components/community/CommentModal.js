import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, Modal, ActivityIndicator,
    FlatList, Platform, StyleSheet,
    Animated, LayoutAnimation, Pressable, Keyboard, Image, Dimensions, Easing
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppTextInput from '../common/AppTextInput';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker'; 

// --- CONFIG & SERVICES ---
import { supabase } from '../../config/supabase';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { AlertService } from '../../services/alertService';
import { deleteComment, awardInstantPoints, COMMUNITY_POINTS, saveProductToShelf } from '../../services/communityService';
import { uploadImageToCloudinary } from '../../services/imageService';
import FullImageViewer from '../common/FullImageViewer';
import CatalogProductPickerModal from '../catalog/CatalogProductPickerModal';
import ProductActionSheet from './ProductActionSheet';
import WathiqScoreBadge from '../common/WathiqScoreBadge';
import { t, interpolate } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { AVATARS } from '../../constants/avatars';
// ... (Keep existing sendPushNotification & getRandomColor & getRandomPopColor helpers exactly as they are) ...

const sendPushNotification = async (targetUserId, title, body, dataPayload) => {
    if (!targetUserId) return;
    try {
        const userDocRef = doc(db, 'profiles', targetUserId);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) return;
        const userData = userSnap.data();
        const pushToken = userData.expoPushToken;
        if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ to: pushToken, sound: 'default', title, body, data: dataPayload }),
        });
    } catch (err) { console.error("Notification Error:", err); }
};

const getRandomColor = (name, themeColors) => {
    const C = themeColors || DEFAULT_COLORS;
    if (!name) return C.card;
    const colorOptions = [C.accentGreen || '#5A9C84', '#D97706', '#059669', '#0891B2', '#7C3AED', '#BE123C'];
    const charCode = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colorOptions[charCode % colorOptions.length];
};

const getRandomPopColor = (themeColors) => {
    const C = themeColors || DEFAULT_COLORS;
    return Math.random() > 0.5 ? C.danger : C.accentGreen;
};

const QUICK_REPLIES = ["quick_reply_1", "quick_reply_2", "quick_reply_3", "quick_reply_4", "quick_reply_5"];

// ==================================================================
// 2. COMPONENT: COMMENT ROW (Updated for Images)
// ==================================================================

const CommentRow = React.memo(({ item, currentUser, onDelete, onReply, onProfilePress, isReply = false, onImagePress, onProductPress, COLORS, styles }) => {
    const C = COLORS || DEFAULT_COLORS;
    const language = useCurrentLanguage();
    const isMe = currentUser?.uid && item.userId === currentUser.uid;
    const [isLiked, setIsLiked] = useState(item.isLikedByCurrentUser || false);
    const [likesCount, setLikesCount] = useState(item.likesCount || 0);
    const [popHeartColor, setPopHeartColor] = useState(C.danger);

    const scaleAnim = useRef(new Animated.Value(1)).current;
    const popHeartScale = useRef(new Animated.Value(0)).current;
    const popHeartOpacity = useRef(new Animated.Value(0)).current;
    const lastTap = useRef(null);

    useEffect(() => {
        setIsLiked(item.isLikedByCurrentUser);
        setLikesCount(item.likesCount);
    }, [item.isLikedByCurrentUser, item.likesCount]);

    const handleLike = async (forceLike = false) => {
        if (!currentUser?.uid) return;
        if (forceLike && isLiked) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return;
        }
        Haptics.selectionAsync();
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
        ]).start();

        const newStatus = forceLike ? true : !isLiked;
        setIsLiked(newStatus);
        setLikesCount(prev => newStatus ? prev + 1 : prev - 1);

        try {
            if (newStatus) {
                await supabase.from('comment_likes').insert([{ comment_id: item.id, user_id: currentUser.uid }]);
            } else {
                await supabase.from('comment_likes').delete().match({ comment_id: item.id, user_id: currentUser.uid });
            }
        } catch (error) { console.error("Like error", error); }
    };

    const triggerPopAnimation = () => {
        popHeartScale.setValue(0.5);
        popHeartOpacity.setValue(1);
        Animated.parallel([
            Animated.spring(popHeartScale, { toValue: 1.2, friction: 6, useNativeDriver: true }),
            Animated.sequence([
                Animated.delay(400),
                Animated.timing(popHeartOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
            ])
        ]).start();
    };

    const handleDoubleTap = () => {
        const now = Date.now();
        if (lastTap.current && (now - lastTap.current) < 300) {
            setPopHeartColor(getRandomPopColor(C));
            if (!isLiked) handleLike(true);
            else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            triggerPopAnimation();
        } else {
            lastTap.current = now;
        }
    };

    const handleLongPress = () => {
        if (!isMe) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        AlertService.delete(isReply ? t('community_comment_delete_reply', language) : t('community_comment_delete_comment', language), t('community_comment_delete_confirm', language), () => onDelete(item.id));
    };

    const timeAgo = item.createdAt
        ? formatDistanceToNow(new Date(item.createdAt), { locale: language === 'ar' ? ar : enUS, addSuffix: false })
        : t('community_comment_now', language);

    return (
        <View style={[styles.rowContainer, isReply && styles.rowContainerReply]}>
            {isReply && <View style={styles.threadCurve} />}
            <TouchableOpacity
    activeOpacity={0.8}
    onPress={() => onProfilePress && onProfilePress(item.userId, item.authorSettings)}
    style={[styles.avatarWrap, isReply && styles.avatarWrapSmall]}
>
    <LinearGradient
        colors={[getRandomColor(item.userName, C), C.card]}
        style={[styles.avatar, isReply && styles.avatarSmall, { overflow: 'hidden' }]}
    >
        {(() => {
    const isMe = currentUser?.uid && item.userId === currentUser.uid;
    const liveAvatarId = currentUser?.settings?.avatarId || currentUser?.avatarId;
    const avatarKey = isMe 
        ? (liveAvatarId || item.authorSettings?.avatarId || item.userAvatarId || item.avatarId)
        : (item.authorSettings?.avatarId || item.userAvatarId || item.avatarId);
    
    return AVATARS[avatarKey] ? (
        <Image 
            source={AVATARS[avatarKey]} 
            style={{ width: '100%', height: '100%', borderRadius: isReply ? 14 : 19 }} 
        />
    ) : (
        <Text style={[styles.avatarText, isReply && { fontSize: 12 }]}>{item.userName?.charAt(0).toUpperCase()}</Text>
    );
})()}
    </LinearGradient>

    {(item.authorSettings?.isFirstGen || item.isFirstGen || (item.userId === currentUser?.uid && currentUser?.isFirstGen)) && (
        <View style={[styles.firstGenCommentPin, isReply && styles.firstGenCommentPinSmall, { borderColor: C.card }]}>
            <LinearGradient
                colors={['#FDE047', '#F59E0B', '#B45309']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.firstGenPinGradient}
            >
                <Text style={[styles.firstGenCommentPinText, isReply && { fontSize: 6.5 }]}>1ج</Text>
            </LinearGradient>
        </View>
    )}
</TouchableOpacity>

            <View style={styles.contentContainer}>
                <Pressable
                    onPress={handleDoubleTap}
                    onLongPress={handleLongPress}
                    delayLongPress={300}
                    style={({ pressed }) => [styles.bubble, isReply && styles.bubbleReply, pressed && { opacity: 0.95 }]}
                >
                    <View style={styles.bubbleHeader}>
                        <Text style={styles.userName}>{item.userName}</Text>
                        {isMe && <View style={styles.meBadge}><Text style={styles.meBadgeText}>{t('community_comment_me_badge', language)}</Text></View>}
                    </View>

                    {/* --- TEXT CONTENT --- */}
                    {item.text ? <Text style={styles.commentText}>{item.text}</Text> : null}

                    {/* --- ATTACHED PRODUCT CARD --- */}
                    {item.product && (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => onProductPress && onProductPress(item.product)}
                            style={styles.commentProductCard}
                        >
                            <View style={styles.commentProductThumbWrap}>
                                {item.product.image ? (
                                    <Image source={{ uri: item.product.image }} style={styles.commentProductThumb} resizeMode="contain" />
                                ) : (
                                    <FontAwesome5 name="pump-soap" size={16} color={C.textDim} />
                                )}
                            </View>

                            <View style={styles.commentProductMeta}>
                                {item.product.brand ? (
                                    <Text style={styles.commentProductBrand} numberOfLines={1}>{item.product.brand}</Text>
                                ) : null}
                                <Text style={styles.commentProductName} numberOfLines={2}>{item.product.name}</Text>
                                <View style={styles.commentProductActionHint}>
                                    <Text style={styles.commentProductActionText}>{language === 'ar' ? 'معاينة التحليل' : 'View analysis'}</Text>
                                    <Feather name={language === 'ar' ? 'arrow-left' : 'arrow-right'} size={11} color={C.accentGreen} />
                                </View>
                            </View>

                            {item.product.score ? (
                                <WathiqScoreBadge score={item.product.score} size={36} />
                            ) : null}
                        </TouchableOpacity>
                    )}

                    {/* --- IMAGE CONTENT (NEW) --- */}
                    {item.imageUrl && (
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => onImagePress && onImagePress(item.imageUrl)}
                            style={styles.commentImageContainer}
                        >
                            <Image
                                source={{ uri: item.imageUrl }}
                                style={styles.commentImage}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    )}

                    <Animated.View style={[styles.popHeartContainer, { transform: [{ scale: popHeartScale }], opacity: popHeartOpacity }]} pointerEvents="none">
                        <Ionicons name="heart" size={50} color={popHeartColor} style={styles.popHeartShadow} />
                    </Animated.View>
                </Pressable>

                <View style={styles.actionBar}>
                    <Text style={styles.timeText}>{timeAgo}</Text>
                    <TouchableOpacity onPress={() => handleLike(false)} style={styles.actionBtn}>
                        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={14} color={isLiked ? C.danger : C.textSecondary} />
                        </Animated.View>
                        {likesCount > 0 && <Text style={[styles.actionText, isLiked && { color: C.danger }]}>{likesCount}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onReply(item)} style={styles.actionBtn}>
                        <Text style={styles.actionText}>{t('community_comment_reply_btn', language)}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

// ==================================================================
// 3. MAIN COMPONENT: COMMENT MODAL
// ==================================================================
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CommentModal = ({ visible, onClose, post, currentUser, onProfilePress, onViewProduct }) => {
    const { colors } = useTheme();
    const language = useCurrentLanguage();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const handleClose = () => {
        Keyboard.dismiss();
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished && onClose) onClose();
        });
    };
    const [comment, setComment] = useState('');
    const [commentsList, setCommentsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null);

    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isProductPickerVisible, setIsProductPickerVisible] = useState(false);
    const [viewingProduct, setViewingProduct] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const handleProductPress = useCallback((product) => {
        if (!product) return;
        
        console.log("[DEBUG CommentModal] Tapped product:", product);

        const resolvedType = product.productType || product.type || product.category?.id || product.analysisData?.product_type || 'other';
        
        const formattedProduct = {
            ...product,
            id: product.id || 'unknown',
            name: product.name || product.productName || t('community_product', language),
            productName: product.productName || product.name || t('community_product', language),
            image: product.imageUrl || product.productImage || product.image || null,
            imageUrl: product.imageUrl || product.productImage || product.image || null,
            productImage: product.productImage || product.imageUrl || product.image || null,
            score: product.score || product.real_score || product.analysisData?.oilGuardScore || 0,
            productType: resolvedType,
            type: resolvedType,
            marketingClaims: product.marketingClaims || product.claims || [],
            ingredients: product.ingredients || product.analysisData?.detected_ingredients || [],
            analysisData: product.analysisData || null
        };
        
        console.log("[DEBUG CommentModal] Formatted for ActionSheet:", formattedProduct);

        if (onViewProduct) {
            onViewProduct(formattedProduct);
        }
        setViewingProduct(formattedProduct);
    }, [onViewProduct, language]);

    const handleSaveToShelf = useCallback(async (productToSave) => {
        if (!currentUser?.uid || !productToSave) return;
        try {
            await saveProductToShelf(currentUser.uid, productToSave);
            AlertService.success(t('community_saved_title', language), t('community_saved_message', language));
            setViewingProduct(null);
        } catch (e) {
            console.error("Failed to save to shelf from comment:", e);
        }
    }, [currentUser?.uid, language]);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, (e) => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            const h = Platform.OS === 'ios'
                ? e.endCoordinates.height
                : SCREEN_HEIGHT - e.endCoordinates.screenY;
            setKeyboardHeight(h);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setKeyboardHeight(0);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const footerBottomPadding = keyboardHeight > 0
        ? 8
        : Math.max(insets.bottom, 10);

    const flatListRef = useRef();
    const inputRef = useRef();

    const structuredComments = useMemo(() => {
        const parents = commentsList.filter(c => !c.parentId);
        const replies = commentsList.filter(c => c.parentId);
        let result = [];
        parents.forEach(parent => {
            result.push({ ...parent, type: 'parent' });
            replies.filter(r => r.parentId === parent.id).forEach(reply => {
                result.push({ ...reply, type: 'reply' });
            });
        });
        return result;
    }, [commentsList]);

    const normalizeComment = (row, myLikesSet = null) => {
        let isLiked = false;
        if (myLikesSet) isLiked = myLikesSet.has(row.id);
        const taggedProduct = row.author_snapshot?.taggedProduct || row.product_snapshot || row.product_data || row.product || null;
        return {
            id: row.id,
            text: row.content,
            imageUrl: row.image_url,
            product: taggedProduct,
            createdAt: row.created_at,
            userId: row.firebase_user_id,
            parentId: row.parent_id,
            userName: row.author_snapshot?.name || t('community_comment_default_user', language),
            authorSettings: row.author_snapshot || {},
            likesCount: row.likes_count || 0,
            isLikedByCurrentUser: isLiked
        };
    };

    useEffect(() => {
        if (!post?.id || !visible) return;
        fetchComments();

        const channel = supabase.channel(`comments:${post.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
                (payload) => {
                    if (payload.new.firebase_user_id === currentUser.uid) return;
                    const newComment = normalizeComment(payload.new);
                    setCommentsList((prev) => {
                        if (prev.some(c => c.id === newComment.id)) return prev;
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        return [...prev, newComment];
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'comments' },
                (payload) => {
                    setCommentsList((prev) => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        return prev.filter(c => c.id !== payload.old.id);
                    });
                }
            )
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [post?.id, visible]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const { data: commentsData, error } = await supabase
                .from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
            if (error) throw error;

            const commentIds = commentsData.map(c => c.id);
            const myLikesSet = new Set();
            if (commentIds.length > 0 && currentUser?.uid) {
                const { data: likesData } = await supabase.from('comment_likes').select('comment_id').eq('user_id', currentUser.uid).in('comment_id', commentIds);
                likesData?.forEach(like => myLikesSet.add(like.comment_id));
            }
            setCommentsList(commentsData.map(row => normalizeComment(row, myLikesSet)));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    // --- IMAGE PICKER ---
    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false, // <-- Disabled cropping
                quality: 0.7,
            });
            if (!result.canceled) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            AlertService.error(t('community_comment_error_title', language), t('community_comment_error_gallery', language));
        }
    };

    const handleInitiateReply = (targetComment) => {
        const rootParentId = targetComment.parentId || targetComment.id;
        setReplyingTo({ id: targetComment.id, parentId: rootParentId, userName: targetComment.userName, targetUserId: targetComment.userId });
        Haptics.selectionAsync();
        inputRef.current?.focus();
    };

    const cancelReply = () => {
        setReplyingTo(null);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Keyboard.dismiss();
    };

    const clearInput = () => {
        setComment('');
        setSelectedImage(null);
        setSelectedProduct(null);
        cancelReply();
    };

    // --- SEND COMMENT LOGIC (Clean Version for Updated RLS) ---
    const handleSend = async (quickText = null) => {
        const textInput = quickText || comment;

        // 1. Validation: Don't send if text, image, and product are all empty
        if (!textInput.trim() && !selectedImage && !selectedProduct) return;

        setIsSending(true);

        // 2. Prepare Data
        const finalContent = textInput.trim();
        const tempImageUri = selectedImage;
        const tempProduct = selectedProduct;

        // Reset UI immediately
        clearInput();

        const resolvedType = tempProduct ? (tempProduct.productType || tempProduct.type || tempProduct.category?.id || tempProduct.analysisData?.product_type || 'other') : null;
        
        const taggedProductData = tempProduct ? {
            id: tempProduct.id || 'unknown',
            name: tempProduct.productName || tempProduct.name || 'Unknown Product',
            productName: tempProduct.productName || tempProduct.name || 'Unknown Product',
            brand: tempProduct.brand || null,
            score: tempProduct.real_score || tempProduct.score || tempProduct.analysisData?.oilGuardScore || 0,
            imageUrl: tempProduct.productImage || tempProduct.imageUrl || tempProduct.image || null,
            productImage: tempProduct.productImage || tempProduct.imageUrl || tempProduct.image || null,
            image: tempProduct.productImage || tempProduct.imageUrl || tempProduct.image || null,
            price: tempProduct.price || null,
            ingredients: tempProduct.ingredients || tempProduct.analysisData?.detected_ingredients || [],
            marketingClaims: tempProduct.marketingClaims || tempProduct.claims || [],
            productType: resolvedType,
            type: resolvedType,
            analysisData: tempProduct.analysisData || null,
        } : null;
        
        console.log("[DEBUG CommentModal] Inserting taggedProductData:", taggedProductData);

        const authorSnapshot = {
            name: currentUser.settings?.name || currentUser.name || t('community_comment_default_user', language),
            avatarId: currentUser.settings?.avatarId || null,
            skinType: currentUser.settings?.skinType || null,
            taggedProduct: taggedProductData
        };
        const tempId = Math.random().toString();

        // 3. Optimistic Update (Show immediately)
        const optimisticComment = {
            id: tempId,
            text: finalContent,
            imageUrl: tempImageUri,
            product: taggedProductData,
            createdAt: new Date().toISOString(),
            userId: currentUser.uid,
            userName: authorSnapshot.name,
            parentId: replyingTo?.parentId || null,
            likesCount: 0,
            isLikedByCurrentUser: false
        };

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCommentsList(prev => [...prev, optimisticComment]);

        if (!replyingTo) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }

        try {
            // 4. Upload Image (If exists)
            let uploadedImageUrl = null;
            if (tempImageUri) {
                uploadedImageUrl = await uploadImageToCloudinary(tempImageUri);
                if (!uploadedImageUrl) throw new Error("Image upload failed");
            }

            // 5. Insert to Supabase
            const { data, error } = await supabase
                .from('comments')
                .insert([{
                    post_id: post.id,
                    firebase_user_id: currentUser.uid,
                    content: finalContent, // Sends "" if empty, which is now allowed by your RLS
                    image_url: uploadedImageUrl,
                    parent_id: replyingTo?.parentId || null,
                    author_snapshot: authorSnapshot
                }])
                .select()
                .single();

            if (error) throw error;

            // 6. Sync real data
            setCommentsList(prev => prev.map(c => c.id === tempId ? normalizeComment(data) : c));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // 🌟 Award Instant Gamification Points (+10)
            if (currentUser?.uid) {
                awardInstantPoints(currentUser.uid, COMMUNITY_POINTS.ADD_COMMENT);
            }

            // 7. Send Notifications
            const notificationData = { postId: post.id, screen: 'PostDetails' };

            let notifBody = finalContent;
            if (!notifBody) {
                if (tempProduct) {
                    notifBody = `🧴 ${tempProduct.name || tempProduct.productName}`;
                } else if (tempImageUri) {
                    notifBody = t('community_comment_notif_photo_only', language);
                }
            } else if (tempProduct) {
                notifBody = `🧴 ${tempProduct.name || tempProduct.productName}: ${notifBody}`;
            } else if (tempImageUri) {
                notifBody = `📷 ${notifBody}`;
            }

            if (replyingTo && replyingTo.targetUserId !== currentUser.uid) {
                await sendPushNotification(
                    replyingTo.targetUserId,
                    interpolate(t('community_comment_notif_reply_title', language), { name: authorSnapshot.name }),
                    interpolate(t('community_comment_notif_reply_body', language), { body: notifBody }),
                    notificationData
                );
            } else if (!replyingTo && post.userId !== currentUser.uid) {
                await sendPushNotification(
                    post.userId,
                    interpolate(t('community_comment_notif_comment_title', language), { name: authorSnapshot.name }),
                    interpolate(t('community_comment_notif_comment_body', language), { body: notifBody }),
                    notificationData
                );
            }

        } catch (error) {
            console.error("Comment Error:", error);
            AlertService.error(t('community_comment_error_title', language), t('community_comment_send_error', language));

            // Revert optimistic update
            setCommentsList(prev => prev.filter(c => c.id !== tempId));

            // Restore user input so they can try again
            setComment(textInput);
            setSelectedImage(tempImageUri);
            setSelectedProduct(tempProduct);
        } finally {
            setIsSending(false);
        }
    };

    const handleDelete = async (commentId) => {
        const prevList = [...commentsList];
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCommentsList(prev => prev.filter(c => c.id !== commentId && c.parentId !== commentId));
        try {
            await deleteComment(commentId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            setCommentsList(prevList);
            AlertService.error(t('community_comment_error_title', language), t('community_comment_delete_error', language));
        }
    };

    if (!post) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: backdropAnim }]}>
                    <Pressable style={{ flex: 1 }} onPress={handleClose} />
                </Animated.View>

                <Animated.View 
                    style={{ 
                        height: SCREEN_HEIGHT * 0.92,
                        marginBottom: keyboardHeight,
                        backgroundColor: COLORS.background, 
                        borderTopLeftRadius: 28, 
                        borderTopRightRadius: 28, 
                        overflow: 'hidden', 
                        transform: [{ translateY: slideAnim }], 
                    }}
                >
                    <View style={styles.container}>
                        {/* HEADER */}
                        <View style={styles.header}>
                            <View style={styles.grabber} />
                            <View style={styles.headerContent}>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                                    <Text style={styles.title}>{t('community_comment_modal_title', language)}</Text>
                                    <View style={styles.badge}><Text style={styles.badgeText}>{commentsList.length}</Text></View>
                                </View>
                                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                                    <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                {/* LIST */}
                <View style={{ flex: 1 }}>
                    {loading ? (
                        <ActivityIndicator color={COLORS.accentGreen} style={{ marginTop: 50 }} />
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={structuredComments}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.listContainer}
                            renderItem={({ item }) => (
                                <CommentRow
                                    item={item}
                                    currentUser={currentUser}
                                    onDelete={handleDelete}
                                    onReply={handleInitiateReply}
                                    onProfilePress={onProfilePress}
                                    onImagePress={setViewingImage}
                                    onProductPress={handleProductPress}
                                    isReply={!!item.parentId}
                                    COLORS={COLORS}
                                    styles={styles}
                                />
                            )}
                            keyboardShouldPersistTaps="handled"
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIcon}>
                                        <MaterialCommunityIcons name="comment-text-multiple-outline" size={40} color={COLORS.textDim} />
                                    </View>
                                    <Text style={styles.emptyTitle}>{t('community_comment_empty_title', language)}</Text>
                                    <Text style={styles.emptyDesc}>{t('community_comment_empty_desc', language)}</Text>
                                </View>
                            }
                        />
                    )}
                </View>

                {/* FOOTER */}
                <View style={[styles.footer, { paddingBottom: footerBottomPadding }]}>
                    {/* Reply Context Banner */}
                    {replyingTo && (
                        <Animated.View style={styles.replyBanner}>
                            <View style={styles.replyBannerContent}>
                                <View style={styles.replyVerticalLine} />
                                <View>
                                    <Text style={styles.replyLabel}>{t('community_comment_replying_to', language)}</Text>
                                    <Text style={styles.replyName}>{replyingTo.userName}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={cancelReply} style={styles.replyClose}>
                                <Ionicons name="close" size={18} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* Attached Product Preview Area */}
                    {selectedProduct && (
                        <View style={styles.productPreviewContainer}>
                            <View style={styles.productPreviewCard}>
                                <View style={styles.productPreviewThumbWrap}>
                                    {selectedProduct.image || selectedProduct.productImage || selectedProduct.imageUrl ? (
                                        <Image source={{ uri: selectedProduct.image || selectedProduct.productImage || selectedProduct.imageUrl }} style={styles.productPreviewThumb} resizeMode="contain" />
                                    ) : (
                                        <FontAwesome5 name="pump-soap" size={16} color={COLORS.textDim} />
                                    )}
                                </View>
                                <View style={styles.productPreviewMeta}>
                                    {selectedProduct.brand ? (
                                        <Text style={styles.productPreviewBrand} numberOfLines={1}>{selectedProduct.brand}</Text>
                                    ) : null}
                                    <Text style={styles.productPreviewName} numberOfLines={1}>
                                        {selectedProduct.name || selectedProduct.productName}
                                    </Text>
                                </View>
                                {(selectedProduct.real_score || selectedProduct.score) ? (
                                    <WathiqScoreBadge score={selectedProduct.real_score || selectedProduct.score} size={32} />
                                ) : null}
                                <TouchableOpacity style={styles.removeProductBtn} onPress={() => setSelectedProduct(null)}>
                                    <Ionicons name="close" size={14} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Image Preview Area */}
                    {selectedImage && (
                        <View style={styles.imagePreviewContainer}>
                            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                                <Ionicons name="close" size={12} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Quick Chips (Only when not replying and no attachment selected) */}
                    {!replyingTo && !selectedImage && !selectedProduct && (
                        <View style={styles.chipsContainer}>
                            <FlatList
                                horizontal
                                data={QUICK_REPLIES}
                                keyExtractor={(item, index) => `${item}_${index}`}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.chip} onPress={() => handleSend(t(item, language))}>
                                        <Text style={styles.chipText}>{t(item, language)}</Text>
                                    </TouchableOpacity>
                                )}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                                keyboardShouldPersistTaps="handled"
                            />
                        </View>
                    )}

                    {/* Input Bar */}
                    <View style={styles.inputBar}>
                        <TouchableOpacity
                            onPress={() => handleSend()}
                            style={[styles.sendButton, (!comment.trim() && !selectedImage && !selectedProduct) && styles.sendButtonDisabled]}
                            disabled={isSending || (!comment.trim() && !selectedImage && !selectedProduct)}
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color={COLORS.background} />
                            ) : (
                                <FontAwesome5 name="arrow-up" size={14} color={COLORS.background} />
                            )}
                        </TouchableOpacity>

                        <AppTextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholder={replyingTo ? t('community_comment_input_reply', language) : t('community_comment_input_add', language)}
                            placeholderTextColor={COLORS.textDim}
                            value={comment}
                            onChangeText={setComment}
                            multiline
                            maxLength={500}
                            textAlign="right"
                        />

                        {/* Product Picker Button */}
                        <TouchableOpacity onPress={() => setIsProductPickerVisible(true)} style={styles.attachBtn}>
                            <MaterialCommunityIcons 
                                name={selectedProduct ? "shopping" : "shopping-outline"} 
                                size={22} 
                                color={selectedProduct ? COLORS.accentGreen : COLORS.textSecondary} 
                            />
                        </TouchableOpacity>

                        {/* Camera Button */}
                        <TouchableOpacity onPress={handlePickImage} style={styles.attachBtn}>
                            <Feather name="image" size={20} color={selectedImage ? COLORS.accentGreen : COLORS.textSecondary} />
                        </TouchableOpacity>

                        {!replyingTo && !selectedImage && !selectedProduct && (
                            <View style={[styles.inputAvatar, { overflow: 'hidden' }]}>
                                {AVATARS[currentUser?.settings?.avatarId] ? (
                                    <Image source={AVATARS[currentUser.settings.avatarId]} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                                ) : (
                                    <Text style={styles.inputAvatarText}>{currentUser?.settings?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                {/* Catalog Product Picker Modal */}
                <CatalogProductPickerModal
                    visible={isProductPickerVisible}
                    onClose={() => setIsProductPickerVisible(false)}
                    onSelectProduct={(product) => setSelectedProduct(product)}
                />

                {/* Full Screen Image Viewer */}
                <FullImageViewer
                    visible={!!viewingImage}
                    imageUrl={viewingImage}
                    onClose={() => setViewingImage(null)}
                />

                {/* Product Action Sheet */}
                {viewingProduct && (
                    <ProductActionSheet
                        product={viewingProduct}
                        visible={!!viewingProduct}
                        onClose={() => setViewingProduct(null)}
                        onSave={handleSaveToShelf}
                    />
                )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { backgroundColor: COLORS.card, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    grabber: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    headerContent: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    title: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary },
    badge: { backgroundColor: COLORS.accentGreen + '26', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 0.5, borderColor: COLORS.accentGreen + '33' },
    badgeText: { color: COLORS.accentGreen, fontSize: 12, fontFamily: 'Tajawal-Bold' },
    closeBtn: { padding: 6, backgroundColor: COLORS.background, borderRadius: 20 },
    listContainer: { padding: 20, paddingBottom: 40 },
    rowContainer: { flexDirection: 'row-reverse', marginBottom: 20, position: 'relative' },
    rowContainerReply: { marginRight: 40, marginTop: -5, marginBottom: 15 },
    threadCurve: { position: 'absolute', right: -28, top: -25, bottom: 25, width: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: COLORS.border, borderBottomRightRadius: 16, zIndex: 0 },
    avatarWrap: { 
    marginLeft: 12, 
    zIndex: 1,
    alignSelf: 'flex-start', // 👈 KEY FIX: Prevents container from stretching to comment height
    width: 38,
    height: 38,
    position: 'relative',
},
avatarWrapSmall: {
    width: 28,
    height: 28,
},
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: COLORS.border },
    avatarSmall: { width: 28, height: 28, borderRadius: 14 },
    avatarText: { fontFamily: 'Tajawal-Bold', color: '#fff', fontSize: 14 },
    contentContainer: { flex: 1 },
    bubble: { backgroundColor: COLORS.card, borderRadius: 18, borderTopRightRadius: 2, padding: 12, borderWidth: 0.5, borderColor: COLORS.border },
    bubbleReply: { backgroundColor: COLORS.background, borderColor: 'transparent' },
    bubbleHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 4, gap: 6 },
    userName: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold', fontSize: 13 },
    meBadge: { backgroundColor: COLORS.accentGreen, paddingHorizontal: 4, borderRadius: 4 },
    meBadgeText: { fontSize: 9, color: '#000', fontFamily: 'Tajawal-Bold' },
    commentText: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Regular', fontSize: 14, textAlign: 'right', lineHeight: 22 },

    // --- ATTACHED PRODUCT CARD IN COMMENT ---
    commentProductCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 14,
        padding: 8,
        marginTop: 8,
        borderWidth: 0.8,
        borderColor: COLORS.border,
        gap: 10,
    },
    commentProductThumbWrap: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    commentProductThumb: {
        width: '100%',
        height: '100%',
    },
    commentProductMeta: {
        flex: 1,
        alignItems: 'flex-end',
        gap: 2,
    },
    commentProductBrand: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
        color: COLORS.textDim,
        textTransform: 'uppercase',
        textAlign: 'right',
    },
    commentProductName: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.textPrimary,
        lineHeight: 16,
        textAlign: 'right',
    },
    commentProductActionHint: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    commentProductActionText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        color: COLORS.accentGreen,
    },

    // --- NEW IMAGE STYLES ---
    commentImageContainer: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
    commentImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)' },
    imagePreviewContainer: { flexDirection: 'row-reverse', paddingHorizontal: 20, paddingBottom: 10, alignItems: 'center' },
    imagePreview: { width: 60, height: 60, borderRadius: 8, marginRight: 10, borderWidth: 0.5, borderColor: COLORS.border },
    removeImageBtn: { position: 'absolute', top: -5, right: 15, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 },

    // --- PRODUCT PREVIEW (INPUT AREA) ---
    productPreviewContainer: {
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 4,
    },
    productPreviewCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 14,
        padding: 8,
        borderWidth: 0.8,
        borderColor: COLORS.border,
        gap: 8,
    },
    productPreviewThumbWrap: {
        width: 38,
        height: 38,
        borderRadius: 8,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    productPreviewThumb: {
        width: '100%',
        height: '100%',
    },
    productPreviewMeta: {
        flex: 1,
        alignItems: 'flex-end',
        gap: 1,
    },
    productPreviewBrand: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 9.5,
        color: COLORS.textDim,
        textTransform: 'uppercase',
        textAlign: 'right',
    },
    productPreviewName: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11.5,
        color: COLORS.textPrimary,
        textAlign: 'right',
    },
    removeProductBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    attachBtn: {
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraBtn: { padding: 8, marginLeft: 4 },

    actionBar: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 6, gap: 16, paddingRight: 4 },
    timeText: { color: COLORS.textDim, fontSize: 11, fontFamily: 'Tajawal-Regular' },
    actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    footer: { backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border },
    replyBanner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.accentGreen + '14',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 12,
        marginTop: 12,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: COLORS.accentGreen + '33',
    },
    replyBannerContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    replyVerticalLine: { width: 2, height: 24, backgroundColor: COLORS.accentGreen, borderRadius: 2 },
    replyLabel: { color: COLORS.accentGreen, fontSize: 10, fontFamily: 'Tajawal-Bold', textAlign: 'right' },
    replyName: { color: COLORS.textPrimary, fontSize: 12, fontFamily: 'Tajawal-Bold', textAlign: 'right' },
    replyClose: { padding: 4 },
    chipsContainer: { height: 40, marginVertical: 10 },
    chip: { backgroundColor: COLORS.background, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, justifyContent: 'center' },
    chipText: { color: COLORS.textSecondary, fontFamily: 'Tajawal-Regular', fontSize: 12 },
    inputBar: { flexDirection: 'row-reverse', alignItems: 'flex-end', backgroundColor: COLORS.background, marginHorizontal: 12, borderRadius: 24, padding: 6, gap: 10, borderWidth: 0.5, borderColor: COLORS.border },
    input: { flex: 1, color: COLORS.textPrimary, fontFamily: 'Tajawal-Regular', fontSize: 14, maxHeight: 100, minHeight: 36, textAlignVertical: 'center', paddingHorizontal: 5, paddingTop: 8, paddingBottom: 8 },
    inputAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accentGreen, alignItems: 'center', justifyContent: 'center', marginLeft: 4, marginBottom: 2 },
    inputAvatarText: { color: '#000', fontFamily: 'Tajawal-Bold', fontSize: 12 },
    sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accentGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    sendButtonDisabled: { backgroundColor: COLORS.border },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, opacity: 0.7 },
    emptyIcon: { marginBottom: 15, backgroundColor: COLORS.background, padding: 15, borderRadius: 40 },
    emptyTitle: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold', fontSize: 16, marginBottom: 5 },
    emptyDesc: { color: COLORS.textDim, fontFamily: 'Tajawal-Regular', fontSize: 13 },
    popHeartContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    popHeartShadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
    firstGenCommentPin: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1.2,
    overflow: 'hidden',
},
firstGenCommentPinSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    bottom: -1,
    right: -1,
},
firstGenPinGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
},
firstGenCommentPinText: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 7.5,
    color: '#FFF',
},
});

export default CommentModal;