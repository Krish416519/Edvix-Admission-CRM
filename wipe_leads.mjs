import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function wipeLeads() {
  console.log("Wiping all lead activities...");
  const { error: err1 } = await supabase
    .from('lead_activities')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (err1) {
    console.error("Failed to wipe lead_activities:", err1.message);
  }

  console.log("Wiping all leads...");
  const { error: err2, count } = await supabase
    .from('leads')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (err2) {
    console.error("Failed to wipe leads:", err2.message);
  } else {
    console.log("Successfully wiped all leads.");
  }
}

wipeLeads();
