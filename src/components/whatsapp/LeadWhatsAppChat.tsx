import React, { useState, useEffect } from 'react';
import { WhatsAppChatWindow } from './WhatsAppChatWindow';
import { whatsAppCoreService } from '../../lib/whatsapp/WhatsAppService';
import { Lead } from '../../types/schema';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Loader2 } from 'lucide-react';

export function LeadWhatsAppChat({ lead }: { lead: Lead }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConversation = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Look up existing conversation for this lead
        const { data: contact } = await supabase
          .from('whatsapp_contacts')
          .select('id')
          .eq('lead_id', lead.id)
          .maybeSingle();

        if (contact) {
          const { data: conv } = await supabase
            .from('whatsapp_conversations')
            .select('id')
            .eq('contact_id', contact.id)
            .maybeSingle();

          if (conv) {
            setConversationId(conv.id);
            return;
          }
        }

        // 2. If no conversation yet and lead has a phone, create it
        if (lead.phone) {
          const newConvId = await whatsAppCoreService.getOrCreateConversation(
            lead.id,
            lead.phone,
            lead.name
          );
          setConversationId(newConvId);
        } else {
          setError('No phone number found for this lead.');
        }
      } catch (err: any) {
        setError('Failed to load WhatsApp conversation: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [lead.id, lead.phone]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground border border-border rounded-xl bg-card gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading WhatsApp Chat...
      </div>
    );
  }

  if (error || !conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground border border-border rounded-xl bg-card gap-3">
        <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm">{error || 'No WhatsApp conversation found.'}</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden h-[600px] flex flex-col bg-background shadow-sm">
      <div className="h-14 border-b border-border bg-card px-4 flex items-center shrink-0">
        <h3 className="font-medium flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          WhatsApp: {lead.phone}
        </h3>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <WhatsAppChatWindow conversationId={conversationId} leadId={lead.id} />
      </div>
    </div>
  );
}
