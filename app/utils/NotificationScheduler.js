import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationScheduler {
  static async requestPermissions() {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }

    // Get token (optional)
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  }

  static async scheduleDaily(amTime = '08:00', pmTime = '21:00', gender = 'أنثى', routines = {}, products = []) {
    try {
      // Cancel all existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      const [amHour, amMinute] = amTime.split(':').map(Number);
      const [pmHour, pmMinute] = pmTime.split(':').map(Number);

      // Morning notification
      if (amTime) {
        const amTrigger = {
          hour: amHour,
          minute: amMinute,
          repeats: true,
        };

        const amProductsCount = routines.am?.flatMap(step => step.productIds || []).length || 0;
        const amMessage = amProductsCount > 0 
          ? `حان وقت روتين الصباح! لديك ${amProductsCount} خطوة${amProductsCount > 1 ? 'ات' : 'ة'} لإكمالها.`
          : `صباح الخير${gender === 'أنثى' ? 'ِ' : ''}! حان وقت العناية ببشرتك${gender === 'أنثى' ? 'ِ' : ''}.`;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ تذكير روتين الصباح',
            body: amMessage,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: { type: 'morning_routine' },
          },
          trigger: amTrigger,
        });
      }

      // Evening notification
      if (pmTime) {
        const pmTrigger = {
          hour: pmHour,
          minute: pmMinute,
          repeats: true,
        };

        const pmProductsCount = routines.pm?.flatMap(step => step.productIds || []).length || 0;
        const pmMessage = pmProductsCount > 0
          ? `وقت روتين المساء! لديك ${pmProductsCount} خطوة${pmProductsCount > 1 ? 'ات' : 'ة'} لإكمالها.`
          : `مساء الخير${gender === 'أنثى' ? 'ِ' : ''}! حان وقت تنظيف وتجديد بشرتك${gender === 'أنثى' ? 'ِ' : ''}.`;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🌙 تذكير روتين المساء',
            body: pmMessage,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            data: { type: 'evening_routine' },
          },
          trigger: pmTrigger,
        });
      }

      // Weekly product check notification (every Saturday at 10:00)
      if (products.length > 0) {
        const weeklyTrigger = {
          hour: 10,
          minute: 0,
          weekday: 6, // Saturday
          repeats: true,
        };

        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📊 تحليل أسبوعي',
            body: `لديك ${products.length} منتج${products.length > 1 ? 'ات' : ''} تحتاج مراجعة. هيا نتحقق من روتينك!`,
            sound: 'default',
            data: { type: 'weekly_check' },
          },
          trigger: weeklyTrigger,
        });
      }

      console.log('Notifications scheduled successfully');
      return true;
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      return false;
    }
  }

  static async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  static async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  static async showTestNotification() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 اختبار الإشعارات',
        body: 'هذا إشعار اختباري من تطبيق العناية!',
        sound: 'default',
        data: { type: 'test' },
      },
      trigger: {
        seconds: 2,
      },
    });
  }
}