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
      try {
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          expoPushToken = tokenData.data;
      } catch (e) { console.log("Token Fetch Error", e); }

      // ============================================================
      // 🛑 OPTIMIZATION: THUNDERING HERD PROTECTION
      // ============================================================
      
      // A. Check if token actually changed
      const tokenChanged = currentProfile?.expoPushToken !== expoPushToken;
      
      // B. Check if it's been > 30 days since last update (Heartbeat)
      const needsHeartbeat = isOlderThan(currentProfile?.lastTokenUpdate, 30);
      
      // C. Check if "Healing" (Token was null/failed previously, now we have one)
      const isHealing = currentProfile?.expoPushToken === null && expoPushToken !== null;

      // D. Check if we just enabled notifications (previously false)
      const statusChanged = currentProfile?.notificationsEnabled === false;

      // ⚡️ SKIP WRITE if everything is same and fresh
      if (!tokenChanged && !needsHeartbeat && !isHealing && !statusChanged) {
          console.log("💤 Token clean & fresh. No DB write needed.");
          return; 
      }
      
      console.log("💾 Updating Token in DB (Change detected or Heartbeat needed)");

      // 5. Save (Only runs if needed)
      await setDoc(doc(db, 'profiles', uid), {
        expoPushToken: expoPushToken || null, 
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

        // 1. Load Local Cache Immediately (Speed)
        try {
            const cachedProfile = await getSelfProfileCache();
            if (cachedProfile && checkProfileHealth(cachedProfile)) {
                setUserProfile(cachedProfile);
                setLoading(false);
            }
            const cachedProducts = await getSavedProductsCache();
            if (cachedProducts?.length) setSavedProducts(cachedProducts);
        } catch (e) {}
    
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
              setUserProfile(data);
              setSelfProfileCache(data); 
              setLoading(false); 

              // Trigger Notification Check (optimized internally)
              if (data.onboardingComplete && !hasRegisteredNotifications.current) {
                  hasRegisteredNotifications.current = true;
                  registerForPushNotificationsAsync(currentUser.uid, data); 
              }
              return; 
          }

          // --- 🛑 OFFLINE GUARD (Fixes Offline Overwrite) ---
          // If we are offline (fromCache) and the doc is missing (!exists),
          // it likely just means we haven't synced with the server yet.
          // Do NOT start repair/defaults, just wait.
          if (fromCache && !exists) {
              console.log("📡 Offline & Doc missing in cache. Waiting for connection...");
              // We intentionally do nothing here to preserve state until online
              return; 
          }

          // --- PATH 2: REPAIR (Confirmed Missing/Corrupt on Server) ---
          if (isRepairing.current) return; // Prevent loops

          console.log("🚨 Profile Unhealthy (Server Confirmed). Initiating Safe Repair...");
          isRepairing.current = true;

          // Define Safe Defaults
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
                    setSavedProductsCache(newProducts);
                    return newProducts;
                }
                return prev;
            });
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