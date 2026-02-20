import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { COLORS as DEFAULT_COLORS } from './oilguard.styles';
import { useTheme } from '../../context/ThemeContext';
import PremiumShareButton from './ShareComponent';

const ActionRow = ({ onSave, onReset, analysis, productTypeLabel }) => {
  const { colors } = useTheme();
  const COLORS = colors || DEFAULT_COLORS;
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const handleSave = () => {
    Haptics.selectionAsync();
    if (onSave) onSave();
  };

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onReset) onReset();
  };

  return (
    <View style={styles.container}>

      {/* 1. SAVE BUTTON */}
      <Pressable
        onPress={handleSave}
        style={({ pressed }) => [
          styles.chamber,
          styles.chamberSave,
          { backgroundColor: pressed ? COLORS.accentGreen + '26' : 'transparent' }
        ]}
      >
        <View style={styles.iconContainer}>
          <FontAwesome5 name="bookmark" size={16} color={COLORS.accentGreen} />
        </View>
        <Text style={[styles.triggerText]}>إضافة للرف</Text>
      </Pressable>

      {/* Small Divider */}
      <View style={styles.divider} />

      {/* 2. SHARE BUTTON */}
      <View style={[styles.chamber, styles.chamberShare]}>
        <PremiumShareButton
          analysis={analysis}
          typeLabel={productTypeLabel}
          customLabel="انشري الوعي"
          customStyle={{ backgroundColor: 'transparent', borderWidth: 0, padding: 0 }}
          iconSize={16}
          textColor={COLORS.textDim || '#A3B1AC'}
        />
      </View>

      {/* Small Divider */}
      <View style={styles.divider} />

      {/* 3. RESET BUTTON */}
      <Pressable
        onPress={handleReset}
        style={({ pressed }) => [
          styles.chamber,
          styles.chamberReset,
          { backgroundColor: pressed ? 'rgba(255, 255, 255, 0.1)' : 'transparent' }
        ]}
      >
        <FontAwesome5 name="redo" size={15} color={COLORS.textDim || '#A3B1AC'} style={{ opacity: 0.8 }} />
      </Pressable>

    </View>
  );
};

const createStyles = (COLORS) => StyleSheet.create({
  container: {
    width: '100%',
    height: 60,
    flexDirection: 'row-reverse', // RTL
    alignItems: 'center',
    // Top border only to separate from dashboard content
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    // Transparent background
    backgroundColor: 'transparent',
  },

  // -- Chambers --
  chamber: {
    height: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chamberSave: {
    flex: 1.2,
  },
  chamberShare: {
    flex: 1.2,
  },
  chamberReset: {
    width: 60,
  },

  // -- Content --
  iconContainer: {
    marginLeft: 8,
  },
  text: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 13,
    paddingTop: 3,
    textAlign: 'center',
  },
  textAccent: {
    color: COLORS.accentGreen,
  },

  // -- Small Divider --
  divider: {
    width: 1,
    height: '40%', // Short divider
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 1,
  },
  triggerText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 15,
    color: COLORS.accentGreen,
  },
});

export default ActionRow;