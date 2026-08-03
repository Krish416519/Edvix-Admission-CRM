import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();   // loads .env variables (SUPABASE_URL, SUPABASE_ANON_KEY, etc.)

// ------------------------------------------------------------------
// 1️⃣ Initialise the Supabase client
// ------------------------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL;          // e.g. https://xyz.supabase.co
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // public anon key
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ------------------------------------------------------------------
// Admin client – service‑role key (used for privileged queries)
// ------------------------------------------------------------------
const supabaseAdminClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ------------------------------------------------------------------
// 2️⃣ Sign‑in with the Super Admin email & password
// ------------------------------------------------------------------
async function loginAndShowRole() {
  const email = 'degreepartners@gmail.com';
const password = '@Krish4165';

  // Sign‑in
  const { error: signInError, data: userData } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    console.error('❌ Sign‑in failed:', signInError.message);
    return;
  }

  const user = userData.user;
  console.log('✅ Signed in as', user?.email);

  // Query role_id from users table (requires service‑role key)
  const { data: roleData, error: roleError } = await supabaseAdminClient
    .from('users')
    .select('role_id')
    .eq('id', user.id)
    .single();

  if (roleError) {
    console.error('❌ Failed to fetch role_id:', roleError.message);
    return;
  }

  const roleId = roleData.role_id;
  console.log('🔑 role_id =', roleId);

  // Verify role name from roles table
  const { data: roleInfo, error: roleInfoError } = await supabaseAdminClient
    .from('roles')
    .select('name')
    .eq('id', roleId)
    .single();

  if (roleInfoError) {
    console.error('❌ Failed to fetch role name:', roleInfoError.message);
    return;
  }

  console.log('🛡️ Role name =', roleInfo.name);

  if (roleInfo.name === 'Super Admin') {
    console.log('🎉 You are a Super Admin!');
  } else {
    console.warn('⚠️ You are NOT a Super Admin (role:', roleInfo.name, ')');
  }
}

loginAndShowRole();
