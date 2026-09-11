const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testFetchLogs() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const { automationService } = await import('../src/lib/automationService.ts');
  console.log('Testing automationService.getExecutionLogs()...');
  const logs = await automationService.getExecutionLogs({ limit: 100, status: 'all', search: '' });
  console.log('Result logs length:', logs.length);
  if (logs.length > 0) {
    console.log('Sample log:', logs[0]);
  }
}

testFetchLogs().catch(err => {
  console.error('Fetch logs threw:', err);
});
