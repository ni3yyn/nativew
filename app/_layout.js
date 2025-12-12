import { useEffect } from 'react';
import { Platform } from 'react-native'; // <--- Added import
import { Stack } from "expo-router";
import { AppProvider } from "../src/context/AppContext";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar'; // <--- Added import

// Prevent the splash screen from auto-hiding before fonts are loaded
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Tajawal-Regular': require('../assets/fonts/Tajawal-Regular.ttf'),
    'Tajawal-Bold': require('../assets/fonts/Tajawal-Bold.ttf'),
    'Tajawal-ExtraBold': require('../assets/fonts/Tajawal-ExtraBold.ttf'),
  });

  useEffect(() => {
    // 1. Android Edge-to-Edge Configuration
    if (Platform.OS === 'android') {
      // Make the bottom navigation bar transparent
      NavigationBar.setBackgroundColorAsync('#00000000');
      // Allow the app to draw behind the navigation bar
      NavigationBar.setPositionAsync('absolute');
      // Set icons to light (white) since your app uses dark backgrounds
      NavigationBar.setButtonStyleAsync('light'); 
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; 
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        {/* 'light' style makes text white, 'translucent' ensures background flows under */}
        <StatusBar style="light" translucent={true} />
        <Stack screenOptions={{ headerShown: false }}>
          
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}