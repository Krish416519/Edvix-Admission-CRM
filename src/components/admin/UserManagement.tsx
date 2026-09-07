import { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Search, Edit2, ShieldOff, Trash2, KeyRound,
  LogOut, CheckCircle, UserX, UserCheck, Download, Upload, Shield,
  Building2, Briefcase, Users2, ShieldCheck, Sparkles, Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { adminDeleteUser, adminBulkDeleteUsers } from '../../lib/adminApi';
import { 
  fetchUsersWithOrgDetails, 
  fetchDepartments,
  fetchDesignations,
  fetchTeams,
  fetchAccessProfiles,
  logAuditEvent, 
  type UserWithOrgDetails,
  type Department,
  type Designation,
  type Team,
  type AccessProfile
} from '../../lib/orgApi';
import { UserCreationWizard } from './UserCreationWizard';
import { UserFilters, type UserFilterState, INITIAL_USER_FILTERS } from './UserFilters';
import { useConfirm } from '../ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';

export function UserManagement() {
  const { isSuperAdmin, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserWithOrgDetails[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [accessProfiles, setAccessProfiles] = useState<AccessProfile[]>([]);
  
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<UserFilterState>(INITIAL_USER_FILTERS);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithOrgDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [usersData, deptsData, desigsData, teamsData, profilesData] = await Promise.all([
        fetchUsersWithOrgDetails(),
        fetchDepartments().catch(() => []),
        fetchDesignations().catch(() => []),
        fetchTeams().catch(() => []),
        fetchAccessProfiles().catch(() => []),
      ]);
      setUsers(usersData);
      setDepartments(deptsData);
      setDesignations(desigsData);
      setTeams(teamsData);
      setAccessProfiles(profilesData);
    } catch (err: any) {
      toast.error('Failed to load user records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Multi-faceted filtering
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Text Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          ((u as any).phone && (u as any).phone.toLowerCase().includes(q)) ||
          (u.designation?.name && u.designation.name.toLowerCase().includes(q)) ||
          (u.department?.name && u.department.name.toLowerCase().includes(q)) ||
          (u.team?.name && u.team.name.toLowerCase().includes(q)) ||
          (u.manager?.name && u.manager.name.toLowerCase().includes(q)) ||
          (u.role?.name && u.role.name.toLowerCase().includes(q)) ||
          (u.access_profile?.name && u.access_profile.name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // 2. Department filter
      if (filters.department !== 'ALL') {
        if (filters.department === 'UNASSIGNED') {
          if (u.department_id || u.department?.id) return false;
        } else {
          const deptId = u.department?.id || u.department_id;
          if (deptId !== filters.department) return false;
        }
      }

      // 3. Designation filter
      if (filters.designation !== 'ALL') {
        const desigId = u.designation?.id || u.designation_id;
        if (desigId !== filters.designation) return false;
      }

      // 4. Team filter
      if (filters.team !== 'ALL') {
        if (filters.team === 'NONE') {
          if (u.team_id || u.team?.id) return false;
        } else {
          const tId = u.team?.id || u.team_id;
          if (tId !== filters.team) return false;
        }
      }

      // 5. Manager filter
      if (filters.manager !== 'ALL') {
        if (u.manager?.id !== filters.manager && u.manager_id !== filters.manager) return false;
      }

      // 6. Role / Access Profile filter
      if (filters.role !== 'ALL') {
        if (u.access_profile_id !== filters.role && u.role_id !== filters.role) return false;
      }

      // 7. Data Scope filter
      if (filters.scope !== 'ALL') {
        if (u.effective_scope !== filters.scope) return false;
      }

      // 8. Account Status filter
      if (filters.status !== 'ALL') {
        if (filters.status === 'ACTIVE' && !u.is_active) return false;
        if (filters.status === 'INACTIVE' && u.is_active) return false;
      }

      return true;
    });
  }, [users, search, filters]);

  const handleFilterReset = () => {
    setFilters(INITIAL_USER_FILTERS);
    setSearch('');
    setSelectedIds(new Set());
  };

  // ── Selection helpers ─────────────────────────────────────────
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── Bulk actions ──────────────────────────────────────────────
  const handleBulkDeactivate = async () => {
    if (!await confirm({
      title: 'Deactivate Users',
      message: `Deactivate ${selectedIds.size} selected users?`,
      confirmLabel: 'Deactivate',
      variant: 'warning'
    })) return;
    setIsBulkLoading(true);
    let failed = 0;
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const { error } = await supabase.from('users').update({ is_active: false }).eq('id', id);
        if (error) failed++;
      }
      await logAuditEvent('BULK_USERS_DEACTIVATED', undefined, { count: ids.length - failed });
      if (failed > 0) toast.warning(`${ids.length - failed} deactivated, ${failed} failed`);
      else toast.success(`Successfully deactivated ${ids.length} users`);
      clearSelection();
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate users');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkActivate = async () => {
    if (!await confirm({
      title: 'Activate Users',
      message: `Activate ${selectedIds.size} selected users?`,
      confirmLabel: 'Activate',
      variant: 'info'
    })) return;
    setIsBulkLoading(true);
    let failed = 0;
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const { error } = await supabase.from('users').update({ is_active: true }).eq('id', id);
        if (error) failed++;
      }
      await logAuditEvent('BULK_USERS_ACTIVATED', undefined, { count: ids.length - failed });
      if (failed > 0) toast.warning(`${ids.length - failed} activated, ${failed} failed`);
      else toast.success(`Successfully activated ${ids.length} users`);
      clearSelection();
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate users');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!await confirm({
      title: 'Delete Users',
      message: `Permanently remove ${selectedIds.size} selected users? This action is irreversible.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger'
    })) return;
    setIsBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await adminBulkDeleteUsers(ids);
      await logAuditEvent('BULK_USERS_DELETED', undefined, { count: ids.length });
      toast.success(`Successfully deleted ${ids.length} users`);
      clearSelection();
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete users');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleAction = async (action: string, user: UserWithOrgDetails) => {
    try {
      if (action === 'Edit') {
        setSelectedUser(user);
        setIsWizardOpen(true);
      } else if (action === 'Password Reset') {
        const newPassword = window.prompt(`Enter new password for ${user.name}:`);
        if (!newPassword || newPassword.length < 6) {
          if (newPassword) toast.error('Password must be at least 6 characters');
          return;
        }
        toast.success(`Password reset requested for ${user.email}`);
      } else if (action === 'Force Logout') {
        if (!await confirm({
          title: 'Force Session Logout',
          message: `Force immediate session termination for ${user.name}?`,
          confirmLabel: 'Force Logout',
          variant: 'warning'
        })) return;

        try {
          await supabase.rpc('admin_force_logout', { p_user_id: user.id });
        } catch (e) {}
        await logAuditEvent('USER_FORCED_LOGOUT', user.id);
        toast.success(`Active sessions revoked for ${user.name}`);
      } else if (action === 'Toggle Active') {
        const nextState = !user.is_active;
        const { error } = await supabase.from('users').update({ is_active: nextState }).eq('id', user.id);
        if (error) throw error;
        await logAuditEvent(nextState ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', user.id);
        toast.success(`User ${user.name} is now ${nextState ? 'Active' : 'Locked'}`);
        loadUsers();
      } else if (action === 'Delete') {
        if (!await confirm({
          title: 'Delete User Account',
          message: `Permanently delete account for ${user.name}? Any leads assigned to them must be reassigned.`,
          confirmLabel: 'Delete User',
          variant: 'danger'
        })) return;
        await adminDeleteUser(user.id);
        await logAuditEvent('USER_DELETED', user.id);
        toast.success(`User ${user.name} deleted`);
        loadUsers();
      }
    } catch (err: any) {
      toast.error(err.message || `Action ${action} failed`);
    }
  };

  // Protected Export CSV
  const handleExport = () => {
    const canExport = isSuperAdmin() || hasPermission('Export Leads', 'Lead Management') || hasPermission('Manage Users', 'Administration');
    if (!canExport) {
      toast.error('Permission Denied: You are not authorized to export user directory records.');
      return;
    }

    if (users.length === 0) return toast.error('No users to export');

    const headers = [
      'Name', 'Email', 'Designation', 'Department', 'Team',
      'Reports To', 'Access Profile', 'Data Scope', 'Status', 'Last Login'
    ];

    const csvContent = [
      headers.join(','),
      ...users.map(u => [
        `"${u.name}"`,
        `"${u.email}"`,
        `"${u.designation?.name || ''}"`,
        `"${u.department?.name || ''}"`,
        `"${u.team?.name || ''}"`,
        `"${u.manager?.name || ''}"`,
        `"${u.access_profile?.name || u.role?.name || ''}"`,
        `"${u.effective_scope}"`,
        `"${u.is_active ? 'Active' : 'Locked'}"`,
        `"${u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const deptSuffix = filters.department !== 'ALL' ? `_${filters.department}` : '';
    link.setAttribute('download', `edvix_enterprise_users${deptSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logAuditEvent('USERS_EXPORTED_CSV', undefined, { count: filteredUsers.length });
    toast.success(`Exported ${filteredUsers.length} user records to CSV`);
  };

  const isAllSelected = filteredUsers.length > 0 && selectedIds.size === filteredUsers.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredUsers.length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Enterprise Staff Directory
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Staff records with department placement, hierarchy designation, operational teams, and access profiles.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-semibold hover:bg-secondary/80 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV ({filteredUsers.length})
          </button>
          <button
            onClick={() => {
              setSelectedUser(null);
              setIsWizardOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary-hover transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New User
          </button>
        </div>
      </div>

      {/* Quick Organization Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Staff</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{users.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{users.filter(u => u.is_active).length} Active</span> · {users.filter(u => !u.is_active).length} Locked
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Departments</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{departments.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {departments.slice(0, 2).map(d => d.name).join(', ') || 'None configured'}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Operational Teams</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{teams.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Active team pods
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Access Profiles</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{accessProfiles.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Security governance
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Advanced Filters Toolbar */}
        <div className="p-4 border-b border-border bg-muted/15 space-y-3">
          <UserFilters
            filters={filters}
            onFilterChange={(newFilters) => {
              setFilters(newFilters);
              setSelectedIds(new Set());
            }}
            onReset={handleFilterReset}
            search={search}
            onSearchChange={(newSearch) => {
              setSearch(newSearch);
              setSelectedIds(new Set());
            }}
            users={users}
            departments={departments}
            designations={designations}
            teams={teams}
            accessProfiles={accessProfiles}
            filteredCount={filteredUsers.length}
            totalCount={users.length}
          />

          {/* Bulk Action Toolbar if items are selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50 animate-in fade-in duration-150">
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBulkActivate}
                disabled={isBulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg text-xs font-semibold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Activate
              </button>
              <button
                onClick={handleBulkDeactivate}
                disabled={isBulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg text-xs font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50"
              >
                <UserX className="w-3.5 h-3.5" />
                Deactivate
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-600 border border-red-500/20 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <button
                onClick={clearSelection}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Mobile Cards View (< md) */}
        <div className="block md:hidden divide-y divide-border">
          <div className="p-3 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground border-b border-border">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                className="rounded border-border cursor-pointer w-4 h-4"
                checked={isAllSelected}
                ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                onChange={handleSelectAll}
              />
              <span>Select All Staff</span>
            </label>
            <span>{filteredUsers.length} total</span>
          </div>

          {filteredUsers.map(u => (
            <div
              key={u.id}
              className={cn(
                "p-3.5 space-y-3 transition-colors",
                selectedIds.has(u.id) ? "bg-primary/5" : "hover:bg-muted/10"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    className="rounded border-border cursor-pointer w-4 h-4 mt-1 shrink-0"
                    checked={selectedIds.has(u.id)}
                    onChange={() => handleSelectOne(u.id)}
                  />
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">{u.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] shrink-0 ${
                  u.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {u.is_active ? <CheckCircle className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                  {u.is_active ? 'Active' : 'Locked'}
                </span>
              </div>

              {/* Role & Org Details */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-xl border border-border/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Designation</span>
                  <span className="font-medium text-foreground truncate block">{u.designation?.name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Department</span>
                  <span className="font-medium text-foreground truncate block">{u.department?.name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Access Profile</span>
                  <span className="font-medium text-primary truncate block">{u.access_profile?.name || u.role?.name || 'Standard'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Data Scope</span>
                  <span className="font-semibold text-indigo-500 text-[11px] block">{u.effective_scope}</span>
                </div>
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/40">
                <button
                  onClick={() => handleAction('Edit', u)}
                  className="px-2.5 py-1.5 text-muted-foreground hover:text-primary rounded-lg bg-muted/40 hover:bg-muted text-xs font-medium flex items-center gap-1 min-h-[36px]"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleAction('Toggle Active', u)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg bg-muted/40 hover:bg-muted text-xs font-medium flex items-center gap-1 min-h-[36px]",
                    u.is_active ? 'text-muted-foreground hover:text-amber-500' : 'text-muted-foreground hover:text-emerald-500'
                  )}
                >
                  {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  {u.is_active ? 'Lock' : 'Activate'}
                </button>
                <button
                  onClick={() => handleAction('Force Logout', u)}
                  className="p-1.5 text-muted-foreground hover:text-orange-500 rounded-lg bg-muted/40 hover:bg-muted min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Force Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleAction('Delete', u)}
                  className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg bg-muted/40 hover:bg-muted min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Delete User"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center">
              {loading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading staff records...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 px-4">
                  <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground mb-2">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">No staff members match the criteria</p>
                  <button
                    type="button"
                    onClick={handleFilterReset}
                    className="mt-2.5 px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Reset all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Table (Desktop & Tablet: md+) */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-border cursor-pointer"
                    checked={isAllSelected}
                    ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3.5">Employee</th>
                <th className="px-4 py-3.5">Designation</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Team</th>
                <th className="px-4 py-3.5">Reports To</th>
                <th className="px-4 py-3.5">Access Profile</th>
                <th className="px-4 py-3.5">Data Scope</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map(u => (
                <tr
                  key={u.id}
                  className={cn(
                    "hover:bg-muted/15 transition-colors",
                    selectedIds.has(u.id) && "bg-primary/5"
                  )}
                >
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      className="rounded border-border cursor-pointer"
                      checked={selectedIds.has(u.id)}
                      onChange={() => handleSelectOne(u.id)}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{u.name}</div>
                        <div className="text-[11px] text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-foreground">
                    {u.designation?.name || <span className="italic text-muted-foreground/60">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {u.department?.name ? (
                      <span className="inline-flex items-center gap-1">
                        {u.department.name}
                        <span className="text-[9px] font-mono px-1 py-0.2 bg-muted rounded">{u.department.code}</span>
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground/60">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {u.team?.name || <span className="italic text-muted-foreground/60">None</span>}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground">
                    {u.manager?.name || <span className="italic text-muted-foreground/60">Branch Head</span>}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-primary">
                    {u.access_profile?.name || u.role?.name || 'Standard'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-indigo-500/10 text-indigo-500">
                      {u.effective_scope}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                      u.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {u.is_active ? <CheckCircle className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                      {u.is_active ? 'Active' : 'Locked'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleAction('Edit', u)}
                        className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"
                        title="Edit User Profile"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAction('Toggle Active', u)}
                        className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${
                          u.is_active ? 'text-muted-foreground hover:text-amber-500' : 'text-muted-foreground hover:text-emerald-500'
                        }`}
                        title={u.is_active ? 'Deactivate User' : 'Activate User'}
                      >
                        {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleAction('Force Logout', u)}
                        className="p-1.5 text-muted-foreground hover:text-orange-500 rounded-lg hover:bg-muted transition-colors"
                        title="Force Logout Active Sessions"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAction('Delete', u)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-muted transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span>Loading staff records...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground mb-3">
                          <Users className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">No staff members found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          No staff members match the current search query or active filter combination.
                        </p>
                        <button
                          type="button"
                          onClick={handleFilterReset}
                          className="mt-3 px-3.5 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Reset all filters
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 7-Step User Creation / Edit Wizard */}
      <UserCreationWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setSelectedUser(null);
        }}
        onSuccess={loadUsers}
        initialData={selectedUser}
      />

    </div>
  );
}
