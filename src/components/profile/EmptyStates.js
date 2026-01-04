import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
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
  success: '#22c55e',
  danger: '#ef4444'
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
const WathiqButton = ({ label, icon, onPress }) => (
    <Pressable
        onPress={() => {
            Haptics.selectionAsync();
            onPress();
        }}
        style={({ pressed }) => [
            styles.actionButton,
            { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
        ]}
    >
        <LinearGradient
            colors={[COLORS.accentGreen, '#4a8a73']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
        >
            <FontAwesome5 name={icon} size={14} color={COLORS.textOnAccent} />
            <Text style={styles.actionButtonText}>{label}</Text>
        </LinearGradient>
    </Pressable>
);

// --- 1. SHELF EMPTY STATE ---
export const ShelfEmptyState = ({ onPress }) => (
    <FadeInView>
        <View style={styles.container}>
        <View style={styles.iconCircle}>
                {/* Replaced Icon with App Logo */}
                <Image 
                    source={require('../../../assets/icon.png')} // Ensure this path matches your assets folder
                    style={{ width: 80, height: 80, resizeMode: 'contain' }} 
                />
            </View>
            
            <Text style={styles.title}>أهلاً بك في وثيق</Text>
            <Text style={styles.description}>
                للبدء في تحليل بشرتك وبناء روتينك، نحتاج أولاً لمعرفة المنتجات التي تملكينها.
            </Text>

            <View style={styles.featuresList}>
                <FeatureItem icon="plus" text="افحصي منتجك عبر الضغط على علامة '+' ثم 'فحص منتج'" />
                <FeatureItem icon="save" text="احفظي المنتج من صفحة النتائج" />
                <FeatureItem icon="trash" text="يمكنك حذف المنتجات المحفوظة عبر سحبها لليسار"/>
            </View>

            <WathiqButton label="أضف أول منتج للرف" icon="plus" onPress={onPress} />
        </View>
    </FadeInView>
);

// --- 2. ANALYSIS EMPTY STATE ---
// Aligned with generateProfileAnalysis & calculateBarrierHealth in logic
export const AnalysisEmptyState = ({ onPress }) => (
    <FadeInView>
        <View style={styles.container}>
            <LinearGradient
                colors={['rgba(90, 156, 132, 0.08)', 'transparent']}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.iconCircle, { borderColor: COLORS.gold }]}>
                <FontAwesome5 name="chart-pie" size={32} color={COLORS.gold} />
            </View>

            <Text style={styles.title}>تحليل وثيق بانتظار البيانات</Text>
            <Text style={styles.description}>
                يقوم وثيق بربط مكونات منتجاتك ببعضها البعض لكشف الفعالية والأمان.
            </Text>

            <View style={styles.featuresGrid}>
                <FeatureCard icon="shield-alt" title="صحة الحاجز" desc="قياس نسبة الإجهاد الكيميائي" color={COLORS.success} />
                <FeatureCard icon="cloud-sun" title="المناخ والبشرة" desc="تحليل تأثير الطقس الموضعي" color={COLORS.accentGreen} />
                <FeatureCard icon="check-double" title="أهداف البشرة" desc="مدى توافق المنتجات مع أهدافك" color={COLORS.gold} />
                <FeatureCard icon="exclamation-circle" title="التعارضات" desc="تنبيهات الخلط الخاطئ وال pH" color={COLORS.danger} />
            </View>

            <View style={{ marginTop: 20 }}>
                <WathiqButton label="إضافة منتجات للتحليل" icon="arrow-left" onPress={onPress} />
            </View>
        </View>
    </FadeInView>
);

// --- 3. ROUTINE EMPTY STATE ---
// Aligned with generateSmartRoutine in logic (Viscosity & Layering)
export const RoutineEmptyState = ({ onPress }) => (
    <FadeInView>
        <View style={[styles.container, { borderStyle: 'dashed' }]}>
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="timeline-text-outline" size={40} color={COLORS.textSecondary} />
            </View>

            <Text style={styles.title}>بناء الروتين الذكي</Text>
            <Text style={styles.description}>
                يمكنك ترتيب روتينك يدوياً، أو ترك خوارزمية وثيق تقوم بذلك بناءً على:
            </Text>

            <View style={styles.featuresList}>
                <FeatureItem icon="layer-group" text="الترتيب حسب اللزوجة (من الأخف للأثقل)" />
                <FeatureItem icon="vial" text="فصل المكونات النشطة (صباحاً ومساءً)" />
                <FeatureItem icon="shield-alt" text="ضمان وجود طبقة الحماية والمرطب" />
            </View>

            <WathiqButton label="إنشاء خطوة جديدة" icon="plus-circle" onPress={onPress} />
        </View>
    </FadeInView>
);

// --- 4. INGREDIENTS EMPTY STATE ---
export const IngredientsEmptyState = () => (
    <FadeInView>
        <View style={[styles.container, { paddingVertical: 40 }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                <FontAwesome5 name="flask" size={32} color={COLORS.textDim} />
            </View>
            <Text style={[styles.title, { color: COLORS.textSecondary }]}>موسوعة المكونات</Text>
            <Text style={styles.description}>بعد إضافة منتج للرف، تجدين هنا بطافة تعريفية لمكوناته تجدين فيها</Text>
            <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 15, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Badge text="الإسم العلمي للمكون" />
                <Badge text="وظيفته في المنتج" />
                <Badge text="فوائده " />
                <Badge text="تنبيهات السلامة" />
                <Badge text="تفاعله مع بعض المكونات إن وجدت" />
            </View>
        </View>
    </FadeInView>
);

// --- 5. MIGRATION (GOOD) EMPTY STATE ---
export const MigrationSuccessState = () => (
    <FadeInView>
        <LinearGradient
            colors={['rgba(34, 197, 94, 0.1)', 'rgba(34, 197, 94, 0.01)']}
            style={[styles.container, { borderColor: 'rgba(34, 197, 94, 0.2)' }]}
        >
            <View style={[styles.iconCircle, { borderColor: COLORS.success, backgroundColor: 'rgba(34, 197, 94, 0.05)' }]}>
                <FontAwesome5 name="check" size={30} color={COLORS.success} />
            </View>
            <Text style={[styles.title, { color: COLORS.success }]}>منتجاتك نظيفة</Text>
            <Text style={styles.description}>
                حسب معايير وثيق، لم يتم العثور على مكونات "شديدة الخطورة" أو مواد صناعية قاسية (مثل البارابين والسلفات) في رفّك الحالي.
            </Text>
            <View style={{ marginTop: 10, paddingHorizontal: 15, paddingVertical: 8, backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
                <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, fontSize: 12, textAlign: 'center' }}>
                    🌱 استمري في اختيار البدائل الصحية
                </Text>
            </View>
        </LinearGradient>
    </FadeInView>
);

// --- SUB-COMPONENTS ---

const FeatureItem = ({ icon, text }) => (
    <View style={styles.featureRow}>
        <View style={{width: 24, alignItems: 'center'}}>
             <FontAwesome5 name={icon} size={12} color={COLORS.accentGreen} />
        </View>
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

const FeatureCard = ({ icon, title, desc, color }) => (
    <View style={[styles.featureCard, { borderColor: color + '40' }]}>
        <FontAwesome5 name={icon} size={14} color={color} style={{ marginBottom: 8 }} />
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
        overflow: 'hidden',
        width: '100%',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(90, 156, 132, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(90, 156, 132, 0.2)',
    },
    wathiqicon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(90, 156, 132, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(90, 156, 132, 0.2)',
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
        marginBottom: 24,
        maxWidth: '95%',
    },
    featuresList: {
        alignSelf: 'stretch',
        paddingHorizontal: 5,
        gap: 12,
        marginBottom: 25,
    },
    featureRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.textPrimary,
        textAlign: 'right',
        flex: 1,
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
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
    },
    featureCardTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.textPrimary,
        marginBottom: 4,
        textAlign: 'center',
    },
    featureCardDesc: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 14,
    },
    actionButton: {
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: COLORS.accentGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    actionButtonGradient: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 32,
    },
    actionButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: COLORS.textOnAccent,
    },
    badge: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    badgeText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: COLORS.textDim,
    }
});