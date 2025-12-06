import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, Pressable,
  Dimensions, ScrollView, Animated, ImageBackground, Modal, FlatList,
  Platform, UIManager, Alert, StatusBar, ActivityIndicator, LayoutAnimation,
  RefreshControl, Keyboard, Easing, I18nManager
} from 'react-native';
import { TouchableWithoutFeedback } from 'react-native'; 
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

const ShelfSection = ({ products, loading, onDelete, onRefresh }) => {
    const [refreshing, setRefreshing] = useState(false);
    const spinAnim = useRef(new Animated.Value(0)).current;
    const statsAnim = useRef(new Animated.Value(0)).current;
  
    useEffect(() => {
      if (!loading) {
        Animated.spring(statsAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          delay: 200,
          useNativeDriver: true
        }).start();
      }
    }, [loading]);
  
    const handleRefresh = async () => {
      setRefreshing(true);
      spinAnim.setValue(0);
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      
      await onRefresh?.();
      setRefreshing(false);
      spinAnim.stopAnimation();
    };
  
    const spin = spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg']
    });
  
    const statsScale = statsAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1]
    });
  
    if(loading && products.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </Animated.View>
        </View>
      );
    }
  
    const empty = products.length === 0;
  
    const renderItem = ({ item, index }) => {
      const type = PRODUCT_TYPES[item.analysisData?.product_type] || PRODUCT_TYPES.other;
      return (
        <StaggeredItem index={index}>
          <PressableScale 
            style={styles.productCard} 
            onLongPress={() => onDelete(item.id)}
            delay={index * 100}
          >
            <View style={[styles.productIconBox, { 
              backgroundColor: `${type.color}20`,
            }]}>
              <FontAwesome5 name={type.icon} size={18} color={type.color} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.productName}>{item.productName}</Text>
              <Text style={[styles.productType, {color: type.color}]}>{type.label}</Text>
            </View>
            <FontAwesome5 name="chevron-left" size={12} color={COLORS.textDim} />
          </PressableScale>
        </StaggeredItem>
      );
    };
  
    return (
      <View style={{ flex: 1 }}>
        {/* Gamified Stats with animated entrance */}
        <Animated.View 
          style={[
            styles.statsContainer,
            { transform: [{ scale: statsScale }] }
          ]}
        >
          <ContentCard style={styles.statBox} delay={100}>
            <Text style={styles.statLabel}>إجمالي المنتجات</Text>
            <AnimatedCount value={products.length} style={styles.statValue} />
          </ContentCard>
          
          <View style={styles.statDivider} />
          
          <ContentCard style={styles.statBox} delay={200}>
            <Text style={styles.statLabel}>حماية الشمس</Text>
            <AnimatedCount 
              value={products.filter(p => p.analysisData?.product_type === 'sunscreen').length} 
              style={styles.statValue} 
            />
          </ContentCard>
          
          <View style={styles.statDivider} />
          
          <ContentCard style={styles.statBox} delay={300}>
            <Text style={styles.statLabel}>مكونات نشطة</Text>
            <AnimatedCount 
              value={products.filter(p => p.analysisData?.detected_ingredients?.length > 5).length} 
              style={styles.statValue} 
            />
          </ContentCard>
        </Animated.View>
  
        {/* List using FlatList instead of ScrollView */}
        {empty ? (
          <ContentCard style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="bag-personal-outline" 
              size={60} 
              color={COLORS.textDim} 
              style={{opacity:0.5, marginBottom:15}} 
            />
            <Text style={styles.emptyText}>رفك فارغ تماماً</Text>
            <Text style={styles.emptySub}>امسحي الباركود أو صوري المكونات لبدء التحليل</Text>
          </ContentCard>
        ) : (
          <FlatList
            data={products}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          />
        )}
      </View>
    );
  };

const AnalysisSection = ({ products }) => {
    const [weather, setWeather] = useState(null);
    const [weatherLoading, setWeatherLoading] = useState(true);
    const weatherAnim = useRef(new Animated.Value(0)).current;
    const cloudAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(weatherAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
                delay: 300
            }),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(cloudAnim, {
                        toValue: 1,
                        duration: 3000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    }),
                    Animated.timing(cloudAnim, {
                        toValue: 0,
                        duration: 3000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true
                    })
                ])
            ).start()
        ]).start();

        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') { setWeatherLoading(false); return; }
                const loc = await Location.getCurrentPositionAsync({});
                const apiKey = "99208a700b6e4ee8b26212752251002"; 
                const res = await fetch(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${loc.coords.latitude},${loc.coords.longitude}&lang=ar`);
                const data = await res.json();
                setWeather({
                    temp: data.current.temp_c,
                    text: data.current.condition.text,
                    uv: data.current.uv,
                    humidity: data.current.humidity,
                });
            } catch (e) { 
                console.log("Weather fetch error:", e);
            } finally { 
                setWeatherLoading(false); 
            }
        })();
    }, []);

    const score = useMemo(() => {
        if (products.length === 0) return 0;
        const hasSPF = products.some(p => p.analysisData?.product_type === 'sunscreen');
        const hasCleanser = products.some(p => p.analysisData?.product_type === 'cleanser');
        const hasMoisturizer = products.some(p => p.analysisData?.product_type === 'lotion_cream');
        let base = 50;
        if (hasSPF) base += 20;
        if (hasCleanser) base += 15;
        if (hasMoisturizer) base += 15;
        return Math.min(100, base);
    }, [products]);

    // Dynamic Insights
    const insights = [];
    if (products.length > 0) {
        if (!products.some(p => p.analysisData?.product_type === 'sunscreen')) {
            insights.push({type:'danger', msg:'خطر: لا يوجد واقي شمس!'});
        }
        if (score > 80) {
            insights.push({type:'success', msg:'توازن ممتاز في المنتجات.'});
        }
        if (products.filter(p => p.analysisData?.product_type === 'treatment').length > 2) {
            insights.push({type:'warning', msg:'كثرة استخدام المنتجات العلاجية قد تسبب تهيج.'});
        }
    }

    const cloudTranslate = cloudAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-5, 5]
    });

    const weatherScale = weatherAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.9, 1]
    });

    return (
        <View>
            {/* Animated Weather Widget */}
            <Animated.View style={[
                styles.weatherWidget,
                { 
                    transform: [
                        { scale: weatherScale },
                        { translateX: cloudTranslate }
                    ] 
                }
            ]}>
                {weatherLoading ? (
                    <ActivityIndicator color={COLORS.primary} />
                ) : weather ? (
                    <View style={{flexDirection:'row-reverse', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                        <View>
                            <View style={{flexDirection:'row-reverse', alignItems:'center', gap:8}}>
                                <Text style={styles.weatherTemp}>{weather.temp}°</Text>
                                <View style={{
                                    backgroundColor: weather.uv>5 ? COLORS.danger : weather.uv>3 ? COLORS.warning : COLORS.success, 
                                    paddingHorizontal:8, 
                                    paddingVertical:4, 
                                    borderRadius:6
                                }}>
                                    <Text style={{fontSize:10, fontFamily:'Tajawal-Bold', color:'#000'}}>
                                        UV {weather.uv}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.weatherText}>
                                {weather.text} • رطوبة {weather.humidity}%
                            </Text>
                        </View>
                        <Animated.View style={{ transform: [{ translateX: cloudTranslate }] }}>
                            <FontAwesome5 name="cloud-sun" size={36} color={COLORS.warning} />
                        </Animated.View>
                    </View>
                ) : (
                    <View style={{flexDirection:'row-reverse', alignItems:'center', gap:10}}>
                        <FontAwesome5 name="location-slash" size={20} color={COLORS.textDim} />
                        <Text style={styles.weatherText}>تفعيل الموقع لمعرفة تأثير الطقس</Text>
                    </View>
                )}
            </Animated.View>

            {/* Score Card */}
            <ContentCard style={styles.glassPanel}>
                <View style={styles.scoreRow}>
                    <View style={{flex:1, gap: 8}}>
                        <Text style={styles.panelTitle}>صحة الروتين</Text>
                        <Text style={styles.panelDesc}>
                            {score > 80 ? 'روتينك مثالي! توازن رائع.' : 
                             score > 50 ? 'جيد، لكن ينقصه بعض الأساسيات.' : 
                             'يحتاج إلى إعادة هيكلة.'}
                        </Text>
                    </View>
                    <ChartRing 
                        percentage={score} 
                        radius={50} 
                        color={score>80 ? COLORS.success : score>60 ? COLORS.warning : COLORS.danger} 
                    />
                </View>
            </ContentCard>

            {/* Insights */}
            <View style={{marginTop: 20}}>
                <Text style={styles.sectionTitleSmall}>التنبيهات النشطة</Text>
                {insights.map((i, idx) => (
                    <StaggeredItem key={idx} index={idx}>
                        <View style={[
                            styles.alertCard, 
                            {borderRightColor: COLORS[i.type]},
                            {backgroundColor: `${COLORS[i.type]}15`}
                        ]}>
                            <FontAwesome5 
                                name={i.type === 'danger' ? 'exclamation-triangle' : 
                                      i.type === 'warning' ? 'exclamation-circle' : 'check-circle'} 
                                size={14} 
                                color={COLORS[i.type]} 
                            />
                            <Text style={styles.alertText}>{i.msg}</Text>
                        </View>
                    </StaggeredItem>
                ))}
            </View>
            <View style={{height: 120}} />
        </View>
    );
};

const RoutineSection = ({ savedProducts, userProfile }) => {
    const [routines, setRoutines] = useState(userProfile?.routines || { 
        am: Array(5).fill(null), 
        pm: Array(5).fill(null), 
        weekly: [] 
    });
    const [modal, setModal] = useState({ visible: false, period: null, step: null });
    const { user } = useAppContext();
    const [activePeriod, setActivePeriod] = useState('am');
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const contentAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(contentAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            delay: 200,
            useNativeDriver: true
        }).start();
    }, []);

    const switchPeriod = (period) => {
        if (period === activePeriod) return;
        
        Animated.sequence([
            Animated.timing(fadeAnim, { 
                toValue: 0, 
                duration: 150, 
                useNativeDriver: true 
            }),
            Animated.timing(fadeAnim, { 
                toValue: 1, 
                duration: 200, 
                useNativeDriver: true 
            })
        ]).start();
        
        setTimeout(() => setActivePeriod(period), 100);
    };

    const addToRoutine = async (id) => {
        const newR = {...routines};
        newR[modal.period][modal.step] = { id };
        setRoutines(newR);
        setModal({ visible: false });
        try {
            await updateDoc(doc(db, 'profiles', user.uid), { routines: newR });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error("Error updating routine:", error);
        }
    };

    const removeFromRoutine = async (period, index) => {
        const newR = {...routines};
        newR[period][index] = null;
        setRoutines(newR);
        try {
            await updateDoc(doc(db, 'profiles', user.uid), { routines: newR });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch (error) {
            console.error("Error removing from routine:", error);
        }
    };

    const RoutineItem = ({ step, index }) => {
        const prod = savedProducts.find(p => p.id === routines[activePeriod][index]?.id);
        return (
            <StaggeredItem index={index}>
                <ContentCard>
                    <View style={styles.routineStepCard}>
                        <View style={styles.routineNumber}>
                            <Text style={styles.routineNumText}>{index+1}</Text>
                        </View>
                        <View style={{flex:1}}>
                            <Text style={styles.routineLabel}>{step}</Text>
                            {prod ? (
                                <View style={styles.selectedProd}>
                                    <Text style={styles.selectedProdText} numberOfLines={1}>
                                        {prod.productName}
                                    </Text>
                                    <TouchableOpacity 
                                        onPress={() => removeFromRoutine(activePeriod, index)}
                                        style={{padding: 4}}
                                    >
                                        <FontAwesome5 name="times" size={12} color={COLORS.danger} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <PressableScale 
                                    onPress={() => setModal({visible:true, period: activePeriod, step: index})}
                                    style={styles.addProdBtn}
                                >
                                    <Text style={styles.addProdText}>+ إضافة منتج</Text>
                                </PressableScale>
                            )}
                        </View>
                    </View>
                </ContentCard>
            </StaggeredItem>
        );
    };

    const routineSteps = activePeriod === 'am' 
        ? ['غسول', 'تونر', 'سيروم', 'مرطب', 'واقي']
        : ['مزيل مكياج', 'غسول مائي', 'مقشر / علاج', 'سيروم', 'كريم ليلي'];

    const renderRoutineItem = ({ item, index }) => (
        <RoutineItem step={item} index={index} />
    );

    return (
        <View style={{ flex: 1 }}>
            {/* Period Switcher */}
            <View style={styles.routineSwitchContainer}>
                <PressableScale 
                    onPress={() => switchPeriod('pm')} 
                    style={[styles.periodBtn, activePeriod==='pm' && styles.periodBtnActive]}
                >
                    <Feather name="moon" size={16} color={activePeriod==='pm'?'#fff':COLORS.textDim} />
                    <Text style={[styles.periodText, activePeriod==='pm' && {color:'#fff'}]}>مساء</Text>
                </PressableScale>
                
                <PressableScale 
                    onPress={() => switchPeriod('am')} 
                    style={[styles.periodBtn, activePeriod==='am' && styles.periodBtnActive]}
                >
                    <Feather name="sun" size={16} color={activePeriod==='am'?'#fff':COLORS.textDim} />
                    <Text style={[styles.periodText, activePeriod==='am' && {color:'#fff'}]}>صباح</Text>
                </PressableScale>
            </View>

            {/* Routine Steps using FlatList */}
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <Animated.View style={{ flex: 1, opacity: contentAnim }}>
                    <FlatList
                        data={routineSteps}
                        renderItem={renderRoutineItem}
                        keyExtractor={(item, index) => `routine-${activePeriod}-${index}`}
                        contentContainerStyle={{ paddingBottom: 150 }}
                        showsVerticalScrollIndicator={false}
                    />
                </Animated.View>
            </Animated.View>

            {/* Add Product Modal */}
            <Modal 
                transparent 
                visible={modal.visible} 
                animationType="fade" 
                onRequestClose={() => setModal({visible:false})}
            >
                <View style={styles.modalOverlay}>
                    <BlurView  intensity={50} tint="dark" style={styles.modalGlass} >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>اختر منتج</Text>
                            <TouchableOpacity 
                                onPress={() => setModal({visible:false})}
                                style={{padding: 4}}
                            >
                                <FontAwesome5 name="times" color={COLORS.textDim} size={18}/>
                            </TouchableOpacity>
                        </View>
                        
                        {savedProducts.length === 0 ? (
                            <View style={styles.modalEmpty}>
                                <FontAwesome5 name="shopping-bag" size={40} color={COLORS.textDim} />
                                <Text style={styles.modalEmptyText}>الرف فارغ!</Text>
                                <Text style={styles.modalEmptySubText}>أضف منتجات أولاً</Text>
                            </View>
                        ) : (
                            <FlatList 
                                data={savedProducts}
                                keyExtractor={item => item.id}
                                contentContainerStyle={{padding: 20}}
                                renderItem={({item}) => (
                                    <PressableScale 
                                        onPress={() => addToRoutine(item.id)}
                                        style={styles.modalItem}
                                    >
                                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                                            <FontAwesome5 
                                                name={PRODUCT_TYPES[item.analysisData?.product_type]?.icon || 'shopping-bag'} 
                                                size={16} 
                                                color={COLORS.primary} 
                                            />
                                            <Text style={styles.modalItemName}>{item.productName}</Text>
                                        </View>
                                        <FontAwesome5 name="plus-circle" color={COLORS.primary} size={20} />
                                    </PressableScale>
                                )}
                            />
                        )}
                    </BlurView>
                </View>
            </Modal>
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
  const [openAccordion, setOpenAccordion] = useState('traits'); // State to track which accordion is open, default to 'traits'

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
                    {activeTab === 'shelf' && (
                        <ShelfSection 
                            products={savedProducts} 
                            loading={loading} 
                            onDelete={handleDelete} 
                            onRefresh={handleRefresh}
                        />
                    )}
                    {activeTab === 'routine' && (
                        <RoutineSection 
                            savedProducts={savedProducts} 
                            userProfile={userProfile} 
                        />
                    )}
                    {activeTab === 'analysis' && (
                        <AnalysisSection products={savedProducts} />
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

            {/* --- FLOATING GLASS DOCK (Bottom Navigation) --- */}
            <NatureDock 
    tabs={TABS} 
    activeTab={activeTab} 
    onTabChange={switchTab} // Use the switchTab function
/>

            {/* --- FLOATING ACTION BUTTON (Only on Shelf) --- */}
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

// --- 7. ENHANCED STYLES & UI KIT ---
// --- 7. ENHANCED STYLES & UI KIT (FULL & FINAL) ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background 
  },
  
  // PARALLAX HEADER
  header: {
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 1,
    backgroundColor: COLORS.background, // Solid background
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
    height: HEADER_MIN_HEIGHT - (Platform.OS === 'ios' ? 45 : 20), // Adjust height for content
    justifyContent: 'center',
    alignItems: 'center',
  },

  // UPDATE 'welcomeText' and 'subWelcome'
  welcomeText: { 
    fontFamily: 'Tajawal-ExtraBold', 
    fontSize: 26, // Slightly smaller for the new layout
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
  
  // ADD this new style for the collapsed title
  collapsedTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  
  // UPDATE the 'avatar' style
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

  // Loading & Card Base
  loadingContainer: { 
    height: 200, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cardBase: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 15,
  },

  // SHELF STYLES
  statsContainer: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    marginBottom: 25,
    marginTop: 10,
    gap: 10,
  },
  statBox: { 
    alignItems: 'center', 
    flex: 1, 
    padding: 15,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  productCard: {
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    backgroundColor: COLORS.card,
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: COLORS.border,
  },
  productIconBox: {
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginLeft: 12,
  },
  productName: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 15, 
    color: COLORS.textPrimary, 
    textAlign: 'right',
    marginBottom: 2,
  },
  productType: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 12, 
    textAlign: 'right' 
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

  // ROUTINE STYLES
  routineSwitchContainer: { 
    flexDirection: 'row-reverse', 
    backgroundColor: COLORS.card, 
    borderRadius: 30, 
    padding: 4, 
    marginBottom: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodBtn: { 
    flex: 1, 
    flexDirection: 'row-reverse', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8, 
    paddingVertical: 12, 
    borderRadius: 25,
  },
  periodBtnActive: { 
    backgroundColor: COLORS.accentGreen,
  },
  periodText: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  routineStepCard: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    padding: 16,
    borderRadius: 16,
  },
  routineNumber: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: COLORS.accentGreen, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginLeft: 12,
  },
  routineNumText: { 
    fontFamily: 'Tajawal-Bold', 
    color: COLORS.textOnAccent,
    fontSize: 13,
  },
  routineLabel: { 
    fontFamily: 'Tajawal-Bold', 
    color: COLORS.textPrimary, 
    fontSize: 15, 
    textAlign: 'right', 
    flex: 1,
    marginBottom: 8,
  },
  addProdBtn: { 
    backgroundColor: COLORS.background, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  addProdText: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 12, 
    color: COLORS.textSecondary,
  },
  selectedProd: { 
    backgroundColor: `rgba(90, 156, 132, 0.1)`, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedProdText: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 12, 
    color: COLORS.accentGreen, 
    flex: 1,
    marginRight: 8,
  },

  // ANALYSIS STYLES
  weatherWidget: {
      backgroundColor: `rgba(59, 130, 246, 0.1)`, 
      borderRadius: 20, 
      padding: 20, 
      marginBottom: 20,
      borderWidth: 1, 
      borderColor: `rgba(59, 130, 246, 0.2)`,
  },
  weatherTemp: { 
    fontFamily: 'Tajawal-ExtraBold', 
    fontSize: 36, 
    color: COLORS.textPrimary,
  },
  weatherText: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 13, 
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  panelTitle: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 20, 
    color: COLORS.textPrimary, 
    textAlign: 'right', 
    marginBottom: 8 
  },
  panelDesc: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 13, 
    color: COLORS.textSecondary, 
    textAlign: 'right',
    lineHeight: 20,
  },
  scoreRow: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  sectionTitleSmall: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 12,
    marginTop: 5,
  },
  alertCard: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    backgroundColor: COLORS.card, 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 8, 
    borderRightWidth: 3, 
    gap: 10 
  },
  alertText: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 12, 
    color: COLORS.textPrimary, 
    flex: 1, 
    textAlign: 'right' 
  },

  // INGREDIENTS STYLES
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

  // MIGRATION & SETTINGS
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
  divider: { 
    height: 1, 
    backgroundColor: COLORS.border, 
    marginVertical: 12 
  },
  settingTitle: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 20, 
    color: COLORS.textPrimary, 
    textAlign: 'right', 
    marginBottom: 10 
  },
  contentContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
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
  
  // ACCORDION STYLES
  accordionWrapper: { 
    borderRadius: 16, 
    marginBottom: 10, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  accordionHeader: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 18,
    backgroundColor: 'transparent', // Header has no background itself
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
  iconBoxSm: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: 'rgba(90, 156, 132, 0.15)', 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  // MODAL STYLES
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    overflow: 'hidden', 
    maxHeight: height * 0.6, 
    backgroundColor: COLORS.card, 
    borderTopWidth: 1, 
    borderTopColor: COLORS.border,
  },
  modalHeader: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
  },
  modalTitle: { 
    fontFamily: 'Tajawal-Bold', 
    color: COLORS.textPrimary, 
    fontSize: 18 
  },
  modalItem: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
    borderRadius: 12,
    marginBottom: 5,
    backgroundColor: COLORS.background,
  },
  modalItemName: { 
    fontFamily: 'Tajawal-Regular', 
    color: COLORS.textPrimary, 
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  modalEmpty: {
    alignItems: 'center',
    padding: 40,
  },
  modalEmptyText: {
    fontFamily: 'Tajawal-Bold',
    color: COLORS.textPrimary,
    fontSize: 16,
    marginTop: 15,
  },
  modalEmptySubText: {
    fontFamily: 'Tajawal-Regular',
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 5,
  },

  // FAB (Floating Action Button) STYLES
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
  fabGradient: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // --- FLOATING PILL DOCK STYLES ---
  // --- FLOATING PILL DOCK STYLES (CORRECTED) ---
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
    // The container is now a simple box, allowing absolute positioning inside
  },
  pillIndicator: {
    position: 'absolute',
    top: 5,
    left: 0, // The translateX will now correctly position it from the left edge
    height: 52,
    borderRadius: 24,
    backgroundColor: COLORS.accentGreen,
    zIndex: 1, // Sits behind the icons
    
  },
  tabsContainer: {
    // This container for the icons now fills the entire dock
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 2, // Sits on top of the pill
  },
  dockItem: {
    flex: 1, // Each item takes equal horizontal space
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', // Necessary for the label's absolute positioning
  },
  dockLabel: {
    position: 'absolute',
    bottom: 7, // Positioned slightly below the icon area
    fontFamily: 'Tajawal-Bold',
    fontSize: 10,
    color: COLORS.textOnAccent,
  },
});