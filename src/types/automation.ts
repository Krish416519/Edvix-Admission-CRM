import { BaseEntity } from './schema';

// ---------------------------------------------------------
// 1. TRIGGERS
// ---------------------------------------------------------
export type TriggerType = 
  // Lead Triggers
  | 'Lead Created' | 'Lead Updated' | 'Lead Qualified' | 'Lead Assigned' | 'Lead Stage Changed' | 'Lead Score Changed'
  // Application Triggers
  | 'Application Created' | 'Application Status Changed'
  // Document Triggers
  | 'Document Uploaded' | 'Document Approved' | 'Document Rejected'
  // Admission Triggers
  | 'Admission Started' | 'Admission Stage Changed' | 'Admission Confirmed'
  | 'Enrollment Confirmed'
  // Student Triggers
  | 'Student Milestone Completed' | 'Student Inactive'
  // Payment Triggers
  | 'Payment Successful' | 'Payment Failed' | 'Invoice Generated'
  // Partner Triggers
  | 'Partner Created' | 'Partner Suspended'
  | 'Payout Approved' | 'Payout Paid'
  // Task & Support Triggers
  | 'Task Created' | 'Task Overdue' | 'Task Completed'
  | 'Support Ticket Created' | 'Support Ticket Escalated'
  // System Triggers
  | 'University SLA Breached'
  | 'User Created' | 'User Login'
  | 'Manual Trigger' | 'Scheduled Trigger'
  | 'Custom Event';

// ---------------------------------------------------------
// 2. CONDITIONS
// ---------------------------------------------------------
export type ConditionField = string; // e.g., "lead.status", "application.university_id"

export type ConditionOperator = 
  | 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal'
  | 'is_empty' | 'is_not_empty' | 'exists' | 'not_exists'
  | 'date_before' | 'date_after' | 'date_between' | 'changed';

export type LogicType = 'AND' | 'OR' | 'NOT';

export interface ConditionNode {
  id: string;
  type: 'condition' | 'group';
  logic?: LogicType;
  conditions?: ConditionNode[];
  field?: string;
  operator?: ConditionOperator;
  value?: any;
}

// ---------------------------------------------------------
// 3. ACTIONS
// ---------------------------------------------------------
export type ActionType = 
  // Assignment & Creation
  | 'Assign Counselor' | 'Assign Lead' | 'Assign Application' | 'Create Task' 
  // Status Updates (Strictly validated)
  | 'Update Lead Status' | 'Update Admission Stage' | 'Change Status'
  | 'Add Tag' | 'Remove Tag' | 'Update Approved Field'
  // Communication
  | 'Send Notification' | 'Send WhatsApp' | 'Send Email'
  // Tickets & Follow-ups
  | 'Create Support Ticket' | 'Create Follow-up'
  // Engine Control
  | 'Start Workflow' | 'Stop Workflow' | 'Wait'
  // Approvals
  | 'Request Approval'
  // AI & Analytics
  | 'Create AI Recommendation' | 'Create Timeline Activity' | 'Update Lead Score' | 'Generate Reminder' | 'Create Note'
  // Cross Module
  | 'Create University Task' | 'Create Finance Review' | 'Create Partner Notification'
  | 'Webhook';

export interface WorkflowAction {
  id: string;
  type: ActionType;
  metadata: Record<string, any>;
  next_node_id?: string; // Support for complex graphs rather than just linear
}

// ---------------------------------------------------------
// 4. WORKFLOW ENTITY
// ---------------------------------------------------------
export type WorkflowStatus = 'Draft' | 'Testing' | 'Active' | 'Paused' | 'Disabled' | 'Archived';

export interface Workflow extends BaseEntity {
  name: string;
  description: string;
  module?: string;
  status: WorkflowStatus;
  
  trigger: TriggerType;
  triggerMetadata?: Record<string, any>; // e.g. schedule details
  
  conditions_tree: ConditionNode;
  actions: WorkflowAction[]; // The action nodes
  
  // Versioning
  version: number;
  parent_workflow_id?: string; // If this is a new version of an existing workflow
  
  // Ownership & Security
  owner_id?: string;
  required_approval_role?: string; // If activation requires Super Admin approval
  
  // Settings
  isPrebuilt?: boolean;
  is_test_mode?: boolean;
  max_execution_depth: number;
  allow_concurrent_execution: boolean;
}

// ---------------------------------------------------------
// 5. WORKFLOW RUNS & IDEMPOTENCY
// ---------------------------------------------------------
export type WorkflowRunStatus = 'Pending' | 'In Progress' | 'Completed' | 'Failed' | 'Delayed' | 'Pending Approval';

export interface WorkflowRun extends BaseEntity {
  workflow_id: string;
  workflow_version: number;
  
  trigger_event_id?: string; // Links to system_events table
  trigger_event_type: string;
  
  entity_type: string;
  entity_id: string;
  
  status: WorkflowRunStatus;
  
  // Idempotency
  idempotency_key: string; // Hash of event_id + workflow_id
  
  current_step_id?: string; // Links to WorkflowAction id
  resume_at?: string;       // For Delay nodes
  
  execution_depth: number;
  error_message?: string;
}

// ---------------------------------------------------------
// 6. EVENT BUS
// ---------------------------------------------------------
export interface SystemEvent extends BaseEntity {
  event_type: TriggerType;
  entity_type: string;
  entity_id: string;
  organization_id: string;
  actor_id?: string; // Who triggered the event
  payload: Record<string, any>;
  processed: boolean;
}

// ---------------------------------------------------------
// 7. FAILURE & DEAD LETTER QUEUE
// ---------------------------------------------------------
export interface WorkflowFailureQueue extends BaseEntity {
  run_id: string;
  workflow_id: string;
  node_id: string;
  
  error_details: string;
  attempt_count: number;
  next_retry_at?: string;
  
  status: 'Pending Retry' | 'Manual Intervention' | 'Ignored' | 'Resolved';
}

// ---------------------------------------------------------
// 8. EXECUTION LOGGING
// ---------------------------------------------------------
export interface NodeExecutionLog extends BaseEntity {
  run_id: string;
  workflow_id: string;
  node_id: string;
  node_type: ActionType | 'Condition' | 'Trigger';
  
  status: 'Success' | 'Failed' | 'Skipped';
  input_summary?: Record<string, any>;
  output_summary?: Record<string, any>;
  error_message?: string;
  execution_time_ms: number;
}
