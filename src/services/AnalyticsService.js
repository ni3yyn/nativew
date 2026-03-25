// src/services/AnalyticsService.js
import { supabase } from '../config/supabase';
import { auth } from '../config/firebase';

export const AnalyticsService = {
    /**
     * Tracks daily active users and their demographics
     */
    trackAppOpen: async (demographics = {}) => {
        try {
            await supabase.from('app_sessions').insert([{
                user_id: demographics.userId || 'anonymous',
                skin_type: demographics.skinType || 'unknown',
                scalp_type: demographics.scalpType || 'unknown',
                gender: demographics.gender || 'unknown',
                country: demographics.country || 'DZ',
                created_at: new Date().toISOString()
            }]);
        } catch (error) {
            console.error("Analytics Error (Silent Fail):", error);
        }
    },

    /**
     * Tracks when a user views, scans, or favorites a product
     * eventType: 'VIEW', 'SCAN', 'FAVORITE'
     */
    trackProductInteraction: async (productId, eventType, userSettings = {}) => {
        if (!productId) return;
        
        try {
            await supabase.from('product_events').insert([{
                product_id: productId,
                event_type: eventType,
                user_id: auth.currentUser?.uid || 'anonymous',
                user_skin_type: userSettings.skinType || 'unknown',
                user_scalp_type: userSettings.scalpType || 'unknown',
                country: userSettings.country || 'DZ',
                created_at: new Date().toISOString()
            }]);
        } catch (error) {
            console.error("Analytics Error (Silent Fail):", error);
        }
    },

    /**
     * Tracks what users are searching for (Whitespace Identification)
     */
    trackSearchQuery: async (searchKeyword, resultCount) => {
        if (!searchKeyword || searchKeyword.trim() === '') return;

        try {
            await supabase.from('search_logs').insert([{
                keyword: searchKeyword.toLowerCase().trim(),
                results_found: resultCount,
                user_id: auth.currentUser?.uid || 'anonymous',
                created_at: new Date().toISOString()
            }]);
        } catch (error) {
            console.error("Analytics Error (Silent Fail):", error);
        }
    }
};