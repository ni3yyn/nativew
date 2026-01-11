import React, { useState, useRef, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Animated, 
    Dimensions, Modal, Pressable, Platform, Easing 
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// --- THEME COLORS ---
const COLORS = {
    background: '#1A2D27',
    card: '#253D34',
    border: 'rgba(90, 156, 132, 0.25)',
    textPrimary: '#F1F3F2',
    textSecondary: '#A3B1AC',
    accentGreen: '#5A9C84',
    mint: '#A3E4D7',
    textOnAccent: '#1A2D27',
    gold: '#fbbf24',
    danger: '#ef4444'
};

// ============================================================================
// PART 1: THE SLIDING SHEET COMPONENT (FIXED CONTENT SWAPPING)
// ============================================================================
const DockSheet = ({ visible, onClose, type, onSelect }) => {
    // 1. Controls whether the Modal is physically mounted in the tree
    const [showModal, setShowModal] = useState(false);
    
    // 2. Remembers the content (Camera vs More) so it doesn't swap during close animation
    const [safeType, setSafeType] = useState(type);

    const slideAnim = useRef(new Animated.Value(height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Sync safeType: Only update if 'type' is valid. 
    // If 'type' becomes null (closing), keep the old 'safeType'.
    useEffect(() => {
        if (type) {
            setSafeType(type);
        }
    }, [type]);

    useEffect(() => {
        if (visible) {
            // OPEN
            setShowModal(true);
            Animated.parallel([
                Animated.timing(fadeAnim, { 
                    toValue: 1, 
                    duration: 250, 
                    useNativeDriver: true 
                }),
                Animated.timing(slideAnim, { 
                    toValue: 0, 
                    duration: 350, 
                    easing: Easing.out(Easing.cubic), 
                    useNativeDriver: true 
                })
            ]).start();
        } else {
            // CLOSE
            Animated.parallel([
                Animated.timing(fadeAnim, { 
                    toValue: 0, 
                    duration: 250, 
                    useNativeDriver: true 
                }),
                Animated.timing(slideAnim, { 
                    toValue: height, 
                    duration: 300, 
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true 
                })
            ]).start(({ finished }) => {
                if (finished) {
                    setShowModal(false);
                }
            });
        }
    }, [visible]);

    const handleAction = (actionId) => {
        Haptics.selectionAsync();
        onClose(); // Triggers the close animation in useEffect above
        onSelect(actionId);
    };

    if (!showModal) return null;

    // Use 'safeType' for rendering, not 'type' (which might be null)
    const renderContent = () => {
        if (safeType === 'camera') {
            return (
                <>
                    <View style={styles.handle} />
                    <Text style={styles.sheetTitle}>ماذا تريدين أن تفعلي؟</Text>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => handleAction('scan_product')}>
                        <LinearGradient colors={[COLORS.accentGreen, '#4a8a73']} style={styles.actionButtonMain}>
                            <View style={styles.iconBoxMain}>
                                <MaterialIcons name="qr-code-scanner" size={24} color={COLORS.textOnAccent} />
                            </View>
                            <View style={{flex: 1}}>
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
                            <View style={{flex: 1}}>
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
                            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(90, 156, 132, 0.15)' }]}>
                                <MaterialIcons name="science" size={22} color={COLORS.accentGreen} />
                            </View>
                            <Text style={styles.menuText}>موسوعة مكوناتي</Text>
                            <MaterialIcons name="chevron-left" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity activeOpacity={0.7} onPress={() => handleAction('migration')} style={styles.menuItem}>
                            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                                <MaterialIcons name="swap-horiz" size={22} color={COLORS.gold} />
                            </View>
                            <Text style={styles.menuText}>البديل الصحي (قريبا)</Text>
                            <MaterialIcons name="chevron-left" size={18} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity activeOpacity={0.7} onPress={() => handleAction('settings')} style={styles.menuItem}>
                            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
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
                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    {renderContent()}
                </Animated.View>
            </View>
        </Modal>
    );
};

// ============================================================================
// PART 2: DOCK ICON
// ============================================================================
const DockIcon = ({ icon, label, isActive, onPress, specialColor }) => {
    const animValue = useRef(new Animated.Value(isActive ? 1 : 0)).current;
    
    useEffect(() => {
        Animated.spring(animValue, {
            toValue: isActive ? 1 : 0,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
        }).start();
    }, [isActive]);

    const handlePress = () => {
        if (!isActive) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    const activeColor = specialColor || COLORS.mint;
    const inactiveColor = COLORS.textSecondary;

    const scale = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.15] 
    });

    return (
        <TouchableOpacity activeOpacity={1} onPress={handlePress} style={styles.dockItem}>
            <View style={styles.iconContentContainer}>
                <Animated.View style={{ transform: [{ scale }] }}>
                    <MaterialIcons 
                        name={icon} 
                        size={26} 
                        color={isActive ? activeColor : inactiveColor} 
                    />
                </Animated.View>
                <Text style={[
                    styles.dockLabel, 
                    { 
                        color: isActive ? activeColor : inactiveColor,
                        fontFamily: isActive ? 'Tajawal-Bold' : 'Tajawal-Regular' 
                    }
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
    const [sheetState, setSheetState] = useState(null); // 'camera', 'more', or null
    const cameraScale = useRef(new Animated.Value(1)).current;

    const handleCameraPress = () => {
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
                        <Animated.View style={[styles.cameraButton, { transform: [{ scale: cameraScale }] }]}>
                            <LinearGradient
                                colors={[COLORS.accentGreen, '#4a8a73']}
                                style={styles.cameraGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <FontAwesome5 name="camera" size={24} color={COLORS.textOnAccent} />
                            </LinearGradient>
                        </Animated.View>
                    </TouchableOpacity>
                </View>

                <View style={styles.dockContainer}>
                    <View style={styles.dockSideGroup}>
                        <DockIcon 
                            icon="groups" 
                            label="المجتمع" 
                            isActive={activeTab === 'community'} 
                            onPress={() => navigation.push('/community')} // <--- UPDATED: Direct navigation
                            specialColor={COLORS.gold}
                        />
                        <DockIcon 
                            icon="bubble-chart" 
                            label="تحليل" 
                            isActive={activeTab === 'analysis'} 
                            onPress={() => onTabChange('analysis')}
                        />
                    </View>
                    <View style={styles.centerSpacer} />
                    <View style={styles.dockSideGroup}>
                        <DockIcon 
                            icon="spa" 
                            label="روتيني" 
                            isActive={activeTab === 'routine'} 
                            onPress={() => onTabChange('routine')}
                        />
                        <DockIcon 
                            icon="menu" 
                            label="المزيد" 
                            isActive={isMoreActive} 
                            onPress={() => setSheetState('more')}
                        />
                    </View>
                </View>
            </View>

            {/* Pass sheetState directly. Child handles persistence. */}
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
const styles = StyleSheet.create({
    dockPosition: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 90,
    },
    dockContainer: {
        flexDirection: 'row-reverse',
        width: width * 0.94,
        maxWidth: 420,
        height: 72,
        backgroundColor: 'rgba(37, 61, 52, 0.98)', 
        borderRadius: 35,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 15,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    dockSideGroup: {
        flex: 1,
        flexDirection: 'row-reverse',
        justifyContent: 'space-evenly', 
        alignItems: 'center',
        height: '100%',
    },
    centerSpacer: {
        width: 80,
    },
    dockItem: {
        height: '100%',
        width: 65,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 4,
    },
    dockLabel: {
        fontSize: 11,
        textAlign: 'center',
        marginTop: 2,
    },
    cameraButtonWrapper: {
        position: 'absolute',
        bottom: 22,
        zIndex: 95,
        elevation: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.mint,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
    },
    cameraButton: {
        width: 66,
        height: 66,
        borderRadius: 33,
        padding: 4,
        backgroundColor: COLORS.background,
    },
    cameraGradient: {
        flex: 1,
        borderRadius: 33,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.25)'
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 100,
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 25,
        paddingBottom: 40,
        borderWidth: 1,
        borderColor: COLORS.border,
        zIndex: 101,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 25,
    },
    handle: {
        width: 48,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 25,
    },
    sheetTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 25,
    },
    actionButtonMain: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 15,
        gap: 15,
    },
    actionButtonSecondary: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 15,
    },
    iconBoxMain: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBoxSec: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnTitleMain: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textOnAccent, textAlign: 'right' },
    btnSubMain: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: 'rgba(26, 45, 39, 0.7)', textAlign: 'right', marginTop: 2 },
    btnTitleSec: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, textAlign: 'right' },
    btnSubSec: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', marginTop: 2 },
    menuGrid: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    menuIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 15,
    },
    menuText: {
        flex: 1,
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: COLORS.textPrimary,
        textAlign: 'right',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginLeft: 20,
    }
});