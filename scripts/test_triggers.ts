import { Client } from 'pg';

const password = encodeURIComponent('@Krish416519');
const connectionString = `postgresql://postgres:${password}@db.kwvlfslmviunwmmuajxb.supabase.co:5432/postgres`;

async function getTriggers() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    // Get triggers for leads table
    const res = await client.query(`
      SELECT tgname, pg_get_triggerdef(oid) as def 
      FROM pg_trigger 
      WHERE tgrelid = 'leads'::regclass
    `);
    
    console.log("Triggers on leads:");
    res.rows.forEach(r => console.log(`- ${r.tgname}: ${r.def}`));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

getTriggers();
