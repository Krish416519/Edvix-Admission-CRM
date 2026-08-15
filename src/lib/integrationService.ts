import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { ApiKey, WebhookConfig, ApiLog, ImportJob, LeadSourceConfig } from '../types/integration';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export const useIntegration = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSourceConfig[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchApiKeys = useCallback(async () => {
    const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setApiKeys(data.map((d: any) => ({
        id: d.id,
        name: d.name,
        keyPrefix: d.key_prefix,
        token: d.token,
        permissions: d.permissions,
        status: d.status,
        createdAt: d.created_at
      })));
    }
  }, []);

  const fetchWebhooks = useCallback(async () => {
    const { data, error } = await supabase.from('webhooks').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setWebhooks(data.map((d: any) => ({
        id: d.id,
        name: d.name,
        url: d.url,
        events: d.events,
        status: d.status,
        secret: d.secret,
        createdAt: d.created_at
      })));
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase.from('api_logs').select('*').order('timestamp', { ascending: false }).limit(100);
    if (!error && data) {
      setLogs(data.map((d: any) => ({
        id: d.id,
        endpoint: d.endpoint,
        method: d.method,
        status: d.status,
        ipAddress: d.ip_address,
        source: d.source,
        responseTimeMs: d.response_time_ms,
        timestamp: d.timestamp
      })));
    }
  }, []);

  const fetchImportJobs = useCallback(async () => {
    const { data, error } = await supabase.from('import_jobs').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setImportJobs(data.map((d: any) => ({
        id: d.id,
        filename: d.filename,
        source: d.source,
        status: d.status,
        totalRows: d.total_rows,
        successCount: d.success_count,
        errorCount: d.error_count,
        duplicateCount: d.duplicate_count,
        startedAt: d.started_at,
        completedAt: d.completed_at
      })));
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
    fetchLogs();
    fetchImportJobs();
  }, [fetchApiKeys, fetchWebhooks, fetchLogs, fetchImportJobs]);

  const generateApiKey = async (name: string, permissions: ('read' | 'write' | 'admin')[]) => {
    if (!user?.activeOrganizationId) {
      toast.error('No active organization');
      return;
    }

    const randomString = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
      
    const rawKey = `edvix_live_${randomString}`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(rawKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: insertedData, error } = await supabase.from('api_keys').insert([{
      organization_id: user.activeOrganizationId,
      name,
      key_prefix: 'edvix_live',
      key_hash: hashHex,
      permissions,
      environment: 'Production',
      rate_limit: 100,
      created_by: user.id,
      status: 'Active'
    }]).select().single();

    if (error) {
      toast.error('Failed to generate API Key');
      throw error;
    }
    toast.success('API Key generated');
    await fetchApiKeys();
    return { ...insertedData, rawKey };
  };

  const revokeApiKey = async (id: string) => {
    const { error } = await supabase.from('api_keys').update({ status: 'Revoked' }).eq('id', id);
    if (error) {
      toast.error('Failed to revoke API Key');
      throw error;
    }
    toast.success('API Key revoked');
    await fetchApiKeys();
  };

  const simulateCsvImport = async (filename: string, totalRows: number) => {
    const { data: job, error } = await supabase.from('import_jobs').insert([{
      filename,
      source: 'CSV Upload',
      status: 'Processing',
      total_rows: totalRows,
      success_count: 0,
      error_count: 0,
      duplicate_count: 0
    }]).select().single();

    if (error) throw error;
    await fetchImportJobs();

    // Simulate background processing
    let current = 0;
    const interval = setInterval(async () => {
      current += Math.ceil(totalRows / 10);
      if (current >= totalRows) {
        clearInterval(interval);
        await supabase.from('import_jobs').update({
          status: 'Completed',
          success_count: totalRows - 2,
          error_count: 1,
          duplicate_count: 1,
          completed_at: new Date().toISOString()
        }).eq('id', job.id);
        await fetchImportJobs();
      } else {
        await supabase.from('import_jobs').update({
          success_count: current
        }).eq('id', job.id);
        await fetchImportJobs();
      }
    }, 500);
  };

  const logApiCall = async (source: string, status: number, _message: string) => {
    const { error } = await supabase.from('api_logs').insert([{
      endpoint: '/api/v1/leads',
      method: 'POST',
      status,
      ip_address: '127.0.0.1',
      source,
      response_time_ms: Math.floor(Math.random() * 200) + 20
    }]);
    if (!error) await fetchLogs();
  };

  const simulateInboundLead = async (payload: any, sourceName: string) => {
    if (!payload.name || (!payload.phone && !payload.email)) {
      await logApiCall(sourceName, 400, 'Missing required fields (name, phone/email)');
      throw new Error('Validation failed');
    }

    let query = supabase.from('leads').select('id, phone, email');
    if (payload.phone && payload.email) {
       query = query.or("phone.eq." + payload.phone + ",email.eq." + payload.email);
    } else if (payload.phone) {
       query = query.eq('phone', payload.phone);
    } else if (payload.email) {
       query = query.eq('email', payload.email);
    }

    const { data: duplicates } = await query.limit(1);

    if (duplicates && duplicates.length > 0) {
      await logApiCall(sourceName, 200, 'Duplicate detected, lead updated');
      return { status: 'merged', leadId: duplicates[0].id };
    }

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

    const { data: createdLead, error } = await supabase.from('leads').insert([newLead]).select().single();

    if (error) {
       await logApiCall(sourceName, 500, 'Database error');
       throw error;
    }

    await logApiCall(sourceName, 201, 'Lead created successfully');
    return { status: 'created', leadId: createdLead.id };
  };

  return {
    apiKeys, webhooks, logs, importJobs, leadSources,
    generateApiKey, revokeApiKey, simulateCsvImport, simulateInboundLead
  };
};
