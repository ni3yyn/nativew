import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useAppContext } from '../src/context/AppContext';

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const { user, userProfile, loading } = useAppContext(); // Get userProfile too
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
      if (user) {
        // Only go to profile if we actually have profile data
        // Check for a specific field like 'onboardingComplete' or 'settings'
        if (userProfile && userProfile.onboardingComplete) {
          router.replace('/profile');
        } else {
          // If user exists but no profile (or onboarding incomplete), send to Welcome/Onboarding
          router.replace('/(onboarding)/welcome');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, userProfile, loading, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#1A2D27' // Matches your app theme to avoid white flashes
      }}
    >
    </View>
  );
}