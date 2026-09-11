const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkApiKeys() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const { data: keys, error } = await supabase.from('api_keys').select('*');
  console.log('API Keys:', keys?.map(k => ({ id: k.id, name: k.name, status: k.status, env: k.environment, created: k.created_at })));
}

checkApiKeys().catch(console.error);
