import React, { useRef, useState, useMemo, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Pressable, ActivityIndicator, 
  Modal, Animated, Platform, TextInput, ScrollView, Dimensions, 
  Image, PanResponder, BackHandler
} from 'react-native';
import ViewShot from "react-native-view-shot";
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';

// --- REGISTRY IMPORT ---
import { TEMPLATE_REGISTRY as ORIGINAL_REGISTRY } from './templates';

// --- 📐 CONSTANTS ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TEMPLATE_WIDTH = 600;
const TEMPLATE_HEIGHT = 1066; 
const PREVIEW_HEIGHT = SCREEN_HEIGHT * 0.45; 
const PREVIEW_WIDTH = PREVIEW_HEIGHT * (TEMPLATE_WIDTH / TEMPLATE_HEIGHT);
const SCALE_FACTOR = PREVIEW_WIDTH / TEMPLATE_WIDTH;

// --- 🎯 REGISTRY ---
const EXTENDED_REGISTRY = [
    { 
        ...ORIGINAL_REGISTRY[0], 
        id: '01', 
        layout: { maskW: 230, maskH: 330, imgSize: 600, radius: 115, border: 1.5, type: 'solid' } 
    },
    { 
        ...ORIGINAL_REGISTRY[1], 
        id: '02',
        layout: { maskW: 500, maskH: 500, imgSize: 600, radius: 40, border: 1, type: 'solid' } 
    },
    { 
        ...ORIGINAL_REGISTRY[2], 
        id: '03',
        layout: { maskW: 420, maskH: 420, imgSize: 600, radius: 210, border: 3, type: 'dashed' } 
    },
    { 
        ...ORIGINAL_REGISTRY[3], 
        id: '04',
        layout: { maskW: 300, maskH: 280, imgSize: 600, radius: 35, border: 1, type: 'solid' } 
    },
    { 
        ...ORIGINAL_REGISTRY[4], 
        id: '05',
        layout: { maskW: 300, maskH: 320, imgSize: 600, radius: 45, border: 2, type: 'solid' } 
    },
    { 
        ...ORIGINAL_REGISTRY[5], 
        id: '06',
        layout: { maskW: 510, maskH: 380, imgSize: 600, radius: 50, border: 1, type: 'solid' } 
    },
];

const THEMES = {
    green: { id: 'green', primary: '#142B24', accent: '#D4AF37', text: '#E8F5E9', gradient: ['#1F3A33', '#142B24', '#08120F'], glass: 'rgba(255,255,255,0.05)', border: 'rgba(212, 175, 55, 0.3)', btn: ['#D4AF37', '#B8860B'], isDark: true },
    pink: { id: 'pink', primary: '#FFF0F5', accent: '#D81B60', text: '#880E4F', gradient: ['#FFF0F5', '#FCE4EC', '#F8BBD0'], glass: 'rgba(255, 255, 255, 0.7)', border: 'rgba(216, 27, 96, 0.2)', btn: ['#F06292', '#D81B60'], isDark: false },
    blue: { id: 'blue', primary: '#E1F5FE', accent: '#0277BD', text: '#01579B', gradient: ['#E1F5FE', '#B3E5FC', '#81D4FA'], glass: 'rgba(255, 255, 255, 0.7)', border: 'rgba(2, 119, 189, 0.2)', btn: ['#29B6F6', '#0277BD'], isDark: false },
    purple: { id: 'purple', primary: '#F3E5F5', accent: '#8E24AA', text: '#4A148C', gradient: ['#F3E5F5', '#E1BEE7', '#CE93D8'], glass: 'rgba(255, 255, 255, 0.7)', border: 'rgba(142, 36, 170, 0.2)', btn: ['#AB47BC', '#8E24AA'], isDark: false },
    white: { id: 'white', primary: '#FFFFFF', accent: '#1A2D27', text: '#1A2D27', gradient: ['#FFFFFF', '#F5F5F5', '#E0E0E0'], glass: 'rgba(255, 255, 255, 0.8)', border: 'rgba(26, 45, 39, 0.1)', btn: ['#1A2D27', '#2F4F4F'], isDark: false }
};

const PremiumShareButton = ({ analysis, typeLabel, customStyle, iconSize = 18, textColor = '#E8F5E9' }) => {
    const viewShotRef = useRef();
    const [modalVisible, setModalVisible] = useState(false);
    const [editorVisible, setEditorVisible] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('01');
    const [productName, setProductName] = useState('');
    const [activeTheme, setActiveTheme] = useState('green');
    const [userImage, setUserImage] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasAttemptedShare, setHasAttemptedShare] = useState(false);
    const [imgPos, setImgPos] = useState({ x: 0, y: 0, scale: 1 });

    const pan = useRef(new Animated.ValueXY({x: 0, y: 0})).current;
    const scale = useRef(new Animated.Value(1)).current;
    const internalState = useRef({ x: 0, y: 0, scale: 1, lastDist: null });

    const activeTemplateConfig = EXTENDED_REGISTRY.find(t => t.id === selectedTemplateId) || EXTENDED_REGISTRY[0];
    const CurrentTemplate = activeTemplateConfig.component;
    const currentThemeData = THEMES[activeTheme];
    const layout = activeTemplateConfig.layout;

    const isNameValid = productName.trim().length > 0;
    const isImageValid = userImage !== null;
    const canShare = isNameValid && isImageValid;

    // --- 📐 EDITOR MATH 📐 ---
    const EDITOR_PADDING = 40;
    const AVAILABLE_WIDTH = SCREEN_WIDTH - EDITOR_PADDING * 2;
    const k = useMemo(() => {
        const widthRatio = AVAILABLE_WIDTH / layout.maskW;
        const heightRatio = (SCREEN_HEIGHT * 0.55) / layout.maskH; 
        return Math.min(widthRatio, heightRatio, 1.2); 
    }, [layout, AVAILABLE_WIDTH]);

    useEffect(() => {
        const backAction = () => {
            if (editorVisible) { setEditorVisible(false); return true; }
            if (modalVisible) { setModalVisible(false); return true; }
            return false;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [editorVisible, modalVisible]);

    const panResponder = useRef(
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

    return (
        <>
            <Pressable onPress={() => setModalVisible(true)} style={[styles.trig, customStyle]}>
                <FontAwesome5 name="share-alt" color={textColor} size={iconSize} /><Text style={[styles.trigText, { color: textColor }]}>انشري النتيجة</Text>
            </Pressable>

            <Modal visible={modalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.overlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
                    <View style={styles.sheet}>
                        <View style={styles.sheetHead}><Text style={styles.sheetTitle}>تخصيص البطاقة</Text></View>
                        <ScrollView contentContainerStyle={{ padding: 25, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
                            
                            <View style={[styles.prevFrame, { borderColor: currentThemeData.accent }]}>
                                <View style={styles.scaler}>
                                    <CurrentTemplate analysis={analysis} typeLabel={typeLabel} productName={productName} imageUri={userImage} theme={currentThemeData} imgPos={imgPos} />
                                </View>
                            </View>

                            <View style={styles.actionRow}>
                                {!userImage ? (
                                    <Pressable 
                                        onPress={pickImage} 
                                        style={[
                                            styles.actionBtnFull, 
                                            { backgroundColor: '#1A1A1A' },
                                            (hasAttemptedShare && !isImageValid) && { borderWidth: 1, borderColor: '#FF4444', backgroundColor: '#2a1111' }
                                        ]}
                                    >
                                        <Feather name="image" size={18} color={(hasAttemptedShare && !isImageValid) ? "#FF4444" : currentThemeData.accent} />
                                        <Text style={[styles.actionText, { color: (hasAttemptedShare && !isImageValid) ? "#FF4444" : '#FFF' }]}>
                                            {(hasAttemptedShare && !isImageValid) ? "يجب اختيار صورة للمنتج" : "إضافة صورة للمنتج"}
                                        </Text>
                                    </Pressable>
                                ) : (
                                    <>
                                        <Pressable onPress={removeImage} style={[styles.actionBtn, { backgroundColor: '#221010' }]}>
                                            <FontAwesome5 name="trash" size={14} color="#FF4444" />
                                            <Text style={[styles.actionText, { color: '#FF4444' }]}>حذف</Text>
                                        </Pressable>
                                        <Pressable onPress={openEditor} style={[styles.actionBtn, { backgroundColor: '#1A1A1A', flex: 1.5 }]}>
                                            <MaterialIcons name="crop" size={18} color={currentThemeData.accent} />
                                            <Text style={[styles.actionText, { color: '#FFF' }]}>تعديل الأبعاد</Text>
                                        </Pressable>
                                        <Pressable onPress={pickImage} style={[styles.actionBtn, { backgroundColor: '#1A1A1A' }]}>
                                            <Feather name="refresh-cw" size={16} color="#FFF" />
                                            <Text style={[styles.actionText, { color: '#FFF' }]}>تغيير</Text>
                                        </Pressable>
                                    </>
                                )}
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.list}>
                                {EXTENDED_REGISTRY.map(t => (
                                    <Pressable key={t.id} onPress={() => { setSelectedTemplateId(t.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.tempItem, selectedTemplateId === t.id && styles.tempActive]}>
                                        <View style={[styles.tempIcon, selectedTemplateId === t.id && { backgroundColor: currentThemeData.accent }]}>
                                            <FontAwesome5 name={t.icon} size={16} color={selectedTemplateId === t.id ? currentThemeData.primary : '#666'} />
                                        </View>
                                        <Text style={[styles.tempText, { color: selectedTemplateId === t.id ? currentThemeData.accent : '#666' }]}>{t.name}</Text>
                                    </Pressable>
                                ))}
                            </ScrollView>

                            <TextInput 
                                style={[
                                    styles.input, 
                                    (hasAttemptedShare && !isNameValid) && { borderWidth: 1, borderColor: '#FF4444', color: '#FF4444' }
                                ]} 
                                placeholder={ (hasAttemptedShare && !isNameValid) ? "الرجاء كتابة اسم المنتج" : "اسم المنتج..."}
                                placeholderTextColor={ (hasAttemptedShare && !isNameValid) ? "#FF4444" : "#666"} 
                                value={productName} 
                                onChangeText={setProductName} 
                                textAlign="center" 
                            />
                            
                            <View style={styles.swatches}>
                                {Object.keys(THEMES).map(k => (
                                    <Pressable key={k} onPress={() => { setActiveTheme(k); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} style={[styles.swatch, activeTheme === k && { borderColor: THEMES[k].accent, transform: [{scale:1.1}] }]}>
                                        <LinearGradient colors={THEMES[k].gradient} style={{flex:1, borderRadius:20}} />
                                    </Pressable>
                                ))}
                            </View>

                            <Pressable onPress={handleShare} disabled={isGenerating} style={{width:'100%'}}>
                                <LinearGradient colors={currentThemeData.btn} style={styles.finalBtn}>
                                    {isGenerating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.finalBtnText}>مشاركة البطاقة</Text>}
                                </LinearGradient>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={() => setEditorVisible(false)}>
                <View style={[styles.edContainer, { backgroundColor: currentThemeData.primary }]}>
                    <LinearGradient colors={currentThemeData.gradient} style={StyleSheet.absoluteFill} />

                    <View style={styles.edHeader}>
                        <Text style={[styles.edTitle, { color: currentThemeData.text }]}>ضبط الصورة</Text>
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
                         ]} {...panResponder.panHandlers}>
                            
                            {/* --- 1. BACKGROUND FILL (BLURRED) --- */}
                            {/* This fills the empty spaces if the user zooms out */}
                            <Image 
                                source={{ uri: userImage }} 
                                style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', opacity: 0.5 }]} 
                                resizeMode="cover" 
                                blurRadius={50} // Heavy blur effect
                            />
                            {/* Dimming overlay to make foreground pop */}
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />

                            {/* --- 2. FOREGROUND (INTERACTIVE) --- */}
                            <Animated.View style={{ 
                                transform: [{translateX: pan.x}, {translateY: pan.y}, {scale: scale}], 
                                width: layout.imgSize * k, 
                                height: layout.imgSize * k 
                            }}>
                                {/* Changed to CONTAIN so the user can fit the whole image if they want. 
                                    The background fill above handles the empty space. */}
                                <Image source={{ uri: userImage }} style={{width: '100%', height: '100%'}} resizeMode="contain" />
                            </Animated.View>

                         </View>
                         <Text style={[styles.edHint, { color: currentThemeData.text, opacity: 0.6 }]}>اسحبي للتحريك • استخدمي إصبعين للتكبير</Text>
                        
                        <View style={styles.edSliderContainer}>
                             <Slider 
                                style={{flex: 1, height: 40}} 
                                minimumValue={0.3} 
                                maximumValue={5} 
                                value={internalState.current.scale} 
                                onValueChange={(v) => { scale.setValue(v); internalState.current.scale = v; }} 
                                minimumTrackTintColor={currentThemeData.accent} 
                                thumbTintColor={currentThemeData.accent} 
                                maximumTrackTintColor={currentThemeData.glass}
                            />
                        </View>
                    </View>

                    <View style={styles.edFooter}>
                        <Pressable onPress={() => setEditorVisible(false)} style={[styles.edFooterBtn, { borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1 }]}>
                            <Text style={[styles.edBtnText, { color: currentThemeData.text }]}>إلغاء</Text>
                        </Pressable>

                        <Pressable 
                            onPress={() => { 
                                setImgPos({x: internalState.current.x, y: internalState.current.y, scale: internalState.current.scale}); 
                                setEditorVisible(false); 
                            }}
                            style={[styles.edFooterBtn, { backgroundColor: currentThemeData.accent }]}
                        >
                            <Text style={[styles.edBtnText, { color: currentThemeData.primary }]}>حفظ التعديل</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 1.0 }} style={{ position: 'absolute', left: -5000 }}>
                <CurrentTemplate analysis={analysis} typeLabel={typeLabel} productName={productName} imageUri={userImage} theme={currentThemeData} imgPos={imgPos} />
            </ViewShot>
        </>
    );
};

const styles = StyleSheet.create({
    trig: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 15,},
    trigText: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    sheet: { height: SCREEN_HEIGHT * 0.9, backgroundColor: '#0A0A0A', borderTopLeftRadius: 35, borderTopRightRadius: 35 },
    sheetHead: { padding: 20, borderBottomWidth: 1, borderColor: '#1A1A1A', alignItems: 'center' },
    sheetTitle: { color: '#FFF', fontFamily: 'Tajawal-Bold' },
    prevFrame: { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111', borderWidth: 1, borderColor: '#333' },
    scaler: { width: TEMPLATE_WIDTH, height: TEMPLATE_HEIGHT, transform: [{ scale: SCALE_FACTOR }], transformOrigin: 'top left' },
    actionRow: { flexDirection: 'row-reverse', width: '100%', gap: 10, marginTop: 15 },
    actionBtnFull: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 8 },
    actionBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, gap: 6 },
    actionText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    list: { marginVertical: 20, width: '100%' },
    tempItem: { alignItems: 'center', marginRight: 25 },
    tempIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    tempText: { fontFamily: 'Tajawal-Bold', fontSize: 11 },
    swatches: { flexDirection: 'row', gap: 12, marginBottom: 25 },
    swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', padding: 2 },
    input: { width: '100%', backgroundColor: '#161616', color: '#FFF', padding: 18, borderRadius: 15, marginBottom: 20, fontFamily: 'Tajawal-Bold' },
    finalBtn: { padding: 20, borderRadius: 15, alignItems: 'center' },
    finalBtnText: { color: '#FFF', fontFamily: 'Tajawal-Bold', fontSize: 18 },
    edContainer: { flex: 1 },
    edHeader: { height: 80, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 15 },
    edTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18 },
    edWork: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 50 },
    edCapsuleBase: { overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 10 },
    edHint: { marginTop: 25, fontFamily: 'Tajawal-Regular', fontSize: 12, letterSpacing: 1 },
    edSliderContainer: { width: '80%', marginTop: 30 },
    edFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 30, paddingBottom: 50, gap: 15 },
    edFooterBtn: { flex: 1, padding: 18, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    edBtnText: { fontFamily: 'Tajawal-Bold', fontSize: 16 }
});

export default PremiumShareButton;