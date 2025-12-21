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

// Force LTR logic for code, visuals are RTL
I18nManager.allowRTL(false);

const { width, height } = Dimensions.get('window');

const BG_IMAGE = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1527&auto=format&fit=crop";

// --- 2. THEME & ASSETS ---
const COLORS = {
  // --- Deep Green Thematic Base ---
  background: '#1A2D27', // A rich, very dark forest green.
  card: '#253D34',      // A slightly lighter shade of the forest green for cards.
  border: 'rgba(90, 156, 132, 0.25)', // A border derived from the accent color.

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

const ALLERGY_OPTS = [
    { id: 'nuts', label: 'مكسرات' },
    { id: 'fragrance', label: 'عطور' },
    { id: 'latex', label: 'لاتكس' },
    { id: 'gluten', label: 'غلوتين' }
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
    { id: 'brightening', label: 'تفتيح', icon: 'sun' },
    { id: 'acne', label: 'حب الشباب', icon: 'shield-alt' },
    { id: 'anti_aging', label: 'شيخوخة', icon: 'hourglass-half' },
    { id: 'hydration', label: 'ترطيب', icon: 'blurType' },
    { id: 'hair_growth', label: 'كثافة', icon: 'seedling' }
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
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 40, delay: delay, useNativeDriver: true }).start();
    }, []);

    const pressIn = () => {
        if (disabled) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
    };
    
    const pressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }).start();

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
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 40, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true })
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
const StaggeredItem = ({ index, children }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, { 
          toValue: 1, 
          duration: 350,       // Slightly slower for elegance
          delay: index * 50,   // Tighter staggering
          useNativeDriver: true 
        }).start();
    }, []);

    const translateY = anim.interpolate({ 
        inputRange: [0, 1], 
        outputRange: [20, 0] // Simple 20px slide up
    });

    return (
        <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
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
                <Text style={{color: COLORS.textDim, fontSize: 10, fontFamily: 'Tajawal-Regular', marginTop: 2}}>معدل</Text>
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
const ProductListItem = ({ product, onPress, onDelete }) => {
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
            <Svg width={radius*2} height={radius*2} style={{transform: [{ rotate: '-90deg' }]}}>
              <Circle cx={radius} cy={radius} r={radius - 4} stroke={COLORS.border} strokeWidth={4} fill="none" />
              <Circle cx={radius} cy={radius} r={radius - 4} stroke={scoreColor} strokeWidth={4} fill="none"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
            </Svg>
            <Text style={[styles.listItemScoreText, { color: scoreColor }]}>{score}%</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};


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

  const InsightCard = React.memo(({ insight, onSelect, onDismiss }) => {
    const isDismissible = insight.severity === 'good';
    const severityStyles = {
      critical: { icon: 'shield-alt', color: COLORS.danger, bg: 'rgba(239, 68, 68, 0.1)' },
      warning: { icon: 'exclamation-triangle', color: COLORS.warning, bg: 'rgba(245, 158, 11, 0.1)' },
      good: { icon: 'check-circle', color: COLORS.success, bg: 'rgba(34, 197, 94, 0.1)' },
    };
    const style = severityStyles[insight.severity] || severityStyles.warning;
  
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
      >
          {insights.map((insight, index) => (
              <StaggeredItem index={index} key={insight.id}>
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


// --- THE MAIN ANALYSIS HUB COMPONENT ---
const AnalysisSection = ({ loading, savedProducts = [], analysisResults, dismissedInsightIds, handleDismissPraise }) => {
    const [selectedInsight, setSelectedInsight] = useState(null);
  
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
  
    return (
        <View style={{flex: 1}}>
            <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
                
                {/* 1. Hero Section */}
                {focusInsight ? (
                    <FocusInsight insight={focusInsight} onSelect={handleSelectInsight} />
                ) : (
                    <AllClearState />
                )}
  
                {/* 2. Carousel */}
                {carouselInsights.length > 0 && (
                     <InsightCarousel insights={carouselInsights} onSelect={handleSelectInsight} />
                )}
  
                {/* 3. Overview Dashboard */}
                <View style={styles.overviewContainer}>
                    {/* ... (Your existing overview cards code remains exactly the same) ... */}
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
                               <View style={{flex: 1, marginRight: 15}}>
                                   {(analysisResults?.sunProtectionGrade?.notes || []).map((note, i) => (
                                        <Text key={i} style={styles.sunProtectionNote}>{note}</Text>
                                   ))}
                               </View>
                           </View>
                        </ContentCard>
                    </View>
                </View>
            </ScrollView>
  
            {/* NEW MODAL IMPLEMENTATION */}
            {selectedInsight && (
                <InsightDetailsModal 
                    visible={!!selectedInsight}
                    insight={selectedInsight}
                    onClose={() => setSelectedInsight(null)}
                />
            )}
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
  
    return (
        <StaggeredItem index={index}>
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
        </StaggeredItem>
    );
  };

// --- HELPER 4: The Bottom Sheet Modal for Editing a Step ---
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
  Alert.alert(
      "حذف الخطوة",
      "هل أنت متأكد من حذف هذه الخطوة من الروتين؟",
      [
          { text: "إلغاء", style: "cancel" },
          {
              text: "حذف",
              style: "destructive",
              onPress: () => {
                  const newRoutines = JSON.parse(JSON.stringify(routines));
                  newRoutines[activePeriod] = newRoutines[activePeriod].filter(s => s.id !== stepId);
                  
                  // REMOVED: LayoutAnimation.configureNext(...) 
                  
                  saveRoutines(newRoutines);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
          }
      ]
  );
};

  const handleUpdateStep = (stepId, newProductIds) => {
      const newRoutines = JSON.parse(JSON.stringify(routines));
      const stepIndex = newRoutines[activePeriod].findIndex(s => s.id === stepId);
      if (stepIndex !== -1) { newRoutines[activePeriod][stepIndex].productIds = newProductIds; saveRoutines(newRoutines); }
  };

  const handleAutoBuildRoutine = () => {
      // 1. Minimum Viable Shelf Check
      if (savedProducts.length < 2) { 
          Alert.alert("رف غير كافٍ", "نحتاج إلى منتجين على الأقل لتحليل التفاعلات وبناء الروتين."); 
          return; 
      }

      Alert.alert(
          "المحلل الجلدي 🔬", 
          "سيتم تطبيق خوارزمية 'الترتيب الإكلينيكي'. سيقوم النظام بفصل الببتيدات النحاسية عن الأحماض، وترتيب pH المنتجات، ومنع تعارض الريتينول.",
          [
              { text: "إلغاء", style: "cancel" },
              { 
                  text: "بناء الروتين العلمي",
                  onPress: () => {
                      // ======================================================
                      // PHASE 1: MOLECULAR TAGGING & WEIGHTING
                      // ======================================================
                      const classified = savedProducts.map(p => {
                          const type = p.analysisData?.product_type || 'other';
                          const name = p.productName.toLowerCase();
                          // Normalize ingredients list
                          const ings = (p.analysisData?.detected_ingredients || []).map(i => i.name.toLowerCase());
                          const has = (t) => ings.some(i => i.includes(t));

                          let tags = []; // To track specific conflicts
                          let role = 'generic'; 
                          let weight = 50; 

                          // --- 1. CLEANSERS (pH ~5.5-7) ---
                          if ((type === 'oil_blend' && (name.includes('balm') || name.includes('cleans') || name.includes('remove'))) || type === 'micellar') {
                              role = 'oil_cleanser'; weight = 5;
                          } else if (type === 'cleanser') {
                              if (has('benzoyl')) { role = 'bp_wash'; tags.push('drying'); weight = 10; }
                              else if (has('salicylic')) { role = 'sa_wash'; tags.push('exfoliating'); weight = 10; }
                              else { role = 'water_cleanser'; weight = 10; }
                          } 
                          
                          // --- 2. TONERS (pH ~3-5 for acid, ~5-7 for hydrators) ---
                          else if (type === 'toner') {
                              if (has('glycolic') || has('lactic') || has('bha')) { role = 'acid_toner'; weight = 15; tags.push('acid'); }
                              else { role = 'hydrating_toner'; weight = 20; }
                          }

                          // --- 3. ACTIVES (The Sensitive Layer) ---
                          else if (type === 'serum' || type === 'treatment') {
                              // Vitamin C (L-Ascorbic is low pH ~3.5)
                              if (has('ascorbic') || has('vitamin c') || has('ethylated')) {
                                  role = 'vitamin_c'; weight = 25; tags.push('antioxidant');
                              }
                              // Copper Peptides (VERY FRAGILE)
                              else if (has('copper peptide') || has('chk-cu')) {
                                  role = 'copper_peptide'; weight = 45; tags.push('copper'); // Must be away from acids/vit c
                              }
                              // Chemical Exfoliants (Serums)
                              else if (has('glycolic') || has('lactic') || has('mandelic')) {
                                  role = 'aha_serum'; weight = 30; tags.push('acid');
                              }
                              else if (has('salicylic') || has('bha')) {
                                  role = 'bha_serum'; weight = 30; tags.push('acid');
                              }
                              // Retinoids
                              else if (has('tretinoin') || has('adapalene') || has('retin')) {
                                  role = 'retinoid'; weight = 40; tags.push('strong_active');
                              }
                              // Azelaic Acid (Versatile)
                              else if (has('azelaic')) {
                                  role = 'azelaic_acid'; weight = 42; // Can go after serums
                              }
                              // Benzoyl Peroxide (Leave-on)
                              else if (has('benzoyl')) {
                                  role = 'bp_treatment'; weight = 65; tags.push('oxidizer'); // Usually drying, put over buffer or spot treat
                              }
                              // Spot Treatments (Sulfur, etc)
                              else if (name.includes('spot')) {
                                  role = 'spot_treatment'; weight = 65;
                              }
                              // Hydrators & Barrier Support
                              else if (has('niacinamide') || has('hyaluronic') || has('snail') || has('panthenol')) {
                                  role = 'hydrating_serum'; weight = 35; 
                              } 
                              else {
                                  role = 'generic_serum'; weight = 35;
                              }
                          }

                          // --- 4. MOISTURIZERS & OCCLUSIVES ---
                          else if (type === 'lotion_cream') {
                              if (name.includes('eye')) { role = 'eye_cream'; weight = 32; } // Before heavy cream
                              else { role = 'moisturizer'; weight = 70; }
                          }
                          else if (type === 'oil_blend') { role = 'face_oil'; weight = 80; }
                          else if (type === 'mask') {
                              if (name.includes('sleep')) { role = 'sleeping_mask'; weight = 90; }
                              else { role = 'wash_off_mask'; weight = 12; } // After cleanse
                          }
                          else if (type === 'sunscreen') { role = 'sunscreen'; weight = 100; }

                          return { ...p, role, weight, tags };
                      });

                      // ======================================================
                      // PHASE 2: THE DERMATOLOGY ENGINE (Sorting Logic)
                      // ======================================================
                      let am = [], pm = [], excluded = [];

                      // -- 2.1 INGREDIENT INVENTORY CHECKS --
                      const hasRetinoid = classified.find(p => p.role === 'retinoid');
                      const hasVitC = classified.find(p => p.role === 'vitamin_c');
                      const hasCopper = classified.find(p => p.tags.includes('copper'));
                      const hasStrongAcid = classified.find(p => p.tags.includes('acid')); // AHA/BHA
                      const hasBP = classified.find(p => p.role === 'bp_treatment');

                      classified.forEach(p => {
                          // Double Cleanse Logic
                          if (p.role === 'oil_cleanser') { pm.push(p); return; }
                          if (p.role === 'water_cleanser' || p.role === 'sa_wash' || p.role === 'bp_wash') { 
                              // If BP wash, maybe only AM if using Retinol PM? 
                              // For safety, gentle cleanser is best with Retinol. 
                              // We will allow wash in both, but flag dryness if needed.
                              am.push(p); pm.push(p); return; 
                          }
                          if (p.role === 'wash_off_mask') { pm.push(p); return; }

                          // Toners
                          if (p.role === 'acid_toner') {
                              // If using Retinoid PM, Acid Toner goes AM (if skin tolerates) or excluded.
                              // Safe bet: Exclude if Retinoid present, or move to AM if no Vit C.
                              if (hasRetinoid) {
                                  if (!hasVitC) am.push(p); // Acid AM, Retinol PM
                                  else excluded.push(`${p.productName} (تعارض مع فيتامين سي والريتينول)`);
                              } else {
                                  pm.push(p); // No retinol? Acid PM is standard.
                              }
                              return;
                          }
                          if (p.role === 'hydrating_toner') { am.push(p); pm.push(p); return; }

                          // Actives Distribution
                          if (p.role === 'vitamin_c') {
                              am.push(p); // Gold standard AM
                              return;
                          }

                          if (p.role === 'copper_peptide') {
                              // Copper hates Vit C and strong Acids.
                              if (hasVitC) {
                                  pm.push(p); // Move Copper to PM
                              } else if (hasStrongAcid) {
                                  am.push(p); // Move Copper to AM
                              } else {
                                  pm.push(p); // Default PM for repair
                              }
                              return;
                          }

                          if (p.role === 'retinoid') {
                              pm.push(p); // Strictly PM
                              return;
                          }

                          if (p.role === 'aha_serum' || p.role === 'bha_serum') {
                              if (hasRetinoid) {
                                  excluded.push(`${p.productName} (تجنب الأحماض مع الريتينول)`);
                              } else {
                                  pm.push(p); // Exfoliate PM
                              }
                              return;
                          }

                          if (p.role === 'bp_treatment') {
                              // Benzoyl Peroxide
                              if (hasRetinoid) {
                                  am.push(p); // BP in AM, Retinol in PM (Classic acne protocol)
                              } else {
                                  pm.push(p); // Or spot treat PM
                              }
                              return;
                          }

                          if (p.role === 'azelaic_acid') {
                              // Azelaic is friendly. Can go AM or PM.
                              // If AM is crowded (Vit C), put PM. If PM crowded (Retinol), put AM.
                              // It actually works well WITH Retinol, but let's balance.
                              if (hasVitC && !hasRetinoid) pm.push(p);
                              else am.push(p);
                              return;
                          }

                          // General Care
                          if (p.role === 'eye_cream') { am.push(p); pm.push(p); return; }
                          if (p.role === 'hydrating_serum' || p.role === 'generic_serum') { am.push(p); pm.push(p); return; }
                          if (p.role === 'spot_treatment') { pm.push(p); return; }
                          if (p.role === 'moisturizer') { am.push(p); pm.push(p); return; }
                          if (p.role === 'face_oil' || p.role === 'sleeping_mask') { pm.push(p); return; }
                          if (p.role === 'sunscreen') { am.push(p); return; }
                          
                          // Fallback
                          pm.push(p);
                      });

                      // ======================================================
                      // PHASE 3: CONFLICT DOUBLE-CHECK (Final Sanitization)
                      // ======================================================
                      // E.g. If Copper Peptide got pushed to PM, but Retinol is there...
                      // Copper + Retinol is debatable but generally safer than Copper + Acid. 
                      // We will allow it but maybe ensure Hydration buffer.

                      // ======================================================
                      // PHASE 4: STEP CONSTRUCTION
                      // ======================================================
                      const buildSteps = (list) => {
                          list.sort((a, b) => a.weight - b.weight);
                          const steps = [];
                          const usedIds = new Set();

                          const defineStep = (label, validRoles) => {
                              const matches = list.filter(p => validRoles.includes(p.role) && !usedIds.has(p.id));
                              if (matches.length > 0) {
                                  matches.forEach(m => usedIds.add(m.id));
                                  steps.push({
                                      id: `step-${Date.now()}-${Math.random()}`,
                                      name: label,
                                      productIds: matches.map(m => m.id)
                                  });
                              }
                          };

                          defineStep('تنظيف مزدوج (زيت)', ['oil_cleanser']);
                          defineStep('غسول', ['water_cleanser', 'sa_wash', 'bp_wash']);
                          defineStep('ماسك', ['wash_off_mask']);
                          defineStep('تهيئة / تونر', ['hydrating_toner', 'acid_toner']);
                          
                          // Specific order for AM vs PM actives
                          defineStep('فيتامين C (حماية)', ['vitamin_c']);
                          defineStep('تقشير كيميائي', ['aha_serum', 'bha_serum']);
                          defineStep('ببتيدات النحاس', ['copper_peptide']);
                          defineStep('علاج حب الشباب (BP)', ['bp_treatment']);
                          defineStep('ريتينول (تجديد)', ['retinoid']);
                          defineStep('آزيليك أسيد', ['azelaic_acid']);
                          
                          defineStep('ترطيب عميق', ['hydrating_serum', 'generic_serum']);
                          defineStep('محيط العين', ['eye_cream']); // Thinner than cream
                          defineStep('علاج موضعي', ['spot_treatment']); // Before moisturizer for penetration
                          defineStep('مرطب', ['moisturizer']);
                          defineStep('إغلاق المسام (زيت/نوم)', ['face_oil', 'sleeping_mask']);
                          defineStep('واقي شمس ☀️', ['sunscreen']);

                          return steps;
                      };

                      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                      saveRoutines({ 
                          am: buildSteps(am), 
                          pm: buildSteps(pm) 
                      });

                      if (excluded.length > 0) {
                          setTimeout(() => {
                              Alert.alert(
                                  "تم استبعاد منتجات للسلامة ⚠️",
                                  `حرصاً على سلامة حاجز بشرتك، تم استبعاد المنتجات التالية مؤقتاً لوجود تعارضات كيميائية:\n\n${excluded.join('\n')}\n\nيمكنك إضافتها يدوياً في أيام التناوب (Skin Cycling).`
                              );
                          }, 1000);
                      } else {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }
                  }
              }
          ]
      );
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
        <RoutineStepCard 
            step={item} 
            index={index} 
            onManage={() => setSelectedStep(item)} 
            onDelete={() => handleDeleteStep(item.id)} // <--- NEW PROP
            products={savedProducts} 
        />
    )}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 220, paddingTop: 10 }}
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

const IngredientsSection = ({ products }) => {
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedIngredient, setSelectedIngredient] = useState(null);
    const searchAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(searchAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
    }, []);

    // 1. Process Ingredients: Map product ingredients to Rich DB
    const processedIngredients = useMemo(() => {
        const map = new Map();

        products.forEach(p => {
            const productIngs = p.analysisData?.detected_ingredients || [];
            productIngs.forEach(rawIng => {
                // Try to find rich data in DB
                const richData = findIngredientData(rawIng.name);
                
                // Use rich data ID or raw name as key
                const key = richData ? richData.id : rawIng.name.toLowerCase();
                
                if (!map.has(key)) {
                    map.set(key, {
                        ...richData, // Spread rich DB data
                        displayName: richData ? richData.name : rawIng.name, // Fallback name
                        isRich: !!richData, // Flag if we have details
                        count: 1,
                        productIds: [p.id],
                        productNames: [p.productName],
                        // Default category if not in DB
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
        return Array.from(map.values()).sort((a,b) => b.count - a.count);
    }, [products]);

    // 2. Filter Logic
    const filtered = processedIngredients.filter(ing => {
        const matchesSearch = ing.displayName.toLowerCase().includes(search.toLowerCase()) || 
                              (ing.scientific_name && ing.scientific_name.toLowerCase().includes(search.toLowerCase()));
        
        if (!matchesSearch) return false;

        if (activeFilter === 'all') return true;
        if (activeFilter === 'actives') return ['مكون فعال', 'مقشر', 'مضاد أكسدة', 'مبيض'].includes(ing.functionalCategory);
        if (activeFilter === 'moisturizers') return ['مرطب / مطري', 'مرطب'].includes(ing.functionalCategory);
        if (activeFilter === 'harmful') return ['مكون ضار', 'مادة حافظة (مثيرة للجدل)'].includes(ing.functionalCategory);
        if (activeFilter === 'natural') return ing.chemicalType?.includes('نباتي') || ing.chemicalType?.includes('طبيعي');
        
        return true;
    });

    const filters = [
        { id: 'all', label: 'الكل', icon: 'layer-group' },
        { id: 'actives', label: 'مكونات فعالة', icon: 'bolt' },
        { id: 'moisturizers', label: 'مرطبات', icon: 'tint' },
        { id: 'natural', label: 'طبيعي', icon: 'leaf' },
        { id: 'harmful', label: 'تنبيه', icon: 'exclamation-triangle' },
    ];

    const renderIngredientItem = ({ item, index }) => {
        const isRisk = item.warnings?.some(w => w.level === 'risk');
        
        return (
            <StaggeredItem index={index}>
                <PressableScale 
                    style={styles.ingCard} 
                    onPress={() => item.isRich ? setSelectedIngredient(item) : null}
                    disabled={!item.isRich}
                >
                    {/* Inner Layout Container to force Row Direction */}
                    <View style={styles.ingCardContent}>
                        
                        {/* 1. Count Badge (Right) */}
                        <View style={[styles.ingCountBadge, {backgroundColor: item.isRich ? COLORS.accentGreen : COLORS.card}]}>
                            <Text style={[styles.ingCountText, {color: item.isRich ? COLORS.textOnAccent : COLORS.textDim}]}>
                                {item.count}
                            </Text>
                        </View>

                        {/* 2. Text Info (Middle) */}
                        <View style={styles.ingInfoContainer}>
                            <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 6}}>
                                <Text style={styles.ingNameText}>{item.displayName}</Text>
                                {isRisk && <FontAwesome5 name="exclamation-circle" size={12} color={COLORS.danger} />}
                            </View>
                            
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

                        {/* 3. Arrow (Left) - Only if rich data exists */}
                        {item.isRich && (
                            <View style={{ paddingLeft: 8 }}>
                                <FontAwesome5 name="chevron-left" size={12} color={COLORS.border} />
                            </View>
                        )}
                    </View>
                </PressableScale>
            </StaggeredItem>
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
            
            {/* Horizontal Filters */}
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

            {/* List */}
            <FlatList 
                data={filtered}
                renderItem={renderIngredientItem}
                keyExtractor={(item) => item.id || item.displayName}
                contentContainerStyle={{paddingBottom: 150}}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <FontAwesome5 name="flask" size={40} color={COLORS.textDim} style={{opacity:0.5}} />
                        <Text style={styles.emptyText}>لم يتم العثور على مكونات</Text>
                    </View>
                }
            />

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


const SettingsSection = ({ profile, onLogout }) => {
    const { user } = useAppContext();
    const [openAccordion, setOpenAccordion] = useState(null); // Changed default to null so all start closed
  
    // FIX 1: Robust State Initialization
    const [form, setForm] = useState(() => ({
        goals: [], 
        conditions: [], 
        allergies: [], 
        skinType: null,
        scalpType: null,
        ...profile?.settings // Spread existing settings from props immediately
    }));
    
    const [isSaving, setIsSaving] = useState(false);
  
    // FIX 2: Strict Synchronization with Profile Prop
    // This ensures that when you navigate back to this tab, or when Firebase updates,
    // the local UI state matches the database exactly.
    useEffect(() => {
        if (profile?.settings) {
            setForm(prev => ({
                ...prev,
                ...profile.settings,
                // Ensure arrays are arrays (prevent .includes() crashes)
                goals: profile.settings.goals || [],
                conditions: profile.settings.conditions || [],
                allergies: profile.settings.allergies || [],
                // Ensure single values are at least null, not undefined
                skinType: profile.settings.skinType || null,
                scalpType: profile.settings.scalpType || null,
            }));
        }
    }, [profile]);
  
    const handleToggleAccordion = (id) => {
        Haptics.selectionAsync();
        setOpenAccordion(currentId => (currentId === id ? null : id));
    };
  
    const updateSetting = async (key, value) => {
        if (!user?.uid) { Alert.alert("Error", "User not found."); return; }
        
        // 1. Optimistic Update (Update UI immediately)
        const newForm = { ...form, [key]: value };
        setForm(newForm);
        setIsSaving(true);
  
        try {
            // 2. Persistent Update
            // Using { merge: true } ensures we don't overwrite other fields if newForm is incomplete
            await updateDoc(doc(db, 'profiles', user.uid), { 
                settings: newForm 
            }, { merge: true });
        } catch (e) {
            console.error("Error updating settings:", e);
            // Revert on error (optional, but good practice)
            // setForm(form); 
            Alert.alert("Error", "Could not save setting.");
        } finally {
            setIsSaving(false);
        }
    };
  
    const handleMultiSelectToggle = (field, itemId) => {
        const currentSelection = form[field] || [];
        const newSelection = currentSelection.includes(itemId) 
            ? currentSelection.filter(id => id !== itemId) 
            : [...currentSelection, itemId];
        updateSetting(field, newSelection);
    };
  
    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
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
        </ScrollView>
    );
  };

  const IngredientDetailsModal = ({ visible, onClose, ingredient, productsContaining }) => {
    // 0 = Closed, 1 = Open
    const animController = useRef(new Animated.Value(0)).current; 
    
    // Safety check to ensure we have data before rendering to prevent crashes
    const hasData = ingredient && visible;

    useEffect(() => {
        if (visible) {
            // OPEN: Parallel animation for background and sheet
            Animated.spring(animController, {
                toValue: 1,
                damping: 15,    // Controls bounciness (higher = less bounce)
                stiffness: 100, // Controls speed
                mass: 0.8,      // Controls weight/momentum
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const animateOut = () => {
        // CLOSE: Smooth timing animation for exit
        Animated.timing(animController, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.cubic), // Natural exit curve
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                onClose(); // Only unmount AFTER animation finishes
            }
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5, // Only trigger if dragging vertical
            onPanResponderMove: (_, gestureState) => {
                // Logic: Convert drag distance (pixels) to animation value (0-1)
                // If dragging down (positive dy), reduce the value from 1 downwards
                if (gestureState.dy > 0) {
                    const newValue = 1 - (gestureState.dy / height);
                    animController.setValue(newValue);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                // If dragged down more than 20% of screen or flicked fast
                if (gestureState.dy > height * 0.2 || gestureState.vy > 0.8) {
                    animateOut();
                } else {
                    // Snap back to open
                    Animated.spring(animController, {
                        toValue: 1,
                        damping: 15,
                        stiffness: 100,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    if (!hasData) return null;

    // --- Interpolations ---
    const backdropOpacity = animController.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.6], // Darker overlay (0.6) for better focus
    });

    const translateY = animController.interpolate({
        inputRange: [0, 1],
        outputRange: [height, 0], // Slide from bottom
    });

    // Determine safety color
    let safetyColor = COLORS.success;
    if (ingredient.warnings?.some(w => w.level === 'risk')) safetyColor = COLORS.danger;
    else if (ingredient.warnings?.some(w => w.level === 'caution')) safetyColor = COLORS.warning;

    return (
        <Modal
            transparent
            visible={true} // Keep true, we control visibility via Opacity/Translate
            onRequestClose={animateOut}
            animationType="none" // We handle animation manually
            statusBarTranslucent={true}
        >
            {/* 1. The Backdrop (Animated Opacity) */}
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={animateOut} />
            </Animated.View>

            {/* 2. The Sheet (Animated Translation) */}
            <Animated.View 
                style={[
                    styles.sheetContainer, 
                    { transform: [{ translateY }] }
                ]}
            >
                <View style={styles.sheetContent}>
                    {/* Header with PanResponder for dragging */}
                    <View 
                        {...panResponder.panHandlers} 
                        style={[styles.ingModalHeader, {borderTopLeftRadius: 24, borderTopRightRadius: 24}]}
                    >
                        <View style={styles.sheetHandleBar}>
                            <View style={styles.sheetHandle} />
                        </View>
                        
                        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.ingModalTitle}>{ingredient.name}</Text>
                                    <Text style={styles.ingModalScientific}>{ingredient.scientific_name}</Text>
                                </View>
                                <View style={[styles.ingTypeBadge, { backgroundColor: safetyColor + '15' }]}>
                                    <FontAwesome5 name="flask" size={12} color={safetyColor} />
                                    <Text style={[styles.ingTypeText, { color: safetyColor }]}>
                                        {ingredient.functionalCategory}
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={styles.ingBadgesRow}>
                                {ingredient.chemicalType && (
                                    <View style={styles.ingBadge}>
                                        <Text style={styles.ingBadgeText}>{ingredient.chemicalType}</Text>
                                    </View>
                                )}
                                <View style={styles.ingBadge}>
                                    <Text style={styles.ingBadgeText}>
                                        موجود في {productsContaining.length} منتج
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Scrollable Content */}
                    <ScrollView 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                        bounces={false} // Prevents conflict with drag gesture
                    >
                        {/* Benefits Chart */}
                        {ingredient.benefits && Object.keys(ingredient.benefits).length > 0 && (
                            <View style={styles.ingSection}>
                                <Text style={styles.ingSectionTitle}>الفوائد الرئيسية</Text>
                                {Object.entries(ingredient.benefits).map(([benefit, score]) => (
                                    <View key={benefit} style={styles.benefitRow}>
                                        <Text style={styles.benefitLabel}>{benefit}</Text>
                                        <View style={styles.benefitBarContainer}>
                                            <View style={[styles.benefitBarFill, { width: `${score * 100}%` }]} />
                                        </View>
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
                                        <FontAwesome5
                                            name={warn.level === 'risk' ? "exclamation-circle" : "info-circle"}
                                            size={16}
                                            color={warn.level === 'risk' ? COLORS.danger : COLORS.warning}
                                        />
                                        <Text style={[styles.warningText, { color: warn.level === 'risk' ? COLORS.danger : COLORS.warning }]}>
                                            {warn.text}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Synergies */}
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

                        {/* Products List */}
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

const InsightDetailsModal = ({ visible, onClose, insight }) => {
    // 1. Animation Controller (0 = closed, 1 = open)
    const animController = useRef(new Animated.Value(0)).current;

    // 2. Open Animation
    useEffect(() => {
        if (visible) {
            Animated.spring(animController, {
                toValue: 1,
                damping: 15,
                stiffness: 100,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    // 3. Close Animation
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

    if (!insight) return null;

    // 5. Interpolations
    const translateY = animController.interpolate({
        inputRange: [0, 1],
        outputRange: [height, 0],
    });
    const backdropOpacity = animController.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.6],
    });

    // Helper for colors
    const getSeverityColor = (s) => {
        if (s === 'critical') return COLORS.danger;
        if (s === 'warning') return COLORS.warning;
        return COLORS.success;
    };
    const severityColor = getSeverityColor(insight.severity);
    const iconName = insight.severity === 'critical' ? 'shield-alt' : insight.severity === 'warning' ? 'exclamation-triangle' : 'check-circle';

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            {/* Sheet */}
            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    {/* Draggable Header */}
                    <View {...panResponder.panHandlers} style={styles.sheetHandleBar}>
                        <View style={styles.sheetHandle} />
                    </View>

                    <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                        {/* Icon & Title */}
                        <View style={styles.modalHeader}>
                            <View style={[styles.modalIconContainer, { backgroundColor: severityColor + '20' }]}>
                                <FontAwesome5 name={iconName} size={24} color={severityColor} />
                            </View>
                            <Text style={styles.modalTitle}>{insight.title}</Text>
                        </View>

                        {/* Description */}
                        <Text style={styles.modalDescription}>{insight.details}</Text>

                        {/* Related Products List */}
                        {insight.related_products && insight.related_products.length > 0 && (
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

                        {/* Close Button */}
                        <PressableScale style={[styles.closeButton, { backgroundColor: severityColor }]} onPress={handleClose}>
                            <Text style={styles.closeButtonText}>فهمت</Text>
                        </PressableScale>
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
        // Haptics only when toggling the main FAB, not when clicking actions
        // (Actions have their own haptics in PressableScale)
        if (isOpen) {
             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
             Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        animateMenu(toValue);
        setIsOpen(!isOpen);
    };

    // Extract animation logic to reuse it without triggering haptics/state toggles unnecessarily
    const animateMenu = (toValue) => {
        Animated.spring(anim, {
            toValue,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const handlePressAction = (route) => {
        // 1. Close menu visually immediately
        animateMenu(0);
        setIsOpen(false);

        // 2. Navigate immediately using requestAnimationFrame
        // This ensures the touch event clears before pushing, removing the latency
        // without the need for an arbitrary setTimeout.
        requestAnimationFrame(() => {
            router.push(route);
        });
    };

    // --- Animations ---
    const rotate = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg']
    });

    const action1Y = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -140] });
    const action1Opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

    const action2Y = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -75] });
    const action2Opacity = anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0, 1] });

    const backdropOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    const Label = ({ text }) => (
        <View style={styles.actionLabelContainer}>
            <Text style={styles.actionLabel}>{text}</Text>
        </View>
    );

    return (
        <View style={styles.fabContainer}>
            {/* Backdrop */}
            {isOpen && (
                <Pressable onPress={toggleMenu}>
                    <Animated.View style={[styles.fabBackdrop, { opacity: backdropOpacity }]} />
                </Pressable>
            )}

            {/* --- BUTTON 1: COMPARISON --- */}
            <Animated.View style={[styles.actionBtnWrap, { opacity: action1Opacity, transform: [{ translateY: action1Y }] }]}>
                <Label text="مقارنة منتجات" />
                <PressableScale 
                    onPress={() => handlePressAction('/comparison')} 
                    style={[styles.actionBtn, { backgroundColor: '#4a8a73' }]}
                >
                    <FontAwesome5 name="balance-scale" size={16} color={COLORS.textOnAccent} />
                </PressableScale>
            </Animated.View>

            {/* --- BUTTON 2: SCAN/ADD --- */}
            <Animated.View style={[styles.actionBtnWrap, { opacity: action2Opacity, transform: [{ translateY: action2Y }] }]}>
                <Label text="فحص منتج" />
                <PressableScale 
                    onPress={() => handlePressAction('/oilguard')} 
                    style={[styles.actionBtn, { backgroundColor: COLORS.accentGreen }]}
                >
                    <FontAwesome5 name="magic" size={16} color={COLORS.textOnAccent} />
                </PressableScale>
            </Animated.View>

            {/* --- MAIN TRIGGER --- */}
            <PressableScale style={styles.mainFab} onPress={toggleMenu}>
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
  const [productPrice, setProductPrice] = useState('');
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
      
      Animated.parallel([
          Animated.timing(contentOpacity, { 
            toValue: 0, 
            duration: 150, 
            useNativeDriver: true 
          }),
          Animated.timing(contentTranslate, { 
            toValue: 20, 
            duration: 150, 
            useNativeDriver: true 
          })
      ]).start(() => {
          setActiveTab(tab);
          contentTranslate.setValue(-20);
          Animated.parallel([
            Animated.timing(contentOpacity, { 
              toValue: 1, 
              duration: 250, 
              useNativeDriver: true 
            }),
            Animated.spring(contentTranslate, { 
              toValue: 0, 
              friction: 7, 
              useNativeDriver: true 
            })
          ]).start();
      });
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

  // --- In your `ProfileScreen.js`, REPLACE the entire `analysisResults` useMemo hook with this ---

  const analysisResults = useMemo(() => {
    // 1. DATA PREPARATION
    const allShelfProducts = savedProducts.filter(p => p?.analysisData?.detected_ingredients);
    
    const results = {
        aiCoachInsights: [],
        amRoutine: { products: [], conflicts: 0, synergies: 0 },
        pmRoutine: { products: [], conflicts: 0, synergies: 0 },
        sunProtectionGrade: { score: 0, notes: [] },
    };

    // If no profile or products, stop here
    if (!userProfile || allShelfProducts.length === 0) {
        return results;
    }

    const settings = userProfile.settings || {};
    const { conditions = [], allergies = [] } = settings;
    
    // Map to prevent duplicate insights
    const insightsMap = new Map();
    const addInsight = (insight) => { 
        if (!insightsMap.has(insight.id)) insightsMap.set(insight.id, insight); 
    };

    // 2. CONNECT ROUTINE TABS TO SHELF PRODUCTS
    // This maps the IDs stored in the Routine tab back to the actual Product objects on the Shelf
    const mapRoutineToProducts = (period) => {
        return (userProfile.routines?.[period] || [])
            .flatMap(step => step.productIds) // Get all IDs in this period
            .map(id => allShelfProducts.find(p => p.id === id)) // Find actual product
            .filter(Boolean); // Remove nulls if product was deleted
    };

    const amProducts = mapRoutineToProducts('am');
    const pmProducts = mapRoutineToProducts('pm');
    const routineIsPopulated = amProducts.length > 0 || pmProducts.length > 0;

    // ========================================================================
    // --- TIER 1: DEEP SHELF ANALYSIS (Runs even if Routine is Empty) ---
    // ========================================================================
    
    // A. Check for "Missing Essentials" on the Shelf
    const productTypes = allShelfProducts.map(p => p.analysisData?.product_type);
    
    if (!productTypes.includes('sunscreen')) {
        addInsight({
            id: 'shelf-no-sunscreen', 
            title: 'ناقص أساسي: واقي الشمس',
            short_summary: 'رفك لا يحتوي على أي واقي شمسي.',
            details: 'مهما كانت منتجاتك باهظة الثمن، فهي لن تفيد بدون حماية من الشمس. ابحث عن منتج بمعامل حماية SPF 30+.',
            severity: 'critical'
        });
    }

    if (!productTypes.includes('cleanser') && !productTypes.includes('oil_blend')) {
         addInsight({
            id: 'shelf-no-cleanser', 
            title: 'ناقص أساسي: التنظيف',
            short_summary: 'لم نكتشف غسول أو منظف على رفك.',
            details: 'التنظيف هو الخطوة الأولى لأي روتين صحي لإزالة التراكمات والسماح للمنتجات الأخرى بالعمل.',
            severity: 'warning'
        });
    }

    // B. Ingredient "Clash" Detection (Shelf Level)
    // We check if you own dangerous combinations, even if you haven't put them in a routine yet.
    const allIngredients = allShelfProducts.flatMap(p => p.analysisData?.detected_ingredients.map(i => ({...i, product: p.productName})));
    const hasRetinol = allIngredients.find(i => i.name.toLowerCase().includes('retinol'));
    const hasAcids = allIngredients.filter(i => ['glycolic acid', 'salicylic acid', 'lactic acid'].some(acid => i.name.toLowerCase().includes(acid)));
    const hasVitaminC = allIngredients.find(i => i.name.toLowerCase().includes('ascorbic') || i.name.toLowerCase().includes('vitamin c'));

    if (hasRetinol && hasAcids.length > 0) {
        addInsight({
            id: 'conflict-shelf-retinol-acids',
            title: 'تحذير: تعارض محتمل',
            short_summary: 'تمتلك منتجات ريتينول ومقشرات أحماض.',
            details: `لديك "${hasRetinol.product}" (ريتينول) و منتجات أحماض مثل "${hasAcids[0].product}". استخدامهم معاً في نفس الوقت يسبب تهيج شديد. افصل بينهم (أحدهما صباحاً والآخر مساءً، أو في أيام مختلفة).`,
            severity: 'warning',
            related_products: [hasRetinol.product, hasAcids[0].product]
        });
    }

    if (hasRetinol && hasVitaminC) {
        addInsight({
            id: 'conflict-shelf-retinol-vitc',
            title: 'نصيحة ترتيب',
            short_summary: 'فيتامين C والريتينول.',
            details: 'يفضل استخدام فيتامين C في الصباح (للحماية من الأكسدة) والريتينول في المساء (للعلاج). لا تخلطهم في نفس الوقت.',
            severity: 'good', // Informational
            related_products: [hasRetinol.product, hasVitaminC.product]
        });
    }

    // C. Profile Matching (Allergies & Conditions)
    // ... (This stays the same as your previous code, ensuring we catch bad matches)
    allergies.forEach(id => {
        const allergyData = commonAllergies.find(a => a.id === id);
        if (!allergyData) return;
        allShelfProducts.forEach(p => {
            const problematicIng = p.analysisData?.detected_ingredients.find(i => allergyData.ingredients.includes(i.name));
            if (problematicIng) {
                addInsight({
                    id: `allergy_${id}_${p.id}`, title: 'تحذير حاسم: حساسية',
                    short_summary: `منتج "${p.productName}" يحتوي على مسبب حساسية لك (${problematicIng.name}).`,
                    details: `بناءً على إعداداتك، يجب التوقف عن استخدام هذا المنتج فوراً.`,
                    severity: 'critical', related_products: [p.productName]
                });
            }
        });
    });

    // ========================================================================
    // --- TIER 2: ROUTINE SPECIFIC ANALYSIS (Timing & Layering) ---
    // ========================================================================
    if (routineIsPopulated) {
        
        // 1. Timing Checks
        const retinolInAM = amProducts.find(p => p.analysisData?.detected_ingredients.some(i => i.name.toLowerCase().includes('retinol')));
        if (retinolInAM) {
            addInsight({
                id: 'timing-retinol-am', 
                title: 'توقيت خاطئ: ريتينول',
                short_summary: 'لا تستخدم الريتينول في الصباح.',
                details: `المنتج "${retinolInAM.productName}" يحتوي على ريتينول. ضوء الشمس يفكك الريتينول ويجعل بشرتك حساسة. انقله لروتين المساء.`,
                severity: 'critical', 
                related_products: [retinolInAM.productName]
            });
        }

        const sunscreenInPM = pmProducts.find(p => p.analysisData?.product_type === 'sunscreen');
        if (sunscreenInPM) {
            addInsight({
                id: 'timing-sunscreen-pm', 
                title: 'تنبيه: واقي شمس ليلاً؟',
                short_summary: 'لا حاجة لواقي الشمس في المساء.',
                details: `لقد وضعت "${sunscreenInPM.productName}" في روتين المساء. هذا قد يسد المسام دون فائدة.`,
                severity: 'good'
            });
        }

        // 2. Missing Routine Steps (Specific to periods)
        if (amProducts.length > 0 && !amProducts.some(p => p.analysisData?.product_type === 'sunscreen')) {
             addInsight({
                id: 'routine-missing-spf', 
                title: 'روتين الصباح ناقص',
                short_summary: 'أضفت منتجات للصباح، لكن نسيت واقي الشمس!',
                details: 'أكمل روتينك الصباحي بإضافة واقي الشمس الموجود على رفّك كآخر خطوة.',
                severity: 'critical'
            });
        }

    } else {
        // Only show the guide if NO other critical/warning insights were generated from Tier 1
        const hasImportantInsights = Array.from(insightsMap.values()).some(i => i.severity === 'critical' || i.severity === 'warning');
        
        if (!hasImportantInsights) {
             addInsight({
                id: 'guide-build-routine',
                title: 'مستعدة للخطوة التالية؟',
                short_summary: 'منتجاتك تبدو جيدة! لنرتبها الآن.',
                details: 'لقد قمنا بتحليل مكونات رفّك. للحصول على تحليل "الترتيب الصحيح" و"تعارض التوقيت"، اذهبي لتبويب "روتيني" واسحبي المنتجات إلى الصباح أو المساء.',
                severity: 'good',
            });
        }
    }

    // ========================================================================
    // --- SCORING & FINALIZATION ---
    // ========================================================================
    
    // Calculate Sun Protection Score based on Routine AND Shelf
    const hasSunscreenOnShelf = productTypes.includes('sunscreen');
    const hasSunscreenInAM = amProducts.some(p => p.analysisData?.product_type === 'sunscreen');

    if (hasSunscreenInAM) {
        results.sunProtectionGrade.score = 100;
        results.sunProtectionGrade.notes.push("✓ واقي الشمس موجود في روتين الصباح.");
    } else if (hasSunscreenOnShelf) {
        results.sunProtectionGrade.score = 50;
        results.sunProtectionGrade.notes.push("✓ لديكِ واقي شمسي على الرف.");
        results.sunProtectionGrade.notes.push("⚠ يجب إضافته لخطوات الصباح.");
    } else {
        results.sunProtectionGrade.score = 0;
        results.sunProtectionGrade.notes.push("✗ لا يوجد واقي شمسي.");
    }

    results.amRoutine.products = amProducts;
    results.pmRoutine.products = pmProducts;
    
    // Sort: Critical -> Warning -> Good
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
                        tintColor={COLORS.primary}
                        colors={[COLORS.primary]}
                        progressBackgroundColor="rgba(255,255,255,0.1)"
                    />
                }
            >
                <Animated.View style={{ 
                    opacity: contentOpacity, 
                    transform: [{ translateX: contentTranslate }] 
                }}>
                    {/* ... (ShelfSection, AnalysisSection, etc.) */}
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
      marginRight: 12,
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

  // --- UPDATED LIST ITEMS (Compact & Fixed Layout) ---
  ingCard: {
      backgroundColor: COLORS.card,
      borderRadius: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      overflow: 'hidden',
      // Subtle shadow
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

  // --- INGREDIENT DETAILS MODAL (BOTTOM SHEET) ---
  
  // Header Area
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

  // Benefits Charts
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

  // Synergies & Conflicts
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
  // --- Products List (Inside Ingredient Modal) ---
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
});