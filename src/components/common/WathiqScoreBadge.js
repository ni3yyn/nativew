import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

const WathiqScoreBadge = ({ score, size = 50 }) => {
    const safeScore = score || 0;
    const color = safeScore >= 80 ? COLORS.success : safeScore >= 65 ? COLORS.gold : COLORS.danger;

    return (
        <View style={[styles.scoreContainer, { borderColor: color, width: size, height: size, borderRadius: size / 2 }]}>
            <View style={[styles.scoreFill, { backgroundColor: color, borderRadius: size / 2 }]} />
            <Text style={[styles.scoreValue, { color: color, fontSize: size * 0.28 }]}>{safeScore}</Text>
            <Text style={[styles.scoreLabel, { color: color, fontSize: size * 0.16 }]}>وثيق</Text>
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