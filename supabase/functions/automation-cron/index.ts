// @ts-ignore
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch delayed runs that are ready to resume
    const now = new Date().toISOString();
    const { data: runs, error: runError } = await supabaseClient
      .from('automation_runs')
      .select('id')
      .eq('status', 'Delayed')
      .lte('resume_at', now);

    if (runError) throw runError;

    if (!runs || runs.length === 0) {
      return new Response(JSON.stringify({ message: 'No runs to resume' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`Found ${runs.length} runs to resume.`);

    // 2. Dispatch to automation-runner
    const runnerUrl = Deno.env.get('AUTOMATION_RUNNER_URL') || 'http://host.docker.internal:54321/functions/v1/automation-runner';

    const results = await Promise.all(runs.map(async (run) => {
      try {
        const res = await fetch(runnerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({ action: 'resume_run', run_id: run.id })
        });
        
        if (!res.ok) {
           console.error(`Failed to resume run ${run.id}: ${res.statusText}`);
           return { id: run.id, success: false };
        }
        
        return { id: run.id, success: true };
      } catch (err) {
        console.error(`Error resuming run ${run.id}`, err);
        return { id: run.id, success: false };
      }
    }));

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('Cron Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
