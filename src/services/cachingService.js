import AsyncStorage from '@react-native-async-storage/async-storage';

const POSTS_CACHE_KEY = 'community_posts_cache_v1';

/**
 * Saves posts and timestamp to local storage.
 * JSON.stringify will automatically convert Firebase Timestamps to ISO Strings.
 */
export const setPostsCache = async (posts) => {
    try {
        const item = {
            posts,
            lastFetchTimestamp: new Date().toISOString(),
        };
        await AsyncStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(item));
    } catch (error) {
        console.error("Error setting posts cache:", error);
    }
};

/**
 * Retrieves cached posts.
 * Note: Dates will come back as Strings, not Timestamps.
 */
export const getPostsCache = async () => {
    try {
        const itemString = await AsyncStorage.getItem(POSTS_CACHE_KEY);
        if (!itemString) {
            return { posts: [], lastFetchTimestamp: null };
        }
        const item = JSON.parse(itemString);
        return {
            posts: item.posts || [],
            lastFetchTimestamp: item.lastFetchTimestamp || null,
        };
    } catch (error) {
        console.error("Error getting posts cache:", error);
        return { posts: [], lastFetchTimestamp: null };
    }
};