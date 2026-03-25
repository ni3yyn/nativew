import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, Dimensions, TouchableOpacity, 
  Animated, Easing, StatusBar, Linking, Platform, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { t } from '../../src/i18n';
import { useCurrentLanguage } from '../../src/hooks/useCurrentLanguage';

const { width, height } = Dimensions.get('window');
const IS_SMALL_DEVICE = height < 700;

// ============================================================================
// 1) Slides (use single accent color from theme)
// ============================================================================
const getSlides = (C, language) => {
  const accent = C.accentGreen || C.primary || C.accent || C.accentGlow || '#5A9C84';

  return [
    {
      id: '1',
      title: t('catintro_slide1_title', language),
      description: t('catintro_slide1_desc', language),
      buttonText: t('catintro_slide1_btn', language),
      icon: 'search-location',
      color: accent,
      bgGradient: [C.background, C.card]
    },
    {
      id: '2',
      title: t('catintro_slide2_title', language),
      description: t('catintro_slide2_desc', language),
      buttonText: t('catintro_slide2_btn', language),
      icon: 'hand-holding-heart',
      color: accent,
      bgGradient: [C.background, C.card]
    },
    {
      id: '3',
      title: t('catintro_slide3_title', language),
      description: t('catintro_slide3_desc', language),
      buttonText: t('catintro_slide3_btn', language),
      icon: 'magic',
      color: accent,
      bgGradient: [C.background, C.card]
    },
    {
      id: '4',
      title: t('catintro_slide4_title', language),
      description: t('catintro_slide4_desc', language),
      buttonText: t('catintro_slide4_btn', language),
      secondaryButton: t('catintro_facebook_btn', language),
      icon: 'crown',
      color: accent,
      bgGradient: [C.background, C.card]
    }
  ];
};

// ============================================================================
// 2) Particle system — based on original RandomSpore / FloatingSpores,
//    but persistent: seeds are created once (useMemo) so rerenders don't restart them.
//    particleModeAnim (0..1) controls morph dot -> heart.
// ============================================================================
const RandomSpore = ({ seed, color, particleModeAnim }) => {
  // movement & fade values (per-particle)
  const moveY = useRef(new Animated.Value(0)).current;
  const moveX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // vertical float (loop)
    const vertical = Animated.sequence([
      Animated.timing(moveY, {
        toValue: - (height * 0.7),
        duration: seed.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(moveY, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      })
    ]);

    // horizontal gentle oscillation loop
    const horizontal = Animated.sequence([
      Animated.timing(moveX, {
        toValue: seed.horiz,
        duration: seed.duration / 2,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(moveX, {
        toValue: -seed.horiz,
        duration: seed.duration / 2,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    ]);

    // opacity breathing
    const breath = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 0.9,
        duration: seed.duration / 4,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.15,
        duration: seed.duration * 3 / 4,
        useNativeDriver: true,
      })
    ]);

    // scale pulse
    const pulse = Animated.sequence([
      Animated.timing(scale, { toValue: 1.12, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      Animated.timing(scale, { toValue: 0.92, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.quad) })
    ]);

    // continuous rotation (gives organic motion)
    const rot = Animated.timing(rotate, {
      toValue: 360,
      duration: seed.rotateDuration,
      easing: Easing.linear,
      useNativeDriver: true
    });

    // start loops (slightly staggered by seed.delay)
    const start = () => {
      setTimeout(() => {
        Animated.loop(Animated.sequence([vertical])).start();
        Animated.loop(horizontal).start();
        Animated.loop(breath).start();
        Animated.loop(pulse).start();
        Animated.loop(rot).start();
      }, seed.delay);
    };

    start();

    // cleanup: stop animations on unmount
    return () => {
      try { moveY.stopAnimation(); } catch (e) {}
      try { moveX.stopAnimation(); } catch (e) {}
      try { opacity.stopAnimation(); } catch (e) {}
      try { scale.stopAnimation(); } catch (e) {}
      try { rotate.stopAnimation(); } catch (e) {}
    };
  }, [seed, moveY, moveX, opacity, scale, rotate]);

  const edgeOpacity = moveY.interpolate({
    inputRange: [-(height * 0.7), -(height * 0.6), -60, 0],
    outputRange: [0, 1, 1, 0], 
    extrapolate: 'clamp'
  });

  const rotateDeg = rotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg']
  });

  const heartOpacity = particleModeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const dotOpacity = particleModeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: seed.x,
        top: seed.y,
        // --- FIX STARTS HERE ---
        width: 30,             // Give the container enough space for the heart
        height: 30,            // so it doesn't clip
        justifyContent: 'center', 
        alignItems: 'center',
        // --- FIX ENDS HERE ---
        transform: [{ translateY: moveY }, { translateX: moveX }, { scale }, { rotate: rotateDeg }],
        opacity: Animated.multiply(opacity, edgeOpacity) 
      }}
      pointerEvents="none"
    >
      <Animated.View
        style={{
          width: seed.size,
          height: seed.size,
          borderRadius: seed.size / 2,
          backgroundColor: color,
          opacity: dotOpacity
        }}
      />
      <Animated.View style={{ position: 'absolute', left: -(seed.size / 1.5), top: -(seed.size / 1.5), opacity: heartOpacity }}>
        <FontAwesome5 name="heart" size={Math.max(8, seed.size + 6)} color={color} solid />
      </Animated.View>
    </Animated.View>
  );
};

const FloatingSpores = ({ count = 25, color, particleModeAnim }) => {
  const seeds = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      x: Math.random() * width,
      // START FROM HALF SCREEN:
      // We start them between 40% and 60% of the screen height 
      // so they don't all appear on a single perfectly straight line.
      y: (height * 0.45) + (Math.random() * (height * 0.2)), 
      size: 3 + Math.random() * 6,
      duration: 6000 + Math.random() * 8000, // Slower for smoother feel
      delay: Math.random() * 3000,
      horiz: 10 + Math.random() * 60,
      rotateDuration: 4000 + Math.random() * 6000
    }));
  }, [count]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {seeds.map((seed, i) => (
        <RandomSpore key={i} seed={seed} color={color} particleModeAnim={particleModeAnim} />
      ))}
    </View>
  );
};

// ============================================================================
// 3) Magical Icon (no circle, no background behind icons)
// ============================================================================
const MagicalIcon = ({ icon, color }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -15, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    ).start();
  }, []);

  return (
    <View style={styles.graphicContainer}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <FontAwesome5 name={icon} size={IS_SMALL_DEVICE ? 70 : 90} color={color}  />
      </Animated.View>
    </View>
  );
};

// ============================================================================
// 4) Main component — built from your original file, with:
//    - single theme accent color
//    - persistent particles (FloatingSpores rendered once globally)
//    - particleModeAnim animated to 1 when currentIndex===1
//    - buttons & pagination moved into renderItem and animated by scrollX
// ============================================================================
export default function CatalogIntro({ visible, onFinish }) {
  const language = useCurrentLanguage();
  const { colors: C, activeThemeId } = useTheme();
  const SLIDES = getSlides(C, language);

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // control particle morphing (dot -> heart)
  const particleModeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // animate particleModeAnim to 1 on slide index 1, else to 0
    if (currentIndex === 1) {
      Animated.timing(particleModeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(particleModeAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true
      }).start();
    }
  }, [currentIndex]);

  const statusBarStyle = activeThemeId === 'baby_pink' ? 'dark-content' : 'light-content';

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      onFinish();
    }
  };

  const renderItem = ({ item, index }) => {
    // interpolation input range for this slide
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    // text entrance parallax
    const textTranslate = scrollX.interpolate({ inputRange, outputRange: [50, 0, -50] });
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0] });

    // buttons animate in sync with slide: slide-up + fade
    const buttonTranslate = scrollX.interpolate({ inputRange, outputRange: [40, 0, -40], extrapolate: 'clamp' });
    const buttonOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });

    // pagination: dot sizes/opacity based on global scrollX (keeps original behavior)
    const dots = SLIDES.map((_, i) => {
      const dotInput = [(i - 1) * width, i * width, (i + 1) * width];
      const dotWidth = scrollX.interpolate({ inputRange: dotInput, outputRange: [8, 24, 8], extrapolate: 'clamp' });
      const dotOpacity = scrollX.interpolate({ inputRange: dotInput, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
      return { dotWidth, dotOpacity, color: SLIDES[i].color };
    });

    return (
      <View style={styles.slideContainer}>
        {/* Graphic */}
        <View style={styles.topSection}>
          <MagicalIcon icon={item.icon} color={item.color} />
        </View>

        {/* Text */}
        <Animated.View style={[styles.textSection, { opacity, transform: [{ translateX: textTranslate }] }]}>
          <Text style={[styles.title, { color: C.textPrimary }]}>{item.title}</Text>
          <View style={[styles.divider, { backgroundColor: item.color }]} />
          <Text style={[styles.description, { color: C.textSecondary }]}>{item.description}</Text>
        </Animated.View>

        {/* Buttons & Pagination — part of slide so they animate with content */}
        <Animated.View style={[styles.slideFooter, { transform: [{ translateY: buttonTranslate }], opacity: buttonOpacity }]}>
          {/* Pagination */}
          <View style={styles.pagination}>
            {dots.map((d, di) => (
              <Animated.View key={di} style={[styles.dot, { width: d.dotWidth, opacity: d.dotOpacity, backgroundColor: d.color }]} />
            ))}
          </View>

          {/* Buttons */}
          <View style={styles.buttonWrapper}>
            {index === SLIDES.length - 1 && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: C.border, backgroundColor: C.card }]}
                onPress={() => Linking.openURL('https://facebook.com/wathiqapp')}
                activeOpacity={0.92}
              >
                <MaterialCommunityIcons name="facebook" size={20} color={C.textPrimary} />
                <Text style={[styles.secondaryBtnText, { color: C.textPrimary }]}>{item.secondaryButton}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, { shadowColor: item.color }]}
              onPress={handleNext}
              activeOpacity={0.92}
            >
              <LinearGradient colors={[item.color, item.color]} style={[styles.primaryBtnGradient, { borderColor: C.border }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={[styles.primaryBtnText, { color: C.textOnAccent }]}>{item.buttonText}</Text>

                {index === SLIDES.length - 1 ? (
                  <Ionicons name="sparkles" size={20} color={C.textOnAccent} />
                ) : (
                  <Ionicons name="arrow-back" size={22} color={C.textOnAccent} style={{ opacity: 0.9 }} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.container, { backgroundColor: C.background }]}>
        <StatusBar barStyle={statusBarStyle} backgroundColor="transparent" translucent />

        {/* Background Gradients for each slide (original behavior) */}
        <View style={StyleSheet.absoluteFill}>
          {SLIDES.map((slide, i) => {
            const opacity = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [0, 1, 0],
              extrapolate: 'clamp'
            });
            return (
              <Animated.View key={i} style={[StyleSheet.absoluteFill, { opacity }]}>
                <LinearGradient colors={slide.bgGradient} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
                <View style={[styles.noiseOverlay, { backgroundColor: C.textPrimary + '05' }]} />
              </Animated.View>
            );
          })}
        </View>

        {/* Global particle layer — permanent, independent from slides */}
        <FloatingSpores count={28} color={C.accentGlow || C.textPrimary} particleModeAnim={particleModeAnim} />

        <SafeAreaView style={{ flex: 1 }}>
          {/* Header (no background behind skip; removed any circle) */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => onFinish()} style={[styles.skipBtn]}>
              <Text style={[styles.skipText, { color: C.textDim }]}>{t('community_intro_skip', language)}</Text>
            </TouchableOpacity>
          </View>

          {/* Slides (FlatList) */}
          <Animated.FlatList
            ref={flatListRef}
            data={SLIDES}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(ev) => {
              const newIndex = Math.round(ev.nativeEvent.contentOffset.x / width);
              setCurrentIndex(newIndex);
            }}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ============================================================================
// Styles (kept close to original, but added slideFooter which sits naturally
// after text so buttons won't cover content; layout responsive to width/height)
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },

  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    zIndex: 0,
  },

  header: {
    flexDirection: 'row',
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    height: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
  },
  skipText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 13,
  },

  // Layout
  slideContainer: {
    width,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
    justifyContent: 'flex-start'
  },
  topSection: {
    flex: 0.56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 40,
  },
  textSection: {
    flex: 0.32,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingTop: 12,
  },

  // --- MAGICAL GRAPHICS ---
  graphicContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: width * 0.9,
    padding: 50,
    height: width * 0.9,
    overflow: 'visible',
  },

  // Typography
  title: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: width * 0.08,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: width * 0.12,
  },
  divider: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 18,
    opacity: 0.9,
  },
  description: {
    fontFamily: 'Tajawal-Regular',
    fontSize: width * 0.045,
    textAlign: 'center',
    lineHeight: width * 0.075,
    paddingHorizontal: 8
  },

  // Slide footer (pagination + buttons) — part of each slide's flow
  slideFooter: {
    width: '100%',
    paddingHorizontal: 30,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 26,
    // keep it inside the natural flow — no absolute positioning to avoid covering text
  },

  pagination: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    height: 20,
  },

  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },

  buttonWrapper: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnGradient: {
    flexDirection: 'row-reverse',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  primaryBtnText: {
    fontSize: 18,
    fontFamily: 'Tajawal-Bold',
    letterSpacing: 0.4,
  },
  secondaryBtn: {
    flexDirection: 'row-reverse',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Tajawal-Bold',
  },
});