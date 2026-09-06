import { supabase } from './supabase';

export interface Domain {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  domain_id: string;
  organization_id: string;
}

export interface Permission {
  id: string;
  action: string;
  resource: string;
  description: string;
}

export interface UserPermissionOverride {
  id: string;
  user_id: string;
  permission_id: string;
  is_deny: boolean;
  granted_by: string;
}

// =======================
// DOMAIN MANAGEMENT
// =======================

export const fetchDomains = async () => {
  const { data, error } = await supabase.from('domains').select('*').order('name');
  if (error) throw error;
  return data as Domain[];
};

export const createDomain = async (payload: { name: string; slug: string; description?: string }) => {
  const { data, error } = await supabase.from('domains').insert([payload]).select().single();
  if (error) throw error;
  
  await logRbacAction('DOMAIN_CREATED', data.id, null, null, null, null, payload);
  return data;
};

export const updateDomain = async (id: string, payload: Partial<Domain>) => {
  // Fetch old state for audit
  const { data: oldData } = await supabase.from('domains').select('*').eq('id', id).single();
  
  const { data, error } = await supabase.from('domains').update(payload).eq('id', id).select().single();
  if (error) throw error;
  
  await logRbacAction('DOMAIN_UPDATED', id, id, null, null, oldData, payload);
  return data;
};

// =======================
// ROLE MANAGEMENT
// =======================

export const fetchRolesByDomain = async (domainId: string) => {
  const { data, error } = await supabase.from('roles').select('*').eq('domain_id', domainId).order('name');
  if (error) throw error;
  return data as Role[];
};

export const createRole = async (payload: { name: string; description?: string; domain_id: string; organization_id: string }) => {
  const { data, error } = await supabase.from('roles').insert([payload]).select().single();
  if (error) throw error;
  
  await logRbacAction('ROLE_CREATED', data.id, payload.domain_id, data.id, null, null, payload);
  return data;
};

export const fetchRolePermissions = async (roleId: string) => {
  const { data, error } = await supabase.from('role_permissions')
    .select('permission_id, permissions(*)')
    .eq('role_id', roleId);
  if (error) throw error;
  return data;
};

export const assignRolePermissions = async (roleId: string, permissionIds: string[]) => {
  // Clear old
  await supabase.from('role_permissions').delete().eq('role_id', roleId);
  
  // Assign new
  if (permissionIds.length > 0) {
    const payloads = permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }));
    const { error } = await supabase.from('role_permissions').insert(payloads);
    if (error) throw error;
  }
  
  await logRbacAction('ROLE_PERMISSIONS_UPDATED', roleId, null, roleId, null, null, { permissionIds });
};

// =======================
// PERMISSION MANAGEMENT
// =======================

export const fetchAllPermissions = async () => {
  const { data, error } = await supabase.from('permissions').select('*').order('resource');
  if (error) throw error;
  return data as Permission[];
};

// =======================
// USER OVERRIDES
// =======================

export const fetchUserOverrides = async (userId: string) => {
  const { data, error } = await supabase.from('user_permission_overrides')
    .select('*, permissions(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return data;
};

export const grantUserPermission = async (userId: string, permissionId: string) => {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('user_permission_overrides').upsert({
    user_id: userId,
    permission_id: permissionId,
    is_deny: false,
    granted_by: user.user?.id
  }, { onConflict: 'user_id, permission_id' }).select().single();
  if (error) throw error;
  
  await logRbacAction('USER_PERMISSION_GRANTED', userId, null, null, permissionId, null, { action: 'GRANT' });
  return data;
};

export const denyUserPermission = async (userId: string, permissionId: string) => {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('user_permission_overrides').upsert({
    user_id: userId,
    permission_id: permissionId,
    is_deny: true,
    granted_by: user.user?.id
  }, { onConflict: 'user_id, permission_id' }).select().single();
  if (error) throw error;
  
  await logRbacAction('USER_PERMISSION_DENIED', userId, null, null, permissionId, null, { action: 'DENY' });
  return data;
};

export const revokeUserPermission = async (userId: string, permissionId: string) => {
  const { error } = await supabase.from('user_permission_overrides').delete()
    .eq('user_id', userId)
    .eq('permission_id', permissionId);
  if (error) throw error;
  
  await logRbacAction('USER_PERMISSION_REVOKED', userId, null, null, permissionId, null, null);
};

// =======================
// AUDIT LOGGING
// =======================

export const logRbacAction = async (
  action: string, 
  targetId: string | null = null, 
  domainId: string | null = null, 
  roleId: string | null = null, 
  permissionId: string | null = null,
  oldState: any = null,
  newState: any = null
) => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return; // Silent return if no user session
  
  try {
    await supabase.from('rbac_audit_logs').insert([{
      actor_id: user.user.id,
      action,
      target_id: targetId,
      domain_id: domainId,
      role_id: roleId,
      permission_id: permissionId,
      old_state: oldState,
      new_state: newState
    }]);
  } catch (err) {
    console.error('Failed to log RBAC action', err);
  }
};
