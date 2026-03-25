import { t } from '../i18n';

export const getClaimData = (id) => {
  const claims = {
    // Cleansing & Hair
    gentle_cleansing: { label: t('claim_gentle_cleansing'), icon: 'feather', color: '#81ecec' },
    deep_cleansing: { label: t('claim_deep_cleansing'), icon: 'water', color: '#0984e3' },
    scalp_purifying: { label: t('claim_scalp_purifying'), icon: 'spa', color: '#00b894' },
    anti_dandruff: { label: t('claim_anti_dandruff'), icon: 'snowflake', color: '#74b9ff' },
    oily_hair_spec: { label: t('claim_oily_hair_spec'), icon: 'oil-can', color: '#fdcb6e' },
    dry_hair_spec: { label: t('claim_dry_hair_spec'), icon: 'sun', color: '#e17055' },
    anti_hair_loss: { label: t('claim_anti_hair_loss'), icon: 'hand-holding-water', color: '#ff7675' },
    growth_boost: { label: t('claim_growth_boost'), icon: 'seedling', color: '#55efc4' },
    thickening: { label: t('claim_thickening'), icon: 'layer-group', color: '#a29bfe' },
    hair_moisturizing: { label: t('claim_hair_moisturizing'), icon: 'tint', color: '#74b9ff' },
    hair_nourishing: { label: t('claim_hair_nourishing'), icon: 'leaf', color: '#2ecc71' },
    repairing: { label: t('claim_repairing'), icon: 'band-aid', color: '#e84393' },
    shine_glow: { label: t('claim_shine_glow'), icon: 'magic', color: '#ffeaa7' },
    smoothing: { label: t('claim_smoothing'), icon: 'wind', color: '#fab1a0' },
    anti_frizz: { label: t('claim_anti_frizz'), icon: 'cloud-sun', color: '#636e72' },
    color_protection: { label: t('claim_color_protection'), icon: 'palette', color: '#d63031' },
    heat_protection: { label: t('claim_heat_protection'), icon: 'fire', color: '#e17055' },
    detangling: { label: t('claim_detangling'), icon: 'cut', color: '#00cec9' },
    
    // Skin & Face
    skin_moisturizing: { label: t('claim_skin_moisturizing'), icon: 'tint', color: '#0984e3' },
    intense_hydration: { label: t('claim_intense_hydration'), icon: 'cloud-showers-heavy', color: '#4834d4' },
    anti_wrinkle: { label: t('claim_anti_wrinkle'), icon: 'hourglass-half', color: '#fdcb6e' },
    skin_firming: { label: t('claim_skin_firming'), icon: 'arrow-up', color: '#e056fd' },
    collagen_boosting: { label: t('claim_collagen_boosting'), icon: 'dna', color: '#ff7979' },
    anti_oxidant: { label: t('claim_anti_oxidant'), icon: 'shield-alt', color: '#badc58' },
    brightening: { label: t('claim_brightening'), icon: 'sparkles', color: '#f9ca24' },
    even_skin_tone: { label: t('claim_even_skin_tone'), icon: 'th-large', color: '#f0932b' },
    dark_spot_repair: { label: t('claim_dark_spot_repair'), icon: 'dot-circle', color: '#eb4d4b' },
    under_eye_brightening: { label: t('claim_under_eye_brightening'), icon: 'eye', color: '#686de0' },
    soothing: { label: t('claim_soothing'), icon: 'leaf', color: '#7ed6df' },
    anti_inflammatory: { label: t('claim_anti_inflammatory'), icon: 'medkit', color: '#ffbe76' },
    dry_skin_spec: { label: t('claim_dry_skin_spec'), icon: 'tint-slash', color: '#f39c12' },
    sensitive_skin_spec: { label: t('claim_sensitive_skin_spec'), icon: 'heart', color: '#ff7979' },
    oily_skin_spec: { label: t('claim_oily_skin_spec'), icon: 'frown', color: '#95afc0' },
    pore_purifying: { label: t('claim_pore_purifying'), icon: 'filter', color: '#22a6b3' },
    oil_balance: { label: t('claim_oil_balance'), icon: 'balance-scale', color: '#be2edd' },
    anti_acne: { label: t('claim_anti_acne'), icon: 'shield-virus', color: '#eb4d4b' },
    anti_blackhead: { label: t('claim_anti_blackhead'), icon: 'braille', color: '#535c68' },
    gentle_exfoliation: { label: t('claim_gentle_exfoliation'), icon: 'eraser', color: '#c7ecee' },
    makeup_removal: { label: t('claim_makeup_removal'), icon: 'broom', color: '#ff9ff3' },
    ph_balancing: { label: t('claim_ph_balancing'), icon: 'vials', color: '#48dbfb' },
    sun_protection: { label: t('claim_sun_protection'), icon: 'sun', color: '#feca57' },
    broad_spectrum: { label: t('claim_broad_spectrum'), icon: 'broadcast-tower', color: '#ff9f43' },
    water_resistant: { label: t('claim_water_resistant'), icon: 'tint', color: '#2e86de' },
    body_slimming: { label: t('claim_body_slimming'), icon: 'walking', color: '#1dd1a1' },
    anti_cellulite: { label: t('claim_anti_cellulite'), icon: 'compress-arrows-alt', color: '#ee5253' },
  };

  // Logic: if ID is Arabic (like in manual input), return it as is. 
  // If it's a known English ID, return the stylized object.
  return claims[id] || { label: id, icon: 'check-circle', color: '#5A9C84' };
};