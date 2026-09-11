// src/utils/AuthenticHeader.js
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, G, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useAppContext } from '../context/AppContext';
import { t, interpolate } from '../i18n';
import { useCurrentLanguage } from '../hooks/useCurrentLanguage';
import { useRTL } from '../hooks/useRTL';
import { AVATARS } from '../constants/avatars';

// 🌟 EMBED USER PROFILE MODAL
import UserProfileModal from '../components/community/UserProfileModal';

const { width } = Dimensions.get('window');

// ============================================================================
//                       GLOBAL HEADER CREST DIVIDER
// ============================================================================
const DrawnBotanicalCrest = ({ color }) => (
  <View
    pointerEvents="none"
    style={{
      position: 'absolute',
      bottom: -2.5,
      left: 0,
      right: 0,
      width: '100%',
      height: 20,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      zIndex: 10,
    }}
  >
    <Svg
      width="100%"
      height="20"
      viewBox="0 0 400 20"
      fill="none"
      preserveAspectRatio="none"
    >
      <Path
        d="
          M 0,17.2
          C 14,16.7 25,15.4 38,15.9
          C 51,16.4 61,17.5 74,16.3
          C 88,15.0 99,14.2 113,15.5
          C 128,16.9 138,17.2 151,15.8
          C 166,14.2 177,13.8 190,15.3
          C 204,16.9 216,17.0 229,15.8
          C 243,14.4 254,14.2 268,15.5
          C 282,16.9 294,17.3 307,15.9
          C 322,14.4 333,14.5 347,15.9
          C 361,17.2 374,16.7 386,15.7
          C 392,15.2 397,15.7 400,16.9
        "
        stroke={color}
        strokeWidth="0.9"
        strokeLinecap="round"
        fill="none"
        opacity="0.82"
      />

      <Path
        d="
          M 0,17.7
          C 20,16.2 31,16.5 45,17.1
          C 61,17.9 73,16.7 87,16.0
          C 102,15.1 115,17.0 129,17.1
          C 144,17.3 157,15.4 171,15.4
          C 187,15.4 199,17.3 214,16.7
          C 229,16.1 242,15.1 257,16.1
          C 273,17.2 286,17.6 301,16.8
          C 316,15.9 330,15.7 345,16.8
          C 362,17.9 380,15.4 400,17.4
        "
        stroke={color}
        strokeWidth="0.24"
        strokeLinecap="round"
        fill="none"
        opacity="0.28"
      />

      <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M 24,16.2 C 24.7,12.8 26.6,9.8 30.1,7.5" strokeWidth="0.58" opacity="0.62" />
        <Path d="M 58,17.1 C 57.0,13.6 55.2,11.0 52.6,8.7" strokeWidth="0.46" opacity="0.46" />
        <Path d="M 91,15.4 C 93.5,12.0 96.5,9.7 100.0,7.9" strokeWidth="0.58" opacity="0.56" />
        <Path d="M 116,15.8 C 116.1,12.0 114.7,9.4 112.8,7.0" strokeWidth="0.46" opacity="0.43" />
        <Path d="M 143,16.2 C 146.0,12.6 149.5,10.2 153.4,8.2" strokeWidth="0.58" opacity="0.57" />
        <Path d="M 168,14.4 C 168.8,11.0 169.0,8.0 171.2,5.2" strokeWidth="0.48" opacity="0.44" />
        <Path d="M 188,15.0 C 190.0,11.6 192.2,8.8 195.4,6.4" strokeWidth="0.62" opacity="0.62" />
        <Path d="M 208,16.2 C 209.1,12.8 210.2,10.0 212.5,7.4" strokeWidth="0.46" opacity="0.43" />
        <Path d="M 238,15.5 C 241.0,12.1 244.2,10.0 247.8,8.0" strokeWidth="0.58" opacity="0.56" />
        <Path d="M 266,15.6 C 265.0,12.0 263.5,9.6 261.3,7.4" strokeWidth="0.46" opacity="0.43" />
        <Path d="M 294,16.2 C 297.0,12.5 300.2,10.1 304.0,8.2" strokeWidth="0.58" opacity="0.56" />
        <Path d="M 320,15.0 C 320.7,11.7 319.5,9.3 317.6,7.1" strokeWidth="0.46" opacity="0.42" />
        <Path d="M 347,15.9 C 350.2,12.4 353.3,10.0 357.1,8.0" strokeWidth="0.58" opacity="0.55" />
        <Path d="M 375,16.0 C 375.9,12.6 377.4,10.0 379.9,7.8" strokeWidth="0.46" opacity="0.42" />
        <Path d="M 0,17.2 C 6,16.2 10.2,13.5 12.2,10.3" strokeWidth="0.6" opacity="0.58" />
        <Path d="M 400,16.9 C 396.1,15.4 393.0,12.8 391.2,10.0" strokeWidth="0.6" opacity="0.58" />
      </G>

      <G fill={color}>
        <Path d="M 6.2,14.8 C 7.2,11.7 10.2,9.6 13.0,10.0 C 12.1,13.1 9.8,15.0 6.2,15.6 Z" opacity="0.62" />
        <Path d="M 25.6,10.8 C 23.8,7.3 25.0,4.6 28.1,3.4 C 31.1,6.1 30.9,8.8 28.2,11.3 Z" opacity="0.74" />
        <Path d="M 54.5,11.1 C 51.7,8.0 52.2,5.2 55.0,4.0 C 58.1,5.8 58.3,8.6 56.0,11.6 Z" opacity="0.58" />
        <Path d="M 94.0,11.7 C 95.4,8.0 99.0,6.0 102.0,7.7 C 100.3,10.8 97.4,12.4 94.0,12.4 Z" opacity="0.67" />
        <Path d="M 114.1,10.0 C 112.3,6.7 113.6,4.2 116.4,3.3 C 119.1,5.7 118.6,8.0 116.1,10.5 Z" opacity="0.5" />
        <Path d="M 145.8,11.2 C 147.2,7.8 150.8,6.0 153.6,7.8 C 151.7,10.8 148.7,12.2 145.8,11.8 Z" opacity="0.68" />
        <Path d="M 168.9,8.4 C 166.6,5.0 168.0,2.3 170.8,1.2 C 173.6,4.1 173.2,6.9 170.6,9.0 Z" opacity="0.58" />
        <Path d="M 188.7,9.1 C 187.4,5.3 189.2,2.4 192.2,1.5 C 195.0,4.4 194.7,7.3 191.7,9.8 Z" opacity="0.79" />
        <Path d="M 194.0,11.0 C 197.0,7.2 201.7,6.0 204.7,8.4 C 202.2,11.8 197.8,12.9 194.0,11.8 Z" opacity="0.61" />
        <Path d="M 240.4,11.4 C 241.7,7.9 245.4,6.2 248.4,7.9 C 246.7,10.9 243.6,12.3 240.4,11.8 Z" opacity="0.66" />
        <Path d="M 263.8,9.7 C 261.5,6.4 262.6,3.7 265.4,2.7 C 268.2,5.2 267.9,7.8 265.1,10.2 Z" opacity="0.53" />
        <Path d="M 298.0,11.5 C 299.5,8.1 303.3,6.3 306.2,8.1 C 304.3,11.0 301.2,12.4 298.0,11.9 Z" opacity="0.66" />
        <Path d="M 319.1,10.0 C 316.9,6.9 318.1,4.1 320.8,3.1 C 323.6,5.5 323.2,8.2 320.5,10.5 Z" opacity="0.5" />
        <Path d="M 349.0,11.4 C 350.8,7.9 354.5,6.5 357.4,8.1 C 355.6,11.0 352.7,12.3 349.0,11.8 Z" opacity="0.67" />
        <Path d="M 374.1,10.0 C 372.4,6.7 373.7,4.1 376.5,3.0 C 379.3,5.5 378.9,8.0 376.3,10.4 Z" opacity="0.54" />
        <Path d="M 390.0,13.0 C 390.9,9.7 394.0,7.8 397.0,9.2 C 395.7,12.3 393.2,14.1 390.0,13.7 Z" opacity="0.62" />
      </G>

      <G fill="none" stroke={color} strokeWidth="0.24" strokeLinecap="round" opacity="0.25">
        <Path d="M 26.0,10.5 Q 28.1,7.1 28.0,3.9" />
        <Path d="M 54.8,10.9 Q 55.4,7.4 55.2,4.5" />
        <Path d="M 94.5,11.3 Q 98.5,9.3 101.3,8.0" />
        <Path d="M 114.5,9.7 Q 116.0,6.7 116.3,3.7" />
        <Path d="M 146.3,10.9 Q 150.2,9.0 153.1,8.0" />
        <Path d="M 169.3,8.0 Q 170.3,4.8 170.7,1.7" />
        <Path d="M 189.0,8.8 Q 191.2,5.3 192.1,1.9" />
        <Path d="M 194.5,10.7 Q 199.3,9.0 204.0,8.6" />
        <Path d="M 240.8,11.0 Q 245.0,9.1 247.7,8.2" />
        <Path d="M 264.2,9.4 Q 265.0,6.1 265.3,3.0" />
        <Path d="M 298.4,11.1 Q 302.4,9.4 305.4,8.5" />
        <Path d="M 319.5,9.7 Q 320.3,6.5 320.8,3.5" />
        <Path d="M 349.5,11.0 Q 353.6,9.2 356.6,8.4" />
        <Path d="M 374.5,9.7 Q 375.4,6.5 376.2,3.4" />
        <Path d="M 390.4,12.7 Q 393.6,10.6 396.2,9.7" />
      </G>

      <G fill={color}>
        <Circle cx="30.1" cy="7.5" r="0.55" opacity="0.45" />
        <Circle cx="100.0" cy="7.9" r="0.5" opacity="0.42" />
        <Circle cx="153.4" cy="8.2" r="0.48" opacity="0.42" />
        <Circle cx="195.4" cy="6.4" r="0.58" opacity="0.48" />
        <Circle cx="247.8" cy="8.0" r="0.5" opacity="0.42" />
        <Circle cx="304.0" cy="8.2" r="0.48" opacity="0.4" />
        <Circle cx="357.1" cy="8.0" r="0.5" opacity="0.42" />
      </G>
    </Svg>
  </View>
);

export const getHeaderDimensions = (insetsOrTop = 0) => {
  const safeTop = typeof insetsOrTop === 'number' 
    ? insetsOrTop 
    : (insetsOrTop?.top ?? 0);
  const baseHeight = 85;
  const maxHeight = baseHeight + safeTop;
  const minHeight = (Platform.OS === 'ios' ? 65 : 60) + safeTop;
  const scrollDistance = maxHeight - minHeight;
  return { maxHeight, minHeight, scrollDistance };
};

const getHeaderTitle = (key, language) => {
  const titles = {
    shelf: { title: t('profile_header_shelf', language), icon: 'list' },
    routine: { title: t('profile_header_routine', language), icon: 'calendar-check' },
    analysis: { title: t('profile_header_analysis', language), icon: 'chart-pie' },
    migration: { title: t('profile_header_migration', language), icon: 'exchange-alt' },
    ingredients: { title: t('profile_header_ingredients', language), icon: 'flask' },
    settings: { title: t('profile_header_settings', language), icon: 'cog' },
    reminders: { title: t('profile_header_reminders', language), icon: 'clock' },
    community: { title: t('community_title', language) || 'المجتمع', icon: 'users' },
  };
  return titles[key] || { title: t('profile_title_fallback', language), icon: 'user' };
};

const getAuthenticContent = (productCount, name, COLORS, language) => {
  const hour = new Date().getHours();
  const firstName = name?.split(' ')[0] || t('header_default_name', language);

  if (productCount === 0) {
    return [
      { text: t('header_empty_1', language), icon: 'door-open', iconColor: COLORS.accentGreen },
      { text: t('header_empty_2', language), icon: 'pen-nib', iconColor: COLORS.textSecondary },
      { text: t('header_empty_3', language), icon: 'hand-holding-heart', iconColor: COLORS.gold },
    ];
  }

  if (productCount > 10) {
    return [
      { text: t('header_crowded_1', language), icon: 'exclamation-circle', iconColor: COLORS.textSecondary },
      { text: t('header_crowded_2', language), icon: 'question', iconColor: COLORS.accentGreen },
      { text: t('header_crowded_3', language), icon: 'gem', iconColor: COLORS.gold },
    ];
  }

  if (hour >= 5 && hour < 12) {
    return [
      { text: interpolate(t('header_morning_1', language), { name: firstName }), icon: 'sun', iconColor: COLORS.gold },
      { text: t('header_morning_2', language), icon: 'search', iconColor: COLORS.textDim },
      { text: t('header_morning_3', language), icon: 'smile-beam', iconColor: COLORS.blue },
    ];
  }

  if (hour >= 18 || hour < 5) {
    return [
      { text: t('header_evening_1', language), icon: 'exclamation-triangle', iconColor: COLORS.danger },
      { text: t('header_evening_2', language), icon: 'star', iconColor: COLORS.blue },
      { text: t('header_evening_3', language), icon: 'tint', iconColor: COLORS.accentGreen },
    ];
  }

  return [
    { text: t('header_general_1', language), icon: 'hand-holding-heart', iconColor: COLORS.accentGreen },
    { text: t('header_general_2', language), icon: 'hourglass-half', iconColor: COLORS.textDim },
    { text: t('header_general_3', language), icon: 'magic', iconColor: COLORS.gold },
  ];
};

const TypewriterTagline = ({ productCount, userName, COLORS, language, isRTL, styles }) => {
  const [displayData, setDisplayData] = useState({ text: '', icon: 'circle', iconColor: COLORS.textDim });
  const [typedText, setTypedText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);

  const typingTimeout = useRef(null);
  const cursorInterval = useRef(null);
  const iconOpacity = useRef(new Animated.Value(1)).current;

  const messages = useMemo(
    () => getAuthenticContent(productCount, userName, COLORS, language),
    [productCount, userName, COLORS, language]
  );

  const startTyping = (messageData) => {
    let i = 0;
    setTypedText('');
    setDisplayData(messageData);

    iconOpacity.setValue(0);
    Animated.timing(iconOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    if (typingTimeout.current) clearInterval(typingTimeout.current);

    typingTimeout.current = setInterval(() => {
      setTypedText(messageData.text.substring(0, i + 1));
      i++;
      if (i === messageData.text.length) clearInterval(typingTimeout.current);
    }, 70);
  };

  useEffect(() => {
    startTyping(messages[0]);

    cursorInterval.current = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);

    return () => {
      if (typingTimeout.current) clearInterval(typingTimeout.current);
      if (cursorInterval.current) clearInterval(cursorInterval.current);
    };
  }, [messages]);

  const handleNextMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.timing(iconOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      const nextIndex = (messageIndex + 1) % messages.length;
      setMessageIndex(nextIndex);
      startTyping(messages[nextIndex]);
    });
  };

  return (
    <Pressable onPress={handleNextMessage} style={styles.taglineContainer}>
      <Animated.View style={[styles.taglineIconBox, { opacity: iconOpacity }]}>
        <FontAwesome5
          name={displayData.icon}
          size={11}
          color={displayData.iconColor || COLORS.accentGreen}
        />
      </Animated.View>

      <View style={styles.taglineTextBox}>
        <Text style={styles.authenticText} numberOfLines={1}>
          {typedText}
          <Text style={[styles.cursor, { opacity: cursorVisible ? 1 : 0 }]}>|</Text>
        </Text>
      </View>
    </Pressable>
  );
};

// --- 5. UNIFIED AUTHENTIC HEADER ---
const AuthenticHeader = ({
  scrollY,
  insets: passedInsets,
  userProfile: propsProfile,
  productCount = 0,
  activeTab = 'shelf',
  title,
  subtitle,
}) => {
  const { colors: COLORS, activeThemeId } = useTheme();
  const { user, userProfile: ctxProfile } = useAppContext();
  const effectiveProfile = propsProfile || ctxProfile;

  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // 🌟 LIVE POINTS FEEDBACK ANIMATIONS
  const avatarShakeAnim = useRef(new Animated.Value(0)).current;
  const pointsPopupAnim = useRef(new Animated.Value(0)).current;
  const [gainedPoints, setGainedPoints] = useState(0);
  const prevPointsRef = useRef(effectiveProfile?.points);

  const triggerAvatarShake = () => {
    avatarShakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(avatarShakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(avatarShakeAnim, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(avatarShakeAnim, { toValue: 0.8, duration: 50, useNativeDriver: true }),
      Animated.timing(avatarShakeAnim, { toValue: -0.8, duration: 50, useNativeDriver: true }),
      Animated.timing(avatarShakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const triggerPointsPopup = (delta) => {
    setGainedPoints(delta);
    pointsPopupAnim.setValue(0);
    Animated.timing(pointsPopupAnim, {
      toValue: 1,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (effectiveProfile?.points !== undefined && prevPointsRef.current !== undefined) {
      const diff = effectiveProfile.points - prevPointsRef.current;
      if (diff > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        triggerAvatarShake();
        triggerPointsPopup(diff);
      }
    }
    prevPointsRef.current = effectiveProfile?.points;
  }, [effectiveProfile?.points]);

  const avatarRotate = avatarShakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-12deg', '0deg', '12deg'],
  });
  const avatarScale = avatarShakeAnim.interpolate({
    inputRange: [-1, -0.5, 0, 0.5, 1],
    outputRange: [1.15, 1.08, 1, 1.08, 1.15],
  });

  const popupTranslateY = pointsPopupAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [4, -8, -28],
  });
  const popupOpacity = pointsPopupAnim.interpolate({
    inputRange: [0, 0.15, 0.75, 1],
    outputRange: [0, 1, 1, 0],
  });
  const popupScale = pointsPopupAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.6, 1.15, 1],
  });

  const fallbackScrollY = useRef(new Animated.Value(0)).current;
  const activeScrollY = scrollY || fallbackScrollY;

  const language = useCurrentLanguage();
  const { isRTL } = useRTL();
  const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);

  const hookInsets = useSafeAreaInsets();
  const safeInsets = passedInsets || hookInsets || { top: 0, bottom: 0, left: 0, right: 0 };
  const topInset = safeInsets?.top ?? 0;

  const isLightTheme = activeThemeId === 'light';
  const { maxHeight, minHeight, scrollDistance } = useMemo(
    () => getHeaderDimensions(topInset),
    [topInset]
  );

  const headerTranslateY = activeScrollY.interpolate({
    inputRange: [0, scrollDistance],
    outputRange: [0, -scrollDistance],
    extrapolate: 'clamp',
  });

  const expandedHeaderOpacity = activeScrollY.interpolate({
    inputRange: [0, scrollDistance * 0.55],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const expandedHeaderTranslate = activeScrollY.interpolate({
    inputRange: [0, scrollDistance * 0.55],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  const collapsedHeaderOpacity = activeScrollY.interpolate({
    inputRange: [scrollDistance * 0.45, scrollDistance],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const collapsedHeaderTranslate = activeScrollY.interpolate({
    inputRange: [scrollDistance * 0.45, scrollDistance],
    outputRange: [10, 0],
    extrapolate: 'clamp',
  });

  const avatarId = effectiveProfile?.settings?.avatarId;
  const userName = effectiveProfile?.settings?.name;
  const firstName = userName?.split(' ')[0] || t('welcome_back_fallback', language);

  const handleOpenProfile = () => {
    Haptics.selectionAsync().catch(() => {});
    setProfileModalVisible(true);
  };

  const currentUid = effectiveProfile?.uid || effectiveProfile?.id || user?.uid;
  const currentUserObj = effectiveProfile ? { ...effectiveProfile, uid: currentUid } : (user ? { uid: user.uid } : null);

  return (
    <>
      <Animated.View
        style={[
          styles.header,
          {
            height: maxHeight,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        {isLightTheme ? (
          <LinearGradient
            colors={[COLORS.background, COLORS.background + 'F2', COLORS.background + '00']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.background }]} />
        )}

        <DrawnBotanicalCrest color={COLORS.accentGreen} />

        {/* 1. EXPANDED HEADER */}
        <Animated.View
          style={[
            styles.headerContentExpanded,
            {
              opacity: expandedHeaderOpacity,
              transform: [{ translateY: expandedHeaderTranslate }],
            },
          ]}
        >
          <View style={{ flex: 1, ...(isRTL ? { paddingRight: 8 } : { paddingLeft: 8 }) }}>
            <Text style={styles.welcomeText} numberOfLines={1}>
              {title ? title : `${t('welcome_back_prefix', language)}، ${firstName}`}
            </Text>
            {subtitle ? (
              <Text style={[styles.authenticText, { marginTop: 2 }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : (
              <TypewriterTagline
                productCount={productCount}
                userName={userName}
                COLORS={COLORS}
                language={language}
                isRTL={isRTL}
                styles={styles}
              />
            )}
          </View>

          {/* Expanded Avatar Container */}
          <TouchableOpacity
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleOpenProfile}
            style={{ position: 'relative' }}
          >
            <Animated.View style={{ transform: [{ rotate: avatarRotate }, { scale: avatarScale }] }}>
              <View
                style={[
                  styles.avatar,
                  !avatarId && {
                    borderColor: COLORS.accentGreen,
                    borderWidth: 2,
                    backgroundColor: COLORS.accentGreen + '33',
                  },
                ]}
              >
                {avatarId ? (
                  <Image source={AVATARS[avatarId]} style={styles.avatarImage} />
                ) : (
                  <Text style={{ fontSize: 20 }}>✨</Text>
                )}
              </View>
            </Animated.View>

            {/* 🌟 1ج FIRST GEN BADGE 🌟 */}
            {effectiveProfile?.isFirstGen && (
              <View style={[styles.firstGenHeaderPin, { borderColor: COLORS.background }]}>
                <LinearGradient
                  colors={['#FDE047', '#F59E0B', '#B45309']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.firstGenHeaderPinGradient}
                >
                  <Text style={styles.firstGenHeaderText}>1ج</Text>
                </LinearGradient>
              </View>
            )}

            {/* 🌟 FLOATING +POINTS POPUP BADGE 🌟 */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.floatingPointsBadge,
                {
                  opacity: popupOpacity,
                  transform: [{ translateY: popupTranslateY }, { scale: popupScale }],
                },
              ]}
            >
              <LinearGradient
                colors={['#FDE047', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.floatingPointsGradient}
              >
                <Text style={styles.floatingPointsText}>+{gainedPoints}</Text>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {/* 2. COLLAPSED COMPACT HEADER */}
        <Animated.View
          style={[
            styles.headerContentCollapsed,
            {
              opacity: collapsedHeaderOpacity,
              height: minHeight,
              paddingTop: topInset,
              transform: [{ translateY: collapsedHeaderTranslate }],
            },
          ]}
        >
          <View style={styles.collapsedContainer}>
            <View style={{ width: 32 }} />

            <View style={styles.collapsedTitleRow}>
              <Text style={styles.collapsedTitle}>
                {title || getHeaderTitle(activeTab, language).title}
              </Text>
              <FontAwesome5
                name={getHeaderTitle(activeTab, language).icon}
                size={12}
                color={COLORS.textSecondary}
              />
            </View>

            {/* Collapsed Avatar Container */}
            <TouchableOpacity
              activeOpacity={0.8}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={handleOpenProfile}
              style={{ position: 'relative' }}
            >
              <Animated.View style={{ transform: [{ rotate: avatarRotate }, { scale: avatarScale }] }}>
                <View
                  style={[
                    styles.collapsedAvatar,
                    !avatarId && {
                      borderColor: COLORS.accentGreen,
                      borderWidth: 1,
                      backgroundColor: COLORS.accentGreen + '33',
                    },
                  ]}
                >
                  {avatarId ? (
                    <Image source={AVATARS[avatarId]} style={styles.collapsedAvatarImage} />
                  ) : (
                    <Text style={{ fontSize: 14 }}>✨</Text>
                  )}
                </View>
              </Animated.View>

              {/* 🌟 1ج FIRST GEN BADGE (COLLAPSED) 🌟 */}
              {effectiveProfile?.isFirstGen && (
                <View style={[styles.firstGenCollapsedPin, { borderColor: COLORS.background }]}>
                  <LinearGradient
                    colors={['#FDE047', '#F59E0B', '#B45309']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.firstGenHeaderPinGradient}
                  >
                    <Text style={styles.firstGenCollapsedText}>1ج</Text>
                  </LinearGradient>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>

      {/* 🌟 EMBEDDED USER PROFILE MODAL 🌟 */}
      <UserProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        targetUserId={currentUid}
        initialData={effectiveProfile}
        currentUser={currentUserObj}
      />
    </>
  );
};

// --- 6. STYLES ---
const createStyles = (COLORS, isRTL) =>
  StyleSheet.create({
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      backgroundColor: COLORS.background,
      overflow: 'hidden',
    },
    headerContentExpanded: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 16,
      zIndex: 10,
    },
    headerContentCollapsed: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingBottom: 12,
      zIndex: 10,
    },
    collapsedContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      height: '100%',
    },
    collapsedTitleRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.surfaceSoft || (COLORS.accentGreen + '12'),
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    collapsedTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 14,
      color: COLORS.textPrimary,
    },
    collapsedAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
    },
    collapsedAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 16,
    },
    welcomeText: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 25,
      color: COLORS.textPrimary,
      textAlign: isRTL ? 'right' : 'left',
    },
    avatar: {
      width: 55,
      height: 55,
      borderRadius: 27.5,
      backgroundColor: COLORS.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 0,
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 27.5,
    },
    firstGenHeaderPin: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      overflow: 'hidden',
    },
    firstGenCollapsedPin: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1,
      overflow: 'hidden',
    },
    firstGenHeaderPinGradient: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    firstGenHeaderText: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 9,
      color: '#FFF',
    },
    firstGenCollapsedText: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 7,
      color: '#FFF',
    },
    floatingPointsBadge: {
      position: 'absolute',
      top: -8,
      right: -10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: COLORS.background,
      overflow: 'hidden',
      zIndex: 99,
      elevation: 6,
      shadowColor: COLORS.gold || '#F59E0B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 4,
    },
    floatingPointsGradient: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    floatingPointsText: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 11,
      color: '#000',
    },
    taglineContainer: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 3,
      minHeight: 22,
      alignSelf: isRTL ? 'flex-end' : 'flex-start',
    },
    taglineTextBox: {
      flexShrink: 1,
      maxWidth: width * 0.62,
      justifyContent: 'center',
    },
    authenticText: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 13,
      color: COLORS.textSecondary,
      textAlign: isRTL ? 'right' : 'left',
      lineHeight: 18,
      includeFontPadding: false,
    },
    cursor: {
      color: COLORS.accentGreen,
      fontFamily: 'Tajawal-Bold',
      fontSize: 13,
    },
    taglineIconBox: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.surfaceSoft || (COLORS.accentGreen + '15'),
      borderRadius: 7,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
  });

export default AuthenticHeader;
