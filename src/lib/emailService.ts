// Backward-compatible stub — old components still call this
// but should be migrated to useEmail() hook.
import { emailCoreService } from './email/EmailService';

export const emailService = {
  getEmails(_folder?: string) { return []; },
  getEmailsForLead(_leadId: string) { return []; },
  getTemplates() { return []; },
  subscribe(_listener: (event: string, data: any) => void) { return () => {}; },
  markAsRead: (id: string) => emailCoreService.markAsRead(id),

  async sendEmail(email: any) {
    return emailCoreService.sendEmail({
      leadId: email.leadId,
      recipientEmail: email.recipientEmail,
      recipientName: email.recipientName,
      senderEmail: email.senderEmail,
      senderName: email.senderName,
      subject: email.subject,
      body: email.body,
      snippet: email.snippet,
      trackingEnabled: email.trackingEnabled,
    });
  },

  generateSubject: (body: string) => emailCoreService.generateSubject(body),
  improveTone: (body: string) => emailCoreService.improveTone(body),
};
