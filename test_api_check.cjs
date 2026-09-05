const https = require('https');

const SUPABASE_URL = 'https://kwvlfslmviunwmmuajxb.supabase.co';
const ANON_KEY = 'sb_publishable_Mc0vlkIrWX-jdWsc_viSVA_njqhQCGE';

function query(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const options = {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

async function main() {
  // Test 1: Check crm_context column
  console.log('=== TEST 1: crm_context column ===');
  const test1 = await query('organizations?select=crm_context&limit=0');
  console.log('Status:', test1.status);
  console.log('Body:', test1.body);

  // Test 2: Get all columns (empty result is OK)
  console.log('\n=== TEST 2: All columns ===');
  const test2 = await query('organizations?select=*&limit=1');
  console.log('Status:', test2.status);
  console.log('Body:', test2.body);

  // Test 3: Check leads table
  console.log('\n=== TEST 3: leads table ===');
  const test3 = await query('leads?select=*&limit=1');
  console.log('Status:', test3.status);
  console.log('Body:', test3.body);

  // Test 4: Check specific lead
  console.log('\n=== TEST 4: Specific lead ===');
  const test4 = await query("leads?select=*&id=eq.ed78c301-21be-4f7c-9a7f-179ce1e3291a");
  console.log('Status:', test4.status);
  console.log('Body:', test4.body);

  // Test 5: Check disposition_categories
  console.log('\n=== TEST 5: disposition_categories ===');
  const test5 = await query('disposition_categories?select=*&limit=2');
  console.log('Status:', test5.status);
  console.log('Body:', test5.body);

  // Test 6: Check dispositions
  console.log('\n=== TEST 6: dispositions ===');
  const test6 = await query('dispositions?select=*&limit=2');
  console.log('Status:', test6.status);
  console.log('Body:', test6.body);

  // Test 7: Check organization_users
  console.log('\n=== TEST 7: organization_users ===');
  const test7 = await query('organization_users?select=*&limit=1');
  console.log('Status:', test7.status);
  console.log('Body:', test7.body);

  // Test 8: Check users table
  console.log('\n=== TEST 8: users ===');
  const test8 = await query('users?select=*&limit=1');
  console.log('Status:', test8.status);
  console.log('Body:', test8.body);
}

main().catch(console.error);
