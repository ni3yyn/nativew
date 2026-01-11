import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Define the theme locally or ensure your AnalysisShared.js matches this
const COLORS = {
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
  info: '#3b82f6', // Added for generic info logs
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const RoutineLogViewer = ({ logs }) => {
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
                        <View style={[styles.badge, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
                            <Text style={[styles.badgeText, { color: COLORS.danger }]}>{errorCount} استبعاد</Text>
                        </View>
                    )}
                    {warningCount > 0 && (
                        <View style={[styles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: 'rgba(245, 158, 11, 0.4)' }]}>
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
            {/* FIX IS HERE: Check if it's an object first */}
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

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.card, // Dark Green Card
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
        backgroundColor: COLORS.card, // Seamless header
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
        backgroundColor: 'rgba(90, 156, 132, 0.15)', // Subtle accent bg
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: COLORS.textPrimary, // Near White
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
        borderWidth: 1, // Added border for better visibility on dark
    },
    badgeText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 11,
    },
    logList: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: 'rgba(0,0,0,0.1)', // Slightly darker for inner content
    },
    logItem: {
        marginBottom: 16,
        paddingRight: 12,
        borderRightWidth: 3, // Arabic layout prefers right border
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
        color: COLORS.textSecondary, // Muted Green-Gray
        textAlign: 'right',
        lineHeight: 22,
    },
    productTag: {
        alignSelf: 'flex-start', // Left align in Arabic context looks better for tags
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: COLORS.background, // Deep Forest Green (Recessed look)
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