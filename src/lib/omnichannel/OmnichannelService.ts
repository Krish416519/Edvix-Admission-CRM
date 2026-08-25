import { supabase } from '../supabase';
import { whatsAppCoreService } from '../whatsapp/WhatsAppService';
import { ChannelType } from '../../types/communication';

export class OmnichannelService {
  async getUnifiedConversations() {
    const { data, error } = await supabase
      .from('unified_conversations')
      .select('*')
      .order('last_activity_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getMessages(channel: ChannelType, conversationId: string) {
    if (channel === 'whatsapp') {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    } else if (channel === 'email') {
      const { data, error } = await supabase
        .from('email_messages')
        .select('*')
        .eq('lead_id', conversationId) // conversationId is lead_id for email
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    } else if (channel === 'sms') {
      const { data, error } = await supabase
        .from('sms_messages')
        .select('*')
        .eq('lead_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
    return [];
  }

  async sendMessage(
    channel: ChannelType,
    conversationId: string, // for email/sms this is lead_id
    content: string,
    senderId: string,
    subject?: string
  ) {
    // 1. Check preferences for any channel
    const leadId = channel === 'whatsapp' 
      ? (await supabase.from('whatsapp_conversations').select('lead_id').eq('id', conversationId).single()).data?.lead_id
      : conversationId;

    if (leadId) {
      const { data: pref } = await supabase
        .from('communication_preferences')
        .select('is_allowed')
        .eq('lead_id', leadId)
        .eq('channel', channel)
        .maybeSingle();

      if (pref && pref.is_allowed === false) {
        throw new Error(`User has opted out of ${channel.toUpperCase()} communication.`);
      }
    }

    if (channel === 'whatsapp') {
      return whatsAppCoreService.sendMessage(conversationId, content, 'text', false, senderId);
    } else if (channel === 'email') {
      // Simulate sending email and insert to DB
      const { data, error } = await supabase.from('email_messages').insert({
        lead_id: conversationId,
        sender_type: 'counselor',
        sender_id: senderId,
        subject: subject || 'No Subject',
        content,
        status: 'sent'
      }).select('id').single();
      
      if (error) throw error;
      return data.id;
    } else if (channel === 'sms') {
      // Simulate sending SMS and insert to DB
      const { data, error } = await supabase.from('sms_messages').insert({
        lead_id: conversationId,
        sender_type: 'counselor',
        sender_id: senderId,
        content,
        status: 'sent'
      }).select('id').single();
      
      if (error) throw error;
      return data.id;
    }
    
    throw new Error('Unsupported channel');
  }

  async getPreferences(leadId: string) {
    const { data, error } = await supabase
      .from('communication_preferences')
      .select('*')
      .eq('lead_id', leadId);
    if (error) throw error;
    return data;
  }

  async updatePreference(leadId: string, channel: ChannelType, isAllowed: boolean, userId: string) {
    const { error } = await supabase
      .from('communication_preferences')
      .upsert({
        lead_id: leadId,
        channel,
        is_allowed: isAllowed,
        updated_by: userId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'lead_id,channel' });
      
    if (error) throw error;
  }
}

export const omnichannelService = new OmnichannelService();
