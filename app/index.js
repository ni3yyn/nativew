import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { useAppContext } from '../src/context/AppContext';

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const { user, loading } = useAppContext();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync(); 
      if (user) {
        router.replace('/profile'); 
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

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