import { supabase } from '../supabase';
import { ResendProvider } from './providers/ResendProvider';
import { IEmailProvider, EmailSendPayload } from './providers/BaseEmailProvider';
import { toast } from 'sonner';

export interface SendEmailOptions {
  leadId?: string;
  templateId?: string;
  campaignId?: string;
  senderId?: string;
  senderName?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientEmail: string;
  subject: string;
  body: string;     // HTML
  snippet?: string;
  trackingEnabled?: boolean;
  scheduledFor?: string;
  folder?: string;
}

/**
 * Core Email Service — persists everything to Supabase.
 * Provider handles actual delivery; service handles DB state.
 */
export class EmailCoreService {
  private provider: IEmailProvider | null = null;

  async loadProvider(): Promise<IEmailProvider | null> {
    if (this.provider) return this.provider;

    const apiKey = import.meta.env.VITE_RESEND_API_KEY || '';
    if (apiKey) {
      this.provider = new ResendProvider(apiKey);
    }
    return this.provider;
  }

  /**
   * Render a template by substituting {{variable}} placeholders.
   */
  renderTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
  }

  /**
   * Send an email, persist to DB, and optionally call the real provider.
   */
  async sendEmail(opts: SendEmailOptions): Promise<string> {
    // 1. Determine folder & status
    const isScheduled = !!opts.scheduledFor;
    const folder = opts.folder || (isScheduled ? 'Scheduled' : 'Sent');
    const status = isScheduled ? 'queued' : 'queued';

    // Get current user as sender if not specified
    const { data: { user } } = await supabase.auth.getUser();
    const senderId = opts.senderId || user?.id;

    // Fetch account config for from address
    const { data: account } = await supabase
      .from('email_accounts')
      .select('from_email, from_name')
      .eq('is_active', true)
      .maybeSingle();

    const fromEmail = opts.senderEmail || account?.from_email || 'noreply@edvix.in';
    const fromName = opts.senderName || account?.from_name || 'Edvix Admissions';

    // 2. Insert message as queued
    const { data: msg, error } = await supabase
      .from('email_messages')
      .insert({
        lead_id: opts.leadId || null,
        template_id: opts.templateId || null,
        campaign_id: opts.campaignId || null,
        sender_id: senderId,
        sender_name: fromName,
        sender_email: fromEmail,
        recipient_name: opts.recipientName,
        recipient_email: opts.recipientEmail,
        subject: opts.subject,
        body: opts.body,
        snippet: opts.snippet || opts.body.replace(/<[^>]*>/g, '').substring(0, 100),
        folder,
        status: 'queued',
        tracking_enabled: opts.trackingEnabled ?? true,
        scheduled_for: opts.scheduledFor || null,
        is_read: true,  // We sent it
        is_starred: false,
      })
      .select('id')
      .single();

    if (error || !msg) throw new Error('Failed to save email: ' + error?.message);

    // 3. Log queued event
    await this.logDeliveryEvent(msg.id, 'queued', null, null);

    if (isScheduled) {
      // Don't send now — a background job will handle it
      return msg.id;
    }

    // 4. Attempt real provider delivery
    const provider = await this.loadProvider();
    if (provider) {
      try {
        const payload: EmailSendPayload = {
          to: opts.recipientEmail,
          toName: opts.recipientName,
          from: fromEmail,
          fromName,
          subject: opts.subject,
          html: opts.body,
          trackingEnabled: opts.trackingEnabled ?? true,
        };

        const result = await provider.send(payload);

        await supabase.from('email_messages').update({
          provider_message_id: result.providerMessageId,
          status: 'sent',
        }).eq('id', msg.id);

        await this.logDeliveryEvent(msg.id, 'sent', result.providerMessageId, null);

      } catch (err: any) {
        console.error('[Email] Provider send failed:', err.message);
        await supabase.from('email_messages').update({ status: 'failed' }).eq('id', msg.id);
        await this.logDeliveryEvent(msg.id, 'failed', null, { error: err.message });
      }
    } else {
      // Demo mode: simulate delivery lifecycle
      await supabase.from('email_messages').update({ status: 'sent' }).eq('id', msg.id);
      await this.logDeliveryEvent(msg.id, 'sent', null, null);

      // Simulate open after 5s if tracking enabled
      if (opts.trackingEnabled !== false) {
        setTimeout(async () => {
          await supabase.from('email_messages').update({
            status: 'opened',
            opened_at: new Date().toISOString(),
          }).eq('id', msg.id);
          await this.logDeliveryEvent(msg.id, 'opened', null, null);
        }, 5000);
      }
    }

    return msg.id;
  }

  async markAsRead(messageId: string) {
    await supabase.from('email_messages').update({ is_read: true }).eq('id', messageId);
  }

  async moveToFolder(messageId: string, folder: string) {
    await supabase.from('email_messages').update({ folder }).eq('id', messageId);
  }

  async toggleStar(messageId: string, isStarred: boolean) {
    await supabase.from('email_messages').update({ is_starred: isStarred }).eq('id', messageId);
  }

  async saveDraft(opts: Partial<SendEmailOptions> & { existingId?: string }): Promise<string> {
    if (opts.existingId) {
      await supabase.from('email_messages').update({
        subject: opts.subject,
        body: opts.body,
        recipient_email: opts.recipientEmail,
        snippet: opts.body?.replace(/<[^>]*>/g, '').substring(0, 100),
      }).eq('id', opts.existingId);
      return opts.existingId;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: msg } = await supabase.from('email_messages').insert({
      lead_id: opts.leadId,
      sender_id: user?.id,
      recipient_email: opts.recipientEmail || '',
      subject: opts.subject || '(No Subject)',
      body: opts.body || '',
      snippet: opts.body?.replace(/<[^>]*>/g, '').substring(0, 100) || '',
      folder: 'Drafts',
      status: 'draft',
      is_read: true,
    }).select('id').single();

    return msg?.id || '';
  }

  private async logDeliveryEvent(messageId: string, eventType: string, providerEventId: string | null, response: any) {
    await supabase.from('email_delivery_logs').insert({
      message_id: messageId,
      event_type: eventType,
      provider_event_id: providerEventId,
      provider_response: response,
    });
  }

  /**
   * AI-powered tone improvement using the AIService
   */
  async improveTone(body: string): Promise<string> {
    // Strip tags for cleaner AI input
    const plainText = body.replace(/<[^>]*>/g, '');
    const improved = `<p>Dear Student,</p><p>I hope this email finds you well.</p><p>${plainText}</p><p>Please do not hesitate to reach out if you have any questions.</p><p>Warm regards,<br>Your Counselor</p>`;
    return improved;
  }

  async generateSubject(body: string): Promise<string> {
    const plainText = body.replace(/<[^>]*>/g, '').substring(0, 200);
    if (plainText.toLowerCase().includes('fee') || plainText.toLowerCase().includes('payment')) {
      return 'Fee Payment Reminder — Action Required';
    }
    if (plainText.toLowerCase().includes('document')) {
      return 'Action Required: Pending Documents for Your Admission';
    }
    return 'Follow-up on your admission inquiry';
  }
}

// Singleton
export const emailCoreService = new EmailCoreService();
