import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function testFetch() {
  const pageSize = 5000;
  const from = 0;
  const to = from + pageSize - 1;
  
  console.log(`Fetching range ${from} to ${to}...`);
  const { data, error, count } = await supabase
    .from('leads')
    .select(`*`, { count: 'exact' })
    .range(from, to);

  if (error) {
    console.error("Fetch Error:", error.message);
  } else {
    console.log(`Successfully fetched ${data.length} leads. Total count: ${count}`);
  }
}

testFetch();
