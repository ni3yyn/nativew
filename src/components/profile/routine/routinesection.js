import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity, Pressable,
    Dimensions, ScrollView, Animated, Modal, FlatList,
    Platform, ActivityIndicator, KeyboardAvoidingView, Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, Rect, Mask, Circle } from 'react-native-svg';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase'; 
import { useAppContext } from '../../../context/AppContext';
import { useTheme } from '../../../context/ThemeContext';
import { AlertService } from '../../../services/alertService';
import { RoutineEmptyState } from '../EmptyStates';
import { RoutineLogViewer } from './RoutineLogViewer';
import { PressableScale, StaggeredItem } from '../analysis/AnalysisShared';

const PROFILE_API_URL = "https://oilguard-backend.vercel.app/api";
const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/// --- HELPER 1: Add Step Modal (Fixed Z-Index Layering) ---
export const AddStepModal = ({ isVisible, onClose, onAdd }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const animController = useRef(new Animated.Value(0)).current;
    const [stepName, setStepName] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isVisible) {
            setStepName('');
            // 1. Start Animation
            Animated.spring(animController, {
                toValue: 1,
                damping: 15,
                stiffness: 100,
                useNativeDriver: true
            }).start();

            // 2. Focus Delay
            setTimeout(() => {
                inputRef.current?.focus();
            }, 300);
        }
    }, [isVisible]);

    const handleClose = () => {
        Keyboard.dismiss();
        Animated.timing(animController, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onClose());
    };

    const handleAdd = () => {
        if (stepName.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onAdd(stepName.trim());
            handleClose();
        }
    };

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange:[0, 0.6] });

    if (!isVisible) return null;

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>

            {/* LAYER 1: The Dark Overlay (Z-Index: 1) */}
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity, zIndex: 1 }]} >
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            {/* LAYER 2: The Content (Z-Index: 100 - MUST BE HIGHER) */}
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "padding"}
                style={{ flex: 1, justifyContent: 'flex-end', zIndex: 100 }} // <--- CRITICAL FIX
                pointerEvents="box-none"
            >
                <Animated.View
                    style={{
                        transform: [{ translateY }],
                        width: '100%',
                        backgroundColor: C.card,
                        borderTopLeftRadius: 32,
                        borderTopRightRadius: 32,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: -5 },
                        shadowOpacity: 0.3,
                        shadowRadius: 10,
                        elevation: 20,
                    }}
                >
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>

                    <View style={{ padding: 25, paddingBottom: 40 }}>

                        {/* Header */}
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{
                                width: 60, height: 60, borderRadius: 30,
                                backgroundColor: C.accentGreen + '20',
                                alignItems: 'center', justifyContent: 'center', marginBottom: 15
                            }}>
                                <FontAwesome5 name="layer-group" size={24} color={C.accentGreen} />
                            </View>
                            <Text style={styles.modalTitle}>إضافة خطوة جديدة</Text>
                            <Text style={styles.modalDescription}>
                                أضفي مرحلة جديدة لروتينك (مثال: سيروم، تونر، علاج).
                            </Text>
                        </View>

                        {/* Input */}
                        <View style={styles.inputWrapper}>
                            <TextInput
                                ref={inputRef}
                                placeholder="اسم الخطوة..."
                                placeholderTextColor={C.textDim}
                                style={[
                                    styles.enhancedInput,
                                    // 2. CONDITIONAL FONT: Regular if empty, Bold if typing
                                    { fontFamily: stepName.length > 0 ? 'Tajawal-Bold' : 'Tajawal-Regular' }
                                ]}
                                value={stepName}
                                onChangeText={setStepName}
                                textAlign="right"
                            />
                            <View style={styles.inputIcon}>
                                <Feather name="edit-3" size={16} color={C.accentGreen} />
                            </View>
                        </View>

                        {/* Buttons */}
                        <View style={styles.promptButtonRow}>
                            <PressableScale style={[styles.promptButton, styles.promptButtonSecondary]} onPress={handleClose}>
                                <Text style={styles.promptButtonTextSecondary}>إلغاء</Text>
                            </PressableScale>
                            <PressableScale
                                style={[styles.promptButton, styles.promptButtonPrimary, !stepName.trim() && { opacity: 0.5 }]}
                                onPress={handleAdd}
                                disabled={!stepName.trim()}
                            >
                                <Text style={styles.promptButtonTextPrimary}>إضافة</Text>
                            </PressableScale>
                        </View>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// --- HELPER 2: The Interactive Onboarding Guide ---
const RoutineOnboardingGuide = ({ onDismiss }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);

    // Animation Controllers
    const animX = useRef(new Animated.Value(width / 2)).current; // Start center
    const animY = useRef(new Animated.Value(height / 2)).current;
    const animR = useRef(new Animated.Value(0)).current; // Radius starts at 0 (pop effect)
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // --- TARGET CONFIGURATION ---
    // Precision tuning based on your layout styles
    const TARGETS =[
        {
            id: 'switcher',
            title: "فترات الروتين",
            text: "هنا يمكنك التبديل بين روتينك الصباحي والمسائي والخطوات الأسبوعية.",
            // Position: Top Right-ish (Switch Container is Flex:1 starting from right)
            x: width / 2,
            y: insets.top + 145,
            radius: 80
        },
        {
            id: 'auto_build',
            title: "روتين وثيق",
            text: "دعي وثيق يبني لكِ روتينا مثاليا بضغطة زر.",
            // Position: Top Left (AutoBuild is on the left in row-reverse)
            x: 45,
            y: insets.top + 145,
            radius: 35
        },
        {
            id: 'add_step',
            title: "إضافة خطوة",
            text: "زر الإضافة العائم يتيح لكِ إدراج منتجات جديدة يدويا.",
            // Position: Bottom Right (FAB is bottom: 130, right: 20)
            x: width - 52, // 20px margin + 32px half-width
            y: height - 162, // 130px bottom + 32px half-height
            radius: 40
        }
    ];

    const currentTarget = TARGETS[step];

    useEffect(() => {
        // 1. Fade In Overlay
        if (step === 0) {
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        }

        // 2. Move Spotlight smoothly
        Animated.parallel([
            Animated.spring(animX, { toValue: currentTarget.x, friction: 6, tension: 50, useNativeDriver: true }),
            Animated.spring(animY, { toValue: currentTarget.y, friction: 6, tension: 50, useNativeDriver: true }),
            Animated.spring(animR, { toValue: currentTarget.radius, friction: 6, tension: 50, useNativeDriver: true })
        ]).start();

    }, [step]);

    const handleNext = () => {
        if (step < TARGETS.length - 1) {
            setStep(s => s + 1);
        } else {
            // Exit Animation: Expand hole to fill screen or fade out
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(onDismiss);
        }
    };

    return (
        <Modal transparent visible={true} animationType="none">
            <View style={styles.guideOverlay}>

                {/* 1. SVG Mask Layer */}
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
                    <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
                        <Defs>
                            <Mask id="mask" x="0" y="0" height="100%" width="100%">
                                {/* White = Visible (Overlay) */}
                                <Rect height="100%" width="100%" fill="#fff" />
                                {/* Black = Invisible (The Hole) */}
                                <AnimatedCircle
                                    cx={animX}
                                    cy={animY}
                                    r={animR}
                                    fill="black"
                                />
                            </Mask>
                        </Defs>

                        {/* The Dark Overlay applying the mask */}
                        <Rect
                            height="100%"
                            width="100%"
                            fill="rgba(0, 0, 0, 0.85)"
                            mask="url(#mask)"
                        />

                        {/* Optional: Glowing Ring around the hole */}
                        <AnimatedCircle
                            cx={animX}
                            cy={animY}
                            r={animR}
                            stroke={C.accentGreen}
                            strokeWidth="3"
                            fill="transparent"
                            strokeDasharray="10, 5"
                        />
                    </Svg>
                </Animated.View>

                {/* 2. Text Card (Floating) */}
                <View style={styles.guideCardWrapper}>
                    <Animated.View style={[styles.guideCard, { opacity: fadeAnim }]}>
                        <View style={styles.guideHeader}>
                            <View style={styles.guideIconBox}>
                                <FontAwesome5 name="lightbulb" size={20} color={C.gold} />
                            </View>
                            <Text style={styles.guideTitle}>{currentTarget.title}</Text>
                        </View>

                        <Text style={styles.guideText}>{currentTarget.text}</Text>

                        <View style={styles.guideFooter}>
                            <TouchableOpacity onPress={onDismiss}>
                                <Text style={styles.guideSkip}>إنهاء</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleNext} style={styles.guideNextBtn}>
                                <Text style={styles.guideNextText}>
                                    {step === TARGETS.length - 1 ? 'فهمت' : 'التالي'}
                                </Text>
                                <FontAwesome5 name={step === TARGETS.length - 1 ? "check" : "arrow-left"} size={14} color="#1A2D27" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>

            </View>
        </Modal>
    );
};

// --- HELPER 3: The Card for Each Step in the Timeline ---
const RoutineStepCard = ({ step, index, onManage, onDelete, products }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const productList = step.productIds.map(id => products.find(p => p.id === id)).filter(Boolean);
    const isStepFilled = productList.length > 0;

    return (
        // Changed to TouchableOpacity to remove the "stretchy" entry animation
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onManage}
            style={styles.stepCardContainer}
        >
            {/* HEADER: Number + Title + Delete */}
            <View style={styles.stepHeaderRow}>
                <View style={styles.stepTitleGroup}>
                    <LinearGradient
                        colors={isStepFilled ?[C.accentGreen, C.accentGreen] : [C.card, C.border]}
                        style={styles.stepNumberBadge}
                    >
                        <Text style={[styles.stepNumberText, !isStepFilled && { color: C.textSecondary }]}>
                            {index + 1}
                        </Text>
                    </LinearGradient>

                    <View>
                        <Text style={styles.stepName}>{step.name}</Text>
                        <Text style={styles.stepSubText}>
                            {isStepFilled ? `${productList.length} منتجات` : 'خطوة فارغة'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={onDelete}
                    style={styles.deleteIconButton}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Feather name="trash-2" size={18} color={C.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* BODY: Clean Product List */}
            <View style={styles.stepBody}>
                {isStepFilled ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.stepProductsScroll}
                    >
                        {productList.map((p) => {
                            const isSunscreen = p.analysisData?.product_type === 'sunscreen';
                            const iconColor = isSunscreen ? C.gold : C.accentGreen;
                            const bgTint = isSunscreen ? C.gold + '20' : C.accentGreen + '20';

                            return (
                                <View key={p.id} style={styles.stepProductChip}>
                                    <View style={[styles.chipIconBox, { backgroundColor: bgTint }]}>
                                        <FontAwesome5
                                            name={isSunscreen ? 'sun' : 'pump-soap'}
                                            size={12}
                                            color={iconColor}
                                        />
                                    </View>
                                    <Text style={styles.stepProductText} numberOfLines={1}>
                                        {p.productName}
                                    </Text>
                                </View>
                            );
                        })}
                    </ScrollView>
                ) : (
                    <View style={styles.stepEmptyState}>
                        <Text style={styles.stepEmptyLabel}>اضغط لإضافة منتجات</Text>
                        <Feather name="plus-circle" size={16} color={C.accentGreen} />
                    </View>
                )}
            </View>

            <View style={styles.editIndicator}>
                <Feather name="more-horizontal" size={16} color={C.border} />
            </View>

        </TouchableOpacity>
    );
};

// --- HELPER 4: Product Selection Modal (Nested inside StepEditor) ---
const ProductSelectionModal = ({ visible, products, onSelect, onClose }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const [search, setSearch] = useState('');
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setSearch('');
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true })
            ]).start();
        } else {
            Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start();
        }
    }, [visible]);

    if (!visible) return null;

    // Ensure products is an array to prevent crashes
    const safeProducts = Array.isArray(products) ? products :[];

    // Filter products based on search text
    const filtered = safeProducts.filter(p =>
        p.productName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
            <View style={styles.centeredModalOverlay}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <Animated.View style={[
                    styles.selectionCard,
                    { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }
                ]}>
                    <View style={styles.selectionHeader}>
                        <Text style={styles.selectionTitle}>اختر منتج</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
                            <FontAwesome5 name="times" size={16} color={C.textDim} />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar inside Modal */}
                    <View style={styles.modalSearchBar}>
                        <TextInput
                            style={styles.modalSearchInput}
                            placeholder="بحث..."
                            placeholderTextColor={C.textDim}
                            value={search}
                            onChangeText={setSearch}
                        />
                        <FontAwesome5 name="search" size={12} color={C.textDim} />
                    </View>

                    <FlatList
                        data={filtered}
                        keyExtractor={i => i.id}
                        style={{ maxHeight: 400 }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => (
                            <PressableScale
                                onPress={() => onSelect(item.id)}
                                style={styles.selectionCardWrapper}
                            >
                                <View style={styles.selectionRow}>
                                    <View style={styles.selectionIconBox}>
                                        <FontAwesome5
                                            name={item.analysisData?.product_type === 'sunscreen' ? 'sun' : 'wine-bottle'}
                                            size={14}
                                            color={C.accentGreen}
                                        />
                                    </View>
                                    <Text style={styles.selectionItemText} numberOfLines={1}>
                                        {item.productName}
                                    </Text>
                                    <View style={styles.selectionActionBtn}>
                                        <FontAwesome5 name="plus" size={12} color={C.textSecondary} />
                                    </View>
                                </View>
                            </PressableScale>
                        )}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 30 }}>
                                <FontAwesome5 name="search-minus" size={24} color={C.textDim} />
                                <Text style={{ color: C.textDim, marginTop: 10, fontFamily: 'Tajawal-Regular' }}>
                                    لا توجد نتائج
                                </Text>
                            </View>
                        }
                    />
                </Animated.View>
            </View>
        </Modal>
    );
};

// --- HELPER 5: Enhanced Step Editor with Animated Product Picker ---
// --- HELPER 5: Enhanced Step Editor with Name Editing ---
const StepEditorModal = ({ isVisible, onClose, step, onSave, allProducts }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const animController = useRef(new Animated.Value(0)).current;
    
    // States for editing
    const [editedName, setEditedName] = useState('');
    const [currentProducts, setCurrentProducts] = useState([]);
    const [isAddModalVisible, setAddModalVisible] = useState(false);

    useEffect(() => {
        if (isVisible && step) {
            setEditedName(step.name);
            // Map IDs to full product objects
            setCurrentProducts(step.productIds.map(id => allProducts.find(p => p.id === id)).filter(Boolean));
            Animated.spring(animController, { toValue: 1, useNativeDriver: true }).start();
        }
    }, [isVisible, step]);

    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onClose());
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
        // Pass back ID, the NEW NAME, and IDs
        onSave(step.id, editedName.trim(), currentProducts.map(p => p.id));
        handleClose();
    };

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    if (!step) return null;

    return (
        <Modal transparent visible={true} onRequestClose={handleClose} animationType="none" statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                <View style={styles.sheetContent}>
                    <View style={styles.sheetHandleBar}><View style={styles.sheetHandle} /></View>

                    <View style={{ padding: 20, flex: 1 }}>
                        {/* HEADER SECTION: Name Editing */}
                        <View style={styles.stepModalHeader}>
                            <View style={{ flex: 1, marginLeft: 15 }}>
                                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Feather name="edit-3" size={14} color={C.accentGreen} />
                                    <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 12, color: C.textSecondary }}>تعديل اسم الخطوة</Text>
                                </View>
                                <TextInput
                                    style={[styles.stepModalTitle, { textAlign: 'right', borderBottomWidth: 1, borderBottomColor: C.accentGreen + '40', paddingBottom: 5 }]}
                                    value={editedName}
                                    onChangeText={setEditedName}
                                    placeholder="مثلاً: تنظيف عميق"
                                    placeholderTextColor={C.textDim}
                                />
                            </View>

                            <PressableScale onPress={() => setAddModalVisible(true)} style={styles.addProductButton}>
                                <Feather name="plus" size={16} color={C.textOnAccent} />
                                <Text style={styles.addProductButtonText}>منتج</Text>
                            </PressableScale>
                        </View>

                        {/* STATS STRIP */}
                        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 20, backgroundColor: C.background, padding: 12, borderRadius: 12 }}>
                            <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 13, color: C.textSecondary }}>المنتجات المضافة:</Text>
                            <Text style={{ fontFamily: 'Tajawal-Bold', fontSize: 13, color: C.accentGreen }}>{currentProducts.length} منتجات</Text>
                        </View>

                        <FlatList
                            data={currentProducts}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <Animated.View style={styles.reorderItem}>
                                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1 }}>
                                        <View style={[styles.chipIconBox, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border }]}>
                                            <FontAwesome5
                                                name={item.analysisData?.product_type === 'sunscreen' ? 'sun' : 'wine-bottle'}
                                                size={14}
                                                color={item.analysisData?.product_type === 'sunscreen' ? C.gold : C.accentGreen}
                                            />
                                        </View>
                                        <View style={{ marginRight: 10, flex: 1 }}>
                                            <Text style={[styles.reorderItemText, { marginHorizontal: 0 }]} numberOfLines={1}>
                                                {item.productName}
                                            </Text>
                                            <Text style={{ fontFamily: 'Tajawal-Regular', fontSize: 10, color: C.textDim, textAlign: 'right' }}>
                                                {item.analysisData?.product_type === 'sunscreen' ? 'حماية من الشمس' : 'عناية'}
                                            </Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => handleRemove(item.id)}
                                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.danger + '15', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <FontAwesome5 name="trash-alt" size={14} color={C.danger} />
                                    </TouchableOpacity>
                                </Animated.View>
                            )}
                            ListEmptyComponent={
                                <View style={styles.stepModalEmpty}>
                                    <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                                        <FontAwesome5 name="box-open" size={24} color={C.textDim} />
                                    </View>
                                    <Text style={styles.stepModalEmptyText}>لم تضيفي منتجات لهذه الخطوة بعد</Text>
                                </View>
                            }
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />

                        {/* Fixed Footer Save Button */}
                        <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
                        <PressableScale onPress={handleSaveChanges} style={styles.saveStepButton}>
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
        <Text style={styles.saveStepButtonText}>حفظ</Text>
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
                onSelect={handleAddProduct}
                onClose={() => setAddModalVisible(false)}
            />
        </Modal>
    );
};

// --- MAIN COMPONENT: ROUTINE SECTION (Modern Floating UX) ---
export const RoutineSection = ({ savedProducts, userProfile, onOpenAddStepModal }) => {
    const { colors: C } = useTheme();
    const styles = useMemo(() => createStyles(C), [C]);
    const { user } = useAppContext();
    const [routines, setRoutines] = useState({ am: [], pm: [], weekly: [] });
    const [activePeriod, setActivePeriod] = useState('am');
    const [selectedStep, setSelectedStep] = useState(null);
    const[showOnboarding, setShowOnboarding] = useState(false);

    // Server-side Architect State
    const[routineLogs, setRoutineLogs] = useState([]);
    const [isBuilding, setIsBuilding] = useState(false);

    useEffect(() => {
        const initialRoutines = userProfile?.routines || { am: [], pm: [], weekly: [] };
        setRoutines(initialRoutines);
        if (!userProfile?.routines || (initialRoutines.am.length === 0 && initialRoutines.pm.length === 0)) {
            setShowOnboarding(true);
        }
    }, [userProfile]);

    const saveRoutines = async (newRoutines) => {
        setRoutines(newRoutines);
        try {
            await updateDoc(doc(db, 'profiles', user.uid), { routines: newRoutines });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error("Error saving routines:", error);
            AlertService.error("خطأ", "تعذر حفظ الروتين.");
        }
    };

    const switchPeriod = (period) => {
        if (period === activePeriod) return;
        Haptics.selectionAsync();
        setActivePeriod(period);
    };

    const handleAddStep = (stepName) => {
        if (stepName) {
            const newStep = { id: `step-${Date.now()}`, name: stepName, productIds:[] };
            const newRoutines = JSON.parse(JSON.stringify(routines));
            if (!newRoutines[activePeriod]) newRoutines[activePeriod] =[];
            newRoutines[activePeriod].push(newStep);
            saveRoutines(newRoutines);
        }
    };

    const handleDeleteStep = async (stepId) => {
        AlertService.delete(
            "حذف الخطوة",
            "هل أنت متأكد من حذف هذه الخطوة؟",
            async () => {
                const newRoutines = JSON.parse(JSON.stringify(routines));
                newRoutines[activePeriod] = newRoutines[activePeriod].filter(s => s.id !== stepId);
                saveRoutines(newRoutines);
            }
        );
    };

    const handleUpdateStep = (stepId, newName, newProductIds) => {
        const newRoutines = JSON.parse(JSON.stringify(routines));
        const stepIndex = newRoutines[activePeriod].findIndex(s => s.id === stepId);
        
        if (stepIndex !== -1) {
            // Update both the name and the product list
            newRoutines[activePeriod][stepIndex].name = newName;
            newRoutines[activePeriod][stepIndex].productIds = newProductIds;
            saveRoutines(newRoutines);
        }
    };

    const handleAutoBuildRoutine = () => {
        if (savedProducts.length < 2) {
            AlertService.show({ title: "الرف غير كافٍ", message: "نحتاج إلى منتجين على الأقل لبناء روتين ذكي.", type: 'warning' });
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

                const newRoutines = { 
                    am: data.am || [], 
                    pm: data.pm || [], 
                    weekly: data.weekly || routines.weekly || [] 
                };
                await saveRoutines(newRoutines);
                if (data.logs && Array.isArray(data.logs)) setRoutineLogs(data.logs);

                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                AlertService.success("تم التحديث", "تم إعادة هيكلة الروتين بناء على تحليل وثيق.");
            } catch (error) {
                console.error("Routine Generation Error:", error);
                AlertService.error("خطأ", "تعذر الاتصال بالخادم.");
            } finally {
                setIsBuilding(false);
            }
        };
        AlertService.confirm("روتين وثيق التلقائي", "سيتم إعادة ترتيب روتينك بالكامل. موافق؟", runArchitect);
    };

    const currentSteps = routines[activePeriod] ||[];

    return (
        <View style={{ flex: 1 }}>
            {/* 1. Header: CLEANER (Just the Switcher) */}
            <View style={styles.routineHeaderContainer}>
                <View style={styles.routineSwitchContainer}>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => switchPeriod('pm')} style={[styles.periodBtn, activePeriod === 'pm' && styles.periodBtnActive]}>
                        <Text style={[styles.periodText, activePeriod === 'pm' && styles.periodTextActive]}>المساء</Text>
                        <Feather name="moon" size={14} color={activePeriod === 'pm' ? C.textOnAccent : C.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity activeOpacity={0.8} onPress={() => switchPeriod('am')} style={[styles.periodBtn, activePeriod === 'am' && styles.periodBtnActive]}>
                        <Text style={[styles.periodText, activePeriod === 'am' && styles.periodTextActive]}>الصباح</Text>
                        <Feather name="sun" size={14} color={activePeriod === 'am' ? C.textOnAccent : C.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => switchPeriod('weekly')} style={[styles.periodBtn, activePeriod === 'weekly' && styles.periodBtnActive]}>
                        <Text style={[styles.periodText, activePeriod === 'weekly' && styles.periodTextActive]}>أسبوعي</Text>
                        <Feather name="calendar" size={14} color={activePeriod === 'weekly' ? C.textOnAccent : C.textSecondary} />
                    </TouchableOpacity>

                </View>
            </View>

            {/* CONTENT AREA */}
            <View style={{ paddingBottom: 220, paddingTop: 10 }}>
                <View style={{ marginBottom: 10 }}>
                    <RoutineLogViewer logs={routineLogs} />
                </View>

                {currentSteps.length > 0 ? (
                    currentSteps.map((item, index) => (
                        <StaggeredItem index={index} key={item.id}>
                            <RoutineStepCard
                                step={item}
                                index={index}
                                onManage={() => setSelectedStep(item)}
                                onDelete={() => handleDeleteStep(item.id)}
                                products={savedProducts}
                            />
                        </StaggeredItem>
                    ))
                ) : (
                    <RoutineEmptyState onPress={handleAutoBuildRoutine} />
                )}
            </View>

            {/* --- NEW: FLOATING ACTION CAPSULE --- */}
            {/* Positioned at the bottom, above the Dock */}
            <View style={styles.floatingControlsContainer}>
                <View style={styles.floatingCapsule}>

                    {/* Left Action: Auto Build */}
                    <TouchableOpacity
                        style={styles.fabItem}
                        onPress={handleAutoBuildRoutine}
                        disabled={isBuilding}
                    >
                        {isBuilding ? (
                            <ActivityIndicator size="small" color={C.accentGreen} />
                        ) : (
                            <View style={styles.fabInner}>
                                <MaterialCommunityIcons name="auto-fix" size={18} color={C.accentGreen} />
                                <Text style={styles.fabText}>ترتيب ذكي</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Visual Divider */}
                    <View style={styles.fabDivider} />

                    {/* Right Action: Add Step */}
                    <TouchableOpacity
                        style={styles.fabItem}
                        onPress={() => onOpenAddStepModal(handleAddStep)}
                    >
                        <View style={styles.fabInner}>
                            <Feather name="plus" size={18} color={C.accentGreen} />
                            <Text style={styles.fabText}>إضافة خطوة</Text>
                        </View>
                    </TouchableOpacity>

                </View>
            </View>

            {/* MODALS */}
            {selectedStep && (
                <StepEditorModal
                    isVisible={!!selectedStep}
                    onClose={() => setSelectedStep(null)}
                    step={selectedStep}
                    onSave={handleUpdateStep}
                    allProducts={savedProducts}
                />
            )}
            {showOnboarding && <RoutineOnboardingGuide onDismiss={() => setShowOnboarding(false)} />}
        </View>
    );
};


// ============================================================================
// --- STYLES FOR ROUTINE SECTION ---
// ============================================================================
const getStylesContent = (C) => ({
    // Add Step Modal Styles
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 99 },
    sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.85, zIndex: 100, justifyContent: 'flex-end' },
    sheetContent: { flex: 1, backgroundColor: C.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', shadowColor: "#000", shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 25 },
    sheetHandleBar: { alignItems: 'center', paddingVertical: 15, width: '100%', backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
    sheetHandle: { width: 48, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
    modalTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 20, color: C.textPrimary, textAlign: 'center', marginBottom: 15 },
    modalDescription: { fontFamily: 'Tajawal-Regular', fontSize: 14, color: C.textSecondary, textAlign: 'right', lineHeight: 24, marginBottom: 20 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, position: 'relative' },
    enhancedInput: { flex: 1, backgroundColor: C.background, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 15, paddingRight: 45, color: C.textPrimary, fontSize: 16, textAlign: 'right' },
    inputIcon: { position: 'absolute', right: 15, zIndex: 1 },
    promptButtonRow: { flexDirection: 'row-reverse', gap: 10, marginHorizontal: 20 },
    promptButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
    promptButtonPrimary: { backgroundColor: C.accentGreen },
    promptButtonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.border },
    promptButtonTextPrimary: { color: C.textOnAccent, fontFamily: 'Tajawal-Bold' },
    promptButtonTextSecondary: { color: C.textSecondary, fontFamily: 'Tajawal-Bold' },

    // Onboarding Guide Styles
    guideOverlay: { flex: 1, zIndex: 9999 },
    guideCardWrapper: { position: 'absolute', bottom: height * 0.12, width: '100%', alignItems: 'center', zIndex: 100, paddingHorizontal: 20 },
    guideCard: { width: '100%', backgroundColor: C.card, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: C.border, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 },
    guideHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 15, gap: 12 },
    guideIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(251, 191, 36, 0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.2)' },
    guideTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 19, color: C.textPrimary, textAlign: 'right' },
    guideText: { fontFamily: 'Tajawal-Regular', fontSize: 15, color: C.textSecondary, textAlign: 'right', lineHeight: 24, marginBottom: 25 },
    guideFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    guideNextBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: C.accentGreen, paddingVertical: 12, paddingHorizontal: 26, borderRadius: 16, shadowColor: C.accentGreen, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    guideNextText: { fontFamily: 'Tajawal-Bold', color: C.textOnAccent, fontSize: 15 },
    guideSkip: { fontFamily: 'Tajawal-Bold', color: C.textDim, fontSize: 14, paddingVertical: 10, paddingHorizontal: 15 },

    // Routine Step Card Styles
    stepCardContainer: { backgroundColor: C.card, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    stepHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 0 },
    stepTitleGroup: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    stepNumberBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    stepNumberText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 16, color: C.textOnAccent },
    stepName: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: C.textPrimary, textAlign: 'right' },
    stepSubText: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: C.textSecondary, textAlign: 'right' },
    deleteIconButton: { padding: 8, opacity: 0.7 },
    stepBody: { padding: 12, paddingTop: 10 },
    stepProductsScroll: { flexDirection: 'row-reverse', gap: 8, paddingRight: 4 },
    stepProductChip: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', minWidth: 100, maxWidth: 160 },
    chipIconBox: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    stepProductText: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: C.textPrimary, flexShrink: 1, textAlign: 'right', lineHeight: 18 },
    stepEmptyState: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.1)' },
    stepEmptyLabel: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: C.textDim },
    editIndicator: { position: 'absolute', bottom: 6, left: 12, opacity: 0.5 },

    // Selection Modal Styles
    centeredModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
    selectionCard: { width: '85%', backgroundColor: C.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 20 },
    selectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    selectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: C.textPrimary },
    closeIconBtn: { padding: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 },
    modalSearchBar: { flexDirection: 'row-reverse', backgroundColor: C.background, borderRadius: 12, paddingHorizontal: 12, height: 40, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: C.border },
    modalSearchInput: { flex: 1, fontFamily: 'Tajawal-Regular', color: C.textPrimary, fontSize: 13, textAlign: 'right', paddingRight: 8 },
    selectionCardWrapper: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    selectionRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, width: '100%' },
    selectionIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.accentGreen + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.accentGreen + '40' },
    selectionItemText: { flex: 1, fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.textPrimary, textAlign: 'right', marginHorizontal: 15 },
    selectionActionBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },

    // Step Editor Modal Styles
    stepModalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    stepModalTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: C.textPrimary },
    addProductButton: { flexDirection: 'row-reverse', gap: 6, backgroundColor: C.accentGreen, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    addProductButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: C.textOnAccent },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
    reorderItem: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.background, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
    reorderItemText: { flex: 1, fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.textPrimary, textAlign: 'right', marginHorizontal: 10 },
    stepModalEmpty: { alignItems: 'center', paddingVertical: 40, opacity: 0.6, gap: 10 },
    stepModalEmptyText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: C.textDim },
    saveStepButton: { flexDirection: 'row-reverse', gap: 10, backgroundColor: C.accentGreen, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: C.accentGreen, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    saveStepButtonText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: C.textOnAccent },

    // Main Routine Section Styles
    routineHeaderContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12 },
    routineSwitchContainer: { flex: 1, flexDirection: 'row-reverse', backgroundColor: C.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.border },
    periodBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 10, borderRadius: 12 },
    periodBtnActive: { backgroundColor: C.accentGreen },
    periodText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.textSecondary, paddingBottom: 2 },
    periodTextActive: { color: C.textOnAccent },
    floatingControlsContainer: { position: 'absolute', bottom: 125, left: 0, right: 0, alignItems: 'center', zIndex: 50 },
    floatingCapsule: { flexDirection: 'row-reverse', backgroundColor: C.card, borderRadius: 100, paddingHorizontal: 4, paddingVertical: 6, borderWidth: 1, borderColor: C.accentGreen + '66', shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 0, width: width * 0.85 },
    fabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
    fabInner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    fabText: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: C.textPrimary },
    fabDivider: { width: 1, height: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)', alignSelf: 'center' },
});

const createStyles = (c) => StyleSheet.create(getStylesContent(c));