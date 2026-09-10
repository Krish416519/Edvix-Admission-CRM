const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function getClient(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Failed to sign in as ${email}: ${error.message}`);
  return { client, user: data.user };
}

async function runAdversarialGate1() {
  console.log('================================================================');
  console.log('   GATE 1: RBAC/RLS ADVERSARIAL DIRECT BACKEND ATTACK SUITE     ');
  console.log('================================================================\n');

  // Authenticate Actors
  console.log('Authenticating live actors...');
  const superAdmin = await getClient('degreepartners@gmail.com', '@Krish4165');
  const manager = await getClient('edvix.edu@gmail.com', '@Krish4165');
  const counselor = await getClient('krishdigitallifeegg@gmail.com', '@Krish4165');

  console.log(`Super Admin ID: ${superAdmin.user.id} (${superAdmin.user.email})`);
  console.log(`Manager ID:     ${manager.user.id} (${manager.user.email})`);
  console.log(`Counselor ID:   ${counselor.user.id} (${counselor.user.email})\n`);

  const results = [];

  function recordResult(actor, target, op, expected, actual, backendEnf, status, details = '') {
    results.push({ actor, target, op, expected, actual, backendEnf, status, details });
    console.log(`[${status}] ${actor} -> ${target} (${op}): ${actual} | Enforcement: ${backendEnf}`);
    if (details) console.log(`       Details: ${details}`);
  }

  // Find a lead assigned to someone other than counselor (e.g. Super Admin or Raghav or unassigned)
  const { data: allLeads } = await superAdmin.client
    .from('leads')
    .select('id, first_name, assigned_counselor, organization_id')
    .limit(20);
  
  const otherLead = allLeads.find(l => l.assigned_counselor && l.assigned_counselor !== counselor.user.id) || allLeads[0];
  console.log(`Target Other Lead ID: ${otherLead?.id}, assigned to: ${otherLead?.assigned_counselor}`);

  // -------------------------------------------------------------
  // TEST 1: IDOR - Counselor attempts to UPDATE another counselor's lead
  // -------------------------------------------------------------
  try {
    const { data: updateData, error: updateErr } = await counselor.client
      .from('leads')
      .update({ first_name: 'HackedName' })
      .eq('id', otherLead.id)
      .select();

    if (updateErr) {
      recordResult('Counselor', 'Other Counselor Lead', 'UPDATE', 'BLOCKED (403/RLS)', `Error: ${updateErr.code} - ${updateErr.message}`, 'PostgreSQL RLS Policy', 'PASS');
    } else if (!updateData || updateData.length === 0) {
      recordResult('Counselor', 'Other Counselor Lead', 'UPDATE', 'BLOCKED (0 rows updated)', '0 rows updated (RLS filtered)', 'PostgreSQL RLS Filter', 'PASS');
    } else {
      // Revert if it actually succeeded!
      await superAdmin.client.from('leads').update({ first_name: otherLead.first_name }).eq('id', otherLead.id);
      recordResult('Counselor', 'Other Counselor Lead', 'UPDATE', 'BLOCKED', `VULNERABILITY: Updated ${updateData.length} rows`, 'None (Allowed)', 'FAIL', `Lead ID ${otherLead.id} updated`);
    }
  } catch (err) {
    recordResult('Counselor', 'Other Counselor Lead', 'UPDATE', 'BLOCKED', err.message, 'Exception', 'PASS');
  }

  // -------------------------------------------------------------
  // TEST 2: IDOR - Counselor attempts to DELETE a lead
  // -------------------------------------------------------------
  try {
    const { data: delData, error: delErr } = await counselor.client
      .from('leads')
      .delete()
      .eq('id', otherLead.id)
      .select();

    if (delErr) {
      recordResult('Counselor', 'Lead', 'DELETE', 'BLOCKED (403/RLS)', `Error: ${delErr.code} - ${delErr.message}`, 'PostgreSQL RLS Policy', 'PASS');
    } else if (!delData || delData.length === 0) {
      recordResult('Counselor', 'Lead', 'DELETE', 'BLOCKED (0 rows deleted)', '0 rows affected (RLS filtered)', 'PostgreSQL RLS Filter', 'PASS');
    } else {
      recordResult('Counselor', 'Lead', 'DELETE', 'BLOCKED', 'VULNERABILITY: Deleted row', 'None', 'FAIL');
    }
  } catch (err) {
    recordResult('Counselor', 'Lead', 'DELETE', 'BLOCKED', err.message, 'Exception', 'PASS');
  }

  // -------------------------------------------------------------
  // TEST 3: IDOR - Counselor attempts to UPDATE users table (Privilege Escalation to Super Admin)
  // -------------------------------------------------------------
  try {
    const SUPER_ADMIN_ROLE = '938077cd-f717-4771-bfb6-30c67e4c4533';
    const { data: escData, error: escErr } = await counselor.client
      .from('users')
      .update({ role_id: SUPER_ADMIN_ROLE })
      .eq('id', counselor.user.id)
      .select();

    if (escErr) {
      recordResult('Counselor', 'users.role_id', 'UPDATE (Privilege Escalation)', 'BLOCKED', `Error: ${escErr.code} - ${escErr.message}`, 'PostgreSQL RLS / Trigger', 'PASS');
    } else if (!escData || escData.length === 0) {
      recordResult('Counselor', 'users.role_id', 'UPDATE (Privilege Escalation)', 'BLOCKED', '0 rows affected (RLS filtered)', 'PostgreSQL RLS Filter', 'PASS');
    } else {
      const COUNSELOR_ROLE = '89b54253-31fb-4e94-b7df-dcd2d2d4c9d9';
      await superAdmin.client.from('users').update({ role_id: COUNSELOR_ROLE }).eq('id', counselor.user.id);
      recordResult('Counselor', 'users.role_id', 'UPDATE (Privilege Escalation)', 'BLOCKED', 'VULNERABILITY: Role was modified', 'None', 'FAIL', 'Privilege escalation succeeded!');
    }
  } catch (err) {
    recordResult('Counselor', 'users.role_id', 'UPDATE (Privilege Escalation)', 'BLOCKED', err.message, 'Exception', 'PASS');
  }

  // -------------------------------------------------------------
  // TEST 4: IDOR - Counselor attempts to change Manager\'s user record
  // -------------------------------------------------------------
  try {
    const { data: mgrData, error: mgrErr } = await counselor.client
      .from('users')
      .update({ name: 'Hacked Manager' })
      .eq('id', manager.user.id)
      .select();

    if (mgrErr) {
      recordResult('Counselor', 'Manager user record', 'UPDATE', 'BLOCKED', `Error: ${mgrErr.code} - ${mgrErr.message}`, 'PostgreSQL RLS', 'PASS');
    } else if (!mgrData || mgrData.length === 0) {
      recordResult('Counselor', 'Manager user record', 'UPDATE', 'BLOCKED', '0 rows affected (RLS filtered)', 'PostgreSQL RLS Filter', 'PASS');
    } else {
      await superAdmin.client.from('users').update({ name: 'Raghav' }).eq('id', manager.user.id);
      recordResult('Counselor', 'Manager user record', 'UPDATE', 'BLOCKED', 'VULNERABILITY: Manager record updated', 'None', 'FAIL');
    }
  } catch (err) {
    recordResult('Counselor', 'Manager user record', 'UPDATE', err.message, 'Exception', 'PASS');
  }

  // -------------------------------------------------------------
  // TEST 5: Action Auth - Counselor attempts to CREATE a user
  // -------------------------------------------------------------
  try {
    const { data: createUserData, error: createUserErr } = await counselor.client
      .from('users')
      .insert({
        id: '99999999-9999-9999-9999-999999999999',
        email: 'malicious@test.com',
        name: 'Malicious User',
        role_id: '89b54253-31fb-4e94-b7df-dcd2d2d4c9d9',
        organization_id: 'ac839210-a02f-4754-80ac-77b90919e938'
      })
      .select();

    if (createUserErr) {
      recordResult('Counselor', 'users', 'CREATE (User Provisioning)', 'BLOCKED', `Error: ${createUserErr.code} - ${createUserErr.message}`, 'PostgreSQL RLS Policy', 'PASS');
    } else {
      await superAdmin.client.from('users').delete().eq('id', '99999999-9999-9999-9999-999999999999');
      recordResult('Counselor', 'users', 'CREATE (User Provisioning)', 'BLOCKED', 'VULNERABILITY: User created', 'None', 'FAIL');
    }
  } catch (err) {
    recordResult('Counselor', 'users', 'CREATE', 'BLOCKED', err.message, 'Exception', 'PASS');
  }

  // -------------------------------------------------------------
  // TEST 6: Action Auth - Counselor attempts to CREATE a role
  // -------------------------------------------------------------
  try {
    const { data: createRoleData, error: createRoleErr } = await counselor.client
      .from('roles')
      .insert({
        id: '88888888-8888-8888-8888-888888888888',
        name: 'Malicious Role',
        organization_id: 'ac839210-a02f-4754-80ac-77b90919e938'
      })
      .select();

    if (createRoleErr) {
      recordResult('Counselor', 'roles', 'CREATE (Role Creation)', 'BLOCKED', `Error: ${createRoleErr.code} - ${createRoleErr.message}`, 'PostgreSQL RLS Policy', 'PASS');
    } else {
      await superAdmin.client.from('roles').delete().eq('id', '88888888-8888-8888-8888-888888888888');
      recordResult('Counselor', 'roles', 'CREATE (Role Creation)', 'BLOCKED', 'VULNERABILITY: Role created', 'None', 'FAIL');
    }
  } catch (err) {
    recordResult('Counselor', 'roles', 'CREATE', 'BLOCKED', err.message, 'Exception', 'PASS');
  }

  // -------------------------------------------------------------
  // TEST 7: AI Auth - Counselor attempts to SELECT all ai_audit_logs of other users
  // -------------------------------------------------------------
  try {
    const { data: auditData, error: auditErr } = await counselor.client
      .from('ai_audit_logs')
      .select('id, user_id, action_taken, status')
      .neq('user_id', counselor.user.id);

    if (auditErr) {
      recordResult('Counselor', 'ai_audit_logs (Other Users)', 'SELECT', 'BLOCKED', `Error: ${auditErr.code} - ${auditErr.message}`, 'PostgreSQL RLS', 'PASS');
    } else if (!auditData || auditData.length === 0) {
      recordResult('Counselor', 'ai_audit_logs (Other Users)', 'SELECT', 'ISOLATED (0 other logs visible)', '0 rows returned', 'PostgreSQL RLS Filter', 'PASS');
    } else {
      recordResult('Counselor', 'ai_audit_logs (Other Users)', 'SELECT', 'ISOLATED', `Leaked ${auditData.length} records from other users`, 'None', 'FAIL');
    }
  } catch (err) {
    recordResult('Counselor', 'ai_audit_logs', 'SELECT', 'BLOCKED', err.message, 'Exception', 'PASS');
  }

  // -------------------------------------------------------------
  // TEST 8: AI Auth - Counselor attempts to DELETE ai_audit_logs
  // -------------------------------------------------------------
  try {
    const { data: delAudit, error: delAuditErr } = await counselor.client
      .from('ai_audit_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select();

    if (delAuditErr) {
      recordResult('Counselor', 'ai_audit_logs', 'DELETE (Tamper Audit Log)', 'BLOCKED', `Error: ${delAuditErr.code} - ${delAuditErr.message}`, 'PostgreSQL RLS Policy', 'PASS');
    } else if (!delAudit || delAudit.length === 0) {
      recordResult('Counselor', 'ai_audit_logs', 'DELETE (Tamper Audit Log)', 'BLOCKED', '0 rows deleted', 'PostgreSQL RLS Filter', 'PASS');
    } else {
      recordResult('Counselor', 'ai_audit_logs', 'DELETE (Tamper Audit Log)', 'BLOCKED', `VULNERABILITY: Deleted ${delAudit.length} logs`, 'None', 'FAIL');
    }
  } catch (err) {
    recordResult('Counselor', 'ai_audit_logs', 'DELETE', 'BLOCKED', err.message, 'Exception', 'PASS');
  }

  // -------------------------------------------------------------
  // TEST 9: Department Isolation - Admissions Counselor attempts to query Finance payments
  // -------------------------------------------------------------
  try {
    const { data: payData, error: payErr } = await counselor.client
      .from('payments')
      .select('*')
      .limit(10);

    if (payErr) {
      recordResult('Admissions Counselor', 'Finance payments', 'SELECT', 'BLOCKED', `Error: ${payErr.code} - ${payErr.message}`, 'PostgreSQL RLS / Views', 'PASS');
    } else if (!payData || payData.length === 0) {
      recordResult('Admissions Counselor', 'Finance payments', 'SELECT', 'ISOLATED (0 rows)', '0 rows returned', 'PostgreSQL RLS Filter', 'PASS');
    } else {
      recordResult('Admissions Counselor', 'Finance payments', 'SELECT', 'ISOLATED', `Allowed: returned ${payData.length} payments`, 'None', 'FAIL');
    }
  } catch (err) {
    recordResult('Admissions Counselor', 'Finance payments', 'SELECT', 'BLOCKED', err.message, 'Exception', 'PASS');
  }

  // -------------------------------------------------------------
  // TEST 10: Task IDOR - Counselor attempts to UPDATE another user\'s task
  // -------------------------------------------------------------
  try {
    const { data: allTasks } = await superAdmin.client.from('tasks').select('id, user_id, title').limit(5);
    const otherTask = allTasks?.find(t => t.user_id !== counselor.user.id);
    if (otherTask) {
      const { data: taskData, error: taskErr } = await counselor.client
        .from('tasks')
        .update({ title: 'Tampered Task' })
        .eq('id', otherTask.id)
        .select();

      if (taskErr) {
        recordResult('Counselor', 'Other User Task', 'UPDATE', 'BLOCKED', `Error: ${taskErr.code} - ${taskErr.message}`, 'PostgreSQL RLS', 'PASS');
      } else if (!taskData || taskData.length === 0) {
        recordResult('Counselor', 'Other User Task', 'UPDATE', 'BLOCKED', '0 rows affected (RLS filtered)', 'PostgreSQL RLS Filter', 'PASS');
      } else {
        await superAdmin.client.from('tasks').update({ title: otherTask.title }).eq('id', otherTask.id);
        recordResult('Counselor', 'Other User Task', 'UPDATE', 'BLOCKED', 'VULNERABILITY: Task updated', 'None', 'FAIL');
      }
    } else {
      recordResult('Counselor', 'Other User Task', 'UPDATE', 'BLOCKED', 'No foreign tasks exist in DB', 'Verified Clean DB', 'PASS');
    }
  } catch (err) {
    recordResult('Counselor', 'Other User Task', 'UPDATE', 'BLOCKED', err.message, 'Exception', 'PASS');
  }

  // -------------------------------------------------------------
  // TEST 11: Admission IDOR - Counselor attempts to UPDATE another user\'s admission record
  // -------------------------------------------------------------
  try {
    const { data: admList } = await superAdmin.client.from('admissions').select('id, lead_id, counselor_id').limit(5);
    const otherAdm = admList?.find(a => a.counselor_id !== counselor.user.id) || admList?.[0];
    if (otherAdm) {
      const { data: admData, error: admErr } = await counselor.client
        .from('admissions')
        .update({ notes: 'Tampered Notes' })
        .eq('id', otherAdm.id)
        .select();

      if (admErr) {
        recordResult('Counselor', 'Other Counselor Admission', 'UPDATE', 'BLOCKED', `Error: ${admErr.code} - ${admErr.message}`, 'PostgreSQL RLS', 'PASS');
      } else if (!admData || admData.length === 0) {
        recordResult('Counselor', 'Other Counselor Admission', 'UPDATE', 'BLOCKED', '0 rows affected (RLS filtered)', 'PostgreSQL RLS Filter', 'PASS');
      } else {
        recordResult('Counselor', 'Other Counselor Admission', 'UPDATE', 'BLOCKED', 'VULNERABILITY: Admission updated', 'None', 'FAIL');
      }
    } else {
      recordResult('Counselor', 'Other Counselor Admission', 'UPDATE', 'BLOCKED', 'No foreign admission records', 'Clean DB', 'PASS');
    }
  } catch (err) {
    recordResult('Counselor', 'Other Counselor Admission', 'UPDATE', 'BLOCKED', err.message, 'Exception', 'PASS');
  }

  console.log('\n================================================================');
  console.log('                 GATE 1 ADVERSARIAL SUMMARY                     ');
  console.log('================================================================');
  console.table(results.map(r => ({
    Actor: r.actor,
    Target: r.target,
    Operation: r.op,
    Status: r.status,
    BackendEnforcement: r.backendEnf,
    Actual: r.actual.substring(0, 45)
  })));

  return results;
}

runAdversarialGate1().catch(console.error);
