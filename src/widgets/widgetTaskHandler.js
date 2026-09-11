// src/widgets/widgetTaskHandler.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { resolveSpfContext } from '../services/spfContextEngine';
import { SpfTimerWidget } from './SpfTimerWidget';

const WIDGET_STATE_KEY = '@wathiq_live_timer_state';

export async function widgetTaskHandler(props) {
    const { widgetAction, clickAction, renderWidget } = props;

    // 1. قراءة الحالة المحفوظة
    let state = {
        timerState: 'idle',
        endTime: 0,
        totalDuration: 75 * 60,
    };

    try {
        const saved = await AsyncStorage.getItem(WIDGET_STATE_KEY);
        if (saved) state = JSON.parse(saved);
    } catch {}

    const now = Date.now();
    const context = await resolveSpfContext();

    // 2. التعامل مع نقرة الزر
    if (widgetAction === 'WIDGET_CLICK' && clickAction === 'ACTION_TOGGLE_SPF_TIMER') {
        state.timerState = 'running';
        state.endTime = now + context.durationSeconds * 1000;
        state.totalDuration = context.durationSeconds;

        // جدولة تنبيه أندرويد في الخلفية
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: '☀️ حان وقت تجديد واقي الشمس!',
                    body: `تلاشت طبقة الحماية (UV ${context.uvLevel}). يُرجى إعادة التطبيق لحماية بشرتك.`,
                    sound: 'default',
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: new Date(state.endTime),
                },
            });
        } catch (e) {
            console.warn('Alarm scheduling note:', e);
        }

        await AsyncStorage.setItem(WIDGET_STATE_KEY, JSON.stringify(state));
    }

    // 3. حساب الوقت المتبقي
    let remainingSeconds = Math.max(0, Math.ceil((state.endTime - now) / 1000));
    if (state.timerState === 'running' && remainingSeconds <= 0) {
        state.timerState = 'expired';
    }

    // 4. رسم الويدجت فوراً على الشاشة (سواء عند الإضافة، التحديث، أو النقر)
    renderWidget(
        <SpfTimerWidget
            uvLevel={context.uvLevel}
            isEstimated={context.isEstimated}
            timerState={context.durationMinutes === 0 ? 'safe' : state.timerState}
            remainingSeconds={remainingSeconds}
            totalDuration={state.totalDuration}
            accentColor={context.color}
        />
    );
}