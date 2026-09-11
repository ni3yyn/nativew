import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    Animated,
    Dimensions,
    PanResponder,
    ScrollView,
    Easing,
    TouchableOpacity,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AVATARS } from '../../constants/avatars';
import { useTheme } from '../../context/ThemeContext';
import { t } from '../../i18n';
import { useCurrentLanguage } from '../../hooks/useCurrentLanguage';
import { useRTL } from '../../hooks/useRTL';

const { height } = Dimensions.get('window');

// Interactive avatar item
const AvatarItem = ({ id, source, isSelected, onSelect, colors }) => {
    return (
        <View style={styles.avatarItemContainer}>
            <TouchableOpacity
                onPress={() => onSelect(id)}
                activeOpacity={0.8}
                hitSlop={6}
            >
                <View
                    style={[
                        styles.avatarWrapper,
                        {
                            borderColor: isSelected ? colors.accentGreen : 'transparent',
                            shadowColor: isSelected ? colors.accentGreen : '#000',
                            shadowOpacity: isSelected ? 0.4 : 0.12,
                            backgroundColor: colors.background,
                        },
                    ]}
                >
                    <Image source={source} style={styles.avatarImage} resizeMode="cover" />
                </View>
            </TouchableOpacity>

            {isSelected && (
                <View
                    style={[
                        styles.checkBadge,
                        {
                            backgroundColor: colors.accentGreen,
                            borderColor: colors.card,
                        },
                    ]}
                >
                    <FontAwesome5 name="check" size={9} color={colors.textOnAccent || '#FFF'} />
                </View>
            )}
        </View>
    );
};

export const AvatarSelectionModal = ({ visible, onClose, currentId, onSelect, language: customLanguage }) => {
    const { colors } = useTheme();
    const currentLang = useCurrentLanguage();
    const language = customLanguage || currentLang;
    const rtl = useRTL();

    const animController = useRef(new Animated.Value(0)).current;

    // --- Gesture Handler (Matching InsightDetailsModal) ---
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    animController.setValue(1 - (gestureState.dy / height));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > height * 0.2 || gestureState.vy > 0.8) {
                    handleClose();
                } else {
                    Animated.spring(animController, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
                }
            },
        })
    ).current;

    // --- Entrance Animation (Matching InsightDetailsModal) ---
    useEffect(() => {
        if (visible) {
            Animated.spring(animController, { toValue: 1, friction: 9, tension: 50, useNativeDriver: true }).start();
            Haptics.selectionAsync();
        }
    }, [visible]);

    // --- Close Animation (Matching InsightDetailsModal) ---
    const handleClose = () => {
        Animated.timing(animController, { toValue: 0, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true })
            .start(({ finished }) => {
                if (finished) onClose();
            });
    };

    // Smooth exit on avatar select
    const handleAvatarSelect = (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Animated.timing(animController, { toValue: 0, duration: 250, easing: Easing.in(Easing.ease), useNativeDriver: true })
            .start(({ finished }) => {
                if (finished) {
                    onSelect(id);
                }
            });
    };

    if (!visible) return null;

    const translateY = animController.interpolate({ inputRange: [0, 1], outputRange: [height + 150, 0] });
    const backdropOpacity = animController.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });

    return (
        <>
            <Modal
                transparent
                visible={true}
                onRequestClose={handleClose}
                animationType="none"
                statusBarTranslucent
            >
                <View style={{ flex: 1 }} pointerEvents="box-none">
                    {/* Backdrop */}
                    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
                    </Animated.View>

                    {/* Sheet Container */}
                    <Animated.View style={[styles.sheetContainer, { transform: [{ translateY }] }]}>
                        <View style={[styles.sheetContent, { backgroundColor: colors.card }]}>
                            
                            {/* Drag Handle Bar */}
                            <View
                                style={[styles.sheetHandleBar, { backgroundColor: colors.card }]}
                                {...panResponder.panHandlers}
                            >
                                <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
                            </View>

                            {/* Content */}
                            <ScrollView
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                                bounces={false}
                            >
                                <View style={styles.mainPadding}>
                                    {/* Header */}
                                    <View style={[styles.headerRow, { flexDirection: rtl.flexDirection }]}>
                                        <Text style={[styles.headerTitle, { color: colors.textPrimary, textAlign: rtl.textAlign }]}>
    {t('onboarding_avatar_select', language)}
</Text>
                                        <TouchableOpacity
                                            onPress={handleClose}
                                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                            style={[
                                                styles.closeIconBtn,
                                                {
                                                    backgroundColor: colors.background,
                                                    borderColor: colors.border,
                                                },
                                            ]}
                                        >
                                            <FontAwesome5 name="times" size={13} color={colors.textDim} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Description */}
                                    <Text style={[styles.headerDesc, { color: colors.textSecondary, textAlign: rtl.textAlign }]}>
    {t('avatar_select_desc', language)}
</Text>

                                    {/* Avatar Grid */}
                                   <View style={styles.gridContainer}>
    {Object.keys(AVATARS)
        .filter((id) => id !== 'avatar_wathiq')
        .map((id) => (
            <AvatarItem
                key={id}
                id={id}
                source={AVATARS[id]}
                isSelected={currentId === id}
                onSelect={handleAvatarSelect}
                colors={colors}
            />
        ))}
</View>
                                </View>
                            </ScrollView>

                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 1,
    },
    sheetContainer: {
        position: 'absolute',
        bottom: -150,
        left: 0,
        right: 0,
        height: height * 0.78 + 150,
        zIndex: 2,
    },
    sheetContent: {
        flex: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        paddingBottom: 150,
    },
    sheetHandleBar: {
        alignItems: 'center',
        paddingVertical: 15,
        width: '100%',
        zIndex: 10,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 10,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    mainPadding: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    headerRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    headerTitle: {
        fontFamily: 'Tajawal-ExtraBold',
        fontSize: 20,
    },
    closeIconBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
    },
    headerDesc: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 13,
        marginBottom: 16,
        lineHeight: 18,
    },

    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 18,
        paddingBottom: 10,
    },
    avatarItemContainer: {
        position: 'relative',
    },
    avatarWrapper: {
        width: 76,
        height: 76,
        borderRadius: 38,
        overflow: 'hidden',
        borderWidth: 3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 4,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    checkBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        elevation: 6,
    },
});

export default AvatarSelectionModal;