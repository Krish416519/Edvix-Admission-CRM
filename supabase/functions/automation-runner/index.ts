import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Ensure it's a POST request
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse the incoming webhook payload
    const payload = await req.json();
    const eventName = payload.event;
    
    // We need the organization_id to find active workflows for this tenant
    // Our existing triggers include it, or we can look it up based on the payload data
    let orgId = payload.organization_id;
    
    if (!orgId) {
      if (payload.lead_id) {
        const { data: lead } = await supabaseClient.from('leads').select('organization_id').eq('id', payload.lead_id).single();
        orgId = lead?.organization_id;
      } else if (payload.admission_id) {
        const { data: adm } = await supabaseClient.from('admissions').select('leads(organization_id)').eq('id', payload.admission_id).single();
        orgId = (adm as any)?.leads?.organization_id;
      }
    }

    if (!orgId || !eventName) {
      return new Response(JSON.stringify({ error: 'Missing organization_id or event' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing event: ${eventName} for org: ${orgId}`);

    // Fetch active workflows for this event and organization
    const { data: workflows, error: wfError } = await supabaseClient
      .from('automation_workflows')
      .select('id, name')
      .eq('organization_id', orgId)
      .eq('trigger_event', eventName)
      .eq('status', 'active');

    if (wfError) throw wfError;
    if (!workflows || workflows.length === 0) {
      console.log('No active workflows found.');
      return new Response(JSON.stringify({ message: 'No active workflows' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Process each matching workflow
    for (const workflow of workflows) {
      console.log(`Executing workflow: ${workflow.name} (${workflow.id})`);

      // Create a Run Record
      const { data: run, error: runErr } = await supabaseClient
        .from('automation_runs')
        .insert({
          workflow_id: workflow.id,
          trigger_event: eventName,
          payload: payload,
          status: 'In Progress'
        })
        .select()
        .single();
        
      if (runErr) {
        console.error('Failed to create run log', runErr);
        continue;
      }

      try {
        // Fetch Actions for this workflow, ordered by sort_order
        const { data: actions, error: actError } = await supabaseClient
          .from('automation_actions')
          .select('*')
          .eq('workflow_id', workflow.id)
          .order('sort_order', { ascending: true });

        if (actError) throw actError;

        let currentContext = { ...payload };

        // Execute Actions Sequentially
        for (const action of actions) {
          console.log(`Executing action: ${action.action_type}`);
          
          if (action.action_type === 'ai_generate') {
            // Action: AI Generation
            const promptTemplate = action.metadata?.prompt;
            if (!promptTemplate) throw new Error('Missing prompt in ai_generate action');

            // Simple templating: replace {{key}} with value from context
            let finalPrompt = promptTemplate;
            for (const key in currentContext) {
              const regex = new RegExp(`{{${key}}}`, 'g');
              finalPrompt = finalPrompt.replace(regex, currentContext[key] || '');
            }

            console.log('AI Prompt:', finalPrompt);

            // Call Gemini
            const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(finalPrompt);
            const aiResponse = result.response.text();
            
            console.log('AI Output:', aiResponse);

            // Add to context for the next step (e.g., WhatsApp)
            currentContext.ai_output = aiResponse;

            // Log step
            await supabaseClient.from('automation_execution_logs').insert({
              run_id: run.id,
              action_id: action.id,
              status: 'Success',
              output_data: { prompt: finalPrompt, result: aiResponse }
            });

          } else if (action.action_type === 'whatsapp_send') {
            // Action: Send WhatsApp
            // We use the generated AI text or a static template
            let messageText = action.metadata?.message_body;
            
            // Replace variables in the WhatsApp message text
            for (const key in currentContext) {
              const regex = new RegExp(`{{${key}}}`, 'g');
              messageText = messageText.replace(regex, currentContext[key] || '');
            }

            console.log('Preparing to send WhatsApp:', messageText);

            // Look up the lead's contact
            if (currentContext.lead_id) {
              const { data: contact } = await supabaseClient
                .from('whatsapp_contacts')
                .select('id, phone_number')
                .eq('lead_id', currentContext.lead_id)
                .single();

              if (contact) {
                // Find or create conversation
                const { data: conv } = await supabaseClient
                  .from('whatsapp_conversations')
                  .select('id')
                  .eq('contact_id', contact.id)
                  .single();
                  
                let convId = conv?.id;
                
                if (!convId) {
                  const { data: newConv } = await supabaseClient
                    .from('whatsapp_conversations')
                    .insert({ contact_id: contact.id, lead_id: currentContext.lead_id })
                    .select()
                    .single();
                  convId = newConv?.id;
                }

                // Insert into whatsapp_messages
                // In a real system, a trigger on this table or this edge function would actually hit the Meta API
                await supabaseClient.from('whatsapp_messages').insert({
                  conversation_id: convId,
                  sender_type: 'system',
                  message_type: 'text',
                  content: messageText,
                  status: 'queued'
                });
                
                console.log('WhatsApp message queued successfully');
              } else {
                 console.log('No WhatsApp contact found for lead');
              }
            }

            // Log step
            await supabaseClient.from('automation_execution_logs').insert({
              run_id: run.id,
              action_id: action.id,
              status: 'Success',
              output_data: { message_sent: messageText }
            });
          }
        }

        // Mark run as completed
        await supabaseClient.from('automation_runs').update({ status: 'Completed', completed_at: new Date().toISOString() }).eq('id', run.id);

      } catch (err: any) {
        console.error('Workflow failed', err);
        // Mark run as failed
        await supabaseClient.from('automation_runs').update({ status: 'Failed', error_message: err.message, completed_at: new Date().toISOString() }).eq('id', run.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Critical Edge Function Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
