const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testLeadInsert() {
  await supabase.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });

  const orgId = 'ac839210-a02f-4754-80ac-77b90919e938';
  
  const testLead = {
    first_name: 'Devansh',
    last_name: 'Joshi',
    phone: '9823456789',
    email: 'devansh.joshi@example.com',
    course: 'MBA Finance & Analytics',
    city: 'Ahmedabad',
    state: 'Gujarat',
    budget: '₹6,00,000 / yr',
    priority: 'High',
    lead_source: 'CollegeDunia',
    lead_status: 'New',
    lead_score: 78,
    organization_id: orgId
  };

  console.log('Testing inserting lead with correct columns...');
  const { data: inserted, error: insertErr } = await supabase
    .from('leads')
    .insert([testLead])
    .select()
    .single();

  if (insertErr) {
    console.error('Insert error:', insertErr);
  } else {
    console.log('Lead inserted successfully! ID:', inserted.id, `${inserted.first_name} ${inserted.last_name}`);
  }
}

testLeadInsert().catch(console.error);
