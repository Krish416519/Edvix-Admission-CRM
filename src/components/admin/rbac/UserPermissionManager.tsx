import { useState, useEffect } from 'react';
import { Search, Check, X, UserX, UserCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';
import { fetchAllPermissions, fetchUserOverrides, grantUserPermission, denyUserPermission, revokeUserPermission, Permission } from '../../../lib/rbacApi';

export function UserPermissionManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('users').select('*, roles(name)').order('name').limit(100);
      const permsData = await fetchAllPermissions();
      
      setUsers(userData || []);
      setAllPermissions(permsData);
    } catch (err) {
      toast.error('Failed to load users or permissions');
    }
    setLoading(false);
  };

  const handleSearch = async (term: string) => {
    setSearch(term);
    if (term.length < 2) {
      const { data } = await supabase.from('users').select('*, roles(name)').order('name').limit(100);
      setUsers(data || []);
      return;
    }
    
    const { data } = await supabase.from('users')
      .select('*, roles(name)')
      .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
      .limit(50);
    setUsers(data || []);
  };

  const handleSelectUser = async (user: any) => {
    setSelectedUser(user);
    try {
      const overridesData = await fetchUserOverrides(user.id);
      setOverrides(overridesData);
    } catch (err) {
      toast.error('Failed to load user overrides');
    }
  };

  const handleGrant = async (permId: string) => {
    if (!selectedUser) return;
    try {
      await grantUserPermission(selectedUser.id, permId);
      toast.success('Permission granted directly to user');
      const overridesData = await fetchUserOverrides(selectedUser.id);
      setOverrides(overridesData);
    } catch (err) {
      toast.error('Failed to grant permission');
    }
  };

  const handleDeny = async (permId: string) => {
    if (!selectedUser) return;
    try {
      await denyUserPermission(selectedUser.id, permId);
      toast.success('Permission explicitly denied for user');
      const overridesData = await fetchUserOverrides(selectedUser.id);
      setOverrides(overridesData);
    } catch (err) {
      toast.error('Failed to deny permission');
    }
  };

  const handleRevoke = async (permId: string) => {
    if (!selectedUser) return;
    try {
      await revokeUserPermission(selectedUser.id, permId);
      toast.success('Override removed');
      const overridesData = await fetchUserOverrides(selectedUser.id);
      setOverrides(overridesData);
    } catch (err) {
      toast.error('Failed to remove override');
    }
  };

  const getOverrideState = (permId: string) => {
    const override = overrides.find(o => o.permission_id === permId);
    if (!override) return 'none';
    return override.is_deny ? 'deny' : 'grant';
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      {/* Left Sidebar: Users Search */}
      <div className="lg:col-span-1 flex flex-col gap-4 bg-card border border-border rounded-xl p-4 shadow-sm h-full">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Find User</h3>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 rounded-lg border-border bg-background text-sm"
          />
        </div>
        
        <div className="flex flex-col gap-2 overflow-y-auto hide-scrollbar mt-2">
          {users.map((user) => (
            <button 
              key={user.id}
              onClick={() => handleSelectUser(user)}
              className={`p-3 border rounded-lg transition-all text-left flex flex-col gap-1 ${
                selectedUser?.id === user.id 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-border bg-background hover:border-primary/30'
              }`}
            >
              <span className={`font-medium text-sm truncate ${selectedUser?.id === user.id ? 'text-primary' : 'text-foreground'}`}>{user.name}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              <span className="text-[10px] uppercase font-bold bg-muted px-1.5 py-0.5 rounded w-max mt-1">{user.roles?.name || 'No Role'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Overrides Matrix */}
      <div className="lg:col-span-3">
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-16rem)] min-h-[500px]">
          <div className="p-4 md:p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <div>
              <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
                {selectedUser ? (
                  <>Permission Overrides: <span className="text-primary">{selectedUser.name}</span></>
                ) : 'No User Selected'}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {selectedUser ? 'Explicitly GRANT or DENY permissions for this specific user. Denies take absolute precedence.' : 'Select a user from the left sidebar.'}
              </p>
            </div>
            {selectedUser && selectedUser.roles?.name === 'Super Admin' && (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 text-xs font-medium">
                <ShieldAlert className="w-4 h-4" />
                Super Admin: Overrides have no effect
              </div>
            )}
          </div>

          <div className="p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar bg-background">
            {!selectedUser ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                <UserCheck className="w-16 h-16 mb-4" />
                <p>Select a user to configure specific overrides</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allPermissions.map((perm) => {
                  const state = getOverrideState(perm.id);
                  const isSuperAdminOnly = perm.action.startsWith('system.manage_');
                  
                  return (
                    <div key={perm.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border bg-card gap-4">
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium leading-tight text-foreground">{perm.action}</span>
                        {perm.description && <span className="text-xs text-muted-foreground mt-1 leading-snug">{perm.description}</span>}
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0 bg-muted/50 p-1 rounded-lg">
                        <button
                          onClick={() => state === 'grant' ? handleRevoke(perm.id) : handleGrant(perm.id)}
                          disabled={isSuperAdminOnly}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                            state === 'grant' 
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                              : 'text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600'
                          } ${isSuperAdminOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Check className="w-3 h-3" /> Grant
                        </button>
                        <button
                          onClick={() => state === 'deny' ? handleRevoke(perm.id) : handleDeny(perm.id)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                            state === 'deny' 
                              ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                              : 'text-muted-foreground hover:bg-red-50 hover:text-red-600'
                          }`}
                        >
                          <X className="w-3 h-3" /> Deny
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
