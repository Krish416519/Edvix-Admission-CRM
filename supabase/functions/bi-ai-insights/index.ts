// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: any;

// Edge function to generate AI insights from BI data
// Requires Google Gemini / OpenAI API key to be set in Supabase secrets

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Example logic:
    // 1. Fetch current metrics
    // 2. Fetch last 7 days metrics
    // 3. Send to LLM
    // 4. Return insights

    return new Response(
      JSON.stringify({
        insights: [
          { type: 'opportunity', message: 'Conversion rates on Meta campaigns have increased by 14% this week. Consider reallocating budget to capitalize on this trend.' },
          { type: 'risk', message: 'There is pending revenue stalled at the Fee Payment Pending stage.' }
        ]
      }),
      {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 200
      }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as any).message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 400
    })
  }
})
