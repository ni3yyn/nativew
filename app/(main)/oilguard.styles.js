import { StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

// --- EXPORTED CONSTANTS (Used in Logic) ---
export { width, height };

export const CARD_WIDTH = width * 0.85;
export const SEPARATOR_WIDTH = 15;
export const ITEM_WIDTH = CARD_WIDTH + SEPARATOR_WIDTH;
export const DOT_SIZE = 8;
export const PAGINATION_DOTS = 4;
export const DOT_SPACING = 8; 

export const COLORS = {
  background: '#1A2D27', 
  card: '#253D34',      
  border: 'rgba(90, 156, 132, 0.25)', 

  accentGreen: '#5A9C84', 
  accentGlow: 'rgba(90, 156, 132, 0.4)', 
  primary: '#5A9C84', // Mapped for compatibility
  primaryGlow: 'rgba(90, 156, 132, 0.4)', // Mapped
  darkGreen: '#1A2D27', // Mapped
  textDim: '#A3B1AC', // Mapped

  textPrimary: '#F1F3F2',   
  textSecondary: '#A3B1AC', 
  textOnAccent: '#1A2D27',  
  
  danger: '#ef4444', 
  warning: '#f59e0b', 
  info: '#3b82f6', 
  success: '#22c55e',
  gold: '#fbbf24'
};

// --- PASTE YOUR STYLES BELOW ---
export const styles = StyleSheet.create({
    // --- Core Layout & Background ---
    container: { 
      flex: 1, 
      backgroundColor: COLORS.background, 
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
      paddingBottom: 10,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },
    headerTitle: { 
      fontFamily: 'Tajawal-ExtraBold', 
      fontSize: 22, 
      color: COLORS.textPrimary 
    },
    backBtn: { 
      width: 40, 
      height: 40, 
      borderRadius: 20, 
      backgroundColor: 'rgba(255,255,255,0.1)', 
      justifyContent: 'center', 
      alignItems: 'center'
    },
    scrollContent: { 
      flexGrow: 1, 
      paddingHorizontal: 20, 
      paddingBottom: 40,
      paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight : 40) + 70,
      justifyContent: 'center'
    },
    contentContainer: { 
      width: '100%', 
      alignItems: 'center', 
      paddingVertical: 20 
    },
    cardBase: {
      backgroundColor: COLORS.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
      width: '100%',
    },
  
    // --- Step 0: Input Step ---
    heroSection: { 
      alignItems: 'center', 
      marginBottom: 30, 
      paddingHorizontal: 20 
    },
    heroIcon: { 
      width: 100, 
      height: 100, 
      borderRadius: 50, 
      backgroundColor: COLORS.card, 
      justifyContent: 'center', 
      alignItems: 'center', 
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    heroTitle: { 
      fontFamily: 'Tajawal-ExtraBold', 
      fontSize: 28, 
      color: COLORS.textPrimary, 
      textAlign: 'center', 
      marginBottom: 8 
    },
    heroSubContainer: {
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    heroSub: { 
      fontFamily: 'Tajawal-Regular', 
      fontSize: 15, 
      color: COLORS.textSecondary, 
      textAlign: 'center', 
      lineHeight: 22,
      minHeight: 22,
    },
    floatingBtnContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-start',
      width: '100%',
      marginTop: 60,
      marginBottom: 20,
    },
    glowEffect: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    floatingBtnCore: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.card,
    },
    floatingBtnLabel: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 16,
        color: COLORS.textPrimary,
        marginTop: 15,
    },
    backLinkText: { 
      color: COLORS.textSecondary, 
      fontFamily: 'Tajawal-Regular', 
      fontSize: 14 
    },
  
    // --- Step 1: Review Step ---
    sectionTitle: { 
      fontFamily: 'Tajawal-Bold', 
      fontSize: 18, 
      color: COLORS.textPrimary, 
      textAlign: 'right', 
      marginBottom: 15,
      width: '100%',
      paddingHorizontal: 10,
    },
    aiPredictionCard: { 
      flexDirection: 'row-reverse', 
      alignItems: 'center', 
      gap: 20,
      backgroundColor: COLORS.card, 
      padding: 20,
      borderRadius: 18,
      marginHorizontal: 5,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    aiPredictionIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(96, 165, 140, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiPredictionLabel: { 
      fontFamily: 'Tajawal-Regular', 
      fontSize: 12, 
      color: COLORS.textSecondary,
      textAlign: 'right',
    },
    aiPredictionValue: { 
      fontFamily: 'Tajawal-Bold', 
      fontSize: 16, 
      color: COLORS.accentGreen,
      textAlign: 'right',
    },
    changeTypeButton: { 
      marginTop: 15, 
      alignSelf: 'center', 
      padding: 10,
    },
    changeTypeText: { 
      color: COLORS.accentGreen, 
      fontSize: 14,
      fontFamily: 'Tajawal-Bold',
    },
    typeGrid: { 
      flexDirection: 'row-reverse', 
      flexWrap: 'wrap', 
      gap: 12, 
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    typeChip: { 
      paddingHorizontal: 16, 
      paddingVertical: 12, 
      borderRadius: 25, 
      flexDirection: 'row-reverse', 
      alignItems: 'center', 
      gap: 10,
      backgroundColor: COLORS.card,
    },
    typeText: { 
      fontSize: 13, 
      fontFamily: 'Tajawal-Bold' 
    },
  
    // --- Step 2: Claims Step ---
    fixedHeaderBlock: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    headerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: COLORS.background,
    },
    expandedHeader: {
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
    },
    collapsedHeader: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        height: Platform.OS === 'android' ? 20 : 90,
        justifyContent: 'flex-end',
    },
    headerContent: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingBottom: 4,
    },
    collapsedHeaderText: {
        fontFamily: 'Tajawal-Bold',
        fontSize: 18,
        color: COLORS.textPrimary,
    },
    claimsSearchContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        paddingHorizontal: 15,
        justifyContent: 'center',
    },
    searchInputWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 15,
    },
    searchIcon: {
        marginLeft: 10,
    },
    claimsSearchInput: {
        flex: 1,
        height: 50,
        color: COLORS.textPrimary,
        fontFamily: 'Tajawal-Regular',
        fontSize: 15,
        textAlign: 'right',
    },
    claimItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.card,
        gap: 15,
    },
    claimItemActive: {
        borderColor: COLORS.accentGreen,
        backgroundColor: 'rgba(96, 165, 140, 0.1)',
    },
    claimItemText: {
        fontFamily: 'Tajawal-Bold', 
        fontSize: 16, 
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'right',
    },
    checkboxBase: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: COLORS.accentGreen,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(13, 27, 30, 0.5)',
    },
    checkboxFill: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: COLORS.accentGreen,
        borderRadius: 14,
    },
    fabContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'android' ? 70 : 90,
        alignSelf: 'center',
        zIndex: 20,
    },
    fab: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.accentGreen,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: COLORS.accentGlow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
    },
    heroFab: {
      position: 'absolute',
      zIndex: 1000,
      backgroundColor: COLORS.accentGreen,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pulsingRing: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 32,
      borderWidth: 3,
    },
  
    // --- Step 3: Loading ---
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 30,
    },
    flaskAnimationContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 200,
    },
    loadingText: {
      color: COLORS.textPrimary,
      fontFamily: 'Tajawal-Bold',
      fontSize: 20,
      textAlign: 'center',
    },
  
    // --- Step 4: Results ---
    resultsSectionTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 20,
      color: COLORS.textPrimary,
      textAlign: 'right',
      marginBottom: 15,
      paddingHorizontal: 5,
    },
    personalMatchCard: { 
      padding: 15, 
      borderWidth: 1,
      borderRadius: 20,
      backgroundColor: COLORS.card,
    },
    personalMatch_good: { borderColor: COLORS.success },
    personalMatch_warning: { borderColor: COLORS.warning },
    personalMatch_danger: { borderColor: COLORS.danger },
    personalMatchTitle: { 
      fontFamily: 'Tajawal-Bold', 
      fontSize: 16, 
      color: COLORS.textPrimary,
      textAlign: 'right',
    },
    personalMatchReason: { 
      fontFamily: 'Tajawal-Regular', 
      fontSize: 13, 
      color: COLORS.textSecondary, 
      marginTop: 8,
      textAlign: 'right',
    },
    vScoreCard: {
      alignItems: 'center',
      padding: 20,
      backgroundColor: COLORS.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    verdictText: { 
      fontFamily: 'Tajawal-Bold', 
      fontSize: 22, 
      color: COLORS.textPrimary, 
      textAlign: 'center', 
      marginBottom: 10 
    },
    pillarsRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-around', 
      width: '100%', 
      marginTop: 15, 
      paddingTop: 15, 
      borderTopWidth: 1, 
      borderTopColor: COLORS.border, 
    },
    pillar: { 
      alignItems: 'center', 
      gap: 5 
    },
    pillarTitle: { 
      fontFamily: 'Tajawal-Regular', 
      fontSize: 14, 
      color: COLORS.textSecondary, 
      flexDirection: 'row', 
      alignItems: 'center',
      gap: 5,
    },
    pillarScore: { 
      fontFamily: 'Tajawal-Bold', 
      fontSize: 20 
    },
    groupHeader: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
      paddingHorizontal: 5,
    },
    groupTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 16,
    },
    truthCard: {
      backgroundColor: COLORS.card,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    truthTrigger: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      padding: 15,
      gap: 15,
    },
    truthTitleContainer: {
      flex: 1,
      alignItems: 'flex-end',
    },
    truthTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 15,
      color: COLORS.textPrimary,
      textAlign: 'right',
    },
    truthStatus: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: COLORS.textSecondary,
      textAlign: 'right',
    },
    truthDetails: {
      paddingHorizontal: 15,
      paddingBottom: 15,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      marginTop: 10,
    },
    truthExplanation: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 13,
      color: COLORS.textSecondary,
      lineHeight: 20,
      textAlign: 'right',
      marginBottom: 15,
    },
    evidenceContainer: {},
    evidenceTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 13,
      color: COLORS.textPrimary,
      textAlign: 'right',
      marginBottom: 10,
    },
    evidencePillsContainer: {
      flexDirection: 'row-reverse',
      flexWrap: 'wrap',
      gap: 8,
    },
    evidencePill: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    evidencePillText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 12,
      color: COLORS.textPrimary,
    },
    pillProven: { backgroundColor: `${COLORS.success}40` },
    pillTraditional: { backgroundColor: `${COLORS.gold}40` },
    pillDoubtful: { backgroundColor: `${COLORS.warning}40` },
    pillIneffective: { backgroundColor: `${COLORS.danger}40` },
    ingCardBase: {
      width: width * 0.85,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.card,
      padding: 15,
    },
    ingHeader: { alignItems: 'flex-end' },
    ingName: { fontFamily: 'Tajawal-ExtraBold', fontSize: 22, color: COLORS.textPrimary, textAlign: 'right' },
    ingTagsContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    ingTag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    ingFuncTag: { backgroundColor: 'rgba(96, 165, 140, 0.2)' },
    ingChemTag: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
    ingTagText: { fontFamily: 'Tajawal-Bold', fontSize: 12, color: COLORS.textPrimary },
    ingBenefitsContainer: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 15 },
    ingBenefitChip: { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    ingBenefitText: { fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textSecondary },
    ingDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 15 },
    ingWarningBox: { borderRadius: 12, padding: 12, flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
    ingWarningIcon: { marginTop: 2 },
    ingWarningText: { flex: 1, fontFamily: 'Tajawal-Regular', fontSize: 13, color: COLORS.textPrimary, lineHeight: 20, textAlign: 'right' },
  
    // --- Shared Components ---
    mainBtn: { flexDirection: 'row-reverse', backgroundColor: COLORS.accentGreen, borderRadius: 50, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%' },
    mainBtnText: { fontFamily: 'Tajawal-Bold', fontSize: 16, color: COLORS.background },
    actionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 10,
      marginBottom: 20,
      paddingHorizontal: 5,
  },
  secondaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      height: 50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      gap: 8,
  },
  secondaryActionText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 14,
      color: COLORS.textPrimary,
  },
  iconActionBtn: {
      width: 50,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
  },
    // --- Save Modal ---
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.85)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20
  },
  modalContent: {
      width: '100%',
      backgroundColor: COLORS.card,
      borderRadius: 24,
      padding: 25,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
  },
  modalTitle: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 20,
      color: COLORS.textPrimary,
      marginBottom: 5,
  },
  modalSub: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 13,
      color: COLORS.textSecondary,
      textAlign: 'center'
  },
  
  // Image Picker
  frontImagePicker: {
      width: 100,
      height: 100,
      borderRadius: 24,
      backgroundColor: COLORS.background,
      alignSelf: 'center',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: COLORS.accentGreen,
      borderStyle: 'dashed',
      overflow: 'visible'
  },
  frontImagePreview: {
      width: '100%',
      height: '100%',
      borderRadius: 24,
  },
  cameraIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.accentGreen + '20',
      alignItems: 'center',
      justifyContent: 'center'
  },
  pickerText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 12,
      color: COLORS.accentGreen
  },
  editBadge: {
      position: 'absolute',
      bottom: -5,
      right: -5,
      backgroundColor: COLORS.accentGreen,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: COLORS.card
  },

  // Inputs
  inputWrapper: {
      marginBottom: 20,
  },
  inputLabel: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 13,
      color: COLORS.textSecondary,
      marginBottom: 8,
      textAlign: 'right'
  },
  modalInput: {
      backgroundColor: COLORS.background,
      borderRadius: 16,
      paddingHorizontal: 15,
      paddingVertical: 12,
      color: COLORS.textPrimary,
      fontFamily: 'Tajawal-Bold',
      fontSize: 15,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  modalSaveButton: {
      backgroundColor: COLORS.accentGreen,
      paddingVertical: 14,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
  },
  modalSaveButtonText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 16,
      color: COLORS.textOnAccent
  },
    // --- Pagination & Swipe Hint ---
    swipeHintContainer: { position: 'absolute', right: '40%', top: '45%', transform: [{ translateY: -30 }], zIndex: 10, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
    paginationSimpleContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    paginationContainer: { height: DOT_SIZE, width: PAGINATION_DOTS * DOT_SIZE + (PAGINATION_DOTS - 1) * DOT_SPACING, justifyContent: 'center', alignSelf: 'center', marginBottom: 20, overflow: 'hidden' },
    paginationTrack: { flexDirection: 'row', alignItems: 'center' },
    paginationDot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: 'rgba(255, 255, 255, 0.25)', marginRight: DOT_SPACING },
    paginationIndicator: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: COLORS.accentGreen, position: 'absolute', left: 0 },
    
    // --- NEW INPUT STEP DESIGN ---
    inputStepContainer: {
      flex: 1, // Changed from height calculation to flex
      justifyContent: 'space-between',
      width: '100%',
      paddingBottom: 20, // Add slight padding for the bottom edge
  },
  heroVisualContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  scanFrame: {
      width: 200,
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
      // Tech-feel border implied by corners
  },
  scanLaser: {
      position: 'absolute',
      top: 30, // Start inside the frame
      width: '120%',
      height: 2,
      shadowColor: COLORS.accentGreen,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 10,
      elevation: 5,
  },
  scanCorner: {
      position: 'absolute',
      width: 20,
      height: 20,
      borderColor: COLORS.accentGreen,
      opacity: 0.6,
  },
  scanCornerTL: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 10 },
  scanCornerTR: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 10 },
  scanCornerBL: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 10 },
  scanCornerBR: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 10 },
  
  // --- BOTTOM DECK ---
  bottomDeck: {
      width: '100%',
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      overflow: 'hidden',
      elevation: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.3,
      shadowRadius: 15,
  },
  bottomDeckGradient: {
      padding: 25,
      paddingBottom: 40,
  },
  deckHeader: {
      alignItems: 'flex-end',
      marginBottom: 25,
  },
  deckTitle: {
      fontFamily: 'Tajawal-ExtraBold',
      fontSize: 24,
      color: COLORS.textPrimary,
      marginBottom: 5,
  },
  primaryActionBtn: {
      width: '100%',
      borderRadius: 20,
      marginBottom: 20,
      ...Platform.select({
          default: { elevation: 8, shadowColor: COLORS.accentGreen, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: {width: 0, height: 5} }
      })
  },
  primaryActionGradient: {
      flexDirection: 'row-reverse',
      alignItems: 'center',
      padding: 20,
      borderRadius: 20,
      gap: 15,
  },
  iconCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  primaryActionTitle: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 18,
      color: COLORS.background,
      textAlign: 'right',
  },
  primaryActionSub: {
      fontFamily: 'Tajawal-Regular',
      fontSize: 12,
      color: 'rgba(21, 37, 32, 0.8)', // Dark green text for readability on green bg
      textAlign: 'right',
  },
  secondaryActionsRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
  },
  secondaryBtn: {
      flex: 1,
      flexDirection: 'row-reverse',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 15,
      gap: 8,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 15,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
  },
  secondaryBtnText: {
      fontFamily: 'Tajawal-Bold',
      fontSize: 14,
      color: COLORS.textSecondary,
  },
  verticalDivider: {
      width: 15,
  },
  });