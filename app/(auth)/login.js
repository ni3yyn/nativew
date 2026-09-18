import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    Dimensions, KeyboardAvoidingView, Platform, ScrollView,
    Animated, Easing, StatusBar, Linking,
    ActivityIndicator, Image
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db } from '../../src/config/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { t } from '../../src/i18n';
import { useCurrentLanguage } from '../../src/hooks/useCurrentLanguage';
import { useTheme } from '../../src/context/ThemeContext';

const { width, height } = Dimensions.get('window');

const THEME_OPTIONS = [
    { id: 'original', icon: 'tree', color: '#5A9C84' },
    { id: 'light', icon: 'sun', color: '#3D9275' },
    { id: 'baby_pink', icon: 'heart', color: '#C83F70' },
    { id: 'clinical_blue', icon: 'moon', color: '#6CB4EE' },
];

// --- BORDERLESS FREE-FLOATING LOGO ---
const AppLogo = ({ COLORS, isDark, styles }) => (
    <View style={styles.logoWrapper}>
        <View style={[styles.logoGlow, { backgroundColor: COLORS.accentGreen }]} />
        <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
        />
    </View>
);

// --- ACCESSIBLE FLOATING TOAST ---
const FloatingToast = ({ visible, title, message, type, lang, COLORS, isDark, styles }) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, { toValue: Platform.OS === 'ios' ? 54 : 40, friction: 7, tension: 40, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true })
            ]).start();
        } else {
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
                translateY.setValue(-100);
            });
        }
    }, [visible]);

    const isError = type === 'error';
    const isRTL = lang === 'ar';

    const toastBg = isDark ? '#1F2421' : '#FFFFFF';
    const iconName = isError ? 'exclamation-circle' : 'check-circle';
    const iconColor = isError ? COLORS.danger : COLORS.accentGreen;

    return (
        <Animated.View 
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
                styles.toastContainer, 
                { 
                    opacity, 
                    transform: [{ translateY }], 
                    backgroundColor: toastBg,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    shadowColor: isDark ? '#000' : iconColor,
                }
            ]}
        >
            <View style={[styles.toastIconBox, { backgroundColor: iconColor + '18' }]}>
                <FontAwesome5 name={iconName} size={16} color={iconColor} />
            </View>
            <View style={[styles.toastContent, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}>
                <Text style={[styles.toastTitle, { color: COLORS.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {title}
                </Text>
                <Text style={[styles.toastMessage, { color: COLORS.textDim, textAlign: isRTL ? 'right' : 'left' }]}>
                    {message}
                </Text>
            </View>
        </Animated.View>
    );
};

// --- ARCHITECTURAL INPUT (RTL PLACEHOLDER WHEN ARABIC, LTR INPUT) ---
const BioInput = ({ icon, COLORS, isDark, styles, placeholder, value, isRTL, ...props }) => {
    const [focused, setFocused] = useState(false);
    const focusAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(focusAnim, {
            toValue: focused ? 1 : 0,
            duration: 240,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
        }).start();
    }, [focused]);

    const underlineScale = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.001, 1]
    });

    const iconScale = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.12]
    });

    const inputBg = isDark
        ? (focused ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.22)')
        : (focused ? 'rgba(61, 146, 117, 0.09)' : 'rgba(24, 53, 45, 0.045)');

    return (
        <View style={[
            styles.inputContainer, 
            { 
                backgroundColor: inputBg,
                flexDirection: isRTL ? 'row-reverse' : 'row'
            }
        ]}>
            {/* Ambient Animated Icon */}
            <Animated.View style={[styles.inputIconBox, { transform: [{ scale: iconScale }] }]}>
                <Ionicons 
                    name={icon} 
                    size={20} 
                    color={focused ? COLORS.accentGreen : COLORS.textDim} 
                />
            </Animated.View>

            {/* Field Area: Placeholder aligns to RTL when Arabic, Input is strictly LTR */}
            <View style={styles.inputFieldWrapper}>
                {!value && !focused && (
                    <View 
                        pointerEvents="none" 
                        style={[
                            styles.placeholderOverlay,
                            { alignItems: isRTL ? 'flex-end' : 'flex-start' }
                        ]}
                    >
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.placeholderText,
                                { 
                                    color: COLORS.textDim,
                                    textAlign: isRTL ? 'right' : 'left',
                                    writingDirection: isRTL ? 'rtl' : 'ltr',
                                }
                            ]}
                        >
                            {placeholder}
                        </Text>
                    </View>
                )}
                <TextInput
                    placeholder=""
                    value={value}
                    style={[
                        styles.textInput,
                        { 
                            color: COLORS.textPrimary,
                            textAlign: 'left',
                            writingDirection: 'ltr',
                        }
                    ]}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    selectionColor={COLORS.accentGreen}
                    underlineColorAndroid="transparent"
                    {...props}
                />
            </View>

            {/* Inactive Bottom Baseline */}
            <View 
                style={[
                    styles.inactiveBottomLine, 
                    { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)' }
                ]} 
            />

            {/* Active Focused Bottom Underline */}
            <Animated.View 
                style={[
                    styles.activeBottomLine, 
                    { 
                        backgroundColor: COLORS.accentGreen,
                        transform: [{ scaleX: underlineScale }]
                    }
                ]} 
            />
        </View>
    );
};

// --- AMBIENT BOTANICAL SPORES ---
const Spore = ({ size, startX, duration, delay, color }) => {
    const animY = useRef(new Animated.Value(0)).current;
    const animX = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(scale, { toValue: 1, duration: 1000, delay: delay, useNativeDriver: true }).start();
        const floatLoop = Animated.loop(Animated.timing(animY, { toValue: 1, duration: duration, easing: Easing.linear, useNativeDriver: true }));
        const driftLoop = Animated.loop(Animated.sequence([
            Animated.timing(animX, { toValue: 1, duration: duration * 0.33, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
            Animated.timing(animX, { toValue: -1, duration: duration * 0.33, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
            Animated.timing(animX, { toValue: 0, duration: duration * 0.34, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ]));

        const timeout = setTimeout(() => { floatLoop.start(); driftLoop.start(); }, delay);
        return () => { clearTimeout(timeout); floatLoop.stop(); driftLoop.stop(); };
    }, []);

    const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [height + 50, -100] });
    const translateX = animX.interpolate({ inputRange: [-1, 1], outputRange: [-25, 25] });

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute', 
                left: startX, 
                width: size, 
                height: size,
                borderRadius: size / 2, 
                backgroundColor: color,
                transform: [{ translateY }, { translateX }, { scale }],
                opacity: 0.22, 
                zIndex: 0,
            }}
        />
    );
};

// --- MAIN SCREEN ---
export default function LoginScreen() {
    const currentLanguage = useCurrentLanguage();
    const [language, setLanguage] = useState('ar');
    const [isLogin, setIsLogin] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info' });

    // Dynamic Theme Hook
    const { theme, colors, activeThemeId, changeTheme } = useTheme();
    const COLORS = colors;
    const isDark = theme?.isDark ?? true;
    const isLightTheme = activeThemeId === 'light';
    const styles = useMemo(() => createLoginStyles(COLORS, isDark), [COLORS, isDark]);

    useEffect(() => {
        if (currentLanguage) {
            setLanguage(currentLanguage);
        }
    }, [currentLanguage]);

    const isRTL = language === 'ar';
    const rtl = {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        textAlign: isRTL ? 'right' : 'left',
        flexStart: isRTL ? 'flex-end' : 'flex-start',
        flexEnd: isRTL ? 'flex-start' : 'flex-end',
        alignSelf: isRTL ? 'flex-end' : 'flex-start',
    };

    const containerOpacity = useRef(new Animated.Value(0)).current;
    const contentTranslateY = useRef(new Animated.Value(20)).current;
    const formOpacity = useRef(new Animated.Value(1)).current;
    const formSlide = useRef(new Animated.Value(0)).current;

    const router = useRouter();

    const particles = useMemo(() => [...Array(18)].map((_, i) => ({
        id: i, 
        size: Math.random() * 4.5 + 2.5, 
        startX: Math.random() * width, 
        duration: 11000 + Math.random() * 7000, 
        delay: Math.random() * 4000
    })), []);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(containerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(contentTranslateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
        ]).start();
    }, []);

    // Jitter-free cross-fade transition
    const switchMode = () => {
        Animated.parallel([
            Animated.timing(formOpacity, { toValue: 0, duration: 110, useNativeDriver: true }),
            Animated.timing(formSlide, { toValue: 6, duration: 110, useNativeDriver: true })
        ]).start(() => {
            setIsLogin(prev => !prev);
            setAlertConfig(prev => ({ ...prev, visible: false }));
            formSlide.setValue(-6);
            Animated.parallel([
                Animated.timing(formOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
                Animated.spring(formSlide, { toValue: 0, friction: 8, useNativeDriver: true })
            ]).start();
        });
    };

    const showToast = (title, message, type = 'info') => {
        setAlertConfig({ visible: true, title, message, type });
        setTimeout(() => setAlertConfig(prev => ({ ...prev, visible: false })), 4000);
    };

    const handleAuth = async () => {
        if (!email || !password) {
            showToast(t('auth_missing_fields_title', language), t('auth_missing_fields_message', language), "error");
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                router.replace('/profile');
            } else {
                if (password.length < 6) throw new Error("password-short");

                const cred = await createUserWithEmailAndPassword(auth, email, password);

                await setDoc(doc(db, 'profiles', cred.user.uid), {
                    email: cred.user.email,
                    createdAt: Timestamp.now(),
                    onboardingComplete: false,
                    settings: {
                        name: '',
                        gender: '',
                        skinType: '',
                        scalpType: '',
                        language: language,
                        goals: [],
                        conditions: [],
                        allergies: []
                    },
                    routines: { am: [], pm: [] }
                });

                router.replace('/(onboarding)/welcome');
            }
        } catch (err) {
            let title = t('auth_error_signin_title', language);
            let msg = err.message;
            if (msg.includes('auth/invalid-credential')) msg = t('auth_invalid_credentials', language);
            if (msg.includes('auth/email-already-in-use')) msg = t('auth_email_in_use', language);
            if (msg.includes('password-short')) { title = t('auth_weak_password_title', language); msg = t('auth_weak_password_message', language); }

            showToast(title, msg, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            showToast(t('auth_notice_title', language), t('auth_enter_email_first', language), "error");
            return;
        }

        setResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            showToast(t('auth_reset_sent_title', language), t('auth_reset_sent_message', language), "info");
        } catch (err) {
            let title = t('auth_error_title', language);
            let msg = err.message;
            if (msg.includes('auth/user-not-found')) msg = t('auth_user_not_found', language);
            if (msg.includes('auth/invalid-email')) msg = t('auth_invalid_email', language);
            showToast(title, msg, "error");
        } finally {
            setResetLoading(false);
        }
    };

    const renderContent = () => (
        <View style={styles.container}>
            <StatusBar 
                barStyle={isDark ? "light-content" : "dark-content"} 
                translucent 
                backgroundColor="transparent" 
            />

            {particles.map((p) => <Spore key={p.id} {...p} color={COLORS.accentGreen} />)}

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={styles.keyboardContainer}
            >
                <ScrollView 
                    style={styles.scrollWrapper}
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={{ opacity: containerOpacity, transform: [{ translateY: contentTranslateY }], width: '100%' }}>

                        {/* Wathiq Header */}
                        <View style={styles.brandContainer}>
                            <AppLogo COLORS={COLORS} isDark={isDark} styles={styles} />
                            <Text style={[styles.brandTitle, { color: COLORS.textPrimary }]}>
                                {t('auth_brand_title', language)}
                            </Text>
                            <Text style={[styles.brandSubtitle, { color: COLORS.textSecondary }]}>
                                {t('auth_brand_subtitle', language)}
                            </Text>
                        </View>

                        {/* Form Body */}
                        <Animated.View style={[styles.formContainer, { opacity: formOpacity, transform: [{ translateY: formSlide }] }]}>

                            <Text style={[styles.formTitle, { color: COLORS.textPrimary }]}>
                                {isLogin ? t('auth_welcome_back', language) : t('auth_join_family', language)}
                            </Text>

                            <View style={styles.inputsGroup}>
                                <BioInput
                                    icon="mail-outline"
                                    placeholder={t('auth_email_placeholder', language)}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    isRTL={isRTL}
                                    COLORS={COLORS}
                                    isDark={isDark}
                                    styles={styles}
                                />

                                <BioInput
                                    icon="lock-closed-outline"
                                    placeholder={t('auth_password_placeholder', language)}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    isRTL={isRTL}
                                    COLORS={COLORS}
                                    isDark={isDark}
                                    styles={styles}
                                />
                            </View>

                            {/* Standardized Height Slot: Prevents Up/Down Jumping on Mode Switch */}
                            <View style={styles.contextSlot}>
                                {isLogin ? (
                                    <TouchableOpacity 
                                        style={[styles.forgotPasswordBtn, { alignSelf: rtl.flexStart }]} 
                                        onPress={handleForgotPassword} 
                                        disabled={resetLoading}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        activeOpacity={0.65}
                                    >
                                        {resetLoading ? (
                                            <ActivityIndicator size="small" color={COLORS.accentGreen} />
                                        ) : (
                                            <Text style={[styles.forgotPasswordText, { color: COLORS.textSecondary }]}>
                                                {t('auth_forgot_password', language)}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.privacyContainer}>
                                        <Text style={[styles.privacyText, { color: COLORS.textSecondary, textAlign: rtl.textAlign }]}>
                                            {t('auth_privacy_agree_prefix', language)}
                                            <Text
                                                style={[styles.privacyLink, { color: COLORS.accentGreen }]}
                                                onPress={() => Linking.openURL('https://wathiq.web.app/privacy')}
                                            >
                                                {t('auth_privacy_policy', language)}
                                            </Text>
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Action Button */}
                            <TouchableOpacity
                                style={[
                                    styles.mainBtnWrapper, 
                                    { backgroundColor: COLORS.accentGreen, shadowColor: COLORS.accentGreen },
                                    loading && { opacity: 0.7 }
                                ]}
                                onPress={handleAuth}
                                disabled={loading}
                                activeOpacity={0.88}
                            >
                                <LinearGradient
                                    colors={[COLORS.accentGreen, COLORS.primary || '#3D9275']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[styles.mainBtnGradient, { backgroundColor: COLORS.accentGreen }]}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={COLORS.textOnAccent} size="small" />
                                    ) : (
                                        <Text style={[styles.btnText, { color: COLORS.textOnAccent }]}>
                                            {isLogin ? t('auth_button_login', language) : t('auth_button_signup', language)}
                                        </Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.switchBtn} 
                                onPress={switchMode} 
                                activeOpacity={0.65}
                                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
                            >
                                <Text style={[styles.switchText, { color: COLORS.textDim }]}>
                                    {isLogin ? t('auth_no_account_prefix', language) : t('auth_have_account_prefix', language)}
                                    <Text style={[styles.linkText, { color: COLORS.accentGreen }]}>
                                        {isLogin ? t('auth_create_account', language) : t('auth_sign_in', language)}
                                    </Text>
                                </Text>
                            </TouchableOpacity>

                        </Animated.View>

                        {/* Bottom Utility Controls */}
                        <View style={styles.bottomControls}>
                            
                            {/* Theme Selector */}
                            <View style={[styles.themePill, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                {THEME_OPTIONS.map((item) => {
                                    const isSelected = activeThemeId === item.id;
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                changeTheme(item.id);
                                            }}
                                            style={styles.themeTouchable}
                                        >
                                            <View style={[
                                                styles.themeIconBox,
                                                isSelected && { backgroundColor: item.color + '22', borderColor: item.color }
                                            ]}>
                                                <FontAwesome5 
                                                    name={item.icon} 
                                                    size={13} 
                                                    color={isSelected ? item.color : COLORS.textDim} 
                                                />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Flat Segmented Language Switcher (Shadowless) */}
                            <View style={[styles.languagePill, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                <TouchableOpacity 
                                    style={[
                                        styles.langBtn,
                                        language === 'ar' && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.05)' }
                                    ]}
                                    onPress={() => { Haptics.selectionAsync(); setLanguage('ar'); }}
                                >
                                    <Text style={[
                                        styles.langText, 
                                        language === 'ar' ? { color: COLORS.accentGreen, fontFamily: 'Tajawal-Bold' } : { color: COLORS.textDim }
                                    ]}>
                                        العربية
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[
                                        styles.langBtn,
                                        language === 'en' && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.05)' }
                                    ]}
                                    onPress={() => { Haptics.selectionAsync(); setLanguage('en'); }}
                                >
                                    <Text style={[
                                        styles.langText, 
                                        language === 'en' ? { color: COLORS.accentGreen, fontFamily: 'Tajawal-Bold' } : { color: COLORS.textDim }
                                    ]}>
                                        English
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.copyright, { color: COLORS.textDim }]}>
                                {t('auth_copyright', language)}
                            </Text>
                        </View>

                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Notification Toast */}
            <FloatingToast 
                visible={alertConfig.visible} 
                title={alertConfig.title} 
                message={alertConfig.message} 
                type={alertConfig.type} 
                lang={language} 
                COLORS={COLORS}
                isDark={isDark}
                styles={styles}
            />
        </View>
    );

    if (isLightTheme) {
        return (
            <LinearGradient
                colors={[
                    COLORS.background,
                    COLORS.gradientStart || COLORS.background,
                    COLORS.gradientMid || COLORS.accentGreen + '10',
                    COLORS.gradientEnd || COLORS.accentGreen + '20',
                    'rgba(61, 146, 117, 0.25)'
                ]}
                locations={[0, 0.3, 0.6, 0.85, 1]}
                style={{ flex: 1 }}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            >
                {renderContent()}
            </LinearGradient>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            {renderContent()}
        </View>
    );
}

const createLoginStyles = (COLORS, isDark) => StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: 'transparent' 
    },
    keyboardContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollWrapper: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: { 
        flexGrow: 1, 
        justifyContent: 'center', 
        paddingHorizontal: 26, 
        paddingTop: Platform.OS === 'ios' ? 24 : 36,
        paddingBottom: Platform.OS === 'android' ? 68 : 44,
    },

    // Header & Logo (Borderless, Free Floating)
    brandContainer: { 
        alignItems: 'center', 
        marginBottom: 24, 
        marginTop: 6 
    },
    logoWrapper: {
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 12,
        position: 'relative',
    },
    logoImage: {
        width: 72,
        height: 72,
    },
    logoGlow: {
        position: 'absolute', 
        width: 84, 
        height: 84, 
        borderRadius: 42,
        opacity: isDark ? 0.18 : 0.12,
        transform: [{ scale: 1.2 }],
    },
    brandTitle: {
        fontSize: 30, 
        fontFamily: 'Tajawal-ExtraBold', 
        letterSpacing: 0.4, 
        marginBottom: 2,
    },
    brandSubtitle: { 
        fontSize: 13.5, 
        fontFamily: 'Tajawal-Regular',
        opacity: 0.85,
    },

    // Form Section
    formContainer: {
        width: '100%',
    },
    formTitle: { 
        fontSize: 22, 
        lineHeight: 28,
        textAlign: 'center',
        marginBottom: 18, 
        fontFamily: 'Tajawal-Bold',
        letterSpacing: 0.2,
    },
    inputsGroup: {
        gap: 14,
        marginBottom: 8,
    },

    // Inputs (RTL placeholder support, strictly LTR input)
    inputContainer: {
        height: 54, 
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
        borderWidth: 0,
        paddingHorizontal: 12,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    inputIconBox: { 
        width: 36, 
        height: 36,
        alignItems: 'center', 
        justifyContent: 'center',
    },
    inputFieldWrapper: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
        position: 'relative',
        paddingHorizontal: 8,
    },
    placeholderOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    placeholderText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 16,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    textInput: { 
        width: '100%',
        height: '100%',
        fontSize: 16,
        fontFamily: 'Tajawal-Regular',
        includeFontPadding: false,
        textAlignVertical: 'center',
        paddingVertical: 0,
        margin: 0,
    },
    inactiveBottomLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 1,
    },
    activeBottomLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2.5,
    },

    // Standardized Middle Slot (Keeps Form Height Locked)
    contextSlot: {
        height: 46,
        justifyContent: 'center',
    },
    forgotPasswordBtn: {
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    forgotPasswordText: {
        fontSize: 12.5,
        fontFamily: 'Tajawal-Regular',
    },
    privacyContainer: {
        paddingHorizontal: 4,
    },
    privacyText: {
        fontSize: 11.5,
        fontFamily: 'Tajawal-Regular',
        lineHeight: 17,
    },
    privacyLink: {
        fontFamily: 'Tajawal-Bold',
    },

    // Action Button
    mainBtnWrapper: { 
        marginTop: 8, 
        borderRadius: 16, 
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0 : 0.24,
        shadowRadius: 14,
        elevation: 6,
        overflow: 'hidden',
    },
    mainBtnGradient: {
        height: 54,
        alignItems: 'center', 
        justifyContent: 'center',
        borderRadius: 16,
    },
    btnText: { 
        fontSize: 16.5, 
        fontFamily: 'Tajawal-Bold',
        letterSpacing: 0.3
    },

    // Mode Switcher
    switchBtn: { 
        alignItems: 'center', 
        marginTop: 18, 
        paddingVertical: 6,
    },
    switchText: { 
        fontSize: 13.5, 
        fontFamily: 'Tajawal-Regular' 
    },
    linkText: { 
        fontFamily: 'Tajawal-Bold',
    },

    // Bottom Navigation Controls
    bottomControls: {
        alignItems: 'center',
        marginTop: 22,
        gap: 12,
    },
    themePill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 24,
        paddingHorizontal: 4,
        paddingVertical: 4,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.025)',
    },
    themeTouchable: {
        width: 44,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    themeIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    languagePill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 20,
        padding: 3,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.025)',
    },
    langBtn: {
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    langText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12.5,
    },
    copyright: { 
        textAlign: 'center', 
        fontSize: 11.5, 
        opacity: 0.55, 
        fontFamily: 'Tajawal-Regular',
        marginTop: 4,
    },

    // Floating Notification Toast
    toastContainer: {
        position: 'absolute', 
        top: 0, 
        left: 18, 
        right: 18,
        zIndex: 99999, 
        borderRadius: 18, 
        borderWidth: 1,
        alignItems: 'center', 
        paddingVertical: 12, 
        paddingHorizontal: 14,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    toastIconBox: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toastContent: { 
        flex: 1, 
        justifyContent: 'center' 
    },
    toastTitle: { 
        fontSize: 14, 
        fontFamily: 'Tajawal-Bold', 
        marginBottom: 2 
    },
    toastMessage: { 
        fontSize: 12.5, 
        fontFamily: 'Tajawal-Regular', 
        lineHeight: 17 
    },
});