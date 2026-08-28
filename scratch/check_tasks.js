import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTaskInsert() {
  console.log("Fetching a lead...");
  const { data: lead } = await supabase.from('leads').select('id, assigned_counselor').limit(1).single();
  
  if (!lead) {
    console.error("No leads found.");
    return;
  }
  
  console.log("Inserting a task for lead", lead.id);
  const { data, error } = await supabase.from('tasks').insert({
    lead_id: lead.id,
    title: `Test Task from script`,
    task_type: 'Call',
    due_date: '2026-08-30',
    due_time: '14:30',
    priority: 'High',
    status: 'Pending',
    assigned_user: lead.assigned_counselor
  }).select();

  if (error) {
    console.error("Error inserting task:", error);
  } else {
    console.log("Task inserted successfully:", data);
  }
}

checkTaskInsert();
