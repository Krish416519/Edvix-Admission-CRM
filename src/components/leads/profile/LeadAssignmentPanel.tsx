import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UserPlus, ChevronDown, Search, X, Users, Clock, Check,
  RotateCcw, AlertCircle, Loader2, ChevronRight
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useLeadAssignment, AssignableUser } from '../../../hooks/useLeadAssignment';
import { Lead } from '../../../types/schema';
import { useAuth } from '../../../contexts/AuthContext';

const ROLE_ORDER = ['Admin', 'Manager', 'Team Leader', 'Counselor'];

const ROLE_COLORS: Record<string, string> = {
  'Admin':       'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  'Manager':     'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'Team Leader': 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
  'Counselor':   'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
};

interface UserDropdownProps {
  users: AssignableUser[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  isLoading?: boolean;
}

function UserDropdown({ users, value, onChange, placeholder, isLoading }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = users.find(u => u.id === value);

  const filtered = useMemo(() =>
    users.filter(u =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(search.toLowerCase())
    ),
    [users, search]
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2.5',
          'border border-border rounded-lg bg-card text-sm',
          'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30',
          'transition-all duration-150'
        )}
      >
        {isLoading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </span>
        ) : selected ? (
          <span className="flex items-center gap-2 font-medium text-foreground">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {selected.name.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{selected.name}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0', ROLE_COLORS[selected.role_name])}>
              {selected.role_name}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or department..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* User List */}
          <div className="max-h-60 overflow-y-auto">
            {/* Unassign option */}
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Unassigned / None</span>
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No users found
              </div>
            ) : (
              filtered.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { onChange(u.id); setOpen(false); setSearch(''); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors text-left',
                    'hover:bg-muted',
                    value === u.id && 'bg-primary/5'
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{u.name}</span>
                      {value === u.id && <Check className="w-3 h-3 text-primary shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground truncate">{u.department || u.email}</span>
                      <span className="text-[10px] font-bold text-primary/80">
                        {u.active_lead_count} leads
                      </span>
                    </div>
                  </div>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0', ROLE_COLORS[u.role_name])}>
                    {u.role_name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface LeadAssignmentPanelProps {
  lead: Lead;
  onAssigned?: () => void;
}

export function LeadAssignmentPanel({ lead, onAssigned }: LeadAssignmentPanelProps) {
  const {
    allUsers, assignmentHistory, currentAssignee,
    isLoadingUsers, isLoadingHistory, isAssigning,
    assignLead, removeAssignment, getUsersByRole,
  } = useLeadAssignment(lead.id);
  const { hasPermission, user } = useAuth();
  
  const canAssign = hasPermission('Assign', 'Lead Management');

  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [selectedUserId, setSelectedUserId] = useState<string>(
    (lead as any).assignedCounselor || ''
  );
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Sync selected user when lead prop changes
  useEffect(() => {
    setSelectedUserId((lead as any).assignedCounselor || '');
  }, [lead.id, (lead as any).assignedCounselor]);

  const filteredUsers = useMemo(() => {
    if (selectedRole === 'All') return allUsers;
    return getUsersByRole(selectedRole);
  }, [allUsers, selectedRole, getUsersByRole]);

  const handleAssign = async () => {
    if (!selectedUserId) {
      // Remove assignment
      await removeAssignment(lead.id);
      onAssigned?.();
      return;
    }
    const res = await assignLead(lead.id, selectedUserId, notes || undefined);
    if (res.success) {
      setNotes('');
      onAssigned?.();
    }
  };

  const currentUser = allUsers.find(u => u.id === selectedUserId)
    || (selectedUserId ? { name: 'Loading...', role_name: '', active_lead_count: 0 } as any : null);

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Lead Assignment</h3>
        </div>
        {assignmentHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(h => !h)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            History ({assignmentHistory.length})
            <ChevronRight className={cn('w-3 h-3 transition-transform', showHistory && 'rotate-90')} />
          </button>
        )}
      </div>

      {/* Current Assignee Status */}
      {currentAssignee && (
        <div className="flex items-center gap-3 p-2.5 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-bold shrink-0">
            {currentAssignee.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-green-800 dark:text-green-300 truncate">{currentAssignee.name}</p>
            <p className="text-[10px] text-green-600 dark:text-green-500">{currentAssignee.role_name} · {currentAssignee.active_lead_count} active leads</p>
          </div>
          <span className="text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-500/20 px-1.5 py-0.5 rounded">Active</span>
        </div>
      )}

      {/* Role Filter Tabs */}
      {canAssign && (
        <>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assign To</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {['All', ...ROLE_ORDER].map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
                selectedRole === role
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {role}
              {role !== 'All' && (
                <span className="ml-1 opacity-70">({getUsersByRole(role).length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Searchable User Dropdown */}
        <UserDropdown
          users={filteredUsers}
          value={selectedUserId}
          onChange={setSelectedUserId}
          placeholder="Select user to assign..."
          isLoading={isLoadingUsers}
        />
      </div>

      {/* Selected user preview */}
      {currentUser && selectedUserId && (
        <div className="flex items-center gap-3 p-2.5 bg-muted/40 border border-border rounded-lg">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{currentUser.name}</p>
            <p className="text-[10px] text-muted-foreground">{currentUser.role_name} · {currentUser.active_lead_count} active leads</p>
          </div>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold', ROLE_COLORS[currentUser.role_name] || 'bg-muted text-muted-foreground')}>
            {currentUser.role_name}
          </span>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Assignment Note <span className="font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="e.g. Prioritize callback within 24 hours..."
          rows={2}
          className="mt-1.5 w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleAssign}
          disabled={isAssigning}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
            selectedUserId
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
              : 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-200 dark:border-red-500/30',
            isAssigning && 'opacity-60 cursor-not-allowed'
          )}
        >
          {isAssigning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : selectedUserId ? (
            <UserPlus className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          {isAssigning ? 'Assigning...' : selectedUserId ? 'Save Assignment' : 'Remove Assignment'}
        </button>
        {selectedUserId && (
          <button
            onClick={() => setSelectedUserId('')}
            title="Clear selection"
            className="px-3 py-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
      </>
      )}

      {/* Assignment History */}
      {showHistory && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Assignment History</p>
          {isLoadingHistory ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : assignmentHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No assignment history yet</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {assignmentHistory.map((h, i) => (
                <div
                  key={h.id}
                  className={cn(
                    'flex gap-3 p-2.5 rounded-lg border text-xs',
                    h.is_active
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-muted/30 border-border'
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    {h.is_active
                      ? <Check className="w-3.5 h-3.5 text-primary" />
                      : <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-semibold text-foreground">{h.assignee_name || 'Unknown'}</span>
                      {h.is_active && (
                        <span className="px-1 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">Current</span>
                      )}
                    </div>
                    {h.previous_assignee_name && (
                      <span className="text-muted-foreground">
                        Previously: {h.previous_assignee_name}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <span>by {h.assigned_by_name || 'System'}</span>
                      <span>·</span>
                      <span>{new Date(h.assigned_at).toLocaleDateString()}</span>
                      {h.assignment_type !== 'Manual' && (
                        <><span>·</span><span className="italic">{h.assignment_type}</span></>
                      )}
                    </div>
                    {h.notes && (
                      <p className="mt-1 text-muted-foreground italic">"{h.notes}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
