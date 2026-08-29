export type SmartViewId =
  | 'last_3_days'
  | 'fresh_lead'
  | 'connected'
  | 'not_connected'
  | 'interested'
  | 'attempted'
  | 'not_attempted'
  | 'qualified'
  | 'application_started'
  | 'documents_pending'
  | 'admission_done'
  | 'lost'
  | 'all_leads_overview';

export interface SmartViewConfig {
  id: SmartViewId;
  name: string;
  description: string;
  icon: string;
  filterType: 'date' | 'status' | 'disposition' | 'activity' | 'hybrid' | 'overview';
}

export const SMART_VIEWS: SmartViewConfig[] = [
  {
    id: 'last_3_days',
    name: 'Last 3 Days Leads',
    description: 'Leads created in the last 3 calendar days (including today)',
    icon: 'calendar',
    filterType: 'date',
  },
  {
    id: 'fresh_lead',
    name: 'Fresh Lead',
    description: 'New leads with no contact attempt made yet',
    icon: 'sparkles',
    filterType: 'hybrid',
  },
  {
    id: 'connected',
    name: 'Connected',
    description: 'Leads whose latest contact outcome is Connected',
    icon: 'phone',
    filterType: 'disposition',
  },
  {
    id: 'not_connected',
    name: 'Not Connected',
    description: 'Leads whose latest contact outcome is unsuccessful',
    icon: 'phone-missed',
    filterType: 'disposition',
  },
  {
    id: 'interested',
    name: 'Interested',
    description: 'Leads currently in the Interested pipeline state',
    icon: 'trending-up',
    filterType: 'status',
  },
  {
    id: 'attempted',
    name: 'Attempted',
    description: 'Leads where at least one contact attempt was made',
    icon: 'phone-call',
    filterType: 'activity',
  },
  {
    id: 'not_attempted',
    name: 'Not Attempted',
    description: 'Leads with no contact attempt made yet',
    icon: 'phone-off',
    filterType: 'activity',
  },
  {
    id: 'qualified',
    name: 'Qualified',
    description: 'Leads currently in the Qualified pipeline state',
    icon: 'check-circle',
    filterType: 'status',
  },
  {
    id: 'application_started',
    name: 'Application Started',
    description: 'Leads currently in the Application Started state',
    icon: 'file-text',
    filterType: 'status',
  },
  {
    id: 'documents_pending',
    name: 'Documents Pending',
    description: 'Leads currently waiting on documents',
    icon: 'file-check',
    filterType: 'status',
  },
  {
    id: 'admission_done',
    name: 'Admission Done',
    description: 'Leads whose admission is complete',
    icon: 'graduation-cap',
    filterType: 'status',
  },
  {
    id: 'lost',
    name: 'Lost',
    description: 'Leads currently in the Lost state',
    icon: 'trash-2',
    filterType: 'status',
  },
  {
    id: 'all_leads_overview',
    name: 'All Leads / Stage Overview',
    description: 'Distribution of all accessible leads across pipeline stages',
    icon: 'layout-grid',
    filterType: 'overview',
  },
];

export const getSmartView = (id: string | undefined): SmartViewConfig | undefined => {
  if (!id) return undefined;
  return SMART_VIEWS.find(v => v.id === id);
};
