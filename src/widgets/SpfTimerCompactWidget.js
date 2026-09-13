// src/widgets/SpfTimerCompactWidget.js
import React from 'react';
import { FlexWidget, TextWidget, SvgWidget, OverlapWidget } from 'react-native-android-widget';

export const SpfTimerCompactWidget = ({
    uvLevel = 8.5,
    isEstimated = false,
    timerState = 'idle',
    remainingSeconds = 0,
    totalDuration = 75 * 60,
    accentColor = '#CC8A1A',
}) => {
    const isSafe = timerState === 'safe';
    const isExpired = timerState === 'expired';
    const isRunning = timerState === 'running';

    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    const mStr = `${m < 10 ? '0' : ''}${m}`;
    const sStr = `${s < 10 ? '0' : ''}${s}`;

    const progress = totalDuration > 0 ? remainingSeconds / totalDuration : 0;
    const clampedProgress = Math.max(0, Math.min(1, progress));

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

    const ringColor = isExpired ? '#D94A4F' : accentColor;
    const radius = 38;
    const cx = 48;
    const cy = 48;
    const circumference = 238.76;
    const strokeDashoffset = circumference * (1 - (isRunning ? clampedProgress : isExpired ? 0 : 1));

    const angle = clampedProgress * 2 * Math.PI - Math.PI / 2;
    const dotX = cx + radius * Math.cos(angle);
    const dotY = cy + radius * Math.sin(angle);

    const backgroundGradientSvg = `
        <svg width="100%" height="100%">
            <defs>
                <linearGradient id="compactGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#F5FAF5" />
                    <stop offset="55%" stop-color="#EAF3EA" />
                    <stop offset="100%" stop-color="#D4ECE0" />
                </linearGradient>
            </defs>
            <rect width="100%" height="100%" rx="24" fill="url(#compactGrad)" stroke="rgba(39, 103, 81, 0.15)" stroke-width="1" />
        </svg>
    `;

    const ringSvg = `
        <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="${cx}" cy="${cy}" r="${radius}" stroke="rgba(24, 53, 45, 0.09)" stroke-width="8.5" fill="none" />

            ${(isRunning || timerState === 'idle') ? `
                <circle
                    cx="${cx}" cy="${cy}" r="${radius}"
                    stroke="${ringColor}"
                    stroke-width="8.5"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${strokeDashoffset}"
                    stroke-linecap="round"
                    fill="none"
                    transform="rotate(-90 ${cx} ${cy})"
                />
            ` : isExpired ? `
                <circle
                    cx="${cx}" cy="${cy}" r="${radius}"
                    stroke="#D94A4F"
                    stroke-width="8.5"
                    fill="none"
                />
            ` : ''}

            ${(isRunning && clampedProgress > 0) ? `
                <circle
                    cx="${dotX.toFixed(2)}"
                    cy="${dotY.toFixed(2)}"
                    r="4.5"
                    fill="#FFFFFF"
                    stroke="${ringColor}"
                    stroke-width="2"
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
            <SvgWidget svg={backgroundGradientSvg} style={{ width: 'match_parent', height: 'match_parent' }} />

            <FlexWidget
                style={{
                    width: 'match_parent',
                    height: 'match_parent',
                    padding: 10,
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                {/* Header */}
                <FlexWidget
                    style={{
                        width: 'match_parent',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <TextWidget
                        text={`UV ${isEstimated ? '~' : ''}${uvLevel}`}
                        style={{
                            fontSize: 12,
                            fontFamily: 'Tajawal-ExtraBold',
                            color: accentColor,
                        }}
                    />
                    <TextWidget
                        text="مؤقت وثيق"
                        style={{
                            fontSize: 12.5,
                            fontFamily: 'Tajawal-ExtraBold',
                            color: '#18352D',
                        }}
                    />
                </FlexWidget>

                {/* Centered Gauge */}
                <OverlapWidget
                    style={{
                        width: 96,
                        height: 96,
                    }}
                >
                    <SvgWidget svg={ringSvg} style={{ width: 96, height: 96 }} />

                    <FlexWidget
                        style={{
                            width: 96,
                            height: 96,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {isSafe ? (
                            <FlexWidget style={{ alignItems: 'center', justifyContent: 'center' }}>
                                <TextWidget text="😊" style={{ fontSize: 22 }} />
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
                                <TextWidget
                                    text={topDigits}
                                    style={{
                                        fontSize: 27,
                                        fontFamily: 'Tajawal-ExtraBold',
                                        color: isExpired ? '#D94A4F' : '#18352D',
                                        lineHeight: 28,
                                    }}
                                />

                                <FlexWidget
                                    style={{
                                        width: 12,
                                        height: 2,
                                        borderRadius: 1,
                                        backgroundColor: isExpired ? '#D94A4F' : accentColor,
                                        marginVertical: 1,
                                    }}
                                />

                                <TextWidget
                                    text={bottomDigits}
                                    style={{
                                        fontSize: 17,
                                        fontFamily: 'Tajawal-Bold',
                                        color: isExpired ? '#D94A4F' : accentColor,
                                        lineHeight: 18,
                                    }}
                                />
                            </FlexWidget>
                        )}
                    </FlexWidget>
                </OverlapWidget>

                {/* Compact Button */}
                <FlexWidget
                    clickAction="ACTION_TOGGLE_SPF_TIMER"
                    style={{
                        backgroundColor: buttonBg,
                        borderRadius: 10,
                        width: 'match_parent',
                        height: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <TextWidget
                        text={buttonText}
                        style={{
                            color: buttonTextColor,
                            fontSize: 11.5,
                            fontFamily: 'Tajawal-Bold',
                        }}
                    />
                </FlexWidget>
            </FlexWidget>
        </OverlapWidget>
    );
};