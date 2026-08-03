import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const password = encodeURIComponent('@Krish416519');
const connectionString = `postgresql://postgres:${password}@db.kwvlfslmviunwmmuajxb.supabase.co:5432/postgres`;

async function fixDb() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("✅ Connected to Database");

    const sqlPath = path.resolve(process.cwd(), '../.gemini/antigravity-ide/brain/34051cd3-5d52-4324-8128-94271540c2f8/fix_triggers.sql');
    
    // We can also just put the SQL directly here to avoid path issues
    const sql = `
CREATE OR REPLACE FUNCTION public.notify_lead_changes() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.assigned_counselor IS NOT NULL THEN
            PERFORM public.insert_notification_if_preferred(NEW.assigned_counselor, 'Leads', NEW.id, 'New Lead Assigned', 'Lead ' || NEW.first_name || ' was assigned to you.', 'general', 'High');
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.assigned_counselor IS DISTINCT FROM OLD.assigned_counselor AND NEW.assigned_counselor IS NOT NULL THEN
            PERFORM public.insert_notification_if_preferred(NEW.assigned_counselor, 'Leads', NEW.id, 'Lead Assigned', 'Lead ' || NEW.first_name || ' was assigned to you.', 'general', 'High');
        END IF;
        IF NEW.lead_status IS DISTINCT FROM OLD.lead_status AND NEW.assigned_counselor IS NOT NULL THEN
            PERFORM public.insert_notification_if_preferred(NEW.assigned_counselor, 'Leads', NEW.id, 'Lead Status Changed', 'Lead ' || NEW.first_name || ' status changed to ' || NEW.lead_status, 'general');
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    await client.query(sql);
    console.log("✅ Trigger notify_lead_changes successfully patched!");

  } catch (err) {
    console.error("❌ Database Error:", err);
  } finally {
    await client.end();
  }
}

fixDb();
