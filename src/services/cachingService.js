import AsyncStorage from '@react-native-async-storage/async-storage';

const POSTS_CACHE_KEY = 'community_posts_cache_v1';
const PROFILES_CACHE_KEY = 'user_profiles_cache_v1';
const PROFILE_TTL = 24 * 60 * 60 * 1000; 


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


export const cacheUserProfile = async (userId, profileData, publicShelf) => {
    try {
        // 1. Get existing cache
        const rawStore = await AsyncStorage.getItem(PROFILES_CACHE_KEY);
        let cacheMap = rawStore ? JSON.parse(rawStore) : {};

        // 2. Add/Update specific user
        cacheMap[userId] = {
            profile: profileData,
            shelf: publicShelf,
            timestamp: Date.now()
        };

        // 3. Optimization: Prevent cache from growing indefinitely (Limit to 20 profiles)
        const keys = Object.keys(cacheMap);
        if (keys.length > 20) {
            // Remove the oldest entry
            const oldestKey = keys.reduce((a, b) => cacheMap[a].timestamp < cacheMap[b].timestamp ? a : b);
            delete cacheMap[oldestKey];
        }

        // 4. Save
        await AsyncStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(cacheMap));
    } catch (error) {
        console.error("Error caching user profile:", error);
    }
};

/**
 * Retrieves a profile if it exists and is not expired.
 */
export const getCachedUserProfile = async (userId) => {
    try {
        const rawStore = await AsyncStorage.getItem(PROFILES_CACHE_KEY);
        if (!rawStore) return null;

        const cacheMap = JSON.parse(rawStore);
        const userData = cacheMap[userId];

        if (!userData) return null;

        // Check Expiry (TTL)
        const now = Date.now();
        if (now - userData.timestamp > PROFILE_TTL) {
            return null; // Expired
        }

        return {
            profile: userData.profile,
            shelf: userData.shelf || [],
            timestamp: userData.timestamp // 🟢 FIX 2: THIS WAS MISSING
        };
    } catch (error) {
        console.error("Error getting cached profile:", error);
        return null;
    }
};