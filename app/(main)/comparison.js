import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet, View, Text, Dimensions,
    ScrollView, Animated, Platform, Alert, 
    UIManager, LayoutAnimation, FlatList, Pressable, Image, Easing, StatusBar,
    SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle } from 'react-native-svg';

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
//                       SYSTEM & THEME CONFIG
// ============================================================================

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

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
  success: '#22c55e',
  gold: '#fbbf24',
};

const MASTER_CLAIM_DEFINITIONS = [
    { claim: "مرطب للبشرة", category: "الترطيب والتغذية", icon: 'tint' },
    { claim: "للبشرة الجافة", category: "الترطيب والتغذية", icon: 'tint' },
    { claim: "مرطب للشعر", category: "الترطيب والتغذية", icon: 'tint' },
    { claim: "دعم حاجز البشرة", category: "الترطيب والتغذية", icon: 'shield-alt' },
    { claim: "مخصص للشعر الجاف", category: "صحة الشعر", icon: 'tint' },
    { claim: "تغذية الشعر", category: "صحة الشعر", icon: 'star' },
    { claim: "مضاد لتساقط الشعر", category: "صحة الشعر", icon: 'hourglass-half' },
    { claim: "تعزيز النمو", category: "صحة الشعر", icon: 'hourglass-half' },
    { claim: "تكثيف الشعر", category: "صحة الشعر", icon: 'hourglass-half' },
    { claim: "إصلاح التلف", category: "صحة الشعر", icon: 'hourglass-half' },
    { claim: "مخصص للشعر الدهني", category: "العناية بفروة الرأس", icon: 'soap' },
    { claim: "تنقية فروة الرأس", category: "العناية بفروة الرأس", icon: 'soap' },
    { claim: "مضاد للقشرة", category: "العناية بفروة الرأس", icon: 'soap' },
    { claim: "للبشرة الحساسة", category: "الحماية والتهدئة", icon: 'shield-alt' },
    { claim: "مهدئ", category: "الحماية والتهدئة", icon: 'shield-alt' },
    { claim: "مضاد للالتهابات", category: "الحماية والتهدئة", icon: 'shield-alt' },
    { claim: "مضاد للأكسدة", category: "الحماية والتهدئة", icon: 'shield-alt' },
    { claim: "حماية من الشمس", category: "الحماية المتقدمة", icon: 'sun' },
    { claim: "حماية اللون", category: "الحماية المتقدمة", icon: 'shield-alt' },
    { claim: "حماية واسعة الطيف", category: "الحماية المتقدمة", icon: 'shield-alt' },
    { claim: "مقاوم للماء", category: "الحماية المتقدمة", icon: 'shield-alt' },
    { claim: "حماية من الحرارة", category: "الحماية المتقدمة", icon: 'shield-alt' },
    { claim: "تفتيح البشرة", category: "نقاء البشرة", icon: 'star' },
    { claim: "توحيد لون البشرة", category: "نقاء البشرة", icon: 'star' },
    { claim: "تفتيح البقع الداكنة", category: "نقاء البشرة", icon: 'star' },
    { claim: "تفتيح تحت العين", category: "نقاء البشرة", icon: 'star' },
    { claim: "تلميع ولمعان", category: "مظهر الشعر", icon: 'star' },
    { claim: "مكافحة التجعد", category: "مظهر الشعر", icon: 'star' },
    { claim: "تنقية المسام", category: "التنظيف والتقشير", icon: 'soap' },
    { claim: "مضاد لحب الشباب", category: "العناية بالبشرة الدهنية", icon: 'soap' },
    { claim: "للبشرة الدهنية", category: "العناية بالبشرة الدهنية", icon: 'soap' },
    { claim: "توازن الزيوت", category: "العناية بالبشرة الدهنية", icon: 'soap' },
    { claim: "مكافحة التجاعيد", category: "مكافحة الشيخوخة", icon: 'hourglass-half' },
    { claim: "شد البشرة", category: "مكافحة الشيخوخة", icon: 'hourglass-half' },
    { claim: "تحفيز الكولاجين", category: "مكافحة الشيخوخة", icon: 'hourglass-half' },
];

// ============================================================================
//                       REUSABLE ANIMATED COMPONENTS
// ============================================================================

const Spore = ({ size, startX, duration, delay }) => {
    const animY = useRef(new Animated.Value(0)).current; 
    const animX = useRef(new Animated.Value(0)).current; 
    const opacity = useRef(new Animated.Value(0)).current;
  
    useEffect(() => {
      Animated.loop(Animated.timing(animY, { toValue: 1, duration, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true })).start();
      Animated.loop(Animated.sequence([
          Animated.timing(animX, { toValue: 1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin }),
          Animated.timing(animX, { toValue: -1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin }),
          Animated.timing(animX, { toValue: 0, duration: duration * 0.3, useNativeDriver: true, easing: Easing.sin }),
      ])).start();
      Animated.loop(Animated.sequence([
          Animated.timing(opacity, { toValue: 0.6, duration: duration * 0.2, useNativeDriver: true }),
          Animated.delay(duration * 0.6),
          Animated.timing(opacity, { toValue: 0.2, duration: duration * 0.2, useNativeDriver: true }),
      ])).start();
    }, []);
  
    const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [height + 100, -100] });
    const translateX = animX.interpolate({ inputRange: [-1, 1], outputRange: [-35, 35] });
  
    return (
      <Animated.View style={{ 
          position: 'absolute', width: size, height: size, borderRadius: size/2, 
          backgroundColor: COLORS.accentGlow,
          transform: [{ translateY }, { translateX }], opacity, left: startX, zIndex: -1
      }} />
    );
};

const PressableScale = ({ onPress, children, style, disabled }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const pressIn = () => !disabled && Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
    const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    return (
        <Pressable 
            onPress={() => { if (onPress && !disabled) { Haptics.selectionAsync(); onPress(); } }} 
            onPressIn={pressIn} onPressOut={pressOut} disabled={disabled} style={style}
        >
            <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
        </Pressable>
    );
};

const ContentCard = ({ children, style }) => (
    <View style={[styles.cardBase, style]}>{children}</View>
);

const FadeInUp = ({ children, delay = 0, style }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(anim, { toValue: 1, friction: 8, tension: 40, delay, useNativeDriver: true }).start();
    }, []);
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
    return <Animated.View style={[{ opacity: anim, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
};

// ============================================================================
//                       STEP-BY-STEP UI COMPONENTS
// ============================================================================

const IntroStep = ({ onStart }) => (
    <View style={styles.stepContainer}>
        <FadeInUp>
            <View style={styles.introHeader}>
                <View style={styles.introIconContainer}>
                    <MaterialCommunityIcons name="scale-balance" size={48} color={COLORS.accentGreen} />
                </View>
                <Text style={styles.introTitle}>ساحة المقارنة</Text>
                <Text style={styles.introSubtitle}>احترت بين منتجين؟ قارن بينهما الآن بذكاء اصطناعي يكشف أدق التفاصيل.</Text>
            </View>
        </FadeInUp>

        <FadeInUp delay={200} style={{ width: '100%', alignItems: 'center' }}>
            <PressableScale onPress={onStart} style={styles.riftActivator}>
                <LinearGradient colors={[COLORS.card, '#1e332c']} style={styles.riftContent}>
                    <View style={styles.pulseRing} />
                    <FontAwesome5 name="plus" style={styles.riftIcon} />
                    <Text style={styles.riftText}>ابدأ المقارنة</Text>
                    <Text style={styles.riftSub}>اضغط لإضافة المتنافسين</Text>
                </LinearGradient>
            </PressableScale>
        </FadeInUp>
    </View>
);

const ProductInputSlot = ({ product, onUpdate, placeholderText, title, isDisabled }) => {
    const handleSelect = async (mode) => {
        if (isDisabled) return;
        Haptics.selectionAsync();
        try {
            const pickerFunction = mode === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
            const result = await pickerFunction({ quality: 0.8, allowsEditing: false, mediaTypes: ImagePicker.MediaTypeOptions.Images });
            if (!result.canceled && result.assets[0].uri) {
                onUpdate({ sourceData: result.assets[0].uri, sourceType: 'ocr', error: null });
            }
        } catch (error) {
            Alert.alert("خطأ", "لم نتمكن من الوصول للصور.");
        }
    };

    const handleReset = () => {
        if (isDisabled) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onUpdate({ sourceData: null, sourceType: null, error: null, analysisData: null });
    };

    return (
        <View style={styles.slotWrapper}>
             <Text style={styles.slotTitle}>{title}</Text>
            {product.error ? (
                <PressableScale onPress={handleReset} style={[styles.slotContainer, styles.slotError]}>
                    <FontAwesome5 name="exclamation-triangle" size={24} color={COLORS.danger} />
                    <Text style={styles.slotErrorText}>{product.error}</Text>
                    <Text style={styles.slotErrorSubtext}>اضغط للمحاولة مجدداً</Text>
                </PressableScale>
            ) : product.sourceData ? (
                <View style={styles.slotContainer}>
                    <Image source={{ uri: product.sourceData }} style={styles.slotPreviewImage} />
                    <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.slotOverlay} />
                    <PressableScale onPress={handleReset} style={styles.slotResetButton}>
                        <FontAwesome5 name="times" size={12} color={COLORS.textPrimary} />
                    </PressableScale>
                    <View style={styles.slotCheckmark}>
                         <FontAwesome5 name="check" size={10} color={COLORS.card} />
                    </View>
                </View>
            ) : (
                <View style={[styles.slotContainer, styles.slotEmpty]}>
                    <View style={styles.slotDashedBorder} />
                    <Text style={styles.slotPlaceholder}>{placeholderText}</Text>
                    <View style={styles.slotButtonRow}>
                        <PressableScale onPress={() => handleSelect('gallery')} style={styles.slotButton}>
                            <FontAwesome5 name="images" size={16} color={COLORS.accentGreen} />
                        </PressableScale>
                        <PressableScale onPress={() => handleSelect('camera')} style={styles.slotButton}>
                            <FontAwesome5 name="camera" size={16} color={COLORS.accentGreen} />
                        </PressableScale>
                    </View>
                </View>
            )}
        </View>
    );
};

const InputStep = ({ productLeft, setProductLeft, productRight, setProductRight }) => (
    <View style={styles.stepContainer}>
        <FadeInUp>
            <View style={styles.inputHeader}>
                <Text style={styles.stepTitle}>اختر المتحدّين</Text>
                <Text style={styles.stepSubtitle}>أضف صورة لمكونات كل منتج لبدء التحليل.</Text>
            </View>
        </FadeInUp>
        
        {/* Adjusted to be percentage based for responsiveness */}
        <View style={styles.inputArena}>
            <FadeInUp delay={100} style={{ width: '42%' }}>
                 <ProductInputSlot product={productLeft} onUpdate={setProductLeft} title="المنتج (أ)" placeholderText="المنتج الأول" />
            </FadeInUp>
            <View style={styles.vsContainer}>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.vsLine} />
            </View>
            <FadeInUp delay={200} style={{ width: '42%' }}>
                <ProductInputSlot product={productRight} onUpdate={setProductRight} title="المنتج (ب)" placeholderText="المنتج الثاني" />
            </FadeInUp>
        </View>
    </View>
);

const ScanningLoader = ({ progressText }) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })).start();
    }, []);

    const rotation = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const reverseRotation = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

    return (
        <View style={[styles.stepContainer, {justifyContent: 'center'}]}>
            <View style={styles.loaderContainer}>
                <Animated.View style={[styles.loaderRing, { transform: [{ rotate: rotation }] }]}>
                    <LinearGradient colors={[COLORS.accentGreen, 'transparent', COLORS.accentGreen]} style={StyleSheet.absoluteFill} start={{x:0, y:0}} end={{x:1, y:1}} />
                </Animated.View>
                <Animated.View style={[styles.loaderRingInner, { transform: [{ rotate: reverseRotation }] }]}>
                     <View style={styles.loaderDot} />
                </Animated.View>
                <View style={styles.loaderCenter}>
                     <FontAwesome5 name="flask" size={32} color={COLORS.accentGreen} />
                </View>
            </View>
            <FadeInUp delay={300}>
                <Text style={styles.loadingText}>{progressText}</Text>
                <Text style={styles.loadingSubtitle}>يقوم الذكاء الاصطناعي بتحليل كل مركب...</Text>
            </FadeInUp>
        </View>
    );
};

const TypeConfirmationStep = ({ detectedType, onConfirm }) => {
    const productTypes = [
        { id: 'shampoo', name: 'شامبو / بلسم', icon: 'soap' },
        { id: 'serum', name: 'سيروم / علاج', icon: 'flask' },
        { id: 'lotion_cream', name: 'كريم / مرطب', icon: 'tint' },
        { id: 'sunscreen', name: 'واقي شمس', icon: 'sun' },
        { id: 'cleanser', name: 'غسول', icon: 'hands-wash' },
        { id: 'hair_mask', name: 'ماسك شعر', icon: 'star' },
        { id: 'other', name: 'آخر', icon: 'box-open' },
    ];
    const [selectedType, setSelectedType] = useState(detectedType || 'other');
    const detectedProduct = productTypes.find(t => t.id === selectedType);

    return (
        <View style={styles.stepContainer}>
            <FadeInUp>
                <ContentCard style={styles.glassCard}>
                    <Text style={styles.stepTitle}>تأكيد نوع المنتج</Text>
                    <Text style={styles.stepSubtitle}>ساعدنا في تحسين دقة المقارنة.</Text>
                    
                    <View style={styles.autoTypeBox}>
                        <View style={styles.autoTypeIconCircle}>
                             <FontAwesome5 name={detectedProduct?.icon || 'flask'} size={40} color={COLORS.accentGreen} />
                        </View>
                        <Text style={styles.autoTypeName}>{detectedProduct?.name || 'غير معروف'}</Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 60, marginBottom: 20 }}>
                         {productTypes.map(type => (
                             <PressableScale key={type.id} onPress={() => setSelectedType(type.id)} style={[styles.typePill, selectedType === type.id && styles.typePillActive]}>
                                 <Text style={[styles.typePillText, selectedType === type.id && styles.typePillTextActive]}>{type.name}</Text>
                             </PressableScale>
                         ))}
                    </ScrollView>

                    <PressableScale onPress={() => onConfirm(selectedType)} style={styles.ctaButton}>
                        <Text style={styles.ctaButtonText}>تأكيد والمتابعة</Text>
                        <FontAwesome5 name="arrow-left" size={16} color={COLORS.textOnAccent} />
                    </PressableScale>
                </ContentCard>
            </FadeInUp>
        </View>
    );
};


const ClaimCard = ({ item, isActive, onPress, selectedClaims, onClaimPress }) => {
    const scale = useRef(new Animated.Value(isActive ? 1 : 0.95)).current;
    const opacity = useRef(new Animated.Value(isActive ? 1 : 0.7)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, { toValue: isActive ? 1 : 0.95, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: isActive ? 1 : 0.7, duration: 200, useNativeDriver: true })
        ]).start();
    }, [isActive]);

    return(
        <Pressable onPress={onPress}>
            <Animated.View style={[styles.claimCardContainer, { transform: [{ scale }], opacity, width: width * 0.85 }]}>
                <View style={[styles.claimCard, isActive && styles.claimCardActive]}>
                     <LinearGradient colors={[COLORS.card, isActive ? '#2f4f43' : COLORS.card]} style={StyleSheet.absoluteFill} />
                     <View style={styles.claimCardHeader}>
                        <View style={[styles.claimIconBox, isActive && styles.claimIconBoxActive]}>
                            <FontAwesome5 name={item.icon} size={20} color={isActive ? COLORS.textOnAccent : COLORS.textSecondary} />
                        </View>
                        <Text style={styles.claimCardTitle}>{item.category}</Text>
                    </View>
                    
                    <View style={styles.claimCardDivider} />
                    
                    <ScrollView nestedScrollEnabled style={{ height: 200 }} contentContainerStyle={styles.claimCardContent}>
                        {item.claims.map(claim => {
                            const isSelected = selectedClaims.includes(claim);
                            return (
                                <PressableScale key={claim} onPress={() => onClaimPress(claim)}>
                                    <View style={[styles.claimChip, isSelected && styles.claimChipActive]}>
                                        {isSelected && <FontAwesome5 name="check" size={10} color={COLORS.textOnAccent} />}
                                        <Text style={[styles.claimChipText, isSelected && styles.claimChipTextActive]}>{claim}</Text>
                                    </View>
                                </PressableScale>
                            );
                        })}
                    </ScrollView>
                </View>
            </Animated.View>
        </Pressable>
    );
}

const ClaimsStep = ({ productType, selectedClaims, setSelectedClaims, onAnalyze }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef(null);

    const availableCategories = useMemo(() => {
        const allowedClaims = getClaimsByProductType(productType);
        const allowedClaimsSet = new Set(allowedClaims);
        const productSpecificCategories = {};
        MASTER_CLAIM_DEFINITIONS.forEach(def => {
            if (allowedClaimsSet.has(def.claim)) {
                if (!productSpecificCategories[def.category]) {
                    productSpecificCategories[def.category] = { icon: def.icon, claims: [], category: def.category };
                }
                productSpecificCategories[def.category].claims.push(def.claim);
            }
        });
        return Object.values(productSpecificCategories);
    }, [productType]);

    const handleClaimClick = (claim) => {
        Haptics.selectionAsync();
        const newClaims = selectedClaims.includes(claim) ? selectedClaims.filter(c => c !== claim) : [...selectedClaims, claim];
        setSelectedClaims(newClaims);
    };

    const handleSnap = (event) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / (width * 0.85));
        setActiveIndex(index);
    };

    const scrollToIndex = (index) => {
        if(index < 0 || index >= availableCategories.length) return;
        setActiveIndex(index);
        flatListRef.current?.scrollToIndex({ animated: true, index, viewOffset: (width - width * 0.85)/2 });
    };

    return (
        <View style={styles.claimsPageContainer}>
            <FadeInUp>
                <View style={styles.claimsHeader}>
                    <Text style={styles.stepTitle}>ما الذي يهمك؟</Text>
                    <Text style={styles.stepSubtitle}>اختر المعايير التي تريد التحقق منها.</Text>
                </View>
            </FadeInUp>

            <View style={{height: 350}}>
                <FlatList
                    ref={flatListRef}
                    data={availableCategories}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item.category}
                    contentContainerStyle={styles.claimsCarouselContainer}
                    snapToInterval={width * 0.85}
                    decelerationRate="fast"
                    onMomentumScrollEnd={handleSnap}
                    renderItem={({ item, index }) => (
                        <ClaimCard
                            item={item}
                            isActive={index === activeIndex}
                            onPress={() => scrollToIndex(index)}
                            selectedClaims={selectedClaims}
                            onClaimPress={handleClaimClick}
                        />
                    )}
                    ListFooterComponent={<View style={{width: (width - width * 0.85)/2}} />}
                    ListHeaderComponent={<View style={{width: (width - width * 0.85)/2}} />}
                />
            </View>
             
             <FadeInUp delay={200} style={styles.footer}>
                <View style={styles.paginator}>
                     {availableCategories.map((_, i) => (
                         <View key={i} style={[styles.paginatorDot, i === activeIndex && styles.paginatorDotActive]} />
                     ))}
                </View>
                <PressableScale onPress={onAnalyze} style={[styles.ctaButton, selectedClaims.length === 0 && {opacity: 0.5}]} disabled={selectedClaims.length === 0}>
                    <Text style={styles.ctaButtonText}>
                        {selectedClaims.length > 0 ? `قارن (${selectedClaims.length}) معايير` : 'اختر معياراً'}
                    </Text>
                    <FontAwesome5 name="balance-scale" size={16} color={COLORS.textOnAccent} />
                </PressableScale>
            </FadeInUp>
        </View>
    );
};

// --- NEW RESULT VISUALIZATIONS ---
const ComparisonBar = ({ leftValue, rightValue, label }) => {
    const total = (leftValue || 0) + (rightValue || 0);
    const leftPercent = total > 0 ? ((leftValue || 0) / total) * 100 : 50;
    
    // Animation for bar fill
    const fillAnim = useRef(new Animated.Value(50)).current;
    useEffect(() => {
        Animated.timing(fillAnim, { toValue: leftPercent, duration: 1000, delay: 500, useNativeDriver: false }).start();
    }, [leftPercent]);

    return (
        <View style={styles.compBarContainer}>
            <View style={styles.compBarHeader}>
                <Text style={styles.compBarValue}>{leftValue || 0}%</Text>
                <Text style={styles.compBarLabel}>{label}</Text>
                <Text style={styles.compBarValue}>{rightValue || 0}%</Text>
            </View>
            <View style={styles.compTrack}>
                <Animated.View style={[styles.compFill, { width: fillAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
                <View style={styles.compDivider} />
            </View>
        </View>
    );
};

const ResultsStep = ({ productLeft, productRight, onReset }) => {
    const dataL = productLeft.analysisData;
    const dataR = productRight.analysisData;

    if (!dataL || !dataR) return <ScanningLoader progressText="خطأ في عرض النتائج..." />;

    const winner = useMemo(() => {
        if (Math.abs(dataL.oilGuardScore - dataR.oilGuardScore) < 5) return 'tie';
        return dataL.oilGuardScore > dataR.oilGuardScore ? 'left' : 'right';
    }, [dataL, dataR]);
    
    const renderWarnings = (analysisData) => {
        const alerts = (analysisData.scoreBreakdown || []).filter(item => ['deduction', 'warning', 'override'].includes(item.type));
        if (alerts.length === 0) return <View style={styles.safeBadge}><FontAwesome5 name="check-circle" color={COLORS.success} /><Text style={styles.safeBadgeText}>تركيبة نظيفة</Text></View>;
        return (
            <View style={styles.warningsList}>
                {alerts.slice(0, 3).map((alert, i) => (
                    <View key={i} style={[styles.warningItem, styles[`warningItem_${alert.type}`]]}>
                         <FontAwesome5 name="exclamation-circle" size={10} color={alert.type === 'deduction' ? COLORS.danger : COLORS.warning} />
                         <Text style={[styles.warningItemText, {color: alert.type === 'deduction' ? COLORS.danger : COLORS.warning}]} numberOfLines={2}>{alert.text.split(':')[0]}</Text>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <ScrollView style={{flex: 1, width: '100%'}} contentContainerStyle={styles.resultsContainer} showsVerticalScrollIndicator={false}>
            <FadeInUp>
                <View style={styles.resultsHeader}>
                    <Text style={styles.stepTitle}>النتيجة النهائية</Text>
                    <PressableScale onPress={onReset} style={styles.resetButton}>
                         <Text style={styles.resetButtonText}>مقارنة جديدة</Text>
                         <FontAwesome5 name="redo" size={12} color={COLORS.textPrimary} />
                    </PressableScale>
                </View>
            </FadeInUp>

            <FadeInUp delay={200}>
                {/* Changed fixed height to auto with minHeight to fix layout on phones */}
                <View style={styles.mainResultsContainer}>
                    {/* Product Left */}
                    <View style={[styles.resultProductCol, winner === 'left' && styles.winnerCol]}>
                        {winner === 'left' && <View style={styles.crownBadge}><FontAwesome5 name="crown" size={12} color={COLORS.gold} /></View>}
                        <Image source={{uri: productLeft.sourceData}} style={styles.resultImage} />
                        <Text style={styles.resultProductName} numberOfLines={1}>المنتج (أ)</Text>
                        
                        <View style={styles.scoreCircle}>
                             <Svg height="50" width="50" viewBox="0 0 100 100">
                                <Circle cx="50" cy="50" r="45" stroke={COLORS.border} strokeWidth="10" fill="transparent" />
                                <Circle cx="50" cy="50" r="45" stroke={dataL.oilGuardScore > 80 ? COLORS.success : dataL.oilGuardScore > 60 ? COLORS.warning : COLORS.danger} strokeWidth="10" fill="transparent" strokeDasharray={283} strokeDashoffset={283 - (283 * dataL.oilGuardScore) / 100} strokeLinecap="round" transform="rotate(-90 50 50)" />
                            </Svg>
                            <View style={styles.scoreTextAbs}><Text style={styles.scoreNumber}>{dataL.oilGuardScore}</Text></View>
                        </View>
                        
                        <View style={styles.verdictBox}>
                            <Text style={styles.verdictText}>{dataL.finalVerdict}</Text>
                        </View>
                        {renderWarnings(dataL)}
                    </View>

                    <View style={styles.centerDivider}>
                        <View style={styles.verticalLine} />
                        <View style={styles.vsBadgeSmall}><Text style={styles.vsTextSmall}>VS</Text></View>
                        <View style={styles.verticalLine} />
                    </View>

                    {/* Product Right */}
                    <View style={[styles.resultProductCol, winner === 'right' && styles.winnerCol]}>
                        {winner === 'right' && <View style={styles.crownBadge}><FontAwesome5 name="crown" size={12} color={COLORS.gold} /></View>}
                        <Image source={{uri: productRight.sourceData}} style={styles.resultImage} />
                        <Text style={styles.resultProductName} numberOfLines={1}>المنتج (ب)</Text>
                        
                        <View style={styles.scoreCircle}>
                             <Svg height="50" width="50" viewBox="0 0 100 100">
                                <Circle cx="50" cy="50" r="45" stroke={COLORS.border} strokeWidth="10" fill="transparent" />
                                <Circle cx="50" cy="50" r="45" stroke={dataR.oilGuardScore > 80 ? COLORS.success : dataR.oilGuardScore > 60 ? COLORS.warning : COLORS.danger} strokeWidth="10" fill="transparent" strokeDasharray={283} strokeDashoffset={283 - (283 * dataR.oilGuardScore) / 100} strokeLinecap="round" transform="rotate(-90 50 50)" />
                            </Svg>
                            <View style={styles.scoreTextAbs}><Text style={styles.scoreNumber}>{dataR.oilGuardScore}</Text></View>
                        </View>
                        
                        <View style={styles.verdictBox}>
                            <Text style={styles.verdictText}>{dataR.finalVerdict}</Text>
                        </View>
                        {renderWarnings(dataR)}
                    </View>
                </View>
            </FadeInUp>

            <FadeInUp delay={400}>
                <ContentCard style={styles.metricsCard}>
                    <Text style={styles.cardHeaderTitle}>مؤشرات الأداء</Text>
                    <ComparisonBar leftValue={dataL.efficacy.score} rightValue={dataR.efficacy.score} label="الفعالية" />
                    <ComparisonBar leftValue={dataL.safety.score} rightValue={dataR.safety.score} label="الأمان" />
                    
                    <View style={[styles.winnerBanner, winner === 'tie' ? styles.winnerBannerTie : {borderColor: COLORS.gold}]}>
                         <FontAwesome5 name={winner === 'tie' ? "balance-scale" : "trophy"} size={14} color={winner === 'tie' ? COLORS.textSecondary : COLORS.gold} />
                        <Text style={[styles.winnerBannerText, winner !== 'tie' && {color: COLORS.gold}]}>
                            {winner === 'left' && 'المنتج (أ) هو الخيار الأفضل'}
                            {winner === 'right' && 'المنتج (ب) هو الخيار الأفضل'}
                            {winner === 'tie' && 'التقييم متقارب جدًا'}
                        </Text>
                    </View>
                </ContentCard>
            </FadeInUp>
            <View style={{height: 100}} />
        </ScrollView>
    );
};

// ============================================================================
//                       MAIN PAGE COMPONENT
// ============================================================================

export default function ComparisonPage() {
    const particles = useMemo(() => [...Array(10)].map((_, i) => ({ 
        id: i, size: Math.random()*5+2, startX: Math.random()*width, duration: 8000+Math.random()*5000, delay: Math.random()*5000 
    })), []);

    const [currentStep, setCurrentStep] = useState(0);
    const [productType, setProductType] = useState(null);
    const [selectedClaims, setSelectedClaims] = useState([]);
    const [analysisProgress, setAnalysisProgress] = useState('جاري تحليل المنتجين...');
    const [analysisLock, setAnalysisLock] = useState(false);

    const initialProductState = { sourceData: null, sourceType: null, analysisData: null, error: null };
    const [productLeft, setProductLeft] = useState(initialProductState);
    const [productRight, setProductRight] = useState(initialProductState);

    const updateProductLeft = (updates) => setProductLeft(p => ({ ...p, ...updates }));
    const updateProductRight = (updates) => setProductRight(p => ({ ...p, ...updates }));

    const handleStartAnalysis = async () => {
        if (analysisLock) return;
        setAnalysisLock(true);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCurrentStep(2);

        updateProductLeft({ error: null });
        updateProductRight({ error: null });
        try {
            setAnalysisProgress('جاري استخلاص المكونات (1/2)...');
            const leftResult = await runSingleAnalysis(productLeft, updateProductLeft);
            updateProductLeft({ analysisData: { detected_ingredients: leftResult.ingredients } });
            setProductType(leftResult.productType); 

            setAnalysisProgress('جاري استخلاص المكونات (2/2)...');
            const rightResult = await runSingleAnalysis(productRight, updateProductRight);
            updateProductRight({ analysisData: { detected_ingredients: rightResult.ingredients } });
            
            setAnalysisProgress('اكتمل الاستخلاص!');
            await new Promise(res => setTimeout(res, 800));
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setCurrentStep(3);
        } catch (error) {
            console.error("Analysis Sequence failed:", error);
            setAnalysisLock(false);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setCurrentStep(1);
            Alert.alert(`حدث خطأ أثناء التحليل`, error.message || "يرجى التحقق من الاتصال والمحاولة مرة أخرى.");
        }
    };

    useEffect(() => {
        if (productLeft.sourceData && productRight.sourceData && currentStep === 1 && !analysisLock) {
            handleStartAnalysis();
        }
    }, [productLeft.sourceData, productRight.sourceData, analysisLock, currentStep]);


    const runSingleAnalysis = async (productState, updateCallback) => {
        if (productState.sourceType !== 'ocr' || !productState.sourceData) {
            throw new Error("بيانات المنتج غير صالحة للتحليل.");
        }
        try {
            const imagePart = await createGenerativePartFromUri(productState.sourceData);
            const geminiResult = await processWithGemini(imagePart);
            const { ingredients } = await extractIngredientsFromText(geminiResult.ingredientsText);
            if (ingredients.length === 0) {
                 const err = new Error("لم يتم العثور على مكونات معروفة.");
                 updateCallback({error: "لم نجد مكونات."});
                 throw err;
            }
            return { ingredients, productType: geminiResult.productType };
        } catch (error) {
            console.error("Single Analysis Failed:", error);
            const errText = error.message.includes("مكونات") ? error.message : "فشل تحليل الصورة.";
            updateCallback({error: errText});
            throw error;
        }
    };
    
    const handleTypeConfirmed = (confirmedType) => {
        setProductType(confirmedType);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCurrentStep(4);
    };
    
    const handleFinalizeComparison = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setCurrentStep(2); // Show loading screen for final calculation
        setAnalysisProgress('جاري حساب النقاط والمقارنة النهائية...');
        setTimeout(() => {
            try {
                const finalize = (product) => {
                    const { detected_ingredients } = product.analysisData;
                    const marketingResults = evaluateMarketingClaims(detected_ingredients, selectedClaims, productType);
                    const { conflicts, userAlerts } = analyzeIngredientInteractions(detected_ingredients, {}); 
                    const finalScores = calculateReliabilityScore_V13(detected_ingredients, conflicts, userAlerts, marketingResults, productType);
                    return {
                        ...product,
                        analysisData: { ...product.analysisData, ...finalScores, marketing_results: marketingResults }
                    };
                };
                updateProductLeft(finalize(productLeft));
                updateProductRight(finalize(productRight));
                
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setCurrentStep(5);
            } catch(e) {
                console.error("Finalize Error:", e);
                Alert.alert("خطأ", "تعذر إكمال المقارنة.");
                handleReset();
            }
        }, 1500);
    };

    const handleReset = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setProductLeft(initialProductState);
        setProductRight(initialProductState);
        setSelectedClaims([]);
        setProductType(null);
        setAnalysisLock(false);
        setCurrentStep(0);
    };
    
    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0: return <IntroStep onStart={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCurrentStep(1); }} />;
            case 1: return <InputStep productLeft={productLeft} setProductLeft={updateProductLeft} productRight={productRight} setProductRight={updateProductRight} />;
            case 2: return <ScanningLoader progressText={analysisProgress} />;
            case 3: return <TypeConfirmationStep detectedType={productType} onConfirm={handleTypeConfirmed} />;
            case 4: return <ClaimsStep productType={productType} selectedClaims={selectedClaims} setSelectedClaims={setSelectedClaims} onAnalyze={handleFinalizeComparison} />;
            case 5: return <ResultsStep productLeft={productLeft} productRight={productRight} onReset={handleReset} />;
            default: return <IntroStep onStart={() => setCurrentStep(1)} />;
        }
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            {particles.map((p) => <Spore key={p.id} {...p} />)}
            {renderCurrentStep()}
        </SafeAreaView>
    );
}

// ============================================================================
//                       STYLESHEET
// ============================================================================

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    stepContainer: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-start', padding: 20 },
    cardBase: { backgroundColor: COLORS.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border },
    
    // --- Typography ---
    stepTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 28, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8, marginTop: 10 },
    stepSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    
    // --- Intro Step ---
    introHeader: { alignItems: 'center', marginBottom: 40, marginTop: 60 },
    introIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(90, 156, 132, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: COLORS.accentGlow },
    introTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 32, color: COLORS.textPrimary, textAlign: 'center' },
    introSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 24, maxWidth: 300 },
    
    riftActivator: { width: width * 0.85, height: height * 0.35, borderRadius: 30, overflow: 'hidden' },
    riftContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15, borderWidth: 1, borderColor: COLORS.accentGreen, borderRadius: 30 },
    pulseRing: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: COLORS.accentGlow, opacity: 0.3 },
    riftIcon: { fontSize: 32, color: COLORS.textPrimary },
    riftText: { fontFamily: 'Tajawal-Bold', fontSize: 20, color: COLORS.textPrimary },
    riftSub: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.accentGreen },

    // --- Input Step ---
    inputHeader: { alignItems: 'center', width: '100%', marginTop: 20 },
    inputArena: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 20, flex: 1 },
    slotWrapper: { aspectRatio: 0.7, width: '100%', gap: 10 },
    slotTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
    slotContainer: { flex: 1, borderRadius: 20, overflow: 'hidden', position: 'relative' },
    slotEmpty: { backgroundColor: 'rgba(37, 61, 52, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 10, height: '100%' },
    slotDashedBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 20 },
    slotPlaceholder: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, marginBottom: 20, textAlign: 'center' },
    slotButtonRow: { flexDirection: 'row', gap: 12 },
    slotButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    slotPreviewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    slotOverlay: { ...StyleSheet.absoluteFillObject },
    slotResetButton: { position: 'absolute', top: 10, left: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
    slotCheckmark: { position: 'absolute', bottom: 10, right: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
    slotError: { backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.danger, height: '100%' },
    slotErrorText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.danger, textAlign: 'center' },
    slotErrorSubtext: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.textSecondary },
    vsContainer: { alignItems: 'center', justifyContent: 'center', height: '100%', gap: 5, width: '16%' },
    vsText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18, color: COLORS.accentGreen },
    vsLine: { width: 1, height: 40, backgroundColor: COLORS.border },

    // --- Loading Step ---
    loaderContainer: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
    loaderRing: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: 'transparent', borderTopColor: COLORS.accentGreen },
    loaderRingInner: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: COLORS.border },
    loaderDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accentGreen, position: 'absolute', top: -5, left: 40 },
    loaderCenter: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(90, 156, 132, 0.1)', alignItems: 'center', justifyContent: 'center' },
    loadingText: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: COLORS.textPrimary, textAlign: 'center' },
    loadingSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },

    // --- Type Step ---
    glassCard: { width: '100%', paddingVertical: 30, alignItems: 'center', marginTop: 40 },
    autoTypeBox: { alignItems: 'center', gap: 15, marginVertical: 25 },
    autoTypeIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(90, 156, 132, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.accentGlow },
    autoTypeName: { fontFamily: 'Tajawal-Bold', fontSize: 22, color: COLORS.textPrimary },
    typePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 4, height: 40, justifyContent: 'center' },
    typePillActive: { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen },
    typePillText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary },
    typePillTextActive: { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold' },
    ctaButton: { flexDirection: 'row-reverse', backgroundColor: COLORS.accentGreen, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%' },
    ctaButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textOnAccent },

    // --- Claims Step ---
    claimsPageContainer: { flex: 1, width: '100%', paddingTop: 20 },
    claimsHeader: { paddingHorizontal: 20, alignItems: 'center' },
    claimsCarouselContainer: { paddingVertical: 20, alignItems: 'center' },
    claimCardContainer: { marginHorizontal: 10, justifyContent: 'center', alignItems: 'center' },
    claimCard: { width: '100%', backgroundColor: COLORS.card, borderRadius: 24, overflow: 'hidden', height: 350, borderWidth: 1, borderColor: COLORS.border, padding: 0 },
    claimCardActive: { borderColor: COLORS.accentGreen, borderWidth: 1.5 },
    claimCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, padding: 20 },
    claimIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
    claimIconBoxActive: { backgroundColor: COLORS.accentGreen },
    claimCardTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: COLORS.textPrimary },
    claimCardDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20 },
    claimCardContent: { padding: 20, gap: 12, flexWrap: 'wrap', flexDirection: 'row-reverse', justifyContent: 'center' },
    claimChip: { flexDirection: 'row-reverse', gap: 8, alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
    claimChipActive: { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen },
    claimChipText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary },
    claimChipTextActive: { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold' },
    footer: { padding: 20, width: '100%', alignItems: 'center' },
    paginator: { flexDirection: 'row', gap: 6, marginBottom: 15 },
    paginatorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
    paginatorDotActive: { backgroundColor: COLORS.accentGreen, width: 20 },

    // --- Results Step ---
    resultsContainer: { width: '100%', paddingHorizontal: 15 },
    resultsHeader: { width: '100%', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 20 },
    resetButton: { flexDirection: 'row-reverse', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
    resetButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textSecondary },
    mainResultsContainer: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'stretch', minHeight: 250 },
    resultProductCol: { flex: 1, backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', padding: 10, justifyContent: 'flex-start', position: 'relative' },
    winnerCol: { borderColor: COLORS.gold, backgroundColor: 'rgba(251, 191, 36, 0.05)' },
    crownBadge: { position: 'absolute', top: -12, backgroundColor: COLORS.card, padding: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.gold, zIndex: 10 },
    resultImage: { width: 60, height: 60, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
    resultProductName: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textPrimary, marginBottom: 10 },
    scoreCircle: { marginBottom: 15, alignItems: 'center', justifyContent: 'center' },
    scoreTextAbs: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    scoreNumber: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, color: COLORS.textPrimary },
    verdictBox: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 8, width: '100%', marginBottom: 10 },
    verdictText: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
    centerDivider: { width: 10, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
    verticalLine: { flex: 1, width: 1, backgroundColor: COLORS.border },
    vsBadgeSmall: { backgroundColor: COLORS.background, padding: 2, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border, marginVertical: 5 },
    vsTextSmall: { fontSize: 10, fontFamily: 'Tajawal-ExtraBold', color: COLORS.accentGreen },
    
    // Warnings in Result
    warningsList: { width: '100%', gap: 4 },
    warningItem: { flexDirection: 'row-reverse', gap: 4, alignItems: 'center', padding: 4, borderRadius: 6 },
    warningItem_deduction: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    warningItem_warning: { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
    warningItemText: { fontFamily: 'Tajawal-Regular', fontSize: 9, flex: 1, textAlign: 'right' },
    safeBadge: { marginTop: 5, flexDirection: 'row-reverse', gap: 4, alignItems: 'center', padding: 6, borderRadius: 6, backgroundColor: 'rgba(34, 197, 94, 0.1)', alignSelf: 'center' },
    safeBadgeText: { color: COLORS.success, fontSize: 10, fontFamily: 'Tajawal-Bold' },

    // Metrics Card
    metricsCard: { marginTop: 20, width: '100%', padding: 20 },
    cardHeaderTitle: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, marginBottom: 15, textAlign: 'right' },
    compBarContainer: { marginBottom: 15 },
    compBarHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 6 },
    compBarLabel: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary },
    compBarValue: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textPrimary },
    compTrack: { width: '100%', height: 8, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden', flexDirection: 'row-reverse' },
    compFill: { height: '100%', backgroundColor: COLORS.accentGreen },
    compDivider: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, backgroundColor: COLORS.card },
    
    winnerBanner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 1, marginTop: 10 },
    winnerBannerTie: { backgroundColor: COLORS.background, borderColor: COLORS.border },
    winnerBannerText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textSecondary, flex: 1, textAlign: 'right' },
});