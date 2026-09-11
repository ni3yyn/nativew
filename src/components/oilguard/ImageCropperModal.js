// --- START OF FILE ImageCropperModal.js ---

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image as RNImage,
  Easing,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'; 
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';

// --- CONSTANTS ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 160;
const WORKSPACE_HEIGHT = SCREEN_HEIGHT - FOOTER_HEIGHT - HEADER_HEIGHT;
const MIN_CROP_SIZE = 60;

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

const ASPECT_RATIOS = (lang) => [
  { label: t('cropper_ratio_free', lang), value: null, icon: 'crop-free' },
  { label: t('cropper_ratio_original', lang), value: -1, icon: 'image' },
  { label: '1:1', value: 1, icon: 'crop-square' },
  { label: '16:9', value: 16 / 9, icon: 'crop-16-9' },
];

const ImageCropperModal = ({ isVisible, imageUri, onClose, onCropComplete }) => {
  const { colors } = useTheme();
  const COLORS = colors || DEFAULT_COLORS;
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const language = useCurrentLanguage();
  
  // --- STATE ---
  const [displayUri, setDisplayUri] = useState(null);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  const [scale, setScale] = useState(1);
  const [currentRatio, setCurrentRatio] = useState(null);
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [isFlippedV, setIsFlippedV] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mask State
  const [maskRect, setMaskRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // CRITICAL: Keep a ref of the maskRect so PanResponders can access current state without closures issues
  const maskRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Update the ref whenever state changes
  useEffect(() => {
    maskRectRef.current = maskRect;
  }, [maskRect]);

  // Animated Values
  const modalAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const panAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Ref to store start position during drag
  const dragStartMaskRect = useRef({ x: 0, y: 0, width: 0, height: 0 });

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

  // --- INITIALIZATION ---
  useEffect(() => {
    if (imageUri && isVisible) {
      resetEditor();
      RNImage.getSize(imageUri, (w, h) => {
        setOriginalSize({ width: w, height: h });
        calculateViewSize(w, h);
        setDisplayUri(imageUri);
      }, (err) => console.error(err));
    }
  }, [imageUri, isVisible]);

  // Handle Preset Ratios (Only if not Free mode)
  useEffect(() => {
    if (!originalSize.width || !isVisible) return;
    if (currentRatio === null) return;

    const maxWidth = SCREEN_WIDTH * 0.9;
    const maxHeight = WORKSPACE_HEIGHT * 0.85;

    let targetW = maxWidth;
    let targetH = maxWidth;

    if (currentRatio === -1) {
      // Original Ratio
      const imgRatio = originalSize.width / originalSize.height;
      if (imgRatio > 1) {
        targetW = maxWidth;
        targetH = maxWidth / imgRatio;
      } else {
        targetH = maxHeight;
        targetW = maxHeight * imgRatio;
      }
    } else {
      // Fixed Ratio
      if (currentRatio > 1) {
        targetW = maxWidth;
        targetH = maxWidth / currentRatio;
      } else {
        targetH = maxHeight;
        targetW = maxHeight * currentRatio;
      }
    }

    const x = (SCREEN_WIDTH - targetW) / 2;
    const y = (WORKSPACE_HEIGHT - targetH) / 2;

    setMaskRect({ x, y, width: targetW, height: targetH });
  }, [currentRatio]);

  const resetEditor = () => {
    setDisplayUri(imageUri);
    setScale(1);
    scaleAnim.setValue(1);
    panAnim.setValue({ x: 0, y: 0 });
    setIsFlippedH(false);
    setIsFlippedV(false);
    setCurrentRatio(null);
  };

  const calculateViewSize = (w, h) => {
    const scaleFactor = Math.min(SCREEN_WIDTH / w, WORKSPACE_HEIGHT / h);
    const displayedWidth = w * scaleFactor;
    const displayedHeight = h * scaleFactor;

    setViewSize({ width: displayedWidth, height: displayedHeight });

    const initialX = (SCREEN_WIDTH - displayedWidth) / 2;
    const initialY = (WORKSPACE_HEIGHT - displayedHeight) / 2;

    setMaskRect({
      x: initialX,
      y: initialY,
      width: displayedWidth,
      height: displayedHeight
    });
  };

  // --- PAN RESPONDERS ---

  // 1. CORNER HANDLES (Resize)
  const createCornerPanResponder = (corner) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartMaskRect.current = { ...maskRectRef.current };
        Haptics.selectionAsync();
      },
      onPanResponderMove: (e, gestureState) => {
        const { dx, dy } = gestureState;
        const start = dragStartMaskRect.current;

        let newX = start.x;
        let newY = start.y;
        let newW = start.width;
        let newH = start.height;

        if (corner === 'TL') {
          newX = start.x + dx;
          newY = start.y + dy;
          newW = start.width - dx;
          newH = start.height - dy;
        }
        else if (corner === 'TR') {
          newY = start.y + dy;
          newW = start.width + dx;
          newH = start.height - dy;
        }
        else if (corner === 'BL') {
          newX = start.x + dx;
          newW = start.width - dx;
          newH = start.height + dy;
        }
        else if (corner === 'BR') {
          newW = start.width + dx;
          newH = start.height + dy;
        }

        // Min Size Constraints
        if (newW < MIN_CROP_SIZE) {
          newW = MIN_CROP_SIZE;
          if (corner === 'TL' || corner === 'BL') newX = (start.x + start.width) - MIN_CROP_SIZE;
        }
        if (newH < MIN_CROP_SIZE) {
          newH = MIN_CROP_SIZE;
          if (corner === 'TL' || corner === 'TR') newY = (start.y + start.height) - MIN_CROP_SIZE;
        }

        // Bounds Constraints (Keep inside screen)
        if (newX < 0) { newW += newX; newX = 0; }
        if (newY < 0) { newH += newY; newY = 0; }
        if (newX + newW > SCREEN_WIDTH) newW = SCREEN_WIDTH - newX;
        if (newY + newH > WORKSPACE_HEIGHT) newH = WORKSPACE_HEIGHT - newY;

        setMaskRect({ x: newX, y: newY, width: newW, height: newH });
      }
    });
  };

  const tlResponder = useRef(createCornerPanResponder('TL')).current;
  const trResponder = useRef(createCornerPanResponder('TR')).current;
  const blResponder = useRef(createCornerPanResponder('BL')).current;
  const brResponder = useRef(createCornerPanResponder('BR')).current;

  // 2. IMAGE PAN/ZOOM
  const lastScale = useRef(1);
  const lastDistance = useRef(0);

  const calcDistance = (e) => {
    const [t0, t1] = e.nativeEvent.touches;
    const dx = t0.pageX - t1.pageX;
    const dy = t0.pageY - t1.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const imagePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        panAnim.setOffset({ x: panAnim.x._value, y: panAnim.y._value });
        panAnim.setValue({ x: 0, y: 0 });
        if (e.nativeEvent.touches.length === 2) {
          lastDistance.current = calcDistance(e);
          lastScale.current = scale;
        }
      },
      onPanResponderMove: (e, gestureState) => {
        if (e.nativeEvent.touches.length === 2) {
          const dist = calcDistance(e);
          if (lastDistance.current > 0) {
            const scaleChange = dist / lastDistance.current;
            const newScale = Math.max(1, Math.min(lastScale.current * scaleChange, 4));
            setScale(newScale);
            scaleAnim.setValue(newScale);
          }
        } else {
          Animated.event([null, { dx: panAnim.x, dy: panAnim.y }], { useNativeDriver: false })(e, gestureState);
        }
      },
      onPanResponderRelease: () => {
        panAnim.flattenOffset();
        lastDistance.current = 0;
      },
    })
  ).current;

  // --- ACTIONS ---
  const handleRotate90 = async () => {
    if (isProcessing) return;
    Haptics.selectionAsync();
    setIsProcessing(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        displayUri,
        [{ rotate: 90 }],
        { format: ImageManipulator.SaveFormat.JPEG }
      );
      setDisplayUri(result.uri);
      setOriginalSize(prev => ({ width: prev.height, height: prev.width }));
      calculateViewSize(originalSize.height, originalSize.width);
      panAnim.setValue({ x: 0, y: 0 });
      panAnim.setOffset({ x: 0, y: 0 });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlip = (axis) => {
    Haptics.selectionAsync();
    if (axis === 'H') setIsFlippedH(!isFlippedH);
    if (axis === 'V') setIsFlippedV(!isFlippedV);
  };

  const performCrop = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const centerX = SCREEN_WIDTH / 2;
      const centerY = WORKSPACE_HEIGHT / 2;

      const currentPanX = panAnim.x.__getValue();
      const currentPanY = panAnim.y.__getValue();

      const visualImageX = centerX + currentPanX - (viewSize.width * scale) / 2;
      const visualImageY = centerY + currentPanY - (viewSize.height * scale) / 2;

      const deltaX = maskRect.x - visualImageX;
      const deltaY = maskRect.y - visualImageY;

      const ratio = originalSize.width / viewSize.width;

      let cropX = Math.round((deltaX / scale) * ratio);
      let cropY = Math.round((deltaY / scale) * ratio);
      let cropW = Math.round((maskRect.width / scale) * ratio);
      let cropH = Math.round((maskRect.height / scale) * ratio);

      cropX = Math.max(0, cropX);
      cropY = Math.max(0, cropY);

      if (cropX + cropW > originalSize.width) {
        cropW = originalSize.width - cropX;
      }
      if (cropY + cropH > originalSize.height) {
        cropH = originalSize.height - cropY;
      }

      const actions = [];
      if (isFlippedH) actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      if (isFlippedV) actions.push({ flip: ImageManipulator.FlipType.Vertical });
      actions.push({ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } });

      const result = await ImageManipulator.manipulateAsync(
        displayUri,
        actions,
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.95 }
      );

      // Trigger the slide out animation, then pass result
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true
      }).start(() => {
        onCropComplete(result);
      });
      
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  if (!isVisible) return null;

  const modalTranslateY = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0]
  });

  return (
    <Modal visible={isVisible} animationType="none" transparent={true} onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[styles.container, { transform: [{ translateY: modalTranslateY }] }]}>
        <LinearGradient
          colors={[COLORS.background, COLORS.card]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <SafeAreaView style={styles.header}>
          <View style={styles.ratioList}>
            {ASPECT_RATIOS(language).map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.ratioBtn, currentRatio === item.value && styles.ratioBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCurrentRatio(item.value);
                }}
              >
                <MaterialIcons name={item.icon} size={16} color={currentRatio === item.value ? COLORS.textOnAccent : COLORS.textPrimary} />
                <Text style={[styles.ratioText, currentRatio === item.value && styles.ratioTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.resetBtn} onPress={resetEditor}>
            <Text style={styles.resetText}>{t('cropper_reset', language)}</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* --- MAIN WORKSPACE --- */}
        <View style={styles.workspaceContainer}>

          {/* INSTRUCTION TEXT */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>{t('cropper_instruction', language)}</Text>
          </View>

          {/* LAYER 1: IMAGE (Background) */}
          <View style={styles.imageLayer} {...imagePanResponder.panHandlers}>
            {displayUri && viewSize.width > 0 && (
              <Animated.Image
                source={{ uri: displayUri }}
                style={{
                  width: viewSize.width,
                  height: viewSize.height,
                  transform: [
                    { translateX: panAnim.x },
                    { translateY: panAnim.y },
                    { scale: scaleAnim },
                    { scaleX: isFlippedH ? -1 : 1 },
                    { scaleY: isFlippedV ? -1 : 1 }
                  ]
                }}
                resizeMode="contain"
              />
            )}
          </View>

          {/* LAYER 2: DIMMED OVERLAY BLOCKS */}
          <View style={styles.overlayLayer} pointerEvents="none">
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: maskRect.y, backgroundColor: COLORS.background + 'D9' }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: maskRect.y + maskRect.height, backgroundColor: COLORS.background + 'D9' }} />
            <View style={{ position: 'absolute', top: maskRect.y, left: 0, width: maskRect.x, height: maskRect.height, backgroundColor: COLORS.background + 'D9' }} />
            <View style={{ position: 'absolute', top: maskRect.y, right: 0, width: SCREEN_WIDTH - maskRect.x - maskRect.width, height: maskRect.height, backgroundColor: COLORS.background + 'D9' }} />
          </View>

          {/* LAYER 3: INTERACTIVE HANDLES */}
          <View style={styles.interactionLayer} pointerEvents="box-none">
            <View
              style={[
                styles.maskWindow,
                { left: maskRect.x, top: maskRect.y, width: maskRect.width, height: maskRect.height }
              ]}
              pointerEvents="none"
            >
              <View style={styles.gridV} />
              <View style={styles.gridH} />

              <View style={[styles.cornerVis, { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0 }]} />
              <View style={[styles.cornerVis, { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0 }]} />
              <View style={[styles.cornerVis, { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0 }]} />
              <View style={[styles.cornerVis, { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0 }]} />
            </View>

            {currentRatio === null && (
              <>
                <View {...tlResponder.panHandlers} style={[styles.handleHitBox, { left: maskRect.x - 25, top: maskRect.y - 25 }]} />
                <View {...trResponder.panHandlers} style={[styles.handleHitBox, { left: maskRect.x + maskRect.width - 25, top: maskRect.y - 25 }]} />
                <View {...blResponder.panHandlers} style={[styles.handleHitBox, { left: maskRect.x - 25, top: maskRect.y + maskRect.height - 25 }]} />
                <View {...brResponder.panHandlers} style={[styles.handleHitBox, { left: maskRect.x + maskRect.width - 25, top: maskRect.y + maskRect.height - 25 }]} />
              </>
            )}
          </View>

          {isProcessing && (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={COLORS.accentGreen} />
            </View>
          )}
        </View>

        {/* --- Footer --- */}
        <View style={styles.footer}>
          <View style={styles.sliderRow}>
            <Ionicons name="remove" size={20} color={COLORS.textDim} />
            <Slider
              style={{ flex: 1, marginHorizontal: 15 }}
              minimumValue={1}
              maximumValue={4}
              value={scale}
              minimumTrackTintColor={COLORS.accentGreen}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.textPrimary}
              onValueChange={(val) => { setScale(val); scaleAnim.setValue(val); }}
            />
            <Ionicons name="add" size={24} color={COLORS.textDim} />
          </View>

          <View style={styles.toolBar}>
            <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
              <Ionicons name="close" size={28} color={COLORS.danger} />
            </TouchableOpacity>

            <View style={styles.editTools}>
              <TouchableOpacity onPress={() => handleFlip('H')} style={styles.toolBtn}>
                <MaterialCommunityIcons name="flip-horizontal" size={24} color={isFlippedH ? COLORS.accentGreen : COLORS.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleFlip('V')} style={styles.toolBtn}>
                <MaterialCommunityIcons name="flip-vertical" size={24} color={isFlippedV ? COLORS.accentGreen : COLORS.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRotate90} style={styles.toolBtn}>
                <MaterialIcons name="rotate-right" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={performCrop} style={styles.mainBtn}>
              <Ionicons name="checkmark" size={32} color={COLORS.textOnAccent} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: HEADER_HEIGHT + (Platform.OS === 'android' ? 20 : 0),
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, zIndex: 20
  },
  ratioList: { flexDirection: 'row', gap: 8 },
  ratioBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 20, borderWidth: 0.5, borderColor: COLORS.border, backgroundColor: COLORS.card },
  ratioBtnActive: { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen },
  ratioText: { color: COLORS.textPrimary, fontSize: 11, marginLeft: 4, fontFamily: 'Tajawal-Bold' },
  ratioTextActive: { color: COLORS.textOnAccent },
  resetBtn: { padding: 5 },
  resetText: { color: COLORS.textDim, fontSize: 12, fontFamily: 'Tajawal-Bold', textTransform: 'uppercase' },

  // --- LAYOUT ---
  workspaceContainer: {
    width: SCREEN_WIDTH,
    height: WORKSPACE_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  instructionContainer: {
    position: 'absolute', top: 20, zIndex: 50,
    backgroundColor: COLORS.card + 'D9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 0.5, borderColor: COLORS.border
  },
  instructionText: {
    color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold', fontSize: 14
  },

  imageLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  overlayLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  interactionLayer: { ...StyleSheet.absoluteFillObject, zIndex: 3 },

  maskWindow: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  handleHitBox: {
    position: 'absolute',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cornerVis: {
    width: 20,
    height: 20,
    borderColor: COLORS.accentGreen,
    borderWidth: 3,
    position: 'absolute'
  },

  gridV: { position: 'absolute', top: 0, bottom: 0, left: '33.33%', width: '33.33%', borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  gridH: { position: 'absolute', left: 0, right: 0, top: '33.33%', height: '33.33%', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.background + 'B3', justifyContent: 'center', alignItems: 'center', zIndex: 99 },

  footer: {
    height: FOOTER_HEIGHT,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  toolBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editTools: { flexDirection: 'row', gap: 15 },
  toolBtn: { padding: 10, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 0.5, borderColor: COLORS.border },
  iconBtn: { padding: 12, backgroundColor: COLORS.card, borderRadius: 30, borderWidth: 0.5, borderColor: COLORS.border },
  mainBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.accentGreen,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.accentGreen, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5
  }
});

export default ImageCropperModal;