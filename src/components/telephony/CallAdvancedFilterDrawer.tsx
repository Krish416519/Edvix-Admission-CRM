import React from 'react';
import {
  X, Filter, RotateCcw, Phone, User, Users, Clock, Sparkles,
  Calendar, Check, ArrowRight, ShieldCheck, Tag, FileText, CheckCircle2,
  XCircle, AlertCircle, HelpCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  CallFilterState,
  CallSearchField,
  CounselorUser,
  DesignationOption,
  countActiveCallFilters
} from '../../types/callFilter';
import { CounselorSelect } from './CounselorSelect';
import { DesignationSelect } from './DesignationSelect';

interface CallAdvancedFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CallFilterState;
  onFilterChange: (newFilters: CallFilterState) => void;
  onReset: () => void;
  counselors: CounselorUser[];
  designations: DesignationOption[];
  totalCallsCount: number;
  filteredCallsCount: number;
}

const COMMON_OUTCOMES = [
  'Interested',
  'Follow-up Needed',
  'Application Started',
  'Fee Discussed',
  'Call Back Requested',
  'Wrong Number',
  'Not Interested'
];

export const CallAdvancedFilterDrawer: React.FC<CallAdvancedFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
  counselors,
  designations,
  totalCallsCount,
  filteredCallsCount
}) => {
  if (!isOpen) return null;

  const activeCount = countActiveCallFilters(filters);

  const update = (partial: Partial<CallFilterState>) => {
    onFilterChange({ ...filters, ...partial });
  };

  const toggleStatus = (status: string) => {
    const next = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    update({ statuses: next });
  };

  const toggleOutcome = (outcome: string) => {
    const next = filters.outcomes.includes(outcome)
      ? filters.outcomes.filter(o => o !== outcome)
      : [...filters.outcomes, outcome];
    update({ outcomes: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        data-testid="filter-drawer-backdrop"
      />

      {/* Slide-out Panel */}
      <div 
        data-testid="call-filter-drawer-panel"
        className="relative w-full max-w-md md:max-w-lg bg-card text-foreground shadow-2xl h-full flex flex-col border-l border-border z-10"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Advanced Call Filters
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                    {activeCount} active
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                Filter by user, designation, number, student or intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {activeCount > 0 && (
              <button
                onClick={onReset}
                className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors mr-1"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close filters"
              data-testid="close-filter-drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Filter Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Search Query & Field Scope */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" /> Search Mode & Keywords
            </label>
            
            {/* Search Target Mode Pills */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg text-xs font-medium">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'phone', label: 'By Number' },
                  { id: 'lead', label: 'By Person' },
                  { id: 'counselor', label: 'By Counselor' }
                ] as { id: CallSearchField; label: string }[]
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => update({ searchField: mode.id })}
                  className={cn(
                    "py-1.5 px-2 rounded-md text-center transition-all whitespace-nowrap",
                    filters.searchField === mode.id
                      ? "bg-card text-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder={
                  filters.searchField === 'phone'
                    ? 'Search by phone number (e.g. 9876543210)...'
                    : filters.searchField === 'lead'
                    ? 'Search by student / lead name...'
                    : filters.searchField === 'counselor'
                    ? 'Search by counselor / agent name...'
                    : 'Search by number, person, counselor, or notes...'
                }
                value={filters.search}
                onChange={(e) => update({ search: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {filters.search && (
                <button
                  onClick={() => update({ search: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Section 2: User-wise & Designation-wise Hierarchy */}
          <div className="space-y-4 pt-2 border-t border-border">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" /> User & Designation Filters
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Counselor / User Combobox */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Counselor / Agent
                </label>
                <CounselorSelect
                  value={filters.counselorId}
                  onChange={(id) => update({ counselorId: id })}
                  counselors={counselors}
                  className="w-full"
                />
              </div>

              {/* Designation-wise Combobox */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Designation / Role
                </label>
                <DesignationSelect
                  value={filters.designationId}
                  onChange={(id) => update({ designationId: id })}
                  designations={designations}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Call Direction & Status */}
          <div className="space-y-3 pt-2 border-t border-border">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" /> Call Direction & Status
            </label>

            {/* Direction Pills */}
            <div>
              <span className="block text-xs font-medium text-foreground mb-1.5">Direction</span>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All Directions' },
                  { id: 'outbound', label: 'Outbound' },
                  { id: 'inbound', label: 'Inbound' }
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => update({ direction: d.id as any })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      filters.direction === d.id
                        ? "bg-primary/10 border-primary text-primary font-semibold"
                        : "border-border hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Badges */}
            <div>
              <span className="block text-xs font-medium text-foreground mb-1.5">Call Status</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'completed', label: 'Completed' },
                  { id: 'missed', label: 'Missed' },
                  { id: 'in-progress', label: 'In Progress' },
                  { id: 'ringing', label: 'Ringing' },
                  { id: 'failed', label: 'Failed' }
                ].map((st) => {
                  const isChecked = filters.statuses.includes(st.id);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleStatus(st.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium border transition-all flex items-center gap-1.5",
                        isChecked
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border bg-muted/40 hover:bg-muted text-foreground"
                      )}
                    >
                      {isChecked && <Check className="w-3 h-3" />}
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 4: Outcomes & Dispositions */}
          <div className="space-y-3 pt-2 border-t border-border">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" /> Outcome & Intent
            </label>

            <div className="flex flex-wrap gap-1.5">
              {COMMON_OUTCOMES.map((oc) => {
                const isChecked = filters.outcomes.includes(oc);
                return (
                  <button
                    key={oc}
                    type="button"
                    onClick={() => toggleOutcome(oc)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium border transition-all flex items-center gap-1",
                      isChecked
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-border bg-muted/30 hover:bg-muted text-foreground"
                    )}
                  >
                    {isChecked && <Check className="w-3 h-3" />}
                    {oc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: AI Sentiment & Quality */}
          <div className="space-y-3 pt-2 border-t border-border">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Sentiment & Features
            </label>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'positive', label: 'Positive', color: 'text-emerald-500' },
                { id: 'neutral', label: 'Neutral', color: 'text-gray-500' },
                { id: 'negative', label: 'Negative', color: 'text-red-500' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => update({ sentiment: s.id as any })}
                  className={cn(
                    "py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all",
                    filters.sentiment === s.id
                      ? "bg-card border-primary text-foreground font-semibold shadow-sm"
                      : "border-border hover:bg-muted text-muted-foreground"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Checkbox Toggles */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(filters.hasAiSummary)}
                  onChange={(e) => update({ hasAiSummary: e.target.checked || undefined })}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Has AI Summary</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(filters.hasRecording)}
                  onChange={(e) => update({ hasRecording: e.target.checked || undefined })}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Has Audio Recording</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(filters.hasObjections)}
                  onChange={(e) => update({ hasObjections: e.target.checked || undefined })}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Objections Detected</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(filters.hasFollowUp)}
                  onChange={(e) => update({ hasFollowUp: e.target.checked || undefined })}
                  className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Scheduled Follow-Up</span>
              </label>
            </div>
          </div>

          {/* Section 6: Duration & Date Presets */}
          <div className="space-y-3 pt-2 border-t border-border">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> Duration & Date Range
            </label>

            {/* Duration Presets */}
            <div>
              <span className="block text-xs font-medium text-foreground mb-1.5">Call Duration</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: 'Any Duration' },
                  { id: 'under_1m', label: '< 1 Minute' },
                  { id: '1_to_5m', label: '1 - 5 Minutes' },
                  { id: '5_to_15m', label: '5 - 15 Minutes' },
                  { id: 'over_15m', label: '> 15 Minutes' }
                ].map((dur) => (
                  <button
                    key={dur.id}
                    type="button"
                    onClick={() => update({ durationPreset: dur.id as any })}
                    className={cn(
                      "py-1 px-2 rounded-md text-xs border text-left transition-all",
                      filters.durationPreset === dur.id
                        ? "bg-primary/10 border-primary text-primary font-semibold"
                        : "border-border hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range Presets */}
            <div className="pt-2">
              <span className="block text-xs font-medium text-foreground mb-1.5">Date Range</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'last_7_days', label: '7 Days' },
                  { id: 'last_30_days', label: '30 Days' },
                  { id: 'custom', label: 'Custom Range' }
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => update({ datePreset: d.id as any })}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs border transition-all",
                      filters.datePreset === d.id
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "border-border bg-muted/30 hover:bg-muted text-foreground"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {filters.datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-0.5">From</label>
                    <input
                      type="date"
                      value={filters.customStartDate || ''}
                      onChange={(e) => update({ customStartDate: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-0.5">To</label>
                    <input
                      type="date"
                      value={filters.customEndDate || ''}
                      onChange={(e) => update({ customEndDate: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
          <button
            type="button"
            data-testid="reset-call-filters-btn"
            onClick={onReset}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
          >
            Clear All
          </button>

          <button
            type="button"
            data-testid="apply-call-filters-btn"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center gap-1.5 transition-all"
          >
            Apply Filters ({filteredCallsCount} of {totalCallsCount})
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
