#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function runSQL(filePath) {
  console.log(`Executing ${filePath}...`);
  const sql = fs.readFileSync(filePath, 'utf-8');
  const { error } = await supabase.rpc('exec_sql_unsafe', { sql_query: sql });
  if (error) {
    console.error(`❌ Failed to execute ${filePath}:`, error.message);
    // Ignore duplicate object errors
    if (!error.message.includes('already exists') && !error.message.includes('duplicate key value')) {
      return false;
    }
  }
  console.log(`✅ Successfully executed ${filePath}`);
  return true;
}

async function main() {
  console.log('🔄 Applying Enterprise RBAC Migrations...\n');
  await runSQL('supabase/migrations/00000000000040_enterprise_rbac_schema.sql');
  await runSQL('supabase/migrations/00000000000041_rbac_functions.sql');
  await runSQL('supabase/migrations/00000000000042_enterprise_rls_policies.sql');
  console.log('\n✅ Migration script completed.');
}

main().catch(console.error);