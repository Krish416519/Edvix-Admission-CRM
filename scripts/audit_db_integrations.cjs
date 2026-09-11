const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kwvlfslmviunwmmuajxb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDb() {
  console.log('--- INSPECTING DATABASE TABLES FOR INTEGRATIONS ---');
  
  // 1. Check api_keys
  const { data: keys, error: keyErr } = await supabase.from('api_keys').select('*').limit(3);
  console.log('api_keys table:', keyErr ? `ERROR: ${keyErr.message}` : `OK (${keys.length} sample rows)`);
  if (keys && keys.length > 0) {
    console.log('Sample api_key keys:', Object.keys(keys[0]));
  }

  // 2. Check webhooks
  const { data: hooks, error: hookErr } = await supabase.from('webhooks').select('*').limit(3);
  console.log('webhooks table:', hookErr ? `ERROR: ${hookErr.message}` : `OK (${hooks.length} sample rows)`);
  if (hooks && hooks.length > 0) {
    console.log('Sample webhook keys:', Object.keys(hooks[0]));
  }

  // 3. Check webhook_deliveries
  const { data: deliveries, error: delErr } = await supabase.from('webhook_deliveries').select('*').limit(3);
  console.log('webhook_deliveries table:', delErr ? `ERROR: ${delErr.message}` : `OK (${deliveries.length} sample rows)`);

  // 4. Check api_logs
  const { data: logs, error: logErr } = await supabase.from('api_logs').select('*').limit(3);
  console.log('api_logs table:', logErr ? `ERROR: ${logErr.message}` : `OK (${logs.length} sample rows)`);
  if (logs && logs.length > 0) {
    console.log('Sample api_logs keys:', Object.keys(logs[0]));
  }

  // 5. Check import_jobs
  const { data: jobs, error: jobErr } = await supabase.from('import_jobs').select('*').limit(3);
  console.log('import_jobs table:', jobErr ? `ERROR: ${jobErr.message}` : `OK (${jobs.length} sample rows)`);
  if (jobs && jobs.length > 0) {
    console.log('Sample import_jobs keys:', Object.keys(jobs[0]));
  }

  // 6. Check integrations / lead_sources / portal configs
  const { data: portalConfigs, error: pcErr } = await supabase.from('portal_integrations').select('*').limit(3);
  console.log('portal_integrations table:', pcErr ? `Note: ${pcErr.message}` : `OK (${portalConfigs.length} sample rows)`);
}

inspectDb().catch(console.error);
