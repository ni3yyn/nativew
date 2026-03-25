import { supabase } from '../config/supabase';

export const GamificationService = {
    trackAction: async (actionName) => {
        try {
            // This line automatically sends the user's JWT (Auth Token) to Supabase
            const { data, error } = await supabase.functions.invoke('track-gamification', {
                body: { actionName }
            });

            if (error) throw error;
            return data; // returns { success: true, pointsAwarded: 100 }
        } catch (error) {
            console.error("Gamification Error:", error);
            return null;
        }
    }
};