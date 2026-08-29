import { supabase } from '../supabase';
import { DailyMission } from './AdmissionOS';

/**
 * MissionGenerator — Creates personalized daily task lists based on role.
 * Uses live Supabase data to generate actionable missions every morning.
 */
export class MissionGenerator {

  static async generate(userId: string, role: string): Promise<DailyMission[]> {
    const missions: DailyMission[] = [];

    if (role === 'Super Admin' || role === 'Admin') {
      await this.generateAdminMissions(missions);
    }

    if (role === 'Super Admin' || role === 'Admin' || role === 'Counselor') {
      await this.generateCounselorMissions(userId, missions);
    }

    return missions;
  }

  private static async generateAdminMissions(missions: DailyMission[]): Promise<void> {
    // Revenue: Check pending payments
    const { data: pendingPayments } = await supabase
      .from('payments')
      .select('id, amount, status')
      .eq('status', 'Pending');

    if (pendingPayments && pendingPayments.length > 0) {
      const totalPending = pendingPayments.reduce((s, p) => s + (p.amount || 0), 0);
      missions.push({
        id: crypto.randomUUID(),
        title: `₹${(totalPending / 1000).toFixed(0)}K in pending payments`,
        description: `${pendingPayments.length} payments awaiting collection. Follow up with counselors.`,
        type: 'payment',
        priority: totalPending > 100000 ? 'Critical' : 'High',
        completed: false,
      });
    }

    // Overdue tasks
    const { data: overdueTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('status', 'Pending')
      .lt('due_date', new Date().toISOString().split('T')[0]);

    if (overdueTasks && overdueTasks.length > 0) {
      missions.push({
        id: crypto.randomUUID(),
        title: `${overdueTasks.length} overdue tasks need attention`,
        description: 'Review and reassign overdue tasks across the team.',
        type: 'review',
        priority: 'High',
        completed: false,
      });
    }

    // At-risk admissions
    const { data: riskyAdmissions } = await supabase
      .from('admissions')
      .select('id')
      .eq('at_risk', true)
      .eq('admission_status', 'Active');

    if (riskyAdmissions && riskyAdmissions.length > 0) {
      missions.push({
        id: crypto.randomUUID(),
        title: `${riskyAdmissions.length} at-risk admissions`,
        description: 'Students at risk of dropping off. Intervene immediately.',
        type: 'alert',
        priority: 'Critical',
        completed: false,
      });
    }
  }

  private static async generateCounselorMissions(userId: string, missions: DailyMission[]): Promise<void> {
    // Leads needing follow-up (no activity in 24+ hours)
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: staleLeads } = await supabase
      .from('leads')
      .select('id, first_name, last_name')
      .eq('assigned_counselor', userId)
      .lt('updated_at', cutoff)
      .not('lead_status', 'in', '("Rejected","Admitted")')
      .is('deleted_at', null)
      .limit(5);

    if (staleLeads) {
      for (const lead of staleLeads) {
        missions.push({
          id: crypto.randomUUID(),
          title: `Follow up with ${lead.first_name} ${lead.last_name || ''}`,
          description: 'No activity in 24+ hours. Make a call or send WhatsApp.',
          type: 'followup',
          entityId: lead.id,
          entityType: 'Lead',
          priority: 'High',
          completed: false,
        });
      }
    }

    // Pending documents for my leads
    const { data: docLeads } = await supabase
      .from('documents')
      .select('id, lead_id, document_type, student_name')
      .eq('verification_status', 'Pending')
      .limit(5);

    if (docLeads && docLeads.length > 0) {
      missions.push({
        id: crypto.randomUUID(),
        title: `${docLeads.length} documents need verification`,
        description: 'Review and verify pending student documents.',
        type: 'document',
        priority: 'Medium',
        completed: false,
      });
    }

    // Today's tasks
    const today = new Date().toISOString().split('T')[0];
    const { data: todayTasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('assigned_user', userId)
      .eq('due_date', today)
      .eq('status', 'Pending')
      .limit(5);

    if (todayTasks) {
      for (const task of todayTasks) {
        missions.push({
          id: crypto.randomUUID(),
          title: task.title,
          description: 'Task due today. Complete or reschedule.',
          type: 'call',
          entityId: task.id,
          entityType: 'Task',
          priority: 'Medium',
          completed: false,
        });
      }
    }
  }
}
