import React from 'react';
import { t } from '../../../i18n';
import { useCurrentLanguage } from '../../../hooks/useCurrentLanguage';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

// --- DECORATIVE LAYER ---
const BackgroundDecor = ({ theme }) => (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ position: 'absolute', top: 50, left: -50, width: 200, height: 200, borderRadius: 40, backgroundColor: theme.accent, opacity: 0.12, transform: [{ rotate: '25deg' }] }} />
        <View style={{ position: 'absolute', top: 100, right: 30, flexDirection: 'row', gap: 5, opacity: 0.4 }}>{[1,2,3].map(i => <View key={i} style={{width: 6, height: 6, borderRadius: 3, backgroundColor: theme.text}} />)}</View>
        <View style={{ position: 'absolute', bottom: -100, right: -50, width: 500, height: 300, borderRadius: 150, backgroundColor: theme.text, opacity: 0.08, }} />
        <MaterialCommunityIcons name="star-four-points" size={36} color={theme.text} style={{ position: 'absolute', bottom: 120, left: 40, opacity: 0.2 }} />
    </View>
);

// --- HELPER FOR CLAIMS ---
const getClaimStyle = (status, language) => {
    if (status.includes('✅')) return { color: '#10B981', icon: 'checkmark', bg: '#10B98120' }; // Verified
    if (status.includes('🌿')) return { color: '#06B6D4', icon: 'leaf', bg: '#06B6D420' }; // Moderate
    if (status.includes('⚠️') || status.includes('Angel')) return { color: '#F59E0B', icon: 'alert', bg: '#F59E0B20', note: t('oilguard_ineffective_ratio', language) }; // Angel
    // Red for both Lies and No Evidence
    return { color: '#EF4444', icon: 'close', bg: '#EF444420' };
};

export default function Template02({ analysis, typeLabel, productName, imageUri, theme, imgPos }) {
    const language = useCurrentLanguage();
    
    // Define WathiqLogo inside the component
    const WathiqLogo = ({ color }) => (
        <View style={{ alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 48, color, letterSpacing: 4 }}>
                {t('oilguard_wathiq_label', language)}
            </Text>
        </View>
    );
    
    // Define ScoreRing inside the component to access language
    const ScoreRing = ({ score, theme }) => {
        const size = 140; const r = 55; const circ = 2 * Math.PI * r;
        const color = score >= 80 ? '#10B981' : score >= 50 ? theme.accent : '#EF4444';
        return (
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                    <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.text} strokeOpacity="0.1" strokeWidth="10" fill="none" />
                    <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="10" fill="none" strokeDasharray={circ} strokeDashoffset={circ - (score / 100) * circ} strokeLinecap="round" />
                </Svg>
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 42, color: theme.text }}>{score}</Text>
                    <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 11, color: theme.text, opacity: 0.6 }}>{t('oilguard_brand_score', language)}</Text>
                </View>
            </View>
        );
    };
    
    const safe = analysis || {};
    const safetyScore = safe.safety?.score || 0;
    const efficacyScore = safe.efficacy?.score || 0;
    const oilGuardScore = safe.oilGuardScore || 0;
    const marketingResults = (safe.marketing_results || []).slice(0, 4);

    return (
        <View style={[styles.templateContainer, { backgroundColor: theme.primary }]}>
            <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFill} />
            <BackgroundDecor theme={theme} />

            <View style={styles.header}>
                <WathiqLogo color={theme.text} />
                <Text style={[styles.subHeader, { color: theme.accent }]}>رفيقك لبشرة و شعر صحيين</Text>
            </View>

            <View style={[styles.glassCard, { borderColor: theme.border, backgroundColor: theme.glass }]}>
                
                <View style={styles.imageHeaderContainer}>
                    {imageUri && (
                        <View style={[styles.imageClipper, { borderRadius: 40 }]}>
                            <Image source={{ uri: imageUri }} style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} resizeMode="cover" blurRadius={50} />
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
                            <Image 
                                source={{ uri: imageUri }} 
                                style={{ width: 600, height: 600, transform: [{ translateX: imgPos?.x || 0 }, { translateY: imgPos?.y || 0 }, { scale: imgPos?.scale || 1 }] }} 
                                resizeMode="contain" 
                            />
                        </View>
                    )}
                    <LinearGradient colors={['transparent', theme.glass]} style={styles.imageFade} />
                </View>

                <View style={styles.prodHeader}>
                    <Text style={[styles.productType, { color: theme.accent }]}>{typeLabel}</Text>
                    <Text style={[styles.productName, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{productName || "اسم المنتج..."}</Text>
                </View>

                <View style={styles.analysisRow}>
                    <ScoreRing score={oilGuardScore} theme={theme} />
                    <View style={styles.verdictCol}>
                        <Text style={[styles.verdictLabel, { color: theme.text, opacity: 0.7 }]}>الحكم النهائي</Text>
                        <Text style={[styles.verdictVal, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>{safe.finalVerdict}</Text>
                        
                        <View style={styles.pillContainer}>
                            <View style={[styles.pillBg, { backgroundColor: theme.text, opacity: 0.1 }]} />
                            <View style={styles.pillContent}>
                                <Text style={[styles.pillValue, { color: theme.text }]}>{safetyScore}%</Text>
                                <Text style={[styles.pillLabel, { color: theme.text }]}>أمان</Text>
                            </View>
                            <View style={[styles.pillSep, { backgroundColor: theme.text }]} />
                            <View style={styles.pillContent}>
                                <Text style={[styles.pillValue, { color: theme.text }]}>{efficacyScore}%</Text>
                                <Text style={[styles.pillLabel, { color: theme.text }]}>فعالية</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.claimsSection}>
                    <Text style={[styles.claimsTitle, { color: theme.accent }]}>تحليل الادعاءات:</Text>
                    <View style={styles.gridContainer}>
                        {marketingResults.map((item, i) => {
                            const style = getClaimStyle(item.status, language);
                            return (
                                <View key={i} style={[styles.gridItem, { borderColor: theme.border, backgroundColor: 'rgba(0,0,0,0.03)' }]}>
                                    <View style={[styles.iconCircle, { backgroundColor: style.bg }]}>
                                        <Ionicons name={style.icon} size={14} color={style.color} />
                                    </View>
                                    <Text style={[styles.gridText, { color: theme.text }]} numberOfLines={2}>
                                        {item.claim} {style.note && <Text style={{color: style.color, fontSize: 10}}>{style.note}</Text>}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

            </View>

            <View style={styles.footer}>
                <View style={[styles.ctaPill, { backgroundColor: theme.text }]}>
                    <View style={[styles.ctaIcon, { backgroundColor: theme.primary }]}>
                        <FontAwesome5 name="fingerprint" size={20} color={theme.text} />
                    </View>
                    <View>
                        <Text style={[styles.ctaAction, { color: theme.primary }]}>افحصي منتجاتك مجانا</Text>
                        <Text style={[styles.ctaLink, { color: theme.primary, opacity: 0.8 }]}>wathiq.web.app</Text>
                    </View>
                </View>
                
                <View style={styles.socialRow}>
                    <View style={styles.socialItem}><FontAwesome5 name="instagram" size={14} color={theme.accent} /><Text style={[styles.socialText, { color: theme.text }]}>wathiq.ai</Text></View>
                    <View style={[styles.socialSep, { backgroundColor: theme.border }]} />
                    <View style={styles.socialItem}><FontAwesome5 name="facebook" size={14} color={theme.accent} /><Text style={[styles.socialText, { color: theme.text }]}>{t('oilguard_brand_name', language)}</Text></View>
                </View>
                <Text style={[styles.disclaimerText, { color: theme.text }]}>هذه النتيجة شخصية؛ قد تختلف الاستجابة حسب المستخدم*.</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    templateContainer: { width: 600, height: 1066, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 40, paddingHorizontal: 35 },
    header: { width: '100%', alignItems: 'center', marginTop: 5 },
    subHeader: { fontFamily: 'Tajawal-Regular', fontSize: 22, letterSpacing: 2, marginTop: -5, opacity: 0.9 },
    glassCard: { width: '100%', flex: 1, borderRadius: 45, alignItems: 'center', borderWidth: 2, overflow: 'hidden', paddingBottom: 15, marginVertical: 15 },
    imageHeaderContainer: { width: '100%', flex: 1.2, minHeight: 180, position: 'relative' },
    imageClipper: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    imageFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80 },
    prodHeader: { width: '100%', alignItems: 'center', marginBottom: 10, paddingHorizontal: 20, marginTop: 10 },
    productType: { fontFamily: 'Tajawal-Regular', fontSize: 18, marginBottom: 2 },
    productName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 40, textAlign: 'center' },
    analysisRow: { flexDirection: 'row-reverse', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 25 },
    verdictCol: { flex: 1, paddingRight: 20, alignItems: 'flex-end' },
    verdictLabel: { fontSize: 14, fontFamily: 'Tajawal-Regular' },
    verdictVal: { fontSize: 28, fontFamily: 'Tajawal-ExtraBold', textAlign: 'right', width: '100%' },
    pillContainer: { flexDirection: 'row-reverse', marginTop: 10, borderRadius: 15, overflow: 'hidden', position: 'relative' },
    pillBg: { position: 'absolute', width: '100%', height: '100%' },
    pillContent: { paddingHorizontal: 15, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
    pillSep: { width: 1, height: '60%', alignSelf: 'center', opacity: 0.3 },
    pillValue: { fontSize: 22, fontFamily: 'Tajawal-Bold' },
    pillLabel: { fontSize: 16, fontFamily: 'Tajawal-Regular'},
    claimsSection: { width: '100%', paddingHorizontal: 20, paddingBottom: 10, flex: 1, justifyContent: 'center' },
    claimsTitle: { fontFamily: 'Tajawal-Bold', fontSize: 22, textAlign: 'right', marginBottom: 8, marginRight: 5 },
    gridContainer: { width: '100%', flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
    gridItem: { width: '48%', flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 18, borderWidth: 1.5, gap: 8 },
    iconCircle: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    gridText: { fontSize: 20, fontFamily: 'Tajawal-Bold', flex: 1, textAlign: 'right', lineHeight: 18 },
    footer: { width: '100%', alignItems: 'center', paddingBottom: 5, gap: 10 },
    ctaPill: { flexDirection: 'row-reverse', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25, alignItems: 'center', gap: 15 },
    ctaIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    ctaAction: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20 },
    ctaLink: { fontFamily: 'Tajawal-Regular', fontSize: 15 },
    socialRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 20, marginTop: 5 },
    socialItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    socialText: { fontFamily: 'Tajawal-Bold', fontSize: 14 },
    socialSep: { width: 2, height: 16, opacity: 0.3 },
    disclaimerText: { fontFamily: 'Tajawal-Regular', fontSize: 17, textAlign: 'center', opacity: 0.6, marginTop: 2 },
});