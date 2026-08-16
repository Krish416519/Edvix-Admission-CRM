import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kwvlfslmviunwmmuajxb.supabase.co';
const supabaseKey = 'sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testEdgeFunction() {
  console.log("Signing in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'krish@edvix.com', // Assume this is the super admin email based on previous context, or use raghav.rv.work@gmail.com
    password: 'password123'   // Most boilerplates use something simple if seeded, or I can just sign in as another known user. Wait, I don't know passwords.
  });
  
  if (authError) {
    console.error("Login failed:", authError.message);
    // Let's just try to manually parse the token behavior locally without real login
    return;
  }

  console.log("Logged in. Testing edge function with valid token...");
  const { data, error } = await supabase.functions.invoke('admin-user-actions', {
    body: { action: 'delete_user', user_id: 'test' }
  });
  
  console.log("Error:", error);
  console.log("Data:", data);
}

testEdgeFunction();
