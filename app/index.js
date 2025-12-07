import { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';

import { useAppContext } from '../src/context/AppContext';

// Keep the native splash screen visible while the app loads
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const { user, loading } = useAppContext();
  const router = useRouter();
  
  // State to track if the Lottie animation has finished
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    console.log(`Index: Checking conditions... Loading: ${loading}, AnimationFinished: ${animationFinished}`);

    // Only try to navigate when the initial loading is done AND the animation has finished
    if (!loading && animationFinished) {
      console.log("Index: Conditions met! Redirecting...");
      if (user) {
        // User is logged in, redirect them to the profile page.
        router.replace('/profile');
      } else {
        // User is not logged in, send them to the login screen.
        router.replace('/login');
      }
    }
  }, [user, loading, animationFinished, router]);

  const onLayoutRootView = useCallback(async () => {
    // Hide the native splash screen once the Lottie animation is ready to be displayed
    await SplashScreen.hideAsync();
  }, []);

  return (
    <View 
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A2D27' }}
      onLayout={onLayoutRootView} // Hide native splash screen on layout
    >
      <LottieView
        style={{ width: '80%', height: '80%' }}
        // IMPORTANT: Update this path to your Lottie JSON file
        source={require('../assets/splash-animation.json')} 
        autoPlay
        loop={false}
        resizeMode="contain"
        // This function will be called when the animation is complete
        onAnimationFinish={() => {
          console.log("Animation Finished!");
          setAnimationFinished(true);
        }}
      />
    </View>
  );
}