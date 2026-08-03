import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { emailCoreService, SendEmailOptions } from '../lib/email/EmailService';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export interface EmailMessage {
  id: string;
  lead_id: string | null;
  template_id: string | null;
  sender_id: string | null;
  sender_name: string | null;
  sender_email: string | null;
  recipient_name: string | null;
  recipient_email: string;
  subject: string;
  body: string;
  snippet: string | null;
  folder: string;
  status: string;
  is_read: boolean;
  is_starred: boolean;
  tracking_enabled: boolean;
  thread_id: string | null;
  provider_message_id: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  scheduled_for: string | null;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject_template: string;
  body_template: string;
  variables: string[];
  is_active: boolean;
}

export function useEmail(folder?: string, leadId?: string) {
  const { user } = useAuth();
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fetchEmails = useCallback(async () => {
    let query = supabase
      .from('email_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (folder) query = query.eq('folder', folder);
    if (leadId) query = query.eq('lead_id', leadId);

    const { data, error } = await query;
    if (!error && data) setEmails(data as EmailMessage[]);

    // Count unread in Inbox
    const { count } = await supabase
      .from('email_messages')
      .select('*', { count: 'exact', head: true })
      .eq('folder', 'Inbox')
      .eq('is_read', false);

    setInboxUnreadCount(count || 0);
    setIsLoading(false);
  }, [folder, leadId]);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) setTemplates(data as EmailTemplate[]);
  }, []);

  useEffect(() => {
    fetchEmails();
    fetchTemplates();
  }, [fetchEmails, fetchTemplates]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('email-messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'email_messages',
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as EmailMessage;
          if (!folder || newMsg.folder === folder) {
            if (!leadId || newMsg.lead_id === leadId) {
              setEmails(prev => [newMsg, ...prev]);
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          setEmails(prev => prev.map(e => e.id === payload.new.id ? { ...e, ...payload.new } : e));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [folder, leadId]);

  const sendEmail = async (opts: SendEmailOptions) => {
    setIsSending(true);
    try {
      await emailCoreService.sendEmail({ ...opts, senderId: user?.id });
      toast.success('Email sent successfully');
    } catch (err: any) {
      toast.error('Failed to send email: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const saveDraft = async (opts: Partial<SendEmailOptions> & { existingId?: string }) => {
    try {
      const id = await emailCoreService.saveDraft(opts);
      toast.success('Draft saved');
      return id;
    } catch (err: any) {
      toast.error('Failed to save draft');
      return '';
    }
  };

  const markAsRead = async (messageId: string) => {
    await emailCoreService.markAsRead(messageId);
    setEmails(prev => prev.map(e => e.id === messageId ? { ...e, is_read: true } : e));
  };

  const moveToTrash = async (messageId: string) => {
    await emailCoreService.moveToFolder(messageId, 'Trash');
    setEmails(prev => prev.filter(e => e.id !== messageId));
    toast.success('Moved to Trash');
  };

  const toggleStar = async (messageId: string, current: boolean) => {
    await emailCoreService.toggleStar(messageId, !current);
    setEmails(prev => prev.map(e => e.id === messageId ? { ...e, is_starred: !current } : e));
  };

  const renderTemplate = (template: EmailTemplate, variables: Record<string, string>) => ({
    subject: emailCoreService.renderTemplate(template.subject_template, variables),
    body: emailCoreService.renderTemplate(template.body_template, variables),
  });

  return {
    emails,
    templates,
    inboxUnreadCount,
    isLoading,
    isSending,
    sendEmail,
    saveDraft,
    markAsRead,
    moveToTrash,
    toggleStar,
    renderTemplate,
    generateSubject: emailCoreService.generateSubject.bind(emailCoreService),
    improveTone: emailCoreService.improveTone.bind(emailCoreService),
    refresh: fetchEmails,
  };
}
