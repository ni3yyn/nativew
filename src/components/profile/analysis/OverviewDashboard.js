import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { ContentCard, ChartRing } from './AnalysisShared';
import { useTheme } from '../../../context/ThemeContext';
import { t } from '../../../i18n';
import { useCurrentLanguage } from '../../../hooks/useCurrentLanguage';
import { useRTL } from '../../../hooks/useRTL';

// Fixed RoutineCard with useTheme
const RoutineCard = ({ analysisData }) => {
    const { colors: COLORS } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL, flexDirection } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    
    return (
        <ContentCard style={{flex: 1}} animated={false}>
            <View style={styles.analysisCardHeader}>
                <View style={{flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 4}}>
                    <Feather name="sun" size={14} color={COLORS.warning} />
                    <Text style={{color: COLORS.textSecondary}}>/</Text>
                    <Feather name="moon" size={14} color={'#a78bfa'} />
                </View>
                <Text style={[styles.analysisCardTitle, { color: COLORS.textSecondary }]}>{t('overview_title', language)}</Text>
            </View>
            <View style={styles.routineOverviewGrid}>
                <View style={styles.routineColumn}>
                    <View style={styles.colHeader}>
                        <Text style={[styles.routineColumnTitle, { color: COLORS.textPrimary }]}>{t('overview_morning', language)}</Text>
                        {(analysisData?.amRoutine?.conflicts || 0) > 0 && (
                            <View style={[styles.conflictBadge, { backgroundColor: COLORS.danger + '20' }]}>
                                <Text style={[styles.conflictText, { color: COLORS.danger }]}>{analysisData.amRoutine.conflicts} !</Text>
                            </View>
                        )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6}}>
                        {analysisData?.amRoutine?.products?.length > 0 ? (
                            analysisData.amRoutine.products.map(p => (
                                <Text key={p.id} style={[styles.routineProductPill, { backgroundColor: COLORS.background, color: COLORS.textSecondary }]}>
                                    {p.productName}
                                </Text>
                            ))
                        ) : ( 
                            <Text style={[styles.routineEmptyText, { color: COLORS.textDim }]}>{t('overview_empty', language)}</Text>
                        )}
                    </ScrollView>
                </View>
                <View style={[styles.routineDivider, { backgroundColor: COLORS.border }]} />
                <View style={styles.routineColumn}>
                    <View style={styles.colHeader}>
                        <Text style={[styles.routineColumnTitle, { color: COLORS.textPrimary }]}>{t('overview_evening', language)}</Text>
                        {(analysisData?.pmRoutine?.conflicts || 0) > 0 && (
                            <View style={[styles.conflictBadge, { backgroundColor: COLORS.danger + '20' }]}>
                                <Text style={[styles.conflictText, { color: COLORS.danger }]}>{analysisData.pmRoutine.conflicts} !</Text>
                            </View>
                        )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6}}>
                        {analysisData?.pmRoutine?.products?.length > 0 ? (
                            analysisData.pmRoutine.products.map(p => (
                                <Text key={p.id} style={[styles.routineProductPill, { backgroundColor: COLORS.background, color: COLORS.textSecondary }]}>
                                    {p.productName}
                                </Text>
                            ))
                        ) : ( 
                            <Text style={[styles.routineEmptyText, { color: COLORS.textDim }]}>{t('overview_empty', language)}</Text>
                        )}
                    </ScrollView>
                </View>
            </View>
        </ContentCard>
    );
};

// Fixed SunProtectionCard with useTheme
const SunProtectionCard = ({ analysisData }) => {
    const { colors: COLORS } = useTheme();
    const language = useCurrentLanguage();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    
    return (
        <ContentCard style={{flex: 1}} animated={false}>
            <View style={styles.analysisCardHeader}>
                <FontAwesome5 name="shield-alt" size={14} color={COLORS.textSecondary} />
                <Text style={[styles.analysisCardTitle, { color: COLORS.textSecondary }]}>{t('overview_sun_protection', language)}</Text>
            </View>
            <View style={styles.sunProtectionContainer}>
                <ChartRing 
                    percentage={analysisData?.sunProtectionGrade?.score || 0} 
                    color={(analysisData?.sunProtectionGrade?.score || 0) > 50 ? COLORS.gold : COLORS.danger}
                    radius={35}
                    strokeWidth={6}
                />
                <View style={{flex: 1, ...(isRTL ? { marginRight: 15 } : { marginLeft: 15 }), justifyContent: 'center'}}>
                    {(analysisData?.sunProtectionGrade?.notes || []).length > 0 ? (
                        analysisData.sunProtectionGrade.notes.map((note, i) => (
                            <Text key={i} style={[styles.sunProtectionNote, { color: COLORS.textSecondary }]}>{note}</Text>
                        ))
                    ) : (
                        <Text style={[styles.sunProtectionNote, { color: COLORS.textSecondary }]}>{t('overview_not_enough_data', language)}</Text>
                    )}
                </View>
            </View>
        </ContentCard>
    );
};

// Fixed OverviewDashboard with useTheme
export const OverviewDashboard = ({ analysisData }) => {
    const { colors: COLORS } = useTheme();
    const { isRTL } = useRTL();
    const styles = useMemo(() => createStyles(COLORS, isRTL), [COLORS, isRTL]);
    
    return (
        <View style={styles.overviewContainer}>
            <View style={styles.overviewCard}>
                <RoutineCard analysisData={analysisData} />
            </View>
            <View style={styles.overviewCard}>
                <SunProtectionCard analysisData={analysisData} />
            </View>
        </View>
    );
};

// Updated styles
const createStyles = (COLORS, isRTL) => StyleSheet.create({
    overviewContainer: { 
        flexDirection: isRTL ? 'row-reverse' : 'row', 
        justifyContent: 'space-between', 
        gap: 12 
    },
    overviewCard: { 
        flex: 1 
    },
    analysisCardHeader: { 
        flexDirection: isRTL ? 'row-reverse' : 'row', 
        alignItems: 'center', 
        gap: 10, 
        marginBottom: 15, 
        opacity: 0.8 
    },
    analysisCardTitle: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 14 
    },
    routineOverviewGrid: { 
        gap: 12 
    },
    routineColumn: { 
        gap: 8 
    },
    colHeader: { 
        flexDirection: isRTL ? 'row-reverse' : 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 5 
    },
    routineColumnTitle: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 12, 
        textAlign: isRTL ? 'right' : 'left' 
    },
    conflictBadge: { 
        paddingHorizontal: 6, 
        borderRadius: 4 
    },
    conflictText: { 
        fontSize: 10, 
        fontFamily: 'Tajawal-Bold' 
    },
    routineProductPill: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 10, 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 8, 
        overflow: 'hidden' 
    },
    routineEmptyText: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 10 
    },
    routineDivider: { 
        height: 1 
    },
    sunProtectionContainer: { 
        flexDirection: isRTL ? 'row-reverse' : 'row', 
        alignItems: 'center', 
        paddingVertical: 5, 
        flex: 1, 
        justifyContent: 'center' 
    },
    sunProtectionNote: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 11, 
        textAlign: isRTL ? 'right' : 'left', 
        lineHeight: 16 
    },
});
