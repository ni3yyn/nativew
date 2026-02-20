import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Rect, BackdropBlur, Fill, rrect } from '@shopify/react-native-skia';
import { useTheme } from '../../context/ThemeContext'; // Your theme context

const RealGlass = ({ children, style, intensity = 15, borderRadius = 22 }) => {
    const { colors, activeThemeId } = useTheme();
    
    // 1. Determine Tint based on theme
    const isDark = activeThemeId === 'original' || activeThemeId === 'clinical_blue';
    const tintColor = isDark 
        ? 'rgba(19, 42, 36, 0.65)'  // Dark Jungle tint
        : 'rgba(255, 255, 255, 0.6)'; // White Mist tint

    return (
        <View style={[styles.container, style]}>
            {/* 
               SKIA CANVAS: This is the magic layer.
               It sits ABSOLUTELY behind your content but INSIDE this view.
            */}
            <Canvas style={StyleSheet.absoluteFill}>
                {/* 
                   1. Define the area (Rounded Rectangle) 
                   2. Apply BackdropBlur to everything BEHIND this area
                   3. Fill it with a semi-transparent color (Tint)
                */}
                <Rect
                    x={0} 
                    y={0} 
                    width="100%" 
                    height="100%" 
                    color="transparent"
                >
                    <BackdropBlur blur={intensity} />
                    <Fill color={tintColor} />
                </Rect>
            </Canvas>

            {/* 
               BORDER LAYER: 
               Skia can do borders too, but a simple absolute View is often cleaner 
               for simple 1px borders.
            */}
            <View 
                style={[
                    StyleSheet.absoluteFill, 
                    { 
                        borderRadius: borderRadius,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.2)',
                    }
                ]} 
                pointerEvents="none" 
            />

            {/* ACTUAL CONTENT */}
            <View style={{ zIndex: 10 }}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 22,
        overflow: 'hidden', // Clips the Skia Canvas to the radius
        position: 'relative',
    },
});

export default RealGlass;