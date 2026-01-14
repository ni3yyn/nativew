import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

const SortTabs = ({ currentSort, onSelect }) => {
    // 0 = Popular (Left), 1 = Recent (Right)
    // We default to 1 because 'recent' is the default view
    const animationValue = useRef(new Animated.Value(currentSort === 'recent' ? 1 : 0)).current;
    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
        // Animate based on selection
        // In our logical layout (Left=0, Right=1)
        const toValue = currentSort === 'recent' ? 1 : 0;
        
        Animated.spring(animationValue, {
            toValue,
            stiffness: 150,
            damping: 20,
            mass: 1,
            useNativeDriver: true,
        }).start();
    }, [currentSort]);

    // Interpolate the slide position based on container width
    const translateX = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [2, (containerWidth / 2) - 2] // Slight padding (2px) for floating effect
    });

    return (
        <View style={styles.outerContainer}>
            <View 
                style={styles.innerContainer} 
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
                {/* --- THE SLIDING INDICATOR --- */}
                <Animated.View 
                    style={[
                        styles.indicator, 
                        { 
                            width: (containerWidth / 2) - 4, // Half width minus padding
                            transform: [{ translateX }] 
                        }
                    ]} 
                />

                {/* --- POPULAR TAB (Left Side Physically) --- */}
                <TouchableOpacity 
                    style={styles.tabItem} 
                    onPress={() => onSelect('popular')}
                    activeOpacity={0.8}
                >
                    <View style={styles.tabContent}>
                        <Feather 
                            name="trending-up" 
                            size={14} 
                            color={currentSort === 'popular' ? COLORS.textOnAccent : COLORS.textSecondary} 
                        />
                        <Text style={[
                            styles.tabText, 
                            currentSort === 'popular' ? styles.textActive : styles.textInactive
                        ]}>
                            الأكثر تفاعلا
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* --- RECENT TAB (Right Side Physically) --- */}
                <TouchableOpacity 
                    style={styles.tabItem} 
                    onPress={() => onSelect('recent')}
                    activeOpacity={0.8}
                >
                    <View style={styles.tabContent}>
                        <Feather 
                            name="clock" 
                            size={14} 
                            color={currentSort === 'recent' ? COLORS.textOnAccent : COLORS.textSecondary} 
                        />
                        <Text style={[
                            styles.tabText, 
                            currentSort === 'recent' ? styles.textActive : styles.textInactive
                        ]}>
                            الأحدث
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        backgroundColor: COLORS.background,
        zIndex: 10,
    },
    innerContainer: {
        flexDirection: 'row', // Standard row, we manage order manually
        backgroundColor: COLORS.card,
        height: 40,
        borderRadius: 12,
        position: 'relative', // For absolute indicator
        padding: 2, // Internal padding for the indicator
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    indicator: {
        position: 'absolute',
        top: 2,
        bottom: 2,
        left: 0,
        backgroundColor: COLORS.accentGreen,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    tabItem: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2, // Sit above indicator
    },
    tabContent: {
        flexDirection: 'row-reverse', // Icon and text alignment
        alignItems: 'center',
        gap: 6,
    },
    tabText: {
        fontSize: 12,
        marginBottom: 2, 
    },
    textActive: {
        fontFamily: 'Tajawal-Bold',
        color: COLORS.textOnAccent,
    },
    textInactive: {
        fontFamily: 'Tajawal-Regular',
        color: COLORS.textSecondary,
    }
});

export default SortTabs;