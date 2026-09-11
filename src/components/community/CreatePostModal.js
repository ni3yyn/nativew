import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, Modal,
    ActivityIndicator, Image, StyleSheet, Platform, Dimensions, Animated, Easing, Pressable, Keyboard, PanResponder
} from 'react-native';
import { Ionicons, Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppTextInput from '../common/AppTextInput';
import WathiqScoreBadge from '../common/WathiqScoreBadge';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { CATEGORIES } from '../../constants/categories';
import { compressImage, uploadImageToCloudinary } from '../../services/imageService';
import { AlertService } from '../../services/alertService';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- ELEGANT PHOTO ATTACHMENT BOX (No Cropping Restrictions) ---
const ImageAttachmentBox = ({ imageUri, onPress, label, onDelete, necessary, COLORS, styles, rtl }) => (
    <TouchableOpacity 
        style={[
            styles.uploadBox, 
            necessary && !imageUri && { borderColor: COLORS.danger + '80' },
            imageUri && { borderColor: COLORS.accentGreen, borderWidth: 1 }
        ]} 
        onPress={onPress} 
        activeOpacity={0.8}
    >
        {imageUri ? (
            <View style={styles.uploadedContainer}>
                <Image source={{ uri: imageUri }} style={styles.uploadedThumb} resizeMode="cover" />
                <TouchableOpacity style={styles.deleteImgBtn} onPress={onDelete} activeOpacity={0.8}>
                    <Ionicons name="close" size={14} color="#FFF" />
                </TouchableOpacity>
            </View>
        ) : (
            <View style={[styles.placeholderContent, { flexDirection: rtl.flexDirection }]}>
                <View style={[styles.cameraIconCircle, { backgroundColor: (necessary ? COLORS.danger : COLORS.accentGreen) + '15' }]}>
                    <Feather name="camera" size={18} color={necessary ? COLORS.danger : COLORS.accentGreen} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.uploadBoxText, { color: necessary ? COLORS.danger : COLORS.textPrimary, textAlign: rtl.textAlign }]}>
                        {label} {necessary && '*'}
                    </Text>
                    <Text style={[styles.uploadBoxSub, { color: COLORS.textDim, textAlign: rtl.textAlign }]}>
                        {t('image_format_hint', 'ar') || 'أضيفي صورة بأي أبعاد بدون قص'}
                    </Text>
                </View>
                <Feather name="plus" size={18} color={COLORS.textDim} />
            </View>
        )}
    </TouchableOpacity>
);

// --- MILESTONE TIMELINE CARD ---
const MilestoneCard = ({ item, index, onPickImage, onChangeLabel, onDelete, canDelete, COLORS, styles, language, rtl }) => (
    <View style={[styles.milestoneCard, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
        <View style={[styles.milestoneHeader, { flexDirection: rtl.flexDirection }]}>
            <View style={[styles.milestoneIndexBadge, { backgroundColor: COLORS.gold + '1A' }]}>
                <Text style={[styles.milestoneIndex, { color: COLORS.gold }]}>
                    {t('community_create_post_milestone_label', language, { index: index + 1 })}
                </Text>
            </View>
            {canDelete && (
                <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Feather name="trash-2" size={14} color={COLORS.danger} />
                </TouchableOpacity>
            )}
        </View>

        <View style={[styles.milestoneBody, { flexDirection: rtl.flexDirection }]}>
            <TouchableOpacity 
                style={[
                    styles.milestoneImgBox, 
                    { backgroundColor: COLORS.background, borderColor: item.image ? COLORS.accentGreen : COLORS.border }
                ]} 
                onPress={onPickImage} 
                activeOpacity={0.8}
            >
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.uploadedThumb} resizeMode="cover" />
                ) : (
                    <View style={{ alignItems: 'center', gap: 4 }}>
                        <Feather name="camera" size={18} color={COLORS.textDim} />
                        <Text style={[styles.tinyLabel, { color: COLORS.textDim }]}>{t('community_create_post_milestone_image', language)}</Text>
                    </View>
                )}
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
                <Text style={[styles.labelSmall, { color: COLORS.textSecondary, textAlign: rtl.textAlign }]}>
                    {t('community_create_post_milestone_time_label', language)}
                </Text>
                <AppTextInput
                    style={[styles.inputMilestone, { color: COLORS.textPrimary, backgroundColor: COLORS.background, borderColor: COLORS.border, textAlign: rtl.textAlign }]}
                    placeholder={t('community_create_post_milestone_time_placeholder', language)}
                    placeholderTextColor={COLORS.textDim}
                    value={item.label}
                    onChangeText={onChangeLabel}
                />
            </View>
        </View>
    </View>
);

// --- JOURNEY DURATION PICKER ---
const DurationPicker = ({ value, onChangeText, unit, onSelectUnit, COLORS, styles, language, rtl }) => {
    const unitsLabels = {
        'أيام': t('journey_unit_days', language),
        'أسابيع': t('journey_unit_weeks', language),
        'أشهر': t('journey_unit_months', language),
        'سنوات': t('journey_unit_years', language)
    };
    const units = ['أيام', 'أسابيع', 'أشهر', 'سنوات'];

    return (
        <View style={[styles.durationRow, { flexDirection: rtl.flexDirection }]}>
            <View style={[styles.durationPrefix, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                <Text style={[styles.durationPrefixText, { color: COLORS.textSecondary }]}>
                    {t('journey_prefix_after', language)}
                </Text>
            </View>
            <AppTextInput
                style={[styles.durationInput, { color: COLORS.textPrimary, backgroundColor: COLORS.card, borderColor: COLORS.border }]}
                placeholder="0"
                placeholderTextColor={COLORS.textDim}
                keyboardType="numeric"
                value={value}
                onChangeText={onChangeText}
                textAlign="center"
            />
            <View style={[styles.unitChipsWrap, { flexDirection: rtl.flexDirection }]}>
                {units.map((u) => {
                    const isSelected = unit === u;
                    return (
                        <TouchableOpacity
                            key={u}
                            style={[
                                styles.unitChip,
                                {
                                    backgroundColor: isSelected ? COLORS.gold : COLORS.card,
                                    borderColor: isSelected ? COLORS.gold : COLORS.border,
                                }
                            ]}
                            onPress={() => onSelectUnit(u)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.unitChipText, { color: isSelected ? '#000' : COLORS.textDim, fontFamily: isSelected ? 'Tajawal-ExtraBold' : 'Tajawal-Bold' }]}>
                                {unitsLabels[u]}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// ============================================================================
//                       MAIN COMPONENT
// ============================================================================

const CreatePostModal = ({ visible, onClose, onSubmit, savedProducts, userRoutines, defaultType, isAdmin }) => {
    const language = useCurrentLanguage();
    const rtl = useRTL();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS, rtl, insets), [COLORS, rtl, insets]);

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    const postCategories = useMemo(() => {
        return CATEGORIES.filter(cat => 
            cat.id !== 'leaderboard' && 
            !cat.isAction && 
            (cat.id !== 'tips' || isAdmin)
        );
    }, [isAdmin]);

    const [type, setType] = useState('review');
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [images, setImages] = useState({ main: null });

    // Journey State
    const [milestones, setMilestones] = useState([
        { id: '1', label: '', image: null },
        { id: '2', label: '', image: null }
    ]);
    const [journeyProducts, setJourneyProducts] = useState([]);
    const [durValue, setDurValue] = useState('');
    const [durUnit, setDurUnit] = useState('أشهر');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            const initialType = (defaultType && defaultType !== 'leaderboard') ? defaultType : 'review';
            setType(initialType);
            setContent(''); 
            setTitle(''); 
            setSelectedProduct(null);
            setImages({ main: null }); 
            setJourneyProducts([]);
            setDurValue(''); 
            setDurUnit('أشهر');
            setMilestones([
                { id: Date.now().toString(), label: '', image: null },
                { id: (Date.now() + 1).toString(), label: '', image: null }
            ]);

            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
            ]).start();
        }
    }, [visible, defaultType]);

    const handleClose = () => {
        Keyboard.dismiss();
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished && onClose) onClose();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 120 || gestureState.vy > 0.8) {
                    handleClose();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        friction: 9,
                        tension: 50,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const requestImageSource = (callback) => {
        AlertService.show({
            title: t('community_create_post_image_source_title', language),
            message: t('community_create_post_image_source_msg', language),
            type: 'info',
            buttons: [
                {
                    text: t('community_create_post_image_source_library', language),
                    style: 'secondary',
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.85,
                            allowsEditing: false,
                        });
                        if (!result.canceled && result.assets?.[0]?.uri) {
                            callback(result.assets[0].uri);
                        }
                    }
                },
                {
                    text: t('community_create_post_image_source_camera', language),
                    style: 'primary',
                    onPress: async () => {
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.85,
                            allowsEditing: false,
                        });
                        if (!result.canceled && result.assets?.[0]?.uri) {
                            callback(result.assets[0].uri);
                        }
                    }
                },
                { text: t('action_cancel', language), style: 'destructive' }
            ]
        });
    };

    const pickImage = (key) => {
        requestImageSource(async (uri) => {
            const compressed = await compressImage(uri);
            setImages(prev => ({ ...prev, [key]: compressed }));
        });
    };

    const removeImage = (key) => {
        setImages(prev => ({ ...prev, [key]: null }));
    };

    const pickMilestoneImage = (index) => {
        requestImageSource(async (uri) => {
            const compressed = await compressImage(uri);
            const next = [...milestones];
            next[index].image = compressed;
            setMilestones(next);
        });
    };

    const updateMilestoneLabel = (text, index) => {
        const next = [...milestones];
        next[index].label = text;
        setMilestones(next);
    };

    const addMilestone = () => {
        setMilestones(prev => [...prev, { id: Date.now().toString(), label: '', image: null }]);
    };

    const removeMilestone = (index) => {
        setMilestones(prev => prev.filter((_, i) => i !== index));
    };

    const toggleJourneyProduct = (product) => {
        const exists = journeyProducts.find(p => p.id === product.id);
        if (exists) {
            setJourneyProducts(prev => prev.filter(p => p.id !== product.id));
        } else {
            setJourneyProducts(prev => [...prev, {
                id: product.id,
                name: product.productName || product.name,
                score: product.analysisData?.oilGuardScore || product.score || 0,
                analysisData: product.analysisData,
                price: '',
                productImage: product.productImage || product.image
            }]);
        }
    };

    const updateProductPrice = (id, price) => {
        setJourneyProducts(prev => prev.map(p => p.id === id ? { ...p, price } : p));
    };

    const resolveRoutineData = (routinePeriod) => {
        if (!routinePeriod || !Array.isArray(routinePeriod)) return [];

        const resolvedSteps = routinePeriod.map((step) => {
            const ids = step.productIds || [];
            if (ids.length === 0) return null;
            
            const richProducts = ids.map(id => {
                const shelfItem = savedProducts?.find(p => p.id === id);

                if (shelfItem) {
                    return {
                        id: shelfItem.id,
                        productName: shelfItem.productName || shelfItem.name || t('product_type_other', language),
                        productImage: shelfItem.productImage || shelfItem.imageUrl || shelfItem.image || null,
                        oilGuardScore: Number(shelfItem.analysisData?.oilGuardScore || shelfItem.score || 0),
                        productType: shelfItem.analysisData?.product_type || shelfItem.type || 'other',
                        detected_ingredients: shelfItem.analysisData?.detected_ingredients || shelfItem.ingredients || [],
                        marketingClaims: shelfItem.marketingClaims || shelfItem.claims || []
                    };
                }
                return {
                    id: id,
                    productName: step.details || t('weather_mini_unavailable', language),
                    productImage: null,
                    oilGuardScore: 0,
                    productType: 'other',
                    detected_ingredients: [],
                    marketingClaims: []
                };
            });

            return {
                stepName: step.name || t('weather_recommended', language), 
                products: richProducts
            };
        });

        return resolvedSteps.filter(Boolean);
    };

    const handleSubmit = async () => {
        if (!content.trim()) { 
            AlertService.error(t('community_create_post_validation_content', language), t('community_create_post_validation_content_msg', language)); 
            return; 
        }

        if (type === 'review' && !selectedProduct) {
            AlertService.error(t('community_create_post_validation_product', language), t('community_create_post_validation_product_msg', language)); 
            return;
        }

        if (type === 'journey') {
            if (!durValue) { AlertService.error(t('community_create_post_validation_product', language), t('community_create_post_validation_journey_duration_msg', language)); return; }
            if (journeyProducts.length === 0) { AlertService.error(t('community_create_post_validation_product', language), t('community_create_post_validation_journey_products_msg', language)); return; }
            if (milestones.filter(m => m.image).length < 2) { AlertService.error(t('community_create_post_validation_product', language), t('community_create_post_validation_journey_images_msg', language)); return; }
        }

        if (type === 'qa' && !title.trim()) {
            AlertService.error(t('community_create_post_validation_product', language), t('community_create_post_validation_qa_title_msg', language));
            return;
        }

        if (type === 'routine_rate') {
            if ((!userRoutines?.am || userRoutines.am.length === 0) && (!userRoutines?.pm || userRoutines.pm.length === 0)) {
                AlertService.error(t('community_create_post_validation_empty_routine', language), t('community_create_post_validation_empty_routine_msg', language));
                return;
            }
        }

        setLoading(true);

        // 🌟 PROPERLY UPLOAD CUSTOM ATTACHED PHOTO
        let uploadedMainUrl = null;
        if (type !== 'routine_rate' && images.main) {
            uploadedMainUrl = await uploadImageToCloudinary(images.main);
        }

        let processedMilestones = [];
        if (type === 'journey') {
            const promises = milestones.map(async m => {
                if (!m.image) return null;
                const url = await uploadImageToCloudinary(m.image);
                return { label: m.label, image: url };
            });
            processedMilestones = (await Promise.all(promises)).filter(Boolean);
        }

        let routineSnapshot = null;
        if (type === 'routine_rate') {
            routineSnapshot = {
                am: resolveRoutineData(userRoutines?.am),
                pm: resolveRoutineData(userRoutines?.pm)
            };
        }

        const resolvedType = selectedProduct?.productType || 
                             selectedProduct?.category?.id || 
                             selectedProduct?.analysisData?.product_type || 
                             'other';

        const payload = {
            type, 
            content: content.trim(),
            title: (type === 'qa' || type === 'tips') && title ? title.trim() : null,
            rating: null,
            taggedProduct: selectedProduct ? {
                id: selectedProduct.id,
                name: selectedProduct.productName || selectedProduct.name,
                score: selectedProduct.analysisData?.oilGuardScore || selectedProduct.score || 0,
                imageUrl: selectedProduct.productImage || selectedProduct.imageUrl || selectedProduct.image,
                productType: resolvedType,
                type: resolvedType,
                analysisData: selectedProduct.analysisData || null,
                marketingClaims: selectedProduct.marketingClaims || selectedProduct.claims || []
            } : null,
            journeyProducts: type === 'journey' ? journeyProducts : null,
            imageUrl: uploadedMainUrl, // 👈 Correctly mapped!
            milestones: processedMilestones,
            duration: type === 'journey' ? `${t('journey_prefix_after', language)} ${durValue} ${t('journey_unit_' + (durUnit === 'أيام' ? 'days' : durUnit === 'أسابيع' ? 'weeks' : durUnit === 'أشهر' ? 'months' : 'years'), language)}` : null,
            routineSnapshot
        };

        try {
            await onSubmit(payload);
            setLoading(false);
            handleClose();
        } catch (error) {
            setLoading(false);
            console.error("Post Submission Error:", error);
        }
    };

    const currentCatColor = COLORS[postCategories.find(c => c.id === type)?.colorKey] || COLORS.accentGreen;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
            <View style={styles.modalRoot}>
                {/* Animated Backdrop Fade */}
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.75)', opacity: backdropAnim }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                </Animated.View>

                {/* Flush Bottom Sheet */}
                <Animated.View style={[styles.modalSheet, { backgroundColor: COLORS.background, transform: [{ translateY: slideAnim }] }]}>
                    
                    {/* Top Notch Drag Handle */}
                    <View {...panResponder.panHandlers} style={styles.dragHandleBar}>
                        <View style={[styles.dragHandle, { backgroundColor: COLORS.border }]} />
                    </View>

                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: COLORS.textPrimary }]}>
                            {t('community_create_post_title', language)}
                        </Text>
                    </View>

                    {/* Category Switcher Tabs */}
                    <View style={styles.tabsContainer}>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={[styles.typeChipsContainer, { flexDirection: rtl.flexDirection }]}
                        >
                            {postCategories.map(cat => {
                                const catColor = COLORS[cat.colorKey] || COLORS.accentGreen;
                                const isSelected = type === cat.id;
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.typeChip, 
                                            { 
                                                flexDirection: rtl.flexDirection,
                                                backgroundColor: isSelected ? catColor : COLORS.card,
                                                borderColor: isSelected ? catColor : COLORS.border,
                                            }
                                        ]}
                                        onPress={() => {
                                            Haptics.selectionAsync().catch(() => {});
                                            setType(cat.id);
                                        }}
                                        activeOpacity={0.8}
                                    >
                                        <FontAwesome5 
                                            name={cat.icon} 
                                            size={12} 
                                            color={isSelected ? COLORS.textOnAccent : COLORS.textSecondary} 
                                        />
                                        <Text style={[styles.typeChipText, { color: isSelected ? COLORS.textOnAccent : COLORS.textPrimary, fontFamily: isSelected ? 'Tajawal-ExtraBold' : 'Tajawal-Bold' }]}>
                                            {t(cat.labelKey, language)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Form Scrollable Body */}
                    <View style={{ flex: 1 }}>
                        <ScrollView 
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={styles.formScrollContent}
                        >
                            {/* REVIEW POST EXPERIENCE */}
                            {type === 'review' && (
                                <View style={styles.sectionWrap}>
                                    <Text style={[styles.sectionHeading, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]}>
                                        {t('community_create_post_review_select_product', language)}
                                    </Text>
                                    
                                    {/* STATE A: Product is Selected */}
                                    {selectedProduct ? (
                                        <View style={[styles.selectedProductHero, { backgroundColor: COLORS.card, borderColor: COLORS.accentGreen }]}>
                                            <View style={[styles.selectedProductInner, { flexDirection: rtl.flexDirection }]}>
                                                <View style={styles.selectedProductImageWrap}>
                                                    {selectedProduct.productImage ? (
                                                        <Image source={{ uri: selectedProduct.productImage }} style={styles.selectedProductImg} resizeMode="cover" />
                                                    ) : (
                                                        <View style={[styles.selectedProductImgFallback, { backgroundColor: COLORS.background }]}>
                                                            <FontAwesome5 name="wine-bottle" size={24} color={COLORS.accentGreen} />
                                                        </View>
                                                    )}
                                                </View>

                                                <View style={styles.selectedProductMeta}>
                                                    <View style={[styles.selectedBadgeRow, { flexDirection: rtl.flexDirection }]}>
                                                        <WathiqScoreBadge score={selectedProduct.analysisData?.oilGuardScore || 0} size={36} />
                                                        <View style={[styles.verifiedTag, { backgroundColor: COLORS.accentGreen + '1A' }]}>
                                                            <Feather name="check" size={11} color={COLORS.accentGreen} />
                                                            <Text style={[styles.verifiedTagText, { color: COLORS.accentGreen }]}>
                                                                {language === 'ar' ? 'منتج محدد' : 'Selected'}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <Text style={[styles.selectedProductName, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]} numberOfLines={2}>
                                                        {selectedProduct.productName}
                                                    </Text>
                                                </View>

                                                {/* Change Product Button */}
                                                <TouchableOpacity 
                                                    style={[styles.changeProductBtn, { backgroundColor: COLORS.background, borderColor: COLORS.border }]} 
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                                        setSelectedProduct(null);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Feather name="refresh-cw" size={14} color={COLORS.textDim} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ) : (
                                        /* STATE B: No Product Selected */
                                        <View>
                                            <ScrollView 
                                                horizontal 
                                                showsHorizontalScrollIndicator={false} 
                                                contentContainerStyle={[styles.richProductsCarousel, { flexDirection: rtl.flexDirection }]}
                                            >
                                                {savedProducts?.map(p => (
                                                    <TouchableOpacity
                                                        key={p.id}
                                                        style={[
                                                            styles.richProductCard,
                                                            { 
                                                                backgroundColor: COLORS.card,
                                                                borderColor: COLORS.border,
                                                            }
                                                        ]}
                                                        onPress={() => {
                                                            Haptics.selectionAsync().catch(() => {});
                                                            setSelectedProduct(p);
                                                        }}
                                                        activeOpacity={0.85}
                                                    >
                                                        <View style={styles.richCardScoreBadge}>
                                                            <WathiqScoreBadge score={p.analysisData?.oilGuardScore || 0} size={32} />
                                                        </View>

                                                        <View style={[styles.richCardImgContainer, { backgroundColor: COLORS.background }]}>
                                                            {p.productImage ? (
                                                                <Image source={{ uri: p.productImage }} style={styles.richCardImg} resizeMode="cover" />
                                                            ) : (
                                                                <FontAwesome5 name="pump-soap" size={24} color={COLORS.textDim} />
                                                            )}
                                                        </View>

                                                        <Text style={[styles.richCardTitle, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]} numberOfLines={2}>
                                                            {p.productName}
                                                        </Text>

                                                        <View style={[styles.richCardSelectButton, { backgroundColor: COLORS.accentGreen + '18', borderColor: COLORS.accentGreen + '40' }]}>
                                                            <Text style={[styles.richCardSelectText, { color: COLORS.accentGreen }]}>
                                                                {language === 'ar' ? 'اختيار' : 'Select'}
                                                            </Text>
                                                            <Feather name="plus" size={12} color={COLORS.accentGreen} />
                                                        </View>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>

                                            {(!savedProducts || savedProducts.length === 0) && (
                                                <View style={[styles.emptyShelfHero, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                                                    <MaterialCommunityIcons name="bottle-tonic-outline" size={32} color={COLORS.textDim} />
                                                    <Text style={[styles.emptyShelfText, { color: COLORS.textDim, textAlign: 'center' }]}>
                                                        {t('community_create_post_journey_empty_shelf', language)}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {/* Review Text Body */}
                                    <Text style={[styles.sectionHeading, { color: COLORS.textPrimary, textAlign: rtl.textAlign, marginTop: 18 }]}>
                                        {t('community_create_post_details_label_default', language)}
                                    </Text>
                                    <AppTextInput
                                        style={[styles.inputContent, { color: COLORS.textPrimary, backgroundColor: COLORS.card, borderColor: COLORS.border, textAlign: rtl.textAlign }]}
                                        placeholder={t('community_create_post_placeholder_default', language)}
                                        placeholderTextColor={COLORS.textDim}
                                        multiline
                                        value={content}
                                        onChangeText={setContent}
                                    />

                                    {/* Photo Attachment */}
                                    <ImageAttachmentBox
                                        label={t('community_create_post_review_image_btn', language)}
                                        imageUri={images.main}
                                        onPress={() => pickImage('main')}
                                        onDelete={() => removeImage('main')}
                                        necessary={false}
                                        COLORS={COLORS}
                                        styles={styles}
                                        rtl={rtl}
                                    />
                                </View>
                            )}

                            {/* JOURNEY EXPERIENCE */}
                            {type === 'journey' && (
                                <View style={styles.sectionWrap}>
                                    <Text style={[styles.sectionHeading, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]}>
                                        {t('community_create_post_journey_duration', language)}
                                    </Text>
                                    <DurationPicker 
                                        value={durValue} 
                                        onChangeText={setDurValue} 
                                        unit={durUnit} 
                                        onSelectUnit={setDurUnit} 
                                        COLORS={COLORS} 
                                        styles={styles} 
                                        language={language} 
                                        rtl={rtl} 
                                    />

                                    <Text style={[styles.sectionHeading, { color: COLORS.textPrimary, textAlign: rtl.textAlign, marginTop: 12 }]}>
                                        {t('community_create_post_journey_products', language)}
                                    </Text>
                                    <ScrollView style={styles.productsScrollBox} nestedScrollEnabled>
                                        {savedProducts?.map(p => {
                                            const isSelected = journeyProducts.find(jp => jp.id === p.id);
                                            return (
                                                <TouchableOpacity
                                                    key={p.id}
                                                    style={[
                                                        styles.productRow, 
                                                        isSelected && { borderColor: COLORS.gold, backgroundColor: COLORS.gold + '12' }, 
                                                        { flexDirection: rtl.flexDirection, backgroundColor: COLORS.card, borderColor: COLORS.border }
                                                    ]}
                                                    onPress={() => toggleJourneyProduct(p)}
                                                    activeOpacity={0.8}
                                                >
                                                    <View style={[styles.checkbox, isSelected && { backgroundColor: COLORS.gold, borderColor: COLORS.gold }]}>
                                                        {isSelected && <Ionicons name="checkmark" size={12} color="#000" />}
                                                    </View>

                                                    <Image
                                                        source={p.productImage ? { uri: p.productImage } : require('../../../assets/logo.png')}
                                                        style={styles.productThumbSmall}
                                                    />

                                                    <Text style={[styles.prodName, isSelected && { color: COLORS.gold }, { textAlign: rtl.textAlign }]} numberOfLines={1}>{p.productName}</Text>

                                                    {isSelected && (
                                                        <AppTextInput
                                                            style={[styles.priceInput, { color: COLORS.textPrimary, backgroundColor: COLORS.background, borderColor: COLORS.border }]}
                                                            placeholder={t('catalog_currency', language) || 'دج'}
                                                            placeholderTextColor={COLORS.textDim}
                                                            keyboardType="numeric"
                                                            value={isSelected.price}
                                                            onChangeText={(txt) => updateProductPrice(p.id, txt)}
                                                        />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>

                                    <View style={[styles.sectionDivider, { backgroundColor: COLORS.border }]} />

                                    <View style={[styles.timelineHeaderRow, { flexDirection: rtl.flexDirection }]}>
                                        <Text style={[styles.sectionHeading, { color: COLORS.textPrimary, marginBottom: 0 }]}>
                                            {t('community_create_post_journey_timeline', language)}
                                        </Text>
                                        <TouchableOpacity onPress={addMilestone} style={[styles.addStepBtn, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}>
                                            <Text style={[styles.addStepText, { color: COLORS.textPrimary }]}>
                                                + {t('community_create_post_journey_add_milestone', language)}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {milestones.map((m, index) => (
                                        <MilestoneCard
                                            key={m.id || index}
                                            item={m}
                                            index={index}
                                            onPickImage={() => pickMilestoneImage(index)}
                                            onChangeLabel={(txt) => updateMilestoneLabel(txt, index)}
                                            onDelete={() => removeMilestone(index)}
                                            canDelete={milestones.length > 1}
                                            COLORS={COLORS}
                                            styles={styles}
                                            language={language}
                                            rtl={rtl}
                                        />
                                    ))}

                                    <Text style={[styles.sectionHeading, { color: COLORS.textPrimary, textAlign: rtl.textAlign, marginTop: 12 }]}>
                                        {t('community_create_post_placeholder_journey', language)}
                                    </Text>
                                    <AppTextInput
                                        style={[styles.inputContent, { color: COLORS.textPrimary, backgroundColor: COLORS.card, borderColor: COLORS.border, textAlign: rtl.textAlign }]}
                                        placeholder={t('community_create_post_placeholder_journey', language)}
                                        placeholderTextColor={COLORS.textDim}
                                        multiline
                                        value={content}
                                        onChangeText={setContent}
                                    />
                                </View>
                            )}

                            {/* Q&A EXPERIENCE */}
                            {type === 'qa' && (
                                <View style={styles.sectionWrap}>
                                    <Text style={[styles.sectionHeading, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]}>
                                        {t('community_create_post_qa_title_label', language)}
                                    </Text>
                                    <AppTextInput
                                        style={[styles.inputTitle, { color: COLORS.textPrimary, backgroundColor: COLORS.card, borderColor: COLORS.border, textAlign: rtl.textAlign }]}
                                        placeholder={t('community_create_post_qa_title_placeholder', language)}
                                        placeholderTextColor={COLORS.textDim}
                                        value={title}
                                        onChangeText={setTitle}
                                    />

                                    <Text style={[styles.sectionHeading, { color: COLORS.textPrimary, textAlign: rtl.textAlign, marginTop: 14 }]}>
                                        {t('community_create_post_details_label_qa', language)}
                                    </Text>
                                    <AppTextInput
                                        style={[styles.inputContent, { color: COLORS.textPrimary, backgroundColor: COLORS.card, borderColor: COLORS.border, textAlign: rtl.textAlign }]}
                                        placeholder={t('community_create_post_placeholder_default', language)}
                                        placeholderTextColor={COLORS.textDim}
                                        multiline
                                        value={content}
                                        onChangeText={setContent}
                                    />

                                    <ImageAttachmentBox
                                        label={t('community_create_post_qa_image_btn', language)}
                                        imageUri={images.main}
                                        onPress={() => pickImage('main')}
                                        onDelete={() => removeImage('main')}
                                        necessary={false}
                                        COLORS={COLORS}
                                        styles={styles}
                                        rtl={rtl}
                                    />
                                </View>
                            )}

                            {/* ROUTINE RATE EXPERIENCE */}
                            {type === 'routine_rate' && (
                                <View style={styles.sectionWrap}>
                                    <View style={[styles.routinePreview, { borderColor: '#A855F735', backgroundColor: '#A855F710' }]}>
                                        <View style={[{ flexDirection: rtl.flexDirection, alignItems: 'center', gap: 8, marginBottom: 8 }]}>
                                            <FontAwesome5 name="clipboard-check" size={16} color="#A855F7" />
                                            <Text style={[styles.routineShareTitle, { color: '#A855F7' }]}>
                                                {t('community_create_post_routine_share_msg', language)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.routineStepRow, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]}>
                                            • {t('community_create_post_routine_am', language, { count: userRoutines?.am?.length || 0 })} ☀️
                                        </Text>
                                        <Text style={[styles.routineStepRow, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]}>
                                            • {t('community_create_post_routine_pm', language, { count: userRoutines?.pm?.length || 0 })} 🌙
                                        </Text>
                                    </View>

                                    <Text style={[styles.sectionHeading, { color: COLORS.textPrimary, textAlign: rtl.textAlign, marginTop: 14 }]}>
                                        {t('community_create_post_details_label_routine', language)}
                                    </Text>
                                    <AppTextInput
                                        style={[styles.inputContent, { color: COLORS.textPrimary, backgroundColor: COLORS.card, borderColor: COLORS.border, textAlign: rtl.textAlign }]}
                                        placeholder={t('community_create_post_placeholder_routine', language)}
                                        placeholderTextColor={COLORS.textDim}
                                        multiline
                                        value={content}
                                        onChangeText={setContent}
                                    />
                                </View>
                            )}

                            {/* TIPS EXPERIENCE (Admin) */}
                            {type === 'tips' && (
                                <View style={styles.sectionWrap}>
                                    <Text style={[styles.sectionHeading, { color: COLORS.textPrimary, textAlign: rtl.textAlign }]}>
                                        {t('community_create_post_tips_title_label', language)}
                                    </Text>
                                    <AppTextInput
                                        style={[styles.inputTitle, { color: COLORS.textPrimary, backgroundColor: COLORS.card, borderColor: COLORS.border, textAlign: rtl.textAlign }]}
                                        placeholder={t('community_create_post_tips_title_placeholder', language)}
                                        placeholderTextColor={COLORS.textDim}
                                        value={title}
                                        onChangeText={setTitle}
                                    />

                                    <Text style={[styles.sectionHeading, { color: COLORS.textPrimary, textAlign: rtl.textAlign, marginTop: 14 }]}>
                                        {t('community_create_post_tips_content_label', language)}
                                    </Text>
                                    <AppTextInput
                                        style={[styles.inputContent, { color: COLORS.textPrimary, backgroundColor: COLORS.card, borderColor: COLORS.border, textAlign: rtl.textAlign }]}
                                        placeholder={t('community_create_post_tips_content_placeholder', language)}
                                        placeholderTextColor={COLORS.textDim}
                                        multiline
                                        value={content}
                                        onChangeText={setContent}
                                    />

                                    <ImageAttachmentBox
                                        label={t('community_create_post_tips_image_btn', language)}
                                        imageUri={images.main}
                                        onPress={() => pickImage('main')}
                                        onDelete={() => removeImage('main')}
                                        necessary={false}
                                        COLORS={COLORS}
                                        styles={styles}
                                        rtl={rtl}
                                    />
                                </View>
                            )}
                        </ScrollView>
                    </View>

                    {/* Solid Bottom Action Bar */}
                    <View style={[styles.footer, { backgroundColor: COLORS.background, borderTopColor: COLORS.border }]}>
                        <TouchableOpacity
                            style={[
                                styles.submitButton, 
                                { backgroundColor: currentCatColor }, 
                                loading && { opacity: 0.7 }
                            ]}
                            onPress={handleSubmit}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.textOnAccent} size="small" />
                            ) : (
                                <View style={[styles.submitButtonInner, { flexDirection: rtl.flexDirection }]}>
                                    <Text style={[styles.submitButtonText, { color: COLORS.textOnAccent }]}>
                                        {t('community_create_post_submit', language)}
                                    </Text>
                                    <Feather name="arrow-up-right" size={18} color={COLORS.textOnAccent} />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </View>
        </Modal>
    );
};

const createStyles = (COLORS, rtl, insets) => StyleSheet.create({
    modalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalSheet: {
        height: SCREEN_HEIGHT * 0.92,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    dragHandleBar: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
        width: '100%',
    },
    dragHandle: {
        width: 44,
        height: 4.5,
        borderRadius: 10,
    },
    modalHeader: {
        paddingHorizontal: 20,
        paddingTop: 6,
        paddingBottom: 10,
        alignItems: 'center',
    },
    modalTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 19,
    },
    tabsContainer: {
        paddingBottom: 8,
    },
    typeChipsContainer: {
        paddingHorizontal: 20,
        gap: 8,
    },
    typeChip: {
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 18,
        borderWidth: 0.8,
    },
    typeChipText: {
        fontSize: 12.5,
    },
    formScrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    sectionWrap: {
        paddingTop: 4,
    },
    sectionHeading: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13.5,
        marginBottom: 8,
    },
    inputTitle: {
        fontSize: 15,
        fontFamily: 'Tajawal-Bold',
        padding: 14,
        borderRadius: 16,
        borderWidth: 0.8,
    },
    inputContent: {
        fontSize: 14.5,
        fontFamily: 'Tajawal-Regular',
        padding: 14,
        borderRadius: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        borderWidth: 0.8,
        marginBottom: 14,
        lineHeight: 22,
    },

    // 🌟 SPOTLIGHT HERO PRODUCT CARD (SELECTED)
    selectedProductHero: {
        borderRadius: 20,
        padding: 12,
        borderWidth: 1.5,
        marginBottom: 10,
    },
    selectedProductInner: {
        alignItems: 'center',
        gap: 12,
    },
    selectedProductImageWrap: {
        width: 62,
        height: 62,
        borderRadius: 14,
        overflow: 'hidden',
    },
    selectedProductImg: {
        width: '100%',
        height: '100%',
    },
    selectedProductImgFallback: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedProductMeta: {
        flex: 1,
        gap: 4,
    },
    selectedBadgeRow: {
        alignItems: 'center',
        gap: 8,
    },
    verifiedTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 6,
    },
    verifiedTagText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 10,
    },
    selectedProductName: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13.5,
        lineHeight: 18,
    },
    changeProductBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 0.8,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // 🌟 RICH PRODUCT CAROUSEL (BROWSING)
    richProductsCarousel: {
        gap: 10,
        paddingBottom: 6,
    },
    richProductCard: {
        width: 132,
        height: 168,
        borderRadius: 18,
        padding: 10,
        borderWidth: 0.8,
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
    },
    richCardScoreBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 2,
    },
    richCardImgContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        overflow: 'hidden',
    },
    richCardImg: {
        width: '100%',
        height: '100%',
    },
    richCardTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        lineHeight: 16,
        marginTop: 4,
        height: 32,
    },
    richCardSelectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        width: '100%',
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 0.8,
    },
    richCardSelectText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
    },
    emptyShelfHero: {
        padding: 24,
        borderRadius: 18,
        borderWidth: 0.8,
        borderStyle: 'dashed',
        alignItems: 'center',
        gap: 8,
    },
    emptyShelfText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12.5,
    },

    // 🌟 ATTACHMENT BOX
    uploadBox: {
        padding: 14,
        borderRadius: 18,
        borderWidth: 0.8,
        borderStyle: 'dashed',
        marginTop: 2,
        minHeight: 68,
        justifyContent: 'center',
    },
    placeholderContent: {
        alignItems: 'center',
        gap: 12,
    },
    cameraIconCircle: {
        width: 38,
        height: 38,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadBoxText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
    },
    uploadBoxSub: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10.5,
        marginTop: 1,
    },
    uploadedContainer: {
        position: 'relative',
        height: 180,
        borderRadius: 14,
        overflow: 'hidden',
    },
    uploadedThumb: {
        width: '100%',
        height: '100%',
    },
    deleteImgBtn: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    durationRow: {
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    durationPrefix: {
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 14,
        borderWidth: 0.8,
    },
    durationPrefixText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
    },
    durationInput: {
        width: 50,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 0.8,
        fontSize: 15,
        fontFamily: 'Tajawal-Bold',
    },
    unitChipsWrap: {
        flex: 1,
        gap: 4,
    },
    unitChip: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 12,
        borderWidth: 0.8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    unitChipText: {
        fontSize: 11,
    },
    productsScrollBox: {
        maxHeight: 180,
        marginBottom: 10,
    },
    productRow: {
        alignItems: 'center',
        padding: 9,
        borderRadius: 14,
        marginBottom: 6,
        borderWidth: 0.8,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#888',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4,
    },
    productThumbSmall: {
        width: 30,
        height: 30,
        borderRadius: 8,
        marginHorizontal: 8,
    },
    prodName: {
        flex: 1,
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
    },
    priceInput: {
        width: 70,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 11,
        fontFamily: 'Tajawal-Bold',
        borderWidth: 0.8,
    },
    sectionDivider: {
        height: 0.8,
        marginVertical: 14,
    },
    timelineHeaderRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    addStepBtn: {
        paddingHorizontal: 12,
        paddingVertical: 4.5,
        borderRadius: 10,
        borderWidth: 0.8,
    },
    addStepText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
    },
    milestoneCard: {
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
        borderWidth: 0.8,
    },
    milestoneHeader: {
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    milestoneIndexBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    milestoneIndex: {
        fontSize: 11,
        fontFamily: 'Tajawal-Bold',
    },
    milestoneBody: {
        gap: 10,
        alignItems: 'center',
    },
    milestoneImgBox: {
        width: 58,
        height: 58,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.8,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    tinyLabel: {
        fontSize: 8.5,
        fontFamily: 'Tajawal-Bold',
    },
    labelSmall: {
        fontSize: 10.5,
        fontFamily: 'Tajawal-Bold',
        marginBottom: 3,
    },
    inputMilestone: {
        borderRadius: 10,
        height: 35,
        paddingHorizontal: 10,
        fontSize: 11.5,
        fontFamily: 'Tajawal-Regular',
        borderWidth: 0.8,
    },
    routinePreview: {
        padding: 14,
        borderRadius: 18,
        borderWidth: 0.8,
        marginBottom: 12,
    },
    routineShareTitle: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
    },
    routineStepRow: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 12.5,
        lineHeight: 20,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? Math.max(insets?.bottom || 0, 20) + 6 : 16,
        borderTopWidth: 0.8,
    },
    submitButton: {
        paddingVertical: 14,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonInner: {
        alignItems: 'center',
        gap: 8,
    },
    submitButtonText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 15.5,
    },
});

export default CreatePostModal;