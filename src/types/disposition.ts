import { BaseEntity } from './schema';

export interface DispositionCategory extends BaseEntity {
  name: string;
  order_index: number;
  is_active: boolean;
  crm_context?: string;
}

export interface Disposition extends BaseEntity {
  category_id: string;
  name: string;
  requires_follow_up: boolean;
  requires_note: boolean;
  next_action_required: boolean;
  target_status?: string | null;
  is_active: boolean;
  order_index: number;
  crm_context?: string;
}

export interface SubDisposition extends BaseEntity {
  disposition_id: string;
  name: string;
  is_active: boolean;
  order_index: number;
}

export interface NextAction extends BaseEntity {
  disposition_id: string;
  name: string;
  action_type: string;
  is_active: boolean;
  order_index: number;
}

export interface LeadDispositionHistory extends BaseEntity {
  lead_id: string;
  disposition_id?: string;
  sub_disposition_id?: string;
  next_action_id?: string;
  notes?: string;
  follow_up_at?: string;
  previous_status?: string;
  new_status?: string;
  disposition_name?: string;
  sub_disposition_name?: string;
  next_action_name?: string;
  
  // Hydrated references
  dispositions?: Disposition;
  sub_dispositions?: SubDisposition;
  next_actions?: NextAction;
}
