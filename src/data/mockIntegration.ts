import { ApiKey, WebhookConfig, ApiLog, ImportJob, LeadSourceConfig } from '../types/integration';

export const mockApiKeys: ApiKey[] = [
  {
    id: 'api_1',
    name: 'Website Admission Form',
    keyPrefix: 'edvx_live_x8F2',
    token: 'hidden',
    permissions: ['write'],
    status: 'Active',
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: 'api_2',
    name: 'Meta Ads Integration',
    keyPrefix: 'edvx_live_m3L9',
    token: 'hidden',
    permissions: ['write'],
    status: 'Active',
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
  }
];

export const mockWebhooks: WebhookConfig[] = [
  {
    id: 'wh_1',
    name: 'Zapier Lead Sync',
    url: 'https://hooks.zapier.com/hooks/catch/12345/',
    secret: 'secret_123',
    events: ['lead.created', 'lead.updated'],
    status: 'Active',
    retryCount: 3,
    lastTriggeredAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  }
];

export const mockApiLogs: ApiLog[] = Array.from({ length: 15 }).map((_, i) => ({
  id: `log_${i}`,
  endpoint: '/api/v1/leads',
  method: 'POST',
  status: i % 10 === 0 ? 400 : 201,
  ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
  source: i % 2 === 0 ? 'Website Form' : 'Meta Ads Integration',
  responseTimeMs: Math.floor(Math.random() * 300) + 50,
  timestamp: new Date(Date.now() - 1000 * 60 * i * 5).toISOString(),
}));

export const mockImportJobs: ImportJob[] = [
  {
    id: 'imp_1',
    filename: 'EduFair_Leads_2026.csv',
    source: 'Event Offline',
    status: 'Completed',
    totalRows: 450,
    successCount: 442,
    errorCount: 3,
    duplicateCount: 5,
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(),
  }
];

export const mockLeadSources: LeadSourceConfig[] = [
  {
    id: 'src_1',
    sourceName: 'Website Contact Form',
    active: true,
    autoAssignRule: 'Round Robin',
    defaultPriority: 'Medium',
  },
  {
    id: 'src_2',
    sourceName: 'Meta Ads',
    active: true,
    autoAssignRule: 'Counselor Workload',
    defaultPriority: 'High',
  }
];
