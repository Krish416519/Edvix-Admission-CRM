import React from 'react';
import {
  Search, Filter, X, Users, Phone, PhoneIncoming, PhoneOutgoing,
  Sparkles, CheckCircle2, ChevronDown, RotateCcw, Tag, Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  CallFilterState,
  CallSearchField,
  CounselorUser,
  DesignationOption,
  countActiveCallFilters
} from '../../types/callFilter';

import { SearchScopeSelect } from './SearchScopeSelect';
import { CounselorSelect } from './CounselorSelect';
import { DesignationSelect } from './DesignationSelect';

interface CallFilterBarProps {
  filters: CallFilterState;
  onFilterChange: (filters: CallFilterState) => void;
  onReset: () => void;
  onOpenDrawer: () => void;
  counselors: CounselorUser[];
  designations: DesignationOption[];
  totalCount: number;
  filteredCount: number;
}

export const CallFilterBar: React.FC<CallFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  onOpenDrawer,
  counselors,
  designations,
  totalCount,
  filteredCount
}) => {
  const activeCount = countActiveCallFilters(filters);

  const update = (partial: Partial<CallFilterState>) => {
    onFilterChange({ ...filters, ...partial });
  };

  const removeStatus = (st: string) => {
    update({ statuses: filters.statuses.filter(s => s !== st) });
  };

  const removeOutcome = (oc: string) => {
    update({ outcomes: filters.outcomes.filter(o => o !== oc) });
  };

  // Find labels for active chips
  const activeCounselor = counselors.find(c => c.id === filters.counselorId);
  const activeDesignation = designations.find(d => d.id === filters.designationId);

  return (
    <div className="space-y-3">
      {/* Main Filter Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-sm">
        {/* Left: Search with Scope Selector */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {/* Custom Search Scope Dropdown */}
          <SearchScopeSelect
            value={filters.searchField}
            onChange={(scope) => update({ searchField: scope })}
          />

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={
                filters.searchField === 'phone'
                  ? 'Search by phone number...'
                  : filters.searchField === 'lead'
                  ? 'Search by student name...'
                  : filters.searchField === 'counselor'
                  ? 'Search by counselor...'
                  : 'Search by number, person, counselor, or notes...'
              }
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              className="w-full bg-muted/40 border border-border rounded-lg pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => update({ search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Center & Right: Custom 10x Dropdowns & Advanced Filter Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Counselor Combobox */}
          <CounselorSelect
            value={filters.counselorId}
            onChange={(id) => update({ counselorId: id })}
            counselors={counselors}
          />

          {/* Custom Designation Combobox */}
          <DesignationSelect
            value={filters.designationId}
            onChange={(id) => update({ designationId: id })}
            designations={designations}
          />

          {/* Direction Quick Filter */}
          <div className="flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            <button
              type="button"
              onClick={() => update({ direction: 'all' })}
              className={cn(
                "px-2 py-1 rounded-md transition-all font-medium",
                filters.direction === 'all'
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => update({ direction: 'outbound' })}
              className={cn(
                "px-2 py-1 rounded-md transition-all font-medium flex items-center gap-1",
                filters.direction === 'outbound'
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Outbound Calls"
            >
              <PhoneOutgoing className="w-3 h-3 text-emerald-500" /> Out
            </button>
            <button
              type="button"
              onClick={() => update({ direction: 'inbound' })}
              className={cn(
                "px-2 py-1 rounded-md transition-all font-medium flex items-center gap-1",
                filters.direction === 'inbound'
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Inbound Calls"
            >
              <PhoneIncoming className="w-3 h-3 text-blue-500" /> In
            </button>
          </div>

          {/* Advanced Filters Button with Active Count Badge */}
          <button
            type="button"
            data-testid="open-call-filter-drawer"
            onClick={onOpenDrawer}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-xs",
              activeCount > 0
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-card hover:bg-muted text-foreground"
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Active Filter Chips Bar (Shown when any filter is active) */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground font-medium text-[11px] mr-1">Active Filters:</span>

          {/* Search Chip */}
          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-foreground border border-border font-medium">
              <Search className="w-3 h-3 text-muted-foreground" />
              <span>
                {filters.searchField === 'phone'
                  ? `Phone: ${filters.search}`
                  : filters.searchField === 'lead'
                  ? `Person: ${filters.search}`
                  : filters.searchField === 'counselor'
                  ? `Counselor: ${filters.search}`
                  : `"${filters.search}"`}
              </span>
              <button
                type="button"
                onClick={() => update({ search: '' })}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Counselor Chip */}
          {filters.counselorId !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-foreground border border-border font-medium">
              <Users className="w-3 h-3 text-primary" />
              <span>
                Counselor: {filters.counselorId === 'me' ? 'My Calls' : activeCounselor?.name || 'Selected'}
              </span>
              <button
                type="button"
                onClick={() => update({ counselorId: 'all' })}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Designation Chip */}
          {filters.designationId !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-foreground border border-border font-medium">
              <span>Designation: {activeDesignation?.name || 'Selected'}</span>
              <button
                type="button"
                onClick={() => update({ designationId: 'all' })}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Direction Chip */}
          {filters.direction !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-foreground border border-border font-medium uppercase text-[11px]">
              <span>Direction: {filters.direction}</span>
              <button
                type="button"
                onClick={() => update({ direction: 'all' })}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Status Chips */}
          {filters.statuses.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium capitalize"
            >
              <span>{st}</span>
              <button
                type="button"
                onClick={() => removeStatus(st)}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Outcome Chips */}
          {filters.outcomes.map((oc) => (
            <span
              key={oc}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-medium"
            >
              <Tag className="w-3 h-3" />
              <span>{oc}</span>
              <button
                type="button"
                onClick={() => removeOutcome(oc)}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Sentiment Chip */}
          {filters.sentiment !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-foreground border border-border font-medium capitalize">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Sentiment: {filters.sentiment}</span>
              <button
                type="button"
                onClick={() => update({ sentiment: 'all' })}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Duration Chip */}
          {filters.durationPreset !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-foreground border border-border font-medium">
              <Clock className="w-3 h-3 text-purple-500" />
              <span>
                Duration:{' '}
                {filters.durationPreset === 'under_1m'
                  ? '< 1m'
                  : filters.durationPreset === '1_to_5m'
                  ? '1-5m'
                  : filters.durationPreset === '5_to_15m'
                  ? '5-15m'
                  : '> 15m'}
              </span>
              <button
                type="button"
                onClick={() => update({ durationPreset: 'all' })}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Intelligence Flag Chips */}
          {filters.hasAiSummary && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-foreground border border-border font-medium">
              <span>With AI Summary</span>
              <button
                type="button"
                onClick={() => update({ hasAiSummary: undefined })}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.hasRecording && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-foreground border border-border font-medium">
              <span>With Audio Recording</span>
              <button
                type="button"
                onClick={() => update({ hasRecording: undefined })}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {/* Result count & Clear all */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold">
              Showing {filteredCount} of {totalCount} calls
            </span>
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
