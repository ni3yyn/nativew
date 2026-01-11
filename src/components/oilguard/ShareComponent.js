import React, { useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, Alert, Pressable, ActivityIndicator, 
  Modal, Animated, Platform, TextInput, ScrollView, Dimensions, Easing
} from 'react-native';
import ViewShot from "react-native-view-shot";
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg';

import { COLORS } from './oilguard.styles';

// --- CONFIGURATION ---
const GOLD_COLOR = '#D4AF37';
const DEEP_BG = '#142B24'; 
const TEMPLATE_WIDTH = 600;
const TEMPLATE_HEIGHT = 1066; // 9:16 Aspect Ratio

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_HEIGHT * 0.45; 
const PREVIEW_WIDTH = PREVIEW_HEIGHT * (TEMPLATE_WIDTH / TEMPLATE_HEIGHT);
const SCALE_FACTOR = PREVIEW_WIDTH / TEMPLATE_WIDTH;

// --- 1. GRAPHICS: Elegant Wathiq Logo ---
const WathiqLogo = () => (
    <Svg height="120" width="300" viewBox="0 0 300 120">
        <Defs>
            <SvgGradient id="lightGoldGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.2" stopColor="#FFFFFF" stopOpacity="1" />
                <Stop offset="1" stopColor="#F0E68C" stopOpacity="1" />
            </SvgGradient>
        </Defs>
        <SvgText
            fill="url(#lightGoldGrad)"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth="0.5"
            fontSize="90"
            fontWeight="bold"
            fontFamily={Platform.OS === 'ios' ? 'Geeza Pro' : 'serif'} 
            x="150" 
            y="85" 
            textAnchor="middle"
        >
            وثيق
        </SvgText>
    </Svg>
);

// --- 2. GRAPHICS: Liquid Background ---
const LiquidBackground = () => (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
            <SvgGradient id="morphGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={COLORS.accentGreen} stopOpacity="0.2" />
                <Stop offset="1" stopColor="#08120F" stopOpacity="0" />
            </SvgGradient>
        </Defs>
        <Path d="M0,0 C200,10 300,150 250,300 C200,450 50,500 0,400 Z" fill="url(#morphGrad)" />
        <Path d={`M${TEMPLATE_WIDTH},${TEMPLATE_HEIGHT} C${TEMPLATE_WIDTH},${TEMPLATE_HEIGHT - 300} ${TEMPLATE_WIDTH - 200},${TEMPLATE_HEIGHT - 400} ${TEMPLATE_WIDTH - 400},${TEMPLATE_HEIGHT - 200} C${TEMPLATE_WIDTH - 500},${TEMPLATE_HEIGHT - 100} ${TEMPLATE_WIDTH - 200},${TEMPLATE_HEIGHT} ${TEMPLATE_WIDTH},${TEMPLATE_HEIGHT} Z`} fill="url(#morphGrad)" />
    </Svg>
);

// --- 3. COMPONENT: Claims Grid ---
const ClaimsGrid = ({ results }) => {
    const displayClaims = (results || []).slice(0, 6);
    if (displayClaims.length === 0) return null;

    const getStatusMeta = (status) => {
        if (status.includes('❌') || status.includes('False')) {
            return { icon: 'times-circle', color: COLORS.danger, bg: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' };
        }
        if (status.includes('✅') || status.includes('🌿') || status.includes('Proven')) {
            return { icon: 'check-circle', color: COLORS.success, bg: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' };
        }
        return { icon: 'exclamation-triangle', color: GOLD_COLOR, bg: 'rgba(212, 175, 55, 0.1)', borderColor: 'rgba(212, 175, 55, 0.3)' };
    };

    return (
        <View style={styles.claimsSection}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>تحليل الادعاءات</Text>
                <View style={styles.sectionLine} />
                <FontAwesome5 name="microscope" size={14} color={COLORS.textSecondary} />
            </View>

            <View style={styles.gridContainer}>
                {displayClaims.map((item, idx) => {
                    const meta = getStatusMeta(item.status);
                    return (
                        <View key={idx} style={[styles.gridItem, { backgroundColor: meta.bg, borderColor: meta.borderColor }]}>
                            <FontAwesome5 name={meta.icon} size={16} color={meta.color} style={{ marginTop: 2 }} />
                            <Text style={[styles.gridText, { color: meta.color === COLORS.danger ? '#ffbaba' : '#e0e0e0' }]} numberOfLines={2}>
                                {item.claim}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

// --- 4. COMPONENT: Score Ring ---
const ScoreRing = ({ score }) => {
    const size = 160;
    const r = (size / 2) - 10;
    const circ = 2 * Math.PI * r;
    const strokeDashoffset = circ - ((score / 100) * circ);
    const color = score >= 80 ? COLORS.success : score >= 50 ? GOLD_COLOR : COLORS.danger;

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
                <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="10" fill="none" strokeDasharray={circ} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 45, color: '#FFF' }}>{score}</Text>
                <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary }}>درجة الأمان</Text>
            </View>
        </View>
    );
};

// --- 5. CONTENT: The Main Card ---
const TemplateContent = ({ analysis, typeLabel, customProductName }) => {
    
    // --- DEFENSIVE PROGRAMMING: Prevent Crashes ---
    // If analysis is missing, or parts of it are missing, use defaults.
    const safeAnalysis = analysis || {};
    const safetyScore = safeAnalysis.safety?.score || 0;
    const efficacyScore = safeAnalysis.efficacy?.score || 0;
    const oilGuardScore = safeAnalysis.oilGuardScore || 0;
    const finalVerdict = safeAnalysis.finalVerdict || "جاري التحليل...";
    const marketingResults = safeAnalysis.marketing_results || [];

    return (
        <View style={styles.templateContainer}>
            <LinearGradient colors={['#1F3A33', '#142B24', '#08120F']} style={StyleSheet.absoluteFill} />
            <LiquidBackground />

            <View style={styles.header}>
                <WathiqLogo />
                <Text style={styles.subHeader}>رفيقك لبشرة و شعر صحيين</Text>
            </View>

            <View style={styles.glassCard}>
                <View style={styles.prodHeader}>
                    <Text style={styles.productType}>{typeLabel}</Text>
                    <Text style={styles.productName} numberOfLines={2} adjustsFontSizeToFit>
                        {customProductName || "اسم المنتج..."}
                    </Text>
                </View>

                <View style={styles.analysisRow}>
                    {/* Use safe variable */}
                    <ScoreRing score={oilGuardScore} />
                    <View style={styles.verdictCol}>
                        <Text style={styles.verdictLabel}>الحكم النهائي</Text>
                        <Text style={styles.verdictVal}>{finalVerdict}</Text>
                        <View style={styles.pillContainer}>
                            <View style={styles.pill}>
                                {/* Use safe variable */}
                                <Text style={styles.pillValue}>{safetyScore}%</Text>
                                <Text style={styles.pillLabel}>أمان</Text>
                            </View>
                            <View style={styles.pill}>
                                {/* Use safe variable */}
                                <Text style={styles.pillValue}>{efficacyScore}%</Text>
                                <Text style={styles.pillLabel}>فعالية</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Use safe variable */}
                <ClaimsGrid results={marketingResults} />
            </View>

            <View style={styles.footer}>
                <Text style={styles.emotionalText}>لا تدعِ الشركات تخدعكِ.</Text>
                <Text style={styles.emotionalSub}>تحققي من منتجاتك عبر وثيق.</Text>
                
                <View style={styles.ctaPill}>
                    <View style={styles.ctaIcon}>
                        <FontAwesome5 name="fingerprint" size={24} color="#FFF" />
                    </View>
                    <View>
                        <Text style={styles.ctaAction}>افحصي منتجاتك مجاناً</Text>
                        <Text style={styles.ctaLink}>wathiq.web.app</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};


// --- WRAPPER ---
const ShareTemplate = React.forwardRef(({ analysis, typeLabel, customProductName }, ref) => {
    return (
        <ViewShot ref={ref} options={{ format: "jpg", quality: 1.0 }} style={{ position: 'absolute', left: -5000, top: 0 }}>
            <TemplateContent analysis={analysis} typeLabel={typeLabel} customProductName={customProductName} />
        </ViewShot>
    );
});

// --- MAIN CONTROLLER (With Bottom Sheet Logic) ---
export const PremiumShareButton = ({ 
    analysis, 
    typeLabel, 
    customStyle = {}, 
    iconSize = 18, 
    textColor = COLORS.textPrimary 
}) => {
    const viewShotRef = useRef();
    const [modalVisible, setModalVisible] = useState(false);
    const [productName, setProductName] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Animation Controller (0 -> 1)
    const animController = useRef(new Animated.Value(0)).current;

    const openModal = () => {
        setProductName(''); 
        setModalVisible(true);
        Animated.spring(animController, {
            toValue: 1,
            damping: 15,
            stiffness: 100,
            useNativeDriver: true,
        }).start();
    };

    const closeModal = () => {
        Animated.timing(animController, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) setModalVisible(false);
        });
    };

    const handleShare = async () => {
        if (!productName.trim()) { 
            Alert.alert("تنبيه", "اسم المنتج ضروري لتوثيق التحليل في الصورة"); 
            return; 
        }
        setIsGenerating(true);
        try {
            await new Promise(r => setTimeout(r, 200));
            if (Platform.OS === 'web') { 
                alert("Preview Mode."); 
            } else {
                const uri = await viewShotRef.current.capture();
                await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Share Analysis', UTI: 'public.jpeg' });
            }
        } catch (e) { 
            console.error(e); 
        } finally { 
            setIsGenerating(false); 
        }
    };

    // Interpolations for Bottom Sheet
    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    return (
        <>
            {/* The Trigger Button - Now adapted for the Command Bar */}
            <Pressable 
                onPress={openModal} 
                style={({ pressed }) => [ 
                    styles.triggerBtn, 
                    customStyle,
                    { opacity: pressed ? 0.7 : 1 } 
                ]}
            >
                <FontAwesome5 name="share-alt" color={textColor} size={iconSize} />
                <Text style={[styles.triggerText, { color: textColor }]}>انشري الوعي</Text>
            </Pressable>

            {/* The Bottom Sheet Modal */}
            <Modal transparent visible={modalVisible} onRequestClose={closeModal} animationType="none" statusBarTranslucent>
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
                </Animated.View>

                <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                    <View style={styles.sheetContent}>
                        {/* Handle */}
                        <View style={styles.sheetHandleBar}>
                            <View style={styles.sheetHandle} />
                        </View>

                        {/* Title Bar */}
                        <View style={styles.modalHeaderRow}>
                            <Pressable onPress={closeModal} style={styles.closeIcon}>
                                <FontAwesome5 name="times" size={18} color={COLORS.textSecondary} />
                            </Pressable>
                            <Text style={styles.modalTitle}>تجهيز البطاقة</Text>
                        </View>

                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                            {/* Input */}
                            <Text style={styles.label}>اسم المنتج:</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="مثال: غسول الوجه..." 
                                placeholderTextColor={COLORS.textSecondary} 
                                value={productName} 
                                onChangeText={setProductName} 
                                textAlign="right" 
                            />

                            {/* Preview */}
                            <View style={styles.previewContainer}>
                                <View style={styles.previewWindow}>
                                    <View style={styles.scaler}>
                                        <TemplateContent 
                                            analysis={analysis} 
                                            typeLabel={typeLabel} 
                                            customProductName={productName || "اسم المنتج..."} 
                                        />
                                    </View>
                                </View>
                            </View>

                            {/* Action Button */}
                            <Pressable onPress={handleShare} style={styles.finalShareBtn} disabled={isGenerating}>
                                <LinearGradient 
                                    colors={productName ? [GOLD_COLOR, '#B8860B'] : [COLORS.card, COLORS.border]} 
                                    style={styles.finalShareGradient}
                                >
                                    {isGenerating ? <ActivityIndicator color="#FFF" /> : (
                                        <>
                                            <Text style={[styles.finalShareText, !productName && {color: COLORS.textSecondary}]}>
                                                {productName ? "نشر الصورة" : "أدخلي الاسم للمتابعة"}
                                            </Text>
                                            {productName && <FontAwesome5 name="share" size={16} color="#FFF" />}
                                        </>
                                    )}
                                </LinearGradient>
                            </Pressable>
                        </ScrollView>
                    </View>
                </Animated.View>
            </Modal>

            {/* Hidden Capture Template */}
            {Platform.OS !== 'web' && (
                <ShareTemplate ref={viewShotRef} analysis={analysis} typeLabel={typeLabel} customProductName={productName} />
            )}
        </>
    );
};

const styles = StyleSheet.create({
    // --- Trigger Button (New minimalist style for Command Bar) ---
    triggerBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        height: '100%',
    },
    triggerText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
    },

    // --- Bottom Sheet Styles (Matching Profile.js) ---
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 99,
    },
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.90, // Tall enough for preview
        zIndex: 100,
        justifyContent: 'flex-end',
    },
    sheetContent: {
        flex: 1,
        backgroundColor: '#101a16', // Dark Card BG
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 25,
    },
    sheetHandleBar: {
        alignItems: 'center',
        paddingVertical: 15,
        width: '100%',
        backgroundColor: '#101a16',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.02)',
    },
    sheetHandle: {
        width: 48,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
    },
    
    // --- Content Inside Sheet ---
    modalHeaderRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 25,
        paddingTop: 10,
        paddingBottom: 15,
    },
    modalTitle: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 18, 
        color: '#FFF' 
    },
    closeIcon: { 
        padding: 5 
    },
    scrollContent: { 
        paddingHorizontal: 25, 
        paddingBottom: 50,
        alignItems: 'center'
    },
    label: { 
        width: '100%', 
        textAlign: 'right', 
        color: COLORS.accentGreen, 
        fontFamily: 'Tajawal-Bold', 
        marginBottom: 10,
        marginTop: 10
    },
    input: { 
        width: '100%', 
        backgroundColor: '#050a08', 
        borderRadius: 12, 
        padding: 15, 
        color: '#FFF', 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 18, 
        borderWidth: 1, 
        borderColor: COLORS.accentGreen, 
        marginBottom: 20 
    },

    // --- Preview Window ---
    previewContainer: { marginBottom: 25, alignItems: 'center', justifyContent: 'center' },
    previewWindow: { width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, backgroundColor: '#000', borderRadius: 15, overflow: 'hidden', borderWidth: 2, borderColor: GOLD_COLOR, alignItems: 'center', justifyContent: 'center' },
    scaler: { width: TEMPLATE_WIDTH, height: TEMPLATE_HEIGHT, transform: [{ scale: SCALE_FACTOR }], transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 },
    
    finalShareBtn: { width: '100%', borderRadius: 15, overflow: 'hidden' },
    finalShareGradient: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    finalShareText: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: '#FFF' },

    // --- TEMPLATE DESIGN ---
    templateContainer: { width: TEMPLATE_WIDTH, height: TEMPLATE_HEIGHT, backgroundColor: DEEP_BG, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 50, paddingHorizontal: 40 },
    header: { width: '100%', alignItems: 'center', marginTop: 30 },
    subHeader: { color: COLORS.accentGreen, fontFamily: 'Tajawal-Regular', fontSize: 20, letterSpacing: 2, marginTop: -25, opacity: 0.9, fontWeight: '600' },
    
    glassCard: { 
        width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 40, padding: 30, alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 40, shadowOffset: {height: 20}
    },
    prodHeader: { width: '100%', alignItems: 'center', marginBottom: 20 },
    productType: { fontFamily: 'Tajawal-Regular', fontSize: 22, color: GOLD_COLOR, marginBottom: 5, letterSpacing: 2 },
    productName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 40, color: '#FFF', textAlign: 'center', lineHeight: 50 },
    
    analysisRow: { flexDirection: 'row-reverse', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    verdictCol: { flex: 1, paddingRight: 20, alignItems: 'flex-end', gap: 10 },
    verdictLabel: { color: COLORS.textSecondary, fontSize: 14, fontFamily: 'Tajawal-Regular' },
    verdictVal: { color: '#FFF', fontSize: 28, fontFamily: 'Tajawal-ExtraBold', textAlign: 'right' },
    
    pillContainer: { flexDirection: 'row-reverse', gap: 10, marginTop: 5 },
    pill: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignItems: 'center' },
    pillValue: { color: '#FFF', fontSize: 16, fontFamily: 'Tajawal-Bold' },
    pillLabel: { color: COLORS.textSecondary, fontSize: 10 },

    claimsSection: { width: '100%', marginTop: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, padding: 15 },
    sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10, gap: 10 },
    sectionTitle: { color: COLORS.textSecondary, fontSize: 14, fontFamily: 'Tajawal-Bold' },
    sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    gridContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
    gridItem: { width: '48%', flexDirection: 'row-reverse', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 8, marginBottom: 0 },
    gridText: { fontSize: 12, fontFamily: 'Tajawal-Bold', flex: 1, textAlign: 'right' },

    footer: { width: '100%', alignItems: 'center', paddingBottom: 20 },
    emotionalText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 32, color: GOLD_COLOR, textAlign: 'center' },
    emotionalSub: { fontFamily: 'Tajawal-Regular', fontSize: 24, color: '#FFF', marginBottom: 20, opacity: 0.9 },
    ctaPill: { flexDirection: 'row-reverse', backgroundColor: '#FFF', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 20, alignItems: 'center', gap: 15, elevation: 10 },
    ctaIcon: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    ctaAction: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: '#000' },
    ctaLink: { fontFamily: 'Tajawal-Regular', fontSize: 18, color: COLORS.accentGreen },
});

export default PremiumShareButton;