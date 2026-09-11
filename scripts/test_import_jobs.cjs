const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testImportJobs() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const testJob = {
    filename: 'shiksha_leads_batch_sept.csv',
    source: 'CSV Upload',
    status: 'Completed',
    total_rows: 50,
    success_count: 48,
    error_count: 1,
    duplicate_count: 1,
    started_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date().toISOString()
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('import_jobs')
    .insert(testJob)
    .select()
    .single();

  console.log('Insert import_jobs result:', inserted ? 'SUCCESS (id: ' + inserted.id + ')' : 'FAILED: ' + insertErr?.message);

  const { data: jobs, error: fetchErr } = await supabase.from('import_jobs').select('*');
  console.log('Fetched import_jobs count:', jobs?.length);
}

testImportJobs().catch(console.error);
