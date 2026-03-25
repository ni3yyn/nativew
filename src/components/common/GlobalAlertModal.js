import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Modal, View, Text, TouchableOpacity, StyleSheet,
    Animated, Dimensions, Easing
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { AlertService } from '../../services/alertService';
import * as Haptics from 'expo-haptics';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

const { width } = Dimensions.get('window');

const GlobalAlertModal = () => {
    const language = useCurrentLanguage(); // ✅ Moved to top - always called
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState({
        title: '',
        message: '',
        type: 'info',
        buttons: []
    });

    // Animations
    const slideAnim = useRef(new Animated.Value(100)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // ✅ All hooks above this line
    // Now it's safe to have conditional returns

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 150,
                duration: 200,
                useNativeDriver: true
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            })
        ]).start(() => {
            setVisible(false);
            if (config.onDismiss) config.onDismiss();
        });
    };

    const handleButtonPress = (btn) => {
        if (btn.onPress) btn.onPress();
        handleClose();
    };

    useEffect(() => {
        AlertService.setRef({
            open: (newConfig) => {
                setConfig(newConfig);
                setVisible(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

                Animated.parallel([
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 300,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true
                    })
                ]).start();
            },
            close: handleClose
        });

        return () => AlertService.setRef(null);
    }, []);

    // ✅ This return is after all hooks, so it's safe
    if (!visible) return null;

    const getAlertTheme = () => {
        switch (config.type) {
            case 'success': return { icon: 'check-circle', color: COLORS.success || COLORS.accentGreen, bg: (COLORS.success || COLORS.accentGreen) + '20' };
            case 'error': return { icon: 'times-circle', color: COLORS.danger, bg: COLORS.danger + '20' };
            case 'warning': return { icon: 'exclamation-triangle', color: COLORS.warning || COLORS.gold, bg: (COLORS.warning || COLORS.gold) + '20' };
            case 'delete': return { icon: 'trash-alt', color: COLORS.danger, bg: COLORS.danger + '20' };
            default: return { icon: 'info-circle', color: COLORS.info || COLORS.blue, bg: (COLORS.info || COLORS.blue) + '20' };
        }
    };
    const alertTheme = getAlertTheme();

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose} statusBarTranslucent>
            <View style={styles.overlay} pointerEvents="box-none">
                <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
                </Animated.View>

                <Animated.View style={[
                    styles.alertContainer,
                    { transform: [{ translateY: slideAnim }], opacity: opacityAnim }
                ]}>
                    <View style={[styles.iconContainer, { backgroundColor: alertTheme.bg }]}>
                        <FontAwesome5 name={alertTheme.icon} size={32} color={alertTheme.color} />
                    </View>

                    <Text style={styles.title}>{config.title}</Text>
                    <Text style={styles.message}>{config.message}</Text>

                    <View style={styles.buttonRow}>
                        {config.buttons.length > 0 ? (
                            config.buttons.map((btn, index) => {
                                let btnBg = COLORS.card;
                                let btnText = COLORS.textSecondary;
                                let btnBorder = COLORS.border;

                                if (btn.style === 'primary') {
                                    btnBg = COLORS.accentGreen;
                                    btnText = COLORS.textOnAccent || '#ffffff';
                                    btnBorder = COLORS.accentGreen;
                                } else if (btn.style === 'destructive') {
                                    btnBg = COLORS.danger + '20';
                                    btnText = COLORS.danger;
                                    btnBorder = COLORS.danger;
                                }

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.button, { backgroundColor: btnBg, borderColor: btnBorder }]}
                                        onPress={() => handleButtonPress(btn)}
                                        activeOpacity={0.7}
                                        delayPressIn={0}
                                    >
                                        <Text style={[styles.buttonText, { color: btnText }]}>{btn.text}</Text>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen }]}
                                onPress={handleClose}
                                activeOpacity={0.8}
                                delayPressIn={0}
                            >
                                <Text style={[styles.buttonText, { color: COLORS.textOnAccent || '#ffffff' }]}>{t('announcement_ok', language)}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        backgroundColor: 'transparent'
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.75)',
        zIndex: 1
    },
    alertContainer: {
        width: width * 0.85,
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 25,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
        zIndex: 2
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        marginTop: -10,
    },
    title: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 20,
        color: COLORS.textPrimary,
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 22,
    },
    buttonRow: {
        flexDirection: 'row-reverse',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    buttonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        marginBottom: 2
    }
});

export default GlobalAlertModal;