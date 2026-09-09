import { createClient } from '@supabase/supabase-js';
import { applyFilters, FILTER_FIELD_MAP, getRelativeDateValue } from '../src/lib/filterQueryBuilder.ts';

const supabaseUrl = "https://kwvlfslmviunwmmuajxb.supabase.co";
const supabaseAnonKey = "sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runAudit() {
  console.log('='.repeat(80));
  console.log('EDVIX CRM — ALL LEADS & ADVANCED FILTERS AUTOMATED AUDIT');
  console.log('Timestamp:', new Date().toISOString());
  console.log('='.repeat(80));

  // Authenticate as Super Admin
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  if (authError) {
    console.error('CRITICAL: Auth failed:', authError);
    process.exit(1);
  }
  console.log('Authenticated as:', authData.user.email);

  // 1. Total Canonical Database Count
  const { count: totalCount, error: countErr } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (countErr) {
    console.error('CRITICAL: Failed to fetch total leads count:', countErr);
    process.exit(1);
  }
  console.log(`Canonical Total Active Leads: ${totalCount}`);

  // 2. Test Cases for applyFilters
  const testCases = [
    {
      name: 'TC-1: Single Condition - Status = Hot',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 'c1', fieldId: 'lead_status', operator: '=', value: 'Hot' }
          ]
        }
      },
      expectedMin: 1
    },
    {
      name: 'TC-2: Single Condition - Priority = Low',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 'c2', fieldId: 'priority', operator: '=', value: 'Low' }
          ]
        }
      },
      expectedMin: 1
    },
    {
      name: 'TC-3: AND Logic - Status = Hot AND Priority = Low (Exact 5 expected)',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 'c3a', fieldId: 'lead_status', operator: '=', value: 'Hot' },
            { id: 'c3b', fieldId: 'priority', operator: '=', value: 'Low' }
          ]
        }
      },
      expectedExact: 5
    },
    {
      name: 'TC-4: Counselor UUID - Shivam',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 'c4', fieldId: 'assigned_counselor', operator: '=', value: '51f9b2b0-bf8c-4c56-8761-30298e807068' }
          ]
        }
      },
      expectedMin: 10
    },
    {
      name: 'TC-5: Date Range Between - [2026-08-01, 2026-08-31]',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 'c5', fieldId: 'created_at', operator: 'between', value: ['2026-08-01', '2026-08-31'] }
          ]
        }
      },
      expectedExact: 83
    },
    {
      name: 'TC-6: Relative Date - Last 30 Days (Timestamp syntax test)',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 'c6', fieldId: 'created_at', operator: 'relative_date', value: 'last_30_days' }
          ]
        }
      },
      expectedMin: 1
    },
    {
      name: 'TC-7: Boolean Flag - Has Pending Task = true',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 'c7', fieldId: 'has_pending_task', operator: '=', value: true }
          ]
        }
      },
      expectedExact: 14
    },
    {
      name: 'TC-8: Numeric Range - Lead Score Between [0, 100]',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 'c8', fieldId: 'lead_score', operator: 'between', value: [0, 100] }
          ]
        }
      },
      expectedExact: 86
    },
    {
      name: 'TC-9: Incomplete Condition Ignored - Hot + Blank condition does NOT zero out results',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 'c9a', fieldId: 'lead_status', operator: '=', value: 'Hot' },
            { id: 'c9b', fieldId: 'priority', operator: '=', value: '' }
          ]
        }
      },
      expectedExact: 6
    },
    {
      name: 'TC-10: OR Logic - Status = Hot OR Status = Cold (Exact 6 + 3 = 9)',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'OR',
          conditions: [
            { id: 'c10a', fieldId: 'lead_status', operator: '=', value: 'Hot' },
            { id: 'c10b', fieldId: 'lead_status', operator: '=', value: 'Cold' }
          ]
        }
      },
      expectedExact: 9
    },
    {
      name: 'TC-11: Name Contains - Kumar',
      filterState: {
        rootGroup: {
          id: 'root',
          logic: 'AND',
          conditions: [
            { id: 'c11', fieldId: 'name', operator: 'contains', value: 'Kumar' }
          ]
        }
      },
      expectedMin: 5
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    let query = supabase.from('leads').select('id, first_name, last_name, lead_status, priority', { count: 'exact' }).is('deleted_at', null);
    query = applyFilters(query, tc.filterState);

    const { count, data, error } = await query;

    if (error) {
      console.error(`FAIL: ${tc.name}`);
      console.error('   Error:', error.message);
      failed++;
    } else {
      let isMatch = true;
      if (tc.expectedExact !== undefined && count !== tc.expectedExact) {
        console.error(`FAIL: ${tc.name} -> Expected exactly ${tc.expectedExact}, got ${count}`);
        isMatch = false;
      }
      if (tc.expectedMin !== undefined && (count || 0) < tc.expectedMin) {
        console.error(`FAIL: ${tc.name} -> Expected at least ${tc.expectedMin}, got ${count}`);
        isMatch = false;
      }

      if (isMatch) {
        console.log(`PASS: ${tc.name} -> Matched: ${count} rows`);
        passed++;
      } else {
        failed++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED (Total ${testCases.length})`);
  console.log('='.repeat(80));

  if (failed > 0) process.exit(1);
}

runAudit().catch(err => {
  console.error('FATAL AUDIT ERROR:', err);
  process.exit(1);
});
