import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateSignature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return encodeHex(new Uint8Array(signatureBuffer));
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { delivery_id, url, secret, payload } = body;

    if (!delivery_id || !url || !payload) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure strict HTTPS unless we are pointing to localhost (for local development)
    if (!url.startsWith('https://') && !url.includes('localhost') && !url.includes('host.docker.internal')) {
      console.warn(`Webhook URL ${url} is not HTTPS. Aborting for security.`);
      return new Response(JSON.stringify({ error: "HTTPS is required for webhooks" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Attempt the HTTP Request to Partner API
    const payloadString = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    
    let signature = '';
    
    if (secret) {
      // We sign the combination of timestamp and payload to prevent replay attacks
      const signaturePayload = `${timestamp}.${payloadString}`;
      signature = await generateSignature(signaturePayload, secret);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Edvix-Webhook-Dispatcher/1.0',
      'X-Edvix-Timestamp': timestamp
    };

    if (signature) {
      headers['X-Edvix-Signature'] = signature;
    }

    console.log(`Sending webhook ${delivery_id} to ${url}`);
    
    // Fetch current delivery state
    const { data: delivery, error: fetchError } = await supabase
      .from('webhook_deliveries')
      .select('retry_count, max_retries')
      .eq('id', delivery_id)
      .single();

    if (fetchError || !delivery) {
       console.error(`Could not fetch delivery ${delivery_id}`, fetchError);
    }
    
    const currentRetryCount = delivery?.retry_count || 0;
    const maxRetries = delivery?.max_retries ?? 4;

    let partnerResponseStatus = 0;
    let partnerResponseBody = null;
    let deliveryStatus = 'Failed';

    try {
      const partnerReq = await fetch(url, {
        method: 'POST',
        headers,
        body: payloadString,
        // Timeout after 10 seconds
        signal: AbortSignal.timeout(10000)
      });
      
      partnerResponseStatus = partnerReq.status;
      try {
        partnerResponseBody = await partnerReq.json();
      } catch (e) {
        partnerResponseBody = await partnerReq.text();
      }
      
      if (partnerReq.ok) {
        deliveryStatus = 'Success';
      }
    } catch (err: any) {
      console.error(`Error sending webhook: ${err.message}`);
      partnerResponseBody = { error: err.message, name: err.name };
      partnerResponseStatus = 500;
    }

    // Retry Logic
    let nextRetryAt: string | null = null;
    
    if (deliveryStatus === 'Failed') {
       if (currentRetryCount < maxRetries) {
          deliveryStatus = 'Pending Retry';
          // Exponential backoff: 30s * 2^currentRetryCount
          // e.g. 30s, 60s, 120s, 240s
          const delaySeconds = 30 * Math.pow(2, currentRetryCount);
          const nextDate = new Date();
          nextDate.setSeconds(nextDate.getSeconds() + delaySeconds);
          nextRetryAt = nextDate.toISOString();
       } else {
          deliveryStatus = 'Dead Letter';
       }
    }

    // Log the result back into Postgres
    const updatePayload: any = {
      status_code: partnerResponseStatus,
      response_payload: partnerResponseBody,
      status: deliveryStatus,
      updated_at: new Date().toISOString()
    };
    
    if (nextRetryAt) {
       updatePayload.next_retry_at = nextRetryAt;
    }
    
    // If it's a real failure attempt, we actually increment the retry_count by relying on the next poll to increment it, OR we increment it here?
    // Wait, the process_webhook_retries() doesn't increment the retry_count, it just passes it. So we should increment it here if it failed.
    if (deliveryStatus === 'Pending Retry' || deliveryStatus === 'Dead Letter') {
       updatePayload.retry_count = currentRetryCount + 1;
    }

    const { error: dbError } = await supabase
      .from('webhook_deliveries')
      .update(updatePayload)
      .eq('id', delivery_id);

    if (dbError) {
      console.error(`Failed to update delivery log ${delivery_id}:`, dbError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      delivery_id, 
      status: deliveryStatus 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Webhook runner error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
