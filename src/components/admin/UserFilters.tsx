import React, { useState, useMemo } from 'react';
import { 
  Filter, X, Search, RotateCcw, Building2, Briefcase, 
  Users2, UserCheck, Shield, KeyRound, ChevronDown, Check, Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { UserWithOrgDetails, Department, Designation, Team, AccessProfile } from '../../lib/orgApi';

export interface UserFilterState {
  department: string;
  designation: string;
  team: string;
  manager: string;
  role: string;
  scope: string;
  status: string;
}

export const INITIAL_USER_FILTERS: UserFilterState = {
  department: 'ALL',
  designation: 'ALL',
  team: 'ALL',
  manager: 'ALL',
  role: 'ALL',
  scope: 'ALL',
  status: 'ALL',
};

interface UserFiltersProps {
  filters: UserFilterState;
  onFilterChange: (filters: UserFilterState) => void;
  onReset: () => void;
  search: string;
  onSearchChange: (search: string) => void;
  users: UserWithOrgDetails[];
  departments: Department[];
  designations: Designation[];
  teams: Team[];
  accessProfiles: AccessProfile[];
  filteredCount: number;
  totalCount: number;
}

export function UserFilters({
  filters,
  onFilterChange,
  onReset,
  search,
  onSearchChange,
  users,
  departments,
  designations,
  teams,
  accessProfiles,
  filteredCount,
  totalCount,
}: UserFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Compute live department counts
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: users.length };
    let unassigned = 0;

    users.forEach((u) => {
      const deptId = u.department?.id || u.department_id;
      if (deptId) {
        counts[deptId] = (counts[deptId] || 0) + 1;
      } else {
        unassigned++;
      }
    });

    if (unassigned > 0) {
      counts['UNASSIGNED'] = unassigned;
    }

    return counts;
  }, [users]);

  // Compute unique managers present in current user base
  const availableManagers = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => {
      if (u.manager?.id && u.manager?.name) {
        map.set(u.manager.id, u.manager.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [users]);

  // Compute filtered designations based on selected department
  const filteredDesignations = useMemo(() => {
    if (filters.department === 'ALL' || filters.department === 'UNASSIGNED') {
      return designations;
    }
    return designations.filter((d) => d.department_id === filters.department);
  }, [designations, filters.department]);

  // Count how many non-default filters are active
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.department !== 'ALL') count++;
    if (filters.designation !== 'ALL') count++;
    if (filters.team !== 'ALL') count++;
    if (filters.manager !== 'ALL') count++;
    if (filters.role !== 'ALL') count++;
    if (filters.scope !== 'ALL') count++;
    if (filters.status !== 'ALL') count++;
    return count;
  }, [filters]);

  const updateFilter = (key: keyof UserFilterState, value: string) => {
    const updated = { ...filters, [key]: value };
    // If department changed, reset designation if it doesn't belong
    if (key === 'department' && value !== 'ALL') {
      const valid = designations.some((d) => d.id === updated.designation && d.department_id === value);
      if (!valid) updated.designation = 'ALL';
    }
    onFilterChange(updated);
  };

  // Helper to remove individual filter pill
  const removeFilter = (key: keyof UserFilterState) => {
    updateFilter(key, 'ALL');
  };

  // Resolve human-readable labels for active tags
  const getFilterLabel = (key: keyof UserFilterState, value: string): string => {
    if (key === 'department') {
      if (value === 'UNASSIGNED') return 'Department: Unassigned';
      const dept = departments.find((d) => d.id === value);
      return `Department: ${dept?.name || value}`;
    }
    if (key === 'designation') {
      const desig = designations.find((d) => d.id === value);
      return `Designation: ${desig?.name || value}`;
    }
    if (key === 'team') {
      if (value === 'NONE') return 'Team: None';
      const t = teams.find((item) => item.id === value);
      return `Team: ${t?.name || value}`;
    }
    if (key === 'manager') {
      const m = availableManagers.find((item) => item.id === value);
      return `Manager: ${m?.name || value}`;
    }
    if (key === 'role') {
      const p = accessProfiles.find((item) => item.id === value);
      return `Profile: ${p?.name || value}`;
    }
    if (key === 'scope') {
      return `Scope: ${value}`;
    }
    if (key === 'status') {
      return `Status: ${value === 'ACTIVE' ? 'Active' : 'Locked'}`;
    }
    return `${key}: ${value}`;
  };

  return (
    <div className="space-y-3">
      {/* 1. Department Quick-Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 px-0.5 hide-scrollbar touch-pan-x -mx-1 px-1 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => updateFilter('department', 'ALL')}
          className={cn(
            "shrink-0 flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation border min-h-[36px]",
            filters.department === 'ALL'
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/70 border-border"
          )}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>All Staff</span>
          <span className={cn(
            "ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold",
            filters.department === 'ALL' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
          )}>
            {departmentCounts['ALL'] || 0}
          </span>
        </button>

        {departments.map((dept) => {
          const count = departmentCounts[dept.id] || 0;
          const isSelected = filters.department === dept.id;
          return (
            <button
              key={dept.id}
              type="button"
              onClick={() => updateFilter('department', dept.id)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation border min-h-[36px]",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/70 border-border"
              )}
            >
              <span>{dept.name}</span>
              <span className={cn(
                "ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}

        {departmentCounts['UNASSIGNED'] > 0 && (
          <button
            type="button"
            onClick={() => updateFilter('department', 'UNASSIGNED')}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-all touch-manipulation border min-h-[36px]",
              filters.department === 'UNASSIGNED'
                ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                : "bg-card text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border-border"
            )}
          >
            <span>Unassigned</span>
            <span className={cn(
              "ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold",
              filters.department === 'UNASSIGNED' ? "bg-white/20 text-white" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
            )}>
              {departmentCounts['UNASSIGNED']}
            </span>
          </button>
        )}
      </div>

      {/* 2. Main Search & Filter Toggle Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search staff by name, role, dept..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 sm:py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary transition-colors text-foreground min-h-[40px] sm:min-h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 sm:px-3 py-2 rounded-xl text-xs font-semibold transition-all border touch-manipulation shrink-0 min-h-[40px] sm:min-h-[38px]",
              isExpanded || activeFilterCount > 0
                ? "bg-primary/10 text-primary border-primary/40 font-bold"
                : "bg-card text-muted-foreground hover:text-foreground border-border hover:bg-muted/70"
            )}
            aria-expanded={isExpanded}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isExpanded && "rotate-180")} />
          </button>
        </div>

        {/* Live Result Count Status */}
        <div className="text-xs text-muted-foreground flex items-center justify-between sm:justify-start gap-1.5 px-1 sm:px-0">
          <span>
            Showing <strong className="text-foreground">{filteredCount}</strong> of <strong className="text-foreground">{totalCount}</strong> staff
          </span>
          {(activeFilterCount > 0 || search) && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              Filtered
            </span>
          )}
        </div>
      </div>

      {/* 3. Expandable Advanced Filter Matrix Panel */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4 bg-muted/20 border border-border/80 rounded-2xl animate-in slide-in-from-top-2 duration-200 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Advanced Staff Filters</h4>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors py-1 px-2 rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset all</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Department */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Department</label>
              <select
                value={filters.department}
                onChange={(e) => updateFilter('department', e.target.value)}
                className="w-full px-3 py-2 sm:py-1.5 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground min-h-[42px] sm:min-h-0"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
                <option value="UNASSIGNED">Unassigned</option>
              </select>
            </div>

            {/* Designation */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Designation</label>
              <select
                value={filters.designation}
                onChange={(e) => updateFilter('designation', e.target.value)}
                className="w-full px-3 py-2 sm:py-1.5 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground min-h-[42px] sm:min-h-0"
              >
                <option value="ALL">All Designations</option>
                {filteredDesignations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} (L{d.level})</option>
                ))}
              </select>
            </div>

            {/* Team */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Operational Team</label>
              <select
                value={filters.team}
                onChange={(e) => updateFilter('team', e.target.value)}
                className="w-full px-3 py-2 sm:py-1.5 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground min-h-[42px] sm:min-h-0"
              >
                <option value="ALL">All Teams</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                <option value="NONE">No Team (None)</option>
              </select>
            </div>

            {/* Reports To / Manager */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Reports To (Manager)</label>
              <select
                value={filters.manager}
                onChange={(e) => updateFilter('manager', e.target.value)}
                className="w-full px-3 py-2 sm:py-1.5 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground min-h-[42px] sm:min-h-0"
              >
                <option value="ALL">All Managers</option>
                {availableManagers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* Access Profile / Role */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Access Profile</label>
              <select
                value={filters.role}
                onChange={(e) => updateFilter('role', e.target.value)}
                className="w-full px-3 py-2 sm:py-1.5 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground min-h-[42px] sm:min-h-0"
              >
                <option value="ALL">All Profiles</option>
                {accessProfiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Data Scope */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Data Scope</label>
              <select
                value={filters.scope}
                onChange={(e) => updateFilter('scope', e.target.value)}
                className="w-full px-3 py-2 sm:py-1.5 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground min-h-[42px] sm:min-h-0"
              >
                <option value="ALL">All Scopes</option>
                <option value="ORGANIZATION">Organization (All Data)</option>
                <option value="DEPARTMENT">Department Only</option>
                <option value="TEAM">Team Only</option>
                <option value="ASSIGNED">Assigned Only</option>
                <option value="OWN">Own Only</option>
              </select>
            </div>

            {/* Account Status */}
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Account Status</label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 sm:py-1.5 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary text-foreground min-h-[42px] sm:min-h-0"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Users</option>
                <option value="INACTIVE">Locked / Inactive Users</option>
              </select>
            </div>
          </div>

          {/* Mobile Action Bar inside Filter Drawer */}
          <div className="flex items-center gap-2 pt-3 border-t border-border/60 sm:hidden">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="flex-1 py-2.5 px-3 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors min-h-[42px] touch-manipulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex-1 py-2.5 px-3 bg-primary text-primary-foreground text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all min-h-[42px] touch-manipulation"
            >
              <Check className="w-4 h-4" />
              <span>Show Results ({filteredCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Active Filter Tags Strip */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-muted-foreground font-semibold mr-1">Active:</span>
          {(Object.keys(filters) as Array<keyof UserFilterState>).map((key) => {
            const val = filters[key];
            if (val === 'ALL') return null;
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-semibold min-h-[30px]"
              >
                <span>{getFilterLabel(key, val)}</span>
                <button
                  type="button"
                  onClick={() => removeFilter(key)}
                  className="p-1 hover:bg-primary/20 rounded-full transition-colors min-w-[22px] min-h-[22px] flex items-center justify-center touch-manipulation"
                  aria-label={`Remove filter ${key}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold underline ml-1 cursor-pointer py-1.5 px-1 touch-manipulation"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
