
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// --- DECORATIVE LAYER ---
const BackgroundDecor = ({ theme }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Large Arc & Circles */}
        <View style={{ position: 'absolute', bottom: -150, left: 0, right: 0, height: 350, borderTopLeftRadius: 300, borderTopRightRadius: 300, backgroundColor: theme.accent, opacity: 0.1 }} />
        <View style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: theme.text, opacity: 0.08 }} />
        
        {/* Densely Floating Stars and Sparkles */}
        <FontAwesome5 name="star" size={18} color={theme.text} style={{ position: 'absolute', top: 150, right: 40, opacity: 0.3 }} />
        <FontAwesome5 name="star" size={12} color={theme.text} style={{ position: 'absolute', top: 180, right: 80, opacity: 0.2 }} />
        <FontAwesome5 name="star" size={24} color={theme.accent} style={{ position: 'absolute', top: '40%', left: 30, opacity: 0.15, transform: [{rotate: '20deg'}] }} />
        
        <Ionicons name="heart-outline" size={32} color={theme.accent} style={{ position: 'absolute', bottom: 400, right: 30, opacity: 0.2 }} />
        <Ionicons name="sparkles" size={50} color={theme.text} style={{ position: 'absolute', bottom: 120, left: 50, opacity: 0.1 }} />
        
        <MaterialCommunityIcons name="star-shooting-outline" size={60} color={theme.accent} style={{ position: 'absolute', top: '15%', left: '20%', opacity: 0.08, transform: [{rotate: '-10deg'}] }} />
        <MaterialCommunityIcons name="flower-outline" size={80} color={theme.text} style={{ position: 'absolute', bottom: '25%', right: -20, opacity: 0.05 }} />
        
        <View style={{ position: 'absolute', top: 300, right: 20, width: 12, height: 12, borderRadius: 6, backgroundColor: theme.accent, opacity: 0.3 }} />
        <View style={{ position: 'absolute', top: 320, right: 50, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.text, opacity: 0.2 }} />
    </View>
);

// --- HELPER FOR CLAIMS ---
const getClaimStyle = (status) => {
    if (status.includes('✅')) return { color: '#10B981', icon: 'check' };
    if (status.includes('🌿')) return { color: '#06B6D4', icon: 'leaf' };
    if (status.includes('⚠️') || status.includes('Angel')) return { color: '#F59E0B', icon: 'exclamation', note: '(نسبة غير فعالة)' };
    // Red for both Lies and No Evidence
    return { color: '#EF4444', icon: 'times' };
};

export default function Template06({ analysis, typeLabel, productName, imageUri, theme, imgPos }) {
    const safe = analysis || {};
    const claims = (safe.marketing_results || []).slice(0, 3);
    const safetyScore = safe.safety?.score || 0;
    const efficacyScore = safe.efficacy?.score || 0;

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
                        <Text style={[styles.scoreLabel, { color: theme.primary }]}>درجة وثيق</Text>
                    </View>
                </View>
            </View>

            <View style={styles.infoSection}>
                <Text style={[styles.pType, { color: theme.accent }]}>{typeLabel}</Text>
                <Text style={[styles.pName, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                    {productName || "اسم المنتج"}
                </Text>
                
                <View style={styles.statsRow}>
                    <View style={[styles.statPill, { borderColor: theme.border, backgroundColor: `${theme.text}10` }]}>
                        <Ionicons name="shield-checkmark" size={18} color={theme.accent} />
                        <Text style={[styles.statText, { color: theme.text }]}>أمان {safetyScore}%</Text>
                    </View>
                    <View style={[styles.statPill, { borderColor: theme.border, backgroundColor: `${theme.text}10` }]}>
                        <Ionicons name="star" size={18} color={theme.accent} />
                        <Text style={[styles.statText, { color: theme.text }]}>فعالية {efficacyScore}%</Text>
                    </View>
                </View>

                <View style={[styles.verdictWrapper, { backgroundColor: `${theme.accent}10`, borderColor: theme.border }]}>
                    <Ionicons name="flask-outline" size={26} color={theme.accent} />
                    <Text style={[styles.verdictText, { color: theme.text }]}>
                        {safe.finalVerdict}
                    </Text>
                </View>
            </View>

            <View style={styles.claimsSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>تحليل الوعود التسويقية:</Text>
                {claims.map((c, i) => {
                    const style = getClaimStyle(c.status);
                    return (
                        <View key={i} style={[styles.claimCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                            <View style={[styles.claimIcon, { backgroundColor: theme.accent }]}>
                                <FontAwesome5 name={style.icon} size={14} color={style.color === '#EF4444' ? '#EF4444' : theme.primary} />
                            </View>
                            <Text style={[styles.claimText, { color: theme.text }]} numberOfLines={2}>
                                {c.claim} {style.note && <Text style={{color: style.color, fontSize: 12}}>{style.note}</Text>}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <View style={styles.footer}>
                <View style={styles.disclaimerBox}>
                    <MaterialCommunityIcons name="information-variant" size={18} color={theme.text} style={{ opacity: 0.5 }} />
                    <Text style={[styles.disclaimerText, { color: theme.text }]}>
                        *هذه النتيجة شخصية؛ قد تختلف الاستجابة حسب المستخدم.
                    </Text>
                </View>

                <View style={[styles.ctaButton, { backgroundColor: theme.text }]}>
                    <Text style={[styles.ctaText, { color: theme.primary }]}>حللي منتجاتك الآن مجاناً</Text>
                    <View style={[styles.ctaIcon, { backgroundColor: theme.primary }]}>
                        <FontAwesome5 name="arrow-left" size={14} color={theme.text} />
                    </View>
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
                
                <Text style={[styles.brandLink, { color: theme.accent }]}>WWW.WATHIQ.WEB.APP</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: 600, height: 1066, padding: 45, justifyContent: 'space-between' },
    heroSection: { width: '100%', alignItems: 'center', marginTop: 5 },
    imageContainer: { width: '100%', height: 350, borderRadius: 50, borderWidth: 1.5, overflow: 'hidden', position: 'relative' },
    imageClipper: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' },
    scoreBadge: { position: 'absolute', bottom: 20, right: 20, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 25, alignItems: 'center', elevation: 5 },
    scoreValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 48 },
    scoreLabel: { fontFamily: 'Tajawal-Bold', fontSize: 12, marginTop: -4 },
    infoSection: { width: '100%', alignItems: 'center', marginVertical: 10 },
    pType: { fontFamily: 'Tajawal-Bold', fontSize: 18, marginBottom: 5, opacity: 0.8 },
    pName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 42, textAlign: 'center', marginBottom: 10 },
    statsRow: { flexDirection: 'row-reverse', gap: 15, marginBottom: 15 },
    statPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
    statText: { fontFamily: 'Tajawal-Bold', fontSize: 21 },
    verdictWrapper: { flexDirection: 'row-reverse', alignItems: 'center', gap: 15, paddingHorizontal: 25, paddingVertical: 18, borderRadius: 30, borderWidth: 1.5, width: '100%' },
    verdictText: { fontFamily: 'Tajawal-Bold', fontSize: 24, flex: 1, textAlign: 'right', lineHeight: 32 },
    claimsSection: { width: '100%', gap: 12 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 22, textAlign: 'right', marginBottom: 2, marginRight: 10 },
    claimCard: { flexDirection: 'row-reverse', alignItems: 'center', padding: 20, borderRadius: 25, borderWidth: 1.5, gap: 15 },
    claimIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    claimText: { fontFamily: 'Tajawal-Bold', fontSize: 21, flex: 1, textAlign: 'right' },
    footer: { width: '100%', alignItems: 'center', gap: 12, paddingBottom: 5 },
    disclaimerBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 15 },
    disclaimerText: { fontFamily: 'Tajawal-Regular', fontSize: 17, textAlign: 'right', opacity: 0.6, flex: 1 },
    ctaButton: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 16, borderRadius: 35, gap: 15, width: '100%', justifyContent: 'center' },
    ctaText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 22 },
    ctaIcon: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    socialRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 18, marginTop: 5 },
    socialItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    socialText: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    socialSep: { width: 2, height: 16, opacity: 0.3 },
    brandLink: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, letterSpacing: 3, opacity: 0.4, marginTop: 5 }
});