export type AIRecommendationType =
  | 'lead_follow_up'
  | 'lead_score_change'
  | 'next_best_action'
  | 'student_at_risk'
  | 'partner_opportunity'
  | 'university_alert'
  | 'revenue_opportunity'
  | 'anomaly_detected'
  | 'data_quality'
  | 'conversion_opportunity';

export type AIRecommendationPriority = 'critical' | 'high' | 'medium' | 'low';

export type AIRecommendationStatus =
  | 'new'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'snoozed'
  | 'completed'
  | 'expired';

export type AIConfidenceLevel = 'high' | 'medium' | 'low';

export interface AIRecommendation {
  id: string;
  type: AIRecommendationType;
  priority: AIRecommendationPriority;
  title: string;
  message: string;
  entityType?: 'lead' | 'student' | 'partner' | 'university' | 'payment' | 'admission';
  entityId?: string;
  entityName?: string;
  reason?: string;
  evidence?: string;
  suggestedAction?: string;
  confidence?: AIConfidenceLevel;
  status: AIRecommendationStatus;
  ownerId?: string;
  ownerName?: string;
  createdAt: string;
  updatedAt?: string;
  viewedAt?: string;
  completedAt?: string;
  dismissedAt?: string;
}

export interface AILeadScore {
  leadId: string;
  leadName: string;
  score: number;
  previousScore?: number;
  scoreChange?: number;
  topFactors: string[];
  confidence: AIConfidenceLevel;
  temperature?: 'Hot' | 'Warm' | 'Cold';
  conversionProbability?: number;
  dropOffRisk?: 'Low' | 'Medium' | 'High';
  lastUpdated: string;
}

export interface AINextBestAction {
  leadId: string;
  leadName: string;
  action: 'call' | 'whatsapp' | 'email' | 'follow_up' | 'schedule_meeting' | 'send_comparison' | 'send_info' | 'request_documents' | 'create_application' | 'escalate';
  actionLabel: string;
  reason: string;
  priority: AIRecommendationPriority;
  dueDate?: string;
  confidence: AIConfidenceLevel;
}

export interface AIFollowUpIntelligence {
  leadId: string;
  leadName: string;
  lastContactDate?: string;
  daysSinceContact: number;
  isOverdue: boolean;
  riskLevel: 'Low' | 'Medium' | 'High';
  suggestedAction: string;
  reason: string;
}

export interface AIConversionInsight {
  metric: string;
  value: number;
  previousValue?: number;
  changePercent?: number;
  insight: string;
  category: 'source' | 'program' | 'university' | 'partner' | 'counseler' | 'bottleneck';
}

export interface AICallPreparation {
  leadId: string;
  leadName: string;
  summary: string;
  intent?: string;
  previousCommunication?: string[];
  interestedPrograms?: string[];
  interestedUniversities?: string[];
  objections?: string[];
  pendingActions?: string[];
  suggestedTalkingPoints?: string[];
  missingInfo?: string[];
}

export interface AIConversationSummary {
  leadId: string;
  whatLeadWants: string;
  whatDiscussed: string;
  whatOffered: string;
  currentStage: string;
  objections: string[];
  nextAction: string;
}

export interface AIStudentSuccessSignal {
  studentId: string;
  studentName: string;
  signalType: 'inactivity' | 'onboarding_pending' | 'lms_delay' | 'support_escalation' | 'milestone_delay' | 'communication_gap' | 'payment_issue' | 'university_issue';
  signalLabel: string;
  severity: 'Low' | 'Medium' | 'High';
  suggestedAction: string;
  reason: string;
}

export interface AIPartnerIntelligence {
  partnerId: string;
  partnerName: string;
  leadVolume: number;
  leadQuality: number;
  applicationRate: number;
  admissionRate: number;
  conversionRate: number;
  revenue: number;
  trend: 'growing' | 'stable' | 'declining';
  insight: string;
}

export interface AIUniversityIntelligence {
  universityId: string;
  universityName: string;
  applicationVolume: number;
  processingTimeDays: number;
  responseTimeDays: number;
  approvalRate: number;
  rejectionRate: number;
  bottlenecks: string[];
  insight: string;
}

export interface AIRevenueIntelligence {
  metric: string;
  current: number;
  previous?: number;
  forecast?: number;
  opportunities: string[];
  risks: string[];
}

export interface AIForecast {
  metric: string;
  actual: number;
  projected: number;
  confidenceLow?: number;
  confidenceHigh?: number;
  period: string;
  dataPeriod: string;
}

export interface AIAnomaly {
  id: string;
  type: 'lead_spike' | 'lead_drop' | 'conversion_drop' | 'payment_anomaly' | 'refund_spike' | 'commission_anomaly' | 'rejection_spike' | 'response_delay' | 'partner_drop';
  typeLabel: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  detectedAt: string;
  expectedRange?: string;
  actualValue?: string;
  resolved: boolean;
}

export interface AIDataQualityIssue {
  id: string;
  issueType: 'duplicate' | 'missing_field' | 'invalid_phone' | 'invalid_email' | 'incomplete_application' | 'conflicting_info' | 'duplicate_application' | 'missing_relationship';
  entityType: 'lead' | 'student' | 'application' | 'payment';
  entityId: string;
  entityName?: string;
  issue: string;
  evidence: string;
  suggestedResolution: string;
  severity: 'Low' | 'Medium' | 'High';
  createdAt: string;
}

export interface AISearchResult {
  query: string;
  results: AISearchResultItem[];
  totalCount: number;
  executedAt: string;
}

export interface AISearchResultItem {
  entityType: 'lead' | 'student' | 'application' | 'payment' | 'partner' | 'university';
  entityId: string;
  title: string;
  subtitle?: string;
  matchReason: string;
}

export interface AIPromptTemplate {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  category: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  version: number;
  status: 'active' | 'draft' | 'archived';
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIModelConfig {
  id: string;
  provider: string;
  model: string;
  isPrimary: boolean;
  fallbackId?: string;
  temperature: number;
  maxTokens: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface AICostTracking {
  id: string;
  feature: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  userId?: string;
  organizationId?: string;
  createdAt: string;
}

export interface AIRateLimit {
  id: string;
  scope: 'user' | 'role' | 'organization' | 'feature' | 'api_key';
  scopeId: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerDay: number;
  status: 'active' | 'inactive';
}

export interface AIPerformanceMetrics {
  recommendationAcceptanceRate: number;
  recommendationCompletionRate: number;
  draftApprovalRate: number;
  errorRate: number;
  avgResponseLatencyMs: number;
  forecastAccuracy?: number;
  periodStart: string;
  periodEnd: string;
}

export interface AIFeedback {
  id: string;
  recommendationId?: string;
  userId: string;
  rating: 'helpful' | 'not_helpful' | 'incorrect' | 'irrelevant';
  comment?: string;
  createdAt: string;
}

export interface AIKnowledgeSource {
  id: string;
  name: string;
  category: 'university_info' | 'program_info' | 'admission_requirements' | 'internal_sop' | 'crm_documentation' | 'partner_policies' | 'counselor_sop' | 'finance_policies';
  sourceUrl?: string;
  content?: string;
  version: number;
  effectiveDate: string;
  ownerId?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}
