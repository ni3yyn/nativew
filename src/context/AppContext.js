import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase'; 
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { 
  setSavedProductsCache, 
  getSavedProductsCache,
  setSelfProfileCache,   
  getSelfProfileCache    
} from '../services/cachingService'; 

const AppContext = createContext();

// ==================================================================
// 1. NOTIFICATION HANDLER CONFIG
// ==================================================================
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// --- HELPER: Date Check for Heartbeat ---
// Returns true if the timestamp is older than X days or invalid
const isOlderThan = (timestamp, days) => {
    if (!timestamp || !timestamp.toDate) return true;
    try {
        const now = new Date();
        const dateToCheck = timestamp.toDate();
        const diffTime = Math.abs(now - dateToCheck);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays > days;
    } catch (e) { return true; }
};

export const AppProvider = ({ children }) => {
  // --- User State ---
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [savedProducts, setSavedProducts] = useState([]);
  
  // --- Control Flags & Cleanup Refs ---
  // Locks repair logic to prevent loops
  const isRepairing = useRef(false);
  // Prevents re-running token registration in the same session
  const hasRegisteredNotifications = useRef(false); 
  // Store unsubscribe functions so we can call them manually on logout
  const profileUnsubscribeRef = useRef(null);
  const productsUnsubscribeRef = useRef(null);

  // --- System State ---
  const [appConfig, setAppConfig] = useState({
    maintenanceMode: false,
    minSupportedVersion: '1.1.0', 
    latestVersion: '1.1.0',       
    latestVersionUrl: '',
    maintenanceMessage: '',
    changelog: [],                
  });
  const [activeAnnouncement, setActiveAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);

  // ==================================================================
  // 2. HELPER: DATA INTEGRITY CHECK
  // ==================================================================
  const checkProfileHealth = (data) => {
    if (!data) return false;
    // Must have email
    if (!data.email) return false;
    // Must have settings object
    if (!data.settings) return false;
    // Must have onboarding flag (can be true or false, but must exist)
    if (data.onboardingComplete === undefined) return false;
    
    return true;
  };

  // ==================================================================
  // 3. OPTIMIZED NOTIFICATION REGISTRATION
  // ==================================================================
  const registerForPushNotificationsAsync = async (uid, currentProfile) => {
    if (!Device.isDevice) return;

    try {
      // 1. Setup Channel (Android)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#5A9C84',
        });
      }

      // 2. Check Permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // 3. Handle Denial (Respect User Choice)
      if (finalStatus !== 'granted') {
        // Only write to DB if the DB currently thinks it IS enabled (save writes)
        if (currentProfile?.notificationsEnabled !== false) {
             await setDoc(doc(db, 'profiles', uid), { notificationsEnabled: false }, { merge: true });
        }
        return;
      }

      // 4. Get New Token
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? "6ebdbfe1-08ea-4f21-9fa2-482f152a3266";
      
      let expoPushToken = null;
      let fcmToken = null; // <--- NEW VARIABLE

      try {
          // A. Get Expo Token
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          expoPushToken = tokenData.data;

          // B. Get Device Token (FCM for Android / APNs for iOS) <--- NEW LOGIC
          if (Platform.OS === 'android') {
            const deviceTokenData = await Notifications.getDevicePushTokenAsync();
            fcmToken = deviceTokenData.data;
          }
      } catch (e) { console.log("Token Fetch Error", e); }

      // ============================================================
      // 🛑 OPTIMIZATION: THUNDERING HERD PROTECTION
      // ============================================================
      
      // A. Check if token actually changed
      const expoTokenChanged = currentProfile?.expoPushToken !== expoPushToken;
      const fcmTokenChanged = currentProfile?.fcmToken !== fcmToken; // <--- CHECK FCM CHANGE

      // B. Check if it's been > 30 days since last update (Heartbeat)
      const needsHeartbeat = isOlderThan(currentProfile?.lastTokenUpdate, 30);
      
      // C. Check if "Healing" (Token was null/failed previously, now we have one)
      const isHealing = currentProfile?.expoPushToken === null && expoPushToken !== null;

      // D. Check if we just enabled notifications (previously false)
      const statusChanged = currentProfile?.notificationsEnabled === false;

      // ⚡️ SKIP WRITE if everything is same and fresh
      if (!expoTokenChanged && !fcmTokenChanged && !needsHeartbeat && !isHealing && !statusChanged) {
        console.log("💤 Token clean & fresh. No DB write needed.");
        return; 
    }

    console.log("💾 Updating Token in DB");

    // 5. Save
    await setDoc(doc(db, 'profiles', uid), {
      expoPushToken: expoPushToken || null,
      fcmToken: fcmToken || null, // <--- SAVE TO DB
      notificationsEnabled: true,
      deviceType: Platform.OS,
      lastTokenUpdate: serverTimestamp() 
    }, { merge: true });

    } catch (error) {
      console.error("Token Register Error:", error);
    }
  };

  // ==================================================================
  // 4. MAIN INITIALIZATION EFFECT
  // ==================================================================
  useEffect(() => {
    // --- Config Listener ---
    const unsubscribeConfig = onSnapshot(doc(db, 'app_config', 'version_control'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppConfig({
          maintenanceMode: data.maintenance_mode || false,
          minSupportedVersion: data.android?.min_supported_version || '1.1.0',
          latestVersion: data.android?.latest_version || '1.1.0',
          latestVersionUrl: data.android?.store_url || '',
          maintenanceMessage: data.maintenance_message || 'الصيانة جارية',
          changelog: data.android?.changelog || [],
        });
      }
    });

    // --- Auth Listener ---
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Reset semaphores when user changes
      hasRegisteredNotifications.current = false; 
      isRepairing.current = false; 
      
      if (currentUser) {
        console.log("🟢 User Authenticated:", currentUser.uid);

        // -----------------------------------------------------------
        // 🚀 CACHE-FIRST LOAD (OFFLINE SUPPORT)
        // -----------------------------------------------------------
        try {
            // 1. Load Profile
            const cachedProfile = await getSelfProfileCache();
            if (cachedProfile && checkProfileHealth(cachedProfile)) {
                console.log("📱 Loaded Profile from Cache (Offline First)");
                setUserProfile(cachedProfile);
                setLoading(false); // Immediate UI render
            }
            
            // 2. Load Products
            const cachedProducts = await getSavedProductsCache();
            if (cachedProducts && cachedProducts.length > 0) {
                console.log("📱 Loaded Products from Cache (Offline First)");
                setSavedProducts(cachedProducts);
            }
        } catch (e) {
            console.warn("Error loading offline cache:", e);
        }
    
        const profileRef = doc(db, 'profiles', currentUser.uid);
        
        // ⭐️ CLEANUP OLD LISTENERS IF ANY (Safety check)
        if (profileUnsubscribeRef.current) profileUnsubscribeRef.current();
        if (productsUnsubscribeRef.current) productsUnsubscribeRef.current();

        // 2. Start Profile Listener
        profileUnsubscribeRef.current = onSnapshot(profileRef, async (docSnap) => {
          
          const exists = docSnap.exists();
          const data = exists ? docSnap.data() : null;
          const isHealthy = checkProfileHealth(data);
          const fromCache = docSnap.metadata.fromCache; 

          // --- PATH 1: HEALTHY PROFILE ---
          if (isHealthy) {
              isRepairing.current = false;
              
              // ... existing healthy logic (setUserProfile, caching, notifications) ...
              setUserProfile(prev => {
                  if (JSON.stringify(prev) !== JSON.stringify(data)) {
                      console.log(`♻️ Profile Updated (${fromCache ? 'Local' : 'Server'})`);
                      setSelfProfileCache(data); 
                      return data;
                  }
                  return prev;
              });
              setLoading(false); 

              if (data.onboardingComplete && !hasRegisteredNotifications.current) {
                  hasRegisteredNotifications.current = true;
                  registerForPushNotificationsAsync(currentUser.uid, data); 
              }
              return; 
          }

          // --- 🛑 OFFLINE GUARD ---
          if (fromCache && !exists) {
              console.log("📡 Offline & Doc missing. Waiting...");
              return; 
          }

          // ============================================================
          // 👶 NEW: FRESH SIGNUP GUARD (The Fix)
          // ============================================================
          // If the user account is less than 15 seconds old, the profile 
          // is likely still being created by login.js. Do NOT repair yet.
          const creationTime = new Date(currentUser.metadata.creationTime).getTime();
          const now = new Date().getTime();
          const isBrandNewUser = (now - creationTime) < 15000; // 15 seconds buffer

          if (isBrandNewUser) {
            console.log("👶 New User Detected - Waiting for Profile Creation...");
            return; // Exit and let login.js finish its job
          }
          // ============================================================

          // --- PATH 2: REPAIR ---
          if (isRepairing.current) return; 

          console.log("🚨 Profile Unhealthy. Initiating Safe Repair...");
          isRepairing.current = true;

          // repair logic 
          const repairData = {
             email: currentUser.email,
             createdAt: data?.createdAt || serverTimestamp(),
             onboardingComplete: data?.onboardingComplete || false, 
             notificationsEnabled: data?.notificationsEnabled || false,
             settings: data?.settings || { 
                 name: '', gender: '', skinType: '', scalpType: '',
                 goals: [], conditions: [], allergies: []
             },
             routines: data?.routines || { am: [], pm: [] }
          };

          try {
              // Optimistic Update
              setUserProfile(repairData); 
              setLoading(false); 
              
              // Atomic Write
              await setDoc(profileRef, repairData, { merge: true });
          } catch (e) {
              console.error("Repair Failed:", e);
              isRepairing.current = false;
          }
        }, (err) => {
             // Silence permission error on logout
             if (err.code !== 'permission-denied') console.warn("Firestore Profile Error:", err);
             setLoading(false);
        });
    
        // 3. Start Products Listener
        productsUnsubscribeRef.current = onSnapshot(
            query(collection(db, 'profiles', currentUser.uid, 'savedProducts'), orderBy('createdAt', 'desc')), 
          (snapshot) => {
            const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Only update if changed
            setSavedProducts(prev => {
                if (JSON.stringify(newProducts) !== JSON.stringify(prev)) {
                    setSavedProductsCache(newProducts); // Update Cache
                    return newProducts;
                }
                return prev;
            });
            
            // Ensure loading is disabled if we didn't have cache before
            setLoading(false);
          }, 
          (err) => {
             if (err.code !== 'permission-denied') console.warn("Products listener error", err);
          }
        );
      
      } else {
        // --- 🔴 LOGGED OUT CLEANUP ---
        
        // 1. Immediately kill Listeners
        if (profileUnsubscribeRef.current) {
            profileUnsubscribeRef.current();
            profileUnsubscribeRef.current = null;
        }
        if (productsUnsubscribeRef.current) {
            productsUnsubscribeRef.current();
            productsUnsubscribeRef.current = null;
        }

        // 2. Clear State
        setUserProfile(null);
        setSavedProducts([]);
        setLoading(false);

        // 3. Optional: Clear local user cache on logout for security
        setSelfProfileCache(null);
        setSavedProductsCache([]);
      }
    });

    return () => { 
        unsubscribeConfig(); 
        unsubscribeAuth();
        // Final Cleanup on Unmount
        if (profileUnsubscribeRef.current) profileUnsubscribeRef.current();
        if (productsUnsubscribeRef.current) productsUnsubscribeRef.current();
    };
  }, []);

  const logout = async () => {
    try {
      // Pre-emptive cleanup before SignOut prevents "Permission Denied" errors
      if (profileUnsubscribeRef.current) profileUnsubscribeRef.current();
      if (productsUnsubscribeRef.current) productsUnsubscribeRef.current();
      
      await signOut(auth);
      
      setUserProfile(null);
      setSavedProducts([]);
      
      // Clear cache references
      setSelfProfileCache(null);
      setSavedProductsCache([]);
    } catch (e) { console.error(e); }
  };

  const dismissAnnouncement = () => setActiveAnnouncement(null);

  return (
    <AppContext.Provider value={{ 
      user, userProfile, savedProducts, setSavedProducts,
      loading, logout, appConfig, activeAnnouncement, dismissAnnouncement
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);