import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome5, Feather } from '@expo/vector-icons';
import { COLORS, ContentCard, ChartRing } from './AnalysisShared';

// Changed prop to analysisData
const RoutineCard = ({ analysisData }) => (
    <ContentCard style={{flex: 1}} animated={false}>
        <View style={styles.analysisCardHeader}>
           <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4}}>
                <Feather name="sun" size={14} color={COLORS.warning} />
                <Text style={{color: COLORS.textSecondary}}>/</Text>
                <Feather name="moon" size={14} color={'#a78bfa'} />
           </View>
           <Text style={styles.analysisCardTitle}>نظرة عامة</Text>
       </View>
       <View style={styles.routineOverviewGrid}>
           <View style={styles.routineColumn}>
               <View style={styles.colHeader}>
                   <Text style={styles.routineColumnTitle}>الصباح</Text>
                   {(analysisData?.amRoutine?.conflicts || 0) > 0 && (
                       <View style={styles.conflictBadge}>
                           <Text style={styles.conflictText}>{analysisData.amRoutine.conflicts} !</Text>
                       </View>
                   )}
               </View>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row-reverse', gap: 6}}>
               {analysisData?.amRoutine?.products?.length > 0 ? (
                   analysisData.amRoutine.products.map(p => <Text key={p.id} style={styles.routineProductPill}>{p.productName}</Text>)
               ) : ( <Text style={styles.routineEmptyText}>فارغ</Text> )}
               </ScrollView>
           </View>
            <View style={styles.routineDivider} />
            <View style={styles.routineColumn}>
               <View style={styles.colHeader}>
                   <Text style={styles.routineColumnTitle}>المساء</Text>
                   {(analysisData?.pmRoutine?.conflicts || 0) > 0 && (
                       <View style={styles.conflictBadge}>
                           <Text style={styles.conflictText}>{analysisData.pmRoutine.conflicts} !</Text>
                       </View>
                   )}
               </View>
               <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexDirection: 'row-reverse', gap: 6}}>
               {analysisData?.pmRoutine?.products?.length > 0 ? (
                   analysisData.pmRoutine.products.map(p => <Text key={p.id} style={styles.routineProductPill}>{p.productName}</Text>)
               ) : ( <Text style={styles.routineEmptyText}>فارغ</Text> )}
               </ScrollView>
           </View>
       </View>
    </ContentCard>
);

// Changed prop to analysisData
const SunProtectionCard = ({ analysisData }) => (
     <ContentCard style={{flex: 1}} animated={false}>
        <View style={styles.analysisCardHeader}>
           <FontAwesome5 name="shield-alt" size={14} color={COLORS.textSecondary} />
           <Text style={styles.analysisCardTitle}>حماية الشمس</Text>
       </View>
       <View style={styles.sunProtectionContainer}>
           <ChartRing 
               percentage={analysisData?.sunProtectionGrade?.score || 0} 
               color={(analysisData?.sunProtectionGrade?.score || 0) > 50 ? COLORS.gold : COLORS.danger}
               radius={35}
               strokeWidth={6}
           />
           <View style={{flex: 1, marginRight: 15, justifyContent: 'center'}}>
               {(analysisData?.sunProtectionGrade?.notes || []).length > 0 ? (
                   analysisData.sunProtectionGrade.notes.map((note, i) => (
                        <Text key={i} style={styles.sunProtectionNote}>{note}</Text>
                   ))
               ) : (
                   <Text style={styles.sunProtectionNote}>لا توجد بيانات كافية</Text>
               )}
           </View>
       </View>
    </ContentCard>
);

// Changed prop to analysisData
export const OverviewDashboard = ({ analysisData }) => (
    <View style={styles.overviewContainer}>
        <View style={styles.overviewCard}>
            <RoutineCard analysisData={analysisData} />
        </View>
        <View style={styles.overviewCard}>
            <SunProtectionCard analysisData={analysisData} />
        </View>
    </View>
);

const styles = StyleSheet.create({
    overviewContainer: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 12 },
    overviewCard: { flex: 1 },
    analysisCardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 15, opacity: 0.8 },
    analysisCardTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary },
    routineOverviewGrid: { gap: 12 },
    routineColumn: { gap: 8 },
    colHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    routineColumnTitle: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' },
    conflictBadge: { backgroundColor: COLORS.danger + '20', paddingHorizontal:6, borderRadius:4 },
    conflictText: { color: COLORS.danger, fontSize:10, fontFamily:'Tajawal-Bold' },
    routineProductPill: { backgroundColor: COLORS.background, color: COLORS.textSecondary, fontFamily: 'Tajawal-Regular', fontSize: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
    routineEmptyText: { color: COLORS.textDim, fontFamily: 'Tajawal-Regular', fontSize: 10 },
    routineDivider: { height: 1, backgroundColor: COLORS.border },
    sunProtectionContainer: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 5, flex: 1, justifyContent: 'center' },
    sunProtectionNote: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', lineHeight: 16 },
});