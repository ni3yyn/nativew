import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  Dimensions, KeyboardAvoidingView, Platform, ScrollView, 
  Animated, Easing, ImageBackground, StatusBar, UIManager
} from 'react-native';

import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../src/config/firebase';
import { useRouter } from 'expo-router';
import { useAppContext } from '../../src/context/AppContext';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

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

// --- DATA ---

const SKIN_OPTIONS = [
    { id: 'oily', label: 'دهنية', icon: 'tint' },
    { id: 'dry', label: 'جافة', icon: 'leaf' },
    { id: 'combo', label: 'مختلطة', icon: 'adjust' },
    { id: 'normal', label: 'عادية', icon: 'smile' },
];

const SCALP_OPTIONS = [
    { id: 'oily', label: 'دهنية', icon: 'tint' },
    { id: 'dry', label: 'جافة', icon: 'leaf' },
    { id: 'normal', label: 'عادية', icon: 'user' }
];

// --- NEW: GOALS LIST ---
const GOALS_LIST = [
    { id: 'acne', name: 'مكافحة حب الشباب', desc: 'التخلص من البثور وآثارها' },
    { id: 'anti_aging', name: 'مكافحة الشيخوخة', desc: 'تقليل التجاعيد والخطوط الدقيقة' },
    { id: 'brightening', name: 'نضارة وتفتيح', desc: 'توحيد لون البشرة وإزالة التصبغات' },
    { id: 'hydration', name: 'ترطيب عميق', desc: 'علاج الجفاف وتقوية حاجز البشرة' },
    { id: 'texture_pores', name: 'تحسين الملمس', desc: 'تضييق المسام وتنعيم البشرة' },
    { id: 'hair_growth', name: 'تكثيف الشعر', desc: 'علاج التساقط وزيادة الكثافة' },
];

const CONDITIONS_LIST = [
    { id: 'acne_prone', category: 'skin_concern', name: 'حب الشباب (بشرة معرضة)' },
    { id: 'sensitive_skin', category: 'skin_concern', name: 'بشرة حساسة' },
    { id: 'rosacea_prone', category: 'skin_concern', name: 'الوردية' },
    { id: 'sensitive_scalp', category: 'scalp_concern', name: 'فروة رأس حساسة' },
    { id: 'dandruff', category: 'scalp_concern', name: 'قشرة الرأس' },
    { id: 'pregnancy_nursing', category: 'health', name: 'الحمل والرضاعة' },
];

const ALLERGIES_LIST = [
    { id: 'nuts', name: 'مكسرات' },
    { id: 'soy', name: 'صويا' },
    { id: 'fragrance', name: 'عطور' },
    { id: 'salicylates', name: 'الساليسيلات' },
    { id: 'gluten', name: 'الغلوتين' },
];

// Updated Config to include Goals (Step index 4)
const getStepConfig = (gender) => {
  const isFemale = gender === 'أنثى';
  return [
    { id: 'gender', title: 'لنتعرف عليكِ', subtitle: 'نخصص التجربة بناءً على نوعك', type: 'single' },
    { id: 'name', title: isFemale ? 'ما هو اسمكِ؟' : 'ما هو اسمك؟', subtitle: isFemale ? 'الاسم الذي تحبين أن نناديك به' : 'الاسم الذي تحب أن نناديك به', type: 'input' },
    { id: 'skin', title: isFemale ? 'نوع بشرتكِ؟' : 'نوع بشرتك؟', subtitle: isFemale ? 'أساس العناية ببشرتكِ' : 'أساس العناية ببشرتك', type: 'single' },
    { id: 'scalp', title: isFemale ? 'فروة رأسكِ؟' : 'فروة رأسك؟', subtitle: isFemale ? 'مهم لتحليل الشامبو المناسب لكِ' : 'مهم لتحليل الشامبو المناسب لك', type: 'single' },
    // NEW STEP HERE
    { id: 'goals', title: isFemale ? 'ما هي أهدافك؟' : 'ما هي أهدافك؟', subtitle: isFemale ? 'لنختار لكِ الروتين والمنتجات المثالية' : 'لنختار لك الروتين والمنتجات المثالية', type: 'multi' },
    { id: 'conditions', title: isFemale ? 'مخاوف صحية؟' : 'مخاوف صحية؟', subtitle: isFemale ? 'لتنبيهكِ من المنتجات التي قد تضركِ' : 'لتنبيهك من المنتجات التي قد تضرك', type: 'multi' },
    { id: 'allergies', title: isFemale ? 'لديكِ حساسية؟' : 'لديك حساسية؟', subtitle: isFemale ? 'لتحذيركِ فورياً من المكونات' : 'لتحذيرك فورياً من المكونات', type: 'multi' },
    { id: 'finish', title: isFemale ? 'جاهزة!' : 'جاهز!', subtitle: isFemale ? 'تم إعداد مختبركِ الشخصي' : 'تم إعداد مختبرك الشخصي', type: 'action' },
  ];
};

// --- 1. COMPONENT: ORGANIC SPORE ---
const Spore = ({ size, startX, duration }) => {
  const animY = useRef(new Animated.Value(0)).current; 
  useEffect(() => {
    Animated.loop(Animated.timing(animY, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })).start();
  }, []);
  const translateY = animY.interpolate({ inputRange: [0, 1], outputRange: [height + 50, -100] });
  return <Animated.View style={{ position: 'absolute', left: startX, width: size, height: size, borderRadius: size/2, backgroundColor: COLORS.accentGreen, opacity: 0.2, transform: [{ translateY }] }} />;
};

// --- 2. COMPONENT: SQUARE OPTION (GRID) ---
const SquareOption = ({ label, icon, selected, onPress, index }) => {
    const scale = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.spring(scale, { toValue: 1, friction: 8, delay: index * 50, useNativeDriver: true }).start(); }, []);

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

// --- 3. COMPONENT: ROW OPTION (LIST) - UPDATED FOR DESCRIPTION ---
const RowOption = ({ label, selected, onPress, index, category, description }) => {
    const slide = useRef(new Animated.Value(50)).current;
    const fade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slide, { toValue: 0, duration: 300, delay: index * 40, useNativeDriver: true }),
            Animated.timing(fade, { toValue: 1, duration: 300, delay: index * 40, useNativeDriver: true })
        ]).start();
    }, []);

    const catMap = { skin_concern: 'بشرة', scalp_concern: 'شعر', health: 'صحة' };
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTransX = useRef(new Animated.Value(0)).current; 
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  // NEW: Initialized 'goals' as empty array to prevent firebase errors
  const [formData, setFormData] = useState({ 
    name: '', 
    gender: '', 
    skinType: '', 
    scalpType: '', 
    goals: [], 
    conditions: [], 
    allergies: [] 
  });

  const STEPS = useMemo(() => getStepConfig(formData.gender), [formData.gender]);
  const particles = useMemo(() => [...Array(20)].map((_, i) => ({
    id: i, // <--- CHANGED from 'key' to 'id'
    size: Math.random()*5+2, 
    startX: Math.random()*width, 
    duration: 15000+Math.random()*10000,
    delay: Math.random()*5000 
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

      Animated.parallel([
          Animated.timing(contentOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(contentTransX, { toValue: dir > 0 ? -30 : 30, duration: 200, useNativeDriver: true })
      ]).start(() => {
          setCurrentStep(next);
          contentTransX.setValue(dir > 0 ? 30 : -30); 
          Animated.parallel([
            Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(contentTransX, { toValue: 0, friction: 9, useNativeDriver: true })
          ]).start();
      });
  };

  const handleSingleSelect = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      setTimeout(() => changeStep(1), 350);
  };

  const toggleMulti = (field, value) => {
      setFormData(prev => {
          const list = prev[field] || []; // Safety check
          return list.includes(value) ? { ...prev, [field]: list.filter(i => i !== value) } : { ...prev, [field]: [...list, value] };
      });
  };

  const finishOnboarding = async () => {
    if (!user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    try {
        // Saving formData directly works because we initialized goals: [] in state
        await updateDoc(doc(db, 'profiles', user.uid), { settings: formData, onboardingComplete: true });
        router.replace('/profile');
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const renderContent = () => {
      switch(currentStep) {
          case 0: return ( 
              <View style={styles.gridCenter}>
                  <SquareOption index={0} label="أنثى" icon="venus" selected={formData.gender === 'أنثى'} onPress={() => handleSingleSelect('gender', 'أنثى')} />
                  <SquareOption index={1} label="ذكر" icon="mars" selected={formData.gender === 'ذكر'} onPress={() => handleSingleSelect('gender', 'ذكر')} />
              </View>
          );
          case 1: return ( 
              <View style={styles.nameContainer}>
                  <TextInput 
                    style={styles.bigInput} 
                    placeholder="الاسم الكريم..." 
                    placeholderTextColor={COLORS.textDim}
                    value={formData.name} 
                    onChangeText={t => setFormData({...formData, name: t})} 
                    textAlign="center" 
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => formData.name.trim() && changeStep(1)}
                  />
                  <Text style={styles.inputHint}>اضغط "التالي" للمتابعة</Text>
              </View>
          );
          case 2: return ( 
              <View style={styles.gridContainer}>
                  {SKIN_OPTIONS.map((t, i) => <SquareOption index={i} key={t.id} label={t.label} icon={t.icon} selected={formData.skinType === t.id} onPress={() => handleSingleSelect('skinType', t.id)} />)}
              </View>
          );
          case 3: return ( 
              <View style={styles.gridContainer}>
                  {SCALP_OPTIONS.map((t, i) => <SquareOption index={i} key={t.id} label={t.label} icon={t.icon} selected={formData.scalpType === t.id} onPress={() => handleSingleSelect('scalpType', t.id)} />)}
              </View>
          );
          // NEW CASE 4: GOALS
          case 4: return (
              <View style={styles.listContainer}>
                  {GOALS_LIST.map((g, i) => (
                      <RowOption 
                        index={i} 
                        key={g.id} 
                        label={g.name} 
                        description={g.desc} // Passing description
                        selected={formData.goals.includes(g.id)} 
                        onPress={() => toggleMulti('goals', g.id)} 
                      />
                  ))}
              </View>
          );
          case 5: return ( 
              <View style={styles.listContainer}>
                  {CONDITIONS_LIST.map((c, i) => <RowOption index={i} key={c.id} label={c.name} category={c.category} selected={formData.conditions.includes(c.id)} onPress={() => toggleMulti('conditions', c.id)} />)}
              </View>
          );
          case 6: return ( 
              <View style={styles.listContainer}>
                  {ALLERGIES_LIST.map((a, i) => <RowOption index={i} key={a.id} label={a.name} selected={formData.allergies.includes(a.id)} onPress={() => toggleMulti('allergies', a.id)} />)}
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
      if(currentStep === 1 && !formData.name.trim()) return false;
      // Note: Goals, Conditions, Allergies are optional (multi-select), so next is enabled even if empty
      return true; 
  };

  // ... (Render return stays mostly the same, ensuring STEPS[currentStep] index access is safe via the logic above)
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground source={BG_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover">
        <LinearGradient colors={['rgba(26, 45, 39, 0.85)', 'rgba(26, 45, 39, 0.95)']} style={StyleSheet.absoluteFill} />
        {particles.map(p => <Spore key={p.id} {...p} />)}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}} keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}>
          <View style={[styles.safeArea, { paddingTop: 40 + insets.top, paddingBottom: insets.bottom }]}>
            
            <View style={styles.progressContainer}>
              <Text style={styles.stepCounter}>الخطوة {currentStep + 1} من {STEPS.length}</Text>
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
                            contentContainerStyle={{ flexGrow: 1, paddingBottom: 20, paddingTop: currentStep === 1 ? 40 : 0, justifyContent: currentStep === 1 ? 'flex-start' : 'center' }} 
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
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

                        {/* Hide Next button on Single Select screens to force selection (Gender, Skin, Scalp) */}
                        {!['gender', 'skin', 'scalp'].includes(STEPS[currentStep]?.id) && (
                            <TouchableOpacity onPress={() => changeStep(1)} disabled={!isNextEnabled() || loading} style={[styles.nextBtn, (!isNextEnabled() || loading) && { opacity: 0.5 }]}>
                                <LinearGradient colors={[COLORS.accentGreen, '#4a8a73']} style={styles.btnGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                                    {loading ? <Text style={styles.btnText}>جاري الحفظ...</Text> : <Text style={styles.btnText}>{currentStep === 7 ? (formData.gender === 'أنثى' ? 'انطلقي' : 'انطلق') : 'التالي'}</Text>}
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

// --- STYLES (UNCHANGED) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 40 },
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
    flexDirection: 'row-reverse', // <--- CHANGED: Starts from Right
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
    marginLeft: 15, // <--- CHANGED: Margin Left because checkbox is on Right
    marginRight: 0  // <--- Reset
},
rowText: { 
    fontSize: 16, 
    fontFamily: 'Tajawal-Regular', 
    color: COLORS.textPrimary, 
    flex: 1,
    textAlign: 'right' // <--- CHANGED: Arabic Alignment
},
rowSub: { 
    fontSize: 12, 
    fontFamily: 'Tajawal-Regular', 
    color: COLORS.textSecondary, 
    marginTop: 4,
    textAlign: 'right' // <--- CHANGED: Arabic Alignment
},
nameContainer: { width: '100%', alignItems: 'center', gap: 15, marginTop: Platform.OS === 'ios' ? 20 : 40 },
  bigInput: { width: '100%', fontSize: 26, fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, borderBottomWidth: 2, borderBottomColor: COLORS.accentGreen, paddingVertical: 10, textAlign: 'center' },
  inputHint: { color: COLORS.textDim, fontSize: 14, fontFamily: 'Tajawal-Regular' },
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