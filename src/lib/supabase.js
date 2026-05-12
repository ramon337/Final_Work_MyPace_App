// src/lib/supabase.js
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// VUL HIER JE EIGEN GEGEVENS IN VANUIT HET SUPABASE DASHBOARD
const supabaseUrl = 'https://wgdclnrmyyrttuhkftih.supabase.co';
const supabaseAnonKey = 'sb_publishable_vr8ZNjF2q8DQjZ03coe6ow_iNoihbJM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});