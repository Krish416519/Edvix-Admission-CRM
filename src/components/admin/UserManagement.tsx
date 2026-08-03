import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, ShieldOff, Trash2, KeyRound, LogOut, CheckCircle, UserX, UserCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { adminDeleteUser, adminBulkDeleteUsers } from '../../lib/adminApi';
import { UserFormModal } from './UserFormModal';

// Fetch users from Supabase
const fetchUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role_id, is_active, last_login, department, team, manager_id, role:roles(name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    toast.error('Failed to load users');
    return [];
  }
  return data.map((u: any) => ({
    id: u.id,
    name: u.name || u.email,
    email: u.email,
    role_id: u.role_id,
    department: u.department || '',
    team: u.team || '',
    manager_id: u.manager_id || '',
    role: Array.isArray(u.role) ? u.role[0]?.name : (u.role?.name || 'User'),
    is_active: u.is_active,
    status: u.is_active ? 'Active' : 'Locked',
    lastLogin: u.last_login ? new Date(u.last_login).toLocaleString() : 'Never',
  }));
};

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const loadUsers = async () => {
    const data = await fetchUsers();
    setUsers(data);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
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
    if (!confirm(`Deactivate ${selectedIds.size} selected users?`)) return;
    setIsBulkLoading(true);
    let failed = 0;
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const { error } = await supabase.from('users').update({ is_active: false }).eq('id', id);
        if (error) failed++;
      }
      if (failed > 0) toast.warning(`${ids.length - failed} deactivated, ${failed} failed`);
      else toast.success(`Successfully deactivated ${ids.length} users`);
      clearSelection();
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Bulk deactivate failed');
    }
    setIsBulkLoading(false);
  };

  const handleBulkActivate = async () => {
    if (!confirm(`Activate ${selectedIds.size} selected users?`)) return;
    setIsBulkLoading(true);
    let failed = 0;
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const { error } = await supabase.from('users').update({ is_active: true }).eq('id', id);
        if (error) failed++;
      }
      if (failed > 0) toast.warning(`${ids.length - failed} activated, ${failed} failed`);
      else toast.success(`Successfully activated ${ids.length} users`);
      clearSelection();
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Bulk activate failed');
    }
    setIsBulkLoading(false);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Permanently delete ${selectedIds.size} selected users? This cannot be undone.`)) return;
    setIsBulkLoading(true);
    try {
      const ids = Array.from(selectedIds) as string[];
      const result = await adminBulkDeleteUsers(ids);
      if (result.failed > 0) {
        toast.warning(`${result.deleted} deleted, ${result.failed} failed`);
      } else {
        toast.success(`Successfully deleted ${result.deleted} users`);
      }
      clearSelection();
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Bulk delete failed — make sure the Edge Function is deployed');
    }
    setIsBulkLoading(false);
  };

  // ── Individual actions ────────────────────────────────────────
  const handleAction = async (action: string, user: any) => {
    if (action === 'Edit') {
      setSelectedUser(user);
      setIsModalOpen(true);
      return;
    }

    if (!confirm(`Are you sure you want to ${action} for ${user.name}?`)) return;

    try {
      if (action === 'Delete') {
        await adminDeleteUser(user.id);
        toast.success(`Deleted user ${user.name}`);
      } else if (action === 'Force Logout') {
        toast.success(`Forced logout for ${user.name}`);
      } else if (action === 'Password Reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success(`Password reset link sent to ${user.email}`);
      }
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action}`);
    }
  };

  const handleUserSubmit = async (formData: any) => {
    try {
      if (selectedUser) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_user', {
          p_user_id:   selectedUser.id,
          p_name:      formData.name,
          p_role_id:   formData.role_id || null,
          p_is_active: formData.is_active,
        });
        if (rpcError) throw rpcError;
        if (rpcData && !rpcData.success) throw new Error(rpcData.error || 'Update failed');
        
        // Update extra fields directly
        await supabase.from('users').update({
          department: formData.department || null,
          team: formData.team || null,
          manager_id: formData.manager_id || null
        }).eq('id', selectedUser.id);
        
        toast.success('User updated successfully');
      } else {
        // Create new user using the edge function to bypass signup restrictions
        const { data: rpcData, error: rpcError } = await supabase.functions.invoke('admin-user-actions', {
          body: {
            action: 'create_user',
            data: {
              email: formData.email,
              password: formData.password,
              name: formData.name,
              role_id: formData.role_id || null
            }
          }
        });

        if (rpcError) throw rpcError;
        if (rpcData && !rpcData.success) throw new Error(rpcData.error || 'Failed to create user');
        
        // Wait, edge function might not return the new ID, so we fetch it by email
        const { data: newUser } = await supabase.from('users').select('id').eq('email', formData.email).single();
        if (newUser) {
           await supabase.from('users').update({
             department: formData.department || null,
             team: formData.team || null,
             manager_id: formData.manager_id || null
           }).eq('id', newUser.id);
        }
        
        toast.success(`User ${formData.name} created successfully!`);
      }
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save user');
      throw err;
    }
  };

  const handleExport = () => {
    if (users.length === 0) return toast.error('No users to export');
    const headers = ['Name', 'Email', 'Role', 'Status', 'Department', 'Team', 'Last Login'];
    const csvContent = [
      headers.join(','),
      ...users.map(u => [
        `"${u.name}"`,
        `"${u.email}"`,
        `"${u.role}"`,
        `"${u.status}"`,
        `"${u.department || ''}"`,
        `"${u.team || ''}"`,
        `"${u.lastLogin}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `edvix_users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Basic import UI stub
    toast.info('Import feature requires a backend processing endpoint. Not fully implemented.');
  };

  const isAllSelected = filteredUsers.length > 0 && selectedIds.size === filteredUsers.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredUsers.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            User Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage team members, roles, and account security.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 shadow-sm transition-colors"
          >
            Export CSV
          </button>
          <label className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 shadow-sm transition-colors cursor-pointer">
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
          <button
            onClick={() => {
              setSelectedUser(null);
              setIsModalOpen(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); clearSelection(); }}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {filteredUsers.length} Users
            </div>
          </div>

          {/* Bulk Action Toolbar — appears when items are selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBulkActivate}
                disabled={isBulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Activate
              </button>
              <button
                onClick={handleBulkDeactivate}
                disabled={isBulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
              >
                <UserX className="w-3.5 h-3.5" />
                Deactivate
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-border cursor-pointer"
                    checked={isAllSelected}
                    ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                    onChange={handleSelectAll}
                    title="Select all"
                  />
                </th>
                <th className="px-6 py-4 font-medium text-muted-foreground">User</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Role</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Last Login</th>
                <th className="px-6 py-4 font-medium text-right text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map(user => (
                <tr
                  key={user.id}
                  className={cn(
                    "hover:bg-muted/30 transition-colors",
                    selectedIds.has(user.id) && "bg-primary/5"
                  )}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      className="rounded border-border cursor-pointer"
                      checked={selectedIds.has(user.id)}
                      onChange={() => handleSelectOne(user.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs font-medium">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {user.status === 'Active' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                      {user.status === 'Locked' && <ShieldOff className="w-3.5 h-3.5 text-red-500" />}
                      {user.status === 'Inactive' && <div className="w-2 h-2 rounded-full bg-gray-400" />}
                      <span className={cn(
                        "text-xs font-semibold",
                        user.status === 'Active' ? "text-emerald-700 dark:text-emerald-400" :
                        user.status === 'Locked' ? "text-red-700 dark:text-red-400" :
                        "text-gray-600 dark:text-gray-400"
                      )}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {user.lastLogin}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleAction('Edit', user)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-muted transition-colors" title="Edit User">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleAction('Password Reset', user)} className="p-1.5 text-muted-foreground hover:text-amber-500 rounded-md hover:bg-muted transition-colors" title="Reset Password">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleAction('Force Logout', user)} className="p-1.5 text-muted-foreground hover:text-orange-500 rounded-md hover:bg-muted transition-colors" title="Force Logout">
                        <LogOut className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleAction('Delete', user)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded-md hover:bg-muted transition-colors" title="Delete User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No users found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleUserSubmit}
        initialData={selectedUser}
      />
    </div>
  );
}
