import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, updateDoc, where, limit } from 'firebase/firestore';
import { auth, db } from '../config/firebase'; 
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const AppContext = createContext();

// Configure how notifications appear when the app is in the foreground
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

  // --- HELPER: Register for Push Notifications ---
  const registerForPushNotificationsAsync = async (uid) => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    // Android specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Permission Check
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      // Get the Token (FCM for Android)
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const token = tokenData.data;
      
      console.log("🔥 Device Token Generated:", token);

      // Save Token to Firebase Profile so Admin Panel can see it
      const userRef = doc(db, 'profiles', uid);
      await updateDoc(userRef, {
        fcmToken: token,
        deviceType: Platform.OS,
        lastTokenUpdate: new Date()
      });
    } catch (error) {
      console.error("Error getting push token:", error);
    }
  };

  useEffect(() => {
    // 1. Listen to System Config (Maintenance Mode & Version) from Admin Panel
    // Note: Admin Panel writes to 'app_config/version_control'
    const configRef = doc(db, 'app_config', 'version_control'); 
    
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Map Admin Panel fields (snake_case) to App State (camelCase)
        setAppConfig({
          maintenanceMode: data.maintenance_mode || false,
          minSupportedVersion: data.android?.min_supported_version || '1.0.0',
          latestVersion: data.android?.latest_version || '1.0.0', // NEW
          latestVersionUrl: data.android?.store_url || '',
          maintenanceMessage: data.maintenance_message || 'الصيانة جارية',
          changelog: data.android?.changelog || [], // NEW
        });
      }
    }, (err) => {
      console.error("System config fetch error", err);
    });

    // 2. Listen for Auth Changes
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setProfileError(null);
      setProductsError(null);
      
      if (currentUser) {
        setLoading(true);
        
        // ➤ REGISTER TOKEN ON LOGIN
        registerForPushNotificationsAsync(currentUser.uid);

        // Listen to user profile
        const profileRef = doc(db, 'profiles', currentUser.uid);
        const unsubscribeProfile = onSnapshot(profileRef, 
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data());
              setProfileError(null);
            } else {
              setUserProfile(null);
            }
          }, 
          (err) => {
            console.error("Profile fetch error", err);
            setProfileError(err.message);
            setUserProfile(null);
          }
        );

        // Listen to savedProducts subcollection
        const productsRef = collection(db, 'profiles', currentUser.uid, 'savedProducts');
        const productsQuery = query(productsRef, orderBy('createdAt', 'desc'));
        
        const unsubscribeProducts = onSnapshot(productsQuery, 
          (snapshot) => {
            const products = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setSavedProducts(products);
            setProductsError(null);
            setLoading(false);
          }, 
          (err) => {
            console.error("Products fetch error", err);
            setProductsError(err.message);
            setSavedProducts([]);
            setLoading(false);
          }
        );

        return () => {
          unsubscribeProfile();
          unsubscribeProducts();
        };
      } else {
        // No user logged in
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