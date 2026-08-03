import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Optional: check if keys are provided to avoid runtime crash on import if missing
export const hasSupabaseKeys = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseKeys 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  // Export a dummy client or null if you prefer, but we'll export the client and handle errors at point of use
  // We use type assertion to allow compiling even if keys are missing initially.
  // In production, missing keys would cause this to fail, which is expected.
  : createClient('https://placeholder.supabase.co', 'placeholder-key') ; 

export const supabaseAdmin = hasSupabaseKeys
  ? createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY)
  : createClient('https://placeholder.supabase.co', 'placeholder-key'); 

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
