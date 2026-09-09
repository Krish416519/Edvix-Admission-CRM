import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://kwvlfslmviunwmmuajxb.supabase.co";
const supabaseAnonKey = "sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const IST_OFFSET_MINUTES = 330;

function getISTDateParts(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);

  return {
    year: ist.getUTCFullYear(),
    month: String(ist.getUTCMonth() + 1).padStart(2, '0'),
    day: String(ist.getUTCDate()).padStart(2, '0'),
  };
}

function getISTDateString(date = new Date()) {
  const { year, month, day } = getISTDateParts(date);
  return `${year}-${month}-${day}`;
}

function parseDateOnlyUTC(dateString) {
  return new Date(`${dateString}T00:00:00Z`);
}

function diffCalendarDays(fromDate, toDate) {
  const from = parseDateOnlyUTC(fromDate);
  const to = parseDateOnlyUTC(toDate);

  return Math.round(
    (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function printSection(title) {
  console.log('\n');
  console.log('='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));
}

function increment(map, key) {
  const normalized = key ?? 'NULL';
  map[normalized] = (map[normalized] || 0) + 1;
}

async function runAudit() {
  console.log('\n');
  console.log('EDVIX CRM — TASKS DATABASE RECONCILIATION AUDIT');
  console.log('READ-ONLY MODE (AUTHENTICATED AS SUPER ADMIN)');
  console.log(new Date().toISOString());

  // Authenticate as Super Admin
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  if (authErr) {
    console.error('CRITICAL: Authentication failed', authErr);
    return;
  }

  console.log(`Authenticated as: ${authData.user.email} (ID: ${authData.user.id})`);

  printSection('1. DATABASE TASK DATA');

  const {
    count: totalTasksCount,
    data: allTasks,
    error: tasksError,
  } = await supabase
    .from('tasks')
    .select(
      `
        id,
        task_number,
        title,
        status,
        priority,
        task_type,
        due_date,
        due_time,
        assigned_user,
        lead_id,
        created_at,
        updated_at,
        completed_date,
        deleted_at
      `,
      {
        count: 'exact',
      }
    )
    .is('deleted_at', null);

  if (tasksError) {
    console.error('CRITICAL: Tasks query failed');
    console.error(tasksError);
    return;
  }

  const fetchedCount = allTasks?.length ?? 0;

  console.log(`Canonical DB count: ${totalTasksCount}`);
  console.log(`Rows returned:      ${fetchedCount}`);

  if (totalTasksCount !== fetchedCount) {
    console.error(
      'WARNING: Returned row count does not equal exact DB count.'
    );
    console.error(
      'This may indicate pagination/response-size limitations.'
    );
  } else {
    console.log('PASS: Exact count matches returned rows.');
  }

  if (!allTasks || allTasks.length === 0) {
    console.warn('WARNING: No non-deleted tasks visible to this client.');
  }

  printSection('2. STATUS BREAKDOWN');

  const statusCounts = {};

  (allTasks || []).forEach(task => {
    increment(statusCounts, task.status);
  });

  console.table(statusCounts);

  printSection('3. PRIORITY BREAKDOWN');

  const priorityCounts = {};

  (allTasks || []).forEach(task => {
    increment(priorityCounts, task.priority);
  });

  console.table(priorityCounts);

  printSection('4. TASK TYPE BREAKDOWN');

  const typeCounts = {};

  (allTasks || []).forEach(task => {
    increment(typeCounts, task.task_type);
  });

  console.table(typeCounts);

  printSection('5. ASSIGNEE BREAKDOWN');

  const assigneeCounts = {};

  (allTasks || []).forEach(task => {
    increment(assigneeCounts, task.assigned_user);
  });

  console.table(assigneeCounts);

  printSection('6. LEAD ASSOCIATION');

  let linkedToLead = 0;
  let internalTasks = 0;

  (allTasks || []).forEach(task => {
    if (task.lead_id) {
      linkedToLead++;
    } else {
      internalTasks++;
    }
  });

  console.log(`Linked to Lead: ${linkedToLead}`);
  console.log(`Internal/No Lead: ${internalTasks}`);
  console.log(`Total: ${linkedToLead + internalTasks}`);

  printSection('7. IST DATE');

  const now = new Date();
  const todayIST = getISTDateString(now);

  console.log(`Current UTC: ${now.toISOString()}`);
  console.log(`Current IST date: ${todayIST}`);

  printSection('8. DATE KPI RECONCILIATION');

  let overdue = 0;
  let dueToday = 0;
  let dueTomorrow = 0;
  let next7Days = 0;
  let thisWeek = 0;
  let completedToday = 0;
  let highPriority = 0;

  const tomorrowDate = new Date(
    parseDateOnlyUTC(todayIST).getTime() +
    24 * 60 * 60 * 1000
  );

  const tomorrowIST = tomorrowDate.toISOString().slice(0, 10);

  const todayUTC = parseDateOnlyUTC(todayIST);

  (allTasks || []).forEach(task => {
    if (!task.due_date) return;

    const isCompleted =
      task.status === 'Completed' ||
      task.status === 'Cancelled';

    if (!isCompleted) {
      const diff = diffCalendarDays(todayIST, task.due_date);

      if (diff < 0) {
        overdue++;
      }

      if (task.due_date === todayIST) {
        dueToday++;
      }

      if (task.due_date === tomorrowIST) {
        dueTomorrow++;
      }

      if (diff > 0 && diff <= 7) {
        next7Days++;
      }

      /*
       * Monday-start week calculation.
       */
      const currentDay = todayUTC.getUTCDay();

      const daysSinceMonday =
        currentDay === 0 ? 6 : currentDay - 1;

      const weekStart = new Date(
        todayUTC.getTime() -
        daysSinceMonday * 24 * 60 * 60 * 1000
      );

      const weekEnd = new Date(
        weekStart.getTime() +
        6 * 24 * 60 * 60 * 1000
      );

      const taskDate = parseDateOnlyUTC(task.due_date);

      if (taskDate >= weekStart && taskDate <= weekEnd) {
        thisWeek++;
      }
    }

    const completedTimestamp = task.completed_date || task.completed_at;
    if (
      task.status === 'Completed' &&
      completedTimestamp
    ) {
      const completedDate = getISTDateString(
        new Date(completedTimestamp)
      );

      if (completedDate === todayIST) {
        completedToday++;
      }
    }

    if (task.priority === 'High') {
      highPriority++;
    }
  });

  console.log(`Overdue:              ${overdue}`);
  console.log(`Due Today:            ${dueToday}`);
  console.log(`Due Tomorrow:         ${dueTomorrow}`);
  console.log(`Next 7 Days:          ${next7Days}`);
  console.log(`This Week:            ${thisWeek}`);
  console.log(`Completed Today:      ${completedToday}`);
  console.log(`High Priority:        ${highPriority}`);

  printSection('9. STATUS + DATE CROSS-CHECK');

  const activeTasks = (allTasks || []).filter(
    task =>
      task.status !== 'Completed' &&
      task.status !== 'Cancelled'
  );

  console.log(`Active tasks: ${activeTasks.length}`);

  const activeWithDueDate = activeTasks.filter(
    task => task.due_date
  ).length;

  console.log(
    `Active tasks with due date: ${activeWithDueDate}`
  );

  printSection('10. DATA QUALITY CHECK');

  let duplicateIds = 0;
  let missingIds = 0;
  let missingTitles = 0;
  let invalidStatuses = 0;
  let invalidPriorities = 0;

  const seenIds = new Set();

  const validStatuses = new Set([
    'Pending',
    'In Progress',
    'Completed',
    'Cancelled',
  ]);

  const validPriorities = new Set([
    'Urgent',
    'High',
    'Medium',
    'Low',
  ]);

  (allTasks || []).forEach(task => {
    if (!task.id) {
      missingIds++;
    }

    if (seenIds.has(task.id)) {
      duplicateIds++;
    }

    seenIds.add(task.id);

    if (!task.title) {
      missingTitles++;
    }

    if (
      task.status &&
      !validStatuses.has(task.status)
    ) {
      invalidStatuses++;
    }

    if (
      task.priority &&
      !validPriorities.has(task.priority)
    ) {
      invalidPriorities++;
    }
  });

  console.log(`Missing IDs:          ${missingIds}`);
  console.log(`Duplicate IDs:        ${duplicateIds}`);
  console.log(`Missing titles:       ${missingTitles}`);
  console.log(`Unexpected statuses:  ${invalidStatuses}`);
  console.log(`Unexpected priorities:${invalidPriorities}`);

  printSection('11. SAMPLE TASK RECORDS');

  (allTasks || [])
    .slice(0, 10)
    .forEach(task => {
      console.log({
        id: task.id,
        task_number: task.task_number,
        title: task.title,
        status: task.status,
        priority: task.priority,
        task_type: task.task_type,
        due_date: task.due_date,
        due_time: task.due_time,
        assigned_user: task.assigned_user,
        lead_id: task.lead_id,
      });
    });

  printSection('12. USERS');

  const {
    data: users,
    error: usersError,
  } = await supabase
    .from('users')
    .select('id, name, email, role:roles(name)');

  if (usersError) {
    console.error('Users query error:', usersError);
  } else {
    console.log(`Visible users: ${users?.length ?? 0}`);

    (users || []).slice(0, 20).forEach(user => {
      console.log({
        id: user.id,
        name: user.name,
        role: user.role?.name || 'Unassigned',
      });
    });
  }

  printSection('13. FINAL RECONCILIATION OBJECT');

  const result = {
    generatedAtUTC: now.toISOString(),
    todayIST,

    database: {
      exactCount: totalTasksCount,
      returnedRows: fetchedCount,
    },

    metrics: {
      overdue,
      dueToday,
      dueTomorrow,
      next7Days,
      thisWeek,
      completedToday,
      highPriority,
    },

    associations: {
      linkedToLead,
      internalTasks,
    },

    quality: {
      missingIds,
      duplicateIds,
      missingTitles,
      invalidStatuses,
      invalidPriorities,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  printSection('14. AUDIT INTERPRETATION');

  if (totalTasksCount !== fetchedCount) {
    console.error(
      'FAIL/UNVERIFIED: Exact DB count does not match returned rows.'
    );
  } else {
    console.log('PASS: Exact count matches returned rows.');
  }

  if (duplicateIds > 0) {
    console.error('FAIL: Duplicate task IDs detected.');
  } else {
    console.log('PASS: Zero duplicate task IDs.');
  }

  if (missingIds > 0) {
    console.error('FAIL: Tasks with missing IDs detected.');
  } else {
    console.log('PASS: Zero missing task IDs.');
  }

  if (invalidStatuses > 0) {
    console.error(
      'UNVERIFIED: Database contains statuses not recognized by this audit.'
    );
  } else {
    console.log('PASS: All task statuses are valid.');
  }

  if (invalidPriorities > 0) {
    console.error(
      'UNVERIFIED: Database contains priorities not recognized by this audit.'
    );
  } else {
    console.log('PASS: All task priorities are valid.');
  }

  console.log('\n--- AUDIT COMPLETE ---');

  await supabase.auth.signOut();
}

runAudit().catch(error => {
  console.error('CRITICAL AUDIT FAILURE:', error);
});
