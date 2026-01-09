
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, TouchableOpacity, ScrollView, Modal, Pressable, Dimensions, Platform, Alert, Easing, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { PressableScale, StaggeredItem } from '../common/Animations';
import * as Notifications from 'expo-notifications'; // Ensure you have installed expo-notifications
import * as Location from 'expo-location'; // <--- ADD THIS
import { useTimerStore } from './timerStore'; // Adjust the path as needed
import { AlertService } from '../../services/alertService'; // <--- IMPORT THIS

// --- THEME CONSTANTS ---
const COLORS = {
    card: '#253D34',
    cardSurface: '#2F4840',
    border: 'rgba(90, 156, 132, 0.3)',
    textPrimary: '#F1F3F2',
    textSecondary: '#B0C4DE',
    textDim: '#6B7C76',
    accentGreen: '#5A9C84',
    textOnAccent: '#1A2D27',
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    gold: '#fbbf24',
    blue: '#3b82f6'
};

const THEME_VARIANTS = {
    pollution: { colors: ['#4c1d95', '#6d28d9'], icon: 'smog', label: 'خطر تلوث', shadow: '#6d28d9' },
    dry: { colors: ['#1e3a8a', '#3b82f6'], icon: 'wind', label: 'جفاف شديد', shadow: '#3b82f6' },
    uv: { colors: ['#7f1d1d', '#ea580c'], icon: 'sun', label: 'UV عالي', shadow: '#ea580c' },
    humid: { colors: ['#7c2d12', '#d97706'], icon: 'tint', label: 'رطوبة عالية', shadow: '#d97706' },
    perfect: { colors: ['#064e3b', '#10b981'], icon: 'smile-beam', label: 'طقس مثالي', shadow: '#10b981' },
    unknown: { colors: ['#1f2937', '#4b5563'], icon: 'cloud', label: 'طقس', shadow: '#4b5563' }
};

const ARC_CONFIG = {
    width: 110,
    height: 65, // Increased slightly to accommodate text inside
    cx: 55,
    cy: 55,
    r: 40,
    strokeWidth: 6
};

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true, // Replaces shouldShowAlert
        shouldShowList: true,   // Replaces shouldShowAlert
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// ============================================================================
//                       1. SKELETON LOADER
// ============================================================================
export const WeatherLoadingCard = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 1000, useNativeDriver: true })
            ])
        ).start();
    }, []);

    return (
        <StaggeredItem index={0} animated={false}>
            <View style={styles.loadingCard}>
                <View style={styles.loadingIcon}>
                    <ActivityIndicator size="small" color={COLORS.accentGreen} />
                </View>
                <View style={{ flex: 1, paddingRight: 16, gap: 12 }}>
                    <Animated.View style={[styles.skeletonLine, { width: '60%', height: 18, opacity }]} />
                    <Animated.View style={[styles.skeletonLine, { width: '40%', height: 14, opacity }]} />
                </View>
            </View>
        </StaggeredItem>
    );
};

// ============================================================================
//                       2. COMPACT WIDGET (Hero)
// ============================================================================
export const WeatherCompactWidget = ({ insight, onPress, onRetry, onPermissionBlocked }) => {
    const isPermissionError = insight.customData?.isPermissionError;
    const isServiceError = insight.customData?.isServiceError;
    const themeKey = insight.customData?.theme || 'unknown';
    const baseTheme = isPermissionError ? THEME_VARIANTS.unknown : (THEME_VARIANTS[themeKey] || THEME_VARIANTS.unknown);

    const displayTheme = {
        ...baseTheme,
        colors: isPermissionError ? ['#374151', '#4b5563'] : isServiceError ? ['#7f1d1d', '#991b1b'] : baseTheme.colors,
        icon: isPermissionError ? 'map-marker-alt' : isServiceError ? 'wifi' : baseTheme.icon,
        title: isPermissionError ? 'الموقع غير مفعل' : isServiceError ? 'تعذر الاتصال' : baseTheme.label
    };

    const actionIcon = isPermissionError ? "map-pin" : isServiceError ? "refresh-cw" : "arrow-left";

    const handlePress = () => {
        Haptics.selectionAsync();
        if (isPermissionError) onPermissionBlocked?.();
        else if (isServiceError) onRetry?.(true);
        else onPress(insight);
    };

    return (
        <StaggeredItem index={0} animated={false}>
            <PressableScale onPress={handlePress} activeScale={0.97}>
                <View style={[styles.widgetContainer, { shadowColor: displayTheme.shadow }]}>
                    <LinearGradient colors={displayTheme.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.widgetGradient}>
                        <View style={styles.widgetIconCircle}><FontAwesome5 name={displayTheme.icon} size={24} color="#fff" /></View>
                        <View style={styles.widgetContent}>
                            <Text style={styles.widgetTitle}>{displayTheme.title}</Text>
                            <Text style={styles.widgetSubtitle} numberOfLines={1}>{isPermissionError ? 'اضغطي لتفعيل الموقع' : insight.short_summary}</Text>
                        </View>
                        <View style={styles.widgetAction}><Feather name={actionIcon} size={20} color="rgba(255,255,255,0.9)" /></View>
                        <FontAwesome5 name={displayTheme.icon} size={140} color="rgba(255,255,255,0.06)" style={styles.widgetBgIcon} />
                    </LinearGradient>
                </View>
            </PressableScale>
        </StaggeredItem>
    );
};

export const WeatherMiniCard = ({ insight, onPress }) => {
    const meta = insight.customData?.meta || {};
    const { temp, uvIndex } = meta;

    const getTheme = () => {
        const id = insight.id.toLowerCase();
        if (insight.customData?.isPermissionError) return { colors: ['#4b5563', '#1f2937'], icon: 'map-marker-alt', label: 'الموقع' };
        if (insight.customData?.isServiceError) return { colors: ['#d97706', '#92400e'], icon: 'wifi', label: 'غير متاح' };
        if (insight.severity === 'good') return { colors: ['#10b981', '#059669'], icon: 'smile-beam', label: 'ممتاز' };
        if (id.includes('uv')) return { colors: ['#ef4444', '#b91c1c'], icon: 'sun', label: 'UV عالي' };
        if (id.includes('dry')) return { colors: ['#3b82f6', '#1d4ed8'], icon: 'tint-slash', label: 'جفاف' };
        return { colors: [COLORS.accentGreen, '#4a8a73'], icon: 'cloud-sun', label: 'طقس' };
    };

    const theme = getTheme();

    return (
        <StaggeredItem index={0} style={{ width: 'auto', paddingLeft: 12 }} animated={false}>
            <PressableScale onPress={() => onPress(insight)}>
                <View style={styles.miniCardContainer}>
                    <LinearGradient colors={theme.colors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                    <View style={styles.miniCardHeader}>
                        <View style={styles.miniIconCircle}><FontAwesome5 name={theme.icon} size={14} color="#fff" /></View>
                        <View style={styles.liveDot} />
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 8 }}>
                         <Text style={styles.miniCardTitle} numberOfLines={2}>{insight.title}</Text>
                    </View>
                    <View style={styles.miniCardFooter}>
                        {temp !== undefined ? (
                            <View style={styles.glassPill}>
                                <Text style={styles.glassPillText}>{Math.round(temp)}°</Text>
                                {uvIndex !== undefined && <><View style={styles.glassSeparator} /><Text style={styles.glassPillText}>UV {Math.round(uvIndex)}</Text></>}
                            </View>
                        ) : (
                             <View style={styles.glassPill}><Text style={styles.glassPillText}>{theme.label}</Text></View>
                        )}
                    </View>
                </View>
            </PressableScale>
        </StaggeredItem>
    );
};

// ============================================================================
//               3. SMART SPF TIMER (LOGIC FIXED)
// ============================================================================
const SpfTimerWidget = ({ uvIndex = 0 }) => {
    // 2. Store Hooks
    const { 
        isActive, 
        endTime, 
        duration: storeDuration, 
        startTimer, 
        stopTimer, 
        notificationId 
    } = useTimerStore();

    // 3. Local State for Tick
    const [remainingSeconds, setRemainingSeconds] = useState(0);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // 4. SVG Config
    const size = 80; 
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    // 5. UV Duration Logic
    const calculateSpfDuration = (uv) => {
        const safeUv = Number(uv) || 0;
        if (safeUv >= 8) return 75 * 60; // 75 mins
        if (safeUv >= 6) return 90 * 60; // 90 mins
        if (safeUv >= 3) return 120 * 60; // 2 hours
        return 0; // Safe
    };

    const recommendedDuration = calculateSpfDuration(uvIndex);
    const isSafe = recommendedDuration === 0;

    // --- ANIMATION ---
    useEffect(() => {
        if (isActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isActive]);

    // --- TICKER LOGIC ---
    useEffect(() => {
        let interval = null;

        if (isActive && endTime) {
            const tick = () => {
                const now = Date.now();
                // Ensure we don't get negative numbers
                const diff = Math.max(0, Math.ceil((endTime - now) / 1000));
                setRemainingSeconds(diff);
                
                if (diff <= 0) {
                    stopTimer(); 
                }
            };

            tick(); // Update immediately on mount
            interval = setInterval(tick, 1000);
        } else {
            setRemainingSeconds(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, endTime]); // Removed stopTimer from dependency to avoid loop

    // --- START HANDLER (Fixed Trigger) ---
    const handleStart = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("تنبيه", "يجب تفعيل الإشعارات ليعمل المؤقت.");
            return;
        }

        // 1. Calculate Duration (Default to 60s if 0 for testing)
        const durationToSet = recommendedDuration > 0 ? recommendedDuration : 60; 

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // 2. Cancel any stale notification
        if (notificationId) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
        }

        // 3. Calculate Target Timestamp
        // We add the seconds to the current time to get a specific Date object
        const triggerDate = new Date(Date.now() + (durationToSet * 1000));

        // 4. Schedule with DATE trigger (Matches notificationHelper.js)
        const id = await Notifications.scheduleNotificationAsync({
            content: { 
                title: "☀️ وقت التجديد", 
                body: "انتهت فترة فعالية واقي الشمس. يرجى إعادة وضعه الآن.", 
                sound: 'default' 
            },
            trigger: { 
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate 
            },
        });
        
        // 5. Start State
        startTimer(durationToSet, id);
    };

    // --- STOP HANDLER ---
    const handleStop = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (notificationId) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
        }
        stopTimer();
    };

    const formatTime = (seconds) => {
        if (seconds <= 0) return "00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        const mm = m.toString().padStart(2,'0');
        const ss = s.toString().padStart(2,'0');
        return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
    };

    // --- RENDER SAFE ZONE ---
    if (isSafe && !isActive) {
        return (
            <View style={[styles.spfContainer, styles.spfSafeBg]}>
                <View style={[styles.spfIconCircle, {backgroundColor: 'rgba(16, 185, 129, 0.2)'}]}>
                    <FontAwesome5 name="check" size={14} color="#10b981" />
                </View>
                <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.spfTitle, {color: '#d1fae5'}]}>الأجواء آمنة</Text>
                    <Text style={[styles.spfDesc, {color: '#6ee7b7'}]}>مؤشر UV منخفض، لا حاجة للمؤقت.</Text>
                </View>
            </View>
        );
    }

    // --- RING MATH ---
    // Use storeDuration if active, otherwise recommended.
    // Ensure total is at least 1 to avoid NaN division.
    const totalDuration = isActive ? storeDuration : (recommendedDuration || 60);
    const safeTotal = totalDuration > 0 ? totalDuration : 1;

    // Calculate progress (0 to 1)
    // If NOT active, progress is 1 (Full ring).
    // If active, it reduces from 1 down to 0.
    const progress = isActive ? (remainingSeconds / safeTotal) : 1;

    // SVG Offset:
    // 0 = Full Circle
    // Circumference = Empty Circle
    // We want Full -> Empty, so: Offset = C * (1 - progress)
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <View style={styles.spfContainer}>
            {/* 1. Animated Ring (Left) */}
            <Animated.View style={[styles.ringWrapper, { transform: [{ scale: pulseAnim }] }]}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <Defs>
                        <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor={COLORS.accentGreen} stopOpacity="1" />
                            <Stop offset="1" stopColor="#34d399" stopOpacity="1" />
                        </SvgGradient>
                    </Defs>
                    {/* Track */}
                    <Circle stroke="rgba(255,255,255,0.03)" fill="none" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} />
                    {/* Progress */}
                    <AnimatedCircle
                        stroke="url(#grad)"
                        fill="none"
                        cx={size/2} cy={size/2}
                        r={radius}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${size/2} ${size/2})`}
                    />
                </Svg>
                
                <View style={styles.ringCenter}>
                    {isActive ? (
                        <FontAwesome5 name="clock" size={18} color={COLORS.accentGreen} />
                    ) : (
                        <View style={{alignItems:'center'}}>
                            <Text style={styles.ringVal}>{Math.round(recommendedDuration / 60)}</Text>
                            <Text style={styles.ringUnit}>دقيقة</Text>
                        </View>
                    )}
                </View>
            </Animated.View>

            {/* 2. Controls (Right) */}
            <View style={styles.spfContent}>
                {isActive ? (
                    <View style={{alignItems: 'flex-end', gap: 2}}>
                        <Text style={styles.statusLabel}>المؤقت يعمل</Text>
                        <Text style={styles.timerBigDisplay}>{formatTime(remainingSeconds)}</Text>
                        <PressableScale onPress={handleStop} style={styles.linkButton}>
                            <Text style={styles.linkButtonText}>إلغاء المؤقت</Text>
                        </PressableScale>
                    </View>
                ) : (
                    <View style={{alignItems: 'flex-end', gap: 6}}>
                        <View>
                            <Text style={styles.spfTitle}>تجديد واقي الشمس</Text>
                            <Text style={styles.spfDesc}>
                                مؤشر UV الحالي <Text style={{color: COLORS.warning, fontFamily:'Tajawal-Bold'}}>{uvIndex}</Text>
                            </Text>
                        </View>
                        
                        <PressableScale onPress={handleStart} style={styles.startPill}>
                            <LinearGradient
                                colors={[COLORS.accentGreen, '#047857']}
                                start={{x:0, y:0}} end={{x:1, y:0}}
                                style={styles.startPillGradient}
                            >
                                <Text style={styles.startPillText}>تشغيل</Text>
                                <FontAwesome5 name="play" size={10} color="#fff" />
                            </LinearGradient>
                        </PressableScale>
                    </View>
                )}
            </View>
        </View>
    );
};


// ============================================================================
//               4. SKIN-CENTRIC METRICS (UV & Hydration)
// ============================================================================

// --- 4.1 SUN CYCLE (UV DRIVEN) ---
const SunCycleWidget = ({ uvIndex = 0, isDay = true }) => {
    const { width, height, cx, cy, r, strokeWidth } = ARC_CONFIG;

    // 1. Status Logic
    let label = "آمن";
    let color = COLORS.success;
    let percentage = 0;

    if (!isDay) {
        label = "هدوء";
        color = "#94a3b8"; // Moon/Slate color
        percentage = 0; 
    } else {
        const safeUV = Math.min(uvIndex, 11);
        percentage = safeUV / 11;
        if (uvIndex >= 8) { label = "خطر جدًا"; color = COLORS.danger; }
        else if (uvIndex >= 6) { label = "خطر عالٍ"; color = COLORS.warning; }
        else if (uvIndex >= 3) { label = "متوسط"; color = COLORS.gold; }
    }

    // 2. Sun Position (Only needed for Day)
    const currentAngle = Math.PI * (1 - percentage);
    const sunX = cx + r * Math.cos(currentAngle);
    const sunY = cy - r * Math.sin(currentAngle);

    return (
        <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
                <FontAwesome5 name={isDay ? "sun" : "moon"} size={12} color={color} />
                <Text style={styles.featureTitle}>مؤشر UV</Text>
            </View>

            <View style={{ alignItems: 'center', marginTop: 4 }}>
                <Svg width={width} height={height}>
                    <Defs>
                        <SvgGradient id="sunGrad" x1="0" y1="0" x2="1" y2="0">
                            <Stop offset="0" stopColor="#10b981" />
                            <Stop offset="0.5" stopColor="#fbbf24" />
                            <Stop offset="1" stopColor="#ef4444" />
                        </SvgGradient>
                    </Defs>

                    {/* 1. Background Track (Always visible, clean line) */}
                    <Path 
                        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} 
                        stroke="rgba(255,255,255,0.05)" 
                        strokeWidth={strokeWidth} 
                        strokeLinecap="round" 
                        fill="none" 
                    />

                    {/* 2. Day Mode Only: Colored Arc + Sun Dot */}
                    {isDay && (
                        <>
                            <Path 
                                d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${sunX} ${sunY}`} 
                                stroke="url(#sunGrad)" 
                                strokeWidth={strokeWidth} 
                                strokeLinecap="round" 
                                fill="none" 
                            />
                            {/* The Sun Indicator Dot */}
                            <Circle 
                                cx={sunX} 
                                cy={sunY} 
                                r="5" 
                                fill="#fff" 
                                stroke={color} 
                                strokeWidth="2" 
                            />
                        </>
                    )}
                </Svg>

                <View style={styles.arcCenterText}>
                    <Text style={[styles.arcBigValue, { color: color }]}>
                        {isDay ? Math.round(uvIndex) : <FontAwesome5 name="moon" size={16} />}
                    </Text>
                    <Text style={[styles.arcLabel, { color: color }]}>{label}</Text>
                </View>
            </View>
        </View>
    );
};

// --- 4.2 HYDRO-GAUGE (Skin Hydration) ---
const HydroGauge = ({ humidity, dewPoint }) => {
    const { width, height, cx, cy, r, strokeWidth } = ARC_CONFIG;
    
    const safeHum = humidity !== undefined ? humidity : 50;
    const safeDP = dewPoint !== undefined ? dewPoint : (safeHum > 50 ? 18 : 5);

    // Status Colors
    let color = COLORS.success;
    let label = 'مريح';
    if (safeDP < 10) { color = '#60a5fa'; label = 'جاف'; } 
    else if (safeDP <= 16) { color = COLORS.success; label = 'مثالي'; } 
    else if (safeDP <= 20) { color = COLORS.warning; label = 'رطب'; } 
    else { color = COLORS.danger; label = 'خانق'; }

    // Math for Fill Arc
    const percentage = Math.min(Math.max(safeHum / 100, 0), 1);
    const endAngle = Math.PI * (1 - percentage);
    const x = cx + r * Math.cos(endAngle);
    const y = cy - r * Math.sin(endAngle);

    // SVG Path: Move to Start -> Arc to End
    const fillPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`;

    return (
        <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
                <FontAwesome5 name={safeDP > 16 ? "tint" : "tint-slash"} size={12} color={color} />
                <Text style={styles.featureTitle}>الرطوبة</Text>
            </View>

            <View style={{ alignItems: 'center', marginTop: 4 }}>
                <Svg width={width} height={height}>
                    {/* Background Track */}
                    <Path 
                        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} 
                        stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} strokeLinecap="round" fill="none" 
                    />
                    {/* Active Fill */}
                    <Path 
                        d={fillPath} 
                        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" 
                    />
                </Svg>

                <View style={styles.arcCenterText}>
                    <Text style={styles.arcBigValue}>{safeHum}<Text style={{fontSize:12}}>%</Text></Text>
                    <Text style={[styles.arcLabel, { color: color }]}>{label}</Text>
                </View>
            </View>
        </View>
    );
};


// --- 4.3 PORE CLARITY ---
const PoreClarityWidget = ({ aqi }) => {
    const { width, height, cx, cy, r, strokeWidth } = ARC_CONFIG;
    const safeAqi = aqi !== undefined ? aqi : 50;

    let color = COLORS.success;
    let label = 'نقي';
    
    // Scale AQI (0-300 usually, but we cap at 150 for the meter visual)
    const percentage = Math.min(safeAqi / 150, 1);
    
    if (safeAqi > 100) { color = COLORS.danger; label = 'ملوث'; }
    else if (safeAqi > 50) { color = COLORS.warning; label = 'متوسط'; }

    const endAngle = Math.PI * (1 - percentage);
    const x = cx + r * Math.cos(endAngle);
    const y = cy - r * Math.sin(endAngle);
    const fillPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`;

    return (
        <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
                <FontAwesome5 name="lungs" size={12} color={color} />
                <Text style={styles.featureTitle}>جودة الهواء</Text>
            </View>

            <View style={{ alignItems: 'center', marginTop: 4 }}>
                <Svg width={width} height={height}>
                    <Path 
                        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} 
                        stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} strokeLinecap="round" fill="none" 
                    />
                    <Path 
                        d={fillPath} 
                        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" 
                    />
                </Svg>

                <View style={styles.arcCenterText}>
                    <Text style={styles.arcBigValue}>{safeAqi}</Text>
                    <Text style={[styles.arcLabel, { color: color }]}>{label}</Text>
                </View>
            </View>
        </View>
    );
};

// ============================================================================
//                       5. HOURLY TIMELINE
// ============================================================================
const HourlySkinRisk = ({ forecast }) => {
    if (!forecast || forecast.length === 0) return null;

    const currentHourIndex = new Date().getHours();

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        let hours = date.getHours();
        const isCurrent = hours === currentHourIndex;
        const ampm = hours >= 12 ? 'م' : 'ص';
        
        // Visual hour formatting
        const displayHour = hours % 12 || 12;
        
        return { 
            h: displayHour, 
            m: ampm, 
            isNight: hours >= 18 || hours < 6,
            isCurrent,
            rawHour: hours 
        };
    };

    return (
        <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeaderRow}>
            <FontAwesome5 name="clock" size={14} color={COLORS.accentGreen} />
                <Text style={styles.sectionTitle}>مؤشر البشرة (12 ساعة)</Text>
            </View>

            <View style={styles.timelineContainer}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.timelineScrollContent}
                    // Optional: Try to center content if few items, otherwise start
                    contentOffset={{ x: 0, y: 0 }} 
                >
                    {forecast.map((hour, index) => {
                        const { h, m, isNight, isCurrent } = formatTime(hour.time);
                        
                        // Enhanced Color Logic
                        const color = hour.color || COLORS.success;
                        const icon = hour.icon || (isNight ? 'moon' : 'sun');
                        // Shorten label for cleaner UI if needed
                        const label = hour.label || 'آمن';
                        
                        // Dynamic Height Calculation
                        const barHeight = Math.min(Math.max((hour.uv * 6) + 20, 20), 65);
                        
                        // Is this a risky hour? (e.g. UV > 5)
                        const isRisky = hour.uv >= 5;

                        return (
                            <View key={index} style={[styles.timeSlot, isCurrent && styles.timeSlotActive]}>
                                
                                {/* Top Condition Pill */}
                                <View style={[
                                    styles.timelinePill, 
                                    { backgroundColor: isCurrent ? color : color + '10', borderColor: color + '30' }
                                ]}>
                                    <FontAwesome5 name={icon} size={isCurrent ? 10 : 9} color={isCurrent ? '#fff' : color} />
                                    {/* Hide text on non-current items to reduce clutter, or keep it if you prefer */}
                                    <Text style={[styles.timelinePillText, { color: isCurrent ? '#fff' : color }]}>
                                        {label}
                                    </Text>
                                </View>

                                {/* The Bar Track */}
                                <View style={styles.barTrack}>
                                    {/* The Risk Bar */}
                                    <LinearGradient
                                        colors={[color, color + '80']} // Gradient fade
                                        style={[styles.barFill, { height: barHeight }]} 
                                    />
                                    
                                    {/* Issue Indicator INSIDE the bar */}
                                    {isRisky && (
                                        <View style={[styles.barWarningIcon, { bottom: barHeight + 2 }]}>
                                            <FontAwesome5 name="exclamation" size={8} color={COLORS.danger} />
                                        </View>
                                    )}
                                </View>

                                {/* Time Labels */}
                                <View style={styles.timeLabelContainer}>
                                    {isCurrent ? (
                                        <View style={styles.nowBadge}>
                                            <Text style={styles.nowText}>الآن</Text>
                                        </View>
                                    ) : (
                                        <>
                                            <Text style={styles.timeText}>{h}</Text>
                                            <Text style={styles.ampmText}>{m}</Text>
                                        </>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
};

// ============================================================================
//                       6. ACCESSORIES GRID
// ============================================================================
const AccessoriesSection = ({ accessories }) => {
    if (!accessories || accessories.length === 0) return null;

    return (
        <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeaderRow}>
            <FontAwesome5 name="tshirt" size={14} color={COLORS.accentGreen} />
                <Text style={styles.sectionTitle}>تجهيزات الخروج</Text>
            </View>
            <View style={styles.accessoriesGrid}>
                {accessories.map((item, i) => (
                    <PressableScale key={i} style={styles.accessoryCardWrapper}>
                        <View style={styles.accessoryCard}>
                            <View style={[styles.accessoryIconBox, { backgroundColor: item.color + '15' }]}>
                                <FontAwesome5 name={item.icon} size={18} color={item.color} />
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={styles.accessoryText}>{item.label}</Text>
                                {/* Added a subtle sub-label for context if available, or just visual balance */}
                                <Text style={styles.accessorySubText}>موصى به</Text>
                            </View>
                            {/* Checkmark to show it's a "ToDo" item */}
                            <View style={styles.accessoryCheck}>
                                <Feather name="check" size={12} color={COLORS.card} />
                            </View>
                        </View>
                    </PressableScale>
                ))}
            </View>
        </View>
    );
};

// ============================================================================
//                       7. MAIN SHEET (Detailed View)
// ============================================================================
export const WeatherDetailedSheet = ({ insight }) => {
    const data = insight.customData;

    if (!data) return null;

    const themeKey = data.theme || 'unknown';
    const theme = THEME_VARIANTS[themeKey] || THEME_VARIANTS.unknown;

    // *** FIX: READ RAW DATA FOR INDICATORS ***
    const raw = data.rawWeather || {};
    
    // Read numeric values from raw data (calculated in logic layer)
    const humidity = raw.humidity !== undefined ? raw.humidity : parseFloat(data.metrics?.humidity || 50);
    const dewPoint = raw.dewPoint; // Pass this specifically
    const aqi = raw.aqi !== undefined ? raw.aqi : 50;
    const uvIndex = raw.uvIndex !== undefined ? raw.uvIndex : 0;
    const isDay = raw.isDay !== undefined ? raw.isDay : true;

    return (
        <View style={styles.sheetContainer}>

            {/* 1. HEADER */}
            <View style={[styles.headerContainer, { shadowColor: theme.shadow }]}>
                <LinearGradient colors={theme.colors} style={styles.headerGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
                    {data.location && (
                        <View style={styles.locationTag}>
                            <FontAwesome5 name="map-marker-alt" size={10} color="#fff" />
                            <Text style={styles.locationText}>{data.location}</Text>
                        </View>
                    )}
                    <View style={styles.headerCenter}>
                        <View style={styles.headerIconRing}>
                            <FontAwesome5 name={theme.icon} size={40} color="#fff" />
                        </View>
                        <Text style={styles.headerTitle}>{insight.title}</Text>
                        <Text style={styles.headerSubtitle}>{insight.short_summary}</Text>
                    </View>
                    {data.metrics && (
                        <View style={styles.metricPill}>
                            <Text style={styles.metricLabel}>{data.metrics.label}</Text>
                            <Text style={styles.metricValue}>{data.metrics.value}</Text>
                            <View style={styles.metricDivider} />
                            <Text style={styles.metricStatus}>{data.metrics.status}</Text>
                        </View>
                    )}
                </LinearGradient>
            </View>

            {/* 2. TIMER (Only show if UV is relevant/Daytime) */}
            {isDay && <SpfTimerWidget uvIndex={uvIndex} />}


            {/* 3. METRICS SCROLL (Indicators) */}
            <View style={{ marginTop: 20 }}>
                <Text style={[styles.sectionTitle, {marginRight: 8, marginBottom: 10}]}>مؤشرات الجو</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, flexDirection: 'row-reverse', gap: 10 }}>
                    {/* Pass isDay to SunCycle */}
                    <SunCycleWidget uvIndex={uvIndex} isDay={isDay} />
                    
                    {/* Pass dewPoint to HydroGauge for medical accuracy */}
                    <HydroGauge humidity={humidity} dewPoint={dewPoint} />
                    
                    <PoreClarityWidget aqi={aqi} />
                </ScrollView>
            </View>

            {/* 4. TIMELINE */}
            <HourlySkinRisk forecast={data.hourlyForecast} />

            {/* 5. ACCESSORIES */}
            <AccessoriesSection accessories={data.accessories} />
            
            {/* 6. IMPACT ANALYSIS */}
            {data.impact && (
                <View style={styles.sectionWrapper}>
                    <View style={styles.sectionHeaderRow}>
                    <FontAwesome5 name="chart-pie" size={14} color={COLORS.accentGreen} />
                        <Text style={styles.sectionTitle}>تحليل الأثر</Text>
                    </View>
                    <View style={styles.impactCard}>
                        <View style={styles.impactSide}>
                            <View style={styles.impactHeader}>
                                <View style={[styles.impactIconBox, { backgroundColor: COLORS.accentGreen + '15' }]}>
                                    <FontAwesome5 name="user-alt" size={12} color={COLORS.accentGreen} />
                                </View>
                                <Text style={styles.impactTitle}>البشرة</Text>
                            </View>
                            <Text style={styles.impactBody}>{data.impact.skin}</Text>
                        </View>
                        <View style={styles.impactDividerVertical} />
                        <View style={styles.impactSide}>
                            <View style={styles.impactHeader}>
                                <View style={[styles.impactIconBox, { backgroundColor: COLORS.gold + '15' }]}>
                                    <FontAwesome5 name="cut" size={12} color={COLORS.gold} />
                                </View>
                                <Text style={styles.impactTitle}>الشعر</Text>
                            </View>
                            <Text style={styles.impactBody}>{data.impact.hair}</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* 7. ROUTINE ADJUSTMENTS */}
            {data.routine_adjustments && data.routine_adjustments.length > 0 ? (
                <View style={styles.sectionWrapper}>
                    <View style={styles.sectionHeaderRow}>
                    <FontAwesome5 name="magic" size={14} color={COLORS.accentGreen} />
                        <Text style={styles.sectionTitle}>توصيات الروتين</Text>
                    </View>
                    
                    {/* Container with visual separation but no heavy boxing */}
                    <View style={styles.cleanListContainer}>
                        {data.routine_adjustments.map((item, index) => (
                            <React.Fragment key={index}>
                                <CleanRoutineItem item={item} />
                                {/* Add separator line except for the last item */}
                                {index < data.routine_adjustments.length - 1 && (
                                    <View style={styles.cleanDivider} />
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                </View>
            ) : null} 
            {/* The : null ensures nothing renders if array is empty */}

            <View style={{ height: 40 }} />
        </View>
    );
};

const CleanRoutineItem = ({ item }) => {
    const isOwned = !!item.product;
    const isAdviceOnly = !item.product && !item.missing_suggestion; // e.g., "Skip Moisturizer"

    // 1. Determine Status & Color
    let statusColor = COLORS.textSecondary; // Default
    let icon = "info-circle";
    let subText = "";

    if (isOwned) {
        statusColor = COLORS.success;
        icon = "check-circle";
        subText = `${item.product}`; // Show your specific product name
    } else if (isAdviceOnly) {
        statusColor = COLORS.blue;
        icon = "lightbulb";
        subText = item.missing_suggestion || "نصيحة سلوكية";
    } else {
        statusColor = COLORS.warning;
        icon = "shopping-bag";
        subText = `مقترح: ${item.missing_suggestion}`; // Generic ingredient
    }

    return (
        <View style={styles.cleanRowContainer}>
            {/* Context Icon (Left) */}
            <View style={[styles.cleanIconBox, { backgroundColor: statusColor + '15' }]}>
                <FontAwesome5 name={icon} size={16} color={statusColor} />
            </View>

            {/* Text Content */}
            <View style={styles.cleanContent}>
                <View style={styles.cleanHeader}>
                    <Text style={styles.cleanAction}>{item.action}</Text>
                    <Text style={styles.cleanStepTag}>{item.step}</Text>
                </View>
                
                {/* Only render subtext if it exists */}
                {subText ? (
                    <Text style={[
                        styles.cleanProductText, 
                        { color: isOwned ? COLORS.textPrimary : COLORS.textSecondary }
                    ]}>
                        {subText}
                    </Text>
                ) : null}
            </View>
        </View>
    );
};



// ============================================================================
//                       8. LOCATION PERMISSION MODAL (FIXED)
// ============================================================================

export const LocationPermissionModal = ({ visible, onClose }) => {
    const [showModal, setShowModal] = useState(visible);
    
    const slideAnim = useRef(new Animated.Value(100)).current; 
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setShowModal(true);
            // FIX: Use timing + Easing.out(Easing.cubic) instead of spring.
            // This looks smooth but finishes deterministically, allowing clicks immediately.
            Animated.parallel([
                Animated.timing(opacityAnim, { 
                    toValue: 1, 
                    duration: 300, 
                    useNativeDriver: true 
                }),
                Animated.timing(slideAnim, { 
                    toValue: 0, 
                    duration: 300, 
                    easing: Easing.out(Easing.cubic), 
                    useNativeDriver: true 
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacityAnim, { 
                    toValue: 0, 
                    duration: 200, 
                    useNativeDriver: true 
                }),
                Animated.timing(slideAnim, { 
                    toValue: 150, 
                    duration: 200, 
                    useNativeDriver: true 
                })
            ]).start(({ finished }) => { 
                if (finished) setShowModal(false); 
            });
        }
    }, [visible]);

    const handleGrantPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onClose();
            } else {
                AlertService.show({
                    title: "الإذن مطلوب",
                    message: "يبدو أنك قمت برفض الإذن سابقاً. يرجى تفعيل الموقع يدوياً من إعدادات الهاتف.",
                    type: 'warning',
                    buttons: [
                        { text: "إلغاء", style: "secondary" },
                        { 
                            text: "الإعدادات", 
                            style: "primary", 
                            onPress: () => {
                                Linking.openSettings();
                                onClose(); 
                            } 
                        }
                    ]
                });
            }
        } catch (e) {
            Linking.openSettings();
        }
    };

    if (!showModal) return null;

    return (
        <Modal transparent visible={showModal} onRequestClose={onClose} animationType="none" statusBarTranslucent>
            <View style={styles.modalOverlay} pointerEvents="box-none">
                {/* Backdrop */}
                <Animated.View style={[styles.modalBackdrop, { opacity: opacityAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>

                {/* Content */}
                <Animated.View style={[
                    styles.modalContent, 
                    { 
                        opacity: opacityAnim, 
                        transform: [{ translateY: slideAnim }] 
                    }
                ]}>
                    
                    <View style={styles.modalIconFloat}>
                        <LinearGradient colors={[COLORS.accentGreen, '#4a8a73']} style={styles.modalIconGradient}>
                            <FontAwesome5 name="cloud-sun" size={32} color="#fff" />
                        </LinearGradient>
                    </View>

                    <Text style={styles.modalTitle}>اكتشفي مناخ بشرتك</Text>
                    <Text style={styles.modalBody}>
                        اسمحي لنا بتحليل طقس منطقتك لتفعيل الميزات الذكية:
                    </Text>

                    <View style={styles.featureListContainer}>
                        <View style={styles.featureRow}>
                            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                                <FontAwesome5 name="clock" size={14} color={COLORS.gold} />
                            </View>
                            <Text style={styles.featureText}>مؤقت ذكي لتجديد واقي الشمس</Text>
                        </View>
                        <View style={styles.featureRow}>
                            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                <FontAwesome5 name="sun" size={14} color={COLORS.danger} />
                            </View>
                            <Text style={styles.featureText}>تحذيرات فورية من الأشعة UV</Text>
                        </View>
                        <View style={styles.featureRow}>
                            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                                <FontAwesome5 name="wind" size={14} color={COLORS.blue} />
                            </View>
                            <Text style={styles.featureText}>تحليل التلوث وجودة الهواء</Text>
                        </View>
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity 
                            onPress={onClose} 
                            style={styles.btnSecondary} 
                            activeOpacity={0.7}
                            delayPressIn={0} // <--- FIX: Removes tap delay
                        >
                            <Text style={styles.btnSecondaryText}>لاحقاً</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={handleGrantPermission} 
                            style={styles.btnPrimary}
                            activeOpacity={0.8}
                            delayPressIn={0} // <--- FIX: Removes tap delay
                        >
                            <Text style={styles.btnPrimaryText}>تفعيل الميزات</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};


export const NightPrepCard = ({ data, onPress }) => {
    if (!data) return null;

    return (
        <StaggeredItem index={1} animated={true}>
            <PressableScale onPress={onPress}>
                <View style={styles.nightPrepContainer}>
                    <LinearGradient 
                        colors={['#1e1b4b', '#312e81']} 
                        start={{x:0, y:0}} end={{x:1, y:1}} 
                        style={StyleSheet.absoluteFill} 
                    />
                    
                    {/* Moon Glow Effect */}
                    <View style={styles.moonGlow} />
                    
                    <View style={styles.nightPrepContent}>
                        <View style={styles.nightHeader}>
                            <View style={[styles.iconBox, {backgroundColor: data.color + '30'}]}>
                                <FontAwesome5 name={data.icon} size={16} color={data.color} />
                            </View>
                            <Text style={styles.nightTag}>خطة الليلة لطقس الغد</Text>
                        </View>
                        
                        <Text style={styles.nightTitle}>{data.title}</Text>
                        <Text style={styles.nightBody}>
                            {data.reason} <Text style={{fontFamily: 'Tajawal-Bold', color: '#fff'}}>{data.action}</Text>
                        </Text>
                        
                        <View style={styles.nightActionRow}>
                            <Text style={styles.nightBtnText}>إضافة للروتين المسائي</Text>
                            <Feather name="plus-circle" size={16} color="#c7d2fe" />
                        </View>
                    </View>
                    
                    <FontAwesome5 name="moon" size={80} color="#ffffff10" style={styles.bgMoon} />
                </View>
            </PressableScale>
        </StaggeredItem>
    );
};

// 2. INTERACTIVE EXPOSURE SLIDER (The Context Switcher)
export const ExposureSlider = ({ value, onChange }) => {
    // Value: 0 (Indoors), 1 (Commute), 2 (Outdoors)
    
    // We use the prop 'value' to drive the animation, not internal state
    const widthAnim = useRef(new Animated.Value(value)).current;

    useEffect(() => {
        Animated.spring(widthAnim, {
            toValue: value,
            useNativeDriver: false, // Layout animation requires false
            friction: 8,
            tension: 40
        }).start();
    }, [value]);

    const options = [
        { label: 'داخل المنزل', icon: 'home' },   // Index 0
        { label: 'خروج محدود', icon: 'walking' }, // Index 1
        { label: 'خارج المنزل', icon: 'sun' },    // Index 2
    ];

    const handlePress = (index) => {
        Haptics.selectionAsync();
        onChange(index); // Notify parent immediately
    };

    return (
        <View style={styles.sliderContainer}>
            <View style={{flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 5}}>
                <Text style={styles.sliderTitle}>طبيعة يومك:</Text>
                <View style={{backgroundColor: 'rgba(90, 156, 132, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6}}>
                    <Text style={{color: COLORS.accentGreen, fontSize: 10, fontFamily: 'Tajawal-Regular'}}>
                        {value === 0 ? 'تنبيهات منخفضة' : value === 2 ? 'تنبيهات قصوى' : 'تنبيهات قياسية'}
                    </Text>
                </View>
            </View>
            
            <View style={styles.sliderTrack}>
                {/* 
                   ANIMATED PILL: 
                   In RTL (row-reverse), Left: 0 starts at the LEFT side of the screen (Visual End).
                   But Flex items start at the RIGHT. 
                   We use 'right' property for interpolation to match RTL logic.
                */}
                <Animated.View style={[styles.sliderPill, {
                    right: widthAnim.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: ['1%', '34%', '67%'] // Moves from Right to Left
                    })
                }]} />
                
                {options.map((opt, i) => {
                    const isActive = value === i;
                    return (
                        <Pressable key={i} onPress={() => handlePress(i)} style={styles.sliderOption}>
                            <FontAwesome5 
                                name={opt.icon} 
                                size={14} 
                                color={isActive ? '#1A2D27' : '#B0C4DE'} 
                            />
                            <Text style={[
                                styles.sliderText, 
                                { 
                                    color: isActive ? '#1A2D27' : '#B0C4DE', 
                                    fontFamily: isActive ? 'Tajawal-Bold' : 'Tajawal-Regular'
                                }
                            ]}>
                                {opt.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};


// ============================================================================
//                       STYLES (COMPLETE & FIXED)
// ============================================================================
const styles = StyleSheet.create({
    // --- Skeleton ---
    loadingCard: {
        flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 24, padding: 16, marginBottom: 20,
        borderWidth: 1, borderColor: COLORS.border,
    },
    loadingIcon: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(90, 156, 132, 0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 16,
    },
    skeletonLine: { backgroundColor: 'rgba(90, 156, 132, 0.2)', borderRadius: 4 },

    // --- Compact Widget (Hero) ---
    widgetContainer: {
        marginBottom: 24, borderRadius: 32,
        shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 12,
    },
    widgetGradient: {
        flexDirection: 'row-reverse', alignItems: 'center', padding: 22, borderRadius: 32, overflow: 'hidden', position: 'relative',
    },
    widgetIconCircle: {
        width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginLeft: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    },
    widgetContent: { flex: 1, justifyContent: 'center', paddingRight: 4 },
    widgetTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 22, color: '#fff', textAlign: 'right', marginBottom: 2, textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 5 },
    widgetSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: 'rgba(255,255,255,0.95)', textAlign: 'right' },
    widgetAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18 },
    widgetBgIcon: { position: 'absolute', left: -25, bottom: -25, opacity: 0.08, transform: [{ rotate: '15deg' }] },

    // --- Mini Card ---
    miniCardContainer: {
        width: 150, height: 160, borderRadius: 24, padding: 16, justifyContent: 'space-between',
        overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
    },
    miniCardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    miniIconCircle: {
        width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', opacity: 0.9, shadowColor: '#fff', shadowOpacity: 0.5, shadowRadius: 4 },
    miniCardTitle: {
        fontFamily: 'Tajawal-Bold', fontSize: 15, color: '#fff', textAlign: 'right', lineHeight: 22,
        textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3,
    },
    miniCardFooter: { flexDirection: 'row-reverse' },
    glassPill: {
        flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start',
    },
    glassPillText: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: '#fff' },
    glassSeparator: { width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 6 },

    // --- SPF Timer ---
    spfContainer: {
        backgroundColor: COLORS.cardSurface,
        borderRadius: 26,
        padding: 18,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 20,
        // No border, just subtle depth
        
    },
    
    // Safe State
    spfSafeBg: {
        backgroundColor: '#064e3b', // Deep green bg
    },
    spfIconCircle: {
        width: 36, height: 36, borderRadius: 18, 
        alignItems: 'center', justifyContent: 'center', marginLeft: 12
    },

    // Layout
    spfContent: {
        flex: 1,
        paddingRight: 16, // Space between text and ring
        justifyContent: 'center',
    },
    
    // Typography
    spfTitle: { 
        fontFamily: 'Tajawal-ExtraBold', 
        fontSize: 16, 
        color: COLORS.textPrimary, 
        textAlign: 'right',
        marginBottom: 2
    },
    spfDesc: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 13, 
        color: COLORS.textSecondary, 
        textAlign: 'right' 
    },
    statusLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        color: COLORS.accentGreen,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    timerBigDisplay: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 34, // Massive, readable number
        color: COLORS.textPrimary,
        lineHeight: 40,
        letterSpacing: 1
    },

    // Ring
    ringWrapper: {
        width: 80, height: 80, 
        alignItems: 'center', justifyContent: 'center'
    },
    ringCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center'
    },
    ringVal: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 20,
        color: COLORS.textPrimary,
        lineHeight: 22
    },
    ringUnit: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        color: COLORS.textDim
    },

    // Actions
    startPill: {
        borderRadius: 12,
        overflow: 'hidden',
        minWidth: 100
    },
    startPillGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 8
    },
    startPillText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: '#fff'
    },
    
    // Minimal Link Button (Stop)
    linkButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginTop: 2
    },
    linkButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.textDim, // Subtle color
        textDecorationLine: 'underline'
    },
    // --- Features ---
    featureCard: {
        width: 120, // Width to fit the 110px Arc comfortably
        height: 125, // Height to fit Header + Arc + Text
        backgroundColor: COLORS.cardSurface, 
        borderRadius: 24, 
        padding: 10,
        borderWidth: 1, 
        borderColor: COLORS.border, 
        justifyContent: 'flex-start',
        
    },
    featureHeader: { 
        flexDirection: 'row', // Icon First (Left), Title Last (Right) - due to RTL/row-reverse not being applied here? 
        // NOTE: If your app is RTL forced, use 'row-reverse' or arrange items accordingly.
        // My code snippets above assumed Icon First in code = Visual Left in LTR or Visual Right in RTL depending on container.
        // Let's force alignment:
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 5,
        paddingHorizontal: 4
    },
    featureTitle: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 11, 
        color: COLORS.textSecondary 
    },
    
    // Centered Text inside the Arc
    arcCenterText: {
        position: 'absolute',
        top: 25, // Pushes text down into the curve
        alignItems: 'center',
        width: '100%'
    },
    arcBigValue: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 20,
        color: COLORS.textPrimary,
        lineHeight: 24
    },
    arcLabel: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
        marginTop: 0
    },
    // Hydro
    hydroContainer: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, flex: 1, paddingBottom: 5 },
    hydroBarBg: { width: 6, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
    hydroBarFill: { width: '100%', borderRadius: 3 },

    // Radar
    radarCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 4 },
    radarFill: { position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.3 },

    // --- Timeline ---
    timelineContainer: {
        backgroundColor: COLORS.cardSurface, 
        borderRadius: 24, 
        paddingVertical: 20,
        borderWidth: 1, 
        borderColor: COLORS.border, 
        marginTop: 10,
        // Make it look slightly deeper
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    timelineScrollContent: { 
        paddingHorizontal: 20, 
        flexDirection: 'row-reverse',
        paddingBottom: 5 // Extra padding for shadows
    },
    timeSlot: { 
        alignItems: 'center', 
        width: 60, 
        marginLeft: 8,
        justifyContent: 'flex-end',
        borderRadius: 12,
        paddingVertical: 4
    },
    // Highlighting the current hour
    timeSlotActive: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(90, 156, 132, 0.2)',
    },
    timelinePill: {
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 6, 
        paddingVertical: 3,
        borderRadius: 8, 
        borderWidth: 1, 
        marginBottom: 8, 
        gap: 4, 
        minWidth: 45, 
        justifyContent: 'center',
    },
    timelinePillText: { 
        fontSize: 9, 
        fontFamily: 'Tajawal-Bold' 
    },
    barTrack: {
        height: 70, // Increased height for better visualization
        width: 6, 
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 3, 
        justifyContent: 'flex-end', 
        overflow: 'visible', // Changed to visible so icons can float if needed, though we put inside
        alignItems: 'center',
        marginBottom: 8
    },
    barFill: { 
        width: '100%', 
        borderRadius: 3,
        minHeight: 4 
    },
    barWarningIcon: {
        position: 'absolute',
        backgroundColor: 'rgba(239, 68, 68, 0.15)', // faint red circle
        width: 14,
        height: 14,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
        // Make it blink or just standout
        borderWidth: 1,
        borderColor: COLORS.danger
    },
    timeLabelContainer: { 
        alignItems: 'center', 
        height: 32, // Fixed height to align everything
        justifyContent: 'flex-start'
    },
    timeText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 13, 
        color: COLORS.textSecondary 
    },
    ampmText: { 
        fontSize: 9, 
        color: COLORS.textDim, 
        fontFamily: 'Tajawal-Regular', 
        marginTop: -2 
    },
    nowBadge: {
        backgroundColor: COLORS.accentGreen,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 2
    },
    nowText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
        color: '#fff'
    },
    // --- Accessories ---
    accessoryCardWrapper: {
        flexGrow: 1, 
        maxWidth: '48%', 
    },
    accessoryCard: {
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        backgroundColor: COLORS.cardSurface,
        borderRadius: 18, 
        padding: 12, 
        borderWidth: 1, 
        borderColor: COLORS.border,
        gap: 10,
        height: 64
    },
    accessoryIconBox: { 
        width: 40, 
        height: 40, 
        borderRadius: 14, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    accessoryText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 13, 
        color: COLORS.textPrimary, 
        textAlign: 'right' 
    },
    accessorySubText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        color: COLORS.textDim,
        textAlign: 'right'
    },
    accessoryCheck: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: COLORS.accentGreen,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.8
    },
    // --- Header & General ---
    sheetContainer: { paddingHorizontal: 24 },
    sectionWrapper: { marginTop: 30, paddingHorizontal: 4 },
    sectionHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12, gap: 8, paddingRight: 4 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 17, color: COLORS.textPrimary, textAlign: 'right' },

    headerContainer: {
        borderRadius: 32, marginBottom: 15, overflow: 'visible',
        shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 15,
    },
    headerGradient: { padding: 25, borderRadius: 32, alignItems: 'center' },
    locationTag: {
        position: 'absolute', top:22, flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    locationText: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: '#fff' },
    headerCenter: { alignItems: 'center', marginTop: 15, marginBottom: 20 },
    headerIconRing: {
        width: 65, height: 65, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 15, marginTop: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10
    },
    headerTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: '#fff', textAlign: 'center', marginBottom: 6 },
    headerSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 15, color: 'rgba(255,255,255,0.9)', textAlign: 'center', maxWidth: '85%', lineHeight: 24 },
    metricPill: {
        flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 10
    },
    metricLabel: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: 'rgba(255,255,255,0.9)' },
    metricValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, color: '#fff' },
    metricDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.4)' },
    metricStatus: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: '#fff' },

    // --- Impact ---
    impactCard: {
        flexDirection: 'row-reverse', backgroundColor: COLORS.cardSurface, borderRadius: 24,
        padding: 24, borderWidth: 1, borderColor: COLORS.border,
    },
    impactSide: { flex: 1, gap: 12 },
    impactHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    impactIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    impactTitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textPrimary,},
    impactBody: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 22, alignSelf: 'center' },
    impactDividerVertical: { width: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 20 },

    // --- Routine ---
    routineCard: {
        backgroundColor: COLORS.cardSurface, borderRadius: 22, padding: 18, marginBottom: 16,
        borderWidth: 1, borderRightWidth: 4,
    },
    routineHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 14, gap: 12 },
    stepTag: { backgroundColor: 'rgba(90, 156, 132, 0.1)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
    stepTagText: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.accentGreen },
    routineActionText: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
    matchBox: { flexDirection: 'row-reverse', alignItems: 'center', padding: 14, borderRadius: 16 },
    matchLabel: { fontFamily: 'Tajawal-Bold', fontSize: 12, marginBottom: 4, textAlign: 'right' },
    productName: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textPrimary, textAlign: 'right' },
    matchIconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

    // --- Night Prep ---
    nightPrepContainer: {
        height: 160, borderRadius: 28, padding: 20, overflow: 'hidden', position: 'relative',
        marginBottom: 20, borderWidth: 1, borderColor: '#4f46e5'
    },
    moonGlow: {
        position: 'absolute', top: -50, right: -50, width: 150, height: 150,
        borderRadius: 75, backgroundColor: '#818cf8', opacity: 0.2, filter: 'blur(30px)' 
    },
    nightPrepContent: { flex: 1, justifyContent: 'space-between' },
    nightHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    iconBox: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    nightTag: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: '#c7d2fe' },
    nightTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: '#fff', textAlign: 'right', marginTop: 4 },
    nightBody: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: '#e0e7ff', textAlign: 'right', maxWidth: '85%', lineHeight: 20 },
    nightActionRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, opacity: 0.8 },
    nightBtnText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: '#c7d2fe' },
    bgMoon: { position: 'absolute', left: -20, bottom: -20, opacity: 0.1, transform: [{ rotate: '15deg' }] },

    // --- Slider ---
    sliderContainer: { marginBottom: 20, paddingHorizontal: 4 },
    sliderTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary },
    sliderTrack: {
        flexDirection: 'row-reverse', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 16, height: 48,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'relative', justifyContent: 'space-between',
    },
    sliderPill: {
        position: 'absolute', top: 4, bottom: 4, width: '32%', backgroundColor: '#A3E4D7', borderRadius: 12,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4, zIndex: 1,
    },
    sliderOption: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 10, height: '100%' },
    sliderText: { fontSize: 11, paddingBottom: 2 },
    
    // --- Modal ---
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)' },
    modalContent: {
        width: width * 0.85, backgroundColor: COLORS.card, borderRadius: 28, paddingHorizontal: 24, paddingTop: 45, paddingBottom: 24,
        alignItems: 'center', borderWidth: 1, borderColor: 'rgba(90, 156, 132, 0.3)', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 30, elevation: 20
    },
    modalIconFloat: { position: 'absolute', top: -40, alignSelf: 'center', shadowColor: COLORS.accentGreen, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
    modalIconGradient: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: COLORS.card },
    modalTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 22, color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
    modalBody: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 },
    featureListContainer: { width: '100%', marginBottom: 25, gap: 12 },
    featureRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 12, gap: 12 },
    featureIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    featureText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textPrimary, flex: 1, textAlign: 'right' },
    modalActions: { flexDirection: 'row-reverse', width: '100%', gap: 12 },
    btnPrimary: { flex: 1, backgroundColor: COLORS.accentGreen, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.accentGreen, shadowOpacity: 0.3, shadowOffset: {width: 0, height: 4}, elevation: 4 },
    btnPrimaryText: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: '#ffffff', marginBottom: 2 },
    btnSecondary: { flex: 0.4, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
    btnSecondaryText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textDim, marginBottom: 2 },

    // --- Clean Routine Styles (New) ---
    cleanListContainer: {
        backgroundColor: COLORS.cardSurface,
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        // No heavy border, just subtle containment
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cleanRowContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 12,
    },
    cleanIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20, // Circular
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 14, // Spacing from text (RTL)
    },
    cleanContent: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    cleanHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cleanAction: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textPrimary,
        textAlign: 'right',
    },
    cleanStepTag: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        color: COLORS.textDim,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    cleanProductText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        textAlign: 'right',
        opacity: 0.9,
    },
    cleanDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        width: '100%',
    },
});