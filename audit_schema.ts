import { Client } from 'pg';
import fs from 'fs';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    
    // 1. Get all tables related to activity, history, logs, audit
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%activity%' OR table_name LIKE '%histor%' OR table_name LIKE '%log%' OR table_name LIKE '%audit%' OR table_name LIKE '%event%')
      ORDER BY table_name;
    `);
    
    console.log("== Relevant Tables ==");
    for (let row of tablesRes.rows) {
      console.log("- " + row.table_name);
      // get columns
      const colRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 
        ORDER BY ordinal_position;
      `, [row.table_name]);
      console.log("  Columns: " + colRes.rows.map(c => c.column_name).join(', '));
    }

    // 2. Look for triggers on leads table
    const triggersRes = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'leads' OR event_object_table LIKE '%activity%';
    `);
    console.log("\n== Triggers on Leads & Activity ==");
    for (let row of triggersRes.rows) {
      console.log(`- ${row.trigger_name} on ${row.event_object_table} (${row.event_manipulation}): ${row.action_statement}`);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
