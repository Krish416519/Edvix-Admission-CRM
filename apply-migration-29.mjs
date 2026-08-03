#!/usr/bin/env node
// apply-migration-29.mjs
// Run: node apply-migration-29.mjs

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Split migration SQL into individual executable statements
// This handles the plpgsql $$ blocks correctly
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  
  const lines = sql.split('\n');
  
  for (const line of lines) {
    // Skip pure comment lines at statement boundaries
    if (!inDollarQuote && line.trim().startsWith('--')) {
      current += line + '\n';
      continue;
    }
    
    current += line + '\n';
    
    // Check for dollar quoting
    const dollarMatches = line.match(/\$\$|\$[a-zA-Z_][a-zA-Z0-9_]*\$/g);
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = match;
        } else if (match === dollarTag) {
          inDollarQuote = false;
          dollarTag = '';
        }
      }
    }
    
    // If not inside dollar quote and line ends with semicolon, it's a complete statement
    if (!inDollarQuote && line.trim().endsWith(';')) {
      const stmt = current.trim();
      if (stmt && !stmt.match(/^(--)/) && stmt !== ';') {
        statements.push(stmt);
      }
      current = '';
    }
  }
  
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements.filter(s => s.length > 0 && !s.match(/^--/));
}

async function runStatement(sql, index) {
  try {
    const { error } = await supabase.rpc('exec_sql_unsafe', { sql_query: sql });
    if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
      console.error(`  ❌ Statement ${index} failed:`, error.message);
      console.error('  SQL:', sql.substring(0, 150));
      return false;
    }
    return true;
  } catch (e) {
    console.error(`  ❌ Statement ${index} exception:`, e.message);
    return false;
  }
}

// Since exec_sql_unsafe may not exist, use pg directly via REST
async function applyStatementViaFetch(stmt) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  // Actually, we'll use the Supabase Management API or just log the SQL for manual execution
  return false;
}

async function main() {
  console.log('🔄 Applying Lead Assignment Migration...\n');
  
  const sql = fs.readFileSync('supabase/migrations/00000000000029_lead_assignment_system.sql', 'utf-8');
  
  // Try a simple test first
  const { data: test, error: testErr } = await supabase
    .from('roles')
    .select('name')
    .eq('name', 'Team Leader')
    .single();
  
  if (!testErr && test) {
    console.log('✅ Team Leader role already exists');
  } else {
    // Insert Team Leader role
    const { error: roleErr } = await supabase
      .from('roles')
      .insert({ name: 'Team Leader' })
      .select();
    if (roleErr && !roleErr.message.includes('duplicate')) {
      console.error('❌ Failed to insert Team Leader role:', roleErr.message);
    } else {
      console.log('✅ Team Leader role inserted');
    }
  }
  
  // Check if lead_assignments table exists
  const { error: tableErr } = await supabase
    .from('lead_assignments')
    .select('id')
    .limit(1);
  
  if (!tableErr) {
    console.log('✅ lead_assignments table already exists');
  } else {
    console.log('⚠️  lead_assignments table does not exist yet.');
    console.log('\n📋 ACTION REQUIRED: Please run the following SQL in your Supabase Dashboard SQL Editor:');
    console.log('   Go to: https://supabase.com/dashboard → SQL Editor → New Query\n');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60));
  }
  
  console.log('\n✅ Migration script completed. Check output above for any manual steps needed.');
}

main().catch(console.error);
