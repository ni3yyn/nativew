import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  Dimensions, KeyboardAvoidingView, Platform, ScrollView, 
  Animated, Easing, ImageBackground, StatusBar, 
  LayoutAnimation, UIManager
} from 'react-native';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { auth, db } from '../../src/config/firebase';


// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 40; 

// --- CONFIGURATION ---
const BG_IMAGE = require('../../assets/lolo.jpg');

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
    
    // UPDATE THIS LINE (Darker opacity to replace blur)
    glassTint: 'rgba(5, 15, 10, 0.90)', 
    
    glassBorder: 'rgba(178, 216, 180, 0.2)',
    inputBg: 'rgba(0, 0, 0, 0.2)',
    inputBgActive: 'rgba(20, 50, 35, 0.4)',
    error: '#ff6b6b', 
    success: '#B2D8B4' 
  };

// --- COMPONENT: SMOOTH TOAST NOTIFICATION (Replaces Modal) ---
const FloatingToast = ({ visible, title, message, type }) => {
    const translateY = useRef(new Animated.Value(-150)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, { toValue: 50, friction: 6, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true })
            ]).start();
        } else {
            Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                translateY.setValue(-150);
            });
        }
    }, [visible]);

    const isError = type === 'error';
    const iconName = isError ? 'exclamation-circle' : 'check-circle';
    const iconColor = isError ? COLORS.error : COLORS.success;
    const barColor = isError ? COLORS.error : COLORS.success;

    return (
        <Animated.View style={[styles.toastContainer, { opacity, transform: [{ translateY }] }]}>
            {/* REPLACED BLURVIEW WITH VIEW */}
            <View style={styles.toastGlass}>
                <View style={[styles.toastBar, { backgroundColor: barColor }]} />
                <View style={styles.toastContent}>
                    <Text style={styles.toastTitle}>{title}</Text>
                    <Text style={styles.toastMessage}>{message}</Text>
                </View>
                <FontAwesome5 name={iconName} size={24} color={iconColor} style={{ marginLeft: 15 }} />
            </View>
        </Animated.View>
    );
};

// --- COMPONENT: ORGANIC SPORE (Slower, smoother) ---
const Spore = ({ size, startX, duration, delay }) => {
  const animY = useRef(new Animated.Value(0)).current; 
  const animX = useRef(new Animated.Value(0)).current; 
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance scale
    Animated.timing(scale, { toValue: 1, duration: 1000, delay: delay, useNativeDriver: true }).start();

    const floatLoop = Animated.loop(
        Animated.timing(animY, { toValue: 1, duration: duration, easing: Easing.linear, useNativeDriver: true })
    );
    const driftLoop = Animated.loop(
        Animated.sequence([
            Animated.timing(animX, { toValue: 1, duration: duration * 0.33, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
            Animated.timing(animX, { toValue: -1, duration: duration * 0.33, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
            Animated.timing(animX, { toValue: 0, duration: duration * 0.34, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ])
    );
    
    // Randomize start time slightly
    const timeout = setTimeout(() => { floatLoop.start(); driftLoop.start(); }, delay);
    return () => { clearTimeout(timeout); floatLoop.stop(); driftLoop.stop(); };
  }, []);

  const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [height + 50, -100] });
  const translateX = animX.interpolate({ inputRange: [-1, 1], outputRange: [-30, 30] });
  
  return (
    <Animated.View
      style={{
        position: 'absolute', left: startX, width: size, height: size,
        borderRadius: size / 2, backgroundColor: COLORS.primary,
        transform: [{ translateY }, { translateX }, { scale }], 
        opacity: 0.4, // Lower opacity for depth effect
        zIndex: 0,
      }}
    />
  );
};

// --- COMPONENT: PULSING SHIELD (Entrance Animation) ---
const PulsingShield = () => {
    const scale = useRef(new Animated.Value(0)).current; // Start from 0
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Entrance
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }).start(() => {
            // Then Pulse
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.1, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                    Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                ])
            ).start();
        });
    }, []);

    return (
        <Animated.View style={{ transform: [{ scale }, { scale: pulse }], shadowColor: COLORS.primary, shadowRadius: 30, shadowOpacity: 0.8, elevation: 15 }}>
            <MaterialCommunityIcons name="shield-star-outline" size={60} color={COLORS.primary} />
        </Animated.View>
    );
};

// --- COMPONENT: MODERN CAROUSEL SLIDE ---
// --- COMPONENT: FLUID PARALLAX SLIDE ---
const SlideItem = ({ item, index, scrollX }) => {
    // We calculate interpolation based on the item's ABSOLUTE position in the big list
    const inputRange = [(index - 1) * CARD_WIDTH, index * CARD_WIDTH, (index + 1) * CARD_WIDTH];

    const iconScale = scrollX.interpolate({
        inputRange,
        outputRange: [0.5, 1.1, 0.5],
        extrapolate: 'clamp',
    });

    const iconTranslateY = scrollX.interpolate({
        inputRange,
        outputRange: [30, 0, 30],
        extrapolate: 'clamp',
    });

    const iconRotate = scrollX.interpolate({
        inputRange,
        outputRange: ['-20deg', '0deg', '20deg'],
        extrapolate: 'clamp',
    });

    const textOpacity = scrollX.interpolate({
        inputRange,
        outputRange: [0, 1, 0],
        extrapolate: 'clamp',
    });

    const textTranslateX = scrollX.interpolate({
        inputRange,
        outputRange: [100, 0, -100],
        extrapolate: 'clamp',
    });

    return (
        <View style={styles.slideCard}>
            <Animated.View style={[
                styles.iconContainer, 
                { transform: [{ scale: iconScale }, { translateY: iconTranslateY }, { rotate: iconRotate }] }
            ]}>
                <View style={styles.iconRing} />
                <FontAwesome5 name={item.icon} size={30} color="#1a3b25" />
            </Animated.View>

            <Animated.View style={{ opacity: textOpacity, transform: [{ translateX: textTranslateX }], alignItems: 'center', paddingHorizontal: 10, width: '100%' }}>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideDesc}>{item.description}</Text>
            </Animated.View>
        </View>
    );
};

// --- COMPONENT: INFINITE PROMO SLIDER ---
const PromoSlider = () => {
    // 1. Triple the data to create buffer zones
    // Set A (0-3), Set B (4-7) [Start Here], Set C (8-11)
    const infiniteData = useMemo(() => [...FEATURES, ...FEATURES, ...FEATURES], []);
    const startIndex = FEATURES.length; // Start at index 4 (Set B)
    
    const scrollX = useRef(new Animated.Value(startIndex * CARD_WIDTH)).current;
    const slidesRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(startIndex);
    
    // 2. Modulo Math for Dots
    // This makes scrollX effectively loop between 0 and (totalWidth), ignoring the physical snap
    const totalSetWidth = FEATURES.length * CARD_WIDTH;
    const moduloScrollX = Animated.modulo(scrollX, totalSetWidth);

    // Auto-Scroll Logic
    useEffect(() => {
        const interval = setInterval(() => {
            let nextIndex = activeIndex + 1;
            // Animate to next item
            slidesRef.current?.scrollTo({ x: nextIndex * CARD_WIDTH, animated: true });
            setActiveIndex(nextIndex);
        }, 5000);

        return () => clearInterval(interval);
    }, [activeIndex]);

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    // 3. The Infinite Snap Logic
    const handleMomentumScrollEnd = (e) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / CARD_WIDTH);

        // If we are in Set C (too far right), snap back to Set B
        if (index >= FEATURES.length * 2) {
            const newIndex = index - FEATURES.length;
            slidesRef.current?.scrollTo({ x: newIndex * CARD_WIDTH, animated: false });
            setActiveIndex(newIndex);
        }
        // If we are in Set A (too far left), snap forward to Set B
        else if (index < FEATURES.length) {
            const newIndex = index + FEATURES.length;
            slidesRef.current?.scrollTo({ x: newIndex * CARD_WIDTH, animated: false });
            setActiveIndex(newIndex);
        } else {
            setActiveIndex(index);
        }
    };

    return (
        <View style={styles.sliderOuterContainer}>
            <View style={[styles.sliderGlass, { backgroundColor: COLORS.glassTint }]}>  
                <Animated.ScrollView
                    ref={slidesRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={handleScroll}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    // Start at the middle set
                    contentOffset={{ x: startIndex * CARD_WIDTH, y: 0 }}
                    contentContainerStyle={{ alignItems: 'center' }}
                    style={{ width: CARD_WIDTH }}
                >
                    {infiniteData.map((item, index) => (
                        // We use index as key to ensure unique rendering for the cloned list
                        <SlideItem key={`${item.id}-${index}`} item={item} index={index} scrollX={scrollX} />
                    ))}
                </Animated.ScrollView>

                {/* Animated Worm Pagination (Driven by Modulo) */}
                <View style={styles.paginationContainer}>
                    {FEATURES.map((_, i) => {
                        const inputRange = [(i - 1) * CARD_WIDTH, i * CARD_WIDTH, (i + 1) * CARD_WIDTH];
                        
                        // Use moduloScrollX so dots repeat perfectly every 4 items
                        const dotWidth = moduloScrollX.interpolate({
                            inputRange,
                            outputRange: [8, 40, 8], 
                            extrapolate: 'clamp',
                        });
                        
                        const dotColor = moduloScrollX.interpolate({
                            inputRange,
                            outputRange: ['rgba(255, 255, 255, 0.2)', COLORS.primary, 'rgba(255, 255, 255, 0.2)'],
                            extrapolate: 'clamp',
                        });

                        return (
                            <Animated.View 
                                key={i} 
                                style={[styles.dot, { width: dotWidth, backgroundColor: dotColor }]} 
                            />
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

// --- COMPONENT: SCANNER INPUT (New Animation) ---
const BioInput = ({ icon, ...props }) => {
    const [focused, setFocused] = useState(false);
    const scanAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(scanAnim, {
            toValue: focused ? 1 : 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false // Width interpolation
        }).start();
    }, [focused]);

    const lineWidth = scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <View style={[styles.inputContainer, { backgroundColor: focused ? COLORS.inputBgActive : COLORS.inputBg }]}>
            <View style={styles.inputIconBox}>
                <Ionicons name={icon} size={20} color={focused ? COLORS.primary : COLORS.textDim} />
            </View>
            <TextInput 
                placeholderTextColor={COLORS.textDim} 
                style={styles.textInput} 
                onFocus={() => setFocused(true)} 
                onBlur={() => setFocused(false)} 
                selectionColor={COLORS.primary}
                {...props} 
            />
            {/* Scanner Line */}
            <View style={styles.scanLineTrack}>
                <Animated.View style={[styles.scanLineFill, { width: lineWidth }]} />
            </View>
        </View>
    );
};

// --- MAIN SCREEN ---
export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info' });

  // Animation values for smooth transitions
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;
  const formHeightAnim = useRef(new Animated.Value(1)).current; // Used to trigger fade out/in

  const router = useRouter();

  const particles = useMemo(() => [...Array(20)].map((_, i) => ({ 
    id: i, 
    size: Math.random() * 6 + 2, 
    startX: Math.random() * width, 
    duration: 10000 + Math.random() * 8000, 
    delay: Math.random() * 5000 
  })), []);

  // Entrance Animation
  useEffect(() => {
    Animated.parallel([
        Animated.timing(containerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(contentTranslateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();
  }, []);

  const switchMode = () => {
      // 1. Fade Out
      Animated.timing(formHeightAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
          // 2. Change Logic
          setIsLogin(!isLogin);
          setAlertConfig({ ...alertConfig, visible: false }); // Hide any toasts

          // 3. Fade In (with slight delay for smoothness)
          setTimeout(() => {
            Animated.timing(formHeightAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
          }, 50);
      });
  };

  const showToast = (title, message, type = 'info') => {
      setAlertConfig({ visible: true, title, message, type });
      // Auto hide after 4 seconds
      setTimeout(() => {
          setAlertConfig(prev => ({...prev, visible: false}));
      }, 4000);
  };

  const handleAuth = async () => {
    if(!email || !password) {
        showToast("بيانات ناقصة", "يرجى ملء جميع الحقول المطلوبة.", "error");
        return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        router.replace('/(main)/profile');
      } else {
        if (password.length < 6) throw new Error("password-short");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'profiles', cred.user.uid), {
          email: cred.user.email, createdAt: Timestamp.now(), onboardingComplete: false,
          settings: { name: '', gender: '', skinType: '', scalpType: '' }, routines: { am: [], pm: [] }
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

  const formTranslateY = formHeightAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [10, 0]
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={BG_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover">
        <View style={styles.darkOverlay} />
        {particles.map((p) => (
            <Spore key={p.id} {...p} />
        ))}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Staggered Entrance Wrapper */}
            <Animated.View style={{ opacity: containerOpacity, transform: [{ translateY: contentTranslateY }] }}>
                
                <View style={styles.header}>
                    <PulsingShield />
                    <View style={styles.titleBlock}>
                        <Text style={styles.brandTitle}>وثيق</Text>
                        <Text style={styles.brandSubtitle}>دليلكِ الذكي لجمال آمن وطبيعي</Text>
                    </View>
                </View>

                <PromoSlider />

                <View style={styles.formOuterContainer}>
                <View style={[styles.formGlass, { backgroundColor: COLORS.glassTint }]} > 
                        {/* Smooth Switching Content */}
                        <Animated.View style={{ 
                            padding: 25, 
                            opacity: formHeightAnim, 
                            transform: [{ translateY: formTranslateY }] 
                        }}>
                            <Text style={styles.formTitle}>{isLogin ? 'مرحباً بعودتك!' : 'بداية جديدة'}</Text>
                            <Text style={styles.formSub}>{isLogin ? 'سجلي دخولكِ للوصول إلى تحليلاتك.' : 'أنشئي حسابكِ للوصول إلى مختبر الذكاء الاصطناعي.'}</Text>

                            <BioInput icon="mail-outline" placeholder="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                            <BioInput icon="lock-closed-outline" placeholder="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry />

                            <TouchableOpacity style={[styles.mainBtn, loading && {opacity: 0.7}]} onPress={handleAuth} disabled={loading} activeOpacity={0.8}>
                                {loading ? <Text style={styles.btnText}>جاري المعالجة...</Text> : (
                                    <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                                        <FontAwesome5 name={isLogin ? "sign-in-alt" : "user-plus"} color={COLORS.darkGreen} size={16} />
                                        <Text style={styles.btnText}>{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.switchBtn} onPress={switchMode} activeOpacity={0.6}>
                                <Text style={styles.switchText}>{isLogin ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
                                    <Text style={styles.linkText}>{isLogin ? ' أنشئي حساباً' : ' سجلّي الدخول'}</Text>
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                    </View>
                </View>

                <Text style={styles.copyright}>© وثيق | تكنولوجيا الجمال الجزائرية</Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Floating Toast Notification (Always on top) */}
        <FloatingToast visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} />
        
      </ImageBackground>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5, 15, 10, 0.65)' }, // Slightly darker for contrast
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: 60, paddingBottom: 40 },
  
  header: { alignItems: 'center', marginBottom: 25 },
  titleBlock: { alignItems: 'center', marginTop: 15 },
  brandTitle: { 
    fontSize: 52, fontFamily: 'Tajawal-ExtraBold', color: COLORS.text, letterSpacing: 1,
    textShadowColor: COLORS.primary, textShadowOffset: {width: 0, height: 0}, textShadowRadius: 30, marginBottom: 5
  },
  brandSubtitle: { color: COLORS.textDim, fontSize: 16, fontFamily: 'Tajawal-Regular', letterSpacing: 0.5 },

  sliderOuterContainer: {
    borderRadius: 32,
    overflow: 'hidden', 
    width: '100%', 
    marginBottom: 30,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)', 
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  sliderGlass: { 
    paddingVertical: 35, // More breathing room
    width: '100%',
    alignItems: 'center'
  },
  slideCard: { 
    width: CARD_WIDTH, 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 15
  },
  iconContainer: {
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: COLORS.primary, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 25,
    marginTop: 10,
    shadowColor: COLORS.primary, 
    shadowOpacity: 0.6, 
    shadowRadius: 30, 
    elevation: 20,
    position: 'relative'
  },
  iconRing: {
    position: 'absolute',
    width: '115%',
    height: '115%',
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    borderStyle: 'dashed' // Adds a tech/scientific feel
  },
  slideTitle: { 
    color: COLORS.text, 
    fontSize: 22, 
    marginBottom: 10, 
    textAlign: 'center', 
    fontFamily: 'Tajawal-Bold',
    letterSpacing: 0.5
  },
  slideDesc: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 15, 
    textAlign: 'center', 
    lineHeight: 24, 
    fontFamily: 'Tajawal-Regular',
    maxWidth: '95%' // Prevents text from hitting edges
  },
  paginationContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 30, 
    height: 10, 
    alignItems: 'center', 
    gap: 8 
  },
  dot: { 
    height: 6, 
    borderRadius: 4,
    // Width and Color are animated inline
  },


  formOuterContainer: { 
      width: '100%', borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.glassBorder,
      shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 20
  },
  formGlass: { width: '100%' },
  formTitle: { fontSize: 28, color: COLORS.text, textAlign: 'center', marginBottom: 8, fontFamily: 'Tajawal-Bold' },
  formSub: { fontSize: 15, color: COLORS.textDim, textAlign: 'center', marginBottom: 30, fontFamily: 'Tajawal-Regular' },

  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginBottom: 18, overflow: 'hidden', height: 56, position: 'relative' },
  inputIconBox: { width: 50, alignItems: 'center', justifyContent: 'center', height: '100%' },
  textInput: { flex: 1, height: '100%', color: COLORS.text, fontSize: 16, textAlign: 'right', fontFamily: 'Tajawal-Regular', paddingRight: 10 },
  scanLineTrack: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
  scanLineFill: { height: '100%', backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOpacity: 1, shadowRadius: 5 },

  mainBtn: {
    backgroundColor: COLORS.primary, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10,
    shadowColor: COLORS.primary, shadowOpacity: 0.6, shadowRadius: 25, elevation: 10
  },
  btnText: { color: COLORS.darkGreen, fontSize: 18, fontFamily: 'Tajawal-Bold' },
  switchBtn: { alignItems: 'center', marginTop: 25, padding: 10 },
  switchText: { color: COLORS.textDim, fontSize: 15, fontFamily: 'Tajawal-Regular' },
  linkText: { color: COLORS.primary, fontFamily: 'Tajawal-Bold' },
  copyright: { textAlign: 'center', color: COLORS.textDim, marginTop: 40, fontSize: 12, opacity: 0.5, fontFamily: 'Tajawal-Regular' },

  // Toast Styles
  toastContainer: {
      position: 'absolute', top: 50, left: 20, right: 20, 
      zIndex: 100, borderRadius: 16, overflow: 'hidden',
      shadowColor: "#000", shadowOffset: {width: 0, height: 5}, shadowOpacity: 0.3, shadowRadius: 10, elevation: 20
  },
  toastGlass: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'rgba(20, 30, 25, 0.96)' },
  toastBar: { width: 4, height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0 },
  toastContent: { flex: 1 },
  toastTitle: { color: COLORS.text, fontSize: 16, fontFamily: 'Tajawal-Bold', marginBottom: 4, textAlign: 'right' },
  toastMessage: { color: COLORS.textDim, fontSize: 14, fontFamily: 'Tajawal-Regular', textAlign: 'right' }
});