

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

// --- DECORATIVE LAYER ---
// --- DECORATIVE LAYER (Boosted with Floating Icons) ---
const BackgroundDecor = ({ theme }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Large Shapes */}
        <View style={{ position: 'absolute', top: -100, right: -50, width: 400, height: 400, borderRadius: 200, backgroundColor: theme.accent, opacity: 0.15, transform: [{ scaleX: 1.2 }] }} />
        <View style={{ position: 'absolute', bottom: -50, left: -100, width: 350, height: 350, borderRadius: 175, backgroundColor: theme.text, opacity: 0.1, }} />
        
        {/* Floating Icons Scattered */}
        <MaterialCommunityIcons name="star-four-points" size={40} color={theme.accent} style={{ position: 'absolute', top: 120, left: 40, opacity: 0.4 }} />
        <MaterialCommunityIcons name="star-four-points" size={20} color={theme.accent} style={{ position: 'absolute', top: 160, left: 90, opacity: 0.2 }} />
        <MaterialCommunityIcons name="molecule" size={60} color={theme.text} style={{ position: 'absolute', top: '35%', right: 40, opacity: 0.08, transform: [{rotate: '15deg'}] }} />
        <FontAwesome5 name="heart" size={24} color={theme.text} style={{ position: 'absolute', bottom: 220, right: 60, opacity: 0.15, transform: [{rotate: '15deg'}] }} />
        <Ionicons name="sparkles" size={30} color={theme.accent} style={{ position: 'absolute', bottom: '40%', left: 30, opacity: 0.2 }} />
        <MaterialCommunityIcons name="flask-outline" size={80} color={theme.accent} style={{ position: 'absolute', bottom: 100, left: -20, opacity: 0.05, transform: [{rotate: '-20deg'}] }} />
        
        {/* Circles */}
        <View style={{ position: 'absolute', top: '45%', right: -30, width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: theme.accent, opacity: 0.1 }} />
    </View>
);

const ScoreRing = ({ score, theme }) => {
    const size = 190; const r = 80; const circ = 2 * Math.PI * r;
    const color = score >= 80 ? '#10B981' : score >= 50 ? theme.accent : '#EF4444';
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={size/2} cy={size/2} r={r} stroke={theme.text} strokeOpacity="0.08" strokeWidth="15" fill="none" />
                <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="15" fill="none" strokeDasharray={circ} strokeDashoffset={circ - (score/100)*circ} strokeLinecap="round" />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 64, color: theme.text, lineHeight: 70 }}>{score}</Text>
                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 14, color: theme.text, opacity: 0.7 }}>درجة وثيق</Text>
            </View>
        </View>
    );
};

// --- HELPER FOR CLAIMS STATUS ---
const getClaimStyle = (status) => {
    if (status.includes('✅')) return { color: '#10B981', icon: 'checkmark-circle' }; // Verified
    if (status.includes('🌿')) return { color: '#06B6D4', icon: 'leaf' };             // Moderate
    if (status.includes('⚠️') || status.includes('Angel')) return { color: '#F59E0B', icon: 'alert-circle', note: '(نسبة غير فعالة)' }; // Angel Dusting
    // Both Deception and No Evidence are now RED
    return { color: '#EF4444', icon: 'close-circle' };
};

export default function Template01({ analysis, typeLabel, productName, imageUri, theme, imgPos }) {
    const safe = analysis || {};
    const claims = (safe.marketing_results || []).slice(0, 4);

    return (
        <View style={[styles.container, { backgroundColor: theme.primary }]}>
            <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill} />
            <BackgroundDecor theme={theme} />
            
            <View style={styles.header}>
                <View style={[styles.brandBadge, { borderColor: theme.border }]}>
                    <Text style={[styles.brandText, { color: theme.text }]}>وثيق</Text>
                </View>
                <Text style={[styles.pName, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{productName || "اسم المنتج"}</Text>
                <Text style={[styles.pType, { color: theme.accent }]}>{typeLabel}</Text>
            </View>

            <View style={styles.heroSplit}>
                <View style={styles.side}>
                    <ScoreRing score={safe.oilGuardScore || 0} theme={theme} />
                    <View style={styles.miniPills}>
                        <View style={[styles.miniPill, {backgroundColor: `${theme.accent}25`}]}>
                            <Text style={[styles.miniText, {color: theme.text}]}>أمان {safe.safety?.score}%</Text>
                        </View>
                        <View style={[styles.miniPill, {backgroundColor: `${theme.accent}25`}]}>
                            <Text style={[styles.miniText, {color: theme.text}]}>فعالية {safe.efficacy?.score}%</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.side}>
                    <View style={[styles.imgCapsule, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                        {imageUri && (
                            <>
                                <Image source={{ uri: imageUri }} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} resizeMode="cover" blurRadius={50} />
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
                                <Image source={{ uri: imageUri }} style={{ width: 600, height: 600, transform: [{translateX: imgPos?.x || 0}, {translateY: imgPos?.y || 0}, {scale: imgPos?.scale || 1}] }} resizeMode="contain" />
                            </>
                        )}
                    </View>
                </View>
            </View>

            <View style={[styles.dataCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                <Text style={[styles.verdictLabel, { color: theme.accent }]}>النتيجة النهائية</Text>
                <Text style={[styles.verdictText, { color: theme.text }]} numberOfLines={2} adjustsFontSizeToFit>{safe.finalVerdict}</Text>
                
                <View style={styles.grid}>
                    {claims.map((item, i) => {
                        const style = getClaimStyle(item.status);
                        return (
                            <View key={i} style={[styles.gridItem, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                                <Ionicons name={style.icon} size={20} color={style.color} />
                                <Text style={[styles.gridText, { color: theme.text }]} numberOfLines={1}>
                                    {item.claim} {style.note && <Text style={{color: style.color, fontSize: 10}}>{style.note}</Text>}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            <View style={styles.footer}>
                <View style={[styles.ctaButton, { backgroundColor: theme.text }]}>
                    <Text style={[styles.ctaText, { color: theme.primary }]}>حللي منتجاتك الآن عبر WATHIQ.WEB.APP</Text>
                </View>
                <View style={styles.socialRow}>
                    <View style={styles.socialItem}>
                        <FontAwesome5 name="instagram" size={16} color={theme.accent} />
                        <Text style={[styles.socialText, { color: theme.text }]}>wathiq.ai</Text>
                    </View>
                    <View style={[styles.socialSep, { backgroundColor: theme.border }]} />
                    <View style={styles.socialItem}>
                        <FontAwesome5 name="facebook" size={16} color={theme.accent} />
                        <Text style={[styles.socialText, { color: theme.text }]}>وثيق محلل المكونات</Text>
                    </View>
                </View>
                <Text style={[styles.disclaimerText, { color: theme.text }]}>
                *هذه النتيجة شخصية؛ قد تختلف الاستجابة حسب المستخدم.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: 600, height: 1066, padding: 40, justifyContent: 'space-between' },
    header: { alignItems: 'center' },
    brandBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, marginBottom: 15 },
    brandText: { fontSize: 14, fontFamily: 'Tajawal-Bold', letterSpacing: 3 },
    pName: { fontSize: 48, fontFamily: 'Tajawal-ExtraBold', textAlign: 'center', marginBottom: 5 },
    pType: { fontSize: 20, fontFamily: 'Tajawal-Bold', opacity: 0.9 },
    heroSplit: { flexDirection: 'row-reverse', height: 360, alignItems: 'center' },
    side: { flex: 1, alignItems: 'center' },
    imgCapsule: { width: 240, height: 340, borderRadius: 120, borderWidth: 2, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    miniPills: { flexDirection: 'row-reverse', gap: 10, marginTop: 20 },
    miniPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 15 },
    miniText: { fontSize: 20, fontFamily: 'Tajawal-Bold' },
    dataCard: { width: '100%', borderRadius: 40, padding: 30, borderWidth: 1.5 },
    verdictLabel: { fontSize: 16, fontFamily: 'Tajawal-Bold', textAlign: 'right', marginBottom: 5 },
    verdictText: { fontSize: 28, fontFamily: 'Tajawal-Bold', textAlign: 'right', lineHeight: 40, marginBottom: 20 },
    grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
    gridItem: { width: '48%', flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 12, borderRadius: 15 },
    gridText: { fontSize: 14, fontFamily: 'Tajawal-Bold', flex: 1, textAlign: 'right' },
    footer: { width: '100%', alignItems: 'center', gap: 15, paddingTop: 15, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    ctaButton: { paddingHorizontal: 25, paddingVertical: 14, borderRadius: 30, width: '100%' },
    ctaText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 19, textAlign: 'center' },
    socialRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 20 },
    socialItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    socialText: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    socialSep: { width: 2, height: 16, opacity: 0.4 },
    disclaimerText: { fontFamily: 'Tajawal-Regular', fontSize: 17, textAlign: 'center', opacity: 0.7, marginTop: 5 },
});