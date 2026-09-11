// src/components/common/NatureDock.js

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Modal,
    Pressable,
    Easing,
} from 'react-native';

import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// ============================================================================
// ANALYTICS
// ============================================================================

const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const trackInteraction = async (eventName, params = {}) => {
    const mockPrefix = isExpoGo ? '🚫 [MOCK]' : '✅ [REAL]';
    console.log(`${mockPrefix} Analytics: ${eventName}`, params);

    if (isExpoGo) return;

    try {
        const analytics =
            require('@react-native-firebase/analytics').default;

        await analytics().logEvent(eventName, params);
    } catch (error) {
        console.log('[Analytics Silent Fail]:', error.message);
    }
};

// ============================================================================
// COLOR HELPERS
// ============================================================================

const withAlpha = (color, alpha = '20') => {
    if (!color) return `#000000${alpha}`;

    // Hex colors
    if (typeof color === 'string' && color.startsWith('#')) {
        const hex = color.replace('#', '');

        if (hex.length === 6) {
            return `#${hex}${alpha}`;
        }

        if (hex.length === 8) {
            return `#${hex.slice(0, 6)}${alpha}`;
        }
    }

    // rgba / other colors
    return color;
};

const getThemeTokens = (COLORS, activeThemeId) => {
    const isLight =
        activeThemeId === 'light' ||
        activeThemeId === 'baby_pink' ||
        activeThemeId === 'pink';

    const primary =
        COLORS.primary ||
        COLORS.accentGreen ||
        COLORS.accent ||
        '#5A9C84';

    const background =
        COLORS.background ||
        '#101E19';

    const card =
        COLORS.card ||
        COLORS.surface ||
        '#1D332B';

    const border =
        COLORS.border ||
        withAlpha(COLORS.textPrimary || '#FFFFFF', '20');

    const textPrimary =
        COLORS.textPrimary ||
        (isLight ? '#26151C' : '#F4F7F5');

    const textSecondary =
        COLORS.textSecondary ||
        (isLight ? '#694A57' : '#AABDB6');

    const textDim =
        COLORS.textDim ||
        (isLight ? '#8C707A' : '#71877E');

    const textOnAccent =
        COLORS.textOnAccent ||
        '#FFFFFF';

    return {
        primary,
        background,
        card,
        border,
        textPrimary,
        textSecondary,
        textDim,
        textOnAccent,
        isLight,
    };
};

// ============================================================================
// SLIDING SHEET
// ============================================================================

const DockSheet = ({
    visible,
    onClose,
    type,
    onSelect,
}) => {
    const { colors: COLORS, activeThemeId } = useTheme();
    const language = useCurrentLanguage();

    const theme = useMemo(
        () => getThemeTokens(COLORS, activeThemeId),
        [COLORS, activeThemeId]
    );

    const styles = useMemo(
        () => createStyles(theme),
        [theme]
    );

    const [showModal, setShowModal] = useState(false);
    const [safeType, setSafeType] = useState(type);

    const slideAnim = useRef(new Animated.Value(height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (type) {
            setSafeType(type);
        }
    }, [type]);

    useEffect(() => {
        if (visible) {
            trackInteraction('dock_sheet_open', {
                sheet_type: type,
            });

            slideAnim.setValue(height);
            fadeAnim.setValue(0);
            setShowModal(true);

            requestAnimationFrame(() => {
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 220,
                        useNativeDriver: true,
                    }),

                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 340,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),

                Animated.timing(slideAnim, {
                    toValue: height,
                    duration: 280,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start(({ finished }) => {
                if (finished) {
                    setShowModal(false);
                }
            });
        }
    }, [visible]);

    const handleAction = (actionId) => {
        Haptics.selectionAsync();

        trackInteraction('dock_action_select', {
            action_id: actionId,
            source_sheet: safeType,
        });

        onClose();
        onSelect(actionId);
    };

    if (!showModal) {
        return null;
    }

    const renderContent = () => {
        // ====================================================================
        // CAMERA / ADD PRODUCT SHEET
        // ====================================================================

        if (safeType === 'camera') {
            return (
                <>
                    <View style={styles.handle} />

                    <View style={styles.sheetHeader}>
                        <View style={styles.sheetHeaderIcon}>
                            <MaterialIcons
                                name="add"
                                size={22}
                                color={theme.primary}
                            />
                        </View>

                        <View style={styles.sheetHeaderText}>
                            <Text style={styles.sheetTitle}>
                                {t(
                                    'dock_camera_sheet_title',
                                    language
                                ) || 'إضافة منتج جديد'}
                            </Text>

                            <Text style={styles.sheetSubtitle}>
                                اختر الطريقة التي تريد استخدامها
                            </Text>
                        </View>
                    </View>

                    {/* PRIMARY ACTION */}
                    <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={() =>
                            handleAction('search_catalog')
                        }
                        style={styles.primaryAction}
                    >
                        <View style={styles.primaryIcon}>
                            <MaterialIcons
                                name="search"
                                size={24}
                                color={theme.textOnAccent}
                            />
                        </View>

                        <View style={styles.actionText}>
                            <Text style={styles.primaryTitle}>
                                {t('dock_catalog', language) ||
                                    'البحث في الكتالوج'}
                            </Text>

                            <Text style={styles.primarySubtitle}>
                                {t('dock_catalog_sub', language) ||
                                    'تصفح آلاف المنتجات المحللة مسبقاً'}
                            </Text>
                        </View>

                        <MaterialIcons
                            name="chevron-left"
                            size={22}
                            color={theme.textOnAccent}
                        />
                    </TouchableOpacity>

                    {/* SCAN */}
                    <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={() =>
                            handleAction('scan_product')
                        }
                        style={styles.secondaryAction}
                    >
                        <View style={styles.secondaryIcon}>
                            <MaterialIcons
                                name="qr-code-scanner"
                                size={23}
                                color={theme.primary}
                            />
                        </View>

                        <View style={styles.actionText}>
                            <Text style={styles.secondaryTitle}>
                                {t('dock_scan_product', language) ||
                                    'مسح الباركود'}
                            </Text>

                            <Text style={styles.secondarySubtitle}>
                                {t(
                                    'dock_scan_product_sub',
                                    language
                                ) ||
                                    'استخدم الكاميرا لتحليل منتج غير موجود'}
                            </Text>
                        </View>

                        <MaterialIcons
                            name="chevron-left"
                            size={22}
                            color={theme.textDim}
                        />
                    </TouchableOpacity>

                    {/* COMPARE */}
                    <TouchableOpacity
                        activeOpacity={0.82}
                        onPress={() =>
                            handleAction('compare_products')
                        }
                        style={styles.secondaryAction}
                    >
                        <View style={styles.secondaryIcon}>
                            <MaterialIcons
                                name="compare-arrows"
                                size={23}
                                color={theme.primary}
                            />
                        </View>

                        <View style={styles.actionText}>
                            <Text style={styles.secondaryTitle}>
                                {t(
                                    'dock_compare_products',
                                    language
                                ) || 'مقارنة المنتجات'}
                            </Text>

                            <Text style={styles.secondarySubtitle}>
                                {t(
                                    'dock_compare_products_sub',
                                    language
                                ) ||
                                    'مقارنة المكونات لاختيار الأفضل'}
                            </Text>
                        </View>

                        <MaterialIcons
                            name="chevron-left"
                            size={22}
                            color={theme.textDim}
                        />
                    </TouchableOpacity>
                </>
            );
        }

        // ====================================================================
        // MORE SHEET
        // ====================================================================

        if (safeType === 'more') {
            const menuItems = [
                {
                    action: 'ingredients',
                    icon: 'science',
                    color: theme.primary,
                    label: t(
                        'dock_ingredients_menu',
                        language
                    ),
                },
                {
                    action: 'migration',
                    icon: 'swap-horiz',
                    color: COLORS.gold || theme.primary,
                    label: t(
                        'dock_migration_menu',
                        language
                    ),
                },
                {
                    action: 'reminders',
                    icon: 'alarm',
                    color: COLORS.info || theme.primary,
                    label: t(
                        'dock_reminders_menu',
                        language
                    ),
                },
                {
                    action: 'settings',
                    icon: 'settings',
                    color: theme.textSecondary,
                    label: t(
                        'dock_settings_menu',
                        language
                    ),
                },
            ];

            return (
                <>
                    <View style={styles.handle} />

                    <View style={styles.sheetHeader}>
                        <View style={styles.sheetHeaderIcon}>
                            <MaterialIcons
                                name="apps"
                                size={21}
                                color={theme.primary}
                            />
                        </View>

                        <View style={styles.sheetHeaderText}>
                            <Text style={styles.sheetTitle}>
                                {t(
                                    'dock_full_menu',
                                    language
                                )}
                            </Text>

                            <Text style={styles.sheetSubtitle}>
                                أدوات وثيق
                            </Text>
                        </View>
                    </View>

                    <View style={styles.menuGrid}>
                        {menuItems.map((item, index) => (
                            <React.Fragment key={item.action}>
                                <TouchableOpacity
                                    activeOpacity={0.72}
                                    onPress={() =>
                                        handleAction(item.action)
                                    }
                                    style={styles.menuItem}
                                >
                                    <View
                                        style={[
                                            styles.menuIconBox,
                                            {
                                                backgroundColor:
                                                    withAlpha(
                                                        item.color,
                                                        '18'
                                                    ),
                                            },
                                        ]}
                                    >
                                        <MaterialIcons
                                            name={item.icon}
                                            size={21}
                                            color={item.color}
                                        />
                                    </View>

                                    <Text style={styles.menuText}>
                                        {item.label}
                                    </Text>

                                    <MaterialIcons
                                        name="chevron-left"
                                        size={20}
                                        color={theme.textDim}
                                    />
                                </TouchableOpacity>

                                {index <
                                    menuItems.length - 1 && (
                                    <View
                                        style={
                                            styles.divider
                                        }
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                </>
            );
        }

        return null;
    };

    return (
        <Modal
            transparent
            visible={showModal}
            onRequestClose={onClose}
            animationType="none"
            statusBarTranslucent
        >
            <View
                style={StyleSheet.absoluteFill}
                pointerEvents="box-none"
            >
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={onClose}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [
                                {
                                    translateY: slideAnim,
                                },
                            ],
                        },
                    ]}
                    renderToHardwareTextureAndroid
                >
                    {renderContent()}
                </Animated.View>
            </View>
        </Modal>
    );
};

// ============================================================================
// DOCK ICON
// ============================================================================

const DockIcon = ({
    icon,
    label,
    isActive,
    onPress,
    specialColor,
    enablePulse,
    id,
}) => {
    const { colors: COLORS, activeThemeId } = useTheme();

    const theme = useMemo(
        () => getThemeTokens(COLORS, activeThemeId),
        [COLORS, activeThemeId]
    );

    const styles = useMemo(
        () => createStyles(theme),
        [theme]
    );

    const animValue = useRef(
        new Animated.Value(isActive ? 1 : 0)
    ).current;

    const pulseAnim = useRef(
        new Animated.Value(0)
    ).current;

    useEffect(() => {
        Animated.spring(animValue, {
            toValue: isActive ? 1 : 0,
            friction: 7,
            tension: 80,
            useNativeDriver: true,
        }).start();
    }, [isActive]);

    useEffect(() => {
        if (enablePulse && !isActive) {
            const pulseSequence = Animated.loop(
                Animated.sequence([
                    Animated.delay(4500),

                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1300,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),

                    Animated.timing(pulseAnim, {
                        toValue: 0,
                        duration: 1300,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );

            pulseSequence.start();

            return () => pulseSequence.stop();
        }

        pulseAnim.setValue(0);
    }, [enablePulse, isActive]);

    const handlePress = () => {
        if (!isActive) {
            Haptics.impactAsync(
                Haptics.ImpactFeedbackStyle.Light
            );
        }

        trackInteraction('dock_tab_click', {
            tab_id: id,
        });

        onPress();
    };

    const activeColor =
        specialColor || theme.primary;

    const inactiveColor =
        theme.textSecondary;

    const scale = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.06],
    });

    const activeOpacity = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={handlePress}
            style={styles.dockItem}
        >

            <View style={styles.iconContentContainer}>
                <Animated.View
                    style={{
                        transform: [{ scale }],
                    }}
                >
                    <MaterialIcons
                        name={icon}
                        size={25}
                        color={
                            isActive
                                ? activeColor
                                : inactiveColor
                        }
                    />
                </Animated.View>

                {enablePulse && !isActive && (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.pulseIcon,
                            {
                                opacity: pulseAnim,
                            },
                        ]}
                    >
                        <MaterialIcons
                            name={icon}
                            size={25}
                            color={theme.primary}
                        />
                    </Animated.View>
                )}

                <Text
                    numberOfLines={1}
                    style={[
                        styles.dockLabel,
                        {
                            color: isActive
                                ? activeColor
                                : inactiveColor,
                            fontFamily: isActive
                                ? 'Tajawal-ExtraBold'
                                : 'Tajawal-Bold'
                        },
                    ]}
                >
                    {label}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

// ============================================================================
// MAIN NATURE DOCK
// ============================================================================

export const NatureDock = ({
    activeTab,
    onTabChange,
    navigation,
}) => {
    const { colors: COLORS, activeThemeId } =
        useTheme();

    const language = useCurrentLanguage();

    const theme = useMemo(
        () => getThemeTokens(COLORS, activeThemeId),
        [COLORS, activeThemeId]
    );

    const styles = useMemo(
        () => createStyles(theme),
        [theme]
    );

    const [sheetState, setSheetState] =
        useState(null);

    const cameraScale = useRef(
        new Animated.Value(1)
    ).current;

    const cameraPressAnim = () => {
        Animated.sequence([
            Animated.timing(cameraScale, {
                toValue: 0.91,
                duration: 90,
                useNativeDriver: true,
            }),

            Animated.spring(cameraScale, {
                toValue: 1,
                friction: 5,
                tension: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleCameraPress = () => {
        trackInteraction('dock_camera_click');

        Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
        );

        cameraPressAnim();

        setSheetState('camera');
    };

    const handleSheetSelection = (action) => {
        switch (action) {
            case 'scan_product':
                navigation.push('/oilguard');
                break;

            case 'compare_products':
                navigation.push('/comparison');
                break;

            case 'search_catalog':
                navigation.push('/CatalogScreen');
                break;

            case 'ingredients':
                onTabChange('ingredients');
                break;

            case 'reminders':
                onTabChange('reminders');
                break;

            case 'migration':
                onTabChange('migration');
                break;

            case 'settings':
                onTabChange('settings');
                break;

            default:
                break;
        }
    };

    const isMoreActive = [
        'ingredients',
        'migration',
        'settings',
    ].includes(activeTab);

    return (
        <>
            {/* ================================================================
                FLOATING NAVIGATION DOCK
            ================================================================ */}

            <View
                style={styles.dockPosition}
                pointerEvents="box-none"
            >
                {/* ============================================================
                    CENTER ADD BUTTON
                ============================================================ */}

                <View
                    style={styles.cameraButtonWrapper}
                    pointerEvents="box-none"
                >
                    <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={handleCameraPress}
                    >
                        <Animated.View
                            style={[
                                styles.cameraButton,
                                {
                                    transform: [
                                        {
                                            scale: cameraScale,
                                        },
                                    ],
                                },
                            ]}
                        >
                            <View
                                style={
                                    styles.cameraButtonInner
                                }
                            >
                                <FontAwesome5
                                    name="plus"
                                    size={22}
                                    color={
                                        theme.textOnAccent
                                    }
                                />
                            </View>
                        </Animated.View>
                    </TouchableOpacity>

                    <Text
                        style={[
                            styles.watheeqLabel,
                            {
                                color: theme.primary,
                            },
                        ]}
                    >
                        {t(
                            'brand_wathiq',
                            language
                        ) || 'إضافة'}
                    </Text>
                </View>

                {/* ============================================================
                    NAVIGATION BAR
                ============================================================ */}

                <View style={styles.dockContainer}>
                    <View style={styles.dockSideGroup}>
                        <DockIcon
                            id="community"
                            icon="groups"
                            label={t(
                                'dock_label_community',
                                language
                            )}
                            isActive={
                                activeTab ===
                                'community'
                            }
                            onPress={() =>
                                navigation.push(
                                    '/community'
                                )
                            }
                            specialColor={
                                COLORS.gold ||
                                theme.primary
                            }
                        />

                        <DockIcon
                            id="analysis"
                            icon="bubble-chart"
                            label={t(
                                'dock_label_analysis',
                                language
                            )}
                            isActive={
                                activeTab ===
                                'analysis'
                            }
                            onPress={() =>
                                onTabChange(
                                    'analysis'
                                )
                            }
                        />
                    </View>

                    {/* Physical space reserved for center button */}
                    <View
                        style={styles.centerSpacer}
                    />

                    <View style={styles.dockSideGroup}>
                        <DockIcon
    id="catalog"
    icon="storefront"
    label={t(
        'dock_label_catalog',
        language
    )}
    isActive={false}
    onPress={() =>
        navigation.push('/CatalogScreen')
    }
/>


                        <DockIcon
                            id="more"
                            icon="menu"
                            label={t(
                                'dock_label_more',
                                language
                            )}
                            isActive={
                                isMoreActive
                            }
                            onPress={() => {
                                trackInteraction(
                                    'dock_more_menu_open'
                                );

                                setSheetState(
                                    'more'
                                );
                            }}
                        />
                    </View>
                </View>
            </View>

            {/* ================================================================
                ACTION SHEET
            ================================================================ */}

            <DockSheet
                visible={
                    sheetState !== null
                }
                type={sheetState}
                onClose={() =>
                    setSheetState(null)
                }
                onSelect={
                    handleSheetSelection
                }
            />
        </>
    );
};

// ============================================================================
// STYLES
// ============================================================================

const createStyles = (theme) =>
    StyleSheet.create({
        // ====================================================================
        // DOCK
        // ====================================================================

        dockPosition: {
            position: 'absolute',
            bottom: 35,
            left: 0,
            right: 0,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 90,
        },

        dockContainer: {
            flexDirection: 'row-reverse',
            width: width * 0.92,
            maxWidth: 430,
            height: 68,

            backgroundColor: theme.card,

            borderRadius: 34,

            borderWidth: 0.5,
            borderColor: theme.border,

            alignItems: 'center',
            justifyContent: 'space-between',

            paddingHorizontal: 7,

            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 6,
            },
            shadowOpacity: theme.isLight
                ? 0.08
                : 0.22,
            shadowRadius: 16,

            elevation: theme.isLight
                ? 5
                : 10,
        },

        dockSideGroup: {
            flex: 1,

            flexDirection: 'row-reverse',

            justifyContent: 'space-evenly',
            alignItems: 'center',

            height: '100%',
        },

        centerSpacer: {
            width: 76,
        },

        dockItem: {
            position: 'relative',

            width: 64,
            height: 56,

            alignItems: 'center',
            justifyContent: 'center',

            borderRadius: 20,
        },

        iconContentContainer: {
            alignItems: 'center',
            justifyContent: 'center',

            height: '100%',
            width: '100%',

            gap: 2,

            zIndex: 2,
        },

        pulseIcon: {
    position: 'absolute',
    top: 6, // Aligns directly over the 25px icon only
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    // Removed the heavy shadow properties entirely
},

        dockLabel: {
            fontSize: 12,
            lineHeight: 15,

            textAlign: 'center',

            marginTop: 1,

            maxWidth: 62,
        },

        // ====================================================================
        // CENTER ADD BUTTON
        // ====================================================================

        cameraButtonWrapper: {
            position: 'absolute',

            bottom: 7,

            zIndex: 95,
            elevation: 20,

            alignItems: 'center',
            justifyContent: 'center',
        },

        cameraButton: {
            width: 68,
            height: 68,

            borderRadius: 34,

            padding: 4,

            backgroundColor: theme.card,

            borderWidth: 0.5,
            borderColor: theme.border,

            shadowColor: '#000',

            shadowOffset: {
                width: 0,
                height: 5,
            },

            shadowOpacity: theme.isLight
                ? 0.1
                : 0.28,

            shadowRadius: 12,

            elevation: 14,

            alignItems: 'center',
            justifyContent: 'center',
        },

        cameraButtonInner: {
            width: 58,
            height: 58,

            borderRadius: 29,

            backgroundColor: theme.primary,

            alignItems: 'center',
            justifyContent: 'center',
        },

        watheeqLabel: {
            fontFamily: 'Tajawal-Bold',
            fontSize: 12,

            marginTop: 3,

            letterSpacing: 0.2,
        },

        // ====================================================================
        // SHEET
        // ====================================================================

        backdrop: {
            ...StyleSheet.absoluteFillObject,

            backgroundColor: 'rgba(0,0,0,0.48)',

            zIndex: 100,
        },

        sheet: {
            position: 'absolute',

            bottom: 0,
            left: 0,
            right: 0,

            backgroundColor: theme.background,

            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,

            borderWidth: 0.5,
            borderBottomWidth: 0,

            borderColor: theme.border,

            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 34,

            zIndex: 101,

            shadowColor: '#000',

            shadowOffset: {
                width: 0,
                height: -5,
            },

            shadowOpacity: theme.isLight
                ? 0.08
                : 0.25,

            shadowRadius: 20,

            elevation: 25,
        },

        handle: {
            width: 42,
            height: 4,

            backgroundColor: withAlpha(
                theme.textSecondary,
                '45'
            ),

            borderRadius: 3,

            alignSelf: 'center',

            marginBottom: 20,
        },

        // ====================================================================
        // SHEET HEADER
        // ====================================================================

        sheetHeader: {
            flexDirection: 'row-reverse',

            alignItems: 'center',

            marginBottom: 20,
        },

        sheetHeaderIcon: {
            width: 42,
            height: 42,

            borderRadius: 14,

            backgroundColor: withAlpha(
                theme.primary,
                '14'
            ),

            borderWidth: 0.5,
            borderColor: withAlpha(
                theme.primary,
                '25'
            ),

            alignItems: 'center',
            justifyContent: 'center',

            marginLeft: 12,
        },

        sheetHeaderText: {
            flex: 1,
        },

        sheetTitle: {
            fontFamily: 'Tajawal-Bold',

            fontSize: 20,

            color: theme.textPrimary,

            textAlign: 'right',
        },

        sheetSubtitle: {
            fontFamily: 'Tajawal-Regular',

            fontSize: 11,

            color: theme.textSecondary,

            textAlign: 'right',

            marginTop: 2,
        },

        // ====================================================================
        // PRIMARY ACTION
        // ====================================================================

        primaryAction: {
            flexDirection: 'row-reverse',

            alignItems: 'center',

            paddingHorizontal: 15,
            paddingVertical: 14,

            borderRadius: 19,

            marginBottom: 11,

            backgroundColor: theme.primary,

            minHeight: 76,
        },

        primaryIcon: {
            width: 44,
            height: 44,

            borderRadius: 14,

            backgroundColor:
                'rgba(255,255,255,0.18)',

            alignItems: 'center',
            justifyContent: 'center',

            marginLeft: 13,
        },

        actionText: {
            flex: 1,
        },

        primaryTitle: {
            fontFamily: 'Tajawal-Bold',

            fontSize: 15,

            color: theme.textOnAccent,

            textAlign: 'right',
        },

        primarySubtitle: {
            fontFamily: 'Tajawal-Regular',

            fontSize: 11,

            color: theme.textOnAccent,

            textAlign: 'right',

            marginTop: 2,
        },

        // ====================================================================
        // SECONDARY ACTIONS
        // ====================================================================

        secondaryAction: {
            flexDirection: 'row-reverse',

            alignItems: 'center',

            paddingHorizontal: 15,
            paddingVertical: 12,

            borderRadius: 18,

            marginBottom: 9,

            minHeight: 70,

            backgroundColor: theme.card,

            borderWidth: 0.5,

            borderColor: theme.border,
        },

        secondaryIcon: {
            width: 43,
            height: 43,

            borderRadius: 13,

            backgroundColor: withAlpha(
                theme.primary,
                '13'
            ),

            alignItems: 'center',
            justifyContent: 'center',

            marginLeft: 13,
        },

        secondaryTitle: {
            fontFamily: 'Tajawal-Bold',

            fontSize: 15,

            color: theme.textPrimary,

            textAlign: 'right',
        },

        secondarySubtitle: {
            fontFamily: 'Tajawal-Regular',

            fontSize: 11,

            color: theme.textSecondary,

            textAlign: 'right',

            marginTop: 2,
        },

        // ====================================================================
        // MORE MENU
        // ====================================================================

        menuGrid: {
            backgroundColor: theme.card,

            borderRadius: 20,

            borderWidth: 0.5,

            borderColor: theme.border,

            overflow: 'hidden',
        },

        menuItem: {
            flexDirection: 'row-reverse',

            alignItems: 'center',

            minHeight: 64,

            paddingVertical: 10,
            paddingHorizontal: 16,
        },

        menuIconBox: {
            width: 40,
            height: 40,

            borderRadius: 13,

            alignItems: 'center',
            justifyContent: 'center',

            marginLeft: 13,
        },

        menuText: {
            flex: 1,

            fontFamily: 'Tajawal-Bold',

            fontSize: 14,

            color: theme.textPrimary,

            textAlign: 'right',
        },

        divider: {
            height: 1,

            backgroundColor: theme.border,

            marginHorizontal: 16,
        },
    });

export default NatureDock;