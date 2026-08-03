import { Workflow, WorkflowExecutionLog } from '../types/automation';

export const mockAutomations: Workflow[] = [
  {
    id: 'wf_1',
    name: 'New Website Lead',
    description: 'Automatically assign counselor and create welcome task for website leads.',
    status: 'active',
    trigger: 'Lead Created',
    isPrebuilt: true,
    conditions: [
      { id: 'c_1', field: 'Lead Source', operator: 'equals', value: 'Website', logic: 'AND' }
    ],
    actions: [
      { id: 'a_1', type: 'Assign Counselor', metadata: { counselorRole: 'Available' } },
      { id: 'a_2', type: 'Create Task', metadata: { title: 'Welcome Call', dueDate: '+0d' } }
    ]
  },
  {
    id: 'wf_2',
    name: 'Lead becomes Interested',
    description: 'Schedule a follow-up task when a lead shows interest.',
    status: 'active',
    trigger: 'Lead Status Changed',
    isPrebuilt: true,
    conditions: [
      { id: 'c_2', field: 'Lead Status', operator: 'equals', value: 'Interested', logic: 'AND' }
    ],
    actions: [
      { id: 'a_3', type: 'Create Task', metadata: { title: 'Follow up on Interest', dueDate: '+2d' } }
    ]
  },
  {
    id: 'wf_3',
    name: 'Documents Pending Reminder',
    description: 'Send automated reminders for missing documents.',
    status: 'active',
    trigger: 'Lead Status Changed',
    isPrebuilt: true,
    conditions: [
      { id: 'c_3', field: 'Lead Status', operator: 'equals', value: 'Documents Pending', logic: 'AND' }
    ],
    actions: [
      { id: 'a_4', type: 'Send Email', metadata: { template: 'Document Reminder' } },
      { id: 'a_5', type: 'Delay Action', metadata: { duration: '3 days' } },
      { id: 'a_6', type: 'Create Task', metadata: { title: 'Call for pending documents', dueDate: '+0d' } }
    ]
  },
  {
    id: 'wf_4',
    name: 'Payment Pending Escalation',
    description: 'Notify the assigned counselor daily when payment is pending.',
    status: 'active',
    trigger: 'Payment Received', // Can be used to check if NOT full
    isPrebuilt: true,
    conditions: [
      { id: 'c_4', field: 'Payment Status', operator: 'not equals', value: 'Paid', logic: 'AND' }
    ],
    actions: [
      { id: 'a_7', type: 'Send Notification', metadata: { recipient: 'Counselor', message: 'Payment still pending for lead' } }
    ]
  },
  {
    id: 'wf_5',
    name: 'Admission Completed Routine',
    description: 'Finalize admission processes when stage changes to Completed.',
    status: 'active',
    trigger: 'Admission Stage Changed',
    isPrebuilt: true,
    conditions: [
      { id: 'c_5', field: 'Admission Stage', operator: 'equals', value: 'Admission Completed', logic: 'AND' }
    ],
    actions: [
      { id: 'a_8', type: 'Send Notification', metadata: { recipient: 'Accounts', message: 'New admission completed. Please verify.' } },
      { id: 'a_9', type: 'Create Timeline Activity', metadata: { content: 'Admission successfully completed.' } }
    ]
  },
  {
    id: 'wf_6',
    name: 'High Lead Score Alert',
    description: 'Notify manager when a lead score goes above 80.',
    status: 'active',
    trigger: 'Lead Score Changed',
    isPrebuilt: true,
    conditions: [
      { id: 'c_6', field: 'Lead Score', operator: 'greater than', value: '80', logic: 'AND' }
    ],
    actions: [
      { id: 'a_10', type: 'Send Notification', metadata: { recipient: 'Manager', message: 'High intent lead detected!' } }
    ]
  },
  {
    id: 'wf_7',
    name: 'Inactive Lead Escalation',
    description: 'Escalate to admin if there is no activity for 5 days.',
    status: 'active',
    trigger: 'Scheduled Trigger',
    isPrebuilt: true,
    conditions: [
      { id: 'c_7', field: 'Lead Status', operator: 'not equals', value: 'Admission Done', logic: 'AND' }
      // Time-based condition would be evaluated here
    ],
    actions: [
      { id: 'a_11', type: 'Send Notification', metadata: { recipient: 'Admin', message: 'Lead inactive for 5 days.' } }
    ]
  }
];

export const mockExecutionLogs: WorkflowExecutionLog[] = [
  {
    id: 'log_1',
    workflowId: 'wf_1',
    workflowName: 'New Website Lead',
    triggerEvent: 'Lead Created',
    status: 'Success',
    affectedLeadId: 'lead_101',
    executionTimeMs: 124,
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString()
  },
  {
    id: 'log_2',
    workflowId: 'wf_2',
    workflowName: 'Lead becomes Interested',
    triggerEvent: 'Lead Status Changed',
    status: 'Success',
    affectedLeadId: 'lead_102',
    executionTimeMs: 45,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString()
  },
  {
    id: 'log_3',
    workflowId: 'wf_3',
    workflowName: 'Documents Pending Reminder',
    triggerEvent: 'Lead Status Changed',
    status: 'Failed',
    errorMessage: 'Email template not found',
    affectedLeadId: 'lead_103',
    executionTimeMs: 312,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  }
];
