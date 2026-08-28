import { useState, useEffect } from 'react';
import { Shield, Plus, Check, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

// System permission groups for UI organization
const PERMISSION_GROUPS = ['Lead Management', 'Communication', 'System', 'Other'];

export function RoleManagement() {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // We maintain a local set of checked permission IDs for the selected role
  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: rData } = await supabase.from('roles').select('*').order('name');
      const { data: pData } = await supabase.from('permissions').select('*').order('action');
      const { data: rpData } = await supabase.from('role_permissions').select('*');
      
      setRoles(rData || []);
      setPermissions(pData || []);
      setRolePermissions(rpData || []);
      
      if (rData && rData.length > 0) {
        handleSelectRole(rData[0], rpData || []);
      }
    } catch (err: any) {
      toast.error('Failed to load roles');
    }
    setLoading(false);
  };

  const handleSelectRole = (role: any, rpData?: any[]) => {
    setSelectedRole(role);
    const dataToUse = rpData || rolePermissions;
    const assignedIds = dataToUse.filter((rp: any) => rp.role_id === role.id).map((rp: any) => rp.permission_id);
    setCheckedPerms(new Set(assignedIds));
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
    try {
      // Delete old permissions
      await supabase.from('role_permissions').delete().eq('role_id', selectedRole.id);
      
      // Insert new permissions
      const toInsert = Array.from(checkedPerms).map(pid => ({ role_id: selectedRole.id, permission_id: pid }));
      if (toInsert.length > 0) {
        await supabase.from('role_permissions').insert(toInsert);
      }
      toast.success('Permissions saved successfully');
      
      // Update local state
      const { data: rpData } = await supabase.from('role_permissions').select('*');
      setRolePermissions(rpData || []);
    } catch (err: any) {
      toast.error('Failed to save permissions');
    }
  };

  const handleCreateRole = async () => {
    const name = window.prompt('Enter new role name:');
    if (!name) return;
    
    try {
      const { error } = await supabase.from('roles').insert([{ name }]);
      if (error) throw error;
      toast.success('Role created successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role');
    }
  };

  // Group permissions by resource
  const groupedPermissions = PERMISSION_GROUPS.map(groupName => {
    return {
      group: groupName,
      rules: permissions.filter(p => p.resource === groupName)
    };
  }).filter(g => g.rules.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Roles & Permissions
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Define granular access control for different team members.</p>
        </div>
        <button 
          onClick={handleCreateRole}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Custom Role
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
      ) : (

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1 flex flex-col">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-2 shrink-0">Available Roles</h3>
          <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-visible hide-scrollbar pb-2 lg:pb-0">
            {roles.map((role) => (
              <div 
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={`p-4 border rounded-xl cursor-pointer transition-all min-w-[220px] lg:min-w-0 shrink-0 ${
                  selectedRole?.id === role.id 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <h4 className={`font-semibold text-sm md:text-base ${selectedRole?.id === role.id ? 'text-primary' : 'text-foreground'}`}>{role.name}</h4>
                {role.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{role.description}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Permission Builder */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 md:p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
                  Editing Role: <span className="text-primary">{selectedRole?.name || 'None'}</span>
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">Check the boxes below to grant permissions to this role.</p>
              </div>
              <button 
                onClick={handleSavePermissions}
                disabled={!selectedRole || selectedRole.name === 'Super Admin'}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover shadow-sm disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>

            <div className="p-6 space-y-8 flex-1 overflow-y-auto">
              {groupedPermissions.map((group) => (
                <div key={group.group}>
                  <h4 className="font-medium text-foreground mb-4 flex items-center gap-2 pb-2 border-b border-border">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    {group.group}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {group.rules.map((rule: any) => {
                      const isChecked = checkedPerms.has(rule.id);
                      const isSuperAdmin = selectedRole?.name === 'Super Admin';
                      
                      return (
                        <label key={rule.id} className={`flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer transition-colors ${isChecked ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
                          <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border ${isChecked || isSuperAdmin ? 'bg-primary border-primary' : 'border-input bg-background'}`}>
                            {(isChecked || isSuperAdmin) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium leading-none mt-1">{rule.action}</span>
                            {rule.description && <span className="text-xs text-muted-foreground mt-1.5">{rule.description}</span>}
                          </div>
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isChecked || isSuperAdmin}
                            disabled={isSuperAdmin}
                            onChange={() => togglePermission(rule.id)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
