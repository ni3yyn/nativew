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
  Image as RNImage
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- CONFIGURATION ---
const FOOTER_HEIGHT = 180; // Space reserved for controls
const WORKSPACE_HEIGHT = SCREEN_HEIGHT - FOOTER_HEIGHT; // Available space for image

const MASK_WIDTH = SCREEN_WIDTH * 0.85; 
const MASK_HEIGHT = WORKSPACE_HEIGHT * 0.6; // Adjusted to fit in workspace
const MASK_X = (SCREEN_WIDTH - MASK_WIDTH) / 2;
const MASK_Y = (WORKSPACE_HEIGHT - MASK_HEIGHT) / 2;

const COLORS = {
  background: '#000000',
  overlay: 'rgba(0, 0, 0, 0.75)',
  accent: '#10B981', 
  text: '#FFFFFF',
  textDim: 'rgba(255, 255, 255, 0.6)',
  danger: '#EF4444'
};

const ImageCropperModal = ({ isVisible, imageUri, onClose, onCropComplete }) => {
  // State
  const [displayUri, setDisplayUri] = useState(null);
  const [imageLayout, setImageLayout] = useState(null); 
  const [viewSize, setViewSize] = useState(null); 
  const [scale, setScale] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const panAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // 1. Initialization
  useEffect(() => {
    let isMounted = true;

    if (imageUri && isVisible) {
      // Reset logic
      setDisplayUri(imageUri);
      setScale(1);
      scaleAnim.setValue(1);
      panAnim.setValue({ x: 0, y: 0 });
      panAnim.setOffset({ x: 0, y: 0 });

      // Get Size
      RNImage.getSize(imageUri, (w, h) => {
        if (!isMounted) return;
        calculateLayout(w, h);
      }, (err) => {
          console.error("Failed to load image size", err);
      });
    }

    return () => { isMounted = false; };
  }, [imageUri, isVisible]);

  // Helper to calculate how the image fits in the workspace
  const calculateLayout = (w, h) => {
    setImageLayout({ width: w, height: h });
    
    // Fit "Contain" logic within workspace dimensions
    const scaleFactor = Math.min(SCREEN_WIDTH / w, WORKSPACE_HEIGHT / h);
    
    setViewSize({ 
      width: w * scaleFactor, 
      height: h * scaleFactor 
    });
  };

  // 2. Pan Responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Sync offset to current value to prevent jumping
        panAnim.setOffset({
          x: panAnim.x._value,
          y: panAnim.y._value,
        });
        panAnim.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: panAnim.x, dy: panAnim.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        panAnim.flattenOffset(); // Merge offset into value
      },
    })
  ).current;

  // 3. Zoom Handler
  const handleZoom = (val) => {
    const newScale = 1 + val * 2; // 1x to 3x
    setScale(newScale);
    scaleAnim.setValue(newScale);
  };

  // 4. Physical Rotation (Production Ready: Safer than visual rotation)
  const handleRotate = async () => {
    if (isProcessing || !displayUri) return;
    
    Haptics.selectionAsync();
    setIsProcessing(true);

    try {
        const result = await ImageManipulator.manipulateAsync(
            displayUri,
            [{ rotate: 90 }],
            { format: ImageManipulator.SaveFormat.JPEG }
        );

        setDisplayUri(result.uri);
        
        // Reset Transforms on Rotate
        panAnim.setValue({ x: 0, y: 0 });
        panAnim.setOffset({ x: 0, y: 0 });
        // Recalculate layout for new dimensions (width becomes height)
        calculateLayout(imageLayout.height, imageLayout.width); 
        
    } catch (e) {
        console.error("Rotation failed", e);
    } finally {
        setIsProcessing(false);
    }
  };

  // 5. Crop Execution
  const performCrop = async () => {
    if (!imageLayout || !viewSize || isProcessing) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsProcessing(true);

    try {
        // --- MATH: Calculate visual position relative to mask ---

        // 1. Center of the View (Workspace center)
        const centerX = SCREEN_WIDTH / 2;
        const centerY = WORKSPACE_HEIGHT / 2;

        // 2. Current Visual Position of the Image Top-Left (including Pan & Zoom center offset)
        // Note: scale grows from center. 
        const currentPanX = panAnim.x._value;
        const currentPanY = panAnim.y._value;

        // The visual top-left of the image relative to the screen 0,0
        // (Center of Workspace) + (Pan) - (Half Scaled Width)
        const visualImageX = centerX + currentPanX - (viewSize.width * scale) / 2;
        const visualImageY = centerY + currentPanY - (viewSize.height * scale) / 2;

        // 3. Distance from Image Top-Left to Mask Top-Left
        const deltaX = MASK_X - visualImageX;
        const deltaY = MASK_Y - visualImageY;

        // 4. Convert to Source Coordinates
        // Ratio: Source Pixels per Visual Pixel (at 1x scale)
        const ratio = imageLayout.width / viewSize.width;

        let cropX = (deltaX / scale) * ratio;
        let cropY = (deltaY / scale) * ratio;
        let cropW = (MASK_WIDTH / scale) * ratio;
        let cropH = (MASK_HEIGHT / scale) * ratio;

        // 5. Boundary Safeguards
        cropX = Math.max(0, cropX);
        cropY = Math.max(0, cropY);
        if (cropX + cropW > imageLayout.width) cropW = imageLayout.width - cropX;
        if (cropY + cropH > imageLayout.height) cropH = imageLayout.height - cropY;

        // 6. Execute Crop
        const cropResult = await ImageManipulator.manipulateAsync(
            displayUri,
            [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }],
            { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
        );

        onCropComplete(cropResult);

    } catch (error) {
        console.error("Crop error:", error);
        alert("حدث خطأ أثناء القص. حاول مرة أخرى.");
        setIsProcessing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <View style={styles.container}>
        
        {/* --- Workspace --- */}
        <View style={styles.workspace} {...panResponder.panHandlers}>
            {displayUri && viewSize && (
                <Animated.Image
                    source={{ uri: displayUri }}
                    style={{
                        width: viewSize.width,
                        height: viewSize.height,
                        transform: [
                            { translateX: panAnim.x },
                            { translateY: panAnim.y },
                            { scale: scaleAnim }
                        ]
                    }}
                    resizeMode="contain"
                />
            )}

            {/* --- Overlay (Mask) --- */}
            <View style={styles.overlayContainer} pointerEvents="none">
                 {/* This overlay construction ensures clicks pass through the hole if needed, 
                     but since we pan the whole container, simple blocks work fine */}
                
                <View style={[styles.blackBlock, { height: MASK_Y, width: '100%' }]} /> 
                
                <View style={{ flexDirection: 'row', height: MASK_HEIGHT }}>
                    <View style={[styles.blackBlock, { width: MASK_X }]} />
                    
                    {/* The Clear Window */}
                    <View style={styles.maskWindow}>
                         <View style={[styles.bracket, styles.tl]} />
                         <View style={[styles.bracket, styles.tr]} />
                         <View style={[styles.bracket, styles.bl]} />
                         <View style={[styles.bracket, styles.br]} />
                         <View style={styles.gridVertical} />
                         <View style={styles.gridHorizontal} />
                    </View>
                    
                    <View style={[styles.blackBlock, { width: MASK_X }]} />
                </View>

                <View style={[styles.blackBlock, { flex: 1, width: '100%' }]} />
            </View>

            {isProcessing && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                    <Text style={{color: 'white', marginTop: 10}}>جاري المعالجة...</Text>
                </View>
            )}
        </View>

        {/* --- Footer Controls --- */}
        <View style={styles.footer}>
            <Text style={styles.instructionText}>حرك الصورة لتكون المكونات داخل الإطار</Text>

            <View style={styles.sliderContainer}>
                <Ionicons name="remove-circle-outline" size={20} color={COLORS.textDim} />
                <Slider
                    style={{ flex: 1, marginHorizontal: 10 }}
                    minimumValue={0}
                    maximumValue={1}
                    minimumTrackTintColor={COLORS.accent}
                    maximumTrackTintColor={COLORS.textDim}
                    thumbTintColor={COLORS.text}
                    onValueChange={handleZoom}
                />
                <Ionicons name="add-circle-outline" size={20} color={COLORS.textDim} />
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity onPress={onClose} style={styles.secondaryBtn}>
                    <Ionicons name="close" size={24} color={COLORS.danger} />
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={performCrop} 
                    style={styles.primaryBtn} 
                    activeOpacity={0.8}
                    disabled={isProcessing}
                >
                    <Ionicons name="checkmark" size={32} color="#000" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleRotate} style={styles.secondaryBtn} disabled={isProcessing}>
                    <MaterialIcons name="rotate-right" size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>
        </View>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  workspace: {
    width: SCREEN_WIDTH,
    height: WORKSPACE_HEIGHT, // Explicit height
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  blackBlock: {
      backgroundColor: COLORS.overlay,
  },
  maskWindow: {
    width: MASK_WIDTH,
    height: MASK_HEIGHT,
    borderColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    position: 'relative',
  },
  bracket: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: COLORS.accent,
    borderWidth: 3,
  },
  tl: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0 },
  tr: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0 },
  bl: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0 },
  br: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0 },
  gridVertical: {
    position: 'absolute', top: 0, bottom: 0, left: '33.33%', width: 1, backgroundColor: 'rgba(255,255,255,0.1)'
  },
  gridHorizontal: {
    position: 'absolute', left: 0, right: 0, top: '33.33%', height: 1, backgroundColor: 'rgba(255,255,255,0.1)'
  },
  loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 20,
  },
  footer: {
    height: FOOTER_HEIGHT,
    backgroundColor: '#111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 50,
  },
  instructionText: {
    color: COLORS.textDim,
    fontSize: 14,
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  primaryBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ImageCropperModal;