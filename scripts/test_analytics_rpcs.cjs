const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kwvlfslmviunwmmuajxb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAllRPCs() {
  console.log('Testing 15 Analytics RPCs...\n');

  // Sign in as degreepartners@gmail.com to test authenticated execution
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  if (authError) {
    console.error('Auth failed:', authError.message);
    return;
  }
  console.log('✅ Authenticated successfully as:', authData.user.email);

  const rpcs = [
    { name: 'get_analytics_kpis', params: {} },
    { name: 'get_admissions_pipeline', params: {} },
    { name: 'get_lead_source_breakdown', params: {} },
    { name: 'get_university_performance', params: {} },
    { name: 'get_course_performance', params: {} },
    { name: 'get_counselor_performance', params: {} },
    { name: 'get_conversion_funnel', params: {} },
    { name: 'get_weekly_trend', params: {} },
    { name: 'get_monthly_trend', params: {} },
    { name: 'get_daily_leads_trend', params: {} },
    { name: 'get_finance_analytics', params: {} },
    { name: 'get_task_analytics', params: {} },
    { name: 'get_lead_aging_report', params: {} },
    { name: 'get_leads_by_state', params: {} },
    { name: 'get_payment_method_distribution', params: {} }
  ];

  for (const r of rpcs) {
    const { data, error } = await supabase.rpc(r.name, r.params);
    if (error) {
      console.log(`❌ ${r.name}: ERROR - ${error.message} (code: ${error.code})`);
    } else {
      const summary = Array.isArray(data) ? `Array(${data.length})` : typeof data === 'object' ? JSON.stringify(data).slice(0, 100) + '...' : data;
      console.log(`✅ ${r.name}: OK -> ${summary}`);
    }
  }

  // Also test ai_recommendations query
  console.log('\nTesting ai_recommendations table:');
  const { data: aiData, error: aiError } = await supabase.from('ai_recommendations').select('*').limit(5);
  if (aiError) {
    console.log(`❌ ai_recommendations: ERROR - ${aiError.message}`);
  } else {
    console.log(`✅ ai_recommendations: OK -> count: ${aiData.length}`, aiData[0] ? Object.keys(aiData[0]) : 'empty table');
  }

  // Also test lead_dispositions or calls for dispositions analytics
  console.log('\nTesting calls/dispositions table:');
  const { data: callData, error: callError } = await supabase.from('call_logs').select('*').limit(5);
  if (callError) {
    console.log(`❌ call_logs: ERROR - ${callError.message}`);
  } else {
    console.log(`✅ call_logs: OK -> count: ${callData.length}`);
  }

  const { data: leadsDisp, error: dispError } = await supabase.from('leads').select('id, lead_status, lead_source, stage').limit(5);
  if (dispError) {
    console.log(`❌ leads: ERROR - ${dispError.message}`);
  } else {
    console.log(`✅ leads sample: count: ${leadsDisp.length}`);
  }
}

testAllRPCs().catch(console.error);
