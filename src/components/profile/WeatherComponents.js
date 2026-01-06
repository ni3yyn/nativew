
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

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);


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
//               3. SMART SPF TIMER (ENHANCED)
// ============================================================================
const SpfTimerWidget = ({ uvIndex = 0, debugMode = false }) => { // We'll remove debugMode in the next step
    const { isActive, endTime, startTimer, stopTimer, notificationId: storedNotificationId } = useTimerStore();
    const [displayTime, setDisplayTime] = useState(0);

    const size = 100;
    const strokeWidth = 9;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const DEBUG_DURATION = 10 * 60;

    // This function now reliably calculates the duration based on current props.
    const calculateSpfDuration = (uv, isDebug) => {
        let duration = 0;
        if (uv >= 8) duration = 75 * 60;
        else if (uv >= 6) duration = 90 * 60;
        else if (uv >= 3) duration = 120 * 60;
        
        // This logic remains for testing until we remove it.
        if (duration === 0 && isDebug) {
            return DEBUG_DURATION;
        }
        return duration;
    };
    
    // Notification setup (runs once)
    useEffect(() => {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
        });
        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('spf-reminder-channel', {
                name: 'SPF Reminders',
                importance: Notifications.AndroidImportance.MAX,
            });
        }
    }, []);

    // Syncs the local display with the global timer state
    useEffect(() => {
        if (isActive && endTime) {
            const updateDisplay = () => {
                const remaining = Math.round((endTime - Date.now()) / 1000);
                if (remaining > 0) {
                    setDisplayTime(remaining);
                } else {
                    if (useTimerStore.getState().isActive) {
                        stopTimer(); 
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                }
            };
            updateDisplay();
            const interval = setInterval(updateDisplay, 1000);
            return () => clearInterval(interval);
        }
    }, [isActive, endTime, stopTimer]);
    
    const requestPermissions = async () => {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') return true;
        const { status: finalStatus } = await Notifications.requestPermissionsAsync();
        return finalStatus === 'granted';
    };

    const handleStart = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        // =================================================================
        // THE FIX IS HERE: Calculate duration on-the-fly inside the handler
        // This prevents the stale state bug completely.
        const durationForTimer = calculateSpfDuration(uvIndex, debugMode);
        // =================================================================
        
        if (durationForTimer <= 0) return; // Guard against starting a zero-second timer

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const newNotificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: "☀️ حان وقت تجديد الحماية!",
                body: `مر الوقت الموصى به بناءً على مؤشر الأشعة فوق البنفسجية (${uvIndex}). جددي واقي الشمس الآن.`,
                sound: 'default',
            },
            trigger: { 
                seconds: durationForTimer, // Use the fresh, correct value
                channelId: 'spf-reminder-channel',
            },
        });
        
        startTimer(durationForTimer, newNotificationId);
    };

    const handleStop = async (userInitiated = true) => {
        if (userInitiated) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (storedNotificationId) {
            await Notifications.cancelScheduledNotificationAsync(storedNotificationId);
        }
        stopTimer();
    };
    
    const formatTime = (seconds) => {
        if (seconds <= 0) return "00:00";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const renderContent = () => {
        const currentCalculatedDuration = calculateSpfDuration(uvIndex, debugMode);

        if (currentCalculatedDuration === 0) {
             return (
                <>
                    <View style={styles.timerRingContainer}>
                         <FontAwesome5 name="shield-alt" size={40} color={COLORS.success} />
                    </View>
                    <View style={styles.timerInfoContainer}>
                        <Text style={styles.timerTitle}>الحماية كافية</Text>
                        <Text style={styles.timerDescription}>مؤشر الأشعة فوق البنفسجية منخفض. لا حاجة لمؤقت الحماية في الوقت الحالي.</Text>
                    </View>
                </>
            );
        }

        const durationForProgress = useTimerStore.getState().duration;
        const progress = isActive && durationForProgress > 0 ? displayTime / durationForProgress : 0;
        const strokeDashoffset = circumference * (1 - progress);

        return (
            <>
                <View style={styles.timerRingContainer}>
                    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                        <Circle stroke={COLORS.border} fill="none" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} />
                        {isActive && (
                           <Circle
                                stroke={COLORS.accentGreen}
                                fill="none"
                                cx={size/2} cy={size/2}
                                r={radius}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${size/2} ${size/2})`}
                            />
                        )}
                    </Svg>
                     <View style={styles.timerTextOverlay}>
                         <FontAwesome5 name="sun" size={20} color={isActive ? COLORS.accentGreen : COLORS.gold} />
                    </View>
                </View>
                <View style={styles.timerInfoContainer}>
                    {isActive ? (
                        <>
                            <Text style={styles.timerTitle}>مؤقت الحماية فعال</Text>
                            <Text style={styles.timerCountdown}>{formatTime(displayTime)}</Text>
                            <Text style={styles.timerDescription}>سنقوم بتذكيرك عندما يحين وقت تجديد واقي الشمس.</Text>
                             <PressableScale style={[styles.timerButton, styles.timerButtonStop]} onPress={() => handleStop(true)}>
                                <Text style={styles.timerButtonText}>إيقاف المؤقت</Text>
                            </PressableScale>
                        </>
                    ) : (
                        <>
                            <Text style={styles.timerTitle}>ابدأي مؤقت الحماية</Text>
                            <Text style={styles.timerDescription}>بناءً على مؤشر UV الحالي، نوصي بتجديد الحماية كل {currentCalculatedDuration / 60} دقيقة.</Text>
                            <PressableScale style={[styles.timerButton, styles.timerButtonStart]} onPress={handleStart}>
                                <Text style={styles.timerButtonText}>✨ لقد وضعت واقي الشمس</Text>
                            </PressableScale>
                        </>
                    )}
                </View>
            </>
        );
    };

    return (
        <View style={styles.spfContainer}>
            {renderContent()}
        </View>
    );
};


// ============================================================================
//               4. SKIN-CENTRIC METRICS (UV & Hydration)
// ============================================================================

// --- 4.1 SUN CYCLE (UV DRIVEN) ---
const SunCycleWidget = ({ currentHour = new Date().getHours(), uvIndex = 0 }) => {
    const width = 100;
    const height = 50;
    const cx = 50; const cy = 45; const r = 40;

    // Normalize sun position strictly on time (6am to 6pm)
    const normalizedHour = Math.max(6, Math.min(18, currentHour));
    const progress = (normalizedHour - 6) / 12; // 0 to 1
    const angle = Math.PI * (1 - progress);
    const sunX = cx + r * Math.cos(angle);
    const sunY = cy - r * Math.sin(angle);

    // ACTION LOGIC based on ACTUAL UV, not just time
    let actionLabel = "آمن: استمتعي";
    let statusColor = COLORS.success;

    if (uvIndex >= 8) {
        actionLabel = "خطر: الزمي الظل";
        statusColor = COLORS.danger;
    } else if (uvIndex >= 6) {
        actionLabel = "تحذير: جددي الحماية";
        statusColor = COLORS.warning;
    } else if (uvIndex >= 3) {
        actionLabel = "تنبيه: البسي نظارة";
        statusColor = COLORS.gold;
    }

    return (
        <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
                <Text style={styles.featureTitle}>دورة الشمس</Text>
                <FontAwesome5 name="sun" size={12} color={statusColor} />
            </View>
            <View style={{ alignItems: 'center', marginTop: 2 }}>
                <Svg width={width} height={height}>
                    <Path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="4, 4" fill="none" />
                    <Circle cx={sunX} cy={sunY} r="5" fill={statusColor} />
                    <Circle cx={sunX} cy={sunY} r="10" fill={statusColor} opacity="0.3" />
                </Svg>
                <Text style={[styles.featureValue, {fontSize: 11, color: statusColor}]}>{actionLabel}</Text>
            </View>
        </View>
    );
};

// --- 4.2 HYDRO-GAUGE (Skin Hydration) ---
const HydroGauge = ({ humidity = 50 }) => {
    // 30% or less = Dry Skin Risk
    const isDry = humidity < 35;
    const color = isDry ? COLORS.warning : COLORS.blue;

    return (
        <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
                <Text style={styles.featureTitle}>رطوبة الجو</Text>
                <FontAwesome5 name="tint" size={12} color={color} />
            </View>
            <View style={styles.hydroContainer}>
                <View style={styles.hydroBarBg}>
                    <View style={[styles.hydroBarFill, { height: `${humidity}%`, backgroundColor: color }]} />
                </View>
                <View style={{ justifyContent: 'center', gap: 2 }}>
                    <Text style={styles.featureValue}>{humidity}%</Text>
                    <Text style={styles.featureSub}>{isDry ? 'جو جاف جداً' : 'رطوبة مثالية'}</Text>
                </View>
            </View>
        </View>
    );
};

// --- 4.3 PORE CLARITY (Pollution) ---
const PoreClarityWidget = ({ aqi = 50 }) => {
    const isClean = aqi < 60;
    const color = isClean ? COLORS.success : COLORS.danger;

    return (
        <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
                <Text style={styles.featureTitle}>نقاء المسام</Text>
                <FontAwesome5 name="lungs" size={12} color={color} />
            </View>
            <View style={{ alignItems: 'center', marginTop: 10 }}>
                <View style={[styles.radarCircle, { borderColor: color }]}>
                    <View style={[styles.radarFill, { backgroundColor: color, height: `${Math.min(aqi, 100)}%` }]} />
                    <FontAwesome5 name={isClean ? "smile-beam" : "dizzy"} size={18} color="#fff" style={{ zIndex: 2 }} />
                </View>
                <Text style={styles.featureValue}>{isClean ? 'هواء نقي' : 'خطر انسداد'}</Text>
            </View>
        </View>
    );
};

// ============================================================================
//                       5. HOURLY TIMELINE
// ============================================================================
const HourlySkinRisk = ({ forecast }) => {
    if (!forecast || forecast.length === 0) return null;

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        let hours = date.getHours();
        const ampm = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return { h: hours, m: ampm, isNight: date.getHours() >= 18 || date.getHours() < 6 };
    };

    return (
        <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>مؤشر البشرة (12 ساعة)</Text>
                <FontAwesome5 name="clock" size={14} color={COLORS.accentGreen} />
            </View>

            <View style={styles.timelineContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineScrollContent}>
                    {forecast.map((hour, index) => {
                        const { h, m, isNight } = formatTime(hour.time);
                        const color = hour.color || COLORS.success;
                        const icon = hour.icon || (isNight ? 'moon' : 'sun');
                        const label = hour.label || 'آمن';
                        const barHeight = Math.min(Math.max((hour.uv * 6) + 15, 15), 55);

                        return (
                            <View key={index} style={styles.timeSlot}>
                                <View style={[styles.timelinePill, { backgroundColor: color + '15', borderColor: color + '40' }]}>
                                    <FontAwesome5 name={icon} size={9} color={color} />
                                    <Text style={[styles.timelinePillText, { color: color }]}>{label}</Text>
                                </View>
                                <View style={styles.barTrack}>
                                    <View style={[styles.barFill, { height: barHeight, backgroundColor: color }]} />
                                </View>
                                <View style={styles.timeLabelContainer}>
                                    <Text style={styles.timeText}>{h}</Text>
                                    <Text style={styles.ampmText}>{m}</Text>
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
                <Text style={styles.sectionTitle}>تجهيزات الخروج</Text>
                <FontAwesome5 name="tshirt" size={14} color={COLORS.accentGreen} />
            </View>
            <View style={styles.accessoriesGrid}>
                {accessories.map((item, i) => (
                    <View key={i} style={styles.accessoryCard}>
                        <View style={[styles.accessoryIconBox, { backgroundColor: item.color + '15' }]}>
                            <FontAwesome5 name={item.icon} size={18} color={item.color} />
                        </View>
                        <Text style={styles.accessoryText}>{item.label}</Text>
                    </View>
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

    // Metrics
    const humidity = parseFloat(data.metrics?.humidity || 50);
    const aqi = parseFloat(data.metrics?.aqi || 50);
    // Get actual current UV from forecast array if available, or default
    const currentUV = data.hourlyForecast?.[0]?.uv || 0;

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

        
            <SpfTimerWidget uvIndex={currentUV} />


            {/* 3. NEW SKIN METRICS (Horizontal Scroll) */}
            <View style={{ marginTop: 20 }}>
                <Text style={[styles.sectionTitle, {marginRight: 8, marginBottom: 10}]}>مؤشرات الجو</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, flexDirection: 'row-reverse', gap: 10 }}>
                    {/* Pass UV to Sun Cycle */}
                    <SunCycleWidget uvIndex={currentUV} />
                    <HydroGauge humidity={humidity} />
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
                        <Text style={styles.sectionTitle}>تحليل الأثر</Text>
                        <FontAwesome5 name="chart-pie" size={14} color={COLORS.accentGreen} />
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
            {data.routine_adjustments && data.routine_adjustments.length > 0 && (
                <View style={styles.sectionWrapper}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>تعديلات الروتين</Text>
                        <FontAwesome5 name="sliders-h" size={14} color={COLORS.accentGreen} />
                    </View>
                    {data.routine_adjustments.map((item, index) => {
                        const isOwned = !!item.product;
                        return (
                            <View key={index} style={[
                                styles.routineCard,
                                { borderColor: isOwned ? COLORS.success : COLORS.warning }
                            ]}>
                                <View style={styles.routineHeader}>
                                    <View style={styles.stepTag}>
                                        <Text style={styles.stepTagText}>{item.step}</Text>
                                    </View>
                                    <Text style={styles.routineActionText}>{item.action}</Text>
                                </View>

                                <View style={[
                                    styles.matchBox,
                                    { backgroundColor: isOwned ? COLORS.success + '10' : COLORS.warning + '10' }
                                ]}>
                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                        <Text style={[
                                            styles.matchLabel,
                                            { color: isOwned ? COLORS.success : COLORS.warning }
                                        ]}>
                                            {isOwned ? '✅ متوفر في رفك' : '💡 مقترح للإضافة'}
                                        </Text>
                                        <Text style={styles.productName}>
                                            {isOwned ? item.product : item.missing_suggestion}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.matchIconCircle,
                                        { backgroundColor: isOwned ? COLORS.success : COLORS.warning }
                                    ]}>
                                        <FontAwesome5
                                            name={isOwned ? "check" : "shopping-bag"}
                                            size={12}
                                            color="#fff"
                                        />
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            <View style={{ height: 40 }} />
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

    // --- Mini Card (Carousel) ---
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

    // --- SPF Timer (ENHANCED) ---
    spfContainer: {
        backgroundColor: COLORS.cardSurface,
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 10,
    },
    timerRingContainer: {
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerTextOverlay: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerInfoContainer: {
        flex: 1,
        paddingRight: 16,
        justifyContent: 'center',
    },
    timerTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: COLORS.textPrimary,
        textAlign: 'right',
        marginBottom: 4,
    },
    timerCountdown: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 36,
        color: COLORS.accentGreen,
        textAlign: 'right',
        marginBottom: 4,
        lineHeight: 44,
    },
    timerDescription: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: 'right',
        lineHeight: 20,
        marginBottom: 12,
    },
    timerButton: {
        paddingVertical: 10,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerButtonStart: {
        backgroundColor: COLORS.accentGreen,
    },
    timerButtonStop: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
    },
    timerButtonText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: '#fff',
    },
    debugToggleContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 15,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    debugToggleLabel: {
        fontFamily: 'Tajawal-Regular',
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    // ========================================================================
    // --- EXISTING STYLES (Features, Timeline, Etc) ---
    // ========================================================================
    featureCard: {
        width: 120, height: 120, backgroundColor: COLORS.cardSurface, borderRadius: 20, padding: 12,
        borderWidth: 1, borderColor: COLORS.border, justifyContent: 'space-between'
    },
    featureHeader: {
        flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center'
    },
    featureTitle: {
        fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.textSecondary
    },
    featureValue: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textPrimary, marginTop: 5 },
    featureSub: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.textSecondary },

    // Hydro
    hydroContainer: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 8, flex: 1, paddingBottom: 5 },
    hydroBarBg: { width: 6, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
    hydroBarFill: { width: '100%', borderRadius: 3 },

    // Radar
    radarCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 4 },
    radarFill: { position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.3 },

    // --- Hourly Timeline ---
    timelineContainer: {
        backgroundColor: COLORS.cardSurface, borderRadius: 24, paddingVertical: 20,
        borderWidth: 1, borderColor: COLORS.border, marginTop: 10
    },
    timelineScrollContent: { paddingHorizontal: 20, flexDirection: 'row-reverse' },
    timeSlot: { alignItems: 'center', width: 68, marginLeft: 10 },
    timelinePill: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 10, borderWidth: 1, marginBottom: 12, gap: 5, minWidth: 55, justifyContent: 'center'
    },
    timelinePillText: { fontSize: 9, fontFamily: 'Tajawal-Bold' },
    barTrack: {
        height: 60, width: 6, backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden'
    },
    barFill: { width: '100%', borderRadius: 3 },
    timeLabelContainer: { alignItems: 'center', marginTop: 12 },
    timeText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textPrimary },
    ampmText: { fontSize: 10, color: COLORS.textDim, fontFamily: 'Tajawal-Regular', marginTop: -2 },

    // --- Accessories ---
    accessoriesGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, marginTop: 10 },
    accessoryCard: {
        flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.cardSurface,
        borderRadius: 18, padding: 12, borderWidth: 1, borderColor: COLORS.border,
        flexGrow: 1, maxWidth: '48%', gap: 10
    },
    accessoryIconBox: {
        width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center'
    },
    accessoryText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textPrimary, flex: 1, textAlign: 'right' },

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

    // --- Modal ---
    // --- Promo Modal Styles ---
    modalOverlay: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'transparent' // CHANGED: Was rgba(0,0,0,0.8), now transparent so it doesn't pop
    },
    modalBackdrop: { 
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)' // CHANGED: Moved color here to animate opacity
    },
    modalContent: {
        width: width * 0.85, 
        backgroundColor: COLORS.card, 
        borderRadius: 28, 
        paddingHorizontal: 24,
        paddingTop: 45, 
        paddingBottom: 24,
        alignItems: 'center',
        borderWidth: 1, 
        borderColor: 'rgba(90, 156, 132, 0.3)', 
        shadowColor: '#000', 
        shadowOpacity: 0.5, 
        shadowRadius: 30, 
        elevation: 20
    },
    modalIconFloat: { 
        position: 'absolute',
        top: -40,
        alignSelf: 'center',
        shadowColor: COLORS.accentGreen,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10
    },
    modalIconGradient: {
        width: 80, 
        height: 80, 
        borderRadius: 40, 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderWidth: 6, 
        borderColor: COLORS.card 
    },
    modalTitle: { 
        fontFamily: 'Tajawal-ExtraBold', 
        fontSize: 22, 
        color: COLORS.textPrimary, 
        marginBottom: 8,
        textAlign: 'center'
    },
    modalBody: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 14, 
        color: COLORS.textSecondary, 
        textAlign: 'center', 
        marginBottom: 20 
    },
    featureListContainer: {
        width: '100%',
        marginBottom: 25,
        gap: 12,
    },
    featureRow: {
        flexDirection: 'row-reverse', 
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)', 
        padding: 10,
        borderRadius: 12,
        gap: 12,
    },
    featureIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'right', 
    },
    modalActions: { 
        flexDirection: 'row-reverse', 
        width: '100%',
        gap: 12
    },
    btnPrimary: {
        flex: 1, 
        backgroundColor: COLORS.accentGreen, 
        height: 50, 
        borderRadius: 16, 
        alignItems: 'center', 
        justifyContent: 'center',
        shadowColor: COLORS.accentGreen, 
        shadowOpacity: 0.3, 
        shadowOffset: {width: 0, height: 4},
        elevation: 4
    },
    btnPrimaryText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 15, 
        color: '#ffffff',
        marginBottom: 2
    },
    btnSecondary: { 
        flex: 0.4, 
        height: 50,
        borderRadius: 16, 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: 'transparent'
    },
    btnSecondaryText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 14, 
        color: COLORS.textDim,
        marginBottom: 2
    },
    
    nightPrepContainer: {
        height: 160, borderRadius: 28, padding: 20, overflow: 'hidden', position: 'relative',
        marginBottom: 20, borderWidth: 1, borderColor: '#4f46e5'
    },
    moonGlow: {
        position: 'absolute', top: -50, right: -50, width: 150, height: 150,
        borderRadius: 75, backgroundColor: '#818cf8', opacity: 0.2, filter: 'blur(30px)' // Note: filter might need generic View style adjustment in RN
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

    // --- Exposure Slider ---
    sliderContainer: {
        marginBottom: 20, // More space
        paddingHorizontal: 4,
    },
    sliderTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    sliderTrack: {
        flexDirection: 'row-reverse', // RTL: Item 0 is on the Right
        backgroundColor: 'rgba(0,0,0,0.25)', 
        borderRadius: 16,
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        position: 'relative',
        justifyContent: 'space-between',
    },
    sliderPill: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        width: '32%', // Slightly less than 33% for gaps
        backgroundColor: '#A3E4D7', 
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 4,
        zIndex: 1, // Layer 1 (Background)
    },
    sliderOption: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        zIndex: 10, // Layer 10 (Foreground - Clickable)
        height: '100%', // Full height to capture clicks
    },
    sliderText: {
        fontSize: 11,
        paddingBottom: 2
    },

});