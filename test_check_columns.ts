import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function test() {
  const leadId = 'ed78c301-21be-4f7c-9a7f-179ce1e3291a';
  
  // Check if lead exists
  console.log('=== Lead exists check ===');
  const { data: leadData } = await supabase
    .from('leads')
    .select('id, organization_id')
    .eq('id', leadId);
  
  console.log('Lead query result:', leadData);
  
  // Check organizations table columns
  console.log('\n=== Organizations table columns ===');
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .limit(1);
  
  if (orgError) {
    console.error('Error:', orgError);
  } else if (orgData && orgData.length > 0) {
    console.log('Organization columns:', Object.keys(orgData[0]));
    console.log('First org:', orgData[0]);
  }
}

test();
