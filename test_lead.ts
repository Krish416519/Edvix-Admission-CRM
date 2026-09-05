import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function test() {
  const { data: leadsData } = await supabase.from('leads').select('id').limit(1);
  if (!leadsData || leadsData.length === 0) {
    console.log('No leads found.');
    return;
  }
  const id = leadsData[0].id;
  
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      counselor:users!leads_counselor_id_fkey(name),
      university:universities(name),
      course:courses(name),
      course_text:course,
      organization:organizations(crm_context)
    `)
    .eq('id', id)
    .single();
    
  if (error) {
    console.error('Error details:', error);
  } else {
    console.log('Success:', data.id);
  }
}

test();
