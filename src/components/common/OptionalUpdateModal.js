import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
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
 * OptionalUpdateModal (Independent Modal Component)
 * Fully powered by ThemeContext (`useTheme()`) for dynamic theme switching,
 * displaying optional new versions and release notes from `changelog`.
 */
const OptionalUpdateModal = ({
  visible,
  changelog,
  latestVersion,
  onUpdate,
  onSkip,
  language: propLanguage,
}) => {
  const { colors, theme } = useTheme();
  const COLORS = colors || DEFAULT_COLORS;

  const context = useAppContext?.() || {};
  const currentLang = useCurrentLanguage?.();

  const language = normalizeLanguage(
    propLanguage || currentLang || context.userProfile?.settings?.language || 'ar'
  );
  const versionNum = latestVersion || context.appConfig?.latestVersion || '';
  const changelogList =
    changelog !== undefined ? changelog : context.appConfig?.changelog || [];

  const isRTL = language === 'ar';

  const styles = useMemo(
    () => createStyles(COLORS, theme, isRTL),
    [COLORS, theme, isRTL]
  );

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

  const handleUpdatePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (onUpdate) onUpdate();
  };

  const handleSkipPress = () => {
    if (onSkip) onSkip();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleSkipPress}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Top Hero: Gift Icon (bare, no container) */}
          <Feather
            name="gift"
            size={38}
            color={COLORS.accentGreen || COLORS.primary}
            style={styles.heroIcon}
          />

          {/* Version Badge Pill (if available) */}
          {versionNum ? (
            <View style={styles.versionBadge}>
              <View style={styles.versionDot} />
              <Text style={styles.versionText}>
                {isRTL ? `الإصدار ${versionNum}` : `v${versionNum}`}
              </Text>
            </View>
          ) : null}

          {/* Title & Subtitle */}
          <Text style={styles.modalTitle}>
            {t('optional_update_title', language)}
          </Text>
          <Text style={styles.modalSubtitle}>
            {t('optional_update_subtitle', language)}
          </Text>

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

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            <Pressable
              style={({ pressed }) => [
                styles.updateButtonPressable,
                pressed && styles.updateButtonPressed,
              ]}
              onPress={handleUpdatePress}
            >
              <LinearGradient
                colors={buttonGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.updateButtonGradient}
              >
                <Feather
                  name="download-cloud"
                  size={18}
                  color={COLORS.textOnAccent || '#FFFFFF'}
                />
                <Text style={styles.updateButtonText}>
                  {t('optional_update_action', language)}
                </Text>
                <Feather
                  name={isRTL ? 'chevron-left' : 'chevron-right'}
                  size={16}
                  color={COLORS.textOnAccent || '#FFFFFF'}
                  style={styles.buttonChevron}
                />
              </LinearGradient>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.skipButtonPressable,
                pressed && { opacity: 0.7 },
              ]}
              onPress={handleSkipPress}
            >
              <Text style={styles.skipButtonText}>
                {t('optional_update_skip', language)}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default OptionalUpdateModal;

const createStyles = (COLORS, theme, isRTL) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    modalCard: {
      width: '100%',
      maxWidth: Math.min(width * 0.9, 360),
      backgroundColor: COLORS.card,
      borderRadius: 24,
      padding: 22,
      paddingTop: 24,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme?.isDark ? 0.45 : 0.15,
      shadowRadius: 20,
      elevation: 10,
    },

    /* ---------------- Hero ---------------- */
    heroIcon: {
      marginBottom: 14,
    },
    versionBadge: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 16,
      backgroundColor: COLORS.inputBg || 'rgba(0,0,0,0.12)',
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
    modalTitle: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 22,
      color: COLORS.textPrimary,
      textAlign: 'center',
      marginBottom: 6,
      lineHeight: 29,
    },
    modalSubtitle: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 14,
      color: COLORS.textSecondary,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 16,
      paddingHorizontal: 8,
    },

    /* ---------------- Changelog Card ---------------- */
    changelogCard: {
      width: '100%',
      // Semi-transparent container, no shadow
      backgroundColor: theme?.isDark
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(0, 0, 0, 0.04)',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingTop: 14,
      paddingBottom: 10,
      paddingHorizontal: 14,
      marginBottom: 18,
      maxHeight: 200,
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
      fontSize: 16,
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
      flexGrow: 0,
    },
    changelogContent: {
      gap: 12,
      paddingVertical: 2,
      paddingBottom: 4,
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
      borderRadius: 14,
      overflow: 'hidden',
      shadowColor: COLORS.primary || COLORS.accentGreen || '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 5,
    },
    updateButtonPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.92,
    },
    updateButtonGradient: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      paddingVertical: 13,
      paddingHorizontal: 18,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    updateButtonText: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 15,
      color: COLORS.textOnAccent || '#FFFFFF',
      flex: 1,
      textAlign: 'center',
    },
    buttonChevron: {
      opacity: 0.9,
    },
    skipButtonPressable: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipButtonText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 13.5,
      color: COLORS.textDim || COLORS.textSecondary,
    },
  });
