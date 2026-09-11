const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function cleanTestLead() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  await supabase.from('leads').delete().eq('id', 'badaa0f3-40cc-4f7c-8646-a39a4644fb13');
  console.log('Cleaned test lead');
}

cleanTestLead().catch(console.error);
