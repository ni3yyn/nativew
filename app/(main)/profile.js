import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, Pressable,
  Dimensions, ScrollView, Animated, ImageBackground, Modal, FlatList,
  Platform, UIManager, Alert, StatusBar, ActivityIndicator, LayoutAnimation,
  RefreshControl, Keyboard, Easing, I18nManager
} from 'react-native';
import { TouchableWithoutFeedback } from 'react-native'; 
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

// --- 1. SYSTEM CONFIG ---
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Force LTR logic for code, visuals are RTL
I18nManager.allowRTL(false);

const { width, height } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 150; // Much more compact
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 90 : 80; // Standard native height
const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// --- 2. THEME & ASSETS ---
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
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
    const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

    useEffect(() => {
        Animated.spring(anim, { 
          toValue: 1, 
          friction: 7, 
          tension: 40, 
          delay: index * 70, 
          useNativeDriver: true 
        }).start();
    }, []);

    return (
        <Animated.View style={{ opacity: anim, transform: [{ translateY }, { scale }] }}>
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
    const sheetAnim = useRef(new Animated.Value(height)).current;
  
    useEffect(() => {
      Animated.spring(sheetAnim, { toValue: isVisible ? 0 : height, friction: 10, tension: 80, useNativeDriver: true }).start();
    }, [isVisible]);
  
    const handleClose = () => {
      Animated.timing(sheetAnim, { toValue: height, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }).start(onClose);
    };
  
    const panResponder = useRef(PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) sheetAnim.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => { gs.dy > height * 0.3 || gs.vy > 0.5 ? handleClose() : Animated.spring(sheetAnim, { toValue: 0, friction: 10, tension: 80, useNativeDriver: true }).start(); },
    })).current;
  
    const renderHeader = () => {
        if (!product) return null;
        const { productName, analysisData } = product;
        const { safety, efficacy, user_specific_alerts = [] } = analysisData;
        const alertStyles = {
            danger: { icon: 'times-circle', color: COLORS.danger },
            warning: { icon: 'exclamation-triangle', color: COLORS.warning },
            good: { icon: 'check-circle', color: COLORS.success }
        };

        return (
            <View>
                <View {...panResponder.panHandlers} style={styles.sheetDraggableArea}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>
                    <Text style={styles.sheetProductTitle} numberOfLines={2}>{productName}</Text>
                </View>
                
                <View style={styles.sheetPillarsContainer}>
                    <View style={styles.sheetPillar}>
                        <FontAwesome5 name="shield-alt" size={20} color={COLORS.success} />
                        <Text style={styles.sheetPillarLabel}>مؤشر الأمان</Text>
                        <Text style={[styles.sheetPillarValue, {color: COLORS.success}]}>{safety.score}%</Text>
                    </View>
                    <View style={styles.sheetDividerVertical} />
                    <View style={styles.sheetPillar}>
                        <FontAwesome5 name="flask" size={20} color={COLORS.info} />
                        <Text style={styles.sheetPillarLabel}>مؤشر الفعالية</Text>
                        <Text style={[styles.sheetPillarValue, {color: COLORS.info}]}>{efficacy.score}%</Text>
                    </View>
                </View>

                {user_specific_alerts.length > 0 && (
                    <View style={styles.sheetSection}>
                        <Text style={styles.sheetSectionTitle}>تنبيهات شخصية</Text>
                        {user_specific_alerts.map((alert, index) => {
                            const style = alertStyles[alert.type];
                            return (
                                <View key={index} style={[styles.alertBox, {backgroundColor: `${style.color}15`, borderColor: `${style.color}80`}]}>
                                    <FontAwesome5 name={style.icon} size={16} color={style.color} />
                                    <Text style={styles.alertBoxText}>{alert.text}</Text>
                                </View>
                            )
                        })}
                    </View>
                )}
                 <View style={styles.sheetSection}>
                    <Text style={styles.sheetSectionTitle}>المكونات المكتشفة ({product.analysisData.detected_ingredients.length})</Text>
                 </View>
            </View>
        );
    };

    const renderIngredient = ({ item }) => (
        <View style={styles.ingredientChip}>
            <Text style={styles.ingredientChipText}>{item.name}</Text>
        </View>
    );

    if (!product) return null;
  
    return (
      <Modal transparent visible={isVisible} onRequestClose={handleClose} animationType="none">
        <Pressable style={styles.sheetOverlay} onPress={handleClose} />
        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: sheetAnim }] }]}>
            <View style={styles.sheetContent}>
                <FlatList
                    data={product.analysisData.detected_ingredients}
                    keyExtractor={(item) => item.id}
                    renderItem={renderIngredient}
                    ListHeaderComponent={renderHeader}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 15 }}
                />
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
  const sheetAnim = useRef(new Animated.Value(height)).current;
  const animationController = useRef(null);

  const openSheet = () => {
    // Stop any previous animation before starting a new one
    if (animationController.current) {
        animationController.current.stop();
    }
    // Store the new animation in the ref and start it
    animationController.current = Animated.spring(sheetAnim, { 
        toValue: 0, 
        friction: 9, 
        tension: 60, 
        useNativeDriver: true 
    });
    animationController.current.start();
};

const closeSheet = (callback) => {
  // Stop any previous animation
  if (animationController.current) {
      animationController.current.stop();
  }
  // Store the new animation in the ref and start it
  animationController.current = Animated.timing(sheetAnim, { 
      toValue: height, 
      duration: 250, 
      useNativeDriver: true 
  });
  // The .start() method can take a completion callback
  animationController.current.start(() => {
      // Only run the callback if the animation completed successfully
      if (callback) callback({ finished: true });
  });
};

  useEffect(() => { if (selectedInsight) openSheet(); }, [selectedInsight]);

  const handleClose = () => {
    // This function now has only ONE job: start the closing animation.
    // The actual state change that removes the modal will happen in the callback.
    closeSheet(() => {
        // This callback runs after the 250ms animation.
        // It ensures the modal is fully hidden before it's removed from the UI tree.
        setSelectedInsight(null);
    });
};
  const panResponder = useRef(PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) sheetAnim.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => { gs.dy > height * 0.3 || gs.vy > 0.5 ? handleClose() : openSheet(); },
  })).current;

  const handleSelectInsight = useCallback((insight) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Set the state IMMEDIATELY. This is the key to the fast feeling.
    // The useEffect below will automatically trigger the openSheet animation.
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
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
          
          {/* 1. Hero Section: Either Focus Insight or All Clear */}
          {focusInsight ? (
              <FocusInsight insight={focusInsight} onSelect={handleSelectInsight} />
          ) : (
              <AllClearState />
          )}

          {/* 2. Carousel for other insights */}
          {carouselInsights.length > 0 && (
               <InsightCarousel insights={carouselInsights} onSelect={handleSelectInsight} />
          )}

          {/* 3. Overview Dashboard */}
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
                         <View style={{flex: 1, marginRight: 15}}>
                             {(analysisResults?.sunProtectionGrade?.notes || []).map((note, i) => (
                                  <Text key={i} style={styles.sunProtectionNote}>{note}</Text>
                             ))}
                         </View>
                     </View>
                  </ContentCard>
              </View>
          </View>

          {/* Bottom Sheet Modal */}
          <Modal transparent visible={!!selectedInsight} animationType="none" onRequestClose={handleClose}>
              <Pressable style={styles.sheetOverlay} onPress={handleClose}>
                  <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: sheetAnim }] }]}>
                      <Pressable>
                           <ContentCard style={styles.sheetContent}>
                              <View style={styles.sheetHandleBar} {...panResponder.panHandlers}>
                                  <View style={styles.sheetHandle} />
                              </View>
                              <View style={styles.modalHeader}>
                                  <View style={[styles.modalIconContainer, { backgroundColor: `${COLORS[selectedInsight?.severity === 'critical' ? 'danger' : selectedInsight?.severity || 'info']}20` }]}>
                                      <FontAwesome5 
                                          name={selectedInsight?.severity === 'critical' ? 'shield-alt' : selectedInsight?.severity === 'warning' ? 'exclamation-triangle' : 'check-circle'} 
                                          size={22} 
                                          color={COLORS[selectedInsight?.severity === 'critical' ? 'danger' : selectedInsight?.severity || 'info']} 
                                      />
                                  </View>
                                  <Text style={styles.modalTitle}>{selectedInsight?.title}</Text>
                              </View>
                              <ScrollView showsVerticalScrollIndicator={false}>
                                  <Text style={styles.modalDescription}>{selectedInsight?.details}</Text>
                                  {selectedInsight?.related_products && selectedInsight.related_products.length > 0 && (
                                      <View style={{width: '100%', marginBottom: 20}}>
                                          <Text style={styles.relatedProductsTitle}>المنتجات ذات الصلة:</Text>
                                          {selectedInsight.related_products.map(p => <Text key={p} style={styles.relatedProductItem}>- {p}</Text>)}
                                      </View>
                                  )}
                              </ScrollView>
                              <PressableScale style={styles.closeButton} onPress={handleClose}>
                                  <Text style={styles.closeButtonText}>فهمت</Text>
                              </PressableScale>
                          </ContentCard>
                      </Pressable>
                  </Animated.View>
              </Pressable>
          </Modal>
      </ScrollView>
  );
};


// --- HELPER 1: The Custom Prompt Modal as a Bottom Sheet ---
// --- HELPER 1: The Custom Prompt Modal as a Bottom Sheet ---
const AddStepModal = ({ isVisible, onClose, onAdd }) => {
  const [stepName, setStepName] = useState('');
  // Animate the vertical position, starting from off-screen bottom
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
      if (isVisible) {
          setStepName('');
          // Animate the sheet sliding into view
          Animated.spring(slideAnim, { 
              toValue: 0, 
              friction: 9, 
              tension: 60, 
              useNativeDriver: true 
          }).start();
      }
  }, [isVisible]);

  const handleClose = () => {
      // Animate the sheet sliding out of view
      Animated.timing(slideAnim, { 
          toValue: height, 
          duration: 250, 
          easing: Easing.inOut(Easing.ease), 
          useNativeDriver: true 
      }).start(() => {
          onClose(); // Call the onClose callback after animation completes
      });
  };

  const handleAdd = () => {
      if (stepName.trim()) {
          onAdd(stepName.trim());
          handleClose();
      } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
  };

  if (!isVisible) return null;

  return (
      <Modal visible={isVisible} transparent animationType="none" onRequestClose={handleClose}>
          <Pressable style={styles.sheetOverlay} onPress={handleClose}>
              {/* The Animated.View is the sheet itself, which we translate */}
              <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
                  {/* Pressable prevents taps inside the sheet from closing it */}
                  <Pressable> 
                      {/* The ContentCard has styles to remove bottom corners */}
                      <ContentCard style={styles.sheetContent}>
                          <View style={styles.sheetHandleBar}>
                              <View style={styles.sheetHandle} />
                          </View>
                          <Text style={styles.modalTitle}>إضافة خطوة جديدة</Text>
                          <Text style={styles.promptModalSub}>أدخل اسم الخطوة (مثال: سيروم أو قناع الطين).</Text>
                          <TextInput
                              placeholder="اسم الخطوة..."
                              placeholderTextColor={COLORS.textDim}
                              style={styles.promptInput}
                              value={stepName}
                              onChangeText={setStepName}
                              autoFocus={true}
                          />
                          <View style={styles.promptButtonRow}>
                              <PressableScale style={[styles.promptButton, styles.promptButtonSecondary]} onPress={handleClose}>
                                  <Text style={[styles.promptButtonText, styles.promptButtonTextSecondary]}>إلغاء</Text>
                              </PressableScale>
                              <PressableScale style={[styles.promptButton, styles.promptButtonPrimary]} onPress={handleAdd}>
                                   <Text style={[styles.promptButtonText, styles.promptButtonTextPrimary]}>إضافة</Text>
                              </PressableScale>
                          </View>
                      </ContentCard>
                  </Pressable>
              </Animated.View>
          </Pressable>
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
const RoutineStepCard = ({ step, index, onManage, products }) => {
  const productList = step.productIds.map(id => products.find(p => p.id === id)).filter(Boolean);
  const isStepFilled = productList.length > 0;

  return (
      <StaggeredItem index={index}>
          <View style={styles.routineTimelineItem}>
              <View style={styles.timelineGutter}>
                  <View style={[styles.timelineNode, isStepFilled && styles.timelineNodeActive]}>
                      <Text style={[styles.timelineNodeText, isStepFilled && styles.timelineNodeTextActive]}>{index + 1}</Text>
                  </View>
                  <View style={styles.timelineLine} />
              </View>
              <View style={{flex: 1}}>
                  <ContentCard style={styles.stepContentCard}>
                      <View style={styles.stepHeader}>
                          <Text style={styles.stepTitle}>{step.name}</Text>
                          <PressableScale onPress={onManage} style={styles.manageStepButton}>
                              <Text style={styles.manageStepButtonText}>إدارة</Text>
                          </PressableScale>
                      </View>
                      {isStepFilled ? (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row-reverse', gap: 8, paddingTop: 10}}>
                              {productList.map(p => (
                                  <View key={p.id} style={styles.routineProductPill}><Text style={styles.routineProductPillText} numberOfLines={1}>{p.productName}</Text></View>
                              ))}
                          </ScrollView>
                      ) : (
                          <Text style={styles.stepEmptyText}>اضغط على "إدارة" لإضافة منتجات لهذه الخطوة</Text>
                      )}
                  </ContentCard>
              </View>
          </View>
      </StaggeredItem>
  );
};


// --- HELPER 4: The Bottom Sheet Modal for Editing a Step ---
const StepEditorModal = ({ isVisible, onClose, step, onSave, allProducts }) => {
  const sheetAnim = useRef(new Animated.Value(height)).current;
  const [currentProducts, setCurrentProducts] = useState([]);
  const [isAddModalVisible, setAddModalVisible] = useState(false);

  const handleClose = () => {
      Animated.timing(sheetAnim, { toValue: height, duration: 250, useNativeDriver: true }).start(() => onClose());
  };

  useEffect(() => {
      if (isVisible && step) {
          const initialProducts = step.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean);
          setCurrentProducts(initialProducts);
          Animated.spring(sheetAnim, { toValue: 0, friction: 9, useNativeDriver: true }).start();
      }
  }, [isVisible, step]);

  const handleReorder = (index, direction) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= currentProducts.length) return;
      const items = [...currentProducts];
      const [removed] = items.splice(index, 1);
      items.splice(newIndex, 0, removed);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentProducts(items);
      Haptics.selectionAsync();
  };

  const handleRemove = (productId) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentProducts(prev => prev.filter(p => p.id !== productId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleAddProduct = (productId) => {
      const productToAdd = allProducts.find(p => p.id === productId);
      if (productToAdd && !currentProducts.some(p => p.id === productId)) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setCurrentProducts(prev => [...prev, productToAdd]);
      }
      setAddModalVisible(false);
  };

  const handleSaveChanges = () => {
      if (!step) return;
      const updatedProductIds = currentProducts.map(p => p.id);
      onSave(step.id, updatedProductIds);
      handleClose();
  };

  const renderReorderItem = ({ item, index }) => (
      <View style={styles.reorderItem}>
          <View style={styles.reorderControls}>
              <TouchableOpacity onPress={() => handleReorder(index, -1)} disabled={index === 0}><Feather name="chevron-up" size={22} color={index === 0 ? COLORS.border : COLORS.textSecondary} /></TouchableOpacity>
              <TouchableOpacity onPress={() => handleReorder(index, 1)} disabled={index === currentProducts.length - 1}><Feather name="chevron-down" size={22} color={index === currentProducts.length - 1 ? COLORS.border : COLORS.textSecondary} /></TouchableOpacity>
          </View>
          <Text style={styles.reorderItemText} numberOfLines={2}>{item.productName}</Text>
          <PressableScale onPress={() => handleRemove(item.id)} style={styles.reorderRemoveButton}><FontAwesome5 name="times" size={14} color={COLORS.danger} /></PressableScale>
      </View>
  );
  
  if (!step) return null;

  return (
      <Modal transparent visible={isVisible} onRequestClose={handleClose} animationType="none">
          <Pressable style={styles.sheetOverlay} onPress={handleClose}>
              <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: sheetAnim }] }]}>
                  <Pressable>
                      <ContentCard style={styles.sheetContent}>
                          <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>
                          <View style={styles.stepModalHeader}>
                              <Text style={styles.stepModalTitle}>تعديل خطوة: {step.name}</Text>
                              <PressableScale onPress={() => setAddModalVisible(true)} style={styles.addProductButton}><Feather name="plus" size={16} color={COLORS.textOnAccent} /><Text style={styles.addProductButtonText}>إضافة منتج</Text></PressableScale>
                          </View>
                          <FlatList data={currentProducts} renderItem={renderReorderItem} keyExtractor={item => item.id}
                              ListEmptyComponent={() => (
                                  <View style={styles.stepModalEmpty}><MaterialCommunityIcons name="playlist-plus" size={48} color={COLORS.textDim} /><Text style={styles.stepModalEmptyText}>هذه الخطوة فارغة</Text></View>
                              )}
                          />
                          <PressableScale onPress={handleSaveChanges} style={styles.saveStepButton}><Text style={styles.saveStepButtonText}>حفظ التغييرات</Text></PressableScale>
                      </ContentCard>
                  </Pressable>
              </Animated.View>
          </Pressable>
          <Modal transparent visible={isAddModalVisible} animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
              <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
                  <ContentCard style={styles.modalContent}>
                      <View style={styles.modalHeader}><Text style={styles.modalTitle}>اختر منتج من رفّك</Text><TouchableOpacity onPress={() => setAddModalVisible(false)}><FontAwesome5 name="times" color={COLORS.textDim} size={18}/></TouchableOpacity></View>
                      <FlatList data={allProducts.filter(p => !currentProducts.some(cp => cp.id === p.id))} keyExtractor={item => item.id}
                          renderItem={({item}) => (
                              <PressableScale onPress={() => handleAddProduct(item.id)} style={styles.modalItem}><Text style={styles.modalItemName}>{item.productName}</Text><FontAwesome5 name="plus-circle" color={COLORS.accentGreen} size={20} /></PressableScale>
                          )}
                      />
                  </ContentCard>
              </Pressable>
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActivePeriod(period);
  };

  const handleAddStep = (stepName) => {
    if (stepName) {
        const newStep = { id: `step-${Date.now()}`, name: stepName, productIds: [] };
        const newRoutines = JSON.parse(JSON.stringify(routines));
        if (!newRoutines[activePeriod]) newRoutines[activePeriod] = [];
        newRoutines[activePeriod].push(newStep);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        saveRoutines(newRoutines);
    }
};

  const handleUpdateStep = (stepId, newProductIds) => {
      const newRoutines = JSON.parse(JSON.stringify(routines));
      const stepIndex = newRoutines[activePeriod].findIndex(s => s.id === stepId);
      if (stepIndex !== -1) { newRoutines[activePeriod][stepIndex].productIds = newProductIds; saveRoutines(newRoutines); }
  };

  const handleAutoBuildRoutine = () => {
      // ... (no changes in this function)
      if (savedProducts.length < 2) { Alert.alert("منتجات غير كافية", "يجب أن يكون لديك منتجان على الأقل على رفّك لاستخدام هذه الميزة."); return; }
      Alert.alert("إنشاء روتين تلقائي؟", "سيقوم هذا بمسح روتينك الحالي وإنشاء روتين جديد مقترح. هل أنت متأكد؟",
          [{ text: "إلغاء", style: "cancel" }, { text: "نعم، أنشئ",
              onPress: () => {
                  const productClassifier = p => {
                      const type = p.analysisData?.product_type || 'other', name = p.productName.toLowerCase(), ingredients = p.analysisData?.detected_ingredients.map(i => i.name.toLowerCase()) || [];
                      if (type === 'sunscreen') return 'sunscreen'; if (type === 'lotion_cream') return 'hydrator'; if (type === 'serum') return ingredients.some(i => i.includes('retinol') || i.includes('glycolic')) ? 'treatment' : 'serum'; if (type === 'treatment') return 'treatment'; if (type === 'oil_blend') return name.includes('مزيل') ? 'oil_cleanser' : 'oil'; if (type === 'cleanser') return 'water_cleanser'; return 'serum';
                  };
                  const classified = savedProducts.map(p => ({ ...p, routineStep: productClassifier(p) }));
                  const am = { water_cleanser: [], serum: [], hydrator: [], sunscreen: [] }, pm = { oil_cleanser: [], water_cleanser: [], treatment: [], serum: [], hydrator: [], oil: [] };
                  classified.forEach(p => { if (p.routineStep !== 'sunscreen') pm[p.routineStep].push(p.id); if (!['treatment', 'oil_cleanser', 'oil'].includes(p.routineStep)) am[p.routineStep].push(p.id); });
                  const newAm = [{ id: 'auto-am-1', name: 'غسول', productIds: am.water_cleanser }, { id: 'auto-am-2', name: 'سيروم', productIds: am.serum }, { id: 'auto-am-3', name: 'مرطب', productIds: am.hydrator }, { id: 'auto-am-4', name: 'واقي شمسي', productIds: am.sunscreen }].filter(s => s.productIds.length > 0);
                  const newPm = [{ id: 'auto-pm-1', name: 'تنظيف زيتي', productIds: pm.oil_cleanser }, { id: 'auto-pm-2', name: 'تنظيف مائي', productIds: pm.water_cleanser }, { id: 'auto-pm-3', name: 'علاج/مقشر', productIds: pm.treatment }, { id: 'auto-pm-4', name: 'سيروم', productIds: pm.serum }, { id: 'auto-pm-5', name: 'مرطب/زيت', productIds: [...pm.hydrator, ...pm.oil] }].filter(s => s.productIds.length > 0);
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                  saveRoutines({ am: newAm, pm: newPm });
              }
          }]
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
            renderItem={({ item, index }) => <RoutineStepCard step={item} index={index} onManage={() => setSelectedStep(item)} products={savedProducts} />}
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

        {selectedStep && <StepEditorModal isVisible={!!selectedStep} onClose={() => setSelectedStep(null)} step={selectedStep} onSave={handleUpdateStep} allProducts={savedProducts} />}
        {showOnboarding && <RoutineOnboardingGuide onDismiss={() => setShowOnboarding(false)} />}
        
        {/* The AddStepModal is NO LONGER RENDERED HERE */}
    </View>
);
};

const IngredientsSection = ({ products }) => {
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const searchAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(searchAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            delay: 100,
            useNativeDriver: true
        }).start();
    }, []);

    const allIngredients = useMemo(() => {
        const map = new Map();
        products.forEach(p => {
            p.analysisData?.detected_ingredients?.forEach(i => {
                if(!map.has(i.name)) {
                    map.set(i.name, { 
                        count: 1, 
                        type: i.category || 'نشط',
                        productNames: [p.productName]
                    });
                } else {
                    const data = map.get(i.name);
                    data.count++;
                    data.productNames.push(p.productName);
                }
            });
        });
        return Array.from(map.entries());
    }, [products]);

    const filtered = allIngredients.filter(([name, data]) => {
        const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = activeFilter === 'all' || 
                            (activeFilter === 'oils' && data.type === 'زيوت') ||
                            (activeFilter === 'exfoliants' && data.type === 'مقشر') ||
                            (activeFilter === 'hydrators' && data.type === 'مرطب') ||
                            (activeFilter === 'antioxidants' && data.type === 'مضاد');
        return matchesSearch && matchesFilter;
    });

    const searchScale = searchAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.95, 1]
    });

    const renderIngredientItem = ({ item: [name, data], index }) => (
        <StaggeredItem index={index}>
            <PressableScale style={styles.ingRow}>
                <View style={{flex: 1}}>
                    <Text style={styles.ingName}>{name}</Text>
                    <View style={{flexDirection:'row-reverse', alignItems:'center', marginTop:4}}>
                        <View style={[styles.ingDot, {backgroundColor: COLORS.primary}]} />
                        <Text style={styles.ingType}>{data.type}</Text>
                    </View>
                    {data.productNames.length > 0 && (
                        <Text style={styles.ingProducts} numberOfLines={1}>
                            في: {data.productNames.slice(0, 2).join(', ')}
                            {data.productNames.length > 2 && ` +${data.productNames.length - 2}`}
                        </Text>
                    )}
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>x{data.count}</Text>
                </View>
            </PressableScale>
        </StaggeredItem>
    );

    const renderEmpty = () => (
        <View style={styles.emptyState}>
            <FontAwesome5 name="flask" size={50} color={COLORS.textDim} />
            <Text style={styles.emptyText}>لا توجد مكونات</Text>
            <Text style={styles.emptySub}>أضف منتجات لرؤية المكونات</Text>
        </View>
    );

    return (
        <View style={{ flex: 1 }}>
            {/* Search Bar */}
            <Animated.View style={[
                styles.searchBar,
                { transform: [{ scale: searchScale }] }
            ]}>
                <TextInput 
                    placeholder="بحث في المكونات..." 
                    placeholderTextColor={COLORS.textDim} 
                    style={styles.searchInput} 
                    value={search} 
                    onChangeText={setSearch} 
                />
                <FontAwesome5 name="search" size={16} color={COLORS.textDim} />
            </Animated.View>
            
            {/* Filters */}
            <View style={{flexDirection:'row-reverse', flexWrap:'wrap', gap:8, marginBottom: 15}}>
                {INGREDIENT_FILTERS.map((f, index) => (
                    <PressableScale
                        key={f.id}
                        onPress={() => setActiveFilter(f.id)}
                        style={[
                            styles.filterPill,
                            activeFilter === f.id && styles.filterPillActive,
                            { marginLeft: index > 0 ? 0 : undefined }
                        ]}
                        delay={index * 50}
                    >
                        <FontAwesome5 
                            name={f.icon} 
                            size={12} 
                            color={activeFilter === f.id ? COLORS.darkGreen : COLORS.textDim} 
                        />
                        <Text style={[
                            styles.filterText,
                            activeFilter === f.id && styles.filterTextActive
                        ]}>
                            {f.label}
                        </Text>
                    </PressableScale>
                ))}
            </View>

            {/* Stats */}
            <View style={styles.ingredientsStats}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>إجمالي المكونات</Text>
                    <AnimatedCount value={allIngredients.length} style={styles.statValue} />
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>مختلفة</Text>
                    <AnimatedCount 
                        value={new Set(allIngredients.map(([name]) => name)).size} 
                        style={styles.statValue} 
                    />
                </View>
            </View>

            {/* Ingredients List */}
            <FlatList 
                data={filtered}
                renderItem={renderIngredientItem}
                keyExtractor={([name]) => name}
                contentContainerStyle={{paddingBottom: 150}}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={renderEmpty}
            />
        </View>
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
  const [openAccordion, setOpenAccordion] = useState('null'); // State to track which accordion is open, default to 'traits'

  const [form, setForm] = useState({
      goals: [], conditions: [], allergies: [], ...profile?.settings
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
      setForm(currentForm => ({
          ...currentForm, ...profile?.settings,
          goals: profile?.settings?.goals || [],
          conditions: profile?.settings?.conditions || [],
          allergies: profile?.settings?.allergies || [],
      }));
  }, [profile]);

  // This function ensures only one accordion is open at a time
  const handleToggleAccordion = (id) => {
      Haptics.selectionAsync();
      setOpenAccordion(currentId => (currentId === id ? null : id));
  };

  const updateSetting = async (key, value) => {
      if (!user?.uid) { Alert.alert("Error", "User not found."); return; }
      setIsSaving(true);
      const newForm = { ...form, [key]: value };
      setForm(newForm);
      try {
          await updateDoc(doc(db, 'profiles', user.uid), { settings: newForm });
      } catch (e) {
          console.error("Error updating settings:", e);
          Alert.alert("Error", "Could not save setting.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleMultiSelectToggle = (field, itemId) => {
      const currentSelection = form[field] || [];
      const newSelection = currentSelection.includes(itemId) ? currentSelection.filter(id => id !== itemId) : [...currentSelection, itemId];
      updateSetting(field, newSelection);
  };

  return (
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
          {/* --- UPDATE: Basic Traits is now an Accordion --- */}
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

          {/* Goals (Collapsible) */}
          <StaggeredItem index={1}>
              <Accordion title="الأهداف" icon="crosshairs" isOpen={openAccordion === 'goals'} onPress={() => handleToggleAccordion('goals')}>
                  <MultiSelectGroup options={GOALS_LIST.map(g => ({...g, name: g.label}))} selectedValues={form.goals} onToggle={(id) => handleMultiSelectToggle('goals', id)} />
              </Accordion>
          </StaggeredItem>

          {/* Health Conditions (Collapsible) */}
          <StaggeredItem index={2}>
              <Accordion title="الحالات الصحية" icon="heartbeat" isOpen={openAccordion === 'conditions'} onPress={() => handleToggleAccordion('conditions')}>
                  <MultiSelectGroup options={commonConditions} selectedValues={form.conditions} onToggle={(id) => handleMultiSelectToggle('conditions', id)} />
              </Accordion>
          </StaggeredItem>

          {/* Allergies (Collapsible) */}
          <StaggeredItem index={3}>
              <Accordion title="الحساسية" icon="allergies" isOpen={openAccordion === 'allergies'} onPress={() => handleToggleAccordion('allergies')}>
                  <MultiSelectGroup options={commonAllergies} selectedValues={form.allergies} onToggle={(id) => handleMultiSelectToggle('allergies', id)} />
              </Accordion>
          </StaggeredItem>
          
          {/* Account Management (Collapsible) */}
          <StaggeredItem index={4}>
               <Accordion title="إدارة الحساب" icon="user-cog" isOpen={openAccordion === 'account'} onPress={() => handleToggleAccordion('account')}>
                  <PressableScale onPress={onLogout} style={styles.logoutBtn}>
                      <Text style={styles.logoutText}>تسجيل الخروج</Text>
                      <FontAwesome5 name="sign-out-alt" size={16} color={COLORS.danger} />
                  </PressableScale>
               </Accordion>
          </StaggeredItem>
      </ScrollView>
  );
};

// ============================================================================
//                       MAIN PROFILE CONTROLLER
// ============================================================================

export default function ProfileScreen() {
  const { user, userProfile, savedProducts, setSavedProducts, loading, logout } = useAppContext();
  const router = useRouter();
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
    inputRange: [0, SCROLL_DISTANCE], 
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT], 
    extrapolate: 'clamp' 
  });

  const expandedHeaderOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE / 2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const expandedHeaderTranslate = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const collapsedHeaderOpacity = scrollY.interpolate({
    inputRange: [SCROLL_DISTANCE / 2, SCROLL_DISTANCE],
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
    // Use all products on the shelf with valid data as the base for our analysis
    const allShelfProducts = savedProducts.filter(p => p?.analysisData?.detected_ingredients);
    
    // Default structure
    const results = {
        aiCoachInsights: [],
        amRoutine: { products: [], conflicts: 0, synergies: 0 },
        pmRoutine: { products: [], conflicts: 0, synergies: 0 },
        sunProtectionGrade: { score: 0, notes: [] },
    };

    if (!userProfile) {
        return results;
    }

    const settings = userProfile.settings || {};
    const { conditions = [], allergies = [] } = settings;
    
    const insightsMap = new Map();
    const addInsight = (insight) => { if (!insightsMap.has(insight.id)) insightsMap.set(insight.id, insight); };

    const amProducts = (userProfile.routines?.am || []).map(step => step ? savedProducts.find(p => p.id === step.id) : null).filter(Boolean);
    const pmProducts = (userProfile.routines?.pm || []).map(step => step ? savedProducts.find(p => p.id === step.id) : null).filter(Boolean);
    const routineIsPopulated = amProducts.length > 0 || pmProducts.length > 0;

    // --- TIER 1: SHELF-WIDE ANALYSIS (Always Runs) ---
    // These checks run on ALL products against your profile data.
    if (allShelfProducts.length > 0) {
        // Allergy & Condition Analysis (runs on the entire shelf)
        allergies.forEach(id => {
            const allergyData = commonAllergies.find(a => a.id === id);
            if (!allergyData) return;
            allShelfProducts.forEach(p => {
                const problematicIng = p.analysisData?.detected_ingredients.find(i => allergyData.ingredients.includes(i.name));
                if (problematicIng) {
                    addInsight({
                        id: `allergy_${id}_${p.id}`, title: 'تحذير حاسم: مكون مسبب للحساسية',
                        short_summary: `منتج "${p.productName}" يحتوي على "${problematicIng.name}" المرتبط بحساسيتك.`,
                        details: `ينصح بشدة بالتوقف عن استخدام "${p.productName}" لتجنب رد فعل تحسيّسي.`,
                        severity: 'critical', related_products: [p.productName]
                    });
                }
            });
        });

        conditions.forEach(id => {
            const conditionData = commonConditions.find(c => c.id === id);
            if (!conditionData?.avoidIngredients) return;
            allShelfProducts.forEach(p => {
                const problematicIng = p.analysisData?.detected_ingredients.find(i => conditionData.avoidIngredients.includes(i.name));
                if (problematicIng) {
                    addInsight({
                        id: `condition_${id}_${p.id}`, title: `تنبيه: مكون لا يناسب حالتك`,
                        short_summary: `منتج "${p.productName}" يحتوي على "${problematicIng.name}" الذي لا ينصح به مع "${conditionData.name}".`,
                        details: `بناءً على ملفك الشخصي، من الأفضل تجنب استخدام "${p.productName}" لأنه يحتوي على ${problematicIng.name}.`,
                        severity: 'warning', related_products: [p.productName]
                    });
                }
            });
        });
    }

    // --- TIER 2: ROUTINE-SPECIFIC ANALYSIS (Conditional) ---
    if (routineIsPopulated) {
        // If the routine is populated, run deeper analysis.
        const usesSunscreenInAM = amProducts.some(p => p.analysisData?.product_type === 'sunscreen');
        if (amProducts.length > 0 && !usesSunscreenInAM) {
            addInsight({
                id: 'missing-sunscreen-in-routine', title: 'حماية ناقصة!',
                short_summary: 'روتينك الصباحي لا يحتوي على واقي شمسي.',
                details: 'واقي الشمس هو أهم منتج لحماية البشرة. من الضروري إضافته كآخر خطوة في روتينك كل صباح.',
                severity: 'critical'
            });
        }

        const retinoidInAM = amProducts.find(p => p.analysisData?.detected_ingredients.some(i => i.name.toLowerCase().includes('retinol')));
        if (retinoidInAM) {
            addInsight({
                id: 'retinol_am', title: 'توقيت غير مناسب',
                short_summary: 'الريتينول في الصباح قد يزيد حساسية البشرة للشمس.',
                details: 'الريتينول يتحلل بأشعة الشمس ويفقد فعاليته، وقد يزيد من حساسية بشرتك للشمس. يجب استخدامه في روتينك المسائي فقط.',
                severity: 'critical', related_products: [retinoidInAM.productName]
            });
        }
        
        const amTypes = amProducts.map(p => p.analysisData?.product_type);
        if (amTypes.indexOf('oil_blend') !== -1 && amTypes.indexOf('lotion_cream') !== -1 && amTypes.indexOf('oil_blend') < amTypes.indexOf('lotion_cream')) {
          addInsight({ id: 'layering-issue-am', title: 'مشكلة في ترتيب المنتجات', short_summary: 'في روتين الصباح، يجب وضع الزيت بعد المرطب.', details: 'يجب دائمًا تطبيق المنتجات ذات الأساس المائي (السيرومات والمرطبات) أولاً، ثم المنتجات الزيتية بعدها لحبس الترطيب.', severity: 'warning'});
        }

    } else if (allShelfProducts.length > 0) {
        // *** NEW: The Guide Message ***
        // If routine is NOT populated, but the shelf HAS products, add the guide.
        addInsight({
            id: 'guide-build-routine',
            title: 'مستعدة للخطوة التالية؟',
            short_summary: 'بناء روتينك يفتح لك تحليلات أعمق وأكثر دقة!',
            details: 'لقد حللنا منتجاتك على الرف بناءً على ملفك الشخصي. لإضافة تحليلات التوقيت، تعارضات الاستخدام، وترتيب الطبقات، قومي بسحب وإفلات منتجاتك في علامة تبويب "روتيني".',
            severity: 'warning', // Use 'warning' to ensure it appears as the focus insight.
        });
    }

    // --- FINAL AGGREGATION & SMART SUN PROTECTION GRADE ---
    const hasSunscreenOnShelf = allShelfProducts.some(p => p.analysisData?.product_type === 'sunscreen');
    const hasSunscreenInAM = amProducts.some(p => p.analysisData?.product_type === 'sunscreen');

    if (hasSunscreenInAM) {
        results.sunProtectionGrade.score = 100;
        results.sunProtectionGrade.notes.push("✓ واقي الشمس موجود في روتين الصباح.");
    } else if (hasSunscreenOnShelf) {
        results.sunProtectionGrade.score = 50;
        results.sunProtectionGrade.notes.push("✓ لديكِ واقي شمسي على الرف.");
        results.sunProtectionGrade.notes.push("✗ لكنه غير موجود في روتين الصباح!");
    } else {
        results.sunProtectionGrade.score = 0;
        results.sunProtectionGrade.notes.push("✗ لا يوجد واقي شمسي على الرف!");
    }

    results.amRoutine.products = amProducts;
    results.pmRoutine.products = pmProducts;
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
                <Animated.View style={[styles.headerContentCollapsed, { opacity: collapsedHeaderOpacity }]}>
                    <Text style={styles.collapsedTitle}>
                        {userProfile?.settings?.name || 'الملف الشخصي'}
                    </Text>
                </Animated.View>
            </Animated.View>

            {/* --- MAIN SCROLL --- */}
            <Animated.ScrollView
                contentContainerStyle={{ 
                    paddingHorizontal: 15, 
                    paddingTop: HEADER_MAX_HEIGHT + 20,
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
         {activeTab === 'shelf' && (
                <PressableScale 
                    style={styles.fab} 
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push('/oilguard');
                    }}
                >
                   <LinearGradient 
                    colors={[COLORS.accentGreen, '#4a8a73']} // Adjusted gradient
                    style={styles.fabGradient}
                >
                    <FontAwesome5 name="plus" size={22} color={COLORS.textOnAccent} />
                </LinearGradient>
            </PressableScale>
        )}
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
      height: HEADER_MIN_HEIGHT - (Platform.OS === 'ios' ? 45 : 20),
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
sheetProductTitle: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 15,
    marginBottom: 20,
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
  routineTimelineItem: {
      flexDirection: 'row-reverse',
      marginBottom: 5,
  },
  timelineGutter: {
      alignItems: 'center',
      marginRight: 15,
  },
  timelineNode: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.card,
      borderWidth: 2,
      borderColor: COLORS.border,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
  },
  timelineNodeActive: {
      backgroundColor: COLORS.accentGlow,
      borderColor: COLORS.accentGreen,
  },
  timelineNodeText: {
      fontFamily: 'Tajawal-Bold',
      color: COLORS.textSecondary,
      fontSize: 14,
  },
  timelineNodeTextActive: {
      color: COLORS.accentGreen,
  },
  timelineLine: {
      flex: 1,
      width: 2,
      backgroundColor: COLORS.border,
      marginTop: -2,
  },
  stepContentCard: {
      paddingVertical: 18,
      paddingHorizontal: 20,
      marginBottom: 15,
  },
  stepHeader: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  stepTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 16,
      color: COLORS.textPrimary,
  },
  manageStepButton: {
      backgroundColor: COLORS.background,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
  },
  manageStepButtonText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 12,
      color: COLORS.textSecondary,
  },
  stepEmptyText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textDim,
      textAlign: 'right',
      marginTop: 10,
  },
  routineProductPillText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textSecondary,
  },
  routineEmptyState: {
      marginTop: 60,
      alignItems: 'center',
      padding: 20,
  },
  routineEmptyTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 18,
      color: COLORS.textPrimary,
      marginTop: 15,
  },
  routineEmptySub: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 14,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginTop: 5,
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
  filterPill: {
      backgroundColor: COLORS.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 15,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 6,
  },
  filterPillActive: {
      backgroundColor: COLORS.accentGreen,
  },
  filterText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 11,
      color: COLORS.textSecondary,
  },
  filterTextActive: {
      color: COLORS.textOnAccent,
      fontFamily: 'Tajawal-Bold',
  },
  ingredientsStats: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 15,
      marginBottom: 15,
  },
  statItem: {
      alignItems: 'center',
      flex: 1,
  },
  ingRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      padding: 15,
      borderRadius: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: COLORS.border,
  },
  ingName: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 14,
      color: COLORS.textPrimary,
      marginBottom: 4,
  },
  ingType: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 10,
      color: COLORS.textSecondary,
      marginLeft: 6
  },
  ingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
  },
  ingProducts: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 10,
      color: COLORS.textSecondary,
      marginTop: 4,
  },
  countBadge: {
      backgroundColor: COLORS.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      minWidth: 32,
      alignItems: 'center',
  },
  countText: {
      fontSize: 10,
      fontFamily: 'Tajawal-Bold',
      color: COLORS.accentGreen
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
  centeredModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  
  // --- Sheet Handle ---
  sheetHandleBar: {
      alignItems: 'center',
      paddingVertical: 15,
      cursor: 'grab',
  },
  sheetHandle: {
      width: 40,
      height: 5,
      backgroundColor: COLORS.border,
      borderRadius: 2.5,
  },

  // --- Modal/Sheet Header (Unified) ---
  modalHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 15,
      paddingHorizontal: 20,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
  },
  modalIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalTitle: {
      flex: 1,
      fontFamily: 'Tajawal-Bold',
      fontSize: 18,
      color: COLORS.textPrimary,
      textAlign: 'right',
  },
  
  // --- Modal/Sheet Body Content ---
  modalDescription: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 14,
      color: COLORS.textSecondary,
      textAlign: 'right',
      lineHeight: 22,
      paddingHorizontal: 20,
      marginVertical: 15,
  },
  relatedProductsTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 13,
      color: COLORS.textPrimary,
      textAlign: 'right',
      marginBottom: 8,
      paddingHorizontal: 20,
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
      paddingHorizontal: 20,
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
});