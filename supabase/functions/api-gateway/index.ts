import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";
import { SignJWT } from "npm:jose";
import { handleLeads } from "./routes/leads.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") || 'super-secret-jwt-token-with-at-least-32-characters-long';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace('/api-gateway', '');
  
  const logEntry = {
    request_id: requestId,
    endpoint: path || '/',
    method: req.method,
    ip_address: req.headers.get('x-forwarded-for') || 'unknown',
    user_agent: req.headers.get('user-agent') || 'unknown',
    source: 'External API',
    status: 500,
    response_time_ms: 0,
    api_key_id: null as string | null,
    organization_id: null as string | null,
    error_code: null as string | null
  };

  const finalizeRequest = async (status: number, payload: any) => {
    logEntry.status = status;
    logEntry.response_time_ms = Date.now() - startTime;
    
    // Normalize response payload
    const isError = status >= 400;
    const finalBody = isError 
      ? { success: false, error: payload.error || { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' } }
      : { success: true, data: payload.data || payload, meta: payload.meta || {} };

    if (isError && !logEntry.error_code) {
       logEntry.error_code = finalBody.error.code;
    }

    supabase.from('api_logs').insert([logEntry]).then();
    
    return new Response(JSON.stringify(finalBody), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-ID': requestId }
    });
  };

  try {
    // PUBLIC TEST ENDPOINT
    if (path === '/v1/health' || path === '/api/v1/health') {
       return finalizeRequest(200, {
          data: {
             status: "operational",
             version: "v1",
             timestamp: new Date().toISOString(),
             request_id: requestId
          }
       });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return finalizeRequest(401, { error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } });
    }

    const rawKey = authHeader.replace('Bearer ', '').trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = encodeHex(new Uint8Array(hashBuffer));
    console.log('Received Hash:', hashHex);

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, organization_id, status, environment, expires_at, rate_limit, permissions, name')
      .eq('key_hash', hashHex)
      .single();

    if (keyError || !keyData) {
      console.log('Key lookup error:', keyError, 'Hash:', hashHex);
      return finalizeRequest(401, { error: { code: 'INVALID_API_KEY', message: 'Invalid or revoked API key', hash: hashHex, detail: keyError } });
    }

    logEntry.api_key_id = keyData.id;
    logEntry.organization_id = keyData.organization_id;
    logEntry.source = keyData.name;

    if (keyData.status !== 'Active') {
      return finalizeRequest(403, { error: { code: 'REVOKED_API_KEY', message: 'This API key has been revoked or deactivated' } });
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return finalizeRequest(403, { error: { code: 'EXPIRED_API_KEY', message: 'This API key has expired' } });
    }

    // Rate Limiting
    const windowMs = 60000;
    const rateLimit = keyData.rate_limit || 100;
    const oneMinuteAgo = new Date(Date.now() - windowMs).toISOString();
    
    const { count } = await supabase
      .from('api_logs')
      .select('*', { count: 'exact', head: true })
      .eq('api_key_id', keyData.id)
      .gte('timestamp', oneMinuteAgo);
      
    if (count !== null && count >= rateLimit) {
      return finalizeRequest(429, { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Rate limit exceeded. Please try again later.' } });
    }

    supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id).then();

    // ------------------------------------------------------------------
    // ROUTER LAYER
    // ------------------------------------------------------------------
    
    const token = await new SignJWT({
      role: 'authenticated',
      aud: 'authenticated',
      sub: keyData.id,
      organization_id: keyData.organization_id,
      environment: keyData.environment,
      permissions: keyData.permissions
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(jwtSecret));

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    if (path.startsWith('/v1/leads') || path.startsWith('/api/v1/leads')) {
      return await handleLeads(req, url, path, authClient, keyData, requestId, finalizeRequest, supabase);
    }

    if (path.startsWith('/rest/v1/') || path.startsWith('/rpc/')) {
      const targetUrl = `${supabaseUrl}${path}${url.search}`;
      const targetHeaders = new Headers(req.headers);
      targetHeaders.set('Authorization', `Bearer ${token}`);
      targetHeaders.set('apikey', supabaseAnonKey);

      const proxyResponse = await fetch(targetUrl, {
        method: req.method,
        headers: targetHeaders,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
      });

      const responseBody = await proxyResponse.text();
      let parsedBody;
      try { parsedBody = JSON.parse(responseBody); } catch { parsedBody = responseBody; }
      
      // Keep original proxy structure, but wrap in standard response if it looks like an error
      if (!proxyResponse.ok) {
         return finalizeRequest(proxyResponse.status, { error: { code: 'UPSTREAM_ERROR', message: parsedBody.message || parsedBody } });
      }
      return finalizeRequest(proxyResponse.status, { data: parsedBody });
    }

    return finalizeRequest(404, { error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found on API Gateway' } });

  } catch (error: any) {
    console.error('API Gateway Error:', error);
    return finalizeRequest(500, { error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } });
  }
});
