// src/services/spfContextEngine.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@wathiq_widget_context';

/**
 * دالة التقدير الفلكي الشمسي في حال انعدام الـ GPS والإنترنت تماماً
 */
const estimateSolarUv = (timezone, date = new Date()) => {
    const hour = date.getHours() + date.getMinutes() / 60;
    const month = date.getMonth(); // 0 = Jan, 6 = Jul

    // 1. الليل: الأشعة صفر دائماً
    if (hour < 6.5 || hour >= 18.5) {
        return 0;
    }

    // 2. معامل الصيف/الشتاء لمنطقة الشرق الأوسط وشمال أفريقيا (MENA)
    // الصيف (مايو - أغسطس) = معامل 1.0، الشتاء (ديسمبر - يناير) = 0.55
    const isSummer = month >= 4 && month <= 8;
    const seasonMultiplier = isSummer ? 1.0 : 0.65;

    // 3. منحنى زاوية ميلان الشمس اليومي (قمة الذروة الساعة 12:30 ظهراً)
    const solarNoon = 12.5;
    const hoursFromNoon = Math.abs(hour - solarNoon);
    
    // معادلة كوزين مبسطة لمحاكاة ارتفاع الشمس
    const solarFactor = Math.max(0, Math.cos((hoursFromNoon / 6) * (Math.PI / 2)));
    
    // الأساس الأقصى للأشعة في المنطقة العربية صيفاً يصل لـ 11.5
    const maxEstimatedUv = 11.5 * seasonMultiplier;
    const estimatedUv = Math.round(maxEstimatedUv * Math.pow(solarFactor, 1.4) * 10) / 10;

    return Math.max(0, estimatedUv);
};

/**
 * محرك استخراج سياق الحماية المناسب
 */
export const resolveSpfContext = async (userProfile = null) => {
    let uv = 0;
    let isEstimated = false;

    try {
        // 1. محاولة قراءة آخر كاش محدث من تطبيق واثق
        const cachedRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
        const now = Date.now();

        if (cached && (now - cached.timestamp < 2 * 60 * 60 * 1000) && cached.uvIndex !== undefined) {
            // كاش صالح لأقل من ساعتين
            uv = cached.uvIndex;
            isEstimated = false;
        } else {
            // 2. السقوط الآمن: استخدام التقدير الفلكي عبر المنطقة الزمنية
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh';
            uv = estimateSolarUv(tz);
            isEstimated = true;
        }
    } catch {
        uv = estimateSolarUv('Asia/Riyadh');
        isEstimated = true;
    }

    // 3. تحديد مدة الحماية بالدقائق وفقاً للدراسات الجلدية
    let durationMinutes = 120; // المعيار الطبيعي
    let statusText = 'حماية نشطة';

    if (uv >= 11) {
        durationMinutes = 60; // أشعة قصوى: تكسر سريع لفلاتر الحماية
    } else if (uv >= 8) {
        durationMinutes = 75; // أشعة شديدة
    } else if (uv >= 6) {
        durationMinutes = 90; // أشعة مرتفعة
    } else if (uv >= 3) {
        durationMinutes = 120; // معتدلة
    } else {
        durationMinutes = 0; // آمنة
        statusText = 'أشعة آمنة';
    }

    // 4. فحص نوع بشرة المستخدم (حساسة = تقليص 10 دقائق للحماية)
    if (userProfile?.settings?.skinType === 'sensitive' && durationMinutes > 60) {
        durationMinutes -= 10;
    }

    // 5. الألوان المتوافقة مع الخطر
    let color = '#10B981'; // آمن
    if (uv >= 11) color = '#DC2626';
    else if (uv >= 8) color = '#EA580C';
    else if (uv >= 6) color = '#F59E0B';
    else if (uv >= 3) color = '#3B82F6';

    return {
        uvLevel: uv,
        isEstimated,
        durationMinutes,
        durationSeconds: durationMinutes * 60,
        color,
        statusText,
    };
};