// src/components/common/WathiqScoreBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage'; 

const WathiqScoreBadge = ({ score, size = 50 }) => {
    const { colors: COLORS } = useTheme();
    // 🔥 FIX: Hooks must be called at the top level of the component!
    const language = useCurrentLanguage(); 
    
    const safeScore = score || 0;
    
    // Safely assign colors (Fallback just in case your theme misses a color)
    let color = COLORS.danger || '#F44336';
    if (safeScore >= 80) color = COLORS.success || '#4CAF50';
    else if (safeScore >= 65) color = COLORS.gold || '#FFC107';

    return (
        <View style={[styles.scoreContainer, { borderColor: color, width: size, height: size, borderRadius: size / 2 }]}>
            <View style={[styles.scoreFill, { backgroundColor: color, borderRadius: size / 2 }]} />
            <Text style={[styles.scoreValue, { color: color, fontSize: size * 0.35 }]}>{safeScore}</Text>
            <Text style={[styles.scoreLabel, { color: color, fontSize: size * 0.18 }]}>{t('oilguard_wathiq_label', language)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    scoreContainer: {
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative'
    },
    scoreFill: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.12
    },
    scoreValue: {
        fontFamily: 'Tajawal-ExtraBold',
        lineHeight: 20,
        marginTop: 2
    },
    scoreLabel: {
        fontFamily: 'Tajawal-Bold',
        textAlign: 'center',
        marginTop: -4
    },
});

export default WathiqScoreBadge;