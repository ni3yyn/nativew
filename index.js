// index.js (في المجلد الجذري للمشروع)
import { Platform, I18nManager } from 'react-native';
// Disable native OS-level RTL mirroring so the layout is not double-inverted on Arabic devices
try {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
} catch (e) {
  console.warn('Error configuring I18nManager:', e);
}

// تشغيل Expo Router كالمعتاد
import 'expo-router/entry';