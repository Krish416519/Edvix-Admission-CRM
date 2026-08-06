import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const password = encodeURIComponent('@Krish416519');
const connectionString = `postgresql://postgres:${password}@db.kwvlfslmviunwmmuajxb.supabase.co:5432/postgres`;

async function applyMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("✅ Connected to Database");

    const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/00000000000051_telephony_enhancement.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    await client.query(sql);
    console.log("✅ Telephony migration applied successfully!");

  } catch (err) {
    console.error("❌ Database Error:", err);
  } finally {
    await client.end();
  }
}

applyMigration();
