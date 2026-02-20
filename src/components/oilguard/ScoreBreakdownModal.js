import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, Pressable, Animated, Dimensions, Easing, PanResponder, TouchableOpacity } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { COLORS as DEFAULT_COLORS } from './oilguard.styles';

const { height } = Dimensions.get('window');

// --- HELPER: ITEM STYLING ---
const getItemStyle = (type, COLORS) => {
    switch (type) {
        case 'deduction':
            return { color: COLORS.danger, bg: COLORS.danger + '1A', icon: 'minus-circle-outline' };
        case 'warning':
            return { color: COLORS.warning, bg: COLORS.warning + '1A', icon: 'alert-outline' };
        case 'info':
        case 'bonus':
            return { color: COLORS.success, bg: COLORS.success + '1A', icon: 'plus-circle-outline' };
        case 'override':
            return { color: COLORS.danger, bg: COLORS.danger + '26', icon: 'shield-alert-outline', border: true };
        case 'calculation':
            return { color: COLORS.textSecondary, bg: COLORS.textSecondary + '1A', icon: 'calculator' };
        default:
            return { color: COLORS.info, bg: COLORS.info + '1A', icon: 'information-outline' };
    }
};

const ScoreBreakdownModal = ({ visible, onClose, data }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const animController = useRef(new Animated.Value(0)).current;

    // --- Gesture Handler (Same Physics as InsightDetails) ---
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) animController.setValue(1 - (gestureState.dy / height));
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > height * 0.2 || gestureState.vy > 0.8) {
                    handleClose();
                } else {
                    Animated.spring(animController, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(animController, { toValue: 1, damping: 15, stiffness: 100, useNativeDriver: true }).start();
            Haptics.selectionAsync();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true })
            .start(({ finished }) => { if (finished) onClose(); });
    };

    if (!data) return null;

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    return (
        <Modal transparent visible={visible} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <View style={{ flex: 1 }} pointerEvents="box-none">

                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                {/* Bottom Sheet */}
                <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                    <View style={styles.sheetContent}>

                        {/* Drag Handle */}
                        <View style={styles.sheetHandleBar} {...panResponder.panHandlers}>
                            <View style={styles.sheetHandle} />
                        </View>

                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                            {/* Header */}
                            <View style={styles.headerRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.title}>تفاصيل التقييم</Text>
                                    <Text style={styles.subtitle}>كيف حسبنا هذه النتيجة؟</Text>
                                </View>
                                <View style={styles.iconCircle}>
                                    <MaterialCommunityIcons name="chart-box-outline" size={24} color={COLORS.textPrimary} />
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Breakdown Items */}
                            {data.map((item, index) => {
                                // Filter out calculation steps if needed, or keep for transparency
                                if (item.type === 'calculation' && !item.text.includes('النهائي')) return null;

                                const style = getItemStyle(item.type, COLORS);

                                return (
                                    <View key={index} style={[
                                        styles.itemRow,
                                        style.border && { borderColor: style.color, borderWidth: 1, backgroundColor: 'transparent' }
                                    ]}>

                                        {/* Value (Left) */}
                                        <View style={styles.valueCol}>
                                            <Text style={[styles.itemValue, { color: style.color }]}>{item.value}</Text>
                                        </View>

                                        {/* Text (Middle) */}
                                        <View style={styles.textCol}>
                                            <Text style={styles.itemText}>{item.text}</Text>
                                        </View>

                                        {/* Icon (Right) */}
                                        <View style={[styles.iconBox, { backgroundColor: style.bg }]}>
                                            <MaterialCommunityIcons name={style.icon} size={18} color={style.color} />
                                        </View>

                                    </View>
                                );
                            })}

                            <View style={styles.divider} />

                            {/* Footer Disclaimer */}
                            <View style={styles.footerNote}>
                                <MaterialCommunityIcons name="robot-outline" size={16} color={COLORS.textSecondary} />
                                <Text style={styles.footerText}>
                                    يعتمد هذا التحليل على خوارزميات كيميائية وقواعد بيانات علمية، لكنه لا يغني عن استشارة الطبيب.
                                </Text>
                            </View>

                            {/* Close Button */}
                            <TouchableOpacity
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); handleClose(); }}
                                style={styles.closeButton}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.closeButtonText}>إغلاق</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    // --- Layout ---
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1 },
    sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', zIndex: 2 },
    sheetContent: { flex: 1, backgroundColor: COLORS.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    sheetHandleBar: { alignItems: 'center', paddingVertical: 15, width: '100%', zIndex: 10, backgroundColor: COLORS.card },
    sheetHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 10 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 50 },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20, opacity: 0.5 },

    // --- Header ---
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    title: { fontFamily: 'Tajawal-Bold', fontSize: 20, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 4 },
    subtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'right' },

    // --- Rows ---
    itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },

    // Icon (Right side in RTL)
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },

    // Text (Middle)
    textCol: { flex: 1 },
    itemText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textPrimary, textAlign: 'right', lineHeight: 20 },

    // Value (Left side in RTL)
    valueCol: { minWidth: 50, alignItems: 'flex-start', paddingRight: 8, borderRightWidth: 1, borderRightColor: COLORS.border + '40' },
    itemValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 14 },

    // --- Footer ---
    footerNote: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', marginVertical: 10, gap: 8, paddingHorizontal: 10 },
    footerText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18, flex: 1 },

    // --- Close Button ---
    closeButton: { backgroundColor: COLORS.textPrimary, paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginTop: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    closeButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.card },
});

export default ScoreBreakdownModal;