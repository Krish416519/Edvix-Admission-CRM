import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kwvlfslmviunwmmuajxb.supabase.co";
const supabaseAnonKey = "sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase Connection...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'degreepartners@gmail.com',
      password: '@Krish4165'
    });
    
    if (error) {
      console.error('Connection Error:', error.message);
      return;
    } 
    console.log('Login Success, user:', data.user?.id);

    // Now let's try the extra queries
    console.log('Updating last_login...');
    const { error: updateError } = await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);
    if (updateError) {
      console.error('Update Error:', updateError);
      throw updateError;
    }

    console.log('Fetching profile...');
    const { data: profile, error: profileError } = await supabase.from('users').select('*').eq('id', data.user.id).single();
    if (profileError) {
      console.error('Profile Error:', profileError);
      throw profileError;
    }

    console.log('Fetching organizations...');
    const { data: orgData, error: orgError } = await supabase.from('organization_users').select('*, organizations(*)').eq('user_id', data.user.id).eq('status', 'Active');
    if (orgError) {
      console.error('Org Error:', orgError);
      throw orgError;
    }

    console.log('All succeeded!');

  } catch (err) {
    console.error('Caught error during login flow:', err);
  }
}

testConnection();
