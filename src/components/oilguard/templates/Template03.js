import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// --- DECORATIVE LAYER (Boosted Visibility) ---
const BackgroundDecor = ({ theme }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: 'absolute', top: 150, left: 20, width: 560, height: 560, borderRadius: 280, backgroundColor: theme.accent, opacity: 0.15, }} />
        <FontAwesome5 name="heart" size={24} color={theme.accent} style={{ position: 'absolute', top: 80, right: 60, opacity: 0.4, transform: [{rotate: '20deg'}] }} />
        <FontAwesome5 name="heart" size={16} color={theme.text} style={{ position: 'absolute', bottom: 150, left: 40, opacity: 0.3, transform: [{rotate: '-10deg'}] }} />
        <FontAwesome5 name="heart" size={20} color={theme.text} style={{ position: 'absolute', top: 400, left: 20, opacity: 0.2, transform: [{rotate: '45deg'}] }} />
        <MaterialCommunityIcons name="star-four-points" size={30} color={theme.accent} style={{ position: 'absolute', top: 50, left: 50, opacity: 0.5 }} />
        <MaterialCommunityIcons name="star-four-points" size={20} color={theme.text} style={{ position: 'absolute', bottom: 100, right: 50, opacity: 0.4 }} />
    </View>
);

export default function Template03({ analysis, typeLabel, productName, imageUri, theme, imgPos }) {
    const safe = analysis || {};
    const safetyScore = safe.safety?.score || 0;
    const efficacyScore = safe.efficacy?.score || 0;
    const oilGuardScore = safe.oilGuardScore || 0;
    const claims = (safe.marketing_results || []).slice(0, 4);

    return (
        <View style={[styles.container, { backgroundColor: theme.primary }]}>
        <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill} />
        <BackgroundDecor theme={theme} />
        
        <View style={styles.header}>
            <View style={[styles.logoPill, { backgroundColor: theme.text, borderRadius: 40 }]}>
                <Text style={[styles.logoText, { color: theme.primary }]}>✨ وثيق ✨</Text>
            </View>
        </View>

        <View style={styles.heroSection}>
            <View style={[styles.imageCloud, { backgroundColor: theme.glass, borderColor: theme.border, borderRadius: 210 }]}>
                {imageUri && (
                    <>
                        <Image source={{ uri: imageUri }} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} resizeMode="cover" blurRadius={50} />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
                        <Image source={{ uri: imageUri }} style={{ width: 600, height: 600, transform: [{ translateX: imgPos?.x || 0 }, { translateY: imgPos?.y || 0 }, { scale: imgPos?.scale || 1 }] }} resizeMode="contain" />
                    </>
                )}
            </View>
            <View style={[styles.scoreSticker, { backgroundColor: theme.accent, borderRadius: 100 }]}>
                <Text style={[styles.stickerScore, { color: theme.primary }]}>{oilGuardScore}%</Text>
            </View>
        </View>

            <View style={styles.infoBox}>
                <Text style={[styles.pName, { color: theme.text }]} numberOfLines={2} adjustsFontSizeToFit>{productName || "اسم المنتج الجميل"}</Text>
                <View style={[styles.verdictBubble, { backgroundColor: `${theme.accent}15` }]}><Text style={[styles.verdictText, { color: theme.text }]}>{safe.finalVerdict}</Text></View>
            </View>

            <View style={styles.miniStatsRow}>
                <View style={[styles.statPill, { backgroundColor: theme.glass, borderColor: theme.border }]}><Ionicons name="shield-checkmark" size={18} color={theme.accent} /><Text style={[styles.statVal, { color: theme.text }]}>أمان {safetyScore}%</Text></View>
                <View style={[styles.statPill, { backgroundColor: theme.glass, borderColor: theme.border }]}><Ionicons name="star" size={18} color={theme.accent} /><Text style={[styles.statVal, { color: theme.text }]}>فعالية {efficacyScore}%</Text></View>
            </View>

            <View style={styles.claimsArea}>
                <View style={styles.claimsGrid}>
                    {claims.map((c, i) => (<View key={i} style={[styles.claimCard, { backgroundColor: theme.glass, borderColor: theme.border }]}><View style={[styles.claimIcon, { backgroundColor: theme.accent }]}><FontAwesome5 name="check" size={10} color={theme.primary} /></View><Text style={[styles.claimText, { color: theme.text }]} numberOfLines={1}>{c.claim}</Text></View>))}
                </View>
            </View>

            {/* --- NEW STANDARDIZED FOOTER --- */}
            <View style={styles.footer}>
                <View style={[styles.ctaButton, { backgroundColor: theme.text }]}>
                    <Text style={[styles.ctaText, { color: theme.primary }]}>WATHIQ.WEB.APP حللي منتجك الآن عبر</Text>
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
    container: { width: 600, height: 1066, padding: 40, alignItems: 'center', justifyContent: 'space-between' },
    header: { alignItems: 'center', marginTop: 10 },
    logoPill: { paddingHorizontal: 25, paddingVertical: 8, borderRadius: 30, marginBottom: 10 },
    logoText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 22, letterSpacing: 2 },
    heroSection: { width: 450, height: 450, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    imageCloud: { width: 420, height: 420, borderRadius: 210, borderWidth: 3, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' },
    scoreSticker: { position: 'absolute', bottom: 10, left: 10, width: 130, height: 130, borderRadius: 65, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-10deg' }], elevation: 10, shadowOpacity: 0.3, shadowRadius: 10 },
    stickerScore: { fontFamily: 'Tajawal-ExtraBold', fontSize: 42 },
    infoBox: { width: '100%', alignItems: 'center', paddingHorizontal: 20 },
    pName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 40, textAlign: 'center', marginBottom: 15 },
    verdictBubble: { paddingHorizontal: 25, paddingVertical: 15, borderRadius: 25, width: '100%' },
    verdictText: { fontFamily: 'Tajawal-Bold', fontSize: 20, textAlign: 'center', lineHeight: 28 },
    miniStatsRow: { flexDirection: 'row-reverse', gap: 15, marginTop: 10 },
    statPill: { flexDirection: 'row-reverse', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 8 },
    statVal: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    claimsArea: { width: '100%', paddingHorizontal: 10, marginTop: 10 },
    claimsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    claimCard: { width: '45%', flexDirection: 'row-reverse', alignItems: 'center', padding: 12, borderRadius: 18, borderWidth: 1, gap: 10 },
    claimIcon: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    claimText: { fontFamily: 'Tajawal-Bold', fontSize: 12, flex: 1, textAlign: 'right' },
    // --- NEW FOOTER STYLES ---
    footer: { width: '100%', alignItems: 'center', gap: 12, marginBottom: 10 },
    ctaButton: { paddingHorizontal: 25, paddingVertical: 12, borderRadius: 30, width: '100%' },
    ctaText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, textAlign: 'center' },
    socialRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15 },
    socialItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    socialText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    socialSep: { width: 1, height: 12, opacity: 0.3 },
    disclaimerText: { fontFamily: 'Tajawal-Medium', fontSize: 10, textAlign: 'center', opacity: 0.6, marginTop: 5 },
});