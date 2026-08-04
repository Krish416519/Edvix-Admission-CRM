const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runE2EValidation() {
  console.log('🚀 Starting End-to-End Database & API Validation...\n');
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      results.passed++;
    } catch (error) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   Error: ${error.message}`);
      results.failed++;
      results.errors.push({ name, error: error.message });
    }
  };

  // 1. Check core users table fields
  await test('Users table contains team and manager_id fields', async () => {
    const { data, error } = await supabase.from('users').select('team, manager_id').limit(1);
    if (error && error.code === '42703') throw new Error('Missing team or manager_id columns');
    if (error) throw error;
  });

  // 2. Check security_events table access and insert
  await test('security_events table allows inserts and reads', async () => {
    const { error: insertError } = await supabase.from('security_events').insert({
      type: 'E2E Test',
      ip_address: '127.0.0.1',
      status: 'Resolved'
    });
    if (insertError) throw insertError;
    
    const { data, error: readError } = await supabase.from('security_events').select('*').limit(1);
    if (readError) throw readError;
    if (!data || data.length === 0) throw new Error('Could not read from security_events');
  });

  // 3. Check system_logs table access
  await test('system_logs table allows inserts and reads', async () => {
    const { error: insertError } = await supabase.from('system_logs').insert({
      level: 'Info',
      service: 'E2E Validator',
      message: 'Test log'
    });
    if (insertError) throw insertError;
    
    const { data, error: readError } = await supabase.from('system_logs').select('*').limit(1);
    if (readError) throw readError;
  });

  // 4. Check ai_settings table
  await test('ai_settings table exists and is readable', async () => {
    const { data, error } = await supabase.from('ai_settings').select('*').limit(1);
    if (error) throw error;
  });

  // 5. Check Lead Assignment RPC
  await test('Lead Assignment RPC exists (assign_lead)', async () => {
    const { error } = await supabase.rpc('assign_lead', { 
      p_lead_id: '00000000-0000-0000-0000-000000000000', 
      p_assignee_id: '00000000-0000-0000-0000-000000000000',
      p_assigned_by: '00000000-0000-0000-0000-000000000000'
    });
    // We expect a 22P02 invalid input syntax error or something if UUIDs are fake, 
    // but if it says "Could not find the function", that's a failure.
    if (error && error.message.includes('Could not find the function')) {
      throw error;
    }
  });

  // 6. Check Admin Dashboard Metrics RPC
  await test('Admin Dashboard Metrics RPC exists (get_admin_dashboard_metrics)', async () => {
    const { data, error } = await supabase.rpc('get_admin_dashboard_metrics');
    if (error && error.message.includes('Could not find the function')) {
      throw error;
    }
  });

  console.log('\n=============================================');
  console.log(`E2E Validation Complete: ${results.passed} Passed, ${results.failed} Failed`);
  console.log('=============================================');
  
  if (results.failed > 0) {
    process.exit(1);
  }
}

runE2EValidation();
