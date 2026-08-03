// Backward-compatible proxy — components that use the old API continue to work
// while we migrate them to useWhatsApp() hook.
import { whatsAppCoreService } from './whatsapp/WhatsAppService';
import { supabase } from './supabase';

export const whatsappService = {
  getConversations() { return []; }, // Legacy stub — use useWhatsApp() hook
  getMessages(_conversationId: string) { return []; }, // Legacy stub
  getTemplates() { return []; }, // Legacy stub

  subscribe(_listener: (event: string, data: any) => void) {
    // Legacy stub — useWhatsApp() hook uses Supabase Realtime
    return () => {};
  },

  async sendMessage(conversationId: string, content: string, type: 'Text' | 'Template' = 'Text', isInternalNote = false) {
    const { data: { user } } = await supabase.auth.getUser();
    await whatsAppCoreService.sendMessage(
      conversationId,
      content,
      type === 'Template' ? 'template' : 'text',
      isInternalNote,
      user?.id
    );
  }
};
