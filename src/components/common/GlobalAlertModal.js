import React, { useState, useEffect, useRef } from 'react';
import { 
    Modal, View, Text, TouchableOpacity, StyleSheet, 
    Animated, Dimensions, Easing 
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { AlertService } from '../../services/alertService';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const GlobalAlertModal = () => {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState({
        title: '',
        message: '',
        type: 'info', // success, error, warning, delete, info
        buttons: []
    });

    // Animations
    const slideAnim = useRef(new Animated.Value(100)).current; // Start 100px below
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Register this component with the service on mount
        AlertService.setRef({
            open: (newConfig) => {
                setConfig(newConfig);
                setVisible(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                
                // FIX: Use Timing + Easing instead of Spring for instant clickability
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

    const handleClose = () => {
        // Animate Out
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

    if (!visible) return null;

    // --- THEME LOGIC ---
    const getTheme = () => {
        switch (config.type) {
            case 'success': return { icon: 'check-circle', color: COLORS.accentGreen, bg: COLORS.accentGreen + '20' };
            case 'error': return { icon: 'times-circle', color: COLORS.danger, bg: COLORS.danger + '20' };
            case 'warning': return { icon: 'exclamation-triangle', color: COLORS.gold, bg: COLORS.gold + '20' };
            case 'delete': return { icon: 'trash-alt', color: COLORS.danger, bg: COLORS.danger + '20' };
            default: return { icon: 'info-circle', color: COLORS.blue, bg: COLORS.blue + '20' };
        }
    };
    const theme = getTheme();

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose} statusBarTranslucent>
            <View style={styles.overlay} pointerEvents="box-none">
                
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
                </Animated.View>

                {/* Modal Card */}
                <Animated.View style={[
                    styles.alertContainer, 
                    { transform: [{ translateY: slideAnim }], opacity: opacityAnim }
                ]}>
                    
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: theme.bg }]}>
                        <FontAwesome5 name={theme.icon} size={32} color={theme.color} />
                    </View>

                    {/* Text */}
                    <Text style={styles.title}>{config.title}</Text>
                    <Text style={styles.message}>{config.message}</Text>

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                        {config.buttons.length > 0 ? (
                            config.buttons.map((btn, index) => {
                                // Determine Button Style
                                let btnBg = COLORS.card;
                                let btnText = COLORS.textSecondary;
                                let btnBorder = COLORS.border;

                                if (btn.style === 'primary') {
                                    btnBg = COLORS.accentGreen;
                                    btnText = '#ffffff'; // Ensure high contrast
                                    btnBorder = COLORS.accentGreen;
                                } else if (btn.style === 'destructive') {
                                    btnBg = 'rgba(239, 68, 68, 0.2)';
                                    btnText = COLORS.danger;
                                    btnBorder = COLORS.danger;
                                }

                                return (
                                    <TouchableOpacity 
                                        key={index} 
                                        style={[styles.button, { backgroundColor: btnBg, borderColor: btnBorder }]}
                                        onPress={() => handleButtonPress(btn)}
                                        activeOpacity={0.7}
                                        delayPressIn={0} // <--- FIX: Instant response
                                    >
                                        <Text style={[styles.buttonText, { color: btnText }]}>{btn.text}</Text>
                                    </TouchableOpacity>
                                );
                            })
                        ) : (
                            // Default OK button if none provided
                            <TouchableOpacity 
                                style={[styles.button, { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen }]} 
                                onPress={handleClose}
                                activeOpacity={0.8}
                                delayPressIn={0}
                            >
                                <Text style={[styles.buttonText, { color: '#ffffff' }]}>حسناً</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
        backgroundColor: COLORS.card, // Ensure match with dark theme
        borderRadius: 24,
        padding: 25,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
        zIndex: 2 // Sit on top of backdrop
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
        flexDirection: 'row-reverse', // RTL Support
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
        marginBottom: 2 // Font baseline fix
    }
});

export default GlobalAlertModal;