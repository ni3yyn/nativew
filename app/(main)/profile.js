import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, Pressable,
  Dimensions, ScrollView, Animated, ImageBackground, Modal, FlatList,
  Platform, UIManager, Alert, StatusBar, ActivityIndicator, LayoutAnimation,
  RefreshControl, Keyboard, Easing, I18nManager, AppState
} from 'react-native';
import * as Linking from 'expo-linking';
import { TouchableWithoutFeedback } from 'react-native'; 
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PanResponder } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { doc, updateDoc, Timestamp, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useAppContext } from '../../src/context/AppContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Path } from 'react-native-svg';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { generateFingerprint } from '../../src/utils/cacheHelpers';
import { 
    commonAllergies, 
    commonConditions,
    basicSkinTypes,
    basicScalpTypes
  } from '../../src/data/allergiesandconditions';

// --- 1. SYSTEM CONFIG ---
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PROFILE_API_URL = "https://oilguard-backend.vercel.app/api";

const { width, height } = Dimensions.get('window');

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


// --- 3. DATA CONSTANTS ---
const PRODUCT_TYPES = {
  shampoo: { label: 'شامبو', icon: 'spa', color: '#a7f3d0' },
  serum: { label: 'سيروم', icon: 'atom', color: '#fde68a' },
  oil_blend: { label: 'زيت', icon: 'leaf', color: '#bef264' },
  lotion_cream: { label: 'مرطب', icon: 'hand-holding-water', color: '#93c5fd' },
  sunscreen: { label: 'واقي', icon: 'sun', color: '#fdba74' },
  cleanser: { label: 'غسول', icon: 'hands-wash', color: '#67e8f9' },
  treatment: { label: 'علاج', icon: 'capsules', color: '#fca5a5' },
  mask: { label: 'قناع', icon: 'mask', color: '#d8b4fe' },
  toner: { label: 'تونر', icon: 'spray-can', color: '#86efac' },
  other: { label: 'آخر', icon: 'shopping-bag', color: '#cbd5e1' },
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
    { id: 'brightening', label: 'تفتيح البشرة', icon: 'sun' },
    { id: 'acne', label: 'مكافحة حب الشباب', icon: 'shield-alt' },
    { id: 'anti_aging', label: 'مكافحة الشيخوخة', icon: 'hourglass-half' },
    { id: 'hydration', label: 'ترطيب البشرة', icon: 'blurType' },
    { id: 'hair_growth', label: 'تكثيف الشعر', icon: 'seedling' }
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
    <BlurView  intensity={20} tint="dark" style={{ position: 'absolute', zIndex: 0 }} >
      <Animated.View style={{ 
        width: size, 
        height: size, 
        borderRadius: size/2, 
        backgroundColor: COLORS.primaryGlow,
        transform: [{ translateY }, { translateX }, { scale }], 
        opacity,
      }} />
    </BlurView>
  );
};

// 2. TACTILE PRESSABLE (Haptics + Shrink)
const PressableScale = ({ onPress, children, style, disabled, onLongPress, delay = 0 }) => {
    const scale = useRef(new Animated.Value(0)).current; 
    const pressScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Entrance: Smooth, no bounce
        Animated.timing(scale, { 
            toValue: 1, 
            duration: 400, 
            delay: delay, 
            easing: Easing.out(Easing.cubic), // Smooth deceleration
            useNativeDriver: true 
        }).start();
    }, []);

    const pressIn = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Tight spring: Fast response, no wobble
        Animated.spring(pressScale, { 
            toValue: 0.97, // Subtle shrink (0.96 was a bit deep)
            useNativeDriver: true, 
            speed: 20, 
            bounciness: 0 // <--- CRITICAL: No bounce
        }).start();
    };
    
    const pressOut = () => {
        // Smooth return
        Animated.spring(pressScale, { 
            toValue: 1, 
            useNativeDriver: true, 
            speed: 20, 
            bounciness: 0 
        }).start();
    };

    return (
        <Pressable 
            onPress={() => { 
              Haptics.selectionAsync(); 
              if (onPress) onPress(); 
            }}
            onLongPress={() => { 
              if (onLongPress) { 
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); 
                onLongPress(); 
              } 
            }}
            onPressIn={pressIn} 
            onPressOut={pressOut} 
            disabled={disabled} 
            style={style}
        >
            <Animated.View style={[{ transform: [{ scale: Animated.multiply(scale, pressScale) }] }, style?.flex && {flex: style.flex}]}>
                {children}
            </Animated.View>
        </Pressable>
    );
};

// RENAMED & REFACTORED ContentCard (formerly ContentCard)
const ContentCard = ({ children, style, onPress, disabled = false, delay = 0 }) => {
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 12, tension: 40, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, delay, useNativeDriver: true })
    ]).start();
  }, []);

  const handlePressIn = () => !disabled && Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
  const handlePressOut = () => !disabled && Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }).start();

  // The content is now a standard View with solid card styles
  const content = (
    <View style={[styles.cardBase, style]}>
      <Animated.View style={{ opacity }}>
        {children}
      </Animated.View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={() => { Haptics.selectionAsync(); onPress(); }} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}>
        <Animated.View style={{ transform: [{ scale }] }}>{content}</Animated.View>
      </Pressable>
    );
  }

  return <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>{content}</Animated.View>;
};

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

// 5. STAGGERED LIST ITEM
const StaggeredItem = ({ index, children, style }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, { 
          toValue: 1, 
          duration: 300, 
          delay: index * 25, 
          easing: Easing.out(Easing.cubic), 
          useNativeDriver: true 
        }).start();
    }, []);

    const translateY = anim.interpolate({ 
        inputRange: [0, 1], 
        outputRange: [15, 0]
    });

    const opacity = anim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.8, 1]
    });

    // Added width: '100%' to prevent squeezing
    return (
        <Animated.View style={[{ opacity, transform: [{ translateY }], width: '100%' }, style]}>
            {children}
        </Animated.View>
    );
};

// 6. NATIVE CHART RING with enhanced animations
const ChartRing = ({ percentage, radius = 45, strokeWidth = 8, color = COLORS.primary }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const circumference = 2 * Math.PI * radius;
    const [displayPercentage, setDisplayPercentage] = useState(0);
    const rotation = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
            ])
        ).start();
    }, []);

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

const SwipeHint = () => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, delay: 500, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, delay: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10], // Moves 10px to the left
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1, 0.7],
  });

  return (
    <Animated.View style={[styles.swipeHint, { opacity, transform: [{ translateX }] }]}>
      <Feather name="chevrons-right" size={24} color={COLORS.textSecondary} />
    </Animated.View>
  );
};

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

  const getVerdictStyle = (verdict) => {
    if (!verdict) return { icon: 'question-circle', color: COLORS.textSecondary };
    const v = verdict.toLowerCase();
    if (v.includes('elite') || v.includes('مثالية')) return { icon: 'gem', color: '#3b82f6' };
    if (v.includes('ممتاز')) return { icon: 'star', color: COLORS.success };
    if (v.includes('جيد')) return { icon: 'check-circle', color: COLORS.success };
    if (v.includes('خطير') || v.includes('حساسية')) return { icon: 'times-circle', color: COLORS.danger };
    if (v.includes('غير آمن')) return { icon: 'exclamation-triangle', color: COLORS.danger };
    return { icon: 'balance-scale-right', color: COLORS.warning };
  };
  
  const verdictStyle = getVerdictStyle(product.analysisData.finalVerdict);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5 && Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -width * 0.25) {
          Animated.timing(translateX, { toValue: -width, duration: 250, useNativeDriver: true }).start(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDelete();
          });
        } else {
          Animated.spring(translateX, { toValue: 0, friction: 5, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const score = product.analysisData.oilGuardScore || 0;
  const scoreColor = score >= 80 ? COLORS.success : score >= 65 ? COLORS.warning : COLORS.danger;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
      Animated.timing(animatedProgress, {
          toValue: score, // The target score (e.g., 85)
          duration: 1400, // Even slower than the bar
          delay: 200,     // Wait for the card to slide in first
          easing: Easing.out(Easing.exp),
          useNativeDriver: true // We will animate opacity or rotation, but for SVG dashoffset we need a trick or just keep it simple.
      }).start();
  }, [score]);
  
  // NOTE: Animating SVG strokeDashoffset directly in Native requires Reanimated or setNativeProps. 
  // A simpler "Cosmetic" hack for standard Animated API:
  // Fade the ring in slowly while it rotates slightly.
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
     Animated.parallel([
         Animated.timing(fadeAnim, { toValue: 1, duration: 1000, delay: 300, useNativeDriver: true }),
         Animated.timing(rotateAnim, { 
             toValue: 1, 
             duration: 1200, 
             easing: Easing.out(Easing.cubic), 
             useNativeDriver: true 
         })
     ]).start();
  }, []);
  
  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] }); // Subtle twist into place
  
  return (
    <View style={styles.productListItemWrapper}>
      <View style={styles.deleteActionContainer}>
        <FontAwesome5 name="trash-alt" size={22} color={COLORS.danger} />
      </View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        <Pressable style={styles.productListItem} onPress={onPress}>
          <View style={styles.listItemContent}>
            <Text style={styles.listItemName} numberOfLines={2}>{product.productName}</Text>
            <Text style={styles.listItemType}>{PRODUCT_TYPES[product.analysisData?.product_type]?.label || 'منتج'}</Text>
            <View style={styles.verdictContainer}>
              <FontAwesome5 name={verdictStyle.icon} solid color={verdictStyle.color} size={12} />
              <Text style={[styles.listItemVerdict, {color: verdictStyle.color}]}>{product.analysisData.finalVerdict}</Text>
            </View>
          </View>
          <View style={styles.listItemScoreContainer}>
              <AnimatedScoreRing 
                  score={score} 
                  color={scoreColor} 
                  radius={28} 
              />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}, (prevProps, nextProps) => {
    // Custom Comparator: Only re-render if the Product Data changes.
    // This ignores changes to onPress/onDelete function references, 
    // preventing re-renders when parent state updates unrelated things.
    return (
        prevProps.product.id === nextProps.product.id &&
        prevProps.product.analysisData?.finalVerdict === nextProps.product.analysisData?.finalVerdict &&
        prevProps.product.analysisData?.oilGuardScore === nextProps.product.analysisData?.oilGuardScore
    );
});


// 3. The new sophisticated Bottom Sheet for product details (SCROLLING & LAYOUT FIXED)
const ProductDetailsSheet = ({ product, isVisible, onClose }) => {
    // 1. Animation Controller (0 = closed, 1 = open)
    const animController = useRef(new Animated.Value(0)).current;

    // 2. Handle Opening
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

    // 3. Handle Closing
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

    // 4. Gestures
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    // Dragging down reduces value from 1
                    animController.setValue(1 - (gestureState.dy / height));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > height * 0.2 || gestureState.vy > 0.8) {
                    handleClose();
                } else {
                    Animated.spring(animController, { toValue: 1, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    if (!product) return null;

    // 5. Interpolations
    const translateY = animController.interpolate({
        inputRange: [0, 1],
        outputRange: [height, 0],
    });
    
    const backdropOpacity = animController.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.6],
    });

    const { safety, efficacy, user_specific_alerts = [] } = product.analysisData || { safety: {}, efficacy: {} };

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
                        
                        {/* A. WEATHER DASHBOARD */}
                       {insight.customData?.type === 'weather_dashboard' ? (
    <WeatherDetailedSheet insight={insight} />
) :
                        
                        /* B. GOAL DASHBOARD */
                        insight.type === 'goal_analysis' && insight.customData ? (
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
                                                <FontAwesome5 name="bottle-droplet" size={12} color={COLORS.textSecondary} />
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
          <ContentCard style={styles.emptyState}>
            <MaterialCommunityIcons name="bottle-tonic-outline" size={60} color={COLORS.textDim} style={{ opacity:0.5, marginBottom:15 }} />
            <Text style={styles.emptyText}>رفك فارغ تماماً</Text>
            <Text style={styles.emptySub}>امسح الباركود أو صوّر المكونات لبدء رحلتك نحو العناية الطبيعية.</Text>
            <PressableScale style={styles.emptyStateButton} onPress={() => router.push('/oilguard')}>
                <FontAwesome5 name="magic" size={16} color={COLORS.textOnAccent} />
                <Text style={styles.emptyStateButtonText}>أضف أول منتج</Text>
            </PressableScale>
          </ContentCard>
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

const LiquidProgressBar = ({ score, max = 10, color }) => {
    // 1. Start at width 0
    const widthAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Calculate percentage (0 to 100)
        const percentage = Math.min((score / max) * 100, 100);

        // 2. Animate: "Viscous Fluid" Physics
        Animated.timing(widthAnim, {
            toValue: percentage,
            duration: 1200, // Slow (1.2s) to feel like thick oil/serum
            easing: Easing.out(Easing.cubic), // Starts fast, settles very gently
            useNativeDriver: false // Width cannot use native driver
        }).start();
    }, [score]);

    // Interpolate width to string %
    const widthInterpolated = widthAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%']
    });

    return (
        <View style={styles.barrierTrack}>
            <Animated.View style={[
                styles.barrierFill, 
                { 
                    width: widthInterpolated, 
                    backgroundColor: color,
                    // Optional: Add a subtle shadow to make the "liquid" glow
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 6,
                    elevation: 3
                }
            ]} />
        </View>
    );
};

  const InsightCard = React.memo(({ insight, onSelect, onDismiss }) => {
    const isDismissible = insight.severity === 'good';
    const severityStyles = {
      critical: { icon: 'shield-alt', color: COLORS.danger, bg: 'rgba(239, 68, 68, 0.1)' },
      warning: { icon: 'exclamation-triangle', color: COLORS.warning, bg: 'rgba(245, 158, 11, 0.1)' },
      good: { icon: 'check-circle', color: COLORS.success, bg: 'rgba(34, 197, 94, 0.1)' },
    };
    const style = severityStyles[insight.severity] || severityStyles.warning;
    useEffect(() => {
        // Card appears
        Animated.timing(cardOpacity, { toValue: 1, duration: 400 }).start();
        
        // Text appears 100ms later
        Animated.timing(textOpacity, { toValue: 1, duration: 600, delay: 150 }).start();
    }, []);

    return (
      <StaggeredItem index={0}>
          <PressableScale onPress={() => onSelect(insight)} style={[styles.insightPill, { backgroundColor: style.bg }]}>
              <View style={styles.insightPillHeader}>
                  <FontAwesome5 name={style.icon} size={14} color={style.color} />
                  <Text style={[styles.insightPillTitle, { color: style.color }]}>{insight.title}</Text>
                  {isDismissible && (
                       <TouchableOpacity onPress={() => onDismiss(insight.id)} style={styles.dismissButton}>
                           <Feather name="x" size={16} color={COLORS.textSecondary} />
                       </TouchableOpacity>
                  )}
              </View>
              <Text style={styles.insightPillSummary}>{insight.short_summary}</Text>
          </PressableScale>
      </StaggeredItem>
    );
  });

// --- The Main Analysis Section ---
const FocusInsight = ({ insight, onSelect }) => {
  const severityStyles = {
      critical: { icon: 'shield-alt', colors: ['#581c1c', '#3f2129'] },
      warning: { icon: 'exclamation-triangle', colors: ['#5a3a1a', '#422c1b'] },
  };
  const style = severityStyles[insight.severity] || severityStyles.warning;

  return (
      <StaggeredItem index={0}>
          <PressableScale onPress={() => onSelect(insight)}>
              <LinearGradient colors={style.colors} style={styles.focusInsightCard}>
                  <View style={styles.focusInsightHeader}>
                      <FontAwesome5 name={style.icon} size={20} color={COLORS[insight.severity]} />
                      <Text style={styles.focusInsightTitle}>{insight.title}</Text>
                  </View>
                  <Text style={styles.focusInsightSummary}>{insight.short_summary}</Text>
                  <View style={styles.focusInsightAction}>
                      <Text style={styles.focusInsightActionText}>عرض التفاصيل والتوصية</Text>
                      <Feather name="chevron-left" size={16} color={COLORS.accentGreen} />
                  </View>
              </LinearGradient>
          </PressableScale>
      </StaggeredItem>
  );
};

// 2. The celebratory state when there are no issues
const AllClearState = () => (
  <StaggeredItem index={0}>
      <ContentCard style={styles.allClearContainer}>
          <View style={styles.allClearIconWrapper}>
               <FontAwesome5 name="leaf" size={28} color={COLORS.success} />
          </View>
          <Text style={styles.allClearTitle}>روتينك يبدو رائعاً!</Text>
          <Text style={styles.allClearSummary}>لم نعثر على أي مشاكل حرجة أو تعارضات. استمري في العناية ببشرتك.</Text>
      </ContentCard>
  </StaggeredItem>
);

// 3. The horizontal carousel for secondary insights
const InsightCarousel = ({ insights, onSelect }) => (
    <View>
        <Text style={styles.carouselTitle}>أبرز الملاحظات</Text>
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContentContainer}
            // specific RTL fix for Android horizontal scrolls if needed
            style={{ flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row' }} 
        >
            {insights.map((insight, index) => (
                <StaggeredItem 
                    index={index} 
                    key={insight.id}
                    // FIX: Override the default 100% width and add margin here
                    style={{ width: 'auto', paddingLeft: 12 }} 
                >
                    <PressableScale onPress={() => onSelect(insight)} style={styles.carouselItem}>
                         <View style={[styles.carouselIconWrapper, {backgroundColor: `${COLORS[insight.severity]}20`}]}>
                            <FontAwesome5 
                                name={insight.severity === 'good' ? 'check-circle' : 'info-circle'} 
                                size={16} 
                                color={COLORS[insight.severity]} 
                            />
                        </View>
                        <Text style={styles.carouselItemTitle} numberOfLines={2}>{insight.title}</Text>
                    </PressableScale>
                </StaggeredItem>
            ))}
        </ScrollView>
    </View>
  );

  // --- NEW COMPONENT: BARRIER HEALTH LEDGER ---
  const BarrierDetailsModal = ({ visible, onClose, data }) => {
    const animController = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) Animated.spring(animController, { toValue: 1, damping: 15, stiffness: 100, useNativeDriver: true }).start();
    }, [visible]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, useNativeDriver: true }).start(({ finished }) => { if (finished) onClose(); });
    };

    if (!visible || !data) return null;

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    const irritation = data.totalIrritation || 0;
    const soothing = data.totalSoothing || 0;
    const totalVolume = (irritation + soothing) || 1;
    const irritationPct = (irritation / totalVolume) * 100;
    const soothingPct = (soothing / totalVolume) * 100;

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle}/></View>

                    <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                        <View style={{ alignItems: 'center', marginBottom: 25 }}>
                            <View style={[styles.barrierScoreBadge, { backgroundColor: (data.color || COLORS.success) + '20', borderColor: data.color || COLORS.success }]}>
                                <FontAwesome5 name="shield-alt" size={24} color={data.color || COLORS.success} />
                            </View>
                            <Text style={[styles.modalTitle, { marginTop: 15 }]}>تقرير الحاجز الجلدي</Text>
                            <Text style={[styles.modalDescription, { textAlign: 'center', color: data.color, fontFamily: 'Tajawal-Bold' }]}>{data.status} ({data.score}%)</Text>
                        </View>

                        <View style={styles.educationBox}>
                            <View style={{flexDirection: 'row-reverse', gap: 10, marginBottom: 8}}>
                                <FontAwesome5 name="book-open" size={14} color={COLORS.textPrimary} />
                                <Text style={styles.educationTitle}>كيف يعمل الحاجز؟</Text>
                            </View>
                            <Text style={styles.educationText}>
                                تخيلي بشرتك كجدار من الطوب (الخلايا) والإسمنت (الدهون). 
                                {"\n"}• <Text style={{color: COLORS.danger, fontFamily: 'Tajawal-Bold'}}>المواد الفعالة</Text> تزيل طبقة من الجدار.
                                {"\n"}• <Text style={{color: COLORS.success, fontFamily: 'Tajawal-Bold'}}>المرممات</Text> تعيد بناء الإسمنت.
                            </Text>
                        </View>

                        <View style={styles.ingSection}>
                            <Text style={styles.ingSectionTitle}>ميزان الروتين اليومي</Text>
                            <View style={styles.balanceBarTrack}>
                                <View style={[styles.balanceBarSegment, { width: `${soothingPct}%`, backgroundColor: COLORS.success, borderTopRightRadius: 10, borderBottomRightRadius: 10 }]} />
                                <View style={[styles.balanceBarSegment, { width: `${irritationPct}%`, backgroundColor: COLORS.danger, borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }]} />
                            </View>
                            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8 }}>
                                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.success }}>{soothing.toFixed(1)} نقاط بناء 🛡️</Text>
                                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.danger }}>{irritation.toFixed(1)} نقاط إجهاد ⚡</Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row-reverse', gap: 15 }}>
                            {/* OFFENDERS */}
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.colHeader, { color: COLORS.danger }]}>المجهدات</Text>
                                {(data.offenders || []).length > 0 ? (
                                    data.offenders.map((p, i) => (
                                        <View key={i} style={styles.miniProductRow}>
                                            <View style={{flex: 1}}>
                                                <Text style={styles.miniProductText} numberOfLines={1}>{p.name}</Text>
                                                {/* INGREDIENTS SHOWN HERE */}
                                                <Text style={styles.miniProductIngs}>
                                                    {p.ingredients.join(' + ')}
                                                </Text>
                                            </View>
                                            <Text style={[styles.miniProductScore, { color: COLORS.danger }]}>-{p.score.toFixed(1)}</Text>
                                        </View>
                                    ))
                                ) : <Text style={styles.noDataText}>لا يوجد</Text>}
                            </View>

                            <View style={{ width: 1, backgroundColor: COLORS.border }} />

                            {/* DEFENDERS */}
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.colHeader, { color: COLORS.success }]}>البناة</Text>
                                {(data.defenders || []).length > 0 ? (
                                    data.defenders.map((p, i) => (
                                        <View key={i} style={styles.miniProductRow}>
                                            <View style={{flex: 1}}>
                                                <Text style={styles.miniProductText} numberOfLines={1}>{p.name}</Text>
                                                {/* INGREDIENTS SHOWN HERE */}
                                                <Text style={styles.miniProductIngs}>
                                                    {p.ingredients.join(' + ')}
                                                </Text>
                                            </View>
                                            <Text style={[styles.miniProductScore, { color: COLORS.success }]}>+{p.score.toFixed(1)}</Text>
                                        </View>
                                    ))
                                ) : <Text style={styles.noDataText}>لا يوجد</Text>}
                            </View>
                        </View>

                        <Pressable onPress={handleClose} style={[styles.closeButton, { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginTop: 30 }]}>
                            <Text style={[styles.closeButtonText, { color: COLORS.textPrimary }]}>فهمت</Text>
                        </Pressable>
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

// --- NEW: COMPACT WEATHER WIDGET (Main Screen) ---
const WeatherCompactWidget = ({ insight, onPress, onRetry }) => {
    
    // Theme Logic
    const getTheme = () => {
        const id = insight.id.toLowerCase();
        
        // 1. Permission Error
        if (insight.customData?.isPermissionError) {
            return { 
                colors: ['#4b5563', '#1f2937'], 
                icon: 'map-marker-alt', 
                actionText: 'تفعيل الموقع',
                isAction: 'permission'
            };
        }
        // 2. Service Error
        if (insight.customData?.isServiceError) {
            return { 
                colors: ['#d97706', '#92400e'], 
                icon: 'wifi', 
                actionText: 'إعادة المحاولة',
                isAction: 'retry'
            };
        }
        // 3. Good Weather
        if (insight.severity === 'good' || id.includes('normal')) {
            return { colors: ['#10b981', '#059669'], icon: 'smile-beam', actionText: 'التفاصيل' };
        }
        // 4. Bad Weather
        if (id.includes('uv') || id.includes('sun')) return { colors: ['#ef4444', '#b91c1c'], icon: 'sun', actionText: 'الحماية' };
        if (id.includes('dry') || id.includes('wind')) return { colors: ['#3b82f6', '#1d4ed8'], icon: 'wind', actionText: 'الترطيب' };
        if (id.includes('pollution')) return { colors: ['#6b7280', '#374151'], icon: 'smog', actionText: 'التنظيف' };
        
        return { colors: [COLORS.accentGreen, '#4a8a73'], icon: 'cloud-sun', actionText: 'عرض' };
    };

    const theme = getTheme();

    const handlePress = async () => {
        Haptics.selectionAsync();
        
        if (theme.isAction === 'permission') {
            // --- WEB SUPPORT ---
            if (Platform.OS === 'web') {
                try {
                    // Try to ask again
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        if (onRetry) onRetry(true);
                    } else {
                        // Web Alert: Tell them to fix it in the browser
                        alert("تم حظر الموقع. يرجى الضغط على أيقونة القفل 🔒 في شريط العنوان والسماح بالوصول للموقع، ثم تحديث الصفحة.");
                    }
                } catch (e) {
                    console.log("Web Permission Error", e);
                }
                return; // Stop here for Web
            }

            // --- NATIVE MOBILE SUPPORT ---
            try {
                // 1. Try Native Popup
                const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
                
                if (status === 'granted') {
                    if (onRetry) onRetry(true); 
                } else {
                    // 2. Guide to Settings if blocked
                    if (!canAskAgain || status === 'denied') {
                        Alert.alert(
                            "الموقع مطلوب",
                            "لتحليل الطقس، يرجى تفعيل الموقع من الإعدادات:\n\n1. اضغط على 'الإعدادات'\n2. اختر 'الموقع'\n3. اختر 'أثناء استخدام التطبيق'",
                            [
                                { text: "إلغاء", style: "cancel" },
                                { 
                                    text: "الإعدادات", 
                                    onPress: () => Linking.openSettings() 
                                }
                            ]
                        );
                    }
                }
            } catch (e) {
                Linking.openSettings();
            }
        } 
        else if (theme.isAction === 'retry') {
            if (onRetry) onRetry(true);
        } 
        else {
            onPress(insight);
        }
    };

    return (
        <StaggeredItem index={0}>
            <PressableScale onPress={handlePress}>
                <LinearGradient 
                    colors={theme.colors} 
                    style={styles.focusInsightCard} 
                    start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                >
                    <View style={styles.focusInsightHeader}>
                        <FontAwesome5 name={theme.icon} size={22} color="#fff" />
                        <Text style={[styles.focusInsightTitle, { color: '#fff', marginLeft: 10 }]}>
                            {insight.title}
                        </Text>
                    </View>
                    
                    <Text style={[styles.focusInsightSummary, { color: 'rgba(255,255,255,0.95)' }]} numberOfLines={2}>
                        {insight.short_summary}
                    </Text>
                    
                    <View style={styles.focusInsightAction}>
                        <Text style={[styles.focusInsightActionText, { color: '#fff' }]}>
                            {theme.actionText}
                        </Text>
                        <Feather 
                            name={theme.isAction === 'permission' ? "map-pin" : theme.isAction === 'retry' ? "refresh-cw" : "chevron-left"} 
                            size={16} 
                            color="#fff" 
                        />
                    </View>
                </LinearGradient>
            </PressableScale>
        </StaggeredItem>
    );
};

// --- THE MAIN ANALYSIS HUB COMPONENT ---
const AnalysisSection = ({ loading, savedProducts = [], analysisResults, dismissedInsightIds, handleDismissPraise, locationPermission, onRetry }) => {
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [showBarrierDetails, setShowBarrierDetails] = useState(false);
  
    const handleSelectInsight = useCallback((insight) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedInsight(insight);
    }, []);
  
    // 1. Loading State
    if (loading || !analysisResults) {
        return <ActivityIndicator size="large" color={COLORS.accentGreen} style={{ marginTop: 50 }} />;
    }
  
    // 2. Empty State
    if (savedProducts.length === 0) {
        return (
            <ContentCard style={styles.emptyState}>
                <MaterialCommunityIcons name="brain" size={60} color={COLORS.textDim} style={{ opacity: 0.5, marginBottom: 15 }} />
                <Text style={styles.emptyText}>ابدئي التحليل</Text>
                <Text style={styles.emptySub}>أضيفي منتجات إلى رفّكِ أولا ليقوم المدرب الذكي بتحليل روتينكِ.</Text>
            </ContentCard>
        );
    }
    
    // --- LOGIC: PREPARE INSIGHTS LIST ---
    
    // A. Filter out dismissed insights from the raw server result
    let visibleInsights = analysisResults?.aiCoachInsights?.filter(insight => !dismissedInsightIds.includes(insight.id)) || [];

    // FIX: Check for BOTH types of weather data
    const hasServerWeather = visibleInsights.some(i => 
        i.customData?.type === 'weather_advice' || 
        i.customData?.type === 'weather_dashboard'
    );

    // B. Inject Weather Status Cards
    if (locationPermission !== 'granted') {
        const permissionInsight = {
            id: 'weather-permission-denied',
            title: 'خدمة الطقس متوقفة',
            short_summary: 'يرجى تفعيل الموقع.',
            details: 'نحتاج لمعرفة موقعك لجلب بيانات الحرارة وUV.',
            severity: 'warning',
            customData: { type: 'weather_advice', isPermissionError: true }
        };
        visibleInsights = [permissionInsight, ...visibleInsights];
    } 
    else if (!hasServerWeather) {
        const unavailableInsight = {
            id: 'weather-unavailable',
            title: 'بيانات الطقس غير متاحة',
            short_summary: 'تعذر الاتصال بالخادم.',
            details: 'تأكد من اتصالك بالإنترنت.',
            severity: 'warning',
            customData: { type: 'weather_advice', isServiceError: true }
        };
        visibleInsights = [unavailableInsight, ...visibleInsights];
    }

    // C. Determine Hero Card
    const focusInsight = visibleInsights.find(i => 
        i.customData?.type === 'weather_advice' ||
        i.customData?.type === 'weather_dashboard' ||
        i.severity === 'critical' || 
        i.severity === 'warning'
    ) || null;

    // D. Remaining cards go to carousel
    const carouselInsights = visibleInsights.filter(i => i.id !== focusInsight?.id);
    
    // E. Barrier Health Fallback
    const barrier = analysisResults.barrierHealth || { 
        score: 0, status: '...', color: COLORS.textSecondary, desc: '', 
        totalIrritation: 0, totalSoothing: 0, offenders: [], defenders: [] 
    };
  
    // --- RENDER ---
    return (
        <View style={{flex: 1}}>
            <View style={{ paddingBottom: 150 }}> 
                {/* 1. Hero Section */}
                {focusInsight ? (
                    // Conditional Rendering based on Type
                    focusInsight.customData?.type === 'weather_advice' ? (
                        <WeatherCompactWidget insight={focusInsight} onPress={handleSelectInsight} onRetry={onRetry} />
                    ) : (
                        <FocusInsight insight={focusInsight} onSelect={handleSelectInsight} />
                    )
                ) : (
                    <AllClearState />
                )}
  
                {/* 2. Insight Carousel */}
                {carouselInsights.length > 0 && <InsightCarousel insights={carouselInsights} onSelect={handleSelectInsight} />}
  
                {/* 3. BARRIER HEALTH CARD */}
                <PressableScale onPress={() => setShowBarrierDetails(true)}>
                    <ContentCard style={{ marginBottom: 15, padding: 0, overflow: 'hidden' }}>
                        <View style={{ padding: 20, paddingBottom: 10 }}>
                            <View style={styles.analysisCardHeader}>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                                    <FontAwesome5 name="shield-alt" size={16} color={barrier.color} />
                                    <Text style={[styles.analysisCardTitle, { color: barrier.color }]}>صحة الحاجز (Barrier Integrity)</Text>
                                </View>
                                <View style={{ backgroundColor: barrier.color + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 10, color: barrier.color }}>اضغط للتفاصيل</Text>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
                                <Text style={[styles.statValue, {color: barrier.color, fontSize: 36}]}>{barrier.score}%</Text>
                                <View style={{ flex: 1, paddingBottom: 6 }}>
                                    <Text style={{ fontFamily: 'Tajawal-Bold', color: barrier.color, textAlign: 'left', fontSize: 16 }}>{barrier.status}</Text>
                                </View>
                            </View>

                            <LiquidProgressBar score={barrier.score} max={100} color={barrier.color} />
                            <Text style={styles.barrierDesc} numberOfLines={2}>{barrier.desc}</Text>
                        </View>
                        
                        <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                             <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textSecondary }}>
                                 {(barrier.totalIrritation || 0) > 0 ? `حمل كيميائي: ${(barrier.totalIrritation || 0).toFixed(1)}` : 'لا يوجد إجهاد كيميائي'}
                             </Text>
                             <FontAwesome5 name="chevron-left" size={12} color={COLORS.textDim} />
                        </View>
                    </ContentCard>
                </PressableScale>

                {/* 4. Overview Dashboard */}
                <View style={styles.overviewContainer}>
                    <View style={styles.overviewCard}>
                        <ContentCard style={{flex: 1}}>
                            <View style={styles.analysisCardHeader}>
                               <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4}}>
                                    <Feather name="sun" size={14} color={COLORS.warning} />
                                    <Text style={{color: COLORS.textSecondary}}>/</Text>
                                    <Feather name="moon" size={14} color={'#a78bfa'} />
                               </View>
                               <Text style={styles.analysisCardTitle}>نظرة عامة</Text>
                           </View>
                           <View style={styles.routineOverviewGrid}>
                               <View style={styles.routineColumn}>
                                   <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
                                       <Text style={styles.routineColumnTitle}>الصباح</Text>
                                       {(analysisResults?.amRoutine?.conflicts || 0) > 0 && (
                                           <View style={{backgroundColor: COLORS.danger + '20', paddingHorizontal:6, borderRadius:4}}>
                                               <Text style={{color: COLORS.danger, fontSize:10, fontFamily:'Tajawal-Bold'}}>
                                                   {analysisResults.amRoutine.conflicts} !
                                               </Text>
                                           </View>
                                       )}
                                   </View>
                                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row-reverse', gap: 6}}>
                                   {analysisResults?.amRoutine?.products?.length > 0 ? (
                                       analysisResults.amRoutine.products.map(p => <Text key={p.id} style={styles.routineProductPill}>{p.productName}</Text>)
                                   ) : ( <Text style={styles.routineEmptyText}>فارغ</Text> )}
                                   </ScrollView>
                               </View>
                                <View style={styles.routineDivider} />
                                <View style={styles.routineColumn}>
                                   <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
                                       <Text style={styles.routineColumnTitle}>المساء</Text>
                                       {(analysisResults?.pmRoutine?.conflicts || 0) > 0 && (
                                           <View style={{backgroundColor: COLORS.danger + '20', paddingHorizontal:6, borderRadius:4}}>
                                               <Text style={{color: COLORS.danger, fontSize:10, fontFamily:'Tajawal-Bold'}}>
                                                   {analysisResults.pmRoutine.conflicts} !
                                               </Text>
                                           </View>
                                       )}
                                   </View>
                                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row-reverse', gap: 6}}>
                                   {analysisResults?.pmRoutine?.products?.length > 0 ? (
                                       analysisResults.pmRoutine.products.map(p => <Text key={p.id} style={styles.routineProductPill}>{p.productName}</Text>)
                                   ) : ( <Text style={styles.routineEmptyText}>فارغ</Text> )}
                                   </ScrollView>
                               </View>
                           </View>
                        </ContentCard>
                    </View>

                    <View style={styles.overviewCard}>
                         <ContentCard style={{flex: 1}}>
                            <View style={styles.analysisCardHeader}>
                               <FontAwesome5 name="shield-alt" size={14} color={COLORS.textSecondary} />
                               <Text style={styles.analysisCardTitle}>حماية الشمس</Text>
                           </View>
                           <View style={styles.sunProtectionContainer}>
                               <ChartRing 
                                   percentage={analysisResults?.sunProtectionGrade?.score || 0} 
                                   color={(analysisResults?.sunProtectionGrade?.score || 0) > 50 ? COLORS.gold : COLORS.danger}
                                   radius={35}
                                   strokeWidth={6}
                               />
                               <View style={{flex: 1, marginRight: 15, justifyContent: 'center'}}>
                                   {(analysisResults?.sunProtectionGrade?.notes || []).length > 0 ? (
                                       analysisResults.sunProtectionGrade.notes.map((note, i) => (
                                            <Text key={i} style={styles.sunProtectionNote}>{note}</Text>
                                       ))
                                   ) : (
                                       <Text style={styles.sunProtectionNote}>لا توجد بيانات كافية</Text>
                                   )}
                               </View>
                           </View>
                        </ContentCard>
                    </View>
                </View>
            </View>
  
            {selectedInsight && (
                <InsightDetailsModal visible={!!selectedInsight} insight={selectedInsight} onClose={() => setSelectedInsight(null)} />
            )}

            <BarrierDetailsModal visible={showBarrierDetails} onClose={() => setShowBarrierDetails(false)} data={barrier} />
        </View>
    );
};

// --- HELPER 1: The Custom Prompt Modal as a Bottom Sheet ---
const AddStepModal = ({ isVisible, onClose, onAdd }) => {
    const animController = useRef(new Animated.Value(0)).current;
    const [stepName, setStepName] = useState('');

    useEffect(() => {
        if (isVisible) {
            setStepName('');
            Animated.spring(animController, { toValue: 1, useNativeDriver: true }).start();
        }
    }, [isVisible]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onClose());
    };

    const handleAdd = () => {
        if (stepName.trim()) {
            onAdd(stepName.trim());
            handleClose();
        }
    };

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    if (!isVisible) return null; // Can return null here as it's simple

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }], height: 'auto', maxHeight: height * 0.5 }]}>
                <View style={[styles.sheetContent, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle}/></View>
                    <View style={{padding: 25, paddingBottom: 40}}>
                        <Text style={styles.modalTitle}>إضافة خطوة جديدة</Text>
                        <TextInput
                            placeholder="اسم الخطوة (مثال: سيروم)"
                            placeholderTextColor={COLORS.textDim}
                            style={styles.promptInput}
                            value={stepName}
                            onChangeText={setStepName}
                            autoFocus
                        />
                        <View style={styles.promptButtonRow}>
                            <PressableScale style={[styles.promptButton, styles.promptButtonSecondary]} onPress={handleClose}>
                                <Text style={styles.promptButtonTextSecondary}>إلغاء</Text>
                            </PressableScale>
                            <PressableScale style={[styles.promptButton, styles.promptButtonPrimary]} onPress={handleAdd}>
                                <Text style={styles.promptButtonTextPrimary}>إضافة</Text>
                            </PressableScale>
                        </View>
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
};

// --- HELPER 2: The Interactive Onboarding Guide ---
const RoutineOnboardingGuide = ({ onDismiss }) => {
  const [step, setStep] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
      Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const steps = [
      { title: "مرحباً بك في مُنشئ الروتين", text: "هنا يمكنك بناء روتينك المثالي خطوة بخطوة. لنبدأ!" },
      { title: "1. أضف خطوتك الأولى", text: "اضغط على هذا الزر لإضافة أول مرحلة في روتينك، مثل 'غسول'." },
      { title: "2. املأ رفّك الرقمي", text: "لأفضل النتائج، انتقل إلى علامة تبويب 'الرف' وامسح كل منتجاتك." },
      { title: "3. دع الذكاء الاصطناعي يساعدك", text: "بعد إضافة منتجاتك، استخدم زر 'الإنشاء التلقائي' لبناء روتين مُقترح فوراً." }
  ];

  const handleNext = () => step < steps.length - 1 ? setStep(s => s + 1) : onDismiss();

  return (
      <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[styles.guideOverlay, { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]} />
          <View style={[StyleSheet.absoluteFill, styles.guideContentContainer]}>
              <View style={{flex: 1}} />
              <Animated.View style={[styles.guideTextBox, { opacity: anim, transform: [{ scale: anim }] }]}>
                  <Text style={styles.guideTitle}>{steps[step].title}</Text>
                  <Text style={styles.guideText}>{steps[step].text}</Text>
                  <PressableScale onPress={handleNext} style={styles.guideButton}>
                      <Text style={styles.guideButtonText}>{step === steps.length - 1 ? "لنبدأ!" : "التالي"}</Text>
                  </PressableScale>
              </Animated.View>
          </View>
      </View>
  );
};


// --- HELPER 3: The Card for Each Step in the Timeline ---
const RoutineStepCard = ({ step, index, onManage, onDelete, products }) => {
    const productList = step.productIds.map(id => products.find(p => p.id === id)).filter(Boolean);
    const isStepFilled = productList.length > 0;
  
    // NOTICE: StaggeredItem removed from here. 
    // It is now applied in the FlatList renderItem.
    return (
        <PressableScale onPress={onManage} style={styles.stepCardContainer}>
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

            {/* BODY: Product List or Empty State */}
            <View style={styles.stepBody}>
                {isStepFilled ? (
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.stepProductsScroll}
                    >
                        {productList.map((p, i) => (
                            <View key={p.id} style={styles.stepProductChip}>
                                <View style={[styles.chipIconBox, { backgroundColor: p.analysisData?.product_type === 'sunscreen' ? '#fdba74' : COLORS.accentGreen }]}>
                                    <FontAwesome5 
                                        name={p.analysisData?.product_type === 'sunscreen' ? 'sun' : 'pump-soap'} 
                                        size={10} 
                                        color={'#1A2D27'} 
                                    />
                                </View>
                                <Text style={styles.stepProductText} numberOfLines={1}>
                                    {p.productName}
                                </Text>
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.stepEmptyState}>
                        <Text style={styles.stepEmptyLabel}>اضغط لإضافة منتجات</Text>
                        <Feather name="plus-circle" size={16} color={COLORS.accentGreen} />
                    </View>
                )}
            </View>
            
            {/* Edit Indicator (Subtle) */}
            <View style={styles.editIndicator}>
                <Feather name="more-horizontal" size={16} color={COLORS.border} />
            </View>

        </PressableScale>
    );
};// --- HELPER 4: The Bottom Sheet Modal for Editing a Step ---
const StepEditorModal = ({ isVisible, onClose, step, onSave, allProducts }) => {
    const animController = useRef(new Animated.Value(0)).current;
    const [currentProducts, setCurrentProducts] = useState([]);
    const [isAddModalVisible, setAddModalVisible] = useState(false);

    useEffect(() => {
        if (isVisible && step) {
            setCurrentProducts(step.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean));
            Animated.spring(animController, { toValue: 1, useNativeDriver: true }).start();
        }
    }, [isVisible, step]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onClose());
    };

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    // ... (Keep existing handlers: handleReorder, handleRemove, handleAddProduct, handleSaveChanges)
    // Re-paste your existing logic functions here, they don't need changing.
    const handleReorder = (index, direction) => { /* ... existing code ... */ };
    const handleRemove = (productId) => { 
        setCurrentProducts(prev => prev.filter(p => p.id !== productId));
    };
    const handleAddProduct = (productId) => {
        const p = allProducts.find(x => x.id === productId);
        if(p) setCurrentProducts([...currentProducts, p]);
        setAddModalVisible(false);
    };
    const handleSaveChanges = () => {
        onSave(step.id, currentProducts.map(p => p.id));
        handleClose();
    };

    if (!step) return null;

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle}/></View>
                    
                    <View style={{padding: 20}}>
                        <View style={styles.stepModalHeader}>
                            <Text style={styles.stepModalTitle}>{step.name}</Text>
                            <PressableScale onPress={() => setAddModalVisible(true)} style={styles.addProductButton}>
                                <Feather name="plus" size={16} color={COLORS.textOnAccent} />
                                <Text style={styles.addProductButtonText}>إضافة</Text>
                            </PressableScale>
                        </View>

                        <FlatList 
                            data={currentProducts}
                            keyExtractor={item => item.id}
                            renderItem={({ item, index }) => (
                                <View style={styles.reorderItem}>
                                    <Text style={styles.reorderItemText}>{item.productName}</Text>
                                    <TouchableOpacity onPress={() => handleRemove(item.id)}>
                                        <FontAwesome5 name="times" size={16} color={COLORS.danger} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            ListEmptyComponent={<Text style={styles.stepModalEmptyText}>لا توجد منتجات</Text>}
                        />

                        <PressableScale onPress={handleSaveChanges} style={styles.saveStepButton}>
                            <Text style={styles.saveStepButtonText}>حفظ التغييرات</Text>
                        </PressableScale>
                    </View>
                </View>
            </Animated.View>

            {/* Nested Modal for Selection */}
            <Modal visible={isAddModalVisible} transparent animationType="slide">
                <View style={styles.centeredModalOverlay}>
                    <ContentCard style={styles.modalContent}>
                        <Text style={styles.modalTitle}>اختر منتج</Text>
                        <FlatList 
                            data={allProducts} 
                            keyExtractor={i => i.id}
                            renderItem={({item}) => (
                                <PressableScale onPress={() => handleAddProduct(item.id)} style={styles.modalItem}>
                                    <Text style={styles.modalItemName}>{item.productName}</Text>
                                </PressableScale>
                            )} 
                        />
                        <Pressable onPress={() => setAddModalVisible(false)} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>إلغاء</Text>
                        </Pressable>
                    </ContentCard>
                </View>
            </Modal>
        </Modal>
    );
};

// --- The Main Routine Section Component ---
const RoutineSection = ({ savedProducts, userProfile, onOpenAddStepModal }) => {
    const { user } = useAppContext();
    const [routines, setRoutines] = useState({ am: [], pm: [] });
    const [activePeriod, setActivePeriod] = useState('am');
    const [selectedStep, setSelectedStep] = useState(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    
    // New state to track server request status
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
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
        } catch (error) { 
            console.error("Error saving routines:", error); 
            Alert.alert("Error", "Could not save routine."); 
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
        Alert.alert("حذف الخطوة", "هل أنت متأكد؟", [
            { text: "إلغاء", style: "cancel" }, 
            { text: "حذف", style: "destructive", onPress: async () => {
                const newRoutines = JSON.parse(JSON.stringify(routines));
                newRoutines[activePeriod] = newRoutines[activePeriod].filter(s => s.id !== stepId);
                saveRoutines(newRoutines);
            }}
        ]);
    };
  
    const handleUpdateStep = (stepId, newProductIds) => {
        const newRoutines = JSON.parse(JSON.stringify(routines));
        const stepIndex = newRoutines[activePeriod].findIndex(s => s.id === stepId);
        if (stepIndex !== -1) { 
            newRoutines[activePeriod][stepIndex].productIds = newProductIds; 
            saveRoutines(newRoutines); 
        }
    };
  
    // --- NEW SERVER-SIDE ROUTINE ARCHITECT ---
    const handleAutoBuildRoutine = () => {
      // 0. Minimum Viable Shelf Check
      if (savedProducts.length < 2) {
          Alert.alert("الرف غير كافٍ", "نحتاج إلى منتجين على الأقل (غسول + مرطب) لبناء روتين ذكي.");
          return;
      }
  
      const runArchitect = async () => {
        setIsBuilding(true);
        try {
            // UPDATED FETCH CALL
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
  
              // 2. Receive Optimized Routine & Save
              const newRoutines = { 
                  am: data.am || [], 
                  pm: data.pm || [] 
              };
              
              await saveRoutines(newRoutines);
  
              // 3. Show Doctor's Report
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setTimeout(() => Alert.alert("المعمار الرقمي 🧬", data.logs || "تم بناء الروتين بنجاح"), 500);
  
          } catch (error) {
              console.error("Routine Generation Error:", error);
              Alert.alert("خطأ", "تعذر الاتصال بالخادم الذكي. يرجى المحاولة لاحقاً.");
          } finally {
              setIsBuilding(false);
          }
      };
  
      Alert.alert("بناء الروتين المتقدم", "تشغيل 'المعمار الرقمي' (Gen 9)؟ سيتم تحليل كثافة المنتجات والـ pH عبر الخادم السحابي.", [
          { text: "إلغاء", style: "cancel" },
          { text: "بدء التحليل", onPress: runArchitect }
      ]);
    }; 
  
    return (
      <View style={{ flex: 1 }}>
          <View style={styles.routineHeaderContainer}>
               <View style={styles.routineSwitchContainer}>
                  <PressableScale onPress={() => switchPeriod('pm')} style={[styles.periodBtn, activePeriod==='pm' && styles.periodBtnActive]}><Feather name="moon" size={16} color={activePeriod==='pm' ? COLORS.textOnAccent : COLORS.textSecondary} /><Text style={[styles.periodText, activePeriod==='pm' && styles.periodTextActive]}>المساء</Text></PressableScale>
                  <PressableScale onPress={() => switchPeriod('am')} style={[styles.periodBtn, activePeriod==='am' && styles.periodBtnActive]}><Feather name="sun" size={16} color={activePeriod==='am' ? COLORS.textOnAccent : COLORS.textSecondary} /><Text style={[styles.periodText, activePeriod==='am' && styles.periodTextActive]}>الصباح</Text></PressableScale>
              </View>
               
               {/* Auto Build Button with Loading State */}
               <PressableScale onPress={handleAutoBuildRoutine} style={styles.autoBuildButton} disabled={isBuilding}>
                  {isBuilding ? 
                      <ActivityIndicator size="small" color={COLORS.accentGreen} /> : 
                      <MaterialCommunityIcons name="auto-fix" size={20} color={COLORS.accentGreen} />
                  }
               </PressableScale>
          </View>
  
          <FlatList
              data={routines[activePeriod]}
              renderItem={({ item, index }) => (
                  <StaggeredItem index={index}> 
                      <RoutineStepCard 
                          step={item} 
                          index={index} 
                          onManage={() => setSelectedStep(item)} 
                          onDelete={() => handleDeleteStep(item.id)}
                          products={savedProducts} 
                      />
                  </StaggeredItem>
              )}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 220, paddingTop: 10 }}
              scrollEnabled={false}
              ListEmptyComponent={() => (
                  <View style={styles.routineEmptyState}>
                      <MaterialCommunityIcons name="playlist-edit" size={60} color={COLORS.textDim} style={{opacity: 0.5}}/>
                      <Text style={styles.routineEmptyTitle}>الروتين فارغ</Text>
                      <Text style={styles.routineEmptySub}>استخدم زر "+" في الأسفل لبناء روتينك المخصص.</Text>
                  </View>
              )}
          />
          
          <PressableScale style={styles.fabRoutine} onPress={() => onOpenAddStepModal(handleAddStep)}>
              <LinearGradient colors={[COLORS.accentGreen, '#4a8a73']} style={styles.fabGradient}><FontAwesome5 name="plus" size={20} color={COLORS.textOnAccent} /></LinearGradient>
          </PressableScale>
  
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
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', color: COLORS.textDim, marginTop: 20 }}>
                            {allIngredients.length === 0 ? "لا توجد مكونات" : "لا توجد نتائج"}
                        </Text>
                    }
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
        return (
            <View style={{ flex: 1 }}>
                <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
                    <FontAwesome5 name="leaf" size={60} color={COLORS.success} />
                    <Text style={styles.emptyText}>منتجاتك نظيفة تماماً!</Text>
                    <Text style={styles.emptySub}>لا توجد مكونات صناعية</Text>
                </Animated.View>
            </View>
        );
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

const WeatherDashboard = ({ insight }) => {
    
    const getTheme = () => {
        const id = insight.id.toLowerCase();
        
        // 1. Permission Error
        if (insight.customData?.isPermissionError) {
            return {
                gradient: ['#4b5563', '#1f2937'], // Dark Gray
                icon: 'map-marker-alt',
                accent: '#9ca3af',
                label: 'الموقع مطلوب',
                isError: true
            };
        }

        if (insight.customData?.isServiceError) {
            return {
                gradient: ['#d97706', '#92400e'], // Amber/Brown
                icon: 'wifi',
                accent: '#fbbf24',
                label: 'خطأ في الاتصال',
                isError: true,
                action: () => {} // No action, just informational
            };
        }

        // 2. Good / Normal Weather
        if (insight.severity === 'good' || id.includes('normal')) {
            return {
                gradient: ['#10b981', '#059669'], // Emerald Green
                icon: 'smile-beam',
                accent: '#a7f3d0',
                label: 'الطقس مثالي',
                isGood: true
            };
        }

        // 3. Bad Weather (Existing logic)
        if (id.includes('uv') || id.includes('sun')) return { gradient: ['#ef4444', '#b91c1c'], icon: 'sun', accent: '#fca5a5', label: 'خطر أشعة UV' };
        if (id.includes('dry') || id.includes('cold')) return { gradient: ['#3b82f6', '#1d4ed8'], icon: 'snowflake', accent: '#93c5fd', label: 'جفاف شديد' };
        if (id.includes('humid') || id.includes('sweat')) return { gradient: ['#f59e0b', '#b45309'], icon: 'water', accent: '#fde68a', label: 'رطوبة عالية' };

        return { gradient: [COLORS.accentGreen, '#4a8a73'], icon: 'cloud-sun', accent: '#a7f3d0', label: 'تنبيه طقس' };
    };

    const theme = getTheme();
    const advice = insight.customData?.advice || insight.details;
    const meta = insight.customData?.meta; // { temp, uvIndex, humidity } if available

    // Pulse Animation
    const scaleAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
            ])
        ).start();
    }, []);

    const handleAction = () => {
        if (theme.isError) {
            Linking.openSettings(); // Open Phone Settings
        }
    };

    return (
        <View style={{ marginBottom: 20 }}>
            <Pressable onPress={handleAction} disabled={!theme.isError}>
                <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 20 }}>
                    <LinearGradient 
                        colors={theme.gradient} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 1 }} 
                        style={{ padding: 30, alignItems: 'center', minHeight: 220, justifyContent: 'center' }}
                    >
                        {/* Live Data Strip (Only if Good Weather) */}
                        {theme.isGood && meta && (
                            <View style={{ flexDirection: 'row-reverse', gap: 15, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 }}>
                                <Text style={{color: '#fff', fontFamily: 'Tajawal-Bold'}}>{Math.round(meta.temp)}°C</Text>
                                <Text style={{color: '#fff'}}>|</Text>
                                <Text style={{color: '#fff', fontFamily: 'Tajawal-Bold'}}>UV {meta.uvIndex}</Text>
                            </View>
                        )}

                        <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 15 }}>
                            <FontAwesome5 name={theme.icon} size={60} color="#fff" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 4}, textShadowRadius: 10 }} />
                        </Animated.View>
                        
                        <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 24, color: '#fff', textAlign: 'center', marginBottom: 5 }}>
                            {theme.label}
                        </Text>
                        <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 16, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>
                            {insight.short_summary}
                        </Text>
                    </LinearGradient>
                </View>
            </Pressable>

            {/* Science / Details */}
            <View style={{ flexDirection: 'row-reverse', gap: 15, marginBottom: 20 }}>
                <View style={[styles.sheetPillar, { flex: 1, backgroundColor: COLORS.card, alignItems: 'flex-start', paddingHorizontal: 15 }]}>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <FontAwesome5 name="info-circle" size={14} color={COLORS.textSecondary} />
                        <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, fontSize: 12 }}>
                            {theme.isError ? 'لماذا؟' : 'الحالة'}
                        </Text>
                    </View>
                    <Text style={{ fontFamily: 'Tajawal-Regular', color: COLORS.textPrimary, lineHeight: 20, textAlign: 'left' }}>
                        {insight.details}
                    </Text>
                </View>
            </View>

            {/* Action Box */}
            <View style={{ backgroundColor: theme.gradient[0] + '15', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.gradient[0] + '40' }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.gradient[0], alignItems: 'center', justifyContent: 'center' }}>
                        <FontAwesome5 name={theme.isError ? "cog" : "check"} size={14} color="#fff" />
                    </View>
                    <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 16, color: theme.gradient[0] }}>
                        {theme.isError ? 'الإجراء المطلوب' : 'التوصية'}
                    </Text>
                </View>
                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 18, color: COLORS.textPrimary, lineHeight: 28, textAlign: 'left' }}>
                    {advice}
                </Text>
            </View>
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
                                                <FontAwesome5 name="bottle-droplet" size={12} color={COLORS.textSecondary} />
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
    const action1Y = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -130] });
    const action2Y = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -70] });
    
    // Buttons appear instantly (0 -> 1 quickly)
    const buttonOpacity = anim.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 1] });
    
    // Overlay fades smoothly (0 -> 1 linear)
    const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    return (
        <View style={styles.fabContainer} pointerEvents="box-none">
            
            {/* 
                1. INDEPENDENT OVERLAY 
                - No transforms (prevents flickering)
                - Massive size to cover any screen
                - pointerEvents controls interactivity (Pass-through when closed, Blocking when open)
            */}
            <Animated.View 
                style={{
                    position: 'absolute',
                    // Position relative to the FAB to cover the whole screen
                    top: -height * 1.5, 
                    left: -width * 1.5, 
                    width: width * 3, 
                    height: height * 3,
                    backgroundColor: 'rgba(26, 45, 39, 0.9)',
                    zIndex: 0, // Bottom Layer
                    opacity: backdropOpacity,
                    elevation: 0 // Ensure Android doesn't mess up transparency
                }} 
                pointerEvents={isOpen ? 'auto' : 'none'}
            >
                <Pressable style={{flex: 1}} onPress={toggleMenu} />
            </Animated.View>

            {/* 2. BUTTON 1: Comparison (Layer 10) */}
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
                    // Large hit area + Retention offset for instant moving clicks
                    hitSlop={20} 
                    pressRetentionOffset={{ top: 150, bottom: 150, left: 150, right: 150 }}
                >
                    <FontAwesome5 name="balance-scale" size={16} color={COLORS.textOnAccent} />
                </Pressable>
            </Animated.View>

            {/* 3. BUTTON 2: Scan (Layer 10) */}
            <Animated.View 
                style={[styles.actionBtnWrap, { opacity: buttonOpacity, transform: [{ translateY: action2Y }], zIndex: 10 }]}
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

            {/* 4. MAIN FAB (Layer 20) */}
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


const REGEX_DIACRITICS = /[\u0300-\u036f]/g;
const REGEX_PUNCTUATION = /[.,،؛()/]/g;
const REGEX_NON_ALPHANUM = /[^\p{L}\p{N}\s-]/gu;
const REGEX_WHITESPACE = /\s+/g;

const normalizeForMatching = (name) => {
    if (!name) return '';
    // Chain them efficiently or use a single pass if possible. 
    // This looks cleaner and avoids memory thrashing.
    return name.toString().toLowerCase()
      .normalize("NFD").replace(REGEX_DIACRITICS, "") 
      .replace(REGEX_PUNCTUATION, ' ') 
      .replace(REGEX_NON_ALPHANUM, '') 
      .replace(REGEX_WHITESPACE, ' ') 
      .trim();
};

// --- OPTIMIZED COMPONENT: ANIMATED SCORE RING (Fixed Latency) ---
const AnimatedScoreRing = React.memo(({ score, color, radius = 28, strokeWidth = 4 }) => {
    // 1. Calculate Geometry immediately
    const circumference = 2 * Math.PI * radius;
    
    // 2. FIX: Initialize state to 'circumference' (Empty) instead of 0 (Full)
    const [displayOffset, setDisplayOffset] = useState(circumference);
    const [displayScore, setDisplayScore] = useState(0);
    
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Ensure animation starts from 0
        animatedValue.setValue(0);

        const animation = Animated.timing(animatedValue, {
            toValue: score,
            duration: 1200, // Slightly faster for responsiveness
            delay: 0,       // REMOVED DELAY -> Starts instantly on mount
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false 
        });

        const listenerId = animatedValue.addListener(({ value }) => {
            const offset = circumference - (value / 100) * circumference;
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
            <Svg width={radius * 2} height={radius * 2} style={{ transform: [{ rotate: '-90deg' }] }}>
                {/* Background Track */}
                <Circle 
                    cx={radius} cy={radius} 
                    r={radius - strokeWidth} 
                    stroke={COLORS.border} 
                    strokeWidth={strokeWidth} 
                    fill="none" 
                />
                {/* Animated Fill */}
                <Circle
                    cx={radius} cy={radius}
                    r={radius - strokeWidth}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={displayOffset} 
                    strokeLinecap="round"
                />
            </Svg>
            <Text style={[styles.listItemScoreText, { color: color }]}>
                {displayScore}%
            </Text>
        </View>
    );
});

const buildIngredientIndex = (db) => {
    const index = new Map();
    const normalize = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

    db.ingredients.forEach(ing => {
        const entry = { ...ing, _normId: normalize(ing.id) };
        
        // Index by everything possible
        index.set(normalize(ing.id), entry);
        if (ing.name) index.set(normalize(ing.name), entry);
        if (ing.scientific_name) index.set(normalize(ing.scientific_name), entry);
        
        if (ing.searchKeywords && Array.isArray(ing.searchKeywords)) {
            ing.searchKeywords.forEach(k => index.set(normalize(k), entry));
        }
    });
    return { index, normalize };
};


const resolveIngredient = (detectedName) => {
    if (!detectedName) return null;
    return ingredientIndex.get(normalize(detectedName));
};

// --- HELPER 2: MECHANISM CLASSIFIER ---
// Maps specific ingredients to their dermatological function
const getMechanism = (ingId) => {
    const id = ingId.toLowerCase();
    if (['salicylic-acid', 'betaine-salicylate', 'willow-bark'].includes(id)) return 'exfoliation_bha';
    if (['benzoyl-peroxide', 'tea-tree-oil', 'sulfur'].includes(id)) return 'anti_bacterial';
    if (['niacinamide', 'zinc-pca', 'green-tea'].includes(id)) return 'sebum_control';
    if (['retinol', 'tretinoin', 'adapalene', 'retinal'].includes(id)) return 'cell_turnover';
    if (['vitamin-c', 'ascorbic-acid', 'resveratrol', 'ferulic-acid'].includes(id)) return 'antioxidant';
    if (['hyaluronic-acid', 'glycerin', 'panthenol'].includes(id)) return 'humectant';
    if (['ceramides', 'cholesterol', 'fatty-acids', 'squalane'].includes(id)) return 'barrier_repair';
    if (['hydroquinone', 'kojic-acid', 'alpha-arbutin', 'tranexamic-acid'].includes(id)) return 'tyrosinase_inhibitor';
    return 'general';
};

// --- COMPONENT: RICH WEATHER SHEET UI (Fixed) ---
const WeatherDetailedSheet = ({ insight }) => {
    const data = insight.customData;
    if (!data) return null;

    // Theme Config
    const themes = {
        pollution: { colors: ['#4c1d95', '#6d28d9'], icon: 'smog' }, 
        dry: { colors: ['#1e40af', '#3b82f6'], icon: 'wind' },       
        uv: { colors: ['#991b1b', '#ef4444'], icon: 'sun' },         
        humid: { colors: ['#9a3412', '#f97316'], icon: 'water' },    
        perfect: { colors: ['#065f46', '#10b981'], icon: 'smile-beam' },
        unknown: { colors: ['#4b5563', '#1f2937'], icon: 'cloud' } 
    };
    
    const themeKey = data.theme || 'unknown';
    const theme = themes[themeKey] || themes.unknown;

    return (
        <View>
            {/* 1. ATMOSPHERIC HEADER */}
            <LinearGradient
                colors={theme.colors}
                style={{ padding: 25, borderRadius: 24, alignItems: 'center', marginBottom: 20 }}
            >
                {/* LOCATION BADGE (NEW) */}
                {data.location && (
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 15 }}>
                        <FontAwesome5 name="map-marker-alt" size={10} color="#fff" style={{ marginLeft: 6 }} />
                        <Text style={{ color: '#fff', fontFamily: 'Tajawal-Regular', fontSize: 12 }}>{data.location}</Text>
                    </View>
                )}

                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                    <FontAwesome5 name={theme.icon} size={28} color="#fff" />
                </View>
                <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 24, color: '#fff', textAlign: 'center' }}>
                    {insight.title}
                </Text>
                
                {/* Live Metrics Pill */}
                {data.metrics ? (
                    <View style={{ flexDirection: 'row-reverse', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Text style={{ color: '#fff', fontFamily: 'Tajawal-Bold', fontSize: 14 }}>
                            {data.metrics.label}: {data.metrics.value}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', marginHorizontal: 10 }}>|</Text>
                        <Text style={{ color: '#fff', fontFamily: 'Tajawal-Regular', fontSize: 14 }}>{data.metrics.status}</Text>
                    </View>
                ) : null}
            </LinearGradient>

            {/* 2. IMPACT SECTION (Using Your SheetPillar Styles) */}
            {data.impact && (
                <View style={styles.sheetPillarsContainer}>
                    {/* Skin */}
                    <View style={styles.sheetPillar}>
                        <FontAwesome5 name="user-alt" size={18} color={COLORS.accentGreen} />
                        <Text style={styles.sheetPillarLabel}>تأثير البشرة</Text>
                        <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textPrimary, textAlign: 'center', lineHeight: 18 }}>
                            {data.impact.skin}
                        </Text>
                    </View>
                    <View style={styles.sheetDividerVertical} />
                    {/* Hair */}
                    <View style={styles.sheetPillar}>
                        <FontAwesome5 name="cut" size={18} color={COLORS.gold} />
                        <Text style={styles.sheetPillarLabel}>تأثير الشعر</Text>
                        <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textPrimary, textAlign: 'center', lineHeight: 18 }}>
                            {data.impact.hair}
                        </Text>
                    </View>
                </View>
            )}

            {/* 3. ROUTINE ADJUSTMENTS (Using Your AlertBox/List Styles) */}
            {data.routine_adjustments && data.routine_adjustments.length > 0 && (
                <View style={styles.sheetSection}>
                    <Text style={styles.sheetSectionTitle}>تحديثات الروتين المقترحة</Text>

                    {data.routine_adjustments.map((item, index) => (
                        <View key={index} style={[styles.productListItemWrapper, { marginBottom: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border }]}>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 }}>
                                {/* Step Badge */}
                                <View style={{ backgroundColor: COLORS.accentGreen + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                                    <Text style={{ color: COLORS.accentGreen, fontSize: 11, fontFamily: 'Tajawal-Bold' }}>{item.step}</Text>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold', fontSize: 14, textAlign: 'right', marginBottom: 4 }}>
                                        {item.action}
                                    </Text>
                                    
                                    {/* Found Product */}
                                    {item.product ? (
                                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: 8, borderRadius: 8, alignSelf: 'flex-start' }}>
                                            <FontAwesome5 name="check-circle" size={12} color={COLORS.success} style={{ marginLeft: 6 }} />
                                            <Text style={{ color: COLORS.success, fontSize: 12, fontFamily: 'Tajawal-Regular' }}>
                                                لديكِ: {item.product}
                                            </Text>
                                        </View>
                                    ) : item.missing_suggestion ? (
                                    /* Missing Suggestion */
                                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: 8, borderRadius: 8, alignSelf: 'flex-start' }}>
                                            <FontAwesome5 name="shopping-bag" size={10} color={COLORS.warning} style={{ marginLeft: 6 }} />
                                            <Text style={{ color: COLORS.warning, fontSize: 12, fontFamily: 'Tajawal-Regular' }}>
                                                نقترح: {item.missing_suggestion}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}
            
            {/* Fallback Text */}
            {(!data.metrics && !data.impact) && (
                <View style={[styles.emptyState, { marginTop: 0 }]}>
                    <Text style={styles.emptySub}>{insight.details}</Text>
                </View>
            )}
        </View>
    );
};

// ============================================================================
//                       MAIN PROFILE CONTROLLER
// ============================================================================

export default function ProfileScreen() {
    const { user, userProfile, savedProducts, setSavedProducts, loading, logout } = useAppContext();
    const router = useRouter();
    const insets = useSafeAreaInsets(); 
  
    const HEADER_BASE_HEIGHT = 150; 
    const headerMaxHeight = HEADER_BASE_HEIGHT + insets.top;
    const headerMinHeight = (Platform.OS === 'ios' ? 90 : 80) + insets.top;
    const scrollDistance = headerMaxHeight - headerMinHeight;
    const [activeTab, setActiveTab] = useState('shelf');
    const [isAddStepModalVisible, setAddStepModalVisible] = useState(false);
    const [addStepHandler, setAddStepHandler] = useState(null);
    const [locationPermission, setLocationPermission] = useState('undetermined'); // 'granted', 'denied', 'undetermined'
    const [refreshing, setRefreshing] = useState(false); // For Pull-to-Refresh
    const appState = useRef(AppState.currentState); // Track App State

    const openAddStepModal = (onAddCallback) => {
      setAddStepHandler(() => onAddCallback); 
      setAddStepModalVisible(true);
    };
  
    const scrollY = useRef(new Animated.Value(0)).current;
    const headerHeight = scrollY.interpolate({ inputRange: [0, scrollDistance], outputRange: [headerMaxHeight, headerMinHeight], extrapolate: 'clamp' });
    const expandedHeaderOpacity = scrollY.interpolate({ inputRange: [0, scrollDistance / 2], outputRange: [1, 0], extrapolate: 'clamp' });
    const expandedHeaderTranslate = scrollY.interpolate({ inputRange: [0, scrollDistance], outputRange: [0, -20], extrapolate: 'clamp' });
    const collapsedHeaderOpacity = scrollY.interpolate({ inputRange: [scrollDistance / 2, scrollDistance], outputRange: [0, 1], extrapolate: 'clamp' });
    
    const contentOpacity = useRef(new Animated.Value(1)).current;
    const contentTranslate = useRef(new Animated.Value(0)).current;
    const analysisCache = useRef({ hash: '', data: null });
    const ingredientsCache = useRef({ hash: '', data: [] }); 
    const switchTab = (tab) => { if(tab !== activeTab) { Haptics.selectionAsync(); setActiveTab(tab); } };
  
    const particles = useMemo(() => [...Array(15)].map((_, i) => ({ id: i, size: Math.random()*5+3, startX: Math.random()*width, duration: 8000+Math.random()*7000, delay: Math.random()*5000 })), []);
    
    const [dismissedInsightIds, setDismissedInsightIds] = useState([]);
    const handleDismissPraise = (id) => { if (!dismissedInsightIds.includes(id)) setDismissedInsightIds(prev => [...prev, id]); };
  
    const handleDelete = async (id) => { 
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const old = [...savedProducts];
      setSavedProducts(prev => prev.filter(p => p.id !== id));
      try { await deleteDoc(doc(db, 'profiles', user.uid, 'savedProducts', id)); } catch (error) { setSavedProducts(old); Alert.alert("خطأ", "تعذر حذف المنتج"); }
    };
  
    const TABS = [
        { id: 'shelf', label: 'الرف', icon: 'list' },
        { id: 'routine', label: 'روتيني', icon: 'calendar-check' },
        { id: 'analysis', label: 'تحليل', icon: 'chart-pie' },
        { id: 'migration', label: 'البديل', icon: 'exchange-alt' },
        { id: 'ingredients', label: 'مكونات', icon: 'flask' },
        { id: 'settings', label: 'إعدادات', icon: 'cog' },
    ];
  
    // --- NEW: SERVER SIDE ANALYSIS FETCH ---
    const [analysisData, setAnalysisData] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
  
    useEffect(() => {
    let isMounted = true;

    const fetchAnalysis = async () => {
        if (!savedProducts || savedProducts.length === 0) return;

        // Cache Check
        const currentHash = generateFingerprint(savedProducts, userProfile?.settings);
        if (analysisCache.current.hash === currentHash && analysisCache.current.data) {
            setAnalysisData(analysisCache.current.data);
            return;
        }

        setIsAnalyzing(true);

        // 1. GET GPS & CITY NAME
        let locationPayload = null;
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                setLocationPermission(status);

                if (status === 'granted') {
                    let loc = await Location.getCurrentPositionAsync({});
                    
                    // --- FIX: USE FREE API INSTEAD OF NATIVE GEOCODER ---
                    let cityName = 'موقعي';
                    try {
                        const lat = loc.coords.latitude;
                        const lon = loc.coords.longitude;
                        // Free API, No Key, Arabic Support
                        const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ar`;
                        
                        const geoRes = await fetch(geoUrl);
                        const geoData = await geoRes.json();
                        
                        // Extract best available name
                        cityName = geoData.city || geoData.locality || geoData.principalSubdivision || 'موقعي';
                        console.log("📍 Detected City:", cityName);
                    } catch (geoError) {
                        console.log("City fetch failed, using fallback:", geoError);
                    }

                    locationPayload = {
                        lat: loc.coords.latitude,
                        lon: loc.coords.longitude,
                        city: cityName // <--- Sending Arabic Name
                    };
                }
            } catch (error) {
                console.log("Location error:", error);
            }

        // 2. SEND TO BACKEND
        try {
            const response = await fetch(`${PROFILE_API_URL}/analyze-profile`, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    products: savedProducts,
                    settings: userProfile?.settings || {},
                    currentRoutine: userProfile?.routines,
                    location: locationPayload 
                })
            });

            const data = await response.json();
            
            if (isMounted && response.ok) {
                setAnalysisData(data);
                analysisCache.current = { hash: currentHash, data: data };
            }
        } catch (e) {
            console.error("Analysis Network Error:", e);
        } finally {
            if (isMounted) setIsAnalyzing(false);
        }
    };

    const timer = setTimeout(() => {
        fetchAnalysis();
    }, 600);

    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
}, [savedProducts, userProfile?.settings]); // Dependencies are correct
  
const runAnalysis = useCallback(async (isPullToRefresh = false) => {
    if (!savedProducts || savedProducts.length === 0) return;

    if (isPullToRefresh) setRefreshing(true);
    else setIsAnalyzing(true);

    // 1. GET GPS & CITY
    let locationPayload = null;
    try {
        // Check existing status first to avoid popup loops
        let { status } = await Location.getForegroundPermissionsAsync();
        
        // If undetermined, ask. If denied, we can't ask again easily, just check.
        if (status === 'undetermined') {
            const req = await Location.requestForegroundPermissionsAsync();
            status = req.status;
        }
        
        setLocationPermission(status);

        if (status === 'granted') {
            let loc = await Location.getCurrentPositionAsync({});
            
            // Free Reverse Geocoding
            let cityName = 'موقعي';
            try {
                const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&localityLanguage=ar`;
                const geoRes = await fetch(geoUrl);
                const geoData = await geoRes.json();
                cityName = geoData.city || geoData.locality || geoData.principalSubdivision || 'موقعي';
            } catch (e) { console.log('City fetch error', e); }

            locationPayload = {
                lat: loc.coords.latitude,
                lon: loc.coords.longitude,
                city: cityName
            };
        }
    } catch (error) {
        console.log("Location Error:", error);
    }

    // 2. SEND TO BACKEND
    try {
        const response = await fetch(`${PROFILE_API_URL}/analyze-profile`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                products: savedProducts,
                settings: userProfile?.settings || {},
                currentRoutine: userProfile?.routines,
                location: locationPayload 
            })
        });

        const data = await response.json();
        if (response.ok) {
            setAnalysisData(data);
            // Update cache
            const currentHash = generateFingerprint(savedProducts, userProfile?.settings);
            analysisCache.current = { hash: currentHash, data: data };
        }
    } catch (e) {
        console.error("Analysis Error:", e);
    } finally {
        setIsAnalyzing(false);
        setRefreshing(false);
    }
}, [savedProducts, userProfile]);

// --- 2. INITIAL LOAD & APP RESUME LISTENER ---
useEffect(() => {
    // Initial Run
    runAnalysis();

    // Listen for App Resume (User coming back from Settings)
    const subscription = AppState.addEventListener('change', nextAppState => {
        if (
            appState.current.match(/inactive|background/) && 
            nextAppState === 'active'
        ) {
            console.log('App has come to the foreground! Refreshing Analysis...');
            // Slight delay to allow Location Services to wake up
            setTimeout(() => runAnalysis(), 500); 
        }
        appState.current = nextAppState;
    });

    return () => subscription.remove();
}, [runAnalysis]);

    return (
      <View style={styles.container}>
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          {particles.map((p) => <Spore key={p.id} {...p} />)}
          
          <Animated.View style={[styles.header, { height: headerHeight }]}>
              <LinearGradient colors={['rgba(26, 45, 39, 0.7)', 'transparent']} style={StyleSheet.absoluteFill} />
              <Animated.View style={[styles.headerContentExpanded, { opacity: expandedHeaderOpacity, transform: [{ translateY: expandedHeaderTranslate }] }]}>
                      <View><Text style={styles.welcomeText}>أهلاً، {userProfile?.settings?.name?.split(' ')[0] || 'بك'}</Text><Text style={styles.subWelcome}>رحلتك لجمال طبيعي ✨</Text></View>
                      <View style={styles.avatar}><Text style={{fontSize: 28}}>🧖‍♀️</Text></View>
              </Animated.View>
              <Animated.View style={[styles.headerContentCollapsed, { opacity: collapsedHeaderOpacity, height: headerMinHeight - insets.top }]}>
                  <Text style={styles.collapsedTitle}>{userProfile?.settings?.name || 'الملف الشخصي'}</Text>
              </Animated.View>
          </Animated.View>
  
          <Animated.ScrollView 
              contentContainerStyle={{ paddingHorizontal: 15, paddingTop: headerMaxHeight + 20, paddingBottom: 100 }}
              scrollEventThrottle={16}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
              showsVerticalScrollIndicator={false}
              // ADD REFRESH CONTROL HERE
              refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={() => runAnalysis(true)} tintColor={COLORS.accentGreen} />
              }
          >
              <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslate }], minHeight: 400 }}>
                  
                  {activeTab === 'shelf' && <ShelfSection products={savedProducts} loading={loading} onDelete={handleDelete} router={router} />}
                  
                  {activeTab === 'routine' && <RoutineSection savedProducts={savedProducts} userProfile={userProfile} onOpenAddStepModal={openAddStepModal} />}
                  
                  {activeTab === 'analysis' && (
                      <AnalysisSection 
                          savedProducts={savedProducts} 
                          loading={isAnalyzing} // Use local loading state for analysis
                          analysisResults={analysisData} // Pass fetched data
                          dismissedInsightIds={dismissedInsightIds} 
                          handleDismissPraise={handleDismissPraise} 
                          userProfile={userProfile} 
                          locationPermission={locationPermission} 
                      />
                  )}
                  
                  {activeTab === 'ingredients' && (
    <IngredientsSection 
        products={savedProducts} 
        userProfile={userProfile} 
        cacheRef={ingredientsCache}
    />
)}
                  {activeTab === 'migration' && <MigrationSection products={savedProducts} />}
                  
                  {activeTab === 'settings' && <SettingsSection profile={userProfile} onLogout={() => { logout(); router.replace('/login'); }} />}
              
              </Animated.View>
          </Animated.ScrollView>
  
          <NatureDock tabs={TABS} activeTab={activeTab} onTabChange={switchTab} />
          <AddStepModal isVisible={isAddStepModalVisible} onClose={() => setAddStepModalVisible(false)} onAdd={(stepName) => { if (addStepHandler) addStepHandler(stepName); }} />
          {activeTab === 'shelf' && <ShelfActionGroup router={router} />}
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
    loadingContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center'
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
        
        justifyContent: 'center',
        alignItems: 'center',
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
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
        padding: 30,
        borderRadius: 20,
        backgroundColor: COLORS.card,
    },
    emptyText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: COLORS.textPrimary,
        marginTop: 15,
        textAlign: 'center',
    },
    emptySub: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 5,
        lineHeight: 20,
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
    fab: {
        position: 'absolute',
        bottom: 130,
        right: 20,
        shadowColor: COLORS.accentGreen,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10
    },
    fabRoutine: { // Specific position for Routine tab
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
      bottom: 130, // Aligned above the dock
      right: 20,
      alignItems: 'center',
      zIndex: 999,
  },
  fabBackdrop: {
      position: 'absolute',
      width: width,
      height: height,
      top: -height + 150, // Offset to cover screen
      left: -width + 40,  // Offset to centered
      backgroundColor: 'rgba(26, 45, 39, 0.85)', // Matches COLORS.background with high opacity
      zIndex: -1,
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
      right: 4, // Align centers of small buttons with main button
      flexDirection: 'row', // Label left, Button right
      alignItems: 'center',
      justifyContent: 'flex-end',
      width: 200, // Width to hold the label
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
      backgroundColor: COLORS.card, // Matches your cards
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginRight: 12, // Space between label and button
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
    // --- Stats Bar ---
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
  
  // --- New Product List Item ---
  productListItemWrapper: {
      backgroundColor: COLORS.card,
      borderRadius: 20,
  },
  productListItem: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      padding: 16,
      gap: 16,
      backgroundColor: COLORS.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
  },
  listItemContent: {
      flex: 1,
      alignItems: 'flex-end',
      gap: 4,
  },
  listItemName: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 16,
      color: COLORS.textPrimary,
      textAlign: 'right',
  },
  listItemType: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textSecondary,
      textAlign: 'right',
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
  
  // --- Swipe to Delete ---
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
  
  // --- Empty State ---
  emptyState: {
      alignItems: 'center',
      marginTop: 40,
      padding: 30,
  },
  emptyText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 18,
      color: COLORS.textPrimary,
      marginTop: 15,
      textAlign: 'center',
  },
  emptySub: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 14,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginTop: 5,
      lineHeight: 20,
  },
  emptyStateButton: {
      flexDirection: 'row-reverse',
      gap: 10,
      marginTop: 20,
      backgroundColor: COLORS.accentGreen,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 14,
      alignItems: 'center',
  },
  emptyStateButtonText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 15,
      color: COLORS.textOnAccent,
  },
  
  // --- Product Details Bottom Sheet (Sophisticated & Scrollable) ---
  sheetContent: {
      backgroundColor: COLORS.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderBottomWidth: 0,
      maxHeight: height * 0.85,
      overflow: 'hidden',
  },
  sheetDraggableArea: {
      paddingBottom: 5,
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
  sheetPillarValue: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 20,
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
    carouselItem: {
        width: 150,
        height: 150,
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 15,
        
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'space-between',
    },
    carouselIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    carouselItemTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.textPrimary,
        textAlign: 'right',
        lineHeight: 19,
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
    routineEmptyText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: COLORS.textDim,
        textAlign: 'right',
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
        gap: 10,
    },
    routineSwitchContainer: {
        flex: 1,
        flexDirection: 'row-reverse',
        backgroundColor: COLORS.card,
        borderRadius: 99,
        padding: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    periodBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 99,
    },
    periodBtnActive: {
        backgroundColor: COLORS.accentGreen,
    },
    periodText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    periodTextActive: {
        color: COLORS.textOnAccent,
    },
    autoBuildButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    
    stepCardContainer: {
      backgroundColor: COLORS.card,
      borderRadius: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
      // Android Shadow
      elevation: 2, 
      // iOS Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
  },
  stepHeaderRow: {
      flexDirection: 'row-reverse', // RTL Layout
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
      paddingRight: 4, // Padding for first item scroll
  },
  chipIconBox: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
  },
  stepProductText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textPrimary,
      flexShrink: 1,
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
      left: 12, // Since it's RTL, left is the "end"
      opacity: 0.5
  },
    
    // ========================================================================
    // --- 9. SECTION: INGREDIENTS ---
    // ========================================================================
    
    // --- Search & Filters ---
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
    filterPill: {
      backgroundColor: COLORS.card,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    filterPillActive: {
      backgroundColor: COLORS.accentGreen,
      borderColor: COLORS.accentGreen,
    },
    filterText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textSecondary,
    },
    filterTextActive: {
      color: COLORS.textOnAccent,
      fontFamily: 'Tajawal-Bold',
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
        flexDirection: 'row-reverse', // Critical: Forces RTL layout
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
    // *** Scientific Name Style (Added) ***
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
    
    // Header
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
    // *** Scientific Name in Modal (Added) ***
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
  
    // Content Sections
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
  
    // *** Synergy & Conflict Styles (Added) ***
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
    
    // Products Chip
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
      marginBottom: 120 // Extra space for dock
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
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 100,
    },
    guideContentContainer: {
        zIndex: 101,
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 30,
        paddingBottom: height * 0.2,
    },
    guideTextBox: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 25,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        width: '100%',
    },
    guideTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 20,
        color: COLORS.textPrimary,
        marginBottom: 10,
    },
    guideText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    guideButton: {
        backgroundColor: COLORS.accentGreen,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 12,
    },
    guideButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: COLORS.textOnAccent,
    },
  
    // ========================================================================
    // --- 13. UNIFIED BOTTOM SHEET & MODAL STYLES ---
    // ========================================================================
    
    // --- Overlays & Containers ---
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
  },
  backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000',
      zIndex: 1,
  },
  sheetContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: height * 0.85, // Standard height for most sheets
      zIndex: 2,
      justifyContent: 'flex-end',
  },
  sheetContent: {
      flex: 1,
      backgroundColor: COLORS.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 20,
  },
  sheetHandleBar: {
      alignItems: 'center',
      paddingVertical: 15,
      backgroundColor: COLORS.card,
      width: '100%',
  },
  sheetHandle: {
      width: 40,
      height: 5,
      backgroundColor: COLORS.border,
      borderRadius: 2.5,
  },
  
  // --- Specific Modal Content Styles ---
  sheetProductTitle: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 20,
      color: COLORS.textPrimary,
      textAlign: 'center',
      paddingHorizontal: 20,
      marginBottom: 10,
  },
  
    // --- Modal/Sheet Header (Unified) ---
    modalHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 15,
      marginBottom: 20,
  },
  modalIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalTitle: {
      flex: 1,
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 18,
      color: COLORS.textPrimary,
      textAlign: 'right',
  },
  modalDescription: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 15,
      color: COLORS.textSecondary,
      textAlign: 'right',
      lineHeight: 24,
      marginBottom: 20,
  },
  relatedProductsTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 14,
      color: COLORS.textPrimary,
      textAlign: 'right',
      marginBottom: 10,
  },
    relatedProductItem: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'right',
        marginBottom: 4,
        paddingHorizontal: 20,
    },
    promptModalSub: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        marginTop: 5,
    },
    promptInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        padding: 14,
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textPrimary,
        textAlign: 'right',
        marginHorizontal: 20,
        marginBottom: 25,
    },
  
    // --- Modal/Sheet Action Buttons ---
    closeButton: {
        backgroundColor: COLORS.accentGreen,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 10,
    },
    closeButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: COLORS.textOnAccent,
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
    },
    promptButtonTextSecondary: {
        color: COLORS.textSecondary,
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
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        marginHorizontal: 20,
    },
    reorderControls: {
        gap: 8,
        marginLeft: 10,
        paddingHorizontal: 5,
    },
    reorderItemText: {
        flex: 1,
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textPrimary,
        textAlign: 'right',
    },
    reorderRemoveButton: {
        padding: 8,
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
    stepCardContainer: {
      backgroundColor: COLORS.card,
      borderRadius: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
      // Android Shadow
      elevation: 2, 
      // iOS Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
  },
  stepHeaderRow: {
      flexDirection: 'row-reverse', // RTL Layout
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
      paddingRight: 4, // Padding for first item scroll
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
  chipIconBox: {
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
  },
  stepProductText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textPrimary,
      flexShrink: 1,
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
      left: 12, // Since it's RTL, left is the "end"
      opacity: 0.5
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
      flexDirection: 'row', // Left to Right for the bar visuals
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
  });