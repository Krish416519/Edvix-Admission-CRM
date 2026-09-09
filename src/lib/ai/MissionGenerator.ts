import { supabase } from '../supabase';
import { DailyMission } from './AdmissionOS';
import { CommandMission, MissionType } from '../../types/commandCenter';

/**
 * MissionGenerator — Actionable Operational Task Engine.
 * Transforms CRM operational debt (overdue tasks, pending verifications, collections)
 * into concrete, prioritized daily missions with direct navigation routes.
 */
export class MissionGenerator {

  /**
   * Generates prioritized missions for the Command Center.
   */
  static async generateCommandMissions(userId: string, role: string): Promise<CommandMission[]> {
    const missions: CommandMission[] = [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    try {
      // 1. Pending collections mission (Admin/Super Admin)
      if (role === 'Super Admin' || role === 'Admin') {
        const { data: pendingPayments } = await supabase
          .from('payments')
          .select('id, amount, net_amount')
          .eq('status', 'Pending');

        if (pendingPayments && pendingPayments.length > 0) {
          const totalPending = pendingPayments.reduce((s, p) => s + Number(p.net_amount || p.amount || 0), 0);
          const formatted = totalPending >= 100000 
            ? `₹${(totalPending / 100000).toFixed(1)}L` 
            : `₹${(totalPending / 1000).toFixed(0)}K`;

          missions.push({
            id: 'mission-pending-payments',
            title: `Collect ${formatted} in pending receivables`,
            description: `${pendingPayments.length} student payments pending verification or collection.`,
            type: 'payment',
            category: 'Financial',
            priority: totalPending > 100000 ? 'Critical' : 'High',
            count: pendingPayments.length,
            actionLabel: 'Review Receivables',
            actionRoute: '/smart-view',
            completed: false,
            generatedAt: now.toISOString(),
          });
        }

        // 2. Overdue tasks across team
        const { data: overdueTasks } = await supabase
          .from('tasks')
          .select('id, title')
          .eq('status', 'Pending')
          .lt('due_date', today);

        if (overdueTasks && overdueTasks.length > 0) {
          missions.push({
            id: 'mission-overdue-tasks',
            title: `${overdueTasks.length} overdue tasks require attention`,
            description: 'Counselor follow-up commitments missed their SLA deadlines.',
            type: 'review',
            category: 'Operational',
            priority: overdueTasks.length > 10 ? 'Critical' : 'High',
            count: overdueTasks.length,
            actionLabel: 'Open Task Queue',
            actionRoute: '/tasks',
            completed: false,
            generatedAt: now.toISOString(),
          });
        }
      }

      // 3. Document Verification Queue
      const { data: pendingDocs } = await supabase
        .from('documents')
        .select('id, student_name, document_type')
        .eq('verification_status', 'Pending')
        .limit(10);

      if (pendingDocs && pendingDocs.length > 0) {
        missions.push({
          id: 'mission-pending-docs',
          title: `Verify ${pendingDocs.length} pending student documents`,
          description: 'Applicant marksheets and ID proofs submitted awaiting registrar review.',
          type: 'document',
          category: 'Admission',
          priority: 'High',
          count: pendingDocs.length,
          actionLabel: 'Verify Documents',
          actionRoute: '/all-leads',
          completed: false,
          generatedAt: now.toISOString(),
        });
      }

      // 4. Stale high-priority leads (no contact for >24h)
      const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      let staleLeadsQuery = supabase
        .from('leads')
        .select('id, first_name, last_name, priority, lead_score')
        .in('priority', ['High', 'Medium'])
        .lt('created_at', cutoff)
        .is('last_call_date', null)
        .not('lead_status', 'in', '("Rejected","Admitted","Lost")')
        .is('deleted_at', null)
        .limit(3);

      if (role === 'Counselor') {
        staleLeadsQuery = staleLeadsQuery.eq('assigned_counselor', userId);
      }

      const { data: staleLeads } = await staleLeadsQuery;
      if (staleLeads) {
        for (const lead of staleLeads) {
          const studentName = `${lead.first_name} ${lead.last_name || ''}`.trim();
          missions.push({
            id: `mission-stale-${lead.id}`,
            title: `Immediate outreach: ${studentName}`,
            description: `High-priority inquiry waiting without counselor contact.`,
            type: 'call',
            category: 'Lead',
            priority: 'High',
            actionLabel: 'Call Student',
            actionRoute: `/all-leads/${lead.id}`,
            completed: false,
            generatedAt: now.toISOString(),
          });
        }
      }
    } catch (e) {
      console.error('Error generating command missions:', e);
    }

    return missions;
  }

  /**
   * Backward-compatible generator for existing DailyMissions component.
   */
  static async generate(userId: string, role: string): Promise<DailyMission[]> {
    const commandMissions = await this.generateCommandMissions(userId, role);
    return commandMissions.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type,
      priority: m.priority,
      completed: m.completed,
      entityId: m.actionRoute.startsWith('/all-leads/') ? m.actionRoute.replace('/all-leads/', '') : undefined,
      entityType: m.actionRoute.startsWith('/all-leads/') ? 'Lead' : 'Task',
    }));
  }
}
