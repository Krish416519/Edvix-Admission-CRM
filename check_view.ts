import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT table_schema, table_name, table_type 
      FROM information_schema.tables 
      WHERE table_name='leads';
    `);
    console.log("leads tables:", res.rows);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
