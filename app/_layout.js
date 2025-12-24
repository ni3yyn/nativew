import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Modal, Pressable, Linking, ScrollView } from 'react-native';
import { Stack } from "expo-router";
import { AppProvider, useAppContext } from "../src/context/AppContext";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { FontAwesome5, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

SplashScreen.preventAutoHideAsync();

// --- 1. FORCE UPDATE SCREEN (BLOCKING) ---
const ForceUpdateScreen = ({ url }) => (
  <View style={styles.systemScreen}>
    <StatusBar style="light" />
    <LinearGradient colors={['#1A2D27', '#0F1C18']} style={StyleSheet.absoluteFill} />
    <View style={styles.systemContent}>
      <MaterialIcons name="system-update" size={70} color="#fbbf24" style={{ marginBottom: 20 }} />
      <Text style={styles.systemTitle}>تحديث إجباري مطلوب</Text>
      <Text style={styles.systemMessage}>
        هذا الإصدار قديم جداً ولم يعد مدعوماً. يرجى التحديث للمتابعة.
      </Text>
      {url ? (
        <Pressable style={styles.updateButton} onPress={() => Linking.openURL(url)}>
          <Text style={styles.updateButtonText}>تحديث الآن</Text>
        </Pressable>
      ) : null}
    </View>
  </View>
);

// --- 2. ENHANCED OPTIONAL UPDATE MODAL ---
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
          <Text style={styles.optionalTitle}>تحديث جديد متوفر ✨</Text>
          <Text style={styles.optionalSub}>
            إصدار جديد جاهز للتحميل. استمتع بأحدث الميزات!
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

// --- 3. MAINTENANCE SCREEN ---
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

// --- INNER LOGIC COMPONENT ---
const RootLayoutNav = ({ fontsLoaded }) => {
  const { appConfig, activeAnnouncement, dismissAnnouncement } = useAppContext();
  const [showOptionalUpdate, setShowOptionalUpdate] = useState(false);
  
  // ➤ CURRENT VERSION
  const APP_VERSION = '1.0.0'; 

  // Helper: Create a unique ID for this specific update configuration
  // This combines Version + The actual text content
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
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Check for Optional Update Logic
  useEffect(() => {
    const checkOptionalUpdate = async () => {
        if (!appConfig.latestVersion) return;

        // 1. Is it a newer version?
        const isNewer = compareVersions(appConfig.latestVersion, APP_VERSION) === 1;
        
        if (isNewer) {
            // 2. Create the unique signature for THIS update
            const currentSignature = getUpdateSignature(appConfig);
            
            // 3. Get what the user last skipped
            const storedSignature = await AsyncStorage.getItem('skipped_update_signature');
            
            // 4. If signatures don't match, SHOW IT (Even if version number is same, but text changed)
            if (currentSignature !== storedSignature) {
                setShowOptionalUpdate(true);
            }
        }
    };
    checkOptionalUpdate();
  }, [appConfig]); // Dependency on appConfig ensures this runs every time Admin saves

  // Handle "Later" Click
  const handleSkipUpdate = async () => {
      setShowOptionalUpdate(false);
      // Save the unique signature so we don't show THIS exact update again
      const signature = getUpdateSignature(appConfig);
      await AsyncStorage.setItem('skipped_update_signature', signature);
  };

  const handleUpdateClick = () => {
      if(appConfig.latestVersionUrl) Linking.openURL(appConfig.latestVersionUrl);
  };

  if (!fontsLoaded) return null;

  // 1. Maintenance Check (Priority 1)
  if (appConfig?.maintenanceMode) {
    return <MaintenanceScreen message={appConfig.maintenanceMessage} />;
  }

  // 2. Force Update Check (Priority 2)
  const isForceUpdate = compareVersions(appConfig.minSupportedVersion, APP_VERSION) === 1;
  if (isForceUpdate) {
    return <ForceUpdateScreen url={appConfig.latestVersionUrl} />;
  }

  // 3. Normal App
  return (
    <>
      <StatusBar style="light" translucent={true} />
      
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
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </>
  );
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Tajawal-Regular': require('../assets/fonts/Tajawal-Regular.ttf'),
    'Tajawal-Bold': require('../assets/fonts/Tajawal-Bold.ttf'),
    'Tajawal-ExtraBold': require('../assets/fonts/Tajawal-ExtraBold.ttf'),
  });

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#00000000');
      NavigationBar.setPositionAsync('absolute');
      NavigationBar.setButtonStyleAsync('light'); 
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootLayoutNav fontsLoaded={fontsLoaded} />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // ... (keep systemScreen styles)
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

  // --- ENHANCED OPTIONAL MODAL STYLES ---
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

  // ... (keep announcement styles)
  announcementCard: { width: '85%', backgroundColor: '#253D34', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(90, 156, 132, 0.5)' },
  announcementHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 15 },
  announcementTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: '#F1F3F2', textAlign: 'right', flex: 1 },
  announcementBody: { fontFamily: 'Tajawal-Regular', fontSize: 15, color: '#D1D5DB', textAlign: 'right', lineHeight: 22, marginBottom: 20 },
  dismissButton: { backgroundColor: '#5A9C84', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  dismissText: { fontFamily: 'Tajawal-Bold', color: '#fff' },
});