import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Animated, Keyboard, Easing } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

// --- SPORE PARTICLE ---
const SporeParticle = ({ animateTrigger }) => {
    const anim = useRef(new Animated.Value(0)).current;

    // Random direction for each spore
    const randomX = Math.random() * 60 - 30; // -30 to 30
    const randomY = Math.random() * -60 - 20; // Upwards -20 to -80

    useEffect(() => {
        if (animateTrigger) {
            anim.setValue(0);
            Animated.timing(anim, {
                toValue: 1,
                duration: 800,
                easing: Easing.out(Easing.exp),
                useNativeDriver: true
            }).start();
        }
    }, [animateTrigger]);

    if (!animateTrigger) return null;

    const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, randomX] });
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, randomY] });
    const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.8, 0] });
    const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

    return (
        <Animated.View style={[
            { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: DEFAULT_COLORS.accentGreen },
            { opacity, transform: [{ translateX }, { translateY }, { scale }] }
        ]} />
    );
};

const SearchFilterBar = ({ searchQuery, onSearchChange, isBioFilterActive, onToggleBioFilter }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const slideAnim = useRef(new Animated.Value(-20)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // Bio Button Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [sporeTrigger, setSporeTrigger] = useState(0); // Increments to trigger animation

    useEffect(() => {
        // 1. Entry Animation
        Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true })
        ]).start();

        // 2. Pulse Animation (Only when inactive to attract clicks)
        if (!isBioFilterActive) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1); // Reset if active
        }
    }, [isBioFilterActive]);

    const handleBioPress = () => {
        if (!isBioFilterActive) {
            setSporeTrigger(prev => prev + 1); // Trigger Spores
        }
        onToggleBioFilter();
    };

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>

            {/* Search Input */}
            <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={COLORS.textDim} style={{ marginLeft: 10 }} />
                <TextInput
                    style={styles.input}
                    placeholder="بحث عن تجربة، منتج، أو مشكلة..."
                    placeholderTextColor={COLORS.textDim}
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    textAlign="right"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => { onSearchChange(''); Keyboard.dismiss(); }}>
                        <Ionicons name="close-circle" size={18} color={COLORS.textDim} />
                    </TouchableOpacity>
                )}
            </View>

            {/* THE FLASHY BIO BUTTON */}
            <TouchableOpacity
                onPress={handleBioPress}
                activeOpacity={0.9}
                style={styles.bioButtonWrapper}
            >
                {/* Spores Layer */}
                <View style={[StyleSheet.absoluteFill, styles.sporesContainer]} pointerEvents="none">
                    {[...Array(6)].map((_, i) => <SporeParticle key={i} animateTrigger={sporeTrigger} />)}
                </View>

                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <LinearGradient
                        colors={[
                            String(isBioFilterActive ? COLORS.accentGreen : COLORS.card),
                            String(isBioFilterActive ? COLORS.accentGreen : COLORS.card) + (isBioFilterActive ? 'CC' : '')
                        ]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.bioButton,
                            isBioFilterActive ? styles.bioButtonActive : styles.bioButtonInactive
                        ]}
                    >
                        <FontAwesome5
                            name="fingerprint"
                            size={18}
                            color={isBioFilterActive ? '#FFF' : COLORS.accentGreen}
                        />
                        {isBioFilterActive && (
                            <Text style={styles.bioText}>مطابق لي</Text>
                        )}

                        {/* Notify Dot if Inactive */}
                        {!isBioFilterActive && (
                            <View style={styles.notifyDot} />
                        )}
                    </LinearGradient>
                </Animated.View>
            </TouchableOpacity>

        </Animated.View>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        paddingTop: 15,
        gap: 12,
        backgroundColor: COLORS.background,
        zIndex: 10,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    input: {
        flex: 1,
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textPrimary,
        marginHorizontal: 10,
        height: '100%',
    },

    // Bio Button Styles
    bioButtonWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20
    },
    bioButton: {
        height: 48,
        borderRadius: 16,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 0, // Dynamic width
    },
    bioButtonInactive: {
        width: 48,
        borderWidth: 1,
        borderColor: COLORS.accentGreen,
        shadowColor: COLORS.accentGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    bioButtonActive: {
        paddingHorizontal: 16,
        borderWidth: 0,
        shadowColor: COLORS.accentGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    bioText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: '#FFF',
    },
    notifyDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.gold,
    },

    // Spores
    sporesContainer: {
        position: 'absolute',
        width: 1,
        height: 1,
        top: 24, // Center of button
        left: 24,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: -1
    },
    spore: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.accentGreen,
    }
});

export default SearchFilterBar;