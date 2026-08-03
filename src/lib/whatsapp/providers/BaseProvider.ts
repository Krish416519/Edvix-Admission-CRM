// Base interface all WhatsApp providers must implement
export interface IWhatsAppProvider {
  name: string;

  /**
   * Send a text message to a phone number.
   */
  sendText(to: string, body: string): Promise<{ providerMessageId: string }>;

  /**
   * Send a template message (must be pre-approved by Meta or equivalent).
   */
  sendTemplate(to: string, templateName: string, languageCode: string, variables: Record<string, string>): Promise<{ providerMessageId: string }>;

  /**
   * Send a media message (image, PDF, video, etc.).
   */
  sendMedia(to: string, mediaUrl: string, mediaType: 'image' | 'document' | 'audio' | 'video', caption?: string): Promise<{ providerMessageId: string }>;

  /**
   * Validate an incoming webhook payload.
   */
  validateWebhook(body: any, signature: string): boolean;

  /**
   * Parse a raw incoming webhook payload into a normalized format.
   */
  parseIncomingMessage(payload: any): IncomingWhatsAppMessage | null;
}

export interface IncomingWhatsAppMessage {
  waId: string;         // WhatsApp ID of sender
  phoneNumber: string;
  senderName: string;
  messageType: string;
  content: string;
  mediaUrl?: string;
  providerMessageId: string;
  timestamp: string;
}
