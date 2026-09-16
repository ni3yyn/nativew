import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Pressable,
  Linking,
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

const { width, height } = Dimensions.get('window');

/**
 * MaintenanceScreen (Independent Blocking Screen)
 * Fully powered by ThemeContext (`useTheme()`) for dynamic theme switching,
 * displaying a polished maintenance state with reassuring messaging.
 */
const MaintenanceScreen = ({
  message,
  language: propLanguage,
}) => {
  const { colors, theme } = useTheme();
  const COLORS = colors || DEFAULT_COLORS;

  const context = useAppContext?.() || {};
  const currentLang = useCurrentLanguage?.();

  const language = normalizeLanguage(
    propLanguage || currentLang || context.userProfile?.settings?.language || 'ar'
  );
  const maintenanceMsg =
    message ||
    context.appConfig?.maintenanceMessage ||
    (language === 'ar'
      ? 'نقوم ببعض التحسينات لضمان أفضل تجربة لك، سنعود قريباً.'
      : 'We are performing scheduled maintenance to ensure the best experience. We will be back shortly.');

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

  /* ---------- Flying Blobs Animation ---------- */
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;
  const blob3 = useRef(new Animated.Value(0)).current;

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
    /* --- Blobs (unchanged) --- */
    const createLoop = (value, duration, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = createLoop(blob1, 6000, 0);
    const a2 = createLoop(blob2, 7500, 400);
    const a3 = createLoop(blob3, 9000, 800);

    a1.start();
    a2.start();
    a3.start();

    /* --- Sophisticated logo motion --- */
    let cancelled = false;
    const timers = [];

    const DRIFT_RANGE_X = 90;
    const DRIFT_RANGE_Y = 55;
    const DRIFT_MIN_D = 1800;
    const DRIFT_MAX_D = 3200;
    const DRIFT_MIN_PAUSE = 200;
    const DRIFT_MAX_PAUSE = 600;

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

      const prevX = driftX.__getValue();
      const prevY = driftY.__getValue();
      const dx = tx - prevX;
      const dy = ty - prevY;
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      const clamped = Math.max(-25, Math.min(25, angleDeg * 0.35));

      Animated.parallel([
        Animated.timing(driftX, {
          toValue: tx,
          duration,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
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
      a1.stop();
      a2.stop();
      a3.stop();
      driftX.stopAnimation();
      driftY.stopAnimation();
      flutterX.stopAnimation();
      flutterY.stopAnimation();
      rotate.stopAnimation();
      breathe.stopAnimation();
    };
  }, [
    blob1,
    blob2,
    blob3,
    driftX,
    driftY,
    flutterX,
    flutterY,
    rotate,
    breathe,
  ]);

  const blob1Translate = {
    transform: [
      {
        translateX: blob1.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 40],
        }),
      },
      {
        translateY: blob1.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -50],
        }),
      },
      {
        scale: blob1.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.15],
        }),
      },
    ],
  };

  const blob2Translate = {
    transform: [
      {
        translateX: blob2.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -55],
        }),
      },
      {
        translateY: blob2.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 45],
        }),
      },
      {
        scale: blob2.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.85],
        }),
      },
    ],
  };

  const blob3Translate = {
    transform: [
      {
        translateX: blob3.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 35],
        }),
      },
      {
        translateY: blob3.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -35],
        }),
      },
      {
        scale: blob3.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.2],
        }),
      },
    ],
  };

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

      {/* Flying Blobs */}
      <Animated.View
        style={[styles.blob, styles.blob1, blob1Translate]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.blob, styles.blob2, blob2Translate]}
        pointerEvents="none"
      />
      <Animated.View
        style={[styles.blob, styles.blob3, blob3Translate]}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.contentWrapper}>
          {/* App Logo (top, sophisticated motion) */}
          <View style={styles.logoRow}>
            <Animated.Image
              source={require('../../../assets/logo.png')}
              style={[styles.appLogo, logoTransform]}
              resizeMode="contain"
            />
          </View>

          {/* Main Centered Content */}
          <View style={styles.centerSection}>
            {/* Top Hero Icon (bare, no container) */}
            <FontAwesome5
              name="tools"
              size={44}
              color={COLORS.gold || '#FBBF24'}
              style={styles.heroIcon}
            />

            {/* Title */}
            <Text style={styles.titleText}>
              {t('maintenance_mode_title', language)}
            </Text>

            {/* Message Card */}
            <View style={styles.messageCard}>
              <View style={styles.messageHeaderRow}>
                <Feather
                  name="clock"
                  size={15}
                  color={COLORS.accentGreen || COLORS.primary}
                  style={styles.messageHeaderIcon}
                />
                <Text style={styles.messageHeaderText}>
                  {isRTL ? 'الرجاء المحاولة لاحقاً' : 'Please check back shortly'}
                </Text>
              </View>
              <Text style={styles.messageBodyText}>{maintenanceMsg}</Text>
            </View>
          </View>

          {/* Bottom Action: Facebook Button */}
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
      </SafeAreaView>
    </View>
  );
};

export default MaintenanceScreen;

const createStyles = (COLORS, theme, isRTL) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    safeArea: {
      flex: 1,
    },

    /* ---------------- Flying Blobs ---------------- */
    blob: {
      position: 'absolute',
      borderRadius: 999,
      opacity: 0.35,
    },
    blob1: {
      top: height * 0.12,
      left: width * 0.1,
      width: 180,
      height: 180,
      backgroundColor: COLORS.accentGlow || 'rgba(90, 156, 132, 0.35)',
    },
    blob2: {
      bottom: height * 0.18,
      right: width * 0.05,
      width: 220,
      height: 220,
      backgroundColor: COLORS.gold
        ? `${COLORS.gold}55`
        : 'rgba(251, 191, 36, 0.35)',
    },
    blob3: {
      top: height * 0.55,
      left: width * 0.55,
      width: 140,
      height: 140,
      backgroundColor: COLORS.primary
        ? `${COLORS.primary}44`
        : 'rgba(90, 156, 132, 0.3)',
    },

    contentWrapper: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: Platform.OS === 'android' ? 24 : 16,
      paddingBottom: 20,
      justifyContent: 'space-between',
    },

    /* ---------------- App Logo (top, animated) ---------------- */
    logoRow: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      marginBottom: 8,
      height: 110,
    },
    appLogo: {
      width: 48,
      height: 48,
    },

    centerSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },

    /* ---------------- Hero ---------------- */
    heroIcon: {
      marginBottom: 20,
    },

    /* ---------------- Title ---------------- */
    titleText: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 25,
      color: COLORS.textPrimary,
      textAlign: 'center',
      marginBottom: 18,
      lineHeight: 33,
    },

    /* ---------------- Message Card ---------------- */
    messageCard: {
      width: '100%',
      maxWidth: 360,
      // Semi-transparent container, no shadow
      backgroundColor: theme?.isDark
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(0, 0, 0, 0.04)',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 18,
      marginTop: 8,
    },
    messageHeaderRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      marginBottom: 12,
    },
    messageHeaderIcon: {
      marginTop: 1,
    },
    messageHeaderText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 15,
      color: COLORS.textSecondary,
      flex: 1,
      textAlign: isRTL ? 'right' : 'left',
    },
    messageBodyText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 15.5,
      color: COLORS.textPrimary,
      textAlign: isRTL ? 'right' : 'left',
      lineHeight: 24,
    },

    /* ---------------- Facebook Button ---------------- */
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