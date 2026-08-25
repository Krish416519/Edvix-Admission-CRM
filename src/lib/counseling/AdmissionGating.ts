import { supabase } from '../supabase';
import { Lead } from '../../types/schema';

export class AdmissionGating {
  /**
   * Checks if a lead can proceed to admission based on their latest Recommendation Evaluation.
   * Returns { allowed: boolean, reason: string }
   */
  static async checkEligibility(leadId: string): Promise<{ allowed: boolean; reason: string }> {
    try {
      // 1. Fetch latest recommendation
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return { allowed: false, reason: 'No eligibility evaluation found. Please run the Eligibility & Match engine first.' };
      }

      const rec = data as any; // AiRecommendation type

      // 2. Evaluate Status
      if (!rec.status || rec.status !== 'Accepted') {
        return { allowed: false, reason: 'A recommendation must be accepted before initiating admission.' };
      }

      // Check specific eligibility status (assuming we've saved the accepted university's eligibility status)
      // Since ai_recommendations only stores the array and overall status, we might need to find the specific uni
      const acceptedUniCode = rec.selected_university_code;
      const unis = rec.universities_recommended || [];
      const acceptedUni = unis.find((u: any) => u.code === acceptedUniCode);

      if (!acceptedUni) {
        return { allowed: false, reason: 'Selected program data is missing or corrupted.' };
      }

      const status = acceptedUni.eligibilityStatus;

      switch(status) {
        case 'VERIFIED_ELIGIBLE':
        case 'LIKELY_ELIGIBLE':
          return { allowed: true, reason: 'Eligible to proceed.' };
        case 'CONDITIONAL':
          return { allowed: false, reason: 'Conditional Eligibility requires Manager Override to proceed.' };
        case 'MANUAL_REVIEW':
          return { allowed: false, reason: 'Manual Review is required before admission can proceed. Please clear this status with an Admin/Manager.' };
        case 'NOT_ELIGIBLE':
          return { allowed: false, reason: 'Student is explicitly NOT ELIGIBLE for the selected program.' };
        case 'INSUFFICIENT_DATA':
          return { allowed: false, reason: 'Insufficient data to determine eligibility. Complete the profile first.' };
        default:
          // Fallback if the legacy recommendation didn't have deterministic fields
          return { allowed: true, reason: 'Legacy recommendation bypass (No deterministic status found).' };
      }

    } catch (e) {
      console.error('Gating Error', e);
      return { allowed: false, reason: 'System error during eligibility check.' };
    }
  }
}
