import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { COLORS as DEFAULT_COLORS } from './oilguard.styles';
import { useTheme } from '../../context/ThemeContext';
import PremiumShareButton from './ShareComponent';

// --- SHIMMER SUB-COMPONENT ---
const ShimmerOverlay = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      shimmerAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 2500, // Speed of the shimmer
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.delay(1000), // Wait before next shimmer
        ])
      ).start();
    };
    startAnimation();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150], // Moves from left to right
  });

  return (
    <Animated.View 
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill, 
        { transform: [{ translateX }, { skewX: '-20deg' }] }
      ]}
    >
      <LinearGradient
        colors={[
          'transparent',
          'rgba(255, 255, 255, 0.0)',
          'rgba(255, 255, 255, 0.15)', // The actual "glint"
          'rgba(255, 255, 255, 0.0)',
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
};

const ActionRow = ({ 
  onSave, 
  onReset, 
  analysis, 
  productTypeLabel,
  productName,    
  frontImageUri   
}) => {
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
      <View style={[styles.chamber, styles.chamberSave]}>
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.pressableArea,
            { backgroundColor: pressed ? COLORS.accentGreen + '26' : 'transparent' }
          ]}
        >
          <ShimmerOverlay />
          <View style={styles.buttonContent}>
            <View style={styles.iconContainer}>
              <FontAwesome5 name="bookmark" size={16} color={COLORS.accentGreen} />
            </View>
            <Text style={[styles.triggerText]}>إضافة للرف</Text>
          </View>
        </Pressable>
      </View>

      {/* Small Divider */}
      <View style={styles.divider} />

      {/* 2. SHARE BUTTON */}
      <View style={[styles.chamber, styles.chamberShare]}>
        <ShimmerOverlay />
        <PremiumShareButton
          analysis={analysis}
          productName={productName}
          imageUri={frontImageUri}
          typeLabel={productTypeLabel}
          
          customStyle={{ backgroundColor: 'transparent', borderWidth: 0, padding: 0, width: '100%', height: '100%' }}
          iconSize={16}
          textColor={COLORS.accentGreen}
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
    flexDirection: 'row-reverse', 
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },

  // -- Chambers --
  chamber: {
    height: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Required for shimmer to be contained
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

  pressableArea: {
    width: '100%',
    height: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // -- Content --
  iconContainer: {
    marginLeft: 8,
  },
  divider: {
    width: 1,
    height: '40%', 
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