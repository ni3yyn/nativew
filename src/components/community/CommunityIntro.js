import React, { useState, useEffect, useRef } from 'react';
import { 
    Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, 
    Animated, Easing, StatusBar, FlatList, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// --- 1. DATA ---
const SLIDES = [
    {
        id: 'welcome',
        title: "مجتمع وثيق",
        subtitle: "ابحثي.. اسألي.. شاركي",
        desc: "المكان الوحيد الذي تجدين فيه إجابات علمية لتساؤلاتك، وتشاركين فيه خبرتك مع أشخاص يشبهونك تماما.",
        icon: "users",
        color: COLORS.primary, 
        bgGradient: ['#1A2D27', '#14532D']
    },
    {
        id: 'match',
        title: "توأم بشرتك",
        subtitle: "تطابق حيوي (Bio-Match)",
        desc: "لا تضيعي وقتك. نحن نفلتر لكِ المنشورات لتري فقط تجارب الأشخاص الذين يطابقون بشرتك، شعرك، ومشاكلك الصحية.",
        icon: "fingerprint",
        color: COLORS.blue,
        bgGradient: ['#1A2D27', '#172554']
    },
    {
        id: 'review',
        title: "تسوّقي بذكاء",
        subtitle: "تجارب حقيقية",
        desc: "اكتشفي حقيقة المنتجات قبل شرائها من خلال 'تحليل وثيق' وتقييمات المجتمع، وساعدي غيرك بمشاركة رأيك.",
        icon: "star",
        color: COLORS.accentGreen,
        bgGradient: ['#1A2D27', '#064E3B']
    },
    {
        id: 'journey',
        title: "نتائج، لا وعود",
        subtitle: "رحلة البشرة",
        desc: "تصفحي صور 'قبل وبعد' لتستلهمي الحلول الواقعية، أو وثّقي رحلتك الخاصة لتتابعي تقدمك.",
        icon: "hourglass-half",
        color: COLORS.gold,
        bgGradient: ['#1A2D27', '#451a03']
    },
    {
        id: 'qa_routine',
        title: "حسّني روتينك",
        subtitle: "استشارات وتقييم",
        desc: "هل ترتيب منتجاتك صحيح؟ اعرضي روتينك الحالي ليقوم الخبراء والذكاء الاصطناعي بتحسينه لكِ.",
        icon: "clipboard-check",
        color: COLORS.purple,
        bgGradient: ['#1A2D27', '#2e1065']
    }
];

// --- 2. COMPONENTS ---

const AnimatedBackground = ({ scrollX }) => {
    return (
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
                            start={{x: 0, y: 0}} end={{x: 0, y: 1}}
                        />
                    </Animated.View>
                );
            })}
        </View>
    );
};

// Continuous Smooth Gesture Animation
const SwipeHint = () => {
    const translateX = useRef(new Animated.Value(20)).current; // Start right
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = Animated.loop(
            Animated.sequence([
                // Fade In & Move Left (Simulate Swipe)
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
                    Animated.timing(translateX, { toValue: -20, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true })
                ]),
                // Fade Out & Continue Left slightly
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0, duration: 600, useNativeDriver: true }),
                    Animated.timing(translateX, { toValue: -40, duration: 600, useNativeDriver: true })
                ]),
                // Reset instantly
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
                    Animated.timing(translateX, { toValue: 20, duration: 0, useNativeDriver: true }) 
                ])
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
            <Text style={styles.swipeText}>اسحب للتالي</Text>
        </View>
    );
};

// --- 3. MAIN COMPONENT ---
const CommunityIntro = ({ visible, onClose }) => {
    const scrollX = useRef(new Animated.Value(0)).current;
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(true); // Default to hiding it in the future

    // Orbit Animation
    const rotateAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateAnim, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })
        ).start();
    }, []);

    const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const reverseSpin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

    const handleFinish = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (dontShowAgain) {
            await AsyncStorage.setItem('has_seen_community_intro', 'true');
        }
        onClose();
    };

    const renderItem = ({ item, index }) => {
        // Parallax effect for content inside the slide
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        
        const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.8, 1, 0.8],
            extrapolate: 'clamp'
        });
        
        const translateX = scrollX.interpolate({
            inputRange,
            outputRange: [width * 0.3, 0, -width * 0.3], // Subtle parallax
            extrapolate: 'clamp'
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp'
        });

        return (
            <View style={{ width, alignItems: 'center', paddingHorizontal: 30 }}>
                {/* Central Visual */}
                <View style={styles.visualContainer}>
                    {/* Orbit Rings */}
                    <Animated.View style={[styles.orbitRing, { borderColor: 'rgba(255,255,255,0.08)', transform: [{ rotate: spin }, { scale }] }]}>
                        <View style={[styles.orbitDot, { top: -4, backgroundColor: item.color }]} />
                        <View style={[styles.orbitDot, { bottom: -4, backgroundColor: item.color }]} />
                    </Animated.View>
                    <Animated.View style={[styles.orbitRing, { width: 200, height: 200, borderRadius: 100, borderColor: 'rgba(255,255,255,0.15)', transform: [{ rotate: reverseSpin }, { scale }] }]}>
                            <View style={[styles.orbitDot, { left: -4, backgroundColor: item.color }]} />
                    </Animated.View>

                    {/* Icon */}
                    <Animated.View style={[styles.iconCore, { backgroundColor: item.color + '20', borderColor: item.color, transform: [{ scale }] }]}>
                        <FontAwesome5 name={item.icon} size={50} color={item.color} />
                    </Animated.View>
                </View>

                {/* Text Content */}
                <Animated.View style={[styles.textWrapper, { transform: [{ translateX }], opacity }]}>
                    <View style={[styles.subtitleBadge, { borderColor: item.color + '50', backgroundColor: item.color + '10' }]}>
                        <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle}</Text>
                    </View>
                    
                    <Text style={styles.title}>{item.title}</Text>
                    <View style={styles.divider} />
                    <Text style={styles.desc}>{item.desc}</Text>
                </Animated.View>
            </View>
        );
    };

    // Calculate opacity for the "Join" button based on scrolling to the last slide
    const lastIndex = SLIDES.length - 1;
    const buttonOpacity = scrollX.interpolate({
        inputRange: [(lastIndex - 1) * width, lastIndex * width],
        outputRange: [0, 1],
        extrapolate: 'clamp'
    });
    
    // Invert opacity for the hint
    const hintOpacity = scrollX.interpolate({
        inputRange: [(lastIndex - 1) * width, lastIndex * width],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });
    
    // Translate the button up as it fades in
    const buttonTranslateY = scrollX.interpolate({
        inputRange: [(lastIndex - 1) * width, lastIndex * width],
        outputRange: [20, 0],
        extrapolate: 'clamp'
    });

    if (!visible) return null;

    return (
        <Modal 
            visible={true} 
            transparent={true} 
            animationType="fade" 
            statusBarTranslucent={true} // Allows content to draw under status bar
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <StatusBar 
                    barStyle="light-content" 
                    backgroundColor="rgba(0,0,0,0)" // Force absolute transparency
                    translucent={true} 
                />
                
                {/* Background */}
                <AnimatedBackground scrollX={scrollX} />
                
                <SafeAreaView style={{flex: 1}}>
                    {/* Header Skip */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
                            <Text style={styles.skipText}>تخطي</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Slides */}
                    <Animated.FlatList
                        horizontal
                        pagingEnabled
                        data={SLIDES}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        showsHorizontalScrollIndicator={false}
                        bounces={false} // Prevents overscroll feel
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                            { useNativeDriver: true }
                        )}
                        onMomentumScrollEnd={(ev) => {
                            const newIndex = Math.round(ev.nativeEvent.contentOffset.x / width);
                            setCurrentIndex(newIndex);
                        }}
                        scrollEventThrottle={16}
                        style={{ flex: 1 }}
                    />

                    {/* Footer */}
                    <View style={styles.footer}>
                        
                        {/* Pagination Dots (Fixed Width Error) */}
                        <View style={styles.pagination}>
                            {SLIDES.map((_, index) => {
                                const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                                
                                // ✅ FIX: Use scaleX instead of width for Native Driver compatibility
                                const dotScale = scrollX.interpolate({
                                    inputRange,
                                    outputRange: [1, 2.5, 1], // Expands the dot
                                    extrapolate: 'clamp'
                                });
                                
                                const dotOpacity = scrollX.interpolate({
                                    inputRange,
                                    outputRange: [0.3, 1, 0.3],
                                    extrapolate: 'clamp'
                                });
                                
                                return (
                                    <Animated.View 
                                        key={index} 
                                        style={[
                                            styles.dot, 
                                            { opacity: dotOpacity, transform: [{ scaleX: dotScale }] }
                                        ]} 
                                    />
                                );
                            })}
                        </View>

                        {/* Action Area: Cross-Fade between Hint and Button */}
                        <View style={styles.actionArea}>
                            
                            {/* 1. Swipe Hint (Fades Out) */}
                            <Animated.View style={[styles.absoluteCenter, { opacity: hintOpacity }]}>
                                <SwipeHint />
                            </Animated.View>

                            {/* 2. Start Button (Fades In) */}
                            <Animated.View style={[
                                styles.absoluteCenter, 
                                { 
                                    opacity: buttonOpacity,
                                    transform: [{ translateY: buttonTranslateY }]
                                }
                            ]} pointerEvents={currentIndex === lastIndex ? 'auto' : 'none'}>
                                <TouchableOpacity 
                                    style={styles.startBtn} 
                                    onPress={handleFinish}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient
                                        colors={['#FFF', '#E2E8F0']}
                                        style={styles.startBtnGradient}
                                    >
                                        <Text style={styles.startBtnText}>انضمي للمجتمع</Text>
                                        <Ionicons name="checkmark-circle" size={24} color={COLORS.background} />
                                    </LinearGradient>
                                </TouchableOpacity>
                                {/* Don't Show Again Toggle */}
                                <TouchableOpacity 
                                    style={styles.dontShowContainer} 
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setDontShowAgain(!dontShowAgain);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons 
                                        name={dontShowAgain ? "checkbox-marked" : "checkbox-blank-outline"} 
                                        size={20} 
                                        color="rgba(255,255,255,0.5)" 
                                    />
                                    <Text style={styles.dontShowText}>عدم العرض مرة أخرى</Text>
                                </TouchableOpacity>
                            </Animated.View>

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
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        padding: 20,
    },
    skipBtn: {
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    skipText: {
        fontFamily: 'Tajawal-Bold',
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
    },
    
    // VISUAL
    visualContainer: {
        height: height * 0.4,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
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
        width: 8,
        height: 8,
        borderRadius: 4,
        shadowColor: "#FFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    iconCore: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        elevation: 20,
    },

    // TEXT
    textWrapper: {
        alignItems: 'center',
        height: height * 0.3,
        justifyContent: 'flex-start',
    },
    subtitleBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    subtitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    title: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 30,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 15,
        lineHeight: 40
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
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'center',
        lineHeight: 26,
    },

    // FOOTER
    footer: {
        height: height * 0.22,
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
        height: 8,
        width: 8, // Base width
        borderRadius: 4,
        backgroundColor: '#FFF',
    },
    actionArea: {
        height: 60,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    absoluteCenter: {
        position: 'absolute',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    // Swipe Hint
    swipeHintContainer: {
        alignItems: 'center',
        gap: 5,
    },
    swipeText: {
        fontFamily: 'Tajawal-Regular',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
    },

    // Start Button
    startBtn: {
        borderRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    startBtnGradient: {
        flexDirection: 'row-reverse',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        alignItems: 'center',
        gap: 12,
    },
    startBtnText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        color: COLORS.background
    },
    dontShowContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginTop: 15,
        gap: 8,
        padding: 5
    },
    dontShowText: {
        fontFamily: 'Tajawal-Regular',
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
    }
});

export default CommunityIntro;