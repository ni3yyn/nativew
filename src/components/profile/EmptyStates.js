import React, { useEffect, useRef, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, MaterialIcons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';


const FALLBACK_COLORS = {
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

// --- FAST SHIMMER BUTTON WRAPPER ---
const FastShimmerButton = ({ children }) => {
    const opacityAnim = useRef(new Animated.Value(0.8)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                    Animated.timing(opacityAnim, { toValue: 0.8, duration: 600, useNativeDriver: true })
                ]),
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.03, duration: 600, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true })
                ])
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return (
        <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }], width: '100%' }}>
            {children}
        </Animated.View>
    );
};

// --- SHARED BUTTON ---
const WathiqButton = ({ label, icon, iconFamily = "MaterialIcons", onPress, variant = 'primary' }) => {
    const { colors } = useTheme();
    const COLORS = colors || FALLBACK_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    const IconComponent = iconFamily === "MaterialCommunityIcons" ? MaterialCommunityIcons :
        iconFamily === "FontAwesome5" ? FontAwesome5 : MaterialIcons;

    const isPrimary = variant === 'primary';

    return (
        <Pressable
            onPress={() => {
                Haptics.selectionAsync();
                onPress();
            }}
            style={({ pressed }) => [
                styles.actionButton,
                !isPrimary && styles.actionButtonOutline,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
            ]}
        >
            {isPrimary ? (
                <LinearGradient
                    colors={[COLORS.accentGreen, COLORS.accentGreen + 'CC']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.actionButtonGradient}
                >
                    <IconComponent name={icon} size={18} color={COLORS.textOnAccent} />
                    <Text style={styles.actionButtonText}>{label}</Text>
                </LinearGradient>
            ) : (
                <View style={styles.actionButtonGradient}>
                    <IconComponent name={icon} size={18} color={COLORS.accentGreen} />
                    <Text style={[styles.actionButtonText, { color: COLORS.accentGreen }]}>{label}</Text>
                </View>
            )}
        </Pressable>
    );
};

// --- 1. SHELF EMPTY STATE (Updated with instruction step) ---
export const ShelfEmptyState = ({ onPress }) => {
    const { colors } = useTheme();
    const COLORS = colors || FALLBACK_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    return (
        <FadeInView>
            <View style={styles.container}>
                <View style={styles.iconCircle}>
                    <Image
                        source={require('../../../assets/icon.png')}
                        style={{ width: 80, height: 80, resizeMode: 'contain', opacity: 0.9 }}
                    />
                </View>

                <Text style={styles.title}>أهلا بك في وثيق</Text>
                <Text style={styles.description}>
                    للبدء في تحليل بشرتك وبناء روتينك، نحتاج أولا لمعرفة المنتجات التي تملكينها.
                </Text>

                <View style={styles.featuresList}>
                    <FeatureItem icon="touch-app" text="اضغطي على زر 'إضافة منتج' في الأسفل" styles={styles} COLORS={COLORS} />
                    <FeatureItem icon="qr-code-scanner" text="صوري قائمة مكونات المنتج" styles={styles} COLORS={COLORS} />
                    <FeatureItem icon="insights" text="احصلي على تحليل مفصل للمنتج ومكوناته" styles={styles} COLORS={COLORS} />
                    <FeatureItem icon="save" text="اضغطي على 'إضافة للرف'" styles={styles} COLORS={COLORS} />
                </View>

                <View style={{ width: '100%' }}>
                    <WathiqButton label="إضافة منتج الآن" icon="add-a-photo" onPress={onPress} />
                </View>
            </View>
        </FadeInView>
    );
};

// --- 2. ANALYSIS EMPTY STATE (Updated Layout + Shimmer) ---
export const AnalysisEmptyState = ({ onPress }) => {
    const { colors } = useTheme();
    const COLORS = colors || FALLBACK_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    return (
        <FadeInView>
            <View style={styles.container}>

                {/* 1. The Insistence Header */}
                <View style={styles.lockedHeader}>
                    <View style={[styles.iconCircle, { width: 50, height: 50, borderColor: COLORS.gold, backgroundColor: 'rgba(251, 191, 36, 0.1)' }]}>
                        <FontAwesome5 name="lock" size={20} color={COLORS.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.titleAlignRight}>التحليل بانتظار البيانات</Text>
                        <Text style={styles.descAlignRight}>يجب إضافة منتجات للرف لفتح التحليل.</Text>
                    </View>
                </View>

                {/* 2. The Steps Visual (Insistence) */}
                <View style={styles.stepsContainer}>
                    {/* Step 1: Active */}
                    <View style={styles.stepRow}>
                        <View style={styles.stepIndicatorContainer}>
                            <View style={[styles.stepDot, { borderColor: COLORS.danger, backgroundColor: COLORS.danger + '20' }]}>
                                <MaterialIcons name="priority-high" size={12} color={COLORS.danger} />
                            </View>
                            <View style={styles.stepLine} />
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={[styles.stepTitle, { color: COLORS.danger }]}>إضافة منتجات للرف</Text>
                            <Text style={styles.stepDesc}>الخطوة الأولى</Text>
                        </View>
                    </View>

                    {/* Step 2: Locked */}
                    <View style={styles.stepRow}>
                        <View style={styles.stepIndicatorContainer}>
                            <View style={styles.stepDotLocked} />
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitleLocked}>فتح لوحة التحليل الشاملة</Text>
                            <Text style={styles.stepDesc}>مغلق حالياً</Text>
                        </View>
                    </View>
                </View>

                {/* SHIMMER BUTTON: Under the Steps */}
                <View style={{ width: '100%', marginBottom: 15 }}>
                    <FastShimmerButton>
                        <WathiqButton label="إضافة منتجات للرف" icon="add" onPress={onPress} />
                    </FastShimmerButton>
                </View>

                <View style={styles.divider} />

                {/* 3. The Features (Motivation) */}
                <Text style={styles.sectionHeader}>مالذي ستحصلين عليه؟</Text>
                <View style={styles.featuresGrid}>
                    <FeatureCard icon="shield" title="صحة الحاجز" desc="قياس الإجهاد الكيميائي" color={COLORS.success} styles={styles} COLORS={COLORS} />
                    <FeatureCard icon="wb-sunny" title="المناخ والبشرة" desc="تحليل تأثير الطقس" color={COLORS.accentGreen} styles={styles} COLORS={COLORS} />
                    <FeatureCard icon="verified" title="أهداف البشرة" desc="مدى توافق المنتجات" color={COLORS.gold} styles={styles} COLORS={COLORS} />
                    <FeatureCard icon="warning" title="التعارضات" desc="تنبيهات الخلط الخاطئ" color={COLORS.danger} styles={styles} COLORS={COLORS} />
                </View>

            </View>
        </FadeInView>
    );
};

// --- 3. ROUTINE EMPTY STATE ---
export const RoutineEmptyState = ({ onPress }) => {
    const { colors } = useTheme();
    const COLORS = colors || FALLBACK_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    return (
        <FadeInView>
            <View style={[styles.container, { borderStyle: 'dashed' }]}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="timeline-clock-outline" size={40} color={COLORS.textSecondary} />
                </View>

                <Text style={styles.title}>بناء الروتين الذكي</Text>
                <Text style={styles.description}>
                    اتركي خوارزمية وثيق ترتب منتجاتك تلقائيا للحصول على أقصى فعالية.
                </Text>

                <View style={styles.featuresList}>
                    <FeatureItem icon="layers" text="الترتيب حسب اللزوجة (من الأخف للأثقل)" styles={styles} COLORS={COLORS} />
                    <FeatureItem icon="wb-twilight" text="فصل المكونات النشطة (صباحا ومساء)" styles={styles} COLORS={COLORS} />
                    <FeatureItem icon="shield" text="ضمان وجود طبقة الحماية والمرطب" styles={styles} COLORS={COLORS} />
                </View>

                <WathiqButton label="إنشاء روتين تلقائي" icon="auto-fix-high" onPress={onPress} />
            </View>
        </FadeInView>
    );
};

// --- 4. INGREDIENTS EMPTY STATE ---
export const IngredientsEmptyState = () => {
    const { colors } = useTheme();
    const COLORS = colors || FALLBACK_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    return (
        <FadeInView>
            <View style={[styles.container, { paddingVertical: 40 }]}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                    <MaterialCommunityIcons name="flask-outline" size={36} color={COLORS.textDim} />
                </View>
                <Text style={[styles.title, { color: COLORS.textSecondary }]}>موسوعة المكونات</Text>
                <Text style={styles.description}>بعد إضافة منتج للرف، ستظهر هنا بطاقات تعريفية ذكية لكل مكون.</Text>

                <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 15, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Badge text="الإسم العلمي" icon="science" styles={styles} COLORS={COLORS} />
                    <Badge text="الوظيفة" icon="work-outline" styles={styles} COLORS={COLORS} />
                    <Badge text="الفوائد" icon="favorite-border" styles={styles} COLORS={COLORS} />
                    <Badge text="تنبيهات السلامة" icon="warning-amber" styles={styles} COLORS={COLORS} />
                </View>
            </View>
        </FadeInView>
    );
};

// --- 5. MIGRATION (GOOD) EMPTY STATE ---
export const MigrationSuccessState = () => {
    const { colors } = useTheme();
    const COLORS = colors || FALLBACK_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);

    return (
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
};

// --- SUB-COMPONENTS ---

const FeatureItem = ({ icon, text, styles, COLORS }) => (
    <View style={styles.featureRow}>
        <View style={{ width: 28, alignItems: 'center' }}>
            <MaterialIcons name={icon} size={18} color={COLORS.accentGreen} />
        </View>
        <Text style={styles.featureText}>{text}</Text>
    </View>
);

const FeatureCard = ({ icon, title, desc, color, styles, COLORS }) => (
    <View style={[styles.featureCard, { borderColor: color + '40' }]}>
        <MaterialIcons name={icon} size={20} color={color} style={{ marginBottom: 8 }} />
        <Text style={styles.featureCardTitle}>{title}</Text>
        <Text style={styles.featureCardDesc}>{desc}</Text>
    </View>
);

const Badge = ({ text, icon, styles, COLORS }) => (
    <View style={styles.badge}>
        {icon && <MaterialIcons name={icon} size={10} color={COLORS.textDim} style={{ marginLeft: 4 }} />}
        <Text style={styles.badgeText}>{text}</Text>
    </View>
);

const createStyles = (COLORS) => StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 25,
        backgroundColor: COLORS.card,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginVertical: 10,
        overflow: 'hidden',
        width: '100%',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: COLORS.accentGreen + '14',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.accentGreen + '33',
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

    // --- Specific Styles for Locked Analysis ---
    lockedHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        marginBottom: 15,
    },
    titleAlignRight: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: COLORS.textPrimary,
        textAlign: 'right',
    },
    descAlignRight: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'right',
    },
    stepsContainer: {
        width: '100%',
        marginBottom: 20,
        paddingRight: 5,
    },
    stepRow: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        minHeight: 50,
    },
    stepIndicatorContainer: {
        alignItems: 'center',
        marginLeft: 15,
        width: 24,
    },
    stepDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        zIndex: 2,
        backgroundColor: COLORS.card,
    },
    stepDotLocked: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.border,
        marginTop: 6,
        zIndex: 2,
    },
    stepLine: {
        width: 2,
        flex: 1,
        backgroundColor: COLORS.border,
        marginVertical: 4,
    },
    stepContent: {
        flex: 1,
        paddingTop: 1,
        alignItems: 'flex-end',
        paddingLeft: 10,
    },
    stepTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.textPrimary,
        marginBottom: 2,
        textAlign: 'right',
    },
    stepTitleLocked: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.textDim,
        marginBottom: 2,
        textAlign: 'right',
    },
    stepDesc: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: COLORS.textSecondary,
        textAlign: 'right',
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 15,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: COLORS.border
    },
    sectionHeader: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textSecondary,
        alignSelf: 'center',
        marginBottom: 15,
    },

    // --- Standard Features List ---
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
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.textPrimary,
        textAlign: 'right',
        flex: 1,
    },

    // --- Grid for Analysis Features ---
    featuresGrid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
    },
    featureCard: {
        width: '45%',
        backgroundColor: COLORS.card,
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

    // --- Buttons ---
    actionButton: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: COLORS.accentGreen,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        width: '100%',
    },
    actionButtonOutline: {
        borderWidth: 1,
        borderColor: COLORS.accentGreen,
        width: 'auto',
        minWidth: 80,
        elevation: 0,
        backgroundColor: 'transparent',
    },
    actionButtonGradient: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 32,
    },
    actionButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: COLORS.textOnAccent,
    },

    // --- Badges ---
    badge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: COLORS.textPrimary + '08',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    badgeText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        color: COLORS.textDim,
    }
});