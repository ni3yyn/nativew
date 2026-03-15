export const getClaimData = (id) => {
  const claims = {
    // Cleansing & Hair
    gentle_cleansing: { label: 'تنظيف لطيف', icon: 'feather', color: '#81ecec' },
    deep_cleansing: { label: 'تنظيف عميق', icon: 'water', color: '#0984e3' },
    scalp_purifying: { label: 'تنقية فروة الرأس', icon: 'spa', color: '#00b894' },
    anti_dandruff: { label: 'مضاد للقشرة', icon: 'snowflake', color: '#74b9ff' },
    oily_hair_spec: { label: 'للشعر الدهني', icon: 'oil-can', color: '#fdcb6e' },
    dry_hair_spec: { label: 'للشعر الجاف', icon: 'sun', color: '#e17055' },
    anti_hair_loss: { label: 'مضاد للتساقط', icon: 'hand-holding-water', color: '#ff7675' },
    growth_boost: { label: 'تعزيز النمو', icon: 'seedling', color: '#55efc4' },
    thickening: { label: 'تكثيف الشعر', icon: 'layer-group', color: '#a29bfe' },
    hair_moisturizing: { label: 'مرطب للشعر', icon: 'tint', color: '#74b9ff' },
    hair_nourishing: { label: 'تغذية الشعر', icon: 'leaf', color: '#2ecc71' },
    repairing: { label: 'إصلاح الشعر المتضرر', icon: 'band-aid', color: '#e84393' },
    shine_glow: { label: 'تلميع ولمعان', icon: 'magic', color: '#ffeaa7' },
    smoothing: { label: 'تنعيم الشعر', icon: 'wind', color: '#fab1a0' },
    anti_frizz: { label: 'مكافحة التجعد', icon: 'cloud-sun', color: '#636e72' },
    color_protection: { label: 'حماية اللون', icon: 'palette', color: '#d63031' },
    heat_protection: { label: 'حماية من الحرارة', icon: 'fire', color: '#e17055' },
    detangling: { label: 'فك التشابك', icon: 'cut', color: '#00cec9' },
    
    // Skin & Face
    skin_moisturizing: { label: 'مرطب للبشرة', icon: 'tint', color: '#0984e3' },
    intense_hydration: { label: 'ترطيب مكثف', icon: 'cloud-showers-heavy', color: '#4834d4' },
    anti_wrinkle: { label: 'مكافحة التجاعيد', icon: 'hourglass-half', color: '#fdcb6e' },
    skin_firming: { label: 'شد البشرة', icon: 'arrow-up', color: '#e056fd' },
    collagen_boosting: { label: 'تحفيز الكولاجين', icon: 'dna', color: '#ff7979' },
    anti_oxidant: { label: 'مضاد للأكسدة', icon: 'shield-alt', color: '#badc58' },
    brightening: { label: 'تفتيح البشرة', icon: 'sparkles', color: '#f9ca24' },
    even_skin_tone: { label: 'توحيد اللون', icon: 'th-large', color: '#f0932b' },
    dark_spot_repair: { label: 'علاج البقع', icon: 'dot-circle', color: '#eb4d4b' },
    under_eye_brightening: { label: 'تفتيح الهالات', icon: 'eye', color: '#686de0' },
    soothing: { label: 'مهدئ', icon: 'leaf', color: '#7ed6df' },
    anti_inflammatory: { label: 'مضاد للالتهابات', icon: 'medkit', color: '#ffbe76' },
    dry_skin_spec: { label: 'للبشرة الجافة', icon: 'tint-slash', color: '#f39c12' },
    sensitive_skin_spec: { label: 'للبشرة الحساسة', icon: 'heart', color: '#ff7979' },
    oily_skin_spec: { label: 'للبشرة الدهنية', icon: 'frown', color: '#95afc0' },
    pore_purifying: { label: 'تنقية المسام', icon: 'filter', color: '#22a6b3' },
    oil_balance: { label: 'توازن الزيوت', icon: 'balance-scale', color: '#be2edd' },
    anti_acne: { label: 'مضاد لحب الشباب', icon: 'shield-virus', color: '#eb4d4b' },
    anti_blackhead: { label: 'مضاد للرؤوس السوداء', icon: 'braille', color: '#535c68' },
    gentle_exfoliation: { label: 'تقشير لطيف', icon: 'eraser', color: '#c7ecee' },
    makeup_removal: { label: 'إزالة المكياج', icon: 'broom', color: '#ff9ff3' },
    ph_balancing: { label: 'توازن الحموضة', icon: 'vials', color: '#48dbfb' },
    sun_protection: { label: 'حماية من الشمس', icon: 'sun', color: '#feca57' },
    broad_spectrum: { label: 'واسع الطيف', icon: 'broadcast-tower', color: '#ff9f43' },
    water_resistant: { label: 'مقاوم للماء', icon: 'tint', color: '#2e86de' },
    body_slimming: { label: 'شد الجسم', icon: 'walking', color: '#1dd1a1' },
    anti_cellulite: { label: 'إزالة السيلوليت', icon: 'compress-arrows-alt', color: '#ee5253' },
  };

  // Logic: if ID is Arabic (like in manual input), return it as is. 
  // If it's a known English ID, return the stylized object.
  return claims[id] || { label: id, icon: 'check-circle', color: '#5A9C84' };
};