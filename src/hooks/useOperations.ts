import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SystemHealth {
  database: string;
  auth: string;
  storage: string;
  edgeFunctions: string;
  queue: string;
  api: string;
  webhooks: string;
  emailProvider: string;
  whatsappProvider: string;
  aiProvider: string;
}

export interface OperationsMetrics {
  activeUsers: number;
  onlineUsers: number;
  loginsToday: number;
  apiRequests: number;
  failedApiRequests: number;
  avgResponseTime: number;
  dbQueries: number;
  storageUsedGB: number;
  memoryUsage: number;
  cpuUsage: number;
}

export function useOperations() {
  const { user } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<OperationsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOperationsData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    
    try {
      setLoading(true);
      setError(null);

      // Fetch health and metrics in parallel
      const [healthRes, metricsRes] = await Promise.all([
        supabase.rpc('get_system_health'),
        supabase.rpc('get_operations_metrics')
      ]);

      if (healthRes.error) throw healthRes.error;
      if (metricsRes.error) throw metricsRes.error;

      setHealth(healthRes.data as SystemHealth);
      setMetrics(metricsRes.data as OperationsMetrics);
    } catch (err: any) {
      console.error('Error fetching operations data:', err);
      setError(err.message || 'Failed to fetch operations data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOperationsData();

    // Set up Realtime subscriptions for relevant tables to auto-refresh data
    const channel = supabase.channel('operations_center')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_alerts' },
        () => { fetchOperationsData(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'api_logs' },
        () => { fetchOperationsData(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_events' },
        () => { fetchOperationsData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOperationsData]);

  return {
    health,
    metrics,
    loading,
    error,
    refresh: fetchOperationsData
  };
}
