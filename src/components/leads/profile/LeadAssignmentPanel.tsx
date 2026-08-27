import { useState, useMemo, useRef, useEffect } from 'react';
import {
  UserPlus, ChevronDown, Search, X, Users, Clock, Check,
  RotateCcw, AlertCircle, Loader2, ChevronRight, Sparkles, User
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useLeadAssignment, AssignableUser } from '../../../hooks/useLeadAssignment';
import { Lead } from '../../../types/schema';
import { useAuth } from '../../../contexts/AuthContext';

const ROLE_ORDER = ['Admin', 'Manager', 'Team Leader', 'Counselor'];

const ROLE_COLORS: Record<string, { bg: string, text: string, border: string }> = {
  'Admin':       { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/30' },
  'Manager':     { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/30' },
  'Team Leader': { bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-500/30' },
  'Counselor':   { bg: 'bg-orange-500/10 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/30' },
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
    <div ref={ref} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-4 py-3',
          'border rounded-xl text-sm shadow-sm relative overflow-hidden group',
          open 
            ? 'bg-primary/5 border-primary/50 ring-2 ring-primary/20' 
            : 'bg-card border-border hover:border-primary/40 hover:bg-muted/30',
          'transition-all duration-200 ease-out'
        )}
      >
        {/* Subtle background glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
        
        {isLoading ? (
          <span className="flex items-center gap-2 text-muted-foreground z-10 relative">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading team members...
          </span>
        ) : selected ? (
          <span className="flex items-center gap-3 font-medium text-foreground z-10 relative w-full">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary flex items-center justify-center text-sm font-bold shrink-0 border border-primary/20 shadow-sm">
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card"></div>
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="truncate w-full text-left font-semibold">{selected.name}</span>
              <span className="text-[11px] text-muted-foreground truncate w-full text-left font-normal flex items-center gap-1.5">
                <span className={cn('px-1.5 rounded-sm font-medium', ROLE_COLORS[selected.role_name]?.text, ROLE_COLORS[selected.role_name]?.bg)}>
                  {selected.role_name}
                </span>
                <span>•</span>
                <span>{selected.active_lead_count} active leads</span>
              </span>
            </div>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-muted-foreground z-10 relative">
            <User className="w-4 h-4 opacity-70" /> {placeholder}
          </span>
        )}
        <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 z-10 relative">
          <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-300', open && 'rotate-180 text-primary')} />
        </div>
      </button>

      {open && (
        <div className="absolute z-[100] mt-2 w-full bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
          {/* Search */}
          <div className="p-3 border-b border-border/50 bg-muted/20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, email or department..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 shadow-inner transition-all"
              />
            </div>
          </div>

          {/* User List */}
          <div className="max-h-[280px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            {/* Unassign option */}
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-colors font-medium mb-1 group"
            >
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <X className="w-4 h-4" />
              </div>
              <span>Leave Unassigned</span>
            </button>

            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center flex flex-col items-center justify-center">
                <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-foreground">No team members found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { onChange(u.id); setOpen(false); setSearch(''); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all text-left rounded-xl group relative overflow-hidden',
                      value === u.id 
                        ? 'bg-primary/10 border-transparent shadow-sm' 
                        : 'hover:bg-muted border border-transparent'
                    )}
                  >
                    {value === u.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                    )}
                    
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-transform group-hover:scale-105 shadow-sm border",
                      value === u.id 
                        ? 'bg-primary text-primary-foreground border-primary/20' 
                        : 'bg-gradient-to-br from-muted to-background text-foreground border-border/80'
                    )}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-semibold truncate transition-colors",
                          value === u.id ? "text-primary" : "text-foreground group-hover:text-primary"
                        )}>
                          {u.name}
                        </span>
                        {value === u.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground truncate">{u.department || u.email}</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">
                          {u.active_lead_count} leads
                        </span>
                      </div>
                    </div>
                    
                    <span className={cn(
                      'text-[10px] px-2 py-1 rounded-md font-semibold shrink-0 border',
                      ROLE_COLORS[u.role_name]?.bg,
                      ROLE_COLORS[u.role_name]?.text,
                      ROLE_COLORS[u.role_name]?.border
                    )}>
                      {u.role_name}
                    </span>
                  </button>
                ))}
              </div>
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
  
  // Checking 'Edit Leads' because there is no explicit 'Assign' permission in the DB
  const canAssign = hasPermission('Edit Leads', 'Lead Management');

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

  const hasChanges = selectedUserId !== ((lead as any).assignedCounselor || '');

  return (
    <div className="relative bg-card/60 backdrop-blur-md border border-border/60 rounded-2xl p-6 shadow-lg overflow-visible">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-inner">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground tracking-tight">Team Assignment</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Route this lead to the right team member</p>
          </div>
        </div>
        
        {assignmentHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(h => !h)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-sm"
          >
            <Clock className="w-3.5 h-3.5" />
            History
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md ml-1">{assignmentHistory.length}</span>
            <ChevronRight className={cn('w-3.5 h-3.5 ml-0.5 transition-transform duration-300', showHistory && 'rotate-90')} />
          </button>
        )}
      </div>

      {/* Current Assignee Status - High Visibility */}
      {currentAssignee && !hasChanges && (
        <div className="mb-6 flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-transparent border border-emerald-500/20 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-lg font-bold border-2 border-emerald-200 dark:border-emerald-500/30 shadow-sm">
                {currentAssignee.name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-card flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-0.5">Currently Assigned To</p>
              <p className="text-base font-bold text-foreground">{currentAssignee.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span className={cn('px-1.5 py-0.5 rounded-md font-medium text-[10px]', ROLE_COLORS[currentAssignee.role_name]?.bg, ROLE_COLORS[currentAssignee.role_name]?.text)}>
                  {currentAssignee.role_name}
                </span>
                <span>•</span>
                <span>{currentAssignee.active_lead_count} active leads</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {canAssign && (
        <div className="space-y-5 relative z-20">
          {/* Role Filter Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Select Department</label>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500" /> Smart Filters</span>
            </div>
            
            <div className="flex flex-wrap gap-2 p-1 bg-muted/40 rounded-xl border border-border/50">
              {['All', ...ROLE_ORDER].map(role => {
                const count = role === 'All' ? allUsers.length : getUsersByRole(role).length;
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                      selectedRole === role
                        ? 'bg-background text-foreground shadow-sm border border-border'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50 border border-transparent'
                    )}
                  >
                    {role}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-md text-[10px]",
                      selectedRole === role ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* User Selection */}
          <div className="relative z-30">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">Assign To Team Member</label>
            <UserDropdown
              users={filteredUsers}
              value={selectedUserId}
              onChange={setSelectedUserId}
              placeholder="Search by name or department..."
              isLoading={isLoadingUsers}
            />
          </div>

          {/* Notes area (Ensured lower z-index context relative to dropdown) */}
          <div className="relative z-10 pt-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2 flex items-center justify-between">
              <span>Assignment Instructions</span>
              <span className="text-muted-foreground font-normal normal-case">Optional</span>
            </label>
            <div className="relative">
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add context, priorities, or specific instructions for the assignee..."
                rows={3}
                className="w-full px-4 py-3 text-sm bg-background/50 border border-border/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 resize-none transition-all placeholder:text-muted-foreground/60 shadow-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-border/50 relative z-10">
            <button
              onClick={handleAssign}
              disabled={isAssigning || (!hasChanges && !notes)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-sm',
                selectedUserId
                  ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-md hover:from-primary/90 hover:to-primary'
                  : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20',
                (isAssigning || (!hasChanges && !notes)) && 'opacity-50 cursor-not-allowed saturate-50'
              )}
            >
              {isAssigning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : selectedUserId ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
              {isAssigning 
                ? 'Processing...' 
                : !hasChanges && !notes 
                  ? 'Up to Date'
                  : selectedUserId 
                    ? 'Confirm Assignment' 
                    : 'Remove Assignment'}
            </button>
            
            {hasChanges && selectedUserId && (
              <button
                onClick={() => {
                  setSelectedUserId((lead as any).assignedCounselor || '');
                  setNotes('');
                }}
                title="Discard changes"
                className="px-4 py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border transition-all shadow-sm flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Assignment History (Collapsible) */}
      {showHistory && (
        <div className="mt-6 pt-6 border-t border-border/60 relative z-10">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Timeline History
          </h4>
          
          {isLoadingHistory ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : assignmentHistory.length === 0 ? (
            <div className="text-center py-8 bg-muted/20 rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground font-medium">No previous assignments</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {assignmentHistory.map((h, i) => (
                <div key={h.id} className="relative pl-6 pb-4 last:pb-0 group">
                  {/* Timeline line */}
                  {i !== assignmentHistory.length - 1 && (
                    <div className="absolute left-2.5 top-6 bottom-0 w-px bg-border group-hover:bg-primary/30 transition-colors" />
                  )}
                  
                  {/* Timeline dot */}
                  <div className={cn(
                    "absolute left-1 top-1.5 w-3 h-3 rounded-full border-2",
                    h.is_active 
                      ? "bg-primary border-background ring-2 ring-primary/20" 
                      : "bg-muted border-background"
                  )} />
                  
                  <div className={cn(
                    'p-4 rounded-xl border transition-all',
                    h.is_active
                      ? 'bg-primary/5 border-primary/20 shadow-sm'
                      : 'bg-card border-border/60 hover:border-border'
                  )}>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-sm text-foreground">{h.assignee_name || 'Unassigned'}</span>
                          {h.is_active && (
                            <span className="px-2 py-0.5 bg-primary text-primary-foreground rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm">
                              Current
                            </span>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span>Assigned by <strong>{h.assigned_by_name || 'System'}</strong></span>
                          <span>•</span>
                          <span>{new Date(h.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                        
                        {h.previous_assignee_name && (
                          <div className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Replaced {h.previous_assignee_name}
                          </div>
                        )}
                        
                        {h.notes && (
                          <div className="mt-3 p-3 bg-background/50 rounded-lg text-sm text-muted-foreground border border-border/50 italic flex gap-2">
                            <span className="text-primary opacity-50">"</span>
                            {h.notes}
                            <span className="text-primary opacity-50">"</span>
                          </div>
                        )}
                      </div>
                      
                      {h.assignment_type !== 'Manual' && (
                        <span className="shrink-0 px-2 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {h.assignment_type}
                        </span>
                      )}
                    </div>
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

