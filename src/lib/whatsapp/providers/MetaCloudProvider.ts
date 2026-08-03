import { IWhatsAppProvider, IncomingWhatsAppMessage } from './BaseProvider';

/**
 * Meta WhatsApp Cloud API Provider
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 * 
 * Credentials are read from environment variables and should NOT be
 * committed or exposed to the client. In production, outbound calls
 * should go through a Supabase Edge Function.
 */
export class MetaCloudProvider implements IWhatsAppProvider {
  name = 'meta';
  
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion = 'v19.0';
  private baseUrl: string;

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  async sendText(to: string, body: string): Promise<{ providerMessageId: string }> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Meta API Error: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    return { providerMessageId: data.messages?.[0]?.id || '' };
  }

  async sendTemplate(to: string, templateName: string, languageCode: string, variables: Record<string, string>): Promise<{ providerMessageId: string }> {
    const components = Object.values(variables).length > 0 ? [{
      type: 'body',
      parameters: Object.values(variables).map(v => ({ type: 'text', text: v }))
    }] : [];

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components
        }
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Meta Template API Error: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    return { providerMessageId: data.messages?.[0]?.id || '' };
  }

  async sendMedia(to: string, mediaUrl: string, mediaType: 'image' | 'document' | 'audio' | 'video', caption?: string): Promise<{ providerMessageId: string }> {
    const mediaPayload: any = { link: mediaUrl };
    if (caption && (mediaType === 'image' || mediaType === 'document')) {
      mediaPayload.caption = caption;
    }

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: mediaType,
        [mediaType]: mediaPayload
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Meta Media API Error: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    return { providerMessageId: data.messages?.[0]?.id || '' };
  }

  validateWebhook(body: any, signature: string): boolean {
    // In production: compute HMAC-SHA256 of the body with app secret
    // and compare to X-Hub-Signature-256 header
    // For now, basic presence check
    return !!signature && !!body;
  }

  parseIncomingMessage(payload: any): IncomingWhatsAppMessage | null {
    try {
      const entry = payload?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];
      const contact = value?.contacts?.[0];

      if (!message) return null;

      return {
        waId: contact?.wa_id || '',
        phoneNumber: message.from,
        senderName: contact?.profile?.name || 'Unknown',
        messageType: message.type,
        content: message.type === 'text' ? message.text?.body : (message.caption || message.type),
        mediaUrl: message[message.type]?.link,
        providerMessageId: message.id,
        timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
      };
    } catch {
      return null;
    }
  }
}
