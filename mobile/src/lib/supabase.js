import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Supabase configuration - Update these with your actual Supabase project credentials
// Get these from: https://app.supabase.com/project/_/settings/api
const getSupabaseConfig = () => {
  // Try to get from Constants (Expo config) - supports both new and old Expo SDK
  let extra = {};
  try {
    if (Constants.expoConfig?.extra) {
      extra = Constants.expoConfig.extra;
    } else if (Constants.manifest?.extra) {
      extra = Constants.manifest.extra;
    } else if (Constants.manifest2?.extra?.expo?.extra) {
      extra = Constants.manifest2.extra.expo.extra;
    }
  } catch (e) {
    console.warn('Could not read Constants config:', e);
  }
  
  const url = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || null;
  const key = extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || null;

  // Fallback to hardcoded values (your project credentials)
  const SUPABASE_URL = url || "https://rmpbbesldyrbxbwgdxxz.supabase.co";
  const SUPABASE_ANON_KEY = key || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtcGJiZXNsZHlyYnhid2dkeHh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjU2MTQsImV4cCI6MjA3OTI0MTYxNH0.FO4_8Lcx0LO-WPOMIsGlFGeLBvF0MxTVu3kZg_k9Cbc";

  return { SUPABASE_URL, SUPABASE_ANON_KEY };
};

const { SUPABASE_URL, SUPABASE_ANON_KEY } = getSupabaseConfig();

// Validate credentials
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ Supabase credentials are missing!\n" +
    "Please configure them in app.json under extra section"
  );
} else if (SUPABASE_URL.includes('dashboard') || !SUPABASE_URL.includes('.supabase.co')) {
  console.warn(
    "⚠️ Supabase URL format may be incorrect!\n" +
    `Current URL: ${SUPABASE_URL}\n` +
    "Expected format: https://xxxxx.supabase.co\n" +
    "Get the correct URL from: https://app.supabase.com/project/_/settings/api"
  );
} else {
  console.log('✅ Supabase configured:', SUPABASE_URL.replace(/https:\/\/(.*)\.supabase\.co/, '$1'));
}

// Custom storage adapter for React Native using SecureStore
const ExpoSecureStoreAdapter = {
  getItem: (key) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key, value) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Create Supabase client with React Native storage adapter
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
