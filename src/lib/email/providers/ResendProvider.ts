import { IEmailProvider, EmailSendPayload, EmailSendResult, EmailWebhookEvent } from './BaseEmailProvider';

/**
 * Resend Email Provider
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 * 
 * Set VITE_RESEND_API_KEY in .env to activate.
 * Without it, the service falls back to demo mode.
 */
export class ResendProvider implements IEmailProvider {
  name = 'resend';
  private apiKey: string;
  private baseUrl = 'https://api.resend.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    const body: Record<string, any> = {
      from: `${payload.fromName} <${payload.from}>`,
      to: payload.toName ? `${payload.toName} <${payload.to}>` : payload.to,
      subject: payload.subject,
      html: payload.html,
    };

    if (payload.text) body.text = payload.text;
    if (payload.replyTo) body.reply_to = payload.replyTo;
    if (payload.cc?.length) body.cc = payload.cc;
    if (payload.bcc?.length) body.bcc = payload.bcc;

    const res = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Resend API Error: ${err.message || JSON.stringify(err)}`);
    }

    const data = await res.json();
    return { providerMessageId: data.id, status: 'sent' };
  }

  validateWebhook(body: any, signature: string): boolean {
    // In production: validate Svix webhook signature from Resend
    return !!body && !!signature;
  }

  parseWebhookEvent(payload: any): EmailWebhookEvent | null {
    try {
      const eventMap: Record<string, EmailWebhookEvent['eventType']> = {
        'email.delivered': 'delivered',
        'email.opened': 'opened',
        'email.clicked': 'clicked',
        'email.bounced': 'bounced',
        'email.complained': 'spam',
      };

      const eventType = eventMap[payload.type];
      if (!eventType) return null;

      return {
        providerMessageId: payload.data?.email_id || '',
        eventType,
        timestamp: payload.created_at || new Date().toISOString(),
        metadata: payload.data,
      };
    } catch {
      return null;
    }
  }
}
