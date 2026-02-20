import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
    StyleSheet, View, Text,
    ScrollView, Animated, Platform, Alert,
    UIManager, Image, StatusBar,
    Easing, TouchableOpacity, Dimensions, TextInput, SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fuse from 'fuse.js'; // Ensure this is installed: npm install fuse.js

import { useAppContext } from '../../src/context/AppContext';

// --- SHARED RESOURCES ---
import {
    createStyles,
    styles as globalStyles,
    COLORS as DEFAULT_COLORS,
    width,
    height,
    CARD_WIDTH
} from '../../src/components/oilguard/oilguard.styles';
import { useTheme } from '../../src/context/ThemeContext';
import LoadingScreen from '../../src/components/oilguard/LoadingScreen';
import { PRODUCT_TYPES, getClaimsByProductType } from '../../src/constants/productData';
import { uriToBase64 } from '../../src/utils/formatters';
import { ReviewStep } from '../../src/components/oilguard/ReviewStep';

// ============================================================================
//                       SYSTEM CONFIGURATION
// ============================================================================

const VERCEL_BACKEND_URL = "https://oilguard-backend.vercel.app/api/analyze.js";
const VERCEL_EVALUATE_URL = "https://oilguard-backend.vercel.app/api/evaluate.js";

// Side-Specific Colors for Comparison
const PROD_COLORS = {
    A: '#10b981', // Emerald Green (Product A - Right Side in RTL)
    B: '#3b82f6'  // Royal Blue   (Product B - Left Side in RTL)
};

// ============================================================================
//                       ANIMATED UI COMPONENTS
// ============================================================================

const Spore = ({ size, duration, delay }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const animY = useRef(new Animated.Value(0)).current;
    const animX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const floatLoop = Animated.loop(Animated.timing(animY, { toValue: 1, duration, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }));
        const driftLoop = Animated.loop(Animated.sequence([Animated.timing(animX, { toValue: 1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin }), Animated.timing(animX, { toValue: -1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin })]));
        const opacityPulse = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: 0.6, duration: duration * 0.2, useNativeDriver: true }), Animated.delay(duration * 0.6), Animated.timing(opacity, { toValue: 0.2, duration: duration * 0.2, useNativeDriver: true })]));
        const timeout = setTimeout(() => { floatLoop.start(); driftLoop.start(); opacityPulse.start(); }, delay);
        return () => { clearTimeout(timeout); };
    }, []);

    return (<Animated.View style={{ position: 'absolute', zIndex: -1, width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.primaryGlow, transform: [{ translateY: animY.interpolate({ inputRange: [0, 1], outputRange: [height, -100] }) }, { translateX: animX.interpolate({ inputRange: [-1, 1], outputRange: [-35, 35] }) }], opacity }} />);
};

const StaggeredItem = ({ index, children, style }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(anim, { toValue: 1, friction: 8, tension: 40, delay: index * 60, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={[{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }, style]}>
            {children}
        </Animated.View>
    );
};

const MetricDuelRow = ({ label, icon, scoreA, scoreB }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createComparisonStyles(COLORS), [COLORS]);
    const animA = useRef(new Animated.Value(0)).current;
    const animB = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(animA, { toValue: scoreA || 0, duration: 1500, delay: 200, easing: Easing.out(Easing.exp), useNativeDriver: false }),
            Animated.timing(animB, { toValue: scoreB || 0, duration: 1500, delay: 200, easing: Easing.out(Easing.exp), useNativeDriver: false })
        ]).start();
    }, [scoreA, scoreB]);

    const widthA = animA.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
    const widthB = animB.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

    return (
        <View style={styles.duelContainer}>
            <View style={styles.duelHeader}>
                <Text style={[styles.duelScore, { color: PROD_COLORS.A, textAlign: 'right' }]}>{Math.round(scoreA || 0)}%</Text>
                <View style={styles.duelLabelBox}>
                    <Text style={styles.duelLabel}>{label}</Text>
                    <FontAwesome5 name={icon} size={10} color={COLORS.textDim} style={{ marginLeft: 5 }} />
                </View>
                <Text style={[styles.duelScore, { color: PROD_COLORS.B, textAlign: 'left' }]}>{Math.round(scoreB || 0)}%</Text>
            </View>

            <View style={styles.duelTrackContainer}>
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 2 }}>
                    <Animated.View style={[styles.duelBar, { width: widthB, backgroundColor: PROD_COLORS.B, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]} />
                </View>
                <View style={styles.duelDivider} />
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-start', paddingLeft: 2 }}>
                    <Animated.View style={[styles.duelBar, { width: widthA, backgroundColor: PROD_COLORS.A, borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
                </View>
            </View>
        </View>
    );
};

const MarketingClaimsSection = ({ leftClaims, rightClaims }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const globalStyles = useMemo(() => createStyles(COLORS), [COLORS]);
    const styles = useMemo(() => createComparisonStyles(COLORS), [COLORS]);

    const [activeSide, setActiveSide] = useState('A');
    const rawData = activeSide === 'A' ? leftClaims : rightClaims;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    // Helper: Clean Status Text
    const cleanStatusText = (text) => {
        if (!text) return '';
        return text.replace(/[✅🌿⚖️❌🚫⚠️]/g, '').trim();
    };

    // Sort Data: Proven/Traditional first, then Warnings/False
    const sortedData = useMemo(() => {
        if (!rawData) return [];
        return [...rawData].sort((a, b) => {
            const getScore = (item) => {
                const s = item.status ? item.status.toString() : '';
                if (s.includes('✅')) return 4;
                if (s.includes('🌿')) return 3;
                if (s.includes('Angel') || s.includes('تركيز') || s.includes('⚠️')) return 2;
                return 1;
            };
            return getScore(b) - getScore(a);
        });
    }, [rawData]);

    // Calculate Honesty Score for the active side
    const honestyScore = useMemo(() => {
        if (!sortedData || sortedData.length === 0) return 0;
        const total = sortedData.length;
        const validCount = sortedData.filter(r => {
            const s = r.status ? r.status.toString() : '';
            return s.includes('✅') || s.includes('🌿');
        }).length;
        return Math.round((validCount / total) * 100);
    }, [sortedData]);

    // Color for the score badge
    const scoreColor = honestyScore >= 70 ? COLORS.success : (honestyScore >= 40 ? COLORS.warning : COLORS.danger);

    const switchSide = (side) => {
        if (side === activeSide) return;
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            setActiveSide(side);
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        });
    };

    const ClaimRow = ({ item, index }) => {
        const [expanded, setExpanded] = useState(false);
        const [contentHeight, setContentHeight] = useState(0);
        const anim = useRef(new Animated.Value(0)).current;

        // --- DATA PROCESSING FOR EVIDENCE (The OilGuard Logic) ---
        const rawEvidence = [...(item.proven || []), ...(item.traditionallyProven || [])];
        const strongEvidence = [];
        const weakEvidence = [];

        rawEvidence.forEach(ing => {
            const isObj = typeof ing === 'object';
            const data = {
                name: isObj ? ing.name : ing,
                benefit: isObj ? ing.benefit : null,
                isTrace: isObj ? ing.isTrace : false
            };
            if (data.isTrace) weakEvidence.push(data);
            else strongEvidence.push(data);
        });

        const toggle = () => {
            setExpanded(!expanded);
            Animated.timing(anim, {
                toValue: expanded ? 0 : 1,
                duration: 300,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: false
            }).start();
        };

        const getStatusConfig = (s) => {
            if (!s) return { color: COLORS.textSecondary, icon: 'question-circle', bg: 'rgba(255,255,255,0.05)' };
            if (s.includes('❌') || s.includes('تسويقي') || s.includes('🚫')) return { color: COLORS.danger, icon: 'times-circle', bg: 'rgba(239, 68, 68, 0.1)' };
            if (s.includes('⚠️') || s.includes('Angel') || s.includes('تركيز')) return { color: COLORS.warning, icon: 'exclamation-triangle', bg: 'rgba(245, 158, 11, 0.1)' };
            if (s.includes('🌿')) return { color: COLORS.success, icon: 'leaf', bg: 'rgba(107, 203, 119, 0.1)' };
            return { color: COLORS.info, icon: 'check-circle', bg: 'rgba(59, 130, 246, 0.1)' };
        };

        const config = getStatusConfig(item.status);

        return (
            <View style={[globalStyles.claimRowWrapper, index !== (sortedData.length - 1) && globalStyles.claimRowBorder]}>
                <TouchableOpacity activeOpacity={0.7} onPress={toggle}>
                    <Animated.View style={[
                        globalStyles.claimRowMain,
                        { backgroundColor: anim.interpolate({ inputRange: [0, 1], outputRange: ['transparent', config.bg] }) }
                    ]}>
                        <View style={globalStyles.claimIconCol}>
                            <FontAwesome5 name={config.icon} size={20} color={config.color} />
                        </View>
                        <View style={globalStyles.claimTextCol}>
                            <Animated.Text style={[globalStyles.claimTextTitle, { color: anim.interpolate({ inputRange: [0, 1], outputRange: [COLORS.textPrimary, config.color] }) }]}>
                                {item.claim}
                            </Animated.Text>
                            <Text style={[globalStyles.claimTextStatus, { color: config.color }]}>
                                {cleanStatusText(item.status)}
                            </Text>
                        </View>
                        <View style={globalStyles.claimArrowCol}>
                            <Animated.View style={{ transform: [{ rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
                                <FontAwesome5 name="chevron-down" size={14} color={COLORS.textDim} />
                            </Animated.View>
                        </View>
                    </Animated.View>
                </TouchableOpacity>

                <Animated.View style={{ height: anim.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight], extrapolate: 'clamp' }), overflow: 'hidden' }}>
                    <View style={[globalStyles.claimDetails, { position: 'absolute', width: '100%' }]} onLayout={(e) => { const h = e.nativeEvent.layout.height; if (h > 0 && h !== contentHeight) setContentHeight(h); }}>

                        <Text style={globalStyles.claimExplanation}>{item.explanation}</Text>

                        {/* --- PRIMARY INGREDIENTS --- */}
                        {strongEvidence.length > 0 && (
                            <View style={styles.evidenceGroup}>
                                <View style={styles.evidenceLabelContainer}>
                                    <Text style={[styles.evidenceLabelText, { color: COLORS.success }]}>مكونات فعالة أساسية:</Text>
                                    <FontAwesome5 name="check" size={10} color={COLORS.success} />
                                </View>
                                <View style={styles.chipContainer}>
                                    {strongEvidence.map((ing, i) => (
                                        <View key={i} style={styles.chipPrimary}>
                                            <Text style={styles.chipTextPrimary}>{ing.name}{ing.benefit && <Text style={styles.chipBenefit}> • {ing.benefit}</Text>}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* --- TRACE INGREDIENTS --- */}
                        {weakEvidence.length > 0 && (
                            <View style={[styles.evidenceGroup, { marginTop: strongEvidence.length > 0 ? 12 : 0 }]}>
                                <View style={styles.evidenceLabelContainer}>
                                    <Text style={[styles.evidenceLabelText, { color: COLORS.warning }]}>تراكيز ثانوية / منخفضة:</Text>
                                    <FontAwesome5 name="exclamation-triangle" size={10} color={COLORS.warning} />
                                </View>
                                <View style={styles.chipContainer}>
                                    {weakEvidence.map((ing, i) => (
                                        <View key={i} style={styles.chipTrace}>
                                            <Text style={styles.chipTextTrace}>{ing.name}{ing.benefit && <Text style={styles.chipBenefitTrace}> • {ing.benefit}</Text>}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                    </View>
                </Animated.View>
            </View>
        );
    };

    return (
        <View style={globalStyles.claimsContainer}>
            <View style={[globalStyles.claimsHeader, { flexDirection: 'column', alignItems: 'stretch', gap: 15, paddingBottom: 15 }]}>

                {/* Header Top Row: Title + Honesty Badge */}
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={globalStyles.claimsTitle}>تحليل الادعاءات</Text>
                        <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textSecondary, textAlign: 'right' }}>كشف المبالغات التسويقية</Text>
                    </View>

                    <View style={[styles.honestyBadge, { borderColor: scoreColor }]}>
                        <Text style={[styles.honestyScore, { color: scoreColor }]}>{honestyScore}%</Text>
                        <Text style={[styles.honestyLabel, { color: scoreColor }]}>مصداقية</Text>
                    </View>
                </View>

                {/* Switcher */}
                <View style={styles.segmentTrack}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => switchSide('A')} style={[styles.segmentBtn, activeSide === 'A' && { backgroundColor: PROD_COLORS.A }]}>
                        <Text style={[styles.segmentText, activeSide === 'A' && { color: '#FFF' }]}>المنتج (أ)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => switchSide('B')} style={[styles.segmentBtn, activeSide === 'B' && { backgroundColor: PROD_COLORS.B }]}>
                        <Text style={[styles.segmentText, activeSide === 'B' && { color: '#FFF' }]}>المنتج (ب)</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Animated.View style={[globalStyles.claimsBody, { opacity: fadeAnim }]}>
                {(!sortedData || sortedData.length === 0) ? (
                    <Text style={{ textAlign: 'center', color: COLORS.textSecondary, margin: 20, fontFamily: 'Tajawal-Regular' }}>لا توجد ادعاءات تم تحليلها لهذا المنتج.</Text>
                ) : (
                    sortedData.map((res, i) => <ClaimRow key={i} item={res} index={i} />)
                )}
            </Animated.View>
        </View>
    );
};

const AnimatedCheckbox = ({ isSelected }) => {
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createComparisonStyles(COLORS), [COLORS]);
    const scale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
    const checkScale = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: isSelected ? 1 : 0,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
        }).start();
        Animated.timing(checkScale, {
            toValue: isSelected ? 1 : 0,
            duration: 200,
            delay: isSelected ? 100 : 0,
            useNativeDriver: true,
        }).start();
    }, [isSelected]);

    return (
        <View style={styles.checkboxBase}>
            <Animated.View style={[styles.checkboxFill, { transform: [{ scale }] }]} />
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                <FontAwesome5 name="check" size={14} color={COLORS.darkGreen} />
            </Animated.View>
        </View>
    );
};

// ============================================================================
//                       MAIN SCREEN
// ============================================================================

export default function ComparisonPage() {
    const { userProfile } = useAppContext();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const globalStyles = useMemo(() => createStyles(COLORS), [COLORS]);
    const styles = useMemo(() => createComparisonStyles(COLORS), [COLORS]);

    // Core State
    const [step, setStep] = useState(0);
    const [scanMode, setScanMode] = useState('fast');
    const [loadingText, setLoadingText] = useState('');
    const [particles] = useState([...Array(12)].map((_, i) => ({ id: i, size: Math.random() * 5 + 3, startX: Math.random() * width, duration: 8000 + Math.random() * 7000, delay: Math.random() * 5000 })));
    const [searchQuery, setSearchQuery] = useState('');

    // Product Data
    const [left, setLeft] = useState({ sourceData: null, ingredientsList: [], analysisData: null });
    const [right, setRight] = useState({ sourceData: null, ingredientsList: [], analysisData: null });
    const [productType, setProductType] = useState('other');
    const [claims, setClaims] = useState([]);

    // Animations & Refs
    const contentOpacity = useRef(new Animated.Value(1)).current;
    const contentTranslateX = useRef(new Animated.Value(0)).current;
    const fabAnim = useRef(new Animated.Value(0)).current;
    const fabPulseAnim = useRef(new Animated.Value(1)).current;
    const scrollY = useRef(new Animated.Value(0)).current; // For header animation

    // Memoized Data for Fuse.js
    const claimsForType = useMemo(() => getClaimsByProductType(productType), [productType]);

    // Fuse.js Instance
    const fuse = useMemo(() => new Fuse(claimsForType, {
        includeScore: false,
        threshold: 0.4,
    }), [claimsForType]);

    useEffect(() => {
        Animated.spring(fabAnim, {
            toValue: claims.length > 0 ? 1 : 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true
        }).start();

        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(fabPulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(fabPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        );

        if (claims.length > 0) {
            pulseLoop.start();
        } else {
            pulseLoop.stop();
            fabPulseAnim.setValue(1);
        }

        return () => pulseLoop.stop();
    }, [claims.length]);

    const changeStep = (next) => {
        const isForward = next > step;
        const slideDist = 20;

        Animated.parallel([
            Animated.timing(contentOpacity, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
                easing: Easing.out(Easing.quad)
            }),
            Animated.timing(contentTranslateX, {
                toValue: isForward ? -slideDist : slideDist,
                duration: 150,
                useNativeDriver: true
            })
        ]).start(() => {
            setStep(next);
            // Reset Animation Values
            scrollY.setValue(0);
            contentTranslateX.setValue(isForward ? slideDist : -slideDist);
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(contentOpacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                        easing: Easing.out(Easing.cubic)
                    }),
                    Animated.spring(contentTranslateX, {
                        toValue: 0,
                        friction: 9,
                        tension: 50,
                        useNativeDriver: true
                    })
                ]).start();
            }, 50);
        });
    };

    const handleOCR = async () => {
        setLoadingText(scanMode === 'accurate' ? 'جاري تحليل الصور بدقة (Engine 3)...' : 'جاري التحليل السريع (AI Vision)...');
        changeStep(1);

        setTimeout(async () => {
            const processImage = async (uri) => {
                const manipResult = await ImageManipulator.manipulateAsync(
                    uri,
                    [{ resize: { width: 1024 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                const base64 = await uriToBase64(manipResult.uri);

                const res = await fetch(VERCEL_BACKEND_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        base64Data: base64,
                        scanMode: scanMode
                    })
                });

                if (!res.ok) throw new Error("Backend Error");
                const json = await res.json();

                let data;
                if (typeof json.result === 'object') {
                    data = json.result;
                } else {
                    const text = json.result.replace(/```json|```/g, '').trim();
                    data = JSON.parse(text);
                }

                return { list: data.ingredients_list, type: data.detected_type };
            };

            try {
                const [r1, r2] = await Promise.all([
                    processImage(left.sourceData),
                    processImage(right.sourceData)
                ]);

                setLeft(p => ({ ...p, ingredientsList: r1.list }));
                setRight(p => ({ ...p, ingredientsList: r2.list }));
                setProductType(r1.type !== 'other' ? r1.type : (r2.type !== 'other' ? r2.type : 'other'));
                changeStep(2);
            } catch (e) {
                console.error("Comparison Analysis Error:", e);
                Alert.alert("خطأ", "فشل تحليل الصور. يرجى التأكد من وضوح المكونات والمحاولة مرة أخرى.");
                changeStep(0);
            }
        }, 300);
    };

    const handleEval = async () => {
        setLoadingText('مقارنة المعايير والمخاطر...');
        changeStep(4);

        setTimeout(async () => {
            const evaluate = async (list) => {
                const res = await fetch(VERCEL_EVALUATE_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ingredients_list: list,
                        product_type: productType,
                        selected_claims: claims,
                        user_profile: {
                            allergies: userProfile?.settings?.allergies || [],
                            conditions: userProfile?.settings?.conditions || [],
                            skinType: userProfile?.settings?.skinType,
                            scalpType: userProfile?.settings?.scalpType
                        }
                    })
                });
                return await res.json();
            };

            try {
                const [e1, e2] = await Promise.all([evaluate(left.ingredientsList), evaluate(right.ingredientsList)]);
                setLeft(p => ({ ...p, analysisData: e1 }));
                setRight(p => ({ ...p, analysisData: e2 }));
                changeStep(5);
            } catch (e) {
                Alert.alert("خطأ", "فشل التقييم.");
                changeStep(3);
            }
        }, 300);
    };

    const resetAll = () => {
        setLeft({ sourceData: null, ingredientsList: [], analysisData: null });
        setRight({ sourceData: null, ingredientsList: [], analysisData: null });
        setProductType('other');
        setClaims([]);
        setSearchQuery('');
        changeStep(0);
    };

    // --- RENDER CONTENT ---
    const renderArena = () => (
        <View style={globalStyles.inputStepContainer}>
            <View style={globalStyles.heroVisualContainer}>
                <View style={styles.arenaSlotsRow}>
                    {[{ d: left, s: setLeft, c: PROD_COLORS.A, l: 'أ' }, { d: right, s: setRight, c: PROD_COLORS.B, l: 'ب' }].map((slot, i) => (
                        <TouchableOpacity activeOpacity={0.7} key={i} style={[styles.slotCard, slot.d.sourceData && { borderColor: slot.c, borderWidth: 2 }]}
                            onPress={async () => { if (slot.d.sourceData) return; const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 }); if (!r.canceled && r.assets && r.assets.length > 0) slot.s(p => ({ ...p, sourceData: r.assets[0].uri })); }}>

                            {slot.d.sourceData ? (
                                <>
                                    <Image source={{ uri: slot.d.sourceData }} style={styles.slotImage} resizeMode="cover" />
                                    <View style={[styles.slotBadge, { backgroundColor: slot.c }]}>
                                        <Text style={styles.slotBadgeText}>{slot.l}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => slot.s(p => ({ ...p, sourceData: null }))}>
                                        <FontAwesome5 name="times" color="#FFF" size={10} />
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={styles.slotPlaceholder}>
                                    <View style={styles.dashedIconCircle}>
                                        <FontAwesome5 name="plus" size={20} color={COLORS.textSecondary} />
                                    </View>
                                    <Text style={styles.slotLabel}>المنتج {slot.l}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                    <View style={styles.vsBadge}>
                        <Text style={styles.vsText}>ضد</Text>
                    </View>
                </View>
            </View>

            <StaggeredItem index={0} style={[globalStyles.bottomDeck, styles.pinnedBottomDock]}>
                <LinearGradient
                    colors={[COLORS.card, COLORS.background]}
                    style={[
                        globalStyles.bottomDeckGradient,
                        {
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0,
                            paddingBottom: insets.bottom > 0 ? insets.bottom + 15 : 30
                        }
                    ]}
                >
                    <View style={globalStyles.deckHeader}>
                        <Text style={globalStyles.deckTitle}>أيهما أنسب لي؟</Text>

                        <View style={{
                            flexDirection: 'row',
                            backgroundColor: 'rgba(0,0,0,0.3)',
                            borderRadius: 12,
                            padding: 4,
                            marginTop: 10,
                            marginBottom: 5,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)'
                        }}>
                            <TouchableOpacity
                                onPress={() => setScanMode('fast')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    backgroundColor: scanMode === 'fast' ? COLORS.primary : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 6
                                }}
                            >
                                <FontAwesome5 name="bolt" size={14} color={scanMode === 'fast' ? COLORS.background : COLORS.textDim} />
                                <Text style={{
                                    fontFamily: 'Tajawal-Bold',
                                    fontSize: 13,
                                    color: scanMode === 'fast' ? COLORS.background : COLORS.textDim
                                }}>وضع السرعة</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setScanMode('accurate')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                    backgroundColor: scanMode === 'accurate' ? COLORS.primary : 'transparent',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    gap: 6
                                }}
                            >
                                <FontAwesome5 name="search-plus" size={14} color={scanMode === 'accurate' ? COLORS.background : COLORS.textDim} />
                                <Text style={{
                                    fontFamily: 'Tajawal-Bold',
                                    fontSize: 13,
                                    color: scanMode === 'accurate' ? COLORS.background : COLORS.textDim
                                }}>وضع الدقة</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={{
                            fontFamily: 'Tajawal-Regular',
                            color: scanMode === 'accurate' ? COLORS.warning : COLORS.accentGreen,
                            fontSize: 12,
                            textAlign: 'center',
                            marginBottom: 0,
                            alignSelf: 'center'

                        }}>
                            {scanMode === 'accurate'
                                ? "يستغرق وقتاً أطول لكن ينصح به للمكونات بالعربية"
                                : "تحليل سريع ينصح به للصور الواضحة ذات جودة عالية"}
                        </Text>

                    </View>

                    <TouchableOpacity activeOpacity={0.7}
                        onPress={handleOCR}
                        disabled={!left.sourceData || !right.sourceData}
                        style={[globalStyles.primaryActionBtn, (!left.sourceData || !right.sourceData) && { opacity: 0.5 }]}
                    >
                        <LinearGradient
                            colors={[COLORS.success, COLORS.accentGreen]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={globalStyles.primaryActionGradient}
                        >
                            <View style={globalStyles.iconCircle}>
                                <Ionicons name="flask" size={28} color={COLORS.textOnAccent} />
                            </View>
                            <View>
                                <Text style={[globalStyles.primaryActionTitle, { color: COLORS.textOnAccent }]}>بدء المقارنة</Text>
                                <Text style={[globalStyles.primaryActionSub, { color: COLORS.textOnAccent + 'CC' }]}>تحليل المكونات والادعاءات</Text>
                            </View>
                            <Ionicons name="chevron-back" size={24} color={COLORS.textOnAccent} style={{ opacity: 0.6, marginRight: 'auto' }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </LinearGradient>
            </StaggeredItem>
        </View>
    );

    // --- MEMOIZED ITEM RENDERER ---
    const renderClaimItem = useCallback(({ item }) => {
        const isSelected = claims.includes(item);

        const handlePress = () => {
            Haptics.selectionAsync();
            setClaims(prev =>
                prev.includes(item)
                    ? prev.filter(c => c !== item)
                    : [...prev, item]
            );
        };

        return (
            <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
                <View style={[styles.claimItem, isSelected && styles.claimItemActive]}>
                    <AnimatedCheckbox isSelected={isSelected} />
                    <Text style={styles.claimItemText}>{item}</Text>
                </View>
            </TouchableOpacity>
        );
    }, [claims]);

    // --- EXACT CLAIMS STEP FROM OILGUARD.JS ---
    const renderClaims = () => {
        // Data Filtering via Fuse
        const displayedClaims = searchQuery
            ? fuse.search(searchQuery).map(result => result.item)
            : claimsForType;

        const EXPANDED_HEADER_HEIGHT = 160;
        const COLLAPSED_HEADER_HEIGHT = Platform.OS === 'android' ? 60 : 90;
        const SEARCH_BAR_HEIGHT = 70;
        const HEADER_ANIMATION_DISTANCE = EXPANDED_HEADER_HEIGHT - COLLAPSED_HEADER_HEIGHT;

        const headerTranslateY = scrollY.interpolate({
            inputRange: [0, HEADER_ANIMATION_DISTANCE],
            outputRange: [0, -HEADER_ANIMATION_DISTANCE],
            extrapolate: 'clamp',
        });

        const expandedHeaderOpacity = scrollY.interpolate({
            inputRange: [0, HEADER_ANIMATION_DISTANCE / 2],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        const collapsedHeaderOpacity = scrollY.interpolate({
            inputRange: [HEADER_ANIMATION_DISTANCE / 2, HEADER_ANIMATION_DISTANCE],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        });

        const fabTranslateY = fabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [150, 0],
        });
        const fabScale = fabPulseAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.1]
        });

        return (
            <View style={{ flex: 1, width: '100%' }}>
                <Animated.FlatList
                    data={displayedClaims}
                    renderItem={renderClaimItem}
                    keyExtractor={(item) => item}
                    showsVerticalScrollIndicator={false}

                    // Performance Optimizations
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}

                    contentContainerStyle={{
                        paddingTop: EXPANDED_HEADER_HEIGHT + SEARCH_BAR_HEIGHT,
                        paddingBottom: 120,
                        paddingHorizontal: 10,
                        gap: 12
                    }}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                />

                {/* ANIMATED HEADER BLOCK */}
                <Animated.View style={[styles.fixedHeaderBlock, {
                    height: EXPANDED_HEADER_HEIGHT + SEARCH_BAR_HEIGHT,
                    transform: [{ translateY: headerTranslateY }],
                }]}>
                    <View style={styles.headerBackdrop} />

                    <Animated.View style={[styles.expandedHeader, { opacity: expandedHeaderOpacity }]}>
                        <Text style={globalStyles.heroTitle}>ما هي وعود المنتج؟</Text>
                        <Text style={globalStyles.heroSub}>حدد الادعاءات المكتوبة على العبوة.</Text>
                    </Animated.View>

                    <Animated.View style={[styles.collapsedHeader, { opacity: collapsedHeaderOpacity }]}>
                        <SafeAreaView>
                            <View style={globalStyles.headerContent}>
                                <TouchableOpacity onPress={() => changeStep(step - 1)} style={globalStyles.backBtn}>
                                    <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                                <Text style={styles.collapsedHeaderText}>ما هي وعود المنتج؟</Text>
                                <View style={{ width: 40 }} />
                            </View>
                        </SafeAreaView>
                    </Animated.View>

                    <View style={styles.claimsSearchContainer}>
                        <View style={styles.searchInputWrapper}>
                            <FontAwesome5 name="search" size={16} color={COLORS.textDim} style={{ marginLeft: 10 }} />
                            <TextInput
                                style={styles.claimsSearchInput}
                                placeholder="ابحث عن إدعاء..."
                                placeholderTextColor={COLORS.textDim}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                textAlign="right"
                            />
                        </View>
                    </View>
                </Animated.View>

                {/* FAB */}
                <View style={styles.fabContainer}>
                    <Animated.View style={{ transform: [{ translateY: fabTranslateY }] }}>
                        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
                            <TouchableOpacity
                                onPress={handleEval}
                                style={globalStyles.fab}
                                activeOpacity={0.7}
                            >
                                <FontAwesome5 name="balance-scale" color={COLORS.darkGreen} size={28} />
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
                </View>
            </View>
        );
    };

    const renderResults = () => {
        if (!left.analysisData || !right.analysisData) return null;

        const sA = left.analysisData?.oilGuardScore || 0;
        const sB = right.analysisData?.oilGuardScore || 0;
        const winner = Math.abs(sA - sB) < 5 ? 'tie' : (sA > sB ? 'left' : 'right');
        const winnerColor = winner === 'left' ? PROD_COLORS.A : (winner === 'right' ? PROD_COLORS.B : COLORS.gold);

        return (
            <ScrollView contentContainerStyle={[globalStyles.scrollContent, { paddingTop: 0 }]} showsVerticalScrollIndicator={false} removeClippedSubviews={true}>

                <StaggeredItem index={0}>
                    <View style={[globalStyles.dashboardContainer, { borderColor: winnerColor, marginTop: 20 }]}>
                        <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={StyleSheet.absoluteFill} />

                        <View style={globalStyles.dashboardGlass}>
                            <View style={[globalStyles.dashHeader, { justifyContent: 'center', marginBottom: 25 }]}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={[globalStyles.verdictBig, { color: winnerColor, fontSize: 24 }]}>
                                        {winner === 'tie' ? 'تعادل في الأداء' : `المنتج (${winner === 'left' ? 'أ' : 'ب'}) يتفوق`}
                                    </Text>
                                    <Text style={globalStyles.verdictLabel}>{PRODUCT_TYPES.find(t => t.id === productType)?.label}</Text>
                                </View>
                            </View>

                            <View style={styles.h2hRow}>
                                <View style={styles.h2hCol}>
                                    <Image source={{ uri: left.sourceData }} style={[styles.h2hImg, { borderColor: PROD_COLORS.A }]} />
                                    <View style={styles.verdictPill}>
                                        <Text style={[styles.h2hScore, { color: PROD_COLORS.A }]}>{Math.round(sA)}%</Text>
                                        <Text style={[styles.verdictText, { color: sA > 75 ? COLORS.success : COLORS.textSecondary }]}>
                                            {left.analysisData.finalVerdict || "جيد"}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.vsCenter}>
                                    <View style={styles.vsCircle}><Text style={styles.vsText}>ضد</Text></View>
                                </View>

                                <View style={styles.h2hCol}>
                                    <Image source={{ uri: right.sourceData }} style={[styles.h2hImg, { borderColor: PROD_COLORS.B }]} />
                                    <View style={styles.verdictPill}>
                                        <Text style={[styles.h2hScore, { color: PROD_COLORS.B }]}>{Math.round(sB)}%</Text>
                                        <Text style={[styles.verdictText, { color: sB > 75 ? COLORS.success : COLORS.textSecondary }]}>
                                            {right.analysisData.finalVerdict || "جيد"}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[globalStyles.statsGrid, { marginTop: 25, flexDirection: 'column', gap: 15 }]}>
                                <MetricDuelRow
                                    label="الأمان" icon="shield-alt"
                                    scoreA={left.analysisData.safety?.score || 0}
                                    scoreB={right.analysisData.safety?.score || 0}
                                />
                                <MetricDuelRow
                                    label="الفعالية" icon="flask"
                                    scoreA={left.analysisData.efficacy?.score || 0}
                                    scoreB={right.analysisData.efficacy?.score || 0}
                                />
                            </View>

                            <View style={[globalStyles.matchContainer, { marginTop: 15 }]}>
                                <View style={globalStyles.matchHeader}>
                                    <View style={globalStyles.matchHeaderIcon}><FontAwesome5 name="user-alt" size={12} color={COLORS.textPrimary} /></View>
                                    <Text style={globalStyles.matchHeaderTitle}>تقرير الملاءمة الشخصية</Text>
                                </View>
                                <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                                    {[left, right].map((prod, i) => {
                                        const reasons = Array.isArray(prod.analysisData.personalMatch?.reasons) ? prod.analysisData.personalMatch.reasons : [];
                                        const color = i === 0 ? PROD_COLORS.A : PROD_COLORS.B;
                                        const label = i === 0 ? 'المنتج (أ)' : 'المنتج (ب)';

                                        return (
                                            <View key={i} style={{ marginTop: 10 }}>
                                                <Text style={{ fontFamily: 'Tajawal-Bold', color: color, fontSize: 12, marginBottom: 5, textAlign: 'right' }}>{label}</Text>
                                                {reasons.length > 0 ? (
                                                    reasons.map((r, k) => (
                                                        <View key={k} style={{ flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                                                            <FontAwesome5 name={r.type === 'danger' ? 'times-circle' : 'exclamation-circle'} color={r.type === 'danger' ? COLORS.danger : COLORS.warning} size={12} style={{ marginTop: 2 }} />
                                                            <Text style={[globalStyles.matchText, { color: COLORS.textSecondary, fontSize: 12 }]}>{r.text}</Text>
                                                        </View>
                                                    ))
                                                ) : (
                                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                                                        <FontAwesome5 name="check-circle" color={COLORS.success} size={12} />
                                                        <Text style={[globalStyles.matchText, { color: COLORS.textDim, fontSize: 12 }]}>لا توجد تعارضات صحية مكتشفة</Text>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    </View>
                </StaggeredItem>

                <StaggeredItem index={1}>
                    <MarketingClaimsSection
                        leftClaims={left.analysisData.marketing_results}
                        rightClaims={right.analysisData.marketing_results}
                    />
                </StaggeredItem>

                <TouchableOpacity activeOpacity={0.7} onPress={resetAll} style={styles.resetBtn}>
                    <Text style={styles.resetText}>مقارنة جديدة</Text>
                    <FontAwesome5 name="redo" color={COLORS.textSecondary} />
                </TouchableOpacity>

            </ScrollView>
        );
    };

    return (
        <View style={globalStyles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <View style={styles.darkOverlay} />
            {particles.map((p) => <Spore key={p.id} {...p} />)}

            {/* Default Header - Shown on Steps 0, 1, 3, 5, 4 (loading) BUT NOT 3 (claims) because it has its own header */}
            {step > 0 && step !== 1 && step !== 3 && step !== 4 && (
                <View style={[globalStyles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => changeStep(step - 1)} style={globalStyles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ width: 40 }} />
                </View>
            )}

            <View style={{ flex: 1, width: '100%', alignItems: 'center' }}>

                <Animated.View style={{
                    flex: 1,
                    width: '100%',
                    alignItems: 'center',
                    opacity: contentOpacity,
                    transform: [{ translateX: contentTranslateX }]
                }}>

                    {step === 0 && renderArena()}

                    {(step === 1 || step === 4) && (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                            <LoadingScreen />
                            <Text style={styles.loadingLabel}>{loadingText}</Text>
                        </View>
                    )}

                    {step === 2 && (
                        <View style={{
                            flex: 1,
                            width: '100%',
                            paddingHorizontal: 20,
                            paddingTop: Platform.OS === 'android' ? 90 : 100
                        }}>
                            <ReviewStep
                                productType={productType}
                                setProductType={setProductType}
                                onConfirm={() => changeStep(3)}
                            />
                        </View>
                    )}

                    {step === 3 && renderClaims()}

                    {step === 5 && renderResults()}

                </Animated.View>
            </View>
        </View>
    );
}

const createComparisonStyles = (COLORS) => StyleSheet.create({
    darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.0)' },

    arenaSlotsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: CARD_WIDTH,
        height: 250,
        marginTop: 20
    },
    slotCard: {
        width: '46%',
        height: '100%',
        backgroundColor: COLORS.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    slotImage: { width: '100%', height: '100%', borderRadius: 24, position: 'absolute' },
    slotPlaceholder: { alignItems: 'center', gap: 12 },
    dashedIconCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.textSecondary, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
    slotLabel: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, fontSize: 14 },
    vsBadge: { position: 'absolute', left: '50%', marginLeft: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.gold, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
    vsText: { fontFamily: 'Tajawal-ExtraBold', color: COLORS.gold },
    slotBadge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 2 },
    slotBadgeText: { fontFamily: 'Tajawal-Bold', color: '#FFF', fontSize: 11 },
    removeBtn: { position: 'absolute', top: 10, left: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    pinnedBottomDock: {
        width: '100%',
        marginTop: 'auto',
    },

    // --- EXACT CLAIMS STYLES FROM OILGUARD.JS ---
    fixedHeaderBlock: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 51,
        justifyContent: 'flex-end',
        paddingBottom: 15,
    },
    headerBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.background + 'F2',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
    },
    expandedHeader: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 50 : 60,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    collapsedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    collapsedHeaderText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'center',
    },
    claimsSearchContainer: {
        paddingHorizontal: 15,
        width: '100%',
        zIndex: 51,
    },
    searchInputWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    claimsSearchInput: {
        flex: 1,
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textPrimary,
        height: '100%',
        marginRight: 10,
        textAlign: 'right'
    },
    fabContainer: {
        position: 'absolute',
        bottom: 60,
        alignSelf: 'center',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // List Items
    claimItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 15
    },
    claimItemActive: {
        backgroundColor: 'rgba(90, 156, 132, 0.15)',
        borderColor: COLORS.accentGreen,
    },
    claimItemText: {
        flex: 1,
        fontFamily: 'Tajawal-Regular',
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'right',
        lineHeight: 22
    },

    // --- GENERIC STYLES ---
    segmentTrack: { flexDirection: 'row-reverse', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4, width: '100%' },
    segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    segmentText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textSecondary },

    h2hRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 15 },
    h2hCol: { alignItems: 'center', gap: 8, flex: 1 },
    h2hImg: { width: 80, height: 80, borderRadius: 24, borderWidth: 2 },
    verdictPill: { alignItems: 'center', marginTop: 5 },
    h2hScore: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24 },
    verdictText: { fontFamily: 'Tajawal-Regular', fontSize: 11, textAlign: 'center' },

    vsCenter: { gap: 4, alignItems: 'center', marginTop: 35 },
    vsCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    vsText: { fontFamily: 'Tajawal-Bold', fontSize: 10, color: COLORS.textSecondary },

    duelContainer: { marginBottom: 5 },
    duelHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    duelScore: { fontFamily: 'Tajawal-Bold', fontSize: 12, width: 35 },
    duelLabelBox: { flexDirection: 'row-reverse', alignItems: 'center' },
    duelLabel: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textSecondary },
    duelTrackContainer: { flexDirection: 'row', height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4, overflow: 'hidden', width: '100%' },
    duelDivider: { width: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
    duelBar: { height: '100%' },

    loadingLabel: { position: 'absolute', bottom: 100, width: '100%', textAlign: 'center', fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen, fontSize: 16 },
    resetBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', justifyContent: 'center', padding: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, gap: 10, marginTop: 20, width: CARD_WIDTH },
    resetText: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary },

    // Checkbox Styles
    checkboxBase: {
        width: 22,
        height: 22,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: COLORS.textDim,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
    },
    checkboxFill: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.accentGreen,
    },
    honestyBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    honestyScore: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
    },
    honestyLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
        marginTop: -2,
    },

    // Evidence & Chip Styles
    evidenceGroup: {
        marginTop: 10,
        gap: 8
    },
    evidenceLabelContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6
    },
    evidenceLabelText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11
    },
    chipContainer: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 6
    },

    // Primary Chip (Strong Evidence)
    chipPrimary: {
        backgroundColor: COLORS.success + '1A',
        borderColor: COLORS.success + '4D',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4
    },
    chipTextPrimary: {
        color: COLORS.success,
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        textAlign: 'right'
    },
    chipBenefit: {
        color: COLORS.success + 'B3',
        fontSize: 10
    },

    // Trace Chip (Weak Evidence)
    chipTrace: {
        backgroundColor: COLORS.warning + '1A',
        borderColor: COLORS.warning + '4D',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4
    },
    chipTextTrace: {
        color: COLORS.warning,
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        textAlign: 'right'
    },
    chipBenefitTrace: {
        color: COLORS.warning + 'B3',
        fontSize: 10
    },
});