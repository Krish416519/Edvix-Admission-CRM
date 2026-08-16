import { supabase } from './supabase';
import { 
  DispositionCategory, 
  Disposition, 
  SubDisposition, 
  NextAction, 
  LeadDispositionHistory 
} from '../types/disposition';
import { Task, LeadActivity } from '../types/schema';

export const dispositionService = {
  async getCategories(): Promise<DispositionCategory[]> {
    const { data, error } = await supabase
      .from('disposition_categories')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getDispositions(categoryId?: string): Promise<Disposition[]> {
    let query = supabase
      .from('dispositions')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });
      
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getSubDispositions(dispositionId: string): Promise<SubDisposition[]> {
    const { data, error } = await supabase
      .from('sub_dispositions')
      .select('*')
      .eq('disposition_id', dispositionId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });
      
    if (error) throw error;
    return data || [];
  },

  async getNextActions(dispositionId: string): Promise<NextAction[]> {
    const { data, error } = await supabase
      .from('next_actions')
      .select('*')
      .eq('disposition_id', dispositionId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });
      
    if (error) throw error;
    return data || [];
  },

  async submitDisposition(payload: {
    leadId: string;
    dispositionId: string;
    subDispositionId?: string;
    nextActionId?: string;
    notes?: string;
    followUpAt?: string;
    userId: string;
  }): Promise<void> {
    const { leadId, dispositionId, subDispositionId, nextActionId, notes, followUpAt, userId } = payload;

    // 1. Fetch current lead state and configuration
    const [leadRes, dispRes, subDispRes, nextActionRes] = await Promise.all([
      supabase.from('leads').select('lead_status, assigned_counselor, first_name, last_name').eq('id', leadId).single(),
      supabase.from('dispositions').select('*').eq('id', dispositionId).single(),
      subDispositionId ? supabase.from('sub_dispositions').select('*').eq('id', subDispositionId).single() : Promise.resolve({ data: null }),
      nextActionId ? supabase.from('next_actions').select('*').eq('id', nextActionId).single() : Promise.resolve({ data: null })
    ]);

    if (leadRes.error) throw new Error(`Lead not found: ${leadRes.error.message}`);
    if (dispRes.error) throw new Error(`Disposition not found: ${dispRes.error.message}`);

    const lead = leadRes.data;
    const disp = dispRes.data as Disposition;
    const subDisp = subDispRes.data as SubDisposition | null;
    const nextAct = nextActionRes.data as NextAction | null;

    // 2. Validate
    if (disp.requires_follow_up && !followUpAt) throw new Error('Follow-up date/time is required for this disposition.');
    if (disp.requires_note && (!notes || notes.trim() === '')) throw new Error('Notes are required for this disposition.');

    const previousStatus = lead.lead_status;
    const newStatus = disp.target_status || previousStatus;

    // 3. Begin Transaction-like operations
    // We update lead status and latest disposition fields
    const leadUpdatePayload: any = {
      latest_disposition_id: dispositionId,
      latest_sub_disposition_id: subDispositionId || null,
      next_action_date: followUpAt || null,
      updated_at: new Date().toISOString()
    };

    if (disp.target_status) {
      leadUpdatePayload.lead_status = disp.target_status;
    }

    const { error: leadUpdateError } = await supabase
      .from('leads')
      .update(leadUpdatePayload)
      .eq('id', leadId);
      
    if (leadUpdateError) throw leadUpdateError;

    // 4. Create History Record
    const { error: historyError } = await supabase
      .from('lead_disposition_history')
      .insert({
        lead_id: leadId,
        disposition_id: dispositionId,
        sub_disposition_id: subDispositionId || null,
        next_action_id: nextActionId || null,
        notes: notes || null,
        follow_up_at: followUpAt || null,
        previous_status: previousStatus,
        new_status: newStatus,
        created_by: userId
      });

    if (historyError) throw historyError;

    // 5. Log Activity
    let activityContent = `Disposition: **${disp.name}**`;
    if (subDisp) activityContent += `\nSub-disposition: ${subDisp.name}`;
    if (nextAct) activityContent += `\nNext Action: ${nextAct.name}`;
    if (notes) activityContent += `\nNotes: ${notes}`;
    if (followUpAt) activityContent += `\nFollow-up Scheduled: ${new Date(followUpAt).toLocaleString()}`;
    if (previousStatus !== newStatus) activityContent += `\nStatus updated: ${previousStatus} → ${newStatus}`;

    await supabase.from('lead_activities').insert({
      lead_id: leadId,
      type: 'status_change',
      content: activityContent,
      author: userId,
      date: new Date().toISOString()
    });

    // 6. Create Task if Follow-up is required
    if (followUpAt) {
      // Determine Task Type based on Next Action
      let taskType = 'Call';
      if (nextAct && nextAct.action_type) {
        taskType = nextAct.action_type;
      }

      await supabase.from('tasks').insert({
        title: `${nextAct ? nextAct.name : 'Follow Up'} - ${lead.first_name} ${lead.last_name || ''}`.trim(),
        description: notes || `Follow-up generated from disposition: ${disp.name}`,
        type: taskType,
        priority: 'Medium',
        status: 'Pending',
        due_date: new Date(followUpAt).toISOString().split('T')[0],
        due_time: new Date(followUpAt).toTimeString().split(' ')[0].substring(0, 5),
        assigned_user: lead.assigned_counselor || userId,
        lead_id: leadId
      });
      
      // Update leads tasks_count
      await supabase.rpc('increment_lead_tasks_count', { p_lead_id: leadId });
    }
  },

  async getLeadHistory(leadId: string): Promise<LeadDispositionHistory[]> {
    const { data, error } = await supabase
      .from('lead_disposition_history')
      .select(`
        *,
        dispositions (name),
        sub_dispositions (name),
        next_actions (name)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
};
