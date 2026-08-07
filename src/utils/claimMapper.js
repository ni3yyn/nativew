// src/utils/claimMapper.js

import { t } from '../i18n';

const CLAIMS_DICTIONARY = {
  // HAIR CARE
  'مضاد لتساقط الشعر': { ar: 'مضاد لتساقط الشعر', icon: 'hand-holding-water', color: '#ff7675' },
  'تعزيز النمو': { ar: 'تعزيز النمو', icon: 'seedling', color: '#55efc4' },
  'تكثيف الشعر': { ar: 'تكثيف الشعر', icon: 'layer-group', color: '#a29bfe' },
  'مرطب للشعر': { ar: 'مرطب للشعر', icon: 'tint', color: '#74b9ff' },
  'تغذية الشعر': { ar: 'تغذية الشعر', icon: 'leaf', color: '#2ecc71' },
  'إصلاح الشعر المتضرر': { ar: 'إصلاح الشعر المتضرر', icon: 'band-aid', color: '#e84393' },
  'تقوية الشعر': { ar: 'تقوية الشعر', icon: 'dumbbell', color: '#6c5ce7' },
  'تنعيم الشعر': { ar: 'تنعيم الشعر', icon: 'wind', color: '#fab1a0' },
  'فك التشابك': { ar: 'فك التشابك', icon: 'cut', color: '#00cec9' },
  'مكافحة التجعد': { ar: 'مكافحة التجعد', icon: 'cloud-sun', color: '#636e72' },
  'حماية اللون': { ar: 'حماية اللون', icon: 'palette', color: '#d63031' },
  'تلميع ولمعان': { ar: 'تلميع ولمعان', icon: 'magic', color: '#ffeaa7' },
  'مخصص للشعر الجاف': { ar: 'مخصص للشعر الجاف', icon: 'sun', color: '#e17055' },
  'مخصص للشعر الدهني': { ar: 'مخصص للشعر الدهني', icon: 'oil-can', color: '#fdcb6e' },
  'مضاد للقشرة': { ar: 'مضاد للقشرة', icon: 'snowflake', color: '#74b9ff' },
  'تنقية فروة الرأس': { ar: 'تنقية فروة الرأس', icon: 'spa', color: '#00b894' },
  'حماية من الحرارة': { ar: 'حماية من الحرارة', icon: 'fire', color: '#e17055' },

  // SKINCARE
  'تفتيح البشرة': { ar: 'تفتيح البشرة', icon: 'sparkles', color: '#f9ca24' },
  'توحيد لون البشرة': { ar: 'توحيد لون البشرة', icon: 'th-large', color: '#f0932b' },
  'تفتيح البقع الداكنة': { ar: 'تفتيح البقع الداكنة', icon: 'dot-circle', color: '#eb4d4b' },
  'تفتيح تحت العين': { ar: 'تفتيح تحت العين', icon: 'eye', color: '#686de0' },
  'مكافحة التجاعيد': { ar: 'مكافحة التجاعيد', icon: 'hourglass-half', color: '#fdcb6e' },
  'شد البشرة': { ar: 'شد البشرة', icon: 'arrow-up', color: '#e056fd' },
  'تحفيز الكولاجين': { ar: 'تحفيز الكولاجين', icon: 'dna', color: '#ff7979' },
  'مضاد لحب الشباب': { ar: 'مضاد لحب الشباب', icon: 'shield-virus', color: '#eb4d4b' },
  'مضاد للرؤوس السوداء': { ar: 'مضاد للرؤوس السوداء', icon: 'braille', color: '#535c68' },
  'تنقية المسام': { ar: 'تنقية المسام', icon: 'filter', color: '#22a6b3' },
  'توازن الدهون والزيوت': { ar: 'توازن الدهون والزيوت', icon: 'balance-scale', color: '#be2edd' },
  'للبشرة الدهنية': { ar: 'للبشرة الدهنية', icon: 'frown', color: '#95afc0' },
  'للبشرة الجافة': { ar: 'للبشرة الجافة', icon: 'tint-slash', color: '#f39c12' },
  'للبشرة الحساسة': { ar: 'للبشرة الحساسة', icon: 'heart', color: '#ff7979' },
  'مرطب للبشرة': { ar: 'مرطب للبشرة', icon: 'tint', color: '#0984e3' },
  'ترطيب مكثف': { ar: 'ترطيب مكثف', icon: 'cloud-showers-heavy', color: '#4834d4' },
  'مهدئ': { ar: 'مهدئ', icon: 'leaf', color: '#7ed6df' },
  'تهدئة البشرة': { ar: 'تهدئة البشرة', icon: 'leaf', color: '#7ed6df' },
  'مضاد للالتهابات': { ar: 'مضاد للالتهابات', icon: 'medkit', color: '#ffbe76' },
  'تقشير لطيف': { ar: 'تقشير لطيف', icon: 'eraser', color: '#c7ecee' },
  'تقشير': { ar: 'تقشير', icon: 'eraser', color: '#74b9ff' },
  'تنظيف عميق': { ar: 'تنظيف عميق', icon: 'water', color: '#0984e3' },
  'تنظيف لطيف': { ar: 'تنظيف لطيف', icon: 'feather', color: '#81ecec' },
  'إزالة المكياج': { ar: 'إزالة المكياج', icon: 'broom', color: '#ff9ff3' },
  'توازن الحموضة': { ar: 'توازن الحموضة', icon: 'vials', color: '#48dbfb' },
  'قابض للمسام': { ar: 'قابض للمسام', icon: 'compress-alt', color: '#6c5ce7' },
  'تنقية عميقة': { ar: 'تنقية عميقة', icon: 'filter', color: '#00cec9' },
  'مضاد للأكسدة': { ar: 'مضاد للأكسدة', icon: 'shield-alt', color: '#badc58' },

  // SUN & BODY
  'حماية من الشمس': { ar: 'حماية من الشمس', icon: 'sun', color: '#feca57' },
  'حماية واسعة الطيف': { ar: 'حماية واسعة الطيف', icon: 'broadcast-tower', color: '#ff9f43' },
  'مقاوم للماء': { ar: 'مقاوم للماء', icon: 'tint', color: '#2e86de' },
  'إزالة السيلوليت': { ar: 'إزالة السيلوليت', icon: 'compress-arrows-alt', color: '#ee5253' },
  'شد الجسم': { ar: 'شد الجسم', icon: 'walking', color: '#1dd1a1' },
};

const normalizeClaimKey = (rawClaim) => {
  if (!rawClaim) return '';
  if (typeof rawClaim === 'object') {
    return (rawClaim.id || rawClaim.name || rawClaim.label || rawClaim.key || '').toString();
  }
  return rawClaim.toString().trim();
};

const isArabicText = (text) => /[\u0600-\u06FF]/.test(text);

const getHeuristicData = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('شمس') || lower.includes('sun') || lower.includes('spf')) return { icon: 'sun', color: '#feca57' };
  if (lower.includes('ترطيب') || lower.includes('moistur')) return { icon: 'tint', color: '#0984e3' };
  if (lower.includes('حبوب') || lower.includes('حب الشباب') || lower.includes('acne')) return { icon: 'shield-virus', color: '#eb4d4b' };
  if (lower.includes('تفتيح') || lower.includes('نضارة') || lower.includes('bright')) return { icon: 'sparkles', color: '#f9ca24' };
  if (lower.includes('شعر') || lower.includes('hair')) return { icon: 'spa', color: '#00b894' };
  if (lower.includes('تجاعيد') || lower.includes('aging')) return { icon: 'hourglass-half', color: '#fdcb6e' };
  return { icon: 'check-circle', color: '#5A9C84' };
};

export const getClaimData = (rawClaim) => {
  const rawString = normalizeClaimKey(rawClaim);

  if (!rawString) {
    return { id: 'unknown', label: '', icon: 'check-circle', color: '#5A9C84' };
  }

  // Direct Match
  if (CLAIMS_DICTIONARY[rawString]) {
    const item = CLAIMS_DICTIONARY[rawString];
    return { id: rawString, label: item.ar, icon: item.icon, color: item.color };
  }

  // Normalized Match
  const formattedKey = rawString.toLowerCase().replace(/[-\s]+/g, '_');
  if (CLAIMS_DICTIONARY[formattedKey]) {
    const item = CLAIMS_DICTIONARY[formattedKey];
    return { id: formattedKey, label: item.ar, icon: item.icon, color: item.color };
  }

  // Fallback
  let dynamicLabel = rawString;
  if (!isArabicText(rawString)) {
    dynamicLabel = rawString
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  const heuristic = getHeuristicData(rawString);

  return { id: rawString, label: dynamicLabel, icon: heuristic.icon, color: heuristic.color };
};

export const getAllRecognizedClaims = () => {
  return Object.keys(CLAIMS_DICTIONARY).map(key => getClaimData(key));
};

export default getClaimData;