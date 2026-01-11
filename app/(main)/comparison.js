import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet, View, Text,
    ScrollView, Animated, Platform, Alert,
    UIManager, Image, StatusBar,
    Easing, TouchableOpacity, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppContext } from '../../src/context/AppContext';

// --- SHARED RESOURCES ---
import { 
  styles as globalStyles, 
  COLORS, 
  width, 
  height, 
  CARD_WIDTH 
} from '../../src/components/oilguard/oilguard.styles'; 
import LoadingScreen from '../../src/components/oilguard/LoadingScreen';
import { PRODUCT_TYPES, getClaimsByProductType } from '../../src/constants/productData';
import { uriToBase64 } from '../../src/utils/formatters'; 
import { ReviewStep } from '../../src/components/oilguard/ReviewStep'; // Adjust path

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
    const animY = useRef(new Animated.Value(0)).current; 
    const animX = useRef(new Animated.Value(0)).current; 
    const opacity = useRef(new Animated.Value(0)).current;
  
    useEffect(() => {
      const floatLoop = Animated.loop(Animated.timing(animY, { toValue: 1, duration, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }));
      const driftLoop = Animated.loop(Animated.sequence([ Animated.timing(animX, { toValue: 1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin }), Animated.timing(animX, { toValue: -1, duration: duration * 0.35, useNativeDriver: true, easing: Easing.sin }) ]));
      const opacityPulse = Animated.loop(Animated.sequence([ Animated.timing(opacity, { toValue: 0.6, duration: duration * 0.2, useNativeDriver: true }), Animated.delay(duration * 0.6), Animated.timing(opacity, { toValue: 0.2, duration: duration * 0.2, useNativeDriver: true }) ]));
      const timeout = setTimeout(() => { floatLoop.start(); driftLoop.start(); opacityPulse.start(); }, delay);
      return () => { clearTimeout(timeout); };
    }, []);
  
    return ( <Animated.View style={{ position: 'absolute', zIndex: -1, width: size, height: size, borderRadius: size/2, backgroundColor: COLORS.primaryGlow, transform: [{ translateY: animY.interpolate({ inputRange: [0, 1], outputRange: [height, -100] }) }, { translateX: animX.interpolate({ inputRange: [-1, 1], outputRange: [-35, 35] }) }], opacity }} /> );
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

// --- CORRECTED METRIC DUEL BAR (Center-Out Growth) ---
const MetricDuelRow = ({ label, icon, scoreA, scoreB }) => {
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
            {/* Header: Scores on Edges, Label in Center 
               flexDirection is 'row-reverse', so:
               - First Child appears on the RIGHT (Product A/Green)
               - Last Child appears on the LEFT (Product B/Blue)
            */}
            <View style={styles.duelHeader}>
                {/* Right Side (Product A - Green) */}
                <Text style={[styles.duelScore, { color: PROD_COLORS.A, textAlign: 'right' }]}>{Math.round(scoreA || 0)}%</Text>
                
                {/* Center Label */}
                <View style={styles.duelLabelBox}>
                    <Text style={styles.duelLabel}>{label}</Text>
                    <FontAwesome5 name={icon} size={10} color={COLORS.textDim} style={{ marginLeft: 5 }} />
                </View>
                
                {/* Left Side (Product B - Blue) */}
                <Text style={[styles.duelScore, { color: PROD_COLORS.B, textAlign: 'left' }]}>{Math.round(scoreB || 0)}%</Text>
            </View>

            {/* Bars Track - Center Out */}
            <View style={styles.duelTrackContainer}>
                
                {/* Product B Bar (Visual Left - Grows Right-to-Left from center) */}
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', paddingRight: 2 }}> 
                    <Animated.View style={[styles.duelBar, { width: widthB, backgroundColor: PROD_COLORS.B, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]} />
                </View>

                {/* Center Divider */}
                <View style={styles.duelDivider} />

                {/* Product A Bar (Visual Right - Grows Left-to-Right from center) */}
                <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-start', paddingLeft: 2 }}>
                    <Animated.View style={[styles.duelBar, { width: widthA, backgroundColor: PROD_COLORS.A, borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
                </View>
            </View>
        </View>
    );
};

// ============================================================================
//                       SUB-COMPONENTS
// ============================================================================


const MarketingClaimsSection = ({ leftClaims, rightClaims }) => {
    const [activeSide, setActiveSide] = useState('A'); 
    const rawData = activeSide === 'A' ? leftClaims : rightClaims;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const fabPulseAnim = useRef(new Animated.Value(1)).current;
    
    const sortedData = useMemo(() => {
        if (!rawData) return [];
        return [...rawData].sort((a, b) => {
            const getScore = (item) => {
                const s = item.status ? item.status.toString() : '';
                if (s.includes('❌') || s.includes('تسويقي') || s.includes('🚫')) return 4;
                if (s.includes('⚖️') || s.includes('جزئيا') || s.includes('مشكوك')) return 3;
                if (s.includes('🌿') || s.includes('تقليديا')) return 2;
                return 1;
            };
            return getScore(b) - getScore(a);
        });
    }, [rawData]);

    const switchSide = (side) => {
        if(side === activeSide) return;
        Animated.timing(fadeAnim, {toValue: 0, duration: 150, useNativeDriver: true}).start(() => {
            setActiveSide(side);
            Animated.timing(fadeAnim, {toValue: 1, duration: 250, useNativeDriver: true}).start();
        });
    };

    const cleanStatusText = (text) => text ? text.replace(/[✅🌿⚖️❌🚫]/g, '').trim() : '';

    const ClaimRow = ({ item, index }) => {
        const [expanded, setExpanded] = useState(false);
        const [contentHeight, setContentHeight] = useState(0);
        const anim = useRef(new Animated.Value(0)).current;

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
            if (s.includes('❌') || s.includes('تسويقي') || s.includes('🚫')) return { color: COLORS.danger, icon: 'times-circle', bg: 'rgba(239, 68, 68, 0.1)' };
            if (s.includes('⚖️') || s.includes('جزئيا') || s.includes('⚠️')) return { color: COLORS.warning, icon: 'exclamation-triangle', bg: 'rgba(245, 158, 11, 0.1)' };
            if (s.includes('🌿')) return { color: '#6BCB77', icon: 'leaf', bg: 'rgba(107, 203, 119, 0.1)' };
            return { color: COLORS.info, icon: 'check-circle', bg: 'rgba(59, 130, 246, 0.1)' };
        };

        const config = getStatusConfig(item.status || '');

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
                    </View>
                </Animated.View>
            </View>
        );
    };

    return (
        <View style={globalStyles.claimsContainer}>
            <View style={[globalStyles.claimsHeader, {flexDirection: 'column', alignItems: 'stretch', gap: 15, paddingBottom: 15}]}>
                <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Text style={globalStyles.claimsTitle}>تحليل الادعاءات</Text>
                    <FontAwesome5 name="tag" color={COLORS.textSecondary} />
                </View>
                <View style={styles.segmentTrack}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => switchSide('A')} style={[styles.segmentBtn, activeSide === 'A' && {backgroundColor: PROD_COLORS.A}]}>
                        <Text style={[styles.segmentText, activeSide === 'A' && {color: '#FFF'}]}>المنتج (أ)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => switchSide('B')} style={[styles.segmentBtn, activeSide === 'B' && {backgroundColor: PROD_COLORS.B}]}>
                        <Text style={[styles.segmentText, activeSide === 'B' && {color: '#FFF'}]}>المنتج (ب)</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <Animated.View style={[globalStyles.claimsBody, {opacity: fadeAnim}]}>
                {(!sortedData || sortedData.length === 0) ? (
                     <Text style={{textAlign:'center', color:COLORS.textSecondary, margin: 20, fontFamily: 'Tajawal-Regular'}}>لا توجد ادعاءات تم تحليلها لهذا المنتج.</Text>
                ) : (
                    sortedData.map((res, i) => <ClaimRow key={i} item={res} index={i} />)
                )}
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
    
    // Core State
    const [step, setStep] = useState(0);
    const [loadingText, setLoadingText] = useState('');
    const [particles] = useState([...Array(12)].map((_, i) => ({ id: i, size: Math.random()*5+3, startX: Math.random()*width, duration: 8000+Math.random()*7000, delay: Math.random()*5000 })));
    
    // Product Data
    const [left, setLeft] = useState({ sourceData: null, ingredientsList: [], analysisData: null });
    const [right, setRight] = useState({ sourceData: null, ingredientsList: [], analysisData: null });
    const [productType, setProductType] = useState('other');
    const [claims, setClaims] = useState([]);
    
    // Animations
    const contentOpacity = useRef(new Animated.Value(1)).current;
    const contentTranslateX = useRef(new Animated.Value(0)).current;
    const fabAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const fabPulseAnim = useRef(new Animated.Value(1)).current;

    // Manage FAB Animation for Claims Step
    useEffect(() => {
        // 1. Slide Up Logic (Existing)
        Animated.spring(fabAnim, {
            toValue: claims.length > 0 ? 1 : 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true
        }).start();

        // 2. Pulse Logic (NEW)
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
            fabPulseAnim.setValue(1); // Reset size
        }

        return () => pulseLoop.stop();
    }, [claims.length]);

    // --- LOGIC ---
    const changeStep = (next) => {
        const isForward = next > step;
        const slideDist = 20; // Distance to slide

        // 1. Slide OUT
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
            // 2. Update State while invisible
            setStep(next);
            
            // 3. Snap to opposite side
            contentTranslateX.setValue(isForward ? slideDist : -slideDist);

            // 4. Slide IN (with small delay for React render)
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
        setLoadingText('صل على رسول الله');
        
        // 1. Animate to Loading Step (Step 1)
        changeStep(1);

        // 2. Defer logic slightly to allow the "Slide Out" animation to finish cleanly
        setTimeout(async () => {
            const process = async (uri) => {
                const base64 = await uriToBase64(uri);
                const res = await fetch(VERCEL_BACKEND_URL, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ base64Data: base64 })
                });
                if (!res.ok) throw new Error();
                const json = await res.json();
                const data = typeof json.result === 'object' ? json.result : JSON.parse(json.result.replace(/```json|```/g, '').trim());
                return { list: data.ingredients_list, type: data.detected_type };
            };

            try {
                const [r1, r2] = await Promise.all([process(left.sourceData), process(right.sourceData)]);
                
                // Batch state updates
                setLeft(p => ({...p, ingredientsList: r1.list}));
                setRight(p => ({...p, ingredientsList: r2.list}));
                setProductType(r1.type !== 'other' ? r1.type : r2.type);
                
                // Animate to Review Step (Step 2)
                changeStep(2);
            } catch (e) {
                Alert.alert("خطأ", "فشل تحليل الصور. يرجى المحاولة مرة أخرى.");
                changeStep(0); // Go back to start
            }
        }, 300); // 300ms delay matches the fade/slide animation duration
    };

    const handleEval = async () => {
        setLoadingText('مقارنة المعايير والمخاطر...');
        
        // 1. Animate to Loading Step (Step 4)
        changeStep(4);

        // 2. Defer logic
        setTimeout(async () => {
            const evaluate = async (list) => {
                const res = await fetch(VERCEL_EVALUATE_URL, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
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
                setLeft(p => ({...p, analysisData: e1}));
                setRight(p => ({...p, analysisData: e2}));
                
                // Animate to Results (Step 5)
                changeStep(5);
            } catch (e) {
                Alert.alert("خطأ", "فشل التقييم.");
                changeStep(3); // Go back to claims
            }
        }, 300);
    };

    const resetAll = () => {
        setLeft({sourceData:null, ingredientsList:[], analysisData:null});
        setRight({sourceData:null, ingredientsList:[], analysisData:null});
        setProductType('other');
        setClaims([]);
        changeStep(0);
    };

    // --- RENDER CONTENT ---
    const renderArena = () => (
        <View style={globalStyles.inputStepContainer}>
            <View style={globalStyles.heroVisualContainer}>
                {/* Visual Arena */}
                <View style={styles.arenaSlotsRow}>
                    {[{d: left, s: setLeft, c: PROD_COLORS.A, l: 'أ'}, {d: right, s: setRight, c: PROD_COLORS.B, l: 'ب'}].map((slot, i) => (
                        <TouchableOpacity activeOpacity={0.7} key={i} style={[styles.slotCard, slot.d.sourceData && { borderColor: slot.c, borderWidth: 2 }]} 
                        onPress={async () => { if (slot.d.sourceData) return; const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 }); if (!r.canceled && r.assets && r.assets.length > 0) slot.s(p => ({...p, sourceData: r.assets[0].uri})); }}>

                            {slot.d.sourceData ? (
                                <>
                                    <Image source={{uri: slot.d.sourceData}} style={styles.slotImage} resizeMode="cover" />
                                    <View style={[styles.slotBadge, {backgroundColor: slot.c}]}>
                                        <Text style={styles.slotBadgeText}>{slot.l}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => slot.s(p => ({...p, sourceData:null}))}>
                                        <FontAwesome5 name="times" color="#FFF" size={10}/>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={styles.slotPlaceholder}>
                                    <View style={styles.dashedIconCircle}>
                                        <FontAwesome5 name="plus" size={20} color={COLORS.textSecondary}/>
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

            {/* FIXED BOTTOM DOCK PLACEMENT */}
            <StaggeredItem index={0} style={[globalStyles.bottomDeck, styles.pinnedBottomDock]}>
                <LinearGradient 
                    colors={[COLORS.card, '#152520']} 
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
                        <Text style={globalStyles.deckTitle}>المواجهة العلمية</Text>
                        <Text style={{ fontFamily: 'Tajawal-Regular', color: COLORS.accentGreen, fontSize: 14 }}>
                            قارن بين منتجين لاكتشاف الأفضل لك
                        </Text>
                    </View>

                    <TouchableOpacity activeOpacity={0.7} 
                        onPress={handleOCR} 
                        disabled={!left.sourceData || !right.sourceData} 
                        style={[globalStyles.primaryActionBtn, (!left.sourceData || !right.sourceData) && {opacity: 0.5}]}
                    >
                        <LinearGradient
                            colors={[COLORS.accentGreen, '#4a8570']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={globalStyles.primaryActionGradient}
                        >
                            <View style={globalStyles.iconCircle}>
                                <Ionicons name="flask" size={28} color={COLORS.background} />
                            </View>
                            <View>
                                <Text style={globalStyles.primaryActionTitle}>بدء المقارنة</Text>
                                <Text style={globalStyles.primaryActionSub}>تحليل المكونات والادعاءات</Text>
                            </View>
                            <Ionicons name="chevron-back" size={24} color={COLORS.background} style={{ opacity: 0.6, marginRight: 'auto' }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </LinearGradient>
            </StaggeredItem>
        </View>
    );

    const renderClaims = () => (
        <View style={{flex:1, width: '100%', paddingHorizontal: 20}}>
            <View style={[globalStyles.headerContent, {marginTop: 20, marginBottom: 20}]}>
                <Text style={globalStyles.heroTitle}>معايير الحكم</Text>
                <Text style={globalStyles.heroSub}>ماذا تتوقع من هذه المنتجات؟</Text>
            </View>
            
            {/* New Cleaner Grid Layout */}
            <ScrollView contentContainerStyle={styles.claimsChipContainer} showsVerticalScrollIndicator={false}>
                {getClaimsByProductType(productType).map((c, i) => {
                    const isSelected = claims.includes(c);
                    return (
                        <TouchableOpacity activeOpacity={0.7} key={i} onPress={() => { Haptics.selectionAsync(); setClaims(p => isSelected ? p.filter(x=>x!==c) : [...p,c]); }} 
                            style={[styles.claimChipCompact, isSelected && styles.claimChipCompactActive]}>
                            
                            {isSelected && <FontAwesome5 name="check" size={10} color={COLORS.textOnAccent} style={{ marginRight: 6 }} />}
                            <Text style={[styles.claimChipText, isSelected && styles.claimChipTextActive]}>{c}</Text>
                        
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
            
            {/* Animated Sliding FAB */}
            <Animated.View style={[styles.fabWrapper, { transform: [{ translateY: fabAnim.interpolate({inputRange:[0,1], outputRange:[100,0]}) }, { scale: fabPulseAnim }], opacity: fabAnim }]}>
                <TouchableOpacity activeOpacity={0.7} onPress={handleEval} style={globalStyles.fab}>
                     <FontAwesome5 name="balance-scale" color={COLORS.darkGreen} size={28} />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );

    const renderResults = () => {
        if (!left.analysisData || !right.analysisData) return null;

        const sA = left.analysisData?.oilGuardScore || 0;
        const sB = right.analysisData?.oilGuardScore || 0;
        const winner = Math.abs(sA - sB) < 5 ? 'tie' : (sA > sB ? 'left' : 'right');
        const winnerColor = winner === 'left' ? PROD_COLORS.A : (winner === 'right' ? PROD_COLORS.B : COLORS.gold);

        return (
            <ScrollView contentContainerStyle={[globalStyles.scrollContent, {paddingTop: 0}]} showsVerticalScrollIndicator={false}>
                
                {/* --- 1. HERO DASHBOARD --- */}
                <StaggeredItem index={0}>
                    <View style={[globalStyles.dashboardContainer, { borderColor: winnerColor, marginTop: 20 }]}>
                        <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={StyleSheet.absoluteFill} />
                        
                        <View style={globalStyles.dashboardGlass}>
                            {/* Header / Winner Verdict */}
                            <View style={[globalStyles.dashHeader, {justifyContent: 'center', marginBottom: 25}]}>
                                <View style={{alignItems: 'center'}}>
                                    <Text style={[globalStyles.verdictBig, {color: winnerColor, fontSize: 24}]}>
                                        {winner === 'tie' ? 'تعادل في الأداء' : `المنتج (${winner === 'left' ? 'أ' : 'ب'}) يتفوق`}
                                    </Text>
                                    <Text style={globalStyles.verdictLabel}>{PRODUCT_TYPES.find(t => t.id === productType)?.label}</Text>
                                </View>
                            </View>

                            {/* H2H Visuals + Specific Verdicts */}
                            <View style={styles.h2hRow}>
                                {/* Product A (Right in RTL) */}
                                <View style={styles.h2hCol}>
                                    <Image source={{uri: left.sourceData}} style={[styles.h2hImg, {borderColor: PROD_COLORS.A}]} />
                                    <View style={styles.verdictPill}>
                                        <Text style={[styles.h2hScore, {color: PROD_COLORS.A}]}>{Math.round(sA)}%</Text>
                                        <Text style={[styles.verdictText, {color: sA > 75 ? COLORS.success : COLORS.textSecondary}]}>
                                            {left.analysisData.finalVerdict || "جيد"}
                                        </Text>
                                    </View>
                                </View>
                                
                                {/* VS Center */}
                                <View style={styles.vsCenter}>
                                    <View style={styles.vsCircle}><Text style={styles.vsText}>ضد</Text></View>
                                </View>

                                {/* Product B (Left in RTL) */}
                                <View style={styles.h2hCol}>
                                    <Image source={{uri: right.sourceData}} style={[styles.h2hImg, {borderColor: PROD_COLORS.B}]} />
                                    <View style={styles.verdictPill}>
                                        <Text style={[styles.h2hScore, {color: PROD_COLORS.B}]}>{Math.round(sB)}%</Text>
                                        <Text style={[styles.verdictText, {color: sB > 75 ? COLORS.success : COLORS.textSecondary}]}>
                                            {right.analysisData.finalVerdict || "جيد"}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Metric Duel Bars - Product A (Left Prop/Green) is Right Visually, Product B (Right Prop/Blue) is Left Visually */}
                            <View style={[globalStyles.statsGrid, {marginTop: 25, flexDirection: 'column', gap: 15}]}>
                                <MetricDuelRow 
                                    label="الأمان" icon="shield-alt" 
                                    scoreA={left.analysisData.safety?.score || 0} // Green / Right Side
                                    scoreB={right.analysisData.safety?.score || 0} // Blue / Left Side
                                />
                                <MetricDuelRow 
                                    label="الفعالية" icon="flask" 
                                    scoreA={left.analysisData.efficacy?.score || 0} 
                                    scoreB={right.analysisData.efficacy?.score || 0} 
                                />
                            </View>

                            {/* Personal Match Report */}
                            <View style={[globalStyles.matchContainer, {marginTop: 15}]}>
                                <View style={globalStyles.matchHeader}>
                                    <View style={globalStyles.matchHeaderIcon}><FontAwesome5 name="user-alt" size={12} color={COLORS.textPrimary} /></View>
                                    <Text style={globalStyles.matchHeaderTitle}>تقرير الملاءمة الشخصية</Text>
                                </View>
                                <View style={{paddingHorizontal: 10, paddingBottom: 10}}>
                                    {[left, right].map((prod, i) => {
                                        const reasons = Array.isArray(prod.analysisData.personalMatch?.reasons) ? prod.analysisData.personalMatch.reasons : [];
                                        const color = i===0 ? PROD_COLORS.A : PROD_COLORS.B;
                                        const label = i===0 ? 'المنتج (أ)' : 'المنتج (ب)';
                                        
                                        return (
                                            <View key={i} style={{marginTop: 10}}>
                                                <Text style={{fontFamily:'Tajawal-Bold', color: color, fontSize: 12, marginBottom: 5, textAlign:'right'}}>{label}</Text>
                                                {reasons.length > 0 ? (
                                                    reasons.map((r, k) => (
                                                        <View key={k} style={{flexDirection:'row-reverse', alignItems:'flex-start', gap: 6, marginBottom: 4}}>
                                                            <FontAwesome5 name={r.type==='danger' ? 'times-circle' : 'exclamation-circle'} color={r.type==='danger'?COLORS.danger:COLORS.warning} size={12} style={{marginTop: 2}}/>
                                                            <Text style={[globalStyles.matchText, {color: COLORS.textSecondary, fontSize: 12}]}>{r.text}</Text>
                                                        </View>
                                                    ))
                                                ) : (
                                                    <View style={{flexDirection:'row-reverse', alignItems:'center', gap: 6}}>
                                                        <FontAwesome5 name="check-circle" color={COLORS.success} size={12}/>
                                                        <Text style={[globalStyles.matchText, {color: COLORS.textDim, fontSize: 12}]}>لا توجد تعارضات صحية مكتشفة</Text>
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

                {/* --- 2. MARKETING CLAIMS --- */}
                <StaggeredItem index={1}>
                    <MarketingClaimsSection 
                        leftClaims={left.analysisData.marketing_results} 
                        rightClaims={right.analysisData.marketing_results} 
                    />
                </StaggeredItem>

                {/* --- 3. RESET --- */}
                <TouchableOpacity activeOpacity={0.7} onPress={resetAll} style={styles.resetBtn}>
                    <Text style={styles.resetText}>مقارنة جديدة</Text>
                    <FontAwesome5 name="redo" color={COLORS.textSecondary}/>
                </TouchableOpacity>

            </ScrollView>
        );
    };

    return (
        <View style={globalStyles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <View style={styles.darkOverlay} />
            {particles.map((p) => <Spore key={p.id} {...p} />)}

            {/* HEADER */}
            {step > 0 && step !== 1 && step !== 4 && (
                <View style={[globalStyles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => changeStep(step-1)} style={globalStyles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <View style={{width:40}} /> 
                </View>
            )}

            {/* MAIN CONTENT AREA */}
            <View style={{flex:1, width: '100%', alignItems: 'center'}}>
                
                <Animated.View style={{
                    flex: 1, 
                    width: '100%', 
                    alignItems: 'center',
                    opacity: contentOpacity, // Apply Fade
                    transform: [{ translateX: contentTranslateX }] // Apply Slide
                }}>
                    
                    {/* STEP 0: ARENA INPUT */}
                    {step === 0 && renderArena()}

                    {/* STEP 1 & 4: LOADING SCREENS */}
                    {(step === 1 || step === 4) && (
                        <View style={{flex:1, justifyContent:'center', alignItems: 'center', width: '100%'}}>
                            <LoadingScreen />
                            <Text style={styles.loadingLabel}>{loadingText}</Text>
                        </View>
                    )}

                    {/* STEP 2: REVIEW (Using the shared component) */}
                    {step === 2 && (
                        <ReviewStep 
                            productType={productType} 
                            setProductType={setProductType} 
                            onConfirm={() => changeStep(3)} 
                        />
                    )}

                    {/* STEP 3: CLAIMS SELECTION */}
                    {step === 3 && renderClaims()}

                    {/* STEP 5: RESULTS */}
                    {step === 5 && renderResults()}

                </Animated.View>
            </View>
        </View>
    );
}

// ============================================================================
//                       STYLES
// ============================================================================

const styles = StyleSheet.create({
    darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.0)' },
    
    // Step 0: Arena
    arenaSlotsRow: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        width: CARD_WIDTH,
        height: 250,
        bottom: 40 
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
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        marginBottom: 0,
        zIndex: 100,
    },
    // Step 3: New Compact Claims UI
    claimsChipContainer: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'center', 
        gap: 10, 
        paddingBottom: 120, 
        paddingTop: 10 
    },
    claimChipCompact: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        minWidth: '40%'
    },
    claimChipCompactActive: {
        backgroundColor: COLORS.accentGreen,
        borderColor: COLORS.accentGreen,
    },
    claimChipText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'center'
    },
    claimChipTextActive: {
        color: COLORS.textOnAccent,
        fontFamily: 'Tajawal-Bold',
    },
    fabWrapper: {
        position: 'absolute',
        bottom: 90,
        alignSelf: 'center',
        zIndex: 20
    },

    // Results UI
    segmentTrack: { flexDirection: 'row-reverse', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4, width: '100%' },
    segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    segmentText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textSecondary },

    // H2H Inside Glass
    h2hRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 15 },
    h2hCol: { alignItems: 'center', gap: 8, flex: 1 },
    h2hImg: { width: 80, height: 80, borderRadius: 24, borderWidth: 2 },
    verdictPill: { alignItems: 'center', marginTop: 5 },
    h2hScore: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24 },
    verdictText: { fontFamily: 'Tajawal-Regular', fontSize: 11, textAlign: 'center' },

    vsCenter: { gap: 4, alignItems: 'center', marginTop: 35 },
    vsCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    vsText: { fontFamily: 'Tajawal-Bold', fontSize: 10, color: COLORS.textSecondary },
    
    // Corrected Duel Bars
    duelContainer: { marginBottom: 5 },
    duelHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    duelScore: { fontFamily: 'Tajawal-Bold', fontSize: 12, width: 35 },
    duelLabelBox: { flexDirection: 'row-reverse', alignItems: 'center' },
    duelLabel: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textSecondary },
    duelTrackContainer: { flexDirection: 'row', height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4, overflow: 'hidden', width: '100%' },
    duelDivider: { width: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
    duelBar: { height: '100%' }, // width is animated inline

    loadingLabel: { position: 'absolute', bottom: 100, width: '100%', textAlign: 'center', fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen, fontSize: 16 },
    resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, gap: 10, marginTop: 20, width: CARD_WIDTH },
    resetText: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary }
});