import { Client } from 'pg';

const password = encodeURIComponent('@Krish416519');
const connectionString = `postgresql://postgres:${password}@db.kwvlfslmviunwmmuajxb.supabase.co:5432/postgres`;

async function seedProvider() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("✅ Connected to Database");

    // Seed a default CustomSIP provider if none exists
    const sql = `
      INSERT INTO public.telephony_providers (name, provider_type, config, is_active)
      SELECT 'Default SIP Provider', 'CustomSIP', '{}'::jsonb, true
      WHERE NOT EXISTS (
          SELECT 1 FROM public.telephony_providers WHERE is_active = true
      );
    `;

    await client.query(sql);
    console.log("✅ Default active provider seeded successfully!");

  } catch (err) {
    console.error("❌ Database Error:", err);
  } finally {
    await client.end();
  }
}

seedProvider();
