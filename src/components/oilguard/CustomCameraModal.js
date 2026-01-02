import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, Animated, Dimensions, 
  TouchableOpacity, StatusBar, Easing, PanResponder, Platform 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- PALETTE ---
const COLORS = {
  background: '#1A2D27', 
  accent: '#5A9C84', 
  brightAccent: '#7DCEB2',   
  text: '#F1F3F2',
};

const { width } = Dimensions.get('window');
const CAM_WIDTH = width * 0.95; // Slightly less than full width for nice padding
const CAM_HEIGHT = CAM_WIDTH * (4 / 3); 
const SLIDER_WIDTH = width * 0.65; 

export default function CustomCameraModal({ isVisible, onClose, onPictureTaken }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const insets = useSafeAreaInsets();

  // --- STATE ---
  const [isCapturing, setIsCapturing] = useState(false);
  const [torch, setTorch] = useState(false); 
  const [zoom, setZoom] = useState(0); 

  // --- ANIMATIONS ---
  const laserPos = useRef(new Animated.Value(0)).current;
  const shutterScale = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const knobPan = useRef(new Animated.Value(0)).current;

  // --- HORIZONTAL ZOOM LOGIC ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
         // Haptic on touch
         Haptics.selectionAsync();
      },
      onPanResponderMove: (evt, gestureState) => {
        const SLIDER_START = (width - SLIDER_WIDTH) / 2;
        // Using pageX to be screen-relative safe
        const touchX = evt.nativeEvent.pageX; 
        
        let localX = touchX - SLIDER_START;
        
        // Clamp
        if (localX < 0) localX = 0;
        if (localX > SLIDER_WIDTH) localX = SLIDER_WIDTH;
        
        // 0.0 -> 1.0 progress
        const percentage = localX / SLIDER_WIDTH;
        
        // Map 0-1 visual progress to 0-0.5 camera zoom (1x to ~5x usually)
        // Adjust this multiplier (0.5) if zoom is too weak/strong for your specific test device
        const MAX_DIGITAL_ZOOM = 0.5;
        
        setZoom(percentage * MAX_DIGITAL_ZOOM); 
        
        // Update visual knob instantly without waiting for state re-render
        knobPan.setValue(localX);
      },
    })
  ).current;

  useEffect(() => {
    if (isVisible) {
      if (!permission?.granted) requestPermission();
      
      setTorch(false);
      setZoom(0);
      knobPan.setValue(0);
      laserPos.setValue(0);

      // --- SCAN LOOP ---
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserPos, { 
            toValue: 1, 
            duration: 2500, 
            easing: Easing.inOut(Easing.cubic), 
            useNativeDriver: true 
          }),
          Animated.timing(laserPos, { 
            toValue: 0, 
            duration: 2500, 
            easing: Easing.inOut(Easing.cubic), 
            useNativeDriver: true 
          }),
        ])
      ).start();
    }
  }, [isVisible]);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsCapturing(true);

    Animated.sequence([
      Animated.timing(shutterScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(shutterScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    // Flash Visual
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0,
        base64: true,
        skipProcessing: true,
      });

      const processed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      onPictureTaken(processed);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleTorch = () => {
    Haptics.selectionAsync();
    setTorch(prev => !prev);
  };

  if (!permission?.granted) return <View style={styles.blackBg} />;

  // Translate laser relative to frame height centered at 0
  const laserTranslateY = laserPos.interpolate({
    inputRange: [0, 1],
    outputRange: [-CAM_HEIGHT / 2, CAM_HEIGHT / 2]
  });

  return (
    <Modal 
      visible={isVisible} 
      animationType="slide" 
      transparent={false}
      onRequestClose={onClose} 
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" translucent />

        {/* --- MAIN CONTENT CENTERING --- */}
        <View style={styles.contentCentering}>

            {/* --- 4:3 CAMERA FRAME --- */}
            <View style={styles.roundedFrame}>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill} // Fills the roundedFrame exactly
                  facing="back"
                  mode="picture"
                  autofocus="on"
                  enableTorch={torch}
                  zoom={zoom}
                />
                    
                {/* --- OVERLAYS (SITTING ON TOP OF CAMERA VIEW) --- */}

                {/* 1. Corners & UI Guides */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                        {/* Corner Brackets */}
                        <View style={[styles.corner, styles.tl]} />
                        <View style={[styles.corner, styles.tr]} />
                        <View style={[styles.corner, styles.bl]} />
                        <View style={[styles.corner, styles.br]} />

                        {/* Instruction Pill - Centered Inside Camera Frame */}
                        <View style={styles.instructionPill}>
                            <Ionicons name="scan-outline" size={14} color={COLORS.text} style={{ opacity: 0.9 }} />
                            <Text style={styles.instructionText}>قائمة المكونات فقط</Text>
                        </View>
                </View>

                {/* 2. Flash Overlay */}
                <Animated.View 
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'white', opacity: flashAnim }]} 
                    pointerEvents="none" 
                />
            </View>

        </View>


        {/* --- BOTTOM CONTROLS --- */}
        <View style={[styles.bottomControlArea, { paddingBottom: insets.bottom + 20 }]}>

            {/* ZOOM SLIDER */}
            <View style={styles.zoomContainer}>
                 {/* Visual Mapping: zoom=0 is 1x. If max digital zoom is 0.5 (~5x), visual label needs scale factor */}
                 <Text style={styles.zoomLabel}>{(1 + zoom * 6).toFixed(1)}x</Text> 
                 
                 <View 
                    style={styles.zoomTrackArea}
                    {...panResponder.panHandlers}
                 >
                    {/* Track */}
                    <View style={styles.zoomTrackBg}>
                         <Animated.View style={[
                             styles.zoomTrackFill, 
                             { width: knobPan } 
                         ]} />
                    </View>
                    
                    {/* Hit Slop / Drag Area overlay for easier touching */}
                    <View style={StyleSheet.absoluteFill} /> 

                    {/* Knob */}
                    <Animated.View style={[
                        styles.zoomKnob, 
                        { transform: [{ translateX: knobPan }] } 
                    ]} />
                 </View>
            </View>

            {/* BUTTONS ROW */}
            <View style={styles.buttonsRow}>
                {/* Close Button */}
                <TouchableOpacity onPress={onClose} style={styles.sideButton}>
                    <Ionicons name="chevron-down" size={28} color={COLORS.text} />
                </TouchableOpacity>

                {/* Shutter */}
                <TouchableOpacity 
                    onPress={handleCapture}
                    disabled={isCapturing}
                    activeOpacity={1}
                >
                    <Animated.View style={[styles.shutterRing, { transform: [{ scale: shutterScale }] }]}>
                        <View style={styles.shutterCore} />
                    </Animated.View>
                </TouchableOpacity>

                {/* Flash Button */}
                <TouchableOpacity onPress={toggleTorch} style={styles.sideButton}>
                    <Ionicons 
                        name={torch ? "flash" : "flash-off"} 
                        size={24} 
                        color={torch ? COLORS.accent : COLORS.text} 
                    />
                </TouchableOpacity>
            </View>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  blackBg: { flex: 1, backgroundColor: 'black' },
  
  // CENTERED CONTENT LAYOUT
  contentCentering: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60, // Nudges camera up slightly to make room for tall bottom controls
  },
  
  // CAMERA FRAME (4:3)
  roundedFrame: {
    width: CAM_WIDTH,
    height: CAM_HEIGHT,
    borderRadius: 32,
    overflow: 'hidden', // IMPORTANT: This clips the scan laser when it moves out of view
    backgroundColor: '#000',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(90, 156, 132, 0.2)',
  },
  // CORNERS & GUIDES
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: COLORS.accent,
    borderWidth: 4,
    borderRadius: 8,
    opacity: 0.7,
  },
  tl: { top: 20, left: 20, borderRightWidth:0, borderBottomWidth:0 },
  tr: { top: 20, right: 20, borderLeftWidth:0, borderBottomWidth:0 },
  bl: { bottom: 20, left: 20, borderRightWidth:0, borderTopWidth:0 },
  br: { bottom: 20, right: 20, borderLeftWidth:0, borderTopWidth:0 },
  
  // Optional tiny center marker
  centerCrosshair: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.3)',
      transform: [{translateX:-3}, {translateY:-3}]
  },

  // INSTRUCTION PILL (Inside Camera)
  instructionPill: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20, 35, 30, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(90, 156, 132, 0.4)',
  },
  instructionText: {
    color: COLORS.text,
    fontSize: 13,
    fontFamily: 'Tajawal-Regular',
    letterSpacing: 0.5,
  },

  // BOTTOM CONTROLS AREA
  bottomControlArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'black',
    alignItems: 'center',
    paddingTop: 15,
    zIndex: 100,
  },
  
  // ZOOM SLIDER
  zoomContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 40,
  },
  zoomLabel: {
    color: COLORS.accent,
    fontSize: 13,
    fontFamily: 'Tajawal-Regular',
    fontWeight: '700',
    marginBottom: 10,
  },
  zoomTrackArea: {
    height: 40, // Increased touch target height
    width: SLIDER_WIDTH,
    justifyContent: 'center',
  },
  zoomTrackBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  zoomTrackFill: {
      height: 4,
      backgroundColor: COLORS.accent,
      borderRadius: 2,
  },
  zoomKnob: {
      position: 'absolute',
      width: 24, // Slightly larger knob
      height: 24,
      borderRadius: 12,
      backgroundColor: 'white',
      shadowColor: COLORS.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 6,
      elevation: 6,
      top: 8, // (40 container - 24 knob)/2 = 8
      marginLeft: -12, // Offset half width to center on position
  },

  // BUTTONS ROW
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 40, 
  },
  sideButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1a1a', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: 'white',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
});