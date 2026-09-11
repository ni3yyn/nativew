// --- START OF FILE WelcomeScreen.js ---

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Dimensions, KeyboardAvoidingView, Platform, ScrollView,
  Animated, Easing, StatusBar, Keyboard, Image
} from 'react-native';

import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import AppTextInput from '../../src/components/common/AppTextInput';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppContext } from '../../src/context/AppContext';
import { useTheme } from '../../src/context/ThemeContext';
import { AVATARS } from '../../src/constants/avatars';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertService } from '../../src/services/alertService';
import { t, getLocalizedValue, interpolate } from '../../src/i18n';
import { useCurrentLanguage } from '../../src/hooks/useCurrentLanguage';
import {
  basicSkinTypes,
  basicScalpTypes,
  commonConditions,
  commonAllergies,
} from '../../src/data/allergiesandconditions';
import { AvatarSelectionModal } from '../../src/components/profile/AvatarSelectionModal';

const { width, height } = Dimensions.get('window');

// --- DEFAULT FALLBACK THEME ---
const DEFAULT_COLORS = {
  background: '#1A2D27',
  card: '#253D34',
  border: 'rgba(90, 156, 132, 0.25)',
  textDim: '#82948E',
  accentGreen: '#5A9C84',
  primary: '#5A9C84',
  textPrimary: '#F1F3F2',
  textSecondary: '#A8B8B3',
  textOnAccent: '#1A2D27',
  danger: '#EF4444',
  surfaceGreen: 'rgba(90, 156, 132, 0.22)',
};

// --- DATA CONSTANTS ---
const SKIN_OPTIONS = basicSkinTypes.map((item) => ({
  ...item,
  icon: item.id === 'oily' ? 'tint' : item.id === 'dry' ? 'leaf' : item.id === 'combo' ? 'adjust' : 'smile',
}));

const SCALP_OPTIONS = basicScalpTypes.map((item) => ({
  ...item,
  icon: item.id === 'normal' ? 'user' : item.id === 'dry' ? 'leaf' : 'tint',
}));

const GOALS_LIST = [
    { id: 'acne', name: { ar: 'مكافحة حب الشباب', en: 'Acne control' }, desc: { ar: 'التخلص من البثور وآثارها', en: 'Reduce breakouts and marks' } },
    { id: 'anti_aging', name: { ar: 'مكافحة الشيخوخة', en: 'Anti-aging' }, desc: { ar: 'تقليل التجاعيد والخطوط الدقيقة', en: 'Reduce fine lines and wrinkles' } },
    { id: 'brightening', name: { ar: 'نضارة وتفتيح', en: 'Brightening' }, desc: { ar: 'توحيد لون البشرة وإزالة التصبغات', en: 'Even tone and reduce pigmentation' } },
    { id: 'hydration', name: { ar: 'ترطيب عميق', en: 'Deep hydration' }, desc: { ar: 'علاج الجفاف وتقوية حاجز البشرة', en: 'Treat dryness and support skin barrier' } },
    { id: 'texture_pores', name: { ar: 'تحسين الملمس', en: 'Texture improvement' }, desc: { ar: 'تضييق المسام وتنعيم البشرة', en: 'Refine pores and smooth texture' } },
    { id: 'hair_growth', name: { ar: 'تكثيف الشعر', en: 'Hair density' }, desc: { ar: 'علاج التساقط وزيادة الكثافة', en: 'Help with shedding and density' } },
];

const CONDITIONS_LIST = commonConditions;
const ALLERGIES_LIST = commonAllergies;

const getStepConfig = (gender, language) => {
  const isFemale = gender === 'أنثى';
  return [
    { id: 'gender', title: t('onboarding_step_gender_title', language), subtitle: t('onboarding_step_gender_subtitle', language), type: 'single' },
    { id: 'name', title: t(isFemale ? 'onboarding_step_name_title_female' : 'onboarding_step_name_title_male', language), subtitle: t(isFemale ? 'onboarding_step_name_subtitle_female' : 'onboarding_step_name_subtitle_male', language), type: 'input' },
    { id: 'skin', title: t(isFemale ? 'onboarding_step_skin_title_female' : 'onboarding_step_skin_title_male', language), subtitle: t(isFemale ? 'onboarding_step_skin_subtitle_female' : 'onboarding_step_skin_subtitle_male', language), type: 'single' },
    { id: 'scalp', title: t(isFemale ? 'onboarding_step_scalp_title_female' : 'onboarding_step_scalp_title_male', language), subtitle: t(isFemale ? 'onboarding_step_scalp_subtitle_female' : 'onboarding_step_scalp_subtitle_male', language), type: 'single' },
    { id: 'goals', title: t('onboarding_step_goals_title', language), subtitle: t(isFemale ? 'onboarding_step_goals_subtitle_female' : 'onboarding_step_goals_subtitle_male', language), type: 'multi' },
    { id: 'conditions', title: t('onboarding_step_conditions_title', language), subtitle: t(isFemale ? 'onboarding_step_conditions_subtitle_female' : 'onboarding_step_conditions_subtitle_male', language), type: 'multi' },
    { id: 'allergies', title: t(isFemale ? 'onboarding_step_allergies_title_female' : 'onboarding_step_allergies_title_male', language), subtitle: t(isFemale ? 'onboarding_step_allergies_subtitle_female' : 'onboarding_step_allergies_subtitle_male', language), type: 'multi' },
    { id: 'finish', title: t(isFemale ? 'onboarding_step_finish_title_female' : 'onboarding_step_finish_title_male', language), subtitle: t(isFemale ? 'onboarding_step_finish_subtitle_female' : 'onboarding_step_finish_subtitle_male', language), type: 'action' },
  ];
};

// --- COMPONENT: PARTICLES ---
const Spore = ({ size, startX, duration, delay, color }) => {
  const animY = useRef(new Animated.Value(0)).current;
  const animX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
      Animated.timing(scale, { toValue: 1, duration: 1000, delay, useNativeDriver: true }).start();
      const floatLoop = Animated.loop(Animated.timing(animY, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
      const driftLoop = Animated.loop(Animated.sequence([
          Animated.timing(animX, { toValue: 1, duration: duration * 0.33, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(animX, { toValue: -1, duration: duration * 0.33, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(animX, { toValue: 0, duration: duration * 0.34, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]));

      const timeout = setTimeout(() => { floatLoop.start(); driftLoop.start(); }, delay);
      return () => { clearTimeout(timeout); floatLoop.stop(); driftLoop.stop(); };
  }, []);

  const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [height + 50, -100] });
  const translateX = animX.interpolate({ inputRange: [-1, 1], outputRange: [-30, 30] });

  return (
      <Animated.View
          pointerEvents="none"
          style={{
              position: 'absolute', left: startX, width: size, height: size,
              borderRadius: size / 2, backgroundColor: color,
              transform: [{ translateY }, { translateX }, { scale }],
              opacity: 0.35, zIndex: 0,
          }}
      />
  );
};

// --- COMPONENT: SQUARE OPTION ---
const SquareOption = ({ label, icon, selected, onPress, index, COLORS, styles }) => {
    const scale = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.spring(scale, { toValue: 1, friction: 8, delay: 60 + (index * 40), useNativeDriver: true }).start(); }, []);

    return (
        <Animated.View style={{ transform: [{ scale }], width: '47%', aspectRatio: 1.05, marginBottom: 14 }}>
            <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }} 
                style={[styles.squareCard, selected && styles.cardSelected]}
            >
                <View style={[styles.iconContainer, selected && { backgroundColor: COLORS.accentGreen }]}>
                    <FontAwesome5 name={icon} size={22} color={selected ? COLORS.textOnAccent : COLORS.primary} />
                </View>
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {label}
                </Text>
                {selected && (
                    <View style={styles.checkBadge}>
                        <FontAwesome5 name="check" size={9} color={COLORS.textOnAccent} />
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

// --- COMPONENT: ROW OPTION ---
const RowOption = ({ label, selected, onPress, index, category, description, language, COLORS, styles }) => {
    const slide = useRef(new Animated.Value(30)).current;
    const fade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slide, { toValue: 0, duration: 250, delay: 50 + (index * 35), useNativeDriver: true }),
            Animated.timing(fade, { toValue: 1, duration: 250, delay: 50 + (index * 35), useNativeDriver: true })
        ]).start();
    }, []);

    const catMap = {
      skin_concern: t('onboarding_category_skin', language),
      scalp_concern: t('onboarding_category_scalp', language),
      health: t('onboarding_category_health', language),
    };
    const subText = description || (category ? catMap[category] : null);
    const isRTL = language === 'ar';

    return (
        <Animated.View style={{ transform: [{ translateX: slide }], opacity: fade, marginBottom: 10 }}>
            <TouchableOpacity 
                activeOpacity={0.75} 
                onPress={() => { Haptics.selectionAsync(); onPress(); }} 
                style={[styles.rowInner, selected && styles.rowSelected]}
            >
                <View style={[
                    styles.checkbox, 
                    selected && { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen },
                    isRTL ? { marginLeft: 14 } : { marginRight: 14 }
                ]}>
                    {selected && <FontAwesome5 name="check" size={10} color={COLORS.textOnAccent} />}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[
                        styles.rowText, 
                        selected && { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold' },
                        { textAlign: isRTL ? 'right' : 'left' }
                    ]}>
                        {label}
                    </Text>
                    {subText && (
                        <Text style={[
                            styles.rowSub, 
                            selected && { color: COLORS.primary },
                            { textAlign: isRTL ? 'right' : 'left' }
                        ]}>
                            {subText}
                        </Text>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// --- MAIN SCREEN ---
export default function WelcomeScreen() {
  const { user } = useAppContext();
  const { theme, colors } = useTheme();
  const COLORS = colors || DEFAULT_COLORS;
  const isDark = theme ? theme.isDark : true;
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);

  const language = useCurrentLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const isRTL = language === 'ar';
  const hasShownAlert = useRef(false);

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTransX = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // --- Modal & Error States ---
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showNameError, setShowNameError] = useState(false);
  const errorFadeAnim = useRef(new Animated.Value(0)).current;

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    avatarId: '1',
    gender: '',
    skinType: '',
    scalpType: '',
    goals: [],
    conditions: [],
    allergies: []
  });

  const STEPS = useMemo(() => getStepConfig(formData.gender, language), [formData.gender, language]);
  
  const particles = useMemo(() => [...Array(20)].map((_, i) => ({
    id: i,
    size: Math.random() * 6 + 2,
    startX: Math.random() * width,
    duration: 10000 + Math.random() * 8000,
    delay: Math.random() * 5000
  })), []);

  const bgGradientColors = useMemo(() => {
    if (isDark) {
      return ['#172a22', COLORS.background, '#080d0a'];
    }
    return [
      COLORS.background,
      COLORS.surfaceGreen || '#DCEFE5',
      COLORS.background,
    ];
  }, [isDark, COLORS]);

  useEffect(() => {
    if (params.reason === 'repair' && !hasShownAlert.current) {
        hasShownAlert.current = true;
        setTimeout(() => {
            AlertService.show({
                title: t('onboarding_repair_title', language),
                message: t('onboarding_repair_message', language),
                type: 'info',
                buttons: [{ text: t('onboarding_ok', language), style: "primary" }]
            });
        }, 500);
    }
  }, [params, language]);

  useEffect(() => {
      Animated.timing(progressAnim, {
          toValue: (currentStep + 1) / STEPS.length,
          duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false
      }).start();
  }, [currentStep]);

  useEffect(() => {
    Animated.timing(errorFadeAnim, {
        toValue: showNameError ? 1 : 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
    }).start();
  }, [showNameError]);

  const changeStep = (dir) => {
      const next = currentStep + dir;
      if (next < 0 || next >= STEPS.length) {
          if (next >= STEPS.length) finishOnboarding();
          return;
      }

      setShowNameError(false);

      Animated.parallel([
          Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
          Animated.timing(contentTransX, { toValue: dir > 0 ? -30 : 30, duration: 150, useNativeDriver: true })
      ]).start(() => {
          setCurrentStep(next);
          contentTransX.setValue(dir > 0 ? 30 : -30);

          setTimeout(() => {
              Animated.parallel([
                Animated.timing(contentOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(contentTransX, { toValue: 0, friction: 7, tension: 45, useNativeDriver: true })
              ]).start();
          }, 30);
      });
  };

  const handleNextStep = () => {
    Keyboard.dismiss();

    if (STEPS[currentStep].id === 'name') {
        const name = formData.name.trim();
        if (name.length < 4) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setShowNameError(true);
            return;
        }
    }
    changeStep(1);
  };

  const handleSingleSelect = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      setTimeout(() => changeStep(1), 300);
  };

  const toggleMulti = (field, value) => {
      setFormData(prev => {
          const list = prev[field] || [];
          return list.includes(value) ? { ...prev, [field]: list.filter(i => i !== value) } : { ...prev, [field]: [...list, value] };
      });
  };

  const finishOnboarding = async () => {
    if (!user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    try {
        await updateDoc(doc(db, 'profiles', user.uid), { settings: formData, onboardingComplete: true });
        router.replace('/profile');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const renderContent = () => {
      switch(currentStep) {
          case 0: return (
              <View style={styles.gridCenter}>
                  <SquareOption index={0} label={t('onboarding_gender_female', language)} icon="venus" selected={formData.gender === 'أنثى'} onPress={() => handleSingleSelect('gender', 'أنثى')} COLORS={COLORS} styles={styles} />
                  <SquareOption index={1} label={t('onboarding_gender_male', language)} icon="mars" selected={formData.gender === 'ذكر'} onPress={() => handleSingleSelect('gender', 'ذكر')} COLORS={COLORS} styles={styles} />
              </View>
          );
          case 1: return (
              <View style={styles.nameContainer}>
                  {/* 🌟 HERO AVATAR SPOTLIGHT (TRANSPARENT BACKGROUND) 🌟 */}
                  <View style={styles.heroAvatarContainer}>
                      <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => {
                              Keyboard.dismiss();
                              Haptics.selectionAsync();
                              setShowAvatarModal(true);
                          }}
                          style={styles.heroAvatarTouchable}
                      >
                          <View style={[styles.heroAvatarGlow, { borderColor: COLORS.accentGreen }]} />
                          <View style={[styles.heroAvatarCircle, { borderColor: COLORS.accentGreen }]}>
                              <Image
                                  source={AVATARS[formData.avatarId] || AVATARS['1']}
                                  style={styles.heroAvatarImg}
                              />
                          </View>
                          <View style={[styles.heroAvatarBadge, { backgroundColor: COLORS.accentGreen, borderColor: COLORS.background }]}>
                              <FontAwesome5 name="pen" size={9} color={COLORS.textOnAccent} />
                          </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                          onPress={() => {
                              Keyboard.dismiss();
                              setShowAvatarModal(true);
                          }}
                          hitSlop={8}
                      >
                          <Text style={[styles.avatarSectionLabel, { color: COLORS.textSecondary }]}>
                              {t('onboarding_avatar_select', language)}
                          </Text>
                      </TouchableOpacity>
                  </View>

                  {/* Name Input Section */}
                  <View style={styles.nameInputSection}>
                      <View style={[styles.inputWrapper, showNameError && { borderColor: COLORS.danger }]}>
                          <AppTextInput
                            style={[styles.bigInput, showNameError && { color: COLORS.danger }]}
                            placeholder={t('onboarding_name_placeholder', language)}
                            placeholderTextColor={COLORS.textDim}
                            value={formData.name}
                            onChangeText={t => {
                                setFormData({...formData, name: t});
                                if (t.trim().length >= 4) setShowNameError(false);
                            }}
                            textAlign="center"
                            autoFocus={false}
                            returnKeyType="done"
                            onSubmitEditing={handleNextStep}
                            selectionColor={COLORS.accentGreen}
                          />
                      </View>

                      <Animated.View style={{
                          height: errorFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 26] }),
                          opacity: errorFadeAnim,
                          overflow: 'hidden',
                          justifyContent: 'center',
                      }}>
                          <Text style={styles.errorText}>{t('onboarding_name_error', language)}</Text>
                      </Animated.View>
                      <Text style={styles.inputHint}>{t('onboarding_name_hint', language)}</Text>
                  </View>
              </View>
          );
          case 2: return (
              <View style={styles.gridContainer}>
                  {SKIN_OPTIONS.map((item, i) => <SquareOption index={i} key={item.id} label={getLocalizedValue(item.label, language)} icon={item.icon} selected={formData.skinType === item.id} onPress={() => handleSingleSelect('skinType', item.id)} COLORS={COLORS} styles={styles} />)}
              </View>
          );
          case 3: return (
              <View style={styles.gridContainer}>
                  {SCALP_OPTIONS.map((item, i) => <SquareOption index={i} key={item.id} label={getLocalizedValue(item.label, language)} icon={item.icon} selected={formData.scalpType === item.id} onPress={() => handleSingleSelect('scalpType', item.id)} COLORS={COLORS} styles={styles} />)}
              </View>
          );
          case 4: return (
              <View style={styles.listContainer}>
                  {GOALS_LIST.map((g, i) => (
                      <RowOption
                        index={i}
                        key={g.id}
                        label={getLocalizedValue(g.name, language)}
                        description={getLocalizedValue(g.desc, language)}
                        selected={formData.goals.includes(g.id)}
                        onPress={() => toggleMulti('goals', g.id)}
                        language={language}
                        COLORS={COLORS}
                        styles={styles}
                      />
                  ))}
              </View>
          );
          case 5: return (
              <View style={styles.listContainer}>
                  {CONDITIONS_LIST.map((c, i) => <RowOption index={i} key={c.id} label={getLocalizedValue(c.name, language)} category={c.category} selected={formData.conditions.includes(c.id)} onPress={() => toggleMulti('conditions', c.id)} language={language} COLORS={COLORS} styles={styles} />)}
              </View>
          );
          case 6: return (
              <View style={styles.listContainer}>
                  {ALLERGIES_LIST.map((a, i) => <RowOption index={i} key={a.id} label={getLocalizedValue(a.name, language)} selected={formData.allergies.includes(a.id)} onPress={() => toggleMulti('allergies', a.id)} language={language} COLORS={COLORS} styles={styles} />)}
              </View>
          );
          case 7: return (
              <View style={styles.centerFlex}>
                  <View style={styles.successIcon}>
                      <FontAwesome5 name="check" size={45} color={COLORS.textOnAccent} />
                  </View>
              </View>
          );
      }
  };

  const isNextEnabled = () => {
      if (currentStep === 1 && formData.name.trim().length === 0) return false;
      return true;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      
      {/* Dynamic Theme Gradient */}
      <LinearGradient 
        colors={bgGradientColors} 
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {particles.map(p => <Spore key={p.id} {...p} color={COLORS.accentGreen} />)}

      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
      >
        <View style={[styles.safeArea, { paddingTop: 20 + insets.top, paddingBottom: 15 + insets.bottom }]}>

          {/* Static Progress Bar */}
          <View style={styles.progressContainer}>
            <Text style={[styles.stepCounter, { textAlign: isRTL ? 'right' : 'left' }]}>
              {interpolate(t('onboarding_step_counter', language), { current: currentStep + 1, total: STEPS.length })}
            </Text>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
            </View>
          </View>

          {/* Scrollable Content */}
          <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateX: contentTransX }] }}>
              <ScrollView
                  key={currentStep}
                  contentContainerStyle={{
                      flexGrow: 1,
                      paddingBottom: 20,
                      justifyContent: currentStep === 1 || currentStep === 7 ? 'center' : 'flex-start'
                  }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
              >
                  {/* Header Text */}
                  <View style={styles.headerTextContainer}>
                      <Text style={styles.title}>{STEPS[currentStep]?.title}</Text>
                      <Text style={styles.subtitle}>{STEPS[currentStep]?.subtitle}</Text>
                  </View>

                  {renderContent()}
              </ScrollView>
          </Animated.View>

          {/* Fixed Footer Buttons */}
          <View style={styles.fixedFooter}>
              {currentStep > 0 ? (
                  <TouchableOpacity 
                      onPress={() => changeStep(-1)} 
                      style={styles.backBtn}
                      activeOpacity={0.7}
                  >
                      <Ionicons 
                          name={isRTL ? "arrow-forward" : "arrow-back"} 
                          size={24} 
                          color={COLORS.textPrimary} 
                      />
                  </TouchableOpacity>
              ) : <View style={{ width: 54 }} />}

              {!['gender', 'skin', 'scalp'].includes(STEPS[currentStep]?.id) && (
                  <TouchableOpacity
                      onPress={handleNextStep}
                      disabled={!isNextEnabled() || loading}
                      style={[styles.nextBtn, (!isNextEnabled() || loading) && { opacity: 0.5 }]}
                      activeOpacity={0.8}
                  >
                      {loading ? (
                          <Text style={styles.btnText}>{t('onboarding_saving', language)}</Text>
                      ) : (
                          <View style={styles.btnContent}>
                            <Text style={styles.btnText}>
                                {currentStep === 7 
                                ? (formData.gender === 'أنثى' ? t('onboarding_start_female', language) : t('onboarding_start_male', language)) 
                                : t('onboarding_next', language)}
                            </Text>
                            {currentStep !== 7 && (
                                <Ionicons 
                                  name={isRTL ? "arrow-back" : "arrow-forward"} 
                                  size={20} 
                                  color={COLORS.textOnAccent} 
                                  style={{ marginHorizontal: 8 }} 
                                />
                            )}
                          </View>
                      )}
                  </TouchableOpacity>
              )}
          </View>

        </View>
      </KeyboardAvoidingView>

      {/* Full Avatar Selection Bottom Sheet Modal */}
      <AvatarSelectionModal
          visible={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          currentId={formData.avatarId}
          onSelect={(id) => {
              setFormData((prev) => ({ ...prev, avatarId: id }));
              setShowAvatarModal(false);
          }}
          language={language}
      />
    </View>
  );
}

const createStyles = (COLORS, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  safeArea: { flex: 1, paddingHorizontal: 16 },

  // Progress Bar
  progressContainer: { marginBottom: 20, paddingHorizontal: 4 },
  stepCounter: { color: COLORS.textSecondary, fontFamily: 'Tajawal-Bold', fontSize: 13, marginBottom: 6 },
  track: { 
    height: 5, 
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : COLORS.border, 
    borderRadius: 99, 
    overflow: 'hidden' 
  },
  fill: { height: '100%', backgroundColor: COLORS.accentGreen, borderRadius: 99 },

  // Frameless Header Text
  headerTextContainer: { 
    alignItems: 'center', 
    marginBottom: 20, 
    paddingHorizontal: 10 
  },
  title: { 
    fontSize: 28, 
    fontFamily: 'Tajawal-ExtraBold', 
    color: COLORS.textPrimary, 
    textAlign: 'center', 
    marginBottom: 8,
    textShadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'transparent', 
    textShadowOffset: { width: 0, height: 2 }, 
    textShadowRadius: 10 
  },
  subtitle: { 
    fontSize: 15, 
    fontFamily: 'Tajawal-Regular', 
    color: COLORS.textSecondary, 
    textAlign: 'center', 
    lineHeight: 22 
  },

  // Square Option Grid
  gridCenter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'center' },
  
  squareCard: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 16,
  },
  cardSelected: {
    borderColor: COLORS.accentGreen,
    backgroundColor: isDark ? 'rgba(90, 156, 132, 0.22)' : (COLORS.surfaceGreen || 'rgba(61, 146, 117, 0.18)'),
    shadowColor: COLORS.accentGreen,
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(39, 103, 81, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionText: { fontSize: 16, fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, textAlign: 'center' },
  optionTextSelected: { color: COLORS.textPrimary, fontFamily: 'Tajawal-ExtraBold' },
  checkBadge: { 
    position: 'absolute', 
    top: 12, 
    right: 12, 
    backgroundColor: COLORS.accentGreen, 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },

  // Row Option List
  listContainer: { width: '100%' },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  rowSelected: {
    borderColor: COLORS.accentGreen,
    backgroundColor: isDark ? 'rgba(90, 156, 132, 0.22)' : (COLORS.surfaceGreen || 'rgba(61, 146, 117, 0.18)'),
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 16,
    fontFamily: 'Tajawal-Regular',
    color: COLORS.textSecondary,
    flex: 1,
  },
  rowSub: {
    fontSize: 13,
    fontFamily: 'Tajawal-Regular',
    color: COLORS.textDim,
    marginTop: 3,
  },

  // --- Step 1: Clean Spotlight Avatar Styles (Transparent Background) ---
  heroAvatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  heroAvatarTouchable: {
    position: 'relative',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarGlow: {
    position: 'absolute',
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 1.5,
    opacity: 0.25,
  },
  heroAvatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    borderWidth: 2.5,
    backgroundColor: 'transparent', // 👈 Transparent, no white background
  },
  heroAvatarImg: {
    width: '100%',
    height: '100%',
  },
  heroAvatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    elevation: 5,
  },
  avatarSectionLabel: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 13.5,
    marginTop: 10,
    textAlign: 'center',
  },

  // Name Input Section
  nameContainer: { width: '100%', alignItems: 'center' },
  nameInputSection: { width: '100%', alignItems: 'center' },
  inputWrapper: {
    width: '100%',
    borderRadius: 99,
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 20,
    height: 60,
    justifyContent: 'center',
  },
  bigInput: {
    width: '100%',
    fontSize: 22,
    fontFamily: 'Tajawal-Regular',
    fontWeight: 'normal',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  inputHint: { color: COLORS.textDim, fontSize: 13, fontFamily: 'Tajawal-Regular', marginTop: 12, textAlign: 'center' },
  errorText: { color: COLORS.danger, fontSize: 14, fontFamily: 'Tajawal-Bold', textAlign: 'center' },

  // Step Finish Screen
  centerFlex: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  successIcon: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: COLORS.accentGreen, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 24,
    shadowColor: COLORS.accentGreen,
    shadowOpacity: isDark ? 0.5 : 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  // Fixed Footer Navigation
  fixedFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 10,
  },
  backBtn: { 
    width: 54, 
    height: 54, 
    borderRadius: 27, 
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : COLORS.card, 
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  nextBtn: { 
    flex: 1, 
    marginLeft: 16, 
    height: 54, 
    borderRadius: 99, 
    backgroundColor: COLORS.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accentGreen,
    shadowOpacity: isDark ? 0.35 : 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
  },
  btnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: COLORS.textOnAccent, fontFamily: 'Tajawal-ExtraBold', fontSize: 17 },
});

// --- END OF FILE WelcomeScreen.js ---