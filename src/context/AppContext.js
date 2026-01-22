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
// Describes how notifications behave when the app is in the FOREGROUND
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
  
  // =========================================================
  // ➤ CRITICAL: THIS REF PREVENTS THE INFINITE LOOPS
  // =========================================================
  const isRepairing = useRef(false);

  // --- System State (Controlled by Admin Panel) ---
  const [appConfig, setAppConfig] = useState({
    maintenanceMode: false,
    minSupportedVersion: '1.0.0', // For Force Update
    latestVersion: '1.0.0',       // For Optional Update
    latestVersionUrl: '',
    maintenanceMessage: '',
    changelog: [],                // The "What's New" list
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
    if (!Device.isDevice) {
      console.log('⚠️ Must use physical device for Push Notifications');
      return;
    }

    try {
      // A. Android Channel Setup
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // B. Permission Check
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      const userRef = doc(db, 'profiles', uid);

      if (finalStatus !== 'granted') {
        console.log('❌ User denied notification permissions');
        try {
          // Use updateDoc to prevent skeleton creation
          await updateDoc(userRef, { notificationsEnabled: false });
        } catch (error) {
          console.log("Skipping notification flag update: Profile does not exist yet.");
        }
        return;
      }

      // C. Get Project ID
      const projectId = 
        Constants?.expoConfig?.extra?.eas?.projectId ?? 
        Constants?.easConfig?.projectId ?? 
        "6ebdbfe1-08ea-4f21-9fa2-482f152a3266";

      if (!projectId) {
          console.error("❌ ERROR: Missing Project ID. Notifications will fail.");
          return; 
      }

      // D. Get EXPO Token
      let expoTokenString = null;
      try {
          const expoTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          expoTokenString = expoTokenData.data;
          console.log("✅ Expo Token:", expoTokenString);
      } catch (e) {
          console.warn("⚠️ Error getting Expo Token:", e);
      }

      // E. Get FCM Token
      let fcmTokenString = null;
      try {
          const deviceTokenData = await Notifications.getDevicePushTokenAsync();
          fcmTokenString = deviceTokenData.data;
      } catch (e) {
          console.warn("⚠️ Error getting Device Token:", e);
      }

      // F. Save to Firestore
      // CRITICAL: Only updateDoc. If it fails, the profile isn't ready.
      // This prevents "Ghost files" that cause the reset loop.
      try {
        await updateDoc(userRef, {
          expoPushToken: expoTokenString, 
          fcmToken: fcmTokenString,       
          notificationsEnabled: true,
          deviceType: Platform.OS,
          lastTokenUpdate: new Date()
        });
      } catch (e) {
         // Silently ignore: Profile isn't ready for tokens yet.
      }

    } catch (error) {
      console.error("❌ Error registering push tokens:", error);
    }
  };

  // ==================================================================
  // 3. MAIN EFFECT: INIT APP
  // ==================================================================
  useEffect(() => {
    // A. Listen to System Config
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
    }, (err) => {
      console.error("System config fetch error", err);
    });

    // B. Listen for Auth Changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setProfileError(null);
      setProductsError(null);
      
      if (currentUser) {
        console.log("🟢 User Detected:", currentUser.email);
        
        // 1. OFFLINE STRATEGY (Load Cache)
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
    
        // 2. NETWORK STRATEGY (Profile & Repair Logic)
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const unsubscribeProfile = onSnapshot(profileRef, async (docSnap) => {
          
          if (isRepairing.current) return;

          if (docSnap.exists()) {
            const data = docSnap.data();
            const updatesToApply = {};
            let isCriticalRepair = false;

            // --- CRITICAL FIELDS: Causes Redirect/Alert ---
            if (!data.email) {
                updatesToApply.email = currentUser.email;
                isCriticalRepair = true;
            }
            if (!data.settings) {
                console.warn("⚠️ Repairing Critical: Missing Settings");
                updatesToApply.settings = { 
                    name: '', gender: '', skinType: '', scalpType: '',
                    goals: [], conditions: [], allergies: []
                };
                updatesToApply.onboardingComplete = false; 
                isCriticalRepair = true;
            }

            // --- HOUSEKEEPING: Silent background fixes ---
            if (data.notificationsEnabled === undefined) {
                updatesToApply.notificationsEnabled = false;
            }
            if (!data.createdAt) {
                console.warn("⚠️ Repairing: Missing CreatedAt");
                updatesToApply.createdAt = new Date();
            }

            // APPLY REPAIR
            if (Object.keys(updatesToApply).length > 0) {
               console.log("🛠 Applying Repair Patches:", updatesToApply);
               isRepairing.current = true; 
               try {
                   await setDoc(profileRef, updatesToApply, { merge: true });

                   // Update local state ONLY if repair is critical
                   // This prevents alerts for missing tokens/timestamps
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

            // Valid Profile Path
            setUserProfile(data);
            setSelfProfileCache(data); 
            setLoading(false); 

            // Only register tokens AFTER profile is valid and onboarding is complete
            if (data.onboardingComplete) {
                registerForPushNotificationsAsync(currentUser.uid);
            }

          } else if (!docSnap.metadata.fromCache) {
            // Document missing on Server (True new user)
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
    
        // 3. PRODUCTS SYNC
        const productsRef = collection(db, 'profiles', currentUser.uid, 'savedProducts');
        const productsQuery = query(productsRef, orderBy('createdAt', 'desc'));
        const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
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
          (err) => {
            console.warn("⚠️ Offline: Keeping cached products");
            setLoading(false);
          }
        );
    
        return () => {
          unsubscribeProfile();
          unsubscribeProducts();
        };
      } else {
        // Logged out
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

  // ==================================================================
  // 4. HELPERS
  // ==================================================================
  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setSavedProducts([]);
    } catch (e) {
      console.error(e);
    }
  };

  const dismissAnnouncement = () => {
    setActiveAnnouncement(null);
  };

  return (
    <AppContext.Provider value={{ 
      user, 
      userProfile, 
      savedProducts, 
      setSavedProducts,
      loading,
      profileError,
      productsError,
      logout,
      appConfig,
      activeAnnouncement,
      dismissAnnouncement
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);