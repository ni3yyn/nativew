import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, Dimensions, Image, TouchableWithoutFeedback, InteractionManager,
  ScrollView, Animated, ImageBackground, Platform, ActivityIndicator, Keyboard, KeyboardAvoidingView,
  Alert, UIManager, LayoutAnimation, StatusBar, TextInput, Modal, Pressable, I18nManager,
  RefreshControl, Easing, FlatList, PanResponder, Vibration, StyleSheet, NativeModules
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Image as RNImage, } from 'react-native';
import Svg, { Circle, Path, Defs, ClipPath, Rect, Mask, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useRouter, useIsFocused } from 'expo-router';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../src/config/firebase';
import { useAppContext } from '../../src/context/AppContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as NavigationBar from 'expo-navigation-bar';
import Fuse from 'fuse.js';

// ... other imports
import { PremiumShareButton } from '../../src/components/oilguard/ShareComponent'; // Adjust path if needed
import { uploadImageToCloudinary, compressImage } from '../../src/services/imageService'; 
import { AlertService } from '../../src/services/alertService';
import { uriToBase64 } from '../../src/utils/formatters';
import { PRODUCT_TYPES, getClaimsByProductType } from '../../src/constants/productData';
import CustomCameraModal from '../../src/components/oilguard/CustomCameraModal'; // <--- NEW IMPORT
import ImageCropperModal from '../../src/components/oilguard/ImageCropperModal';
import ActionRow from '../../src/components/oilguard/ActionRow'; // Adjust path if needed
import LoadingScreen from '../../src/components/oilguard/LoadingScreen'; // Adjust path if needed
import { ReviewStep } from '../../src/components/oilguard/ReviewStep'; // Adjust path
import ManualInputSheet from '../../src/components/oilguard/ManualInputSheet';
import ScoreBreakdownModal from '../../src/components/oilguard/ScoreBreakdownModal'; // <--- ADD THIS

// --- DATA IMPORTS REMOVED: LOGIC IS NOW ON SERVER ---

// --- STYLE & CONSTANT IMPORTS ---
import { 
  styles, COLORS, width, height, 
  ITEM_WIDTH, SEPARATOR_WIDTH, CARD_WIDTH,
  DOT_SIZE, PAGINATION_DOTS, DOT_SPACING
} from '../../src/components/oilguard/oilguard.styles';

// ENDPOINTS
const VERCEL_BACKEND_URL = "https://oilguard-backend.vercel.app/api/analyze.js"; // OR api/scan
const VERCEL_EVALUATE_URL = "https://oilguard-backend.vercel.app/api/evaluate.js";
const VERCEL_PARSE_TEXT_URL = "https://oilguard-backend.vercel.app/api/parse-text.js"; // <--- ADD THIS

// --- HELPER FUNCTIONS ---
const normalizeForMatching = (name) => {
  if (!name) return '';
  return name.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
    .replace(/[.,،؛:()|[\]/%!@#$^&*_+={}<>?~`"'\\]/g, ' ') 
    .replace(/[^a-zA-Z0-9\u0600-\u06FF\s-]/g, ' ') 
    .replace(/\s+/g, ' ') 
    .trim();
};
let useInterstitialAd;
let TestIds = { INTERSTITIAL: 'ca-app-pub-7808816060487731/8992297454' }; // Default dummy ID

// 2. Check environment
const isAdMobLinked = !!NativeModules.RNGoogleMobileAdsModule;

if (isAdMobLinked) {
    // REAL: If native code exists, import the real library
    const adMob = require('react-native-google-mobile-ads');
    useInterstitialAd = adMob.useInterstitialAd;
    TestIds = adMob.TestIds;
} else {
    // FAKE: If in Expo Go, use this dummy hook that does nothing
    console.log("Running in Expo Go: Ads are mocked.");
    useInterstitialAd = () => ({
        isLoaded: false,
        isClosed: false,
        load: () => console.log("Mock Ad Loaded"),
        show: () => console.log("Mock Ad Shown (No real ad)"),
        error: null
    });
}

// --- LOGIC MOVED TO SERVER: These functions were removed to protect IP ---

// ============================================================================
//                       ANIMATION & UI COMPONENTS
// ============================================================================
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

const ContentCard = ({ children, style, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start(); }, []);
  return (
    <Animated.View style={[styles.cardBase, { opacity }, style]}>
      {children}
    </Animated.View>
  );
};

const StaggeredItem = ({ index, children, style }) => {
    const anim = useRef(new Animated.Value(0)).current;
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
    useEffect(() => { Animated.spring(anim, { toValue: 1, friction: 7, tension: 40, delay: index * 60, useNativeDriver: true }).start(); }, []);
    return ( <Animated.View style={[{ opacity: anim, transform: [{ translateY }] }, style]}>{children}</Animated.View> );
};

const ScoreRing = ({ score = 0, size = 160 }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const r = (size / 2) - 10;
    const circ = 2 * Math.PI * r;
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        const listener = animatedValue.addListener(({ value }) => setDisplayScore(Math.round(value)));
        Animated.timing(animatedValue, { toValue: score, duration: 1500, easing: Easing.out(Easing.exp), useNativeDriver: false }).start();
        return () => animatedValue.removeListener(listener);
    }, [score]);

    const strokeDashoffset = circ - ((displayScore / 100) * circ);
    const ringColor = score >= 80 ? COLORS.success : score >= 65 ? COLORS.warning : COLORS.danger;

    return (
        <View style={{width: size, height: size, alignItems:'center', justifyContent:'center'}}>
            <Svg width={size} height={size} style={{transform:[{rotate:'-90deg'}]}}>
                <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="14" fill="none"/>
                <Circle cx={size/2} cy={size/2} r={r} stroke={ringColor} strokeWidth="14" fill="none" strokeDasharray={circ} strokeDashoffset={strokeDashoffset} strokeLinecap="round"/>
            </Svg>
            <View style={{position:'absolute', alignItems:'center'}}>
                <Text style={{fontFamily:'Tajawal-ExtraBold', fontSize: size * 0.25, color: ringColor}}>{displayScore}%</Text>
            </View>
        </View>
    );
};

const ConfidenceRing = ({ confidence }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  const confidenceMap = {
      'عالية': { value: 100, color: COLORS.success },
      'متوسطة': { value: 65, color: COLORS.gold },
      'منخفضة': { value: 35, color: COLORS.warning },
      'منخفضة جدا': { value: 15, color: COLORS.warning },
      'معدومة': { value: 0, color: COLORS.danger },
  };

  const { value, color } = confidenceMap[confidence] || { value: 0, color: COLORS.danger };
  const size = 32;
  const strokeWidth = 3;
  const r = (size / 2) - strokeWidth;
  const circ = 2 * Math.PI * r;
  
  useEffect(() => {
      Animated.timing(animatedValue, {
          toValue: value,
          duration: 800,
          delay: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
      }).start();
  }, [confidence]);

  const strokeDashoffset = animatedValue.interpolate({
      inputRange: [0, 100],
      outputRange: [circ, 0],
  });

  return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} fill="none" />
              <Animated.View style={StyleSheet.absoluteFill}>
                  <Svg width={size} height={size}>
                      <AnimatedCircle
                          cx={size/2}
                          cy={size/2}
                          r={r}
                          stroke={color}
                          strokeWidth={strokeWidth}
                          fill="none"
                          strokeDasharray={circ}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                      />
                  </Svg>
              </Animated.View>
          </Svg>
      </View>
  );
};
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- IN FILE: oilguard.js ---

// --- IN FILE: oilguard.js ---

const MarketingClaimsSection = ({ results }) => {
    
    // Helper to Clean Emojis from Backend Text
    const cleanStatusText = (text) => {
        if (!text) return '';
        return text.replace(/[✅🌿⚖️❌🚫⚠️]/g, '').trim();
    };

    const sortedResults = useMemo(() => {
        return [...results].sort((a, b) => {
            const getScore = (item) => {
                const s = item.status ? item.status.toString() : '';
                if (s.includes('✅')) return 4; // Proven
                if (s.includes('🌿')) return 3; // Traditional
                if (s.includes('Angel') || s.includes('تركيز') || s.includes('⚠️')) return 2; // Warning
                return 1; // False
            };
            return getScore(b) - getScore(a);
        });
    }, [results]);

    const ClaimRow = ({ result, index }) => {
        const [expanded, setExpanded] = useState(false);
        const [contentHeight, setContentHeight] = useState(0);
        const animController = useRef(new Animated.Value(0)).current;

        const getStatusConfig = (statusRaw) => {
            const s = statusRaw ? statusRaw.toString() : '';
            if (s.includes('❌') || s.includes('تسويقي') || s.includes('🚫') || s.includes('لا توجد')) {
                return { color: '#FF6B6B', icon: 'times-circle', bg: 'rgba(255, 107, 107, 0.1)' };
            }
            if (s.includes('Angel') || s.includes('تركيز') || s.includes('⚠️')) {
                return { color: '#FFB84C', icon: 'exclamation-circle', bg: 'rgba(255, 184, 76, 0.1)' };
            }
            if (s.includes('🌿') || s.includes('تقليديا')) {
                return { color: '#6BCB77', icon: 'leaf', bg: 'rgba(107, 203, 119, 0.1)' };
            }
            return { color: '#4D96FF', icon: 'check-circle', bg: 'rgba(77, 150, 255, 0.1)' };
        };

        const config = getStatusConfig(result.status);
        const cleanStatus = cleanStatusText(result.status);

        // --- DATA PROCESSING FOR LAYOUT ---
        const rawEvidence = [...(result.proven || []), ...(result.traditionallyProven || [])];
        
        // Split into Strong (Primary) vs Weak (Trace)
        const strongEvidence = [];
        const weakEvidence = [];

        rawEvidence.forEach(item => {
            const isObj = typeof item === 'object';
            const data = {
                name: isObj ? item.name : item,
                benefit: isObj ? item.benefit : null,
                isTrace: isObj ? item.isTrace : false
            };
            if (data.isTrace) weakEvidence.push(data);
            else strongEvidence.push(data);
        });

        const toggle = () => {
            const targetValue = expanded ? 0 : 1;
            setExpanded(!expanded);
            Animated.timing(animController, { 
                toValue: targetValue, duration: 300, easing: Easing.inOut(Easing.ease), useNativeDriver: false 
            }).start();
        };

        const rotateArrow = animController.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
        const heightInterpolate = animController.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight], extrapolate: 'clamp' });

        return (
            <View style={[styles.claimRowWrapper, index !== sortedResults.length - 1 && styles.claimRowBorder]}>
                <TouchableOpacity onPress={toggle} activeOpacity={0.7}>
                    <Animated.View style={[
                        styles.claimRowMain, 
                        { backgroundColor: animController.interpolate({ inputRange: [0, 1], outputRange: ['transparent', config.bg] }) }
                    ]}>
                        <View style={styles.claimIconCol}>
                            <FontAwesome5 name={config.icon} size={20} color={config.color} />
                        </View>
                        <View style={styles.claimTextCol}>
                            <Animated.Text style={[styles.claimTextTitle, { color: animController.interpolate({ inputRange: [0, 1], outputRange: [COLORS.textPrimary, config.color] }) }]}>
                                {result.claim}
                            </Animated.Text>
                            <Text style={[styles.claimTextStatus, { color: config.color }]}>{cleanStatus}</Text>
                        </View>
                        <View style={styles.claimArrowCol}>
                            <Animated.View style={{ transform: [{ rotate: rotateArrow }] }}>
                                <FontAwesome5 name="chevron-down" size={14} color={COLORS.textDim} />
                            </Animated.View>
                        </View>
                    </Animated.View>
                </TouchableOpacity>

                <Animated.View style={{ height: heightInterpolate, overflow: 'hidden' }}>
                    <View 
                        style={[styles.claimDetails, { position: 'absolute', width: '100%' }]}
                        onLayout={(e) => { const h = e.nativeEvent.layout.height; if (h > 0 && h !== contentHeight) setContentHeight(h); }}
                    >
                        {/* Explanation Text */}
                        <Text style={styles.claimExplanation}>{result.explanation}</Text>
                        
                        {/* --- SECTION 1: PRIMARY DRIVERS (Strong) --- */}
                        {strongEvidence.length > 0 && (
                            <View style={styles.evidenceGroup}>
                                {/* === CORRECTED LABEL STRUCTURE (NO TEXT IN VIEW) === */}
                                <View style={styles.evidenceLabelContainer}>
                                    <Text style={[styles.evidenceLabelText, { color: COLORS.success }]}>مكونات فعالة أساسية:</Text>
                                    <FontAwesome5 name="check" size={10} color={COLORS.success} />
                                </View>
                                {/* === END OF CORRECTION === */}
                                <View style={styles.chipContainer}>
                                    {strongEvidence.map((ing, i) => (
                                        <View key={i} style={styles.chipPrimary}><Text style={styles.chipTextPrimary}>{ing.name}{ing.benefit && <Text style={styles.chipBenefit}> • {ing.benefit}</Text>}</Text></View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {weakEvidence.length > 0 && (
                            <View style={[styles.evidenceGroup, { marginTop: strongEvidence.length > 0 ? 12 : 0 }]}>
                                {/* === CORRECTED LABEL STRUCTURE (NO TEXT IN VIEW) === */}
                                <View style={styles.evidenceLabelContainer}>
                                    <Text style={[styles.evidenceLabelText, { color: COLORS.warning }]}>تراكيز ثانوية / منخفضة:</Text>
                                    <FontAwesome5 name="exclamation-triangle" size={10} color={COLORS.warning} />
                                </View>
                                {/* === END OF CORRECTION === */}
                                <View style={styles.chipContainer}>
                                    {weakEvidence.map((ing, i) => (
                                        <View key={i} style={styles.chipTrace}><Text style={styles.chipTextTrace}>{ing.name}{ing.benefit && <Text style={styles.chipBenefitTrace}> • {ing.benefit}</Text>}</Text></View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </View>
                </Animated.View>
            </View>
        );
    };

    const total = sortedResults.length;
    const validCount = sortedResults.filter(r => {
        const s = r.status.toString();
        return s.includes('✅') || s.includes('🌿');
    }).length;
    
    const score = total > 0 ? Math.round((validCount / total) * 100) : 0;
    const scoreColor = score >= 70 ? COLORS.success : (score >= 40 ? COLORS.warning : COLORS.danger);

    return (
        <View style={styles.claimsContainer}>
            <View style={styles.claimsHeader}>
                <View>
                    <Text style={styles.claimsTitle}>تحليل الادعاءات</Text>
                    <Text style={styles.claimsSubtitle}>كشف المبالغات التسويقية</Text>
                </View>
                <View style={[styles.honestyBadge, { borderColor: scoreColor }]}>
                    <Text style={[styles.honestyScore, { color: scoreColor }]}>{score}%</Text>
                    <Text style={[styles.honestyLabel, { color: scoreColor }]}>مصداقية</Text>
                </View>
            </View>

            <View style={styles.claimsBody}>
                {sortedResults.length > 0 ? (
                    sortedResults.map((res, i) => <ClaimRow key={i} result={res} index={i} />)
                ) : (
                    <Text style={{color: COLORS.textDim, textAlign: 'center', marginVertical: 20}}>
                        لم يتم تحديد ادعاءات للتحليل.
                    </Text>
                )}
            </View>
        </View>
    );
};

const SwipeHint = () => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
      const animation = Animated.loop(
          Animated.sequence([
              Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
              Animated.timing(translateX, {
                  toValue: -35,
                  duration: 1000,
                  delay: 100,
                  easing: Easing.inOut(Easing.ease),
                  useNativeDriver: true,
              }),
              Animated.timing(opacity, { toValue: 0, duration: 400, delay: 200, useNativeDriver: true }),
              Animated.timing(translateX, { toValue: 0, duration: 0, useNativeDriver: true }), 
              Animated.delay(1000), 
          ])
      );
      animation.start();
      return () => animation.stop();
  }, []);

  return (
      <Animated.View style={[styles.swipeHintContainer, { opacity, transform: [{ translateX }] }]}>
          <MaterialCommunityIcons name="gesture-swipe-horizontal" size={65} color={COLORS.primary} />
      </Animated.View>
  );
};

const Pagination = ({ data, scrollX }) => {
  if (data.length <= PAGINATION_DOTS) {
      return (
          <View style={styles.paginationSimpleContainer}>
              {data.map((_, idx) => {
                  const inputRange = [(idx - 1) * ITEM_WIDTH, idx * ITEM_WIDTH, (idx + 1) * ITEM_WIDTH];
                  const scale = scrollX.interpolate({
                      inputRange,
                      outputRange: [1, 1.5, 1],
                      extrapolate: 'clamp',
                  });
                  const opacity = scrollX.interpolate({
                      inputRange,
                      outputRange: [0.5, 1, 0.5],
                      extrapolate: 'clamp',
                  });
                  return (
                      <Animated.View
                          key={`simple-dot-${idx}`}
                          style={[styles.paginationDot, { transform: [{ scale }], opacity, backgroundColor: COLORS.primary }]}
                      />
                  );
              })}
          </View>
      );
  }

  const indicatorTranslateX = scrollX.interpolate({
      inputRange: [0, (data.length - 1) * ITEM_WIDTH],
      outputRange: [0, (data.length - 1) * (DOT_SIZE + DOT_SPACING)],
      extrapolate: 'clamp',
  });

  const containerWidth = PAGINATION_DOTS * DOT_SIZE + (PAGINATION_DOTS - 1) * DOT_SPACING;
  const centerPoint = (containerWidth / 2) - (DOT_SIZE / 2); 

  const containerTranslateX = scrollX.interpolate({
      inputRange: [
          0,
          (data.length - 1) * ITEM_WIDTH 
      ],
      outputRange: [
          0,
          -((data.length - 1) * (DOT_SIZE + DOT_SPACING) - centerPoint) + centerPoint 
      ],
      extrapolate: 'clamp'
  });

  return (
      <View style={styles.paginationContainer}>
          <Animated.View style={[ { transform: [{ translateX: containerTranslateX }] }]}>
              <View style={styles.paginationTrack}>
                  {data.map((_, idx) => (
                      <View key={`track-dot-${idx}`} style={styles.paginationDot} />
                  ))}
              </View>

              <Animated.View
                  style={[
                      styles.paginationIndicator,
                      { transform: [{ translateX: indicatorTranslateX }] }
                  ]}
              />
          </Animated.View>
      </View>
  );
};

const IngredientDetailCard = ({ ingredient, index, scrollX }) => {
  const getWarningStyle = (level) => {
    // Normalize input to lowercase to ensure matching works even if backend sends "Risk" instead of "risk"
    const safeLevel = level ? level.toLowerCase() : '';
    
    switch (safeLevel) {
      case 'risk':
        return { color: COLORS.danger, icon: 'exclamation-circle' };
      case 'caution':
        return { color: COLORS.warning, icon: 'exclamation-triangle' };
      default: 
        // Default (Info) - usually blue/green depending on your theme
        return { color: COLORS.info, icon: 'info-circle' };
    }
  };

  const benefits = ingredient.benefits ? Object.keys(ingredient.benefits) : [];

  const inputRange = [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH];
  const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
  });
  const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: 'clamp',
  });
  
  return (
    <StaggeredItem index={index}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
            <View intensity={30} tint="extraLight" style={styles.ingCardBase} renderToHardwareTextureAndroid>
        <View style={styles.ingHeader}>
          <Text style={styles.ingName}>{ingredient.name}</Text>
          <View style={styles.ingTagsContainer}>
            {ingredient.functionalCategory && (
              <View style={[styles.ingTag, styles.ingFuncTag]}>
                <Text style={styles.ingTagText}>{ingredient.functionalCategory}</Text>
              </View>
            )}
            {ingredient.chemicalType && (
              <View style={[styles.ingTag, styles.ingChemTag]}>
                <Text style={styles.ingTagText}>{ingredient.chemicalType}</Text>
              </View>
            )}
          </View>
        </View>

        {benefits.length > 0 && (
          <View style={styles.ingBenefitsContainer}>
            {benefits.map(benefit => (
              <View key={benefit} style={styles.ingBenefitChip}>
                <Text style={styles.ingBenefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        )}

        {ingredient.warnings && ingredient.warnings.length > 0 && (
          <>
            <View style={styles.ingDivider} />
            {ingredient.warnings.map((warning, idx) => {
              const style = getWarningStyle(warning.level);
              return (
                <View key={idx} style={[styles.ingWarningBox, { backgroundColor: `${style.color}20`, borderColor: `${style.color}40`, borderWidth: 1 }]}>
                  <FontAwesome5 name={style.icon} size={16} color={style.color} style={styles.ingWarningIcon} />
                  {/* UPDATED LINE BELOW: We now pass the dynamic color to the text */}
                  <Text style={[styles.ingWarningText, { color: style.color }]}>{warning.text}</Text>
                </View>
              );
            })}
          </>
        )}
      </View>
      </Animated.View>
    </StaggeredItem>
  );
};

const AnimatedCheckbox = ({ isSelected }) => {
  const scale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  const checkScale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
      Animated.spring(scale, {
          toValue: isSelected ? 1 : 0,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
      }).start();
      Animated.timing(checkScale, {
          toValue: isSelected ? 1 : 0,
          duration: 200,
          delay: isSelected ? 100 : 0, 
          useNativeDriver: true,
      }).start();
  }, [isSelected]);

  return (
      <View style={styles.checkboxBase}>
          <Animated.View style={[styles.checkboxFill, { transform: [{ scale }] }]} />
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <FontAwesome5 name="check" size={14} color={COLORS.darkGreen} />
          </Animated.View>
      </View>
  );
};

const Wave = ({ isFilling }) => {
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
      const animation = Animated.loop(
          Animated.timing(waveAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
              easing: Easing.linear
          })
      );
      if (isFilling) {
          animation.start();
      }
      return () => animation.stop();
  }, [isFilling]);

  const translateX = waveAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -width * 0.8], 
  });

  return (
      <Animated.View style={{ width: '200%', height: 40, transform: [{ translateX }] }}>
          <Svg height="40" width={width * 1.6} style={{ width: '100%' }}>
              <Circle cx="50%" cy="50%" r="50%" fill={COLORS.primaryGlow} />
          </Svg>
      </Animated.View>
  );
};

const Bubble = ({ size, x, duration, delay }) => {
  const animY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
        const animation = Animated.loop(
            Animated.timing(animY, {
                toValue: 1,
                duration,
                useNativeDriver: true, 
                easing: Easing.linear,
            })
        );
        animation.start();
        return () => animation.stop();
    }, delay);
    return () => clearTimeout(timer);
  }, []);


  const animatedCy = animY.interpolate({ 
    inputRange: [0, 1], 
    outputRange: [90, 15] 
});

return <AnimatedCircle
cx={x}
cy={animatedCy} 
r={size}
fill={COLORS.primaryGlow}
opacity={0.7}
/>;
};

const Typewriter = ({ texts, typingSpeed = 80, deletingSpeed = 40, pauseDuration = 1500, style }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
      const cursorInterval = setInterval(() => {
          setShowCursor(prev => !prev);
      }, 500);

      const handleTyping = () => {
          const currentText = texts[textIndex];
          
          if (isDeleting) {
              if (displayedText.length > 0) {
                  const timeout = setTimeout(() => {
                      setDisplayedText(currentText.substring(0, displayedText.length - 1));
                  }, deletingSpeed);
                  return () => clearTimeout(timeout);
              } else {
                  setIsDeleting(false);
                  setTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
              }
          } 
          else {
              if (displayedText.length < currentText.length) {
                  const timeout = setTimeout(() => {
                      setDisplayedText(currentText.substring(0, displayedText.length + 1));
                  }, typingSpeed);
                  return () => clearTimeout(timeout);
              } else {
                  const timeout = setTimeout(() => {
                      setIsDeleting(true);
                  }, pauseDuration);
                  return () => clearTimeout(timeout);
              }
          }
      };

      const typingTimeout = handleTyping();

      return () => {
          if(typingTimeout) typingTimeout();
          clearInterval(cursorInterval);
      };

  }, [displayedText, isDeleting, textIndex, texts, typingSpeed, deletingSpeed, pauseDuration]);

  return (
      <View style={style.container}>
          <Text style={style.text}>
              {displayedText}
              {showCursor && <Text style={{ color: COLORS.primary }}>▋</Text>}
          </Text>
      </View>
  );
};

const AnimatedTypeChip = ({ type, isSelected, onPress, index }) => {
  const anim = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isSelected ? 1 : 0,
      friction: 7,
      tension: 50,
      useNativeDriver: false, 
    }).start();
  }, [isSelected]);

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.card, COLORS.accentGreen], 
  });

  const textColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.textSecondary, COLORS.textOnAccent], 
  });

  const iconColor = isSelected ? COLORS.textOnAccent : COLORS.textSecondary;

  return (
    <StaggeredItem index={index}>
      <TouchableOpacity onPress={onPress}>
        <Animated.View style={[styles.typeChip, { backgroundColor }]}>
          <FontAwesome5 name={type.icon} color={iconColor} size={14} />
          <Animated.Text style={[styles.typeText, { color: textColor }]}>
            {type.label}
          </Animated.Text>
        </Animated.View>
      </TouchableOpacity>
    </StaggeredItem>
  );
};

const extractIngredientsFromAIText = async (inputData) => {
  let candidates = [];
  if (Array.isArray(inputData)) {
    candidates = inputData;
  } else if (typeof inputData === 'string') {
    candidates = inputData.split('\n');
  }

  const simpleIngredients = candidates.map((name, index) => ({
      id: `temp-${index}`, 
      name: name.trim(),
      functionalCategory: 'جاري التحليل...', 
      chemicalType: ''
  })).filter(i => i.name.length > 1);

  return { ingredients: simpleIngredients };
};

// --- COMPONENT: MOVED OUTSIDE & MEMOIZED ---
const InputStepView = React.memo(({ onImageSelect, onManualSelect, scanMode, setScanMode }) => {
    
    // 1. Calculate height for perfect scan loop
    const { width } = Dimensions.get('window');
    const CARD_WIDTH = (width - 40) / 2; // (Screen - Padding) / 2 cards
    const SCAN_HEIGHT = CARD_WIDTH / 0.65; // Matches the aspectRatio: 0.65 style

    // Animations
    const scanAnim = useRef(new Animated.Value(0)).current; // Laser position
    const pulseAnim = useRef(new Animated.Value(1)).current; // Error pulse

    useEffect(() => {
        // Laser Loop
        const scanLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, {
                    toValue: 1,
                    duration: 2200, 
                    easing: Easing.linear,
                    useNativeDriver: true
                }),
                Animated.delay(100) // Brief pause
            ])
        );

        // Warning Pulse Loop
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        );

        scanLoop.start();
        pulseLoop.start();

        return () => {
            scanLoop.stop();
            pulseLoop.stop();
        };
    }, []);

    const scanTranslateY = scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-5, SCAN_HEIGHT + 5] 
    });

    return (
        <View style={styles.inputStepContainer}>
            
            <View style={styles.heroVisualContainer}>
                <View style={styles.guideSection}>
                    
                    {/* =============================================
                        LEFT CARD: "SIGNAL LOST" (Wrong)
                       ============================================= */}
                    <View style={[styles.opticalCard, styles.cardError]}>
                        
                        {/* HUD Corners */}
                        <View style={[styles.hudCorner, styles.hudTL, { borderColor: COLORS.danger }]} />
                        <View style={[styles.hudCorner, styles.hudTR, { borderColor: COLORS.danger }]} />
                        <View style={[styles.hudCorner, styles.hudBL, { borderColor: COLORS.danger }]} />
                        <View style={[styles.hudCorner, styles.hudBR, { borderColor: COLORS.danger }]} />

                        <View style={styles.scannerScreen}>
                            {/* YOUR LOCAL IMAGE HERE */}
                            <Image 
                                source={require('../../assets/images/front.jpg')}
                                style={styles.guideImage}
                            />
                            
                            {/* Dark Noise Overlay */}
                            <View style={styles.noiseOverlay}>
                                {/* Pulsing Icon */}
                                <Animated.View style={{ opacity: pulseAnim, alignItems: 'center' }}>
                                    <FontAwesome5 name="ban" size={28} color={COLORS.danger} />
                                </Animated.View>
                            </View>
                        </View>

                        <View style={styles.cardFooter}>
                            <View style={[styles.indicatorDot, { backgroundColor: COLORS.danger }]} />
                            <Text style={[styles.footerLabel, { color: COLORS.textDim }]}>
                                المنتج كامل (خطأ)
                            </Text>
                        </View>
                    </View>


                    {/* =============================================
                        RIGHT CARD: "INTELLIGENCE FOUND" (Correct)
                       ============================================= */}
                    <View style={[styles.opticalCard, styles.cardSuccess]}>
                        
                        {/* HUD Corners */}
                        <View style={[styles.hudCorner, styles.hudTL, { borderColor: COLORS.accentGreen }]} />
                        <View style={[styles.hudCorner, styles.hudTR, { borderColor: COLORS.accentGreen }]} />
                        <View style={[styles.hudCorner, styles.hudBL, { borderColor: COLORS.accentGreen }]} />
                        <View style={[styles.hudCorner, styles.hudBR, { borderColor: COLORS.accentGreen }]} />

                        <View style={styles.scannerScreen}>
                            {/* YOUR LOCAL IMAGE HERE */}
                            <Image 
                                source={require('../../assets/images/inci.jpg')}
                                style={styles.guideImage}
                            />
                            
                            {/* Tech Grid Overlay (SVG pattern simulation) */}
                            <View style={styles.gridOverlay}>
                                <Svg height="100%" width="100%">
                                    <Defs>
                                        {/* FIX: Used SvgLinearGradient to avoid conflict with Expo LinearGradient */}
                                        <SvgLinearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                                            <Stop offset="0" stopColor={COLORS.accentGreen} stopOpacity="0.05" />
                                            <Stop offset="1" stopColor={COLORS.accentGreen} stopOpacity="0.2" />
                                        </SvgLinearGradient>
                                    </Defs>
                                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#gridGrad)" />
                                    {/* Horizontal grid lines */}
                                    <Path d={`M0 ${SCAN_HEIGHT*0.33} H${CARD_WIDTH}`} stroke={COLORS.accentGreen} strokeWidth="0.5" opacity="0.3" />
                                    <Path d={`M0 ${SCAN_HEIGHT*0.66} H${CARD_WIDTH}`} stroke={COLORS.accentGreen} strokeWidth="0.5" opacity="0.3" />
                                </Svg>
                            </View>

                            {/* The Laser Beam */}
                            <Animated.View style={[
                                styles.laserBeam, 
                                { transform: [{ translateY: scanTranslateY }] }
                            ]}>
                                {/* Trail Gradient */}
                                <LinearGradient
                                    colors={['rgba(0, 255, 170, 0)', 'rgba(0, 255, 170, 0.25)']}
                                    style={styles.laserGradient}
                                />
                            </Animated.View>

                        </View>

                        <View style={styles.cardFooter}>
                            <View style={[styles.indicatorDot, { backgroundColor: COLORS.accentGreen }]} />
                            <Text style={[styles.footerLabel, { color: COLORS.textPrimary }]}>
                                المكونات فقط (صح)
                            </Text>
                        </View>
                    </View>

                </View>
            </View>

            {/* BOTTOM DECK (Unchanged) */}
            <StaggeredItem index={0} style={styles.bottomDeck}>
                <LinearGradient
                    colors={[COLORS.card, '#152520']}
                    style={styles.bottomDeckGradient}
                >
                    <View style={styles.deckHeader}>
                        <Text style={styles.deckTitle}>فحص المكونات</Text>
                        <Typewriter
                            texts={[
                                "ابحث عن كلمة Ingredients...",
                                "يستحسن تصوير المكونات بالإنجليزية لدقة أفضل",
                                "لكن لا بأس بالعربية",
                            ]}
                            typingSpeed={60}
                            style={{
                                container: { height: 24, justifyContent: 'center' },
                                text: { fontFamily: 'Tajawal-Regular', color: COLORS.accentGreen, fontSize: 14 }
                            }}
                        />
                    </View>

                     {/* --- NEW: SCAN MODE TOGGLE --- */}
                     <View style={{
                            flexDirection: 'row',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            borderRadius: 12,
                            padding: 4,
                            marginTop: 'auto',
                            marginBottom: 5,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)'
                        }}>
                            {/* Fast Mode Button */}
                            <TouchableOpacity 
                                onPress={() => setScanMode('fast')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    backgroundColor: scanMode === 'fast' ? COLORS.primary : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 6
                                }}
                            >
                                <FontAwesome5 name="bolt" size={14} color={scanMode === 'fast' ? '#1A2D27' : COLORS.textDim} />
                                <Text style={{
                                    fontFamily: 'Tajawal-Bold',
                                    fontSize: 13,
                                    color: scanMode === 'fast' ? '#1A2D27' : COLORS.textDim
                                }}>وضع السرعة</Text>
                            </TouchableOpacity>

                            {/* Accurate Mode Button */}
                            <TouchableOpacity 
                                onPress={() => setScanMode('accurate')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    backgroundColor: scanMode === 'accurate' ? COLORS.primary : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 6
                                }}
                            >
                                <FontAwesome5 name="search-plus" size={14} color={scanMode === 'accurate' ? '#1A2D27' : COLORS.textDim} />
                                <Text style={{
                                    fontFamily: 'Tajawal-Bold',
                                    fontSize: 13,
                                    color: scanMode === 'accurate' ? '#1A2D27' : COLORS.textDim
                                }}>وضع الدقة</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {/* Info Note based on selection */}
                        <Text style={{ 
                            fontFamily: 'Tajawal-Regular', 
                            color: scanMode === 'accurate' ? COLORS.warning : COLORS.accentGreen, 
                            fontSize: 12,
                            textAlign: 'center',
                            marginBottom: 10
                        }}>
                            {scanMode === 'accurate' 
                                ? "يستغرق وقتاً أطول لكن ينصح به للمكونات بالعربية" 
                                : "تحليل سريع ينصح به للصور الواضحة ذات جودة عالية"}
                        </Text>
                        {/* --- END NEW UI --- */}

                    

                    <TouchableOpacity onPress={() => onImageSelect('camera')} style={styles.primaryActionBtn}>
                        <LinearGradient
                            colors={[COLORS.accentGreen, '#4a8570']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.primaryActionGradient}
                        >
                            <View style={styles.iconCircle}>
                                <Ionicons name="camera" size={28} color={COLORS.background} />
                            </View>
                            <View>
                                <Text style={styles.primaryActionTitle}>تصوير المكونات</Text>
                                <Text style={styles.primaryActionSub}>اضغط لفتح الكاميرا</Text>
                            </View>
                            <Ionicons name="chevron-back" size={24} color={COLORS.background} style={{ opacity: 0.6, marginRight: 'auto' }} />
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.secondaryActionsRow}>
                        <TouchableOpacity onPress={() => onImageSelect('gallery')} style={styles.secondaryBtn}>
                            <Ionicons name="images" size={22} color={COLORS.textSecondary} />
                            <Text style={styles.secondaryBtnText}>المعرض</Text>
                        </TouchableOpacity>
                        <View style={styles.verticalDivider} />
                        <TouchableOpacity onPress={onManualSelect} style={styles.secondaryBtn}>
                            <Ionicons name="search" size={22} color={COLORS.textSecondary} />
                            <Text style={styles.secondaryBtnText}>بحث يدوي</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </StaggeredItem>
        </View>
    );
});

// --- COMPLEX GAUGE COMPONENT (Replaces simple ScoreRing) ---
const ComplexDashboardGauge = ({ score, size = 220 }) => {
  const animatedScore = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  const center = size / 2;
  const radius = size * 0.38; // Radius of main ring
  const circum = 2 * Math.PI * radius;
  
  // Determine color based on score
  const getColor = (s) => {
      if (s >= 80) return COLORS.success;
      if (s >= 60) return COLORS.gold;
      return COLORS.danger;
  };
  
  const activeColor = getColor(displayScore);

  useEffect(() => {
      const listener = animatedScore.addListener(({ value }) => setDisplayScore(Math.round(value)));
      Animated.timing(animatedScore, {
          toValue: score,
          duration: 2000,
          easing: Easing.bezier(0.25, 1, 0.5, 1),
          useNativeDriver: false
      }).start();
      return () => animatedScore.removeListener(listener);
  }, [score]);

  // Calculate Stroke Dash
  const strokeDashoffset = animatedScore.interpolate({
      inputRange: [0, 100],
      outputRange: [circum, 0]
  });

  const rotateAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
      Animated.loop(
          Animated.timing(rotateAnim, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })
      ).start();
  }, []);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinReverse = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

  return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {/* 1. Outer Tech Ring (Spinning Slow) */}
          <Animated.View style={{ position: 'absolute', transform: [{ rotate: spin }] }}>
               <Svg width={size} height={size}>
                  <Circle cx={center} cy={center} r={size * 0.48} stroke="rgba(90, 156, 132, 0.1)" strokeWidth="1" strokeDasharray="5, 10" fill="none" />
               </Svg>
          </Animated.View>

          

          {/* 3. Main Gauge Track */}
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Defs>
                   {/* FIX: Use SvgLinearGradient here instead of LinearGradient */}
                   <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor={activeColor} stopOpacity="0.2" />
                      <Stop offset="1" stopColor={activeColor} stopOpacity="1" />
                   </SvgLinearGradient>
              </Defs>
              {/* Background Track */}
              <Circle cx={center} cy={center} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="18" fill="none" strokeLinecap="round"/>
              
              {/* Progress Value */}
              <AnimatedCircle 
                  cx={center} cy={center} r={radius} 
                  stroke={`url(#grad)`} strokeWidth="18" fill="none" 
                  strokeDasharray={circum} strokeDashoffset={strokeDashoffset} 
                  strokeLinecap="round" 
              />
          </Svg>

          {/* 4. Center Number */}
          <View style={styles.absoluteCenter}>
              <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 52, color: COLORS.textPrimary }}>
                  {displayScore}
              </Text>
              <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 14, color: activeColor, letterSpacing: 2 }}>
                  SCORE
              </Text>
          </View>
      </View>
  );
};

// --- STAT BAR COMPONENT ---
const StatBar = ({ label, score, color, icon }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
      Animated.timing(widthAnim, {
          toValue: score,
          duration: 1500,
          delay: 500,
          useNativeDriver: false 
      }).start();
  }, [score]);

  const widthPercent = widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
      <View style={styles.statBox}>
          <View style={styles.statHeader}>
              <Text style={styles.statValue}>{score}/100</Text>
              <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
                  <Text style={styles.statLabel}>{label}</Text>
                  <FontAwesome5 name={icon} size={10} color={COLORS.textDim} />
              </View>
          </View>
          <View style={styles.progressBarBg}>
              <Animated.View style={[styles.progressBarFill, { width: widthPercent, backgroundColor: color }]} />
          </View>
      </View>
  );
};

const GlassPillar = ({ label, score, color, icon }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
      Animated.timing(widthAnim, {
          toValue: score,
          duration: 1200,
          delay: 300,
          easing: Easing.out(Easing.cubic), // Smooth deceleration
          useNativeDriver: false 
      }).start();
  }, [score]);

  const widthPercent = widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
      <View style={styles.pillarContainer}>
          <View style={styles.pillarHeader}>
              
              {/* Right Side: Icon & Label */}
              <View style={styles.pillarLabelRow}>
                  <View style={[styles.pillarIconBox, { backgroundColor: `${color}15` }]}>
                      <FontAwesome5 name={icon} size={10} color={color} />
                  </View>
                  <Text style={styles.pillarLabel}>{label}</Text>
              </View>

              {/* Left Side: Score Number */}
              <Text style={styles.pillarValue}>{score}%</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.pillarTrack}>
              <Animated.View 
                  style={[
                      styles.pillarFill, 
                      { 
                          width: widthPercent, 
                          backgroundColor: color,
                          // Dynamic shadow color for glow effect
                          shadowColor: color 
                      }
                  ]} 
              />
          </View>
      </View>
  );
};

// --- NEW SPLIT MATCH COMPONENT ---
const MatchBreakdown = ({ reasons = [] }) => {
    
    if (!reasons || reasons.length === 0) return null;

    // --- UI Helpers ---
    const getConfig = (type) => {
        switch (type) {
            case 'danger': return { color: COLORS.danger };
            case 'warning': return { color: COLORS.warning };
            case 'good': return { color: COLORS.success };
            default: return { color: COLORS.info };
        }
    };

    const getIcon = (text, type) => {
        const lowerText = text ? text.toLowerCase() : '';
        // Map keywords to FontAwesome5 icons
        if (lowerText.includes('مسام') || lowerText.includes('بثور')) return 'dot-circle'; 
        if (lowerText.includes('فطريات') || lowerText.includes('قشرة')) return 'spider'; 
        if (lowerText.includes('حساسية')) return 'hand-paper'; 
        if (lowerText.includes('تعارض')) return 'flask'; 
        // Default icons based on severity
        return type === 'good' ? 'check' : (type === 'danger' ? 'times' : 'exclamation-triangle');
    };

    // --- RENDER ---
    return (
        <View style={styles.matchContainer}>
            <View style={styles.matchHeader}>
                <View style={styles.matchHeaderIcon}>
                    <FontAwesome5 name="user-cog" size={12} color={COLORS.textPrimary} />
                </View>
                <Text style={styles.matchHeaderTitle}>تحليل التوافق الشخصي</Text>
            </View>
            <View style={styles.matchBody}>
                {reasons.map((item, i) => {
                    // Handle both object format {type, text} and simple string format
                    const type = typeof item === 'object' ? item.type : 'info';
                    const text = typeof item === 'object' ? item.text : item;
                    
                    const config = getConfig(type);
                    const iconName = getIcon(text, type);

                    return (
                        <View key={`match-${i}`} style={[styles.matchRow, { alignItems: 'flex-start' }]}>
                            <View style={[styles.matchIconBox, { marginTop: 2 }]}>
                                <FontAwesome5 name={iconName} size={12} color={config.color} />
                            </View>
                            <Text style={[styles.matchText, { lineHeight: 22 }]}>
                                {text}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

// ============================================================================
//                        MAIN SCREEN COMPONENT
// ============================================================================
export default function OilGuardEngine() {

  const router = useRouter();
  const { user, userProfile } = useAppContext();
  const insets = useSafeAreaInsets();
  const interstitialId = TestIds.INTERSTITIAL;


  const [hasShownIntroAd, setHasShownIntroAd] = useState(false);

  const [step, setStep] = useState(0); 
  const [loading, setLoading] = useState(false);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [manualIngredients, setManualIngredients] = useState('');
  const [preProcessedIngredients, setPreProcessedIngredients] = useState([]);
  const [productType, setProductType] = useState('other');
  const [selectedClaims, setSelectedClaims] = useState([]);
  const [finalAnalysis, setFinalAnalysis] = useState(null);
  const [showManualTypeGrid, setShowManualTypeGrid] = useState(false);
  const [isSaveModalVisible, setSaveModalVisible] = useState(false);
  const [productName, setProductName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isCameraViewVisible, setCameraViewVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fabPosition, setFabPosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState('claims');
  const [isAnimatingTransition, setIsAnimatingTransition] = useState(false);
  const [fabMetrics, setFabMetrics] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [cropperVisible, setCropperVisible] = useState(false);
  const [tempImageUri, setTempImageUri] = useState(null);
  const [frontImageUri, setFrontImageUri] = useState(null); 
  const [isManualModalVisible, setManualModalVisible] = useState(false); // <--- NEW STATE
  const [manualInputText, setManualInputText] = useState(''); // <--- NEW STATE
  const [isBreakdownModalVisible, setBreakdownModalVisible] = useState(false); // <--- ADD THIS
  const [scanMode, setScanMode] = useState('fast'); // 'fast' or 'accurate'
  const [containerHeight, setContainerHeight] = useState(0);
  const SCREEN_HEIGHT = Dimensions.get('window').height;

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const introIconScale = useRef(new Animated.Value(1)).current;
  const introShineAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(0)).current;
  const fabPulseAnim = useRef(new Animated.Value(1)).current;
  const heroTransitionAnim = useRef(new Animated.Value(0)).current; 
  const fabIconRef = useRef(null);
  const fabRef = useRef(null);
  const revealAnim = useRef(new Animated.Value(0)).current;
  const loadingFillAnim = useRef(new Animated.Value(0)).current;
  const loadingDropAnim = useRef(new Animated.Value(0)).current;
  const loadingTextOpacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  const particles = useMemo(() => [...Array(15)].map((_, i) => ({ id: i, size: Math.random()*5+3, startX: Math.random()*width, duration: 8000+Math.random()*7000, delay: Math.random()*5000 })), []);
  
  const claimsForType = useMemo(() => getClaimsByProductType(productType), [productType]);
  const fuse = useMemo(() => new Fuse(claimsForType, {
      includeScore: false,
      threshold: 0.4,
  }), [claimsForType]);
  const loadingBubbles = useMemo(() => [...Array(15)].map((_, i) => ({
      id: i,
      size: Math.random() * 15 + 5,
      x: `${Math.random() * 80 + 10}%`,
      duration: Math.random() * 3000 + 2000,
      delay: Math.random() * 2000,
  })), []);



  useEffect(() => {
    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(introIconScale, { toValue: 1.05, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(introIconScale, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
      ])
    );
    const shineAnimation = Animated.loop(
        Animated.timing(introShineAnim, {
            toValue: 1,
            duration: 3500,
            useNativeDriver: true,
            easing: Easing.linear,
            delay: 500,
        })
    );
    const drop = Animated.sequence([
        Animated.delay(400),
        Animated.timing(loadingDropAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.bounce })
    ]);
    const fill = Animated.sequence([
        Animated.delay(800),
        Animated.timing(loadingFillAnim, { toValue: 1, duration: 2500, useNativeDriver: false, easing: Easing.inOut(Easing.ease) })
    ]);
    const textPulse = Animated.loop(Animated.sequence([
        Animated.timing(loadingTextOpacityAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(loadingTextOpacityAnim, { toValue: 0.6, duration: 1000, useNativeDriver: true })
    ]));

    if (step === 0) {
      breathAnimation.start();
      shineAnimation.start();
    } else if (step === 3) {
      if (isGeminiLoading) {
        loadingTextOpacityAnim.setValue(0.6); 
        textPulse.start();
      } else {
        loadingDropAnim.setValue(0);
        loadingFillAnim.setValue(0);
        loadingTextOpacityAnim.setValue(0);
        drop.start();
        fill.start();
        textPulse.start();
      }
    }

    return () => {
        breathAnimation.stop();
        shineAnimation.stop();
        drop.stop();
        fill.stop();
        textPulse.stop();
    };
  }, [step, isGeminiLoading]);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
        Animated.sequence([
            Animated.timing(fabPulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            Animated.timing(fabPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
        ])
    );

    if (selectedClaims.length > 0) {
      Animated.spring(fabAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();
      pulseAnimation.start();
    } else {
      Animated.timing(fabAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }

    return () => pulseAnimation.stop();
  }, [selectedClaims.length]);

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );

    if (isAnimatingTransition) {
      pulseAnimation.start();
    }

    return () => {
      pulseAnimation.stop();
      pulseAnim.setValue(0);
    };
  }, [isAnimatingTransition]);

  // ---------------------------------------------------------
  // --- ADS DISABLED START ----------------------------------
  // ---------------------------------------------------------
  
  /* 
  // ORIGINAL CODE COMMENTED OUT:
  const { isLoaded, isClosed, load, show } = useInterstitialAd(interstitialId, {
    requestNonPersonalizedAdsOnly: true,
  });

  // 2. LOAD AD WHEN COMPONENT MOUNTS
  useEffect(() => {
    load();
  }, [load]);

  // 3. RELOAD AD AFTER IT IS CLOSED
  useEffect(() => {
    if (isClosed) {
      load();
      // Actually reset the app flow after ad closes
      performReset(); 
    }
  }, [isClosed, load]);
  */

  // DUMMY OBJECT (Prevents crashes if variables are referenced elsewhere)
  const { isLoaded, isClosed, load, show } = { 
    isLoaded: false, 
    isClosed: false, 
    load: () => console.log("Ad loading disabled"), 
    show: () => console.log("Ad showing disabled") 
  };

  // ---------------------------------------------------------
  // --- ADS DISABLED END ------------------------------------
  // ---------------------------------------------------------

  const changeStep = useCallback((next) => {
    const isForward = next > step;
    const slideDist = 20; // Reduced distance for subtler movement

    // 1. Immediate Feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 2. EXIT ANIMATION (Fast)
    Animated.parallel([
        Animated.timing(contentOpacity, { 
            toValue: 0, 
            duration: 150, 
            useNativeDriver: true,
            easing: Easing.out(Easing.quad)
        }),
        Animated.timing(contentTranslateX, { 
            toValue: isForward ? -slideDist : slideDist, 
            duration: 150, 
            useNativeDriver: true 
        })
    ]).start(() => {
        
        // 3. LOGIC & RESET (While Invisible)
        setStep(next);
        
        // Reset the Y-scroll animation value used in Step 2 (Claims)
        // This prevents the header from appearing "collapsed" if you return to the step
        scrollY.setValue(0); 

        // Reset main scrollview if it exists
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ y: 0, animated: false });
        }

        // Snap X position to the "entry" side immediately
        contentTranslateX.setValue(isForward ? slideDist : -slideDist);

        // 4. MICRO-DELAY & ENTRY
        // We wait 50ms to allow React to mount the new component tree completely
        // while opacity is still 0. This eliminates the "flash" of the old step.
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(contentOpacity, { 
                    toValue: 1, 
                    duration: 300, 
                    useNativeDriver: true,
                    easing: Easing.out(Easing.cubic)
                }),
                Animated.spring(contentTranslateX, { 
                    toValue: 0, 
                    friction: 9, 
                    tension: 50, 
                    useNativeDriver: true 
                })
            ]).start();
        }, 50); 
    });
}, [step, contentOpacity, contentTranslateX, scrollY]);


  const handleImageSelection = useCallback(async (mode) => {
    try {
        if (mode === 'camera') {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('عذرا', 'يجب السماح بالوصول للكاميرا لالتقاط صورة.');
                return;
            }
            setCameraViewVisible(true);
            return; 
        }

        if (mode === 'gallery') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('عذرا', 'يجب السماح بالوصول للمعرض لاختيار صورة.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1, // High quality for OCR
                allowsEditing: false, // DISABLE Native Editor
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedUri = result.assets[0].uri;
                if (selectedUri) {
                    setTempImageUri(selectedUri);
                    // Add a small timeout to ensure modal transition is smooth
                    setTimeout(() => setCropperVisible(true), 100);
                }
            }
        }
    } catch (error) {
        console.error("Image selection error:", error);
        Alert.alert("خطأ", "حدث خطأ أثناء اختيار الصورة. حاول مرة أخرى.");
    }
  }, []);


  const handlePictureTaken = useCallback((photo) => {
    setCameraViewVisible(false);
    
    if (photo && photo.uri) {
        // OLD CODE: 
        // setTempImageUri(photo.uri);
        // setTimeout(() => setCropperVisible(true), 300);

        // NEW CODE: Skip cropper and go straight to processing
        // We add a small delay to let the Camera Modal close animation finish smoothly
        setTimeout(() => {
            processImageWithGemini(photo.uri);
        }, 50); 
    }
  }, []);

  const processImageWithGemini = async (uri) => {
    setLoading(true);
    setIsGeminiLoading(true);
    changeStep(3);

    try {
        // 1. Process image for upload
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1500 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        // 2. Convert to base64
        const base64Data = await uriToBase64(manipResult.uri);

        // 3. Send to backend (backend now handles OCR.space + Groq)
        console.log("📤 Sending image to backend for OCR processing...");
        
        const response = await fetch(VERCEL_BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                base64Data: base64Data,
                localOcrText: "", // Empty string - backend handles OCR internally
                scanMode: scanMode
            }),
        });

        const responseData = await response.json();
        console.log("🧠 Backend response:", JSON.stringify(responseData, null, 2));

        if (!response.ok) {
            throw new Error(responseData.error || "Backend processing failed");
        }

        // --- START OF NEW DEBUGGING BLOCK ---
        const debugInfo = responseData._debug;
        const processingMode = debugInfo?.processing_mode || "UNKNOWN";
        const fallbackReason = debugInfo?.fallback_reason || "None"; // <--- Get the reason

        const textPreview = debugInfo?.text_preview || "No preview";

        console.log(`\n============== ANALYSIS REPORT ==============`);
        console.log(`🛠️ MODE: ${processingMode}`);
        console.log(`📝 TEXT: ${textPreview}`);
        console.log(`=============================================\n`);

        let jsonResponse;
        if (typeof responseData.result === 'object') {
            jsonResponse = responseData.result;
        } else {
            const text = responseData.result.replace(/```json|```/g, '').trim();
            jsonResponse = JSON.parse(text);
        }

        // Check for front label detection
        if (jsonResponse.status === 'front_label_detected') {
            setIsGeminiLoading(false);
            setLoading(false);
            changeStep(0);
            
            setTimeout(() => {
                AlertService.show({
                    title: "تنبيه",
                    message: "يبدو أنك صورتي واجهة المنتج. من فضلك صوري قائمة المكونات (خلف العبوة) للتحليل.",
                    type: "warning",
                    buttons: [{ text: "حسنا", style: "primary" }]
                });
            }, 500);
            return;
        }

        const rawList = jsonResponse.ingredients_list || [];
        
        if (rawList.length === 0) {
            throw new Error("No ingredients found in the image");
        }

        // 4. Extract ingredients for next step
        const { ingredients } = await extractIngredientsFromAIText(rawList);
        
        setOcrText(rawList.join('\n'));
        setPreProcessedIngredients(ingredients);
        setProductType(jsonResponse.detected_type || 'other');

        setIsGeminiLoading(false);
        setLoading(false);
        changeStep(1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (error) {
        console.error("Image Processing Error:", error);
        
        setIsGeminiLoading(false);
        setLoading(false);
        changeStep(0);
        
        AlertService.show({
            title: "خطأ في المسح",
            message: "لم يتمكن وثيق من قراءة المكونات. التقطي صورة أقرب وأوضح.",
            type: "error"
        });
    }
};

const executeAnalysis = async () => {
    // 1. Trigger Transition INSTANTLY (Fast Mode: true)
    // We remove the Haptics call here because TouchableOpacity already handles it
    changeStep(3, { fast: true });

    // 2. Defer the heavy network/logic to the next tick
    // This allows the UI to paint the Loading Screen immediately without freezing
    setTimeout(async () => {
        try {
            const rawList = preProcessedIngredients.map(i => i.name);

            const response = await fetch(VERCEL_EVALUATE_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                body: JSON.stringify({
                    ingredients_list: rawList,
                    product_type: productType,
                    selected_claims: selectedClaims,
                    user_profile: {
                        allergies: userProfile?.settings?.allergies || [],
                        conditions: userProfile?.settings?.conditions || [],
                        skinType: userProfile?.settings?.skinType,
                        scalpType: userProfile?.settings?.scalpType
                    }
                })
            });

            if (!response.ok) throw new Error("Server analysis failed");
            
            const fullAnalysisData = await response.json();
            
            setFinalAnalysis(fullAnalysisData);
            // Normal transition for results (nice reveal)
            changeStep(4);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        } catch (error) {
            console.error(error);
            Alert.alert("Analysis Error", "Could not connect to analysis server.");
            changeStep(2); // Go back to claims
        }
    }, 100); // 100ms delay gives the animation enough time to start
};

const processManualText = async (directInputText) => {
    // FIX: Use the argument passed directly, fallback to state only if argument is missing
    const textToProcess = directInputText || manualInputText;

    if (!textToProcess || !textToProcess.trim()) {
        Alert.alert("تنبيه", "الرجاء إدخال المكونات.");
        return;
    }

    setManualModalVisible(false); 
    setLoading(true);
    setIsGeminiLoading(true);
    changeStep(3); 

    try {
        const response = await fetch(VERCEL_PARSE_TEXT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // FIX: Send the local variable, not the state
            body: JSON.stringify({ text: textToProcess }), 
        });

        const responseData = await response.json();
        console.log("✅ [OilGuard] Manual Analysis Result:", JSON.stringify(responseData, null, 2));

        if (!response.ok) throw new Error(responseData.error || "Failed");

        const jsonResponse = responseData.result;
        const rawList = jsonResponse.ingredients_list || [];
        
        const { ingredients } = await extractIngredientsFromAIText(rawList);

        setOcrText(rawList.join('\n'));
        setPreProcessedIngredients(ingredients);
        setProductType(jsonResponse.detected_type || 'other');

        setIsGeminiLoading(false);
        setLoading(false);
        setManualInputText(''); 
        changeStep(1); 
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (error) {
        console.error("Text Parse Error:", error);
        Alert.alert("خطأ", "لم نتمكن من تحليل النص، يرجى المحاولة مرة أخرى.");
        setIsGeminiLoading(false);
        setLoading(false);
        changeStep(0);
    }
};
  
  const handleSaveProduct = async () => {
    if (!productName.trim()) { 
        AlertService.error("تنبيه", "يرجى كتابة اسم المنتج."); 
        return; 
    }
    
    // Optional: Force image
    if (!frontImageUri) {
        AlertService.error("تنبيه", "يرجى إضافة صورة لواجهة المنتج لسهولة التعرف عليه.");
        return;
    }
    
    setIsSaving(true);
    
    try {
        // 1. Upload Front Image
        let productImageUrl = null;
        if (frontImageUri) {
            productImageUrl = await uploadImageToCloudinary(frontImageUri);
        }

        // 2. Save
        await addDoc(collection(db, 'profiles', user.uid, 'savedProducts'), {
            userId: user.uid,
            productName: productName.trim(),
            productImage: productImageUrl,
            marketingClaims: selectedClaims, 
            productType: productType, 
            analysisData: finalAnalysis, 
            createdAt: Timestamp.now()
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsSaving(false);
        setSaveModalVisible(false);
        
        AlertService.success(
            "تم الحفظ", 
            "تمت إضافة المنتج إلى رفّك.", 
            () => router.replace('/profile')
        );

    } catch (error) {
        console.error(error);
        AlertService.error("خطأ", "تعذر حفظ المنتج.");
        setIsSaving(false);
    }
  };

  const performReset = () => {
    setIsGeminiLoading(false);
    setStep(0); 
    setFinalAnalysis(null); 
    setOcrText(''); 
    setPreProcessedIngredients([]); 
    setSelectedClaims([]);
    setShowSwipeHint(true);
    setSearchQuery('');
    setProductName(''); 
    setShowManualTypeGrid(false); 
    setManualIngredients('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFrontImageUri(null);
  };

  // CREATE NEW resetFlow that triggers the Ad
  const resetFlow = () => {
    performReset();
  };

  const openSaveModal = () => {
    setProductName('');
    setFrontImageUri(null); // Force user to take a new pic of the front
    setSaveModalVisible(true);
};

// 3. Pick Front Image (For Shelf)
const pickFrontImage = () => {
  AlertService.show({
      title: "صورة المنتج",
      message: "كيف تريد التقاط صورة المنتج؟",
      type: 'info', // Uses the blue/neutral theme
      buttons: [
          {
              text: 'المعرض',
              style: 'secondary',
              onPress: async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: false,
                      aspect: [4, 3],
                      quality: 1,
                  });
                  if (!result.canceled) {
                      const compressed = await compressImage(result.assets[0].uri);
                      setFrontImageUri(compressed);
                  }
              }
          },
          {
              text: 'الكاميرا',
              style: 'primary',
              onPress: async () => {
                  // Request permission implicitly handled by Expo, but good to check
                  const result = await ImagePicker.launchCameraAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      allowsEditing: true,
                      aspect: [4, 3],
                      quality: 1,
                  });
                  if (!result.canceled) {
                      const compressed = await compressImage(result.assets[0].uri);
                      setFrontImageUri(compressed);
                  }
              }
          },
          {
              text: 'إلغاء',
              style: 'destructive',
              onPress: () => {} // Close modal
          }
      ]
  });
};

  const renderGeminiLoading = () => {
    const textOpacity = loadingTextOpacityAnim;

    return (
        <View style={styles.contentContainer}>
            <StaggeredItem index={0}>
                <View style={styles.flaskAnimationContainer}>
                    <Svg width={180} height={180} viewBox="0 0 100 100">
                        {loadingBubbles.map(bubble => <Bubble key={bubble.id} {...bubble} />)}
                        
                        <Path
                            d="M 50 95 L 40 95 A 10 10 0 0 1 30 85 L 30 60 A 20 20 0 0 1 50 40 A 20 20 0 0 1 70 60 L 70 85 A 10 10 0 0 1 60 95 L 50 95 M 50 40 L 50 5"
                            stroke={COLORS.primary}
                            strokeWidth="3"
                            fill="rgba(178, 216, 180, 0.05)" 
                            strokeLinecap="round"
                        />
                    </Svg>
                </View>
                <Animated.Text style={[styles.loadingText, { opacity: textOpacity, marginTop: 20 }]}>
                    جاري تحليل الصورة بالذكاء الاصطناعي...
                </Animated.Text>
                <Text style={[styles.heroSub, { marginTop: 8 }]}>
                    قد تستغرق هذه العملية بضع لحظات
                </Text>
            </StaggeredItem>
        </View>
    );
  };

  const renderClaimItem = useCallback(({ item }) => {
    const isSelected = selectedClaims.includes(item);
    
    // The handler function is now defined inside the memoized callback
    const handlePress = () => {
        setSelectedClaims(prev => 
            prev.includes(item) 
            ? prev.filter(c => c !== item) 
            : [...prev, item]
        );
        // Optional: Haptics.selectionAsync();
    };

    return (
        <TouchableOpacity onPress={handlePress}>
            <View style={[styles.claimItem, isSelected && styles.claimItemActive]}>
                <AnimatedCheckbox isSelected={isSelected} />
                <Text style={styles.claimItemText}>{item}</Text>
            </View>
        </TouchableOpacity>
    );
}, [selectedClaims]);
  
const renderClaimsStep = () => {
    const displayedClaims = searchQuery ? fuse.search(searchQuery).map(result => result.item) : claimsForType;
    
    const EXPANDED_HEADER_HEIGHT = 160;
    const COLLAPSED_HEADER_HEIGHT = Platform.OS === 'android' ? 60 : 90;
    const SEARCH_BAR_HEIGHT = 70;
    const HEADER_ANIMATION_DISTANCE = EXPANDED_HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT;

    const headerTranslateY = scrollY.interpolate({
      inputRange: [0, HEADER_ANIMATION_DISTANCE],
      outputRange: [0, -HEADER_ANIMATION_DISTANCE],
      extrapolate: 'clamp',
    });

    const expandedHeaderOpacity = scrollY.interpolate({
      inputRange: [0, HEADER_ANIMATION_DISTANCE / 2],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    const collapsedHeaderOpacity = scrollY.interpolate({
      inputRange: [HEADER_ANIMATION_DISTANCE / 2, HEADER_ANIMATION_DISTANCE],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    const fabTranslateY = fabAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [150, 0],
    });
    const fabScale = fabPulseAnim.interpolate({
      inputRange: [0,1],
      outputRange: [1, 1.1]
    });

    return (
      <View style={{ flex: 1, width: '100%' }}>
        <Animated.FlatList
          data={displayedClaims}
          renderItem={renderClaimItem} // <--- NOW USING THE MEMOIZED FUNCTION
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          
          // FIX: Add these performance props to prevent memory spikes and flashing
          initialNumToRender={10}     // Only render top 10 first
          maxToRenderPerBatch={10}    // Render more in small batches
          windowSize={5}              // Keep memory usage low
          removeClippedSubviews={true} // Unmount items off-screen (Android fix)
          
          contentContainerStyle={{
            paddingTop: EXPANDED_HEADER_HEIGHT + SEARCH_BAR_HEIGHT,
            paddingBottom: 120, 
            paddingHorizontal: 10, 
            gap: 12
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
        
        <Animated.View style={[styles.fixedHeaderBlock, { 
            height: EXPANDED_HEADER_HEIGHT + SEARCH_BAR_HEIGHT,
            transform: [{ translateY: headerTranslateY }],
        }]}>
            <View style={styles.headerBackdrop} />

            <Animated.View style={[styles.expandedHeader, { opacity: expandedHeaderOpacity }]}>
                <Text style={styles.heroTitle}>ما هي وعود المنتج؟</Text>
                <Text style={styles.heroSub}>حدد الادعاءات المكتوبة على العبوة.</Text>
            </Animated.View>

            <Animated.View style={[styles.collapsedHeader, { opacity: collapsedHeaderOpacity }]}>
                <SafeAreaView>
                  <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => changeStep(step - 1)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.collapsedHeaderText}>ما هي وعود المنتج؟</Text>
                    <View style={{width: 40}} />
                  </View>
                </SafeAreaView>
            </Animated.View>

            <View style={styles.claimsSearchContainer}>
                <View style={styles.searchInputWrapper}>
                    <FontAwesome5 name="search" size={16} color={COLORS.textDim} style={styles.searchIcon} />
                    <TextInput
                        style={styles.claimsSearchInput}
                        placeholder="ابحث عن إدعاء..."
                        placeholderTextColor={COLORS.textDim}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>
        </Animated.View>

        <View style={styles.fabContainer}>
            <Animated.View
                style={{
                    transform: [{ translateY: fabTranslateY }],
                }}
            >
                <Animated.View style={{ transform: [{ scale: fabScale }] }}>
                    <TouchableOpacity
                        onPress={executeAnalysis} 
                        style={styles.fab}
                    >
                        <FontAwesome5 name="flask" color={COLORS.darkGreen} size={28} />
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </View>
      </View>
    );
  };
  
  const renderLoading = () => {
    return ( 
      <View style={styles.loadingContainer}>
          <Animated.Text style={[styles.loadingText, { 
              opacity: heroTransitionAnim.interpolate({
                inputRange: [0.5, 1], 
                outputRange: [0, 1],
                extrapolate: 'clamp',
              })
          }]}>
              جاري تحليل التركيبة...
          </Animated.Text>
      </View>
    );
  };

  const BreathingGlow = ({ children, color = COLORS.accentGreen, delay = 0 }) => {
    const glowAnim = useRef(new Animated.Value(0)).current;
  
    useEffect(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
            delay: delay
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }, []);
  
    const scale = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.02], // Subtle size increase
    });
  
    const shadowOpacity = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 0.6], // Glowing shadow
    });
  
    return (
      <Animated.View style={{ 
        transform: [{ scale }],
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity,
        shadowRadius: 10,
        elevation: 5, // Android glow
        flex: 1, 
      }}>
        {children}
      </Animated.View>
    );
  };

  // ... inside oilguard.js

  const renderResultStep = () => {
    // 1. Basic check
    if (!finalAnalysis) return null;

    // 2. Safe Data Extraction (Defensive Programming)
    // We default to empty objects/arrays to prevent "undefined" errors
    const personalMatch = finalAnalysis.personalMatch || { status: 'unknown', reasons: [] };
    const safety = finalAnalysis.safety || { score: 0 };
    const efficacy = finalAnalysis.efficacy || { score: 0 };
    const marketingResults = finalAnalysis.marketing_results || [];
    const detectedIngredients = finalAnalysis.detected_ingredients || [];

    // 3. Match Status Logic with Fallback
    const matchConfig = {
        good: { color: COLORS.success, icon: 'check-double', text: 'مناسب لك', glow: 'rgba(34, 197, 94, 0.2)' },
        warning: { color: COLORS.warning, icon: 'exclamation', text: 'انتبه', glow: 'rgba(245, 158, 11, 0.2)' },
        danger: { color: COLORS.danger, icon: 'times', text: 'غير مناسب', glow: 'rgba(239, 68, 68, 0.2)' },
        // Fallback for 'unknown' or missing status
        unknown: { color: COLORS.primary, icon: 'check', text: 'تم التحليل', glow: COLORS.primaryGlow }
    }[personalMatch.status] || { color: COLORS.primary, icon: 'check', text: 'تم التحليل', glow: COLORS.primaryGlow };

    return (
        <View style={{width: '100%', gap: 0}}>
            
            {/* --- 1. THE HERO DASHBOARD + ACTIONS FOOTER --- */}
            <StaggeredItem index={0}>
                <View style={[styles.dashboardContainer, { borderColor: matchConfig.color }]}>
                    
                    {/* Background */}
                    <LinearGradient
                        colors={['rgba(255,255,255,0.05)', 'transparent']}
                        style={StyleSheet.absoluteFill}
                    />
                    
                    {/* Corners */}
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />

                    {/* A. CONTENT SECTION */}
                    <View style={styles.dashboardGlass}>
                        
                        {/* Header */}
                        <View style={styles.dashHeader}>
                            <View style={[styles.matchBadge, { borderColor: matchConfig.color, backgroundColor: matchConfig.glow }]}>
                                <Text style={[styles.matchText, { color: matchConfig.color }]}>{matchConfig.text}</Text>
                                <FontAwesome5 name={matchConfig.icon} size={12} color={matchConfig.color} />
                            </View>
                            <Text style={styles.productTypeLabel}>
                                {PRODUCT_TYPES.find(t => t.id === productType)?.label || 'GENERIC SCAN'}
                            </Text>
                        </View>

                        {/* Gauge */}
                        <View style={styles.gaugeSection}>
                            <ComplexDashboardGauge score={finalAnalysis.oilGuardScore || 0} />
                            <View style={{ marginTop: -15, alignItems: 'center' }}>
                                <Text style={styles.verdictBig}>{finalAnalysis.finalVerdict || "تم التحليل"}</Text>
                                <Text style={styles.verdictLabel}>حكم وثيق</Text>
                            </View>
                        </View>

                        {/* Stats (Safe Access) */}
                        <View style={styles.statsGrid}>
                            <GlassPillar 
                                label="الأمان" 
                                score={safety.score} 
                                color={safety.score >= 70 ? COLORS.success : (safety.score >= 40 ? COLORS.warning : COLORS.danger)} 
                                icon="shield-alt"
                            />
                            <GlassPillar 
                                label="الفعالية" 
                                score={efficacy.score} 
                                color={COLORS.info} 
                                icon="flask"
                            />
                        </View>

                        {/* --- ENHANCED BREAKDOWN TRIGGER (Pop & Clean) --- */}
                        <TouchableOpacity 
                            onPress={() => setBreakdownModalVisible(true)}
                            activeOpacity={0.7}
                            style={{
                                flexDirection: 'row-reverse', // RTL
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginTop: 12,                        
                                paddingVertical: 12,
                                paddingHorizontal: 16,
                                backgroundColor: 'rgba(255, 255, 255, 0.03)', // Subtle glass fill
                                borderRadius: 16,
                            }}
                        >
                            <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 10}}>
                                {/* Mini Icon Badge */}
                                <View style={{
                                    width: 24, height: 24, borderRadius: 12,
                                    backgroundColor: 'rgba(90, 156, 132, 0.1)',
                                    alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <FontAwesome5 name="microscope" size={11} color={COLORS.accentGreen} />
                                </View>
                                
                                <Text style={{
                                    fontFamily: 'Tajawal-Bold', // Thicker font
                                    fontSize: 15,
                                    color: COLORS.textPrimary,  // Brighter text
                                    letterSpacing: 0.3
                                }}>
                                    تحليل تفصيلي للدرجة
                                </Text>
                            </View>

                            <FontAwesome5 name="chevron-left" size={10} color={COLORS.textDim} />
                        </TouchableOpacity>

                        {/* Match Reasons (Safe Access) */}
                        <MatchBreakdown 
                            reasons={personalMatch.reasons} 
                            overallStatus={personalMatch.status} 
                        />
                    </View>

                    {/* B. ACTION ROW */}
                    <ActionRow 
                        onSave={() => setSaveModalVisible(true)}
                        onReset={resetFlow}
                        analysis={finalAnalysis}
                        productTypeLabel={PRODUCT_TYPES.find(t => t.id === productType)?.label || 'منتج'}
                    />

                </View>
            </StaggeredItem>

            {/* --- 2. MARKETING CLAIMS --- */}
            {marketingResults.length > 0 && (
                <StaggeredItem index={1}>
                   <MarketingClaimsSection results={marketingResults} />
                </StaggeredItem>
            )}

            {/* --- 3. INGREDIENTS CAROUSEL --- */}
            {detectedIngredients.length > 0 && (
                <StaggeredItem index={2}>
                     <View style={{flexDirection:'row-reverse', alignItems:'center', marginTop: 20, marginBottom: 15, paddingHorizontal: 5}}>
                         <Text style={styles.resultsSectionTitle}>{`المكونات (${detectedIngredients.length})`}</Text>
                         <View style={{backgroundColor: 'rgba(255,255,255,0.1)', height:1, flex:1, marginRight: 15}} />
                    </View>
                    
                    <Pagination data={detectedIngredients} scrollX={scrollX} />

                    <View style={{ marginHorizontal: -20 }}>
                        <Animated.FlatList
                            data={detectedIngredients}
                            renderItem={({ item, index }) => (
                                <IngredientDetailCard ingredient={item} index={index} scrollX={scrollX} />
                            )}
                            keyExtractor={item => item.id || `ing-${index}`} // Safe Key
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={ITEM_WIDTH}
                            decelerationRate="fast"
                            contentContainerStyle={{ paddingHorizontal: (width - CARD_WIDTH) / 2 }}
                            ItemSeparatorComponent={() => <View style={{ width: SEPARATOR_WIDTH }} />}
                            onScrollBeginDrag={() => setShowSwipeHint(false)}
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                                { useNativeDriver: true }
                            )}
                            scrollEventThrottle={16}
                        />
                        {showSwipeHint && detectedIngredients.length > 1 && <SwipeHint />}
                    </View>
                </StaggeredItem>
            )}
            
            <View style={{height: 40}} />
        </View>
    );
};
  
return (
    <View 
        style={[styles.container, { backgroundColor: '#1A2D27' }]}
        // ROOT FIX: We measure the actual available space from the OS
        onLayout={(e) => {
            const { height } = e.nativeEvent.layout;
            // Only accept measurements that look like a full screen
            if (height > SCREEN_HEIGHT * 0.7) {
                setContainerHeight(height);
            }
        }}
    >
        {/* 1. Permanent System Overlays */}
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={styles.darkOverlay} />
        {particles.map((p) => <Spore key={p.id} {...p} />)}

        {/* 
            2. THE ROOT GATEKEEPER 
            If containerHeight is 0, it means the OS hasn't finished 
            calculating the layout. We show NOTHING (just background).
        */}
        {containerHeight === 0 ? (
            <View style={{ flex: 1, backgroundColor: '#1A2D27' }} />
        ) : (
            <View style={{ height: containerHeight, width: '100%', paddingTop: insets.top }}>
                
                {/* Header (Hidden on Step 2) */}
                {step !== 2 && !isAnimatingTransition && (
                    <View style={[styles.header, { marginTop: insets.top }]}>
                        {step === 0 && <View style={styles.headerBlur} />}
                        
                        {step > 0 && (
                            <TouchableOpacity onPress={() => changeStep(step - 1)} style={styles.backBtn}>
                                <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                            </TouchableOpacity>
                        )}
                        
                        {step > 0 && <View style={{ width: 40 }} />}
                    </View>
                )}

                {/* 
                   CONTENT STACK 
                   We use the EXACT measured height from the OS 
                */}
                <View style={{ flex: 1 }}>
                    {step === 2 ? (
                        <Animated.View style={{ 
                            flex: 1, 
                            opacity: contentOpacity,
                            transform: [{ translateX: contentTranslateX }],
                            width: '100%' 
                        }}>
                            {renderClaimsStep()}
                        </Animated.View>
                    ) : step === 0 ? (
                        <Animated.View style={{ 
                            flex: 1,
                            width: '100%', 
                            opacity: contentOpacity,
                            transform: [{ translateX: contentTranslateX }]
                        }}>
                            <InputStepView 
                                onImageSelect={handleImageSelection} 
                                onManualSelect={() => setManualModalVisible(true)} 
                                scanMode={scanMode}
                                setScanMode={setScanMode}
                            />
                        </Animated.View>
                    ) : step === 1 ? (
                        <Animated.View style={{ 
                            flex: 1, 
                            width: '100%',
                            opacity: contentOpacity,
                            transform: [{ translateX: contentTranslateX }],
                            paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight : 40) + 70,
                            paddingHorizontal: 20
                        }}>
                            <ReviewStep 
                                productType={productType} 
                                setProductType={setProductType} 
                                onConfirm={() => changeStep(2)} 
                            />
                        </Animated.View>
                    ) : (
                        <ScrollView 
                            ref={scrollRef} 
                            contentContainerStyle={[
                                styles.scrollContent, 
                                { paddingBottom: 100 + (Platform.OS === 'android' ? 20 : insets.bottom) }
                            ]} 
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            <Animated.View style={{ 
                                opacity: contentOpacity, 
                                width: '100%',
                                transform: [{ translateX: contentTranslateX }]
                            }}>
                                {step === 3 && (
                                    <View style={{ height: height * 0.6, justifyContent: 'center' }}>
                                        <LoadingScreen />
                                    </View>
                                )}

                                {step === 4 && renderResultStep()}
                            </Animated.View>
                        </ScrollView>
                    )}
                </View>
            </View>
        )}

        {/* 3. MODALS (Floating outside the layout calculation) */}
        
        <Modal transparent visible={isSaveModalVisible} animationType="fade" onRequestClose={() => setSaveModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <Pressable style={StyleSheet.absoluteFill} blurRadius={10} onPress={() => setSaveModalVisible(false)} />
                <Animated.View style={styles.modalContent}>
                    <View style={{ alignItems: 'center', marginBottom: 15 }}>
                        <Text style={styles.modalTitle}>حفظ النتيجة</Text>
                        <Text style={styles.modalSub}>أضف صورة للعبوة لتجدها بسهولة في رفّك</Text>
                    </View>
                    
                    <TouchableOpacity onPress={pickFrontImage} style={styles.frontImagePicker} activeOpacity={0.8}>
                        {frontImageUri ? (
                            <>
                                <Image source={{ uri: frontImageUri }} style={styles.frontImagePreview} />
                                <View style={styles.editBadge}>
                                    <Feather name="edit-2" size={12} color="#FFF" />
                                </View>
                            </>
                        ) : (
                            <View style={{ alignItems: 'center', gap: 8 }}>
                                <View style={styles.cameraIconCircle}>
                                    <Feather name="camera" size={24} color={COLORS.accentGreen} />
                                </View>
                                <Text style={styles.pickerText}>صورة المنتج</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>اسم المنتج</Text>
                        <TextInput 
                            style={styles.modalInput} 
                            placeholder="مثال: غسول CeraVe الرغوي" 
                            placeholderTextColor={COLORS.textSecondary} 
                            value={productName} 
                            onChangeText={setProductName} 
                            textAlign="right"
                        />
                    </View>
                    
                    <Pressable onPress={handleSaveProduct} style={styles.modalSaveButton} disabled={isSaving}>
                        {isSaving ? (
                            <ActivityIndicator color={COLORS.textOnAccent} />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.modalSaveButtonText}>حفظ في الرف</Text>
                                <FontAwesome5 name="bookmark" size={14} color={COLORS.textOnAccent} />
                            </View>
                        )}
                    </Pressable>
                </Animated.View>
            </View>
        </Modal>
        
        <ManualInputSheet
            visible={isManualModalVisible}
            onClose={() => setManualModalVisible(false)}
            onSubmit={(text) => {
                setManualInputText(text);
                processManualText(text);
            }}
        />
    
        <CustomCameraModal
            isVisible={isCameraViewVisible}
            onClose={() => setCameraViewVisible(false)}
            onPictureTaken={handlePictureTaken}
        />

        <ImageCropperModal
            isVisible={cropperVisible}
            imageUri={tempImageUri}
            onClose={() => setCropperVisible(false)}
            onCropComplete={(cropped) => {
                setCropperVisible(false);
                processImageWithGemini(cropped.uri);
            }}
        />

        <ScoreBreakdownModal 
            visible={isBreakdownModalVisible}
            onClose={() => setBreakdownModalVisible(false)}
            data={finalAnalysis?.scoreBreakdown}
        />
    </View>
);
}