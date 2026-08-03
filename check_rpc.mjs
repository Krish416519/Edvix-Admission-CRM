import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function checkRpc() {
  const { data, error } = await supabase.rpc('bulk_update_leads', {
    p_lead_ids: [],
    p_status: null,
    p_priority: null,
    p_source: null
  });

  if (error) {
    console.error("RPC Error:", error.message);
  } else {
    console.log("RPC exists and works! Data:", data);
  }
}

checkRpc();
