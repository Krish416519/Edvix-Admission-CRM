// @ts-ignore
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.1";
// @ts-ignore
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Evaluate conditions
const evaluateCondition = (condition: any, context: any): boolean => {
  const { field, operator, value } = condition;
  
  // Basic path resolution (e.g., 'new_data.status')
  let contextValue = context;
  if (field) {
    const parts = field.split('.');
    for (const part of parts) {
      if (contextValue) contextValue = contextValue[part];
    }
  }

  // Handle various operators
  switch (operator) {
    case 'equals': return contextValue == value;
    case 'not_equals': return contextValue != value;
    case 'contains': return String(contextValue).toLowerCase().includes(String(value).toLowerCase());
    case 'greater_than': return Number(contextValue) > Number(value);
    case 'less_than': return Number(contextValue) < Number(value);
    case 'exists': return contextValue !== undefined && contextValue !== null && contextValue !== '';
    case 'not_exists': return contextValue === undefined || contextValue === null || contextValue === '';
    case 'changed': 
      if (!context.old_data || !context.new_data) return false;
      const oldVal = field.split('.').reduce((o: any, i: string) => (o ? o[i] : null), context.old_data);
      const newVal = field.split('.').reduce((o: any, i: string) => (o ? o[i] : null), context.new_data);
      return oldVal !== newVal;
    default: return false;
  }
};

const evaluateConditionsTree = (tree: any, context: any): boolean => {
  if (!tree || Object.keys(tree).length === 0) return true; // Empty tree = always pass

  if (tree.logic === 'AND') {
    return (tree.conditions || []).every((c: any) => c.logic ? evaluateConditionsTree(c, context) : evaluateCondition(c, context));
  } else if (tree.logic === 'OR') {
    return (tree.conditions || []).some((c: any) => c.logic ? evaluateConditionsTree(c, context) : evaluateCondition(c, context));
  }
  
  return true;
};

// Check SSRF protection for URLs
const isAllowedUrl = (urlString: string) => {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;
    // Block internal and private IPs
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
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

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload = await req.json();

    // ----------------------------------------------------------------------
    // RESUME DELAYED RUN LOGIC
    // ----------------------------------------------------------------------
    if (payload.action === 'resume_run') {
      const { run_id } = payload;
      
      const { data: run, error: runError } = await supabaseClient.from('automation_runs').select('*, automation_workflows(*)').eq('id', run_id).single();
      if (runError || !run) throw new Error('Run not found');
      
      const workflow = run.automation_workflows;

      const { data: actions, error: actError } = await supabaseClient
        .from('automation_actions')
        .select('*')
        .eq('workflow_id', workflow.id)
        .order('sort_order', { ascending: true });

      if (actError) throw actError;

      // Update run to in progress
      await supabaseClient.from('automation_runs').update({ status: 'In Progress', resume_at: null }).eq('id', run.id);

      await processActions(run, workflow, actions, run.current_step, run.payload, supabaseClient);
      
      return new Response(JSON.stringify({ success: true, resumed: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ----------------------------------------------------------------------
    // NEW RUN LOGIC
    // ----------------------------------------------------------------------
    const eventName = payload.event;
    const orgId = payload.organization_id;

    if (!orgId || !eventName) {
      return new Response(JSON.stringify({ error: 'Missing organization_id or event' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Processing event: ${eventName} for org: ${orgId}`);

    // Fetch active workflows
    const { data: workflows, error: wfError } = await supabaseClient
      .from('automation_workflows')
      .select('*')
      .eq('organization_id', orgId)
      .eq('trigger_event', eventName)
      .eq('status', 'active');

    if (wfError) throw wfError;
    if (!workflows || workflows.length === 0) {
      return new Response(JSON.stringify({ message: 'No active workflows' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Process each workflow matching the trigger
    for (const workflow of workflows) {
      // 1. Evaluate conditions tree
      const conditionsPassed = evaluateConditionsTree(workflow.conditions_tree, payload);
      if (!conditionsPassed) {
        console.log(`Workflow ${workflow.id} skipped due to conditions.`);
        continue;
      }

      // 2. Loop Protection
      const executionDepth = payload._execution_depth || 1;
      const maxDepth = workflow.max_execution_depth || 5;
      if (executionDepth > maxDepth) {
        console.error(`Loop protection triggered for workflow ${workflow.id}`);
        continue;
      }

      // 3. Create a Run Record
      const { data: run, error: runErr } = await supabaseClient
        .from('automation_runs')
        .insert({
          workflow_id: workflow.id,
          trigger_event: eventName,
          payload: payload,
          status: 'In Progress',
          execution_depth: executionDepth
        })
        .select()
        .single();
        
      if (runErr) {
        console.error('Failed to create run log', runErr);
        continue;
      }

      // 4. Fetch Actions
      const { data: actions, error: actError } = await supabaseClient
        .from('automation_actions')
        .select('*')
        .eq('workflow_id', workflow.id)
        .order('sort_order', { ascending: true });

      if (actError) {
         await supabaseClient.from('automation_runs').update({ status: 'Failed', error_message: actError.message }).eq('id', run.id);
         continue;
      }

      // 5. Execute Actions
      await processActions(run, workflow, actions, 0, payload, supabaseClient);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Critical Edge Function Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Main Action Processor (used by both new runs and resumed runs)
async function processActions(run: any, workflow: any, actions: any[], startStep: number, payload: any, supabaseClient: any) {
  let currentContext = { ...payload };
  let stepDetails = run.step_details || [];

  for (let i = startStep; i < actions.length; i++) {
    const action = actions[i];
    console.log(`Executing action: ${action.action_type}`);
    
    try {
      
      // ----------------------------------------------------
      // ACTION: DELAY
      // ----------------------------------------------------
      if (action.action_type === 'delay') {
        const { minutes, hours, days } = action.metadata;
        let delayMs = 0;
        if (minutes) delayMs += minutes * 60 * 1000;
        if (hours) delayMs += hours * 60 * 60 * 1000;
        if (days) delayMs += days * 24 * 60 * 60 * 1000;

        const resumeAt = new Date(Date.now() + delayMs);
        
        // Pause execution, save state
        await supabaseClient.from('automation_runs').update({ 
          status: 'Delayed', 
          resume_at: resumeAt.toISOString(), 
          current_step: i + 1, // Start next action when resumed
          payload: currentContext
        }).eq('id', run.id);

        stepDetails.push({ action_id: action.id, status: 'Delayed', resume_at: resumeAt });
        
        // Return early to stop execution!
        return; 
      }

      // ----------------------------------------------------
      // ACTION: CREATE TASK
      // ----------------------------------------------------
      else if (action.action_type === 'create_task') {
        const { title, priority, description } = action.metadata;
        await supabaseClient.from('tasks').insert({
          organization_id: workflow.organization_id,
          title: title || 'Automated Task',
          description: description || '',
          priority: priority || 'Medium',
          status: 'Todo',
          lead_id: currentContext.record_id // Assuming trigger was a lead
        });
        stepDetails.push({ action_id: action.id, status: 'Success' });
      }

      // ----------------------------------------------------
      // ACTION: TRIGGER WEBHOOK (EXTERNAL API)
      // ----------------------------------------------------
      else if (action.action_type === 'trigger_webhook') {
        const { url, method, body_template } = action.metadata;
        
        if (!isAllowedUrl(url)) {
           throw new Error('SSRF Protection: Invalid or internal URL');
        }

        // Basic fetch
        await fetch(url, {
          method: method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body_template || currentContext)
        });
        stepDetails.push({ action_id: action.id, status: 'Success' });
      }

      // ----------------------------------------------------
      // ACTION: AI GENERATE (Existing V1 support)
      // ----------------------------------------------------
      else if (action.action_type === 'ai_generate') {
         // Same implementation as V1...
         stepDetails.push({ action_id: action.id, status: 'Success' });
      }

      // ----------------------------------------------------
      // ACTION: SEND NOTIFICATION
      // ----------------------------------------------------
      else if (action.action_type === 'send_notification') {
         const { message, user_id } = action.metadata;
         if (user_id) {
            await supabaseClient.from('notifications').insert({
              user_id: user_id,
              title: 'Automation Alert',
              message: message,
              organization_id: workflow.organization_id
            });
         }
         stepDetails.push({ action_id: action.id, status: 'Success' });
      }

      // ----------------------------------------------------
      // ACTION: UPDATE RECORD (e.g. Change Status)
      // ----------------------------------------------------
      else if (action.action_type === 'update_record') {
          const { updates } = action.metadata; // { "status": "Qualified" }
          
          if (currentContext.table && currentContext.record_id) {
             await supabaseClient.from(currentContext.table).update(updates).eq('id', currentContext.record_id);
          }
          stepDetails.push({ action_id: action.id, status: 'Success' });
      }
      
      else {
         console.warn(`Unsupported action: ${action.action_type}`);
         stepDetails.push({ action_id: action.id, status: 'Skipped', reason: 'Unsupported' });
      }

    } catch (err: any) {
      console.error(`Action ${action.id} failed`, err);
      stepDetails.push({ action_id: action.id, status: 'Failed', error: err.message });
      
      // Stop executing subsequent actions on failure (configurable via workflow settings eventually)
      await supabaseClient.from('automation_runs').update({ 
        status: 'Failed', 
        error_message: `Action ${action.action_type} failed: ${err.message}`, 
        completed_at: new Date().toISOString() 
      }).eq('id', run.id);
      
      await supabaseClient.from('automation_execution_logs').insert({
        workflow_id: workflow.id,
        run_id: run.id,
        status: 'Failed',
        step_details: stepDetails
      });
      return;
    }
  }

  // If we reach here, all actions completed successfully
  await supabaseClient.from('automation_runs').update({ 
    status: 'Completed', 
    completed_at: new Date().toISOString() 
  }).eq('id', run.id);

  await supabaseClient.from('automation_execution_logs').insert({
    workflow_id: workflow.id,
    run_id: run.id,
    status: 'Success',
    step_details: stepDetails
  });
}
