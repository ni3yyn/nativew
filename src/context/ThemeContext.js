// ThemeContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const THEMES = {
    original: {
        id: 'original',
        label: 'theme_original',
        isDark: true,
        colors: {
            background: '#1A2D27',
            card: '#253D34',
            border: 'rgba(90, 156, 132, 0.3)',
            textPrimary: '#F1F3F2',
            textSecondary: '#A8B8B3',
            textDim: '#82948E',           // Improved contrast on dark green
            accentGreen: '#5A9C84',
            accentGlow: 'rgba(90, 156, 132, 0.4)',
            primary: '#A3E4D7',
            textOnAccent: '#1A2D27',      // Dark text on green accent buttons
            danger: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6',
            success: '#22C55E',
            gold: '#FBBF24',
            blue: '#3B82F6',
            purple: '#8B5CF6',
            inputBg: 'rgba(0, 0, 0, 0.25)'
        }
    },
    baby_pink: {
        id: 'baby_pink',
        label: 'theme_baby_pink',
        isDark: false,
        colors: {
            background: '#FFF0F4',       // Soft light pink background
            card: '#FFDFE7',             // Light card pink
            border: '#F2B0C4',           // Visible pink border
            textPrimary: '#4A1E2C',      // Deep Burgundy (High contrast on light pink)
            textSecondary: '#6B3B4C',    // Dark Muted Rose
            textDim: '#8A5263',          // Readable Dimmed Pink Text
            accentGreen: '#D93B72',      // Deep Rose Accent
            accentGlow: 'rgba(217, 59, 114, 0.35)', 
            primary: '#E25587',          
            textOnAccent: '#FFFFFF',     // White text on dark rose buttons
            danger: '#DC2626',           // Deep Red (Readable on pink)
            warning: '#D97706',          // Deep Amber (Readable on pink)
            info: '#0284C7',             // Sky Blue
            success: '#15803D',          // Deep Emerald Green (High contrast on pink)
            gold: '#C2410C',             // Deep Gold/Amber
            blue: '#0284C7',             // Deep Blue
            purple: '#6D28D9',           // Deep Purple
            inputBg: 'rgba(74, 30, 44, 0.08)' // Dark inset for text inputs
        }
    },
    clinical_blue: {
        id: 'clinical_blue',
        label: 'theme_clinical_blue',
        isDark: true,
        colors: {
            background: '#0B111A',       // Deep night blue
            card: '#15202E',             // Dark navy slate
            border: 'rgba(108, 180, 238, 0.2)',
            textPrimary: '#F0F6FC',      // Crisp light off-white
            textSecondary: '#94A3B8',    // Medium light slate
            textDim: '#8192A6',          // Readable dimmed slate
            accentGreen: '#6CB4EE',      // Soft Cyan/Azure
            accentGlow: 'rgba(108, 180, 238, 0.25)',
            primary: '#BBDDFB',          
            textOnAccent: '#0B111A',     // Dark text on azure buttons
            danger: '#EF4444',
            warning: '#FBBF24',
            info: '#38BDF8',
            success: '#34D399',
            gold: '#FBBF24',
            blue: '#60A5FA',
            purple: '#C084FC',
            inputBg: 'rgba(255, 255, 255, 0.06)'
        }
    }
};

export const ThemeProvider = ({ children }) => {
    const [themeId, setThemeId] = useState('original');

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