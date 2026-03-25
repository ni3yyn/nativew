import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { t } from '../i18n';

/**
 * Converts a file URI (local or remote) to a Base64 string.
 * @param {string} uri - The file URI to convert.
 * @returns {Promise<string>} - The Base64 encoded string.
 */
export const uriToBase64 = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => { 
          const result = reader.result;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64); 
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) { 
      console.error("Base64 Error:", e);
      throw new Error("Failed to process image file."); 
  }
};

/**
 * Safely formats a date, whether it's a Firebase Timestamp or an ISO string from cache.
 * @param {object|string} dateValue - The value to format.
 * @param {string} language - 'ar' or 'en'
 * @returns {string} - The formatted relative time string.
 */
export const formatRelativeTime = (dateValue, language = 'ar') => {
    if (!dateValue) return t('time_now', language);
    
    try {
        let date;
        // If it has a toDate method, it's a Firebase Timestamp
        if (typeof dateValue.toDate === 'function') {
            date = dateValue.toDate();
        } 
        // Otherwise, assume it's a string or number
        else {
            date = new Date(dateValue);
        }
        
        // Final check for validity
        if (isNaN(date.getTime())) {
            return t('time_ago', language);
        }

        const locale = language === 'ar' ? ar : enUS;
        return formatDistanceToNow(date, { locale, addSuffix: false });
    } catch (e) {
        console.error("Date formatting error:", e, "Value:", dateValue);
        return t('time_ago', language);
    }
};