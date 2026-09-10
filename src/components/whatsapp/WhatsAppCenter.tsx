import { useState, useEffect } from 'react';
import { 
  MessageSquare, Search, Filter, Pin, Phone, Video, MoreVertical, 
  Send, Users, Plus, WifiOff, ArrowLeft, Radio, CheckCircle2, Clock, 
  SendHorizontal, Eye, X, Sparkles, Megaphone, CheckCheck, AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useWhatsApp, WAConversation } from '../../hooks/useWhatsApp';
import { WhatsAppChatWindow } from './WhatsAppChatWindow';
import { Skeleton } from '../ui/Skeleton';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export function WhatsAppCenter() {
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState<'Chat' | 'Broadcast'>('Chat');
  const [showMobileChat, setShowMobileChat] = useState(false);

  // New Chat Dialog State
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [availableLeads, setAvailableLeads] = useState<any[]>([]);
  const [isSearchingLeads, setIsSearchingLeads] = useState(false);

  // Broadcast Campaign Modal State
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [targetSegment, setTargetSegment] = useState('all');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  const { 
    conversations, 
    templates, 
    campaigns, 
    isLoading, 
    getOrCreateConversation,
    createCampaign 
  } = useWhatsApp();

  // Auto-select first conversation
  useEffect(() => {
    if (!activeConvId && conversations.length > 0) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  // Escape key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNewChatModal(false);
        setShowCampaignModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Query leads for New Chat modal
  useEffect(() => {
    if (!showNewChatModal) return;
    const fetchLeads = async () => {
      setIsSearchingLeads(true);
      let query = supabase
        .from('leads')
        .select('id, first_name, last_name, phone, lead_status, course, lead_score')
        .is('deleted_at', null)
        .not('phone', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (leadSearchQuery.trim()) {
        query = query.or(`first_name.ilike.%${leadSearchQuery}%,last_name.ilike.%${leadSearchQuery}%,phone.ilike.%${leadSearchQuery}%`);
      }

      const { data } = await query;
      setAvailableLeads(data || []);
      setIsSearchingLeads(false);
    };

    const timer = setTimeout(fetchLeads, 200);
    return () => clearTimeout(timer);
  }, [showNewChatModal, leadSearchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNewChatModal(false);
        setShowCampaignModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeConv = conversations.find(c => c.id === activeConvId);

  const filteredConversations = conversations.filter(c => {
    const name = (c.leads?.first_name ? `${c.leads.first_name} ${c.leads.last_name || ''}`.trim() : '') || c.whatsapp_contacts?.name || '';
    const phone = c.whatsapp_contacts?.phone_number || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || phone.includes(searchQuery);
  });

  const getDisplayName = (conv: WAConversation) => {
    const leadName = conv.leads?.first_name ? `${conv.leads.first_name} ${conv.leads.last_name || ''}`.trim() : '';
    return leadName || conv.whatsapp_contacts?.name || conv.whatsapp_contacts?.phone_number || 'Unknown Student';
  };

  const getPhone = (conv: WAConversation) =>
    conv.whatsapp_contacts?.phone_number || '';

  const handleStartChatWithLead = async (lead: any) => {
    try {
      const studentName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Student';
      const convId = await getOrCreateConversation(lead.id, lead.phone, studentName);
      setActiveConvId(convId);
      setShowNewChatModal(false);
      setShowMobileChat(true);
      toast.success(`Chat opened with ${studentName}`);
    } catch (err: any) {
      toast.error('Failed to initiate conversation: ' + err.message);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }
    if (!selectedTemplateId) {
      toast.error('Please select a WhatsApp template');
      return;
    }

    setIsCreatingCampaign(true);
    try {
      await createCampaign({
        name: campaignName.trim(),
        templateId: selectedTemplateId,
        targetSegment
      });
      setShowCampaignModal(false);
      setCampaignName('');
      setSelectedTemplateId('');
    } catch (err: any) {
      // toast already shown in hook
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  // Aggregated Campaign Metrics
  const totalTargeted = campaigns.reduce((sum, c) => sum + (c.total_targeted || 0), 0);
  const totalSent = campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);
  const totalDelivered = campaigns.reduce((sum, c) => sum + (c.total_delivered || 0), 0);
  const totalRead = campaigns.reduce((sum, c) => sum + (c.total_read || 0), 0);
  const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="flex flex-col h-[calc(100dvh-11rem)] md:h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto w-full px-2 md:px-0">
      
      {/* Top Header & Tab Controls */}
      <div className="flex justify-between items-end mb-3 md:mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
            <span className="hidden sm:inline">WhatsApp Command Center</span>
            <span className="sm:hidden">WhatsApp</span>
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 hidden sm:block">
            Enterprise two-way student messaging, dynamic AI scripts & targeted broadcast campaigns.
          </p>
        </div>
        <div className="flex bg-muted p-1 rounded-xl border border-border/50 shrink-0">
          <button 
            onClick={() => setTab('Chat')}
            className={cn(
              "px-2.5 md:px-4 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5", 
              tab === 'Chat' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Direct Chats</span>
            <span className="sm:hidden">Chats</span>
            {conversations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {conversations.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setTab('Broadcast')}
            className={cn(
              "px-2.5 md:px-4 py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5", 
              tab === 'Broadcast' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Broadcast Campaigns</span>
            <span className="sm:hidden">Broadcast</span>
            {campaigns.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-bold">
                {campaigns.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: DIRECT TWO-WAY CHATS */}
      {tab === 'Chat' && (
        <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex relative min-h-0">
          
          {/* Chat List Sidebar */}
          <div className={cn(
            "w-full md:w-80 border-r border-border flex flex-col bg-background/50 shrink-0",
            showMobileChat ? "hidden md:flex" : "flex"
          )}>
            <div className="p-3 border-b border-border space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search conversations..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-muted border-none rounded-xl pl-9 pr-3 py-2 text-xs md:text-sm focus:ring-1 focus:ring-green-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="p-2 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm shrink-0"
                  title="Start New Conversation"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="p-3 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="w-11 h-11 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-28 mb-2" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <WifiOff className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-foreground font-semibold">No chats found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Start a new conversation with any prospective student in your CRM.
                  </p>
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                  >
                    + Start New Chat
                  </button>
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
                      "w-full text-left p-3 flex items-start gap-3 border-b border-border/60 hover:bg-muted/50 transition-colors relative",
                      activeConvId === conv.id && "bg-muted border-l-4 border-l-primary"
                    )}
                  >
                    <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 relative">
                      {getDisplayName(conv).charAt(0).toUpperCase()}
                      {conv.unread_count > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-background animate-pulse">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="font-semibold text-xs md:text-sm text-foreground truncate pr-2">
                          {getDisplayName(conv)}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {conv.last_message_at
                            ? new Date(conv.last_message_at).toLocaleDateString() === new Date().toLocaleDateString()
                              ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })
                            : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {conv.is_pinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        <span className="truncate text-xs">
                          {conv.last_message_snippet || getPhone(conv)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className={cn(
            "flex-1 flex flex-col bg-background min-h-0",
            !showMobileChat ? "hidden md:flex" : "flex"
          )}>
            {activeConv ? (
              <>
                {/* Chat Header */}
                <div className="h-14 md:h-16 px-3 md:px-4 border-b border-border flex items-center justify-between bg-card shrink-0">
                  <div className="flex items-center gap-2 md:gap-3">
                    <button 
                      data-testid="mobile-back-to-list-btn"
                      onClick={() => setShowMobileChat(false)}
                      className="md:hidden p-2 -ml-1 text-muted-foreground hover:bg-muted rounded-full transition-colors shrink-0"
                      title="Back to conversations"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {getDisplayName(activeConv).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-semibold text-xs md:text-sm text-foreground">{getDisplayName(activeConv)}</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground">{getPhone(activeConv)}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Realtime Connected
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <a 
                      href={`tel:${getPhone(activeConv)}`}
                      className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                      title="Direct Dial"
                    >
                      <Phone className="w-4 h-4 md:w-4.5 md:h-4.5 text-primary" />
                    </a>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-hidden relative">
                  <WhatsAppChatWindow conversationId={activeConv.id} leadId={activeConv.lead_id} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-[#F0F2F5] dark:bg-zinc-950/50 p-6 text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground/50" />
                </div>
                <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">WhatsApp Student CRM</h2>
                <p className="text-xs md:text-sm max-w-sm text-muted-foreground">
                  Select a chat from the sidebar or initiate a new conversation to start messaging your leads directly.
                </p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-sm"
                >
                  + Start Conversation
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BROADCAST CAMPAIGNS */}
      {tab === 'Broadcast' && (
        <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm p-4 md:p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* Top Metric Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Campaigns</span>
                <Megaphone className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-foreground mt-1">{campaigns.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Automated batch broadcasts</p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Targeted Leads</span>
                <Users className="w-4 h-4 text-violet-500" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-foreground mt-1">{totalTargeted}</p>
              <p className="text-[11px] text-violet-500 font-medium mt-0.5">Students in broadcast cohorts</p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Messages Delivered</span>
                <CheckCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-emerald-500 mt-1">{totalDelivered}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">100% verified delivery rate</p>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Read Engagement</span>
                <Eye className="w-4 h-4 text-cyan-500" />
              </div>
              <p className="text-xl md:text-2xl font-bold text-cyan-500 mt-1">{readRate}%</p>
              <p className="text-[11px] text-cyan-600 font-medium mt-0.5">{totalRead} student read confirmations</p>
            </div>
          </div>

          {/* Action Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div>
              <h2 className="text-lg font-bold text-foreground">Campaign Dispatch History</h2>
              <p className="text-xs text-muted-foreground">Segmented broadcasts sent via WhatsApp Business Cloud Engine.</p>
            </div>
            <button 
              onClick={() => setShowCampaignModal(true)}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs md:text-sm font-semibold hover:bg-primary-hover shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Campaign</span>
            </button>
          </div>

          {/* Campaign List Table */}
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 border border-dashed border-border rounded-xl text-center bg-muted/20">
              <Megaphone className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground">No broadcast campaigns launched yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Target hot leads, send document reminders, or broadcast scholarship notifications to prospective students.
              </p>
              <button
                onClick={() => setShowCampaignModal(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-sm"
              >
                Launch First Campaign
              </button>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Campaign Name</th>
                      <th className="py-3 px-4">Template</th>
                      <th className="py-3 px-4">Target Segment</th>
                      <th className="py-3 px-4">Delivery & Read</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {campaigns.map(camp => (
                      <tr key={camp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground">
                          {camp.name}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-medium">
                            {camp.whatsapp_templates?.name || 'Custom Template'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="capitalize text-xs font-medium text-foreground">
                            {camp.audience_filters?.segment || 'All Active Leads'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{camp.total_delivered}</span>
                            <span className="text-muted-foreground">/ {camp.total_targeted}</span>
                            <span className="text-[10px] text-emerald-500 font-bold">
                              ({camp.total_read} read)
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            camp.status === 'completed' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                            camp.status === 'sending' && "bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse",
                            camp.status === 'draft' && "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          )}>
                            {camp.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                          {new Date(camp.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: START NEW CHAT */}
      {showNewChatModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewChatModal(false); }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-500" />
                <span>Start New WhatsApp Chat</span>
              </h3>
              <button 
                data-testid="close-new-chat-modal"
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search lead by name or phone..." 
                value={leadSearchQuery}
                onChange={(e) => setLeadSearchQuery(e.target.value)}
                className="w-full bg-muted border-none rounded-xl pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-1 divide-y divide-border/40">
              {isSearchingLeads ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Searching student directory...</div>
              ) : availableLeads.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">No leads found with phone numbers.</div>
              ) : (
                availableLeads.map(lead => (
                  <div 
                    key={lead.id}
                    onClick={() => handleStartChatWithLead(lead)}
                    className="p-2.5 rounded-xl hover:bg-muted/70 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-xs md:text-sm text-foreground">
                        {lead.first_name} {lead.last_name || ''}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        📞 {lead.phone} • {lead.course || 'Degree Program'}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      Open Chat →
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE BROADCAST CAMPAIGN */}
      {showCampaignModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setShowCampaignModal(false); }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-500" />
                <span>Launch Broadcast Campaign</span>
              </h3>
              <button 
                data-testid="close-campaign-modal"
                onClick={() => setShowCampaignModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Campaign Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Fall 2026 MBA Priority Wave" 
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-muted border border-border/80 rounded-xl px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Target Student Segment</label>
                <select 
                  value={targetSegment}
                  onChange={(e) => setTargetSegment(e.target.value)}
                  className="w-full bg-muted border border-border/80 rounded-xl px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="all">All Active Student Leads</option>
                  <option value="hot">🔥 Hot Intent Leads (Lead Score ≥ 80)</option>
                  <option value="warm">⚡ Warm Leads (Score 50 - 79)</option>
                  <option value="follow_up">📞 Stalled Follow-ups (Re-engagement)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">WhatsApp Approved Template</label>
                <select 
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-muted border border-border/80 rounded-xl px-3 py-2 text-xs md:text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">-- Choose Template --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              {/* Template Preview */}
              {selectedTemplate && (
                <div className="p-3 rounded-xl bg-muted/50 border border-border/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-primary tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Live Template Preview
                  </span>
                  <p className="text-xs text-foreground leading-relaxed italic bg-background/60 p-2.5 rounded-lg border border-border/50">
                    "{selectedTemplate.content}"
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Variables like <code className="text-primary font-mono">{`{{name}}`}</code>, <code className="text-primary font-mono">{`{{course}}`}</code>, and <code className="text-primary font-mono">{`{{university}}`}</code> will be automatically merged per student.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setShowCampaignModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunchCampaign}
                disabled={isCreatingCampaign || !campaignName.trim() || !selectedTemplateId}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <SendHorizontal className="w-3.5 h-3.5" />
                <span>{isCreatingCampaign ? 'Dispatching...' : 'Launch Broadcast'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
