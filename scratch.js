const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('(SELECT EXISTS(SELECT 1 FROM tasks t WHERE t.lead_id = leads.id AND t.status = \'Pending\'))', true)
    .limit(1);
    
  console.log("Error:", error);
}

test();
