import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { LeadStatus } from '../../../types/schema';
import { cn } from '../../../lib/utils';
import { DEFAULT_PIPELINE_STAGES } from '../../../constants/pipelineStages';
import { useAuth } from '../../../contexts/AuthContext';

interface LeadFiltersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilter: LeadStatus | 'All';
  setStatusFilter: (status: LeadStatus | 'All') => void;
  showDeleted: boolean;
  setShowDeleted: (show: boolean) => void;
}



export function LeadFiltersSheet({
  isOpen, onClose, statusFilter, setStatusFilter, showDeleted, setShowDeleted
}: LeadFiltersSheetProps) {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('Delete Leads', 'Lead Management');
  
  const [statuses, setStatuses] = useState<string[]>(['All', ...DEFAULT_PIPELINE_STAGES]);

  useEffect(() => {
    if (isOpen) {
      supabase.from('system_settings').select('value').eq('key', 'pipeline_stages').maybeSingle().then(({ data }) => {
        if (data && data.value && Array.isArray(data.value)) {
          setStatuses(['All', ...data.value]);
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReset = () => {
    setStatusFilter('All');
    setShowDeleted(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="relative bg-card w-full h-[85vh] rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
        
        {/* Handle for dragging (visual only) */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-4 pt-2 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-black text-foreground">Filters</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-32">
          
          <div className="mb-8">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Lead Status</h3>
            <div className="space-y-2">
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors active:scale-[0.99]",
                    statusFilter === status 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-border bg-card hover:bg-muted/50 text-foreground"
                  )}
                >
                  <span className="font-bold">{status}</span>
                  {statusFilter === status && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>

          {canDelete && (
            <div className="mb-6">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Other</h3>
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors active:scale-[0.99]">
                <span className="font-bold text-foreground">Show Deleted Leads</span>
                <input 
                  type="checkbox"
                  checked={showDeleted}
                  onChange={e => setShowDeleted(e.target.checked)}
                  className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                />
              </label>
            </div>
          )}
          
        </div>

        {/* Sticky Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-card border-t border-border flex items-center gap-3 [padding-bottom:calc(1rem+env(safe-area-inset-bottom))]">
          <button 
            onClick={handleReset}
            className="flex-1 py-4 px-4 rounded-xl font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors active:scale-95"
          >
            Reset
          </button>
          <button 
            onClick={onClose}
            className="flex-[2] py-4 px-4 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover transition-colors shadow-sm active:scale-95"
          >
            Apply Filters
          </button>
        </div>

      </div>
    </div>
  );
}
