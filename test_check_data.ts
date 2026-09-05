import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function test() {
  // Check if any leads exist
  console.log('=== Any leads? ===');
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('id')
    .limit(5);
  
  console.log('Leads count:', leads?.length);
  console.log('Leads error:', leadsError);
  console.log('First few leads:', leads);

  // Check if any organizations exist
  console.log('\n=== Any organizations? ===');
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id')
    .limit(5);
  
  console.log('Organizations count:', orgs?.length);
  console.log('Organizations error:', orgsError);
  console.log('First few orgs:', orgs);
}

test();
