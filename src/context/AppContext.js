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
  const hasRegisteredNotifications = useRef(false); // Prevents re-registration loops

  // --- System State ---
  const [appConfig, setAppConfig] = useState({
    maintenanceMode: false,
    minSupportedVersion: '1.0.0', 
    latestVersion: '1.0.0',       
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
    if (!Device.isDevice) return;

    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      const userRef = doc(db, 'profiles', uid);

      if (finalStatus !== 'granted') {
        try {
          await updateDoc(userRef, { notificationsEnabled: false });
        } catch (error) {}
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
      } catch (e) {}

      let fcmTokenString = null;
      try {
          const deviceTokenData = await Notifications.getDevicePushTokenAsync();
          fcmTokenString = deviceTokenData.data;
      } catch (e) {}

      // ONLY updateDoc here to prevent "Ghost files"
      try {
        await updateDoc(userRef, {
          expoPushToken: expoTokenString, 
          fcmToken: fcmTokenString,       
          notificationsEnabled: true,
          deviceType: Platform.OS,
          lastTokenUpdate: new Date()
        });
      } catch (e) {
         // Fail silently if profile isn't ready
      }

    } catch (error) {
      console.error("❌ Error registering push tokens:", error);
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
          minSupportedVersion: data.android?.min_supported_version || '1.0.0',
          latestVersion: data.android?.latest_version || '1.0.0',
          latestVersionUrl: data.android?.store_url || '',
          maintenanceMessage: data.maintenance_message || 'الصيانة جارية',
          changelog: data.android?.changelog || [],
        });
      }
    });

    // B. Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      hasRegisteredNotifications.current = false; // Reset on auth change
      
      if (currentUser) {
        console.log("🟢 User Detected:", currentUser.email);
        
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
    
        // 2. Profile Real-time Listener & Repair
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const unsubscribeProfile = onSnapshot(profileRef, async (docSnap) => {
          
          if (isRepairing.current) return;

          if (docSnap.exists()) {
            const data = docSnap.data();
            const updatesToApply = {};
            let isCriticalRepair = false;

            // --- CRITICAL REPAIR ---
            if (!data.email) {
                updatesToApply.email = currentUser.email;
                isCriticalRepair = true;
            }
            if (!data.settings) {
                updatesToApply.settings = { 
                    name: '', gender: '', skinType: '', scalpType: '',
                    goals: [], conditions: [], allergies: []
                };
                updatesToApply.onboardingComplete = false; 
                isCriticalRepair = true;
            }

            // --- HOUSEKEEPING (Silent) ---
            if (data.notificationsEnabled === undefined) {
                updatesToApply.notificationsEnabled = false;
            }
            if (!data.createdAt) {
                updatesToApply.createdAt = new Date();
            }

            // Apply Patch
            if (Object.keys(updatesToApply).length > 0) {
               console.log("🛠 Applying Repair Patches:", updatesToApply);
               isRepairing.current = true; 
               try {
                   await setDoc(profileRef, updatesToApply, { merge: true });
                   if (isCriticalRepair) {
                       const fixedProfile = { ...data, ...updatesToApply };
                       setUserProfile(fixedProfile);
                       setSelfProfileCache(fixedProfile);
                   }
               } catch (e) {
                   console.error("Repair failed", e);
               } finally {
                   setTimeout(() => { isRepairing.current = false; }, 2000);
               }
               return; 
            }

            // Success Path
            setUserProfile(data);
            setSelfProfileCache(data); 
            setLoading(false); 

            // ➤ REGISTER TOKENS: Moved here but guarded to run only once
            if (data.onboardingComplete && !hasRegisteredNotifications.current) {
                hasRegisteredNotifications.current = true;
                registerForPushNotificationsAsync(currentUser.uid);
            }

          } else if (!docSnap.metadata.fromCache) {
            console.warn("⚠️ No profile found on server. Creating default...");
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
            } finally {
              setTimeout(() => { isRepairing.current = false; }, 2000);
            }
          }
        }, (err) => {
            console.warn("⚠️ Offline: Keeping cached profile");
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