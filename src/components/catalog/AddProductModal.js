import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
    ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Dimensions,
    Animated, Pressable, Easing, Image
} from 'react-native';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

// Context & Data
import { useTheme } from '../../context/ThemeContext';
import { PRODUCT_TYPES, getClaimsByProductType } from '../../constants/productData';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';
import { compressImage, uploadImageToCloudinary } from '../../services/imageService';
import CustomCameraModal from '../../components/oilguard/CustomCameraModal';
import { AlertService } from '../../services/alertService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- DATA CONSTANTS ---
const COUNTRIES = [
    { id: 'Algeria', label: 'Algeria' }, { id: 'Egypt', label: 'Egypt' }, { id: 'France', label: 'France' },
    { id: 'Germany', label: 'Germany' }, { id: 'Italy', label: 'Italy' }, { id: 'Turkey', label: 'Turkey' },
    { id: 'Spain', label: 'Spain' }, { id: 'USA', label: 'USA' }, { id: 'Korea', label: 'Korea' },
    { id: 'Japan', label: 'Japan' }, { id: 'UK', label: 'UK' }, { id: 'Tunisia', label: 'Tunisia' },
    { id: 'Morocco', label: 'Morocco' }, { id: 'UAE', label: 'UAE' }, { id: 'Other', label: 'Other' }
];

const TARGET_TYPES = [
    { id: 'oily_skin', label: 'بشرة دهنية' },
    { id: 'normal_skin', label: 'بشرة عادية' },
    { id: 'dry_skin', label: 'بشرة جافة' },
    { id: 'combination_skin', label: 'بشرة مختلطة' },
    { id: 'sensitive_skin', label: 'بشرة حساسة' },
    { id: 'all_skin_types', label: 'كل أنواع البشرة' },
    { id: 'oily_hair', label: 'شعر دهني' },
    { id: 'dry_hair', label: 'شعر جاف' },
    { id: 'damaged_hair', label: 'شعر متضرر' },
    { id: 'colored_hair', label: 'شعر مصبوغ' },
];

// --- Staggered Animation Component ---
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

// --- Custom Premium Dropdown Component ---
const CustomDropdown = ({ icon, title, subtitle, items, selectedItems, onSelect, multiSelect, placeholder, C, rtl }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownHeight] = useState(new Animated.Value(0));
    const contentHeight = useRef(0);

    const toggleOpen = () => {
        if (isOpen) {
            Animated.timing(dropdownHeight, {
                toValue: 0,
                duration: 250,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: false,
            }).start(() => setIsOpen(false));
        } else {
            setIsOpen(true);
            setTimeout(() => {
                if (contentHeight.current > 0) {
                    Animated.timing(dropdownHeight, {
                        toValue: Math.min(contentHeight.current, 240),
                        duration: 300,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: false,
                    }).start();
                }
            }, 50);
        }
    };

    const handleSelect = (item) => {
        onSelect(item);
        if (!multiSelect) {
            toggleOpen();
        }
    };

    const getPreviewText = () => {
        if (multiSelect) {
            if (!selectedItems || selectedItems.length === 0) return placeholder;
            return `✅ ${selectedItems.length} مختار`;
        } else {
            if (!selectedItems) return placeholder;
            const selectedObj = items.find(i => i.id === selectedItems);
            return selectedObj ? selectedObj.label : placeholder;
        }
    };

    const handleContentLayout = (event) => {
        contentHeight.current = event.nativeEvent.layout.height;
        if (isOpen && dropdownHeight._value === 0) {
            Animated.timing(dropdownHeight, {
                toValue: Math.min(contentHeight.current, 240),
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
        }
    };

    return (
        <View style={[styles.dropdownContainer, { backgroundColor: C.card, borderColor: C.border }]}>
            <TouchableOpacity
                onPress={toggleOpen}
                style={styles.dropdownHeader}
                activeOpacity={0.7}
            >
                <View style={[styles.dropdownHeaderContent, { flexDirection: rtl.flexDirection }]}>
                    <View style={styles.dropdownIconContainer}>
                        <View style={[styles.sectionIconBox, { backgroundColor: C.primary + '15' }]}>
                            <MaterialCommunityIcons name={icon} size={18} color={C.primary} />
                        </View>
                    </View>
                    <View style={styles.dropdownTextContainer}>
                        <Text style={[styles.dropdownTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                            {title}
                        </Text>
                        {subtitle && (
                            <Text style={[styles.dropdownSubtitle, { color: C.textDim, textAlign: rtl.textAlign }]}>
                                {subtitle}
                            </Text>
                        )}
                    </View>
                    <View style={styles.dropdownValueContainer}>
                        <Text
                            style={[
                                styles.dropdownPreview,
                                {
                                    color: (multiSelect ? (selectedItems?.length > 0) : selectedItems) ? C.accentGreen : C.textDim,
                                    textAlign: rtl.textAlign,
                                }
                            ]}
                            numberOfLines={1}
                        >
                            {getPreviewText()}
                        </Text>
                        <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={C.textDim} />
                    </View>
                </View>
            </TouchableOpacity>

            <Animated.View
                style={[
                    styles.dropdownBodyWrapper,
                    {
                        height: dropdownHeight,
                        opacity: dropdownHeight.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 1],
                        }),
                    }
                ]}
            >
                <ScrollView
                    style={styles.dropdownScrollView}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                >
                    <View
                        style={[styles.dropdownBody, { borderTopColor: C.border }]}
                        onLayout={handleContentLayout}
                    >
                        {items.map((item, index) => {
                            const isSelected = multiSelect
                                ? selectedItems?.includes(item.id)
                                : selectedItems === item.id;

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.dropdownItem,
                                        { flexDirection: rtl.flexDirection },
                                        index !== items.length - 1 && { borderBottomColor: C.border, borderBottomWidth: 0.5 }
                                    ]}
                                    onPress={() => handleSelect(item)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.dropdownItemText, { color: isSelected ? C.accentGreen : C.textSecondary, textAlign: rtl.textAlign }]}>
                                        {item.label}
                                    </Text>
                                    <View style={[
                                        styles.checkboxCircle,
                                        {
                                            borderColor: isSelected ? C.accentGreen : C.border,
                                            backgroundColor: isSelected ? C.accentGreen : 'transparent'
                                        }
                                    ]}>
                                        {isSelected && <Feather name="check" size={12} color="#FFF" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            </Animated.View>
        </View>
    );
};

export default function AddProductModal({ visible, onClose, onSubmit }) {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    const rtl = useRTL();
    const animState = useRef(new Animated.Value(0)).current;
    const mainScrollViewRef = useRef(null);

    // --- Form States ---
    const [brand, setBrand] = useState('');
    const [name, setName] = useState('');
    const [qtyValue, setQtyValue] = useState('');
    const [qtyUnit, setQtyUnit] = useState('ml');
    const [priceMin, setPriceMin] = useState('');
    const [country, setCountry] = useState(null);
    const [ingredients, setIngredients] = useState('');
    const [selectedCatId, setSelectedCatId] = useState(null);
    const [selectedTargets, setSelectedTargets] = useState([]);
    const [selectedClaims, setSelectedClaims] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const [cameraVisible, setCameraVisible] = useState(false);

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
            resetForm();
        });
    };

    // Image Handling with Camera Integration
    const handleImageCapture = async (photo) => {
        setCameraVisible(false);
        setUploadingImage(true);
        
        try {
            // Upload to Cloudinary (already compressed in camera)
            const uploadedUrl = await uploadImageToCloudinary(photo.uri);
            
            if (uploadedUrl) {
                setImageUrl(uploadedUrl);
                setSelectedImage(uploadedUrl);
                AlertService.success(
                    t('success', language),
                    t('image_uploaded_success', language)
                );
            } else {
                AlertService.error(
                    t('error', language),
                    t('image_upload_failed', language)
                );
            }
        } catch (error) {
            console.error('Upload error:', error);
            AlertService.error(
                t('error', language),
                t('image_upload_failed', language)
            );
        } finally {
            setUploadingImage(false);
        }
    };

    const pickFromGallery = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                AlertService.error(
                    t('permission_required', language),
                    t('gallery_permission_denied', language)
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                setUploadingImage(true);
                
                // Compress image
                const compressedUri = await compressImage(result.assets[0].uri);
                
                // Upload to Cloudinary
                const uploadedUrl = await uploadImageToCloudinary(compressedUri);
                
                if (uploadedUrl) {
                    setImageUrl(uploadedUrl);
                    setSelectedImage(uploadedUrl);
                    AlertService.success(
                        t('success', language),
                        t('image_uploaded_success', language)
                    );
                } else {
                    AlertService.error(
                        t('error', language),
                        t('image_upload_failed', language)
                    );
                }
                
                setUploadingImage(false);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            AlertService.error(
                t('error', language),
                t('image_pick_error', language)
            );
            setUploadingImage(false);
        }
    };

    const showImageOptions = () => {
        AlertService.show({
            title: t('add_product_image', language),
            message: t('choose_image_source', language),
            type: 'info',
            buttons: [
                { 
                    text: t('camera', language), 
                    style: 'primary', 
                    onPress: () => setCameraVisible(true) 
                },
                { 
                    text: t('gallery', language), 
                    style: 'secondary', 
                    onPress: pickFromGallery 
                },
                { 
                    text: t('cancel', language), 
                    style: 'secondary' 
                }
            ]
        });
    };

    // Format categories for dropdown
    const formattedCategories = useMemo(() => {
        return PRODUCT_TYPES.map(cat => ({
            id: cat.id,
            label: t(cat.labelKey, language),
            icon: cat.icon
        }));
    }, [language]);

    // Format claims for dropdown based on selected category
    const formattedClaims = useMemo(() => {
        if (!selectedCatId) return [];
        const rawClaims = getClaimsByProductType(selectedCatId);
        return rawClaims.map(claim => ({ id: claim, label: claim }));
    }, [selectedCatId]);

    const handleCategorySelect = (cat) => {
        if (selectedCatId !== cat.id) {
            setSelectedCatId(cat.id);
            setSelectedClaims([]);
        }
    };

    const handleMultiSelect = (item, state, setState) => {
        setState(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
    };

    const handleSave = async () => {
        if (!brand.trim() || !name.trim() || !selectedCatId) {
            AlertService.error(
                t('incomplete_data', language),
                t('fill_required_fields', language)
            );
            return;
        }

        setIsSubmitting(true);
        const catObj = PRODUCT_TYPES.find(c => c.id === selectedCatId);

        const finalProduct = {
            brand: brand.trim(),
            name: name.trim(),
            image: imageUrl || null,
            ingredients: ingredients.trim(),
            country: country || "Unknown",
            category: { id: catObj.id, label: t(catObj.labelKey, language), icon: catObj.icon },
            quantity: qtyValue ? `${qtyValue} ${qtyUnit}` : "null",
            price: { min: parseInt(priceMin) || null, max: null, currency: "DZD" },
            targetTypes: selectedTargets,
            marketingClaims: selectedClaims
        };

        try {
            await onSubmit(finalProduct);
            AlertService.success(
                t('product_submitted', language),
                t('product_review_pending', language)
            );
            handleClose();
        } catch (error) {
            console.error(error);
            AlertService.error(
                t('error', language),
                t('product_submit_error', language)
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setBrand('');
        setName('');
        setQtyValue('');
        setPriceMin('');
        setIngredients('');
        setImageUrl('');
        setSelectedImage(null);
        setSelectedCatId(null);
        setSelectedTargets([]);
        setSelectedClaims([]);
        setCountry(null);
    };

    const overlayOpacity = animState.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const modalTranslateY = animState.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] });

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
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.keyboardView}
                    >
                        <Animated.View
                            style={[
                                styles.content,
                                { backgroundColor: C.background, transform: [{ translateY: modalTranslateY }] }
                            ]}
                        >
                            <View style={styles.topNotch}>
                                <LinearGradient
                                    colors={[C.accentGreen, '#2E8062']}
                                    style={styles.rewardBadge}
                                >
                                    <FontAwesome5 name="medal" size={12} color="#FFF" />
                                    <Text style={styles.rewardText}>+200 نقطة</Text>
                                </LinearGradient>
                            </View>

                            <ScrollView
                                ref={mainScrollViewRef}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContainer}
                                keyboardShouldPersistTaps="handled"
                            >
                                <StaggeredView index={0}>
                                    <View style={styles.introHeader}>
                                        <Text style={[styles.mainTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                                            {t('add_new_product', language)}
                                        </Text>
                                        <Text style={[styles.mainSub, { color: C.textDim, textAlign: rtl.textAlign }]}>
                                            {t('help_build_catalog', language)} 🇩🇿
                                        </Text>
                                    </View>
                                </StaggeredView>

                                <StaggeredView index={1}>
                                    <View style={[styles.glassCard, { backgroundColor: C.card, borderColor: C.border }]}>
                                        <View style={[styles.sectionHeaderSimple, { flexDirection: rtl.flexDirection }]}>
                                            <MaterialCommunityIcons name="pencil-outline" size={18} color={C.accentGreen} />
                                            <Text style={[styles.sectionTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                                                {t('basic_info', language)}
                                            </Text>
                                        </View>
                                        <TextInput
                                            style={[styles.input, { color: C.textPrimary, borderBottomColor: C.border, textAlign: rtl.textAlign }]}
                                            placeholder={t('brand_placeholder', language)}
                                            placeholderTextColor={C.textDim}
                                            value={brand}
                                            onChangeText={setBrand}
                                        />
                                        <TextInput
                                            style={[styles.input, { color: C.textPrimary, borderBottomColor: 'transparent', textAlign: rtl.textAlign }]}
                                            placeholder={t('product_name_placeholder', language)}
                                            placeholderTextColor={C.textDim}
                                            value={name}
                                            onChangeText={setName}
                                        />
                                    </View>
                                </StaggeredView>

                                <StaggeredView index={2}>
                                    <View style={styles.sectionMargin}>
                                        <CustomDropdown
                                            icon="earth"
                                            title={t('manufacturing_country', language)}
                                            items={COUNTRIES}
                                            selectedItems={country}
                                            multiSelect={false}
                                            onSelect={(item) => setCountry(item.id)}
                                            placeholder={t('select_country', language)}
                                            C={C}
                                            rtl={rtl}
                                        />
                                        <View style={{ height: 15 }} />
                                        <CustomDropdown
                                            icon="layers-outline"
                                            title={t('product_category', language)}
                                            items={formattedCategories}
                                            selectedItems={selectedCatId}
                                            multiSelect={false}
                                            onSelect={handleCategorySelect}
                                            placeholder={t('select_category', language)}
                                            C={C}
                                            rtl={rtl}
                                        />
                                    </View>
                                </StaggeredView>

                                <StaggeredView index={3}>
                                    <View style={[styles.glassCard, { backgroundColor: C.card, borderColor: C.border }]}>
                                        <View style={[styles.sectionHeaderSimple, { flexDirection: rtl.flexDirection }]}>
                                            <MaterialCommunityIcons name="flask-outline" size={18} color={C.gold} />
                                            <Text style={[styles.sectionTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                                                {t('specifications', language)}
                                            </Text>
                                        </View>
                                        <View style={[styles.inputRow, { flexDirection: rtl.flexDirection }]}>
                                            <View style={styles.flex1}>
                                                <Text style={[styles.innerLabel, { color: C.textDim, textAlign: rtl.textAlign }]}>
                                                    {t('price_dzd', language)}
                                                </Text>
                                                <TextInput
                                                    style={[styles.rowInput, { color: C.textPrimary, textAlign: 'center' }]}
                                                    placeholder="00"
                                                    placeholderTextColor={C.textDim}
                                                    keyboardType="numeric"
                                                    value={priceMin}
                                                    onChangeText={setPriceMin}
                                                />
                                            </View>
                                            <View style={[styles.dividerVertical, { backgroundColor: C.border }]} />
                                            <View style={styles.flex2}>
                                                <Text style={[styles.innerLabel, { color: C.textDim, textAlign: rtl.textAlign }]}>
                                                    {t('quantity_size', language)}
                                                </Text>
                                                <View style={[styles.quantityRow, { flexDirection: rtl.flexDirection }]}>
                                                    <TextInput
                                                        style={[styles.quantityInput, { color: C.textPrimary, textAlign: 'center' }]}
                                                        placeholder="200"
                                                        placeholderTextColor={C.textDim}
                                                        keyboardType="numeric"
                                                        value={qtyValue}
                                                        onChangeText={setQtyValue}
                                                    />
                                                    <View style={[styles.unitButtons, { flexDirection: rtl.flexDirection }]}>
                                                        {['ml', 'g', 'L'].map(u => (
                                                            <TouchableOpacity
                                                                key={u}
                                                                onPress={() => setQtyUnit(u)}
                                                                style={[
                                                                    styles.unitBtn,
                                                                    {
                                                                        backgroundColor: qtyUnit === u ? C.accentGreen : 'transparent',
                                                                        borderColor: C.border
                                                                    }
                                                                ]}
                                                            >
                                                                <Text style={{
                                                                    fontSize: 11,
                                                                    color: qtyUnit === u ? '#FFF' : C.textDim,
                                                                    fontWeight: 'bold'
                                                                }}>
                                                                    {u}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </StaggeredView>

                                <StaggeredView index={4}>
                                    <View style={styles.sectionMargin}>
                                        <CustomDropdown
                                            icon="account-star-outline"
                                            title={t('target_audience', language)}
                                            subtitle={t('skin_hair_type', language)}
                                            items={TARGET_TYPES}
                                            selectedItems={selectedTargets}
                                            multiSelect={true}
                                            onSelect={(item) => handleMultiSelect(item, selectedTargets, setSelectedTargets)}
                                            placeholder={t('select_target', language)}
                                            C={C}
                                            rtl={rtl}
                                        />
                                    </View>
                                </StaggeredView>

                                {selectedCatId && formattedClaims.length > 0 && (
                                    <StaggeredView index={5}>
                                        <View style={styles.sectionMargin}>
                                            <CustomDropdown
                                                icon="check-decagram-outline"
                                                title={t('product_claims', language)}
                                                subtitle={t('benefits_claims', language)}
                                                items={formattedClaims}
                                                selectedItems={selectedClaims}
                                                multiSelect={true}
                                                onSelect={(item) => handleMultiSelect(item, selectedClaims, setSelectedClaims)}
                                                placeholder={t('select_claims', language)}
                                                C={C}
                                                rtl={rtl}
                                            />
                                        </View>
                                    </StaggeredView>
                                )}

                                <StaggeredView index={6}>
                                    <View style={[styles.glassCard, { backgroundColor: C.card, borderColor: C.border }]}>
                                        <View style={[styles.sectionHeaderSimple, { flexDirection: rtl.flexDirection }]}>
                                            <MaterialCommunityIcons name="text-box-search-outline" size={18} color="#8b5cf6" />
                                            <Text style={[styles.sectionTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                                                {t('ingredients_list', language)}
                                            </Text>
                                        </View>
                                        <View style={[styles.tipBox, { flexDirection: rtl.flexDirection }]}>
                                            <MaterialCommunityIcons name="lightbulb-outline" size={16} color={C.accentGreen} />
                                            <Text style={[styles.tipText, { color: C.textDim, textAlign: rtl.textAlign, flex: 1 }]}>
                                                {t('ai_ingredient_tip', language)}
                                            </Text>
                                        </View>
                                        <TextInput
                                            style={[styles.textArea, { color: C.textPrimary, backgroundColor: C.background, borderColor: C.border, textAlign: rtl.textAlign }]}
                                            placeholder={t('ingredients_placeholder', language)}
                                            placeholderTextColor={C.textDim}
                                            multiline
                                            numberOfLines={4}
                                            value={ingredients}
                                            onChangeText={setIngredients}
                                        />
                                    </View>
                                </StaggeredView>

                                <StaggeredView index={7}>
                                    <View style={[styles.glassCard, { backgroundColor: C.card, borderColor: C.border }]}>
                                        <View style={[styles.sectionHeaderSimple, { flexDirection: rtl.flexDirection }]}>
                                            <MaterialCommunityIcons name="image" size={18} color={C.accentGreen} />
                                            <Text style={[styles.sectionTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                                                {t('product_image', language)}
                                            </Text>
                                        </View>
                                        
                                        <TouchableOpacity
                                            onPress={showImageOptions}
                                            disabled={uploadingImage}
                                            style={[
                                                styles.imageUploadArea,
                                                { borderColor: C.border, backgroundColor: C.background }
                                            ]}
                                        >
                                            {uploadingImage ? (
                                                <View style={styles.uploadingContainer}>
                                                    <ActivityIndicator size="large" color={C.accentGreen} />
                                                    <Text style={[styles.uploadingText, { color: C.textDim }]}>
                                                        {t('uploading_image', language)}
                                                    </Text>
                                                </View>
                                            ) : selectedImage ? (
                                                <View style={styles.selectedImageContainer}>
                                                    <Image 
                                                        source={{ uri: selectedImage }} 
                                                        style={styles.selectedImage}
                                                        resizeMode="cover"
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.removeImageBtn}
                                                        onPress={() => {
                                                            setSelectedImage(null);
                                                            setImageUrl('');
                                                        }}
                                                    >
                                                        <Feather name="x" size={20} color="#FFF" />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={styles.uploadPlaceholder}>
                                                    <Feather name="camera" size={40} color={C.textDim} />
                                                    <Text style={[styles.uploadPlaceholderText, { color: C.textDim }]}>
                                                        {t('tap_to_select_image', language)}
                                                    </Text>
                                                    <Text style={[styles.uploadHint, { color: C.textDim }]}>
                                                        {t('image_format_hint', language)}
                                                    </Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </StaggeredView>

                                <View style={{ height: 100 }} />
                            </ScrollView>

                            {/* Footer */}
                            <View style={[styles.footer, { backgroundColor: C.background, borderTopColor: C.border, flexDirection: rtl.flexDirection }]}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                                    <Text style={{ color: C.textDim, fontFamily: 'Tajawal-Bold', fontSize: 15 }}>
                                        {t('cancel', language)}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.submitBtnWrapper, rtl.isRTL && { marginLeft: 0, marginRight: 16 }]}
                                    onPress={handleSave}
                                    disabled={isSubmitting || uploadingImage}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[C.accentGreen, '#2E8062']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.submitGradient}
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator color="#FFF" />
                                        ) : (
                                            <View style={[styles.submitInnerRow, { flexDirection: rtl.flexDirection }]}>
                                                <Text style={styles.submitText}>{t('submit_for_review', language)}</Text>
                                                <Feather name="check" size={18} color="#FFF" />
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </KeyboardAvoidingView>
                </Animated.View>
            </Modal>

            {/* Camera Modal */}
            <CustomCameraModal
                isVisible={cameraVisible}
                onClose={() => setCameraVisible(false)}
                onPictureTaken={handleImageCapture}
            />
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    content: {
        height: SCREEN_HEIGHT * 0.92,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    topNotch: {
        alignItems: 'center',
        paddingTop: 12,
        marginBottom: 4,
    },
    rewardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    rewardText: {
        color: '#FFF',
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 12,
    },
    scrollContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 20,
    },
    introHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    mainTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 24,
    },
    mainSub: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        marginTop: 4,
    },

    glassCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    sectionHeaderSimple: {
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    sectionIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15,
    },

    dropdownContainer: {
        borderRadius: 18,
        borderWidth: 1,
        overflow: 'hidden',
    },
    dropdownHeader: {
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    dropdownHeaderContent: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    dropdownIconContainer: {
        flexShrink: 0,
    },
    dropdownTextContainer: {
        flex: 1,
    },
    dropdownTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 14,
    },
    dropdownSubtitle: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        marginTop: 2,
    },
    dropdownValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
    },
    dropdownPreview: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        maxWidth: 100,
    },
    dropdownBodyWrapper: {
        overflow: 'hidden',
    },
    dropdownScrollView: {
        maxHeight: 240,
    },
    dropdownBody: {
        borderTopWidth: 1,
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    dropdownItem: {
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
    },
    dropdownItemText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
        flex: 1,
    },
    checkboxCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },

    input: {
        height: 48,
        fontSize: 14,
        fontFamily: 'Tajawal-Medium',
        borderBottomWidth: 1,
        paddingHorizontal: 4,
    },
    inputRow: {
        alignItems: 'center',
        paddingVertical: 8,
        gap: 12,
    },
    flex1: {
        flex: 1,
    },
    flex2: {
        flex: 2,
    },
    innerLabel: {
        fontSize: 11,
        fontFamily: 'Tajawal-Bold',
        marginBottom: 6,
    },
    rowInput: {
        height: 42,
        fontSize: 16,
        fontFamily: 'Tajawal-ExtraBold',
        paddingHorizontal: 8,
    },
    dividerVertical: {
        width: 1,
        height: 35,
        opacity: 0.3,
    },
    quantityRow: {
        alignItems: 'center',
        gap: 8,
    },
    quantityInput: {
        flex: 1,
        height: 42,
        fontSize: 16,
        fontFamily: 'Tajawal-ExtraBold',
        paddingHorizontal: 8,
    },
    unitButtons: {
        gap: 6,
    },
    unitBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    textArea: {
        minHeight: 90,
        fontSize: 13,
        fontFamily: 'Tajawal-Regular',
        textAlignVertical: 'top',
        paddingTop: 12,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    tipBox: {
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.03)',
        padding: 10,
        borderRadius: 12,
        marginBottom: 12,
    },
    tipText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
    },
    sectionMargin: {
        marginBottom: 16,
    },
    
    imageUploadArea: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 180,
    },
    uploadingContainer: {
        alignItems: 'center',
        gap: 12,
    },
    uploadingText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
    },
    selectedImageContainer: {
        position: 'relative',
        width: '100%',
        alignItems: 'center',
    },
    selectedImage: {
        width: 150,
        height: 150,
        borderRadius: 12,
    },
    removeImageBtn: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#ef4444',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    uploadPlaceholder: {
        alignItems: 'center',
        gap: 12,
    },
    uploadPlaceholderText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 14,
    },
    uploadHint: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 11,
    },

    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 85,
        alignItems: 'center',
        paddingHorizontal: 20,
        borderTopWidth: 1,
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    },
    cancelBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    submitBtnWrapper: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
        marginLeft: 16,
    },
    submitGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitInnerRow: {
        alignItems: 'center',
        gap: 8,
    },
    submitText: {
        color: '#FFF',
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15,
    },
});