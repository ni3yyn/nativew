import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Modal, Pressable, Linking, ScrollView } from 'react-native';
import { Stack, useRouter } from "expo-router";
import { AppProvider, useAppContext } from "../src/context/AppContext";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import * as Notifications from 'expo-notifications';
import { FontAwesome5, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlobalAlertModal from '../src/components/common/GlobalAlertModal';
import AppIntro from '../src/components/common/AppIntro';


// Import the Notification Helpers
import { registerForPushNotificationsAsync, scheduleAuthenticNotifications } from '../src/utils/notificationHelper';

SplashScreen.preventAutoHideAsync();

// ============================================================================
// 1. HELPER COMPONENT: FORCE UPDATE SCREEN (BLOCKING)
// ============================================================================
const ForceUpdateScreen = ({ url }) => (
  <View style={styles.systemScreen}>
    <StatusBar style="light" />
    <LinearGradient colors={['#1A2D27', '#0F1C18']} style={StyleSheet.absoluteFill} />
    <View style={styles.systemContent}>
      <MaterialIcons name="system-update" size={70} color="#fbbf24" style={{ marginBottom: 20 }} />
      <Text style={styles.systemTitle}>تحديث إجباري مطلوب</Text>
      <Text style={styles.systemMessage}>
        هذا الإصدار مليء بالمشاكل التي تم حلها في الإصدار الجديد.
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
// 2. HELPER COMPONENT: OPTIONAL UPDATE MODAL
// ============================================================================
const OptionalUpdateModal = ({ visible, changelog, onUpdate, onSkip }) => {
  return (
    <Modal 
      transparent 
      visible={visible} 
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.optionalCard}>
          
          {/* Centered Glowing Icon */}
          <View style={styles.iconGlowContainer}>
             <View style={styles.optionalIconBox}>
                <Feather name="gift" size={32} color="#5A9C84" />
             </View>
          </View>
          
          {/* Centered Text */}
          <Text style={styles.optionalTitle}>تحديث جديد متوفر</Text>
          <Text style={styles.optionalSub}>
            إصدار جديد جاهز للتحميل. استمتعوا بأحدث الميزات!
          </Text>

          {/* Changelog List */}
          <View style={styles.changelogContainer}>
            <Text style={styles.whatsNewHeader}>ما الجديد؟</Text>
            <ScrollView style={styles.changelogList} contentContainerStyle={{gap: 8}}>
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

          {/* Actions */}
          <View style={styles.optionalActions}>
            <Pressable 
                style={({pressed}) => [styles.updateButtonSmall, { opacity: pressed ? 0.9 : 1 }]} 
                onPress={onUpdate}
            >
                <Text style={styles.updateButtonTextSmall}>تحديث الآن</Text>
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
// 3. HELPER COMPONENT: MAINTENANCE SCREEN
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
// 4. HELPER COMPONENT: ANNOUNCEMENT MODAL
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
            <Text style={styles.dismissText}>حسناً</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// 5. INNER LOGIC COMPONENT (The Brain)
// ============================================================================
const RootLayoutNav = ({ fontsLoaded }) => {
  const { appConfig, activeAnnouncement, dismissAnnouncement, user, userProfile, savedProducts } = useAppContext();
  const [showOptionalUpdate, setShowOptionalUpdate] = useState(false);
  const [showAppIntro, setShowAppIntro] = useState(false);
  const router = useRouter();

  // ➤ CURRENT VERSION
  const APP_VERSION = '1.0.0'; 

  // --- VERSION CHECKING LOGIC ---
  const getUpdateSignature = (config) => {
    return `${config.latestVersion}_${JSON.stringify(config.changelog || [])}`;
  };

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

  useEffect(() => {
    const checkIntro = async () => {
        try {
            // CHANGE 'false' TO 'true' IF YOU WANT TO FORCE SHOW IT FOR TESTING
            const FORCE_DEBUG_INTRO = false; 

            const hasSeen = await AsyncStorage.getItem('has_seen_app_intro');
            if (hasSeen !== 'true' || FORCE_DEBUG_INTRO) {
                // Slight delay to let the app load visually first
                setTimeout(() => setShowAppIntro(true), 500);
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (fontsLoaded) {
        checkIntro();
    }
}, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

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
      if(appConfig.latestVersionUrl) Linking.openURL(appConfig.latestVersionUrl);
  };

  // --- SMART NOTIFICATION LOGIC ---
  useEffect(() => {
    const initNotifications = async () => {
        // 1. Register Permissions (Required for Android 13+)
        await registerForPushNotificationsAsync();

        // 2. Schedule Intelligent Authenticity
        // This calculates the next 7 days of notifications based on:
        // - User's Name
        // - Shelf Status (Empty vs Full)
        // - Goals (Acne vs Anti-aging)
        // - Season (Winter vs Summer)
        if (user && userProfile) {
            const name = userProfile.settings?.name || 'غالية';
            const settings = userProfile.settings || {};
            const products = savedProducts || [];
            
            // Runs the 7-day scheduler
            await scheduleAuthenticNotifications(name, products, settings);
        }
    };

    initNotifications();

    // 3. Handle Notification Taps (Deep Linking Logic)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // A. If notification data says 'oilguard' (Empty Shelf), go to Scanner
      if (data?.screen === 'oilguard') {
        router.push('/oilguard');
      } 
      // B. If notification data says 'routine' (Active), go to Profile
      else if (data?.screen === 'routine') {
        router.push('/profile');
      }
    });

    return () => subscription.remove();
  }, [user, userProfile, savedProducts]);

  if (!fontsLoaded) return null;

  // 1. Maintenance Check (Highest Priority)
  if (appConfig?.maintenanceMode) {
    return <MaintenanceScreen message={appConfig.maintenanceMessage} />;
  }

  // 2. Force Update Check (Medium Priority)
  const isForceUpdate = compareVersions(appConfig.minSupportedVersion, APP_VERSION) === 1;
  if (isForceUpdate) {
    return <ForceUpdateScreen url={appConfig.latestVersionUrl} />;
  }

  // 3. Normal App Structure
  return (
    <>
      <StatusBar style="light" translucent={true} />

      <AppIntro visible={showAppIntro} onClose={() => setShowAppIntro(false)} />
      
      <OptionalUpdateModal 
        visible={showOptionalUpdate}
        changelog={appConfig.changelog}
        onUpdate={handleUpdateClick}
        onSkip={handleSkipUpdate}
      />

      <AnnouncementModal 
        data={activeAnnouncement} 
        onDismiss={dismissAnnouncement} 
      />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
};

// ============================================================================
// 6. MAIN EXPORT
// ============================================================================
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Tajawal-Regular': require('../assets/fonts/Tajawal-Regular.ttf'),
    'Tajawal-Bold': require('../assets/fonts/Tajawal-Bold.ttf'),
    'Tajawal-ExtraBold': require('../assets/fonts/Tajawal-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (Platform.OS === 'android') {
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootLayoutNav fontsLoaded={fontsLoaded} />
        <GlobalAlertModal />
      </AppProvider>
    </SafeAreaProvider>
  );
}

// ============================================================================
// 7. STYLES
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

  // --- OPTIONAL UPDATE MODAL ---
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