// src/widgets/SpfTimerWidget.js
import React from 'react';
import {
    FlexWidget,
    TextWidget,
    SvgWidget,
} from 'react-native-android-widget';

export const SpfTimerWidget = ({
    uvLevel = 8.5,
    isEstimated = false,
    timerState = 'idle', // 'idle' | 'running' | 'expired' | 'safe'
    remainingSeconds = 0,
    totalDuration = 75 * 60,
    accentColor = '#EA580C',
}) => {
    // حساب الدقائق والثواني بشكل منفصل
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    const mStr = `${m < 10 ? '0' : ''}${m}`;
    const sStr = `${s < 10 ? '0' : ''}${s}`;

    const progress = totalDuration > 0 ? remainingSeconds / totalDuration : 0;

    // نص الزر الدقيق حسب الحالة
    let buttonText = 'بدء الحماية';
    let buttonBg = '#3F8F78';
    if (timerState === 'running') {
        buttonText = 'إعادة المؤقت';
        buttonBg = '#3D9275';
    } else if (timerState === 'expired') {
        buttonText = 'تجديد الآن';
        buttonBg = '#DC2626';
    } else if (timerState === 'safe') {
        buttonText = 'أشعة آمنة';
        buttonBg = '#253D34';
    }

    // نص الحالة (كلمتين فقط)
    let twoWordStatus = 'بانتظار البدء';
    if (timerState === 'running') twoWordStatus = 'حماية نشطة';
    else if (timerState === 'expired') twoWordStatus = 'انتهت الحماية';
    else if (timerState === 'safe') twoWordStatus = 'أشعة آمنة';

    // SVG الحلقة العريضة السميكة (Stroke 10) مع الحافة المتحركة
    const ringSvg = `
        <svg width="104" height="104" viewBox="0 0 104 104">
            <circle cx="52" cy="52" r="44" stroke="#253D34" stroke-width="9.5" fill="none" />
            ${timerState === 'running' ? `
                <circle 
                    cx="52" cy="52" r="44" 
                    stroke="${accentColor}" 
                    stroke-width="9.5" 
                    fill="none" 
                    stroke-dasharray="276.46" 
                    stroke-dashoffset="${276.46 * (1 - progress)}" 
                    stroke-linecap="round"
                    transform="rotate(-90 52 52)"
                />
            ` : ''}
        </svg>
    `;

    return (
        <FlexWidget
            style={{
                width: 'match_parent',
                height: 'match_parent',
                backgroundColor: '#1A2D27',
                borderRadius: 24,
                padding: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}
        >
            {/* 1. عمود الحلقة والأرقام العمودية */}
            <FlexWidget
                style={{
                    width: 104,
                    height: 104,
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}
            >
                {/* الحلقة كخلفية مباشرة */}
                <SvgWidget svg={ringSvg} style={{ width: 104, height: 104 }} />

                {/* الأرقام مقسمة داخل الحلقة: الدقائق فوق والثواني تحت */}
                <FlexWidget
                    style={{
                        position: 'absolute',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <TextWidget
                        text={timerState === 'running' ? mStr : timerState === 'expired' ? '00' : `${Math.round(totalDuration / 60)}`}
                        style={{
                            fontSize: 26,
                            fontFamily: 'Tajawal-ExtraBold',
                            color: timerState === 'expired' ? '#DC2626' : '#F1F3F2',
                        }}
                    />
                    <TextWidget
                        text={timerState === 'running' ? sStr : timerState === 'expired' ? '00' : 'دقيقة'}
                        style={{
                            fontSize: 16,
                            fontFamily: 'Tajawal-Bold',
                            color: timerState === 'expired' ? '#DC2626' : accentColor,
                        }}
                    />
                </FlexWidget>
            </FlexWidget>

            {/* 2. عمود المعلومات والتحكم */}
            <FlexWidget
                style={{
                    flex: 1,
                    height: 'match_parent',
                    justifyContent: 'space-between',
                    paddingLeft: 12,
                    alignItems: 'flex-end',
                }}
            >
                {/* الهيدر: مؤقت وثيق + رقم الـ UV النقي بدون إطارات */}
                <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <TextWidget
                        text={`UV ${isEstimated ? '~' : ''}${uvLevel}`}
                        style={{
                            fontSize: 14,
                            fontFamily: 'Tajawal-ExtraBold',
                            color: accentColor,
                        }}
                    />
                    <TextWidget
                        text="مؤقت وثيق"
                        style={{
                            fontSize: 14,
                            fontFamily: 'Tajawal-ExtraBold',
                            color: '#F1F3F2',
                        }}
                    />
                </FlexWidget>

                {/* الحالة بكلمتين فقط دون تكرار للوقت */}
                <TextWidget
                    text={twoWordStatus}
                    style={{
                        fontSize: 12,
                        fontFamily: 'Tajawal-Bold',
                        color: '#A8B8B3',
                    }}
                />

                {/* زر التفاعل السريع */}
                <FlexWidget
                    clickAction="ACTION_TOGGLE_SPF_TIMER"
                    style={{
                        backgroundColor: buttonBg,
                        borderRadius: 12,
                        width: 'match_parent',
                        height: 36,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <TextWidget
                        text={buttonText}
                        style={{
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontFamily: 'Tajawal-Bold',
                        }}
                    />
                </FlexWidget>
            </FlexWidget>
        </FlexWidget>
    );
};