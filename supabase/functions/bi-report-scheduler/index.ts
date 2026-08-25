// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

// Edge function to run scheduled BI reports
// Triggered by pg_cron or Supabase scheduled functions

serve(async (req: Request) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Need service role to run reports for users
    )

    // 1. Fetch active scheduled reports that are due
    const { data: reports, error } = await supabaseClient
      .from('bi_scheduled_reports')
      .select('*, bi_saved_reports(*)')
      .eq('is_active', true)
      .lte('next_run_at', new Date().toISOString())

    if (error) throw error;

    // 2. Process each report (generate data, format as CSV/PDF, send email)
    console.log(`Processing ${reports.length} scheduled reports...`);

    // 3. Update next_run_at for processed reports
    
    return new Response(JSON.stringify({ success: true, processed: reports.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as any).message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
