// src/components/oilguard/BountyModal.js
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Pressable,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ActivityIndicator,
    Animated,
    Easing,
} from 'react-native';
import { FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { getClaimsByProductType } from '../../constants/productData';
import { getPointsForField } from '../../utils/gamificationEngine';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';
import { AlertService } from '../../services/alertService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

export default function BountyModal({ visible, onClose, onSubmit, product, field }) {
    const { colors: C } = useTheme();
    const language = useCurrentLanguage();
    const rtl = useRTL();
    const isEn = language === 'en';
    const animState = useRef(new Animated.Value(0)).current;
    const mainScrollViewRef = useRef(null);

    const [textValue, setTextValue] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPending, setIsPending] = useState(false);

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

    useEffect(() => {
        if (visible && product) {
            const rawValue = product[field];
            if (field === 'marketingClaims' || field === 'targetTypes') {
                setSelectedTags(Array.isArray(rawValue) ? rawValue : []);
            } else if (field === 'price') {
                if (typeof rawValue === 'object' && rawValue !== null) {
                    setTextValue(rawValue.min?.toString() || rawValue.max?.toString() || '');
                } else {
                    setTextValue(rawValue?.toString() || '');
                }
            } else {
                setTextValue(rawValue?.toString() || '');
            }
            setIsPending(false);
        }
    }, [visible, field, product]);

    const handleClose = () => {
        Animated.timing(animState, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const toggleTag = (tag) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const handleSave = async () => {
        const cleanValue = textValue.trim();

        if (field === 'price') {
            const num = parseFloat(cleanValue);
            if (isNaN(num) || num <= 0) {
                AlertService.error(
                    t('bounty_invalid_value_title', language),
                    t('bounty_invalid_price_msg', language)
                );
                return;
            }
        }

        if (field === 'ingredients' && cleanValue.length < 10) {
            AlertService.error(
                t('bounty_missing_data_title', language),
                t('bounty_short_ingredients_msg', language)
            );
            return;
        }

        if (field !== 'marketingClaims' && field !== 'targetTypes' && !cleanValue) {
            return;
        }

        setIsSubmitting(true);
        let finalValue;
        if (field === 'marketingClaims' || field === 'targetTypes') {
            finalValue = selectedTags;
        } else {
            finalValue = cleanValue;
        }

        try {
            const result = await onSubmit(product, field, finalValue);
            if (result && result.isPending) {
                setIsPending(true);
                // Auto close after showing pending message
                setTimeout(() => handleClose(), 2000);
            } else {
                handleClose();
            }
        } catch (error) {
            console.log('Bounty Modal Error:', error);
            AlertService.error(
                t('error', language),
                t('bounty_submit_error', language)
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const availableTags = useMemo(() => {
        if (field === 'marketingClaims')
            return getClaimsByProductType(product?.category?.id || 'other');
        if (field === 'targetTypes')
            return [
                'بشرة دهنية',
                'بشرة جافة',
                'بشرة حساسة',
                'بشرة مختلطة',
                'بشرة معرضة للحبوب',
                'شعر جاف',
                'شعر دهني',
                'شعر متضرر',
                'شعر مصبوغ',
                'فروة حساسة',
            ];
        return [];
    }, [field, product]);

    const renderInputArea = () => {
        if (isPending) {
            return (
                <View style={styles.pendingContainer}>
                    <View style={[styles.pendingIconContainer, { backgroundColor: C.gold + '20' }]}>
                        <FontAwesome5 name="clock" size={48} color={C.gold} />
                    </View>
                    <Text style={[styles.pendingTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                        {t('bounty_pending_title', language)}
                    </Text>
                    <Text style={[styles.pendingMessage, { color: C.textDim, textAlign: rtl.textAlign }]}>
                        {t('bounty_pending_message', language)}
                    </Text>
                </View>
            );
        }

        switch (field) {
            case 'price':
                return (
                    <View
                        style={[
                            styles.inputWrapper,
                            { backgroundColor: C.card, borderColor: C.gold },
                        ]}
                    >
                        <TextInput
                            style={[styles.input, { color: C.textPrimary, textAlign: rtl.textAlign }]}
                            placeholder="0.00"
                            placeholderTextColor={C.textDim}
                            keyboardType="decimal-pad"
                            value={textValue}
                            onChangeText={setTextValue}
                            autoFocus
                        />
                        <Text style={[styles.unitText, { color: C.textDim }]}>
                            {t('catalog_currency', language)}
                        </Text>
                    </View>
                );

            case 'ingredients':
                return (
                    <View
                        style={[
                            styles.areaWrapper,
                            { backgroundColor: C.card, borderColor: C.border },
                        ]}
                    >
                        <View style={[styles.areaHeader, { flexDirection: rtl.flexDirection }]}>
                            <TouchableOpacity onPress={() => setTextValue('')}>
                                <Text style={[styles.clearText, { color: C.danger }]}>
                                    {t('bounty_clear_all', language)}
                                </Text>
                            </TouchableOpacity>
                            <Text
                                style={[
                                    styles.charCount,
                                    { color: textValue.length > 20 ? C.accentGreen : C.textDim },
                                ]}
                            >
                                {textValue.length} {t('bounty_chars_count', language)}
                            </Text>
                        </View>
                        <TextInput
                            style={[styles.areaInput, { color: C.textPrimary, textAlign: rtl.textAlign }]}
                            placeholder={t('bounty_ingredients_placeholder', language)}
                            placeholderTextColor={C.textDim}
                            multiline
                            value={textValue}
                            onChangeText={setTextValue}
                            numberOfLines={5}
                        />
                    </View>
                );

            case 'marketingClaims':
            case 'targetTypes':
                return (
                    <View style={styles.tagGridContainer}>
                        <Text style={[styles.subLabel, { color: C.textDim, textAlign: rtl.textAlign }]}>
                            {t('bounty_select_list', language)} ({selectedTags.length}):
                        </Text>
                        <ScrollView
                            contentContainerStyle={[styles.tagScroll, { flexDirection: rtl.flexDirection }]}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                        >
                            {availableTags.map((tag, i) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => toggleTag(tag)}
                                    style={[
                                        styles.tagChip,
                                        {
                                            backgroundColor: selectedTags.includes(tag)
                                                ? C.accentGreen
                                                : C.card,
                                            borderColor: selectedTags.includes(tag)
                                                ? C.accentGreen
                                                : C.border,
                                            flexDirection: rtl.flexDirection,
                                        },
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.tagText,
                                            {
                                                color: selectedTags.includes(tag)
                                                    ? '#FFF'
                                                    : C.textSecondary,
                                            },
                                        ]}
                                    >
                                        {t(tag, language)}
                                    </Text>
                                    {selectedTags.includes(tag) && (
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={14}
                                            color="#FFF"
                                        />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                );

            default:
                return (
                    <View
                        style={[
                            styles.inputWrapper,
                            { backgroundColor: C.card, borderColor: C.border },
                        ]}
                    >
                        <TextInput
                            style={[styles.input, { color: C.textPrimary, textAlign: rtl.textAlign }]}
                            placeholder={t('bounty_generic_placeholder', language)}
                            placeholderTextColor={C.textDim}
                            value={textValue}
                            onChangeText={setTextValue}
                            autoFocus
                        />
                    </View>
                );
        }
    };

    const getFieldTitle = () => {
        const titles = {
            price: t('bounty_title_price', language),
            quantity: t('bounty_title_quantity', language),
            ingredients: t('bounty_title_ingredients', language),
            marketingClaims: t('bounty_title_claims', language),
            targetTypes: t('bounty_title_targets', language),
        };
        return titles[field] || t('bounty_title_default', language);
    };

    const pointsToEarn = getPointsForField(field);
    const overlayOpacity = animState.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const modalTranslateY = animState.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] });

    return (
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
                                colors={[C.gold, '#D4AF37']}
                                style={styles.rewardBadge}
                            >
                                <FontAwesome5 name="medal" size={12} color="#000" />
                                <Text style={styles.rewardText}>+{pointsToEarn} {t('catalog_points', language)}</Text>
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
                                        {getFieldTitle()}
                                    </Text>
                                    <Text style={[styles.mainSub, { color: C.textDim, textAlign: rtl.textAlign }]}>
                                        {t('bounty_contribution_subtitle', language)}
                                    </Text>
                                </View>
                            </StaggeredView>

                            <StaggeredView index={1}>
                                <View style={[styles.glassCard, { backgroundColor: C.card, borderColor: C.border }]}>
                                    <View style={[styles.sectionHeaderSimple, { flexDirection: rtl.flexDirection }]}>
                                        <View style={[styles.sectionIconBox, { backgroundColor: C.gold + '20' }]}>
                                            <FontAwesome5 name="edit" size={16} color={C.gold} />
                                        </View>
                                        <Text style={[styles.sectionTitle, { color: C.textPrimary, textAlign: rtl.textAlign }]}>
                                            {t('bounty_enter_details', language)}
                                        </Text>
                                    </View>
                                    {renderInputArea()}
                                </View>
                            </StaggeredView>

                            <View style={{ height: 100 }} />
                        </ScrollView>

                        {/* Footer */}
                        {!isPending && (
                            <View style={[styles.footer, { backgroundColor: C.background, borderTopColor: C.border, flexDirection: rtl.flexDirection }]}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                                    <Text style={{ color: C.textDim, fontFamily: 'Tajawal-Bold', fontSize: 15 }}>
                                        {t('action_cancel', language)}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.submitBtnWrapper, rtl.isRTL && { marginLeft: 0, marginRight: 16 }]}
                                    onPress={handleSave}
                                    disabled={isSubmitting}
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
                                                <Text style={styles.submitText}>{t('action_save', language)}</Text>
                                                <Feather name="check-circle" size={18} color="#FFF" />
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Animated.View>
                </KeyboardAvoidingView>
            </Animated.View>
        </Modal>
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
        height: SCREEN_HEIGHT * 0.85,
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
        color: '#000',
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
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 65,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 20,
    },
    input: {
        flex: 1,
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 22,
    },
    unitText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        marginStart: 10,
    },
    areaWrapper: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 15,
        minHeight: 180,
    },
    areaHeader: {
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingBottom: 8,
    },
    clearText: {
        fontSize: 12,
        fontFamily: 'Tajawal-Bold',
    },
    charCount: {
        fontSize: 11,
        fontFamily: 'Tajawal-Bold',
    },
    areaInput: {
        flex: 1,
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    tagGridContainer: {
        height: 280,
    },
    subLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        marginBottom: 12,
    },
    tagScroll: {
        flexWrap: 'wrap',
        gap: 10,
        paddingBottom: 20,
    },
    tagChip: {
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
    },
    tagText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
    },
    pendingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        gap: 16,
    },
    pendingIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 18,
        textAlign: 'center',
    },
    pendingMessage: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
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