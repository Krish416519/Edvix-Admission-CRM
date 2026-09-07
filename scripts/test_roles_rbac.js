import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRoles() {
  console.log('=== MULTI-ROLE RBAC & DATA SCOPING AUDIT ===\n');

  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  // 1. Fetch all roles and their permissions
  const { data: roles } = await supabase.from('roles').select('id, name, is_system_admin, is_domain_admin');
  console.log('Total Roles in system:', roles?.length);

  // 2. Fetch all access profiles
  const { data: profiles } = await supabase.from('access_profiles').select('id, name, data_scope, is_system_profile');
  console.log('Total Access Profiles:', profiles?.length);
  profiles?.forEach(p => console.log(`   - ${p.name} -> Data Scope: ${p.data_scope} (System: ${p.is_system_profile})`));

  // 3. Check role-permission mappings
  const { data: rolePerms } = await supabase.from('role_permissions').select('role_id, permission_id, permissions(action, resource)');
  console.log(`\nTotal Role-Permission grants: ${rolePerms?.length || 0}`);

  // 4. Check profile-permission mappings
  const { data: profPerms } = await supabase.from('access_profile_permissions').select('access_profile_id, permission_id, permissions(action, resource)');
  console.log(`Total Access Profile-Permission grants: ${profPerms?.length || 0}`);

  // 5. Test Counselor data scoping simulation
  // A counselor has effective_scope: 'ASSIGNED'
  const counselorId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'; // User A (Counselor)
  const { count: counselorLeadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_counselor', counselorId);

  console.log(`\nCounselor ${counselorId} assigned leads: ${counselorLeadsCount || 0}`);

  // 6. Test Admission Manager data scoping simulation
  // An admission manager has effective_scope: 'DEPARTMENT'
  const { count: admissionsLeadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log(`Admissions total leads: ${admissionsLeadsCount || 0}`);

  console.log('\n=== RBAC AUDIT COMPLETE ===');
}

testRoles().catch(console.error);
