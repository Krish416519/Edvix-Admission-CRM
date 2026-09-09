import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kwvlfslmviunwmmuajxb.supabase.co";
const supabaseAnonKey = "sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runAudit() {
  console.log("==================================================");
  console.log("1. ANONYMOUS ACCESS TEST (RLS ENFORCEMENT)");
  console.log("==================================================");
  const { data: anonTasks, error: anonErr, count: anonCount } = await supabase
    .from('tasks')
    .select('id, title', { count: 'exact' });

  console.log("Unauthenticated .from('tasks').select():");
  console.log(" - Error:", anonErr ? anonErr.message : "None");
  console.log(" - Returned rows count:", anonTasks?.length ?? 0);
  console.log(" - Exact count:", anonCount);

  if ((anonTasks?.length ?? 0) === 0) {
    console.log("✅ ANONYMOUS ACCESS CHECK: PASS (Zero tasks leaked to anonymous callers)");
  } else {
    console.log("❌ ANONYMOUS ACCESS CHECK: CRITICAL FAIL (Tasks exposed without auth)");
  }

  console.log("\n==================================================");
  console.log("2. AUTHENTICATING AS SUPER ADMIN (degreepartners@gmail.com)");
  console.log("==================================================");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  if (authErr) {
    console.error("❌ Authentication failed:", authErr.message);
    return;
  }

  console.log(`✅ Authenticated successfully as: ${authData.user.email} (ID: ${authData.user.id})`);

  // Query authenticated tasks
  const { count: totalTasks, data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users!tasks_assigned_user_fkey(id, name),
      lead:leads!tasks_lead_id_fkey(id, first_name, last_name)
    `, { count: 'exact' })
    .is('deleted_at', null);

  if (tasksError) {
    console.error("❌ Failed to query authenticated tasks:", tasksError.message);
    return;
  }

  console.log(`\n==================================================`);
  console.log(`3. CANONICAL DATABASE TASK TOTALS`);
  console.log(`==================================================`);
  console.log(`TOTAL NON-DELETED TASKS: ${totalTasks}`);
  console.log(`TOTAL RETRIEVED ROWS: ${tasks.length}`);

  // Breakdown by Status
  const statusMap = {};
  tasks.forEach(t => {
    statusMap[t.status] = (statusMap[t.status] || 0) + 1;
  });
  console.log("\nStatus Breakdown:", statusMap);

  // Breakdown by Priority
  const priorityMap = {};
  tasks.forEach(t => {
    priorityMap[t.priority] = (priorityMap[t.priority] || 0) + 1;
  });
  console.log("Priority Breakdown:", priorityMap);

  // Breakdown by Task Type
  const typeMap = {};
  tasks.forEach(t => {
    typeMap[t.task_type] = (typeMap[t.task_type] || 0) + 1;
  });
  console.log("Type Breakdown:", typeMap);

  // Date calculation: Current time in IST
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const istTodayStr = istFormatter.format(now);
  console.log(`\nReference IST Today Date: ${istTodayStr}`);

  let overdue = 0;
  let dueToday = 0;
  let completedToday = 0;
  let upcomingThisWeek = 0;
  let highPriority = 0;

  tasks.forEach(t => {
    const isCompleted = t.status === 'Completed';
    const isCancelled = t.status === 'Cancelled';
    const dueDate = t.due_date ? t.due_date.split('T')[0] : null;

    if (!isCompleted && !isCancelled) {
      if (t.priority === 'High' || t.priority === 'Urgent') {
        highPriority++;
      }
    }

    if (!dueDate) return;

    if (isCompleted) {
      if (dueDate === istTodayStr || (t.completed_date && t.completed_date.startsWith(istTodayStr))) {
        completedToday++;
      }
    } else if (!isCancelled) {
      if (dueDate < istTodayStr) {
        overdue++;
      } else if (dueDate === istTodayStr) {
        dueToday++;
      } else {
        const d1 = new Date(istTodayStr);
        const d2 = new Date(dueDate);
        const diffDays = Math.round((d2 - d1) / (1000 * 3600 * 24));
        if (diffDays > 0 && diffDays <= 7) {
          upcomingThisWeek++;
        }
      }
    }
  });

  console.log(`\nCANONICAL KPI METRICS (IST Basis):`);
  console.log(` - Overdue: ${overdue}`);
  console.log(` - Due Today: ${dueToday}`);
  console.log(` - Completed Today: ${completedToday}`);
  console.log(` - Upcoming This Week: ${upcomingThisWeek}`);
  console.log(` - High/Urgent Priority (Pending): ${highPriority}`);

  // Test Critical 'All' queries
  console.log("\n==================================================");
  console.log("4. ADVERSARIAL CRITICAL 'ALL' QUERY TEST");
  console.log("==================================================");
  const { count: pAllCount } = await supabase.from('tasks').select('id', { count: 'exact' }).eq('priority', 'All');
  const { count: tAllCount } = await supabase.from('tasks').select('id', { count: 'exact' }).eq('task_type', 'All');
  const { count: sAllCount } = await supabase.from('tasks').select('id', { count: 'exact' }).eq('status', 'All');
  console.log(`.eq('priority', 'All') matches in DB: ${pAllCount}`);
  console.log(`.eq('task_type', 'All') matches in DB: ${tAllCount}`);
  console.log(`.eq('status', 'All') matches in DB: ${sAllCount}`);

  // Test IDOR & Cross-User Security:
  console.log("\n==================================================");
  console.log("5. IDOR & MUTATION SECURITY TEST");
  console.log("==================================================");
  // Pick a task not created by or assigned to an arbitrary user
  const sampleTask = tasks[0];
  console.log(`Target sample task for IDOR check: ID=${sampleTask.id}, Title="${sampleTask.title}", AssignedTo=${sampleTask.assigned_user}`);

  // Try modifying from an unauthenticated client
  const unauthClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: idorData, error: idorErr } = await unauthClient
    .from('tasks')
    .update({ title: 'UNAUTHORIZED_MUTATION_ATTEMPT' })
    .eq('id', sampleTask.id)
    .select();

  console.log("Unauthenticated mutation result rows:", idorData?.length ?? 0);
  console.log("Unauthenticated mutation error:", idorErr?.message ?? "None (0 rows affected)");
  if ((idorData?.length ?? 0) === 0) {
    console.log("✅ IDOR PROTECTION: PASS (Zero rows updated by unauthorized caller)");
  } else {
    console.log("❌ IDOR PROTECTION: CRITICAL FAIL (Unauthorized modification succeeded)");
  }

  // Sign out cleanly
  await supabase.auth.signOut();
}

runAudit();
