import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  console.log('=== EDVIX CRM SYSTEM AUDIT: DATA INTEGRITY & BASELINES ===\n');

  // Authenticate as Super Admin
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  if (authErr) {
    console.error('❌ Super Admin auth failed:', authErr.message);
  } else {
    console.log('✅ Authenticated successfully as:', authData.user?.email);
  }

  // 1. Users & Roles
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select(`
      id, email, name, is_active, role_id, access_profile_id, 
      department_id, designation_id, team_id, manager_id, effective_scope,
      department:departments(name),
      designation:designations(name, level),
      team:teams(name),
      access_profile:access_profiles(name, permissions)
    `);

  if (uErr) {
    console.error('❌ Error fetching users:', uErr.message);
  } else {
    console.log(`✅ Users found: ${users.length}`);
    users.forEach((u, i) => {
      console.log(`   [${i+1}] ${u.name} (${u.email})`);
      console.log(`       Active: ${u.is_active} | Scope: ${u.effective_scope}`);
      console.log(`       Dept: ${u.department?.name || 'None'} | Designation: ${u.designation?.name || 'None'}`);
      console.log(`       Team: ${u.team?.name || 'None'} | Profile: ${u.access_profile?.name || 'None'}`);
    });
  }

  // 2. Departments, Designations, Teams
  const { data: depts } = await supabase.from('departments').select('id, name, code, is_active');
  console.log(`\n✅ Departments (${depts?.length || 0}):`, depts?.map(d => `${d.name} (${d.code})`).join(', '));

  const { data: desigs } = await supabase.from('designations').select('id, name, level, department_id');
  console.log(`✅ Designations (${desigs?.length || 0}):`, desigs?.map(d => `${d.name} (L${d.level})`).join(', '));

  const { data: teams } = await supabase.from('teams').select('id, name, department_id');
  console.log(`✅ Teams (${teams?.length || 0}):`, teams?.map(t => t.name).join(', '));

  // 3. Dispositions & Categories
  const { data: categories, error: cErr } = await supabase
    .from('disposition_categories')
    .select('id, name, code, crm_context, is_active, order_index')
    .order('order_index');

  if (cErr) {
    console.error('❌ Error fetching disposition_categories:', cErr.message);
  } else {
    console.log(`\n✅ Disposition Categories (${categories?.length || 0}):`);
    categories?.forEach(c => console.log(`   - [${c.code}] ${c.name} (Context: ${c.crm_context}, Active: ${c.is_active})`));
  }

  const { data: disps, error: dErr } = await supabase
    .from('dispositions')
    .select('id, name, code, category_id, stage_mapping, is_active, is_sub_disposition, parent_id');
  
  if (dErr) {
    console.error('❌ Error fetching dispositions:', dErr.message);
  } else {
    console.log(`\n✅ Dispositions configured: ${disps?.length || 0}`);
    const rootDisps = disps?.filter(d => !d.is_sub_disposition) || [];
    const subDisps = disps?.filter(d => d.is_sub_disposition) || [];
    console.log(`   Root: ${rootDisps.length} | Sub-dispositions: ${subDisps.length}`);
    rootDisps.slice(0, 10).forEach(d => console.log(`   - ${d.name} -> stage: ${d.stage_mapping}`));
  }

  // 4. Leads Overview
  const { count: leadCount, error: lErr } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅ Total Leads in database: ${leadCount || 0}`);

  const { data: stageCounts } = await supabase
    .from('leads')
    .select('stage');
  
  if (stageCounts) {
    const counts = {};
    stageCounts.forEach(l => {
      const s = l.stage || 'UNASSIGNED';
      counts[s] = (counts[s] || 0) + 1;
    });
    console.log('   Stage Distribution:', JSON.stringify(counts, null, 2));
  }

  console.log('\n=== AUDIT DATA CHECK COMPLETE ===');
}

runAudit().catch(console.error);
