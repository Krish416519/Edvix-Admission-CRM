import React, { useEffect, useState } from 'react';
import { 
  X, Filter, RotateCcw, Calendar, Check, AlertCircle, 
  Phone, MessageCircle, Mail, Video, Bell, Clock, 
  User, CheckCircle2, ArrowUpDown, ChevronRight, FileText
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority, TaskType } from '../../../types/task';
import { cn } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

export interface TaskFilterState {
  status: TaskStatus | 'All';
  priority: TaskPriority | 'All';
  type: TaskType | 'All';
  datePreset: 'all' | 'today' | 'overdue' | 'tomorrow' | 'this_week' | 'next_7_days' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  assignedUser: string; // 'All' | 'me' | userId
  leadFilter: 'all' | 'with_lead' | 'without_lead';
  sortBy: 'due_asc' | 'due_desc' | 'priority_desc' | 'created_desc';
}

export const INITIAL_TASK_FILTERS: TaskFilterState = {
  status: 'All',
  priority: 'All',
  type: 'All',
  datePreset: 'all',
  customStartDate: '',
  customEndDate: '',
  assignedUser: 'All',
  leadFilter: 'all',
  sortBy: 'due_asc',
};

interface TaskFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: TaskFilterState;
  onApplyFilters: (filters: TaskFilterState) => void;
  onResetFilters: () => void;
  tasksCount: number;
}

export function TaskFilterDrawer({
  isOpen,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  tasksCount,
}: TaskFilterDrawerProps) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<TaskFilterState>(filters);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);

  // Sync draft with current filters when drawer opens
  useEffect(() => {
    if (isOpen) {
      setDraft(filters);
    }
  }, [isOpen, filters]);

  // Prevent background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Fetch active team members / counselors
  useEffect(() => {
    if (!isOpen) return;
    async function loadTeam() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
        if (!error && data) {
          setTeamMembers(data);
        }
      } catch (err) {
        console.warn('Could not fetch team members for filter:', err);
      }
    }
    loadTeam();
  }, [isOpen]);

  if (!isOpen) return null;

  const statuses: (TaskStatus | 'All')[] = ['All', 'Pending', 'In Progress', 'Completed', 'Cancelled'];
  const priorities: (TaskPriority | 'All')[] = ['All', 'Urgent', 'High', 'Medium', 'Low'];
  const taskTypes: (TaskType | 'All')[] = [
    'All', 'Call', 'WhatsApp', 'Email', 'Meeting', 
    'Reminder', 'Document Collection', 'Fee Reminder', 
    'Admission Follow-up', 'Custom Task'
  ];

  const datePresets: { id: TaskFilterState['datePreset']; label: string }[] = [
    { id: 'all', label: 'All Dates' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'today', label: 'Due Today' },
    { id: 'tomorrow', label: 'Due Tomorrow' },
    { id: 'this_week', label: 'This Week' },
    { id: 'next_7_days', label: 'Next 7 Days' },
    { id: 'custom', label: 'Custom Range' },
  ];

  const activeCount = [
    draft.status !== 'All',
    draft.priority !== 'All',
    draft.type !== 'All',
    draft.datePreset !== 'all',
    draft.assignedUser !== 'All',
    draft.leadFilter !== 'all',
    draft.sortBy !== 'due_asc',
  ].filter(Boolean).length;

  const handleApply = () => {
    onApplyFilters(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft(INITIAL_TASK_FILTERS);
    onResetFilters();
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className="relative z-10 w-full max-w-md bg-card border-l border-border shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Filter Tasks"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                Filter Tasks
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                    {activeCount} active
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">Refine by priority, status, date, or counselor</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                title="Reset all filters"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Filter Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 divide-y divide-border/60">
          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Quick Shortcuts
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDraft(prev => ({ ...prev, datePreset: 'overdue', status: 'All' }))}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  draft.datePreset === 'overdue'
                    ? "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400 font-semibold"
                    : "bg-background border-border text-foreground hover:bg-muted"
                )}
              >
                🚨 Overdue
              </button>
              <button
                type="button"
                onClick={() => setDraft(prev => ({ ...prev, datePreset: 'today', status: 'Pending' }))}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  draft.datePreset === 'today' && draft.status === 'Pending'
                    ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400 font-semibold"
                    : "bg-background border-border text-foreground hover:bg-muted"
                )}
              >
                📅 Due Today
              </button>
              <button
                type="button"
                onClick={() => setDraft(prev => ({ ...prev, priority: 'High' }))}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  draft.priority === 'High'
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold"
                    : "bg-background border-border text-foreground hover:bg-muted"
                )}
              >
                ⚡ High Priority
              </button>
              <button
                type="button"
                onClick={() => setDraft(prev => ({ ...prev, assignedUser: 'me' }))}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  draft.assignedUser === 'me'
                    ? "bg-primary/10 border-primary/40 text-primary font-semibold"
                    : "bg-background border-border text-foreground hover:bg-muted"
                )}
              >
                👤 My Tasks
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="pt-5 space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Task Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {statuses.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft(prev => ({ ...prev, status: s }))}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                    draft.status === s
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="pt-5 space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {priorities.map(p => {
                const isSelected = draft.priority === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDraft(prev => ({ ...prev, priority: p }))}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {p === 'Urgent' && <span className="w-2 h-2 rounded-full bg-red-500" />}
                    {p === 'High' && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                    {p === 'Medium' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                    {p === 'Low' && <span className="w-2 h-2 rounded-full bg-green-500" />}
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date Presets & Custom Range */}
          <div className="pt-5 space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Due Date
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {datePresets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDraft(prev => ({ ...prev, datePreset: preset.id }))}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                    draft.datePreset === preset.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {draft.datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2 p-3 bg-muted/20 border border-border rounded-lg animate-in fade-in duration-200">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">From Date</label>
                  <input
                    type="date"
                    value={draft.customStartDate || ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, customStartDate: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">To Date</label>
                  <input
                    type="date"
                    value={draft.customEndDate || ''}
                    onChange={(e) => setDraft(prev => ({ ...prev, customEndDate: e.target.value }))}
                    className="w-full px-2.5 py-1.5 bg-background border border-border rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Task Type */}
          <div className="pt-5 space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Task Type
            </label>
            <select
              value={draft.type}
              onChange={(e) => setDraft(prev => ({ ...prev, type: e.target.value as TaskType | 'All' }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              {taskTypes.map(t => (
                <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>
              ))}
            </select>
          </div>

          {/* Assigned Counselor / User */}
          <div className="pt-5 space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Assigned Counselor
            </label>
            <select
              value={draft.assignedUser}
              onChange={(e) => setDraft(prev => ({ ...prev, assignedUser: e.target.value }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="All">All Team Members</option>
              <option value="me">Assigned to Me</option>
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>

          {/* Related Lead Filter */}
          <div className="pt-5 space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Lead Association
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All Tasks' },
                { id: 'with_lead', label: 'Has Lead' },
                { id: 'without_lead', label: 'No Lead' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDraft(prev => ({ ...prev, leadFilter: opt.id as any }))}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium border transition-all text-center",
                    draft.leadFilter === opt.id
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Order */}
          <div className="pt-5 space-y-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort Order
            </label>
            <select
              value={draft.sortBy}
              onChange={(e) => setDraft(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="due_asc">Due Date: Earliest first (Urgent first)</option>
              <option value="due_desc">Due Date: Furthest out first</option>
              <option value="priority_desc">Priority: Urgent &gt; High &gt; Medium &gt; Low</option>
              <option value="created_desc">Recently Created first</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
