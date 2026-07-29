import { createClient } from '@supabase/supabase-js';

// Helper to retrieve environment variables in both Vite (client-side) and Node (server-side) environments.
const getEnvVar = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env[key]) return process.env[key];
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env[key]) return import.meta.env[key];
  }
  return undefined;
};

const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');

if (!supabaseUrl) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL environment variable is missing.');
}

if (!supabaseAnonKey) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is missing.');
}

// Create the Supabase client.
// We fallback to placeholder strings if environment variables are not set to prevent module-load-time crashes.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

export default supabase;
