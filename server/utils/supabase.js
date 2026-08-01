import { createClient } from '@supabase/supabase-js';

function getEnvValue(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
}

let supabaseClient = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    // Read env vars lazily so they are available even if this module was
    // imported before .env / .env.local were fully loaded.
    const url = getEnvValue(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL']);
    const key = getEnvValue(['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY']);
    if (url && key) {
      supabaseClient = createClient(url, key);
    }
  }
  return supabaseClient;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseClient());
}

export default getSupabaseClient;
