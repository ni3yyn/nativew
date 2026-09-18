import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    Dimensions, KeyboardAvoidingView, Platform, ScrollView,
    Animated, Easing, StatusBar, Linking,
    LayoutAnimation, ActivityIndicator, Image
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

// --- COMPACT WATHIQ LOGO ---
const AppLogo = ({ COLORS, isDark, styles }) => (
    <View style={styles.logoWrapper}>
        <View style={[styles.logoGlow, { backgroundColor: COLORS.accentGreen }]} />
        <Image
            source={require('../../assets/logo.png')}
            style={{ width: 72, height: 72, borderRadius: 22 }}
            resizeMode="contain"
        />
    </View>
);

// --- FLOATING TOAST ---
const FloatingToast = ({ visible, title, message, type, lang, COLORS, isDark, styles }) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, { toValue: 55, friction: 7, tension: 40, useNativeDriver: true }),
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

    const toastBg = isDark ? '#1C1C1E' : '#FFFFFF';
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
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    shadowColor: isDark ? '#000' : iconColor,
                }
            ]}
        >
            <View style={[styles.toastIconBox, { backgroundColor: iconColor + '15' }]}>
                <FontAwesome5 name={iconName} size={18} color={iconColor} />
            </View>
            <View style={[styles.toastContent, isRTL ? { marginRight: 14 } : { marginLeft: 14 }]}>
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

// --- PREMIUM INPUT WITH ANIMATED FOCUS ---
const PremiumInput = ({ icon, COLORS, isDark, styles, placeholder, value, isRTL, ...props }) => {
    const [focused, setFocused] = useState(false);
    const focusAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(focusAnim, {
            toValue: focused ? 1 : 0,
            duration: 250,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false
        }).start();
    }, [focused]);

    const borderColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
            isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)', 
            COLORS.accentGreen
        ]
    });

    const backgroundColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
            isDark ? 'rgba(255, 255, 255, 0.035)' : 'rgba(0, 0, 0, 0.025)',
            isDark ? 'rgba(61, 146, 117, 0.14)' : 'rgba(61, 146, 117, 0.09)'
        ]
    });

    const iconScale = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.14]
    });

    return (
        <Animated.View style={[
            styles.inputContainer, 
            { 
                borderColor, 
                backgroundColor,
                flexDirection: isRTL ? 'row-reverse' : 'row'
            }
        ]}>
            <Animated.View style={[
                styles.inputIconBox,
                { transform: [{ scale: iconScale }] }
            ]}>
                <Ionicons 
                    name={icon} 
                    size={22} 
                    color={focused ? COLORS.accentGreen : COLORS.textDim} 
                />
            </Animated.View>
            <View style={styles.inputWrapper}>
                {!value && !focused && (
                    <Text
                        pointerEvents="none"
                        style={[
                            styles.placeholderText,
                            { 
                                color: COLORS.textDim, 
                                textAlign: isRTL ? 'right' : 'left',
                                writingDirection: isRTL ? 'rtl' : 'ltr'
                            }
                        ]}
                    >
                        {placeholder}
                    </Text>
                )}
                <TextInput
                    placeholder=""
                    value={value}
                    style={[
                        styles.textInput,
                        { 
                            color: COLORS.textPrimary, 
                            textAlign: isRTL ? 'right' : 'left' 
                        }
                    ]}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    selectionColor={COLORS.accentGreen}
                    underlineColorAndroid="transparent"
                    {...props}
                />
            </View>
        </Animated.View>
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
    const translateX = animX.interpolate({ inputRange: [-1, 1], outputRange: [-30, 30] });

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
        size: Math.random() * 5 + 3, 
        startX: Math.random() * width, 
        duration: 10000 + Math.random() * 8000, 
        delay: Math.random() * 5000
    })), []);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(containerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(contentTranslateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
        ]).start();
    }, []);

    const switchMode = () => {
        Animated.parallel([
            Animated.timing(formOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
            Animated.timing(formSlide, { toValue: 10, duration: 140, useNativeDriver: true })
        ]).start(() => {
            if (Platform.OS !== 'web') {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            setIsLogin(!isLogin);
            setAlertConfig(prev => ({ ...prev, visible: false }));
            formSlide.setValue(-10);
            Animated.parallel([
                Animated.timing(formOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(formSlide, { toValue: 0, friction: 6, useNativeDriver: true })
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

                        {/* Minimalist Spacious Form */}
                        <Animated.View style={[styles.formContainer, { opacity: formOpacity, transform: [{ translateY: formSlide }] }]}>

                            {/* Centered title above inputs */}
                            <Text style={[styles.formTitle, { color: COLORS.textPrimary }]}>
                                {isLogin ? t('auth_welcome_back', language) : t('auth_join_family', language)}
                            </Text>

                            <View style={styles.inputsWrapper}>
                                <PremiumInput
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

                                <PremiumInput
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

                            {isLogin && (
                                <TouchableOpacity 
                                    style={[styles.forgotPasswordBtn, { alignSelf: rtl.flexStart }]} 
                                    onPress={handleForgotPassword} 
                                    disabled={resetLoading}
                                    activeOpacity={0.6}
                                >
                                    {resetLoading ? (
                                        <ActivityIndicator size="small" color={COLORS.textDim} />
                                    ) : (
                                        <Text style={[styles.forgotPasswordText, { color: COLORS.textSecondary }]}>
                                            {t('auth_forgot_password', language)}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}

                            {!isLogin && (
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

                            {/* Primary Botanical Button */}
                            <TouchableOpacity
                                style={[
                                    styles.mainBtnWrapper, 
                                    loading && { opacity: 0.7 },
                                    { shadowColor: COLORS.accentGreen }
                                ]}
                                onPress={handleAuth}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[COLORS.accentGreen, COLORS.primary || COLORS.accentGreen]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.mainBtnGradient}
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

                            <TouchableOpacity style={styles.switchBtn} onPress={switchMode} activeOpacity={0.6}>
                                <Text style={[styles.switchText, { color: COLORS.textDim }]}>
                                    {isLogin ? t('auth_no_account_prefix', language) : t('auth_have_account_prefix', language)}
                                    <Text style={[styles.linkText, { color: COLORS.textPrimary }]}>
                                        {isLogin ? t('auth_create_account', language) : t('auth_sign_in', language)}
                                    </Text>
                                </Text>
                            </TouchableOpacity>

                        </Animated.View>

                        {/* Theme & Language Controls (Elevated with ample navigation bar safe margin) */}
                        <View style={styles.bottomControls}>
                            
                            {/* Theme Icons */}
                            <View style={styles.themeRow}>
                                {THEME_OPTIONS.map((item) => {
                                    const isSelected = activeThemeId === item.id;
                                    return (
                                        <TouchableOpacity
                                            key={item.id}
                                            activeOpacity={0.6}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                changeTheme(item.id);
                                            }}
                                            style={styles.themeIconWrapper}
                                        >
                                            <FontAwesome5 
                                                name={item.icon} 
                                                size={16} 
                                                color={isSelected ? item.color : COLORS.textDim} 
                                                style={{ opacity: isSelected ? 1 : 0.45 }}
                                            />
                                            {isSelected && <View style={[styles.activeDot, { backgroundColor: item.color }]} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Language Switcher */}
                            <View style={styles.langRow}>
                                <TouchableOpacity 
                                    style={styles.langBtn}
                                    onPress={() => { Haptics.selectionAsync(); setLanguage('ar'); }}
                                >
                                    <Text style={[
                                        styles.langText, 
                                        language === 'ar' ? { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold' } : { color: COLORS.textDim }
                                    ]}>
                                        العربية
                                    </Text>
                                </TouchableOpacity>
                                <Text style={{ color: COLORS.border, marginHorizontal: 12 }}>|</Text>
                                <TouchableOpacity 
                                    style={styles.langBtn}
                                    onPress={() => { Haptics.selectionAsync(); setLanguage('en'); }}
                                >
                                    <Text style={[
                                        styles.langText, 
                                        language === 'en' ? { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold' } : { color: COLORS.textDim }
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

            {/* High-Contrast Toast */}
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
        paddingHorizontal: 30, 
        paddingTop: 20,
        paddingBottom: Platform.OS === 'android' ? 68 : 48, // Generous space to clear navigation bar
    },

    // Header & Logo
    brandContainer: { 
        alignItems: 'center', 
        marginBottom: 36, 
        marginTop: 10 
    },
    logoWrapper: {
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 16,
        position: 'relative',
    },
    logoGlow: {
        position: 'absolute', 
        width: 90, 
        height: 90, 
        borderRadius: 45,
        opacity: isDark ? 0.18 : 0.12,
        transform: [{ scale: 1.2 }],
    },
    brandTitle: {
        fontSize: 34, 
        fontFamily: 'Tajawal-ExtraBold', 
        letterSpacing: 0.5, 
        marginBottom: 4,
    },
    brandSubtitle: { 
        fontSize: 14, 
        fontFamily: 'Tajawal-Regular',
        opacity: 0.8
    },

    // Form Area
    formContainer: {
        width: '100%',
        marginBottom: 10,
    },
    formTitle: { 
        fontSize: 24, 
        textAlign: 'center', // Centered above inputs
        marginBottom: 24, 
        fontFamily: 'Tajawal-Bold' 
    },
    inputsWrapper: {
        gap: 16,
        marginBottom: 14,
    },

    // Premium Input
    inputContainer: {
        height: 62, 
        borderRadius: 20, 
        borderWidth: 1.5,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    inputIconBox: { 
        width: 44, 
        height: 44,
        alignItems: 'center', 
        justifyContent: 'center',
    },
    inputWrapper: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    placeholderText: {
        position: 'absolute',
        left: 8,
        right: 8,
        fontFamily: 'Tajawal-Regular',
        fontSize: 17.5, // Larger and well-proportioned
    },
    textInput: { 
        flex: 1, 
        height: '100%', 
        fontSize: 17.5, // High readability, matches bar size
        fontFamily: 'Tajawal-Regular',
        paddingTop: Platform.OS === 'ios' ? 0 : 2,
    },

    // Buttons
    mainBtnWrapper: { 
        marginTop: 20, 
        borderRadius: 22, 
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0 : 0.22,
        shadowRadius: 14,
        elevation: 6,
    },
    mainBtnGradient: {
        height: 60,
        alignItems: 'center', 
        justifyContent: 'center',
        borderRadius: 22,
    },
    btnText: { 
        fontSize: 17, 
        fontFamily: 'Tajawal-Bold',
        letterSpacing: 0.3
    },

    switchBtn: { 
        alignItems: 'center', 
        marginTop: 22, 
        padding: 8 
    },
    switchText: { 
        fontSize: 14, 
        fontFamily: 'Tajawal-Regular' 
    },
    linkText: { 
        fontFamily: 'Tajawal-Bold',
    },
    
    // Forgot Password
    forgotPasswordBtn: {
        marginBottom: 14,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    forgotPasswordText: {
        fontSize: 13,
        fontFamily: 'Tajawal-Regular',
    },

    // Privacy Text
    privacyContainer: {
        marginBottom: 8,
        paddingHorizontal: 8,
    },
    privacyText: {
        fontSize: 12,
        fontFamily: 'Tajawal-Regular',
        lineHeight: 18,
    },
    privacyLink: {
        fontFamily: 'Tajawal-Bold',
    },

    // Bottom Controls (Visible & comfortable above navigation bar)
    bottomControls: {
        alignItems: 'center',
        marginTop: 26,
        gap: 18,
    },
    themeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 22,
    },
    themeIconWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        position: 'absolute',
        bottom: -6,
    },
    langRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    langBtn: {
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    langText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
    },
    copyright: { 
        textAlign: 'center', 
        fontSize: 12, 
        opacity: 0.5, 
        fontFamily: 'Tajawal-Regular',
    },

    // Toast
    toastContainer: {
        position: 'absolute', 
        top: 55, 
        left: 20, 
        right: 20,
        zIndex: 99999, 
        borderRadius: 20, 
        alignItems: 'center', 
        paddingVertical: 14, 
        paddingHorizontal: 16,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    toastIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toastContent: { flex: 1, justifyContent: 'center' },
    toastTitle: { 
        fontSize: 15, 
        fontFamily: 'Tajawal-Bold', 
        marginBottom: 2 
    },
    toastMessage: { 
        fontSize: 13, 
        fontFamily: 'Tajawal-Regular', 
        lineHeight: 18 
    },
});