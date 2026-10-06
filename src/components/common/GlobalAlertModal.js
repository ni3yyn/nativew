import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Pressable,
    Dimensions,
    Easing
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AlertService } from '../../services/alertService';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useRTL } from '../../hooks/useRTL';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { t } from '../../i18n';

const { width } = Dimensions.get('window');

const GlobalAlertModal = () => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const rtl = useRTL();
    const language = useCurrentLanguage();
    const styles = useMemo(() => createStyles(COLORS, rtl), [COLORS, rtl]);

    const [alertConfig, setAlertConfig] = useState(null);
    const [visible, setVisible] = useState(false);

    // 🌟 Subtle, natural travel distance (28px) for seamless entrance
    const translateYAnim = useRef(new Animated.Value(28)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    
    // 🛡️ Guards against close animation race conditions
    const activeAlertId = useRef(0);

    const handleClose = (callback) => {
        const closeForId = activeAlertId.current;

        // Snappy, clean exit (150ms)
        Animated.parallel([
            Animated.timing(translateYAnim, {
                toValue: 20,
                duration: 150,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 150,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true
            })
        ]).start(({ finished }) => {
            if (finished && closeForId === activeAlertId.current) {
                setVisible(false);
                setAlertConfig(null);
            }
            if (typeof callback === 'function') callback();
        });
    };

    useEffect(() => {
        const handleOpen = (config) => {
            if (!config) {
                handleClose();
                return;
            }

            activeAlertId.current += 1;

            // 1. 🔒 PRE-SET values to completely invisible BEFORE modal mounts
            translateYAnim.setValue(28);
            opacityAnim.setValue(0);

            // 2. Mount modal natively
            setAlertConfig(config);
            setVisible(true);

            // 3. 🚀 Trigger animation on next frame to ensure native window is ready (eliminates snap)
            requestAnimationFrame(() => {
                Animated.parallel([
                    Animated.timing(translateYAnim, {
                        toValue: 0,
                        duration: 220,
                        easing: Easing.bezier(0.16, 1, 0.3, 1),
                        useNativeDriver: true
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 1,
                        duration: 190,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true
                    })
                ]).start();
            });

            // 4. Non-blocking haptic trigger (eliminates latency hitch)
            setTimeout(() => {
                if (config.type === 'error' || config.type === 'destructive' || config.type === 'delete') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
                } else if (config.type === 'success') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                } else {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }
            }, 25);
        };

        const modalRef = {
            show: handleOpen,
            open: handleOpen,
            alert: handleOpen,
            close: handleClose,
            hide: handleClose,
        };

        let unsubscribe = null;

        if (typeof AlertService?.setRef === 'function') {
            AlertService.setRef(modalRef);
            unsubscribe = () => AlertService.setRef(null);
        } else if (typeof AlertService?.subscribe === 'function') {
            unsubscribe = AlertService.subscribe(handleOpen);
        } else if (typeof AlertService?.setListener === 'function') {
            AlertService.setListener(handleOpen);
            unsubscribe = () => AlertService.setListener(null);
        } else if (typeof AlertService?.register === 'function') {
            AlertService.register(handleOpen);
            unsubscribe = () => AlertService.register(null);
        }

        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    if (!visible || !alertConfig) return null;

    const {
        title = '',
        message = '',
        type = 'info',
        buttons = []
    } = alertConfig;

    // Icon and Accent Color by Type
    const getTypeDetails = () => {
        switch (type) {
            case 'success':
                return {
                    color: COLORS.accentGreen || '#10B981',
                    icon: <Feather name="check" size={24} color={COLORS.accentGreen || '#10B981'} />
                };
            case 'delete':
                return {
                    color: COLORS.danger || '#EF4444',
                    icon: <Feather name="trash-2" size={24} color={COLORS.danger || '#EF4444'} />
                };
            case 'error':
            case 'destructive':
                return {
                    color: COLORS.danger || '#EF4444',
                    icon: <Feather name="alert-circle" size={24} color={COLORS.danger || '#EF4444'} />
                };
            case 'warning':
                return {
                    color: COLORS.gold || '#F59E0B',
                    icon: <Feather name="alert-triangle" size={24} color={COLORS.gold || '#F59E0B'} />
                };
            case 'info':
            default:
                return {
                    color: COLORS.accentGreen || '#5A9C84',
                    icon: <Feather name="info" size={24} color={COLORS.accentGreen || '#5A9C84'} />
                };
        }
    };

    const typeDetails = getTypeDetails();

    const resolvedButtons = buttons.length > 0 ? buttons : [
        {
            text: t('alert_ok', language) || (language === 'ar' ? 'حسناً' : 'OK'),
            style: 'primary',
            onPress: () => {}
        }
    ];

    // Layout up to 3 buttons horizontally in a single row
    const isHorizontalLayout = resolvedButtons.length <= 3;

    const handleButtonPress = (btn) => {
        Haptics.selectionAsync().catch(() => {});
        handleClose(() => {
            if (btn.onPress) {
                btn.onPress();
            }
        });
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                {/* Silky Backdrop Fade (No Shadow) */}
                <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: opacityAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                {/* Flat, Modern Card with Smooth 28px Slide Up */}
                <Animated.View
                    style={[
                        styles.card,
                        {
                            opacity: opacityAnim,
                            transform: [{ translateY: translateYAnim }],
                            borderColor: typeDetails.color + '33'
                        }
                    ]}
                >
                    {/* Flat Tinted Icon Badge */}
                    <View style={[styles.iconBadge, { backgroundColor: typeDetails.color + '14', borderColor: typeDetails.color + '28' }]}>
                        {typeDetails.icon}
                    </View>

                    {/* Content */}
                    <View style={styles.textContainer}>
                        {title ? (
                            <Text style={styles.title} numberOfLines={2}>
                                {title}
                            </Text>
                        ) : null}
                        {message ? (
                            <Text style={styles.message}>
                                {message}
                            </Text>
                        ) : null}
                    </View>

                    {/* Action Buttons: 1, 2, or 3 buttons horizontally */}
                    <View style={[
                        styles.actionsRow, 
                        isHorizontalLayout 
                            ? [styles.actionsRowHorizontal, { flexDirection: rtl.flexDirection }] 
                            : styles.actionsRowVertical
                    ]}>
                        {resolvedButtons.map((btn, index) => {
                            const isDestructive = btn.style === 'destructive' || btn.style === 'danger';
                            const isSecondary = btn.style === 'secondary' || btn.style === 'cancel';
                            const isPrimary = !isDestructive && !isSecondary;

                            let btnStyle = styles.buttonPrimary;
                            let textStyle = styles.buttonTextPrimary;
                            let customBg = COLORS.accentGreen;

                            if (isDestructive) {
                                customBg = COLORS.danger;
                                btnStyle = styles.buttonDestructive;
                                textStyle = styles.buttonTextDestructive;
                            } else if (isSecondary) {
                                btnStyle = styles.buttonSecondary;
                                textStyle = styles.buttonTextSecondary;
                            } else {
                                customBg = typeDetails.color;
                            }

                            return (
                                <TouchableOpacity
                                    key={`alert_btn_${index}`}
                                    style={[
                                        styles.buttonBase,
                                        btnStyle,
                                        isPrimary && { backgroundColor: customBg },
                                        isHorizontalLayout && { flex: 1 }
                                    ]}
                                    activeOpacity={0.75}
                                    onPress={() => handleButtonPress(btn)}
                                >
                                    <Text
                                        style={[styles.buttonTextBase, textStyle]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (COLORS, rtl) => StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    // Modern Flat Card: Clean border, Zero Shadows, Zero Elevation
    card: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: COLORS.card,
        borderRadius: 24,
        paddingHorizontal: 18,
        paddingTop: 22,
        paddingBottom: 18,
        alignItems: 'center',
        borderWidth: 1.2,
        shadowOpacity: 0,
        elevation: 0,
    },
    iconBadge: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        marginBottom: 14,
    },
    textContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 18,
        paddingHorizontal: 4,
    },
    title: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 17.5,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 6,
        lineHeight: 24,
    },
    message: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13.5,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    actionsRow: {
        width: '100%',
    },
    actionsRowHorizontal: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionsRowVertical: {
        flexDirection: 'column',
        gap: 8,
    },
    buttonBase: {
        paddingVertical: 11,
        paddingHorizontal: 6,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 42,
    },
    buttonPrimary: {
        backgroundColor: COLORS.accentGreen,
    },
    buttonDestructive: {
        backgroundColor: COLORS.danger,
    },
    buttonSecondary: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    buttonTextBase: {
        fontSize: 13.5,
        textAlign: 'center',
    },
    buttonTextPrimary: {
        fontFamily: 'Tajawal-Bold',
        color: COLORS.textOnAccent || '#FFFFFF',
    },
    buttonTextDestructive: {
        fontFamily: 'Tajawal-Bold',
        color: '#FFFFFF',
    },
    buttonTextSecondary: {
        fontFamily: 'Tajawal-Bold',
        color: COLORS.textPrimary,
    },
});

export default GlobalAlertModal;