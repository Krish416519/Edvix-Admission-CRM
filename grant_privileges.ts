import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    
    console.log("Granting permissions on custom_fields...");
    await client.query(`GRANT SELECT, INSERT, UPDATE ON TABLE public.leads TO authenticated;`);
    await client.query(`GRANT SELECT, INSERT, UPDATE ON TABLE public.leads TO anon;`);
    
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("Schema reloaded.");
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
