const { Client } = require('pg');

const password = encodeURIComponent('@Krish416519');
const connectionString = `postgresql://postgres:${password}@db.kwvlfslmviunwmmuajxb.supabase.co:5432/postgres`;

async function checkAndAddRealtime() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL via pg client.');

  const res = await client.query("SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';");
  console.log('Current publication tables:', res.rows.map(r => r.tablename));

  const hasCalls = res.rows.some(r => r.tablename === 'calls');
  if (!hasCalls) {
    console.log('Adding calls to supabase_realtime...');
    await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;');
    console.log('Added calls to supabase_realtime.');
  } else {
    console.log('calls is ALREADY in supabase_realtime.');
  }

  await client.query('ALTER TABLE public.calls REPLICA IDENTITY FULL;');
  console.log('Set REPLICA IDENTITY FULL on public.calls.');

  const hasEvents = res.rows.some(r => r.tablename === 'call_events');
  if (!hasEvents) {
    console.log('Adding call_events to supabase_realtime...');
    await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE public.call_events;');
    await client.query('ALTER TABLE public.call_events REPLICA IDENTITY FULL;');
  }

  const verify = await client.query("SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';");
  console.log('Updated publication tables:', verify.rows.map(r => r.tablename));

  await client.end();
}

checkAndAddRealtime().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
