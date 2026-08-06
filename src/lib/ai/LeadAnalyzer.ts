import { supabase } from '../supabase';
import { Lead } from '../../types/schema';

export class LeadAnalyzer {
  /**
   * Deterministically calculates AI metrics for a lead without hitting the Gemini API to save costs.
   * Updates conversion probability, temperature, and risk based on CRM activity.
   */
  static async analyze(leadId: string): Promise<void> {
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (!lead) return;

    const { data: activities } = await supabase.from('lead_activities').select('id, type, created_at').eq('lead_id', leadId);
    
    // Engagement Score based on activities
    const activityCount = activities?.length || 0;
    let engagementScore = activityCount * 10;
    if (lead.notesCount) engagementScore += lead.notesCount * 5;
    if (lead.tasksCount) engagementScore += lead.tasksCount * 5;
    
    // Temperature
    let temperature = 'Cold';
    if (engagementScore > 60 || lead.status === 'Application Started') temperature = 'Hot';
    else if (engagementScore > 25 || lead.status === 'Interested') temperature = 'Warm';

    // Conversion Probability
    let conversionProb = 5.0; // base
    if (lead.priority === 'High') conversionProb += 15;
    if (temperature === 'Hot') conversionProb += 30;
    if (temperature === 'Warm') conversionProb += 15;
    if (lead.status === 'Interested') conversionProb += 20;
    if (lead.status === 'Qualified') conversionProb += 35;
    if (lead.status === 'Application Started') conversionProb += 60;
    if (lead.status === 'Admission Done') conversionProb = 100;
    if (lead.status === 'Lost') conversionProb = 0;

    // Drop Off Risk
    let dropOffRisk = 'Low';
    if (conversionProb < 20) dropOffRisk = 'High';
    else if (conversionProb < 50) dropOffRisk = 'Medium';
    if (lead.status === 'Lost') dropOffRisk = 'High';

    // Payment Probability
    let paymentProb = conversionProb * 0.8; // Rough heuristic for now

    // Update the database
    await supabase.from('leads').update({
      conversion_probability: Math.min(Math.max(conversionProb, 0), 100),
      temperature,
      drop_off_risk: dropOffRisk,
      payment_probability: Math.min(Math.max(paymentProb, 0), 100),
      score: Math.min(engagementScore, 100) // update legacy score too
    }).eq('id', leadId);
  }
}
