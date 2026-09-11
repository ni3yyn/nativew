import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, Modal, TextInput, Pressable, Animated,
    Dimensions, Easing, PanResponder, TouchableOpacity, KeyboardAvoidingView,
    Platform, Keyboard
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS as DEFAULT_COLORS } from './oilguard.styles';
import { useTheme } from '../../context/ThemeContext';
import AppTextInput from '../common/AppTextInput';

// 🌟 i18n + RTL
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

// --- THEME CONFIG ---
const { height } = Dimensions.get('window');

const getTextDirection = (text) => {
    if (!text) return 'right';
    const isArabic = /[\u0600-\u06FF]/.test(text);
    return isArabic ? 'right' : 'left';
};

export default function ManualInputSheet({ visible, onClose, onSubmit }) {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const language = useCurrentLanguage();
    const rtl = useRTL();
    const styles = useMemo(() => createStyles(COLORS, rtl), [COLORS, rtl]);

    const [text, setText] = useState('');
    const [inputDirection, setInputDirection] = useState(rtl.textAlign);
    const animController = useRef(new Animated.Value(0)).current;
    const inputRef = useRef(null);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    animController.setValue(1 - (gestureState.dy / height));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > height * 0.2 || gestureState.vy > 0.8) {
                    closeSheet();
                } else {
                    Animated.spring(animController, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            setText('');
            setInputDirection(rtl.textAlign);
            Animated.spring(animController, { toValue: 1, friction: 9, tension: 50, useNativeDriver: true }).start();
            Haptics.selectionAsync();
            setTimeout(() => inputRef.current?.focus(), 400);
        }
    }, [visible]);

    const handleTextChange = (val) => {
        setText(val);
        setInputDirection(getTextDirection(val));
    };

    const closeSheet = () => {
        Keyboard.dismiss();
        Animated.timing(animController, {
            toValue: 0,
            duration: 250,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true
        }).start(({ finished }) => {
            if (finished) onClose();
        });
    };

    const handleSubmit = () => {
        if (!text.trim()) return;

        // --- LOGGING ADDED HERE ---
        console.log("====================================");
        console.log("📝 [ManualInput] Sending Text:");
        console.log(text);
        console.log("====================================");

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        closeSheet();
        setTimeout(() => onSubmit(text), 300);
    };

    if (!visible) return null;

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.8] });

    return (
        <Modal
            transparent
            visible={true}
            onRequestClose={closeSheet}
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.modalContainer}>

                {/* Dark Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
                </Animated.View>

                {/* Keyboard Handler */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "padding"}
                    style={styles.keyboardContainer}
                >
                    <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>

                        {/* Content Body */}
                        <View style={styles.sheetContent}>

                            <View style={styles.sheetHandleBar} {...panResponder.panHandlers}>
                                <View style={styles.sheetHandle} />
                            </View>

                            <View style={styles.header}>
                                <View style={styles.headerIconCircle}>
                                    <FontAwesome5 name="search" size={18} color={COLORS.accentGreen} />
                                </View>
                                <View style={styles.headerTexts}>
                                    <Text style={styles.headerTitle}>{t('manual_input_title', language)}</Text>
                                    <Text style={styles.headerSub}>{t('manual_input_subtitle', language)}</Text>
                                </View>
                                <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.instructionsContainer}>
                                <View style={styles.instructionItem}>
                                    <MaterialCommunityIcons name="pen" size={16} color={COLORS.accentGreen} />
                                    <Text style={styles.instructionText}>{t('manual_input_step_write', language)}</Text>
                                </View>
                                <View style={styles.verticalLine} />
                                <View style={styles.instructionItem}>
                                    <MaterialCommunityIcons name="comma" size={16} color={COLORS.accentGreen} />
                                    <Text style={styles.instructionText}>{t('manual_input_step_separate', language)}</Text>
                                </View>
                                <View style={styles.verticalLine} />
                                <View style={styles.instructionItem}>
                                    <MaterialCommunityIcons name="translate" size={16} color={COLORS.accentGreen} />
                                    <Text style={styles.instructionText}>{t('manual_input_step_any_lang', language)}</Text>
                                </View>
                            </View>

                            <View style={styles.inputWrapper}>
                                <AppTextInput
                                    ref={inputRef}
                                    style={[
                                        styles.textInput,
                                        { textAlign: inputDirection }
                                    ]}
                                    multiline
                                    placeholder={t('manual_input_placeholder', language)}
                                    placeholderTextColor={COLORS.textSecondary}
                                    value={text}
                                    onChangeText={handleTextChange}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={handleSubmit}
                                style={[styles.submitBtn, { opacity: text.trim().length > 2 ? 1 : 0.6 }]}
                                disabled={text.trim().length <= 2}
                            >
                                <LinearGradient
                                    colors={[COLORS.accentGreen, COLORS.accentGreen + 'BF']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={styles.gradientBtn}
                                >
                                    <Text style={styles.submitBtnText}>{t('manual_input_submit', language)}</Text>
                                    <FontAwesome5 name="flask" size={16} color={COLORS.textOnAccent} />
                                </LinearGradient>
                            </TouchableOpacity>

                        </View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const createStyles = (COLORS, rtl) => StyleSheet.create({
    modalContainer: {
        flex: 1,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 1
    },
    keyboardContainer: {
        width: '100%',
        zIndex: 2,
        justifyContent: 'flex-end',
        flex: 1
    },
    sheetContainer: {
        width: '100%',
        marginBottom: -150,
        backgroundColor: COLORS.card || COLORS.background,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    sheetContent: {
        width: '100%',
        paddingBottom: Platform.OS === 'ios' ? 180 : 160,
        paddingHorizontal: 24,
    },
    sheetHandleBar: {
        alignItems: 'center',
        paddingVertical: 15,
        width: '100%'
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.border,
        borderRadius: 10
    },
    header: {
        flexDirection: rtl.flexDirection,
        alignItems: 'center',
        marginBottom: 20,
        justifyContent: 'space-between'
    },
    headerIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.accentGreen + '1A',
        alignItems: 'center',
        justifyContent: 'center',
        marginStart: 12,
        borderWidth: 0.5,
        borderColor: COLORS.border
    },
    headerTexts: {
        flex: 1,
        alignItems: rtl.alignItems === 'flex-start' ? 'flex-start' : 'flex-end'
    },
    headerTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: COLORS.textPrimary,
        textAlign: rtl.textAlign
    },
    headerSub: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: rtl.textAlign
    },
    closeBtn: {
        padding: 5,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20
    },
    instructionsContainer: {
        flexDirection: rtl.flexDirection,
        justifyContent: 'space-between',
        backgroundColor: COLORS.background + '80',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 15,
        marginBottom: 20,
        borderWidth: 0.5,
        borderColor: COLORS.border
    },
    instructionItem: {
        flexDirection: rtl.flexDirection,
        alignItems: 'center',
        gap: 6
    },
    instructionText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: COLORS.textSecondary
    },
    verticalLine: {
        width: 1,
        height: '70%',
        backgroundColor: COLORS.border
    },
    inputWrapper: {
        backgroundColor: COLORS.background,
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        marginBottom: 20,
        overflow: 'hidden'
    },
    textInput: {
        color: COLORS.textPrimary,
        fontFamily: 'Tajawal-Regular',
        fontWeight: 'normal', // Force normal weight on Android for placeholder font to apply
        fontSize: 15,
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 15,
        height: 150,
        textAlignVertical: 'top',
        lineHeight: 24,
    },
    submitBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        height: 56,
        shadowColor: COLORS.accentGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    gradientBtn: {
        flex: 1,
        flexDirection: rtl.flexDirection,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10
    },
    submitBtnText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: COLORS.textOnAccent
    },
});