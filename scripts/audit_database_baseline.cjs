const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://kwvlfslmviunwmmuajxb.supabase.co";
const supabaseAnonKey = "sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
  console.log('='.repeat(80));
  console.log('EDVIX CRM — DATABASE SCHEMA & RLS AUDIT BASELINE');
  console.log('='.repeat(80));

  // Authenticate as Super Admin
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  if (authErr) {
    console.error('Auth failed:', authErr);
    return;
  }
  console.log(`Authenticated as Super Admin: ${authData.user.email} (ID: ${authData.user.id})\n`);

  const tables = [
    'users', 'roles', 'leads', 'admissions', 'payments', 'tasks',
    'documents', 'audit_logs', 'ai_recommendations', 'ai_anomalies',
    'ai_manager_alerts', 'counselor_performance', 'departments'
  ];

  for (const tbl of tables) {
    console.log(`--- Table: ${tbl} ---`);
    const { data, error, count } = await supabase.from(tbl).select('*', { count: 'exact' }).limit(1);
    if (error) {
      console.log(`  Query error: ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`  Count: ${count}`);
      if (data && data.length > 0) {
        console.log(`  Columns (${Object.keys(data[0]).length}): ${Object.keys(data[0]).join(', ')}`);
      } else {
        console.log(`  Columns: Table is empty, checking empty select`);
        const { data: emptyData, error: eErr } = await supabase.from(tbl).select().limit(0);
        console.log(`  Empty select status:`, eErr ? eErr.message : 'OK');
      }
    }
  }

  // Check roles in roles table
  console.log('\n--- Roles in DB ---');
  const { data: roles } = await supabase.from('roles').select('id, name, permissions').limit(20);
  console.log(roles);

  // Check sample users and hierarchy
  console.log('\n--- Sample Users & Hierarchy Fields ---');
  const { data: sampleUsers } = await supabase
    .from('users')
    .select('id, name, full_name, email, role, role_id, department, designation, manager_id, is_active')
    .limit(10);
  console.log(sampleUsers);

  // Test unauthenticated access (RLS verification)
  console.log('\n--- Testing Unauthenticated Access (RLS Check) ---');
  const unauthClient = createClient(supabaseUrl, supabaseAnonKey);
  for (const tbl of ['users', 'leads', 'admissions', 'payments', 'tasks']) {
    const { data: uData, error: uErr, count: uCount } = await unauthClient.from(tbl).select('*', { count: 'exact', head: true });
    console.log(`  Unauthenticated query on ${tbl}: count=${uCount}, error=${uErr ? uErr.message : 'None'}`);
  }
}

inspectSchema().catch(console.error);
