// src/components/profile/WeatherComponents.js

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Animated,
    TouchableOpacity,
    ScrollView,
    Modal,
    Pressable,
    Dimensions,
    Platform,
    Alert,
    Easing,
    NativeModules,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { PressableScale, StaggeredItem } from '../common/Animations';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { AlertService } from '../../services/alertService';
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

const getThemeVariants = (language) => ({
    pollution: { colors: ['#4c1d95', '#6d28d9'], icon: 'smog', label: t('weather_pollution_label', language) },
    dry: { colors: ['#1e3a8a', '#3b82f6'], icon: 'wind', label: t('weather_dry_label', language) },
    uv: { colors: ['#7f1d1d', '#ea580c'], icon: 'sun', label: t('weather_uv_label', language) },
    humid: { colors: ['#7c2d12', '#d97706'], icon: 'tint', label: t('weather_humid_label', language) },
    perfect: { colors: ['#064e3b', '#10b981'], icon: 'smile-beam', label: t('weather_perfect_label', language) },
    unknown: { colors: ['#1f2937', '#4b5563'], icon: 'cloud', label: t('weather_unknown_label', language) }
});

const ARC_CONFIG = {
    width: 110,
    height: 65,
    cx: 55,
    cy: 55,
    r: 40,
    strokeWidth: 6
};

const { width } = Dimensions.get('window');

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowAlert: true,
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
                <View style={styles.widgetContainer}>
                    <LinearGradient colors={displayTheme.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.widgetGradient}>
                        <View style={styles.widgetIconCircle}><FontAwesome5 name={displayTheme.icon} size={24} color="#fff" /></View>
                        <View style={styles.widgetContent}>
                            <Text style={styles.widgetTitle}>{displayTheme.title}</Text>
                            <Text style={styles.widgetSubtitle} numberOfLines={1}>
                                {isPermissionError ? t('weather_enable_location_tap', language) : insight.short_summary}
                            </Text>
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
//               3. SKIN-CENTRIC METRICS (UV & Hydration)
// ============================================================================
const SunCycleWidget = ({ uvIndex = 0, isDay = true }) => {
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const { width, height, cx, cy, r, strokeWidth } = ARC_CONFIG;

    let label = t('weather_uv_status_safe', language);
    let color = COLORS.success;
    let percentage = 0;

    if (!isDay) {
        label = t('weather_uv_status_calm', language);
        color = "#94a3b8";
        percentage = 0;
    } else {
        const safeUV = Math.min(uvIndex, 11);
        percentage = safeUV / 11;
        if (uvIndex >= 8) { label = t('weather_uv_status_danger', language); color = COLORS.danger; }
        else if (uvIndex >= 6) { label = t('weather_uv_status_high_risk', language); color = COLORS.warning; }
        else if (uvIndex >= 3) { label = t('weather_uv_status_moderate', language); color = COLORS.gold; }
    }

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

                    <Path
                        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        fill="none"
                    />

                    {isDay && (
                        <>
                            <Path
                                d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${sunX} ${sunY}`}
                                stroke="url(#sunGrad)"
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                fill="none"
                            />
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

const HydroGauge = ({ humidity, dewPoint }) => {
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const { width, height, cx, cy, r, strokeWidth } = ARC_CONFIG;

    const safeHum = humidity !== undefined ? humidity : 50;
    const safeDP = dewPoint !== undefined ? dewPoint : (safeHum > 50 ? 18 : 5);

    let color = COLORS.success;
    let label = t('weather_humidity_status_comfortable', language);
    if (safeDP < 10) { color = '#60a5fa'; label = t('weather_humidity_status_dry', language); }
    else if (safeDP <= 16) { color = COLORS.success; label = t('weather_humidity_status_perfect', language); }
    else if (safeDP <= 20) { color = COLORS.warning; label = t('weather_humidity_status_humid', language); }
    else { color = COLORS.danger; label = t('weather_humidity_status_suffocating', language); }

    const percentage = Math.min(Math.max(safeHum / 100, 0), 1);
    const endAngle = Math.PI * (1 - percentage);
    const x = cx + r * Math.cos(endAngle);
    const y = cy - r * Math.sin(endAngle);
    const fillPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}`;

    return (
        <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
                <FontAwesome5 name={safeDP > 16 ? "tint" : "tint-slash"} size={12} color={color} />
                <Text style={styles.featureTitle}>{t('weather_humidity_label', language)}</Text>
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
                    <Text style={styles.arcBigValue}>{safeHum}<Text style={{ fontSize: 12 }}>%</Text></Text>
                    <Text style={[styles.arcLabel, { color: color }]}>{label}</Text>
                </View>
            </View>
        </View>
    );
};

const PoreClarityWidget = ({ aqi }) => {
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const { width, height, cx, cy, r, strokeWidth } = ARC_CONFIG;
    const safeAqi = aqi !== undefined ? aqi : 50;

    let color = COLORS.success;
    let label = t('weather_aqi_status_pure', language);

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
//                       4. HOURLY TIMELINE
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
                    contentOffset={{ x: 0, y: 0 }}
                >
                    {forecast.map((hour, index) => {
                        const { h, m, isNight, isCurrent } = formatTime(hour.time);
                        const color = hour.color || COLORS.success;
                        const icon = hour.icon || (isNight ? 'moon' : 'sun');
                        const label = hour.label || t('weather_uv_status_safe', language);
                        const safeUv = Number(hour.uv) || 0;
                        const barHeight = Math.min(Math.max((safeUv * 6) + 20, 20), 65);
                        const isRisky = safeUv >= 5;

                        return (
                            <View key={index} style={[styles.timeSlot, isCurrent && styles.timeSlotActive]}>
                                <View style={[
                                    styles.timelinePill,
                                    { backgroundColor: isCurrent ? color : color + '10', borderColor: color + '30' }
                                ]}>
                                    <FontAwesome5 name={icon} size={isCurrent ? 10 : 9} color={isCurrent ? '#fff' : color} />
                                    <Text style={[styles.timelinePillText, { color: isCurrent ? '#fff' : color }]}>
                                        {label}
                                    </Text>
                                </View>

                                <View style={styles.barTrack}>
                                    <LinearGradient
                                        colors={[color, color + '80']}
                                        style={[styles.barFill, { height: barHeight }]}
                                    />
                                    {isRisky && (
                                        <View style={[styles.barWarningIcon, { bottom: barHeight + 2 }]}>
                                            <FontAwesome5 name="exclamation" size={8} color={COLORS.danger} />
                                        </View>
                                    )}
                                </View>

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
//                       5. ACCESSORIES GRID
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
                                <Text style={styles.accessorySubText}>{t('weather_recommended', language)}</Text>
                            </View>
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
//                       6. MAIN SHEET (Detailed View)
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

    const raw = data.rawWeather || {};
    const humidity = raw.humidity !== undefined ? raw.humidity : parseFloat(data.metrics?.humidity || 50);
    const dewPoint = raw.dewPoint;
    const aqi = raw.aqi !== undefined ? raw.aqi : 50;
    const uvIndex = raw.uvIndex !== undefined ? raw.uvIndex : 0;
    const isDay = raw.isDay !== undefined ? raw.isDay : true;

    // 🌟 Pure 1-Step: Tapping immediately triggers Android's native "Add to Home screen" dialog
    const handleAddWidget = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (Platform.OS === 'android' && NativeModules.SpfWidgetModule?.pinWidget) {
            try {
                NativeModules.SpfWidgetModule.pinWidget();
            } catch (e) {
                console.warn('Pin widget error:', e);
            }
        }
    };

    return (
        <View style={styles.sheetContainer}>

            {/* 1. HEADER */}
            <View style={styles.headerContainer}>
                <LinearGradient colors={theme.colors} style={styles.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {data.location && (
                        <View style={styles.locationTag}>
                            <FontAwesome5 name="map-marker-alt" size={10} color="#fff" />
                            <Text style={styles.locationText}>{data.location}</Text>
                        </View>
                    )}
                    <View style={styles.headerCenter}>
                        <View style={styles.headerIconRing}>
                            <FontAwesome5 name={theme.icon} size={36} color="#fff" />
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

            {/* 2. 🌟 NOTE OF SUNSCREEN DEGRADING + ADD TO HOMESCREEN BUTTON (NO SVG / NO TIMER) 🌟 */}
            <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleAddWidget}
                style={styles.cleanWidgetAddCard}
            >
                <View style={styles.cleanWidgetHeaderRow}>
                    <View style={styles.cleanWidgetActionBadge}>
                        <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={14} color={COLORS.accentGreen} />
                        <Text style={styles.cleanWidgetActionLabel}>
                            {language === 'ar' ? 'إضافة للشاشة' : 'Add Widget'}
                        </Text>
                    </View>
                    <Text style={styles.cleanWidgetTitle}>
                        {language === 'ar' ? 'مؤقت وثيق للشاشة الرئيسية' : 'Wathiq Homescreen Timer'}
                    </Text>
                </View>

                {/* The note on sunscreen degradation */}
                <Text style={styles.cleanWidgetDesc}>
                    {language === 'ar'
                        ? 'تفقد فلاتر واقي الشمس فاعليتها تدريجياً مع استمرار التعرض للأشعة والحرارة. «مؤقت وثيق» يحسب توقيت التجديد الذكي تلقائياً ويعرضه مباشرة على شاشة هاتفك.'
                        : 'Sunscreen filters degrade over time with UV and heat exposure. Wathiq Timer automatically calculates smart reapplication timing right on your homescreen.'}
                </Text>
            </TouchableOpacity>

            {/* 3. METRICS SCROLL (Indicators) */}
            <View style={{ marginTop: 8 }}>
                <Text style={[styles.sectionTitle, { marginRight: 4, marginBottom: 10 }]}>{t('weather_indicators_title', language)}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 2, flexDirection: 'row-reverse', gap: 10 }}>
                    <SunCycleWidget uvIndex={uvIndex} isDay={isDay} />
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

                    <View style={styles.cleanListContainer}>
                        {data.routine_adjustments.map((item, index) => (
                            <React.Fragment key={index}>
                                <CleanRoutineItem item={item} />
                                {index < data.routine_adjustments.length - 1 && (
                                    <View style={styles.cleanDivider} />
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                </View>
            ) : null}

            <View style={{ height: 25 }} />
        </View>
    );
};

const CleanRoutineItem = ({ item }) => {
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    const isOwned = !!item.product;
    const isAdviceOnly = !item.product && !item.missing_suggestion;

    let statusColor = COLORS.textSecondary;
    let icon = "info-circle";
    let subText = "";

    if (isOwned) {
        statusColor = COLORS.success;
        icon = "check-circle";
        subText = `${item.product}`;
    } else if (isAdviceOnly) {
        statusColor = COLORS.blue;
        icon = "lightbulb";
        subText = item.missing_suggestion || t('weather_advice_behavioral', language);
    } else {
        statusColor = COLORS.warning;
        icon = "shopping-bag";
        subText = `${t('weather_suggestion_label', language)}: ${item.missing_suggestion}`;
    }

    return (
        <View style={styles.cleanRowContainer}>
            <View style={[styles.cleanIconBox, { backgroundColor: statusColor + '15' }]}>
                <FontAwesome5 name={icon} size={16} color={statusColor} />
            </View>

            <View style={styles.cleanContent}>
                <View style={styles.cleanHeader}>
                    <Text style={styles.cleanAction}>{item.action}</Text>
                    <Text style={styles.cleanStepTag}>{item.step}</Text>
                </View>

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
//                       7. LOCATION PERMISSION MODAL
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
            Animated.parallel([
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true
                }),
                Animated.timing(slideAnim, {
                    toValue: 150,
                    duration: 180,
                    useNativeDriver: true
                })
            ]).start(({ finished }) => {
                if (finished) setShowModal(false);
            });
        }
    }, [visible]);

    const handleGrantPermission = async () => {
        try {
            const currentPerm = await Location.getForegroundPermissionsAsync();
            let finalStatus = currentPerm.status;

            if (currentPerm.status !== 'granted' && !currentPerm.canAskAgain) {
                onClose();
                AlertService.show({
                    title: language === 'ar' ? 'الصلاحية مطلوبة' : 'Permission Required',
                    message: language === 'ar'
                        ? 'لقد قمت برفض الصلاحية مسبقاً. يرجى تفعيل الموقع من إعدادات التطبيق.'
                        : 'Location was previously denied. Please enable it in app settings.',
                    type: 'warning',
                    buttons: [
                        { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'secondary' },
                        { 
                            text: language === 'ar' ? 'الإعدادات' : 'Settings', 
                            style: 'primary',
                            onPress: () => Linking.openSettings() 
                        }
                    ]
                });
                return;
            }

            if (currentPerm.status !== 'granted') {
                const req = await Location.requestForegroundPermissionsAsync();
                finalStatus = req.status;
            }

            if (finalStatus === 'granted') {
                const servicesEnabled = await Location.hasServicesEnabledAsync();
                
                if (!servicesEnabled) {
                    onClose(); 
                    AlertService.show({
                        title: language === 'ar' ? 'الموقع مغلق (GPS)' : 'GPS Disabled',
                        message: language === 'ar' 
                            ? 'صلاحية التطبيق مفعلة، لكن الـ GPS في هاتفك مغلق. يرجى تفعيله.' 
                            : 'App permission is granted, but your phone\'s GPS is turned off. Please turn it on.',
                        type: 'warning',
                        buttons: [
                            { text: language === 'ar' ? 'إلغاء' : 'Cancel', style: 'secondary' },
                            { 
                                text: language === 'ar' ? 'الإعدادات' : 'Settings', 
                                style: 'primary',
                                onPress: () => {
                                    if (Platform.OS === 'android') {
                                        Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS')
                                            .catch(() => Linking.openSettings());
                                    } else {
                                        Linking.openSettings();
                                    }
                                } 
                            }
                        ]
                    });
                    return;
                }

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onClose();
            } else {
                onClose();
            }
        } catch (e) {
            console.warn("Location prompt error:", e);
            onClose(); 
            Linking.openSettings();
        }
    };

    if (!showModal) return null;

    return (
        <Modal transparent visible={showModal} onRequestClose={onClose} animationType="none" statusBarTranslucent>
            <View style={styles.modalOverlay} pointerEvents="box-none">
                <Animated.View style={[styles.modalBackdrop, { opacity: opacityAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
                </Animated.View>

                <Animated.View style={[
                    styles.modalContent,
                    {
                        opacity: opacityAnim,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}>
                    <View style={styles.modalIconFloat}>
                        <View style={[styles.modalIconGradient, { backgroundColor: COLORS.accentGreen }]}>
                            <FontAwesome5 name="cloud-sun" size={28} color="#fff" />
                        </View>
                    </View>

                    <Text style={styles.modalTitle}>{t('weather_discovery_title', language)}</Text>
                    <Text style={styles.modalBody}>
                        {t('weather_discovery_desc', language)}
                    </Text>

                    <View style={styles.featureListContainer}>
                        <View style={styles.featureRow}>
                            <View style={[styles.featureIconBox, { backgroundColor: COLORS.gold + '26' }]}>
                                <FontAwesome5 name="clock" size={13} color={COLORS.gold} />
                            </View>
                            <Text style={styles.featureText}>{t('weather_feature_spf_timer', language)}</Text>
                        </View>
                        <View style={styles.featureRow}>
                            <View style={[styles.featureIconBox, { backgroundColor: COLORS.danger + '26' }]}>
                                <FontAwesome5 name="sun" size={13} color={COLORS.danger} />
                            </View>
                            <Text style={styles.featureText}>{t('weather_feature_uv_alerts', language)}</Text>
                        </View>
                        <View style={styles.featureRow}>
                            <View style={[styles.featureIconBox, { backgroundColor: (COLORS.info || COLORS.accentGreen) + '26' }]}>
                                <FontAwesome5 name="wind" size={13} color={COLORS.blue} />
                            </View>
                            <Text style={styles.featureText}>{t('weather_feature_aqi_analysis', language)}</Text>
                        </View>
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.btnSecondary}
                            activeOpacity={0.7}
                            delayPressIn={0}
                        >
                            <Text style={styles.btnSecondaryText}>{t('weather_btn_later', language)}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleGrantPermission}
                            style={styles.btnPrimary}
                            activeOpacity={0.8}
                            delayPressIn={0}
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

export const ExposureSlider = ({ value, onChange }) => {
    const language = useCurrentLanguage();
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);

    const widthAnim = useRef(new Animated.Value(value)).current;

    useEffect(() => {
        Animated.spring(widthAnim, {
            toValue: value,
            useNativeDriver: false,
            friction: 8,
            tension: 40
        }).start();
    }, [value]);

    const options = [
        { label: t('weather_day_nature_indoors', language), icon: 'home' },
        { label: t('weather_day_nature_limited', language), icon: 'walking' },
        { label: t('weather_day_nature_outdoors', language), icon: 'sun' },
    ];

    const handlePress = (index) => {
        Haptics.selectionAsync();
        onChange(index);
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
//                       STYLES
// ============================================================================
const createStyles = (COLORS, isRTL) => StyleSheet.create({
    loadingCard: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    loadingIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.accentGreen + '1A',
        alignItems: 'center',
        justifyContent: 'center',
        ...(isRTL ? { marginLeft: 16 } : { marginRight: 16 }),
    },
    skeletonLine: { backgroundColor: COLORS.accentGreen + '33', borderRadius: 4 },

    widgetContainer: {
        marginBottom: 16,
        borderRadius: 26,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    widgetGradient: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 26,
        overflow: 'hidden',
        position: 'relative',
    },
    widgetIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        ...(isRTL ? { marginLeft: 16 } : { marginRight: 16 }),
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    widgetContent: { flex: 1, justifyContent: 'center', ...(isRTL ? { paddingRight: 4 } : { paddingLeft: 4 }) },
    widgetTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: '#fff', textAlign: isRTL ? 'right' : 'left', marginBottom: 2 },
    widgetSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 13.5, color: 'rgba(255,255,255,0.95)', textAlign: isRTL ? 'right' : 'left' },
    widgetAction: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 17 },
    widgetBgIcon: { position: 'absolute', left: -25, bottom: -25, opacity: 0.08, transform: [{ rotate: '15deg' }] },

    miniCardContainer: {
        width: 145,
        height: 155,
        borderRadius: 22,
        padding: 14,
        justifyContent: 'space-between',
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    miniCardHeader: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' },
    miniIconCircle: {
        width: 30,
        height: 30,
        borderRadius: 11,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', opacity: 0.9 },
    miniCardTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
        color: '#fff',
        textAlign: isRTL ? 'right' : 'left',
        lineHeight: 20,
    },
    miniCardFooter: { flexDirection: isRTL ? 'row-reverse' : 'row' },
    glassPill: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 9,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.15)',
        alignSelf: isRTL ? 'flex-start' : 'flex-end',
    },
    glassPillText: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: '#fff' },
    glassSeparator: { width: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 6 },

    // 🌟 EDUCATIONAL + SOLUTION WIDGET SECTION (NO ICON, FULL WIDTH, INCREASED FONT) 🌟
    cleanWidgetAddCard: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 20,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.card,
        marginBottom: 14,
        gap: 8,
    },
    cleanWidgetHeaderRow: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },
    cleanWidgetTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15.5,
        color: COLORS.textPrimary,
        textAlign: isRTL ? 'right' : 'left',
    },
    cleanWidgetActionBadge: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accentGreen + '1A',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    cleanWidgetActionLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12.5,
        color: COLORS.accentGreen,
    },
    cleanWidgetDesc: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13.5,
        color: COLORS.textSecondary,
        textAlign: isRTL ? 'right' : 'left',
        lineHeight: 20,
    },

    featureCard: {
        width: 115,
        height: 120,
        backgroundColor: COLORS.card,
        borderRadius: 22,
        padding: 10,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        justifyContent: 'flex-start',
    },
    featureHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        paddingHorizontal: 4
    },
    featureTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        color: COLORS.textSecondary
    },
    arcCenterText: {
        position: 'absolute',
        top: 24,
        alignItems: 'center',
        width: '100%'
    },
    arcBigValue: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 19,
        color: COLORS.textPrimary,
        lineHeight: 22
    },
    arcLabel: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10.5,
        marginTop: 0
    },

    timelineContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 22,
        paddingVertical: 18,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        marginTop: 8,
    },
    timelineScrollContent: {
        paddingHorizontal: 16,
        flexDirection: isRTL ? 'row-reverse' : 'row',
        paddingBottom: 4
    },
    timeSlot: {
        alignItems: 'center',
        width: 58,
        ...(isRTL ? { marginLeft: 8 } : { marginRight: 8 }),
        justifyContent: 'flex-end',
        borderRadius: 12,
        paddingVertical: 4
    },
    timeSlotActive: {
        backgroundColor: COLORS.textPrimary + '08',
        borderWidth: 0.5,
        borderColor: COLORS.accentGreen + '33',
    },
    timelinePill: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2.5,
        borderRadius: 8,
        borderWidth: 0.5,
        marginBottom: 8,
        gap: 4,
        minWidth: 44,
        justifyContent: 'center',
    },
    timelinePillText: {
        fontSize: 9,
        fontFamily: 'Tajawal-Bold'
    },
    barTrack: {
        height: 65,
        width: 6,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 3,
        justifyContent: 'flex-end',
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
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        width: 13,
        height: 13,
        borderRadius: 6.5,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: COLORS.danger
    },
    timeLabelContainer: {
        alignItems: 'center',
        height: 30,
        justifyContent: 'flex-start'
    },
    timeText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12.5,
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
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 2
    },
    nowText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 9.5,
        color: '#fff'
    },

    accessoryCardWrapper: {
        flexGrow: 1,
        maxWidth: '48%',
    },
    accessoryCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 18,
        padding: 12,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        gap: 10,
        height: 62
    },
    accessoryIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },
    accessoryText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12.5,
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
        width: 17,
        height: 17,
        borderRadius: 8.5,
        backgroundColor: COLORS.accentGreen,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.8
    },

    sheetContainer: { paddingHorizontal: 10 },
    sectionWrapper: { marginTop: 24, paddingHorizontal: 2 },
    sectionHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10, gap: 8, paddingRight: 4 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, textAlign: 'right' },

    headerContainer: {
        borderRadius: 26,
        marginBottom: 14,
        overflow: 'hidden',
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    headerGradient: { padding: 22, borderRadius: 26, alignItems: 'center' },
    locationTag: {
        position: 'absolute', top: 18, flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)'
    },
    locationText: { fontFamily: 'Tajawal-Bold', fontSize: 10.5, color: '#fff' },
    headerCenter: { alignItems: 'center', marginVertical: 20, textAlign: 'center' },
    headerIconRing: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center', marginBottom: 12, marginTop: 14,
        borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)'
    },
    headerTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24, color: '#fff', textAlign: 'center', marginTop: 6 },
    headerSubtitle: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', maxWidth: '85%', lineHeight: 22, marginTop: 2 },
    metricPill: {
        flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
        gap: 8, alignSelf: 'center'
    },
    metricLabel: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: 'rgba(255,255,255,0.9)' },
    metricValue: { fontFamily: 'Tajawal-ExtraBold', fontSize: 15, color: '#fff' },
    metricDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.4)' },
    metricStatus: { fontFamily: 'Tajawal-Bold', fontSize: 13, color: '#fff' },

    impactCard: {
        flexDirection: 'row-reverse',
        backgroundColor: COLORS.card,
        borderRadius: 22,
        padding: 20,
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    impactSide: { flex: 1, gap: 10 },
    impactHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    impactIconBox: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    impactTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textPrimary },
    impactBody: { fontFamily: 'Tajawal-Regular', fontSize: 12.5, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 20 },
    impactDividerVertical: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 },

    nightPrepContainer: {
        height: 150,
        borderRadius: 24,
        padding: 18,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 16,
        borderWidth: 0.5,
        borderColor: '#4f46e5'
    },
    moonGlow: {
        position: 'absolute', top: -50, right: -50, width: 140, height: 140,
        borderRadius: 70, backgroundColor: '#818cf8', opacity: 0.2
    },
    nightPrepContent: { flex: 1, justifyContent: 'space-between' },
    nightHeader: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 },
    iconBox: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    nightTag: { fontFamily: 'Tajawal-Bold', fontSize: 11.5, color: '#c7d2fe' },
    nightTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 18, color: '#fff', textAlign: isRTL ? 'right' : 'left', marginTop: 3 },
    nightBody: { fontFamily: 'Tajawal-Regular', fontSize: 12.5, color: '#e0e7ff', textAlign: isRTL ? 'right' : 'left', maxWidth: '85%', lineHeight: 18 },
    nightActionRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, opacity: 0.8 },
    nightBtnText: { fontFamily: 'Tajawal-Bold', fontSize: 11.5, color: '#c7d2fe' },
    bgMoon: { position: 'absolute', ...(isRTL ? { left: -20 } : { right: -20 }), bottom: -20, opacity: 0.1, transform: [{ rotate: '15deg' }] },

    sliderContainer: { marginBottom: 16, paddingHorizontal: 2 },
    sliderTitle: { fontFamily: 'Tajawal-Bold', fontSize: 13.5, color: COLORS.textSecondary },
    sliderTrack: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        backgroundColor: COLORS.background,
        borderRadius: 14,
        height: 44,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        position: 'relative',
        justifyContent: 'space-between',
    },
    sliderPill: {
        position: 'absolute', top: 3, bottom: 3, width: '32%', backgroundColor: COLORS.accentGreen, borderRadius: 11,
        zIndex: 1,
    },
    sliderOption: { flex: 1, flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 10, height: '100%' },
    sliderText: { fontSize: 11, paddingBottom: 2 },

    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
    modalContent: {
        width: width * 0.85,
        backgroundColor: COLORS.card,
        borderRadius: 24,
        paddingHorizontal: 22,
        paddingTop: 36,
        paddingBottom: 20,
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    modalIconFloat: {
        position: 'absolute',
        top: -30,
        alignSelf: 'center',
    },
    modalIconGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: COLORS.card,
    },
    modalTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: COLORS.textPrimary, marginBottom: 6, textAlign: 'center' },
    modalBody: { fontFamily: 'Tajawal-Regular', fontSize: 13.5, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 18, lineHeight: 20 },
    featureListContainer: { width: '100%', marginBottom: 20, gap: 10 },
    featureRow: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: COLORS.background, padding: 10, borderRadius: 12, gap: 12 },
    featureIconBox: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    featureText: { fontFamily: 'Tajawal-Bold', fontSize: 12.5, color: COLORS.textPrimary, flex: 1, textAlign: isRTL ? 'right' : 'left' },
    accessoriesGrid: { flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    modalActions: { flexDirection: isRTL ? 'row-reverse' : 'row', width: '100%', gap: 10 },
    btnPrimary: {
        flex: 1,
        backgroundColor: COLORS.accentGreen,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnPrimaryText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: '#ffffff', marginBottom: 2 },
    btnSecondary: { flex: 0.4, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
    btnSecondaryText: { fontFamily: 'Tajawal-Bold', fontSize: 13.5, color: COLORS.textDim, marginBottom: 2 },

    cleanListContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderWidth: 0.5,
        borderColor: COLORS.border,
    },
    cleanRowContainer: {
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    cleanIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        ...(isRTL ? { marginLeft: 12 } : { marginRight: 12 }),
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
        fontSize: 13.5,
        color: COLORS.textPrimary,
        textAlign: isRTL ? 'right' : 'left',
    },
    cleanStepTag: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 9.5,
        color: COLORS.textDim,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    cleanProductText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11.5,
        textAlign: isRTL ? 'right' : 'left',
        opacity: 0.9,
    },
    cleanDivider: {
        height: 0.5,
        backgroundColor: COLORS.border,
        width: '100%',
    },
});