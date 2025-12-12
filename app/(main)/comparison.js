import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet, View, Text, Dimensions,
    ScrollView, Animated, Platform, Alert,
    UIManager, LayoutAnimation, Pressable, Image, Easing, StatusBar,
    BackHandler, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// --- Analysis helpers imports (Assuming these exist as per previous file) ---
import {
    createGenerativePartFromUri,
    processWithGemini,
    extractIngredientsFromText,
    evaluateMarketingClaims,
    analyzeIngredientInteractions,
    calculateReliabilityScore_V13,
    getClaimsByProductType,
} from './analysisHelpers';

// ============================================================================
//                       SYSTEM CONFIG & THEME
// ============================================================================

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

// --- UNIFIED THEME (MATCHING PROFILE.JS) ---
const COLORS = {
  background: '#1A2D27', 
  card: '#253D34',      
  border: 'rgba(90, 156, 132, 0.25)', 

  accentGreen: '#5A9C84', 
  accentGlow: 'rgba(90, 156, 132, 0.4)', 
  
  textPrimary: '#F1F3F2',   
  textSecondary: '#A3B1AC', 
  textOnAccent: '#1A2D27',  
  
  danger: '#ef4444', 
  warning: '#f59e0b', 
  info: '#3b82f6', 
  success: '#22c55e',
  gold: '#fbbf24',
  primaryGlow: 'rgba(90, 156, 132, 0.15)'
};

const INSTRUCTIONS = {
    0: "مرحباً بك في ساحة المقارنة العلمية",
    1: "قم بتصوير قائمة المكونات الخلفية لكل منتج",
    2: "يقوم الذكاء الاصطناعي بتحليل الروابط الكيميائية",
    3: "حدد نوع المنتجات لضبط معايير الفحص",
    4: "اختر ما يهمك (يمكنك اختيار أكثر من معيار)",
    5: "تصفح النتائج عبر التبويبات أعلاه"
};

// ============================================================================
//                       SHARED UI COMPONENTS
// ============================================================================

// 1. FLOATING SPORES (Background Animation)
const Spore = ({ size, startX, duration, delay }) => {
  const animY = useRef(new Animated.Value(0)).current; 
  const animX = useRef(new Animated.Value(0)).current; 
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(Animated.timing(animY, { toValue: 1, duration, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }));
    const driftLoop = Animated.loop(Animated.sequence([ Animated.timing(animX, { toValue: 1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin }), Animated.timing(animX, { toValue: -1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin }), Animated.timing(animX, { toValue: 0, duration: duration * 0.3, useNativeDriver: true, easing: Easing.sin }), ]));
    const opacityPulse = Animated.loop(Animated.sequence([ Animated.timing(opacity, { toValue: 0.6, duration: duration * 0.2, useNativeDriver: true }), Animated.delay(duration * 0.6), Animated.timing(opacity, { toValue: 0.2, duration: duration * 0.2, useNativeDriver: true }), ]));
    const scaleIn = Animated.spring(scale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true, delay });
    const timeout = setTimeout(() => { scaleIn.start(); floatLoop.start(); driftLoop.start(); opacityPulse.start(); }, delay);
    return () => { clearTimeout(timeout); floatLoop.stop(); driftLoop.stop(); opacityPulse.stop(); };
  }, []);

  const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [height + 100, -100] });
  const translateX = animX.interpolate({ inputRange: [-1, 1], outputRange: [-35, 35] });

  return ( <Animated.View style={{ position: 'absolute', zIndex: -1, width: size, height: size, borderRadius: size/2, backgroundColor: COLORS.primaryGlow, transform: [{ translateY }, { translateX }, { scale }], opacity }} /> );
};

// 2. PRESSABLE SCALE (Tactile Buttons)
const PressableScale = ({ onPress, children, style, disabled, activeScale = 0.96 }) => {
    const scale = useRef(new Animated.Value(1)).current; 
    const pressIn = () => !disabled && Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
    const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
    return (
        <Pressable onPress={() => { if(onPress && !disabled) { Haptics.selectionAsync(); onPress(); } }} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled} style={style}>
            <Animated.View style={[{ transform: [{ scale }] }, style?.flex && {flex: style.flex}]}>{children}</Animated.View>
        </Pressable>
    );
};

// 3. CONTENT CARD (Standard Container)
const ContentCard = ({ children, style, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  
  useEffect(() => { 
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 40, delay, useNativeDriver: true })
      ]).start(); 
  }, []);

  return (
    <Animated.View style={[styles.cardBase, { opacity, transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  );
};

// 4. INSTRUCTION BUBBLE (Styled like InsightPill)
const InstructionBubble = ({ step }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        fadeAnim.setValue(0);
        translateY.setValue(20);
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, friction: 6, useNativeDriver: true })
        ]).start();
    }, [step]);

    return (
        <Animated.View style={[styles.instructionBubble, { opacity: fadeAnim, transform: [{ translateY }] }]}>
            <View style={styles.instructionIcon}>
                <FontAwesome5 name="lightbulb" size={14} color={COLORS.gold} solid />
            </View>
            <Text style={styles.instructionText}>{INSTRUCTIONS[step]}</Text>
        </Animated.View>
    );
};

// 5. SCORE RING (Consistent with Profile)
const ScoreRing = ({ score, size = 60, strokeWidth = 5 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = circumference - (score / 100) * circumference;
    const color = score >= 80 ? COLORS.success : score >= 65 ? COLORS.warning : COLORS.danger;

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} style={{transform: [{ rotate: '-90deg' }]}}>
                <Circle cx={size/2} cy={size/2} r={radius} stroke={COLORS.border} strokeWidth={strokeWidth} fill="none" />
                <Circle
                    stroke={color}
                    cx={size/2}
                    cy={size/2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={progress}
                    strokeLinecap="round"
                    fill="none"
                />
            </Svg>
            <Text style={[styles.ringText, { fontSize: size * 0.28, color: color }]}>{Math.round(score)}%</Text>
        </View>
    );
};

// ============================================================================
//                       STEPS COMPONENTS
// ============================================================================

const IntroStep = ({ onStart }) => (
    <View style={styles.centerContent}>
        <View style={styles.introHero}>
            <LinearGradient colors={[COLORS.card, COLORS.background]} style={styles.iconCircle}>
                <MaterialCommunityIcons name="scale-balance" size={60} color={COLORS.accentGreen} />
            </LinearGradient>
            <Text style={styles.titleLarge}>المقارنة الشاملة</Text>
            <Text style={styles.subtitle}>تحليل علمي دقيق يكشف حقيقة المنتجات</Text>
        </View>
        <PressableScale onPress={onStart} style={styles.btnPrimary}>
            <Text style={styles.btnTextPrimary}>بدء المقارنة الجديدة</Text>
            <FontAwesome5 name="arrow-left" color={COLORS.textOnAccent} size={16} />
        </PressableScale>
    </View>
);

const InputStep = ({ left, setLeft, right, setRight }) => {
    const pickImage = async (setter) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
            });
            if (!result.canceled) {
                setter({ sourceData: result.assets[0].uri, sourceType: 'ocr' });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) {
            Alert.alert("خطأ", "لا يمكن الوصول للصور");
        }
    };

    const ProductSlot = ({ data, setter, label }) => (
        <PressableScale 
            style={[styles.slotCard, data.sourceData && styles.slotCardFilled]} 
            onPress={() => !data.sourceData && pickImage(setter)}
            activeScale={0.98}
        >
            {data.sourceData ? (
                <>
                    <Image source={{ uri: data.sourceData }} style={styles.slotImage} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                    <Pressable style={styles.removeBtn} onPress={() => setter({ sourceData: null, sourceType: null })}>
                        <FontAwesome5 name="times" color="#FFF" size={12} />
                    </Pressable>
                    <View style={styles.checkBadge}>
                        <FontAwesome5 name="check" color={COLORS.textOnAccent} size={10} />
                    </View>
                </>
            ) : (
                <View style={styles.slotPlaceholder}>
                    <View style={styles.dashedCircle}>
                        <FontAwesome5 name="camera" size={24} color={COLORS.accentGreen} />
                    </View>
                    <Text style={styles.slotLabel}>{label}</Text>
                    <Text style={styles.slotSub}>اضغط للإضافة</Text>
                </View>
            )}
        </PressableScale>
    );

    return (
        <View style={styles.stepContainer}>
            <Text style={styles.headerTitle}>أطراف التحدي</Text>
            <View style={styles.arenaContainer}>
                <ProductSlot data={left} setter={setLeft} label="المنتج (أ)" />
                <View style={styles.vsBadge}>
                    <Text style={styles.vsText}>VS</Text>
                </View>
                <ProductSlot data={right} setter={setRight} label="المنتج (ب)" />
            </View>
        </View>
    );
};

const LoadingStep = ({ text }) => (
    <View style={styles.centerContent}>
        <View style={styles.loaderRingOuter}>
            <ActivityIndicator size="large" color={COLORS.accentGreen} />
        </View>
        <Text style={styles.loadingText}>{text}</Text>
        <Text style={styles.loadingSub}>يرجى الانتظار، العمليات الكيميائية قيد التحليل</Text>
    </View>
);

const TypeSelectionStep = ({ current, onSelect }) => {
    const types = [
        { id: 'shampoo', label: 'شامبو / غسول شعر', icon: 'spray-can' },
        { id: 'serum', label: 'سيروم علاجي', icon: 'prescription-bottle' },
        { id: 'lotion_cream', label: 'كريم / مرطب', icon: 'pump-soap' },
        { id: 'sunscreen', label: 'واقي شمس', icon: 'sun' },
        { id: 'cleanser', label: 'غسول وجه', icon: 'water' },
        { id: 'other', label: 'منتج آخر', icon: 'box-open' },
    ];

    return (
        <View style={styles.stepContainer}>
            <Text style={styles.headerTitle}>تصنيف المنتجات</Text>
            <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
                {types.map((t) => (
                    <PressableScale
                        key={t.id}
                        style={[styles.typeCard, current === t.id && styles.typeCardActive]}
                        onPress={() => onSelect(t.id)}
                    >
                        <FontAwesome5 
                            name={t.icon} 
                            size={24} 
                            color={current === t.id ? COLORS.textOnAccent : COLORS.textSecondary} 
                            style={{ marginBottom: 10 }}
                        />
                        <Text style={[styles.typeText, current === t.id && styles.typeTextActive]}>{t.label}</Text>
                    </PressableScale>
                ))}
            </ScrollView>
        </View>
    );
};

const ClaimsSelectionStep = ({ claims, selected, onToggle, onFinish }) => {
    return (
        <View style={styles.stepContainer}>
            <Text style={styles.headerTitle}>ما هي أهدافك؟</Text>
            <Text style={styles.headerSub}>سنركز التحليل بناءً على اختياراتك</Text>
            
            <ScrollView contentContainerStyle={styles.chipsContainer} showsVerticalScrollIndicator={false}>
                {claims.map((claim) => {
                    const isActive = selected.includes(claim);
                    return (
                        <PressableScale
                            key={claim}
                            onPress={() => onToggle(claim)}
                            style={[styles.chip, isActive && styles.chipActive]}
                        >
                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{claim}</Text>
                            {isActive && <FontAwesome5 name="check" size={12} color={COLORS.textOnAccent} style={{ marginLeft: 6 }} />}
                        </PressableScale>
                    );
                })}
            </ScrollView>

            <PressableScale onPress={onFinish} disabled={selected.length === 0} style={[styles.btnPrimary, { marginTop: 20 }]}>
                <Text style={styles.btnTextPrimary}>إظهار النتائج</Text>
                <FontAwesome5 name="chart-pie" color={COLORS.textOnAccent} size={16} />
            </PressableScale>
        </View>
    );
};

// --- RESULT SUB-COMPONENTS ---

const ResultHeader = ({ left, right, winner }) => (
    <View style={styles.resultHeader}>
        <View style={[styles.winnerBadgeContainer, { opacity: winner === 'tie' ? 0 : 1 }]}>
            <LinearGradient colors={[COLORS.gold, '#FCD34D']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.winnerBadge}>
                <FontAwesome5 name="trophy" size={12} color={COLORS.textOnAccent} />
                <Text style={styles.winnerText}>
                    {winner === 'left' ? 'المنتج (أ) يتفوق' : 'المنتج (ب) يتفوق'}
                </Text>
            </LinearGradient>
        </View>

        <View style={styles.headToHead}>
            {/* Left Product */}
            <View style={[styles.productCol, winner === 'left' && styles.productColWinner]}>
                <Image source={{ uri: left.sourceData }} style={styles.resImg} />
                <Text style={styles.resName} numberOfLines={1}>المنتج (أ)</Text>
                <ScoreRing score={left.analysisData.oilGuardScore} />
            </View>

            {/* VS Divider Stats */}
            <View style={styles.centerStats}>
                <View style={styles.statLine}>
                    <Text style={styles.statLabel}>أمان</Text>
                    <View style={styles.barContainer}>
                         <View style={[styles.barFill, { width: `${left.analysisData.safety.score}%`, backgroundColor: left.analysisData.safety.score > right.analysisData.safety.score ? COLORS.accentGreen : COLORS.border }]} />
                         <View style={[styles.barFill, { width: `${right.analysisData.safety.score}%`, backgroundColor: right.analysisData.safety.score > left.analysisData.safety.score ? COLORS.accentGreen : COLORS.border }]} />
                    </View>
                </View>
                <View style={styles.statLine}>
                    <Text style={styles.statLabel}>فعالية</Text>
                    <View style={styles.barContainer}>
                         <View style={[styles.barFill, { width: `${left.analysisData.efficacy.score}%`, backgroundColor: left.analysisData.efficacy.score > right.analysisData.efficacy.score ? COLORS.info : COLORS.border }]} />
                         <View style={[styles.barFill, { width: `${right.analysisData.efficacy.score}%`, backgroundColor: right.analysisData.efficacy.score > left.analysisData.efficacy.score ? COLORS.info : COLORS.border }]} />
                    </View>
                </View>
            </View>

            {/* Right Product */}
            <View style={[styles.productCol, winner === 'right' && styles.productColWinner]}>
                <Image source={{ uri: right.sourceData }} style={styles.resImg} />
                <Text style={styles.resName} numberOfLines={1}>المنتج (ب)</Text>
                <ScoreRing score={right.analysisData.oilGuardScore} />
            </View>
        </View>
    </View>
);

const TabButton = ({ title, active, onPress }) => (
    <PressableScale onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
    </PressableScale>
);

const BreakdownList = ({ data, type }) => {
    if (!data || data.length === 0) return <Text style={styles.emptyText}>لا توجد ملاحظات.</Text>;
    return (
        <View>
            {data.map((item, idx) => (
                <View key={idx} style={[styles.breakdownItem, { borderRightColor: item.type === 'deduction' ? COLORS.danger : item.type === 'info' ? COLORS.info : COLORS.warning }]}>
                    <View style={{flex:1}}>
                        <Text style={styles.bdText}>{item.text}</Text>
                    </View>
                    <Text style={[styles.bdValue, { color: item.type === 'deduction' ? COLORS.danger : COLORS.info }]}>{item.value}</Text>
                </View>
            ))}
        </View>
    )
}

const ResultsStep = ({ left, right, onReset }) => {
    const [tab, setTab] = useState('overview');
    
    const winner = useMemo(() => {
        const s1 = left.analysisData.oilGuardScore;
        const s2 = right.analysisData.oilGuardScore;
        if (Math.abs(s1 - s2) < 5) return 'tie';
        return s1 > s2 ? 'left' : 'right';
    }, [left, right]);

    const renderTabContent = () => {
        switch(tab) {
            case 'overview':
                return (
                    <View style={styles.tabContent}>
                         <ContentCard>
                            <Text style={styles.cardTitle}>الحكم النهائي</Text>
                            <Text style={[styles.verdictText, { color: COLORS.accentGreen }]}>
                                {winner === 'left' ? left.analysisData.finalVerdict : right.analysisData.finalVerdict}
                            </Text>
                            {winner !== 'tie' && (
                                <Text style={styles.verdictSub}>
                                    تفوق {winner === 'left' ? 'المنتج الأول' : 'المنتج الثاني'} بفضل {winner === 'left' ? (left.analysisData.safety.score > right.analysisData.safety.score ? 'تركيبة أكثر أماناً' : 'فعالية أعلى') : (right.analysisData.safety.score > left.analysisData.safety.score ? 'تركيبة أكثر أماناً' : 'فعالية أعلى')}.
                                </Text>
                            )}
                        </ContentCard>
                        
                        <ContentCard style={{marginTop: 15}}>
                            <Text style={styles.cardTitle}>أبرز الإيجابيات</Text>
                            <View style={styles.row}>
                                <View style={{flex:1}}>
                                    <Text style={styles.colHeader}>المنتج (أ)</Text>
                                    {left.analysisData.scoreBreakdown.filter(x => x.type === 'info').slice(0,3).map((x,i) => (
                                        <Text key={i} style={styles.bulletPoint}>• {x.text.split(':')[0]}</Text>
                                    ))}
                                </View>
                                <View style={{flex:1}}>
                                    <Text style={styles.colHeader}>المنتج (ب)</Text>
                                    {right.analysisData.scoreBreakdown.filter(x => x.type === 'info').slice(0,3).map((x,i) => (
                                        <Text key={i} style={styles.bulletPoint}>• {x.text.split(':')[0]}</Text>
                                    ))}
                                </View>
                            </View>
                        </ContentCard>
                    </View>
                );
            case 'safety':
                return (
                    <View style={styles.tabContent}>
                        <ContentCard>
                             <Text style={styles.cardTitle}>تحليل المخاطر (المنتج أ)</Text>
                             <BreakdownList data={left.analysisData.scoreBreakdown.filter(x => x.type === 'deduction' || x.type === 'warning')} />
                        </ContentCard>
                        <ContentCard style={{marginTop: 15}}>
                             <Text style={styles.cardTitle}>تحليل المخاطر (المنتج ب)</Text>
                             <BreakdownList data={right.analysisData.scoreBreakdown.filter(x => x.type === 'deduction' || x.type === 'warning')} />
                        </ContentCard>
                    </View>
                );
            case 'marketing':
                 return (
                    <View style={styles.tabContent}>
                        <ContentCard>
                             <Text style={styles.cardTitle}>مصداقية الادعاءات</Text>
                             {left.analysisData.marketing_results?.map((m, i) => (
                                 <View key={i} style={styles.marketingItem}>
                                     <Text style={styles.mClaim}>"{m.claim}" في المنتج (أ)</Text>
                                     <Text style={[styles.mStatus, { color: m.status.includes('✅') ? COLORS.success : COLORS.gold }]}>{m.status}</Text>
                                     <Text style={styles.mExp}>{m.explanation}</Text>
                                 </View>
                             ))}
                             <View style={styles.divider} />
                             {right.analysisData.marketing_results?.map((m, i) => (
                                 <View key={i} style={styles.marketingItem}>
                                     <Text style={styles.mClaim}>"{m.claim}" في المنتج (ب)</Text>
                                     <Text style={[styles.mStatus, { color: m.status.includes('✅') ? COLORS.success : COLORS.gold }]}>{m.status}</Text>
                                     <Text style={styles.mExp}>{m.explanation}</Text>
                                 </View>
                             ))}
                        </ContentCard>
                    </View>
                 );
        }
    }

    return (
        <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
             <ResultHeader left={left} right={right} winner={winner} />
             
             <View style={styles.tabsContainer}>
                 <TabButton title="نظرة عامة" active={tab==='overview'} onPress={() => setTab('overview')} />
                 <TabButton title="الأمان" active={tab==='safety'} onPress={() => setTab('safety')} />
                 <TabButton title="التسويق" active={tab==='marketing'} onPress={() => setTab('marketing')} />
             </View>

             {renderTabContent()}

             <PressableScale onPress={onReset} style={[styles.btnSecondary, { marginTop: 30 }]}>
                 <Text style={styles.btnTextSecondary}>مقارنة جديدة</Text>
                 <FontAwesome5 name="redo" color={COLORS.textSecondary} size={14} />
             </PressableScale>
        </ScrollView>
    );
};


// ============================================================================
//                       MAIN PAGE LOGIC
// ============================================================================

export default function ComparisonPage() {
    const [step, setStep] = useState(0);
    const [left, setLeft] = useState({ sourceData: null, sourceType: null });
    const [right, setRight] = useState({ sourceData: null, sourceType: null });
    const [productType, setProductType] = useState(null);
    const [claims, setClaims] = useState([]);
    const [loadingText, setLoadingText] = useState('');
    const insets = useSafeAreaInsets();

    // Particles
    const particles = useMemo(() => [...Array(15)].map((_, i) => ({ 
        id: i, size: Math.random()*5+3, startX: Math.random()*width, duration: 8000+Math.random()*7000, delay: Math.random()*5000 
    })), []);
    
    // Back handler
    useEffect(() => {
        const backAction = () => {
            if (step > 0) {
                if (step === 5) {
                    setLeft({ sourceData: null, sourceType: null });
                    setRight({ sourceData: null, sourceType: null });
                    setStep(0);
                } else {
                    setStep(0);
                }
                return true;
            }
            return false;
        };
        const bh = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => bh.remove();
    }, [step]);

    useEffect(() => {
        if (step === 1 && left.sourceData && right.sourceData) {
            handleStartAnalysis();
        }
    }, [step, left.sourceData, right.sourceData]);

    const transitionTo = (nextStep) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStep(nextStep);
    };

    const handleStartAnalysis = async () => {
        if (step !== 1) return; 

        transitionTo(2);
        
        try {
            // 1. Analyze Left
            setLoadingText('جاري تحليل المنتج الأول...');
            const leftUri = await createGenerativePartFromUri(left.sourceData);
            const leftRaw = await processWithGemini(leftUri);
            const leftIng = await extractIngredientsFromText(leftRaw.ingredientsText);
            setLeft(prev => ({ ...prev, detected_ingredients: leftIng.ingredients, detectedType: leftRaw.productType }));

            // 2. Analyze Right
            setLoadingText('جاري تحليل المنتج الثاني...');
            const rightUri = await createGenerativePartFromUri(right.sourceData);
            const rightRaw = await processWithGemini(rightUri);
            const rightIng = await extractIngredientsFromText(rightRaw.ingredientsText);
            setRight(prev => ({ ...prev, detected_ingredients: rightIng.ingredients }));

            // 3. Auto-detect type
            const likelyType = (leftRaw.productType && leftRaw.productType !== 'other') 
                ? leftRaw.productType 
                : (rightRaw.productType || 'other');
            
            setProductType(likelyType);

            transitionTo(3);
        } catch (error) {
            console.error(error);
            Alert.alert("خطأ في التحليل", "تأكد من وضوح صور المكونات.");
            transitionTo(1);
        }
    };

    const handleFinalCalculation = () => {
        transitionTo(2);
        setLoadingText('حساب النتائج النهائية...');

        setTimeout(() => {
            try {
                const process = (p) => {
                    if (!p.detected_ingredients) return p;
                    
                    const marketing = evaluateMarketingClaims(p.detected_ingredients, claims, productType);
                    const interactions = analyzeIngredientInteractions(p.detected_ingredients, {});
                    const score = calculateReliabilityScore_V13(p.detected_ingredients, interactions.conflicts, interactions.userAlerts, marketing, productType);
                    
                    return { 
                        ...p, 
                        analysisData: { ...score, marketing_results: marketing } 
                    };
                };

                const processedLeft = process(left);
                const processedRight = process(right);

                setLeft(processedLeft);
                setRight(processedRight);
                
                transitionTo(5);
            } catch (e) {
                console.error(e);
                Alert.alert("خطأ", "حدث خطأ أثناء معالجة النتائج.");
                transitionTo(1);
            }
        }, 500);
    };

    const resetAll = () => {
        setLeft({ sourceData: null, sourceType: null });
        setRight({ sourceData: null, sourceType: null });
        setProductType(null);
        setClaims([]);
        transitionTo(0);
    };

    const renderContent = () => {
        switch(step) {
            case 0: return <IntroStep onStart={() => transitionTo(1)} />;
            case 1: return <InputStep left={left} setLeft={setLeft} right={right} setRight={setRight} />;
            case 2: return <LoadingStep text={loadingText} />;
            case 3: return <TypeSelectionStep current={productType} onSelect={(t) => { setProductType(t); transitionTo(4); }} />;
            case 4: 
                const availableClaims = getClaimsByProductType(productType);
                return <ClaimsSelectionStep 
                    claims={availableClaims} 
                    selected={claims} 
                    onToggle={(c) => setClaims(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev, c])} 
                    onFinish={handleFinalCalculation} 
                />;
            case 5: return <ResultsStep left={left} right={right} onReset={resetAll} />;
            default: return <IntroStep onStart={() => transitionTo(1)} />;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            
            {/* Particles Background */}
            {particles.map((p) => <Spore key={p.id} {...p} />)}
            
            <View style={[
                styles.contentArea, 
                { paddingTop: insets.top + 20, paddingBottom: insets.bottom } 
            ]}>
                {renderContent()}
            </View>

            {/* Instruction bubble */}
            <View style={{ marginBottom: insets.bottom + 20 }}>
                <InstructionBubble step={step} />
            </View>
        </View>
    );
}

// ============================================================================
//                       STYLES (Using COLORS Theme)
// ============================================================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    contentArea: { flex: 1, paddingHorizontal: 20 },
    
    // Intro
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    introHero: { alignItems: 'center', marginBottom: 40 },
    iconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
    titleLarge: { fontFamily: 'Tajawal-ExtraBold', fontSize: 28, color: COLORS.textPrimary, textAlign: 'center' },
    subtitle: { fontFamily: 'Tajawal-Regular', fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10 },
    
    // Inputs
    headerTitle: { fontFamily: 'Tajawal-Bold', fontSize: 22, color: COLORS.textPrimary, marginBottom: 5, textAlign: 'right' },
    headerSub: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, textAlign: 'right' },
    arenaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 200, marginTop: 40 },
    slotCard: { width: '42%', height: '100%', borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    slotCardFilled: { borderColor: COLORS.accentGreen, borderWidth: 2 },
    slotImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    slotPlaceholder: { alignItems: 'center', gap: 10, padding: 10 },
    dashedCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
    slotLabel: { fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, fontSize: 14 },
    slotSub: { fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 10 },
    removeBtn: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    checkBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: COLORS.accentGreen, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    vsBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.gold },
    vsText: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.gold, fontSize: 14 },

    // Loading
    loaderRingOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    loadingText: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: COLORS.textPrimary },
    loadingSub: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },

    // Types
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 100 },
    typeCard: { width: '48%', aspectRatio: 1.4, backgroundColor: COLORS.card, borderRadius: 20, marginBottom: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    typeCardActive: { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen },
    typeText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary },
    typeTextActive: { color: COLORS.textOnAccent },

    // Claims
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, paddingVertical: 20 },
    chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row-reverse', alignItems: 'center' },
    chipActive: { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen },
    chipText: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary },
    chipTextActive: { fontFamily: 'Tajawal-Bold', color: COLORS.textOnAccent },

    // Results
    resultHeader: { marginTop: 10, marginBottom: 20 },
    winnerBadgeContainer: { alignItems: 'center', marginBottom: 15, height: 24 },
    winnerBadge: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, gap: 6 },
    winnerText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textOnAccent },
    headToHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    productCol: { width: '32%', alignItems: 'center', gap: 8 },
    productColWinner: { transform: [{ scale: 1.05 }] },
    resImg: { width: 60, height: 60, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    resName: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textPrimary, textAlign: 'center' },
    ringText: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.textPrimary },
    
    centerStats: { flex: 1, paddingHorizontal: 8, justifyContent: 'center', gap: 15, paddingTop: 20 },
    statLine: { width: '100%', gap: 4 },
    statLabel: { textAlign: 'center', fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.textSecondary },
    barContainer: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: COLORS.background, gap: 2 },
    barFill: { height: '100%', borderRadius: 3 },

    tabsContainer: { flexDirection: 'row-reverse', backgroundColor: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 20 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabBtnActive: { backgroundColor: COLORS.accentGreen },
    tabText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary },
    tabTextActive: { fontFamily: 'Tajawal-Bold', color: COLORS.textOnAccent },

    tabContent: { minHeight: 300 },
    // Replaced generic card with ContentCard usage, but these helpers remain for internal layout
    cardTitle: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, marginBottom: 12, textAlign: 'right' },
    verdictText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18, color: COLORS.accentGreen, textAlign: 'right', marginBottom: 8 },
    verdictSub: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 20 },
    
    row: { flexDirection: 'row-reverse', gap: 10 },
    colHeader: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.gold, marginBottom: 8, textAlign: 'right' },
    bulletPoint: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textPrimary, marginBottom: 4, textAlign: 'right' },
    
    breakdownItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 8, borderRightWidth: 3, paddingRight: 10, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4 },
    bdText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' },
    bdValue: { fontFamily: 'Tajawal-Bold', fontSize: 12, marginLeft: 10 },
    
    marketingItem: { marginBottom: 12 },
    mClaim: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textPrimary, textAlign: 'right' },
    mStatus: { fontFamily: 'Tajawal-Bold', fontSize: 12, textAlign: 'right', marginVertical: 2 },
    mExp: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textSecondary, textAlign: 'right' },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
    emptyText: { fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, textAlign: 'center' },

    // Buttons
    btnPrimary: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.accentGreen, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, width: '100%', elevation: 4, justifyContent: 'center', alignItems: 'center' },
    btnTextPrimary: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textOnAccent },
    
    btnSecondary: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, width: '100%', justifyContent: 'center', alignItems: 'center' },
    btnTextSecondary: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary },

    // Shared Card Base
    cardBase: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 20,
        marginBottom: 15,
    },

    // Bubble
    instructionBubble: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(20, 30, 27, 0.95)', padding: 12, borderRadius: 30, flexDirection: 'row-reverse', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: {width:0,height:5}, shadowOpacity:0.3, shadowRadius:5, borderWidth: 1, borderColor: COLORS.border },
    instructionIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    instructionText: { flex: 1, fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' },
});