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

const isOlderThan = (timestamp, days) => {
  if (!timestamp) return true;
  const now = new Date();
  const dateToCheck = timestamp.toDate(); // Convert Firestore Timestamp to JS Date
  const diffTime = Math.abs(now - dateToCheck);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays > days;
};

export const AppProvider = ({ children }) => {
  // --- User State ---
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [savedProducts, setSavedProducts] = useState([]);
  
  // --- Control Flags (Semaphores) ---
  // Locks the repair logic to prevent infinite write loops
  const isRepairing = useRef(false);
  // Ensures we only try to register tokens once per session
  const hasRegisteredNotifications = useRef(false); 

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

  // --- Loading States ---
  const [loading, setLoading] = useState(true);

  // ==================================================================
  // 2. HELPER: DATA INTEGRITY CHECK
  // ==================================================================
  // This is the source of truth for "Does this user exist properly?"
  const checkProfileHealth = (data) => {
    if (!data) return false;
    // Must have email (basic identity)
    if (!data.email) return false;
    // Must have settings object (skin type, name, etc)
    if (!data.settings) return false;
    // Must have onboarding flag (determines routing)
    if (data.onboardingComplete === undefined) return false;
    
    return true;
  };

  // ==================================================================
  // 3. NOTIFICATION REGISTRATION LOGIC
  // ==================================================================
  const registerForPushNotificationsAsync = async (uid, currentProfile) => {
    if (!Device.isDevice) return;

    try {
      // 1. Setup Channel (Android) - Fast, local only
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

      // 3. Handle Denial
      if (finalStatus !== 'granted') {
        // Only write to DB if the DB currently thinks it IS enabled
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
      // 🛑 SCALABILITY CHECK (The "Thundering Herd" Fix)
      // ============================================================
      
      // A. Check if token actually changed
      const tokenChanged = currentProfile?.expoPushToken !== expoPushToken;
      
      // B. Check if it's been > 30 days since last update (Heartbeat)
      const needsHeartbeat = isOlderThan(currentProfile?.lastTokenUpdate, 30);
      
      // C. Check if "Hadil Case" (Token was null, now we have one)
      const isHealing = currentProfile?.expoPushToken === null && expoPushToken !== null;

      // D. Check if we just enabled notifications
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
        // We don't save FCM separately usually unless you specifically use it manually, 
        // Expo token maps to it internally. Saving it is optional.
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
    // --- A. System Config Listener ---
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

    // --- B. Authentication Listener ---
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Reset semaphores when user changes
      hasRegisteredNotifications.current = false; 
      isRepairing.current = false; 
      
      if (currentUser) {
        console.log("🟢 User Authenticated:", currentUser.uid);

        // 1. Load Local Cache (Speed Optimization)
        try {
            const cachedProfile = await getSelfProfileCache();
            if (cachedProfile && checkProfileHealth(cachedProfile)) {
                setUserProfile(cachedProfile);
                setLoading(false); // Immediate UI access
            }
            const cachedProducts = await getSavedProductsCache();
            if (cachedProducts?.length) setSavedProducts(cachedProducts);
        } catch (e) { /* Ignore cache errors */ }
    
        const profileRef = doc(db, 'profiles', currentUser.uid);
        
        // 2. Profile Real-time Listener (The Brain)
        const unsubscribeProfile = onSnapshot(profileRef, async (docSnap) => {
          
          const exists = docSnap.exists();
          const data = exists ? docSnap.data() : null;
          const isHealthy = checkProfileHealth(data);

          // --- PATH 1: HEALTHY PROFILE (Normal Operation) ---
          if (isHealthy) {
              isRepairing.current = false; // Release lock
              setUserProfile(data);
              setSelfProfileCache(data); 
              setLoading(false); 

              if (data.onboardingComplete && !hasRegisteredNotifications.current) {
                hasRegisteredNotifications.current = true;
                // Pass 'data' so we can compare!
                registerForPushNotificationsAsync(currentUser.uid, data); 
            }
              return; 
          }

          // --- PATH 2: UNHEALTHY PROFILE (Fixing the Ghost Docs) ---
          
          // Safety Check: If we are already repairing, don't spam writes
          if (isRepairing.current) {
              console.log("🛠 Repair pending... waiting for DB update.");
              return;
          }

          console.log("🚨 Profile Unhealthy (Missing or Corrupt). Initiating Safe Repair...");
          isRepairing.current = true; // Lock

          // Construct Repair Data
          // We preserve existing data (like notificationsEnabled: false) if it exists.
          const repairData = {
             email: currentUser.email,
             createdAt: data?.createdAt || serverTimestamp(),
             // Default to FALSE forces user to go to Welcome screen to fix settings
             onboardingComplete: data?.onboardingComplete || false, 
             // Respect previous denial if it exists, otherwise default to false
             notificationsEnabled: data?.notificationsEnabled || false,
             // Ensure structure exists
             settings: data?.settings || { 
                 name: '', gender: '', skinType: '', scalpType: '',
                 goals: [], conditions: [], allergies: []
             },
             routines: data?.routines || { am: [], pm: [] }
          };

          try {
              // A. Optimistic Update (Unblock User Immediately)
              setUserProfile(repairData); 
              setLoading(false); 

              // B. Atomic Merge Write (The Fix)
              // merge: true ensures we don't overwrite partial data written by other logic
              await setDoc(profileRef, repairData, { merge: true });
              
              // Note: We do NOT unlock isRepairing here. 
              // We wait for onSnapshot to fire again with the corrected data.
          } catch (e) {
              console.error("Critical Repair Failed:", e);
              isRepairing.current = false; // Release lock on error to allow retry
          }
        }, (err) => {
            console.warn("Firestore Profile Listener Error:", err);
            setLoading(false);
        });
    
        // 3. Saved Products Listener
        const unsubscribeProducts = onSnapshot(query(collection(db, 'profiles', currentUser.uid, 'savedProducts'), orderBy('createdAt', 'desc')), 
          (snapshot) => {
            const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Only update state if data actually changed (Optimization)
            setSavedProducts(prev => {
                if (JSON.stringify(newProducts) !== JSON.stringify(prev)) {
                    setSavedProductsCache(newProducts);
                    return newProducts;
                }
                return prev;
            });
            setLoading(false);
          }
        );
    
        return () => { unsubscribeProfile(); unsubscribeProducts(); };

      } else {
        // Logged Out
        setUserProfile(null);
        setSavedProducts([]);
        setLoading(false);
      }
    });

    return () => { unsubscribeConfig(); unsubscribeAuth(); };
  }, []);

  const logout = async () => {
    try {
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