import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testBulkUpdate() {
  console.log('Logging in...');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com', // Admin
    password: '@Krish4165'
  });

  if (authErr) {
    console.error('Login failed:', authErr.message);
    return;
  }

  async function testBatch(batchSize) {
    console.log(`\nFetching ${batchSize} leads...`);
    const { data: leads, error: fetchErr } = await supabase
      .from('leads')
      .select('id')
      .limit(batchSize);

    if (fetchErr || !leads) {
      console.error('Fetch error:', fetchErr);
      return;
    }

    const ids = leads.map(l => l.id);
    console.log(`Fetched ${ids.length} leads. Starting bulk update...`);

    const startTime = Date.now();
    const payload = {
      priority: 'High',
      lead_source: 'Google'
    };

    const { error: updateErr } = await supabase
      .from('leads')
      .update(payload)
      .in('id', ids);

    const endTime = Date.now();

    if (updateErr) {
      console.error('Update error:', updateErr);
    } else {
      console.log(`Successfully updated ${ids.length} leads in ${endTime - startTime} ms!`);
    }
  }

  await testBatch(100);
  await testBatch(200);
  await testBatch(500);
}

testBulkUpdate();
