import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

// --- DECORATIVE LAYER (Boosted Visibility) ---
const BackgroundDecor = ({ theme }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: 'absolute', top: -100, right: -50, width: 400, height: 400, borderRadius: 200, backgroundColor: theme.accent, opacity: 0.15, transform: [{ scaleX: 1.2 }] }} />
        <View style={{ position: 'absolute', bottom: -50, left: -100, width: 350, height: 350, borderRadius: 175, backgroundColor: theme.text, opacity: 0.1, }} />
        <MaterialCommunityIcons name="star-four-points" size={24} color={theme.accent} style={{ position: 'absolute', top: 120, left: 40, opacity: 0.6 }} />
        <FontAwesome5 name="heart" size={16} color={theme.text} style={{ position: 'absolute', bottom: 180, right: 30, opacity: 0.2, transform: [{rotate: '15deg'}] }} />
        <View style={{ position: 'absolute', top: '40%', right: -20, width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: theme.accent, opacity: 0.1 }} />
    </View>
);

const ScoreRing = ({ score, theme }) => {
    const size = 170; const r = 70; const circ = 2 * Math.PI * r;
    const color = score >= 80 ? '#10B981' : score >= 50 ? theme.accent : '#EF4444';
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={size/2} cy={size/2} r={r} stroke={theme.text} strokeOpacity="0.08" strokeWidth="12" fill="none" />
                <Circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="12" fill="none" strokeDasharray={circ} strokeDashoffset={circ - (score/100)*circ} strokeLinecap="round" />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 52, color: theme.text }}>{score}</Text>
                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 10, color: theme.text, opacity: 0.6 }}>درجة الأمان</Text>
            </View>
        </View>
    );
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
                        <View style={[styles.miniPill, {backgroundColor: `${theme.accent}20`}]}><Text style={[styles.miniText, {color: theme.text}]}>أمان {safe.safety?.score}%</Text></View>
                        <View style={[styles.miniPill, {backgroundColor: `${theme.accent}20`}]}><Text style={[styles.miniText, {color: theme.text}]}>فعالية {safe.efficacy?.score}%</Text></View>
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
                <Text style={[styles.verdictText, { color: theme.text }]}>{safe.finalVerdict}</Text>
                <View style={styles.grid}>
                    {claims.map((item, i) => (
                        <View key={i} style={[styles.gridItem, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                            <Ionicons name={item.status.includes('✅') ? "checkmark-circle" : "alert-circle"} size={14} color={item.status.includes('✅') ? '#10B981' : '#F59E0B'} />
                            <Text style={[styles.gridText, { color: theme.text }]} numberOfLines={1}>{item.claim}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* --- NEW STANDARDIZED FOOTER --- */}
            <View style={styles.footer}>
                <View style={[styles.ctaButton, { backgroundColor: theme.text }]}>
                    <Text style={[styles.ctaText, { color: theme.primary }]}>حللي منتجاتك الآن عبر WATHIQ.WEB.APP</Text>
                </View>
                <View style={styles.socialRow}>
                    <View style={styles.socialItem}>
                        <FontAwesome5 name="instagram" size={12} color={theme.accent} />
                        <Text style={[styles.socialText, { color: theme.text }]}>wathiq.ai</Text>
                    </View>
                    <View style={[styles.socialSep, { backgroundColor: theme.border }]} />
                    <View style={styles.socialItem}>
                        <FontAwesome5 name="facebook" size={12} color={theme.accent} />
                        <Text style={[styles.socialText, { color: theme.text }]}>وثيق محلل المكونات</Text>
                    </View>
                </View>
                <Text style={[styles.disclaimerText, { color: theme.text }]}>
                    * هذه النتيجة شخصية؛ قد تختلف الاستجابة بناءً على حالة البشرة الفردية.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: 600, height: 1066, padding: 45, justifyContent: 'space-between' },
    header: { alignItems: 'center' },
    brandBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 15 },
    brandText: { fontSize: 12, fontFamily: 'Tajawal-Bold', letterSpacing: 2 },
    pName: { fontSize: 44, fontFamily: 'Tajawal-ExtraBold', textAlign: 'center' },
    pType: { fontSize: 18, fontFamily: 'Tajawal-Bold', opacity: 0.8 },
    heroSplit: { flexDirection: 'row-reverse', height: 350, alignItems: 'center' },
    side: { flex: 1, alignItems: 'center' },
    imgCapsule: { width: 230, height: 330, borderRadius: 115, borderWidth: 1.5, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    miniPills: { flexDirection: 'row-reverse', gap: 8, marginTop: 15 },
    miniPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    miniText: { fontSize: 12, fontFamily: 'Tajawal-Bold' },
    dataCard: { width: '100%', borderRadius: 35, padding: 30, borderWidth: 1 },
    verdictLabel: { fontSize: 14, fontFamily: 'Tajawal-Bold', textAlign: 'right', marginBottom: 10 },
    verdictText: { fontSize: 24, fontFamily: 'Tajawal-Bold', textAlign: 'right', lineHeight: 34, marginBottom: 20 },
    grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
    gridItem: { width: '48%', flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12 },
    gridText: { fontSize: 12, fontFamily: 'Tajawal-Medium' },
    // --- UPDATED FOOTER STYLES ---
    footer: { width: '100%', alignItems: 'center', gap: 12, paddingTop: 15, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    ctaButton: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 30, width: '100%' },
    ctaText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, textAlign: 'center' },
    socialRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15 },
    socialItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    socialText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    socialSep: { width: 1, height: 12, opacity: 0.3 },
    disclaimerText: { fontFamily: 'Tajawal-Medium', fontSize: 10, textAlign: 'center', opacity: 0.6, marginTop: 5 },
});