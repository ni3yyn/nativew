import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Dimensions, KeyboardAvoidingView, Platform, ScrollView,
  Animated, Easing, ImageBackground, StatusBar, Keyboard // <--- 1. ADD Keyboard IMPORT
} from 'react-native';

import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppContext } from '../../src/context/AppContext';
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

// --- CONFIGURATION ---

const { width, height } = Dimensions.get('window');
const BG_IMAGE = require('../../assets/lolo.jpg');

const COLORS = {
  background: '#1A2D27',
  card: '#253D34',
  border: 'rgba(90, 156, 132, 0.25)',
  textDim: '#6B7C76',
  accentGreen: '#5A9C84',
  primary: '#A3E4D7',
  textPrimary: '#F1F3F2',
  textSecondary: '#A3B1AC',
  textOnAccent: '#1A2D27',
  danger: '#ef4444',
  glassTint: 'rgba(26, 45, 39, 0.85)',
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

// --- COMPONENT: ORGANIC SPORE ---
const Spore = ({ size, startX, duration }) => {
  const animY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(animY, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);
  const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [height + 50, -100] });

  // 2. ADD pointerEvents="none" to ensure particles never block clicks
  return (
    <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', left: startX, width: size, height: size, borderRadius: size/2, backgroundColor: COLORS.accentGreen, opacity: 0.2, transform: [{ translateY }] }}
    />
  );
};

// --- COMPONENT: SQUARE OPTION ---
const SquareOption = ({ label, icon, selected, onPress, index }) => {
    const scale = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.spring(scale, { toValue: 1, friction: 8, delay: 100 + (index * 50), useNativeDriver: true }).start(); }, []);

    return (
        <Animated.View style={{ transform: [{ scale }], width: '47%', aspectRatio: 1.1, marginBottom: 12 }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }} style={[styles.squareCard, selected && styles.cardSelected]}>
                <View style={[styles.iconContainer, selected && { backgroundColor: COLORS.accentGreen }]}>
                    <FontAwesome5 name={icon} size={24} color={selected ? COLORS.textOnAccent : COLORS.accentGreen} />
                </View>
                <Text style={[styles.optionText, selected && { color: COLORS.accentGreen, fontFamily: 'Tajawal-Bold' }]}>{label}</Text>
                {selected && <View style={styles.checkBadge}><FontAwesome5 name="check" size={10} color={COLORS.textOnAccent} /></View>}
            </TouchableOpacity>
        </Animated.View>
    );
};

// --- COMPONENT: ROW OPTION ---
const RowOption = ({ label, selected, onPress, index, category, description, language }) => {
    const slide = useRef(new Animated.Value(50)).current;
    const fade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slide, { toValue: 0, duration: 300, delay: 100 + (index * 40), useNativeDriver: true }),
            Animated.timing(fade, { toValue: 1, duration: 300, delay: 100 + (index * 40), useNativeDriver: true })
        ]).start();
    }, []);

    const catMap = {
      skin_concern: t('onboarding_category_skin', language),
      scalp_concern: t('onboarding_category_scalp', language),
      health: t('onboarding_category_health', language),
    };
    const subText = description || (category ? catMap[category] : null);

    return (
        <Animated.View style={{ transform: [{ translateX: slide }], opacity: fade }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => { Haptics.selectionAsync(); onPress(); }} style={styles.rowContainer}>
                <View style={[styles.rowInner, selected && styles.rowSelected]}>
                    <View style={[styles.checkbox, selected && { backgroundColor: COLORS.accentGreen, borderColor: COLORS.accentGreen }]}>
                        {selected && <FontAwesome5 name="check" size={10} color={COLORS.textOnAccent} />}
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={[styles.rowText, selected && { color: COLORS.accentGreen, fontFamily: 'Tajawal-Bold' }]}>{label}</Text>
                        {subText && <Text style={[styles.rowSub, selected && { color: COLORS.textSecondary }]}>{subText}</Text>}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// --- MAIN SCREEN ---
export default function WelcomeScreen() {
  const { user } = useAppContext();
  const language = useCurrentLanguage();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const hasShownAlert = useRef(false);

  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTransX = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // --- Error Animation State ---
  const [showNameError, setShowNameError] = useState(false);
  const errorFadeAnim = useRef(new Animated.Value(0)).current;

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
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
    size: Math.random()*5+2,
    startX: Math.random()*width,
    duration: 15000+Math.random()*10000,
    delay: Math.random()*5000
  })), []);

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
          duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false
      }).start();
  }, [currentStep]);

  useEffect(() => {
    Animated.timing(errorFadeAnim, {
        toValue: showNameError ? 1 : 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
    }).start();
  }, [showNameError]);

  const changeStep = (dir) => {
      const next = currentStep + dir;
      if(next < 0 || next >= STEPS.length) {
          if(next >= STEPS.length) finishOnboarding();
          return;
      }

      setShowNameError(false);

      Animated.parallel([
          Animated.timing(contentOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(contentTransX, { toValue: dir > 0 ? -40 : 40, duration: 200, useNativeDriver: true })
      ]).start(() => {
          setCurrentStep(next);
          contentTransX.setValue(dir > 0 ? 40 : -40);

          setTimeout(() => {
              Animated.parallel([
                Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(contentTransX, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
              ]).start();
          }, 50);
      });
  };

  const handleNextStep = () => {
    // 3. FORCE KEYBOARD DISMISSAL - This fixes the "Double Tap" requirement
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
      setTimeout(() => changeStep(1), 350);
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
                  <SquareOption index={0} label={t('onboarding_gender_female', language)} icon="venus" selected={formData.gender === 'أنثى'} onPress={() => handleSingleSelect('gender', 'أنثى')} />
                  <SquareOption index={1} label={t('onboarding_gender_male', language)} icon="mars" selected={formData.gender === 'ذكر'} onPress={() => handleSingleSelect('gender', 'ذكر')} />
              </View>
          );
          case 1: return (
              <View style={styles.nameContainer}>
                  <TextInput
                    style={[styles.bigInput, showNameError && { borderBottomColor: COLORS.danger, color: COLORS.danger }]}
                    placeholder={t('onboarding_name_placeholder', language)}
                    placeholderTextColor={COLORS.textDim}
                    value={formData.name}
                    onChangeText={t => {
                        setFormData({...formData, name: t});
                        if (t.trim().length >= 4) setShowNameError(false);
                    }}
                    textAlign="center"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleNextStep}
                  />
                  <Animated.View style={{
                      height: errorFadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }),
                      opacity: errorFadeAnim,
                      overflow: 'hidden',
                      justifyContent: 'center',
                  }}>
                      <Text style={styles.errorText}>{t('onboarding_name_error', language)}</Text>
                  </Animated.View>
                  <Text style={styles.inputHint}>{t('onboarding_name_hint', language)}</Text>
              </View>
          );
          case 2: return (
              <View style={styles.gridContainer}>
                  {SKIN_OPTIONS.map((item, i) => <SquareOption index={i} key={item.id} label={getLocalizedValue(item.label, language)} icon={item.icon} selected={formData.skinType === item.id} onPress={() => handleSingleSelect('skinType', item.id)} />)}
              </View>
          );
          case 3: return (
              <View style={styles.gridContainer}>
                  {SCALP_OPTIONS.map((item, i) => <SquareOption index={i} key={item.id} label={getLocalizedValue(item.label, language)} icon={item.icon} selected={formData.scalpType === item.id} onPress={() => handleSingleSelect('scalpType', item.id)} />)}
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
                      />
                  ))}
              </View>
          );
          case 5: return (
              <View style={styles.listContainer}>
                  {CONDITIONS_LIST.map((c, i) => <RowOption index={i} key={c.id} label={getLocalizedValue(c.name, language)} category={c.category} selected={formData.conditions.includes(c.id)} onPress={() => toggleMulti('conditions', c.id)} language={language} />)}
              </View>
          );
          case 6: return (
              <View style={styles.listContainer}>
                  {ALLERGIES_LIST.map((a, i) => <RowOption index={i} key={a.id} label={getLocalizedValue(a.name, language)} selected={formData.allergies.includes(a.id)} onPress={() => toggleMulti('allergies', a.id)} language={language} />)}
              </View>
          );
          case 7: return (
              <View style={styles.centerFlex}>
                  <View style={styles.successIcon}>
                      <FontAwesome5 name="check" size={55} color={COLORS.textOnAccent} />
                  </View>
                  <Text style={styles.finishTitle}>{STEPS[currentStep].title}</Text>
                  <Text style={styles.finishSub}>{STEPS[currentStep].subtitle}</Text>
              </View>
          );
      }
  };

  const isNextEnabled = () => {
      if(currentStep === 1 && formData.name.trim().length === 0) return false;
      return true;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground source={BG_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover">
        <LinearGradient colors={['rgba(26, 45, 39, 0.85)', 'rgba(26, 45, 39, 0.95)']} style={StyleSheet.absoluteFill} />
        {particles.map(p => <Spore key={p.id} {...p} />)}

        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            style={{flex: 1}}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={[styles.safeArea, { paddingTop: 40 + insets.top, paddingBottom: insets.bottom }]}>

            <View style={styles.progressContainer}>
              <Text style={styles.stepCounter}>{interpolate(t('onboarding_step_counter', language), { current: currentStep + 1, total: STEPS.length })}</Text>
              <View style={styles.track}>
                <Animated.View style={[styles.fill, { width: progressAnim.interpolate({inputRange:[0,1], outputRange:['0%','100%']}) }]} />
              </View>
            </View>

            <View style={styles.cardContainer}>
                <View style={[styles.glass, { backgroundColor: COLORS.glassTint, borderColor: COLORS.border, borderWidth: 1 }]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.title}>{STEPS[currentStep]?.title}</Text>
                        <Text style={styles.subtitle}>{STEPS[currentStep]?.subtitle}</Text>
                    </View>

                    <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateX: contentTransX }] }}>
                        <ScrollView
                            key={currentStep}
                            contentContainerStyle={{
                                flexGrow: 1,
                                paddingBottom: 20,
                                paddingTop: currentStep === 1 ? 20 : 0,
                                justifyContent: currentStep === 1 ? 'flex-start' : 'center'
                            }}
                            showsVerticalScrollIndicator={false}
                            // 4. IMPORTANT: Allow taps to pass through even if keyboard logic is lingering
                            keyboardShouldPersistTaps="always"
                        >
                            {renderContent()}
                        </ScrollView>
                    </Animated.View>

                    <View style={styles.footer}>
                        {currentStep > 0 ? (
                            <TouchableOpacity onPress={() => changeStep(-1)} style={styles.backBtn}>
                                <Ionicons name="arrow-back" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        ) : <View style={{ width: 50 }} />}

                        {!['gender', 'skin', 'scalp'].includes(STEPS[currentStep]?.id) && (
                            <TouchableOpacity
                                onPress={handleNextStep}
                                disabled={!isNextEnabled() || loading}
                                style={[styles.nextBtn, (!isNextEnabled() || loading) && { opacity: 0.5 }]}
                            >
                                <LinearGradient colors={[COLORS.accentGreen, '#4a8a73']} style={styles.btnGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                                    {loading ? <Text style={styles.btnText}>{t('onboarding_saving', language)}</Text> : <Text style={styles.btnText}>{currentStep === 7 ? (formData.gender === 'أنثى' ? t('onboarding_start_female', language) : t('onboarding_start_male', language)) : t('onboarding_next', language)}</Text>}
                                    {currentStep !== 7 && !loading && <Ionicons name="arrow-forward" size={18} color={COLORS.textOnAccent} style={{ marginLeft: 8 }} />}
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  progressContainer: { marginBottom: 15, paddingHorizontal: 5 },
  stepCounter: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Bold', fontSize: 13, marginBottom: 8, textAlign: 'right' },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: COLORS.accentGreen, borderRadius: 3 },
  cardContainer: { flex: 0.90, marginBottom: 20 },
  glass: { flex: 1, borderRadius: 30, overflow: 'hidden', paddingVertical: 25, paddingHorizontal: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20 },
  cardHeader: { alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  title: { fontSize: 26, fontFamily: 'Tajawal-ExtraBold', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, textAlign: 'center' },
  gridCenter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'center', paddingHorizontal: 5 },
  listContainer: { width: '100%', gap: 10 },
  squareCard: { flex: 1, height: '100%', borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 10 },
  cardSelected: { borderColor: COLORS.accentGreen, borderWidth: 2, backgroundColor: 'rgba(90, 156, 132, 0.15)' },
  iconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  optionText: { fontSize: 16, fontFamily: 'Tajawal-Regular', color: COLORS.textPrimary, textAlign: 'center' },
  checkBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: COLORS.accentGreen, padding: 4, borderRadius: 10 },
  rowContainer: { width: '100%' },
  rowInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border
},
rowSelected: {
    borderColor: COLORS.accentGreen,
    borderWidth: 1,
    backgroundColor: 'rgba(90, 156, 132, 0.15)'
},
checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.textDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 15,
    marginRight: 0
},
rowText: {
    fontSize: 16,
    fontFamily: 'Tajawal-Regular',
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right'
},
rowSub: {
    fontSize: 12,
    fontFamily: 'Tajawal-Regular',
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'right'
},
  nameContainer: { width: '100%', alignItems: 'center', gap: 10, marginTop: Platform.OS === 'ios' ? 20 : 40 },
  bigInput: { width: '100%', fontSize: 26, fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, borderBottomWidth: 2, borderBottomColor: COLORS.accentGreen, paddingVertical: 10, textAlign: 'center' },
  inputHint: { color: COLORS.textDim, fontSize: 14, fontFamily: 'Tajawal-Regular', marginTop: 10 },
  errorText: { color: COLORS.danger, fontSize: 14, fontFamily: 'Tajawal-Bold', textAlign: 'center' },
  centerFlex: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.accentGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  finishTitle: { fontSize: 26, fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, marginBottom: 8 },
  finishSub: { fontSize: 15, fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15 },
  backBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flex: 1, marginLeft: 15, height: 50, borderRadius: 25, overflow: 'hidden' },
  btnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold', fontSize: 18 }
});
