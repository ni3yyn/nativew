
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'; 

import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');
const FOOTER_HEIGHT = 180;
const HEADER_HEIGHT = 60;

const DEFAULT_COLORS = {
  background: '#14231E',
  card: '#1E332B',
  border: 'rgba(90, 156, 132, 0.25)',
  accentGreen: '#5A9C84',
  textPrimary: '#F1F3F2',
  textSecondary: '#A8B8B3',
  textDim: '#82948E',
  danger: '#EF4444',
  textOnAccent: '#1A2D27',
  gold: '#F59E0B',
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

  // 🌟 STRICT POST-ANIMATION CAMERA MOUNTING FLAG
  const [isCameraMounted, setIsCameraMounted] = useState(false);

  // --- ANIMATIONS ---
  // 🌟 APERTURE FOCUS TRANSITION (Scale 0.92 ➔ 1.0 + Opacity 0 ➔ 1)
  const openProgress = useRef(new Animated.Value(0)).current;
  const laserPos = useRef(new Animated.Value(0)).current;
  const shutterScale = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const knobPan = useRef(new Animated.Value(0)).current;
  const cameraFadeAnim = useRef(new Animated.Value(0)).current;
  const laserLoopRef = useRef(null);

  // --- 1. VIEWPORT CALCULATIONS ---
  const cameraDimensions = useMemo(() => {
    const availableHeight = height - FOOTER_HEIGHT - HEADER_HEIGHT - insets.top - insets.bottom;
    const maxWidth = width * 0.94; 

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

  // --- 2. SNAPPY APERTURE REVEAL & STRICT DEFERRED MOUNTING ---
  useEffect(() => {
    if (isVisible) {
      if (!permission?.granted) requestPermission();

      // Reset state cleanly before visual reveal
      setIsCameraMounted(false);
      setIsCameraReady(false);
      setTorch(false);
      setZoom(0);
      knobPan.setValue(0);
      cameraFadeAnim.setValue(0);
      openProgress.setValue(0);

      // 🌟 SNAPPY APERTURE FOCUS (180ms native GPU transition, zero window contention)
      Animated.timing(openProgress, {
        toValue: 1,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          // 🌟 Wait a micro-tick after modal is 100% resting before waking up the camera hardware
          requestAnimationFrame(() => {
            setTimeout(() => {
              setIsCameraMounted(true);
            }, 40);
          });
        }
      });
    } else {
      setIsCameraMounted(false);
      if (laserLoopRef.current) laserLoopRef.current.stop();
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    if (laserLoopRef.current) laserLoopRef.current.stop();

    // 🌟 Immediately release camera hardware
    setIsCameraMounted(false);

    // Fast aperture collapse
    Animated.timing(openProgress, {
      toValue: 0,
      duration: 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsCameraReady(false);
        onClose();
      }
    });
  }, [onClose]);

  // --- 3. ON CAMERA READY ---
  const onCameraReady = useCallback(() => {
    setIsCameraReady(true);
    
    // Smooth fade-in of viewfinder feed
    Animated.timing(cameraFadeAnim, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();

    // Start scanner line only when viewfinder is actively rendering
    laserLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(laserPos, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(laserPos, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    laserLoopRef.current.start();
  }, []);

  // --- ZOOM SLIDER ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => Haptics.selectionAsync().catch(() => {}),
      onPanResponderMove: (evt) => {
        const touchX = evt.nativeEvent.pageX;
        const startX = (width - sliderWidth) / 2;

        let localX = touchX - startX;
        if (localX < 0) localX = 0;
        if (localX > sliderWidth) localX = sliderWidth;

        const percentage = localX / sliderWidth;
        setZoom(percentage); 
        knobPan.setValue(localX);
      },
    })
  ).current;

  // --- PHOTO CAPTURE ---
  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing || !isCameraReady) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setIsCapturing(true);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(shutterScale, { toValue: 0.88, duration: 50, useNativeDriver: true }),
        Animated.timing(shutterScale, { toValue: 1, duration: 90, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 40, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
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
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      handleClose();
      setTimeout(() => onPictureTaken(processed), 180);
    } catch (e) {
      console.error("Camera Capture Error:", e);
      setIsCapturing(false);
    }
  };

  if (!permission?.granted) return null;

  // 🌟 NATIVE APERTURE ANIMATION INTERPOLATIONS
  const modalScale = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.93, 1],
  });

  const topControlsTranslate = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 0],
  });

  const bottomControlsTranslate = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  const laserTranslateY = laserPos.interpolate({
    inputRange: [0, 1],
    outputRange: [0, cameraDimensions.height],
  });

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.container, { opacity: openProgress }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* --- 1. TOP INSTRUCTION --- */}
        <SafeAreaView style={styles.topSection}>
          <Animated.View style={[styles.instructionPill, { transform: [{ translateY: topControlsTranslate }] }]}>
            <Ionicons name="scan-outline" size={16} color={COLORS.textPrimary} />
            <Text style={styles.instructionText}>{t('oilguard_camera_instruction', language)}</Text>
          </Animated.View>
        </SafeAreaView>

        {/* --- 2. MIDDLE CAMERA VIEW (APERTURE ZOOM) --- */}
        <View style={styles.middleSection}>
          <Animated.View 
            style={[
              styles.roundedFrame,
              { 
                width: cameraDimensions.width, 
                height: cameraDimensions.height,
                transform: [{ scale: modalScale }]
              }
            ]}
          >
            {/* 🌟 Camera Mounts ONLY when modal is completely shown and resting */}
            {isCameraMounted ? (
              <Animated.View style={{ flex: 1, opacity: cameraFadeAnim }}>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  mode="picture"
                  animateShutter={false}
                  enableTorch={torch}
                  zoom={zoom}
                  onCameraReady={onCameraReady}
                  responsiveOrientationWhenOrientationLocked={true}
                />
              </Animated.View>
            ) : null}

            {/* Viewfinder Placeholder */}
            {!isCameraReady && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color={COLORS.accentGreen} />
              </View>
            )}

            {/* Scanner Line & Target Brackets */}
            <View style={styles.overlayContainer} pointerEvents="none">
              {isCameraReady && (
                <Animated.View style={[
                  styles.laserLine,
                  { transform: [{ translateY: laserTranslateY }] }
                ]} />
              )}

              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>

            {/* Shutter Flash */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: '#FFF', opacity: flashAnim }
              ]}
              pointerEvents="none"
            />
          </Animated.View>
        </View>

        {/* --- 3. BOTTOM CONTROLS --- */}
        <Animated.View 
          style={[
            styles.footerSection, 
            { 
              paddingBottom: insets.bottom + 10,
              transform: [{ translateY: bottomControlsTranslate }]
            }
          ]}
        >
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

          {/* Action Buttons */}
          <View style={styles.buttonsRow}>
            {/* Close */}
            <TouchableOpacity onPress={handleClose} style={styles.sideButton} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>

            {/* Shutter */}
            <TouchableOpacity
              onPress={handleCapture}
              disabled={isCapturing || !isCameraReady}
              activeOpacity={0.9}
            >
              <Animated.View style={[
                styles.shutterRing,
                { transform: [{ scale: shutterScale }] },
                !isCameraReady && { opacity: 0.6 }
              ]}>
                <View style={styles.shutterCore} />
              </Animated.View>
            </TouchableOpacity>

            {/* Torch */}
            <TouchableOpacity
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setTorch(!torch);
              }}
              style={styles.sideButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={torch ? "flash" : "flash-off"}
                size={22}
                color={torch ? (COLORS.gold || '#F59E0B') : COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: COLORS.background,
  },
  topSection: {
    height: HEADER_HEIGHT + 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
  },
  roundedFrame: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 0.8,
    borderColor: COLORS.border,
    position: 'relative',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  instructionPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.8,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  instructionText: {
    color: COLORS.textPrimary,
    fontSize: 13.5,
    fontFamily: 'Tajawal-Regular',
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: COLORS.accentGreen,
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: COLORS.accentGreen,
    borderWidth: 3,
    borderRadius: 4,
    opacity: 0.85,
  },
  tl: { top: 14, left: 14, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 14, right: 14, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 14, left: 14, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 14, right: 14, borderLeftWidth: 0, borderTopWidth: 0 },
  zoomContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  zoomLabel: {
    color: COLORS.accentGreen,
    fontSize: 12,
    fontFamily: 'Tajawal-Bold',
    marginBottom: 6,
  },
  zoomTrackArea: {
    height: 30,
    justifyContent: 'center',
  },
  zoomTrackBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  zoomTrackFill: {
    height: 4,
    backgroundColor: COLORS.accentGreen,
    borderRadius: 2,
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
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 0.8,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.textPrimary,
  },
});
