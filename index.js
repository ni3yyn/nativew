// index.js (في المجلد الجذري للمشروع)
import { Platform, I18nManager } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

// Disable native OS-level RTL mirroring so the layout is not double-inverted on Arabic devices
try {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
} catch (e) {
  console.warn('Error configuring I18nManager:', e);
}

// تسجيل المعالج لنظام أندرويد فقط
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}

// تشغيل Expo Router كالمعتاد
import 'expo-router/entry';