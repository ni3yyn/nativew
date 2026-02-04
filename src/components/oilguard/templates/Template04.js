import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// --- DECORATIVE LAYER (Boosted Visibility) ---
const BackgroundDecor = ({ theme }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{
            position: 'absolute', top: -50, left: '20%', width: 400, height: 400,
            borderRadius: 200, backgroundColor: theme.accent, opacity: 0.15, // Increased
        }} />
         <View style={{
            position: 'absolute', bottom: 100, right: -50, width: 200, height: 200,
            borderRadius: 100, backgroundColor: theme.text, opacity: 0.1, // Increased
        }} />
    </View>
);

export default function Template04({ analysis, typeLabel, productName, imageUri, theme, imgPos }) {
    const safe = analysis || {};
    const claims = (safe.marketing_results || []).slice(0, 3);
    const safetyScore = safe.safety?.score || 0;
    const efficacyScore = safe.efficacy?.score || 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.primary }]}>
            <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill} />
            <BackgroundDecor theme={theme} />
            
            <View style={[styles.compactBlock, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                
                <View style={styles.imageScoreRow}>
                    <View style={styles.imageContainer}>
                        {imageUri && (
                            <View style={styles.imageClipper}>
                                <Image source={{ uri: imageUri }} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} resizeMode="cover" blurRadius={50} />
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
                                <Image source={{ uri: imageUri }} style={{ width: 600, height: 600, transform: [{ translateX: imgPos?.x || 0 }, { translateY: imgPos?.y || 0 }, { scale: imgPos?.scale || 1 }] }} resizeMode="contain" />
                            </View>
                        )}
                    </View>

                    <View style={styles.scoreCol}>
                        <View style={[styles.mainScorePill, { backgroundColor: theme.accent }]}>
                            <Text style={[styles.scoreValue, { color: theme.primary }]}>{safe.oilGuardScore}%</Text>
                            <Text style={[styles.scoreLabel, { color: theme.primary }]}>التوافق</Text>
                        </View>
                        <View style={[styles.subScorePill, { borderColor: theme.border }]}>
                            <Text style={[styles.subScoreText, { color: theme.text }]}>أمان {safetyScore}%</Text>
                        </View>
                        <View style={[styles.subScorePill, { borderColor: theme.border }]}>
                            <Text style={[styles.subScoreText, { color: theme.text }]}>فعالية {efficacyScore}%</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.verdictBlock}>
                    <Text style={[styles.pName, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                        {productName || "اسم المنتج"}
                    </Text>
                    <Text style={[styles.pType, { color: theme.accent }]}>{typeLabel}</Text>
                    
                    <View style={[styles.verdictWrapper, { backgroundColor: `${theme.accent}20` }]}>
                        <Ionicons name="flask-outline" size={20} color={theme.accent} />
                        <Text style={[styles.verdictText, { color: theme.text }]}>
                            {safe.finalVerdict}
                        </Text>
                    </View>
                </View>

            </View>

            <View style={styles.claimsSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>تحليل الوعود التسويقية:</Text>
                {claims.map((c, i) => (
                    <View key={i} style={[styles.claimCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                        <View style={[styles.claimIcon, { backgroundColor: theme.accent }]}>
                            <FontAwesome5 name={c.status.includes('✅') ? "check" : "exclamation"} size={14} color={theme.primary} />
                        </View>
                        <Text style={[styles.claimText, { color: theme.text }]} numberOfLines={2}>
                            {c.claim}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.footer}>
                <View style={styles.disclaimerBox}>
                    <MaterialCommunityIcons name="information-variant" size={14} color={theme.text} style={{ opacity: 0.5 }} />
                    <Text style={[styles.disclaimerText, { color: theme.text }]}>
                        هذه النتيجة شخصية؛ قد تختلف الاستجابة بناءً على حالة البشرة الفردية.
                    </Text>
                </View>

                <View style={[styles.ctaButton, { backgroundColor: theme.text }]}>
                    <Text style={[styles.ctaText, { color: theme.primary }]}>حللي منتجاتك مجاناً عبر WATHIQ.WEB.APP</Text>
                </View>

                <View style={styles.socialRow}>
                    <FontAwesome5 name="instagram" size={12} color={theme.accent} />
                    <Text style={[styles.socialText, { color: theme.text }]}>wathiq.ai</Text>
                    <View style={[styles.socialSep, { backgroundColor: theme.border }]} />
                    <FontAwesome5 name="facebook" size={12} color={theme.accent} />
                    <Text style={[styles.socialText, { color: theme.text }]}>وثيق محلل المكونات</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: 600, height: 1066, padding: 45, justifyContent: 'space-between' },
    compactBlock: { padding: 30, borderRadius: 40, borderWidth: 1, width: '100%', marginBottom: 20 },
    imageScoreRow: { flexDirection: 'row-reverse', gap: 20, marginBottom: 20 },
    imageContainer: { flex: 1.5, height: 280, borderRadius: 35, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
    imageClipper: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', overflow: 'hidden' },
    scoreCol: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
    mainScorePill: { width: '100%', padding: 20, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 5 },
    scoreValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 36 },
    scoreLabel: { fontFamily: 'Tajawal-Bold', fontSize: 10, marginTop: -4 },
    subScorePill: { width: '100%', padding: 10, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    subScoreText: { fontFamily: 'Tajawal-Bold', fontSize: 13 },
    verdictBlock: { width: '100%', alignItems: 'center' },
    pName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 32, textAlign: 'center', marginBottom: 5 },
    pType: { fontFamily: 'Tajawal-Bold', fontSize: 16, opacity: 0.8, marginBottom: 15 },
    verdictWrapper: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 25, width: '100%' },
    verdictText: { fontFamily: 'Tajawal-Bold', fontSize: 18, flex: 1, textAlign: 'right', lineHeight: 26 },
    claimsSection: { width: '100%', gap: 10 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 16, textAlign: 'right', marginBottom: 2, marginRight: 10 },
    claimCard: { flexDirection: 'row-reverse', alignItems: 'center', padding: 18, borderRadius: 25, borderWidth: 1, gap: 15 },
    claimIcon: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    claimText: { fontFamily: 'Tajawal-Bold', fontSize: 17, flex: 1, textAlign: 'right' },
    footer: { width: '100%', alignItems: 'center', gap: 12, paddingBottom: 5, marginTop: 10 },
    disclaimerBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 15 },
    disclaimerText: { fontFamily: 'Tajawal-Medium', fontSize: 11, textAlign: 'right', opacity: 0.6, flex: 1 },
    ctaButton: { paddingHorizontal: 25, paddingVertical: 14, borderRadius: 30, width: '100%' },
    ctaText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18, textAlign: 'center' },
    socialRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 5 },
    socialText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    socialSep: { width: 1, height: 12, marginHorizontal: 8, opacity: 0.3 }
});