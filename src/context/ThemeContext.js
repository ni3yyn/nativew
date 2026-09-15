// ThemeContext.js

import React, {
    createContext,
    useState,
    useContext,
    useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform  } from 'react-native';

const ThemeContext = createContext();

export const THEMES = {

    // ============================================================
    // WATHIQ — ORIGINAL DARK
    // ============================================================

    original: {
        id: 'original',
        label: 'theme_original',
        isDark: true,

        colors: {
            background: '#1A2D27',
            card: '#253D34',
            border: 'rgba(90, 156, 132, 0.30)',

            textPrimary: '#F1F3F2',
            textSecondary: '#A8B8B3',
            textDim: '#82948E',

            accentGreen: '#5A9C84',
            accentGlow: 'rgba(90, 156, 132, 0.40)',

            primary: '#5A9C84',
            textOnAccent: '#1A2D27',

            danger: '#EF4444',
            warning: '#F59E0B',
            info: '#3B82F6',
            success: '#22C55E',

            gold: '#FBBF24',
            blue: '#3B82F6',
            purple: '#8B5CF6',

            inputBg: 'rgba(0, 0, 0, 0.25)',

            // Gradient support
            gradientStart: '#1A2D27',
            gradientMid: 'rgba(90, 156, 132, 0.15)',
            gradientEnd: 'rgba(90, 156, 132, 0.25)',

            gradientGreenStart: '#1A2D27',
            gradientGreenEnd: 'rgba(90, 156, 132, 0.30)',
        },
    },


    // ============================================================
    // WATHIQ — NEW LIGHT
    // ============================================================

    light: {
        id: 'light',
        label: 'theme_light',
        isDark: false,

        colors: {

            // ----------------------------------------------------
            // BACKGROUND
            // ----------------------------------------------------

            // Warmer, more green-tinted background
            background: '#F0F5F0',

            // Cards - warm green-white, not pure white
            card: '#F5FAF5',

            // Subtle green border
            border: 'rgba(39, 103, 81, 0.15)',


            // ----------------------------------------------------
            // TEXT
            // ----------------------------------------------------

            // Deep Wathiq green instead of black.
            textPrimary: '#18352D',

            // Secondary information.
            textSecondary: '#4A6B5F',

            // Metadata / disabled / low-emphasis text.
            textDim: '#7A9A8A',


            // ----------------------------------------------------
            // WATHIQ GREEN
            // ----------------------------------------------------

            // Main brand green.
            accentGreen: '#3D9275',

            // Used by components that already create glows.
            accentGlow: 'rgba(61, 146, 117, 0.20)',

            // Soft mint used for secondary highlighted surfaces.
            primary: '#3F8F78',

            // Warm light green for text on accent
            textOnAccent: '#F0F5F0',


            // ----------------------------------------------------
            // STATUS COLORS
            // ----------------------------------------------------

            danger: '#D94A4F',

            warning: '#CC8A1A',

            info: '#3F7FB8',

            success: '#1C9A66',


            // ----------------------------------------------------
            // SPECIAL COLORS
            // ----------------------------------------------------

            gold: '#BF8F20',

            blue: '#3F7FB8',

            purple: '#6F58B8',


            // ----------------------------------------------------
            // INPUTS
            // ----------------------------------------------------

            inputBg: '#E8F0E8',


            // ----------------------------------------------------
            // LIGHT THEME GRADIENT (AURORA)
            // ----------------------------------------------------
            //
            // These are intentionally very subtle.
            // The screen should remain predominantly white/green.
            //
            // Components that support LinearGradient can use:
            //
            // [COLORS.gradientStart,
            //  COLORS.gradientMid,
            //  COLORS.gradientEnd]
            //
            // The green should feel like a soft atmospheric
            // shadow at the bottom, NOT a colored background.
            //

            gradientStart: '#F0F5F0',
            gradientMid: 'rgba(200, 230, 215, 0.50)',
            gradientEnd: 'rgba(61, 146, 117, 0.30)',

            // Optional stronger version for hero sections.
            gradientGreenStart: '#E4F0E8',
            gradientGreenEnd: '#C5E0D5',


            // ----------------------------------------------------
            // LIGHT SURFACE VARIANTS
            // ----------------------------------------------------

            // For chips, selected tabs, subtle panels, etc.
            surfaceSoft: '#EAF3EA',

            // Slightly stronger green surface.
            surfaceGreen: '#DCEFE5',

            // Selected/active background.
            activeBackground: '#D4ECE0',

            // Very subtle green tint for separators.
            divider: '#DCE8E0',
        },
    },


    // ============================================================
    // LEGACY THEMES
    // ============================================================

    baby_pink: {
        id: 'baby_pink',
        label: 'theme_baby_pink',
        isDark: false,

        colors: {
            background: '#F8D6E2',
            card: '#FFE6EE',
            border: '#E9A8BD',

            textPrimary: '#4A172B',
            textSecondary: '#71344C',
            textDim: '#9A5B70',

            accentGreen: '#C83F70',
            accentGlow: 'rgba(200, 63, 112, 0.35)',

            primary: '#E65A8A',
            textOnAccent: '#FFFFFF',

            danger: '#D92F45',
            warning: '#C97912',
            info: '#3E82B8',
            success: '#21845B',

            gold: '#B87816',
            blue: '#3E82B8',
            purple: '#7A4BA3',

            inputBg: '#F2C5D5',

            // Gradient support
            gradientStart: '#F8D6E2',
            gradientMid: 'rgba(200, 63, 112, 0.15)',
            gradientEnd: 'rgba(200, 63, 112, 0.25)',

            gradientGreenStart: '#F8D6E2',
            gradientGreenEnd: 'rgba(200, 63, 112, 0.30)',
        },
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
            accentGreen: '#6099c8',      // Soft Cyan/Azure
            accentGlow: 'rgba(108, 180, 238, 0.25)',
            primary: '#5891c3',          
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
    
    },
};


// ================================================================
// PROVIDER
// ================================================================

export const ThemeProvider = ({ children }) => {

    // New Wathiq light theme is now the default.
    const [themeId, setThemeId] = useState('light');

    const theme = THEMES[themeId] || THEMES.light;


    useEffect(() => {
        loadTheme();
    }, []);


    const loadTheme = async () => {
        try {
            const saved = await AsyncStorage.getItem('app_theme_id');

            if (saved && THEMES[saved]) {
                setThemeId(saved);
                syncWidgetTheme(saved);
            }
        } catch (e) {
            console.log('Failed to load theme', e);
        }
    };


    const changeTheme = async (id) => {

        if (!THEMES[id]) {
            return;
        }

        setThemeId(id);
        syncWidgetTheme(id);

        try {
            await AsyncStorage.setItem('app_theme_id', id);
        } catch (e) {
            console.log('Failed to save theme', e);
        }
    };


    return (
        <ThemeContext.Provider
            value={{
                theme,
                colors: theme.colors,
                activeThemeId: themeId,
                changeTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};


export const useTheme = () => useContext(ThemeContext);