import fs from 'fs';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    const sql = fs.readFileSync('supabase/migrations/99999999999999_bi_rpcs.sql', 'utf8');
    
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
