import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { ContentCard, ChartRing } from './AnalysisShared';
import { useTheme } from '../../../context/ThemeContext';

// Fixed RoutineCard with useTheme
const RoutineCard = ({ analysisData }) => {
    const { colors } = useTheme();
    
    return (
        <ContentCard style={{flex: 1}} animated={false}>
            <View style={styles.analysisCardHeader}>
                <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4}}>
                    <Feather name="sun" size={14} color={colors.warning} />
                    <Text style={{color: colors.textSecondary}}>/</Text>
                    <Feather name="moon" size={14} color={'#a78bfa'} />
                </View>
                <Text style={[styles.analysisCardTitle, { color: colors.textSecondary }]}>نظرة عامة</Text>
            </View>
            <View style={styles.routineOverviewGrid}>
                <View style={styles.routineColumn}>
                    <View style={styles.colHeader}>
                        <Text style={[styles.routineColumnTitle, { color: colors.textPrimary }]}>الصباح</Text>
                        {(analysisData?.amRoutine?.conflicts || 0) > 0 && (
                            <View style={[styles.conflictBadge, { backgroundColor: colors.danger + '20' }]}>
                                <Text style={[styles.conflictText, { color: colors.danger }]}>{analysisData.amRoutine.conflicts} !</Text>
                            </View>
                        )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row-reverse', gap: 6}}>
                        {analysisData?.amRoutine?.products?.length > 0 ? (
                            analysisData.amRoutine.products.map(p => (
                                <Text key={p.id} style={[styles.routineProductPill, { backgroundColor: colors.background, color: colors.textSecondary }]}>
                                    {p.productName}
                                </Text>
                            ))
                        ) : ( 
                            <Text style={[styles.routineEmptyText, { color: colors.textDim }]}>فارغ</Text> 
                        )}
                    </ScrollView>
                </View>
                <View style={[styles.routineDivider, { backgroundColor: colors.border }]} />
                <View style={styles.routineColumn}>
                    <View style={styles.colHeader}>
                        <Text style={[styles.routineColumnTitle, { color: colors.textPrimary }]}>المساء</Text>
                        {(analysisData?.pmRoutine?.conflicts || 0) > 0 && (
                            <View style={[styles.conflictBadge, { backgroundColor: colors.danger + '20' }]}>
                                <Text style={[styles.conflictText, { color: colors.danger }]}>{analysisData.pmRoutine.conflicts} !</Text>
                            </View>
                        )}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row-reverse', gap: 6}}>
                        {analysisData?.pmRoutine?.products?.length > 0 ? (
                            analysisData.pmRoutine.products.map(p => (
                                <Text key={p.id} style={[styles.routineProductPill, { backgroundColor: colors.background, color: colors.textSecondary }]}>
                                    {p.productName}
                                </Text>
                            ))
                        ) : ( 
                            <Text style={[styles.routineEmptyText, { color: colors.textDim }]}>فارغ</Text> 
                        )}
                    </ScrollView>
                </View>
            </View>
        </ContentCard>
    );
};

// Fixed SunProtectionCard with useTheme
const SunProtectionCard = ({ analysisData }) => {
    const { colors } = useTheme();
    
    return (
        <ContentCard style={{flex: 1}} animated={false}>
            <View style={styles.analysisCardHeader}>
                <FontAwesome5 name="shield-alt" size={14} color={colors.textSecondary} />
                <Text style={[styles.analysisCardTitle, { color: colors.textSecondary }]}>حماية من الشمس</Text>
            </View>
            <View style={styles.sunProtectionContainer}>
                <ChartRing 
                    percentage={analysisData?.sunProtectionGrade?.score || 0} 
                    color={(analysisData?.sunProtectionGrade?.score || 0) > 50 ? colors.gold : colors.danger}
                    radius={35}
                    strokeWidth={6}
                />
                <View style={{flex: 1, marginRight: 15, justifyContent: 'center'}}>
                    {(analysisData?.sunProtectionGrade?.notes || []).length > 0 ? (
                        analysisData.sunProtectionGrade.notes.map((note, i) => (
                            <Text key={i} style={[styles.sunProtectionNote, { color: colors.textSecondary }]}>{note}</Text>
                        ))
                    ) : (
                        <Text style={[styles.sunProtectionNote, { color: colors.textSecondary }]}>لا توجد بيانات كافية</Text>
                    )}
                </View>
            </View>
        </ContentCard>
    );
};

// Fixed OverviewDashboard with useTheme
export const OverviewDashboard = ({ analysisData }) => {
    const { colors } = useTheme();
    
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

// Updated styles - remove all COLORS references
const styles = StyleSheet.create({
    overviewContainer: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        gap: 12 
    },
    overviewCard: { 
        flex: 1 
    },
    analysisCardHeader: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 10, 
        marginBottom: 15, 
        opacity: 0.8 
    },
    analysisCardTitle: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 14 
        // color moved to component
    },
    routineOverviewGrid: { 
        gap: 12 
    },
    routineColumn: { 
        gap: 8 
    },
    colHeader: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 5 
    },
    routineColumnTitle: { 
        fontFamily: 'Tajawal-Bold', 
        fontSize: 12, 
        textAlign: 'right' 
        // color moved to component
    },
    conflictBadge: { 
        paddingHorizontal: 6, 
        borderRadius: 4 
        // backgroundColor moved to component
    },
    conflictText: { 
        fontSize: 10, 
        fontFamily: 'Tajawal-Bold' 
        // color moved to component
    },
    routineProductPill: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 10, 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 8, 
        overflow: 'hidden' 
        // backgroundColor and color moved to component
    },
    routineEmptyText: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 10 
        // color moved to component
    },
    routineDivider: { 
        height: 1 
        // backgroundColor moved to component
    },
    sunProtectionContainer: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        paddingVertical: 5, 
        flex: 1, 
        justifyContent: 'center' 
    },
    sunProtectionNote: { 
        fontFamily: 'Tajawal-Regular', 
        fontSize: 11, 
        textAlign: 'right', 
        lineHeight: 16 
        // color moved to component
    },
});