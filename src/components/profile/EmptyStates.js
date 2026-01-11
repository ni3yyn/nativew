import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
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
const WathiqButton = ({ label, icon, iconFamily = "MaterialIcons", onPress }) => {
    const IconComponent = iconFamily === "MaterialCommunityIcons" ? MaterialCommunityIcons : MaterialIcons;

    return (
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
                <IconComponent name={icon} size={18} color={COLORS.textOnAccent} />
                <Text style={styles.actionButtonText}>{label}</Text>
            </LinearGradient>
        </Pressable>
    );
};

// --- 1. SHELF EMPTY STATE (Updated for Dock) ---
export const ShelfEmptyState = ({ onPress }) => (
    <FadeInView>
        <View style={styles.container}>
            <View style={styles.iconCircle}>
                <Image 
                    source={require('../../../assets/icon.png')} 
                    style={{ width: 80, height: 80, resizeMode: 'contain' }} 
                />
            </View>
            
            <Text style={styles.title}>أهلاً بك في وثيق</Text>
            <Text style={styles.description}>
                للبدء في تحليل بشرتك وبناء روتينك، نحتاج أولاً لمعرفة المنتجات التي تملكينها.
            </Text>

            <View style={styles.featuresList}>
                <FeatureItem icon="photo-camera" text="اضغطي على زر الكاميرا العائم في الأسفل" />
                <FeatureItem icon="qr-code-scanner" text="امسحي الباركود أو صوري المنتج" />
                <FeatureItem icon="insights" text="احصلي على تحليل فوري للمكونات" />
            </View>

            <WathiqButton label="فتح الكاميرا الآن" icon="add-a-photo" onPress={onPress} />
        </View>
    </FadeInView>
);

// --- 2. ANALYSIS EMPTY STATE ---
export const AnalysisEmptyState = ({ onPress }) => (
    <FadeInView>
        <View style={styles.container}>
            <LinearGradient
                colors={['rgba(90, 156, 132, 0.08)', 'transparent']}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.iconCircle, { borderColor: COLORS.gold }]}>
                <MaterialIcons name="donut-large" size={36} color={COLORS.gold} />
            </View>

            <Text style={styles.title}>التحليل بانتظار البيانات</Text>
            <Text style={styles.description}>
                يقوم وثيق بربط مكونات منتجاتك ببعضها البعض لكشف الفعالية والأمان.
            </Text>

            <View style={styles.featuresGrid}>
                <FeatureCard icon="health-and-safety" title="صحة الحاجز" desc="قياس الإجهاد الكيميائي" color={COLORS.success} />
                <FeatureCard icon="wb-sunny" title="المناخ والبشرة" desc="تحليل تأثير الطقس" color={COLORS.accentGreen} />
                <FeatureCard icon="verified" title="أهداف البشرة" desc="مدى توافق المنتجات" color={COLORS.gold} />
                <FeatureCard icon="warning" title="التعارضات" desc="تنبيهات الخلط الخاطئ" color={COLORS.danger} />
            </View>

            <View style={{ marginTop: 20 }}>
                <WathiqButton label="إضافة منتجات للتحليل" icon="playlist-add" onPress={onPress} />
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

            <Text style={styles.title}>بناء الروتين الذكي</Text>
            <Text style={styles.description}>
                اتركي خوارزمية وثيق ترتب منتجاتك تلقائياً للحصول على أقصى فعالية.
            </Text>

            <View style={styles.featuresList}>
                <FeatureItem icon="layers" text="الترتيب حسب اللزوجة (من الأخف للأثقل)" />
                <FeatureItem icon="wb-twilight" text="فصل المكونات النشطة (صباحاً ومساءً)" />
                <FeatureItem icon="shield" text="ضمان وجود طبقة الحماية والمرطب" />
            </View>

            <WathiqButton label="إنشاء روتين تلقائي" icon="auto-fix-high" onPress={onPress} />
        </View>
    </FadeInView>
);

// --- 4. INGREDIENTS EMPTY STATE ---
export const IngredientsEmptyState = () => (
    <FadeInView>
        <View style={[styles.container, { paddingVertical: 40 }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                <MaterialCommunityIcons name="flask-outline" size={36} color={COLORS.textDim} />
            </View>
            <Text style={[styles.title, { color: COLORS.textSecondary }]}>موسوعة المكونات</Text>
            <Text style={styles.description}>بعد إضافة منتج للرف، ستظهر هنا بطاقات تعريفية ذكية لكل مكون.</Text>
            <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 15, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Badge text="الإسم العلمي" icon="science" />
                <Badge text="الوظيفة" icon="work-outline" />
                <Badge text="الفوائد" icon="favorite-border" />
                <Badge text="تنبيهات السلامة" icon="warning-amber" />
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
                <MaterialIcons name="verified-user" size={36} color={COLORS.success} />
            </View>
            <Text style={[styles.title, { color: COLORS.success }]}>منتجاتك نظيفة</Text>
            <Text style={styles.description}>
                رائع! لم يتم العثور على مكونات "شديدة الخطورة" أو مواد صناعية قاسية في رفّك الحالي.
            </Text>
            <View style={{ marginTop: 10, paddingHorizontal: 15, paddingVertical: 8, backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
                <Text style={{ fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, fontSize: 12, textAlign: 'center' }}>
                    🌱 استمري في اختيار البدائل الصحية
                </Text>
            </View>
        </LinearGradient>
    </FadeInView>
);

// --- SUB-COMPONENTS (With Material Icons) ---

const FeatureItem = ({ icon, text }) => (
    <View style={styles.featureRow}>
        <View style={{width: 28, alignItems: 'center'}}>
             <MaterialIcons name={icon} size={18} color={COLORS.accentGreen} />
        </View>
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

const FeatureCard = ({ icon, title, desc, color }) => (
    <View style={[styles.featureCard, { borderColor: color + '40' }]}>
        <MaterialIcons name={icon} size={20} color={color} style={{ marginBottom: 8 }} />
        <Text style={styles.featureCardTitle}>{title}</Text>
        <Text style={styles.featureCardDesc}>{desc}</Text>
    </View>
);

const Badge = ({ text, icon }) => (
    <View style={styles.badge}>
        {icon && <MaterialIcons name={icon} size={10} color={COLORS.textDim} style={{marginLeft: 4}} />}
        <Text style={styles.badgeText}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 25,
        backgroundColor: COLORS.card,
        borderRadius: 28, // Material 3 uses more rounded corners
        borderWidth: 1,
        borderColor: COLORS.border,
        marginVertical: 10,
        overflow: 'hidden',
        width: '100%',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 24, // Squircle-ish
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
        gap: 14,
        marginBottom: 25,
    },
    featureRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    featureText: {
        fontFamily: 'Tajawal-Bold', // Bolder for readability
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
        padding: 14,
        borderRadius: 18,
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
        borderRadius: 16,
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
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 32,
    },
    actionButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: COLORS.textOnAccent,
    },
    badge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    badgeText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: COLORS.textDim,
    }
});