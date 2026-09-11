import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { CallCenterStats, CounselorCallStats, CallReportData, Call } from '../types/telephony';
import { CounselorUser, DesignationOption } from '../types/callFilter';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export function useCallReports(dateRange: { from: Date; to: Date }) {
  useAuth();
  const [stats, setStats] = useState<CallCenterStats | null>(null);
  const [counselorStats, setCounselorStats] = useState<CounselorCallStats[]>([]);
  const [reportData, setReportData] = useState<CallReportData | null>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [counselors, setCounselors] = useState<CounselorUser[]>([]);
  const [designations, setDesignations] = useState<DesignationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Memoized user map for fast O(1) lookup
  const userMap = useMemo(() => {
    const map = new Map<string, CounselorUser>();
    counselors.forEach(c => map.set(c.id, c));
    return map;
  }, [counselors]);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const fromStr = dateRange.from.toISOString();
      const toStr = dateRange.to.toISOString();

      // 1. Fetch Call Center Stats (Today) - Using RPC
      const { data: statsData, error: statsError } = await supabase.rpc('get_call_center_stats');
      if (statsError) throw statsError;
      
      // 2. Fetch Counselor Stats - Using RPC
      const { data: cStatsData, error: cStatsError } = await supabase.rpc('get_counselor_call_stats', {
        p_date_from: fromStr,
        p_date_to: toStr
      });
      if (cStatsError) throw cStatsError;

      // 3. Fetch Aggregate Report Data - Using RPC
      const { data: repData, error: repError } = await supabase.rpc('get_call_reports', {
        p_date_from: fromStr,
        p_date_to: toStr
      });
      if (repError) throw repError;

      // 4. Fetch Users and Designations for filtering
      const [usersRes, desigsRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, name, full_name, email, designation_id, roles(name), designations(id, name)'),
        supabase
          .from('designations')
          .select('id, name, level')
          .order('level', { ascending: false })
      ]);

      const localUserMap = new Map<string, CounselorUser>();
      if (usersRes.data) {
        const mappedUsers: CounselorUser[] = usersRes.data.map((u: any) => ({
          id: u.id,
          name: u.name || u.full_name || u.email,
          email: u.email,
          roleName: u.roles?.name,
          designationId: u.designation_id,
          designationName: u.designations?.name
        }));
        mappedUsers.forEach(u => localUserMap.set(u.id, u));
        setCounselors(mappedUsers);
      }

      if (desigsRes.data) {
        setDesignations(desigsRes.data.map((d: any) => ({
          id: d.id,
          name: d.name,
          level: d.level
        })));
      }

      // 5. Fetch Recent Calls (Expanded to 100 for comprehensive search & filtering)
      const { data: callsData, error: callsError } = await supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (callsError) throw callsError;

      setStats({
        activeCalls: statsData.active_calls || 0,
        totalToday: statsData.total_today || 0,
        totalYesterday: statsData.total_yesterday || 0,
        missedToday: statsData.missed_today || 0,
        completedToday: statsData.completed_today || 0,
        avgDurationSeconds: statsData.avg_duration_seconds || 0,
        totalDurationSeconds: statsData.total_duration_seconds || 0,
        inboundToday: statsData.inbound_today || 0,
        outboundToday: statsData.outbound_today || 0
      } as CallCenterStats);

      setCounselorStats((cStatsData as any[]).map(c => ({
        counselorId: c.counselor_id,
        counselorName: c.counselor_name,
        totalCalls: c.total_calls || 0,
        completedCalls: c.completed_calls || 0,
        missedCalls: c.missed_calls || 0,
        avgDuration: c.avg_duration || 0,
        totalDuration: c.total_duration || 0,
        connectionRate: c.connection_rate || 0
      })) as CounselorCallStats[]);
      setReportData({
        totalCalls: repData.total_calls || 0,
        completedCalls: repData.completed_calls || 0,
        missedCalls: repData.missed_calls || 0,
        failedCalls: repData.failed_calls || 0,
        avgDuration: repData.avg_duration || 0,
        connectionRate: repData.connection_rate || 0,
        sentimentDistribution: repData.sentiment_distribution || {},
        outcomeDistribution: repData.outcome_distribution || {},
        dailyCallVolume: repData.daily_call_volume || []
      } as CallReportData);
      
      // Map recent calls
      setRecentCalls(callsData.map((c: any) => {
        const counselorObj = c.counselor_id ? localUserMap.get(c.counselor_id) : null;
        return {
          id: c.id,
          leadId: c.lead_id,
          counselorId: c.counselor_id,
          providerCallId: c.provider_call_id,
          direction: c.direction,
          status: c.status,
          durationSeconds: c.duration_seconds,
          recordingUrl: c.recording_url,
          leadName: c.lead_name,
          leadPhone: c.lead_phone,
          counselorName: c.counselor_name || counselorObj?.name || 'Assigned Counselor',
          outcome: c.outcome,
          notes: c.notes,
          tags: c.tags,
          nextFollowUp: c.next_follow_up,
          transcript: c.transcript,
          aiSummary: c.ai_summary,
          aiSentiment: c.ai_sentiment,
          aiObjections: c.ai_objections,
          aiActionItems: c.ai_action_items,
          aiRecommendedNextSteps: c.ai_recommended_next_steps,
          aiFollowUpEmail: c.ai_follow_up_email,
          aiWhatsappMessage: c.ai_whatsapp_message,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        };
      }) as Call[]);

    } catch (e: any) {
      console.error('Error fetching call reports:', e);
      toast.error('Failed to load call reports');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReports();
    
    // Setup realtime subscription for active dashboard updates
    const channel = supabase.channel('call_reports_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, () => {
         // Refresh stats quietly on new calls
         fetchReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  return {
    stats,
    counselorStats,
    reportData,
    recentCalls,
    counselors,
    designations,
    userMap,
    isLoading,
    refresh: fetchReports
  };
}

