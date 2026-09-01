export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// ----------------- Auth & Users ----------------- //

export type RoleType = 'Super Admin' | 'Admin' | 'Counselor' | 'Accounts' | 'Partner';

export interface Role extends BaseEntity {
  name: RoleType | string; // e.g., Super Admin, Admin, Counselor
  permissions: string[]; // List of permission keys/IDs
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  roleId: string; // FK to Role
  role?: RoleType | string; // legacy support
  avatar?: string;
  isActive: boolean;
}

// ----------------- Core Entities ----------------- //

export interface University extends BaseEntity {
  name: string;
  code: string;
  country: string;
  status: 'Active' | 'Inactive';
  
  // AI Recommendation Engine Fields
  ugcApproval?: boolean;
  debApproval?: boolean;
  naacGrade?: string;
  nirfRanking?: number;
  qsRanking?: number;
  accreditations?: string[];
  scholarships?: any[];
  emiOptions?: any[];
  admissionProcess?: string;
  eligibility?: string;
  placementSupport?: boolean;
  averageSalary?: number;
  corporateTieups?: any[];
  learningPlatform?: string;
  examPattern?: string;
  durationMonths?: number;
  studentReviews?: any[];
}

export interface Course extends BaseEntity {
  name: string;
  code: string;
  universityId: string; // FK to University
  level: string; // e.g., UG, PG, Diploma
  fee: number;
  status: 'Active' | 'Inactive';
}

// ----------------- Academic Eligibility Engine ----------------- //

export interface ProgramEligibilityRule extends BaseEntity {
  courseId: string;
  universityId: string;
  ruleGroupName: string;
  conditions: Record<string, any>; // JSONB representing the rule conditions
  version: number;
  status: 'Active' | 'Draft' | 'Archived';
  effectiveFrom: string;
  effectiveUntil?: string;
}

export interface ProgramFee extends BaseEntity {
  courseId: string;
  universityId: string;
  feeCategory: string; // Tuition, Application, Examination, Registration, etc.
  amount: number;
  currency: string;
  isMandatory: boolean;
}

export interface ProgramScholarship extends BaseEntity {
  universityId: string;
  courseId: string;
  name: string;
  description?: string;
  discountAmount?: number;
  discountPercentage?: number;
  conditions: Record<string, any>;
  status: 'Active' | 'Inactive';
}

// ----------------- CRM Operations ----------------- //

export type LeadPriority = 'High' | 'Medium' | 'Low';
export type LeadStatus = string; // Allows dynamic pipeline stages

export interface Lead extends BaseEntity {
  leadNumber: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  state: string;
  city: string;
  country?: string;
  budget: string;
  leadSource: string;
  
  leadStatus: LeadStatus;
  priority: LeadPriority;
  leadScore: number;
  
  preferredLanguage?: string;
  counselingMode?: string;
  notesCount: number;
  tasksCount: number;
  admissionStatus?: string;

  // Activity Summary Fields
  callAttempts?: number;
  interactionsCount?: number;
  lastCallDate?: string;
  finalFollowUpDate?: string;
  
  // Command Center Fields
  tags?: string[];
  latestDispositionId?: string;
  latestSubDispositionId?: string;
  latestDispositionName?: string;
  latestDispositionTargetStatus?: string;
  nextActionDate?: string;
  
  // Legacy UI Fields (mapped in useLeads)
  name?: string;
  source?: string;
  status?: string;
  score?: number;
  counselorId?: string;

  // Custom Dynamic Fields
  customFields?: Record<string, any>;
  
  // Relationships
  assignedCounselor?: string; // FK to User
  universityId?: string; // FK to University
  courseId?: string; // FK to Course
  partnerId?: string; // FK to User (Partner)
  
  // Organization Context (Resolved via organization_id)
  organizationContext?: string;

  // Hydrated Relations (For UI)
  counselor?: User | string; // allowing string for legacy mock data support
  university?: University | string;
  course?: Course | string;
  
  // Legacy fields for backward compatibility during migration
  lastFollowUp?: string;
  nextFollowUp?: string;
  notes?: string;

  // Assignment Tracking Fields (derived from lead_assignments)
  assignmentDate?: string;
  firstAssignmentDate?: string;

  // Call Tracking Fields (derived from calls table)
  firstCallDate?: string;

  // Contact & Timing Fields
  contactedTimestamp?: string;
  moreThan5MContactedTime?: boolean;
  moreThan10MContactedTime?: boolean;
  moreThan15MContactedTime?: boolean;

  // Conversion & Lifecycle
  conversionDate?: string;
  managerPrioritized?: boolean;

  // Future AI Features Preparedness
  aiScore?: number;
  aiInsights?: string;
  aiSuggestedNextAction?: string;
  aiSummary?: string;
  
  // AI Sales Coach & Intelligence Fields
  aiPriorityScore?: number;
  aiPriorityReason?: string;
  aiDropOffRisk?: string;
  aiObjectionDetected?: string;
  aiCoachNotes?: string;

  // AI Agent Fields (Phase 1)
  conversionProbability?: number;
  temperature?: 'Hot' | 'Warm' | 'Cold' | string;
  responseSpeedHours?: number;
  dropOffRisk?: 'Low' | 'Medium' | 'High';
  paymentProbability?: number;

  // AI Recommendation Profiling Fields (Phase 2)
  age?: number;
  gender?: string;
  education?: string;
  graduationPercentage?: number;
  twelfthPercentage?: number;
  tenthPercentage?: number;
  currentOccupation?: string;
  yearsOfExperience?: number;
  industry?: string;
  annualIncome?: number;
  preferredSpecialization?: string;
  preferredLearningMode?: string;
  careerGoal?: string;
  needPlacementSupport?: boolean;
  needScholarship?: boolean;
  needEmi?: boolean;
  preferredIntake?: string;

  // Academic Profile additions
  tenthBoard?: string;
  tenthPassingYear?: number;
  twelfthBoard?: string;
  twelfthStream?: string;
  twelfthPassingYear?: number;
  graduationDegree?: string;
  graduationUniversity?: string;
  graduationPassingYear?: number;
  graduationBacklogs?: number;
  graduationMode?: string;
  postGraduationDegree?: string;
  postGraduationUniversity?: string;
  postGraduationPercentage?: number;
  postGraduationPassingYear?: number;
  gapYears?: number;
  gapExplanation?: string;

  // Professional Profile additions
  company?: string;
  jobTitle?: string;
  employmentStatus?: string;

  // Admission Profile additions
  targetRole?: string;
  motivation?: string;
  urgency?: 'Low' | 'Medium' | 'High' | 'Immediate' | string;
  universityBrandPreference?: string;

  // Disposition extensions
  lostReason?: string;
  competitor?: string;

  // Transition Timestamps (when lead entered a key pipeline stage)
  transitionToFallOut?: string;
  transitionToCounselled?: string;
  transitionToOBInitiated?: string;
  transitionToAdmitted?: string;
  transitionToOffer?: string;
  transitionToVerificationPending?: string;
  transitionToConverted?: string;
  transitionToScreening?: string;

  // Transition Timestamps (snake_case from database or derived)
  transition_to_fallout_at?: string;
  transition_to_counselled_at?: string;
  transition_to_ob_initiated_at?: string;
  transition_to_admitted_at?: string;
  transition_to_offer_at?: string;
  transition_to_verification_pending_at?: string;
  transition_to_converted_at?: string;
  transition_to_screening_at?: string;

  deletedAt?: string;
}

export interface LeadObjection extends BaseEntity {
  leadId: string;
  objectionType: string;
  studentConcern?: string;
  counselorResponse?: string;
  outcome?: string;
  followUpRequired?: boolean;
  status: 'Open' | 'Partially Resolved' | 'Resolved' | string;
}

export interface AiRecommendation extends BaseEntity {
  leadId: string;
  generatedBy?: string;
  universitiesRecommended: any[];
  counselorNotes?: any;
  status: 'Pending' | 'Accepted' | 'Rejected';
  selectedUniversityCode?: string;
  
  // Phase 2 Deterministic Fields
  eligibilityStatus?: 'VERIFIED_ELIGIBLE' | 'LIKELY_ELIGIBLE' | 'CONDITIONAL' | 'MANUAL_REVIEW' | 'NOT_ELIGIBLE' | 'INSUFFICIENT_DATA' | 'PENDING';
  matchScore?: number;
  feeEstimate?: number;
  counselorDecision?: 'Approved' | 'Rejected' | 'Shortlisted' | 'Manual Add';
  overrideReason?: string;
  ruleVersion?: number;
  isManual?: boolean;

  deletedAt?: string;
}

export type ActivityType = 'note' | 'call' | 'whatsapp' | 'email' | 'task' | 'task_completed' | 'status_change' | 'document_upload' | 'payment_received' | 'admission_completed' | 'lead_created' | 'call_answered' | 'whatsapp_replied' | 'fee_asked' | 'emi_asked' | 'application_started';

export interface LeadActivity extends BaseEntity {
  leadId: string; // FK to Lead
  type: ActivityType;
  content: string;
  subject?: string;
  duration?: string;
  metadata?: Record<string, any>;
  
  // UI legacy fields
  date?: string;
  author?: string;
  status?: string;
  dueDate?: string;
}

export interface Note extends BaseEntity {
  leadId: string; // FK to Lead
  content: string;
  isPinned: boolean;
}

export type TaskType = 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Reminder' | 'Document Collection' | 'Fee Reminder' | 'Admission Follow-up' | 'Custom Task';
export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled' | 'Overdue';

export interface Task extends BaseEntity {
  taskNumber: string;
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  dueTime?: string;
  completedDate?: string;
  
  // Relationships
  assignedUser?: string; // FK to User
  leadId?: string; // FK to Lead
  admissionId?: string; // FK to Admission
  
  isRecurring?: boolean;
  recurrenceType?: 'Daily' | 'Weekly' | 'Monthly' | 'None';
  tags?: string[];
  attachmentsCount?: number;
  commentsCount?: number;
  deletedAt?: string;

  // Hydrated Relations (For UI)
  assignedTo?: User | string;
  leadName?: string;
}

export interface TaskComment extends BaseEntity {
  taskId: string;
  userId: string;
  content: string;
  deletedAt?: string;
  user?: User; // Hydrated
}

export interface TaskReminder extends BaseEntity {
  taskId: string;
  reminderTime: string;
  status: 'Pending' | 'Sent';
}

export interface TaskHistory extends BaseEntity {
  taskId: string;
  type: string;
  userId: string;
  details: Record<string, any>;
  user?: User; // Hydrated
}
// ----------------- Admissions & Finance ----------------- //

export type AdmissionStage =
  | 'Inquiry'
  | 'Interested'
  | 'Counseling'
  | 'Documents Pending'
  | 'Documents Verified'
  | 'Application Submitted'
  | 'University Verification'
  | 'Fee Pending'
  | 'Payment Received'
  | 'Admission Confirmed'
  | 'Enrollment Completed'
  | 'LMS Issued'
  | 'Completed'
  | 'Cancelled'
  // Legacy UI stages (kept for backward-compat)
  | 'Application Started'
  | 'Documents Uploaded'
  | 'ABC ID Created'
  | 'DEB ID Created'
  | 'Fee Payment Pending'
  | 'Fee Payment Completed'
  | 'Enrollment Number Received'
  | 'LMS Credentials Received'
  | 'Admission Completed';

export type AdmissionStatus = 'Active' | 'Cancelled' | 'Completed' | 'On Hold';

export interface Admission extends BaseEntity {
  // Identity
  admissionNumber?: string;  // ADM-2026-000001

  // Relationships
  leadId?: string;
  universityId?: string;
  courseId?: string;
  assignedCounselor?: string; // UUID of assigned user

  // Student Info
  studentName: string;
  email?: string;
  phone?: string;
  specialization?: string;

  // Program
  intake?: string;
  academicSession?: string;

  // Status
  admissionStatus: AdmissionStatus;
  currentStage: AdmissionStage;
  progress?: number;
  
  // AI Agent Fields
  healthScore?: number;
  atRisk?: boolean;
  riskReason?: string;
  predictedCompletionDays?: number;

  // Application
  applicationNumber?: string;
  universityEnrollmentNumber?: string;
  abcId?: string;
  debId?: string;

  // Finance
  feeStructure?: number;
  scholarshipAmount?: number;
  discount?: number;
  expectedRevenue?: number; // computed

  // Dates
  registrationDate?: string;
  admissionDate?: string;
  enrollmentDate?: string;

  // General
  remarks?: string;

  // Audit
  deletedAt?: string;

  // UI Legacy / Hydrated fields
  stage?: AdmissionStage;    // alias for currentStage (legacy)
  course?: string;
  university?: string;
  counselorName?: string;
  counselorId?: string;      // alias for assignedCounselor
  documents?: Document[];
  checklist?: any[];
  notes?: string;            // alias for remarks (legacy)
  enrollmentNumber?: string; // alias for universityEnrollmentNumber
}

export interface AdmissionStageHistory {
  id: string;
  admissionId: string;
  previousStage?: AdmissionStage;
  newStage: AdmissionStage;
  changedBy?: string;
  changedByName?: string;
  remarks?: string;
  changedAt: string;
}

export interface AdmissionNote {
  id: string;
  admissionId: string;
  content: string;
  authorId?: string;
  authorName?: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface AdmissionTag {
  id: string;
  admissionId: string;
  tag: string;
  createdBy?: string;
  createdAt: string;
}

export type DocumentStatus = 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Need Resubmission';

export interface Document extends BaseEntity {
  documentNumber?: string;
  leadId?: string; // FK to Lead
  admissionId?: string; // FK to Admission
  studentName?: string;
  
  // Storage Info
  documentType: string;
  bucketName: string;
  storagePath: string;
  
  // File Metadata
  originalFileName: string;
  storedFileName: string;
  fileSize: number;
  fileType: string;
  checksum?: string;
  
  // Status & Versioning
  version: number;
  verificationStatus: DocumentStatus;
  remarks?: string;
  
  // Audit
  uploadedBy?: string;
  verifiedBy?: string;
  verificationDate?: string;
  deletedAt?: string;

  // Legacy mappings for UI backward-compat
  name?: string; // maps to originalFileName
  type?: string; // maps to documentType
  url?: string;  // maps to storagePath
  size?: string; // stringified fileSize
  status?: string; // maps to verificationStatus
  uploadedAt?: string; // maps to createdAt
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  bucketName: string;
  storagePath: string;
  originalFileName: string;
  storedFileName: string;
  fileSize: number;
  fileType: string;
  checksum?: string;
  uploadedBy?: string;
  uploadedAt: string;
}

export interface DocumentVerification {
  id: string;
  documentId: string;
  previousStatus?: DocumentStatus;
  newStatus: DocumentStatus;
  comments?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt: string;
}

export interface DocumentComment {
  id: string;
  documentId: string;
  content: string;
  authorId?: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

// ─── Finance & Payments ───────────────────────────────────────────────────

export type PaymentStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Failed' | 'Cancelled' | 'Refunded';
export type InvoiceStatus = 'Draft' | 'Issued' | 'Partially Paid' | 'Paid' | 'Cancelled';

export interface Payment extends BaseEntity {
  paymentNumber: string;
  admissionId?: string;
  leadId?: string;
  invoiceId?: string;
  
  feeCategory: string;
  amount: number;
  discount: number;
  scholarship: number;
  gst: number;
  netAmount: number;
  
  paymentMethod: string;
  transactionId?: string;
  gatewayReference?: string;
  
  status: PaymentStatus;
  paymentDate?: string;
  dueDate?: string;
  
  collectedBy?: string;
  remarks?: string;

  // AI Agent Fields
  lateProbability?: number;
  collectionUrgency?: 'Low' | 'Medium' | 'High';
}

export interface Invoice extends BaseEntity {
  invoiceNumber: string;
  admissionId?: string;
  leadId?: string;
  
  totalAmount: number;
  totalDiscount: number;
  totalGst: number;
  netAmount: number;
  
  status: InvoiceStatus;
  issueDate?: string;
  dueDate?: string;
  createdBy?: string;
}

export interface InvoiceItem extends BaseEntity {
  invoiceId: string;
  feeCategory: string;
  description?: string;
  amount: number;
  gst: number;
  discount: number;
  netAmount: number;
}

export interface LedgerEntry extends BaseEntity {
  entryNumber: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  referenceType?: string;
  referenceId?: string;
  relatedAdmissionId?: string;
  createdBy?: string;
}

export interface Commission extends BaseEntity {
  admissionId: string;
  paymentId?: string;
  ruleId?: string;
  recipientId?: string;
  recipientType: string;
  commissionPercentage: number;
  commissionAmount: number;
  subvention: number;
  netCommission: number;
  status: string;
}

export interface UniversityPayout extends BaseEntity {
  admissionId: string;
  universityId: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  expectedAmount: number;
  invoiceAmount: number;
  receivedAmount: number;
  pendingAmount: number;
  payoutStatus: string;
  paymentDate?: string;
}

export interface Refund extends BaseEntity {
  paymentId: string;
  admissionId: string;
  amount: number;
  reason: string;
  status: string;
  requestedBy?: string;
  processedBy?: string;
  ledgerEntryId?: string;
}

// ----------------- Notifications ----------------- //

export type NotificationPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type NotificationStatus = 'Unread' | 'Read' | 'Archived' | 'Deleted';
export type DeliveryStatus = 'Pending' | 'Sent' | 'Delivered' | 'Read' | 'Failed';

export interface AppNotification extends BaseEntity {
  notificationNumber: string;
  recipientId: string;
  module: string;
  moduleRecordId?: string;
  title: string;
  message: string;
  channel: string;
  priority: NotificationPriority;
  category?: string;
  status: NotificationStatus;
  readAt?: string;
  expiresAt?: string;
  dedupeKey?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreference extends BaseEntity {
  userId: string;
  browserNotifications: boolean;
  emailNotifications: boolean;
  whatsappNotifications: boolean;
  financeAlerts: boolean;
  taskReminders: boolean;
  aiInsights: boolean;
}

export interface NotificationDeliveryLog extends BaseEntity {
  notificationId: string;
  channel: string;
  deliveryStatus: DeliveryStatus;
  sentTime?: string;
  readTime?: string;
  failureReason?: string;
  retryCount: number;
}

export * from './automation';
export * from './whatsapp';
export * from './email';
export * from './integration';
export * from './marketing';
export * from './disposition';
export * from './admin';

// ----------------- AI Sales Coach & Intelligence ----------------- //

export interface CounselorPerformance extends BaseEntity {
  counselorId: string;
  date: string;
  score: number;
  contactRatePercent: number;
  conversionRatePercent: number;
  avgResponseTimeMins: number;
  aiStrengths?: string;
  aiImprovements?: string;
  aiRecommendation?: string;
}

export interface AiObjectionLibrary extends BaseEntity {
  category: string;
  objectionText: string;
  suggestedResponse: string;
  successRatePercent: number;
}

export interface AiFeedback extends BaseEntity {
  counselorId?: string;
  leadId?: string;
  recommendationType: string;
  recommendationText: string;
  isHelpful: boolean;
  feedbackNotes?: string;
}

export interface AiManagerAlert extends BaseEntity {
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  counselorId?: string;
  leadId?: string;
  isResolved: boolean;
}

// ----------------- BI Command Center ----------------- //

export interface BiSavedReport extends BaseEntity {
  name: string;
  description?: string;
  config: any;
}

export interface BiScheduledReport extends BaseEntity {
  reportId: string;
  frequency: string;
  recipientEmails?: string[];
  recipientRoles?: string[];
  lastRunAt?: string;
  nextRunAt?: string;
  isActive: boolean;
}

export interface BiDashboardLayout extends BaseEntity {
  userId: string;
  role?: string;
  layoutConfig: any;}

// ----------------- Dynamic Form Fields ----------------- //

export interface LeadFormField extends BaseEntity {
  organizationId?: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'select' | 'date' | 'boolean';
  isRequired: boolean;
  options?: any[]; // For select dropdowns
  isActive: boolean;
  displayOrder: number;
}
