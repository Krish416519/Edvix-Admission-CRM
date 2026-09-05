import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    
    const colRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lead_activities' 
      ORDER BY ordinal_position;
    `);
    console.log("== lead_activities Columns ==");
    console.log(colRes.rows.map(c => c.column_name + ' (' + c.data_type + ')').join('\n'));

    // check triggers
    const triggerRes = await client.query(`
      SELECT trigger_name, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'leads' AND trigger_name = 'on_lead_changes_log_activity';
    `);
    console.log("\n== Trigger ==");
    console.log(triggerRes.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
