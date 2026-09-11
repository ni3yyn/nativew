// CatalogScreen.js

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, FlatList, TextInput, Text, ActivityIndicator, TouchableOpacity, RefreshControl, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../src/context/ThemeContext';
import { t, interpolate } from '../../src/i18n/index';
import { useCurrentLanguage } from '../../src/hooks/useCurrentLanguage';
import { useRTL } from '../../src/hooks/useRTL';
import { useAppContext } from '../../src/context/AppContext';
import { LinearGradient } from 'expo-linear-gradient';

// 🌟 UNIFIED AUTHENTIC HEADER
import AuthenticHeader, { getHeaderDimensions } from '../../src/utils/AuthenticHeader';

import ProductCard from '../../src/components/catalog/ProductCard';
import CatalogDetailModal from '../../src/components/catalog/CatalogDetailModal';
import CategoryFilter from '../../src/components/catalog/CategoryFilter';
import RewardsBanner from '../../src/components/catalog/RewardsBanner';
import BountyModal from '../../src/components/catalog/BountyModal';
import FilterModal from '../../src/components/catalog/FilterModal';
import AddProductModal from '../../src/components/catalog/AddProductModal';
import CatalogIntro from '../../src/components/catalog/CatalogIntro'; 
import AppTextInput from '../../src/components/common/AppTextInput'; 

import { submitBounty, submitNewProduct } from '../../src/services/bountyService'; 
import { AlertService } from '../../src/services/alertService';
import { CatalogService } from '../../src/services/catalogService';

// Storage keys & Pagination
const CATALOG_INTRO_SEEN_KEY = '@catalog_intro_seen';
const DEV_MODE_KEY = '@dev_mode_enabled';
const ITEMS_PER_PAGE = 8;

// 🌟 FIXED CONTROLS HEIGHT: Eliminates layout thrashing and continuous re-renders
const CONTROLS_HEIGHT = 150;

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
  const { colors: C, activeThemeId } = useTheme();
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
  
  // 🌟 NATIVE GPU-DRIVEN SCROLL
  const scrollY = useRef(new Animated.Value(0)).current;

  // 🌟 HEADER COLLAPSE DIMENSIONS
  const { maxHeight, scrollDistance } = useMemo(
    () => getHeaderDimensions(insets.top),
    [insets.top]
  );

  // 🌟 NATIVE TRANSFORM FOR CONTROLS (Zero JS thread lag)
  const controlsTranslateY = scrollY.interpolate({
    inputRange: [0, scrollDistance],
    outputRange: [0, -scrollDistance],
    extrapolate: 'clamp',
  });
  
  // App States
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState([]);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
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

  // Smart Debounce: updates debouncedSearch 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Immediate search trigger on keyboard enter / search button
  const handleSearchSubmit = useCallback(() => {
    setDebouncedSearch(search);
  }, [search]);

  // Immediate clear trigger
  const handleClearSearch = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
  }, []);

  // Sync incoming navigation params (e.g. from Home/Profile)
  useEffect(() => {
    if (params?.search) {
      setSearch(params.search);
      setDebouncedSearch(params.search);
    }
  }, [params?.search]);

  // Quick brand filter trigger
  const handleSelectBrand = useCallback((brandName) => {
    if (!brandName) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearch(brandName);
    
    setTimeout(() => {
        setDebouncedSearch(brandName);
    }, 50);
  }, []);

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

  const getRelevanceScore = (query, product) => {
    if (!query) return 100;
    if (!product) return 0;
    
    query = query.toLowerCase().trim();
    const searchString = `${product.name || ''} ${product.name_ar || ''} ${product.brand || ''} ${product.brand_ar || ''} ${product.category?.name || ''}`.toLowerCase();
    
    if ((product.name && product.name.toLowerCase() === query) || 
        (product.brand && product.brand.toLowerCase() === query)) {
        return 100;
    }
    
    if (searchString.includes(query)) {
       if (searchString.startsWith(query)) return 90;
       return 80;
    }
    
    const queryWords = query.split(/\s+/);
    if (queryWords.length > 1) {
        const allWordsMatch = queryWords.every(word => searchString.includes(word));
        if (allWordsMatch) return 60;
    }
    
    if (query.length > 3) {
        let qIdx = 0;
        for (let i = 0; i < searchString.length; i++) {
          if (searchString[i] === query[qIdx]) {
            qIdx++;
            if (qIdx === query.length) {
                return 30 + (query.length / searchString.length) * 10;
            }
          }
        }
    }
    
    return 0;
  };

  const filteredData = useMemo(() => {
    if (!products || !Array.isArray(products) || products.length === 0) {
      return [];
    }
    
    const searchTrimmed = debouncedSearch.trim();
    const isSearching = searchTrimmed.length > 0;
    
    let result = products.filter(p => {
      if (isSearching) {
         p._searchScore = getRelevanceScore(searchTrimmed, p);
         if (p._searchScore === 0) return false;
      }
      const matchCat = activeCat === 'all' || p.category?.id === activeCat;
      const matchBrand = advancedFilters.brand === 'all' || p.brand === advancedFilters.brand;
      const matchLocal = advancedFilters.localOnly ? isAlgerianProduct(p) : true;

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

      return matchCat && matchBrand && matchLocal && matchMissing && matchSkinType && matchClaims;
    });

    if (advancedFilters.sort === 'price_asc') {
        result.sort((a, b) => (getPriceValue(a.price) || 999999) - (getPriceValue(b.price) || 999999));
    } else if (advancedFilters.sort === 'price_desc') {
        result.sort((a, b) => (getPriceValue(b.price) || 0) - (getPriceValue(a.price) || 0));
    } else if (isSearching) {
        result.sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0));
    } else if (!isSearching) {
        result.sort((a, b) => {
            const aIsAlg = isAlgerianProduct(a);
            const bIsAlg = isAlgerianProduct(b);
            if (aIsAlg && !bIsAlg) return -1;
            if (!aIsAlg && bIsAlg) return 1;
            return 0;
        });
    }

    return result;
  }, [debouncedSearch, activeCat, products, advancedFilters]);

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
  }, [debouncedSearch, activeCat, advancedFilters, products]);

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

  const keyExtractor = useCallback(item => item.id?.toString() || Math.random().toString(), []);
  
  const renderProduct = useCallback(({ item, index }) => (
      <ProductCard 
          item={item} 
          index={index % ITEMS_PER_PAGE} 
          onPress={handleProductPress} 
          onPressBounty={handleContribute}
          onSelectBrand={handleSelectBrand}
          isCompareMode={isCompareMode}
          isSelected={selectedCompareIds.includes(item.id)}
      />
  ), [handleProductPress, handleContribute, handleSelectBrand, isCompareMode, selectedCompareIds]);

  const ListEmptyComponent = useMemo(() => {
    const hasSearchTerm = search.length > 0 || debouncedSearch.length > 0;
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

    const isLightTheme = activeThemeId === 'light';

    const renderContent = () => (
        <View style={styles.container}>
            <TouchableOpacity 
                style={styles.devModeToggle}
                onLongPress={toggleDevMode}
                activeOpacity={0.7}
            >
                <View style={{ height: 1, width: 1, opacity: 0 }} />
            </TouchableOpacity>
            
            {/* 🌟 UNIFIED AUTHENTIC HEADER */}
            <AuthenticHeader
                scrollY={scrollY}
                activeTab="catalog"
                title={t('catalog_title', language)}
                subtitle={interpolate(t('catalog_header_desc', language) || '%{count} منتج تجميلي موثّق', { count: products.length })}
            />

            {/* 🌟 STICKY/COLLAPSIBLE CONTROLS (Native Transform) */}
            <Animated.View 
                style={[
                    styles.controlsContainer, 
                    { 
                        top: maxHeight - 8,
                        transform: [{ translateY: controlsTranslateY }]
                    }
                ]}
            >
                {/* 🌟 REWARDS BANNER (Stable, zero layout reflows) */}
                <RewardsBanner 
                    currentPoints={userPoints} 
                    language={language}
                />

                {/* SEARCH BAR */}
                <View style={[
                    styles.searchContainer, 
                    { 
                        backgroundColor: C.card, 
                        borderColor: C.accentGreen + '40',
                        shadowColor: C.accentGreen
                    }
                ]}>
                    <TouchableOpacity 
                        style={styles.searchSide}
                        activeOpacity={1}
                        onPress={() => inputRef.current?.focus()}
                    >
                        <FontAwesome5 name="search" size={16} color={C.textSecondary} />
                        <AppTextInput 
                            ref={inputRef}
                            style={[styles.input, { color: C.textPrimary }]} 
                            value={search} 
                            onChangeText={setSearch} 
                            onSubmitEditing={handleSearchSubmit}
                            returnKeyType="search"
                            placeholder={t('catalog_search_placeholder', language)}
                            placeholderTextColor={C.textDim}
                            textAlign={rtl.textAlign}
                            textAlignVertical="center"
                            paddingVertical={0}
                            paddingHorizontal={0}
                            height="100%"
                            includeFontPadding={false}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity 
                                onPress={handleClearSearch} 
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={{ paddingHorizontal: 6 }}
                            >
                                <Feather name="x-circle" size={16} color={C.textDim} />
                            </TouchableOpacity>
                        )}
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
            </Animated.View>

            {/* 🌟 100% NATIVE GPU-DRIVEN ANIMATED FLATLIST */}
            <Animated.FlatList 
                data={visibleData} 
                keyExtractor={keyExtractor} 
                showsVerticalScrollIndicator={false}
                renderItem={renderProduct}
                contentContainerStyle={[
                    styles.list,
                    { paddingTop: maxHeight + CONTROLS_HEIGHT + 14 },
                    (!Array.isArray(visibleData) || visibleData.length === 0) && styles.emptyList
                ]}
                refreshControl={
                    <RefreshControl 
                        refreshing={syncing} 
                        onRefresh={refreshData} 
                        tintColor={C.gold} 
                        progressViewOffset={maxHeight + CONTROLS_HEIGHT}
                    />
                }
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
                    { useNativeDriver: true } // 👈 NATIVE DRIVER (Zero JS lag)
                )}
                scrollEventThrottle={16}
            />

            {/* 🌟 1. Anchor the absolute parent container based on language */}
<View 
  style={[
    styles.fabStack, 
    rtl.isRTL ? { left: 20 } : { right: 20 } // 👈 Moves the whole stack to the correct screen edge
  ]}
>
  {/* Secondary Compare FAB (Solid) */}
  <TouchableOpacity
    style={[
      styles.fabSolid, 
      { backgroundColor: isCompareMode ? C.card : C.accentGreen },
      isCompareMode && styles.fabSolidActive
    ]}
    activeOpacity={0.8}
    onPress={handleToggleCompareMode}
  >
    <MaterialCommunityIcons
      name="compare"
      size={24}
      color={isCompareMode ? C.accentGreen : C.textOnAccent}
    />
  </TouchableOpacity>

  {/* Main Add Product FAB (Solid) */}
  <Animated.View style={{ transform: [{ scale: plusPulseAnim }] }}>
    <TouchableOpacity 
      style={[styles.fabSolid, { backgroundColor: C.accentGreen }]} 
      activeOpacity={0.8}
      onPress={handleOpenAddProduct}
    >
      <Feather name="plus" size={24} color={C.textOnAccent} />
    </TouchableOpacity>
  </Animated.View>
</View>

            <CatalogDetailModal visible={!!selectedProduct} product={selectedProduct} onClose={closeProductDetail} onContribute={handleContribute} onSelectBrand={handleSelectBrand} />
            <BountyModal visible={bountyState.visible} product={bountyState.product} field={bountyState.field} onClose={closeBountyModal} onSubmit={handleBountySubmit} />
            <FilterModal visible={isFilterModalVisible} onClose={closeFilterModal} onApply={setAdvancedFilters} currentFilters={advancedFilters} availableBrands={availableBrands} />
            <AddProductModal visible={isAddProductVisible} onClose={closeAddProductModal} onSubmit={handleNewProductSubmit} />
        </View>
    );

    if (isLightTheme) {
        return (
            <LinearGradient
                colors={[
                    C.background,
                    C.gradientStart || C.background,
                    C.gradientMid || C.accentGreen + '15',
                    C.gradientEnd || C.accentGreen + '25',
                    'rgba(61, 146, 117, 0.30)'
                ]}
                locations={[0, 0.4, 0.65, 0.85, 1]}
                style={{ flex: 1 }}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            >
                {renderContent()}
            </LinearGradient>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.background }}>
            {renderContent()}
        </View>
    );
}

const createStyles = (C, rtl, isEn) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // 🌟 PINNED CONTROLS: Rigid height, zero layout thrashing
  controlsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: CONTROLS_HEIGHT,
    zIndex: 9,
    paddingHorizontal: 20,
    backgroundColor: C.background,
  },

  searchContainer: { 
    flexDirection: rtl.flexDirection, 
    height: 56, 
    borderRadius: 20, 
    alignItems: 'center', 
    borderWidth: 0.5, 
    marginBottom: 10, 
    marginTop: -9,
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  searchSide: {
    flex: 1,
    height: '100%',
    flexDirection: rtl.flexDirection,
    alignItems: 'center',
    paddingRight: 12,
    paddingLeft: 6,
    gap: 10,
  },
  input: { 
    flex: 1, 
    height: '100%',
    fontFamily: 'Tajawal-Regular', 
    fontSize: isEn ? 16 : 16, 
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
  
  list: { paddingHorizontal: 20, paddingBottom: 120 },
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
    borderWidth: 0.5,
  },
  emptyAddButtonText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: isEn ? 15 : 14,
  },
  fabStack: { 
  position: 'absolute', 
  bottom: 90, 
  zIndex: 100, 
  gap: 10,
  alignItems: 'center',
},
fabSolid: { 
  width: 54, 
  height: 54, 
  borderRadius: 27, 
  alignItems: 'center', 
  justifyContent: 'center'
},
fabSolidActive: { 
  borderWidth: 2, 
  borderColor: C.accentGreen,
},
  devModeToggle: { position: 'absolute', top: 0, left: 0, width: 50, height: 50, zIndex: 999 },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 0,
  }
});
