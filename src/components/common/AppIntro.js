import React, { useState, useEffect, useRef } from 'react';
import { 
    Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, 
    Animated, Easing, StatusBar, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// 🔴 DEBUG FLAG: Set to 'false' for production
const ALWAYS_SHOW_INTRO_DEBUG = false; 

// --- THEME ---
const COLORS = {
  background: '#1A2D27', 
  card: '#253D34',      
  border: 'rgba(90, 156, 132, 0.25)', 
  textDim: '#6B7C76',   
  accentGreen: '#5A9C84', 
  accentGlow: 'rgba(90, 156, 132, 0.4)', 
  primary: '#A3E4D7',    
  textPrimary: '#F1F3F2',   
  textSecondary: '#A3B1AC', 
  textOnAccent: '#1A2D27',  
  danger: '#ef4444', 
  warning: '#f59e0b', 
  info: '#3b82f6', 
  success: '#22c55e',
  gold: '#fbbf24'
};

// --- 1. DATA ---
const SLIDES = [
    {
        id: 'welcome',
        title: "أهلا بكِ في وثيق",
        subtitle: "الجمال يبدأ بالحقيقة",
        desc: "تجاوزي وعود الإعلانات واكتشفي الحقيقة العلمية لكل منتج. نحن هنا لتمكينك بالمعرفة وليس لبيع الأوهام.",
        icon: "shield-alt",
        color: COLORS.accentGreen, 
        bgGradient: [COLORS.background, '#064E3B']
    },
    {
        id: 'oilguard',
        title: "فاحص المكونات",
        subtitle: "عين الخبير في جيبك",
        desc: "صوري المكونات واحصلي فورا على تحليل كيميائي دقيق. نكشف لكِ السموم الخفية، المواد الحافظة، والفعالية الحقيقية.",
        icon: "search-plus",
        color: COLORS.gold, 
        bgGradient: [COLORS.background, '#14532D']
    },
    {
        id: 'shelf',
        title: "الرف الذكي",
        subtitle: "تنظيم وتحليل",
        desc: "رتبي منتجاتك رقميا، وسنقوم بتحليل التناغم بينها. هل تتعارض مكونات روتينك؟ وثيق سيخبرك قبل أن تضعيها على بشرتك.",
        icon: "flask",
        color: COLORS.primary, 
        bgGradient: [COLORS.background, '#065F46']
    },
    {
        id: 'community',
        title: "مجتمع وثيق",
        subtitle: "تجارب تشبهكِ",
        desc: "انضمي لمجتمع يعتمد على 'التطابق الحيوي'. شاركي تجاربك واقرئي تقييمات أشخاص يملكون نفس نوع بشرتك تماما.",
        icon: "users",
        color: '#6EE7B7', 
        bgGradient: [COLORS.background, '#047857']
    },
    {
        id: 'comparison',
        title: "حلبة المقارنة",
        subtitle: "القرار العلمي",
        desc: "محتارة بين منتجين؟ ضعيهما وجها لوجه في مقارنة علمية دقيقة تكشف الأفضل لكِ بناء على السعر، الأمان، والفعالية.",
        icon: "balance-scale",
        color: COLORS.textPrimary,
        bgGradient: [COLORS.background, '#111827']
    }
];

// --- 2. COMPONENTS ---

const AnimatedBackground = ({ scrollX }) => (
    <View style={StyleSheet.absoluteFill}>
        {SLIDES.map((slide, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0, 1, 0],
                extrapolate: 'clamp'
            });
            return (
                <Animated.View key={slide.id} style={[StyleSheet.absoluteFill, { opacity }]}>
                    <LinearGradient 
                        colors={slide.bgGradient} 
                        style={StyleSheet.absoluteFill} 
                        start={{x: 0.5, y: 0}} end={{x: 0.5, y: 1}}
                    />
                    <View style={styles.noiseOverlay} />
                </Animated.View>
            );
        })}
    </View>
);

const Particle = ({ delay, duration, startX, size, color }) => {
    const animY = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
                    Animated.timing(animY, {
                        toValue: -height * 1.2,
                        duration: duration,
                        easing: Easing.linear,
                        useNativeDriver: true,
                    })
                ]),
                Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.timing(animY, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ).start();
    }, []);

    return (
        <Animated.View 
            style={{
                position: 'absolute', bottom: -50, left: startX, width: size, height: size,
                borderRadius: size / 2, backgroundColor: color, opacity,
                transform: [{ translateY: animY }]
            }}
        />
    );
};

const SwipeHint = () => {
    const translateX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(translateX, { toValue: -20, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
                Animated.timing(translateX, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        animate.start();
        return () => animate.stop();
    }, []);

    return (
        <View style={styles.swipeHintContainer}>
            <Animated.View style={{ transform: [{ translateX }], opacity }}>
                <MaterialCommunityIcons name="gesture-swipe-horizontal" size={40} color="rgba(255,255,255,0.6)" />
            </Animated.View>
            <Text style={styles.swipeText}>اسحب للمتابعة</Text>
        </View>
    );
};

const CustomSwitch = ({ value, onToggle, activeColor }) => (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.8} style={styles.switchContainer}>
        <View style={[styles.checkboxBase, value && { borderColor: activeColor, backgroundColor: activeColor }]}>
            {value && <Ionicons name="checkmark" size={12} color="#000" />}
        </View>
        <Text style={styles.switchText}>عدم الإظهار مجددا</Text>
    </TouchableOpacity>
);

// --- 3. MAIN COMPONENT ---
const AppIntro = ({ visible, onClose }) => {
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    // Orbit Animation
    const rotateAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateAnim, { toValue: 1, duration: 25000, easing: Easing.linear, useNativeDriver: true })
        ).start();
    }, []);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
        } else if (ALWAYS_SHOW_INTRO_DEBUG) {
            setShouldRender(true);
        } else {
            setShouldRender(false);
        }
    }, [visible]);

    const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const reverseSpin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

    // Particles
    const particles = useRef([...Array(20)].map((_, i) => ({
        id: i, startX: Math.random() * width, size: Math.random() * 4 + 2,
        duration: 12000 + Math.random() * 8000, delay: Math.random() * 8000,
        color: i % 2 === 0 ? COLORS.accentGreen : COLORS.primary
    }))).current;

    const handleFinish = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (dontShowAgain) {
            try { await AsyncStorage.setItem('has_seen_app_intro', 'true'); } catch (e) {}
        }
        setShouldRender(false);
        if (onClose) onClose();
    };

    const renderItem = ({ item, index }) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        
        const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1, 0.8],
            extrapolate: 'clamp'
        });
        
        const translateX = scrollX.interpolate({
            inputRange,
            outputRange: [-width * 0.3, 0, width * 0.3],
            extrapolate: 'clamp'
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp'
        });

        return (
            <View style={{ width, alignItems: 'center', paddingHorizontal: 30 }}>
                {/* Visual */}
                <View style={styles.visualContainer}>
                    <Animated.View style={[styles.orbitRing, { borderColor: 'rgba(255,255,255,0.08)', transform: [{ rotate: spin }, { scale }] }]}>
                        <View style={[styles.orbitDot, { top: -4, backgroundColor: item.color }]} />
                        <View style={[styles.orbitDot, { bottom: -4, backgroundColor: item.color }]} />
                    </Animated.View>

                    <Animated.View style={[styles.orbitRing, { width: 220, height: 220, borderRadius: 110, borderColor: 'rgba(255,255,255,0.15)', transform: [{ rotate: reverseSpin }, { scale }] }]}>
                         <View style={[styles.orbitDot, { left: -4, backgroundColor: item.color }]} />
                    </Animated.View>

                    <Animated.View style={[
                        styles.iconCore, 
                        { 
                            backgroundColor: item.color + '15',
                            borderColor: item.color,
                            transform: [{ scale }]
                        }
                    ]}>
                        <FontAwesome5 name={item.icon} size={55} color={item.color} />
                    </Animated.View>
                </View>

                {/* Text */}
                <Animated.View style={[styles.textWrapper, { transform: [{ translateX }], opacity }]}>
                    <View style={[styles.subtitleBadge, { borderColor: item.color + '40', backgroundColor: item.color + '10' }]}>
                        <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle}</Text>
                    </View>
                    <Text style={styles.title}>{item.title}</Text>
                    <View style={styles.divider} />
                    <Text style={styles.desc}>{item.desc}</Text>
                </Animated.View>
            </View>
        );
    };

    const lastIndex = SLIDES.length - 1;
    const buttonOpacity = scrollX.interpolate({
        inputRange: [(lastIndex - 1) * width, lastIndex * width],
        outputRange: [0, 1],
        extrapolate: 'clamp'
    });
    const hintOpacity = scrollX.interpolate({
        inputRange: [(lastIndex - 1) * width, lastIndex * width],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });
    const buttonTranslateY = scrollX.interpolate({
        inputRange: [(lastIndex - 1) * width, lastIndex * width],
        outputRange: [20, 0],
        extrapolate: 'clamp'
    });

    if (!shouldRender) return null;

    const currentSlide = SLIDES[currentIndex];

    return (
        <Modal visible={true} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
                
                {/* Backgrounds */}
                <AnimatedBackground scrollX={scrollX} />
                {particles.map(p => <Particle key={p.id} {...p} />)}

                <SafeAreaView style={{ flex: 1 }}>
                    
                    {/* Header: Skip Button */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
                            <Text style={styles.skipText}>تخطي</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content List */}
                    <Animated.FlatList
                        ref={flatListRef}
                        data={SLIDES}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        bounces={false}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                            { useNativeDriver: true }
                        )}
                        onMomentumScrollEnd={(ev) => {
                            const newIndex = Math.round(ev.nativeEvent.contentOffset.x / width);
                            setCurrentIndex(newIndex);
                            Haptics.selectionAsync();
                        }}
                        scrollEventThrottle={16}
                    />

                    {/* Footer */}
                    <View style={styles.footer}>
                        
                        {/* Pagination */}
                        <View style={styles.pagination}>
                            {SLIDES.map((_, index) => {
                                const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                                const dotScale = scrollX.interpolate({
                                    inputRange,
                                    outputRange: [1, 2.5, 1],
                                    extrapolate: 'clamp'
                                });
                                const dotOpacity = scrollX.interpolate({
                                    inputRange,
                                    outputRange: [0.3, 1, 0.3],
                                    extrapolate: 'clamp'
                                });
                                return (
                                    <Animated.View key={index} style={[styles.dot, { opacity: dotOpacity, transform: [{ scaleX: dotScale }] }]} />
                                );
                            })}
                        </View>

                        {/* Controls */}
                        <View style={styles.controlsContainer}>
                            
                            {/* Switch */}
                            <View style={styles.switchWrapper}>
                                <CustomSwitch 
                                    value={dontShowAgain} 
                                    onToggle={() => setDontShowAgain(!dontShowAgain)} 
                                    activeColor={currentSlide.color} 
                                />
                            </View>

                            {/* Action Button / Hint */}
                            <View style={styles.actionArea}>
                                <Animated.View style={[styles.absoluteCenter, { opacity: hintOpacity }]}>
                                    <SwipeHint />
                                </Animated.View>

                                <Animated.View style={[
                                    styles.absoluteCenter, 
                                    { opacity: buttonOpacity, transform: [{ translateY: buttonTranslateY }] }
                                ]} pointerEvents={currentIndex === lastIndex ? 'auto' : 'none'}>
                                    <TouchableOpacity style={styles.startBtn} onPress={handleFinish} activeOpacity={0.9}>
                                        <LinearGradient colors={[COLORS.primary, COLORS.accentGreen]} style={styles.startBtnGradient}>
                                            {/* Fixed: Removed extra whitespace that caused crashes */}
                                            <Text style={[styles.startBtnText, { color: COLORS.textOnAccent }]}>انطلاق</Text>
                                            <Ionicons name="rocket-outline" size={24} color={COLORS.textOnAccent} />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </Animated.View>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    noiseOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.05)', 
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        padding: 20,
    },
    skipBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    skipText: {
        fontFamily: 'Tajawal-Bold',
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    visualContainer: {
        height: height * 0.40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    orbitRing: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed'
    },
    orbitDot: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        shadowColor: "#FFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
    },
    iconCore: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(26, 45, 39, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.6,
        shadowRadius: 30,
        elevation: 25,
    },
    textWrapper: {
        alignItems: 'center',
        height: height * 0.35,
        justifyContent: 'flex-start',
    },
    subtitleBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 15,
        borderWidth: 1,
    },
    subtitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    title: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 32,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 15,
        lineHeight: 40,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 10,
    },
    divider: {
        width: 60,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        marginBottom: 20,
    },
    desc: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
    },
    footer: {
        height: 90,
        justifyContent: 'space-between',
        paddingBottom: 40,
        alignItems: 'center',
    },
    pagination: {
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        height: 6,
        width: 6, 
        borderRadius: 3,
        backgroundColor: '#FFF',
    },
    controlsContainer: {
        width: '100%',
        paddingHorizontal: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    switchWrapper: {
        flex: 1,
        alignItems: 'flex-start',
    },
    actionArea: {
        flex: 1,
        height: 60,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    absoluteCenter: {
        position: 'absolute',
        right: 0,
        alignItems: 'center',
    },
    switchContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        padding: 10,
    },
    checkboxBase: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.textDim,
        alignItems: 'center',
        justifyContent: 'center',
    },
    switchText: {
        fontFamily: 'Tajawal-Regular',
        color: COLORS.textDim,
        fontSize: 12,
    },
    swipeHintContainer: {
        alignItems: 'center',
        gap: 5,
    },
    swipeText: {
        fontFamily: 'Tajawal-Regular',
        color: COLORS.textDim,
        fontSize: 12,
    },
    startBtn: {
        borderRadius: 30,
        shadowColor: COLORS.accentGreen,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 15,
    },
    startBtnGradient: {
        flexDirection: 'row-reverse',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
        alignItems: 'center',
        gap: 10,
    },
    startBtnText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        color: COLORS.textOnAccent
    }
});

export default AppIntro;