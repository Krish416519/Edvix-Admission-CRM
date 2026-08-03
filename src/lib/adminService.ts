import { supabase } from './supabase';
import { SystemMetrics, SecurityEvent, SystemLog, BackupRecord, AiConfig } from '../types/admin';

// ── Dashboard Metrics ────────────────────────────────────────────────────────

export async function fetchSystemMetrics(): Promise<SystemMetrics> {
  const { data, error } = await supabase.rpc('get_admin_dashboard_metrics');
  if (error) {
    console.error('Error fetching dashboard metrics:', error);
    throw error;
  }
  
  // Provide defaults for hardware stats since they are "for-show"
  return {
    ...data,
    serverStatus: 'Operational',
    databaseStatus: 'Operational',
    apiHealth: 99.9,
    storageUsedGB: 12.4,
    storageTotalGB: 100,
  } as SystemMetrics;
}

// ── AI Configuration ─────────────────────────────────────────────────────────

export async function fetchAiConfig(): Promise<AiConfig> {
  const { data, error } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error fetching AI config:', error);
    // Return sensible defaults if empty
    return {
      provider: 'OpenAI',
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7,
      usageLimitMonthly: 50000,
      currentUsage: 12450
    };
  }

  return {
    provider: data.provider as any,
    model: data.model,
    maxTokens: data.max_tokens,
    temperature: data.temperature,
    usageLimitMonthly: 50000, // Hardcoded for demo
    currentUsage: 12450, // Hardcoded for demo
  };
}

export async function updateAiConfig(config: Partial<AiConfig>) {
  const updates = {
    provider: config.provider,
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('ai_settings')
    .update(updates)
    .eq('is_active', true);
    
  if (error) throw error;
}

// ── System Logs ──────────────────────────────────────────────────────────────

export async function fetchSystemLogs(): Promise<SystemLog[]> {
  const { data, error } = await supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data.map((log: any) => ({
    id: log.id,
    level: log.level as any,
    source: log.service as any,
    message: log.message,
    timestamp: log.created_at,
    details: log.details ? JSON.stringify(log.details) : undefined
  }));
}

export async function clearSystemLogs() {
  const { error } = await supabase.from('system_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  if (error) throw error;
}

// ── Security Events ──────────────────────────────────────────────────────────

export async function fetchSecurityEvents(): Promise<SecurityEvent[]> {
  const { data, error } = await supabase
    .from('security_events')
    .select('*, users(email)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map((ev: any) => ({
    id: ev.id,
    type: ev.type as any,
    user: ev.users?.email || ev.user_email || 'Unknown',
    ipAddress: ev.ip_address,
    location: ev.location || 'Unknown',
    timestamp: ev.created_at,
    status: ev.status as any
  }));
}

export async function resolveSecurityEvent(id: string) {
  const { error } = await supabase
    .from('security_events')
    .update({ status: 'Resolved', resolved_at: new Date().toISOString() })
    .eq('id', id);
    
  if (error) throw error;
}

// ── Backups ──────────────────────────────────────────────────────────────────

export async function fetchBackups(): Promise<BackupRecord[]> {
  const { data, error } = await supabase
    .from('system_backups')
    .select('*, users(name, email)')
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data.map((b: any) => ({
    id: b.id,
    type: b.type as any,
    sizeMB: b.size_mb || 0,
    status: b.status as any,
    startedAt: b.started_at,
    completedAt: b.completed_at,
    triggeredBy: b.users?.name || b.users?.email || 'System'
  }));
}

export async function triggerManualBackup() {
  // In a real app, this would trigger an edge function to do the backup.
  // Here we just insert a record for demo purposes.
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase.from('system_backups').insert({
    type: 'Manual',
    status: 'In Progress',
    triggered_by: user?.id,
    size_mb: 0
  });
  
  if (error) throw error;
}
