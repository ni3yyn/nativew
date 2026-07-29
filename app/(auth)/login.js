// --- START OF FILE LoginScreen.js ---
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    Dimensions, KeyboardAvoidingView, Platform, ScrollView,
    Animated, Easing, ImageBackground, StatusBar, Linking,
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

// --- THEME CONSTANTS (UNTOUCHED) ---
const COLORS = {
    background: '#1A2D27',
    card: '#253D34',
    border: 'rgba(90, 156, 132, 0.25)',
    textDim: '#6B7C76',
    accentGreen: '#5A9C84',
    primary: '#A3E4D7',
    textPrimary: '#F1F3F2',
    textSecondary: '#A3B1AC',
    textOnAccent: '#1A2D27',
    danger: '#ef4444',
    gold: '#fbbf24',
    inputBg: 'rgba(0, 0, 0, 0.3)',
    inputBgActive: 'rgba(90, 156, 132, 0.1)',
};

const BG_IMAGE = require('../../assets/lolo.jpg');
const { width, height } = Dimensions.get('window');

// --- COMPACT LOGO ---
const AppLogo = () => (
    <View style={styles.logoWrapper}>
        <Image
            source={require('../../assets/adaptive-icon.png')}
            style={{ width: 70, height: 70, borderRadius: 18 }}
            resizeMode="contain"
        />
        <View style={styles.logoGlow} />
    </View>
);

// --- COMPONENT: HIGH-CONTRAST FLOATING TOAST ---
const FloatingToast = ({ visible, title, message, type, lang }) => {
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

    // High Contrast Colors for Maximum Visibility
    const toastBg = isError ? '#230F12' : '#142520';
    const toastBorder = isError ? '#EF4444' : COLORS.accentGreen;
    const iconName = isError ? 'exclamation-circle' : 'check-circle';
    const iconColor = isError ? '#F87171' : COLORS.accentGreen;
    const messageColor = isError ? '#FECACA' : '#D1D5DB';

    return (
        <Animated.View 
            style={[
                styles.toastContainer, 
                { 
                    opacity, 
                    transform: [{ translateY }], 
                    backgroundColor: toastBg,
                    borderColor: toastBorder,
                    borderWidth: 1.5,
                    flexDirection: isRTL ? 'row-reverse' : 'row'
                }
            ]}
        >
            <FontAwesome5 
                name={iconName} 
                size={24} 
                color={iconColor} 
                style={isRTL ? { marginLeft: 14 } : { marginRight: 14 }} 
            />
            <View style={styles.toastContent}>
                <Text style={[styles.toastTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {title}
                </Text>
                <Text style={[styles.toastMessage, { color: messageColor, textAlign: isRTL ? 'right' : 'left' }]}>
                    {message}
                </Text>
            </View>
        </Animated.View>
    );
};

// --- COMPONENT: SLEEK BIO INPUT ---
const BioInput = ({ icon, ...props }) => {
    const [focused, setFocused] = useState(false);
    const focusAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(focusAnim, {
            toValue: focused ? 1 : 0,
            duration: 250,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false
        }).start();
    }, [focused]);

    const borderColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0.1)', COLORS.accentGreen]
    });

    const backgroundColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(0, 0, 0, 0.4)', 'rgba(90, 156, 132, 0.15)']
    });

    return (
        <Animated.View style={[
            styles.inputContainer, 
            { backgroundColor, borderColor }
        ]}>
            <View style={styles.inputIconBox}>
                <Ionicons name={icon} size={18} color={focused ? COLORS.accentGreen : COLORS.textDim} />
            </View>
            <TextInput
                placeholderTextColor={COLORS.textDim}
                style={styles.textInput}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                selectionColor={COLORS.accentGreen}
                {...props}
            />
        </Animated.View>
    );
};

// --- COMPONENT: RESTORED PARTICLES (SPORE) ---
const Spore = ({ size, startX, duration, delay }) => {
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

    const translateY = animY.interpolate({ inputRange: [0, 1], outputRange:[height + 50, -100] });
    const translateX = animX.interpolate({ inputRange: [-1, 1], outputRange: [-30, 30] });

    return (
        <Animated.View
            style={{
                position: 'absolute', left: startX, width: size, height: size,
                borderRadius: size / 2, backgroundColor: COLORS.accentGreen,
                transform: [{ translateY }, { translateX }, { scale }],
                opacity: 0.3, zIndex: 0,
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

    const particles = useMemo(() => [...Array(20)].map((_, i) => ({
        id: i, size: Math.random() * 6 + 2, startX: Math.random() * width, duration: 10000 + Math.random() * 8000, delay: Math.random() * 5000
    })), []);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(containerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(contentTranslateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
        ]).start();
    },[]);

    const switchMode = () => {
        Animated.parallel([
            Animated.timing(formOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(formSlide, { toValue: 10, duration: 150, useNativeDriver: true })
        ]).start(() => {
            if (Platform.OS !== 'web') {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            setIsLogin(!isLogin);
            setAlertConfig({ ...alertConfig, visible: false });
            formSlide.setValue(-10);
            Animated.parallel([
                Animated.timing(formOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
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
                        allergies:[]
                    },
                    routines: { am: [], pm:[] }
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <ImageBackground source={BG_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover">
                <LinearGradient
                    colors={['rgba(15, 25, 20, 0.5)', 'rgba(10, 15, 12, 0.95)']}
                    style={StyleSheet.absoluteFill}
                />

                {particles.map((p) => <Spore key={p.id} {...p} />)}

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        <Animated.View style={{ opacity: containerOpacity, transform: [{ translateY: contentTranslateY }], width: '100%', alignItems: 'center' }}>

                            {/* Compact Header */}
                            <View style={styles.brandContainer}>
                                <AppLogo />
                                <Text style={styles.brandTitle}>{t('auth_brand_title', language)}</Text>
                                <Text style={styles.brandSubtitle}>{t('auth_brand_subtitle', language)}</Text>
                            </View>

                            {/* Compact Card */}
                            <View style={styles.sleekCard}>
                                <Animated.View style={{ opacity: formOpacity, transform:[{ translateY: formSlide }], paddingHorizontal: 18, paddingVertical: 20 }}>

                                    <Text style={styles.formTitle}>
                                        {isLogin ? t('auth_welcome_back', language) : t('auth_join_family', language)}
                                    </Text>
                                    <Text style={styles.formSub}>
                                        {isLogin ? t('auth_login_subtitle', language) : t('auth_signup_subtitle', language)}
                                    </Text>

                                    <BioInput
                                        icon="mail-outline"
                                        placeholder={t('auth_email_placeholder', language)}
                                        value={email}
                                        onChangeText={setEmail}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        textAlign={rtl.textAlign}
                                    />

                                    <BioInput
                                        icon="lock-closed-outline"
                                        placeholder={t('auth_password_placeholder', language)}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        textAlign={rtl.textAlign}
                                    />

                                    {isLogin && (
                                        <TouchableOpacity 
                                            style={[styles.forgotPasswordBtn, { alignSelf: rtl.flexStart }]} 
                                            onPress={handleForgotPassword} 
                                            disabled={resetLoading}
                                        >
                                            {resetLoading ? (
                                                <ActivityIndicator size="small" color={COLORS.accentGreen} />
                                            ) : (
                                                <Text style={styles.forgotPasswordText}>{t('auth_forgot_password', language)}</Text>
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    {!isLogin && (
                                        <View style={styles.privacyContainer}>
                                            <Text style={[styles.privacyText, { textAlign: rtl.textAlign }]}>
                                                {t('auth_privacy_agree_prefix', language)}
                                                <Text
                                                    style={styles.privacyLink}
                                                    onPress={() => Linking.openURL('https://wathiq.web.app/privacy')}
                                                >
                                                    {t('auth_privacy_policy', language)}
                                                </Text>
                                            </Text>
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.mainBtn, loading && { opacity: 0.7 }]}
                                        onPress={handleAuth}
                                        disabled={loading}
                                        activeOpacity={0.8}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color={COLORS.textOnAccent} />
                                        ) : (
                                            <Text style={styles.btnText}>{isLogin ? t('auth_button_login', language) : t('auth_button_signup', language)}</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.switchBtn} onPress={switchMode} activeOpacity={0.6}>
                                        <Text style={styles.switchText}>
                                            {isLogin ? t('auth_no_account_prefix', language) : t('auth_have_account_prefix', language)}
                                            <Text style={styles.linkText}>{isLogin ? t('auth_create_account', language) : t('auth_sign_in', language)}</Text>
                                        </Text>
                                    </TouchableOpacity>

                                </Animated.View>
                            </View>

                            {/* Clean Visible Bottom Controls */}
                            <View style={styles.bottomControls}>
                                <View style={styles.languagePill}>
                                    <TouchableOpacity 
                                        style={styles.langBtn}
                                        onPress={() => { Haptics.selectionAsync(); setLanguage('ar'); }}
                                    >
                                        <Text style={[styles.langText, language === 'ar' && styles.langTextActive]}>ARA</Text>
                                    </TouchableOpacity>
                                    <View style={styles.langDivider} />
                                    <TouchableOpacity 
                                        style={styles.langBtn}
                                        onPress={() => { Haptics.selectionAsync(); setLanguage('en'); }}
                                    >
                                        <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>ENG</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.copyright}>{t('auth_copyright', language)}</Text>
                            </View>

                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>

                {/* High Contrast Toast Layered On Top */}
                <FloatingToast visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} lang={language} />

            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f1914' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10 },

    // Compact Header
    brandContainer: { alignItems: 'center', marginBottom: 15, marginTop: 10 },
    logoWrapper: {
        alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    },
    logoGlow: {
        position: 'absolute', width: 70, height: 70, borderRadius: 35,
        backgroundColor: COLORS.accentGreen, opacity: 0.25, zIndex: -1,
        shadowColor: COLORS.accentGreen, shadowRadius: 30, shadowOpacity: 0.8
    },
    brandTitle: {
        fontSize: 32, fontFamily: 'Tajawal-ExtraBold', color: COLORS.textPrimary, letterSpacing: 1, marginBottom: 2,
        textShadowColor: 'rgba(90, 156, 132, 0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15
    },
    brandSubtitle: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'Tajawal-Regular' },

    // Sleek Card
    sleekCard: {
        width: '100%',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 15
    },
    formTitle: { fontSize: 20, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 4, fontFamily: 'Tajawal-ExtraBold' },
    formSub: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16, fontFamily: 'Tajawal-Regular', lineHeight: 18 },

    // Inputs (Sleek Pill Shape)
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 99, marginBottom: 12,
        height: 50, borderWidth: 1,
    },
    inputIconBox: { width: 44, alignItems: 'center', justifyContent: 'center', height: '100%' },
    textInput: { 
        flex: 1, 
        height: '100%', 
        color: COLORS.textPrimary, 
        fontSize: 14, 
        fontFamily: 'Tajawal-Regular',
        paddingRight: 16, 
        paddingLeft: 8 
    },

    // Buttons
    mainBtn: { 
        marginTop: 8, 
        borderRadius: 99, 
        backgroundColor: COLORS.accentGreen,
        height: 50,
        alignItems: 'center', 
        justifyContent: 'center',
        shadowColor: COLORS.accentGreen, 
        shadowOpacity: 0.25, 
        shadowRadius: 10, 
        shadowOffset: { width: 0, height: 4 } 
    },
    btnText: { color: COLORS.textOnAccent, fontSize: 15, fontFamily: 'Tajawal-Bold' },

    switchBtn: { alignItems: 'center', marginTop: 14, padding: 6 },
    switchText: { color: COLORS.textDim, fontSize: 13, fontFamily: 'Tajawal-Regular' },
    linkText: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold' },
    
    // Forgot Password
    forgotPasswordBtn: {
        alignSelf: 'flex-start',
        marginBottom: 10,
        marginTop: -2,
        paddingHorizontal: 8,
    },
    forgotPasswordText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontFamily: 'Tajawal-Regular',
    },

    // Compact Bottom Controls
    bottomControls: {
        alignItems: 'center',
        marginTop: 15,
        marginBottom: 8
    },
    languagePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 99,
        paddingHorizontal: 6,
        paddingVertical: 3,
        marginBottom: 8,
    },
    langBtn: {
        paddingVertical: 5,
        paddingHorizontal: 14,
    },
    langText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.textDim,
        letterSpacing: 1,
    },
    langTextActive: {
        color: COLORS.textPrimary,
    },
    langDivider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    
    copyright: { textAlign: 'center', color: COLORS.textDim, fontSize: 11, opacity: 0.7, fontFamily: 'Tajawal-Regular' },

    // Toast Container (Max Z-Index & Elevation)
    toastContainer: {
        position: 'absolute', top: 45, left: 16, right: 16,
        zIndex: 99999, borderRadius: 16, overflow: 'hidden',
        alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 25
    },
    toastContent: { flex: 1 },
    toastTitle: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Tajawal-Bold', marginBottom: 2 },
    toastMessage: { fontSize: 12.5, fontFamily: 'Tajawal-Regular', lineHeight: 18 },
    
    privacyContainer: {
        marginTop: 2,
        marginBottom: 10,
        paddingHorizontal: 8,
    },
    privacyText: {
        color: COLORS.textSecondary,
        fontSize: 11,
        fontFamily: 'Tajawal-Regular',
        lineHeight: 16,
    },
    privacyLink: {
        color: COLORS.textPrimary,
        fontFamily: 'Tajawal-Bold',
        textDecorationLine: 'underline',
    },
});
// --- END OF FILE LoginScreen.js ---