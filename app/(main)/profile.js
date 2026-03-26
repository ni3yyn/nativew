import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity, Pressable, Image,
    Dimensions, ScrollView, Animated, ImageBackground, Modal, FlatList, BackHandler,
    Platform, UIManager, Alert, StatusBar, ActivityIndicator, LayoutAnimation,
    RefreshControl, Keyboard, Easing, I18nManager, AppState, KeyboardAvoidingView,
    InteractionManager
} from 'react-native';
import * as Linking from 'expo-linking';
import { TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { doc, updateDoc, Timestamp, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useAppContext } from '../../src/context/AppContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, Rect, Mask, Circle, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import * as Location from 'expo-location';
import { generateFingerprint } from '../../src/utils/cacheHelpers';
import AuthenticHeader from '../../src/utils/AuthenticHeader';
import { t, getLocalizedValue } from '../../src/i18n';
import { useCurrentLanguage } from '../../src/hooks/useCurrentLanguage';
import {
    commonAllergies,
    commonConditions,
    basicSkinTypes,
    basicScalpTypes
} from '../../src/data/allergiesandconditions';
import { PRODUCT_TYPES } from '../../src/constants/productData';
import { AlertService } from '../../src/services/alertService';
import WathiqScoreBadge from '../../src/components/common/WathiqScoreBadge'; 
import {
    ShelfEmptyState,
    AnalysisEmptyState,
    RoutineEmptyState,
    IngredientsEmptyState,
    MigrationSuccessState
} from '../../src/components/profile/EmptyStates';
import {
    WeatherLoadingCard,
    WeatherCompactWidget,
    WeatherMiniCard,
    WeatherDetailedSheet,
    LocationPermissionModal
} from '../../src/components/profile/WeatherComponents';
import { AnalysisSection } from '../../src/components/profile/AnalysisSection';
import { PressableScale, ContentCard, StaggeredItem } from '../../src/components/profile/analysis/AnalysisShared';
import { RoutineLogViewer } from '../../src/components/profile/routine/RoutineLogViewer';
import { RoutineSection, AddStepModal } from '../../src/components/profile/routine/routinesection';
import { NatureDock } from '../../src/components/profile/NatureDock';
import PremiumShareButton from '../../src/components/oilguard/ShareComponent';
import { RemindersScreen } from '../../src/components/profile/routine/RemindersScreen';

// --- 1. SYSTEM CONFIG ---

const PROFILE_API_URL = "https://oilguard-backend.vercel.app/api";

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

let AdsConsent;
try {
    if (Platform.OS !== 'web') {
        const mobileAds = require('react-native-google-mobile-ads');
        AdsConsent = mobileAds.AdsConsent;
    } else {
        throw new Error('AdMob not supported on web');
    }
} catch (e) {
    console.log('AdMob native module not found (running in Expo Go). Using Mock.');
    AdsConsent = {
        showPrivacyOptionsForm: async () => {
            console.log('Privacy Form Mock triggered');
            return { status: 'mocked' };
        }
    };
}

// --- 2. THEME & ASSETS ---
import { useTheme, THEMES } from '../../src/context/ThemeContext';

const getHeaderTitle = (key, language) => {
    const titles = {
        shelf: { title: t('profile_header_shelf', language), icon: 'list' },
        routine: { title: t('profile_header_routine', language), icon: 'calendar-check' },
        analysis: { title: t('profile_header_analysis', language), icon: 'chart-pie' },
        migration: { title: t('profile_header_migration', language), icon: 'exchange-alt' },
        ingredients: { title: t('profile_header_ingredients', language), icon: 'flask' },
        settings: { title: t('profile_header_settings', language), icon: 'cog' },
        reminders: { title: t('profile_header_reminders', language), icon: 'clock' },
    };
    return titles[key] || { title: t('profile_title_fallback', language), icon: 'user' };
};

const HEALTH_OPTS =[
    { id: 'acne_prone', label: t('health_opt_acne', 'ar') },
    { id: 'sensitive_skin', label: t('health_opt_sensitive', 'ar') },
    { id: 'rosacea_prone', label: t('health_opt_rosacea', 'ar') },
    { id: 'eczema', label: t('health_opt_eczema', 'ar') },
    { id: 'pregnancy', label: t('health_opt_pregnancy', 'ar') }
];

const BASIC_HAIR_TYPES =[
    { id: 'straight', label: t('hair_type_straight', 'ar'), icon: 'stream' },
    { id: 'wavy', label: t('hair_type_wavy', 'ar'), icon: 'water' },
    { id: 'curly', label: t('hair_type_curly', 'ar'), icon: 'holly-berry' },
    { id: 'coily', label: t('hair_type_coily', 'ar'), icon: 'dna' }
];
const BASIC_SKIN_TYPES =[
    { id: 'oily', label: t('skin_type_oily', 'ar'), icon: 'blurType' },
    { id: 'dry', label: t('skin_type_dry', 'ar'), icon: 'leaf' },
    { id: 'combo', label: t('skin_type_combo', 'ar'), icon: 'adjust' },
    { id: 'normal', label: t('skin_type_normal', 'ar'), icon: 'smile' },
    { id: 'sensitive', label: t('skin_type_sensitive', 'ar'), icon: 'heartbeat' }
];

const GOALS_LIST =[
    { id: 'brightening', label: t('goal_brightening', 'ar'), icon: 'sun' },
    { id: 'acne', label: t('goal_acne', 'ar'), icon: 'shield-alt' },
    { id: 'anti_aging', label: t('goal_anti_aging', 'ar'), icon: 'hourglass-half' },
    { id: 'hydration', label: t('goal_hydration', 'ar'), icon: 'blurType' },
    { id: 'texture_pores', label: t('goal_texture', 'ar'), icon: 'th-large' },
];

const INGREDIENT_FILTERS =[
    { id: 'all', label: t('ing_filter_all', 'ar'), icon: 'layer-group' },
    { id: 'exfoliants', label: t('ing_filter_exfoliants', 'ar'), icon: 'magic' },
    { id: 'hydrators', label: t('ing_filter_hydrators', 'ar'), icon: 'blurType' },
    { id: 'antioxidants', label: t('ing_filter_antioxidants', 'ar'), icon: 'shield-alt' },
    { id: 'oils', label: t('ing_filter_oils', 'ar'), icon: 'oil-can' },
];

// ============================================================================
//                       CORE ANIMATION COMPONENTS
// ============================================================================

const Spore = ({ size, startX, duration, delay }) => {
    const { colors: C } = useTheme();
    const animY = useRef(new Animated.Value(0)).current;
    const animX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let timeout;
        
        const floatLoop = Animated.loop(
            Animated.timing(animY, {
                toValue: 1,
                duration,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                useNativeDriver: true
            })
        );

        const driftLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(animX, {
                    toValue: 1,
                    duration: duration * 0.35,
                    useNativeDriver: true,
                    easing: Easing.sin
                }),
                Animated.timing(animX, {
                    toValue: -1,
                    duration: duration * 0.35,
                    useNativeDriver: true,
                    easing: Easing.sin
                }),
                Animated.timing(animX, {
                    toValue: 0,
                    duration: duration * 0.3,
                    useNativeDriver: true,
                    easing: Easing.sin
                }),
            ])
        );

        const opacityPulse = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.6,
                    duration: duration * 0.2,
                    useNativeDriver: true
                }),
                Animated.delay(duration * 0.6),
                Animated.timing(opacity, {
                    toValue: 0.2,
                    duration: duration * 0.2,
                    useNativeDriver: true
                }),
            ])
        );

        const scaleIn = Animated.spring(scale, {
            toValue: 1,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
            delay
        });

        // OPTIMIZATION: Defer particle start to prevent navigation lag
        const task = InteractionManager.runAfterInteractions(() => {
            timeout = setTimeout(() => {
                scaleIn.start();
                floatLoop.start();
                driftLoop.start();
                opacityPulse.start();
            }, delay);
        });

        return () => {
            task.cancel();
            clearTimeout(timeout);
            floatLoop.stop();
            driftLoop.stop();
            opacityPulse.stop();
        };
    },[]);

    const translateY = animY.interpolate({
        inputRange: [0, 1],
        outputRange:[height + 100, -100]
    });

    const translateX = animX.interpolate({
        inputRange: [-1, 1],
        outputRange: [-35, 35]
    });

    return (
        <Animated.View style={{
            position: 'absolute',
            zIndex: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: C.accentGlow,
            transform: [{ translateY }, { translateX }, { scale }],
            opacity,
        }} />
    );
};

const AnimatedCount = ({ value, style }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const end = parseInt(value, 10) || 0;
        if (displayValue === end) return;

        animValue.setValue(displayValue);
        Animated.spring(animValue, {
            toValue: end,
            friction: 8,
            tension: 40,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) setDisplayValue(end);
        });

        const listener = animValue.addListener(({ value }) => {
            setDisplayValue(Math.floor(value));
        });

        return () => animValue.removeListener(listener);
    }, [value]);

    return <Text style={style}>{displayValue}</Text>;
};

const ChartRing = ({ percentage, radius = 45, strokeWidth = 8, color }) => {
    const { colors: C } = useTheme();
    const finalColor = color || C.primary;
    const animatedValue = useRef(new Animated.Value(0)).current;
    const circumference = 2 * Math.PI * radius;
    const[displayPercentage, setDisplayPercentage] = useState(0);
    const rotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        Animated.timing(animatedValue, {
            toValue: percentage,
            duration: 1500,
            easing: Easing.out(Easing.exp),
            useNativeDriver: false
        }).start();

        const listener = animatedValue.addListener(({ value }) => {
            setDisplayPercentage(Math.round(value));
        });

        return () => animatedValue.removeListener(listener);
    }, [percentage]);

    const rotationInterpolate = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;

    return (
        <View style={{ width: radius * 2, height: radius * 2, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={radius * 2} height={radius * 2} style={{ transform:[{ rotate: '-90deg' }] }}>
                <Circle cx={radius} cy={radius} r={radius - strokeWidth / 2} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />
                <Circle
                    cx={radius} cy={radius} r={radius - strokeWidth / 2}
                    stroke={finalColor} strokeWidth={strokeWidth} fill="none"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </Svg>

            <Animated.View style={{
                position: 'absolute',
                width: radius * 2,
                height: radius * 2,
                borderRadius: radius,
                backgroundColor: finalColor,
                opacity: 0.1,
                transform: [{
                    scale: rotation.interpolate({
                        inputRange:[0, 0.5, 1],
                        outputRange: [1, 1.1, 1]
                    })
                }]
            }} />

            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ color: finalColor, fontFamily: 'Tajawal-Bold', fontSize: 20 }}>
                    {displayPercentage}%
                </Text>
            </View>
        </View>
    );
};

const Accordion = ({ title, icon, children, isOpen, onPress }) => {
    const[contentHeight, setContentHeight] = useState(0);
    const heightAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);

    useEffect(() => {
        Animated.parallel([
            Animated.spring(rotateAnim, {
                toValue: isOpen ? 1 : 0,
                friction: 8, tension: 60, useNativeDriver: true,
            }),
            Animated.spring(heightAnim, {
                toValue: isOpen ? contentHeight : 0,
                friction: 9, tension: 60, useNativeDriver: false,
            })
        ]).start();
    },[isOpen, contentHeight]);

    const onLayout = (event) => {
        const { height } = event.nativeEvent.layout;
        if (Math.abs(contentHeight - height) > 1) {
            setContentHeight(height);
        }
    };

    const rotateChevron = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange:['0deg', '-180deg'],
    });

    return (
        <ContentCard style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
            <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.accordionHeader}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                    <View style={styles.iconBoxSm}>
                        <FontAwesome5 name={icon} size={14} color={C.accentGreen} />
                    </View>
                    <Text style={styles.accordionTitle}>{title}</Text>
                </View>
                <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
                    <FontAwesome5 name="chevron-down" size={14} color={C.textSecondary} />
                </Animated.View>
            </TouchableOpacity>

            <Animated.View style={{ height: heightAnim, overflow: 'hidden' }}>
                <View style={{ position: 'absolute', width: '100%', top: 0 }} onLayout={onLayout}>
                    <View style={styles.accordionBody}>
                        {children}
                    </View>
                </View>
            </Animated.View>
        </ContentCard>
    );
};

// ============================================================================
//                       ENHANCED MAIN SECTIONS
// ============================================================================

const SkeletonProductCard = ({ index }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: true, delay: index * 100 })
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const translateX = shimmerAnim.interpolate({ inputRange:[0, 1], outputRange: [-width, width] });
    const ShimmeringView = ({ style }) => (
        <View style={[style, { overflow: 'hidden', backgroundColor: C.border }]}>
            <Animated.View style={{ ...StyleSheet.absoluteFillObject, transform: [{ translateX }] }}>
                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']} style={{ flex: 1 }} />
            </Animated.View>
        </View>
    );

    return (
        <View style={styles.productListItem}>
            <View style={{ flex: 1, gap: 8, alignItems: 'flex-end' }}>
                <ShimmeringView style={{ height: 18, width: '80%', borderRadius: 8 }} />
                <ShimmeringView style={{ height: 14, width: '40%', borderRadius: 6 }} />
                <ShimmeringView style={{ height: 12, width: '60%', borderRadius: 6, marginTop: 4 }} />
            </View>
            <ShimmeringView style={{ width: 60, height: 60, borderRadius: 30 }} />
        </View>
    );
};

const ProductListItem = React.memo(({ product, onPress, onDelete }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const language = useCurrentLanguage(); 
    const translateX = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5 && Math.abs(gestureState.dx) > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx < 0) translateX.setValue(gestureState.dx);
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx < -width * 0.25) {
                    Animated.timing(translateX, { toValue: -width, duration: 250, useNativeDriver: true }).start(() => onDelete());
                } else {
                    Animated.spring(translateX, { toValue: 0, friction: 5, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    const score = product.analysisData?.oilGuardScore || 0;
    const typeObj = PRODUCT_TYPES.find(type => type.id === product.analysisData?.product_type);
    const productTypeLabel = typeObj ? t(typeObj.labelKey, language) : t('product_fallback_label', language);

    return (
        <View style={styles.productListItemWrapper}>
            <View style={styles.deleteActionContainer}>
                <FontAwesome5 name="trash-alt" size={22} color={C.danger} />
            </View>

            <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
                <Pressable style={styles.productListItem} onPress={onPress}>

                    <View style={styles.listItemScoreContainer}>
                        <WathiqScoreBadge score={score} size={54} />
                    </View>

                    <View style={styles.listItemContent}>
                        <Text style={styles.listItemName} numberOfLines={1}>{product.productName}</Text>
                        <Text style={styles.listItemType}>{productTypeLabel}</Text>
                    </View>

                    <View style={styles.listImageWrapper}>
                        {product.productImage ? (
                            <Image source={{ uri: product.productImage }} style={styles.listProductImage} />
                        ) : (
                            <View style={styles.listImagePlaceholder}>
                                <FontAwesome5 name="wine-bottle" size={18} color={C.textDim} />
                            </View>
                        )}
                    </View>

                </Pressable>
            </Animated.View>
        </View>
    );
});

const ProductDetailsSheet = ({ product, isVisible, onClose, onDelete }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const language = useCurrentLanguage();
    const animController = useRef(new Animated.Value(0)).current;

    const [isEditing, setIsEditing] = useState(false);
    const[editedName, setEditedName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { user, savedProducts, setSavedProducts } = useAppContext();
    
    useEffect(() => {
        if (isVisible && product) {
            setEditedName(product.productName);
            setIsEditing(false);

            Animated.spring(animController, {
                toValue: 1,
                damping: 15,
                stiffness: 100,
                useNativeDriver: true,
            }).start();
        } else if (!isVisible) {
            Animated.timing(animController, {
                toValue: 0,
                duration: 250,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        }
    },[isVisible, product, animController]);

    const handleClose = () => {
        Keyboard.dismiss();
        Animated.timing(animController, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) onClose();
        });
    };

    const handleSaveName = async () => {
        if (!editedName.trim()) return;
        if (editedName.trim() === product?.productName) { setIsEditing(false); return; }

        setIsSaving(true);
        try {
            const productRef = doc(db, 'profiles', user.uid, 'savedProducts', product.id);
            await updateDoc(productRef, { productName: editedName.trim() });
            
            const updatedList = savedProducts.map(p => 
                p.id === product.id ? { ...p, productName: editedName.trim() } : p
            );
            setSavedProducts(updatedList);
            
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsEditing(false);
        } catch (error) {
            AlertService.error(t('status_error', language), t('error_update_name', language));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePress = () => {
        AlertService.confirm(
            t('delete_product_title', language),
            t('delete_product_confirm', language),
            async () => {
                Animated.timing(animController, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }).start(() => {
                    onClose(); 
                    setTimeout(() => onDelete(product.id), 300); 
                });
            }
        );
    };

    const getAlertStyle = (type) => {
        const safeType = type ? type.toLowerCase() : 'info';
        switch (safeType) {
            case 'risk': case 'danger': case 'critical':
                return { bg: 'rgba(239, 68, 68, 0.1)', border: C.danger, text: C.danger, icon: 'exclamation-circle' };
            case 'caution': case 'warning':
                return { bg: 'rgba(245, 158, 11, 0.1)', border: C.warning, text: C.warning, icon: 'exclamation-triangle' };
            case 'good': case 'success':
                return { bg: 'rgba(34, 197, 94, 0.1)', border: C.success, text: C.success, icon: 'check-circle' };
            default:
                return { bg: 'rgba(59, 130, 246, 0.1)', border: C.info, text: C.info, icon: 'info-circle' };
        }
    };

    const translateY = animController.interpolate({ inputRange:[0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange:[0, 0.6] });

    if (!product || !isVisible) return null;

    const productImage = product?.productImage;
    const {
        oilGuardScore = 0,
        finalVerdict = t('status_unknown', language),
        product_type = 'other',
        detected_ingredients =[],
        user_specific_alerts =[],
        safety = { score: 0 },
        efficacy = { score: 0 }
    } = product?.analysisData || {};

    const scoreColor = oilGuardScore >= 80 ? C.success : oilGuardScore >= 65 ? C.warning : C.danger;
    
    const typeObj = PRODUCT_TYPES.find(tObj => tObj.id === product_type);
    const typeLabel = typeObj ? t(typeObj.labelKey, language) : t('product_fallback_label', language);

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHandleBar}>
                        <View style={styles.sheetHandle} />
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            {productImage ? (
                                <View style={styles.productImageContainer}>
                                    <Image source={{ uri: productImage }} style={styles.productRealImage} resizeMode="cover" />
                                    <View style={[styles.scoreBadgeFloat, { backgroundColor: scoreColor }]}>
                                        <Text style={styles.scoreBadgeText}>{oilGuardScore}</Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={{
                                    width: 80, height: 80, borderRadius: 40,
                                    backgroundColor: C.background,
                                    justifyContent: 'center', alignItems: 'center',
                                    marginBottom: 15, borderWidth: 2, borderColor: scoreColor
                                }}>
                                    <FontAwesome5 name={typeObj?.icon || 'tint'} size={32} color={scoreColor} />
                                </View>
                            )}

                            {isEditing ? (
                                <View style={styles.editTitleContainer}>
                                    <TextInput
                                        value={editedName}
                                        onChangeText={setEditedName}
                                        style={styles.editTitleInput}
                                        autoFocus
                                        textAlign="right"
                                    />
                                    <View style={styles.editActionsRow}>
                                        <TouchableOpacity onPress={() => setIsEditing(false)} style={[styles.editActionBtn, { backgroundColor: C.background, borderColor: C.border }]}>
                                            <FontAwesome5 name="times" size={14} color={C.textSecondary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={handleSaveName} disabled={isSaving} style={[styles.editActionBtn, { backgroundColor: C.accentGreen }]}>
                                            {isSaving ? <ActivityIndicator size="small" color={C.textOnAccent} /> : <FontAwesome5 name="check" size={14} color={C.textOnAccent} />}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.titleDisplayRow}>
                                    <Text style={styles.sheetProductTitle}>{product.productName}</Text>
                                    <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editIconBtn}>
                                        <Feather name="edit-2" size={16} color={C.accentGreen} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            <Text style={{ fontFamily: 'Tajawal-Regular', color: C.textSecondary, marginTop: 5 }}>{typeLabel}</Text>
                        </View>

                        <View style={styles.sheetActionsRow}>
                            <View style={{ flex: 1 }}>
                                <PremiumShareButton
                                    analysis={product.analysisData}
                                    product={product}
                                    typeLabel={typeLabel}
                                    customStyle={[styles.sheetShareBtn, { backgroundColor: C.accentGreen + '15', borderColor: C.accentGreen + '40' }]}
                                    iconSize={16}
                                    textColor={C.accentGreen}
                                />
                            </View>

                            <TouchableOpacity 
                                onPress={handleDeletePress} 
                                style={[styles.sheetDeleteBtn, { backgroundColor: C.danger + '15', borderColor: C.danger + '40' }]}
                            >
                                <FontAwesome5 name="trash-alt" size={16} color={C.danger} />
                                <Text style={[styles.sheetBtnText, { color: C.danger }]}>{t('action_delete', language)}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sheetSection}>
                            <View style={[styles.alertBox, { backgroundColor: scoreColor + '15', borderColor: scoreColor }]}>
                                {!productImage && (
                                    <View style={{ width: 50, alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: scoreColor }}>{oilGuardScore}</Text>
                                    </View>
                                )}
                                {!productImage && <View style={{ width: 1, height: '80%', backgroundColor: scoreColor, opacity: 0.3, marginHorizontal: 10 }} />}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: scoreColor, fontFamily: 'Tajawal-Bold', fontSize: 16, textAlign: 'center' }}>
                                        {finalVerdict}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.sheetPillarsContainer}>
                            <View style={styles.sheetPillar}>
                                <FontAwesome5 name="magic" size={18} color={C.accentGreen} />
                                <Text style={styles.sheetPillarLabel}>{t('oilguard_stat_efficacy', language)}</Text>
                                <Text style={styles.sheetPillarValue}>{typeof efficacy === 'object' ? efficacy.score : efficacy}%</Text>
                            </View>
                            <View style={styles.sheetDividerVertical} />
                            <View style={styles.sheetPillar}>
                                <FontAwesome5 name="shield-alt" size={18} color={C.gold} />
                                <Text style={styles.sheetPillarLabel}>{t('oilguard_stat_safety', language)}</Text>
                                <Text style={styles.sheetPillarValue}>{typeof safety === 'object' ? safety.score : safety}%</Text>
                            </View>
                        </View>

                        {user_specific_alerts.length > 0 && (
                            <View style={styles.sheetSection}>
                                <Text style={[styles.sheetSectionTitle, { color: C.textPrimary }]}>{t('profile_analysis_user_notes', language)}</Text>
                                {user_specific_alerts.map((alert, i) => {
                                    const isObj = typeof alert === 'object' && alert !== null;
                                    const alertText = isObj ? alert.text : alert;
                                    const alertType = isObj ? alert.type : 'info';
                                    const style = getAlertStyle(alertType);
                                    return (
                                        <View key={i} style={[styles.alertBox, { backgroundColor: style.bg, borderColor: style.border, marginBottom: 8 }]}>
                                            <FontAwesome5 name={style.icon} size={16} color={style.text} />
                                            <Text style={[styles.alertBoxText, { color: style.text }]}>{alertText}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        <View style={styles.sheetSection}>
                            <Text style={styles.sheetSectionTitle}>{t('sheet_detected_ingredients', language)} ({detected_ingredients.length})</Text>
                            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                                {detected_ingredients.map((ing, i) => {
                                    const ingName = (typeof ing === 'object' && ing !== null) ? ing.name : ing;
                                    return (
                                        <View key={i} style={styles.ingredientChip}>
                                            <Text style={styles.ingredientChipText}>{ingName}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        <Pressable onPress={handleClose} style={[styles.closeButton, { marginTop: 20 }]}>
                            <Text style={styles.closeButtonText}>{t('sheet_close', language)}</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

const GlobalInput = (props) => {
    const { colors: C } = useTheme();
    const fontStyle = {
        fontFamily: (props.value && props.value.length > 0) ? 'Tajawal-Bold' : 'Tajawal-Regular'
    };

    return (
        <TextInput
            {...props} 
            placeholderTextColor={props.placeholderTextColor || C.textDim}
            style={[
                props.style,
                fontStyle
            ]}
        />
    );
};

const ShelfSection = ({ products, loading, onDelete, onRefresh, router }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const language = useCurrentLanguage(); 
    const [refreshing, setRefreshing] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh?.();
        setRefreshing(false);
    };

    const handleProductDelete = (productId) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onDelete(productId);
        setSelectedProduct(null);
    };

    if (loading) {
        return (
            <View style={{ gap: 8, paddingTop: 20 }}>
                {[...Array(5)].map((_, index) => <SkeletonProductCard key={index} index={index} />)}
            </View>
        );
    }

    const empty = products.length === 0;

    return (
        <View style={{ flex: 1 }}>
            <ContentCard delay={100} style={{ padding: 15, marginBottom: 20 }}>
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>{t('stat_total_products', language)}</Text>
                        <AnimatedCount value={products.length} style={styles.statValue} />
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>{t('stat_protection_products', language)}</Text>
                        <AnimatedCount value={products.filter(p => p.analysisData?.product_type === 'sunscreen').length} style={styles.statValue} />
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>{t('stat_effective_products', language)}</Text>
                        <AnimatedCount value={products.filter(p => p.analysisData?.efficacy?.score > 60).length} style={styles.statValue} />
                    </View>
                </View>
            </ContentCard>

            {empty ? (
                <ShelfEmptyState onPress={() => router.push('/oilguard')} />
            ) : (
                <FlatList
                    data={products}
                    renderItem={({ item }) => (
                        <ProductListItem
                            product={item}
                            onPress={() => setSelectedProduct(item)}
                            onDelete={() => handleProductDelete(item.id)}
                        />
                    )}
                    keyExtractor={item => item.id}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.accentGreen} colors={[C.accentGreen]} />
                    }
                />
            )}

            <ProductDetailsSheet
                product={selectedProduct}
                isVisible={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onDelete={handleProductDelete}
            />
        </View>
    );
};

const IngredientCard = React.memo(({ item, index, onPress, styles }) => {
    const { colors: C } = useTheme();
    const isRisk = item.warnings?.some(w => w.level === 'risk');

    return (
        <StaggeredItem index={index % 20}>
            <PressableScale
                style={styles.ingCard}
                onPress={() => item.isRich ? onPress(item) : null}
                disabled={!item.isRich}
            >
                <View style={styles.ingCardContent}>
                    <View style={[styles.ingCountBadge, { backgroundColor: item.isRich ? C.accentGreen : C.card }]}>
                        <Text style={[styles.ingCountText, { color: item.isRich ? C.textOnAccent : C.textDim }]}>
                            {item.count}
                        </Text>
                    </View>

                    <View style={styles.ingInfoContainer}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.ingNameText}>{item.displayName}</Text>
                            {isRisk && <FontAwesome5 name="exclamation-circle" size={12} color={C.danger} />}
                        </View>

                        {item.scientific_name && (
                            <Text style={styles.ingSciText} numberOfLines={1}>{item.scientific_name}</Text>
                        )}

                        <View style={styles.ingTagsRow}>
                            <View style={styles.ingCategoryTag}>
                                <Text style={styles.ingTagLabel}>{item.functionalCategory}</Text>
                            </View>
                            {item.chemicalType && (
                                <View style={[styles.ingCategoryTag, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: C.border }]}>
                                    <Text style={[styles.ingTagLabel, { color: C.textSecondary }]}>{item.chemicalType}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {item.isRich && (
                        <View style={{ paddingLeft: 8 }}>
                            <FontAwesome5 name="chevron-left" size={12} color={C.border} />
                        </View>
                    )}
                </View>
            </PressableScale>
        </StaggeredItem>
    );
});

const IngredientsSection = ({ products, userProfile, cacheRef }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const language = useCurrentLanguage(); 
    
    const [search, setSearch] = useState('');
    const [renderLimit, setRenderLimit] = useState(15);
    const [allIngredients, setAllIngredients] = useState([]);
    const[loading, setLoading] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState(null);

    useEffect(() => {
        // OPTIMIZATION: Defer fetch until screen transition completes
        const task = InteractionManager.runAfterInteractions(() => {
            const fetchIngredientsData = async () => {
                if (products.length === 0) {
                    setAllIngredients([]);
                    return;
                }

                const currentHash = generateFingerprint(products, userProfile?.settings);

                if (cacheRef.current.hash === currentHash && cacheRef.current.data.length > 0) {
                    setAllIngredients(cacheRef.current.data);
                    return;
                }

                setLoading(true);

                const uniqueNames = new Set();
                products.forEach(p => {
                    p.analysisData?.detected_ingredients?.forEach(i => {
                        if (i.name) uniqueNames.add(i.name);
                    });
                });
                const ingredientsList = Array.from(uniqueNames);

                try {
                    const response = await fetch(`${PROFILE_API_URL}/evaluate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ingredients_list: ingredientsList,
                            product_type: 'other',
                            user_profile: userProfile?.settings || {},
                            selected_claims:[]
                        })
                    });

                    const data = await response.json();

                    if (!response.ok) throw new Error("Server fetch failed");

                    const serverData = data.detected_ingredients ||[];

                    const aggregated = serverData.map(serverIng => {
                        const productsContaining = products.filter(p =>
                            p.analysisData?.detected_ingredients?.some(localIng =>
                                (serverIng.id && localIng.id === serverIng.id) ||
                                (localIng.name && localIng.name.toLowerCase() === serverIng.name.toLowerCase())
                            )
                        );

                        return {
                            ...serverIng,
                            displayName: serverIng.name,
                            isRich: true,
                            count: productsContaining.length,
                            productIds: productsContaining.map(p => p.id),
                            productNames: productsContaining.map(p => p.productName)
                        };
                    });

                    const sortedData = aggregated.sort((a, b) => b.count - a.count);
                    cacheRef.current = { hash: currentHash, data: sortedData };
                    setAllIngredients(sortedData);

                } catch (error) {
                    console.error("Ingredients enrichment failed:", error);
                    const fallbackMap = new Map();
                    products.forEach(p => {
                        p.analysisData?.detected_ingredients?.forEach(i => {
                            const key = i.name;
                            if (!fallbackMap.has(key)) {
                                fallbackMap.set(key, {
                                    id: key, name: key, displayName: key,
                                    isRich: false, count: 0, productIds: [], productNames:[]
                                });
                            }
                            const entry = fallbackMap.get(key);
                            entry.count++;
                            if (!entry.productIds.includes(p.id)) entry.productIds.push(p.id);
                        });
                    });
                    setAllIngredients(Array.from(fallbackMap.values()).sort((a, b) => b.count - a.count));
                } finally {
                    setLoading(false);
                }
            };

            fetchIngredientsData();
        });

        return () => task.cancel();
    }, [products, userProfile, cacheRef]); 

    const filteredList = useMemo(() =>
        allIngredients.filter(ing =>
            (ing.displayName || ing.name).toLowerCase().includes(search.toLowerCase())
        ),
        [allIngredients, search]);

    const visibleData = filteredList.slice(0, renderLimit);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.searchBar}>
                <TextInput
                    placeholder={t('search_ingredients_placeholder', language)}
                    placeholderTextColor={C.textDim}
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                />
                <FontAwesome5 name="search" size={16} color={C.textDim} />
            </View>

            {loading ? (
                <View style={{ padding: 20 }}>
                    <ActivityIndicator size="small" color={C.accentGreen} />
                </View>
            ) : (
                <FlatList
                    data={visibleData}
                    keyExtractor={item => item.id || item.name}
                    renderItem={({ item, index }) => (
                        <IngredientCard item={item} index={index} onPress={setSelectedIngredient} styles={styles} />
                    )}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingBottom: 50 }}
                    ListEmptyComponent={<IngredientsEmptyState />}
                />
            )}

            {visibleData.length < filteredList.length && (
                <PressableScale onPress={() => setRenderLimit(l => l + 10)} style={styles.loadMoreButton}>
                    <Text style={styles.loadMoreText}>{t('load_more', language)}</Text>
                </PressableScale>
            )}

            {selectedIngredient && (
                <IngredientDetailsModal
                    visible={!!selectedIngredient}
                    ingredient={selectedIngredient}
                    productsContaining={products.filter(p => selectedIngredient.productIds.includes(p.id))}
                    onClose={() => setSelectedIngredient(null)}
                />
            )}
        </View>
    );
};

const IngredientDetailsModal = ({ visible, onClose, ingredient, productsContaining }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const language = useCurrentLanguage(); 
    const animController = useRef(new Animated.Value(0)).current;
    const hasData = ingredient && visible;

    useEffect(() => {
        if (visible) {
            Animated.spring(animController, {
                toValue: 1,
                damping: 15, stiffness: 100, mass: 0.8, useNativeDriver: true,
            }).start();
        }
    },[visible]);

    const animateOut = () => {
        Animated.timing(animController, {
            toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) onClose();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    const newValue = 1 - (gestureState.dy / height);
                    animController.setValue(newValue);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > height * 0.2 || gestureState.vy > 0.8) animateOut();
                else Animated.spring(animController, { toValue: 1, damping: 15, stiffness: 100, useNativeDriver: true }).start();
            },
        })
    ).current;

    if (!hasData) return null;

    const backdropOpacity = animController.interpolate({ inputRange:[0, 1], outputRange:[0, 0.6] });
    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

    let safetyColor = C.success;
    if (ingredient.warnings?.some(w => w.level === 'risk')) safetyColor = C.danger;
    else if (ingredient.warnings?.some(w => w.level === 'caution')) safetyColor = C.warning;

    return (
        <Modal transparent visible={true} onRequestClose={animateOut} animationType="none" statusBarTranslucent={true}>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={animateOut} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View {...panResponder.panHandlers} style={[styles.ingModalHeader, { borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
                        <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>

                        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.ingModalTitle}>{ingredient.name}</Text>
                                    <Text style={styles.ingModalScientific}>{ingredient.scientific_name}</Text>
                                </View>
                                <View style={[styles.ingTypeBadge, { backgroundColor: safetyColor + '15' }]}>
                                    <FontAwesome5 name="flask" size={12} color={safetyColor} />
                                    <Text style={[styles.ingTypeText, { color: safetyColor }]}>{ingredient.functionalCategory}</Text>
                                </View>
                            </View>

                            <View style={styles.ingBadgesRow}>
                                {ingredient.chemicalType && (
                                    <View style={styles.ingBadge}><Text style={styles.ingBadgeText}>{ingredient.chemicalType}</Text></View>
                                )}
                                <View style={styles.ingBadge}><Text style={styles.ingBadgeText}>{t('ing_found_in', language)} {productsContaining.length} {t('ing_products_count', language)}</Text></View>
                            </View>
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 50 }} bounces={false}>
                        {ingredient.benefits && Object.keys(ingredient.benefits).length > 0 && (
                            <View style={styles.ingSection}>
                                <Text style={styles.ingSectionTitle}>{t('ing_main_benefits', language)}</Text>
                                {Object.entries(ingredient.benefits).map(([benefit, score]) => (
                                    <View key={benefit} style={styles.benefitRow}>
                                        <Text style={styles.benefitLabel}>{benefit}</Text>
                                        <View style={styles.benefitBarContainer}><View style={[styles.benefitBarFill, { width: `${score * 100}%` }]} /></View>
                                        <Text style={styles.benefitScore}>{Math.round(score * 10)}/10</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {ingredient.warnings && ingredient.warnings.length > 0 && (
                            <View style={styles.ingSection}>
                                <Text style={styles.ingSectionTitle}>{t('ing_safety_warnings', language)}</Text>
                                {ingredient.warnings.map((warn, i) => (
                                    <View key={i} style={[styles.warningBox, warn.level === 'risk' ? styles.warningBoxRisk : styles.warningBoxCaution]}>
                                        <FontAwesome5 name={warn.level === 'risk' ? "exclamation-circle" : "info-circle"} size={16} color={warn.level === 'risk' ? C.danger : C.warning} />
                                        <Text style={[styles.warningText, { color: warn.level === 'risk' ? C.danger : C.warning }]}>{warn.text}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {(ingredient.synergy || ingredient.negativeSynergy) && (
                            <View style={styles.ingSection}>
                                <Text style={styles.ingSectionTitle}>{t('ing_interactions', language)}</Text>
                                <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
                                    {ingredient.synergy && Object.keys(ingredient.synergy).length > 0 && (
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.interactionHeader}>{t('ing_synergy_with', language)}</Text>
                                            {Object.keys(ingredient.synergy).map((key) => (
                                                <Text key={key} style={styles.synergyItem}>• {key}</Text>
                                            ))}
                                        </View>
                                    )}

                                    {ingredient.negativeSynergy && Object.keys(ingredient.negativeSynergy).length > 0 && (
                                        <>
                                            <View style={{ width: 1, backgroundColor: C.border }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.interactionHeader}>{t('ing_conflict_with', language)}</Text>
                                                {Object.keys(ingredient.negativeSynergy).map((key) => (
                                                    <Text key={key} style={styles.conflictItem}>• {key}</Text>
                                                ))}
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>
                        )}

                        <View style={styles.ingSection}>
                            <Text style={styles.ingSectionTitle}>{t('ing_in_your_shelf', language)}</Text>
                            {productsContaining.map(p => (
                                <View key={p.id} style={styles.productChip}>
                                    <FontAwesome5 name="check" size={10} color={C.accentGreen} />
                                    <Text style={styles.productChipText}>{p.productName}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

const MigrationSection = ({ products }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const language = useCurrentLanguage(); 
    const [syntheticIngredients] = useState(['Paraben', 'Sulfate', 'Silicon', 'Fragrance', 'Alcohol', 'Mineral Oil']);
    const flagged = products.filter(p =>
        p.analysisData?.detected_ingredients?.some(i =>
            syntheticIngredients.some(bad => i.name.includes(bad))
        )
    );

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    },[]);

    const renderMigrationItem = ({ item, index }) => {
        const detectedSynthetics = syntheticIngredients.filter(bad =>
            item.analysisData?.detected_ingredients?.some(i => i.name.includes(bad))
        );

        return (
            <StaggeredItem index={index}>
                <ContentCard style={styles.migCard}>
                    <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.migName}>{item.productName}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 }}>
                                {detectedSynthetics.slice(0, 3).map((ing, i) => (
                                    <View key={i} style={styles.badBadge}>
                                        <Text style={styles.badText}>{ing}</Text>
                                    </View>
                                ))}
                                {detectedSynthetics.length > 3 && (
                                    <View style={[styles.badBadge, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
                                        <Text style={[styles.badText, { color: C.gold }]}>
                                            +{detectedSynthetics.length - 3}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <View style={[styles.badBadge, styles.criticalBadge]}>
                            <Text style={[styles.badText, { color: '#000' }]}>{t('ing_synthetic', language)}</Text>
                        </View>
                    </View>

                    <Text style={styles.migReason}>
                        {t('ing_contains', language)} {detectedSynthetics.length} {t('ing_synthetic_count', language)}
                    </Text>

                    <View style={styles.divider} />

                    <Text style={styles.migSuggestion}>
                        {t('ing_natural_suggestion', language)}
                    </Text>

                    <View style={styles.migrationTip}>
                        <FontAwesome5 name="lightbulb" size={12} color={C.gold} />
                        <Text style={styles.migrationTipText}>
                            {t('ing_irritation_warning', language)}
                        </Text>
                    </View>
                </ContentCard>
            </StaggeredItem>
        );
    };

    if (flagged.length === 0) {
        return <MigrationSuccessState />;
    }

    return (
        <FlatList
            data={flagged}
            renderItem={renderMigrationItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 150 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
        />
    );
};

const SettingChip = ({ label, icon, isSelected, onPress }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    return (
        <PressableScale onPress={onPress}>
            <View style={[styles.chip, isSelected && styles.chipActive]}>
                {icon && <FontAwesome5 name={icon} size={14} color={isSelected ? C.textOnAccent : C.textSecondary} />}
                <Text style={isSelected ? styles.chipTextActive : styles.chipText}>
                    {label}
                </Text>
            </View>
        </PressableScale>
    );
};

const SingleSelectGroup = ({ title, options, selectedValue, onSelect }) => {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    const styles = useMemo(() => createStyles(C), [C]);
    return (
        <View style={styles.settingGroup}>
            <Text style={styles.groupLabel}>{title}</Text>
            <View style={styles.chipsRow}>
                {options.map(option => (
                    <SettingChip
                        key={option.id}
                        label={getLocalizedValue(option.label, language)}
                        icon={option.icon}
                        isSelected={selectedValue === option.id}
                        onPress={() => onSelect(option.id)}
                    />
                ))}
            </View>
        </View>
    );
};

const MultiSelectGroup = ({ title, options, selectedValues, onToggle }) => {
    const currentSelected = Array.isArray(selectedValues) ? selectedValues :[];
    const language = useCurrentLanguage();
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    return (
        <View style={styles.settingGroup}>
            <Text style={styles.groupLabel}>{title}</Text>
            <View style={styles.chipsRow}>
                {options.map(option => (
                    <SettingChip
                        key={option.id}
                        label={getLocalizedValue(option.name, language)}
                        isSelected={currentSelected.includes(option.id)}
                        onPress={() => onToggle(option.id)}
                    />
                ))}
            </View>
        </View>
    );
};

const SettingsSection = ({ profile, onLogout }) => {
    const { user } = useAppContext();
    const language = useCurrentLanguage();
    const { colors: C, activeThemeId, changeTheme } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const [openAccordion, setOpenAccordion] = useState(null);

    const [form, setForm] = useState(() => ({
        goals: [],
        conditions:[],
        allergies:[],
        skinType: null,
        scalpType: null,
        language: 'ar',
        ...profile?.settings
    }));

    const [isSaving, setIsSaving] = useState(false);
    const saveTimeoutRef = useRef(null);

    useEffect(() => {
        if (profile?.settings) {
            setForm(prev => ({
                ...prev,
                ...profile.settings,
                goals: profile.settings.goals || [],
                conditions: profile.settings.conditions ||[],
                allergies: profile.settings.allergies ||[],
                skinType: profile.settings.skinType || null,
                scalpType: profile.settings.scalpType || null,
                language: profile.settings.language || 'ar',
            }));
        }
    }, [profile]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    },[]);

    const handleToggleAccordion = (id) => {
        Haptics.selectionAsync();
        setOpenAccordion(currentId => (currentId === id ? null : id));
    };

    const updateSetting = (key, value) => {
        if (!user?.uid) {
            Alert.alert(t('settings_user_not_found_title', language), t('settings_user_not_found_message', language));
            return;
        }

        const newForm = { ...form, [key]: value };
        setForm(newForm);
        setIsSaving(true);

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await updateDoc(doc(db, 'profiles', user.uid), {[`settings.${key}`]: value
                });
            } catch (e) {
                console.error("Error updating settings:", e);
                Alert.alert(t('settings_save_error_title', language), t('settings_save_error_message', language));
            } finally {
                setIsSaving(false);
                saveTimeoutRef.current = null;
            }
        }, 1000); 
    };

    const handleMultiSelectToggle = (field, itemId) => {
        const currentSelection = form[field] ||[];
        const newSelection = currentSelection.includes(itemId)
            ? currentSelection.filter(id => id !== itemId)
            : [...currentSelection, itemId];
        updateSetting(field, newSelection);
    };

    const handlePrivacyOptions = async () => {
        if (!AdsConsent || !AdsConsent.showPrivacyOptionsForm) {
            AlertService.show({
                title: t('settings_dev_mode_title', language),
                message: t('settings_ads_not_enabled', language),
                type: 'info'
            });
            return;
        }

        try {
            const { status } = await AdsConsent.showPrivacyOptionsForm();
        } catch (error) {
            console.log("Privacy Form Error or Not Required:", error);
            AlertService.show({
                title: t('settings_notice_title', language),
                message: t('settings_privacy_not_required', language),
                type: 'info'
            });
        }
    };

    return (
        <View style={{ paddingBottom: 150 }}>
            <View style={{ height: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 5 }}>
                {isSaving && (
                    <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <ActivityIndicator size="small" color={C.accentGreen} />
                        <Text style={{ color: C.textDim, fontSize: 10, fontFamily: 'Tajawal-Regular' }}>{t('settings_saving', language)}</Text>
                    </Animated.View>
                )}
            </View>

            <StaggeredItem index={0}>
                <Accordion
                    title={t('settings_theme_title', language)}
                    icon="palette"
                    isOpen={openAccordion === 'theme'}
                    onPress={() => handleToggleAccordion('theme')}
                >
                    <SingleSelectGroup
                        title={t('settings_theme_pick', language)}
                        options={[
                            { id: 'original', label: { ar: t('settings_theme_original', 'ar'), en: t('settings_theme_original', 'en') }, icon: 'tree' },
                            { id: 'baby_pink', label: { ar: t('settings_theme_pink', 'ar'), en: t('settings_theme_pink', 'en') }, icon: 'heart' },
                            { id: 'clinical_blue', label: { ar: t('settings_theme_blue', 'ar'), en: t('settings_theme_blue', 'en') }, icon: 'moon' }
                        ]}
                        selectedValue={activeThemeId}
                        onSelect={changeTheme}
                    />
                </Accordion>
                <Accordion
                    title={t('settings_traits_title', language)}
                    icon="id-card"
                    isOpen={openAccordion === 'traits'}
                    onPress={() => handleToggleAccordion('traits')}
                >
                    <SingleSelectGroup
                        title={t('settings_skin_type', language)}
                        options={basicSkinTypes}
                        selectedValue={form.skinType}
                        onSelect={(value) => updateSetting('skinType', value)}
                    />
                    <View style={styles.divider} />
                    <SingleSelectGroup
                        title={t('settings_scalp_type', language)}
                        options={basicScalpTypes}
                        selectedValue={form.scalpType}
                        onSelect={(value) => updateSetting('scalpType', value)}
                    />
                    <View style={styles.divider} />
                    <SingleSelectGroup
                        title="لغة التطبيق"
                        options={[
                            { id: 'ar', label: 'العربية', icon: 'language' },
                            { id: 'en', label: 'English', icon: 'language' }
                        ]}
                        selectedValue={form.language || 'ar'}
                        onSelect={(value) => updateSetting('language', value)}
                    />
                </Accordion>
            </StaggeredItem>

            <StaggeredItem index={1}>
                <Accordion
                    title={t('settings_goals_title', language)}
                    icon="crosshairs"
                    isOpen={openAccordion === 'goals'}
                    onPress={() => handleToggleAccordion('goals')}
                >
                    <MultiSelectGroup
                        title={t('settings_goals_question', language)}
                        options={GOALS_LIST.map(g => ({ ...g, name: g.label }))}
                        selectedValues={form.goals}
                        onToggle={(id) => handleMultiSelectToggle('goals', id)}
                    />
                </Accordion>
            </StaggeredItem>

            <StaggeredItem index={2}>
                <Accordion
                    title={t('settings_conditions_title', language)}
                    icon="heartbeat"
                    isOpen={openAccordion === 'conditions'}
                    onPress={() => handleToggleAccordion('conditions')}
                >
                    <MultiSelectGroup
                        title={t('settings_conditions_question', language)}
                        options={commonConditions}
                        selectedValues={form.conditions}
                        onToggle={(id) => handleMultiSelectToggle('conditions', id)}
                    />
                </Accordion>
            </StaggeredItem>

            <StaggeredItem index={3}>
                <Accordion
                    title={t('settings_allergies_title', language)}
                    icon="allergies"
                    isOpen={openAccordion === 'allergies'}
                    onPress={() => handleToggleAccordion('allergies')}
                >
                    <MultiSelectGroup
                        title={t('settings_allergies_question', language)}
                        options={commonAllergies}
                        selectedValues={form.allergies}
                        onToggle={(id) => handleMultiSelectToggle('allergies', id)}
                    />
                </Accordion>
            </StaggeredItem>

            <StaggeredItem index={4}>
                <Accordion
                    title={t('settings_account_title', language)}
                    icon="user-cog"
                    isOpen={openAccordion === 'account'}
                    onPress={() => handleToggleAccordion('account')}
                >
                    <PressableScale
                        onPress={handlePrivacyOptions}
                        style={[styles.logoutBtn, { backgroundColor: C.background, borderColor: C.border, marginBottom: 10 }]}
                    >
                        <Text style={[styles.logoutText, { color: C.textPrimary }]}>{t('settings_ads_privacy_button', language)}</Text>
                        <FontAwesome5 name="shield-alt" size={16} color={C.accentGreen} />
                    </PressableScale>

                    <PressableScale onPress={onLogout} style={styles.logoutBtn}>
                        <Text style={styles.logoutText}>{t('settings_logout_button', language)}</Text>
                        <FontAwesome5 name="sign-out-alt" size={16} color={C.danger} />
                    </PressableScale>
                </Accordion>
            </StaggeredItem>
        </View>
    );
};

const InsightDetailsModal = ({ visible, onClose, insight }) => {
    const { colors: C } = useTheme(); 
    const styles = useMemo(() => createStyles(C), [C]); 
    const animController = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) Animated.spring(animController, { toValue: 1, damping: 15, stiffness: 100, useNativeDriver: true }).start();
    },[visible]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, useNativeDriver: true }).start(({ finished }) => { if (finished) onClose(); });
    };

    if (!insight) return null; 

    const translateY = animController.interpolate({ inputRange:[0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange:[0, 1], outputRange: [0, 0.6] });

    const getSeverityColor = (s) => (s === 'critical' ? C.danger : s === 'warning' ? C.warning : C.success);
    const mainColor = getSeverityColor(insight.severity);

    const renderGoalDashboard = (data) => {
        const foundHeroes = data?.foundHeroes ||[];
        const missingHeroes = data?.missingHeroes ||[];
        const relatedProducts = insight.related_products ||[];

        return (
            <View>
                <View style={{ alignItems: 'center', marginBottom: 25 }}>
                    <ChartRing
                        percentage={data.score || 0}
                        color={mainColor}
                        radius={60}
                        strokeWidth={10}
                    />
                    <Text style={{ fontFamily: 'Tajawal-Bold', color: C.textSecondary, marginTop: 10 }}>مؤشر التطابق</Text>
                </View>

                {data.sunscreenPenalty && (
                    <View style={[styles.alertBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: C.danger }]}>
                        <FontAwesome5 name="sun" size={18} color={C.danger} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.alertBoxText, { color: C.danger, fontFamily: 'Tajawal-Bold' }]}>تنبيه حماية</Text>
                            <Text style={[styles.alertBoxText, { color: C.danger }]}>تم إيقاف تقدم الهدف عند 35% لأنك لا تستخدمين واقي شمس.</Text>
                        </View>
                    </View>
                )}

                <View style={styles.ingSection}>
                    <Text style={styles.ingSectionTitle}>✅ مكونات نشطة لديكِ</Text>
                    <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                        {foundHeroes.length > 0 ? (
                            foundHeroes.map((h, i) => (
                                <View key={i} style={[styles.ingredientChip, { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)', borderWidth: 1 }]}>
                                    <Text style={[styles.ingredientChipText, { color: C.success }]}>{h}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noDataText}>لا توجد مكونات قوية لهذا الهدف حتى الآن.</Text>
                        )}
                    </View>
                </View>

                {(data.score || 0) < 100 && (
                    <View style={styles.ingSection}>
                        <Text style={styles.ingSectionTitle}>🧪 مقترحات لرفع النتيجة</Text>
                        <Text style={{ fontFamily: 'Tajawal-Regular', color: C.textSecondary, marginBottom: 10, textAlign: 'right' }}>
                            ابحثي عن منتجات تحتوي على:
                        </Text>
                        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                            {missingHeroes.map((h, i) => (
                                <View key={i} style={[styles.ingredientChip, { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: C.warning, borderWidth: 1, borderStyle: 'dashed' }]}>
                                    <Text style={[styles.ingredientChipText, { color: C.warning }]}>
                                        {h.replace(/-/g, ' ')}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {relatedProducts.length > 0 && (
                    <View style={styles.ingSection}>
                        <Text style={styles.ingSectionTitle}>المنتجات المساهمة</Text>
                        {relatedProducts.map((p, i) => (
                            <View key={i} style={styles.productChip}>
                                <FontAwesome5 name="check" size={12} color={C.accentGreen} />
                                <Text style={styles.productChipText}>{p}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    }; 

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>

                    <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>

                        {(insight.customData?.type === 'weather_dashboard' || insight.customData?.type === 'weather_advice') ? (
                            <WeatherDetailedSheet insight={insight} />
                        ) :
                            (insight.type === 'goal_analysis' && insight.customData) ? (
                                renderGoalDashboard(insight.customData)
                            ) : (
                                <>
                                    <View style={styles.modalHeader}>
                                        <View style={[styles.modalIconContainer, { backgroundColor: mainColor + '20' }]}>
                                            <FontAwesome5
                                                name={insight.severity === 'critical' ? 'shield-alt' : 'info-circle'}
                                                size={24}
                                                color={mainColor}
                                            />
                                        </View>
                                        <Text style={styles.modalTitle}>{insight.title}</Text>
                                    </View>

                                    <Text style={styles.modalDescription}>{insight.details}</Text>

                                    {insight.related_products?.length > 0 && (
                                        <View style={{ marginTop: 20 }}>
                                            <Text style={styles.relatedProductsTitle}>المنتجات المعنية:</Text>
                                            {insight.related_products.map((p, i) => (
                                                <View key={i} style={styles.productChip}>
                                                    <FontAwesome5 name="wine-bottle" size={12} color={C.textSecondary} />
                                                    <Text style={styles.productChipText}>{p}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </>
                            )}

                        <Pressable onPress={handleClose} style={[styles.closeButton, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginTop: 30 }]}>
                            <Text style={[styles.closeButtonText, { color: C.textPrimary }]}>إغلاق</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

const AnimatedScoreRing = React.memo(({ score, color, radius = 28, strokeWidth = 4 }) => {
    const { colors: C } = useTheme();
    const innerRadius = radius - strokeWidth / 2;
    const circumference = 2 * Math.PI * innerRadius;

    const [displayOffset, setDisplayOffset] = useState(circumference);
    const[displayScore, setDisplayScore] = useState(0);

    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        animatedValue.setValue(0);

        const animation = Animated.timing(animatedValue, {
            toValue: score,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false
        });

        const listenerId = animatedValue.addListener(({ value }) => {
            const maxVal = Math.min(Math.max(value, 0), 100);
            const offset = circumference - (maxVal / 100) * circumference;

            setDisplayOffset(offset);
            setDisplayScore(Math.round(value));
        });

        animation.start();

        return () => {
            animatedValue.removeListener(listenerId);
            animation.stop();
        };
    }, [score, circumference]);

    return (
        <View style={{ width: radius * 2, height: radius * 2, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={radius * 2} height={radius * 2} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle
                    cx={radius} cy={radius}
                    r={innerRadius}
                    stroke={C.border}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeOpacity={0.3}
                />
                <Circle
                    cx={radius} cy={radius}
                    r={innerRadius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={displayOffset}
                    strokeLinecap="round"
                />
            </Svg>

            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{
                    fontFamily: 'Tajawal-ExtraBold',
                    fontSize: 13,
                    color: color,
                    textAlign: 'center',
                    paddingTop: 2
                }}>
                    {displayScore}
                </Text>
            </View>
        </View>
    );
});

// ============================================================================
//                       MAIN PROFILE CONTROLLER
// ============================================================================

export default function ProfileScreen() {
    // ========================================================================
    // --- 1. HOOKS, CONTEXT & NAVIGATION ---
    // ========================================================================
    const { user, userProfile, savedProducts, setSavedProducts, loading, logout } = useAppContext();
    const language = useCurrentLanguage();
    const { colors: C, activeThemeId, changeTheme } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const[debugSpf, setDebugSpf] = useState(true);

    // ========================================================================
    // --- 2. CONSTANTS & UI CONFIG ---
    // ========================================================================
    const HEADER_BASE_HEIGHT = 120;
    const headerMaxHeight = HEADER_BASE_HEIGHT + insets.top;
    const headerMinHeight = (Platform.OS === 'ios' ? 90 : 80) + insets.top;
    const scrollDistance = headerMaxHeight - headerMinHeight;

    const TABS =[
        { id: 'shelf', label: t('profile_tab_shelf', language), icon: 'list' },
        { id: 'routine', label: t('profile_tab_routine', language), icon: 'calendar-check' },
        { id: 'analysis', label: t('profile_tab_analysis', language), icon: 'chart-pie' },
        { id: 'migration', label: t('profile_tab_migration', language), icon: 'exchange-alt' },
        { id: 'ingredients', label: t('profile_tab_ingredients', language), icon: 'flask' },
        { id: 'settings', label: t('tab_my_settings', language), icon: 'cog' },
        { id: 'reminders', label: t('profile_header_reminders', language), icon: 'clock' },
    ];

    // ========================================================================
    // --- 3. STATE MANAGEMENT ---
    // ========================================================================
    const [activeTab, setActiveTab] = useState('shelf');
    const [isAddStepModalVisible, setAddStepModalVisible] = useState(false);
    const[addStepHandler, setAddStepHandler] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [dismissedInsightIds, setDismissedInsightIds] = useState([]);
    const [cameraSheetVisible, setCameraSheetVisible] = useState(false);
    
    const[locationPermission, setLocationPermission] = useState('undetermined');
    const[isPermissionModalVisible, setPermissionModalVisible] = useState(false);

    const [analysisData, setAnalysisData] = useState(null);
    const [isAnalyzingProfile, setIsAnalyzingProfile] = useState(false);

    const[weatherData, setWeatherData] = useState(null);
    const [isAnalyzingWeather, setIsAnalyzingWeather] = useState(false);
    const [weatherErrorType, setWeatherErrorType] = useState(null);

    // ========================================================================
    // --- 4. REFS & ANIMATIONS ---
    // ========================================================================
    const scrollY = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(1)).current;
    const contentTranslate = useRef(new Animated.Value(0)).current;

    const analysisCache = useRef({ hash: '', data: null });
    const ingredientsCache = useRef({ hash: '', data:[] });

    const appState = useRef(AppState.currentState);

    const particles = useMemo(() => [...Array(15)].map((_, i) => ({
        id: i,
        size: Math.random() * 5 + 3,
        startX: Math.random() * width,
        duration: 8000 + Math.random() * 7000,
        delay: Math.random() * 5000
    })),[]);

    // ========================================================================
    // --- 5. API LOGIC: PROFILE ANALYSIS (FAST) ---
    // ========================================================================
    const runProfileAnalysis = useCallback(async (forceRefresh = false) => {
        if (!savedProducts || savedProducts.length === 0) return;

        const currentHash = generateFingerprint(savedProducts, userProfile?.settings);

        if (!forceRefresh && analysisCache.current.hash === currentHash && analysisCache.current.data) {
            setAnalysisData(analysisCache.current.data);
            return;
        }

        setIsAnalyzingProfile(true);

        try {
            const response = await fetch(`${PROFILE_API_URL}/analyze-profile.js`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    products: savedProducts,
                    settings: userProfile?.settings || {},
                    currentRoutine: userProfile?.routines
                })
            });

            const data = await response.json();

            if (response.ok) {
                setAnalysisData(data);
                analysisCache.current = { hash: currentHash, data: data };
            }
        } catch (e) {
            console.error("Profile Analysis Error:", e);
        } finally {
            setIsAnalyzingProfile(false);
        }
    },[savedProducts, userProfile]);

    // ========================================================================
    // --- 6. API LOGIC: WEATHER INTELLIGENCE (INDEPENDENT) ---
    // ========================================================================
    const runWeatherAnalysis = useCallback(async () => {
        if (!savedProducts || savedProducts.length === 0) return;

        setIsAnalyzingWeather(true);
        setWeatherErrorType(null);

        try {
            let { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'undetermined') {
                const req = await Location.requestForegroundPermissionsAsync();
                status = req.status;
            }

            setLocationPermission(status);

            if (status !== 'granted') {
                setWeatherErrorType('permission');
                setIsAnalyzingWeather(false);
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});

            let cityName = t('location_my_position', language);
            try {
                const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&localityLanguage=ar`;
                const geoRes = await fetch(geoUrl);
                const geoData = await geoRes.json();
                cityName = geoData.city || geoData.locality || geoData.principalSubdivision || t('location_my_position', language);
            } catch (e) {
                console.log('City fetch warning:', e.message);
            }

            const response = await fetch(`${PROFILE_API_URL}/analyze-weather`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    products: savedProducts,
                    settings: userProfile?.settings || {},
                    location: {
                        lat: loc.coords.latitude,
                        lon: loc.coords.longitude,
                        city: cityName
                    }
                })
            });

            const data = await response.json();

            if (response.ok && data.insights) {
                setWeatherData(data.insights);
            } else {
                setWeatherErrorType('service');
            }

        } catch (e) {
            console.error("Weather Analysis Error:", e);
            setWeatherErrorType('service');
        } finally {
            setIsAnalyzingWeather(false);
        }
    },[savedProducts, userProfile]);

    useEffect(() => {
        const backAction = () => {
            if (activeTab !== 'shelf') {
                setActiveTab('shelf');
                return true; 
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [activeTab]);

    // ========================================================================
    // --- 7. ORCHESTRATOR & LIFECYCLE ---
    // ========================================================================

    const runFullAnalysis = useCallback((isPullToRefresh = false) => {
        if (isPullToRefresh) {
            setRefreshing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
        }

        const profilePromise = runProfileAnalysis(isPullToRefresh);
        runWeatherAnalysis();

        profilePromise.finally(() => {
            if (isPullToRefresh) setRefreshing(false);
        });

    }, [runProfileAnalysis, runWeatherAnalysis]);

    useEffect(() => {
        // OPTIMIZATION: Defer initial heavy fetch until navigation is fully completed
        const task = InteractionManager.runAfterInteractions(() => {
            runFullAnalysis();
        });

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                // OPTIMIZATION: Defer weather refresh on app resume
                InteractionManager.runAfterInteractions(() => {
                    runWeatherAnalysis();
                });
            }
            appState.current = nextAppState;
        });

        return () => {
            task.cancel();
            subscription.remove();
        };
    }, [runFullAnalysis, runWeatherAnalysis]);


    // ========================================================================
    // --- 8. HANDLERS ---
    // ========================================================================

    const openAddStepModal = (onAddCallback) => {
        setAddStepHandler(() => onAddCallback);
        setAddStepModalVisible(true);
    };

    const handleDelete = async (id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        const old = [...savedProducts];
        setSavedProducts(prev => prev.filter(p => p.id !== id));
        try {
            await deleteDoc(doc(db, 'profiles', user.uid, 'savedProducts', id));
        } catch (error) {
            setSavedProducts(old);
            Alert.alert(t('status_error', language), t('error_delete_product', language));
        }
    };

    const handleDismissPraise = (id) => {
        if (!dismissedInsightIds.includes(id)) {
            setDismissedInsightIds(prev => [...prev, id]);
        }
    };

    const switchTab = (tab) => {
        if (tab !== activeTab) {
            Haptics.selectionAsync();
            setActiveTab(tab);
        }
    };

    const headerHeight = scrollY.interpolate({ inputRange: [0, scrollDistance], outputRange:[headerMaxHeight, headerMinHeight], extrapolate: 'clamp' });
    const expandedHeaderOpacity = scrollY.interpolate({ inputRange: [0, scrollDistance / 2], outputRange: [1, 0], extrapolate: 'clamp' });
    const expandedHeaderTranslate = scrollY.interpolate({ inputRange: [0, scrollDistance], outputRange: [0, -20], extrapolate: 'clamp' });
    const collapsedHeaderOpacity = scrollY.interpolate({ inputRange: [scrollDistance / 2, scrollDistance], outputRange: [0, 1], extrapolate: 'clamp' });

    // ========================================================================
    // --- 9. RENDER ---
    // ========================================================================
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {particles.map((p) => <Spore key={p.id} {...p} />)}

            <Animated.View style={[styles.header, { height: headerHeight }]}>
                <LinearGradient
                    colors={[C.background, C.background + 'F2', C.background + '00']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />

                <Animated.View style={[
                    styles.headerContentExpanded,
                    { opacity: expandedHeaderOpacity, transform: [{ translateY: expandedHeaderTranslate }] }
                ]}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.welcomeText}>
                            {t('welcome_back_prefix', language)}، {userProfile?.settings?.name?.split(' ')[0] || t('welcome_back_fallback', language)}
                        </Text>
                        <AuthenticHeader
                            productCount={savedProducts.length}
                            userName={userProfile?.settings?.name}
                        />
                    </View>
                    <View style={styles.avatar}><Text style={{ fontSize: 28 }}>🧖‍♀️</Text></View>
                </Animated.View>

                <Animated.View style={[
                    styles.headerContentCollapsed,
                    { opacity: collapsedHeaderOpacity, height: headerMinHeight - insets.top }
                ]}>
                    <View style={styles.collapsedContainer}>
                        <View style={{ width: 32 }} />
                        <View style={styles.collapsedTitleRow}>
                            <Text style={styles.collapsedTitle}>
                                {getHeaderTitle(activeTab, language).title}
                            </Text>
                            <FontAwesome5
                                name={getHeaderTitle(activeTab, language).icon}
                                size={12}
                                color={C.textSecondary}
                            />
                        </View>
                        <Pressable onPress={() => Haptics.selectionAsync()}>
                            <View style={styles.collapsedAvatar}>
                                <Text style={{ fontSize: 16 }}>🧖‍♀️</Text>
                            </View>
                        </Pressable>
                    </View>
                </Animated.View>
            </Animated.View>

            <Animated.ScrollView
                contentContainerStyle={{ paddingHorizontal: 15, paddingTop: headerMaxHeight + 20, paddingBottom: 100 }}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => runFullAnalysis(true)}
                        tintColor={C.accentGreen}
                        colors={[C.accentGreen]} 
                    />
                }
            >
                <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslate }], minHeight: 400 }}>

                    {activeTab === 'shelf' && (
                        <ShelfSection
                            products={savedProducts}
                            loading={loading}
                            onDelete={handleDelete}
                            onRefresh={() => runFullAnalysis(true)}
                            router={router}
                        />
                    )}
                    {activeTab === 'reminders' && <RemindersScreen />}

                    {activeTab === 'routine' && (
                        <RoutineSection
                            savedProducts={savedProducts}
                            userProfile={userProfile}
                            onOpenAddStepModal={openAddStepModal}
                        />
                    )}

                    {activeTab === 'analysis' && (
                        <AnalysisSection
                            loadingProfile={isAnalyzingProfile}
                            analysisData={analysisData}
                            loadingWeather={isAnalyzingWeather}
                            weatherResults={weatherData}
                            weatherErrorType={weatherErrorType}
                            onRetryWeather={runWeatherAnalysis}
                            savedProducts={savedProducts}
                            dismissedInsightIds={dismissedInsightIds}
                            handleDismissPraise={handleDismissPraise}
                            userProfile={userProfile}
                            locationPermission={locationPermission}
                            onShowPermissionAlert={() => setPermissionModalVisible(true)}
                            router={router}
                        />
                    )}

                    {activeTab === 'ingredients' && (
                        <IngredientsSection
                            products={savedProducts}
                            userProfile={userProfile}
                            cacheRef={ingredientsCache}
                        />
                    )}

                    {activeTab === 'migration' && (
                        <MigrationSection products={savedProducts} />
                    )}

                    {activeTab === 'settings' && (
                        <SettingsSection
                            profile={userProfile}
                            onLogout={() => { logout(); router.replace('/login'); }}
                        />
                    )}

                    {activeTab === 'community' && (
                        <View style={{ padding: 20 }}><Text style={{ color: 'white' }}>{t('tab_community_placeholder', language)}</Text></View>
                    )}

                </Animated.View>
            </Animated.ScrollView>

            <NatureDock
                activeTab={activeTab}
                onTabChange={switchTab} 
                navigation={router}     
            />
            <AddStepModal
                isVisible={isAddStepModalVisible}
                onClose={() => setAddStepModalVisible(false)}
                onAdd={(stepName) => { if (addStepHandler) addStepHandler(stepName); }}
            />

            <LocationPermissionModal
                visible={isPermissionModalVisible}
                onClose={() => setPermissionModalVisible(false)}
            />
        </View>
    );
}

const getStylesContent = (C) => ({
    container: {
        flex: 1,
        backgroundColor: C.background
    },
    divider: {
        height: 1,
        backgroundColor: C.border,
        marginVertical: 12
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1,
        backgroundColor: C.background,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        overflow: 'hidden',
    },
    headerContentExpanded: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingBottom: 15,
    },
    headerContentCollapsed: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    collapsedContainer: {
        flexDirection: 'row', 
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        paddingTop: 5,
    },
    collapsedTitleRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    collapsedTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: C.textPrimary,
    },
    collapsedAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: C.border,
    },
    collapsedBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: C.accentGreen + '20',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: C.accentGreen + '40',
    },
    welcomeText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 26,
        color: C.textPrimary,
        textAlign: 'right',
    },
    subWelcome: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'right',
        marginTop: 2,
    },
    avatar: {
        width: 55,
        height: 55,
        borderRadius: 27.5,
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: C.accentGreen
    },
    cardBase: {
        backgroundColor: C.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: C.border,
        padding: 20,
        marginBottom: 15,
    },
    iconBoxSm: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: C.accentGreen + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        color: C.textSecondary,
        marginBottom: 5,
    },
    statValue: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 22,
        color: C.accentGreen
    },
    statDivider: {
        width: 1,
        height: '60%',
        backgroundColor: C.border,
        alignSelf: 'center'
    },
    productListItemWrapper: {
        backgroundColor: C.card,
        borderRadius: 20,
    },
    productListItem: {
        flexDirection: 'row', 
        alignItems: 'center',
        padding: 12,
        backgroundColor: C.card,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: C.border,
    },
    listItemScoreContainer: {
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listItemContent: {
        flex: 1,
        paddingHorizontal: 12,
        alignItems: 'flex-end', 
    },
    listItemName: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: C.textPrimary,
        marginBottom: 4,
    },
    listItemType: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: C.textSecondary,
    },
    listImageWrapper: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: C.background,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    listProductImage: {
        width: '100%',
        height: '100%',
    },
    listImagePlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    verdictContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    listItemVerdict: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        textAlign: 'right',
    },
    listItemScoreText: {
        position: 'absolute',
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 16,
    },
    deleteActionContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 100,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetContent: {
        flex: 1,
        backgroundColor: C.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: C.border,
        borderBottomWidth: 0,
        maxHeight: height * 0.85,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 20,
    },
    sheetPillarsContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        padding: 15,
        backgroundColor: C.background,
        borderRadius: 16,
        marginBottom: 15,
        marginHorizontal: 15,
    },
    sheetPillar: {
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    sheetDividerVertical: {
        width: 1,
        backgroundColor: C.border,
        marginHorizontal: 10,
    },
    sheetPillarLabel: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: C.textSecondary,
    },
    sheetSection: {
        paddingHorizontal: 15,
        marginBottom: 15,
    },
    sheetSectionTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: C.textPrimary,
        textAlign: 'right',
        marginBottom: 10,
        paddingRight: 5,
    },
    alertBox: {
        flexDirection: 'row-reverse', 
        alignItems: 'center',
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
        marginBottom: 8,
    },
    alertBoxText: {
        flex: 1,
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        textAlign: 'right', 
        lineHeight: 20,
    },
    ingredientChip: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 10,
    },
    ingredientChipText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: C.textSecondary,
        textAlign: 'center',
    },
    titleDisplayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        width: '100%',
    },
    editIconBtn: {
        padding: 8,
        backgroundColor: C.accentGreen + '1A', 
        borderRadius: 8,
        marginLeft: -12
    },
    editTitleContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
        gap: 10,
        paddingHorizontal: 20,
    },
    editTitleInput: {
        width: '100%',
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: C.textPrimary,
        backgroundColor: C.background,
        borderWidth: 1,
        borderColor: C.accentGreen,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 15,
        textAlign: 'center', 
    },
    editActionsRow: {
        flexDirection: 'row-reverse',
        gap: 1,
    },
    editActionBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent', 
    },
    focusInsightCard: {
        borderRadius: 24,
        padding: 25,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    focusInsightHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    focusInsightTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        color: C.textPrimary,
    },
    focusInsightSummary: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'right',
        marginTop: 12,
        lineHeight: 22,
    },
    focusInsightAction: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 20,
    },
    focusInsightActionText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: C.accentGreen,
    },
    allClearContainer: {
        alignItems: 'center',
        padding: 30,
        marginBottom: 25,
    },
    allClearIconWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.2)',
    },
    allClearTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: C.textPrimary,
    },
    allClearSummary: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: C.textSecondary,
        textAlign: 'center',
        marginTop: 5,
        lineHeight: 20,
    },
    carouselTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: C.textPrimary,
        textAlign: 'right',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    carouselContentContainer: {
        paddingHorizontal: 5,
        paddingBottom: 25,
    },
    modernCardContainer: {
        width: 150,
        height: 150,
        borderRadius: 22,
        padding: 14,
        justifyContent: 'space-between',
        borderWidth: 1,
        backgroundColor: C.card,
        overflow: 'hidden',
    },
    modernCardHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modernIconBox: {
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        opacity: 0.6,
    },
    modernCardTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: C.textPrimary,
        textAlign: 'right',
        lineHeight: 18,
        marginTop: 8,
        marginBottom: 4,
    },
    modernCardFooter: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        opacity: 0.8,
    },
    readMoreText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
    },
    overviewContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        gap: 12,
    },
    overviewCard: {
        flex: 1,
    },
    analysisCardHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
        opacity: 0.8,
    },
    analysisCardTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: C.textSecondary,
    },
    sunProtectionContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 5,
        flex: 1,
        justifyContent: 'center',
    },
    sunProtectionNote: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: C.textSecondary,
        textAlign: 'right',
        lineHeight: 16,
    },
    searchBar: {
        flexDirection: 'row-reverse',
        backgroundColor: C.card,
        borderRadius: 14,
        paddingHorizontal: 15,
        height: 44,
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: C.border,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Tajawal-Regular',
        color: C.textPrimary,
        marginRight: 10,
        fontSize: 14,
        textAlign: 'right',
        paddingVertical: 10,
    },
    ingCard: {
        backgroundColor: C.card,
        borderRadius: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    ingCardContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 12,
        gap: 12,
        width: '100%',
    },
    ingCountBadge: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    ingCountText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
    },
    ingInfoContainer: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    ingNameText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: C.textPrimary,
        textAlign: 'right',
    },
    ingSciText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: C.textDim,
        textAlign: 'right',
        fontStyle: 'italic',
        marginTop: -2,
    },
    ingTagsRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    ingCategoryTag: {
        backgroundColor: C.accentGreen + '1A', 
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: C.accentGreen + '33', 
    },
    ingTagLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
        color: C.accentGreen,
    },
    ingModalHeader: {
        backgroundColor: C.card,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    ingModalTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 22,
        color: C.textPrimary,
        textAlign: 'right',
        marginBottom: 4,
    },
    ingModalScientific: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: C.textSecondary,
        textAlign: 'right',
        fontStyle: 'italic',
        marginBottom: 12,
    },
    ingTypeBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    ingTypeText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
    },
    ingBadgesRow: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 15,
    },
    ingBadge: {
        backgroundColor: C.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: C.border,
    },
    ingBadgeText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: C.textSecondary,
    },
    ingSection: {
        marginBottom: 30,
    },
    ingSectionTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: C.textPrimary,
        textAlign: 'right',
        marginBottom: 15,
        borderRightWidth: 3,
        borderRightColor: C.accentGreen,
        paddingRight: 10,
    },
    benefitRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 12,
    },
    benefitLabel: {
        flex: 1.2,
        textAlign: 'right',
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: C.textSecondary,
    },
    benefitBarContainer: {
        flex: 2,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 3,
        marginHorizontal: 12,
        flexDirection: 'row-reverse',
    },
    benefitBarFill: {
        height: '100%',
        backgroundColor: C.accentGreen,
        borderRadius: 3,
    },
    benefitScore: {
        width: 30,
        textAlign: 'left',
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: C.textPrimary,
    },
    warningBox: {
        flexDirection: 'row-reverse',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
        alignItems: 'flex-start',
    },
    warningBoxRisk: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    warningBoxCaution: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    warningText: {
        flex: 1,
        textAlign: 'right',
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        lineHeight: 20,
    },
    interactionHeader: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: C.textPrimary,
        marginBottom: 10,
        textAlign: 'right',
    },
    synergyItem: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: C.success,
        marginBottom: 6,
        textAlign: 'right',
        paddingRight: 5,
    },
    conflictItem: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: C.danger,
        marginBottom: 6,
        textAlign: 'right',
        paddingRight: 5,
    },
    noDataText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: C.textDim,
        fontStyle: 'italic',
        textAlign: 'right',
        opacity: 0.7,
    },
    productChip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        backgroundColor: C.background,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: C.border,
    },
    productChipText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: C.textSecondary,
        flex: 1,
        textAlign: 'right',
    },
    loadMoreButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: C.card,
        paddingVertical: 12,
        marginVertical: 20,
        marginHorizontal: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: C.accentGreen,
        marginBottom: 120
    },
    loadMoreText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: C.textPrimary,
    },
    migName: {
        fontFamily: 'Tajawal-Bold',
        color: C.textPrimary,
        fontSize: 16,
        textAlign: 'right',
        flex: 1,
    },
    badBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 6,
        marginBottom: 4,
    },
    criticalBadge: {
        backgroundColor: C.danger,
    },
    badText: {
        color: C.danger,
        fontSize: 9,
        fontFamily: 'Tajawal-Bold'
    },
    migReason: {
        fontFamily: 'Tajawal-Regular',
        color: C.textSecondary,
        fontSize: 12,
        textAlign: 'right',
        marginTop: 8
    },
    migSuggestion: {
        fontFamily: 'Tajawal-Regular',
        color: C.accentGreen,
        textAlign: 'right',
        fontSize: 13,
        marginTop: 8,
        backgroundColor: C.accentGreen + '1A', 
        padding: 10,
        borderRadius: 10
    },
    migrationTip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        padding: 8,
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderRadius: 8,
    },
    migrationTipText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: C.gold,
        flex: 1,
    },
    accordionHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
        backgroundColor: 'transparent',
    },
    accordionTitle: {
        fontFamily: 'Tajawal-Bold',
        color: C.textPrimary,
        fontSize: 16,
    },
    accordionBody: {
        padding: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: C.border,
    },
    settingGroup: {
        marginVertical: 10,
    },
    groupLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'right',
        marginBottom: 12,
    },
    chipsRow: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: C.background,
        borderWidth: 1,
        borderColor: C.border,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    chipActive: {
        backgroundColor: C.accentGreen,
        borderColor: C.accentGreen,
    },
    chipText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: C.textSecondary,
    },
    chipTextActive: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: C.textOnAccent,
    },
    logoutBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.5)',
        gap: 10
    },
    logoutText: {
        fontFamily: 'Tajawal-Bold',
        color: C.danger,
        fontSize: 16
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 99,
    },
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.85, 
        zIndex: 100,
        justifyContent: 'flex-end',
    },
    sheetHandleBar: {
        alignItems: 'center',
        paddingVertical: 15,
        width: '100%',
        backgroundColor: C.card,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.02)',
    },
    sheetHandle: {
        width: 48,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
    },
    sheetProductTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 22,
        color: C.textPrimary,
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 20,
    },
    closeButton: {
        backgroundColor: C.card,
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        marginBottom: 20, 
    },
    closeButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: C.textPrimary,
    },
    promptButtonRow: {
        flexDirection: 'row-reverse',
        gap: 10,
        marginHorizontal: 20,
    },
    promptButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    promptButtonPrimary: {
        backgroundColor: C.accentGreen,
    },
    promptButtonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: C.border,
    },
    promptButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
    },
    promptButtonTextPrimary: {
        color: C.textOnAccent,
        fontFamily: 'Tajawal-Bold',
    },
    promptButtonTextSecondary: {
        color: C.textSecondary,
        fontFamily: 'Tajawal-Bold',
    },
    modalContent: {
        width: '90%',
        maxHeight: height * 0.6,
    },
    modalItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    modalItemName: {
        fontFamily: 'Tajawal-Regular',
        color: C.textPrimary,
        fontSize: 14,
    },
    barrierTrack: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 4,
        width: '100%',
        marginBottom: 10,
        overflow: 'hidden',
    },
    barrierFill: {
        height: '100%',
        borderRadius: 4,
    },
    barrierDesc: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: C.textSecondary,
        textAlign: 'right',
        lineHeight: 18,
    },
    barrierScoreBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    educationBox: {
        backgroundColor: C.background,
        padding: 15,
        borderRadius: 16,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: C.border,
    },
    educationTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: C.textPrimary,
    },
    educationText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: C.textSecondary,
        lineHeight: 22,
        textAlign: 'right',
    },
    balanceBarTrack: {
        height: 12,
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
        width: '100%',
        marginBottom: 5,
    },
    balanceBarSegment: {
        height: '100%',
    },
    colHeader: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        textAlign: 'right',
        marginBottom: 10,
    },
    miniProductRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    miniProductText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: C.textSecondary,
        flex: 1,
        textAlign: 'right',
        marginLeft: 10,
    },
    miniProductScore: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
    },
    miniProductIngs: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        color: C.textDim,
        textAlign: 'right',
        marginTop: 2,
        marginLeft: 10
    },
    customAlertOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
    },
    customAlertBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    customAlertContainer: {
        width: '85%',
        backgroundColor: C.card,
        borderRadius: 28,
        padding: 25,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        elevation: 20,
    },
    customAlertIconContainer: {
        marginBottom: 15,
        marginTop: -45,
        shadowColor: C.accentGreen,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    customAlertIconBg: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: C.card,
    },
    customAlertTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 20,
        color: C.textPrimary,
        marginBottom: 8,
        marginTop: 5,
    },
    customAlertBody: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
        paddingHorizontal: 10,
    },
    customAlertSteps: {
        width: '100%',
        alignItems: 'flex-end',
        marginBottom: 25,
        paddingRight: 10,
    },
    stepItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    stepText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: C.textPrimary,
    },
    boldText: {
        fontFamily: 'Tajawal-Bold',
        color: C.textPrimary,
    },
    stepConnector: {
        height: 12,
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginRight: 11.5,
        marginVertical: 4,
    },
    customAlertActions: {
        flexDirection: 'row-reverse',
        gap: 12,
        width: '100%',
    },
    customAlertBtnPrimary: {
        flex: 1,
        backgroundColor: C.accentGreen,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: C.accentGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    btnContentWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    customAlertBtnSecondary: {
        flex: 0.6,
        backgroundColor: 'transparent',
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: C.border,
    },
    customAlertBtnTextPrimary: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: C.textOnAccent,
        textAlign: 'center',
    },
    customAlertBtnTextSecondary: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: C.textSecondary,
        textAlign: 'center',
    },
    weatherWidgetCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderRadius: 22,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    weatherIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    weatherWidgetTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 16,
        color: '#fff',
        textAlign: 'right',
        marginBottom: 6,
    },
    weatherWidgetSub: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'right',
    },
    weatherPillsRow: {
        flexDirection: 'row-reverse',
        gap: 8,
    },
    weatherPill: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        gap: 4,
    },
    weatherPillText: {
        color: '#fff',
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
    },
    weatherActionBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginRight: 5,
        gap: 4
    },
    weatherActionText: {
        color: '#fff',
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
    },
    weatherCardContainer: {
        width: 150,
        height: 150,
        borderRadius: 22,
        padding: 14,
        justifyContent: 'space-between',
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    weatherCardHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    weatherIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
        opacity: 0.8,
    },
    weatherCardTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15,
        color: '#fff',
        textAlign: 'right',
        marginTop: 8,
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    weatherCardFooter: {
        flexDirection: 'row-reverse',
    },
    glassPill: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'flex-start',
    },
    glassPillText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        color: '#fff',
    },
    glassSeparator: {
        width: 1,
        height: 10,
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginHorizontal: 6,
    },
    modalTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 20,
        color: C.textPrimary,
        textAlign: 'center',
        marginBottom: 15,
    },
    modalDescription: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'right', 
        lineHeight: 24,
        marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    modalIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centeredModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)', 
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    relatedProductsTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: C.textPrimary,
        textAlign: 'right',
        marginBottom: 10,
        marginTop: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        position: 'relative',
    },
    enhancedInput: {
        flex: 1,
        backgroundColor: C.background,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 15,
        paddingRight: 45, 
        color: C.textPrimary,
        fontSize: 16,
        textAlign: 'right', 
    },
    inputIcon: {
        position: 'absolute',
        right: 15,
        zIndex: 1,
    },
    reorderItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: C.background, 
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
    },
    selectionCard: {
        width: '85%',
        backgroundColor: C.card,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 20,
    },
    selectionHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    selectionTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: C.textPrimary,
    },
    closeIconBtn: {
        padding: 5,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
    },
    modalSearchBar: {
        flexDirection: 'row-reverse',
        backgroundColor: C.background,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 40,
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: C.border,
    },
    modalSearchInput: {
        flex: 1,
        fontFamily: 'Tajawal-Regular',
        color: C.textPrimary,
        fontSize: 13,
        textAlign: 'right',
        paddingRight: 8,
    },
    selectionItem: {
        width: '100%',
        flexDirection: 'row-reverse', 
        alignItems: 'center',         
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(255,255,255,0.02)', 
        borderRadius: 12,
        marginBottom: 8, 
    },
    selectionIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: C.accentGreen + '20',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: C.accentGreen + '40',
    },
    selectionItemText: {
        flex: 1, 
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: C.textPrimary,
        textAlign: 'right', 
        marginHorizontal: 15, 
    },
    selectionActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectionCardWrapper: {
        backgroundColor: 'rgba(255,255,255,0.02)', 
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden', 
    },
    selectionRow: {
        flexDirection: 'row-reverse', 
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        width: '100%',
    },
    productImageContainer: {
        width: 120,
        height: 120,
        borderRadius: 24,
        marginBottom: 15,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        position: 'relative'
    },
    productRealImage: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    scoreBadgeFloat: {
        position: 'absolute',
        bottom: -10,
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: C.card
    },
    scoreBadgeText: {
        fontFamily: 'Tajawal-ExtraBold',
        color: '#1A2D27', 
        fontSize: 14
    },
    emptyStateCard: {
        alignItems: 'center',
        padding: 30,
        paddingVertical: 40,
        marginTop: 20,
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.accentGreen + '33',
        overflow: 'hidden', 
    },
    emptyStateIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: C.accentGreen + '4D',
        overflow: 'hidden',
        shadowColor: C.accentGreen,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    emptyStateTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 20,
        color: C.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyStateSub: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: C.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 25,
        paddingHorizontal: 10,
    },
    emptyStateHint: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(251, 191, 36, 0.1)', 
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)',
    },
    emptyStateHintText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: C.gold,
    },
    sheetActionsRow: {
        flexDirection: 'row-reverse',
        gap: 10,
        marginBottom: 20,
        width: '100%',
    },
    sheetShareBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        width: '100%', 
    },
    sheetDeleteBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1,
    },
    sheetBtnText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
    },
});
const styles = StyleSheet.create(getStylesContent(THEMES.original.colors));
const createStyles = (c) => StyleSheet.create(getStylesContent(c));