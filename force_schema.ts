import { Client } from 'pg';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
  });
  
  try {
    await client.connect();
    
    // Create lead_form_fields if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.lead_form_fields (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          label VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL,
          options JSONB,
          required BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
          UNIQUE(organization_id, name)
      );
    `);
    
    // Add custom_fields to leads
    await client.query(`
      ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
    `);
    
    // Reload PostgREST schema cache
    await client.query(`NOTIFY pgrst, 'reload schema';`);
    
    console.log("Database schema updated and cache reloaded.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

main();
