// src/widgets/SpfTimerWidget.js
import React from 'react';
import { FlexWidget, TextWidget, SvgWidget, OverlapWidget } from 'react-native-android-widget';

export const SpfTimerWidget = ({
    uvLevel = 8.5,
    isEstimated = false,
    timerState = 'idle', // 'idle' | 'running' | 'expired' | 'safe'
    remainingSeconds = 0,
    totalDuration = 75 * 60,
    accentColor = '#CC8A1A',
}) => {
    const isSafe = timerState === 'safe';
    const isExpired = timerState === 'expired';
    const isRunning = timerState === 'running';

    // 1. Time Calculations
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    const mStr = `${m < 10 ? '0' : ''}${m}`;
    const sStr = `${s < 10 ? '0' : ''}${s}`;

    const progress = totalDuration > 0 ? remainingSeconds / totalDuration : 0;
    const clampedProgress = Math.max(0, Math.min(1, progress));

    // 2. Button State Config (Light Theme)
    let buttonText = 'بدء الحماية';
    let buttonBg = '#3D9275';
    let buttonTextColor = '#F0F5F0';

    if (isSafe) {
        buttonText = 'أشعة آمنة';
        buttonBg = '#E0EDE6';
        buttonTextColor = '#1C9A66';
    } else if (isExpired) {
        buttonText = 'تجديد الآن';
        buttonBg = '#D94A4F';
        buttonTextColor = '#FFFFFF';
    } else if (isRunning) {
        buttonText = 'إعادة المؤقت';
        buttonBg = '#3D9275';
        buttonTextColor = '#F0F5F0';
    }

    // 3. Status (Strict 2 Words)
    let twoWordStatus = 'بانتظار البدء';
    if (isSafe) twoWordStatus = 'أشعة آمنة';
    else if (isExpired) twoWordStatus = 'انتهت الحماية';
    else if (isRunning) twoWordStatus = 'حماية نشطة';

    // 4. Ring Math (110dp size, 10dp stroke, radius 44)
    const ringColor = isExpired ? '#D94A4F' : accentColor;
    const circumference = 276.46;
    const strokeDashoffset = circumference * (1 - (isRunning ? clampedProgress : isExpired ? 0 : 1));

    // Moving edge dot coordinates
    const angle = clampedProgress * 2 * Math.PI - Math.PI / 2;
    const dotX = 55 + 44 * Math.cos(angle);
    const dotY = 55 + 44 * Math.sin(angle);

    // Light Theme Gradient Background (Aurora)
    const backgroundGradientSvg = `
        <svg width="100%" height="100%">
            <defs>
                <linearGradient id="auroraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#F5FAF5" />
                    <stop offset="55%" stop-color="#EAF3EA" />
                    <stop offset="100%" stop-color="#D4ECE0" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" rx="24" fill="url(#auroraGrad)" stroke="rgba(39, 103, 81, 0.15)" stroke-width="1" />
        </svg>
    `;

    const ringSvg = `
        <svg width="110" height="110" viewBox="0 0 110 110">
            <!-- Light Track -->
            <circle cx="55" cy="55" r="44" stroke="rgba(24, 53, 45, 0.09)" stroke-width="10" fill="none" />
            
            <!-- Progress Stroke -->
            ${(isRunning || timerState === 'idle') ? `
                <circle 
                    cx="55" cy="55" r="44" 
                    stroke="${ringColor}" 
                    stroke-width="10" 
                    stroke-dasharray="276.46" 
                    stroke-dashoffset="${strokeDashoffset}" 
                    stroke-linecap="round" 
                    fill="none" 
                    transform="rotate(-90 55 55)" 
                />
            ` : isExpired ? `
                <circle 
                    cx="55" cy="55" r="44" 
                    stroke="#D94A4F" 
                    stroke-width="10" 
                    fill="none" 
                />
            ` : ''}

            <!-- Moving Edge Dot -->
            ${(isRunning && clampedProgress > 0) ? `
                <circle 
                    cx="${dotX.toFixed(2)}" 
                    cy="${dotY.toFixed(2)}" 
                    r="5.2" 
                    fill="#FFFFFF" 
                    stroke="${ringColor}" 
                    stroke-width="2.5" 
                />
            ` : ''}
        </svg>
    `;

    const topDigits = isRunning ? mStr : isExpired ? '00' : `${Math.round(totalDuration / 60)}`;
    const bottomDigits = isRunning ? sStr : isExpired ? '00' : '00';

    return (
        <OverlapWidget
            style={{
                width: 'match_parent',
                height: 'match_parent',
            }}
        >
            {/* 🌟 1. Light Aurora Gradient Background */}
            <SvgWidget svg={backgroundGradientSvg} style={{ width: 'match_parent', height: 'match_parent' }} />

            {/* 🌟 2. Content Container: Ring on LEFT, Text/Buttons on RIGHT */}
            <FlexWidget
                style={{
                    width: 'match_parent',
                    height: 'match_parent',
                    padding: 10,
                    flexDirection: 'row', // Strict LTR placement
                    alignItems: 'center',
                }}
            >
                {/* 👈 LEFT: THICK TIMER RING */}
                <OverlapWidget
                    style={{
                        width: 110,
                        height: 110,
                    }}
                >
                    <SvgWidget svg={ringSvg} style={{ width: 110, height: 110 }} />

                    <FlexWidget
                        style={{
                            width: 110,
                            height: 110,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {isSafe ? (
                            <FlexWidget style={{ alignItems: 'center', justifyContent: 'center' }}>
                                <TextWidget text="😊" style={{ fontSize: 24 }} />
                                <TextWidget
                                    text="آمن"
                                    style={{
                                        fontSize: 11,
                                        fontFamily: 'Tajawal-Bold',
                                        color: accentColor,
                                        marginTop: 2,
                                    }}
                                />
                            </FlexWidget>
                        ) : (
                            <FlexWidget style={{ alignItems: 'center', justifyContent: 'center' }}>
                                {/* Minutes (Deep Wathiq Green) */}
                                <TextWidget
                                    text={topDigits}
                                    style={{
                                        fontSize: 30,
                                        fontFamily: 'Tajawal-ExtraBold',
                                        color: isExpired ? '#D94A4F' : '#18352D',
                                        lineHeight: 31,
                                    }}
                                />

                                {/* Accent Separator */}
                                <FlexWidget
                                    style={{
                                        width: 14,
                                        height: 2,
                                        borderRadius: 1,
                                        backgroundColor: isExpired ? '#D94A4F' : accentColor,
                                        marginVertical: 2,
                                    }}
                                />

                                {/* Seconds (Dynamic Accent) */}
                                <TextWidget
                                    text={bottomDigits}
                                    style={{
                                        fontSize: 19,
                                        fontFamily: 'Tajawal-Bold',
                                        color: isExpired ? '#D94A4F' : accentColor,
                                        lineHeight: 20,
                                    }}
                                />
                            </FlexWidget>
                        )}
                    </FlexWidget>
                </OverlapWidget>

                {/* 👉 RIGHT: INFO & CONTROLS */}
                <FlexWidget
                    style={{
                        flex: 1,
                        height: 'match_parent',
                        justifyContent: 'space-between',
                        paddingLeft: 12,
                        paddingVertical: 2,
                    }}
                >
                    {/* Header: Title on right, UV on left */}
                    <FlexWidget
                        style={{
                            width: 'match_parent',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        {/* UV Indicator */}
                        <TextWidget
                            text={`UV ${isEstimated ? '~' : ''}${uvLevel}`}
                            style={{
                                fontSize: 13.5,
                                fontFamily: 'Tajawal-ExtraBold',
                                color: accentColor,
                            }}
                        />

                        {/* Title (Deep Wathiq Green) */}
                        <TextWidget
                            text="مؤقت وثيق"
                            style={{
                                fontSize: 14,
                                fontFamily: 'Tajawal-ExtraBold',
                                color: '#18352D',
                            }}
                        />
                    </FlexWidget>

                    {/* Status (Medium Forest Green) */}
                    <FlexWidget
                        style={{
                            width: 'match_parent',
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                        }}
                    >
                        <TextWidget
                            text={twoWordStatus}
                            style={{
                                fontSize: 12.5,
                                fontFamily: 'Tajawal-Bold',
                                color: isExpired ? '#D94A4F' : isRunning ? '#1C9A66' : '#4A6B5F',
                            }}
                        />
                    </FlexWidget>

                    {/* Action CTA Button */}
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
                                color: buttonTextColor,
                                fontSize: 12.5,
                                fontFamily: 'Tajawal-Bold',
                            }}
                        />
                    </FlexWidget>
                </FlexWidget>
            </FlexWidget>
        </OverlapWidget>
    );
};