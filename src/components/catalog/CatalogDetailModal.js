import React, { useMemo, useEffect, useRef, useState } from 'react';
import { 
  View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Dimensions, Image, Pressable, Animated, Easing, Platform, LayoutAnimation
} from 'react-native';
import { FontAwesome5, Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

// Context & Utilities
import { useTheme } from '../../context/ThemeContext';
import { useRTL } from '../../hooks/useRTL';
import { getClaimData } from '../../utils/claimMapper';
import { getOptimizedImage } from '../../utils/imageOptimizerr';
import { getPointsForField } from '../../utils/gamificationEngine';
import { basicSkinTypes, basicScalpTypes, commonConditions } from '../../data/allergiesandconditions';
import { t, language } from '../../i18n';

// Components
import FullImageViewer from '../common/FullImageViewer';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatPrice = (price) => {
  if (!price) return null;
  if (typeof price === 'number' || typeof price === 'string') {
      return price > 0 ? price.toString() : null;
  }
  if (typeof price === 'object') {
      const min = price.min;
      const max = price.max;
      if (!min && !max) return null; 
      if (min === max || (!min && max) || (min && !max)) {
          return (min || max).toString();
      }
      return `${min} - ${max}`;
  }
  return null;
};

// Helper function to get display name for target type
const getTargetTypeDisplay = (targetId, language) => {
  // Check skin types
  const skinType = basicSkinTypes.find(t => t.id === targetId);
  if (skinType) return skinType.label[language] || skinType.label.en;
  
  // Check scalp types
  const scalpType = basicScalpTypes.find(t => t.id === targetId);
  if (scalpType) return scalpType.label[language] || scalpType.label.en;
  
  // Check conditions
  const condition = commonConditions.find(c => c.id === targetId);
  if (condition) return condition.name[language] || condition.name.en;
  
  // Fallback: format the ID
  return targetId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const QuestTile = ({ label, value, icon, onEdit, isMissing, unit = "", color, fieldName }) => {
  const { colors: C } = useTheme();
  const rtl = useRTL();

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
    const earnedPoints = getPointsForField(fieldName);
    
    return (
      <TouchableOpacity 
        activeOpacity={1} 
        onPressIn={handlePressIn} 
        onPressOut={handlePressOut} 
        onPress={onEdit} 
        style={{ flex: 1 }}
      >
        <Animated.View style={[styles.questCard, { transform:[{ scale: Animated.multiply(scaleAnim, pulseAnim) }] }]}>
          <LinearGradient colors={['rgba(252, 185, 0, 0.15)', 'rgba(252, 185, 0, 0.05)']} style={styles.questGradient}>
             <View style={[styles.iconBlurCircle, { backgroundColor: C.gold + '2A' }]}>
               <FontAwesome5 name={icon} size={14} color={C.gold} />
             </View>
             <Text style={[styles.questAlertText, { color: C.gold, textAlign: rtl.textAlign }]}>{label} مطلوب</Text>
             <Text style={[styles.questCallAction, { color: C.textPrimary, textAlign: rtl.textAlign }]}>ساهم واربح {earnedPoints} نقطة</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onEdit} style={{ flex: 1 }}>
        <View style={[styles.statTile, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.statHeader, { flexDirection: rtl.flexDirection }]}>
                <Text style={[styles.statLabel, { color: C.textDim, textAlign: rtl.textAlign }]}>{label}</Text>
                <FontAwesome5 name={icon} size={14} color={color || C.accentGreen} />
            </View>
            <View style={[styles.statValueBox, { flexDirection: rtl.flexDirection }]}>
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

// --- Staggered Animation Component (matching AddProductModal) ---
const StaggeredView = ({ children, index }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(anim, {
            toValue: 1,
            friction: 7,
            tension: 50,
            delay: 100 + index * 50,
            useNativeDriver: true,
        }).start();
    }, [index]);

    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
    return (
        <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
            {children}
        </Animated.View>
    );
};

export default function CatalogDetailModal({ visible, onClose, product, onContribute }) {
  const { colors: C } = useTheme();
  const rtl = useRTL();
  const router = useRouter(); 
  
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [isIngredientsExpanded, setIsIngredientsExpanded] = useState(false); 
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Animations - matching AddProductModal pattern
  const animState = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(animState, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(animState, {
      toValue: 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const executeBounty = async (field) => {
    if (typeof onContribute === 'function') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        try {
            const result = await onContribute(product, field);
            
            // Show pending confirmation instead of points alert
            if (result && result.isPending) {
                AlertService.success(
                    t('contribution_submitted', language),
                    t('contribution_pending_review_message', language)
                );
            }
        } catch (error) {
            console.error('Bounty submission error:', error);
            AlertService.error(
                t('error', language),
                t('contribution_submit_error', language)
            );
        }
    }
};

  const ingredientsMatrix = useMemo(() => {
    if (!product?.ingredients) return[];
    return product.ingredients.split(',').map(i => i.trim()).filter(i => i.length > 0);
  },[product]);

  if (!product) return null;

  const displayPrice = formatPrice(product.price);
  const isIngredientsMissing = ingredientsMatrix.length === 0;

  const overlayOpacity = animState.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const modalTranslateY = animState.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] });
  
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsIngredientsExpanded(!isIngredientsExpanded);
  };

  return (
    <>
      <Modal 
        visible={visible} 
        transparent 
        animationType="none" 
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          
          <Animated.View 
            style={[
              styles.liquidSheet, 
              { 
                backgroundColor: C.background, 
                transform: [{ translateY: modalTranslateY }] 
              }
            ]}
          >
            <View style={styles.topNotchContainer}>
              <View style={[styles.liquidNotch, { backgroundColor: C.textDim + '30' }]} />
            </View>
            
            <Animated.ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={styles.canvasContent}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
              scrollEventThrottle={16}
            >
              {/* Hero Section - Staggered */}
              <StaggeredView index={0}>
                <View style={styles.immersiveHeroSection}>
                  <View style={[styles.auraBackglow, { backgroundColor: C.accentGreen + '1A' }]} />
                  
                  <TouchableOpacity 
                    activeOpacity={0.9} 
                    onPress={() => setIsViewerVisible(true)} 
                    style={styles.productStage}
                  >
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
              </StaggeredView>

              {/* Identity Box - Staggered */}
              <StaggeredView index={1}>
                <View style={[styles.bentoIdentityBox, { backgroundColor: C.card, borderColor: C.border }]}>
                  <View style={[styles.metaToolbarRow, { flexDirection: rtl.flexDirection }]}>
                    <TouchableOpacity 
                      onPress={() => executeBounty('country')} 
                      style={[styles.microChip, { backgroundColor: C.background, flexDirection: rtl.flexDirection }]}
                    >
                      <Ionicons name="earth" size={12} color={C.textSecondary} />
                      <Text style={[styles.microChipText, { color: C.textSecondary, textAlign: rtl.textAlign }]}>
                        {product.country || 'أضف منشأ'}
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={[styles.microChip, { backgroundColor: C.accentGreen + '1A', borderColor: C.accentGreen + '40', borderWidth: 1, flexDirection: rtl.flexDirection }]}>
                      <Text style={[styles.microChipText, { color: C.accentGreen, textAlign: rtl.textAlign }]}>
                        {product.category?.label}
                      </Text>
                      <FontAwesome5 name={product.category?.icon || 'box'} size={12} color={C.accentGreen} />
                    </View>
                  </View>

                  <View style={[styles.titleReadout, { alignItems: rtl.isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.brandSigniture, { color: C.accentGreen, textAlign: rtl.textAlign }]}>
                      {product.brand}
                    </Text>
                    <Text style={[styles.grandProductName, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                      {product.name}
                    </Text>
                  </View>
                </View>
              </StaggeredView>

              {/* Quests Row - Staggered */}
              <StaggeredView index={2}>
                <View style={[styles.bentoQuestsRow, { flexDirection: rtl.flexDirection }]}>
                  <QuestTile 
                    label="سعر تقريبي" 
                    value={displayPrice} 
                    icon="money-bill-alt" 
                    unit="د.ج" 
                    isMissing={!displayPrice} 
                    color={C.textPrimary} 
                    onEdit={() => executeBounty('price')} 
                    fieldName="price"
                  />
                  <QuestTile 
                    label="الحجم (مل)" 
                    value={product.quantity} 
                    icon="pump-soap" 
                    isMissing={!product.quantity} 
                    color={C.textPrimary} 
                    onEdit={() => executeBounty('quantity')} 
                    fieldName="quantity"
                  />
                </View>
              </StaggeredView>

              {/* Claims Board - Staggered */}
              <StaggeredView index={3}>
                <View style={[styles.unifiedClaimsBoard, { borderColor: C.border, backgroundColor: C.card + '50' }]}>
                  <View style={styles.insightSector}>
                    <View style={[styles.insightHeader, { flexDirection: rtl.flexDirection }]}>
                      <TouchableOpacity 
                        onPress={() => executeBounty('marketingClaims')} 
                        style={[styles.plusNode, { backgroundColor: C.card, borderColor: C.border }]}
                      >
                        <Feather name="plus" size={14} color={C.textPrimary} />
                      </TouchableOpacity>
                      <Text style={[styles.insightTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                        خصائص ومميزات
                      </Text>
                    </View>
                    <View style={[styles.tagStream, { flexDirection: rtl.flexDirection }]}>
                      {product.marketingClaims?.length > 0 ? product.marketingClaims.map((id, i) => {
                        const d = getClaimData(id);
                        return (
                          <View 
                            key={`mc-${i}`} 
                            style={[styles.coloredPill, { backgroundColor: d.color + '18', borderColor: d.color + '50', flexDirection: rtl.flexDirection }]}
                          >
                            <FontAwesome5 name={d.icon} size={11} color={d.color} style={{ marginHorizontal: 4 }} />
                            <Text style={[styles.coloredPillText, { color: d.color, textAlign: rtl.textAlign }]}>
                              {d.label}
                            </Text>
                          </View>
                        );
                      }) : (
                        <TouchableOpacity 
                          onPress={() => executeBounty('marketingClaims')} 
                          style={[styles.hollowTrigger, { borderColor: C.gold + '80' }]}
                        >
                          <Text style={[styles.hollowTriggerText, { color: C.gold, textAlign: rtl.textAlign }]}>
                            أكمل مميزات العبوة ✨
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={[styles.hrDivLine, { backgroundColor: C.border }]} />

                  <View style={styles.insightSector}>
                    <View style={[styles.insightHeader, { flexDirection: rtl.flexDirection }]}>
                      <TouchableOpacity 
                        onPress={() => executeBounty('targetTypes')} 
                        style={[styles.plusNode, { backgroundColor: C.card, borderColor: C.border }]}
                      >
                        <Feather name="plus" size={14} color={C.textPrimary} />
                      </TouchableOpacity>
                      <Text style={[styles.insightTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                        {t('catalog_recommended_for', language)}
                      </Text>
                    </View>
                    <View style={[styles.tagStream, { flexDirection: rtl.flexDirection }]}>
                      {product.targetTypes?.length > 0 ? product.targetTypes.map((t, i) => (
                        <View 
                          key={`tt-${i}`} 
                          style={[styles.stealthPill, { backgroundColor: C.card, borderColor: C.border, flexDirection: rtl.flexDirection }]}
                        >
                          <Text style={[styles.stealthPillText, { color: C.textSecondary, textAlign: rtl.textAlign }]}>
                            {getTargetTypeDisplay(t, language)}
                          </Text>
                        </View>
                      )) : (
                        <TouchableOpacity 
                          onPress={() => executeBounty('targetTypes')} 
                          style={[styles.hollowTrigger, { borderColor: C.gold + '80' }]}
                        >
                          <Text style={[styles.hollowTriggerText, { color: C.gold, textAlign: rtl.textAlign }]}>
                            {t('catalog_add_skin_types', language)}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              </StaggeredView>

              {/* Lab Card (Ingredients) - Staggered */}
              <StaggeredView index={4}>
                <View style={[styles.bentoLabCard, { borderColor: C.border, backgroundColor: C.card + '20' }]}>
                  <View style={[styles.insightHeader, { flexDirection: rtl.flexDirection }]}>
                    <TouchableOpacity 
                      onPress={() => executeBounty('ingredients')} 
                      style={[styles.plusNode, { borderColor: C.border }]}
                    >
                      <Feather name="edit-2" size={14} color={C.textPrimary} />
                    </TouchableOpacity>
                    <View style={{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 10 }}>
                      <Text style={[styles.insightTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                        الشيفرة الكيميائية (INCI)
                      </Text>
                      <View style={[styles.scienceIndicator, { backgroundColor: C.accentGreen + '2A' }]}>
                        <Text style={{ color: C.accentGreen, fontSize: 10, fontFamily:'Tajawal-Bold' }}>
                          مختصر
                        </Text>
                      </View>
                    </View>
                  </View>

                  {isIngredientsMissing ? (
                    <TouchableOpacity 
                      onPress={() => executeBounty('ingredients')} 
                      style={[styles.hologramBountyContainer, { borderColor: C.gold, backgroundColor: C.gold + '10' }]}
                    >
                      <View style={styles.hologramIcon}>
                        <Ionicons name="camera-outline" size={32} color={C.gold} />
                      </View>
                      <Text style={[styles.hologramHeader, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                        لا نملك قائمة المكونات 😞
                      </Text>
                      <Text style={[styles.hologramBody, { color: C.textDim, textAlign: rtl.textAlign }]}>
                        صوري الكلمات الإنجليزية خلف العبوة لاستخراجها فوراً.
                      </Text>
                      <View style={[styles.hologramAction, { backgroundColor: C.gold }]}>
                        <Text style={styles.hologramActionTxt}>تصوير وإضافة المكونات</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.sciNetworkBoard}>
                      <Text 
                        style={[styles.compactIngredientsText, { color: C.textSecondary, textAlign: rtl.textAlign }]} 
                        numberOfLines={isIngredientsExpanded ? undefined : 3}
                      >
                        {ingredientsMatrix.join('  •  ')}
                      </Text>
                      <TouchableOpacity 
                        activeOpacity={0.7} 
                        style={[styles.expandInlineHint, { flexDirection: rtl.flexDirection }]} 
                        onPress={toggleIngredients}
                      >
                        <Text style={[styles.expandInlineText, { color: C.accentGreen, textAlign: rtl.textAlign }]}>
                          {isIngredientsExpanded ? 'إخفاء المكونات' : 'عرض القائمة بالكامل'}
                        </Text>
                        <FontAwesome5 name={isIngredientsExpanded ? 'chevron-up' : 'chevron-down'} size={10} color={C.accentGreen} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </StaggeredView>

              <View style={{ height: 160 }} />
            </Animated.ScrollView>

            <View style={styles.gradientFadeArea} pointerEvents="box-none">
              <LinearGradient 
                colors={['transparent', C.background, C.background]} 
                style={StyleSheet.absoluteFill} 
                locations={[0, 0.4, 1]} 
                pointerEvents="none" 
              />
              
              <TouchableOpacity 
                activeOpacity={isIngredientsMissing ? 1 : 0.8}
                style={[
                  styles.primaryArchitectBtn, 
                  isIngredientsMissing ? styles.btnDisabledOutlines : { backgroundColor: C.accentGreen, elevation: 12, shadowColor: C.accentGreen }
                ]}
                disabled={isNavigating}
                onPress={() => {
                  if (isIngredientsMissing) {
                      executeBounty('ingredients'); 
                  } else {
                      setIsNavigating(true); 
                      setTimeout(() => {
                          if (typeof onClose === 'function') onClose();
                          setTimeout(() => {
                              setIsNavigating(false); 
                              router.push({
                                  pathname: '/oilguard',
                                  params: {
                                      autoStart: 'true',
                                      ingredients: product.ingredients,
                                      category: product.category?.id || 'other',
                                      productName: product.name || '', 
                                      brand: product.brand || '',
                                      imageUri: product.image || '',
                                      marketingClaims: JSON.stringify(product.marketingClaims || [])
                                  }
                              });
                          }, 300);
                      }, 400); 
                  }
                }}
              >
                {isNavigating ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color={C.textOnAccent} size="small" />
                  </View>
                ) : isIngredientsMissing ? (
                  <View style={[styles.disabledOverlayFill, { backgroundColor: C.background, borderColor: C.textDim + '50', flexDirection: rtl.flexDirection }]}>
                    <MaterialCommunityIcons name="robot-dead-outline" size={24} color={C.textDim} />
                    <Text style={[styles.btnArchitectText, { color: C.textDim, textAlign: rtl.textAlign }]}>
                      أضيفي المكونات أولاً للتفعيل
                    </Text>
                  </View>
                ) : (
                  <LinearGradient 
                    colors={[C.accentGreen, '#2E8062']} 
                    start={{x:0,y:0}} 
                    end={{x:1,y:1}} 
                    style={[styles.architectGradients, { flexDirection: rtl.flexDirection }]}
                  >
                    <MaterialCommunityIcons name="robot-outline" size={26} color={C.textOnAccent} />
                    <Text style={[styles.btnArchitectText, { color: C.textOnAccent, textAlign: rtl.textAlign }]}>
                      فحص المنتج
                    </Text>
                    <FontAwesome5 name="chevron-left" size={14} color={C.textOnAccent} />
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      <FullImageViewer 
        visible={isViewerVisible} 
        imageUrl={product.image} 
        onClose={() => setIsViewerVisible(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 15, 0.85)',
    justifyContent: 'flex-end',
  },
  liquidSheet: {
    height: SCREEN_HEIGHT * 0.93,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  topNotchContainer: {
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    top: 12,
    zIndex: 10,
  },
  liquidNotch: {
    width: 55,
    height: 6,
    borderRadius: 10,
  },
  canvasContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  immersiveHeroSection: {
    alignItems: 'center',
    height: 280,
    justifyContent: 'center',
    marginTop: 25,
  },
  auraBackglow: {
    position: 'absolute',
    width: 220,
    height: 180,
    borderRadius: 200,
    transform: [{ scaleY: 0.7 }],
    opacity: 0.6,
    alignSelf: 'center',
  },
  productStage: {
    width: 220,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productStageInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  productRender: {
    width: '85%',
    height: '85%',
  },
  stageExpandHint: {
    position: 'absolute',
    right: 20,
    bottom: 0,
    zIndex: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  },
  bentoIdentityBox: {
    width: '100%',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    marginTop: -20,
    marginBottom: 15,
    zIndex: 5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  metaToolbarRow: {
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  microChip: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  microChipText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
  },
  titleReadout: {
    marginTop: 4,
  },
  brandSigniture: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 5,
  },
  grandProductName: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 24,
    lineHeight: 32,
  },
  bentoQuestsRow: {
    gap: 14,
    marginBottom: 15,
  },
  statTile: {
    padding: 18,
    borderRadius: 28,
    borderWidth: 1,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  statHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12,
  },
  statValueBox: {
    alignItems: 'baseline',
    marginTop: 10,
    gap: 4,
  },
  statValueNum: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 24,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    opacity: 0.7,
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questCard: {
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(252, 185, 0, 0.4)',
    overflow: 'hidden',
    minHeight: 110,
  },
  questGradient: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBlurCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  questAlertText: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 12,
    marginBottom: 4,
  },
  questCallAction: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 10,
    textDecorationLine: 'underline',
  },
  unifiedClaimsBoard: {
    borderRadius: 32,
    padding: 20,
    borderWidth: 1,
    marginBottom: 15,
  },
  hrDivLine: {
    height: 1,
    width: '100%',
    marginVertical: 20,
  },
  insightSector: {
    width: '100%',
  },
  insightHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  plusNode: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightTitle: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 16,
  },
  tagStream: {
    flexWrap: 'wrap',
    gap: 10,
  },
  coloredPill: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  coloredPillText: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 12,
  },
  stealthPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  stealthPillText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12,
  },
  hollowTrigger: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  hollowTriggerText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12,
  },
  bentoLabCard: {
    padding: 20,
    borderRadius: 32,
    borderWidth: 1,
    marginBottom: 15,
  },
  scienceIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sciNetworkBoard: {
    marginTop: 5,
  },
  compactIngredientsText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    lineHeight: 22,
  },
  expandInlineHint: {
    justifyContent: 'center',
    gap: 8,
    alignItems: 'center',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 15,
  },
  expandInlineText: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 12,
  },
  hologramBountyContainer: {
    padding: 20,
    marginTop: 15,
    borderRadius: 20,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    alignItems: 'center',
  },
  hologramIcon: {
    marginBottom: 15,
    opacity: 0.8,
  },
  hologramHeader: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 15,
    marginBottom: 8,
  },
  hologramBody: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    lineHeight: 20,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  hologramAction: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 15,
  },
  hologramActionTxt: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 13,
    color: '#000',
  },
  gradientFadeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
  },
  primaryArchitectBtn: {
    height: 65,
    borderRadius: 24,
    width: '100%',
    overflow: 'hidden',
  },
  btnDisabledOutlines: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  disabledOverlayFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  architectGradients: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  btnArchitectText: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 16,
  },
});