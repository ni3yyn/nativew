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
        <View style={[styles.logoBox, { borderColor: COLORS.border }]}>
            <Image
                source={require('../../assets/logo.png')}
                style={{ width: 66, height: 66, borderRadius: 18 }}
                resizeMode="contain"
            />
        </View>
    </View>
);

// --- HIGH-CONTRAST FLOATING TOAST ---
const FloatingToast = ({ visible, title, message, type, lang, COLORS, isDark, styles }) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, { toValue: 50, friction: 6, tension: 40, useNativeDriver: true }),
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

    const toastBg = isError 
        ? (isDark ? '#261215' : '#FEE2E2') 
        : (isDark ? '#142822' : '#DCFCE7');
    const toastBorder = isError ? COLORS.danger : COLORS.accentGreen;
    const iconName = isError ? 'exclamation-circle' : 'check-circle';
    const iconColor = isError ? COLORS.danger : COLORS.accentGreen;
    const titleColor = isError 
        ? (isDark ? '#FFFFFF' : '#991B1B') 
        : (isDark ? '#FFFFFF' : '#166534');
    const messageColor = isError 
        ? (isDark ? '#FECACA' : '#7F1D1D') 
        : (isDark ? '#D1D5DB' : '#14532D');

    return (
        <Animated.View 
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
                styles.toastContainer, 
                { 
                    opacity, 
                    transform: [{ translateY }], 
                    backgroundColor: toastBg,
                    borderColor: toastBorder,
                    flexDirection: isRTL ? 'row-reverse' : 'row'
                }
            ]}
        >
            <FontAwesome5 
                name={iconName} 
                size={20} 
                color={iconColor} 
                style={isRTL ? { marginLeft: 12 } : { marginRight: 12 }} 
            />
            <View style={styles.toastContent}>
                <Text style={[styles.toastTitle, { color: titleColor, textAlign: isRTL ? 'right' : 'left' }]}>
                    {title}
                </Text>
                <Text style={[styles.toastMessage, { color: messageColor, textAlign: isRTL ? 'right' : 'left' }]}>
                    {message}
                </Text>
            </View>
        </Animated.View>
    );
};

// --- DIRECT CANVAS BIO INPUT ---
const BioInput = ({ icon, COLORS, isDark, styles, placeholder, value, ...props }) => {
    const [focused, setFocused] = useState(false);

    return (
        <View style={[
            styles.inputContainer, 
            { 
                borderColor: focused ? COLORS.accentGreen : COLORS.border,
                backgroundColor: focused 
                    ? (isDark ? 'rgba(61, 146, 117, 0.16)' : 'rgba(61, 146, 117, 0.10)')
                    : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.65)')
            }
        ]}>
            <View style={[
                styles.inputIconBox,
                focused && { backgroundColor: COLORS.accentGreen + '20' }
            ]}>
                <Ionicons name={icon} size={18} color={focused ? COLORS.accentGreen : COLORS.textDim} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
                {/* Fake placeholder with Tajawal font — Android ignores fontFamily on native placeholders */}
                {!value && !focused && (
                    <Text
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            fontFamily: 'Tajawal-Regular',
                            fontWeight: 'normal',
                            fontSize: 14,
                            color: COLORS.textDim,
                            paddingHorizontal: 12,
                            textAlign: 'right',
                            writingDirection: 'rtl',
                        }}
                    >
                        {placeholder}
                    </Text>
                )}
                <TextInput
                    placeholder=""
                    value={value}
                    style={[
                        styles.textInput,
                        { color: COLORS.textPrimary, fontFamily: 'Tajawal-Regular', fontWeight: 'normal' }
                    ]}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    selectionColor={COLORS.accentGreen}
                    underlineColorAndroid="transparent"
                    {...props}
                />
            </View>
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
                    <Animated.View style={{ opacity: containerOpacity, transform: [{ translateY: contentTranslateY }], width: '100%', alignItems: 'center' }}>

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

                        {/* Frameless Form Container (Directly on Canvas) */}
                        <Animated.View style={[styles.formContainer, { opacity: formOpacity, transform: [{ translateY: formSlide }] }]}>

                            <Text style={[styles.formTitle, { color: COLORS.textPrimary }]}>
                                {isLogin ? t('auth_welcome_back', language) : t('auth_join_family', language)}
                            </Text>

                            <BioInput
                                icon="mail-outline"
                                placeholder={t('auth_email_placeholder', language)}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                textAlign={rtl.textAlign}
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
                                textAlign={rtl.textAlign}
                                COLORS={COLORS}
                                isDark={isDark}
                                styles={styles}
                            />

                            {isLogin && (
                                <TouchableOpacity 
                                    style={[styles.forgotPasswordBtn, { alignSelf: rtl.flexStart }]} 
                                    onPress={handleForgotPassword} 
                                    disabled={resetLoading}
                                    activeOpacity={0.7}
                                >
                                    {resetLoading ? (
                                        <ActivityIndicator size="small" color={COLORS.accentGreen} />
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
                                style={[styles.mainBtnWrapper, loading && { opacity: 0.7 }]}
                                onPress={handleAuth}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[COLORS.accentGreen, COLORS.primary || '#3F8F78']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.mainBtnGradient}
                                >
                                    <View style={styles.btnSpecularLine} />
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
                                    <Text style={[styles.linkText, { color: COLORS.accentGreen }]}>
                                        {isLogin ? t('auth_create_account', language) : t('auth_sign_in', language)}
                                    </Text>
                                </Text>
                            </TouchableOpacity>

                        </Animated.View>

                        {/* Minimalist Theme & Language Switchers */}
                        <View style={styles.bottomControls}>
                            {/* 🎨 Quick Theme Selector Pill */}
                            <View style={[styles.themePill, { borderColor: COLORS.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.6)' }]}>
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
                                            style={[
                                                styles.themeBtn,
                                                isSelected && { backgroundColor: item.color + '25', borderColor: item.color, borderWidth: 1 }
                                            ]}
                                        >
                                            <FontAwesome5 
                                                name={item.icon} 
                                                size={12} 
                                                color={isSelected ? item.color : COLORS.textDim} 
                                            />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Language Switcher */}
                            <View style={[styles.languagePill, { borderColor: COLORS.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.6)' }]}>
                                <TouchableOpacity 
                                    style={styles.langBtn}
                                    onPress={() => { Haptics.selectionAsync(); setLanguage('ar'); }}
                                >
                                    <Text style={[styles.langText, language === 'ar' && { color: COLORS.accentGreen, fontFamily: 'Tajawal-Bold' }]}>
                                        العربية
                                    </Text>
                                </TouchableOpacity>
                                <View style={[styles.langDivider, { backgroundColor: COLORS.border }]} />
                                <TouchableOpacity 
                                    style={styles.langBtn}
                                    onPress={() => { Haptics.selectionAsync(); setLanguage('en'); }}
                                >
                                    <Text style={[styles.langText, language === 'en' && { color: COLORS.accentGreen, fontFamily: 'Tajawal-Bold' }]}>
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
                    COLORS.gradientMid || COLORS.accentGreen + '15',
                    COLORS.gradientEnd || COLORS.accentGreen + '25',
                    'rgba(61, 146, 117, 0.30)'
                ]}
                locations={[0, 0.4, 0.65, 0.85, 1]}
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
        paddingHorizontal: 22, 
        paddingVertical: 18 
    },

    // Header & Logo
    brandContainer: { 
        alignItems: 'center', 
        marginBottom: 20, 
        marginTop: 6 
    },
    logoWrapper: {
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 10,
        position: 'relative',
    },
    logoBox: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    logoGlow: {
        position: 'absolute', 
        width: 76, 
        height: 76, 
        borderRadius: 38,
        opacity: isDark ? 0.25 : 0.15,
    },
    brandTitle: {
        fontSize: 32, 
        fontFamily: 'Tajawal-ExtraBold', 
        letterSpacing: 0.5, 
        marginBottom: 2,
    },
    brandSubtitle: { 
        fontSize: 13, 
        fontFamily: 'Tajawal-Regular' 
    },

    // Frameless Form
    formContainer: {
        width: '100%',
        paddingHorizontal: 4,
        marginBottom: 10,
    },
    formTitle: { 
        fontSize: 22, 
        textAlign: 'center', 
        marginBottom: 4, 
        fontFamily: 'Tajawal-ExtraBold' 
    },
    formSub: { 
        fontSize: 13, 
        textAlign: 'center', 
        marginBottom: 22, 
        fontFamily: 'Tajawal-Regular', 
        lineHeight: 19 
    },

    // Inputs (Sleek Canvas Pills)
    inputContainer: {
        flexDirection: 'row', 
        alignItems: 'center',
        borderRadius: 16, 
        marginBottom: 14,
        height: 52, 
        borderWidth: 1,
        paddingHorizontal: 8,
    },
    inputIconBox: { 
        width: 38, 
        height: 38,
        borderRadius: 12,
        alignItems: 'center', 
        justifyContent: 'center',
    },
    textInput: { 
        flex: 1, 
        height: '100%', 
        fontSize: 14, 
        fontFamily: 'Tajawal-Regular',
        fontWeight: 'normal',
        paddingHorizontal: 12,
        backgroundColor: 'transparent',
    },

    // Buttons
    mainBtnWrapper: { 
        marginTop: 12, 
        borderRadius: 16, 
        overflow: 'hidden',
    },
    mainBtnGradient: {
        height: 50,
        alignItems: 'center', 
        justifyContent: 'center',
        borderRadius: 16,
        position: 'relative',
    },
    btnSpecularLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },
    btnText: { 
        fontSize: 16, 
        fontFamily: 'Tajawal-Bold' 
    },

    switchBtn: { 
        alignItems: 'center', 
        marginTop: 18, 
        padding: 6 
    },
    switchText: { 
        fontSize: 13, 
        fontFamily: 'Tajawal-Regular' 
    },
    linkText: { 
        fontFamily: 'Tajawal-Bold' 
    },
    
    // Forgot Password
    forgotPasswordBtn: {
        marginBottom: 12,
        marginTop: -2,
        paddingHorizontal: 4,
    },
    forgotPasswordText: {
        fontSize: 12,
        fontFamily: 'Tajawal-Regular',
    },

    // Bottom Controls
    bottomControls: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 8,
    },
    themePill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 4,
        paddingVertical: 3,
        marginBottom: 10,
        gap: 4,
    },
    themeBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    languagePill: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 6,
        paddingVertical: 3,
        marginBottom: 10,
    },
    langBtn: {
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    langText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: COLORS.textDim,
    },
    langDivider: {
        width: 1,
        height: 12,
    },
    
    copyright: { 
        textAlign: 'center', 
        fontSize: 11, 
        opacity: 0.7, 
        fontFamily: 'Tajawal-Regular' 
    },

    // Toast
    toastContainer: {
        position: 'absolute', 
        top: 45, 
        left: 16, 
        right: 16,
        zIndex: 99999, 
        borderRadius: 14, 
        borderWidth: 1,
        alignItems: 'center', 
        paddingVertical: 12, 
        paddingHorizontal: 16,
    },
    toastContent: { flex: 1 },
    toastTitle: { 
        fontSize: 14, 
        fontFamily: 'Tajawal-Bold', 
        marginBottom: 2 
    },
    toastMessage: { 
        fontSize: 12.5, 
        fontFamily: 'Tajawal-Regular', 
        lineHeight: 18 
    },
    
    privacyContainer: {
        marginTop: 2,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    privacyText: {
        fontSize: 11,
        fontFamily: 'Tajawal-Regular',
        lineHeight: 16,
    },
    privacyLink: {
        fontFamily: 'Tajawal-Bold',
    },
});