import { BaseEntity } from './schema';

export type ApiKeyStatus = 'Active' | 'Revoked' | 'Expired';
export type WebhookStatus = 'Active' | 'Failing' | 'Disabled';
export type ImportStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

export interface ApiKey extends BaseEntity {
  name: string;
  keyPrefix: string;
  token: string; // Hashed/hidden in real app
  permissions: ('read' | 'write' | 'admin')[];
  status: ApiKeyStatus;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface WebhookConfig extends BaseEntity {
  name: string;
  url: string;
  secret: string;
  events: string[];
  status: WebhookStatus;
  retryCount: number;
  lastTriggeredAt?: string;
}

export interface ApiLog extends BaseEntity {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  status: number;
  ipAddress: string;
  source: string; // e.g. "Website Form", "API Key 1"
  responseTimeMs: number;
  payload?: any;
  timestamp: string;
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
  required: boolean;
  transform?: 'lowercase' | 'uppercase' | 'phone_format' | 'none';
}

export interface LeadSourceConfig extends BaseEntity {
  sourceName: string;
  active: boolean;
  autoAssignRule: string;
  defaultPriority: 'High' | 'Medium' | 'Low';
}
