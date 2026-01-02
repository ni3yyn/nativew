import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Modal, ActivityIndicator, 
  FlatList, KeyboardAvoidingView, Platform, Keyboard, StyleSheet, 
  Animated, LayoutAnimation, UIManager, Pressable 
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { COLORS } from '../../constants/theme';
import { addComment, deleteComment, likeComment, unlikeComment } from '../../services/communityService';
import { AlertService } from '../../services/alertService';
import * as Haptics from 'expo-haptics';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  if (!global?.nativeFabricUIManager) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const getRandomColor = (name) => {
    if (!name) return COLORS.card;
    const colors = [COLORS.accentGreen, '#D97706', '#059669', '#0891B2', '#7C3AED', '#BE123C'];
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
};

// --- QUICK REPLIES DATA ---
const QUICK_REPLIES = [
    "روتين هايل! 😍",
    "شكراً على المشاركة ✨",
    "وين لقيتيه؟",
    "اواه ماشي سومتو",
    "ما شاء الله ! 👏",
    "البركوكس بنين"
];

// --- SUB-COMPONENT: INTERACTIVE COMMENT ITEM ---
const CommentItem = React.memo(({ item, currentUser, postId, onDelete, onProfilePress }) => {
    const isMe = currentUser?.uid && item.userId === currentUser.uid;
    const isLiked = item.likes?.includes(currentUser?.uid);
    const likesCount = item.likes?.length || 0;
    
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

        if (isLiked) {
            unlikeComment(postId, item.id, currentUser.uid);
        } else {
            likeComment(postId, item.id, currentUser.uid);
        }
    };

    const triggerDoubleTapLike = () => {
        if (!currentUser?.uid) return;
        if (isLiked) return; 
        
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

        likeComment(postId, item.id, currentUser.uid);
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
            "هل أنت متأكد؟ سيختفي هذا التعليق نهائياً.",
            () => onDelete(item.id)
        );
    };

    return (
        <View style={styles.commentRow}>
            
            {/* 1. AVATAR (Clickable now) */}
            <TouchableOpacity 
                onPress={() => onProfilePress && onProfilePress(item.userId)}
                activeOpacity={0.8}
                style={[styles.avatarContainer, { backgroundColor: getRandomColor(displayName) }]}
            >
                <Text style={styles.avatarText}>{initial}</Text>
            </TouchableOpacity>

            {/* 2. INTERACTIVE CONTENT */}
            <Pressable 
                onPress={handlePress} 
                onLongPress={handleLongPress} 
                delayLongPress={400}
                style={styles.contentColumn}
            >
                <View style={styles.textBlock}>
                    <Text style={styles.userName}>{displayName}</Text> 
                    <Text style={styles.commentText}>{item.text}</Text>
                    
                    {/* POP-UP HEART */}
                    <Animated.View style={[styles.popHeartContainer, { transform: [{ scale: popHeartScale }], opacity: popHeartOpacity }]}>
                        <Ionicons name="heart" size={40} color="rgba(255,255,255,0.9)" />
                    </Animated.View>
                </View>

                <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                        {item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { locale: ar, addSuffix: false }) : 'الآن'}
                    </Text>
                    
                    {likesCount > 0 && (
                        <Text style={[styles.metaText, {color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold'}]}>
                            {likesCount} إعجاب
                        </Text>
                    )}
                </View>
            </Pressable>

            {/* 3. SMALL HEART */}
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

    useEffect(() => {
        if (!post?.id || !visible) return;
        setLoading(true);
        const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setCommentsList(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [post?.id, visible]);

    const handleSend = async (textToSend = null) => {
        const finalComment = textToSend || comment;
        if (!finalComment.trim()) return;
        
        const tempText = finalComment.trim();
        setComment(''); 
        Keyboard.dismiss(); // Dismiss keyboard when sending

        try {
            await addComment(post.id, tempText, currentUser);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (error) { 
            AlertService.error("خطأ", "لم يتم إرسال التعليق.");
        }
    };

    const handleDelete = async (commentId) => {
        try {
            await deleteComment(post.id, commentId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) { console.error(error); }
    };
    
    // Quick Reply Chip Component
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
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                
                {/* Header */}
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
                
                {/* Main Content Area (Tap to dismiss keyboard) */}
                <View style={{flex: 1}} onStartShouldSetResponder={() => true} onResponderRelease={Keyboard.dismiss}>
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
                                    postId={post.id} 
                                    onDelete={handleDelete}
                                    onProfilePress={onProfilePress} 
                                />
                            )}
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

                {/* Input Area + Quick Replies (Pushed up by Keyboard) */}
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    style={styles.keyboardAvoid}
                >
                    <View style={styles.inputWrapper}>
                        
                        {/* Quick Replies Horizontal Scroll */}
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

                        {/* Text Input Container */}
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
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
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
        paddingBottom: 40,
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
    keyboardAvoid: { 
        width: '100%',
        backgroundColor: COLORS.card, 
    },
    inputWrapper: {
        backgroundColor: COLORS.card,
        paddingHorizontal: 15,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 30 : 15, // Extra padding for iPhone home bar
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