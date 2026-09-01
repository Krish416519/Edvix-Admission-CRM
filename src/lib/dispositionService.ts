import { supabase } from './supabase';
import { 
  DispositionCategory, 
  Disposition, 
  SubDisposition, 
  NextAction, 
  LeadDispositionHistory 
} from '../types/disposition';

const B2B_CATEGORIES = ['QUALIFICATION', 'PARTNER ONBOARDING', 'CONVERTED'];
const B2B_DISPOSITIONS = [
  'Qualified Partner', 
  'Potential Partner', 
  'Payout Concern', 
  'Trust Concern',
  'Partner Activated'
];

export interface CrmContextOption {
  id: string;
  label: string;
}

export const dispositionService = {
  async getAvailableContexts(): Promise<CrmContextOption[]> {
    const { data, error } = await supabase
      .from('disposition_categories')
      .select('crm_context');
      
    // Always include the defaults
    const contexts = new Map<string, string>([
      ['academic', 'Academic CRM'],
      ['b2b', 'B2B / Degree Partner']
    ]);
      
    if (error) {
      if (error.message.includes('crm_context')) {
        // Schema cache is stale, just return the defaults for now
        return Array.from(contexts.entries()).map(([id, label]) => ({ id, label }));
      }
      throw error;
    }
    
    
    // Add any dynamically created ones
    if (data) {
      data.forEach(item => {
        if (item.crm_context && !contexts.has(item.crm_context)) {
          // Capitalize first letter for the label
          const label = item.crm_context.charAt(0).toUpperCase() + item.crm_context.slice(1);
          contexts.set(item.crm_context, label);
        }
      });
    }
    
    return Array.from(contexts.entries()).map(([id, label]) => ({ id, label }));
  },

  async getCategories(crmContext?: string, includeInactive: boolean = false): Promise<DispositionCategory[]> {
    let query = supabase
      .from('disposition_categories')
      .select('*')
      .order('order_index', { ascending: true });
      
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    // Client-side filtering to avoid PostgREST schema cache issues if column doesn't exist yet
    let results = data || [];
    if (crmContext) {
      results = results.filter(item => {
        // Shared categories that should be visible everywhere
        if (['CONTACTED', 'NOT CONNECTED'].includes(item.name?.toUpperCase())) {
          return true;
        }
        
        // If the database properly returns crm_context, respect it!
        if (item.crm_context) {
          return item.crm_context === crmContext;
        }
        
        // Fallback for stale schema cache
        const isB2B = B2B_CATEGORIES.includes(item.name?.toUpperCase());
        if (crmContext === 'b2b') {
          return isB2B;
        } else if (crmContext === 'academic') {
          return !isB2B; // Academic gets everything else
        } else {
          return false; // Custom contexts hide stale fallback data
        }
      });
    }
    
    return results;
  },

  async createCategory(name: string, orderIndex: number = 0, crmContext: string = 'academic'): Promise<DispositionCategory> {
    let { data, error } = await supabase
      .from('disposition_categories')
      .insert({ name, order_index: orderIndex, is_active: true, crm_context: crmContext })
      .select()
      .single();
    
    // Fallback if schema cache is stale
    if (error && error.message.includes('crm_context')) {
      const retry = await supabase
        .from('disposition_categories')
        .insert({ name, order_index: orderIndex, is_active: true })
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }
    
    if (error) throw error;
    return data;
  },

  async updateCategory(id: string, updates: Partial<DispositionCategory>): Promise<DispositionCategory> {
    let { data, error } = await supabase
      .from('disposition_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    // Fallback if schema cache is stale
    if (error && error.message.includes('crm_context')) {
      const safeUpdates = { ...updates };
      delete safeUpdates.crm_context;
      
      const retry = await supabase
        .from('disposition_categories')
        .update(safeUpdates)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }
      
    if (error) throw error;
    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('disposition_categories')
      .update({ is_active: false })
      .eq('id', id);
      
    if (error) throw error;
  },

  async deletePipeline(crmContext: string): Promise<void> {
    if (['academic', 'b2b'].includes(crmContext)) {
      throw new Error("Cannot delete default pipelines.");
    }
    
    // Deleting categories will cascade to delete their dispositions.
    // If any disposition is still in use by a lead, this will safely throw a foreign key constraint error.
    const { error } = await supabase
      .from('disposition_categories')
      .delete()
      .eq('crm_context', crmContext);
      
    if (error) throw error;
  },

  async hardDeleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('disposition_categories')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },

  async activateCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('disposition_categories')
      .update({ is_active: true })
      .eq('id', id);
      
    if (error) throw error;
  },

  async getDispositions(categoryId?: string, crmContext?: string, includeInactive: boolean = false): Promise<Disposition[]> {
    let query = supabase
      .from('dispositions')
      .select('*')
      .order('order_index', { ascending: true });
      
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
      
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Client-side filtering to avoid PostgREST schema cache issues if column doesn't exist yet
    let results = data || [];
    
    if (crmContext) {
      // Fetch categories to know which ones are B2B or Shared
      const { data: catData } = await supabase.from('disposition_categories').select('id, name');
      const b2bCategoryIds = new Set<string>();
      const notConnectedCategoryIds = new Set<string>();
      
      (catData || []).forEach(c => {
        const name = c.name?.toUpperCase() || '';
        if (B2B_CATEGORIES.includes(name)) {
          b2bCategoryIds.add(c.id);
        } else if (name === 'NOT CONNECTED') {
          notConnectedCategoryIds.add(c.id);
        }
      });
      
      results = results.filter(item => {
        // If the database properly returns crm_context, respect it
        if (item.crm_context) {
          // If it's explicitly assigned to a context, it belongs there.
          // However, we still want NOT CONNECTED to be universally shared just in case
          if (notConnectedCategoryIds.has(item.category_id)) return true;
          return item.crm_context === crmContext;
        }
        
        // Fallback for stale schema cache where crm_context is missing
        const isExplicitB2B = B2B_DISPOSITIONS.includes(item.name);
        const isInB2BCategory = b2bCategoryIds.has(item.category_id);
        const isNotConnected = notConnectedCategoryIds.has(item.category_id);
        
        // NOT CONNECTED is shared across all contexts
        if (isNotConnected) return true;
        
        const isB2B = isExplicitB2B || isInB2BCategory;
        
        if (crmContext === 'b2b') {
          return isB2B; 
        } else {
          return !isB2B;
        }
      });
    }
    
    return results;
  },

  async createDisposition(categoryId: string, name: string, payload: Partial<Disposition> = {}): Promise<Disposition> {
    const insertPayload: any = { 
        category_id: categoryId, 
        name, 
        is_active: true, 
        requires_follow_up: payload.requires_follow_up || false, 
        requires_note: payload.requires_note || false,
        target_status: payload.target_status || null,
        order_index: payload.order_index || 0,
        crm_context: payload.crm_context ?? null
    };

    let { data, error } = await supabase
      .from('dispositions')
      .insert(insertPayload)
      .select()
      .single();
    
    // Fallback if schema cache is stale
    if (error && error.message.includes('crm_context')) {
      delete insertPayload.crm_context;
      const retry = await supabase
        .from('dispositions')
        .insert(insertPayload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }
    
    if (error) throw error;
    return data;
  },

  async updateDisposition(id: string, updates: Partial<Disposition>): Promise<Disposition> {
    let { data, error } = await supabase
      .from('dispositions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    // Fallback if schema cache is stale
    if (error && error.message.includes('crm_context')) {
      const safeUpdates = { ...updates };
      delete safeUpdates.crm_context;
      
      const retry = await supabase
        .from('dispositions')
        .update(safeUpdates)
        .eq('id', id)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }
      
    if (error) throw error;
    return data;
  },

  async deleteDisposition(id: string): Promise<void> {
    const { error } = await supabase
      .from('dispositions')
      .update({ is_active: false })
      .eq('id', id);
      
    if (error) throw error;
  },

  async hardDeleteDisposition(id: string): Promise<void> {
    const { error } = await supabase
      .from('dispositions')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  },

  async activateDisposition(id: string): Promise<void> {
    const { error } = await supabase
      .from('dispositions')
      .update({ is_active: true })
      .eq('id', id);
      
    if (error) throw error;
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
    userName?: string;
    lostReason?: string;
    competitor?: string;
  }): Promise<void> {
    const { leadId, dispositionId, subDispositionId, nextActionId, notes, followUpAt, userId, userName, lostReason, competitor } = payload;

    // 1. Fetch current lead state and configuration
    const [leadRes, dispRes, subDispRes, nextActionRes] = await Promise.all([
      supabase.from('leads').select('lead_status, assigned_counselor, first_name, last_name, organization_id, organization:organizations(crm_context)').eq('id', leadId).single(),
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
    
    const leadContext = (lead.organization as any)?.crm_context;
    if (leadContext && disp.crm_context && leadContext !== disp.crm_context) {
      throw new Error(`Cannot assign a ${disp.crm_context} disposition to a ${leadContext} lead.`);
    }

    // Use passed name or fallback to System
    const authorName = userName || 'System';

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
      updated_at: new Date().toISOString(),
      ...(lostReason ? { lost_reason: lostReason } : {}),
      ...(competitor ? { competitor: competitor } : {})
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
        created_by: userId,
        disposition_name: disp.name,
        sub_disposition_name: subDisp?.name || null,
        next_action_name: nextAct?.name || null
      });

    if (historyError) throw historyError;

    // 5. Log Activity
    let activityContent = `Disposition: **${disp.name}**`;
    if (subDisp) activityContent += `\nSub-disposition: ${subDisp.name}`;
    if (nextAct) activityContent += `\nNext Action: ${nextAct.name}`;
    if (notes) activityContent += `\nNotes: ${notes}`;
    if (followUpAt) activityContent += `\nFollow-up Scheduled: ${new Date(followUpAt).toLocaleString()}`;
    if (previousStatus !== newStatus) activityContent += `\nStatus updated: ${previousStatus} → ${newStatus}`;

    const { error: actError } = await supabase.from('lead_activities').insert({
      lead_id: leadId,
      type: 'status_change',
      content: activityContent,
      author: authorName,          // human-readable name
      date: new Date().toISOString(),
      organization_id: lead.organization_id
    });
    
    if (actError) {
      console.error('Failed to log activity:', actError);
      // We don't throw here to avoid failing the whole disposition save, but at least we log it
    }

    // 6. Create Task if Follow-up is required
    if (followUpAt) {
      // Determine Task Type based on Next Action
      let taskType = 'Call';
      if (nextAct && nextAct.action_type) {
        taskType = nextAct.action_type;
      }

      const followUpDateObj = new Date(followUpAt);
      const localYear = followUpDateObj.getFullYear();
      const localMonth = String(followUpDateObj.getMonth() + 1).padStart(2, '0');
      const localDay = String(followUpDateObj.getDate()).padStart(2, '0');
      const localDateStr = `${localYear}-${localMonth}-${localDay}`;
      const localHour = String(followUpDateObj.getHours()).padStart(2, '0');
      const localMinute = String(followUpDateObj.getMinutes()).padStart(2, '0');
      const localTimeStr = `${localHour}:${localMinute}`;

      const { error: taskError } = await supabase.from('tasks').insert({
        title: `${nextAct ? nextAct.name : 'Follow Up'} - ${lead.first_name} ${lead.last_name || ''}`.trim(),
        description: notes || `Follow-up generated from disposition: ${disp.name}`,
        task_type: taskType,
        priority: 'Medium',
        status: 'Pending',
        due_date: localDateStr,
        due_time: localTimeStr,
        assigned_user: lead.assigned_counselor || userId,
        created_by: userId,
        lead_id: leadId
      });
      if (taskError) console.warn('Task insert failed (non-fatal):', taskError.message);
      
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
