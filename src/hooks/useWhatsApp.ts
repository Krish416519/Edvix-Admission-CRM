import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { whatsAppCoreService } from '../lib/whatsapp/WhatsAppService';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

let waConversationsListSubscribed = false;

export interface WAConversation {
  id: string;
  lead_id: string;
  contact_id: string;
  assigned_user_id: string | null;
  unread_count: number;
  last_message_at: string | null;
  last_message_snippet: string | null;
  is_pinned: boolean;
  status: string;
  whatsapp_contacts: {
    phone_number: string;
    name: string | null;
    lead_id: string | null;
  } | null;
   leads?: {
     first_name: string;
     last_name?: string | null;
     phone: string;
   } | null;
}

export interface WAMessage {
  id: string;
  conversation_id: string;
  sender_type: 'counselor' | 'student' | 'system';
  sender_id: string | null;
  message_type: string;
  content: string | null;
  media_url: string | null;
  file_name: string | null;
  status: string;
  is_internal_note: boolean;
  template_id: string | null;
  created_at: string;
}

export interface WATemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  is_active: boolean;
}

export function useWhatsApp(activeConversationId?: string) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<WAConversation[]>([]);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [templates, setTemplates] = useState<WATemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [campaigns, setCampaigns] = useState<any[]>([]);

  const fetchCampaigns = useCallback(async () => {
    const data = await whatsAppCoreService.getCampaigns();
    setCampaigns(data);
  }, []);

  const fetchConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select(`
        *,
        whatsapp_contacts(phone_number, name, lead_id),
         leads(first_name, last_name, phone)
      `)
      .order('is_pinned', { ascending: false })
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      setConversations(data as WAConversation[]);
    }
    setIsLoading(false);
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as WAMessage[]);
    }

    // Mark as read
    await whatsAppCoreService.markConversationRead(conversationId);
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c));
  }, []);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) setTemplates(data as WATemplate[]);
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchTemplates();
    fetchCampaigns();
  }, [fetchConversations, fetchTemplates, fetchCampaigns]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId, fetchMessages]);

  // Realtime subscription for messages in active conversation
  useEffect(() => {
    if (!activeConversationId) return;

    const channelId = `wa-msgs-${activeConversationId}-${Math.random().toString(36).substring(2, 8)}-${Date.now()}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `conversation_id=eq.${activeConversationId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => {
            // Avoid duplicate if optimistic temp message matches
            const exists = prev.some(m => m.id === payload.new.id || (m.id.startsWith('temp-') && m.content === payload.new.content));
            if (exists) {
              return prev.map(m => (m.id.startsWith('temp-') && m.content === payload.new.content) ? (payload.new as WAMessage) : m);
            }
            return [...prev, payload.new as WAMessage];
          });
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [activeConversationId]);

  // Realtime for conversation list updates (unread counts, last message) and campaigns
  useEffect(() => {
    const channelId = `wa-convs-${Math.random().toString(36).substring(2, 8)}-${Date.now()}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_conversations'
      }, () => {
        fetchConversations();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_campaigns'
      }, () => {
        fetchCampaigns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, fetchCampaigns]);

  const sendMessage = async (conversationId: string, content: string, messageType: 'text' | 'template' = 'text', isInternalNote = false, templateId?: string) => {
    if (!content.trim() || !user) return;
    setIsSending(true);

    // Optimistic message addition for immediate user feedback
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: WAMessage = {
      id: tempId,
      conversation_id: conversationId,
      sender_type: 'counselor',
      sender_id: user.id,
      message_type: messageType,
      content,
      media_url: null,
      file_name: null,
      status: 'sent',
      is_internal_note: isInternalNote,
      template_id: templateId || null,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await whatsAppCoreService.sendMessage(conversationId, content, messageType, isInternalNote, user.id, templateId);
      await fetchMessages(conversationId);
      await fetchConversations();
    } catch (err: any) {
      toast.error('Failed to send message: ' + err.message);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const simulateIncomingReply = async (conversationId: string, text?: string) => {
    try {
      await whatsAppCoreService.simulateIncomingMessage(conversationId, text);
      await fetchMessages(conversationId);
      await fetchConversations();
      toast.success('Inbound student reply received via Realtime!');
    } catch (err: any) {
      toast.error('Simulation error: ' + err.message);
    }
  };

  const createCampaign = async (params: {
    name: string;
    templateId: string;
    targetSegment: string;
    scheduledFor?: string | null;
  }) => {
    if (!user) return;
    try {
      const camp = await whatsAppCoreService.createBroadcastCampaign({
        ...params,
        createdBy: user.id
      });
      toast.success(`Broadcast campaign "${params.name}" launched successfully!`);
      await fetchCampaigns();
      await fetchConversations();
      return camp;
    } catch (err: any) {
      toast.error('Failed to create campaign: ' + err.message);
      throw err;
    }
  };

  const getOrCreateConversation = async (leadId: string, phoneNumber: string, leadName?: string): Promise<string> => {
    const convId = await whatsAppCoreService.getOrCreateConversation(leadId, phoneNumber, leadName);
    await fetchConversations();
    return convId;
  };

  return {
    conversations,
    messages,
    templates,
    campaigns,
    isLoading,
    isSending,
    sendMessage,
    simulateIncomingReply,
    createCampaign,
    getOrCreateConversation,
    refresh: fetchConversations,
    refreshMessages: fetchMessages,
    refreshCampaigns: fetchCampaigns
  };
}
