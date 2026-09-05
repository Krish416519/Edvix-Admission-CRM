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
  // Test 1: Query disposition_categories with crm_context filter
  console.log('=== TEST 1: disposition_categories with crm_context=academic ===');
  const test1 = await query('disposition_categories?crm_context=eq.academic&select=*&limit=2');
  console.log('Status:', test1.status);
  console.log('Body:', test1.body);

  // Test 2: Query disposition_categories without crm_context filter
  console.log('\n=== TEST 2: disposition_categories without crm_context filter ===');
  const test2 = await query('disposition_categories?select=*&limit=2');
  console.log('Status:', test2.status);
  console.log('Body:', test2.body);

  // Test 3: Check if crm_context column exists in disposition_categories
  console.log('\n=== TEST 3: crm_context column in disposition_categories ===');
  const test3 = await query('disposition_categories?select=crm_context&limit=0');
  console.log('Status:', test3.status);
  console.log('Body:', test3.body);

  // Test 4: Check dispositions table for crm_context
  console.log('\n=== TEST 4: crm_context column in dispositions ===');
  const test4 = await query('dispositions?select=crm_context&limit=0');
  console.log('Status:', test4.status);
  console.log('Body:', test4.body);

  // Test 5: Query dispositions with crm_context filter
  console.log('\n=== TEST 5: dispositions with crm_context=academic ===');
  const test5 = await query('dispositions?crm_context=eq.academic&select=*&limit=2');
  console.log('Status:', test5.status);
  console.log('Body:', test5.body);
}

main().catch(console.error);
