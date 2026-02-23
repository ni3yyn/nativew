import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';


const POSTS_CACHE_KEY = 'community_posts_cache_v1';
const PROFILES_CACHE_KEY = 'user_profiles_cache_v1';
const SAVED_PRODUCTS_CACHE_KEY = 'saved_products_cache_v1';
const SELF_PROFILE_CACHE_KEY = 'self_profile_cache_v1';

const PROFILE_TTL = 24 * 60 * 60 * 1000; // 24 Hours
const AUDIO_CACHE_DIR = `${FileSystem.documentDirectory}tips_audio/`;


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
            timestamp: userData.timestamp
        };
    } catch (error) {
        console.error("Error getting cached profile:", error);
        return null;
    }
};

// ==========================================
// NEW: OFFLINE-FIRST SELF CACHING LOGIC
// ==========================================

export const setSavedProductsCache = async (products) => {
    try {
        // We stringify the array. Note: Firestore Timestamps will become ISO strings.
        await AsyncStorage.setItem(SAVED_PRODUCTS_CACHE_KEY, JSON.stringify(products));
    } catch (error) {
        console.error("Error setting saved products cache:", error);
    }
};

export const getSavedProductsCache = async () => {
    try {
        const itemString = await AsyncStorage.getItem(SAVED_PRODUCTS_CACHE_KEY);
        if (!itemString) return [];
        return JSON.parse(itemString);
    } catch (error) {
        console.error("Error getting saved products cache:", error);
        return [];
    }
};

export const setSelfProfileCache = async (profileData) => {
    try {
        if (!profileData) return;
        await AsyncStorage.setItem(SELF_PROFILE_CACHE_KEY, JSON.stringify(profileData));
    } catch (error) {
        console.error("Error setting self profile cache:", error);
    }
};

export const getSelfProfileCache = async () => {
    try {
        const itemString = await AsyncStorage.getItem(SELF_PROFILE_CACHE_KEY);
        if (!itemString) return null;
        return JSON.parse(itemString);
    } catch (error) {
        console.error("Error getting self profile cache:", error);
        return null;
    }
};

async function ensureAudioDir() {
    try {
        const dirInfo = await FileSystem.getInfoAsync(AUDIO_CACHE_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(AUDIO_CACHE_DIR, { intermediates: true });
        }
    } catch (error) {
        console.error("Error creating audio directory:", error);
    }
}

// ==========================================
// AUDIO CACHING LOGIC
// ==========================================

/**
 * Checks if a specific post's audio is already downloaded.
 */
export const getCachedAudioUri = async (postId) => {
    try {
        const fileUri = `${AUDIO_CACHE_DIR}${postId}.mp3`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        return fileInfo.exists ? fileUri : null;
    } catch (e) {
        return null;
    }
};

/**
 * Saves base64 audio data to a local file.
 */
export const saveAudioCache = async (postId, base64Data) => {
    try {
        await ensureAudioDir();
        const fileUri = `${AUDIO_CACHE_DIR}${postId}.mp3`;
        
        // Remove data URI prefix if present
        const base64Content = base64Data.includes('base64,') 
            ? base64Data.split('base64,')[1] 
            : base64Data;
            
        // ✅ Fix: Use the string 'base64' directly to avoid EncodingType undefined issues
        await FileSystem.writeAsStringAsync(fileUri, base64Content, {
            encoding: 'base64', 
        });
        
        return fileUri;
    } catch (error) {
        console.error("Error saving audio cache:", error);
        return null;
    }
};