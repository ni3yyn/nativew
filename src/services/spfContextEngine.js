// src/services/spfContextEngine.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@wathiq_widget_context';

const estimateSolarUv = (date = new Date()) => {
    const hour = date.getHours() + date.getMinutes() / 60;
    const month = date.getMonth(); 

    if (hour < 6.5 || hour >= 18.5) return 0;

    const isSummer = month >= 4 && month <= 8;
    const seasonMultiplier = isSummer ? 1.0 : 0.65;
    const solarNoon = 12.5;
    const hoursFromNoon = Math.abs(hour - solarNoon);
    const solarFactor = Math.max(0, Math.cos((hoursFromNoon / 6) * (Math.PI / 2)));
    
    const maxEstimatedUv = 11.5 * seasonMultiplier;
    const estimatedUv = Math.round(maxEstimatedUv * Math.pow(solarFactor, 1.4) * 10) / 10;

    return Math.max(0, estimatedUv);
};

export const resolveSpfContext = async (userProfile = null) => {
    let uv = 0;
    let isEstimated = false;

    try {
        const cachedRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
        const now = Date.now();

        if (cached && (now - cached.timestamp < 2 * 60 * 60 * 1000) && cached.uvIndex !== undefined) {
            uv = cached.uvIndex;
            isEstimated = false;
        } else {
            // أزلنا Intl تماماً واعتمدنا على التوقيت المحلي للجهاز مباشرة
            uv = estimateSolarUv();
            isEstimated = true;
        }
    } catch {
        uv = estimateSolarUv();
        isEstimated = true;
    }

    let durationMinutes = 120;
    if (uv >= 11) durationMinutes = 60;
    else if (uv >= 8) durationMinutes = 75;
    else if (uv >= 6) durationMinutes = 90;
    else if (uv >= 3) durationMinutes = 120;
    else durationMinutes = 0; 

    if (userProfile?.settings?.skinType === 'sensitive' && durationMinutes > 60) {
        durationMinutes -= 10;
    }

    let color = '#10B981'; 
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
    };
};