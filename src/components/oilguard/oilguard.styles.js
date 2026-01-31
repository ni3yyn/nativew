import { StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';

// ============================================================================
//                               CONFIG & CONSTANTS
// ============================================================================

const { width, height } = Dimensions.get('window');

export { width, height };

// Layout Constants
export const CARD_WIDTH = width * 0.85;
export const SEPARATOR_WIDTH = 15;
export const ITEM_WIDTH = CARD_WIDTH + SEPARATOR_WIDTH;

// Pagination Constants
export const DOT_SIZE = 8;
export const PAGINATION_DOTS = 4;
export const DOT_SPACING = 8;

// Color Palette
export const COLORS = {
  background: '#1A2D27',
  card: '#253D34',
  border: 'rgba(90, 156, 132, 0.25)',

  accentGreen: '#5A9C84',
  accentGlow: 'rgba(90, 156, 132, 0.4)',
  
  // Compatibility Mappings
  primary: '#5A9C84', 
  primaryGlow: 'rgba(90, 156, 132, 0.4)', 
  darkGreen: '#1A2D27', 
  textDim: '#A3B1AC', 

  // Text Colors
  textPrimary: '#F1F3F2',
  textSecondary: '#A3B1AC',
  textOnAccent: '#1A2D27',

  // Status Colors
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  success: '#22c55e',
  gold: '#fbbf24'
};

// ============================================================================
//                               STYLESHEET
// ============================================================================

export const styles = StyleSheet.create({

  // --------------------------------------------------------------------------
  // 1. CORE LAYOUT & GLOBAL WRAPPERS
  // --------------------------------------------------------------------------
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    // Adjust for StatusBar + Header Height
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

  // --------------------------------------------------------------------------
  // 2. HEADERS & NAVIGATION
  // --------------------------------------------------------------------------
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
  
  // Collapsible Header Styles (Step 2)
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

  // --------------------------------------------------------------------------
  // 3. STEP 0: INPUT & HERO (Scanning, Camera, Deck)
  // --------------------------------------------------------------------------
  inputStepContainer: {
    flex: 1,
    justifyContent: 'space-between',
    width: '100%',
    paddingBottom: 20,
  },
  heroVisualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Scanning Laser Animation
  scanFrame: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLaser: {
    position: 'absolute',
    top: 30,
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

  // Bottom Action Deck
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
  
  // Primary Action Button (Camera)
  primaryActionBtn: {
    width: '100%',
    borderRadius: 20,
    marginBottom: 20,
    ...Platform.select({
      default: { elevation: 8, shadowColor: COLORS.accentGreen, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } }
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
    color: 'rgba(21, 37, 32, 0.8)',
    textAlign: 'right',
  },
  
  // Secondary Actions (Gallery/Search)
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

  // Legacy Hero Styles (Kept for compatibility)
  heroSection: { alignItems: 'center', marginBottom: 30, paddingHorizontal: 20 },
  heroIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  heroTitle: { fontFamily: 'Tajawal-ExtraBold', fontSize: 28, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 },
  heroSubContainer: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
  heroSub: { fontFamily: 'Tajawal-Regular', fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, minHeight: 22 },

  // --------------------------------------------------------------------------
// 4. STEP 1: PREDICTION REVIEW
// --------------------------------------------------------------------------
rs_Container: {
  flex: 1,
  width: '100%',
  justifyContent: 'center',
  paddingHorizontal: 10,
  gap: 20,
},
rs_CenterContent: {
  alignItems: 'center',
  justifyContent: 'center',
},
rs_Title: {
  fontFamily: 'Tajawal-ExtraBold',
  fontSize: 28,
  color: COLORS.textPrimary,
  textAlign: 'center',
  marginBottom: 8,
},
rs_Subtitle: {
  fontFamily: 'Tajawal-Regular',
  fontSize: 15,
  color: COLORS.textSecondary,
  textAlign: 'center',
  lineHeight: 22,
},
rs_HeroWrapper: {
  alignItems: 'center',
  justifyContent: 'center',
  marginVertical: 20,
},
rs_VisualCircleContainer: {
  position: 'relative',
  alignItems: 'center',
  justifyContent: 'center',
  width: 140,
  height: 140,
},
rs_GlowRing: {
  position: 'absolute',
  width: 140,
  height: 140,
  borderRadius: 70,
  backgroundColor: `${COLORS.accentGreen}20`,
},
rs_GlassCircle: {
  width: 100,
  height: 100,
  borderRadius: 50,
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderWidth: 1,
  borderColor: 'rgba(90, 156, 132, 0.3)',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(10px)',
},
rs_LabelContainer: {
  alignItems: 'center',
  marginTop: 20,
  gap: 12,
},
rs_LabelText: {
  fontFamily: 'Tajawal-Bold',
  fontSize: 18,
  color: COLORS.textPrimary,
  textAlign: 'center',
},
rs_EditBtn: {
  flexDirection: 'row-reverse', // RTL alignment
  alignItems: 'center',
  gap: 8,
  paddingHorizontal: 16,
  paddingVertical: 8,
  backgroundColor: 'rgba(90, 156, 132, 0.1)',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: COLORS.accentGreen,
},
rs_EditBtnText: {
  fontFamily: 'Tajawal-Bold',
  fontSize: 13,
  color: COLORS.accentGreen,
},
rs_GridWrapper: {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderRadius: 20,
  padding: 15,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  marginTop: 10,
  // Remove fixed height, will be animated
},
rs_ChipGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 10,
},
rs_TypeChip: {
  flexDirection: 'row-reverse', // Icon on LEFT, text on RIGHT (RTL)
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  gap: 8,
},
rs_TypeChipActive: {
  backgroundColor: COLORS.accentGreen,
  borderColor: COLORS.accentGreen,
},
rs_TypeChipText: {
  fontFamily: 'Tajawal-Bold',
  fontSize: 13,
  color: COLORS.textPrimary,
},
rs_TypeChipTextActive: {
  color: COLORS.textOnAccent,
},
rs_CloseGridBtn: {
  alignItems: 'center',
  marginTop: 15,
  paddingVertical: 8,
},
rs_Footer: {
  marginTop: 30,
  paddingHorizontal: 20,
},
rs_ConfirmBtn: {
  width: '100%',
  // REMOVED: elevation, shadows, overflow, and borderRadius from here.
  // This container is now purely for layout, preventing the Android transparency glitch.
  backgroundColor: 'transparent',
},
rs_ConfirmGradient: {
  flexDirection: 'row-reverse',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 16,
  paddingHorizontal: 20,
  gap: 12,
  minHeight: 56,
  
  // MOVED VISUAL STYLES HERE:
  borderRadius: 16, 
  overflow: 'hidden', 
  
  // Shadow/Elevation now lives on the visual element, not the touchable container
  elevation: 5,
  shadowColor: COLORS.accentGreen,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4,
  shadowRadius: 8,
},
rs_ConfirmText: {
  fontFamily: 'Tajawal-Bold',
  fontSize: 16,
  color: COLORS.background,
},
rs_GridWrapperAnimated: {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderRadius: 20,
  padding: 15,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  marginTop: 10,
},

// For the checkmark animation
rs_CheckIcon: {
  opacity: 0,
  transform: [{ scale: 0.5 }],
},

// Smooth transition for the hero section
rs_HeroWrapperAnimated: {
  alignItems: 'center',
  justifyContent: 'center',
  marginVertical: 20,
  transform: [{ translateY: 0 }], // Will be animated
},
  // --------------------------------------------------------------------------
  // 5. STEP 2: CLAIMS SELECTION & SEARCH
  // --------------------------------------------------------------------------
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

  // Floating Action Button (Analysis Trigger)
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 70 : 90,
    alignSelf: 'center',
    zIndex: 20,
  },
  fab: {
    width: 70,
    height: 70,
    borderRadius: 37.5,
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

  // --------------------------------------------------------------------------
  // 6. STEP 3: LOADING
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // 7. STEP 4: ANALYSIS RESULTS
  // --------------------------------------------------------------------------
  resultsSectionTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 15,
    paddingHorizontal: 5,
  },

  // Personal Match Card
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

  // Verdict/Score Card
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

  // Marketing Claims Results (Truth)
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

  // Ingredient Details Cards
  ingCardBase: {
    width: width * 0.85,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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

  // --------------------------------------------------------------------------
  // 8. BUTTONS & ACTIONS
  // --------------------------------------------------------------------------
  mainBtn: {
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.accentGreen,
    borderRadius: 50,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%'
  },
  mainBtnText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 16,
    color: COLORS.background
  },
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

  // --------------------------------------------------------------------------
  // 9. SAVE MODAL & IMAGE PICKER
  // --------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------
  // 10. PAGINATION & UI HINTS
  // --------------------------------------------------------------------------
  swipeHintContainer: {
    position: 'absolute',
    right: '40%',
    top: '45%',
    transform: [{ translateY: -30 }],
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  },
  paginationSimpleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  paginationContainer: {
    height: DOT_SIZE,
    width: PAGINATION_DOTS * DOT_SIZE + (PAGINATION_DOTS - 1) * DOT_SPACING,
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    overflow: 'hidden'
  },
  paginationTrack: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  paginationDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginRight: DOT_SPACING
  },
  paginationIndicator: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: COLORS.accentGreen,
    position: 'absolute',
    left: 0
  },

  // --------------------------------------------------------------------------
  // 11. UTILITY / MISC
  // --------------------------------------------------------------------------
  breakdownContainer: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  breakdownTitle: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  breakdownList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  breakdownRowCalc: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginTop: 5,
    borderRadius: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0,
  },
  breakdownText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: COLORS.textPrimary,
    textAlign: 'right',
    lineHeight: 18,
  },
  breakdownValue: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12,
    direction: 'ltr',
  },
  
  // --------------------------------------------------------------------------
  // NEW: ADVANCED RESULTS DASHBOARD STYLES
  // --------------------------------------------------------------------------
  
  // The Main Dashboard Container (HUD)
  dashboardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(90, 156, 132, 0.3)',
    marginBottom: 20,
    position: 'relative',
  },
  dashboardGlass: {
    padding: 20,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(26, 45, 39, 0.6)', 
  },
  
  // Dashboard Header (Personal Match)
  dashHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 15,
  },
  matchBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: 100, // Prevents it from taking more than half the header
    alignSelf: 'center', 
  },
  matchText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12,
    alignSelf: 'center',
    color: COLORS.textPrimary,
  },
  productTypeLabel: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: COLORS.textDim,
    letterSpacing: 1,
  },

  // The Centerpiece (Gauge + Verdict)
  gaugeSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    height: 220, // ample space for the big ring
  },
  absoluteCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verdictBig: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 28,
    color: COLORS.textPrimary,
    textAlign: 'center',
    textShadowColor: 'rgba(90, 156, 132, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  verdictLabel: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 9
  },
  
  // The "Chemical DNA" Stats Row
  statsGrid: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 15,
    marginTop: 5, // Space from verdict
    paddingHorizontal: 5,
  },
  
  // The Glass Capsule
  pillarContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)', // Ultra-subtle fill
    borderRadius: 16,
    padding: 12,
    
    justifyContent: 'center',
  },

  // Header: Icon + Label + Score
  pillarHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pillarLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  pillarIconBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pillarLabel: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  pillarValue: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 15,
    color: COLORS.textPrimary,
  },

  // Progress Bar
  pillarTrack: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Darker track for depth
    borderRadius: 10,
    overflow: 'hidden',
  },
  pillarFill: {
    height: '100%',
    borderRadius: 10,
    // Add shadow to the bar itself for a "neon" look
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },

  // Personal Match Reason Box (Sub-dashboard)
  matchContainer: {
    marginTop: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.03)', // Very subtle glass background
    borderRadius: 16,
    paddingVertical: 5,
    marginHorizontal: 5,
    width: '100%',
    alignSelf: 'center',
  },

  // Single Header
  matchHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    textAlign: 'right',
    marginBottom: 5,
  },
  matchHeaderIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchHeaderTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 15,
    textAlign: 'right',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },

  // The List Body
  matchBody: {
    paddingHorizontal: 9,
    paddingBottom: 12,
    gap: 12, // Space between items
  },

  // Individual Row
  matchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start', // Align top in case of long text
    gap: 12,
  },
  matchIconBox: {
    marginTop: 1, // Align with text cap height
    width: 20,
    height: 20,
    borderRadius: 10, // Circular icon background
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchText: {
    flex: 1,
    fontFamily: 'Tajawal-Regular',
    fontSize: 14,
    color: COLORS.textSecondary, // Softer text color
    lineHeight: 20,
    textAlign: 'right',
  },
  
  // Individual Items
  matchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
  },
  matchIconBox: {
    marginTop: 4,
    width: 20,
    alignItems: 'center',

  },
  matchText: {
    flex: 1,
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    textAlign: 'right',
  },
  
  // Divider between Good and Bad sections
  matchSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 15,
  },
  
 
  // --------------------------------------------------------------------------
  // MODERN CLAIMS (Transparent & Clean)
  // --------------------------------------------------------------------------
  
  claimsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)', // Subtle glass effect
    marginTop: 0,
    marginBottom: 20,
    borderRadius: 20,
    paddingVertical: 10,
  },

  claimsHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 10,
    marginHorizontal: 5,
    paddingBottom: 10, // Reduced padding to tighten gap
    marginBottom: 0,   // Removed margin to fix the "massive gap"
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  claimsTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  claimsSubtitle: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  honestyBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  honestyScore: {
    fontFamily: 'Tajawal-ExtraBold',
    fontSize: 16,
    color: COLORS.success, // Changed to green for better visibility on transparent
  },
  honestyLabel: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 10,
    color: COLORS.textDim,
  },

  // Body
  claimsBody: {
    paddingHorizontal: 0, // Padding is now on the row itself
  },
  
  // Row
  claimRowWrapper: {
    width: '100%',
    overflow: 'hidden', // Essential for smooth transition
  },
  claimRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  
  // Clickable Row Area
  claimRowMain: {
    flexDirection: 'row-reverse', // Align Right to Left
    alignItems: 'center',         // Vertically Center
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 10,
    width: '100%',                // Ensure it takes full width
  },
  
  // 1. Right Column (Status Icon)
  claimIconCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12, // Space between Icon and Text
  },

  claimTextCol: {
    flex: 1, // Grow to fill space
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  claimTextTitle: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 16,
    textAlign: 'right',
    marginBottom: 4,
  },
  claimTextStatus: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },

  // 3. Left Column (Arrow)
  claimArrowCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },

  // Details
  claimDetails: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    paddingRight: 50,
  },

  claimExplanation: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 15, // Increased from 13
    color: COLORS.textSecondary,
    lineHeight: 24, // Increased line height for readability
    textAlign: 'right',
    marginBottom: 15,
    direction: 'rtl',
  },

  miniEvidenceGrid: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  
  evidenceLabel: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 13,
    marginBottom: 8,
    width: '100%',
    direction: 'rtl',
  },

  miniEvidenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(77, 150, 255, 0.1)', // Default blue tint
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(77, 150, 255, 0.2)',
    marginBottom: 4,
  },
  miniEvidenceText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: '#4D96FF', // Default blue text
    textAlign: 'left',
  },
  guideSection: {
    width: '100%',
    paddingHorizontal: 10,
    marginTop: -15,
    marginBottom: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch', // Ensures both cards match height
    gap: 12,
  },

  // --- THE GLASS CARD (Base) ---
  opticalCard: {
    flex: 1, // Split width 50/50
    backgroundColor: '#0f1513', // Deep matte black
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    
    // Modern Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },

  // --- SPECIFIC STATES ---
  cardError: {
    borderColor: 'rgba(239, 68, 68, 0.4)', // Dim Red
  },
  cardSuccess: {
    borderColor: 'rgba(90, 156, 132, 0.6)', // Sharp Teal/Green
  },

  // --- THE IMAGE DISPLAY ---
  scannerScreen: {
    width: '100%',
    aspectRatio: 0.65, // Enforces the vertical rectangle shape
    position: 'relative',
  },
  guideImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // --- OVERLAYS & EFFECTS ---
  
  // Left Side: "Signal Lost" Effect
  noiseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 10, 10, 0.7)', // Heavy dark tint
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorGlitchBox: {
    borderWidth: 1,
    borderRadius: 8,
    borderColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginTop: 10,
  },
  errorTextMono: {
    color: COLORS.danger,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: 'bold',
  },

  // Right Side: "Signal Locked" Effect
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    opacity: 0.3,
  },
  // The bright laser beam
  laserBeam: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00ffaa', // Neon Green
    zIndex: 10,
    shadowColor: '#00ffaa',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 1,
    shadowRadius: 10, // Glowing effect
  },
  // The trail following the laser
  laserGradient: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    height: 60,
  },

  // --- HUD CORNERS (The "Tech" Feel) ---
  hudCorner: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: 'white',
    zIndex: 20,
    opacity: 0.8,
  },
  hudTL: { top: 6, left: 6, borderTopWidth: 1, borderLeftWidth: 1 },
  hudTR: { top: 6, right: 6, borderTopWidth: 1, borderRightWidth: 1 },
  hudBL: { bottom: 6, left: 6, borderBottomWidth: 1, borderLeftWidth: 1 },
  hudBR: { bottom: 6, right: 6, borderBottomWidth: 1, borderRightWidth: 1 },

  // --- FOOTER LABELS ---
  cardFooter: {
    paddingVertical: 12,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLabel: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 12,
    textAlign: 'center',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  claimDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  claimExplanation: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
    textAlign: 'right', // Or 'right' if RTL
  },
  
  // --- NEW EVIDENCE LAYOUT STYLES ---
  evidenceGroup: {
    marginBottom: 12,
    alignItems: 'flex-end', // Let the container handle wrapping from the start (right)
  },
  
  chipContainer: {
    flexDirection: 'row-reverse', // RTL (Chips start from the right)
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  
  // Primary (Strong) Chips
  chipPrimary: {
    backgroundColor: 'rgba(77, 150, 255, 0.15)', // Blue tint
    borderColor: 'rgba(77, 150, 255, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chipTextPrimary: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 12,
    color: '#4D96FF',
    textAlign: 'right', // <--- FIX: Changed from 'center' to 'right'
  },
  chipBenefit: {
    fontSize: 10,
    opacity: 0.8,
    fontFamily: 'Tajawal-Regular',
  },

  // Trace (Weak) Chips
  chipTrace: {
    backgroundColor: 'rgba(255, 184, 76, 0.1)',
    borderColor: 'rgba(255, 184, 76, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipTextTrace: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 11, // Smaller text
    color: COLORS.textDim, // Dimmer text
    textAlign: 'right', // <--- FIX: Changed from 'center' to 'right'

  },
  chipBenefitTrace: {
    fontSize: 10,
    opacity: 0.6,
  },
  evidenceLabelContainer: {
    flexDirection: 'row-reverse', // Key fix for order
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
    justifyContent: 'flex-start',
  },
  evidenceLabelText: {
    fontFamily: 'Tajawal-Bold',
    fontSize: 13,
    textAlign: 'right',
  },
  personalNoteContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(90, 156, 132, 0.08)', // Very subtle green tint
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(90, 156, 132, 0.15)',
    gap: 0
  },
  personalNoteText: {
    fontFamily: 'Tajawal-Regular',
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    flexShrink: 1,
    lineHeight: 16
  },
});