import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
    TouchableOpacity,
    PanResponder,
    ScrollView,
    Easing,
    Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

const { width, height } = Dimensions.get('window');

// ============================================================================
// --- 1. DYNAMIC UV ENGINE ---
// ============================================================================
const getUvProfile = (uv) => {
    const val = Number(uv) || 0;
    const rounded = Math.round(val * 10) / 10;

    if (val >= 11) {
        return {
            level: rounded,
            status: 'extreme',
            durationMinutes: 60,
            color: '#DC2626',
        };
    }
    if (val >= 8) {
        return {
            level: rounded,
            status: 'very_high',
            durationMinutes: 75,
            color: '#EA580C',
        };
    }
    if (val >= 6) {
        return {
            level: rounded,
            status: 'high',
            durationMinutes: 90,
            color: '#F59E0B',
        };
    }
    if (val >= 3) {
        return {
            level: rounded,
            status: 'moderate',
            durationMinutes: 120,
            color: '#3B82F6',
        };
    }
    return {
        level: rounded,
        status: 'safe',
        durationMinutes: 0,
        color: '#10B981',
    };
};

const formatStackedTime = (secs) => {
    if (secs <= 0) return { m: '00', s: '00' };
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return {
        m: `${m < 10 ? '0' : ''}${m}`,
        s: `${s < 10 ? '0' : ''}${s}`,
    };
};

// ============================================================================
// --- 2. THICK TIMER RING (MOVING EDGE ALWAYS VISIBLE, NO FLICKER) ---
// ============================================================================
const ThickTimerRing = ({
    size = 110,
    strokeWidth = 10,
    progress = 1,
    accentColor = '#3D9275',
    isActive = true,
    centerContent,
}) => {
    const pad = 6;
    const innerSize = size - pad * 2;
    const radius = (innerSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const strokeDashoffset = circumference * (1 - clampedProgress);

    // Continuous smooth angle calculation (starts at top: -90deg)
    const angle = clampedProgress * 2 * Math.PI - Math.PI / 2;
    const cx = size / 2;
    const cy = size / 2;
    const dotX = cx + radius * Math.cos(angle);
    const dotY = cy + radius * Math.sin(angle);

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background Track */}
                <Circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {/* Solid Progress Stroke */}
                {isActive && (
                    <Circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        stroke={accentColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="none"
                        transform={`rotate(-90 ${cx} ${cy})`}
                    />
                )}

                {/* Moving Edge Dot: ALWAYS VISIBLE when active without random threshold cutoffs */}
                {isActive && clampedProgress > 0 && (
                    <Circle
                        cx={dotX}
                        cy={dotY}
                        r={strokeWidth * 0.52}
                        fill="#FFFFFF"
                        stroke={accentColor}
                        strokeWidth={2}
                    />
                )}
            </Svg>

            {/* Inner Content Slot */}
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                {centerContent}
            </View>
        </View>
    );
};

// ============================================================================
// --- 3. ANDROID WIDGET LAYOUTS ---
// ============================================================================

// --- 3.1: 4x2 BANNER (DASHBOARD) ---
const Widget4x2Dashboard = ({
    uvProfile,
    timerState, // 'idle' | 'running' | 'expired' | 'safe'
    remainingSeconds,
    totalDuration,
    onButtonPress,
    colors
}) => {
    const isSafe = timerState === 'safe';
    const isExpired = timerState === 'expired';
    const isRunning = timerState === 'running';

    const progress = totalDuration > 0 ? remainingSeconds / totalDuration : 0;
    const { m, s } = formatStackedTime(remainingSeconds);

    const buttonConfig = useMemo(() => {
        if (isSafe) {
            return {
                text: 'أشعة آمنة',
                icon: 'check',
                bg: colors.card,
                textColor: colors.textDim,
            };
        }
        if (isExpired) {
            return {
                text: 'تجديد الآن',
                icon: 'redo-alt',
                bg: colors.danger,
                textColor: '#FFFFFF',
            };
        }
        if (isRunning) {
            return {
                text: 'إعادة المؤقت',
                icon: 'redo-alt',
                bg: colors.accentGreen,
                textColor: colors.textOnAccent || '#FFFFFF',
            };
        }
        return {
            text: 'بدء الحماية',
            icon: 'play',
            bg: colors.primary,
            textColor: colors.textOnAccent || '#FFFFFF',
        };
    }, [isSafe, isExpired, isRunning, colors]);

    // Strict 2-word status (No repetition, no fluff)
    const twoWordStatus = useMemo(() => {
        if (isSafe) return 'أشعة آمنة';
        if (isExpired) return 'انتهت الحماية';
        if (isRunning) return 'حماية نشطة';
        return 'بانتظار البدء';
    }, [isSafe, isExpired, isRunning]);

    return (
        <View style={[styles.widget4x2Container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Left Column: Expanded Thick Ring (Dominating space) */}
            <View style={styles.widgetGaugeCol}>
                <ThickTimerRing
                    size={110}
                    strokeWidth={10}
                    progress={isRunning ? progress : isExpired ? 0 : 1}
                    accentColor={isExpired ? colors.danger : uvProfile.color}
                    isActive={isRunning || timerState === 'idle'}
                    centerContent={
                        isSafe ? (
                            <View style={{ alignItems: 'center' }}>
                                <FontAwesome5 name="smile" size={22} color={uvProfile.color} />
                                <Text style={[styles.ringSmallLabel, { color: uvProfile.color }]}>آمن</Text>
                            </View>
                        ) : (
                            /* Large numbers filling the ring interior */
                            <View style={styles.stackedInsideRing}>
                                <Text style={[styles.stackedTopDigits, { color: isExpired ? colors.danger : colors.textPrimary }]}>
                                    {isRunning ? m : `${uvProfile.durationMinutes}`}
                                </Text>
                                <View style={[styles.stackedSeparatorDot, { backgroundColor: isExpired ? colors.danger : uvProfile.color }]} />
                                <Text style={[styles.stackedBottomDigits, { color: isExpired ? colors.danger : uvProfile.color }]}>
                                    {isRunning ? s : '00'}
                                </Text>
                            </View>
                        )
                    }
                />
            </View>

            {/* Right Column: Title, UV & Two-Word Status */}
            <View style={styles.widgetInfoCol}>
                {/* Header */}
                <View style={styles.widgetRowHeader}>
                    <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>مؤقت وثيق</Text>

                    {/* Borderless UV with pure dynamic color */}
                    <View style={styles.borderlessUvWrapper}>
                        <FontAwesome5 name="sun" size={12} color={uvProfile.color} />
                        <Text style={[styles.borderlessUvNumber, { color: uvProfile.color }]}>
                            UV {uvProfile.level}
                        </Text>
                    </View>
                </View>

                {/* Two-word status only */}
                <Text style={[styles.widgetStatusTwoWords, { color: colors.textSecondary }]}>
                    {twoWordStatus}
                </Text>

                {/* Action CTA Button */}
                <TouchableOpacity
                    onPress={onButtonPress}
                    activeOpacity={0.85}
                    style={[styles.widgetButton, { backgroundColor: buttonConfig.bg }]}
                >
                    <FontAwesome5 name={buttonConfig.icon} size={11} color={buttonConfig.textColor} />
                    <Text style={[styles.widgetButtonText, { color: buttonConfig.textColor }]}>
                        {buttonConfig.text}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- 3.2: 2x2 COMPACT SQUARE ---
const Widget2x2Orbit = ({
    uvProfile,
    timerState,
    remainingSeconds,
    totalDuration,
    onButtonPress,
    colors
}) => {
    const isSafe = timerState === 'safe';
    const isExpired = timerState === 'expired';
    const isRunning = timerState === 'running';

    const progress = totalDuration > 0 ? remainingSeconds / totalDuration : 0;
    const { m, s } = formatStackedTime(remainingSeconds);

    const buttonText = isSafe ? 'أشعة آمنة' : isExpired ? 'تجديد الآن' : isRunning ? 'إعادة المؤقت' : 'بدء الحماية';

    return (
        <View style={[styles.widget2x2Container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.widgetRowHeader}>
                <Text style={[styles.brandTitle, { color: colors.textPrimary, fontSize: 12.5 }]}>مؤقت وثيق</Text>

                <View style={styles.borderlessUvWrapper}>
                    <FontAwesome5 name="sun" size={10.5} color={uvProfile.color} />
                    <Text style={[styles.borderlessUvNumber, { color: uvProfile.color, fontSize: 12 }]}>
                        UV {uvProfile.level}
                    </Text>
                </View>
            </View>

            {/* Thick Ring Centered */}
            <View style={styles.centerGaugeHolder}>
                <ThickTimerRing
                    size={106}
                    strokeWidth={9.5}
                    progress={isRunning ? progress : isExpired ? 0 : 1}
                    accentColor={isExpired ? colors.danger : uvProfile.color}
                    isActive={isRunning || timerState === 'idle'}
                    centerContent={
                        isSafe ? (
                            <View style={{ alignItems: 'center' }}>
                                <FontAwesome5 name="smile" size={22} color={uvProfile.color} />
                                <Text style={[styles.ringSmallLabel, { color: uvProfile.color }]}>آمن</Text>
                            </View>
                        ) : (
                            <View style={styles.stackedInsideRing}>
                                <Text style={[styles.stackedTopDigits, { fontSize: 28, lineHeight: 29, color: isExpired ? colors.danger : colors.textPrimary }]}>
                                    {isRunning ? m : `${uvProfile.durationMinutes}`}
                                </Text>
                                <View style={[styles.stackedSeparatorDot, { backgroundColor: isExpired ? colors.danger : uvProfile.color }]} />
                                <Text style={[styles.stackedBottomDigits, { fontSize: 18, lineHeight: 20, color: isExpired ? colors.danger : uvProfile.color }]}>
                                    {isRunning ? s : '00'}
                                </Text>
                            </View>
                        )
                    }
                />
            </View>

            {/* Button */}
            <TouchableOpacity
                onPress={onButtonPress}
                activeOpacity={0.85}
                style={[
                    styles.widgetButton,
                    {
                        width: '100%',
                        paddingVertical: 8,
                        backgroundColor: isExpired ? colors.danger : isRunning ? colors.accentGreen : colors.primary
                    }
                ]}
            >
                <FontAwesome5 name={isExpired ? "redo-alt" : isRunning ? "redo-alt" : "play"} size={10} color="#FFF" />
                <Text style={[styles.widgetButtonText, { fontSize: 11.5, color: '#FFF' }]}>{buttonText}</Text>
            </TouchableOpacity>
        </View>
    );
};

// ============================================================================
// --- 4. MAIN PREVIEW MODAL ---
// ============================================================================
export const SpfWidgetPreviewModal = ({ visible, onClose }) => {
    const { colors } = useTheme();
    const language = useCurrentLanguage();
    const rtl = useRTL();

    const animController = useRef(new Animated.Value(0)).current;

    // Layout selector ('4x2' | '2x2')
    const [selectedSize, setSelectedSize] = useState('4x2');

    // Live UV Tuning
    const [uvIndex, setUvIndex] = useState(8.5);
    const uvProfile = useMemo(() => getUvProfile(uvIndex), [uvIndex]);

    // Timer States: 'idle' | 'running' | 'expired' | 'safe'
    const [timerState, setTimerState] = useState('idle');

    // Duration in seconds
    const totalDurationSeconds = useMemo(() => {
        return (uvProfile.durationMinutes || 120) * 60;
    }, [uvProfile.durationMinutes]);

    const [remainingSeconds, setRemainingSeconds] = useState(totalDurationSeconds);

    // Sync UV updates
    useEffect(() => {
        if (uvProfile.durationMinutes === 0) {
            setTimerState('safe');
        } else if (timerState === 'safe') {
            setTimerState('idle');
            setRemainingSeconds(totalDurationSeconds);
        } else if (remainingSeconds > totalDurationSeconds) {
            setRemainingSeconds(totalDurationSeconds);
        }
    }, [totalDurationSeconds, uvProfile.durationMinutes]);

    // Countdown loop
    useEffect(() => {
        let interval = null;
        if (timerState === 'running' && visible) {
            interval = setInterval(() => {
                setRemainingSeconds((prev) => {
                    if (prev <= 1) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        setTimerState('expired');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timerState, visible]);

    // PanResponder for smooth dismissal
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    animController.setValue(1 - gestureState.dy / height);
                }
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
            Animated.spring(animController, { toValue: 1, friction: 9, tension: 50, useNativeDriver: true }).start();
            Haptics.selectionAsync();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true })
            .start(({ finished }) => {
                if (finished) onClose();
            });
    };

    // System-level alarm notification
    const scheduleBackgroundNotification = async (durationSec) => {
        try {
            if (Platform.OS === 'web') return;
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === 'granted') {
                await Notifications.cancelAllScheduledNotificationsAsync();
                const triggerDate = new Date(Date.now() + durationSec * 1000);
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: '☀️ حان وقت تجديد واقي الشمس!',
                        body: `مستوى الأشعة الآن (UV ${uvProfile.level}). تلاشت طبقة الحماية، يُرجى التجديد للحفاظ على بشرتك.`,
                        sound: 'default',
                    },
                    trigger: {
                        type: Notifications.SchedulableTriggerInputTypes.DATE,
                        date: triggerDate,
                    },
                });
            }
        } catch (e) {
            console.log('Notification status:', e.message);
        }
    };

    const handleWidgetButtonClick = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (timerState === 'safe') return;

        // Start or Reset/Reapply
        setTimerState('running');
        setRemainingSeconds(totalDurationSeconds);
        scheduleBackgroundNotification(totalDurationSeconds);
    };

    if (!visible) return null;

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height + 150, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <View style={{ flex: 1 }} pointerEvents="box-none">
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                {/* Sheet */}
                <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                    <View style={[styles.sheetContent, { backgroundColor: colors.card }]}>
                        {/* Drag Handle Bar */}
                        <View style={[styles.sheetHandleBar, { backgroundColor: colors.card }]} {...panResponder.panHandlers}>
                            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                        </View>

                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
                            <View style={styles.mainPadding}>
                                
                                {/* Header */}
                                <View style={[styles.headerRow, { flexDirection: rtl.flexDirection }]}>
                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                                        <View style={[styles.headerIconCircle, { backgroundColor: colors.accentGreen + '1A', borderColor: colors.accentGreen + '33' }]}>
                                            <MaterialCommunityIcons name="widgets-outline" size={20} color={colors.accentGreen} />
                                        </View>
                                        <View>
                                            <Text style={[styles.headerTitle, { color: colors.textPrimary, textAlign: rtl.textAlign }]}>
                                                مؤقت وثيق (Android Widget)
                                            </Text>
                                            <Text style={[styles.headerSubtitle, { color: colors.textSecondary, textAlign: rtl.textAlign }]}>
                                                يتغير توقيته تلقائياً حسب شدة أشعة الشمس
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        onPress={handleClose}
                                        style={[styles.closeIconBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                                    >
                                        <FontAwesome5 name="times" size={13} color={colors.textDim} />
                                    </TouchableOpacity>
                                </View>

                                {/* Size Toggle Tabs */}
                                <View style={styles.sizeTabsRow}>
                                    <TouchableOpacity
                                        onPress={() => { Haptics.selectionAsync(); setSelectedSize('4x2'); }}
                                        style={[styles.sizeTabBtn, selectedSize === '4x2' && { backgroundColor: colors.accentGreen }]}
                                    >
                                        <Text style={[styles.sizeTabBtnText, { color: selectedSize === '4x2' ? colors.textOnAccent : colors.textSecondary }]}>
                                            4x2 عريض (Dashboard)
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => { Haptics.selectionAsync(); setSelectedSize('2x2'); }}
                                        style={[styles.sizeTabBtn, selectedSize === '2x2' && { backgroundColor: colors.accentGreen }]}
                                    >
                                        <Text style={[styles.sizeTabBtnText, { color: selectedSize === '2x2' ? colors.textOnAccent : colors.textSecondary }]}>
                                            2x2 مربع (Compact)
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Android Homescreen Preview Sandbox */}
                                <View style={styles.sandboxWrapper}>
                                    <LinearGradient
                                        colors={['#0B111A', '#1A2938', '#0F172A']}
                                        style={StyleSheet.absoluteFill}
                                    />

                                    {/* Mock Android Status Bar */}
                                    <View style={styles.mockStatusBar}>
                                        <Text style={styles.mockClock}>14:30</Text>
                                        <View style={styles.mockIconsRight}>
                                            <Ionicons name="wifi" size={12} color="rgba(255,255,255,0.7)" />
                                            <Ionicons name="battery-full" size={14} color="rgba(255,255,255,0.7)" />
                                        </View>
                                    </View>

                                    {/* Active Widget Slot */}
                                    <View style={styles.activeWidgetSlot}>
                                        {selectedSize === '4x2' ? (
                                            <Widget4x2Dashboard
                                                uvProfile={uvProfile}
                                                timerState={timerState}
                                                remainingSeconds={remainingSeconds}
                                                totalDuration={totalDurationSeconds}
                                                onButtonPress={handleWidgetButtonClick}
                                                colors={colors}
                                            />
                                        ) : (
                                            <Widget2x2Orbit
                                                uvProfile={uvProfile}
                                                timerState={timerState}
                                                remainingSeconds={remainingSeconds}
                                                totalDuration={totalDurationSeconds}
                                                onButtonPress={handleWidgetButtonClick}
                                                colors={colors}
                                            />
                                        )}
                                    </View>

                                    {/* Desktop App Icons */}
                                    <View style={styles.mockDockRow}>
                                        <View style={styles.mockDockApp}><FontAwesome5 name="phone" size={12} color="#FFF" /></View>
                                        <View style={[styles.mockDockApp, { backgroundColor: colors.accentGreen }]}>
                                            <FontAwesome5 name="check" size={12} color="#FFF" />
                                        </View>
                                        <View style={styles.mockDockApp}><FontAwesome5 name="camera" size={12} color="#FFF" /></View>
                                        <View style={styles.mockDockApp}><FontAwesome5 name="comment-alt" size={12} color="#FFF" /></View>
                                    </View>
                                </View>

                                {/* Interactive UV Controls */}
                                <View style={[styles.controlBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                    <Text style={[styles.controlBoxTitle, { color: colors.textPrimary }]}>
                                        اختبار استجابة التوقيت لشدة الأشعة (UV Tuning):
                                    </Text>

                                    {/* UV Number Selection */}
                                    <View style={styles.uvPresetsList}>
                                        {[
                                            { val: 1.5, name: 'آمن (1)' },
                                            { val: 4.5, name: 'معتدل (4)' },
                                            { val: 6.8, name: 'مرتفع (7)' },
                                            { val: 8.5, name: 'شديد (9)' },
                                            { val: 11.5, name: 'قصوى (12)' }
                                        ].map((preset) => (
                                            <TouchableOpacity
                                                key={preset.val}
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setUvIndex(preset.val);
                                                }}
                                                style={[
                                                    styles.uvPresetChip,
                                                    Math.abs(uvIndex - preset.val) < 1.0 && {
                                                        backgroundColor: uvProfile.color,
                                                        borderColor: uvProfile.color
                                                    }
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.uvPresetChipText,
                                                    Math.abs(uvIndex - preset.val) < 1.0 && { color: '#FFF' }
                                                ]}>
                                                    {preset.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {/* State Simulator Buttons */}
                                    <View style={styles.simActionsRow}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setTimerState('expired');
                                                setRemainingSeconds(0);
                                            }}
                                            style={[styles.simActionBtn, { backgroundColor: colors.card }]}
                                        >
                                            <FontAwesome5 name="bell" size={11} color={colors.danger} />
                                            <Text style={[styles.simActionText, { color: colors.danger }]}>
                                                محاكاة انتهاء الوقت (00:00)
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setTimerState('idle');
                                                setRemainingSeconds(totalDurationSeconds);
                                            }}
                                            style={[styles.simActionBtn, { backgroundColor: colors.card }]}
                                        >
                                            <FontAwesome5 name="undo" size={11} color={colors.accentGreen} />
                                            <Text style={[styles.simActionText, { color: colors.textPrimary }]}>
                                                إعادة تعيين
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Notification Assurance */}
                                <View style={[styles.notifInfoCard, { backgroundColor: colors.accentGreen + '0D', borderColor: colors.accentGreen + '26' }]}>
                                    <MaterialCommunityIcons name="alarm-check" size={20} color={colors.accentGreen} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>
                                            تأكيد عمل التنبيه في الخلفية
                                        </Text>
                                        <Text style={[styles.notifDesc, { color: colors.textSecondary }]}>
                                            يتم تسجيل موعد التنبيه في منبه النظام (AlarmManager). سيعمل الإشعار ويهتز الهاتف عند الصفر حتى لو كان التطبيق مغلقاً تماماً أو في وضع توفير الطاقة.
                                        </Text>
                                    </View>
                                </View>

                                {/* Close Button */}
                                <TouchableOpacity
                                    onPress={handleClose}
                                    style={[styles.closeBottomBtn, { backgroundColor: colors.textPrimary }]}
                                    activeOpacity={0.9}
                                >
                                    <Text style={[styles.closeBottomBtnText, { color: colors.card }]}>إغلاق المعاينة</Text>
                                </TouchableOpacity>

                            </View>
                        </ScrollView>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

// ============================================================================
// --- 5. STYLES (TIGHT PADDING, MAXIMUM INNER RING USAGE) ---
// ============================================================================
const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
        zIndex: 1,
    },
    sheetContainer: {
        position: 'absolute',
        bottom: -150,
        left: 0,
        right: 0,
        height: height * 0.92 + 150,
        zIndex: 2,
    },
    sheetContent: {
        flex: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        paddingBottom: 150,
    },
    sheetHandleBar: {
        alignItems: 'center',
        paddingVertical: 14,
        width: '100%',
        zIndex: 10,
    },
    sheetHandle: {
        width: 44,
        height: 4.5,
        borderRadius: 10,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    mainPadding: {
        paddingHorizontal: 18,
        paddingBottom: 25,
    },
    headerRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerIconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    headerTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
    },
    headerSubtitle: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        marginTop: 2,
    },
    closeIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
    },

    // Tabs
    sizeTabsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderRadius: 16,
        padding: 4,
        marginBottom: 14,
        gap: 6,
    },
    sizeTabBtn: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sizeTabBtnText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
    },

    // Sandbox
    sandboxWrapper: {
        borderRadius: 28,
        overflow: 'hidden',
        padding: 14,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        minHeight: 250,
        justifyContent: 'space-between',
        elevation: 8,
    },
    mockStatusBar: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginBottom: 10,
    },
    mockClock: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12.5,
        color: 'rgba(255,255,255,0.8)',
    },
    mockIconsRight: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    activeWidgetSlot: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },
    mockDockRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: 10,
    },
    mockDockApp: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // --- 4x2 Widget Styles (Reduced Padding = 10px, Expanded Ring = 110px) ---
    widget4x2Container: {
        width: '100%',
        borderRadius: 24,
        padding: 10, // Reduced from 14px to maximize element coverage
        borderWidth: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    widgetGaugeCol: {
        width: 110,
        height: 110,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    widgetInfoCol: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 2,
        gap: 4,
    },
    widgetRowHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    brandTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 14,
    },

    // Borderless Pure-Color UV
    borderlessUvWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
    },
    borderlessUvNumber: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 14,
    },

    // Two-Word Status Only
    widgetStatusTwoWords: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12.5,
        textAlign: 'right',
        lineHeight: 16,
    },

    widgetButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    widgetButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
    },

    // --- 2x2 Widget Styles (Padding = 10px, Ring = 106px) ---
    widget2x2Container: {
        width: 174,
        minHeight: 186,
        borderRadius: 26,
        padding: 10, // Reduced from 13px
        borderWidth: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 8,
    },
    centerGaugeHolder: {
        width: 106,
        height: 106,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 2,
        flexShrink: 0,
    },

    // Stacked Inside Ring (Large Digits Filling Interior Space)
    stackedInsideRing: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    stackedTopDigits: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 30, // Large, bold minutes
        lineHeight: 31,
    },
    stackedSeparatorDot: {
        width: 14,
        height: 2,
        borderRadius: 1,
        marginVertical: 1,
    },
    stackedBottomDigits: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 19, // Bold seconds
        lineHeight: 20,
    },
    ringSmallLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        marginTop: 2,
    },

    // Controls Box
    controlBox: {
        borderRadius: 22,
        padding: 16,
        borderWidth: 0.5,
        marginBottom: 16,
        gap: 12,
    },
    controlBoxTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        textAlign: 'right',
    },
    uvPresetsList: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 6,
    },
    uvPresetChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    uvPresetChipText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        color: '#6B7280',
    },
    simActionsRow: {
        flexDirection: 'row-reverse',
        gap: 8,
        marginTop: 4,
    },
    simActionBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.08)',
    },
    simActionText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
    },

    // Notification Card
    notifInfoCard: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        gap: 12,
        padding: 14,
        borderRadius: 18,
        borderWidth: 0.5,
        marginBottom: 16,
    },
    notifTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        textAlign: 'right',
        marginBottom: 3,
    },
    notifDesc: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11.5,
        textAlign: 'right',
        lineHeight: 18,
    },

    closeBottomBtn: {
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBottomBtnText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
    },
});

export default SpfWidgetPreviewModal;