import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Easing,
  PanResponder,
  SafeAreaView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#000000',
  accent: '#5A9C84',
  text: '#F1F3F2',
};

const { width, height } = Dimensions.get('window');
const FOOTER_HEIGHT = 180;
const HEADER_HEIGHT = 60;

export default function CustomCameraModal({ isVisible, onClose, onPictureTaken }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const insets = useSafeAreaInsets();

  // --- STATE ---
  const [isCapturing, setIsCapturing] = useState(false);
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // --- ANIMATIONS ---
  const laserPos = useRef(new Animated.Value(0)).current;
  const shutterScale = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const knobPan = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // --- 1. CALCULATE DIMENSIONS (FIXED) ---
  const cameraDimensions = useMemo(() => {
    // Calculate vertical space available between Header and Footer
    const availableHeight = height - FOOTER_HEIGHT - HEADER_HEIGHT - insets.top - insets.bottom;
    const maxWidth = width * 0.95; // 95% width for margins

    // Target Ratio: 4:3 (Standard Photo)
    let finalWidth = maxWidth;
    let finalHeight = finalWidth * (4 / 3);

    // If 4:3 exceeds vertical space, constrain by height instead
    if (finalHeight > availableHeight) {
      finalHeight = availableHeight;
      finalWidth = finalHeight * (3 / 4);
    }

    // CRITICAL FIX: Round down to nearest integer to prevent sub-pixel rendering gaps (black lines)
    return {
      width: Math.floor(finalWidth),
      height: Math.floor(finalHeight)
    };
  }, [insets]);

  const sliderWidth = cameraDimensions.width * 0.8;

  // --- ZOOM GESTURE ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => Haptics.selectionAsync(),
      onPanResponderMove: (evt, gestureState) => {
        const touchX = evt.nativeEvent.pageX;
        const startX = (width - sliderWidth) / 2;

        let localX = touchX - startX;

        // Clamp
        if (localX < 0) localX = 0;
        if (localX > sliderWidth) localX = sliderWidth;

        const percentage = localX / sliderWidth;

        // Max digital zoom usually 0.5 (approx 5x) for smooth UX
        setZoom(percentage * 0.5);
        knobPan.setValue(localX);
      },
    })
  ).current;

  // --- EFFECT: INIT & RESET ---
  useEffect(() => {
    if (isVisible) {
      if (!permission?.granted) requestPermission();
      setTorch(false);
      setZoom(0);
      knobPan.setValue(0);
      setIsCameraReady(false);
      opacityAnim.setValue(0);

      const laserAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(laserPos, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(laserPos, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
        ])
      );
      laserAnimation.start();
      return () => laserAnimation.stop();
    }
  }, [isVisible]);

  const onCameraReady = () => {
    setIsCameraReady(true);
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true
    }).start();
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsCapturing(true);

    // Shutter & Flash Animation
    Animated.parallel([
      Animated.sequence([
        Animated.timing(shutterScale, { toValue: 0.9, duration: 50, useNativeDriver: true }),
        Animated.timing(shutterScale, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 250, useNativeDriver: true })
      ])
    ]).start();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0,
        base64: false,
        skipProcessing: true,
      });

      // Resize logic moved here for optimization
      const processed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1500 } }], // 1500px is safe for OCR
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      onPictureTaken(processed);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission?.granted) return <View style={styles.blackBg} />;

  const laserTranslateY = laserPos.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cameraDimensions.height]
  });

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" />

        {/* --- 1. TOP SECTION --- */}
        <SafeAreaView style={styles.topSection}>
          <View style={styles.instructionPill}>
            <Ionicons name="scan-outline" size={16} color={COLORS.text} />
            <Text style={styles.instructionText}>التقط صورة واضحة للمكونات فقط</Text>
          </View>
        </SafeAreaView>

        {/* --- 2. MIDDLE SECTION (CAMERA) --- */}
        <View style={styles.middleSection}>
          <View style={[
            styles.roundedFrame,
            { width: cameraDimensions.width, height: cameraDimensions.height }
          ]}>
            <Animated.View style={{ flex: 1, opacity: opacityAnim }}>
              <CameraView
                ref={cameraRef}
                // FIX 2: Scale up slightly (1.03) to "bleed" over the edges.
                // This ensures no black gaps appear due to pixel rounding.
                style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.03 }] }]}
                facing="back"
                mode="picture"
                animateShutter={false}
                enableTorch={torch}
                zoom={zoom}
                onCameraReady={onCameraReady}
                responsiveOrientationWhenOrientationLocked={true}
              />
            </Animated.View>

            {/* Loading State */}
            {!isCameraReady && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingDot} />
              </View>
            )}

            {/* Overlays (Laser, Corners) */}
            <View style={styles.overlayContainer} pointerEvents="none">
              <Animated.View style={[
                styles.laserLine,
                { transform: [{ translateY: laserTranslateY }] }
              ]} />

              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>

            {/* Flash Overlay */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'white', opacity: flashAnim }
              ]}
              pointerEvents="none"
            />
          </View>
        </View>

        {/* --- 3. BOTTOM SECTION (CONTROLS) --- */}
        <View style={[styles.footerSection, { paddingBottom: insets.bottom + 10 }]}>

          {/* Zoom Slider */}
          <View style={styles.zoomContainer}>
            <Text style={styles.zoomLabel}>{(1 + zoom * 4).toFixed(1)}x</Text>
            <View
              style={[styles.zoomTrackArea, { width: sliderWidth }]}
              {...panResponder.panHandlers}
            >
              <View style={styles.zoomTrackBg}>
                <Animated.View style={[
                  styles.zoomTrackFill,
                  { width: knobPan }
                ]} />
              </View>
              <Animated.View style={[
                styles.zoomKnob,
                { transform: [{ translateX: knobPan }] }
              ]} />
            </View>
          </View>

          {/* Buttons Row */}
          <View style={styles.buttonsRow}>
            {/* Close */}
            <TouchableOpacity onPress={onClose} style={styles.sideButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>

            {/* Shutter */}
            <TouchableOpacity
              onPress={handleCapture}
              disabled={isCapturing}
              activeOpacity={0.9}
            >
              <Animated.View style={[
                styles.shutterRing,
                { transform: [{ scale: shutterScale }] }
              ]}>
                <View style={styles.shutterCore} />
              </Animated.View>
            </TouchableOpacity>

            {/* Torch */}
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync();
                setTorch(!torch);
              }}
              style={styles.sideButton}
            >
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
    flexDirection: 'column'
  },
  blackBg: {
    flex: 1,
    backgroundColor: 'black'
  },

  // SECTIONS
  topSection: {
    height: HEADER_HEIGHT + 30,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // No background color here to avoid flashing
  },
  footerSection: {
    height: FOOTER_HEIGHT,
    justifyContent: 'flex-end',
    backgroundColor: 'black',
    zIndex: 10
  },

  // CAMERA FRAME
  roundedFrame: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    opacity: 0.2
  },

  // OVERLAYS
  overlayContainer: {
    ...StyleSheet.absoluteFillObject
  },
  instructionPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(30,30,30,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 10
  },
  instructionText: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: 'Tajawal-Regular'
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5
  },

  // CORNERS
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.accent,
    borderWidth: 3,
    borderRadius: 4,
    opacity: 0.8
  },
  tl: { top: 15, left: 15, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 15, right: 15, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 15, left: 15, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 15, right: 15, borderLeftWidth: 0, borderTopWidth: 0 },

  // ZOOM SLIDER
  zoomContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%'
  },
  zoomLabel: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8
  },
  zoomTrackArea: {
    height: 30,
    justifyContent: 'center'
  },
  zoomTrackBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333'
  },
  zoomTrackFill: {
    height: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 2
  },
  zoomKnob: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
    left: -10,
    elevation: 4
  },

  // BUTTONS
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20
  },
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  shutterRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFF'
  },
});