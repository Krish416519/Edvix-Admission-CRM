import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    
    await client.query(`SET ROLE anon;`);
    const res = await client.query(`SELECT custom_fields FROM public.leads LIMIT 1;`);
    console.log("As anon:", res.rows);
    
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
