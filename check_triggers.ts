import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT trigger_name, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'leads';
    `);
    console.log("Leads triggers:", res.rows);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
