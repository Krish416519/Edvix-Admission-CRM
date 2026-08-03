import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  // Login as super admin (assuming the email from previous context)
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  if (authErr) {
    console.error('Login failed:', authErr.message);
    const adminSupabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
    // When using service role, we need to mock the JWT to bypass the RLS `user_role()` check!
    // But since the user executes it in their UI, they already have it.
    // Let's just execute a raw query to check what throws.
    return;
  }

  console.log('Logged in as:', authData.user.email);
  const { data, error } = await supabase.rpc('get_admin_dashboard_metrics');
  
  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Success:', data);
  }
}

test();
