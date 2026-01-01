import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, TouchableOpacity, Modal, StyleSheet, Image, 
    ActivityIndicator, Animated, ScrollView, LayoutAnimation, 
    UIManager, Platform 
} from 'react-native';
import { FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { useAppContext } from '../../context/AppContext';
import { reevaluateProductForUser } from '../../services/communityService';
import { getClaimsByProductType } from '../../constants/productData'; 

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ProductActionSheet = ({ product, visible, onClose, onSave }) => {
    const { userProfile } = useAppContext();
    
    const [personalScore, setPersonalScore] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [activeTab, setActiveTab] = useState('original');
    
    // Edit Mode State
    const [isEditingClaims, setIsEditingClaims] = useState(false);
    const [currentClaims, setCurrentClaims] = useState([]);

    useEffect(() => {
        if (visible && product) {
            setPersonalScore(null);
            setActiveTab('original');
            setIsEditingClaims(false);
            setCurrentClaims(product.marketingClaims || []);
            calculatePersonalScore(product.marketingClaims || []);
        }
    }, [visible, product]);

    const calculatePersonalScore = async (claimsToUse) => {
        setIsCalculating(true);
        const tempProduct = { ...product, marketingClaims: claimsToUse };
        const newAnalysis = await reevaluateProductForUser(tempProduct, userProfile);
        
        if (newAnalysis) {
            setPersonalScore(newAnalysis);
            // Auto-switch only if there's a significant difference or danger
            if (newAnalysis.personalMatch?.status === 'danger' || activeTab === 'original') {
                setTimeout(() => setActiveTab('personal'), 500); 
            }
        }
        setIsCalculating(false);
    };

    const toggleClaim = (claim) => {
        const newClaims = currentClaims.includes(claim) 
            ? currentClaims.filter(c => c !== claim) 
            : [...currentClaims, claim];
        setCurrentClaims(newClaims);
    };

    const applyNewClaims = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsEditingClaims(false);
        calculatePersonalScore(currentClaims);
    };

    if (!product || !visible) return null;

    // --- DATA RESOLUTION ---
    const displayData = activeTab === 'personal' && personalScore ? personalScore : product.analysisData;
    const score = displayData?.oilGuardScore || 0;
    const displayImage = product.productImage || product.imageUrl;
    const productType = product.productType || product.analysisData?.product_type || 'other';
    const possibleClaims = getClaimsByProductType(productType);

    // --- SMART VERDICT LOGIC ---
    // Instead of just Score, we look at the Match Status (Danger/Warning/Success)
    const matchStatus = displayData?.personalMatch?.status || 'neutral'; // 'danger', 'warning', 'success', 'neutral'
    
    let verdictColor = COLORS.accentGreen;
    let verdictText = "آمن ومناسب";
    let verdictIcon = "check-circle";

    if (matchStatus === 'danger') {
        verdictColor = COLORS.danger;
        verdictText = "غير مناسب لكِ ❌";
        verdictIcon = "times-circle";
    } else if (matchStatus === 'warning') {
        verdictColor = COLORS.gold;
        verdictText = "استخدميه بحذر ⚠️";
        verdictIcon = "exclamation-triangle";
    } else if (score < 50) {
        // Fallback to score if no specific match status
        verdictColor = COLORS.danger;
        verdictText = "جودة منخفضة";
        verdictIcon = "thumbs-down";
    }

    // --- ALERT RENDERER ---
    const renderAlerts = () => {
        // Combine "reasons" from re-evaluation OR "user_specific_alerts" from original
        const rawAlerts = displayData?.personalMatch?.reasons || displayData?.user_specific_alerts || [];
        
        if (rawAlerts.length === 0) {
            return (
                <View style={[styles.alertBox, { borderColor: COLORS.accentGreen }]}>
                    <Text style={[styles.alertText, { color: COLORS.accentGreen }]}>✅ لا توجد تعارضات مع ملفك الشخصي.</Text>
                </View>
            );
        }

        return rawAlerts.map((alert, index) => {
            // Normalize data structure (handle both string array and object array)
            const text = typeof alert === 'string' ? alert : alert.text;
            const type = typeof alert === 'object' ? alert.type : 'info'; // 'risk', 'good', 'caution'
            
            let color = COLORS.textSecondary;
            let icon = 'info-circle';
            let bg = 'rgba(255,255,255,0.05)';

            if (type === 'risk' || text.includes('تجنب') || text.includes('حساسية')) {
                color = COLORS.danger; icon = 'exclamation-circle'; bg = 'rgba(239, 68, 68, 0.1)';
            } else if (type === 'good' || text.includes('يساعد') || text.includes('ممتاز')) {
                color = COLORS.accentGreen; icon = 'check'; bg = 'rgba(16, 185, 129, 0.1)';
            } else if (type === 'caution') {
                color = COLORS.gold; icon = 'exclamation-triangle'; bg = 'rgba(245, 158, 11, 0.1)';
            }

            return (
                <View key={index} style={[styles.alertBox, { backgroundColor: bg, borderColor: color }]}>
                    <FontAwesome5 name={icon} size={14} color={color} style={{marginTop: 3}} />
                    <Text style={[styles.alertText, { color }]}>{text}</Text>
                </View>
            );
        });
    };

    return (
        <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.sheetBackdrop}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                
                <View style={[styles.sheetContainer, isEditingClaims && {maxHeight: '90%'}]}>
                    <View style={styles.sheetHandle} />
                    
                    {displayImage && !isEditingClaims && (
                        <View style={styles.imageHeader}>
                            <Image source={{ uri: displayImage }} style={styles.sheetMainImage} resizeMode="cover" />
                            {/* Comparison Badge */}
                            {personalScore && activeTab === 'original' && (
                                <View style={styles.comparisonBadge}>
                                    <Text style={styles.compText}>
                                        {personalScore.oilGuardScore > product.analysisData.oilGuardScore ? 'نتيجة أفضل لكِ 🔼' : 
                                         personalScore.oilGuardScore < product.analysisData.oilGuardScore ? 'انتبهي، النتيجة أقل لكِ 🔽' : 'مطابق للنتيجة الأصلية'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.content}>
                        
                        {/* Tabs */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity style={[styles.tab, activeTab === 'original' && styles.activeTab]} onPress={() => setActiveTab('original')}>
                                <Text style={[styles.tabText, activeTab === 'original' && {color: COLORS.textPrimary}]}>التقييم الأصلي</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.tab, activeTab === 'personal' && styles.activeTab]} onPress={() => setActiveTab('personal')}>
                                {isCalculating ? <ActivityIndicator size="small" color={COLORS.accentGreen} /> : <Text style={[styles.tabText, activeTab === 'personal' && {color: COLORS.accentGreen}]}>تقييمي الشخصي ✨</Text>}
                            </TouchableOpacity>
                        </View>

                        {/* Edit Claims Toggle */}
                        <TouchableOpacity style={styles.editClaimsBtn} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsEditingClaims(!isEditingClaims); }}>
                            <Text style={styles.editClaimsText}>{isEditingClaims ? "إغلاق التعديل" : "تعديل بيانات المنتج (لتحسين الدقة)"}</Text>
                            <Feather name={isEditingClaims ? "chevron-up" : "sliders"} size={14} color={COLORS.textSecondary} />
                        </TouchableOpacity>

                        {/* Claims Editor */}
                        {isEditingClaims ? (
                            <View style={styles.claimsEditor}>
                                <Text style={styles.claimsHint}>حددي الخصائص المكتوبة على العبوة:</Text>
                                <ScrollView style={{maxHeight: 200}} nestedScrollEnabled>
                                    <View style={styles.chipsContainer}>
                                        {possibleClaims.map((claim, i) => (
                                            <TouchableOpacity key={i} style={[styles.claimChip, currentClaims.includes(claim) && {backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen}]} onPress={() => toggleClaim(claim)}>
                                                <Text style={[styles.claimText, currentClaims.includes(claim) && {color: '#1A2D27', fontFamily: 'Tajawal-Bold'}]}>{claim}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                                <TouchableOpacity style={styles.applyBtn} onPress={applyNewClaims}><Text style={styles.applyBtnText}>إعادة الحساب</Text></TouchableOpacity>
                            </View>
                        ) : (
                            // Main Results View
                            <ScrollView style={{maxHeight: 250}} showsVerticalScrollIndicator={false}>
                                <View style={styles.sheetHeader}>
                                    <View style={[styles.sheetIconBox, {backgroundColor: verdictColor+'20'}]}>
                                        <FontAwesome5 name={verdictIcon} size={24} color={verdictColor} />
                                    </View>
                                    <View style={{flex: 1, marginRight: 15}}>
                                        <Text style={styles.sheetTitle} numberOfLines={2}>{product.productName || product.name}</Text>
                                        <Text style={[styles.sheetVerdict, {color: verdictColor}]}>{verdictText}</Text>
                                    </View>
                                    <View style={[styles.bigScoreCircle, {borderColor: verdictColor}]}>
                                        <Text style={[styles.bigScoreText, {color: verdictColor}]}>{score}</Text>
                                    </View>
                                </View>
                                
                                {/* Detailed Alerts Section */}
                                <View style={styles.alertsContainer}>
                                    <Text style={styles.sectionHeader}>تفاصيل التحليل:</Text>
                                    {renderAlerts()}
                                </View>
                            </ScrollView>
                        )}

                        <View style={styles.sheetActions}>
                            <TouchableOpacity style={styles.sheetBtnSecondary} onPress={onClose}><Text style={styles.sheetBtnTextSec}>إغلاق</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.sheetBtnPrimary, {backgroundColor: verdictColor}]} onPress={() => onSave({...product, analysisData: displayData, marketingClaims: currentClaims, productImage: displayImage, imageUrl: displayImage })}>
                                <Text style={styles.sheetBtnTextPrim}>حفظ في رفي</Text>
                                <FontAwesome5 name="bookmark" size={14} color={COLORS.textOnAccent} style={{marginLeft: 8}} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    sheetContainer: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: '90%' },
    sheetHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 15, marginBottom: 10 },
    imageHeader: { width: '100%', height: 160, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', marginTop: -29, marginBottom: 0, position: 'relative' },
    sheetMainImage: { width: '100%', height: '100%' },
    comparisonBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    compText: { color: '#FFF', fontFamily: 'Tajawal-Bold', fontSize: 11 },
    
    content: { padding: 25, paddingTop: 15 },
    tabContainer: { flexDirection: 'row-reverse', backgroundColor: COLORS.background, borderRadius: 12, padding: 4, marginBottom: 15 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
    activeTab: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
    tabText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textSecondary },

    sheetHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20 },
    sheetIconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: 15 },
    sheetTitle: { color: COLORS.textPrimary, fontFamily: 'Tajawal-ExtraBold', fontSize: 18, textAlign: 'right' },
    sheetVerdict: { fontFamily: 'Tajawal-Bold', fontSize: 13, textAlign: 'right', marginTop: 4 },
    bigScoreCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
    bigScoreText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16 },

    // Alerts
    alertsContainer: { marginBottom: 20 },
    sectionHeader: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, fontSize: 12, textAlign: 'right', marginBottom: 10 },
    alertBox: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    alertText: { flex: 1, fontFamily: 'Tajawal-Regular', fontSize: 13, textAlign: 'right', lineHeight: 20 },

    // Claims Editor
    editClaimsBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 15 },
    editClaimsText: { color: COLORS.textSecondary, fontFamily: 'Tajawal-Regular', fontSize: 12 },
    claimsEditor: { backgroundColor: COLORS.background, padding: 15, borderRadius: 12, marginBottom: 20 },
    claimsHint: { color: COLORS.textDim, fontSize: 12, fontFamily: 'Tajawal-Regular', marginBottom: 10, textAlign: 'right' },
    chipsContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    claimChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
    claimText: { color: COLORS.textSecondary, fontSize: 12, fontFamily: 'Tajawal-Regular' },
    applyBtn: { backgroundColor: COLORS.accentGreen, padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 15 },
    applyBtnText: { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold', fontSize: 14 },

    sheetActions: { flexDirection: 'row', gap: 15, marginTop: 10 },
    sheetBtnPrimary: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    sheetBtnSecondary: { flex: 0.5, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    sheetBtnTextPrim: { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold' },
    sheetBtnTextSec: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold' },
});

export default ProductActionSheet;