

import React from 'react';
import { t } from '../../../i18n';
import { useCurrentLanguage } from '../../../hooks/useCurrentLanguage';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// --- DECORATIVE LAYER ---
const BackgroundDecor = ({ theme }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Blobs */}
        <View style={{ position: 'absolute', top: -50, left: '10%', width: 450, height: 450, borderRadius: 225, backgroundColor: theme.accent, opacity: 0.12 }} />
        <View style={{ position: 'absolute', bottom: 150, right: -80, width: 300, height: 300, borderRadius: 150, backgroundColor: theme.text, opacity: 0.08 }} />
        
        {/* Floating Science & Beauty Icons */}
        <MaterialCommunityIcons name="flask-round-bottom-outline" size={100} color={theme.accent} style={{ position: 'absolute', top: 40, right: 20, opacity: 0.07, transform: [{ rotate: '15deg' }] }} />
        <Ionicons name="sparkles" size={40} color={theme.accent} style={{ position: 'absolute', top: 450, left: 40, opacity: 0.3 }} />
        <Ionicons name="sparkles-outline" size={24} color={theme.text} style={{ position: 'absolute', top: 480, left: 80, opacity: 0.2 }} />
        
        <MaterialCommunityIcons name="dna" size={70} color={theme.text} style={{ position: 'absolute', bottom: '30%', left: 20, opacity: 0.06, transform: [{ rotate: '-45deg' }] }} />
        <MaterialCommunityIcons name="star-three-points" size={30} color={theme.accent} style={{ position: 'absolute', bottom: 420, right: 50, opacity: 0.2 }} />
        
        <FontAwesome5 name="magic" size={24} color={theme.accent} style={{ position: 'absolute', bottom: 200, left: 100, opacity: 0.1, transform: [{ rotate: '20deg' }] }} />
    </View>
);

// --- HELPER FOR CLAIMS ---
const getClaimStyle = (status, language) => {
    if (status.includes('✅')) return { color: '#10B981', icon: 'check', bg: '#10B981' };
    if (status.includes('🌿')) return { color: '#06B6D4', icon: 'leaf', bg: '#06B6D4' };
    if (status.includes('⚠️') || status.includes('Angel')) return { color: '#F59E0B', icon: 'exclamation', bg: '#F59E0B', note: t('oilguard_ineffective_ratio', language) };
    // Red for both Lies and No Evidence
    return { color: '#EF4444', icon: 'times', bg: '#EF4444' };
};

export default function Template04({ analysis, typeLabel, productName, imageUri, theme, imgPos }) {
    const language = useCurrentLanguage();
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
                            <Text style={[styles.scoreLabel, { color: theme.primary }]}>{t('oilguard_brand_score', language)}</Text>
                        </View>
                        <View style={[styles.subScorePill, { borderColor: theme.border }]}>
                            <Text style={[styles.subScoreText, { color: theme.text }]}>${t('oilguard_safety', language)} {safetyScore}%</Text>
                        </View>
                        <View style={[styles.subScorePill, { borderColor: theme.border }]}>
                            <Text style={[styles.subScoreText, { color: theme.text }]}>${t('oilguard_efficacy', language)} {efficacyScore}%</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.verdictBlock}>
                    <Text style={[styles.pName, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                        {productName || t('community_product', language)}
                    </Text>
                    <Text style={[styles.pType, { color: theme.accent }]}>{typeLabel}</Text>
                    
                    <View style={[styles.verdictWrapper, { backgroundColor: `${theme.accent}20` }]}>
                        <Ionicons name="flask-outline" size={24} color={theme.accent} />
                        <Text style={[styles.verdictText, { color: theme.text }]}>
                            {safe.finalVerdict}
                        </Text>
                    </View>
                </View>

            </View>

            <View style={styles.claimsSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('oilguard_marketing_analysis', language)}:</Text>
                {claims.map((c, i) => {
                    const style = getClaimStyle(c.status, language);
                    return (
                        <View key={i} style={[styles.claimCard, { backgroundColor: theme.glass, borderColor: theme.border }]}>
                            <View style={[styles.claimIcon, { backgroundColor: style.bg }]}>
                                <FontAwesome5 name={style.icon} size={14} color={theme.primary} />
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
                    <MaterialCommunityIcons name="information-variant" size={16} color={theme.text} style={{ opacity: 0.5 }} />
                    <Text style={[styles.disclaimerText, { color: theme.text }]}>
                    ${t('oilguard_disclaimer', language)}
                    </Text>
                </View>

                <View style={[styles.ctaButton, { backgroundColor: theme.text }]}>
                    <Text style={[styles.ctaText, { color: theme.primary }]}>حللي منتجاتك مجانا عبر WATHIQ.WEB.APP</Text>
                </View>

                <View style={styles.socialRow}>
                    <FontAwesome5 name="instagram" size={16} color={theme.accent} />
                    <Text style={[styles.socialText, { color: theme.text }]}>wathiq.ai</Text>
                    <View style={[styles.socialSep, { backgroundColor: theme.border }]} />
                    <FontAwesome5 name="facebook" size={16} color={theme.accent} />
                    <Text style={[styles.socialText, { color: theme.text }]}>{t('oilguard_brand_name', language)}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: 600, height: 1066, padding: 40, justifyContent: 'space-between' },
    compactBlock: { padding: 30, borderRadius: 40, borderWidth: 1.5, width: '100%', marginBottom: 20 },
    imageScoreRow: { flexDirection: 'row-reverse', gap: 20, marginBottom: 20 },
    imageContainer: { flex: 1.5, height: 300, borderRadius: 35, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' },
    imageClipper: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', overflow: 'hidden' },
    scoreCol: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },
    mainScorePill: { width: '100%', padding: 15, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 5 },
    scoreValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 54 },
    scoreLabel: { fontFamily: 'Tajawal-Bold', fontSize: 14, marginTop: -4 },
    subScorePill: { width: '100%', padding: 12, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    subScoreText: { fontFamily: 'Tajawal-Bold', fontSize: 17 },
    verdictBlock: { width: '100%', alignItems: 'center' },
    pName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 40, textAlign: 'center', marginBottom: 5 },
    pType: { fontFamily: 'Tajawal-Bold', fontSize: 18, opacity: 0.8, marginBottom: 15 },
    verdictWrapper: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 25, width: '100%' },
    verdictText: { fontFamily: 'Tajawal-Bold', fontSize: 22, flex: 1, textAlign: 'right', lineHeight: 30 },
    claimsSection: { width: '100%', gap: 10 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 22, textAlign: 'right', marginBottom: 5, marginRight: 10 },
    claimCard: { flexDirection: 'row-reverse', alignItems: 'center', padding: 20, borderRadius: 25, borderWidth: 1.5, gap: 15 },
    claimIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    claimText: { fontFamily: 'Tajawal-Bold', fontSize: 20, flex: 1, textAlign: 'right' },
    footer: { width: '100%', alignItems: 'center', gap: 12, paddingBottom: 5, marginTop: 10 },
    disclaimerBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 15 },
    disclaimerText: { fontFamily: 'Tajawal-Regular', fontSize: 17, textAlign: 'right', opacity: 0.7, flex: 1 },
    ctaButton: { paddingHorizontal: 25, paddingVertical: 16, borderRadius: 30, width: '100%' },
    ctaText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, textAlign: 'center' },
    socialRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginTop: 5 },
    socialText: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    socialSep: { width: 2, height: 16, marginHorizontal: 8, opacity: 0.4 }
});