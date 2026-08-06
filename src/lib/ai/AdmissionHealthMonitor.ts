import { supabase } from '../supabase';

export class AdmissionHealthMonitor {
  /**
   * Analyzes an admission record for health, missing documents, and payment risks.
   */
  static async analyze(admissionId: string): Promise<void> {
    const { data: admission } = await supabase.from('admissions').select('*').eq('id', admissionId).single();
    if (!admission) return;

    let healthScore = 100;
    let atRisk = false;
    let riskReason = '';

    // Check Documents
    const { data: documents } = await supabase.from('documents').select('verification_status').eq('admission_id', admissionId);
    if (documents) {
      const pendingDocs = documents.filter(d => d.verification_status === 'Pending' || d.verification_status === 'Need Resubmission');
      if (pendingDocs.length > 0) {
        healthScore -= (pendingDocs.length * 10);
        atRisk = true;
        riskReason = `${pendingDocs.length} documents pending or need resubmission.`;
      }
    }

    // Check Payments
    const { data: payments } = await supabase.from('payments').select('id, status, amount').eq('admission_id', admissionId);
    if (payments) {
      const pendingPayments = payments.filter(p => p.status === 'Pending' || p.status === 'Failed');
      if (pendingPayments.length > 0) {
        healthScore -= (pendingPayments.length * 15);
        atRisk = true;
        riskReason += ` ${pendingPayments.length} payments pending/failed.`;
      }
      
      // Update Payment objects directly for collection urgency
      for (const p of pendingPayments) {
        await supabase.from('payments').update({
          collection_urgency: p.amount > 50000 ? 'High' : 'Medium',
          late_probability: 75.0
        }).eq('id', p.id);
      }
    }

    // Activity check (has it been stuck in one stage for too long?)
    const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(admission.updated_at).getTime()) / (1000 * 3600 * 24));
    if (daysSinceUpdate > 7 && admission.admission_status !== 'Completed') {
      healthScore -= (daysSinceUpdate * 2);
      atRisk = true;
      riskReason += ` No activity in ${daysSinceUpdate} days.`;
    }

    // Update Admission
    await supabase.from('admissions').update({
      health_score: Math.max(healthScore, 0),
      at_risk: atRisk,
      risk_reason: riskReason.trim() || null
    }).eq('id', admissionId);
  }
}
