const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testWebhooks() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const orgId = 'ac839210-a02f-4754-80ac-77b90919e938';
  
  const testHook = {
    organization_id: orgId,
    name: 'Zapier Lead Ingestion',
    url: 'https://hooks.zapier.com/hooks/catch/123456/sample/',
    events: ['lead.created', 'lead.updated'],
    status: 'Active',
    secret: 'whsec_sampletest1234567890abcdef'
  };

  console.log('Testing inserting test webhook...');
  const { data: inserted, error: insertErr } = await supabase
    .from('webhooks')
    .insert(testHook)
    .select()
    .single();

  console.log('Insert result:', inserted ? 'SUCCESS (id: ' + inserted.id + ')' : 'FAILED: ' + insertErr.message);

  const { data: hooks, error: fetchErr } = await supabase.from('webhooks').select('*');
  console.log('Fetched webhooks count:', hooks?.length);
}

testWebhooks().catch(console.error);
