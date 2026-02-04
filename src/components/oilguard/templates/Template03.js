
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// --- DECORATIVE LAYER ---
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

// --- HELPER FOR CLAIMS ---
const getClaimStyle = (status) => {
    if (status.includes('✅')) return { color: '#10B981', icon: 'check', bg: '#10B981' };
    if (status.includes('🌿')) return { color: '#06B6D4', icon: 'leaf', bg: '#06B6D4' };
    if (status.includes('⚠️') || status.includes('Angel')) return { color: '#F59E0B', icon: 'exclamation', bg: '#F59E0B', note: '(نسبة غير فعالة)' };
    // Red for both Lies and No Evidence
    return { color: '#EF4444', icon: 'times', bg: '#EF4444' };
};

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
                <View style={[styles.statPill, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                    <Ionicons name="shield-checkmark" size={20} color={theme.accent} />
                    <Text style={[styles.statVal, { color: theme.text }]}>أمان {safetyScore}%</Text>
                </View>
                <View style={[styles.statPill, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                    <Ionicons name="star" size={20} color={theme.accent} />
                    <Text style={[styles.statVal, { color: theme.text }]}>فعالية {efficacyScore}%</Text>
                </View>
            </View>

            <View style={styles.claimsArea}>
                <View style={styles.claimsGrid}>
                    {claims.map((c, i) => {
                        const style = getClaimStyle(c.status);
                        return (
                            <View key={i} style={[styles.claimCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                                <View style={[styles.claimIcon, { backgroundColor: style.bg }]}>
                                    <FontAwesome5 name={style.icon} size={12} color={theme.primary} />
                                </View>
                                <Text style={[styles.claimText, { color: theme.text }]} numberOfLines={2}>
                                    {c.claim} {style.note && <Text style={{color: style.color, fontSize: 10}}>{style.note}</Text>}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* --- NEW STANDARDIZED FOOTER --- */}
            <View style={styles.footer}>
                <View style={[styles.ctaButton, { backgroundColor: theme.text }]}>
                    <Text style={[styles.ctaText, { color: theme.primary }]}>WATHIQ.WEB.APP حللي منتجك الآن عبر</Text>
                </View>
                <View style={styles.socialRow}>
                    <View style={styles.socialItem}><FontAwesome5 name="instagram" size={16} color={theme.accent} /><Text style={[styles.socialText, { color: theme.text }]}>wathiq.ai</Text></View>
                    <View style={[styles.socialSep, { backgroundColor: theme.border }]} />
                    <View style={styles.socialItem}><FontAwesome5 name="facebook" size={16} color={theme.accent} /><Text style={[styles.socialText, { color: theme.text }]}>وثيق محلل المكونات</Text></View>
                </View>
                <Text style={[styles.disclaimerText, { color: theme.text }]}>*هذه النتيجة شخصية؛ قد تختلف الاستجابة حسب المستخدم.</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: 600, height: 1066, padding: 40, alignItems: 'center', justifyContent: 'space-between' },
    header: { alignItems: 'center', marginTop: 10 },
    logoPill: { paddingHorizontal: 30, paddingVertical: 10, borderRadius: 30, marginBottom: 10 },
    logoText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 26, letterSpacing: 2 },
    heroSection: { width: 450, height: 450, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    imageCloud: { width: 420, height: 420, borderRadius: 210, borderWidth: 3, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' },
    scoreSticker: { position: 'absolute', bottom: 10, left: 10, width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-10deg' }], elevation: 10, shadowOpacity: 0.3, shadowRadius: 10 },
    stickerScore: { fontFamily: 'Tajawal-ExtraBold', fontSize: 56 },
    infoBox: { width: '100%', alignItems: 'center', paddingHorizontal: 15 },
    pName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 46, textAlign: 'center', marginBottom: 15 },
    verdictBubble: { paddingHorizontal: 25, paddingVertical: 15, borderRadius: 25, width: '100%' },
    verdictText: { fontFamily: 'Tajawal-Bold', fontSize: 24, textAlign: 'center', lineHeight: 32 },
    miniStatsRow: { flexDirection: 'row-reverse', gap: 20, marginTop: 15 },
    statPill: { flexDirection: 'row-reverse', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', gap: 10 },
    statVal: { fontFamily: 'Tajawal-Bold', fontSize: 18 },
    claimsArea: { width: '100%', paddingHorizontal: 5, marginTop: 10 },
    claimsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    claimCard: { width: '45%', flexDirection: 'row-reverse', alignItems: 'center', padding: 15, borderRadius: 20, borderWidth: 1.5, gap: 10 },
    claimIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    claimText: { fontFamily: 'Tajawal-Bold', fontSize: 18, flex: 1, textAlign: 'right' },
    // --- NEW FOOTER STYLES ---
    footer: { width: '100%', alignItems: 'center', gap: 15, marginBottom: 15 },
    ctaButton: { paddingHorizontal: 25, paddingVertical: 14, borderRadius: 30, width: '100%', marginTop: 10},
    ctaText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 19, textAlign: 'center' },
    socialRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 20 },
    socialItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    socialText: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    socialSep: { width: 2, height: 16, opacity: 0.3 },
    disclaimerText: { fontFamily: 'Tajawal-Regular', fontSize: 17, textAlign: 'center', opacity: 0.6, marginTop: 5 },
});