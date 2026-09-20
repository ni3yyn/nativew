// src/components/catalog/AddProductModal.js

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions,
    Animated, Pressable, Easing, Image
} from 'react-native';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

// Context & Data
import { useTheme } from '../../context/ThemeContext';
import { PRODUCT_TYPES, COUNTRIES } from '../../constants/productData';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';
import { compressImage, uploadImageToCloudinary } from '../../services/imageService';
import CustomCameraModal from '../../components/oilguard/CustomCameraModal';
import { AlertService } from '../../services/alertService';
import { getClaimsForCategory } from './BountyModal';
import AppTextInput from '../common/AppTextInput';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// 🌟 ARABIC TARGET TYPES
const TARGET_TYPES = [
    { id: 'بشرة دهنية', label: 'بشرة دهنية' },
    { id: 'بشرة عادية', label: 'بشرة عادية' },
    { id: 'بشرة جافة', label: 'بشرة جافة' },
    { id: 'بشرة مختلطة', label: 'بشرة مختلطة' },
    { id: 'بشرة حساسة', label: 'بشرة حساسة' },
    { id: 'كل أنواع البشرة', label: 'كل أنواع البشرة' },
    { id: 'شعر دهني', label: 'شعر دهني' },
    { id: 'شعر جاف', label: 'شعر جاف' },
    { id: 'شعر متضرر', label: 'شعر متضرر' },
    { id: 'شعر مصبوغ', label: 'شعر مصبوغ' },
];

// 🌟 SERVER ARABIC CLAIMS LIST
const SERVER_ARABIC_CLAIMS = [
    "مضاد لتساقط الشعر", "تعزيز النمو", "تكثيف الشعر", "مرطب للشعر",
    "مخصص للشعر الجاف", "مخصص للشعر الدهني", "مضاد للقشرة", "مكافحة التجعد",
    "إصلاح الشعر المتضرر", "حماية من الحرارة", "تغذية الشعر", "تلميع ولمعان",
    "حماية اللون", "تفتيح البشرة", "توحيد لون البشرة", "تفتيح البقع الداكنة",
    "مكافحة التجاعيد", "شد البشرة", "تحفيز الكولاجين", "تفتيح تحت العين",
    "مضاد لحب الشباب", "مضاد للرؤوس السوداء", "تنقية المسام", "توازن الدهون والزيوت",
    "للبشرة الدهنية", "للبشرة الجافة", "للبشرة الحساسة", "مرطب للبشرة",
    "مهدئ", "مضاد للالتهابات", "تقشير لطيف", "تنظيف عميق",
    "تنظيف لطيف", "إزالة المكياج", "تهدئة البشرة", "توازن الحموضة",
    "قابض للمسام", "تقشير", "تنقية عميقة", "مضاد للأكسدة",
    "إزالة السيلوليت", "شد الجسم", "حماية من الشمس", "حماية واسعة الطيف",
    "مقاوم للماء"
];

// Custom Dropdown Component
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
            }).start(() => {
                setIsOpen(false);
            });
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
                                        {isSelected && <Feather name="check" size={12} color={C.textOnAccent || '#FFF'} />}
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

    // TABS: 'photos' (Fast Mode) vs 'manual' (Detailed Form)
    const [activeTab, setActiveTab] = useState('photos');

    // Manual Form States
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
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageUrl, setImageUrl] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    // Fast Mode States
    const [quickFrontImage, setQuickFrontImage] = useState(null);
    const [quickInciImage, setQuickInciImage] = useState(null);
    const [uploadingFront, setUploadingFront] = useState(false);
    const [uploadingInci, setUploadingInci] = useState(false);
    const [quickBrand, setQuickBrand] = useState('');
    const [quickName, setQuickName] = useState('');
    const [quickPrice, setQuickPrice] = useState('');

    // Shared Camera / Modal State
    const [cameraVisible, setCameraVisible] = useState(false);
    const [cameraTarget, setCameraTarget] = useState('manual');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (visible) {
            Animated.spring(animState, {
                toValue: 1,
                friction: 9,
                tension: 50,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(animState, {
            toValue: 0,
            duration: 250,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            onClose();
            resetForm();
        });
    };

    // Camera Capture Dispatcher
    const handleImageCapture = async (photo) => {
        setCameraVisible(false);

        if (cameraTarget === 'quick_front') {
            setUploadingFront(true);
            try {
                const uploadedUrl = await uploadImageToCloudinary(photo.uri);
                if (uploadedUrl) {
                    setQuickFrontImage(uploadedUrl);
                    AlertService.success(t('success', language), language === 'ar' ? 'تم رفع صورة الواجهة بنجاح' : 'Front photo uploaded');
                }
            } catch (error) {
                AlertService.error(t('error', language), t('image_upload_failed', language));
            } finally {
                setUploadingFront(false);
            }
            return;
        }

        if (cameraTarget === 'quick_inci') {
            setUploadingInci(true);
            try {
                const uploadedUrl = await uploadImageToCloudinary(photo.uri);
                if (uploadedUrl) {
                    setQuickInciImage(uploadedUrl);
                    AlertService.success(t('success', language), language === 'ar' ? 'تم رفع صورة المكونات بنجاح' : 'INCI photo uploaded');
                }
            } catch (error) {
                AlertService.error(t('error', language), t('image_upload_failed', language));
            } finally {
                setUploadingInci(false);
            }
            return;
        }

        setUploadingImage(true);
        try {
            const uploadedUrl = await uploadImageToCloudinary(photo.uri);
            if (uploadedUrl) {
                setImageUrl(uploadedUrl);
                setSelectedImage(uploadedUrl);
                AlertService.success(t('success', language), t('image_uploaded_success', language));
            } else {
                AlertService.error(t('error', language), t('image_upload_failed', language));
            }
        } catch (error) {
            AlertService.error(t('error', language), t('image_upload_failed', language));
        } finally {
            setUploadingImage(false);
        }
    };

    // Gallery Picker Dispatcher
    const pickFromGallery = async (target = 'manual') => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                AlertService.error(t('permission_required', language), t('gallery_permission_denied', language));
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.85,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                const compressedUri = await compressImage(result.assets[0].uri);

                if (target === 'quick_front') {
                    setUploadingFront(true);
                    const uploadedUrl = await uploadImageToCloudinary(compressedUri);
                    if (uploadedUrl) setQuickFrontImage(uploadedUrl);
                    setUploadingFront(false);
                    return;
                }

                if (target === 'quick_inci') {
                    setUploadingInci(true);
                    const uploadedUrl = await uploadImageToCloudinary(compressedUri);
                    if (uploadedUrl) setQuickInciImage(uploadedUrl);
                    setUploadingInci(false);
                    return;
                }

                setUploadingImage(true);
                const uploadedUrl = await uploadImageToCloudinary(compressedUri);
                if (uploadedUrl) {
                    setImageUrl(uploadedUrl);
                    setSelectedImage(uploadedUrl);
                }
                setUploadingImage(false);
            }
        } catch (error) {
            AlertService.error(t('error', language), t('image_pick_error', language));
            setUploadingImage(false);
            setUploadingFront(false);
            setUploadingInci(false);
        }
    };

    const showImageOptions = (target = 'manual') => {
        AlertService.show({
            title: t('add_product_image', language),
            message: t('choose_image_source', language),
            type: 'info',
            buttons: [
                { 
                    text: t('camera', language), 
                    style: 'primary', 
                    onPress: () => {
                        setCameraTarget(target);
                        setCameraVisible(true);
                    } 
                },
                { 
                    text: t('gallery', language), 
                    style: 'secondary', 
                    onPress: () => pickFromGallery(target) 
                },
                { text: t('cancel', language), style: 'secondary' }
            ]
        });
    };

    const formattedCategories = useMemo(() => {
        return PRODUCT_TYPES.map(cat => ({
            id: cat.id,
            label: t(cat.labelKey, language),
            icon: cat.icon
        }));
    }, [language]);

    const formattedClaims = useMemo(() => {
        if (selectedCatId) {
            const rawClaims = getClaimsForCategory(selectedCatId);
            if (rawClaims && rawClaims.length > 0) {
                return rawClaims.map(claim => ({ id: claim, label: claim }));
            }
        }
        return SERVER_ARABIC_CLAIMS.map(claim => ({ id: claim, label: claim }));
    }, [selectedCatId]);

    const handleCategorySelect = (cat) => {
        if (selectedCatId !== cat.id) {
            setSelectedCatId(cat.id);
        }
    };

    const handleMultiSelect = (item, state, setState) => {
        setState(prev => prev.includes(item.id) ? prev.filter(i => i !== item.id) : [...prev, item.id]);
    };

    const handleSave = async () => {
        // ── 1. FAST MODE (PHOTOS + BRAND + NAME + MANDATORY PRICE) ──────────
        if (activeTab === 'photos') {
            if (!quickFrontImage || !quickInciImage) {
                AlertService.error(
                    language === 'ar' ? 'صور ناقصة' : 'Missing Photos',
                    language === 'ar'
                        ? 'يرجى رفع صورة واجهة المنتج وصورة قائمة المكونات (INCI) معاً.'
                        : 'Please provide both the front product photo and the INCI ingredients photo.'
                );
                return;
            }

            if (!quickBrand.trim() || !quickName.trim()) {
                AlertService.error(
                    language === 'ar' ? 'بيانات ناقصة' : 'Missing Fields',
                    language === 'ar'
                        ? 'يرجى كتابة الماركة واسم المنتج للمتابعة.'
                        : 'Please enter both the brand and product name.'
                );
                return;
            }

            const numericPrice = parseInt(quickPrice.trim(), 10);
            if (!quickPrice.trim() || isNaN(numericPrice) || numericPrice <= 0) {
                AlertService.error(
                    language === 'ar' ? 'السعر مطلوب' : 'Price Required',
                    language === 'ar'
                        ? 'يرجى إدخال السعر التقديري للمنتج بالدينار الجزائري (DZD).'
                        : 'Please enter a valid estimated product price in DZD.'
                );
                return;
            }

            setIsSubmitting(true);
            const quickPayload = {
                submissionType: 'photos_only',
                frontImage: quickFrontImage,
                inciImage: quickInciImage,
                image: quickFrontImage,
                brand: quickBrand.trim(),
                name: quickName.trim(),
                price: { min: numericPrice, max: null, currency: 'DZD' },
                country: 'Unknown',
                category: null,
                ingredients: '',
                targetTypes: [],
                marketingClaims: [],
                status: 'pending',
                source: 'quick_photos_submission',
                createdAt: new Date().toISOString(),
            };

            try {
                await onSubmit(quickPayload);
                AlertService.success(
                    t('product_submitted', language),
                    t('product_review_pending', language)
                );
                handleClose();
            } catch (error) {
                AlertService.error(t('error', language), t('product_submit_error', language));
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // ── 2. DETAILED MANUAL FORM ─────────────────────────────────────
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
            submissionType: 'manual_detailed',
            brand: brand.trim(),
            name: name.trim(),
            image: imageUrl || null,
            ingredients: ingredients.trim(),
            country: country || "Unknown",
            category: { id: catObj.id, label: t(catObj.labelKey, language), icon: catObj.icon },
            quantity: qtyValue ? `${qtyValue} ${qtyUnit}` : "null",
            price: { min: parseInt(priceMin, 10) || null, max: null, currency: "DZD" },
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
        setQuickFrontImage(null);
        setQuickInciImage(null);
        setQuickBrand('');
        setQuickName('');
        setQuickPrice('');
    };

    const isUploadingAny = uploadingImage || uploadingFront || uploadingInci;
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
                            {/* Top Notch Badge */}
                            <View style={styles.topNotch}>
                                <LinearGradient
                                    colors={[C.accentGreen, C.primary]}
                                    style={styles.rewardBadge}
                                >
                                    <FontAwesome5 name="medal" size={12} color={C.textOnAccent || '#FFF'} />
                                    <Text style={[styles.rewardText, { color: C.textOnAccent || '#FFF' }]}>+200 نقطة</Text>
                                </LinearGradient>
                            </View>

                            <ScrollView
                                ref={mainScrollViewRef}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContainer}
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* Header */}
                                <View style={styles.introHeader}>
                                    <Text style={[styles.mainTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                                        {t('add_new_product', language)}
                                    </Text>
                                </View>

                                {/* 🌟 CLEAN TAB BAR */}
                                <View style={[styles.cleanTabBar, { flexDirection: rtl.flexDirection, borderBottomColor: C.border }]}>
                                    <TouchableOpacity
                                        style={[
                                            styles.cleanTabBtn,
                                            activeTab === 'photos' && [styles.cleanTabBtnActive, { borderBottomColor: C.accentGreen }]
                                        ]}
                                        onPress={() => {
                                            Haptics.selectionAsync().catch(() => {});
                                            setActiveTab('photos');
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Feather 
                                            name="zap" 
                                            size={14} 
                                            color={activeTab === 'photos' ? C.accentGreen : C.textDim} 
                                        />
                                        <Text style={[
                                            styles.cleanTabBtnText, 
                                            { 
                                                color: activeTab === 'photos' ? C.textPrimary : C.textDim,
                                                fontFamily: activeTab === 'photos' ? 'Tajawal-ExtraBold' : 'Tajawal-Bold'
                                            }
                                        ]}>
                                            {language === 'ar' ? 'الوضع السريع (صور)' : 'Fast Mode (Photos)'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.cleanTabBtn,
                                            activeTab === 'manual' && [styles.cleanTabBtnActive, { borderBottomColor: C.accentGreen }]
                                        ]}
                                        onPress={() => {
                                            Haptics.selectionAsync().catch(() => {});
                                            setActiveTab('manual');
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Feather 
                                            name="edit-3" 
                                            size={14} 
                                            color={activeTab === 'manual' ? C.accentGreen : C.textDim} 
                                        />
                                        <Text style={[
                                            styles.cleanTabBtnText, 
                                            { 
                                                color: activeTab === 'manual' ? C.textPrimary : C.textDim,
                                                fontFamily: activeTab === 'manual' ? 'Tajawal-ExtraBold' : 'Tajawal-Bold'
                                            }
                                        ]}>
                                            {language === 'ar' ? 'إدخال يدوي مفصل' : 'Detailed Form'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* ─────────────────────────────────────────────────────────────
                                    🌟 TAB 1: FAST MODE (CLEAN, UNBOXED & THEME-BASED)
                                ────────────────────────────────────────────────────────────── */}
                                {activeTab === 'photos' && (
                                    <View style={styles.fastWrapper}>
                                        {/* Clean Inline Note (Theme-driven, no boxes) */}
                                        <View style={[styles.cleanNoticeRow, { flexDirection: rtl.flexDirection }]}>
                                            <Feather name="info" size={15} color={C.accentGreen} style={{ marginTop: 2 }} />
                                            <Text style={[styles.cleanNoticeText, { color: C.textSecondary, textAlign: rtl.textAlign }]}>
                                                {language === 'ar'
                                                    ? 'صوّري إطار قائمة المكونات (INCI) فقط عن قرب دون كامل العبوة لضمان وضوح النص.'
                                                    : 'Frame only the ingredients list (INCI) closely. Do not capture the whole bottle.'}
                                            </Text>
                                        </View>

                                        {/* Dual Modern Slots */}
                                        <View style={[styles.dualSlotsRow, { flexDirection: rtl.flexDirection }]}>
                                            {/* 1. FRONT PHOTO */}
                                            <TouchableOpacity
                                                style={[
                                                    styles.cleanSlot,
                                                    { 
                                                        backgroundColor: C.inputBg, 
                                                        borderColor: quickFrontImage ? C.accentGreen : C.border,
                                                    }
                                                ]}
                                                onPress={() => showImageOptions('quick_front')}
                                                activeOpacity={0.7}
                                            >
                                                {uploadingFront ? (
                                                    <View style={styles.slotLoading}>
                                                        <ActivityIndicator size="small" color={C.accentGreen} />
                                                        <Text style={[styles.slotLoadingText, { color: C.textDim }]}>
                                                            {language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
                                                        </Text>
                                                    </View>
                                                ) : quickFrontImage ? (
                                                    <View style={styles.slotFilled}>
                                                        <Image source={{ uri: quickFrontImage }} style={styles.slotImage} resizeMode="cover" />
                                                        <View style={[styles.slotCheckBadge, { backgroundColor: C.accentGreen }]}>
                                                            <Feather name="check" size={12} color={C.textOnAccent || '#FFF'} />
                                                        </View>
                                                        <TouchableOpacity
                                                            style={[styles.slotRemoveBtn, { backgroundColor: C.background }]}
                                                            onPress={() => setQuickFrontImage(null)}
                                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                        >
                                                            <Feather name="x" size={13} color={C.textPrimary} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <View style={styles.slotEmpty}>
                                                        <View style={[styles.cleanIconBox, { backgroundColor: C.card }]}>
                                                            <Feather name="image" size={18} color={C.accentGreen} />
                                                        </View>
                                                        <Text style={[styles.cleanSlotTitle, { color: C.textPrimary }]}>
                                                            {language === 'ar' ? 'واجهة المنتج' : 'Front Label'}
                                                        </Text>
                                                        <Text style={[styles.cleanSlotSub, { color: C.textDim }]}>
                                                            {language === 'ar' ? 'صورة الواجهة' : 'Front view'}
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>

                                            {/* 2. INCI PHOTO */}
                                            <TouchableOpacity
                                                style={[
                                                    styles.cleanSlot,
                                                    { 
                                                        backgroundColor: C.inputBg, 
                                                        borderColor: quickInciImage ? C.accentGreen : C.border,
                                                    }
                                                ]}
                                                onPress={() => showImageOptions('quick_inci')}
                                                activeOpacity={0.7}
                                            >
                                                {uploadingInci ? (
                                                    <View style={styles.slotLoading}>
                                                        <ActivityIndicator size="small" color={C.accentGreen} />
                                                        <Text style={[styles.slotLoadingText, { color: C.textDim }]}>
                                                            {language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}
                                                        </Text>
                                                    </View>
                                                ) : quickInciImage ? (
                                                    <View style={styles.slotFilled}>
                                                        <Image source={{ uri: quickInciImage }} style={styles.slotImage} resizeMode="cover" />
                                                        <View style={[styles.slotCheckBadge, { backgroundColor: C.accentGreen }]}>
                                                            <Feather name="check" size={12} color={C.textOnAccent || '#FFF'} />
                                                        </View>
                                                        <TouchableOpacity
                                                            style={[styles.slotRemoveBtn, { backgroundColor: C.background }]}
                                                            onPress={() => setQuickInciImage(null)}
                                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                        >
                                                            <Feather name="x" size={13} color={C.textPrimary} />
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <View style={styles.slotEmpty}>
                                                        <View style={[styles.cleanIconBox, { backgroundColor: C.card }]}>
                                                            <MaterialCommunityIcons name="text-box-search-outline" size={18} color={C.accentGreen} />
                                                        </View>
                                                        <Text style={[styles.cleanSlotTitle, { color: C.textPrimary }]}>
                                                            {language === 'ar' ? 'قائمة المكونات' : 'INCI List'}
                                                        </Text>
                                                        <Text style={[styles.cleanSlotSub, { color: C.textDim }]}>
                                                            {language === 'ar' ? 'النص فقط عن قرب' : 'Text frame only'}
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        </View>

                                        {/* Spacious Unboxed Inputs */}
                                        <View style={styles.cleanFormSection}>
                                            <View style={[styles.cleanInputRow, { flexDirection: rtl.flexDirection }]}>
                                                <View style={styles.flex1}>
                                                    <Text style={[styles.cleanLabel, { color: C.textDim, textAlign: rtl.textAlign }]}>
                                                        {language === 'ar' ? 'الماركة *' : 'Brand *'}
                                                    </Text>
                                                    <AppTextInput
                                                        style={[styles.cleanInput, { color: C.textPrimary, backgroundColor: C.inputBg, borderColor: C.border, textAlign: rtl.textAlign }]}
                                                        placeholder={language === 'ar' ? 'مثال: The Ordinary' : 'e.g. The Ordinary'}
                                                        placeholderTextColor={C.textDim}
                                                        value={quickBrand}
                                                        onChangeText={setQuickBrand}
                                                    />
                                                </View>
                                                <View style={styles.flex1}>
                                                    <Text style={[styles.cleanLabel, { color: C.textDim, textAlign: rtl.textAlign }]}>
                                                        {language === 'ar' ? 'اسم المنتج *' : 'Product Name *'}
                                                    </Text>
                                                    <AppTextInput
                                                        style={[styles.cleanInput, { color: C.textPrimary, backgroundColor: C.inputBg, borderColor: C.border, textAlign: rtl.textAlign }]}
                                                        placeholder={language === 'ar' ? 'مثال: Niacinamide 10%' : 'e.g. Niacinamide 10%'}
                                                        placeholderTextColor={C.textDim}
                                                        value={quickName}
                                                        onChangeText={setQuickName}
                                                    />
                                                </View>
                                            </View>

                                            <View style={styles.cleanPriceSection}>
                                                <Text style={[styles.cleanLabel, { color: C.textDim, textAlign: rtl.textAlign }]}>
                                                    {language === 'ar' ? 'السعر التقديري (DZD) *' : 'Estimated Price (DZD) *'}
                                                </Text>
                                                <View style={[styles.cleanPriceField, { backgroundColor: C.inputBg, borderColor: quickPrice ? C.accentGreen : C.border, flexDirection: rtl.flexDirection }]}>
                                                    <AppTextInput
                                                        style={[styles.cleanPriceTextInput, { color: C.textPrimary, textAlign: rtl.textAlign }]}
                                                        placeholder="00"
                                                        placeholderTextColor={C.textDim}
                                                        keyboardType="numeric"
                                                        value={quickPrice}
                                                        onChangeText={setQuickPrice}
                                                    />
                                                    <Text style={[styles.cleanPriceTag, { color: C.textDim }]}>DZD</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* ─────────────────────────────────────────────────────────────
                                    TAB 2: DETAILED MANUAL FORM
                                ────────────────────────────────────────────────────────────── */}
                                {activeTab === 'manual' && (
                                    <>
                                        <View style={[styles.glassCard, { backgroundColor: C.card, borderColor: C.border }]}>
                                            <View style={[styles.sectionHeaderSimple, { flexDirection: rtl.flexDirection }]}>
                                                <MaterialCommunityIcons name="pencil-outline" size={18} color={C.accentGreen} />
                                                <Text style={[styles.sectionTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                                                    {t('basic_info', language)}
                                                </Text>
                                            </View>
                                            <AppTextInput
                                                style={[styles.input, { color: C.textPrimary, borderBottomColor: C.border, textAlign: rtl.textAlign }]}
                                                placeholder={t('brand_placeholder', language)}
                                                placeholderTextColor={C.textDim}
                                                value={brand}
                                                onChangeText={setBrand}
                                            />
                                            <AppTextInput
                                                style={[styles.input, { color: C.textPrimary, borderBottomColor: 'transparent', textAlign: rtl.textAlign }]}
                                                placeholder={t('product_name_placeholder', language)}
                                                placeholderTextColor={C.textDim}
                                                value={name}
                                                onChangeText={setName}
                                            />
                                        </View>

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
                                            <View style={{ height: 12 }} />
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
                                                    <AppTextInput
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
                                                        <AppTextInput
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
                                                                        color: qtyUnit === u ? (C.textOnAccent || '#FFF') : C.textDim,
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

                                        {/* TARGET AUDIENCE DROPDOWN */}
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

                                        {/* CLAIMS DROPDOWN */}
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

                                        <View style={[styles.glassCard, { backgroundColor: C.card, borderColor: C.border }]}>
                                            <View style={[styles.sectionHeaderSimple, { flexDirection: rtl.flexDirection }]}>
                                                <MaterialCommunityIcons name="text-box-search-outline" size={18} color={C.purple} />
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
                                            <AppTextInput
                                                style={[styles.textArea, { color: C.textPrimary, backgroundColor: C.background, borderColor: C.border, textAlign: rtl.textAlign }]}
                                                placeholder={t('ingredients_placeholder', language)}
                                                placeholderTextColor={C.textDim}
                                                multiline
                                                numberOfLines={4}
                                                value={ingredients}
                                                onChangeText={setIngredients}
                                            />
                                        </View>

                                        <View style={[styles.glassCard, { backgroundColor: C.card, borderColor: C.border }]}>
                                            <View style={[styles.sectionHeaderSimple, { flexDirection: rtl.flexDirection }]}>
                                                <MaterialCommunityIcons name="image" size={18} color={C.accentGreen} />
                                                <Text style={[styles.sectionTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                                                    {t('product_image', language)}
                                                </Text>
                                            </View>
                                            
                                            <TouchableOpacity
                                                onPress={() => showImageOptions('manual')}
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
                                                            resizeMode="contain"
                                                        />
                                                        <TouchableOpacity
                                                            style={[styles.removeImageBtn, { backgroundColor: C.danger }]}
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
                                    </>
                                )}

                                <View style={{ height: 100 }} />
                            </ScrollView>

                            {/* Fixed Bottom Footer */}
                            <View style={[styles.footer, { backgroundColor: C.background, borderTopColor: C.border, flexDirection: rtl.flexDirection }]}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                                    <Text style={{ color: C.textDim, fontFamily: 'Tajawal-Bold', fontSize: 15 }}>
                                        {t('cancel', language)}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.submitBtnWrapper, rtl.isRTL && { marginLeft: 0, marginRight: 16 }]}
                                    onPress={handleSave}
                                    disabled={isSubmitting || isUploadingAny}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={[C.accentGreen, C.primary]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.submitGradient}
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator color={C.textOnAccent || '#FFF'} />
                                        ) : (
                                            <View style={[styles.submitInnerRow, { flexDirection: rtl.flexDirection }]}>
                                                <Text style={[styles.submitText, { color: C.textOnAccent || '#FFF' }]}>
                                                    {activeTab === 'photos'
                                                        ? (language === 'ar' ? 'إرسال المنتج للاعتماد' : 'Submit Product')
                                                        : t('submit_for_review', language)}
                                                </Text>
                                                <Feather name="check" size={18} color={C.textOnAccent || '#FFF'} />
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </KeyboardAvoidingView>
                </Animated.View>
            </Modal>

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
        marginBottom: 8,
    },
    mainTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 21,
    },

    // 🌟 CLEAN TAB BAR
    cleanTabBar: {
        width: '100%',
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        marginBottom: 16,
    },
    cleanTabBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderBottomWidth: 2.5,
        borderBottomColor: 'transparent',
    },
    cleanTabBtnActive: {},
    cleanTabBtnText: {
        fontSize: 13,
    },

    // 🌟 FAST MODE (CLEAN, UNBOXED, THEME-BASED)
    fastWrapper: {
        gap: 16,
        paddingTop: 4,
    },
    cleanNoticeRow: {
        alignItems: 'flex-start',
        gap: 8,
        paddingHorizontal: 4,
    },
    cleanNoticeText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12,
        lineHeight: 18,
        flex: 1,
    },
    dualSlotsRow: {
        gap: 12,
        width: '100%',
    },
    cleanSlot: {
        flex: 1,
        height: 140,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cleanIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    cleanSlotTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        textAlign: 'center',
    },
    cleanSlotSub: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        textAlign: 'center',
        marginTop: 2,
    },
    slotEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
    },
    slotFilled: {
        width: '100%',
        height: '100%',
        position: 'relative',
    },
    slotImage: {
        width: '100%',
        height: '100%',
    },
    slotCheckBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    slotRemoveBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    slotLoading: {
        alignItems: 'center',
        gap: 8,
    },
    slotLoadingText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10.5,
    },
    cleanFormSection: {
        gap: 14,
        marginTop: 2,
    },
    cleanInputRow: {
        gap: 12,
    },
    cleanLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
        marginBottom: 6,
        paddingHorizontal: 2,
    },
    cleanInput: {
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 13,
        fontFamily: 'Tajawal-Regular',
    },
    cleanPriceSection: {
        width: '100%',
    },
    cleanPriceField: {
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    cleanPriceTextInput: {
        flex: 1,
        height: '100%',
        fontSize: 14,
        fontFamily: 'Tajawal-Bold',
    },
    cleanPriceTag: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        paddingHorizontal: 4,
    },

    // MANUAL FORM STYLES
    glassCard: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 0.5,
        marginBottom: 14,
    },
    sectionHeaderSimple: {
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
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
        fontSize: 14.5,
    },
    dropdownContainer: {
        borderRadius: 18,
        borderWidth: 0.5,
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
        fontFamily: 'Tajawal-Regular',
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
        borderWidth: 0.5,
    },
    textArea: {
        minHeight: 90,
        fontSize: 13,
        fontFamily: 'Tajawal-Regular',
        textAlignVertical: 'top',
        paddingTop: 12,
        borderWidth: 0.5,
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
        marginBottom: 14,
    },
    imageUploadArea: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 160,
    },
    uploadingContainer: {
        alignItems: 'center',
        gap: 10,
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
        width: '100%',
        height: 160,
        borderRadius: 12,
    },
    removeImageBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        borderRadius: 14,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    uploadPlaceholder: {
        alignItems: 'center',
        gap: 10,
    },
    uploadPlaceholderText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13.5,
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
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15,
    },
});