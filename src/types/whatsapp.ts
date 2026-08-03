import { BaseEntity, Lead, User } from './schema';

export type WhatsAppMessageStatus = 'Pending' | 'Sent' | 'Delivered' | 'Read' | 'Failed';
export type WhatsAppMessageType = 'Text' | 'Image' | 'PDF' | 'Document' | 'Audio' | 'Video' | 'Location' | 'Template';

export interface WhatsAppMessage extends BaseEntity {
  conversationId: string;
  sender: 'Counselor' | 'Student' | 'System';
  senderId?: string; // FK to User if counselor
  type: WhatsAppMessageType;
  content: string; // text or media URL
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  status: WhatsAppMessageStatus;
  timestamp: string;
  templateId?: string;
  isInternalNote?: boolean; // For counselor eyes only, not sent to student
}

export interface WhatsAppConversation extends BaseEntity {
  leadId: string;
  leadName: string;
  leadPhone: string;
  counselorId: string;
  counselorName: string;
  unreadCount: number;
  lastMessageAt: string;
  lastMessageSnippet: string;
  isPinned: boolean;
}

export type TemplateCategory = 'Welcome' | 'Follow-up' | 'Scholarship' | 'Fee Reminder' | 'Document Reminder' | 'Admission Confirmation' | 'Payment Confirmation' | 'LMS Credentials' | 'Custom';

export interface WhatsAppTemplate extends BaseEntity {
  name: string;
  category: TemplateCategory;
  content: string; // Contains variables like {{name}}, {{course}}
  variables: string[];
}

export interface WhatsAppBroadcast extends BaseEntity {
  campaignName: string;
  templateId: string;
  targetAudience: Record<string, any>; // filter criteria
  sentBy: string; // Admin User ID
  scheduledFor?: string;
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Completed' | 'Failed';
  stats: {
    totalTargeted: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}
