import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {router, useRouter} from 'expo-router';
import { FontAwesome5, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';


// --- THEME MATCHING PROFILE.JS ---
const COLORS = {
  background: '#1A2D27', 
  card: '#253D34',      
  border: 'rgba(90, 156, 132, 0.25)', 
  textDim: '#6B7C76',   
  accentGreen: '#5A9C84', 
  textPrimary: '#F1F3F2',   
  textSecondary: '#A3B1AC', 
  textOnAccent: '#1A2D27',  
  gold: '#fbbf24',
  success: '#22c55e'
};

// --- ANIMATED WRAPPER ---
const FadeInView = ({ children, delay = 0 }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 600,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY }] }}>
            {children}
        </Animated.View>
    );
};

// --- SHARED BUTTON ---
const PromoButton = ({ label, icon, onPress }) => (
    <Pressable
        onPress={() => {
            Haptics.selectionAsync();
            onPress();
        }}
        style={({ pressed }) => [
            styles.promoButton,
            { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
        ]}
    >
        <LinearGradient
            colors={[COLORS.accentGreen, '#4a8a73']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.promoButtonGradient}
        >
            <FontAwesome5 name={icon} size={14} color={COLORS.textOnAccent} />
            <Text style={styles.promoButtonText}>{label}</Text>
        </LinearGradient>
    </Pressable>
);

// --- 1. SHELF EMPTY STATE ---
export const ShelfEmptyState = ({ onPress }) => (
    <FadeInView>
        <View style={styles.container}>
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="bottle-tonic-plus" size={40} color={COLORS.accentGreen} />
            </View>
            
            <Text style={styles.title}>رفك الرقمي بانتظارك</Text>
            <Text style={styles.description}>
                ابدئي بتنظيم منتجاتك في مكان واحد. عند إضافة المنتجات، ستحصلين على:
            </Text>

            <View style={styles.featuresList}>
                <FeatureItem icon="sort-amount-down" text="ترتيب حسب تاريخ الفتح" />
                <FeatureItem icon="exclamation-triangle" text="تنبيهات انتهاء الصلاحية" />
                <FeatureItem icon="tags" text="تصنيف ذكي (غسول، سيروم...)" />
            </View>

            <PromoButton label="أضف أول منتج" icon="magic" onPress={onPress} />
        </View>
    </FadeInView>
);

// --- 2. ANALYSIS EMPTY STATE ---
export const AnalysisEmptyState = ({ onPress }) => (
    <FadeInView>
        <View style={styles.container}>
            <LinearGradient
                colors={['rgba(90, 156, 132, 0.1)', 'transparent']}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.iconCircle, { borderColor: COLORS.gold }]}>
                <FontAwesome5 name="microscope" size={32} color={COLORS.gold} />
            </View>

            <Text style={styles.title}>المعمل الذكي مغلق</Text>
            <Text style={styles.description}>
                يحتاج الذكاء الاصطناعي لمنتجات في رفّك ليبدأ العمل. أضيفي منتجاتك لتكتشفي:
            </Text>

            <View style={styles.featuresGrid}>
                <FeatureCard icon="shield-alt" title="صحة الحاجز" desc="قياس قوة حاجز البشرة" color={COLORS.success} />
                <FeatureCard icon="flask" title="تركيز المواد" desc="حساب نسبة المقشرات" color={COLORS.accentGreen} />
                <FeatureCard icon="sun" title="درع الشمس" desc="تقييم حماية الروتين" color={COLORS.gold} />
                <FeatureCard icon="random" title="التعارضات" desc="كشف الخلط الخاطئ" color="#ef4444" />
            </View>

            <View style={{ marginTop: 20 }}>
                <PromoButton label="تفعيل المعمل الرقمي" icon="plus" onPress={onPress} />
            </View>
        </View>
    </FadeInView>
);

// --- 3. ROUTINE EMPTY STATE ---
export const RoutineEmptyState = ({ onPress }) => (
    <FadeInView>
        <View style={[styles.container, { borderStyle: 'dashed' }]}>
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="timeline-clock-outline" size={40} color={COLORS.textSecondary} />
            </View>

            <Text style={styles.title}>لا يوجد روتين نشط</Text>
            <Text style={styles.description}>
                الروتين هو سر النتائج. يمكنك بناء روتين يدوي أو دعنا نقوم بذلك:
            </Text>

            <View style={styles.featuresList}>
                <FeatureItem icon="layer-group" text="ترتيب الطبقات الصحيح (Layering)" />
                <FeatureItem icon="moon" text="فصل مقشرات المساء عن الصباح" />
                <FeatureItem icon="robot" text="بناء ذكي بنقرة واحدة (Gen 9)" />
            </View>

            <PromoButton label="بناء روتين جديد" icon="layer-group" onPress={onPress} />
        </View>
    </FadeInView>
);

// --- 4. INGREDIENTS EMPTY STATE ---
export const IngredientsEmptyState = () => (
    <FadeInView>
        <View style={[styles.container, { paddingVertical: 40 }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                <FontAwesome5 name="atom" size={35} color={COLORS.textDim} />
            </View>
            <Text style={[styles.title, { color: COLORS.textSecondary }]}>الموسوعة فارغة</Text>
            <Text style={styles.description}>
                بمجرد إضافة منتجات، سنقوم باستخراج المادة الفعالة (Active Ingredients) وعرض:
            </Text>
            <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 15, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Badge text="الاسم العلمي" />
                <Badge text="الوظيفة" />
                <Badge text="درجة الأمان" />
                <Badge text="أبحاث علمية" />
            </View>
        </View>
    </FadeInView>
);

// --- 5. MIGRATION (GOOD) EMPTY STATE ---
export const MigrationSuccessState = () => (
    <FadeInView>
        <LinearGradient
            colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.02)']}
            style={[styles.container, { borderColor: 'rgba(34, 197, 94, 0.3)' }]}
        >
            <View style={[styles.iconCircle, { borderColor: COLORS.success, backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                <FontAwesome5 name="check-circle" size={35} color={COLORS.success} />
            </View>
            <Text style={[styles.title, { color: COLORS.success }]}>منتجاتك نظيفة!</Text>
            <Text style={styles.description}>
                رائع! لم نعثر على أي مكونات صناعية ضارة (بارابين، سلفات، زيوت معدنية) في رفّك الحالي.
            </Text>
            <View style={{ marginTop: 15, paddingHorizontal: 15, paddingVertical: 8, backgroundColor: COLORS.background, borderRadius: 12 }}>
                <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, fontSize: 12 }}>
                    🌱 استمري في اختيار البدائل الطبيعية
                </Text>
            </View>
        </LinearGradient>
    </FadeInView>
);

// --- SUB-COMPONENTS ---

const FeatureItem = ({ icon, text }) => (
    <View style={styles.featureRow}>
        <FontAwesome5 name={icon} size={12} color={COLORS.accentGreen} style={{ width: 20, textAlign: 'center' }} />
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

const FeatureCard = ({ icon, title, desc, color }) => (
    <View style={styles.featureCard}>
        <FontAwesome5 name={icon} size={16} color={color} style={{ marginBottom: 6 }} />
        <Text style={styles.featureCardTitle}>{title}</Text>
        <Text style={styles.featureCardDesc}>{desc}</Text>
    </View>
);

const Badge = ({ text }) => (
    <View style={styles.badge}>
        <Text style={styles.badgeText}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 25,
        backgroundColor: COLORS.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginVertical: 10,
        overflow: 'hidden'
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(90, 156, 132, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(90, 156, 132, 0.3)',
    },
    title: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        color: COLORS.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
        maxWidth: '90%',
    },
    featuresList: {
        alignSelf: 'stretch',
        paddingHorizontal: 10,
        gap: 12,
        marginBottom: 25,
    },
    featureRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.textPrimary,
        textAlign: 'right',
    },
    featuresGrid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
    },
    featureCard: {
        width: '45%',
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    featureCardTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.textPrimary,
        marginBottom: 2,
        textAlign: 'center',
    },
    featureCardDesc: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    promoButton: {
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: COLORS.accentGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    promoButtonGradient: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 30,
    },
    promoButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textOnAccent,
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    badgeText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: COLORS.textSecondary,
    }
});