const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectCallsSchema() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const { data: callSample, error } = await supabase.from('calls').select('*').limit(1);
  if (error) {
    console.error('Error fetching call:', error);
    return;
  }
  console.log('Calls columns sample:', callSample?.[0] ? Object.keys(callSample[0]) : 'Empty table');
  if (callSample?.[0]) console.log('Sample record:', callSample[0]);

  // Check if calls is in publication
  const { data: pubCheck } = await supabase.from('calls').select('id').limit(1);
  console.log('Query works. Now checking call_events:');
  const { data: events, error: evErr } = await supabase.from('call_events').select('*').limit(1);
  console.log('call_events error:', evErr?.message);

  const { data: audit, error: audErr } = await supabase.from('call_audit_log').select('*').limit(1);
  console.log('call_audit_log error:', audErr?.message);
}

inspectCallsSchema().catch(console.error);
