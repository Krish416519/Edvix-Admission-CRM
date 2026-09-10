const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://kwvlfslmviunwmmuajxb.supabase.co";
const supabaseAnonKey = "sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectUsers() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  console.log('\n--- ALL USERS IN DB ---');
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, email, name, full_name, role_id, department, department_id, designation_id, manager_id, is_active');
  if (uErr) console.error('User query error:', uErr);
  console.log(users);

  console.log('\n--- ALL DEPARTMENTS ---');
  const { data: depts } = await supabase.from('departments').select('*');
  console.log(depts);

  console.log('\n--- ALL ROLES ---');
  const { data: roles } = await supabase.from('roles').select('id, name, is_system_admin, is_domain_admin');
  console.log(roles);

  // Check designations table if exists
  console.log('\n--- DESIGNATIONS TABLE ---');
  const { data: desigs, error: dErr } = await supabase.from('designations').select('*');
  if (dErr) console.log('Designations table error:', dErr.message);
  else console.log(desigs);
}

inspectUsers().catch(console.error);
