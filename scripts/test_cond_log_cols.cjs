const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectColumns() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const wfId = '8f59d0e5-4e74-4847-9c96-d629eb0c85b7';

  // Test insert into automation_conditions
  console.log('Testing automation_conditions insert:');
  const { data: condData, error: condErr } = await supabase.from('automation_conditions').insert({
    workflow_id: wfId,
    field: 'lead.status',
    operator: 'equals',
    value_text: 'Qualified',
    logic: 'AND',
    sort_order: 1
  }).select().single();
  console.log('Cond insert result:', condData, 'Error:', condErr);
  if (condData) {
    await supabase.from('automation_conditions').delete().eq('id', condData.id);
  }

  // Test insert into automation_execution_logs
  console.log('Testing automation_execution_logs insert:');
  const { data: logData, error: logErr } = await supabase.from('automation_execution_logs').insert({
    workflow_id: wfId,
    trigger_event: 'lead.qualified',
    status: 'Success',
    execution_time_ms: 120,
    actions_executed: ['ai_generate', 'whatsapp_send']
  }).select().single();
  console.log('Log insert result:', logData, 'Error:', logErr);
  if (logData) {
    console.log('Log columns:', Object.keys(logData));
    await supabase.from('automation_execution_logs').delete().eq('id', logData.id);
  }
}

inspectColumns();
