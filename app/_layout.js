import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, NativeModules, Pressable, Linking, ScrollView, Animated, AppState, Platform } from 'react-native';
import { Stack, useRouter } from "expo-router";
import { AppProvider, useAppContext } from "../src/context/AppContext";
import { ThemeProvider } from "../src/context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Updates from 'expo-updates';
import { FontAwesome5, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlobalAlertModal from '../src/components/common/GlobalAlertModal';
import AppIntro from '../src/components/common/AppIntro';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
// ADJUST THIS PATH to match where your 'db' variable is exported in your app
import { db } from '../src/config/firebase';

// Import Notification Helper
import { scheduleAuthenticNotifications } from '../src/utils/notificationHelper';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

SplashScreen.preventAutoHideAsync();


const useDailyPresence = (user) => {
  useEffect(() => {
    if (!user) return;

    const checkDailyPresence = async () => {
      try {
        // 1. Get today's date as a string (e.g., "2023-10-25")
        const todayStr = new Date().toISOString().split('T')[0];

        // 2. Check what we stored last time
        const lastRecordedDate = await AsyncStorage.getItem('last_presence_date');

        // 3. If dates are different, it's a new day -> Update Firestore
        if (lastRecordedDate !== todayStr) {

          const userRef = doc(db, "profiles", user.uid);

          await updateDoc(userRef, {
            lastSeen: serverTimestamp(),
            // Optional: You can add 'appVersion' here too so you know which version they use
            // appVersion: '1.0.0' 
          });

          // 4. Save today's date locally so we don't update again until tomorrow
          await AsyncStorage.setItem('last_presence_date', todayStr);
          console.log("📅 Daily presence logged for:", todayStr);
        }
      } catch (e) {
        // Fail silently so we don't annoy the user
        console.log("Presence Error:", e);
      }
    };

    // Run on mount
    checkDailyPresence();

    // Run when app comes from background to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkDailyPresence();
      }
    });

    return () => subscription.remove();
  }, [user]);
};

// ============================================================================
// 1. HELPER: SILENT UPDATE HOOK (For JS/Design/Ad changes)
// ============================================================================
const useSilentUpdates = () => {
  useEffect(() => {
    let isUpdatePending = false; // متغير لتتبع ما إذا كان هناك تحديث جاهز

    const checkAndDownload = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          isUpdatePending = true; // التحديث نزل وصار جاهزاً
          console.log("✅ تم تحميل التحديث الصامت بنجاح. ينتظر إعادة التشغيل.");
        }
      } catch (e) {
        console.log("⚠️ فشل التحقق من التحديثات (قد يكون لا يوجد اتصال):", e);
      }
    };

    checkAndDownload();

    // نراقب حالة التطبيق: إذا قام المستخدم بتصغير التطبيق (أرسله للخلفية) وهناك تحديث جاهز، نعيد التشغيل
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && isUpdatePending) {
        Updates.reloadAsync();
      }
    });

    return () => subscription.remove();
  }, []); 
};

// ============================================================================
// 2. HELPER: APP OPEN AD HOOK
// ============================================================================

const useAppOpenAd = () => {
  useEffect(() => {
    const isAdMobLinked = !!NativeModules.RNGoogleMobileAdsModule;
    if (!isAdMobLinked) return;

    try {
      const { AppOpenAd, AdEventType } = require('react-native-google-mobile-ads');
      const adUnitId = 'ca-app-pub-6010052879824695/8213348420';
      
      const appOpenAd = AppOpenAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      let isFirstLaunch = true; // Track if it's the first time opening the app

      // 1. When loaded, ONLY show if it's the very first app launch
      const unsubscribeLoaded = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('App Open Ad Loaded');
        if (isFirstLaunch) {
          appOpenAd.show();
          isFirstLaunch = false;
        }
      });

      // 2. When closed, SILENTLY load the next ad so it's ready for later
      const unsubscribeClosed = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('App Open Ad Closed - Preloading next');
        appOpenAd.load(); 
        // Notice we do NOT show it here.
      });

      const unsubscribeError = appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('App Open Ad Error:', error);
      });

      // 3. Initial Load
      appOpenAd.load();

      // 4. Show the preloaded ad ONLY when the app comes back from the background
      const appStateSub = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          try {
            if (appOpenAd.loaded) {
              appOpenAd.show();
            } else {
              appOpenAd.load();
            }
          } catch (error) {
            console.log("Error showing App Open Ad on resume", error);
          }
        }
      });

      return () => {
        unsubscribeLoaded();
        unsubscribeClosed();
        unsubscribeError();
        appStateSub.remove();
      };

    } catch (e) {
      console.log("AdMob Init Error:", e);
    }
  }, []);
};

// ============================================================================
// 3. UI HELPER: FORCE UPDATE SCREEN (BLOCKING)
// ============================================================================
const ForceUpdateScreen = ({ url, message }) => (
  <View style={styles.systemScreen}>
    <StatusBar style="light" />
    <LinearGradient colors={['#1A2D27', '#0F1C18']} style={StyleSheet.absoluteFill} />
    <View style={styles.systemContent}>
      <MaterialIcons name="system-update" size={70} color="#fbbf24" style={{ marginBottom: 20 }} />
      <Text style={styles.systemTitle}>تحديث إجباري مطلوب</Text>
      <Text style={styles.systemMessage}>
        {/* نستخدم الرسالة القادمة من الفايربيس (android.critical_message) */}
        {message || "هذه النسخة تحتوي على مشاكل تم حلها في الإصدار الجديد مع ميزات جديدة."}
      </Text>
      {url ? (
        <Pressable style={styles.updateButton} onPress={() => Linking.openURL(url)}>
          <Text style={styles.updateButtonText}>تحديث الآن</Text>
        </Pressable>
      ) : null}
    </View>
  </View>
);

// ============================================================================
// 4. UI HELPER: OPTIONAL UPDATE MODAL
// ============================================================================
const OptionalUpdateModal = ({ visible, changelog, onUpdate, onSkip }) => {
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.optionalCard}>
          <View style={styles.iconGlowContainer}>
            <View style={styles.optionalIconBox}>
              <Feather name="gift" size={32} color="#5A9C84" />
            </View>
          </View>
          <Text style={styles.optionalTitle}>تحديث جديد متوفر</Text>
          <Text style={styles.optionalSub}>إصدار جديد جاهز للتحميل. استمتعوا بأحدث الميزات!</Text>

          <View style={styles.changelogContainer}>
            <Text style={styles.whatsNewHeader}>ما الجديد؟</Text>
            <ScrollView style={styles.changelogList} contentContainerStyle={{ gap: 8 }}>
              {changelog && changelog.length > 0 ? (
                changelog.map((item, index) => (
                  <View key={index} style={styles.changelogItem}>
                    <FontAwesome5 name="check" size={12} color="#5A9C84" />
                    <Text style={styles.changelogText}>{item}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.changelogItem}>
                  <FontAwesome5 name="check" size={12} color="#5A9C84" />
                  <Text style={styles.changelogText}>تحسينات عامة على الأداء.</Text>
                </View>
              )}
            </ScrollView>
          </View>

          <View style={styles.optionalActions}>
            <Pressable style={({ pressed }) => [styles.updateButtonSmall, { opacity: pressed ? 0.9 : 1 }]} onPress={onUpdate}>
              <Text style={styles.updateButtonTextSmall}>تحديث من المتجر</Text>
              <Feather name="download-cloud" size={18} color="#1A2D27" />
            </Pressable>
            <Pressable style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipText}>ليس الآن</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// 5. UI HELPER: NOTIFICATION PERMISSION MODAL
// ============================================================================
const NotificationRequestModal = ({ visible, onEnable, onDismiss }) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          Animated.delay(1500)
        ])
      ).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.optionalCard}>
          <View style={styles.iconGlowContainer}>
            <View style={[styles.optionalIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
              <Animated.View style={{ transform: [{ rotate: shakeAnim.interpolate({ inputRange: [-10, 10], outputRange: ['-15deg', '15deg'] }) }] }}>
                <Feather name="bell-off" size={32} color="#ef4444" />
              </Animated.View>
            </View>
          </View>
          <Text style={styles.optionalTitle}>التنبيهات معطلة</Text>
          <Text style={styles.optionalSub}>
            بدون التنبيهات، لن يتمكن "وثيق" من تذكيرك بمواعيد الروتين أو التحسينات الجديدة.
            و لن يتمكن من إرسال نصائح يومية لبشرتك.
          </Text>
          <View style={styles.optionalActions}>
            <Pressable style={({ pressed }) => [styles.updateButtonSmall, { opacity: pressed ? 0.9 : 1 }]} onPress={onEnable}>
              <Text style={styles.updateButtonTextSmall}>تفعيل من الإعدادات</Text>
              <Feather name="settings" size={18} color="#1A2D27" />
            </Pressable>
            <Pressable style={styles.skipButton} onPress={onDismiss}>
              <Text style={styles.skipText}>سأفعلها لاحقا</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// 6. UI HELPER: MAINTENANCE SCREEN
// ============================================================================
const MaintenanceScreen = ({ message }) => (
  <View style={styles.systemScreen}>
    <StatusBar style="light" />
    <LinearGradient colors={['#1A2D27', '#111']} style={StyleSheet.absoluteFill} />
    <View style={styles.systemContent}>
      <FontAwesome5 name="tools" size={60} color="#5A9C84" style={{ marginBottom: 20 }} />
      <Text style={styles.systemTitle}>وضع الصيانة</Text>
      <Text style={styles.systemMessage}>{message}</Text>
    </View>
  </View>
);

// ============================================================================
// 7. UI HELPER: ANNOUNCEMENT MODAL
// ============================================================================
const AnnouncementModal = ({ data, onDismiss }) => {
  if (!data) return null;
  return (
    <Modal transparent visible={!!data} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.announcementCard}>
          <View style={styles.announcementHeader}>
            <FontAwesome5 name="bullhorn" size={20} color="#5A9C84" />
            <Text style={styles.announcementTitle}>{data.title}</Text>
          </View>
          <Text style={styles.announcementBody}>{data.body}</Text>
          <Pressable style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>حسنا</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// 8. INNER LOGIC COMPONENT (The Brain)
// ============================================================================
const RootLayoutNav = ({ fontsLoaded }) => {
  const { appConfig, activeAnnouncement, dismissAnnouncement, user, userProfile, savedProducts, loading } = useAppContext();

  const [showOptionalUpdate, setShowOptionalUpdate] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showAppIntro, setShowAppIntro] = useState(false);
  
  // ➤ THE LOCK: Prevents infinite scheduling loops
  const notificationScheduleLock = useRef(false);

  const router = useRouter();

  // ➤ CURRENT VERSION (Must match app.json)
  const APP_VERSION = '1.3.0';

  // ➤ ACTIVATE SILENT UPDATES
  useSilentUpdates();

  // ➤ ACTIVATE APP OPEN ADS
  useAppOpenAd();

  // ➤ ACTIVATE DAILY TRACKING
  useDailyPresence(user);

  // --- VERSION CHECKING LOGIC ---
  const getUpdateSignature = (config) => `${config.latestVersion}_${JSON.stringify(config.changelog || [])}`;

  const compareVersions = (vA, vB) => {
    try {
      const partsA = vA.split('.').map(Number);
      const partsB = vB.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if (partsA[i] > partsB[i]) return 1;
        if (partsA[i] < partsB[i]) return -1;
      }
      return 0;
    } catch (e) { return 0; }
  };

  // --- INTRO CHECK ---
  useEffect(() => {
    const checkIntro = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('has_seen_app_intro');
        if (hasSeen !== 'true') setTimeout(() => setShowAppIntro(true), 500);
      } catch (e) { console.error(e); }
    };
    if (fontsLoaded) checkIntro();
  }, [fontsLoaded]);

  // --- HIDE SPLASH SCREEN ---
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // --- INIT ADMOB ---
  useEffect(() => {
    try {
      const isAdMobLinked = !!NativeModules.RNGoogleMobileAdsModule;
      if (isAdMobLinked) {
        const mobileAds = require('react-native-google-mobile-ads').default;
        mobileAds().initialize();
      }
    } catch (e) {
      console.warn("AdMob initialize failed", e);
    }
  }, []);

  // --- CHECK OPTIONAL UPDATE ---
  useEffect(() => {
    const checkOptionalUpdate = async () => {
      if (!appConfig.latestVersion) return;
      const isNewer = compareVersions(appConfig.latestVersion, APP_VERSION) === 1;
      if (isNewer) {
        const currentSignature = getUpdateSignature(appConfig);
        const storedSignature = await AsyncStorage.getItem('skipped_update_signature');
        if (currentSignature !== storedSignature) {
          setShowOptionalUpdate(true);
        }
      }
    };
    checkOptionalUpdate();
  }, [appConfig]);

  const handleSkipUpdate = async () => {
    setShowOptionalUpdate(false);
    const signature = getUpdateSignature(appConfig);
    await AsyncStorage.setItem('skipped_update_signature', signature);
  };

  const handleUpdateClick = () => {
    if (appConfig.latestVersionUrl) Linking.openURL(appConfig.latestVersionUrl);
  };

  // =========================================================
  // ➤ THE WATCHER (Redirects Instantly on Repair)
  // =========================================================
  useEffect(() => {
    if (loading) return;

    if (user && userProfile) {
      if (userProfile.onboardingComplete === false) {
        router.replace({
          pathname: '/(onboarding)/welcome',
          params: { reason: 'repair' }
        });
      }
    }
  }, [user, userProfile, loading]);

  // =========================================================
  // ➤ UPDATED: NOTIFICATION DEBOUNCE & LOCK LOGIC
  // =========================================================
  // =========================================================
  // ➤ OPTIMIZED: NOTIFICATION DEBOUNCE & DATA-HASH LOCK LOGIC
  // =========================================================
  useEffect(() => {
    if (!fontsLoaded) return;

    // 1. Navigation setup for incoming notifications
    const handleNotificationNavigation = (response) => {
      const data = response.notification.request.content.data;
      setTimeout(() => {
        if (data?.screen === 'oilguard') router.push('/oilguard');
        else if (data?.screen === 'routine') router.push('/profile');
        else if (data?.postId) router.push({ pathname: "/community", params: { openPostId: data.postId } });
      }, 800);
    };

    const checkInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        console.log("🧊 App opened from Cold Start via notification");
        handleNotificationNavigation(response);
      }
    };

    checkInitialNotification();
    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationNavigation);

    // 2. STOP if data isn't fully ready yet
    if (loading || !user || !userProfile || !userProfile.onboardingComplete) {
      return () => subscription.remove();
    }

    // 3. THE SMART SCHEDULER (With Daily & Data-Change Locks)
    const setupNotifications = async () => {
      try {
        // A. Handle Permissions & Check Status
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          const hasSkipped = await AsyncStorage.getItem('skipped_notif_permission');
          if (hasSkipped !== 'true') {
            setShowNotificationModal(true);
          }
          return; // Stop here if no permission
        }

        // B. PREPARE CHANNEL
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('oilguard-smart', {
            name: 'Smart Skincare Reminders',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#5A9C84',
            sound: 'default',
          });
        }

        // C. THE SMART LOCK LOGIC (Prevents APK crash from over-scheduling)
        const name = userProfile.settings?.name || 'غالية';
        const settings = userProfile.settings || {};
        const products = savedProducts || [];

        // Create a "Hash" to easily check if products or goals changed
        const currentDataHash = `${products.length}_${settings.goals?.join('') || 'none'}`;
        const todayStr = new Date().toISOString().split('T')[0];

        // Get what we saved last time
        const storedHash = await AsyncStorage.getItem('last_notif_hash');
        const storedDate = await AsyncStorage.getItem('last_notif_date');

        // ✨ ONLY schedule if it's a NEW DAY OR if DATA CHANGED (e.g. added a product) ✨
        if (todayStr !== storedDate || currentDataHash !== storedHash) {
          
          if (scheduleAuthenticNotifications) {
            await scheduleAuthenticNotifications(name, products, settings);
            
            // Lock it! It won't run again today unless the user's data (Hash) changes
            await AsyncStorage.setItem('last_notif_date', todayStr);
            await AsyncStorage.setItem('last_notif_hash', currentDataHash);
            
            console.log(`📅 Smart Notifications Scheduled! (Trigger: ${todayStr !== storedDate ? 'New Day' : 'Data Change'})`);
            
          }
        } else {
          console.log("⏭️ Smart Notifications Skipped (Already scheduled today & no data changes).");
        }

      } catch (e) {
        console.log("Error during notification initialization:", e);
      }
    };

    // Execute the setup function
    setupNotifications();

    // Cleanup listener on unmount
    return () => {
      subscription.remove();
    };

  // MUST KEEP THESE DEPENDENCIES! The "Hash Lock" inside the function stops them from causing spam, 
  // but they are needed so the app detects when you add a product!
  }, [user, userProfile, savedProducts, fontsLoaded, loading]);

  const handleEnableNotifications = async () => {
    setShowNotificationModal(false);
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleDismissNotifications = async () => {
    setShowNotificationModal(false);
    await AsyncStorage.setItem('skipped_notif_permission', 'true');
  };

  if (!fontsLoaded) return null;

  if (appConfig?.maintenanceMode) {
    return <MaintenanceScreen message={appConfig.maintenanceMessage} />;
  }

  const isForceUpdate = compareVersions(appConfig.minSupportedVersion, APP_VERSION) === 1;
  if (isForceUpdate) {
    return (
      <ForceUpdateScreen 
        url={appConfig.latestVersionUrl} 
        // تمرير الرسالة من Firebase
        message={appConfig.android?.critical_message} 
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1A2D27' }}>
      <StatusBar style="light" translucent={true} />

      <AppIntro visible={showAppIntro} onClose={() => setShowAppIntro(false)} />

      <OptionalUpdateModal
        visible={showOptionalUpdate}
        changelog={appConfig.changelog}
        onUpdate={handleUpdateClick}
        onSkip={handleSkipUpdate}
      />

      <NotificationRequestModal
        visible={showNotificationModal}
        onEnable={handleEnableNotifications}
        onDismiss={handleDismissNotifications}
      />

      <AnnouncementModal data={activeAnnouncement} onDismiss={dismissAnnouncement} />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </View>
  );
};

// ============================================================================
// 9. MAIN EXPORT
// ============================================================================
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Tajawal-Regular': require('../assets/fonts/Tajawal-Regular.ttf'),
    'Tajawal-Bold': require('../assets/fonts/Tajawal-Bold.ttf'),
    'Tajawal-ExtraBold': require('../assets/fonts/Tajawal-ExtraBold.ttf'),
  });

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <RootLayoutNav fontsLoaded={fontsLoaded} />
          <GlobalAlertModal />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// ============================================================================
// 10. STYLES
// ============================================================================
const styles = StyleSheet.create({
  // --- SYSTEM SCREENS ---
  systemScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A2D27',
  },
  systemContent: { width: '80%', alignItems: 'center', padding: 20 },
  systemTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24, color: '#F1F3F2', textAlign: 'center', marginBottom: 10 },
  systemMessage: { fontFamily: 'Tajawal-Regular', fontSize: 16, color: '#A3B1AC', textAlign: 'center', lineHeight: 24 },
  updateButton: { marginTop: 30, backgroundColor: '#fbbf24', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 12 },
  updateButtonText: { fontFamily: 'Tajawal-Bold', color: '#1A2D27', fontSize: 16 },

  // --- MODAL COMMON ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  optionalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#253D34',
    borderRadius: 24,
    padding: 24,
    paddingTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(90, 156, 132, 0.3)',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconGlowContainer: {
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionalIconBox: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(90, 156, 132, 0.15)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(90, 156, 132, 0.3)',
  },
  optionalTitle: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 22,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8
  },
  optionalSub: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 14,
    color: '#A3B1AC',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  changelogContainer: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
  },
  whatsNewHeader: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12,
    color: '#5A9C84',
    marginBottom: 8,
    textAlign: 'right',
    paddingRight: 4
  },
  changelogList: {
    maxHeight: 120,
  },
  changelogItem: {
    flexDirection: 'row-reverse',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 6
  },
  changelogText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    color: '#D1D5DB',
    textAlign: 'right',
    flex: 1,
    lineHeight: 18
  },
  optionalActions: {
    width: '100%',
    gap: 12
  },
  updateButtonSmall: {
    backgroundColor: '#5A9C84',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%'
  },
  updateButtonTextSmall: {
    fontFamily: 'Tajawal-Bold',
    color: '#1A2D27',
    fontSize: 15
  },
  skipButton: {
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%'
  },
  skipText: {
    fontFamily: 'Tajawal-Bold',
    color: '#6B7C76',
    fontSize: 14
  },

  // --- ANNOUNCEMENT ---
  announcementCard: { width: '85%', backgroundColor: '#253D34', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(90, 156, 132, 0.5)' },
  announcementHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 15 },
  announcementTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: '#F1F3F2', textAlign: 'right', flex: 1 },
  announcementBody: { fontFamily: 'Tajawal-Regular', fontSize: 15, color: '#D1D5DB', textAlign: 'right', lineHeight: 22, marginBottom: 20 },
  dismissButton: { backgroundColor: '#5A9C84', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  dismissText: { fontFamily: 'Tajawal-Bold', color: '#fff' },
});