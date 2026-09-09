/**
 * Command Center Data Contracts
 * Single source of truth for the Executive Command Center domain models.
 */

export type DateRangeKey = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'all';

export interface DateRange {
  key: DateRangeKey;
  label: string;
  startDate?: string;
  endDate?: string;
}

export interface FinancialMetrics {
  revenueToday: number;
  revenuePeriod: number;
  expectedAdmissionRevenue: number;
  pipelineOpportunity: number;
  expectedRevenue: number;
  pendingCollections: number;
  collectionRate: number;
  revenueAtRisk: number;
  currency: string;
  periodLabel: string;
}

export interface FinancialDrillDownRecord {
  id: string;
  recordNumber?: string;
  studentName: string;
  counselorName: string;
  universityName?: string;
  amount: number;
  status: string;
  date: string;
  type: 'payment' | 'admission' | 'pending';
  linkRoute: string;
}

export interface StageVelocity {
  stage: string;
  count: number;
  percentage: number;
  avgWaitingHours: number;
  slaHours: number;
  isBottleneck: boolean;
  overdueCount: number;
}

export type RiskSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type RiskCategory = 'Lead' | 'Admission' | 'Financial' | 'Operational';

export interface RiskAlertItem {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  title: string;
  description: string;
  evidence: string;
  entityType: 'Lead' | 'Admission' | 'Payment' | 'Task';
  entityId: string;
  entityName: string;
  suggestedAction: string;
  actionRoute: string;
  createdAt: string;
}

export type MissionType = 'call' | 'followup' | 'document' | 'payment' | 'review' | 'alert';

export interface CommandMission {
  id: string;
  title: string;
  description: string;
  type: MissionType;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  count?: number;
  actionLabel: string;
  actionRoute: string;
  completed: boolean;
  generatedAt: string;
}

export interface LeaderboardItem {
  id: string;
  name: string;
  count: number;
  subText?: string;
  badge?: string;
  avatarText?: string;
}

export interface ExecutiveSummaryReport {
  totalStudents: number;
  activeLeads: number;
  criticalAlerts: number;
  highRiskCount: number;
  avgAdmissionProbability: number;
  stages: StageVelocity[];
}
