import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet, View, Text, Dimensions,
    ScrollView, Animated, Platform, Alert,
    UIManager, LayoutAnimation, Pressable, Image, Easing, StatusBar,
    BackHandler, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

// --- Analysis helpers imports ---
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
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 24;

const THEME = {
  bg: '#0F1815', // Ultra dark green/black
  surface: '#172420',
  surfaceHighlight: '#1F302A',
  primary: '#10B981', // Emerald
  primaryDark: '#059669',
  accent: '#34D399',
  gold: '#F59E0B',
  danger: '#EF4444',
  text: '#ECFDF5',
  textDim: '#6EE7B7', // Soft green text
  textMuted: '#4B5563',
  border: 'rgba(52, 211, 153, 0.15)',
  glass: 'rgba(23, 36, 32, 0.85)',
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
//                       UI COMPONENTS
// ============================================================================

const InstructionBubble = ({ step }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        // Reset
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
                <FontAwesome5 name="lightbulb" size={14} color={THEME.bg} solid />
            </View>
            <Text style={styles.instructionText}>{INSTRUCTIONS[step]}</Text>
        </Animated.View>
    );
};

const AnimatedBtn = ({ onPress, children, style, primary = false, disabled = false }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if(disabled) return;
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Pressable
            onPress={() => {
                if(!disabled){
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }
            }}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            style={({ pressed }) => [
                styles.btnBase,
                primary ? styles.btnPrimary : styles.btnSurface,
                disabled && styles.btnDisabled,
                style
            ]}
        >
            <Animated.View style={{ transform: [{ scale }], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

const ScoreRing = ({ score, size = 60, strokeWidth = 4 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = circumference - (score / 100) * circumference;
    const color = score > 80 ? THEME.primary : score > 50 ? THEME.gold : THEME.danger;

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size}>
                <Circle stroke={THEME.surfaceHighlight} cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} />
                <Circle
                    stroke={color}
                    cx={size/2}
                    cy={size/2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={progress}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${size/2}, ${size/2}`}
                />
            </Svg>
            <Text style={[styles.ringText, { fontSize: size * 0.3 }]}>{Math.round(score)}</Text>
        </View>
    );
};

// ============================================================================
//                       STEPS LOGIC
// ============================================================================

const IntroStep = ({ onStart }) => (
    <View style={styles.centerContent}>
        <View style={styles.introHero}>
            <LinearGradient colors={[THEME.surfaceHighlight, THEME.bg]} style={styles.iconCircle}>
                <MaterialCommunityIcons name="scale-balance" size={60} color={THEME.primary} />
            </LinearGradient>
            <Text style={styles.titleLarge}>المقارنة الشاملة</Text>
            <Text style={styles.subtitle}>تحليل علمي دقيق يكشف حقيقة المنتجات</Text>
        </View>
        <AnimatedBtn primary onPress={onStart} style={styles.startBtn}>
            <Text style={styles.btnTextPrimary}>بدء المقارنة الجديدة</Text>
            <FontAwesome5 name="arrow-left" color={THEME.bg} />
        </AnimatedBtn>
    </View>
);

const InputStep = ({ left, setLeft, right, setRight }) => {
    const pickImage = async (setter, side) => {
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
        <Pressable 
            style={[styles.slotCard, data.sourceData && styles.slotCardFilled]} 
            onPress={() => !data.sourceData && pickImage(setter)}
            android_ripple={{ color: 'rgba(16, 185, 129, 0.1)' }}
        >
            {data.sourceData ? (
                <>
                    <Image source={{ uri: data.sourceData }} style={styles.slotImage} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
                    <Pressable style={styles.removeBtn} onPress={() => setter({ sourceData: null, sourceType: null })}>
                        <FontAwesome5 name="times" color="#FFF" size={12} />
                    </Pressable>
                    <View style={styles.checkBadge}>
                        <FontAwesome5 name="check" color={THEME.bg} size={10} />
                    </View>
                </>
            ) : (
                <View style={styles.slotPlaceholder}>
                    <View style={styles.dashedCircle}>
                        <FontAwesome5 name="camera" size={24} color={THEME.primary} />
                    </View>
                    <Text style={styles.slotLabel}>{label}</Text>
                    <Text style={styles.slotSub}>اضغط للإضافة</Text>
                </View>
            )}
        </Pressable>
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
            <ActivityIndicator size="large" color={THEME.primary} />
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
            <ScrollView contentContainerStyle={styles.gridContainer}>
                {types.map((t) => (
                    <Pressable
                        key={t.id}
                        style={[styles.typeCard, current === t.id && styles.typeCardActive]}
                        onPress={() => onSelect(t.id)}
                    >
                        <FontAwesome5 
                            name={t.icon} 
                            size={24} 
                            color={current === t.id ? THEME.bg : THEME.textDim} 
                            style={{ marginBottom: 10 }}
                        />
                        <Text style={[styles.typeText, current === t.id && styles.typeTextActive]}>{t.label}</Text>
                    </Pressable>
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
            
            <ScrollView contentContainerStyle={styles.chipsContainer}>
                {claims.map((claim) => {
                    const isActive = selected.includes(claim);
                    return (
                        <Pressable
                            key={claim}
                            onPress={() => onToggle(claim)}
                            style={[styles.chip, isActive && styles.chipActive]}
                        >
                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{claim}</Text>
                            {isActive && <FontAwesome5 name="check" size={12} color={THEME.bg} style={{ marginLeft: 6 }} />}
                        </Pressable>
                    );
                })}
            </ScrollView>

            <AnimatedBtn primary onPress={onFinish} disabled={selected.length === 0} style={styles.finishBtn}>
                <Text style={styles.btnTextPrimary}>إظهار النتائج</Text>
                <FontAwesome5 name="chart-pie" color={THEME.bg} />
            </AnimatedBtn>
        </View>
    );
};

// --- RESULT SUB-COMPONENTS ---

const ResultHeader = ({ left, right, winner }) => (
    <View style={styles.resultHeader}>
        <View style={[styles.winnerBadgeContainer, { opacity: winner === 'tie' ? 0 : 1 }]}>
            <LinearGradient colors={[THEME.gold, '#FCD34D']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.winnerBadge}>
                <FontAwesome5 name="trophy" size={12} color={THEME.bg} />
                <Text style={styles.winnerText}>
                    {winner === 'left' ? 'المنتج (أ) يتفوق' : 'المنتج (ب) يتفوق'}
                </Text>
            </LinearGradient>
        </View>

        <View style={styles.headToHead}>
            {/* Left Product */}
            <View style={[styles.productCol, winner === 'left' && styles.productColWinner]}>
                <Image source={{ uri: left.sourceData }} style={styles.resImg} />
                <Text style={styles.resName}>المنتج (أ)</Text>
                <ScoreRing score={left.analysisData.oilGuardScore} />
            </View>

            {/* VS Divider */}
            <View style={styles.centerStats}>
                <View style={styles.statLine}>
                    <Text style={styles.statLabel}>أمان</Text>
                    <View style={styles.barContainer}>
                         <View style={[styles.barFill, { width: `${left.analysisData.safety.score}%`, backgroundColor: left.analysisData.safety.score > right.analysisData.safety.score ? THEME.primary : THEME.textMuted }]} />
                         <View style={[styles.barFill, { width: `${right.analysisData.safety.score}%`, backgroundColor: right.analysisData.safety.score > left.analysisData.safety.score ? THEME.primary : THEME.textMuted }]} />
                    </View>
                </View>
                <View style={styles.statLine}>
                    <Text style={styles.statLabel}>فعالية</Text>
                    <View style={styles.barContainer}>
                         <View style={[styles.barFill, { width: `${left.analysisData.efficacy.score}%`, backgroundColor: left.analysisData.efficacy.score > right.analysisData.efficacy.score ? THEME.primary : THEME.textMuted }]} />
                         <View style={[styles.barFill, { width: `${right.analysisData.efficacy.score}%`, backgroundColor: right.analysisData.efficacy.score > left.analysisData.efficacy.score ? THEME.primary : THEME.textMuted }]} />
                    </View>
                </View>
            </View>

            {/* Right Product */}
            <View style={[styles.productCol, winner === 'right' && styles.productColWinner]}>
                <Image source={{ uri: right.sourceData }} style={styles.resImg} />
                <Text style={styles.resName}>المنتج (ب)</Text>
                <ScoreRing score={right.analysisData.oilGuardScore} />
            </View>
        </View>
    </View>
);

const TabButton = ({ title, active, onPress }) => (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
    </Pressable>
);

const BreakdownList = ({ data, type }) => {
    if (!data || data.length === 0) return <Text style={styles.emptyText}>لا توجد ملاحظات.</Text>;
    return (
        <View>
            {data.map((item, idx) => (
                <View key={idx} style={[styles.breakdownItem, { borderRightColor: item.type === 'deduction' ? THEME.danger : item.type === 'info' ? THEME.primary : THEME.gold }]}>
                    <View style={{flex:1}}>
                        <Text style={styles.bdText}>{item.text}</Text>
                    </View>
                    <Text style={[styles.bdValue, { color: item.type === 'deduction' ? THEME.danger : THEME.primary }]}>{item.value}</Text>
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
                         <View style={styles.card}>
                            <Text style={styles.cardTitle}>الحكم النهائي</Text>
                            <Text style={styles.verdictText}>
                                {winner === 'left' ? left.analysisData.finalVerdict : right.analysisData.finalVerdict}
                            </Text>
                            {winner !== 'tie' && (
                                <Text style={styles.verdictSub}>
                                    تفوق {winner === 'left' ? 'المنتج الأول' : 'المنتج الثاني'} بفضل {winner === 'left' ? (left.analysisData.safety.score > right.analysisData.safety.score ? 'تركيبة أكثر أماناً' : 'فعالية أعلى') : (right.analysisData.safety.score > left.analysisData.safety.score ? 'تركيبة أكثر أماناً' : 'فعالية أعلى')}.
                                </Text>
                            )}
                        </View>
                        
                        <View style={styles.card}>
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
                        </View>
                    </View>
                );
            case 'safety':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.card}>
                             <Text style={styles.cardTitle}>تحليل المخاطر (المنتج أ)</Text>
                             <BreakdownList data={left.analysisData.scoreBreakdown.filter(x => x.type === 'deduction' || x.type === 'warning')} />
                        </View>
                        <View style={styles.card}>
                             <Text style={styles.cardTitle}>تحليل المخاطر (المنتج ب)</Text>
                             <BreakdownList data={right.analysisData.scoreBreakdown.filter(x => x.type === 'deduction' || x.type === 'warning')} />
                        </View>
                    </View>
                );
            case 'marketing':
                 return (
                    <View style={styles.tabContent}>
                        <View style={styles.card}>
                             <Text style={styles.cardTitle}>مصداقية الادعاءات</Text>
                             {left.analysisData.marketing_results?.map((m, i) => (
                                 <View key={i} style={styles.marketingItem}>
                                     <Text style={styles.mClaim}>"{m.claim}" في المنتج (أ)</Text>
                                     <Text style={[styles.mStatus, { color: m.status.includes('✅') ? THEME.primary : THEME.gold }]}>{m.status}</Text>
                                     <Text style={styles.mExp}>{m.explanation}</Text>
                                 </View>
                             ))}
                             <View style={styles.divider} />
                             {right.analysisData.marketing_results?.map((m, i) => (
                                 <View key={i} style={styles.marketingItem}>
                                     <Text style={styles.mClaim}>"{m.claim}" في المنتج (ب)</Text>
                                     <Text style={[styles.mStatus, { color: m.status.includes('✅') ? THEME.primary : THEME.gold }]}>{m.status}</Text>
                                     <Text style={styles.mExp}>{m.explanation}</Text>
                                 </View>
                             ))}
                        </View>
                    </View>
                 );
        }
    }

    return (
        <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ paddingBottom: 100 }}>
             <ResultHeader left={left} right={right} winner={winner} />
             
             <View style={styles.tabsContainer}>
                 <TabButton title="نظرة عامة" active={tab==='overview'} onPress={() => setTab('overview')} />
                 <TabButton title="الأمان" active={tab==='safety'} onPress={() => setTab('safety')} />
                 <TabButton title="التسويق" active={tab==='marketing'} onPress={() => setTab('marketing')} />
             </View>

             {renderTabContent()}

             <AnimatedBtn onPress={onReset} style={styles.resetBtn}>
                 <Text style={styles.btnTextSurface}>مقارنة جديدة</Text>
                 <FontAwesome5 name="redo" color={THEME.textDim} />
             </AnimatedBtn>
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
    
    // Back handler
    useEffect(() => {
        const backAction = () => {
            if (step > 0) {
                // If in results, reset completely. If elsewhere, go back one step or to start.
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

    // FIX: This useEffect was previously inside renderContent/switch case
    // It is now moved to the top level, respecting React Hook rules.
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
        // Prevent double execution if already moving
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
            // Prefer the type detected from the first product, or fallback to 'other'
            const likelyType = (leftRaw.productType && leftRaw.productType !== 'other') 
                ? leftRaw.productType 
                : (rightRaw.productType || 'other');
            
            setProductType(likelyType);

            transitionTo(3);
        } catch (error) {
            console.error(error);
            Alert.alert("خطأ في التحليل", "تأكد من وضوح صور المكونات.");
            // Reset to input step on failure so user can try again
            transitionTo(1);
        }
    };

    const handleFinalCalculation = () => {
        transitionTo(2);
        setLoadingText('حساب النتائج النهائية...');

        // Small timeout to allow UI to update to loading state before heavy calculation
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
            case 0: 
                return <IntroStep onStart={() => transitionTo(1)} />;
            case 1: 
                return <InputStep left={left} setLeft={setLeft} right={right} setRight={setRight} />;
            case 2: 
                return <LoadingStep text={loadingText} />;
            case 3: 
                return <TypeSelectionStep current={productType} onSelect={(t) => { setProductType(t); transitionTo(4); }} />;
            case 4: 
                const availableClaims = getClaimsByProductType(productType);
                return <ClaimsSelectionStep 
                    claims={availableClaims} 
                    selected={claims} 
                    onToggle={(c) => setClaims(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev, c])} 
                    onFinish={handleFinalCalculation} 
                />;
            case 5: 
                return <ResultsStep left={left} right={right} onReset={resetAll} />;
            default:
                return <IntroStep onStart={() => transitionTo(1)} />;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <LinearGradient colors={[THEME.bg, '#08100e']} style={StyleSheet.absoluteFill} />
            {/* Ambient Background Glow */}
            <View style={styles.glowOrb} />
            
            <View style={styles.contentArea}>
                {renderContent()}
            </View>

            <InstructionBubble step={step} />
        </View>
    );
}

// ============================================================================
//                       STYLES
// ============================================================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bg },
    glowOrb: {
        position: 'absolute', top: -100, left: -50, width: 300, height: 300,
        borderRadius: 150, backgroundColor: THEME.primary, opacity: 0.1, blurRadius: 50
    },
    contentArea: { flex: 1, paddingTop: STATUS_BAR_HEIGHT + 20, paddingHorizontal: 20 },
    
    // Intro
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    introHero: { alignItems: 'center', marginBottom: 40 },
    iconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: THEME.border },
    titleLarge: { fontFamily: 'Tajawal-ExtraBold', fontSize: 28, color: THEME.text, textAlign: 'center' },
    subtitle: { fontFamily: 'Tajawal-Regular', fontSize: 16, color: THEME.textDim, textAlign: 'center', marginTop: 10 },
    
    // Inputs
    headerTitle: { fontFamily: 'Tajawal-Bold', fontSize: 22, color: THEME.text, marginBottom: 5, textAlign: 'right' },
    headerSub: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: THEME.textMuted, marginBottom: 20, textAlign: 'right' },
    arenaContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 200, marginTop: 40 },
    slotCard: { width: '42%', height: '100%', borderRadius: 16, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 4 },
    slotCardFilled: { borderColor: THEME.primary },
    slotImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    slotPlaceholder: { alignItems: 'center', gap: 10, padding: 10 },
    dashedCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: THEME.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
    slotLabel: { fontFamily: 'Tajawal-Bold', color: THEME.text, fontSize: 14 },
    slotSub: { fontFamily: 'Tajawal-Regular', color: THEME.textDim, fontSize: 10 },
    removeBtn: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    checkBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: THEME.primary, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    vsBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.surfaceHighlight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: THEME.gold },
    vsText: { fontFamily: 'Tajawal-ExtraBold', color: THEME.gold, fontSize: 14 },

    // Loading
    loaderRingOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: THEME.surfaceHighlight, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    loadingText: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: THEME.text },
    loadingSub: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: THEME.textDim, marginTop: 8 },

    // Types
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 100 },
    typeCard: { width: '48%', aspectRatio: 1.4, backgroundColor: THEME.surface, borderRadius: 16, marginBottom: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: THEME.border },
    typeCardActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
    typeText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: THEME.textDim },
    typeTextActive: { color: THEME.bg },

    // Claims
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, paddingVertical: 20 },
    chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, flexDirection: 'row-reverse', alignItems: 'center' },
    chipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
    chipText: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: THEME.textDim },
    chipTextActive: { fontFamily: 'Tajawal-Bold', color: THEME.bg },

    // Results
    resultHeader: { marginTop: 10, marginBottom: 20 },
    winnerBadgeContainer: { alignItems: 'center', marginBottom: 15, height: 24 },
    winnerBadge: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, gap: 6 },
    winnerText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: THEME.bg },
    headToHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    productCol: { width: '32%', alignItems: 'center', gap: 8 },
    productColWinner: { transform: [{ scale: 1.05 }] },
    resImg: { width: 60, height: 60, borderRadius: 12, borderWidth: 1, borderColor: THEME.border },
    resName: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: THEME.text, textAlign: 'center' },
    ringText: { fontFamily: 'Tajawal-ExtraBold', color: THEME.text },
    
    centerStats: { flex: 1, paddingHorizontal: 8, justifyContent: 'center', gap: 15, paddingTop: 20 },
    statLine: { width: '100%', gap: 4 },
    statLabel: { textAlign: 'center', fontFamily: 'Tajawal-Regular', fontSize: 10, color: THEME.textDim },
    barContainer: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: THEME.surfaceHighlight, gap: 2 },
    barFill: { height: '100%', borderRadius: 3 },

    tabsContainer: { flexDirection: 'row-reverse', backgroundColor: THEME.surface, borderRadius: 12, padding: 4, marginBottom: 20 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabBtnActive: { backgroundColor: THEME.surfaceHighlight },
    tabText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: THEME.textMuted },
    tabTextActive: { fontFamily: 'Tajawal-Bold', color: THEME.primary },

    tabContent: { minHeight: 300 },
    card: { backgroundColor: THEME.glass, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 16 },
    cardTitle: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: THEME.text, marginBottom: 12, textAlign: 'right' },
    verdictText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18, color: THEME.primary, textAlign: 'right', marginBottom: 8 },
    verdictSub: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: THEME.textDim, textAlign: 'right', lineHeight: 20 },
    
    row: { flexDirection: 'row-reverse', gap: 10 },
    colHeader: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: THEME.gold, marginBottom: 8, textAlign: 'right' },
    bulletPoint: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: THEME.text, marginBottom: 4, textAlign: 'right' },
    
    breakdownItem: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 8, borderRightWidth: 3, paddingRight: 10, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4 },
    bdText: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: THEME.text, textAlign: 'right' },
    bdValue: { fontFamily: 'Tajawal-Bold', fontSize: 12, marginLeft: 10 },
    
    marketingItem: { marginBottom: 12 },
    mClaim: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: THEME.text, textAlign: 'right' },
    mStatus: { fontFamily: 'Tajawal-Bold', fontSize: 12, textAlign: 'right', marginVertical: 2 },
    mExp: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: THEME.textMuted, textAlign: 'right' },
    divider: { height: 1, backgroundColor: THEME.border, marginVertical: 10 },
    emptyText: { fontFamily: 'Tajawal-Regular', color: THEME.textMuted, textAlign: 'center' },

    // Buttons
    btnBase: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, width: '100%', elevation: 4 },
    btnPrimary: { backgroundColor: THEME.primary },
    btnSurface: { backgroundColor: THEME.surfaceHighlight, borderWidth: 1, borderColor: THEME.border },
    btnDisabled: { opacity: 0.5 },
    btnTextPrimary: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: '#000' },
    btnTextSurface: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: THEME.textDim },
    startBtn: { marginTop: 40 },
    finishBtn: { marginTop: 20 },
    resetBtn: { marginTop: 20, marginBottom: 40 },

    // Bubble
    instructionBubble: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(16, 185, 129, 0.9)', padding: 12, borderRadius: 30, flexDirection: 'row-reverse', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: {width:0,height:5}, shadowOpacity:0.3, shadowRadius:5 },
    instructionIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    instructionText: { flex: 1, fontFamily: 'Tajawal-Bold', fontSize: 12, color: '#000', textAlign: 'right' },
});