// index.js (في المجلد الجذري للمشروع)
import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/widgetTaskHandler';

// تسجيل المعالج لنظام أندرويد فقط
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}

// تشغيل Expo Router كالمعتاد
import 'expo-router/entry';