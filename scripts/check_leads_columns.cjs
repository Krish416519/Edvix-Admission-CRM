const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectLeadsColumns() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const { data: leads, error } = await supabase.from('leads').select('*').limit(1);
  if (error) {
    console.error('Leads select error:', error);
  } else if (leads && leads.length > 0) {
    console.log('Columns in leads table:');
    console.log(Object.keys(leads[0]));
  }
}

inspectLeadsColumns().catch(console.error);
