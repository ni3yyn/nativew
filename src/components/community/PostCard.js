import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import WathiqScoreBadge from '../common/WathiqScoreBadge';
import { formatRelativeTime } from '../../utils/formatters';
// 🟢 IMPORT: Match Calculator
import { calculateBioMatch } from '../../utils/matchCalculator';

// --- SUB-COMPONENT: JOURNEY PRODUCTS ---
const JourneyProductsList = ({ products, onViewProduct }) => {
    if (!products || products.length === 0) return null;
    return (
        <View style={{marginTop: 15}}>
            <Text style={styles.sectionLabel}>المنتجات المستخدمة:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight: 5}}>
                {products.map((p, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={styles.journeyProductCard}
                        onPress={() => onViewProduct(p)}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.scoreDot, {backgroundColor: (p.score || 0) >= 80 ? COLORS.accentGreen : COLORS.gold}]} />
                        
                        <View style={{flex: 1}}>
                            <Text style={styles.jpName} numberOfLines={2}>{p.name}</Text>
                            <Text style={styles.jpPrice}>
                                {p.price ? `${p.price} دج` : 'السعر غير محدد'}
                            </Text>
                        </View>
                        <FontAwesome5 name="plus-circle" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

// --- SUB-COMPONENT: JOURNEY TIMELINE ---
const JourneyTimeline = ({ milestones, onImagePress }) => {
    if (!milestones || milestones.length === 0) return null;
    return (
        <View style={styles.timelineContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineScroll}>
                {milestones.map((step, index) => (
                    <View key={index} style={styles.timelineStep}>
                        <View style={styles.timelineIndicator}>
                            {index < milestones.length - 1 && <View style={styles.connectingLine} />}
                            <View style={styles.dot} />
                        </View>
                        <TouchableOpacity style={styles.stepCard} onPress={() => onImagePress(step.image)}>
                            <Image source={{ uri: step.image }} style={styles.stepImage} />
                            <View style={styles.stepLabelBox}><Text style={styles.stepLabel} numberOfLines={1}>{step.label}</Text></View>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

// --- CONTENT RENDERERS ---

const ReviewContent = ({ post, onViewProduct, onImagePress }) => (
    <View>
        <Text style={styles.postContent}>{post.content}</Text>
        {post.taggedProduct && (
            <TouchableOpacity 
                onPress={() => onViewProduct({ ...post.taggedProduct, imageUrl: post.taggedProduct.imageUrl || post.imageUrl })} 
                activeOpacity={0.9} 
                style={styles.reviewCard}
            >
                <WathiqScoreBadge score={post.taggedProduct.score} />
                <View style={{flex: 1, marginRight: 15, justifyContent: 'center'}}>
                    <Text style={styles.taggedProductName}>{post.taggedProduct.name}</Text>
                    <View style={{flexDirection: 'row-reverse', alignItems: 'center', marginTop: 4}}>
                        <Text style={styles.tapToView}>اضغط للتحليل والحفظ</Text>
                        <FontAwesome5 name="chevron-left" size={10} color={COLORS.accentGreen} style={{marginRight: 4}} />
                    </View>
                </View>
                <View style={styles.productIconPlaceholder}>
                    <FontAwesome5 name="wine-bottle" size={20} color={COLORS.textSecondary} />
                </View>
            </TouchableOpacity>
        )}
        {post.imageUrl && (
            <TouchableOpacity onPress={() => onImagePress(post.imageUrl)}>
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            </TouchableOpacity>
        )}
    </View>
);

const JourneyContent = ({ post, onImagePress, onViewProduct }) => (
    <View>
        <Text style={styles.postContent}>{post.content}</Text>
        
        {post.duration && (
            <View style={styles.journeyMetaRow}>
                <View style={styles.journeyBadge}>
                    <FontAwesome5 name="clock" size={12} color={COLORS.gold} />
                    <Text style={styles.journeyBadgeText}>المدة: {post.duration}</Text>
                </View>
            </View>
        )}
        
        {post.milestones && post.milestones.length > 0 ? (
            <JourneyTimeline milestones={post.milestones} onImagePress={onImagePress} />
        ) : (
            <View style={styles.beforeAfterContainer}>
                <TouchableOpacity style={styles.baImageWrapper} onPress={() => post.beforeImage && onImagePress(post.beforeImage)}><Text style={styles.baLabel}>قبل</Text><Image source={{ uri: post.beforeImage }} style={styles.baImage} /></TouchableOpacity>
                <View style={styles.baDivider}><FontAwesome5 name="arrow-left" size={14} color={COLORS.textSecondary} /></View>
                <TouchableOpacity style={styles.baImageWrapper} onPress={() => post.afterImage && onImagePress(post.afterImage)}><Text style={styles.baLabel}>بعد</Text><Image source={{ uri: post.afterImage }} style={styles.baImage} /></TouchableOpacity>
            </View>
        )}

        <JourneyProductsList products={post.journeyProducts} onViewProduct={onViewProduct} />
    </View>
);

const QAContent = ({ post, onImagePress }) => (
    <View>
        <Text style={styles.qaTitle}>{post.title}</Text>
        <Text style={styles.postContent}>{post.content}</Text>
        
        {post.imageUrl && (
            <TouchableOpacity onPress={() => onImagePress(post.imageUrl)} style={{marginTop: 10}}>
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
            </TouchableOpacity>
        )}
    </View>
);

const RoutineProductPill = ({ product, onPress }) => (
    <TouchableOpacity style={styles.rpCard} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.rpImageContainer}>
            {product.image ? (
                <Image source={{ uri: product.image }} style={styles.rpImage} />
            ) : (
                <FontAwesome5 name={product.type === 'sunscreen' ? 'sun' : 'wine-bottle'} size={16} color={COLORS.textDim} />
            )}
        </View>
        <View style={{flex: 1, gap: 2}}>
             <Text style={styles.rpName} numberOfLines={1}>{product.name}</Text>
             {product.score > 0 && (
                 <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4}}>
                     <View style={[styles.rpScoreDot, { backgroundColor: product.score >= 80 ? COLORS.accentGreen : COLORS.gold }]} />
                     <Text style={styles.rpScoreText}>{product.score}%</Text>
                 </View>
             )}
        </View>
    </TouchableOpacity>
);

const RoutineRateContent = ({ post, onViewProduct }) => {
    const rawAm = post.routineSnapshot?.am;
    const rawPm = post.routineSnapshot?.pm;
    const amRoutine = Array.isArray(rawAm) ? rawAm : [];
    const pmRoutine = Array.isArray(rawPm) ? rawPm : [];

    const handleProductPress = (p) => {
        if (!onViewProduct) return;
        onViewProduct({
            id: p.id,
            productName: p.name,
            productImage: p.image,
            imageUrl: p.image,
            marketingClaims: p.marketingClaims || [],
            analysisData: {
                oilGuardScore: p.score,
                product_type: p.type,
                detected_ingredients: p.ingredients || [],
                user_specific_alerts: []
            }
        });
    };

    const renderPeriod = (title, icon, color, stepsInput) => {
        const steps = Array.isArray(stepsInput) ? stepsInput : [];
        return (
            <View style={[styles.routinePeriodContainer, { borderColor: color + '30', backgroundColor: color + '05' }]}>
                <View style={styles.routinePeriodHeader}>
                    <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 6}}>
                        <Feather name={icon} size={14} color={color} />
                        <Text style={[styles.routinePeriodTitle, { color: color }]}>{title}</Text>
                    </View>
                    <Text style={styles.routineStepCount}>{steps.length} خطوات</Text>
                </View>
                {steps.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight: 10, gap: 8}}>
                        {steps.map((step, i) => (
                            <View key={i} style={{alignItems: 'center', flexDirection: 'row-reverse'}}>
                                {Array.isArray(step?.products) && step.products.map((p, j) => (
                                    <RoutineProductPill key={`${i}-${j}`} product={p} onPress={() => handleProductPress(p)} />
                                ))}
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <Text style={styles.routineEmptyText}>لا توجد منتجات مسجلة</Text>
                )}
            </View>
        );
    };

    return (
        <View>
            <Text style={styles.postContent}>{post.content}</Text>
            <View style={{ gap: 10, marginTop: 5 }}>
                {renderPeriod('الصباح', 'sun', COLORS.gold, amRoutine)}
                {renderPeriod('المساء', 'moon', '#818cf8', pmRoutine)}
            </View>
        </View>
    );
};

// --- MAIN CARD ---
const PostCard = React.memo(({ post, currentUser, onInteract, onDelete, onViewProduct, onOpenComments, onImagePress, onProfilePress }) => {
    const isLiked = post.likes && post.likes.includes(currentUser?.uid);

    // 🟢 1. CALCULATE BIO MATCH (Efficiently with useMemo)
    const matchData = useMemo(() => {
        if (currentUser?.settings && post.authorSettings) {
            return calculateBioMatch(currentUser.settings, post.authorSettings);
        }
        return null;
    }, [currentUser?.settings, post.authorSettings]);

    const getTypeConfig = () => {
        switch(post.type) {
            case 'review': return { icon: 'star', color: COLORS.accentGreen, label: 'تجربة' };
            case 'journey': return { icon: 'hourglass-half', color: COLORS.gold, label: 'رحلة' };
            case 'qa': return { icon: 'question-circle', color: COLORS.blue, label: 'سؤال' };
            case 'routine_rate': return { icon: 'clipboard-list', color: COLORS.purple, label: 'تقييم' };
            default: return { icon: 'pen', color: COLORS.textSecondary, label: 'عام' };
        }
    };
    const config = getTypeConfig();

    return (
        <View style={styles.cardBase}>
            <View style={styles.cardHeader}>
                <TouchableOpacity 
                    style={styles.userInfo} 
                    // 🟢 FIX: Passing Merged Data (ID + Settings + Name) for instant hydration
                    onPress={() => onProfilePress && onProfilePress(post.userId, {
                        ...post.authorSettings,
                        name: post.userName
                    })} 
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitial}>{post.userName?.charAt(0) || 'U'}</Text></View>
                    <View>
                        <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 6}}>
                            <Text style={styles.userName}>{post.userName}</Text>
                            {post.authorSettings?.skinType && <View style={styles.bioBadge}><Text style={styles.bioBadgeText}>{post.authorSettings.skinType}</Text></View>}
                        </View>
                        <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 6}}>
                            <Text style={[styles.timestamp, {color: config.color, fontFamily: 'Tajawal-Bold'}]}>{config.label}</Text>
                            <Text style={styles.timestamp}>
                                • {formatRelativeTime(post.createdAt)}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                {post.userId === currentUser?.uid && <TouchableOpacity onPress={() => onDelete(post.id)}><Ionicons name="trash-outline" size={18} color={COLORS.danger} /></TouchableOpacity>}
            </View>

            {/* 🟢 2. RENDER MATCH INDICATOR */}
            {matchData && matchData.score > 20 && (
                <View style={[styles.matchIndicator, { 
                    backgroundColor: matchData.color + '15', 
                    borderColor: matchData.color + '30' 
                }]}>
                    <FontAwesome5 name="check-double" size={10} color={matchData.color} />
                    <Text style={[styles.matchText, { color: matchData.color }]}>
                        {matchData.score}% • {matchData.label} 
                        {matchData.matches.length > 0 && ` (${matchData.matches.join(' + ')})`}
                    </Text>
                </View>
            )}

            <View style={{marginBottom: 10}}>
                {post.type === 'review' && <ReviewContent post={post} onViewProduct={onViewProduct} onImagePress={onImagePress} />}
                {post.type === 'journey' && <JourneyContent post={post} onImagePress={onImagePress} onViewProduct={onViewProduct} />}
                {post.type === 'qa' && <QAContent post={post} onImagePress={onImagePress} />}
                {post.type === 'routine_rate' && <RoutineRateContent post={post} onViewProduct={onViewProduct} />}
            </View>

            <View style={styles.cardFooter}>
                <TouchableOpacity style={[styles.actionButton, isLiked && {backgroundColor: COLORS.accentGreen + '15', borderColor: COLORS.accentGreen + '30'}]} onPress={() => onInteract(post.id, 'like')}>
                    <FontAwesome5 name={isLiked ? "heart" : "heart"} solid={isLiked} size={16} color={isLiked ? COLORS.danger : COLORS.textSecondary} />
                    <Text style={[styles.statText, isLiked && {color: COLORS.danger}]}>{post.likesCount || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => onOpenComments(post)}>
                    <FontAwesome5 name="comment-alt" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.actionText}>الردود</Text>
                    <Text style={styles.statText}>{post.commentsCount || 0}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    cardBase: { backgroundColor: COLORS.card, marginHorizontal: 15, marginBottom: 15, borderRadius: 20, padding: 15, borderWidth: 1, borderColor: COLORS.border, shadowColor: "#000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    userInfo: { flexDirection: 'row-reverse', gap: 10, alignItems: 'center' },
    avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    avatarInitial: { fontFamily: 'Tajawal-Bold', color: COLORS.accentGreen },
    userName: { fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, fontSize: 14, textAlign: 'right' },
    timestamp: { fontFamily: 'Tajawal-Regular', color: COLORS.textSecondary, fontSize: 11, textAlign: 'right' },
    postContent: { fontFamily: 'Tajawal-Regular', color: COLORS.textPrimary, fontSize: 14, textAlign: 'right', lineHeight: 22, marginBottom: 10 },
    cardFooter: { flexDirection: 'row-reverse', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, gap: 10 },
    actionButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
    actionText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textSecondary },
    statText: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.textDim },
    
    reviewCard: { flexDirection: 'row-reverse', backgroundColor: COLORS.background, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, alignItems: 'center' },
    productIconPlaceholder: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
    taggedProductName: { fontFamily: 'Tajawal-Bold', color: COLORS.textPrimary, fontSize: 14, textAlign: 'right', marginBottom: 2 },
    tapToView: { fontFamily: 'Tajawal-Regular', fontSize: 11, color: COLORS.accentGreen },
    
    bioBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    bioBadgeText: { color: COLORS.textSecondary, fontSize: 10, fontFamily: 'Tajawal-Regular' },
    
    // 🟢 MATCH STYLES
    matchIndicator: { flexDirection: 'row-reverse', gap: 6, backgroundColor: COLORS.accentGreen + '15', paddingHorizontal: 10, paddingVertical: 4, marginHorizontal: 0, marginTop: -5, marginBottom: 10, alignSelf: 'flex-end', borderRadius: 6, borderWidth: 1, borderColor: COLORS.accentGreen + '30' },
    matchText: { color: COLORS.accentGreen, fontSize: 10, fontFamily: 'Tajawal-Bold' },

    qaTitle: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.textPrimary, textAlign: 'right', marginBottom: 6 },
    
    journeyMetaRow: { flexDirection: 'row-reverse', marginBottom: 10 },
    journeyBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    journeyBadgeText: { color: COLORS.gold, fontSize: 12, fontFamily: 'Tajawal-Bold' },
    timelineContainer: { marginTop: 10, height: 180 },
    timelineScroll: { flexDirection: 'row-reverse', paddingHorizontal: 5, alignItems: 'center' },
    timelineStep: { alignItems: 'center', marginHorizontal: 5, width: 110 },
    timelineIndicator: { flexDirection: 'row-reverse', alignItems: 'center', width: '100%', height: 20, justifyContent: 'center', marginBottom: 5, position: 'relative' },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.gold, zIndex: 2 },
    connectingLine: { position: 'absolute', right: '50%', width: 120, height: 2, backgroundColor: 'rgba(245, 158, 11, 0.3)', zIndex: 1 },
    stepCard: { width: 110, height: 140, backgroundColor: COLORS.card, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
    stepImage: { width: '100%', height: 100, borderRadius: 12, backgroundColor: COLORS.background },
    stepLabelBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    stepLabel: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.textPrimary },
    
    sectionLabel: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, textAlign: 'right' },
    journeyProductCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10, marginRight: 10, width: 160, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
    jpName: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.textPrimary, textAlign: 'right' },
    jpPrice: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.gold, textAlign: 'right' },
    scoreDot: { width: 8, height: 8, borderRadius: 4 },

    beforeAfterContainer: { flexDirection: 'row', height: 120, marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
    baImageWrapper: { flex: 1, position: 'relative', backgroundColor: COLORS.card },
    baImage: { width: '100%', height: '100%' },
    baPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    baLabel: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: 4, borderRadius: 4, overflow: 'hidden', fontFamily: 'Tajawal-Bold', zIndex: 1 },
    baDivider: { width: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card },
    
    postImage: { width: '100%', height: 200, borderRadius: 12, marginTop: 10 },

    // --- ROUTINE STYLES ---
    routinePeriodContainer: { borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 4 },
    routinePeriodHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 },
    routinePeriodTitle: { fontFamily: 'Tajawal-Bold', fontSize: 12 },
    routineStepCount: { fontFamily: 'Tajawal-Regular', fontSize: 10, color: COLORS.textDim },
    rpCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 10, padding: 6, paddingRight: 8, width: 160, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 0, marginLeft: 8 },
    rpImageContainer: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginLeft: 8, overflow: 'hidden' },
    rpImage: { width: '100%', height: '100%' },
    rpName: { fontFamily: 'Tajawal-Bold', fontSize: 11, color: COLORS.textPrimary, textAlign: 'right' },
    rpScoreDot: { width: 6, height: 6, borderRadius: 3 },
    rpScoreText: { fontSize: 9, color: COLORS.textSecondary, fontFamily: 'Tajawal-Regular' },
    routineEmptyText: { textAlign: 'center', color: COLORS.textDim, fontSize: 11, fontStyle: 'italic', padding: 10 },
});

export default React.memo(PostCard);