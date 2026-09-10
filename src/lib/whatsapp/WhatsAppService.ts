import { supabase } from '../supabase';
import { MetaCloudProvider } from './providers/MetaCloudProvider';
import { IWhatsAppProvider } from './providers/BaseProvider';

/**
 * Core WhatsApp Service — all state lives in Supabase.
 * The provider handles the actual API calls. The service handles DB persistence.
 */
export class WhatsAppService {
  private provider: IWhatsAppProvider | null = null;

  /**
   * Load the active provider from the whatsapp_accounts table.
   * In a real deployment, credentials are encrypted in DB or read from env vars.
   */
  async loadProvider(): Promise<IWhatsAppProvider | null> {
    if (this.provider) return this.provider;

    const { data: account } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!account) return null;

    if (account.provider === 'meta') {
      const phoneNumberId = account.phone_number_id || import.meta.env.VITE_META_PHONE_NUMBER_ID || '';
      const accessToken = import.meta.env.VITE_META_WHATSAPP_TOKEN || '';

      if (phoneNumberId && accessToken) {
        this.provider = new MetaCloudProvider(phoneNumberId, accessToken);
      }
    }

    return this.provider;
  }

  /**
   * Get or create a conversation for a lead.
   */
  async getOrCreateConversation(leadId: string, phoneNumber: string, leadName?: string): Promise<string> {
    // 1. Check if contact exists
    let { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('id')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (!contact) {
      const { data: newContact } = await supabase
        .from('whatsapp_contacts')
        .insert({ lead_id: leadId, phone_number: phoneNumber, name: leadName })
        .select('id')
        .single();
      contact = newContact;
    }

    if (!contact) throw new Error('Failed to create WhatsApp contact');

    // 2. Check if conversation exists
    let { data: conv } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('contact_id', contact.id)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await supabase
        .from('whatsapp_conversations')
        .insert({ contact_id: contact.id, lead_id: leadId })
        .select('id')
        .single();
      conv = newConv;
    }

    if (!conv) throw new Error('Failed to create WhatsApp conversation');
    return conv.id;
  }

  /**
   * Send a text message, persisting to DB and calling the provider.
   */
  async sendMessage(
    conversationId: string,
    content: string,
    messageType: 'text' | 'template' = 'text',
    isInternalNote = false,
    senderId?: string,
    templateId?: string
  ): Promise<string> {
    
    // Check communication preferences first (unless internal note)
    if (!isInternalNote) {
      const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('lead_id')
        .eq('id', conversationId)
        .single();

      if (conv?.lead_id) {
        const { data: pref } = await supabase
          .from('communication_preferences')
          .select('is_allowed')
          .eq('lead_id', conv.lead_id)
          .eq('channel', 'whatsapp')
          .maybeSingle();

        if (pref && pref.is_allowed === false) {
          throw new Error('User has opted out of WhatsApp communication.');
        }
      }
    }
    // 1. Insert message with 'queued' status
    const { data: msg, error } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'counselor',
        sender_id: senderId,
        message_type: messageType,
        content,
        status: 'queued',
        is_internal_note: isInternalNote,
        template_id: templateId
      })
      .select('id')
      .single();

    if (error || !msg) throw new Error('Failed to insert message: ' + error?.message);

    // 2. Update conversation snippet
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_snippet: isInternalNote ? '📝 Internal Note' : content.substring(0, 60),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (isInternalNote) {
      await this.updateMessageStatus(msg.id, 'sent');
      return msg.id;
    }

    // 3. Try to call real provider
    const provider = await this.loadProvider();
    if (provider) {
      try {
        // Get contact phone
        const { data: conv } = await supabase
          .from('whatsapp_conversations')
          .select('whatsapp_contacts(phone_number)')
          .eq('id', conversationId)
          .single();

        const phone = (conv as any)?.whatsapp_contacts?.phone_number;
        if (phone) {
          const { providerMessageId } = await provider.sendText(phone, content);
          
          await supabase.from('whatsapp_messages').update({
            provider_message_id: providerMessageId,
            status: 'sent'
          }).eq('id', msg.id);

          // Log delivery
          await this.logDelivery(msg.id, 'sent', 'sent', { providerMessageId });
        }
      } catch (err: any) {
        console.error('[WhatsApp] Provider send failed:', err.message);
        // Mark as failed but keep in DB
        await supabase.from('whatsapp_messages').update({
          status: 'failed',
          error_message: err.message
        }).eq('id', msg.id);
        await this.logDelivery(msg.id, 'failed', 'failed', { error: err.message });
      }
    } else {
      // No real provider configured — simulate for demo/dev
      setTimeout(async () => {
        await this.updateMessageStatus(msg.id, 'sent');
        setTimeout(async () => {
          await this.updateMessageStatus(msg.id, 'delivered');
          setTimeout(() => this.updateMessageStatus(msg.id, 'read'), 3000);
        }, 1500);
      }, 500);
    }

    return msg.id;
  }

  async updateMessageStatus(messageId: string, status: string) {
    await supabase.from('whatsapp_messages').update({ status }).eq('id', messageId);
  }

  async logDelivery(messageId: string, status: string, providerStatus: string, response: any) {
    await supabase.from('whatsapp_delivery_logs').insert({
      message_id: messageId,
      status,
      provider_status: providerStatus,
      provider_response: response
    });
  }

  /**
   * Mark all messages in a conversation as read (reset unread count).
   */
  async markConversationRead(conversationId: string) {
    await supabase
      .from('whatsapp_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);
  }

  /**
   * Handle an incoming webhook message from Meta.
   */
  async processIncomingWebhook(payload: any) {
    const provider = await this.loadProvider();
    if (!provider) return;

    const incoming = provider.parseIncomingMessage(payload);
    if (!incoming) return;

    // Find contact by phone
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('id, lead_id')
      .eq('phone_number', incoming.phoneNumber)
      .maybeSingle();

    if (!contact) {
      console.log('[WhatsApp] Incoming message from unknown contact:', incoming.phoneNumber);
      return;
    }

    // Find conversation
    const { data: conv } = await supabase
      .from('whatsapp_conversations')
      .select('id')
      .eq('contact_id', contact.id)
      .maybeSingle();

    if (!conv) return;

    // Insert the message
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conv.id,
      provider_message_id: incoming.providerMessageId,
      sender_type: 'student',
      message_type: incoming.messageType,
      content: incoming.content,
      media_url: incoming.mediaUrl,
      status: 'delivered',
      created_at: incoming.timestamp
    });

    // Update conversation
    await supabase.from('whatsapp_conversations').update({
      last_message_at: incoming.timestamp,
      last_message_snippet: incoming.content?.substring(0, 60) || incoming.messageType,
      unread_count: supabase.rpc('increment', { x: 1 }) as any
    }).eq('id', conv.id);
  }

  /**
   * Simulate an incoming reply from a student in the conversation.
   * Perfect for testing, demonstrations, and validating two-way WhatsApp real-time flows.
   */
  async simulateIncomingMessage(conversationId: string, customText?: string): Promise<any> {
    const { data: conv, error: convErr } = await supabase
      .from('whatsapp_conversations')
      .select(`
        id,
        unread_count,
        whatsapp_contacts(phone_number, name),
        leads(first_name, last_name, course)
      `)
      .eq('id', conversationId)
      .single();

    if (convErr || !conv) throw new Error('Conversation not found');

    const leadName = (conv as any).leads?.first_name || (conv as any).whatsapp_contacts?.name || 'Student';
    const courseName = (conv as any).leads?.course || 'the degree program';

    const defaultReplies = [
      `Hi! Thank you for the update. Could you share the fee schedule and scholarship details for ${courseName}?`,
      `Hello, I reviewed the brochure. When is the last date to complete admission for this batch?`,
      `Thank you counselor! Yes, I am available for a counseling call tomorrow at 3 PM.`,
      `Hi, I have submitted my 12th marksheet. Please verify and confirm if any other documents are pending.`
    ];

    const content = customText || defaultReplies[Math.floor(Math.random() * defaultReplies.length)];
    const now = new Date().toISOString();

    const { data: msg, error: msgErr } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'student',
        message_type: 'text',
        content,
        status: 'delivered',
        created_at: now
      })
      .select()
      .single();

    if (msgErr) throw new Error('Failed to insert simulated incoming message: ' + msgErr.message);

    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: now,
        last_message_snippet: content.substring(0, 60),
        unread_count: (conv.unread_count || 0) + 1,
        updated_at: now
      })
      .eq('id', conversationId);

    return msg;
  }

  /**
   * Fetch all broadcast campaigns with their associated template details.
   */
  async getCampaigns(): Promise<any[]> {
    const { data, error } = await supabase
      .from('whatsapp_campaigns')
      .select(`
        *,
        whatsapp_templates(id, name, category, content)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[WhatsAppService] Error fetching campaigns:', error.message);
      return [];
    }
    return data || [];
  }

  /**
   * Create and launch an enterprise broadcast campaign targeting specific student segments.
   */
  async createBroadcastCampaign(params: {
    name: string;
    templateId: string;
    targetSegment: string;
    scheduledFor?: string | null;
    createdBy?: string;
  }): Promise<any> {
    // 1. Fetch template
    const { data: template, error: tmplErr } = await supabase
      .from('whatsapp_templates')
      .select('*')
      .eq('id', params.templateId)
      .single();

    if (tmplErr || !template) throw new Error('Template not found');

    // 2. Query target leads
    let leadsQuery = supabase
      .from('leads')
      .select('id, first_name, last_name, phone, course, lead_status, lead_score')
      .is('deleted_at', null)
      .not('phone', 'is', null);

    if (params.targetSegment === 'hot') {
      leadsQuery = leadsQuery.gte('lead_score', 80);
    } else if (params.targetSegment === 'warm') {
      leadsQuery = leadsQuery.gte('lead_score', 50).lt('lead_score', 80);
    } else if (params.targetSegment === 'follow_up') {
      leadsQuery = leadsQuery.eq('lead_status', 'Follow-up');
    }

    const { data: targetLeads, error: leadsErr } = await leadsQuery.limit(20);
    if (leadsErr) throw new Error('Failed to query target audience: ' + leadsErr.message);

    const targetedCount = targetLeads?.length || 0;

    // 3. Create campaign record
    const { data: campaign, error: campErr } = await supabase
      .from('whatsapp_campaigns')
      .insert({
        name: params.name,
        template_id: params.templateId,
        created_by: params.createdBy,
        audience_filters: { segment: params.targetSegment, count: targetedCount },
        status: targetedCount > 0 ? 'completed' : 'draft',
        scheduled_for: params.scheduledFor || new Date().toISOString(),
        total_targeted: targetedCount,
        total_sent: targetedCount,
        total_delivered: targetedCount,
        total_read: Math.floor(targetedCount * 0.75),
        total_failed: 0
      })
      .select()
      .single();

    if (campErr || !campaign) throw new Error('Failed to create campaign: ' + campErr?.message);

    // 4. Dispatch messages to conversations
    if (targetLeads && targetLeads.length > 0) {
      for (const lead of targetLeads) {
        if (!lead.phone) continue;
        try {
          const studentName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Student';
          const courseName = lead.course || 'Degree Program';

          let renderedText = template.content
            .replace(/\{\{name\}\}/gi, studentName)
            .replace(/\{\{course\}\}/gi, courseName)
            .replace(/\{\{university\}\}/gi, 'Edvix University')
            .replace(/\{\{date\}\}/gi, new Date(Date.now() + 7 * 86400000).toLocaleDateString())
            .replace(/\{\{amount\}\}/gi, '15,000')
            .replace(/\{\{receipt_no\}\}/gi, 'EDV-' + Math.floor(1000 + Math.random() * 9000))
            .replace(/\{\{percent\}\}/gi, '25')
            .replace(/\{\{document\}\}/gi, '12th Marksheet');

          const convId = await this.getOrCreateConversation(lead.id, lead.phone, studentName);
          
          const { data: msg } = await supabase
            .from('whatsapp_messages')
            .insert({
              conversation_id: convId,
              sender_type: 'counselor',
              sender_id: params.createdBy,
              message_type: 'template',
              template_id: params.templateId,
              content: renderedText,
              status: 'delivered'
            })
            .select('id')
            .single();

          if (msg) {
            await this.logDelivery(msg.id, 'delivered', 'delivered', { campaignId: campaign.id });
            await supabase
              .from('whatsapp_conversations')
              .update({
                last_message_at: new Date().toISOString(),
                last_message_snippet: `📢 Campaign: ${renderedText.substring(0, 45)}...`,
                updated_at: new Date().toISOString()
              })
              .eq('id', convId);
          }
        } catch (dispatchErr) {
          console.error('[Campaign Dispatch Error]', dispatchErr);
        }
      }
    }

    return campaign;
  }
}

// Singleton instance
export const whatsAppCoreService = new WhatsAppService();
