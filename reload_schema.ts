import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    console.log("Schema cache reloaded.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
