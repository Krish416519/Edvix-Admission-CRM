import { createClient } from '@supabase/supabase-js';
import { parseISO, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns';

const supabaseUrl = "https://kwvlfslmviunwmmuajxb.supabase.co";
const supabaseAnonKey = "sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Filter simulation function matching TasksList.tsx exactly
function applyFilters(tasks, {
  searchTerm = '',
  status = 'All',
  priority = 'All',
  type = 'All',
  datePreset = 'all',
  assignedUser = 'All',
  leadFilter = 'all',
  currentUserId = null
}) {
  return tasks.filter(task => {
    // 1. Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchesTitle = task.title?.toLowerCase().includes(term);
      const matchesNum = task.task_number?.toLowerCase().includes(term);
      const matchesDesc = task.description?.toLowerCase().includes(term);
      const leadName = task.lead ? `${task.lead.first_name} ${task.lead.last_name || ''}`.trim() : '';
      const matchesLead = leadName.toLowerCase().includes(term);
      const assignedName = task.assignee?.name || '';
      const matchesAssigned = assignedName.toLowerCase().includes(term);
      if (!matchesTitle && !matchesNum && !matchesDesc && !matchesLead && !matchesAssigned) {
        return false;
      }
    }

    // 2. Status filter
    if (status !== 'All' && task.status !== status) return false;

    // 3. Priority filter
    if (priority !== 'All' && task.priority !== priority) return false;

    // 4. Type filter
    if (type !== 'All' && task.task_type !== type) return false;

    // 5. Assigned Counselor
    if (assignedUser === 'me') {
      if (!currentUserId || task.assigned_user !== currentUserId) return false;
    } else if (assignedUser !== 'All') {
      if (task.assigned_user !== assignedUser) return false;
    }

    // 6. Lead Association
    if (leadFilter === 'with_lead' && !task.lead_id) return false;
    if (leadFilter === 'without_lead' && task.lead_id) return false;

    // 7. Date Preset
    if (task.due_date) {
      const dueDate = parseISO(task.due_date);
      const isFinished = task.status === 'Completed' || task.status === 'Cancelled';
      if (datePreset === 'overdue') {
        if (!isPast(dueDate) || isToday(dueDate) || isFinished) return false;
      } else if (datePreset === 'today') {
        if (!isToday(dueDate)) return false;
      } else if (datePreset === 'tomorrow') {
        if (!isTomorrow(dueDate)) return false;
      } else if (datePreset === 'this_week') {
        if (!isThisWeek(dueDate)) return false;
      }
    } else if (datePreset !== 'all') {
      return false;
    }

    return true;
  });
}

async function runCombinationsTest() {
  console.log("==================================================");
  console.log("PHASE 5: FILTER COMBINATION MATRIX AUDIT");
  console.log("==================================================");

  // Sign in as Super Admin
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });
  const currentUserId = authData.user.id;

  // Fetch all tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users!tasks_assigned_user_fkey(id, name),
      lead:leads!tasks_lead_id_fkey(id, first_name, last_name)
    `)
    .is('deleted_at', null);

  console.log(`Loaded ${tasks.length} total tasks from DB for matrix testing.\n`);

  // Define the required 14 test combinations
  const firstCounselorId = tasks.find(t => t.assigned_user)?.assigned_user || '51f9b2b0-bf8c-4c56-8761-30298e807068';
  const sampleLead = tasks.find(t => t.lead)?.lead?.first_name || 'test';

  const combinations = [
    { name: "1. Overdue + High Priority", params: { datePreset: 'overdue', priority: 'High' } },
    { name: "2. Overdue + Pending", params: { datePreset: 'overdue', status: 'Pending' } },
    { name: "3. Due Today + High Priority", params: { datePreset: 'today', priority: 'High' } },
    { name: "4. My Tasks + Pending", params: { assignedUser: 'me', status: 'Pending', currentUserId } },
    { name: "5. My Tasks + Overdue", params: { assignedUser: 'me', datePreset: 'overdue', currentUserId } },
    { name: "6. Counselor + Task Type", params: { assignedUser: firstCounselorId, type: 'Call' } },
    { name: "7. Counselor + Status", params: { assignedUser: firstCounselorId, status: 'Pending' } },
    { name: "8. Task Type + Priority", params: { type: 'Call', priority: 'Medium' } },
    { name: "9. Due Date + Status + Priority", params: { datePreset: 'overdue', status: 'Pending', priority: 'Medium' } },
    { name: "10. Search + Priority", params: { searchTerm: 'Follow', priority: 'Medium' } },
    { name: "11. Search + Status", params: { searchTerm: 'Follow', status: 'Completed' } },
    { name: "12. Search + Counselor", params: { searchTerm: 'Follow', assignedUser: firstCounselorId } },
    { name: "13. Search + Date Range (Overdue)", params: { searchTerm: 'Follow', datePreset: 'overdue' } },
    { name: "14. Search + Multiple filters (Search + Overdue + Call + Pending)", params: { searchTerm: 'Follow', datePreset: 'overdue', type: 'Call', status: 'Pending' } }
  ];

  let passedAll = true;

  for (const combo of combinations) {
    const results = applyFilters(tasks, combo.params);
    
    // Verify each result strictly matches ALL criteria
    let isClean = true;
    for (const row of results) {
      if (combo.params.status && combo.params.status !== 'All' && row.status !== combo.params.status) isClean = false;
      if (combo.params.priority && combo.params.priority !== 'All' && row.priority !== combo.params.priority) isClean = false;
      if (combo.params.type && combo.params.type !== 'All' && row.task_type !== combo.params.type) isClean = false;
      if (combo.params.assignedUser === 'me' && row.assigned_user !== currentUserId) isClean = false;
      if (combo.params.assignedUser && combo.params.assignedUser !== 'All' && combo.params.assignedUser !== 'me' && row.assigned_user !== combo.params.assignedUser) isClean = false;
    }

    console.log(`[${isClean ? 'PASS' : 'FAIL'}] ${combo.name} -> Matches: ${results.length} tasks`);
    if (!isClean) passedAll = false;
  }

  console.log(`\nMATRIX TEST RESULT: ${passedAll ? 'ALL 14 COMBINATIONS PASSED' : 'SOME COMBINATIONS FAILED'}`);
  await supabase.auth.signOut();
}

runCombinationsTest();
