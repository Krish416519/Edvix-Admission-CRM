export type ChannelType = 'whatsapp' | 'email' | 'sms' | 'marketing';

export interface CommunicationPreference {
  id: string;
  lead_id: string;
  channel: ChannelType;
  is_allowed: boolean;
  source: string;
  updated_by: string;
  updated_at: string;
}

export interface UnifiedConversation {
  channel: ChannelType;
  conversation_id: string;
  lead_id: string;
  lead_name: string | null;
  assigned_to: string | null;
  status: string;
  unread_count: number;
  last_activity_at: string;
  last_message: string | null;
}

export interface EmailMessage {
  id: string;
  lead_id: string;
  sender_type: 'counselor' | 'student' | 'system';
  sender_id: string | null;
  subject: string;
  content: string;
  status: string;
  created_at: string;
}

export interface SMSMessage {
  id: string;
  lead_id: string;
  sender_type: 'counselor' | 'student' | 'system';
  sender_id: string | null;
  content: string;
  status: string;
  created_at: string;
}
