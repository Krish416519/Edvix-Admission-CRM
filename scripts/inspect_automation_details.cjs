const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectAllTables() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const orgId = 'ac839210-a02f-4754-80ac-77b90919e938';

  // 1. automation_conditions
  console.log('--- automation_conditions ---');
  const { data: condData, error: condErr } = await supabase.from('automation_conditions').select('*').limit(1);
  console.log('Sample cond:', condData, 'Error:', condErr);

  // 2. automation_actions
  console.log('--- automation_actions ---');
  const { data: actData, error: actErr } = await supabase.from('automation_actions').select('*').limit(1);
  console.log('Sample action:', actData, 'Error:', actErr);

  // 3. automation_execution_logs
  console.log('--- automation_execution_logs ---');
  const { data: logData, error: logErr } = await supabase.from('automation_execution_logs').select('*').limit(1);
  console.log('Sample log:', logData, 'Error:', logErr);

  // 4. automation_runs
  console.log('--- automation_runs ---');
  const { data: runData, error: runErr } = await supabase.from('automation_runs').select('*').limit(1);
  console.log('Sample run:', runData, 'Error:', runErr);

  // Check the existing workflow conditions and actions
  const wfId = '8f59d0e5-4e74-4847-9c96-d629eb0c85b7';
  const { data: existingConditions } = await supabase.from('automation_conditions').select('*').eq('workflow_id', wfId);
  console.log('Existing conditions for wf:', existingConditions);
  const { data: existingActions } = await supabase.from('automation_actions').select('*').eq('workflow_id', wfId);
  console.log('Existing actions for wf:', existingActions);
}

inspectAllTables();
