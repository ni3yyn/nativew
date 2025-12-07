import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useAppContext } from '../src/context/AppContext';

// Keep the native splash screen visible while the app loads.
// This will be hidden in this component once auth state is ready.
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const { user, loading } = useAppContext();
  const router = useRouter();
  
  useEffect(() => {
    console.log(`Index: Checking conditions... Loading: ${loading}, User: ${!!user}`);

    // Only try to navigate when the initial loading (auth/profile setup) is done
    if (!loading) {
      console.log("Index: Loading complete! Redirecting...");
      
      // Hide the native splash screen now that we have a decision to make
      SplashScreen.hideAsync(); 
      
      if (user) {
        // User is logged in, redirect them to the profile page.
        router.replace('/profile');
      } else {
        // User is not logged in, send them to the login screen.
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  // The background color will show the Expo splash screen background color until navigation happens.
  return (
    <View 
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A2D27' }}
    >
      {/* Content is removed. This View just holds the space while waiting for auth state. */}
    </View>
  );
}