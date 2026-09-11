const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testExactQuery() {
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  console.log('User:', auth?.user?.id);

  const query1 = await supabase
    .from('automation_execution_logs')
    .select(`
      id, workflow_id, run_id, trigger_event, status,
      error_message, affected_lead_id, actions_executed,
      execution_time_ms, created_at,
      automation_workflows ( name ),
      automation_runs ( status, retry_count, payload )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  console.log('Query with automation_runs error:', query1.error);
  console.log('Query with automation_runs count:', query1.data?.length);

  // Test without automation_runs join
  const query2 = await supabase
    .from('automation_execution_logs')
    .select(`
      id, workflow_id, run_id, trigger_event, status,
      error_message, affected_lead_id, actions_executed,
      execution_time_ms, created_at,
      automation_workflows ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  console.log('Query without automation_runs error:', query2.error);
  console.log('Query without automation_runs count:', query2.data?.length);
}

testExactQuery();
