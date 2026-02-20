import React, { useState, useRef, useEffect } from 'react';
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
  SafeAreaView
} from 'react-native';
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

const COLORS = {
  bg: '#000000',
  overlay: 'rgba(0, 0, 0, 0.85)',
  accent: '#10B981',
  text: '#FFFFFF',
  textDim: '#9CA3AF',
  danger: '#EF4444'
};

const ASPECT_RATIOS = [
  { label: 'حر', value: null, icon: 'crop-free' },
  { label: 'الأصلي', value: -1, icon: 'image' },
  { label: '1:1', value: 1, icon: 'crop-square' },
  { label: '16:9', value: 16 / 9, icon: 'crop-16-9' },
];

const ImageCropperModal = ({ isVisible, imageUri, onClose, onCropComplete }) => {
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
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const panAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Ref to store start position during drag
  const dragStartMaskRect = useRef({ x: 0, y: 0, width: 0, height: 0 });

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
    // 1. Calculate how big the image will be on screen
    const scaleFactor = Math.min(SCREEN_WIDTH / w, WORKSPACE_HEIGHT / h);
    const displayedWidth = w * scaleFactor;
    const displayedHeight = h * scaleFactor;

    setViewSize({ width: displayedWidth, height: displayedHeight });

    // 2. Initialize Mask to COVER THE WHOLE IMAGE (Centered)
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
        // CRITICAL FIX: Grab the value from the REF, not the state closure
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

      // FIX 1: Use __getValue() to get the total position (offset + current value)
      // This ensures we get the position even if the animation hasn't settled
      const currentPanX = panAnim.x.__getValue();
      const currentPanY = panAnim.y.__getValue();

      // Calculate where the image is currently drawn on screen
      const visualImageX = centerX + currentPanX - (viewSize.width * scale) / 2;
      const visualImageY = centerY + currentPanY - (viewSize.height * scale) / 2;

      // Calculate the difference between the Crop Box (mask) and the Image Edge
      const deltaX = maskRect.x - visualImageX;
      const deltaY = maskRect.y - visualImageY;

      // Ratio converts "Screen Pixels" to "Image Pixels"
      const ratio = originalSize.width / viewSize.width;

      // FIX 2: ROUNDING
      // ImageManipulator requires integers. Floats cause "out of bounds" errors 
      // which result in the library returning the original image.
      let cropX = Math.round((deltaX / scale) * ratio);
      let cropY = Math.round((deltaY / scale) * ratio);
      let cropW = Math.round((maskRect.width / scale) * ratio);
      let cropH = Math.round((maskRect.height / scale) * ratio);

      // FIX 3: BOUNDARY CLAMPING
      // Ensure we don't accidentally ask for pixels outside the image
      cropX = Math.max(0, cropX);
      cropY = Math.max(0, cropY);

      // If rounding pushed the width over the edge, clamp it
      if (cropX + cropW > originalSize.width) {
        cropW = originalSize.width - cropX;
      }
      if (cropY + cropH > originalSize.height) {
        cropH = originalSize.height - cropY;
      }

      // FIX 4: ACTION ORDER
      // We must Flip BEFORE Cropping. 
      // Since you are calculating coordinates based on what you see (the flipped version),
      // we must make the source image match that visual state before applying the crop rect.
      const actions = [];

      if (isFlippedH) actions.push({ flip: ImageManipulator.FlipType.Horizontal });
      if (isFlippedV) actions.push({ flip: ImageManipulator.FlipType.Vertical });

      // Add crop action last
      actions.push({ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } });

      const result = await ImageManipulator.manipulateAsync(
        displayUri,
        actions,
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.95 }
      );

      onCropComplete(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#111" />

        <SafeAreaView style={styles.header}>
          <View style={styles.ratioList}>
            {ASPECT_RATIOS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.ratioBtn, currentRatio === item.value && styles.ratioBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCurrentRatio(item.value);
                }}
              >
                <MaterialIcons name={item.icon} size={16} color={currentRatio === item.value ? '#000' : '#FFF'} />
                <Text style={[styles.ratioText, currentRatio === item.value && styles.ratioTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.resetBtn} onPress={resetEditor}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* --- MAIN WORKSPACE --- */}
        <View style={styles.workspaceContainer}>

          {/* INSTRUCTION TEXT */}
          <View style={styles.instructionContainer}>
            <Text style={styles.instructionText}>حدد قائمة المكونات فقط</Text>
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
          {/* These blocks cover everything OUTSIDE the maskRect */}
          <View style={styles.overlayLayer} pointerEvents="none">
            {/* Top Block */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: maskRect.y, backgroundColor: COLORS.overlay }} />
            {/* Bottom Block */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: maskRect.y + maskRect.height, backgroundColor: COLORS.overlay }} />
            {/* Left Block */}
            <View style={{ position: 'absolute', top: maskRect.y, left: 0, width: maskRect.x, height: maskRect.height, backgroundColor: COLORS.overlay }} />
            {/* Right Block */}
            <View style={{ position: 'absolute', top: maskRect.y, right: 0, width: SCREEN_WIDTH - maskRect.x - maskRect.width, height: maskRect.height, backgroundColor: COLORS.overlay }} />
          </View>

          {/* LAYER 3: INTERACTIVE HANDLES */}
          <View style={styles.interactionLayer} pointerEvents="box-none">

            {/* The Border of the Crop Box */}
            <View
              style={[
                styles.maskWindow,
                { left: maskRect.x, top: maskRect.y, width: maskRect.width, height: maskRect.height }
              ]}
              pointerEvents="none"
            >
              <View style={styles.gridV} />
              <View style={styles.gridH} />

              {/* Visual Corners (Always visible on the box) */}
              <View style={[styles.cornerVis, { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0 }]} />
              <View style={[styles.cornerVis, { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0 }]} />
              <View style={[styles.cornerVis, { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0 }]} />
              <View style={[styles.cornerVis, { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0 }]} />
            </View>

            {/* The Touchable Handles - Only visible in Free mode */}
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
              <ActivityIndicator size="large" color={COLORS.accent} />
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
              minimumTrackTintColor={COLORS.accent}
              maximumTrackTintColor="#333"
              thumbTintColor={COLORS.text}
              onValueChange={(val) => { setScale(val); scaleAnim.setValue(val); }}
            />
            <Ionicons name="add" size={24} color={COLORS.textDim} />
          </View>

          <View style={styles.toolBar}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="close" size={28} color={COLORS.danger} />
            </TouchableOpacity>

            <View style={styles.editTools}>
              <TouchableOpacity onPress={() => handleFlip('H')} style={styles.toolBtn}>
                <MaterialCommunityIcons name="flip-horizontal" size={24} color={isFlippedH ? COLORS.accent : COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleFlip('V')} style={styles.toolBtn}>
                <MaterialCommunityIcons name="flip-vertical" size={24} color={isFlippedV ? COLORS.accent : COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRotate90} style={styles.toolBtn}>
                <MaterialIcons name="rotate-right" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={performCrop} style={styles.mainBtn}>
              <Ionicons name="checkmark" size={32} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    height: HEADER_HEIGHT + (Platform.OS === 'android' ? 20 : 0),
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, backgroundColor: '#111', zIndex: 20
  },
  ratioList: { flexDirection: 'row', gap: 8 },
  ratioBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  ratioBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  ratioText: { color: COLORS.text, fontSize: 11, marginLeft: 4, fontWeight: '600' },
  ratioTextActive: { color: '#000' },
  resetBtn: { padding: 5 },
  resetText: { color: COLORS.textDim, fontSize: 12, textTransform: 'uppercase' },

  // --- LAYOUT ---
  workspaceContainer: {
    width: SCREEN_WIDTH,
    height: WORKSPACE_HEIGHT,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center'
  },
  instructionContainer: {
    position: 'absolute', top: 20, zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20
  },
  instructionText: {
    color: COLORS.accent, fontWeight: 'bold', fontSize: 16
  },

  imageLayer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  overlayLayer: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  interactionLayer: { ...StyleSheet.absoluteFillObject, zIndex: 3 },

  maskWindow: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  handleHitBox: {
    position: 'absolute',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    // backgroundColor: 'rgba(255,0,0,0.3)' // Uncomment to see touch targets
  },
  cornerVis: {
    width: 20,
    height: 20,
    borderColor: COLORS.accent,
    borderWidth: 3,
    position: 'absolute'
  },

  gridV: { position: 'absolute', top: 0, bottom: 0, left: '33.33%', width: '33.33%', borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  gridH: { position: 'absolute', left: 0, right: 0, top: '33.33%', height: '33.33%', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 99 },

  footer: {
    height: FOOTER_HEIGHT,
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  toolBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editTools: { flexDirection: 'row', gap: 15 },
  toolBtn: { padding: 10, backgroundColor: '#222', borderRadius: 12 },
  iconBtn: { padding: 12, backgroundColor: '#222', borderRadius: 30 },
  mainBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.accent, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5
  }
});

export default ImageCropperModal;