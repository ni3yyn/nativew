// src/widgets/widgetTaskHandler.js
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

// Import both widget layouts
import { SpfTimerWidget } from './SpfTimerWidget';
import { SpfTimerCompactWidget } from './SpfTimerCompactWidget';
import { resolveSpfContext } from '../services/spfContextEngine';

const WIDGET_STATE_KEY = '@wathiq_live_timer_state';

export async function widgetTaskHandler(props) {
    const { widgetAction, clickAction, renderWidget, widgetInfo } = props;

    try {
        // 1. Initial State Fallback
        let state = {
            timerState: 'idle',
            endTime: 0,
            totalDuration: 75 * 60,
        };

        // 2. Load Persisted State from AsyncStorage
        const saved = await AsyncStorage.getItem(WIDGET_STATE_KEY);
        if (saved) {
            try {
                state = JSON.parse(saved);
            } catch (parseErr) {
                console.warn('[Widget] Failed to parse saved state, using default:', parseErr);
            }
        }

        const now = Date.now();
        const context = await resolveSpfContext();

        // 3. Handle Interactive Button Click ("بدء الحماية" / "إعادة المؤقت" / "تجديد الآن")
        if (widgetAction === 'WIDGET_CLICK' && clickAction === 'ACTION_TOGGLE_SPF_TIMER') {
            // If UV is 0 (safe / night), do not start timer
            if (context.durationMinutes > 0) {
                state.timerState = 'running';
                state.endTime = now + context.durationSeconds * 1000;
                state.totalDuration = context.durationSeconds;

                try {
                    // Schedule background alarm notification
                    await Notifications.cancelAllScheduledNotificationsAsync();
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: '☀️ حان وقت تجديد واقي الشمس!',
                            body: `تلاشت طبقة الحماية (UV ${context.uvLevel}). يُرجى إعادة التطبيق لحماية بشرتك.`,
                            sound: 'default',
                        },
                        trigger: {
                            seconds: context.durationSeconds,
                        },
                    });
                } catch (notifErr) {
                    console.warn('[Widget] Notification schedule error:', notifErr);
                }

                await AsyncStorage.setItem(WIDGET_STATE_KEY, JSON.stringify(state));
            }
        }

        // 4. Calculate Remaining Countdown
        let remainingSeconds = Math.max(0, Math.ceil((state.endTime - now) / 1000));
        
        // Auto-expire when timer finishes
        if (state.timerState === 'running' && remainingSeconds <= 0) {
            state.timerState = 'expired';
        }

        // Determine effective timer state (if UV is 0, always show safe)
        const effectiveTimerState = context.durationMinutes === 0 ? 'safe' : state.timerState;

        // 🌟 5. DYNAMIC WIDGET SELECTOR (Handles BOTH 4x2 and 2x2)
        // - Checks if user picked the dedicated 2x2 widget: 'SpfTimerCompactWidget'
        // - OR if the user dragged/shrunk the 4x2 widget below 220dp width
        const isCompact = 
            widgetInfo?.widgetName === 'SpfTimerCompactWidget' || 
            (widgetInfo?.width && widgetInfo.width < 220);

        const WidgetComponent = isCompact ? SpfTimerCompactWidget : SpfTimerWidget;

        // 6. Render the chosen widget
        renderWidget(
            <WidgetComponent
                uvLevel={context.uvLevel}
                isEstimated={context.isEstimated}
                timerState={effectiveTimerState}
                remainingSeconds={remainingSeconds}
                totalDuration={state.totalDuration}
                accentColor={context.color}
            />
        );

    } catch (error) {
        console.error('[Widget TaskHandler Error]:', error);
        
        // Visual fallback to avoid Android launcher error crashes
        renderWidget(
            <FlexWidget
                style={{
                    width: 'match_parent',
                    height: 'match_parent',
                    backgroundColor: '#F5FAF5',
                    borderRadius: 24,
                    padding: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <TextWidget
                    text="حدث خطأ في معالجة الويدجت"
                    style={{ fontSize: 14, color: '#D94A4F', fontFamily: 'Tajawal-Bold' }}
                />
                <TextWidget
                    text={String(error.message || 'Unknown Error')}
                    style={{ fontSize: 11, color: '#4A6B5F', marginTop: 8 }}
                />
            </FlexWidget>
        );
    }
}