import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  Dimensions, KeyboardAvoidingView, Platform, ScrollView, 
  Animated, Easing, ImageBackground, StatusBar, 
  LayoutAnimation, UIManager, Modal
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
// 1. IMPORT ROUTER
import { useRouter } from 'expo-router';
import { auth, db } from '../../src/config/firebase';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40; 

// --- CONFIGURATION ---
const BG_IMAGE = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1527&auto=format&fit=crop";

const FEATURES = [
    { id: '1', icon: 'microscope', title: 'ذكاء اصطناعي دقيق', description: 'تحليل كيميائي فوري لكل مكون في منتجاتكِ لمطابقتها مع أحدث الدراسات العلمية.' },
    { id: '2', icon: 'bullhorn', title: 'كاشف الحقيقة', description: 'خوارزميات متطورة تكشف الادعاءات التسويقية الزائفة وتخبركِ بالقيمة الحقيقية.' },
    { id: '3', icon: 'sync-alt', title: 'تناغم الروتين', description: 'تحليل التفاعلات بين المنتجات لضمان عدم وجود تعارض كيميائي يضر بشرتكِ.' },
    { id: '4', icon: 'shield-alt', title: 'حماية وثقة', description: 'تقييم شامل للسلامة والجودة لتشتري منتجات العناية وأنتِ مطمئنة تماماً.' }
];

const COLORS = {
  primary: '#B2D8B4',
  primaryDark: '#5E8C61',
  darkGreen: '#1a3b25',
  text: '#FFFFFF',
  textDim: 'rgba(255, 255, 255, 0.75)',
  glassTint: 'rgba(8, 20, 15, 0.75)', 
  glassBorder: 'rgba(178, 216, 180, 0.3)',
  inputBg: 'rgba(0, 0, 0, 0.3)',
  inputBgActive: 'rgba(20, 50, 35, 0.5)',
  error: '#ff6b6b', 
  success: '#B2D8B4' 
};

// --- COMPONENT: CUSTOM GLASS ALERT ---
const GlassAlert = ({ visible, title, message, type, onClose }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true })
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    const isError = type === 'error';
    const iconName = isError ? 'exclamation-circle' : 'check-circle';
    const iconColor = isError ? COLORS.error : COLORS.success;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.modalOverlay}>
                <BlurView  intensity={7} style={StyleSheet.absoluteFill} tint="dark" renderToHardwareTextureAndroid />
                <Animated.View style={[
                    styles.alertContainer, 
                    { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
                ]}>
                    <BlurView  intensity={7} tint="dark" style={[styles.alertGlass, { backgroundColor: COLORS.glassTint }]}>
                        <View style={[styles.alertIconBubble, { borderColor: iconColor }]}>
                            <FontAwesome5 name={iconName} size={32} color={iconColor} />
                        </View>
                        <Text style={styles.alertTitle}>{title}</Text>
                        <Text style={styles.alertMessage}>{message}</Text>
                        
                        <TouchableOpacity style={styles.alertBtn} onPress={onClose}>
                            <Text style={styles.alertBtnText}>حسناً</Text>
                        </TouchableOpacity>
                    </BlurView>
                </Animated.View>
            </View>
        </Modal>
    );
};

// --- COMPONENT: ORGANIC SPORE ---
const Spore = ({ size, startX, duration, delay }) => {
  const animY = useRef(new Animated.Value(0)).current; 
  const animX = useRef(new Animated.Value(0)).current; 

  useEffect(() => {
    const floatLoop = Animated.loop(
        Animated.timing(animY, { toValue: 1, duration: duration, easing: Easing.linear, useNativeDriver: true })
    );
    const driftLoop = Animated.loop(
        Animated.sequence([
            Animated.timing(animX, { toValue: 1, duration: duration * 0.33, useNativeDriver: true, easing: Easing.sin }),
            Animated.timing(animX, { toValue: -1, duration: duration * 0.33, useNativeDriver: true, easing: Easing.sin }),
            Animated.timing(animX, { toValue: 0, duration: duration * 0.34, useNativeDriver: true, easing: Easing.sin }),
        ])
    );
    const timeout = setTimeout(() => { floatLoop.start(); driftLoop.start(); }, delay);
    return () => { clearTimeout(timeout); floatLoop.stop(); driftLoop.stop(); };
  }, []);

  const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [height + 50, -100] });
  const translateX = animX.interpolate({ inputRange: [-1, 1], outputRange: [-50, 50] });
  const opacity = animY.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.6, 0.6, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute', left: startX, width: size, height: size,
        borderRadius: size / 2, backgroundColor: COLORS.primary,
        transform: [{ translateY }, { translateX }], opacity,
        zIndex: 1, shadowColor: COLORS.primary, shadowOpacity: 0.9, shadowRadius: 10, 
      }}
    />
  );
};

// --- COMPONENT: PULSING LOGO ---
const PulsingShield = () => {
    const scale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: 1.1, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(scale, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            ])
        ).start();
    }, []);
    return (
        <Animated.View style={{ transform: [{ scale }], shadowColor: COLORS.primary, shadowRadius: 30, shadowOpacity: 0.8, elevation: 15 }}>
            <MaterialCommunityIcons name="shield-star-outline" size={60} color={COLORS.primary} />
        </Animated.View>
    );
};

// --- COMPONENT: PROMO SLIDER ---
const PromoSlider = () => {
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const nextIndex = (activeIndex + 1) % FEATURES.length;
            slidesRef.current?.scrollTo({ x: nextIndex * CARD_WIDTH, animated: true });
            setActiveIndex(nextIndex);
        }, 5000); 
        return () => clearInterval(interval);
    }, [activeIndex]);

    const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false });
    const onViewableItemsChanged = useRef(({ viewableItems }) => { if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index); }).current;

    return (
        <View style={styles.sliderOuterContainer}>
            <BlurView  intensity={7} tint="dark" style={[styles.sliderGlass, { backgroundColor: COLORS.glassTint }]} >
                <Animated.ScrollView
                    ref={slidesRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16} onScroll={handleScroll} onViewableItemsChanged={onViewableItemsChanged}
                    style={{ width: CARD_WIDTH }}
                >
                    {FEATURES.map((item) => (
                        <View key={item.id} style={styles.slideCard}>
                            <View style={styles.iconContainer}>
                                <FontAwesome5 name={item.icon} size={28} color="#1a3b25" />
                            </View>
                            <Text style={styles.slideTitle}>{item.title}</Text>
                            <Text style={styles.slideDesc}>{item.description}</Text>
                        </View>
                    ))}
                </Animated.ScrollView>
                <View style={styles.paginationContainer}>
                    {FEATURES.map((_, i) => {
                        const inputRange = [(i - 1) * CARD_WIDTH, i * CARD_WIDTH, (i + 1) * CARD_WIDTH];
                        const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
                        const dotOpacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
                        return <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]} />;
                    })}
                </View>
            </BlurView>
        </View>
    );
};

// --- COMPONENT: INTERACTIVE INPUT ---
const InteractiveInput = ({ icon, ...props }) => {
    const [focused, setFocused] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.timing(scaleAnim, { toValue: focused ? 1.02 : 1, duration: 200, useNativeDriver: true }).start();
    }, [focused]);

    return (
        <Animated.View style={[styles.inputContainer, { transform: [{scale: scaleAnim}], backgroundColor: focused ? COLORS.inputBgActive : COLORS.inputBg, borderColor: focused ? COLORS.primary : COLORS.glassBorder }]}>
            <View style={styles.inputIconBox}>
                <Ionicons name={icon} size={20} color={focused ? COLORS.primary : COLORS.textDim} />
            </View>
            <TextInput placeholderTextColor={COLORS.textDim} style={styles.textInput} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} {...props} />
        </Animated.View>
    );
};

// --- MAIN SCREEN ---
export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const formOpacity = useRef(new Animated.Value(1)).current;
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info' });

  // 2. USE ROUTER
  const router = useRouter();

  const particles = useMemo(() => [...Array(15)].map((_, i) => ({ 
    id: i, // <--- Renamed from key to id
    size: Math.random()*5+3, 
    startX: Math.random()*width, 
    duration: 8000+Math.random()*7000, 
    delay: Math.random()*5000 
  })), []);

  const switchMode = () => {
      Animated.timing(formOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsLogin(!isLogin);
          Animated.timing(formOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
  };

  const showAlert = (title, message, type = 'info') => setAlertConfig({ visible: true, title, message, type });
  const closeAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleAuth = async () => {
    if(!email || !password) {
        showAlert("بيانات ناقصة", "يرجى ملء جميع الحقول المطلوبة.", "error");
        return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        // Login Redirect is handled by app/index.js, 
        // but explicit replace helps performance
        router.replace('/(main)/profile');
      } else {
        if (password.length < 6) throw new Error("password-short");
        
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'profiles', cred.user.uid), {
          email: cred.user.email, createdAt: Timestamp.now(), onboardingComplete: false,
          settings: { name: '', gender: '', skinType: '', scalpType: '' }, routines: { am: [], pm: [] }
        });

        // 3. EXPLICIT REDIRECT ON SIGN UP
        router.replace('/(onboarding)/welcome');
      }
    } catch (err) {
      let title = "خطأ في الدخول";
      let msg = err.message;
      if(msg.includes('auth/invalid-credential')) msg = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      if(msg.includes('auth/email-already-in-use')) msg = "هذا البريد الإلكتروني مسجل بالفعل.";
      if(msg.includes('password-short')) { title="كلمة المرور ضعيفة"; msg = "يجب أن تكون كلمة المرور 6 أحرف على الأقل."; }
      
      showAlert(title, msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={{ uri: BG_IMAGE }} style={StyleSheet.absoluteFill} resizeMode="cover">
        <View style={styles.darkOverlay} />
        {particles.map((p) => (
                <Spore key={p.id} {...p} />
            ))}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <PulsingShield />
                <View style={styles.titleBlock}>
                    <Text style={styles.brandTitle}>وثيق</Text>
                    <Text style={styles.brandSubtitle}>دليلكِ الذكي لجمال آمن وطبيعي</Text>
                </View>
            </View>

            <PromoSlider />

            <View style={styles.formOuterContainer}>
                <BlurView  intensity={4} tint="dark" style={[styles.formGlass, { backgroundColor: COLORS.glassTint }]} renderToHardwareTextureAndroid>
                    <Animated.View style={{ opacity: formOpacity, padding: 25 }}>
                        <Text style={styles.formTitle}>{isLogin ? 'مرحباً بعودتك!' : 'بداية جديدة'}</Text>
                        <Text style={styles.formSub}>{isLogin ? 'سجلي دخولكِ للوصول إلى تحليلاتك.' : 'أنشئي حسابكِ للوصول إلى مختبر الذكاء الاصطناعي.'}</Text>

                        <InteractiveInput icon="mail-outline" placeholder="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        <InteractiveInput icon="lock-closed-outline" placeholder="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry />

                        <TouchableOpacity style={[styles.mainBtn, loading && {opacity: 0.7}]} onPress={handleAuth} disabled={loading} activeOpacity={0.8}>
                            {loading ? <Text style={styles.btnText}>جاري المعالجة...</Text> : (
                                <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                                    <FontAwesome5 name={isLogin ? "sign-in-alt" : "user-plus"} color={COLORS.darkGreen} size={16} />
                                    <Text style={styles.btnText}>{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.switchBtn} onPress={switchMode}>
                            <Text style={styles.switchText}>{isLogin ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
                                <Text style={styles.linkText}>{isLogin ? ' أنشئي حساباً' : ' سجلّي الدخول'}</Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </BlurView>
            </View>

            <Text style={styles.copyright}>© وثيق | تكنولوجيا الجمال الجزائرية</Text>
          </ScrollView>
        </KeyboardAvoidingView>

        <GlassAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} onClose={closeAlert} />
      </ImageBackground>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: 50 },
  
  header: { alignItems: 'center', marginBottom: 20 },
  titleBlock: { alignItems: 'center', marginTop: 15 },
  brandTitle: { 
    fontSize: 48, fontFamily: 'Tajawal-ExtraBold', color: COLORS.text, letterSpacing: 1,
    textShadowColor: COLORS.primary, textShadowOffset: {width: 0, height: 0}, textShadowRadius: 25, marginBottom: 5
  },
  brandSubtitle: { color: COLORS.textDim, fontSize: 16, fontFamily: 'Tajawal-Regular' },

  sliderOuterContainer: {
    borderRadius: 25, overflow: 'hidden', width: '100%', marginBottom: 25,
    borderWidth: 1, borderColor: COLORS.glassBorder, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 15
  },
  sliderGlass: { paddingVertical: 20, width: '100%' },
  slideCard: { width: CARD_WIDTH, alignItems: 'center', paddingHorizontal: 20 },
  iconContainer: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 15,
    shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 15, elevation: 10
  },
  slideTitle: { color: COLORS.text, fontSize: 20, marginBottom: 8, textAlign: 'center', fontFamily: 'Tajawal-Bold' },
  slideDesc: { color: 'rgba(255,255,255,0.95)', fontSize: 15, textAlign: 'center', lineHeight: 24, paddingHorizontal: 10, fontFamily: 'Tajawal-Regular' },
  paginationContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, height: 10, alignItems: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3, backgroundColor: COLORS.primary },

  formOuterContainer: { width: '100%', borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.glassBorder },
  formGlass: { width: '100%' },
  formTitle: { fontSize: 26, color: COLORS.text, textAlign: 'center', marginBottom: 8, fontFamily: 'Tajawal-Bold' },
  formSub: { fontSize: 15, color: COLORS.textDim, textAlign: 'center', marginBottom: 25, fontFamily: 'Tajawal-Regular' },

  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginBottom: 15, borderWidth: 1 },
  inputIconBox: { paddingHorizontal: 15 },
  textInput: { flex: 1, paddingVertical: 16, paddingRight: 16, color: COLORS.text, fontSize: 16, textAlign: 'right', fontFamily: 'Tajawal-Regular' },

  mainBtn: {
    backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10,
    shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10
  },
  btnText: { color: COLORS.darkGreen, fontSize: 18, fontFamily: 'Tajawal-Bold' },
  switchBtn: { alignItems: 'center', marginTop: 25, padding: 5 },
  switchText: { color: COLORS.textDim, fontSize: 15, fontFamily: 'Tajawal-Regular' },
  linkText: { color: COLORS.primary, fontFamily: 'Tajawal-Bold' },
  copyright: { textAlign: 'center', color: COLORS.textDim, marginTop: 40, fontSize: 13, opacity: 0.6, fontFamily: 'Tajawal-Regular' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  alertContainer: { width: width * 0.85, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.primary },
  alertGlass: { padding: 30, alignItems: 'center' },
  alertIconBubble: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2 },
  alertTitle: { fontSize: 22, color: COLORS.text, fontFamily: 'Tajawal-Bold', marginBottom: 10, textAlign: 'center' },
  alertMessage: { fontSize: 16, color: COLORS.textDim, fontFamily: 'Tajawal-Regular', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  alertBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 20 },
  alertBtnText: { color: COLORS.darkGreen, fontSize: 16, fontFamily: 'Tajawal-Bold' }
});