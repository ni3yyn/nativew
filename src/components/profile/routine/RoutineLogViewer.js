import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';

const FALLBACK_COLORS = {
    background: '#1A2D27',
    card: '#253D34',
    border: 'rgba(90, 156, 132, 0.25)',
    textDim: '#6B7C76',
    accentGreen: '#5A9C84',
    textPrimary: '#F1F3F2',
    textSecondary: '#A3B1AC',
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#22c55e',
    info: '#3b82f6',
};

export const RoutineLogViewer = ({ logs }) => {
    const { colors } = useTheme();
    const COLORS = colors || FALLBACK_COLORS;
    const styles = useMemo(() => createStyles(COLORS), [COLORS]);
    const [expanded, setExpanded] = useState(false);

    if (!logs || logs.length === 0) return null;

    const displayLogs = logs;

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'error': return 'close-circle-outline';
            case 'warning': return 'alert-circle-outline';
            case 'success': return 'check-circle-outline';
            default: return 'information-outline';
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'error': return COLORS.danger;
            case 'warning': return COLORS.warning;
            case 'success': return COLORS.success;
            default: return COLORS.info;
        }
    };

    const errorCount = logs.filter(l => l.type === 'error').length;
    const warningCount = logs.filter(l => l.type === 'warning').length;

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={toggleExpand} activeOpacity={0.8} style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.iconBox}>
                        <MaterialCommunityIcons name="clipboard-text-search-outline" size={22} color={COLORS.accentGreen} />
                    </View>
                    <Text style={styles.title}>تقرير روتين وثيق</Text>
                </View>

                <View style={styles.headerRight}>
                    {errorCount > 0 && (
                        <View style={[styles.badge, { backgroundColor: COLORS.danger + '33', borderColor: COLORS.danger + '66' }]}>
                            <Text style={[styles.badgeText, { color: COLORS.danger }]}>{errorCount} استبعاد</Text>
                        </View>
                    )}
                    {warningCount > 0 && (
                        <View style={[styles.badge, { backgroundColor: COLORS.warning + '33', borderColor: COLORS.warning + '66' }]}>
                            <Text style={[styles.badgeText, { color: COLORS.warning }]}>{warningCount} تنبيه</Text>
                        </View>
                    )}
                    <MaterialCommunityIcons
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={24}
                        color={COLORS.textSecondary}
                    />
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.logList}>
                    {displayLogs.map((log, index) => (
                        <View key={index} style={[styles.logItem, { borderRightColor: getColor(log.type) }]}>
                            <View style={styles.logHeader}>
                                <Text style={[styles.logType, { color: getColor(log.type) }]}>
                                    {log.type === 'error' ? 'استبعاد ⛔' :
                                        log.type === 'warning' ? 'تعديل ⚠️' :
                                            log.type === 'success' ? 'اعتماد ✅' : 'ملاحظة ℹ️'}
                                </Text>
                            </View>

                            <Text style={styles.logMessage}>
                                {log.message}
                            </Text>

                            {log.product && (
                                <View style={styles.productTag}>
                                    <MaterialCommunityIcons name="flask-outline" size={12} color={COLORS.textDim} style={{ marginLeft: 4 }} />
                                    <Text style={styles.productText}>
                                        {typeof log.product === 'object' && log.product !== null
                                            ? log.product.productName
                                            : log.product}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>تم البناء بواسطة الخوارزمية الطبية v2.0</Text>
                    </View>
                </View>
            )}
        </View>
    );
};

const createStyles = (COLORS) => StyleSheet.create({
    container: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: COLORS.card,
    },
    headerLeft: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.accentGreen + '26',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    headerRight: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    badgeText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
    },
    logList: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    logItem: {
        marginBottom: 16,
        paddingRight: 12,
        borderRightWidth: 3,
        paddingVertical: 2,
    },
    logHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    logType: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 13,
    },
    logMessage: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'right',
        lineHeight: 22,
    },
    productTag: {
        alignSelf: 'flex-start',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginTop: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    productText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 12,
        color: COLORS.textDim,
    },
    footer: {
        marginTop: 10,
        alignItems: 'center',
        opacity: 0.6,
    },
    footerText: {
        fontFamily: 'Tajawal-Regular',
        fontSize: 10,
        color: COLORS.textDim,
    }
});