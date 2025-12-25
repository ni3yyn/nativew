import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, Pressable,
  Dimensions, ScrollView, Animated, ImageBackground, Modal, FlatList,
  Platform, UIManager, Alert, StatusBar, ActivityIndicator, LayoutAnimation,
  RefreshControl, Keyboard, Easing, I18nManager
} from 'react-native';
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
import { 
  commonAllergies, 
  commonConditions,
  basicSkinTypes,
  basicScalpTypes
} from '../../src/data/allergiesandconditions';
import { combinedOilsDB } from '../../src/data/alloilsdb';

// --- 1. SYSTEM CONFIG ---
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
                    {/* Header (Draggable) */}
                    <View {...panResponder.panHandlers} style={styles.ingModalHeader}>
                        <View style={styles.sheetHandleBar}><View style={styles.sheetHandle}/></View>
                        <Text style={styles.sheetProductTitle} numberOfLines={2}>{product.productName}</Text>
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                        {/* Pillars */}
                        <View style={styles.sheetPillarsContainer}>
                            <View style={styles.sheetPillar}>
                                <FontAwesome5 name="shield-alt" size={20} color={COLORS.success} />
                                <Text style={styles.sheetPillarLabel}>الأمان</Text>
                                <Text style={[styles.sheetPillarValue, { color: COLORS.success }]}>{safety?.score || 0}%</Text>
                            </View>
                            <View style={styles.sheetDividerVertical} />
                            <View style={styles.sheetPillar}>
                                <FontAwesome5 name="flask" size={20} color={COLORS.info} />
                                <Text style={styles.sheetPillarLabel}>الفعالية</Text>
                                <Text style={[styles.sheetPillarValue, { color: COLORS.info }]}>{efficacy?.score || 0}%</Text>
                            </View>
                        </View>

                        {/* Alerts */}
                        {user_specific_alerts.map((alert, index) => (
                            <View key={index} style={[styles.alertBox, { backgroundColor: COLORS.warning + '15', borderColor: COLORS.warning }]}>
                                <FontAwesome5 name="exclamation-triangle" size={16} color={COLORS.warning} />
                                <Text style={styles.alertBoxText}>{alert.text}</Text>
                            </View>
                        ))}

                        {/* Ingredients */}
                        <Text style={styles.sheetSectionTitle}>المكونات المكتشفة</Text>
                        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                            {product.analysisData?.detected_ingredients?.map((item, i) => (
                                <View key={i} style={styles.ingredientChip}>
                                    <Text style={styles.ingredientChipText}>{item.name}</Text>
                                </View>
                            ))}
                        </View>
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

// --- THE MAIN ANALYSIS HUB COMPONENT ---
const AnalysisSection = ({ loading, savedProducts = [], analysisResults, dismissedInsightIds, handleDismissPraise }) => {
    const [selectedInsight, setSelectedInsight] = useState(null);
    const [showBarrierDetails, setShowBarrierDetails] = useState(false); // New State
  
    const handleSelectInsight = useCallback((insight) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedInsight(insight);
    }, []);
  
    if (loading || !analysisResults) {
        return <ActivityIndicator size="large" color={COLORS.accentGreen} style={{ marginTop: 50 }} />;
    }
  
    if (savedProducts.length === 0) {
        return (
            <ContentCard style={styles.emptyState}>
                <MaterialCommunityIcons name="brain" size={60} color={COLORS.textDim} style={{ opacity: 0.5, marginBottom: 15 }} />
                <Text style={styles.emptyText}>ابدئي التحليل</Text>
                <Text style={styles.emptySub}>أضيفي منتجات إلى رفّكِ أولا ليقوم المدرب الذكي بتحليل روتينكِ.</Text>
            </ContentCard>
        );
    }
    
    const visibleInsights = analysisResults?.aiCoachInsights?.filter(insight => !dismissedInsightIds.includes(insight.id)) || [];
    const focusInsight = visibleInsights.find(i => i.severity === 'critical' || i.severity === 'warning') || null;
    const carouselInsights = visibleInsights.filter(i => i.id !== focusInsight?.id);
    
    // SAFE FALLBACK: Initialize barrier with all fields to prevent "undefined" errors
    const barrier = analysisResults.barrierHealth || { 
        score: 0, 
        status: '...', 
        color: COLORS.textSecondary, 
        desc: '', 
        totalIrritation: 0, 
        totalSoothing: 0,
        offenders: [],
        defenders: []
    };
  
    return (
        <View style={{flex: 1}}>
            <View style={{ paddingBottom: 150 }}> 
                {/* 1. Hero Section */}
                {focusInsight ? <FocusInsight insight={focusInsight} onSelect={handleSelectInsight} /> : <AllClearState />}
  
                {/* 2. Insight Carousel */}
                {carouselInsights.length > 0 && <InsightCarousel insights={carouselInsights} onSelect={handleSelectInsight} />}
  
                {/* 3. ENHANCED BARRIER HEALTH CARD */}
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
                        
                        {/* Footer Hint */}
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
                                   <Text style={styles.routineColumnTitle}>الصباح</Text>
                                   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row-reverse', gap: 6}}>
                                   {analysisResults?.amRoutine?.products?.length > 0 ? (
                                       analysisResults.amRoutine.products.map(p => <Text key={p.id} style={styles.routineProductPill}>{p.productName}</Text>)
                                   ) : ( <Text style={styles.routineEmptyText}>فارغ</Text> )}
                                   </ScrollView>
                               </View>
                                <View style={styles.routineDivider} />
                                <View style={styles.routineColumn}>
                                   <Text style={styles.routineColumnTitle}>المساء</Text>
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
                                   {(analysisResults?.sunProtectionGrade?.notes || []).map((note, i) => (
                                        <Text key={i} style={styles.sunProtectionNote}>{note}</Text>
                                   ))}
                               </View>
                           </View>
                        </ContentCard>
                    </View>
                </View>
            </View>
  
            {selectedInsight && (
                <InsightDetailsModal visible={!!selectedInsight} insight={selectedInsight} onClose={() => setSelectedInsight(null)} />
            )}

            {/* NEW MODAL RENDERED HERE */}
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
  // REMOVED: isAddStepModalVisible and addStepHandler state

  useEffect(() => {
      const initialRoutines = userProfile?.routines || { am: [], pm: [] };
      setRoutines(initialRoutines);
      if (!userProfile?.routines || (initialRoutines.am.length === 0 && initialRoutines.pm.length === 0)) {
          setShowOnboarding(true);
      }
  }, [userProfile]);
  
  const saveRoutines = async (newRoutines) => {
      setRoutines(newRoutines);
      try { await updateDoc(doc(db, 'profiles', user.uid), { routines: newRoutines }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (error) { console.error("Error saving routines:", error); Alert.alert("Error", "Could not save routine."); }
  };

  const switchPeriod = (period) => {
    if (period === activePeriod) return;
    Haptics.selectionAsync();
    // REMOVED: LayoutAnimation.configureNext(...) <- This caused the glitch
    setActivePeriod(period);
};

const handleAddStep = (stepName) => {
  if (stepName) {
      const newStep = { id: `step-${Date.now()}`, name: stepName, productIds: [] };
      const newRoutines = JSON.parse(JSON.stringify(routines));
      
      if (!newRoutines[activePeriod]) newRoutines[activePeriod] = [];
      newRoutines[activePeriod].push(newStep);
      
      // REMOVED: LayoutAnimation.configureNext(...) <- Rely on StaggeredItem instead
      
      saveRoutines(newRoutines);
      
      // Scroll to bottom roughly (optional, if you have a ref to FlatList)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

const handleDeleteStep = (stepId) => {
    
    // 1. Define the core delete logic (reused for both Web and Mobile)
    const performDelete = async () => {
        try {
            const newRoutines = JSON.parse(JSON.stringify(routines));
            newRoutines[activePeriod] = newRoutines[activePeriod].filter(s => s.id !== stepId);
            
            // Optimistic Update
            setRoutines(newRoutines);
            
            // Database Update
            await updateDoc(doc(db, 'profiles', user.uid), { routines: newRoutines });
            
            // Feedback
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            console.error(error);
            // On web, simple alert for error
            if (Platform.OS === 'web') alert("فشل الحذف");
            else Alert.alert("خطأ", "فشل الحذف");
        }
    };

    // 2. Platform Specific Confirmation
    if (Platform.OS === 'web') {
        // WEB: Use standard browser confirm
        // This looks "ugly" (native browser popup) but works 100% for testing logic
        const confirmed = window.confirm("هل أنت متأكد من حذف هذه الخطوة؟");
        if (confirmed) {
            performDelete();
        }
    } else {
        // MOBILE: Use Native App Alert
        Alert.alert(
            "حذف الخطوة",
            "هل أنت متأكد من حذف هذه الخطوة؟ سيتم إزالتها نهائياً من الروتين.",
            [
                { text: "إلغاء", style: "cancel" },
                { 
                    text: "حذف", 
                    style: "destructive", 
                    onPress: performDelete 
                }
            ]
        );
    }
};

  const handleUpdateStep = (stepId, newProductIds) => {
      const newRoutines = JSON.parse(JSON.stringify(routines));
      const stepIndex = newRoutines[activePeriod].findIndex(s => s.id === stepId);
      if (stepIndex !== -1) { newRoutines[activePeriod][stepIndex].productIds = newProductIds; saveRoutines(newRoutines); }
  };

  // --- THE "DERMATOLOGIST ARCHITECT" ENGINE (Gen 9 - Complete & Un-omitted) ---
const handleAutoBuildRoutine = () => {
    // 0. Minimum Viable Shelf Check
    if (savedProducts.length < 2) {
        const msg = "نحتاج إلى منتجين على الأقل (غسول + مرطب) لبناء روتين ذكي.";
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert("الرف غير كافٍ", msg);
        return;
    }

    const runBioAlgorithm = async () => {
        // --- 1. LOAD USER BIO-CONTEXT ---
        // Robustly fetch user settings with fallbacks
        const SETTINGS = userProfile?.settings || {};
        const SKIN_TYPE = SETTINGS.skinType || 'normal';
        const CONDITIONS = SETTINGS.conditions || []; // e.g., ['pregnancy', 'rosacea', 'eczema']
        const GOALS = SETTINGS.goals || []; // e.g., ['acne', 'anti_aging']

        // Derived Bio-Flags
        const IS_PREGNANT = CONDITIONS.includes('pregnancy');
        const IS_OILY = SKIN_TYPE === 'oily' || SKIN_TYPE === 'combo';
        const IS_DRY = SKIN_TYPE === 'dry';
        const IS_ACNE_PRONE = IS_OILY || CONDITIONS.includes('acne_prone') || GOALS.includes('acne');
        const IS_SENSITIVE = 
            CONDITIONS.includes('sensitive_skin') || 
            CONDITIONS.includes('rosacea') || 
            CONDITIONS.includes('eczema') || 
            SKIN_TYPE === 'sensitive';

        // --- HELPER 1: TEXTURE PHYSICS (0=Water -> 100=Balm) ---
        // Determines layering order based on product density
        const calculateViscosity = (p) => {
            const type = p.analysisData?.product_type;
            const name = p.productName.toLowerCase();
            let v = 50; // Default Medium Viscosity
            
            // Base Types
            if (type === 'toner') v = 10;
            else if (type === 'serum' || type === 'treatment') v = 30;
            else if (type === 'lotion_cream') v = 70;
            else if (type === 'oil_blend') v = 90;
            else if (type === 'sunscreen') v = 99; // Always last in AM
            else if (type === 'cleanser') v = 0;   // Always first

            // Keyword Physics Modifiers
            if (name.includes('water') || name.includes('essence') || name.includes('mist') || name.includes('aqua')) v -= 5;
            if (name.includes('gel')) v -= 15; // Gel is lighter than cream
            if (name.includes('milk') || name.includes('lotion')) v -= 5;
            if (name.includes('rich') || name.includes('balm') || name.includes('butter') || name.includes('thick')) v += 15;
            
            // Clamp between 0 and 100
            return Math.min(Math.max(v, 0), 100);
        };

        // --- HELPER 2: DEEP CHEMICAL PROFILING ---
        // Scans GLOBAL_INGREDIENTS_MAP to build a rich chemical profile
        const getChemicalData = (p) => {
            const data = {
                role: 'generic',
                actives: [],
                conflicts: [],   // From DB Negative Synergy
                synergies: {},   // From DB Synergy
                risks: [],       // Pregnancy, Sensitivity flags
                properties: {
                    isPhotosensitive: false,
                    isHumectant: false,
                    isOcclusive: false,
                    isLowPh: false, // For Pure Vit C / Acids / pH Dependent
                    isComedogenic: false
                },
                benefit: 'maintenance', // purpose for naming
                keyIngredient: null     // name of hero ingredient
            };

            const ingredients = p.analysisData?.detected_ingredients || [];
            
            ingredients.forEach(i => {
                // Lookup by ID or Name
                const dbIng = GLOBAL_INGREDIENTS_MAP.get(i.id) || GLOBAL_INGREDIENTS_MAP.get(i.name.toLowerCase());
                
                if (dbIng) {
                    const iName = (dbIng.name || '').toLowerCase();
                    const iType = (dbIng.chemicalType || '').toLowerCase();

                    // 1. Database Metadata Extraction
                    if (dbIng.synergy) Object.assign(data.synergies, dbIng.synergy);
                    if (dbIng.negativeSynergy) data.conflicts.push(...Object.keys(dbIng.negativeSynergy));

                    // 2. Role & Risk Logic
                    if (iType.includes('retinoid') || iName.includes('retinol') || iName.includes('tretinoin') || iName.includes('adapalene')) {
                        data.role = 'retinoid';
                        data.properties.isPhotosensitive = true;
                        data.actives.push('retinoid');
                        data.risks.push('pregnancy'); // Unsafe for pregnancy
                        data.benefit = 'anti_aging';
                        data.keyIngredient = 'الريتينول';
                    }
                    else if (iName.includes('benzoyl peroxide')) {
                        data.role = 'acne_treatment';
                        data.properties.isPhotosensitive = true;
                        data.actives.push('bpo');
                        data.benefit = 'acne';
                        data.keyIngredient = 'بنزاك';
                    }
                    else if (iName === 'ascorbic acid' || iName === 'l-ascorbic') {
                        data.role = 'vitamin_c';
                        data.properties.isLowPh = true; // Needs acidic pH
                        data.actives.push('vitamin-c');
                        data.benefit = 'brightening';
                        data.keyIngredient = 'فيتامين C';
                    }
                    else if (iName.includes('salicylic') || iName.includes('glycolic') || iName.includes('lactic') || iType.includes('aha') || iType.includes('bha')) {
                        // Don't mark cleansers as exfoliants here (handled in fallback)
                        if (p.analysisData?.product_type !== 'cleanser') {
                            data.role = 'exfoliant';
                            data.properties.isLowPh = true;
                            data.properties.isPhotosensitive = true;
                            data.actives.push('acid');
                            data.benefit = 'texture';
                            data.keyIngredient = 'أحماض مقشرة';
                            if (iName.includes('salicylic')) data.risks.push('pregnancy_caution');
                        }
                    }
                    else if (iName.includes('copper') && iType.includes('peptide')) {
                        data.role = 'copper_peptides';
                        data.actives.push('copper');
                        data.benefit = 'repair';
                        data.keyIngredient = 'ببتيدات النحاس';
                    }

                    // 3. Physical Properties (For TEWL & Comedogenic Checks)
                    if (iName.includes('hyaluronic') || iName.includes('glycerin') || iName.includes('urea') || iName.includes('aloe')) {
                        data.properties.isHumectant = true;
                    }
                    if (iName.includes('dimethicone') || iName.includes('shea') || iName.includes('oil') || iName.includes('petrolatum') || iName.includes('squalane')) {
                        data.properties.isOcclusive = true;
                    }
                    if (iName.includes('wax') || iName.includes('coconut oil') || iName.includes('algae') || iName.includes('myristate')) {
                        data.properties.isComedogenic = true;
                    }
                    
                    // 4. Benefit Naming
                    if (!data.keyIngredient) {
                        if (iName.includes('niacinamide')) { data.benefit = 'pores'; data.keyIngredient = 'نياسيناميد'; }
                        else if (iName.includes('ceramide')) { data.benefit = 'barrier'; data.keyIngredient = 'سيراميد'; }
                        else if (iName.includes('centella')) { data.benefit = 'soothing'; data.keyIngredient = 'سنتيلا'; }
                    }
                }
            });

            // Fallback Role Mapping (If no strong active found)
            const pType = p.analysisData?.product_type;
            if (data.role === 'generic') {
                if (pType === 'sunscreen') { data.role = 'sunscreen'; data.benefit = 'protection'; }
                else if (pType === 'cleanser') { data.role = 'cleanser'; data.benefit = 'cleansing'; }
                else if (pType === 'lotion_cream') { data.role = 'moisturizer'; data.benefit = 'barrier'; }
                else if (pType === 'oil_blend') { data.role = 'oil'; data.properties.isOcclusive = true; data.benefit = 'locking'; }
            }

            return data;
        };

        // --- STEP 1: INVENTORY SCAN & FILTERING ---
        let logs = []; // To store exclusion reasons
        let processedInventory = [];

        savedProducts.forEach(p => {
            const pName = p.productName.toLowerCase();
            const pType = p.analysisData?.product_type;

            // FILTER 1: Face Only (Exclude Hair/Body)
            if (['shampoo', 'conditioner', 'body', 'shower', 'soap'].some(k => pName.includes(k) || pType === k)) return;

            // Compute Data
            const chem = getChemicalData(p);
            const viscosity = calculateViscosity(p);
            
            // FILTER 2: Pregnancy Safety
            if (IS_PREGNANT && chem.risks.includes('pregnancy')) {
                logs.push(`⛔ تم استبعاد "${p.productName}" (غير آمن للحمل).`);
                return;
            }

            // FILTER 3: Sensitive Skin Safety
            if (IS_SENSITIVE && (chem.role === 'exfoliant' || chem.role === 'retinoid')) {
                // Heuristic: If sensitive, exclude leave-on strong acids/retinoids for safety
                // Exception: Low strength might be okay, but AI plays it safe.
                if (chem.role === 'exfoliant' && pType !== 'cleanser') {
                    logs.push(`⚠️ تم استبعاد "${p.productName}" (قوي جداً للبشرة الحساسة).`);
                    return;
                }
            }

            // FILTER 4: Comedogenic Risk (Acne/Oily)
            if (IS_ACNE_PRONE && chem.properties.isComedogenic && chem.role !== 'cleanser') {
                 logs.push(`⚠️ تم استبعاد "${p.productName}" (مكونات قد تسد المسام).`);
                 return;
            }

            // SCORING: Personal Match (0-100)
            let score = 50;
            // Goal alignment
            if (GOALS.includes('acne') && (chem.benefit === 'acne' || chem.benefit === 'pores')) score += 20;
            if (GOALS.includes('anti_aging') && (chem.benefit === 'anti_aging' || chem.benefit === 'repair')) score += 20;
            if (GOALS.includes('hydration') && chem.benefit === 'barrier') score += 15;
            
            // Texture alignment
            if (IS_OILY && viscosity < 50) score += 15; // Loves lightweight
            if (IS_DRY && viscosity > 60) score += 15;  // Loves heavyweight
            
            processedInventory.push({ ...p, chem, viscosity, matchScore: score });
        });

        // --- STEP 2: REDUNDANCY CHECK (Best in Class) ---
        // Prevents using 2 sunscreens, 3 moisturizers, or multiple retinoids.
        const pickBest = (list, role) => {
            const candidates = list.filter(p => p.chem.role === role);
            if (candidates.length <= 1) return list;
            
            // Sort by Match Score (Highest first)
            candidates.sort((a, b) => b.matchScore - a.matchScore);
            const bestId = candidates[0].id;
            
            // Return list where (role is different OR id is the winner)
            return list.filter(p => p.chem.role !== role || p.id === bestId);
        };
        
        // Execute Redundancy Filters
        processedInventory = pickBest(processedInventory, 'sunscreen');
        processedInventory = pickBest(processedInventory, 'retinoid');
        processedInventory = pickBest(processedInventory, 'vitamin_c');
        processedInventory = pickBest(processedInventory, 'moisturizer');
        processedInventory = pickBest(processedInventory, 'cleanser'); // Single cleanser per "type"

        // --- STEP 3: DISTRIBUTION (AM/PM) & BARRIER BUDGET ---
        let am = [], pm = [];
        
        // Budget: Sensitive skin gets fewer "Active Points"
        let barrierBudget = IS_SENSITIVE ? 2 : 4; 
        let currentLoad = 0;

        // Sort priority: Actives first so they consume budget
        processedInventory.sort((a, b) => b.chem.actives.length - a.chem.actives.length);

        processedInventory.forEach(p => {
            const r = p.chem.role;
            const irritationCost = p.chem.actives.length > 0 ? (r === 'retinoid' ? 2 : 1) : 0;

            // Check Budget
            if (irritationCost > 0) {
                if (currentLoad + irritationCost > barrierBudget) {
                    logs.push(`🛡️ تم تأجيل "${p.productName}" (ميزانية الحاجز ممتلئة - Skin Cycling).`);
                    return; // Exclude
                }
                currentLoad += irritationCost;
            }

            // Allocation Rules
            if (r === 'sunscreen') { am.push(p); return; }
            if (r === 'retinoid') { pm.push(p); return; }
            if (p.chem.properties.isPhotosensitive) { pm.push(p); return; } // Acids/BPO -> PM
            if (r === 'vitamin_c') { am.push(p); return; } // Vit C -> AM usually
            
            if (r === 'cleanser') {
                if (p.viscosity > 50) pm.push(p); // Oil/Balm cleanse -> PM
                else { am.push(p); pm.push(p); }  // Gel/Foam -> Both
                return;
            }
            
            if (r === 'moisturizer') {
                if (IS_OILY && p.viscosity > 80) pm.push(p); // Heavy cream PM only for oily
                else { am.push(p); pm.push(p); }
                return;
            }
            
            if (r === 'oil') { pm.push(p); return; } // Oils ruin sunscreen film -> PM

            // Generic Fallback
            am.push(p); pm.push(p);
        });

        // --- COMPLICATION 1: SYNERGY LABELS ---
        // Detects if products enhance each other based on DB Data
        const applySynergy = (list) => list.map(p => {
            let label = null;
            list.forEach(other => {
                if (p.id !== other.id) {
                    Object.keys(p.chem.synergies).forEach(k => {
                        // Check if other product contains the synergistic ingredient
                        if (other.analysisData.detected_ingredients.some(i => i.name.toLowerCase().includes(k))) {
                            label = `Power Duo ⚡ (مع ${other.productName.split(' ')[0]})`;
                        }
                    });
                }
            });
            return label ? { ...p, synergyLabel: label } : p;
        });
        
        am = applySynergy(am);
        pm = applySynergy(pm);

        // --- STEP 4: SCIENTIFIC SORTING (The Layering Engine) ---
        const sortRoutine = (list, timeOfDay) => {
            return list.sort((a, b) => {
                // A. pH-Stability Priority (Low pH Acids First)
                if (a.chem.properties.isLowPh && !b.chem.properties.isLowPh && a.chem.role !== 'cleanser') return -1;
                if (b.chem.properties.isLowPh && !a.chem.properties.isLowPh && b.chem.role !== 'cleanser') return 1;

                // B. Functional Priority Order
                const getPrio = (p) => {
                    const r = p.chem.role;
                    if (r === 'cleanser') return 1;
                    if (r === 'acid_toner') return 2;
                    if (p.chem.properties.isLowPh) return 3; // Actives like Pure C
                    
                    // COMPLICATION 2: SENSITIVITY BUFFERING (Sandwich Method)
                    // If Sensitive & PM, Retinol (Priority 8) goes AFTER Moisturizer (Priority 7)
                    if (r === 'retinoid') return (timeOfDay === 'pm' && IS_SENSITIVE) ? 8 : 4;
                    
                    if (r === 'generic') return 5;
                    
                    if (r === 'moisturizer') return 7;
                    if (r === 'oil') return 9;
                    if (r === 'sunscreen') return 10;
                    return 5;
                };

                const prioA = getPrio(a);
                const prioB = getPrio(b);
                if (prioA !== prioB) return prioA - prioB;

                // C. Physics Tie-Breaker (Viscosity)
                return a.viscosity - b.viscosity;
            });
        };

        const finalAM = sortRoutine(am, 'am');
        const finalPM = sortRoutine(pm, 'pm');

        // --- COMPLICATION 3: TEWL (Hydration Leak) CHECK ---
        const checkTEWL = (routine, name) => {
            const hasHumectant = routine.some(p => p.chem.properties.isHumectant);
            const hasOcclusive = routine.some(p => p.chem.properties.isOcclusive || p.chem.role === 'moisturizer' || p.chem.role === 'sunscreen');
            if (hasHumectant && !hasOcclusive) {
                logs.push(`💧 تحذير ${name}: روتينك يحتوي على مرطبات مائية بدون إغلاق (Occlusive). قد يسبب جفافاً.`);
            }
        };
        // Check PM (most critical for TEWL)
        checkTEWL(finalPM, "المساء");

        // --- STEP 5: PURPOSE-DRIVEN NAMING ---
        const generateName = (p, time, idx, fullList) => {
            if (p.synergyLabel) return p.synergyLabel;

            const r = p.chem.role;
            const b = p.chem.benefit; // barrier, acne, etc.
            const k = p.chem.keyIngredient;

            // A. Specific Roles
            if (r === 'cleanser') {
                if (time === 'pm' && p.viscosity > 50) return "الخطوة 1: إذابة الدهون (زيتي)";
                if (time === 'pm' && fullList.some(x => x.chem.role === 'cleanser' && x.id !== p.id && x.viscosity > 50)) return "الخطوة 2: تنظيف عميق (مائي)";
                return "غسول يومي (Cleansing)";
            }
            if (r === 'toner') return "تهيئة البشرة (Prep)";
            if (r === 'sunscreen') return "حماية قصوى (Protection) 🛡️";
            if (r === 'moisturizer') return IS_DRY ? "ترطيب عميق (Repair)" : "ترطيب يومي (Hydration)";
            if (r === 'oil') return "إغلاق المسام (Lock)";
            if (r === 'vitamin_c') return "مضاد أكسدة (Antioxidant) ✨";
            if (r === 'retinoid') return IS_SENSITIVE ? "ريتينول (Buffer Method) 🥪" : "ريتينول (تجديد ليلي)";
            if (r === 'exfoliant') return "تقشير (Exfoliation)";
            if (r === 'acne_treatment') return "علاج موضعي (Spot Treat)";
            
            // B. Generic Products named by Purpose/Ingredient
            if (k) {
                if (b === 'barrier') return `${k} (ترميم الحاجز)`;
                if (b === 'pores') return `${k} (تنظيم المسام)`;
                if (b === 'hydration') return `${k} (نضارة مائية)`;
                if (b === 'soothing') return `${k} (تهدئة الاحمرار)`;
                return `سيروم ${k}`;
            }
            
            return p.productName;
        };

        // --- UI MAPPING & SAVING ---
        const toSteps = (list, time) => list.map((p, i) => ({
            id: `step-${Date.now()}-${i}-${Math.random()}`,
            name: generateName(p, time, i, list),
            productIds: [p.id]
        }));

        await saveRoutines({ am: toSteps(finalAM, 'am'), pm: toSteps(finalPM, 'pm') });

        // --- FINAL REPORT ---
        let report = `✅ تم بناء الروتين المعماري (Gen 9)\n\n`;
        if (IS_SENSITIVE) report += `🥪 تم تفعيل تقنية "الساندويتش" للبشرة الحساسة.\n`;
        if (IS_PREGNANT) report += `👶 وضع "أمان الحمل" نشط.\n`;
        if (IS_ACNE_PRONE) report += `🔍 فلتر "المسام" نشط.\n`;
        if (am.some(p => p.chem.properties.isLowPh)) report += `⚗️ تم ترتيب الأحماض حسب استقرار الـ pH.\n`;
        
        if (logs.length > 0) report += `\n📝 ملاحظات الطبيب الرقمي:\n${logs.slice(0, 3).join('\n')}`;

        if (Platform.OS === 'web') setTimeout(() => window.alert(report), 500);
        else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => Alert.alert("المعمار الرقمي 🧬", report), 600);
        }
    };

    // --- INTRO PROMPT ---
    const intro = "تشغيل 'المعمار الرقمي' (Gen 9)؟\n\n1. تسمية الخطوات حسب الغرض العلاجي.\n2. ترتيب الطبقات حسب الثبات الكيميائي (pH).\n3. عزل المواد المهيجة تلقائياً.";

    if (Platform.OS === 'web') {
        if(window.confirm(intro)) runBioAlgorithm();
    } else {
        Alert.alert("بناء الروتين المتقدم", intro, [
            { text: "إلغاء", style: "cancel" },
            { text: "بدء التحليل", onPress: runBioAlgorithm }
        ]);
    }
};

  return (
    <View style={{ flex: 1 }}>
        <View style={styles.routineHeaderContainer}>
             <View style={styles.routineSwitchContainer}>
                <PressableScale onPress={() => switchPeriod('pm')} style={[styles.periodBtn, activePeriod==='pm' && styles.periodBtnActive]}><Feather name="moon" size={16} color={activePeriod==='pm' ? COLORS.textOnAccent : COLORS.textSecondary} /><Text style={[styles.periodText, activePeriod==='pm' && styles.periodTextActive]}>المساء</Text></PressableScale>
                <PressableScale onPress={() => switchPeriod('am')} style={[styles.periodBtn, activePeriod==='am' && styles.periodBtnActive]}><Feather name="sun" size={16} color={activePeriod==='am' ? COLORS.textOnAccent : COLORS.textSecondary} /><Text style={[styles.periodText, activePeriod==='am' && styles.periodTextActive]}>الصباح</Text></PressableScale>
            </View>
             <PressableScale onPress={handleAutoBuildRoutine} style={styles.autoBuildButton}><MaterialCommunityIcons name="auto-fix" size={20} color={COLORS.accentGreen} /></PressableScale>
        </View>
        <FlatList
            data={routines[activePeriod]}
            renderItem={({ item, index }) => (
                // WRAP RoutineStepCard with StaggeredItem
                <StaggeredItem index={index}> 
                    <RoutineStepCard 
                        step={item} 
                        index={index} // Pass index to RoutineStepCard if it uses it (which it does for the badge)
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
                <View style={styles.routineEmptyState}><MaterialCommunityIcons name="playlist-edit" size={60} color={COLORS.textDim} style={{opacity: 0.5}}/><Text style={styles.routineEmptyTitle}>الروتين فارغ</Text><Text style={styles.routineEmptySub}>استخدم زر "+" في الأسفل لبناء روتينك المخصص.</Text></View>
            )}
        />
        
        {/* The FAB now calls the hoisted function, passing its own logic as a callback */}
        <PressableScale style={styles.fabRoutine} onPress={() => onOpenAddStepModal(handleAddStep)}>
            <LinearGradient colors={[COLORS.accentGreen, '#4a8a73']} style={styles.fabGradient}><FontAwesome5 name="plus" size={20} color={COLORS.textOnAccent} /></LinearGradient>
        </PressableScale>

        {selectedStep && (
    <StepEditorModal 
        isVisible={!!selectedStep} 
        onClose={() => setSelectedStep(null)} 
        step={selectedStep} 
        onSave={handleUpdateStep} 
        allProducts={savedProducts} // <--- THIS is the connection to the shelf
    />
)}
        {showOnboarding && <RoutineOnboardingGuide onDismiss={() => setShowOnboarding(false)} />}
        
        {/* The AddStepModal is NO LONGER RENDERED HERE */}
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
const IngredientsSection = ({ products }) => {
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedIngredient, setSelectedIngredient] = useState(null);
    const searchAnim = useRef(new Animated.Value(0)).current;

    // Data State
    const [allIngredients, setAllIngredients] = useState([]);
    
    // LAZY LOADING STATE
    const BATCH_SIZE = 10;
    const INITIAL_LOAD = 15;
    const [renderLimit, setRenderLimit] = useState(INITIAL_LOAD);

    useEffect(() => {
        Animated.spring(searchAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
    }, []);

    // --- DATA PREPARATION ---
    useEffect(() => {
        // Reset limit when products change
        setRenderLimit(INITIAL_LOAD);

        // Heavy Data Processing
        const map = new Map();
        products.forEach(p => {
            const productIngs = p.analysisData?.detected_ingredients || [];
            productIngs.forEach(rawIng => {
                const richData = findIngredientData(rawIng.name);
                const key = richData ? richData.id : rawIng.name.toLowerCase();
                
                if (!map.has(key)) {
                    map.set(key, {
                        ...richData, 
                        displayName: richData ? richData.name : rawIng.name, 
                        isRich: !!richData, 
                        count: 1,
                        productIds: [p.id],
                        productNames: [p.productName],
                        functionalCategory: richData?.functionalCategory || rawIng.category || 'غير مصنف'
                    });
                } else {
                    const data = map.get(key);
                    data.count++;
                    if (!data.productIds.includes(p.id)) {
                        data.productIds.push(p.id);
                        data.productNames.push(p.productName);
                    }
                }
            });
        });
        
        const sorted = Array.from(map.values()).sort((a,b) => b.count - a.count);
        setAllIngredients(sorted);
        
        // Note: We removed the setTimeout that forced full render to prevent freezing
    }, [products]);

    // --- FILTERING ---
    const filteredList = useMemo(() => {
        return allIngredients.filter(ing => {
            const matchesSearch = ing.displayName.toLowerCase().includes(search.toLowerCase()) || 
                                  (ing.scientific_name && ing.scientific_name.toLowerCase().includes(search.toLowerCase()));
            
            if (!matchesSearch) return false;

            if (activeFilter === 'all') return true;
            if (activeFilter === 'actives') return ['مكون فعال', 'مقشر', 'مضاد أكسدة', 'مبيض'].includes(ing.functionalCategory);
            if (activeFilter === 'moisturizers') return ['مرطب / مطري', 'مرطب'].includes(ing.functionalCategory);
            if (activeFilter === 'harmful') return ['مكون ضار', 'مادة حافظة (مثيرة للجدل)'].includes(ing.functionalCategory) || ing.warnings?.some(w => w.level === 'risk');
            if (activeFilter === 'natural') return ing.chemicalType?.includes('نباتي') || ing.chemicalType?.includes('طبيعي');
            
            return true;
        });
    }, [allIngredients, search, activeFilter]);

    // Reset render limit when search or filter changes
    useEffect(() => {
        setRenderLimit(INITIAL_LOAD);
    }, [search, activeFilter]);

    // Slice based on lazy load limit
    const visibleData = filteredList.slice(0, renderLimit);
    const hasMore = renderLimit < filteredList.length;

    const handleLoadMore = () => {
        if (hasMore) {
            Haptics.selectionAsync();
            setRenderLimit(prev => prev + BATCH_SIZE);
        }
    };

    const filters = [
        { id: 'all', label: 'الكل', icon: 'layer-group' },
        { id: 'actives', label: 'مكونات فعالة', icon: 'bolt' },
        { id: 'moisturizers', label: 'مرطبات', icon: 'tint' },
        { id: 'natural', label: 'طبيعي', icon: 'leaf' },
        { id: 'harmful', label: 'تنبيه', icon: 'exclamation-triangle' },
    ];

    // Footer Component for "Load More"
    const ListFooter = () => {
        if (!hasMore) return <View style={{ height: 100 }} />; // Spacer
        
        return (
            <PressableScale onPress={handleLoadMore} style={styles.loadMoreButton}>
                <Text style={styles.loadMoreText}>عرض المزيد ({Math.min(BATCH_SIZE, filteredList.length - renderLimit)})</Text>
                <FontAwesome5 name="chevron-down" size={12} color={COLORS.textOnAccent} />
            </PressableScale>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Search */}
            <Animated.View style={[styles.searchBar, { transform: [{ scale: searchAnim }] }]}>
                <TextInput 
                    placeholder="بحث في المكونات (العربية أو الإنجليزية)..." 
                    placeholderTextColor={COLORS.textDim} 
                    style={styles.searchInput} 
                    value={search} 
                    onChangeText={setSearch} 
                />
                <FontAwesome5 name="search" size={16} color={COLORS.textDim} />
            </Animated.View>
            
            {/* Filters */}
            <View style={{marginBottom: 15}}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection:'row-reverse', paddingHorizontal: 5}}>
                    {filters.map((f) => (
                        <PressableScale
                            key={f.id}
                            onPress={() => setActiveFilter(f.id)}
                            style={[styles.filterPill, activeFilter === f.id && styles.filterPillActive, {marginLeft: 8}]}
                        >
                            <FontAwesome5 name={f.icon} size={12} color={activeFilter === f.id ? COLORS.textOnAccent : COLORS.textDim} />
                            <Text style={[styles.filterText, activeFilter === f.id && styles.filterTextActive]}>{f.label}</Text>
                        </PressableScale>
                    ))}
                </ScrollView>
            </View>

            {/* Optimized Lazy List */}
            {visibleData.length > 0 ? (
                <FlatList
                    data={visibleData}
                    keyExtractor={(item, index) => item.id + index}
                    renderItem={({ item, index }) => (
                        <IngredientCard 
                            item={item} 
                            index={index} 
                            onPress={setSelectedIngredient}
                        />
                    )}
                    // Crucial: scrollEnabled={false} prevents conflict with parent ScrollView
                    scrollEnabled={false} 
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    ListFooterComponent={ListFooter}
                    contentContainerStyle={{ paddingBottom: 50 }}
                />
            ) : (
                /* Empty State */
                allIngredients.length > 0 && (
                    <View style={styles.emptyState}>
                        <FontAwesome5 name="flask" size={40} color={COLORS.textDim} style={{opacity:0.5}} />
                        <Text style={styles.emptyText}>لم يتم العثور على نتائج</Text>
                    </View>
                )
            )}

            {/* Detail Modal */}
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
                                    {/* Scientific Name Style */}
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

                        {/* Synergies & Conflicts (Added Styles) */}
                        {(ingredient.synergy || ingredient.negativeSynergy) && (
                            <View style={styles.ingSection}>
                                <Text style={styles.ingSectionTitle}>التفاعلات</Text>
                                <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.interactionHeader}>✅ تآزر ممتاز مع</Text>
                                        {Object.entries(ingredient.synergy || {}).map(([key, val]) => (
                                            <Text key={key} style={styles.synergyItem}>• {findIngredientData(key)?.name || key}</Text>
                                        ))}
                                        {(!ingredient.synergy || Object.keys(ingredient.synergy).length === 0) && <Text style={styles.noDataText}>لا يوجد تآزر معروف</Text>}
                                    </View>
                                    <View style={{ width: 1, backgroundColor: COLORS.border }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.interactionHeader}>❌ تجنب خلطه مع</Text>
                                        {Object.entries(ingredient.negativeSynergy || {}).map(([key, val]) => (
                                            <Text key={key} style={styles.conflictItem}>• {findIngredientData(key)?.name || key}</Text>
                                        ))}
                                        {(!ingredient.negativeSynergy || Object.keys(ingredient.negativeSynergy).length === 0) && <Text style={styles.noDataText}>آمن للمزج</Text>}
                                    </View>
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

const findIngredientData = (name) => {
    if (!name) return null; // Safety check for input
    const search = name.toLowerCase().trim();
    
    return combinedOilsDB.ingredients.find(item => 
        (item.id === search) || 
        (item.name && item.name.toLowerCase() === search) || 
        (item.scientific_name && item.scientific_name.toLowerCase() === search) ||
        (item.searchKeywords && item.searchKeywords.some(k => k && k.toLowerCase() === search))
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
    const renderGoalDashboard = (data) => (
        <View>
            {/* 1. Large Score Circle */}
            <View style={{ alignItems: 'center', marginBottom: 25 }}>
                <ChartRing 
                    percentage={data.score} 
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
                        <Text style={[styles.alertBoxText, { color: COLORS.danger }]}>تم إيقاف تقدم الهدف عند 35% لأنك لا تستخدمين واقي شمس. المكونات العلاجية لن تعمل بفعالية بدونه.</Text>
                    </View>
                </View>
            )}

            {/* 3. Hero Ingredients Found (Green) */}
            <View style={styles.ingSection}>
                <Text style={styles.ingSectionTitle}>✅ مكونات نشطة لديكِ</Text>
                <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                    {data.foundHeroes.length > 0 ? (
                        data.foundHeroes.map((h, i) => (
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
            {data.score < 100 && (
                <View style={styles.ingSection}>
                    <Text style={styles.ingSectionTitle}>🧪 مقترحات لرفع النتيجة</Text>
                    <Text style={{ fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, marginBottom: 10, textAlign: 'right' }}>
                        ابحثي عن منتجات (سيروم أو كريم) تحتوي على:
                    </Text>
                    <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 }}>
                        {data.missingHeroes.map((h, i) => (
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
            {insight.related_products.length > 0 && (
                <View style={styles.ingSection}>
                    <Text style={styles.ingSectionTitle}>المنتجات المساهمة</Text>
                    {insight.related_products.map((p, i) => (
                        <View key={i} style={styles.productChip}>
                            <FontAwesome5 name="check" size={12} color={COLORS.accentGreen} />
                            <Text style={styles.productChipText}>{p}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>

                    <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={[styles.modalIconContainer, { backgroundColor: mainColor + '20' }]}>
                                <FontAwesome5 
                                    name={insight.type === 'goal_analysis' ? 'bullseye' : (insight.severity === 'critical' ? 'shield-alt' : 'info-circle')} 
                                    size={24} 
                                    color={mainColor} 
                                />
                            </View>
                            <Text style={styles.modalTitle}>{insight.title}</Text>
                        </View>

                        {/* CONDITIONAL RENDERING: Standard Text vs. Rich Dashboard */}
                        {insight.type === 'goal_analysis' && insight.customData ? (
                            renderGoalDashboard(insight.customData)
                        ) : (
                            // Fallback for standard insights
                            <>
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

                        <Pressable onPress={handleClose} style={[styles.closeButton, { backgroundColor: mainColor, marginTop: 30 }]}>
                            <Text style={styles.closeButtonText}>إغلاق</Text>
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

const GLOBAL_INGREDIENTS_MAP = new Map();
combinedOilsDB.ingredients.forEach(ing => { 
    if (ing && ing.id) GLOBAL_INGREDIENTS_MAP.set(ing.id, ing);
    // Optional: Also map by name for faster fallback lookups
    if (ing && ing.name) GLOBAL_INGREDIENTS_MAP.set(ing.name.toLowerCase(), ing);
});

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

// Initialize once
const { index: ingredientIndex, normalize } = buildIngredientIndex(combinedOilsDB);

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
  const openAddStepModal = (onAddCallback) => {
    setAddStepHandler(() => onAddCallback); // Store the function to call on "Add"
    setAddStepModalVisible(true);
  };
  // Scroll & Animation Refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = scrollY.interpolate({ 
    inputRange: [0, scrollDistance], 
    outputRange: [headerMaxHeight, headerMinHeight], 
    extrapolate: 'clamp' 
  });

  const expandedHeaderOpacity = scrollY.interpolate({
    inputRange: [0, scrollDistance / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const expandedHeaderTranslate = scrollY.interpolate({
    inputRange: [0, scrollDistance],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const collapsedHeaderOpacity = scrollY.interpolate({
    inputRange: [scrollDistance / 2, scrollDistance],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  // Transition for Tab Switch
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslate = useRef(new Animated.Value(0)).current;
  const switchTab = (tab) => {
    if(tab === activeTab) return;
    Haptics.selectionAsync();
    
    // We removed LayoutAnimation here to prevent UI blocking.
    // The NatureDock component handles the pill animation separately.
    setActiveTab(tab);
};

  // Particles
  const particles = useMemo(() => [...Array(15)].map((_, i) => ({ 
    id: i, // <--- Renamed from key to id
    size: Math.random()*5+3, 
    startX: Math.random()*width, 
    duration: 8000+Math.random()*7000, 
    delay: Math.random()*5000 
  })), []);

  const [dismissedInsightIds, setDismissedInsightIds] = useState([]);
  

  const handleDismissPraise = (insightId) => {
    if (!dismissedInsightIds.includes(insightId)) {
      setDismissedInsightIds(prev => [...prev, insightId]);
    }
  };

  // ========================================================================
  // --- THE PERSONALIZED DERMATOLOGY ENGINE (Updated) ---
  // ========================================================================
  const analysisResults = useMemo(() => {
    
    // --- 0. INITIAL SETUP & DATA PREP ---
    
    combinedOilsDB.ingredients.forEach(ing => { if (ing && ing.id) GLOBAL_INGREDIENTS_MAP.set(ing.id, ing); });

    const results = {
        aiCoachInsights: [],
        amRoutine: { products: [], conflicts: 0, synergies: 0 },
        pmRoutine: { products: [], conflicts: 0, synergies: 0 },
        sunProtectionGrade: { score: 0, notes: [] },
        barrierHealth: { score: 0, status: 'Optimal', color: COLORS.success, desc: '' },
        formulationBreakdown: { actives: 0, hydrators: 0, antioxidants: 0 }
    };

    const validProducts = savedProducts.filter(p => p && p.analysisData);
    if (!userProfile || validProducts.length === 0) return results;

    const settings = userProfile.settings || {};
    const { skinType, scalpType, conditions = [], allergies = [], goals = [], blacklistedIngredients = [] } = settings;
    
    const insightsMap = new Map();
    const addInsight = (id, title, summary, details, severity, related_products = [], customData = null) => {
        if (!insightsMap.has(id)) {
            insightsMap.set(id, { 
                id, 
                title, 
                short_summary: summary, 
                details, 
                severity, 
                related_products,
                customData, // <--- NEW FIELD
                type: customData ? 'goal_analysis' : 'standard' // Flag for UI
            });
        }
    };

    // --- 1. DEFINE CONSTANTS & HELPERS ---
    const NIACINAMIDE_ID = 'niacinamide';
    const PURE_VITAMIN_C_ID = 'vitamin-c';
    const STRONG_ACTIVES = new Set(['Retinoid', 'AHA', 'BHA']);
    const BARRIER_SUPPORT_INGREDIENTS = new Set(['ceramide', 'panthenol', 'cholesterol', 'squalane', NIACINAMIDE_ID]);

    const getIngredientFunction = (dbIng) => {
        if (!dbIng) return new Set();
        const funcs = new Set();
        const chemType = dbIng.chemicalType?.toLowerCase() || '';
        const funcCategory = dbIng.functionalCategory?.toLowerCase() || '';
        
        if (chemType.includes('ريتينويد') || chemType.includes('retinoid')) funcs.add('Retinoid');
        if (chemType.includes('aha') || dbIng.id === 'glycolic-acid') funcs.add('AHA');
        if (chemType.includes('bha') || dbIng.id === 'salicylic-acid') funcs.add('BHA');
        if (chemType.includes('pha')) funcs.add('PHA');
        if (dbIng.id === 'vitamin-c') funcs.add('Pure Vitamin C');
        if (dbIng.id === 'copper-peptides') funcs.add('Copper Peptides');
        if (funcCategory.includes('مضاد أكسدة')) funcs.add('Antioxidant');
        if (funcCategory.includes('مقشر')) funcs.add('Exfoliant');
        if (dbIng.id === 'benzoyl-peroxide') funcs.add('Benzoyl Peroxide');
        return funcs;
    };

    const getProductsWithFunction = (products, func) => 
        products.filter(p => p.analysisData.detected_ingredients.some(i => {
             const dbIng = GLOBAL_INGREDIENTS_MAP.get(i.id) || GLOBAL_INGREDIENTS_MAP.get(i.name.toLowerCase());
             return getIngredientFunction(dbIng).has(func);
        }));

    // --- 2. PERSONALIZATION CHECKS (Allergies, Conditions, Bio) ---
    
   // A. Build Exclusion Maps
    
    // FIX 1: Create a Map to link Ingredient -> Allergy Name directly
    const userAllergenMap = new Map(); 
    
    allergies.forEach(id => {
        // Find the allergy definition from your data file
        const allergyDef = commonAllergies.find(a => a.id === id);
        if (allergyDef && allergyDef.ingredients) {
            allergyDef.ingredients.forEach(ing => {
                // Map the ingredient name to the Allergy Name (e.g. "حساسية المكسرات")
                // NOTE: Your data uses .name, not .label
                userAllergenMap.set(normalizeForMatching(ing), allergyDef.name); 
            });
        }
    });

    const userConditionAvoidMap = new Map();
    
    // Map Conditions to Avoided Ingredients
    conditions.forEach(id => {
        const condition = commonConditions.find(c => c.id === id);
        if (condition && condition.avoidIngredients) {
            condition.avoidIngredients.forEach(ing => userConditionAvoidMap.set(normalizeForMatching(ing), condition.name));
        }
    });

    // Map Skin Type Rules
    if (skinType) {
        const skinData = basicSkinTypes.find(t => t.id === skinType);
        if (skinData && skinData.avoidIngredients) {
            skinData.avoidIngredients.forEach(ing => userConditionAvoidMap.set(normalizeForMatching(ing), `بشرة ${skinData.label}`));
        }
    }
    // Map Scalp Type Rules
    if (scalpType) {
        const scalpData = basicScalpTypes.find(t => t.id === scalpType);
        if (scalpData && scalpData.avoidIngredients) {
            scalpData.avoidIngredients.forEach(ing => userConditionAvoidMap.set(normalizeForMatching(ing), `فروة رأس ${scalpData.label}`));
        }
    }

    // B. Execute Checks on Shelf
    validProducts.forEach(product => {
        product.analysisData.detected_ingredients.forEach(ing => {
            const normalizedIngName = normalizeForMatching(ing.name);
            
            // FIX 2: Check the Map
            if (userAllergenMap.has(normalizedIngName)) {
                // Retrieve the specific name immediately (e.g., "حساسية المكسرات")
                const allergyName = userAllergenMap.get(normalizedIngName);
                
                addInsight(
                    `allergy-${product.id}-${ing.id || ing.name}`,
                    'خطر: مكون مسبب للحساسية',
                    `يحتوي "${product.productName}" على "${ing.name}".`,
                    `لقد أشرت في ملفك الشخصي إلى إصابتك بـ "${allergyName}". هذا المنتج يحتوي على "${ing.name}" الذي يثير هذه الحساسية مباشرة. يرجى تجنبه تماماً.`,
                    'critical',
                    [product.productName]
                );
            }

            // Check Bio-Compatibility / Conditions
            if (userConditionAvoidMap.has(normalizedIngName)) {
                const reason = userConditionAvoidMap.get(normalizedIngName);
                addInsight(
                    `condition-${product.id}-${ing.id || ing.name}`,
                    `تنبيه: لا يناسب ${reason}`,
                    `يحتوي "${product.productName}" على "${ing.name}".`,
                    `بما أنك تعاني من "${reason}"، فإن المكون "${ing.name}" قد يؤدي إلى تفاقم المشكلة (مثل زيادة الجفاف أو التهيج). يفضل البحث عن بديل ألطف.`,
                    'warning',
                    [product.productName]
                );
            }
        });
    });

    // C. Blacklist Check
    if (blacklistedIngredients.length > 0) {
        validProducts.forEach(product => {
            product.analysisData.detected_ingredients.forEach(ing => {
                if (blacklistedIngredients.some(b => normalizeForMatching(b) === normalizeForMatching(ing.name))) {
                    addInsight(
                        `blacklist-${product.id}-${ing.name}`,
                        'مكون محظور شخصياً',
                        `وجدت المكون "${ing.name}" في منتجك.`,
                        `أنت قمت بإضافة "${ing.name}" يدوياً إلى قائمتك السوداء. هذا المكون موجود في منتج "${product.productName}".`,
                        'critical',
                        [product.productName]
                    );
                }
            });
        });
    }

    // D. Pregnancy Specific Check (Retinoids)
    if (conditions.includes('pregnancy')) {
        const retinoidProducts = getProductsWithFunction(validProducts, 'Retinoid');
        if (retinoidProducts.length > 0) {
            retinoidProducts.forEach(p => {
                const retinoidIng = p.analysisData.detected_ingredients.find(i => getIngredientFunction(GLOBAL_INGREDIENTS_MAP.get(i.id)).has('Retinoid'));
                addInsight(
                    `preg-unsafe-${p.id}`,
                    'تحذير حمل: ريتينويد',
                    `منتج "${p.productName}" غير آمن حالياً.`,
                    `هذا المنتج يحتوي على "${retinoidIng?.name || 'مشتقات فيتامين A'}"، والتي يحذر الأطباء من استخدامها أثناء الحمل لأنها قد تؤثر على الجنين.`,
                    'critical',
                    [p.productName]
                );
            });
        }
    }

    // --- 3. GOAL ALIGNMENT ---
    const GOAL_DEFINITIONS = {
        acne: {
            label: 'مكافحة حب الشباب',
            // Dermatologists want: 1. Unclog Pores (BHA), 2. Kill Bacteria (BPO), 3. Calm/Regulate (Niacinamide/Retinoid)
            mechanisms: ['exfoliation_bha', 'anti_bacterial', 'cell_turnover', 'sebum_control'],
            heroIds: new Set([
                'salicylic-acid', 'benzoyl-peroxide', 'adapalene', 'tretinoin', 'retinol',
                'azelaic-acid', 'niacinamide', 'sulfur', 'tea-tree-oil', 'zinc-pca', 'succinic-acid'
            ]),
            synergy: { ids: ['salicylic-acid', 'niacinamide'], label: 'تنظيف وتهدئة' },
            requiresSunscreen: false 
        },
        anti_aging: {
            label: 'مكافحة الشيخوخة',
            mechanisms: ['cell_turnover', 'antioxidant', 'barrier_repair', 'collagen_stimulation'],
            heroIds: new Set([
                // Retinoids
                'retinol', 'tretinoin', 'retinal', 'bakuchiol', 'hydroxypinacolone-retinoate',
                // Peptides
                'peptides', 'copper-peptides', 'matrixyl', 'argireline',
                // Vitamin C & Antioxidants (Added ethyl-ascorbic-acid here)
                'vitamin-c', 'ascorbic-acid', 'ethyl-ascorbic-acid', 'resveratrol', 'coenzyme-q10',
                // Barrier & Structure
                'ceramides', 'glycolic-acid', 'fatty-acids'
            ]),
            synergy: { ids: ['retinol', 'ceramides'], label: 'تجديد وترميم' },
            requiresSunscreen: true 
        },
        brightening: {
            label: 'تفتيح وتوحيد اللون',
            // Dermatologists want: 1. Stop Pigment (Tyrosinase Inhibitor), 2. Shed Pigment (Exfoliation/Turnover)
            mechanisms: ['tyrosinase_inhibitor', 'antioxidant', 'exfoliation_aha', 'cell_turnover'],
            heroIds: new Set([
                'vitamin-c', 'ascorbic-acid', 'alpha-arbutin', 'kojic-acid', 'tranexamic-acid',
                'niacinamide', 'licorice-root', 'azelaic-acid', 'glycolic-acid', 'lactic-acid', 'glutathione'
            ]),
            synergy: { ids: ['vitamin-c', 'vitamin-e', 'ferulic-acid'], label: 'مثلث النضارة' },
            requiresSunscreen: true
        },
        hydration: {
            label: 'ترطيب عميق & حاجز',
            // Dermatologists want: 1. Water (Humectant), 2. Seal (Occlusive/Barrier)
            mechanisms: ['humectant', 'barrier_repair', 'occlusive'],
            heroIds: new Set([
                'hyaluronic-acid', 'glycerin', 'panthenol', 'urea', 'polyglutamic-acid',
                'ceramides', 'cholesterol', 'squalane', 'shea-butter', 'allantoin', 'centella-asiatica'
            ]),
            synergy: { ids: ['hyaluronic-acid', 'ceramides'], label: 'ترطيب متكامل' },
            requiresSunscreen: false
        }
    };

    goals.forEach(goalId => {
        const def = GOAL_DEFINITIONS[goalId];
        if (!def) return;

        // TRACKING
        let foundMechanisms = new Set();
        let foundHeroes = new Set(); // Localized names
        let foundHeroIds = new Set();
        let contributingProducts = new Map(); // Store product name -> potency

        // 1. SCAN SHELF
        validProducts.forEach(p => {
            const productType = p.analysisData.product_type;
            
            // Define Vehicle Potency (Serum > Cream > Wash)
            let vehicleScore = 0.5; // Base
            if (['serum', 'treatment', 'ampoule'].includes(productType)) vehicleScore = 1.0;
            else if (['lotion_cream', 'oil_blend'].includes(productType)) vehicleScore = 0.8;
            else if (['toner', 'essence'].includes(productType)) vehicleScore = 0.6;
            else if (productType === 'sunscreen') vehicleScore = 0.7;
            else if (productType === 'cleanser') vehicleScore = 0.3; // Wash-off is weak

            p.analysisData.detected_ingredients.forEach(rawIng => {
                // A. RESOLVE (Fixing the issue using searchKeywords)
                const resolved = resolveIngredient(rawIng.name);
                if (!resolved) return;

                const ingId = resolved.id;
                const ingName = resolved.name;

                // B. CHECK HERO STATUS
                if (def.heroIds.has(ingId)) {
                    foundHeroes.add(ingName);
                    foundHeroIds.add(ingId);
                    
                    // C. IDENTIFY MECHANISM
                    const mech = getMechanism(ingId);
                    if (def.mechanisms.includes(mech)) {
                        foundMechanisms.add(mech);
                    }

                    // Log contribution
                    const existingPotency = contributingProducts.get(p.productName) || 0;
                    contributingProducts.set(p.productName, Math.max(existingPotency, vehicleScore));
                }
            });
        });

        // 2. CALCULATE "DERM SCORE"
        // A. Mechanism Coverage (50% of score)
        // If the goal requires 3 mechanisms and you have 2, that's good.
        // We cap it so you don't need 100% of mechanisms for a perfect score, usually 2-3 is excellent.
        const mechanismCount = foundMechanisms.size;
        let mechScore = 0;
        if (mechanismCount >= 1) mechScore += 20;
        if (mechanismCount >= 2) mechScore += 20;
        if (mechanismCount >= 3) mechScore += 10; // Bonus
        
        // B. Potency/Concentration (30% of score)
        // Sum of top 2 strongest products
        const potencies = Array.from(contributingProducts.values()).sort((a,b) => b-a);
        const top1 = (potencies[0] || 0) * 20; // Max 20
        const top2 = (potencies[1] || 0) * 10; // Max 10
        let potencyScore = top1 + top2;

        // C. Synergy Bonus (10% of score)
        let synergyActive = false;
        let synergyLabel = null;
        if (def.synergy) {
            // Check if ALL synergy IDs are present in the routine
            const hasSynergy = def.synergy.ids.every(id => foundHeroIds.has(id));
            if (hasSynergy) {
                potencyScore += 10;
                synergyActive = true;
                synergyLabel = def.synergy.label;
            }
        }

        // D. Sunscreen Veto (20% negative impact or cap)
        const hasSunscreen = validProducts.some(p => p.analysisData.product_type === 'sunscreen');
        let sunscreenPenalty = false;
        
        let totalScore = mechScore + potencyScore;

        if (def.requiresSunscreen && !hasSunscreen) {
            // If treating pigmentation/aging without SPF, efficacy is basically zero in real life.
            // We cap the score harshly.
            if (totalScore > 35) {
                totalScore = 35;
                sunscreenPenalty = true;
            }
        } else if (def.requiresSunscreen && hasSunscreen) {
            totalScore += 20; // Full marks for protection
        } else {
            // For goals that don't STRICTLY need it (like hydration), just fill the gap
            totalScore += 20; 
        }

        totalScore = Math.min(Math.round(totalScore), 100);

        // 3. GENERATE INTELLIGENT SUGGESTIONS
        // Instead of random missing ingredients, suggest missing MECHANISMS.
        const missingMechanisms = def.mechanisms.filter(m => !foundMechanisms.has(m));
        
        // Find ingredients that solve the missing mechanisms
        const missingHeroes = [];
        missingMechanisms.slice(0, 2).forEach(mech => {
            // Find a hero ID from the definition that matches this mechanism
            const suggestionId = Array.from(def.heroIds).find(id => getMechanism(id) === mech);
            if (suggestionId) {
                const info = ingredientIndex.get(suggestionId);
                if(info) missingHeroes.push(info.name);
            }
        });
        
        // If we still need suggestions, fill with generic missing heroes
        if (missingHeroes.length < 3) {
            Array.from(def.heroIds).forEach(id => {
                if (!foundHeroIds.has(id) && missingHeroes.length < 3) {
                    const info = ingredientIndex.get(id);
                    if (info && !missingHeroes.includes(info.name)) missingHeroes.push(info.name);
                }
            });
        }

        // 4. CREATE INSIGHT
        let severity = 'good';
        let summary = `روتين متكامل (${totalScore}%)`;
        
        if (totalScore < 45) {
            severity = 'critical';
            summary = sunscreenPenalty ? "الحماية مفقودة تماماً" : `بداية جيدة (${totalScore}%)`;
        } else if (totalScore < 80) {
            severity = 'warning';
            summary = `فعال، ولكن يمكن تحسينه (${totalScore}%)`;
        } else {
            summary = `روتين احترافي (${totalScore}%)`;
        }

        addInsight(
            `goal-derm-${goalId}`,
            `مسار: ${def.label}`,
            summary,
            "اضغط لعرض تحليل الطبيب الرقمي",
            severity,
            Array.from(contributingProducts.keys()),
            {
                score: totalScore,
                goalLabel: def.label,
                foundHeroes: Array.from(foundHeroes),
                missingHeroes,
                sunscreenPenalty,
                synergyActive,
                synergyLabel,
                // Pass mechanism data for advanced UI if needed
                mechanismsCovered: Array.from(foundMechanisms).length,
                totalMechanisms: def.mechanisms.length
            }
        );
    });

    // --- 4. ROUTINE INTEGRITY & BARRIER HEALTH ---
    
    // Map Routine IDs to Product Objects
    const mapRoutine = (period) => (userProfile.routines?.[period] || [])
        .flatMap(s => s.productIds).map(id => validProducts.find(p => p.id === id)).filter(Boolean);
    
    const amProducts = mapRoutine('am');
    const pmProducts = mapRoutine('pm');

    const IRRITATION_WEIGHTS = {
        // Nuclear Option
        'tretinoin': 5.0, 'isotretinoin': 5.0, 'hydroquinone': 4.5,
        // Heavy Hitters
        'adapalene': 3.5, 'tazarotene': 3.5, 'glycolic-acid': 3.0, 'benzoyl-peroxide': 3.0,
        // Standard Actives
        'retinol': 2.5, 'retinal': 2.5, 'salicylic-acid': 2.0, 'lactic-acid': 2.0, 'ascorbic-acid': 2.0, // Pure Vit C is acidic
        // Mild Actives
        'azelaic-acid': 1.5, 'mandelic-acid': 1.5, 'ethyl-ascorbic-acid': 1.0, 'gluconolactone': 1.0, // PHA
        'niacinamide': 0.5, // Only irritating at high % or sensitive skin
        'bakuchiol': 0.5
    };
    
    // 2. DEFENDERS: How much does this soothe/repair?
    const SOOTHING_WEIGHTS = {
        // Structural Repair (The Cement)
        'ceramides': 2.0, 'cholesterol': 2.0, 'fatty-acids': 2.0, 'phytosphingosine': 2.0,
        // Deep Soothers
        'panthenol': 1.5, 'madecassoside': 1.5, 'centella-asiatica': 1.5, 'allantoin': 1.5, 'bisabolol': 1.5, 'colloidal-oatmeal': 1.5,
        // Hydrators (Buffers)
        'hyaluronic-acid': 0.5, 'glycerin': 0.5, 'polyglutamic-acid': 0.5, 'squalane': 1.0, 'shea-butter': 1.0
    };
    
    // 3. SKIN TOLERANCE: The "Budget" based on profile
    const SKIN_TOLERANCE_BUDGET = {
        'sensitive': 4.0,   // Low budget
        'dry': 5.5,         // Medium-Low
        'normal': 7.0,      // Standard
        'combo': 7.5,
        'oily': 8.5         // High tolerance (oil protects)
    };

    // ** Barrier Load Calculation (Fixed) **
   // ** Barrier Load Calculation (Enhanced) **
   const calculateBarrierHealth = (dailyProducts) => {
    
    const skinType = settings.skinType || 'normal'; 
    let baseTolerance = SKIN_TOLERANCE_BUDGET[skinType] || 7.0;

    if (settings.conditions?.includes('rosacea') || settings.conditions?.includes('eczema')) baseTolerance -= 2.0; 
    if (settings.conditions?.includes('retinoid_naive')) baseTolerance -= 1.0; 

    const offenders = [];
    const defenders = [];

    // Helper: Now returns lists of specific ingredient names
    const getProductImpact = (product) => {
        let irritation = 0;
        let soothing = 0;
        let irritantNames = []; // Store names of bad guys
        let sootherNames = [];  // Store names of good guys

        const type = product.analysisData.product_type;
        let factor = 1.0;
        if (type === 'cleanser' || type === 'mask') factor = 0.3; 
        if (type === 'toner') factor = 0.8; 

        product.analysisData.detected_ingredients.forEach(rawIng => {
            const resolved = resolveIngredient(rawIng.name);
            if (!resolved) return;
            const id = resolved.id;
            // Use Arabic name if available, else English
            const displayName = resolved.name || rawIng.name; 

            if (IRRITATION_WEIGHTS[id]) {
                irritation += (IRRITATION_WEIGHTS[id] * factor);
                irritantNames.push(displayName);
            }
            
            if (SOOTHING_WEIGHTS[id]) {
                soothing += (SOOTHING_WEIGHTS[id] * factor); 
                sootherNames.push(displayName);
            }
        });

        return { irritation, soothing, irritantNames, sootherNames };
    };

    let totalIrritation = 0;
    let totalSoothing = 0;

    dailyProducts.forEach(p => {
        const impact = getProductImpact(p);
        totalIrritation += impact.irritation;
        totalSoothing += impact.soothing;

        // Save the product AND the specific ingredients
        if (impact.irritation > 0.1) {
            offenders.push({ 
                name: p.productName, 
                score: impact.irritation,
                ingredients: impact.irritantNames 
            });
        }
        if (impact.soothing > 0.1) {
            defenders.push({ 
                name: p.productName, 
                score: impact.soothing,
                ingredients: impact.sootherNames 
            });
        }
    });

    offenders.sort((a,b) => b.score - a.score);
    defenders.sort((a,b) => b.score - a.score);

    const maxSoothingBonus = baseTolerance * 0.5; 
    const effectiveTolerance = baseTolerance + Math.min(totalSoothing, maxSoothingBonus);
    const loadRatio = totalIrritation > 0 ? (totalIrritation / effectiveTolerance) : 0;
    
    let visualScore = Math.min(Math.round((loadRatio / 1.5) * 100), 100);
    let healthScore = 100 - visualScore;
    if (totalIrritation === 0) healthScore = 100; 

    let status, color, desc;
    
    if (loadRatio > 1.2) {
        status = 'خطر احتراق 🚨';
        color = COLORS.danger;
        desc = `حملك الكيميائي (${totalIrritation.toFixed(1)}) يتجاوز قدرة تحمّل بشرتك (${effectiveTolerance.toFixed(1)}) بشكل كبير.`;
    } else if (loadRatio > 0.9) {
        status = 'حاجز مجهد';
        color = COLORS.warning;
        desc = `أنت على حافة التحمل. ميزانية بشرتك (${effectiveTolerance.toFixed(1)}) ممتلئة.`;
    } else if (loadRatio > 0.5) {
        status = 'نشط ومتوازن';
        color = COLORS.success;
        desc = `تستخدمين ${(totalIrritation/effectiveTolerance*100).toFixed(0)}% من طاقة بشرتك. التوازن ممتاز.`;
    } else {
        status = 'سليم وقوي';
        color = COLORS.success;
        desc = `حاجز بشرتك في حالة راحة تامة.`;
    }

    return {
        score: healthScore, status, color, desc, totalIrritation, totalSoothing, offenders, defenders
    };
};

    // Calculate once for the daily total
    const barrierStats = calculateBarrierHealth([...amProducts, ...pmProducts]);

    // Set Barrier Health Object (UPDATED TO SAVE DETAILS)
    results.barrierHealth = {
        ...results.barrierHealth,
        score: barrierStats.score,
        status: barrierStats.status,
        color: barrierStats.color,
        desc: barrierStats.desc,
        totalIrritation: barrierStats.totalIrritation,
        totalSoothing: barrierStats.totalSoothing,
        offenders: barrierStats.offenders,
        defenders: barrierStats.defenders
    };

    // Additional Insights based on calculated stats
    if (barrierStats.score > 75 && barrierStats.score <= 90) {
        addInsight('barrier-warning', 'حمل كيميائي مرتفع', 'انتبه من الجفاف.', 'تستخدم عدة مواد فعالة قوية في روتينك اليومي، مما قد يرهق حاجز البشرة.', 'warning');
    } else if (barrierStats.score > 90) {
        addInsight('barrier-danger', 'خطر: احتراق كيميائي', 'توقف فوراً!', 'مجموع نقاط التهيج في روتينك مرتفع جداً. قلل استخدام الأحماض والريتينول فوراً.', 'critical');
    }


    // --- 5. DETAILED ROUTINE ANALYSIS (AM/PM) ---
    
    // Global Routine Checks
    if (pmProducts.length > 0 && !pmProducts.some(p => p.analysisData.product_type === 'cleanser' || p.productName.includes('غسول'))) {
        addInsight(
            'missing-pm-cleanser', 
            'خطوة أساسية مفقودة', 
            'لا يوجد غسول في روتين المساء.', 
            'النوم ببقايا واقي الشمس والأوساخ يسبب انسداد المسام فوراً. أضيفي غسولاً لروتين المساء.', 
            'critical'
        );
    }

    const hasActives = validProducts.some(p => {
        const ings = p.analysisData.detected_ingredients;
        return ings.some(i => STRONG_ACTIVES.has(Array.from(getIngredientFunction(GLOBAL_INGREDIENTS_MAP.get(i.id)))[0]));
    });

    if ((hasActives || goals.includes('hydration')) && !validProducts.some(p => p.analysisData.product_type === 'lotion_cream')) {
        addInsight(
            'missing-moisturizer', 
            'أساسيات ناقصة', 
            'تحتاجين لمرطب لدعم بشرتك.', 
            'عند استخدام مكونات نشطة قوية، يصبح المرطب ضرورياً لحماية الحاجز الجلدي من التلف.', 
            'warning'
        );
    }

    // Routine-Specific Logic Function
    const analyzeRoutine = (products, routineName) => {
        if (products.length === 0) return { conflicts: 0, synergies: 0 };
        let conflicts = 0, synergies = 0;

        // A. Layering Check (Oil before Water)
        const productBases = products.map(p => ({ 
            name: p.productName, 
            base: (p.analysisData.product_type === 'oil_blend' || p.productName.includes('oil')) ? 'oil' : 'water'
        }));
        const firstOil = productBases.findIndex(p => p.base === 'oil');
        const lastWater = productBases.map(p => p.base).lastIndexOf('water');
        
        if (firstOil !== -1 && lastWater !== -1 && firstOil < lastWater) {
            addInsight(
                `layering-${routineName}`,
                `ترتيب خاطئ: ${routineName}`,
                `الزيوت تمنع امتصاص السيرومات.`,
                `أنتِ تضعين "${productBases[firstOil].name}" (زيت) قبل "${productBases[lastWater].name}" (مائي). الزيت يشكل حاجزاً يمنع امتصاص الماء، لذا ضعي المائي أولاً.`,
                'warning',
                [productBases[firstOil].name, productBases[lastWater].name]
            );
        }

        // B. Barrier Neglect (Active w/o Support)
        const ingredientsInRoutine = new Map(products.flatMap(p => p.analysisData.detected_ingredients.map(i => [i.id, { ...i, product: p }])));
        const productFunctions = new Map(products.map(p => [
            p.id, 
            new Set(p.analysisData.detected_ingredients.flatMap(i => Array.from(getIngredientFunction(GLOBAL_INGREDIENTS_MAP.get(i.id)))))
        ]));

        const activeProducts = products.filter(p => Array.from(productFunctions.get(p.id) || []).some(f => STRONG_ACTIVES.has(f)));
        const hasBarrierSupport = products.some(p => p.analysisData.detected_ingredients.some(i => BARRIER_SUPPORT_INGREDIENTS.has(i.id)));
        
        if (activeProducts.length > 0 && !hasBarrierSupport) {
            conflicts++;
            const activeNames = activeProducts.map(p => p.productName).join(' و ');
            const isDry = skinType === 'dry' || skinType === 'sensitive';
            addInsight(
                `barrier-neglect-${routineName}`,
                'خطر على الحاجز الجلدي',
                'تستخدمين مقشرات قوية بدون ترميم.',
                `أنت تستخدمين "${activeNames}" في روتين ${routineName}، لكن لا يوجد مرطب يحتوي على سيراميد أو بانثينول لتهدئة البشرة.`,
                isDry ? 'critical' : 'warning',
                activeProducts.map(p => p.productName)
            );
        }

        // C. Over-exfoliation
        const exfoliantProducts = products.filter(p => Array.from(productFunctions.get(p.id) || []).some(f => ['AHA', 'BHA', 'PHA', 'Retinoid'].includes(f)));
        if (exfoliantProducts.length > 1) {
            conflicts++;
            const names = exfoliantProducts.map(p => p.productName).join('\n• ');
            addInsight(
                `over-exfoliation-${routineName}`,
                'إفراط في التقشير!',
                'تستخدمين أكثر من مقشر في وقت واحد.',
                `لقد جمعت بين المنتجات التالية في روتين واحد:\n• ${names}\nهذا كثير جداً وقد يحرق بشرتك. وزعيهم على ليالٍ مختلفة.`,
                'critical',
                exfoliantProducts.map(p => p.productName)
            );
        }

        // D. Redundant Vitamin C
        const vitCProducts = getProductsWithFunction(products, 'Pure Vitamin C');
        if (vitCProducts.length > 1) {
            addInsight(
                `redundant-vitc-${routineName}`, 
                'تكرار غير مفيد', 
                'لديك أكثر من سيروم فيتامين C.', 
                `أنت تستخدمين "${vitCProducts[0].productName}" و "${vitCProducts[1].productName}". منتج واحد بتركيز جيد يكفي؛ الزيادة لن تمنحك نتيجة أفضل بل قد تهيج البشرة.`, 
                'good'
            );
        }

        // E. Timing (Exfoliants in AM)
        if (routineName === 'الصباح' && exfoliantProducts.length > 0) {
            conflicts++;
            const names = exfoliantProducts.map(p => p.productName).join(' و ');
            addInsight(
                'timing-exfoliant-am', 
                'توقيت غير مناسب', 
                'المقشرات تجعل بشرتك حساسة للشمس.', 
                `أنت تستخدمين "${names}" في الصباح. الأحماض والريتينول يفضل استخدامها مساءً لتجنب التصبغات وحروق الشمس.`, 
                'warning', 
                exfoliantProducts.map(p=>p.productName)
            );
        }

        // F. pH Conflict (Vit C + Niacinamide)
        const hasNia = ingredientsInRoutine.has(NIACINAMIDE_ID);
        const hasPureVitC = ingredientsInRoutine.has(PURE_VITAMIN_C_ID);
        
        if (hasNia && hasPureVitC) {
            conflicts++;
            const vitCName = ingredientsInRoutine.get(PURE_VITAMIN_C_ID).product.productName;
            const niaName = ingredientsInRoutine.get(NIACINAMIDE_ID).product.productName;
            addInsight(
                `conflict-vitc-nia-${routineName}`,
                'تعارض كيميائي (pH)',
                'فيتامين C النقي + نياسيناميد.',
                `أنت تخلطين "${vitCName}" (حامضي) مع "${niaName}" (قلوي). هذا يسبب احمراراً (Flushing) ويقلل فعالية المنتجين. استخدمي الفيتامين C صباحاً والنياسيناميد مساءً.`,
                'warning',
                [vitCName, niaName]
            );
        }

        // G. Synergy (Retinoid + Niacinamide)
        const hasRetinoid = products.some(p => Array.from(productFunctions.get(p.id) || []).includes('Retinoid'));
        if (routineName === 'المساء' && hasRetinoid && hasNia) {
            synergies++;
            const retName = products.find(p => Array.from(productFunctions.get(p.id)).includes('Retinoid')).productName;
            const niaName = ingredientsInRoutine.get(NIACINAMIDE_ID).product.productName;
            addInsight(
                'synergy-ret-nia', 
                'ثنائي ذهبي ✨', 
                'ريتينويد + نياسيناميد.', 
                `دمجك لـ "${retName}" مع "${niaName}" ممتاز! النياسيناميد يقوي حاجز البشرة ويجعلها تتحمل الريتينول بشكل أفضل.`, 
                'good',
                [retName, niaName]
            );
        }

        return { conflicts, synergies };
    };

    const amAnalysis = analyzeRoutine(amProducts, 'الصباح');
    const pmAnalysis = analyzeRoutine(pmProducts, 'المساء');

    results.amRoutine = { products: amProducts, ...amAnalysis };
    results.pmRoutine = { products: pmProducts, ...pmAnalysis };

    // --- 6. SUN PROTECTION ---
    const usesSunscreen = amProducts.some(p => p.analysisData.product_type === 'sunscreen');
    if (amProducts.length > 0) {
        if (usesSunscreen) {
            results.sunProtectionGrade.score += 70;
            results.sunProtectionGrade.notes.push("✓ واقي شمس موجود صباحاً.");
            
            // Synergy: SPF + Antioxidant
            const hasAntioxidant = getProductsWithFunction(amProducts, 'Antioxidant').length > 0 || getProductsWithFunction(amProducts, 'Pure Vitamin C').length > 0;
            if (hasAntioxidant) {
                results.sunProtectionGrade.score += 30;
                results.sunProtectionGrade.notes.push("✓ معزز بمضادات الأكسدة (+30%).");
                addInsight(
                    'synergy-spf-antioxidant', 
                    'حماية مضاعفة', 
                    'واقي شمس + مضاد أكسدة.', 
                    'استخدامك لسيروم مضاد للأكسدة (مثل فيتامين C) تحت الواقي الشمسي يقضي على الجذور الحرة التي تتسرب عبر الواقي.', 
                    'good'
                );
            }
        } else {
            results.sunProtectionGrade.notes.push("✗ لا يوجد واقي شمس!");
            const isAntiAging = goals.includes('anti_aging');
            const isBrightening = goals.includes('brightening');
            let impactMsg = 'الشمس هي المسبب الأول لتلف البشرة.';
            if (isAntiAging) impactMsg = 'بما أن هدفك "مكافحة الشيخوخة"، فإن غياب واقي الشمس يلغي مفعول كل منتجاتك العلاجية.';
            if (isBrightening) impactMsg = 'بما أن هدفك "التفتيح"، فلن تري أي نتيجة بدون واقي شمس، بل قد تزيد التصبغات.';
            
            addInsight(
                'missing-sunscreen', 
                'خطر: لا يوجد واقي شمس', 
                'روتين الصباح يفتقر لأهم خطوة.', 
                `${impactMsg} يجب إضافة واقي شمس كخطوة أخيرة كل صباح.`, 
                'critical'
            );
        }
    }

    // --- 7. STATS BREAKDOWN ---
    const uniqueIngs = new Set(validProducts.flatMap(p => p.analysisData.detected_ingredients.map(i => i.id)));
    uniqueIngs.forEach(id => {
        const dbIng = GLOBAL_INGREDIENTS_MAP.get(id);
        const funcs = getIngredientFunction(dbIng);
        if (funcs.has('Retinoid') || funcs.has('AHA') || funcs.has('BHA')) results.formulationBreakdown.actives++;
        if (dbIng?.functionalCategory?.includes('مرطب')) results.formulationBreakdown.hydrators++;
        if (funcs.has('Antioxidant')) results.formulationBreakdown.antioxidants++;
    });

    // Final Sort by Severity
    const severityOrder = { 'critical': 1, 'warning': 2, 'good': 3 };
    results.aiCoachInsights = Array.from(insightsMap.values()).sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return results;

  }, [savedProducts, userProfile]);
  
  const avatarOpacity = scrollY.interpolate({ 
    inputRange: [0, 100], 
    outputRange: [1, 0], 
    extrapolate: 'clamp' 
  });
  
  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp'
  });

 const handleDelete = async (id) => { 
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    // 1. The Animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // 2. The State Update (The row will collapse smoothly)
    const old = [...savedProducts];
    setSavedProducts(prev => prev.filter(p => p.id !== id));
      try { 
          await deleteDoc(doc(db, 'profiles', user.uid, 'savedProducts', id)); 
      } catch (error) { 
          setSavedProducts(old); 
          Alert.alert("خطأ", "تعذر حذف المنتج");
      }
  };

  const handleRefresh = async () => {
    // Implement refresh logic here
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Bottom Floating Dock Items
  const TABS = [
      { id: 'shelf', label: 'الرف', icon: 'list' },
      { id: 'routine', label: 'روتيني', icon: 'calendar-check' },
      { id: 'analysis', label: 'تحليل', icon: 'chart-pie' },
      { id: 'migration', label: 'البديل', icon: 'exchange-alt' },
      { id: 'ingredients', label: 'مكونات', icon: 'flask' },
      { id: 'settings', label: 'إعدادات', icon: 'cog' },
  ];

  return (
    <View style={styles.container}>
        {/* ... (StatusBar, Particles, Header, ScrollView) */}
        
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        
        {/* Particles are now direct children of the main container */}
        {particles.map((p) => <Spore key={p.id} {...p} />)}
            
        {/* --- PARALLAX HEADER (No Blur) --- */}
        <Animated.View style={[styles.header, { height: headerHeight }]}>
                {/* Background color is now part of the style, not a separate layer */}
                <LinearGradient 
                    colors={['rgba(26, 45, 39, 0.7)', 'transparent']} 
                    style={StyleSheet.absoluteFill} 
                />
                
                {/* EXPANDED STATE CONTENT (Fades out on scroll) */}
                <Animated.View style={[
                    styles.headerContentExpanded, 
                    { opacity: expandedHeaderOpacity, transform: [{ translateY: expandedHeaderTranslate }] }
                ]}>
                     <View>
                        <Text style={styles.welcomeText}>
                             أهلاً، {userProfile?.settings?.name?.split(' ')[0] || 'بك'}
                        </Text>
                        <Text style={styles.subWelcome}>رحلتك لجمال طبيعي ✨</Text>
                     </View>
                     <View style={styles.avatar}>
                         <Text style={{fontSize: 28}}>🧖‍♀️</Text>
                     </View>
                </Animated.View>

                {/* COLLAPSED STATE CONTENT (Fades in on scroll) */}
                <Animated.View style={[styles.headerContentCollapsed, { opacity: collapsedHeaderOpacity, height: headerMinHeight - insets.top }]}>
                    <Text style={styles.collapsedTitle}>
                        {userProfile?.settings?.name || 'الملف الشخصي'}
                    </Text>
                </Animated.View>
            </Animated.View>

            {/* --- MAIN SCROLL --- */}
            {/* --- MAIN SCROLL --- */}
            <Animated.ScrollView
                contentContainerStyle={{ 
                    paddingHorizontal: 15, 
                    paddingTop: headerMaxHeight + 20,
                    paddingBottom: 100 
                }}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: false }
                )}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={handleRefresh}
                        tintColor={COLORS.textPrimary}
                        colors={[COLORS.textPrimary]}
                        progressBackgroundColor="rgba(255,255,255,0.1)"
                    />
                }
            >
                <Animated.View style={{ 
                    opacity: contentOpacity, 
                    transform: [{ translateY: contentTranslate }],
                    minHeight: 400 // Prevents scroll jump during switch
                }}>
                    
                    {activeTab === 'shelf' && (
                        <ShelfSection 
                            products={savedProducts} 
                            loading={loading} 
                            onDelete={handleDelete} 
                            onRefresh={handleRefresh}
                            router={router}
                        />
                    )}

                    {activeTab === 'routine' && (
                        <RoutineSection 
                            savedProducts={savedProducts} 
                            userProfile={userProfile} 
                            onOpenAddStepModal={openAddStepModal}
                        />
                    )}

                    {activeTab === 'analysis' && (
                        <AnalysisSection 
                            savedProducts={savedProducts} 
                            loading={loading}
                            analysisResults={analysisResults}
                            dismissedInsightIds={dismissedInsightIds}
                            handleDismissPraise={handleDismissPraise}
                        />
                    )}

                    {activeTab === 'ingredients' && (
                        <IngredientsSection products={savedProducts} />
                    )}

                    {activeTab === 'migration' && (
                        <MigrationSection products={savedProducts} />
                    )}

                    {activeTab === 'settings' && (
                        <SettingsSection 
                            profile={userProfile} 
                            onLogout={() => { 
                                logout(); 
                                router.replace('/login'); 
                            }} 
                        />
                    )}

                </Animated.View>
            </Animated.ScrollView>

        {/* --- FLOATING GLASS DOCK & MODAL RENDERED AT TOP LEVEL --- */}
        <NatureDock 
            tabs={TABS} 
            activeTab={activeTab} 
            onTabChange={switchTab}
        />

        {/* MODAL IS NOW RENDERED HERE, OUTSIDE THE SCROLLVIEW */}
        <AddStepModal 
            isVisible={isAddStepModalVisible}
            onClose={() => setAddStepModalVisible(false)}
            onAdd={(stepName) => {
                if (addStepHandler) {
                    addStepHandler(stepName);
                }
            }}
        />

        {/* ... (FAB for shelf) */}
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