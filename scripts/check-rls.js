import dotenv from 'dotenv';
dotenv.config();
import { Client } from 'pg';

const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
client.connect().then(() => {
  client.query("SELECT * FROM pg_policies WHERE tablename = 'leads'").then(res => {
    console.log("Policies:", res.rows);
    client.end();
  });
});
