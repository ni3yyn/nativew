import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const THEMES = {
    original: {
        id: 'original',
        label: 'أصلي (غابة)',
        colors: {
            // Background: Deep Jungle Gradient Base
            background: '#132A24', 
            
            // Aurora Blobs (Use these for your background absolute views)
            blob1: '#1F4D3E', // Deep Emerald
            blob2: '#2D5B50', // Soft Jungle
            blob3: '#0F221D', // Darker Depth
            
            // Glassmorphism UI (Transparent Dark Glass)
            card: 'rgba(37, 61, 52, 0.7)', 
            border: 'rgba(163, 228, 215, 0.1)', // Subtle Mint Rim
            inputBg: 'rgba(0, 0, 0, 0.3)',
            
            // Text & Accents
            textDim: '#8CA39C',
            accentGreen: '#5A9C84',
            accentGlow: 'rgba(90, 156, 132, 0.5)',
            primary: '#A3E4D7',
            textPrimary: '#F1F3F2',
            textSecondary: '#B4C5C0',
            textOnAccent: '#1A2D27',
            
            // Status Colors
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            success: '#22c55e',
            gold: '#fbbf24',
            blue: '#3B82F6',
            purple: '#8B5CF6'
        }
    },
    baby_pink: {
        id: 'baby_pink',
        label: 'وردي لطيف (Kawaii)',
        colors: {
            // Background: Soft Strawberry Milk
            background: '#FFF0F5', 

            // Aurora Blobs
            blob1: '#FFDEE9', // Cotton Candy
            blob2: '#B5FFFC', // Subtle Blue hint (Holo effect)
            blob3: '#FFC3A0', // Peach

            // Glassmorphism UI (Frosted White Glass)
            card: 'rgba(255, 255, 255, 0.65)', 
            border: 'rgba(255, 255, 255, 0.9)', // Strong White Rim
            inputBg: 'rgba(255, 255, 255, 0.5)',

            // Text & Accents
            textDim: '#CDBECA',
            accentGreen: '#FF9EB5', // Soft Pink
            accentGlow: 'rgba(255, 158, 181, 0.4)',
            primary: '#FFB7C5',
            textPrimary: '#5D4037', // Warm Cocoa
            textSecondary: '#9A7D84',
            textOnAccent: '#FFFFFF',

            // Status Colors
            danger: '#FF6B6B',
            warning: '#FFCC00',
            info: '#5AC8FA',
            success: '#69F0AE',
            gold: '#FFD700',
            blue: '#5AC8FA',
            purple: '#E0BBE4'
        }
    },
    clinical_blue: {
        id: 'clinical_blue',
        label: 'طبي حديث (أزرق)',
        colors: {
            // Background: Sterile Ice
            background: '#F0F9FF', 

            // Aurora Blobs
            blob1: '#BAE6FD', // Sky Blue
            blob2: '#E0F2FE', // Ice White
            blob3: '#A5F3FC', // Cyan Glow

            // Glassmorphism UI (Clear Ice Glass)
            card: 'rgba(255, 255, 255, 0.70)', 
            border: 'rgba(255, 255, 255, 0.8)', // Icy Rim
            inputBg: 'rgba(224, 242, 254, 0.3)',

            // Text & Accents
            textDim: '#94A3B8',
            accentGreen: '#0EA5E9', // Clinical Blue
            accentGlow: 'rgba(14, 165, 233, 0.3)',
            primary: '#38BDF8',
            textPrimary: '#0F172A', // Dark Slate
            textSecondary: '#475569',
            textOnAccent: '#FFFFFF',

            // Status Colors
            danger: '#F43F5E',
            warning: '#F59E0B',
            info: '#06B6D4',
            success: '#10B981',
            gold: '#F59E0B',
            blue: '#3B82F6',
            purple: '#8B5CF6'
        }
    }
};

export const ThemeProvider = ({ children }) => {
    const [themeId, setThemeId] = useState('original');

    // Derived state
    const theme = THEMES[themeId] || THEMES.original;

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const saved = await AsyncStorage.getItem('app_theme_id');
            if (saved && THEMES[saved]) {
                setThemeId(saved);
            }
        } catch (e) {
            console.log('Failed to load theme', e);
        }
    };

    const changeTheme = async (id) => {
        if (THEMES[id]) {
            setThemeId(id);
            try {
                await AsyncStorage.setItem('app_theme_id', id);
            } catch (e) {
                console.log('Failed to save theme', e);
            }
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, colors: theme.colors, activeThemeId: themeId, changeTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);