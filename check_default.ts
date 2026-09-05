import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_name='leads' AND column_name='organization_id';
    `);
    console.log("leads.organization_id default:", res.rows[0]);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
