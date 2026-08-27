import { useState, useEffect } from 'react';
import { MessageSquare, Mail, Smartphone, Search, Filter, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { omnichannelService } from '../../lib/omnichannel/OmnichannelService';
import { UnifiedConversation, ChannelType } from '../../types/communication';
import { UnifiedComposer } from './UnifiedComposer';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function CommunicationCenter() {
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [activeConv, setActiveConv] = useState<UnifiedConversation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv.channel, activeConv.conversation_id);
    }
  }, [activeConv]);

  const loadConversations = async () => {
    try {
      const data = await omnichannelService.getUnifiedConversations();
      setConversations(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (channel: ChannelType, id: string) => {
    try {
      const msgs = await omnichannelService.getMessages(channel, id);
      setMessages(msgs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'email': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'sms': return <Smartphone className="w-4 h-4 text-indigo-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Sidebar - Conversation List */}
      <div className="w-1/3 border-r border-border flex flex-col bg-muted/5">
        <div className="p-4 border-b border-border flex flex-col gap-3">
          <h2 className="font-semibold text-foreground">Inbox</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No conversations found</div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map(conv => (
                <button
                  key={`${conv.channel}-${conv.conversation_id}`}
                  onClick={() => setActiveConv(conv)}
                  className={cn(
                    "w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-start gap-3",
                    activeConv?.conversation_id === conv.conversation_id ? "bg-muted/50" : ""
                  )}
                >
                  <div className="mt-1">
                    {getChannelIcon(conv.channel)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground truncate">
                        {conv.lead_name || 'Unknown Lead'}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {conv.last_activity_at ? formatDistanceToNow(new Date(conv.last_activity_at), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {conv.last_message || 'No messages yet'}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Thread & Composer */}
      <div className="flex-1 flex flex-col bg-background">
        {activeConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                {getChannelIcon(activeConv.channel)}
                <div>
                  <h3 className="font-semibold text-foreground">{activeConv.lead_name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{activeConv.channel} Conversation</p>
                </div>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">No messages in this thread yet.</div>
              ) : (
                messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={cn(
                      "flex flex-col max-w-[80%]",
                      msg.sender_type === 'counselor' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "px-4 py-2 rounded-2xl",
                      msg.sender_type === 'counselor' 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-muted text-foreground border border-border rounded-tl-sm"
                    )}>
                      {msg.subject && <div className="font-semibold text-sm mb-1">{msg.subject}</div>}
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    <div className="flex items-center gap-1 mt-1 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                      {msg.sender_type === 'counselor' && (
                        <CheckCircle2 className={cn("w-3 h-3", msg.status === 'read' ? 'text-blue-500' : 'text-muted-foreground')} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Composer */}
            <div className="p-4 bg-muted/5 border-t border-border">
              <UnifiedComposer 
                conversationId={activeConv.conversation_id} 
                defaultChannel={activeConv.channel}
                context={{ lead_name: activeConv.lead_name }}
                onSent={() => loadMessages(activeConv.channel, activeConv.conversation_id)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
