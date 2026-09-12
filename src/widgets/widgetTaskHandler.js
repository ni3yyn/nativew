// src/widgets/widgetTaskHandler.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { resolveSpfContext } from '../services/spfContextEngine';
import { SpfTimerWidget } from './SpfTimerWidget';
// استيراد المكونات الأساسية لرسم رسالة الخطأ إن لزم الأمر
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

const WIDGET_STATE_KEY = '@wathiq_live_timer_state';

export async function widgetTaskHandler(props) {
    const { widgetAction, clickAction, renderWidget } = props;

    try {
        let state = {
            timerState: 'idle',
            endTime: 0,
            totalDuration: 75 * 60,
        };

        const saved = await AsyncStorage.getItem(WIDGET_STATE_KEY);
        if (saved) state = JSON.parse(saved);

        const now = Date.now();
        const context = await resolveSpfContext();

        if (widgetAction === 'WIDGET_CLICK' && clickAction === 'ACTION_TOGGLE_SPF_TIMER') {
            state.timerState = 'running';
            state.endTime = now + context.durationSeconds * 1000;
            state.totalDuration = context.durationSeconds;

            try {
                await Notifications.cancelAllScheduledNotificationsAsync();
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '☀️ حان وقت تجديد واقي الشمس!',
                        body: `تلاشت طبقة الحماية (UV ${context.uvLevel}). يُرجى إعادة التطبيق لحماية بشرتك.`,
                        sound: 'default',
                    },
                    trigger: {
                        seconds: context.durationSeconds, // تم التغيير لطريقة آمنة أكثر في الخلفية
                    },
                });
            } catch (e) {
                console.warn('Alarm error:', e);
            }

            await AsyncStorage.setItem(WIDGET_STATE_KEY, JSON.stringify(state));
        }

        let remainingSeconds = Math.max(0, Math.ceil((state.endTime - now) / 1000));
        if (state.timerState === 'running' && remainingSeconds <= 0) {
            state.timerState = 'expired';
        }

        // الرسم الطبيعي للويدجت
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

    } catch (error) {
        // 🚨 وضع الحماية (Fallback): لو انهار الكود، سنرسم الويدجت بلون أحمر مع رسالة الخطأ!
        // هذا يمنع رسالة "Couldn't add widget" المزعجة ويخبرك بالمشكلة فوراً.
        renderWidget(
            <FlexWidget
                style={{
                    width: 'match_parent',
                    height: 'match_parent',
                    backgroundColor: '#1A2D27',
                    borderRadius: 24,
                    padding: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <TextWidget
                    text="حدث خطأ في معالجة الويدجت"
                    style={{ fontSize: 16, color: '#EF4444', fontFamily: 'Tajawal-Bold' }}
                />
                <TextWidget
                    text={String(error.message || 'Unknown Error')}
                    style={{ fontSize: 12, color: '#F1F3F2', marginTop: 10 }}
                />
            </FlexWidget>
        );
    }
}