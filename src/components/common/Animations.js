import React, { useRef, useEffect } from 'react';
import { Animated, Pressable, Easing, View } from 'react-native';
import * as Haptics from 'expo-haptics';

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
            <Animated.View style={[{ transform: [{ scale: Animated.multiply(scale, pressScale) }] }, style?.flex && {flex: style.flex}]}>
                {children}
            </Animated.View>
        </Pressable>
    );
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

    return (
        <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
            {children}
        </Animated.View>
    );
};