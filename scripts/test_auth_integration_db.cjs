const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kwvlfslmviunwmmuajxb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthQueries() {
  console.log('Logging in as degreepartners@gmail.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  const user = authData.user;
  console.log('Logged in user ID:', user.id);

  // Check user record
  const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single();
  console.log('User org id:', userData?.active_organization_id || userData?.organization_id);

  // Check api_keys
  const { data: keys, error: keyErr } = await supabase.from('api_keys').select('*');
  console.log('api_keys count:', keys?.length, keyErr ? `Error: ${keyErr.message}` : '');

  // Check webhooks
  const { data: hooks, error: hookErr } = await supabase.from('webhooks').select('*');
  console.log('webhooks count:', hooks?.length, hookErr ? `Error: ${hookErr.message}` : '');

  // Check import_jobs
  const { data: jobs, error: jobErr } = await supabase.from('import_jobs').select('*');
  console.log('import_jobs count:', jobs?.length, jobErr ? `Error: ${jobErr.message}` : '');

  // Check api_logs
  const { data: logs, error: logErr } = await supabase.from('api_logs').select('*');
  console.log('api_logs count:', logs?.length, logErr ? `Error: ${logErr.message}` : '');
}

testAuthQueries().catch(console.error);
