import React, { useMemo, useEffect, useRef, useState } from 'react';
import { 
  View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, 
  Dimensions, Image, Pressable, Animated, Easing, Platform, LayoutAnimation, UIManager
} from 'react-native';
import { FontAwesome5, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Context & Utilities
import { useTheme } from '../../context/ThemeContext';
import { getClaimData } from '../../utils/claimMapper';
import { getOptimizedImage } from '../../utils/imageOptimizerr';

// Components
import FullImageViewer from '../common/FullImageViewer';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height, width } = Dimensions.get('window');

// -------------------------------------------------------------
// HELPER: SAFE PRICE FORMATTER
// -------------------------------------------------------------
const formatPrice = (price) => {
    if (!price) return null;
    if (typeof price === 'object') {
        if (price.min && price.max && price.min !== price.max) return `${price.min} - ${price.max}`;
        return price.min || price.max || null;
    }
    return price;
};

// -------------------------------------------------------------
// BENTO TILE: DATA QUEST GAMIFICATION ENGINE (Animated)
// -------------------------------------------------------------
const QuestTile = ({ label, value, icon, onEdit, isMissing, unit = "", color }) => {
  const { colors: C } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isMissing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
      ).start();
    }
  }, [isMissing, pulseAnim]);

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.94, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();

  if (isMissing) {
    return (
      <TouchableOpacity activeOpacity={1} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onEdit} style={{ flex: 1 }}>
        <Animated.View style={[styles.questCard, { transform:[{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }]}>
          <LinearGradient colors={['rgba(252, 185, 0, 0.15)', 'rgba(252, 185, 0, 0.05)']} style={styles.questGradient}>
             <View style={[styles.iconBlurCircle, { backgroundColor: C.gold + '2A' }]}>
               <FontAwesome5 name={icon} size={14} color={C.gold} />
             </View>
             <Text style={[styles.questAlertText, { color: C.gold }]}>{label} مطلوب</Text>
             <Text style={[styles.questCallAction, { color: C.textPrimary }]}>ساهم واربح 50 نقطة</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onEdit} style={{ flex: 1 }}>
        <View style={[styles.statTile, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.statHeader}>
                <Text style={[styles.statLabel, { color: C.textDim }]}>{label}</Text>
                <FontAwesome5 name={icon} size={14} color={color || C.accentGreen} />
            </View>
            <View style={styles.statValueBox}>
                <Text style={[styles.statValueNum, { color: color || C.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                {value}
                </Text>
                {!!unit && <Text style={[styles.statUnit, { color: color || C.textPrimary }]}>{unit}</Text>}
            </View>
            <View style={[styles.editIconBadge, { backgroundColor: C.background }]}>
                <Feather name="edit-2" size={10} color={C.textDim} />
            </View>
        </View>
    </TouchableOpacity>
  );
};

// -------------------------------------------------------------
// MAIN: 2026 PREMIUM DETAILED MODAL
// -------------------------------------------------------------
export default function CatalogDetailModal({ visible, onClose, product, onContribute }) {
  const { colors: C } = useTheme();
  
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const[isIngredientsExpanded, setIsIngredientsExpanded] = useState(false); // NEW STATE ADDED HERE
  
  const scrollY = useRef(new Animated.Value(0)).current;

  const executeBounty = (field) => {
    if (typeof onContribute === 'function') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onContribute(product, field);
    }
  };

  const ingredientsMatrix = useMemo(() => {
    if (!product?.ingredients) return[];
    return product.ingredients.split(',').map(i => i.trim()).filter(i => i.length > 0);
  },[product]);

  if (!product) return null;

  const displayPrice = formatPrice(product.price);
  const isIngredientsMissing = ingredientsMatrix.length === 0;

  const heroImageScale = scrollY.interpolate({
    inputRange:[-150, 0, 150],     
    outputRange:[1.15, 1, 0.85],   
    extrapolate: 'clamp'
  });
  
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, 150],           
    outputRange:[0, 40],           
    extrapolate: 'clamp'
  });

  const toggleIngredients = () => {
    // Smooth expanding animation native to iOS/Android
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsIngredientsExpanded(!isIngredientsExpanded);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.appCanvasOverlay}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        
        <View style={[styles.liquidSheet, { backgroundColor: C.background }]}>
          
          <View style={styles.topNotchContainer}>
             <View style={[styles.liquidNotch, { backgroundColor: C.textDim + '30' }]} />
          </View>
          
          <Animated.ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.canvasContent}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
          >
            
            {/* 1. HERO AURA & PRODUCT */}
            <View style={styles.immersiveHeroSection}>
              <View style={[styles.auraBackglow, { backgroundColor: C.accentGreen + '1A' }]} />
              
              <TouchableOpacity activeOpacity={0.9} onPress={() => setIsViewerVisible(true)} style={styles.productStage}>
                <Animated.View style={[styles.productStageInner, { transform:[{ scale: heroImageScale }, { translateY: heroTranslateY }] }]}>
                    <Image 
                        source={{ uri: getOptimizedImage(product.image, 600) }} 
                        style={styles.productRender} 
                        resizeMode="contain" 
                    />
                </Animated.View>
                <View style={styles.stageExpandHint}>
                  <Ionicons name="scan" size={16} color="rgba(255,255,255,0.8)" />
                </View>
              </TouchableOpacity>
            </View>

            {/* 2. TITLE BLOCK */}
            <View style={[styles.bentoIdentityBox, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={styles.metaToolbarRow}>
                    <TouchableOpacity onPress={() => executeBounty('country')} style={[styles.microChip, { backgroundColor: C.background }]}>
                        <Ionicons name="earth" size={12} color={C.textSecondary} />
                        <Text style={[styles.microChipText, { color: C.textSecondary }]}>{product.country || 'أضف منشأ'}</Text>
                    </TouchableOpacity>
                    
                    <View style={[styles.microChip, { backgroundColor: C.accentGreen + '1A', borderColor: C.accentGreen + '40', borderWidth: 1 }]}>
                        <Text style={[styles.microChipText, { color: C.accentGreen }]}>{product.category?.label}</Text>
                        <FontAwesome5 name={product.category?.icon || 'box'} size={12} color={C.accentGreen} />
                    </View>
                </View>

                <View style={styles.titleReadout}>
                    <Text style={[styles.brandSigniture, { color: C.accentGreen }]}>{product.brand}</Text>
                    <Text style={[styles.grandProductName, { color: C.textPrimary }]}>{product.name}</Text>
                </View>
            </View>

            {/* 3. STATS BENTO ROW */}
            <View style={styles.bentoQuestsRow}>
              <QuestTile 
                label="تسعير السوق" value={displayPrice} icon="money-bill-alt" unit="د.ج" 
                isMissing={!displayPrice} color={C.primary} onEdit={() => executeBounty('price')} 
              />
              <QuestTile 
                label="الكمية الإجمالية" value={product.quantity} icon="pump-soap" 
                isMissing={!product.quantity} color={C.info} onEdit={() => executeBounty('quantity')} 
              />
            </View>

            {/* 4. DUAL CLAIM / TARGET AUDIENCE PANES */}
            <View style={[styles.unifiedClaimsBoard, { borderColor: C.border, backgroundColor: C.card + '50' }]}>
                {/* Product Promises */}
                <View style={styles.insightSector}>
                    <View style={styles.insightHeader}>
                        <TouchableOpacity onPress={() => executeBounty('marketingClaims')} style={[styles.plusNode, { backgroundColor: C.card, borderColor: C.border }]}><Feather name="plus" size={14} color={C.textPrimary} /></TouchableOpacity>
                        <Text style={[styles.insightTitle, { color: C.textPrimary }]}>خصائص ومميزات</Text>
                    </View>
                    <View style={styles.tagStream}>
                        {product.marketingClaims?.length > 0 ? product.marketingClaims.map((id, i) => {
                            const d = getClaimData(id);
                            return (
                                <View key={`mc-${i}`} style={[styles.coloredPill, { backgroundColor: d.color + '18', borderColor: d.color + '50' }]}>
                                    <FontAwesome5 name={d.icon} size={11} color={d.color} style={{ marginLeft: 8 }} />
                                    <Text style={[styles.coloredPillText, { color: d.color }]}>{d.label}</Text>
                                </View>
                            );
                        }) : (
                            <TouchableOpacity onPress={() => executeBounty('marketingClaims')} style={[styles.hollowTrigger, { borderColor: C.gold + '80' }]}>
                                <Text style={[styles.hollowTriggerText, { color: C.gold }]}>أكمل مميزات العبوة ✨</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={[styles.hrDivLine, { backgroundColor: C.border }]} />

                {/* Audiences */}
                <View style={styles.insightSector}>
                    <View style={styles.insightHeader}>
                        <TouchableOpacity onPress={() => executeBounty('targetTypes')} style={[styles.plusNode, { backgroundColor: C.card, borderColor: C.border }]}><Feather name="plus" size={14} color={C.textPrimary} /></TouchableOpacity>
                        <Text style={[styles.insightTitle, { color: C.textPrimary }]}>يوصى به لمن؟</Text>
                    </View>
                    <View style={styles.tagStream}>
                        {product.targetTypes?.length > 0 ? product.targetTypes.map((t, i) => (
                            <View key={`tt-${i}`} style={[styles.stealthPill, { backgroundColor: C.card, borderColor: C.border }]}>
                                <Text style={[styles.stealthPillText, { color: C.textSecondary }]}>{t}</Text>
                            </View>
                        )) : (
                            <TouchableOpacity onPress={() => executeBounty('targetTypes')} style={[styles.hollowTrigger, { borderColor: C.gold + '80' }]}>
                                <Text style={[styles.hollowTriggerText, { color: C.gold }]}>أضف أنواع البشرة المناسبة ✨</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* 5. THE INCI MATRIX (EXPANDABLE) */}
            <View style={[styles.bentoLabCard, { borderColor: C.border, backgroundColor: C.card + '20' }]}>
              <View style={styles.insightHeader}>
                  <TouchableOpacity onPress={() => executeBounty('ingredients')} style={[styles.plusNode, { backgroundColor: C.border }]}><Feather name="edit-2" size={14} color={C.textPrimary} /></TouchableOpacity>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                      <Text style={[styles.insightTitle, { color: C.textPrimary }]}>الشيفرة الكيميائية (INCI)</Text>
                      <View style={[styles.scienceIndicator, { backgroundColor: C.accentGreen + '2A' }]}><Text style={{ color: C.accentGreen, fontSize: 10, fontFamily:'Tajawal-Bold' }}>مختصر</Text></View>
                  </View>
              </View>

              {isIngredientsMissing ? (
                  <TouchableOpacity onPress={() => executeBounty('ingredients')} style={[styles.hologramBountyContainer, { borderColor: C.gold, backgroundColor: C.gold + '10' }]}>
                      <View style={styles.hologramIcon}><Ionicons name="camera-outline" size={32} color={C.gold} /></View>
                      <Text style={[styles.hologramHeader, { color: C.textPrimary }]}>لا نملك قائمة المكونات 😞</Text>
                      <Text style={[styles.hologramBody, { color: C.textDim }]}>صوري الكلمات الإنجليزية خلف العبوة لاستخراجها فوراً.</Text>
                      <View style={[styles.hologramAction, { backgroundColor: C.gold }]}><Text style={styles.hologramActionTxt}>تصوير وإضافة المكونات</Text></View>
                  </TouchableOpacity>
              ) : (
                  <View style={styles.sciNetworkBoard}>
                      {/* numberOfLines becomes undefined when expanded, removing the limit */}
                      <Text style={[styles.compactIngredientsText, { color: C.textSecondary }]} numberOfLines={isIngredientsExpanded ? undefined : 3}>
                          {ingredientsMatrix.join('  •  ')}
                      </Text>
                      <TouchableOpacity activeOpacity={0.7} style={styles.expandInlineHint} onPress={toggleIngredients}>
                         <Text style={[styles.expandInlineText, { color: C.accentGreen }]}>
                            {isIngredientsExpanded ? 'إخفاء المكونات' : 'عرض القائمة بالكامل'}
                         </Text>
                         <FontAwesome5 name={isIngredientsExpanded ? 'chevron-up' : 'chevron-down'} size={10} color={C.accentGreen} />
                      </TouchableOpacity>
                  </View>
              )}
            </View>

            {/* Spacer for Action Footer */}
            <View style={{ height: 160 }} />
          </Animated.ScrollView>

          {/* FLOATING ACTION CTA */}
          <View style={styles.gradientFadeArea} pointerEvents="box-none">
              <LinearGradient colors={['transparent', C.background, C.background]} style={StyleSheet.absoluteFill} locations={[0, 0.4, 1]} pointerEvents="none" />
              
              <TouchableOpacity 
                activeOpacity={isIngredientsMissing ? 1 : 0.8}
                style={[
                    styles.primaryArchitectBtn, 
                    isIngredientsMissing ? styles.btnDisabledOutlines : { backgroundColor: C.accentGreen, elevation: 12, shadowColor: C.accentGreen }
                ]}
                onPress={() => {
                   if(isIngredientsMissing) {
                      executeBounty('ingredients'); 
                   } else {
                      /* EXECUTE REAL OILGUARD NAVIGATION HERE */
                   }
                }}
              >
                  {isIngredientsMissing ? (
                     <View style={[styles.disabledOverlayFill, { backgroundColor: C.background, borderColor: C.textDim + '50' }]}>
                         <MaterialCommunityIcons name="robot-dead-outline" size={24} color={C.textDim} />
                         <Text style={[styles.btnArchitectText, { color: C.textDim }]}>أضيفي المكونات أولاً للتفعيل</Text>
                     </View>
                  ) : (
                     <LinearGradient colors={[C.accentGreen, '#2E8062']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.architectGradients}>
                        <MaterialCommunityIcons name="robot-outline" size={26} color={C.textOnAccent} />
                        <Text style={[styles.btnArchitectText, { color: C.textOnAccent }]}>تفعيل فحص التركيبة</Text>
                        <FontAwesome5 name="chevron-left" size={14} color={C.textOnAccent} />
                     </LinearGradient>
                  )}
              </TouchableOpacity>
          </View>
        </View>
      </View>

      <FullImageViewer visible={isViewerVisible} imageUrl={product.image} onClose={() => setIsViewerVisible(false)} />
    </Modal>
  );
}

// -------------------------------------------------------------
// HYPER-STYLED STATE OF ART 2026 UI
// -------------------------------------------------------------
const styles = StyleSheet.create({
  appCanvasOverlay: { flex: 1, backgroundColor: 'rgba(5, 10, 15, 0.75)', justifyContent: 'flex-end' },
  liquidSheet: { height: height * 0.93, borderTopLeftRadius: 42, borderTopRightRadius: 42, overflow: 'hidden' },
  topNotchContainer: { width: '100%', alignItems: 'center', position: 'absolute', top: 12, zIndex: 10 },
  liquidNotch: { width: 55, height: 6, borderRadius: 10 },
  
  canvasContent: { paddingHorizontal: 22, paddingTop: 10 },
  
  immersiveHeroSection: { alignItems: 'center', height: 280, justifyContent: 'center', marginTop: 25 },
  auraBackglow: { position: 'absolute', width: 220, height: 180, borderRadius: 200, transform:[{ scaleY: 0.7 }], opacity: 0.6, alignSelf: 'center' },
  productStage: { width: 220, height: 240, justifyContent: 'center', alignItems: 'center' },
  productStageInner: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  productRender: { width: '85%', height: '85%' },
  stageExpandHint: { position: 'absolute', right: 20, bottom: 0, zIndex: 3, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
  
  bentoIdentityBox: { width: '100%', borderRadius: 28, padding: 22, borderWidth: 1, marginTop: -20, marginBottom: 15, zIndex: 5, elevation: 8, shadowColor: '#000', shadowOffset: {width: 0, height: 5}, shadowOpacity: 0.15, shadowRadius: 10 },
  metaToolbarRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 20 },
  microChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  microChipText: { fontFamily: 'Tajawal-Medium', fontSize: 12 },
  titleReadout: { alignItems: 'flex-end' },
  brandSigniture: { fontFamily: 'Tajawal-ExtraBold', fontSize: 13, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 5 },
  grandProductName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24, textAlign: 'right', lineHeight: 32 },

  bentoQuestsRow: { flexDirection: 'row-reverse', gap: 14, marginBottom: 15 },
  statTile: { padding: 20, borderRadius: 28, borderWidth: 1, minHeight: 110, justifyContent: 'space-between' },
  statHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
  statValueBox: { flexDirection: 'row-reverse', alignItems: 'baseline', marginTop: 10 },
  statValueNum: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24, letterSpacing: -0.5 },
  statUnit: { fontFamily: 'Tajawal-Medium', fontSize: 12, marginRight: 5, opacity: 0.7 },
  editIconBadge: { position: 'absolute', bottom: 15, left: 15, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  
  questCard: { borderRadius: 28, borderWidth: 1.5, borderColor: 'rgba(252, 185, 0, 0.4)', overflow: 'hidden', minHeight: 110 },
  questGradient: { flex: 1, padding: 18, justifyContent: 'center', alignItems: 'center' },
  iconBlurCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  questAlertText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 12, marginBottom: 4 },
  questCallAction: { fontFamily: 'Tajawal-Bold', fontSize: 10, textDecorationLine: 'underline' },

  unifiedClaimsBoard: { borderRadius: 32, padding: 25, borderWidth: 1, marginBottom: 15 },
  hrDivLine: { height: 1, width: '100%', marginVertical: 20 },
  insightSector: { width: '100%' },
  insightHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  plusNode: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  insightTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16 },
  tagStream: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  coloredPill: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  coloredPillText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 12 },
  stealthPill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  stealthPillText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
  hollowTrigger: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1 },
  hollowTriggerText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },

  bentoLabCard: { padding: 25, borderRadius: 32, borderWidth: 1 },
  scienceIndicator: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sciNetworkBoard: { marginTop: 5 },
  compactIngredientsText: { fontFamily: 'Tajawal-Medium', fontSize: 13, lineHeight: 22, textAlign: 'right' },
  expandInlineHint: { flexDirection: 'row', justifyContent: 'center', gap: 8, alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 15 },
  expandInlineText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 12 },
  
  hologramBountyContainer: { padding: 25, marginTop: 15, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1.5, alignItems: 'center' },
  hologramIcon: { marginBottom: 15, opacity: 0.8 },
  hologramHeader: { fontFamily: 'Tajawal-ExtraBold', fontSize: 15, marginBottom: 8 },
  hologramBody: { fontFamily: 'Tajawal-Regular', fontSize: 12, textAlign: 'center', lineHeight: 20, paddingHorizontal: 15, marginBottom: 20 },
  hologramAction: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 15 },
  hologramActionTxt: { fontFamily: 'Tajawal-ExtraBold', fontSize: 13, color: '#000' },

  gradientFadeArea: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, justifyContent: 'flex-end', padding: 25, paddingBottom: Platform.OS === 'ios' ? 45 : 30 },
  primaryArchitectBtn: { height: 68, borderRadius: 24, width: '100%', overflow: 'hidden' },
  btnDisabledOutlines: { borderWidth: 1, borderStyle: 'dashed' },
  disabledOverlayFill: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10 },
  architectGradients: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 14 },
  btnArchitectText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16 }
});