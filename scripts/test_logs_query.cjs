const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testQuery() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const { data, error } = await supabase
    .from('automation_execution_logs')
    .select(`
      id, status, error_message, created_at, trigger_event,
      automation_workflows ( name ),
      automation_runs ( status )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  console.log('Query result:', data, 'Error:', error);
}

testQuery();
