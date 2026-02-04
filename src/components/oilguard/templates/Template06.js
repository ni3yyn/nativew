import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// --- DECORATIVE LAYER (Boosted Visibility) ---
const BackgroundDecor = ({ theme }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Large Arc Bottom */}
        <View style={{
            position: 'absolute', bottom: -150, left: 0, right: 0, height: 300,
            borderTopLeftRadius: 300, borderTopRightRadius: 300,
            backgroundColor: theme.accent, opacity: 0.1, // Increased
        }} />
        {/* Top Circle */}
        <View style={{
            position: 'absolute', top: -50, left: -50, width: 250, height: 250,
            borderRadius: 125, backgroundColor: theme.text, opacity: 0.08, // Increased
        }} />
        <FontAwesome5 name="star" size={14} color={theme.text} style={{ position: 'absolute', top: 120, right: 30, opacity: 0.3 }} />
    </View>
);

export default function Template06({ analysis, typeLabel, productName, imageUri, theme, imgPos }) {
    const safe = analysis || {};
    const claims = (safe.marketing_results || []).slice(0, 3);

    return (
        <View style={[styles.container, { backgroundColor: theme.primary }]}>
            <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill} />
            <BackgroundDecor theme={theme} />
            
            <View style={styles.heroSection}>
                <View style={[styles.imageContainer, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                    {imageUri && (
                        <View style={styles.imageClipper}>
                            <Image source={{ uri: imageUri }} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} resizeMode="cover" blurRadius={50} />
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
                            <Image 
                                source={{ uri: imageUri }} 
                                style={{ 
                                    width: 600, 
                                    height: 600, 
                                    transform: [
                                        { translateX: imgPos?.x || 0 }, 
                                        { translateY: imgPos?.y || 0 }, 
                                        { scale: imgPos?.scale || 1 }
                                    ] 
                                }} 
                                resizeMode="contain" 
                            />
                        </View>
                    )}
                    
                    <View style={[styles.scoreBadge, { backgroundColor: theme.accent }]}>
                        <Text style={[styles.scoreValue, { color: theme.primary }]}>{safe.oilGuardScore}%</Text>
                        <Text style={[styles.scoreLabel, { color: theme.primary }]}>درجة الأمان</Text>
                    </View>
                </View>
            </View>

            <View style={styles.infoSection}>
                <Text style={[styles.pType, { color: theme.accent }]}>{typeLabel}</Text>
                <Text style={[styles.pName, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {productName || "اسم المنتج"}
                </Text>
                
                <View style={[styles.verdictWrapper, { backgroundColor: `${theme.accent}10`, borderColor: theme.border }]}>
                    <Ionicons name="flask-outline" size={24} color={theme.accent} />
                    <Text style={[styles.verdictText, { color: theme.text }]}>
                        {safe.finalVerdict}
                    </Text>
                </View>
            </View>

            <View style={styles.claimsSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>تحليل الوعود التسويقية:</Text>
                {claims.map((c, i) => (
                    <View key={i} style={[styles.claimCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                        <View style={[styles.claimIcon, { backgroundColor: theme.accent }]}>
                            <FontAwesome5 name={c.status.includes('✅') ? "check" : "exclamation"} size={12} color={theme.primary} />
                        </View>
                        <Text style={[styles.claimText, { color: theme.text }]} numberOfLines={2}>
                            {c.claim}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.footer}>
                <View style={styles.disclaimerBox}>
                    <MaterialCommunityIcons name="information-variant" size={16} color={theme.text} style={{ opacity: 0.5 }} />
                    <Text style={[styles.disclaimerText, { color: theme.text }]}>
                        هذه النتيجة شخصية؛ قد تختلف الاستجابة بناءً على حالة البشرة الفردية.
                    </Text>
                </View>

                <View style={[styles.ctaButton, { backgroundColor: theme.text }]}>
                    <Text style={[styles.ctaText, { color: theme.primary }]}>حللي منتجاتك الآن مجاناً</Text>
                    <View style={[styles.ctaIcon, { backgroundColor: theme.primary }]}>
                        <FontAwesome5 name="arrow-left" size={12} color={theme.text} />
                    </View>
                </View>

                <View style={styles.socialRow}>
                    <View style={styles.socialItem}>
                        <FontAwesome5 name="instagram" size={14} color={theme.accent} />
                        <Text style={[styles.socialText, { color: theme.text }]}>wathiq.ai</Text>
                    </View>
                    <View style={[styles.socialSep, { backgroundColor: theme.border }]} />
                    <View style={styles.socialItem}>
                        <FontAwesome5 name="facebook" size={14} color={theme.accent} />
                        <Text style={[styles.socialText, { color: theme.text }]}>وثيق محلل المكونات</Text>
                    </View>
                </View>
                
                <Text style={[styles.brandLink, { color: theme.accent }]}>WWW.WATHIQ.WEB.APP</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: 600, height: 1066, padding: 45, justifyContent: 'space-between' },
    
    heroSection: { width: '100%', alignItems: 'center', marginTop: 5 },
    imageContainer: { width: '100%', height: 380, borderRadius: 50, borderWidth: 1, overflow: 'hidden', position: 'relative' },
    imageClipper: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' },
    scoreBadge: { 
        position: 'absolute', bottom: 20, right: 20, 
        paddingHorizontal: 18, paddingVertical: 10, 
        borderRadius: 22, alignItems: 'center', elevation: 5 
    },
    scoreValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 32 },
    scoreLabel: { fontFamily: 'Tajawal-Bold', fontSize: 9, marginTop: -4 },

    infoSection: { width: '100%', alignItems: 'center', marginVertical: 15 },
    pType: { fontFamily: 'Tajawal-Bold', fontSize: 16, marginBottom: 5, opacity: 0.8 },
    pName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 38, textAlign: 'center', marginBottom: 15 },
    verdictWrapper: { 
        flexDirection: 'row-reverse', alignItems: 'center', gap: 12, 
        paddingHorizontal: 22, paddingVertical: 15, 
        borderRadius: 25, borderWidth: 1, width: '100%' 
    },
    verdictText: { fontFamily: 'Tajawal-Bold', fontSize: 20, flex: 1, textAlign: 'right', lineHeight: 28 },

    claimsSection: { width: '100%', gap: 10 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, textAlign: 'right', marginBottom: 2, marginRight: 10 },
    claimCard: { 
        flexDirection: 'row-reverse', alignItems: 'center', 
        padding: 18, borderRadius: 25, borderWidth: 1, gap: 15 
    },
    claimIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    claimText: { fontFamily: 'Tajawal-Bold', fontSize: 17, flex: 1, textAlign: 'right' },

    footer: { width: '100%', alignItems: 'center', gap: 12, paddingBottom: 5 },
    disclaimerBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 15 },
    disclaimerText: { fontFamily: 'Tajawal-Medium', fontSize: 11, textAlign: 'right', opacity: 0.6, flex: 1 },
    
    ctaButton: { 
        flexDirection: 'row-reverse', alignItems: 'center', 
        paddingHorizontal: 25, paddingVertical: 14, 
        borderRadius: 30, gap: 12, width: '100%', justifyContent: 'center' 
    },
    ctaText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 19 },
    ctaIcon: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },

    socialRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15, marginTop: 5 },
    socialItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    socialText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    socialSep: { width: 1, height: 12, opacity: 0.3 },

    brandLink: { fontFamily: 'Tajawal-ExtraBold', fontSize: 14, letterSpacing: 3, opacity: 0.4, marginTop: 5 }
});