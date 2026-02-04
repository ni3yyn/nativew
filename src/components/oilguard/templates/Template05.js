import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// --- DECORATIVE LAYER (Boosted Visibility) ---
const BackgroundDecor = ({ theme }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: 'absolute', top: 300, left: 50, width: 300, height: 500, borderRadius: 150, backgroundColor: theme.accent, opacity: 0.15, transform: [{ rotate: '45deg' }] }} />
        <View style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: theme.text, opacity: 0.1, }} />
        <MaterialCommunityIcons name="star-three-points" size={24} color={theme.accent} style={{ position: 'absolute', top: 120, left: 30, opacity: 0.5 }} />
    </View>
);

export default function Template05({ analysis, typeLabel, productName, imageUri, theme, imgPos }) {
    const safe = analysis || {};
    const marketingResults = (safe.marketing_results || []).slice(0, 4);

    return (
        <View style={[styles.container, { backgroundColor: theme.primary }]}>
            <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill} />
            <BackgroundDecor theme={theme} />
            
            <View style={styles.header}><View style={[styles.brandBadge, { backgroundColor: theme.text }]}><Text style={[styles.brandText, { color: theme.primary }]}>وثيق</Text></View></View>

            <View style={styles.bentoContainer}>
                
                <View style={styles.topRow}>
                    <View style={[styles.imageBox, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                        {imageUri && (
                            <View style={styles.imageClipper}>
                                <Image source={{ uri: imageUri }} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} resizeMode="cover" blurRadius={50} />
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
                                <Image source={{ uri: imageUri }} style={{ width: 600, height: 600, transform: [{ translateX: imgPos?.x || 0 }, { translateY: imgPos?.y || 0 }, { scale: imgPos?.scale || 1 }] }} resizeMode="contain" />
                            </View>
                        )}
                        <View style={[styles.typeFloatingBadge, { backgroundColor: theme.accent }]}><Text style={[styles.typeFloatingText, { color: theme.primary }]}>{typeLabel}</Text></View>
                    </View>
                    <View style={[styles.scoreBox, { backgroundColor: theme.accent }]}>
                        <Text style={[styles.scoreTitle, { color: theme.primary }]}>درجة الأمان</Text>
                        <Text style={[styles.scoreValue, { color: theme.primary }]}>{safe.oilGuardScore}%</Text>
                        <MaterialCommunityIcons name="star-face" size={30} color={theme.primary} style={{ marginTop: 5 }} />
                    </View>
                </View>

                {/* UPDATED: Added Safety/Efficacy Pills */}
                <View style={[styles.verdictBox, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                    <Text style={[styles.pName, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{productName || "اسم المنتج"}</Text>
                    <View style={styles.miniPillsRow}>
                        <View style={[styles.miniPill, {backgroundColor: `${theme.accent}20`}]}><Text style={[styles.miniPillText, {color: theme.text}]}>أمان {safe.safety?.score}%</Text></View>
                        <View style={[styles.miniPill, {backgroundColor: `${theme.accent}20`}]}><Text style={[styles.miniPillText, {color: theme.text}]}>فعالية {safe.efficacy?.score}%</Text></View>
                    </View>
                    <View style={[styles.verdictRibbon, { backgroundColor: theme.text }]}><Text style={[styles.verdictText, { color: theme.primary }]}>{safe.finalVerdict}</Text></View>
                </View>

                <View style={[styles.claimsBox, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                    <View style={styles.claimsHeader}><Ionicons name="sparkles" size={16} color={theme.accent} /><Text style={[styles.claimsTitle, { color: theme.text }]}>نتائج تحليل الادعاءات</Text></View>
                    <View style={styles.claimsGrid}>
                        {marketingResults.map((item, i) => (<View key={i} style={[styles.claimBubble, { backgroundColor: `${theme.accent}15` }]}><Ionicons name={item.status.includes('✅') ? "heart" : "alert-circle"} size={14} color={theme.accent} /><Text style={[styles.claimBubbleText, { color: theme.text }]} numberOfLines={1}>{item.claim}</Text></View>))}
                    </View>
                </View>
            </View>

            {/* --- UPDATED FOOTER --- */}
            <View style={styles.footer}>
                <View style={[styles.marketingPill, { backgroundColor: theme.text }]}><FontAwesome5 name="magic" size={12} color={theme.primary} /><Text style={[styles.marketingText, { color: theme.primary }]}>افحصي منتجاتك مجاناً عبر وثيق</Text></View>
                <View style={styles.socialRow}>
                    <View style={styles.socialItem}><FontAwesome5 name="instagram" size={12} color={theme.accent} /><Text style={[styles.socialText, { color: theme.text }]}>wathiq.ai</Text></View>
                    <View style={[styles.socialSep, { backgroundColor: theme.border }]} />
                    <View style={styles.socialItem}><FontAwesome5 name="facebook" size={12} color={theme.accent} /><Text style={[styles.socialText, { color: theme.text }]}>وثيق محلل المكونات</Text></View>
                </View>
                <Text style={[styles.disclaimer, { color: theme.text }]}>* النتيجة شخصية وقد تختلف الاستجابة من بشرة لأخرى</Text>
                <Text style={[styles.webLink, { color: theme.accent }]}>WATHIQ.WEB.APP</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: 600, height: 1066, padding: 40, alignItems: 'center', justifyContent: 'space-between' },
    header: { width: '100%', alignItems: 'center', marginTop: 10 },
    brandBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 25 },
    brandText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18, letterSpacing: 2 },
    bentoContainer: { width: '100%', flex: 1, marginVertical: 15, gap: 15 },
    topRow: { flexDirection: 'row-reverse', height: 280, gap: 15 },
    imageBox: { flex: 1.5, borderRadius: 45, borderWidth: 2, overflow: 'hidden', position: 'relative' },
    imageClipper: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' },
    typeFloatingBadge: { position: 'absolute', top: 20, right: 20, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    typeFloatingText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    scoreBox: { flex: 1, borderRadius: 45, justifyContent: 'center', alignItems: 'center', padding: 20 },
    scoreTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, opacity: 0.9 },
    scoreValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 48, marginVertical: -5 },
    verdictBox: { width: '100%', padding: 25, borderRadius: 45, borderWidth: 2, alignItems: 'center' },
    pName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 32, marginBottom: 10, textAlign: 'center' },
    miniPillsRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 15 },
    miniPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15 },
    miniPillText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    verdictRibbon: { width: '100%', paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
    verdictText: { fontFamily: 'Tajawal-Bold', fontSize: 20, textAlign: 'center' },
    claimsBox: { width: '100%', flex: 1, borderRadius: 45, borderWidth: 2, padding: 25 },
    claimsHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 20, justifyContent: 'center' },
    claimsTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18 },
    claimsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
    claimBubble: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, gap: 8, width: '47%' },
    claimBubbleText: { fontFamily: 'Tajawal-Bold', fontSize: 13, flex: 1, textAlign: 'right' },
    footer: { width: '100%', alignItems: 'center', gap: 12, paddingBottom: 10 },
    marketingPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 25, paddingVertical: 10, borderRadius: 25 },
    marketingText: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    socialRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15 },
    socialItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    socialText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    socialSep: { width: 1, height: 12, opacity: 0.3 },
    disclaimer: { fontFamily: 'Tajawal-Medium', fontSize: 11, opacity: 0.6, textAlign: 'center' },
    webLink: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, letterSpacing: 3, opacity: 0.5 }
});