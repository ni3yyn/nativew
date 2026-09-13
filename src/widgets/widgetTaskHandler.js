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

// Width (in dp) below which we fall back to the compact 2x2 layout when the
// user has resized the 4x2 widget down. This is intentionally generous —
// the large layout needs ~250dp to fit the ring + text row without
// clipping/overflowing, so we switch well before that.
const COMPACT_WIDTH_THRESHOLD_DP = 220;

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
        // - OR if the user dragged/shrunk the 4x2 widget below the compact threshold
        //
        // NOTE: `widgetInfo.width`/`widgetInfo.height` from react-native-android-widget
        // are reported in dp, matching the `minWidth`/`minHeight` values you set in
        // app.json — so comparing directly against a dp threshold here is correct.
        // Logged below so you can confirm the actual values on-device in Logcat if the
        // wrong layout ever gets picked again.
        const reportedWidth = widgetInfo?.width;
        const isNamedCompact = widgetInfo?.widgetName === 'SpfTimerCompactWidget';
        const isResizedCompact = typeof reportedWidth === 'number' && reportedWidth > 0 && reportedWidth < COMPACT_WIDTH_THRESHOLD_DP;
        const isCompact = isNamedCompact || isResizedCompact;

        if (__DEV__) {
            console.log(
                `[Widget] name=${widgetInfo?.widgetName} width=${reportedWidth}dp height=${widgetInfo?.height}dp -> isCompact=${isCompact}`
            );
        }

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