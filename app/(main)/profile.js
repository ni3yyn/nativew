import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, Pressable, Image,
  Dimensions, ScrollView, Animated, ImageBackground, Modal, FlatList,
  Platform, UIManager, Alert, StatusBar, ActivityIndicator, LayoutAnimation,
  RefreshControl, Keyboard, Easing, I18nManager, AppState, KeyboardAvoidingView
} from 'react-native';
import * as Linking from 'expo-linking';
import { TouchableWithoutFeedback } from 'react-native'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { doc, updateDoc, Timestamp, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useAppContext } from '../../src/context/AppContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, Rect, Mask, Circle, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import * as Location from 'expo-location';
import { generateFingerprint } from '../../src/utils/cacheHelpers';
import AuthenticHeader from '../../src/utils/AuthenticHeader';
import { 
    commonAllergies, 
    commonConditions,
    basicSkinTypes,
    basicScalpTypes
  } from '../../src/data/allergiesandconditions';
import { PRODUCT_TYPES } from '../../src/constants/productData';
import { AlertService } from '../../src/services/alertService';
import WathiqScoreBadge from '../../src/components/common/WathiqScoreBadge'; // Ensure correct path
import { 
    ShelfEmptyState, 
    AnalysisEmptyState, 
    RoutineEmptyState, 
    IngredientsEmptyState, 
    MigrationSuccessState 
} from '../../src/components/profile/EmptyStates';
import { 
    WeatherLoadingCard, 
    WeatherCompactWidget, 
    WeatherMiniCard, 
    WeatherDetailedSheet,
    LocationPermissionModal 
} from '../../src/components/profile/WeatherComponents'; 
import { AnalysisSection } from '../../src/components/profile/AnalysisSection';
import { PressableScale, ContentCard, StaggeredItem } from '../../src/components/profile/analysis/AnalysisShared'; 
import { RoutineLogViewer } from '../../src/components/profile/routine/RoutineLogViewer';
import { saveOfflineProfile, getOfflineProfile } from '../../src/services/cachingService'; // Adjust path as needed

// --- 1. SYSTEM CONFIG ---

const PROFILE_API_URL = "https://oilguard-backend.vercel.app/api";

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);


// --- 2. THEME & ASSETS ---
const COLORS = {
  // --- Deep Green Thematic Base ---
  background: '#1A2D27', // A rich, very dark forest green.
  card: '#253D34',      // A slightly lighter shade of the forest green for cards.
  border: 'rgba(90, 156, 132, 0.25)', // A border derived from the accent color.
  textDim: '#6B7C76',   // A muted green-gray for less prominent text.
  // --- Elegant Emerald Accent ---
  accentGreen: '#5A9C84', // A confident, muted emerald/seafoam green accent.
  accentGlow: 'rgba(90, 156, 132, 0.4)', // A soft glow for the emerald accent.
  primary: '#A3E4D7',    // A light, soothing minty green for primary elements.
  // --- High-Contrast Text Colors ---
  textPrimary: '#F1F3F2',   // Soft, near-white for excellent readability.
  textSecondary: '#A3B1AC', // Muted, light green-gray for subtitles.
  textOnAccent: '#1A2D27',  // The deep background color for text on accent buttons.
  // --- System & Feedback Colors ---
  danger: '#ef4444', 
  warning: '#f59e0b', 
  info: '#3b82f6', 
  success: '#22c55e',
  gold: '#fbbf24'
};

const HEADER_TITLES = {
    shelf: { title: 'رف المنتجات', icon: 'list' },
    routine: { title: 'روتين العناية', icon: 'calendar-check' },
    analysis: { title: 'تحليل البشرة', icon: 'chart-pie' },
    migration: { title: 'البديل الصحي', icon: 'exchange-alt' },
    ingredients: { title: 'موسوعة المكونات', icon: 'flask' },
    settings: { title: 'الإعدادات', icon: 'cog' },
  };


const HEALTH_OPTS = [
    { id: 'acne_prone', label: 'حب الشباب' },
    { id: 'sensitive_skin', label: 'بشرة حساسة' },
    { id: 'rosacea_prone', label: 'الوردية' },
    { id: 'eczema', label: 'إكزيما' },
    { id: 'pregnancy', label: 'حمل/رضاعة' }
];

const BASIC_HAIR_TYPES = [
    { id: 'straight', label: 'ناعم / مستقيم', icon: 'stream' },
    { id: 'wavy', label: 'مموج', icon: 'water' },
    { id: 'curly', label: 'مجعد', icon: 'holly-berry' },
    { id: 'coily', label: 'أفرو / كيرلي جداً', icon: 'dna' }
];
const BASIC_SKIN_TYPES = [
    { id: 'oily', label: 'دهنية', icon: 'blurType' },
    { id: 'dry', label: 'جافة', icon: 'leaf' },
    { id: 'combo', label: 'مختلطة', icon: 'adjust' },
    { id: 'normal', label: 'عادية', icon: 'smile' },
    { id: 'sensitive', label: 'حساسة', icon: 'heartbeat' }
];

const GOALS_LIST = [
    { id: 'brightening', label: 'تفتيح ونضارة', icon: 'sun' },
    { id: 'acne', label: 'مكافحة حب الشباب', icon: 'shield-alt' },
    { id: 'anti_aging', label: 'مكافحة الشيخوخة', icon: 'hourglass-half' },
    { id: 'hydration', label: 'ترطيب عميق', icon: 'blurType' },
    { id: 'texture_pores', label: 'تحسين الملمس والمسام' , icon: 'th-large'},

];

const INGREDIENT_FILTERS = [
  { id: 'all', label: 'الكل', icon: 'layer-group' },
  { id: 'exfoliants', label: 'مقشرات', icon: 'magic' },
  { id: 'hydrators', label: 'مرطبات', icon: 'blurType' },
  { id: 'antioxidants', label: 'مضادات', icon: 'shield-alt' },
  { id: 'oils', label: 'زيوت', icon: 'oil-can' },
];

// ============================================================================
//                       CORE ANIMATION COMPONENTS
// ============================================================================

// 1. ENHANCED FLOATING SPORES with glass effect
const Spore = ({ size, startX, duration, delay }) => {
    const animY = useRef(new Animated.Value(0)).current; 
    const animX = useRef(new Animated.Value(0)).current; 
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0)).current;
  
    useEffect(() => {
      const floatLoop = Animated.loop(
          Animated.timing(animY, { 
            toValue: 1, 
            duration, 
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true 
          })
      );
      
      const driftLoop = Animated.loop(
          Animated.sequence([
              Animated.timing(animX, { 
                toValue: 1, 
                duration: duration * 0.35, 
                useNativeDriver: true, 
                easing: Easing.sin 
              }),
              Animated.timing(animX, { 
                toValue: -1, 
                duration: duration * 0.35, 
                useNativeDriver: true, 
                easing: Easing.sin 
              }),
              Animated.timing(animX, { 
                toValue: 0, 
                duration: duration * 0.3, 
                useNativeDriver: true, 
                easing: Easing.sin 
              }),
          ])
      );
      
      const opacityPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { 
            toValue: 0.6, 
            duration: duration * 0.2, 
            useNativeDriver: true 
          }),
          Animated.delay(duration * 0.6),
          Animated.timing(opacity, { 
            toValue: 0.2, 
            duration: duration * 0.2, 
            useNativeDriver: true 
          }),
        ])
      );
  
      const scaleIn = Animated.spring(scale, { 
        toValue: 1, 
        friction: 8, 
        tension: 60, 
        useNativeDriver: true,
        delay 
      });
  
      const timeout = setTimeout(() => { 
        scaleIn.start();
        floatLoop.start(); 
        driftLoop.start(); 
        opacityPulse.start();
      }, delay);
  
      return () => { 
        clearTimeout(timeout); 
        floatLoop.stop(); 
        driftLoop.stop(); 
        opacityPulse.stop();
      };
    }, []);
  
    const translateY = animY.interpolate({ 
      inputRange: [0, 1], 
      outputRange: [height + 100, -100] 
    });
    
    const translateX = animX.interpolate({ 
      inputRange: [-1, 1], 
      outputRange: [-35, 35] 
    });
  
    return (
        <Animated.View style={{ 
          position: 'absolute', // Moved here
          zIndex: 0,            // Moved here
          width: size, 
          height: size, 
          borderRadius: size / 2, 
          backgroundColor: COLORS.accentGlow, // Fixed variable name
          transform: [{ translateY }, { translateX }, { scale }], 
          opacity,
        }} />
    );
  };
  

// 2. TACTILE PRESSABLE (Haptics + Shrink)

// RENAMED & REFACTORED ContentCard (formerly ContentCard)

// 4. ANIMATED COUNTER
const AnimatedCount = ({ value, style }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const animValue = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        const end = parseInt(value, 10) || 0;
        if (displayValue === end) return;
        
        animValue.setValue(displayValue);
        Animated.spring(animValue, {
            toValue: end,
            friction: 8,
            tension: 40,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) setDisplayValue(end);
        });
        
        const listener = animValue.addListener(({ value }) => {
            setDisplayValue(Math.floor(value));
        });
        
        return () => animValue.removeListener(listener);
    }, [value]);

    return <Text style={style}>{displayValue}</Text>;
};

// 6. NATIVE CHART RING with enhanced animations
const ChartRing = ({ percentage, radius = 45, strokeWidth = 8, color = COLORS.primary }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const circumference = 2 * Math.PI * radius;
    const [displayPercentage, setDisplayPercentage] = useState(0);
    const rotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Start rotation animation
        Animated.loop(
            Animated.timing(rotation, {
                toValue: 1,
                duration: 4000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();


        // Animate percentage
        Animated.timing(animatedValue, { 
          toValue: percentage, 
          duration: 1500, 
          easing: Easing.out(Easing.exp), 
          useNativeDriver: false 
        }).start();
        
        const listener = animatedValue.addListener(({ value }) => {
            setDisplayPercentage(Math.round(value));
        });
        
        return () => animatedValue.removeListener(listener);
    }, [percentage]);
    
    const rotationInterpolate = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    const strokeDashoffset = circumference - (displayPercentage / 100) * circumference;

    return (
        <View style={{ width: radius*2, height: radius*2, alignItems:'center', justifyContent:'center' }}>
            <Svg width={radius*2} height={radius*2} style={{transform: [{ rotate: '-90deg' }]}}>
                <Circle cx={radius} cy={radius} r={radius - strokeWidth/2} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />
                <Circle 
                    cx={radius} cy={radius} r={radius - strokeWidth/2} 
                    stroke={color} strokeWidth={strokeWidth} fill="none"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </Svg>
            
            {/* Glow effect */}
            <Animated.View style={{
                position: 'absolute',
                width: radius * 2,
                height: radius * 2,
                borderRadius: radius,
                backgroundColor: color,
                opacity: 0.1,
                transform: [{ scale: rotation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.1, 1]
                }) }]
            }} />
            
            <View style={{position: 'absolute', alignItems: 'center'}}>
                <Text style={{color: color, fontFamily: 'Tajawal-Bold', fontSize: 20}}>
                    {displayPercentage}%
                </Text>
            </View>
        </View>
    );
};

// --- COMPONENTS: ORGANIC DOCK ---

const NatureDock = ({ tabs, activeTab, onTabChange }) => {
  const [tabLayouts, setTabLayouts] = useState({});
  
  // Animation value for the pill's horizontal movement
  const pillTranslateX = useRef(new Animated.Value(0)).current;
  
  // The fixed, elegant width of our animated pill
  const PILL_WIDTH = 60;

  useEffect(() => {
      // Find the layout information for the currently active tab
      const activeLayout = tabLayouts[activeTab];

      // If we have layout info, calculate the correct position and animate the pill
      if (activeLayout) {
          // THE CORE FIX: Calculate the target X to CENTER the pill on the icon
          const targetX = activeLayout.x + (activeLayout.width / 2) - (PILL_WIDTH / 2);
          
          Animated.spring(pillTranslateX, {
              toValue: targetX,
              friction: 10,
              tension: 80,
              useNativeDriver: true, // translateX is safe for native driver
          }).start();
      }
  }, [activeTab, tabLayouts]); // Re-run animation when tab or layouts change

  // This function runs for each tab to measure its position on the screen
  const handleLayout = (id, event) => {
      const { x, width } = event.nativeEvent.layout;
      // Store the measurements for each tab
      setTabLayouts(prev => ({ ...prev, [id]: { x, width } }));
  };

  return (
    <View style={styles.dockOuterContainer}>
      <View style={styles.dockContainer}>
        {/* 1. The Animated Pill in the background */}
        <Animated.View style={[
            styles.pillIndicator,
            { width: PILL_WIDTH, transform: [{ translateX: pillTranslateX }] }
        ]} />

        {/* 2. The container for the visible icons/buttons */}
        <View style={styles.tabsContainer}>
          {tabs.map((tab) => (
            <DockItem 
              key={tab.id} 
              item={tab} 
              isActive={activeTab === tab.id} 
              onPress={() => onTabChange(tab.id)}
              onLayout={(event) => handleLayout(tab.id, event)}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const DockItem = ({ item, isActive, onPress, onLayout }) => {
  const labelAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
      Animated.spring(labelAnim, {
          toValue: isActive ? 1 : 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
      }).start();
  }, [isActive]);

  const handlePress = () => {
      if (!isActive) { // Prevent re-tapping the active icon
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
      }
  };

  const labelTranslateY = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [5, 0] });
  const labelOpacity = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
      <TouchableOpacity 
          onPress={handlePress}
          onLayout={onLayout} // This passes the layout measurements up to the parent
          style={styles.dockItem}
          activeOpacity={0.7}
      >
          <FontAwesome5 
            name={item.icon} 
            size={18} 
            color={isActive ? COLORS.textOnAccent : COLORS.textSecondary}
          />
          <Animated.Text style={[
              styles.dockLabel,
              { opacity: labelOpacity, transform: [{ translateY: labelTranslateY }] }
          ]}>
              {item.label}
          </Animated.Text>
      </TouchableOpacity>
  );
};

// 7. ENHANCED ACCORDION with smooth height animation
const Accordion = ({ title, icon, children, isOpen, onPress }) => {
  // State to hold the measured height of the content
  const [contentHeight, setContentHeight] = useState(0);

  // Animated values for height and chevron rotation
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
      // This effect runs whenever the 'isOpen' prop changes
      
      // Animate the chevron rotation (same as before)
      Animated.spring(rotateAnim, {
          toValue: isOpen ? 1 : 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
      }).start();

      // Animate the height using a spring for a natural feel
      Animated.spring(heightAnim, {
          toValue: isOpen ? contentHeight : 0, // Animate to the measured height or to 0
          friction: 9,
          tension: 60,
          useNativeDriver: false, // 'height' cannot be animated on the native thread
      }).start();

  }, [isOpen, contentHeight]); // Re-run animations if the open state or measured height changes

  // This function measures the content's height the first time it's laid out
  const handleLayout = (event) => {
      const measuredHeight = event.nativeEvent.layout.height;
      // We only set the height if it hasn't been set yet, to avoid re-measuring
      if (measuredHeight > 0 && contentHeight === 0) {
          setContentHeight(measuredHeight);
      }
  };

  const rotateChevron = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '-180deg'],
  });

  return (
      <ContentCard style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
          <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={onPress} // The press handler now just updates state, no LayoutAnimation
              style={styles.accordionHeader}
          >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
                  <View style={styles.iconBoxSm}>
                      <FontAwesome5 name={icon} size={14} color={COLORS.accentGreen} />
                  </View>
                  <Text style={styles.accordionTitle}>{title}</Text>
              </View>
              <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
                  <FontAwesome5 name="chevron-down" size={14} color={COLORS.textSecondary} />
              </Animated.View>
          </TouchableOpacity>

          {/* This is the container that will smoothly animate its height */}
          <Animated.View style={{ height: heightAnim, overflow: 'hidden' }}>
              {/* 
                This inner view is positioned absolutely. This is a key trick:
                It allows the content to render and be measured by 'onLayout' 
                even when the parent Animated.View has a height of 0.
              */}
              <View 
                  style={{ position: 'absolute', width: '100%' }}
                  onLayout={handleLayout}
              >
                  <View style={styles.accordionBody}>
                      {children}
                  </View>
              </View>
          </Animated.View>
      </ContentCard>
  );
};

// ============================================================================
//                       ENHANCED MAIN SECTIONS
// ============================================================================

// 1. Skeleton Loader
const SkeletonProductCard = ({ index }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, { toValue: 1, duration: 1200, useNativeDriver: true, delay: index * 100 })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
  const ShimmeringView = ({ style }) => (
    <View style={[style, { overflow: 'hidden', backgroundColor: COLORS.border }]}>
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, transform: [{ translateX }] }}>
        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.productListItem}>
      <View style={{ flex: 1, gap: 8, alignItems: 'flex-end' }}>
        <ShimmeringView style={{ height: 18, width: '80%', borderRadius: 8 }} />
        <ShimmeringView style={{ height: 14, width: '40%', borderRadius: 6 }} />
        <ShimmeringView style={{ height: 12, width: '60%', borderRadius: 6, marginTop: 4 }} />
      </View>
      <ShimmeringView style={{ width: 60, height: 60, borderRadius: 30 }} />
    </View>
  );
};


// 2. The new interactive, swipeable product list item with Verdict Icons
const ProductListItem = React.memo(({ product, onPress, onDelete }) => {
    const translateX = useRef(new Animated.Value(0)).current;
  
    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5 && Math.abs(gestureState.dx) > 10,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < 0) translateX.setValue(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -width * 0.25) {
            Animated.timing(translateX, { toValue: -width, duration: 250, useNativeDriver: true }).start(() => onDelete());
          } else {
            Animated.spring(translateX, { toValue: 0, friction: 5, useNativeDriver: true }).start();
          }
        },
      })
    ).current;
  
    const score = product.analysisData?.oilGuardScore || 0;
    
    // ✅ THE FIX: Use .find() on the imported array
    const productTypeLabel = PRODUCT_TYPES.find(
        type => type.id === product.analysisData?.product_type
    )?.label || 'منتج'; // Fallback to 'منتج'
  
    return (
      <View style={styles.productListItemWrapper}>
        <View style={styles.deleteActionContainer}>
          <FontAwesome5 name="trash-alt" size={22} color={COLORS.danger} />
        </View>
        
        <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
          <Pressable style={styles.productListItem} onPress={onPress}>
            
            {/* 1. Score Badge */}
            <View style={styles.listItemScoreContainer}>
                <WathiqScoreBadge score={score} size={54} />
            </View>
  
            {/* 2. Product Info */}
            <View style={styles.listItemContent}>
              <Text style={styles.listItemName} numberOfLines={1}>{product.productName}</Text>
              
              {/* ✅ Label is now correctly looked up */}
              <Text style={styles.listItemType}>
                  {productTypeLabel}
              </Text>
            </View>
  
            {/* 3. Product Image */}
            <View style={styles.listImageWrapper}>
                {product.productImage ? (
                    <Image source={{ uri: product.productImage }} style={styles.listProductImage} />
                ) : (
                    <View style={styles.listImagePlaceholder}>
                        <FontAwesome5 name="wine-bottle" size={18} color={COLORS.textDim} />
                    </View>
                )}
            </View>
  
          </Pressable>
        </Animated.View>
      </View>
    );
  });


// 3. The new sophisticated Bottom Sheet for product details
const ProductDetailsSheet = ({ product, isVisible, onClose }) => {
    const animController = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isVisible) {
            Animated.spring(animController, {
                toValue: 1,
                damping: 15,
                stiffness: 100,
                useNativeDriver: true,
            }).start();
        }
    }, [isVisible]);

    const handleClose = () => {
        Animated.timing(animController, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) onClose();
        });
    };

    if (!product) return null;

    // --- HELPER: Dynamic Alert Styling ---
    const getAlertStyle = (type) => {
        const safeType = type ? type.toLowerCase() : 'info';
        switch (safeType) {
            case 'risk': case 'danger': case 'critical':
                return { bg: 'rgba(239, 68, 68, 0.1)', border: COLORS.danger, text: COLORS.danger, icon: 'exclamation-circle' };
            case 'caution': case 'warning':
                return { bg: 'rgba(245, 158, 11, 0.1)', border: COLORS.warning, text: COLORS.warning, icon: 'exclamation-triangle' };
            case 'good': case 'success':
                return { bg: 'rgba(34, 197, 94, 0.1)', border: COLORS.success, text: COLORS.success, icon: 'check-circle' };
            default: 
                return { bg: 'rgba(59, 130, 246, 0.1)', border: COLORS.info, text: COLORS.info, icon: 'info-circle' };
        }
    };

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    // --- DATA EXTRACTION ---
    const { productName, productImage } = product; // <--- Extract productImage
    const { 
        oilGuardScore = 0, 
        finalVerdict = 'غير معروف', 
        product_type = 'other', 
        detected_ingredients = [],
        user_specific_alerts = [],
        safety = { score: 0 },
        efficacy = { score: 0 }
    } = product.analysisData || {};

    const scoreColor = oilGuardScore >= 80 ? COLORS.success : oilGuardScore >= 65 ? COLORS.warning : COLORS.danger;

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>

                    <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                        
                        {/* 1. Header (Image or Icon) */}
                        <View style={{ alignItems: 'center', marginBottom: 25 }}>
                            {productImage ? (
                                // --- NEW: PRODUCT IMAGE ---
                                <View style={styles.productImageContainer}>
                                    <Image 
                                        source={{ uri: productImage }} 
                                        style={styles.productRealImage} 
                                        resizeMode="cover" 
                                    />
                                    <View style={[styles.scoreBadgeFloat, { backgroundColor: scoreColor }]}>
                                        <Text style={styles.scoreBadgeText}>{oilGuardScore}</Text>
                                    </View>
                                </View>
                            ) : (
                                // --- OLD: FALLBACK ICON ---
                                <View style={{ 
                                    width: 80, height: 80, borderRadius: 40, 
                                    backgroundColor: COLORS.background, 
                                    justifyContent: 'center', alignItems: 'center',
                                    marginBottom: 15, borderWidth: 2, borderColor: scoreColor 
                                }}>
                                    <FontAwesome5 
                                        name={PRODUCT_TYPES[product_type]?.icon || 'tint'} 
                                        size={32} 
                                        color={scoreColor} 
                                    />
                                </View>
                            )}

                            <Text style={styles.sheetProductTitle}>{productName}</Text>
                            <Text style={{ fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, marginTop: 5 }}>
    {PRODUCT_TYPES.find(t => t.id === product_type)?.label || 'منتج غير محدد'}
</Text>
                        </View>

                        {/* 2. Main Score Card */}
                        <View style={styles.sheetSection}>
                            <View style={[styles.alertBox, { backgroundColor: scoreColor + '15', borderColor: scoreColor }]}>
                                {/* Only show large number here if we didn't show it on the image */}
                                {!productImage && (
                                    <View style={{ width: 50, alignItems: 'center', justifyContent: 'center' }}>
                                         <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: scoreColor }}>{oilGuardScore}</Text>
                                    </View>
                                )}
                                {!productImage && <View style={{ width: 1, height: '80%', backgroundColor: scoreColor, opacity: 0.3, marginHorizontal: 10 }} />}
                                
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: scoreColor, fontFamily: 'Tajawal-Bold', fontSize: 16, textAlign: 'center' }}>
                                        {finalVerdict}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* 3. Safety & Efficacy Pillars */}
                        <View style={styles.sheetPillarsContainer}>
                            <View style={styles.sheetPillar}>
                                <FontAwesome5 name="magic" size={18} color={COLORS.accentGreen} />
                                <Text style={styles.sheetPillarLabel}>الفعالية</Text>
                                <Text style={styles.sheetPillarValue}>
                                    {typeof efficacy === 'object' ? efficacy.score : efficacy}% 
                                </Text>
                            </View>
                            <View style={styles.sheetDividerVertical} />
                            <View style={styles.sheetPillar}>
                                <FontAwesome5 name="shield-alt" size={18} color={COLORS.gold} />
                                <Text style={styles.sheetPillarLabel}>الأمان</Text>
                                <Text style={styles.sheetPillarValue}>
                                    {typeof safety === 'object' ? safety.score : safety}%
                                </Text>
                            </View>
                        </View>

                         {/* 4. User Alerts */}
                         {user_specific_alerts.length > 0 && (
                            <View style={styles.sheetSection}>
                                <Text style={[styles.sheetSectionTitle, {color: COLORS.textPrimary}]}> ملاحظات خاصة لكِ</Text>
                                {user_specific_alerts.map((alert, i) => {
                                    const isObj = typeof alert === 'object' && alert !== null;
                                    const alertText = isObj ? alert.text : alert;
                                    const alertType = isObj ? alert.type : 'info';
                                    const style = getAlertStyle(alertType);

                                    return (
                                        <View key={i} style={[styles.alertBox, { backgroundColor: style.bg, borderColor: style.border, marginBottom: 8 }]}>
                                            <FontAwesome5 name={style.icon} size={16} color={style.text} />
                                            <Text style={[styles.alertBoxText, { color: style.text }]}>{alertText}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                         )}

                        {/* 5. Ingredients List */}
                        <View style={styles.sheetSection}>
                            <Text style={styles.sheetSectionTitle}>المكونات المكتشفة ({detected_ingredients.length})</Text>
                            <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                                {detected_ingredients.map((ing, i) => {
                                    const ingName = (typeof ing === 'object' && ing !== null) ? ing.name : ing;
                                    return (
                                        <View key={i} style={styles.ingredientChip}>
                                            <Text style={styles.ingredientChipText}>{ingName}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        <Pressable onPress={handleClose} style={[styles.closeButton, { marginTop: 20 }]}>
                            <Text style={styles.closeButtonText}>إغلاق</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

const GlobalInput = (props) => {
    // Determine font based on content presence
    const fontStyle = {
        fontFamily: (props.value && props.value.length > 0) ? 'Tajawal-Bold' : 'Tajawal-Regular'
    };

    return (
        <TextInput
            {...props} // Pass all other props (placeholder, onChange, etc.)
            placeholderTextColor={props.placeholderTextColor || COLORS.textDim}
            style={[
                props.style, 
                fontStyle // Override font family dynamically
            ]} 
        />
    );
};

// --- REPLACEMENT ShelfSection COMPONENT ---
const ShelfSection = ({ products, loading, onDelete, onRefresh, router }) => {
    const [refreshing, setRefreshing] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const handleRefresh = async () => {
        setRefreshing(true);
        await onRefresh?.();
        setRefreshing(false);
    };
    
    const handleProductDelete = (productId) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onDelete(productId);
    };
    
    if (loading) {
      return (
        <View style={{ gap: 8, paddingTop: 20 }}>
            {[...Array(5)].map((_, index) => <SkeletonProductCard key={index} index={index} />)}
        </View>
      );
    }
  
    const empty = products.length === 0;

    return (
      <View style={{ flex: 1 }}>
        <ContentCard delay={100} style={{ padding: 15, marginBottom: 20 }}>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>إجمالي المنتجات</Text>
              <AnimatedCount value={products.length} style={styles.statValue} />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>حماية الشمس</Text>
              <AnimatedCount value={products.filter(p => p.analysisData?.product_type === 'sunscreen').length} style={styles.statValue} />
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>منتجات فعالة</Text>
              <AnimatedCount value={products.filter(p => p.analysisData?.efficacy?.score > 60).length} style={styles.statValue} />
            </View>
          </View>
        </ContentCard>
  
        {empty ? (
          <ShelfEmptyState onPress={() => router.push('/oilguard')} />
        ) : (
          <FlatList
            data={products}
            renderItem={({ item }) => (
                <ProductListItem
                    product={item}
                    onPress={() => setSelectedProduct(item)}
                    onDelete={() => handleProductDelete(item.id)}
                />
            )}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <View style={{height: 8}}/>}
            scrollEnabled={false} 
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accentGreen} colors={[COLORS.accentGreen]} />
            }
          />
        )}
        
        <ProductDetailsSheet 
            product={selectedProduct} 
            isVisible={!!selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
        />
      </View>
    );
};


// --- UPDATED ANALYSIS HUB COMPONENT ---

/// --- HELPER 1: Add Step Modal (Fixed Z-Index Layering) ---
const AddStepModal = ({ isVisible, onClose, onAdd }) => {
    const animController = useRef(new Animated.Value(0)).current;
    const [stepName, setStepName] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isVisible) {
            setStepName('');
            // 1. Start Animation
            Animated.spring(animController, { 
                toValue: 1, 
                damping: 15, 
                stiffness: 100, 
                useNativeDriver: true 
            }).start();

            // 2. Focus Delay
            setTimeout(() => {
                inputRef.current?.focus();
            }, 300);
        }
    }, [isVisible]);

    const handleClose = () => {
        Keyboard.dismiss();
        Animated.timing(animController, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onClose());
    };

    const handleAdd = () => {
        if (stepName.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onAdd(stepName.trim());
            handleClose();
        }
    };

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    if (!isVisible) return null;

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            
            {/* LAYER 1: The Dark Overlay (Z-Index: 1) */}
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity, zIndex: 1 }]} >
                 <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            {/* LAYER 2: The Content (Z-Index: 100 - MUST BE HIGHER) */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1, justifyContent: 'flex-end', zIndex: 100 }} // <--- CRITICAL FIX
                pointerEvents="box-none"
            >
                <Animated.View 
                    style={{ 
                        transform: [{ translateY }], 
                        width: '100%',
                        backgroundColor: COLORS.card,
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -5 },
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                        elevation: 20,
                    }}
                >
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle}/></View>
                    
                    <View style={{padding: 25, paddingBottom: 40}}>
                        
                        {/* Header */}
                        <View style={{alignItems: 'center', marginBottom: 20}}>
                            <View style={{
                                width: 60, height: 60, borderRadius: 30, 
                                backgroundColor: 'rgba(90, 156, 132, 0.15)', 
                                alignItems: 'center', justifyContent: 'center', marginBottom: 15
                            }}>
                                <FontAwesome5 name="layer-group" size={24} color={COLORS.accentGreen} />
                            </View>
                            <Text style={styles.modalTitle}>إضافة خطوة جديدة</Text>
                            <Text style={styles.modalDescription}>
                                أضفي مرحلة جديدة لروتينك (مثال: سيروم، تونر، علاج).
                            </Text>
                        </View>

                        {/* Input */}
                        <View style={styles.inputWrapper}>
                            <TextInput
                                ref={inputRef}
                                placeholder="اسم الخطوة..."
                                placeholderTextColor={COLORS.textDim}
                                style={[
                                    styles.enhancedInput, 
                                    // 2. CONDITIONAL FONT: Regular if empty, Bold if typing
                                    { fontFamily: stepName.length > 0 ? 'Tajawal-Bold' : 'Tajawal-Regular' }
                                ]}
                                value={stepName}
                                onChangeText={setStepName}
                                textAlign="right"
                            />
                            <View style={styles.inputIcon}>
                                <Feather name="edit-3" size={16} color={COLORS.accentGreen} />
                            </View>
                        </View>

                        {/* Buttons */}
                        <View style={styles.promptButtonRow}>
                            <PressableScale style={[styles.promptButton, styles.promptButtonSecondary]} onPress={handleClose}>
                                <Text style={styles.promptButtonTextSecondary}>إلغاء</Text>
                            </PressableScale>
                            <PressableScale 
                                style={[styles.promptButton, styles.promptButtonPrimary, !stepName.trim() && {opacity: 0.5}]} 
                                onPress={handleAdd}
                                disabled={!stepName.trim()}
                            >
                                <Text style={styles.promptButtonTextPrimary}>إضافة</Text>
                            </PressableScale>
                        </View>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// --- HELPER 2: The Interactive Onboarding Guide ---
const RoutineOnboardingGuide = ({ onDismiss }) => {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    
    // Animation Controllers
    const animX = useRef(new Animated.Value(width / 2)).current; // Start center
    const animY = useRef(new Animated.Value(height / 2)).current;
    const animR = useRef(new Animated.Value(0)).current; // Radius starts at 0 (pop effect)
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // --- TARGET CONFIGURATION ---
    // Precision tuning based on your layout styles
    const TARGETS = [
        {
            id: 'switcher',
            title: "فترات الروتين",
            text: "هنا يمكنك التبديل بين روتينك الصباحي والمسائي.",
            // Position: Top Right-ish (Switch Container is Flex:1 starting from right)
            x: width - 100, 
            y: insets.top + 145, 
            radius: 50
        },
        {
            id: 'auto_build',
            title: "روتين وثيق",
            text: "دعي وثيق يبني لكِ روتيناً مثالياً بضغطة زر.",
            // Position: Top Left (AutoBuild is on the left in row-reverse)
            x: 45, 
            y: insets.top + 145, 
            radius: 35
        },
        {
            id: 'add_step',
            title: "إضافة خطوة",
            text: "زر الإضافة العائم يتيح لكِ إدراج منتجات جديدة يدوياً.",
            // Position: Bottom Right (FAB is bottom: 130, right: 20)
            x: width - 52, // 20px margin + 32px half-width
            y: height - 162, // 130px bottom + 32px half-height
            radius: 40
        }
    ];

    const currentTarget = TARGETS[step];

    useEffect(() => {
        // 1. Fade In Overlay
        if (step === 0) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        }

        // 2. Move Spotlight smoothly
        Animated.parallel([
            Animated.spring(animX, { toValue: currentTarget.x, friction: 6, tension: 50, useNativeDriver: true }),
            Animated.spring(animY, { toValue: currentTarget.y, friction: 6, tension: 50, useNativeDriver: true }),
            Animated.spring(animR, { toValue: currentTarget.radius, friction: 6, tension: 50, useNativeDriver: true })
        ]).start();

    }, [step]);

    const handleNext = () => {
        if (step < TARGETS.length - 1) {
            setStep(s => s + 1);
        } else {
            // Exit Animation: Expand hole to fill screen or fade out
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(onDismiss);
        }
    };

    return (
        <Modal transparent visible={true} animationType="none">
            <View style={styles.guideOverlay}>
                
                {/* 1. SVG Mask Layer */}
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
                    <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                        <Defs>
                            <Mask id="mask" x="0" y="0" height="100%" width="100%">
                                {/* White = Visible (Overlay) */}
                                <Rect height="100%" width="100%" fill="#fff" />
                                {/* Black = Invisible (The Hole) */}
                                <AnimatedCircle 
                                    cx={animX} 
                                    cy={animY} 
                                    r={animR} 
                                    fill="black" 
                                />
                            </Mask>
                        </Defs>
                        
                        {/* The Dark Overlay applying the mask */}
                        <Rect 
                            height="100%" 
                            width="100%" 
                            fill="rgba(26, 45, 39, 0.92)" 
                            mask="url(#mask)" 
                        />

                        {/* Optional: Glowing Ring around the hole */}
                        <AnimatedCircle 
                            cx={animX} 
                            cy={animY} 
                            r={animR} 
                            stroke={COLORS.accentGreen} 
                            strokeWidth="3" 
                            fill="transparent" 
                            strokeDasharray="10, 5"
                        />
                    </Svg>
                </Animated.View>

                {/* 2. Text Card (Floating) */}
                <View style={styles.guideCardWrapper}>
                    <Animated.View style={[styles.guideCard, { opacity: fadeAnim }]}>
                        <View style={styles.guideHeader}>
                            <View style={styles.guideIconBox}>
                                <FontAwesome5 name="lightbulb" size={20} color={COLORS.gold} />
                            </View>
                            <Text style={styles.guideTitle}>{currentTarget.title}</Text>
                        </View>
                        
                        <Text style={styles.guideText}>{currentTarget.text}</Text>
                        
                        <View style={styles.guideFooter}>
                            <TouchableOpacity onPress={onDismiss}>
                                <Text style={styles.guideSkip}>إنهاء</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity onPress={handleNext} style={styles.guideNextBtn}>
                                <Text style={styles.guideNextText}>
                                    {step === TARGETS.length - 1 ? 'فهمت' : 'التالي'}
                                </Text>
                                <FontAwesome5 name={step === TARGETS.length - 1 ? "check" : "arrow-left"} size={14} color="#1A2D27" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>

            </View>
        </Modal>
    );
};



// --- HELPER 3: The Card for Each Step in the Timeline ---
const RoutineStepCard = ({ step, index, onManage, onDelete, products }) => {
    const productList = step.productIds.map(id => products.find(p => p.id === id)).filter(Boolean);
    const isStepFilled = productList.length > 0;
  
    return (
        // Changed to TouchableOpacity to remove the "stretchy" entry animation
        <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={onManage} 
            style={styles.stepCardContainer}
        >
            {/* HEADER: Number + Title + Delete */}
            <View style={styles.stepHeaderRow}>
                <View style={styles.stepTitleGroup}>
                    {/* Gradient Number Badge */}
                    <LinearGradient
                        colors={isStepFilled ? [COLORS.accentGreen, '#4a8a73'] : [COLORS.card, COLORS.border]}
                        style={styles.stepNumberBadge}
                    >
                        <Text style={[styles.stepNumberText, !isStepFilled && { color: COLORS.textSecondary }]}>
                            {index + 1}
                        </Text>
                    </LinearGradient>
                    
                    <View>
                        <Text style={styles.stepName}>{step.name}</Text>
                        <Text style={styles.stepSubText}>
                            {isStepFilled ? `${productList.length} منتجات` : 'خطوة فارغة'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity 
                    onPress={onDelete} 
                    style={styles.deleteIconButton}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Feather name="trash-2" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* BODY: Clean Product List */}
            <View style={styles.stepBody}>
                {isStepFilled ? (
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.stepProductsScroll}
                    >
                        {productList.map((p) => {
                            const isSunscreen = p.analysisData?.product_type === 'sunscreen';
                            const iconColor = isSunscreen ? '#fbbf24' : '#34d399'; 
                            const bgTint = isSunscreen ? 'rgba(251, 191, 36, 0.15)' : 'rgba(52, 211, 153, 0.15)';

                            return (
                                <View key={p.id} style={styles.stepProductChip}>
                                    <View style={[styles.chipIconBox, { backgroundColor: bgTint }]}>
                                        <FontAwesome5 
                                            name={isSunscreen ? 'sun' : 'pump-soap'} 
                                            size={12} 
                                            color={iconColor} 
                                        />
                                    </View>
                                    <Text style={styles.stepProductText} numberOfLines={1}>
                                        {p.productName}
                                    </Text>
                                </View>
                            );
                        })}
                    </ScrollView>
                ) : (
                    <View style={styles.stepEmptyState}>
                        <Text style={styles.stepEmptyLabel}>اضغط لإضافة منتجات</Text>
                        <Feather name="plus-circle" size={16} color={COLORS.accentGreen} />
                    </View>
                )}
            </View>
            
            <View style={styles.editIndicator}>
                <Feather name="more-horizontal" size={16} color={COLORS.border} />
            </View>

        </TouchableOpacity>
    );
};

// --- HELPER 4: The Bottom Sheet Modal for Editing a Step ---

// --- HELPER 2: Enhanced Step Editor with Animated Product Picker ---
const StepEditorModal = ({ isVisible, onClose, step, onSave, allProducts }) => {
    const animController = useRef(new Animated.Value(0)).current;
    const [currentProducts, setCurrentProducts] = useState([]);
    const [isAddModalVisible, setAddModalVisible] = useState(false);

    useEffect(() => {
        if (isVisible && step) {
            // Map IDs to full product objects
            setCurrentProducts(step.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean));
            Animated.spring(animController, { toValue: 1, useNativeDriver: true }).start();
        }
    }, [isVisible, step]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onClose());
    };

    const handleRemove = (productId) => { 
        Haptics.selectionAsync();
        setCurrentProducts(prev => prev.filter(p => p.id !== productId));
    };

    const handleAddProduct = (productId) => {
        const p = allProducts.find(x => x.id === productId);
        if(p) {
            // Check if already exists
            if (!currentProducts.find(cp => cp.id === p.id)) {
                setCurrentProducts([...currentProducts, p]);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }
        setAddModalVisible(false);
    };

    const handleSaveChanges = () => {
        onSave(step.id, currentProducts.map(p => p.id));
        handleClose();
    };

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    if (!step) return null;

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle}/></View>
                    
                    <View style={{padding: 20, flex: 1}}>
                        <View style={styles.stepModalHeader}>
                            <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 10}}>
                                <View style={{backgroundColor: COLORS.accentGreen + '20', padding: 8, borderRadius: 10}}>
                                    <FontAwesome5 name="clipboard-list" size={18} color={COLORS.accentGreen} />
                                </View>
                                <Text style={styles.stepModalTitle}>{step.name}</Text>
                            </View>
                            
                            <PressableScale onPress={() => setAddModalVisible(true)} style={styles.addProductButton}>
                                <Feather name="plus" size={16} color={COLORS.textOnAccent} />
                                <Text style={styles.addProductButtonText}>منتج</Text>
                            </PressableScale>
                        </View>
                        
                        <View style={styles.divider} />

                        <FlatList 
                            data={currentProducts}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <Animated.View style={styles.reorderItem}>
                                    {/* RIGHT SIDE: Icon + Text */}
                                    <View style={{flexDirection: 'row-reverse', alignItems: 'center', flex: 1}}>
                                        
                                        {/* Icon Box */}
                                        <View style={[styles.chipIconBox, { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border }]}>
                                             <FontAwesome5 
                                                name={item.analysisData?.product_type === 'sunscreen' ? 'sun' : 'pump-soap'} 
                                                size={14} 
                                                color={COLORS.textSecondary} 
                                            />
                                        </View>
                            
                                        {/* Product Name */}
                                        <Text style={styles.reorderItemText} numberOfLines={1}>
                                            {item.productName}
                                        </Text>
                                    </View>
                            
                                    {/* LEFT SIDE: Delete Button */}
                                    <TouchableOpacity 
                                        onPress={() => handleRemove(item.id)} 
                                        style={{ padding: 8 }} // Increased touch area
                                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                                    >
                                        <FontAwesome5 name="minus-circle" size={20} color={COLORS.danger} />
                                    </TouchableOpacity>
                                </Animated.View>
                            )}                        ListEmptyComponent={
                                <View style={styles.stepModalEmpty}>
                                    <FontAwesome5 name="box-open" size={30} color={COLORS.textDim} />
                                    <Text style={styles.stepModalEmptyText}>لم تضيفي منتجات لهذه الخطوة بعد</Text>
                                </View>
                            }
                            contentContainerStyle={{paddingBottom: 20}}
                        />

                        <PressableScale onPress={handleSaveChanges} style={styles.saveStepButton}>
                            <Text style={styles.saveStepButtonText}>حفظ التغييرات</Text>
                            <FontAwesome5 name="check" size={16} color={COLORS.textOnAccent} />
                        </PressableScale>
                    </View>
                </View>
            </Animated.View>

            {/* NESTED FLOATING SELECTION MODAL */}
            <ProductSelectionModal 
                visible={isAddModalVisible} 
                products={allProducts} 
                onSelect={handleAddProduct}
                onClose={() => setAddModalVisible(false)}
            />
        </Modal>
    );
};

// --- HELPER 3: The New Animated Selection Popup ---
// --- HELPER 4: Product Selection Modal (Nested inside StepEditor) ---
const ProductSelectionModal = ({ visible, products, onSelect, onClose }) => {
    const [search, setSearch] = useState('');
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setSearch('');
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true })
            ]).start();
        } else {
             Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
        }
    }, [visible]);

    if (!visible) return null;

    // Ensure products is an array to prevent crashes
    const safeProducts = Array.isArray(products) ? products : [];
    
    // Filter products based on search text
    const filtered = safeProducts.filter(p => 
        p.productName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
            <View style={styles.centeredModalOverlay}>
                 <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                 
                 <Animated.View style={[
                     styles.selectionCard, 
                     { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
                 ]}>
                    <View style={styles.selectionHeader}>
                        <Text style={styles.selectionTitle}>اختر منتج</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
                            <FontAwesome5 name="times" size={16} color={COLORS.textDim} />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar inside Modal */}
                    <View style={styles.modalSearchBar}>
                         <TextInput 
                            style={styles.modalSearchInput} 
                            placeholder="بحث..." 
                            placeholderTextColor={COLORS.textDim}
                            value={search}
                            onChangeText={setSearch}
                         />
                         <FontAwesome5 name="search" size={12} color={COLORS.textDim} />
                    </View>

                    <FlatList 
                        data={filtered}
                        keyExtractor={i => i.id}
                        style={{ maxHeight: 400 }} 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({item}) => (
                            <PressableScale 
                                onPress={() => onSelect(item.id)} 
                                style={styles.selectionCardWrapper} 
                            >
                                <View style={styles.selectionRow}>
                                    <View style={styles.selectionIconBox}>
                                        <FontAwesome5 
                                            name={item.analysisData?.product_type === 'sunscreen' ? 'sun' : 'wine-bottle'} 
                                            size={14} 
                                            color={COLORS.accentGreen} 
                                        />
                                    </View>
                                    <Text style={styles.selectionItemText} numberOfLines={1}>
                                        {item.productName}
                                    </Text>
                                    <View style={styles.selectionActionBtn}>
                                        <FontAwesome5 name="plus" size={12} color={COLORS.textSecondary} />
                                    </View>
                                </View>
                            </PressableScale>
                        )}
                        ListEmptyComponent={
                            <View style={{alignItems: 'center', marginTop: 30}}>
                                <FontAwesome5 name="search-minus" size={24} color={COLORS.textDim} />
                                <Text style={{color:COLORS.textDim, marginTop: 10, fontFamily: 'Tajawal-Regular'}}>
                                    لا توجد نتائج
                                </Text>
                            </View>
                        }
                    />
                 </Animated.View>
            </View>
        </Modal>
    );
};

// --- The Main Routine Section Component ---
const RoutineSection = ({ savedProducts, userProfile, onOpenAddStepModal, analysisData, weatherData }) => {
    const { user } = useAppContext();
    const [routines, setRoutines] = useState({ am: [], pm: [] });
    const [activePeriod, setActivePeriod] = useState('am');
    const [selectedStep, setSelectedStep] = useState(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    
    // Server-side Architect State
    const [routineLogs, setRoutineLogs] = useState([]);
    const [isBuilding, setIsBuilding] = useState(false);
  
    useEffect(() => {
        const initialRoutines = userProfile?.routines || { am: [], pm: [] };
        setRoutines(initialRoutines);
        if (!userProfile?.routines || (initialRoutines.am.length === 0 && initialRoutines.pm.length === 0)) {
            setShowOnboarding(true);
        }
    }, [userProfile]);
    
    const saveRoutines = async (newRoutines) => {
        setRoutines(newRoutines);
        try { 
            await updateDoc(doc(db, 'profiles', user.uid), { routines: newRoutines }); 
            
            // --- FIX: Now these variables exist from props ---
            if (user?.uid) {
                saveOfflineProfile(user.uid, {
                    savedProducts: savedProducts,
                    userProfile: { ...userProfile, routines: newRoutines },
                    analysisData: analysisData || null, // Handle potential nulls
                    weatherData: weatherData || null
                });
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
        } catch (error) { 
            console.error("Error saving routines:", error); 
            // Even if firestore fails (offline), we should try to cache locally so UI stays updated
            if (user?.uid) {
                 saveOfflineProfile(user.uid, {
                    savedProducts: savedProducts,
                    userProfile: { ...userProfile, routines: newRoutines },
                    analysisData: analysisData || null,
                    weatherData: weatherData || null
                });
            }
            // Only show error if we think it's critical, or just let it be optimistic
            if (!error.message.includes('offline')) {
                // AlertService.error("خطأ", "تعذر حفظ الروتين.");
            }
        }
    };
  
    const switchPeriod = (period) => {
      if (period === activePeriod) return;
      Haptics.selectionAsync(); 
      setActivePeriod(period);
    };
  
    const handleAddStep = (stepName) => {
        if (stepName) {
            const newStep = { id: `step-${Date.now()}`, name: stepName, productIds: [] };
            const newRoutines = JSON.parse(JSON.stringify(routines));
            if (!newRoutines[activePeriod]) newRoutines[activePeriod] = [];
            newRoutines[activePeriod].push(newStep);
            saveRoutines(newRoutines);
        }
    };
  
    const handleDeleteStep = async (stepId) => {
        AlertService.delete(
            "حذف الخطوة",
            "هل أنت متأكد من حذف هذه الخطوة؟",
            async () => {
                const newRoutines = JSON.parse(JSON.stringify(routines));
                newRoutines[activePeriod] = newRoutines[activePeriod].filter(s => s.id !== stepId);
                saveRoutines(newRoutines);
            }
        );
    };
  
    const handleUpdateStep = (stepId, newProductIds) => {
        const newRoutines = JSON.parse(JSON.stringify(routines));
        const stepIndex = newRoutines[activePeriod].findIndex(s => s.id === stepId);
        if (stepIndex !== -1) { 
            newRoutines[activePeriod][stepIndex].productIds = newProductIds; 
            saveRoutines(newRoutines); 
        }
    };
  
    const handleAutoBuildRoutine = () => {
      if (savedProducts.length < 2) {
          AlertService.show({
              title: "الرف غير كافٍ",
              message: "نحتاج إلى منتجين على الأقل (غسول + مرطب) لبناء روتين ذكي.",
              type: 'warning'
          });
          return;
      }
  
      const runArchitect = async () => {
        setIsBuilding(true);
        setRoutineLogs([]); 
        
        try {
            const response = await fetch(`${PROFILE_API_URL}/generate-routine.js`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    products: savedProducts,
                    settings: userProfile?.settings || {}
                })
            });
  
              const data = await response.json();
              if (!response.ok) throw new Error(data.error || "Server Error");
  
              const newRoutines = { am: data.am || [], pm: data.pm || [] };
              await saveRoutines(newRoutines);
              
              if (data.logs && Array.isArray(data.logs)) {
                  setRoutineLogs(data.logs);
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              AlertService.success("تم التحديث", "تم إعادة هيكلة الروتين بناءً على تحليل وثيق .");
  
          } catch (error) {
              console.error("Routine Generation Error:", error);
              AlertService.error("خطأ", "تعذر الاتصال بروتين وثيق.");
          } finally {
              setIsBuilding(false);
          }
      };
  
      AlertService.confirm(
          "روتين وثيق التلقائي",
          "سيتم إعادة ترتيب روتينك بالكامل بناءً على تعارض المكونات وحالة بشرتك. موافق؟",
          runArchitect
      );
    };
  
    // --- RENDER ---
    const currentSteps = routines[activePeriod] || [];

    return (
      <View style={{ flex: 1 }}>
          {/* Header Controls */}
          <View style={styles.routineHeaderContainer}>
               <View style={styles.routineSwitchContainer}>
                  <TouchableOpacity 
                      activeOpacity={0.8} 
                      onPress={() => switchPeriod('pm')} 
                      style={[styles.periodBtn, activePeriod==='pm' && styles.periodBtnActive]}
                  >
                      <Text style={[styles.periodText, activePeriod==='pm' && styles.periodTextActive]}>المساء</Text>
                      <Feather name="moon" size={14} color={activePeriod==='pm' ? COLORS.textOnAccent : COLORS.textSecondary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                      activeOpacity={0.8} 
                      onPress={() => switchPeriod('am')} 
                      style={[styles.periodBtn, activePeriod==='am' && styles.periodBtnActive]}
                  >
                      <Text style={[styles.periodText, activePeriod==='am' && styles.periodTextActive]}>الصباح</Text>
                      <Feather name="sun" size={14} color={activePeriod==='am' ? COLORS.textOnAccent : COLORS.textSecondary} />
                  </TouchableOpacity>
              </View>
               
               <PressableScale onPress={handleAutoBuildRoutine} style={styles.autoBuildButton} disabled={isBuilding}>
                  {isBuilding ? 
                      <ActivityIndicator size="small" color={COLORS.accentGreen} /> : 
                      <MaterialCommunityIcons name="auto-fix" size={20} color={COLORS.accentGreen} />
                  }
               </PressableScale>
          </View>
  
          {/* CONTENT AREA (Replaced FlatList with standard View mapping) */}
          <View style={{ paddingBottom: 220, paddingTop: 10 }}>
              
              {/* 1. Diagnostic Report Header */}
              <View style={{ marginBottom: 10 }}>
                  <RoutineLogViewer logs={routineLogs} />
              </View>

              {/* 2. Steps List */}
              {currentSteps.length > 0 ? (
                  currentSteps.map((item, index) => (
                      <StaggeredItem index={index} key={item.id}> 
                          <RoutineStepCard 
                              step={item} 
                              index={index} 
                              onManage={() => setSelectedStep(item)} 
                              onDelete={() => handleDeleteStep(item.id)}
                              products={savedProducts} 
                          />
                      </StaggeredItem>
                  ))
              ) : (
                  <RoutineEmptyState onPress={() => onOpenAddStepModal(handleAddStep)} />
              )}
          </View>
          
          {/* Floating Action Button */}
          <PressableScale style={styles.fabRoutine} onPress={() => onOpenAddStepModal(handleAddStep)}>
              <LinearGradient colors={[COLORS.accentGreen, '#4a8a73']} style={styles.fabGradient}>
                  <FontAwesome5 name="plus" size={20} color={COLORS.textOnAccent} />
              </LinearGradient>
          </PressableScale>
  
          {/* Modals */}
          {selectedStep && (
              <StepEditorModal 
                  isVisible={!!selectedStep} 
                  onClose={() => setSelectedStep(null)} 
                  step={selectedStep} 
                  onSave={handleUpdateStep} 
                  allProducts={savedProducts} 
              />
          )}
          {showOnboarding && <RoutineOnboardingGuide onDismiss={() => setShowOnboarding(false)} />}
      </View>
    );
};

// --- 1. MEMOIZED LIST ITEM ---
const IngredientCard = React.memo(({ item, index, onPress }) => {
    const isRisk = item.warnings?.some(w => w.level === 'risk');

    return (
        <StaggeredItem index={index % 20}> 
            <PressableScale 
                style={styles.ingCard} 
                onPress={() => item.isRich ? onPress(item) : null}
                disabled={!item.isRich}
            >
                <View style={styles.ingCardContent}>
                    
                    {/* Count Badge */}
                    <View style={[styles.ingCountBadge, {backgroundColor: item.isRich ? COLORS.accentGreen : COLORS.card}]}>
                        <Text style={[styles.ingCountText, {color: item.isRich ? COLORS.textOnAccent : COLORS.textDim}]}>
                            {item.count}
                        </Text>
                    </View>

                    {/* Text Info */}
                    <View style={styles.ingInfoContainer}>
                        <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 6}}>
                            <Text style={styles.ingNameText}>{item.displayName}</Text>
                            {isRisk && <FontAwesome5 name="exclamation-circle" size={12} color={COLORS.danger} />}
                        </View>
                        
                        {/* Scientific Name (Style Added) */}
                        {item.scientific_name && (
                            <Text style={styles.ingSciText} numberOfLines={1}>{item.scientific_name}</Text>
                        )}

                        <View style={styles.ingTagsRow}>
                            <View style={styles.ingCategoryTag}>
                                <Text style={styles.ingTagLabel}>{item.functionalCategory}</Text>
                            </View>
                            {item.chemicalType && (
                                <View style={[styles.ingCategoryTag, {backgroundColor: 'rgba(255,255,255,0.05)', borderColor: COLORS.border}]}>
                                    <Text style={[styles.ingTagLabel, {color: COLORS.textSecondary}]}>{item.chemicalType}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Interactive Arrow */}
                    {item.isRich && (
                        <View style={{ paddingLeft: 8 }}>
                            <FontAwesome5 name="chevron-left" size={12} color={COLORS.border} />
                        </View>
                    )}
                </View>
            </PressableScale>
        </StaggeredItem>
    );
});

// --- 2. MAIN SECTION CONTROLLER ---
const IngredientsSection = ({ products, userProfile, cacheRef }) => {
    const [search, setSearch] = useState('');
    const [renderLimit, setRenderLimit] = useState(15);
    const [allIngredients, setAllIngredients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState(null);

    useEffect(() => {
        const fetchIngredientsData = async () => {
            if (products.length === 0) {
                setAllIngredients([]);
                return;
            }

            const currentHash = generateFingerprint(products, userProfile?.settings);

            // CHECK PARENT CACHE REF
            if (cacheRef.current.hash === currentHash && cacheRef.current.data.length > 0) {
                setAllIngredients(cacheRef.current.data);
                return;
            }
            
            setLoading(true);

            // 1. Gather unique names from local shelf
            const uniqueNames = new Set();
            products.forEach(p => {
                p.analysisData?.detected_ingredients?.forEach(i => {
                    if (i.name) uniqueNames.add(i.name);
                });
            });
            const ingredientsList = Array.from(uniqueNames);

            try {
                // 2. Call Evaluate API (Fixed URL: removed .js)
                const response = await fetch(`${PROFILE_API_URL}/evaluate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ingredients_list: ingredientsList,
                        product_type: 'other', 
                        user_profile: userProfile?.settings || {},
                        selected_claims: []
                    })
                });

                const data = await response.json();
                
                if (!response.ok) throw new Error("Server fetch failed");

                const serverData = data.detected_ingredients || [];

                // 3. Merge Server Data with Local Shelf Counts
                const aggregated = serverData.map(serverIng => {
                    // Find occurrence in local shelf
                    const productsContaining = products.filter(p => 
                        p.analysisData?.detected_ingredients?.some(localIng => 
                            // Match by ID if available, else Name
                            (serverIng.id && localIng.id === serverIng.id) ||
                            (localIng.name && localIng.name.toLowerCase() === serverIng.name.toLowerCase())
                        )
                    );

                    return {
                        ...serverIng, 
                        displayName: serverIng.name,
                        isRich: true,
                        count: productsContaining.length,
                        productIds: productsContaining.map(p => p.id),
                        productNames: productsContaining.map(p => p.productName)
                    };
                });

                // Sort results
                const sortedData = aggregated.sort((a,b) => b.count - a.count);

                // --- IMPORTANT: Update the Cache so we don't fetch next time ---
                cacheRef.current = { hash: currentHash, data: sortedData };
                
                setAllIngredients(sortedData);

            } catch (error) {
                console.error("Ingredients enrichment failed:", error);
                // Fallback: Aggregate locally without rich data
                const fallbackMap = new Map();
                products.forEach(p => {
                    p.analysisData?.detected_ingredients?.forEach(i => {
                        const key = i.name;
                        if (!fallbackMap.has(key)) {
                            fallbackMap.set(key, { 
                                id: key, name: key, displayName: key, 
                                isRich: false, count: 0, productIds: [], productNames: [] 
                            });
                        }
                        const entry = fallbackMap.get(key);
                        entry.count++;
                        if (!entry.productIds.includes(p.id)) entry.productIds.push(p.id);
                    });
                });
                setAllIngredients(Array.from(fallbackMap.values()).sort((a,b) => b.count - a.count));
            } finally {
                setLoading(false);
            }
        };

        // Debounce fetch slightly
        const timeout = setTimeout(fetchIngredientsData, 500);
        return () => clearTimeout(timeout);
    }, [products, userProfile]);

    const filteredList = useMemo(() => 
        allIngredients.filter(ing => 
            (ing.displayName || ing.name).toLowerCase().includes(search.toLowerCase())
        ), 
    [allIngredients, search]);
    
    const visibleData = filteredList.slice(0, renderLimit);

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.searchBar}>
                <TextInput 
                    placeholder="بحث في المكونات..." 
                    placeholderTextColor={COLORS.textDim} 
                    style={styles.searchInput} 
                    value={search} 
                    onChangeText={setSearch} 
                />
                <FontAwesome5 name="search" size={16} color={COLORS.textDim} />
            </View>

            {loading ? (
                <View style={{ padding: 20 }}>
                    <ActivityIndicator size="small" color={COLORS.accentGreen} />
                </View>
            ) : (
                <FlatList 
                    data={visibleData} 
                    keyExtractor={item => item.id || item.name} 
                    renderItem={({ item, index }) => (
                        <IngredientCard item={item} index={index} onPress={setSelectedIngredient} />
                    )} 
                    scrollEnabled={false} 
                    contentContainerStyle={{ paddingBottom: 50 }} 
                    ListEmptyComponent={<IngredientsEmptyState />}
                />
            )}

            {visibleData.length < filteredList.length && (
                <PressableScale onPress={() => setRenderLimit(l => l + 10)} style={styles.loadMoreButton}>
                    <Text style={styles.loadMoreText}>عرض المزيد</Text>
                </PressableScale>
            )}

            {selectedIngredient && (
                <IngredientDetailsModal 
                    visible={!!selectedIngredient} 
                    ingredient={selectedIngredient} 
                    productsContaining={products.filter(p => selectedIngredient.productIds.includes(p.id))} 
                    onClose={() => setSelectedIngredient(null)} 
                />
            )}
        </View>
    );
};

// --- 3. DETAILED MODAL COMPONENT ---
const IngredientDetailsModal = ({ visible, onClose, ingredient, productsContaining }) => {
    const animController = useRef(new Animated.Value(0)).current; 
    const hasData = ingredient && visible;

    useEffect(() => {
        if (visible) {
            Animated.spring(animController, {
                toValue: 1,
                damping: 15, stiffness: 100, mass: 0.8, useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const animateOut = () => {
        Animated.timing(animController, {
            toValue: 0, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) onClose();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    const newValue = 1 - (gestureState.dy / height);
                    animController.setValue(newValue);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > height * 0.2 || gestureState.vy > 0.8) animateOut();
                else Animated.spring(animController, { toValue: 1, damping: 15, stiffness: 100, useNativeDriver: true }).start();
            },
        })
    ).current;

    if (!hasData) return null;

    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    
    // Safety Color Logic
    let safetyColor = COLORS.success;
    if (ingredient.warnings?.some(w => w.level === 'risk')) safetyColor = COLORS.danger;
    else if (ingredient.warnings?.some(w => w.level === 'caution')) safetyColor = COLORS.warning;

    return (
        <Modal transparent visible={true} onRequestClose={animateOut} animationType="none" statusBarTranslucent={true}>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={animateOut} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    {/* Header */}
                    <View {...panResponder.panHandlers} style={[styles.ingModalHeader, {borderTopLeftRadius: 24, borderTopRightRadius: 24}]}>
                        <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>
                        
                        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.ingModalTitle}>{ingredient.name}</Text>
                                    <Text style={styles.ingModalScientific}>{ingredient.scientific_name}</Text>
                                </View>
                                <View style={[styles.ingTypeBadge, { backgroundColor: safetyColor + '15' }]}>
                                    <FontAwesome5 name="flask" size={12} color={safetyColor} />
                                    <Text style={[styles.ingTypeText, { color: safetyColor }]}>{ingredient.functionalCategory}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.ingBadgesRow}>
                                {ingredient.chemicalType && (
                                    <View style={styles.ingBadge}><Text style={styles.ingBadgeText}>{ingredient.chemicalType}</Text></View>
                                )}
                                <View style={styles.ingBadge}><Text style={styles.ingBadgeText}>موجود في {productsContaining.length} منتج</Text></View>
                            </View>
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 50 }} bounces={false}>
                        {/* Benefits */}
                        {ingredient.benefits && Object.keys(ingredient.benefits).length > 0 && (
                            <View style={styles.ingSection}>
                                <Text style={styles.ingSectionTitle}>الفوائد الرئيسية</Text>
                                {Object.entries(ingredient.benefits).map(([benefit, score]) => (
                                    <View key={benefit} style={styles.benefitRow}>
                                        <Text style={styles.benefitLabel}>{benefit}</Text>
                                        <View style={styles.benefitBarContainer}><View style={[styles.benefitBarFill, { width: `${score * 100}%` }]} /></View>
                                        <Text style={styles.benefitScore}>{Math.round(score * 10)}/10</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Warnings */}
                        {ingredient.warnings && ingredient.warnings.length > 0 && (
                            <View style={styles.ingSection}>
                                <Text style={styles.ingSectionTitle}>تنبيهات السلامة</Text>
                                {ingredient.warnings.map((warn, i) => (
                                    <View key={i} style={[styles.warningBox, warn.level === 'risk' ? styles.warningBoxRisk : styles.warningBoxCaution]}>
                                        <FontAwesome5 name={warn.level === 'risk' ? "exclamation-circle" : "info-circle"} size={16} color={warn.level === 'risk' ? COLORS.danger : COLORS.warning} />
                                        <Text style={[styles.warningText, { color: warn.level === 'risk' ? COLORS.danger : COLORS.warning }]}>{warn.text}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Synergies & Conflicts - FIX: Removed findIngredientData */}
                        {(ingredient.synergy || ingredient.negativeSynergy) && (
                            <View style={styles.ingSection}>
                                <Text style={styles.ingSectionTitle}>التفاعلات</Text>
                                <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
                                    {ingredient.synergy && Object.keys(ingredient.synergy).length > 0 && (
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.interactionHeader}>✅ تآزر ممتاز مع</Text>
                                            {/* Key is usually the ingredient ID/Name, so we just display it directly */}
                                            {Object.keys(ingredient.synergy).map((key) => (
                                                <Text key={key} style={styles.synergyItem}>• {key}</Text>
                                            ))}
                                        </View>
                                    )}
                                    
                                    {ingredient.negativeSynergy && Object.keys(ingredient.negativeSynergy).length > 0 && (
                                        <>
                                            <View style={{ width: 1, backgroundColor: COLORS.border }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.interactionHeader}>❌ تجنب خلطه مع</Text>
                                                {/* Display key directly since we don't have local lookup */}
                                                {Object.keys(ingredient.negativeSynergy).map((key) => (
                                                    <Text key={key} style={styles.conflictItem}>• {key}</Text>
                                                ))}
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Products */}
                        <View style={styles.ingSection}>
                            <Text style={styles.ingSectionTitle}>موجود في رفّك</Text>
                            {productsContaining.map(p => (
                                <View key={p.id} style={styles.productChip}>
                                    <FontAwesome5 name="check" size={10} color={COLORS.accentGreen} />
                                    <Text style={styles.productChipText}>{p.productName}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

const MigrationSection = ({ products }) => {
    const [syntheticIngredients] = useState(['Paraben', 'Sulfate', 'Silicon', 'Fragrance', 'Alcohol', 'Mineral Oil']);
    const flagged = products.filter(p => 
        p.analysisData?.detected_ingredients?.some(i => 
            syntheticIngredients.some(bad => i.name.includes(bad))
        )
    );

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, []);

    const renderMigrationItem = ({ item, index }) => {
        const detectedSynthetics = syntheticIngredients.filter(bad => 
            item.analysisData?.detected_ingredients?.some(i => i.name.includes(bad))
        );
        
        return (
            <StaggeredItem index={index}>
                <ContentCard style={styles.migCard}>
                    <View style={{flexDirection:'row-reverse', justifyContent:'space-between', alignItems: 'flex-start'}}>
                        <View style={{flex: 1}}>
                            <Text style={styles.migName}>{item.productName}</Text>
                            <View style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 5}}>
                                {detectedSynthetics.slice(0, 3).map((ing, i) => (
                                    <View key={i} style={styles.badBadge}>
                                        <Text style={styles.badText}>{ing}</Text>
                                    </View>
                                ))}
                                {detectedSynthetics.length > 3 && (
                                    <View style={[styles.badBadge, {backgroundColor: 'rgba(251, 191, 36, 0.2)'}]}>
                                        <Text style={[styles.badText, {color: COLORS.gold}]}>
                                            +{detectedSynthetics.length - 3}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <View style={[styles.badBadge, styles.criticalBadge]}>
                            <Text style={[styles.badText, {color: '#000'}]}>صناعي</Text>
                        </View>
                    </View>
                    
                    <Text style={styles.migReason}>
                        يحتوي على {detectedSynthetics.length} مكون صناعي
                    </Text>
                    
                    <View style={styles.divider} />
                    
                    <Text style={styles.migSuggestion}>
                        💡 نقترح بديل طبيعي: زيت الأرغان أو صبار
                    </Text>
                    
                    <View style={styles.migrationTip}>
                        <FontAwesome5 name="lightbulb" size={12} color={COLORS.gold} />
                        <Text style={styles.migrationTipText}>
                            هذه المكونات قد تسبب تهيج للبشرة الحساسة
                        </Text>
                    </View>
                </ContentCard>
            </StaggeredItem>
        );
    };

    if (flagged.length === 0) {
        return <MigrationSuccessState />;
    }

    return (
        <FlatList 
            data={flagged}
            renderItem={renderMigrationItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 150 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
        />
    );
};

const SettingChip = ({ label, icon, isSelected, onPress }) => (
  <PressableScale onPress={onPress}>
      <View style={[styles.chip, isSelected && styles.chipActive]}>
          {icon && <FontAwesome5 name={icon} size={14} color={isSelected ? COLORS.textOnAccent : COLORS.textSecondary} />}
          <Text style={[styles.chipText, isSelected && { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold' }]}>
              {label}
          </Text>
      </View>
  </PressableScale>
);

const SingleSelectGroup = ({ title, options, selectedValue, onSelect }) => (
  <View style={styles.settingGroup}>
      <Text style={styles.groupLabel}>{title}</Text>
      <View style={styles.chipsRow}>
          {options.map(option => (
              <SettingChip
                  key={option.id}
                  label={option.label}
                  icon={option.icon}
                  isSelected={selectedValue === option.id}
                  onPress={() => onSelect(option.id)}
              />
          ))}
      </View>
  </View>
);

const MultiSelectGroup = ({ title, options, selectedValues, onToggle }) => {
  const currentSelected = Array.isArray(selectedValues) ? selectedValues : [];
  return (
      <View style={styles.settingGroup}>
          <Text style={styles.groupLabel}>{title}</Text>
          <View style={styles.chipsRow}>
              {options.map(option => (
                  <SettingChip
                      key={option.id}
                      label={option.name}
                      isSelected={currentSelected.includes(option.id)}
                      onPress={() => onToggle(option.id)}
                  />
              ))}
          </View>
      </View>
  );
};


// --- 3. SETTINGS SECTION (With Debounce to Save Reads/Writes) ---
const SettingsSection = ({ profile, onLogout }) => {
    const { user } = useAppContext();
    const [openAccordion, setOpenAccordion] = useState(null); 
  
    // Local form state
    const [form, setForm] = useState(() => ({
        goals: [], 
        conditions: [], 
        allergies: [], 
        skinType: null,
        scalpType: null,
        ...profile?.settings 
    }));
    
    const [isSaving, setIsSaving] = useState(false);

    // REF FOR DEBOUNCE TIMER
    const saveTimeoutRef = useRef(null);

    // Sync state with prop if profile updates from elsewhere
    useEffect(() => {
        if (profile?.settings) {
            setForm(prev => ({
                ...prev,
                ...profile.settings,
                goals: profile.settings.goals || [],
                conditions: profile.settings.conditions || [],
                allergies: profile.settings.allergies || [],
                skinType: profile.settings.skinType || null,
                scalpType: profile.settings.scalpType || null,
            }));
        }
    }, [profile]);

    // Cleanup timer if component unmounts to prevent memory leaks
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);
  
    const handleToggleAccordion = (id) => {
        Haptics.selectionAsync();
        setOpenAccordion(currentId => (currentId === id ? null : id));
    };
  
    // --- THE DEBOUNCED UPDATE FUNCTION ---
    const updateSetting = (key, value) => {
        if (!user?.uid) { Alert.alert("Error", "User not found."); return; }
        
        // 1. Optimistic Update (Update UI immediately so it feels fast)
        const newForm = { ...form, [key]: value };
        setForm(newForm);
        
        // 2. Visual Feedback that we are "working" on it
        setIsSaving(true);

        // 3. Clear the previous timer (Cancel the previous write request)
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // 4. Start a new timer
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                // 5. Actual Write to Firebase (Only runs if 1 second passes with no clicks)
                await updateDoc(doc(db, 'profiles', user.uid), { 
                    settings: newForm 
                }, { merge: true });
                
                // Optional: Subtle success haptic when save actually commits
                // Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
                
            } catch (e) {
                console.error("Error updating settings:", e);
                Alert.alert("Error", "Could not save setting.");
            } finally {
                setIsSaving(false);
                saveTimeoutRef.current = null;
            }
        }, 1000); // 1000ms = 1 Second Delay
    };
  
    const handleMultiSelectToggle = (field, itemId) => {
        const currentSelection = form[field] || [];
        const newSelection = currentSelection.includes(itemId) 
            ? currentSelection.filter(id => id !== itemId) 
            : [...currentSelection, itemId];
        updateSetting(field, newSelection);
    };
  
    return (
        <View style={{ paddingBottom: 150 }}>
            {/* Saving Indicator (Optional Visual Feedback) */}
            <View style={{ height: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 5 }}>
                {isSaving && (
                    <Animated.View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                         <ActivityIndicator size="small" color={COLORS.accentGreen} />
                         <Text style={{color: COLORS.textDim, fontSize: 10, fontFamily: 'Tajawal-Regular'}}>جاري الحفظ...</Text>
                    </Animated.View>
                )}
            </View>

            {/* Traits */}
            <StaggeredItem index={0}>
                <Accordion 
                    title="السمات الأساسية" 
                    icon="id-card" 
                    isOpen={openAccordion === 'traits'} 
                    onPress={() => handleToggleAccordion('traits')}
                >
                    <SingleSelectGroup 
                        title="نوع بشرتي" 
                        options={basicSkinTypes} 
                        selectedValue={form.skinType} 
                        onSelect={(value) => updateSetting('skinType', value)} 
                    />
                    <View style={styles.divider} />
                    <SingleSelectGroup 
                        title="نوع فروة رأسي" 
                        options={basicScalpTypes} 
                        selectedValue={form.scalpType} 
                        onSelect={(value) => updateSetting('scalpType', value)} 
                    />
                </Accordion>
            </StaggeredItem>
  
            {/* Goals */}
            <StaggeredItem index={1}>
                <Accordion 
                    title="الأهداف" 
                    icon="crosshairs" 
                    isOpen={openAccordion === 'goals'} 
                    onPress={() => handleToggleAccordion('goals')}
                >
                    <MultiSelectGroup 
                        options={GOALS_LIST.map(g => ({...g, name: g.label}))} 
                        selectedValues={form.goals} 
                        onToggle={(id) => handleMultiSelectToggle('goals', id)} 
                    />
                </Accordion>
            </StaggeredItem>
  
            {/* Conditions */}
            <StaggeredItem index={2}>
                <Accordion 
                    title="الحالات الصحية" 
                    icon="heartbeat" 
                    isOpen={openAccordion === 'conditions'} 
                    onPress={() => handleToggleAccordion('conditions')}
                >
                    <MultiSelectGroup 
                        options={commonConditions} 
                        selectedValues={form.conditions} 
                        onToggle={(id) => handleMultiSelectToggle('conditions', id)} 
                    />
                </Accordion>
            </StaggeredItem>
  
            {/* Allergies */}
            <StaggeredItem index={3}>
                <Accordion 
                    title="الحساسية" 
                    icon="allergies" 
                    isOpen={openAccordion === 'allergies'} 
                    onPress={() => handleToggleAccordion('allergies')}
                >
                    <MultiSelectGroup 
                        options={commonAllergies} 
                        selectedValues={form.allergies} 
                        onToggle={(id) => handleMultiSelectToggle('allergies', id)} 
                    />
                </Accordion>
            </StaggeredItem>
            
            {/* Account */}
            <StaggeredItem index={4}>
                 <Accordion 
                    title="إدارة الحساب" 
                    icon="user-cog" 
                    isOpen={openAccordion === 'account'} 
                    onPress={() => handleToggleAccordion('account')}
                >
                    <PressableScale onPress={onLogout} style={styles.logoutBtn}>
                        <Text style={styles.logoutText}>تسجيل الخروج</Text>
                        <FontAwesome5 name="sign-out-alt" size={16} color={COLORS.danger} />
                    </PressableScale>
                 </Accordion>
            </StaggeredItem>
        </View>
    );
};

const InsightDetailsModal = ({ visible, onClose, insight }) => {
    const animController = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) Animated.spring(animController, { toValue: 1, damping: 15, stiffness: 100, useNativeDriver: true }).start();
    }, [visible]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, useNativeDriver: true }).start(({ finished }) => { if (finished) onClose(); });
    };

    if (!insight) return null;

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    // Helper Colors
    const getSeverityColor = (s) => (s === 'critical' ? COLORS.danger : s === 'warning' ? COLORS.warning : COLORS.success);
    const mainColor = getSeverityColor(insight.severity);

    // --- RENDERER: RICH GOAL DASHBOARD ---
    const renderGoalDashboard = (data) => {
        // 1. SAFETY CHECKS (Prevents Crash)
        // Ensure arrays exist before checking .length
        const foundHeroes = data?.foundHeroes || [];
        const missingHeroes = data?.missingHeroes || [];
        const relatedProducts = insight.related_products || [];

        return (
            <View>
                {/* 1. Large Score Circle */}
                <View style={{ alignItems: 'center', marginBottom: 25 }}>
                    <ChartRing 
                        percentage={data.score || 0} 
                        color={mainColor} 
                        radius={60} 
                        strokeWidth={10} 
                    />
                    <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, marginTop: 10 }}>مؤشر التطابق</Text>
                </View>

                {/* 2. Sunscreen Alert (If Penalty) */}
                {data.sunscreenPenalty && (
                    <View style={[styles.alertBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: COLORS.danger }]}>
                        <FontAwesome5 name="sun" size={18} color={COLORS.danger} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.alertBoxText, { color: COLORS.danger, fontFamily: 'Tajawal-Bold' }]}>تنبيه حماية</Text>
                            <Text style={[styles.alertBoxText, { color: COLORS.danger }]}>تم إيقاف تقدم الهدف عند 35% لأنك لا تستخدمين واقي شمس.</Text>
                        </View>
                    </View>
                )}

                {/* 3. Hero Ingredients Found (Green) */}
                <View style={styles.ingSection}>
                    <Text style={styles.ingSectionTitle}>✅ مكونات نشطة لديكِ</Text>
                    <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                        {foundHeroes.length > 0 ? (
                            foundHeroes.map((h, i) => (
                                <View key={i} style={[styles.ingredientChip, { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)', borderWidth: 1 }]}>
                                    <Text style={[styles.ingredientChipText, { color: COLORS.success }]}>{h}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noDataText}>لا توجد مكونات قوية لهذا الهدف حتى الآن.</Text>
                        )}
                    </View>
                </View>

                {/* 4. Missing Suggestions (Yellow/Red) */}
                {(data.score || 0) < 100 && (
                    <View style={styles.ingSection}>
                        <Text style={styles.ingSectionTitle}>🧪 مقترحات لرفع النتيجة</Text>
                        <Text style={{ fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, marginBottom: 10, textAlign: 'right' }}>
                            ابحثي عن منتجات تحتوي على:
                        </Text>
                        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                            {missingHeroes.map((h, i) => (
                                <View key={i} style={[styles.ingredientChip, { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: COLORS.warning, borderWidth: 1, borderStyle: 'dashed' }]}>
                                    <Text style={[styles.ingredientChipText, { color: COLORS.warning }]}>
                                        {h.replace(/-/g, ' ')}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* 5. Contributing Products List */}
                {relatedProducts.length > 0 && (
                    <View style={styles.ingSection}>
                        <Text style={styles.ingSectionTitle}>المنتجات المساهمة</Text>
                        {relatedProducts.map((p, i) => (
                            <View key={i} style={styles.productChip}>
                                <FontAwesome5 name="check" size={12} color={COLORS.accentGreen} />
                                <Text style={styles.productChipText}>{p}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    }; // <--- CLOSING BRACE ADDED HERE

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>

                    <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                        
                        {/* CONDITIONAL RENDERING LOGIC */}
                        
                        {/* A. WEATHER DASHBOARD (Use the special component) */}
                        {(insight.customData?.type === 'weather_dashboard' || insight.customData?.type === 'weather_advice') ? (
                            <WeatherDetailedSheet insight={insight} />
                        ) : 
                        
                        /* B. GOAL DASHBOARD (Use the specific renderer) */
                        (insight.type === 'goal_analysis' && insight.customData) ? (
                            renderGoalDashboard(insight.customData)
                        ) : (
                            
                        /* C. STANDARD INSIGHT (Fallback) */
                            <>
                                <View style={styles.modalHeader}>
                                    <View style={[styles.modalIconContainer, { backgroundColor: mainColor + '20' }]}>
                                        <FontAwesome5 
                                            name={insight.severity === 'critical' ? 'shield-alt' : 'info-circle'} 
                                            size={24} 
                                            color={mainColor} 
                                        />
                                    </View>
                                    <Text style={styles.modalTitle}>{insight.title}</Text>
                                </View>

                                <Text style={styles.modalDescription}>{insight.details}</Text>
                                
                                {insight.related_products?.length > 0 && (
                                    <View style={{ marginTop: 20 }}>
                                        <Text style={styles.relatedProductsTitle}>المنتجات المعنية:</Text>
                                        {insight.related_products.map((p, i) => (
                                            <View key={i} style={styles.productChip}>
                                                <FontAwesome5 name="wine-bottle" size={12} color={COLORS.textSecondary} />
                                                <Text style={styles.productChipText}>{p}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </>
                        )}

                        <Pressable onPress={handleClose} style={[styles.closeButton, { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginTop: 30 }]}>
                            <Text style={[styles.closeButtonText, {color: COLORS.textPrimary}]}>إغلاق</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

const ShelfActionGroup = ({ router }) => {
    const [isOpen, setIsOpen] = useState(false);
    const anim = useRef(new Animated.Value(0)).current;

    const toggleMenu = () => {
        const toValue = isOpen ? 0 : 1;
        if (!isOpen) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsOpen(!isOpen);
        
        Animated.spring(anim, {
            toValue,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const handlePressIn = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handlePress = (route) => {
        router.push(route);
        // Clean up UI silently after navigation
        setTimeout(() => {
            setIsOpen(false);
            anim.setValue(0);
        }, 400);
    };

    const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
    
    // Updated Spacing for 3 Buttons:
    const action1Y = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -190] }); // Top (Comparison)
    const action2Y = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -130] }); // Middle (Community) - NEW
    const action3Y = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -70] });  // Bottom (Scan)
    
    // Buttons appear instantly (0 -> 1 quickly)
    const buttonOpacity = anim.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] });
    
    // Overlay fades smoothly (0 -> 1 linear)
    const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    return (
        <View style={styles.fabContainer} pointerEvents="box-none">
            
            {/* 1. INDEPENDENT OVERLAY */}
            <Animated.View 
                style={{
                    position: 'absolute',
                    top: -height * 1.5, 
                    left: -width * 1.5, 
                    width: width * 3, 
                    height: height * 3,
                    backgroundColor: 'rgba(26, 45, 39, 0.9)',
                    zIndex: 0, 
                    opacity: backdropOpacity,
                    elevation: 0 
                }} 
                pointerEvents={isOpen ? 'auto' : 'none'}
            >
                <Pressable style={{flex: 1}} onPress={toggleMenu} />
            </Animated.View>

            {/* 2. BUTTON 1: Comparison (Top) */}
            <Animated.View 
                style={[styles.actionBtnWrap, { opacity: buttonOpacity, transform: [{ translateY: action1Y }], zIndex: 10 }]}
            >
                <View style={styles.actionLabelContainer}>
                    <Text style={styles.actionLabel}>مقارنة منتجات</Text>
                </View>
                
                <Pressable
                    onPressIn={handlePressIn}
                    onPress={() => handlePress('/comparison')}
                    style={({ pressed }) => [
                        styles.actionBtn, 
                        { backgroundColor: '#4a8a73', opacity: pressed ? 0.8 : 1 }
                    ]}
                    hitSlop={20} 
                    pressRetentionOffset={{ top: 150, bottom: 150, left: 150, right: 150 }}
                >
                    <FontAwesome5 name="balance-scale" size={16} color={COLORS.textOnAccent} />
                </Pressable>
            </Animated.View>

            {/* 3. BUTTON 2: Community (Middle - NEW) */}
            <Animated.View 
                style={[styles.actionBtnWrap, { opacity: buttonOpacity, transform: [{ translateY: action2Y }], zIndex: 10 }]}
            >
                <View style={styles.actionLabelContainer}>
                    <Text style={styles.actionLabel}>المجتمع</Text>
                </View>
                
                <Pressable
                    onPressIn={handlePressIn}
                    onPress={() => handlePress('/community')}
                    style={({ pressed }) => [
                        styles.actionBtn, 
                        { backgroundColor: COLORS.gold, opacity: pressed ? 0.8 : 1 }
                    ]}
                    hitSlop={20} 
                    pressRetentionOffset={{ top: 150, bottom: 150, left: 150, right: 150 }}
                >
                    <FontAwesome5 name="users" size={16} color={COLORS.textOnAccent} />
                </Pressable>
            </Animated.View>

            {/* 4. BUTTON 3: Scan (Bottom) */}
            <Animated.View 
                style={[styles.actionBtnWrap, { opacity: buttonOpacity, transform: [{ translateY: action3Y }], zIndex: 10 }]}
            >
                <View style={styles.actionLabelContainer}>
                    <Text style={styles.actionLabel}>فحص منتج</Text>
                </View>

                <Pressable
                    onPressIn={handlePressIn}
                    onPress={() => handlePress('/oilguard')}
                    style={({ pressed }) => [
                        styles.actionBtn, 
                        { backgroundColor: COLORS.accentGreen, opacity: pressed ? 0.8 : 1 }
                    ]}
                    hitSlop={20}
                    pressRetentionOffset={{ top: 150, bottom: 150, left: 150, right: 150 }}
                >
                    <FontAwesome5 name="magic" size={16} color={COLORS.textOnAccent} />
                </Pressable>
            </Animated.View>

            {/* 5. MAIN FAB */}
            <PressableScale 
                style={[styles.mainFab, { zIndex: 20 }]} 
                onPress={toggleMenu}
            >
                <LinearGradient 
                    colors={isOpen ? [COLORS.danger, '#991b1b'] : [COLORS.accentGreen, '#4a8a73']} 
                    style={styles.fabGradient}
                >
                    <Animated.View style={{ transform: [{ rotate }] }}>
                        <FontAwesome5 name="plus" size={22} color={COLORS.textOnAccent} />
                    </Animated.View>
                </LinearGradient>
            </PressableScale>
            
        </View>
    );
};

// --- OPTIMIZED COMPONENT: ANIMATED SCORE RING (Fixed Latency) ---
// --- OPTIMIZED COMPONENT: ANIMATED SCORE RING (Fixed Text Orientation) ---
const AnimatedScoreRing = React.memo(({ score, color, radius = 28, strokeWidth = 4 }) => {
    // 1. Calculate the ACTUAL radius of the SVG path
    const innerRadius = radius - strokeWidth / 2;
    
    // 2. Calculate circumference
    const circumference = 2 * Math.PI * innerRadius;
    
    const [displayOffset, setDisplayOffset] = useState(circumference);
    const [displayScore, setDisplayScore] = useState(0);
    
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        animatedValue.setValue(0);

        const animation = Animated.timing(animatedValue, {
            toValue: score,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false 
        });

        const listenerId = animatedValue.addListener(({ value }) => {
            const maxVal = Math.min(Math.max(value, 0), 100);
            const offset = circumference - (maxVal / 100) * circumference;
            
            setDisplayOffset(offset);
            setDisplayScore(Math.round(value));
        });

        animation.start();

        return () => {
            animatedValue.removeListener(listenerId);
            animation.stop();
        };
    }, [score, circumference]);

    return (
        <View style={{ width: radius * 2, height: radius * 2, alignItems: 'center', justifyContent: 'center' }}>
            {/* The SVG is rotated -90deg so the bar starts at the top */}
            <Svg width={radius * 2} height={radius * 2} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle 
                    cx={radius} cy={radius} 
                    r={innerRadius} 
                    stroke={COLORS.border} 
                    strokeWidth={strokeWidth} 
                    fill="none" 
                    strokeOpacity={0.3}
                />
                <Circle
                    cx={radius} cy={radius}
                    r={innerRadius} 
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={displayOffset} 
                    strokeLinecap="round"
                />
            </Svg>
            
            {/* 
               FIX: Removed 'transform: [{ rotate: "90deg" }]'.
               The text sits in the parent View (which is not rotated), 
               so it will naturally be upright.
            */}
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ 
                    fontFamily: 'Tajawal-ExtraBold', 
                    fontSize: 13, 
                    color: color,
                    textAlign: 'center',
                    // Optional: slight adjustment if font baseline looks off
                    paddingTop: 2 
                }}>
                    {displayScore}
                </Text>
            </View>
        </View>
    );
});

// ============================================================================
//                       MAIN PROFILE CONTROLLER
// ============================================================================

export default function ProfileScreen() {
    // ========================================================================
    // --- 1. HOOKS, CONTEXT & NAVIGATION ---
    // ========================================================================
    const { user, userProfile, savedProducts, setSavedProducts, loading, logout } = useAppContext();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [offlineProducts, setOfflineProducts] = useState([]); 
    const [isOfflineMode, setIsOfflineMode] = useState(false);

    
    // ========================================================================
    // --- 2. CONSTANTS & UI CONFIG ---
    // ========================================================================
    const HEADER_BASE_HEIGHT = 120;
    const headerMaxHeight = HEADER_BASE_HEIGHT + insets.top;
    const headerMinHeight = (Platform.OS === 'ios' ? 90 : 80) + insets.top;
    const scrollDistance = headerMaxHeight - headerMinHeight;

    const TABS = [
        { id: 'shelf', label: 'رفي', icon: 'list' },
        { id: 'routine', label: 'روتيني', icon: 'calendar-check' },
        { id: 'analysis', label: 'تحليل', icon: 'chart-pie' },
        { id: 'migration', label: 'البديل', icon: 'exchange-alt' },
        { id: 'ingredients', label: 'مكوناتي', icon: 'flask' },
        { id: 'settings', label: 'إعداداتي', icon: 'cog' },
    ];

    // ========================================================================
    // --- 3. STATE MANAGEMENT ---
    // ========================================================================
    // UI State
    const [activeTab, setActiveTab] = useState('shelf');
    const [isAddStepModalVisible, setAddStepModalVisible] = useState(false);
    const [addStepHandler, setAddStepHandler] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [dismissedInsightIds, setDismissedInsightIds] = useState([]);
    
    // Permissions
    const [locationPermission, setLocationPermission] = useState('undetermined');
    const [isPermissionModalVisible, setPermissionModalVisible] = useState(false);

    // API State: Profile (Fast)
    const [analysisData, setAnalysisData] = useState(null);
    const [isAnalyzingProfile, setIsAnalyzingProfile] = useState(false);
    
    // API State: Weather (Slow/Async)
    const [weatherData, setWeatherData] = useState(null);
    const [isAnalyzingWeather, setIsAnalyzingWeather] = useState(false);
    const [weatherErrorType, setWeatherErrorType] = useState(null); // 'permission' | 'service' | null

    // ========================================================================
    // --- 4. REFS & ANIMATIONS ---
    // ========================================================================
    const scrollY = useRef(new Animated.Value(0)).current;
    const contentOpacity = useRef(new Animated.Value(1)).current;
    const contentTranslate = useRef(new Animated.Value(0)).current;
    
    // Caches
    const analysisCache = useRef({ hash: '', data: null });
    const ingredientsCache = useRef({ hash: '', data: [] });
    const weatherCache = useRef({ hash: '', lastRun: 0 });

    
    // App Lifecycle
    const appState = useRef(AppState.currentState);

     // --- OFFLINE: LOAD CACHE ON MOUNT ---
    useEffect(() => {
        const loadOfflineData = async () => {
            if (!user?.uid) return;

            // 1. Fetch from Disk
            const cached = await getOfflineProfile(user.uid);
            
            if (cached) {
                // A. Restore Analysis & Weather (These are local state)
                if (cached.analysisData) {
                    setAnalysisData(cached.analysisData);
                    // Hydrate the ref cache too so we don't re-fetch unnecessarily
                    analysisCache.current = { 
                        hash: generateFingerprint(cached.savedProducts, cached.userProfile?.settings), 
                        data: cached.analysisData 
                    };
                }
                
                if (cached.weatherData) {
                    setWeatherData(cached.weatherData);
                }

                // B. Handle Products (Context vs Offline)
                // If Context is empty (network failed) but Cache has products, use Cache.
                if (savedProducts.length === 0 && cached.savedProducts?.length > 0) {
                    console.log("Offline Mode: Using cached products");
                    setOfflineProducts(cached.savedProducts);
                    setIsOfflineMode(true);
                    // Optional: You could force these into Context here if your Context allows it:
                    // setSavedProducts(cached.savedProducts); 
                }
            }
        };

        loadOfflineData();
    }, [user?.uid]);

    const effectiveProducts = (savedProducts.length > 0) ? savedProducts : offlineProducts;
    // Note: You must also pass `userProfile` from cache if context profile is missing, 
    // but usually Context handles profile object better.

    // ========================================================================
    // --- OFFLINE: SAVE CACHE ON UPDATES ---
    // ========================================================================
    
    // Update the Cache whenever critical data changes successfully
    useEffect(() => {
        if (user?.uid && analysisData && effectiveProducts.length > 0) {
            saveOfflineProfile(user.uid, {
                savedProducts: effectiveProducts,
                userProfile: userProfile, // Contains routines
                analysisData: analysisData,
                weatherData: weatherData
            });
        }
    }, [effectiveProducts, analysisData, weatherData, userProfile, user?.uid]);

    // Background Particles
    const particles = useMemo(() => [...Array(15)].map((_, i) => ({ 
        id: i, 
        size: Math.random()*5+3, 
        startX: Math.random()*width, 
        duration: 8000+Math.random()*7000, 
        delay: Math.random()*5000 
    })), []);

    // ========================================================================
    // --- 5. API LOGIC: PROFILE ANALYSIS (FAST) ---
    // ========================================================================
    const runProfileAnalysis = useCallback(async (forceRefresh = false) => {
        // Use effectiveProducts instead of savedProducts
        if (!effectiveProducts || effectiveProducts.length === 0) return;
        // 1. Cache Check
        const currentHash = generateFingerprint(savedProducts, userProfile?.settings);
        
        // CHANGE: Only use cache if NOT forcing a refresh
        if (!forceRefresh && analysisCache.current.hash === currentHash && analysisCache.current.data) {
            setAnalysisData(analysisCache.current.data);
            return;
        }

        setIsAnalyzingProfile(true);

        try {
            // 2. Fetch Core Analysis
            const response = await fetch(`${PROFILE_API_URL}/analyze-profile.js`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    products: savedProducts,
                    settings: userProfile?.settings || {},
                    currentRoutine: userProfile?.routines
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                setAnalysisData(data);
                analysisCache.current = { hash: currentHash, data: data };
                
                // NEW: Explicit Save on success
                saveOfflineProfile(user.uid, {
                    savedProducts: effectiveProducts,
                    userProfile: userProfile,
                    analysisData: data,
                    weatherData: weatherData
                });
            }
        } catch (e) {
            console.error("Profile Analysis Error (Network):", e);
            // Fallback is already handled by the initial useEffect loading the cache!
        } finally {
            setIsAnalyzingProfile(false);
        }
    }, [effectiveProducts, userProfile, weatherData, user?.uid]);

    // ========================================================================
    // --- 6. API LOGIC: WEATHER INTELLIGENCE (INDEPENDENT) ---
    // ========================================================================
    // ========================================================================
    // --- 6. API LOGIC: WEATHER INTELLIGENCE (INDEPENDENT) ---
    // ========================================================================
    const runWeatherAnalysis = useCallback(async (force = false) => {
        // 1. Safety Checks
        if (!effectiveProducts || effectiveProducts.length === 0) return;
        
        // 2. Loop Prevention: Generate Hash & Time Check
        const currentHash = generateFingerprint(effectiveProducts, userProfile?.settings);
        const now = Date.now();
        const FIVE_MINUTES = 5 * 60 * 1000;

        // CHECK CACHE: 
        // If NOT forced, AND hash matches last run, AND run recently (or we already have data), STOP.
        if (!force && 
            weatherCache.current.hash === currentHash && 
            weatherData && 
            (now - weatherCache.current.lastRun < FIVE_MINUTES)
        ) {
            return;
        }

        setIsAnalyzingWeather(true);
        setWeatherErrorType(null);

        try {
            // A. Check Permissions
            let { status } = await Location.getForegroundPermissionsAsync();
            if (status === 'undetermined') {
                const req = await Location.requestForegroundPermissionsAsync();
                status = req.status;
            }
            
            setLocationPermission(status); 

            if (status !== 'granted') {
                setWeatherErrorType('permission');
                setIsAnalyzingWeather(false);
                return;
            }

            // B. Get GPS Coordinates (Safely)
            let loc;
            try {
                // Timeout: 5000ms ensures it doesn't hang forever if GPS is stuck
                loc = await Location.getCurrentPositionAsync({ 
                    accuracy: Location.Accuracy.Balanced, 
                    timeout: 5000 
                });
            } catch (locationError) {
                console.log("GPS Location failed or timed out, falling back to LastKnown");
                // Fallback attempt: Get last cached location
                loc = await Location.getLastKnownPositionAsync({});
            }
            
            if (!loc) {
                throw new Error("Location services unavailable");
            }

            // C. Get City Name (Free Reverse Geocoding)
            let cityName = 'موقعي';
            try {
                const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&localityLanguage=ar`;
                const geoRes = await fetch(geoUrl);
                const geoData = await geoRes.json();
                cityName = geoData.city || geoData.locality || geoData.principalSubdivision || 'موقعي';
            } catch (e) { 
                console.log('City fetch warning:', e.message); 
            }

            // D. Fetch Weather Analysis
            const response = await fetch(`${PROFILE_API_URL}/analyze-weather`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    products: effectiveProducts,
                    settings: userProfile?.settings || {},
                    location: {
                        lat: loc.coords.latitude,
                        lon: loc.coords.longitude,
                        city: cityName
                    }
                })
            });

            const data = await response.json();
            
            if (response.ok && data.insights) {
                setWeatherData(data.insights);
                
                // UPDATE CACHE REF ON SUCCESS
                weatherCache.current = { 
                    hash: currentHash, 
                    lastRun: Date.now() 
                };

                // Update Offline Storage
                if (user?.uid) {
                    saveOfflineProfile(user.uid, {
                        savedProducts: effectiveProducts,
                        userProfile: userProfile,
                        analysisData: analysisData, // Persist existing analysis
                        weatherData: data.insights  // Persist new weather
                    });
                }
            } else {
                setWeatherErrorType('service');
            }

        } catch (e) {
            console.log("Weather Analysis Skipped:", e.message);
            setWeatherErrorType('service');
        } finally {
            setIsAnalyzingWeather(false);
        }
    }, [effectiveProducts, userProfile, weatherData, analysisData, user?.uid]);
    // ========================================================================
    // --- 7. ORCHESTRATOR & LIFECYCLE ---
    // ========================================================================
    
    // Master Runner: Triggers both streams
    const runFullAnalysis = useCallback((isPullToRefresh = false) => {
        if (isPullToRefresh) {
            setRefreshing(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Nice touch feedback
        }
        
        // Pass 'true' to force a fresh fetch
        const profilePromise = runProfileAnalysis(isPullToRefresh);
        
        // Always re-run weather on refresh
        runWeatherAnalysis(); 

        profilePromise.finally(() => {
            if (isPullToRefresh) setRefreshing(false);
        });

    }, [runProfileAnalysis, runWeatherAnalysis]);

    // Initial Load & App Resume Listener
    useEffect(() => {
        runFullAnalysis(); 

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                // Refresh weather when user comes back
                runWeatherAnalysis();
            }
            appState.current = nextAppState;
        });

        return () => subscription.remove();
    }, [runFullAnalysis, runWeatherAnalysis]);


    // ========================================================================
    // --- 8. HANDLERS ---
    // ========================================================================

    const openAddStepModal = (onAddCallback) => {
        setAddStepHandler(() => onAddCallback); 
        setAddStepModalVisible(true);
    };

    const handleDelete = async (id) => { 
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        
        // Optimistic Update
        const old = [...effectiveProducts];
        const newProducts = effectiveProducts.filter(p => p.id !== id);
        
        // Update Local State (for offline mode logic)
        if(isOfflineMode) setOfflineProducts(newProducts);
        // Update Context (if online)
        else setSavedProducts(prev => prev.filter(p => p.id !== id));

        // Update Offline Cache Immediately
        saveOfflineProfile(user.uid, {
            savedProducts: newProducts,
            userProfile: userProfile,
            analysisData: analysisData,
            weatherData: weatherData
        });

        try { 
            await deleteDoc(doc(db, 'profiles', user.uid, 'savedProducts', id)); 
        } catch (error) { 
            console.error("Delete failed", error);
            // Revert on error
            if(isOfflineMode) setOfflineProducts(old);
            else setSavedProducts(old);
            Alert.alert("خطأ", "تعذر حذف المنتج (تحقق من الاتصال)"); 
        }
    };

    const handleDismissPraise = (id) => { 
        if (!dismissedInsightIds.includes(id)) {
            setDismissedInsightIds(prev => [...prev, id]); 
        }
    };

    const switchTab = (tab) => { 
        if(tab !== activeTab) { 
            Haptics.selectionAsync(); 
            setActiveTab(tab); 
        } 
    };

    // Animation Interpolations
    const headerHeight = scrollY.interpolate({ inputRange: [0, scrollDistance], outputRange: [headerMaxHeight, headerMinHeight], extrapolate: 'clamp' });
    const expandedHeaderOpacity = scrollY.interpolate({ inputRange: [0, scrollDistance / 2], outputRange: [1, 0], extrapolate: 'clamp' });
    const expandedHeaderTranslate = scrollY.interpolate({ inputRange: [0, scrollDistance], outputRange: [0, -20], extrapolate: 'clamp' });
    const collapsedHeaderOpacity = scrollY.interpolate({ inputRange: [scrollDistance / 2, scrollDistance], outputRange: [0, 1], extrapolate: 'clamp' });

    // ========================================================================
    // --- 9. RENDER ---
    // ========================================================================
    return (
      <View style={styles.container}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          
          {/* Background Particles */}
          {particles.map((p) => <Spore key={p.id} {...p} />)}
          
          {/* --- PARALLAX HEADER --- */}
          <Animated.View style={[styles.header, { height: headerHeight }]}>
              <LinearGradient 
                  colors={['#1A2D27', 'rgba(26, 45, 39, 0.95)', 'rgba(26, 45, 39, 0)']} 
                  style={StyleSheet.absoluteFill} 
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              />

              {/* Expanded State */}
              <Animated.View style={[
                  styles.headerContentExpanded, 
                  { opacity: expandedHeaderOpacity, transform: [{ translateY: expandedHeaderTranslate }] }
              ]}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.welcomeText}>
                          أهلاً، {userProfile?.settings?.name?.split(' ')[0] || 'بك'}
                      </Text>
                      <AuthenticHeader 
                          productCount={savedProducts.length} 
                          userName={userProfile?.settings?.name} 
                      />
                  </View>
                  <View style={styles.avatar}><Text style={{fontSize: 28}}>🧖‍♀️</Text></View>
              </Animated.View>

              {/* Collapsed State */}
              <Animated.View style={[
                  styles.headerContentCollapsed, 
                  { opacity: collapsedHeaderOpacity, height: headerMinHeight - insets.top }
              ]}>
                  <View style={styles.collapsedContainer}>
                      <View style={{ width: 32 }} />
                      <View style={styles.collapsedTitleRow}>
                           <Text style={styles.collapsedTitle}>
                              {HEADER_TITLES[activeTab]?.title || 'الملف الشخصي'}
                           </Text>
                           <FontAwesome5 
                              name={HEADER_TITLES[activeTab]?.icon || 'user'} 
                              size={12} 
                              color={COLORS.textSecondary} 
                           />
                      </View>
                      <Pressable onPress={() => Haptics.selectionAsync()}>
                          <View style={styles.collapsedAvatar}>
                              <Text style={{fontSize: 16}}>🧖‍♀️</Text>
                          </View>
                      </Pressable>
                  </View>
              </Animated.View>
          </Animated.View>

          {isOfflineMode && savedProducts.length === 0 && (
                <View style={{backgroundColor: COLORS.warning, padding: 5, alignItems: 'center', marginTop: insets.top + 60}}>
                    <Text style={{color: '#000', fontSize: 10, fontFamily: 'Tajawal-Bold'}}>
                        لا يوجد اتصال - يتم عرض نسخة محفوظة
                    </Text>
                </View>
            )}
          {/* --- SCROLL CONTENT --- */}
          <Animated.ScrollView 
              contentContainerStyle={{ paddingHorizontal: 15, paddingTop: headerMaxHeight + 20, paddingBottom: 100 }}
              scrollEventThrottle={16}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={() => runFullAnalysis(true)} 
                  tintColor={COLORS.accentGreen} 
                  colors={[COLORS.accentGreen]} // For Android
                />
            }
        >
              <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslate }], minHeight: 400 }}>
                  
                  {activeTab === 'shelf' && (
                <ShelfSection 
                    products={effectiveProducts} // <--- UPDATED PROP
                    loading={loading && !isOfflineMode} // Don't show skeleton if we have offline data
                        onDelete={handleDelete} 
                        onRefresh={() => runFullAnalysis(true)} 
                        router={router} 
                    />
                  )}
                  
                  {activeTab === 'routine' && (
                <RoutineSection 
                    savedProducts={effectiveProducts}
                        userProfile={userProfile} 
                        onOpenAddStepModal={openAddStepModal} 
                        analysisData={analysisData}
                        weatherData={weatherData}
                    />
                  )}
                  
                  {activeTab === 'analysis' && (
                      <AnalysisSection 
                          // Core Profile Data
                          loadingProfile={isAnalyzingProfile} 
                          analysisData={analysisData} 
                          
                          // Independent Weather Data
                          loadingWeather={isAnalyzingWeather}
                          weatherResults={weatherData}
                          weatherErrorType={weatherErrorType}
                          onRetryWeather={runWeatherAnalysis}
                          
                          // Shared
                          savedProducts={effectiveProducts}
                          dismissedInsightIds={dismissedInsightIds} 
                          handleDismissPraise={handleDismissPraise} 
                          userProfile={userProfile} 
                          locationPermission={locationPermission} 
                          onShowPermissionAlert={() => setPermissionModalVisible(true)} 
                          router={router}
                      />
                  )}
                  
                  {activeTab === 'ingredients' && (
                    <IngredientsSection 
                        products={savedProducts} 
                        userProfile={userProfile} 
                        cacheRef={ingredientsCache}
                    />
                  )}
                  
                  {activeTab === 'migration' && (
                    <MigrationSection products={savedProducts} />
                  )}
                  
                  {activeTab === 'settings' && (
                    <SettingsSection 
                        profile={userProfile} 
                        onLogout={() => { logout(); router.replace('/login'); }} 
                    />
                  )}
              
              </Animated.View>
          </Animated.ScrollView>
  
          {/* --- FLOATING CONTROLS --- */}
          <NatureDock tabs={TABS} activeTab={activeTab} onTabChange={switchTab} />
          
          <AddStepModal 
            isVisible={isAddStepModalVisible} 
            onClose={() => setAddStepModalVisible(false)} 
            onAdd={(stepName) => { if (addStepHandler) addStepHandler(stepName); }} 
          />
          
          {activeTab === 'shelf' && <ShelfActionGroup router={router} />}
          
          <LocationPermissionModal 
              visible={isPermissionModalVisible} 
              onClose={() => setPermissionModalVisible(false)} 
          />
      </View>
    );
}

  const styles = StyleSheet.create({
    // ========================================================================
    // --- 1. GLOBAL & CONTAINER ---
    // ========================================================================
    container: {
        flex: 1,
        backgroundColor: COLORS.background
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12
    },
  
    // ========================================================================
    // --- 2. HEADER (PARALLAX) ---
    // ========================================================================
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        overflow: 'hidden',
    },
    headerContentExpanded: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingBottom: 15,
    },
    headerContentCollapsed: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        // Remove 'justifyContent: center' and 'alignItems: center'
        // We handle layout inside the container now
        paddingHorizontal: 20,
        paddingBottom: 10, // Adjust based on your header height
    },

    // NEW STYLES
    collapsedContainer: {
        flexDirection: 'row', // Note: Row direction, we will manage RTL manually or via flex
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        paddingTop: 5,
    },
    collapsedTitleRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    collapsedTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    collapsedAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    collapsedBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(90, 156, 132, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(90, 156, 132, 0.3)',
    },
    welcomeText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 26,
        color: COLORS.textPrimary,
        textAlign: 'right',
    },
    subWelcome: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'right',
        marginTop: 2,
    },
    collapsedTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: COLORS.textPrimary,
    },
    avatar: {
        width: 55,
        height: 55,
        borderRadius: 27.5,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: COLORS.accentGreen
    },
  
    // ========================================================================
    // --- 3. BASE UI & GENERAL COMPONENTS ---
    // ========================================================================
    cardBase: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 20,
        marginBottom: 15,
    },
    
    iconBoxSm: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(90, 156, 132, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
  
    // ========================================================================
    // --- 4. BOTTOM DOCK (NATURE DOCK) ---
    // ========================================================================
    dockOuterContainer: {
        position: 'absolute',
        bottom: 60,
        left: 20,
        right: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    dockContainer: {
        height: 65,
        borderRadius: 35,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.card,
        overflow: 'hidden',
    },
    pillIndicator: {
        position: 'absolute',
        top: 5,
        left: 0,
        height: 52,
        borderRadius: 24,
        backgroundColor: COLORS.accentGreen,
        zIndex: 1,
    },
    tabsContainer: {
        ...StyleSheet.absoluteFillObject,
        flexDirection: 'row-reverse',
        justifyContent: 'space-around',
        alignItems: 'center',
        zIndex: 2,
    },
    dockItem: {
        flex: 1,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    dockLabel: {
        position: 'absolute',
        bottom: 7,
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
        color: COLORS.textOnAccent,
    },
  
    // ========================================================================
    // --- 5. FLOATING ACTION BUTTON (FAB) ---
    // ========================================================================
    fabRoutine: { 
        position: 'absolute',
        bottom: 130,
        right: 20,
        shadowColor: COLORS.accentGreen,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10
    },
    fabGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
  
    fabContainer: {
      position: 'absolute',
      bottom: 130, 
      right: 20,
      alignItems: 'center',
      zIndex: 999,
  },
  mainFab: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 2,
  },
  actionBtnWrap: {
      position: 'absolute',
      bottom: 0,
      right: 4, 
      flexDirection: 'row', 
      alignItems: 'center',
      justifyContent: 'flex-end',
      width: 200, 
      zIndex: 2,
      pointerEvents: 'box-none',
  },
  actionBtn: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
  },
  actionLabelContainer: {
      backgroundColor: COLORS.card, 
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginRight: 12, 
      borderWidth: 1,
      borderColor: COLORS.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
  },
  actionLabel: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 12,
      color: COLORS.textPrimary,
  },
  
    // ========================================================================
    // --- 6. SECTION: SHELF & PRODUCTS ---
    // ========================================================================
  statsContainer: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-around',
  },
  statBox: {
      alignItems: 'center',
      flex: 1,
  },
  statLabel: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 10,
      color: COLORS.textSecondary,
      marginBottom: 5,
  },
  statValue: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 22,
      color: COLORS.accentGreen
  },
  statDivider: {
      width: 1,
      height: '60%',
      backgroundColor: COLORS.border,
      alignSelf: 'center'
  },
  
  productListItemWrapper: {
      backgroundColor: COLORS.card,
      borderRadius: 20,
  },
  productListItem: {
    flexDirection: 'row', // Use standard row, we manage children order
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
},
listItemScoreContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
},
listItemContent: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'flex-end', // Text to the right for Arabic
},
listItemName: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 4,
},
listItemType: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: COLORS.textSecondary,
},
listImageWrapper: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
},
listProductImage: {
    width: '100%',
    height: '100%',
},
listImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
},
  verdictContainer: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
  },
  listItemVerdict: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 12,
      textAlign: 'right',
  },
  listItemScoreContainer: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
  },
  listItemScoreText: {
      position: 'absolute',
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 16,
  },
  
  deleteActionContainer: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 100,
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
  },
  
  // --- Product Details Bottom Sheet ---
  sheetContent: {
      flex: 1,
      backgroundColor: COLORS.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderBottomWidth: 0,
      maxHeight: height * 0.85,
      overflow: 'hidden',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 20,
  },
  sheetPillarsContainer: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-around',
      padding: 15,
      backgroundColor: COLORS.background,
      borderRadius: 16,
      marginBottom: 15,
      marginHorizontal: 15,
  },
  sheetPillar: {
      alignItems: 'center',
      gap: 8,
      flex: 1,
  },
  sheetDividerVertical: {
      width: 1,
      backgroundColor: COLORS.border,
      marginHorizontal: 10,
  },
  sheetPillarLabel: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textSecondary,
  },
  sheetSection: {
      paddingHorizontal: 15,
      marginBottom: 15,
  },
  sheetSectionTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 16,
      color: COLORS.textPrimary,
      textAlign: 'right',
      marginBottom: 10,
  },
  alertBox: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
  },
  alertBoxText: {
      flex: 1,
      fontFamily: 'Tajawal-Regular',
      fontSize: 13,
      color: COLORS.textPrimary,
      textAlign: 'right',
      lineHeight: 18,
  },
  ingredientChip: {
      backgroundColor: COLORS.background,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginHorizontal: 5,
      marginBottom: 10,
  },
  ingredientChipText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 13,
      color: COLORS.textSecondary,
      textAlign: 'center',
  },
    
    // ========================================================================
    // --- 7. SECTION: ANALYSIS & INSIGHTS ---
    // ========================================================================
    focusInsightCard: {
        borderRadius: 24,
        padding: 25,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    focusInsightHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    focusInsightTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        color: COLORS.textPrimary,
    },
    focusInsightSummary: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'right',
        marginTop: 12,
        lineHeight: 22,
    },
    focusInsightAction: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 20,
    },
    focusInsightActionText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.accentGreen,
    },
    allClearContainer: {
        alignItems: 'center',
        padding: 30,
        marginBottom: 25,
    },
    allClearIconWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.2)',
    },
    allClearTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: COLORS.textPrimary,
    },
    allClearSummary: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 5,
        lineHeight: 20,
    },
    carouselTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: COLORS.textPrimary,
        textAlign: 'right',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    carouselContentContainer: {
        paddingHorizontal: 5,
        paddingBottom: 25,
    },
    modernCardContainer: {
        width: 150,
        height: 150,
        borderRadius: 22, 
        padding: 14,
        justifyContent: 'space-between',
        borderWidth: 1, 
        backgroundColor: COLORS.card, 
        overflow: 'hidden',
    },
    modernCardHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modernIconBox: {
        width: 28,
        height: 28,
        borderRadius: 10, 
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        opacity: 0.6,
    },
    modernCardTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.textPrimary,
        textAlign: 'right',
        lineHeight: 18,
        marginTop: 8,
        marginBottom: 4,
    },
    modernCardFooter: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        opacity: 0.8,
    },
    readMoreText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
    },
    overviewContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        gap: 12,
    },
    overviewCard: {
        flex: 1,
    },
    analysisCardHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
        opacity: 0.8,
    },
    analysisCardTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    routineOverviewGrid: {
        gap: 12,
    },
    routineColumn: {
        gap: 8,
    },
    routineColumnTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.textPrimary,
        textAlign: 'right',
        marginBottom: 4,
    },
    routineProductPill: {
        backgroundColor: COLORS.background,
        color: COLORS.textSecondary,
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: 'hidden',
    },
    routineDivider: {
        height: 1,
        backgroundColor: COLORS.border,
    },
    sunProtectionContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 5,
        flex: 1,
        justifyContent: 'center',
    },
    sunProtectionNote: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: COLORS.textSecondary,
        textAlign: 'right',
        lineHeight: 16,
    },
  
    // ========================================================================
    // --- 8. SECTION: ROUTINE BUILDER ---
    // ========================================================================
    routineHeaderContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    routineSwitchContainer: {
        flex: 1,
        flexDirection: 'row-reverse',
        backgroundColor: COLORS.card,
        borderRadius: 14, // Slightly less rounded for a cleaner look
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    periodBtn: {
        flex: 1,
        flexDirection: 'row', // Aligns Text and Icon in one line
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8, // Space between icon and text
        paddingVertical: 10,
        borderRadius: 12,
    },
    periodBtnActive: {
        backgroundColor: COLORS.accentGreen,
    },
    periodText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textSecondary,
        paddingBottom: 2, // Tiny optical adjustment for font baseline
    },
    periodTextActive: {
        color: COLORS.textOnAccent,
    },
    autoBuildButton: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    //steps styles
    stepCardContainer: {
      backgroundColor: COLORS.card,
      borderRadius: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
      elevation: 2, 
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
  },
  stepHeaderRow: {
      flexDirection: 'row-reverse', 
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      paddingBottom: 0,
  },
  stepTitleGroup: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 12,
  },
  stepNumberBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
  },
  stepNumberText: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 16,
      color: '#fff',
  },
  stepName: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 16,
      color: COLORS.textPrimary,
      textAlign: 'right',
  },
  stepSubText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 11,
      color: COLORS.textSecondary,
      textAlign: 'right',
  },
  deleteIconButton: {
      padding: 8,
      opacity: 0.7,
  },
  stepBody: {
      padding: 12,
      paddingTop: 10,
  },
  stepProductsScroll: {
      flexDirection: 'row-reverse',
      gap: 8,
      paddingRight: 4, 
  },
  stepProductChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', // Lighter, cleaner glass background
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', // Very subtle border
    minWidth: 100, // Ensures small names don't look crushed
    maxWidth: 160,
},
chipIconBox: {
    width: 28, // Slightly larger
    height: 28,
    borderRadius: 10, // Softer corners
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10, // More breathing room
    // Background color is handled dynamically in JSX
},
stepProductText: {
    fontFamily: 'Tajawal-Regular', // Bold for better readability
    fontSize: 11,
    color: COLORS.textPrimary, // Brighter white
    flexShrink: 1,
    textAlign: 'right',
    lineHeight: 18,
},
  stepEmptyState: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderStyle: 'dashed',
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.1)',
  },
  stepEmptyLabel: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textDim,
  },
  editIndicator: {
      position: 'absolute',
      bottom: 6,
      left: 12, 
      opacity: 0.5
  },
  stepProductChip: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      backgroundColor: COLORS.background,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      maxWidth: 160,
  },
    
    // ========================================================================
    // --- 9. SECTION: INGREDIENTS ---
    // ========================================================================
    
    searchBar: {
      flexDirection: 'row-reverse',
      backgroundColor: COLORS.card,
      borderRadius: 14,
      paddingHorizontal: 15,
      height: 44,
      alignItems: 'center',
      marginBottom: 15,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    searchInput: {
      flex: 1,
      fontFamily: 'Tajawal-Regular',
      color: COLORS.textPrimary,
      marginRight: 10,
      fontSize: 14,
      textAlign: 'right',
      paddingVertical: 10,
    },
  
    // --- LIST CARD STYLES ---
    ingCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    ingCardContent: {
        flexDirection: 'row-reverse', 
        alignItems: 'center',
        padding: 12,
        gap: 12,
        width: '100%',
    },
    ingCountBadge: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    ingCountText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
    },
    ingInfoContainer: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    ingNameText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: COLORS.textPrimary,
        textAlign: 'right',
    },
    ingSciText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: COLORS.textDim,
        textAlign: 'right',
        fontStyle: 'italic',
        marginTop: -2,
    },
    ingTagsRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    ingCategoryTag: {
        backgroundColor: 'rgba(90, 156, 132, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(90, 156, 132, 0.2)',
    },
    ingTagLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
        color: COLORS.accentGreen,
    },
  
    // --- MODAL STYLES ---
    ingModalHeader: {
      backgroundColor: COLORS.card,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    ingModalTitle: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 22,
      color: COLORS.textPrimary,
      textAlign: 'right',
      marginBottom: 4,
    },
    ingModalScientific: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 13,
      color: COLORS.textSecondary,
      textAlign: 'right',
      fontStyle: 'italic',
      marginBottom: 12,
    },
    ingTypeBadge: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      alignSelf: 'flex-start',
    },
    ingTypeText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 12,
    },
    ingBadgesRow: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 15,
    },
    ingBadge: {
      backgroundColor: COLORS.background,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    ingBadgeText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 11,
      color: COLORS.textSecondary,
    },
  
    ingSection: {
      marginBottom: 30,
    },
    ingSectionTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 16,
      color: COLORS.textPrimary,
      textAlign: 'right',
      marginBottom: 15,
      borderRightWidth: 3,
      borderRightColor: COLORS.accentGreen,
      paddingRight: 10,
    },
  
    // Benefits
    benefitRow: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      marginBottom: 12,
    },
    benefitLabel: {
      flex: 1.2,
      textAlign: 'right',
      fontFamily: 'Tajawal-Regular',
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    benefitBarContainer: {
      flex: 2,
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 3,
      marginHorizontal: 12,
      flexDirection: 'row-reverse', 
    },
    benefitBarFill: {
      height: '100%',
      backgroundColor: COLORS.accentGreen,
      borderRadius: 3,
    },
    benefitScore: {
      width: 30,
      textAlign: 'left',
      fontFamily: 'Tajawal-Bold',
      fontSize: 12,
      color: COLORS.textPrimary,
    },
  
    // Warnings
    warningBox: {
      flexDirection: 'row-reverse',
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      gap: 12,
      alignItems: 'flex-start',
    },
    warningBoxRisk: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    warningBoxCaution: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    warningText: {
      flex: 1,
      textAlign: 'right',
      fontFamily: 'Tajawal-Regular',
      fontSize: 13,
      lineHeight: 20,
    },
  
    interactionHeader: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 13,
      color: COLORS.textPrimary,
      marginBottom: 10,
      textAlign: 'right',
    },
    synergyItem: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.success,
      marginBottom: 6,
      textAlign: 'right',
      paddingRight: 5,
    },
    conflictItem: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.danger,
      marginBottom: 6,
      textAlign: 'right',
      paddingRight: 5,
    },
    noDataText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textDim,
      fontStyle: 'italic',
      textAlign: 'right',
      opacity: 0.7,
    },
    
    productChip: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      backgroundColor: COLORS.background,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    productChipText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 13,
      color: COLORS.textSecondary,
      flex: 1,
      textAlign: 'right',
    },
    loadMoreButton: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: COLORS.card,
      paddingVertical: 12,
      marginVertical: 20,
      marginHorizontal: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.accentGreen,
      marginBottom: 120 
  },
  loadMoreText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 14,
      color: COLORS.textPrimary,
  },
  
    // ========================================================================
    // --- 10. SECTION: MIGRATION ---
    // ========================================================================
    migName: {
        fontFamily: 'Tajawal-Bold',
        color: COLORS.textPrimary,
        fontSize: 16,
        textAlign: 'right',
        flex: 1,
    },
    badBadge: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 6,
        marginBottom: 4,
    },
    criticalBadge: {
        backgroundColor: COLORS.danger,
    },
    badText: {
        color: COLORS.danger,
        fontSize: 9,
        fontFamily: 'Tajawal-Bold'
    },
    migReason: {
        fontFamily: 'Tajawal-Regular',
        color: COLORS.textSecondary,
        fontSize: 12,
        textAlign: 'right',
        marginTop: 8
    },
    migSuggestion: {
        fontFamily: 'Tajawal-Regular',
        color: COLORS.accentGreen,
        textAlign: 'right',
        fontSize: 13,
        marginTop: 8,
        backgroundColor: 'rgba(90, 156, 132, 0.1)',
        padding: 10,
        borderRadius: 10
    },
    migrationTip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        padding: 8,
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderRadius: 8,
    },
    migrationTipText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: COLORS.gold,
        flex: 1,
    },
    
    // ========================================================================
    // --- 11. SECTION: SETTINGS & ACCORDION ---
    // ========================================================================
    accordionHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
        backgroundColor: 'transparent',
    },
    accordionTitle: {
        fontFamily: 'Tajawal-Bold',
        color: COLORS.textPrimary,
        fontSize: 16,
    },
    accordionBody: {
        padding: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    settingGroup: {
        marginVertical: 10,
    },
    groupLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'right',
        marginBottom: 12,
    },
    chipsRow: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    chipActive: {
        backgroundColor: COLORS.accentGreen,
        borderColor: COLORS.accentGreen,
    },
    chipText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    logoutBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.5)',
        gap: 10
    },
    logoutText: {
        fontFamily: 'Tajawal-Bold',
        color: COLORS.danger,
        fontSize: 16
    },
  
    // ========================================================================
    // --- 12. COMPONENT: ONBOARDING GUIDE ---
    // ========================================================================
    guideOverlay: {
        flex: 1,
        zIndex: 9999,
    },
    guideCardWrapper: {
        position: 'absolute',
        bottom: height * 0.12, // Positions the card comfortably above the navigation dock
        width: '100%',
        alignItems: 'center',
        zIndex: 100,
        paddingHorizontal: 20,
    },
    guideCard: {
        width: '100%',
        backgroundColor: COLORS.card, // Matching your forest green card color
        borderRadius: 28,
        padding: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        // Premium Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
    },
    guideHeader: {
        flexDirection: 'row-reverse', // RTL Alignment
        alignItems: 'center',
        marginBottom: 15,
        gap: 12,
    },
    guideIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(251, 191, 36, 0.12)', // Subtle gold tint
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)',
    },
    guideTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 19,
        color: COLORS.textPrimary,
        textAlign: 'right',
    },
    guideText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'right',
        lineHeight: 24,
        marginBottom: 25,
    },
    guideFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    guideNextBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        backgroundColor: COLORS.accentGreen,
        paddingVertical: 12,
        paddingHorizontal: 26,
        borderRadius: 16,
        // Button Shadow
        shadowColor: COLORS.accentGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    guideNextText: {
        fontFamily: 'Tajawal-Bold',
        color: COLORS.textOnAccent, // Dark green text on mint button
        fontSize: 15,
    },
    guideSkip: {
        fontFamily: 'Tajawal-Bold',
        color: COLORS.textDim,
        fontSize: 14,
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    // ========================================================================
    // --- 13. UNIFIED BOTTOM SHEET & MODAL STYLES ---
    // ========================================================================
    
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 99,
    },
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.85, // Occupies 85% of the screen
        zIndex: 100,
        justifyContent: 'flex-end',
    },
    sheetContent: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 25,
    },
    sheetHandleBar: {
        alignItems: 'center',
        paddingVertical: 15,
        width: '100%',
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.02)',
    },
    sheetHandle: {
        width: 48,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
    },
    sheetProductTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 22,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 20,
    },
    sheetSection: {
        marginBottom: 20,
    },
    sheetSectionTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'right', // RTL
        marginBottom: 10,
        paddingRight: 5,
    },
  
    // --- Alert Box (Dynamic Colored Cards) ---
    alertBox: {
        flexDirection: 'row-reverse', // RTL
        alignItems: 'center',
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    alertBoxText: {
        flex: 1,
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        textAlign: 'right', // RTL
        lineHeight: 20,
    },
  
    // --- Pillars (Safety & Efficacy) ---
    sheetPillarsContainer: {
        flexDirection: 'row-reverse', // RTL
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    sheetPillar: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
    },
    sheetDividerVertical: {
        width: 1,
        height: '80%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignSelf: 'center',
    },
    sheetPillarLabel: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    sheetPillarValue: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 24,
        color: COLORS.textPrimary,
    },
  
    // --- Ingredient Chips ---
    ingredientChip: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    ingredientChipText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textPrimary,
    },
  
    // --- Close Button ---
    closeButton: {
        backgroundColor: COLORS.card,
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        marginBottom: 20, // Bottom margin for safety
    },
    closeButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    promptButtonRow: {
        flexDirection: 'row-reverse',
        gap: 10,
        marginHorizontal: 20,
    },
    promptButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    promptButtonPrimary: {
        backgroundColor: COLORS.accentGreen,
    },
    promptButtonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    promptButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
    },
    promptButtonTextPrimary: {
        color: COLORS.textOnAccent,
        fontFamily: 'Tajawal-Bold',

    },
    promptButtonTextSecondary: {
        color: COLORS.textSecondary,
        fontFamily: 'Tajawal-Bold',
    },
  
    // --- Specific Modals: Step Editor & Add Product ---
    stepModalHeader: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
  },
    stepModalTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: COLORS.textPrimary,
    },
    addProductButton: {
        flexDirection: 'row-reverse',
        gap: 6,
        backgroundColor: COLORS.accentGreen,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
    },
    addProductButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.textOnAccent,
    },
    stepModalEmpty: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 10,
    },
    stepModalEmptyText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: COLORS.textDim,
    },
    reorderItem: {
        flexDirection: 'row-reverse', // Ensure items flow Right-to-Left
        alignItems: 'center',
        justifyContent: 'space-between', // Push delete button to the far left
        backgroundColor: COLORS.background, // Darker background to pop against the card
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    
    reorderItemText: {
        flex: 1, // Takes up all available space between icon and delete button
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textPrimary,
        textAlign: 'right', // Align text to the right
        marginHorizontal: 10, // Space between text and icon/button
    },

    saveStepButton: {
        backgroundColor: COLORS.accentGreen,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        margin: 20,
    },
    saveStepButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: COLORS.textOnAccent,
    },
    modalContent: {
        width: '90%',
        maxHeight: height * 0.6,
    },
    modalItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalItemName: {
        fontFamily: 'Tajawal-Regular',
        color: COLORS.textPrimary,
        fontSize: 14,
    },
  barrierTrack: {
      height: 8,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 4,
      width: '100%',
      marginBottom: 10,
      overflow: 'hidden',
  },
  barrierFill: {
      height: '100%',
      borderRadius: 4,
  },
  barrierDesc: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textSecondary,
      textAlign: 'right',
      lineHeight: 18,
  },
  barrierScoreBadge: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
  },
  educationBox: {
      backgroundColor: COLORS.background,
      padding: 15,
      borderRadius: 16,
      marginBottom: 25,
      borderWidth: 1,
      borderColor: COLORS.border,
  },
  educationTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 14,
      color: COLORS.textPrimary,
  },
  educationText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 13,
      color: COLORS.textSecondary,
      lineHeight: 22,
      textAlign: 'right',
  },
  balanceBarTrack: {
      height: 12,
      flexDirection: 'row', 
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 10,
      width: '100%',
      marginBottom: 5,
  },
  balanceBarSegment: {
      height: '100%',
  },
  colHeader: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 13,
      textAlign: 'right',
      marginBottom: 10,
  },
  miniProductRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  miniProductText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textSecondary,
      flex: 1,
      textAlign: 'right',
      marginLeft: 10,
  },
  miniProductScore: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 12,
  },
  miniProductIngs: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 10,
      color: COLORS.textDim,
      textAlign: 'right',
      marginTop: 2,
      marginLeft: 10
  },

// --- CUSTOM ALERT MODAL STYLES ---
customAlertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
},
customAlertBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
},
customAlertContainer: {
    width: '85%',
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
},
customAlertIconContainer: {
    marginBottom: 15,
    marginTop: -45, 
    shadowColor: COLORS.accentGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
},
customAlertIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: COLORS.card,
},
customAlertTitle: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 20,
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 5,
},
customAlertBody: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
    paddingHorizontal: 10,
},

// Steps
customAlertSteps: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 25,
    paddingRight: 10,
},
stepItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
},
stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
},

stepText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    color: COLORS.textPrimary,
},
boldText: {
    fontFamily: 'Tajawal-Bold',
    color: COLORS.textPrimary,
},
stepConnector: {
    height: 12,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 11.5,
    marginVertical: 4,
},

// Buttons
customAlertActions: {
    flexDirection: 'row-reverse',
    gap: 12,
    width: '100%',
},
customAlertBtnPrimary: {
    flex: 1,
    backgroundColor: COLORS.accentGreen,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accentGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
},
btnContentWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
},
customAlertBtnSecondary: {
    flex: 0.6,
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
},
customAlertBtnTextPrimary: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 15,
    color: COLORS.textOnAccent,
    textAlign: 'center',
},
customAlertBtnTextSecondary: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
},
weatherWidgetCard: {
    flexDirection: 'row-reverse', 
    alignItems: 'center',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
},
weatherIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 15, 
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
},
weatherWidgetTitle: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 16,
    color: '#fff',
    textAlign: 'right',
    marginBottom: 6,
},
weatherWidgetSub: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'right',
},
weatherPillsRow: {
    flexDirection: 'row-reverse', 
    gap: 8,
},
weatherPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
},
weatherPillText: {
    color: '#fff',
    fontFamily: 'Tajawal-Bold',
    fontSize: 13,
},
weatherActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginRight: 5,
    gap: 4
},
weatherActionText: {
    color: '#fff',
    fontFamily: 'Tajawal-Bold',
    fontSize: 10,
},

// weather caard styles
weatherCardContainer: {
    width: 150, 
    height: 150, 
    borderRadius: 22, 
    padding: 14, 
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
},
weatherCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
},
weatherIconCircle: {
    width: 28, 
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)', 
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
},
liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    opacity: 0.8,
},
weatherCardTitle: {
    fontFamily: 'Tajawal-ExtraBold', 
    fontSize: 15,
    color: '#fff',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
},
weatherCardFooter: {
    flexDirection: 'row-reverse', 
},
glassPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)', 
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'flex-start', 
},
glassPillText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 11,
    color: '#fff',
},
glassSeparator: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 6,
},
// ========================================================================
  // --- MISSING STYLES (ROUTINE, GENERIC MODALS, INSIGHTS) ---
  // ========================================================================

  // --- Routine Section Empty State ---
  routineEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    marginTop: 20,
    opacity: 0.8,
  },
  routineEmptyTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
    marginTop: 15,
    marginBottom: 5,
  },
  routineEmptySub: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: '70%',
    lineHeight: 20,
  },

  // --- Generic Modal Styles (Used in AddStep, InsightDetails, etc.) ---
  modalTitle: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 15,
  },
  modalDescription: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right', // RTL
    lineHeight: 24,
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },

  // --- Insight Details Specifics ---
  relatedProductsTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 10,
    marginTop: 10,
  },
// --- Enhanced Input Styles ---
inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    position: 'relative',
},
enhancedInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 15,
    paddingRight: 45, // Space for icon
    color: COLORS.textPrimary,
    fontSize: 16,
    textAlign: 'right', // RTL
},
inputIcon: {
    position: 'absolute',
    right: 15,
    zIndex: 1,
},

// --- Enhanced Step Modal Specifics ---
reorderItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.background, // Darker bg for items
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
},
stepModalEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    opacity: 0.6,
    gap: 10,
},
saveStepButton: {
    flexDirection: 'row-reverse',
    gap: 10,
    backgroundColor: COLORS.accentGreen,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: COLORS.accentGreen,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
},

// --- New Selection Floating Card ---
centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Darker backdrop
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
},
selectionCard: {
    width: '85%',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
},
selectionHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
},
selectionTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
},
closeIconBtn: {
    padding: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
},
modalSearchBar: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
},
modalSearchInput: {
    flex: 1,
    fontFamily: 'Tajawal-Regular',
    color: COLORS.textPrimary,
    fontSize: 13,
    textAlign: 'right',
    paddingRight: 8,
},
selectionItem: {
    width: '100%',
    flexDirection: 'row-reverse', // <--- CRITICAL: Forces elements side-by-side
    alignItems: 'center',         // Vertically centers them
    justifyContent: 'space-between', 
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)', // Very subtle highlight
    borderRadius: 12,
    marginBottom: 8, // Spacing between rows
},
selectionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(90, 156, 132, 0.15)', // Green tint
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(90, 156, 132, 0.3)',
},

selectionItemText: {
    flex: 1, // Takes all available space
    fontFamily: 'Tajawal-Bold',
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'right', // Aligns text to the icon
    marginHorizontal: 15, // Gap between icon and text
},

// 3. The Plus Button (Left)
selectionActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
},
selectionCardWrapper: {
    backgroundColor: 'rgba(255,255,255,0.02)', // Subtle dark background
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden', // Keeps the inner view inside corners
},

// 2. The Inner Layout (Forces items side-by-side)
selectionRow: {
    flexDirection: 'row-reverse', // <--- THIS FIXES THE STACKING
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    width: '100%',
},
productImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 15,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    position: 'relative'
},
productRealImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
},
scoreBadgeFloat: {
    position: 'absolute',
    bottom: -10,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.card
},
scoreBadgeText: {
    fontFamily: 'Tajawal-ExtraBold',
    color: '#1A2D27', // Dark text on the colored badge
    fontSize: 14
},
emptyStateCard: {
    alignItems: 'center',
    padding: 30,
    paddingVertical: 40,
    marginTop: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(90, 156, 132, 0.2)',
    overflow: 'hidden', // Ensures inner gradient respects radius
},
emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(90, 156, 132, 0.3)',
    overflow: 'hidden',
    shadowColor: COLORS.accentGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
},
emptyStateTitle: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 20,
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
},
emptyStateSub: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
    paddingHorizontal: 10,
},
emptyStateHint: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.1)', // Gold tint
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
},
emptyStateHintText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12,
    color: COLORS.gold,
},
  });