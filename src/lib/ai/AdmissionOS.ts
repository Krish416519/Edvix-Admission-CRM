import { supabase } from '../supabase';

/**
 * The 14-stage unified pipeline that combines LeadStatus + AdmissionStage
 */
export const PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Qualified',
  'Counselling',
  'University Suggested',
  'Documents Pending',
  'Documents Verified',
  'Application Submitted',
  'University Review',
  'Offer Letter',
  'Fee Payment',
  'Admission Confirmed',
  'LMS Activated',
  'Completed'
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export interface PipelineCard {
  id: string;
  leadId: string;
  admissionId?: string;
  studentName: string;
  email: string;
  phone: string;
  pipelineStage: PipelineStage;
  ownerId?: string;
  ownerName: string;
  waitingHours: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  nextAction: string;
  admissionProbability: number;
  dropoutProbability: number;
  paymentProbability: number;
  followupUrgency: 'Low' | 'Normal' | 'High' | 'Critical';
  bestUniversity?: string;
  expectedRevenue: number;
  lastActivityAt?: string;
}

export interface RiskAlert {
  id: string;
  alertType: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  entityName: string;
  suggestedAction: string;
  status: 'Active' | 'Acknowledged' | 'Resolved' | 'Dismissed';
  createdAt: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  type: 'call' | 'followup' | 'document' | 'payment' | 'review' | 'alert';
  entityId?: string;
  entityType?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  completed: boolean;
}

/**
 * AdmissionOS — The Global AI Brain
 * 
 * Central intelligence layer that has read access to every CRM table
 * and provides computed insights for the entire admission lifecycle.
 */
export class AdmissionOS {

  /**
   * Maps a lead's current status + admission stage into the unified 14-stage pipeline.
   */
  static mapToPipelineStage(leadStatus: string, admissionStage?: string): PipelineStage {
    // If there's an active admission, use its stage
    if (admissionStage) {
      const stageMap: Record<string, PipelineStage> = {
        'Inquiry': 'Counselling',
        'Interested': 'Counselling',
        'Counseling': 'Counselling',
        'Documents Pending': 'Documents Pending',
        'Documents Verified': 'Documents Verified',
        'Documents Uploaded': 'Documents Verified',
        'Application Submitted': 'Application Submitted',
        'Application Started': 'Application Submitted',
        'University Verification': 'University Review',
        'University Review': 'University Review',
        'Offer Letter': 'Offer Letter',
        'Fee Pending': 'Fee Payment',
        'Fee Payment Pending': 'Fee Payment',
        'Fee Payment Completed': 'Fee Payment',
        'Payment Received': 'Admission Confirmed',
        'Admission Confirmed': 'Admission Confirmed',
        'Enrollment Completed': 'Admission Confirmed',
        'Enrollment Number Received': 'Admission Confirmed',
        'LMS Issued': 'LMS Activated',
        'LMS Credentials Received': 'LMS Activated',
        'Completed': 'Completed',
        'Admission Completed': 'Completed',
        'ABC ID Created': 'Application Submitted',
        'DEB ID Created': 'Application Submitted',
      };
      if (stageMap[admissionStage]) return stageMap[admissionStage];
    }

    // Fall back to lead status
    const leadMap: Record<string, PipelineStage> = {
      'New': 'New Lead',
      'Attempted': 'Contacted',
      'Connected': 'Contacted',
      'Interested': 'Qualified',
      'Qualified': 'Qualified',
      'Application Started': 'Application Submitted',
      'Documents Pending': 'Documents Pending',
      'Admission Done': 'Completed',
      'Lost': 'New Lead', // Lost leads go back to pool
    };
    return leadMap[leadStatus] || 'New Lead';
  }

  /**
   * Computes the risk level for a student based on their pipeline position and activity.
   */
  static computeRiskLevel(waitingHours: number, stage: PipelineStage, conversionProb: number): 'Low' | 'Medium' | 'High' | 'Critical' {
    if (conversionProb < 10) return 'Critical';
    if (waitingHours > 168) return 'Critical'; // > 7 days
    if (waitingHours > 72) return 'High'; // > 3 days
    if (waitingHours > 24 && ['Documents Pending', 'Fee Payment'].includes(stage)) return 'High';
    if (waitingHours > 24) return 'Medium';
    return 'Low';
  }

  /**
   * Generates the next recommended action for a student at a given pipeline stage.
   */
  static suggestNextAction(stage: PipelineStage, waitingHours: number): string {
    const actions: Record<PipelineStage, string> = {
      'New Lead': 'Make initial contact call',
      'Contacted': 'Schedule counselling session',
      'Qualified': 'Begin university matching',
      'Counselling': 'Generate AI university recommendations',
      'University Suggested': 'Collect required documents',
      'Documents Pending': waitingHours > 48 ? 'Send document reminder via WhatsApp' : 'Follow up on pending documents',
      'Documents Verified': 'Submit application to university',
      'Application Submitted': 'Track university review status',
      'University Review': 'Follow up with university admission office',
      'Offer Letter': 'Share offer letter and initiate fee payment',
      'Fee Payment': waitingHours > 24 ? 'Send payment reminder' : 'Confirm payment receipt',
      'Admission Confirmed': 'Initiate LMS activation',
      'LMS Activated': 'Send onboarding materials to student',
      'Completed': 'Request student feedback & referral',
    };
    return actions[stage] || 'Review student profile';
  }

  /**
   * Fetches the full live pipeline from Supabase.
   * Joins leads + admissions + users to build the pipeline view.
   */
  static async getLivePipeline(): Promise<PipelineCard[]> {
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name, email, phone,
        lead_status, priority, score,
        assigned_counselor, budget,
        conversion_probability, temperature, drop_off_risk, payment_probability,
        created_at, updated_at
      `)
      .is('deleted_at', null)
      .neq('lead_status', 'Lost')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error || !leads) return [];

    // Fetch admissions for these leads
    const leadIds = leads.map(l => l.id);
    const { data: admissions } = await supabase
      .from('admissions')
      .select('id, lead_id, current_stage, admission_status, assigned_counselor, fee_structure, updated_at')
      .in('lead_id', leadIds)
      .neq('admission_status', 'Cancelled');

    // Fetch counselor names
    const counselorIds = [...new Set([
      ...leads.map(l => l.assigned_counselor).filter(Boolean),
      ...(admissions || []).map(a => a.assigned_counselor).filter(Boolean)
    ])];

    const { data: counselors } = counselorIds.length > 0
      ? await supabase.from('users').select('id, full_name, email').in('id', counselorIds)
      : { data: [] };

    const counselorMap = new Map((counselors || []).map(c => [c.id, c.full_name || c.email]));

    // Build pipeline cards
    const admissionMap = new Map((admissions || []).map(a => [a.lead_id, a]));

    return leads.map(lead => {
      const admission = admissionMap.get(lead.id);
      const pipelineStage = this.mapToPipelineStage(lead.lead_status, admission?.current_stage);
      const ownerId = admission?.assigned_counselor || lead.assigned_counselor;
      const ownerName = ownerId ? (counselorMap.get(ownerId) || 'Unassigned') : 'Unassigned';
      const lastUpdate = admission?.updated_at || lead.updated_at;
      const waitingHours = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 3600));
      const conversionProb = lead.conversion_probability || 10;
      const riskLevel = this.computeRiskLevel(waitingHours, pipelineStage, conversionProb);

      return {
        id: lead.id,
        leadId: lead.id,
        admissionId: admission?.id,
        studentName: `${lead.first_name} ${lead.last_name || ''}`.trim(),
        email: lead.email,
        phone: lead.phone,
        pipelineStage,
        ownerId,
        ownerName,
        waitingHours,
        riskLevel,
        nextAction: this.suggestNextAction(pipelineStage, waitingHours),
        admissionProbability: conversionProb,
        dropoutProbability: lead.drop_off_risk === 'High' ? 75 : lead.drop_off_risk === 'Medium' ? 40 : 10,
        paymentProbability: lead.payment_probability || conversionProb * 0.8,
        followupUrgency: waitingHours > 72 ? 'Critical' : waitingHours > 24 ? 'High' : waitingHours > 8 ? 'Normal' : 'Low',
        bestUniversity: undefined,
        expectedRevenue: admission?.fee_structure || parseFloat(lead.budget) || 0,
        lastActivityAt: lastUpdate,
      } as PipelineCard;
    });
  }

  /**
   * Fetches active risk alerts from Supabase.
   */
  static async getRiskAlerts(): Promise<RiskAlert[]> {
    const { data, error } = await supabase
      .from('ai_risk_alerts')
      .select('*')
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) return [];

    return data.map(d => ({
      id: d.id,
      alertType: d.alert_type,
      severity: d.severity,
      title: d.title,
      description: d.description,
      entityType: d.entity_type,
      entityId: d.entity_id,
      entityName: d.entity_name,
      suggestedAction: d.suggested_action,
      status: d.status,
      createdAt: d.created_at,
    }));
  }

  /**
   * Scans all active leads and generates risk alerts for issues.
   */
  static async runRiskScan(): Promise<RiskAlert[]> {
    const pipeline = await this.getLivePipeline();
    const alerts: RiskAlert[] = [];

    for (const card of pipeline) {
      // Inactive leads
      if (card.waitingHours > 48 && card.riskLevel !== 'Low') {
        alerts.push({
          id: crypto.randomUUID(),
          alertType: 'inactive_lead',
          severity: card.waitingHours > 168 ? 'Critical' : 'High',
          title: `${card.studentName} inactive for ${card.waitingHours}h`,
          description: `Lead stuck at "${card.pipelineStage}" stage for ${Math.floor(card.waitingHours / 24)} days.`,
          entityType: 'Lead',
          entityId: card.leadId,
          entityName: card.studentName,
          suggestedAction: card.nextAction,
          status: 'Active',
          createdAt: new Date().toISOString(),
        });
      }

      // High dropout risk
      if (card.dropoutProbability > 60) {
        alerts.push({
          id: crypto.randomUUID(),
          alertType: 'dropout_risk',
          severity: card.dropoutProbability > 80 ? 'Critical' : 'High',
          title: `${card.studentName} likely to drop off`,
          description: `Dropout probability: ${card.dropoutProbability}%. Current stage: ${card.pipelineStage}.`,
          entityType: 'Lead',
          entityId: card.leadId,
          entityName: card.studentName,
          suggestedAction: 'Assign to senior counselor for retention call',
          status: 'Active',
          createdAt: new Date().toISOString(),
        });
      }
    }

    return alerts;
  }

  /**
   * Gets summary statistics for the executive dashboard.
   */
  static async getExecutiveSummary() {
    const pipeline = await this.getLivePipeline();

    const stageDistribution: Record<string, number> = {};
    let totalRevenue = 0;
    let criticalAlerts = 0;
    let highRiskCount = 0;

    for (const card of pipeline) {
      stageDistribution[card.pipelineStage] = (stageDistribution[card.pipelineStage] || 0) + 1;
      totalRevenue += card.expectedRevenue;
      if (card.riskLevel === 'Critical') criticalAlerts++;
      if (card.riskLevel === 'High' || card.riskLevel === 'Critical') highRiskCount++;
    }

    return {
      totalStudents: pipeline.length,
      stageDistribution,
      expectedRevenue: totalRevenue,
      criticalAlerts,
      highRiskCount,
      avgAdmissionProbability: pipeline.length > 0
        ? Math.round(pipeline.reduce((sum, c) => sum + c.admissionProbability, 0) / pipeline.length)
        : 0,
    };
  }
}
