import React, { useState, useMemo } from 'react';
import { Call } from '../../types/telephony';
import {
  Phone, Clock, FileText, CheckCircle, XCircle, Sparkles, Play, Search,
  Filter, Tag, PhoneIncoming, PhoneOutgoing, User, AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CallDetailModal } from './CallDetailModal';
import { CallFilterBar } from './CallFilterBar';
import { CallAdvancedFilterDrawer } from './CallAdvancedFilterDrawer';
import {
  CallFilterState,
  INITIAL_CALL_FILTER_STATE,
  CounselorUser,
  DesignationOption
} from '../../types/callFilter';
import { matchCallFilters } from '../../lib/callFilterMatcher';
import { useAuth } from '../../contexts/AuthContext';
import { useTelephony } from '../../contexts/TelephonyContext';
import { format } from 'date-fns';

interface CallHistoryPanelProps {
  calls: Call[];
  isLoading?: boolean;
  counselors?: CounselorUser[];
  designations?: DesignationOption[];
  userMap?: Map<string, CounselorUser>;
  initialFilters?: Partial<CallFilterState>;
}

export function CallHistoryPanel({
  calls,
  isLoading = false,
  counselors = [],
  designations = [],
  userMap,
  initialFilters
}: CallHistoryPanelProps) {
  const { user } = useAuth();
  const { makeCall } = useTelephony();
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Active filter state
  const [filters, setFilters] = useState<CallFilterState>({
    ...INITIAL_CALL_FILTER_STATE,
    ...initialFilters
  });

  // Effective user map
  const effectiveUserMap = useMemo(() => {
    if (userMap) return userMap;
    const map = new Map<string, CounselorUser>();
    counselors.forEach(c => map.set(c.id, c));
    return map;
  }, [userMap, counselors]);

  // Filtered calls evaluation
  const filteredCalls = useMemo(() => {
    return calls.filter(call => matchCallFilters(call, filters, effectiveUserMap, user?.id));
  }, [calls, filters, effectiveUserMap, user?.id]);

  const handleResetFilters = () => {
    setFilters(INITIAL_CALL_FILTER_STATE);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'missed':
      case 'no-answer':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-orange-500" />;
      case 'in-progress':
        return <Phone className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'ringing':
        return <PhoneIncoming className="w-4 h-4 text-amber-500 animate-bounce" />;
      default:
        return <Phone className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    if (!sentiment) return null;
    const s = sentiment.toLowerCase();
    if (s === 'positive') {
      return (
        <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 text-[10px] px-2 py-0.5 rounded-full font-medium border border-emerald-200">
          Positive
        </span>
      );
    }
    if (s === 'negative') {
      return (
        <span className="bg-red-100 text-red-700 dark:bg-red-900/30 text-[10px] px-2 py-0.5 rounded-full font-medium border border-red-200">
          Negative
        </span>
      );
    }
    return (
      <span className="bg-gray-100 text-gray-700 dark:bg-gray-800 text-[10px] px-2 py-0.5 rounded-full font-medium border border-gray-200">
        Neutral
      </span>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* Top Filter Bar */}
      <div className="p-4 border-b border-border space-y-3 bg-muted/10">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" /> Call History & Activity
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            {filteredCalls.length} of {calls.length} calls
          </span>
        </div>

        {/* Reusable Interactive Filter Bar */}
        <CallFilterBar
          filters={filters}
          onFilterChange={setFilters}
          onReset={handleResetFilters}
          onOpenDrawer={() => setIsFilterDrawerOpen(true)}
          counselors={counselors}
          designations={designations}
          totalCount={calls.length}
          filteredCount={filteredCalls.length}
        />
      </div>

      {/* Call List Body */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-52 text-muted-foreground gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-xs">Loading call records...</p>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-52 text-muted-foreground p-6 text-center">
            <Phone className="w-10 h-10 mb-2 opacity-20" />
            <p className="font-semibold text-foreground text-sm">No calls match your criteria</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Try adjusting your search terms, counselor, designation, outcome, or clear your active filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredCalls.map((call) => {
              const counselorUser = call.counselorId ? effectiveUserMap.get(call.counselorId) : null;
              const displayCounselor = call.counselorName || counselorUser?.name || 'Assigned Counselor';
              const displayDesignation = counselorUser?.designationName;

              return (
                <div
                  key={call.id}
                  className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => setSelectedCall(call)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getStatusIcon(call.status)}</div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">
                            {call.leadName || 'Direct Contact'}
                          </span>

                          {/* Clickable Phone Number */}
                          {call.leadPhone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                makeCall({
                                  to: call.leadPhone!,
                                  leadId: call.leadId,
                                  leadName: call.leadName
                                });
                              }}
                              className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-mono hover:underline transition-colors"
                              title="Click to dial this number"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{call.leadPhone}</span>
                            </button>
                          )}

                          <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded uppercase tracking-wider font-medium">
                            {call.direction}
                          </span>

                          {getSentimentBadge(call.aiSentiment)}
                        </div>

                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(call.createdAt), 'MMM d, yyyy h:mm a')}
                          </span>
                          <span>•</span>
                          <span className="font-medium text-foreground">
                            {formatDuration(call.durationSeconds)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span>By {displayCounselor}</span>
                            {displayDesignation && (
                              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.2 rounded">
                                {displayDesignation}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {call.recordingUrl && (
                        <button
                          className="text-primary bg-primary/10 hover:bg-primary/20 p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="Play Recording"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCall(call);
                          }}
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Outcome and AI Summary preview */}
                  <div className="ml-7 grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5">
                    {call.outcome && (
                      <div className="text-xs">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">
                          Outcome
                        </span>
                        <span className="font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded inline-block">
                          {call.outcome}
                        </span>
                        {call.tags && call.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {call.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px] bg-primary/5 text-primary border border-primary/15 px-1.5 py-0.2 rounded"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(call.aiSummary || call.notes) && (
                      <div className="text-xs">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-0.5 flex items-center gap-1">
                          {call.aiSummary ? (
                            <>
                              <Sparkles className="w-3 h-3 text-purple-500" /> AI Summary
                            </>
                          ) : (
                            <>
                              <FileText className="w-3 h-3" /> Notes
                            </>
                          )}
                        </span>
                        <p className="text-muted-foreground line-clamp-2 text-xs">
                          {call.aiSummary || call.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Filter Slide-out Drawer */}
      <CallAdvancedFilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onFilterChange={setFilters}
        onReset={handleResetFilters}
        counselors={counselors}
        designations={designations}
        totalCallsCount={calls.length}
        filteredCallsCount={filteredCalls.length}
      />

      {/* Detail Modal */}
      {selectedCall && (
        <CallDetailModal call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}
