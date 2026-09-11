// --- START OF FILE CustomCameraModal.js ---

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
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'; 
import { LinearGradient } from 'expo-linear-gradient';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');
const FOOTER_HEIGHT = 180;
const HEADER_HEIGHT = 60;

const DEFAULT_COLORS = {
  background: '#1A2D27',
  card: '#253D34',
  border: 'rgba(90, 156, 132, 0.25)',
  accentGreen: '#5A9C84',
  textPrimary: '#F1F3F2',
  textSecondary: '#A8B8B3',
  textDim: '#82948E',
  danger: '#EF4444',
  textOnAccent: '#1A2D27',
};

export default function CustomCameraModal({ isVisible, onClose, onPictureTaken }) {
  const { colors } = useTheme();
  const COLORS = colors || DEFAULT_COLORS;
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const insets = useSafeAreaInsets();
  const language = useCurrentLanguage();

  // --- STATE ---
  const [isCapturing, setIsCapturing] = useState(false);
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // --- ANIMATIONS ---
  const modalAnim = useRef(new Animated.Value(0)).current;
  const laserPos = useRef(new Animated.Value(0)).current;
  const shutterScale = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const knobPan = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // --- MODAL PHYSICS ---
  useEffect(() => {
    if (isVisible) {
      Animated.spring(modalAnim, {
        toValue: 1,
        friction: 9,
        tension: 50,
        useNativeDriver: true
      }).start();
    }
  }, [isVisible]);

  const handleClose = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 250,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  // --- 1. CALCULATE DIMENSIONS ---
  const cameraDimensions = useMemo(() => {
    const availableHeight = height - FOOTER_HEIGHT - HEADER_HEIGHT - insets.top - insets.bottom;
    const maxWidth = width * 0.95; 

    let finalWidth = maxWidth;
    let finalHeight = finalWidth * (4 / 3);

    if (finalHeight > availableHeight) {
      finalHeight = availableHeight;
      finalWidth = finalHeight * (3 / 4);
    }

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

        if (localX < 0) localX = 0;
        if (localX > sliderWidth) localX = sliderWidth;

        const percentage = localX / sliderWidth;

        // FIXED: Using full 0 to 1 percentage range ensures zoom maps properly 
        // to the hardware and eliminates the "starts zooming late" deadzone.
        setZoom(percentage); 
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

      const processed = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1500 } }], 
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Dismiss modal before sending picture
      handleClose();
      setTimeout(() => onPictureTaken(processed), 250);
    } catch (e) {
      console.error(e);
      setIsCapturing(false);
    }
  };

  if (!permission?.granted) return null;

  const laserTranslateY = laserPos.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cameraDimensions.height]
  });

  const modalTranslateY = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [height, 0]
  });

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.container, { transform: [{ translateY: modalTranslateY }] }]}>
        {/* Dynamic Gradient Background */}
        <LinearGradient
          colors={[COLORS.background, COLORS.card]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* --- 1. TOP SECTION --- */}
        <SafeAreaView style={styles.topSection}>
          <View style={styles.instructionPill}>
            <Ionicons name="scan-outline" size={16} color={COLORS.textPrimary} />
            <Text style={styles.instructionText}>{t('oilguard_camera_instruction', language)}</Text>
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

            {/* Overlays */}
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
            <TouchableOpacity onPress={handleClose} style={styles.sideButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
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
                color={torch ? COLORS.accentGreen : COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column'
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
  },
  footerSection: {
    height: FOOTER_HEIGHT,
    justifyContent: 'flex-end',
    zIndex: 10,
    backgroundColor: 'transparent'
  },

  // CAMERA FRAME
  roundedFrame: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    position: 'relative'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentGreen,
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
    backgroundColor: COLORS.card + 'D9', // translucent card color
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    marginTop: 10
  },
  instructionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontFamily: 'Tajawal-Regular'
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.accentGreen,
    shadowColor: COLORS.accentGreen,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5
  },

  // CORNERS
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.accentGreen,
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
    color: COLORS.accentGreen,
    fontSize: 12,
    fontFamily: 'Tajawal-Bold',
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
    backgroundColor: COLORS.border
  },
  zoomTrackFill: {
    height: 4,
    backgroundColor: COLORS.accentGreen,
    borderRadius: 2
  },
  zoomKnob: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.textPrimary,
    left: -10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
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
    backgroundColor: COLORS.card,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  shutterRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.textPrimary
  },
});