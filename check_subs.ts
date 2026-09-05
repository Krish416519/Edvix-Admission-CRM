import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    const res = await client.query(`SELECT * FROM public.plans`);
    console.log("Plans:", res.rows);
    
    const orgs = await client.query(`SELECT id FROM public.organizations`);
    console.log("Orgs:", orgs.rows);
    
    const subs = await client.query(`SELECT * FROM public.organization_subscriptions`);
    console.log("Subs:", subs.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
