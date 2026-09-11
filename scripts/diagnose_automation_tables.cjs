const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('--- Inspecting Automation Tables ---');
  
  const tables = [
    'automation_workflows',
    'automation_conditions',
    'automation_actions',
    'automation_execution_logs',
    'automation_triggers',
    'automation_runs'
  ];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: false }).limit(2);
      if (error) {
        console.log(`❌ Table [${table}]: Error ->`, error.message, error.code);
      } else {
        console.log(`✅ Table [${table}]: Exists, count = ${count ?? data?.length}`);
        if (data && data.length > 0) {
          console.log(`   Sample columns:`, Object.keys(data[0]));
        }
      }
    } catch (err) {
      console.log(`❌ Table [${table}]: Exception ->`, err.message);
    }
  }

  // Also check existing workflows
  const { data: workflows } = await supabase.from('automation_workflows').select('*');
  console.log('\n--- Existing Workflows in DB ---');
  console.log(JSON.stringify(workflows, null, 2));
}

checkTables();
