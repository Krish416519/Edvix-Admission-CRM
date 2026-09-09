import { supabase } from '../supabase';
import { RiskAlertItem, StageVelocity, ExecutiveSummaryReport } from '../../types/commandCenter';

/**
 * The unified pipeline stages combining LeadStatus + AdmissionStage
 */
export const PIPELINE_STAGES = [
  'Inquiry',
  'Not Connected',
  'Cold',
  'Warm',
  'Hot',
  'Qualified',
  'Application',
  'Docs Pending',
  'Admitted',
  'Rejected',
  'Counselling',
  'University Suggested',
  'Documents Verified',
  'ApplicationSubmitted',
  'University Review',
  'Offer Letter',
  'Fee Payment',
  'Admission Confirmed',
  'LMS Activated',
  'Completed'
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

export const STAGE_SLA_HOURS: Record<string, number> = {
  'Inquiry': 24,
  'Not Connected': 48,
  'Cold': 72,
  'Warm': 48,
  'Hot': 24,
  'Qualified': 48,
  'Application': 72,
  'Docs Pending': 48,
  'Admitted': 48,
  'Rejected': 168,
  'Counselling': 48,
  'University Suggested': 48,
  'Documents Verified': 48,
  'ApplicationSubmitted': 72,
  'University Review': 72,
  'Offer Letter': 48,
  'Fee Payment': 48,
  'Admission Confirmed': 24,
  'LMS Activated': 24,
  'Completed': 720,
};

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
 * AdmissionOS — Central Intelligence Engine for the Admission CRM
 */
export class AdmissionOS {

  /**
   * Maps a lead's status + admission stage into the unified 14-stage pipeline.
   */
  static mapToPipelineStage(leadStatus: string, admissionStage?: string): PipelineStage {
    if (admissionStage) {
      const stageMap: Record<string, PipelineStage> = {
        'Inquiry': 'Counselling',
        'Interested': 'Counselling',
        'Counseling': 'Counselling',
        'Documents Pending': 'Documents Verified',
        'Documents Verified': 'Documents Verified',
        'Documents Uploaded': 'Documents Verified',
        'ApplicationSubmitted': 'ApplicationSubmitted',
        'Application Started': 'ApplicationSubmitted',
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
        'ABC ID Created': 'ApplicationSubmitted',
        'DEB ID Created': 'ApplicationSubmitted',
      };
      if (stageMap[admissionStage]) return stageMap[admissionStage];
    }

    const leadMap: Record<string, PipelineStage> = {
      'Inquiry': 'Inquiry',
      'New': 'Inquiry',
      'Not Connected': 'Cold',
      'Cold': 'Cold',
      'Attempted': 'Not Connected',
      'Connected': 'Cold',
      'Warm': 'Warm',
      'Hot': 'Hot',
      'Interested': 'Hot',
      'Qualified': 'Qualified',
      'Application': 'ApplicationSubmitted',
      'Application Started': 'ApplicationSubmitted',
      'Docs Pending': 'Documents Verified',
      'Documents Pending': 'Documents Verified',
      'Admitted': 'Completed',
      'Admission Done': 'Completed',
      'Rejected': 'Rejected',
      'Lost': 'Rejected',
    };
    return leadMap[leadStatus] ?? 'Inquiry';
  }

  /**
   * Deterministic Risk Level Computation based on waiting hours, stage SLA, and probability.
   */
  static computeRiskLevel(waitingHours: number, stage: PipelineStage, conversionProb: number): 'Low' | 'Medium' | 'High' | 'Critical' {
    const sla = STAGE_SLA_HOURS[stage] || 48;
    if (conversionProb < 10) return 'Critical';
    if (waitingHours > sla * 3) return 'Critical'; // Exceeded 3x SLA threshold
    if (waitingHours > sla * 1.5) return 'High';
    if (waitingHours > sla) return 'Medium';
    return 'Low';
  }

  /**
   * Generates deterministic next recommended actions for a student at a given stage.
   */
  static suggestNextAction(stage: PipelineStage, waitingHours: number): string {
    const actions: Record<PipelineStage, string> = {
      'Inquiry': 'Make initial contact call',
      'Not Connected': 'Retry contact / send WhatsApp',
      'Cold': 'Warm up lead with automated engagement',
      'Warm': 'Send follow-up message & program brochure',
      'Hot': 'Schedule counselling session',
      'Qualified': 'Begin university matching & eligibility check',
      'Application': 'Collect required academic credentials',
      'Docs Pending': waitingHours > 48 ? 'Urgent document reminder via WhatsApp' : 'Follow up on pending marksheets',
      'Admitted': 'Initiate LMS activation and welcome kit',
      'Rejected': 'Schedule re-engagement call or archive',
      'Counselling': 'Deliver university recommendations',
      'University Suggested': 'Assist student with course selection',
      'Documents Verified': 'Submit formal application to university',
      'ApplicationSubmitted': 'Track university review & verification status',
      'University Review': 'Follow up with university admission registrar',
      'Offer Letter': 'Issue offer letter & initiate fee structure',
      'Fee Payment': waitingHours > 24 ? 'Send payment reminder & EMI details' : 'Confirm payment receipt',
      'Admission Confirmed': 'Generate enrollment number & start onboarding',
      'LMS Activated': 'Verify student login credentials',
      'Completed': 'Request student review & referral',
    };
    return actions[stage] || 'Review student profile';
  }

  /**
   * Fetches the full live pipeline from Supabase with timezone-safe waiting time calculations.
   */
  static async getLivePipeline(): Promise<PipelineCard[]> {
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select(`
          id, first_name, last_name, email, phone,
          lead_status, priority, lead_score,
          assigned_counselor, budget,
          conversion_probability, temperature, drop_off_risk, payment_probability,
          created_at, updated_at, last_call_date, next_action_date
        `)
        .is('deleted_at', null)
        .neq('lead_status', 'Lost')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error || !leads) return [];

      const leadIds = leads.map(l => l.id);

      // Fetch admissions
      const { data: admissions } = await supabase
        .from('admissions')
        .select('id, lead_id, current_stage, admission_status, assigned_counselor, fee_structure, updated_at, created_at')
        .in('lead_id', leadIds)
        .neq('admission_status', 'Cancelled');

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, lead_id, title, due_date, due_time, task_type, priority')
        .in('lead_id', leadIds)
        .neq('status', 'Completed')
        .is('deleted_at', null)
        .order('due_date', { ascending: true });

      // Fetch counselor names safely
      const counselorIds = [...new Set([
        ...leads.map(l => l.assigned_counselor).filter(Boolean),
        ...(admissions || []).map(a => a.assigned_counselor).filter(Boolean)
      ])];

      const { data: counselors } = counselorIds.length > 0
        ? await supabase.from('users').select('id, full_name, name, email').in('id', counselorIds)
        : { data: [] };

      const counselorMap = new Map((counselors || []).map(c => [c.id, c.full_name || c.name || c.email]));
      const admissionMap = new Map((admissions || []).map(a => [a.lead_id, a]));

      const tasksMap = new Map<string, any[]>();
      if (tasks) {
        tasks.forEach(t => {
          if (!tasksMap.has(t.lead_id)) tasksMap.set(t.lead_id, []);
          tasksMap.get(t.lead_id)!.push(t);
        });
      }

      return leads.map(lead => {
        const admission = admissionMap.get(lead.id);
        const pipelineStage = this.mapToPipelineStage(lead.lead_status, admission?.current_stage);
        const ownerId = admission?.assigned_counselor || lead.assigned_counselor;
        const ownerName = ownerId ? (counselorMap.get(ownerId) || 'Unassigned') : 'Unassigned';

        // AUDIT FIX: Waiting hours based on meaningful interactions (last call, next action, or creation date)
        const meaningfulLastContact = lead.last_call_date || lead.next_action_date || admission?.created_at || lead.created_at;
        const waitingHours = Math.max(0, Math.floor((Date.now() - new Date(meaningfulLastContact).getTime()) / (1000 * 3600)));

        const conversionProb = Number(lead.conversion_probability || 10);
        const leadTasks = tasksMap.get(lead.id) || [];
        const nextTask = leadTasks.length > 0 ? leadTasks[0] : null;

        let nextAction = this.suggestNextAction(pipelineStage, waitingHours);
        let riskLevel = this.computeRiskLevel(waitingHours, pipelineStage, conversionProb);
        let followupUrgency: 'Low' | 'Normal' | 'High' | 'Critical' = 'Normal';

        const now = new Date();
        if (nextTask) {
          const dueTimestamp = new Date(`${nextTask.due_date}T${nextTask.due_time || '00:00'}`).getTime();
          nextAction = `${nextTask.task_type || 'Task'}: ${nextTask.title}`;
          if (dueTimestamp < now.getTime()) {
            riskLevel = 'High';
            followupUrgency = 'Critical';
            nextAction = `OVERDUE: ${nextAction}`;
          } else if (new Date(dueTimestamp).toDateString() === now.toDateString()) {
            followupUrgency = 'High';
          }
        } else if (waitingHours > 48) {
          riskLevel = 'Critical';
          followupUrgency = 'Critical';
          nextAction = 'STALLED: No Recent Contact';
        }

        return {
          id: lead.id,
          leadId: lead.id,
          admissionId: admission?.id,
          studentName: `${lead.first_name} ${lead.last_name || ''}`.trim(),
          email: lead.email || 'No email',
          phone: lead.phone || 'No phone',
          pipelineStage,
          ownerId,
          ownerName,
          waitingHours,
          riskLevel,
          nextAction,
          admissionProbability: conversionProb,
          dropoutProbability: lead.drop_off_risk === 'High' ? 75 : lead.drop_off_risk === 'Medium' ? 40 : 10,
          paymentProbability: Number(lead.payment_probability || conversionProb * 0.8),
          followupUrgency,
          bestUniversity: undefined,
          expectedRevenue: Number(admission?.fee_structure || parseFloat(lead.budget) || 0),
          lastActivityAt: meaningfulLastContact,
        } as PipelineCard;
      });
    } catch (e) {
      console.error('Error in getLivePipeline:', e);
      return [];
    }
  }

  /**
   * Deterministic Multi-Category Risk Scanner.
   */
  static async runRiskScan(): Promise<RiskAlertItem[]> {
    const pipeline = await this.getLivePipeline();
    const alerts: RiskAlertItem[] = [];

    for (const card of pipeline) {
      // 1. Inactive Lead Risk
      if (card.waitingHours > 48 && card.riskLevel !== 'Low') {
        const days = Math.floor(card.waitingHours / 24);
        alerts.push({
          id: `risk-lead-${card.leadId}`,
          category: 'Lead',
          severity: card.waitingHours > 168 ? 'Critical' : 'High',
          title: `${card.studentName} inactive for ${days} days`,
          description: `Lead stalled in "${card.pipelineStage}" stage without meaningful contact for ${card.waitingHours} hours.`,
          evidence: `Waiting ${card.waitingHours}h > SLA limit (${STAGE_SLA_HOURS[card.pipelineStage] || 48}h)`,
          entityType: 'Lead',
          entityId: card.leadId,
          entityName: card.studentName,
          suggestedAction: card.nextAction,
          actionRoute: `/all-leads/${card.leadId}`,
          createdAt: new Date().toISOString(),
        });
      }

      // 2. Dropout Risk
      if (card.dropoutProbability > 60) {
        alerts.push({
          id: `risk-dropout-${card.leadId}`,
          category: 'Admission',
          severity: card.dropoutProbability > 80 ? 'Critical' : 'High',
          title: `${card.studentName} high dropout risk (${card.dropoutProbability}%)`,
          description: `Calculated churn probability exceeds retention threshold in "${card.pipelineStage}".`,
          evidence: `Drop-off score: ${card.dropoutProbability}% | Stage: ${card.pipelineStage}`,
          entityType: 'Lead',
          entityId: card.leadId,
          entityName: card.studentName,
          suggestedAction: 'Schedule senior counselor intervention',
          actionRoute: `/all-leads/${card.leadId}`,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Operational Risk: Overdue tasks across the team
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('id, title, lead_id, due_date, assigned_user')
        .eq('status', 'Pending')
        .lt('due_date', today)
        .limit(5);

      (overdueTasks || []).forEach(t => {
        alerts.push({
          id: `risk-task-${t.id}`,
          category: 'Operational',
          severity: 'High',
          title: `Overdue Task: ${t.title}`,
          description: `Task missed due date (${t.due_date}) and requires immediate reallocation.`,
          evidence: `Due: ${t.due_date}`,
          entityType: 'Task',
          entityId: t.id,
          entityName: t.title,
          suggestedAction: 'Review and complete task',
          actionRoute: '/tasks',
          createdAt: new Date().toISOString(),
        });
      });
    } catch (e) {
      console.error('Error scanning task risks:', e);
    }

    return alerts;
  }

  /**
   * Compatibility wrapper for existing RiskAlert type.
   */
  static async getRiskAlerts(): Promise<RiskAlert[]> {
    const items = await this.runRiskScan();
    return items.map(d => ({
      id: d.id,
      alertType: d.category.toLowerCase(),
      severity: d.severity,
      title: d.title,
      description: d.description,
      entityType: d.entityType,
      entityId: d.entityId,
      entityName: d.entityName,
      suggestedAction: d.suggestedAction,
      status: 'Active',
      createdAt: d.createdAt,
    }));
  }

  /**
   * Executive Pipeline & Stage Velocity Summary
   */
  static async getExecutiveSummary(): Promise<ExecutiveSummaryReport & { stageDistribution: Record<string, number>; expectedRevenue: number }> {
    const pipeline = await this.getLivePipeline();

    const stageMap: Record<string, { count: number; totalHours: number; overdueCount: number }> = {};
    let totalRevenue = 0;
    let criticalAlerts = 0;
    let highRiskCount = 0;

    for (const card of pipeline) {
      const stage = card.pipelineStage;
      const sla = STAGE_SLA_HOURS[stage] || 48;

      if (!stageMap[stage]) {
        stageMap[stage] = { count: 0, totalHours: 0, overdueCount: 0 };
      }
      stageMap[stage].count++;
      stageMap[stage].totalHours += card.waitingHours;
      if (card.waitingHours > sla) stageMap[stage].overdueCount++;

      totalRevenue += card.expectedRevenue;
      if (card.riskLevel === 'Critical') criticalAlerts++;
      if (card.riskLevel === 'High' || card.riskLevel === 'Critical') highRiskCount++;
    }

    const stageDistribution: Record<string, number> = {};
    const stages: StageVelocity[] = Object.entries(stageMap).map(([stage, stats]) => {
      stageDistribution[stage] = stats.count;
      const slaHours = STAGE_SLA_HOURS[stage] || 48;
      const avgWaitingHours = stats.count > 0 ? Math.round(stats.totalHours / stats.count) : 0;
      return {
        stage,
        count: stats.count,
        percentage: pipeline.length > 0 ? Math.round((stats.count / pipeline.length) * 100) : 0,
        avgWaitingHours,
        slaHours,
        isBottleneck: avgWaitingHours > slaHours && stats.count > 0,
        overdueCount: stats.overdueCount,
      };
    });

    return {
      totalStudents: pipeline.length,
      activeLeads: pipeline.length,
      criticalAlerts,
      highRiskCount,
      avgAdmissionProbability: pipeline.length > 0
        ? Math.round(pipeline.reduce((sum, c) => sum + c.admissionProbability, 0) / pipeline.length)
        : 0,
      stages,
      stageDistribution,
      expectedRevenue: totalRevenue,
    };
  }

  /**
   * Realtime Productivity metrics
   */
  static async getProductivityMetrics(userId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString();

    try {
      let activitiesQuery = supabase
        .from('lead_activities')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfDay)
        .eq('type', 'call');

      if (userId) activitiesQuery = activitiesQuery.eq('author', userId);
      const { count: callsToday } = await activitiesQuery;

      let tasksQuery = supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Completed')
        .gte('updated_at', startOfDay);

      if (userId) tasksQuery = tasksQuery.eq('assigned_user', userId);
      const { count: completedTasks } = await tasksQuery;

      return {
        callsToday: callsToday || 0,
        completedFollowups: completedTasks || 0,
      };
    } catch (e) {
      console.error('Error fetching productivity metrics:', e);
      return { callsToday: 0, completedFollowups: 0 };
    }
  }
}
