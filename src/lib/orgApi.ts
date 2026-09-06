import { supabase } from './supabase';

// ============================================================
// TYPES
// ============================================================

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  head_id?: string;
  status: 'Active' | 'Inactive' | 'Archived';
  organization_id: string;
  created_at: string;
  updated_at: string;
  // Joined
  head?: { id: string; name: string } | null;
  _designation_count?: number;
  _user_count?: number;
  _team_count?: number;
}

export interface Designation {
  id: string;
  department_id: string;
  name: string;
  level: number;
  reports_to_designation_id?: string | null;
  default_access_profile_id?: string | null;
  status: 'Active' | 'Inactive' | 'Archived';
  created_at: string;
  updated_at: string;
  // Joined
  department?: { name: string; code: string } | null;
  reports_to?: { name: string } | null;
  default_access_profile?: { name: string; data_scope: string } | null;
}

export interface Team {
  id: string;
  department_id: string;
  name: string;
  team_leader_id?: string | null;
  status: 'Active' | 'Inactive' | 'Archived';
  created_at: string;
  updated_at: string;
  // Joined
  department?: { name: string; code: string } | null;
  team_leader?: { id: string; name: string } | null;
  _member_count?: number;
}

export type DataScope = 'OWN' | 'ASSIGNED' | 'TEAM' | 'DEPARTMENT' | 'ORGANIZATION' | 'CUSTOM';

export interface AccessProfile {
  id: string;
  organization_id: string;
  name: string;
  department_id?: string | null;
  description?: string;
  data_scope: DataScope;
  is_system_profile?: boolean;
  status: 'Active' | 'Inactive' | 'Archived';
  created_at?: string;
  updated_at?: string;
  // Joined / computed
  department?: { id: string; name: string; code: string } | null;
  permission_count?: number;
  user_count?: number;
}

export interface Permission {
  id: string;
  action: string;
  resource: string;
  description?: string;
  organization_id?: string;
}

export interface UserWithOrgDetails {
  id: string;
  email: string;
  name: string;
  department_id?: string | null;
  designation_id?: string | null;
  team_id?: string | null;
  manager_id?: string | null;
  access_profile_id?: string | null;
  role_id?: string | null;
  is_active: boolean;
  last_login?: string;
  department?: { id: string; name: string; code: string } | null;
  designation?: { id: string; name: string; level: number } | null;
  team?: { id: string; name: string } | null;
  manager?: { id: string; name: string } | null;
  access_profile?: { id: string; name: string; data_scope: DataScope } | null;
  role?: { id: string; name: string } | null;
  effective_scope: DataScope;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  target_id?: string | null;
  domain_id?: string | null;
  role_id?: string | null;
  permission_id?: string | null;
  old_state?: any;
  new_state?: any;
  created_at: string;
  actor?: { id: string; name: string; email: string } | null;
}

// ============================================================
// DEPARTMENTS API
// ============================================================

export const fetchDepartments = async (): Promise<Department[]> => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');

  if (error) throw error;
  const rows = (data || []) as Department[];

  // Resolve head user names client-side
  const headIds = rows.map(r => r.head_id).filter(Boolean) as string[];
  if (headIds.length > 0) {
    const { data: headRows } = await supabase
      .from('users')
      .select('id, name')
      .in('id', headIds);
    const headMap: Record<string, any> = {};
    (headRows || []).forEach((u: any) => { headMap[u.id] = u; });
    rows.forEach(r => {
      if (r.head_id && headMap[r.head_id]) {
        (r as any).head = headMap[r.head_id];
      }
    });
  }

  return rows;
};

export const fetchDepartmentById = async (id: string): Promise<Department> => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  const dept = data as Department;

  if (dept.head_id) {
    const { data: headData } = await supabase.from('users').select('id, name').eq('id', dept.head_id).single();
    if (headData) (dept as any).head = headData;
  }

  return dept;
};

export const createDepartment = async (payload: {
  name: string;
  code: string;
  description?: string;
  head_id?: string;
  organization_id: string;
}): Promise<Department> => {
  const { data, error } = await supabase
    .from('departments')
    .insert([{ ...payload, status: 'Active' }])
    .select()
    .single();

  if (error) throw error;
  await logAuditEvent('DEPARTMENT_CREATED', data.id, { new_state: data });
  return data as Department;
};

export const updateDepartment = async (
  id: string,
  payload: Partial<Omit<Department, 'id' | 'created_at' | 'updated_at'>>
): Promise<Department> => {
  const { data, error } = await supabase
    .from('departments')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  await logAuditEvent('DEPARTMENT_UPDATED', id, { new_state: data });
  return data as Department;
};

export const deactivateDepartment = async (id: string) => {
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('department_id', id)
    .eq('is_active', true);

  if ((userCount ?? 0) > 0) {
    throw new Error(`Cannot deactivate department with ${userCount} active users. Reassign them first.`);
  }

  return updateDepartment(id, { status: 'Inactive' });
};

export const archiveDepartment = async (id: string) => {
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('department_id', id)
    .eq('is_active', true);

  if ((userCount ?? 0) > 0) {
    throw new Error(`Cannot archive department with ${userCount} active users. Reassign them first.`);
  }

  return updateDepartment(id, { status: 'Archived' });
};

export const reactivateDepartment = async (id: string) => {
  return updateDepartment(id, { status: 'Active' });
};

// ============================================================
// DESIGNATIONS API
// ============================================================

export const fetchDesignations = async (departmentId?: string): Promise<Designation[]> => {
  let query = supabase
    .from('designations')
    .select('*')
    .order('level', { ascending: false });

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as Designation[];
  if (rows.length > 0) {
    const reportsToIds = rows.map(r => r.reports_to_designation_id).filter(Boolean) as string[];
    if (reportsToIds.length > 0) {
      const { data: parentRows } = await supabase
        .from('designations')
        .select('id, name')
        .in('id', reportsToIds);
      const parentMap: Record<string, string> = {};
      (parentRows || []).forEach((p: any) => { parentMap[p.id] = p.name; });
      rows.forEach(r => {
        if (r.reports_to_designation_id && parentMap[r.reports_to_designation_id]) {
          (r as any).reports_to = { name: parentMap[r.reports_to_designation_id] };
        }
      });
    }
  }

  return rows;
};

export const createDesignation = async (payload: {
  department_id: string;
  name: string;
  level: number;
  reports_to_designation_id?: string | null;
  default_access_profile_id?: string | null;
}): Promise<Designation> => {
  const insertPayload: any = { ...payload, status: 'Active' };
  if (!hasDedicatedAccessProfiles) {
    delete insertPayload.default_access_profile_id;
  }

  let { data, error } = await supabase
    .from('designations')
    .insert([insertPayload])
    .select()
    .single();

  // If column does not exist in schema cache, strip and retry
  if (error && (error.message?.includes('default_access_profile_id') || error.code === 'PGRST204')) {
    delete insertPayload.default_access_profile_id;
    const retry = await supabase.from('designations').insert([insertPayload]).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  await logAuditEvent('DESIGNATION_CREATED', data.id, { new_state: data });
  return data as Designation;
};

export const updateDesignation = async (
  id: string,
  payload: Partial<Omit<Designation, 'id' | 'created_at' | 'updated_at'>>
): Promise<Designation> => {
  const updatePayload: any = { ...payload, updated_at: new Date().toISOString() };
  if (!hasDedicatedAccessProfiles) {
    delete updatePayload.default_access_profile_id;
  }

  let { data, error } = await supabase
    .from('designations')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  // If column does not exist in schema cache, strip and retry
  if (error && (error.message?.includes('default_access_profile_id') || error.code === 'PGRST204')) {
    delete updatePayload.default_access_profile_id;
    const retry = await supabase.from('designations').update(updatePayload).eq('id', id).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  await logAuditEvent('DESIGNATION_UPDATED', id, { new_state: data });
  return data as Designation;
};

export const deactivateDesignation = async (id: string) => {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('designation_id', id)
    .eq('is_active', true);

  if ((count ?? 0) > 0) {
    throw new Error(`Cannot deactivate designation with ${count} active users.`);
  }
  return updateDesignation(id, { status: 'Inactive' });
};

export const archiveDesignation = async (id: string) => {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('designation_id', id)
    .eq('is_active', true);

  if ((count ?? 0) > 0) {
    throw new Error(`Cannot archive designation with ${count} active users.`);
  }
  return updateDesignation(id, { status: 'Archived' });
};

export const reactivateDesignation = async (id: string) => {
  return updateDesignation(id, { status: 'Active' });
};

// ============================================================
// TEAMS API
// ============================================================

export const fetchTeams = async (departmentId?: string): Promise<Team[]> => {
  let query = supabase
    .from('teams')
    .select('*')
    .order('name');

  if (departmentId) {
    query = query.eq('department_id', departmentId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []) as Team[];

  const leaderIds = rows.map(r => r.team_leader_id).filter(Boolean) as string[];
  if (leaderIds.length > 0) {
    const { data: leaderRows } = await supabase
      .from('users')
      .select('id, name')
      .in('id', leaderIds);
    const leaderMap: Record<string, string> = {};
    (leaderRows || []).forEach((u: any) => { leaderMap[u.id] = u.name; });
    rows.forEach(r => {
      if (r.team_leader_id && leaderMap[r.team_leader_id]) {
        (r as any).team_leader = { id: r.team_leader_id, name: leaderMap[r.team_leader_id] };
      }
    });
  }

  return rows;
};

export const createTeam = async (payload: {
  department_id: string;
  name: string;
  team_leader_id?: string | null;
}): Promise<Team> => {
  const { data, error } = await supabase
    .from('teams')
    .insert([{ ...payload, status: 'Active' }])
    .select()
    .single();

  if (error) throw error;
  await logAuditEvent('TEAM_CREATED', data.id, { new_state: data });
  return data as Team;
};

export const updateTeam = async (
  id: string,
  payload: Partial<Omit<Team, 'id' | 'created_at' | 'updated_at'>>
): Promise<Team> => {
  const { data, error } = await supabase
    .from('teams')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  await logAuditEvent('TEAM_UPDATED', id, { new_state: data });
  return data as Team;
};

export const deactivateTeam = async (id: string) => {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', id)
    .eq('is_active', true);

  if ((count ?? 0) > 0) {
    throw new Error(`Cannot deactivate team with ${count} active members.`);
  }
  return updateTeam(id, { status: 'Inactive' });
};

// ============================================================
// ACCESS PROFILES & PERMISSIONS API
// ============================================================

const DEFAULT_ROLE_SCOPES: Record<string, DataScope> = {
  'Super Admin': 'ORGANIZATION',
  'Admin': 'ORGANIZATION',
  'Admission Admin': 'DEPARTMENT',
  'Admission Manager': 'DEPARTMENT',
  'Team Leader': 'TEAM',
  'Counselor': 'ASSIGNED',
  'Admission Executive': 'ASSIGNED',
  'HR Admin': 'DEPARTMENT',
  'HR Manager': 'DEPARTMENT',
  'HR Executive': 'DEPARTMENT',
  'Marketing Admin': 'DEPARTMENT',
  'Marketing Manager': 'DEPARTMENT',
  'Marketing': 'DEPARTMENT',
  'Finance Admin': 'DEPARTMENT',
  'Finance Manager': 'DEPARTMENT',
  'Finance Executive': 'DEPARTMENT',
  'Accounts': 'DEPARTMENT',
  'Viewer': 'ASSIGNED',
  'Partner': 'OWN',
  'Student': 'OWN',
};

export let hasDedicatedAccessProfiles = false;
export const getHasDedicatedAccessProfiles = () => hasDedicatedAccessProfiles;

export const fetchAccessProfiles = async (): Promise<AccessProfile[]> => {
  // First try the dedicated access_profiles table
  try {
    const { data: apData, error: apErr } = await supabase
      .from('access_profiles')
      .select('*')
      .order('name');

    if (!apErr && apData && apData.length > 0) {
      hasDedicatedAccessProfiles = true;
      return apData as AccessProfile[];
    }
  } catch (e) {
    // Falls through to roles table
  }

  hasDedicatedAccessProfiles = false;

  // Graceful fallback to `roles` table
  const { data: rolesData, error: rolesErr } = await supabase
    .from('roles')
    .select('*')
    .order('name');

  if (rolesErr) throw rolesErr;

  return (rolesData || []).map((r: any) => ({
    id: r.id,
    organization_id: r.organization_id || '',
    name: r.name,
    department_id: null,
    description: r.description || `Security profile for ${r.name}`,
    data_scope: DEFAULT_ROLE_SCOPES[r.name] || 'ASSIGNED',
    is_system_profile: true,
    status: (r.name === 'Admission Executive' || r.name === 'Manager') ? 'Archived' : 'Active',
    created_at: r.created_at,
    updated_at: r.updated_at
  }));
};

export const fetchAllPermissions = async (): Promise<Permission[]> => {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('resource', { ascending: true })
    .order('action', { ascending: true });

  if (error) throw error;
  return (data || []) as Permission[];
};

export const fetchProfilePermissions = async (profileId: string): Promise<string[]> => {
  // Try access_profile_permissions first
  try {
    const { data: appData, error: appErr } = await supabase
      .from('access_profile_permissions')
      .select('permission_id')
      .eq('access_profile_id', profileId);

    if (!appErr && appData && appData.length > 0) {
      return appData.map(d => d.permission_id);
    }
  } catch (e) {}

  // Fallback to role_permissions
  const { data: rpData, error: rpErr } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', profileId);

  if (rpErr) throw rpErr;
  return (rpData || []).map(d => d.permission_id);
};

export const saveProfilePermissions = async (
  profileId: string,
  permissionIds: string[],
  orgId: string = 'ac839210-a02f-4754-80ac-77b90919e938'
) => {
  let savedInAccessProfiles = false;
  try {
    // Delete existing
    await supabase.from('access_profile_permissions').delete().eq('access_profile_id', profileId);
    if (permissionIds.length > 0) {
      const rows = permissionIds.map(pid => ({
        access_profile_id: profileId,
        permission_id: pid
      }));
      const { error } = await supabase.from('access_profile_permissions').insert(rows);
      if (!error) savedInAccessProfiles = true;
    } else {
      savedInAccessProfiles = true;
    }
  } catch (e) {
    console.warn('Error saving access_profile_permissions:', e);
  }

  // Also maintain role_permissions for backwards compatibility if a matching role exists
  try {
    const { data: directRole } = await supabase.from('roles').select('id').eq('id', profileId).maybeSingle();
    let targetRoleId = directRole?.id;

    if (!targetRoleId) {
      const { data: ap } = await supabase.from('access_profiles').select('name').eq('id', profileId).maybeSingle();
      if (ap?.name) {
        const { data: matchingRole } = await supabase.from('roles').select('id').ilike('name', ap.name).maybeSingle();
        targetRoleId = matchingRole?.id;
      }
    }

    if (targetRoleId) {
      await supabase.from('role_permissions').delete().eq('role_id', targetRoleId);
      if (permissionIds.length > 0) {
        const rows = permissionIds.map(pid => ({
          role_id: targetRoleId,
          permission_id: pid,
          organization_id: orgId
        }));
        await supabase.from('role_permissions').insert(rows);
      }
    }
  } catch (e) {
    console.warn('Could not sync role_permissions for legacy compatibility:', e);
  }

  await logAuditEvent('PERMISSIONS_SAVED', profileId, { count: permissionIds.length });
  return { success: true };
};

export const createAccessProfile = async (payload: {
  name: string;
  department_id?: string | null;
  description?: string;
  data_scope: DataScope;
  organization_id: string;
}): Promise<AccessProfile> => {
  // Try access_profiles table
  try {
    const { data, error } = await supabase
      .from('access_profiles')
      .insert([{ ...payload, status: 'Active' }])
      .select()
      .single();

    if (!error && data) {
      await logAuditEvent('ACCESS_PROFILE_CREATED', data.id, { new_state: data });
      return data as AccessProfile;
    }
  } catch (e) {}

  // Fallback to roles table
  const { data, error } = await supabase
    .from('roles')
    .insert([{
      name: payload.name,
      organization_id: payload.organization_id
    }])
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    data_scope: payload.data_scope,
    department_id: payload.department_id,
    description: payload.description,
    status: 'Active'
  } as AccessProfile;
};

export const updateAccessProfile = async (
  id: string,
  payload: Partial<Omit<AccessProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<AccessProfile> => {
  try {
    const { data, error } = await supabase
      .from('access_profiles')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      await logAuditEvent('ACCESS_PROFILE_UPDATED', id, { new_state: data });
      return data as AccessProfile;
    }
  } catch (e) {}

  // Fallback to roles table
  const { data, error } = await supabase
    .from('roles')
    .update({ name: payload.name })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as AccessProfile;
};

// ============================================================
// USERS DIRECTORY WITH ORGANIZATIONAL DETAILS
// ============================================================

export const fetchUsersWithOrgDetails = async (): Promise<UserWithOrgDetails[]> => {
  const [usersRes, depts, desigs, teams, roles, profiles] = await Promise.all([
    supabase.from('users').select('*').order('name'),
    fetchDepartments().catch(() => []),
    fetchDesignations().catch(() => []),
    fetchTeams().catch(() => []),
    supabase.from('roles').select('id, name').then(r => r.data || []),
    fetchAccessProfiles().catch(() => [])
  ]);

  const rawUsers = usersRes.data || [];

  const deptMap: Record<string, any> = {};
  depts.forEach(d => { deptMap[d.id] = d; });

  const desigMap: Record<string, any> = {};
  desigs.forEach(d => { desigMap[d.id] = d; });

  const teamMap: Record<string, any> = {};
  teams.forEach(t => { teamMap[t.id] = t; });

  const roleMap: Record<string, any> = {};
  roles.forEach((r: any) => { roleMap[r.id] = r; });

  const profileMap: Record<string, any> = {};
  profiles.forEach(p => { profileMap[p.id] = p; });

  const userMap: Record<string, any> = {};
  rawUsers.forEach((u: any) => { userMap[u.id] = u; });

  return rawUsers.map((u: any) => {
    const userRole = roleMap[u.role_id];
    const userProfile = profileMap[u.access_profile_id] || 
      (userRole ? profiles.find(p => p.name.toLowerCase() === userRole.name.toLowerCase()) : null);
    const effectiveScope = userProfile?.data_scope || (userRole ? DEFAULT_ROLE_SCOPES[userRole.name] : undefined) || 'ASSIGNED';

    return {
      id: u.id,
      email: u.email,
      name: u.name || u.email,
      phone: u.phone || '',
      department_id: u.department_id,
      designation_id: u.designation_id,
      team_id: u.team_id,
      manager_id: u.manager_id,
      access_profile_id: u.access_profile_id || (userProfile ? userProfile.id : null),
      role_id: u.role_id,
      is_active: u.is_active ?? true,
      last_login: u.last_login,
      department: u.department_id ? deptMap[u.department_id] || null : null,
      designation: u.designation_id ? desigMap[u.designation_id] || null : null,
      team: u.team_id ? teamMap[u.team_id] || null : null,
      manager: u.manager_id ? userMap[u.manager_id] || null : null,
      access_profile: userProfile || null,
      role: userRole || null,
      effective_scope: effectiveScope
    };
  });
};

// ============================================================
// REPORTING HIERARCHY VALIDATION (Cycle Prevention)
// ============================================================

export const validateReportingHierarchy = async (
  userId: string | null | undefined,
  managerId: string | null | undefined
): Promise<{ valid: boolean; reason?: string }> => {
  if (!userId || !managerId) return { valid: true };
  if (userId === managerId) {
    return { valid: false, reason: 'A user cannot report to themselves.' };
  }

  // Check recursive hierarchy client-side
  const { data: allUsers } = await supabase.from('users').select('id, manager_id');
  const userParentMap: Record<string, string | null> = {};
  (allUsers || []).forEach(u => { userParentMap[u.id] = u.manager_id; });

  let currentId: string | null = managerId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === userId) {
      return {
        valid: false,
        reason: 'Circular reporting relationship detected! The selected manager already reports up to this user.'
      };
    }
    if (visited.has(currentId)) {
      break; // Safeguard against existing loops
    }
    visited.add(currentId);
    currentId = userParentMap[currentId] || null;
  }

  return { valid: true };
};

// ============================================================
// HELPER: Get users eligible to be managers for a given designation level
// ============================================================

export const fetchEligibleManagers = async (
  departmentId: string,
  designationLevel: number
): Promise<{ id: string; name: string; designation?: { name: string } | null }[]> => {
  // A manager must be in the same department with a higher designation level, or department head
  const { data: eligibleDesignations } = await supabase
    .from('designations')
    .select('id')
    .eq('department_id', departmentId)
    .gt('level', designationLevel)
    .eq('status', 'Active');

  if (!eligibleDesignations || eligibleDesignations.length === 0) return [];

  const designationIds = eligibleDesignations.map((d) => d.id);

  const { data, error } = await supabase
    .from('users')
    .select('id, name, designation:designations(name)')
    .in('designation_id', designationIds)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return (data || []) as any[];
};

// ============================================================
// AUDIT LOGGING API
// ============================================================

export const fetchAuditLogs = async (limit = 50): Promise<AuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from('rbac_audit_logs')
      .select('*, actor:users!rbac_audit_logs_actor_id_fkey(id, name, email)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data) return data as AuditLog[];
  } catch (e) {}

  // Fallback to generic audit_logs if rbac_audit_logs table isn't populated
  try {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []).map((d: any) => ({
      id: d.id,
      actor_id: d.user_id,
      action: d.action || 'SYSTEM_ACTION',
      target_id: d.record_id,
      created_at: d.created_at,
      new_state: d.changes
    }));
  } catch (e) {
    return [];
  }
};

export const logAuditEvent = async (action: string, targetId?: string, details?: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('rbac_audit_logs').insert([{
      actor_id: user?.id || null,
      action,
      target_id: targetId || null,
      new_state: details?.new_state || details || null,
      old_state: details?.old_state || null
    }]);
  } catch (e) {
    // Non-blocking
  }
};

// ============================================================
// ORGANIZATION OVERVIEW (for Super Admin panel)
// ============================================================

export interface OrgOverview {
  department: Department;
  designations: Designation[];
  teams: Team[];
  userCounts: {
    total: number;
    byDesignation: Record<string, number>;
  };
}

export const fetchOrgOverview = async (): Promise<OrgOverview[]> => {
  const [depts, desigs, teams, users] = await Promise.all([
    fetchDepartments(),
    fetchDesignations(),
    fetchTeams(),
    supabase.from('users').select('id, department_id, designation_id, is_active').eq('is_active', true),
  ]);

  const userRows = users.data || [];

  return depts.map((dept) => {
    const deptDesigs = desigs.filter((d) => d.department_id === dept.id);
    const deptTeams = teams.filter((t) => t.department_id === dept.id);
    const deptUsers = userRows.filter((u) => u.department_id === dept.id);

    const byDesignation: Record<string, number> = {};
    deptDesigs.forEach((d) => {
      byDesignation[d.name] = deptUsers.filter((u) => u.designation_id === d.id).length;
    });

    return {
      department: dept,
      designations: deptDesigs,
      teams: deptTeams,
      userCounts: {
        total: deptUsers.length,
        byDesignation,
      },
    };
  });
};
