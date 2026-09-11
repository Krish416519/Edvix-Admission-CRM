const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testWithAuth() {
  const email = 'degreepartners@gmail.com';
  const password = '@Krish4165';

  console.log('Logging in as degreepartners@gmail.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  const user = (authData?.user) || (await supabase.auth.getUser()).data.user;
  console.log('Logged in user:', user?.id, user?.email);

  // Now test select on automation_workflows
  const { data: workflows, error: wfError } = await supabase
    .from('automation_workflows')
    .select('*');
  console.log('Workflows:', workflows, 'Error:', wfError);

  // Check columns of automation_workflows by trying an insert with organization_id
  const orgId = 'ac839210-a02f-4754-80ac-77b90919e938';
  const testWf = {
    name: 'Test Workflow',
    description: 'A test workflow',
    trigger_event: 'Lead Created',
    status: 'draft',
    organization_id: orgId
  };

  const { data: insData, error: insErr } = await supabase
    .from('automation_workflows')
    .insert(testWf)
    .select()
    .single();

  console.log('Insert test result:', insData, 'Error:', insErr);

  if (insData) {
    // Clean up
    await supabase.from('automation_workflows').delete().eq('id', insData.id);
    console.log('Cleaned up test workflow');
  }
}

testWithAuth();
