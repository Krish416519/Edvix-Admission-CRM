const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  // Try reading from .env manually
  const fs = require('fs');
  const envContent = fs.readFileSync('.env', 'utf-8');
  envContent.split('\n').forEach(line => {
    const [k, v] = line.split('=');
    if (k && v) process.env[k.trim()] = v.trim();
  });
}

const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectRajesh() {
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: 'degreepartners@gmail.com',
    password: '@Krish4165'
  });
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }
  console.log('Authenticated as:', authData.user.email);

  const { data: adms, error: admErr } = await client
    .from('admissions')
    .select('*')
    .ilike('student_name', '%Rajesh%');
  console.log('Admissions for Rajesh:', JSON.stringify(adms, null, 2), admErr);

  const { data: allAdms } = await client
    .from('admissions')
    .select('id, admission_number, student_name, current_stage, fee_structure, lead_id');
  console.log('All Admissions in DB:', JSON.stringify(allAdms, null, 2));

  const { data: lead, error: leadErr } = await client
    .from('leads')
    .select('id, first_name, last_name, lead_status, deleted_at')
    .eq('id', 'd8fbe59e-b0b9-4bb1-bed0-6661d154cde1');
  console.log('Lead for Rajesh:', JSON.stringify(lead, null, 2), leadErr);
}

inspectRajesh();
