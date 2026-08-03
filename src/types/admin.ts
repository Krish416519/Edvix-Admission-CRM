export type ServerStatus = 'Operational' | 'Degraded' | 'Outage';
export type BackupStatus = 'Success' | 'In Progress' | 'Failed';
export type LogLevel = 'Info' | 'Warning' | 'Error' | 'Critical';

export interface SystemMetrics {
  totalLeads: number;
  activeUsers: number;
  onlineUsers: number;
  admissionsToday: number;
  revenueToday: number;
  pendingTasks: number;
  pendingPayments: number;
  pendingDocuments: number;
  aiRequestsToday: number;
  whatsappMessagesToday: number;
  emailsToday: number;
  automationRunsToday: number;
  serverStatus: ServerStatus;
  databaseStatus: ServerStatus;
  apiHealth: number; // percentage 0-100
  storageUsedGB: number;
  storageTotalGB: number;
}

export interface SecurityEvent {
  id: string;
  type: 'Failed Login' | 'Suspicious IP' | 'Password Reset' | 'Role Changed';
  user: string;
  ipAddress: string;
  location: string;
  timestamp: string;
  status: 'Blocked' | 'Warning' | 'Resolved';
}

export interface SystemLog {
  id: string;
  level: LogLevel;
  source: 'API' | 'Database' | 'Authentication' | 'Workflow' | 'AI Model';
  message: string;
  timestamp: string;
  details?: string;
}

export interface BackupRecord {
  id: string;
  type: 'Manual' | 'Scheduled';
  sizeMB: number;
  status: BackupStatus;
  startedAt: string;
  completedAt?: string;
  triggeredBy: string;
}

export interface AiConfig {
  provider: 'OpenAI' | 'Anthropic' | 'Google Gemini';
  model: string;
  maxTokens: number;
  temperature: number;
  usageLimitMonthly: number;
  currentUsage: number;
}
