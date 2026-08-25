import { BaseEntity } from './schema';

export type TriggerType = 
  | 'Lead Created' | 'Lead Updated' | 'Lead Assigned' | 'Lead Status Changed' | 'Lead Score Changed'
  | 'Task Created' | 'Task Overdue' | 'Task Completed'
  | 'Admission Started' | 'Admission Stage Changed'
  | 'Document Uploaded' | 'Document Approved'
  | 'Payment Received' | 'Invoice Generated'
  | 'User Created' | 'User Login'
  | 'Manual Trigger' | 'Scheduled Trigger';

export type ConditionField = 'Lead Status' | 'University' | 'Course' | 'State' | 'Lead Source' | 'Lead Score' | 'Counselor' | 'Admission Stage' | 'Payment Status' | 'Document Status' | 'Date' | 'Time';
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists' | 'changed';
export type LogicType = 'AND' | 'OR';

export interface ConditionNode {
  id: string;
  type: 'condition' | 'group';
  logic?: LogicType;
  conditions?: ConditionNode[];
  field?: string;
  operator?: ConditionOperator;
  value?: string;
}

export type ActionType = 
  | 'Assign Counselor' | 'Create Task' | 'Update Lead Status' | 'Update Admission Stage'
  | 'Send Notification' | 'Generate AI Follow-up' | 'Send WhatsApp' | 'Send Email'
  | 'Create Timeline Activity' | 'Update Lead Score' | 'Generate Reminder'
  | 'Create Note' | 'Delay Action' | 'Webhook';

export interface WorkflowAction {
  id: string;
  type: ActionType;
  metadata: Record<string, any>;
}

export interface Workflow extends BaseEntity {
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft' | 'paused';
  trigger: TriggerType;
  triggerMetadata?: Record<string, any>;
  conditions_tree: ConditionNode;
  actions: WorkflowAction[];
  isPrebuilt?: boolean;
  version?: number;
  is_test_mode?: boolean;
  max_execution_depth?: number;
}

export interface WorkflowRun extends BaseEntity {
  workflow_id: string;
  trigger_event: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Failed' | 'Delayed';
  resume_at?: string;
  current_step?: number;
  execution_depth?: number;
  error_message?: string;
}

export interface WorkflowExecutionLog extends BaseEntity {
  workflow_id: string;
  run_id?: string;
  workflowName?: string;
  triggerEvent?: string;
  status: 'Success' | 'Failed' | 'In Progress';
  errorMessage?: string;
  affectedLeadId?: string;
  executionTimeMs?: number;
  step_details?: any[];
}
