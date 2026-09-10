const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://kwvlfslmviunwmmuajxb.supabase.co",
  "sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE"
);

async function printUsers() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const { data: users } = await supabase.from('users').select(`
    id, email, name, full_name, role_id, department_id, designation_id, manager_id, is_active
  `);

  const { data: roles } = await supabase.from('roles').select('id, name');
  const { data: desigs } = await supabase.from('designations').select('id, name, level, department_id');
  const { data: depts } = await supabase.from('departments').select('id, name');

  const roleMap = new Map((roles || []).map(r => [r.id, r.name]));
  const desigMap = new Map((desigs || []).map(d => [d.id, d]));
  const deptMap = new Map((depts || []).map(dp => [dp.id, dp.name]));

  console.log('='.repeat(80));
  console.log('USER DIRECTORY AUDIT (ALL 6 DB USERS)');
  console.log('='.repeat(80));

  users.forEach(u => {
    const desig = desigMap.get(u.designation_id);
    const dept = deptMap.get(u.department_id);
    const roleName = roleMap.get(u.role_id);
    console.log({
      id: u.id,
      name: u.full_name || u.name,
      email: u.email,
      role: roleName,
      department: dept || 'None',
      designation: desig ? `${desig.name} (L${desig.level})` : 'None',
      manager_id: u.manager_id || 'NULL',
      is_active: u.is_active
    });
  });
}

printUsers().catch(console.error);
