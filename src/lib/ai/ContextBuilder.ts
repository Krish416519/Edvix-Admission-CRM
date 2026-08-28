import { supabase } from '../supabase';

export class AIContextBuilder {
  static async buildContext(pathname: string): Promise<any> {
    const context: any = {};

    try {
      if (pathname.startsWith('/all-leads/')) {
        const leadId = pathname.split('/')[2];
        if (leadId) {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
          if (lead) context.current_lead = lead;

          const { data: tasks } = await supabase.from('tasks').select('*').eq('lead_id', leadId);
          if (tasks) context.current_lead_tasks = tasks;
        }
      } else if (pathname.startsWith('/admissions/')) {
        const admissionId = pathname.split('/')[2];
        if (admissionId) {
          const { data: admission } = await supabase.from('admissions').select('*, leads(*)').eq('id', admissionId).single();
          if (admission) context.current_admission = admission;
        }
      }

      // Add general context
      const { data: kpis } = await supabase.rpc('get_analytics_kpis');
      if (kpis) context.business_kpis = kpis;
      
    } catch (e) {
      console.error('Failed to build AI context', e);
    }

    return context;
  }
}
