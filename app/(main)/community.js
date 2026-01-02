import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, StyleSheet, ScrollView, FlatList, TouchableOpacity, Text, 
  ActivityIndicator, BackHandler, LayoutAnimation, Platform, UIManager, StatusBar, AppState, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- IMPORTS: CONSTANTS & CONFIG ---
import { COLORS } from '../../src/constants/theme';
import { CATEGORIES } from '../../src/constants/categories';
import { useAppContext } from '../../src/context/AppContext';
import { db } from '../../src/config/firebase';
import { 
  collection, query, orderBy, where, getDocs, getCountFromServer, Timestamp, limit 
} from 'firebase/firestore'; 

// --- IMPORTS: SERVICES ---
import { 
  toggleLikePost, 
  deletePost, 
  createPost, 
  saveProductToShelf 
} from '../../src/services/communityService';
import { AlertService } from '../../src/services/alertService';
import { setPostsCache, getPostsCache } from '../../src/services/cachingService';

// --- IMPORTS: COMPONENTS ---
import PostCard from '../../src/components/community/PostCard';
import CreatePostModal from '../../src/components/community/CreatePostModal';
import CommentModal from '../../src/components/community/CommentModal';
import ProductActionSheet from '../../src/components/community/ProductActionSheet';
import SearchFilterBar from '../../src/components/community/SearchFilterBar';
import FullImageViewer from '../../src/components/common/FullImageViewer';
import UserProfileModal from '../../src/components/community/UserProfileModal';
import CommunityRefreshHandler from '../../src/components/community/CommunityRefreshHandler'; 
import SortTabs from '../../src/components/community/SortTabs'; 
import CommunityIntro from '../../src/components/community/CommunityIntro';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    if (!global?.nativeFabricUIManager) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

// 🔴 DEBUG FLAG: Set to 'false' for production behavior
const ALWAYS_SHOW_INTRO_DEBUG = false; 

// --- SUB-COMPONENT: NEW POSTS TOAST ---
const NewPostsToast = ({ visible, onPress }) => {
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: visible ? 20 : -100,
            friction: 7,
            useNativeDriver: true,
        }).start();
    }, [visible]);

    return (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity onPress={onPress} style={styles.toastButton}>
                <Feather name="arrow-up" size={16} color={COLORS.accentGreen} />
                <Text style={styles.toastText}>منشورات جديدة</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

// --- HELPER: DATA NORMALIZER ---
// Prevents crashes by ensuring createdAt is always a string before rendering
const normalizePosts = (posts) => {
    return posts.map(post => {
        const newPost = { ...post };
        if (newPost.createdAt && typeof newPost.createdAt.toDate === 'function') {
            newPost.createdAt = newPost.createdAt.toDate().toISOString();
        } else if (typeof newPost.createdAt === 'string') {
            const d = new Date(newPost.createdAt);
            if (isNaN(d.getTime())) {
                newPost.createdAt = new Date().toISOString();
            }
        } else if (!newPost.createdAt) {
            newPost.createdAt = new Date().toISOString();
        }
        return newPost;
    });
};

export default function CommunityScreen() {
    const { user, userProfile, savedProducts } = useAppContext();
    const insets = useSafeAreaInsets();
    
    // --- STATE MANAGEMENT ---
    const [viewMode, setViewMode] = useState('menu');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [allPosts, setAllPosts] = useState([]); 
    const [loading, setLoading] = useState(true); 
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'popular'
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(''); // Delayed value for filtering

    const [isBioFilterActive, setIsBioFilterActive] = useState(false);
    
    // New Post Notification
    const [newPostsCount, setNewPostsCount] = useState(0);
    const newPostsAvailable = newPostsCount > 0;
    
    // Intro State
    const [showIntro, setShowIntro] = useState(false);

    const flatListRef = useRef(null);

    // Modals
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [viewingProduct, setViewingProduct] = useState(null);
    const [commentingPost, setCommentingPost] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);
    
    // 🟢 OPTIMIZATION: State now holds Object {id, data} instead of just ID string
    const [viewingUserProfile, setViewingUserProfile] = useState(null);

    // Effect to handle debounced search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 400); // Wait 400ms after typing stops

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // --- DATA FETCHING (SMART HYBRID) ---
    useEffect(() => {
        const checkForNewPosts = async () => {
            const { lastFetchTimestamp } = await getPostsCache();
            if (!lastFetchTimestamp) return;

            const lastDate = new Date(lastFetchTimestamp);
            if (isNaN(lastDate.getTime())) return;

            // Safe Buffer: Add 1 second to avoid counting the same post
            const safeDate = new Date(lastDate.getTime() + 1000);

            const q = query(
                collection(db, 'posts'),
                where('createdAt', '>', Timestamp.fromDate(safeDate))
            );
            
            try {
                // Cheap count query
                const snapshot = await getCountFromServer(q);
                setNewPostsCount(snapshot.data().count);
            } catch (error) {
                console.log("Check posts error:", error);
            }
        };

        const loadInitialFeed = async () => {
            // 1. Try Cache First
            const { posts: cachedPosts } = await getPostsCache();
            
            if (cachedPosts && cachedPosts.length > 0) {
                setAllPosts(cachedPosts);
                setLoading(false);
                // Check for updates in background
                checkForNewPosts();
            } else {
                // 2. Fetch Fresh if Cache Empty
                await loadNewPosts(true); 
            }
        };

        const checkIntroVisibility = async () => {
            if (ALWAYS_SHOW_INTRO_DEBUG) {
                setShowIntro(true);
                return;
            }
            try {
                const hasSeen = await AsyncStorage.getItem('has_seen_community_intro');
                if (hasSeen !== 'true') {
                    setShowIntro(true);
                }
            } catch (e) { console.log(e); }
        };

        loadInitialFeed();
        checkIntroVisibility();

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                checkForNewPosts();
            }
        });

        // 🟢 OPTIMIZATION: Removed redundant setInterval polling loop
        // Rely on AppState change and Manual Refresh instead.

        return () => {
            subscription.remove();
        };
    }, []);

    // --- FETCH LOGIC WITH SORTING ---
    const loadNewPosts = async (isInitialFetch = false, customSortMode = null) => {
        const mode = customSortMode || sortBy;
        
        setNewPostsCount(0);
        if (!isInitialFetch) {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
        
        try {
            let q;
            // Sorting Logic
            if (mode === 'popular') {
                q = query(
                    collection(db, 'posts'),
                    orderBy('likesCount', 'desc'),
                    orderBy('createdAt', 'desc'),
                    limit(20) // 🟢 OPTIMIZATION: Reduced limit from 50 to 20
                );
            } else {
                // Default: Recent
                q = query(
                    collection(db, 'posts'), 
                    orderBy('createdAt', 'desc'), 
                    limit(20) // 🟢 OPTIMIZATION: Reduced limit from 50 to 20
                );
            }

            const snapshot = await getDocs(q);
            const freshPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const normalized = normalizePosts(freshPosts);

            setAllPosts(normalized);
            
            // Only cache "Recent" feed to maintain chronological consistency for next app open
            if (mode === 'recent') {
                await setPostsCache(normalized); 
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            AlertService.error("خطأ", "تعذر تحميل المنشورات.");
        } finally {
            if (isInitialFetch) setLoading(false);
        }
    };

    const handleSortChange = (newMode) => {
        if (newMode === sortBy) return;
        Haptics.selectionAsync();
        setSortBy(newMode);
        setLoading(true);
        loadNewPosts(true, newMode);
    };

    // --- NAVIGATION ---
    useEffect(() => {
        const backAction = () => {
            if (viewMode === 'feed') { goBackToMenu(); return true; }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [viewMode]);

    const goBackToMenu = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setViewMode('menu'); 
        setSelectedCategory(null);
        setSearchQuery('');
        setIsBioFilterActive(false);
    };

    const navigateToFeed = (cat) => {
        Haptics.selectionAsync();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedCategory(cat);
        setViewMode('feed');
    };

    // --- FILTERING ---
    const filteredPosts = useMemo(() => {
        let result = selectedCategory ? allPosts.filter(p => p.type === selectedCategory.id) : [];
        
        // 1. Bio Filter
        if (isBioFilterActive && userProfile?.settings) {
            result = result.filter(post => {
                const author = post.authorSettings || {};
                const me = userProfile.settings;
                return (author.skinType === me.skinType) || (author.scalpType === me.scalpType);
            });
        }
        
        // 2. Search Filter
        if (debouncedSearchQuery.trim()) {
            const q = debouncedSearchQuery.toLowerCase();
            result = result.filter(post => 
                (post.content && post.content.toLowerCase().includes(q)) ||
                (post.userName && post.userName.toLowerCase().includes(q)) ||
                (post.taggedProduct?.name && post.taggedProduct.name.toLowerCase().includes(q)) ||
                (post.title && post.title.toLowerCase().includes(q))
            );
        }
        return result;
    }, [allPosts, selectedCategory, debouncedSearchQuery, isBioFilterActive, userProfile]);
    
    // --- ACTION HANDLERS ---
    const handleCreateWrapper = async (payload) => {
        try {
            await createPost(
                payload, 
                user.uid, 
                userProfile?.settings?.name || 'مستخدم',
                userProfile?.settings || {} 
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await loadNewPosts(true); 
        } catch (e) { /* Service handles error */ }
    };

    const handleInteract = async (postId) => {
        const post = allPosts.find(p => p.id === postId);
        if (!post) return;
        
        const isLiked = post.likes?.includes(user.uid);
        
        // Optimistic UI Update
        const updatedPosts = allPosts.map(p => {
            if (p.id === postId) {
                const currentLikes = p.likes || [];
                const likesCount = p.likesCount || 0;
                return {
                    ...p,
                    likes: isLiked ? currentLikes.filter(uid => uid !== user.uid) : [...currentLikes, user.uid],
                    likesCount: isLiked ? Math.max(0, likesCount - 1) : likesCount + 1,
                };
            }
            return p;
        });
        setAllPosts(updatedPosts);
        
        await toggleLikePost(postId, user.uid, isLiked);
    };

    const handleDeleteWrapper = (postId) => {
        AlertService.delete(
            "حذف المنشور",
            "هل أنت متأكد من حذف هذا المنشور؟",
            async () => {
                await deletePost(postId);
                setAllPosts(prev => prev.filter(p => p.id !== postId));
                AlertService.success("تم الحذف", "تم حذف المنشور بنجاح.");
            }
        );
    };

    const handleSaveWrapper = async (product) => {
        const productExists = savedProducts.some(
            p => p.productName.toLowerCase().trim() === product.name.toLowerCase().trim()
        );

        if (productExists) {
            AlertService.show({ title: "موجود بالفعل", message: "هذا المنتج موجود بالفعل في رفّك.", type: 'info' });
            setViewingProduct(null);
            return;
        }

        try {
            await saveProductToShelf(user.uid, product);
            setViewingProduct(null);
            AlertService.success("تم الحفظ", "تمت إضافة المنتج إلى رفّك بنجاح.");
        } catch(e) { /* Service handles error */ }
    };

    // --- SMART REFRESH ---
    const handleRefresh = async () => {
        // If sorting by popular, just reload the list
        if (sortBy === 'popular') {
            await loadNewPosts(false, 'popular');
            return;
        }

        if (!allPosts || allPosts.length === 0) return await loadNewPosts(true);

        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            const newestPost = allPosts[0];
            let newestDate;
            if (newestPost.createdAt && typeof newestPost.createdAt.toDate === 'function') {
                newestDate = newestPost.createdAt.toDate();
            } else {
                newestDate = new Date(newestPost.createdAt);
            }
            if (isNaN(newestDate.getTime())) newestDate = new Date();

            const q = query(
                collection(db, 'posts'),
                where('createdAt', '>', Timestamp.fromDate(newestDate)),
                orderBy('createdAt', 'desc')
            );

            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const freshItems = normalizePosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                const merged = [...freshItems, ...allPosts].slice(0, 100);
                setAllPosts(merged);
                await setPostsCache(merged);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            setNewPostsCount(0);
        } catch (error) { 
            console.error("Refresh Error", error); 
        } finally { 
            setRefreshing(false); 
        }
    };


    // --- RENDER LOGIC ---
    if (viewMode === 'menu') {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
                <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 25 }]}>
                    <View>
                        <Text style={styles.headerTitle}>مجتمع وثيق</Text>
                        <Text style={styles.headerSubtitle}>تجارب حقيقية لجمال آمن</Text>
                    </View>
                    <View style={styles.headerIconBtn}>
                        <FontAwesome5 name="users" size={20} color={COLORS.textPrimary} />
                    </View>
                </View>
                <ScrollView contentContainerStyle={styles.menuContainer}>
                    {CATEGORIES.map((item) => (
                        <TouchableOpacity key={item.id} style={styles.categoryCard} onPress={() => navigateToFeed(item)} activeOpacity={0.9}>
                            <LinearGradient colors={[COLORS.card, 'rgba(37, 61, 52, 0.6)']} style={StyleSheet.absoluteFill} start={{x: 0, y: 0}} end={{x: 1, y: 1}} />
                            <View style={[styles.catIconBox, { backgroundColor: item.color + '20' }]}><FontAwesome5 name={item.icon} size={24} color={item.color} /></View>
                            <View style={{flex: 1}}><Text style={styles.catTitle}>{item.label}</Text><Text style={styles.catDesc}>{item.desc}</Text></View>
                            <FontAwesome5 name="chevron-left" size={16} color={COLORS.textDim} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <CommunityIntro visible={showIntro} onClose={() => setShowIntro(false)} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 10}}>
                    <TouchableOpacity onPress={goBackToMenu} style={styles.backBtn}>
                        <Ionicons name="arrow-forward" size={28} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>{selectedCategory.label}</Text>
                        <Text style={styles.headerSubtitle}>أحدث المشاركات</Text>
                    </View>
                </View>
                <View style={[styles.catIconBoxSmall, { backgroundColor: selectedCategory.color + '20' }]}>
                    <FontAwesome5 name={selectedCategory.icon} size={16} color={selectedCategory.color} />
                </View>
            </View>

            {/* Filter & Sort Wrapper */}
            <View style={{ zIndex: 20, elevation: 20, backgroundColor: COLORS.background }}>
                <SearchFilterBar 
                    searchQuery={searchQuery}
                    onSearchChange={(text) => setSearchQuery(text)}
                    isBioFilterActive={isBioFilterActive}
                    onToggleBioFilter={() => { Haptics.selectionAsync(); LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsBioFilterActive(!isBioFilterActive); }}
                    userSkinType={userProfile?.settings?.skinType}
                />
                
                <SortTabs 
                    currentSort={sortBy} 
                    onSelect={handleSortChange} 
                />
            </View>

            {/* Feed Content */}
            {loading && allPosts.length === 0 ? (
                <ActivityIndicator size="large" color={COLORS.accentGreen} style={{marginTop: 50}} />
            ) : (
                <CommunityRefreshHandler
                    flatListRef={flatListRef}
                    data={filteredPosts}
                    onRefresh={handleRefresh}
                    loading={loading}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
                    initialNumToRender={5}   
                    maxToRenderPerBatch={5}  
                    windowSize={5}           
                    removeClippedSubviews={true} 
                    renderItem={({ item }) => (
                        <PostCard 
                            post={item} 
                            currentUser={userProfile ? {...userProfile, uid: user.uid} : {uid: user.uid}}
                            onInteract={(postId) => handleInteract(postId)}
                            onDelete={handleDeleteWrapper}
                            onViewProduct={setViewingProduct}
                            onOpenComments={setCommentingPost}
                            onImagePress={setViewingImage}
                            // 🟢 OPTIMIZATION: Pass ID and Data object
                            onProfilePress={(userId, authorSettings) => setViewingUserProfile({ id: userId, data: authorSettings })}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="filter-remove-outline" size={60} color={COLORS.textDim} />
                            <Text style={styles.emptyText}>{searchQuery || isBioFilterActive ? 'لا توجد نتائج تطابق بحثك.' : 'القسم فارغ حالياً.'}</Text>
                            {(!searchQuery && !isBioFilterActive) && (
                                <TouchableOpacity style={styles.emptyActionBtn} onPress={() => setCreateModalVisible(true)}>
                                    <Text style={styles.emptyActionText}>أضف أول مشاركة</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />
            )}

            <NewPostsToast visible={newPostsCount > 0} onPress={() => loadNewPosts(false)} />
            
            <TouchableOpacity style={styles.fab} onPress={() => setCreateModalVisible(true)} activeOpacity={0.8}>
                <LinearGradient colors={[selectedCategory.color, COLORS.card]} style={styles.fabGradient}><Feather name="plus" size={24} color={COLORS.textOnAccent} /></LinearGradient>
            </TouchableOpacity>

            <CreatePostModal visible={isCreateModalVisible} onClose={() => setCreateModalVisible(false)} onSubmit={handleCreateWrapper} savedProducts={savedProducts} userRoutines={userProfile?.routines} defaultType={selectedCategory.id} />
            <ProductActionSheet product={viewingProduct} visible={!!viewingProduct} onClose={() => setViewingProduct(null)} onSave={handleSaveWrapper} />
            <CommentModal visible={!!commentingPost} onClose={() => setCommentingPost(null)} post={commentingPost} currentUser={userProfile ? {...userProfile, uid: user.uid} : {uid: user.uid}} onProfilePress={(userId) => setViewingUserProfile({id: userId})} />
            <FullImageViewer visible={!!viewingImage} imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
            
            {/* 🟢 OPTIMIZATION: Pass extracted ID and initialData to Modal */}
            <UserProfileModal 
                visible={!!viewingUserProfile} 
                onClose={() => setViewingUserProfile(null)} 
                targetUserId={viewingUserProfile?.id} 
                initialData={viewingUserProfile?.data}
                currentUser={userProfile ? {...userProfile, uid: user.uid} : {uid: user.uid}} 
                onProductSelect={setViewingProduct} 
            />
            
            <CommunityIntro visible={showIntro} onClose={() => setShowIntro(false)} />
        </View>
    );
}

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
    emptyState: { alignItems: 'center', marginTop: 50, opacity: 0.5 },
    emptyText: { color: COLORS.textDim, fontFamily: 'Tajawal-Regular', marginTop: 10 },
    emptyActionBtn: { marginTop: 15, backgroundColor: COLORS.accentGreen, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    emptyActionText: { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold' },
    fab: { position: 'absolute', bottom: 90, left: 20, zIndex: 100 },
    fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    toastContainer: { position: 'absolute', top: 60, alignSelf: 'center', zIndex: 1000, shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
    toastButton: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.card, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.accentGreen },
    toastText: { fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen, fontSize: 14, marginLeft: 8 },
});