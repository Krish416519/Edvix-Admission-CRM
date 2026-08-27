import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { CallConfig, TelephonyProviderInterface } from '../lib/telephony/provider';
import { createTelephonyProvider } from '../lib/telephony/providerFactory';
import { Call, TelephonyProvider as TelephonyProviderConfig, TelephonyProviderType, CallEventType } from '../types/telephony';
import { useCallAi } from '../hooks/useCallAi';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface TelephonyContextType {
  isInitializing: boolean;
  provider: TelephonyProviderInterface | null;
  makeCall: (config: CallConfig) => Promise<void>;
  endCall: (outcome?: string, notes?: string, tags?: string[], nextFollowUp?: string) => Promise<void>;
  activeCall: Call | null;
  isDialerOpen: boolean;
  setIsDialerOpen: (isOpen: boolean) => void;
  isMuted: boolean;
  toggleMute: () => Promise<void>;
  isOnHold: boolean;
  toggleHold: () => Promise<void>;
  callDuration: number;
  fetchCallsForLead: (leadId: string) => Promise<Call[]>;
}

const TelephonyContext = createContext<TelephonyContextType | undefined>(undefined);

export function TelephonyProvider({ children }: { children: ReactNode }) {
  const { user, hasRole } = useAuth();
  const [provider, setProvider] = useState<TelephonyProviderInterface | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { processCall } = useCallAi();
  
  // Timer for active call duration
  useEffect(() => {
    let interval: any;
    if (activeCall && (activeCall.status === 'in-progress' || activeCall.status === 'ringing')) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  // Load active provider from DB on mount
  useEffect(() => {
    const loadProvider = async () => {
      try {
        const { data, error } = await supabase
          .from('telephony_providers')
          .select('*')
          .eq('is_active', true)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Error fetching telephony provider:', error);
          }
          return;
        }

        if (data) {
          const providerConfig = data as TelephonyProviderConfig;
          const newProvider = createTelephonyProvider(providerConfig.providerType);
          await newProvider.initialize(providerConfig.config);
          setProvider(newProvider);
        }
      } catch (err) {
        console.error('Failed to initialize telephony provider:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    if (user) {
      loadProvider();
    }
  }, [user]);

  const logCallEvent = async (callId: string, eventType: CallEventType, eventData: any = {}) => {
    if (!user) return;
    try {
      await supabase.from('call_events').insert({
        call_id: callId,
        event_type: eventType,
        event_data: eventData,
        performed_by: user.id
      });
      
      await supabase.from('call_audit_log').insert({
        call_id: callId,
        user_id: user.id,
        action: `Call ${eventType}`,
        details: eventData
      });
    } catch (e) {
      console.error('Failed to log call event', e);
    }
  };

  const makeCall = async (config: CallConfig) => {
    if (!user) return;
    window.location.href = `tel:${config.to}`;
  };

  const endCall = async (outcome?: string, notes?: string, tags?: string[], nextFollowUp?: string) => {
    if (!activeCall || !provider || !user) return;

    try {
      if (activeCall.providerCallId) {
        await provider.endCall(activeCall.providerCallId);
      }
      
      const finalStatus = callDuration > 0 ? 'completed' : 'missed';
      
      // Final update
      await supabase.from('calls').update({
        status: finalStatus,
        duration_seconds: callDuration,
        outcome: outcome || (finalStatus === 'completed' ? 'Completed' : 'Missed'),
        notes: notes || '',
        tags: tags || [],
        next_follow_up: nextFollowUp || null,
        updated_at: new Date().toISOString()
      }).eq('id', activeCall.id);

      await logCallEvent(activeCall.id, 'disconnect', { duration: callDuration, reason: 'user_ended' });

      // Update lead activity
      await supabase.from('lead_activities').insert({
        lead_id: activeCall.leadId,
        type: 'call',
        content: `Call ${finalStatus}. Duration: ${callDuration}s. Outcome: ${outcome || 'N/A'}`,
        metadata: { callId: activeCall.id, duration: callDuration, outcome }
      });
      
      // Update Lead Next Follow-up if set
      if (nextFollowUp) {
         await supabase.from('leads').update({ next_follow_up: nextFollowUp }).eq('id', activeCall.leadId);
      }

      // Trigger Automations via execution logs insertion (monitored by DB triggers)
      await supabase.from('automation_execution_logs').insert({
        workflow_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID, real system would match triggers
        trigger_event: finalStatus === 'completed' ? 'Call Completed' : 'Call Missed',
        status: 'Pending',
        affected_lead_id: activeCall.leadId,
        actions_executed: [{ type: 'CallEnded', callId: activeCall.id, outcome }]
      });

      // Async trigger AI Processing if call was completed and long enough
      if (finalStatus === 'completed' && callDuration > 5) {
        processCall(activeCall.id, activeCall.providerCallId);
      }

      setActiveCall(null);
      setIsDialerOpen(false);
      setCallDuration(0);
      
    } catch (err) {
      console.error('Failed to end call', err);
      toast.error('Error ending call');
    }
  };

  const toggleMute = async () => {
    if (!activeCall || !provider || !activeCall.providerCallId) return;
    try {
      const nextState = !isMuted;
      await provider.mute(activeCall.providerCallId, nextState);
      setIsMuted(nextState);
      await logCallEvent(activeCall.id, nextState ? 'mute' : 'unmute');
    } catch (e) {
      toast.error('Failed to toggle mute');
    }
  };

  const toggleHold = async () => {
    if (!activeCall || !provider || !activeCall.providerCallId) return;
    try {
      const nextState = !isOnHold;
      await provider.hold(activeCall.providerCallId, nextState);
      setIsOnHold(nextState);
      await logCallEvent(activeCall.id, nextState ? 'hold' : 'unhold');
    } catch (e) {
      toast.error('Failed to toggle hold');
    }
  };
  
  const fetchCallsForLead = async (leadId: string) => {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching lead calls:', error);
      return [];
    }
    
    // Map DB snake_case to camelCase
    return data.map(c => ({
      id: c.id,
      leadId: c.lead_id,
      counselorId: c.counselor_id,
      providerId: c.provider_id,
      providerCallId: c.provider_call_id,
      direction: c.direction,
      status: c.status,
      durationSeconds: c.duration_seconds,
      recordingUrl: c.recording_url,
      leadName: c.lead_name,
      leadPhone: c.lead_phone,
      counselorName: c.counselor_name,
      outcome: c.outcome,
      notes: c.notes,
      tags: c.tags,
      nextFollowUp: c.next_follow_up,
      transcript: c.transcript,
      aiSummary: c.ai_summary,
      aiSentiment: c.ai_sentiment,
      aiObjections: c.ai_objections,
      aiActionItems: c.ai_action_items,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    })) as Call[];
  };

  return (
    <TelephonyContext.Provider value={{
      isInitializing,
      provider,
      makeCall,
      endCall,
      activeCall,
      isDialerOpen,
      setIsDialerOpen,
      isMuted,
      toggleMute,
      isOnHold,
      toggleHold,
      callDuration,
      fetchCallsForLead
    }}>
      {children}
    </TelephonyContext.Provider>
  );
}

export function useTelephony() {
  const context = useContext(TelephonyContext);
  if (context === undefined) {
    throw new Error('useTelephony must be used within a TelephonyProvider');
  }
  return context;
}
