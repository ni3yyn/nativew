// CatalogScreen.js - Updated version
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Platform, FlatList, TextInput, Text, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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

import { submitBounty, submitNewProduct } from '../../src/services/bountyService'; 
import { AlertService } from '../../src/services/alertService';
import { CatalogService } from '../../src/services/catalogService';

import { getPointsForField } from '../../src/utils/gamificationEngine';

const getPriceValue = (price) => {
    if (!price) return null;
    if (typeof price === 'number') return price;
    if (typeof price === 'object') return price.min || price.max || null;
    return parseFloat(price) || null;
};

export default function CatalogScreen() {
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  const { userProfile } = useAppContext(); 
  
  const language = useCurrentLanguage();
  const rtl = useRTL();
  const isEn = language === 'en'; 
  const styles = useMemo(() => createStyles(C, rtl, isEn), [C, rtl, isEn]);
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const[products, setProducts] = useState([]);
  
  const [search, setSearch] = useState('');
  const[activeCat, setActiveCat] = useState('all');
  
  const[isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({ bountiesOnly: false, brand: 'all', sort: 'default' });
  
  const[selectedProduct, setSelectedProduct] = useState(null);
  const [bountyState, setBountyState] = useState({ visible: false, product: null, field: '' });
  
  const[isAddProductVisible, setAddProductVisible] = useState(false);
  
  const[userPoints, setUserPoints] = useState(userProfile?.points || 0);

  useEffect(() => {
      if (userProfile?.points !== undefined) {
          setUserPoints(userProfile.points);
      }
  }, [userProfile?.points]);

  useEffect(() => { loadData(); },[]);

  const loadData = async (force = false) => {
    try {
      if (force) {
        setSyncing(true);
        setProducts([]); 
      }
      
      const data = await CatalogService.fetchCatalog(force);
      
      if (data && data.length > 0) {
        setProducts(data);
      } else {
        const cachedData = await CatalogService.fetchCatalog(false);
        setProducts(cachedData ||[]);
      }

      setLoading(false);
      setSyncing(false);
      
      if (force) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("❌ loadData failed:", error);
      const cachedData = await CatalogService.fetchCatalog(false);
      setProducts(cachedData ||[]);
      setSyncing(false);
      setLoading(false);
    }
  };

  const availableBrands = useMemo(() => {
      const brands = new Set(products.map(p => p.brand).filter(Boolean));
      return ['all', ...Array.from(brands).sort()];
  }, [products]);

  const filteredData = useMemo(() => {
    let result = products.filter(p => {
      const matchSearch = (p.name || "").toLowerCase().includes(search.toLowerCase()) || 
                          (p.brand || "").toLowerCase().includes(search.toLowerCase());
      const matchCat = activeCat === 'all' || p.category?.id === activeCat;
      const matchBrand = advancedFilters.brand === 'all' || p.brand === advancedFilters.brand;
      const matchBounty = advancedFilters.bountiesOnly ? (!p.price || !p.ingredients) : true;

      return matchSearch && matchCat && matchBrand && matchBounty;
    });

    if (advancedFilters.sort === 'price_asc') {
        result.sort((a, b) => (getPriceValue(a.price) || 999999) - (getPriceValue(b.price) || 999999));
    } else if (advancedFilters.sort === 'price_desc') {
        result.sort((a, b) => (getPriceValue(b.price) || 0) - (getPriceValue(a.price) || 0));
    }

    return result;
  },[search, activeCat, products, advancedFilters]);

  const handleContribute = useCallback((product, field) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBountyState({ visible: true, product, field });
  },[]);

  // ✅ UPDATED: Submit bounty WITHOUT showing points alert
  const handleBountySubmit = async (product, field, value) => {
    try {
      const result = await submitBounty(product, field, value);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBountyState({ visible: false, product: null, field: '' });
      
      // ✅ Show pending confirmation instead of points alert
      AlertService.success(
          t('contribution_submitted_title', language), 
          t('contribution_pending_review_message', language)
      );
      
      // ✅ Return result so modal knows it's pending
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
  };

  // ✅ UPDATED: Submit new product WITHOUT showing points alert
  const handleNewProductSubmit = async (productData) => {
    try {
        const result = await submitNewProduct(productData);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAddProductVisible(false);

        // ✅ Show pending confirmation instead of points alert
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
  };

  const hasActiveFilters = advancedFilters.bountiesOnly || advancedFilters.brand !== 'all' || advancedFilters.sort !== 'default';

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.accentGreen} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: C.textPrimary }]}>{t('catalog_title', language)}</Text>
          <TouchableOpacity onPress={() => loadData(true)} disabled={syncing}>
             {syncing ? <ActivityIndicator size="small" color={C.gold} /> : <Feather name="refresh-cw" size={20} color={C.textDim} />}
          </TouchableOpacity>
        </View>

        <RewardsBanner currentPoints={userPoints} />

        <View style={[styles.searchContainer, { backgroundColor: C.card, borderColor: C.border }]}>
          <FontAwesome5 name="search" size={14} color={C.textDim} style={styles.searchIcon} />
          <TextInput 
            style={[styles.input, { color: C.textPrimary }]} 
            placeholder={t('catalog_search_placeholder', language)} 
            placeholderTextColor={C.textDim}
            value={search} 
            onChangeText={setSearch} 
            textAlign={rtl.textAlign}
          />
          <View style={[styles.divider, { backgroundColor: C.border }]} />
          <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setFilterModalVisible(true); }} style={styles.filterBtn}>
            <Feather name="sliders" size={18} color={hasActiveFilters ? C.accentGreen : C.textDim} />
            {hasActiveFilters && <View style={[styles.activeFilterDot, { backgroundColor: C.accentGreen, borderColor: C.card }]} />}
          </TouchableOpacity>
        </View>
        
        <CategoryFilter activeCategory={activeCat} onSelect={setActiveCat} />
      </View>

      <FlatList 
        data={filteredData} 
        keyExtractor={item => item.id.toString()} 
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => <ProductCard item={item} index={index} onPress={setSelectedProduct} onPressBounty={handleContribute} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={() => loadData(true)} tintColor={C.gold} />}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <FontAwesome5 name="search-minus" size={40} color={C.textDim} style={{marginBottom: 15}}/>
                <Text style={styles.emptyText}>{t('catalog_empty_title', language)}</Text>
            </View>
        }
      />

      {/* FAB for adding new product */}
      <TouchableOpacity 
        style={[
            styles.fab, 
            rtl.flexDirection === 'row-reverse' ? { left: 20 } : { right: 20 }
        ]} 
        activeOpacity={0.8}
        onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setAddProductVisible(true);
        }}
      >
        <LinearGradient
            colors={[C.accentGreen, C.card]}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
            <Feather name="plus" size={24} color={C.textOnAccent} />
        </LinearGradient>
      </TouchableOpacity>

      <CatalogDetailModal visible={!!selectedProduct} product={selectedProduct} onClose={() => setSelectedProduct(null)} onContribute={handleContribute} />
      <BountyModal visible={bountyState.visible} product={bountyState.product} field={bountyState.field} onClose={() => setBountyState({ ...bountyState, visible: false })} onSubmit={handleBountySubmit} />
      <FilterModal visible={isFilterModalVisible} onClose={() => setFilterModalVisible(false)} onApply={setAdvancedFilters} currentFilters={advancedFilters} availableBrands={availableBrands} />
      
      <AddProductModal 
          visible={isAddProductVisible} 
          onClose={() => setAddProductVisible(false)} 
          onSubmit={handleNewProductSubmit} 
      />

    </View>
  );
}

const createStyles = (C, rtl, isEn) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  topRow: { flexDirection: rtl.flexDirection, justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontFamily: 'Tajawal-ExtraBold', fontSize: isEn ? 26 : 24 },
  searchContainer: { flexDirection: rtl.flexDirection, height: 50, borderRadius: 14, alignItems: 'center', borderWidth: 1, marginBottom: 10, paddingHorizontal: 15 },
  searchIcon: { marginEnd: 10 },
  input: { flex: 1, fontFamily: 'Tajawal-Regular', fontSize: isEn ? 16 : 14, paddingTop: Platform.OS === 'android' ? 3 : 0, textAlign: rtl.textAlign },
  divider: { width: 1, height: 25, marginHorizontal: 10 },
  filterBtn: { padding: 8, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  activeFilterDot: { position: 'absolute', top: 5, right: 5, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: C.textPrimary, fontFamily: 'Tajawal-Bold', fontSize: isEn ? 18 : 16 },
  
  fab: { 
    position: 'absolute', 
    bottom: 90,
    zIndex: 100 
  },
  fabGradient: { 
    width: 56,
    height: 56, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center', 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 8 
  },
});