const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectSchema() {
  const tables = [
    'automation_workflows',
    'automation_conditions',
    'automation_actions',
    'automation_execution_logs',
    'automation_triggers',
    'automation_runs'
  ];

  for (const table of tables) {
    console.log(`\n=== Table: ${table} ===`);
    // Attempt an empty insert to trigger error reporting column constraints or fetch from rpc if available
    const { error } = await supabase.from(table).insert({});
    if (error) {
      console.log('Insert hint:', error.message, error.details, error.hint);
    }
  }

  // Also print all 23 automation_triggers
  const { data: triggers } = await supabase.from('automation_triggers').select('*');
  console.log('\n=== automation_triggers ===');
  console.log(triggers);
}

inspectSchema();
