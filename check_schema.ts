import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='leads';
    `);
    console.log("Columns in leads table:", res.rows.map(r => r.column_name).join(', '));
    
    if (!res.rows.find(r => r.column_name === 'custom_fields')) {
      console.log("Adding custom_fields to leads...");
      await client.query(`ALTER TABLE public.leads ADD COLUMN custom_fields JSONB DEFAULT '{}'::jsonb;`);
    } else {
      console.log("custom_fields already exists according to postgres!");
    }
    
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("Schema reloaded.");
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
