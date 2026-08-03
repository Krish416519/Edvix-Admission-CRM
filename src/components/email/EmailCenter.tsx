import React, { useState, useEffect } from 'react';
import { 
  Mail, Inbox, Send, Archive, Trash2, Clock, FileText, 
  Search, Star, Eye, PenSquare, Loader2, StarOff
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEmail } from '../../hooks/useEmail';
import { EmailComposer } from './EmailComposer';
import { Skeleton } from '../ui/Skeleton';

type FolderType = 'Inbox' | 'Sent' | 'Drafts' | 'Scheduled' | 'Archived' | 'Trash';

export function EmailCenter() {
  const [activeFolder, setActiveFolder] = useState<FolderType>('Sent');
  const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  const { emails, inboxUnreadCount, isLoading, markAsRead, moveToTrash, toggleStar } = useEmail(activeFolder);

  const filteredEmails = emails.filter(e =>
    (e.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.sender_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.recipient_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeEmail = emails.find(e => e.id === activeEmailId);

  useEffect(() => {
    if (activeEmailId) markAsRead(activeEmailId);
  }, [activeEmailId]);

  useEffect(() => {
    setActiveEmailId(null);
  }, [activeFolder]);

  const folders: { id: FolderType; icon: React.ElementType; label: string; count?: number }[] = [
    { id: 'Inbox', icon: Inbox, label: 'Inbox', count: inboxUnreadCount },
    { id: 'Sent', icon: Send, label: 'Sent' },
    { id: 'Drafts', icon: FileText, label: 'Drafts' },
    { id: 'Scheduled', icon: Clock, label: 'Scheduled' },
    { id: 'Archived', icon: Archive, label: 'Archive' },
    { id: 'Trash', icon: Trash2, label: 'Trash' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto w-full relative">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            Email Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all student email communications.</p>
        </div>
        <button 
          onClick={() => setIsComposing(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover transition-colors shadow-sm text-sm"
        >
          <PenSquare className="w-4 h-4" />
          Compose
        </button>
      </div>

      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex relative">
        {/* Sidebar */}
        <div className="w-56 border-r border-border bg-muted/20 py-4 flex flex-col shrink-0">
          <div className="px-3 space-y-1">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                  activeFolder === folder.id 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <folder.icon className="w-4 h-4" />
                  {folder.label}
                </div>
                {(folder.count || 0) > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    activeFolder === folder.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {folder.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Email List */}
        <div className="w-[350px] border-r border-border flex flex-col shrink-0 bg-background/50">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="p-3 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-48 mb-1" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                ))}
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="text-center text-muted-foreground p-8 text-sm">
                No emails in {activeFolder}.
              </div>
            ) : (
              filteredEmails.map(email => (
                <button 
                  key={email.id}
                  onClick={() => setActiveEmailId(email.id)}
                  className={cn(
                    "w-full text-left p-4 flex flex-col border-b border-border transition-colors",
                    activeEmailId === email.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/50 border-l-2 border-l-transparent"
                  )}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={cn("text-sm truncate pr-2", !email.is_read && activeFolder === 'Inbox' ? "font-bold text-foreground" : "font-medium text-muted-foreground")}>
                      {activeFolder === 'Sent' ? `To: ${email.recipient_name || email.recipient_email}` : (email.sender_name || email.sender_email)}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(email.created_at).toLocaleDateString() === new Date().toLocaleDateString()
                        ? new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : new Date(email.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className={cn("text-sm mb-1 truncate", !email.is_read && activeFolder === 'Inbox' ? "font-bold" : "")}>
                    {email.subject}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {email.snippet}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {email.status === 'opened' && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
                        <Eye className="w-2.5 h-2.5" /> Opened
                      </span>
                    )}
                    {email.is_starred && <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Reading Pane */}
        <div className="flex-1 flex flex-col bg-background relative">
          {activeEmail ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-foreground leading-tight">{activeEmail.subject}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleStar(activeEmail.id, activeEmail.is_starred)}
                      className="p-1.5 text-muted-foreground hover:text-yellow-500 rounded-lg hover:bg-muted transition-colors"
                    >
                      {activeEmail.is_starred
                        ? <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        : <StarOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => moveToTrash(activeEmail.id)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {((activeFolder === 'Sent' ? activeEmail.recipient_name : activeEmail.sender_name) || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {activeEmail.sender_name} <span className="text-muted-foreground text-xs font-normal">&lt;{activeEmail.sender_email}&gt;</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        to {activeEmail.recipient_name} <span className="text-xs">&lt;{activeEmail.recipient_email}&gt;</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(activeEmail.created_at).toLocaleString()}
                    </div>
                    {activeEmail.tracking_enabled && (
                      <div className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                        activeEmail.opened_at
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Eye className="w-3 h-3" />
                        {activeEmail.opened_at
                          ? `Opened ${new Date(activeEmail.opened_at).toLocaleTimeString()}`
                          : 'Unopened'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: activeEmail.body }}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-[#F8F9FA] dark:bg-zinc-950/30">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm">Select an item to read</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Composer */}
      {isComposing && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex justify-end items-end p-4 pointer-events-auto">
          <EmailComposer onClose={() => setIsComposing(false)} />
        </div>
      )}
    </div>
  );
}
