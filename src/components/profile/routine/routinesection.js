// --- START OF FILE routinesection.js ---

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet, View, Text, TextInput, Pressable,
    Dimensions, ScrollView, Animated, Modal, FlatList,
    Platform, ActivityIndicator, KeyboardAvoidingView, Keyboard, Image, Easing
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase'; 
import { useAppContext } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import { AlertService } from '../../../services/alertService';
import { RoutineEmptyState } from '../EmptyStates';
import { RoutineLogViewer } from './RoutineLogViewer';
import { PressableScale } from '../analysis/AnalysisShared';
import { t } from '../../../i18n';
import { useCurrentLanguage } from '../../../hooks/useCurrentLanguage';
import RoutineSegmentedControl from './RoutineSegmentedControl';
import AppTextInput from '../../common/AppTextInput';

const PROFILE_API_URL = "https://oilguard-backend.vercel.app/api";
const { width, height } = Dimensions.get('window');


/// --- HELPER 1: Add Step Modal ---
export const AddStepModal = ({ isVisible, onClose, onAdd }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const language = useCurrentLanguage();
    const animController = useRef(new Animated.Value(0)).current;
    const [stepName, setStepName] = useState('');
    const [isMounted, setIsMounted] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isVisible) {
            setStepName('');
            setIsMounted(true);
            Animated.spring(animController, {
                toValue: 1,
                friction: 9,
                tension: 50,
                useNativeDriver: true
            }).start();

            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 180);
            return () => clearTimeout(timer);
        } else if (isMounted) {
            Animated.timing(animController, {
                toValue: 0,
                duration: 250,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true
            }).start(() => {
                setIsMounted(false);
            });
        }
    }, [isVisible]);

    const handleClose = () => {
        Keyboard.dismiss();
        Animated.timing(animController, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true
        }).start(() => {
            setIsMounted(false);
            onClose();
        });
    };

    const handleAdd = () => {
        if (stepName.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onAdd(stepName.trim());
            handleClose();
        }
    };

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    if (!isVisible && !isMounted) return null;

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity, zIndex: 1 }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1, justifyContent: 'flex-end', zIndex: 100 }}
                pointerEvents="box-none"
            >
                <Animated.View
                    style={{
                        transform: [{ translateY }],
                        width: '100%',
                        marginBottom: -150,
                        backgroundColor: C.card,
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        borderWidth: 0.5,
                        borderColor: C.border,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -8 },
                        shadowOpacity: 0.35,
                        shadowRadius: 16,
                        elevation: 20,
                    }}
                >
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>

                    <View style={{ padding: 25, paddingBottom: 170 }}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{
                                width: 60, height: 60, borderRadius: 30,
                                backgroundColor: C.accentGreen + '20',
                                alignItems: 'center', justifyContent: 'center', marginBottom: 15
                            }}>
                                <FontAwesome5 name="layer-group" size={24} color={C.accentGreen} />
                            </View>
                            <Text style={styles.modalTitle}>{t('routine_add_step_title', language)}</Text>
                            <Text style={styles.modalDescription}>
                                {t('routine_add_step_desc', language)}
                            </Text>
                        </View>

                        <View style={styles.inputWrapper}>
                            <AppTextInput
                                ref={inputRef}
                                placeholder={t('routine_step_name_placeholder', language)}
                                placeholderTextColor={C.textDim}
                                style={[
                                    styles.enhancedInput,
                                    { fontFamily: stepName.length > 0 ? 'Tajawal-Bold' : 'Tajawal-Regular', fontWeight: 'normal' }
                                ]}
                                value={stepName}
                                onChangeText={setStepName}
                                textAlign="right"
                            />
                            <View style={styles.inputIcon}>
                                <Feather name="edit-3" size={16} color={C.accentGreen} />
                            </View>
                        </View>

                        <View style={styles.promptButtonRow}>
                            <PressableScale style={[styles.promptButton, styles.promptButtonSecondary]} onPress={handleClose}>
                                <Text style={styles.promptButtonTextSecondary}>{t('alert_cancel', language)}</Text>
                            </PressableScale>
                            <PressableScale
                                style={[styles.promptButton, styles.promptButtonPrimary, !stepName.trim() && { opacity: 0.5 }]}
                                onPress={handleAdd}
                                disabled={!stepName.trim()}
                            >
                                <Text style={styles.promptButtonTextPrimary}>{t('action_add', language)}</Text>
                            </PressableScale>
                        </View>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};



// --- HELPER 3: Ultra-Clean Timeline Step Card ---
const RoutineStepCard = ({ step, index, onManage, onDelete, products, isLast }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const language = useCurrentLanguage();
    const productList = step.productIds.map(id => products.find(p => p.id === id)).filter(Boolean);
    const isStepFilled = productList.length > 0;

    return (
        <Pressable 
            onPress={onManage}
            style={({ pressed }) => [
                styles.stepTimelineContainer,
                { opacity: pressed ? 0.6 : 1 } 
            ]}
        >
            {/* Timeline Column */}
            <View style={styles.timelineIndicatorColumn}>
                <View style={[styles.timelineDot, isStepFilled ? styles.timelineDotFilled : styles.timelineDotEmpty]}>
                    <Text style={[styles.timelineDotText, isStepFilled ? { color: C.textOnAccent } : { color: C.textSecondary }]}>
                        {index + 1}
                    </Text>
                </View>
                {!isLast && <View style={styles.timelineLine} />}
            </View>

            {/* Content Column */}
            <View style={styles.timelineContentColumn}>
                
                {/* Step Header */}
                <View style={styles.stepHeaderClean}>
                    <Text style={styles.stepNameClean}>{step.name}</Text>
                    <Pressable
                        onPress={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        hitSlop={15}
                        style={styles.deleteBtnClean}
                    >
                        <Feather name="trash-2" size={16} color={C.textDim} />
                    </Pressable>
                </View>

                {/* VISIBILITY FIX: Tinted Alert Bubbles */}
                {step.waitTime && (
                    <View style={[styles.alertBoxClean, { backgroundColor: C.warning + '15', borderColor: C.warning + '30' }]}>
                        <Feather name="clock" size={14} color={C.warning} style={{ marginTop: 2 }} />
                        <Text style={styles.alertTextClean}>{step.waitTime}</Text>
                    </View>
                )}

                {step.routineNote && (
                    <View style={[styles.alertBoxClean, { backgroundColor: C.accentGreen + '10', borderColor: C.accentGreen + '25' }]}>
                        <Feather name="info" size={14} color={C.accentGreen} style={{ marginTop: 2 }} />
                        <Text style={styles.alertTextClean}>{step.routineNote}</Text>
                    </View>
                )}

                {/* Grouped Product List */}
                {isStepFilled ? (
                    <View style={{ gap: 8, marginTop: 10 }}>
                        {productList.map((p) => {
                            const imageUri = p.productImage || p.imageUrl || p.image;

                            return (
                                <View key={p.id} style={styles.shelfRowCard}>
                                    <View style={styles.shelfRowImageWrapper}>
                                        {imageUri ? (
                                            <Image source={{ uri: imageUri }} style={styles.shelfRowImage} resizeMode="cover" />
                                        ) : (
                                            <View style={styles.shelfRowPlaceholder}>
                                                <FontAwesome5 name="wine-bottle" size={18} color={C.textDim} />
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.shelfRowContent}>
                                        <Text style={styles.shelfRowName} numberOfLines={2}>
                                            {p.productName}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <Text style={styles.emptyStepTextClean}>{t('routine_tap_to_add', language)}</Text>
                )}
            </View>
        </Pressable>
    );
};

// --- HELPER 4: Product Selection Modal ---
const ProductSelectionModal = ({ visible, products, selectedProductIds = [], onSelect, onClose }) => {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    const [search, setSearch] = useState('');

    const slideAnim = useRef(new Animated.Value(height)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setSearch('');
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
                Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const handleClose = () => {
        Keyboard.dismiss();
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: height, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (finished && onClose) onClose();
        });
    };

    if (!visible) return null;

    const safeProducts = Array.isArray(products) ? products : [];
    const filtered = safeProducts.filter(p => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        const nameMatch = p.productName?.toLowerCase().includes(query) || p.name?.toLowerCase().includes(query);
        const brandMatch = p.brand?.toLowerCase().includes(query) || p.productType?.toLowerCase().includes(query);
        return nameMatch || brandMatch;
    });

    return (
        <Modal transparent visible={visible} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                {/* Backdrop */}
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.6)', opacity: backdropAnim, zIndex: 1 }]}>
                    <Pressable style={{ flex: 1 }} onPress={handleClose} />
                </Animated.View>

                {/* Animated Sheet Container */}
                <Animated.View
                    style={{
                        zIndex: 2,
                        width: '100%',
                        height: height * 0.82,
                        backgroundColor: C.card,
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        borderWidth: 0.5,
                        borderColor: C.border,
                        transform: [{ translateY: slideAnim }],
                        marginBottom: -150,
                        paddingBottom: 150,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -8 },
                        shadowOpacity: 0.35,
                        shadowRadius: 16,
                        elevation: 20,
                    }}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1 }}
                    >
                        {/* Grabber Bar */}
                        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                            <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.border }} />
                        </View>

                        {/* Modal Header */}
                        <View style={{
                            flexDirection: 'row-reverse',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 20,
                            paddingBottom: 12,
                            borderBottomWidth: 0.5,
                            borderBottomColor: C.border + '50'
                        }}>
                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                                <View style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 14,
                                    backgroundColor: C.accentGreen + '18',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 0.5,
                                    borderColor: C.accentGreen + '35'
                                }}>
                                    <FontAwesome5 name="plus-circle" size={18} color={C.accentGreen} />
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 17, color: C.textPrimary, textAlign: 'right' }}>
                                        {t('routine_select_product', language)}
                                    </Text>
                                    <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 12, color: C.textSecondary, textAlign: 'right' }}>
                                        {safeProducts.length} {t('routine_products_available', language) || 'منتج في رفك'}
                                    </Text>
                                </View>
                            </View>

                            <PressableScale
                                onPress={handleClose}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    backgroundColor: C.background,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderWidth: 0.5,
                                    borderColor: C.border
                                }}
                            >
                                <FontAwesome5 name="times" size={13} color={C.textSecondary} />
                            </PressableScale>
                        </View>

                        {/* Search Bar */}
                        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 }}>
                            <View style={{
                                flexDirection: 'row-reverse',
                                alignItems: 'center',
                                backgroundColor: C.background,
                                borderRadius: 16,
                                paddingHorizontal: 14,
                                height: 46,
                                borderWidth: 0.5,
                                borderColor: C.border
                            }}>
                                <Feather name="search" size={16} color={C.textDim} />
                                <AppTextInput
                                    style={{
                                        flex: 1,
                                        fontFamily: 'Tajawal-Regular',
                                        fontSize: 14,
                                        color: C.textPrimary,
                                        textAlign: 'right',
                                        paddingHorizontal: 10
                                    }}
                                    placeholder={t('common_search_placeholder', language)}
                                    placeholderTextColor={C.textDim}
                                    value={search}
                                    onChangeText={setSearch}
                                />
                                {search.length > 0 && (
                                    <Pressable onPress={() => setSearch('')} style={{ padding: 4 }}>
                                        <FontAwesome5 name="times-circle" size={14} color={C.textDim} />
                                    </Pressable>
                                )}
                            </View>
                        </View>

                        {/* List of Shelf Products */}
                        <FlatList
                            data={filtered}
                            keyExtractor={item => item.id || item.docId || Math.random().toString()}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, paddingTop: 4 }}
                            renderItem={({ item }) => {
                                const imageUri = item.productImage || item.imageUrl || item.image;
                                const name = item.productName || item.name || '';
                                const isAdded = selectedProductIds.includes(item.id);

                                return (
                                    <View
                                        style={{
                                            flexDirection: 'row-reverse',
                                            alignItems: 'center',
                                            backgroundColor: C.background,
                                            borderRadius: 18,
                                            padding: 12,
                                            marginBottom: 10,
                                            borderWidth: 0.5,
                                            borderColor: isAdded ? C.accentGreen + '50' : C.border,
                                        }}
                                    >
                                        {/* Product Thumbnail */}
                                        <View style={{
                                            width: 52,
                                            height: 52,
                                            borderRadius: 14,
                                            backgroundColor: C.card,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderWidth: 0.5,
                                            borderColor: C.border,
                                            overflow: 'hidden',
                                            marginLeft: 12
                                        }}>
                                            {imageUri ? (
                                                <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                            ) : (
                                                <FontAwesome5 name="wine-bottle" size={20} color={C.accentGreen} />
                                            )}
                                        </View>

                                        {/* Product Name & Brand */}
                                        <View style={{ flex: 1, alignItems: 'flex-end', justifyContent: 'center' }}>
                                            <Text numberOfLines={1} style={{ fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.textPrimary, textAlign: 'right', marginBottom: 3 }}>
                                                {name}
                                            </Text>
                                            {item.brand ? (
                                                <Text numberOfLines={1} style={{ fontFamily: 'Tajawal-Regular', fontSize: 12, color: C.textSecondary, textAlign: 'right' }}>
                                                    {item.brand}
                                                </Text>
                                            ) : item.productType ? (
                                                <View style={{ backgroundColor: C.accentGreen + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                                                    <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 11, color: C.accentGreen }}>
                                                        {item.productType}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>

                                        {/* Select Action Button */}
                                        {isAdded ? (
                                            <View style={{
                                                flexDirection: 'row-reverse',
                                                alignItems: 'center',
                                                gap: 5,
                                                backgroundColor: C.accentGreen + '20',
                                                paddingHorizontal: 12,
                                                paddingVertical: 7,
                                                borderRadius: 12,
                                                borderWidth: 0.5,
                                                borderColor: C.accentGreen + '40'
                                            }}>
                                                <FontAwesome5 name="check" size={11} color={C.accentGreen} />
                                                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 12, color: C.accentGreen }}>
                                                    {t('routine_step_added', language) || 'مضاف'}
                                                </Text>
                                            </View>
                                        ) : (
                                            <PressableScale
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                    onSelect(item.id);
                                                }}
                                                style={{
                                                    flexDirection: 'row-reverse',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    backgroundColor: C.accentGreen,
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 8,
                                                    borderRadius: 12,
                                                    shadowColor: C.accentGreen,
                                                    shadowOffset: { width: 0, height: 2 },
                                                    shadowOpacity: 0.25,
                                                    shadowRadius: 4,
                                                    elevation: 3
                                                }}
                                            >
                                                <FontAwesome5 name="plus" size={11} color={C.textOnAccent} />
                                                <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 12, color: C.textOnAccent }}>
                                                    {t('action_add', language)}
                                                </Text>
                                            </PressableScale>
                                        )}
                                    </View>
                                );
                            }}
                            ListEmptyComponent={
                                safeProducts.length === 0 ? (
                                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 45, gap: 12 }}>
                                        <View style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: 32,
                                            backgroundColor: C.accentGreen + '15',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <FontAwesome5 name="box-open" size={26} color={C.accentGreen} />
                                        </View>
                                        <Text style={{ fontFamily: 'Tajawal-ExtraBold', fontSize: 16, color: C.textPrimary, textAlign: 'center' }}>
                                            {t('routine_no_shelf_products_title', language) || 'رفك خالي من المنتجات'}
                                        </Text>
                                        <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 13, color: C.textSecondary, textAlign: 'center', maxWidth: 250, lineHeight: 20 }}>
                                            {t('routine_no_shelf_products_desc', language) || 'أضف منتجات إلى رفك لتتمكن من اختيارها وإضافتها إلى خطوات روتينك اليومي.'}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 }}>
                                        <FontAwesome5 name="search-minus" size={24} color={C.textDim} />
                                        <Text style={{ color: C.textDim, fontFamily: 'Tajawal-Regular', fontSize: 14 }}>
                                            {t('catalog_no_results', language)}
                                        </Text>
                                    </View>
                                )
                            }
                        />
                    </KeyboardAvoidingView>
                </Animated.View>
            </View>
        </Modal>
    );
};

// --- HELPER 5: Step Editor Modal ---
const StepEditorModal = ({ isVisible, onClose, step, onSave, allProducts }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const language = useCurrentLanguage();
    const animController = useRef(new Animated.Value(0)).current;
    
    const [editedName, setEditedName] = useState('');
    const [currentProducts, setCurrentProducts] = useState([]);
    const [isAddModalVisible, setAddModalVisible] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (isVisible && step) {
            setEditedName(step.name);
            setCurrentProducts(step.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean));
            setIsMounted(true);
            Animated.spring(animController, {
                toValue: 1,
                damping: 18,
                stiffness: 120,
                useNativeDriver: true
            }).start();
        } else if (isMounted) {
            Animated.timing(animController, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true
            }).start(() => {
                setIsMounted(false);
            });
        }
    }, [isVisible, step]);

    const handleClose = () => {
        Keyboard.dismiss();
        Animated.timing(animController, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true
        }).start(() => {
            setIsMounted(false);
            onClose();
        });
    };

    const handleRemove = (productId) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentProducts(prev => prev.filter(p => p.id !== productId));
    };

    const handleAddProduct = (productId) => {
        const p = allProducts.find(x => x.id === productId);
        if (p && !currentProducts.find(cp => cp.id === p.id)) {
            setCurrentProducts([...currentProducts, p]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setAddModalVisible(false);
    };

    const handleSaveChanges = () => {
        if (!editedName.trim()) return;
        onSave(step.id, editedName.trim(), currentProducts.map(p => p.id));
        handleClose();
    };

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    if (!isVisible && !isMounted) return null;
    if (!step && !isMounted) return null;

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>

                    <View style={{ padding: 20, flex: 1 }}>
                        <View style={styles.stepModalHeader}>
                            <View style={{ flex: 1, marginLeft: 15 }}>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Feather name="edit-3" size={14} color={C.accentGreen} />
                                    <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 12, color: C.textSecondary }}>{t('routine_edit_step_name', language)}</Text>
                                </View>
                                <AppTextInput
                                    style={[styles.stepModalTitle, { textAlign: 'right', borderBottomWidth: 1, borderBottomColor: C.accentGreen + '40', paddingBottom: 5 }]}
                                    value={editedName}
                                    onChangeText={setEditedName}
                                    placeholder={t('routine_edit_step_placeholder', language)}
                                    placeholderTextColor={C.textDim}
                                />
                            </View>

                            <PressableScale onPress={() => setAddModalVisible(true)} style={styles.addProductButton}>
                                <Feather name="plus" size={16} color={C.textOnAccent} />
                                <Text style={styles.addProductButtonText}>{t('action_add', language)}</Text>
                            </PressableScale>
                        </View>

                        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 20, backgroundColor: C.background, padding: 12, borderRadius: 12 }}>
                            <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 13, color: C.textSecondary }}>{t('routine_added_products', language)}</Text>
                            <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 13, color: C.accentGreen }}>{currentProducts.length} {t('routine_step_filled', language)}</Text>
                        </View>

                        <FlatList
                            data={currentProducts}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                const imageUri = item.productImage || item.imageUrl || item.image;

                                return (
                                    <View style={styles.shelfRowCard}>
                                        <View style={styles.shelfRowImageWrapper}>
                                            {imageUri ? (
                                                <Image source={{ uri: imageUri }} style={styles.shelfRowImage} resizeMode="cover" />
                                            ) : (
                                                <View style={styles.shelfRowPlaceholder}>
                                                    <FontAwesome5 name="wine-bottle" size={18} color={C.textDim} />
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.shelfRowContent}>
                                            <Text style={styles.shelfRowName} numberOfLines={1}>
                                                {item.productName}
                                            </Text>
                                        </View>
                                        <Pressable onPress={() => handleRemove(item.id)} style={styles.shelfRowDeleteBtn}>
                                            <FontAwesome5 name="trash-alt" size={14} color={C.danger} />
                                        </Pressable>
                                    </View>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.stepModalEmpty}>
                                    <View style={styles.emptyBoxIcon}>
                                        <FontAwesome5 name="box-open" size={24} color={C.textDim} />
                                    </View>
                                    <Text style={styles.stepModalEmptyText}>{t('routine_no_products_yet', language)}</Text>
                                </View>
                            }
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />

                        <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
                            <PressableScale onPress={handleSaveChanges} style={styles.saveStepButton}>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                                    <Text style={styles.saveStepButtonText}>{t('action_save', language)}</Text>
                                    <FontAwesome5 name="check-circle" size={18} color={C.textOnAccent} />
                                </View>
                            </PressableScale>
                        </View>
                    </View>
                </View>
            </Animated.View>

            <ProductSelectionModal
                visible={isAddModalVisible}
                products={allProducts}
                selectedProductIds={currentProducts.map(p => p.id)}
                onSelect={handleAddProduct}
                onClose={() => setAddModalVisible(false)}
            />
        </Modal>
    );
};

// --- MAIN COMPONENT: ROUTINE SECTION ---
export const RoutineSection = ({ savedProducts, userProfile, onOpenAddStepModal }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const language = useCurrentLanguage();
    const { user } = useAppContext();
    const [routines, setRoutines] = useState({ am: [], pm: [], weekly: [] });
    const [activePeriod, setActivePeriod] = useState('am');
    const [selectedStep, setSelectedStep] = useState(null);


    const [routineLogs, setRoutineLogs] = useState([]);
    const [isBuilding, setIsBuilding] = useState(false);

    useEffect(() => {
        const raw = userProfile?.routines || {};
        const initialRoutines = {
            am:     Array.isArray(raw.am)     ? raw.am     : [],
            pm:     Array.isArray(raw.pm)     ? raw.pm     : [],
            weekly: Array.isArray(raw.weekly) ? raw.weekly : [],
        };
        setRoutines(initialRoutines);
    }, [userProfile]);

    const saveRoutines = async (newRoutines) => {
        setRoutines(newRoutines);
        try {
            await updateDoc(doc(db, 'profiles', user.uid), { routines: newRoutines });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error("Error saving routines:", error);
            AlertService.error(t('common_error', language), t('routine_save_error', language));
        }
    };

    const switchPeriod = (period) => {
        if (period === activePeriod) return;
        Haptics.selectionAsync();
        setActivePeriod(period);
    };

    const handleAddStep = (stepName) => {
        if (stepName) {
            const newStep = { id: `step-${Date.now()}`, name: stepName, productIds: [] };
            const newRoutines = JSON.parse(JSON.stringify(routines));
            if (!Array.isArray(newRoutines[activePeriod])) newRoutines[activePeriod] = [];
            newRoutines[activePeriod].push(newStep);
            saveRoutines(newRoutines);
        }
    };

    const handleDeleteStep = async (stepId) => {
        AlertService.delete(
            t('routine_delete_step_confirm_title', language),
            t('routine_delete_step_confirm_message', language),
            async () => {
                const newRoutines = JSON.parse(JSON.stringify(routines));
                if (!Array.isArray(newRoutines[activePeriod])) newRoutines[activePeriod] = [];
                newRoutines[activePeriod] = newRoutines[activePeriod].filter(s => s.id !== stepId);
                saveRoutines(newRoutines);
            }
        );
    };

    const handleUpdateStep = (stepId, newName, newProductIds) => {
        const newRoutines = JSON.parse(JSON.stringify(routines));
        if (!Array.isArray(newRoutines[activePeriod])) newRoutines[activePeriod] = [];
        const stepIndex = newRoutines[activePeriod].findIndex(s => s.id === stepId);
        
        if (stepIndex !== -1) {
            newRoutines[activePeriod][stepIndex].name = newName;
            newRoutines[activePeriod][stepIndex].productIds = newProductIds;
            saveRoutines(newRoutines);
        }
    };

    const handleAutoBuildRoutine = () => {
        if (savedProducts.length < 2) {
            AlertService.show({ 
                title: t('routine_auto_build_error_title', language), 
                message: t('routine_auto_build_error_message', language), 
                type: 'warning' 
            });
            return;
        }
        const runArchitect = async () => {
            setIsBuilding(true);
            setRoutineLogs([]);
            try {
                const response = await fetch(`${PROFILE_API_URL}/generate-routine.js`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ products: savedProducts, settings: userProfile?.settings || {} })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Server Error");

                // Read all four periods from backend; fall back to existing state if a key is missing.
                const newRoutines = {
                    am:     Array.isArray(data.am)     ? data.am     : [],
                    pm:     Array.isArray(data.pm)     ? data.pm     : [],
                    weekly: Array.isArray(data.weekly) ? data.weekly : (routines.weekly || []),
                    hair:   Array.isArray(data.hair)   ? data.hair   : (routines.hair   || []),
                    body:   Array.isArray(data.body)   ? data.body   : (routines.body   || []),
                };
                await saveRoutines(newRoutines);
                if (data.logs && Array.isArray(data.logs)) setRoutineLogs(data.logs);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                AlertService.success(t('common_updated', language), t('routine_auto_build_success', language));
            } catch (error) {
                console.error("Routine Generation Error:", error);
                AlertService.error(t('common_error', language), t('common_server_error', language));
            } finally {
                setIsBuilding(false);
            }
        };
        AlertService.confirm(
            t('routine_auto_build_confirm_title', language), 
            t('routine_auto_build_confirm_message', language), 
            runArchitect
        );
    };

    const currentSteps = Array.isArray(routines[activePeriod]) ? routines[activePeriod] : [];

    return (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <View style={{ marginBottom: 15 }}>
                <RoutineSegmentedControl 
                    activePeriod={activePeriod} 
                    onPeriodChange={(newPeriod) => switchPeriod(newPeriod)} 
                />
            </View>

            <View style={{ paddingBottom: 220, paddingTop: 10 }}>
                <View style={{ marginBottom: 15 }}>
                    <RoutineLogViewer logs={routineLogs} />
                </View>

                {currentSteps.length > 0 ? (
                    currentSteps.map((item, index) => (
                        <RoutineStepCard
                            key={item.id}
                            step={item}
                            index={index}
                            isLast={index === currentSteps.length - 1}
                            onManage={() => setSelectedStep(item)}
                            onDelete={() => handleDeleteStep(item.id)}
                            products={savedProducts}
                        />
                    ))
                ) : (
                    <RoutineEmptyState onPress={handleAutoBuildRoutine} />
                )}
            </View>

            <View style={styles.floatingControlsContainer}>
                <View style={styles.floatingCapsule}>
                    <Pressable
                        style={styles.fabItem}
                        onPress={handleAutoBuildRoutine}
                        disabled={isBuilding}
                    >
                        {isBuilding ? (
                            <ActivityIndicator size="small" color={C.accentGreen} />
                        ) : (
                            <View style={styles.fabInner}>
                                <MaterialCommunityIcons name="auto-fix" size={18} color={C.accentGreen} />
                                <Text style={styles.fabText}>{t('routine_auto_build', language)}</Text>
                            </View>
                        )}
                    </Pressable>

                    <View style={styles.fabDivider} />

                    <Pressable
                        style={styles.fabItem}
                        onPress={() => onOpenAddStepModal(handleAddStep)}
                    >
                        <View style={styles.fabInner}>
                            <Feather name="plus" size={18} color={C.accentGreen} />
                            <Text style={styles.fabText}>{t('routine_add_step', language)}</Text>
                        </View>
                    </Pressable>
                </View>
            </View>

            {selectedStep && (
                <StepEditorModal
                    isVisible={!!selectedStep}
                    onClose={() => setSelectedStep(null)}
                    step={selectedStep}
                    onSave={handleUpdateStep}
                    allProducts={savedProducts}
                />
            )}

        </View>
    );
};

// ============================================================================
// --- STYLES FOR ROUTINE SECTION ---
// ============================================================================
const getStylesContent = (C) => ({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 99 },

    // --- ULTRA-CLEAN TIMELINE STYLES ---
    stepTimelineContainer: {
        flexDirection: 'row-reverse',
        paddingHorizontal: 5,
        backgroundColor: 'transparent',
    },
    timelineIndicatorColumn: {
        width: 40,
        alignItems: 'center',
    },
    timelineDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    timelineDotFilled: {
        backgroundColor: C.accentGreen,
    },
    timelineDotEmpty: {
        backgroundColor: C.background,
        borderWidth: 1.5,
        borderColor: C.border,
    },
    timelineDotText: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 12,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: C.border,
        marginTop: 4,
        marginBottom: -25, // Reaches well down to the next dot
    },
    timelineContentColumn: {
        flex: 1,
        paddingRight: 12,
        paddingBottom: 25, // Generous spacing before the next step begins
    },
    
    // Header
    stepHeaderClean: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    stepNameClean: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        color: C.textPrimary,
        textAlign: 'right',
        flex: 1,
    },
    deleteBtnClean: {
        padding: 5,
        opacity: 0.6,
    },

    // Texts / Alerts
    emptyStepTextClean: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: C.textDim,
        textAlign: 'right',
        marginTop: 4,
    },
    alertRowClean: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    alertBoxClean: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
        marginTop: 8,
        marginBottom: 4,
    },
     alertTextClean: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        color: C.textPrimary, // Forces high contrast text instead of colored text
        textAlign: 'right',
        flex: 1,
        lineHeight: 20, // Better line height for readability
    },

    // Grouped Product List (iOS Settings style)
    productListGroup: {
        marginTop: 12,
        backgroundColor: 'rgba(255,255,255,0.02)', // Super subtle grouped background
        borderRadius: 16,
        borderWidth: 0.5,
        borderColor: C.border, // Very thin outline holds it together cleanly
        overflow: 'hidden',
    },
    productRowClean: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    productRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.03)', // Barely visible separator inside the group
    },
    // Shelf Row Card Design (Matching Profile Shelf Items)
    shelfRowCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: C.card,
        borderRadius: 22,
        borderWidth: 0.5,
        borderColor: C.border,
        overflow: 'hidden',
        minHeight: 74,
        marginBottom: 8,
        paddingRight: 0,
        paddingLeft: 14,
        paddingVertical: 0,
    },
    shelfRowImageWrapper: {
        width: 74,
        height: 74,
        alignSelf: 'stretch',
        backgroundColor: C.background,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shelfRowImage: {
        width: 74,
        height: 74,
    },
    shelfRowPlaceholder: {
        width: 74,
        height: 74,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: C.background,
    },
    shelfRowContent: {
        flex: 1,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    shelfRowName: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 15,
        color: C.textPrimary,
        textAlign: 'right',
        lineHeight: 22,
    },
    shelfRowActionBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: C.accentGreen + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    shelfRowDeleteBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: C.danger + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },

    // Modals / Editor Sheets
    sheetContainer: { position: 'absolute', bottom: -150, left: 0, right: 0, height: height * 0.85 + 150, zIndex: 100, justifyContent: 'flex-end', paddingBottom: 150 },
    sheetContent: { flex: 1, backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 0.5, borderColor: C.border, overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 25 },
    sheetHandleBar: { alignItems: 'center', paddingVertical: 15, width: '100%', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
    sheetHandle: { width: 48, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
    modalTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: C.textPrimary, textAlign: 'center', marginBottom: 15 },
    modalDescription: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: C.textSecondary, textAlign: 'right', lineHeight: 24, marginBottom: 20 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, position: 'relative' },
    enhancedInput: { flex: 1, backgroundColor: C.background, borderWidth: 0.5, borderColor: C.border, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 15, paddingRight: 45, color: C.textPrimary, fontSize: 16, textAlign: 'right' },
    inputIcon: { position: 'absolute', right: 15, zIndex: 1 },
    promptButtonRow: { flexDirection: 'row-reverse', gap: 10, marginHorizontal: 20 },
    promptButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
    promptButtonPrimary: { backgroundColor: C.accentGreen },
    promptButtonSecondary: { backgroundColor: 'transparent', borderWidth: 0.5, borderColor: C.border },
    promptButtonTextPrimary: { color: C.textOnAccent, fontFamily: 'Tajawal-Bold' },
    promptButtonTextSecondary: { color: C.textSecondary, fontFamily: 'Tajawal-Bold' },



    // Selection Modal
    centeredModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
    selectionCard: { width: '85%', backgroundColor: C.card, borderRadius: 24, padding: 20, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 },
    selectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    selectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: C.textPrimary },
    closeIconBtn: { padding: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
    modalSearchBar: { flexDirection: 'row-reverse', backgroundColor: C.background, borderRadius: 12, paddingHorizontal: 12, height: 40, alignItems: 'center', marginBottom: 15, borderWidth: 0.5, borderColor: C.border },
    modalSearchInput: { flex: 1, fontFamily: 'Tajawal-Regular', color: C.textPrimary, fontSize: 13, textAlign: 'right', paddingRight: 8 },
    selectionCardWrapper: { backgroundColor: 'transparent', borderRadius: 12, marginBottom: 8, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    selectionRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, width: '100%', backgroundColor: 'rgba(255,255,255,0.02)' },
    selectionIconBox: { width: 50, height: 50, borderRadius: 14, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.border, overflow: 'hidden' },
    selectionItemText: { flex: 1, fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.textPrimary, textAlign: 'right', marginHorizontal: 15 },
    selectionActionBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },

    // Step Editor Modal
    stepModalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    stepModalTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: C.textPrimary },
    addProductButton: { flexDirection: 'row-reverse', gap: 6, backgroundColor: C.accentGreen, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    addProductButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: C.textOnAccent },
    reorderItem: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.background, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15, marginBottom: 10, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.05)' },
    reorderIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.border, overflow: 'hidden' },
    reorderItemText: { flex: 1, fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.textPrimary, textAlign: 'right', marginHorizontal: 10 },
    reorderDeleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.danger + '15', alignItems: 'center', justifyContent: 'center' },
    stepModalEmpty: { alignItems: 'center', paddingVertical: 40, opacity: 0.6, gap: 10 },
    emptyBoxIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    stepModalEmptyText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: C.textDim },
    saveStepButton: { flexDirection: 'row-reverse', gap: 10, backgroundColor: C.accentGreen, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: C.accentGreen, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    saveStepButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: C.textOnAccent },

    // Floating Controls
    floatingControlsContainer: { position: 'absolute', bottom: 125, left: 0, right: 0, alignItems: 'center', zIndex: 50 },
    floatingCapsule: { flexDirection: 'row-reverse', backgroundColor: C.card, borderRadius: 100, paddingHorizontal: 4, paddingVertical: 6, borderWidth: 0.5, borderColor: C.accentGreen + '66', shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 0, width: width * 0.85 },
    fabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, backgroundColor: 'transparent' },
    fabInner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    fabText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.textPrimary },
    fabDivider: { width: 1, height: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)', alignSelf: 'center' },
});

const createStyles = (c) => StyleSheet.create(getStylesContent(c));