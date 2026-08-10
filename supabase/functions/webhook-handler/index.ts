// supabase/functions/webhook-handler/index.ts
// Supabase Edge Function for EDVIX CRM
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0"
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const url = new URL(req.url);
    const source = url.searchParams.get('source'); // e.g., ?source=meta_leads
    const organization_id = url.searchParams.get('org_id'); // We expect partners/Meta to hit URLs tailored to their org

    if (!source || !organization_id) {
      return new Response(JSON.stringify({ error: 'Missing source or org_id' }), { status: 400 });
    }

    const payload = await req.json();

    // 1. Validation (Example: Meta Signature Verification)
    if (source === 'meta_leads') {
      const signature = req.headers.get('x-hub-signature-256');
      // In production, we would validate the HMAC signature here using Meta App Secret
      if (!signature) {
         console.warn("No signature provided, skipping validation for testing.");
      }
    }

    // 2. Generate an Idempotency Key (Extract from payload based on source)
    let external_id = '';
    if (source === 'meta_leads') {
      external_id = payload.entry?.[0]?.changes?.[0]?.value?.leadgen_id || crypto.randomUUID();
    } else if (source === 'stripe') {
      external_id = payload.id || crypto.randomUUID();
    } else {
      external_id = crypto.randomUUID(); // Fallback
    }

    // 3. Store raw webhook for auditing and idempotency
    const { error: auditError } = await supabase
      .from('webhook_events')
      .insert({
        organization_id,
        source,
        event_type: payload.object || 'unknown',
        external_id,
        payload,
        status: 'processed' // Immediately marking processed as we'll handle it synchronously here
      });

    if (auditError) {
      if (auditError.code === '23505') { // Unique constraint violation (duplicate webhook)
        return new Response(JSON.stringify({ message: 'Webhook already processed' }), { status: 200 });
      }
      throw auditError;
    }

    // 4. Transform and Route to CRM
    if (source === 'meta_leads') {
      // Typically we would fetch the lead details from Meta Graph API using the leadgen_id here
      // For demonstration, we'll insert a mock lead based on the webhook payload structure
      await supabase.from('leads').insert({
        organization_id,
        first_name: 'Meta',
        last_name: 'Lead',
        email: 'meta.lead@example.com',
        source: 'Meta Ads',
        status: 'New'
      });
      
      // The Database trigger `pg_net` or native Postgres triggers would then evaluate the 
      // `automation_workflows` table and execute any relevant workflows (like sending WhatsApp).
    }

    return new Response(
      JSON.stringify({ message: 'Webhook received and processed' }),
      { headers: { "Content-Type": "application/json" }, status: 200 },
    )
  } catch (err: any) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 },
    )
  }
})
