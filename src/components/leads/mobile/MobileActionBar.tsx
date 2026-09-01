import { useState, useEffect, useCallback } from 'react';
import { Phone, MessageCircle, CheckCircle2, ClipboardList, Bell, X } from 'lucide-react';
import { useTelephony } from '../../../contexts/TelephonyContext';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/utils';
import { DispositionWidget } from '../profile/DispositionWidget';

import { LeadStatus } from '../../../types/schema';

interface MobileActionBarProps {
  leadId: string;
  phone?: string | null;
  leadStatus?: LeadStatus;
  crmContext?: string;
  onDispositionSaved?: (newStatus?: LeadStatus) => void;
}

export function MobileActionBar({ leadId, phone, leadStatus, crmContext, onDispositionSaved }: MobileActionBarProps) {
  const { makeCall } = useTelephony();
  const { user } = useAuth();
  const [showDisposition, setShowDisposition] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Listen for global open-disposition events from other parts of the app
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail?.leadId === leadId) {
        setShowDisposition(true);
      }
    };
    window.addEventListener('open-disposition', handler);
    return () => window.removeEventListener('open-disposition', handler);
  }, [leadId]);

  const showFeedback = useCallback((msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 2000);
  }, []);

  const handleCall = () => {
    if (!phone) { showFeedback('No phone number'); return; }
    if (user && leadId) {
      makeCall({ to: phone, leadId, counselorId: user.id });
    } else {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (!phone) { showFeedback('No phone number'); return; }
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) clean = '91' + clean;
    window.open(`https://wa.me/${clean}`, '_blank', 'noopener,noreferrer');
  };

  const handleNote = () => {
    window.dispatchEvent(new CustomEvent('open-quick-note', { detail: { leadId } }));
  };

  const handleTask = () => {
    window.dispatchEvent(new CustomEvent('open-quick-task', { detail: { leadId } }));
  };

  return (
    <>
      {/* Bottom action bar — visible on all mobile/tablet (< xl) */}
      <div
        className={cn(
          'xl:hidden fixed bottom-0 left-0 right-0 z-50',
          'bg-card/95 backdrop-blur-xl border-t border-border',
          'shadow-[0_-8px_30px_-5px_rgba(0,0,0,0.15)]',
          // Safe area for iPhone notch/home bar
          '[padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]',
          'px-4 pt-3'
        )}
      >
        {/* Quick feedback toast */}
        {actionFeedback && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            {actionFeedback}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            aria-label="Open WhatsApp"
            className="flex-1 flex flex-col items-center justify-center gap-1 h-14 rounded-2xl font-bold text-green-700 bg-green-50 dark:bg-green-500/10 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 transition-colors active:scale-95 touch-manipulation"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px] font-semibold">WhatsApp</span>
          </button>

          {/* Call — primary, slightly larger */}
          <button
            onClick={handleCall}
            aria-label="Call lead"
            className="flex-[1.3] flex flex-col items-center justify-center gap-1 h-14 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20 active:scale-95 touch-manipulation"
          >
            <Phone className="w-5 h-5 fill-current" />
            <span className="text-[10px] font-semibold">Call</span>
          </button>

          {/* Add Activity Update */}
          <button
            onClick={() => setShowDisposition(true)}
            aria-label="Add Activity"
            className="flex-1 flex flex-col items-center justify-center gap-1 h-14 rounded-2xl font-bold text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 transition-colors active:scale-95 touch-manipulation"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Activity</span>
          </button>

          {/* Note */}
          <button
            onClick={handleNote}
            aria-label="Add note"
            className="flex-1 flex flex-col items-center justify-center gap-1 h-14 rounded-2xl font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors active:scale-95 touch-manipulation"
          >
            <ClipboardList className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Note</span>
          </button>
        </div>
      </div>

      {/* Add Activity Sheet — bottom sheet on mobile */}
      {showDisposition && leadId && (
        <div
          className="xl:hidden fixed inset-0 z-[60] flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Add Activity"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Sheet */}
          <div className="relative bg-card rounded-t-3xl shadow-2xl max-h-[90svh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            {/* Handle + Close */}
            <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/50">
              <div className="w-10 h-1 bg-border rounded-full mx-auto absolute top-3 left-1/2 -translate-x-1/2" />
              <h2 className="text-base font-bold text-foreground pt-2">Add Activity</h2>
              <button
                onClick={() => setShowDisposition(false)}
                className="p-2 -mr-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 [padding-bottom:max(1.25rem,env(safe-area-inset-bottom))]">
              <DispositionWidget
                leadId={leadId}
                currentStatus={leadStatus || 'New'}
                crmContext={crmContext}
                onSaved={(newStatus) => {
                  setShowDisposition(false);
                  onDispositionSaved?.(newStatus);
                }}
                onCancel={() => setShowDisposition(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
