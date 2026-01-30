import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, setDoc, getDoc, updateDoc } from 'firebase/firestore';
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

export const AppProvider = ({ children }) => {
  // --- User State ---
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [savedProducts, setSavedProducts] = useState([]);
  
  // --- Refs & Control ---
  const isRepairing = useRef(false);
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

  // --- Loading & Error States ---
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [productsError, setProductsError] = useState(null);

  // ==================================================================
  // 2. HELPER: REGISTER FOR PUSH NOTIFICATIONS
  // ==================================================================
  const registerForPushNotificationsAsync = async (uid) => {
    console.log("🔔 [AppContext] Starting notification registration for user:", uid);
    
    if (!Device.isDevice) {
      console.log("⚠️ [AppContext] Must use physical device for Push Notifications");
      return;
    }

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        console.log("🔔 [AppContext] Android Notification Channel 'default' set.");
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        console.log("🔔 [AppContext] requesting permissions...");
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      console.log("🔔 [AppContext] Final Permission Status:", finalStatus);

      const userRef = doc(db, 'profiles', uid);

      if (finalStatus !== 'granted') {
        console.log("❌ [AppContext] Permission denied! Updating profile to disable notifications.");
        try {
          await updateDoc(userRef, { notificationsEnabled: false });
        } catch (error) {
            console.error("❌ [AppContext] Error updating denied status:", error);
        }
        return;
      }

      const projectId = 
        Constants?.expoConfig?.extra?.eas?.projectId ?? 
        Constants?.easConfig?.projectId ?? 
        "6ebdbfe1-08ea-4f21-9fa2-482f152a3266";

      let expoTokenString = null;
      try {
          const expoTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          expoTokenString = expoTokenData.data;
          console.log("✅ [AppContext] Expo Push Token:", expoTokenString);
      } catch (e) {
          console.error("❌ [AppContext] Failed to get Expo Token:", e);
      }

      let fcmTokenString = null;
      try {
          const deviceTokenData = await Notifications.getDevicePushTokenAsync();
          fcmTokenString = deviceTokenData.data;
          console.log("✅ [AppContext] FCM/Device Token:", fcmTokenString);
      } catch (e) {
          console.error("❌ [AppContext] Failed to get Device Token:", e);
      }

      try {
        await updateDoc(userRef, {
          expoPushToken: expoTokenString, 
          fcmToken: fcmTokenString,       
          notificationsEnabled: true,
          deviceType: Platform.OS,
          lastTokenUpdate: new Date()
        });
        console.log("✅ [AppContext] Tokens successfully saved to Firestore!");
      } catch (e) {
         console.error("❌ [AppContext] Error saving tokens to Firestore:", e);
      }

    } catch (error) {
      console.error("❌ [AppContext] Critical Error registering push tokens:", error);
    }
  };

  // ==================================================================
  // 3. MAIN EFFECT: INIT APP
  // ==================================================================
  useEffect(() => {
    // A. System Config Listener
    const configRef = doc(db, 'app_config', 'version_control'); 
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
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

    // B. Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      hasRegisteredNotifications.current = false; 
      
      if (currentUser) {
        console.log("🟢 User Detected:", currentUser.email);
        
        // Safety check for new vs returning users
        const isBrandNewAccount = currentUser.metadata.creationTime === currentUser.metadata.lastSignInTime;

        // 1. Load Cache
        const loadCache = async () => {
            try {
                const cachedProfile = await getSelfProfileCache();
                if (cachedProfile) setUserProfile(cachedProfile);
    
                const cachedProducts = await getSavedProductsCache();
                if (cachedProducts && cachedProducts.length > 0) setSavedProducts(cachedProducts);
    
                if (cachedProfile || (cachedProducts && cachedProducts.length > 0)) {
                    setLoading(false);
                }
            } catch (e) {
                console.error("Cache load error:", e);
            }
        };
        loadCache();
    
        // 2. Profile Real-time Listener
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const unsubscribeProfile = onSnapshot(profileRef, async (docSnap) => {
          
          if (isRepairing.current) return;

          if (docSnap.exists()) {
            const data = docSnap.data();
            const updatesToApply = {};
            let needsUpdate = false;

            // --- REPAIR FIELDS IF MISSING ---
            if (!data.email) {
                updatesToApply.email = currentUser.email;
                needsUpdate = true;
            }
            if (!data.settings) {
                updatesToApply.settings = { 
                    name: '', gender: '', skinType: '', scalpType: '',
                    goals: [], conditions: [], allergies: []
                };
                needsUpdate = true;
            }

            if (data.notificationsEnabled === undefined) {
                updatesToApply.notificationsEnabled = false;
                needsUpdate = true;
            }
            if (!data.createdAt) {
                updatesToApply.createdAt = new Date();
                needsUpdate = true;
            }

            // A. PATH 1: REPAIR NEEDED
            if (needsUpdate) {
               console.log("🛠 Patching missing fields in profile...");
               isRepairing.current = true; 
               try {
                   await updateDoc(profileRef, updatesToApply);
                   const fixedProfile = { ...data, ...updatesToApply };
                   setUserProfile(fixedProfile);
                   setSelfProfileCache(fixedProfile);

                   if (fixedProfile.onboardingComplete && !hasRegisteredNotifications.current) {
                        hasRegisteredNotifications.current = true;
                        registerForPushNotificationsAsync(currentUser.uid);
                   }

               } catch (e) {
                   console.error("Repair failed", e);
               } finally {
                   setTimeout(() => { isRepairing.current = false; }, 2000);
               }
               return; 
            }

            // B. PATH 2: NORMAL DATA
            setUserProfile(data);
            setSelfProfileCache(data); 
            setLoading(false); 

            if (data.onboardingComplete && !hasRegisteredNotifications.current) {
                console.log("🔔 [AppContext] Profile ready. Initiating token registration...");
                hasRegisteredNotifications.current = true;
                registerForPushNotificationsAsync(currentUser.uid);
            }

          } else {
            // DOCUMENT MISSING
            // Only create default if brand new. If returning, wait for sync.
            if (isBrandNewAccount && !docSnap.metadata.fromCache) {
                console.warn("🆕 Brand new user: Creating default profile...");
                isRepairing.current = true; 
                const defaultProfile = {
                    email: currentUser.email,
                    createdAt: new Date(),
                    onboardingComplete: false,
                    settings: { name: '', gender: '', skinType: '', scalpType: '', goals: [], conditions: [], allergies: [] }, 
                    routines: { am: [], pm: [] },
                    notificationsEnabled: false
                };
                try {
                  await setDoc(profileRef, defaultProfile);
                  setUserProfile(defaultProfile);
                } catch (err) {
                   console.error("Default profile creation failed", err);
                } finally {
                  setTimeout(() => { isRepairing.current = false; }, 2000);
                }
            } else {
                console.log("⏳ Profile not found yet (returning user). Waiting for Firestore sync...");
            }
          }
        }, (err) => {
            console.warn("⚠️ Firestore Listener Error:", err);
            setLoading(false);
        });
    
        // 3. Products Listener
        const productsRef = collection(db, 'profiles', currentUser.uid, 'savedProducts');
        const unsubscribeProducts = onSnapshot(query(productsRef, orderBy('createdAt', 'desc')), 
          (snapshot) => {
            const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSavedProducts(currentSavedProducts => {
                if (newProducts.length === 0 && snapshot.metadata.fromCache && currentSavedProducts.length > 0) {
                    return currentSavedProducts;
                }
                const isDifferent = JSON.stringify(newProducts) !== JSON.stringify(currentSavedProducts);
                if (isDifferent) {
                    setSavedProductsCache(newProducts);
                    return newProducts; 
                }
                return currentSavedProducts; 
            });
            setLoading(false);
          }, 
          (err) => { setLoading(false); }
        );
    
        return () => {
          unsubscribeProfile();
          unsubscribeProducts();
        };
      } else {
        setUserProfile(null);
        setSavedProducts([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeConfig();
      unsubscribeAuth();
    };
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
      loading, profileError, productsError, logout,
      appConfig, activeAnnouncement, dismissAnnouncement
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);