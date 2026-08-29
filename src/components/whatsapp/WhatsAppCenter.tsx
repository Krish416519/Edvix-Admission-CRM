import { useState, useEffect } from 'react';
import { MessageSquare, Search, Filter, Pin, Phone, Video, MoreVertical, Send, Users, Plus, WifiOff, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWhatsApp, WAConversation } from '../../hooks/useWhatsApp';
import { WhatsAppChatWindow } from './WhatsAppChatWindow';
import { Skeleton } from '../ui/Skeleton';

export function WhatsAppCenter() {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'Chat' | 'Broadcast'>('Chat');
  const [showMobileChat, setShowMobileChat] = useState(false);

  const { conversations, isLoading } = useWhatsApp(activeConvId || undefined);

  // Auto-select first conversation
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  const activeConv = conversations.find(c => c.id === activeConvId);

  const filteredConversations = conversations.filter(c => {
    const name = (c.leads?.first_name ? `${c.leads.first_name} ${c.leads.last_name || ''}`.trim() : '') || c.whatsapp_contacts?.name || '';
    const phone = c.whatsapp_contacts?.phone_number || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || phone.includes(searchQuery);
  });

   const getDisplayName = (conv: WAConversation) => {
    const leadName = conv.leads?.first_name ? `${conv.leads.first_name} ${conv.leads.last_name || ''}`.trim() : '';
    return leadName || conv.whatsapp_contacts?.name || conv.whatsapp_contacts?.phone_number || 'Unknown';
  };

  const getPhone = (conv: WAConversation) =>
    conv.whatsapp_contacts?.phone_number || '';

  return (
    <div className="flex flex-col h-[calc(100dvh-11rem)] md:h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto w-full px-2 md:px-0">
      <div className="flex justify-between items-end mb-3 md:mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
            <span className="hidden sm:inline">Communication Center</span>
            <span className="sm:hidden">WhatsApp</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1 hidden sm:block">Manage WhatsApp conversations and broadcasts.</p>
        </div>
        <div className="flex bg-muted p-1 rounded-lg">
          <button 
            onClick={() => setTab('Chat')}
            className={cn("px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all", tab === 'Chat' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Chats
          </button>
          <button 
            onClick={() => setTab('Broadcast')}
            className={cn("px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all", tab === 'Broadcast' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            Broadcast
          </button>
        </div>
      </div>

      {tab === 'Chat' && (
        <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex relative">
          {/* Chat List Sidebar */}
          <div className={cn(
            "w-full md:w-80 border-r border-border flex flex-col bg-background/50 absolute md:relative inset-0 md:inset-auto z-10 md:z-auto transition-transform",
            showMobileChat && "md:translate-x-0 -translate-x-full"
          )}>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search chats..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-green-500 outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="p-3 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <WifiOff className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">No conversations yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start a conversation from a lead's profile.</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <button 
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setShowMobileChat(true);
                    }}
                    className={cn(
                      "w-full text-left p-3 flex items-start gap-3 border-b border-border hover:bg-muted/50 transition-colors",
                      activeConvId === conv.id && "bg-muted"
                    )}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold flex-shrink-0 relative">
                      {getDisplayName(conv).charAt(0).toUpperCase()}
                      {conv.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-background">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-sm truncate pr-2">{getDisplayName(conv)}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {conv.last_message_at
                            ? new Date(conv.last_message_at).toLocaleDateString() === new Date().toLocaleDateString()
                              ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : new Date(conv.last_message_at).toLocaleDateString()
                            : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {conv.is_pinned && <Pin className="w-3 h-3 text-muted-foreground" />}
                        <span className="truncate">{conv.last_message_snippet || getPhone(conv)}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className={cn(
            "flex-1 flex flex-col bg-background absolute md:relative inset-0 md:inset-auto transition-transform",
            !showMobileChat && "translate-x-full md:translate-x-0"
          )}>
            {activeConv ? (
              <>
                {/* Chat Header */}
                <div className="h-14 md:h-16 px-3 md:px-4 border-b border-border flex items-center justify-between bg-card shrink-0">
                  <div className="flex items-center gap-2 md:gap-3">
                    <button 
                      onClick={() => setShowMobileChat(false)}
                      className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {getDisplayName(activeConv).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm">{getDisplayName(activeConv)}</h2>
                      <p className="text-xs text-muted-foreground">{getPhone(activeConv)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 md:gap-1">
                    <button className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors hidden sm:block"><Search className="w-5 h-5" /></button>
                    <button className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"><Phone className="w-4 h-4 md:w-5 md:h-5" /></button>
                    <button className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors hidden sm:block"><Video className="w-5 h-5" /></button>
                    <button className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"><MoreVertical className="w-4 h-4 md:w-5 md:h-5" /></button>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-hidden relative">
                  <WhatsAppChatWindow conversationId={activeConv.id} leadId={activeConv.lead_id} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-[#F0F2F5] dark:bg-zinc-950/50 p-4">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/50" />
                </div>
                <h2 className="text-lg md:text-xl font-medium text-foreground mb-2">WhatsApp for CRM</h2>
                <p className="text-xs md:text-sm max-w-sm text-center">Select a chat from the sidebar to start messaging your leads directly from Edvix.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'Broadcast' && (
        <div className="flex-1 bg-card border border-border rounded-xl shadow-sm p-6 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4">
             <Users className="w-8 h-8" />
           </div>
           <h2 className="text-xl font-semibold mb-2">Broadcast Campaigns</h2>
           <p className="text-muted-foreground max-w-md mb-6">Send bulk templated messages to specific student segments based on course, university, or status.</p>
           <button className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-hover shadow-sm flex items-center gap-2">
             <Plus className="w-4 h-4" />
             Create New Campaign
           </button>
        </div>
      )}
    </div>
  );
}
