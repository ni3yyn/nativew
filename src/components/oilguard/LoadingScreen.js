import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

// --- APP THEME COLORS ---
const COLORS = {
  background: '#1A2D27',
  accentGreen: '#5A9C84',       // Main Teal
  accentLight: '#8CD1B9',       // Highlights
  accentDark: '#2C5E4F',        // Depth
  
  // Liquid Layers (Dark -> Light)
  liquidBack: '#1F3A33',        // Darkest (Deep background)
  liquidMiddle: '#3B6B5E',      // Mid-tone (Mixing layer)
  liquidFront: '#5A9C84',       // Front (Brightest)
  
  textPrimary: '#F1F3F2',
};

const LOADING_STAGES = [
  "تحليل التركيبة...",
  "فحص المكونات...",
  "مقارنة المعايير...",
  "إعداد التقرير..."
];

// --- BUBBLE COMPONENT ---
const GentleBubble = ({ delay }) => {
  const animY = useRef(new Animated.Value(0)).current;
  const animOp = useRef(new Animated.Value(0)).current;
  const animX = useRef(new Animated.Value(0)).current;
  
  const startX = (Math.random() - 0.5) * 50;
  const size = 3 + Math.random() * 4; 

  useEffect(() => {
    let isMounted = true;

    const runBubble = () => {
      if (!isMounted) return;
      
      animY.setValue(0);
      animOp.setValue(0);
      animX.setValue(startX);

      Animated.parallel([
        // Float Up
        Animated.timing(animY, {
          toValue: -90,
          duration: 2500 + Math.random() * 1500,
          easing: Easing.linear, 
          useNativeDriver: true,
        }),
        // Slight Wiggle
        Animated.sequence([
            Animated.timing(animX, { toValue: startX + 8, duration: 1500, easing: Easing.linear, useNativeDriver: true }),
            Animated.timing(animX, { toValue: startX - 8, duration: 1500, easing: Easing.linear, useNativeDriver: true })
        ]),
        // Fade In/Out
        Animated.sequence([
            Animated.timing(animOp, { toValue: 0.6, duration: 500, easing: Easing.ease, useNativeDriver: true }),
            Animated.delay(1000),
            Animated.timing(animOp, { toValue: 0, duration: 1000, easing: Easing.ease, useNativeDriver: true }),
        ])
      ]).start(() => {
          if (isMounted) runBubble();
      });
    };

    const timer = setTimeout(runBubble, delay);
    return () => {
        isMounted = false;
        clearTimeout(timer);
    };
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.5)',
        bottom: 15,
        transform: [{ translateX: animX }, { translateY: animY }],
        opacity: animOp,
        zIndex: 10
      }}
    />
  );
};

// --- MAIN COMPONENT ---
const LoadingScreen = () => {
  const [stageIndex, setStageIndex] = useState(0);

  // --- ANIMATIONS ---
  const waveAnim = useRef(new Animated.Value(0)).current; 
  const fadeText = useRef(new Animated.Value(1)).current;

  // Bubbles array
  const bubbles = useRef([...Array(7)].map((_, i) => ({ id: i, delay: i * 450 }))).current;

  useEffect(() => {
    // 1. Endless Wave Rotation
    const startWave = () => {
        waveAnim.setValue(0);
        Animated.loop(
            Animated.timing(waveAnim, {
                toValue: 1,
                duration: 5000, // 5 seconds per full mixing cycle
                easing: Easing.linear, 
                useNativeDriver: true
            })
        ).start();
    };
    startWave();

    // 2. Text Cycle
    const textInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeText, { toValue: 0, duration: 300, easing: Easing.ease, useNativeDriver: true }),
        Animated.delay(100),
      ]).start(() => {
        setStageIndex((prev) => (prev + 1) % LOADING_STAGES.length);
        Animated.timing(fadeText, { toValue: 1, duration: 500, easing: Easing.ease, useNativeDriver: true }).start();
      });
    }, 2500);

    return () => clearInterval(textInterval);
  }, []);

  // --- INTERPOLATIONS ---
  // We use different rotation directions and offsets to create chaos/mixing
  
  const rotateFront = waveAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rotateMiddle = waveAnim.interpolate({ inputRange: [0, 1], outputRange: ['100deg', '460deg'] }); // Offset start
  const rotateBack = waveAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] }); // Reverse direction

  return (
    <View style={styles.container}>
      
      {/* Circle Container */}
      <View style={styles.circleContainer}>
        
        {/* 1. Background Placeholder */}
        <View style={styles.circleBackground} />

        {/* 2. Mask Container (Clips waves to circle) */}
        <View style={styles.maskContainer}>
            
            {/* LAYER 1: BACK WAVE (Darkest, moves opposite) */}
            <Animated.View 
                style={[
                    styles.waveShape, 
                    { 
                        backgroundColor: COLORS.liquidBack,
                        top: 42, 
                        left: -40,
                        transform: [{ rotate: rotateBack }] 
                    }
                ]} 
            />

            {/* LAYER 2: MIDDLE WAVE (Mid-tone, offset phase) */}
            {/* This layer creates the "churning" look between front and back */}
            <Animated.View 
                style={[
                    styles.waveShape, 
                    { 
                        backgroundColor: COLORS.liquidMiddle,
                        top: 46, 
                        left: -35,
                        opacity: 0.9,
                        transform: [{ rotate: rotateMiddle }] 
                    }
                ]} 
            />

            {/* LAYER 3: FRONT WAVE (Brightest, defines surface) */}
            <Animated.View 
                style={[
                    styles.waveShape, 
                    { 
                        backgroundColor: COLORS.liquidFront,
                        top: 52, 
                        left: -42,
                        transform: [{ rotate: rotateFront }] 
                    }
                ]} 
            />

             {/* 3. Bubbles */}
             <View style={StyleSheet.absoluteFill}>
                <View style={{position: 'absolute', bottom: 0, width: '100%', alignItems: 'center'}}>
                    {bubbles.map(b => <GentleBubble key={b.id} delay={b.delay} />)}
                </View>
             </View>

        </View>

        {/* 4. Flask Icon (Window Overlay) */}
        <View style={styles.iconLayer}>
             <FontAwesome5 name="flask" size={40} color={COLORS.textPrimary} />
        </View>

        {/* 5. Clean Outer Ring */}
        <View style={styles.outerRing} />

      </View>

      {/* Text Section */}
      <View style={styles.textContainer}>
        <Text style={styles.mainTitle}>جاري التحليل</Text>
        <Animated.Text style={[styles.subTitle, { opacity: fadeText }]}>
          {LOADING_STAGES[stageIndex]}
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  circleContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  
  // Background depth
  circleBackground: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.25)', 
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)'
  },

  // Clips the rotating squares to look like liquid in a circle
  maskContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    position: 'absolute',
  },
  
  // THE WAVE SHAPE (Rounded Square)
  waveShape: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 78, // High border radius makes it a "squircle"
    opacity: 1,
  },

  // Icon Overlay
  iconLayer: {
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Subtle Outer Ring
  outerRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(90, 156, 132, 0.2)',
    zIndex: -1,
  },

  // Typography
  textContainer: {
    alignItems: 'center',
    height: 60,
  },
  mainTitle: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 22,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subTitle: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 14,
    color: COLORS.accentGreen,
    letterSpacing: 0.5,
  },
});

export default LoadingScreen;