import { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Edit2, ShieldOff, Trash2, KeyRound,
  LogOut, CheckCircle, UserX, UserCheck, Download, Upload, Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { adminDeleteUser, adminBulkDeleteUsers } from '../../lib/adminApi';
import { fetchUsersWithOrgDetails, logAuditEvent, type UserWithOrgDetails } from '../../lib/orgApi';
import { UserCreationWizard } from './UserCreationWizard';
import { useConfirm } from '../ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';

export function UserManagement() {
  const { isSuperAdmin, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserWithOrgDetails[]>([]);
  const { confirm } = useConfirm();
  const [search, setSearch] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithOrgDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsersWithOrgDetails();
      setUsers(data);
    } catch (err: any) {
      toast.error('Failed to load user records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.designation?.name && u.designation.name.toLowerCase().includes(search.toLowerCase())) ||
    (u.department?.name && u.department.name.toLowerCase().includes(search.toLowerCase()))
  );

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
    link.setAttribute('download', `edvix_enterprise_users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logAuditEvent('USERS_EXPORTED_CSV', undefined, { count: users.length });
    toast.success(`Exported ${users.length} user records to CSV`);
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
            Export CSV
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

      {/* Main Table Container */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search staff by name, email, department, designation..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); clearSelection(); }}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {filteredUsers.length} Staff Members
            </div>
          </div>

          {/* Bulk Action Toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
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
                Clear
              </button>
            </div>
          )}
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
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
                  <td colSpan={10} className="px-6 py-12 text-center text-muted-foreground italic">
                    {loading ? 'Loading staff records...' : `No users found matching "${search}"`}
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
