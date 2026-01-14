import React, { useEffect, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, Modal, TextInput, Pressable, Animated, 
  Dimensions, Easing, PanResponder, TouchableOpacity, KeyboardAvoidingView, 
  Platform, Keyboard 
} from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// --- THEME CONFIG ---
const { height } = Dimensions.get('window');
const COLORS = {
  background: '#1A2D27',
  card: '#253D34',
  border: 'rgba(90, 156, 132, 0.25)',
  accentGreen: '#5A9C84',
  textPrimary: '#F1F3F2',
  textSecondary: '#A3B1AC',
  textDim: '#666666',
  accentGlow: 'rgba(90, 156, 132, 0.4)',
};

const getTextDirection = (text) => {
    if (!text) return 'right'; 
    const isArabic = /[\u0600-\u06FF]/.test(text);
    return isArabic ? 'right' : 'left';
};

export default function ManualInputSheet({ visible, onClose, onSubmit }) {
    const [text, setText] = useState('');
    const [inputDirection, setInputDirection] = useState('right');
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
            setInputDirection('right');
            Animated.spring(animController, { toValue: 1, damping: 15, stiffness: 100, useNativeDriver: true }).start();
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
            easing: Easing.out(Easing.cubic), 
            useNativeDriver: true 
        }).start(({ finished }) => { 
            if (finished) onClose(); 
        });
    };

    const handleSubmit = () => {
        if (!text.trim()) return;
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
            animationType="fade" // Changed from 'none' to 'fade' to help smooth the initial render
            statusBarTranslucent
        >
            <View style={styles.modalContainer}>
                
                {/* Dark Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
                </Animated.View>

                {/* Keyboard Handler: DISABLED KAV ON ANDROID */}
                <KeyboardAvoidingView 
                    behavior={Platform.OS === "ios" ? "padding" : "padding"} 
                    style={styles.keyboardContainer}
                    // Add an offset if the keyboard hides the button (adjust 20-50 as needed)
                    keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
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
                                    <Text style={styles.headerTitle}>إدخال المكونات يدويا</Text>
                                    <Text style={styles.headerSub}>تحليل فوري عبر النص</Text>
                                </View>
                                <TouchableOpacity onPress={closeSheet} style={styles.closeBtn}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.instructionsContainer}>
                                <View style={styles.instructionItem}>
                                    <MaterialCommunityIcons name="pen" size={16} color={COLORS.accentGreen} />
                                    <Text style={styles.instructionText}>اكتب المكونات</Text>
                                </View>
                                <View style={styles.verticalLine} />
                                <View style={styles.instructionItem}>
                                    <MaterialCommunityIcons name="comma" size={16} color={COLORS.accentGreen} />
                                    <Text style={styles.instructionText}>افصل بفواصل</Text>
                                </View>
                                <View style={styles.verticalLine} />
                                <View style={styles.instructionItem}>
                                    <MaterialCommunityIcons name="translate" size={16} color={COLORS.accentGreen} />
                                    <Text style={styles.instructionText}>بأي لغة</Text>
                                </View>
                            </View>

                            <View style={styles.inputWrapper}>
                                <TextInput
                                    ref={inputRef}
                                    style={[
                                        styles.textInput, 
                                        { textAlign: inputDirection } 
                                    ]}
                                    multiline
                                    placeholder="مثال: Water, Glycerin, Niacinamide..."
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
                                    colors={[COLORS.accentGreen, '#4a8570']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={styles.gradientBtn}
                                >
                                    <Text style={styles.submitBtnText}>تحليل المكونات</Text>
                                    <FontAwesome5 name="flask" size={16} color="#1A2D27" />
                                </LinearGradient>
                            </TouchableOpacity>

                        </View>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
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
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 30, 
        borderTopRightRadius: 30,
    },
    sheetContent: { 
        width: '100%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20, 
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
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        marginBottom: 20, 
        justifyContent: 'space-between' 
    },
    headerIconCircle: { 
        width: 40, 
        height: 40, 
        borderRadius: 12, 
        backgroundColor: 'rgba(90, 156, 132, 0.1)', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginLeft: 12,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    headerTexts: {
        flex: 1,
        alignItems: 'flex-end'
    },
    headerTitle: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 18, 
        color: COLORS.textPrimary, 
        textAlign: 'right' 
    },
    headerSub: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 13, 
        color: COLORS.textSecondary, 
        textAlign: 'right' 
    },
    closeBtn: { 
        padding: 5,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20
    },
    instructionsContainer: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        backgroundColor: 'rgba(26, 45, 39, 0.5)', 
        borderRadius: 12, 
        paddingVertical: 12,
        paddingHorizontal: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    instructionItem: { 
        flexDirection: 'row-reverse', 
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
        borderWidth: 1, 
        borderColor: COLORS.border, 
        marginBottom: 20,
        overflow: 'hidden'
    },
    textInput: { 
        color: COLORS.textPrimary, 
        fontFamily: 'Tajawal-Regular', 
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
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 10 
    },
    submitBtnText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 16, 
        color: '#1A2D27' 
    },
});