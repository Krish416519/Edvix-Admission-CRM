import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function clearData() {
  console.log('Clearing dummy data...');

  // Deleting child records first
  await supabase.from('lead_activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared lead_activities');

  await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared tasks');

  await supabase.from('notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared notes');

  await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared documents');

  await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared payments');

  await supabase.from('admissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared admissions');

  // Delete Leads
  await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared leads');

  // Delete Courses
  await supabase.from('courses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared courses');

  // Delete Universities
  await supabase.from('universities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared universities');

  // Delete Users (Except Super Admin 'degreepartners@gmail.com')
  const { data: adminUser } = await supabase.from('users').select('id').eq('email', 'degreepartners@gmail.com').single();
  if (adminUser) {
    await supabase.from('users').delete().neq('id', adminUser.id);
    console.log('Cleared all dummy users (Kept Super Admin)');
  } else {
    console.log('Super admin not found, skipping users deletion to be safe.');
  }

  console.log('All dummy data cleared successfully!');
}

clearData();
