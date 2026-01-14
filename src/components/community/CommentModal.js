import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, 
  FlatList, KeyboardAvoidingView, Platform, StyleSheet, 
  Animated, LayoutAnimation, UIManager, Pressable, Keyboard 
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

// --- CONFIG & SERVICES ---
import { supabase } from '../../config/supabase';
import { COLORS } from '../../constants/theme';
import { AlertService } from '../../services/alertService';

const getRandomColor = (name) => {
    if (!name) return COLORS.card;
    const colors = [COLORS.accentGreen, '#D97706', '#059669', '#0891B2', '#7C3AED', '#BE123C'];
    const charCode = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[charCode % colors.length];
};

const QUICK_REPLIES = [
    "روتين هايل! 😍",
    "شكرا على المشاركة ✨",
    "وين لقيتيه؟",
    "اواه ماشي سومتو",
    "ما شاء الله ! 👏",
    "البركوكس بنين"
];

// --- SUB-COMPONENT: INTERACTIVE COMMENT ITEM ---
const CommentItem = React.memo(({ item, currentUser, onDelete, onProfilePress }) => {
    const isMe = currentUser?.uid && item.userId === currentUser.uid;
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(item.likesCount || 0);
    
    const displayName = item.userName || "مستخدم";
    const initial = displayName.charAt(0).toUpperCase();

    // Animations
    const heartScale = useRef(new Animated.Value(1)).current; 
    const popHeartScale = useRef(new Animated.Value(0)).current; 
    const popHeartOpacity = useRef(new Animated.Value(0)).current;

    const lastTap = useRef(null);

    const handleLike = () => {
        if (!currentUser?.uid) return;
        Haptics.selectionAsync();
        
        Animated.sequence([
            Animated.spring(heartScale, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
            Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, speed: 50 })
        ]).start();

        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    };

    const triggerDoubleTapLike = () => {
        if (!currentUser?.uid || isLiked) return;
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        popHeartScale.setValue(0.5);
        popHeartOpacity.setValue(1);
        
        Animated.parallel([
            Animated.spring(popHeartScale, { toValue: 1.2, friction: 5, useNativeDriver: true }),
            Animated.sequence([
                Animated.delay(300),
                Animated.timing(popHeartOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
            ])
        ]).start();

        handleLike();
    };

    const handlePress = () => {
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 300;
        if (lastTap.current && (now - lastTap.current) < DOUBLE_PRESS_DELAY) {
            triggerDoubleTapLike();
        } else {
            lastTap.current = now;
        }
    };

    const handleLongPress = () => {
        if (!isMe) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        
        AlertService.delete(
            "حذف التعليق",
            "هل أنت متأكد؟ سيختفي هذا التعليق نهائيا.",
            () => onDelete(item.id)
        );
    };

    const timeAgo = item.createdAt 
        ? formatDistanceToNow(new Date(item.createdAt), { locale: ar, addSuffix: false })
        : 'الآن';

    return (
        <View style={styles.commentRow}>
            <TouchableOpacity 
                onPress={() => onProfilePress && onProfilePress(item.userId)}
                activeOpacity={0.8}
                style={[styles.avatarContainer, { backgroundColor: getRandomColor(displayName) }]}
            >
                <Text style={styles.avatarText}>{initial}</Text>
            </TouchableOpacity>

            <Pressable 
                onPress={handlePress} 
                onLongPress={handleLongPress} 
                delayLongPress={400}
                style={styles.contentColumn}
            >
                <View style={styles.textBlock}>
                    <Text style={styles.userName}>{displayName}</Text> 
                    <Text style={styles.commentText}>{item.text}</Text>
                    
                    <Animated.View style={[styles.popHeartContainer, { transform: [{ scale: popHeartScale }], opacity: popHeartOpacity }]}>
                        <Ionicons name="heart" size={40} color="rgba(255,255,255,0.9)" />
                    </Animated.View>
                </View>

                <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{timeAgo}</Text>
                    
                    {likesCount > 0 && (
                        <Text style={[styles.metaText, {color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold'}]}>
                            {likesCount} إعجاب
                        </Text>
                    )}
                </View>
            </Pressable>

            <TouchableOpacity onPress={handleLike} style={styles.heartBtn} hitSlop={15}>
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <Ionicons 
                        name={isLiked ? "heart" : "heart-outline"} 
                        size={14} 
                        color={isLiked ? COLORS.danger : 'rgba(255,255,255,0.4)'} 
                    />
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
});

// --- MAIN MODAL COMPONENT ---
const CommentModal = ({ visible, onClose, post, currentUser, onProfilePress }) => {
    const [comment, setComment] = useState('');
    const [commentsList, setCommentsList] = useState([]); 
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef();

    // Helper to map DB row to UI object
    const normalizeComment = (row) => ({
        id: row.id,
        text: row.content,
        createdAt: row.created_at,
        userId: row.firebase_user_id,
        userName: row.author_snapshot?.name || 'مستخدم',
        authorSettings: row.author_snapshot,
        likesCount: 0 
    });

    // 🟢 INITIAL LOAD & SUBSCRIPTION
    useEffect(() => {
        if (!post?.id || !visible) return;
        
        // 1. Initial Fetch
        fetchComments();
    
        // 2. Realtime Subscription
        // We chain two listeners: one filtered for INSERTs, one unfiltered for DELETEs
        const channel = supabase.channel(`comments:${post.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
                (payload) => {
                    // 🟢 INSERT LOGIC (Filtered by Post ID)
                    if (payload.new.firebase_user_id === currentUser.uid) return; // Stop Echo

                    const newComment = normalizeComment(payload.new);
                    setCommentsList((currentComments) => {
                        if (currentComments.some(c => c.id === newComment.id)) return currentComments;
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        return [...currentComments, newComment];
                    });
                    
                    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'comments' },
                (payload) => {
                    // 🟢 DELETE LOGIC (Global Listener -> Local Filter)
                    // We catch ALL deletes, but only react if the ID exists in our list.
                    // This bypasses the limitation where DELETE payloads don't include post_id.
                    const deletedId = payload.old.id;
                    
                    setCommentsList((currentComments) => {
                        const exists = currentComments.some(c => c.id === deletedId);
                        if (!exists) return currentComments; // Not a comment on this post

                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        return currentComments.filter(c => c.id !== deletedId);
                    });
                }
            )
            .subscribe();
    
        return () => {
            supabase.removeChannel(channel);
        };
    }, [post?.id, visible]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('post_id', post.id)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const normalized = data.map(normalizeComment);
            setCommentsList(normalized);
            
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (textToSend = null) => {
        const finalComment = textToSend || comment;
        if (!finalComment.trim()) return;
        
        const tempText = finalComment.trim();
        setComment(''); 
        
        const authorSnapshot = {
            name: currentUser.settings?.name || currentUser.name || 'مستخدم',
            skinType: currentUser.settings?.skinType || null,
            scalpType: currentUser.settings?.scalpType || null
        };

        const tempId = Math.random().toString(); 

        // 🟢 Optimistic Update
        const optimisticComment = {
            id: tempId,
            text: tempText,
            createdAt: new Date().toISOString(),
            userId: currentUser.uid,
            userName: authorSnapshot.name,
            authorSettings: authorSnapshot,
            likesCount: 0
        };

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCommentsList(prev => [...prev, optimisticComment]);
        
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            // Send to Supabase
            const { data, error } = await supabase
                .from('comments')
                .insert([{
                    post_id: post.id,
                    firebase_user_id: currentUser.uid,
                    content: tempText,
                    author_snapshot: authorSnapshot
                }])
                .select()
                .single();

            if (error) throw error;

            await supabase.rpc('increment_comments_count', { row_id: post.id });

            // Swap Temp ID -> Real ID silently (No animation needed for swap)
            setCommentsList(prev => prev.map(c => c.id === tempId ? normalizeComment(data) : c));
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        } catch (error) { 
            AlertService.error("خطأ", "لم يتم إرسال التعليق.");
            // Revert
            setCommentsList(prev => prev.filter(c => c.id !== tempId)); 
            setComment(tempText); 
        }
    };

    const handleDelete = async (commentId) => {
        // 🟢 Optimistic Delete
        const prevList = [...commentsList];
        
        // Remove locally first
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCommentsList(prev => prev.filter(c => c.id !== commentId));

        try {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;

            await supabase.rpc('decrement_comments_count', { row_id: post.id });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        } catch (error) { 
            console.error("Delete Error:", error); 
            AlertService.error("خطأ", "تعذر حذف التعليق");
            // Revert if API fails
            setCommentsList(prevList); 
        }
    };
    
    const QuickReplyChip = ({ text }) => (
        <TouchableOpacity 
            style={styles.quickReplyChip} 
            onPress={() => handleSend(text)}
        >
            <Text style={styles.quickReplyText}>{text}</Text>
        </TouchableOpacity>
    );

    if (!post) return null;

    return (
        <Modal 
            visible={visible} 
            animationType="slide" 
            presentationStyle="pageSheet" 
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                
                <View style={styles.modalHeader}>
                    <View style={styles.handleBar} />
                    <View style={styles.headerRow}>
                        <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 10}}>
                            <Text style={styles.modalTitle}>النقاش</Text>
                            <View style={styles.countPill}>
                                <Text style={styles.countText}>{commentsList.length}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={{flex: 1}}>
                        {loading ? (
                            <ActivityIndicator color={COLORS.accentGreen} style={{ marginTop: 50 }} />
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={commentsList}
                                keyExtractor={item => item.id}
                                contentContainerStyle={styles.listContent}
                                renderItem={({ item }) => (
                                    <CommentItem 
                                        item={item} 
                                        currentUser={currentUser} 
                                        onDelete={handleDelete}
                                        onProfilePress={onProfilePress} 
                                    />
                                )}
                                keyboardShouldPersistTaps="handled" 
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <View style={styles.emptyIconBox}>
                                            <Feather name="message-circle" size={32} color={COLORS.textDim} />
                                        </View>
                                        <Text style={styles.emptyText}>كن أول من يشارك رأيه</Text>
                                        <Text style={styles.emptySubText}>المساحة هادئة... ابدأ الحديث!</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>

                    <View style={styles.inputWrapper}>
                        <View style={{height: 40, marginBottom: 8}}>
                             <FlatList 
                                horizontal 
                                data={QUICK_REPLIES}
                                keyExtractor={(item) => item}
                                renderItem={({item}) => <QuickReplyChip text={item} />}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{paddingHorizontal: 10, gap: 8}}
                                keyboardShouldPersistTaps="handled"
                             />
                        </View>

                        <View style={styles.inputContainer}>
                            <TouchableOpacity 
                                onPress={() => handleSend()} 
                                style={[styles.sendBtn, !comment.trim() && styles.sendBtnDisabled]} 
                                disabled={!comment.trim()}
                            >
                                <FontAwesome5 name="arrow-up" size={14} color={COLORS.background} />
                            </TouchableOpacity>

                            <TextInput 
                                style={styles.textInput} 
                                placeholder={`رد باسم ${currentUser?.settings?.name?.split(' ')[0] || 'مستخدم'}...`}
                                placeholderTextColor={COLORS.textDim}
                                value={comment}
                                onChangeText={setComment}
                                multiline 
                                maxLength={500} 
                                textAlign="right"
                            />

                            <View style={[styles.inputAvatar, { backgroundColor: COLORS.accentGreen }]}>
                                <Text style={styles.inputAvatarText}>
                                    {currentUser?.settings?.name?.charAt(0).toUpperCase() || 'U'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: { flex: 1, backgroundColor: COLORS.background },
    modalHeader: {
        backgroundColor: COLORS.card,
        paddingBottom: 15,
        paddingTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        zIndex: 10,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 15,
    },
    headerRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    modalTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        color: COLORS.textPrimary,
    },
    countPill: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 12,
    },
    countText: {
        color: COLORS.accentGreen,
        fontSize: 12,
        fontFamily: 'Tajawal-Bold',
    },
    closeBtn: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20, 
        flexGrow: 1, 
    },
    commentRow: {
        flexDirection: 'row-reverse',
        marginBottom: 24,
        alignItems: 'flex-start',
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatarText: {
        fontFamily: 'Tajawal-Bold',
        color: '#fff',
        fontSize: 16,
    },
    contentColumn: {
        flex: 1,
        justifyContent: 'center',
    },
    textBlock: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        position: 'relative',
    },
    popHeartContainer: {
        position: 'absolute',
        top: '50%',
        right: '50%',
        marginTop: -20,
        marginRight: -20,
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    userName: {
        color: COLORS.textPrimary,
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        marginBottom: 4,
        opacity: 0.9,
    },
    commentText: {
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        textAlign: 'right',
        lineHeight: 22,
    },
    metaRow: {
        flexDirection: 'row-reverse',
        gap: 15,
        marginTop: 6,
        paddingRight: 2,
    },
    metaText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontFamily: 'Tajawal-Regular',
    },
    heartBtn: {
        padding: 10,
        marginTop: 10,
    },
    
    // --- KEYBOARD & INPUT STYLES ---
    inputWrapper: {
        backgroundColor: COLORS.card,
        paddingHorizontal: 15,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 15, 
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    inputContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-end',
        backgroundColor: COLORS.background,
        borderRadius: 24,
        padding: 6,
        gap: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    inputAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
        marginLeft: 4,
    },
    inputAvatarText: {
        color: '#fff',
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
    },
    textInput: {
        flex: 1,
        color: COLORS.textPrimary,
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        maxHeight: 100,
        minHeight: 40,
        textAlignVertical: 'center',
        paddingTop: 8,
        paddingBottom: 8,
    },
    sendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.accentGreen,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 2,
    },
    sendBtnDisabled: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    
    // --- QUICK REPLY CHIPS ---
    quickReplyChip: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center'
    },
    quickReplyText: {
        color: COLORS.textSecondary,
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
    },

    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
    },
    emptyIconBox: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    emptyText: {
        color: COLORS.textPrimary,
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        marginBottom: 5,
    },
    emptySubText: {
        color: COLORS.textDim,
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
    }
});

export default CommentModal;