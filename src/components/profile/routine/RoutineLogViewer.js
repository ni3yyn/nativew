// --- START OF FILE RoutineLogViewer.js ---

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { t } from '../../../i18n';
import { useCurrentLanguage } from '../../../hooks/useCurrentLanguage';
import { useRTL } from '../../../hooks/useRTL';

const FALLBACK_COLORS = {
    background: '#1A2D27', card: '#253D34', border: 'rgba(90, 156, 132, 0.25)',
    textDim: '#6B7C76', accentGreen: '#5A9C84', textPrimary: '#F1F3F2',
    textSecondary: '#A3B1AC', danger: '#ef4444', warning: '#f59e0b',
    success: '#22c55e', info: '#3b82f6',
};

export const RoutineLogViewer = ({ logs = [] }) => {
    const { colors } = useTheme();
    const COLORS = colors || FALLBACK_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const language = useCurrentLanguage();
    const { isRTL } = useRTL(); 
    
    const [expanded, setExpanded] = useState(false);
    const [contentHeight, setContentHeight] = useState(0);
    
    // Single unified driver to avoid Native/JS thread collision
    const animationController = useRef(new Animated.Value(0)).current;

    const totalLogs = logs.length;

    useEffect(() => {
        if (contentHeight > 0) {
            Animated.timing(animationController, {
                toValue: expanded ? 1 : 0,
                duration: 260,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                useNativeDriver: false, // Prevents NativeAnimatedModule height validation crashes
            }).start();
        }
    }, [expanded, contentHeight]);

    if (totalLogs === 0) return null;

    const toggleExpand = () => setExpanded(!expanded);

    // Unified Interpolations
    const animatedHeight = animationController.interpolate({
        inputRange: [0, 1],
        outputRange: [0, contentHeight || 1],
    });

    const animatedOpacity = animationController.interpolate({
        inputRange: [0, 0.2, 1],
        outputRange: [0, 0, 1],
    });

    const spin = animationController.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg']
    });
    
    const getIcon = (type) => {
        switch (type) {
            case 'error': return 'x';
            case 'warning': return 'alert-triangle';
            case 'success': return 'check';
            default: return 'info';
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'error': return COLORS.danger;
            case 'warning': return COLORS.warning;
            case 'success': return COLORS.success;
            default: return COLORS.accentGreen;
        }
    };

    const getStatusText = (type) => {
        switch (type) {
            case 'error': return t('routine_log_status_error', language) || 'استبعاد أمان';
            case 'warning': return t('routine_log_status_warning', language) || 'تنبيه طبي';
            case 'success': return t('routine_log_status_success', language) || 'تعديل ممتاز';
            default: return t('routine_log_status_info', language) || 'توجيه ذكي';
        }
    };

    const LogsContent = () => (
        <View style={styles.logsContainer}>
            {logs.map((log, index) => {
                const tintColor = getColor(log.type);
                
                return (
                    <View key={index} style={[styles.logItem, { borderRightColor: tintColor }]}>
                        <View style={styles.logHeader}>
                            <Feather name={getIcon(log.type)} size={13} color={tintColor} style={{ marginLeft: 6 }} />
                            <Text style={[styles.logType, { color: tintColor }]}>
                                {getStatusText(log.type)}
                            </Text>
                        </View>

                        <Text style={styles.logMessage}>{log.message}</Text>

                        {log.product && (
                            <View style={styles.productReference}>
                                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.textDim, marginLeft: 6 }} />
                                <Text style={styles.productText}>
                                    {typeof log.product === 'object' && log.product !== null
                                        ? (log.product.productName || log.product.name || 'منتج')
                                        : log.product}
                                </Text>
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Minimalist Collapsible Header */}
            <TouchableOpacity 
                activeOpacity={0.6} 
                onPress={toggleExpand} 
                style={styles.headerToggle}
            >
                <View style={styles.headerLeft}>
                    <MaterialCommunityIcons name="auto-fix" size={16} color={COLORS.accentGreen} style={{ marginLeft: 6 }} />
                    <Text style={styles.titleText}>
                        {t('routine_log_title', language) || 'ملاحظات الذكاء الاصطناعي'}
                    </Text>
                    <Text style={styles.countText}>({totalLogs})</Text>
                </View>

                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Feather name="chevron-down" size={16} color={COLORS.textDim} />
                </Animated.View>
            </TouchableOpacity>

            {/* Hidden initial layout pass to accurately measure content height */}
            {contentHeight === 0 && (
                <View 
                    style={styles.hiddenMeasurement} 
                    onLayout={(e) => {
                        const h = e.nativeEvent.layout.height;
                        if (h > 0) setContentHeight(h);
                    }}
                >
                    <LogsContent />
                </View>
            )}

            {/* Smooth animated accordion */}
            <Animated.View 
                style={{ 
                    height: animatedHeight, 
                    opacity: animatedOpacity, 
                    overflow: 'hidden' 
                }}
            >
                <LogsContent />
            </Animated.View>
        </View>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    container: { 
        backgroundColor: 'transparent',
        marginBottom: 10,
        paddingHorizontal: 8,
    },
    
    // --- Tiny Inline Header ---
    headerToggle: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingVertical: 8,
        opacity: 0.85,
    },
    headerLeft: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center' 
    },
    titleText: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 13, 
        color: COLORS.textPrimary,
        textAlign: 'right',
    },
    countText: {
        fontFamily: 'Tajawal-Regular', 
        fontSize: 12, 
        color: COLORS.textDim,
        marginRight: 6,
    },
    
    // Hidden measurement helper
    hiddenMeasurement: {
        position: 'absolute',
        opacity: 0,
        left: 0,
        right: 0,
        zIndex: -10,
    },
    
    // --- Typography-driven Logs (No Boxes) ---
    logsContainer: {
        paddingTop: 10,
        paddingRight: 5,
        paddingBottom: 15,
    },
    logItem: { 
        marginBottom: 22, 
        paddingRight: 14, 
        borderRightWidth: 1.5,
    },
    logHeader: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        marginBottom: 6 
    },
    logType: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 12,
    },
    logMessage: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 13, 
        color: COLORS.textSecondary, 
        textAlign: 'right', 
        lineHeight: 22,
    },
    productReference: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        marginTop: 8,
        opacity: 0.7,
    },
    productText: { 
        fontFamily: 'Tajawal-Medium', 
        fontSize: 11, 
        color: COLORS.textPrimary,
    },
});