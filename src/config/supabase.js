import 'react-native-url-polyfill/auto'; // <--- CRITICAL for React Native
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get these from Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = 'https://ksbyorbbzfsqqqdeecwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzYnlvcmJiemZzcXFxZGVlY3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzI1OTksImV4cCI6MjA4MzAwODU5OX0.PUpfqLLz_68oPmKeza-tuAVAUtaURbzBgkNnH8HQAfY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});