export interface EmailSendPayload {
  to: string;
  toName?: string;
  from: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: { filename: string; url: string }[];
  trackingEnabled?: boolean;
}

export interface EmailSendResult {
  providerMessageId: string;
  status: 'sent' | 'queued' | 'failed';
}

export interface IEmailProvider {
  name: string;
  send(payload: EmailSendPayload): Promise<EmailSendResult>;
  validateWebhook(body: any, signature: string): boolean;
  parseWebhookEvent(payload: any): EmailWebhookEvent | null;
}

export interface EmailWebhookEvent {
  providerMessageId: string;
  eventType: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'spam';
  timestamp: string;
  metadata?: Record<string, any>;
}
