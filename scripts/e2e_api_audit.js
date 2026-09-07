import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const results = [];

function logTest(module, testName, passed, details = '') {
  results.push({ module, testName, passed, details });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'} [${module}] ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function runE2EAudit() {
  console.log('====================================================');
  console.log('   EDVIX CRM: END-TO-END AUTOMATED FUNCTIONAL AUDIT  ');
  console.log('====================================================\n');

  // 1. AUTHENTICATION TEST
  let authUser = null;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'degreepartners@gmail.com',
      password: '@Krish4165'
    });
    if (error) throw error;
    authUser = data.user;
    logTest('Auth', 'Super Admin Login', true, `User: ${authUser.email}`);
  } catch (err) {
    logTest('Auth', 'Super Admin Login', false, err.message);
    process.exit(1);
  }

  // 2. USER DIRECTORY & ORG HIERARCHY
  try {
    const { data: users, error: uErr } = await supabase.from('users').select('*');
    if (uErr) throw uErr;
    logTest('Users', 'Fetch User Directory', users.length > 0, `Count: ${users.length}`);

    const { data: depts, error: dErr } = await supabase.from('departments').select('*');
    if (dErr) throw dErr;
    logTest('Organization', 'Fetch Departments', depts.length > 0, `Active Depts: ${depts.filter(d => d.status === 'Active').length}`);

    const { data: desigs, error: desigErr } = await supabase.from('designations').select('*');
    if (desigErr) throw desigErr;
    logTest('Organization', 'Fetch Designations', desigs.length > 0, `Count: ${desigs.length}`);

    const { data: teams, error: tErr } = await supabase.from('teams').select('*');
    if (tErr) throw tErr;
    logTest('Organization', 'Fetch Operational Teams', teams.length > 0, `Count: ${teams.length}`);
  } catch (err) {
    logTest('Organization', 'Org Structure Query', false, err.message);
  }

  // 3. LEADS CREATION & QUERY AUDIT
  let testLeadId = null;
  const testPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
  const testEmail = `audit.student.${Date.now()}@edvix.test`;

  try {
    // Check reading existing leads
    const { data: existingLeads, error: lReadErr } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone, lead_status, admission_status')
      .limit(5);
    
    if (lReadErr) throw lReadErr;
    logTest('Leads', 'Read Leads Table', true, `Retrieved ${existingLeads.length} sample leads`);

    // Insert a dummy audit lead with valid organization_id
    const newLeadPayload = {
      first_name: 'AuditStudent',
      last_name: 'E2ETest',
      email: testEmail,
      phone: testPhone,
      city: 'Bangalore',
      state: 'Karnataka',
      lead_source: 'Website Walk-in',
      lead_status: 'New',
      admission_status: 'Inquired',
      course: 'MBA in Operations',
      budget: '300000',
      organization_id: 'ac839210-a02f-4754-80ac-77b90919e938',
      created_by: authUser.id
    };

    const { data: createdLead, error: lCreateErr } = await supabase
      .from('leads')
      .insert([newLeadPayload])
      .select()
      .single();

    if (lCreateErr) throw lCreateErr;
    testLeadId = createdLead.id;
    logTest('Leads', 'Create New Lead Direct', true, `Lead ID: ${testLeadId}, Name: ${createdLead.first_name}`);

    // Verify lead read back
    const { data: verifiedLead, error: vErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', testLeadId)
      .single();

    if (vErr) throw vErr;
    logTest('Leads', 'Verify Created Lead Persistence', verifiedLead.email === testEmail, `Verified Email: ${verifiedLead.email}`);
  } catch (err) {
    logTest('Leads', 'Lead Pipeline Lifecycle', false, err.message);
  }

  // 4. DISPOSITIONS AUDIT & LOGGING
  try {
    const { data: disps, error: dErr } = await supabase
      .from('dispositions')
      .select('id, name, target_status, category_id, crm_context')
      .eq('is_active', true)
      .eq('crm_context', 'academic');

    if (dErr) throw dErr;
    logTest('Dispositions', 'Fetch Active Academic Dispositions', disps.length > 0, `Count: ${disps.length}`);

    if (testLeadId && disps.length > 0) {
      const selectedDisp = disps[0];
      
      // Update lead with disposition and target status
      const { error: updErr } = await supabase
        .from('leads')
        .update({
          latest_disposition_id: selectedDisp.id,
          lead_status: selectedDisp.target_status || 'Contacted',
          admission_status: 'Counseling',
          updated_at: new Date().toISOString()
        })
        .eq('id', testLeadId);

      if (updErr) throw updErr;
      logTest('Dispositions', 'Apply Academic Disposition to Lead', true, `Applied: "${selectedDisp.name}" -> Status: ${selectedDisp.target_status}`);
    }
  } catch (err) {
    logTest('Dispositions', 'Disposition Logging & Transition', false, err.message);
  }

  // 5. SMART VIEWS STAGE UPDATE AUDIT
  try {
    if (testLeadId) {
      const { error: stageErr } = await supabase
        .from('leads')
        .update({ lead_status: 'Hot', admission_status: 'Application' })
        .eq('id', testLeadId);

      if (stageErr) throw stageErr;
      logTest('Smart Views', 'Stage Progression Update', true, 'Transitioned lead to Application (Hot)');
    }
  } catch (err) {
    logTest('Smart Views', 'Stage Transition', false, err.message);
  }

  // 6. CLEANUP AUDIT TEST LEAD
  if (testLeadId) {
    try {
      const { error: delErr } = await supabase
        .from('leads')
        .delete()
        .eq('id', testLeadId);

      if (!delErr) {
        logTest('Cleanup', 'Purge Audit Test Lead', true, `Cleaned up ${testLeadId}`);
      }
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
  }

  console.log('\n====================================================');
  console.log(`AUDIT SUMMARY: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
  console.log('====================================================\n');
}

runE2EAudit().catch(console.error);
