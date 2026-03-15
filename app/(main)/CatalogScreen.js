import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, Platform, FlatList, TextInput, Text, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/context/ThemeContext';

import ProductCard from '../../src/components/catalog/ProductCard';
import CatalogDetailModal from '../../src/components/catalog/CatalogDetailModal';
import CategoryFilter from '../../src/components/catalog/CategoryFilter';
import RewardsBanner from '../../src/components/catalog/RewardsBanner';
import BountyModal from '../../src/components/catalog/BountyModal';
import FilterModal from '../../src/components/catalog/FilterModal';

import { CatalogService } from '../../src/services/catalogService';

// Helper to extract a sortable number from the price object
const getPriceValue = (price) => {
    if (!price) return null;
    if (typeof price === 'number') return price;
    if (typeof price === 'object') return price.min || price.max || null;
    return parseFloat(price) || null;
};

export default function CatalogScreen() {
  const { colors: C } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [products, setProducts] = useState([]);
  
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  
  const[isFilterModalVisible, setFilterModalVisible] = useState(false);
  const[advancedFilters, setAdvancedFilters] = useState({
      bountiesOnly: false, brand: 'all', sort: 'default'
  });
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const[bountyState, setBountyState] = useState({ visible: false, product: null, field: '' });
  const[userPoints, setUserPoints] = useState(1250);

  useEffect(() => { loadData(); },[]);

  const loadData = async (force = false) => {
    if (force) setSyncing(true);
    const data = await CatalogService.fetchCatalog(force);
    setProducts(data ||[]);
    setLoading(false);
    setSyncing(false);
    if (force) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const availableBrands = useMemo(() => {
      const brands = new Set(products.map(p => p.brand).filter(Boolean));
      return['all', ...Array.from(brands).sort()];
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
  }, [search, activeCat, products, advancedFilters]);

  const handleContribute = useCallback((product, field) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBountyState({ visible: true, product, field });
  },[]);

  const handleBountySubmit = (product, field, value) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUserPoints(prev => prev + 50);
    setBountyState({ visible: false, product: null, field: '' });
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
          <TouchableOpacity onPress={() => loadData(true)} disabled={syncing}>
             {syncing ? <ActivityIndicator size="small" color={C.gold} /> : <Feather name="refresh-cw" size={20} color={C.textDim} />}
          </TouchableOpacity>
          <Text style={[styles.title, { color: C.textPrimary }]}>كتالوج وثيق</Text>
        </View>

        <RewardsBanner currentPoints={userPoints} nextLevelPoints={2000} levelName="باحث خبير" />

        <View style={[styles.searchContainer, { backgroundColor: C.card, borderColor: C.border }]}>
          <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setFilterModalVisible(true); }} style={styles.filterBtn}>
            <Feather name="sliders" size={18} color={hasActiveFilters ? C.accentGreen : C.textDim} />
            {hasActiveFilters && <View style={[styles.activeFilterDot, { backgroundColor: C.accentGreen, borderColor: C.card }]} />}
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: C.textDim + '30' }]} />
          <TextInput 
            style={[styles.input, { color: C.textPrimary }]} placeholder="ابحثي عن منتج، ماركة..." placeholderTextColor={C.textDim}
            value={search} onChangeText={setSearch} textAlign="right"
          />
          <FontAwesome5 name="search" size={14} color={C.textDim} style={styles.searchIcon} />
        </View>
        <CategoryFilter activeCategory={activeCat} onSelect={setActiveCat} />
      </View>

      <FlatList 
        data={filteredData} keyExtractor={item => item.id.toString()} showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => <ProductCard item={item} index={index} onPress={setSelectedProduct} onPressBounty={handleContribute} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={() => loadData(true)} tintColor={C.gold} />}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <FontAwesome5 name="search-minus" size={40} color={C.textDim} style={{marginBottom: 15}}/>
                <Text style={{ color: C.textPrimary, fontFamily: 'Tajawal-Bold', fontSize: 16 }}>لم نجد منتجات مطابقة</Text>
            </View>
        }
      />

      <CatalogDetailModal visible={!!selectedProduct} product={selectedProduct} onClose={() => setSelectedProduct(null)} onContribute={handleContribute} />
      <BountyModal visible={bountyState.visible} product={bountyState.product} field={bountyState.field} onClose={() => setBountyState({ ...bountyState, visible: false })} onSubmit={handleBountySubmit} />
      <FilterModal visible={isFilterModalVisible} onClose={() => setFilterModalVisible(false)} onApply={setAdvancedFilters} currentFilters={advancedFilters} availableBrands={availableBrands} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontFamily: 'Tajawal-ExtraBold', fontSize: 24 },
  searchContainer: { flexDirection: 'row', height: 50, borderRadius: 14, alignItems: 'center', borderWidth: 1, marginBottom: 10, paddingHorizontal: 10 },
  filterBtn: { padding: 8, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  activeFilterDot: { position: 'absolute', top: 5, right: 5, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  divider: { width: 1, height: 25, marginHorizontal: 10 },
  input: { flex: 1, fontFamily: 'Tajawal-Regular', fontSize: 14, paddingTop: Platform.OS === 'android' ? 3 : 0 },
  searchIcon: { marginLeft: 10 },
  list: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 60 }
});