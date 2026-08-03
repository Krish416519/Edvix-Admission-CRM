import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com', // Admin
    password: '@Krish4165'
  });

  if (authErr) {
    console.error('Login failed:', authErr.message);
    return;
  }

  const { data, error } = await supabase.rpc('get_admin_dashboard_metrics'); // this will fail, let's use the admin client
  
  const adminSupabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const { data: policies, error: polErr } = await adminSupabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'leads');

  if (polErr) {
    console.error('Query Error:', polErr);
  } else {
    console.log('Policies on leads:', policies);
  }

  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Query Success:', data);
  }
}

test();
