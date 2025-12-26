import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet, View, Text, Dimensions,
    ScrollView, Animated, Platform, Alert,
    UIManager, LayoutAnimation, Pressable, Image, Easing, StatusBar,
    BackHandler, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../../src/context/AppContext';

// ============================================================================
//                       SYSTEM & THEME CONFIG
// ============================================================================

const VERCEL_BACKEND_URL = "https://oilguard-backend.vercel.app/api/analyze.js";
const VERCEL_EVALUATE_URL = "https://oilguard-backend.vercel.app/api/evaluate.js";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

const COLORS = {
  background: '#1A2D27', 
  card: '#253D34',      
  border: 'rgba(90, 156, 132, 0.3)', 
  accentGreen: '#5A9C84', 
  textPrimary: '#F1F3F2',   
  textSecondary: '#A3B1AC', 
  textOnAccent: '#1A2D27',  
  danger: '#ef4444', 
  warning: '#f59e0b', 
  success: '#10b981',
  gold: '#fbbf24',
  
  // Specific Product Colors
  prodA: '#10b981', // Emerald Green
  prodB: '#3b82f6', // Royal Blue
  
  primaryGlow: 'rgba(90, 156, 132, 0.15)'
};

const INSTRUCTIONS = {
    0: "مرحباً بك في ساحة المقارنة العلمية",
    1: "صور المكونات لكل منتج لبدء التحدي",
    2: "جاري تحليل التركيبة الكيميائية...",
    3: "تأكد من نوع المنتج المكتشف تلقائياً",
    4: "ما هي المعايير التي تهمك أكثر؟",
    5: "النتيجة النهائية: اكتشف الأفضل علمياً"
};

// ============================================================================
//                       HELPER FUNCTIONS
// ============================================================================

const uriToBase64 = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => { const rawBase64 = reader.result.split(',')[1]; resolve(rawBase64); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) { throw new Error("Failed to process image file."); }
};

const getClaimsByProductType = (productType) => {
    const claimsByProduct = {
        shampoo: [ "تنقية فروة الرأس", "مضاد للقشرة", "للشعر الدهني", "للشعر الجاف", "مضاد للتساقط", "تعزيز النمو", "تكثيف الشعر", "ترطيب", "إصلاح التلف", "لمعان", "مكافحة التجعد", "حماية اللون", "حماية حرارية", "مهدئ", "مضاد للالتهابات" ],
        hair_mask: [ "تغذية عميقة", "إصلاح التلف", "ترطيب مكثف", "مكافحة التجعد", "حماية اللون", "لمعان ونعومة" ],
        serum: [ "مكافحة التجاعيد", "نضارة", "تحفيز الكولاجين", "إصلاح التلف", "مضاد للأكسدة", "تفتيح", "توحيد اللون", "تفتيح البقع", "الهالات السوداء", "ترطيب", "مهدئ", "مضاد للالتهابات", "للبشرة الجافة", "للبشرة الحساسة", "للبشرة الدهنية", "تنقية المسام", "مضاد للحبوب" ],
        oil_blend: [ "تعزيز النمو", "تغذية", "لمعان", "إصلاح التلف", "مكافحة التجعد", "ترطيب", "تفتيح" ],
        lotion_cream: [ "ترطيب عميق", "للبشرة الجافة", "للبشرة الحساسة", "للبشرة الدهنية", "مهدئ", "مضاد للأكسدة", "مكافحة التجاعيد", "شد البشرة", "تفتيح", "توحيد اللون", "إزالة السيلوليت" ],
        sunscreen: [ "حماية شمسية", "حماية واسعة", "مقاوم للماء", "ترطيب", "مهدئ", "لا يترك أثراً", "للبشرة الدهنية", "للبشرة الجافة" ],
        cleanser: [ "تنظيف عميق", "تنظيف لطيف", "إزالة المكياج", "للبشرة الدهنية", "للبشرة الجافة", "للبشرة الحساسة", "تنقية المسام", "مضاد للحبوب" ],
        other: [ "ترطيب", "مهدئ", "مضاد للأكسدة", "تفتيح", "مكافحة الشيخوخة", "علاج الحبوب" ]
    };
    return claimsByProduct[productType] || claimsByProduct.other;
};

// ============================================================================
//                       UI COMPONENTS
// ============================================================================

// 1. ANIMATED TRANSITION WRAPPER (Side-Slide)
const SlideTransition = ({ children, trigger }) => {
    const slideAnim = useRef(new Animated.Value(20)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        slideAnim.setValue(30);
        fadeAnim.setValue(0);
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
        ]).start();
    }, [trigger]);

    return (
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
            {children}
        </Animated.View>
    );
};

// 2. PRESSABLE SCALE
const PressableScale = ({ onPress, children, style, disabled, activeScale = 0.95 }) => {
    const scale = useRef(new Animated.Value(1)).current; 
    const pressIn = () => !disabled && Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, speed: 20 }).start();
    const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
    return (
        <Pressable onPress={() => { if(onPress && !disabled) { Haptics.selectionAsync(); onPress(); } }} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled} style={style}>
            <Animated.View style={[{ transform: [{ scale }] }, style?.flex && {flex: style.flex}]}>{children}</Animated.View>
        </Pressable>
    );
};

// 3. SCORE RING
const ScoreRing = ({ score, size = 50, color }) => {
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = circumference - (score / 100) * circumference;

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
                    strokeDasharray={`${circumference} ${circumference}`} 
                    strokeDashoffset={progress} 
                    strokeLinecap="round" 
                    fill="none" 
                />
            </Svg>
            <Text style={[styles.ringText, { fontSize: size * 0.3, color }]}>{Math.round(score)}</Text>
        </View>
    );
};

// ============================================================================
//                       STEPS LOGIC
// ============================================================================

const IntroStep = ({ onStart }) => (
    <View style={styles.centerContent}>
        <View style={styles.introHero}>
            <LinearGradient colors={[COLORS.card, COLORS.background]} style={styles.iconCircle}>
                <MaterialCommunityIcons name="scale-balance" size={50} color={COLORS.accentGreen} />
            </LinearGradient>
            <Text style={styles.titleLarge}>المقارنة الشاملة</Text>
            <Text style={styles.subtitle}>تحليل علمي دقيق يكشف حقيقة المنتجات</Text>
        </View>
        <PressableScale onPress={onStart} style={styles.btnPrimary}>
            <Text style={styles.btnTextPrimary}>بدء مقارنة جديدة</Text>
            <FontAwesome5 name="arrow-left" color={COLORS.textOnAccent} size={14} />
        </PressableScale>
    </View>
);

const InputStep = ({ left, setLeft, right, setRight }) => {
    const pickImage = async (setter) => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
            if (!result.canceled) {
                setter({ sourceData: result.assets[0].uri, sourceType: 'ocr' });
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (e) { Alert.alert("خطأ", "لا يمكن الوصول للصور"); }
    };

    const ProductSlot = ({ data, setter, label, color }) => (
        <PressableScale 
            style={[styles.slotCard, data.sourceData && { borderColor: color, borderWidth: 2 }]} 
            onPress={() => !data.sourceData && pickImage(setter)}
        >
            {data.sourceData ? (
                <>
                    <Image source={{ uri: data.sourceData }} style={styles.slotImage} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                    <Pressable style={styles.removeBtn} onPress={() => setter({ sourceData: null, sourceType: null })}>
                        <FontAwesome5 name="times" color="#FFF" size={10} />
                    </Pressable>
                    <View style={[styles.checkBadge, { backgroundColor: color }]}>
                        <FontAwesome5 name="check" color="#FFF" size={10} />
                    </View>
                </>
            ) : (
                <View style={styles.slotPlaceholder}>
                    <View style={styles.dashedCircle}>
                        <FontAwesome5 name="camera" size={24} color={COLORS.textSecondary} />
                    </View>
                    <Text style={styles.slotLabel}>{label}</Text>
                </View>
            )}
        </PressableScale>
    );

    return (
        <View style={styles.stepContainer}>
            <Text style={styles.headerTitle}>أطراف التحدي</Text>
            <Text style={styles.headerSub}>قم بتصوير قائمة المكونات الخلفية</Text>
            
            <View style={styles.arenaContainer}>
                <View style={styles.arenaSide}>
                    <ProductSlot data={left} setter={setLeft} label="المنتج (أ)" color={COLORS.prodA} />
                </View>

                <View style={styles.vsContainer}>
                    <View style={styles.vsLine} />
                    <View style={styles.vsBadge}>
                        <Text style={styles.vsText}>VS</Text>
                    </View>
                    <View style={styles.vsLine} />
                </View>

                <View style={styles.arenaSide}>
                    <ProductSlot data={right} setter={setRight} label="المنتج (ب)" color={COLORS.prodB} />
                </View>
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

    const detectedType = types.find(t => t.id === current) || types[5];
    const otherTypes = types.filter(t => t.id !== current);

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.headerTitle}>ما نوع هذه المنتجات؟</Text>
            <Text style={styles.headerSub}>حددنا النوع بناءً على المكونات</Text>
            
            {/* AI Selection */}
            <View style={styles.detectedContainer}>
                <View style={styles.detectedHeader}>
                    <FontAwesome5 name="robot" color={COLORS.accentGreen} size={14} />
                    <Text style={styles.detectedLabel}>اقتراح الذكاء الاصطناعي</Text>
                </View>
                <PressableScale style={[styles.typeCard, styles.typeCardActive, { width: '100%', aspectRatio: 2.2 }]} onPress={() => onSelect(current)}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 15 }}>
                        <View style={styles.activeIconCircle}>
                            <FontAwesome5 name={detectedType.icon} size={24} color={COLORS.textOnAccent} />
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={[styles.typeTextActive, { fontSize: 18 }]}>{detectedType.label}</Text>
                            <Text style={{ color: COLORS.textOnAccent, opacity: 0.8, fontSize: 12, textAlign: 'right' }}>اضغط للتأكيد</Text>
                        </View>
                        <View>
                             <FontAwesome5 name="check-circle" size={24} color={COLORS.textOnAccent} />
                        </View>
                    </View>
                </PressableScale>
            </View>

            {/* Alternatives */}
            <Text style={[styles.headerSub, { marginTop: 20 }]}>أو اختر يدوياً:</Text>
            <View style={styles.gridContainer}>
                {otherTypes.map((t) => (
                    <PressableScale key={t.id} style={styles.typeCard} onPress={() => onSelect(t.id)}>
                        <FontAwesome5 name={t.icon} size={20} color={COLORS.textSecondary} />
                        <Text style={styles.typeText}>{t.label}</Text>
                    </PressableScale>
                ))}
            </View>
        </ScrollView>
    );
};

const ClaimsSelectionStep = ({ claims, selected, onToggle, onFinish }) => (
    <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>أهداف المقارنة</Text>
        <Text style={styles.headerSub}>حدد ما تبحث عنه في هذه المنتجات</Text>
        
        <ScrollView contentContainerStyle={styles.chipsContainer} showsVerticalScrollIndicator={false}>
            {claims.map((claim) => {
                const isActive = selected.includes(claim);
                return (
                    <PressableScale key={claim} onPress={() => onToggle(claim)} style={[styles.chip, isActive && styles.chipActive]}>
                        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{claim}</Text>
                        {isActive && <FontAwesome5 name="check" size={10} color={COLORS.textOnAccent} style={{ marginLeft: 6 }} />}
                    </PressableScale>
                );
            })}
        </ScrollView>

        <PressableScale onPress={onFinish} disabled={selected.length === 0} style={[styles.btnPrimary, { marginTop: 20 }]}>
            <Text style={styles.btnTextPrimary}>عرض النتائج</Text>
            <FontAwesome5 name="chart-pie" color={COLORS.textOnAccent} size={14} />
        </PressableScale>
    </View>
);

// --- RESULTS COMPONENTS ---

const TugOfWarBar = ({ label, valA, valB }) => {
    // Normalizing values to split the bar from center
    // A (Green) grows Right, B (Blue) grows Left
    const widthA = Math.min(valA, 100);
    const widthB = Math.min(valB, 100);

    return (
        <View style={{ width: '100%', marginBottom: 15 }}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.prodA, fontSize: 12 }}>{Math.round(valA)}</Text>
                <Text style={styles.compLabel}>{label}</Text>
                <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.prodB, fontSize: 12 }}>{Math.round(valB)}</Text>
            </View>
            
            <View style={styles.tugContainer}>
                {/* Right Side (Product A - Green) */}
                <View style={styles.tugSide}>
                    <View style={[styles.tugBar, { 
                        backgroundColor: COLORS.prodA, 
                        width: `${widthA}%`,
                        borderTopLeftRadius: 4, borderBottomLeftRadius: 4
                    }]} />
                </View>

                {/* Center Divider */}
                <View style={styles.tugDivider} />

                {/* Left Side (Product B - Blue) */}
                <View style={[styles.tugSide, { justifyContent: 'flex-start' }]}> 
                    <View style={[styles.tugBar, { 
                        backgroundColor: COLORS.prodB, 
                        width: `${widthB}%`,
                        borderTopRightRadius: 4, borderBottomRightRadius: 4
                    }]} />
                </View>
            </View>
        </View>
    );
};

const ResultHeader = ({ left, right, winner }) => (
    <View style={styles.resultHeader}>
        <View style={[styles.winnerBanner, { borderColor: winner === 'tie' ? COLORS.border : COLORS.gold }]}>
            <FontAwesome5 name="trophy" size={12} color={COLORS.gold} />
            <Text style={styles.winnerText}>
                {winner === 'tie' ? 'تعادل في المستوى' : `الأفضل: ${winner === 'left' ? 'المنتج (أ)' : 'المنتج (ب)'}`}
            </Text>
        </View>

        <View style={styles.headToHead}>
            {/* Product A (Green) */}
            <View style={styles.productCol}>
                <Image source={{ uri: left.sourceData }} style={[styles.resImg, winner === 'left' && { borderColor: COLORS.prodA, borderWidth: 2 }]} />
                <ScoreRing score={left.analysisData.oilGuardScore} size={50} color={COLORS.prodA} />
                <Text style={[styles.resName, { color: COLORS.prodA }]}>المنتج (أ)</Text>
            </View>

            {/* Stats */}
            <View style={styles.centerStats}>
                <TugOfWarBar label="الأمان" valA={left.analysisData.safety.score} valB={right.analysisData.safety.score} />
                <TugOfWarBar label="الفعالية" valA={left.analysisData.efficacy.score} valB={right.analysisData.efficacy.score} />
            </View>

            {/* Product B (Blue) */}
            <View style={styles.productCol}>
                <Image source={{ uri: right.sourceData }} style={[styles.resImg, winner === 'right' && { borderColor: COLORS.prodB, borderWidth: 2 }]} />
                <ScoreRing score={right.analysisData.oilGuardScore} size={50} color={COLORS.prodB} />
                <Text style={[styles.resName, { color: COLORS.prodB }]}>المنتج (ب)</Text>
            </View>
        </View>
    </View>
);

const ResultsStep = ({ left, right, onReset }) => {
    const [tab, setTab] = useState('overview');
    const winner = useMemo(() => {
        const s1 = left.analysisData.oilGuardScore;
        const s2 = right.analysisData.oilGuardScore;
        if (Math.abs(s1 - s2) < 5) return 'tie';
        return s1 > s2 ? 'left' : 'right';
    }, [left, right]);

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
             <ResultHeader left={left} right={right} winner={winner} />
             
             <View style={styles.tabsContainer}>
                 {['overview', 'safety', 'marketing'].map(t => (
                     <PressableScale key={t} onPress={() => setTab(t)} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}>
                         <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                             {t === 'overview' ? 'نظرة عامة' : t === 'safety' ? 'المخاطر' : 'التسويق'}
                         </Text>
                     </PressableScale>
                 ))}
             </View>

             <SlideTransition trigger={tab}>
                {tab === 'overview' && (
                    <>
                        <View style={styles.cardBase}>
                            <Text style={styles.cardTitle}>🏆 الحكم النهائي</Text>
                            <Text style={[styles.verdictText, { color: winner === 'left' ? COLORS.prodA : winner === 'right' ? COLORS.prodB : COLORS.gold }]}>
                                {winner === 'left' ? left.analysisData.finalVerdict : right.analysisData.finalVerdict}
                            </Text>
                            <Text style={styles.verdictSub}>
                                {winner === 'tie' ? "المنتجان متقاربان جداً." : `يتفوق ${winner === 'left' ? 'المنتج (أ)' : 'المنتج (ب)'} بشكل عام بفضل تركيبته الأفضل.`}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 10 }}>
                            <View style={[styles.cardBase, { flex: 1 }]}>
                                <Text style={[styles.colHeader, { color: COLORS.prodA }]}>مزايا (أ)</Text>
                                {left.analysisData.scoreBreakdown.filter(x => x.type === 'info').slice(0,3).map((x,i) => (
                                    <Text key={i} style={styles.bulletPoint}>• {x.text.split(':')[0]}</Text>
                                ))}
                            </View>
                            <View style={[styles.cardBase, { flex: 1 }]}>
                                <Text style={[styles.colHeader, { color: COLORS.prodB }]}>مزايا (ب)</Text>
                                {right.analysisData.scoreBreakdown.filter(x => x.type === 'info').slice(0,3).map((x,i) => (
                                    <Text key={i} style={styles.bulletPoint}>• {x.text.split(':')[0]}</Text>
                                ))}
                            </View>
                        </View>
                    </>
                )}

                {tab === 'safety' && (
                     <View style={{ gap: 10 }}>
                        <View style={styles.cardBase}>
                            <Text style={[styles.cardTitle, {color: COLORS.prodA}]}>مخاطر المنتج (أ)</Text>
                            {left.analysisData.scoreBreakdown.filter(x => x.type === 'deduction').map((x, i) => (
                                <View key={i} style={styles.breakdownItem}>
                                    <Text style={styles.bdText}>{x.text}</Text>
                                    <Text style={[styles.bdValue, { color: COLORS.danger }]}>{x.value}</Text>
                                </View>
                            ))}
                            {left.analysisData.scoreBreakdown.filter(x => x.type === 'deduction').length === 0 && <Text style={styles.emptyText}>المنتج آمن.</Text>}
                        </View>
                        <View style={styles.cardBase}>
                            <Text style={[styles.cardTitle, {color: COLORS.prodB}]}>مخاطر المنتج (ب)</Text>
                            {right.analysisData.scoreBreakdown.filter(x => x.type === 'deduction').map((x, i) => (
                                <View key={i} style={styles.breakdownItem}>
                                    <Text style={styles.bdText}>{x.text}</Text>
                                    <Text style={[styles.bdValue, { color: COLORS.danger }]}>{x.value}</Text>
                                </View>
                            ))}
                            {right.analysisData.scoreBreakdown.filter(x => x.type === 'deduction').length === 0 && <Text style={styles.emptyText}>المنتج آمن.</Text>}
                        </View>
                     </View>
                )}

                {tab === 'marketing' && (
                    <View style={styles.cardBase}>
                        <Text style={styles.cardTitle}>كشف الادعاءات</Text>
                        {[{d: left, c: COLORS.prodA, n: '(أ)'}, {d: right, c: COLORS.prodB, n: '(ب)'}].map((prod, idx) => (
                            <View key={idx} style={{ marginBottom: 15 }}>
                                <Text style={[styles.colHeader, { color: prod.c }]}>المنتج {prod.n}</Text>
                                {prod.d.analysisData.marketing_results?.map((m, i) => (
                                    <View key={i} style={styles.marketingItem}>
                                        <View style={{flexDirection:'row-reverse', justifyContent:'space-between'}}>
                                            <Text style={styles.mClaim}>"{m.claim}"</Text>
                                            <Text style={{ fontFamily:'Tajawal-Bold', fontSize:10, color: m.status.includes('✅')?COLORS.success:COLORS.warning }}>{m.status}</Text>
                                        </View>
                                        <Text style={styles.mExp}>{m.explanation}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                )}
             </SlideTransition>

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
    const { userProfile } = useAppContext();
    const [step, setStep] = useState(0);
    const [left, setLeft] = useState({ sourceData: null, ingredientsList: [] });
    const [right, setRight] = useState({ sourceData: null, ingredientsList: [] });
    const [productType, setProductType] = useState(null);
    const [claims, setClaims] = useState([]);
    const [loadingText, setLoadingText] = useState('');
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const backAction = () => {
            if (step > 0) { step === 5 ? resetAll() : setStep(0); return true; }
            return false;
        };
        const bh = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => bh.remove();
    }, [step]);

    useEffect(() => {
        if (step === 1 && left.sourceData && right.sourceData) handleStartAnalysis();
    }, [step, left.sourceData, right.sourceData]);

    const handleStartAnalysis = async () => {
        if (step !== 1) return; 
        transition(2);
        
        const analyzeProduct = async (sourceData, label) => {
             setLoadingText(`جاري تحليل ${label}...`);
             const base64Data = await uriToBase64(sourceData);
             const response = await fetch(VERCEL_BACKEND_URL, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ base64Data })
             });
             const json = await response.json();
             if (!response.ok) throw new Error(json.error || 'Failed');
             const parsed = JSON.parse(json.result.replace(/```json|```/g, '').trim());
             return { ingredientsList: parsed.ingredients_list || [], type: parsed.detected_type || 'other' };
        };

        try {
            const leftResult = await analyzeProduct(left.sourceData, "المنتج الأول");
            setLeft(prev => ({ ...prev, ingredientsList: leftResult.ingredientsList }));
            const rightResult = await analyzeProduct(right.sourceData, "المنتج الثاني");
            setRight(prev => ({ ...prev, ingredientsList: rightResult.ingredientsList }));
            setProductType((leftResult.type && leftResult.type !== 'other') ? leftResult.type : (rightResult.type || 'other'));
            transition(3);
        } catch (error) {
            Alert.alert("خطأ", "تأكد من وضوح الصور.");
            transition(1);
        }
    };

    const handleFinalCalculation = () => {
        transition(2);
        setLoadingText('حساب النتائج...');
        setTimeout(async () => {
            try {
                const evaluate = async (p) => {
                    const res = await fetch(VERCEL_EVALUATE_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ingredients_list: p.ingredientsList,
                            product_type: productType,
                            selected_claims: claims,
                            user_profile: {
                                allergies: userProfile?.settings?.allergies || [],
                                conditions: userProfile?.settings?.conditions || [],
                                skinType: userProfile?.settings?.skinType,
                                scalpType: userProfile?.settings?.scalpType
                            }
                        })
                    });
                    if (!res.ok) throw new Error('Eval failed');
                    return await res.json();
                };
                const lData = await evaluate(left);
                const rData = await evaluate(right);
                setLeft(prev => ({ ...prev, analysisData: lData }));
                setRight(prev => ({ ...prev, analysisData: rData }));
                transition(5);
            } catch (e) { Alert.alert("خطأ", "فشل التقييم."); transition(1); }
        }, 100);
    };

    const transition = (nextStep) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStep(nextStep);
    };

    const resetAll = () => {
        setLeft({ sourceData: null, ingredientsList: [] });
        setRight({ sourceData: null, ingredientsList: [] });
        setProductType(null);
        setClaims([]);
        transition(0);
    };

    const renderStep = () => {
        switch(step) {
            case 0: return <IntroStep onStart={() => transition(1)} />;
            case 1: return <InputStep left={left} setLeft={setLeft} right={right} setRight={setRight} />;
            case 2: return <LoadingStep text={loadingText} />;
            case 3: return <TypeSelectionStep current={productType} onSelect={(t) => { setProductType(t); transition(4); }} />;
            case 4: return <ClaimsSelectionStep claims={getClaimsByProductType(productType)} selected={claims} onToggle={(c) => setClaims(p => p.includes(c) ? p.filter(x=>x!==c) : [...p, c])} onFinish={handleFinalCalculation} />;
            case 5: return <ResultsStep left={left} right={right} onReset={resetAll} />;
            default: return null;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <View style={[styles.contentArea, { paddingTop: insets.top + 10 }]}>
                {/* Back Button */}
                {step > 0 && (
                    <PressableScale onPress={() => transition(step === 5 ? 0 : step - 1)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </PressableScale>
                )}
                
                {/* Content Container with Animation */}
                <SlideTransition trigger={step}>
                    {renderStep()}
                </SlideTransition>
            </View>

            {/* Instruction Bubble - Fixed at bottom, content scrolls behind it */}
            <View style={[styles.fixedBubbleContainer, { paddingBottom: insets.bottom + 10 }]}>
                <View style={styles.instructionBubble}>
                    <View style={styles.instructionIcon}>
                        <FontAwesome5 name="lightbulb" size={12} color={COLORS.gold} />
                    </View>
                    <Text style={styles.instructionText}>{INSTRUCTIONS[step]}</Text>
                </View>
            </View>
        </View>
    );
}

// ============================================================================
//                       STYLES (MOBILE FIRST)
// ============================================================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    contentArea: { flex: 1, paddingHorizontal: 16 },
    backBtn: { marginBottom: 10, alignSelf: 'flex-start', padding: 5 },

    // INTRO
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    introHero: { alignItems: 'center', marginBottom: 50 },
    iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.border },
    titleLarge: { fontFamily: 'Tajawal-ExtraBold', fontSize: 26, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 10 },
    subtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
    
    // INPUTS
    headerTitle: { fontFamily: 'Tajawal-Bold', fontSize: 20, color: COLORS.textPrimary, textAlign: 'right', marginTop: 10 },
    headerSub: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary, marginBottom: 20, textAlign: 'right' },
    arenaContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', height: 180, marginTop: 20 },
    arenaSide: { flex: 1, height: '100%' },
    slotCard: { flex: 1, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    slotImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    slotPlaceholder: { alignItems: 'center', gap: 8 },
    dashedCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
    slotLabel: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, fontSize: 12 },
    removeBtn: { position: 'absolute', top: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    checkBadge: { position: 'absolute', bottom: 5, right: 5, borderRadius: 8, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    vsContainer: { width: 40, height: '100%', alignItems: 'center', justifyContent: 'center' },
    vsLine: { flex: 1, width: 1, backgroundColor: COLORS.border },
    vsBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.gold, marginVertical: 5 },
    vsText: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.gold, fontSize: 12 },

    // TYPE SELECTION
    detectedContainer: { marginBottom: 20 },
    detectedHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 10 },
    detectedLabel: { fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen, fontSize: 12 },
    activeIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    gridContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
    typeCard: { width: '48%', aspectRatio: 1.5, backgroundColor: COLORS.card, borderRadius: 16, marginBottom: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    typeCardActive: { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen },
    typeText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textSecondary, marginTop: 8 },
    typeTextActive: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.textOnAccent },

    // CLAIMS (Chips)
    chipsContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, paddingBottom: 120 }, // Extra padding for scroll
    chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row-reverse', alignItems: 'center', minHeight: 40 },
    chipActive: { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen },
    chipText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary },
    chipTextActive: { fontFamily: 'Tajawal-Bold', color: COLORS.textOnAccent },

    // RESULTS HEADER
    resultHeader: { marginBottom: 20 },
    winnerBanner: { flexDirection: 'row-reverse', alignSelf: 'center', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, gap: 8, marginBottom: 16, borderWidth: 1, borderColor: COLORS.gold },
    winnerText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.gold },
    headToHead: { flexDirection: 'row-reverse', alignItems: 'stretch', justifyContent: 'space-between' },
    productCol: { width: '28%', alignItems: 'center', gap: 6 },
    resImg: { width: 50, height: 50, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
    resName: { fontFamily: 'Tajawal-Bold', fontSize: 11, textAlign: 'center' },
    ringText: { fontFamily: 'Tajawal-ExtraBold' },

    // TUG OF WAR
    centerStats: { flex: 1, marginHorizontal: 8, justifyContent: 'center' },
    compLabel: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.textSecondary },
    tugContainer: { flexDirection: 'row-reverse', height: 8, width: '100%', borderRadius: 4, overflow: 'hidden', backgroundColor: COLORS.card },
    tugSide: { flex: 1, flexDirection: 'row', alignItems: 'center' }, 
    tugBar: { height: '100%' },
    tugDivider: { width: 2, backgroundColor: COLORS.background, zIndex: 1 },

    // TABS & CARDS
    tabsContainer: { flexDirection: 'row-reverse', backgroundColor: COLORS.card, borderRadius: 12, padding: 4, marginBottom: 16 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabBtnActive: { backgroundColor: COLORS.accentGreen },
    tabText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary },
    tabTextActive: { fontFamily: 'Tajawal-Bold', color: COLORS.textOnAccent },
    
    cardBase: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 10 },
    cardTitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textPrimary, marginBottom: 10, textAlign: 'right' },
    verdictText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, textAlign: 'right', marginBottom: 6 },
    verdictSub: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 18 },
    colHeader: { fontFamily: 'Tajawal-Bold', fontSize: 12, marginBottom: 8, textAlign: 'right' },
    bulletPoint: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textPrimary, marginBottom: 4, textAlign: 'right' },
    breakdownItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    bdText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, flex: 1, textAlign: 'right' },
    bdValue: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    marketingItem: { backgroundColor: 'rgba(0,0,0,0.15)', padding: 10, borderRadius: 8, marginBottom: 8 },
    mClaim: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textPrimary },
    mExp: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', marginTop: 4 },
    emptyText: { fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, textAlign: 'center', fontSize: 12, marginTop: 10 },

    // BUTTONS
    btnPrimary: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.accentGreen, paddingVertical: 16, borderRadius: 14, width: '100%', justifyContent: 'center', alignItems: 'center' },
    btnTextPrimary: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textOnAccent },
    btnSecondary: { flexDirection: 'row', gap: 8, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 14, borderRadius: 14, width: '100%', justifyContent: 'center', alignItems: 'center' },
    btnTextSecondary: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary },
    
    // LOADING & BUBBLE
    loadingText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, marginTop: 20 },
    loaderRingOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    
    fixedBubbleContainer: { position: 'absolute', bottom: 0, width: '100%', alignItems: 'center', backgroundColor: 'transparent' },
    instructionBubble: { backgroundColor: 'rgba(20, 30, 27, 0.95)', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, width: '92%', marginBottom: 10, elevation: 5 },
    instructionIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    instructionText: { flex: 1, fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' },
});