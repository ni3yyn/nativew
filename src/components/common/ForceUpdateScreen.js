import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../context/ThemeContext';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useAppContext } from '../../context/AppContext';
import { t, normalizeLanguage } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

const { width } = Dimensions.get('window');

/**
 * ForceUpdateScreen (Independent Blocking Screen)
 * Fully powered by ThemeContext (`useTheme()`) for dynamic theme switching
 * (Dark/Original, Light, Baby Pink, Clinical Blue, etc.), displaying
 * the mandatory update and the "What's New" release notes from `appConfig.changelog`.
 */
const ForceUpdateScreen = ({
  url,
  message,
  changelog,
  latestVersion,
  language: propLanguage,
}) => {
  const { colors, theme } = useTheme();
  const COLORS = colors || DEFAULT_COLORS;

  const context = useAppContext?.() || {};
  const currentLang = useCurrentLanguage?.();

  // Resolve props or context fallbacks
  const language = normalizeLanguage(
    propLanguage || currentLang || context.userProfile?.settings?.language || 'ar'
  );
  const targetUrl = url || context.appConfig?.latestVersionUrl || '';
  const versionNum = latestVersion || context.appConfig?.latestVersion || '';
  const changelogList =
    changelog !== undefined ? changelog : context.appConfig?.changelog || [];
  const criticalMsg =
    message ||
    context.appConfig?.criticalMessage ||
    context.appConfig?.android?.critical_message;

  // Hardcoded Facebook page
  const FACEBOOK_URL = 'https://facebook.com/wathiqai/';
  const FACEBOOK_APP_URL =
    'fb://facewebmodal/f?href=https://facebook.com/wathiqai/';

  const isRTL = language === 'ar';

  const styles = useMemo(
    () => createStyles(COLORS, theme, isRTL),
    [COLORS, theme, isRTL]
  );

  const bgGradientColors = useMemo(() => {
    if (theme?.isDark) {
      return [
        COLORS.gradientStart || COLORS.background,
        COLORS.card,
        COLORS.gradientEnd || COLORS.background,
      ];
    }
    return [
      COLORS.gradientStart || COLORS.background,
      COLORS.gradientMid || COLORS.card,
      COLORS.gradientEnd || COLORS.background,
    ];
  }, [COLORS, theme]);

  const buttonGradientColors = useMemo(() => {
    return [
      COLORS.primary || COLORS.accentGreen || '#5A9C84',
      COLORS.accentGreen || COLORS.primary || '#3E7D67',
    ];
  }, [COLORS]);

  const hasChangelog = Array.isArray(changelogList) && changelogList.length > 0;
  const displayChangelog = hasChangelog
    ? changelogList
    : [t('optional_update_default_item', language)];

  /* ------------------------------------------------------------------
   * Sophisticated flying logo:
   *  - Layer 1: a large slow "drift" (organic wander across the plane)
   *  - Layer 2: a smaller fast "flutter" (jitter that adds life)
   *  - Heading rotation eases toward each new drift target
   *  - A subtle "breathing" scale tied to the flutter phase
   * ------------------------------------------------------------------ */
  const driftX = useRef(new Animated.Value(0)).current;
  const driftY = useRef(new Animated.Value(0)).current;
  const flutterX = useRef(new Animated.Value(0)).current;
  const flutterY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const timers = [];

    /* --- Drift: large, slow, random waypoints --- */
    const DRIFT_RANGE_X = 90;
    const DRIFT_RANGE_Y = 55;
    const DRIFT_MIN_D = 1800;
    const DRIFT_MAX_D = 3200;
    const DRIFT_MIN_PAUSE = 200;
    const DRIFT_MAX_PAUSE = 600;

    /* --- Flutter: small, fast, always running --- */
    const FLUTTER_RANGE_X = 8;
    const FLUTTER_RANGE_Y = 6;
    const FLUTTER_MIN_D = 220;
    const FLUTTER_MAX_D = 420;

    const rnd = (min, max) => Math.random() * (max - min) + min;

    const driftStep = () => {
      if (cancelled) return;

      const tx = rnd(-DRIFT_RANGE_X, DRIFT_RANGE_X);
      const ty = rnd(-DRIFT_RANGE_Y, DRIFT_RANGE_Y);
      const duration = rnd(DRIFT_MIN_D, DRIFT_MAX_D);
      const pause = rnd(DRIFT_MIN_PAUSE, DRIFT_MAX_PAUSE);

      // Compute heading angle for rotation to face motion direction
      const prevX = driftX.__getValue();
      const prevY = driftY.__getValue();
      const dx = tx - prevX;
      const dy = ty - prevY;
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      // Clamp so it never spins wildly
      const clamped = Math.max(-25, Math.min(25, angleDeg * 0.35));

      Animated.parallel([
        Animated.timing(driftX, {
          toValue: tx,
          duration,
          easing: Easing.bezier(0.42, 0, 0.58, 1), // smooth in-out
          useNativeDriver: true,
        }),
        Animated.timing(driftY, {
          toValue: ty,
          duration,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: clamped,
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (cancelled || !finished) return;
        const t = setTimeout(driftStep, pause);
        timers.push(t);
      });
    };

    const flutterStep = () => {
      if (cancelled) return;

      const tx = rnd(-FLUTTER_RANGE_X, FLUTTER_RANGE_X);
      const ty = rnd(-FLUTTER_RANGE_Y, FLUTTER_RANGE_Y);
      const duration = rnd(FLUTTER_MIN_D, FLUTTER_MAX_D);

      Animated.parallel([
        Animated.timing(flutterX, {
          toValue: tx,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(flutterY, {
          toValue: ty,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (cancelled || !finished) return;
        flutterStep();
      });
    };

    /* --- Breathing scale: slow sine-like pulse --- */
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    driftStep();
    flutterStep();
    breatheLoop.start();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      driftX.stopAnimation();
      driftY.stopAnimation();
      flutterX.stopAnimation();
      flutterY.stopAnimation();
      rotate.stopAnimation();
      breathe.stopAnimation();
    };
  }, [driftX, driftY, flutterX, flutterY, rotate, breathe]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-25, 25],
    outputRange: ['-25deg', '25deg'],
  });

  const breatheScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const logoTransform = {
    transform: [
      { translateX: driftX },
      { translateY: driftY },
      { translateX: flutterX },
      { translateY: flutterY },
      { rotate: rotateInterpolate },
      { scale: breatheScale },
    ],
  };

  const handleUpdatePress = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      if (targetUrl) {
        await Linking.openURL(targetUrl);
      }
    } catch (error) {
      console.warn('Failed to open store URL:', error);
    }
  };

  const handleFacebookPress = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (Platform.OS === 'web') {
        await Linking.openURL(FACEBOOK_URL);
        return;
      }

      const appUrl =
        Platform.OS === 'ios'
          ? `fb://facewebmodal/f?href=${encodeURIComponent(FACEBOOK_URL)}`
          : FACEBOOK_APP_URL;

      const canOpenApp = await Linking.canOpenURL(appUrl);

      if (canOpenApp) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(FACEBOOK_URL);
      }
    } catch (error) {
      console.warn('Failed to open Facebook app, falling back to web:', error);
      try {
        await Linking.openURL(FACEBOOK_URL);
      } catch (fallbackError) {
        console.warn('Fallback Facebook open also failed:', fallbackError);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style={theme?.isDark ? 'light' : 'dark'} translucent={true} />

      {/* Dynamic Theme Gradient Background */}
      <LinearGradient
        colors={bgGradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glowing elements reflecting theme colors */}
      <View style={styles.ambientGlowTop} pointerEvents="none" />
      <View style={styles.ambientGlowBottom} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.contentWrapper}>
          {/* Top Hero Section: Flying Logo, Version, Title */}
          <View style={styles.heroSection}>
            <View style={styles.logoRow}>
              <Animated.Image
                source={require('../../../assets/logo.png')}
                style={[styles.appLogo, logoTransform]}
                resizeMode="contain"
              />
            </View>

            {versionNum ? (
              <View style={styles.versionBadge}>
                <View style={styles.versionDot} />
                <Text style={styles.versionText}>
                  {isRTL ? `الإصدار ${versionNum}` : `v${versionNum}`}
                </Text>
              </View>
            ) : null}

            <Text style={styles.titleText}>
              {t('force_update_title', language)}
            </Text>

            <Text style={styles.messageText}>
              {criticalMsg || t('force_update_default_message', language)}
            </Text>
          </View>

          {/* "What's New" (Changelog) Section */}
          <View style={styles.changelogCard}>
            <View style={styles.changelogHeaderRow}>
              <FontAwesome5
                name="star"
                size={15}
                color={COLORS.accentGreen || COLORS.primary}
                style={styles.headerIcon}
              />
              <Text style={styles.whatsNewTitle}>
                {t('optional_update_whats_new', language)}
              </Text>
              {displayChangelog.length > 1 ? (
                <Text style={styles.countBadgeText}>{displayChangelog.length}</Text>
              ) : null}
            </View>

            <ScrollView
              style={styles.changelogScrollView}
              contentContainerStyle={styles.changelogContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              bounces={true}
            >
              {displayChangelog.map((item, index) => (
                <View key={index} style={styles.changelogItemRow}>
                  <FontAwesome5
                    name="check"
                    size={13}
                    color={COLORS.accentGreen || COLORS.primary}
                    style={styles.changelogCheckIcon}
                  />
                  <Text style={styles.changelogItemText}>{item}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Action Button Section */}
          <View style={styles.actionSection}>
            <Pressable
              style={({ pressed }) => [
                styles.updateButtonPressable,
                pressed && styles.updateButtonPressed,
              ]}
              onPress={handleUpdatePress}
              disabled={!targetUrl}
            >
              <LinearGradient
                colors={buttonGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.updateButtonGradient}
              >
                <Feather
                  name="download-cloud"
                  size={19}
                  color={COLORS.textOnAccent || '#FFFFFF'}
                />
                <Text style={styles.updateButtonText}>
                  {t('force_update_action', language)}
                </Text>
                <Feather
                  name={isRTL ? 'chevron-left' : 'chevron-right'}
                  size={18}
                  color={COLORS.textOnAccent || '#FFFFFF'}
                  style={styles.buttonChevron}
                />
              </LinearGradient>
            </Pressable>

            {/* Facebook Button (Secondary) */}
            <Pressable
              style={({ pressed }) => [
                styles.facebookButtonPressable,
                pressed && styles.facebookButtonPressed,
              ]}
              onPress={handleFacebookPress}
            >
              <FontAwesome5
                name="facebook-f"
                size={16}
                color={COLORS.textPrimary}
              />
              <Text style={styles.facebookButtonText}>
                {isRTL ? 'تابعنا على فيسبوك' : 'Follow us on Facebook'}
              </Text>
              <Feather
                name="external-link"
                size={14}
                color={COLORS.textDim || COLORS.textSecondary}
                style={styles.facebookExternalIcon}
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default ForceUpdateScreen;

const createStyles = (COLORS, theme, isRTL) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    safeArea: {
      flex: 1,
    },
    ambientGlowTop: {
      position: 'absolute',
      top: -80,
      left: width / 2 - 140,
      width: 280,
      height: 280,
      borderRadius: 140,
      backgroundColor: COLORS.accentGlow || 'rgba(90, 156, 132, 0.18)',
      opacity: 0.7,
    },
    ambientGlowBottom: {
      position: 'absolute',
      bottom: -100,
      right: -60,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: COLORS.gold ? `${COLORS.gold}18` : 'rgba(251, 191, 36, 0.08)',
      opacity: 0.7,
    },
    contentWrapper: {
      flex: 1,
      paddingHorizontal: 22,
      paddingTop: Platform.OS === 'android' ? 20 : 12,
      paddingBottom: 16,
      justifyContent: 'space-between',
    },

    /* ---------------- Hero Section ---------------- */
    heroSection: {
      alignItems: 'center',
      marginTop: 8,
    },
    logoRow: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 140,
      width: '100%',
      marginBottom: 4,
    },
    appLogo: {
      width: 96,
      height: 96,
    },
    versionBadge: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: COLORS.inputBg || 'rgba(0,0,0,0.15)',
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: 10,
    },
    versionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: COLORS.accentGreen || COLORS.primary,
    },
    versionText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 12,
      color: COLORS.textSecondary,
      letterSpacing: 0.4,
    },
    titleText: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 24,
      color: COLORS.textPrimary,
      textAlign: 'center',
      marginBottom: 8,
      lineHeight: 32,
      paddingHorizontal: 8,
    },
    messageText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 15,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 23,
      paddingHorizontal: 14,
    },

    /* ---------------- Changelog Card ---------------- */
    changelogCard: {
      // Semi-transparent container, no shadow
      backgroundColor: theme?.isDark
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(0, 0, 0, 0.04)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingTop: 16,
      paddingBottom: 12,
      paddingHorizontal: 16,
      marginVertical: 16,
      flex: 1,
      maxHeight: 270,
    },
    changelogHeaderRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      marginBottom: 12,
    },
    headerIcon: {
      marginTop: 1,
    },
    whatsNewTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 16.5,
      color: COLORS.textPrimary,
      flex: 1,
      textAlign: isRTL ? 'right' : 'left',
    },
    countBadgeText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 13,
      color: COLORS.textSecondary,
      opacity: 0.75,
    },
    changelogScrollView: {
      flex: 1,
    },
    changelogContent: {
      gap: 12,
      paddingVertical: 2,
      paddingBottom: 6,
    },
    changelogItemRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 10,
    },
    changelogCheckIcon: {
      marginTop: 1,
    },
    changelogItemText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 14.5,
      color: COLORS.textPrimary,
      flex: 1,
      lineHeight: 22,
      textAlign: isRTL ? 'right' : 'left',
    },

    /* ---------------- Action Section ---------------- */
    actionSection: {
      width: '100%',
      alignItems: 'center',
      gap: 10,
    },
    updateButtonPressable: {
      width: '100%',
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: COLORS.primary || COLORS.accentGreen || '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    },
    updateButtonPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.92,
    },
    updateButtonGradient: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      paddingVertical: 15,
      paddingHorizontal: 22,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    updateButtonText: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 16,
      color: COLORS.textOnAccent || '#FFFFFF',
      flex: 1,
      textAlign: 'center',
    },
    buttonChevron: {
      opacity: 0.9,
    },

    /* ---------------- Facebook (Secondary) Button ---------------- */
    facebookButtonPressable: {
      width: '100%',
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 13,
      paddingHorizontal: 22,
      borderRadius: 16,
      // Semi-transparent surface so it reads as secondary
      backgroundColor: theme?.isDark
        ? 'rgba(255, 255, 255, 0.06)'
        : 'rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    facebookButtonPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.85,
    },
    facebookButtonText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 14.5,
      color: COLORS.textPrimary,
      textAlign: 'center',
    },
    facebookExternalIcon: {
      opacity: 0.8,
    },
  });