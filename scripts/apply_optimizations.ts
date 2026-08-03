import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const password = encodeURIComponent('@Krish416519');
const connectionString = `postgresql://postgres:${password}@db.kwvlfslmviunwmmuajxb.supabase.co:5432/postgres`;

async function applyMigrations() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to Database");

    const m1 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/00000000000036_optimize_lead_triggers.sql'), 'utf8');
    await client.query(m1);
    console.log("Applied 00000000000036_optimize_lead_triggers.sql");

    const m2 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/00000000000037_bulk_operations_rpc.sql'), 'utf8');
    await client.query(m2);
    console.log("Applied 00000000000037_bulk_operations_rpc.sql");

  } catch (err) {
    console.error("Database Error:", err);
  } finally {
    await client.end();
  }
}

applyMigrations();
