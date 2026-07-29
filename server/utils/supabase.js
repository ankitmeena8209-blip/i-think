import { createClient } from '@supabase/supabase-js';

function getEnvValue(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return '';
}

const supabaseUrl = getEnvValue(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL']);
const supabaseAnonKey = getEnvValue(['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY']);

let supabaseClient = null;

export function getSupabaseClient() {
  if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseClient());
}

export default getSupabaseClient;
