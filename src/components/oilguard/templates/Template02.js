import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

// --- DECORATIVE LAYER (Boosted Visibility) ---
const BackgroundDecor = ({ theme }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: 'absolute', top: 50, left: -50, width: 200, height: 200, borderRadius: 40, backgroundColor: theme.accent, opacity: 0.12, transform: [{ rotate: '25deg' }] }} />
        <View style={{ position: 'absolute', top: 100, right: 30, flexDirection: 'row', gap: 5, opacity: 0.4 }}>{[1,2,3].map(i => <View key={i} style={{width: 4, height: 4, borderRadius: 2, backgroundColor: theme.text}} />)}</View>
        <View style={{ position: 'absolute', bottom: -100, right: -50, width: 500, height: 300, borderRadius: 150, backgroundColor: theme.text, opacity: 0.08, }} />
        <MaterialCommunityIcons name="star-four-points" size={30} color={theme.text} style={{ position: 'absolute', bottom: 120, left: 40, opacity: 0.2 }} />
    </View>
);

const WathiqLogo = ({ color }) => (
    <View style={{ alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 42, color, letterSpacing: 4 }}>وثيق</Text>
    </View>
);

const ScoreRing = ({ score, theme }) => {
    const size = 120; const r = 50; const circ = 2 * Math.PI * r;
    const color = score >= 80 ? '#10B981' : score >= 50 ? theme.accent : '#EF4444';
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}><Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.text} strokeOpacity="0.1" strokeWidth="8" fill="none" /><Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="8" fill="none" strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ} strokeLinecap="round" /></Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}><Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 32, color: theme.text }}>{score}</Text><Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 8, color: theme.text, opacity: 0.6 }}>درجة الأمان</Text></View>
        </View>
    );
};

export default function Template02({ analysis, typeLabel, productName, imageUri, theme, imgPos }) {
    const safe = analysis || {};
    const safetyScore = safe.safety?.score || 0;
    const efficacyScore = safe.efficacy?.score || 0;
    const oilGuardScore = safe.oilGuardScore || 0;
    const marketingResults = (safe.marketing_results || []).slice(0, 4);

    return (
        <View style={[styles.templateContainer, { backgroundColor: theme.primary }]}>
            <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill} />
            <BackgroundDecor theme={theme} />

            <View style={styles.header}><WathiqLogo color={theme.text} /><Text style={[styles.subHeader, { color: theme.accent }]}>رفيقك لبشرة و شعر صحيين</Text></View>

            <View style={[styles.glassCard, { borderColor: theme.border, backgroundColor: theme.glass }]}>
                <View style={styles.imageHeaderContainer}>
                    {imageUri && (
                        <View style={[styles.imageClipper, { borderRadius: 40 }]}>
                            <Image source={{ uri: imageUri }} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} resizeMode="cover" blurRadius={50} />
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
                            <Image source={{ uri: imageUri }} style={{ width: 600, height: 600, transform: [{ translateX: imgPos?.x || 0 }, { translateY: imgPos?.y || 0 }, { scale: imgPos?.scale || 1 }] }} resizeMode="contain" />
                        </View>
                    )}
                    <LinearGradient colors={['transparent', theme.glass]} style={styles.imageFade} />
                </View>
                <View style={styles.prodHeader}><Text style={[styles.productType, { color: theme.accent }]}>{typeLabel}</Text><Text style={[styles.productName, { color: theme.text }]} numberOfLines={2} adjustsFontSizeToFit>{productName || "اسم المنتج..."}</Text></View>
                <View style={styles.analysisRow}>
                    <ScoreRing score={oilGuardScore} theme={theme} />
                    <View style={styles.verdictCol}>
                        <Text style={[styles.verdictLabel, { color: theme.text, opacity: 0.7 }]}>الحكم النهائي</Text><Text style={[styles.verdictVal, { color: theme.text }]} numberOfLines={2} adjustsFontSizeToFit>{safe.finalVerdict}</Text>
                        <View style={styles.pillContainer}>
                            <View style={[styles.pillBg, { backgroundColor: theme.text, opacity: 0.1 }]} /><View style={styles.pillContent}><Text style={[styles.pillValue, { color: theme.text }]}>{safetyScore}%</Text><Text style={[styles.pillLabel, { color: theme.text }]}>أمان</Text></View>
                            <View style={[styles.pillSep, { backgroundColor: theme.text }]} /><View style={styles.pillContent}><Text style={[styles.pillValue, { color: theme.text }]}>{efficacyScore}%</Text><Text style={[styles.pillLabel, { color: theme.text }]}>فعالية</Text></View>
                        </View>
                    </View>
                </View>
                <View style={styles.claimsSection}><View style={styles.gridContainer}>{marketingResults.map((item, i) => (<View key={i} style={[styles.gridItem, { borderColor: theme.border, backgroundColor: 'rgba(0,0,0,0.03)' }]}><Ionicons name={item.status.includes('✅') ? "checkmark-circle" : "alert-circle"} size={16} color={item.status.includes('✅') ? '#10B981' : theme.accent} /><Text style={[styles.gridText, { color: theme.text }]} numberOfLines={1}>{item.claim}</Text></View>))}</View></View>
            </View>

            {/* --- UPDATED FOOTER --- */}
            <View style={styles.footer}>
                <Text style={[styles.emotionalText, { color: theme.accent }]}>لا تدع الشركات تخدعك.</Text>
                <Text style={[styles.emotionalSub, { color: theme.text }]}>تحققي من منتجاتك عبر وثيق.</Text>
                <View style={[styles.ctaPill, { backgroundColor: theme.text }]}>
                    <View style={[styles.ctaIcon, { backgroundColor: theme.primary }]}><FontAwesome5 name="fingerprint" size={20} color={theme.text} /></View>
                    <View><Text style={[styles.ctaAction, { color: theme.primary }]}>افحصي منتجاتك مجانا</Text><Text style={[styles.ctaLink, { color: theme.primary, opacity: 0.8 }]}>wathiq.web.app</Text></View>
                </View>
                <View style={styles.socialRow}>
                    <View style={styles.socialItem}><FontAwesome5 name="instagram" size={12} color={theme.accent} /><Text style={[styles.socialText, { color: theme.text }]}>wathiq.ai</Text></View>
                    <View style={[styles.socialSep, { backgroundColor: theme.border }]} />
                    <View style={styles.socialItem}><FontAwesome5 name="facebook" size={12} color={theme.accent} /><Text style={[styles.socialText, { color: theme.text }]}>وثيق محلل المكونات</Text></View>
                </View>
                <Text style={[styles.disclaimerText, { color: theme.text }]}>* هذه النتيجة شخصية؛ قد تختلف الاستجابة بناءً على حالة البشرة الفردية.</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    templateContainer: { width: 600, height: 1066, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 35, paddingHorizontal: 40 },
    header: { width: '100%', alignItems: 'center', marginTop: 10 },
    subHeader: { fontFamily: 'Tajawal-Regular', fontSize: 20, letterSpacing: 2, marginTop: -5, opacity: 0.9 },
    glassCard: { width: '100%', flex: 1, borderRadius: 40, alignItems: 'center', borderWidth: 1, overflow: 'hidden', paddingBottom: 25, marginVertical: 15 },
    imageHeaderContainer: { width: '100%', flex: 1.2, minHeight: 220, position: 'relative' },
    imageClipper: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    imageFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
    prodHeader: { width: '100%', alignItems: 'center', marginBottom: 15, paddingHorizontal: 20 },
    productType: { fontFamily: 'Tajawal-Regular', fontSize: 18, marginBottom: 5 },
    productName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 36, textAlign: 'center' },
    analysisRow: { flexDirection: 'row-reverse', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 30 },
    verdictCol: { flex: 1, paddingRight: 15, alignItems: 'flex-end' },
    verdictLabel: { fontSize: 14, fontFamily: 'Tajawal-Regular' },
    verdictVal: { fontSize: 24, fontFamily: 'Tajawal-ExtraBold', textAlign: 'right', width: '100%' },
    pillContainer: { flexDirection: 'row-reverse', marginTop: 10, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    pillBg: { position: 'absolute', width: '100%', height: '100%' },
    pillContent: { paddingHorizontal: 15, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
    pillSep: { width: 1, height: '60%', alignSelf: 'center', opacity: 0.3 },
    pillValue: { fontSize: 18, fontFamily: 'Tajawal-Bold' },
    pillLabel: { fontSize: 10 },
    claimsSection: { width: '90%' },
    gridContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
    gridItem: { width: '48%', flexDirection: 'row-reverse', alignItems: 'center', padding: 12, borderRadius: 15, borderWidth: 1, gap: 8 },
    gridText: { fontSize: 12, fontFamily: 'Tajawal-Bold', flex: 1, textAlign: 'right' },
    footer: { width: '100%', alignItems: 'center', paddingBottom: 10, gap: 10 },
    emotionalText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24, textAlign: 'center' },
    emotionalSub: { fontFamily: 'Tajawal-Regular', fontSize: 18, marginBottom: 10, opacity: 0.9 },
    ctaPill: { flexDirection: 'row-reverse', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 20, alignItems: 'center', gap: 15 },
    ctaIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    ctaAction: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18 },
    ctaLink: { fontFamily: 'Tajawal-Regular', fontSize: 14 },
    socialRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15, marginTop: 5 },
    socialItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    socialText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    socialSep: { width: 1, height: 12, opacity: 0.3 },
    disclaimerText: { fontFamily: 'Tajawal-Medium', fontSize: 10, textAlign: 'center', opacity: 0.6, marginTop: 5 },
});