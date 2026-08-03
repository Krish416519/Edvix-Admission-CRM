import React, { useState } from 'react';
import { Mail, Clock, CheckCheck, Eye, ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEmail } from '../../hooks/useEmail';
import { Lead } from '../../types/schema';
import { EmailComposer } from './EmailComposer';
import { Skeleton } from '../ui/Skeleton';

export function LeadEmailTab({ lead }: { lead: Lead }) {
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  const { emails, isLoading } = useEmail(undefined, lead.id);

  const getStatusBadge = (status: string, openedAt: string | null, trackingEnabled: boolean) => {
    if (!trackingEnabled) return null;
    if (openedAt) return (
      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
        <Eye className="w-3 h-3" /> Opened
      </span>
    );
    if (status === 'sent' || status === 'delivered') return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Clock className="w-3 h-3" /> Unopened
      </span>
    );
    if (status === 'failed' || status === 'bounced') return (
      <span className="text-red-500 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {status === 'bounced' ? 'Bounced' : 'Failed'}
      </span>
    );
    return null;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h3 className="font-semibold text-sm">Email Timeline</h3>
          <p className="text-xs text-muted-foreground">{emails.length} emails linked to this lead.</p>
        </div>
        <button 
          onClick={() => setIsComposing(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm transition-colors"
        >
          Compose Email
        </button>
      </div>

      {/* Email Timeline */}
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4">
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-3 w-32 mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            <Mail className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm">No emails sent or received yet.</p>
          </div>
        ) : (
          emails.map(email => {
            const isSentByUs = email.folder === 'Sent';
            return (
              <div key={email.id} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <button 
                  onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
                  className="w-full text-left p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0",
                    isSentByUs ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Mail className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm">{email.subject}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(email.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                      {isSentByUs ? `To: ${email.recipient_name || email.recipient_email}` : `From: ${email.sender_name || email.sender_email}`}
                      {isSentByUs && (
                        <>
                          <span className="mx-1">•</span>
                          {getStatusBadge(email.status, email.opened_at, email.tracking_enabled)}
                        </>
                      )}
                    </div>
                    {expandedEmail !== email.id && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{email.snippet}</p>
                    )}
                  </div>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform shrink-0",
                    expandedEmail === email.id ? "rotate-180" : ""
                  )} />
                </button>

                {expandedEmail === email.id && (
                  <div className="p-4 border-t border-border bg-background/50">
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: email.body }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Inline Composer Overlay */}
      {isComposing && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex justify-center items-center p-4">
          <EmailComposer 
            lead={lead} 
            onClose={() => setIsComposing(false)} 
          />
        </div>
      )}
    </div>
  );
}
