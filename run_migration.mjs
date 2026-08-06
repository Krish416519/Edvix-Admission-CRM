import fs from 'fs';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Extract PostgreSQL connection string from Supabase URL & Service Key, or use a local one if available.
// The .env has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. But wait, we need the actual postgres connection string.
// Let's check if there is a DATABASE_URL or something, or we can use the local supabase default connection string.
// Default local supabase connection string:
const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    const sql = fs.readFileSync('supabase/migrations/00000000000047_operations_center.sql', 'utf8');
    
    console.log('Executing migration...');
    await client.query(sql);
    
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
