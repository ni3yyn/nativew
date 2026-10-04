// src/utils/safeAdMob.js
import { Platform, NativeModules, TurboModuleRegistry } from 'react-native';

/**
 * Checks if react-native-google-mobile-ads native module is linked and available.
 * Compatible with React Native New Architecture (TurboModules) and legacy NativeModules.
 */
export const isAdMobAvailable = () => {
  if (Platform.OS === 'web') return false;

  try {
    // 1. Check New Architecture TurboModuleRegistry (returns null if not registered, does NOT throw)
    if (TurboModuleRegistry?.get && TurboModuleRegistry.get('RNGoogleMobileAdsModule')) {
      return true;
    }
    // 2. Check legacy NativeModules
    if (NativeModules?.RNGoogleMobileAdsModule) {
      return true;
    }
    return false;
  } catch (_) {
    return false;
  }
};

/**
 * Safely retrieve the react-native-google-mobile-ads module, or null if running in Expo Go/web.
 */
export const getAdMob = () => {
  if (!isAdMobAvailable()) return null;
  try {
    return require('react-native-google-mobile-ads');
  } catch (e) {
    console.warn('[safeAdMob] Failed to require react-native-google-mobile-ads:', e?.message || e);
    return null;
  }
};

// Production Ad Unit IDs
const PROD_APP_OPEN_ID = 'ca-app-pub-6010052879824695/8213348420';
const PROD_INTERSTITIAL_ID = 'ca-app-pub-6010052879824695/5539413194';

// Google Official Test Ad Unit IDs (guaranteed 100% fill, prevents invalid traffic penalties)
const TEST_APP_OPEN_ID = 'ca-app-pub-3940256099942544/9257395921';
const TEST_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712';

/**
 * Returns the App Open Ad Unit ID.
 * Uses Google Test ID in __DEV__ to prevent invalid traffic penalties and test fill issues.
 */
export const getAppOpenAdUnitId = () => {
  if (__DEV__) {
    const adMob = getAdMob();
    return adMob?.TestIds?.APP_OPEN || TEST_APP_OPEN_ID;
  }
  return PROD_APP_OPEN_ID;
};

/**
 * Returns the Interstitial Ad Unit ID.
 * Uses Google Test ID in __DEV__ to prevent invalid traffic penalties and test fill issues.
 */
export const getInterstitialAdUnitId = () => {
  if (__DEV__) {
    const adMob = getAdMob();
    return adMob?.TestIds?.INTERSTITIAL || TEST_INTERSTITIAL_ID;
  }
  return PROD_INTERSTITIAL_ID;
};

/**
 * Initialize Google Mobile Ads SDK once at startup.
 */
let isInitialized = false;
export const initializeAdMobAsync = async () => {
  if (isInitialized) return true;
  const adMob = getAdMob();
  if (!adMob || !adMob.default) return false;

  try {
    const adapterStatuses = await adMob.default().initialize();
    isInitialized = true;
    console.log('✅ [AdMob] SDK initialized successfully:', adapterStatuses);
    return true;
  } catch (e) {
    console.warn('⚠️ [AdMob] SDK initialization failed:', e?.message || e);
    return false;
  }
};

/**
 * User-friendly interpretation of common AdMob load errors.
 */
export const interpretAdError = (error) => {
  if (!error) return 'Unknown error';
  const msg = error.message || String(error);
  const code = error.code;

  if (msg.includes('no-fill') || code === 'ERROR_CODE_NO_FILL' || code === 3) {
    return 'NO_FILL (Code 3): Google AdMob has no ad available to serve for this request right now. This is common with new apps, low traffic, or restricted ad targeting.';
  }
  if (msg.includes('network') || code === 'ERROR_CODE_NETWORK_ERROR' || code === 2) {
    return 'NETWORK_ERROR (Code 2): Device could not reach Google ad servers. Check internet connection.';
  }
  if (msg.includes('invalid') || code === 'ERROR_CODE_INVALID_REQUEST' || code === 1) {
    return 'INVALID_REQUEST (Code 1): Invalid ad unit ID or app ID.';
  }
  if (msg.includes('internal') || code === 'ERROR_CODE_INTERNAL_ERROR' || code === 0) {
    return 'INTERNAL_ERROR (Code 0): Google internal ad server issue.';
  }
  return `Ad Error: ${code || ''} - ${msg}`;
};
