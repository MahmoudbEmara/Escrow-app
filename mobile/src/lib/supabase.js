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
// Optimized to handle large values by compressing JSON
const ExpoSecureStoreAdapter = {
  getItem: async (key) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error reading from SecureStore:', error);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      // Supabase passes the value as a string (JSON stringified session)
      let stringValue = value;
      
      // Minify JSON by removing unnecessary whitespace if it's valid JSON
      try {
        const parsed = JSON.parse(stringValue);
        stringValue = JSON.stringify(parsed);
      } catch {
        // If not valid JSON, use as-is
      }
      
      // Calculate approximate byte size (UTF-8 encoding)
      // For most JSON strings, length is a good approximation
      // For more accuracy with Unicode, we'd need TextEncoder, but length works for most cases
      const sizeInBytes = stringValue.length;
      
      if (sizeInBytes > 2048) {
        console.warn(
          `Value for key "${key}" is approximately ${sizeInBytes} bytes (exceeds 2048 bytes limit). ` +
          `This may cause storage issues. Consider optimizing the data being stored.`
        );
      }
      
      await SecureStore.setItemAsync(key, stringValue);
    } catch (error) {
      console.error('Error writing to SecureStore:', error);
      // Don't throw - allow Supabase to handle gracefully
    }
  },
  removeItem: async (key) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing from SecureStore:', error);
    }
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
