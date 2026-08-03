import { ApiKey, WebhookConfig, ApiLog, ImportJob, LeadSourceConfig } from '../types/integration';
import { mockApiKeys, mockWebhooks, mockApiLogs, mockImportJobs, mockLeadSources } from '../data/mockIntegration';
import { Lead } from '../types/schema';
import { supabase } from './supabase';

class IntegrationService {
  private apiKeys: ApiKey[] = [...mockApiKeys];
  private webhooks: WebhookConfig[] = [...mockWebhooks];
  private logs: ApiLog[] = [...mockApiLogs];
  private importJobs: ImportJob[] = [...mockImportJobs];
  private leadSources: LeadSourceConfig[] = [...mockLeadSources];
  
  private listeners: ((event: string, data: any) => void)[] = [];

  subscribe(listener: (event: string, data: any) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(event: string, data?: any) {
    this.listeners.forEach(l => l(event, data));
  }

  // --- Getters ---
  getApiKeys() { return this.apiKeys; }
  getWebhooks() { return this.webhooks; }
  getLogs() { return this.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); }
  getImportJobs() { return this.importJobs; }
  getLeadSources() { return this.leadSources; }

  // --- API Key Management ---
  generateApiKey(name: string, permissions: ('read' | 'write' | 'admin')[]) {
    const newKey: ApiKey = {
      id: `api_${Date.now()}`,
      name,
      keyPrefix: `edvx_live_${Math.random().toString(36).substring(2, 6)}`,
      token: 'hidden',
      permissions,
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    this.apiKeys.push(newKey);
    this.notify('api_keys_updated');
    return newKey;
  }

  revokeApiKey(id: string) {
    const key = this.apiKeys.find(k => k.id === id);
    if (key) {
      key.status = 'Revoked';
      this.notify('api_keys_updated');
    }
  }

  // --- Webhook Simulation (Inbound API Call) ---
  async simulateInboundLead(payload: any, sourceName: string) {
    // 1. Validation
    if (!payload.name || (!payload.phone && !payload.email)) {
      this.logApiCall(sourceName, 400, 'Missing required fields (name, phone/email)');
      throw new Error('Validation failed');
    }

    // 2. Duplicate Detection via Supabase
    let query = supabase.from('leads').select('id, phone, email');
    if (payload.phone && payload.email) {
       query = query.or(`phone.eq.${payload.phone},email.eq.${payload.email}`);
    } else if (payload.phone) {
       query = query.eq('phone', payload.phone);
    } else if (payload.email) {
       query = query.eq('email', payload.email);
    }

    const { data: duplicates, error: searchError } = await query.limit(1);

    if (searchError) {
      console.error('Error searching for duplicates:', searchError);
    }

    if (duplicates && duplicates.length > 0) {
      this.logApiCall(sourceName, 200, 'Duplicate detected, lead updated');
      return { status: 'merged', leadId: duplicates[0].id };
    }

    // 4. Create Lead
    const newLead = {
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone || null,
      source: sourceName,
      status: 'New',
      course: payload.course || null,
      state: payload.state || null,
      city: payload.city || null,
      budget: payload.budget || null,
      priority: 'Medium',
      score: 50,
    };

    const { data: createdLead, error } = await supabase
      .from('leads')
      .insert([newLead])
      .select()
      .single();

    if (error) {
       this.logApiCall(sourceName, 500, 'Database error');
       throw error;
    }

    this.logApiCall(sourceName, 201, 'Lead created successfully');
    this.notify('lead_created', createdLead);

    return { status: 'created', leadId: createdLead.id };
  }

  private logApiCall(source: string, status: number, _message: string) {
    const log: ApiLog = {
      id: `log_${Date.now()}`,
      endpoint: '/api/v1/leads',
      method: 'POST',
      status,
      ipAddress: '127.0.0.1',
      source,
      responseTimeMs: Math.floor(Math.random() * 200) + 20,
      timestamp: new Date().toISOString()
    };
    this.logs.unshift(log);
    this.notify('logs_updated');
  }

  // --- Import Simulation ---
  async simulateCsvImport(filename: string, totalRows: number) {
    const job: ImportJob = {
      id: `imp_${Date.now()}`,
      filename,
      source: 'CSV Upload',
      status: 'Pending',
      totalRows,
      successCount: 0,
      errorCount: 0,
      duplicateCount: 0,
      startedAt: new Date().toISOString()
    };
    this.importJobs.unshift(job);
    this.notify('imports_updated');

    // Simulate progress
    job.status = 'Processing';
    this.notify('imports_updated');

    return new Promise<void>(resolve => {
      let current = 0;
      const interval = setInterval(() => {
        current += Math.ceil(totalRows / 10);
        if (current >= totalRows) {
          clearInterval(interval);
          job.status = 'Completed';
          job.successCount = totalRows - 2;
          job.errorCount = 1;
          job.duplicateCount = 1;
          job.completedAt = new Date().toISOString();
          this.notify('imports_updated');
          resolve();
        } else {
          job.successCount = current;
          this.notify('imports_updated');
        }
      }, 500);
    });
  }
}

export const integrationService = new IntegrationService();
