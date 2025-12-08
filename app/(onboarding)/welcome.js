import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  Dimensions, KeyboardAvoidingView, Platform, ScrollView, 
  Animated, Easing, ImageBackground, StatusBar, UIManager
} from 'react-native';
import { BlurView } from 'expo-blur';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useRouter } from 'expo-router';
import { useAppContext } from '../../src/context/AppContext';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// --- CONFIGURATION ---
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

// --- THEME ---
const BG_IMAGE = require('../../assets/lolo.jpg');

const COLORS = {
  primary: '#B2D8B4',
  darkGreen: '#1a3b25',
  text: '#FFFFFF',
  textDim: 'rgba(255, 255, 255, 0.65)',
  glassTint: 'rgba(8, 12, 10, 0.80)', 
  glassBorder: 'rgba(178, 216, 180, 0.2)',
  cardBg: 'rgba(255, 255, 255, 0.05)',
  cardBgSelected: '#B2D8B4', 
  inputBg: 'rgba(0, 0, 0, 0.3)',
};

// --- DATA FROM FILE (STRICT IDs) ---
// We map your exact file data to UI friendly objects (icons/labels)

const SKIN_OPTIONS = [
    { id: 'oily', label: 'دهنية', icon: 'tint' },
    { id: 'dry', label: 'جافة', icon: 'leaf' },
    { id: 'combo', label: 'مختلطة', icon: 'adjust' },
    { id: 'normal', label: 'عادية', icon: 'smile' },
    // Removed sensitive here because it is handled in conditions in your file
];

const SCALP_OPTIONS = [
    { id: 'oily', label: 'دهنية', icon: 'tint' },
    { id: 'dry', label: 'جافة', icon: 'leaf' },
    { id: 'normal', label: 'عادية', icon: 'user' }
];

const CONDITIONS_LIST = [
    { id: 'acne_prone', category: 'skin_concern', name: 'حب الشباب' },
    { id: 'sensitive_skin', category: 'skin_concern', name: 'بشرة حساسة' },
    { id: 'rosacea_prone', category: 'skin_concern', name: 'الوردية' },
    { id: 'sensitive_scalp', category: 'scalp_concern', name: 'فروة رأس حساسة' },
    { id: 'dandruff', category: 'scalp_concern', name: 'قشرة الرأس' },
    { id: 'pregnancy_nursing', category: 'health', name: 'الحمل والرضاعة' },
    { id: 'high_blood_pressure', category: 'health', name: 'ضغط دم مرتفع' }
];

const ALLERGIES_LIST = [
    { id: 'nuts', name: 'مكسرات' },
    { id: 'soy', name: 'صويا' },
    { id: 'fragrance', name: 'عطور' },
    { id: 'salicylates', name: 'الساليسيلات' },
    { id: 'gluten', name: 'الغلوتين' },
    { id: 'bees', name: 'منتجات النحل' }
];

// Step titles and subtitles will be determined dynamically based on gender
const getStepConfig = (gender) => {
  const isFemale = gender === 'أنثى';
  
  return [
    { 
      id: 'gender', 
      title: 'لنتعرف عليكِ', 
      subtitle: 'نخصص التجربة بناءً على نوعك', 
      type: 'single' 
    },
    { 
      id: 'name', 
      title: isFemale ? 'ما هو اسمكِ؟' : 'ما هو اسمك؟', 
      subtitle: isFemale ? 'الاسم الذي تحبين أن نناديك به' : 'الاسم الذي تحب أن نناديك به', 
      type: 'input' 
    },
    { 
      id: 'skin', 
      title: isFemale ? 'نوع بشرتكِ؟' : 'نوع بشرتك؟', 
      subtitle: isFemale ? 'أساس العناية ببشرتكِ' : 'أساس العناية ببشرتك', 
      type: 'single' 
    },
    { 
      id: 'scalp', 
      title: isFemale ? 'فروة رأسكِ؟' : 'فروة رأسك؟', 
      subtitle: isFemale ? 'مهم لتحليل الشامبو المناسب لكِ' : 'مهم لتحليل الشامبو المناسب لك', 
      type: 'single' 
    },
    { 
      id: 'conditions', 
      title: isFemale ? 'مخاوف صحية؟' : 'مخاوف صحية؟', 
      subtitle: isFemale ? 'لتنبيهكِ من المنتجات التي قد تضركِ' : 'لتنبيهك من المنتجات التي قد تضرك', 
      type: 'multi' 
    },
    { 
      id: 'allergies', 
      title: isFemale ? 'لديكِ حساسية؟' : 'لديك حساسية؟', 
      subtitle: isFemale ? 'لتحذيركِ فورياً من المكونات' : 'لتحذيرك فورياً من المكونات', 
      type: 'multi' 
    },
    { 
      id: 'finish', 
      title: isFemale ? 'جاهزة!' : 'جاهز!', 
      subtitle: isFemale ? 'تم إعداد مختبركِ الشخصي' : 'تم إعداد مختبرك الشخصي', 
      type: 'action' 
    },
  ];
};

// --- 1. COMPONENT: ORGANIC SPORE ---
const Spore = ({ size, startX, duration, delay }) => {
  const animY = useRef(new Animated.Value(0)).current; 
  useEffect(() => {
    Animated.loop(Animated.timing(animY, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);
  const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [height + 50, -100] });
  return <Animated.View style={{ position: 'absolute', left: startX, width: size, height: size, borderRadius: size/2, backgroundColor: COLORS.primary, opacity: 0.15, transform: [{ translateY }] }} />;
};

// --- 2. COMPONENT: SQUARE OPTION (GRID) ---
const SquareOption = ({ label, icon, selected, onPress, index }) => {
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scale, { toValue: 1, friction: 8, delay: index * 50, useNativeDriver: true }).start();
    }, []);

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <Animated.View style={{ transform: [{ scale }], width: '47%', aspectRatio: 1.1, marginBottom: 12 }}>
            <TouchableOpacity activeOpacity={0.8} onPress={handlePress} style={[styles.squareCard, selected && styles.cardSelected]}>
                <View style={[styles.iconContainer, selected && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <FontAwesome5 name={icon} size={24} color={selected ? COLORS.darkGreen : COLORS.primary} />
                </View>
                <Text style={[styles.optionText, selected && { color: COLORS.darkGreen, fontFamily: 'Tajawal-Bold' }]}>
                    {label}
                </Text>
                {selected && <View style={styles.checkBadge}><FontAwesome5 name="check" size={10} color={COLORS.darkGreen} /></View>}
            </TouchableOpacity>
        </Animated.View>
    );
};

// --- 3. COMPONENT: ROW OPTION (LIST) ---
const RowOption = ({ label, selected, onPress, index, category }) => {
    const slide = useRef(new Animated.Value(50)).current;
    const fade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slide, { toValue: 0, duration: 300, delay: index * 40, useNativeDriver: true }),
            Animated.timing(fade, { toValue: 1, duration: 300, delay: index * 40, useNativeDriver: true })
        ]).start();
    }, []);

    const handlePress = () => {
        Haptics.selectionAsync();
        onPress();
    };

    // Category Badges map
    const catMap = { skin_concern: 'بشرة', scalp_concern: 'شعر', health: 'صحة' };

    return (
        <Animated.View style={{ transform: [{ translateX: slide }], opacity: fade }}>
            <TouchableOpacity activeOpacity={0.8} onPress={handlePress} style={styles.rowContainer}>
                <View style={[styles.rowInner, selected && { backgroundColor: COLORS.cardBgSelected }]}>
                    <View style={[styles.checkbox, selected && { backgroundColor: COLORS.darkGreen, borderColor: COLORS.darkGreen }]}>
                        {selected && <FontAwesome5 name="check" size={10} color="#fff" />}
                    </View>
                    <View style={{flex: 1}}>
                        <Text style={[styles.rowText, selected && { color: COLORS.darkGreen, fontFamily: 'Tajawal-Bold' }]}>{label}</Text>
                        {category && <Text style={[styles.rowSub, selected && { color: 'rgba(26,59,37,0.7)' }]}>{catMap[category]}</Text>}
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// --- MAIN SCREEN ---
export default function WelcomeScreen() {
  const { user } = useAppContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Transitions
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTransX = useRef(new Animated.Value(0)).current; 
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // THE MASTER STATE
  const [formData, setFormData] = useState({ name: '', gender: '', skinType: '', scalpType: '', conditions: [], allergies: [] });

  // Get step configuration based on gender
  const STEPS = useMemo(() => getStepConfig(formData.gender), [formData.gender]);

  const particles = useMemo(() => [...Array(20)].map((_, i) => ({
    key: i, size: Math.random()*5+2, startX: Math.random()*width, duration: 15000+Math.random()*10000, delay: Math.random()*5000 
  })), []);

  useEffect(() => {
      Animated.timing(progressAnim, {
          toValue: (currentStep + 1) / STEPS.length,
          duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false
      }).start();
  }, [currentStep]);

  const changeStep = (dir) => {
      const next = currentStep + dir;
      if(next < 0 || next >= STEPS.length) { if(next >= STEPS.length) finishOnboarding(); return; }

      // 1. Slide Out
      Animated.parallel([
          Animated.timing(contentOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(contentTransX, { toValue: dir > 0 ? -30 : 30, duration: 200, useNativeDriver: true })
      ]).start(() => {
          setCurrentStep(next);
          contentTransX.setValue(dir > 0 ? 30 : -30); // Reset for Slide In
          
          // 2. Slide In
          Animated.parallel([
            Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(contentTransX, { toValue: 0, friction: 9, useNativeDriver: true })
          ]).start();
      });
  };

  const handleSingleSelect = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      // Lazy Auto Advance
      setTimeout(() => changeStep(1), 350);
  };

  const toggleMulti = (field, value) => {
      setFormData(prev => {
          const list = prev[field];
          return list.includes(value) ? { ...prev, [field]: list.filter(i => i !== value) } : { ...prev, [field]: [...list, value] };
      });
  };

  const finishOnboarding = async () => {
    if (!user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    try {
        // Save to Firebase using exact schema
        await updateDoc(doc(db, 'profiles', user.uid), { settings: formData, onboardingComplete: true });
        router.replace('/(main)/profile');
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  // --- CENTERED RENDER LOGIC ---
  const renderContent = () => {
      switch(currentStep) {
          case 0: return ( // Gender
              <View style={styles.gridCenter}>
                  <SquareOption index={0} label="أنثى" icon="venus" selected={formData.gender === 'أنثى'} onPress={() => handleSingleSelect('gender', 'أنثى')} />
                  <SquareOption index={1} label="ذكر" icon="mars" selected={formData.gender === 'ذكر'} onPress={() => handleSingleSelect('gender', 'ذكر')} />
              </View>
          );
          case 1: return ( // Name
              <View style={styles.nameContainer}>
                  <TextInput 
                    style={styles.bigInput} 
                    placeholder={formData.gender === 'أنثى' ? "الاسم الكريم..." : "الاسم الكريم..."} 
                    placeholderTextColor={COLORS.textDim}
                    value={formData.name} 
                    onChangeText={t => setFormData({...formData, name: t})} 
                    textAlign="center" 
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => formData.name.trim() && changeStep(1)}
                    blurOnSubmit={false}
                  />
                  <Text style={styles.inputHint}>
                    {formData.gender === 'أنثى' ? 'اضغطي "التالي" للمتابعة' : 'اضغط "التالي" للمتابعة'}
                  </Text>
              </View>
          );
          case 2: return ( // Skin
              <View style={styles.gridContainer}>
                  {SKIN_OPTIONS.map((t, i) => <SquareOption index={i} key={t.id} label={t.label} icon={t.icon} selected={formData.skinType === t.id} onPress={() => handleSingleSelect('skinType', t.id)} />)}
              </View>
          );
          case 3: return ( // Scalp
              <View style={styles.gridContainer}>
                  {SCALP_OPTIONS.map((t, i) => <SquareOption index={i} key={t.id} label={t.label} icon={t.icon} selected={formData.scalpType === t.id} onPress={() => handleSingleSelect('scalpType', t.id)} />)}
              </View>
          );
          case 4: return ( // Conditions
              <View style={styles.listContainer}>
                  {CONDITIONS_LIST.map((c, i) => <RowOption index={i} key={c.id} label={c.name} category={c.category} selected={formData.conditions.includes(c.id)} onPress={() => toggleMulti('conditions', c.id)} />)}
              </View>
          );
          case 5: return ( // Allergies
              <View style={styles.listContainer}>
                  {ALLERGIES_LIST.map((a, i) => <RowOption index={i} key={a.id} label={a.name} selected={formData.allergies.includes(a.id)} onPress={() => toggleMulti('allergies', a.id)} />)}
              </View>
          );
          case 6: return ( // Finish
              <View style={styles.centerFlex}>
                  <View style={styles.successIcon}>
                      <FontAwesome5 name="check" size={55} color={COLORS.darkGreen} />
                  </View>
                  <Text style={styles.finishTitle}>{STEPS[currentStep].title}</Text>
                  <Text style={styles.finishSub}>{STEPS[currentStep].subtitle}</Text>
              </View>
          );
      }
  };

  const isNextEnabled = () => {
      if(currentStep === 1 && !formData.name.trim()) return false;
      return true; 
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground source={BG_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover">
        <View style={styles.darkOverlay} />
        {particles.map(p => <Spore key={p.key} {...p} />)}

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{flex: 1}}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
        >
          <View style={[
              styles.safeArea, 
              // Add safe area padding here
              { paddingTop: 40 + insets.top, paddingBottom: insets.bottom } 
          ]}>
                
            <View style={styles.progressContainer}>
              <Text style={styles.stepCounter}>الخطوة {currentStep + 1} من {STEPS.length}</Text>
              <View style={styles.track}>
                <Animated.View style={[styles.fill, { width: progressAnim.interpolate({inputRange:[0,1], outputRange:['0%','100%']}) }]} />
              </View>
            </View>

            <View style={styles.cardContainer}>
              <BlurView intensity={70} tint="extralight" style={[styles.glass, { backgroundColor: COLORS.glassTint }]}>
                
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>{STEPS[currentStep].title}</Text>
                  <Text style={styles.subtitle}>{STEPS[currentStep].subtitle}</Text>
                </View>

                <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateX: contentTransX }] }}>
                  <ScrollView 
                    contentContainerStyle={{ 
                      flexGrow: 1, 
                      justifyContent: currentStep === 1 ? 'flex-start' : 'center',
                      paddingBottom: 20,
                      paddingTop: currentStep === 1 ? 40 : 0
                    }} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {renderContent()}
                  </ScrollView>
                </Animated.View>

                <View style={styles.footer}>
                  {currentStep > 0 ? (
                    <TouchableOpacity onPress={() => changeStep(-1)} style={styles.backBtn}>
                      <Ionicons name="arrow-back" size={24} color={COLORS.textDim} />
                    </TouchableOpacity>
                  ) : <View style={{ width: 50 }} />}

                  {!['gender', 'skin', 'scalp'].includes(STEPS[currentStep].id) && (
                    <TouchableOpacity 
                      onPress={() => changeStep(1)} 
                      disabled={!isNextEnabled() || loading}
                      style={[styles.nextBtn, (!isNextEnabled() || loading) && { opacity: 0.5 }]}
                    >
                      {loading ? (
                        <Text style={styles.btnText}>جاري الحفظ...</Text>
                      ) : (
                        <Text style={styles.btnText}>
                          {currentStep === 6 ? (formData.gender === 'أنثى' ? 'انطلقي' : 'انطلق') : 'التالي'}
                        </Text>
                      )}
                      {currentStep !== 6 && !loading && <Ionicons name="arrow-forward" size={18} color={COLORS.darkGreen} style={{ marginLeft: 8 }} />}
                    </TouchableOpacity>
                  )}
                </View>

              </BlurView>
            </View>

          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 40 },

  // Progress
  progressContainer: { marginBottom: 15, paddingHorizontal: 5 },
  stepCounter: { color: COLORS.text, fontFamily: 'Tajawal-Bold', fontSize: 13, marginBottom: 8, textAlign: 'right' },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },

  // Card
  cardContainer: { flex: 0.85, marginBottom: 20 },
  glass: { 
      flex: 1, borderRadius: 30, overflow: 'hidden', 
      borderWidth: 1, borderColor: COLORS.glassBorder, 
      paddingVertical: 25, paddingHorizontal: 20 
  },

  // Header Inside
  cardHeader: { alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  title: { fontSize: 28, fontFamily: 'Tajawal-ExtraBold', color: COLORS.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 15, fontFamily: 'Tajawal-Regular', color: COLORS.textDim, textAlign: 'center' },

  // Options Grid
  gridCenter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', height: '100%', gap: 15 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'center', paddingHorizontal: 5 },
  listContainer: { width: '100%', gap: 10 },

  // Square Card
  squareCard: {
      flex: 1, height: '100%', borderRadius: 24, alignItems: 'center', justifyContent: 'center',
      backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.glassBorder, padding: 10
  },
  cardSelected: { backgroundColor: COLORS.cardBgSelected, borderColor: COLORS.primary },
  iconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  optionText: { fontSize: 16, fontFamily: 'Tajawal-Regular', color: COLORS.text, textAlign: 'center' },
  checkBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 10 },

  // List Row
  rowContainer: { width: '100%' },
  rowInner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.glassBorder },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.textDim, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  rowText: { fontSize: 16, fontFamily: 'Tajawal-Regular', color: COLORS.text, flex: 1 },
  rowSub: { fontSize: 12, fontFamily: 'Tajawal-Regular', color: COLORS.textDim, marginTop: 4 },

  // Name Input Container
  nameContainer: { 
    width: '100%', 
    alignItems: 'center', 
    gap: 15,
    marginTop: Platform.OS === 'ios' ? 20 : 40
  },
  
  // Input
  inputContainer: { width: '100%', alignItems: 'center', gap: 15 },
  bigInput: { 
      width: '100%', fontSize: 26, fontFamily: 'Tajawal-Bold', color: COLORS.text, 
      borderBottomWidth: 2, borderBottomColor: COLORS.primary, paddingVertical: 10, textAlign: 'center' 
  },
  inputHint: { color: COLORS.textDim, fontSize: 14, fontFamily: 'Tajawal-Regular' },

  // Finish
  centerFlex: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  finishTitle: { fontSize: 26, fontFamily: 'Tajawal-Bold', color: COLORS.text, marginBottom: 8 },
  finishSub: { fontSize: 15, fontFamily: 'Tajawal-Regular', color: COLORS.textDim },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15 },
  backBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  nextBtn: { 
      flex: 1, marginLeft: 15, height: 50, borderRadius: 25, backgroundColor: COLORS.primary,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 10
  },
  btnText: { color: COLORS.darkGreen, fontFamily: 'Tajawal-Bold', fontSize: 18 }
});