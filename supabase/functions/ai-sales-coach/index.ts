import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// This function acts as the AI Sales Coach Engine.
// It can be triggered manually via a webhook or run on a schedule (pg_cron).
// In a full production environment, this would integrate with an LLM (OpenAI/Gemini).
// For now, it performs smart rule-based heuristics and simulates LLM insights to evaluate counselors and leads.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { type } = await req.json();

    if (type === 'analyze_leads') {
      // Fetch active leads that haven't been updated recently or need prioritization
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .not('status', 'in', '("Admission Done", "Lost")')
        .limit(100); // Batched processing

      if (leadsError) throw leadsError;

      let processedCount = 0;
      for (const lead of leads) {
        // Simple mock intelligence logic
        let aiPriorityScore = 50;
        let aiPriorityReason = 'Standard follow-up required.';
        let aiDropOffRisk = 'Low';
        let aiNextAction = 'Send standard check-in message.';

        // Calculate factors based on standard CRM data
        const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(lead.updated_at).getTime()) / (1000 * 3600 * 24));
        
        if (lead.status === 'Qualified' && daysSinceUpdate > 2) {
          aiPriorityScore = 80;
          aiDropOffRisk = 'Medium';
          aiPriorityReason = 'Qualified lead has no activity in 48 hours.';
          aiNextAction = 'Call immediately to discuss next steps.';
        } else if (lead.status === 'Application Started' && daysSinceUpdate > 3) {
          aiPriorityScore = 90;
          aiDropOffRisk = 'High';
          aiPriorityReason = 'Application started but stalled.';
          aiNextAction = 'Send WhatsApp reminder for missing documents.';
        } else if (lead.conversion_probability > 70) {
          aiPriorityScore = 85;
          aiPriorityReason = 'High conversion probability lead.';
          aiNextAction = 'Review application progress and offer assistance.';
        }

        // Simulate objection detection
        let aiObjectionDetected = null;
        if (lead.notes && lead.notes.toLowerCase().includes('expensive')) {
          aiObjectionDetected = 'Finance';
          aiNextAction = 'Share EMI plans and scholarship options.';
        }

        // Update the lead
        await supabase
          .from('leads')
          .update({
            ai_priority_score: aiPriorityScore,
            ai_priority_reason: aiPriorityReason,
            ai_drop_off_risk: aiDropOffRisk,
            ai_suggested_next_action: aiNextAction,
            ai_objection_detected: aiObjectionDetected
          })
          .eq('id', lead.id);
          
        processedCount++;
      }

      return new Response(JSON.stringify({ success: true, processed: processedCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'analyze_counselors') {
      // Analyze counselor performance
      const { data: counselors, error: counselorError } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true);
        
      if (counselorError) throw counselorError;

      for (const counselor of counselors) {
        // In a real scenario, this would aggregate activity logs, lead state changes, etc.
        const mockScore = Math.floor(Math.random() * 30) + 70; // 70-100
        const mockContactRate = Math.floor(Math.random() * 20) + 75; // 75-95%
        const mockConversionRate = Math.floor(Math.random() * 15) + 10; // 10-25%
        
        // Upsert daily performance
        await supabase
          .from('counselor_performance')
          .upsert({
            counselor_id: counselor.id,
            date: new Date().toISOString().split('T')[0],
            score: mockScore,
            contact_rate_percent: mockContactRate,
            conversion_rate_percent: mockConversionRate,
            avg_response_time_mins: Math.floor(Math.random() * 120) + 15, // 15-135 mins
            ai_strengths: 'Excellent initial response time on new leads.',
            ai_improvements: 'Follow-ups on "Application Started" leads are delayed by 24h on average.',
            ai_recommendation: 'Set a daily reminder at 10 AM to check all stalled applications.'
          }, { onConflict: 'counselor_id, date' });
          
        // Generate manager alert if score is low
        if (mockScore < 75) {
          await supabase
            .from('ai_manager_alerts')
            .insert({
              title: 'Performance Drop Detected',
              description: `Counselor ${counselor.name} has a performance score of ${mockScore} today.`,
              severity: 'Medium',
              counselor_id: counselor.id
            });
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Counselor analysis complete' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action type' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
