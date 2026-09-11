import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions,
    Animated, Easing, StatusBar, FlatList, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

const { width, height } = Dimensions.get('window');

// --- 1. THEME-AWARE DATA GENERATOR ---
const getSlides = (COLORS, isDark) => [
    {
        id: 'welcome',
        icon: "users",
        color: COLORS.primary,
        bgGradient: isDark
            ? [COLORS.background, '#14532D']
            : [COLORS.background, COLORS.surfaceGreen || '#DCEFE5']
    },
    {
        id: 'match',
        icon: "fingerprint",
        color: COLORS.blue || '#3F7FB8',
        bgGradient: isDark
            ? [COLORS.background, '#172554']
            : [COLORS.background, '#E0ECF8']
    },
    {
        id: 'review',
        icon: "star",
        color: COLORS.accentGreen,
        bgGradient: isDark
            ? [COLORS.background, '#064E3B']
            : [COLORS.background, '#D8EFE4']
    },
    {
        id: 'journey',
        icon: "hourglass-half",
        color: COLORS.gold || '#BF8F20',
        bgGradient: isDark
            ? [COLORS.background, '#451a03']
            : [COLORS.background, '#F7F2E2']
    },
    {
        id: 'qa_routine',
        icon: "clipboard-check",
        color: COLORS.purple || '#6F58B8',
        bgGradient: isDark
            ? [COLORS.background, '#2e1065']
            : [COLORS.background, '#ECE7F8']
    }
];

const getSlideContent = (id, language) => ({
    title: t(`community_intro_${id}_title`, language),
    subtitle: t(`community_intro_${id}_subtitle`, language),
    desc: t(`community_intro_${id}_desc`, language),
});

// --- 2. COMPONENTS ---

const AnimatedBackground = ({ scrollX, slides }) => {
    return (
        <View style={StyleSheet.absoluteFill}>
            {slides.map((slide, i) => {
                const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0, 1, 0],
                    extrapolate: 'clamp'
                });
                return (
                    <Animated.View key={slide.id} style={[StyleSheet.absoluteFill, { opacity }]}>
                        <LinearGradient
                            colors={slide.bgGradient}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                        />
                    </Animated.View>
                );
            })}
        </View>
    );
};

// Continuous Smooth Gesture Animation
const SwipeHint = ({ language, colors }) => {
    const translateX = useRef(new Animated.Value(20)).current; // Start right
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = Animated.loop(
            Animated.sequence([
                // Fade In & Move Left (Simulate Swipe)
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                    Animated.timing(translateX, { toValue: -20, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true })
                ]),
                // Fade Out & Continue Left slightly
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
                    Animated.timing(translateX, { toValue: -40, duration: 600, useNativeDriver: true })
                ]),
                // Reset instantly
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
                    Animated.timing(translateX, { toValue: 20, duration: 0, useNativeDriver: true })
                ])
            ])
        );
        animate.start();
        return () => animate.stop();
    }, []);

    return (
        <View style={staticStyles.swipeHintContainer}>
            <Animated.View style={{ transform: [{ translateX }], opacity }}>
                <MaterialCommunityIcons name="gesture-swipe-horizontal" size={40} color={colors.textDim} />
            </Animated.View>
            <Text style={[staticStyles.swipeText, { color: colors.textDim }]}>{t('community_intro_swipe_next', language)}</Text>
        </View>
    );
};

// --- 3. MAIN COMPONENT ---
const CommunityIntro = ({ visible, onClose }) => {
    const { theme, colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const isDark = theme ? theme.isDark : false;

    const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);
    const slides = useMemo(() => getSlides(COLORS, isDark), [COLORS, isDark]);

    const language = useCurrentLanguage();
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(true); // Default to hiding it in the future

    // Orbit Animation
    const rotateAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateAnim, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })
        ).start();
    }, []);

    const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const reverseSpin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

    const handleFinish = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (dontShowAgain) {
            await AsyncStorage.setItem('has_seen_community_intro', 'true');
        }
        onClose();
    };

    const renderItem = ({ item, index }) => {
        const slideContent = getSlideContent(item.id, language);
        // Parallax effect for content inside the slide
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

        const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1, 0.8],
            extrapolate: 'clamp'
        });

        const translateX = scrollX.interpolate({
            inputRange,
            outputRange: [width * 0.3, 0, -width * 0.3], // Subtle parallax
            extrapolate: 'clamp'
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp'
        });

        return (
            <View style={{ width, alignItems: 'center', paddingHorizontal: 30 }}>
                {/* Central Visual */}
                <View style={styles.visualContainer}>
                    {/* Orbit Rings */}
                    <Animated.View style={[
                        styles.orbitRing,
                        {
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : COLORS.border,
                            transform: [{ rotate: spin }, { scale }]
                        }
                    ]}>
                        <View style={[styles.orbitDot, { top: -4, backgroundColor: item.color }]} />
                        <View style={[styles.orbitDot, { bottom: -4, backgroundColor: item.color }]} />
                    </Animated.View>
                    <Animated.View style={[
                        styles.orbitRing,
                        {
                            width: 200,
                            height: 200,
                            borderRadius: 100,
                            borderColor: isDark ? 'rgba(255,255,255,0.15)' : COLORS.border,
                            transform: [{ rotate: reverseSpin }, { scale }]
                        }
                    ]}>
                        <View style={[styles.orbitDot, { left: -4, backgroundColor: item.color }]} />
                    </Animated.View>

                    {/* Icon */}
                    <Animated.View style={[
                        styles.iconCore,
                        {
                            backgroundColor: isDark ? item.color + '20' : COLORS.card,
                            borderColor: item.color,
                            transform: [{ scale }]
                        }
                    ]}>
                        <FontAwesome5 name={item.icon} size={50} color={item.color} />
                    </Animated.View>
                </View>

                {/* Text Content */}
                <Animated.View style={[styles.textWrapper, { transform: [{ translateX }], opacity }]}>
                    <View style={[styles.subtitleBadge, { borderColor: item.color + '50', backgroundColor: item.color + '15' }]}>
                        <Text style={[styles.subtitle, { color: item.color }]}>{slideContent.subtitle}</Text>
                    </View>

                    <Text style={styles.title}>{slideContent.title}</Text>
                    <View style={styles.divider} />
                    <Text style={styles.desc}>{slideContent.desc}</Text>
                </Animated.View>
            </View>
        );
    };

    // Calculate opacity for the "Join" button based on scrolling to the last slide
    const lastIndex = slides.length - 1;
    const buttonOpacity = scrollX.interpolate({
        inputRange: [(lastIndex - 1) * width, lastIndex * width],
        outputRange: [0, 1],
        extrapolate: 'clamp'
    });

    // Invert opacity for the hint
    const hintOpacity = scrollX.interpolate({
        inputRange: [(lastIndex - 1) * width, lastIndex * width],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });

    // Translate the button up as it fades in
    const buttonTranslateY = scrollX.interpolate({
        inputRange: [(lastIndex - 1) * width, lastIndex * width],
        outputRange: [20, 0],
        extrapolate: 'clamp'
    });

    if (!visible) return null;

    return (
        <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true} // Allows content to draw under status bar
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <StatusBar
                    barStyle={isDark ? "light-content" : "dark-content"}
                    backgroundColor="transparent"
                    translucent={true}
                />

                {/* Background */}
                <AnimatedBackground scrollX={scrollX} slides={slides} />

                <SafeAreaView style={{ flex: 1 }}>
                    {/* Header Skip */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
                            <Text style={styles.skipText}>{t('community_intro_skip', language)}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Slides */}
                    <Animated.FlatList
                        horizontal
                        pagingEnabled
                        data={slides}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        showsHorizontalScrollIndicator={false}
                        bounces={false} // Prevents overscroll feel
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                            { useNativeDriver: true }
                        )}
                        onMomentumScrollEnd={(ev) => {
                            const newIndex = Math.round(ev.nativeEvent.contentOffset.x / width);
                            setCurrentIndex(newIndex);
                        }}
                        scrollEventThrottle={16}
                        style={{ flex: 1 }}
                    />

                    {/* Footer */}
                    <View style={styles.footer}>

                        {/* Pagination Dots */}
                        <View style={styles.pagination}>
                            {slides.map((_, index) => {
                                const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

                                const dotScale = scrollX.interpolate({
                                    inputRange,
                                    outputRange: [1, 2.5, 1], // Expands the dot
                                    extrapolate: 'clamp'
                                });

                                const dotOpacity = scrollX.interpolate({
                                    inputRange,
                                    outputRange: [0.3, 1, 0.3],
                                    extrapolate: 'clamp'
                                });

                                return (
                                    <Animated.View
                                        key={index}
                                        style={[
                                            styles.dot,
                                            { opacity: dotOpacity, transform: [{ scaleX: dotScale }] }
                                        ]}
                                    />
                                );
                            })}
                        </View>

                        {/* Action Area: Cross-Fade between Hint and Button */}
                        <View style={styles.actionArea}>

                            {/* 1. Swipe Hint (Fades Out) */}
                            <Animated.View style={[styles.absoluteCenter, { opacity: hintOpacity }]}>
                                <SwipeHint language={language} colors={COLORS} />
                            </Animated.View>

                            {/* 2. Start Button (Fades In) */}
                            <Animated.View style={[
                                styles.absoluteCenter,
                                {
                                    opacity: buttonOpacity,
                                    transform: [{ translateY: buttonTranslateY }]
                                }
                            ]} pointerEvents={currentIndex === lastIndex ? 'auto' : 'none'}>
                                <TouchableOpacity
                                    style={styles.startBtn}
                                    onPress={handleFinish}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient
                                        colors={isDark ? ['#FFFFFF', '#E2E8F0'] : [COLORS.primary, COLORS.accentGreen]}
                                        style={styles.startBtnGradient}
                                    >
                                        <Text style={styles.startBtnText}>{t('community_intro_join', language)}</Text>
                                        <Ionicons 
                                            name="checkmark-circle" 
                                            size={24} 
                                            color={isDark ? '#1A2D27' : (COLORS.textOnAccent || '#FFFFFF')} 
                                        />
                                    </LinearGradient>
                                </TouchableOpacity>

                                {/* Don't Show Again Toggle */}
                                <TouchableOpacity
                                    style={styles.dontShowContainer}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setDontShowAgain(!dontShowAgain);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons
                                        name={dontShowAgain ? "checkbox-marked" : "checkbox-blank-outline"}
                                        size={20}
                                        color={dontShowAgain ? COLORS.accentGreen : COLORS.textDim}
                                    />
                                    <Text style={styles.dontShowText}>{t('community_intro_dont_show', language)}</Text>
                                </TouchableOpacity>
                            </Animated.View>

                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const createStyles = (COLORS, isDark) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        padding: 20,
    },
    skipBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        shadowColor: COLORS.textPrimary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.3 : 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    skipText: {
        fontFamily: 'Tajawal-Bold',
        color: COLORS.textSecondary,
        fontSize: 14,
    },

    // VISUAL
    visualContainer: {
        height: height * 0.4,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    orbitRing: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        borderWidth: 0.5,
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed'
    },
    orbitDot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        shadowColor: isDark ? "#FFF" : COLORS.textPrimary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.8 : 0.2,
        shadowRadius: isDark ? 10 : 3,
    },
    iconCore: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        shadowColor: isDark ? "#000" : COLORS.accentGreen,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.5 : 0.15,
        shadowRadius: isDark ? 30 : 15,
        elevation: isDark ? 20 : 8,
    },

    // TEXT
    textWrapper: {
        alignItems: 'center',
        height: height * 0.3,
        justifyContent: 'flex-start',
    },
    subtitleBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 0.5,
    },
    subtitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    title: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 30,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 15,
        lineHeight: 40
    },
    divider: {
        width: 60,
        height: 4,
        backgroundColor: COLORS.divider || COLORS.border,
        borderRadius: 2,
        marginBottom: 20,
    },
    desc: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
    },

    // FOOTER
    footer: {
        height: height * 0.22,
        justifyContent: 'space-between',
        paddingBottom: 40,
        alignItems: 'center',
    },
    pagination: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        height: 8,
        width: 8,
        borderRadius: 4,
        backgroundColor: isDark ? '#FFFFFF' : COLORS.accentGreen,
    },
    actionArea: {
        height: 60,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    absoluteCenter: {
        position: 'absolute',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Swipe Hint
    swipeHintContainer: {
        alignItems: 'center',
        gap: 5,
    },
    swipeText: {
        fontFamily: 'Tajawal-Regular',
        color: COLORS.textDim,
        fontSize: 12,
    },

    // Start Button
    startBtn: {
        borderRadius: 30,
        shadowColor: isDark ? "#000000" : COLORS.accentGreen,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: isDark ? 0.3 : 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    startBtnGradient: {
        flexDirection: 'row-reverse',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        alignItems: 'center',
        gap: 12,
    },
    startBtnText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        color: isDark ? '#1A2D27' : (COLORS.textOnAccent || '#FFFFFF')
    },
    dontShowContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginTop: 15,
        gap: 8,
        padding: 5
    },
    dontShowText: {
        fontFamily: 'Tajawal-Regular',
        color: COLORS.textDim,
        fontSize: 12,
    }
});

const staticStyles = StyleSheet.create({
    swipeHintContainer: {
        alignItems: 'center',
        gap: 5,
    },
    swipeText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
    },
});

export default CommunityIntro;