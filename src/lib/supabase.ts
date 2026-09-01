import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Optional: check if keys are provided to avoid runtime crash on import if missing
export const hasSupabaseKeys = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseKeys) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to check real connectivity
export const checkSupabaseConnection = async () => {
  if (!hasSupabaseKeys) {
    return { connected: false, error: 'Missing environment variables (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY)' };
  }
  
  try {
    // A lightweight check - getting the session doesn't require a valid token, just a valid endpoint
    const { error } = await supabase.auth.getSession();
    if (error) throw error;
    
    return { connected: true, error: null };
  } catch (err: any) {
    return { connected: false, error: err.message || 'Failed to connect to Supabase' };
  }
};
