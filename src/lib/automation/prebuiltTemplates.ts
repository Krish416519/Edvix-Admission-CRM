export interface PrebuiltTemplate {
  id: string;
  name: string;
  category: 'Speed-to-Lead' | 'Admissions' | 'Finance & Fees' | 'Re-engagement' | 'Escalation';
  description: string;
  trigger: string;
  triggerDescription: string;
  icon: string;
  badge: string;
  conditions: Array<{
    field: string;
    operator: string;
    value: string;
    logic: 'AND' | 'OR';
  }>;
  actions: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    metadata: Record<string, any>;
  }>;
}

export const PREBUILT_TEMPLATES: PrebuiltTemplate[] = [
  {
    id: 'tpl_speed_to_lead',
    name: 'Instant Speed-to-Lead Auto-Engagement',
    category: 'Speed-to-Lead',
    description: 'Instantly welcomes new prospective students within 30 seconds of lead capture via WhatsApp, calculates AI intent score, and creates an urgent 15-minute counselor call task.',
    trigger: 'Lead Created',
    triggerDescription: 'Triggers when a new lead enters Edvix CRM via Portal, Ads, or Website',
    icon: 'Zap',
    badge: 'Most Popular',
    conditions: [
      { field: 'lead.status', operator: 'equals', value: 'new', logic: 'AND' }
    ],
    actions: [
      {
        id: 'act_1',
        type: 'Generate AI Summary',
        title: 'Compute AI Lead Profile & Score',
        description: 'Analyzes student course preferences, budget, and location to generate initial recommendation dossier.',
        metadata: { model: 'gemini-1.5-flash', include_counselor_pitch: true }
      },
      {
        id: 'act_2',
        type: 'Send WhatsApp',
        title: 'Dispatch Instant WhatsApp Welcome',
        description: 'Sends personalized admission prospectus and greeting with university brochure link.',
        metadata: {
          template_name: 'admission_welcome_pack',
          message_body: 'Hello {{name}}! Welcome to Edvix University Admissions. We received your inquiry for {{course}}. One of our senior academic counselors will connect with you shortly.'
        }
      },
      {
        id: 'act_3',
        type: 'Assign Counselor',
        title: 'Assign Counselor via Round-Robin',
        description: 'Auto-assigns to next available counselor based on course specialization.',
        metadata: { method: 'round_robin', role: 'Academic Counselor' }
      },
      {
        id: 'act_4',
        type: 'Create Task',
        title: 'Schedule Immediate 15-Min Outreach Call',
        description: 'Adds high-priority initial contact call to the counselor task queue.',
        metadata: {
          title: 'Speed-to-Lead Initial Outreach Call',
          task_type: 'Call',
          due_minutes: 15,
          priority: 'High'
        }
      }
    ]
  },
  {
    id: 'tpl_app_incomplete_nudge',
    name: '24-Hour Application Document Nudge',
    category: 'Admissions',
    description: 'Tracks students who started an application but stalled before uploading mandatory eligibility documents (10th/12th marksheet, ID proof), sending automated WhatsApp and Email nudges.',
    trigger: 'Admission Created',
    triggerDescription: 'Triggers when a student application is drafted in the admissions pipeline',
    icon: 'FileText',
    badge: 'High Conversion',
    conditions: [
      { field: 'admission.stage', operator: 'equals', value: 'documents_pending', logic: 'AND' }
    ],
    actions: [
      {
        id: 'act_1',
        type: 'Delay Action',
        title: 'Wait 24 Hours Grace Period',
        description: 'Allows student sufficient time to upload certificates independently.',
        metadata: { hours: 24 }
      },
      {
        id: 'act_2',
        type: 'Send WhatsApp',
        title: 'Send WhatsApp Document Upload Checklist',
        description: 'Sends 1-click student portal upload link and verification instructions.',
        metadata: {
          template_name: 'docs_upload_checklist',
          message_body: 'Hi {{name}}, your application for {{course}} is 80% complete! Please upload your pending marksheets to secure your admission seat.'
        }
      },
      {
        id: 'act_3',
        type: 'Send Email',
        title: 'Send Official Document Submission Guide',
        description: 'Sends formal university email with guidelines on acceptable document formats.',
        metadata: {
          subject: 'Action Required: Complete your {{course}} Document Verification',
          template_name: 'document_verification_email'
        }
      },
      {
        id: 'act_4',
        type: 'Create Task',
        title: 'Alert Counselor to Assist with Documents',
        description: 'Reminds counselor to call student and assist with document uploading issues.',
        metadata: {
          title: 'Document Assistance Follow-up',
          task_type: 'Follow-up',
          due_minutes: 1440,
          priority: 'Medium'
        }
      }
    ]
  },
  {
    id: 'tpl_fee_payment_success',
    name: 'Seat Confirmation & Enrolment Welcome Kit',
    category: 'Finance & Fees',
    description: 'Automates fee acknowledgment when an admission deposit is received. Transitions lead to Enrolled, sends digital fee receipt, and notifies the Academic Dean.',
    trigger: 'Payment Received',
    triggerDescription: 'Fires immediately when an admission fee transaction is marked Paid',
    icon: 'CheckCircle2',
    badge: 'Essential',
    conditions: [
      { field: 'payment.status', operator: 'equals', value: 'Paid', logic: 'AND' }
    ],
    actions: [
      {
        id: 'act_1',
        type: 'Update Lead Status',
        title: 'Promote Student to Enrolled Stage',
        description: 'Updates CRM stage and closes admission opportunity as Won.',
        metadata: { status: 'enrolled' }
      },
      {
        id: 'act_2',
        type: 'Send Email',
        title: 'Dispatch Official Admission Letter & Fee Receipt',
        description: 'Attaches student enrolment ID, fee breakdown, and orientation date.',
        metadata: {
          subject: 'Congratulations! Official Admission Confirmation for {{course}}',
          include_invoice_pdf: true
        }
      },
      {
        id: 'act_3',
        type: 'Send WhatsApp',
        title: 'Send WhatsApp Seat Confirmation Badge',
        description: 'Congratulates student with orientation link and counselor WhatsApp contact.',
        metadata: {
          message_body: 'Congratulations {{name}}! Your admission for {{course}} has been officially confirmed. Welcome to the campus family!'
        }
      },
      {
        id: 'act_4',
        type: 'Send Notification',
        title: 'Notify Academic Dean & Department',
        description: 'Internal push notification alerting academic department of newly enrolled cohort member.',
        metadata: {
          title: 'New Student Enrollment Confirmed',
          is_escalation: false,
          role_target: 'Admissions Admin'
        }
      }
    ]
  },
  {
    id: 'tpl_stale_lead_reactivation',
    name: '14-Day Stale Lead AI Re-engagement',
    category: 'Re-engagement',
    description: 'Monitors leads that have gone unresponsive for 14+ days. Sends an AI-tailored scholarship and campus placement spotlight to reignite student interest.',
    trigger: 'Lead Updated',
    triggerDescription: 'Fires when lead inactivity reaches the 14-day threshold',
    icon: 'RefreshCw',
    badge: 'ROI Booster',
    conditions: [
      { field: 'lead.status', operator: 'equals', value: 'unresponsive', logic: 'AND' },
      { field: 'lead.score', operator: 'greater_than', value: '40', logic: 'AND' }
    ],
    actions: [
      {
        id: 'act_1',
        type: 'Send WhatsApp',
        title: 'Send Scholarship & Merit Seat Alert',
        description: 'Notifies student about limited-time merit scholarship grants for their course.',
        metadata: {
          message_body: 'Hi {{name}}, merit scholarship applications for {{course}} close this Friday. Would you like to check your eligibility?'
        }
      },
      {
        id: 'act_2',
        type: 'Send Email',
        title: 'Send Career & Placement Spotlight Report',
        description: 'Highlights average packages, recruitment partners, and alumni reviews.',
        metadata: {
          subject: 'Exclusive: {{course}} Career & Placement Report 2026',
          template_name: 'placement_report_nudge'
        }
      },
      {
        id: 'act_3',
        type: 'Update Lead Status',
        title: 'Mark Lead as Re-engagement In-Progress',
        description: 'Updates CRM pipeline for accurate reactivation telemetry.',
        metadata: { status: 're_engagement' }
      }
    ]
  },
  {
    id: 'tpl_vip_lead_escalation',
    name: 'High-Intent / High-Budget Applicant VIP Escalation',
    category: 'Escalation',
    description: 'Detects top-tier leads (AI Score > 80 or High Budget) and routes them directly to Admissions Directors with instant priority notifications.',
    trigger: 'Lead Qualified',
    triggerDescription: 'Fires when a student profile is scored as High-Intent',
    icon: 'ShieldAlert',
    badge: 'VIP Priority',
    conditions: [
      { field: 'lead.score', operator: 'greater_than', value: '80', logic: 'AND' }
    ],
    actions: [
      {
        id: 'act_1',
        type: 'Assign Counselor',
        title: 'Assign Senior Admissions Director',
        description: 'Overrides standard queue and routes to senior leadership team.',
        metadata: { role: 'Admissions Manager', priority_override: true }
      },
      {
        id: 'act_2',
        type: 'Send Notification',
        title: 'Dispatch High-Priority Escalation Alert',
        description: 'Sends instant alert to team leads and managers.',
        metadata: {
          title: '🚨 VIP High-Intent Lead Detected',
          message: 'High-scoring applicant {{name}} has qualified for {{course}}. Immediate personal outreach recommended.',
          is_escalation: true
        }
      },
      {
        id: 'act_3',
        type: 'Create Task',
        title: 'Schedule Same-Day Executive Consultation Call',
        description: 'Creates priority calendar invitation for campus visit or 1-on-1 counselor meet.',
        metadata: {
          title: 'VIP Consultation Call',
          task_type: 'Call',
          due_minutes: 60,
          priority: 'High'
        }
      }
    ]
  }
];
