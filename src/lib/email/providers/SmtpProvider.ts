import { IEmailProvider, EmailSendPayload, EmailSendResult, EmailWebhookEvent } from './BaseEmailProvider';

/**
 * SMTP Provider (Placeholder for Edge Functions)
 * 
 * Note: Standard SMTP protocols (like nodemailer) cannot be executed 
 * directly from the browser context due to security and missing Node.js core modules.
 * In production, this provider would be invoked via a Supabase Edge Function.
 */
export class SmtpProvider implements IEmailProvider {
  name = 'smtp';
  private host: string;
  private port: number;
  private user: string;
  private pass: string;

  constructor(host: string, port: number, user: string, pass: string) {
    this.host = host;
    this.port = port;
    this.user = user;
    this.pass = pass;
  }

  async send(payload: EmailSendPayload): Promise<EmailSendResult> {
    console.warn('[SMTP Provider] Sending emails via SMTP is not supported directly in the browser.');
    console.warn(`[SMTP Provider] Would connect to ${this.host}:${this.port} to send to ${payload.to}`);
    
    // Simulate Edge Function call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          providerMessageId: `smtp-${Date.now()}`,
          status: 'sent'
        });
      }, 1000);
    });
  }

  validateWebhook(body: any, signature: string): boolean {
    return false; // SMTP doesn't have standard webhooks like Resend/Sendgrid
  }

  parseWebhookEvent(payload: any): EmailWebhookEvent | null {
    return null; // SMTP delivery reports are typically parsed via IMAP bounce handling
  }
}
