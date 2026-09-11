import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Easing } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle, Rect, Polygon } from 'react-native-svg';
import { getLocalizedValue } from '../../i18n';
import { useRTL } from '../../hooks/useRTL';


// --- BOTANICAL & CLINICAL SVG ENGINE ---
const SkincareSvgBadge = ({ badgeId, baseColor, size = 56 }) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 56 56',
  };

  switch (badgeId) {
    // =========================================================
    // FIRST GEN — "Origin / Founding"
    // Simple founding seal + origin spark
    // =========================================================
    case 'first_gen':
      return (
        <View style={{ width: size, height: size, margin: 4 }}>
          <Svg {...common}>
            <Defs>
              <SvgLinearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FBBF24" />
                <Stop offset="1" stopColor="#D97706" />
              </SvgLinearGradient>
            </Defs>

            <Circle cx="28" cy="28" r="25" fill="url(#fg)" />
            <Circle
              cx="28"
              cy="28"
              r="20"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              opacity="0.9"
            />

            {/* Origin spark */}
            <Path
              d="M28 13
                 L30.7 22
                 L39 25
                 L30.7 27.7
                 L28 37
                 L25.3 27.7
                 L17 25
                 L25.3 22 Z"
              fill="#FFFFFF"
            />

            {/* Small founding dot */}
            <Circle cx="28" cy="42" r="2" fill="#FFFFFF" opacity="0.9" />
          </Svg>
        </View>
      );

    // =========================================================
    // ROUTINE EXPERT — "AM + PM routine"
    // Sun / moon orbiting one skincare drop
    // =========================================================
    case 'routine_expert':
      return (
        <View style={{ width: size, height: size, margin: 4 }}>
          <Svg {...common}>
            <Defs>
              <SvgLinearGradient id="routine" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#F59E0B" />
                <Stop offset="1" stopColor="#B45309" />
              </SvgLinearGradient>
            </Defs>

            <Circle cx="28" cy="28" r="25" fill="url(#routine)" />

            {/* Orbit */}
            <Circle
              cx="28"
              cy="28"
              r="16"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.7"
              strokeDasharray="3 3"
              opacity="0.8"
            />

            {/* Central skincare drop */}
            <Path
              d="M28 18
                 C28 18 21.5 26.1 21.5 31
                 C21.5 35.1 24.4 38 28 38
                 C31.6 38 34.5 35.1 34.5 31
                 C34.5 26.1 28 18 28 18Z"
              fill="#FFFFFF"
            />

            {/* AM sun */}
            <Circle cx="15" cy="20" r="4" fill="#FFFFFF" />
            <Path
              d="M15 14V12.5M15 27.5V26M9 20H7.5M22.5 20H21M10.7 15.7L9.6 14.6M20.4 25.4L19.3 24.3"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeLinecap="round"
            />

            {/* PM moon */}
            <Path
              d="M42 32
                 A5 5 0 1 1 37 24
                 A4 4 0 1 0 42 32Z"
              fill="#FFFFFF"
            />
          </Svg>
        </View>
      );

    // =========================================================
    // PRODUCT HUNTER — "Find / discover a product"
    // Product + magnifier
    // =========================================================
    case 'product_hunter':
      return (
        <View style={{ width: size, height: size, margin: 4 }}>
          <Svg {...common}>
            <Defs>
              <SvgLinearGradient id="hunter" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#5D8EAD" />
                <Stop offset="1" stopColor="#365D78" />
              </SvgLinearGradient>
            </Defs>

            <Circle cx="28" cy="28" r="25" fill="url(#hunter)" />

            {/* Simple product bottle */}
            <Path
              d="M21 20H30V38
                 C30 39.1 29.1 40 28 40H23
                 C21.9 40 21 39.1 21 38Z"
              fill="#FFFFFF"
            />

            <Rect
              x="22.5"
              y="17"
              width="6"
              height="4"
              rx="1"
              fill="#FFFFFF"
            />

            {/* Magnifying glass */}
            <Circle
              cx="35"
              cy="29"
              r="8"
              fill="#365D78"
              stroke="#FFFFFF"
              strokeWidth="3"
            />

            <Path
              d="M40.5 34.5L46 40"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Discovery glint */}
            <Path
              d="M14 14L15 17L18 18L15 19L14 22L13 19L10 18L13 17Z"
              fill="#FFFFFF"
              opacity="0.95"
            />
          </Svg>
        </View>
      );

    // =========================================================
    // INGREDIENT DECODER — "INCI / formulation"
    // Molecular structure + document
    // =========================================================
    case 'ingredient_decoder':
      return (
        <View style={{ width: size, height: size, margin: 4 }}>
          <Svg {...common}>
            <Defs>
              <SvgLinearGradient id="decoder" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#4BA987" />
                <Stop offset="1" stopColor="#26735B" />
              </SvgLinearGradient>
            </Defs>

            <Circle cx="28" cy="28" r="25" fill="url(#decoder)" />

            {/* INCI sheet */}
            <Path
              d="M15 14H31L37 20V42H15Z"
              fill="#FFFFFF"
              opacity="0.98"
            />

            {/* Fold */}
            <Path
              d="M31 14V20H37"
              fill="none"
              stroke="#26735B"
              strokeWidth="1.8"
            />

            {/* INCI lines */}
            <Path
              d="M19 24H30M19 28H27"
              stroke="#26735B"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Molecule */}
            <Path
              d="M25 34L31 31L36 35"
              fill="none"
              stroke="#26735B"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <Circle cx="25" cy="34" r="2.5" fill="#26735B" />
            <Circle cx="31" cy="31" r="2.5" fill="#26735B" />
            <Circle cx="36" cy="35" r="2.5" fill="#26735B" />
          </Svg>
        </View>
      );

    // =========================================================
    // PRICE TRACKER — "Market / price monitoring"
    // Price tag + upward trend
    // =========================================================
    case 'price_tracker':
      return (
        <View style={{ width: size, height: size, margin: 4 }}>
          <Svg {...common}>
            <Defs>
              <SvgLinearGradient id="price" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#14B8A6" />
                <Stop offset="1" stopColor="#087F73" />
              </SvgLinearGradient>
            </Defs>

            <Circle cx="28" cy="28" r="25" fill="url(#price)" />

            {/* Price tag */}
            <Path
              d="M13 22V32L26 42L40 28L30 15H20Z"
              fill="#FFFFFF"
            />

            {/* Tag hole */}
            <Circle cx="21" cy="21" r="2" fill="#087F73" />

            {/* Price symbol */}
            <Path
              d="M27 23
                 C27 21.5 29 20.5 31 21
                 C33 21.5 34 22.5 34 24
                 C34 27 28 27 28 30
                 C28 32 30 33 32 32.5
                 C34 32 35 31 35 29.5
                 M31 19V35"
              fill="none"
              stroke="#087F73"
              strokeWidth="1.7"
              strokeLinecap="round"
            />

            {/* Market trend */}
            <Path
              d="M36 39L39 36L42 38L46 33"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <Path
              d="M43 33H46V36"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      );

    // =========================================================
    // SPECS ANALYST — "Verified product information"
    // Product dossier + check
    // =========================================================
    case 'specs_analyst':
      return (
        <View style={{ width: size, height: size, margin: 4 }}>
          <Svg {...common}>
            <Defs>
              <SvgLinearGradient id="specs" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#3F9675" />
                <Stop offset="1" stopColor="#23634E" />
              </SvgLinearGradient>
            </Defs>

            <Circle cx="28" cy="28" r="25" fill="url(#specs)" />

            {/* Product dossier */}
            <Path
              d="M15 13H37V40H15Z"
              fill="#FFFFFF"
            />

            {/* Product header */}
            <Rect
              x="19"
              y="17"
              width="10"
              height="3"
              rx="1.5"
              fill="#23634E"
            />

            {/* Spec rows */}
            <Path
              d="M19 25H29M19 30H27M19 35H25"
              stroke="#23634E"
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Verification seal */}
            <Circle cx="35" cy="34" r="7" fill="#23634E" />
            <Path
              d="M31.5 34L34 36.5L38.5 31.5"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      );

    // =========================================================
    // COMMUNITY VOICE — "Community / shared knowledge"
    // Connected conversations
    // =========================================================
    case 'community_voice':
    default:
      return (
        <View style={{ width: size, height: size, margin: 4 }}>
          <Svg {...common}>
            <Defs>
              <SvgLinearGradient id="community" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#5CA487" />
                <Stop offset="1" stopColor="#34745E" />
              </SvgLinearGradient>
            </Defs>

            <Circle cx="28" cy="28" r="25" fill="url(#community)" />

            {/* Connection lines */}
            <Path
              d="M20 31L28 26L37 31"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />

            {/* Left person */}
            <Circle cx="19" cy="24" r="4" fill="#FFFFFF" />
            <Path
              d="M13 35C13 30.5 15.5 28 19 28
                 C22.5 28 25 30.5 25 35Z"
              fill="#FFFFFF"
            />

            {/* Center person */}
            <Circle cx="28" cy="19" r="4.5" fill="#FFFFFF" />
            <Path
              d="M21 34C21 28.5 23.8 25 28 25
                 C32.2 25 35 28.5 35 34Z"
              fill="#FFFFFF"
            />

            {/* Right person */}
            <Circle cx="37" cy="24" r="4" fill="#FFFFFF" />
            <Path
              d="M31 35C31 30.5 33.5 28 37 28
                 C40.5 28 43 30.5 43 35Z"
              fill="#FFFFFF"
            />

            {/* Small conversation mark */}
            <Path
              d="M39 14H45C46.1 14 47 14.9 47 16V19
                 C47 20.1 46.1 21 45 21H43L41 23V21H39
                 C37.9 21 37 20.1 37 19V16
                 C37 14.9 37.9 14 39 14Z"
              fill="#FFFFFF"
              opacity="0.95"
            />
          </Svg>
        </View>
      );
  }
};

// 🌟 SMART FLIP BADGE CARD 🌟
const WathiqBadge = ({ badge, COLORS, language }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    const flipAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(progressAnim, { toValue: badge.progressPercent, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false, delay: 250 }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true, delay: 80 })
        ]).start();
    }, []);

    const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
    const backInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

    const handleFlip = () => {
        const toValue = isFlipped ? 0 : 180;
        Animated.spring(flipAnim, {
            toValue, friction: 8, tension: 50, useNativeDriver: true,
        }).start();
        setIsFlipped(!isFlipped);
    };

    const widthInterpolation = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
    
    const badgeName = getLocalizedValue(badge.name, language);
    const badgeDesc = getLocalizedValue(badge.description, language);
    const badgeColor = badge.color || COLORS.accentGreen;
    const rtl = useRTL();
    const isRTL = rtl.isRTL;

    return (
        <Pressable onPress={handleFlip} style={{ marginEnd: 12 }}>
            <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
                
                {/* --- FRONT OF CARD --- */}
                <Animated.View style={[styles.card, { backgroundColor: COLORS.card, borderColor: COLORS.border, transform: [{ rotateY: frontInterpolate }] }]}>
                    
                    {/* Discrete Flip Indicator */}
                    <View style={[styles.frontInfoCue, { backgroundColor: COLORS.border + '60' }]}>
                        <Feather name="info" size={10} color={COLORS.textDim} />
                    </View>

                    <SkincareSvgBadge badgeId={badge.id} baseColor={badgeColor} size={54} />
                    
                    <View style={[styles.badgeLevelPill, { backgroundColor: badgeColor + '1F', borderColor: badgeColor + '50' }]}>
                        <Text style={[styles.badgeLevelText, { color: badgeColor }]}>Lvl {badge.currentLevel}</Text>
                    </View>

                    <Text style={[styles.badgeTitle, { color: COLORS.textPrimary }]} numberOfLines={1}>{badgeName}</Text>
                    
                    {badge.isMaxed ? (
                        <View style={[styles.maxedPill, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '40' }]}>
                            <FontAwesome5 name="check-circle" size={10} color={badgeColor} />
                            <Text style={[styles.maxedText, { color: badgeColor }]}>{language === 'ar' ? 'مكتمل' : 'MAX'}</Text>
                        </View>
                    ) : (
                        <View style={styles.progressWrap}>
                            <View style={[styles.progressBarTrack, { backgroundColor: COLORS.border }]}>
                                <Animated.View style={[styles.progressBarFill, { width: widthInterpolation, backgroundColor: badgeColor }]} />
                            </View>
                            <Text style={[styles.progressText, { color: COLORS.textDim }]}>
                                {badge.currentScore}/{badge.nextTarget}
                            </Text>
                        </View>
                    )}
                </Animated.View>

                {/* --- BACK OF CARD (EXPANDED EXPLANATION) --- */}
                <Animated.View style={[styles.card, styles.cardBack, { backgroundColor: COLORS.card, borderColor: badgeColor + '70', transform: [{ rotateY: backInterpolate }] }]}>
                    
                    {/* Header */}
                    <View style={[styles.backHeader, { flexDirection: rtl.flexDirection }]}>
                        <Text style={[styles.backTitle, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]} numberOfLines={1}>
    {badgeName}
</Text>
                        <View style={[styles.backLevelBadge, { backgroundColor: badgeColor + '20' }]}>
                            <Text style={[styles.backLevelBadgeText, { color: badgeColor }]}>Lvl {badge.currentLevel}</Text>
                        </View>
                    </View>

                    {/* Enlarged explanation maximizing vertical area */}
                    <View style={styles.backDescContainer}>
                        <Text style={[styles.backDesc, { color: COLORS.textSecondary, textAlign: rtl.textAlign }]}>
                            {badgeDesc}
                        </Text>
                    </View>

                    {/* Footer Target */}
                    <View style={[styles.backFooter, { backgroundColor: COLORS.background, borderColor: COLORS.border }]}>
    <Text style={[styles.backTargetText, { color: badge.isMaxed ? COLORS.gold : badgeColor, textAlign: rtl.textAlign }]}>
        {badge.isMaxed 
            ? (rtl.isRTL ? '🏆 الحد الأقصى مكتمل' : '🏆 Max Level Achieved') 
            : (rtl.isRTL ? `المطلوب للمستوى التالي: ${badge.nextTarget}` : `Next Target: ${badge.nextTarget}`)}
    </Text>
</View>

                </Animated.View>
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: { 
        width: 142, 
        height: 175, // Generous vertical space
    },
    card: { 
        position: 'absolute', 
        width: '100%', 
        height: '100%', 
        borderRadius: 22, 
        padding: 12, 
        borderWidth: 0.5, 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        backfaceVisibility: 'hidden' 
    },
    frontInfoCue: {
        position: 'absolute',
        top: 8,
        left: 8,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    badgeLevelPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 0.8,
        marginTop: -6,
    },
    badgeLevelText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 10 },
    badgeTitle: { fontFamily: 'Tajawal-Bold', fontSize: 13, textAlign: 'center', marginTop: 4 },
    progressWrap: { width: '100%', alignItems: 'center', gap: 4 },
    progressBarTrack: { width: '100%', height: 5, borderRadius: 2.5, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 2.5 },
    progressText: { fontFamily: 'Tajawal-Bold', fontSize: 10 },
    maxedPill: { alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 0.5 },
    maxedText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 10 },

    /* Back Face Styles */
    cardBack: {
        paddingVertical: 14,
        paddingHorizontal: 12,
        justifyContent: 'space-between',
    },
    backHeader: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    backTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 13, flex: 1 },
    backLevelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    backLevelBadgeText: { fontFamily: 'Tajawal-Bold', fontSize: 9 },
    
    backDescContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: 6,
    },
    backDesc: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 13, // Increased font size
        lineHeight: 19, // Generous line height
    },
    
    backFooter: { 
        paddingHorizontal: 8, 
        paddingVertical: 6, 
        borderRadius: 10, 
        width: '100%', 
        alignItems: 'center',
        borderWidth: 0.5,
    },
    backTargetText: { fontFamily: 'Tajawal-Bold', fontSize: 10.5 }
});

export default WathiqBadge;