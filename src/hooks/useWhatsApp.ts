import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { whatsAppCoreService } from '../lib/whatsapp/WhatsAppService';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

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
    full_name: string;
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

  const fetchConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select(`
        *,
        whatsapp_contacts(phone_number, name, lead_id),
        leads(full_name, phone)
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
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    }
  }, [activeConversationId]);

  // Realtime subscription for messages in active conversation
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase.channel(`wa-messages-${activeConversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `conversation_id=eq.${activeConversationId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new as WAMessage]);
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConversationId]);

  // Realtime for conversation list updates (unread counts, last message)
  useEffect(() => {
    const channel = supabase.channel('wa-conversations-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_conversations'
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  const sendMessage = async (conversationId: string, content: string, messageType: 'text' | 'template' = 'text', isInternalNote = false, templateId?: string) => {
    if (!content.trim() || !user) return;
    setIsSending(true);
    try {
      await whatsAppCoreService.sendMessage(conversationId, content, messageType, isInternalNote, user.id, templateId);
    } catch (err: any) {
      toast.error('Failed to send message: ' + err.message);
    } finally {
      setIsSending(false);
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
    isLoading,
    isSending,
    sendMessage,
    getOrCreateConversation,
    refresh: fetchConversations,
    refreshMessages: fetchMessages
  };
}
