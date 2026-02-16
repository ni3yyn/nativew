import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  Dimensions, KeyboardAvoidingView, Platform, ScrollView, 
  Animated, Easing, ImageBackground, StatusBar, Linking,
  LayoutAnimation, UIManager, ActivityIndicator, Image
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db } from '../../src/config/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

// --- THEME CONSTANTS ---
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

// --- LOGO ---
const AppLogo = () => (
    <View style={styles.logoWrapper}>
        <Image 
            source={require('../../assets/icon.png')} 
            style={{ width: 90, height: 90, borderRadius: 20 }} 
            resizeMode="contain" 
        />
        {/* Glow behind logo */}
        <View style={styles.logoGlow} />
    </View>
);

// --- COMPONENT: SMOOTH TOAST ---
const FloatingToast = ({ visible, title, message, type }) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, { toValue: 60, friction: 6, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true })
            ]).start();
        } else {
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                translateY.setValue(-100);
            });
        }
    }, [visible]);

    const isError = type === 'error';
    const iconName = isError ? 'exclamation-circle' : 'check-circle';
    const iconColor = isError ? COLORS.danger : COLORS.accentGreen;
    const borderColor = isError ? COLORS.danger : COLORS.accentGreen;

    return (
        <Animated.View style={[styles.toastContainer, { opacity, transform: [{ translateY }], borderColor }]}>
            <View style={styles.toastContent}>
                <Text style={styles.toastTitle}>{title}</Text>
                <Text style={styles.toastMessage}>{message}</Text>
            </View>
            <FontAwesome5 name={iconName} size={24} color={iconColor} style={{ marginLeft: 15 }} />
        </Animated.View>
    );
};

// --- COMPONENT: BIO INPUT ---
const BioInput = ({ icon, ...props }) => {
    const [focused, setFocused] = useState(false);
    const scanAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(scanAnim, {
            toValue: focused ? 1 : 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false 
        }).start();
    }, [focused]);

    const lineWidth = scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <View style={[styles.inputContainer, { backgroundColor: focused ? COLORS.inputBgActive : COLORS.inputBg }]}>
            <View style={styles.inputIconBox}>
                <Ionicons name={icon} size={20} color={focused ? COLORS.accentGreen : COLORS.textDim} />
            </View>
            <TextInput 
                placeholderTextColor={COLORS.textDim} 
                style={styles.textInput} 
                onFocus={() => setFocused(true)} 
                onBlur={() => setFocused(false)} 
                selectionColor={COLORS.accentGreen}
                {...props} 
            />
            {/* Animated Underline */}
            <View style={styles.scanLineTrack}>
                <Animated.View style={[styles.scanLineFill, { width: lineWidth }]} />
            </View>
        </View>
    );
};

// --- COMPONENT: PARTICLES ---
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
  
    const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [height + 50, -100] });
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
  const [isLogin, setIsLogin] = useState(false); // Default to Signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info' });

  // Animation values
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
  }, []);

  const switchMode = () => {
      Animated.parallel([
          Animated.timing(formOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
          Animated.timing(formSlide, { toValue: 10, duration: 150, useNativeDriver: true })
      ]).start(() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
      setTimeout(() => setAlertConfig(prev => ({...prev, visible: false})), 4000);
  };

  const handleAuth = async () => {
    if (!email || !password) {
        showToast("بيانات ناقصة", "يرجى ملء البريد وكلمة المرور.", "error");
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
        
        // No Name here - will be set in Profile settings later
        await setDoc(doc(db, 'profiles', cred.user.uid), {
          email: cred.user.email,
          createdAt: Timestamp.now(), 
          onboardingComplete: false,
          settings: { 
              name: '', 
              gender: '', 
              skinType: '', 
              scalpType: '',
              goals: [],
              conditions: [],
              allergies: []
          }, 
          routines: { am: [], pm: [] }
        });
        
        router.replace('/(onboarding)/welcome');
      }
    } catch (err) {
      let title = "خطأ في الدخول";
      let msg = err.message;
      if(msg.includes('auth/invalid-credential')) msg = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      if(msg.includes('auth/email-already-in-use')) msg = "هذا البريد الإلكتروني مسجل بالفعل.";
      if(msg.includes('password-short')) { title="كلمة المرور ضعيفة"; msg = "يجب أن تكون كلمة المرور 6 أحرف على الأقل."; }
      
      showToast(title, msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ImageBackground source={BG_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover">
        {/* Dark overlay to make text pop */}
        <LinearGradient 
            colors={['rgba(5, 15, 10, 0.7)', 'rgba(5, 15, 10, 0.9)']} 
            style={StyleSheet.absoluteFill} 
        />
        
        {particles.map((p) => <Spore key={p.id} {...p} />)}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <Animated.View style={{ opacity: containerOpacity, transform: [{ translateY: contentTranslateY }], width: '100%', alignItems: 'center' }}>
                
                {/* Logo Area */}
                <View style={styles.brandContainer}>
                    <AppLogo />
                    <Text style={styles.brandTitle}>وثيق</Text>
                    <Text style={styles.brandSubtitle}>دليلكِ الذكي لجمال آمن وطبيعي</Text>
                </View>

                {/* Glassmorphic Login Card */}
                <View style={styles.glassCard}>
                    {/* Inner Gradient for sheen */}
                    <LinearGradient
                        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)']}
                        style={StyleSheet.absoluteFill}
                        start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                    />
                    
                    <Animated.View style={{ opacity: formOpacity, transform: [{ translateY: formSlide }], padding: 25 }}>
                        
                        <Text style={styles.formTitle}>
                            {isLogin ? 'مرحبا بعودتك!' : 'انضمي لعائلة وثيق'}
                        </Text>
                        <Text style={styles.formSub}>
                            {isLogin ? 'سجلي دخولكِ للوصول إلى رفّك وتحليلاتك.' : 'أنشئي حسابا واكتشفي حقيقة منتجاتك.'}
                        </Text>

                        <BioInput 
                            icon="mail-outline" 
                            placeholder="البريد الإلكتروني" 
                            value={email} 
                            onChangeText={setEmail} 
                            keyboardType="email-address" 
                            autoCapitalize="none" 
                            textAlign="right"
                        />
                        
                        <BioInput 
                            icon="lock-closed-outline" 
                            placeholder="كلمة المرور" 
                            value={password} 
                            onChangeText={setPassword} 
                            secureTextEntry 
                            textAlign="right"
                        />

{!isLogin && (
    <View style={styles.privacyContainer}>
        <Text style={styles.privacyText}>
            بالتسجيل، أنت توافق على{' '}
            <Text 
                style={styles.privacyLink} 
                onPress={() => Linking.openURL('https://wathiq.web.app/privacy')}
            >
                سياسة الخصوصية
            </Text>
        </Text>
    </View>
)}

                        <TouchableOpacity 
                            style={[styles.mainBtn, loading && {opacity: 0.7}]} 
                            onPress={handleAuth} 
                            disabled={loading} 
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[COLORS.accentGreen, '#4a8a73']}
                                style={styles.btnGradient}
                                start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                            >
                                {loading ? (
                                    <ActivityIndicator color={COLORS.textOnAccent} />
                                ) : (
                                    <Text style={styles.btnText}>{isLogin ? 'دخول' : 'تسجيل'}</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.switchBtn} onPress={switchMode} activeOpacity={0.6}>
                            <Text style={styles.switchText}>
                                {isLogin ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
                                <Text style={styles.linkText}>{isLogin ? ' أنشئي حسابا' : ' سجلّي الدخول'}</Text>
                            </Text>
                        </TouchableOpacity>

                    </Animated.View>
                </View>

                <Text style={styles.copyright}>© وثيق | تكنولوجيا الجمال الجزائرية</Text>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        <FloatingToast visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} />
        
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  
  // Brand
  brandContainer: { alignItems: 'center', marginBottom: 40 },
  logoWrapper: {
      alignItems: 'center', justifyContent: 'center', marginBottom: 15,
  },
  logoGlow: {
      position: 'absolute', width: 60, height: 60, borderRadius: 30,
      backgroundColor: COLORS.accentGreen, opacity: 0.3, zIndex: -1,
      shadowColor: COLORS.accentGreen, shadowRadius: 30, shadowOpacity: 0.8
  },
  brandTitle: { 
    fontSize: 42, fontFamily: 'Tajawal-ExtraBold', color: COLORS.textPrimary, letterSpacing: 1, marginBottom: 5,
    textShadowColor: 'rgba(90, 156, 132, 0.5)', textShadowOffset: {width: 0, height: 0}, textShadowRadius: 20
  },
  brandSubtitle: { color: COLORS.textSecondary, fontSize: 15, fontFamily: 'Tajawal-Regular' },

  // Glass Card
  glassCard: { 
      width: '100%', 
      borderRadius: 30, 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.1)', // Subtle glass border
      overflow: 'hidden',
      backgroundColor: 'rgba(26, 45, 39, 0.6)', // Base transparency
      shadowColor: "#000", 
      shadowOffset: { width: 0, height: 20 }, 
      shadowOpacity: 0.5, 
      shadowRadius: 30, 
      elevation: 20
  },
  formTitle: { fontSize: 24, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8, fontFamily: 'Tajawal-ExtraBold' },
  formSub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30, fontFamily: 'Tajawal-Regular', lineHeight: 22 },

  // Inputs
  inputContainer: { 
      flexDirection: 'row', alignItems: 'center', 
      backgroundColor: COLORS.inputBg, 
      borderRadius: 18, marginBottom: 16, 
      height: 56, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
      position: 'relative', overflow: 'hidden'
  },
  inputIconBox: { width: 50, alignItems: 'center', justifyContent: 'center', height: '100%' },
  textInput: { flex: 1, height: '100%', color: COLORS.textPrimary, fontSize: 15, fontFamily: 'Tajawal-Regular', paddingRight: 15 },
  scanLineTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
  scanLineFill: { height: '100%', backgroundColor: COLORS.accentGreen, shadowColor: COLORS.accentGreen, shadowOpacity: 1, shadowRadius: 5 },

  // Buttons
  mainBtn: { marginTop: 15, borderRadius: 18, overflow: 'hidden', shadowColor: COLORS.accentGreen, shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: {width: 0, height: 5} },
  btnGradient: { height: 56, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: COLORS.textOnAccent, fontSize: 18, fontFamily: 'Tajawal-Bold' },
  
  switchBtn: { alignItems: 'center', marginTop: 25, padding: 10 },
  switchText: { color: COLORS.textDim, fontSize: 14, fontFamily: 'Tajawal-Regular' },
  linkText: { color: COLORS.accentGreen, fontFamily: 'Tajawal-Bold' },
  
  copyright: { textAlign: 'center', color: COLORS.textDim, marginTop: 40, fontSize: 11, opacity: 0.6, fontFamily: 'Tajawal-Regular' },

  // Toast
  toastContainer: {
      position: 'absolute', top: 60, left: 20, right: 20, 
      zIndex: 100, borderRadius: 16, overflow: 'hidden',
      backgroundColor: COLORS.card, borderWidth: 1,
      flexDirection: 'row-reverse', alignItems: 'center', padding: 16,
      shadowColor: "#000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10
  },
  toastContent: { flex: 1 },
  toastTitle: { color: COLORS.textPrimary, fontSize: 14, fontFamily: 'Tajawal-Bold', marginBottom: 2, textAlign: 'right' },
  toastMessage: { color: COLORS.textSecondary, fontSize: 12, fontFamily: 'Tajawal-Regular', textAlign: 'right' },
  privacyContainer: {
    marginTop: 5,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  privacyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: 'Tajawal-Regular',
    textAlign: 'right',
    lineHeight: 18,
  },
  privacyLink: {
    color: COLORS.accentGreen,
    fontFamily: 'Tajawal-Bold',
    textDecorationLine: 'underline',
  },
});