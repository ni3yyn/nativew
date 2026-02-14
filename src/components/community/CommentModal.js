import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, 
  FlatList, KeyboardAvoidingView, Platform, StyleSheet, 
  Animated, LayoutAnimation, Pressable, Keyboard, Image 
} from 'react-native';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker'; // <--- NEW IMPORT

// --- CONFIG & SERVICES ---
import { supabase } from '../../config/supabase';
import { db } from '../../config/firebase'; 
import { doc, getDoc } from 'firebase/firestore';
import { COLORS } from '../../constants/theme';
import { AlertService } from '../../services/alertService';
import { deleteComment } from '../../services/communityService';
import { uploadImageToCloudinary } from '../../services/imageService'; // <--- NEW IMPORT
import FullImageViewer from '../common/FullImageViewer';
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

const getRandomColor = (name) => {
    if (!name) return COLORS.card;
    const colors = [COLORS.accentGreen, '#D97706', '#059669', '#0891B2', '#7C3AED', '#BE123C'];
    const charCode = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCode % colors.length];
};

const getRandomPopColor = () => Math.random() > 0.5 ? COLORS.danger : COLORS.accentGreen;

const QUICK_REPLIES = ["شكرا على المشاركة ✨", "وين لقيتيه؟", "اواه ماشي سومتو", "ما شاء الله ! 👏", "البركوكس بنين"];

// ==================================================================
// 2. COMPONENT: COMMENT ROW (Updated for Images)
// ==================================================================

const CommentRow = React.memo(({ item, currentUser, onDelete, onReply, onProfilePress, isReply = false, onImagePress }) => { // <--- Added onImagePress    
    const isMe = currentUser?.uid && item.userId === currentUser.uid;
    const [isLiked, setIsLiked] = useState(item.isLikedByCurrentUser || false);
    const [likesCount, setLikesCount] = useState(item.likesCount || 0);
    const [popHeartColor, setPopHeartColor] = useState(COLORS.danger);
    
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
            setPopHeartColor(getRandomPopColor());
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
        AlertService.delete(isReply ? "حذف الرد" : "حذف التعليق", "هل أنت متأكد؟", () => onDelete(item.id));
    };

    const timeAgo = item.createdAt 
        ? formatDistanceToNow(new Date(item.createdAt), { locale: ar, addSuffix: false })
        : 'الآن';

    return (
        <View style={[styles.rowContainer, isReply && styles.rowContainerReply]}>
            {isReply && <View style={styles.threadCurve} />}
            <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => onProfilePress && onProfilePress(item.userId, item.authorSettings)}
                style={styles.avatarWrap}
            >
                <LinearGradient
                    colors={[getRandomColor(item.userName), COLORS.card]}
                    style={[styles.avatar, isReply && styles.avatarSmall]}
                >
                    <Text style={[styles.avatarText, isReply && { fontSize: 12 }]}>{item.userName?.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
            </TouchableOpacity>

            <View style={styles.contentContainer}>
                <Pressable 
                    onPress={handleDoubleTap}
                    onLongPress={handleLongPress} 
                    delayLongPress={300} 
                    style={({pressed}) => [styles.bubble, isReply && styles.bubbleReply, pressed && { opacity: 0.95 }]}
                >
                    <View style={styles.bubbleHeader}>
                        <Text style={styles.userName}>{item.userName}</Text>
                        {isMe && <View style={styles.meBadge}><Text style={styles.meBadgeText}>أنا</Text></View>}
                    </View>
                    
                    {/* --- TEXT CONTENT --- */}
                    {item.text ? <Text style={styles.commentText}>{item.text}</Text> : null}

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
                            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={14} color={isLiked ? COLORS.danger : COLORS.textSecondary} />
                         </Animated.View>
                         {likesCount > 0 && <Text style={[styles.actionText, isLiked && {color: COLORS.danger}]}>{likesCount}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onReply(item)} style={styles.actionBtn}>
                        <Text style={styles.actionText}>رد</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

// ==================================================================
// 3. MAIN COMPONENT: COMMENT MODAL
// ==================================================================
const CommentModal = ({ visible, onClose, post, currentUser, onProfilePress }) => {
    const [comment, setComment] = useState('');
    const [commentsList, setCommentsList] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null); 
    
    // --- NEW STATE FOR IMAGES ---
    const [selectedImage, setSelectedImage] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [viewingImage, setViewingImage] = useState(null);

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
        return {
            id: row.id,
            text: row.content,
            imageUrl: row.image_url, // <--- MAP FROM DB
            createdAt: row.created_at,
            userId: row.firebase_user_id,
            parentId: row.parent_id, 
            userName: row.author_snapshot?.name || 'مستخدم وثيق',
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
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
            });
            if (!result.canceled) {
                setSelectedImage(result.assets[0].uri);
            }
        } catch (error) {
            AlertService.error("خطأ", "تعذر فتح معرض الصور");
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
        cancelReply();
    };

   // --- SEND COMMENT LOGIC (Clean Version for Updated RLS) ---
   const handleSend = async (quickText = null) => {
    const textInput = quickText || comment;
    
    // 1. Validation: Don't send if both are empty
    if (!textInput.trim() && !selectedImage) return;

    setIsSending(true);
    
    // 2. Prepare Data
    // Since you updated the RLS, we can send an empty string "" for image-only comments.
    const finalContent = textInput.trim(); 
    const tempImageUri = selectedImage; 

    // Reset UI immediately
    clearInput();

    const authorSnapshot = {
        name: currentUser.settings?.name || currentUser.name || 'مستخدم وثيق',
        skinType: currentUser.settings?.skinType || null
    };
    const tempId = Math.random().toString(); 

    // 3. Optimistic Update (Show immediately)
    const optimisticComment = {
        id: tempId,
        text: finalContent,
        imageUrl: tempImageUri, 
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

        // 7. Send Notifications
        const notificationData = { postId: post.id, screen: 'PostDetails' };
        
        // Logic: If text is empty, notification says "📷 Photo", otherwise "📷 [Text]"
        const notifBody = tempImageUri 
            ? (finalContent ? `📷 ${finalContent}` : '📷 شارك صورة') 
            : finalContent;

        if (replyingTo && replyingTo.targetUserId !== currentUser.uid) {
            await sendPushNotification(
                replyingTo.targetUserId, 
                `رد جديد من ${authorSnapshot.name} ↩️`, 
                `رد عليك: "${notifBody}"`, 
                notificationData
            );
        } else if (!replyingTo && post.userId !== currentUser.uid) {
            await sendPushNotification(
                post.userId, 
                `تعليق جديد من ${authorSnapshot.name} 💬`, 
                `${notifBody}`, 
                notificationData
            );
        }

    } catch (error) { 
        console.error("Comment Error:", error);
        AlertService.error("خطأ", "لم يتم إرسال التعليق.");
        
        // Revert optimistic update
        setCommentsList(prev => prev.filter(c => c.id !== tempId)); 
        
        // Restore user input so they can try again
        setComment(textInput); 
        setSelectedImage(tempImageUri);
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
            AlertService.error("خطأ", "تعذر حذف التعليق");
        }
    };

    if (!post) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.grabber} />
                    <View style={styles.headerContent}>
                        <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 8}}>
                            <Text style={styles.title}>التعليقات</Text>
                            <View style={styles.badge}><Text style={styles.badgeText}>{commentsList.length}</Text></View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* LIST */}
                <View style={{flex: 1}}>
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
                                    onImagePress={setViewingImage} // <--- Pass the handler
                                    isReply={!!item.parentId}
                                />
                            )}
                            keyboardShouldPersistTaps="handled" 
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIcon}>
                                        <MaterialCommunityIcons name="comment-text-multiple-outline" size={40} color={COLORS.textDim} />
                                    </View>
                                    <Text style={styles.emptyTitle}>لا توجد تعليقات بعد</Text>
                                    <Text style={styles.emptyDesc}>كن أول من يبدأ النقاش</Text>
                                </View>
                            }
                        />
                    )}
                </View>

                {/* FOOTER */}
                <View style={styles.footer}>
                    {/* Reply Context Banner */}
                    {replyingTo && (
                        <Animated.View style={styles.replyBanner}>
                            <View style={styles.replyBannerContent}>
                                <View style={styles.replyVerticalLine}/>
                                <View>
                                    <Text style={styles.replyLabel}>الرد على</Text>
                                    <Text style={styles.replyName}>{replyingTo.userName}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={cancelReply} style={styles.replyClose}>
                                <Ionicons name="close" size={18} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </Animated.View>
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

                    {/* Quick Chips (Only when not replying and no image selected) */}
                    {!replyingTo && !selectedImage && (
                        <View style={styles.chipsContainer}>
                            <FlatList 
                                horizontal 
                                data={QUICK_REPLIES}
                                keyExtractor={(item) => item}
                                renderItem={({item}) => (
                                    <TouchableOpacity style={styles.chip} onPress={() => handleSend(item)}>
                                        <Text style={styles.chipText}>{item}</Text>
                                    </TouchableOpacity>
                                )}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{paddingHorizontal: 20, gap: 8}}
                                keyboardShouldPersistTaps="handled"
                            />
                        </View>
                    )}

                    {/* Input Bar */}
                    <View style={styles.inputBar}>
                        <TouchableOpacity 
                            onPress={() => handleSend()} 
                            style={[styles.sendButton, (!comment.trim() && !selectedImage) && styles.sendButtonDisabled]} 
                            disabled={isSending || (!comment.trim() && !selectedImage)}
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color={COLORS.background} />
                            ) : (
                                <FontAwesome5 name="arrow-up" size={14} color={COLORS.background} />
                            )}
                        </TouchableOpacity>

                        <TextInput 
                            ref={inputRef}
                            style={styles.input} 
                            placeholder={replyingTo ? "اكتب ردك هنا..." : "أضف تعليقاً..."}
                            placeholderTextColor={COLORS.textDim}
                            value={comment}
                            onChangeText={setComment}
                            multiline 
                            maxLength={500} 
                            textAlign="right"
                        />
                        
                        {/* Camera Button */}
                        <TouchableOpacity onPress={handlePickImage} style={styles.cameraBtn}>
                            <Feather name="image" size={20} color={selectedImage ? COLORS.accentGreen : COLORS.textSecondary} />
                        </TouchableOpacity>
                        
                        {!replyingTo && !selectedImage && (
                            <View style={styles.inputAvatar}>
                                <Text style={styles.inputAvatarText}>{currentUser?.settings?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                            </View>
                        )}
                    </View>
                </View>

            {/* Full Screen Image Viewer */}
            <FullImageViewer 
                    visible={!!viewingImage} 
                    imageUrl={viewingImage} 
                    onClose={() => setViewingImage(null)} 
                />
            </KeyboardAvoidingView>

        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { backgroundColor: COLORS.card, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    grabber: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    headerContent: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    title: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary },
    badge: { backgroundColor: 'rgba(34, 197, 94, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
    badgeText: { color: COLORS.accentGreen, fontSize: 12, fontFamily: 'Tajawal-Bold' },
    closeBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
    listContainer: { padding: 20, paddingBottom: 40 },
    rowContainer: { flexDirection: 'row-reverse', marginBottom: 20, position: 'relative' },
    rowContainerReply: { marginRight: 40, marginTop: -5, marginBottom: 15 },
    threadCurve: { position: 'absolute', right: -28, top: -25, bottom: 25, width: 20, borderBottomWidth: 2, borderRightWidth: 2, borderColor: 'rgba(255,255,255,0.08)', borderBottomRightRadius: 16, zIndex: 0 },
    avatarWrap: { marginLeft: 12, zIndex: 1 },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    avatarSmall: { width: 28, height: 28, borderRadius: 14 },
    avatarText: { fontFamily: 'Tajawal-Bold', color: '#fff', fontSize: 14 },
    contentContainer: { flex: 1 },
    bubble: { backgroundColor: COLORS.card, borderRadius: 18, borderTopRightRadius: 2, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    bubbleReply: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'transparent' },
    bubbleHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 4, gap: 6 },
    userName: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold', fontSize: 13 },
    meBadge: { backgroundColor: COLORS.accentGreen, paddingHorizontal: 4, borderRadius: 4 },
    meBadgeText: { fontSize: 9, color: '#000', fontFamily: 'Tajawal-Bold' },
    commentText: { color: 'rgba(255,255,255,0.9)', fontFamily: 'Tajawal-Regular', fontSize: 14, textAlign: 'right', lineHeight: 22 },
    
    // --- NEW IMAGE STYLES ---
    commentImageContainer: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
    commentImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)' },
    imagePreviewContainer: { flexDirection: 'row-reverse', paddingHorizontal: 20, paddingBottom: 10, alignItems: 'center' },
    imagePreview: { width: 60, height: 60, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
    removeImageBtn: { position: 'absolute', top: -5, right: 15, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 },
    cameraBtn: { padding: 8, marginLeft: 4 },
    
    actionBar: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 6, gap: 16, paddingRight: 4 },
    timeText: { color: COLORS.textDim, fontSize: 11, fontFamily: 'Tajawal-Regular' },
    actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    actionText: { color: COLORS.textSecondary, fontSize: 11, fontFamily: 'Tajawal-Bold' },
    footer: { backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingBottom: Platform.OS === 'ios' ? 40 : 15 },
    replyBanner: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(34, 197, 94, 0.08)', paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 12, marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
    replyBannerContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    replyVerticalLine: { width: 2, height: 24, backgroundColor: COLORS.accentGreen, borderRadius: 2 },
    replyLabel: { color: COLORS.accentGreen, fontSize: 10, fontFamily: 'Tajawal-Bold', textAlign: 'right' },
    replyName: { color: COLORS.textPrimary, fontSize: 12, fontFamily: 'Tajawal-Bold', textAlign: 'right' },
    replyClose: { padding: 4 },
    chipsContainer: { height: 40, marginVertical: 10 },
    chip: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'center' },
    chipText: { color: COLORS.textSecondary, fontFamily: 'Tajawal-Regular', fontSize: 12 },
    inputBar: { flexDirection: 'row-reverse', alignItems: 'flex-end', backgroundColor: COLORS.background, marginHorizontal: 12, borderRadius: 24, padding: 6, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    input: { flex: 1, color: COLORS.textPrimary, fontFamily: 'Tajawal-Regular', fontSize: 14, maxHeight: 100, minHeight: 36, textAlignVertical: 'center', paddingHorizontal: 5, paddingTop: 8, paddingBottom: 8 },
    inputAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accentGreen, alignItems: 'center', justifyContent: 'center', marginLeft: 4, marginBottom: 2 },
    inputAvatarText: { color: '#000', fontFamily: 'Tajawal-Bold', fontSize: 12 },
    sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accentGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    sendButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.1)' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, opacity: 0.7 },
    emptyIcon: { marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 40 },
    emptyTitle: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold', fontSize: 16, marginBottom: 5 },
    emptyDesc: { color: COLORS.textDim, fontFamily: 'Tajawal-Regular', fontSize: 13 },
    popHeartContainer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
    popHeartShadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
});

export default CommentModal;