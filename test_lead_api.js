import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runTests() {
  console.log('--- STARTING LEAD API TESTS ---');

  // 1. Get an organization ID
  const { data: orgData, error: orgError } = await supabase.from('organizations').select('id').limit(1).single();
  if (orgError) {
      console.error('Failed to get org:', orgError);
      return;
  }
  const orgId = orgData.id;
  
  // 2. Get a user ID for assignment test
  const { data: userData, error: userError } = await supabase.from('users').select('id').limit(1).single();
  const userId = userData?.id;

  // 3. Generate a new API Key
  const rawKey = 'edvix_test_' + crypto.randomBytes(16).toString('hex');
  const hashHex = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data: apiKeyData, error: apiError } = await supabase.from('api_keys').insert([{
    name: 'Test Key for Lead API',
    key_prefix: 'edvix_test_',
    key_hash: hashHex,
    organization_id: orgId,
    permissions: ['leads:create', 'leads:read', 'leads:update', 'leads:assign', 'leads:status_update', 'leads:activity_create'],
    environment: 'Test',
    status: 'Active'
  }]).select().single();

  if (apiError) {
      console.error('Failed to insert test key:', apiError);
      return;
  }

  const gatewayUrl = 'http://127.0.0.1:54321/functions/v1/api-gateway/api/v1/leads';
  const headers = {
      'Authorization': `Bearer ${rawKey}`,
      'Content-Type': 'application/json'
  };

  // Test 1: Create a Lead
  console.log('TEST 1: Create a Lead');
  const leadPayload = {
      first_name: 'API',
      last_name: 'Test Lead',
      email: 'api.test@example.com',
      phone: '+1234567890',
      source: 'Website',
      medium: 'organic',
      campaign: 'summer_promo',
      utm_source: 'google',
      external_id: 'ext-lead-999'
  };

  const createRes = await fetch(gatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(leadPayload)
  });
  
  const createData = await createRes.json();
  console.log('Create Response:', JSON.stringify(createData, null, 2));
  
  if (!createData.success) {
      console.error('Failed Test 1');
      return;
  }
  const leadId = createData.data.id;

  // Test 2: Idempotency Duplicate Detection
  console.log('\nTEST 2: Create a Lead with Duplicate Phone (Expect 200 Duplicate)');
  const duplicatePayload = {
      first_name: 'Duplicate',
      last_name: 'Lead',
      phone: '+1234567890'
  };
  const dupHeaders = { ...headers, 'Idempotency-Key': 'idempotent-key-1' };
  
  const dupRes = await fetch(gatewayUrl, {
      method: 'POST',
      headers: dupHeaders,
      body: JSON.stringify(duplicatePayload)
  });
  const dupData = await dupRes.json();
  console.log('Duplicate Response:', JSON.stringify(dupData, null, 2));

  // Test 3: Idempotency Exact Replay
  console.log('\nTEST 3: Replay same Idempotency Key (Expect exact same previous duplicate payload)');
  const replayRes = await fetch(gatewayUrl, {
      method: 'POST',
      headers: dupHeaders,
      body: JSON.stringify(duplicatePayload)
  });
  const replayData = await replayRes.json();
  console.log('Replay Response:', JSON.stringify(replayData, null, 2));

  // Test 4: Update Lead (PATCH)
  console.log('\nTEST 4: Update Lead');
  const patchRes = await fetch(`${gatewayUrl}/${leadId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ budget: '$1000 - $5000' })
  });
  const patchData = await patchRes.json();
  console.log('Patch Response:', JSON.stringify(patchData, null, 2));

  // Test 5: Assign Lead
  if (userId) {
      console.log('\nTEST 5: Assign Lead');
      const assignRes = await fetch(`${gatewayUrl}/${leadId}/assign`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ user_id: userId })
      });
      const assignData = await assignRes.json();
      console.log('Assign Response:', JSON.stringify(assignData, null, 2));
  }

  // Test 6: Status Update
  console.log('\nTEST 6: Status Update');
  const statusRes = await fetch(`${gatewayUrl}/${leadId}/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ status: 'Contacted' })
  });
  const statusData = await statusRes.json();
  console.log('Status Response:', JSON.stringify(statusData, null, 2));

  // Test 7: Add Activity
  console.log('\nTEST 7: Add Activity');
  const actRes = await fetch(`${gatewayUrl}/${leadId}/activities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'Call', content: 'Discussed API requirements' })
  });
  const actData = await actRes.json();
  console.log('Activity Response:', JSON.stringify(actData, null, 2));

  // Test 8: Get Lead
  console.log('\nTEST 8: Get Lead Details with Activities');
  const getRes = await fetch(`${gatewayUrl}/${leadId}`, { headers });
  const getData = await getRes.json();
  console.log('Get Response:', JSON.stringify(getData, null, 2));

  console.log('\n--- TESTS COMPLETED ---');
}

runTests();
