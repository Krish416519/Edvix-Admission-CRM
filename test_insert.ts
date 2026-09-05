import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const { data, error } = await supabase.from('leads').insert([{
    first_name: 'Test',
    last_name: 'Test',
    email: 'test@example.com',
    phone: '+919999999999',
    budget: '50000',
    lead_source: 'Organic',
    lead_status: 'New'
  }]);
  console.log('Error:', error);
  console.log('Data:', data);
}

main();
