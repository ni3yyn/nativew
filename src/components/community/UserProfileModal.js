import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, Modal, StyleSheet, ScrollView, 
  TouchableOpacity, ActivityIndicator, Dimensions, Animated, Easing 
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, collection, query, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { COLORS } from '../../constants/theme';
import WathiqScoreBadge from '../common/WathiqScoreBadge';
import { calculateBioMatch } from '../../utils/matchCalculator';
import * as Haptics from 'expo-haptics';

// --- DATA IMPORTS ---
import { 
    commonAllergies, 
    commonConditions, 
    basicSkinTypes, 
    basicScalpTypes 
} from '../../data/allergiesandconditions';

const GOALS_LIST = [
    { id: 'brightening', label: 'تفتيح' },
    { id: 'acne', label: 'علاج حب الشباب' },
    { id: 'anti_aging', label: 'مكافحة الشيخوخة' },
    { id: 'hydration', label: 'ترطيب' },
    { id: 'hair_growth', label: 'تطويل الشعر' },
    { id: 'pores', label: 'علاج المسام' },
    { id: 'oil_control', label: 'التحكم بالدهون' }
];

const { width } = Dimensions.get('window');

const UserProfileModal = ({ visible, onClose, targetUserId, currentUser, onProductSelect }) => {
    const [profile, setProfile] = useState(null);
    const [publicShelf, setPublicShelf] = useState([]);
    const [loading, setLoading] = useState(true);
    const [matchInfo, setMatchInfo] = useState({ score: 0, label: '', color: COLORS.textSecondary });
    
    // Animation Refs
    const slideAnim = useRef(new Animated.Value(50)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const isMe = currentUser?.uid === targetUserId;

    useEffect(() => {
        if (!visible || !targetUserId) return;
        
        // Reset State
        setProfile(null);
        setPublicShelf([]);
        setLoading(true);
        slideAnim.setValue(50);
        fadeAnim.setValue(0);

        const fetchData = async () => {
            try {
                // 1. Get User Profile (1 Read)
                const userDoc = await getDoc(doc(db, 'profiles', targetUserId));
                
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setProfile(data);
                    
                    // Calculate Match
                    if (currentUser?.settings) {
                        setMatchInfo(calculateBioMatch(currentUser.settings, data.settings));
                    }

                    // 2. Get Public Shelf (Max 1 Read via Query, or N reads depending on data structure)
                    // Optimization: We limit to 5 items to keep reads low.
                    const q = query(
                        collection(db, 'profiles', targetUserId, 'savedProducts'),
                        orderBy('createdAt', 'desc'),
                        limit(5)
                    );
                    const snapshot = await getDocs(q);
                    setPublicShelf(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
                    
                    // Run Entry Animation
                    Animated.parallel([
                        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8 }),
                        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true })
                    ]).start();
                }
            } catch (e) {
                console.error("Profile Fetch Error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [visible, targetUserId]);

    const getLabel = (id, list) => {
        const item = list.find(i => i.id === id);
        return item ? (item.label || item.name) : id; 
    };

    const handleProductPress = (item) => {
        // Allows saving product from another user's profile
        if (onProductSelect) {
            onClose(); // Close profile first
            // Pass necessary data for ActionSheet
            onProductSelect({
                ...item,
                // Ensure imageUrl is available if saved, otherwise it falls back to icon
                imageUrl: item.productImage 
            });
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.container}>
                
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>ملف العضو</Text>
                    <View style={{width: 40}} /> 
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.accentGreen} style={{marginTop: 50}} />
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                            
                            {/* 1. Identity Card */}
                            <LinearGradient colors={[COLORS.card, '#2C3E38']} style={styles.idCard}>
                                <View style={[styles.matchRing, !isMe && { borderColor: matchInfo.color }]}>
                                    <View style={styles.avatarLarge}>
                                        <Text style={styles.avatarText}>
                                            {profile?.settings?.name ? profile.settings.name.charAt(0).toUpperCase() : 'U'}
                                        </Text>
                                    </View>
                                    {!isMe && matchInfo.score > 0 && (
                                        <View style={[styles.matchBadge, { backgroundColor: matchInfo.color }]}>
                                            <Text style={styles.matchBadgeText}>{matchInfo.score}%</Text>
                                        </View>
                                    )}
                                </View>
                                
                                <Text style={styles.userName}>{profile?.settings?.name || 'مستخدم وثيق'}</Text>
                                
                                <Text style={[styles.matchLabel, { color: isMe ? COLORS.accentGreen : matchInfo.color }]}>
                                    {isMe ? 'هذا ملفك الشخصي' : matchInfo.label}
                                </Text>
                            </LinearGradient>

                            {/* 2. Bio Stats */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>السمات الحيوية</Text>
                                <View style={styles.statsGrid}>
                                    <View style={styles.statBox}>
                                        <FontAwesome5 name="user-alt" size={18} color={COLORS.gold} />
                                        <Text style={styles.statLabel}>البشرة</Text>
                                        <Text style={styles.statValue}>
                                            {getLabel(profile?.settings?.skinType, basicSkinTypes) || 'غير محدد'}
                                        </Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <FontAwesome5 name="cut" size={18} color={COLORS.blue} />
                                        <Text style={styles.statLabel}>الشعر</Text>
                                        <Text style={styles.statValue}>
                                            {getLabel(profile?.settings?.scalpType, basicScalpTypes) || 'غير محدد'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* 3. Detailed Tags */}
                            <View style={styles.tagsContainer}>
                                {profile?.settings?.goals?.length > 0 && (
                                    <View style={styles.tagGroup}>
                                        <View style={styles.tagHeaderRow}>
                                            <FontAwesome5 name="crosshairs" size={14} color={COLORS.accentGreen} />
                                            <Text style={styles.tagGroupTitle}>الأهداف:</Text>
                                        </View>
                                        <View style={styles.chipsRow}>
                                            {profile.settings.goals.map(g => (
                                                <View key={g} style={[styles.chip, { borderColor: COLORS.accentGreen, backgroundColor: COLORS.accentGreen + '10' }]}>
                                                    <Text style={[styles.chipText, { color: COLORS.accentGreen }]}>{getLabel(g, GOALS_LIST)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {profile?.settings?.conditions?.length > 0 && (
                                    <View style={styles.tagGroup}>
                                        <View style={styles.tagHeaderRow}>
                                            <FontAwesome5 name="notes-medical" size={14} color={COLORS.gold} />
                                            <Text style={styles.tagGroupTitle}>الحالات:</Text>
                                        </View>
                                        <View style={styles.chipsRow}>
                                            {profile.settings.conditions.map(c => (
                                                <View key={c} style={[styles.chip, { borderColor: COLORS.gold, backgroundColor: COLORS.gold + '10' }]}>
                                                    <Text style={[styles.chipText, { color: COLORS.gold }]}>{getLabel(c, commonConditions)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {profile?.settings?.allergies?.length > 0 && (
                                    <View style={styles.tagGroup}>
                                        <View style={styles.tagHeaderRow}>
                                            <FontAwesome5 name="exclamation-circle" size={14} color={COLORS.danger} />
                                            <Text style={styles.tagGroupTitle}>الحساسية:</Text>
                                        </View>
                                        <View style={styles.chipsRow}>
                                            {profile.settings.allergies.map(a => (
                                                <View key={a} style={[styles.chip, { borderColor: COLORS.danger, backgroundColor: COLORS.danger + '10' }]}>
                                                    <Text style={[styles.chipText, { color: COLORS.danger }]}>{getLabel(a, commonAllergies)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* 4. Interactive Public Shelf */}
                            <View style={styles.section}>
                                <View style={{flexDirection: 'row-reverse', justifyContent:'space-between', alignItems:'center', marginBottom: 15}}>
                                    <Text style={styles.sectionTitle}>مفضلات الرف</Text>
                                    <Text style={{color:COLORS.textDim, fontFamily:'Tajawal-Regular', fontSize:12}}>{publicShelf.length} منتجات</Text>
                                </View>
                                
                                {publicShelf.length > 0 ? (
                                    <View style={styles.shelfList}>
                                        {publicShelf.map(item => (
                                            <TouchableOpacity 
                                                key={item.id} 
                                                style={styles.shelfItem}
                                                onPress={() => handleProductPress(item)}
                                                activeOpacity={0.7}
                                            >
                                                <WathiqScoreBadge score={item.analysisData?.oilGuardScore || 0} />
                                                <View style={{flex: 1, marginRight: 15}}>
                                                    <Text style={styles.prodName} numberOfLines={1}>{item.productName}</Text>
                                                    <Text style={styles.prodVerdict}>
                                                        {item.analysisData?.finalVerdict || 'منتج'}
                                                    </Text>
                                                </View>
                                                <View style={styles.prodIconBox}>
                                                    <Feather name="chevron-left" size={20} color={COLORS.textDim} />
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.emptyShelfBox}>
                                        <Feather name="box" size={30} color={COLORS.textDim} style={{opacity: 0.5}} />
                                        <Text style={styles.emptyText}>لم يضف هذا العضو منتجات للرف العام بعد.</Text>
                                    </View>
                                )}
                            </View>

                        </Animated.View>
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    
    header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    headerTitle: { fontFamily: 'Tajawal-Bold', fontSize: 18, color: COLORS.textPrimary },
    closeBtn: { padding: 5 },
    scrollContent: { padding: 20, paddingBottom: 50 },
    
    idCard: { alignItems: 'center', padding: 25, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, marginBottom: 25 },
    matchRing: { padding: 4, borderWidth: 2, borderRadius: 60, position: 'relative', borderColor: 'transparent' },
    avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontFamily: 'Tajawal-ExtraBold', fontSize: 32, color: COLORS.accentGreen },
    matchBadge: { position: 'absolute', bottom: -12, alignSelf: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, elevation: 5 },
    matchBadgeText: { color: '#000', fontFamily: 'Tajawal-Bold', fontSize: 11 },
    
    userName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 22, color: COLORS.textPrimary, marginTop: 15 },
    matchLabel: { fontFamily: 'Tajawal-Regular', fontSize: 14, marginTop: 4 },

    section: { marginBottom: 30 },
    sectionTitle: { fontFamily: 'Tajawal-Bold', fontSize: 17, color: COLORS.textPrimary, textAlign: 'right' },
    
    statsGrid: { flexDirection: 'row-reverse', gap: 15, marginTop: 15 },
    statBox: { flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    statLabel: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
    statValue: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textPrimary, marginTop: 4 },

    tagsContainer: { marginBottom: 10 },
    tagGroup: { marginBottom: 20 },
    tagHeaderRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 10 },
    tagGroupTitle: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textSecondary },
    chipsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
    chipText: { fontFamily: 'Tajawal-Bold', fontSize: 12 },

    shelfList: { gap: 12 },
    shelfItem: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.card, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
    prodName: { fontFamily: 'Tajawal-Bold', fontSize: 14, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 2 },
    prodVerdict: { fontFamily: 'Tajawal-Regular', fontSize: 12, color: COLORS.textSecondary, textAlign: 'right' },
    prodIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
    
    emptyShelfBox: { alignItems: 'center', padding: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16 },
    emptyText: { fontFamily: 'Tajawal-Regular', color: COLORS.textDim, textAlign: 'center', marginTop: 10 },
});

export default UserProfileModal;