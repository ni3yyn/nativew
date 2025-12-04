import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAppContext } from '../src/context/AppContext';

export default function Index() {
  const { user, loading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // FIX: Change '/(auth)/login' to just '/login'
      // Because the (auth) folder is a "Group" (it is hidden from the URL)
      router.replace('/login');
    } else {
      console.log("User is logged in!");
      // We will build the main app later
    }
  }, [user, loading]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
      <ActivityIndicator size="large" color="#B2D8B4" />
    </View>
  );
}