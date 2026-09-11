// src/components/profile/analysis/AnalysisShared.js
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { useRTL } from '../../../hooks/useRTL';
import { useCurrentLanguage } from '../../../hooks/useCurrentLanguage';

export const LockedComponentOverlay = ({
    title,
    subtitle,
    buttonText,
    iconName = 'lock',
    onPress,
    borderRadius = 24,
}) => {
    const { colors: COLORS } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL } = useRTL();

    const resolvedTitle = title || (isRTL ? 'أضيفي منتجاتك' : 'Add Your Products');
    const resolvedBtnText = buttonText || (isRTL ? 'أضيفي منتجاً الآن' : 'Add a Product');

    return (
        <View style={[
            sharedOverlayStyles.overlayContainer,
            {
                borderRadius,
                backgroundColor: COLORS.background ? (COLORS.background + 'E6') : 'rgba(15, 23, 42, 0.88)',
            }
        ]}>
            <View style={sharedOverlayStyles.glassBox}>
                <View style={[
                    sharedOverlayStyles.iconCircle,
                    {
                        backgroundColor: COLORS.accentGreen + '20',
                        borderColor: COLORS.accentGreen + '44',
                    }
                ]}>
                    <FontAwesome5 name={iconName} size={20} color={COLORS.accentGreen} />
                </View>

                <Text style={[sharedOverlayStyles.title, { color: COLORS.textPrimary }]}>
                    {resolvedTitle}
                </Text>

                {subtitle ? (
                    <Text style={[sharedOverlayStyles.subtitle, { color: COLORS.textSecondary }]}>
                        {subtitle}
                    </Text>
                ) : null}

                <Pressable
                    onPress={() => {
                        Haptics.selectionAsync();
                        if (onPress) onPress();
                    }}
                    style={({ pressed }) => [
                        sharedOverlayStyles.ctaBtn,
                        {
                            backgroundColor: COLORS.accentGreen,
                            opacity: pressed ? 0.85 : 1,
                        }
                    ]}
                >
                    <FontAwesome5 name="plus" size={11} color={COLORS.textOnAccent || '#FFFFFF'} style={{ marginEnd: 6 }} />
                    <Text style={[sharedOverlayStyles.ctaText, { color: COLORS.textOnAccent || '#FFFFFF' }]}>
                        {resolvedBtnText}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

const sharedOverlayStyles = StyleSheet.create({
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    glassBox: {
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingVertical: 18,
        gap: 6,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        marginBottom: 4,
    },
    title: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        opacity: 0.85,
    },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 6,
    },
    ctaText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
    },
});

export const PressableScale = ({ onPress, children, style, disabled, onLongPress, delay = 0 }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const pressScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(scale, {
            toValue: 1, duration: 400, delay: delay,
            easing: Easing.out(Easing.cubic), useNativeDriver: true
        }).start();
    }, []);

    const pressIn = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
    };

    const pressOut = () => {
        Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
    };

    return (
        <Pressable
            onPress={() => { Haptics.selectionAsync(); if (onPress) onPress(); }}
            onLongPress={() => { if (onLongPress) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onLongPress(); } }}
            onPressIn={pressIn} onPressOut={pressOut} disabled={disabled} style={style}
        >
            <Animated.View style={[{ transform: [{ scale: Animated.multiply(scale, pressScale) }] }, style?.flex && { flex: style.flex }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

export const ContentCard = ({ children, style, onPress, disabled = false, delay = 0, animated = true }) => {
    const { colors: COLORS } = useTheme();
    const scale = useRef(new Animated.Value(animated ? 0.95 : 1)).current;
    const opacity = useRef(new Animated.Value(animated ? 0 : 1)).current;

    useEffect(() => {
        if (animated) {
            Animated.parallel([
                Animated.spring(scale, { toValue: 1, friction: 12, tension: 40, delay, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 200, delay, useNativeDriver: true })
            ]).start();
        }
    }, []);

    const content = (
        <View style={[{ backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 20, marginBottom: 15 }, style]}>
            <Animated.View style={{ opacity }}>{children}</Animated.View>
        </View>
    );

    if (onPress) {
        return (
            <Pressable onPress={() => { Haptics.selectionAsync(); onPress(); }} disabled={disabled}>
                <Animated.View style={{ transform: [{ scale }] }}>{content}</Animated.View>
            </Pressable>
        );
    }
    return <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>{content}</Animated.View>;
};

export const StaggeredItem = ({ index, children, style, animated = true }) => {
    const translateY = useRef(new Animated.Value(animated ? 20 : 0)).current;
    const opacity = useRef(new Animated.Value(animated ? 0 : 1)).current;

    useEffect(() => {
        if (animated) {
            Animated.parallel([
                Animated.timing(translateY, { toValue: 0, duration: 200, delay: index * 30, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 250, delay: index * 30, useNativeDriver: true })
            ]).start();
        }
    }, []);

    return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
};

export const ChartRing = ({ percentage, radius = 45, strokeWidth = 8, color }) => {
    const { colors: COLORS } = useTheme();
    const activeColor = color || COLORS.primary;
    const animatedValue = useRef(new Animated.Value(0)).current;
    const circumference = 2 * Math.PI * radius;
    const [displayPercentage, setDisplayPercentage] = useState(0);
    const rotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 4000, easing: Easing.linear, useNativeDriver: true })).start();
        Animated.timing(animatedValue, { toValue: percentage, duration: 1500, easing: Easing.out(Easing.exp), useNativeDriver: false }).start();

        const listener = animatedValue.addListener(({ value }) => { setDisplayPercentage(Math.round(value)); });
        return () => animatedValue.removeListener(listener);
    }, [percentage]);

    const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;

    return (
        <View style={{ width: radius * 2, height: radius * 2, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={radius * 2} height={radius * 2} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={radius} cy={radius} r={radius - strokeWidth / 2} stroke={COLORS.textPrimary + '0D'} strokeWidth={strokeWidth} fill="none" />
                <Circle
                    cx={radius} cy={radius} r={radius - strokeWidth / 2}
                    stroke={activeColor} strokeWidth={strokeWidth} fill="none"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </Svg>
            <Animated.View style={{ position: 'absolute', width: radius * 2, height: radius * 2, borderRadius: radius, backgroundColor: activeColor, opacity: 0.1, transform: [{ scale: rotation.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.1, 1] }) }] }} />
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ color: activeColor, fontFamily: 'Tajawal-Bold', fontSize: 20 }}>{displayPercentage}%</Text>
            </View>
        </View>
    );
};