import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CallConfig, TelephonyProviderInterface } from '../lib/telephony/provider';
import { createTelephonyProvider } from '../lib/telephony/providerFactory';
import { Call, TelephonyProvider as TelephonyProviderConfig, CallEventType } from '../types/telephony';
import { useCallAi } from '../hooks/useCallAi';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface TelephonyContextType {
  isInitializing: boolean;
  provider: TelephonyProviderInterface | null;
  makeCall: (config: CallConfig) => Promise<void>;
  simulateInboundCall: (leadId?: string, leadName?: string, leadPhone?: string) => Promise<void>;
  answerCall: () => Promise<void>;
  endCall: (outcome?: string, notes?: string, tags?: string[], nextFollowUp?: string) => Promise<void>;
  hangUp: () => Promise<void>;
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
  const { user } = useAuth();
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
    if (activeCall && activeCall.status === 'in-progress') {
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
          // Fallback to CustomSIP
          const fallback = createTelephonyProvider('CustomSIP');
          await fallback.initialize({ endpoint: 'sip:default.edvix.local' });
          setProvider(fallback);
          return;
        }

        if (data) {
          const providerConfig = data as TelephonyProviderConfig;
          const newProvider = createTelephonyProvider(providerConfig.providerType);
          await newProvider.initialize(providerConfig.config || {});
          setProvider(newProvider);
        }
      } catch (err) {
        console.error('Failed to initialize telephony provider:', err);
        const fallback = createTelephonyProvider('CustomSIP');
        setProvider(fallback);
      } finally {
        setIsInitializing(false);
      }
    };

    if (user) {
      loadProvider();
    } else {
      setIsInitializing(false);
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
    if (!user) {
      toast.error('Please log in to make calls');
      return;
    }

    try {
      let leadName = 'Direct Contact';
      let leadPhone = config.to;

      // Look up lead if leadId provided
      if (config.leadId) {
        const { data: leadData } = await supabase
          .from('leads')
          .select('first_name, last_name, phone')
          .eq('id', config.leadId)
          .single();

        if (leadData) {
          leadName = `${leadData.first_name || ''} ${leadData.last_name || ''}`.trim() || leadName;
          leadPhone = leadData.phone || leadPhone;
        }
      }

      // Ensure active provider
      const activeProv = provider || createTelephonyProvider('CustomSIP');
      let providerCallId = `sip-${Date.now()}`;
      try {
        const callRes = await activeProv.makeCall(config);
        if (callRes?.providerCallId) providerCallId = callRes.providerCallId;
      } catch (provErr) {
        console.warn('Provider makeCall warning, using direct call session:', provErr);
      }

      const counselorName = user.name || user.email || 'Counselor';

      // Insert record into Supabase calls table
      const { data: newCall, error: insertError } = await supabase
        .from('calls')
        .insert({
          lead_id: config.leadId || null,
          counselor_id: user.id,
          counselor_name: counselorName,
          lead_name: leadName,
          lead_phone: leadPhone,
          direction: 'outbound',
          status: 'in-progress',
          duration_seconds: 0,
          provider_call_id: providerCallId
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to record call in DB:', insertError);
        toast.error('Failed to initiate call record');
        return;
      }

      const callObj: Call = {
        id: newCall.id,
        leadId: newCall.lead_id,
        counselorId: newCall.counselor_id,
        counselorName: newCall.counselor_name,
        leadName: newCall.lead_name,
        leadPhone: newCall.lead_phone,
        direction: 'outbound',
        status: 'in-progress',
        durationSeconds: 0,
        providerCallId: newCall.provider_call_id,
        createdAt: newCall.created_at,
        updatedAt: newCall.updated_at
      };

      setActiveCall(callObj);
      setCallDuration(0);
      setIsDialerOpen(true);
      setIsMuted(false);
      setIsOnHold(false);

      await logCallEvent(newCall.id, 'initiated', { to: leadPhone, direction: 'outbound' });
      await logCallEvent(newCall.id, 'answered', { duration: 0 });

      toast.success(`Calling ${leadName}...`);
    } catch (err: any) {
      console.error('makeCall error:', err);
      toast.error('Call failed to start');
    }
  };

  const simulateInboundCall = async (leadId?: string, leadName?: string, leadPhone?: string) => {
    if (!user) {
      toast.error('Please log in to simulate calls');
      return;
    }

    try {
      let targetLeadId = leadId;
      let targetLeadName = leadName;
      let targetLeadPhone = leadPhone;

      if (!targetLeadId) {
        const { data: randomLead } = await supabase
          .from('leads')
          .select('id, first_name, last_name, phone')
          .is('deleted_at', null)
          .limit(1)
          .single();

        if (randomLead) {
          targetLeadId = randomLead.id;
          targetLeadName = `${randomLead.first_name || ''} ${randomLead.last_name || ''}`.trim();
          targetLeadPhone = randomLead.phone;
        }
      }

      const counselorName = user.name || user.email || 'Counselor';
      const providerCallId = `inbound-${Date.now()}`;

      const { data: newCall, error } = await supabase
        .from('calls')
        .insert({
          lead_id: targetLeadId || null,
          counselor_id: user.id,
          counselor_name: counselorName,
          lead_name: targetLeadName || 'Prospective Student',
          lead_phone: targetLeadPhone || '+91 98765 43210',
          direction: 'inbound',
          status: 'ringing',
          duration_seconds: 0,
          provider_call_id: providerCallId
        })
        .select()
        .single();

      if (error) throw error;

      const callObj: Call = {
        id: newCall.id,
        leadId: newCall.lead_id,
        counselorId: newCall.counselor_id,
        counselorName: newCall.counselor_name,
        leadName: newCall.lead_name,
        leadPhone: newCall.lead_phone,
        direction: 'inbound',
        status: 'ringing',
        durationSeconds: 0,
        providerCallId: newCall.provider_call_id,
        createdAt: newCall.created_at,
        updatedAt: newCall.updated_at
      };

      setActiveCall(callObj);
      setCallDuration(0);
      setIsDialerOpen(true);
      setIsMuted(false);
      setIsOnHold(false);

      await logCallEvent(newCall.id, 'ringing', { from: targetLeadPhone, direction: 'inbound' });
      toast.info(`Incoming Call from ${targetLeadName || 'Prospective Student'}`);
    } catch (err: any) {
      console.error('Failed to simulate inbound call:', err);
      toast.error('Inbound call simulation failed');
    }
  };

  const answerCall = async () => {
    if (!activeCall) return;
    try {
      if (provider && activeCall.providerCallId) {
        await provider.answerCall(activeCall.providerCallId);
      }

      await supabase.from('calls').update({ status: 'in-progress' }).eq('id', activeCall.id);
      setActiveCall(prev => prev ? { ...prev, status: 'in-progress' } : null);
      await logCallEvent(activeCall.id, 'answered', { duration: 0 });
      toast.success('Call answered & connected');
    } catch (e) {
      console.error('Failed to answer call:', e);
    }
  };

  const hangUp = async () => {
    if (!activeCall) return;
    try {
      if (provider && activeCall.providerCallId) {
        await provider.endCall(activeCall.providerCallId);
      }

      const finalStatus = callDuration > 0 ? 'completed' : 'missed';
      await supabase.from('calls').update({
        status: finalStatus,
        duration_seconds: callDuration,
        updated_at: new Date().toISOString()
      }).eq('id', activeCall.id);

      await logCallEvent(activeCall.id, 'disconnect', { duration: callDuration });

      setActiveCall(prev => prev ? {
        ...prev,
        status: finalStatus,
        durationSeconds: callDuration
      } : null);

      toast.info('Call ended. Please log outcome.');
    } catch (e) {
      console.error('Error hanging up call:', e);
    }
  };

  const endCall = async (outcome?: string, notes?: string, tags?: string[], nextFollowUp?: string) => {
    if (!activeCall || !user) return;

    // If no outcome provided, this is a hang up action
    if (!outcome) {
      await hangUp();
      return;
    }

    // Otherwise, saving the disposition
    try {
      const finalStatus = (activeCall.status === 'completed' || callDuration > 0) ? 'completed' : 'missed';
      const duration = callDuration > 0 ? callDuration : (activeCall.durationSeconds || 0);

      await supabase.from('calls').update({
        status: finalStatus,
        duration_seconds: duration,
        outcome: outcome,
        notes: notes || '',
        tags: tags || [],
        next_follow_up: nextFollowUp || null,
        updated_at: new Date().toISOString()
      }).eq('id', activeCall.id);

      await logCallEvent(activeCall.id, 'disconnect', {
        duration,
        outcome,
        notes,
        tags
      });

      // Update lead activity
      if (activeCall.leadId) {
        await supabase.from('lead_activities').insert({
          lead_id: activeCall.leadId,
          type: 'call',
          content: `Call ${finalStatus}. Duration: ${duration}s. Outcome: ${outcome}`,
          metadata: { callId: activeCall.id, duration, outcome, notes, tags }
        });

        if (nextFollowUp) {
          await supabase.from('leads').update({ next_action_date: nextFollowUp }).eq('id', activeCall.leadId);
        }
      }

      // Trigger AI processing in background
      const callIdForAi = activeCall.id;
      const provIdForAi = activeCall.providerCallId;
      processCall(callIdForAi, provIdForAi);

      // Clean up state
      setActiveCall(null);
      setIsDialerOpen(false);
      setCallDuration(0);
      setIsMuted(false);
      setIsOnHold(false);

      toast.success('Call logged successfully');
    } catch (err) {
      console.error('Failed to end and log call:', err);
      toast.error('Error saving call log');
    }
  };

  const toggleMute = async () => {
    if (!activeCall) return;
    try {
      const nextState = !isMuted;
      if (provider && activeCall.providerCallId) {
        await provider.mute(activeCall.providerCallId, nextState);
      }
      setIsMuted(nextState);
      await logCallEvent(activeCall.id, nextState ? 'mute' : 'unmute');
    } catch (e) {
      toast.error('Failed to toggle mute');
    }
  };

  const toggleHold = async () => {
    if (!activeCall) return;
    try {
      const nextState = !isOnHold;
      if (provider && activeCall.providerCallId) {
        await provider.hold(activeCall.providerCallId, nextState);
      }
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
      aiRecommendedNextSteps: c.ai_recommended_next_steps,
      aiFollowUpEmail: c.ai_follow_up_email,
      aiWhatsappMessage: c.ai_whatsapp_message,
      createdAt: c.created_at,
      updatedAt: c.updated_at
    })) as Call[];
  };

  return (
    <TelephonyContext.Provider value={{
      isInitializing,
      provider,
      makeCall,
      simulateInboundCall,
      answerCall,
      endCall,
      hangUp,
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

