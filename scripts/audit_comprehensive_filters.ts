import { createClient } from '@supabase/supabase-js';
import { applyFilters, FILTER_FIELDS, FILTER_FIELD_MAP, getRelativeDateValue } from '../src/lib/filterQueryBuilder';
import type { FilterState } from '../src/types/filter';

const supabaseUrl = "https://kwvlfslmviunwmmuajxb.supabase.co";
const supabaseAnonKey = "sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runComprehensiveAudit() {
  console.log('='.repeat(80));
  console.log('EDVIX CRM — DEEP COMPREHENSIVE FILTER SYSTEM AUDIT');
  console.log('Timestamp:', new Date().toISOString());
  console.log('='.repeat(80));

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  if (authError) {
    console.error('CRITICAL: Auth failed:', authError);
    process.exit(1);
  }
  // Inspect actual data distribution to understand real filter targets
  console.log('\n--- 0. Real Database Data Distribution ---');
  const { data: sampleLeads } = await supabase
    .from('leads')
    .select('id, lead_status, priority, lead_source, assigned_counselor, created_at')
    .is('deleted_at', null)
    .limit(100);

  const statuses = new Set();
  const sources = new Set();
  const priorities = new Set();
  const counselors = new Set();
  sampleLeads?.forEach(l => {
    if (l.lead_status) statuses.add(l.lead_status);
    if (l.lead_source) sources.add(l.lead_source);
    if (l.priority) priorities.add(l.priority);
    if (l.assigned_counselor) counselors.add(l.assigned_counselor);
  });
  console.log('Active Statuses in DB:', Array.from(statuses));
  console.log('Active Sources in DB:', Array.from(sources));
  console.log('Active Priorities in DB:', Array.from(priorities));
  console.log('Active Counselors in DB:', Array.from(counselors));
  const userId = authData.user.id;

  // Verify all FILTER_FIELDS can be queried without PostgREST syntax errors
  console.log('\n--- 1. Testing Every Field in FILTER_FIELDS for PostgREST Column Validity ---');
  let validCols = 0;
  let invalidCols: string[] = [];

  for (const field of FILTER_FIELDS) {
    if (!field.dbColumn) continue;
    // Skip virtual/RPC fields handled specially
    if (field.id === 'historical_disposition') continue;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`id, ${field.dbColumn}`)
        .limit(1);

      if (error) {
        console.error(`❌ Field '${field.id}' (col: '${field.dbColumn}'):`, error.message);
        invalidCols.push(`${field.id} -> ${field.dbColumn}: ${error.message}`);
      } else {
        validCols++;
      }
    } catch (err: any) {
      console.error(`❌ Field '${field.id}' exception:`, err.message);
      invalidCols.push(`${field.id} -> ${field.dbColumn}: ${err.message}`);
    }
  }
  console.log(`Column Validity Result: ${validCols} valid columns, ${invalidCols.length} invalid.`);

  // Test Suite of Real CRM Scenarios
  console.log('\n--- 2. Testing Real CRM Filter Scenarios ---');
  const scenarios: { name: string; filterState: FilterState }[] = [
    // Scenario 1: Unassigned leads
    {
      name: 'Unassigned Leads (assigned_counselor is_null)',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [{ id: 's1', fieldId: 'assigned_counselor', operator: 'is_null', value: true }]
        }
      }
    },
    // Scenario 2: Multi-status in
    {
      name: 'Multi-Status (New, Hot, Contacted)',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [{ id: 's2', fieldId: 'lead_status', operator: 'in', value: ['New', 'Hot', 'Contacted'] }]
        }
      }
    },
    // Scenario 3: Untouched Hot (Golden Cohort)
    {
      name: 'Golden Cohort: Intent HOT AND Call Attempts = 0',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 's3a', fieldId: 'intent', operator: '=', value: 'HOT' },
            { id: 's3b', fieldId: 'call_attempts', operator: '=', value: 0 }
          ]
        }
      }
    },
    // Scenario 4: Date Range - August 2026
    {
      name: 'Created Date Range (2026-08-01 to 2026-08-31)',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 's4', fieldId: 'created_at', operator: 'between', value: ['2026-08-01', '2026-08-31'] }
          ]
        }
      }
    },
    // Scenario 5: Relative Date - Last 30 Days
    {
      name: 'Relative Date - Last 30 Days',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 's5', fieldId: 'created_at', operator: 'relative_date', value: 'last_30_days' }
          ]
        }
      }
    },
    // Scenario 6: Has WhatsApp Activity
    {
      name: 'Has WhatsApp Activity',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 's6', fieldId: 'has_whatsapp_activity', operator: '=', value: true }
          ]
        }
      }
    },
    // Scenario 7: Has Pending Task
    {
      name: 'Has Pending Task',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 's7', fieldId: 'has_pending_task', operator: '=', value: true }
          ]
        }
      }
    },
    // Scenario 8: Has No Activity (Untouched)
    {
      name: 'Has No Activity (Untouched Leads)',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 's8', fieldId: 'has_no_activity', operator: '=', value: true }
          ]
        }
      }
    },
    // Scenario 9: Compound OR Logic
    {
      name: 'OR Logic: High Priority OR Score >= 80',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'OR',
          conditions: [
            { id: 's9a', fieldId: 'priority', operator: '=', value: 'High' },
            { id: 's9b', fieldId: 'lead_score', operator: '>=', value: 80 }
          ]
        }
      }
    },
    // Scenario 10: Real source filter with spaces
    {
      name: 'Source with spaces in [CV Partner, Organic]',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 's10a', fieldId: 'lead_source', operator: 'in', value: ['CV Partner', 'Organic'] }
          ]
        }
      }
    },
    // Scenario 11: Call attempts >= 3
    {
      name: 'Call attempts >= 3',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 's11', fieldId: 'call_attempts', operator: '>=', value: 3 }
          ]
        }
      }
    },
    // Scenario 12: Historical Disposition
    {
      name: 'Historical Disposition (UUID lookup)',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 's12', fieldId: 'historical_disposition', operator: '=', value: '00000000-0000-0000-0000-000000000000' }
          ]
        }
      }
    }
  ];

  let passedScenarios = 0;
  let failedScenarios = 0;

  for (const s of scenarios) {
    let query = supabase.from('leads').select('id, first_name, lead_status, created_at', { count: 'exact' }).is('deleted_at', null);
    query = applyFilters(query, s.filterState);

    const { count, error } = await query;
    if (error) {
      console.error(`❌ Scenario FAIL: ${s.name} -> Error: ${error.message}`);
      failedScenarios++;
    } else {
      console.log(`✅ Scenario PASS: ${s.name} -> Matched: ${count} leads`);
      passedScenarios++;
    }
  }

  // 3. Test Saved Views (saved_views table) CRUD
  console.log('\n--- 3. Testing Saved Views Persistence in Supabase ---');
  const testViewName = `Audit Test View ${Date.now()}`;
  const testPayload = {
    user_id: userId,
    name: testViewName,
    filters: { rootGroup: { id: 'root', logic: 'AND', conditions: [{ id: 'sv1', fieldId: 'lead_status', operator: '=', value: 'Hot' }] } },
    visibility: 'private'
  };

  const { data: insertData, error: insertErr } = await supabase
    .from('saved_views')
    .insert(testPayload)
    .select()
    .single();

  if (insertErr) {
    console.error('❌ Failed to insert saved view:', insertErr.message);
  } else {
    console.log('✅ Successfully created saved view:', insertData.id, insertData.name);

    // Read it back
    const { data: readData, error: readErr } = await supabase
      .from('saved_views')
      .select('*')
      .eq('id', insertData.id)
      .single();

    if (readErr) {
      console.error('❌ Failed to read saved view:', readErr.message);
    } else {
      console.log('✅ Successfully read back saved view with filters:', JSON.stringify(readData.filters));
    }

    // Clean up
    const { error: delErr } = await supabase
      .from('saved_views')
      .delete()
      .eq('id', insertData.id);

    if (delErr) {
      console.error('⚠️ Could not delete test view:', delErr.message);
    } else {
      console.log('✅ Successfully cleaned up test view.');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`FINAL REPORT:`);
  console.log(`Column Schema Validation: ${validCols} valid, ${invalidCols.length} invalid`);
  if (invalidCols.length > 0) {
    invalidCols.forEach(c => console.log('   ->', c));
  }
  console.log(`Scenario Execution: ${passedScenarios} passed, ${failedScenarios} failed`);
  console.log('='.repeat(80));
}

runComprehensiveAudit().catch(err => {
  console.error('CRITICAL UNHANDLED ERROR:', err);
  process.exit(1);
});
