const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kwvlfslmviunwmmuajxb.supabase.co",
  "sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE"
);

async function reconcilePerformance() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  // Canonical leads
  const { data: leads } = await supabase
    .from('leads')
    .select('id, assigned_counselor, lead_status, temperature, budget, created_at')
    .is('deleted_at', null);

  const counselorCounts = {};
  leads.forEach(l => {
    const cId = l.assigned_counselor || 'UNASSIGNED';
    if (!counselorCounts[cId]) {
      counselorCounts[cId] = { total: 0, admitted: 0, hot: 0, warm: 0, cold: 0 };
    }
    counselorCounts[cId].total++;
    if (l.lead_status === 'Admitted' || l.lead_status === 'Admission Done') counselorCounts[cId].admitted++;
    if (l.temperature === 'Hot' || l.lead_status === 'Hot') counselorCounts[cId].hot++;
    else if (l.temperature === 'Warm' || l.lead_status === 'Warm') counselorCounts[cId].warm++;
    else counselorCounts[cId].cold++;
  });

  console.log('='.repeat(80));
  console.log('CANONICAL LEADS PER COUNSELOR (FROM DATABASE)');
  console.log('='.repeat(80));
  console.log(counselorCounts);

  // Canonical tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, task_type, status, due_date, assigned_user')
    .neq('status', 'Completed')
    .is('deleted_at', null);

  const todayStr = new Date().toISOString().split('T')[0];
  const callsDue = tasks.filter(t => t.task_type === 'Call' && t.due_date <= todayStr).length;
  const followupsDue = tasks.filter(t => t.due_date <= todayStr).length;

  console.log('\nCANONICAL TASKS METRICS:');
  console.log({ totalIncompleteTasks: tasks.length, callsDueToday: callsDue, followupsDueToday: followupsDue });

  // Admissions
  const { data: adms } = await supabase.from('admissions').select('id, lead_id, assigned_counselor, fee_structure, expected_revenue, admission_status');
  console.log('\nCANONICAL ADMISSIONS:');
  console.log(adms);
}

reconcilePerformance().catch(console.error);
