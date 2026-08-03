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
export type ConditionOperator = 'equals' | 'not equals' | 'contains' | 'greater than' | 'less than' | 'is empty' | 'is not empty';
export type LogicType = 'AND' | 'OR';

export interface WorkflowCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
  logic: LogicType; // Appended logic for the next condition
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
  status: 'active' | 'inactive';
  trigger: TriggerType;
  triggerMetadata?: Record<string, any>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  isPrebuilt?: boolean;
}

export interface WorkflowExecutionLog extends BaseEntity {
  workflowId: string;
  workflowName: string;
  triggerEvent: string;
  status: 'Success' | 'Failed' | 'In Progress';
  errorMessage?: string;
  affectedLeadId?: string;
  executionTimeMs: number;
}
