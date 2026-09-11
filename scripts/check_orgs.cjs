const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkOrgs() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const { data: orgs, error } = await supabase.from('organizations').select('*');
  console.log('Organizations:', orgs, error);

  const { data: orgUsers } = await supabase.from('organization_users').select('*');
  console.log('Organization Users count:', orgUsers?.length, orgUsers);
}

checkOrgs().catch(console.error);
