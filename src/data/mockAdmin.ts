import { SystemMetrics, SecurityEvent, SystemLog, BackupRecord, AiConfig } from '../types/admin';

export const mockMetrics: SystemMetrics = {
  totalLeads: 12458,
  activeUsers: 84,
  onlineUsers: 32,
  admissionsToday: 14,
  revenueToday: 1250000,
  pendingTasks: 156,
  pendingPayments: 24,
  pendingDocuments: 48,
  aiRequestsToday: 1450,
  whatsappMessagesToday: 890,
  emailsToday: 420,
  automationRunsToday: 325,
  serverStatus: 'Operational',
  databaseStatus: 'Operational',
  apiHealth: 99.9,
  storageUsedGB: 450,
  storageTotalGB: 1000,
};

export const mockSecurityEvents: SecurityEvent[] = [
  {
    id: 'sec_1',
    type: 'Failed Login',
    user: 'unknown@example.com',
    ipAddress: '192.168.1.104',
    location: 'Mumbai, India',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'Blocked',
  },
  {
    id: 'sec_2',
    type: 'Suspicious IP',
    user: 'admin@edvix.in',
    ipAddress: '10.0.0.55',
    location: 'London, UK',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: 'Resolved',
  },
  {
    id: 'sec_3',
    type: 'Role Changed',
    user: 'Priya Singh',
    ipAddress: '127.0.0.1',
    location: 'New Delhi, India',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: 'Resolved',
  }
];

export const mockSystemLogs: SystemLog[] = [
  {
    id: 'log_1',
    level: 'Error',
    source: 'API',
    message: 'Payment Gateway Timeout',
    details: 'Failed to reach Razorpay endpoint after 3 retries.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'log_2',
    level: 'Warning',
    source: 'AI Model',
    message: 'Rate limit approaching',
    details: 'Used 95% of OpenAI TPM limit.',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'log_3',
    level: 'Info',
    source: 'Database',
    message: 'Automated backup completed successfully',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  }
];

export const mockBackups: BackupRecord[] = [
  {
    id: 'bkp_1',
    type: 'Scheduled',
    sizeMB: 450.5,
    status: 'Success',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(),
    triggeredBy: 'System',
  },
  {
    id: 'bkp_2',
    type: 'Manual',
    sizeMB: 448.2,
    status: 'Success',
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 45).toISOString(),
    triggeredBy: 'Super Admin',
  }
];

export const mockAiConfig: AiConfig = {
  provider: 'OpenAI',
  model: 'gpt-4-turbo',
  maxTokens: 4096,
  temperature: 0.7,
  usageLimitMonthly: 10000000,
  currentUsage: 8450000,
};
