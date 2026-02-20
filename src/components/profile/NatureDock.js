import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    Dimensions, Modal, Pressable, Platform, Easing
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// ============================================================================
// PART 0: ANALYTICS SERVICE (FULLY MOCKED FOR EXPO GO)
// ============================================================================

// Detect if we are running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const trackInteraction = async (eventName, params = {}) => {
    // 1. ALWAYS Log to Console (So you know it's working)
    const mockPrefix = isExpoGo ? '🚫 [MOCK]' : '✅ [REAL]';
    console.log(`${mockPrefix} Analytics: ${eventName}`, params);

    // 2. IF EXPO GO -> STOP HERE.
    // This prevents the app from ever touching the native modules that cause errors.
    if (isExpoGo) {
        return;
    }

    // 3. IF NATIVE BUILD -> LOAD FIREBASE
    try {
        const analytics = require('@react-native-firebase/analytics').default;
        await analytics().logEvent(eventName, params);
    } catch (error) {
        // Safe catch for any other native issues
        console.log('[Analytics Silent Fail]:', error.message);
    }
};

// --- THEME CONTEXT ---
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// ============================================================================
// PART 1: THE SLIDING SHEET COMPONENT
// ============================================================================
const DockSheet = ({ visible, onClose, type, onSelect }) => {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
    const [showModal, setShowModal] = useState(false);
    const [safeType, setSafeType] = useState(type);

    const slideAnim = useRef(new Animated.Value(height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (type) setSafeType(type);
    }, [type]);

    useEffect(() => {
        if (visible) {
            trackInteraction('dock_sheet_open', { sheet_type: type });

            slideAnim.setValue(height);
            fadeAnim.setValue(0);
            setShowModal(true);

            requestAnimationFrame(() => {
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1, duration: 250, useNativeDriver: true
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true
                    })
                ]).start();
            });
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: height, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true })
            ]).start(({ finished }) => {
                if (finished) setShowModal(false);
            });
        }
    }, [visible]);

    const handleAction = (actionId) => {
        Haptics.selectionAsync();
        trackInteraction('dock_action_select', { action_id: actionId, source_sheet: safeType });
        onClose();
        onSelect(actionId);
    };

    if (!showModal) return null;

    const renderContent = () => {
        if (safeType === 'camera') {
            return (
                <>
                    <View style={styles.handle} />
                    <Text style={styles.sheetTitle}>ماذا تريدين أن تفعلي؟</Text>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => handleAction('scan_product')}>
                        <LinearGradient colors={[COLORS.accentGreen, COLORS.accentGreen]} style={styles.actionButtonMain}>
                            <View style={styles.iconBoxMain}>
                                <MaterialIcons name="camera" size={24} color={COLORS.textOnAccent} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.btnTitleMain}>فحص منتج</Text>
                                <Text style={styles.btnSubMain}>تحليل المكونات بالكاميرا</Text>
                            </View>
                            <MaterialIcons name="chevron-left" size={20} color={COLORS.textOnAccent} />
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => handleAction('compare_products')}>
                        <View style={styles.actionButtonSecondary}>
                            <View style={styles.iconBoxSec}>
                                <MaterialIcons name="compare-arrows" size={24} color={COLORS.textPrimary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.btnTitleSec}>مقارنة منتجين</Text>
                                <Text style={styles.btnSubSec}>أيهما أفضل لبشرتك؟</Text>
                            </View>
                            <MaterialIcons name="chevron-left" size={20} color={COLORS.textSecondary} />
                        </View>
                    </TouchableOpacity>
                </>
            );
        }
        if (safeType === 'more') {
            return (
                <>
                    <View style={styles.handle} />
                    <Text style={styles.sheetTitle}>القائمة الكاملة</Text>
                    <View style={styles.menuGrid}>
                        <TouchableOpacity activeOpacity={0.7} onPress={() => handleAction('ingredients')} style={styles.menuItem}>
                            <View style={[styles.menuIconBox, { backgroundColor: COLORS.accentGreen + '26' }]}>
                                <MaterialIcons name="science" size={22} color={COLORS.accentGreen} />
                            </View>
                            <Text style={styles.menuText}>موسوعة مكوناتي</Text>
                            <MaterialIcons name="chevron-left" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity activeOpacity={0.7} onPress={() => handleAction('migration')} style={styles.menuItem}>
                            <View style={[styles.menuIconBox, { backgroundColor: COLORS.gold + '26' }]}>
                                <MaterialIcons name="swap-horiz" size={22} color={COLORS.gold} />
                            </View>
                            <Text style={styles.menuText}>البديل الصحي (قريبا)</Text>
                            <MaterialIcons name="chevron-left" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity activeOpacity={0.7} onPress={() => handleAction('settings')} style={styles.menuItem}>
                            <View style={[styles.menuIconBox, { backgroundColor: COLORS.textSecondary + '1A' }]}>
                                <MaterialIcons name="settings" size={22} color={COLORS.textSecondary} />
                            </View>
                            <Text style={styles.menuText}>الإعدادات</Text>
                            <MaterialIcons name="chevron-left" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </>
            );
        }
        return null;
    };

    return (
        <Modal transparent visible={showModal} onRequestClose={onClose} animationType="none" statusBarTranslucent>
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>
                <Animated.View
                    style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
                    renderToHardwareTextureAndroid={true}
                >
                    {renderContent()}
                </Animated.View>
            </View>
        </Modal>
    );
};

// ============================================================================
// PART 2: DOCK ICON
// ============================================================================
const DockIcon = ({ icon, label, isActive, onPress, specialColor, enablePulse, id }) => {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
    const animValue = useRef(new Animated.Value(isActive ? 1 : 0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(animValue, {
            toValue: isActive ? 1 : 0, friction: 5, tension: 80, useNativeDriver: true,
        }).start();
    }, [isActive]);

    useEffect(() => {
        if (enablePulse && !isActive) {
            const pulseSequence = Animated.loop(
                Animated.sequence([
                    Animated.delay(4000),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                    Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
                ])
            );
            pulseSequence.start();
            return () => pulseSequence.stop();
        } else {
            pulseAnim.setValue(0);
        }
    }, [enablePulse, isActive]);

    const handlePress = () => {
        if (!isActive) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        trackInteraction('dock_tab_click', { tab_id: id });
        onPress();
    };

    const activeColor = specialColor || COLORS.primary;
    const inactiveColor = COLORS.textSecondary;
    const scale = animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

    return (
        <TouchableOpacity activeOpacity={1} onPress={handlePress} style={styles.dockItem}>
            <View style={styles.iconContentContainer}>
                <View>
                    <Animated.View style={{ transform: [{ scale }] }}>
                        <MaterialIcons name={icon} size={26} color={isActive ? activeColor : inactiveColor} />
                    </Animated.View>
                    {enablePulse && !isActive && (
                        <Animated.View style={[
                            StyleSheet.absoluteFill,
                            {
                                opacity: pulseAnim,
                                shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8,
                            }
                        ]}>
                            <MaterialIcons name={icon} size={26} color={COLORS.primary} />
                        </Animated.View>
                    )}
                </View>
                <Text style={[
                    styles.dockLabel,
                    { color: isActive ? activeColor : inactiveColor, fontFamily: isActive ? 'Tajawal-Bold' : 'Tajawal-Regular' }
                ]}>
                    {label}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

// ============================================================================
// PART 3: MAIN NATURE DOCK
// ============================================================================
export const NatureDock = ({ activeTab, onTabChange, navigation }) => {
    const { colors: COLORS } = useTheme();
    const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
    const [sheetState, setSheetState] = useState(null);
    const cameraScale = useRef(new Animated.Value(1)).current;
    const shimmerValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const shimmerLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(200),
                Animated.timing(shimmerValue, {
                    toValue: 1, duration: 1700, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true
                }),
                Animated.timing(shimmerValue, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        shimmerLoop.start();
        return () => shimmerLoop.stop();
    }, []);

    const shimmerTranslate = shimmerValue.interpolate({
        inputRange: [0, 1], outputRange: [-100, 100]
    });

    const handleCameraPress = () => {
        trackInteraction('dock_camera_click');

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.sequence([
            Animated.timing(cameraScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
            Animated.spring(cameraScale, { toValue: 1, friction: 6, useNativeDriver: true })
        ]).start();
        setSheetState('camera');
    };

    const handleSheetSelection = (action) => {
        switch (action) {
            case 'scan_product': navigation.push('/oilguard'); break;
            case 'compare_products': navigation.push('/comparison'); break;
            case 'ingredients': onTabChange('ingredients'); break;
            case 'migration': onTabChange('migration'); break;
            case 'settings': onTabChange('settings'); break;
            default: break;
        }
    };

    const isMoreActive = ['ingredients', 'migration', 'settings'].includes(activeTab);

    return (
        <>
            <View style={styles.dockPosition}>
                <View style={styles.cameraButtonWrapper}>
                    <TouchableOpacity activeOpacity={0.9} onPress={handleCameraPress}>
                        <Animated.View style={[styles.cameraButton, { transform: [{ scale: cameraScale }], overflow: 'hidden' }]}>
                            <LinearGradient
                                colors={[COLORS.accentGreen, '#4a8a73']}
                                style={styles.cameraGradient}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            >
                                <FontAwesome5 name="camera" size={24} color={COLORS.textOnAccent} style={{ zIndex: 2 }} />
                                <Animated.View style={[
                                    styles.shimmerBar,
                                    { transform: [{ translateX: shimmerTranslate }, { rotate: '30deg' }] }
                                ]} />
                            </LinearGradient>
                        </Animated.View>
                    </TouchableOpacity>
                    <Text style={styles.watheeqLabel}>وثيق</Text>
                </View>

                <View style={styles.dockContainer}>
                    <View style={styles.dockSideGroup}>
                        <DockIcon id="community" icon="groups" label="المجتمع" isActive={activeTab === 'community'} onPress={() => navigation.push('/community')} specialColor={COLORS.gold} />
                        <DockIcon id="analysis" icon="bubble-chart" label="تحليل" isActive={activeTab === 'analysis'} onPress={() => onTabChange('analysis')} />
                    </View>
                    <View style={styles.centerSpacer} />
                    <View style={styles.dockSideGroup}>
                        <DockIcon id="routine" icon="spa" label="روتيني" isActive={activeTab === 'routine'} onPress={() => onTabChange('routine')} enablePulse={true} />
                        <DockIcon
                            id="more"
                            icon="menu"
                            label="المزيد"
                            isActive={isMoreActive}
                            onPress={() => {
                                trackInteraction('dock_more_menu_open');
                                setSheetState('more');
                            }}
                        />
                    </View>
                </View>
            </View>

            <DockSheet
                visible={sheetState !== null}
                type={sheetState}
                onClose={() => setSheetState(null)}
                onSelect={handleSheetSelection}
            />
        </>
    );
};

// ============================================================================
// STYLES
// ============================================================================
const createStyles = (COLORS) => StyleSheet.create({
    dockPosition: {
        position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', zIndex: 90,
    },
    dockContainer: {
        flexDirection: 'row-reverse', width: width * 0.94, maxWidth: 420, height: 72,
        backgroundColor: COLORS.card, borderRadius: 35, borderWidth: 1, borderColor: COLORS.border,
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20,
        elevation: 10, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8,
    },
    dockSideGroup: {
        flex: 1, flexDirection: 'row-reverse', justifyContent: 'space-evenly', alignItems: 'center', height: '100%',
    },
    centerSpacer: { width: 80 },
    dockItem: { height: '100%', width: 65, justifyContent: 'center', alignItems: 'center' },
    iconContentContainer: { alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 },
    dockLabel: { fontSize: 11, textAlign: 'center', marginTop: 2, fontFamily: 'Tajawal-Regular' },
    cameraButtonWrapper: {
        position: 'absolute', bottom: 6, zIndex: 95, elevation: 20, alignItems: 'center', justifyContent: 'center',
        shadowColor: COLORS.shadow || "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12,
    },
    cameraButton: { width: 66, height: 66, borderRadius: 33, padding: 4, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
    shimmerBar: {
        position: 'absolute', width: 30, height: 100, backgroundColor: COLORS.textPrimary + '1A', zIndex: 1, // 10% opacity
    },
    watheeqLabel: {
        fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.accentGreen, marginTop: 4,
        letterSpacing: 0.5,
    },
    cameraGradient: {
        flex: 1, borderRadius: 33, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.accentGreen + '40', position: 'relative',
    },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100 },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.card,
        borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: 40,
        borderWidth: 1, borderColor: COLORS.border, zIndex: 101,
        shadowColor: "#000", shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 25,
    },
    handle: { width: 48, height: 5, backgroundColor: COLORS.textDim + '40', borderRadius: 3, alignSelf: 'center', marginBottom: 25 },
    sheetTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 25 },
    actionButtonMain: { flexDirection: 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 15, gap: 15, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.accentGreen },
    actionButtonSecondary: { flexDirection: 'row-reverse', alignItems: 'center', padding: 16, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, gap: 15, marginBottom: 10 },
    iconBoxMain: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.accentGreen + '20', alignItems: 'center', justifyContent: 'center' }, // Light accent bg
    iconBoxSec: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.textDim + '15', alignItems: 'center', justifyContent: 'center' },
    btnTitleMain: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, textAlign: 'right' },
    btnSubMain: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', marginTop: 2 },
    btnTitleSec: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, textAlign: 'right' },
    btnSubSec: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', marginTop: 2 },
    menuGrid: { backgroundColor: COLORS.background, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    menuItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
    menuIconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 15, backgroundColor: COLORS.textDim + '10' },
    menuText: { flex: 1, fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textPrimary, textAlign: 'right' },
    divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 20 }
});