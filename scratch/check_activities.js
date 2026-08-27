import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkActivities() {
    const { data, error } = await supabase
        .from('lead_activities')
        .select('id, type, author, created_by, content, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
    console.log("Activities:", data);
    console.log("Error:", error);
}

checkActivities();
