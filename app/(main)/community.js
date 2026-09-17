import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Text,
    ActivityIndicator, BackHandler, LayoutAnimation, StatusBar, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';

// --- IMPORTS ---
import { COLORS as DEFAULT_COLORS } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { CATEGORIES } from '../../src/constants/categories';
import { useAppContext } from '../../src/context/AppContext';
import { supabase } from '../../src/config/supabase';

import { createPost, saveProductToShelf, deletePost, toggleLikePost } from '../../src/services/communityService';
import { AlertService } from '../../src/services/alertService';
import { setPostsCache, getPostsCache } from '../../src/services/cachingService';

// 🌟 COLLAPSIBLE AUTHENTIC HEADER
import AuthenticHeader, { getHeaderDimensions } from '../../src/utils/AuthenticHeader';

import PostCard from '../../src/components/community/PostCard';
import CreatePostModal from '../../src/components/community/CreatePostModal';
import CommentModal from '../../src/components/community/CommentModal';
import ProductActionSheet from '../../src/components/community/ProductActionSheet';
import SearchFilterBar from '../../src/components/community/SearchFilterBar';
import FullImageViewer from '../../src/components/common/FullImageViewer';
import UserProfileModal from '../../src/components/community/UserProfileModal';
import LeaderboardModal from '../../src/components/community/LeaderboardModal';
import CommunityRefreshHandler from '../../src/components/community/CommunityRefreshHandler';
import SortTabs from '../../src/components/community/SortTabs';
import CommunityIntro from '../../src/components/community/CommunityIntro';
import { t } from '../../src/i18n';
import { useCurrentLanguage } from '../../src/hooks/useCurrentLanguage';
import { useRTL } from '../../src/hooks/useRTL';

const FILTER_BAR_HEIGHT = 110;

const NewPostsToast = ({ visible, onPress, COLORS, styles }) => {
    const language = useCurrentLanguage();
    const slideAnim = useRef(new Animated.Value(-100)).current;
    useEffect(() => {
        Animated.spring(slideAnim, { toValue: visible ? 20 : -100, friction: 7, useNativeDriver: true }).start();
    }, [visible]);
    return (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity onPress={onPress} style={styles.toastButton}>
                <Feather name="arrow-up" size={16} color={COLORS.accentGreen} />
                <Text style={styles.toastText}>{t('community_new_posts', language)}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function CommunityScreen() {
    const { user, userProfile, savedProducts, appConfig } = useAppContext();
    const { colors, activeThemeId } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const isLightTheme = activeThemeId === 'light';
    const language = useCurrentLanguage();
    const rtl = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isLightTheme, rtl), [COLORS, isLightTheme, rtl]);
    
    const insets = useSafeAreaInsets();
    const { openPostId } = useLocalSearchParams();
    const router = useRouter();

    // 🌟 HEADER COLLAPSE DIMENSIONS
    const { maxHeight, scrollDistance } = useMemo(
        () => getHeaderDimensions(insets.top),
        [insets.top]
    );

    // 🌟 SEPARATE SCROLL VALUES FOR ZERO-GLITCH VIEW SWITCHING
    const menuScrollY = useRef(new Animated.Value(0)).current;
    const feedScrollY = useRef(new Animated.Value(0)).current;

    // Filter Bar Sticky Translation in Feed View
    const filterTranslateY = feedScrollY.interpolate({
        inputRange: [0, scrollDistance],
        outputRange: [0, -scrollDistance],
        extrapolate: 'clamp',
    });

    // --- STATE ---
    const [viewMode, setViewMode] = useState('menu');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [allPosts, setAllPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState('recent');
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const loadingMoreRef = useRef(false);
    const isAdmin = !!(user && appConfig?.adminUid && user.uid === appConfig.adminUid);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [isBioFilterActive, setIsBioFilterActive] = useState(false);

    const [newPostsCount, setNewPostsCount] = useState(0);
    const [showIntro, setShowIntro] = useState(false);

    const flatListRef = useRef(null);

    // Modals
    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [viewingProduct, setViewingProduct] = useState(null);
    const [commentingPost, setCommentingPost] = useState(null);
    const [viewingImage, setViewingImage] = useState(null);
    const [viewingUserProfile, setViewingUserProfile] = useState(null);
    const [isLeaderboardVisible, setLeaderboardVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // 🌟 FULLY FIXED DEEP LINKING (NO INFINITE LOOPS, FETCHES OLD POSTS)
    const processedPostId = useRef(null); // Hardware lock to prevent infinite re-renders

    useEffect(() => {
        const handleDeepLinkPost = async () => {
            if (!openPostId || openPostId === processedPostId.current) return;
            
            // 1. Lock immediately to prevent loops
            processedPostId.current = openPostId;
            
            // 2. Check if it's already in memory
            let targetPost = allPosts.find(p => p.id === openPostId);
            
            // 3. If it's an old post not in the first 15 loaded, fetch it directly
            if (!targetPost) {
                try {
                    const { data, error } = await supabase
                        .from('posts')
                        .select('*')
                        .eq('id', openPostId)
                        .single();
                        
                    if (data && !error) {
                        targetPost = {
                            id: data.id,
                            userId: data.firebase_user_id,
                            userName: data.author_snapshot?.name || t('community_default_user', language),
                            authorSettings: data.author_snapshot || {},
                            type: data.type,
                            title: data.title || null,
                            content: data.content,
                            imageUrl: data.image_url || null,
                            createdAt: data.created_at,
                            duration: data.duration || null,
                            audio_url: data.audio_url || null,
                            taggedProduct: !Array.isArray(data.product_snapshot) ? data.product_snapshot : null,
                            journeyProducts: Array.isArray(data.product_snapshot) ? data.product_snapshot : [],
                            routineSnapshot: data.routine_snapshot || null,
                            milestones: data.milestones_snapshot || [],
                            likesCount: data.likes_count || 0,
                            commentsCount: data.comments_count || 0,
                            likes: []
                        };
                        
                        // Silently prepend to feed
                        setAllPosts(prev => {
                            if (prev.some(p => p.id === targetPost.id)) return prev;
                            return [targetPost, ...prev];
                        });
                    }
                } catch (err) {
                    console.error("Failed to fetch deep-linked post:", err);
                }
            }

            // 4. Open the modal securely
            if (targetPost) {
                if (viewMode === 'menu') {
                    const cat = CATEGORIES.find(c => c.id === targetPost.type);
                    if (cat) setSelectedCategory(cat);
                    setViewMode('feed');
                }
                setCommentingPost(targetPost);
                
                // Clear the param safely so a regular page refresh doesn't trigger it again
                router.setParams({ openPostId: '' });
            }
        };

        handleDeepLinkPost();
    }, [openPostId, allPosts, viewMode, language]);


    // --- DATA LOADING & REALTIME SUBSCRIPTION ---
    useEffect(() => {
        if (!user) return;

        const loadInitialFeed = async () => {
            const { posts: cachedPosts } = await getPostsCache();
            if (cachedPosts && cachedPosts.length > 0) {
                setAllPosts(cachedPosts);
                setLoading(false);
                loadNewPosts(false, 'recent', true);
            } else {
                await loadNewPosts(true);
            }
        };

        const checkIntro = async () => {
            try {
                const hasSeen = await AsyncStorage.getItem('has_seen_community_intro');
                if (hasSeen !== 'true') setShowIntro(true);
            } catch (e) { }
        };

        loadInitialFeed();
        checkIntro();

        const channel = supabase.channel('public:posts')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'posts' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        if (user && payload.new.firebase_user_id !== user.uid) {
                            setNewPostsCount(prev => prev + 1);
                        }
                    }
                    if (payload.eventType === 'UPDATE') {
                        setAllPosts(currentPosts =>
                            currentPosts.map(post => {
                                if (post.id === payload.new.id) {
                                    return {
                                        ...post,
                                        likesCount: payload.new.likes_count,
                                        commentsCount: payload.new.comments_count
                                    };
                                }
                                return post;
                            })
                        );
                    }
                    if (payload.eventType === 'DELETE') {
                        setAllPosts(currentPosts =>
                            currentPosts.filter(post => post.id !== payload.old.id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [user]);

    const loadNewPosts = async (isInitialFetch = false, customSortMode = null, isBackground = false, isLoadMore = false) => {
        if (!user) return;

        const mode = customSortMode || sortBy;
        const PAGE_SIZE = 15;
        const offset = isLoadMore ? (selectedCategory ? allPosts.filter(p => p.type === selectedCategory.id).length : allPosts.length) : 0;

        if (isLoadMore) {
            if (loadingMoreRef.current || !hasMore) return;
            loadingMoreRef.current = true;
            setLoadingMore(true);
        } else {
            if (!isInitialFetch && !isBackground) setLoading(true);
            setHasMore(true);
        }

        try {
            let query = supabase.from('posts').select('*');

            if (selectedCategory) {
                query = query.eq('type', selectedCategory.id);
            }

            if (mode === 'popular') {
                query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const { data: postsData, error: postsError } = await query.range(offset, offset + PAGE_SIZE - 1);
            if (postsError) throw postsError;

            if (!postsData || postsData.length < PAGE_SIZE) {
                setHasMore(false);
            }

            let myLikedPostIds = new Set();
            if (postsData && postsData.length > 0) {
                const postIds = postsData.map(p => p.id);
                const { data: myLikesData } = await supabase
                    .from('likes')
                    .select('post_id')
                    .eq('firebase_user_id', user.uid)
                    .in('post_id', postIds);

                myLikedPostIds = new Set(myLikesData?.map(l => l.post_id));
            }

            const normalizedPosts = (postsData || []).map(post => {
                const safeProduct = post.product_snapshot;
                const isLikedByMe = myLikedPostIds.has(post.id);

                return {
                    id: post.id,
                    userId: post.firebase_user_id,
                    userName: post.author_snapshot?.name || t('community_default_user', language),
                    authorSettings: post.author_snapshot || {},
                    type: post.type,
                    title: post.title || null,
                    content: post.content,
                    imageUrl: post.image_url || null,
                    createdAt: post.created_at,
                    duration: post.duration || null,
                    audio_url: post.audio_url || null,
                    taggedProduct: !Array.isArray(safeProduct) ? safeProduct : null,
                    journeyProducts: Array.isArray(safeProduct) ? safeProduct : [],
                    routineSnapshot: post.routine_snapshot || null,
                    milestones: post.milestones_snapshot || [],
                    likesCount: post.likes_count || 0,
                    commentsCount: post.comments_count || 0,
                    likes: isLikedByMe ? [user.uid] : []
                };
            });

            if (isLoadMore) {
                setAllPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPosts = normalizedPosts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...newPosts];
                });
            } else {
                if (selectedCategory) {
                    setAllPosts(prev => {
                        const otherPosts = prev.filter(p => p.type !== selectedCategory.id);
                        return [...normalizedPosts, ...otherPosts];
                    });
                } else {
                    setAllPosts(normalizedPosts);
                }
                setNewPostsCount(0);

                if (mode === 'recent' && !selectedCategory) {
                    await setPostsCache(normalizedPosts);
                }
            }

        } catch (error) {
            console.error("Feed Error:", error);
            if (!isBackground) AlertService.error(t('community_error_title', language), t('community_load_posts_error', language));
        } finally {
            if (isLoadMore) {
                loadingMoreRef.current = false;
                setLoadingMore(false);
            } else {
                if (!isBackground) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        }
    };

    const handleSortChange = (newMode) => {
        if (newMode === sortBy) return;
        Haptics.selectionAsync();
        setSortBy(newMode);
        loadNewPosts(true, newMode);
    };

    // --- NAVIGATION (Native Back Handling) ---
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
        menuScrollY.setValue(0);
        feedScrollY.setValue(0);
    };

    const navigateToFeed = (cat) => {
        Haptics.selectionAsync();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedCategory(cat);
        setViewMode('feed');
        setHasMore(true);
        menuScrollY.setValue(0);
        feedScrollY.setValue(0);
    };

    const handleCategoryPress = (cat) => {
        if (cat.id === 'leaderboard' || cat.isAction) {
            setLeaderboardVisible(true);
            return;
        }
        navigateToFeed(cat);
    };

    // --- FILTERING ---
    const filteredPosts = useMemo(() => {
        let result = selectedCategory ? allPosts.filter(p => p.type === selectedCategory.id) : [];

        if (isBioFilterActive && userProfile?.settings) {
            result = result.filter(post => {
                const author = post.authorSettings || {};
                const me = userProfile.settings;
                return (author.skinType === me.skinType) || (author.scalpType === me.scalpType);
            });
        }

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

    // --- ACTIONS ---
    const handleCreateWrapper = async (payload) => {
        try {
            await createPost(
                payload,
                user.uid,
                userProfile?.settings?.name || t('community_default_user', language),
                userProfile?.settings || {}
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            loadNewPosts(true);
        } catch (e) { console.error(e); }
    };

    const handleInteract = useCallback(async (postId) => {
        const post = allPosts.find(p => p.id === postId);
        if (!post || !user) return;

        const isLiked = post.likes.includes(user.uid);

        setAllPosts(prev => prev.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    likes: isLiked ? [] : [user.uid],
                    likesCount: isLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1
                };
            }
            return p;
        }));

        await toggleLikePost(postId, user.uid, isLiked);
    }, [allPosts, user]);

    const handleDeleteWrapper = useCallback((postId) => {
        AlertService.delete(
            t('community_delete_post_title', language),
            t('community_delete_post_confirm', language),
            async () => {
                await deletePost(postId);
                setAllPosts(prev => prev.filter(p => p.id !== postId));
                AlertService.success(t('community_deleted_title', language), t('community_deleted_message', language));
            }
        );
    }, [language]);

    const handleSaveWrapper = async (product) => {
        const productExists = savedProducts.some(
            p => p.productName.toLowerCase().trim() === (product.name || product.productName).toLowerCase().trim()
        );

        if (productExists) {
            AlertService.show({ title: t('community_exists_title', language), message: t('community_exists_message', language), type: 'info' });
            setViewingProduct(null);
            return;
        }

        try {
            await saveProductToShelf(user.uid, product);
            setViewingProduct(null);
            AlertService.success(t('community_saved_title', language), t('community_saved_message', language));
        } catch (e) { console.error(e); }
    };

    const handleRefresh = async () => {
        if (sortBy === 'popular') {
            await loadNewPosts(false, 'popular');
            return;
        }
        await loadNewPosts(false, 'recent');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const getCategoryLabel = useCallback(() => {
        if (!selectedCategory) return '';
        if (selectedCategory.label) return selectedCategory.label;
        if (selectedCategory.labelKey) return t(selectedCategory.labelKey, language);
        return selectedCategory.id || '';
    }, [selectedCategory, language]);

    // 🌟 STABLE PERFORMANCE REFERENCES
    const currentUserObj = useMemo(() => (
        userProfile ? { ...userProfile, uid: user?.uid } : { uid: user?.uid }
    ), [userProfile, user?.uid]);

    const handleProfilePress = useCallback((userId, authorSettings) => {
        setViewingUserProfile({ id: userId, data: authorSettings });
    }, []);

    const renderContent = () => (
        <>
            {viewMode === 'menu' ? (
                <>
                    {/* 🌟 COLLAPSIBLE HEADER (MENU VIEW) */}
                    <AuthenticHeader
                        scrollY={menuScrollY}
                        activeTab="community"
                        title={t('community_title', language)}
                        subtitle={t('community_subtitle', language)}
                    />
                    <Animated.ScrollView 
                        contentContainerStyle={[
                            styles.menuContainer, 
                            { paddingTop: maxHeight + 16, paddingBottom: 100 }
                        ]}
                        showsVerticalScrollIndicator={false}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: menuScrollY } } }],
                            { useNativeDriver: false } // Avoids VirtualizedList driver mismatch
                        )}
                        scrollEventThrottle={16}
                    >
                        {CATEGORIES.map((item) => {
                            const catColor = COLORS[item.colorKey] || COLORS.primary;
                            return (
                                <TouchableOpacity 
                                    key={item.id} 
                                    style={styles.categoryCard} 
                                    onPress={() => handleCategoryPress(item)} 
                                    activeOpacity={0.9}
                                >
                                    <View style={[styles.catIconBox, { backgroundColor: catColor + '20' }]}>
                                        <FontAwesome5 name={item.icon} size={24} color={catColor} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.catTitle}>
                                            {t(item.labelKey, language)}
                                        </Text>
                                        <Text style={styles.catDesc}>
                                            {t(item.descKey, language)}
                                        </Text>
                                    </View>
                                    <FontAwesome5 name={rtl.isRTL ? "chevron-left" : "chevron-right"} size={16} color={COLORS.textDim} />
                                </TouchableOpacity>
                            );
                        })}
                    </Animated.ScrollView>
                </>
            ) : (
                <>
                    {/* 🌟 COLLAPSIBLE HEADER (FEED VIEW) */}
                    <AuthenticHeader
                        scrollY={feedScrollY}
                        activeTab="community"
                        title={getCategoryLabel()}
                        subtitle={t('community_latest_posts', language)}
                    />
                    
                    {/* 🌟 STICKY FILTER BAR */}
                    <Animated.View 
                        style={[
                            styles.filterWrapper, 
                            { 
                                top: maxHeight, 
                                transform: [{ translateY: filterTranslateY }] 
                            }
                        ]}
                    >
                        <SearchFilterBar
                            searchQuery={searchQuery}
                            onSearchChange={(text) => setSearchQuery(text)}
                            isBioFilterActive={isBioFilterActive}
                            onToggleBioFilter={() => { 
                                Haptics.selectionAsync(); 
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); 
                                setIsBioFilterActive(!isBioFilterActive); 
                            }}
                            userSkinType={userProfile?.settings?.skinType}
                        />
                        <SortTabs currentSort={sortBy} onSelect={handleSortChange} />
                    </Animated.View>

                    {loading && allPosts.length === 0 ? (
                        <ActivityIndicator size="large" color={COLORS.accentGreen} style={{ marginTop: maxHeight + FILTER_BAR_HEIGHT + 40 }} />
                    ) : (
                        <CommunityRefreshHandler
                            flatListRef={flatListRef}
                            data={filteredPosts}
                            onRefresh={handleRefresh}
                            loading={loading}
                            keyExtractor={(item, index) => item?.id ? String(item.id) : `post_${index}`}
                            contentContainerStyle={{ 
                                paddingBottom: 120, 
                                paddingTop: maxHeight + FILTER_BAR_HEIGHT + 24 
                            }}
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { y: feedScrollY } } }],
                                { useNativeDriver: false } // Resolves VirtualizedList invariant violation
                            )}
                            scrollEventThrottle={16}
                            initialNumToRender={5}
                            maxToRenderPerBatch={5}
                            windowSize={5}
                            removeClippedSubviews={false}
                            renderItem={({ item }) => (
                                <PostCard
                                    post={item}
                                    currentUser={currentUserObj}
                                    onInteract={handleInteract}
                                    onDelete={handleDeleteWrapper}
                                    onViewProduct={setViewingProduct}
                                    onOpenComments={setCommentingPost}
                                    onImagePress={setViewingImage}
                                    onProfilePress={handleProfilePress}
                                />
                            )}
                            onEndReached={() => {
                                loadNewPosts(false, null, false, true);
                            }}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={
                                loadingMore ? (
                                    <ActivityIndicator size="small" color={COLORS.accentGreen} style={{ marginVertical: 20 }} />
                                ) : null
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <MaterialCommunityIcons name="filter-remove-outline" size={60} color={COLORS.textDim} />
                                    <Text style={styles.emptyText}>{searchQuery || isBioFilterActive ? t('community_no_search_results', language) : t('community_empty_section', language)}</Text>
                                    {(!searchQuery && !isBioFilterActive && (selectedCategory?.id !== 'tips' || isAdmin)) && (
                                        <TouchableOpacity style={styles.emptyActionBtn} onPress={() => setCreateModalVisible(true)}>
                                            <Text style={styles.emptyActionText}>{t('community_be_first', language)}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            }
                        />
                    )}

                    <NewPostsToast visible={newPostsCount > 0} onPress={() => loadNewPosts(false)} COLORS={COLORS} styles={styles} />

                    {selectedCategory && (selectedCategory.id !== 'tips' || isAdmin) && (
                        <TouchableOpacity 
                            style={[
                                styles.fab, 
                                { 
                                    backgroundColor: COLORS[selectedCategory?.colorKey] || COLORS.accentGreen,
                                    left: rtl.isRTL ? 20 : undefined,
                                    right: !rtl.isRTL ? 20 : undefined,
                                }
                            ]} 
                            onPress={() => setCreateModalVisible(true)} 
                            activeOpacity={0.8}
                        >
                            <Feather name="plus" size={24} color={COLORS.textOnAccent} />
                        </TouchableOpacity>
                    )}

                    {selectedCategory && (selectedCategory.id !== 'tips' || isAdmin) && (
                        <CreatePostModal 
                            visible={isCreateModalVisible} 
                            onClose={() => setCreateModalVisible(false)} 
                            onSubmit={handleCreateWrapper} 
                            savedProducts={savedProducts} 
                            userRoutines={userProfile?.routines} 
                            defaultType={selectedCategory?.id}
                            isAdmin={isAdmin}
                        />
                    )}
                </>
            )}

            <ProductActionSheet product={viewingProduct} visible={!!viewingProduct} onClose={() => setViewingProduct(null)} onSave={handleSaveWrapper} />
            
            <CommentModal
                visible={!!commentingPost}
                onClose={() => {
                    setCommentingPost(null);
                    router.setParams({ openPostId: '' }); // 🌟 SAFE RESET (NO LOOPS)
                }}
                post={commentingPost}
                currentUser={currentUserObj}
                onProfilePress={(userId) => setViewingUserProfile({ id: userId })}
            />
            
            <FullImageViewer visible={!!viewingImage} imageUrl={viewingImage} onClose={() => setViewingImage(null)} />

            <UserProfileModal
                visible={!!viewingUserProfile}
                onClose={() => setViewingUserProfile(null)}
                targetUserId={viewingUserProfile?.id}
                initialData={viewingUserProfile?.data}
                currentUser={currentUserObj}
                onProductSelect={setViewingProduct}
            />

            <LeaderboardModal
                visible={isLeaderboardVisible}
                onClose={() => setLeaderboardVisible(false)}
                currentUser={currentUserObj}
                onUserPress={(userId, userData) => setViewingUserProfile({ id: userId, data: userData })}
                adminUid={appConfig?.adminUid || null}
            />

            <CommunityIntro visible={showIntro} onClose={() => setShowIntro(false)} />
        </>
    );

    if (isLightTheme) {
        return (
            <LinearGradient
                colors={[
                    COLORS.background,
                    COLORS.gradientStart || COLORS.background,
                    COLORS.gradientMid || COLORS.accentGreen + '15',
                    COLORS.gradientEnd || COLORS.accentGreen + '25',
                    'rgba(61, 146, 117, 0.30)'
                ]}
                locations={[0, 0.4, 0.65, 0.85, 1]}
                style={{ flex: 1 }}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            >
                <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
                {renderContent()}
            </LinearGradient>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: COLORS.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
            {renderContent()}
        </View>
    );
}

const createStyles = (COLORS, isLightTheme, rtl) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    
    // --- FILTER WRAPPER ---
    filterWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 9,
        backgroundColor: COLORS.background,
        paddingBottom: 6,
    },
    
    // --- MENU ---
    menuContainer: { paddingHorizontal: 20, gap: 15 },
    categoryCard: { 
        flexDirection: rtl.flexDirection, 
        alignItems: 'center', 
        height: 100, 
        borderRadius: 24, 
        padding: 20, 
        gap: 15, 
        borderWidth: 0.5, 
        borderColor: COLORS.border,
        backgroundColor: 'transparent',
    },
    catIconBox: { 
        width: 50, 
        height: 50, 
        borderRadius: 16, 
        alignItems: 'center', 
        justifyContent: 'center',
    },
    catTitle: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 18, 
        color: COLORS.textPrimary, 
        textAlign: rtl.textAlign, 
        marginBottom: 4 
    },
    catDesc: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 12, 
        color: COLORS.textSecondary, 
        textAlign: rtl.textAlign 
    },
    
    // --- EMPTY STATE ---
    emptyState: { alignItems: 'center', marginTop: 50, opacity: 0.5 },
    emptyText: { color: COLORS.textDim, fontFamily: 'Tajawal-Regular', marginTop: 10 },
    emptyActionBtn: { 
        marginTop: 15, 
        backgroundColor: COLORS.accentGreen, 
        paddingHorizontal: 20, 
        paddingVertical: 10, 
        borderRadius: 10 
    },
    emptyActionText: { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold' },
    
    // --- SOLID FAB ---
    fab: { 
        position: 'absolute', 
        bottom: 90, 
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    
    // --- TOAST ---
    toastContainer: { 
        position: 'absolute', 
        top: 60, 
        alignSelf: 'center', 
        zIndex: 1000, 
    },
    toastButton: { 
        flexDirection: rtl.flexDirection, 
        alignItems: 'center', 
        backgroundColor: COLORS.card, 
        paddingHorizontal: 20, 
        paddingVertical: 10, 
        borderRadius: 20, 
        borderWidth: 0.5, 
        borderColor: COLORS.accentGreen 
    },
    toastText: { 
        fontFamily: 'Tajawal-Bold', 
        color: COLORS.accentGreen, 
        fontSize: 14, 
        marginLeft: 8 
    },
});