import { BaseEntity } from './schema';

export type ApiKeyStatus = 'Active' | 'Revoked' | 'Expired';
export type WebhookStatus = 'Active' | 'Failing' | 'Disabled';
export type ImportStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

export interface ApiKey extends BaseEntity {
  name: string;
  keyPrefix: string;
  token?: string;
  permissions: ('read' | 'write' | 'admin')[];
  scopes?: string[];
  environment?: 'Production' | 'Test';
  rateLimit?: number;
  status: ApiKeyStatus;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
  createdBy?: string;
}

export interface WebhookConfig extends BaseEntity {
  name: string;
  url: string;
  secret: string;
  events: string[];
  status: WebhookStatus;
  retryCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ApiLog extends BaseEntity {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  status: number;
  ipAddress: string;
  source: string; // e.g. "Website Form", "API Key 1", "Shiksha"
  responseTimeMs: number;
  payload?: any;
  timestamp: string;
  headers?: Record<string, string>;
  errorMessage?: string;
}

export interface ImportJob extends BaseEntity {
  filename: string;
  source: string;
  status: ImportStatus;
  totalRows: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  startedAt: string;
  completedAt?: string;
  errors?: { row: number; error: string }[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  required?: boolean;
  transform?: 'lowercase' | 'uppercase' | 'phone_format' | 'none';
}

export type DeduplicationStrategy = 'skip' | 'merge' | 'create_always';

export interface LeadSourceConfig extends BaseEntity {
  sourceName: string;
  active: boolean;
  autoAssignRule: string;
  defaultPriority: 'High' | 'Medium' | 'Low';
}

export interface PortalIntegration {
  id: string;
  name: string;
  category: 'Lead Portals' | 'Advertising' | 'Automation' | 'Communication';
  description: string;
  logo: string;
  accentColor: string;
  status: 'Connected' | 'Not Configured' | 'Syncing';
  inboundWebhookUrl?: string;
  apiKey?: string;
  partnerId?: string;
  campaignId?: string;
  autoAssignCounselor?: string;
  lastSyncAt?: string;
  totalLeadsSynced: number;
}
