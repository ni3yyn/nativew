
import React, { useState, useEffect, useRef, useMemo } from 'react'; // Added useMemo
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
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

// --- THEME CONSTANTS ---
// --- THEME CONSTANTS REMOVED (Using ThemeContext) ---

const getThemeVariants = (language) => ({
    pollution: { colors: ['#4c1d95', '#6d28d9'], icon: 'smog', label: t('weather_pollution_label', language), shadow: '#6d28d9' },
    dry: { colors: ['#1e3a8a', '#3b82f6'], icon: 'wind', label: t('weather_dry_label', language), shadow: '#3b82f6' },
    uv: { colors: ['#7f1d1d', '#ea580c'], icon: 'sun', label: t('weather_uv_label', language), shadow: '#ea580c' },
    humid: { colors: ['#7c2d12', '#d97706'], icon: 'tint', label: t('weather_humid_label', language), shadow: '#d97706' },
    perfect: { colors: ['#064e3b', '#10b981'], icon: 'smile-beam', label: t('weather_perfect_label', language), shadow: '#10b981' },
    unknown: { colors: ['#1f2937', '#4b5563'], icon: 'cloud', label: t('weather_unknown_label', language), shadow: '#4b5563' }
});

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
        shouldShowBanner: true, // Replaces shouldShowBanner
        shouldShowList: true,   // Replaces shouldShowBanner
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// ============================================================================
//                       1. SKELETON LOADER
// ============================================================================
export const WeatherLoadingCard = () => {
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
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
                <View style={{ flex: 1, ...(isRTL ? { paddingRight: 16 } : { paddingLeft: 16 }), gap: 12 }}>
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
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const THEME_VARIANTS = getThemeVariants(language);
    const isPermissionError = insight.customData?.isPermissionError;
    const isServiceError = insight.customData?.isServiceError;
    const themeKey = insight.customData?.theme || 'unknown';
    const baseTheme = isPermissionError ? THEME_VARIANTS.unknown : (THEME_VARIANTS[themeKey] || THEME_VARIANTS.unknown);

    const displayTheme = {
        ...baseTheme,
        colors: isPermissionError ? ['#374151', '#4b5563'] : isServiceError ? ['#7f1d1d', '#991b1b'] : baseTheme.colors,
        icon: isPermissionError ? 'map-marker-alt' : isServiceError ? 'wifi' : baseTheme.icon,
        title: isPermissionError ? t('weather_location_disabled', language) : isServiceError ? t('weather_connection_error', language) : baseTheme.label
    };

    const actionIcon = isPermissionError ? "map-pin" : isServiceError ? "refresh-cw" : (isRTL ? "arrow-left" : "arrow-right");

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
                            <Text style={styles.widgetSubtitle} numberOfLines={1}>{isPermissionError ? t('weather_enable_location_tap', language) : insight.short_summary}</Text>
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
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const meta = insight.customData?.meta || {};
    const { temp, uvIndex } = meta;

    const getTheme = () => {
        const id = insight.id.toLowerCase();
        if (insight.customData?.isPermissionError) return { colors: ['#4b5563', '#1f2937'], icon: 'map-marker-alt', label: t('weather_mini_location', language) };
        if (insight.customData?.isServiceError) return { colors: ['#d97706', '#92400e'], icon: 'wifi', label: t('weather_mini_unavailable', language) };
        if (insight.severity === 'good') return { colors: ['#10b981', '#059669'], icon: 'smile-beam', label: t('weather_mini_perfect', language) };
        if (id.includes('uv')) return { colors: ['#ef4444', '#b91c1c'], icon: 'sun', label: t('weather_uv_label', language) };
        if (id.includes('dry')) return { colors: ['#3b82f6', '#1d4ed8'], icon: 'tint-slash', label: t('weather_mini_dry', language) };
        return { colors: [COLORS.accentGreen, '#4a8a73'], icon: 'cloud-sun', label: t('weather_unknown_label', language) };
    };

    const theme = getTheme();

    return (
        <StaggeredItem index={0} style={{ width: 'auto', ...(isRTL ? { paddingLeft: 12 } : { paddingRight: 12 }) }} animated={false}>
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
                                {uvIndex !== undefined && <><View style={styles.glassSeparator} /><Text style={styles.glassPillText}>{t('weather_uv_short', language)} {Math.round(uvIndex)}</Text></>}
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
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
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
            Alert.alert(t('weather_spf_timer_alert_title', language), t('weather_spf_timer_alert_msg', language));
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
                title: t('weather_spf_timer_notification_title', language),
                body: t('weather_spf_timer_notification_body', language),
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
        const mm = m.toString().padStart(2, '0');
        const ss = s.toString().padStart(2, '0');
        return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
    };

    // --- RENDER SAFE ZONE ---
    if (isSafe && !isActive) {
        return (
            <View style={[styles.spfContainer, styles.spfSafeBg]}>
                <View style={[styles.spfIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <FontAwesome5 name="check" size={14} color="#10b981" />
                </View>
                <View style={{ flex: 1, ...(isRTL ? { paddingRight: 10 } : { paddingLeft: 10 }) }}>
                    <Text style={[styles.spfTitle, { color: '#d1fae5', textAlign: isRTL ? 'right' : 'left' }]}>{t('weather_spf_safe_title', language)}</Text>
                    <Text style={[styles.spfDesc, { color: '#6ee7b7', textAlign: isRTL ? 'right' : 'left' }]}>{t('weather_spf_safe_desc', language)}</Text>
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
                    <Circle stroke={COLORS.textPrimary + '08'} fill="none" cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
                    {/* Progress */}
                    <AnimatedCircle
                        stroke="url(#grad)"
                        fill="none"
                        cx={size / 2} cy={size / 2}
                        r={radius}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    />
                </Svg>

                <View style={styles.ringCenter}>
                    {isActive ? (
                        <FontAwesome5 name="clock" size={18} color={COLORS.accentGreen} />
                    ) : (
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.ringVal}>{Math.round(recommendedDuration / 60)}</Text>
                            <Text style={styles.ringUnit}>{t('weather_spf_unit_minute', language)}</Text>
                        </View>
                    )}
                </View>
            </Animated.View>

            {/* 2. Controls (Right) */}
            <View style={styles.spfContent}>
                {isActive ? (
                    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 2 }}>
                        <Text style={styles.statusLabel}>{t('weather_spf_timer_active', language)}</Text>
                        <Text style={styles.timerBigDisplay}>{formatTime(remainingSeconds)}</Text>
                        <PressableScale onPress={handleStop} style={styles.linkButton}>
                            <Text style={styles.linkButtonText}>{t('weather_spf_timer_cancel', language)}</Text>
                        </PressableScale>
                    </View>
                ) : (
                    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 6 }}>
                        <View>
                            <Text style={styles.spfTitle}>{t('weather_spf_timer_title', language)}</Text>
                            <Text style={styles.spfDesc}>
                                {t('weather_spf_timer_current_uv', language)} <Text style={{ color: COLORS.warning, fontFamily: 'Tajawal-Bold' }}>{uvIndex}</Text>
                            </Text>
                        </View>

                        <PressableScale onPress={handleStart} style={styles.startPill}>
                            <LinearGradient
                                colors={[COLORS.accentGreen, '#047857']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.startPillGradient}
                            >
                                <Text style={styles.startPillText}>{t('weather_spf_timer_start', language)}</Text>
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
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const { width, height, cx, cy, r, strokeWidth } = ARC_CONFIG;

    // 1. Status Logic
    let label = t('weather_uv_status_safe', language);
    let color = COLORS.success;
    let percentage = 0;

    if (!isDay) {
        label = t('weather_uv_status_calm', language);
        color = "#94a3b8"; // Moon/Slate color
        percentage = 0;
    } else {
        const safeUV = Math.min(uvIndex, 11);
        percentage = safeUV / 11;
        if (uvIndex >= 8) { label = t('weather_uv_status_danger', language); color = COLORS.danger; }
        else if (uvIndex >= 6) { label = t('weather_uv_status_high_risk', language); color = COLORS.warning; }
        else if (uvIndex >= 3) { label = t('weather_uv_status_moderate', language); color = COLORS.gold; }
    }

    // 2. Sun Position (Only needed for Day)
    const currentAngle = Math.PI * (1 - percentage);
    const sunX = cx + r * Math.cos(currentAngle);
    const sunY = cy - r * Math.sin(currentAngle);

    return (
        <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
                <FontAwesome5 name={isDay ? "sun" : "moon"} size={12} color={color} />
                <Text style={styles.featureTitle}>{t('weather_uv_index_label', language)}</Text>
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
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const { width, height, cx, cy, r, strokeWidth } = ARC_CONFIG;

    const safeHum = humidity !== undefined ? humidity : 50;
    const safeDP = dewPoint !== undefined ? dewPoint : (safeHum > 50 ? 18 : 5);

    // Status Colors
    let color = COLORS.success;
    let label = t('weather_humidity_status_comfortable', language);
    if (safeDP < 10) { color = '#60a5fa'; label = t('weather_humidity_status_dry', language); }
    else if (safeDP <= 16) { color = COLORS.success; label = t('weather_humidity_status_perfect', language); }
    else if (safeDP <= 20) { color = COLORS.warning; label = t('weather_humidity_status_humid', language); }
    else { color = COLORS.danger; label = t('weather_humidity_status_suffocating', language); }

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
                <Text style={styles.featureTitle}>{t('weather_humidity_label', language)}</Text>
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
                    <Text style={styles.arcBigValue}>{safeHum}<Text style={{ fontSize: 12 }}>%</Text></Text>
                    <Text style={[styles.arcLabel, { color: color }]}>{label}</Text>
                </View>
            </View>
        </View>
    );
};


// --- 4.3 PORE CLARITY ---
const PoreClarityWidget = ({ aqi }) => {
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const { width, height, cx, cy, r, strokeWidth } = ARC_CONFIG;
    const safeAqi = aqi !== undefined ? aqi : 50;

    let color = COLORS.success;
    let label = t('weather_aqi_status_pure', language);

    // Scale AQI (0-300 usually, but we cap at 150 for the meter visual)
    const percentage = Math.min(safeAqi / 150, 1);

    if (safeAqi > 100) { color = COLORS.danger; label = t('weather_aqi_status_polluted', language); }
    else if (safeAqi > 50) { color = COLORS.warning; label = t('weather_aqi_status_moderate', language); }

    const endAngle = Math.PI * (1 - percentage);
    const x = cx + r * Math.cos(endAngle);
    const y = cy - r * Math.sin(endAngle);
    const fillPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`;

    return (
        <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
                <FontAwesome5 name="lungs" size={12} color={color} />
                <Text style={styles.featureTitle}>{t('weather_aqi_label', language)}</Text>
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
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    if (!forecast || forecast.length === 0) return null;

    const currentHourIndex = new Date().getHours();

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        let hours = date.getHours();
        const isCurrent = hours === currentHourIndex;
        const ampm = hours >= 12 ? t('weather_time_pm', language) : t('weather_time_am', language);

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
                <Text style={styles.sectionTitle}>{t('weather_skin_index_12h', language)}</Text>
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
                        const label = hour.label || t('weather_uv_status_safe', language);

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
                                            <Text style={styles.nowText}>{t('weather_time_now', language)}</Text>
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
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    if (!accessories || accessories.length === 0) return null;

    return (
        <View style={styles.sectionWrapper}>
            <View style={styles.sectionHeaderRow}>
                <FontAwesome5 name="tshirt" size={14} color={COLORS.accentGreen} />
                <Text style={styles.sectionTitle}>{t('weather_gear_title', language)}</Text>
            </View>
            <View style={styles.accessoriesGrid}>
                {accessories.map((item, i) => (
                    <PressableScale key={i} style={styles.accessoryCardWrapper}>
                        <View style={styles.accessoryCard}>
                            <View style={[styles.accessoryIconBox, { backgroundColor: item.color + '15' }]}>
                                <FontAwesome5 name={item.icon} size={18} color={item.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.accessoryText}>{item.label}</Text>
                                {/* Added a subtle sub-label for context if available, or just visual balance */}
                                <Text style={styles.accessorySubText}>{t('weather_recommended', language)}</Text>
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
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const data = insight.customData;

    if (!data) return null;

    const THEME_VARIANTS = getThemeVariants(language);
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
                <LinearGradient colors={theme.colors} style={styles.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
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
                <Text style={[styles.sectionTitle, { marginRight: 8, marginBottom: 10 }]}>{t('weather_indicators_title', language)}</Text>
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
                        <Text style={styles.sectionTitle}>{t('weather_impact_analysis', language)}</Text>
                    </View>
                    <View style={styles.impactCard}>
                        <View style={styles.impactSide}>
                            <View style={styles.impactHeader}>
                                <View style={[styles.impactIconBox, { backgroundColor: COLORS.accentGreen + '15' }]}>
                                    <FontAwesome5 name="user-alt" size={12} color={COLORS.accentGreen} />
                                </View>
                                <Text style={styles.impactTitle}>{t('weather_impact_skin', language)}</Text>
                            </View>
                            <Text style={styles.impactBody}>{data.impact.skin}</Text>
                        </View>
                        <View style={styles.impactDividerVertical} />
                        <View style={styles.impactSide}>
                            <View style={styles.impactHeader}>
                                <View style={[styles.impactIconBox, { backgroundColor: COLORS.gold + '15' }]}>
                                    <FontAwesome5 name="cut" size={12} color={COLORS.gold} />
                                </View>
                                <Text style={styles.impactTitle}>{t('weather_impact_hair', language)}</Text>
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
                        <Text style={styles.sectionTitle}>{t('weather_routine_recommendations', language)}</Text>
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
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
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
        subText = item.missing_suggestion || t('weather_advice_behavioral', language);
    } else {
        statusColor = COLORS.warning;
        icon = "shopping-bag";
        subText = `${t('weather_suggestion_label', language)}: ${item.missing_suggestion}`; // Generic ingredient
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
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
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
                    title: t('weather_permission_required_title', language),
                    message: t('weather_permission_required_msg', language),
                    type: 'warning',
                    buttons: [
                        { text: t('weather_permission_cancel', language), style: "secondary" },
                        {
                            text: t('weather_permission_settings', language),
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
                        <LinearGradient colors={[COLORS.accentGreen, COLORS.accentGreen + 'CC']} style={styles.modalIconGradient}>
                            <FontAwesome5 name="cloud-sun" size={32} color="#fff" />
                        </LinearGradient>
                    </View>

                    <Text style={styles.modalTitle}>{t('weather_discovery_title', language)}</Text>
                    <Text style={styles.modalBody}>
                        {t('weather_discovery_desc', language)}
                    </Text>

                    <View style={styles.featureListContainer}>
                        <View style={styles.featureRow}>
                            <View style={[styles.featureIconBox, { backgroundColor: COLORS.gold + '26' }]}>
                                <FontAwesome5 name="clock" size={14} color={COLORS.gold} />
                            </View>
                            <Text style={styles.featureText}>{t('weather_feature_spf_timer', language)}</Text>
                        </View>
                        <View style={styles.featureRow}>
                            <View style={[styles.featureIconBox, { backgroundColor: COLORS.danger + '26' }]}>
                                <FontAwesome5 name="sun" size={14} color={COLORS.danger} />
                            </View>
                            <Text style={styles.featureText}>{t('weather_feature_uv_alerts', language)}</Text>
                        </View>
                        <View style={styles.featureRow}>
                            <View style={[styles.featureIconBox, { backgroundColor: (COLORS.info || COLORS.accentGreen) + '26' }]}>
                                <FontAwesome5 name="wind" size={14} color={COLORS.blue} />
                            </View>
                            <Text style={styles.featureText}>{t('weather_feature_aqi_analysis', language)}</Text>
                        </View>
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.btnSecondary}
                            activeOpacity={0.7}
                            delayPressIn={0} // <--- FIX: Removes tap delay
                        >
                            <Text style={styles.btnSecondaryText}>{t('weather_btn_later', language)}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleGrantPermission}
                            style={styles.btnPrimary}
                            activeOpacity={0.8}
                            delayPressIn={0} // <--- FIX: Removes tap delay
                        >
                            <Text style={styles.btnPrimaryText}>{t('weather_btn_activate', language)}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};


export const NightPrepCard = ({ data, onPress }) => {
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    if (!data) return null;

    return (
        <StaggeredItem index={1} animated={true}>
            <PressableScale onPress={onPress}>
                <View style={styles.nightPrepContainer}>
                    <LinearGradient
                        colors={['#1e1b4b', '#312e81']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Moon Glow Effect */}
                    <View style={styles.moonGlow} />

                    <View style={styles.nightPrepContent}>
                        <View style={styles.nightHeader}>
                            <View style={[styles.iconBox, { backgroundColor: data.color + '30' }]}>
                                <FontAwesome5 name={data.icon} size={16} color={data.color} />
                            </View>
                            <Text style={styles.nightTag}>{t('weather_night_prep_tag', language)}</Text>
                        </View>

                        <Text style={styles.nightTitle}>{data.title}</Text>
                        <Text style={styles.nightBody}>
                            {data.reason} <Text style={{ fontFamily: 'Tajawal-Bold', color: '#fff' }}>{data.action}</Text>
                        </Text>

                        <View style={styles.nightActionRow}>
                            <Text style={styles.nightBtnText}>{t('weather_night_prep_add', language)}</Text>
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
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
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
        { label: t('weather_day_nature_indoors', language), icon: 'home' },   // Index 0
        { label: t('weather_day_nature_limited', language), icon: 'walking' }, // Index 1
        { label: t('weather_day_nature_outdoors', language), icon: 'sun' },    // Index 2
    ];

    const handlePress = (index) => {
        Haptics.selectionAsync();
        onChange(index); // Notify parent immediately
    };

    return (
        <View style={styles.sliderContainer}>
            <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 5 }}>
                <Text style={styles.sliderTitle}>{t('weather_day_nature_title', language)}</Text>
                <View style={{ backgroundColor: COLORS.accentGreen + '1A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ color: COLORS.accentGreen, fontSize: 10, fontFamily: 'Tajawal-Regular' }}>
                        {value === 0 ? t('weather_day_nature_low', language) : value === 2 ? t('weather_day_nature_high', language) : t('weather_day_nature_stable', language)}
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
                    ...(isRTL ? {
                        right: widthAnim.interpolate({
                            inputRange: [0, 1, 2],
                            outputRange: ['1%', '34%', '67%']
                        })
                    } : {
                        left: widthAnim.interpolate({
                            inputRange: [0, 1, 2],
                            outputRange: ['1%', '34%', '67%']
                        })
                    })
                }]} />

                {options.map((opt, i) => {
                    const isActive = value === i;
                    return (
                        <Pressable key={i} onPress={() => handlePress(i)} style={styles.sliderOption}>
                            <FontAwesome5
                                name={opt.icon}
                                size={14}
                                color={isActive ? COLORS.textOnAccent : COLORS.textDim}
                            />
                            <Text style={[
                                styles.sliderText,
                                {
                                    color: isActive ? COLORS.textOnAccent : COLORS.textDim,
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
const createStyles = (COLORS, isRTL) => StyleSheet.create({
    // --- Skeleton ---
    loadingCard: {
        flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 24, padding: 16, marginBottom: 20,
        borderWidth: 1, borderColor: COLORS.border,
    },
    loadingIcon: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.accentGreen + '1A', alignItems: 'center', justifyContent: 'center', ...(isRTL ? { marginLeft: 16 } : { marginRight: 16 }),
    },
    skeletonLine: { backgroundColor: COLORS.accentGreen + '33', borderRadius: 4 },

    // --- Compact Widget (Hero) ---
    widgetContainer: {
        marginBottom: 24, borderRadius: 32,
        shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 12,
    },
    widgetGradient: {
        flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', padding: 22, borderRadius: 32, overflow: 'hidden', position: 'relative',
    },
    widgetIconCircle: {
        width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', ...(isRTL ? { marginLeft: 16 } : { marginRight: 16 }),
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    },
    widgetContent: { flex: 1, justifyContent: 'center', ...(isRTL ? { paddingRight: 4 } : { paddingLeft: 4 }) },
    widgetTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 22, color: '#fff', textAlign: isRTL ? 'right' : 'left', marginBottom: 2, textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 5 },
    widgetSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: 'rgba(255,255,255,0.95)', textAlign: isRTL ? 'right' : 'left' },
    widgetAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18 },
    widgetBgIcon: { position: 'absolute', left: -25, bottom: -25, opacity: 0.08, transform: [{ rotate: '15deg' }] },

    // --- Mini Card ---
    miniCardContainer: {
        width: 150, height: 160, borderRadius: 24, padding: 16, justifyContent: 'space-between',
        overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
    },
    miniCardHeader: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
    miniIconCircle: {
        width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', opacity: 0.9, shadowColor: '#fff', shadowOpacity: 0.5, shadowRadius: 4 },
    miniCardTitle: {
        fontFamily: 'Tajawal-Bold', fontSize: 15, color: '#fff', textAlign: isRTL ? 'right' : 'left', lineHeight: 22,
        textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3,
    },
    miniCardFooter: { flexDirection: isRTL ? 'row-reverse' : 'row' },
    glassPill: {
        flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', alignSelf: isRTL ? 'flex-start' : 'flex-end',
    },
    glassPillText: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: '#fff' },
    glassSeparator: { width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 6 },

    // --- SPF Timer ---
    spfContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 26,
        padding: 18,
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        marginBottom: 20,
    },

    // Safe State
    spfSafeBg: {
        backgroundColor: '#064e3b', // Deep green bg
    },
    spfIconCircle: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center', ...(isRTL ? { marginLeft: 12 } : { marginRight: 12 })
    },

    // Layout
    spfContent: {
        flex: 1,
        ...(isRTL ? { paddingRight: 16 } : { paddingLeft: 16 }), // Space between text and ring
        justifyContent: 'center',
    },

    // Typography
    spfTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 16,
        color: COLORS.textPrimary,
        textAlign: isRTL ? 'right' : 'left',
        marginBottom: 2
    },
    spfDesc: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: isRTL ? 'right' : 'left'
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
        backgroundColor: COLORS.card,
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
    hydroContainer: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, flex: 1, ...(isRTL ? { paddingBottom: 5 } : { paddingBottom: 5 }) }, // paddingBottom same for both
    hydroBarBg: { width: 6, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
    hydroBarFill: { width: '100%', borderRadius: 3 },

    // Radar
    radarCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 4 },
    radarFill: { position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.3 },

    // --- Timeline ---
    timelineContainer: {
        backgroundColor: COLORS.card,
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
        flexDirection: isRTL ? 'row-reverse' : 'row',
        paddingBottom: 5 // Extra padding for shadows
    },
    timeSlot: {
        alignItems: 'center',
        width: 60,
        ...(isRTL ? { marginLeft: 8 } : { marginRight: 8 }),
        justifyContent: 'flex-end',
        borderRadius: 12,
        paddingVertical: 4
    },
    // Highlighting the current hour
    timeSlotActive: {
        backgroundColor: COLORS.textPrimary + '08',
        borderWidth: 1,
        borderColor: COLORS.accentGreen + '33',
    },
    timelinePill: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
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
        position: 'absolute', top: 22, flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    locationText: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: '#fff' },
    headerCenter: { alignItems: 'center', marginVertical: 24, textAlign: 'center' }, // Central alignment stays center
    headerIconRing: {
        width: 65, height: 65, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 15, marginTop: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10
    },
    headerTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 26, color: '#fff', textAlign: 'center', marginTop: 8 },
    headerSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 15, color: 'rgba(255,255,255,0.9)', textAlign: 'center', maxWidth: '85%', lineHeight: 24, marginTop: 2 },
    metricPill: {
        flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
        gap: 8, alignSelf: 'center'
    },
    metricLabel: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: 'rgba(255,255,255,0.9)' },
    metricValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, color: '#fff' },
    metricDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.4)' },
    metricStatus: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: '#fff' },

    // --- Impact ---
    impactCard: {
        flexDirection: 'row-reverse', backgroundColor: COLORS.card, borderRadius: 24,
        padding: 24, borderWidth: 1, borderColor: COLORS.border,
    },
    impactSide: { flex: 1, gap: 12 },
    impactHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    impactIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    impactTitle: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: COLORS.textPrimary, },
    impactBody: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 22, alignSelf: 'center' },
    impactDividerVertical: { width: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 20 },

    // --- Routine ---
    routineCard: {
        backgroundColor: COLORS.cardSurface, borderRadius: 22, padding: 18, marginBottom: 16,
        borderWidth: 1, borderRightWidth: 4,
    },
    routineHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 14, gap: 12 },
    stepTag: { backgroundColor: COLORS.accentGreen + '1A', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
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
    nightHeader: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 },
    iconBox: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    nightTag: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: '#c7d2fe' },
    nightTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: '#fff', textAlign: isRTL ? 'right' : 'left', marginTop: 4 },
    nightBody: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: '#e0e7ff', textAlign: isRTL ? 'right' : 'left', maxWidth: '85%', lineHeight: 20 },
    nightActionRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, opacity: 0.8 },
    nightBtnText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: '#c7d2fe' },
    bgMoon: { position: 'absolute', ...(isRTL ? { left: -20 } : { right: -20 }), bottom: -20, opacity: 0.1, transform: [{ rotate: '15deg' }] },

    // --- Slider ---
    sliderContainer: { marginBottom: 20, paddingHorizontal: 4 },
    sliderTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary },
    sliderTrack: {
        flexDirection: isRTL ? 'row-reverse' : 'row', backgroundColor: COLORS.background, borderRadius: 16, height: 48,
        borderWidth: 1, borderColor: COLORS.border, position: 'relative', justifyContent: 'space-between',
    },
    sliderPill: {
        position: 'absolute', top: 4, bottom: 4, width: '32%', backgroundColor: COLORS.accentGreen, borderRadius: 12,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 4, zIndex: 1,
    },
    sliderOption: { flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 10, height: '100%' },
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
    featureRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: COLORS.background, padding: 10, borderRadius: 12, gap: 12 },
    featureIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    featureText: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: COLORS.textPrimary, flex: 1, textAlign: isRTL ? 'right' : 'left' },
    accessoriesGrid: { flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 12, marginTop: 15 },
    modalActions: { flexDirection: isRTL ? 'row-reverse' : 'row', width: '100%', gap: 12 },
    btnPrimary: { flex: 1, backgroundColor: COLORS.accentGreen, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.accentGreen, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    btnPrimaryText: { fontFamily: 'Tajawal-Bold', fontSize: 15, color: '#ffffff', marginBottom: 2 },
    btnSecondary: { flex: 0.4, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
    btnSecondaryText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textDim, marginBottom: 2 },

    // --- Clean Routine Styles (New) ---
    cleanListContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        // No heavy border, just subtle containment
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cleanRowContainer: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    cleanIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20, // Circular
        alignItems: 'center',
        justifyContent: 'center',
        ...(isRTL ? { marginLeft: 14 } : { marginRight: 14 }), // Spacing from text
    },
    cleanContent: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    cleanHeader: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cleanAction: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: COLORS.textPrimary,
        textAlign: isRTL ? 'right' : 'left',
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
        textAlign: isRTL ? 'right' : 'left',
        opacity: 0.9,
    },
    cleanDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        width: '100%',
    },
});