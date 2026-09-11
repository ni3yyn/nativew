// PremiumShareButton.js (ShareComponent.js)

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Pressable, ActivityIndicator, 
  Modal, Animated, Platform, TextInput, ScrollView, Dimensions, 
  Image, PanResponder, BackHandler, Easing
} from 'react-native';
import ViewShot from "react-native-view-shot";
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialIcons, MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import AppTextInput from '../common/AppTextInput';
import { useTheme } from '../../context/ThemeContext';

// --- REGISTRY IMPORT ---
import { TEMPLATE_REGISTRY as ORIGINAL_REGISTRY } from './templates';

// --- 📐 CONSTANTS ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TEMPLATE_WIDTH = 600;
const TEMPLATE_HEIGHT = 1066; 
const PREVIEW_HEIGHT = SCREEN_HEIGHT * 0.40; // Slightly smaller to fit everything nicely
const PREVIEW_WIDTH = PREVIEW_HEIGHT * (TEMPLATE_WIDTH / TEMPLATE_HEIGHT);
const SCALE_FACTOR = PREVIEW_WIDTH / TEMPLATE_WIDTH;

// --- 🎯 REGISTRY ---
const EXTENDED_REGISTRY = [
    { ...ORIGINAL_REGISTRY[0], id: '01', layout: { maskW: 230, maskH: 330, imgSize: 600, radius: 115, border: 1.5, type: 'solid' } },
    { ...ORIGINAL_REGISTRY[1], id: '02', layout: { maskW: 500, maskH: 500, imgSize: 600, radius: 40, border: 1, type: 'solid' } },
    { ...ORIGINAL_REGISTRY[2], id: '03', layout: { maskW: 420, maskH: 420, imgSize: 600, radius: 210, border: 3, type: 'dashed' } },
    { ...ORIGINAL_REGISTRY[3], id: '04', layout: { maskW: 300, maskH: 280, imgSize: 600, radius: 35, border: 1, type: 'solid' } },
    { ...ORIGINAL_REGISTRY[4], id: '05', layout: { maskW: 300, maskH: 320, imgSize: 600, radius: 45, border: 2, type: 'solid' } },
    { ...ORIGINAL_REGISTRY[5], id: '06', layout: { maskW: 510, maskH: 380, imgSize: 600, radius: 50, border: 1, type: 'solid' } },
];

// NOTE: These internal themes dictate how the EXPORTED image looks. 
// They intentionally do not use the app theme so the output remains consistent.
const THEMES = {
    green: { id: 'green', primary: '#142B24', accent: '#D4AF37', text: '#E8F5E9', gradient: ['#1F3A33', '#142B24', '#08120F'], glass: 'rgba(255,255,255,0.05)', border: 'rgba(212, 175, 55, 0.3)', btn: ['#D4AF37', '#B8860B'], isDark: true },
    pink: { id: 'pink', primary: '#FFF0F5', accent: '#D81B60', text: '#880E4F', gradient: ['#FFF0F5', '#FCE4EC', '#F8BBD0'], glass: 'rgba(255, 255, 255, 0.7)', border: 'rgba(216, 27, 96, 0.2)', btn: ['#F06292', '#D81B60'], isDark: false },
    blue: { id: 'blue', primary: '#E1F5FE', accent: '#0277BD', text: '#01579B', gradient: ['#E1F5FE', '#B3E5FC', '#81D4FA'], glass: 'rgba(255, 255, 255, 0.7)', border: 'rgba(2, 119, 189, 0.2)', btn: ['#29B6F6', '#0277BD'], isDark: false },
    purple: { id: 'purple', primary: '#F3E5F5', accent: '#8E24AA', text: '#4A148C', gradient: ['#F3E5F5', '#E1BEE7', '#CE93D8'], glass: 'rgba(255, 255, 255, 0.7)', border: 'rgba(142, 36, 170, 0.2)', btn: ['#AB47BC', '#8E24AA'], isDark: false },
    white: { id: 'white', primary: '#FFFFFF', accent: '#1A2D27', text: '#1A2D27', gradient: ['#FFFFFF', '#F5F5F5', '#E0E0E0'], glass: 'rgba(255, 255, 255, 0.8)', border: 'rgba(26, 45, 39, 0.1)', btn: ['#1A2D27', '#2F4F4F'], isDark: false }
};

// 🌟 NORMALIZE ANALYSIS DATA FOR TEMPLATE COMPATIBILITY
const normalizeAnalysisForShare = (analysis, product) => {
    if (!analysis) return { oilGuardScore: product?.score || 0, marketing_results: [], user_specific_alerts: [] };

    const rawClaims = analysis.marketing_results || 
                      analysis.evaluated_claims || 
                      analysis.claims_evaluated || 
                      [];

    const normalizedClaims = rawClaims.map(item => {
        const claimText = typeof item === 'object' ? (item.claim || item.label || item.name || '') : String(item);
        const statusStr = typeof item === 'object' ? String(item.status || item.verdict || '').toLowerCase() : '';

        const isVerified = statusStr.includes('محقق') || 
                           statusStr.includes('✅') || 
                           statusStr.includes('verified') || 
                           statusStr.includes('approved') || 
                           statusStr.includes('ممتاز');

        const isCaution = statusStr.includes('مختلط') || 
                          statusStr.includes('دون الفعال') || 
                          statusStr.includes('منخفض') || 
                          statusStr.includes('جزئي') || 
                          statusStr.includes('حذر') || 
                          statusStr.includes('⚠️') || 
                          statusStr.includes('⚖️');

        const isRejected = statusStr.includes('وهمي') || 
                           statusStr.includes('مبالغة') || 
                           statusStr.includes('تناقض') || 
                           statusStr.includes('مضلل') || 
                           statusStr.includes('فارغ') || 
                           statusStr.includes('لا توجد') || 
                           statusStr.includes('❌') || 
                           statusStr.includes('🚫');

        const finalVerified = isVerified && !isRejected;

        return {
            ...item,
            claim: claimText,
            name: claimText,
            title: claimText,
            status: statusStr || (finalVerified ? '✅ مؤكد' : '❌ غير متوافق'),
            isVerified: finalVerified,
            isValid: finalVerified,
            verified: finalVerified,
            isCaution,
            isRejected,
            displayStatus: isRejected ? '❌ غير متوافق' : (isCaution ? '⚠️ غير مؤكد' : '✅ مؤكد')
        };
    });

    return {
        ...analysis,
        oilGuardScore: analysis.oilGuardScore || product?.score || 0,
        finalVerdict: analysis.finalVerdict || analysis.verdict || 'تم التقييم بنجاح',
        marketing_results: normalizedClaims,
        evaluated_claims: normalizedClaims,
        claims_evaluated: normalizedClaims
    };
};

const PremiumShareButton = ({ 
    product,        // FOR PROFILE (Shelf Object)
    analysis,       // FOR OILGUARD FALLBACK
    productName: manualName, 
    imageUri: manualImage, 
    typeLabel, 
    customStyle, 
    iconSize = 18, 
    textColor 
}) => {
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme(); 
    const styles = useMemo(() => createStyles(COLORS), [COLORS]); 
    
    // Default text color if none provided matches the active theme
    const finalTextColor = textColor || COLORS.textPrimary;

    const viewShotRef = useRef();

    // 🌟 SMART DATA EXTRACTION & CLAIM NORMALIZATION
    const finalAnalysis = useMemo(() => {
        const raw = product?.analysisData || analysis;
        return normalizeAnalysisForShare(raw, product);
    }, [product, analysis]);

    const initialName = product?.productName || product?.name || manualName || '';
    const initialImage = product?.productImage || product?.imageUrl || product?.image || manualImage || null;

    const [modalVisible, setModalVisible] = useState(false);
    const [editorVisible, setEditorVisible] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('01');
    const [productName, setProductName] = useState(initialName);
    const [activeTheme, setActiveTheme] = useState('green');
    const [userImage, setUserImage] = useState(initialImage);
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasAttemptedShare, setHasAttemptedShare] = useState(false);
    const [imgPos, setImgPos] = useState({ x: 0, y: 0, scale: 1 });

    const pan = useRef(new Animated.ValueXY({x: 0, y: 0})).current;
    const scale = useRef(new Animated.Value(1)).current;
    const internalState = useRef({ x: 0, y: 0, scale: 1, lastDist: null });
    const pulseAnim = useRef(new Animated.Value(0)).current;
    
    // 🌟 EXACT 1:1 PIXEL TRACKING FOR DRAG-TO-CLOSE
    const sheetPanY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    // Validation
    const isNameValid = productName.trim().length > 0;
    const isImageValid = userImage !== null;
    const canShare = isNameValid && isImageValid;

    // Sync state for OilGuard typing flow
    useEffect(() => {
        if (!product) {
            setProductName(manualName || '');
            setUserImage(manualImage || null);
        }
    }, [manualName, manualImage, product]);

    // 🌟 MODAL PHYSICS (Entrance)
    useEffect(() => {
        let animation;
        if (modalVisible) {
            Animated.spring(sheetPanY, { 
                toValue: 0, 
                friction: 9, 
                tension: 50, 
                useNativeDriver: true 
            }).start();

            pulseAnim.setValue(0);
            animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
                ])
            );
            animation.start();
        }
        return () => animation?.stop();
    }, [modalVisible, pulseAnim, sheetPanY]);

    const closeSheet = () => {
        Animated.timing(sheetPanY, { 
            toValue: SCREEN_HEIGHT, 
            duration: 250, 
            easing: Easing.in(Easing.ease), 
            useNativeDriver: true 
        }).start(({ finished }) => {
            if (finished) setModalVisible(false);
        });
    };

    // 🌟 TOP NOTCH DRAG-TO-CLOSE GESTURE (1:1 Tracking)
    const panResponderSheet = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    sheetPanY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > SCREEN_HEIGHT * 0.2 || gestureState.vy > 0.8) {
                    closeSheet();
                } else {
                    Animated.spring(sheetPanY, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    const activeTemplateConfig = EXTENDED_REGISTRY.find(t => t.id === selectedTemplateId) || EXTENDED_REGISTRY[0];
    const CurrentTemplate = activeTemplateConfig.component;
    const currentThemeData = THEMES[activeTheme];
    const layout = activeTemplateConfig.layout;

    const k = useMemo(() => {
        const widthRatio = (SCREEN_WIDTH - 80) / layout.maskW;
        const heightRatio = (SCREEN_HEIGHT * 0.55) / layout.maskH; 
        return Math.min(widthRatio, heightRatio, 1.2); 
    }, [layout]);

    useEffect(() => {
        const backAction = () => {
            if (editorVisible) { setEditorVisible(false); return true; }
            if (modalVisible) { closeSheet(); return true; }
            return false;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [editorVisible, modalVisible]);

    // PAN RESPONDER FOR IMAGE CROPPER
    const panResponderCropper = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({ x: internalState.current.x * k, y: internalState.current.y * k });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: (evt, gestureState) => {
                if (evt.nativeEvent.touches.length === 2) {
                    const t = evt.nativeEvent.touches;
                    const dist = Math.sqrt(Math.pow(t[0].pageX - t[1].pageX, 2) + Math.pow(t[0].pageY - t[1].pageY, 2));
                    if (!internalState.current.lastDist) { internalState.current.lastDist = dist; } 
                    else {
                        const delta = (dist - internalState.current.lastDist) * 0.005;
                        const newScale = Math.max(0.3, Math.min(5, internalState.current.scale + delta));
                        internalState.current.scale = newScale;
                        scale.setValue(newScale);
                        internalState.current.lastDist = dist;
                    }
                } else {
                    pan.x.setValue(gestureState.dx);
                    pan.y.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: () => {
                pan.flattenOffset();
                internalState.current.x = pan.x._value / k;
                internalState.current.y = pan.y._value / k;
                internalState.current.lastDist = null;
            }
        })
    ).current;

    const pickImage = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        if (!res.canceled) {
            setUserImage(res.assets[0].uri);
            internalState.current = { x: 0, y: 0, scale: 1, lastDist: null };
            pan.setValue({x:0, y:0});
            scale.setValue(1);
            setImgPos({x:0, y:0, scale:1});
            setEditorVisible(true);
            Haptics.selectionAsync();
        }
    };

    const removeImage = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setUserImage(null);
        setImgPos({ x: 0, y: 0, scale: 1 });
    };

    const openEditor = () => {
        if (!userImage) return;
        internalState.current = { ...imgPos, lastDist: null };
        pan.setValue({ x: imgPos.x * k, y: imgPos.y * k }); 
        scale.setValue(imgPos.scale);
        setEditorVisible(true);
    };

    const handleShare = async () => {
        setHasAttemptedShare(true);
        if (!canShare) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return; 
        }
        setIsGenerating(true);
        try { 
            await new Promise(r => setTimeout(r, 800)); 
            const uri = await viewShotRef.current.capture(); 
            await Sharing.shareAsync(uri); 
        } catch (e) { console.log(e); } finally { setIsGenerating(false); }
    };

    // Interpolations for Bottom Sheet
    const backdropOpacity = sheetPanY.interpolate({ 
        inputRange: [0, SCREEN_HEIGHT], 
        outputRange: [0.85, 0], 
        extrapolate: 'clamp' 
    });

    return (
        <>
            <Pressable 
                onPress={() => {
                    setModalVisible(true);
                    Haptics.selectionAsync();
                }} 
                style={({ pressed }) => [
                    styles.trig, 
                    customStyle,
                    pressed && { backgroundColor: COLORS.card }
                ]}
            >
                <FontAwesome5 name="share-alt" color={finalTextColor} size={iconSize} />
                <Text style={[styles.trigText, { color: finalTextColor }]}>{t('share_button_label', language)}</Text>
            </Pressable>

            {/* MAIN BOTTOM SHEET */}
            <Modal visible={modalVisible} transparent animationType="none" statusBarTranslucent onRequestClose={closeSheet}>
                <View style={{ flex: 1 }} pointerEvents="box-none">
                    {/* Dark Backdrop */}
                    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
                    </Animated.View>

                    {/* Sheet Container */}
                    <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetPanY }] }]}>
                        {/* Drag Handle Bar */}
                        <View style={styles.sheetHandleBar} {...panResponderSheet.panHandlers}>
                            <View style={styles.sheetHandle} />
                        </View>

                        {/* Smaller Header */}
                        <View style={styles.sheetHead}>
                            <Text style={styles.sheetTitle}>{t('share_modal_title', language)}</Text>
                        </View>

                        {/* Scrollable Content Area */}
                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            
                            {/* Preview Frame */}
                            <View style={[styles.prevFrame, { borderColor: currentThemeData.accent }]}>
                                <View style={styles.scaler}>
                                    <CurrentTemplate analysis={finalAnalysis} typeLabel={typeLabel} productName={productName} imageUri={userImage} theme={currentThemeData} imgPos={imgPos} />
                                </View>
                            </View>

                            {/* 🌟 MOVED THEMES SWATCHES UNDER PREVIEW 🌟 */}
                            <View style={styles.swatches}>
                                {Object.keys(THEMES).map(k => (
                                    <Pressable key={k} onPress={() => { setActiveTheme(k); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.swatch, activeTheme === k && { borderColor: THEMES[k].accent, transform: [{scale:1.1}] }]}>
                                        <LinearGradient colors={THEMES[k].gradient} style={{flex:1, borderRadius:20}} />
                                    </Pressable>
                                ))}
                            </View>

                            {/* Action Row (Add/Remove Image) */}
                            <View style={styles.actionRow}>
                                {!userImage ? (
                                    <Pressable 
                                        onPress={pickImage} 
                                        style={[
                                            styles.actionBtnFull, 
                                            (hasAttemptedShare && !isImageValid) && { borderWidth: 0.5, borderColor: COLORS.danger, backgroundColor: COLORS.danger + '1A' }
                                        ]}
                                    >
                                        <Feather name="image" size={18} color={(hasAttemptedShare && !isImageValid) ? COLORS.danger : currentThemeData.accent} />
                                        <Text style={[styles.actionText, { color: (hasAttemptedShare && !isImageValid) ? COLORS.danger : COLORS.textPrimary }]}>
                                            {(hasAttemptedShare && !isImageValid) ? t('share_error_image', language) : t('share_add_image', language)}
                                        </Text>
                                    </Pressable>
                                ) : (
                                    <>
                                        <Pressable onPress={removeImage} style={[styles.actionBtn, { backgroundColor: COLORS.danger + '1A' }]}>
                                            <FontAwesome5 name="trash" size={14} color={COLORS.danger} />
                                            <Text style={[styles.actionText, { color: COLORS.danger }]}>{t('share_remove_image', language)}</Text>
                                        </Pressable>
                                        <Pressable onPress={openEditor} style={[styles.actionBtn, { flex: 1.5 }]}>
                                            <MaterialIcons name="crop" size={18} color={currentThemeData.accent} />
                                            <Text style={[styles.actionText, { color: COLORS.textPrimary }]}>{t('share_crop_image', language)}</Text>
                                        </Pressable>
                                        <Pressable onPress={pickImage} style={[styles.actionBtn]}>
                                            <Feather name="refresh-cw" size={16} color={COLORS.textPrimary} />
                                            <Text style={[styles.actionText, { color: COLORS.textPrimary }]}>{t('share_change_image', language)}</Text>
                                        </Pressable>
                                    </>
                                )}
                            </View>

                            {/* Templates Row */}
                            <View style={styles.templatesWrapper}>
                                <Animated.View 
                                    style={[
                                        styles.scrollArrow, 
                                        { 
                                            opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                                            transform: [{ translateX: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }]
                                        }
                                    ]}
                                    pointerEvents="none"
                                >
                                    <Ionicons name="chevron-forward-circle" size={24} color={currentThemeData.accent} />
                                </Animated.View>

                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false} 
                                    style={styles.list}
                                    contentContainerStyle={{ paddingLeft: 40 }}
                                >
                                    {EXTENDED_REGISTRY.map(template => (
                                        <Pressable 
                                            key={template.id} 
                                            onPress={() => { setSelectedTemplateId(template.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} 
                                            style={[styles.tempItem, selectedTemplateId === template.id && styles.tempActive]}
                                        >
                                            <View style={[styles.tempIcon, selectedTemplateId === template.id && { backgroundColor: currentThemeData.accent }]}>
                                                <MaterialCommunityIcons 
                                                    name={template.icon} 
                                                    size={24} 
                                                    color={selectedTemplateId === template.id ? currentThemeData.primary : COLORS.textSecondary} 
                                                />
                                            </View>
                                            <Text style={[styles.tempText, { color: selectedTemplateId === template.id ? currentThemeData.accent : COLORS.textSecondary }]}>
                                                {t(`template_${template.id}_name`, language)}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Product Name Input */}
                            <AppTextInput 
                                style={[
                                    styles.input, 
                                    (hasAttemptedShare && !isNameValid) && { borderWidth: 0.5, borderColor: COLORS.danger, color: COLORS.danger }
                                ]} 
                                placeholder={ (hasAttemptedShare && !isNameValid) ? t('share_error_name', language) : t('share_placeholder_name', language)}
                                placeholderTextColor={ (hasAttemptedShare && !isNameValid) ? COLORS.danger : COLORS.textDim} 
                                value={productName} 
                                onChangeText={setProductName} 
                                textAlign="center" 
                            />
                        </ScrollView>

                        {/* 🌟 FIXED CTA BUTTON AT BOTTOM 🌟 */}
                        <View style={styles.fixedFooter}>
                            <Pressable onPress={handleShare} disabled={isGenerating} style={{ width: '100%' }}>
                                <LinearGradient colors={currentThemeData.btn} style={styles.finalBtn}>
                                    {isGenerating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.finalBtnText}>{t('share_final_btn', language)}</Text>}
                                </LinearGradient>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* FULL SCREEN CROPPER EDITOR */}
            <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={() => setEditorVisible(false)}>
                <View style={[styles.edContainer, { backgroundColor: currentThemeData.primary }]}>
                    <LinearGradient colors={currentThemeData.gradient} style={StyleSheet.absoluteFill} />
                    <View style={styles.edHeader}>
                        <Text style={[styles.edTitle, { color: currentThemeData.text }]}>{t('share_editor_title', language)}</Text>
                    </View>

                    <View style={styles.edWork}>
                         <View style={[
                             styles.edCapsuleBase,
                             { 
                                 width: layout.maskW * k, 
                                 height: layout.maskH * k, 
                                 borderRadius: layout.radius * k, 
                                 borderWidth: layout.border,
                                 borderStyle: layout.type,
                                 borderColor: currentThemeData.accent, 
                                 backgroundColor: currentThemeData.glass,
                             }
                         ]} {...panResponderCropper.panHandlers}>
                            <Image source={{ uri: userImage }} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.5 }]} resizeMode="cover" blurRadius={50} />
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
                            <Animated.View style={{ transform: [{translateX: pan.x}, {translateY: pan.y}, {scale: scale}], width: layout.imgSize * k, height: layout.imgSize * k }}>
                                <Image source={{ uri: userImage }} style={{width: '100%', height: '100%'}} resizeMode="contain" />
                            </Animated.View>
                         </View>
                         <Text style={[styles.edHint, { color: currentThemeData.text, opacity: 0.6 }]}>{t('share_editor_hint', language)}</Text>
                        <View style={styles.edSliderContainer}>
                             <Slider 
                                style={{flex: 1, height: 40}} 
                                minimumValue={0.3} 
                                maximumValue={5} 
                                value={internalState.current.scale} 
                                onValueChange={(v) => { scale.setValue(v); internalState.current.scale = v; }} 
                                minimumTrackTintColor={currentThemeData.accent} 
                                thumbTintColor={currentThemeData.accent} 
                            />
                        </View>
                    </View>

                    <View style={styles.edFooter}>
                        <Pressable onPress={() => setEditorVisible(false)} style={[styles.edFooterBtn, { borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1 }]}>
                            <Text style={[styles.edBtnText, { color: currentThemeData.text }]}>{t('action_cancel', language)}</Text>
                        </Pressable>
                        <Pressable onPress={() => { setImgPos({x: internalState.current.x, y: internalState.current.y, scale: internalState.current.scale}); setEditorVisible(false); }} style={[styles.edFooterBtn, { backgroundColor: currentThemeData.accent }]}><Text style={[styles.edBtnText, { color: currentThemeData.primary }]}>{t('share_editor_save', language)}</Text></Pressable>
                    </View>
                </View>
            </Modal>

            {/* Hidden Offscreen ViewShot for Rendering */}
            <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 1.0 }} style={{ position: 'absolute', left: -5000 }}>
                <CurrentTemplate analysis={finalAnalysis} typeLabel={typeLabel} productName={productName} imageUri={userImage} theme={currentThemeData} imgPos={imgPos} />
            </ViewShot>
        </>
    );
};

// --- DYNAMIC STYLES ---
const createStyles = (COLORS) => StyleSheet.create({
    trig: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 15 },
    trigText: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    
    // Bottom Sheet Base
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1 },
    sheet: { 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: SCREEN_HEIGHT * 0.9, 
        backgroundColor: COLORS.background, 
        borderTopLeftRadius: 35, 
        borderTopRightRadius: 35, 
        borderWidth: 0.5, 
        borderColor: COLORS.border, 
        zIndex: 2, 
    },
    sheetHandleBar: { alignItems: 'center', paddingVertical: 10, width: '100%', zIndex: 10 },
    sheetHandle: { width: 44, height: 4.5, borderRadius: 10, backgroundColor: COLORS.border },
    sheetHead: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderColor: COLORS.border + '50', alignItems: 'center' },
    sheetTitle: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold', fontSize: 16 },
    
    // Scroll Area
    scrollContent: { padding: 25, paddingBottom: 20, alignItems: 'center' },
    
    // Fixed CTA Footer
    fixedFooter: {
        padding: 10,
        paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        backgroundColor: COLORS.background,
        
    },

    prevFrame: { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, borderRadius: 20, overflow: 'hidden', backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.border },
    scaler: { width: TEMPLATE_WIDTH, height: TEMPLATE_HEIGHT, transform: [{ scale: SCALE_FACTOR }], transformOrigin: 'top left' },
    
    // Swatches (Moved right below preview)
    swatches: { flexDirection: 'row', gap: 12, marginTop: 15, marginBottom: 5 },
    swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', padding: 2 },
    
    actionRow: { flexDirection: 'row-reverse', width: '100%', gap: 10, marginTop: 10 },
    actionBtnFull: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 8, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.border },
    actionBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 6, backgroundColor: COLORS.card, borderWidth: 0.5, borderColor: COLORS.border },
    actionText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    
    list: { marginVertical: 10, width: '100%' },
    tempItem: { alignItems: 'center', marginRight: 25 },
    tempIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', marginBottom: 5, borderWidth: 0.5, borderColor: COLORS.border },
    tempText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    
    input: { width: '100%', backgroundColor: COLORS.card, color: COLORS.textPrimary, padding: 18, borderRadius: 15, marginBottom: 10, fontFamily: 'Tajawal-Regular', borderWidth: 0.5, borderColor: COLORS.border },
    
    finalBtn: { padding: 18, borderRadius: 15, alignItems: 'center' },
    finalBtnText: { color: '#FFF', fontFamily: 'Tajawal-Bold', fontSize: 16 },
    
    // Editor
    edContainer: { flex: 1 },
    edHeader: { height: 80, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 15 },
    edTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18 },
    edWork: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 50 },
    edCapsuleBase: { overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 10 },
    edHint: { marginTop: 25, fontFamily: 'Tajawal-Regular', fontSize: 12, letterSpacing: 1 },
    edSliderContainer: { width: '80%', marginTop: 30 },
    edFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 30, paddingBottom: 50, gap: 15 },
    edFooterBtn: { flex: 1, padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    edBtnText: { fontFamily: 'Tajawal-Bold', fontSize: 16 },
    templatesWrapper: { width: '100%', position: 'relative', marginVertical: 5 },
    scrollArrow: { position: 'absolute', right: 0, top: '25%', zIndex: 10, backgroundColor: COLORS.card, borderRadius: 20, padding: 2 },
});

export default PremiumShareButton;