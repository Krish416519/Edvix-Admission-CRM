import { useEffect, useState } from 'react';
import { X, Check, Filter } from 'lucide-react';
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
  sourceFilter?: string;
  setSourceFilter?: (source: string) => void;
  counselorFilter?: string;
  setCounselorFilter?: (counselor: string) => void;
  dispositionFilter?: string;
  setDispositionFilter?: (disp: string) => void;
  minScoreFilter?: number | undefined;
  setMinScoreFilter?: (score: number | undefined) => void;
  counselors?: { id: string; name: string }[];
  dispositionCategories?: { id: string; name: string }[];
}

const COMMON_SOURCES = ['All', 'Website', 'Meta Ads', 'Google Ads', 'Walk-in', 'Referral', 'Organic', 'Direct', 'Other'];

export function LeadFiltersSheet({
  isOpen, 
  onClose, 
  statusFilter, 
  setStatusFilter, 
  showDeleted, 
  setShowDeleted,
  sourceFilter = 'All',
  setSourceFilter,
  counselorFilter = 'All',
  setCounselorFilter,
  dispositionFilter = 'All',
  setDispositionFilter,
  minScoreFilter,
  setMinScoreFilter,
  counselors = [],
  dispositionCategories = []
}: LeadFiltersSheetProps) {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission('Delete Leads', 'Lead Management');
  
  const [statuses, setStatuses] = useState<string[]>(['All', ...DEFAULT_PIPELINE_STAGES]);
  const [activeTab, setActiveTab] = useState<'status' | 'counselor' | 'source' | 'disposition' | 'score'>('status');

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
    setSourceFilter?.('All');
    setCounselorFilter?.('All');
    setDispositionFilter?.('All');
    setMinScoreFilter?.(undefined);
  };

  // Calculate active filter count
  let activeCount = 0;
  if (statusFilter !== 'All') activeCount++;
  if (showDeleted) activeCount++;
  if (sourceFilter !== 'All') activeCount++;
  if (counselorFilter !== 'All') activeCount++;
  if (dispositionFilter !== 'All') activeCount++;
  if (minScoreFilter !== undefined) activeCount++;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Lead Filters">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" 
        onClick={onClose}
      />
      
      {/* Sheet Container */}
      <div className="relative bg-card w-full max-h-[88dvh] rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden border-t border-border">
        
        {/* Drag handle */}
        <div className="w-full flex justify-center pt-3 pb-1.5 shrink-0">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 pt-1 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Filters</h2>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                {activeCount} active
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors active:scale-95"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Category Tabs for quick one-handed switching on mobile */}
        <div className="flex gap-1 overflow-x-auto px-4 py-2 border-b border-border/60 bg-muted/20 hide-scrollbar shrink-0">
          {[
            { key: 'status', label: 'Status' },
            { key: 'counselor', label: 'Counselor' },
            { key: 'source', label: 'Source' },
            { key: 'disposition', label: 'Disposition' },
            { key: 'score', label: 'Score / Priority' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all touch-manipulation",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-background text-muted-foreground hover:text-foreground border border-border/60"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-28 custom-scrollbar">
          {/* Status Options */}
          {activeTab === 'status' && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Select Pipeline Status</h3>
              {statuses.map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] text-left",
                    statusFilter === status 
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs" 
                      : "border-border bg-card hover:bg-muted/40 text-foreground"
                  )}
                >
                  <span className="text-sm">{status}</span>
                  {statusFilter === status && <Check className="w-4 h-4" />}
                </button>
              ))}

              {canDelete && (
                <div className="pt-4 mt-4 border-t border-border">
                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer">
                    <span className="text-sm font-semibold text-foreground">Show Deleted Leads</span>
                    <input 
                      type="checkbox"
                      checked={showDeleted}
                      onChange={e => setShowDeleted(e.target.checked)}
                      className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Counselor Options */}
          {activeTab === 'counselor' && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Filter by Assigned Counselor</h3>
              <button
                onClick={() => setCounselorFilter?.('All')}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] text-left",
                  counselorFilter === 'All' 
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs" 
                    : "border-border bg-card hover:bg-muted/40 text-foreground"
                )}
              >
                <span className="text-sm">All Counselors</span>
                {counselorFilter === 'All' && <Check className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setCounselorFilter?.('unassigned')}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] text-left",
                  counselorFilter === 'unassigned' 
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs" 
                    : "border-border bg-card hover:bg-muted/40 text-foreground"
                )}
              >
                <span className="text-sm">Unassigned Only</span>
                {counselorFilter === 'unassigned' && <Check className="w-4 h-4" />}
              </button>

              {counselors.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCounselorFilter?.(c.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] text-left",
                    counselorFilter === c.id 
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs" 
                      : "border-border bg-card hover:bg-muted/40 text-foreground"
                  )}
                >
                  <span className="text-sm">{c.name}</span>
                  {counselorFilter === c.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}

          {/* Source Options */}
          {activeTab === 'source' && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Filter by Lead Source</h3>
              {COMMON_SOURCES.map(source => (
                <button
                  key={source}
                  onClick={() => setSourceFilter?.(source)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] text-left",
                    sourceFilter === source 
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs" 
                      : "border-border bg-card hover:bg-muted/40 text-foreground"
                  )}
                >
                  <span className="text-sm">{source}</span>
                  {sourceFilter === source && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}

          {/* Disposition Category Options */}
          {activeTab === 'disposition' && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Filter by Disposition Category</h3>
              <button
                onClick={() => setDispositionFilter?.('All')}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] text-left",
                  dispositionFilter === 'All' 
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs" 
                    : "border-border bg-card hover:bg-muted/40 text-foreground"
                )}
              >
                <span className="text-sm">All Categories</span>
                {dispositionFilter === 'All' && <Check className="w-4 h-4" />}
              </button>

              {dispositionCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setDispositionFilter?.(cat.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] text-left",
                    dispositionFilter === cat.id 
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs" 
                      : "border-border bg-card hover:bg-muted/40 text-foreground"
                  )}
                >
                  <span className="text-sm">{cat.name}</span>
                  {dispositionFilter === cat.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          )}

          {/* Score Options */}
          {activeTab === 'score' && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Quick Lead Segments</h3>
              <button
                onClick={() => setMinScoreFilter?.(undefined)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] text-left",
                  minScoreFilter === undefined 
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs" 
                    : "border-border bg-card hover:bg-muted/40 text-foreground"
                )}
              >
                <div>
                  <span className="text-sm font-medium">All Scores</span>
                  <p className="text-xs text-muted-foreground">Show leads with any score</p>
                </div>
                {minScoreFilter === undefined && <Check className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setMinScoreFilter?.(80)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] text-left",
                  minScoreFilter === 80 
                    ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold shadow-xs" 
                    : "border-border bg-card hover:bg-muted/40 text-foreground"
                )}
              >
                <div>
                  <span className="text-sm font-semibold flex items-center gap-1.5">🔥 Hot Leads (Score ≥ 80)</span>
                  <p className="text-xs text-muted-foreground">High likelihood to enroll</p>
                </div>
                {minScoreFilter === 80 && <Check className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setMinScoreFilter?.(85)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] text-left",
                  minScoreFilter === 85 
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs" 
                    : "border-border bg-card hover:bg-muted/40 text-foreground"
                )}
              >
                <div>
                  <span className="text-sm font-semibold flex items-center gap-1.5">📈 High Conversion (Score ≥ 85)</span>
                  <p className="text-xs text-muted-foreground">Priority admission candidates</p>
                </div>
                {minScoreFilter === 85 && <Check className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Sticky Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-md border-t border-border flex items-center gap-3 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
          <button 
            type="button"
            onClick={handleReset}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors active:scale-95 text-sm"
          >
            Reset
          </button>
          <button 
            type="button"
            onClick={onClose}
            className="flex-[2] py-3 px-4 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-sm active:scale-95 text-sm"
          >
            Apply Filters {activeCount > 0 ? `(${activeCount})` : ''}
          </button>
        </div>

      </div>
    </div>
  );
}
