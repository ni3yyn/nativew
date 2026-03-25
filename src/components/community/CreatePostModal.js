import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
    ActivityIndicator, Image, StyleSheet, KeyboardAvoidingView, Platform, Dimensions
} from 'react-native';
import { Ionicons, Feather, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS as DEFAULT_COLORS } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { CATEGORIES } from '../../constants/categories';
import { compressImage, uploadImageToCloudinary } from '../../services/imageService';
import { AlertService } from '../../services/alertService';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';

const { width } = Dimensions.get('window');

// --- SUB-COMPONENTS ---

const StarRatingInput = ({ rating, onRate, COLORS, styles }) => (
    <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => onRate(star)} activeOpacity={0.7}>
                <FontAwesome5 name="star" solid={star <= rating} size={24} color={star <= rating ? COLORS.gold : COLORS.border} />
            </TouchableOpacity>
        ))}
    </View>
);

const ImageBox = ({ imageUri, onPress, label, onDelete, necessary, COLORS, styles }) => (
    <TouchableOpacity style={[styles.uploadBox, necessary && !imageUri && { borderColor: COLORS.danger }]} onPress={onPress} activeOpacity={0.8}>
        {imageUri ? (
            <>
                <Image source={{ uri: imageUri }} style={styles.uploadedThumb} />
                <TouchableOpacity style={styles.deleteImgBtn} onPress={onDelete}>
                    <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                </TouchableOpacity>
            </>
        ) : (
            <View style={styles.placeholderContent}>
                <Feather name="camera" size={20} color={necessary ? COLORS.danger : COLORS.textSecondary} />
                <Text style={[styles.uploadBoxText, necessary && { color: COLORS.danger }]}>{label} {necessary && '*'}</Text>
            </View>
        )}
    </TouchableOpacity>
);

const MilestoneInput = ({ item, index, onPickImage, onChangeLabel, onDelete, canDelete, COLORS, styles }) => (
    <View style={styles.milestoneCard}>
        <View style={styles.milestoneHeader}>
            <Text style={styles.milestoneIndex}>{t('community_create_post_milestone_label', language, { index: index + 1 })}</Text>
            {canDelete && (
                <TouchableOpacity onPress={onDelete}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
            )}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity style={styles.milestoneImgBox} onPress={onPickImage}>
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.uploadedThumb} />
                ) : (
                    <View style={{ alignItems: 'center' }}>
                        <Feather name="camera" size={20} color={COLORS.textDim} />
                        <Text style={styles.tinyLabel}>{t('community_create_post_milestone_image', language)}</Text>
                    </View>
                )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
                <Text style={styles.labelSmall}>{t('community_create_post_milestone_time_label', language)}</Text>
                <TextInput
                    style={styles.inputMilestone}
                    placeholder={t('community_create_post_milestone_time_placeholder', language)}
                    placeholderTextColor={COLORS.textDim}
                    value={item.label}
                    onChangeText={onChangeLabel}
                    textAlign="right"
                />
            </View>
        </View>
    </View>
);

// --- DURATION INPUT ---
const DurationInput = ({ value, onChangeText, unit, onSelectUnit, COLORS, styles, language }) => {
    const unitsLabels = {
        'أيام': t('journey_unit_days', language),
        'أسابيع': t('journey_unit_weeks', language),
        'أشهر': t('journey_unit_months', language),
        'سنوات': t('journey_unit_years', language)
    };
    const units = ['أيام', 'أسابيع', 'أشهر', 'سنوات'];
    return (
        <View style={styles.durationContainer}>
            <View style={styles.fixedTextContainer}>
                <Text style={styles.fixedText}>{t('journey_prefix_after', language)}</Text>
            </View>
            <TextInput
                style={styles.durationNumInput}
                placeholder="0"
                placeholderTextColor={COLORS.textDim}
                keyboardType="numeric"
                value={value}
                onChangeText={onChangeText}
                textAlign="center"
            />
            <View style={styles.unitSelector}>
                {units.map((u) => (
                    <TouchableOpacity
                        key={u}
                        style={[styles.unitChip, unit === u && styles.unitChipActive]}
                        onPress={() => onSelectUnit(u)}
                    >
                        <Text style={[styles.unitText, unit === u && { color: COLORS.textOnAccent }]}>{unitsLabels[u]}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

// --- MAIN COMPONENT ---

const CreatePostModal = ({ visible, onClose, onSubmit, savedProducts, userRoutines, defaultType, isAdmin }) => {
    const language = useCurrentLanguage();
    const { colors } = useTheme();
    const COLORS = colors || DEFAULT_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [type, setType] = useState(defaultType || 'review');
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [rating, setRating] = useState(0);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [images, setImages] = useState({ main: null });

    // JOURNEY STATE
    const [milestones, setMilestones] = useState([
        { id: '1', label: t('journey_milestone_start', language), image: null },
        { id: '2', label: t('journey_milestone_result', language), image: null }
    ]);
    const [journeyProducts, setJourneyProducts] = useState([]);
    const [durValue, setDurValue] = useState('');
    const [durUnit, setDurUnit] = useState('أشهر');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            console.log(`[CreatePostModal] Opened for Type: ${defaultType}`);
            setType(defaultType || 'review');
            // Reset form
            setContent(''); setTitle(''); setRating(0); setSelectedProduct(null);
            setImages({ main: null }); setJourneyProducts([]);
            setDurValue(''); setDurUnit('أشهر');
            setMilestones([
                { id: Date.now().toString(), label: t('journey_milestone_start', language), image: null },
                { id: (Date.now() + 1).toString(), label: t('journey_milestone_result', language), image: null }
            ]);
        }
    }, [visible, defaultType]);

    // --- HANDLERS ---

    const requestImageSource = (callback, aspect = [4, 3]) => {
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
                            quality: 1,
                            allowsEditing: true,
                            aspect: aspect
                        });
                        if (!result.canceled) callback(result.assets[0].uri);
                    }
                },
                {
                    text: t('community_create_post_image_source_camera', language),
                    style: 'primary',
                    onPress: async () => {
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 1,
                            allowsEditing: true,
                            aspect: aspect
                        });
                        if (!result.canceled) callback(result.assets[0].uri);
                    }
                },
                { text: t('community_create_post_image_source_cancel', language), style: 'destructive' }
            ]
        });
    };

    const pickImage = (key) => {
        const aspect = key === 'main' && type === 'review' ? [4, 3] : [1, 1];
        requestImageSource(async (uri) => {
            const compressed = await compressImage(uri);
            setImages(prev => ({ ...prev, [key]: compressed }));
        }, aspect);
    };

    const removeImage = (key) => {
        setImages(prev => ({ ...prev, [key]: null }));
    };

    const pickMilestoneImage = (index) => {
        requestImageSource(async (uri) => {
            const compressed = await compressImage(uri);
            const newM = [...milestones];
            newM[index].image = compressed;
            setMilestones(newM);
        }, [3, 4]);
    };

    const updateMilestoneLabel = (text, index) => {
        const newMilestones = [...milestones];
        newMilestones[index].label = text;
        setMilestones(newMilestones);
    };

    const addMilestone = () => {
        setMilestones([...milestones, { id: Date.now().toString(), label: '', image: null }]);
    };

    const removeMilestone = (index) => {
        const newMilestones = milestones.filter((_, i) => i !== index);
        setMilestones(newMilestones);
    };

    const toggleJourneyProduct = (product) => {
        const exists = journeyProducts.find(p => p.id === product.id);
        if (exists) {
            setJourneyProducts(prev => prev.filter(p => p.id !== product.id));
        } else {
            setJourneyProducts(prev => [...prev, {
                id: product.id,
                name: product.productName,
                score: product.analysisData?.oilGuardScore || 0,
                analysisData: product.analysisData,
                price: '',
                productImage: product.productImage // Capture shelf image
            }]);
        }
    };

    const updateProductPrice = (id, price) => {
        setJourneyProducts(prev => prev.map(p => p.id === id ? { ...p, price } : p));
    };

    // --- 🟢 LIGHTWEIGHT ROUTINE DATA RESOLVER ---
    const resolveRoutineData = (routinePeriod) => {
        if (!routinePeriod || !Array.isArray(routinePeriod)) return [];

        const resolvedSteps = routinePeriod.map((step) => {
            const ids = step.productIds || [];
            if (ids.length === 0) return null;
            
            // Resolve IDs to Full Products
            const richProducts = ids.map(id => {
                const shelfItem = savedProducts.find(p => p.id === id);

                if (shelfItem) {
                    console.log(`[Resolve] Found: ${shelfItem.productName}`);
                    return {
                        id: shelfItem.id,
                        // ✅ Use standard keys that match your Shelf schema
                        productName: shelfItem.productName || shelfItem.name || t('product_type_other', language),
                        productImage: shelfItem.productImage || shelfItem.imageUrl || shelfItem.image || null,
                        oilGuardScore: Number(shelfItem.analysisData?.oilGuardScore || shelfItem.score || 0),
                        productType: shelfItem.analysisData?.product_type || shelfItem.type || 'other',
                        
                        // Full Analysis Data (Saved directly to Post in Supabase)
                        detected_ingredients: shelfItem.analysisData?.detected_ingredients || shelfItem.ingredients || [],
                        marketingClaims: shelfItem.marketingClaims || shelfItem.claims || []
                    };
                } else {
                    console.log(`[Resolve] Not Found in Shelf: ${id}`);
                    // Fallback using Routine Nickname
                    return {
                        id: id,
                        productName: step.details || t('weather_mini_unavailable', language),
                        productImage: null,
                        oilGuardScore: 0,
                        productType: 'other',
                        detected_ingredients: [],
                        marketingClaims: []
                    };
                }
            });

            // Return Wrapper
            return {
                stepName: step.name || t('weather_recommended', language), 
                products: richProducts
            };
        });

        return resolvedSteps.filter(Boolean);
    };

    // --- SUBMIT LOGIC ---
    const handleSubmit = async () => {
        // Validation: Content is required for ALL types (QA, Tips, Review, etc use it)
        if (!content.trim()) { 
            AlertService.error(t('community_create_post_validation_content', language), t('community_create_post_validation_content_msg', language)); 
            return; 
        }

        if (type === 'review') {
            if (!selectedProduct) { AlertService.error(t('community_create_post_validation_product', language), t('community_create_post_validation_product_msg', language)); return; }
            if (rating === 0) { AlertService.error(t('community_create_post_validation_product', language), t('community_create_post_validation_rating_msg', language)); return; }
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
            // Check if routine is empty
            if ((!userRoutines?.am || userRoutines.am.length === 0) && (!userRoutines?.pm || userRoutines.pm.length === 0)) {
                AlertService.error(t('community_create_post_validation_empty_routine', language), t('community_create_post_validation_empty_routine_msg', language));
                return;
            }
        }

        setLoading(true);

        let uploadedMainUrl = null; // Initialize to null

        // 🔴 MODIFICATION START
        // Only attempt to upload image if it's NOT a routine_rate post
        if (type !== 'routine_rate' && images.main) {
            uploadedMainUrl = await uploadImageToCloudinary(images.main);
        }

        // Fallback for review type if no main image was uploaded manually.
        // This should also be skipped for routine_rate.
        if (type === 'review' && !uploadedMainUrl && selectedProduct?.productImage) {
            uploadedMainUrl = selectedProduct.productImage;
        }
        // 🔴 MODIFICATION END

        // 3. Upload Milestones
        let processedMilestones = [];
        if (type === 'journey') {
            const promises = milestones.map(async m => {
                if (!m.image) return null;
                const url = await uploadImageToCloudinary(m.image);
                return { label: m.label, image: url };
            });
            processedMilestones = (await Promise.all(promises)).filter(Boolean);
        }

        // 4. PROCESS ROUTINE SNAPSHOT (Lightweight)
        let routineSnapshot = null;
        if (type === 'routine_rate') {
            routineSnapshot = {
                am: resolveRoutineData(userRoutines?.am),
                pm: resolveRoutineData(userRoutines?.pm)
            };
            // 🔍 DEBUG
            console.log(`[CreatePostModal] Resolved Routine Snapshot (AM Steps): ${routineSnapshot.am.length}`);
        }

        const payload = {
            type, content,
            title: (type === 'qa' || type === 'tips') && title ? title.trim() : null,            rating: type === 'review' ? rating : null,
            taggedProduct: selectedProduct ? {
                id: selectedProduct.id,
                name: selectedProduct.productName,
                score: selectedProduct.analysisData?.oilGuardScore || 0,
                imageUrl: selectedProduct.productImage,
                analysisData: selectedProduct.analysisData, // Passed for ingredients extraction in service
                marketingClaims: selectedProduct.marketingClaims
            } : null,
            journeyProducts: type === 'journey' ? journeyProducts : null,

            // 🔴 MODIFICATION START
            // Use the uploadedMainUrl, which will be null if type is 'routine_rate'
            imageUrl: uploadedMainUrl,
            // 🔴 MODIFICATION END

            milestones: processedMilestones,
            duration: type === 'journey' ? `${t('journey_prefix_after', language)} ${durValue} ${t('journey_unit_' + (durUnit === 'أيام' ? 'days' : durUnit === 'أسابيع' ? 'weeks' : durUnit === 'أشهر' ? 'months' : 'years'), language)}` : null,
            routineSnapshot
        };

        // 🔍 DEBUG
        console.log(`[CreatePostModal] Submitting Payload Type: ${payload.type}`);
        if (payload.type === 'review') console.log(`   > Product: ${payload.taggedProduct?.name}`);
        if (payload.type === 'journey') console.log(`   > Journey Products: ${payload.journeyProducts?.length}`);

        await onSubmit(payload);
        setLoading(false);
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{t('community_create_post_title', language)}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Category Tabs */}
                <View style={{ height: 50, marginBottom: 15 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                        {CATEGORIES.filter(cat => cat.id !== 'tips' || isAdmin).map(cat => {
                            const catColor = COLORS[cat.colorKey] || COLORS.accentGreen;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.typeChip, type === cat.id && { backgroundColor: catColor, borderColor: catColor }]}
                                    onPress={() => setType(cat.id)}
                                >
                                    <FontAwesome5 name={cat.icon} size={14} color={type === cat.id ? COLORS.textOnAccent : COLORS.textSecondary} />
                                    <Text style={[styles.typeChipText, type === cat.id && { color: COLORS.textOnAccent, fontFamily: 'Tajawal-Bold' }]}>{t(cat.labelKey, language)}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>

                        {/* --- QA (Title Input) --- */}
                        {type === 'qa' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('community_create_post_qa_title_label', language)}</Text>
                                <TextInput
                                    style={styles.inputTitle}
                                    placeholder={t('community_create_post_qa_title_placeholder', language)}
                                    placeholderTextColor={COLORS.textDim}
                                    value={title}
                                    onChangeText={setTitle}
                                    textAlign="right"
                                />
                            </View>
                        )}

                        {/* --- ROUTINE RATE PREVIEW --- */}
                        {type === 'routine_rate' && (
                            <View style={styles.routinePreview}>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                    <FontAwesome5 name="clipboard-check" size={20} color={COLORS.purple} />
                                    <Text style={[styles.label, { marginBottom: 0, color: COLORS.purple }]}>{t('community_create_post_routine_share_msg', language)}</Text>
                                </View>
                                <Text style={styles.routineInfo}>
                                    • {t('community_create_post_routine_am', language, { count: userRoutines?.am?.length || 0 })}
                                </Text>
                                <Text style={styles.routineInfo}>
                                    • {t('community_create_post_routine_pm', language, { count: userRoutines?.pm?.length || 0 })}
                                </Text>
                                <Text style={[styles.tinyLabel, { textAlign: 'right', marginTop: 8 }]}>
                                    {t('community_create_post_routine_disclaimer', language)}
                                </Text>
                            </View>
                        )}

                        {/* --- SHARED CONTENT INPUT (Hidden for Tips) --- */}
                        {type !== 'tips' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>
                                    {type === 'qa' ? t('community_create_post_details_label_qa', language) : type === 'routine_rate' ? t('community_create_post_details_label_routine', language) : t('community_create_post_details_label_default', language)}
                                </Text>
                                <TextInput
                                    style={styles.inputContent}
                                    placeholder={type === 'journey' ? t('community_create_post_placeholder_journey', language) : type === 'routine_rate' ? t('community_create_post_placeholder_routine', language) : t('community_create_post_placeholder_default', language)}
                                    placeholderTextColor={COLORS.textDim}
                                    multiline
                                    value={content}
                                    onChangeText={setContent}
                                    textAlign="right"
                                />
                            </View>
                        )}

                        {/* --- TIPS DEDICATED BLOCK (Admin Only) --- */}
                        {type === 'tips' && (
    <View>
        {/* Title Input */}
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('community_create_post_tips_title_label', language)}</Text>
            <TextInput
                style={styles.inputTitle}
                placeholder={t('community_create_post_tips_title_placeholder', language)}
                placeholderTextColor={COLORS.textDim}
                value={title}
                onChangeText={setTitle}
                textAlign="right"
            />
        </View>

        {/* Content Input */}
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('community_create_post_tips_content_label', language)}</Text>
            <TextInput
                style={styles.inputContent}
                placeholder={t('community_create_post_tips_content_placeholder', language)}
                placeholderTextColor={COLORS.textDim}
                multiline
                value={content}
                onChangeText={setContent}
                textAlign="right"
            />
        </View>

        {/* Image Input */}
        <View>
            <Text style={styles.label}>{t('community_create_post_tips_image_label', language)}</Text>
            <ImageBox
                imageUri={images.main}
                onPress={() => pickImage('main')}
                onDelete={() => removeImage('main')}
                label={t('community_create_post_tips_image_btn', language)}
                COLORS={COLORS}
                styles={styles}
            />
        </View>
    </View>
)}

                        {/* --- JOURNEY --- */}
                        {type === 'journey' && (
                            <View>
                                <Text style={styles.label}>{t('community_create_post_journey_duration', language)}</Text>
                                <DurationInput value={durValue} onChangeText={setDurValue} unit={durUnit} onSelectUnit={setDurUnit} COLORS={COLORS} styles={styles} language={language} />

                                <Text style={styles.label}>{t('community_create_post_journey_products', language)}</Text>
                                <ScrollView style={{ maxHeight: 250 }} nestedScrollEnabled>
                                    {savedProducts.map(p => {
                                        const isSelected = journeyProducts.find(jp => jp.id === p.id);
                                        return (
                                            <TouchableOpacity
                                                key={p.id}
                                                style={[styles.productRow, isSelected && styles.productRowActive]}
                                                onPress={() => toggleJourneyProduct(p)}
                                                activeOpacity={0.8}
                                            >
                                                <View style={[styles.checkbox, isSelected && { backgroundColor: COLORS.gold, borderColor: COLORS.gold }]}>
                                                    {isSelected && <Ionicons name="checkmark" size={14} color="#000" />}
                                                </View>

                                                <Image
                                                    source={p.productImage ? { uri: p.productImage } : require('../../../assets/icon.png')}
                                                    style={styles.productThumbSmall}
                                                />

                                                <Text style={[styles.prodName, isSelected && { color: COLORS.gold }]} numberOfLines={1}>{p.productName}</Text>

                                                {isSelected && (
                                                    <TextInput
                                                        style={styles.priceInput}
                                                        placeholder={t('community_create_post_journey_products', language).split('&')[1].trim()}
                                                        placeholderTextColor={COLORS.textDim}
                                                        keyboardType="numeric"
                                                        value={isSelected.price}
                                                        onChangeText={(t) => updateProductPrice(p.id, t)}
                                                    />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {savedProducts.length === 0 && <Text style={styles.hintText}>{t('community_create_post_journey_empty_shelf', language)}</Text>}
                                </ScrollView>

                                <View style={styles.divider} />
                                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <Text style={styles.label}>{t('community_create_post_journey_timeline', language)}</Text>
                                    <TouchableOpacity onPress={addMilestone} style={styles.addStepBtn}>
                                        <Text style={styles.addStepText}>{t('community_create_post_journey_add_milestone', language)}</Text>
                                    </TouchableOpacity>
                                </View>
                                {milestones.map((m, index) => (
                                    <MilestoneInput
                                        key={index}
                                        item={m}
                                        index={index}
                                        onPickImage={() => pickMilestoneImage(index)}
                                        onChangeLabel={(txt) => {
                                            const next = [...milestones];
                                            next[index].label = txt;
                                            setMilestones(next);
                                        }}
                                        onDelete={() => setMilestones(prev => prev.filter((_, i) => i !== index))}
                                        canDelete={milestones.length > 1}
                                        COLORS={COLORS}
                                        styles={styles}
                                    />
                                ))}
                            </View>
                        )}

                        {/* --- REVIEW --- */}
                        {type === 'review' && (
                            <View>
                                <Text style={styles.label}>{t('community_create_post_review_select_product', language)}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                    {savedProducts.map(p => (
                                        <TouchableOpacity
                                            key={p.id}
                                            style={[styles.productSelectChip, selectedProduct?.id === p.id && { borderColor: COLORS.accentGreen, backgroundColor: COLORS.accentGreen + '15' }]}
                                            onPress={() => setSelectedProduct(p)}
                                        >
                                            {p.productImage ? (
                                                <Image source={{ uri: p.productImage }} style={styles.productThumbLarge} />
                                            ) : (
                                                <FontAwesome5 name="pump-soap" size={14} color={selectedProduct?.id === p.id ? COLORS.accentGreen : COLORS.textSecondary} />
                                            )}
                                            <Text style={{ color: selectedProduct?.id === p.id ? COLORS.accentGreen : COLORS.textPrimary, fontSize: 12 }}>{p.productName}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <Text style={styles.label}>{t('community_create_post_review_rating', language)}</Text>
                                <StarRatingInput rating={rating} onRate={setRating} COLORS={COLORS} styles={styles} />
                                <View style={{ height: 15 }} />
                                <Text style={styles.label}>{t('community_create_post_review_image_label', language)}</Text>
                                <ImageBox
                                    label={t('community_create_post_review_image_btn', language)}
                                    imageUri={images.main}
                                    onPress={() => pickImage('main')}
                                    onDelete={() => removeImage('main')}
                                    necessary={false}
                                    COLORS={COLORS}
                                    styles={styles}
                                />
                            </View>
                        )}

                        {/* --- QA (Image Input) --- */}
                        {type === 'qa' && (
                            <View>
                                <Text style={styles.label}>{t('community_create_post_qa_image_label', language)}</Text>
                                <ImageBox
                                    imageUri={images.main}
                                    onPress={() => pickImage('main')}
                                    onDelete={() => removeImage('main')}
                                    label={t('community_create_post_qa_image_btn', language)}
                                    COLORS={COLORS}
                                    styles={styles}
                                />
                            </View>
                        )}

                    </ScrollView>
                </KeyboardAvoidingView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.submitButton, loading && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color={COLORS.textOnAccent} /> : <Text style={styles.submitButtonText}>{t('community_create_post_submit', language)}</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    modalContainer: { flex: 1, backgroundColor: COLORS.background, paddingTop: 50 },
    modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
    modalTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: COLORS.textPrimary },
    closeBtn: { padding: 5 },

    typeChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, height: 40 },
    typeChipText: { color: COLORS.textSecondary, fontFamily: 'Tajawal-Regular', fontSize: 13 },

    inputGroup: { marginBottom: 20 },
    inputTitle: { backgroundColor: COLORS.card, color: COLORS.textPrimary, fontSize: 16, fontFamily: 'Tajawal-Bold', textAlign: 'right', padding: 15, borderRadius: 16, marginBottom: 15 },
    inputContent: { backgroundColor: COLORS.card, color: COLORS.textPrimary, fontSize: 15, fontFamily: 'Tajawal-Regular', textAlign: 'right', padding: 15, borderRadius: 16, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
    label: { fontFamily: 'Tajawal-Bold', color: COLORS.textSecondary, fontSize: 14, textAlign: 'right', marginBottom: 8 },

    durationContainer: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 15 },
    fixedTextContainer: { backgroundColor: COLORS.card, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    fixedText: { color: COLORS.textSecondary, fontFamily: 'Tajawal-Bold' },
    durationNumInput: { backgroundColor: COLORS.card, width: 60, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary, fontSize: 16, fontFamily: 'Tajawal-Bold' },
    unitSelector: { flex: 1, flexDirection: 'row-reverse', gap: 5 },
    unitChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
    unitChipActive: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
    unitText: { color: COLORS.textDim, fontSize: 11, fontFamily: 'Tajawal-Regular' },

    productRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.card, padding: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
    productRowActive: { borderColor: COLORS.gold, backgroundColor: COLORS.gold + '10' },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: COLORS.textDim, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    prodName: { flex: 1, color: COLORS.textPrimary, fontFamily: 'Tajawal-Regular', fontSize: 13, textAlign: 'right' },
    priceInput: { backgroundColor: COLORS.background, color: COLORS.textPrimary, width: 80, padding: 5, borderRadius: 8, textAlign: 'center', fontSize: 12, marginRight: 10 },
    productThumbSmall: { width: 30, height: 30, borderRadius: 6, backgroundColor: COLORS.background, marginHorizontal: 8, borderWidth: 1, borderColor: COLORS.border },

    productSelectChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: COLORS.card, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
    productSelectChipActive: { borderColor: COLORS.accentGreen, backgroundColor: COLORS.accentGreen + '15' },
    productChipText: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Regular', fontSize: 13 },
    productThumbLarge: { width: 20, height: 20, borderRadius: 4, marginRight: 6 },
    starContainer: { flexDirection: 'row-reverse', gap: 10, marginTop: 5 },

    uploadBox: { height: 120, backgroundColor: COLORS.card, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', overflow: 'hidden' },
    placeholderContent: { alignItems: 'center', gap: 8 },
    uploadBoxText: { color: COLORS.textDim, fontSize: 12 },
    uploadedThumb: { width: '100%', height: '100%' },
    deleteImgBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 15 },

    milestoneCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 12, marginBottom: 10 },
    milestoneHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8 },
    milestoneIndex: { color: COLORS.gold, fontSize: 12, fontFamily: 'Tajawal-Bold' },
    milestoneImgBox: { width: 60, height: 60, borderRadius: 10, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    tinyLabel: { fontSize: 9, color: COLORS.textDim },
    labelSmall: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'right', marginBottom: 2 },
    inputMilestone: { backgroundColor: COLORS.background, borderRadius: 8, height: 35, paddingHorizontal: 10, color: COLORS.textPrimary, textAlign: 'right', fontSize: 12 },
    addStepBtn: { backgroundColor: COLORS.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    addStepText: { color: COLORS.textPrimary, fontSize: 12, fontFamily: 'Tajawal-Bold' },

    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
    hintText: { color: COLORS.textDim, textAlign: 'center', fontSize: 12, marginVertical: 10 },

    footer: { padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.background },
    submitButton: { backgroundColor: COLORS.accentGreen, padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: COLORS.accentGreen, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    submitButtonText: { fontFamily: 'Tajawal-Bold', color: COLORS.textOnAccent, fontSize: 16 },

    routinePreview: { backgroundColor: COLORS.purple + '10', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: COLORS.purple + '30', marginTop: 10 },
    routineInfo: { color: COLORS.textPrimary, fontFamily: 'Tajawal-Regular', fontSize: 13, textAlign: 'right' },
});

export default CreatePostModal;