import { BaseEntity } from './schema';

export type EmailStatus = 'Draft' | 'Sent' | 'Scheduled' | 'Failed' | 'Trash' | 'Inbox';
export type EmailFolder = 'Inbox' | 'Sent' | 'Drafts' | 'Scheduled' | 'Trash' | 'Archived';

export interface EmailAttachment {
  id: string;
  name: string;
  url: string;
  size: string;
  type: string;
}

export interface EmailMessage extends BaseEntity {
  subject: string;
  body: string; // HTML or text
  snippet: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  cc?: string[];
  bcc?: string[];
  
  status: EmailStatus;
  folder: EmailFolder;
  isRead: boolean;
  isStarred: boolean;
  
  // Tracking
  trackingEnabled: boolean;
  openedAt?: string;
  clickedAt?: string;
  
  // Threading & Relations
  threadId?: string;
  leadId?: string;
  
  attachments?: EmailAttachment[];
  scheduledFor?: string;
  timestamp: string;
}

export type EmailTemplateCategory = 
  | 'Welcome' 
  | 'Scholarship Offer' 
  | 'Fee Structure' 
  | 'University Comparison' 
  | 'Document Reminder' 
  | 'Payment Reminder' 
  | 'Admission Confirmation' 
  | 'Enrollment Details' 
  | 'LMS Credentials' 
  | 'Congratulations' 
  | 'Custom';

export interface EmailTemplate extends BaseEntity {
  name: string;
  category: EmailTemplateCategory;
  subjectTemplate: string;
  bodyTemplate: string;
}
