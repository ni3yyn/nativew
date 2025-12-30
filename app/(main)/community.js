import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  StyleSheet, View, Text, FlatList, Image, TouchableOpacity, 
  TextInput, Modal, ActivityIndicator, ScrollView, Animated, 
  Alert, BackHandler, KeyboardAvoidingView, Platform, 
  LayoutAnimation, UIManager, Keyboard 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

import { 
  collection, query, orderBy, limit, onSnapshot, 
  addDoc, updateDoc, doc, arrayUnion, arrayRemove, 
  serverTimestamp, increment, deleteDoc 
} from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useAppContext } from '../../src/context/AppContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- THEME ---
const COLORS = {
  background: '#1A2D27',
  card: '#253D34',
  border: 'rgba(90, 156, 132, 0.25)',
  accentGreen: '#5A9C84',
  primary: '#A3E4D7',
  textPrimary: '#F1F3F2',
  textSecondary: '#A3B1AC',
  textOnAccent: '#1A2D27',
  danger: '#ef4444', 
  gold: '#F59E0B',
  blue: '#3B82F6',
  purple: '#8B5CF6'
};

const CATEGORIES = [
    { id: 'review', label: 'تجارب حقيقية', icon: 'star', color: COLORS.accentGreen, desc: 'شاركي رأيكِ في المنتجات بناءً على تحليلها.' },
    { id: 'journey', label: 'رحلة البشرة', icon: 'hourglass-half', color: COLORS.gold, desc: 'وثّقي تطور بشرتكِ أو شعركِ مع الصور.' },
    { id: 'qa', label: 'سؤال وجواب', icon: 'question-circle', color: COLORS.blue, desc: 'اطلبي المساعدة من المجتمع والخبراء.' },
    { id: 'routine_rate', label: 'تقييم روتيني', icon: 'clipboard-list', color: COLORS.purple, desc: 'اعرضي روتينكِ واحصلي على نصائح.' } 
];

// --- COMPONENTS ---

// 1. Wathiq Score Ring (Visualizes the score)
const WathiqScoreBadge = ({ score }) => {
    const color = score >= 80 ? COLORS.accentGreen : score >= 50 ? COLORS.gold : COLORS.danger;
    return (
        <View style={[styles.scoreContainer, { borderColor: color }]}>
            <View style={[styles.scoreFill, { backgroundColor: color, opacity: 0.15 }]} />
            <Text style={[styles.scoreValue, { color: color }]}>{score}</Text>
            <Text style={[styles.scoreLabel, { color: color }]}>تقييم وثيق</Text>
        </View>
    );
};

// 2. Comments Modal (Fully Functional)
const CommentModal = ({ visible, onClose, post, currentUser }) => {
    const [comment, setComment] = useState('');
    const [commentsList, setCommentsList] = useState([]); 
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef();

    // Fetch Real Comments
    useEffect(() => {
        if (!post?.id || !visible) return;
        setLoading(true);
        const q = query(
            collection(db, 'posts', post.id, 'comments'), 
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setCommentsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [post?.id, visible]);

    const handleSend = async () => {
        if (!comment.trim()) return;
        const text = comment.trim();
        setComment(''); // Optimistic clear
        Keyboard.dismiss();

        try {
            // 1. Add Comment
            await addDoc(collection(db, 'posts', post.id, 'comments'), {
                text,
                userId: currentUser.uid,
                userName: currentUser.settings?.name || 'مستخدم',
                createdAt: serverTimestamp()
            });
            // 2. Increment Counter
            await updateDoc(doc(db, 'posts', post.id), {
                commentsCount: increment(1)
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            // Scroll to bottom
            setTimeout(() => flatListRef.current?.scrollToEnd(), 200);
        } catch (error) {
            console.error(error);
            Alert.alert("خطأ", "لم يتم إرسال التعليق");
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.commentModalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>التعليقات ({commentsList.length})</Text>
                    <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
                </View>
                
                {loading ? (
                    <ActivityIndicator color={COLORS.accentGreen} style={{marginTop: 20}} />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={commentsList}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{padding: 20, paddingBottom: 100}}
                        renderItem={({ item }) => {
                            const isMe = item.userId === currentUser.uid;
                            return (
                                <View style={[styles.commentItem, isMe ? styles.commentItemMe : styles.commentItemOther]}>
                                    <View style={styles.commentBubble}>
                                        {!isMe && <Text style={styles.commentUser}>{item.userName}</Text>}
                                        <Text style={styles.commentText}>{item.text}</Text>
                                        <Text style={styles.commentTime}>
                                            {item.createdAt ? formatDistanceToNow(item.createdAt.toDate(), { locale: ar }) : 'الآن'}
                                        </Text>
                                    </View>
                                </View>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={{color: COLORS.textDim}}>لا توجد تعليقات بعد. كن أول من يرد!</Text>
                            </View>
                        }
                    />
                )}

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
                    <View style={styles.commentInputBox}>
                        <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, !comment.trim() && {opacity: 0.5}]} disabled={!comment.trim()}>
                            <FontAwesome5 name="arrow-up" size={16} color={COLORS.background} />
                        </TouchableOpacity>
                        <TextInput 
                            style={styles.commentInput} 
                            placeholder="أكتب تعليقاً..." 
                            placeholderTextColor={COLORS.textDim}
                            value={comment}
                            onChangeText={setComment}
                            multiline
                        />
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

// --- CONTENT TYPES ---

const ReviewContent = ({ post, onViewProduct }) => (
    <View>
        <Text style={styles.postContent}>{post.content}</Text>
        {post.taggedProduct && (
            <TouchableOpacity onPress={() => onViewProduct(post.taggedProduct)} activeOpacity={0.9} style={styles.reviewCard}>
                <WathiqScoreBadge score={post.taggedProduct.score} />
                <View style={{flex: 1, marginRight: 15, justifyContent: 'center'}}>
                    <Text style={styles.taggedProductName}>{post.taggedProduct.name}</Text>
                    <View style={{flexDirection: 'row-reverse', alignItems: 'center', marginTop: 4}}>
                        <Text style={styles.tapToView}>اضغط لعرض التحليل الكامل</Text>
                        <FontAwesome5 name="chevron-left" size={10} color={COLORS.accentGreen} style={{marginRight: 4}} />
                    </View>
                </View>
                <Image source={require('../../assets/icon.png')} style={styles.productThumb} />
            </TouchableOpacity>
        )}
        {post.imageUrl && <Image source={{ uri: post.imageUrl }} style={styles.postImage} />}
    </View>
);

const JourneyContent = ({ post }) => (
    <View>
        <Text style={styles.postContent}>{post.content}</Text>
        <View style={styles.journeyMetaRow}>
            <View style={styles.journeyBadge}>
                <FontAwesome5 name="clock" size={12} color={COLORS.gold} />
                <Text style={styles.journeyBadgeText}>المدة: {post.duration || 'غير محدد'}</Text>
            </View>
        </View>
        <View style={styles.beforeAfterContainer}>
            <View style={styles.baImageWrapper}>
                <Text style={styles.baLabel}>قبل</Text>
                {post.beforeImage ? <Image source={{ uri: post.beforeImage }} style={styles.baImage} /> : <View style={[styles.baImage, {backgroundColor: '#000'}]} />}
            </View>
            <View style={styles.baDivider}><FontAwesome5 name="arrow-left" size={14} color={COLORS.textSecondary} /></View>
            <View style={styles.baImageWrapper}>
                <Text style={styles.baLabel}>بعد</Text>
                {post.afterImage ? <Image source={{ uri: post.afterImage }} style={styles.baImage} /> : <View style={[styles.baImage, {backgroundColor: '#000'}]} />}
            </View>
        </View>
    </View>
);

const QAContent = ({ post }) => (
    <View>
        <Text style={styles.qaTitle}>{post.title}</Text>
        <Text style={styles.postContent}>{post.content}</Text>
    </View>
);

const RoutineRateContent = ({ post }) => (
    <View>
        <Text style={styles.postContent}>{post.content}</Text>
        <View style={styles.routineVisualContainer}>
            <View style={styles.routineColumn}>
                <View style={styles.routineHeader}><Feather name="sun" size={14} color={COLORS.gold} /><Text style={styles.routineHeaderText}>الصباح</Text></View>
                {post.routineSnapshot?.am?.map((p, i) => <View key={i} style={styles.miniProductPill}><Text style={styles.miniProductText}>{p.name}</Text></View>)}
            </View>
            <View style={{width: 1, backgroundColor: COLORS.border}} />
            <View style={styles.routineColumn}>
                <View style={styles.routineHeader}><Feather name="moon" size={14} color={COLORS.blue} /><Text style={styles.routineHeaderText}>المساء</Text></View>
                {post.routineSnapshot?.pm?.map((p, i) => <View key={i} style={styles.miniProductPill}><Text style={styles.miniProductText}>{p.name}</Text></View>)}
            </View>
        </View>
    </View>
);

// --- POST CARD ---
const PostCard = React.memo(({ post, currentUser, onInteract, onDelete, onViewProduct, onOpenComments }) => {
    const isLiked = post.likes && post.likes.includes(currentUser?.uid);
    const matchLabel = currentUser?.settings && post.authorSettings?.skinType === currentUser.settings.skinType ? 'بشرة مشابهة لكِ' : null;
    
    const getTypeConfig = () => {
        switch(post.type) {
            case 'review': return { icon: 'star', color: COLORS.accentGreen, label: 'تجربة' };
            case 'journey': return { icon: 'hourglass-half', color: COLORS.gold, label: 'رحلة' };
            case 'qa': return { icon: 'question-circle', color: COLORS.blue, label: 'سؤال' };
            case 'routine_rate': return { icon: 'clipboard-list', color: COLORS.purple, label: 'تقييم' };
            default: return { icon: 'pen', color: COLORS.textSecondary, label: 'عام' };
        }
    };
    const config = getTypeConfig();

    return (
        <View style={styles.cardBase}>
            {/* Header */}
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitial}>{post.userName?.charAt(0) || 'U'}</Text></View>
                    <View>
                        <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 6}}>
                            <Text style={styles.userName}>{post.userName}</Text>
                            {post.authorSettings?.skinType && <View style={styles.bioBadge}><Text style={styles.bioBadgeText}>{post.authorSettings.skinType}</Text></View>}
                        </View>
                        <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 6}}>
                            <Text style={[styles.timestamp, {color: config.color, fontFamily: 'Tajawal-Bold'}]}>{config.label}</Text>
                            <Text style={styles.timestamp}>• {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { locale: ar }) : 'الآن'}</Text>
                        </View>
                    </View>
                </View>
                {post.userId === currentUser?.uid && (
                    <TouchableOpacity onPress={() => onDelete(post.id)}><Ionicons name="trash-outline" size={18} color={COLORS.danger} /></TouchableOpacity>
                )}
            </View>

            {/* Match Banner */}
            {matchLabel && <View style={styles.matchIndicator}><FontAwesome5 name="check-double" size={10} color={COLORS.accentGreen} /><Text style={styles.matchText}>{matchLabel}</Text></View>}

            {/* Body */}
            <View style={{marginBottom: 10}}>
                {post.type === 'review' && <ReviewContent post={post} onViewProduct={onViewProduct} />}
                {post.type === 'journey' && <JourneyContent post={post} />}
                {post.type === 'qa' && <QAContent post={post} />}
                {post.type === 'routine_rate' && <RoutineRateContent post={post} />}
            </View>

            {/* Actions */}
            <View style={styles.cardFooter}>
                <TouchableOpacity style={[styles.actionButton, isLiked && {backgroundColor: COLORS.accentGreen + '15', borderColor: COLORS.accentGreen + '30'}]} onPress={() => onInteract(post.id, 'like')}>
                    <FontAwesome5 name={isLiked ? "heart" : "heart"} solid={isLiked} size={16} color={isLiked ? COLORS.danger : COLORS.textSecondary} />
                    <Text style={[styles.statText, isLiked && {color: COLORS.danger}]}>{post.likesCount || 0}</Text>
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

// --- MAIN SCREEN ---
export default function CommunityScreen() {
    const { user, userProfile, savedProducts } = useAppContext();
    const insets = useSafeAreaInsets();
    
    const [viewMode, setViewMode] = useState('menu');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [allPosts, setAllPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    
    // Interactions
    const [commentingPost, setCommentingPost] = useState(null);

    // 1. Fetch Posts
    useEffect(() => {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
        const unsubscribe = onSnapshot(q, (snap) => {
            const postsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllPosts(postsData);
            setLoading(false);
        }, (err) => { console.error(err); setLoading(false); });
        return () => unsubscribe();
    }, []);

    // 2. Filter Locally
    const filteredPosts = useMemo(() => {
        if (!selectedCategory) return [];
        return allPosts.filter(p => p.type === selectedCategory.id);
    }, [allPosts, selectedCategory]);

    // 3. Native Back Button
    useEffect(() => {
        const backAction = () => {
            if (viewMode === 'feed') { 
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setViewMode('menu'); 
                setSelectedCategory(null); 
                return true; 
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [viewMode]);

    // 4. Actions
    const handleCreate = async (payload) => {
        try {
            await addDoc(collection(db, 'posts'), {
                ...payload,
                userId: user.uid,
                userName: userProfile?.settings?.name || 'مستخدم',
                authorSettings: { skinType: userProfile?.settings?.skinType, scalpType: userProfile?.settings?.scalpType },
                likes: [], likesCount: 0, commentsCount: 0, createdAt: serverTimestamp()
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) { Alert.alert("خطأ", "فشل النشر"); }
    };

    const handleInteract = async (postId, type) => {
        const postRef = doc(db, 'posts', postId);
        const post = allPosts.find(p => p.id === postId);
        const isLiked = post.likes?.includes(user.uid);
        if (type === 'like') {
            await updateDoc(postRef, { likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid), likesCount: increment(isLiked ? -1 : 1) });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handleDelete = async (postId) => {
        Alert.alert("حذف", "هل أنت متأكد؟", [{ text: "إلغاء", style: "cancel" }, { text: "حذف", style: "destructive", onPress: async () => { await deleteDoc(doc(db, 'posts', postId)); }}]);
    };

    const handleViewProduct = (product) => {
        // Show alert for now, can implement the full ProductActionSheet here too
        Alert.alert(product.name, `النتيجة: ${product.score}%\nهذا المنتج آمن وموثوق.`);
    };

    const navigateToFeed = (cat) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedCategory(cat);
        setViewMode('feed');
    };

    // --- RENDER MENU ---
    if (viewMode === 'menu') {
        return (
            <View style={styles.container}>
                <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 25 }]}>
                    <View>
                        <Text style={styles.headerTitle}>مجتمع وثيق</Text>
                        <Text style={styles.headerSubtitle}>تجارب حقيقية لجمال آمن</Text>
                    </View>
                    <View style={styles.headerIconBtn}><FontAwesome5 name="users" size={20} color={COLORS.textPrimary} /></View>
                </View>
                <ScrollView contentContainerStyle={styles.menuContainer}>
                    {CATEGORIES.map((item) => (
                        <TouchableOpacity key={item.id} style={styles.categoryCard} onPress={() => navigateToFeed(item)} activeOpacity={0.9}>
                            <LinearGradient colors={[COLORS.card, 'rgba(37, 61, 52, 0.6)']} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
                            <View style={[styles.catIconBox, { backgroundColor: item.color + '20' }]}><FontAwesome5 name={item.icon} size={24} color={item.color} /></View>
                            <View style={{flex: 1}}>
                                <Text style={styles.catTitle}>{item.label}</Text>
                                <Text style={styles.catDesc}>{item.desc}</Text>
                            </View>
                            <FontAwesome5 name="chevron-left" size={16} color={COLORS.textDim} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    }

    // --- RENDER FEED ---
    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 10}}>
                    <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setViewMode('menu'); }} style={styles.backBtn}>
                        <Ionicons name="arrow-forward" size={28} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>{selectedCategory.label}</Text>
                        <Text style={styles.headerSubtitle}>أحدث المشاركات</Text>
                    </View>
                </View>
                <View style={[styles.catIconBoxSmall, { backgroundColor: selectedCategory.color + '20' }]}><FontAwesome5 name={selectedCategory.icon} size={16} color={selectedCategory.color} /></View>
            </View>

            {loading ? <ActivityIndicator size="large" color={COLORS.accentGreen} style={{marginTop: 50}} /> : (
                <FlatList
                    data={filteredPosts}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <PostCard 
                            post={item} 
                            currentUser={userProfile ? {...userProfile, uid: user.uid} : {uid: user.uid}}
                            onInteract={handleInteract}
                            onDelete={handleDelete}
                            onViewProduct={handleViewProduct}
                            onOpenComments={setCommentingPost}
                        />
                    )}
                    contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="post-outline" size={60} color={COLORS.textDim} />
                            <Text style={styles.emptyText}>القسم فارغ حالياً.</Text>
                            <TouchableOpacity style={styles.emptyActionBtn} onPress={() => setCreateModalVisible(true)}><Text style={styles.emptyActionText}>أضف أول مشاركة</Text></TouchableOpacity>
                        </View>
                    }
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={() => setCreateModalVisible(true)} activeOpacity={0.8}>
                <LinearGradient colors={[selectedCategory.color, COLORS.card]} style={styles.fabGradient}><Feather name="plus" size={24} color={COLORS.textOnAccent} /></LinearGradient>
            </TouchableOpacity>

            <CreatePostModal visible={isCreateModalVisible} onClose={() => setCreateModalVisible(false)} onSubmit={handleCreate} savedProducts={savedProducts} userRoutines={userProfile?.routines} defaultType={selectedCategory.id} />
            <CommentModal visible={!!commentingPost} onClose={() => setCommentingPost(null)} post={commentingPost} currentUser={userProfile ? {...userProfile, uid: user.uid} : {uid: user.uid}} />
        </View>
    );
}

// --- CREATE POST MODAL (Same as previous, just importing dependencies) ---
const CreatePostModal = ({ visible, onClose, onSubmit, savedProducts, userRoutines, defaultType }) => {
    const [type, setType] = useState(defaultType || 'review'); 
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [images, setImages] = useState({ main: null, before: null, after: null });
    const [duration, setDuration] = useState('');

    useEffect(() => { if(visible) setType(defaultType || 'review'); }, [visible, defaultType]);

    const pickImage = async (key) => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
        if (!result.canceled) setImages(prev => ({...prev, [key]: result.assets[0].uri}));
    };

    const handleSubmit = () => {
        if (!content.trim()) { Alert.alert("تنبيه", "يرجى كتابة محتوى للمنشور"); return; }
        if (type === 'review' && !selectedProduct) { Alert.alert("ناقص", "يرجى اختيار منتج لتقييمه"); return; }
        if (type === 'qa' && !title) { Alert.alert("ناقص", "يرجى كتابة عنوان للسؤال"); return; }

        const payload = {
            type, content,
            title: (type === 'qa' && title) ? title : null,
            taggedProduct: selectedProduct ? { id: selectedProduct.id, name: selectedProduct.productName, score: selectedProduct.analysisData?.oilGuardScore || 0, analysisData: selectedProduct.analysisData } : null,
            imageUrl: images.main || null, 
            beforeImage: images.before || null, afterImage: images.after || null,
            duration: (type === 'journey' && duration) ? duration : null,
            routineSnapshot: (type === 'journey' || type === 'routine_rate') ? { am: userRoutines?.am?.map(s => ({name: s.name})) || [], pm: userRoutines?.pm?.map(s => ({name: s.name})) || [] } : null
        };
        onSubmit(payload);
        setContent(''); setTitle(''); setImages({}); setSelectedProduct(null);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}><Text style={styles.modalTitle}>إنشاء منشور</Text><TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity></View>
                <ScrollView contentContainerStyle={{paddingBottom: 50}}>
                    {type === 'qa' && <TextInput style={styles.inputTitle} placeholder="عنوان السؤال..." placeholderTextColor={COLORS.textDim} value={title} onChangeText={setTitle} />}
                    <TextInput style={styles.inputContent} placeholder="اكتبي التفاصيل هنا..." placeholderTextColor={COLORS.textDim} multiline value={content} onChangeText={setContent} />
                    {type === 'review' && (
                        <View><Text style={styles.fieldLabel}>المنتج المجرب:</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>{savedProducts.map(p => (<TouchableOpacity key={p.id} style={[styles.productSelectChip, selectedProduct?.id === p.id && {borderColor: COLORS.accentGreen, backgroundColor: COLORS.accentGreen + '20'}]} onPress={() => setSelectedProduct(p)}><Text style={{color: COLORS.textPrimary, fontFamily: 'Tajawal-Regular'}}>{p.productName}</Text></TouchableOpacity>))}</ScrollView><TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage('main')}><Feather name="image" size={20} color={COLORS.textPrimary} /><Text style={styles.uploadBtnText}>{images.main ? 'تم اختيار الصورة' : 'إضافة صورة المنتج'}</Text></TouchableOpacity></View>
                    )}
                    {type === 'journey' && (
                        <View><TextInput style={styles.inputSimple} placeholder="المدة (مثال: 3 أشهر)" placeholderTextColor={COLORS.textDim} value={duration} onChangeText={setDuration} /><View style={{flexDirection: 'row', gap: 10, marginTop: 10}}><TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('before')}>{images.before ? <Image source={{uri: images.before}} style={styles.uploadedThumb} /> : <Text style={styles.uploadBoxText}>قبل</Text>}</TouchableOpacity><TouchableOpacity style={styles.uploadBox} onPress={() => pickImage('after')}>{images.after ? <Image source={{uri: images.after}} style={styles.uploadedThumb} /> : <Text style={styles.uploadBoxText}>بعد</Text>}</TouchableOpacity></View></View>
                    )}
                </ScrollView>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}><Text style={styles.submitButtonText}>نشر الآن</Text></TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 22, color: COLORS.textPrimary, textAlign: 'right' },
    headerSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right' },
    headerIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    backBtn: { padding: 5 },
    menuContainer: { padding: 20, gap: 15 },
    categoryCard: { flexDirection: 'row-reverse', alignItems: 'center', height: 100, borderRadius: 24, padding: 20, gap: 15, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
    catIconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    catIconBoxSmall: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    catTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 4 },
    catDesc: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right' },
    
    // Post Card
    cardBase: { backgroundColor: COLORS.card, marginHorizontal: 15, marginBottom: 15, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: COLORS.border, shadowColor: "#000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    userInfo: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center' },
    avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    avatarInitial: { fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen },
    userName: { fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, fontSize: 14, textAlign: 'right' },
    timestamp: { fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 11, textAlign: 'right' },
    postContent: { fontFamily: 'Tajawal-Regular', color: COLORS.textPrimary, fontSize: 14, textAlign: 'right', lineHeight: 22, marginBottom: 10 },
    cardFooter: { flexDirection: 'row-reverse', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, gap: 10 },
    actionButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
    actionText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textSecondary },
    statText: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.textDim },
    
    // Review Styles
    reviewCard: { flexDirection: 'row-reverse', backgroundColor: COLORS.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
    productThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#fff' },
    taggedProductName: { fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, fontSize: 13, textAlign: 'right' },
    tapToView: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.accentGreen },
    scoreContainer: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    scoreFill: { ...StyleSheet.absoluteFillObject, borderRadius: 25 },
    scoreValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 14 },
    scoreLabel: { fontFamily: 'Tajawal-Regular', fontSize: 6, textAlign: 'center' },

    // Bio & Match
    bioBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    bioBadgeText: { color: COLORS.textSecondary, fontSize: 10, fontFamily: 'Tajawal-Regular' },
    matchIndicator: { flexDirection: 'row-reverse', gap: 6, backgroundColor: COLORS.accentGreen + '15', paddingHorizontal: 10, paddingVertical: 4, marginHorizontal: 0, marginTop: -5, marginBottom: 10, alignSelf: 'flex-end', borderRadius: 6, borderWidth: 1, borderColor: COLORS.accentGreen + '30' },
    matchText: { color: COLORS.accentGreen, fontSize: 10, fontFamily: 'Tajawal-Bold' },

    // Special Content
    qaTitle: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 6 },
    journeyMetaRow: { flexDirection: 'row-reverse', marginBottom: 10 },
    journeyBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    journeyBadgeText: { color: COLORS.gold, fontSize: 12, fontFamily: 'Tajawal-Bold' },
    beforeAfterContainer: { flexDirection: 'row', height: 120, marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
    baImageWrapper: { flex: 1, position: 'relative' },
    baImage: { width: '100%', height: '100%' },
    baLabel: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: 4, borderRadius: 4, overflow: 'hidden', fontFamily: 'Tajawal-Bold', zIndex: 1 },
    baDivider: { width: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card },
    routineSnapshotBox: { backgroundColor: COLORS.background, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed' },
    routineSnapshotTitle: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, fontSize: 11, textAlign: 'right' },
    routineSnapshotText: { fontFamily: 'Tajawal-Regular', color: COLORS.textPrimary, fontSize: 12, textAlign: 'right' },
    routineVisualContainer: { flexDirection: 'row-reverse', backgroundColor: COLORS.background, borderRadius: 12, padding: 10, marginTop: 10 },
    routineColumn: { flex: 1, gap: 6 },
    routineHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 },
    routineHeaderText: { color: COLORS.textSecondary, fontSize: 12, fontFamily: 'Tajawal-Bold' },
    miniProductPill: { backgroundColor: COLORS.card, padding: 6, borderRadius: 6 },
    miniProductText: { color: COLORS.textPrimary, fontSize: 10, textAlign: 'right' },

    // Modal
    modalContainer: { flex: 1, backgroundColor: COLORS.background, paddingTop: 50 },
    modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
    modalTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: COLORS.textPrimary },
    typeChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 5, height: 45 },
    typeChipText: { color: COLORS.textSecondary, fontFamily: 'Tajawal-Regular' },
    inputTitle: { backgroundColor: COLORS.card, color: COLORS.textPrimary, fontSize: 16, fontFamily: 'Tajawal-Bold', textAlign: 'right', padding: 15, borderRadius: 12, marginHorizontal: 20, marginBottom: 15 },
    inputContent: { backgroundColor: COLORS.card, color: COLORS.textPrimary, fontSize: 14, fontFamily: 'Tajawal-Regular', textAlign: 'right', padding: 15, borderRadius: 12, marginHorizontal: 20, height: 120, textAlignVertical: 'top', marginBottom: 20 },
    fieldLabel: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, textAlign: 'right', marginRight: 20, marginBottom: 10 },
    productSelectChip: { backgroundColor: COLORS.card, padding: 10, borderRadius: 10, marginHorizontal: 5, borderWidth: 1, borderColor: COLORS.border },
    uploadBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.card, marginHorizontal: 20, padding: 12, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.textSecondary },
    uploadBtnText: { color: COLORS.textSecondary, fontFamily: 'Tajawal-Regular' },
    inputSimple: { backgroundColor: COLORS.card, color: COLORS.textPrimary, marginHorizontal: 20, padding: 12, borderRadius: 12, textAlign: 'right' },
    uploadBox: { flex: 1, height: 100, backgroundColor: COLORS.card, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', marginHorizontal: 5 },
    uploadBoxText: { color: COLORS.textSecondary },
    uploadedThumb: { width: '100%', height: '100%', borderRadius: 12 },
    submitButton: { backgroundColor: COLORS.accentGreen, margin: 20, padding: 15, borderRadius: 15, alignItems: 'center' },
    submitButtonText: { fontFamily: 'Tajawal-Bold', color: COLORS.textOnAccent, fontSize: 16 },
    postImage: { width: '100%', height: 200, borderRadius: 12, marginTop: 10 },
    emptyState: { alignItems: 'center', marginTop: 50, opacity: 0.5 },
    emptyText: { color: COLORS.textDim, fontFamily: 'Tajawal-Regular', marginTop: 10 },
    emptyActionBtn: { marginTop: 15, backgroundColor: COLORS.accentGreen, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    emptyActionText: { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold' },
    fab: { position: 'absolute', bottom: 90, left: 20, zIndex: 100 },
    fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },

    // Comments Modal
    commentModalContainer: { flex: 1, backgroundColor: COLORS.background },
    commentItem: { marginBottom: 15 },
    commentItemMe: { flexDirection: 'row' },
    commentItemOther: { flexDirection: 'row-reverse' },
    commentBubble: { backgroundColor: COLORS.card, padding: 12, borderRadius: 16, maxWidth: '80%' },
    commentUser: { color: COLORS.textSecondary, fontSize: 11, fontFamily: 'Tajawal-Bold', marginBottom: 4, textAlign: 'right' },
    commentText: { color: COLORS.textPrimary, fontSize: 13, fontFamily: 'Tajawal-Regular', textAlign: 'right' },
    commentTime: { color: COLORS.textDim, fontSize: 10, marginTop: 4, textAlign: 'right' },
    commentInputBox: { flexDirection: 'row-reverse', padding: 15, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background, alignItems: 'flex-end', gap: 10 },
    commentInput: { flex: 1, backgroundColor: COLORS.card, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, color: COLORS.textPrimary, textAlign: 'right', fontFamily: 'Tajawal-Regular', maxHeight: 100 },
    sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accentGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});