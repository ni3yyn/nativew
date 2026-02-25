import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const THEMES = {
    original: {
        id: 'original',
        label: 'أصلي (غابة)',
        colors: {
            background: '#1A2D27',
            card: '#253D34',
            border: 'rgba(90, 156, 132, 0.25)',
            textDim: '#6B7C76',
            accentGreen: '#5A9C84',
            accentGlow: 'rgba(90, 156, 132, 0.4)',
            primary: '#A3E4D7',
            textPrimary: '#F1F3F2',
            textSecondary: '#A3B1AC',
            textOnAccent: '#1A2D27',
            danger: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6',
            success: '#22c55e',
            gold: '#fbbf24',
            blue: '#3B82F6',
            purple: '#8B5CF6',
            inputBg: 'rgba(0,0,0,0.2)'
        }
    },
    baby_pink: {
        id: 'baby_pink',
        label: 'وردي بناتي (Macaron Pink)',
        colors: {
            background: '#FFEBF0',       
            card: '#FFD9E4',             
            border: '#FFB3C6',           
            textDim: '#B38A9A',          
            accentGreen: '#FF6B9E',      
            accentGlow: 'rgba(255, 107, 158, 0.35)', 
            primary: '#FFA6C9',          
            textPrimary: '#592B3C',      
            textSecondary: '#8C5C6F',    
            textOnAccent: '#FFFFFF',     
            // --- UPDATED COLORS BELOW ---
            danger: '#E11D48',    // Stronger Red
            warning: '#D97706',   // Deep Amber (visible on light pink)
            info: '#0284C7',      // Deep Sky Blue (WAS #7DD3FC)
            success: '#059669',   // Deep Emerald Green (WAS #6EE7B7)
            gold: '#B45309',      // Deep Gold
            blue: '#0284C7',      // Deep Blue
            purple: '#7E22CE',    // Deep Purple
            inputBg: 'rgba(255, 107, 158, 0.12)' 
        }
    },
    clinical_blue: {
        id: 'clinical_blue',
        label: 'أزرق ليلي (Midnight Ocean)',
        colors: {
            background: '#0B111A',       // Very deep, dark night-sky blue
            card: '#151F2E',             // Dark navy slate for cards
            border: 'rgba(108, 180, 238, 0.15)', // Subtle blue border
            textDim: '#64748B',          // Dimmed slate
            accentGreen: '#6CB4EE',      // Soft, relaxing azure/cyan 
            accentGlow: 'rgba(108, 180, 238, 0.25)',
            primary: '#BBDDFB',          // Soft pastel blue
            textPrimary: '#E2E8F0',      // Soft off-white with a cool blue tint
            textSecondary: '#94A3B8',    // Medium slate grey
            textOnAccent: '#0B111A',     // Dark text on the blue buttons
            danger: '#F87171',
            warning: '#FBBF24',
            info: '#38BDF8',
            success: '#34D399',
            gold: '#FBBF24',
            blue: '#60A5FA',
            purple: '#A78BFA',
            inputBg: 'rgba(0,0,0,0.3)'   // Dark inset for text inputs
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
