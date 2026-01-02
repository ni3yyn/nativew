import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, Dimensions, Image,
  ScrollView, Animated, ImageBackground, Platform, ActivityIndicator, 
  Alert, UIManager, LayoutAnimation, StatusBar, TextInput, Modal, Pressable, I18nManager,
  RefreshControl, Easing, FlatList, PanResponder, Vibration, StyleSheet
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Image as RNImage, } from 'react-native';
import Svg, { Circle, Path, Defs, ClipPath, Rect, Mask } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../src/config/firebase';
import { useAppContext } from '../../src/context/AppContext';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as NavigationBar from 'expo-navigation-bar';
import Fuse from 'fuse.js';
// ... other imports
import { PremiumShareButton } from './ShareComponent'; // Adjust path if needed
import { uploadImageToCloudinary, compressImage } from '../../src/services/imageService'; 
import { AlertService } from '../../src/services/alertService';
import { uriToBase64 } from '../../src/utils/formatters';
import { PRODUCT_TYPES, getClaimsByProductType } from '../../src/constants/productData';
import CustomCameraModal from '../../src/components/oilguard/CustomCameraModal'; // <--- NEW IMPORT
import ImageCropperModal from '../../src/components/oilguard/ImageCropperModal';

// --- DATA IMPORTS REMOVED: LOGIC IS NOW ON SERVER ---

// --- STYLE & CONSTANT IMPORTS ---
import { 
  styles, COLORS, width, height, 
  ITEM_WIDTH, SEPARATOR_WIDTH, CARD_WIDTH,
  DOT_SIZE, PAGINATION_DOTS, DOT_SPACING
} from './oilguard.styles';

// --- SYSTEM CONFIG ---
I18nManager.allowRTL(false);

// UPDATED: Check for Fabric before enabling LayoutAnimation to prevent warning
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  if (!global?.nativeFabricUIManager) { // Only enable if NOT using New Architecture
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// ENDPOINTS
const VERCEL_BACKEND_URL = "https://oilguard-backend.vercel.app/api/analyze.js"; // OR api/scan
const VERCEL_EVALUATE_URL = "https://oilguard-backend.vercel.app/api/evaluate.js";



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

const PressableScale = ({ onPress, children, style, disabled }) => {
    const scale = useRef(new Animated.Value(1)).current; 
    const pressIn = () => !disabled && Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
    const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
    return (
        <Pressable onPress={() => { if(onPress && !disabled) { Haptics.selectionAsync(); onPress(); } }} onPressIn={pressIn} onPressOut={pressOut} disabled={disabled} style={style}>
            <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
        </Pressable>
    );
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

const ClaimsGroupedView = ({ results }) => {
  const groupedResults = useMemo(() => {
      return results.reduce((acc, result) => {
          if (result.status.includes('✅') || result.status.includes('🌿')) {
              acc.proven.push(result);
          } else if (result.status.includes('⚖️')) {
              acc.doubtful.push(result);
          } else {
              acc.false.push(result);
          }
          return acc;
      }, { proven: [], doubtful: [], false: [] });
  }, [results]);

  const ClaimGroup = ({ title, icon, color, claims }) => {
      if (claims.length === 0) return null;
      return (
          <View style={{ marginBottom: 15 }}>
              <View style={styles.groupHeader}>
                  <FontAwesome5 name={icon} size={16} color={color} />
                  <Text style={[styles.groupTitle, { color }]}>{title}</Text>
              </View>
              {claims.map((claim, i) => (
                  <EnhancedTruthCard key={claim.claim} result={claim} index={i} />
              ))}
          </View>
      );
  };

  return (
      <View>
          <ClaimGroup title="ادعاءات مثبتة" icon="check-circle" color={COLORS.success} claims={groupedResults.proven} />
          <ClaimGroup title="ادعاءات مشكوك فيها" icon="exclamation-triangle" color={COLORS.warning} claims={groupedResults.doubtful} />
          <ClaimGroup title="ادعاءات تسويقية بحتة" icon="times-circle" color={COLORS.danger} claims={groupedResults.false} />
      </View>
  );
};

const EnhancedTruthCard = ({ result, index }) => {
  const [isOpen, setIsOpen] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  const toggle = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring); 
      setIsOpen(!isOpen);
      Animated.timing(rotation, {
          toValue: isOpen ? 0 : 1,
          duration: 300,
          useNativeDriver: true,
      }).start();
  };

  const rotateChevron = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
  });

  const allEvidence = [...result.proven, ...result.traditionallyProven, ...result.doubtful, ...result.ineffective];

  return (
      <StaggeredItem index={index}>
          <View style={styles.truthCard}>
              <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={styles.truthTrigger}>
                  <ConfidenceRing confidence={result.confidence} />
                  <View style={styles.truthTitleContainer}>
                      <Text style={styles.truthTitle}>{result.claim}</Text>
                      <Text style={styles.truthStatus}>{result.status}</Text>
                  </View>
                  <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
                      <FontAwesome5 name={"chevron-down"} size={14} color={COLORS.textDim} />
                  </Animated.View>
              </TouchableOpacity>

              {isOpen && (
                  <View style={styles.truthDetails}>
                      <Text style={styles.truthExplanation}>{result.explanation}</Text>
                      {allEvidence.length > 0 && (
                          <View style={styles.evidenceContainer}>
                              <Text style={styles.evidenceTitle}>الأدلة:</Text>
                              <View style={styles.evidencePillsContainer}>
                                  {result.proven.map(ing => <View key={ing} style={[styles.evidencePill, styles.pillProven]}><Text style={styles.evidencePillText}>{ing}</Text></View>)}
                                  {result.traditionallyProven.map(ing => <View key={ing} style={[styles.evidencePill, styles.pillTraditional]}><Text style={styles.evidencePillText}>{ing}</Text></View>)}
                                  {result.doubtful.map(ing => <View key={ing} style={[styles.evidencePill, styles.pillDoubtful]}><Text style={styles.evidencePillText}>{ing}</Text></View>)}
                                  {result.ineffective.map(ing => <View key={ing} style={[styles.evidencePill, styles.pillIneffective]}><Text style={styles.evidencePillText}>{ing}</Text></View>)}
                              </View>
                          </View>
                      )}
                  </View>
              )}
          </View>
      </StaggeredItem>
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
      <PressableScale onPress={onPress}>
        <Animated.View style={[styles.typeChip, { backgroundColor }]}>
          <FontAwesome5 name={type.icon} color={iconColor} size={14} />
          <Animated.Text style={[styles.typeText, { color: textColor }]}>
            {type.label}
          </Animated.Text>
        </Animated.View>
      </PressableScale>
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
const InputStepView = React.memo(({ onImageSelect }) => {
    const scanBarAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(scanBarAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: Platform.OS !== 'web'
                }),
                Animated.timing(scanBarAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: Platform.OS !== 'web'
                })
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const scanTranslateY = scanBarAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 140]
    });

    return (
        <View style={styles.inputStepContainer}>
            <View style={styles.heroVisualContainer}>
                <View style={styles.scanFrame}>
                    <FontAwesome5 name="wine-bottle" size={80} color={COLORS.textSecondary} style={{ opacity: 0.5 }} />
                    <Animated.View style={[
                        styles.scanLaser,
                        { transform: [{ translateY: scanTranslateY }] }
                    ]}>
                        <LinearGradient
                            colors={['transparent', COLORS.accentGreen, 'transparent']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={{ flex: 1 }}
                        />
                    </Animated.View>
                    <View style={[styles.scanCorner, styles.scanCornerTL]} />
                    <View style={[styles.scanCorner, styles.scanCornerTR]} />
                    <View style={[styles.scanCorner, styles.scanCornerBL]} />
                    <View style={[styles.scanCorner, styles.scanCornerBR]} />
                </View>
            </View>

            <StaggeredItem index={0} style={styles.bottomDeck}>
                <LinearGradient
                    colors={[COLORS.card, '#152520']}
                    style={styles.bottomDeckGradient}
                >
                    <View style={styles.deckHeader}>
                        <Text style={styles.deckTitle}>فحص المكونات</Text>
                        <Typewriter
                            texts={[
                                "كشف الخبايا الكيميائية...",
                                "تحليل مدى الأمان...",
                                "هل يناسب بشرتك؟",
                            ]}
                            typingSpeed={60}
                            style={{
                                container: { height: 24, justifyContent: 'center' },
                                text: { fontFamily: 'Tajawal-Regular', color: COLORS.accentGreen, fontSize: 14 }
                            }}
                        />
                    </View>

                    <PressableScale onPress={() => onImageSelect('camera')} style={styles.primaryActionBtn}>
                        <LinearGradient
                            colors={[COLORS.accentGreen, '#4a8570']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.primaryActionGradient}
                        >
                            <View style={styles.iconCircle}>
                                <Ionicons name="camera" size={28} color={COLORS.background} />
                            </View>
                            <View>
                                <Text style={styles.primaryActionTitle}>تصوير المنتج</Text>
                                <Text style={styles.primaryActionSub}>التقط صورة واضحة للمكونات الخلفية</Text>
                            </View>
                            <Ionicons name="chevron-back" size={24} color={COLORS.background} style={{ opacity: 0.6, marginRight: 'auto' }} />
                        </LinearGradient>
                    </PressableScale>

                    <View style={styles.secondaryActionsRow}>
                        <PressableScale onPress={() => onImageSelect('gallery')} style={styles.secondaryBtn}>
                            <Ionicons name="images" size={22} color={COLORS.textSecondary} />
                            <Text style={styles.secondaryBtnText}>المعرض</Text>
                        </PressableScale>
                        <View style={styles.verticalDivider} />
                        <PressableScale onPress={() => { /* Add logic */ }} style={styles.secondaryBtn}>
                            <Ionicons name="search" size={22} color={COLORS.textSecondary} />
                            <Text style={styles.secondaryBtnText}>بحث يدوي</Text>
                        </PressableScale>
                    </View>
                </LinearGradient>
            </StaggeredItem>
        </View>
    );
});


// ============================================================================
//                        MAIN SCREEN COMPONENT
// ============================================================================
export default function OilGuardEngine() {
  const router = useRouter();
  const { user, userProfile } = useAppContext();
  const insets = useSafeAreaInsets();

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

  const contentOpacity = useRef(new Animated.Value(1)).current;
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

  const changeStep = useCallback((next) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      Animated.timing(contentOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  }, [contentOpacity]);


  const handleImageSelection = useCallback(async (mode) => {
    try {
        if (mode === 'camera') {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('عذراً', 'يجب السماح بالوصول للكاميرا لالتقاط صورة.');
                return;
            }
            setCameraViewVisible(true);
            return; 
        }

        if (mode === 'gallery') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('عذراً', 'يجب السماح بالوصول للمعرض لاختيار صورة.');
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
    const base64Data = await uriToBase64(uri);

    // Call VERCEL OCR Endpoint
    const response = await fetch(VERCEL_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ base64Data: base64Data }),
    });

    const responseData = await response.json();
    console.log("OCR Response Data:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      throw new Error(responseData.error || "An error occurred in the backend.");
    }

    let text = responseData.result.replace(/```json|```/g, '').trim();
    const jsonResponse = JSON.parse(text);
    const rawList = jsonResponse.ingredients_list || [];
    
    // Updated: Simplified extraction that DOES NOT rely on local DB
    const { ingredients } = await extractIngredientsFromAIText(rawList);
    
    setOcrText(rawList.join('\n')); 
    setPreProcessedIngredients(ingredients);
    setProductType(jsonResponse.detected_type || 'other');

    setIsGeminiLoading(false);
    setLoading(false);
    changeStep(1);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  } catch (error) {
    console.error("Vercel Backend Error:", error);
    Alert.alert("Analysis Failed", `Could not process image: ${error.message}`);
    setIsGeminiLoading(false);
    setLoading(false);
    changeStep(0);
  }
};

  const executeAnalysis = () => {
    if (!fabRef.current) return;

    fabRef.current.measure((fx, fy, width, height, px, py) => {
      setFabMetrics({ x: px, y: py, width, height });
      
      const destX = (Dimensions.get('window').width / 2) - (width / 2);
      const destY = (Dimensions.get('window').height / 2) - (height / 2);

      setIsAnimatingTransition(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Animated.timing(heroTransitionAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
        useNativeDriver: true,
      }).start(async () => {
        
        // --- NEW SERVER CALL ---
        try {
            // 1. Prepare raw list (just names)
            const rawList = preProcessedIngredients.map(i => i.name);

            // 2. Call your NEW endpoint
            const response = await fetch(VERCEL_EVALUATE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            
            // 3. Set Data & Transition
            setFinalAnalysis(fullAnalysisData);
            
            setIsAnimatingTransition(false);
            heroTransitionAnim.setValue(0);
            changeStep(4);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        } catch (error) {
            console.error(error);
            Alert.alert("Analysis Error", "Could not connect to analysis server.");
            setIsAnimatingTransition(false);
            heroTransitionAnim.setValue(0);
        }
        // -----------------------

      });

      setTimeout(() => {
        changeStep(3);
      }, 200);
    });
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
            () => router.replace('/(main)/profile')
        );

    } catch (error) {
        console.error(error);
        AlertService.error("خطأ", "تعذر حفظ المنتج.");
        setIsSaving(false);
    }
  };

  const resetFlow = () => {
    setIsGeminiLoading(false);
    setStep(0); setFinalAnalysis(null); setOcrText(''); 
      setPreProcessedIngredients([]); setSelectedClaims([]);
      setShowSwipeHint(true);
      setSearchQuery('');
      setProductName(''); setShowManualTypeGrid(false); setManualIngredients('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFrontImageUri(null);
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
                      setCropperVisible(true);

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


  const renderReviewStep = () => (
    <ContentCard>
      <View style={styles.contentContainer}>
        <StaggeredItem index={0}>
            <Text style={styles.sectionTitle}><FontAwesome5 name="robot" /> ما الذي يعتقده الذكاء الاصطناعي؟</Text>
            <View style={styles.aiPredictionCard}>
                <View style={styles.aiPredictionIconContainer}>
                    <FontAwesome5 name={PRODUCT_TYPES.find(t => t.id === productType)?.icon || 'shopping-bag'} size={30} color={COLORS.primary} />
                </View>
                <View>
                    <Text style={styles.aiPredictionLabel}>نوع المنتج المكتشف:</Text>
                    <Text style={styles.aiPredictionValue}>{PRODUCT_TYPES.find(t => t.id === productType)?.label || 'غير معروف'}</Text>
                </View>
            </View>
            {!showManualTypeGrid && (
              <PressableScale 
                onPress={() => {
                  setShowManualTypeGrid(true);
                }} 
                style={styles.changeTypeButton}
              >
                <Text style={styles.changeTypeText}>تغيير النوع يدوياً <FontAwesome5 name="edit" /></Text>
              </PressableScale>
            )}
        </StaggeredItem>

        {showManualTypeGrid && (
            <View style={{width: '100%'}}>
              <StaggeredItem index={1}>
                 <Text style={[styles.sectionTitle, {marginTop: 25, marginBottom: 20}]}>اختر النوع الصحيح:</Text>
              </StaggeredItem>
              <View style={styles.typeGrid}>
                  {PRODUCT_TYPES.map((t, index) => ( 
                      <AnimatedTypeChip
                          key={t.id}
                          type={t}
                          isSelected={productType === t.id}
                          onPress={() => setProductType(t.id)}
                          index={index}
                      />
                  ))}
              </View>
            </View>
        )}
        
        <StaggeredItem index={showManualTypeGrid ? 2 : 1} style={{width: '100%', marginTop: 30}}>
            <PressableScale onPress={() => changeStep(2)} style={styles.mainBtn}>
                <Text style={styles.mainBtnText}>تأكيد والمتابعة للادعاءات</Text>
                <FontAwesome5 name="arrow-right" color={COLORS.darkGreen} size={18} />
            </PressableScale>
        </StaggeredItem>
      </View>
      </ContentCard>
  );
  
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

    const renderClaimItem = ({ item, index }) => {
      const isSelected = selectedClaims.includes(item);
      return (
        <StaggeredItem index={index}>
          <PressableScale onPress={() => {
            Haptics.selectionAsync();
            setSelectedClaims(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]);
          }}>
            <View style={[styles.claimItem, isSelected && styles.claimItemActive]}>
              <AnimatedCheckbox isSelected={isSelected} />
              <Text style={styles.claimItemText}>{item}</Text>
            </View>
          </PressableScale>
        </StaggeredItem>
      );
    };

    return (
      <View style={{ flex: 1, width: '100%' }}>
        <Animated.FlatList
          data={displayedClaims}
          renderItem={renderClaimItem}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: EXPANDED_HEADER_HEIGHT + SEARCH_BAR_HEIGHT,
            paddingBottom: 120, paddingHorizontal: 10, gap: 12
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
                    <PressableScale onPress={() => changeStep(step - 1)} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                    </PressableScale>
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

        <View 
            style={styles.fabContainer}
        >
            <Animated.View
                ref={fabRef} 
                style={{
                    transform: [{ translateY: fabTranslateY }],
                    opacity: isAnimatingTransition ? 0 : 1 
                }}
            >
                <Animated.View style={{ transform: [{ scale: fabScale }] }}>
                    <PressableScale
                        onPress={executeAnalysis} 
                        style={styles.fab}
                    >
                        <FontAwesome5 name="flask" color={COLORS.darkGreen} size={22} />
                    </PressableScale>
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
    if(!finalAnalysis) return null;
    return (
        <View style={{width: '100%', gap: 15}}>
            {/* Personal Match Card */}
            {finalAnalysis.personalMatch.reasons.length > 0 && <StaggeredItem index={0}>
                <ContentCard style={[styles.personalMatchCard, styles[`personalMatch_${finalAnalysis.personalMatch.status}`]]}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                        <FontAwesome5 name={finalAnalysis.personalMatch.status === 'danger' ? 'times-circle' : finalAnalysis.personalMatch.status === 'warning' ? 'exclamation-triangle' : 'check-circle'} size={24} color={'#FFF'}/>
                        <Text style={styles.personalMatchTitle}>{finalAnalysis.personalMatch.status === 'danger' ? 'غير موصى به لك' : finalAnalysis.personalMatch.status === 'warning' ? 'استخدمه بحذر' : 'مطابقة ممتازة لملفك'}</Text>
                    </View>
                    {finalAnalysis.personalMatch.reasons.map((reason, i) => <Text key={i} style={styles.personalMatchReason}>{reason}</Text>)}
                </ContentCard>
            </StaggeredItem>}

            {/* Score Card */}
            <StaggeredItem index={1}>
                <ContentCard style={styles.vScoreCard}>
                    <Text style={styles.verdictText}>{finalAnalysis.finalVerdict}</Text>
                    <ScoreRing score={finalAnalysis.oilGuardScore} />
                    <View style={styles.pillarsRow}>
                        <View style={styles.pillar}>
                            <Text style={styles.pillarTitle}><FontAwesome5 name="flask" /> الفعالية</Text>
                            <Text style={[styles.pillarScore, {color: COLORS.info}]}>{finalAnalysis.efficacy.score}%</Text>
                        </View>
                        <View style={styles.pillar}>
                            <Text style={styles.pillarTitle}><FontAwesome5 name="shield-alt" /> السلامة</Text>
                            <Text style={[styles.pillarScore, {color: COLORS.primary}]}>{finalAnalysis.safety.score}%</Text>
                        </View>
                    </View>
                </ContentCard>
            </StaggeredItem>

            {/* --- UPDATED HERO ACTION ROW --- */}
            {/* --- UPDATED HERO ACTION ROW --- */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginTop: 15,
                marginBottom: 25,
                paddingHorizontal: 5,
            }}>
                
                {/* 1. HERO SAVE BUTTON */}
                <StaggeredItem index={2} style={{flex: 1}}>
                    <BreathingGlow color={COLORS.accentGreen} delay={0}>
                        <PressableScale onPress={() => setSaveModalVisible(true)} style={{ width: '100%' }}>
                            <LinearGradient
                                colors={[COLORS.card, '#2C4A42']} 
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={{
                                    // CHANGED: Used paddingVertical instead of fixed height to match Share button's bulk
                                    paddingVertical: 14, 
                                    borderRadius: 15, 
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12, 
                                    borderWidth: 1,
                                    borderColor: COLORS.accentGreen,
                                    width: '100%',
                                }}
                            >
                                <Text style={{
                                    fontFamily: 'Tajawal-Bold',
                                    fontSize: 16, 
                                    color: COLORS.textPrimary,
                                }}>حفظ</Text>
                                <FontAwesome5 name="bookmark" color={COLORS.textPrimary} size={18} />
                            </LinearGradient>
                        </PressableScale>
                    </BreathingGlow>
                </StaggeredItem>

                {/* 2. HERO SHARE BUTTON (Premium) */}
                <StaggeredItem index={3} style={{flex: 1}}> 
                    <BreathingGlow color={COLORS.gold} delay={1000}>
                        {/* Ensure wrapper allows the button's internal padding to dictate size if needed, 
                            but keeping min-height/overflow for shape consistency */}
                        <View style={{ borderRadius: 15, overflow: 'hidden', width: '100%' }}>
                            <PremiumShareButton 
                                analysis={finalAnalysis} 
                                typeLabel={PRODUCT_TYPES.find(t => t.id === productType)?.label || 'منتج تجميلي'}
                            />
                        </View>
                    </BreathingGlow>
                </StaggeredItem>

                {/* 3. RESET BUTTON */}
                <StaggeredItem index={4}>
                    {/* Updated height to 'auto' with padding to match the new buttons, or kept fixed if icon-only */}
                    <PressableScale onPress={resetFlow} style={{
                        width: 50, 
                        // Matched vertical padding logic roughly to align (approx 56px total height)
                        height: 56,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                    }}>
                         <FontAwesome5 name="redo" color={COLORS.textSecondary} size={18} />
                    </PressableScale>
                </StaggeredItem>
            </View>
            {/* ------------------------- */}

            {finalAnalysis.marketing_results.length > 0 && (
                <StaggeredItem index={4}>
                    <Text style={styles.resultsSectionTitle}>🔬 كشف حقائق الادعاءات</Text>
                    <ClaimsGroupedView results={finalAnalysis.marketing_results} />
                </StaggeredItem>
            )}

            {finalAnalysis.detected_ingredients.length > 0 && (
                <StaggeredItem index={5}>
                    <Text style={styles.resultsSectionTitle}>
                        {`🌿 المكونات المكتشفة (${finalAnalysis.detected_ingredients.length})`}
                    </Text>
                    
                    <Pagination data={finalAnalysis.detected_ingredients} scrollX={scrollX} />

                    <View style={{ marginHorizontal: -20 }}>
                        <Animated.FlatList
                            data={finalAnalysis.detected_ingredients}
                            renderItem={({ item, index }) => (
                                <IngredientDetailCard ingredient={item} index={index} scrollX={scrollX} />
                            )}
                            keyExtractor={item => item.id}
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
                        {showSwipeHint && finalAnalysis.detected_ingredients.length > 1 && <SwipeHint />}
                    </View>
                </StaggeredItem>
            )}
        </View>
    );
};
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={styles.container}>
            <View style={styles.darkOverlay} />
            {particles.map((p) => <Spore key={p.id} {...p} />)}

            {step !== 2 && !isAnimatingTransition && (
              <View style={[styles.header, { marginTop: insets.top }]}>
                {step === 0 && <View style={styles.headerBlur} />}
                
                {step > 0 && (
                  <PressableScale onPress={() => changeStep(step - 1)} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                  </PressableScale>
                )}
                
                {step > 0 && <View style={{width: 40}}/>}
              </View>
            )}

            {step === 2 ? (
                <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
                    {renderClaimsStep()}
                </Animated.View>
            ) : step === 0 ? (
                <View style={{ flex: 1 }}>
                     <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
                        <InputStepView onImageSelect={handleImageSelection} />
                     </Animated.View>
                </View>
            ) : (
                <ScrollView 
                    ref={scrollRef} 
                    contentContainerStyle={[
                      styles.scrollContent, 
                      { paddingBottom: 100 + insets.bottom }
                    ]} 
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View style={{ opacity: contentOpacity, width: '100%'}}>
                        {step === 1 && renderReviewStep()}
                        {step === 3 && (isGeminiLoading ? renderGeminiLoading() : renderLoading())}
                        {step === 4 && renderResultStep()}
                    </Animated.View>
                </ScrollView>
            )}
        </View>

        <Modal transparent visible={isSaveModalVisible} animationType="fade" onRequestClose={() => setSaveModalVisible(false)}>
            <View style={styles.modalOverlay}>
               <Pressable style={StyleSheet.absoluteFill} blurRadius={10} onPress={() => setSaveModalVisible(false)} />
                  <Animated.View style={styles.modalContent}>
                      <View style={{alignItems:'center', marginBottom: 15}}>
                          <Text style={styles.modalTitle}>حفظ النتيجة</Text>
                          <Text style={styles.modalSub}>أضف صورة للعبوة لتجدها بسهولة في رفّك</Text>
                      </View>
                      
                      <TouchableOpacity onPress={pickFrontImage} style={styles.frontImagePicker} activeOpacity={0.8}>
                          {frontImageUri ? (
                              <>
                                <Image source={{uri: frontImageUri}} style={styles.frontImagePreview} />
                                <View style={styles.editBadge}>
                                    <Feather name="edit-2" size={12} color="#FFF" />
                                </View>
                              </>
                          ) : (
                              <View style={{alignItems:'center', gap: 8}}>
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
                              <View style={{flexDirection:'row', alignItems:'center', gap: 8}}>
                                  <Text style={styles.modalSaveButtonText}>حفظ في الرف</Text>
                                  <FontAwesome5 name="bookmark" size={14} color={COLORS.textOnAccent} />
                              </View>
                          )}
                      </Pressable>
                  </Animated.View>
            </View>
        </Modal>
        
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

        {isAnimatingTransition && (
          <Animated.View
            style={[
              styles.heroFab,
              {
                top: fabMetrics.y,
                left: fabMetrics.x,
                width: fabMetrics.width,
                height: fabMetrics.height,
                transform: [
                   { translateX: heroTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, (width / 2) - fabMetrics.x - (fabMetrics.width / 2)] }) },
                   { translateY: heroTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, (height / 2) - fabMetrics.y - (fabMetrics.height / 2)] }) },
                   { scale: heroTransitionAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) },
                ],
              },
            ]}
          >
            <FontAwesome5 name="flask" color={COLORS.background} size={22} />
          </Animated.View>
        )}
    </View>
  );
}