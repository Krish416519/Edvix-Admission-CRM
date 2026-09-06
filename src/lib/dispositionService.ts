import { supabase } from './supabase';
import { 
  DispositionCategory, 
  Disposition, 
  SubDisposition, 
  NextAction, 
  LeadDispositionHistory 
} from '../types/disposition';

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
        return Array.from(contexts.entries()).map(([id, label]) => ({ id, label }));
      }
      throw error;
    }
    
    // Add any dynamically created ones
    if (data) {
      data.forEach(item => {
        if (item.crm_context && !contexts.has(item.crm_context)) {
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

    if (crmContext) {
      query = query.eq('crm_context', crmContext);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createCategory(name: string, orderIndex: number = 0, crmContext: string = 'academic'): Promise<DispositionCategory> {
    const { data, error } = await supabase
      .from('disposition_categories')
      .insert({ name, order_index: orderIndex, is_active: true, crm_context: crmContext })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateCategory(id: string, updates: Partial<DispositionCategory>): Promise<DispositionCategory> {
    const { data, error } = await supabase
      .from('disposition_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
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

    if (crmContext) {
      query = query.eq('crm_context', crmContext);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createDisposition(categoryId: string, name: string, payload: Partial<Disposition> = {}): Promise<Disposition> {
    const insertPayload: any = { 
      category_id: categoryId, 
      name, 
      is_active: true, 
      requires_follow_up: payload.requires_follow_up || false, 
      requires_note: payload.requires_note || false,
      next_action_required: payload.next_action_required || false,
      target_status: payload.target_status || null,
      order_index: payload.order_index || 0,
      crm_context: payload.crm_context ?? null,
      special_form_type: payload.special_form_type || null
    };

    const { data, error } = await supabase
      .from('dispositions')
      .insert(insertPayload)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateDisposition(id: string, updates: Partial<Disposition>): Promise<Disposition> {
    const { data, error } = await supabase
      .from('dispositions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
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

  // --- Sub-Dispositions Methods ---
  async getSubDispositions(dispositionId: string, includeInactive: boolean = false): Promise<SubDisposition[]> {
    let query = supabase
      .from('sub_dispositions')
      .select('*')
      .eq('disposition_id', dispositionId)
      .order('order_index', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
      
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createSubDisposition(dispositionId: string, name: string, orderIndex: number = 0): Promise<SubDisposition> {
    const { data, error } = await supabase
      .from('sub_dispositions')
      .insert({
        disposition_id: dispositionId,
        name: name.trim(),
        order_index: orderIndex,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateSubDisposition(id: string, updates: Partial<SubDisposition>): Promise<SubDisposition> {
    const { data, error } = await supabase
      .from('sub_dispositions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteSubDisposition(id: string): Promise<void> {
    const { error } = await supabase
      .from('sub_dispositions')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async hardDeleteSubDisposition(id: string): Promise<void> {
    const { error } = await supabase
      .from('sub_dispositions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async activateSubDisposition(id: string): Promise<void> {
    const { error } = await supabase
      .from('sub_dispositions')
      .update({ is_active: true })
      .eq('id', id);

    if (error) throw error;
  },

  // --- Next Actions Methods ---
  async getNextActions(dispositionId: string, includeInactive: boolean = false): Promise<NextAction[]> {
    let query = supabase
      .from('next_actions')
      .select('*')
      .eq('disposition_id', dispositionId)
      .order('order_index', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
      
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createNextAction(dispositionId: string, name: string, actionType: string = 'Call', orderIndex: number = 0): Promise<NextAction> {
    const { data, error } = await supabase
      .from('next_actions')
      .insert({
        disposition_id: dispositionId,
        name: name.trim(),
        action_type: actionType,
        order_index: orderIndex,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateNextAction(id: string, updates: Partial<NextAction>): Promise<NextAction> {
    const { data, error } = await supabase
      .from('next_actions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteNextAction(id: string): Promise<void> {
    const { error } = await supabase
      .from('next_actions')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  },

  async hardDeleteNextAction(id: string): Promise<void> {
    const { error } = await supabase
      .from('next_actions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async activateNextAction(id: string): Promise<void> {
    const { error } = await supabase
      .from('next_actions')
      .update({ is_active: true })
      .eq('id', id);

    if (error) throw error;
  },

  // --- Atomic Disposition Submission via PostgreSQL RPC ---
  async submitDisposition(payload: {
    leadId: string;
    dispositionId: string;
    subDispositionId?: string;
    nextActionId?: string;
    notes?: string;
    followUpAt?: string;
    userId?: string;
    userName?: string;
    lostReason?: string;
    competitor?: string;
  }): Promise<any> {
    const {
      leadId,
      dispositionId,
      subDispositionId,
      nextActionId,
      notes,
      followUpAt,
      lostReason,
      competitor
    } = payload;

    const { data, error } = await supabase.rpc('submit_lead_disposition', {
      p_lead_id: leadId,
      p_disposition_id: dispositionId,
      p_sub_disposition_id: subDispositionId || null,
      p_next_action_id: nextActionId || null,
      p_notes: notes || null,
      p_follow_up_at: followUpAt || null,
      p_lost_reason: lostReason || null,
      p_competitor: competitor || null
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
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
