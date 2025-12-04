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

// --- 1. SYSTEM CONFIG ---
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Force LTR logic for code, visuals are RTL
I18nManager.allowRTL(false);

const { width, height } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 220;
const HEADER_MIN_HEIGHT = 100;
const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// --- 2. THEME & ASSETS ---
const BG_IMAGE = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1527&auto=format&fit=crop";

const COLORS = {
  primary: '#B2D8B4',
  primaryGlow: 'rgba(178, 216, 180, 0.6)',
  primaryDark: '#8BC995',
  darkGreen: '#1a3b25',
  text: '#FFFFFF',
  textDim: 'rgba(255, 255, 255, 0.65)',
  glassTint: 'rgba(8, 10, 9, 0.85)', 
  glassBorder: 'rgba(178, 216, 180, 0.15)',
  cardBg: 'rgba(255, 255, 255, 0.04)',
  cardBgActive: 'rgba(178, 216, 180, 0.1)', 
  inputBg: 'rgba(0, 0, 0, 0.4)',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  success: '#10b981',
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
    { id: 'oily', label: 'دهنية', icon: 'tint' },
    { id: 'dry', label: 'جافة', icon: 'leaf' },
    { id: 'combo', label: 'مختلطة', icon: 'adjust' },
    { id: 'normal', label: 'عادية', icon: 'smile' },
    { id: 'sensitive', label: 'حساسة', icon: 'heartbeat' }
];

const GOALS_LIST = [
    { id: 'brightening', label: 'تفتيح', icon: 'sun' },
    { id: 'acne', label: 'حب الشباب', icon: 'shield-alt' },
    { id: 'anti_aging', label: 'شيخوخة', icon: 'hourglass-half' },
    { id: 'hydration', label: 'ترطيب', icon: 'tint' },
    { id: 'hair_growth', label: 'كثافة', icon: 'seedling' }
];

const INGREDIENT_FILTERS = [
  { id: 'all', label: 'الكل', icon: 'layer-group' },
  { id: 'exfoliants', label: 'مقشرات', icon: 'magic' },
  { id: 'hydrators', label: 'مرطبات', icon: 'tint' },
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
    <BlurView intensity={20} tint="dark" style={{ position: 'absolute', zIndex: 0 }} renderToHardwareTextureAndroid>
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

// 3. GLASSMORPHIC CARD with shimmer
const GlassCard = ({ children, style, onPress, disabled = false, delay = 0 }) => {
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { 
        toValue: 1, 
        friction: 7, 
        tension: 40, 
        delay, 
        useNativeDriver: true 
      }),
      Animated.timing(opacity, { 
        toValue: 1, 
        duration: 400, 
        delay, 
        useNativeDriver: true 
      })
    ]).start();
  }, []);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { 
      toValue: 0.98, 
      useNativeDriver: true, 
      speed: 20, 
      bounciness: 0 
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, { 
      toValue: 1, 
      useNativeDriver: true, 
      speed: 20, 
      bounciness: 10 
    }).start();
  };

  const content = (
    <BlurView intensity={30} tint="dark" style={[styles.glassCard, style]} renderToHardwareTextureAndroid>
      <Animated.View style={{ opacity }}>
        {children}
      </Animated.View>
    </BlurView>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          {content}
        </Animated.View>
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

const NatureDock = ({ tabs, activeTab, onTabChange }) => {
    return (
      <View style={dockStyles.outerContainer}>
        <BlurView intensity={30} tint="dark" style={dockStyles.glassContainer} renderToHardwareTextureAndroid>
          <View style={dockStyles.row}>
            {tabs.map((tab) => (
              <DockItem 
                key={tab.id} 
                item={tab} 
                isActive={activeTab === tab.id} 
                onPress={() => onTabChange(tab.id)} 
              />
            ))}
          </View>
        </BlurView>
      </View>
    );
  };
  
  const DockItem = ({ item, isActive, onPress }) => {
    // Animation Values
    const animVal = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  
    useEffect(() => {
      Animated.spring(animVal, {
        toValue: isActive ? 1 : 0,
        friction: 9,      // Low friction = bouncy water effect
        tension: 60,      // Spring tension
        useNativeDriver: false, // False needed for width/color layout changes
      }).start();
    }, [isActive]);
  
    const handlePress = () => {
      if (!isActive) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }
    };
  
    // 1. Width Expansion (The Liquid effect)
    // We interpolate 'flexGrow' to make it expand pushing others smoothly
    const containerFlex = animVal.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.5] // Active item takes 2.5x space of inactive ones
    });
  
    // 2. Background Color Transition (Transparent -> Green)
    const backgroundColor = animVal.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255, 255, 255, 0)', 'rgba(178, 216, 180, 1)'] // Transparent -> Brand Green
    });
  
    // 3. Icon Color Transition (Gray -> Dark Green)
    const iconColorInterpolation = animVal.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255, 255, 255, 0.5)', 'rgba(26, 59, 37, 1)']
    });
  
    // 4. Text Reveal (Slide + Fade)
    const textTranslateX = animVal.interpolate({
      inputRange: [0, 1],
      outputRange: [-20, 0] // Slides from left (behind icon) to right position
    });
    const textOpacity = animVal.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1] // Text appears only when fully expanded
    });
  
    return (
      <TouchableWithoutFeedback onPress={handlePress}>
        <Animated.View style={[
          dockStyles.itemContainer, 
          { flex: containerFlex, backgroundColor }
        ]}>
          
          {/* Centered Content Wrapper */}
          <View style={dockStyles.contentContainer}>
            
            {/* Animated Icon */}
            {/* We need a special Animated wrapper for SVG color interpolation if not using native setNativeProps, 
                but simplified here by rendering component conditional styling for icon color usually requires ref. 
                For React Native Web/Expo compatibility, we use a simpler color swap or prop passing. */}
            <View style={dockStyles.iconWrapper}>
                <FontAwesome5 
                  name={item.icon} 
                  size={16} 
                  // Visual trick: We can't easily interpolate FontAwesome color prop directly in one go 
                  // without creating an Animated Component, so we swap color based on logic for simplicity,
                  // or wrap it. Here we stick to prop logic for stability:
                  color={isActive ? COLORS.darkGreen : "rgba(255,255,255,0.5)"} 
                />
            </View>
  
            {/* Animated Text (Revealed next to icon) */}
            {/* Position Absolute prevents layout jumping during expansion */}
            <Animated.View style={[
              dockStyles.textWrapper, 
              { opacity: textOpacity, transform: [{ translateX: textTranslateX }] }
            ]}>
               <Text numberOfLines={1} style={dockStyles.label}>
                 {item.label}
               </Text>
            </Animated.View>
            
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };
  

// --- DOCK STYLES ---
const dockStyles = StyleSheet.create({
    outerContainer: {
      position: 'absolute',
      bottom: 30,
      left: 20,
      right: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
      borderRadius: 35,
    },
    glassContainer: {
      borderRadius: 35,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)', // Very subtle frosted border
      backgroundColor: 'rgba(5, 10, 5, 0.5)', // Low opacity for "Less Blur" requirement
      height: 65,
    },
    row: {
      flexDirection: 'row-reverse', // RTL Layout
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '100%',
      padding: 6, // Padding inside the pill
    },
    itemContainer: {
      height: '100%',
      borderRadius: 30, // Fully rounded pills
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 4,
      overflow: 'hidden', // Clip text when collapsed
    },
    contentContainer: {
      flexDirection: 'row-reverse', // Icon on right, Text on left
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    iconWrapper: {
      zIndex: 2, // Keep icon above text
      paddingHorizontal: 5,
    },
    textWrapper: {
      // The text container
      marginLeft: 6,
      zIndex: 1,
    },
    label: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 13,
      color: COLORS.darkGreen,
      whiteSpace: 'nowrap', // Web compatibility
    }
  });

// 7. ENHANCED ACCORDION with smooth height animation
const Accordion = ({ title, icon, children, isOpen, onPress }) => {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const contentRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue: isOpen ? 1 : 0,
        friction: 8,
        tension: 40,
        useNativeDriver: false
      }),
      Animated.spring(rotateAnim, {
        toValue: isOpen ? 1 : 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();
  }, [isOpen]);

  const onLayout = (event) => {
    if (contentHeight === 0) {
      setContentHeight(event.nativeEvent.layout.height);
    }
  };

  const animatedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight || 200]
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  return (
    <GlassCard style={styles.accordionWrapper}>
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }} 
        style={[styles.accordionHeader, isOpen && styles.accordionHeaderOpen]}
      >
        <View style={{flexDirection:'row', alignItems:'center', gap:12}}>
          <Animated.View style={[styles.iconBoxSm, {
            transform: [{ rotate }]
          }]}>
            <FontAwesome5 name={icon} size={16} color={COLORS.primary} />
          </Animated.View>
          <Text style={styles.accordionTitle}>{title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <FontAwesome5 name="chevron-down" size={14} color={COLORS.textDim} />
        </Animated.View>
      </TouchableOpacity>
      
      <Animated.View style={[styles.accordionBody, { height: animatedHeight, overflow: 'hidden' }]}>
        <View ref={contentRef} onLayout={onLayout}>
          {children}
        </View>
      </Animated.View>
    </GlassCard>
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
          <GlassCard style={styles.statBox} delay={100}>
            <Text style={styles.statLabel}>إجمالي المنتجات</Text>
            <AnimatedCount value={products.length} style={styles.statValue} />
          </GlassCard>
          
          <View style={styles.statDivider} />
          
          <GlassCard style={styles.statBox} delay={200}>
            <Text style={styles.statLabel}>حماية الشمس</Text>
            <AnimatedCount 
              value={products.filter(p => p.analysisData?.product_type === 'sunscreen').length} 
              style={styles.statValue} 
            />
          </GlassCard>
          
          <View style={styles.statDivider} />
          
          <GlassCard style={styles.statBox} delay={300}>
            <Text style={styles.statLabel}>مكونات نشطة</Text>
            <AnimatedCount 
              value={products.filter(p => p.analysisData?.detected_ingredients?.length > 5).length} 
              style={styles.statValue} 
            />
          </GlassCard>
        </Animated.View>
  
        {/* List using FlatList instead of ScrollView */}
        {empty ? (
          <GlassCard style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="bag-personal-outline" 
              size={60} 
              color={COLORS.textDim} 
              style={{opacity:0.5, marginBottom:15}} 
            />
            <Text style={styles.emptyText}>رفك فارغ تماماً</Text>
            <Text style={styles.emptySub}>امسحي الباركود أو صوري المكونات لبدء التحليل</Text>
          </GlassCard>
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
            <GlassCard style={styles.glassPanel}>
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
            </GlassCard>

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
                <GlassCard>
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
                </GlassCard>
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
                    <BlurView intensity={50} tint="dark" style={styles.modalGlass} renderToHardwareTextureAndroid>
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
                <GlassCard style={styles.migCard}>
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
                </GlassCard>
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

const SettingsSection = ({ profile, onLogout }) => {
    const [open, setOpen] = useState(null);
    const [form, setForm] = useState(profile?.settings || {});
    const [timePicker, setTimePicker] = useState(null);
    const settingsAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        Animated.spring(settingsAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            delay: 200,
            useNativeDriver: true
        }).start();
    }, []);

    const toggle = (id) => { 
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); 
        setOpen(open === id ? null : id); 
        Haptics.selectionAsync();
    };
    
    const update = async (k, v) => { 
        setForm({...form, [k]: v}); 
        try { 
            await updateDoc(doc(db, 'profiles', profile.id), { [`settings.${k}`]: v }); 
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch(e){
            console.error("Error updating settings:", e);
        }
    };

    const OptionChip = ({ label, value, current, icon }) => (
        <PressableScale 
            onPress={() => update('skinType', value)} 
            style={[styles.chip, current===value && styles.chipActive]}
        >
            <FontAwesome5 name={icon} size={14} color={current===value ? COLORS.darkGreen : COLORS.textDim} />
            <Text style={[styles.chipText, current===value && {color:COLORS.darkGreen}]}>{label}</Text>
        </PressableScale>
    );

    const settingsScale = settingsAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.95, 1]
    });

    const renderContent = () => (
        <Animated.View style={{ opacity: settingsAnim, transform: [{ scale: settingsScale }] }}>
            {/* Basic Traits */}
            <GlassCard style={styles.glassCard}>
                <Text style={styles.settingTitle}>السمات الشخصية</Text>
                <View style={styles.chipsRow}>
                    {BASIC_SKIN_TYPES.map(t => (
                        <OptionChip 
                            key={t.id} 
                            label={t.label} 
                            value={t.id} 
                            current={form.skinType} 
                            icon={t.icon}
                        />
                    ))}
                </View>
            </GlassCard>

            {/* Goals */}
            <GlassCard style={[styles.glassCard, {marginTop: 15}]}>
                <Text style={styles.settingTitle}>أهدافي</Text>
                <View style={styles.chipsRow}>
                    {GOALS_LIST.map(goal => (
                        <PressableScale
                            key={goal.id}
                            onPress={() => {
                                const currentGoals = Array.isArray(form.goals) ? form.goals : [];
                                const newGoals = currentGoals.includes(goal.id)
                                    ? currentGoals.filter(g => g !== goal.id)
                                    : [...currentGoals, goal.id];
                                update('goals', newGoals);
                            }}
                            style={[
                                styles.chip,
                                Array.isArray(form.goals) && form.goals.includes(goal.id) && styles.chipActive
                            ]}
                        >
                            <FontAwesome5 
                                name={goal.icon} 
                                size={14} 
                                color={Array.isArray(form.goals) && form.goals.includes(goal.id) 
                                    ? COLORS.darkGreen 
                                    : COLORS.textDim} 
                            />
                            <Text style={[
                                styles.chipText,
                                Array.isArray(form.goals) && form.goals.includes(goal.id) && {color:COLORS.darkGreen}
                            ]}>
                                {goal.label}
                            </Text>
                        </PressableScale>
                    ))}
                </View>
            </GlassCard>

            {/* Notifications */}
            <Accordion 
                title="تنبيهات الروتين" 
                icon="bell" 
                isOpen={open==='time'} 
                onPress={()=>toggle('time')}
            >
                <View style={styles.timeRow}>
                    <Text style={styles.label}>صباحاً</Text>
                    <TouchableOpacity 
                        style={styles.timeBtn} 
                        onPress={()=>setTimePicker('am')}
                    >
                        <Text style={styles.timeText}>{form.reminderAM || '08:00'}</Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.timeRow, {marginTop:12}]}>
                    <Text style={styles.label}>مساءً</Text>
                    <TouchableOpacity 
                        style={styles.timeBtn} 
                        onPress={()=>setTimePicker('pm')}
                    >
                        <Text style={styles.timeText}>{form.reminderPM || '21:00'}</Text>
                    </TouchableOpacity>
                </View>
            </Accordion>

            {/* Account Actions */}
            <Accordion 
                title="إجراءات الحساب" 
                icon="user-cog" 
                isOpen={open==='account'} 
                onPress={()=>toggle('account')}
            >
                <PressableScale style={styles.settingActionBtn}>
                    <FontAwesome5 name="file-export" size={16} color={COLORS.info} />
                    <Text style={styles.settingActionText}>تصدير البيانات</Text>
                </PressableScale>
                
                <PressableScale style={[styles.settingActionBtn, {marginTop: 10}]}>
                    <FontAwesome5 name="shield-alt" size={16} color={COLORS.warning} />
                    <Text style={styles.settingActionText}>خصوصية البيانات</Text>
                </PressableScale>
            </Accordion>

            {/* Logout */}
            <PressableScale 
                onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    if (onLogout) onLogout();
                }} 
                style={[styles.logoutBtn, {marginTop: 25}]}
            >
                <Text style={styles.logoutText}>تسجيل الخروج</Text>
                <FontAwesome5 name="sign-out-alt" size={16} color={COLORS.danger} />
            </PressableScale>
        </Animated.View>
    );

    return (
        <FlatList
            data={[1]} // Single item to render content
            renderItem={renderContent}
            keyExtractor={() => 'settings-content'}
            contentContainerStyle={{ paddingBottom: 150 }}
            showsVerticalScrollIndicator={false}
        />
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

  // Parallax Header Calc
  const headerHeight = scrollY.interpolate({ 
    inputRange: [0, 150], 
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT], 
    extrapolate: 'clamp' 
  });
  
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
        <ImageBackground source={{ uri: BG_IMAGE }} style={StyleSheet.absoluteFill} resizeMode="cover">
            <View style={styles.darkOverlay} />
            {particles.map((p) => (
                <Spore key={p.id} {...p} />
            ))}
            
            {/* --- PARALLAX HEADER --- */}
            <Animated.View style={[
                styles.header, 
                { 
                    height: headerHeight,
                    transform: [{ scale: headerScale }]
                }
            ]}>
                <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} renderToHardwareTextureAndroid />
                <LinearGradient 
                    colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)', 'transparent']} 
                    style={StyleSheet.absoluteFill} 
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                />
                
                <View style={styles.headerContent}>
                     <View>
                        <Text style={styles.welcomeText}>
                            أهلاً، {userProfile?.settings?.name?.split(' ')[0] || 'بك'}
                        </Text>
                        <Text style={styles.subWelcome}>رحلتك لجمال طبيعي ✨</Text>
                     </View>
                     <Animated.View style={[
                         styles.avatar, 
                         { 
                             opacity: avatarOpacity, 
                             transform:[{scale: avatarOpacity}] 
                         }
                     ]}>
                         <Text style={{fontSize: 28}}>🧖‍♀️</Text>
                     </Animated.View>
                </View>
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
    onTabChange={(id) => setActiveTab(id)} 
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
                        colors={[COLORS.primary, COLORS.primaryDark]} 
                        style={styles.fabGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <FontAwesome5 name="plus" size={22} color="#FFF" />
                    </LinearGradient>
                </PressableScale>
            )}

        </ImageBackground>
    </View>
  );
}

// --- 7. ENHANCED STYLES & UI KIT ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#05080a' 
  },
  darkOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.65)' 
  },
  
  // PARALLAX HEADER
  header: {
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 100,
    justifyContent: 'flex-end', 
    overflow: 'hidden',
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.15)'
  },
  headerContent: {
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end',
    paddingHorizontal: 25, 
    paddingBottom: 20, 
    flex: 1, 
    marginTop: 40
  },
  welcomeText: { 
    fontFamily: 'Tajawal-ExtraBold', 
    fontSize: 28, 
    color: COLORS.text, 
    textAlign: 'right', 
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowRadius: 10 
  },
  subWelcome: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 14, 
    color: COLORS.textDim, 
    textAlign: 'right', 
    marginTop: 4 
  },
  avatar: { 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: COLORS.primary 
  },

  // Loading
  loadingContainer: { 
    height: 200, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  // Glass Card Base
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    position: 'relative',
    padding: 20,
    marginBottom: 15,
  },

  shimmerOverlay: {
    backgroundColor: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
  },

  // SHELF STYLES
  statsContainer: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    marginBottom: 25,
    marginTop: 10,
  },
  statBox: { 
    alignItems: 'center', 
    flex: 1, 
    padding: 15,
    borderRadius: 16,
  },
  statLabel: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 10, 
    color: COLORS.textDim,
    marginBottom: 5,
  },
  statValue: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 22, 
    color: COLORS.primary 
  },
  statDivider: { 
    width: 1, 
    height: '60%', 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    alignSelf: 'center' 
  },

  productCard: {
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(178, 216, 180, 0.1)',
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
    color: COLORS.text, 
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
  },
  emptyText: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 18, 
    color: COLORS.text, 
    marginTop: 15,
    textAlign: 'center',
  },
  emptySub: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 14, 
    color: COLORS.textDim, 
    textAlign: 'center', 
    marginTop: 5,
    lineHeight: 20,
  },

  // ROUTINE STYLES
  routineSwitchContainer: { 
    flexDirection: 'row-reverse', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 30, 
    padding: 4, 
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  periodBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8, 
    paddingVertical: 12, 
    borderRadius: 25,
  },
  periodBtnActive: { 
    backgroundColor: COLORS.primary,
  },
  periodText: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 14,
    color: COLORS.textDim,
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
    backgroundColor: COLORS.primary, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginLeft: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  routineNumText: { 
    fontFamily: 'Tajawal-Bold', 
    color: COLORS.darkGreen,
    fontSize: 13,
  },
  routineLabel: { 
    fontFamily: 'Tajawal-Bold', 
    color: COLORS.text, 
    fontSize: 15, 
    textAlign: 'right', 
    flex: 1,
    marginBottom: 8,
  },
  addProdBtn: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  addProdText: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 12, 
    color: COLORS.textDim,
  },
  selectedProd: { 
    backgroundColor: 'rgba(178,216,180,0.1)', 
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
    color: COLORS.primary, 
    flex: 1,
    marginRight: 8,
  },

  // ANALYSIS STYLES
  weatherWidget: {
      backgroundColor: 'rgba(96, 165, 250, 0.15)', 
      borderRadius: 20, 
      padding: 20, 
      marginBottom: 20,
      borderWidth: 1, 
      borderColor: 'rgba(96, 165, 250, 0.25)',
  },
  weatherTemp: { 
    fontFamily: 'Tajawal-ExtraBold', 
    fontSize: 36, 
    color: COLORS.text,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowRadius: 2,
  },
  weatherText: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 13, 
    color: COLORS.textDim,
    marginTop: 4,
  },
  glassPanel: {
      borderRadius: 20, 
      padding: 20, 
      marginBottom: 15,
  },
  panelTitle: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 20, 
    color: COLORS.text, 
    textAlign: 'right', 
    marginBottom: 8 
  },
  panelDesc: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 13, 
    color: COLORS.textDim, 
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
    color: COLORS.text,
    textAlign: 'right',
    marginBottom: 12,
    marginTop: 5,
  },
  alertCard: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 8, 
    borderRightWidth: 3, 
    gap: 10 
  },
  alertText: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 12, 
    color: COLORS.text, 
    flex: 1, 
    textAlign: 'right' 
  },

  // INGREDIENTS
  searchBar: { 
    flexDirection: 'row-reverse', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 14, 
    paddingHorizontal: 15, 
    height: 44, 
    alignItems: 'center', 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: { 
    flex: 1, 
    fontFamily: 'Tajawal-Regular', 
    color: COLORS.text, 
    marginRight: 10, 
    fontSize: 14, 
    textAlign: 'right',
    paddingVertical: 10,
  },
  filterPill: {
    backgroundColor: 'rgba(255,255,255,0.08)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 15,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 11, 
    color: COLORS.textDim,
  },
  filterTextActive: {
    color: COLORS.darkGreen,
    fontFamily: 'Tajawal-Bold',
  },
  ingredientsStats: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
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
      backgroundColor: 'rgba(255,255,255,0.02)', 
      padding: 15, 
      borderRadius: 14, 
      marginBottom: 8,
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.05)'
  },
  ingName: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 14, 
    color: COLORS.text,
    marginBottom: 4,
  },
  ingType: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 10, 
    color: COLORS.textDim, 
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
    color: COLORS.textDim,
    marginTop: 4,
  },
  countBadge: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8,
    minWidth: 32,
    alignItems: 'center',
  },
  countText: { 
    fontSize: 10, 
    fontFamily: 'Tajawal-Bold', 
    color: COLORS.primary 
  },

  // MIGRATION
  migCard: { 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 10,
  },
  migName: { 
    fontFamily: 'Tajawal-Bold', 
    color: COLORS.text, 
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
    color: COLORS.textDim, 
    fontSize: 12, 
    textAlign: 'right', 
    marginTop: 8 
  },
  migSuggestion: { 
    fontFamily: 'Tajawal-Regular', 
    color: COLORS.primary, 
    textAlign: 'right', 
    fontSize: 13, 
    marginTop: 8, 
    backgroundColor: 'rgba(178,216,180,0.1)', 
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
    backgroundColor: 'rgba(255,255,255,0.1)', 
    marginVertical: 12 
  },

  // SETTINGS
  settingTitle: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: 18, 
    color: COLORS.text, 
    textAlign: 'right', 
    marginBottom: 15 
  },
  chipsRow: { 
    flexDirection: 'row-reverse', 
    flexWrap: 'wrap', 
    gap: 10 
  },
  chip: {
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderWidth: 1, 
    borderColor: 'transparent',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  chipActive: { 
    backgroundColor: COLORS.primary, 
    borderColor: COLORS.primary 
  },
  chipText: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: 12, 
    color: COLORS.text 
  },
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16, 
    backgroundColor: 'rgba(239, 68, 68, 0.15)', 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: COLORS.danger, 
    gap: 10 
  },
  logoutText: { 
    fontFamily: 'Tajawal-Bold', 
    color: COLORS.danger, 
    fontSize: 16 
  },
  timeRow: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  label: { 
    fontFamily: 'Tajawal-Regular', 
    color: COLORS.text, 
    fontSize: 14 
  },
  timeBtn: { 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  timeText: { 
    fontFamily: 'Tajawal-Bold', 
    color: COLORS.primary, 
    fontSize: 14 
  },
  settingActionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  settingActionText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  
  // ACCORDION
  accordionWrapper: { 
    borderRadius: 16, 
    marginBottom: 10, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  accordionHeader: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  accordionHeaderOpen: { 
    backgroundColor: 'rgba(255,255,255,0.08)' 
  },
  accordionTitle: { 
    fontFamily: 'Tajawal-Bold', 
    color: COLORS.text, 
    fontSize: 15 
  },
  accordionBody: { 
    overflow: 'hidden',
  },
  iconBoxSm: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: 'rgba(178,216,180,0.15)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },

  // MODAL
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalGlass: { 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    overflow: 'hidden', 
    maxHeight: height * 0.6, 
    backgroundColor: 'rgba(10, 15, 12, 0.95)', 
    borderWidth: 1, 
    borderColor: 'rgba(178, 216, 180, 0.2)',
  },
  modalHeader: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.1)' 
  },
  modalTitle: { 
    fontFamily: 'Tajawal-Bold', 
    color: COLORS.text, 
    fontSize: 18 
  },
  modalItem: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 5,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  modalItemName: { 
    fontFamily: 'Tajawal-Regular', 
    color: COLORS.text, 
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
    color: COLORS.text,
    fontSize: 16,
    marginTop: 15,
  },
  modalEmptySubText: {
    fontFamily: 'Tajawal-Regular',
    color: COLORS.textDim,
    fontSize: 14,
    marginTop: 5,
  },

  // Time Picker
  timePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  timePickerContainer: {
    backgroundColor: 'rgba(10, 15, 12, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(178, 216, 180, 0.2)',
  },

  settingGroup: { gap: 10 },
    groupLabel: { fontFamily:'Tajawal-Bold', color:COLORS.textDim, fontSize:12, textAlign:'right', marginTop:5 },
    
    // Enhanced Chip
    chip: { 
        paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, 
        backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
        flexDirection:'row-reverse', alignItems:'center'
    },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.text },
    
    // Blacklist
    blacklistRow: { flexDirection:'row-reverse', gap:10, marginBottom:15 },
    blackInput: { 
        flex:1, backgroundColor:'rgba(0,0,0,0.3)', borderRadius:10, padding:10, 
        color:COLORS.text, fontFamily:'Tajawal-Regular', textAlign:'right',
        borderWidth:1, borderColor: COLORS.glassBorder
    },
    addBlackBtn: { 
        width: 44, borderRadius:10, backgroundColor: 'rgba(178, 216, 180, 0.15)', 
        alignItems:'center', justifyContent:'center', borderWidth:1, borderColor: COLORS.primary 
    },
    blackChip: {
        flexDirection:'row-reverse', alignItems:'center', gap:8,
        backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingVertical:6, paddingHorizontal:12,
        borderRadius:20, borderWidth:1, borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    blackChipText: { color: COLORS.danger, fontFamily:'Tajawal-Bold', fontSize:12 },

  timePickerCloseBtn: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  timePickerCloseText: {
    fontFamily: 'Tajawal-Bold',
    color: COLORS.darkGreen,
    fontSize: 16,
  },

  // FAB
  fab: { 
    position: 'absolute', 
    bottom: 100, 
    left: 20, 
    shadowColor: COLORS.primary, 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.5, 
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});