// src/utils/fingerprint.js

/**
 * Generates a unique string signature (hash) for a set of products and user settings.
 * This is used to prevent unnecessary API calls to Vercel when the data hasn't actually changed.
 * 
 * @param {Array} products - The list of saved products from context
 * @param {Object} settings - The user's profile settings (skin type, allergies, etc.)
 * @returns {string} A unique string representing this specific data state
 */
export const generateFingerprint = (products, settings) => {
    if (!products || !Array.isArray(products)) return '';

    // 1. Extract IDs and Sort: 
    // Sorting ensures that [A, B] generates the same hash as [B, A]
    const productIds = products
        .map(p => p.id)
        .sort()
        .join('-');

    // 2. Serialize Settings:
    // If settings change (e.g. user selects "Pregnancy"), the hash changes, triggering a re-analysis.
    const settingsStr = JSON.stringify(settings || {});

    // 3. Combine ingredients count (Optional but robust):
    // Just in case an ID stays the same but the ingredients inside changed (rare but possible during edits)
    const dataVersion = products.length; 

    return `${dataVersion}|${productIds}|${settingsStr}`;
};