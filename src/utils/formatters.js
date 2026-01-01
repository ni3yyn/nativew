import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

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
 * @returns {string} - The formatted relative time string (e.g., "قبل 5 دقائق").
 */
export const formatRelativeTime = (dateValue) => {
    if (!dateValue) return 'الآن';
    
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
            return 'منذ فترة';
        }

        // Use addSuffix: false for a cleaner "5 دقائق" instead of "قبل 5 دقائق"
        return formatDistanceToNow(date, { locale: ar, addSuffix: false });
    } catch (e) {
        console.error("Date formatting error:", e, "Value:", dateValue);
        return 'منذ فترة';
    }
};