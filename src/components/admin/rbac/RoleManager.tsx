import { useState, useEffect } from 'react';
import { Shield, Plus, Check, Settings2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { fetchDomains, fetchRolesByDomain, createRole, fetchRolePermissions, assignRolePermissions, fetchAllPermissions, Domain, Role, Permission } from '../../../lib/rbacApi';
import { supabase } from '../../../lib/supabase';

// Group permissions by resource for better UI
const PERMISSION_GROUPS = ['leads', 'tasks', 'calls', 'reports', 'users', 'roles', 'domains', 'audit', 'other'];

export function RoleManager() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      loadRoles(selectedDomain);
    }
  }, [selectedDomain]);

  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole.id);
    } else {
      setCheckedPerms(new Set());
    }
  }, [selectedRole]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [domainsData, permsData] = await Promise.all([
        fetchDomains(),
        fetchAllPermissions()
      ]);
      
      const activeDomains = domainsData.filter(d => d.is_active);
      setDomains(activeDomains);
      setAllPermissions(permsData);
      
      if (activeDomains.length > 0) {
        setSelectedDomain(activeDomains[0].id);
      }
    } catch (err) {
      toast.error('Failed to load RBAC data');
    }
    setLoading(false);
  };

  const loadRoles = async (domainId: string) => {
    try {
      const rolesData = await fetchRolesByDomain(domainId);
      setRoles(rolesData);
      if (rolesData.length > 0) {
        setSelectedRole(rolesData[0]);
      } else {
        setSelectedRole(null);
      }
    } catch (err) {
      toast.error('Failed to load roles for domain');
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      const rpData = await fetchRolePermissions(roleId);
      const permIds = rpData.map((rp: any) => rp.permission_id);
      setCheckedPerms(new Set(permIds));
    } catch (err) {
      toast.error('Failed to load permissions for role');
    }
  };

  const handleCreateRole = async () => {
    if (!selectedDomain) return;
    
    const name = window.prompt('Enter new role name:');
    if (!name) return;
    
    try {
      // Get org id (default to first active org for simplicity in this demo, real app would pass active org)
      const { data: orgData } = await supabase.from('organizations').select('id').limit(1).single();
      const orgId = orgData?.id;
      
      if (!orgId) throw new Error('No organization found');
      
      await createRole({ name, domain_id: selectedDomain, organization_id: orgId });
      toast.success('Role created successfully');
      loadRoles(selectedDomain);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role');
    }
  };

  const togglePermission = (permId: string) => {
    const newSet = new Set(checkedPerms);
    if (newSet.has(permId)) {
      newSet.delete(permId);
    } else {
      newSet.add(permId);
    }
    setCheckedPerms(newSet);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await assignRolePermissions(selectedRole.id, Array.from(checkedPerms));
      toast.success('Permissions saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save permissions');
    }
    setSaving(false);
  };

  // Group permissions for display
  const getGroupedPermissions = () => {
    const groups: Record<string, Permission[]> = {};
    
    allPermissions.forEach(perm => {
      // Use resource prefix (e.g., 'leads' from 'leads.view') or fallback to 'other'
      let groupName = 'other';
      for (const prefix of PERMISSION_GROUPS) {
        if (perm.action.startsWith(prefix) || perm.resource === prefix) {
          groupName = prefix;
          break;
        }
      }
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(perm);
    });
    
    return groups;
  };

  const groupedPermissions = getGroupedPermissions();

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      {/* Left Sidebar: Domains & Roles */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        
        {/* Domain Selector */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-3">Select Domain</h3>
          <select 
            className="w-full rounded-lg border-border bg-background text-sm"
            value={selectedDomain || ''}
            onChange={(e) => setSelectedDomain(e.target.value)}
          >
            {domains.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Roles List */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Roles</h3>
            <button onClick={handleCreateRole} className="p-1 text-primary hover:bg-primary/10 rounded" title="Create custom role">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex flex-col gap-2 overflow-y-auto hide-scrollbar">
            {roles.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No roles in this domain</div>
            ) : (
              roles.map((role) => (
                <button 
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`p-3 border rounded-lg transition-all text-left flex items-center gap-2 ${
                    selectedRole?.id === role.id 
                      ? 'border-primary bg-primary/5 shadow-sm text-primary' 
                      : 'border-border bg-card hover:border-primary/30 text-foreground'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-sm truncate">{role.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Permission Matrix */}
      <div className="lg:col-span-3">
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-16rem)] min-h-[500px]">
          <div className="p-4 md:p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <div>
              <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
                {selectedRole ? (
                  <>Editing Permissions: <span className="text-primary">{selectedRole.name}</span></>
                ) : 'No Role Selected'}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {selectedRole ? 'Check the boxes below to grant capabilities to this role.' : 'Select a role from the left sidebar.'}
              </p>
            </div>
            <button 
              onClick={handleSavePermissions}
              disabled={!selectedRole || selectedRole.name === 'Super Admin' || saving}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield className="w-4 h-4" />}
              Save Configuration
            </button>
          </div>

          <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar bg-background">
            {!selectedRole ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                <Shield className="w-16 h-16 mb-4" />
                <p>Select a role to configure its permissions</p>
              </div>
            ) : (
              Object.entries(groupedPermissions).map(([groupName, perms]) => (
                <div key={groupName}>
                  <h4 className="font-medium text-foreground mb-4 flex items-center gap-2 pb-2 border-b border-border uppercase tracking-wide text-xs">
                    <Settings2 className="w-3 h-3 text-muted-foreground" />
                    {groupName} MODULE
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {perms.map((perm) => {
                      const isChecked = checkedPerms.has(perm.id);
                      // Security Check: Do not allow granting 'system.manage_rbac' or 'system.manage_domains' to non-Super Admin roles
                      const isSuperAdminOnly = perm.action.startsWith('system.manage_') && selectedRole.name !== 'Super Admin';
                      
                      return (
                        <label 
                          key={perm.id} 
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            isSuperAdminOnly ? 'opacity-50 cursor-not-allowed bg-muted/20 border-border' :
                            isChecked ? 'border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer' : 
                            'border-border bg-card hover:bg-muted/30 cursor-pointer'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isChecked ? 'bg-primary border-primary' : 
                            isSuperAdminOnly ? 'bg-muted border-border' :
                            'border-input bg-background'
                          }`}>
                            {isChecked && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium leading-tight">{perm.action}</span>
                            {perm.description && <span className="text-xs text-muted-foreground mt-1 leading-snug">{perm.description}</span>}
                            {isSuperAdminOnly && <span className="text-[10px] text-red-500 font-medium mt-1">Super Admin Only</span>}
                          </div>
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isChecked}
                            disabled={isSuperAdminOnly}
                            onChange={() => togglePermission(perm.id)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
