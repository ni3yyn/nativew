// CatalogScreen.js

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, FlatList, TextInput, Text, ActivityIndicator, TouchableOpacity, RefreshControl, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/context/ThemeContext';
import { t, interpolate } from '../../src/i18n/index';
import { useCurrentLanguage } from '../../src/hooks/useCurrentLanguage';
import { useRTL } from '../../src/hooks/useRTL';
import { useAppContext } from '../../src/context/AppContext';

import ProductCard from '../../src/components/catalog/ProductCard';
import CatalogDetailModal from '../../src/components/catalog/CatalogDetailModal';
import CategoryFilter from '../../src/components/catalog/CategoryFilter';
import RewardsBanner from '../../src/components/catalog/RewardsBanner';
import BountyModal from '../../src/components/catalog/BountyModal';
import FilterModal from '../../src/components/catalog/FilterModal';
import AddProductModal from '../../src/components/catalog/AddProductModal';
import CatalogIntro from '../../src/components/catalog/CatalogIntro'; 

import { submitBounty, submitNewProduct } from '../../src/services/bountyService'; 
import { AlertService } from '../../src/services/alertService';
import { CatalogService } from '../../src/services/catalogService';

// Storage keys & Pagination
const CATALOG_INTRO_SEEN_KEY = '@catalog_intro_seen';
const DEV_MODE_KEY = '@dev_mode_enabled'; // For testing
const ITEMS_PER_PAGE = 8; // Lazy loading batch size

const getPriceValue = (price) => {
    if (!price) return null;
    if (typeof price === 'number') return price;
    if (typeof price === 'object') return price.min || price.max || null;
    return parseFloat(price) || null;
};

// Helper to determine if a product is Algerian
const isAlgerianProduct = (product) => {
    if (!product) return false;
    
    const originText = String(
        product.origin || 
        product.country || 
        product.madeIn || 
        (product.brand && product.brand.origin) || 
        ''
    ).toLowerCase();
    
    return (
        originText.includes('algeria') || 
        originText === 'dz' || 
        originText.includes('الجزائر') ||
        product.isLocal === true || 
        product.isAlgerian === true
    );
};

export default function CatalogScreen() {
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  const { userProfile } = useAppContext(); 
  
  const language = useCurrentLanguage();
  const rtl = useRTL();
  const isEn = language === 'en'; 
  const styles = useMemo(() => createStyles(C, rtl, isEn), [C, rtl, isEn]);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);
  const [scrollY] = useState(new Animated.Value(0));
  
  // App States
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState([]);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({ bountiesOnly: false, brand: 'all', sort: 'default' });
  
  // Interaction States
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [bountyState, setBountyState] = useState({ visible: false, product: null, field: '' });
  const [isAddProductVisible, setAddProductVisible] = useState(false);
  const [userPoints, setUserPoints] = useState(userProfile?.points || 0);
  
  // Intro & Dev Mode States
  const [showIntro, setShowIntro] = useState(false);
  const [checkingIntro, setCheckingIntro] = useState(true);
  const [devMode, setDevMode] = useState(false);

  // Lazy Loading / Pagination State
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Animation State for Compare Banner
  const compareBannerAnim = useRef(new Animated.Value(0)).current;
  
  // Animation for Plus Button
  const plusScaleAnim = useRef(new Animated.Value(1)).current;
  const plusPulseAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef(null);

  // 1. Check if intro should be shown
  useEffect(() => {
    const checkIntroStatus = async () => {
      try {
        const devModeEnabled = await AsyncStorage.getItem(DEV_MODE_KEY);
        const isDevMode = devModeEnabled === 'true';
        setDevMode(isDevMode);
        
        if (isDevMode) {
          setShowIntro(true);
          setCheckingIntro(false);
          return;
        }
        
        const hasSeenIntro = await AsyncStorage.getItem(CATALOG_INTRO_SEEN_KEY);
        setShowIntro(hasSeenIntro !== 'true');
      } catch (error) {
        console.error('Error checking intro status:', error);
        setShowIntro(true);
      } finally {
        setCheckingIntro(false);
      }
    };
    
    checkIntroStatus();
  }, []);

  // 2. Sync user points from global context
  useEffect(() => {
      if (userProfile?.points !== undefined) {
          setUserPoints(userProfile.points);
      }
  }, [userProfile?.points]);

  // Data Loading Implementation
  const loadData = useCallback(async (force = false) => {
    try {
      if (force) {
        setSyncing(true);
      }
      
      const data = await CatalogService.fetchCatalog(force);
      
      if (data && data.length > 0) {
        setProducts(data);
      } else {
        const cachedData = await CatalogService.fetchCatalog(false);
        setProducts(cachedData || []);
      }

      setLoading(false);
      setSyncing(false);
      
      if (force) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("❌ loadData failed:", error);
      const cachedData = await CatalogService.fetchCatalog(false);
      setProducts(cachedData || []);
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  // 3. Load catalog data once intro check is clear
  useEffect(() => { 
    if (!showIntro && !checkingIntro) {
      loadData(); 
    }
  }, [showIntro, checkingIntro, loadData]);

  // 4. Smooth Animation trigger for the compare banner
  useEffect(() => {
    Animated.timing(compareBannerAnim, {
      toValue: isCompareMode ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isCompareMode, compareBannerAnim]);

  // Handler Optimizations
  const handleIntroFinish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(CATALOG_INTRO_SEEN_KEY, 'true');
      setShowIntro(false);
      loadData();
    } catch (error) {
      console.error('Error saving intro preference:', error);
      setShowIntro(false);
      loadData();
    }
  }, [loadData]);
  
  const toggleDevMode = useCallback(async () => {
    try {
      const newDevMode = !devMode;
      await AsyncStorage.setItem(DEV_MODE_KEY, newDevMode.toString());
      setDevMode(newDevMode);
      
      AlertService.success(
        'Dev Mode',
        `Dev mode ${newDevMode ? 'enabled' : 'disabled'}. ${newDevMode ? 'Intro will show on next refresh.' : ''}`
      );
      
      if (newDevMode) {
        setShowIntro(true);
      } else {
        const hasSeenIntro = await AsyncStorage.getItem(CATALOG_INTRO_SEEN_KEY);
        if (hasSeenIntro === 'true') setShowIntro(false);
      }
    } catch (error) {
      console.error('Error toggling dev mode:', error);
      AlertService.error('Error', 'Failed to toggle dev mode');
    }
  }, [devMode]);

  const availableBrands = useMemo(() => {
      const brands = new Set(products.map(p => p.brand).filter(Boolean));
      return ['all', ...Array.from(brands).sort()];
  }, [products]);

  // Optimized Filter Logic
  // Inside CatalogScreen.js -> update filteredData definition:

  // Alias maps for fuzzy matching skin types & claims
  const SKIN_TYPE_ALIASES = {
      'بشرة دهنية': ['بشرة دهنية', 'دهنية', 'oily'],
      'بشرة مختلطة': ['بشرة مختلطة', 'مختلطة', 'combo', 'combination'],
      'بشرة عادية': ['بشرة عادية', 'عادية', 'normal'],
      'بشرة حساسة': ['بشرة حساسة', 'حساسة', 'sensitive'],
      'بشرة معرضة للحبوب': ['بشرة معرضة للحبوب', 'معرضة للحبوب', 'حبوب', 'acne', 'acne_prone', 'حب الشباب'],
  };

  const CLAIM_ALIASES = {
      'خالٍ من العطور': ['عطور', 'fragrance', 'perfume', 'unscented'],
      'خالٍ من الكحول': ['كحول', 'alcohol'],
      'غير مسبب للانسداد': ['انسداد', 'comedogenic', 'مسام'],
      'خالٍ من البارابين': ['بارابين', 'paraben'],
      'خالٍ من السلفات': ['سلفات', 'sulfate'],
      'مناسب للبشرة الحساسة': ['حساسة', 'sensitive'],
      'ترطيب عميق': ['ترطيب', 'hydrat'],
      'تفتيح ونضارة': ['تفتيح', 'نضارة', 'brighten', 'glow'],
      'مكافحة الحبوب': ['حبوب', 'حب الشباب', 'acne', 'blemish'],
      'تهدئة الاحمرار': ['تهدئة', 'احمرار', 'sooth', 'calm', 'redness'],
      'مكافحة التجاعيد': ['تجاعيد', 'شيخوخة', 'aging', 'wrinkle', 'firm'],
      'حماية من الشمس': ['شمس', 'sun', 'uv', 'spf', 'واقي'],
  };

  const getProductClaims = (p) => {
      const claims = [];
      if (Array.isArray(p.marketingClaims)) claims.push(...p.marketingClaims);
      if (Array.isArray(p.claims)) claims.push(...p.claims);
      if (Array.isArray(p.selected_claims)) claims.push(...p.selected_claims);
      if (Array.isArray(p.analysisData?.marketingClaims)) claims.push(...p.analysisData.marketingClaims);
      if (Array.isArray(p.analysisData?.evaluated_claims)) claims.push(...p.analysisData.evaluated_claims);
      if (Array.isArray(p.analysisData?.selected_claims)) claims.push(...p.analysisData.selected_claims);
      return claims.map(c => typeof c === 'object' ? (c.label || c.name || c.title || '') : String(c)).filter(Boolean);
  };

  const getProductTargetSkinTypes = (p) => {
      const types = [];
      if (Array.isArray(p.targetSkinTypes)) types.push(...p.targetSkinTypes);
      else if (typeof p.targetSkinTypes === 'string') types.push(p.targetSkinTypes);

      if (Array.isArray(p.targetTypes)) types.push(...p.targetTypes);
      else if (typeof p.targetTypes === 'string') types.push(p.targetTypes);

      if (Array.isArray(p.skinType)) types.push(...p.skinType);
      else if (typeof p.skinType === 'string') types.push(p.skinType);

      if (Array.isArray(p.target_skin_types)) types.push(...p.target_skin_types);
      if (Array.isArray(p.analysisData?.target_skin_types)) types.push(...p.analysisData.target_skin_types);

      return types.map(t => String(t)).filter(Boolean);
  };

  const filteredData = useMemo(() => {
    if (!products || !Array.isArray(products) || products.length === 0) {
      return [];
    }
    
    const searchLower = search.toLowerCase();
    
    let result = products.filter(p => {
      // 1. Search Query Match
      const matchSearch = searchLower === '' || 
                          (p.name || "").toLowerCase().includes(searchLower) || 
                          (p.brand || "").toLowerCase().includes(searchLower);
      
      // 2. Category Filter
      const matchCat = activeCat === 'all' || p.category?.id === activeCat;
      
      // 3. Brand Filter
      const matchBrand = advancedFilters.brand === 'all' || p.brand === advancedFilters.brand;
      
      // 4. Algerian Local Filter
      const matchLocal = advancedFilters.localOnly ? isAlgerianProduct(p) : true;

      // 5. Granular Missing Fields (Bounties) Filter
      let matchMissing = true;
      if (advancedFilters.missingFields && advancedFilters.missingFields.length > 0) {
        matchMissing = advancedFilters.missingFields.some(fieldKey => {
          if (fieldKey === 'price') return !p.price;
          if (fieldKey === 'ingredients') return !p.ingredients || p.ingredients.trim() === '';
          if (fieldKey === 'brand') return !p.brand;
          if (fieldKey === 'claims') return getProductClaims(p).length === 0;
          if (fieldKey === 'skinTypes') return getProductTargetSkinTypes(p).length === 0;
          return false;
        });
      }

      // 6. Target Skin Types Filter (Fuzzy Alias Match)
      let matchSkinType = true;
      if (advancedFilters.skinTypes && advancedFilters.skinTypes.length > 0) {
        const prodTypes = getProductTargetSkinTypes(p);
        matchSkinType = advancedFilters.skinTypes.some(selectedSt => {
          const aliases = SKIN_TYPE_ALIASES[selectedSt] || [selectedSt.toLowerCase()];
          return prodTypes.some(pt => {
            const lowerPt = pt.toLowerCase();
            return aliases.some(alias => lowerPt.includes(alias.toLowerCase()));
          });
        });
      }

      // 7. Claims Filter (Fuzzy Alias Match)
      let matchClaims = true;
      if (advancedFilters.claims && advancedFilters.claims.length > 0) {
        const prodClaims = getProductClaims(p);
        matchClaims = advancedFilters.claims.some(selectedCl => {
          const aliases = CLAIM_ALIASES[selectedCl] || [selectedCl.toLowerCase()];
          return prodClaims.some(pc => {
            const lowerPc = pc.toLowerCase();
            return aliases.some(alias => lowerPc.includes(alias.toLowerCase()));
          });
        });
      }

      return matchSearch && matchCat && matchBrand && matchLocal && matchMissing && matchSkinType && matchClaims;
    });

    // Sorting
    if (advancedFilters.sort === 'price_asc') {
        result.sort((a, b) => (getPriceValue(a.price) || 999999) - (getPriceValue(b.price) || 999999));
    } else if (advancedFilters.sort === 'price_desc') {
        result.sort((a, b) => (getPriceValue(b.price) || 0) - (getPriceValue(a.price) || 0));
    } else {
        result.sort((a, b) => {
            const aIsAlg = isAlgerianProduct(a);
            const bIsAlg = isAlgerianProduct(b);
            if (aIsAlg && !bIsAlg) return -1;
            if (!aIsAlg && bIsAlg) return 1;
            return 0;
        });
    }

    return result;
  }, [search, activeCat, products, advancedFilters]);

  // Pulse animation for plus button when empty state
  useEffect(() => {
    let pulseAnimation;
    
    if (Array.isArray(filteredData) && filteredData.length === 0 && !loading) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(plusPulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(plusPulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
    } else {
      plusPulseAnim.setValue(1);
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
    }
    
    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
    };
  }, [filteredData, loading, plusPulseAnim]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [search, activeCat, advancedFilters, products]);

  const visibleData = useMemo(() => {
    if (!Array.isArray(filteredData)) {
      return [];
    }
    return filteredData.slice(0, visibleCount);
  }, [filteredData, visibleCount]);

  const handleLoadMore = useCallback(() => {
    if (Array.isArray(filteredData) && visibleCount < filteredData.length) {
      setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    }
  }, [visibleCount, filteredData]);

  const handleContribute = useCallback((product, field) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBountyState({ visible: true, product, field });
  }, []);

  const handleProductPress = useCallback((product) => {
    if (params.compareSlot) {
      const targetKey = params.compareSlot === 'left' ? 'leftProduct' : 'rightProduct';
      const otherKey = params.compareSlot === 'left' ? 'rightProduct' : 'leftProduct';
      const payload = {
        pathname: '/comparison',
        params: {
          [targetKey]: JSON.stringify(product),
          ...(params[otherKey] ? { [otherKey]: params[otherKey] } : {})
        }
      };

      router.push(payload);
      return;
    }

    if (isCompareMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedCompareIds(prev => {
        if (prev.includes(product.id)) {
          return prev.filter(id => id !== product.id);
        } else {
          const next = [...prev, product.id];
          if (next.length === 2) {
            const prod1 = products.find(p => p.id === next[0]);
            const prod2 = products.find(p => p.id === next[1]);
            
            setIsCompareMode(false);
            
            setTimeout(() => {
              setSelectedCompareIds([]);
              router.push({
                pathname: '/comparison',
                params: {
                  leftProduct: JSON.stringify(prod1),
                  rightProduct: JSON.stringify(prod2)
                }
              });
            }, 300);
          }
          return next;
        }
      });
    } else {
      setSelectedProduct(product);
    }
  }, [isCompareMode, params, products, router]);

  const handleBountySubmit = useCallback(async (product, field, value) => {
    try {
      const result = await submitBounty(product, field, value);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBountyState({ visible: false, product: null, field: '' });
      
      AlertService.success(
          t('contribution_submitted_title', language), 
          t('contribution_pending_review_message', language)
      );
      
      return result;
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (error.message && (error.message.includes("logged in") || error.message.includes("auth"))) {
          AlertService.error(t('common_error', language), t('catalog_login_required', language));
      } else {
          AlertService.error(t('common_error', language), error.message);
      }
      throw error;
    }
  }, [language]);

  const handleNewProductSubmit = useCallback(async (productData) => {
    try {
        const result = await submitNewProduct(productData);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAddProductVisible(false);

        AlertService.success(
            t('contribution_submitted_title', language),
            t('contribution_pending_review_message', language)
        );
        
        return result;
    } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (error.message && (error.message.includes("logged in") || error.message.includes("auth"))) {
            AlertService.error(t('common_error', language), t('catalog_login_required', language));
        } else {
            AlertService.error(t('common_error', language), error.message);
        }
        throw error;
    }
  }, [language]);

  // Modal and interactions close actions
  const closeProductDetail = useCallback(() => setSelectedProduct(null), []);
  const closeBountyModal = useCallback(() => setBountyState(prev => ({ ...prev, visible: false })), []);
  const closeFilterModal = useCallback(() => setFilterModalVisible(false), []);
  const closeAddProductModal = useCallback(() => setAddProductVisible(false), []);
  const refreshData = useCallback(() => loadData(true), [loadData]);
  const handleFilterOpen = useCallback(() => { Haptics.selectionAsync(); setFilterModalVisible(true); }, []);

  const handleToggleCompareMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextCompareMode = !isCompareMode;
    setIsCompareMode(nextCompareMode);
    
    if (!nextCompareMode) {
        setSelectedCompareIds([]);
    } else {
      AlertService.show({
        title: t('catalog_compare_active_title', language),
        message: t('catalog_compare_active_message', language),
        type: 'info',
        buttons: [{ text: t('alert_ok'), style: 'primary' }]
      });
    }
  }, [isCompareMode, language]);

  const handleOpenAddProduct = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(plusScaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(plusScaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 300,
        useNativeDriver: true,
      })
    ]).start();
    setAddProductVisible(true);
  }, [plusScaleAnim]);

  // FlatList performance extractions
  const keyExtractor = useCallback(item => item.id?.toString() || Math.random().toString(), []);
  
  const renderProduct = useCallback(({ item, index }) => (
      <ProductCard 
          item={item} 
          index={index % ITEMS_PER_PAGE} 
          onPress={handleProductPress} 
          onPressBounty={handleContribute}
          isCompareMode={isCompareMode}
          isSelected={selectedCompareIds.includes(item.id)}
      />
  ), [handleProductPress, handleContribute, isCompareMode, selectedCompareIds]);

  const ListEmptyComponent = useMemo(() => {
    const hasSearchTerm = search.length > 0;
    const hasActiveFilter = advancedFilters.brand !== 'all' || advancedFilters.bountiesOnly || advancedFilters.sort !== 'default';
    
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome5 name={hasSearchTerm || hasActiveFilter ? "search-minus" : "box-open"} size={50} color={C.textDim} style={{marginBottom: 15, opacity: 0.5}}/>
        <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>
          {t('catalog_empty_title', language)}
        </Text>
        <Text style={[styles.emptyDescription, { color: C.textDim }]}>
          {t('catalog_empty_description', language)}
        </Text>
        <TouchableOpacity 
          style={[styles.emptyAddButton, { backgroundColor: C.accentGreen + '15', borderColor: C.accentGreen }]}
          onPress={handleOpenAddProduct}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="plus-circle" size={18} color={C.accentGreen} />
          <Text style={[styles.emptyAddButtonText, { color: C.accentGreen }]}>
            {t('catalog_add_product_action', language)}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [C.textDim, C.textPrimary, C.accentGreen, language, styles, search.length, advancedFilters, handleOpenAddProduct]);

  const ListFooterComponent = useMemo(() => {
      if (Array.isArray(filteredData) && visibleCount < filteredData.length) {
          return (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={C.accentGreen} />
              </View>
          );
      }
      return null;
  }, [visibleCount, filteredData, C.accentGreen]);

  const hasActiveFilters = advancedFilters.bountiesOnly || advancedFilters.brand !== 'all' || advancedFilters.sort !== 'default';

  // ---------------- UI RENDERS ----------------

  if (checkingIntro) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.accentGreen} />
      </View>
    );
  }

  if (showIntro) {
    return <CatalogIntro visible={showIntro} onFinish={handleIntroFinish} />;
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.accentGreen} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <TouchableOpacity 
        style={styles.devModeToggle}
        onLongPress={toggleDevMode}
        activeOpacity={0.7}
      >
        <View style={{ height: 1, width: 1, opacity: 0 }} />
      </TouchableOpacity>
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onLongPress={toggleDevMode} activeOpacity={0.7}>
            <Text style={[styles.title, { color: C.textPrimary }]}>{t('catalog_title', language)}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <TouchableOpacity onPress={refreshData} disabled={syncing}>
              {syncing ? <ActivityIndicator size="small" color={C.gold} /> : <Feather name="refresh-cw" size={20} color={C.textDim} />}
            </TouchableOpacity>
          </View>
        </View>

        <RewardsBanner 
          currentPoints={userPoints} 
          scrollY={scrollY}
        />

        {/* 🌟 IDENTICAL SEARCH BAR (MATCHES SHELF SEARCH BAR) 🌟 */}
        <View style={[
          styles.searchContainer, 
          { 
            backgroundColor: C.card, 
            borderColor: C.accentGreen + '40',
            shadowColor: C.accentGreen
          }
        ]}>
          {/* TAPPING ANYWHERE IN THIS ENTIRE ZONE FOCUSES THE INPUT */}
          <TouchableOpacity 
            style={styles.searchSide}
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
          >
            <FontAwesome5 name="search" size={16} color={C.textSecondary} />
            <TextInput 
              ref={inputRef}
              style={[styles.input, { color: C.textPrimary }]} 
              value={search} 
              onChangeText={setSearch} 
              textAlign={rtl.textAlign}
              textAlignVertical="center"
              paddingVertical={0}
              paddingHorizontal={0}
              height="100%"
              includeFontPadding={false}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: C.border }]} />

          <TouchableOpacity 
            onPress={handleFilterOpen} 
            style={[
              styles.filterBtn, 
              { backgroundColor: C.accentGreen + '1A' }
            ]}
            activeOpacity={0.7}
          >
            <Feather name="sliders" size={18} color={hasActiveFilters ? C.accentGreen : C.textSecondary} />
            {hasActiveFilters && <View style={[styles.activeFilterDot, { backgroundColor: C.accentGreen, borderColor: C.card }]} />}
          </TouchableOpacity>
        </View>
        
        <CategoryFilter activeCategory={activeCat} onSelect={setActiveCat} />
      </View>

      <FlatList 
        data={visibleData} 
        keyExtractor={keyExtractor} 
        showsVerticalScrollIndicator={false}
        renderItem={renderProduct}
        contentContainerStyle={[
          styles.list,
          (!Array.isArray(visibleData) || visibleData.length === 0) && styles.emptyList
        ]}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={refreshData} tintColor={C.gold} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5} 
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        initialNumToRender={ITEMS_PER_PAGE}
        maxToRenderPerBatch={ITEMS_PER_PAGE}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      />

      <View style={styles.fabStack}>
        <TouchableOpacity
          style={[
            styles.fabSecondary,
            rtl.flexDirection === 'row-reverse' ? { left: 20 } : { right: 20 }
          ]}
          activeOpacity={0.8}
          onPress={handleToggleCompareMode}
        >
          <LinearGradient
            colors={[C.accentGreen, C.card]}
            style={[styles.fabGradient, isCompareMode && styles.fabGradientActive]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons
              name="compare"
              size={24}
              color={C.textOnAccent}
            />
          </LinearGradient>
        </TouchableOpacity>

        <Animated.View
          style={{
            transform: [
              { scale: plusPulseAnim }
            ]
          }}
        >
          <TouchableOpacity 
            style={[
              styles.fab, 
              rtl.flexDirection === 'row-reverse' ? { left: 20 } : { right: 20 }
            ]} 
            activeOpacity={0.8}
            onPress={handleOpenAddProduct}
          >
            <LinearGradient
              colors={[C.accentGreen, C.card]}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Feather name="plus" size={24} color={C.textOnAccent} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <CatalogDetailModal visible={!!selectedProduct} product={selectedProduct} onClose={closeProductDetail} onContribute={handleContribute} />
      <BountyModal visible={bountyState.visible} product={bountyState.product} field={bountyState.field} onClose={closeBountyModal} onSubmit={handleBountySubmit} />
      <FilterModal visible={isFilterModalVisible} onClose={closeFilterModal} onApply={setAdvancedFilters} currentFilters={advancedFilters} availableBrands={availableBrands} />
      <AddProductModal visible={isAddProductVisible} onClose={closeAddProductModal} onSubmit={handleNewProductSubmit} />
    </View>
  );
}

const createStyles = (C, rtl, isEn) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  topRow: { flexDirection: rtl.flexDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontFamily: 'Tajawal-ExtraBold', fontSize: isEn ? 26 : 24 },
  
  /* IDENTICAL SEARCH BAR STYLES (MATCHES SHELF SEARCH BAR) */
  searchContainer: { 
    flexDirection: rtl.flexDirection, 
    height: 56, 
    borderRadius: 20, 
    alignItems: 'center', 
    borderWidth: 1, 
    marginBottom: 10, 
    marginTop: 5,
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  searchSide: {
    flex: 1,
    height: '100%',     // 🌟 Maximize touch height
    flexDirection: rtl.flexDirection,
    alignItems: 'center',
    paddingRight: 12,
    paddingLeft: 6,
    gap: 10,
  },
  searchIcon: { 
    // marginEnd removed — 'gap' in searchSide handles spacing cleanly
  },
  input: { 
    flex: 1, 
    height: '100%',     // 🌟 Fills entire search side for instant tap response
    fontFamily: 'Tajawal-Regular', 
    fontSize: isEn ? 20 : 20, 
    textAlign: rtl.textAlign,
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    includeFontPadding: false,
  },
  divider: { 
    width: 1, 
    height: 28, 
    marginHorizontal: 8,
    opacity: 0.5,
  },
  filterBtn: { 
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center', 
    justifyContent: 'center',
    position: 'relative',
  },
  activeFilterDot: { 
    position: 'absolute', 
    top: -2, 
    right: -2, 
    width: 10, 
    height: 10, 
    borderRadius: 5, 
    borderWidth: 2 
  },
  
  list: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 1 },
  emptyContainer: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 24,
  },
  emptyTitle: { 
    fontFamily: 'Tajawal-Bold', 
    fontSize: isEn ? 20 : 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyDescription: { 
    fontFamily: 'Tajawal-Regular', 
    fontSize: isEn ? 15 : 14,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
    opacity: 0.8,
  },
  emptyAddButton: {
    flexDirection: rtl.flexDirection,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyAddButtonText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: isEn ? 15 : 14,
  },
  fabStack: { position: 'absolute', bottom: 90, zIndex: 100, gap: 10 },
  fab: { position: 'relative', zIndex: 100 },
  fabSecondary: { position: 'relative', zIndex: 100 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  fabGradientActive: { borderWidth: 2, borderColor: C.textOnAccent, shadowOpacity: 0.45, shadowRadius: 10, transform: [{ scale: 1.03 }] },
  devModeToggle: { position: 'absolute', top: 0, left: 0, width: 50, height: 50, zIndex: 999 },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 0,
  }
});